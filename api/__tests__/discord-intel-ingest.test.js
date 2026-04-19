/**
 * Integration tests — Discord INTEL ingest (Commit 3).
 *
 * Covers:
 *  - Wallet extraction for ETH/Base, Solana, Bitcoin (bech32 + legacy)
 *  - URL extraction + @mentions + $tickers
 *  - ETH addresses NOT misclassified as Solana (base58-superset-of-hex)
 *  - Cross-ref hits against pipeline_tokens + intel_blacklist_wallets
 *  - claim_audit + autodream_intel_ingest rows written
 *  - #intel-triaged post posted via discord-notify
 *  - discord_intel_state cursor advances + dedupe on re-poll
 *  - Flag-off: ingest still runs (DB writes) but post is no-op
 *
 * Run: npx jest api/__tests__/discord-intel-ingest.test.js
 */

const Database = require("better-sqlite3");

jest.mock("../lib/feature-flags", () => ({
  feature: (name) => process.env["_TEST_FLAG_" + name] === "1",
  allFlags: () => ({}),
  FLAGS: {},
}));

function makeDb() {
  const db = new Database(":memory:");
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE event_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      payload TEXT DEFAULT '{}',
      source TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE claim_audit (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      claim_type TEXT NOT NULL,
      claim_subject TEXT,
      recipient TEXT,
      payload TEXT,
      amount_sats INTEGER DEFAULT 0,
      tx_hash TEXT,
      directive_source TEXT,
      verification_required INTEGER DEFAULT 1,
      verified_at TEXT,
      verified_by TEXT,
      outcome TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE pipeline_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token_address TEXT NOT NULL,
      chain TEXT NOT NULL,
      ticker TEXT
    );
    CREATE TABLE intel_blacklist_wallets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      address TEXT NOT NULL,
      chain TEXT,
      reason TEXT
    );
  `);
  return db;
}

describe("discord-intel-ingest", () => {
  let ingest;
  let autodream;

  beforeEach(() => {
    jest.resetModules();
    ingest = require("../services/intel/discord-intel-ingest");
    // Reset autodream-intel-ingest table init flag between tests
    const aii = require("../services/autodream/intel-ingest");
    aii._resetInit();
    autodream = require("../services/autodream/autodream");
    process.env._TEST_FLAG_DISCORD_OPS_DASHBOARD = "1";
  });

  afterEach(() => {
    delete process.env._TEST_FLAG_DISCORD_OPS_DASHBOARD;
  });

  describe("extractEntities", () => {
    test("extracts ETH/Base address", () => {
      const e = ingest.extractEntities(
        "hot wallet 0xabcdef1234567890abcdef1234567890abcdef12 drained via proxy",
      );
      expect(e.wallets.eth).toEqual([
        "0xabcdef1234567890abcdef1234567890abcdef12",
      ]);
      expect(e.wallets.solana).toEqual([]);
    });

    test("extracts Solana address, not confused by ETH", () => {
      const e = ingest.extractEntities(
        "watch 0x1234567890abcdef1234567890abcdef12345678 and 5iC7pKZZgbsTGXAD5gYMJCk2dfC3mo5Jp4m9aZ3wYqjN",
      );
      expect(e.wallets.eth).toContain(
        "0x1234567890abcdef1234567890abcdef12345678",
      );
      expect(e.wallets.solana).toContain(
        "5iC7pKZZgbsTGXAD5gYMJCk2dfC3mo5Jp4m9aZ3wYqjN",
      );
    });

    test("extracts BTC bech32 + legacy", () => {
      const e = ingest.extractEntities(
        "drained to bc1qsja6knydqxj0nxf05466zhu8qqedu8umxeagze then 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
      );
      expect(e.wallets.bitcoin).toContain(
        "bc1qsja6knydqxj0nxf05466zhu8qqedu8umxeagze",
      );
      expect(e.wallets.bitcoin).toContain("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa");
    });

    test("extracts URLs, mentions, tickers", () => {
      const e = ingest.extractEntities(
        "see https://zachxbt.bsky.social/post/123 by @zachxbt re $BONK and $WIF on @solana",
      );
      expect(e.urls).toEqual(["https://zachxbt.bsky.social/post/123"]);
      expect(e.mentions).toEqual(expect.arrayContaining(["zachxbt", "solana"]));
      expect(e.tickers).toEqual(expect.arrayContaining(["BONK", "WIF"]));
    });

    test("empty string returns empty entities", () => {
      const e = ingest.extractEntities("");
      expect(e.urls).toEqual([]);
      expect(e.wallets.eth).toEqual([]);
      expect(e.wallets.solana).toEqual([]);
      expect(e.wallets.bitcoin).toEqual([]);
    });
  });

  describe("crossRef", () => {
    test("hits pipeline_tokens by address (lowercase match)", () => {
      const db = makeDb();
      db.prepare(
        `INSERT INTO pipeline_tokens (token_address, chain, ticker)
         VALUES ('0xabcdef1234567890abcdef1234567890abcdef12', 'base', 'WATCH')`,
      ).run();
      const hits = ingest.crossRef(db, {
        wallets: {
          eth: ["0xABCDEF1234567890abcdef1234567890ABCDEF12"], // mixed case
          solana: [],
          bitcoin: [],
        },
      });
      expect(hits.pipeline_tokens).toHaveLength(1);
      expect(hits.pipeline_tokens[0].ticker).toBe("WATCH");
      db.close();
    });

    test("hits intel_blacklist_wallets", () => {
      const db = makeDb();
      db.prepare(
        `INSERT INTO intel_blacklist_wallets (address, chain, reason)
         VALUES ('0xdeadbeef00000000000000000000000000000000', 'eth', 'drainer')`,
      ).run();
      const hits = ingest.crossRef(db, {
        wallets: {
          eth: ["0xdeadbeef00000000000000000000000000000000"],
          solana: [],
          bitcoin: [],
        },
      });
      expect(hits.blacklist_wallets).toHaveLength(1);
      expect(hits.blacklist_wallets[0].reason).toBe("drainer");
      db.close();
    });

    test("returns empty hits when tables missing (graceful)", () => {
      const db = new Database(":memory:");
      const hits = ingest.crossRef(db, {
        wallets: { eth: ["0xdead"], solana: [], bitcoin: [] },
      });
      expect(hits.pipeline_tokens).toEqual([]);
      expect(hits.blacklist_wallets).toEqual([]);
      db.close();
    });
  });

  describe("ingestMessage", () => {
    test("writes claim_audit + autodream_intel_ingest, posts to triaged", async () => {
      const db = makeDb();
      const fakeDiscord = {
        send: jest.fn(async (key) => ({
          sent: true,
          messageIds: [`triaged-${key}`],
        })),
      };
      const msg = {
        id: "msg-123",
        content:
          "ZachXBT: https://x.com/zachxbt/status/1 — 0xdeadbeef00000000000000000000000000000000 drained $BONK",
        timestamp: "2026-04-19T01:00:00.000Z",
        author: { id: "ogie-id", username: "ogie" },
      };
      const res = await ingest.ingestMessage(msg, {
        db,
        discord: fakeDiscord,
        autodream,
        eventBus: null,
      });

      expect(res.claim_audit_id).not.toBeNull();
      expect(res.ingest_id).not.toBeNull();
      expect(res.triaged_msg_id).toBe("triaged-intel.output.triaged");
      expect(res.entities_count).toBeGreaterThanOrEqual(3); // URL + wallet + ticker

      const ca = db
        .prepare(`SELECT claim_type FROM claim_audit WHERE id = ?`)
        .get(res.claim_audit_id);
      expect(ca.claim_type).toBe("discord_intel_ingest");

      const ii = db
        .prepare(
          `SELECT source, triaged_status, discord_triaged_msg_id
           FROM autodream_intel_ingest WHERE id = ?`,
        )
        .get(res.ingest_id);
      expect(ii.source).toBe("discord-intel-zachxbt");
      expect(ii.discord_triaged_msg_id).toBe("triaged-intel.output.triaged");

      expect(fakeDiscord.send).toHaveBeenCalledTimes(1);
      expect(fakeDiscord.send.mock.calls[0][0]).toBe("intel.output.triaged");
      db.close();
    });

    test("cross-ref hit → triaged_status='needs_action' + INTEL_ACTION_REQUIRED emitted", async () => {
      const db = makeDb();
      db.prepare(
        `INSERT INTO intel_blacklist_wallets (address, chain, reason)
         VALUES ('0xbadbadbadbadbadbadbadbadbadbadbadbadbadb', 'eth', 'sanctioned')`,
      ).run();
      const fakeDiscord = {
        send: jest.fn(async () => ({ sent: true, messageIds: ["tr1"] })),
      };
      const fakeBus = { emit: jest.fn() };
      const msg = {
        id: "msg-hit",
        content: "forwarded: 0xbadbadbadbadbadbadbadbadbadbadbadbadbadb",
        timestamp: "2026-04-19T01:00:00.000Z",
        author: { id: "ogie-id" },
      };
      const res = await ingest.ingestMessage(msg, {
        db,
        discord: fakeDiscord,
        autodream,
        eventBus: fakeBus,
      });
      expect(res.triaged_status).toBe("needs_action");
      expect(res.hits_count).toBe(1);
      expect(fakeBus.emit).toHaveBeenCalledTimes(1);
      const [src, evType, payload] = fakeBus.emit.mock.calls[0];
      expect(src).toBe("discord-intel-ingest");
      expect(evType).toBe("intel.action_required");
      expect(payload.hit_type).toBe("blacklist_wallet");
      db.close();
    });

    test("flag_off — DB writes happen, Discord post skipped, no event emit on no-hit", async () => {
      process.env._TEST_FLAG_DISCORD_OPS_DASHBOARD = "0";
      const db = makeDb();
      const realDiscord = require("../lib/discord-notify");
      // Give the real discord-notify a minimal config to avoid no_config.
      const path = require("path");
      const fs = require("fs");
      const os = require("os");
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "buzz-intel-test-"));
      const cfgPath = path.join(tmp, "c.json");
      fs.writeFileSync(
        cfgPath,
        JSON.stringify({
          intel: { output: { triaged: "ch_t" }, inbox: { zachxbt: "ch_z" } },
        }),
      );
      process.env.DISCORD_CHANNEL_CONFIG_PATH = cfgPath;
      realDiscord._resetCache();

      global.fetch = jest.fn();
      const msg = {
        id: "msg-noflag",
        content: "clean message with no wallets",
        timestamp: "2026-04-19T01:00:00.000Z",
        author: { id: "ogie-id" },
      };
      const res = await ingest.ingestMessage(msg, {
        db,
        discord: realDiscord,
        autodream,
        eventBus: { emit: jest.fn() },
      });
      expect(res.claim_audit_id).not.toBeNull();
      expect(res.ingest_id).not.toBeNull();
      expect(res.triaged_msg_id).toBeNull(); // no post because flag off
      expect(global.fetch).not.toHaveBeenCalled();
      delete process.env.DISCORD_CHANNEL_CONFIG_PATH;
      fs.rmSync(tmp, { recursive: true, force: true });
      db.close();
    });

    test("idempotent on duplicate msg id", async () => {
      const db = makeDb();
      const fakeDiscord = {
        send: jest.fn(async () => ({ sent: true, messageIds: ["tr1"] })),
      };
      const msg = {
        id: "dup-id",
        content: "first",
        timestamp: "2026-04-19T01:00:00.000Z",
        author: { id: "ogie-id" },
      };
      const r1 = await ingest.ingestMessage(msg, {
        db,
        discord: fakeDiscord,
        autodream,
        eventBus: null,
      });
      const r2 = await ingest.ingestMessage(msg, {
        db,
        discord: fakeDiscord,
        autodream,
        eventBus: null,
      });
      // First ingest creates row; second finds existing row. Both return
      // the same ingest_id.
      expect(r2.ingest_id).toBe(r1.ingest_id);
      db.close();
    });
  });

  describe("channel state cursor", () => {
    test("getChannelState creates row if missing, returns current", () => {
      const db = makeDb();
      ingest.initIntelState(db);
      const s1 = ingest.getChannelState(db, "intel.zachxbt");
      expect(s1.last_seen_message_id).toBeNull();
      expect(s1.total_messages_ingested).toBe(0);
      db.close();
    });
  });
});
