/**
 * Buzz BD Agent — Contact Intelligence
 * v7.3.1 | Phase 0 Feature 3 — Alpha Buzz
 *
 * Builds deepening profiles of every token project team Buzz contacts.
 * Stores communication patterns, response styles, objections, timelines.
 * Honcho-style BD modeling.
 *
 * PRIVACY RULE: NEVER store listing fees, commission amounts, or financial
 * terms. Only communication patterns and preferences.
 */

let _db = null;

/**
 * Initialize contact tables (call once with db instance)
 * @param {object} db - better-sqlite3 instance
 */
function initContacts(db) {
  _db = db;

  _db.exec(`
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project TEXT NOT NULL,
      chain TEXT,
      contact_name TEXT,
      contact_role TEXT,
      contact_channel TEXT,
      email TEXT,
      telegram TEXT,
      twitter TEXT,
      first_contact TEXT,
      last_contact TEXT,
      response_style TEXT,
      response_time_avg TEXT,
      objections TEXT,
      decision_timeline TEXT,
      preferred_channel TEXT,
      sentiment TEXT DEFAULT 'neutral',
      interaction_count INTEGER DEFAULT 0,
      last_outcome TEXT,
      notes TEXT,
      pipeline_token_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  _db.exec(`
    CREATE TABLE IF NOT EXISTS contact_interactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project TEXT NOT NULL,
      interaction_type TEXT NOT NULL,
      outcome TEXT,
      notes TEXT,
      channel TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Index for fast lookups
  _db.exec(`CREATE INDEX IF NOT EXISTS idx_contacts_project ON contacts(project)`);
  _db.exec(`CREATE INDEX IF NOT EXISTS idx_contacts_chain ON contacts(chain)`);
  _db.exec(`CREATE INDEX IF NOT EXISTS idx_contact_interactions_project ON contact_interactions(project)`);
}

// ─── Privacy Sanitizer ──────────────────────────────
// Strips dollar amounts, fee references, commission info
const FEE_PATTERNS = [
  /\$[\d,]+(\.\d{1,2})?/g,                           // $1,000 or $5000.00
  /\b\d+\s*(USDT|USDC|USD|usdt|usdc|usd)\b/g,        // 15000 USDT
  /\b(commission|listing\s*fee|fee|payment)\s*[:=]?\s*\$?[\d,]+/gi,
  /\b(commission|listing\s*fee)\b[^.]*\./gi,          // full sentences about fees
  /\$\d+[kK]\b/g,                                     // $5K, $10k
];

function sanitize(text) {
  if (!text || typeof text !== 'string') return text;
  let clean = text;
  for (const pattern of FEE_PATTERNS) {
    clean = clean.replace(pattern, '[REDACTED]');
  }
  return clean;
}

function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitize(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

// ─── Core Functions ─────────────────────────────────

/**
 * Create a new contact profile
 * @param {object} data
 * @returns {object}
 */
function createContact(data) {
  if (!_db) return { success: false, error: 'Contact DB not initialized' };
  if (!data.project) return { success: false, error: 'project is required' };

  const clean = sanitizeObject(data);
  const now = new Date().toISOString();

  try {
    // Check for existing
    const existing = _db.prepare('SELECT id FROM contacts WHERE project = ?').get(clean.project);
    if (existing) return { success: false, error: `Contact for "${clean.project}" already exists. Use updateContact.` };

    const stmt = _db.prepare(`
      INSERT INTO contacts (project, chain, contact_name, contact_role, contact_channel,
        email, telegram, twitter, first_contact, last_contact, response_style,
        response_time_avg, objections, decision_timeline, preferred_channel,
        sentiment, notes, pipeline_token_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      clean.project, clean.chain || null, clean.contact_name || null,
      clean.contact_role || null, clean.contact_channel || null,
      clean.email || null, clean.telegram || null, clean.twitter || null,
      clean.first_contact || now, clean.last_contact || now,
      clean.response_style || null, clean.response_time_avg || null,
      clean.objections || null, clean.decision_timeline || null,
      clean.preferred_channel || null, clean.sentiment || 'neutral',
      clean.notes || null, clean.pipeline_token_id || null,
      now, now
    );

    return { success: true, id: result.lastInsertRowid, project: clean.project };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Update a contact profile
 * @param {string} project
 * @param {object} updates
 * @returns {object}
 */
function updateContact(project, updates) {
  if (!_db) return { success: false, error: 'Contact DB not initialized' };
  if (!project) return { success: false, error: 'project is required' };

  const clean = sanitizeObject(updates);
  const now = new Date().toISOString();

  // Allowlist of updatable columns
  const allowed = [
    'chain', 'contact_name', 'contact_role', 'contact_channel',
    'email', 'telegram', 'twitter', 'response_style', 'response_time_avg',
    'objections', 'decision_timeline', 'preferred_channel', 'sentiment',
    'notes', 'pipeline_token_id', 'last_outcome'
  ];

  const setClauses = [];
  const values = [];

  for (const [key, value] of Object.entries(clean)) {
    if (allowed.includes(key)) {
      setClauses.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (setClauses.length === 0) return { success: false, error: 'No valid fields to update' };

  setClauses.push('updated_at = ?');
  values.push(now);
  setClauses.push('interaction_count = interaction_count + 1');
  values.push(project);

  try {
    const result = _db.prepare(
      `UPDATE contacts SET ${setClauses.join(', ')} WHERE project = ?`
    ).run(...values);

    if (result.changes === 0) return { success: false, error: `Contact "${project}" not found` };
    return { success: true, project, updated_fields: setClauses.length - 2 };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Get full contact profile
 * @param {string} project
 * @returns {object}
 */
function getContact(project) {
  if (!_db) return { success: false, error: 'Contact DB not initialized' };

  try {
    const contact = _db.prepare('SELECT * FROM contacts WHERE project = ?').get(project);
    if (!contact) return { success: false, error: `Contact "${project}" not found` };
    return { success: true, contact };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * List contacts with optional filters
 * @param {object} filters - { chain, sentiment, limit }
 * @returns {object}
 */
function listContacts(filters = {}) {
  if (!_db) return { success: false, error: 'Contact DB not initialized' };

  const where = [];
  const params = [];

  if (filters.chain) { where.push('chain = ?'); params.push(filters.chain); }
  if (filters.sentiment) { where.push('sentiment = ?'); params.push(filters.sentiment); }

  const limit = Math.min(parseInt(filters.limit) || 50, 200);
  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  try {
    const contacts = _db.prepare(
      `SELECT id, project, chain, contact_name, contact_role, sentiment,
              interaction_count, last_contact, last_outcome, preferred_channel
       FROM contacts ${whereClause}
       ORDER BY updated_at DESC LIMIT ?`
    ).all(...params, limit);

    return { success: true, count: contacts.length, contacts };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Record an interaction with a project contact
 * @param {string} project
 * @param {string} type - e.g. 'email', 'telegram', 'twitter_dm', 'call'
 * @param {string} outcome - e.g. 'replied', 'no_response', 'interested', 'declined'
 * @param {string} [notes]
 * @returns {object}
 */
function recordInteraction(project, type, outcome, notes) {
  if (!_db) return { success: false, error: 'Contact DB not initialized' };
  if (!project || !type) return { success: false, error: 'project and type are required' };

  const cleanNotes = sanitize(notes);
  const cleanOutcome = sanitize(outcome);
  const now = new Date().toISOString();

  try {
    // Insert interaction
    const stmt = _db.prepare(`
      INSERT INTO contact_interactions (project, interaction_type, outcome, notes, channel, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(project, type, cleanOutcome || null, cleanNotes || null, type, now);

    // Update contact's last_contact, last_outcome, interaction_count
    _db.prepare(`
      UPDATE contacts SET
        last_contact = ?,
        last_outcome = ?,
        interaction_count = interaction_count + 1,
        updated_at = ?
      WHERE project = ?
    `).run(now, cleanOutcome || null, now, project);

    return { success: true, interaction_id: result.lastInsertRowid, project, type };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Get all interactions for a project
 * @param {string} project
 * @returns {object}
 */
function getContactHistory(project) {
  if (!_db) return { success: false, error: 'Contact DB not initialized' };

  try {
    const interactions = _db.prepare(
      `SELECT * FROM contact_interactions WHERE project = ? ORDER BY created_at DESC`
    ).all(project);

    return { success: true, project, count: interactions.length, interactions };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Enrich pipeline token data with contact intelligence
 * @param {string} ticker
 * @returns {object}
 */
function enrichPipelineToken(ticker) {
  if (!_db) return { success: false, error: 'Contact DB not initialized' };

  try {
    const token = _db.prepare(
      `SELECT * FROM pipeline_tokens WHERE ticker = ? COLLATE NOCASE LIMIT 1`
    ).get(ticker);

    if (!token) return { success: false, error: `Token "${ticker}" not found in pipeline` };

    // Find contact by project name matching ticker or pipeline_token_id
    const contact = _db.prepare(
      `SELECT * FROM contacts
       WHERE project = ? COLLATE NOCASE
       OR pipeline_token_id = ?
       LIMIT 1`
    ).get(ticker, token.id ? String(token.id) : '');

    const interactions = contact
      ? _db.prepare(
          `SELECT interaction_type, outcome, created_at FROM contact_interactions
           WHERE project = ? ORDER BY created_at DESC LIMIT 10`
        ).all(contact.project)
      : [];

    return {
      success: true,
      token: {
        ticker: token.ticker,
        chain: token.chain,
        score: token.score,
        stage: token.stage,
        address: token.address
      },
      contact: contact || null,
      recent_interactions: interactions,
      has_contact: !!contact
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = {
  initContacts,
  createContact,
  updateContact,
  getContact,
  listContacts,
  recordInteraction,
  getContactHistory,
  enrichPipelineToken,
  sanitize
};
