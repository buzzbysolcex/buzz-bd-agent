/**
 * Database Migration: token_scores + cost_log tables
 * Add to the existing db.js migrations array in ~/buzz-bd-agent/api/db.js
 * 
 * Run AFTER the existing 6 migrations from Day 8
 */

// ═══════════════════════════════════════════════════
// Migration 7: token_scores table
// ═══════════════════════════════════════════════════
const migration7_token_scores = `
CREATE TABLE IF NOT EXISTS token_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id TEXT NOT NULL UNIQUE,
  contract_address TEXT NOT NULL,
  chain TEXT NOT NULL DEFAULT 'solana',
  depth TEXT NOT NULL DEFAULT 'standard',
  score REAL NOT NULL DEFAULT 0,
  verdict TEXT NOT NULL DEFAULT 'SKIP',
  result_json TEXT,
  duration_ms INTEGER DEFAULT 0,
  agents_completed INTEGER DEFAULT 0,
  agents_total INTEGER DEFAULT 5,
  auth_method TEXT DEFAULT 'api_key',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  
  -- Indexes for fast lookups
  CONSTRAINT valid_verdict CHECK (verdict IN ('HOT', 'QUALIFIED', 'WATCH', 'SKIP'))
);

CREATE INDEX IF NOT EXISTS idx_token_scores_address ON token_scores(contract_address, chain);
CREATE INDEX IF NOT EXISTS idx_token_scores_verdict ON token_scores(verdict);
CREATE INDEX IF NOT EXISTS idx_token_scores_created ON token_scores(created_at);
CREATE INDEX IF NOT EXISTS idx_token_scores_score ON token_scores(score DESC);
`;

// ═══════════════════════════════════════════════════
// Migration 8: cost_log table
// ═══════════════════════════════════════════════════
const migration8_cost_log = `
CREATE TABLE IF NOT EXISTS cost_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  chain TEXT,
  depth TEXT,
  auth_method TEXT,
  estimated_cost_usd REAL DEFAULT 0,
  llm_cost_usd REAL DEFAULT 0,
  api_cost_usd REAL DEFAULT 0,
  duration_ms INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cost_log_endpoint ON cost_log(endpoint);
CREATE INDEX IF NOT EXISTS idx_cost_log_created ON cost_log(created_at);
`;

// ═══════════════════════════════════════════════════
// Migration 9: agentproof_telemetry table
// ═══════════════════════════════════════════════════
const migration9_agentproof = `
CREATE TABLE IF NOT EXISTS agentproof_telemetry (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id TEXT,
  task_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reported_at TEXT,
  response_status INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

// Export for integration into existing db.js
module.exports = {
  migrations: [
    { version: 7, name: 'token_scores', sql: migration7_token_scores },
    { version: 8, name: 'cost_log', sql: migration8_cost_log },
    { version: 9, name: 'agentproof_telemetry', sql: migration9_agentproof }
  ]
};

// ═══════════════════════════════════════════════════
// INTEGRATION INSTRUCTIONS
// ═══════════════════════════════════════════════════
// 
// Add these migrations to your existing ~/buzz-bd-agent/api/db.js:
//
// 1. Import at top of db.js:
//    const { migrations: scoreMigrations } = require('./migrations/score-tables');
//
// 2. Append to existing migrations array:
//    const allMigrations = [...existingMigrations, ...scoreMigrations];
//
// 3. Or manually add the SQL to your initDb() function:
//    db.exec(migration7_token_scores);
//    db.exec(migration8_cost_log);
//    db.exec(migration9_agentproof);
