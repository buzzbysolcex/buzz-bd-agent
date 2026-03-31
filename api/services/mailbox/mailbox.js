/**
 * Inter-Agent Mailbox — SendMessageTool pattern
 * v9.0 | Async message passing between Buzz agents
 */

const { getDB } = require('../../db');

const AGENTS = [
  'signal-agent', 'bd-agent', 'scoring-agent', 'aria-agent',
  'twitter-agent', 'sentinel-agent', 'mirofish-agent', 'pipeline-agent',
  'content-agent', 'discord-agent', 'platform-agent', 'research-agent'
];

function initMailbox() {
  const db = getDB();
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_mailbox (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_agent TEXT NOT NULL,
      to_agent TEXT NOT NULL,
      msg_type TEXT NOT NULL CHECK(msg_type IN ('ALERT','REQUEST','RESPONSE','EVENT')),
      payload TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      acked_at DATETIME,
      expires_at DATETIME DEFAULT (datetime('now', '+24 hours'))
    )
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_mailbox_inbox ON agent_mailbox(to_agent, acked_at) WHERE acked_at IS NULL`);
}

function send(fromAgent, toAgent, msgType, payload = {}) {
  const db = getDB();
  // Circuit breaker: max 100 unacked per agent
  const count = db.prepare(
    `SELECT COUNT(*) as c FROM agent_mailbox WHERE to_agent = ? AND acked_at IS NULL AND expires_at > datetime('now')`
  ).get(toAgent);
  if (count.c >= 100) {
    // Auto-expire oldest 10
    db.prepare(
      `UPDATE agent_mailbox SET expires_at = datetime('now') WHERE id IN (SELECT id FROM agent_mailbox WHERE to_agent = ? AND acked_at IS NULL ORDER BY created_at ASC LIMIT 10)`
    ).run(toAgent);
  }
  const result = db.prepare(
    `INSERT INTO agent_mailbox (from_agent, to_agent, msg_type, payload) VALUES (?, ?, ?, ?)`
  ).run(fromAgent, toAgent, msgType, JSON.stringify(payload));
  return { id: result.lastInsertRowid, sent: true };
}

function receive(agentName, limit = 10) {
  const db = getDB();
  return db.prepare(
    `SELECT id, from_agent, to_agent, msg_type, payload, created_at, expires_at
     FROM agent_mailbox
     WHERE to_agent = ? AND acked_at IS NULL AND expires_at > datetime('now')
     ORDER BY created_at ASC LIMIT ?`
  ).all(agentName, limit);
}

function ack(messageId) {
  const db = getDB();
  return db.prepare(`UPDATE agent_mailbox SET acked_at = datetime('now') WHERE id = ?`).run(messageId);
}

function broadcast(fromAgent, msgType, payload = {}, excludeAgents = []) {
  const targets = AGENTS.filter(a => !excludeAgents.includes(a));
  const results = targets.map(to => send(fromAgent, to, msgType, payload));
  return { sent: results.length, targets };
}

function cleanup() {
  const db = getDB();
  const result = db.prepare(`DELETE FROM agent_mailbox WHERE expires_at < datetime('now')`).run();
  return { deleted: result.changes };
}

module.exports = { initMailbox, send, receive, ack, broadcast, cleanup, AGENTS };
