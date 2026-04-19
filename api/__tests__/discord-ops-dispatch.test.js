/**
 * Integration tests — Discord OPS dispatch (Commit 2).
 *
 * Covers:
 *  - KILL_SWITCH_ACT + other kill-switch-class events get picked up by
 *    pollOnce and dispatched to discord.send('ops.kill-switch-log', ...)
 *  - discord_dispatcher_state.last_processed_event_id advances correctly
 *  - Re-poll returns zero processed (dedupe)
 *  - daily-report-21utc: collectSources handles missing tables gracefully,
 *    renderReport produces non-empty output, runDailyReport returns ok:true
 *  - Flag-off path fires zero Discord API calls across both flows
 *
 * Run: npx jest api/__tests__/discord-ops-dispatch.test.js
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
    CREATE TABLE autonomous_loop_outputs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id INTEGER,
      output_type TEXT,
      title TEXT,
      content TEXT,
      tokens_mentioned TEXT,
      sent_to TEXT,
      created_at TEXT DEFAULT (datetime('now'))
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
  `);
  return db;
}

describe("discord-ops-dispatcher", () => {
  let dispatcher;
  let db;
  let fakeDiscord;

  beforeEach(() => {
    jest.resetModules();
    db = makeDb();
    fakeDiscord = {
      send: jest.fn(async () => ({ sent: true, messageIds: ["mOK"] })),
    };
    process.env._TEST_FLAG_DISCORD_OPS_DASHBOARD = "1";
    dispatcher = require("../services/discord/discord-ops-dispatcher");
  });

  afterEach(() => {
    try {
      db.close();
    } catch {}
    delete process.env._TEST_FLAG_DISCORD_OPS_DASHBOARD;
  });

  test("pollOnce picks up KILL_SWITCH_ACT and advances cursor", async () => {
    db.prepare(
      `INSERT INTO event_log (event_type, payload, source)
       VALUES ('kill_switch.act', ?, 'test')`,
    ).run(
      JSON.stringify({
        switch_name: "mining_intel",
        action: "trip",
        triggered_by: "budget_cap",
        context: { reason: "daily cap exceeded", value_at_trip: 1.23 },
      }),
    );

    const res = await dispatcher.pollOnce({ db, discord: fakeDiscord });
    expect(res.processed).toBe(1);
    expect(fakeDiscord.send).toHaveBeenCalledTimes(1);
    const [channelKey, _content, opts] = fakeDiscord.send.mock.calls[0];
    expect(channelKey).toBe("ops.kill-switch-log");
    expect(opts.embeds[0].title).toContain("kill_switch.act");

    const state = db
      .prepare(
        `SELECT last_processed_event_id, total_posts FROM discord_dispatcher_state
         WHERE dispatcher_name = ?`,
      )
      .get("discord-ops-dispatcher");
    expect(state.last_processed_event_id).toBe(1);
    expect(state.total_posts).toBe(1);
  });

  test("re-poll with no new events returns processed:0", async () => {
    db.prepare(
      `INSERT INTO event_log (event_type, payload, source)
       VALUES ('guard.block', '{}', 'test')`,
    ).run();

    await dispatcher.pollOnce({ db, discord: fakeDiscord });
    fakeDiscord.send.mockClear();
    const res = await dispatcher.pollOnce({ db, discord: fakeDiscord });
    expect(res.processed).toBe(0);
    expect(fakeDiscord.send).not.toHaveBeenCalled();
  });

  test("picks up all 5 watched event types, ignores unrelated", async () => {
    const watched = [
      "kill_switch.act",
      "guard.block",
      "trust.level.change",
      "streak.emergency",
      "feature_flag.flip",
    ];
    for (const ev of watched) {
      db.prepare(
        `INSERT INTO event_log (event_type, payload, source) VALUES (?, '{}', 't')`,
      ).run(ev);
    }
    // Unrelated event — should be ignored
    db.prepare(
      `INSERT INTO event_log (event_type, payload, source) VALUES ('token.hot', '{}', 't')`,
    ).run();

    const res = await dispatcher.pollOnce({ db, discord: fakeDiscord });
    expect(res.processed).toBe(5);
    expect(fakeDiscord.send).toHaveBeenCalledTimes(5);
  });

  test("flag_off — dispatcher still processes rows but send() short-circuits", async () => {
    process.env._TEST_FLAG_DISCORD_OPS_DASHBOARD = "0";
    const realDiscord = require("../lib/discord-notify");
    global.fetch = jest.fn();

    db.prepare(
      `INSERT INTO event_log (event_type, payload, source) VALUES ('kill_switch.act', '{}', 't')`,
    ).run();

    const res = await dispatcher.pollOnce({ db, discord: realDiscord });
    expect(res.processed).toBe(1);
    expect(global.fetch).not.toHaveBeenCalled();

    const state = db
      .prepare(
        `SELECT last_processed_event_id FROM discord_dispatcher_state WHERE dispatcher_name = ?`,
      )
      .get("discord-ops-dispatcher");
    expect(state.last_processed_event_id).toBe(1);
  });

  test("formatEventAsEmbed renders payload with colors + fields", () => {
    const row = {
      id: 42,
      event_type: "kill_switch.act",
      payload: JSON.stringify({
        switch_name: "master",
        action: "trip",
        triggered_by: "user",
        context: { reason: "manual" },
      }),
      source: "warroom",
      created_at: "2026-04-19T01:00:00Z",
    };
    const embed = dispatcher.formatEventAsEmbed(row);
    expect(embed.title).toContain("kill_switch.act");
    expect(embed.color).toBe(0xe53935);
    expect(embed.fields.some((f) => f.name === "switch_name")).toBe(true);
  });
});

describe("daily-report-21utc", () => {
  let db;
  let fakeDiscord;
  let fakeTelegram;

  beforeEach(() => {
    jest.resetModules();
    db = makeDb();
    fakeDiscord = {
      send: jest.fn(async () => ({ sent: true, messageIds: ["mD"] })),
    };
    fakeTelegram = { sendTelegram: jest.fn(async () => ({ ok: true })) };
    process.env._TEST_FLAG_DISCORD_OPS_DASHBOARD = "1";
  });

  afterEach(() => {
    try {
      db.close();
    } catch {}
    delete process.env._TEST_FLAG_DISCORD_OPS_DASHBOARD;
  });

  test("collectSources handles missing tables gracefully", () => {
    const daily = require("../crons/daily-report-21utc");
    const sources = daily.collectSources(db);
    expect(sources.length).toBe(10);
    // 2 of 10 (autonomous_loop_outputs, event_log, claim_audit) exist in our
    // in-mem db — others will error with "no such table" but not throw.
    const errorCount = sources.filter((s) => s.error).length;
    expect(errorCount).toBeGreaterThan(0); // at least some missing
    for (const s of sources) {
      expect(s).toHaveProperty("source");
      expect(s).toHaveProperty("hash");
    }
  });

  test("renderReport produces a non-empty string with all 10 source names", () => {
    const daily = require("../crons/daily-report-21utc");
    const sources = daily.collectSources(db);
    const report = daily.renderReport(sources);
    expect(report.length).toBeGreaterThan(200);
    for (const s of sources) {
      expect(report).toContain(s.source);
    }
  });

  test("runDailyReport writes to autonomous_loop_outputs + claim_audit and dual-routes", async () => {
    const daily = require("../crons/daily-report-21utc");
    const res = await daily.runDailyReport({
      db,
      discord: fakeDiscord,
      telegram: fakeTelegram,
    });
    expect(res.ok).toBe(true);
    expect(res.output_id).not.toBeNull();
    expect(res.claim_audit_id).not.toBeNull();
    expect(res.telegramSent).toBe(true);
    expect(res.discordSent).toBe(true);
    expect(fakeDiscord.send).toHaveBeenCalledTimes(1);
    expect(fakeDiscord.send.mock.calls[0][0]).toBe("ops.daily-report");

    const row = db
      .prepare(`SELECT output_type FROM autonomous_loop_outputs WHERE id = ?`)
      .get(res.output_id);
    expect(row.output_type).toBe("daily_report");

    const ca = db
      .prepare(`SELECT claim_type, outcome FROM claim_audit WHERE id = ?`)
      .get(res.claim_audit_id);
    expect(ca.claim_type).toBe("daily_report");
    expect(ca.outcome).toBe("generated");
  });

  test("flag_off — runDailyReport still writes DB rows, Discord send is no-op", async () => {
    process.env._TEST_FLAG_DISCORD_OPS_DASHBOARD = "0";
    const realDiscord = require("../lib/discord-notify");
    global.fetch = jest.fn();
    const daily = require("../crons/daily-report-21utc");
    const res = await daily.runDailyReport({
      db,
      discord: realDiscord,
      telegram: fakeTelegram,
    });
    expect(res.ok).toBe(true);
    expect(res.discordSent).toBe(false);
    expect(res.telegramSent).toBe(true);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
