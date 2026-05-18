/**
 * Migration 013: Autonomous Loop Crons + Agent Authority Matrix
 * Day 32 Revenue Sprint — Phase 4
 */

function up(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS loop_cron_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      loop_type TEXT NOT NULL,
      scheduled_at TEXT NOT NULL,
      started_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT,
      status TEXT DEFAULT 'running',
      tokens_processed INTEGER DEFAULT 0,
      alerts_generated INTEGER DEFAULT 0,
      output_summary TEXT,
      error TEXT,
      duration_ms INTEGER
    )
  `);

  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_loop_runs_type ON loop_cron_runs(loop_type, started_at)`,
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_loop_runs_status ON loop_cron_runs(status)`,
  );

  db.exec(`
    CREATE TABLE IF NOT EXISTS loop_cron_outputs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id INTEGER NOT NULL REFERENCES loop_cron_runs(id),
      output_type TEXT NOT NULL,
      title TEXT,
      content TEXT NOT NULL,
      tokens_mentioned TEXT DEFAULT '[]',
      sent_to TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_loop_outputs_run ON loop_cron_outputs(run_id)`,
  );

  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_authority_matrix (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_name TEXT NOT NULL,
      action TEXT NOT NULL,
      permission_level TEXT NOT NULL DEFAULT 'read',
      max_daily_calls INTEGER DEFAULT 100,
      calls_today INTEGER DEFAULT 0,
      requires_approval INTEGER DEFAULT 0,
      approved_by TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(agent_name, action)
    )
  `);

  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_authority_agent ON agent_authority_matrix(agent_name)`,
  );

  db.exec(`
    CREATE TABLE IF NOT EXISTS authority_audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_name TEXT NOT NULL,
      action TEXT NOT NULL,
      permission_level TEXT,
      was_allowed INTEGER NOT NULL,
      denial_reason TEXT,
      request_context TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_audit_agent ON authority_audit_log(agent_name, created_at)`,
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_audit_action ON authority_audit_log(action)`,
  );

  // Seed default authority matrix
  const seed = db.prepare(`
    INSERT OR IGNORE INTO agent_authority_matrix (agent_name, action, permission_level, max_daily_calls, requires_approval)
    VALUES (?, ?, ?, ?, ?)
  `);

  const defaults = [
    ["scanner-agent", "scan_token", "execute", 500, 0],
    ["scanner-agent", "add_pipeline", "execute", 100, 0],
    ["safety-agent", "flag_token", "execute", 200, 0],
    ["safety-agent", "reject_token", "execute", 50, 1],
    ["wallet-agent", "check_wallet", "read", 300, 0],
    ["social-agent", "scan_social", "read", 200, 0],
    ["social-agent", "send_outreach", "execute", 20, 1],
    ["scorer-agent", "score_token", "execute", 200, 0],
    ["orchestrator", "promote_stage", "execute", 100, 0],
    ["orchestrator", "send_email", "execute", 10, 1],
    ["orchestrator", "approve_listing", "admin", 5, 1],
    ["twitter-brain", "post_tweet", "execute", 12, 0],
    ["twitter-brain", "reply_tweet", "execute", 50, 0],
    ["loop-morning", "generate_brief", "execute", 1, 0],
    ["loop-discovery", "send_alert", "execute", 6, 0],
    ["loop-evening", "generate_recap", "execute", 1, 0],
  ];

  for (const [agent, action, level, max, approval] of defaults) {
    seed.run(agent, action, level, max, approval);
  }
}

function down(db) {
  db.exec("DROP TABLE IF EXISTS authority_audit_log");
  db.exec("DROP TABLE IF EXISTS agent_authority_matrix");
  db.exec("DROP TABLE IF EXISTS loop_cron_outputs");
  db.exec("DROP TABLE IF EXISTS loop_cron_runs");
}

module.exports = { up, down };
