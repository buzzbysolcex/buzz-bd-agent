/**
 * Migration 030: reddit_action — Reddit Phase 0 action ledger
 *
 * Per §5.9 of v3.1-FINAL operational schedule + Reddit amendment.
 * Replaces the predecessor schema that used id/content/phase/karma_delta
 * with the brand-mention-aware ledger: action_id PK, content_hash,
 * contains_brand_mention flag, brand_mention_terms JSON, karma_at_action,
 * subreddit_rules_digest_hash, score_at_24h/7d, mod_action tri-state.
 *
 * Supports the 30-day rolling brand-adjacent ratio guard (10% personal,
 * 5% brand accounts) and the subreddit-rules-digest freshness check.
 *
 * Pre-existing reddit_action (no rows, no code refs) is dropped first.
 */

const { getDB } = require("../db");

async function up() {
  const db = getDB();

  db.exec(`
    DROP INDEX IF EXISTS idx_reddit_action_handle;
    DROP INDEX IF EXISTS idx_reddit_action_phase;
    DROP INDEX IF EXISTS idx_reddit_action_posted_at;
    DROP INDEX IF EXISTS idx_reddit_action_account;
    DROP INDEX IF EXISTS idx_reddit_action_subreddit;
    DROP TABLE IF EXISTS reddit_action;

    CREATE TABLE reddit_action (
      action_id TEXT PRIMARY KEY,
      account_handle TEXT NOT NULL,
      subreddit TEXT NOT NULL,
      thread_url TEXT,
      action_type TEXT NOT NULL CHECK(action_type IN ('comment','post','upvote','save','flair','dm')),
      contains_brand_mention INTEGER DEFAULT 0,
      brand_mention_terms TEXT,
      content_hash TEXT,
      karma_at_action INTEGER,
      subreddit_rules_digest_hash TEXT,
      posted_timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      score_at_24h INTEGER,
      score_at_7d INTEGER,
      mod_action TEXT CHECK(mod_action IN ('removed','warned','approved','silent',NULL)),
      claim_audit_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX idx_reddit_action_account ON reddit_action(account_handle);
    CREATE INDEX idx_reddit_action_subreddit ON reddit_action(subreddit);
    CREATE INDEX idx_reddit_action_brand ON reddit_action(contains_brand_mention);
    CREATE INDEX idx_reddit_action_posted ON reddit_action(posted_timestamp);
  `);

  console.log(
    "[migration 030] reddit_action replaced with v3.1 schema + 4 indexes",
  );
}

module.exports = { up };
