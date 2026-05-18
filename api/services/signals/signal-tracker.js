/**
 * Signal Tracker — AIBTC signal lifecycle tracking
 * Emits events on signal.filed, polls for approval/rejection
 * Wired to PULSE streak protection and event bus
 */

const { getDB } = require("../../db");
const { emit, EVENT_TYPES } = require("../events/event-bus");
const { feature } = require("../../lib/feature-flags");

function db() {
  return getDB();
}

/**
 * Initialize aibtc_signals_filed table (idempotent)
 */
function initSignalTracker() {
  db().exec(`
    CREATE TABLE IF NOT EXISTS aibtc_signals_filed (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      signal_id TEXT UNIQUE NOT NULL,
      beat_slug TEXT NOT NULL,
      headline TEXT,
      status TEXT DEFAULT 'submitted',
      publisher_feedback TEXT,
      filed_at TEXT DEFAULT (datetime('now')),
      reviewed_at TEXT,
      pacific_date TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_ps_date ON aibtc_signals_filed(pacific_date);
    CREATE INDEX IF NOT EXISTS idx_ps_status ON aibtc_signals_filed(status);
  `);
}

/**
 * Record a signal filing and emit signal.filed event
 * Call this after successful MCP news_file_signal
 */
function recordSignalFiled({ signal_id, beat_slug, headline, pacific_date }) {
  const now = new Date().toISOString();
  const pDate = pacific_date || new Date().toISOString().split("T")[0];

  db()
    .prepare(
      `
    INSERT OR IGNORE INTO aibtc_signals_filed (signal_id, beat_slug, headline, status, filed_at, pacific_date)
    VALUES (?, ?, ?, 'submitted', ?, ?)
  `,
    )
    .run(signal_id, beat_slug, headline || "", now, pDate);

  // Emit event for PULSE streak protection
  emit("signal-tracker", EVENT_TYPES.SIGNAL_FILED, {
    signal_id,
    beat_slug,
    headline,
    timestamp: now,
  });

  return { recorded: true, signal_id, event_emitted: "signal.filed" };
}

/**
 * Update signal status from AIBTC polling
 * Emits signal.approved or signal.rejected events
 */
function updateSignalStatus({ signal_id, status, publisher_feedback }) {
  const existing = db()
    .prepare("SELECT status FROM aibtc_signals_filed WHERE signal_id = ?")
    .get(signal_id);
  if (!existing) return { updated: false, reason: "signal_not_found" };
  if (existing.status === status)
    return { updated: false, reason: "no_change" };

  db()
    .prepare(
      `
    UPDATE aibtc_signals_filed SET status = ?, publisher_feedback = ?, reviewed_at = datetime('now')
    WHERE signal_id = ?
  `,
    )
    .run(status, publisher_feedback || null, signal_id);

  // Emit appropriate event
  if (status === "approved") {
    emit("signal-tracker", EVENT_TYPES.SIGNAL_APPROVED, {
      signal_id,
      feedback: publisher_feedback,
    });
  } else if (status === "rejected") {
    emit("signal-tracker", EVENT_TYPES.SIGNAL_REJECTED, {
      signal_id,
      feedback: publisher_feedback,
    });
  }

  return { updated: true, signal_id, new_status: status };
}

/**
 * Get today's signal count (for streak protection)
 */
function getSignalsToday() {
  const today = new Date().toISOString().split("T")[0];
  const row = db()
    .prepare(
      "SELECT COUNT(*) as c FROM aibtc_signals_filed WHERE pacific_date = ?",
    )
    .get(today);
  return row?.c || 0;
}

/**
 * Get streak info from local tracking
 */
function getStreakInfo() {
  const signals = db()
    .prepare(
      "SELECT pacific_date, COUNT(*) as c FROM aibtc_signals_filed GROUP BY pacific_date ORDER BY pacific_date DESC LIMIT 30",
    )
    .all();

  let streak = 0;
  const today = new Date().toISOString().split("T")[0];
  const dates = signals.map((s) => s.pacific_date);

  // Count consecutive days
  let checkDate = new Date(today);
  while (true) {
    const dateStr = checkDate.toISOString().split("T")[0];
    if (dates.includes(dateStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return {
    current_streak: streak,
    signals_today: getSignalsToday(),
    total_tracked: signals.reduce((sum, s) => sum + s.c, 0),
    last_date: dates[0] || null,
  };
}

module.exports = {
  initSignalTracker,
  recordSignalFiled,
  updateSignalStatus,
  getSignalsToday,
  getStreakInfo,
};
