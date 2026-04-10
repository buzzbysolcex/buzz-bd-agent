// autoDream — Buzz memory consolidation engine
// Inspired by Claude Code services/autoDream/ (Mar 31, 2026 leak)
// 4-phase cycle: scan → identify → consolidate → optimize
// Load-aware: skips VACUUM when CPU > 70%
// Reboot-safe: dreamRanToday() prevents double nightly runs
// Feature-gated: feature('AUTODREAM')

const os = require("os");
const fs = require("fs");
const path = require("path");
const { feature } = require("../../lib/feature-flags");
const { emit } = require("../events/event-bus");
const { getDB } = require("../../db");
const mailbox = require("../mailbox/mailbox");
function db() {
  return getDB();
}

// ── PHASE 1: SCAN ────────────────────────────────────────────
function scanMemoryState() {
  const tables = [
    "tokens",
    "token_scores",
    "aria_tokens",
    "agent_mailbox",
    "buzz_tasks",
    "dynamic_crons",
    "event_subscriptions",
    "event_log",
    "observation_log",
    "simulation_results",
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
    const pageCount = db().prepare("PRAGMA page_count").get();
    const pageSize = db().prepare("PRAGMA page_size").get();
    state._db_size_kb = Math.round(
      (pageCount.page_count * pageSize.page_size) / 1024,
    );
  } catch (e) {
    state._db_size_kb = -1;
  }

  return state;
}

// ── PHASE 2: IDENTIFY STALE DATA ────────────────────────────
function identifyStaleData() {
  const stale = {};

  try {
    stale.dead_tokens =
      db()
        .prepare(
          `
    SELECT COUNT(*) as c FROM tokens WHERE score < 30 AND updated_at < datetime('now', '-14 days')
  `,
        )
        .get()?.c || 0;
  } catch (e) {
    stale.dead_tokens = 0;
  }

  try {
    stale.expired_messages =
      db()
        .prepare(
          `
    SELECT COUNT(*) as c FROM agent_mailbox WHERE acked_at IS NULL AND expires_at < datetime('now')
  `,
        )
        .get()?.c || 0;
  } catch (e) {
    stale.expired_messages = 0;
  }

  try {
    stale.old_tasks =
      db()
        .prepare(
          `
    SELECT COUNT(*) as c FROM buzz_tasks WHERE status IN ('FAILED','CANCELLED') AND created_at < datetime('now', '-48 hours')
  `,
        )
        .get()?.c || 0;
  } catch (e) {
    stale.old_tasks = 0;
  }

  try {
    stale.old_observations =
      db()
        .prepare(
          `
    SELECT COUNT(*) as c FROM observation_log WHERE created_at < datetime('now', '-7 days')
  `,
        )
        .get()?.c || 0;
  } catch (e) {
    stale.old_observations = 0;
  }

  try {
    stale.dead_crons =
      db()
        .prepare(
          `
    SELECT COUNT(*) as c FROM dynamic_crons WHERE active = 0
  `,
        )
        .get()?.c || 0;
  } catch (e) {
    stale.dead_crons = 0;
  }

  try {
    stale.old_events =
      db()
        .prepare(
          `
    SELECT COUNT(*) as c FROM event_log WHERE created_at < datetime('now', '-30 days')
  `,
        )
        .get()?.c || 0;
  } catch (e) {
    stale.old_events = 0;
  }

  try {
    stale.duplicate_aria =
      db()
        .prepare(
          `
    SELECT COUNT(*) - COUNT(DISTINCT address) as c FROM aria_tokens
  `,
        )
        .get()?.c || 0;
  } catch (e) {
    stale.duplicate_aria = 0;
  }

  return stale;
}

// ── PHASE 3: CONSOLIDATE ─────────────────────────────────────
function consolidateMemory(stale) {
  const actions = [];

  if (stale.dead_tokens > 0) {
    db()
      .prepare(
        `CREATE TABLE IF NOT EXISTS tokens_archive (
      address TEXT PRIMARY KEY, symbol TEXT, last_score INTEGER,
      archived_at TEXT DEFAULT (datetime('now'))
    )`,
      )
      .run();
    const archived = db()
      .prepare(
        `
      INSERT OR REPLACE INTO tokens_archive (address, symbol, last_score)
      SELECT address, symbol, score FROM tokens
      WHERE score < 30 AND updated_at < datetime('now', '-14 days')
    `,
      )
      .run();
    db()
      .prepare(
        `
      DELETE FROM tokens WHERE score < 30 AND updated_at < datetime('now', '-14 days')
    `,
      )
      .run();
    actions.push({ action: "archive_dead_tokens", count: archived.changes });
  }

  if (stale.expired_messages > 0) {
    const purged = db()
      .prepare(`DELETE FROM agent_mailbox WHERE expires_at < datetime('now')`)
      .run();
    actions.push({ action: "purge_expired_messages", count: purged.changes });
  }

  if (stale.old_tasks > 0) {
    db()
      .prepare(
        `CREATE TABLE IF NOT EXISTS tasks_archive (
      id INTEGER, type TEXT, agent TEXT, status TEXT,
      created_at TEXT, archived_at TEXT DEFAULT (datetime('now'))
    )`,
      )
      .run();
    db()
      .prepare(
        `
      INSERT INTO tasks_archive (id, type, agent, status, created_at)
      SELECT id, name, agent, status, created_at FROM buzz_tasks
      WHERE status IN ('FAILED','CANCELLED') AND created_at < datetime('now', '-48 hours')
    `,
      )
      .run();
    const cleaned = db()
      .prepare(
        `
      DELETE FROM buzz_tasks WHERE status IN ('FAILED','CANCELLED') AND created_at < datetime('now', '-48 hours')
    `,
      )
      .run();
    actions.push({ action: "archive_old_tasks", count: cleaned.changes });
  }

  if (stale.old_observations > 100) {
    db()
      .prepare(
        `CREATE TABLE IF NOT EXISTS observation_daily_summary (
      date TEXT PRIMARY KEY, total_ticks INTEGER, act_count INTEGER, sleep_count INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
      )
      .run();
    db()
      .prepare(
        `
      INSERT OR REPLACE INTO observation_daily_summary (date, total_ticks, act_count, sleep_count)
      SELECT DATE(created_at), COUNT(*),
        SUM(CASE WHEN decision='ACT' THEN 1 ELSE 0 END),
        SUM(CASE WHEN decision='SLEEP' THEN 1 ELSE 0 END)
      FROM observation_log WHERE created_at < datetime('now', '-7 days')
      GROUP BY DATE(created_at)
    `,
      )
      .run();
    const compressed = db()
      .prepare(
        `DELETE FROM observation_log WHERE created_at < datetime('now', '-7 days')`,
      )
      .run();
    actions.push({
      action: "compress_observations",
      count: compressed.changes,
    });
  }

  if (stale.duplicate_aria > 0) {
    const deduped = db()
      .prepare(
        `
      DELETE FROM aria_tokens WHERE rowid NOT IN (SELECT MIN(rowid) FROM aria_tokens GROUP BY address)
    `,
      )
      .run();
    actions.push({ action: "deduplicate_aria", count: deduped.changes });
  }

  if (stale.old_events > 0) {
    const purged = db()
      .prepare(
        `DELETE FROM event_log WHERE created_at < datetime('now', '-30 days')`,
      )
      .run();
    actions.push({ action: "purge_old_events", count: purged.changes });
  }

  if (stale.dead_crons > 0) {
    const cleaned = db()
      .prepare(`DELETE FROM dynamic_crons WHERE active = 0`)
      .run();
    actions.push({ action: "clean_dead_crons", count: cleaned.changes });
  }

  return {
    actions,
    total_cleaned: actions.reduce((sum, a) => sum + a.count, 0),
  };
}

// ── PHASE 5: REVENUE CONSOLIDATION ──────────────────────────
function consolidateRevenue() {
  const today = new Date().toISOString().split("T")[0];

  // Create table if needed
  db()
    .prepare(
      `CREATE TABLE IF NOT EXISTS revenue_daily (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    aibtc_sats INTEGER DEFAULT 0,
    bankr_usdc REAL DEFAULT 0,
    shield_scans INTEGER DEFAULT 0,
    total_signals INTEGER DEFAULT 0,
    brief_inclusions INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
    )
    .run();

  // Count today's signals (from observation_log or estimate from PULSE)
  let signalsToday = 0;
  try {
    const row = db()
      .prepare(
        `
      SELECT COUNT(*) as c FROM observation_log
      WHERE action = 'streak-protection' AND DATE(created_at) = ?
    `,
      )
      .get(today);
    signalsToday = row?.c || 0;
  } catch (e) {
    /* table may not have data */
  }

  // Count shield scans if Shield is active
  let shieldScans = 0;
  try {
    const row = db()
      .prepare(
        `
      SELECT COUNT(*) as c FROM shield_scans WHERE DATE(created_at) = ?
    `,
      )
      .get(today);
    shieldScans = row?.c || 0;
  } catch (e) {
    /* shield tables may not exist */
  }

  // Upsert daily revenue record
  db()
    .prepare(
      `
    INSERT INTO revenue_daily (date, total_signals, shield_scans)
    VALUES (?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET
      total_signals = excluded.total_signals,
      shield_scans = excluded.shield_scans
  `,
    )
    .run(today, signalsToday, shieldScans);

  return { date: today, signals: signalsToday, shield_scans: shieldScans };
}

// ── PHASE 6: SIGNAL ANGLE PRE-GENERATOR (GAP-1) ─────────────
// Generates 4 AIBTC signal angle drafts for morning filing
// across the 6 canonical beats, with beat rotation to avoid
// filing the same beat twice in a row.
// Gated by AUTODREAM_SIGNAL_ANGLES (default true).
// AIBTC canonical beats — agent-skills + agent-economy lead per D3
// strategic pivot (Apr 8, 2026). The previous list ("markets",
// "narrative", "governance") was wrong — those are not AIBTC beats.
const CANONICAL_BEATS = [
  "agent-skills", // PRIMARY editor target
  "agent-economy", // PRIMARY editor target
  "agent-trading",
  "infrastructure",
  "security",
  "deal-flow",
];

function generateSignalAngles() {
  if (!feature("AUTODREAM_SIGNAL_ANGLES")) {
    return { skipped: true, reason: "AUTODREAM_SIGNAL_ANGLES=false" };
  }

  try {
    // Ensure tracking table exists
    db()
      .prepare(
        `CREATE TABLE IF NOT EXISTS signal_angles_drafted (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      draft_date TEXT NOT NULL,
      beat TEXT NOT NULL,
      headline TEXT NOT NULL,
      hook TEXT,
      data_points TEXT,
      status TEXT DEFAULT 'draft',
      created_at TEXT DEFAULT (datetime('now'))
    )`,
      )
      .run();
    db()
      .prepare(
        `CREATE INDEX IF NOT EXISTS idx_sad_date ON signal_angles_drafted(draft_date)`,
      )
      .run();

    const today = new Date().toISOString().split("T")[0];

    // Skip if already drafted today
    const existing = db()
      .prepare(
        `SELECT COUNT(*) as c FROM signal_angles_drafted WHERE draft_date = ?`,
      )
      .get(today);
    if (existing && existing.c >= 4) {
      return {
        skipped: true,
        reason: "already drafted today",
        existing: existing.c,
      };
    }

    // Pull fresh pipeline data (graceful on empty tables)
    const pipelineData = {
      fresh_scores: [],
      score_changes: [],
      flagged: [],
      aria_new: 0,
    };

    try {
      pipelineData.fresh_scores = db()
        .prepare(
          `
        SELECT address, symbol, chain, score FROM pipeline_tokens
        WHERE score IS NOT NULL AND score >= 60
          AND updated_at > datetime('now','-24 hours')
        ORDER BY score DESC LIMIT 5
      `,
        )
        .all();
    } catch (e) {
      /* table shape may differ */
    }

    try {
      pipelineData.aria_new =
        db()
          .prepare(
            `
        SELECT COUNT(*) as c FROM aria_tokens WHERE created_at > datetime('now','-24 hours')
      `,
          )
          .get()?.c || 0;
    } catch (e) {
      /* skip */
    }

    try {
      pipelineData.flagged = db()
        .prepare(
          `
        SELECT target, verdict FROM shield_scans
        WHERE verdict IN ('DANGER','WARNING') AND created_at > datetime('now','-24 hours')
        LIMIT 5
      `,
        )
        .all();
    } catch (e) {
      /* skip */
    }

    // Beat rotation: find yesterday's last beat and avoid repeating it first
    let lastBeatUsed = null;
    try {
      const row = db()
        .prepare(
          `
        SELECT beat FROM signal_angles_drafted
        WHERE draft_date < ? ORDER BY draft_date DESC, id DESC LIMIT 1
      `,
        )
        .get(today);
      lastBeatUsed = row?.beat || null;
    } catch (e) {
      /* first run */
    }

    const rotatedBeats = lastBeatUsed
      ? [...CANONICAL_BEATS.filter((b) => b !== lastBeatUsed), lastBeatUsed]
      : CANONICAL_BEATS;

    // Draft 4 angles — one per top-4 rotated beats
    const drafts = [];
    const targetBeats = rotatedBeats.slice(0, 4);

    for (const beat of targetBeats) {
      let headline, hook;
      switch (beat) {
        case "agent-skills":
          headline = `Agent skills velocity — net new merged skills and test coverage delta`;
          hook = `Which agent-skill repos shipped in the last 24h, and how the rubric judged them.`;
          break;
        case "agent-economy":
          headline = `Editor seat economics — sats earned vs. operating cost over the last cycle`;
          hook = `Break-even math at the current sBTC/USD price and operating-cost thresholds.`;
          break;
        case "agent-trading":
          headline = `Agent trading desk — observed flows and on-chain footprints`;
          hook = `Trades and positions attributable to agents, not humans, in the last window.`;
          break;
        case "infrastructure":
          headline = `PULSE tick baseline + autoDream consolidation report`;
          hook = `Operational transparency — how many records moved through the pipeline in the last cycle.`;
          break;
        case "security":
          headline =
            pipelineData.flagged.length > 0
              ? `${pipelineData.flagged.length} new DANGER/WARNING verdicts in 24h`
              : `Shield pattern sweep — no new threats in 24h`;
          hook =
            pipelineData.flagged.length > 0
              ? `Targets: ${pipelineData.flagged
                  .slice(0, 2)
                  .map((f) => f.target)
                  .join(", ")}`
              : `Clean window. Document the baseline for future comparison.`;
          break;
        case "deal-flow":
          headline =
            pipelineData.fresh_scores.length > 0
              ? `${pipelineData.fresh_scores.length} tokens scored ≥60 in 24h · top: ${pipelineData.fresh_scores[0]?.symbol || "n/a"}`
              : `Pipeline quiet — 0 high-signal tokens in 24h`;
          hook =
            pipelineData.fresh_scores.length > 0
              ? `Lead: ${pipelineData.fresh_scores[0]?.symbol} @ ${pipelineData.fresh_scores[0]?.score}`
              : `Quiet markets are a signal too — document what's missing.`;
          break;
        default:
          headline = `${beat} — daily observation draft`;
          hook = `Auto-generated placeholder. Claude Code rewrites during the day.`;
      }

      // Karpathy Wiki research hook — pulls compiled synthesis/concept pages
      // relevant to this beat. Adds context into data_points so direct filer
      // can surface it to Claude Code when hand-writing bodies in the morning.
      let wiki_research = null;
      try {
        const { hookSignalResearch } = require("../wiki/wiki-manager");
        wiki_research = hookSignalResearch(beat);
      } catch {}

      drafts.push({
        beat,
        headline,
        hook,
        data_points: JSON.stringify({
          fresh_score_count: pipelineData.fresh_scores.length,
          aria_new_24h: pipelineData.aria_new,
          flagged_count: pipelineData.flagged.length,
          wiki_research_chars: wiki_research ? wiki_research.length : 0,
          wiki_research_preview: wiki_research
            ? wiki_research.slice(0, 400)
            : null,
        }),
      });
    }

    // Persist drafts
    const insert = db().prepare(`
      INSERT INTO signal_angles_drafted (draft_date, beat, headline, hook, data_points)
      VALUES (?, ?, ?, ?, ?)
    `);
    for (const d of drafts) {
      insert.run(today, d.beat, d.headline, d.hook, d.data_points);
    }

    // Mailbox to war-room-reporter for morning review
    mailbox.send("autodream", "war-room-reporter", "SIGNAL_ANGLES", {
      type: "AUTODREAM_SIGNAL_ANGLES",
      date: today,
      count: drafts.length,
      drafts: drafts.map((d) => ({
        beat: d.beat,
        headline: d.headline,
        hook: d.hook,
      })),
      pipeline_snapshot: {
        fresh_scores: pipelineData.fresh_scores.length,
        aria_new_24h: pipelineData.aria_new,
        flagged_24h: pipelineData.flagged.length,
      },
    });

    // ── D1 (Apr 8, 2026): write draft JSON files for direct filer ──
    // Each draft becomes a self-contained payload that
    // scripts/signal-file-direct.js can read, BIP-322 sign, and POST
    // to https://aibtc.news/api/signals without depending on Claude
    // Code being awake.
    let diskWritten = 0;
    let diskError = null;
    try {
      const draftDir = "/data/buzz-api/signal-drafts";
      if (!fs.existsSync(draftDir)) {
        fs.mkdirSync(draftDir, { recursive: true });
      }
      const generatedAt = new Date().toISOString();
      drafts.forEach((d, idx) => {
        const filename = `${today}-${d.beat}-${idx + 1}.json`;
        const fpath = path.join(draftDir, filename);
        const payload = {
          beat_slug: d.beat,
          headline: d.headline,
          body: d.hook || "",
          sources: [],
          tags: [d.beat],
          disclosure:
            "Draft generated by autoDream Phase 6 (Claude Opus 4.6 via Pro Max) at 02:00 UTC. Direct filing via bip322-js.",
          generated_at: generatedAt,
          filed: false,
          draft_index: idx + 1,
          data_points: JSON.parse(d.data_points || "{}"),
        };
        fs.writeFileSync(fpath, JSON.stringify(payload, null, 2));
        diskWritten++;
      });
    } catch (e) {
      diskError = e.message;
    }

    return {
      drafted: drafts.length,
      beats: targetBeats,
      last_beat_avoided: lastBeatUsed,
      disk_written: diskWritten,
      disk_error: diskError,
    };
  } catch (err) {
    return { error: err.message };
  }
}

// ── PHASE 7: SHIELD NIGHTLY ANALYSIS ────────────────────────
function shieldNightlyAnalysis() {
  if (!feature("AUTODREAM_SHIELD"))
    return { skipped: true, reason: "AUTODREAM_SHIELD=false" };

  const result = {
    patterns_reviewed: 0,
    candidates_found: 0,
    scans_compressed: 0,
  };

  try {
    // Phase 7a: Pattern effectiveness
    const patterns = db()
      .prepare(
        "SELECT pattern_id, name, match_count FROM drain_patterns WHERE active = 1",
      )
      .all();
    result.patterns_reviewed = patterns.length;

    const topPatterns = patterns
      .sort((a, b) => b.match_count - a.match_count)
      .slice(0, 5);
    const neverTriggered = patterns.filter((p) => p.match_count === 0);

    // Phase 7b: False positive review (check for overridden verdicts)
    let overrides = 0;
    try {
      const row = db()
        .prepare(
          `
        SELECT COUNT(*) as c FROM shield_scans
        WHERE verdict = 'DANGER' AND created_at > datetime('now', '-24 hours')
      `,
        )
        .get();
      overrides = row?.c || 0;
    } catch (e) {
      /* shield_scans may not exist yet */
    }

    // Phase 7c: Check for repeated CAUTION verdicts that may be new patterns
    try {
      const candidates = db()
        .prepare(
          `
        SELECT target, COUNT(*) as cnt FROM shield_scans
        WHERE verdict IN ('CAUTION', 'WARNING') AND created_at > datetime('now', '-7 days')
        GROUP BY target HAVING cnt >= 3
      `,
        )
        .all();
      result.candidates_found = candidates.length;
    } catch (e) {
      /* skip */
    }

    // Phase 7e: Stats rollup — compress old scans
    try {
      const oldScans = db()
        .prepare(
          `
        SELECT COUNT(*) as c FROM shield_scans WHERE created_at < datetime('now', '-7 days')
      `,
        )
        .get();
      if (oldScans && oldScans.c > 100) {
        db()
          .prepare(
            `DELETE FROM shield_scans WHERE created_at < datetime('now', '-7 days')`,
          )
          .run();
        result.scans_compressed = oldScans.c;
      }
    } catch (e) {
      /* skip */
    }

    // Log to observation_log
    db()
      .prepare(
        `
      INSERT INTO observation_log (tick, timestamp, decision, reason, action, result)
      VALUES (0, datetime('now'), 'ACT', 'autoDream Shield nightly', 'shield-nightly', ?)
    `,
      )
      .run(
        JSON.stringify({
          patterns_reviewed: result.patterns_reviewed,
          top_patterns: topPatterns.map((p) => p.pattern_id),
          never_triggered: neverTriggered.length,
          dangers_24h: overrides,
          candidates: result.candidates_found,
          scans_compressed: result.scans_compressed,
        }),
      );
  } catch (e) {
    result.error = e.message;
  }

  return result;
}

// ── PHASE 4: OPTIMIZE (load-aware) ──────────────────────────
function optimizeIndexes() {
  const loadPct = Math.round((os.loadavg()[0] / os.cpus().length) * 100);

  if (loadPct > 70) {
    console.log(
      `[AUTODREAM] Skipping VACUUM — CPU load ${loadPct}% (MiroFish sim likely active)`,
    );
    return { skipped: true, reason: `CPU load ${loadPct}%`, db_size_kb: null };
  }

  db().prepare("VACUUM").run();
  db().prepare("ANALYZE").run();

  const pageCount = db().prepare("PRAGMA page_count").get();
  const pageSize = db().prepare("PRAGMA page_size").get();
  return {
    skipped: false,
    db_size_kb: Math.round((pageCount.page_count * pageSize.page_size) / 1024),
  };
}

// ── WAR ROOM DASHBOARD REPORT ───────────────────────────────
// Send nightly dashboard summary to war-room-reporter mailbox.
// Gated by AUTODREAM_WARROOM_DASHBOARD flag (default true).
function reportToWarRoom({
  dreamId,
  durationMs,
  memoryState,
  staleData,
  consolidation,
  revenue,
  signalAngles,
  shieldNightly,
  intelSync,
  hillClimbResult,
  optimization,
}) {
  if (!feature("AUTODREAM_WARROOM_DASHBOARD")) {
    return { skipped: true, reason: "AUTODREAM_WARROOM_DASHBOARD=false" };
  }
  try {
    const lines = [];
    lines.push(
      `autoDream nightly report — ${new Date().toISOString().split("T")[0]}`,
    );
    lines.push(`cycle ${dreamId} | duration ${durationMs}ms`);
    lines.push("");
    lines.push("📊 MEMORY STATE");
    lines.push(
      `  db ${memoryState._db_size_kb}kb · tokens ${memoryState.tokens ?? 0} · observations ${memoryState.observation_log ?? 0}`,
    );
    lines.push(
      `  mailbox ${memoryState.agent_mailbox ?? 0} · tasks ${memoryState.buzz_tasks ?? 0} · crons ${memoryState.dynamic_crons ?? 0}`,
    );
    lines.push("");
    lines.push("🧹 CONSOLIDATION");
    lines.push(
      `  ${consolidation.total_cleaned} records cleaned across ${consolidation.actions.length} actions`,
    );
    for (const a of consolidation.actions)
      lines.push(`  · ${a.action}: ${a.count}`);
    lines.push("");
    lines.push("💰 REVENUE (today)");
    lines.push(
      `  signals ${revenue.signals} · shield scans ${revenue.shield_scans}`,
    );
    lines.push("");
    if (signalAngles && !signalAngles.skipped && !signalAngles.error) {
      lines.push("📝 SIGNAL ANGLES (drafts for morning)");
      lines.push(
        `  ${signalAngles.drafted} drafts across beats: ${(signalAngles.beats || []).join(", ")}`,
      );
      lines.push("");
    }
    if (shieldNightly && !shieldNightly.skipped) {
      lines.push("🛡️ SHIELD NIGHTLY");
      lines.push(
        `  patterns ${shieldNightly.patterns_reviewed} · candidates ${shieldNightly.candidates_found} · compressed ${shieldNightly.scans_compressed}`,
      );
      lines.push("");
    }
    if (intelSync && !intelSync.skipped && !intelSync.error) {
      lines.push("📡 INTEL SYNC");
      lines.push(`  ${JSON.stringify(intelSync)}`);
      lines.push("");
    }
    if (hillClimbResult && !hillClimbResult.skipped && !hillClimbResult.error) {
      lines.push("⛰️ HILL-CLIMBING");
      lines.push(`  ${JSON.stringify(hillClimbResult)}`);
      lines.push("");
    }
    lines.push("⚡ OPTIMIZE");
    lines.push(
      optimization.skipped
        ? `  skipped: ${optimization.reason}`
        : `  VACUUM+ANALYZE ok · db ${optimization.db_size_kb}kb`,
    );

    const summary = lines.join("\n");

    mailbox.send("autodream", "war-room-reporter", "DASHBOARD", {
      type: "AUTODREAM_DASHBOARD",
      dream_id: dreamId,
      date: new Date().toISOString().split("T")[0],
      duration_ms: durationMs,
      summary,
      stats: {
        total_cleaned: consolidation.total_cleaned,
        signals_today: revenue.signals,
        shield_scans_today: revenue.shield_scans,
        db_size_kb: memoryState._db_size_kb,
      },
    });

    return { sent: true, summary_lines: lines.length };
  } catch (err) {
    return { sent: false, error: err.message };
  }
}

// ── REBOOT SAFETY: check if dream already ran today ─────────
function dreamRanToday() {
  try {
    const today = new Date().toISOString().split("T")[0];
    const row = db()
      .prepare(
        `
      SELECT COUNT(*) as c FROM dream_log WHERE DATE(timestamp) = ? AND trigger = 'nightly'
    `,
      )
      .get(today);
    return row && row.c > 0;
  } catch (e) {
    return false;
  }
}

// ── DREAM CYCLE (Main entry) ─────────────────────────────────
async function runDreamCycle(trigger = "scheduled") {
  if (!feature("AUTODREAM"))
    return { skipped: true, reason: "AUTODREAM flag is false" };

  const dreamStart = Date.now();
  const dreamId = `dream_${dreamStart}`;

  console.log(`[AUTODREAM] Cycle started (trigger: ${trigger})`);

  const memoryState = scanMemoryState();
  const staleData = identifyStaleData();
  const consolidation = consolidateMemory(staleData);
  const revenue = consolidateRevenue();
  const signalAngles = generateSignalAngles();
  const shieldNightly = shieldNightlyAnalysis();

  // Phase 8: Intel sync (Telegram channel intel)
  let intelSync = { skipped: true };
  if (feature("TELEGRAM_CHANNEL_INTEL")) {
    try {
      const { getBlacklistStats } = require("../intel/telegram-channel");
      intelSync = getBlacklistStats();
    } catch (e) {
      intelSync = { error: e.message };
    }
  }

  // Phase 9: Hill-climbing optimization
  let hillClimbResult = { skipped: true };
  if (feature("AUTODREAM_HILLCLIMB")) {
    try {
      const { hillClimbLoop } = require("./hill-climber");
      // hillClimbLoop is async — must await or hillClimbResult ends up
      // as a Promise that JSON.stringifies to {} (Apr 9 fix)
      hillClimbResult = await hillClimbLoop(5, 4 * 60 * 60 * 1000);
    } catch (e) {
      hillClimbResult = { error: e.message };
    }
  }

  const optimization = optimizeIndexes();

  // Phase 10: Wiki Lint (Karpathy LLM Wiki) — runs nightly, 30 min max
  let wikiLintResult = { skipped: true };
  if (feature("KARPATHY_WIKI")) {
    try {
      const wiki = require("../wiki/wiki-manager");
      wikiLintResult = wiki.wikiLint();
    } catch (e) {
      wikiLintResult = { error: e.message };
    }
  }

  // Phase 11: Wiki Ingest — runs weekly on Sundays, 60 min max
  // Regenerates INDEX.md and creates entity pages for any HOT token
  // (score >= 70) that doesn't yet have one.
  let wikiIngestResult = { skipped: true };
  if (feature("KARPATHY_WIKI") && new Date().getUTCDay() === 0) {
    try {
      const wiki = require("../wiki/wiki-manager");
      const rows = db()
        .prepare(
          "SELECT address, chain, ticker, name, score FROM pipeline_tokens WHERE score >= 70",
        )
        .all();
      let created = 0;
      for (const t of rows) {
        const slug = wiki.slugify(t.ticker || t.address);
        if (!slug) continue;
        if (wiki.readPage("entities", slug)) continue;
        wiki.createEntityPage({
          ticker: t.ticker,
          slug,
          chain: t.chain,
          score: t.score,
          summary: `${t.ticker || slug} on ${t.chain}. Buzz score ${t.score}.`,
          content: `**Chain**: ${t.chain}\n**Address**: \`${t.address}\`\n**Score**: ${t.score}\n\n_Auto-created by autoDream Phase 11 wiki ingest._`,
          changelog: [
            `${new Date().toISOString().split("T")[0]}: Created by Phase 11 weekly ingest`,
          ],
          tags: ["token", `chain-${t.chain}`],
        });
        created++;
      }
      wiki.generateIndex();
      wiki.appendLog(
        "ingest",
        `Weekly ingest — created ${created} new entity pages`,
        [],
      );
      wikiIngestResult = { created, total_hot: rows.length };
    } catch (e) {
      wikiIngestResult = { error: e.message };
    }
  }

  // Phase 12: BuzzShield v2 — nightly OSV dependency scan
  let osvScanResult = { skipped: true };
  if (feature("BUZZSHIELD_OSV")) {
    try {
      const { scanDependencies } = require("../shield/buzzshield-v2");
      osvScanResult = await scanDependencies();
    } catch (e) {
      osvScanResult = { error: e.message };
    }
  }

  // Phase 13: BuzzShield v2 — SBOM snapshot
  let sbomResult = { skipped: true };
  if (feature("BUZZSHIELD_SBOM")) {
    try {
      const { generateSBOM } = require("../shield/buzzshield-v2");
      sbomResult = generateSBOM();
    } catch (e) {
      sbomResult = { error: e.message };
    }
  }

  // Phase 14: Marketplace health verification (nightly)
  let marketplaceResult = { skipped: true };
  if (feature("AUTODREAM_MARKETPLACE")) {
    try {
      const fs = require("fs");
      const path = require("path");
      const MARKETPLACE_DIR = "/data/marketplace";
      const files = fs.readdirSync(MARKETPLACE_DIR).filter((f) => f.endsWith(".json") && !f.startsWith("health-report"));
      const results = [];
      for (const file of files) {
        const config = JSON.parse(fs.readFileSync(path.join(MARKETPLACE_DIR, file), "utf8"));
        const entry = { marketplace: config.marketplace, feature_flag: config.feature_flag, flag_active: feature(config.feature_flag) };
        if (config.health_check_url) {
          try {
            const ctrl = new AbortController();
            const t = setTimeout(() => ctrl.abort(), 15000);
            const res = await fetch(config.health_check_url, { signal: ctrl.signal });
            clearTimeout(t);
            entry.endpoint_status = res.status === 200 ? "UP" : `DOWN (${res.status})`;
            if (res.status === 404) {
              entry.alert = "REGISTRATION MAY BE DELETED — 404 returned";
            }
          } catch (e) { entry.endpoint_status = `UNREACHABLE: ${e.message}`; }
        }
        results.push(entry);
      }
      // Store nightly report
      const reportPath = path.join(MARKETPLACE_DIR, `health-report-${new Date().toISOString().split("T")[0]}.json`);
      fs.writeFileSync(reportPath, JSON.stringify({ timestamp: new Date().toISOString(), total: files.length, results }, null, 2));
      const upCount = results.filter((r) => r.endpoint_status === "UP").length;
      marketplaceResult = { total: files.length, up: upCount, results };
      console.log(`[AUTODREAM] Phase 14: ${upCount}/${files.length} marketplaces UP`);
    } catch (e) {
      marketplaceResult = { error: e.message };
    }
  }

  const duration_ms = Date.now() - dreamStart;

  // Log to dream_log table
  db()
    .prepare(
      `CREATE TABLE IF NOT EXISTS dream_log (
    id TEXT PRIMARY KEY, timestamp TEXT NOT NULL, trigger TEXT,
    duration_ms INTEGER, total_cleaned INTEGER, db_size_kb INTEGER,
    full_report TEXT, created_at TEXT DEFAULT (datetime('now'))
  )`,
    )
    .run();

  db()
    .prepare(
      `
    INSERT INTO dream_log (id, timestamp, trigger, duration_ms, total_cleaned, db_size_kb, full_report)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `,
    )
    .run(
      dreamId,
      new Date().toISOString(),
      trigger,
      duration_ms,
      consolidation.total_cleaned,
      optimization.db_size_kb,
      JSON.stringify({
        memoryState,
        staleData,
        consolidation,
        revenue,
        signalAngles,
        shieldNightly,
        intelSync,
        hillClimbResult,
        optimization,
        wikiLintResult,
        wikiIngestResult,
        osvScanResult,
        sbomResult,
        marketplaceResult,
      }),
    );

  // War Room dashboard report (GAP-2)
  const warRoomReport = reportToWarRoom({
    dreamId,
    durationMs: duration_ms,
    memoryState,
    staleData,
    consolidation,
    revenue,
    signalAngles,
    shieldNightly,
    intelSync,
    hillClimbResult,
    optimization,
  });

  emit("autodream", "autodream.complete", {
    dream_id: dreamId,
    duration_ms,
    total_cleaned: consolidation.total_cleaned,
  });

  console.log(
    `[AUTODREAM] Complete: cleaned ${consolidation.total_cleaned} records in ${duration_ms}ms · war_room_report=${warRoomReport.sent ? "sent" : "skipped"}`,
  );

  return {
    dream_id: dreamId,
    trigger,
    duration_ms,
    memoryState,
    staleData,
    consolidation,
    optimization,
    warRoomReport,
  };
}

module.exports = {
  runDreamCycle,
  scanMemoryState,
  identifyStaleData,
  dreamRanToday,
  generateSignalAngles,
};
