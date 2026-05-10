#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * E2E unit test for #167 cross-replay detector.
 *
 * Per detector-pr-template.md, this test walks the full field-flow path for
 * the new detector — emit (file walk + sig-verify site discovery) → collect
 * (binding-fingerprint extraction + V1/V2 + cross-instance grouping) →
 * consume (final findings array shape).
 *
 * Four fixtures exercised:
 *
 *   1. positive-gassponsor-v1 — GasSponsor + GasSponsorV2 in the SAME file.
 *      V1 binds NOTHING; V2 binds chainid+address(this)+nonce+deadline.
 *      Expected: 1 HIGH, asymmetry_class=v1_v2_strict_subset, conf 0.85.
 *
 *   2. positive-transferlib-multi-instance — Two TransferLib-class contracts,
 *      both with executeSignedWithdrawal. One binds address(this), the other
 *      doesn't. Expected: 1 HIGH on the weaker contract,
 *      asymmetry_class=cross_instance_diverge, conf 0.75.
 *
 *   3. negative-gassponsor-v2-only — Standalone GasSponsorV2 binding all five
 *      canonical fields. Expected: 0 findings.
 *
 *   4. negative-permit-eip2612 — Canonical EIP-2612 permit with full
 *      DOMAIN_SEPARATOR + nonce + deadline binding. Expected: 0 findings.
 *
 * Plus offline coverage on the fingerprint primitives.
 *
 * Run: node scripts/test-167-cross-replay-detector.js
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");
const detector = require("./buzzshield-167-cross-replay-detector.js");
const scanner = require("./lib/proxy-admin-scanner.js");

const FIXTURES_ROOT = path.resolve(__dirname, "test-fixtures-167");

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

console.log("=== #167 cross-replay detector E2E test ===\n");

// ============================================================
// EMIT layer probe — file walk + sig-verify site discovery
// ============================================================
console.log("[Layer 1: EMIT — file walk + sig-verify site discovery]");

test("emit: walkSolidityFiles discovers gas-sponsor.sol fixture", () => {
  const files = scanner.walkSolidityFiles(
    path.join(FIXTURES_ROOT, "positive-gassponsor-v1"),
  );
  assert.strictEqual(
    files.length,
    1,
    `expected 1 .sol file, got ${files.length}`,
  );
  assert.ok(/gas-sponsor\.sol$/.test(files[0]), `unexpected file: ${files[0]}`);
});

test("emit: extractContracts finds both GasSponsor + GasSponsorV2", () => {
  const src = fs.readFileSync(
    path.join(FIXTURES_ROOT, "positive-gassponsor-v1/gas-sponsor.sol"),
    "utf8",
  );
  const contracts = scanner.extractContracts(src);
  const names = contracts.map((c) => c.name).sort();
  assert.deepStrictEqual(names, ["GasSponsor", "GasSponsorV2"]);
});

test("emit: findSigVerificationSites returns 2 primary sites (no helpers)", () => {
  const src = fs.readFileSync(
    path.join(FIXTURES_ROOT, "positive-gassponsor-v1/gas-sponsor.sol"),
    "utf8",
  );
  const contracts = scanner.extractContracts(src);
  const sites = detector.findSigVerificationSites(contracts, "gas-sponsor.sol");
  assert.strictEqual(
    sites.length,
    2,
    `expected 2 primary sites, got ${sites.length} → ${JSON.stringify(sites.map((s) => `${s.contract_name}.${s.function_name}`))}`,
  );
  // Helper _recover should be excluded
  const fnNames = sites.map((s) => s.function_name);
  assert.ok(
    !fnNames.includes("_recover"),
    "_recover helper should be excluded",
  );
  assert.ok(
    fnNames.includes("_assertSponsorshipSignature"),
    "_assertSponsorshipSignature should be a primary site",
  );
});

test("emit: helper-detection excludes _recover when caller is a sig-verify site", () => {
  // Synthesized: contract Foo with f() that calls _verify(d), _verify uses ecrecover.
  // Expected: only f() emerges as primary.
  const src = `
    contract Foo {
      function f(bytes32 d, bytes calldata sig) external view {
        _verify(d, sig);
      }
      function _verify(bytes32 d, bytes calldata sig) internal pure {
        bytes32 r; bytes32 s; uint8 v;
        require(ecrecover(d, v, r, s) != address(0), "BAD");
      }
    }
  `;
  const contracts = scanner.extractContracts(src);
  const sites = detector.findSigVerificationSites(contracts, "synth.sol");
  assert.strictEqual(sites.length, 1, "expected 1 primary site");
  assert.strictEqual(sites[0].function_name, "f");
});

// ============================================================
// COLLECT layer probe — fingerprint extraction + grouping
// ============================================================
console.log("\n[Layer 2: COLLECT — fingerprint + grouping]");

test("collect: buildFingerprint detects all 4 fields on V2 _assertSponsorshipSignature", () => {
  const src = fs.readFileSync(
    path.join(FIXTURES_ROOT, "positive-gassponsor-v1/gas-sponsor.sol"),
    "utf8",
  );
  const contracts = scanner.extractContracts(src);
  const v2 = contracts.find((c) => c.name === "GasSponsorV2");
  const fns = scanner.extractFunctions(v2.body);
  const target = fns.find((f) => f.name === "_assertSponsorshipSignature");
  const { fp } = detector.buildFingerprint(target, fns);
  assert.strictEqual(fp.chainid, true);
  assert.strictEqual(fp.address_this, true);
  assert.strictEqual(fp.nonce, true);
  assert.strictEqual(fp.deadline, true);
});

test("collect: buildFingerprint detects ZERO fields on V1 _assertSponsorshipSignature", () => {
  const src = fs.readFileSync(
    path.join(FIXTURES_ROOT, "positive-gassponsor-v1/gas-sponsor.sol"),
    "utf8",
  );
  const contracts = scanner.extractContracts(src);
  const v1 = contracts.find((c) => c.name === "GasSponsor");
  const fns = scanner.extractFunctions(v1.body);
  const target = fns.find((f) => f.name === "_assertSponsorshipSignature");
  const { fp } = detector.buildFingerprint(target, fns);
  assert.strictEqual(fp.chainid, false);
  assert.strictEqual(fp.address_this, false);
  assert.strictEqual(fp.nonce, false);
  assert.strictEqual(fp.deadline, false);
});

test("collect: groupV1V2 groups GasSponsor + GasSponsorV2 under base 'GasSponsor'", () => {
  const sites = [
    { contract_name: "GasSponsor", function_name: "f", fingerprint: {} },
    { contract_name: "GasSponsorV2", function_name: "f", fingerprint: {} },
  ];
  const groups = detector.groupV1V2(sites);
  assert.ok(groups.has("GasSponsor"), "missing 'GasSponsor' group key");
  const members = groups.get("GasSponsor");
  assert.strictEqual(members.length, 2);
  const versions = members.map((m) => m.version).sort();
  assert.deepStrictEqual(versions, [1, 2]);
});

test("collect: isStrictSubset({} ⊂ {chainid,address_this}) → true", () => {
  const a = {
    chainid: false,
    address_this: false,
    nonce: false,
    deadline: false,
    domain_separator: false,
  };
  const b = {
    chainid: true,
    address_this: true,
    nonce: false,
    deadline: false,
    domain_separator: false,
  };
  assert.strictEqual(detector.isStrictSubset(a, b), true);
});

test("collect: isStrictSubset({chainid} ⊂ {chainid}) → false (equal not strict)", () => {
  const a = {
    chainid: true,
    address_this: false,
    nonce: false,
    deadline: false,
    domain_separator: false,
  };
  const b = {
    chainid: true,
    address_this: false,
    nonce: false,
    deadline: false,
    domain_separator: false,
  };
  assert.strictEqual(detector.isStrictSubset(a, b), false);
});

test("collect: isStrictSubset({chainid,address_this} ⊂ {chainid}) → false (A has more)", () => {
  const a = {
    chainid: true,
    address_this: true,
    nonce: false,
    deadline: false,
    domain_separator: false,
  };
  const b = {
    chainid: true,
    address_this: false,
    nonce: false,
    deadline: false,
    domain_separator: false,
  };
  assert.strictEqual(detector.isStrictSubset(a, b), false);
});

test("collect: groupCrossInstance keeps only ≥2-contract function names", () => {
  const sites = [
    { contract_name: "A", function_name: "shared", fingerprint: {} },
    { contract_name: "B", function_name: "shared", fingerprint: {} },
    { contract_name: "C", function_name: "loner", fingerprint: {} },
  ];
  const groups = detector.groupCrossInstance(sites);
  assert.ok(groups.has("shared"));
  assert.ok(!groups.has("loner"));
  assert.strictEqual(groups.get("shared").length, 2);
});

// ============================================================
// CONSUME layer probe — full scanSource() output shape
// ============================================================
console.log("\n[Layer 3: CONSUME — full scanSource() output shape]");

test("consume: positive-gassponsor-v1 emits 1 HIGH (v1_v2_strict_subset, conf 0.85)", () => {
  const findings = detector.scanSource(
    path.join(FIXTURES_ROOT, "positive-gassponsor-v1"),
  );
  assert.strictEqual(
    findings.length,
    1,
    `expected 1 finding, got ${findings.length}: ${JSON.stringify(findings.map((f) => `${f.contract_name}.${f.function_name}/${f.asymmetry_class}`))}`,
  );
  const f = findings[0];
  assert.strictEqual(f.severity, "HIGH");
  assert.strictEqual(f.detector, "buzzshield-167-cross-replay");
  assert.strictEqual(f.mode, "source");
  assert.strictEqual(f.contract_name, "GasSponsor");
  assert.strictEqual(f.function_name, "_assertSponsorshipSignature");
  assert.strictEqual(f.asymmetry_class, "v1_v2_strict_subset");
  assert.strictEqual(f.confidence, 0.85);
  assert.strictEqual(f.paired_with.contract, "GasSponsorV2");
  assert.strictEqual(f.paired_with.function, "_assertSponsorshipSignature");
  assert.deepStrictEqual(f.missing_fields.sort(), [
    "address_this",
    "chainid",
    "deadline",
    "nonce",
  ]);
});

test("consume: positive-transferlib-multi-instance emits 1 HIGH (cross_instance_diverge, conf 0.75)", () => {
  const findings = detector.scanSource(
    path.join(FIXTURES_ROOT, "positive-transferlib-multi-instance"),
  );
  assert.strictEqual(
    findings.length,
    1,
    `expected 1 finding, got ${findings.length}: ${JSON.stringify(findings.map((f) => `${f.contract_name}/${f.asymmetry_class}`))}`,
  );
  const f = findings[0];
  assert.strictEqual(f.severity, "HIGH");
  assert.strictEqual(f.contract_name, "TransferLibWeak");
  assert.strictEqual(f.function_name, "executeSignedWithdrawal");
  assert.strictEqual(f.asymmetry_class, "cross_instance_diverge");
  assert.strictEqual(f.confidence, 0.75);
  assert.strictEqual(f.paired_with.contract, "TransferLibStrong");
  assert.deepStrictEqual(f.missing_fields, ["address_this"]);
  assert.strictEqual(f.binding_fingerprint.chainid, true);
  assert.strictEqual(f.binding_fingerprint.address_this, false);
});

test("consume: negative-gassponsor-v2-only emits 0 findings (strong fingerprint, no pair)", () => {
  const findings = detector.scanSource(
    path.join(FIXTURES_ROOT, "negative-gassponsor-v2-only"),
  );
  assert.strictEqual(
    findings.length,
    0,
    `expected 0 findings, got ${findings.length}: ${JSON.stringify(findings, null, 2)}`,
  );
});

test("consume: negative-permit-eip2612 emits 0 findings (canonical EIP-2612 fully bound)", () => {
  const findings = detector.scanSource(
    path.join(FIXTURES_ROOT, "negative-permit-eip2612"),
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

test("contract: every #167 HIGH finding has full required field set", () => {
  const findings = [
    ...detector.scanSource(path.join(FIXTURES_ROOT, "positive-gassponsor-v1")),
    ...detector.scanSource(
      path.join(FIXTURES_ROOT, "positive-transferlib-multi-instance"),
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
    "binding_fingerprint",
    "paired_with",
    "asymmetry_class",
    "missing_fields",
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
    // binding_fingerprint must have all 5 fields
    for (const fpk of detector.FP_FIELDS) {
      assert.ok(
        Object.prototype.hasOwnProperty.call(f.binding_fingerprint, fpk),
        `missing fingerprint key '${fpk}'`,
      );
    }
  }
});

test("contract: detector identifier is exactly 'buzzshield-167-cross-replay'", () => {
  const findings = detector.scanSource(
    path.join(FIXTURES_ROOT, "positive-gassponsor-v1"),
  );
  for (const f of findings) {
    assert.strictEqual(f.detector, "buzzshield-167-cross-replay");
  }
});

// ============================================================
// SUMMARY
// ============================================================
console.log(`\n=== ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);
process.exit(0);
