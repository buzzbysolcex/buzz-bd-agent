#!/usr/bin/env node
/**
 * test-pashov-sse-integration.js — P2-path local smoke test.
 *
 * Exercises the SSE + commitPashovOutbox flow against a temporary SQLite
 * DB + temporary outbox fixture. Does NOT hit the live container, does
 * NOT touch prod tables, does NOT require PASHOV_ENABLED=true.
 *
 * Validates:
 *   1. commitPashovOutbox is idempotent (running twice yields same UPDATE)
 *   2. commitPashovOutbox clamps bad verdict/status to schema CHECKs
 *   3. Row shape round-trips the runner JSON fields we care about
 *
 * Run:   node scripts/test-pashov-sse-integration.js
 */
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const Database = require("../api/node_modules/better-sqlite3");

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pashov-sse-test-"));
const tmpOutbox = path.join(tmpRoot, "outbox");
fs.mkdirSync(tmpOutbox, { recursive: true });

// Minimal pashov_audits schema matching production CHECKs.
const db = new Database(":memory:");
db.exec(`
CREATE TABLE pashov_audits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  audit_id TEXT UNIQUE NOT NULL,
  contract_address TEXT NOT NULL,
  chain_id INTEGER,
  chain_name TEXT,
  contract_name TEXT,
  compiler_version TEXT,
  skill_used TEXT CHECK(skill_used IN ('x-ray','solidity-auditor','both')),
  mode TEXT,
  findings_count INTEGER DEFAULT 0,
  findings_high INTEGER DEFAULT 0,
  findings_medium INTEGER DEFAULT 0,
  findings_low INTEGER DEFAULT 0,
  leads_count INTEGER DEFAULT 0,
  runtime_seconds INTEGER,
  findings_json TEXT,
  verdict TEXT CHECK(verdict IN ('CLEAN','LOW_RISK','MEDIUM_RISK','HIGH_RISK','CRITICAL','INCONCLUSIVE')),
  recommendation TEXT,
  report_markdown_path TEXT,
  triggered_by TEXT,
  status TEXT DEFAULT 'complete' CHECK(status IN ('pending','running','complete','failed')),
  created_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT
);
`);

// Inline the helper under test — cannot require() the route module without
// a full express + feature-flag stack, and the helper is self-contained.
function makeCommitter(outboxDir) {
  const verdictAllowed = new Set([
    "CLEAN",
    "LOW_RISK",
    "MEDIUM_RISK",
    "HIGH_RISK",
    "CRITICAL",
    "INCONCLUSIVE",
  ]);
  const statusAllowed = new Set(["pending", "running", "complete", "failed"]);
  return function commitPashovOutbox(db, audit_id) {
    const outFile = path.join(outboxDir, `${audit_id}.out.json`);
    if (!fs.existsSync(outFile)) return null;
    let parsed;
    try {
      parsed = JSON.parse(fs.readFileSync(outFile, "utf8"));
    } catch {
      return null;
    }
    const verdict = verdictAllowed.has(parsed.verdict)
      ? parsed.verdict
      : "INCONCLUSIVE";
    const status = statusAllowed.has(parsed.status) ? parsed.status : "failed";
    try {
      db.prepare(
        `UPDATE pashov_audits
           SET status=?, verdict=?, contract_name=COALESCE(?,contract_name),
               compiler_version=COALESCE(?,compiler_version),
               findings_count=?, findings_high=?, findings_medium=?, findings_low=?,
               leads_count=?, findings_json=?, runtime_seconds=?, recommendation=?,
               report_markdown_path=COALESCE(?,report_markdown_path),
               completed_at=COALESCE(completed_at, datetime('now'))
         WHERE audit_id=?`,
      ).run(
        status,
        verdict,
        parsed.contract_name || null,
        parsed.compiler || null,
        parsed.findings_count || 0,
        parsed.findings_high || 0,
        parsed.findings_medium || 0,
        parsed.findings_low || 0,
        parsed.leads_count || 0,
        JSON.stringify(parsed.findings_json || []),
        parsed.runtime_seconds || 0,
        (parsed.recommendation || "").slice(0, 500),
        parsed.report_path || null,
        audit_id,
      );
    } catch {
      return null;
    }
    return parsed;
  };
}

const commit = makeCommitter(tmpOutbox);

let failed = 0;
function assert(name, cond, detail) {
  if (cond) console.log(`✓ ${name}`);
  else {
    failed++;
    console.log(`✗ ${name}${detail ? " — " + detail : ""}`);
  }
}

// ── Fixture 1: happy path ────────────────────────────────────────────
const a1 = "audit-test-happy";
db.prepare(
  `INSERT INTO pashov_audits
   (audit_id, contract_address, chain_id, chain_name, skill_used, mode,
    status, triggered_by, created_at)
   VALUES (?, '0xdead', 1, 'ethereum', 'solidity-auditor', 'deep',
           'pending', 'test', datetime('now'))`,
).run(a1);

fs.writeFileSync(
  path.join(tmpOutbox, `${a1}.out.json`),
  JSON.stringify({
    audit_id: a1,
    status: "complete",
    verdict: "HIGH_RISK",
    contract_name: "TestContract",
    compiler: "v0.8.24+commit.e11b9ed9",
    findings_count: 5,
    findings_high: 2,
    findings_medium: 2,
    findings_low: 1,
    leads_count: 0,
    findings_json: [{ severity: "HIGH", title: "Reentrancy in withdraw" }],
    runtime_seconds: 187,
    recommendation: "Fix reentrancy before mainnet",
    report_path: "/data/pashov-queue/reports/audit-test-happy.md",
    completed_at: "2026-04-19T07:00:00Z",
  }),
);

const c1 = commit(db, a1);
assert("happy path returns parsed", !!c1);
const row1 = db.prepare("SELECT * FROM pashov_audits WHERE audit_id=?").get(a1);
assert("happy: status=complete", row1.status === "complete");
assert("happy: verdict=HIGH_RISK", row1.verdict === "HIGH_RISK");
assert("happy: contract_name stored", row1.contract_name === "TestContract");
assert("happy: findings_count=5", row1.findings_count === 5);
assert("happy: runtime=187", row1.runtime_seconds === 187);
assert(
  "happy: findings_json parses",
  JSON.parse(row1.findings_json).length === 1,
);

// ── Fixture 2: idempotency — run twice ──────────────────────────────
const c2 = commit(db, a1);
const row2 = db.prepare("SELECT * FROM pashov_audits WHERE audit_id=?").get(a1);
assert("idempotent: second commit returns parsed", !!c2);
assert(
  "idempotent: findings unchanged",
  row2.findings_count === row1.findings_count,
);
assert(
  "idempotent: completed_at unchanged (COALESCE protects it)",
  row2.completed_at === row1.completed_at,
);

// ── Fixture 3: bad verdict clamps to INCONCLUSIVE ───────────────────
const a3 = "audit-test-badverdict";
db.prepare(
  `INSERT INTO pashov_audits
   (audit_id, contract_address, chain_id, chain_name, skill_used, mode,
    status, triggered_by, created_at)
   VALUES (?, '0xbeef', 1, 'ethereum', 'solidity-auditor', 'deep',
           'pending', 'test', datetime('now'))`,
).run(a3);
fs.writeFileSync(
  path.join(tmpOutbox, `${a3}.out.json`),
  JSON.stringify({
    audit_id: a3,
    status: "complete",
    verdict: "SPICY", // not in CHECK
    findings_count: 0,
  }),
);
commit(db, a3);
const row3 = db
  .prepare("SELECT verdict FROM pashov_audits WHERE audit_id=?")
  .get(a3);
assert("bad verdict clamps to INCONCLUSIVE", row3.verdict === "INCONCLUSIVE");

// ── Fixture 4: bad status clamps to failed ──────────────────────────
const a4 = "audit-test-badstatus";
db.prepare(
  `INSERT INTO pashov_audits
   (audit_id, contract_address, chain_id, chain_name, skill_used, mode,
    status, triggered_by, created_at)
   VALUES (?, '0xcafe', 1, 'ethereum', 'solidity-auditor', 'deep',
           'pending', 'test', datetime('now'))`,
).run(a4);
fs.writeFileSync(
  path.join(tmpOutbox, `${a4}.out.json`),
  JSON.stringify({
    audit_id: a4,
    status: "wedged", // not in CHECK
    verdict: "CLEAN",
  }),
);
commit(db, a4);
const row4 = db
  .prepare("SELECT status FROM pashov_audits WHERE audit_id=?")
  .get(a4);
assert("bad status clamps to failed", row4.status === "failed");

// ── Fixture 5: missing outbox returns null ──────────────────────────
const c5 = commit(db, "does-not-exist");
assert("missing outbox returns null", c5 === null);

// ── Fixture 6: corrupt JSON returns null, row unchanged ─────────────
const a6 = "audit-test-corrupt";
db.prepare(
  `INSERT INTO pashov_audits
   (audit_id, contract_address, chain_id, chain_name, skill_used, mode,
    status, triggered_by, created_at)
   VALUES (?, '0xface', 1, 'ethereum', 'solidity-auditor', 'deep',
           'pending', 'test', datetime('now'))`,
).run(a6);
fs.writeFileSync(path.join(tmpOutbox, `${a6}.out.json`), "{not valid json");
const c6 = commit(db, a6);
const row6 = db
  .prepare("SELECT status FROM pashov_audits WHERE audit_id=?")
  .get(a6);
assert("corrupt json returns null", c6 === null);
assert("corrupt json leaves row in pending", row6.status === "pending");

// Cleanup
fs.rmSync(tmpRoot, { recursive: true, force: true });
db.close();

if (failed) {
  console.log(`\n${failed} failed`);
  process.exit(1);
}
console.log("\nall pass");
