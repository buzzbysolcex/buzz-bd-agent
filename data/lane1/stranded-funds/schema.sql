-- Stranded-Funds Scout — schema (Ogie directive, 2026-05-31). Research+content lane.
-- Runtime db: data/lane1/stranded-funds/stranded.db (NOT committed). This .sql is the
-- version-controlled scaffold. POPULATE-only; Stage 4B (outreach/recovery) is legal-gated, OUT.
-- HARD GUARDRAILS: zero mainnet exec (fork-only), zero outreach, leak-safe content,
-- no rescue-drain. ANYONE-CALLABLE candidates are content_locked=1 (never published).

CREATE TABLE IF NOT EXISTS stranded_candidates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  addr TEXT NOT NULL, chain TEXT NOT NULL DEFAULT 'ethereum',
  balance_native REAL, balance_usd REAL,
  last_activity TEXT, has_source INTEGER, deployer TEXT,
  recovery_class TEXT CHECK (recovery_class IN ('CLEAN-ADMIN','BUG-PATH','OWNER-KEY-ONLY','ANYONE-CALLABLE','UNRECOVERABLE') OR recovery_class IS NULL),
  recovery_path TEXT, executor_class TEXT, fork_verified INTEGER DEFAULT 0,
  claimant TEXT, reachability TEXT,
  disposition TEXT CHECK (disposition IN ('REACHABLE-OWNER','TRULY-ABANDONED') OR disposition IS NULL),
  content_locked INTEGER DEFAULT 0,    -- 1 for ANYONE-CALLABLE (never publish)
  discovered_at TEXT DEFAULT (datetime('now')),
  UNIQUE(addr, chain)
);

-- 4B queues (POPULATE-only, legal-gated; never actioned in this lane)
CREATE VIEW IF NOT EXISTS q_reachable_owner AS
  SELECT * FROM stranded_candidates WHERE disposition='REACHABLE-OWNER' AND recovery_class!='ANYONE-CALLABLE';
CREATE VIEW IF NOT EXISTS q_anyone_callable AS
  SELECT * FROM stranded_candidates WHERE recovery_class='ANYONE-CALLABLE';  -- MAXIMUM-SENSITIVITY
