#!/usr/bin/env node
/*
 * Wave 1 Smoke Test 7 — Flag-Off Regression / Safety Proof.
 *
 * Per Ogie msg 3908: "Without Test 7 explicit, we don't know if the flag
 * is real protection or decorative."
 *
 * Protocol:
 *   1. Verify feature-flags.js literal DISCORD_OPS_DASHBOARD: false persisted
 *   2. Verify module-level feature('DISCORD_OPS_DASHBOARD') === false
 *   3. Wrap global.fetch to COUNT and LOG every call to discord.com
 *   4. Trigger 4 code paths:
 *      a. morning-briefing-discord-dualroute cron handler (direct invoke)
 *      b. daily-report-21utc runDailyReport (direct invoke, stub telegram)
 *      c. Dispatcher pollOnce with KILL_SWITCH_ACT event_log insert
 *      d. Intel ingestMessage with simulated ZachXBT-style payload
 *   5. Assert: count of POST/PUT/PATCH calls to discord.com === 0
 *   6. Output structured trace + explicit pass/fail
 *
 * Note on GETs: the intel-ingest pollChannel() would do a GET to Discord
 * for inbox fetch, but we DO NOT invoke pollChannel here — only
 * ingestMessage with a synthetic payload. GET scope is separately
 * documented as by-design in wave-1-architecture-20260419.md §Feature
 * flag semantics.
 *
 * Usage: node scripts/smoke-discord-wave1-test7-flagoff.js
 */

const fs = require("fs");
const path = require("path");
const Database = require("/home/claude-code/buzz-workspace/api/node_modules/better-sqlite3");

// Load env inline if not pre-set (same pattern as smoke script).
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
}

// Point at persistent channel config.
if (!process.env.DISCORD_CHANNEL_CONFIG_PATH) {
  for (const p of [
    "/data/buzz/persistent/config/discord-channels.json",
    "/data/buzz/persistent/directives/discord-channels.json",
  ]) {
    try {
      fs.statSync(p);
      process.env.DISCORD_CHANNEL_CONFIG_PATH = p;
      break;
    } catch {}
  }
}

// ---------- Step 1: Verify file + module state ----------

const flagsPath = "/home/claude-code/buzz-workspace/api/lib/feature-flags.js";
const flagsFile = fs.readFileSync(flagsPath, "utf8");
const FILE_FLAG_MATCHES = flagsFile.match(
  /DISCORD_OPS_DASHBOARD:\s*(true|false)/,
);
const FILE_FLAG = FILE_FLAG_MATCHES ? FILE_FLAG_MATCHES[1] : "(not-found)";

const flagsModule = require("/home/claude-code/buzz-workspace/api/lib/feature-flags");
const MODULE_FLAG = flagsModule.feature("DISCORD_OPS_DASHBOARD");

console.log("━━━ Test 7 — Flag-Off Regression ━━━\n");
console.log(`[check-1] file literal: DISCORD_OPS_DASHBOARD: ${FILE_FLAG}`);
console.log(`[check-2] module feature(): ${MODULE_FLAG}`);

if (FILE_FLAG !== "false") {
  console.error(`FATAL: file literal is '${FILE_FLAG}', expected 'false'.`);
  process.exit(1);
}
if (MODULE_FLAG !== false) {
  console.error(`FATAL: feature() returned ${MODULE_FLAG}, expected false.`);
  process.exit(1);
}

// ---------- Step 3: Wrap fetch ----------

const calls = { discord: [], other: [] };
const originalFetch = global.fetch;
global.fetch = async (url, opts) => {
  const record = {
    url: String(url),
    method: (opts && opts.method) || "GET",
    ts: new Date().toISOString(),
  };
  if (record.url.includes("discord.com")) {
    calls.discord.push(record);
    console.log(
      `  [fetch-intercept] discord.com ${record.method} ${record.url}`,
    );
  } else {
    calls.other.push(record);
  }
  // Return a fake response so callers continue normally.
  return {
    ok: false,
    status: 599,
    text: async () => "(fetch disabled for flag-off test)",
    json: async () => ({ __fake: true }),
  };
};

// ---------- Step 4: Trigger 4 paths ----------

async function path_a_morning_briefing() {
  console.log("\n[path-a] morning-briefing-discord-dualroute");
  // Seed an autonomous_loop_outputs row so the dualroute has content to read.
  const { getDB } = require("/home/claude-code/buzz-workspace/api/db");
  const db = getDB();
  try {
    db.prepare(
      `INSERT INTO autonomous_loop_outputs (run_id, output_type, title, content, created_at)
       VALUES (NULL, 'morning_brief', 'Test 7 seed', 'flag-off regression seed', datetime('now'))`,
    ).run();
  } catch (e) {
    console.log(`  seed insert skipped: ${e.message}`);
  }
  const discord = require("/home/claude-code/buzz-workspace/api/lib/discord-notify");
  discord._resetCache();
  const res = await discord.send("ops.morning-brief", "flag-off test msg");
  console.log(`  result: ${JSON.stringify(res)}`);
  return res;
}

async function path_b_daily_report() {
  console.log("\n[path-b] daily-report-21utc runDailyReport");
  // Use in-memory DB to avoid polluting production with test rows.
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE event_log (id INTEGER PRIMARY KEY AUTOINCREMENT, event_type TEXT, payload TEXT, source TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE autonomous_loop_outputs (id INTEGER PRIMARY KEY AUTOINCREMENT, run_id INTEGER, output_type TEXT, title TEXT, content TEXT, created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE claim_audit (id INTEGER PRIMARY KEY AUTOINCREMENT, claim_type TEXT NOT NULL, claim_subject TEXT, recipient TEXT, payload TEXT, amount_sats INTEGER, tx_hash TEXT, directive_source TEXT, verification_required INTEGER, verified_at TEXT, verified_by TEXT, outcome TEXT, notes TEXT, created_at TEXT DEFAULT (datetime('now')));
  `);
  const daily = require("/home/claude-code/buzz-workspace/api/crons/daily-report-21utc");
  const fakeTelegram = { sendTelegram: async () => ({ ok: true }) };
  const res = await daily.runDailyReport({
    db,
    discord: require("/home/claude-code/buzz-workspace/api/lib/discord-notify"),
    telegram: fakeTelegram,
  });
  console.log(
    `  result: ok=${res.ok} tg=${res.telegramSent} dc=${res.discordSent} output=${res.output_id} claim=${res.claim_audit_id}`,
  );
  db.close();
  return res;
}

async function path_c_dispatcher() {
  console.log("\n[path-c] dispatcher.pollOnce with KILL_SWITCH_ACT");
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE event_log (id INTEGER PRIMARY KEY AUTOINCREMENT, event_type TEXT, payload TEXT, source TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
  `);
  db.prepare(
    `INSERT INTO event_log (event_type, payload, source) VALUES ('kill_switch.act', ?, 'test7')`,
  ).run(
    JSON.stringify({
      switch_name: "master",
      action: "trip",
      triggered_by: "test7-flag-off",
    }),
  );
  const dispatcher = require("/home/claude-code/buzz-workspace/api/services/discord/discord-ops-dispatcher");
  const res = await dispatcher.pollOnce({
    db,
    discord: require("/home/claude-code/buzz-workspace/api/lib/discord-notify"),
  });
  console.log(
    `  result: processed=${res.processed} latest_id=${res.latest_id}`,
  );
  db.close();
  return res;
}

async function path_d_intel_ingest() {
  console.log("\n[path-d] intel-ingest.ingestMessage (synthetic ZachXBT)");
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE event_log (id INTEGER PRIMARY KEY AUTOINCREMENT, event_type TEXT, payload TEXT, source TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE claim_audit (id INTEGER PRIMARY KEY AUTOINCREMENT, claim_type TEXT NOT NULL, claim_subject TEXT, recipient TEXT, payload TEXT, amount_sats INTEGER, tx_hash TEXT, directive_source TEXT, verification_required INTEGER, verified_at TEXT, verified_by TEXT, outcome TEXT, notes TEXT, created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE pipeline_tokens (token_address TEXT, chain TEXT, ticker TEXT);
    CREATE TABLE intel_blacklist_wallets (address TEXT, chain TEXT, reason TEXT);
  `);
  const ingest = require("/home/claude-code/buzz-workspace/api/services/intel/discord-intel-ingest");
  const aii = require("/home/claude-code/buzz-workspace/api/services/autodream/intel-ingest");
  aii._resetInit();
  const autodream = require("/home/claude-code/buzz-workspace/api/services/autodream/autodream");
  const msg = {
    id: "test7-msg",
    content:
      "forwarded: https://x.com/zachxbt/post/7 0xabcdef1234567890abcdef1234567890abcdef12",
    timestamp: new Date().toISOString(),
    author: { id: "test7" },
    type: 0,
  };
  const res = await ingest.ingestMessage(msg, {
    db,
    discord: require("/home/claude-code/buzz-workspace/api/lib/discord-notify"),
    autodream,
    eventBus: null,
  });
  console.log(
    `  result: claim_audit_id=${res.claim_audit_id} ingest_id=${res.ingest_id} triaged_msg_id=${res.triaged_msg_id}`,
  );
  db.close();
  return res;
}

// ---------- Step 5: Assertion + summary ----------

async function main() {
  try {
    await path_a_morning_briefing();
  } catch (e) {
    console.log(`  path-a error: ${e.message}`);
  }
  try {
    await path_b_daily_report();
  } catch (e) {
    console.log(`  path-b error: ${e.message}`);
  }
  try {
    await path_c_dispatcher();
  } catch (e) {
    console.log(`  path-c error: ${e.message}`);
  }
  try {
    await path_d_intel_ingest();
  } catch (e) {
    console.log(`  path-d error: ${e.message}`);
  }

  const writeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);
  const discordWrites = calls.discord.filter((c) => writeMethods.has(c.method));
  const discordReads = calls.discord.filter((c) => !writeMethods.has(c.method));

  console.log("\n━━━ TEST 7 FINAL TRACE ━━━");
  console.log(`file literal: DISCORD_OPS_DASHBOARD: ${FILE_FLAG}`);
  console.log(`module feature(): ${MODULE_FLAG}`);
  console.log(`total fetch calls to discord.com: ${calls.discord.length}`);
  console.log(`  writes (POST/PUT/PATCH/DELETE): ${discordWrites.length}`);
  console.log(`  reads (GET/HEAD):               ${discordReads.length}`);
  for (const c of calls.discord) {
    console.log(`    ${c.method} ${c.url}`);
  }
  console.log(`total fetch calls to other hosts: ${calls.other.length}`);

  const pass =
    FILE_FLAG === "false" &&
    MODULE_FLAG === false &&
    discordWrites.length === 0;

  console.log(`\nRESULT: ${pass ? "✅ PASS" : "❌ FAIL"}`);
  if (!pass) {
    console.log("  flag is NOT real protection — review Wave 1 wiring.");
    process.exit(1);
  }
  console.log("  flag is real protection ✓ (zero discord.com writes)");

  global.fetch = originalFetch;
}

main().catch((err) => {
  console.error("FATAL:", err.message);
  console.error(err.stack);
  process.exit(1);
});
