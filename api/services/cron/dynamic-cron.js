/**
 * Dynamic Crons — CronCreateTool pattern
 * v9.0 | Agent self-scheduling with auto-expiry
 */

const { getDB } = require("../../db");

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
  if (!maxRuns && !expiresAt) return { error: "maxRuns or expiresAt required" };

  const active = db
    .prepare(
      `SELECT COUNT(*) as c FROM dynamic_crons WHERE agent = ? AND active = 1`,
    )
    .get(agent);
  if (active.c >= 20)
    return {
      error: "circuit_breaker",
      message: "Max 20 active crons per agent",
    };

  const result = db
    .prepare(
      `INSERT INTO dynamic_crons (name, agent, schedule, payload, max_runs, expires_at) VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      name,
      agent,
      schedule,
      JSON.stringify(payload),
      maxRuns || null,
      expiresAt || null,
    );
  return { id: result.lastInsertRowid, name, agent };
}

/* TODO(minimal-parser): supports only `*​/N * * * *` and `0 *​/N * * *`.
   Migrate to cron-parser dep when Day-0 + Phase 1 backlog GREEN.
   Track: /data/buzz/persistent/directives/backlog-cron-parser-migration.md
   Rationale: avoid new dep during foundation day; only 2 patterns in live use. */
function parseScheduleMostRecent(schedule, now) {
  // Returns the most-recent UTC Date the schedule should have fired at or before `now`.
  // Throws on unsupported patterns (LOUD — caller logs + skips).
  const everyNMin = schedule.match(/^\*\/(\d+) \* \* \* \*$/);
  if (everyNMin) {
    const n = parseInt(everyNMin[1], 10);
    if (!Number.isInteger(n) || n <= 0 || n > 59)
      throw new Error(`unsupported minute interval: ${schedule}`);
    return new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        now.getUTCHours(),
        Math.floor(now.getUTCMinutes() / n) * n,
        0,
        0,
      ),
    );
  }
  const everyNHour = schedule.match(/^0 \*\/(\d+) \* \* \*$/);
  if (everyNHour) {
    const n = parseInt(everyNHour[1], 10);
    if (!Number.isInteger(n) || n <= 0 || n > 23)
      throw new Error(`unsupported hour interval: ${schedule}`);
    return new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        Math.floor(now.getUTCHours() / n) * n,
        0,
        0,
        0,
      ),
    );
  }
  throw new Error(`unknown_cron_pattern: ${schedule}`);
}

function sqliteUtcToDate(s) {
  if (!s) return null;
  return new Date(s.replace(" ", "T") + "Z");
}

function getDueCrons() {
  const db = getDB();
  const all = db
    .prepare(
      `SELECT * FROM dynamic_crons WHERE active = 1 AND (expires_at IS NULL OR expires_at > datetime('now')) AND (max_runs IS NULL OR run_count < max_runs)`,
    )
    .all();
  const now = new Date();
  const due = [];
  for (const cron of all) {
    let mostRecent;
    try {
      mostRecent = parseScheduleMostRecent(cron.schedule, now);
    } catch (e) {
      try {
        db.prepare(
          `INSERT INTO observation_log (tick, timestamp, decision, reason, action)
           VALUES (-1, ?, 'ACT', ?, 'unknown_cron_pattern')`,
        ).run(
          now.toISOString(),
          `cronId=${cron.id} name=${cron.name} schedule='${cron.schedule}' err=${e.message}`,
        );
      } catch (logErr) {
        console.error(
          "[dynamic-cron] unknown_cron_pattern AND log failed:",
          cron.id,
          cron.schedule,
          e.message,
          logErr.message,
        );
      }
      console.error(
        `[dynamic-cron] unknown_cron_pattern cronId=${cron.id} schedule='${cron.schedule}' — skipping`,
      );
      continue;
    }
    const lastRun = sqliteUtcToDate(cron.last_run);
    if (!lastRun || lastRun < mostRecent) due.push(cron);
  }
  return due;
}

function recordRun(cronId) {
  const db = getDB();
  db.prepare(
    `UPDATE dynamic_crons SET run_count = run_count + 1, last_run = datetime('now') WHERE id = ?`,
  ).run(cronId);
  // Auto-deactivate if maxed
  db.prepare(
    `UPDATE dynamic_crons SET active = 0 WHERE id = ? AND max_runs IS NOT NULL AND run_count >= max_runs`,
  ).run(cronId);
}

function deactivate(cronId) {
  const db = getDB();
  db.prepare(`UPDATE dynamic_crons SET active = 0 WHERE id = ?`).run(cronId);
  return { deactivated: cronId };
}

function cleanupCrons() {
  const db = getDB();
  const result = db
    .prepare(
      `UPDATE dynamic_crons SET active = 0 WHERE expires_at < datetime('now') AND active = 1`,
    )
    .run();
  return { deactivated: result.changes };
}

module.exports = {
  initDynamicCrons,
  createCron,
  getDueCrons,
  recordRun,
  deactivate,
  cleanupCrons,
};
