#!/usr/bin/env node
/*
 * Discord OPS + INTEL Dashboard — Phase 1a setup (one-shot, idempotent).
 *
 * Creates:
 *   - "🔒 OPS"   category with 10 channels (Buzz → Ogie)
 *   - "📡 INTEL" category with 6 channels  (Ogie → Buzz → Ogie)
 *
 * Both categories:
 *   - @everyone DENY VIEW_CHANNEL
 *   - Bot role ALLOW VIEW_CHANNEL, SEND_MESSAGES, READ_MESSAGE_HISTORY, EMBED_LINKS, ATTACH_FILES
 *   - Ogie ALLOW VIEW_CHANNEL, SEND_MESSAGES
 *
 * Posts a stub "channel purpose" message in each channel immediately after creation.
 *
 * Idempotency: categories + channels matched by exact name; skipped if present.
 * Stub messages: posted only if the channel was JUST created in this run (tracked
 * with a per-channel `created` flag); never duplicated on re-runs.
 *
 * Output: /data/buzz/persistent/config/discord-channels.json (persistent, not git)
 *
 * Per Ogie War Room msg 3881 (2026-04-18) + 3885 (greenlight 22:20 UTC).
 * Feature flag DISCORD_OPS_DASHBOARD stays FALSE after this runs; Phase 1b flips it.
 */

const fs = require("fs");
const path = require("path");

// ---------- Config ----------
const GUILD_ID = "1487647664647438476";
const BOT_USER_ID = "1475792150380941372";
const BOT_ROLE_ID = "1487649128128319611"; // "Buzz BD Agent" managed role
const OGIE_USER_ID = "737637132536905809";
const CONFIG_OUT = "/data/buzz/persistent/config/discord-channels.json";

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error("ERROR: DISCORD_BOT_TOKEN not set. Source .env.discord first.");
  process.exit(1);
}

// Discord permission bits
const P = {
  VIEW_CHANNEL: 0x400n,
  SEND_MESSAGES: 0x800n,
  READ_MESSAGE_HISTORY: 0x10000n,
  EMBED_LINKS: 0x4000n,
  ATTACH_FILES: 0x8000n,
};

// Discord channel/overwrite types
const CHANNEL_TYPE = {
  GUILD_TEXT: 0,
  GUILD_CATEGORY: 4,
};
const OVERWRITE_TYPE = {
  ROLE: 0,
  MEMBER: 1,
};

// ---------- Category + channel spec ----------

const OPS_CATEGORY_NAME = "🔒 OPS";
const INTEL_CATEGORY_NAME = "📡 INTEL";

const OPS_CHANNELS = [
  {
    name: "morning-brief",
    topic: "Daily ops summary 08:30 JED / 05:30 UTC — Phase 1b fills",
    stub: "🌅 Daily ops summary lands here at 08:30 JED / 05:30 UTC. Filled by Buzz when Phase 1b ships.",
  },
  {
    name: "daily-report",
    topic: "End-of-day operational summary 18:00 UTC",
    stub: "📊 End-of-day operational summary posts here at 18:00 UTC. Filled by Buzz when Phase 1b ships.",
  },
  {
    name: "signal-stream",
    topic: "AIBTC signal approve/reject events, live",
    stub: "📡 Live AIBTC signal events (approve/reject) post here. Filled by Buzz when Phase 1b ships.",
  },
  {
    name: "streak-alerts",
    topic: "AIBTC streak state check + at-risk alerts",
    stub: "🔥 AIBTC streak state check + at-risk alerts. Filled by Buzz when Phase 1b ships.",
  },
  {
    name: "shield-scans",
    topic: "BuzzShield audit findings on scan",
    stub: "🛡️ BuzzShield audit findings post here on scan. Filled by Buzz when Phase 1b ships.",
  },
  {
    name: "sentinel-health",
    topic: "Container + PULSE + cron health",
    stub: "❤️‍🩹 Container + PULSE + cron health. Filled by Buzz when Phase 1b ships.",
  },
  {
    name: "bd-hot-tokens",
    topic: "Pipeline HOT tokens on dual-gate pass",
    stub: "🔥 Pipeline HOT tokens on dual-gate pass. Filled by Buzz when Phase 1b ships.",
  },
  {
    name: "mining-pulse",
    topic: "Mining intel snapshots (PULSE 6c tick)",
    stub: "⛏️ Mining intel snapshots (PULSE 6c tick). Filled by Buzz when Phase 1b ships.",
  },
  {
    name: "tweet-approval-queue",
    topic: "Tweet drafts awaiting Ogie go",
    stub: "🐦 Tweet drafts awaiting Ogie go. Filled by Buzz when Phase 1b ships.",
  },
  {
    name: "kill-switch-log",
    topic: "Manual override + feature-flag flip audit",
    stub: "🔴 Manual override + feature-flag flip audit. Filled by Buzz when Phase 1b ships.",
  },
];

const INTEL_INBOX_TEMPLATE = (sourceLabel) =>
  `📡 Forward ${sourceLabel} here. Buzz will ingest every 5min, cross-reference against BD pipeline tokens + claim_audit + wiki, and post summary to #intel-triaged. Actioned items flow to #intel-actioned.`;

const INTEL_CHANNELS = [
  {
    name: "intel-zachxbt",
    topic: "Ogie forwards ZachXBT security alerts",
    stub: INTEL_INBOX_TEMPLATE("ZachXBT security alerts"),
    kind: "inbox",
    slug: "zachxbt",
  },
  {
    name: "intel-lookonchain",
    topic: "Ogie forwards Lookonchain whale flows",
    stub: INTEL_INBOX_TEMPLATE("Lookonchain whale flows"),
    kind: "inbox",
    slug: "lookonchain",
  },
  {
    name: "intel-defi-alerts",
    topic: "Ogie forwards DeFi Alerts / protocol events",
    stub: INTEL_INBOX_TEMPLATE("DeFi Alerts / protocol events"),
    kind: "inbox",
    slug: "defi-alerts",
  },
  {
    name: "intel-raw",
    topic: "Catch-all for other sources Ogie spots",
    stub: INTEL_INBOX_TEMPLATE("any other intel sources you spot"),
    kind: "inbox",
    slug: "raw",
  },
  {
    name: "intel-triaged",
    topic: "Buzz posts processed summaries",
    stub: "🤖 Buzz writes here after processing items from inbox channels. Each post includes: source URL, summary, BD pipeline impact, claim_audit row ID, autodream Phase 1 ingest row ID.",
    kind: "output",
    slug: "triaged",
  },
  {
    name: "intel-actioned",
    topic: "Buzz posts when intel triggered an action",
    stub: "⚡ Buzz writes here when intel triggered a concrete action. Each post includes: triaged item link, action taken (score delta / outreach pause / shield flag / signal draft), affected records.",
    kind: "output",
    slug: "actioned",
  },
];

// ---------- Permission overwrite builder ----------

function categoryOverwrites() {
  const denyView = P.VIEW_CHANNEL.toString();
  const botAllow = (
    P.VIEW_CHANNEL |
    P.SEND_MESSAGES |
    P.READ_MESSAGE_HISTORY |
    P.EMBED_LINKS |
    P.ATTACH_FILES
  ).toString();
  const ogieAllow = (P.VIEW_CHANNEL | P.SEND_MESSAGES).toString();

  return [
    { id: GUILD_ID, type: OVERWRITE_TYPE.ROLE, allow: "0", deny: denyView },
    { id: BOT_ROLE_ID, type: OVERWRITE_TYPE.ROLE, allow: botAllow, deny: "0" },
    {
      id: OGIE_USER_ID,
      type: OVERWRITE_TYPE.MEMBER,
      allow: ogieAllow,
      deny: "0",
    },
  ];
}

// ---------- Discord API helpers ----------

async function discord(method, pathPart, body) {
  const url = `https://discord.com/api/v10${pathPart}`;
  const init = {
    method,
    headers: {
      Authorization: `Bot ${BOT_TOKEN}`,
      "Content-Type": "application/json",
      "User-Agent":
        "Buzz-BD-Agent (https://buzzbd.ai, phase-1a-discord-ops-setup)",
    },
  };
  if (body !== undefined) init.body = JSON.stringify(body);

  const res = await fetch(url, init);

  if (res.status === 429) {
    const data = await res.json().catch(() => ({}));
    const retryAfter = (data.retry_after || 1) * 1000;
    console.log(`  [rate-limited] retry_after=${retryAfter}ms`);
    await new Promise((r) => setTimeout(r, retryAfter));
    return discord(method, pathPart, body);
  }

  const text = await res.text();
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }

  if (!res.ok) {
    const msg = typeof parsed === "object" ? JSON.stringify(parsed) : parsed;
    throw new Error(`${method} ${pathPart} -> ${res.status}: ${msg}`);
  }

  return parsed;
}

async function listGuildChannels() {
  return discord("GET", `/guilds/${GUILD_ID}/channels`);
}

async function createCategory(name, permissionOverwrites) {
  console.log(`  creating category: ${name}`);
  return discord("POST", `/guilds/${GUILD_ID}/channels`, {
    name,
    type: CHANNEL_TYPE.GUILD_CATEGORY,
    permission_overwrites: permissionOverwrites,
  });
}

async function createTextChannel(name, parentId, topic) {
  console.log(`  creating channel: #${name} under parent=${parentId}`);
  return discord("POST", `/guilds/${GUILD_ID}/channels`, {
    name,
    type: CHANNEL_TYPE.GUILD_TEXT,
    parent_id: parentId,
    topic,
    // Child channels inherit parent category overwrites by default (Discord
    // behavior when permission_overwrites is omitted and parent_id is set).
  });
}

async function postMessage(channelId, content) {
  return discord("POST", `/channels/${channelId}/messages`, { content });
}

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

// ---------- Main ----------

async function ensureCategory(liveChannels, name, overwrites) {
  const existing = liveChannels.find(
    (c) => c.type === CHANNEL_TYPE.GUILD_CATEGORY && c.name === name,
  );
  if (existing) {
    console.log(`  [skip] category exists: ${name} id=${existing.id}`);
    return { category: existing, created: false };
  }
  const created = await createCategory(name, overwrites);
  await sleep(500);
  return { category: created, created: true };
}

async function ensureChannel(liveChannels, spec, parentId) {
  const existing = liveChannels.find(
    (c) =>
      c.type === CHANNEL_TYPE.GUILD_TEXT &&
      c.name === spec.name &&
      c.parent_id === parentId,
  );
  if (existing) {
    console.log(`  [skip] channel exists: #${spec.name} id=${existing.id}`);
    return { channel: existing, created: false };
  }
  const created = await createTextChannel(spec.name, parentId, spec.topic);
  await sleep(500);
  return { channel: created, created: true };
}

async function postStubIfCreated(channel, created, stubContent) {
  if (!created) {
    console.log(`  [skip-stub] not newly created: #${channel.name}`);
    return false;
  }
  console.log(`  posting stub in #${channel.name}`);
  await postMessage(channel.id, stubContent);
  await sleep(500);
  return true;
}

function writeConfig(map) {
  const dir = path.dirname(CONFIG_OUT);
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch {
    /* already exists */
  }
  fs.writeFileSync(CONFIG_OUT, JSON.stringify(map, null, 2) + "\n");
  console.log(`\n✓ wrote ${CONFIG_OUT}`);
}

async function main() {
  console.log(`Phase 1a Discord OPS + INTEL setup — guild=${GUILD_ID}`);
  console.log(`Started at ${new Date().toISOString()}`);

  const liveChannels = await listGuildChannels();
  console.log(`\nLive channels: ${liveChannels.length} total`);

  const overwrites = categoryOverwrites();

  // ---- OPS category ----
  console.log("\n=== OPS category ===");
  const ops = await ensureCategory(liveChannels, OPS_CATEGORY_NAME, overwrites);

  // refresh channel list if category was just created
  const channelsAfterOps = ops.created
    ? await listGuildChannels()
    : liveChannels;

  const opsMap = {};
  const opsResults = [];
  for (const spec of OPS_CHANNELS) {
    const { channel, created } = await ensureChannel(
      channelsAfterOps,
      spec,
      ops.category.id,
    );
    opsMap[spec.name] = channel.id;
    const stubPosted = await postStubIfCreated(channel, created, spec.stub);
    opsResults.push({
      name: spec.name,
      id: channel.id,
      created,
      stubPosted,
    });
  }

  // ---- INTEL category ----
  console.log("\n=== INTEL category ===");
  const channelsForIntel = await listGuildChannels();
  const intel = await ensureCategory(
    channelsForIntel,
    INTEL_CATEGORY_NAME,
    overwrites,
  );

  const channelsAfterIntel = intel.created
    ? await listGuildChannels()
    : channelsForIntel;

  const intelMap = { inbox: {}, output: {} };
  const intelResults = [];
  for (const spec of INTEL_CHANNELS) {
    const { channel, created } = await ensureChannel(
      channelsAfterIntel,
      spec,
      intel.category.id,
    );
    if (spec.kind === "inbox") {
      intelMap.inbox[spec.slug] = channel.id;
    } else {
      intelMap.output[spec.slug] = channel.id;
    }
    const stubPosted = await postStubIfCreated(channel, created, spec.stub);
    intelResults.push({
      name: spec.name,
      id: channel.id,
      kind: spec.kind,
      slug: spec.slug,
      created,
      stubPosted,
    });
  }

  // ---- Write config ----
  const config = {
    guild_id: GUILD_ID,
    ops_category_id: ops.category.id,
    intel_category_id: intel.category.id,
    ops: opsMap,
    intel: intelMap,
    generated_at: new Date().toISOString(),
    generated_by: "scripts/discord-ops-setup.js",
    directive_source: "ogie-war-room-msg-3881-greenlight-3885",
  };
  writeConfig(config);

  // ---- Summary ----
  console.log("\n=== SUMMARY ===");
  console.log(
    `OPS category: ${OPS_CATEGORY_NAME} (${ops.category.id}) ${ops.created ? "[CREATED]" : "[existed]"}`,
  );
  for (const r of opsResults) {
    console.log(
      `  #${r.name.padEnd(24)} id=${r.id} ${r.created ? "[CREATED]" : "[existed]"} ${r.stubPosted ? "stub=posted" : "stub=skipped"}`,
    );
  }
  console.log(
    `\nINTEL category: ${INTEL_CATEGORY_NAME} (${intel.category.id}) ${intel.created ? "[CREATED]" : "[existed]"}`,
  );
  for (const r of intelResults) {
    console.log(
      `  #${r.name.padEnd(24)} [${r.kind.padEnd(6)}] id=${r.id} ${r.created ? "[CREATED]" : "[existed]"} ${r.stubPosted ? "stub=posted" : "stub=skipped"}`,
    );
  }
  console.log(
    `\n✓ Total: ${opsResults.length} OPS + ${intelResults.length} INTEL channels present`,
  );
  console.log(`✓ config written: ${CONFIG_OUT}`);
  console.log(
    `✓ Feature flag DISCORD_OPS_DASHBOARD stays FALSE (Phase 1b flips)`,
  );
}

main().catch((err) => {
  console.error("\nFATAL:", err.message);
  console.error(err.stack);
  process.exit(1);
});
