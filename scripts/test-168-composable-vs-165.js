#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * BuzzShield #168 — Composable XCVM cross-pollination validation against #165.
 *
 * Per detector-pr-template.md (mandatory end-to-end test): walks
 * emit (fixture synthesis) → collect (#165 invocation per fixture) →
 * consume (verdict assertion per C-N).
 *
 * Three fixtures exercised:
 *   c1-substrate-bech32-encoding-bug    — expect ZERO findings (NEW_DETECTOR_CLASS)
 *   c2-relayed-remote-address-raw-key   — expect ONE HIGH on RecoveryAddress
 *                                          (EXPANDS_165_CORPUS)
 *   c3-delimiter-collision-intermediate-sender — expect ZERO findings
 *                                          (NEW_DETECTOR_CLASS)
 *
 * Run:  node scripts/test-168-composable-vs-165.js
 */

const path = require("path");
const assert = require("assert");
const detector = require("./buzzshield-cosmos-bech32-canon-detector.js");

const FIXTURES_ROOT = path.resolve(__dirname, "test-fixtures-168-composable");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  PASS  ${name}`);
    passed++;
  } catch (err) {
    console.log(`  FAIL  ${name}`);
    console.log("        " + (err.message || err));
    if (err.actual !== undefined)
      console.log(`        actual:   ${JSON.stringify(err.actual)}`);
    if (err.expected !== undefined)
      console.log(`        expected: ${JSON.stringify(err.expected)}`);
    failed++;
  }
}

console.log("=== #168 Composable cross-pollination vs #165 detector ===\n");

// ============================================================
// C-1 — Substrate bech32-encoding bug (u5::try_from_u8 on raw bytes)
//   expected verdict: NEW_DETECTOR_CLASS (0 findings on Cosmos-Go analogue)
// ============================================================
console.log(
  "[C-1: u5::try_from_u8 on raw 32-byte AccountId — Substrate-only encoding bug]",
);

test("c1: #165 emits ZERO findings — encoding boundary bug, no []byte(string) shape", () => {
  const findings = detector.scan({
    target: path.join(FIXTURES_ROOT, "c1-substrate-bech32-encoding-bug"),
    verbose: false,
  });
  assert.strictEqual(
    findings.length,
    0,
    `expected 0 findings (NEW_DETECTOR_CLASS verdict), got ${findings.length}: ${JSON.stringify(findings, null, 2)}`,
  );
});

test("c1: keeper writes raw []byte payload, not []byte(string) — dataflow is shape-mismatched", () => {
  const fs = require("fs");
  const src = fs.readFileSync(
    path.join(
      FIXTURES_ROOT,
      "c1-substrate-bech32-encoding-bug/x/multihop/keeper/keeper.go",
    ),
    "utf8",
  );
  // Confirm the keeper does store.Set(rawAccountId, ...) — a []byte param,
  // not []byte(<string>). This is what makes #165 inert by design.
  assert.ok(
    /store\.Set\(rawAccountId,/.test(src),
    "fixture must demonstrate store.Set with raw []byte param to validate #165 inertness",
  );
});

// ============================================================
// C-2 — RemoteAddress.address: String, raw KV key, no canonicalization
//   expected verdict: EXPANDS_165_CORPUS (HIGH on RecoveryAddress)
// ============================================================
console.log(
  "\n[C-2: RemoteAddress.address as raw String key — H4-class match]",
);

test("c2: #165 emits ONE HIGH finding on RecoveryAddress field", () => {
  const findings = detector.scan({
    target: path.join(FIXTURES_ROOT, "c2-relayed-remote-address-raw-key"),
    verbose: false,
  });
  assert.strictEqual(
    findings.length,
    1,
    `expected exactly 1 finding (EXPANDS_165_CORPUS verdict), got ${findings.length}`,
  );
  const f = findings[0];
  assert.strictEqual(f.severity, "HIGH", `expected HIGH, got ${f.severity}`);
  assert.strictEqual(
    f.field,
    "RecoveryAddress",
    `expected field=RecoveryAddress, got ${f.field}`,
  );
  assert.strictEqual(
    f.msg_type,
    "MsgSetRecoveryAddress",
    `expected msg_type=MsgSetRecoveryAddress, got ${f.msg_type}`,
  );
  assert.strictEqual(f.module, "cvm", `expected module=cvm, got ${f.module}`);
  assert.strictEqual(
    f.validate_basic_status,
    "exists_but_field_skipped",
    `expected exists_but_field_skipped, got ${f.validate_basic_status}`,
  );
  assert.ok(f.confidence >= 0.7, `confidence too low: ${f.confidence}`);
});

test("c2: caller_chain includes the msg_server callsite", () => {
  const findings = detector.scan({
    target: path.join(FIXTURES_ROOT, "c2-relayed-remote-address-raw-key"),
  });
  const f = findings[0];
  assert.ok(
    f.caller_chain.some((s) => /SetRecoveryAddress/.test(s)),
    `caller_chain missing SetRecoveryAddress: ${JSON.stringify(f.caller_chain)}`,
  );
});

// ============================================================
// C-3 — addess_hash delimiter collision via "/" formatter
//   expected verdict: NEW_DETECTOR_CLASS (0 findings; hash() wrapper hides Sprintf)
// ============================================================
console.log(
  "\n[C-3: derive_intermediate_sender delimiter collision — hash() wrapper hides dataflow]",
);

test("c3: #165 emits ZERO findings — hash() wrapper opaques the byte-pattern matcher", () => {
  const findings = detector.scan({
    target: path.join(
      FIXTURES_ROOT,
      "c3-delimiter-collision-intermediate-sender",
    ),
    verbose: false,
  });
  assert.strictEqual(
    findings.length,
    0,
    `expected 0 findings (NEW_DETECTOR_CLASS verdict — hash() wrapper hides Sprintf-with-msg-field), got ${findings.length}: ${JSON.stringify(findings, null, 2)}`,
  );
});

test("c3: keeper writes Set(h[:], ...) where h is sha256 output — confirms detector inertness root cause", () => {
  const fs = require("fs");
  const src = fs.readFileSync(
    path.join(
      FIXTURES_ROOT,
      "c3-delimiter-collision-intermediate-sender/x/icahook/keeper/keeper.go",
    ),
    "utf8",
  );
  // Confirm the keeper uses Set(h[:], ...) — the hash output, not raw []byte(<string>).
  // This is precisely why #165 cannot fire: the Sprintf-with-msg-field is wrapped
  // by sha256.Sum256 before hitting Set.
  assert.ok(/sha256\.Sum256/.test(src), "fixture must use sha256.Sum256");
  assert.ok(
    /store\.Set\(h\[:\],/.test(src),
    "fixture must show Set(h[:], ...) opaqueness",
  );
});

// ============================================================
// Decision matrix — operational follow-ups per verdict class
// ============================================================
console.log(
  "\n[Decision matrix — verifies report alignment with verdict classes]",
);

test("matrix: C-1 + C-3 verdicts trigger NEW_DETECTOR_CLASS spec follow-up", () => {
  const c1 = detector.scan({
    target: path.join(FIXTURES_ROOT, "c1-substrate-bech32-encoding-bug"),
  });
  const c3 = detector.scan({
    target: path.join(
      FIXTURES_ROOT,
      "c3-delimiter-collision-intermediate-sender",
    ),
  });
  // NEW_DETECTOR_CLASS verdict is "zero findings AND pattern essence captured" —
  // this matrix assertion confirms both fixtures match.
  assert.strictEqual(
    c1.length,
    0,
    "C-1 NEW_DETECTOR_CLASS: zero findings expected",
  );
  assert.strictEqual(
    c3.length,
    0,
    "C-3 NEW_DETECTOR_CLASS: zero findings expected",
  );
});

test("matrix: C-2 verdict triggers no-op / corpus-enriched (no follow-up code)", () => {
  const c2 = detector.scan({
    target: path.join(FIXTURES_ROOT, "c2-relayed-remote-address-raw-key"),
  });
  // EXPANDS_165_CORPUS verdict is "fires HIGH with the same finding-shape as h4/s1" —
  // no detector spec needed, just enrich the regression corpus by adding this fixture.
  assert.strictEqual(
    c2.length,
    1,
    "C-2 EXPANDS_165_CORPUS: exactly 1 HIGH finding",
  );
  assert.strictEqual(c2[0].severity, "HIGH", "C-2 must be HIGH severity");
});

// ============================================================
// SUMMARY
// ============================================================
console.log(`\n=== ${passed} passed, ${failed} failed ===`);
console.log("\nVerdict map:");
console.log(
  "  C-1 (u5 encoding bug)          → NEW_DETECTOR_CLASS (#180-class)",
);
console.log("  C-2 (RemoteAddress raw key)    → EXPANDS_165_CORPUS");
console.log(
  "  C-3 (delimiter collision)      → NEW_DETECTOR_CLASS (#181-class)",
);
if (failed > 0) process.exit(1);
process.exit(0);
