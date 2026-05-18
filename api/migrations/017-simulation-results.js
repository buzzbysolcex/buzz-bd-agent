/**
 * Migration 019: simulation_results table
 * MiroFish P1-B — Enhanced Simulation Engine persistence
 */

const migrations = [
  {
    name: "019_simulation_results",
    sql: `
      CREATE TABLE IF NOT EXISTS simulation_results (
        simulation_id TEXT PRIMARY KEY,
        token_address TEXT NOT NULL,
        chain TEXT NOT NULL,
        depth TEXT NOT NULL DEFAULT 'mvp',
        score REAL,
        confidence REAL,
        confidence_low REAL,
        confidence_high REAL,
        consensus TEXT,
        recommendation TEXT,
        verdicts_json TEXT,
        metrics_json TEXT,
        llm_cost REAL DEFAULT 0,
        duration_ms INTEGER,
        report_url TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (token_address) REFERENCES pipeline_tokens(address)
      );

      CREATE INDEX IF NOT EXISTS idx_simresult_token ON simulation_results(token_address);
      CREATE INDEX IF NOT EXISTS idx_simresult_consensus ON simulation_results(consensus);
      CREATE INDEX IF NOT EXISTS idx_simresult_created ON simulation_results(created_at);
    `,
  },
];

module.exports = { migrations };
