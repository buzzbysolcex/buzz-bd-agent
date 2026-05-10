#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * E2E unit test for #143 Wasabi-class UUPS + zero-delay AccessControl detector.
 *
 * Per detector-pr-template.md, this test walks the full field-flow path
 * for the new detector — emit (file walk + AST + initializer extraction) →
 * collect (UUPS + AC + role + auth-gate detection + admin-expression
 * classification) → consume (final findings array shape).
 *
 * Three fixtures exercised:
 *   1. positive-wasabi-143       — UUPSUpgradeable + AccessControlUpgradeable
 *                                  init grants DEFAULT_ADMIN_ROLE to msg.sender,
 *                                  _authorizeUpgrade onlyRole(DEFAULT_ADMIN_ROLE),
 *                                  no timelock, no multisig.
 *                                  Expected: 1 HIGH, confidence 0.82.
 *   2. negative-renegade-head-143 — TransparentUpgradeableProxy + atomic init
 *                                  + _disableInitializers (NOT UUPS).
 *                                  Per Doctrine #14: positive for #159, negative
 *                                  for #143.
 *                                  Expected: 0 findings (file-level UUPS+AC fail).
 *   3. negative-boros-143        — UUPS + AC but DEFAULT_ADMIN_ROLE granted to
 *                                  address(timelock) with TimelockController hint.
 *                                  Expected: 0 findings (suppressed — admin role
 *                                  granted to timelock-named identifier).
 *
 * Run: node scripts/test-143-wasabi-detector.js
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");
const detector = require("./buzzshield-143-wasabi-detector.js");
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

console.log("=== #143 Wasabi-class detector E2E test ===\n");

// ============================================================
// EMIT layer probe — file walk + AST + initializer extraction
// ============================================================
console.log("[Layer 1: EMIT — file walk + AST + initializer extraction]");

test("emit: walkSolidityFiles discovers wasabi-vault.sol", () => {
  const files = scanner.walkSolidityFiles(
    path.join(FIXTURES_ROOT, "positive-wasabi-143"),
  );
  assert.strictEqual(
    files.length,
    1,
    `expected 1 .sol file, got ${files.length}`,
  );
});

test("emit: extractContracts finds WasabiVault with both parents", () => {
  const src = fs.readFileSync(
    path.join(FIXTURES_ROOT, "positive-wasabi-143/wasabi-vault.sol"),
    "utf8",
  );
  const contracts = scanner.extractContracts(src);
  const vault = contracts.find((c) => c.name === "WasabiVault");
  assert.ok(vault, "WasabiVault not extracted");
  assert.ok(
    vault.inherits.includes("UUPSUpgradeable"),
    `UUPSUpgradeable not in inherits: ${JSON.stringify(vault.inherits)}`,
  );
  assert.ok(
    vault.inherits.includes("AccessControlUpgradeable"),
    `AccessControlUpgradeable not in inherits: ${JSON.stringify(vault.inherits)}`,
  );
});

test("emit: findInitializers picks up function with `initializer` modifier", () => {
  const src = fs.readFileSync(
    path.join(FIXTURES_ROOT, "positive-wasabi-143/wasabi-vault.sol"),
    "utf8",
  );
  const contracts = scanner.extractContracts(src);
  const vault = contracts.find((c) => c.name === "WasabiVault");
  const inits = scanner.findInitializers(vault.body);
  assert.strictEqual(
    inits.length,
    1,
    `expected 1 initializer, got ${inits.length}`,
  );
  assert.strictEqual(inits[0].name, "initialize");
});

test("emit: findGrantRoleCalls captures _grantRole(DEFAULT_ADMIN_ROLE, msg.sender)", () => {
  const src = fs.readFileSync(
    path.join(FIXTURES_ROOT, "positive-wasabi-143/wasabi-vault.sol"),
    "utf8",
  );
  const contracts = scanner.extractContracts(src);
  const vault = contracts.find((c) => c.name === "WasabiVault");
  const inits = scanner.findInitializers(vault.body);
  const grants = scanner.findGrantRoleCalls(inits[0].body);
  assert.strictEqual(
    grants.length,
    1,
    `expected 1 grantRole, got ${grants.length}`,
  );
  assert.strictEqual(grants[0].fn, "_grantRole");
  assert.strictEqual(grants[0].role.trim(), "DEFAULT_ADMIN_ROLE");
  assert.strictEqual(grants[0].addr.trim(), "msg.sender");
});

// ============================================================
// COLLECT layer probe — pattern detection + classification
// ============================================================
console.log("\n[Layer 2: COLLECT — pattern detection + classification]");

test("collect: detectUUPSPattern fires on positive-wasabi-143", () => {
  const src = fs.readFileSync(
    path.join(FIXTURES_ROOT, "positive-wasabi-143/wasabi-vault.sol"),
    "utf8",
  );
  const contracts = scanner.extractContracts(src);
  assert.strictEqual(scanner.detectUUPSPattern(src, contracts).detected, true);
});

test("collect: detectUUPSPattern returns false on negative-renegade-head-143", () => {
  const src = fs.readFileSync(
    path.join(FIXTURES_ROOT, "negative-renegade-head-143/renegade-impl.sol"),
    "utf8",
  );
  const contracts = scanner.extractContracts(src);
  assert.strictEqual(
    scanner.detectUUPSPattern(src, contracts).detected,
    false,
    "Renegade HEAD source is TransparentProxy, NOT UUPS — must not fire",
  );
});

test("collect: detectAccessControlPattern fires on positive-wasabi-143", () => {
  const src = fs.readFileSync(
    path.join(FIXTURES_ROOT, "positive-wasabi-143/wasabi-vault.sol"),
    "utf8",
  );
  const contracts = scanner.extractContracts(src);
  assert.strictEqual(
    scanner.detectAccessControlPattern(src, contracts).detected,
    true,
  );
});

test("collect: detectTimelock fires on negative-boros-143 (TimelockController hint)", () => {
  const src = fs.readFileSync(
    path.join(FIXTURES_ROOT, "negative-boros-143/boros-market-hub.sol"),
    "utf8",
  );
  assert.strictEqual(scanner.detectTimelock(src).detected, true);
});

test("collect: findAuthorizeUpgrade + analyzeAuthorizeUpgrade reports onlyRole gating", () => {
  const src = fs.readFileSync(
    path.join(FIXTURES_ROOT, "positive-wasabi-143/wasabi-vault.sol"),
    "utf8",
  );
  const contracts = scanner.extractContracts(src);
  const vault = contracts.find((c) => c.name === "WasabiVault");
  const auth = scanner.findAuthorizeUpgrade(vault.body);
  assert.ok(auth, "_authorizeUpgrade not found");
  const analysis = scanner.analyzeAuthorizeUpgrade(auth);
  assert.strictEqual(analysis.gatingType, "onlyRole");
  assert.strictEqual(analysis.roleArg, "DEFAULT_ADMIN_ROLE");
});

test("collect: isUpgradeRole(DEFAULT_ADMIN_ROLE) → true", () => {
  assert.strictEqual(detector.isUpgradeRole("DEFAULT_ADMIN_ROLE"), true);
  assert.strictEqual(detector.isUpgradeRole("UPGRADER_ROLE"), true);
  assert.strictEqual(detector.isUpgradeRole("MyContract.UPGRADER_ROLE"), true);
  assert.strictEqual(detector.isUpgradeRole("PAUSER_ROLE"), true); // any *_ROLE
  assert.strictEqual(detector.isUpgradeRole("notARole"), false);
});

test("collect: classifyAdminExpression('msg.sender') → msg_sender", () => {
  const cls = scanner.classifyAdminExpression("msg.sender");
  assert.strictEqual(cls.kind, "msg_sender");
});

test("collect: classifyAdminExpression('address(timelock)') → address_cast(timelock)", () => {
  const cls = scanner.classifyAdminExpression("address(timelock)");
  assert.strictEqual(cls.kind, "address_cast");
  assert.strictEqual(cls.inner, "timelock");
});

// ============================================================
// CONSUME layer probe — full scanSource() output shape
// ============================================================
console.log("\n[Layer 3: CONSUME — full scanSource() output shape]");

test("consume: positive-wasabi-143 emits 1 HIGH (msg_sender, conf 0.82)", () => {
  const findings = detector.scanSource(
    path.join(FIXTURES_ROOT, "positive-wasabi-143"),
  );
  assert.strictEqual(
    findings.length,
    1,
    `expected 1 finding, got ${findings.length}`,
  );
  const f = findings[0];
  assert.strictEqual(f.severity, "HIGH");
  assert.strictEqual(f.detector, "buzzshield-143-wasabi");
  assert.strictEqual(f.contract_name, "WasabiVault");
  assert.strictEqual(f.inherits_uups, true);
  assert.strictEqual(f.inherits_access_control, true);
  assert.strictEqual(f.access_control_role, "DEFAULT_ADMIN_ROLE");
  assert.strictEqual(f.access_control_admin, "msg.sender");
  assert.strictEqual(f.access_control_admin_kind, "msg_sender");
  assert.strictEqual(f.initializer_function, "initialize");
  assert.strictEqual(f.authorize_upgrade_gating_type, "onlyRole");
  assert.strictEqual(f.authorize_upgrade_role_arg, "DEFAULT_ADMIN_ROLE");
  assert.strictEqual(f.timelock_present, false);
  assert.strictEqual(f.multisig_present, false);
  assert.strictEqual(f.confidence, 0.82);
});

test("consume: negative-renegade-head-143 emits 0 findings (NOT UUPS)", () => {
  const findings = detector.scanSource(
    path.join(FIXTURES_ROOT, "negative-renegade-head-143"),
  );
  assert.strictEqual(
    findings.length,
    0,
    `expected 0 findings (Doctrine #14 negative case), got ${findings.length}: ${JSON.stringify(findings, null, 2)}`,
  );
});

test("consume: negative-boros-143 emits 0 findings (suppressed by timelock)", () => {
  const findings = detector.scanSource(
    path.join(FIXTURES_ROOT, "negative-boros-143"),
  );
  assert.strictEqual(
    findings.length,
    0,
    `expected 0 findings (timelock suppression), got ${findings.length}: ${JSON.stringify(findings, null, 2)}`,
  );
});

// ============================================================
// Field-shape contract — all required fields present on findings
// ============================================================
console.log("\n[Contract: finding shape — all required fields present]");

test("contract: every #143 finding has required field set", () => {
  const findings = detector.scanSource(
    path.join(FIXTURES_ROOT, "positive-wasabi-143"),
  );
  const required = [
    "severity",
    "detector",
    "mode",
    "file",
    "line",
    "contract_name",
    "inherits_uups",
    "inherits_access_control",
    "access_control_role",
    "access_control_admin",
    "access_control_admin_kind",
    "access_control_admin_addr",
    "initializer_function",
    "authorize_upgrade_gating_type",
    "authorize_upgrade_role_arg",
    "timelock_present",
    "multisig_present",
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
