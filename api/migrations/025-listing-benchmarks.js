/**
 * Migration 025: Listing Benchmarks + Proposals + Wallet Balances
 * v8.1.0 | Wednesday Day 37
 *
 * listing_benchmarks: ceiling/floor per chain per month (Mitchell GAP 25)
 * proposals: BD automation tracking
 * wallet_balances: exact balance history
 */

module.exports = function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS listing_benchmarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chain TEXT NOT NULL,
      month TEXT NOT NULL,
      metric TEXT NOT NULL,
      ceiling REAL,
      floor REAL,
      sample_size INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(chain, month, metric)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS proposals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      address TEXT NOT NULL,
      chain TEXT DEFAULT 'solana',
      ticker TEXT,
      score INTEGER,
      status TEXT DEFAULT 'draft',
      proposal_text TEXT,
      outreach_channels TEXT,
      followup_due TEXT,
      sent_at TEXT,
      response_at TEXT,
      outcome TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(address, chain)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS wallet_balances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chain TEXT NOT NULL,
      address TEXT NOT NULL,
      label TEXT,
      balance_raw TEXT,
      balance_display TEXT,
      checked_at TEXT DEFAULT (datetime('now'))
    )
  `);

  console.log('[Migration 025] Created listing_benchmarks, proposals, wallet_balances tables');
};
