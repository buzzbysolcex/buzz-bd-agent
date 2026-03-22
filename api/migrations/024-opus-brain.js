/**
 * Migration 024: Project Opus Brain — Outcomes + Calibration tables
 *
 * listing_outcomes  — Track 30/60/90 day listing results
 * calibration_runs  — Store prediction calibration history
 */

function up(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS listing_outcomes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token_address TEXT NOT NULL,
      chain TEXT DEFAULT 'solana',
      day INTEGER NOT NULL DEFAULT 30,
      price_usd REAL,
      market_cap REAL,
      volume_24h REAL,
      holder_count INTEGER,
      notes TEXT,
      recorded_at TEXT DEFAULT (datetime('now')),
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_listing_outcomes_address ON listing_outcomes(token_address);
    CREATE INDEX IF NOT EXISTS idx_listing_outcomes_day ON listing_outcomes(day);

    CREATE TABLE IF NOT EXISTS calibration_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id TEXT UNIQUE NOT NULL,
      token_count INTEGER DEFAULT 0,
      correct_count INTEGER DEFAULT 0,
      accuracy_pct REAL DEFAULT 0,
      results_json TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_calibration_runs_id ON calibration_runs(run_id);
  `);

  console.log('[Migration 024] Project Opus Brain tables created');
}

function down(db) {
  db.exec(`
    DROP TABLE IF EXISTS listing_outcomes;
    DROP TABLE IF EXISTS calibration_runs;
  `);
}

module.exports = { up, down };
