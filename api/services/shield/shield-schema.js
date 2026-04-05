/**
 * Buzz Shield — Database Schema
 * Creates 5 tables for agent security intelligence
 */

function createShieldTables(db) {
  db.exec(`
    -- Shield scan results
    CREATE TABLE IF NOT EXISTS shield_scans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scan_id TEXT UNIQUE NOT NULL,
      scan_type TEXT NOT NULL CHECK(scan_type IN ('pre_action', 'program', 'wallet', 'forensics')),
      requester TEXT,
      target TEXT NOT NULL,
      chain TEXT DEFAULT 'solana',
      verdict TEXT NOT NULL CHECK(verdict IN ('SAFE', 'CAUTION', 'WARNING', 'DANGER')),
      program_score INTEGER,
      instruction_flags JSON,
      pattern_matches JSON,
      deployer_trust INTEGER,
      context_risk REAL,
      explanation TEXT,
      receipt_hash TEXT,
      scan_duration_ms INTEGER,
      paid INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_shield_target ON shield_scans(target);
    CREATE INDEX IF NOT EXISTS idx_shield_verdict ON shield_scans(verdict);
    CREATE INDEX IF NOT EXISTS idx_shield_date ON shield_scans(created_at);

    -- Known drain patterns
    CREATE TABLE IF NOT EXISTS drain_patterns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pattern_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      instruction_sequence JSON,
      program_addresses JSON,
      severity TEXT CHECK(severity IN ('critical', 'high', 'medium', 'low')),
      source TEXT,
      confirmed INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      first_seen TEXT,
      last_seen TEXT,
      match_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Program risk cache
    CREATE TABLE IF NOT EXISTS program_risk_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      program_address TEXT NOT NULL,
      chain TEXT DEFAULT 'solana',
      verified INTEGER,
      immutable INTEGER,
      deploy_date TEXT,
      deployer_address TEXT,
      deployer_trust INTEGER,
      bytecode_hash TEXT,
      risk_score INTEGER,
      flags JSON,
      last_checked TEXT,
      check_count INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(program_address, chain)
    );

    CREATE INDEX IF NOT EXISTS idx_program_address ON program_risk_cache(program_address);

    -- Community reports
    CREATE TABLE IF NOT EXISTS shield_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reporter TEXT,
      target TEXT NOT NULL,
      report_type TEXT CHECK(report_type IN ('drain', 'phishing', 'suspicious', 'false_positive')),
      details TEXT,
      verified INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Shield service stats
    CREATE TABLE IF NOT EXISTS shield_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      total_scans INTEGER DEFAULT 0,
      free_scans INTEGER DEFAULT 0,
      paid_scans INTEGER DEFAULT 0,
      safe_count INTEGER DEFAULT 0,
      caution_count INTEGER DEFAULT 0,
      warning_count INTEGER DEFAULT 0,
      danger_count INTEGER DEFAULT 0,
      patterns_matched INTEGER DEFAULT 0,
      unique_agents INTEGER DEFAULT 0,
      revenue_usd REAL DEFAULT 0,
      UNIQUE(date)
    );
  `);
}

module.exports = { createShieldTables };
