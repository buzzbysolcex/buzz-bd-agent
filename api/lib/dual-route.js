/**
 * Dual-Route — post events to War Room (Telegram) AND matching Discord OPS channel.
 *
 * Per Ogie War Room msg 4351/4352 Step 2. Every operational event that previously
 * went War-Room-only now also mirrors to the corresponding Discord channel so the
 * OPS category actually has signal. Fail-independent: TG failure does not block
 * Discord, Discord failure does not block TG.
 *
 * Event type → channel key mapping is the single source of truth and lives here.
 *
 * Usage:
 *   const { postDual } = require('../lib/dual-route');
 *   await postDual('signal_filed', 'signal 424be194 filed ...', { reason: 'morning-signal' });
 */

const https = require("https");
const discordNotify = require("./discord-notify");

// Canonical mapping (per Ogie msg 4352 table). Each entry MUST have either a TG
// destination OR a Discord channel OR both. An event that only posts to one is
// still a "dual-route" event — the wrapper abstracts the asymmetry.
const EVENT_ROUTES = {
  morning_brief: { tg: true, discord: "ops.morning-brief" },
  daily_plan: { tg: true, discord: "ops.daily-report" },
  signal_filed: { tg: true, discord: "ops.signal-stream" },
  streak_status: { tg: true, discord: "ops.streak-alerts" },
  shield_scan: { tg: true, discord: "ops.shield-scans" },
  sentinel_health: { tg: true, discord: "ops.sentinel-health" },
  hot_token: { tg: true, discord: "ops.bd-hot-tokens" },
  mining_snapshot: { tg: true, discord: "ops.mining-pulse" },
  tweet_approval: { tg: true, discord: "ops.tweet-approval-queue" },
  flag_flip: { tg: true, discord: "ops.kill-switch-log" },
  kill_switch: { tg: true, discord: "ops.kill-switch-log" },
  // Intel events are Discord-only (no War Room spam).
  intel_triage: { tg: false, discord: "intel.output.triaged" },
  intel_action: { tg: false, discord: "intel.output.actioned" },
};

// Telegram bot creds for War Room. Same bot used by signal-file-direct.js.
const TG_BOT_TOKEN =
  process.env.WAR_ROOM_BOT_TOKEN ||
  process.env.TG_BOT_TOKEN ||
  process.env.TELEGRAM_BOT_TOKEN;
const TG_CHAT_ID = process.env.WAR_ROOM_CHAT_ID || "-1003701758077";

async function tgSend(text) {
  return new Promise((resolve) => {
    const body = JSON.stringify({ chat_id: TG_CHAT_ID, text });
    const req = https.request(
      {
        hostname: "api.telegram.org",
        path: `/bot${TG_BOT_TOKEN}/sendMessage`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
        timeout: 10000,
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ sent: true, status: res.statusCode });
          } else {
            resolve({
              sent: false,
              status: res.statusCode,
              body: data.slice(0, 200),
            });
          }
        });
      },
    );
    req.on("error", (e) => resolve({ sent: false, error: e.message }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ sent: false, error: "timeout" });
    });
    req.write(body);
    req.end();
  });
}

/**
 * postDual(eventType, content, opts)
 *
 * @param {string} eventType - key from EVENT_ROUTES
 * @param {string} content - plain text
 * @param {object} opts
 * @param {string} [opts.reason] - caller tag for logs
 * @returns {Promise<{event:string, tg:object, discord:object}>}
 */
async function postDual(eventType, content, opts = {}) {
  const route = EVENT_ROUTES[eventType];
  if (!route) {
    return {
      event: eventType,
      tg: { sent: false, reason: "unknown_event_type" },
      discord: { sent: false, reason: "unknown_event_type" },
    };
  }

  // Fire both in parallel — each independently fail-open.
  const promises = [];
  promises.push(
    route.tg
      ? tgSend(content).catch((e) => ({ sent: false, error: e.message }))
      : Promise.resolve({ sent: false, reason: "tg_skipped_by_route" }),
  );
  promises.push(
    route.discord
      ? discordNotify
          .send(route.discord, content, { reason: opts.reason || eventType })
          .catch((e) => ({ sent: false, error: e.message }))
      : Promise.resolve({ sent: false, reason: "discord_skipped_by_route" }),
  );

  const [tg, discord] = await Promise.all(promises);

  // Log outcome for observability. Never throw into caller.
  if (!tg.sent && route.tg) {
    console.error(
      `[dual-route] TG path failed event=${eventType} reason=${tg.reason || tg.error || "?"} status=${tg.status || "?"}`,
    );
  }
  if (!discord.sent && route.discord) {
    console.error(
      `[dual-route] Discord path failed event=${eventType} channel=${route.discord} reason=${discord.reason || discord.error || "?"}`,
    );
  }

  return { event: eventType, tg, discord };
}

module.exports = {
  postDual,
  EVENT_ROUTES,
};
