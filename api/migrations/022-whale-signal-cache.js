/**
 * Migration 022: Whale Signal Cache
 * Nansen Hyperliquid whale intelligence data
 * Intel Source #17 upgrade
 */

const migrations = [
  {
    name: "022_whale_signal_cache",
    sql: `
      CREATE TABLE IF NOT EXISTS whale_signal_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        token_symbol TEXT NOT NULL,
        pipeline_address TEXT,
        chain TEXT DEFAULT 'hyperliquid',
        whale_signal_score INTEGER DEFAULT 50,
        sm_net_flow_direction TEXT,
        sm_longs_count INTEGER DEFAULT 0,
        sm_shorts_count INTEGER DEFAULT 0,
        sm_total_value_usd REAL DEFAULT 0,
        buy_sell_pressure REAL DEFAULT 0,
        funding_rate REAL DEFAULT 0,
        open_interest REAL DEFAULT 0,
        bearish_flag INTEGER DEFAULT 0,
        score_breakdown_json TEXT,
        raw_data_json TEXT,
        computed_at TEXT NOT NULL DEFAULT (datetime('now')),
        ttl INTEGER DEFAULT 3600,
        UNIQUE(token_symbol, chain)
      );
      CREATE INDEX IF NOT EXISTS idx_whale_symbol ON whale_signal_cache(token_symbol);
      CREATE INDEX IF NOT EXISTS idx_whale_pipeline ON whale_signal_cache(pipeline_address);
    `,
  },
];

module.exports = { migrations };
