#!/usr/bin/env node
/**
 * signal-preflight.js — D1 of Apr 8, 2026 directive package.
 *
 * Validates a draft signal JSON file before the direct filer attempts
 * to BIP-322 sign and POST it. Three checks:
 *
 *   1. Wallet creds available (env or /data/.env.aibtc or
 *      /home/claude-code/.env.aibtc)
 *   2. Cooldown — last filing in aibtc_signals_filed must be > 60min ago
 *   3. Duplicate scan — last 30 headlines must not share >= 60% of
 *      keyword tokens (case-insensitive) with the draft headline
 *
 * Usage: node signal-preflight.js <path-to-draft.json>
 * Exits 0 with PREFLIGHT_OK on success, 1 with PREFLIGHT_FAIL: <reason>
 * on failure.
 */

const fs = require("fs");
const path = require("path");

const BUZZ_DB = "/data/buzz/persistent/buzz-api/buzz.db";
const SQLITE_PATH =
  "/home/claude-code/buzz-workspace/api/node_modules/better-sqlite3";
const COOLDOWN_MIN = 60;
const DUP_OVERLAP = 0.6;
const RECENT_LIMIT = 30;
// AIBTC API caps — server returns 400 if exceeded.
const HEADLINE_MAX = 120;
const SOURCE_TITLE_MAX = 200;
const DAILY_CAP = 6;

function fail(reason) {
  console.log(`PREFLIGHT_FAIL: ${reason}`);
  process.exit(1);
}

function ok(extra) {
  console.log(`PREFLIGHT_OK${extra ? " " + extra : ""}`);
  process.exit(0);
}

// ── parse args ─────────────────────────────────────────────
const draftPath = process.argv[2];
if (!draftPath) {
  fail("missing draft file path argument");
}
if (!fs.existsSync(draftPath)) {
  fail(`draft file not found: ${draftPath}`);
}

let draft;
try {
  draft = JSON.parse(fs.readFileSync(draftPath, "utf8"));
} catch (e) {
  fail(`invalid JSON in draft: ${e.message}`);
}

if (!draft.beat_slug || !draft.headline) {
  fail("draft missing beat_slug or headline");
}

// AIBTC server-side caps — fail fast before BIP-322 + network round-trip.
if (draft.headline.length > HEADLINE_MAX) {
  fail(
    `headline ${draft.headline.length}c exceeds AIBTC ${HEADLINE_MAX}c cap`,
  );
}
if (Array.isArray(draft.sources)) {
  for (let i = 0; i < draft.sources.length; i++) {
    const s = draft.sources[i];
    if (s && typeof s.title === "string" && s.title.length > SOURCE_TITLE_MAX) {
      fail(
        `source[${i}].title ${s.title.length}c exceeds AIBTC ${SOURCE_TITLE_MAX}c cap`,
      );
    }
  }
}

// ── 1. wallet creds ────────────────────────────────────────
function getWalletCreds() {
  if (process.env.AIBTC_BTC_WIF && process.env.AIBTC_BTC_ADDRESS) {
    return {
      wif: process.env.AIBTC_BTC_WIF,
      address: process.env.AIBTC_BTC_ADDRESS,
    };
  }
  const paths = ["/home/claude-code/.env.aibtc", "/data/.env.aibtc"];
  for (const p of paths) {
    try {
      if (!fs.existsSync(p)) continue;
      const content = fs.readFileSync(p, "utf8");
      const wifMatch = content.match(/AIBTC_BTC_WIF=(.+)/);
      const addrMatch = content.match(/AIBTC_BTC_ADDRESS=(.+)/);
      if (wifMatch && addrMatch) {
        return { wif: wifMatch[1].trim(), address: addrMatch[1].trim() };
      }
    } catch (e) {}
  }
  return null;
}

const creds = getWalletCreds();
if (!creds) {
  fail("wallet creds not found (AIBTC_BTC_WIF + AIBTC_BTC_ADDRESS)");
}

// ── 2 + 3. cooldown + duplicate scan ───────────────────────
let Database;
try {
  Database = require(SQLITE_PATH);
} catch (e) {
  fail(`better-sqlite3 not loadable from ${SQLITE_PATH}: ${e.message}`);
}

let db;
try {
  db = new Database(BUZZ_DB, { readonly: true, fileMustExist: true });
} catch (e) {
  fail(`cannot open buzz.db: ${e.message}`);
}

// cooldown
let lastFiledRow;
try {
  lastFiledRow = db
    .prepare(
      `SELECT filed_at FROM aibtc_signals_filed
       ORDER BY filed_at DESC LIMIT 1`,
    )
    .get();
} catch (e) {
  fail(`cooldown query failed: ${e.message}`);
}

if (lastFiledRow && lastFiledRow.filed_at) {
  const lastTs = new Date(lastFiledRow.filed_at + "Z").getTime();
  if (!Number.isNaN(lastTs)) {
    const ageMin = (Date.now() - lastTs) / 60000;
    if (ageMin < COOLDOWN_MIN) {
      fail(
        `cooldown active — last signal filed ${ageMin.toFixed(1)}min ago, need ${COOLDOWN_MIN}min`,
      );
    }
  }
}

// duplicate scan
function tokenize(s) {
  return new Set(
    String(s)
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 4),
  );
}

const draftTokens = tokenize(draft.headline);
if (draftTokens.size === 0) {
  fail("draft headline has no significant keywords");
}

let recent;
try {
  recent = db
    .prepare(
      `SELECT headline FROM aibtc_signals_filed
       ORDER BY filed_at DESC LIMIT ?`,
    )
    .all(RECENT_LIMIT);
} catch (e) {
  fail(`duplicate query failed: ${e.message}`);
}

for (const row of recent) {
  if (!row.headline) continue;
  const recentTokens = tokenize(row.headline);
  if (recentTokens.size === 0) continue;
  let overlap = 0;
  for (const t of draftTokens) if (recentTokens.has(t)) overlap++;
  const ratio = overlap / draftTokens.size;
  if (ratio >= DUP_OVERLAP) {
    fail(
      `duplicate detected (${(ratio * 100).toFixed(0)}% overlap with: "${row.headline.slice(0, 80)}")`,
    );
  }
}

db.close();
ok(`(beat=${draft.beat_slug} headline_len=${draft.headline.length})`);
