#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * BuzzShield #142b — MMR Reachability Detector (v1.0)
 *
 * The REACHABILITY leg of the #166 split. Independent of #142a's bounds-
 * correctness analysis: #142b answers two structural questions for any
 * MMR-verifier function in the source tree:
 *
 *   1. Is the verifier reachable from a permissionless entry-point?
 *      (any external/public function with NO onlyOwner / onlyRole(...) /
 *       require(msg.sender == ...) gating).
 *
 *   2. Does the verified outcome trigger fund flow downstream?
 *      (transfer / safeTransfer / call{value:...} / _mint / _burn within
 *       the same call path post-verification).
 *
 * Output classification:
 *
 *   CRITICAL-amplifier — both gates (permissionless + fund-flow). When
 *                        joined to a #142a HIGH for the same function tuple,
 *                        the bounds-bug becomes CRITICAL-class. Independent
 *                        of #142a: a permissionless verifier with fund-flow
 *                        is INHERENTLY a CRITICAL amplification vector.
 *   HIGH-amplifier     — fund-flow downstream but verifier behind sig-gated
 *                        entry (signed-message reachability still permits
 *                        crafted-input attacks).
 *   INFO               — verifier present but no fund-flow downstream
 *                        (view-only state read; reachability moot).
 *
 * Output JSON shape per finding:
 *   {
 *     severity: "CRITICAL-amplifier" | "HIGH-amplifier" | "INFO",
 *     detector: "buzzshield-142b-mmr-reachability",
 *     mode: "source",
 *     file: <relative path>,
 *     line: <function declaration line>,
 *     contract_name: <name>,
 *     function_name: <name>,
 *     reachability: "permissionless" | "sig_gated" | "role_gated" | "owner_only",
 *     fund_flow_present: <bool>,
 *     fund_flow_kind: "erc20_transfer" | "raw_eth_call" | "mint" | "burn" | "none",
 *     caller_chain: [string],   // entry-point chain to MMR-verifier
 *     hypothesis: <one-paragraph natural-language>,
 *     confidence: 0.55 | 0.75 | 0.85
 *   }
 *
 * The caller_chain enumerates same-contract callers walked breadth-first
 * up to depth 3 from the verifier. The chain anchors at the topmost
 * external/public function reachable.
 *
 * Independence contract: #142b NEVER references the #142a bounds-correctness
 * verdict. Downstream consumers (Skeptic, V6 pipeline) join #142a + #142b
 * outputs by the (file, contract_name, function_name) tuple — see Doctrine
 * #14 admin/source split + the #166 build-report split-decision section.
 *
 * Reference:
 *   - rules/audit-methodology-v2.md  (L1d Phase 4 + reachability lens)
 *   - rules/detector-pr-template.md  (E2E emit/collect/consume mandate)
 *   - audits/2026-05-10-detector-166-mmr-split-build-report.md (split rationale)
 */

const fs = require("fs");
const path = require("path");
const scanner = require("./lib/proxy-admin-scanner.js");

// ---------------------------------------------------------------------------
// Reuse the MMR-identification heuristics from #142a (zero-deps, pure-Node).
// ---------------------------------------------------------------------------

const a = require("./buzzshield-142a-mmr-bounds-detector.js");
const isMmrVerifier = a.isMmrVerifier;
const fileHasMmrImports = a.fileHasMmrImports;
const fileDeclaresMmrStruct = a.fileDeclaresMmrStruct;

// ---------------------------------------------------------------------------
// Reachability classifiers
// ---------------------------------------------------------------------------

// External/public visibility regex on a function's modifiersRaw (which in
// the proxy-admin-scanner extraction contains the post-paren modifier list
// AND visibility keywords).
const VIS_EXTERNAL_RE = /\b(external|public)\b/;

// Owner-only modifiers
const OWNER_GATING_RE = /\bonlyOwner\b/;

// Role-gated modifiers
const ROLE_GATING_RE = /\bonlyRole\s*\(/;

// require(msg.sender == ...) — sig-gated within the body
const MSG_SENDER_REQUIRE_RE = /require\s*\([^)]*\bmsg\.sender\b[^)]*==/;

// Sig-gated: function performs sig verification before reaching the MMR call.
// We treat this as "sig_gated" in the absence of role/owner.
const SIG_VERIFY_PATTERNS = [
  /\becrecover\s*\(/,
  /\bSignatureChecker\.isValidSignatureNow\s*\(/,
  /\bisValidSignatureNow\s*\(/,
];

function classifyEntryPoint(fn) {
  const mods = fn.modifiersRaw || "";
  const body = fn.body || "";
  const isExternal = VIS_EXTERNAL_RE.test(mods);
  if (!isExternal) return null; // not an entry point at all
  if (OWNER_GATING_RE.test(mods)) return "owner_only";
  if (ROLE_GATING_RE.test(mods)) return "role_gated";
  if (MSG_SENDER_REQUIRE_RE.test(body)) return "role_gated";
  if (SIG_VERIFY_PATTERNS.some((re) => re.test(body))) return "sig_gated";
  return "permissionless";
}

// ---------------------------------------------------------------------------
// Fund-flow classifiers
// ---------------------------------------------------------------------------

const FUND_FLOW_PATTERNS = [
  { kind: "erc20_transfer", re: /\b(?:safeTransfer|safeTransferFrom)\s*\(/ },
  { kind: "erc20_transfer", re: /\.\s*transfer\s*\(/ },
  { kind: "erc20_transfer", re: /\.\s*transferFrom\s*\(/ },
  { kind: "raw_eth_call", re: /\.\s*call\s*\{[^}]*value\s*:/ },
  { kind: "raw_eth_call", re: /\.\s*send\s*\(\s*\w/ },
  { kind: "mint", re: /\b_mint\s*\(/ },
  { kind: "mint", re: /\bmint\s*\(\s*\w/ },
  { kind: "burn", re: /\b_burn\s*\(/ },
  { kind: "burn", re: /\bburn\s*\(\s*\w/ },
];

function classifyFundFlow(text) {
  for (const { kind, re } of FUND_FLOW_PATTERNS) {
    if (re.test(text)) return kind;
  }
  return "none";
}

// ---------------------------------------------------------------------------
// Caller-chain BFS (within a single contract)
// ---------------------------------------------------------------------------

/**
 * BFS up the call graph from a verifier function, depth ≤ 3, finding all
 * same-contract callers. Returns an array of caller chains:
 *   [
 *     [entryFn, ..., verifier],
 *     [entryFn2, ..., verifier],
 *     ...
 *   ]
 *
 * Chains are anchored at the topmost external/public caller reachable.
 */
function findCallerChains(verifierFn, allFns, maxDepth = 3) {
  // Build a reverse-call map: callee_name -> [caller_fn_objects]
  const reverseMap = new Map();
  for (const fn of allFns) {
    if (fn.abstract) continue;
    if (!fn.body) continue;
    const calleeRe = /\b([A-Za-z_]\w*)\s*\(/g;
    let m;
    const seenCallees = new Set();
    while ((m = calleeRe.exec(fn.body)) !== null) {
      const name = m[1];
      if (name === fn.name) continue;
      if (seenCallees.has(name)) continue;
      seenCallees.add(name);
      if (!reverseMap.has(name)) reverseMap.set(name, []);
      reverseMap.get(name).push(fn);
    }
  }

  const chains = [];
  // BFS from verifier outward. Each frontier item is { chain: [fn,...], depth }.
  const queue = [{ chain: [verifierFn], depth: 0 }];
  const seen = new Set([verifierFn.name]);
  while (queue.length > 0) {
    const { chain, depth } = queue.shift();
    const head = chain[0];
    const callers = reverseMap.get(head.name) || [];
    if (callers.length === 0) {
      // No more callers — chain head IS the topmost. Emit if external.
      if (VIS_EXTERNAL_RE.test(head.modifiersRaw || "")) {
        chains.push(chain);
      }
      continue;
    }
    for (const caller of callers) {
      if (seen.has(caller.name)) continue;
      seen.add(caller.name);
      const newChain = [caller, ...chain];
      // If caller is external, we can stop here AND keep looking deeper
      // (some chains may go higher, but external is a valid entry).
      if (VIS_EXTERNAL_RE.test(caller.modifiersRaw || "")) {
        chains.push(newChain);
      }
      if (depth + 1 < maxDepth) {
        queue.push({ chain: newChain, depth: depth + 1 });
      }
    }
  }
  return chains;
}

// ---------------------------------------------------------------------------
// Fund-flow scan along a caller chain
// ---------------------------------------------------------------------------

function fundFlowAlongChain(chain) {
  // Concatenate every body in the chain.
  let text = "";
  for (const fn of chain) {
    text += "\n" + (fn.body || "");
  }
  return classifyFundFlow(text);
}

// ---------------------------------------------------------------------------
// Severity calibration
// ---------------------------------------------------------------------------

function calibrate(reachability, fundFlowKind) {
  const hasFundFlow = fundFlowKind !== "none";
  if (reachability === "permissionless" && hasFundFlow) {
    return { severity: "CRITICAL-amplifier", confidence: 0.85 };
  }
  if (
    (reachability === "sig_gated" || reachability === "role_gated") &&
    hasFundFlow
  ) {
    return { severity: "HIGH-amplifier", confidence: 0.75 };
  }
  // No fund flow OR owner-only: INFO
  return { severity: "INFO", confidence: 0.55 };
}

// ---------------------------------------------------------------------------
// Hypothesis text builders
// ---------------------------------------------------------------------------

function hypoCriticalAmplifier(contract, fn, file, fundFlowKind, chain) {
  const chainStr = chain.map((c) => c.name).join(" → ");
  return (
    `MMR-verifier ${contract}.${fn} (${file}) is reachable from a ` +
    `PERMISSIONLESS external entry-point (caller chain: ${chainStr}) AND the ` +
    `same call path triggers ${fundFlowKind} fund flow. This is the canonical ` +
    `CRITICAL-amplifier shape: any bounds-checking gap in the verifier (see ` +
    `paired #142a finding for this function tuple, if present) becomes ` +
    `directly exploitable with no signature, no role, no owner gate. ` +
    `Independent of #142a's correctness verdict, this reachability profile ` +
    `is the structural attack-surface to harden.`
  );
}

function hypoHighAmplifier(
  contract,
  fn,
  file,
  fundFlowKind,
  reachability,
  chain,
) {
  const chainStr = chain.map((c) => c.name).join(" → ");
  return (
    `MMR-verifier ${contract}.${fn} (${file}) sits behind a ${reachability} ` +
    `entry-point (caller chain: ${chainStr}) AND the call path triggers ` +
    `${fundFlowKind} fund flow. Sig-gated or role-gated reachability ` +
    `narrows the attacker pool but crafted-input attacks against the ` +
    `verifier remain in scope when the gate-bearing actor is compromised, ` +
    `colluding, or the signed message itself is replayable.`
  );
}

function hypoInfo(contract, fn, file, reachability) {
  return (
    `MMR-verifier ${contract}.${fn} (${file}) is reachable via ${reachability} ` +
    `but no downstream fund flow (transfer/call/mint/burn) was detected ` +
    `along the caller chain. The verifier is a candidate for view-only state ` +
    `read; reachability is informational and does NOT amplify any paired ` +
    `#142a bounds finding to CRITICAL.`
  );
}

// ---------------------------------------------------------------------------
// Main scan
// ---------------------------------------------------------------------------

function scanSource(targetPath, opts = {}) {
  const verbose = !!opts.verbose;
  const target = path.resolve(targetPath);
  if (!fs.existsSync(target)) {
    throw new Error("source target not found: " + target);
  }

  let files;
  if (fs.statSync(target).isFile()) {
    files = [target];
  } else {
    files = scanner.walkSolidityFiles(target, {
      includeTests: !!opts.includeTests,
    });
  }

  const findings = [];

  for (const file of files) {
    let src;
    try {
      src = fs.readFileSync(file, "utf8");
    } catch {
      continue;
    }
    const fileImportHints = fileHasMmrImports(src);
    const fileHasMmrStruct = fileDeclaresMmrStruct(src);
    const contracts = scanner.extractContracts(src);
    if (contracts.length === 0) continue;
    const relPath = path.relative(target, file);

    for (const c of contracts) {
      const fns = scanner.extractFunctions(c.body);
      for (const fn of fns) {
        if (!isMmrVerifier(fn, fileImportHints, fileHasMmrStruct)) continue;

        // Step 1 — find caller chains (BFS up to depth 3).
        let chains = findCallerChains(fn, fns, 3);
        // If the verifier itself is external, the chain is just [fn].
        const isVerifierExternal = VIS_EXTERNAL_RE.test(fn.modifiersRaw || "");
        if (isVerifierExternal) {
          chains.push([fn]);
        }
        // Deduplicate by chain-string
        const seenChains = new Set();
        chains = chains.filter((ch) => {
          const k = ch.map((c2) => c2.name).join(">");
          if (seenChains.has(k)) return false;
          seenChains.add(k);
          return true;
        });

        // Step 2 — for each chain, classify entry-point reachability + fund flow.
        // We emit ONE finding per verifier — the WORST-CASE reachability across
        // all chains. (If any chain is permissionless+fund-flow, that's the
        // amplifier severity. If no chains exist, the verifier is internal and
        // unreachable from the contract surface — emit INFO.)
        let bestReach = null;
        let bestKind = "none";
        let bestChain = [fn];
        const reachOrder = {
          permissionless: 4,
          sig_gated: 3,
          role_gated: 2,
          owner_only: 1,
        };
        if (chains.length === 0) {
          // No external entry point reaches this verifier from the same contract.
          // Still emit INFO to give downstream consumers visibility.
          findings.push({
            severity: "INFO",
            detector: "buzzshield-142b-mmr-reachability",
            mode: "source",
            file: relPath,
            line: c.line + countLines(c.body.slice(0, fn.sigStart)),
            contract_name: c.name,
            function_name: fn.name,
            reachability: "unreachable_from_contract_surface",
            fund_flow_present: false,
            fund_flow_kind: "none",
            caller_chain: [fn.name],
            hypothesis:
              `MMR-verifier ${c.name}.${fn.name} (${relPath}) has no caller ` +
              `chain reaching an external/public entry-point in the same ` +
              `contract. Cross-contract reachability is out of scope for the ` +
              `single-contract reachability heuristic; manual triage required.`,
            confidence: 0.55,
          });
          continue;
        }

        for (const chain of chains) {
          const head = chain[0];
          const reach = classifyEntryPoint(head);
          if (!reach) continue; // not actually external — shouldn't happen
          const kind = fundFlowAlongChain(chain);
          const reachScore = reachOrder[reach] || 0;
          const bestScore = reachOrder[bestReach] || 0;
          // Prefer permissionless over sig_gated, etc. Within same reach,
          // prefer chains with fund-flow.
          const isBetter =
            reachScore > bestScore ||
            (reachScore === bestScore &&
              kind !== "none" &&
              bestKind === "none");
          if (isBetter) {
            bestReach = reach;
            bestKind = kind;
            bestChain = chain;
          }
        }
        if (!bestReach) continue;

        const { severity, confidence } = calibrate(bestReach, bestKind);
        const declLine = c.line + countLines(c.body.slice(0, fn.sigStart));
        let hypothesis;
        if (severity === "CRITICAL-amplifier") {
          hypothesis = hypoCriticalAmplifier(
            c.name,
            fn.name,
            relPath,
            bestKind,
            bestChain,
          );
        } else if (severity === "HIGH-amplifier") {
          hypothesis = hypoHighAmplifier(
            c.name,
            fn.name,
            relPath,
            bestKind,
            bestReach,
            bestChain,
          );
        } else {
          hypothesis = hypoInfo(c.name, fn.name, relPath, bestReach);
        }

        if (verbose) {
          console.error(
            `[#142b] ${relPath} ${c.name}.${fn.name} L${declLine} reach=${bestReach} fund=${bestKind} sev=${severity}`,
          );
        }

        findings.push({
          severity,
          detector: "buzzshield-142b-mmr-reachability",
          mode: "source",
          file: relPath,
          line: declLine,
          contract_name: c.name,
          function_name: fn.name,
          reachability: bestReach,
          fund_flow_present: bestKind !== "none",
          fund_flow_kind: bestKind,
          caller_chain: bestChain.map((c2) => c2.name),
          hypothesis,
          confidence,
        });
      }
    }
  }

  return findings;
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function countLines(s) {
  let n = 0;
  for (const c of s) if (c === "\n") n++;
  return n;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      if (i + 1 < argv.length && !argv[i + 1].startsWith("--")) {
        args[key] = argv[++i];
      } else args[key] = true;
    } else args._.push(a);
  }
  return args;
}

function cliMain() {
  const args = parseArgs(process.argv);
  if (!args.source) {
    console.error(
      "Usage:\n" +
        "  buzzshield-142b-mmr-reachability-detector.js --source <path>\n" +
        "Options: [--verbose] [--include-tests] [--out <file.json>]",
    );
    process.exit(1);
  }
  const findings = scanSource(args.source, {
    verbose: !!args.verbose,
    includeTests: !!args["include-tests"],
  });
  const summary = {
    detector: "buzzshield-142b-mmr-reachability",
    version: "1.0",
    scanned_at: new Date().toISOString(),
    finding_count: findings.length,
    findings,
  };
  const out = JSON.stringify(summary, null, 2);
  if (args.out) {
    fs.writeFileSync(args.out, out);
    console.error(
      "Findings written to " + args.out + " (" + findings.length + " findings)",
    );
  } else {
    console.log(out);
  }
}

if (require.main === module) {
  try {
    cliMain();
  } catch (err) {
    console.error("FATAL:", err.stack || err);
    process.exit(3);
  }
}

module.exports = {
  scanSource,
  classifyEntryPoint,
  classifyFundFlow,
  findCallerChains,
  fundFlowAlongChain,
  calibrate,
  VIS_EXTERNAL_RE,
  OWNER_GATING_RE,
  ROLE_GATING_RE,
  FUND_FLOW_PATTERNS,
  _scanner: scanner,
  _a: a,
};
