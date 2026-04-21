/**
 * Mining Intelligence Engine v2.0 — Init + Schema
 * Intel Source #35: mempool.space (FREE, production-grade)
 * 5 SQLite tables, 4 feature flags, 15 endpoints
 * Beat: bitcoin-macro (Ivory Coda)
 * "Buzz = AIXBT of Bitcoin Mining"
 */

const { getDB } = require("../../db");

function initMiningTables() {
  const db = getDB();

  db.exec(`
    -- Table 1: mining_snapshots (network-level)
    CREATE TABLE IF NOT EXISTS mining_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT DEFAULT (datetime('now')),
      hashrate_eh REAL,
      difficulty REAL,
      block_height INTEGER,
      btc_price_usd REAL,
      hashprice_usd REAL,
      fee_rate_fast INTEGER,
      fee_rate_medium INTEGER,
      fee_rate_slow INTEGER,
      mempool_tx_count INTEGER,
      mempool_vsize_mb REAL,
      avg_block_reward REAL,
      avg_block_fees REAL,
      blocks_since_retarget INTEGER,
      next_retarget_change REAL,
      hashrate_change_24h REAL,
      total_pools_tracked INTEGER,
      mining_sentiment_index INTEGER,
      mining_sentiment_label TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_mining_snap_ts ON mining_snapshots(timestamp);

    -- Table 2: mining_pools (per-pool scoring)
    CREATE TABLE IF NOT EXISTS mining_pools (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT DEFAULT (datetime('now')),
      slug TEXT NOT NULL,
      name TEXT,
      link TEXT,
      block_count_24h INTEGER,
      block_count_1w INTEGER,
      block_count_1m INTEGER,
      block_share_24h REAL,
      block_share_1w REAL,
      block_share_1m REAL,
      empty_blocks INTEGER,
      empty_block_rate REAL,
      hashrate_share REAL,
      share_velocity REAL,
      avg_fee_per_block REAL,
      fee_efficiency REAL,
      avg_tx_per_block REAL,
      pool_health_score INTEGER,
      pool_tier TEXT,
      sentiment TEXT,
      sentiment_reason TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_mining_pools_slug ON mining_pools(slug);
    CREATE INDEX IF NOT EXISTS idx_mining_pools_ts ON mining_pools(timestamp);

    -- Table 3: mining_pool_history (time series for trends)
    CREATE TABLE IF NOT EXISTS mining_pool_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      slug TEXT NOT NULL,
      hashrate_share REAL,
      block_count INTEGER,
      empty_block_rate REAL,
      fee_efficiency REAL,
      pool_health_score INTEGER,
      UNIQUE(date, slug)
    );
    CREATE INDEX IF NOT EXISTS idx_pool_history_slug ON mining_pool_history(slug);

    -- Table 4: mining_difficulty_log
    CREATE TABLE IF NOT EXISTS mining_difficulty_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT DEFAULT (datetime('now')),
      height INTEGER,
      difficulty REAL,
      change_pct REAL,
      time_elapsed_s INTEGER,
      expected_time_s INTEGER DEFAULT 1209600
    );

    -- Table 5: mining_signals (generated signal drafts)
    CREATE TABLE IF NOT EXISTS mining_signals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT DEFAULT (datetime('now')),
      signal_type TEXT,
      pool_slug TEXT,
      title TEXT,
      content TEXT,
      beat TEXT DEFAULT 'bitcoin-macro',
      severity TEXT,
      data_json TEXT,
      approved INTEGER DEFAULT 0,
      filed_to_aibtc INTEGER DEFAULT 0,
      aibtc_response TEXT
    );
  `);

  console.log("[MINING-INTEL] 5 tables initialized");
}

module.exports = { initMiningTables };
