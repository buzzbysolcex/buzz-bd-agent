/**
 * Discord notify — push module for OPS + INTEL dashboard.
 *
 * Reads channel IDs from /data/buzz/persistent/directives/discord-channels.json
 * (canonical path /data/buzz/persistent/config/ pending Ogie's dir creation).
 *
 * Gated by DISCORD_OPS_DASHBOARD feature flag — no-op returns {sent:false,
 * reason:"flag_off"} when flag is false so callers never need to guard.
 *
 * Fail-open: all errors are logged and swallowed; this module never throws
 * into its caller. A downstream Telegram path is never affected by a Discord
 * failure.
 *
 * Per Ogie War Room msgs 3881 / 3885 / 3892 / 3893 / 3896.
 * Phase 1b Wave 1 Commit 1.
 */

const fs = require("fs");
const { feature } = require("./feature-flags");

const DEFAULT_CHANNEL_CONFIG_PATHS = [
  "/data/buzz/persistent/config/discord-channels.json",
  "/data/buzz/persistent/directives/discord-channels.json",
];

function channelConfigPaths() {
  if (process.env.DISCORD_CHANNEL_CONFIG_PATH) {
    return [process.env.DISCORD_CHANNEL_CONFIG_PATH];
  }
  return DEFAULT_CHANNEL_CONFIG_PATHS;
}

const DISCORD_API = "https://discord.com/api/v10";
const MAX_CONTENT_LEN = 2000;
const USER_AGENT =
  "Buzz-BD-Agent (https://buzzbd.ai, discord-notify/1.0, phase-1b-wave-1)";

let _cache = null;
let _cacheMtime = 0;

function loadChannels() {
  for (const p of channelConfigPaths()) {
    try {
      const stat = fs.statSync(p);
      if (_cache && stat.mtimeMs === _cacheMtime) return _cache;
      const raw = fs.readFileSync(p, "utf8");
      _cache = JSON.parse(raw);
      _cacheMtime = stat.mtimeMs;
      _cache.__path = p;
      return _cache;
    } catch {
      /* try next path */
    }
  }
  return null;
}

function resolveChannelId(channelKey, channels) {
  if (!channels) return null;
  const parts = String(channelKey).split(".");
  // Examples: "ops.morning-brief", "intel.inbox.zachxbt", "intel.output.triaged"
  let node = channels;
  for (const p of parts) {
    if (node && typeof node === "object" && p in node) node = node[p];
    else return null;
  }
  return typeof node === "string" ? node : null;
}

function chunkContent(content, limit = MAX_CONTENT_LEN) {
  const s = String(content ?? "");
  if (s.length <= limit) return [s];
  const chunks = [];
  let i = 0;
  while (i < s.length) {
    chunks.push(s.slice(i, i + limit));
    i += limit;
  }
  return chunks;
}

async function discordPost(channelId, body, { retryCount = 0 } = {}) {
  const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
    },
    body: JSON.stringify(body),
  });

  if (res.status === 429 && retryCount < 3) {
    const data = await res.json().catch(() => ({ retry_after: 1 }));
    const waitMs = Math.ceil((data.retry_after || 1) * 1000);
    await new Promise((r) => setTimeout(r, waitMs));
    return discordPost(channelId, body, { retryCount: retryCount + 1 });
  }

  const text = await res.text();
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  return { status: res.status, ok: res.ok, body: parsed };
}

/**
 * send(channelKey, content, opts)
 *
 * @param {string} channelKey - e.g. "ops.morning-brief", "intel.output.triaged"
 * @param {string} content - plain text (auto-chunked at 2000 chars)
 * @param {object} opts
 * @param {object[]} [opts.embeds] - Discord embed objects (max 10)
 * @param {string} [opts.reason] - caller tag for logs (e.g. "morning-brief-cron")
 *
 * @returns {Promise<{sent:boolean, reason?:string, messageIds?:string[], error?:string}>}
 */
async function send(channelKey, content, opts = {}) {
  if (!feature("DISCORD_OPS_DASHBOARD")) {
    return { sent: false, reason: "flag_off" };
  }

  if (!process.env.DISCORD_BOT_TOKEN) {
    console.error(
      `[discord-notify] DISCORD_BOT_TOKEN missing — channel=${channelKey} reason=${opts.reason || "?"}`,
    );
    return { sent: false, reason: "no_token" };
  }

  const channels = loadChannels();
  if (!channels) {
    console.error(
      `[discord-notify] channel config not found at any of: ${channelConfigPaths().join(", ")}`,
    );
    return { sent: false, reason: "no_config" };
  }

  const channelId = resolveChannelId(channelKey, channels);
  if (!channelId) {
    console.error(
      `[discord-notify] channelKey="${channelKey}" did not resolve (config path=${channels.__path})`,
    );
    return { sent: false, reason: "no_channel_id" };
  }

  try {
    const chunks = chunkContent(content);
    const messageIds = [];
    for (let i = 0; i < chunks.length; i++) {
      const body = { content: chunks[i] };
      // Attach embeds only to the last chunk so they don't repeat.
      if (i === chunks.length - 1 && Array.isArray(opts.embeds)) {
        body.embeds = opts.embeds.slice(0, 10);
      }
      const resp = await discordPost(channelId, body);
      if (!resp.ok) {
        console.error(
          `[discord-notify] POST failed channelKey=${channelKey} status=${resp.status} body=${JSON.stringify(resp.body).slice(0, 200)}`,
        );
        return {
          sent: false,
          reason: `http_${resp.status}`,
          messageIds,
          error: resp.body,
        };
      }
      if (resp.body && resp.body.id) messageIds.push(resp.body.id);
    }
    return { sent: true, messageIds };
  } catch (err) {
    console.error(
      `[discord-notify] exception channelKey=${channelKey} err=${err.message}`,
    );
    return { sent: false, reason: "exception", error: err.message };
  }
}

function _resetCache() {
  _cache = null;
  _cacheMtime = 0;
}

module.exports = {
  send,
  resolveChannelId,
  chunkContent,
  loadChannels,
  _resetCache,
};
