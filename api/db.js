/**
 * Buzz BD Agent — SQLite Database (WAL Mode)
 * Pattern adopted from Mission Control by Builderz Labs
 * 
 * Zero external dependencies — no Redis, no Postgres
 * WAL mode for concurrent reads during sub-agent operations
 * Stored at /data/buzz-api/buzz.db (Akash persistent storage)
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_DIR = process.env.BUZZ_DB_DIR || '/data/buzz-api';
const DB_PATH = path.join(DB_DIR, 'buzz.db');

let db;

function initDB() {
  // Ensure directory exists
  fs.mkdirSync(DB_DIR, { recursive: true });

  db = new Database(DB_PATH);

  // WAL mode for concurrent read access
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('cache_size = -64000'); // 64MB cache
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');

  console.log(`[Buzz DB] ✓ SQLite WAL at ${DB_PATH}`);

  // Run migrations
  runMigrations();

  return db;
}

function getDB() {
  if (!db) throw new Error('Database not initialized. Call initDB() first.');
  return db;
}

// ─── Migrations ──────────────────────────────────────
// Sequential migrations, tracked by version number
// Add new migrations at the bottom — never modify existing ones

function runMigrations() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT DEFAULT (datetime('now'))
    )
  `);

  const applied = new Set(
    db.prepare('SELECT name FROM _migrations').all().map(r => r.name)
  );

  const migrations = [
    // ─── Migration 001: Agents ───
    {
      name: '001_agents',
      sql: `
        CREATE TABLE IF NOT EXISTS agents (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          role TEXT NOT NULL,
          model TEXT NOT NULL,
          status TEXT DEFAULT 'active' CHECK(status IN ('active','idle','error','retired')),
          last_heartbeat TEXT,
          last_error TEXT,
          config JSON,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        );

        INSERT OR IGNORE INTO agents (id, name, role, model, status) VALUES
          ('orch-001', 'orchestrator', 'orchestration', 'minimax/MiniMax-M2.5', 'active'),
          ('scan-001', 'scanner-agent', 'token_discovery', 'bankr/gpt-5-nano', 'active'),
          ('safe-001', 'safety-agent', 'contract_verification', 'bankr/gpt-5-nano', 'active'),
          ('wall-001', 'wallet-agent', 'onchain_forensics', 'bankr/gpt-5-nano', 'active'),
          ('soci-001', 'social-agent', 'social_intelligence', 'bankr/gpt-5-nano', 'active'),
          ('scor-001', 'scorer-agent', 'token_scoring', 'bankr/gpt-5-nano', 'active');
      `
    },

    // ─── Migration 002: Pipeline ───
    {
      name: '002_pipeline',
      sql: `
        CREATE TABLE IF NOT EXISTS pipeline_tokens (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          address TEXT NOT NULL,
          chain TEXT NOT NULL DEFAULT 'solana',
          ticker TEXT,
          name TEXT,
          stage TEXT DEFAULT 'discovered' CHECK(stage IN (
            'discovered','scanned','scored','prospect','contacted',
            'negotiating','approved','listed','rejected'
          )),
          score INTEGER,
          score_breakdown JSON,
          source TEXT,
          notes TEXT,
          assigned_to TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          UNIQUE(address, chain)
        );

        CREATE INDEX IF NOT EXISTS idx_pipeline_stage ON pipeline_tokens(stage);
        CREATE INDEX IF NOT EXISTS idx_pipeline_score ON pipeline_tokens(score);
        CREATE INDEX IF NOT EXISTS idx_pipeline_chain ON pipeline_tokens(chain);
      `
    },

    // ─── Migration 003: Cost Tracking ───
    {
      name: '003_costs',
      sql: `
        CREATE TABLE IF NOT EXISTS cost_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          agent_name TEXT NOT NULL,
          model TEXT NOT NULL,
          operation TEXT,
          input_tokens INTEGER DEFAULT 0,
          output_tokens INTEGER DEFAULT 0,
          cost_usd REAL DEFAULT 0,
          duration_ms INTEGER,
          metadata JSON,
          created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_costs_agent ON cost_logs(agent_name);
        CREATE INDEX IF NOT EXISTS idx_costs_model ON cost_logs(model);
        CREATE INDEX IF NOT EXISTS idx_costs_date ON cost_logs(created_at);
      `
    },

    // ─── Migration 004: Cron Jobs ───
    {
      name: '004_crons',
      sql: `
        CREATE TABLE IF NOT EXISTS cron_jobs (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          schedule TEXT NOT NULL,
          agent_name TEXT,
          command TEXT,
          status TEXT DEFAULT 'active' CHECK(status IN ('active','paused','error')),
          last_run TEXT,
          next_run TEXT,
          last_error TEXT,
          run_count INTEGER DEFAULT 0,
          fail_count INTEGER DEFAULT 0,
          created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS cron_runs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          cron_id TEXT NOT NULL,
          status TEXT CHECK(status IN ('ok','error','skipped','timeout')),
          duration_ms INTEGER,
          output TEXT,
          error TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (cron_id) REFERENCES cron_jobs(id)
        );

        CREATE INDEX IF NOT EXISTS idx_cron_runs_job ON cron_runs(cron_id);
      `
    },

    // ─── Migration 005: API Keys ───
    {
      name: '005_api_keys',
      sql: `
        CREATE TABLE IF NOT EXISTS api_keys (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key_hash TEXT NOT NULL UNIQUE,
          label TEXT NOT NULL,
          role TEXT DEFAULT 'viewer' CHECK(role IN ('admin','operator','viewer','baas_pro','baas_query')),
          rate_limit INTEGER DEFAULT 100,
          total_requests INTEGER DEFAULT 0,
          last_used TEXT,
          active INTEGER DEFAULT 1,
          created_at TEXT DEFAULT (datetime('now'))
        );
      `
    },

    // ─── Migration 006: Webhook Deliveries ───
    {
      name: '006_webhooks',
      sql: `
        CREATE TABLE IF NOT EXISTS webhooks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          url TEXT NOT NULL,
          events TEXT NOT NULL,
          secret TEXT,
          active INTEGER DEFAULT 1,
          created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS webhook_deliveries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          webhook_id INTEGER NOT NULL,
          event TEXT NOT NULL,
          payload JSON,
          status_code INTEGER,
          response TEXT,
          attempts INTEGER DEFAULT 1,
          delivered_at TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (webhook_id) REFERENCES webhooks(id)
        );
      `
    }
  ];

  const insert = db.prepare('INSERT INTO _migrations (name) VALUES (?)');

  for (const m of migrations) {
    if (!applied.has(m.name)) {
      console.log(`[Buzz DB] Running migration: ${m.name}`);
      db.exec(m.sql);
      insert.run(m.name);
    }
  }

  console.log(`[Buzz DB] ✓ ${migrations.length} migrations checked`);
  // Run score-table migrations
  const {migrations: scoreMigrations} = require('./migrations/score-tables');
  for (const m of scoreMigrations) { try { db.exec(m.sql); } catch(e) {} }
}

module.exports = { initDB, getDB };
