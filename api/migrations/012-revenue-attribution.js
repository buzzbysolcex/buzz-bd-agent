/**
 * Migration 012: Pipeline Revenue Attribution
 * Day 32 Revenue Sprint — Phase 3
 */

function up(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS pipeline_revenue_attribution (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token_address TEXT NOT NULL,
      chain TEXT NOT NULL CHECK(chain IN ('solana', 'base', 'bsc')),
      token_ticker TEXT,
      discovery_source TEXT,
      first_seen_at TEXT,
      stage_entered_at TEXT DEFAULT (datetime('now')),
      current_stage TEXT NOT NULL,
      time_in_pipeline_hours REAL,
      touch_count INTEGER DEFAULT 0,
      agent_touches TEXT DEFAULT '[]',
      estimated_revenue_usd REAL DEFAULT 0,
      actual_revenue_usd REAL DEFAULT 0,
      conversion_probability REAL DEFAULT 0,
      attribution_score REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_attr_token ON pipeline_revenue_attribution(token_address, chain)`,
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_attr_source ON pipeline_revenue_attribution(discovery_source)`,
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_attr_stage ON pipeline_revenue_attribution(current_stage)`,
  );
}

function down(db) {
  db.exec("DROP TABLE IF EXISTS pipeline_revenue_attribution");
}

module.exports = { up, down };
