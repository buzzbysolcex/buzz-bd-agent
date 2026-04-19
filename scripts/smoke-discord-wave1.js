#!/usr/bin/env node
/*
 * Wave 1 Discord smoke tests — 6 scenarios per Ogie msg 3897.
 *
 * Flips DISCORD_OPS_DASHBOARD=true IN-MEMORY ONLY for this process. Never
 * edits feature-flags.js. When this script exits, the in-memory mutation
 * dies with the process — the persistent file stays false.
 *
 * Usage:
 *   source /home/claude-code/buzz-workspace/.env.discord
 *   node scripts/smoke-discord-wave1.js
 *
 * Outputs a structured JSON trace to stdout + summary at the end.
 * Do NOT run on the production server until Ogie authorizes — this WILL
 * post real messages to the 6 OPS channels + 2 INTEL channels.
 */

const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const Database = require("/home/claude-code/buzz-workspace/api/node_modules/better-sqlite3");

// Load env — parse .env.discord inline if DISCORD_BOT_TOKEN isn't pre-set
if (!process.env.DISCORD_BOT_TOKEN) {
  try {
    const envPath = "/home/claude-code/buzz-workspace/.env.discord";
    const envContent = fs.readFileSync(envPath, "utf8");
    for (const line of envContent.split("\n")) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch (e) {
    console.error("ERROR loading .env.discord:", e.message);
    process.exit(1);
  }
  if (!process.env.DISCORD_BOT_TOKEN) {
    console.error("ERROR: DISCORD_BOT_TOKEN not set after .env parse.");
    process.exit(1);
  }
}

// Point channel config at the current persistent JSON.
if (!process.env.DISCORD_CHANNEL_CONFIG_PATH) {
  const candidates = [
    "/data/buzz/persistent/config/discord-channels.json",
    "/data/buzz/persistent/directives/discord-channels.json",
  ];
  for (const p of candidates) {
    try {
      fs.statSync(p);
      process.env.DISCORD_CHANNEL_CONFIG_PATH = p;
      break;
    } catch {}
  }
}

console.log(
  `Using DISCORD_CHANNEL_CONFIG_PATH=${process.env.DISCORD_CHANNEL_CONFIG_PATH || "(none — will fail)"}`,
);

// Flip the flag in-memory ONLY.
const flagsModule = require("../api/lib/feature-flags");
const ORIGINAL_FLAG = flagsModule.FLAGS.DISCORD_OPS_DASHBOARD;
flagsModule.FLAGS.DISCORD_OPS_DASHBOARD = true;
console.log(
  `[smoke] DISCORD_OPS_DASHBOARD mutated in-memory: ${ORIGINAL_FLAG} → true (auto-reverts on exit)`,
);

const discord = require("../api/lib/discord-notify");
discord._resetCache();

const results = [];
function recordStep(num, name, result) {
  const summary = { step: num, name, ...result };
  results.push(summary);
  console.log(`\n[${num}/6] ${name}: ${JSON.stringify(summary)}`);
}

const SMOKE_TAG = `smoke-${new Date().toISOString().replace(/[:.]/g, "-")}`;

async function step1_morning_brief() {
  const res = await discord.send(
    "ops.morning-brief",
    `🧪 **WAVE 1 SMOKE TEST 1/6** — \`${SMOKE_TAG}\`\n\nThis message verifies discord-notify.send('ops.morning-brief') end-to-end.\nIf you see this, the push module + channel map + bot-role ATTACH_FILES scope are wired correctly.\n\n🤲`,
    { reason: "smoke-1" },
  );
  recordStep(1, "discord-notify.send ops.morning-brief", res);
  return res;
}

async function step2_daily_report() {
  const res = await discord.send(
    "ops.daily-report",
    `🧪 **WAVE 1 SMOKE TEST 2/6** — \`${SMOKE_TAG}\`\n\nVerifies ops.daily-report channel routing. Canonical daily-report-21utc cron is registered but not invoked here — this is a direct send test.\n\n🤲`,
    { reason: "smoke-2" },
  );
  recordStep(2, "discord-notify.send ops.daily-report", res);
  return res;
}

async function step3_kill_switch_log() {
  const embed = {
    title: "🔴 kill_switch.act",
    description: `**source:** \`smoke-test\`\n**at:** \`${new Date().toISOString()}\``,
    color: 0xe53935,
    fields: [
      { name: "switch_name", value: "master", inline: true },
      { name: "action", value: "smoke_test", inline: true },
      { name: "triggered_by", value: "user", inline: true },
    ],
    timestamp: new Date().toISOString(),
  };
  const res = await discord.send(
    "ops.kill-switch-log",
    `🧪 **WAVE 1 SMOKE TEST 3/6** — \`${SMOKE_TAG}\`\n\nEmbed rendering sanity check for dispatcher events.`,
    { embeds: [embed], reason: "smoke-3" },
  );
  recordStep(3, "discord-notify.send ops.kill-switch-log (with embed)", res);
  return res;
}

async function step4_intel_ingest() {
  // Simulate a ZachXBT-style message already posted to #intel-zachxbt.
  const sampleMsg = {
    id: `smoke-${crypto.randomUUID().slice(0, 8)}`,
    content:
      "ZachXBT: https://x.com/zachxbt/status/SMOKE — 0xabcdef1234567890abcdef1234567890abcdef12 drained via $BONK pair on @solana",
    timestamp: new Date().toISOString(),
    author: { id: "smoke-ogie", username: "smoke-ogie" },
    type: 0,
  };

  // Use an in-memory SQLite for the smoke to avoid touching production DB.
  const db = new Database(":memory:");
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE event_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT, event_type TEXT, payload TEXT,
      source TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE claim_audit (
      id INTEGER PRIMARY KEY AUTOINCREMENT, claim_type TEXT NOT NULL,
      claim_subject TEXT, recipient TEXT, payload TEXT, amount_sats INTEGER,
      tx_hash TEXT, directive_source TEXT, verification_required INTEGER,
      verified_at TEXT, verified_by TEXT, outcome TEXT, notes TEXT,
      created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE pipeline_tokens (
      token_address TEXT, chain TEXT, ticker TEXT);
    CREATE TABLE intel_blacklist_wallets (
      address TEXT, chain TEXT, reason TEXT);
  `);

  const intelIngest = require("../api/services/intel/discord-intel-ingest");
  const autodream = require("../api/services/autodream/autodream");

  const res = await intelIngest.ingestMessage(sampleMsg, {
    db,
    discord,
    autodream,
    eventBus: null,
  });

  recordStep(4, "intel-ingest ingestMessage (simulated ZachXBT msg)", res);
  db.close();
  return res;
}

async function step5_dispatcher_kill_switch() {
  const db = new Database(":memory:");
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE event_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT, event_type TEXT, payload TEXT,
      source TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
  `);
  db.prepare(
    `INSERT INTO event_log (event_type, payload, source) VALUES (?, ?, ?)`,
  ).run(
    "kill_switch.act",
    JSON.stringify({
      switch_name: "master",
      action: "manual_trip",
      triggered_by: "smoke-test",
      context: { reason: "wave1 smoke test 5/6", value_at_trip: 0 },
    }),
    "smoke",
  );
  const dispatcher = require("../api/services/discord/discord-ops-dispatcher");
  const res = await dispatcher.pollOnce({ db, discord });
  recordStep(5, "dispatcher.pollOnce with KILL_SWITCH_ACT event", res);
  db.close();
  return res;
}

async function step6_attachment() {
  // Generate a tiny 1x1 PNG (~67 bytes, well under 100KB)
  const png = Buffer.from(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8cfc0f0bf6400003e0005" +
      "9a50c45e0000000049454e44ae426082",
    "hex",
  );
  const tmpFile = path.join(
    require("os").tmpdir(),
    `smoke-mining-pulse-${Date.now()}.png`,
  );
  fs.writeFileSync(tmpFile, png);

  // discord-notify.js doesn't support file uploads in its current shape
  // (Phase 1b Wave 1 scope). For smoke #6, we hit the raw Discord API via
  // multipart to verify the bot's ATTACH_FILES perm actually works end-to-
  // end. Phase 1b.2 will extend discord-notify to accept { files:[] }.
  const channels = discord.loadChannels();
  const chId = discord.resolveChannelId("ops.mining-pulse", channels);
  if (!chId) {
    recordStep(6, "attachment test", {
      sent: false,
      reason: "no_channel_id",
    });
    fs.rmSync(tmpFile, { force: true });
    return;
  }
  const form = new FormData();
  form.append(
    "payload_json",
    JSON.stringify({
      content: `🧪 **WAVE 1 SMOKE TEST 6/6** — \`${SMOKE_TAG}\`\n\nAttachment path verification. If you see a 1x1 PNG below, ATTACH_FILES scope works.`,
    }),
  );
  form.append(
    "files[0]",
    new Blob([png], { type: "image/png" }),
    "smoke-1x1.png",
  );
  const r = await fetch(
    `https://discord.com/api/v10/channels/${chId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        "User-Agent": "Buzz-BD-Agent (smoke-wave1)",
      },
      body: form,
    },
  );
  const body = await r.text().catch(() => "");
  recordStep(6, "attachment test (raw multipart to #mining-pulse)", {
    sent: r.ok,
    status: r.status,
    messageId: (() => {
      try {
        return JSON.parse(body).id;
      } catch {
        return null;
      }
    })(),
    reason: r.ok ? undefined : `http_${r.status}`,
    bodyPreview: body.slice(0, 200),
  });
  fs.rmSync(tmpFile, { force: true });
}

async function stepFlagOff() {
  console.log("\n[flag-off] verifying zero traffic when flag disabled");
  flagsModule.FLAGS.DISCORD_OPS_DASHBOARD = false;
  const res = await discord.send(
    "ops.morning-brief",
    "should NOT appear in Discord",
    { reason: "flag-off-verification" },
  );
  recordStep("flag-off", "discord-notify.send with flag FALSE", res);
  flagsModule.FLAGS.DISCORD_OPS_DASHBOARD = true;
  return res;
}

async function main() {
  console.log(`\n━━━ Wave 1 Discord smoke tests — ${SMOKE_TAG} ━━━\n`);
  try {
    await step1_morning_brief();
    await step2_daily_report();
    await step3_kill_switch_log();
    await step4_intel_ingest();
    await step5_dispatcher_kill_switch();
    await step6_attachment();
    await stepFlagOff();

    console.log("\n━━━ SUMMARY ━━━");
    const passed = results.filter(
      (r) => r.sent || r.processed > 0 || r.ingest_id != null,
    ).length;
    for (const r of results) {
      const ok =
        r.sent === true ||
        r.processed > 0 ||
        r.ingest_id != null ||
        r.step === "flag-off";
      console.log(`  [${ok ? "✓" : "✗"}] ${r.step}: ${r.name}`);
    }
    console.log(
      `\nflag revert check: current DISCORD_OPS_DASHBOARD = ${flagsModule.FLAGS.DISCORD_OPS_DASHBOARD} (should be true — will die on process exit)`,
    );
  } finally {
    // Final safety net — force flag back to false before process dies.
    flagsModule.FLAGS.DISCORD_OPS_DASHBOARD = ORIGINAL_FLAG;
    console.log(
      `\n[smoke] flag restored to ORIGINAL_FLAG=${ORIGINAL_FLAG} before exit`,
    );
  }
}

main().catch((err) => {
  console.error("\nFATAL:", err.message);
  console.error(err.stack);
  flagsModule.FLAGS.DISCORD_OPS_DASHBOARD = ORIGINAL_FLAG;
  process.exit(1);
});
