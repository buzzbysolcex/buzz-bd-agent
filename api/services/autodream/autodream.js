// autoDream — Buzz memory consolidation engine
// Inspired by Claude Code services/autoDream/ (Mar 31, 2026 leak)
// 4-phase cycle: scan → identify → consolidate → optimize
// Load-aware: skips VACUUM when CPU > 70%
// Reboot-safe: dreamRanToday() prevents double nightly runs
// Feature-gated: feature('AUTODREAM')

const os = require('os');
const { feature } = require('../../lib/feature-flags');
const { emit } = require('../events/event-bus');
const { getDB } = require('../../db');
function db() { return getDB(); }

// ── PHASE 1: SCAN ────────────────────────────────────────────
function scanMemoryState() {
  const tables = [
    'tokens', 'token_scores', 'aria_tokens',
    'agent_mailbox', 'buzz_tasks', 'dynamic_crons',
    'event_subscriptions', 'event_log', 'observation_log',
    'simulation_results'
  ];

  const state = {};
  for (const t of tables) {
    try {
      const row = db().prepare(`SELECT COUNT(*) as c FROM ${t}`).get();
      state[t] = row.c;
    } catch (e) {
      state[t] = -1;
    }
  }

  try {
    const pageCount = db().prepare('PRAGMA page_count').get();
    const pageSize = db().prepare('PRAGMA page_size').get();
    state._db_size_kb = Math.round((pageCount.page_count * pageSize.page_size) / 1024);
  } catch (e) {
    state._db_size_kb = -1;
  }

  return state;
}

// ── PHASE 2: IDENTIFY STALE DATA ────────────────────────────
function identifyStaleData() {
  const stale = {};

  try { stale.dead_tokens = db().prepare(`
    SELECT COUNT(*) as c FROM tokens WHERE score < 30 AND updated_at < datetime('now', '-14 days')
  `).get()?.c || 0; } catch(e) { stale.dead_tokens = 0; }

  try { stale.expired_messages = db().prepare(`
    SELECT COUNT(*) as c FROM agent_mailbox WHERE acked_at IS NULL AND expires_at < datetime('now')
  `).get()?.c || 0; } catch(e) { stale.expired_messages = 0; }

  try { stale.old_tasks = db().prepare(`
    SELECT COUNT(*) as c FROM buzz_tasks WHERE status IN ('FAILED','CANCELLED') AND created_at < datetime('now', '-48 hours')
  `).get()?.c || 0; } catch(e) { stale.old_tasks = 0; }

  try { stale.old_observations = db().prepare(`
    SELECT COUNT(*) as c FROM observation_log WHERE created_at < datetime('now', '-7 days')
  `).get()?.c || 0; } catch(e) { stale.old_observations = 0; }

  try { stale.dead_crons = db().prepare(`
    SELECT COUNT(*) as c FROM dynamic_crons WHERE active = 0
  `).get()?.c || 0; } catch(e) { stale.dead_crons = 0; }

  try { stale.old_events = db().prepare(`
    SELECT COUNT(*) as c FROM event_log WHERE created_at < datetime('now', '-30 days')
  `).get()?.c || 0; } catch(e) { stale.old_events = 0; }

  try { stale.duplicate_aria = db().prepare(`
    SELECT COUNT(*) - COUNT(DISTINCT address) as c FROM aria_tokens
  `).get()?.c || 0; } catch(e) { stale.duplicate_aria = 0; }

  return stale;
}

// ── PHASE 3: CONSOLIDATE ─────────────────────────────────────
function consolidateMemory(stale) {
  const actions = [];

  if (stale.dead_tokens > 0) {
    db().prepare(`CREATE TABLE IF NOT EXISTS tokens_archive (
      address TEXT PRIMARY KEY, symbol TEXT, last_score INTEGER,
      archived_at TEXT DEFAULT (datetime('now'))
    )`).run();
    const archived = db().prepare(`
      INSERT OR REPLACE INTO tokens_archive (address, symbol, last_score)
      SELECT address, symbol, score FROM tokens
      WHERE score < 30 AND updated_at < datetime('now', '-14 days')
    `).run();
    db().prepare(`
      DELETE FROM tokens WHERE score < 30 AND updated_at < datetime('now', '-14 days')
    `).run();
    actions.push({ action: 'archive_dead_tokens', count: archived.changes });
  }

  if (stale.expired_messages > 0) {
    const purged = db().prepare(`DELETE FROM agent_mailbox WHERE expires_at < datetime('now')`).run();
    actions.push({ action: 'purge_expired_messages', count: purged.changes });
  }

  if (stale.old_tasks > 0) {
    db().prepare(`CREATE TABLE IF NOT EXISTS tasks_archive (
      id INTEGER, type TEXT, agent TEXT, status TEXT,
      created_at TEXT, archived_at TEXT DEFAULT (datetime('now'))
    )`).run();
    db().prepare(`
      INSERT INTO tasks_archive (id, type, agent, status, created_at)
      SELECT id, name, agent, status, created_at FROM buzz_tasks
      WHERE status IN ('FAILED','CANCELLED') AND created_at < datetime('now', '-48 hours')
    `).run();
    const cleaned = db().prepare(`
      DELETE FROM buzz_tasks WHERE status IN ('FAILED','CANCELLED') AND created_at < datetime('now', '-48 hours')
    `).run();
    actions.push({ action: 'archive_old_tasks', count: cleaned.changes });
  }

  if (stale.old_observations > 100) {
    db().prepare(`CREATE TABLE IF NOT EXISTS observation_daily_summary (
      date TEXT PRIMARY KEY, total_ticks INTEGER, act_count INTEGER, sleep_count INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    )`).run();
    db().prepare(`
      INSERT OR REPLACE INTO observation_daily_summary (date, total_ticks, act_count, sleep_count)
      SELECT DATE(created_at), COUNT(*),
        SUM(CASE WHEN decision='ACT' THEN 1 ELSE 0 END),
        SUM(CASE WHEN decision='SLEEP' THEN 1 ELSE 0 END)
      FROM observation_log WHERE created_at < datetime('now', '-7 days')
      GROUP BY DATE(created_at)
    `).run();
    const compressed = db().prepare(`DELETE FROM observation_log WHERE created_at < datetime('now', '-7 days')`).run();
    actions.push({ action: 'compress_observations', count: compressed.changes });
  }

  if (stale.duplicate_aria > 0) {
    const deduped = db().prepare(`
      DELETE FROM aria_tokens WHERE rowid NOT IN (SELECT MIN(rowid) FROM aria_tokens GROUP BY address)
    `).run();
    actions.push({ action: 'deduplicate_aria', count: deduped.changes });
  }

  if (stale.old_events > 0) {
    const purged = db().prepare(`DELETE FROM event_log WHERE created_at < datetime('now', '-30 days')`).run();
    actions.push({ action: 'purge_old_events', count: purged.changes });
  }

  if (stale.dead_crons > 0) {
    const cleaned = db().prepare(`DELETE FROM dynamic_crons WHERE active = 0`).run();
    actions.push({ action: 'clean_dead_crons', count: cleaned.changes });
  }

  return { actions, total_cleaned: actions.reduce((sum, a) => sum + a.count, 0) };
}

// ── PHASE 5: REVENUE CONSOLIDATION ──────────────────────────
function consolidateRevenue() {
  const today = new Date().toISOString().split('T')[0];

  // Create table if needed
  db().prepare(`CREATE TABLE IF NOT EXISTS revenue_daily (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    aibtc_sats INTEGER DEFAULT 0,
    bankr_usdc REAL DEFAULT 0,
    shield_scans INTEGER DEFAULT 0,
    total_signals INTEGER DEFAULT 0,
    brief_inclusions INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )`).run();

  // Count today's signals (from observation_log or estimate from PULSE)
  let signalsToday = 0;
  try {
    const row = db().prepare(`
      SELECT COUNT(*) as c FROM observation_log
      WHERE action = 'streak-protection' AND DATE(created_at) = ?
    `).get(today);
    signalsToday = row?.c || 0;
  } catch (e) { /* table may not have data */ }

  // Count shield scans if Shield is active
  let shieldScans = 0;
  try {
    const row = db().prepare(`
      SELECT COUNT(*) as c FROM shield_scans WHERE DATE(created_at) = ?
    `).get(today);
    shieldScans = row?.c || 0;
  } catch (e) { /* shield tables may not exist */ }

  // Upsert daily revenue record
  db().prepare(`
    INSERT INTO revenue_daily (date, total_signals, shield_scans)
    VALUES (?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET
      total_signals = excluded.total_signals,
      shield_scans = excluded.shield_scans
  `).run(today, signalsToday, shieldScans);

  return { date: today, signals: signalsToday, shield_scans: shieldScans };
}

// ── PHASE 4: OPTIMIZE (load-aware) ──────────────────────────
function optimizeIndexes() {
  const loadPct = Math.round((os.loadavg()[0] / os.cpus().length) * 100);

  if (loadPct > 70) {
    console.log(`[AUTODREAM] Skipping VACUUM — CPU load ${loadPct}% (MiroFish sim likely active)`);
    return { skipped: true, reason: `CPU load ${loadPct}%`, db_size_kb: null };
  }

  db().prepare('VACUUM').run();
  db().prepare('ANALYZE').run();

  const pageCount = db().prepare('PRAGMA page_count').get();
  const pageSize = db().prepare('PRAGMA page_size').get();
  return { skipped: false, db_size_kb: Math.round((pageCount.page_count * pageSize.page_size) / 1024) };
}

// ── REBOOT SAFETY: check if dream already ran today ─────────
function dreamRanToday() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const row = db().prepare(`
      SELECT COUNT(*) as c FROM dream_log WHERE DATE(timestamp) = ? AND trigger = 'nightly'
    `).get(today);
    return row && row.c > 0;
  } catch (e) {
    return false;
  }
}

// ── DREAM CYCLE (Main entry) ─────────────────────────────────
function runDreamCycle(trigger = 'scheduled') {
  if (!feature('AUTODREAM')) return { skipped: true, reason: 'AUTODREAM flag is false' };

  const dreamStart = Date.now();
  const dreamId = `dream_${dreamStart}`;

  console.log(`[AUTODREAM] Cycle started (trigger: ${trigger})`);

  const memoryState = scanMemoryState();
  const staleData = identifyStaleData();
  const consolidation = consolidateMemory(staleData);
  const revenue = consolidateRevenue();
  const optimization = optimizeIndexes();

  const duration_ms = Date.now() - dreamStart;

  // Log to dream_log table
  db().prepare(`CREATE TABLE IF NOT EXISTS dream_log (
    id TEXT PRIMARY KEY, timestamp TEXT NOT NULL, trigger TEXT,
    duration_ms INTEGER, total_cleaned INTEGER, db_size_kb INTEGER,
    full_report TEXT, created_at TEXT DEFAULT (datetime('now'))
  )`).run();

  db().prepare(`
    INSERT INTO dream_log (id, timestamp, trigger, duration_ms, total_cleaned, db_size_kb, full_report)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    dreamId, new Date().toISOString(), trigger, duration_ms,
    consolidation.total_cleaned, optimization.db_size_kb,
    JSON.stringify({ memoryState, staleData, consolidation, revenue, optimization })
  );

  emit('autodream', 'autodream.complete', {
    dream_id: dreamId, duration_ms, total_cleaned: consolidation.total_cleaned
  });

  console.log(`[AUTODREAM] Complete: cleaned ${consolidation.total_cleaned} records in ${duration_ms}ms`);

  return { dream_id: dreamId, trigger, duration_ms, memoryState, staleData, consolidation, optimization };
}

module.exports = { runDreamCycle, scanMemoryState, identifyStaleData, dreamRanToday };
