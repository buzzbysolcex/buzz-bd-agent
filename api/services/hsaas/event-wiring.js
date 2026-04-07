/**
 * HSaaS Event Wiring — Auto-funnel from token.scored to upsell
 *
 * Subscribes to token.scored events. On every score:
 *   1. Create audit_request entry (status: 'event_seeded')
 *   2. If score >= 70: queue an upsell email DRAFT in outreach_queue
 *      (DO NOT auto-send — War Room approval required)
 *
 * Feature flag: HSAAS_EVENT_WIRING
 */

const { getDB } = require('../../db');
const { feature } = require('../../lib/feature-flags');
const { subscribe, EVENT_TYPES } = require('../events/event-bus');

function db() { return getDB(); }

const UPSELL_THRESHOLD = 70;

/**
 * Ensure audit_requests table exists (lazy-create — same schema as audit-request route)
 */
function ensureAuditTable() {
  db().exec(`
    CREATE TABLE IF NOT EXISTS audit_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id TEXT UNIQUE NOT NULL,
      token_address TEXT NOT NULL,
      chain TEXT NOT NULL,
      contact_email TEXT NOT NULL,
      contact_twitter TEXT,
      tier TEXT NOT NULL CHECK(tier IN ('quick_scan', 'full_analysis', 'swarm_audit')),
      price INTEGER NOT NULL,
      message TEXT,
      status TEXT DEFAULT 'received' CHECK(status IN (
        'received', 'reviewing', 'in_progress', 'completed', 'rejected', 'refunded'
      )),
      created_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT,
      score INTEGER,
      report_url TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_audit_status ON audit_requests(status);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_requests(created_at);
  `);
}

/**
 * Process a token.scored event
 * Called by mailbox event delivery
 */
function processTokenScoredEvent(payload) {
  if (!feature('HSAAS_EVENT_WIRING')) return { skipped: 'flag_disabled' };

  const { token_address, chain, score, contact_email } = payload || {};
  if (!token_address || score == null) {
    return { skipped: 'missing_fields' };
  }

  ensureAuditTable();

  // 1. Create audit_request entry (status: 'received' — matches CHECK constraint)
  const requestId = `hsaas_evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  try {
    db().prepare(`
      INSERT INTO audit_requests
        (request_id, token_address, chain, contact_email, tier, price, status, score, message)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      requestId,
      token_address,
      chain || 'solana',
      contact_email || 'event-seeded@buzzbd.ai',
      'quick_scan',
      500,
      'received',
      score,
      'Auto-seeded by HSaaS event wiring on token.scored'
    );
  } catch (e) {
    return { error: 'audit_request_insert_failed: ' + e.message };
  }

  let upsell_queued = false;

  // 2. If score >= 70, queue upsell email DRAFT in outreach_queue
  //    Status: PENDING_APPROVAL — War Room must approve before send
  if (score >= UPSELL_THRESHOLD && contact_email) {
    try {
      db().prepare(`
        INSERT INTO outreach_queue
          (token_address, chain, contact_email, subject, body, status, trust_action)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        token_address,
        chain || 'solana',
        contact_email,
        `Buzz Score Report — ${token_address.slice(0, 8)} scored ${score}/100`,
        `Your token ${token_address} scored ${score}/100 in our 11-rule honest scoring engine.\n\n` +
        `Want the full report? Three audit tiers available:\n` +
        `- Quick Scan: $500\n- Full Analysis: $1,500\n- Swarm Audit (1000-agent simulation): $2,500\n\n` +
        `Reply to this email or visit buzzbd.ai/audit\n\n— Buzz BD Agent`,
        'PENDING_APPROVAL',
        'APPROVAL_REQUIRED'
      );
      upsell_queued = true;
    } catch (e) {
      console.error('[hsaas-event] Outreach queue insert failed:', e.message);
    }
  }

  return { request_id: requestId, score, upsell_queued };
}

/**
 * Initialize HSaaS event wiring
 * - Adds HSaaS subscriptions to event bus
 * - Wires mailbox delivery to processTokenScoredEvent
 */
function initHsaasEventWiring() {
  if (!feature('HSAAS_EVENT_WIRING')) {
    console.log('[HSAAS] Event wiring disabled (HSAAS_EVENT_WIRING=false)');
    return;
  }

  // Subscribe HSaaS to token.scored
  subscribe('hsaas-funnel', EVENT_TYPES.TOKEN_SCORED);
  subscribe('hsaas-funnel', EVENT_TYPES.TOKEN_HOT);

  console.log('[HSAAS] Event wiring active — subscribed to token.scored + token.hot');
}

module.exports = {
  initHsaasEventWiring,
  processTokenScoredEvent
};
