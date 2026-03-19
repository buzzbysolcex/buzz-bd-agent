/**
 * Migration 021: technical_analysis_cache table
 * MiroFish P1-B4 — Technical Analyst indicators cache
 */

const migrations = [
  {
    name: '021_technical_analysis',
    sql: `
      CREATE TABLE IF NOT EXISTS technical_analysis_cache (
        token_address TEXT NOT NULL,
        chain TEXT NOT NULL,
        ticker TEXT,
        technical_score INTEGER,
        indicators_json TEXT,
        computed_at TEXT DEFAULT (datetime('now')),
        expires_at TEXT,
        PRIMARY KEY (token_address, chain)
      );

      CREATE INDEX IF NOT EXISTS idx_tech_token ON technical_analysis_cache(token_address);
    `,
  },
];

module.exports = { migrations };
