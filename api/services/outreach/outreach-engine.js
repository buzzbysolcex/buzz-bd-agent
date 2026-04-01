// Outreach Engine — v9 reactive, email-first, reboot-persistent
// Feature flag: AUTO_OUTREACH

const { getDB } = require('../../db');
const mailbox = require('../mailbox/mailbox');
const { emit } = require('../events/event-bus');
const { createCron } = require('../cron/dynamic-cron');
const { feature } = require('../../lib/feature-flags');

function db() { return getDB(); }

function initOutreach() {
  db().prepare(`
    CREATE TABLE IF NOT EXISTS outreach_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token_address TEXT NOT NULL,
      chain TEXT NOT NULL DEFAULT 'unknown',
      contact_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'QUEUED'
        CHECK(status IN ('QUEUED','PENDING_APPROVAL','SILENCE_WINDOW','SENT','VETOED','FAILED','REPLIED')),
      trust_action TEXT NOT NULL DEFAULT 'APPROVAL_REQUIRED'
        CHECK(trust_action IN ('AUTO_SEND','SILENCE_CONSENT','APPROVAL_REQUIRED')),
      silence_expires_at TEXT DEFAULT NULL,
      queued_at TEXT NOT NULL DEFAULT (datetime('now')),
      send_at TEXT DEFAULT NULL,
      sent_at TEXT DEFAULT NULL,
      vetoed_at TEXT DEFAULT NULL,
      reply_detected_at TEXT DEFAULT NULL,
      error TEXT DEFAULT NULL
    )
  `).run();

  db().prepare(`
    CREATE TABLE IF NOT EXISTS outreach_contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token_address TEXT NOT NULL,
      chain TEXT NOT NULL DEFAULT 'unknown',
      contact_method TEXT NOT NULL
        CHECK(contact_method IN ('email','telegram','twitter','discord','website_form')),
      contact_value TEXT NOT NULL,
      source TEXT NOT NULL,
      verified INTEGER NOT NULL DEFAULT 0,
      discovered_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(token_address, contact_method, contact_value)
    )
  `).run();

  // Indexes for performance
  db().prepare(`
    CREATE INDEX IF NOT EXISTS idx_outreach_status
    ON outreach_queue(status) WHERE status IN ('QUEUED','SILENCE_WINDOW')
  `).run();

  db().prepare(`
    CREATE INDEX IF NOT EXISTS idx_contacts_token
    ON outreach_contacts(token_address)
  `).run();
}

// Store a discovered contact
function addContact(tokenAddress, chain, method, value, source) {
  try {
    return db().prepare(`
      INSERT OR IGNORE INTO outreach_contacts
        (token_address, chain, contact_method, contact_value, source)
      VALUES (?, ?, ?, ?, ?)
    `).run(tokenAddress, chain, method, value, source);
  } catch (e) {
    return null;
  }
}

// Verify a contact (mark as verified after 3-source confirmation)
function verifyContact(contactId) {
  return db().prepare(`
    UPDATE outreach_contacts SET verified = 1 WHERE id = ?
  `).run(contactId);
}

// Get contacts for a token (verified first)
function getContacts(tokenAddress) {
  return db().prepare(`
    SELECT * FROM outreach_contacts
    WHERE token_address = ?
    ORDER BY verified DESC, discovered_at ASC
  `).all(tokenAddress);
}

// Get verified email for a token
function getVerifiedEmail(tokenAddress) {
  return db().prepare(`
    SELECT * FROM outreach_contacts
    WHERE token_address = ? AND contact_method = 'email' AND verified = 1
    LIMIT 1
  `).get(tokenAddress);
}

// Queue an outreach email
function queueOutreach(tokenAddress, chain, contactEmail, subject, body, trustAction) {
  if (!feature('AUTO_OUTREACH')) {
    return { queued: false, reason: 'AUTO_OUTREACH flag disabled' };
  }

  // Duplicate check: never send two emails to same address for same token
  const existing = db().prepare(`
    SELECT id FROM outreach_queue
    WHERE token_address = ? AND contact_email = ? AND status != 'FAILED'
  `).get(tokenAddress, contactEmail);
  if (existing) {
    return { queued: false, reason: 'Duplicate: already queued/sent for this token+email' };
  }

  // Daily limit: max 10
  const todayCount = db().prepare(`
    SELECT COUNT(*) as cnt FROM outreach_queue
    WHERE DATE(queued_at) = DATE('now') AND status IN ('QUEUED','SILENCE_WINDOW','SENT')
  `).get();
  if (todayCount && todayCount.cnt >= 10) {
    return { queued: false, reason: 'Daily limit reached (10/day)' };
  }

  let status = 'QUEUED';
  let silenceExpiresAt = null;

  if (trustAction === 'AUTO_SEND') {
    status = 'QUEUED';
  } else if (trustAction === 'SILENCE_CONSENT' && feature('SILENCE_CONSENT')) {
    status = 'SILENCE_WINDOW';
    silenceExpiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
  } else {
    status = 'PENDING_APPROVAL';
  }

  const result = db().prepare(`
    INSERT INTO outreach_queue
      (token_address, chain, contact_email, subject, body, status, trust_action, silence_expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(tokenAddress, chain, contactEmail, subject, body, status, trustAction, silenceExpiresAt);

  const outreachId = result.lastInsertRowid;

  emit('outreach-engine', 'outreach.queued', {
    outreachId, tokenAddress, contactEmail, trustAction, status
  });

  // Notify War Room
  mailbox.send('outreach-engine', 'bd-agent', 'ALERT', {
    type: 'OUTREACH_QUEUED',
    outreachId, tokenAddress, contactEmail, trustAction, status,
    silenceExpiresAt,
    message: trustAction === 'SILENCE_CONSENT'
      ? `Outreach #${outreachId} queued for ${contactEmail}. Auto-sends in 4h unless you /veto ${outreachId}`
      : trustAction === 'AUTO_SEND'
      ? `Outreach #${outreachId} auto-sending to ${contactEmail} (trust level approved)`
      : `Outreach #${outreachId} needs your /approve ${outreachId} to send to ${contactEmail}`
  });

  return { queued: true, outreachId, status, trustAction };
}

// Veto (Ogie calls /veto <id> in War Room)
function vetoOutreach(outreachId) {
  const result = db().prepare(`
    UPDATE outreach_queue SET status = 'VETOED', vetoed_at = datetime('now')
    WHERE id = ? AND status IN ('SILENCE_WINDOW', 'QUEUED', 'PENDING_APPROVAL')
  `).run(outreachId);

  if (result.changes > 0) {
    emit('outreach-engine', 'outreach.vetoed', { outreachId });
    mailbox.send('outreach-engine', 'bd-agent', 'EVENT', {
      type: 'OUTREACH_VETOED', outreachId
    });
  }
  return { vetoed: result.changes > 0 };
}

// Approve (Ogie calls /approve <id> in War Room)
function approveOutreach(outreachId) {
  const result = db().prepare(`
    UPDATE outreach_queue SET status = 'QUEUED', trust_action = 'AUTO_SEND'
    WHERE id = ? AND status = 'PENDING_APPROVAL'
  `).run(outreachId);
  return { approved: result.changes > 0 };
}

// Get emails ready to send (called by sender loop)
function getReadyToSend() {
  return db().prepare(`
    SELECT * FROM outreach_queue
    WHERE (status = 'QUEUED' AND trust_action = 'AUTO_SEND')
       OR (status = 'SILENCE_WINDOW' AND silence_expires_at < datetime('now'))
    ORDER BY queued_at ASC
    LIMIT 5
  `).all();
}

// Mark as sent + create follow-up crons
function markSent(outreachId) {
  db().prepare(`
    UPDATE outreach_queue SET status = 'SENT', sent_at = datetime('now')
    WHERE id = ?
  `).run(outreachId);

  const outreach = db().prepare('SELECT * FROM outreach_queue WHERE id = ?').get(outreachId);

  emit('outreach-engine', 'outreach.sent', {
    outreachId,
    tokenAddress: outreach?.token_address,
    contactEmail: outreach?.contact_email
  });

  // Create follow-up crons via v9 dynamic cron system (Task 10)
  if (outreach) {
    // 48h: warm follow-up (maxRuns:1, self-deactivates)
    createCron('bd-agent', `followup-48h-${outreachId}`, '2880', {
      type: 'FOLLOWUP_1',
      outreachId,
      tokenAddress: outreach.token_address,
      contactEmail: outreach.contact_email
    }, { maxRuns: 1 });

    // 7d: break-up email (maxRuns:1, self-deactivates)
    createCron('bd-agent', `breakup-7d-${outreachId}`, '10080', {
      type: 'FOLLOWUP_BREAKUP',
      outreachId,
      tokenAddress: outreach.token_address,
      contactEmail: outreach.contact_email
    }, { maxRuns: 1 });
  }

  return { sent: true };
}

// Mark failed
function markFailed(outreachId, error) {
  db().prepare(`
    UPDATE outreach_queue SET status = 'FAILED', error = ? WHERE id = ?
  `).run(error, outreachId);
}

// Mark reply detected (called by inbox monitor, Task 16)
function markReply(outreachId) {
  db().prepare(`
    UPDATE outreach_queue SET status = 'REPLIED', reply_detected_at = datetime('now')
    WHERE id = ?
  `).run(outreachId);
}

// Stats
function getStats() {
  return {
    byStatus: db().prepare(`
      SELECT status, COUNT(*) as count FROM outreach_queue GROUP BY status
    `).all(),
    today: db().prepare(`
      SELECT COUNT(*) as count FROM outreach_queue
      WHERE DATE(queued_at) = DATE('now')
    `).get(),
    totalSent: db().prepare(`
      SELECT COUNT(*) as count FROM outreach_queue WHERE status = 'SENT'
    `).get(),
    totalContacts: db().prepare(`
      SELECT COUNT(*) as count FROM outreach_contacts
    `).get()
  };
}

module.exports = {
  initOutreach, addContact, verifyContact, getContacts, getVerifiedEmail,
  queueOutreach, vetoOutreach, approveOutreach,
  getReadyToSend, markSent, markFailed, markReply, getStats
};
