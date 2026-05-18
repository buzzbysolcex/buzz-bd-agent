/**
 * Migration 011: Revenue Metrics Tables
 * Day 32 Revenue Sprint — Phase 1
 */

function up(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS revenue_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token_address TEXT NOT NULL,
      chain TEXT NOT NULL CHECK(chain IN ('solana', 'base', 'bsc')),
      token_ticker TEXT,
      event_type TEXT NOT NULL,
      amount_usd REAL NOT NULL,
      amount_sol REAL,
      source TEXT,
      pipeline_stage TEXT,
      metadata TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      jvr_code TEXT
    )
  `);

  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_revenue_events_token ON revenue_events(token_address, chain)`,
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_revenue_events_type ON revenue_events(event_type, created_at)`,
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_revenue_events_date ON revenue_events(created_at)`,
  );

  db.exec(`
    CREATE TABLE IF NOT EXISTS listing_fees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token_address TEXT NOT NULL,
      chain TEXT NOT NULL,
      token_ticker TEXT,
      fee_tier TEXT,
      amount_usd REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      invoice_date TEXT,
      paid_date TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_listing_fees_status ON listing_fees(status)`,
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_listing_fees_token ON listing_fees(token_address, chain)`,
  );

  db.exec(`
    CREATE TABLE IF NOT EXISTS monthly_revenue_summary (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year_month TEXT NOT NULL UNIQUE,
      total_revenue_usd REAL DEFAULT 0,
      listing_count INTEGER DEFAULT 0,
      avg_deal_size_usd REAL DEFAULT 0,
      pipeline_conversion_rate REAL DEFAULT 0,
      top_chain TEXT,
      breakdown TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
}

function down(db) {
  db.exec("DROP TABLE IF EXISTS monthly_revenue_summary");
  db.exec("DROP TABLE IF EXISTS listing_fees");
  db.exec("DROP TABLE IF EXISTS revenue_events");
}

module.exports = { up, down };
