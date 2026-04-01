/**
 * Event Bus — SleepTool/proactive wake pattern
 * v9.0 | Event-driven agent coordination
 */

const { getDB } = require('../../db');

const EVENT_TYPES = {
  TOKEN_SCORED: 'token.scored',
  TOKEN_HOT: 'token.hot',
  TOKEN_WATCH: 'token.watch',
  ARIA_DISCOVERY: 'aria.discovery',
  SIGNAL_APPROVED: 'signal.approved',
  SIGNAL_REJECTED: 'signal.rejected',
  SIMULATION_COMPLETE: 'sim.complete',
  MONTECARLO_COMPLETE: 'mc.complete',
  BD_OUTREACH_SENT: 'bd.outreach.sent',
  BD_RESPONSE: 'bd.response',
  DEPLOY_COMPLETE: 'deploy.complete',
  STREAK_WARNING: 'streak.warning',
  PULSE_ACT: 'pulse.act',
  PULSE_SLEEP: 'pulse.sleep',
  AUTODREAM_TRIGGER: 'autodream.trigger',
  AUTODREAM_COMPLETE: 'autodream.complete',
  STREAK_EMERGENCY: 'streak.emergency',
  OUTREACH_QUEUED: 'outreach.queued',
  OUTREACH_SENT: 'outreach.sent',
  OUTREACH_VETOED: 'outreach.vetoed',
  OUTREACH_REPLY: 'outreach.reply',
  TRUST_LEVEL_CHANGE: 'trust.level.change',
  GUARD_ALLOW: 'guard.allow',
  GUARD_WARN: 'guard.warn',
  GUARD_BLOCK: 'guard.block'
};

function initEventBus() {
  const db = getDB();
  db.exec(`
    CREATE TABLE IF NOT EXISTS event_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent TEXT NOT NULL,
      event_type TEXT NOT NULL,
      filter TEXT DEFAULT '{}',
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_triggered DATETIME,
      trigger_count INTEGER DEFAULT 0
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS event_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      payload TEXT DEFAULT '{}',
      source TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

function subscribe(agent, eventType, filter = {}) {
  const db = getDB();
  const existing = db.prepare(
    `SELECT id FROM event_subscriptions WHERE agent = ? AND event_type = ? AND active = 1`
  ).get(agent, eventType);
  if (existing) return { id: existing.id, already_subscribed: true };

  const result = db.prepare(
    `INSERT INTO event_subscriptions (agent, event_type, filter) VALUES (?, ?, ?)`
  ).run(agent, eventType, JSON.stringify(filter));
  return { id: result.lastInsertRowid, subscribed: true };
}

function emit(source, eventType, payload = {}) {
  const db = getDB();
  // Log event
  db.prepare(`INSERT INTO event_log (event_type, payload, source) VALUES (?, ?, ?)`).run(
    eventType, JSON.stringify(payload), source
  );

  // Find matching subscriptions and deliver via mailbox
  const subs = db.prepare(
    `SELECT * FROM event_subscriptions WHERE event_type = ? AND active = 1`
  ).all(eventType);

  let delivered = 0;
  let mailboxSend;
  try {
    mailboxSend = require('../mailbox/mailbox').send;
  } catch { return { logged: true, delivered: 0, error: 'mailbox not available' }; }

  for (const sub of subs) {
    mailboxSend(source, sub.agent, 'EVENT', { eventType, ...payload });
    db.prepare(
      `UPDATE event_subscriptions SET last_triggered = datetime('now'), trigger_count = trigger_count + 1 WHERE id = ?`
    ).run(sub.id);
    delivered++;
  }

  return { logged: true, delivered, subscribers: subs.length };
}

function getSubscriptions(agent) {
  const db = getDB();
  let sql = `SELECT * FROM event_subscriptions WHERE active = 1`;
  if (agent) sql += ` AND agent = '${agent}'`;
  return db.prepare(sql).all();
}

function getEventLog(type, limit = 20) {
  const db = getDB();
  let sql = `SELECT * FROM event_log`;
  const params = [];
  if (type) { sql += ` WHERE event_type = ?`; params.push(type); }
  sql += ` ORDER BY created_at DESC LIMIT ?`;
  params.push(limit);
  return db.prepare(sql).all(...params);
}

module.exports = { initEventBus, subscribe, emit, getSubscriptions, getEventLog, EVENT_TYPES };
