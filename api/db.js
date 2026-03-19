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
    },

    // ─── Migration 011: Hedge Brain — Persona Signals + Backtest (v7.4.0) ───
    {
      name: '011_hedge_brain',
      sql: `
        CREATE TABLE IF NOT EXISTS persona_signals (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          token_address TEXT NOT NULL,
          chain TEXT NOT NULL,
          symbol TEXT,
          persona_name TEXT NOT NULL,
          signal TEXT NOT NULL CHECK(signal IN ('bullish', 'bearish', 'neutral')),
          confidence REAL NOT NULL CHECK(confidence >= 0.0 AND confidence <= 1.0),
          reasoning TEXT,
          bd_recommendation TEXT CHECK(bd_recommendation IN ('outreach_now', 'monitor', 'skip')),
          raw_score INTEGER,
          model_used TEXT,
          scored_at TEXT DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_persona_token ON persona_signals(token_address, chain);
        CREATE INDEX IF NOT EXISTS idx_persona_name ON persona_signals(persona_name);
        CREATE INDEX IF NOT EXISTS idx_persona_signal ON persona_signals(signal);

        CREATE TABLE IF NOT EXISTS backtest_results (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          run_id TEXT NOT NULL,
          token_address TEXT NOT NULL,
          chain TEXT NOT NULL,
          symbol TEXT,
          score_at_time INTEGER,
          price_at_score REAL,
          price_at_check REAL,
          price_change_pct REAL,
          days_elapsed INTEGER,
          signal_correct INTEGER,
          sub_agent_accuracy_json TEXT,
          persona_accuracy_json TEXT,
          scored_at TEXT,
          checked_at TEXT DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_backtest_run ON backtest_results(run_id);
        CREATE INDEX IF NOT EXISTS idx_backtest_token ON backtest_results(token_address);

        CREATE TABLE IF NOT EXISTS backtest_summaries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          run_id TEXT NOT NULL,
          total_tokens INTEGER,
          accuracy_rate REAL,
          precision_rate REAL,
          avg_return_bullish REAL,
          avg_return_bearish REAL,
          best_agent TEXT,
          best_persona TEXT,
          period_start TEXT,
          period_end TEXT,
          created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_backtest_summary_run ON backtest_summaries(run_id);

        INSERT OR IGNORE INTO agents (id, name, role, model, status) VALUES
          ('degen-001', 'degen-agent', 'persona_momentum', 'bankr/gpt-5-nano', 'active'),
          ('whale-001', 'whale-agent', 'persona_smart_money', 'bankr/gpt-5-nano', 'active'),
          ('inst-001', 'institutional-agent', 'persona_compliance', 'bankr/claude-haiku-4.5', 'active'),
          ('comm-001', 'community-agent', 'persona_social', 'bankr/gpt-5-nano', 'active');
      `
    },

    // ─── Migration 012: v7.5.0 Bags.fm-First (OKX instruments, listing simulations) ───
    {
      name: '012_bags_first',
      sql: `
        CREATE TABLE IF NOT EXISTS okx_instruments (
          instrument_id TEXT PRIMARY KEY,
          inst_type TEXT, base_ccy TEXT, quote_ccy TEXT,
          settle_ccy TEXT, ct_val TEXT, ct_mult TEXT,
          ct_val_ccy TEXT, list_time TEXT, exp_time TEXT,
          tick_sz TEXT, lot_sz TEXT, min_sz TEXT,
          ct_type TEXT, alias TEXT, state TEXT,
          created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS listing_simulations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          token_address TEXT NOT NULL,
          chain TEXT NOT NULL,
          scenario TEXT NOT NULL,
          persona_results TEXT NOT NULL,
          consensus TEXT NOT NULL,
          bullish_count INTEGER,
          neutral_count INTEGER,
          bearish_count INTEGER,
          expected_impact TEXT,
          created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_sim_token ON listing_simulations(token_address);
      `
    },

    // ─── Migration 010: Strategic Orchestrator (v7.0) ───
    {
      name: '010_strategic',
      sql: `
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
        );
        CREATE INDEX IF NOT EXISTS idx_decisions_token ON strategic_decisions(token_address, chain);
        CREATE INDEX IF NOT EXISTS idx_decisions_type ON strategic_decisions(decision_type, created_at);

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
        );
        CREATE INDEX IF NOT EXISTS idx_playbooks_active ON playbook_instances(is_active, playbook_type);
        CREATE INDEX IF NOT EXISTS idx_playbooks_token ON playbook_instances(token_address, chain);

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
        );

        CREATE TABLE IF NOT EXISTS context_cache (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          token_address TEXT NOT NULL,
          chain TEXT NOT NULL,
          context_hash TEXT NOT NULL,
          assembled_context TEXT NOT NULL,
          token_count INTEGER,
          created_at TEXT DEFAULT (datetime('now')),
          expires_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_context_lookup ON context_cache(token_address, chain, expires_at);

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
        );
        CREATE INDEX IF NOT EXISTS idx_outreach_active ON outreach_sequences(is_active, next_action_at);
        CREATE INDEX IF NOT EXISTS idx_outreach_token ON outreach_sequences(token_address, chain);
      `
    },

    // ─── Migration 015: MiroFish EV — Add EV columns to listing_simulations ───
    {
      name: '015_mirofish_ev',
      sql: 'SELECT 1', // Placeholder — actual ALTERs run in postRun due to SQLite limitations
      postRun: (db) => {
        const columns = [
          'ALTER TABLE listing_simulations ADD COLUMN ticker TEXT',
          'ALTER TABLE listing_simulations ADD COLUMN score INTEGER',
          'ALTER TABLE listing_simulations ADD COLUMN agents_count INTEGER DEFAULT 20',
          'ALTER TABLE listing_simulations ADD COLUMN probability REAL',
          'ALTER TABLE listing_simulations ADD COLUMN confidence REAL',
          'ALTER TABLE listing_simulations ADD COLUMN ev REAL',
          'ALTER TABLE listing_simulations ADD COLUMN recommendation TEXT',
          'ALTER TABLE listing_simulations ADD COLUMN cluster_degen TEXT',
          'ALTER TABLE listing_simulations ADD COLUMN cluster_whale TEXT',
          'ALTER TABLE listing_simulations ADD COLUMN cluster_institutional TEXT',
          'ALTER TABLE listing_simulations ADD COLUMN cluster_community TEXT',
          'ALTER TABLE listing_simulations ADD COLUMN key_risk TEXT',
          'ALTER TABLE listing_simulations ADD COLUMN key_signal TEXT',
          'ALTER TABLE listing_simulations ADD COLUMN raw_verdicts TEXT',
          'ALTER TABLE listing_simulations ADD COLUMN simulated_at TEXT DEFAULT CURRENT_TIMESTAMP',
        ];
        for (const sql of columns) {
          try { db.exec(sql); } catch (e) { /* duplicate column — OK */ }
        }
        try {
          db.exec('CREATE INDEX IF NOT EXISTS idx_sim_ticker ON listing_simulations(ticker)');
        } catch (e) { /* index may exist */ }
      }
    },

    // ─── Migration 016: Listing Proposals (MiroFish Stage 1) ───
    {
      name: '016_listing_proposals',
      sql: `
        CREATE TABLE IF NOT EXISTS listing_proposals (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          token_address TEXT,
          ticker TEXT,
          chain TEXT,
          score INTEGER,
          ev REAL,
          recommendation TEXT,
          html_content TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_proposal_ticker ON listing_proposals(ticker);
      `
    }
    ,
    // Migration 013: Nansen Enrichments (v7.5.2)
    {
      name: '013_nansen',
      sql: `
        CREATE TABLE IF NOT EXISTS nansen_enrichments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          token_address TEXT,
          chain TEXT,
          smart_money_netflow REAL,
          smart_money_count INTEGER,
          whale_holders INTEGER,
          top10_concentration REAL,
          nansen_labels TEXT,
          raw_json TEXT,
          enriched_at TEXT DEFAULT (datetime('now')),
          UNIQUE(token_address, chain)
        );
        CREATE INDEX IF NOT EXISTS idx_nansen_token ON nansen_enrichments(token_address, chain);
      `
    },

    // Migration 014: X Layer Transactions (v7.5.2)
    {
      name: '014_xlayer',
      sql: `
        CREATE TABLE IF NOT EXISTS xlayer_transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tx_hash TEXT UNIQUE,
          from_address TEXT,
          to_address TEXT,
          amount_usdc REAL,
          chain_id INTEGER DEFAULT 196,
          service TEXT,
          token_scored TEXT,
          score_result INTEGER,
          status TEXT DEFAULT 'pending',
          created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_xlayer_tx ON xlayer_transactions(tx_hash);
      `
    },

    // Migration 017: LLM Cost Proxy (v7.5.5)
    {
      name: '017_llm_costs',
      sql: `
        CREATE TABLE IF NOT EXISTS llm_costs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp TEXT DEFAULT (datetime('now')),
          model TEXT NOT NULL,
          caller TEXT DEFAULT 'unknown',
          prompt_tokens INTEGER DEFAULT 0,
          completion_tokens INTEGER DEFAULT 0,
          total_tokens INTEGER DEFAULT 0,
          cost_usd REAL DEFAULT 0.0,
          latency_ms INTEGER DEFAULT 0,
          status TEXT DEFAULT 'success',
          error_message TEXT,
          endpoint TEXT DEFAULT '/v1/chat/completions',
          cached_tokens INTEGER DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS idx_llm_costs_timestamp ON llm_costs(timestamp);
        CREATE INDEX IF NOT EXISTS idx_llm_costs_model ON llm_costs(model);
        CREATE INDEX IF NOT EXISTS idx_llm_costs_caller ON llm_costs(caller);
      `
    },
    // ─── Migration 015: LLM Provider Cascade Logging ───
    {
      name: '015_llm_provider_log',
      sql: `
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
        );
        CREATE INDEX IF NOT EXISTS idx_provider_log_provider ON llm_provider_log(provider, created_at);
        CREATE INDEX IF NOT EXISTS idx_provider_log_agent ON llm_provider_log(agent);
        CREATE INDEX IF NOT EXISTS idx_provider_log_date ON llm_provider_log(created_at);
      `
    }
  ];

  const insert = db.prepare('INSERT INTO _migrations (name) VALUES (?)');

  for (const m of migrations) {
    if (!applied.has(m.name)) {
      console.log(`[Buzz DB] Running migration: ${m.name}`);
      db.exec(m.sql);
      if (m.postRun) m.postRun(db);
      insert.run(m.name);
    }
  }

  console.log(`[Buzz DB] ✓ ${migrations.length} migrations checked`);
  // Run score-table migrations
  const {migrations: scoreMigrations} = require('./migrations/score-tables');
  for (const m of scoreMigrations) { try { db.exec(m.sql); } catch(e) {} }

  // Run financial-datasets migration (P1-A)
  const {migrations: finDataMigrations} = require('./migrations/016-financial-datasets');
  for (const m of finDataMigrations) {
    if (!applied.has(m.name)) {
      try {
        console.log(`[Buzz DB] Running migration: ${m.name}`);
        db.exec(m.sql);
        insert.run(m.name);
      } catch(e) { console.error(`[Buzz DB] Migration ${m.name} failed:`, e.message); }
    }
  }

  // Run simulation-results migration (P1-B)
  const {migrations: simResultMigrations} = require('./migrations/017-simulation-results');
  for (const m of simResultMigrations) {
    if (!applied.has(m.name)) {
      try {
        console.log(`[Buzz DB] Running migration: ${m.name}`);
        db.exec(m.sql);
        insert.run(m.name);
      } catch(e) { console.error(`[Buzz DB] Migration ${m.name} failed:`, e.message); }
    }
  }

  // Run technical-analysis migration (B4)
  const {migrations: techMigrations} = require('./migrations/021-technical-analysis');
  for (const m of techMigrations) {
    if (!applied.has(m.name)) {
      try {
        console.log(`[Buzz DB] Running migration: ${m.name}`);
        db.exec(m.sql);
        insert.run(m.name);
      } catch(e) { console.error(`[Buzz DB] Migration ${m.name} failed:`, e.message); }
    }
  }

  // Run agent-cost-tracking migration (B3)
  const {migrations: agentCostMigrations} = require('./migrations/020-agent-cost-tracking');
  for (const m of agentCostMigrations) {
    if (!applied.has(m.name)) {
      try {
        console.log(`[Buzz DB] Running migration: ${m.name}`);
        db.exec(m.sql);
        if (m.postRun) m.postRun(db);
        insert.run(m.name);
      } catch(e) { console.error(`[Buzz DB] Migration ${m.name} failed:`, e.message); }
    }
  }
}

module.exports = { initDB, getDB };
