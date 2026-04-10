// PULSE Engine — Buzz's KAIROS-class tick system
// Heartbeat loop: evaluate context → act or sleep → adaptive interval
// ALL state persisted in SQLite (pulse_state table). Survives reboots.
// Load-aware: auto-throttles during MiroFish 10K sim (CPU > 80%).
// Pattern source: Claude Code KAIROS proactive mode (Mar 31, 2026 leak)
// Feature-gated: feature('PULSE_ENGINE')

const os = require("os");
const { feature } = require("../../lib/feature-flags");
const mailbox = require("../mailbox/mailbox");
const { getReadyTasks } = require("../tasks/task-manager");
const { getDueCrons, recordRun } = require("../cron/dynamic-cron");
const { emit, EVENT_TYPES } = require("../events/event-bus");
const { getDB } = require("../../db");
function db() {
  return getDB();
}

// KAIROS-inspired constants
const TICK_INTERVAL_MS = 60000; // 60s base
const BLOCKING_BUDGET_MS = 15000; // 15s max per proactive action
const IDLE_SLEEP_MULTIPLIER = 2; // Double interval on idle
const MAX_SLEEP_MS = 300000; // 5min max (prompt cache boundary)
const MAX_CONSECUTIVE_IDLE = 10; // autoDream trigger threshold
const HIGH_LOAD_THRESHOLD = 80; // CPU % to trigger throttle

let pulseActive = false;

// ── PERSISTENT STATE (SQLite-backed, NO in-memory variables) ─
function getState(key) {
  const row = db()
    .prepare("SELECT value FROM pulse_state WHERE key = ?")
    .get(key);
  return row ? row.value : null;
}

function setState(key, value) {
  db()
    .prepare(
      `
    INSERT INTO pulse_state (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = datetime('now')
  `,
    )
    .run(key, String(value), String(value));
}

function getTickCount() {
  return parseInt(getState("tick_count") || "0");
}
function getConsecutiveIdle() {
  return parseInt(getState("consecutive_idle") || "0");
}
function getCurrentInterval() {
  return parseInt(getState("current_interval_ms") || String(TICK_INTERVAL_MS));
}

// ── SYSTEM LOAD CHECK ────────────────────────────────────────
function getSystemLoad() {
  const cpus = os.cpus().length;
  const load1m = os.loadavg()[0];
  const loadPct = Math.round((load1m / cpus) * 100);
  return { cpus, load1m, loadPct };
}

// ── CONTEXT GATHERING ────────────────────────────────────────
function gatherContext() {
  const unacked = db()
    .prepare(
      `
    SELECT to_agent, COUNT(*) as cnt FROM agent_mailbox
    WHERE acked_at IS NULL AND expires_at > datetime('now')
    GROUP BY to_agent
  `,
    )
    .all();

  const readyTasks = db()
    .prepare(
      `
    SELECT COUNT(*) as cnt FROM buzz_tasks WHERE status = 'READY'
  `,
    )
    .get();

  const dueCrons = getDueCrons();

  const recentEvents = db()
    .prepare(
      `
    SELECT event_type FROM event_log
    WHERE created_at > datetime('now', '-1 hour')
    ORDER BY created_at DESC LIMIT 10
  `,
    )
    .all();

  // Check if MiroFish sim is active
  let mirofishActive = false;
  try {
    const simStatus = db()
      .prepare(
        `
      SELECT COUNT(*) as c FROM simulation_results
      WHERE created_at > datetime('now', '-1 hour')
    `,
      )
      .get();
    mirofishActive = simStatus && simStatus.c > 0;
  } catch (e) {
    mirofishActive = false;
  }

  const load = getSystemLoad();

  return {
    unacked_total: unacked.reduce((sum, u) => sum + u.cnt, 0),
    unacked_agents: unacked.map((u) => ({ agent: u.to_agent, count: u.cnt })),
    ready_tasks: readyTasks ? readyTasks.cnt : 0,
    due_crons: dueCrons.length,
    due_cron_ids: dueCrons.map((c) => c.id),
    recent_event_types: recentEvents.map((e) => e.event_type),
    hour_utc: new Date().getUTCHours(),
    tick: getTickCount(),
    mirofish_active: mirofishActive,
    system_load_pct: load.loadPct,
  };
}

// ── ACTION DECISION (rule-based, zero LLM burn) ─────────────
function decideAction(ctx) {
  // Priority 0: HIGH LOAD — throttle during MiroFish 10K sim
  if (
    feature("PULSE_LOAD_AWARE") &&
    ctx.system_load_pct > HIGH_LOAD_THRESHOLD
  ) {
    // Only allow critical action: streak protection at 16:00 UTC
    if (ctx.hour_utc === 16) {
      const hasSignalToday = ctx.recent_event_types.includes("signal.approved");
      if (!hasSignalToday) {
        return {
          type: "ACT",
          reason: `HIGH LOAD (${ctx.system_load_pct}%) but streak protection is critical`,
          action: "streak-protection",
        };
      }
    }
    return {
      type: "SLEEP",
      reason: `HIGH LOAD: ${ctx.system_load_pct}% — deferring non-critical actions`,
    };
  }

  // Priority 1: Mailbox backlog
  if (ctx.unacked_total > 50) {
    return {
      type: "ACT",
      reason: `${ctx.unacked_total} unacked messages across ${ctx.unacked_agents.length} agents`,
      action: "mailbox-cleanup",
    };
  }

  // Priority 2: Ready tasks
  if (ctx.ready_tasks > 0) {
    return {
      type: "ACT",
      reason: `${ctx.ready_tasks} task(s) in READY state`,
      action: "process-ready-tasks",
    };
  }

  // Priority 3: Due crons
  if (ctx.due_crons > 0) {
    return {
      type: "ACT",
      reason: `${ctx.due_crons} cron(s) due to fire`,
      action: "fire-due-crons",
      cron_ids: ctx.due_cron_ids,
    };
  }

  // Priority 4: ARIA discovery window (05:00-07:00 UTC)
  if (ctx.hour_utc >= 5 && ctx.hour_utc <= 7) {
    const hasRecentAria = ctx.recent_event_types.includes("aria.discovery");
    if (!hasRecentAria) {
      return {
        type: "ACT",
        reason: "ARIA discovery window (05-07 UTC), no recent scan",
        action: "trigger-aria-discovery",
      };
    }
  }

  // Priority 5: Streak protection (14:00-16:00 UTC graduated alerts)
  if (ctx.hour_utc >= 14 && ctx.hour_utc <= 16) {
    const hasSignalToday =
      ctx.recent_event_types.includes("signal.filed") ||
      ctx.recent_event_types.includes("signal.approved") ||
      ctx.recent_event_types.includes("signal.filed.emergency");
    const alertSent =
      getState("streak_alert_date") === new Date().toISOString().split("T")[0];
    const emergencyFiledToday =
      getState("emergency_file_date") ===
      new Date().toISOString().split("T")[0];

    if (!hasSignalToday) {
      // 14:00 UTC: emergency container-side filing (if STREAK_EMERGENCY_FILER on and not already filed today)
      if (
        ctx.hour_utc >= 14 &&
        feature("STREAK_EMERGENCY_FILER") &&
        !emergencyFiledToday
      ) {
        return {
          type: "ACT",
          reason: `STREAK EMERGENCY: ${ctx.hour_utc}:00 UTC, no signal filed today — container takeover`,
          action: "streak-emergency-file",
        };
      }
      if (ctx.hour_utc >= 15) {
        return {
          type: "ACT",
          reason: `STREAK CRITICAL: ${ctx.hour_utc}:00 UTC, no signal filed today`,
          action: "streak-protection",
        };
      }
      if (!alertSent) {
        setState("streak_alert_date", new Date().toISOString().split("T")[0]);
        return {
          type: "ACT",
          reason: "Streak warning: 14:00 UTC, no signal filed today",
          action: "streak-warning",
        };
      }
    }
  }

  // Priority 7: Bankr x402 health check (every 100 ticks, offset by 50)
  // Checks the 8 x402 paywall endpoints — must return 402 (payment required)
  // when called without payment. 404/5xx → degraded → War Room alert.
  if (feature("PULSE_BANKR_HEALTH") && ctx.tick > 0 && ctx.tick % 100 === 50) {
    return {
      type: "ACT",
      reason: `Bankr x402 health check (tick ${ctx.tick}, every 100 ticks)`,
      action: "bankr-health-check",
    };
  }

  // Priority 6: Shield health check (every 100 ticks)
  if (feature("SHIELD_PULSE_MONITOR") && ctx.tick % 100 === 0) {
    try {
      const patternCount = db()
        .prepare("SELECT COUNT(*) as c FROM drain_patterns WHERE active = 1")
        .get();
      if (!patternCount || patternCount.c === 0) {
        emit("pulse-engine", EVENT_TYPES.SHIELD_DEGRADED, { patterns: 0 });
        return {
          type: "ACT",
          reason: "SHIELD DEGRADED: 0 active drain patterns",
          action: "shield-health-alert",
        };
      }
      // Log Shield health silently
      setState("shield_last_check", new Date().toISOString());
      setState("shield_pattern_count", patternCount.c);
    } catch (e) {
      // Shield tables may not exist — not critical
    }
  }

  // Priority 8: Marketplace health check (every 360 ticks ~6 hours, offset by 180)
  if (feature("PULSE_MARKETPLACE_HEALTH") && ctx.tick > 0 && ctx.tick % 360 === 180) {
    return {
      type: "ACT",
      reason: `Marketplace health check (tick ${ctx.tick}, every 360 ticks ~6hr)`,
      action: "marketplace-health-check",
    };
  }

  // Nothing actionable
  return { type: "SLEEP", reason: "No actionable context" };
}

// ── ACTION EXECUTOR (within blocking budget) ─────────────────
async function executeAction(action) {
  const start = Date.now();

  const timeout = new Promise((_, reject) =>
    setTimeout(
      () => reject(new Error("Blocking budget exceeded (15s)")),
      BLOCKING_BUDGET_MS,
    ),
  );

  const execution = (async () => {
    switch (action.action) {
      case "mailbox-cleanup":
        mailbox.cleanup();
        return { cleaned: true };

      case "process-ready-tasks":
        const ready = getReadyTasks();
        for (const task of ready.slice(0, 5)) {
          mailbox.send("pulse-engine", task.agent, "ALERT", {
            type: "TASK_READY",
            taskId: task.id,
            name: task.name,
          });
        }
        return { notified: Math.min(ready.length, 5) };

      case "fire-due-crons":
        for (const cronId of (action.cron_ids || []).slice(0, 5)) {
          recordRun(cronId);
          const cron = db()
            .prepare("SELECT * FROM dynamic_crons WHERE id = ?")
            .get(cronId);
          if (cron) {
            mailbox.send("pulse-engine", cron.agent, "EVENT", {
              type: "CRON_FIRED",
              cronId: cron.id,
              name: cron.name,
              payload: JSON.parse(cron.payload || "{}"),
            });
          }
        }
        return { fired: Math.min((action.cron_ids || []).length, 5) };

      case "trigger-aria-discovery":
        emit("pulse-engine", EVENT_TYPES.ARIA_DISCOVERY, {
          trigger: "pulse-window",
        });
        return { triggered: "aria-discovery" };

      case "shield-health-alert":
        emit("pulse-engine", EVENT_TYPES.SHIELD_DEGRADED, {
          trigger: "pulse-100tick",
        });
        return { triggered: "shield-health-alert" };

      case "bankr-health-check": {
        // Check 8 x402 paywall endpoints. Healthy = 402/405/200, degraded = 404/5xx/timeout.
        const endpoints = [
          "score",
          "simulate",
          "audit",
          "listing",
          "discover",
          "pipeline",
          "whale",
          "identity",
        ];
        const checks = await Promise.allSettled(
          endpoints.map(async (name) => {
            const ctrl = new AbortController();
            const t = setTimeout(() => ctrl.abort(), 2000);
            try {
              const res = await fetch(
                `http://localhost:3000/api/v1/x402/${name}`,
                {
                  method: "GET",
                  signal: ctrl.signal,
                },
              );
              clearTimeout(t);
              return {
                name,
                status: res.status,
                healthy: [402, 405, 200].includes(res.status),
              };
            } catch (err) {
              clearTimeout(t);
              return { name, status: 0, healthy: false, error: err.message };
            }
          }),
        );
        const results = checks.map((c) =>
          c.status === "fulfilled"
            ? c.value
            : { healthy: false, error: c.reason?.message },
        );
        const degraded = results.filter((r) => !r.healthy);

        setState("bankr_last_check", new Date().toISOString());
        setState("bankr_status_json", JSON.stringify(results));
        setState(
          "bankr_healthy_count",
          String(results.length - degraded.length),
        );

        // Alert War Room at most once per day on degradation
        if (degraded.length > 0) {
          const today = new Date().toISOString().split("T")[0];
          const lastAlert = getState("bankr_alert_date");
          if (lastAlert !== today) {
            setState("bankr_alert_date", today);
            mailbox.send("pulse-engine", "war-room-reporter", "ALERT", {
              type: "BANKR_X402_DEGRADED",
              total: results.length,
              degraded: degraded.length,
              failing: degraded.map((d) => ({
                name: d.name,
                status: d.status,
                error: d.error,
              })),
              message: `Bankr x402: ${degraded.length}/${results.length} endpoints degraded`,
            });
            emit("pulse-engine", "bankr.degraded", {
              degraded: degraded.length,
              total: results.length,
            });
          }
        }

        return {
          triggered: "bankr-health-check",
          total: results.length,
          healthy: results.length - degraded.length,
          degraded: degraded.length,
        };
      }

      case "streak-warning":
        emit("pulse-engine", EVENT_TYPES.STREAK_WARNING, {
          trigger: "pulse-14utc",
          level: "warning",
        });
        return { triggered: "streak-warning" };

      case "streak-protection":
        emit("pulse-engine", EVENT_TYPES.STREAK_WARNING, {
          trigger: "pulse-15utc",
          level: "critical",
        });
        return { triggered: "streak-protection" };

      case "streak-emergency-file":
        try {
          const {
            fileSignalDirect,
            checkFilerReady,
          } = require("../signals/aibtc-direct-filer");
          const {
            buildHeartbeatSignal,
          } = require("../signals/heartbeat-template");
          const ready = checkFilerReady();
          if (!ready.ready) {
            emit("pulse-engine", EVENT_TYPES.STREAK_WARNING, {
              trigger: "pulse-14utc-emergency",
              level: "critical",
              error: "filer_not_ready",
              detail: ready,
            });
            return {
              triggered: "streak-emergency-file",
              error: "filer_not_ready",
              detail: ready,
            };
          }
          const signal = buildHeartbeatSignal();
          const result = await fileSignalDirect(signal);
          // Mark as filed today to prevent re-trigger this Pacific date
          setState(
            "emergency_file_date",
            new Date().toISOString().split("T")[0],
          );
          return { triggered: "streak-emergency-file", filing: result };
        } catch (e) {
          return { triggered: "streak-emergency-file", error: e.message };
        }

      case "marketplace-health-check": {
        const fs = require("fs");
        const path = require("path");
        const MARKETPLACE_DIR = "/data/marketplace";
        try {
          const files = fs.readdirSync(MARKETPLACE_DIR).filter((f) => f.endsWith(".json") && !f.startsWith("health-report"));
          const results = [];
          for (const file of files) {
            const config = JSON.parse(fs.readFileSync(path.join(MARKETPLACE_DIR, file), "utf8"));
            if (!config.health_check_url) { results.push({ marketplace: config.marketplace, status: "SKIP" }); continue; }
            try {
              const ctrl = new AbortController();
              const t = setTimeout(() => ctrl.abort(), 10000);
              const res = await fetch(config.health_check_url, { signal: ctrl.signal });
              clearTimeout(t);
              const ok = res.status === 200;
              results.push({ marketplace: config.marketplace, status: ok ? "UP" : `DOWN (${res.status})` });
              if (!ok) {
                const today = new Date().toISOString().split("T")[0];
                const lastAlert = getState(`mkt_alert_${config.marketplace}`);
                if (lastAlert !== today) {
                  setState(`mkt_alert_${config.marketplace}`, today);
                  mailbox.send("pulse-engine", "war-room-reporter", "ALERT", {
                    type: "MARKETPLACE_DOWN", marketplace: config.marketplace, http_status: res.status,
                    message: `Marketplace ${config.marketplace} health check FAILED (HTTP ${res.status})`,
                  });
                }
              }
            } catch (e) {
              results.push({ marketplace: config.marketplace, status: `ERROR: ${e.message}` });
            }
          }
          setState("marketplace_last_check", new Date().toISOString());
          setState("marketplace_status_json", JSON.stringify(results));
          const upCount = results.filter((r) => r.status === "UP").length;
          return { triggered: "marketplace-health-check", total: files.length, up: upCount };
        } catch (e) {
          return { triggered: "marketplace-health-check", error: e.message };
        }
      }

      default:
        return { unknown_action: action.action };
    }
  })();

  try {
    return await Promise.race([execution, timeout]);
  } catch (err) {
    return { error: err.message, duration_ms: Date.now() - start };
  }
}

// ── LOG OBSERVATION (to SQLite, append-only) ─────────────────
function logObservation(obs) {
  if (!feature("OBSERVATION_LOG")) return;
  try {
    db()
      .prepare(
        `
      INSERT INTO observation_log
      (tick, timestamp, decision, reason, action, result, consecutive_idle, next_tick_ms, system_load_pct)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      )
      .run(
        obs.tick,
        obs.timestamp || new Date().toISOString(),
        obs.decision,
        obs.reason || null,
        obs.action || null,
        obs.result ? JSON.stringify(obs.result) : null,
        obs.consecutive_idle || null,
        obs.next_tick_ms || null,
        obs.system_load_pct || null,
      );
  } catch (e) {
    console.error("[PULSE] Failed to log observation:", e.message);
  }
}

// ── TICK EVALUATION ──────────────────────────────────────────
async function evaluateTick() {
  const tickCount = getTickCount() + 1;
  setState("tick_count", tickCount);
  setState("last_tick_at", new Date().toISOString());

  const timestamp = new Date().toISOString();
  const ctx = gatherContext();
  const action = decideAction(ctx);

  if (action.type === "ACT") {
    setState("consecutive_idle", 0);
    setState("current_interval_ms", TICK_INTERVAL_MS);

    const result = await executeAction(action);

    logObservation({
      tick: tickCount,
      timestamp,
      decision: "ACT",
      reason: action.reason,
      action: action.action,
      result,
      system_load_pct: ctx.system_load_pct,
    });

    emit("pulse-engine", "pulse.act", {
      tick: tickCount,
      action: action.action,
      reason: action.reason,
    });
  } else {
    const consecutiveIdle = getConsecutiveIdle() + 1;
    setState("consecutive_idle", consecutiveIdle);

    let newInterval = getCurrentInterval();
    if (
      feature("PULSE_LOAD_AWARE") &&
      ctx.system_load_pct > HIGH_LOAD_THRESHOLD
    ) {
      newInterval = MAX_SLEEP_MS; // Force 5min during heavy load
    } else {
      newInterval = Math.min(newInterval * IDLE_SLEEP_MULTIPLIER, MAX_SLEEP_MS);
    }
    setState("current_interval_ms", newInterval);

    logObservation({
      tick: tickCount,
      timestamp,
      decision: "SLEEP",
      reason: action.reason || "No actionable context",
      consecutive_idle: consecutiveIdle,
      next_tick_ms: newInterval,
      system_load_pct: ctx.system_load_pct,
    });

    // autoDream trigger after sustained idle
    if (consecutiveIdle >= MAX_CONSECUTIVE_IDLE) {
      emit("pulse-engine", "autodream.trigger", {
        tick: tickCount,
        idle_ticks: consecutiveIdle,
      });
      setState("consecutive_idle", 0);
    }
  }

  return {
    tick: tickCount,
    decision: action.type,
    interval: getCurrentInterval(),
  };
}

// ── INIT (reboot-aware) ──────────────────────────────────────
function initPulse() {
  if (!feature("PULSE_ENGINE")) return;

  // Track restarts
  const restarts = parseInt(getState("total_restarts") || "0") + 1;
  setState("total_restarts", restarts);
  setState("engine_started_at", new Date().toISOString());

  const tickCount = getTickCount();
  const resumeInterval = getCurrentInterval();

  // Log the restart in observation_log
  logObservation({
    tick: tickCount,
    timestamp: new Date().toISOString(),
    decision: "ACT",
    reason: `PULSE restarted (reboot #${restarts}). Resuming from tick ${tickCount}.`,
    action: "engine-restart",
    system_load_pct: Math.round((os.loadavg()[0] / os.cpus().length) * 100),
  });

  pulseActive = true;
  console.log(
    `[PULSE] Engine initialized (reboot #${restarts}). Resuming from tick ${tickCount}. Next tick in ${resumeInterval / 1000}s.`,
  );

  const tickLoop = async () => {
    if (!pulseActive) return;
    try {
      await evaluateTick();
    } catch (err) {
      console.error("[PULSE] Tick error:", err.message);
    }
    if (pulseActive) setTimeout(tickLoop, getCurrentInterval());
  };

  setTimeout(tickLoop, resumeInterval);
}

function stopPulse() {
  pulseActive = false;
  console.log("[PULSE] Engine stopped.");
}

module.exports = { initPulse, stopPulse, evaluateTick, gatherContext };
