/**
 * Task Dependency Graph — TaskCreateTool pattern
 * v9.0 | DAG for multi-step agent workflows
 */

const { getDB } = require("../../db");

function initTasks() {
  const db = getDB();
  db.exec(`
    CREATE TABLE IF NOT EXISTS buzz_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING','READY','RUNNING','COMPLETE','FAILED','CANCELLED')),
      agent TEXT,
      payload TEXT DEFAULT '{}',
      result TEXT,
      depends_on TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      started_at DATETIME,
      completed_at DATETIME,
      expires_at DATETIME DEFAULT (datetime('now', '+48 hours'))
    )
  `);
}

function createTask(name, agent, payload = {}, dependsOn = []) {
  const db = getDB();
  const pending = db
    .prepare(`SELECT COUNT(*) as c FROM buzz_tasks WHERE status = 'PENDING'`)
    .get();
  if (pending.c >= 50)
    return { error: "circuit_breaker", message: "Max 50 pending tasks" };

  const status =
    dependsOn.length === 0
      ? "READY"
      : _allDepsComplete(db, dependsOn)
        ? "READY"
        : "PENDING";
  const result = db
    .prepare(
      `INSERT INTO buzz_tasks (name, agent, payload, depends_on, status) VALUES (?, ?, ?, ?, ?)`,
    )
    .run(
      name,
      agent,
      JSON.stringify(payload),
      JSON.stringify(dependsOn),
      status,
    );
  return { id: result.lastInsertRowid, name, status };
}

function completeTask(taskId, result = {}) {
  const db = getDB();
  db.prepare(
    `UPDATE buzz_tasks SET status = 'COMPLETE', result = ?, completed_at = datetime('now') WHERE id = ?`,
  ).run(JSON.stringify(result), taskId);

  // CASCADE: promote dependents
  const promoted = [];
  const pending = db
    .prepare(`SELECT id, depends_on FROM buzz_tasks WHERE status = 'PENDING'`)
    .all();
  for (const task of pending) {
    const deps = JSON.parse(task.depends_on || "[]");
    if (deps.includes(taskId) && _allDepsComplete(db, deps)) {
      db.prepare(`UPDATE buzz_tasks SET status = 'READY' WHERE id = ?`).run(
        task.id,
      );
      promoted.push(task.id);
    }
  }
  return { completed: taskId, promoted };
}

function getReadyTasks(agent) {
  const db = getDB();
  let sql = `SELECT * FROM buzz_tasks WHERE status = 'READY' AND expires_at > datetime('now')`;
  const params = [];
  if (agent) {
    sql += ` AND agent = ?`;
    params.push(agent);
  }
  return db.prepare(sql).all(...params);
}

function claimTask(taskId) {
  const db = getDB();
  const result = db
    .prepare(
      `UPDATE buzz_tasks SET status = 'RUNNING', started_at = datetime('now') WHERE id = ? AND status = 'READY'`,
    )
    .run(taskId);
  return { claimed: result.changes > 0 };
}

function failTask(taskId, error) {
  const db = getDB();
  db.prepare(
    `UPDATE buzz_tasks SET status = 'FAILED', result = ?, completed_at = datetime('now') WHERE id = ?`,
  ).run(JSON.stringify({ error }), taskId);
  return { failed: taskId };
}

function getTaskStatus(taskId) {
  const db = getDB();
  return db.prepare(`SELECT * FROM buzz_tasks WHERE id = ?`).get(taskId);
}

function createPipeline(steps) {
  const ids = [];
  for (let i = 0; i < steps.length; i++) {
    const deps = i > 0 ? [ids[i - 1]] : [];
    const result = createTask(
      steps[i].name,
      steps[i].agent,
      steps[i].payload || {},
      deps,
    );
    ids.push(result.id);
  }
  return { pipeline: ids };
}

function createFanOut(parentId, steps) {
  const ids = steps.map(
    (s) => createTask(s.name, s.agent, s.payload || {}, [parentId]).id,
  );
  return { parent: parentId, children: ids };
}

function cleanupTasks() {
  const db = getDB();
  const result = db
    .prepare(
      `UPDATE buzz_tasks SET status = 'CANCELLED' WHERE status IN ('PENDING','READY') AND expires_at < datetime('now')`,
    )
    .run();
  return { cancelled: result.changes };
}

function _allDepsComplete(db, depIds) {
  if (!depIds.length) return true;
  const placeholders = depIds.map(() => "?").join(",");
  const count = db
    .prepare(
      `SELECT COUNT(*) as c FROM buzz_tasks WHERE id IN (${placeholders}) AND status = 'COMPLETE'`,
    )
    .get(...depIds);
  return count.c === depIds.length;
}

module.exports = {
  initTasks,
  createTask,
  completeTask,
  getReadyTasks,
  claimTask,
  failTask,
  getTaskStatus,
  createPipeline,
  createFanOut,
  cleanupTasks,
};
