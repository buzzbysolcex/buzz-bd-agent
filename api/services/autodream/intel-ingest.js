/**
 * autoDream intel ingest — table + writer function.
 *
 * Exposed as `autodream.intelIngest(record)` (re-exported from autodream.js).
 *
 * Source of truth for intel items arriving from channels (Discord #intel-*,
 * future: lookonchain, defi-alerts, raw). Each row records the raw payload,
 * extracted entities, cross-ref hits, and pointers to claim_audit + the
 * #intel-triaged post so we can always trace "what arrived, what we did,
 * what hit."
 *
 * Schema per Ogie approval msg 3896 (Option A + forward-compat additions):
 *   + confidence_score REAL  (NULL in Wave 1, Phase 2 synthesis fills)
 *   + synthesis_run_id INT   (NULL in Wave 1, Phase 2 synthesis fills)
 *
 * Naming per Ogie choice msg 3899 Option B: `autodream_intel_ingest`
 * (semantically accurate, phase-number-agnostic).
 *
 * Phase 1b Wave 1 Commit 3.
 */

let _tableInit = false;

function initIntelIngestTable(db) {
  if (_tableInit) return;
  db.exec(`
    CREATE TABLE IF NOT EXISTS autodream_intel_ingest (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      source_ref_id TEXT NOT NULL,
      raw_payload TEXT NOT NULL,
      extracted_entities TEXT,
      cross_ref_hits TEXT,
      triaged_status TEXT DEFAULT 'pending',
      claim_audit_id INTEGER,
      discord_triaged_msg_id TEXT,
      confidence_score REAL DEFAULT NULL,
      synthesis_run_id INTEGER DEFAULT NULL,
      ingested_at TEXT DEFAULT (datetime('now')),
      UNIQUE(source, source_ref_id)
    );
    CREATE INDEX IF NOT EXISTS idx_adii_source ON autodream_intel_ingest(source);
    CREATE INDEX IF NOT EXISTS idx_adii_status ON autodream_intel_ingest(triaged_status);
    CREATE INDEX IF NOT EXISTS idx_adii_synthesis ON autodream_intel_ingest(synthesis_run_id);
  `);
  _tableInit = true;
}

function _resetInit() {
  _tableInit = false;
}

/**
 * Write one ingest row. Idempotent on (source, source_ref_id) — returns the
 * existing row's id if already ingested.
 *
 * @param {object} record
 * @param {string} record.source                  e.g. 'discord-intel-zachxbt'
 * @param {string} record.source_ref_id           e.g. discord message_id
 * @param {string} record.raw_payload             raw message text
 * @param {object} record.extracted_entities      { wallets, tokens, urls, protocols, mentions, tickers }
 * @param {object} record.cross_ref_hits          { pipeline_tokens, blacklist_wallets }
 * @param {string} [record.triaged_status]        'pending' | 'triaged' | 'actioned' | 'needs_action'
 * @param {number} [record.claim_audit_id]
 * @param {string} [record.discord_triaged_msg_id]
 * @param {object} [deps]                         { db }
 *
 * @returns {{id:number, created:boolean}}
 */
function intelIngest(record, deps = {}) {
  const db = deps.db || require("../../db").getDB();
  initIntelIngestTable(db);

  const existing = db
    .prepare(
      `SELECT id FROM autodream_intel_ingest
       WHERE source = ? AND source_ref_id = ?`,
    )
    .get(record.source, record.source_ref_id);

  if (existing) {
    return { id: existing.id, created: false };
  }

  const row = db
    .prepare(
      `INSERT INTO autodream_intel_ingest
         (source, source_ref_id, raw_payload, extracted_entities,
          cross_ref_hits, triaged_status, claim_audit_id,
          discord_triaged_msg_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      record.source,
      record.source_ref_id,
      record.raw_payload,
      JSON.stringify(record.extracted_entities || {}),
      JSON.stringify(record.cross_ref_hits || {}),
      record.triaged_status || "pending",
      record.claim_audit_id ?? null,
      record.discord_triaged_msg_id ?? null,
    );

  return { id: row.lastInsertRowid, created: true };
}

function updateTriagedMessage(id, discordMsgId, deps = {}) {
  const db = deps.db || require("../../db").getDB();
  db.prepare(
    `UPDATE autodream_intel_ingest
     SET discord_triaged_msg_id = ?, triaged_status = 'triaged'
     WHERE id = ?`,
  ).run(discordMsgId, id);
}

module.exports = {
  initIntelIngestTable,
  intelIngest,
  updateTriagedMessage,
  _resetInit,
};
