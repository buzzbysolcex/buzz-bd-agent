// Trust Gates — graduated autonomy, reboot-persistent
// Feature flag: TRUST_GATES

const { getDB } = require('../../db');
const { emit } = require('../events/event-bus');
const mailbox = require('../mailbox/mailbox');
const { feature } = require('../../lib/feature-flags');

function db() { return getDB(); }

const LEVELS = {
  0: { name: 'FULL_APPROVAL', autoSend: false, silenceConsent: false, minScore: 0 },
  1: { name: 'SILENCE_95', autoSend: false, silenceConsent: true, minScore: 95 },
  2: { name: 'AUTO_95', autoSend: true, silenceConsent: false, minScore: 95 },
  3: { name: 'SILENCE_85', autoSend: false, silenceConsent: true, minScore: 85 },
  4: { name: 'AUTO_85', autoSend: true, silenceConsent: false, minScore: 85 },
};

const THRESHOLDS = {
  1: { outreachCount: 5, complaintCount: 0, accuracy: 0 },
  2: { outreachCount: 10, complaintCount: 0, accuracy: 70 },
  3: { outreachCount: 30, complaintCount: 0, accuracy: 75 },
  4: { outreachCount: 50, complaintCount: 0, accuracy: 80 },
};

function initTrustGates() {
  db().prepare(`
    CREATE TABLE IF NOT EXISTS trust_state (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      trust_level INTEGER NOT NULL DEFAULT 0,
      outreach_count INTEGER NOT NULL DEFAULT 0,
      complaint_count INTEGER NOT NULL DEFAULT 0,
      accuracy_pct REAL NOT NULL DEFAULT 0.0,
      failed_streak INTEGER NOT NULL DEFAULT 0,
      last_promotion TEXT DEFAULT NULL,
      last_demotion TEXT DEFAULT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `).run();

  // Ensure single row exists
  db().prepare(`
    INSERT OR IGNORE INTO trust_state (id, trust_level) VALUES (1, 0)
  `).run();

  db().prepare(`
    CREATE TABLE IF NOT EXISTS trust_audit (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event TEXT NOT NULL,
      old_level INTEGER NOT NULL,
      new_level INTEGER NOT NULL,
      reason TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `).run();
}

// Get current trust state (survives reboot)
function getTrustState() {
  return db().prepare('SELECT * FROM trust_state WHERE id = 1').get();
}

// Get current trust level
function getTrustLevel() {
  const state = getTrustState();
  return state ? state.trust_level : 0;
}

// Determine action for a given token score
function resolveAction(tokenScore) {
  if (!feature('TRUST_GATES')) return 'APPROVAL_REQUIRED';

  const level = getTrustLevel();
  const config = LEVELS[level];
  if (!config) return 'APPROVAL_REQUIRED';

  if (tokenScore >= config.minScore) {
    if (config.autoSend) return 'AUTO_SEND';
    if (config.silenceConsent) return 'SILENCE_CONSENT';
  }

  return 'APPROVAL_REQUIRED';
}

// Record a successful outreach (call after email confirmed sent)
function recordSuccess() {
  db().prepare(`
    UPDATE trust_state
    SET outreach_count = outreach_count + 1,
        failed_streak = 0,
        updated_at = datetime('now')
    WHERE id = 1
  `).run();
  checkPromotion();
}

// Record a complaint (instant reset to LEVEL 0)
function recordComplaint(reason) {
  const state = getTrustState();
  const oldLevel = state.trust_level;

  db().prepare(`
    UPDATE trust_state
    SET trust_level = 0,
        complaint_count = complaint_count + 1,
        last_demotion = datetime('now'),
        updated_at = datetime('now')
    WHERE id = 1
  `).run();

  db().prepare(`
    INSERT INTO trust_audit (event, old_level, new_level, reason)
    VALUES ('COMPLAINT_RESET', ?, 0, ?)
  `).run(oldLevel, reason);

  emit('trust-gates', 'trust.level.change', {
    event: 'COMPLAINT_RESET', oldLevel, newLevel: 0, reason
  });

  mailbox.send('trust-gates', 'bd-agent', 'ALERT', {
    type: 'TRUST_RESET',
    message: `Trust reset to LEVEL 0 due to complaint: ${reason}`
  });
}

// Record a failed outreach (3 consecutive → demote 1 level)
function recordFailure() {
  db().prepare(`
    UPDATE trust_state
    SET failed_streak = failed_streak + 1,
        updated_at = datetime('now')
    WHERE id = 1
  `).run();

  const state = getTrustState();
  if (state.failed_streak >= 3 && state.trust_level > 0) {
    const oldLevel = state.trust_level;
    const newLevel = oldLevel - 1;

    db().prepare(`
      UPDATE trust_state
      SET trust_level = ?,
          failed_streak = 0,
          last_demotion = datetime('now'),
          updated_at = datetime('now')
      WHERE id = 1
    `).run(newLevel);

    db().prepare(`
      INSERT INTO trust_audit (event, old_level, new_level, reason)
      VALUES ('FAILURE_DEMOTE', ?, ?, '3 consecutive failed outreaches')
    `).run(oldLevel, newLevel);

    emit('trust-gates', 'trust.level.change', {
      event: 'FAILURE_DEMOTE', oldLevel, newLevel
    });
  }
}

// Update accuracy from BuzzReputation on-chain contract
function updateAccuracy(accuracyPct) {
  db().prepare(`
    UPDATE trust_state SET accuracy_pct = ?, updated_at = datetime('now')
    WHERE id = 1
  `).run(accuracyPct);
  checkPromotion();
}

// Check if promotion is earned (does NOT auto-promote — recommends to War Room)
function checkPromotion() {
  const state = getTrustState();
  if (!state) return;

  const nextLevel = state.trust_level + 1;
  if (nextLevel > 4) return; // Max level

  const threshold = THRESHOLDS[nextLevel];
  if (!threshold) return;

  const eligible =
    state.outreach_count >= threshold.outreachCount &&
    state.complaint_count <= threshold.complaintCount &&
    state.accuracy_pct >= threshold.accuracy;

  if (eligible) {
    // Recommend promotion — Ogie must /promote-trust to confirm
    mailbox.send('trust-gates', 'bd-agent', 'REQUEST', {
      type: 'PROMOTION_ELIGIBLE',
      currentLevel: state.trust_level,
      nextLevel,
      metrics: {
        outreachCount: state.outreach_count,
        complaintCount: state.complaint_count,
        accuracy: state.accuracy_pct
      },
      message: `Trust promotion eligible: Level ${state.trust_level} → ${nextLevel}. ` +
        `Use /promote-trust to confirm.`
    });
  }
}

// Manual promotion (Ogie confirms via /promote-trust)
function promote(reason = 'Manual promotion by Ogie') {
  const state = getTrustState();
  if (!state || state.trust_level >= 4) return { promoted: false, reason: 'Already at max level' };

  const oldLevel = state.trust_level;
  const newLevel = oldLevel + 1;

  db().prepare(`
    UPDATE trust_state
    SET trust_level = ?,
        last_promotion = datetime('now'),
        updated_at = datetime('now')
    WHERE id = 1
  `).run(newLevel);

  db().prepare(`
    INSERT INTO trust_audit (event, old_level, new_level, reason)
    VALUES ('PROMOTED', ?, ?, ?)
  `).run(oldLevel, newLevel, reason);

  emit('trust-gates', 'trust.level.change', {
    event: 'PROMOTED', oldLevel, newLevel, reason
  });

  return { promoted: true, oldLevel, newLevel };
}

// Manual demotion (Ogie calls /demote-trust)
function demote(reason = 'Manual demotion by Ogie') {
  const state = getTrustState();
  if (!state || state.trust_level <= 0) return { demoted: false };

  const oldLevel = state.trust_level;
  const newLevel = oldLevel - 1;

  db().prepare(`
    UPDATE trust_state
    SET trust_level = ?,
        last_demotion = datetime('now'),
        updated_at = datetime('now')
    WHERE id = 1
  `).run(newLevel);

  db().prepare(`
    INSERT INTO trust_audit (event, old_level, new_level, reason)
    VALUES ('DEMOTED', ?, ?, ?)
  `).run(oldLevel, newLevel, reason);

  emit('trust-gates', 'trust.level.change', {
    event: 'DEMOTED', oldLevel, newLevel, reason
  });

  return { demoted: true, oldLevel, newLevel };
}

// Get audit trail
function getAudit(limit = 20) {
  return db().prepare(`
    SELECT * FROM trust_audit ORDER BY created_at DESC LIMIT ?
  `).all(limit);
}

module.exports = {
  initTrustGates, getTrustState, getTrustLevel, resolveAction,
  recordSuccess, recordComplaint, recordFailure, updateAccuracy,
  promote, demote, getAudit, LEVELS, THRESHOLDS
};
