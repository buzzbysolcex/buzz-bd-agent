/**
 * Migration 018: Financial Datasets Cache Table
 * Intel Source #24 — Financial Datasets MCP
 *
 * Buzz BD Agent v7.6.0 | MiroFish Integration
 */

const migrations = [
  {
    name: '018_financial_datasets',
    sql: `
      CREATE TABLE IF NOT EXISTS financial_datasets_cache (
        ticker TEXT NOT NULL,
        data_type TEXT NOT NULL,
        data TEXT NOT NULL,
        fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
        expires_at TEXT NOT NULL,
        PRIMARY KEY (ticker, data_type)
      );
    `
  }
];

module.exports = { migrations };
