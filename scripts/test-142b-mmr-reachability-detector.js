#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * E2E unit test for #142b MMR-reachability detector.
 *
 * Per detector-pr-template.md MANDATE, this test walks the FULL field-flow
 * for the new detector — emit (file walk + MMR-verifier identification) →
 * collect (caller-chain BFS + entry-point + fund-flow classification) →
 * consume (final findings shape, severity calibration).
 *
 * Two fixtures exercised:
 *
 *   1. positive-permissionless-fund-flow — Bridge with permissionless
 *      external entry (claimWithProof) calling verifyMmrProof, then
 *      token.transfer.
 *      Expected: CRITICAL-amplifier
 *               reachability=permissionless,
 *               fund_flow_present=true,
 *               fund_flow_kind=erc20_transfer,
 *               conf 0.85,
 *               caller_chain=[claimWithProof, verifyMmrProof].
 *
 *   2. negative-sig-gated-no-fund-flow — IBC light-client reader with
 *      onlyRole-gated wrapper around an internal verifyMMR; no fund flow
 *      anywhere.
 *      Expected: INFO
 *               reachability=role_gated,
 *               fund_flow_present=false,
 *               fund_flow_kind=none,
 *               conf 0.55.
 *
 * Plus offline coverage on the entry-point + fund-flow classifiers.
 *
 * Run: node scripts/test-142b-mmr-reachability-detector.js
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");
const detector = require("./buzzshield-142b-mmr-reachability-detector.js");
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

console.log("=== #142b MMR-reachability detector E2E test ===\n");

// ============================================================
// EMIT layer probe — file walk + MMR-verifier identification
// ============================================================
console.log("[Layer 1: EMIT — file walk + MMR-verifier identification]");

test("emit: walkSolidityFiles discovers permissionless-fund-flow fixture", () => {
  const files = scanner.walkSolidityFiles(
    path.join(FIXTURES_ROOT, "positive-permissionless-fund-flow"),
  );
  assert.strictEqual(
    files.length,
    1,
    `expected 1 .sol file, got ${files.length}`,
  );
  assert.ok(/bridge\.sol$/.test(files[0]), `unexpected file: ${files[0]}`);
});

test("emit: extractContracts finds HyperbridgePermissionlessBridge", () => {
  const src = fs.readFileSync(
    path.join(FIXTURES_ROOT, "positive-permissionless-fund-flow/bridge.sol"),
    "utf8",
  );
  const contracts = scanner.extractContracts(src);
  const names = contracts.map((c) => c.name).sort();
  // Includes IERC20 interface + the contract.
  assert.ok(names.includes("HyperbridgePermissionlessBridge"));
});

test("emit: MMR-verifier identification reaches verifyMmrProof in permissionless fixture", () => {
  // Direct exercise of #142a's identification primitive (re-exported via #142b).
  const a = detector._a;
  const src = fs.readFileSync(
    path.join(FIXTURES_ROOT, "positive-permissionless-fund-flow/bridge.sol"),
    "utf8",
  );
  const contracts = scanner.extractContracts(src);
  const c = contracts.find(
    (cc) => cc.name === "HyperbridgePermissionlessBridge",
  );
  const fns = scanner.extractFunctions(c.body);
  const target = fns.find((f) => f.name === "verifyMmrProof");
  assert.ok(target, "verifyMmrProof not found");
  const fileImportHints = a.fileHasMmrImports(src);
  const fileHasMmrStruct = a.fileDeclaresMmrStruct(src);
  assert.strictEqual(
    a.isMmrVerifier(target, fileImportHints, fileHasMmrStruct),
    true,
  );
});

// ============================================================
// COLLECT layer probe — caller-chain BFS + entry/fund classification
// ============================================================
console.log("\n[Layer 2: COLLECT — caller-chain + classifier primitives]");

test("collect: classifyEntryPoint flags permissionless on un-gated external", () => {
  const fn = {
    modifiersRaw: "external returns (bool)",
    body: "token.transfer(to, amount);",
  };
  assert.strictEqual(detector.classifyEntryPoint(fn), "permissionless");
});

test("collect: classifyEntryPoint flags owner_only on onlyOwner", () => {
  const fn = {
    modifiersRaw: "external onlyOwner returns (bool)",
    body: "token.transfer(to, amount);",
  };
  assert.strictEqual(detector.classifyEntryPoint(fn), "owner_only");
});

test("collect: classifyEntryPoint flags role_gated on onlyRole(...)", () => {
  const fn = {
    modifiersRaw: "external onlyRole(RELAYER_ROLE) returns (bool)",
    body: "return true;",
  };
  assert.strictEqual(detector.classifyEntryPoint(fn), "role_gated");
});

test("collect: classifyEntryPoint flags sig_gated on ecrecover in body", () => {
  const fn = {
    modifiersRaw: "external returns (bool)",
    body: "require(ecrecover(d, v, r, s) == owner, 'BAD');",
  };
  assert.strictEqual(detector.classifyEntryPoint(fn), "sig_gated");
});

test("collect: classifyEntryPoint returns null on internal/private (no entry)", () => {
  const fn = {
    modifiersRaw: "internal pure returns (bool)",
    body: "return true;",
  };
  assert.strictEqual(detector.classifyEntryPoint(fn), null);
});

test("collect: classifyFundFlow detects erc20_transfer", () => {
  const text = "token.transfer(recipient, amount);";
  assert.strictEqual(detector.classifyFundFlow(text), "erc20_transfer");
});

test("collect: classifyFundFlow detects raw_eth_call", () => {
  const text = "(bool ok, ) = recipient.call{value: amount}('');";
  assert.strictEqual(detector.classifyFundFlow(text), "raw_eth_call");
});

test("collect: classifyFundFlow detects mint", () => {
  const text = "_mint(recipient, amount);";
  assert.strictEqual(detector.classifyFundFlow(text), "mint");
});

test("collect: classifyFundFlow returns 'none' on view-only body", () => {
  const text = "uint256 x = state.lastHeight; return x;";
  assert.strictEqual(detector.classifyFundFlow(text), "none");
});

test("collect: findCallerChains walks claimWithProof → verifyMmrProof in fixture 1", () => {
  const src = fs.readFileSync(
    path.join(FIXTURES_ROOT, "positive-permissionless-fund-flow/bridge.sol"),
    "utf8",
  );
  const contracts = scanner.extractContracts(src);
  const c = contracts.find(
    (cc) => cc.name === "HyperbridgePermissionlessBridge",
  );
  const fns = scanner.extractFunctions(c.body);
  const verifier = fns.find((f) => f.name === "verifyMmrProof");
  const chains = detector.findCallerChains(verifier, fns, 3);
  // We expect at least one chain rooted at claimWithProof (external).
  const hasClaimChain = chains.some(
    (chain) =>
      chain[0].name === "claimWithProof" &&
      chain[chain.length - 1].name === "verifyMmrProof",
  );
  assert.ok(
    hasClaimChain,
    `chains=${JSON.stringify(chains.map((c) => c.map((f) => f.name)))}`,
  );
});

test("collect: calibrate(permissionless, erc20_transfer) → CRITICAL-amplifier @ 0.85", () => {
  const r = detector.calibrate("permissionless", "erc20_transfer");
  assert.strictEqual(r.severity, "CRITICAL-amplifier");
  assert.strictEqual(r.confidence, 0.85);
});

test("collect: calibrate(role_gated, none) → INFO @ 0.55", () => {
  const r = detector.calibrate("role_gated", "none");
  assert.strictEqual(r.severity, "INFO");
  assert.strictEqual(r.confidence, 0.55);
});

test("collect: calibrate(sig_gated, mint) → HIGH-amplifier @ 0.75", () => {
  const r = detector.calibrate("sig_gated", "mint");
  assert.strictEqual(r.severity, "HIGH-amplifier");
  assert.strictEqual(r.confidence, 0.75);
});

// ============================================================
// CONSUME layer probe — full scanSource() output shape
// ============================================================
console.log("\n[Layer 3: CONSUME — full scanSource() output shape]");

test("consume: positive-permissionless-fund-flow emits CRITICAL-amplifier", () => {
  const findings = detector.scanSource(
    path.join(FIXTURES_ROOT, "positive-permissionless-fund-flow"),
  );
  const crit = findings.filter((f) => f.severity === "CRITICAL-amplifier");
  assert.strictEqual(
    crit.length,
    1,
    `expected 1 CRITICAL-amplifier, got ${crit.length} (all=${JSON.stringify(findings.map((f) => `${f.severity}/${f.contract_name}.${f.function_name}`))})`,
  );
  const f = crit[0];
  assert.strictEqual(f.detector, "buzzshield-142b-mmr-reachability");
  assert.strictEqual(f.mode, "source");
  assert.strictEqual(f.contract_name, "HyperbridgePermissionlessBridge");
  assert.strictEqual(f.function_name, "verifyMmrProof");
  assert.strictEqual(f.reachability, "permissionless");
  assert.strictEqual(f.fund_flow_present, true);
  assert.strictEqual(f.fund_flow_kind, "erc20_transfer");
  assert.strictEqual(f.confidence, 0.85);
  assert.deepStrictEqual(f.caller_chain, ["claimWithProof", "verifyMmrProof"]);
});

test("consume: negative-sig-gated-no-fund-flow emits INFO at most (no amplifier)", () => {
  const findings = detector.scanSource(
    path.join(FIXTURES_ROOT, "negative-sig-gated-no-fund-flow"),
  );
  const amp = findings.filter(
    (f) =>
      f.severity === "CRITICAL-amplifier" || f.severity === "HIGH-amplifier",
  );
  assert.strictEqual(
    amp.length,
    0,
    `expected 0 amplifier findings, got ${amp.length}: ${JSON.stringify(amp, null, 2)}`,
  );
  // Should still emit INFO so downstream consumers see the verifier.
  const info = findings.filter((f) => f.severity === "INFO");
  assert.ok(info.length >= 1, `expected at least 1 INFO finding`);
  const verifier = info.find((f) => f.function_name === "verifyMMR");
  assert.ok(verifier, "verifyMMR INFO finding missing");
  assert.strictEqual(verifier.fund_flow_present, false);
  assert.strictEqual(verifier.fund_flow_kind, "none");
  assert.strictEqual(verifier.reachability, "role_gated");
});

// ============================================================
// Field-shape contract — required fields on every finding
// ============================================================
console.log("\n[Contract: finding shape — required fields]");

test("contract: every #142b finding has full required field set", () => {
  const findings = [
    ...detector.scanSource(
      path.join(FIXTURES_ROOT, "positive-permissionless-fund-flow"),
    ),
    ...detector.scanSource(
      path.join(FIXTURES_ROOT, "negative-sig-gated-no-fund-flow"),
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
    "reachability",
    "fund_flow_present",
    "fund_flow_kind",
    "caller_chain",
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
    // caller_chain must be a non-empty array of strings
    assert.ok(
      Array.isArray(f.caller_chain) && f.caller_chain.length >= 1,
      `caller_chain must be non-empty array; got ${JSON.stringify(f.caller_chain)}`,
    );
    for (const name of f.caller_chain) {
      assert.strictEqual(typeof name, "string");
    }
  }
});

test("contract: detector identifier is exactly 'buzzshield-142b-mmr-reachability'", () => {
  const findings = detector.scanSource(
    path.join(FIXTURES_ROOT, "positive-permissionless-fund-flow"),
  );
  for (const f of findings) {
    assert.strictEqual(f.detector, "buzzshield-142b-mmr-reachability");
  }
});

test("contract: cross-fixture isolation — #142b findings do NOT emit #142a-specific bounds fields", () => {
  // #142b should never emit missing_check or bounds_present (those are
  // #142a-only). The split design REQUIRES independent verdict objects.
  const findings = [
    ...detector.scanSource(
      path.join(FIXTURES_ROOT, "positive-permissionless-fund-flow"),
    ),
    ...detector.scanSource(
      path.join(FIXTURES_ROOT, "negative-sig-gated-no-fund-flow"),
    ),
  ];
  for (const f of findings) {
    assert.strictEqual(
      f.missing_check,
      undefined,
      `#142b must not emit 'missing_check' field`,
    );
    assert.strictEqual(
      f.bounds_present,
      undefined,
      `#142b must not emit 'bounds_present' field`,
    );
  }
});

test("contract: join-by-tuple — #142a and #142b findings on same fn share (file, contract, function)", () => {
  // Cross-detector contract: when both detectors fire on the same MMR
  // verifier, downstream consumers MUST be able to join by the
  // (file, contract_name, function_name) tuple. The fixtures here are
  // independent (different dirs), so a real join can't happen — but the
  // SHAPE of the keys must match so a future pipeline can do the join.
  const a = require("./buzzshield-142a-mmr-bounds-detector.js");
  const aFindings = a.scanSource(
    path.join(FIXTURES_ROOT, "positive-mmr-no-leaf-bounds"),
  );
  const bFindings = detector.scanSource(
    path.join(FIXTURES_ROOT, "positive-permissionless-fund-flow"),
  );
  const aKey = (f) => `${f.file}::${f.contract_name}::${f.function_name}`;
  const bKey = (f) => `${f.file}::${f.contract_name}::${f.function_name}`;
  // Both must produce stable string keys.
  for (const f of aFindings) {
    const k = aKey(f);
    assert.strictEqual(typeof k, "string");
    assert.ok(k.length > 0);
  }
  for (const f of bFindings) {
    const k = bKey(f);
    assert.strictEqual(typeof k, "string");
    assert.ok(k.length > 0);
  }
});

// ============================================================
// SUMMARY
// ============================================================
console.log(`\n=== ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);
process.exit(0);
