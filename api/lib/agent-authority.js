/**
 * Agent Authority Matrix — Day 32 Sprint Phase 4
 */

const { getDB } = require("../db");

function checkPermission(agentName, action) {
  const db = getDB();
  const rule = db
    .prepare(
      "SELECT * FROM agent_authority_matrix WHERE agent_name = ? AND action = ? AND is_active = 1",
    )
    .get(agentName, action);

  const allowed = !!rule && rule.calls_today < rule.max_daily_calls;
  const reason = !rule
    ? "no_permission_entry"
    : rule.calls_today >= rule.max_daily_calls
      ? "daily_limit_exceeded"
      : null;

  db.prepare(
    `
    INSERT INTO authority_audit_log (agent_name, action, permission_level, was_allowed, denial_reason)
    VALUES (?, ?, ?, ?, ?)
  `,
  ).run(
    agentName,
    action,
    rule?.permission_level || "none",
    allowed ? 1 : 0,
    reason,
  );

  if (allowed) {
    db.prepare(
      "UPDATE agent_authority_matrix SET calls_today = calls_today + 1, updated_at = datetime('now') WHERE id = ?",
    ).run(rule.id);
  }

  return {
    allowed,
    requires_approval: rule?.requires_approval === 1,
    reason,
    permission_level: rule?.permission_level || "none",
    calls_remaining: rule
      ? rule.max_daily_calls - rule.calls_today - (allowed ? 1 : 0)
      : 0,
  };
}

function getAgentPermissions(agentName) {
  const db = getDB();
  return db
    .prepare(
      "SELECT * FROM agent_authority_matrix WHERE agent_name = ? ORDER BY action",
    )
    .all(agentName);
}

function getAllPermissions() {
  const db = getDB();
  return db
    .prepare("SELECT * FROM agent_authority_matrix ORDER BY agent_name, action")
    .all();
}

function grantPermission(
  agentName,
  action,
  {
    permissionLevel = "execute",
    maxDailyCalls = 100,
    requiresApproval = false,
  } = {},
) {
  const db = getDB();
  return db
    .prepare(
      `
    INSERT INTO agent_authority_matrix (agent_name, action, permission_level, max_daily_calls, requires_approval)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(agent_name, action) DO UPDATE SET
      permission_level = excluded.permission_level,
      max_daily_calls = excluded.max_daily_calls,
      requires_approval = excluded.requires_approval,
      is_active = 1,
      updated_at = datetime('now')
  `,
    )
    .run(
      agentName,
      action,
      permissionLevel,
      maxDailyCalls,
      requiresApproval ? 1 : 0,
    );
}

function revokePermission(agentName, action) {
  const db = getDB();
  return db
    .prepare(
      "UPDATE agent_authority_matrix SET is_active = 0, updated_at = datetime('now') WHERE agent_name = ? AND action = ?",
    )
    .run(agentName, action);
}

function resetDailyCounters() {
  const db = getDB();
  return db
    .prepare(
      "UPDATE agent_authority_matrix SET calls_today = 0, updated_at = datetime('now')",
    )
    .run();
}

function getAuditLog(agentName, limit = 50) {
  const db = getDB();
  let sql = "SELECT * FROM authority_audit_log";
  const params = [];
  if (agentName) {
    sql += " WHERE agent_name = ?";
    params.push(agentName);
  }
  sql += " ORDER BY created_at DESC LIMIT ?";
  params.push(limit);
  return db.prepare(sql).all(...params);
}

module.exports = {
  checkPermission,
  getAgentPermissions,
  getAllPermissions,
  grantPermission,
  revokePermission,
  resetDailyCounters,
  getAuditLog,
};
