/**
 * Discord OPS Dispatcher — event-bus subscriber that mirrors kill-switch-class
 * events to the #kill-switch-log channel.
 *
 * Polls the event_log table every 60s for rows with event_type in:
 *   - KILL_SWITCH_ACT (new Wave 1 event type)
 *   - GUARD_BLOCK
 *   - TRUST_LEVEL_CHANGE
 *   - STREAK_EMERGENCY
 *   - FEATURE_FLAG_FLIP (new Wave 1 event type)
 *
 * Tracks progress in discord_dispatcher_state.last_processed_event_id so a
 * restart never duplicates posts.
 *
 * Gated by DISCORD_OPS_DASHBOARD via discord-notify.send — poll still runs
 * but every send is a no-op when the flag is false.
 *
 * Per Ogie msg 3897 / Commit 2. Phase 1b Wave 1.
 */

const DISPATCHER_NAME = "discord-ops-dispatcher";

const WATCHED_EVENT_TYPES = [
  "kill_switch.act",
  "guard.block",
  "trust.level.change",
  "streak.emergency",
  "feature_flag.flip",
];

function initDispatcherState(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS discord_dispatcher_state (
      dispatcher_name TEXT PRIMARY KEY,
      last_processed_event_id INTEGER DEFAULT 0,
      last_polled_at TEXT,
      total_posts INTEGER DEFAULT 0,
      last_error TEXT
    )
  `);
  db.prepare(
    `INSERT OR IGNORE INTO discord_dispatcher_state
     (dispatcher_name, last_processed_event_id) VALUES (?, 0)`,
  ).run(DISPATCHER_NAME);
}

function formatEventAsEmbed(row) {
  let payload = {};
  try {
    payload = row.payload ? JSON.parse(row.payload) : {};
  } catch {
    payload = { _raw: row.payload };
  }

  const colorMap = {
    "kill_switch.act": 0xe53935,
    "guard.block": 0xd32f2f,
    "trust.level.change": 0xff8f00,
    "streak.emergency": 0xc62828,
    "feature_flag.flip": 0x546e7a,
  };

  const fields = [];
  for (const [k, v] of Object.entries(payload)) {
    if (typeof v === "object" && v !== null) {
      fields.push({
        name: k,
        value: "```" + JSON.stringify(v).slice(0, 500) + "```",
        inline: false,
      });
    } else {
      fields.push({
        name: k,
        value: String(v).slice(0, 1024) || "_empty_",
        inline: true,
      });
    }
  }

  return {
    title: `🔴 ${row.event_type}`,
    description: `**source:** \`${row.source || "?"}\`\n**id:** \`${row.id}\`\n**at:** \`${row.created_at}\``,
    color: colorMap[row.event_type] ?? 0x757575,
    fields: fields.slice(0, 25),
    timestamp: row.created_at,
  };
}

async function pollOnce(deps = {}) {
  const db = deps.db || require("../../db").getDB();
  const discord = deps.discord || require("../../lib/discord-notify");

  initDispatcherState(db);

  const state = db
    .prepare(
      `SELECT last_processed_event_id, total_posts FROM discord_dispatcher_state
       WHERE dispatcher_name = ?`,
    )
    .get(DISPATCHER_NAME);

  const placeholders = WATCHED_EVENT_TYPES.map(() => "?").join(",");
  const rows = db
    .prepare(
      `SELECT id, event_type, payload, source, created_at
       FROM event_log
       WHERE id > ? AND event_type IN (${placeholders})
       ORDER BY id ASC LIMIT 25`,
    )
    .all(state.last_processed_event_id || 0, ...WATCHED_EVENT_TYPES);

  if (rows.length === 0) {
    db.prepare(
      `UPDATE discord_dispatcher_state SET last_polled_at = datetime('now')
       WHERE dispatcher_name = ?`,
    ).run(DISPATCHER_NAME);
    return { processed: 0, latest_id: state.last_processed_event_id || 0 };
  }

  let processed = 0;
  let lastId = state.last_processed_event_id || 0;
  for (const row of rows) {
    try {
      const embed = formatEventAsEmbed(row);
      const res = await discord.send(
        "ops.kill-switch-log",
        `event \`${row.event_type}\` (id=${row.id})`,
        { embeds: [embed], reason: "discord-ops-dispatcher" },
      );
      if (!res.sent && res.reason !== "flag_off") {
        // Real failure (not the flag-off no-op). Keep advancing the cursor
        // anyway — fail-open — but record last_error so the dashboard can
        // expose it.
        db.prepare(
          `UPDATE discord_dispatcher_state SET last_error = ?
           WHERE dispatcher_name = ?`,
        ).run(
          `id=${row.id} ${res.reason || "?"} ${(res.error && JSON.stringify(res.error).slice(0, 200)) || ""}`,
          DISPATCHER_NAME,
        );
      }
      lastId = row.id;
      processed++;
    } catch (err) {
      db.prepare(
        `UPDATE discord_dispatcher_state SET last_error = ?
         WHERE dispatcher_name = ?`,
      ).run(
        `id=${row.id} exception ${err.message}`.slice(0, 500),
        DISPATCHER_NAME,
      );
      lastId = row.id;
    }
  }

  db.prepare(
    `UPDATE discord_dispatcher_state
     SET last_processed_event_id = ?,
         last_polled_at = datetime('now'),
         total_posts = total_posts + ?
     WHERE dispatcher_name = ?`,
  ).run(lastId, processed, DISPATCHER_NAME);

  return { processed, latest_id: lastId };
}

let _interval = null;

function start(deps = {}, intervalMs = 60 * 1000) {
  if (_interval) return { already_running: true };
  pollOnce(deps).catch((err) =>
    console.error(`[${DISPATCHER_NAME}] initial poll err: ${err.message}`),
  );
  _interval = setInterval(() => {
    pollOnce(deps).catch((err) =>
      console.error(`[${DISPATCHER_NAME}] poll err: ${err.message}`),
    );
  }, intervalMs);
  return { started: true, interval_ms: intervalMs };
}

function stop() {
  if (_interval) clearInterval(_interval);
  _interval = null;
  return { stopped: true };
}

module.exports = {
  DISPATCHER_NAME,
  WATCHED_EVENT_TYPES,
  initDispatcherState,
  formatEventAsEmbed,
  pollOnce,
  start,
  stop,
};
