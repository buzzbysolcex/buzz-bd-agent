/**
 * Migration 015: LLM Provider Cascade Logging
 * Day 32B — 3-tier failover tracking
 */

function up(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS llm_provider_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      agent TEXT NOT NULL,
      tokens_in INTEGER DEFAULT 0,
      tokens_out INTEGER DEFAULT 0,
      latency_ms INTEGER DEFAULT 0,
      success INTEGER NOT NULL,
      error_message TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`CREATE INDEX IF NOT EXISTS idx_provider_log_provider ON llm_provider_log(provider, created_at)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_provider_log_agent ON llm_provider_log(agent)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_provider_log_date ON llm_provider_log(created_at)`);
}

function down(db) {
  db.exec('DROP TABLE IF EXISTS llm_provider_log');
}

module.exports = { up, down };
