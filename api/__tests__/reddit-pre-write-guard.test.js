/**
 * Tests for Reddit pre-write guard (§5.9 of v3.1-FINAL).
 *
 * Covers: brand detection across terms/urls/phrases, 30-day rolling
 * ratio projection with cap breach, karma floor, digest freshness,
 * digest absence.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const Database = require("better-sqlite3");

const guard = require("../services/reddit/pre-write-guard");

function makeDb() {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE reddit_action (
      action_id TEXT PRIMARY KEY,
      account_handle TEXT NOT NULL,
      subreddit TEXT NOT NULL,
      thread_url TEXT,
      action_type TEXT NOT NULL,
      contains_brand_mention INTEGER DEFAULT 0,
      brand_mention_terms TEXT,
      content_hash TEXT,
      karma_at_action INTEGER,
      subreddit_rules_digest_hash TEXT,
      posted_timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      score_at_24h INTEGER,
      score_at_7d INTEGER,
      mod_action TEXT,
      claim_audit_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  return db;
}

function seedAction(db, overrides = {}) {
  const row = {
    action_id: `act-${Math.random().toString(36).slice(2, 10)}`,
    account_handle: "u/Ogie_Jeeves",
    subreddit: "r/solana",
    thread_url: "https://reddit.com/r/solana/x",
    action_type: "comment",
    contains_brand_mention: 0,
    posted_timestamp: new Date().toISOString(),
    ...overrides,
  };
  db.prepare(
    `INSERT INTO reddit_action
     (action_id, account_handle, subreddit, thread_url, action_type,
      contains_brand_mention, posted_timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    row.action_id,
    row.account_handle,
    row.subreddit,
    row.thread_url,
    row.action_type,
    row.contains_brand_mention,
    row.posted_timestamp,
  );
}

describe("reddit pre-write guard", () => {
  let tmp;
  let brandPath;
  let digestDir;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "buzz-reddit-guard-"));
    brandPath = path.join(tmp, "reddit-brand-keywords.json");
    digestDir = path.join(tmp, "directives");
    fs.mkdirSync(digestDir);
    fs.writeFileSync(
      brandPath,
      JSON.stringify({
        brand_terms: ["buzz", "solcex", "buzzshield"],
        brand_urls: ["buzzbd.ai", "shield.buzzbd.ai"],
        brand_phrases: ["I built", "our scanner"],
      }),
    );
    // Default: fresh digest for r/solana
    fs.writeFileSync(
      path.join(digestDir, "subreddit-rules-r_solana.md"),
      "# fresh digest",
    );
    guard._testOverridePaths([brandPath], [digestDir]);
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  describe("detectBrandMention", () => {
    test("flags a brand term", () => {
      const r = guard.detectBrandMention(
        "I love Buzz, so fast",
        guard.loadBrandKeywords(),
      );
      expect(r.flagged).toBe(true);
      expect(r.terms).toContain("buzz");
    });

    test("flags a brand URL", () => {
      const r = guard.detectBrandMention(
        "see buzzbd.ai/scores",
        guard.loadBrandKeywords(),
      );
      expect(r.flagged).toBe(true);
      expect(r.terms).toContain("buzzbd.ai");
    });

    test("flags a brand phrase", () => {
      const r = guard.detectBrandMention(
        "honestly I built this last night",
        guard.loadBrandKeywords(),
      );
      expect(r.flagged).toBe(true);
      expect(r.terms).toContain("I built");
    });

    test("no match on unrelated content", () => {
      const r = guard.detectBrandMention(
        "cool devnet benchmark from the team",
        guard.loadBrandKeywords(),
      );
      expect(r.flagged).toBe(false);
      expect(r.terms).toEqual([]);
    });
  });

  describe("checkWriteAllowed — pure-help path", () => {
    test("allows non-branded content under all caps", () => {
      const db = makeDb();
      for (let i = 0; i < 9; i++) seedAction(db, { contains_brand_mention: 0 });
      const res = guard.checkWriteAllowed({
        account_handle: "u/Ogie_Jeeves",
        subreddit: "r/solana",
        content: "useful benchmark numbers, no promo",
        action_type: "comment",
        current_karma: 500,
        deps: { db },
      });
      expect(res.allow).toBe(true);
      expect(res.reasons).toEqual([]);
      expect(res.brand_flagged).toBe(false);
      expect(res.digest_hash).toBeTruthy();
      db.close();
    });
  });

  describe("checkWriteAllowed — brand cap enforcement", () => {
    test("personal account: blocks when brand-adjacent projected ratio exceeds 10%", () => {
      const db = makeDb();
      for (let i = 0; i < 5; i++) seedAction(db, { contains_brand_mention: 1 });
      for (let i = 0; i < 15; i++)
        seedAction(db, { contains_brand_mention: 0 });
      const res = guard.checkWriteAllowed({
        account_handle: "u/Ogie_Jeeves",
        subreddit: "r/solana",
        content: "check out BuzzShield at buzzbd.ai",
        current_karma: 1000,
        deps: { db },
      });
      expect(res.brand_flagged).toBe(true);
      expect(res.allow).toBe(false);
      expect(
        res.reasons.some((r) => r.startsWith("brand_ratio_exceeded")),
      ).toBe(true);
      expect(res.cap).toBe(0.1);
      db.close();
    });

    test("brand account: cap is 5% — blocks at 2/20 + 1 projected", () => {
      const db = makeDb();
      for (let i = 0; i < 1; i++)
        seedAction(db, {
          account_handle: "u/BuzzBySolCex",
          contains_brand_mention: 1,
        });
      for (let i = 0; i < 19; i++)
        seedAction(db, {
          account_handle: "u/BuzzBySolCex",
          contains_brand_mention: 0,
        });
      const res = guard.checkWriteAllowed({
        account_handle: "u/BuzzBySolCex",
        subreddit: "r/solana",
        content: "Buzz ships another fix",
        current_karma: 1000,
        deps: { db },
      });
      expect(res.brand_flagged).toBe(true);
      expect(res.is_brand_account).toBe(true);
      expect(res.cap).toBe(0.05);
      expect(res.allow).toBe(false);
      db.close();
    });

    test("allows brand-adjacent when well under cap", () => {
      const db = makeDb();
      for (let i = 0; i < 100; i++)
        seedAction(db, { contains_brand_mention: 0 });
      const res = guard.checkWriteAllowed({
        account_handle: "u/Ogie_Jeeves",
        subreddit: "r/solana",
        content: "one brand mention of buzzbd.ai",
        current_karma: 1000,
        deps: { db },
      });
      expect(res.brand_flagged).toBe(true);
      expect(res.allow).toBe(true);
      db.close();
    });
  });

  describe("checkWriteAllowed — karma floor", () => {
    test("blocks when current_karma < subreddit floor", () => {
      const db = makeDb();
      const res = guard.checkWriteAllowed({
        account_handle: "u/Ogie_Jeeves",
        subreddit: "r/solana",
        content: "neutral comment",
        current_karma: 10,
        deps: { db },
      });
      expect(res.karma_floor).toBe(100);
      expect(res.allow).toBe(false);
      expect(res.reasons.some((r) => r.startsWith("karma_below_floor"))).toBe(
        true,
      );
      db.close();
    });
  });

  describe("checkWriteAllowed — digest freshness", () => {
    test("blocks when digest file is missing", () => {
      const db = makeDb();
      const res = guard.checkWriteAllowed({
        account_handle: "u/Ogie_Jeeves",
        subreddit: "r/MissingSub",
        content: "benign",
        current_karma: 1000,
        deps: { db },
      });
      expect(res.allow).toBe(false);
      expect(
        res.reasons.some((r) => r.startsWith("missing_subreddit_digest")),
      ).toBe(true);
      db.close();
    });

    test("blocks on stale digest (>90 days old)", () => {
      const db = makeDb();
      const p = path.join(digestDir, "subreddit-rules-r_solana.md");
      const oldMs = Date.now() - 100 * 24 * 60 * 60 * 1000;
      fs.utimesSync(p, new Date(oldMs), new Date(oldMs));
      const res = guard.checkWriteAllowed({
        account_handle: "u/Ogie_Jeeves",
        subreddit: "r/solana",
        content: "benign",
        current_karma: 1000,
        deps: { db },
      });
      expect(res.allow).toBe(false);
      expect(
        res.reasons.some((r) => r.startsWith("stale_subreddit_digest")),
      ).toBe(true);
      db.close();
    });
  });
});
