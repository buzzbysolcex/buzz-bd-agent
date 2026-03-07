/**
 * Migration 010: Strategic Orchestrator Tables
 * Adds tables for decision logging, playbook state machines,
 * decision rules, context caching, and outreach sequences.
 * 
 * Part of Buzz BD Agent v7.0 — Strategic Orchestrator Layer
 */

function up(db) {
  // 1. Strategic Decisions — log every decision with full reasoning
  db.exec(`
    CREATE TABLE IF NOT EXISTS strategic_decisions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token_address TEXT NOT NULL,
      chain TEXT NOT NULL CHECK(chain IN ('solana', 'base', 'bsc')),
      token_ticker TEXT,
      decision_type TEXT NOT NULL,
      rule_id TEXT,
      reasoning TEXT NOT NULL,
      action_taken TEXT NOT NULL,
      playbook_id TEXT,
      confidence INTEGER CHECK(confidence >= 0 AND confidence <= 100),
      escalated_to_ogie INTEGER DEFAULT 0,
      sub_agent_outputs TEXT,
      score INTEGER,
      safety_status TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      executed_at TEXT,
      jvr_code TEXT
    )
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_decisions_token 
    ON strategic_decisions(token_address, chain)
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_decisions_type 
    ON strategic_decisions(decision_type, created_at)
  `);

  // 2. Playbook Instances — track active state machines
  db.exec(`
    CREATE TABLE IF NOT EXISTS playbook_instances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      playbook_type TEXT NOT NULL CHECK(playbook_type IN ('PB-001', 'PB-002', 'PB-003', 'PB-004')),
      token_address TEXT NOT NULL,
      chain TEXT NOT NULL CHECK(chain IN ('solana', 'base', 'bsc')),
      token_ticker TEXT,
      current_state TEXT NOT NULL,
      state_history TEXT DEFAULT '[]',
      context_data TEXT DEFAULT '{}',
      started_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT,
      is_active INTEGER DEFAULT 1,
      triggered_by TEXT,
      jvr_code TEXT
    )
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_playbooks_active 
    ON playbook_instances(is_active, playbook_type)
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_playbooks_token 
    ON playbook_instances(token_address, chain)
  `);

  // 3. Decision Rules — configurable rules (loaded from JSON on boot, editable via API)
  db.exec(`
    CREATE TABLE IF NOT EXISTS decision_rules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      priority INTEGER NOT NULL DEFAULT 5,
      condition_json TEXT NOT NULL,
      action TEXT NOT NULL,
      playbook TEXT,
      description TEXT,
      auto_execute INTEGER DEFAULT 0,
      escalate_to_ogie INTEGER DEFAULT 0,
      enabled INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // 4. Context Cache — reduce redundant LLM calls
  db.exec(`
    CREATE TABLE IF NOT EXISTS context_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token_address TEXT NOT NULL,
      chain TEXT NOT NULL,
      context_hash TEXT NOT NULL,
      assembled_context TEXT NOT NULL,
      token_count INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL
    )
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_context_lookup 
    ON context_cache(token_address, chain, expires_at)
  `);

  // 5. Outreach Sequences — track email timing and follow-ups
  db.exec(`
    CREATE TABLE IF NOT EXISTS outreach_sequences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token_address TEXT NOT NULL,
      chain TEXT NOT NULL CHECK(chain IN ('solana', 'base', 'bsc')),
      token_ticker TEXT,
      sequence_type TEXT NOT NULL CHECK(sequence_type IN ('initial', 'follow_up', 'breakup', 'cold_revisit')),
      current_step INTEGER DEFAULT 1,
      max_steps INTEGER DEFAULT 3,
      contact_email TEXT,
      contact_method TEXT CHECK(contact_method IN ('email', 'twitter_dm', 'telegram')),
      email_thread_id TEXT,
      next_action_at TEXT,
      last_sent_at TEXT,
      reply_received INTEGER DEFAULT 0,
      reply_at TEXT,
      playbook_instance_id INTEGER REFERENCES playbook_instances(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT,
      is_active INTEGER DEFAULT 1,
      jvr_code TEXT
    )
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_outreach_active 
    ON outreach_sequences(is_active, next_action_at)
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_outreach_token 
    ON outreach_sequences(token_address, chain)
  `);

  console.log('[Migration 010] Strategic Orchestrator tables created: strategic_decisions, playbook_instances, decision_rules, context_cache, outreach_sequences');
}

function down(db) {
  db.exec('DROP TABLE IF EXISTS outreach_sequences');
  db.exec('DROP TABLE IF EXISTS context_cache');
  db.exec('DROP TABLE IF EXISTS decision_rules');
  db.exec('DROP TABLE IF EXISTS playbook_instances');
  db.exec('DROP TABLE IF EXISTS strategic_decisions');
  console.log('[Migration 010] Strategic Orchestrator tables dropped');
}

module.exports = { up, down };
