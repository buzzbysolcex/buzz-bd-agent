#!/usr/bin/env node
/**
 * signal-file-direct.js — D1 of Apr 8, 2026 directive package.
 *
 * Loads a draft signal JSON file, runs preflight (inline), and on
 * pass calls fileSignalDirect() from
 * api/services/signals/aibtc-direct-filer.js to BIP-322 sign and POST
 * directly to https://aibtc.news/api/signals.
 *
 * Reports success/failure to the War Room via the Telegram Bot API
 * (token + chat id mirror /home/claude-code/schedule-trigger.sh).
 *
 * Logs every attempt to /data/buzz-api/signal-filing.log.
 *
 * Flags:
 *   --dry-run    Skip the actual POST. Tests preflight + draft load
 *                + filer-ready check. Used by morning-signals-v2.sh
 *                during Apr 8 to avoid double-firing.
 *
 * Usage:
 *   node signal-file-direct.js <draft.json>
 *   node signal-file-direct.js <draft.json> --dry-run
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const https = require("https");

// Host path — container's /data/buzz-api maps here on host.
const LOG_PATH = "/data/buzz/persistent/buzz-api/signal-filing.log";
const TG_BOT = "8488299788:AAGKSW8EcXMg3H4za6zYs-Ed4imypi8cLZc";
const TG_CHAT = "-1003701758077";

// ── arg parsing ────────────────────────────────────────────
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const draftPath = args.find((a) => !a.startsWith("--"));

if (!draftPath) {
  console.error("Usage: signal-file-direct.js <draft.json> [--dry-run]");
  process.exit(2);
}

function logLine(line) {
  try {
    const dir = path.dirname(LOG_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(LOG_PATH, `[${new Date().toISOString()}] ${line}\n`);
  } catch (e) {
    /* best-effort */
  }
}

async function tgSend(text) {
  return new Promise((resolve) => {
    const body = JSON.stringify({ chat_id: TG_CHAT, text });
    const req = https.request(
      {
        hostname: "api.telegram.org",
        path: `/bot${TG_BOT}/sendMessage`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
        timeout: 10000,
      },
      (res) => {
        res.on("data", () => {});
        res.on("end", () => resolve(true));
      },
    );
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
    req.write(body);
    req.end();
  });
}

async function main() {
  // load draft
  if (!fs.existsSync(draftPath)) {
    logLine(`MISSING_DRAFT: ${draftPath}`);
    console.error(`draft not found: ${draftPath}`);
    process.exit(1);
  }
  let draft;
  try {
    draft = JSON.parse(fs.readFileSync(draftPath, "utf8"));
  } catch (e) {
    logLine(`BAD_JSON: ${draftPath} ${e.message}`);
    console.error(`bad JSON: ${e.message}`);
    process.exit(1);
  }

  if (draft.filed === true) {
    logLine(`ALREADY_FILED: ${draftPath} signal_id=${draft.signal_id || "?"}`);
    console.log("draft already marked filed — skipping");
    process.exit(0);
  }

  // run preflight as subprocess so failures are uniformly reported
  const pf = spawnSync(
    "node",
    [path.join(__dirname, "signal-preflight.js"), draftPath],
    { encoding: "utf8" },
  );
  const pfOut = (pf.stdout || "").trim();
  if (pf.status !== 0) {
    const reason = pfOut || (pf.stderr || "").trim() || "unknown";
    logLine(`PREFLIGHT_FAIL ${draftPath} :: ${reason}`);
    await tgSend(
      `❌ DIRECT FILE FAILED: [${draft.beat_slug}] preflight: ${reason.replace(/^PREFLIGHT_FAIL:\s*/, "")}`,
    );
    process.exit(1);
  }
  logLine(`PREFLIGHT_OK ${draftPath} :: ${pfOut}`);

  // dry-run short circuit
  if (dryRun) {
    const filer = require("../api/services/signals/aibtc-direct-filer");
    const ready = filer.checkFilerReady();
    logLine(`DRY_RUN ${draftPath} :: ready=${JSON.stringify(ready)}`);
    console.log("DRY_RUN_OK");
    console.log(`  beat: ${draft.beat_slug}`);
    console.log(`  headline: ${draft.headline}`);
    console.log(`  body_len: ${(draft.body || "").length}`);
    console.log(`  filer_ready: ${JSON.stringify(ready)}`);
    process.exit(0);
  }

  // actual file
  let filer;
  try {
    filer = require("../api/services/signals/aibtc-direct-filer");
  } catch (e) {
    logLine(`FILER_LOAD_FAIL: ${e.message}`);
    await tgSend(
      `❌ DIRECT FILE FAILED: [${draft.beat_slug}] filer load: ${e.message}`,
    );
    process.exit(1);
  }

  const result = await filer.fileSignalDirect({
    beat_slug: draft.beat_slug,
    headline: draft.headline,
    body: draft.body || "",
    sources: draft.sources || [],
    tags: draft.tags || [],
    disclosure: draft.disclosure,
  });

  const draftIdx = draft.draft_index || "?";

  if (result.success) {
    draft.filed = true;
    draft.signal_id = result.signal_id;
    draft.filed_at = new Date().toISOString();
    try {
      fs.writeFileSync(draftPath, JSON.stringify(draft, null, 2));
    } catch (e) {
      /* best-effort */
    }
    logLine(
      `FILE_OK ${draftPath} signal_id=${result.signal_id} status=${result.status}`,
    );
    await tgSend(
      `✅ DIRECT FILE #${draftIdx}: [${draft.beat_slug}] ${draft.headline} | id=${result.signal_id}`,
    );
    process.exit(0);
  } else {
    logLine(`FILE_FAIL ${draftPath} :: ${result.error}`);
    await tgSend(
      `❌ DIRECT FILE FAILED #${draftIdx}: [${draft.beat_slug}] ${result.error}`,
    );
    process.exit(1);
  }
}

main().catch(async (e) => {
  logLine(`UNCAUGHT: ${e.message}`);
  await tgSend(`❌ DIRECT FILE FAILED: uncaught ${e.message}`);
  process.exit(1);
});
