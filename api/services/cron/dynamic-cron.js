/**
 * Dynamic Crons — CronCreateTool pattern
 * v9.0 | Agent self-scheduling with auto-expiry
 */

const { getDB } = require('../../db');

function initDynamicCrons() {
  const db = getDB();
  db.exec(`
    CREATE TABLE IF NOT EXISTS dynamic_crons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      agent TEXT NOT NULL,
      schedule TEXT NOT NULL,
      payload TEXT DEFAULT '{}',
      max_runs INTEGER,
      run_count INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_run DATETIME,
      expires_at DATETIME
    )
  `);
}

function createCron(agent, name, schedule, payload = {}, opts = {}) {
  const db = getDB();
  const { maxRuns, expiresAt } = opts;
  if (!maxRuns && !expiresAt) return { error: 'maxRuns or expiresAt required' };

  const active = db.prepare(`SELECT COUNT(*) as c FROM dynamic_crons WHERE agent = ? AND active = 1`).get(agent);
  if (active.c >= 20) return { error: 'circuit_breaker', message: 'Max 20 active crons per agent' };

  const result = db.prepare(
    `INSERT INTO dynamic_crons (name, agent, schedule, payload, max_runs, expires_at) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(name, agent, schedule, JSON.stringify(payload), maxRuns || null, expiresAt || null);
  return { id: result.lastInsertRowid, name, agent };
}

function getDueCrons() {
  const db = getDB();
  return db.prepare(
    `SELECT * FROM dynamic_crons WHERE active = 1 AND (expires_at IS NULL OR expires_at > datetime('now')) AND (max_runs IS NULL OR run_count < max_runs)`
  ).all();
}

function recordRun(cronId) {
  const db = getDB();
  db.prepare(`UPDATE dynamic_crons SET run_count = run_count + 1, last_run = datetime('now') WHERE id = ?`).run(cronId);
  // Auto-deactivate if maxed
  db.prepare(`UPDATE dynamic_crons SET active = 0 WHERE id = ? AND max_runs IS NOT NULL AND run_count >= max_runs`).run(cronId);
}

function deactivate(cronId) {
  const db = getDB();
  db.prepare(`UPDATE dynamic_crons SET active = 0 WHERE id = ?`).run(cronId);
  return { deactivated: cronId };
}

function cleanupCrons() {
  const db = getDB();
  const result = db.prepare(`UPDATE dynamic_crons SET active = 0 WHERE expires_at < datetime('now') AND active = 1`).run();
  return { deactivated: result.changes };
}

module.exports = { initDynamicCrons, createCron, getDueCrons, recordRun, deactivate, cleanupCrons };
