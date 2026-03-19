/**
 * Migration 020: Agent Cost Tracking
 * Adds agent_id column to llm_costs table for per-agent cost attribution.
 * Uses postRun pattern (like 015_mirofish_ev) since SQLite ALTER fails if column exists.
 */

const migrations = [
  {
    name: '020_agent_cost_tracking',
    sql: 'SELECT 1', // Placeholder — actual ALTER runs in postRun due to SQLite limitations
    postRun: (db) => {
      const columns = [
        "ALTER TABLE llm_costs ADD COLUMN agent_id TEXT DEFAULT 'orchestrator'",
      ];
      for (const sql of columns) {
        try { db.exec(sql); } catch (e) { /* duplicate column — OK */ }
      }
      try {
        db.exec('CREATE INDEX IF NOT EXISTS idx_llm_costs_agent_id ON llm_costs(agent_id)');
      } catch (e) { /* index may exist */ }
    }
  }
];

module.exports = { migrations };
