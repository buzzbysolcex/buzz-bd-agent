/**
 * Migration 014: Triple Verification Layer
 * Day 32B Data Hardening Sprint
 *
 * NO DATA SURFACES WITHOUT TRIPLE VERIFICATION.
 */

function up(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS verification_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contract_address TEXT NOT NULL,
      chain TEXT NOT NULL,
      token_name TEXT,
      token_symbol TEXT,
      check1_pass INTEGER,
      check1_source TEXT DEFAULT 'dexscreener',
      check1_data TEXT,
      check2_pass INTEGER,
      check2_source TEXT DEFAULT 'coingecko',
      check2_data TEXT,
      check3_pass INTEGER,
      check3_source TEXT DEFAULT 'internal',
      check3_data TEXT,
      overall_status TEXT NOT NULL,
      mismatches TEXT DEFAULT '[]',
      evidence TEXT DEFAULT '{}',
      verified_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_vlog_contract ON verification_log(contract_address, chain)`,
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_vlog_status ON verification_log(overall_status)`,
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_vlog_date ON verification_log(created_at)`,
  );

  db.exec(`
    CREATE TABLE IF NOT EXISTS quarantined_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contract_address TEXT NOT NULL,
      chain TEXT NOT NULL,
      token_name TEXT,
      token_symbol TEXT,
      reason TEXT NOT NULL,
      quarantined_at TEXT NOT NULL,
      resolved_at TEXT,
      resolved_by TEXT,
      UNIQUE(contract_address, chain)
    )
  `);

  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_quarantine_status ON quarantined_tokens(resolved_at)`,
  );

  db.exec(`
    CREATE TABLE IF NOT EXISTS verified_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contract_address TEXT NOT NULL,
      chain TEXT NOT NULL,
      token_name TEXT NOT NULL,
      token_symbol TEXT NOT NULL,
      mcap REAL,
      liquidity REAL,
      holders INTEGER,
      dex_count INTEGER,
      pair_age_hours REAL,
      price_usd REAL,
      volume_24h REAL,
      mcap_liquidity_ratio REAL,
      is_pump_fun INTEGER DEFAULT 0,
      dexscreener_url TEXT,
      coingecko_url TEXT,
      verified_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(contract_address, chain)
    )
  `);

  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_snapshot_expires ON verified_snapshots(expires_at)`,
  );
}

function down(db) {
  db.exec("DROP TABLE IF EXISTS verified_snapshots");
  db.exec("DROP TABLE IF EXISTS quarantined_tokens");
  db.exec("DROP TABLE IF EXISTS verification_log");
}

module.exports = { up, down };
