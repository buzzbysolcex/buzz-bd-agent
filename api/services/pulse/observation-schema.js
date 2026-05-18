// Observation Log + Pulse State — persistent schema
// Pattern: KAIROS daily log files + SQLite-backed engine state
// Created by PULSE engine, compressed by autoDream
// ALL state survives reboots via pulse_state table

const { getDB } = require("../../db");

function initObservationLog() {
  const db = getDB();
  // Append-only tick decision history
  db.prepare(
    `
    CREATE TABLE IF NOT EXISTS observation_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tick INTEGER NOT NULL,
      timestamp TEXT NOT NULL,
      decision TEXT NOT NULL CHECK(decision IN ('ACT','SLEEP')),
      reason TEXT,
      action TEXT,
      result TEXT,
      consecutive_idle INTEGER,
      next_tick_ms INTEGER,
      system_load_pct INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `,
  ).run();

  db.prepare(
    `
    CREATE INDEX IF NOT EXISTS idx_obs_created
    ON observation_log(created_at)
  `,
  ).run();

  db.prepare(
    `
    CREATE INDEX IF NOT EXISTS idx_obs_decision
    ON observation_log(decision)
  `,
  ).run();

  // Persistent PULSE engine state (survives reboots)
  db.prepare(
    `
    CREATE TABLE IF NOT EXISTS pulse_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `,
  ).run();

  // Seed defaults on first-ever run only
  const existing = db.prepare("SELECT COUNT(*) as c FROM pulse_state").get();
  if (existing.c === 0) {
    const seed = db.prepare(
      "INSERT OR IGNORE INTO pulse_state (key, value) VALUES (?, ?)",
    );
    seed.run("tick_count", "0");
    seed.run("consecutive_idle", "0");
    seed.run("current_interval_ms", "60000");
    seed.run("last_tick_at", new Date().toISOString());
    seed.run("engine_started_at", new Date().toISOString());
    seed.run("total_restarts", "0");
  }
}

module.exports = { initObservationLog };
