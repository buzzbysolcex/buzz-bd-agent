#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * E2E unit test for #142a MMR-bounds detector.
 *
 * Per detector-pr-template.md MANDATE, this test walks the FULL field-flow
 * for the new detector — emit (file walk + MMR-verifier identification) →
 * collect (bounds-check evaluation + helper-trace) → consume (final findings
 * shape).
 *
 * Three fixtures exercised:
 *
 *   1. positive-mmr-no-leaf-bounds — Hyperbridge-class verifier missing
 *      `require(leafIndex < leafCount)`. Peak-count check IS present.
 *      Expected: HIGH leaf_index_bounds (conf 0.85)
 *               + MEDIUM sibling_depth_bounds (conf 0.55, bonus — fixture
 *                 also lacks proof-depth bound).
 *
 *   2. positive-mmr-no-peak-consistency — IBC-light-client-class verifier
 *      with leaf-index check IN PLACE but peak-count consistency MISSING.
 *      Expected: HIGH peak_count_consistency (conf 0.75)
 *               + MEDIUM sibling_depth_bounds (conf 0.55).
 *
 *   3. negative-hardened-mmr — fully-hardened verifier with all four bounds
 *      checks present + Solidity 0.8+. Expected: 0 findings.
 *
 * Plus offline coverage on the identification + bounds-evaluation primitives.
 *
 * Run: node scripts/test-142a-mmr-bounds-detector.js
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");
const detector = require("./buzzshield-142a-mmr-bounds-detector.js");
const scanner = require("./lib/proxy-admin-scanner.js");

const FIXTURES_ROOT = path.resolve(__dirname, "test-fixtures-142");

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
    failed++;
  }
}

console.log("=== #142a MMR-bounds detector E2E test ===\n");

// ============================================================
// EMIT layer probe — file walk + MMR-verifier identification
// ============================================================
console.log("[Layer 1: EMIT — file walk + MMR-verifier identification]");

test("emit: walkSolidityFiles discovers no-leaf-bounds fixture", () => {
  const files = scanner.walkSolidityFiles(
    path.join(FIXTURES_ROOT, "positive-mmr-no-leaf-bounds"),
  );
  assert.strictEqual(
    files.length,
    1,
    `expected 1 .sol file, got ${files.length}`,
  );
  assert.ok(
    /mmr-verifier\.sol$/.test(files[0]),
    `unexpected file: ${files[0]}`,
  );
});

test("emit: extractContracts finds HyperbridgeMMRVerifier in fixture 1", () => {
  const src = fs.readFileSync(
    path.join(FIXTURES_ROOT, "positive-mmr-no-leaf-bounds/mmr-verifier.sol"),
    "utf8",
  );
  const contracts = scanner.extractContracts(src);
  const names = contracts.map((c) => c.name);
  assert.deepStrictEqual(names, ["HyperbridgeMMRVerifier"]);
});

test("emit: isMmrVerifier returns true for verifyMmrProof + MMR params", () => {
  const src = fs.readFileSync(
    path.join(FIXTURES_ROOT, "positive-mmr-no-leaf-bounds/mmr-verifier.sol"),
    "utf8",
  );
  const contracts = scanner.extractContracts(src);
  const fns = scanner.extractFunctions(contracts[0].body);
  const target = fns.find((f) => f.name === "verifyMmrProof");
  assert.ok(target, "verifyMmrProof not found");
  const fileImportHints = detector.fileHasMmrImports(src);
  const fileHasMmrStruct = detector.fileDeclaresMmrStruct(src);
  assert.strictEqual(
    detector.isMmrVerifier(target, fileImportHints, fileHasMmrStruct),
    true,
  );
});

test("emit: isMmrVerifier excludes plain helper functions", () => {
  const src = fs.readFileSync(
    path.join(FIXTURES_ROOT, "positive-mmr-no-leaf-bounds/mmr-verifier.sol"),
    "utf8",
  );
  const contracts = scanner.extractContracts(src);
  const fns = scanner.extractFunctions(contracts[0].body);
  const popcount = fns.find((f) => f.name === "_popcount");
  assert.ok(popcount, "_popcount not found");
  assert.strictEqual(detector.isMmrVerifier(popcount, false, false), false);
});

test("emit: fileDeclaresMmrStruct detects canonical MMR-proof struct", () => {
  const src = fs.readFileSync(
    path.join(FIXTURES_ROOT, "positive-mmr-no-leaf-bounds/mmr-verifier.sol"),
    "utf8",
  );
  assert.strictEqual(detector.fileDeclaresMmrStruct(src), true);
});

test("emit: fileDeclaresMmrStruct returns false for non-MMR file", () => {
  const src = `
    pragma solidity ^0.8.0;
    contract Foo {
      struct Bar { uint256 a; uint256 b; }
      function f() external pure returns (uint256) { return 1; }
    }
  `;
  assert.strictEqual(detector.fileDeclaresMmrStruct(src), false);
});

test("emit: isSolidity08OrHigher detects ^0.8.0 as v0.8+", () => {
  assert.strictEqual(
    detector.isSolidity08OrHigher("pragma solidity ^0.8.0;"),
    true,
  );
});

test("emit: isSolidity08OrHigher detects ^0.7.6 as pre-0.8", () => {
  assert.strictEqual(
    detector.isSolidity08OrHigher("pragma solidity ^0.7.6;"),
    false,
  );
});

// ============================================================
// COLLECT layer probe — bounds-check evaluation + helper trace
// ============================================================
console.log("\n[Layer 2: COLLECT — bounds-check evaluation + helper trace]");

test("collect: evaluateBoundsChecks detects MISSING leaf_index_bounds in fixture 1", () => {
  const src = fs.readFileSync(
    path.join(FIXTURES_ROOT, "positive-mmr-no-leaf-bounds/mmr-verifier.sol"),
    "utf8",
  );
  const contracts = scanner.extractContracts(src);
  const fns = scanner.extractFunctions(contracts[0].body);
  const target = fns.find((f) => f.name === "verifyMmrProof");
  const { present } = detector.evaluateBoundsChecks(target, fns, true);
  assert.strictEqual(present.leaf_index_bounds, false);
  assert.strictEqual(present.peak_count_consistency, true);
  assert.strictEqual(present.overflow_guard, true);
});

test("collect: evaluateBoundsChecks detects MISSING peak_count_consistency in fixture 2", () => {
  const src = fs.readFileSync(
    path.join(
      FIXTURES_ROOT,
      "positive-mmr-no-peak-consistency/mmr-verifier.sol",
    ),
    "utf8",
  );
  const contracts = scanner.extractContracts(src);
  const fns = scanner.extractFunctions(contracts[0].body);
  const target = fns.find((f) => f.name === "verifyMMR");
  const { present } = detector.evaluateBoundsChecks(target, fns, true);
  assert.strictEqual(present.leaf_index_bounds, true);
  assert.strictEqual(present.peak_count_consistency, false);
});

test("collect: evaluateBoundsChecks reports ALL PRESENT on hardened fixture", () => {
  const src = fs.readFileSync(
    path.join(FIXTURES_ROOT, "negative-hardened-mmr/mmr-verifier.sol"),
    "utf8",
  );
  const contracts = scanner.extractContracts(src);
  const fns = scanner.extractFunctions(contracts[0].body);
  const target = fns.find((f) => f.name === "verifyMmrProof");
  const { present } = detector.evaluateBoundsChecks(target, fns, true);
  assert.strictEqual(present.leaf_index_bounds, true);
  assert.strictEqual(present.peak_count_consistency, true);
  assert.strictEqual(present.sibling_depth_bounds, true);
  assert.strictEqual(present.overflow_guard, true);
});

test("collect: helper-trace catches require in depth-1 helper", () => {
  // Synthesized: verifyMmrProof calls _validate which holds the canonical
  // leaf-index + peak-count requires. Depth-1 trace must follow into the
  // helper body and surface BOTH bounds present.
  const src = `
    pragma solidity ^0.8.0;
    contract Foo {
      struct MmrProof {
        uint256 leafIndex;
        uint256 leafCount;
        bytes32[] peaks;
        bytes32[] siblings;
      }
      function verifyMmrProof(bytes32 r, bytes32 leaf, MmrProof calldata p) external pure returns (bool) {
        _validate(p);
        return true;
      }
      function _validate(MmrProof calldata p) internal pure {
        require(p.leafIndex < p.leafCount, "OOB");
        require(p.peaks.length == _popcount(p.leafCount), "BAD");
      }
      function _popcount(uint256 x) internal pure returns (uint256 n) {
        while (x != 0) { n += x & 1; x >>= 1; }
      }
    }
  `;
  const contracts = scanner.extractContracts(src);
  const fns = scanner.extractFunctions(contracts[0].body);
  const target = fns.find((f) => f.name === "verifyMmrProof");
  const { present, helpers } = detector.evaluateBoundsChecks(target, fns, true);
  assert.strictEqual(
    present.leaf_index_bounds,
    true,
    `expected helper-trace to surface leaf bound, helpers=${JSON.stringify(helpers)}`,
  );
  assert.strictEqual(present.peak_count_consistency, true);
  assert.ok(helpers.includes("_validate"));
});

// ============================================================
// CONSUME layer probe — full scanSource() output shape
// ============================================================
console.log("\n[Layer 3: CONSUME — full scanSource() output shape]");

test("consume: positive-mmr-no-leaf-bounds emits HIGH leaf_index_bounds", () => {
  const findings = detector.scanSource(
    path.join(FIXTURES_ROOT, "positive-mmr-no-leaf-bounds"),
  );
  const high = findings.filter(
    (f) => f.severity === "HIGH" && f.missing_check === "leaf_index_bounds",
  );
  assert.strictEqual(
    high.length,
    1,
    `expected 1 HIGH leaf_index_bounds, got ${high.length} (all=${JSON.stringify(findings.map((f) => `${f.severity}/${f.missing_check}`))})`,
  );
  const f = high[0];
  assert.strictEqual(f.detector, "buzzshield-142a-mmr-bounds");
  assert.strictEqual(f.mode, "source");
  assert.strictEqual(f.contract_name, "HyperbridgeMMRVerifier");
  assert.strictEqual(f.function_name, "verifyMmrProof");
  assert.strictEqual(f.confidence, 0.85);
  assert.strictEqual(f.bounds_present.leaf_index_bounds, false);
  assert.strictEqual(f.bounds_present.peak_count_consistency, true);
});

test("consume: positive-mmr-no-peak-consistency emits HIGH peak_count_consistency", () => {
  const findings = detector.scanSource(
    path.join(FIXTURES_ROOT, "positive-mmr-no-peak-consistency"),
  );
  const high = findings.filter(
    (f) =>
      f.severity === "HIGH" && f.missing_check === "peak_count_consistency",
  );
  assert.strictEqual(
    high.length,
    1,
    `expected 1 HIGH peak_count_consistency, got ${high.length} (all=${JSON.stringify(findings.map((f) => `${f.severity}/${f.missing_check}`))})`,
  );
  const f = high[0];
  assert.strictEqual(f.contract_name, "IBCLightClientMMRVerifier");
  assert.strictEqual(f.function_name, "verifyMMR");
  assert.strictEqual(f.confidence, 0.75);
  assert.strictEqual(f.bounds_present.leaf_index_bounds, true);
  assert.strictEqual(f.bounds_present.peak_count_consistency, false);
});

test("consume: negative-hardened-mmr emits 0 findings", () => {
  const findings = detector.scanSource(
    path.join(FIXTURES_ROOT, "negative-hardened-mmr"),
  );
  assert.strictEqual(
    findings.length,
    0,
    `expected 0 findings, got ${findings.length}: ${JSON.stringify(findings, null, 2)}`,
  );
});

// ============================================================
// Field-shape contract — required fields on every finding
// ============================================================
console.log("\n[Contract: finding shape — required fields]");

test("contract: every #142a finding has full required field set", () => {
  const findings = [
    ...detector.scanSource(
      path.join(FIXTURES_ROOT, "positive-mmr-no-leaf-bounds"),
    ),
    ...detector.scanSource(
      path.join(FIXTURES_ROOT, "positive-mmr-no-peak-consistency"),
    ),
  ];
  const required = [
    "severity",
    "detector",
    "mode",
    "file",
    "line",
    "contract_name",
    "function_name",
    "missing_check",
    "bounds_present",
    "hypothesis",
    "confidence",
  ];
  for (const f of findings) {
    for (const k of required) {
      assert.ok(
        Object.prototype.hasOwnProperty.call(f, k),
        `missing required key '${k}' in finding: ${JSON.stringify(f)}`,
      );
    }
    // bounds_present must have all 4 fields
    for (const bk of [
      "leaf_index_bounds",
      "peak_count_consistency",
      "sibling_depth_bounds",
      "overflow_guard",
    ]) {
      assert.ok(
        Object.prototype.hasOwnProperty.call(f.bounds_present, bk),
        `missing bounds_present key '${bk}'`,
      );
    }
  }
});

test("contract: detector identifier is exactly 'buzzshield-142a-mmr-bounds'", () => {
  const findings = detector.scanSource(
    path.join(FIXTURES_ROOT, "positive-mmr-no-leaf-bounds"),
  );
  for (const f of findings) {
    assert.strictEqual(f.detector, "buzzshield-142a-mmr-bounds");
  }
});

test("contract: cross-fixture isolation — #142a fixtures do NOT emit reachability fields", () => {
  // #142a should never emit #142b-specific keys (reachability, fund_flow_present, etc.)
  const findings = detector.scanSource(
    path.join(FIXTURES_ROOT, "positive-mmr-no-leaf-bounds"),
  );
  for (const f of findings) {
    assert.strictEqual(
      f.reachability,
      undefined,
      `#142a must not emit 'reachability' field`,
    );
    assert.strictEqual(
      f.fund_flow_present,
      undefined,
      `#142a must not emit 'fund_flow_present' field`,
    );
  }
});

// ============================================================
// SUMMARY
// ============================================================
console.log(`\n=== ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);
process.exit(0);
