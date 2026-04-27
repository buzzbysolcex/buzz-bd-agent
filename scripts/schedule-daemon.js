#!/usr/bin/env node
/**
 * schedule-daemon.js — Option A consumer for the v4.0 schedule mailbox.
 *
 * Per Ogie msg 5009-5011 (Apr 27 2026): Path B (Telegram wake) was
 * structurally broken. This daemon polls agent_mailbox for un-acked
 * EVENT rows and dispatches them to handlers. No Telegram dependency
 * for wake — the daemon IS the consumer.
 *
 * Phase 1 (today): stub handlers post a one-line "executing X" notice
 *   to the War Room. Claude Code session sees the post (via the
 *   @buzz_claude_code_bot @-mention prepend trick) and takes over
 *   the actual work.
 *
 * Phase 2 (this week): wire each stub to the real subagent / pipeline /
 *   filer logic so the daemon executes without Claude Code in the loop.
 *
 * Architecture:
 *   - Standalone Node process (NOT inside the buzz-production container,
 *     which is image-baked and would need a rebuild).
 *   - Polls /data/buzz/persistent/buzz-api/buzz.db via better-sqlite3.
 *   - Sends WR posts via buzz_cron_bot (creds at
 *     /home/claude-code/.claude/channels/telegram/cron-bot.env) with the
 *     @buzz_claude_code_bot mention prepended so the listener (which has
 *     Bot Privacy Mode enabled) actually receives the inbound update.
 *   - Marks rows acked regardless of handler error to prevent retry loops.
 *
 * Run: node scripts/schedule-daemon.js  (typically under tmux/systemd)
 * Logs: /home/claude-code/buzz-workspace/logs/schedule-daemon.log
 */

const fs = require("fs");
const https = require("https");
const path = require("path");
const Database = require("better-sqlite3");

const DB_PATH = "/data/buzz/persistent/buzz-api/buzz.db";
const ENV_PATH = "/home/claude-code/.claude/channels/telegram/cron-bot.env";
const LOG_PATH = path.join(__dirname, "..", "logs", "schedule-daemon.log");
const POLL_INTERVAL_MS = 30_000;
const LISTENER_HANDLE = "@buzz_claude_code_bot";
const BATCH_SIZE = 10;

// ── env load ────────────────────────────────────────────────────────────
function loadEnv(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}
const ENV = loadEnv(ENV_PATH);
const BOT_TOKEN = ENV.TELEGRAM_BOT_TOKEN || "";
const CHAT_ID = ENV.TELEGRAM_CHAT_ID || "-1003701758077";

if (!BOT_TOKEN) {
  console.error("[daemon] FATAL: cron-bot env missing TELEGRAM_BOT_TOKEN");
  process.exit(1);
}

// ── log ─────────────────────────────────────────────────────────────────
fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  process.stdout.write(line);
  fs.appendFileSync(LOG_PATH, line);
}

// ── Telegram send (with @mention prepended so listener with Privacy Mode
//    enabled still sees the update) ─────────────────────────────────────
function sendWR(text) {
  return new Promise((resolve) => {
    const body = JSON.stringify({
      chat_id: CHAT_ID,
      text: `${LISTENER_HANDLE} ${text}`,
    });
    const req = https.request(
      {
        hostname: "api.telegram.org",
        path: `/bot${BOT_TOKEN}/sendMessage`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          const ok = res.statusCode === 200 && data.includes('"ok":true');
          if (!ok)
            log(
              `WR send failed status=${res.statusCode} body=${data.slice(0, 120)}`,
            );
          resolve(ok);
        });
      },
    );
    req.on("error", (e) => {
      log(`WR send error: ${e.message}`);
      resolve(false);
    });
    req.setTimeout(10_000, () => {
      req.destroy();
      log("WR send timeout");
      resolve(false);
    });
    req.write(body);
    req.end();
  });
}

// ── handlers (Phase 1 stubs) ────────────────────────────────────────────
// Each returns a one-line WR notice OR null for silent.
const handlers = {
  async rug_watch() {
    return "executing rug_watch — scan rekt.news/PeckShield/SlowMist/CertiKAlert/BlockSecTeam, BuzzShield contracts, daily-rug-watch.json. Tweets → ORANGE.";
  },
  async score_tweets() {
    return "executing score_tweets — query pipeline (1-3 tokens, score ≥50, fresh), draft per tweet-on-score.md v2.1 (📋 Contract: line). Drafts → ORANGE.";
  },
  async pilot_outreach() {
    return "executing pilot_outreach — query pipeline for 2-3 prospects (score 50-69), verify activity, draft outreach. Drafts → ORANGE.";
  },
  async afternoon_work() {
    return "executing afternoon_work — priority queue: BuzzShield V5 research > intel ingest > Moltbook > scoring. Starting highest-priority unfinished GREEN task.";
  },
  async afternoon_checkin() {
    return "afternoon_checkin — checking Telegram unread, reporting current task progress, processing pending ORANGE approvals.";
  },
  async bd_scout() {
    return "executing bd_scout — pulling 3-5 hot pairs from DexScreener, scoring, BD Sweet Spot check, pipeline update.";
  },
  async solcex_block() {
    return "executing solcex_block — token scoring batch, BD outreach drafts for Sweet Spot candidates, pipeline update.";
  },
  async evening_checkin() {
    return "evening_checkin — checking Telegram, reporting progress, processing pending approvals.";
  },
  async day_close() {
    // Phase 2 P2 real handler: query today's actuals, update tracker, post EOD.
    const today = new Date().toISOString().slice(0, 10);
    const trackerPath =
      "/data/buzz/persistent/reports/revenue-execution-tracker.json";

    // Today's filed signals from DB
    let sigCount = 0;
    let avgQs = null;
    try {
      const sigs = db
        .prepare(
          `SELECT signal_id FROM aibtc_signals_filed WHERE pacific_date = ?`,
        )
        .all(today);
      sigCount = sigs.length;
      // qs lives in the AIBTC API, not the local DB. Read from tracker if set.
      const t = JSON.parse(fs.readFileSync(trackerPath, "utf8"));
      const qsVals = (t.aibtc?.signals_filed_today_detail || [])
        .map((s) => s.qs)
        .filter((q) => typeof q === "number");
      if (qsVals.length)
        avgQs = +(qsVals.reduce((a, b) => a + b, 0) / qsVals.length).toFixed(1);
    } catch (e) {
      log(`day_close DB/tracker read err: ${e.message}`);
    }

    // Today's drafted score tweets
    let tweetDrafts = 0;
    try {
      const dir = "/data/buzz/persistent/reports/score-tweet-drafts";
      tweetDrafts = fs
        .readdirSync(dir)
        .filter((f) => f.startsWith(today) && f.endsWith(".md")).length;
    } catch {}

    // Stall flag check + tracker update — IDEMPOTENT per UTC day.
    // last_close_date guard prevents double-increment if day_close fires twice.
    let stallNote = "";
    try {
      const t = JSON.parse(fs.readFileSync(trackerPath, "utf8"));
      const ss = t.stream_streaks || {};
      if (ss.last_close_date === today) {
        // already closed today — return current state read-only
        stallNote = `HSaaS streak ${ss.hsaas_consecutive_action_days || 0}d | SolCex ${ss.solcex_days_since_last_action || 0}d inactive (already closed today)`;
      } else {
        // first close of the day — compute and persist
        const hsaasActed =
          (t.hsaas?.rug_watch_completed_today ?? false) || tweetDrafts >= 1;
        const solcexActed = (t.solcex?.bd_outreach_sent_today ?? 0) >= 1;
        const newHsaasStreak = hsaasActed
          ? (ss.hsaas_consecutive_action_days || 0) + 1
          : 0;
        const newHsaasZero = hsaasActed ? 0 : (ss.hsaas_days_at_zero || 0) + 1;
        const newSolcexStreak = solcexActed
          ? (ss.solcex_consecutive_action_days || 0) + 1
          : 0;
        const newSolcexInactive = solcexActed
          ? 0
          : (ss.solcex_days_since_last_action || 0) + 1;
        t.stream_streaks = {
          ...ss,
          hsaas_consecutive_action_days: newHsaasStreak,
          hsaas_days_at_zero: newHsaasZero,
          solcex_consecutive_action_days: newSolcexStreak,
          solcex_days_since_last_action: newSolcexInactive,
          last_close_date: today,
        };
        stallNote = `HSaaS ${hsaasActed ? "✅" : "⚠️"} streak ${newHsaasStreak}d | SolCex ${solcexActed ? "✅" : "🔴"} ${newSolcexInactive}d inactive`;
        fs.writeFileSync(trackerPath, JSON.stringify(t, null, 2));
      }
    } catch (e) {
      log(`day_close stall-flag err: ${e.message}`);
      stallNote = "stall-flag update FAILED";
    }

    return `EOD ${today} — signals ${sigCount}/6${avgQs !== null ? ` (avg qs ${avgQs})` : ""}, score-tweet drafts ${tweetDrafts}. ${stallNote}.`;
  },
  async night_work() {
    return null; // silent GREEN
  },
  async night_checkin() {
    return null; // silent
  },
  async morning_signal_fallback(payloadJSON) {
    let slot = "?";
    try {
      const p = JSON.parse(payloadJSON);
      const m = (p.message || "").match(/Slot (\d)/);
      if (m) slot = m[1];
    } catch {}
    return `executing morning_signal_fallback (slot ${slot}) — research the beat, pull live data, draft signal, file via aibtc-direct-filer. Report signal_id when landed. YELLOW authority.`;
  },
  async keepalive() {
    return null; // silent — mailbox row drained, no WR post
  },
  async prayer_reminder(payloadJSON) {
    try {
      return JSON.parse(payloadJSON).message;
    } catch {
      return null;
    }
  },
  async test_daemon() {
    return "test_daemon ✅ — Option A daemon consumed this row. Fix is live.";
  },
  async test_wake() {
    return "test_wake ✅ — daemon also handles legacy test_wake events for parity with smoke tests.";
  },
};

// ── DB ──────────────────────────────────────────────────────────────────
let db;
try {
  db = new Database(DB_PATH, { readonly: false });
  db.pragma("journal_mode = WAL");
} catch (e) {
  console.error(`[daemon] FATAL: cannot open DB ${DB_PATH}: ${e.message}`);
  process.exit(1);
}

const SELECT_PENDING = db.prepare(`
  SELECT rowid AS rid, payload, created_at
  FROM agent_mailbox
  WHERE msg_type = 'EVENT'
    AND acked_at IS NULL
    AND to_agent = 'claude-code'
  ORDER BY created_at ASC
  LIMIT ?
`);
const ACK_ROW = db.prepare(`
  UPDATE agent_mailbox
  SET acked_at = datetime('now')
  WHERE rowid = ?
`);

// ── poll loop ───────────────────────────────────────────────────────────
async function tick() {
  let rows;
  try {
    rows = SELECT_PENDING.all(BATCH_SIZE);
  } catch (e) {
    log(`poll error: ${e.message}`);
    return;
  }
  if (rows.length === 0) return;
  log(`found ${rows.length} un-acked EVENT row(s)`);

  for (const row of rows) {
    let eventType = "?";
    try {
      const payload = JSON.parse(row.payload);
      eventType = payload.event_type || "?";
      const handler = handlers[eventType];
      if (handler) {
        const result = await handler(row.payload);
        if (result) {
          await sendWR(`🐝 [${eventType}] ${result}`);
        }
        log(`row ${row.rid} ${eventType} executed (wr=${!!result})`);
      } else {
        log(`row ${row.rid} ${eventType} no_handler`);
      }
    } catch (e) {
      log(`row ${row.rid} ${eventType} handler_error: ${e.message}`);
    }
    try {
      ACK_ROW.run(row.rid);
    } catch (e) {
      log(`row ${row.rid} ack_error: ${e.message}`);
    }
  }
}

// ── boot ────────────────────────────────────────────────────────────────
log(
  `boot — polling every ${POLL_INTERVAL_MS / 1000}s, db=${DB_PATH}, sender=buzz_cron_bot, listener=${LISTENER_HANDLE}`,
);
sendWR(
  "🐝 schedule-daemon online — polling agent_mailbox every 30s. Phase 1 stubs active.",
);

// First tick immediately (drain any backlog), then on interval.
tick().catch((e) => log(`first tick error: ${e.message}`));
setInterval(() => {
  tick().catch((e) => log(`tick error: ${e.message}`));
}, POLL_INTERVAL_MS);

// graceful shutdown
function shutdown() {
  log("shutdown");
  try {
    db.close();
  } catch {}
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
