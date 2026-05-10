#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * E2E unit test for #159 HE-A4 single-EOA proxy admin detector.
 *
 * Per detector-pr-template.md, this test walks the full field-flow path
 * for the new detector — emit (file walk + AST extraction) → collect
 * (pattern detection: TransparentProxy/UUPS/AC/timelock/multisig +
 * admin-expression classification) → consume (final findings array shape).
 *
 * Three fixtures exercised:
 *   1. positive-wasabi-159    — TransparentUpgradeableProxy + ProxyAdmin with
 *                              literal EOA owner (no timelock, no multisig).
 *                              Expected: 1 HIGH, confidence 0.9.
 *   2. positive-renegade-159  — ProxyAdmin pattern, admin via constructor
 *                              identifier `address admin` (no timelock).
 *                              Expected: 1 HIGH, confidence 0.75.
 *   3. negative-boros-159     — ProxyAdmin where address(safe) resolves to
 *                              GnosisSafe identifier with multisig hint.
 *                              Expected: 0 findings (suppressed).
 *
 * Plus on-chain helper coverage (offline):
 *   - storageValueToAddress edge cases
 *   - EIP1967_ADMIN_SLOT canonical constant
 *
 * Run: node scripts/test-159-ha4-detector.js
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");
const detector = require("./buzzshield-159-ha4-detector.js");
const scanner = require("./lib/proxy-admin-scanner.js");

const FIXTURES_ROOT = path.resolve(__dirname, "test-fixtures-159-143");

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

console.log("=== #159 HE-A4 detector E2E test ===\n");

// ============================================================
// EMIT layer probe — file walk + AST extraction
// ============================================================
console.log("[Layer 1: EMIT — file walk + AST extraction]");

test("emit: walkSolidityFiles discovers wasabi-proxy-admin.sol", () => {
  const files = scanner.walkSolidityFiles(
    path.join(FIXTURES_ROOT, "positive-wasabi-159"),
  );
  assert.strictEqual(
    files.length,
    1,
    `expected 1 .sol file, got ${files.length}`,
  );
  assert.ok(
    /wasabi-proxy-admin\.sol$/.test(files[0]),
    `unexpected file: ${files[0]}`,
  );
});

test("emit: extractContracts finds WasabiProxyAdmin with parent ProxyAdmin", () => {
  const src = fs.readFileSync(
    path.join(FIXTURES_ROOT, "positive-wasabi-159/wasabi-proxy-admin.sol"),
    "utf8",
  );
  const contracts = scanner.extractContracts(src);
  const wasabi = contracts.find((c) => c.name === "WasabiProxyAdmin");
  assert.ok(wasabi, "WasabiProxyAdmin contract not extracted");
  assert.ok(
    wasabi.inherits.includes("ProxyAdmin"),
    `parent ProxyAdmin not in inherits: ${JSON.stringify(wasabi.inherits)}`,
  );
});

test("emit: findConstructor + findTransferOwnershipCalls capture EOA literal", () => {
  const src = fs.readFileSync(
    path.join(FIXTURES_ROOT, "positive-wasabi-159/wasabi-proxy-admin.sol"),
    "utf8",
  );
  const contracts = scanner.extractContracts(src);
  const wasabi = contracts.find((c) => c.name === "WasabiProxyAdmin");
  const ctor = scanner.findConstructor(wasabi.body);
  assert.ok(ctor, "constructor not found");
  const owns = scanner.findTransferOwnershipCalls(ctor.body);
  assert.strictEqual(
    owns.length,
    1,
    `expected 1 transferOwnership, got ${owns.length}`,
  );
  assert.strictEqual(
    owns[0].addr.trim(),
    "0x1234567890aBcdEf1234567890aBcDeF12345678",
    "wrong admin literal extracted",
  );
});

// ============================================================
// COLLECT layer probe — pattern detection + classification
// ============================================================
console.log("\n[Layer 2: COLLECT — pattern detection + classification]");

test("collect: detectTransparentProxyPattern fires on positive-wasabi-159", () => {
  const src = fs.readFileSync(
    path.join(FIXTURES_ROOT, "positive-wasabi-159/wasabi-proxy-admin.sol"),
    "utf8",
  );
  const contracts = scanner.extractContracts(src);
  const r = scanner.detectTransparentProxyPattern(src, contracts);
  assert.strictEqual(r.detected, true);
});

test("collect: detectTimelock returns false for positive-wasabi-159", () => {
  const src = fs.readFileSync(
    path.join(FIXTURES_ROOT, "positive-wasabi-159/wasabi-proxy-admin.sol"),
    "utf8",
  );
  assert.strictEqual(scanner.detectTimelock(src).detected, false);
});

test("collect: detectMultisig returns true for negative-boros-159 (GnosisSafe hint)", () => {
  const src = fs.readFileSync(
    path.join(FIXTURES_ROOT, "negative-boros-159/boros-proxy-admin.sol"),
    "utf8",
  );
  assert.strictEqual(scanner.detectMultisig(src).detected, true);
});

test("collect: classifyAdminExpression(literal hex) → literal_eoa_or_contract", () => {
  const cls = scanner.classifyAdminExpression(
    "0x1234567890aBcdEf1234567890aBcDeF12345678",
  );
  assert.strictEqual(cls.kind, "literal_eoa_or_contract");
  assert.strictEqual(cls.addr, "0x1234567890aBcdEf1234567890aBcDeF12345678");
});

test("collect: classifyAdminExpression('admin') → identifier", () => {
  const cls = scanner.classifyAdminExpression("admin");
  assert.strictEqual(cls.kind, "identifier");
  assert.strictEqual(cls.name, "admin");
});

test("collect: classifyAdminExpression('address(safe)') → address_cast(inner=safe)", () => {
  const cls = scanner.classifyAdminExpression("address(safe)");
  assert.strictEqual(cls.kind, "address_cast");
  assert.strictEqual(cls.inner, "safe");
});

// ============================================================
// CONSUME layer probe — full scanSource() output shape
// ============================================================
console.log("\n[Layer 3: CONSUME — full scanSource() output shape]");

test("consume: positive-wasabi-159 emits 1 HIGH (literal EOA, conf 0.9)", () => {
  const findings = detector.scanSource(
    path.join(FIXTURES_ROOT, "positive-wasabi-159"),
  );
  assert.strictEqual(
    findings.length,
    1,
    `expected 1 finding, got ${findings.length}`,
  );
  const f = findings[0];
  assert.strictEqual(f.severity, "HIGH");
  assert.strictEqual(f.detector, "buzzshield-159-ha4");
  assert.strictEqual(f.mode, "source");
  assert.strictEqual(f.contract, "WasabiProxyAdmin");
  assert.strictEqual(f.proxy_kind, "TransparentUpgradeableProxy/ProxyAdmin");
  assert.strictEqual(f.admin_commitment, "transferOwnership");
  assert.strictEqual(f.admin_type, "EOA-or-literal");
  assert.strictEqual(
    f.admin_address,
    "0x1234567890aBcdEf1234567890aBcDeF12345678",
  );
  assert.strictEqual(f.timelock_present_in_source, false);
  assert.strictEqual(f.multisig_present_in_source, false);
  assert.strictEqual(f.confidence, 0.9);
});

test("consume: positive-renegade-159 emits 1 HIGH (identifier, conf 0.75)", () => {
  const findings = detector.scanSource(
    path.join(FIXTURES_ROOT, "positive-renegade-159"),
  );
  assert.strictEqual(
    findings.length,
    1,
    `expected 1 finding, got ${findings.length}`,
  );
  const f = findings[0];
  assert.strictEqual(f.severity, "HIGH");
  assert.strictEqual(f.contract, "RenegadeProxyAdmin");
  assert.strictEqual(f.admin_expression, "admin");
  assert.strictEqual(f.admin_type, "Unknown");
  assert.strictEqual(f.admin_address, null);
  assert.strictEqual(f.confidence, 0.75);
});

test("consume: negative-boros-159 emits 0 findings (suppressed by multisig cast)", () => {
  const findings = detector.scanSource(
    path.join(FIXTURES_ROOT, "negative-boros-159"),
  );
  assert.strictEqual(
    findings.length,
    0,
    `expected 0 findings, got ${findings.length}: ${JSON.stringify(findings, null, 2)}`,
  );
});

// ============================================================
// On-chain helpers — offline coverage
// ============================================================
console.log("\n[On-chain helpers: offline coverage]");

test("on-chain: EIP1967_ADMIN_SLOT matches keccak256('eip1967.proxy.admin')-1", () => {
  // Canonical value from EIP-1967 spec
  assert.strictEqual(
    scanner.EIP1967_ADMIN_SLOT,
    "0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103",
  );
});

test("on-chain: storageValueToAddress strips 12-byte prefix and lowercases", () => {
  const slotValue =
    "0x000000000000000000000000Aabbccddeeff00112233445566778899aabbccdd";
  const addr = scanner.storageValueToAddress(slotValue);
  assert.strictEqual(addr, "0xaabbccddeeff00112233445566778899aabbccdd");
});

test("on-chain: storageValueToAddress returns null on zero-slot", () => {
  const zero =
    "0x0000000000000000000000000000000000000000000000000000000000000000";
  assert.strictEqual(scanner.storageValueToAddress(zero), null);
});

test("on-chain: storageValueToAddress returns null on malformed input", () => {
  assert.strictEqual(scanner.storageValueToAddress(null), null);
  assert.strictEqual(scanner.storageValueToAddress("0xshort"), null);
});

// ============================================================
// Field-shape contract — all required fields present on findings
// ============================================================
console.log("\n[Contract: finding shape — all required fields present]");

test("contract: every #159 finding has required source-mode field set", () => {
  const findings = detector.scanSource(
    path.join(FIXTURES_ROOT, "positive-wasabi-159"),
  );
  const required = [
    "severity",
    "detector",
    "mode",
    "file",
    "line",
    "contract",
    "proxy_kind",
    "admin_commitment",
    "admin_expression",
    "admin_address",
    "admin_type",
    "timelock_delay_seconds",
    "timelock_present_in_source",
    "multisig_present_in_source",
    "where",
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
  }
});

// ============================================================
// SUMMARY
// ============================================================
console.log(`\n=== ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);
process.exit(0);
