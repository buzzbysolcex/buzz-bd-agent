#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * BuzzShield #167 — Cross-Replay Detector (v1.0)
 *
 * Detects signature-verification field-binding ASYMMETRY across paired
 * functions in the same Solidity codebase. Two pairing classes:
 *
 *   1. V1/V2 split — same contract NAME minus a trailing version suffix
 *      (e.g. `GasSponsor` ↔ `GasSponsorV2`). If the OLDER variant's binding
 *      fingerprint is a STRICT SUBSET of the NEWER variant's, the older
 *      sig-verification site is flagged HIGH (cross-chain replay class).
 *
 *   2. Cross-instance — same function NAME across multiple contracts in the
 *      same source tree (e.g. `executeSignedWithdrawal` on two TransferLib
 *      instances). If fingerprints differ, the WEAKER variant(s) flag HIGH
 *      (cross-instance replay class — narrow window: fresh wallets / future
 *      redeploys / multi-instance topology).
 *
 *   3. No-pair fallback — single-contract sig-verification site that misses
 *      `block.chainid` OR `address(this)` flags MEDIUM. Keeps the detector
 *      useful on standalone targets where no paired stronger variant exists.
 *
 * Tracked fields (the "binding fingerprint" per sig-verification site):
 *   - chainid           — `block.chainid` referenced anywhere in the digest
 *                          construction OR the EIP-712 domain separator.
 *   - address_this      — `address(this)` referenced anywhere in the digest
 *                          OR the domain separator.
 *   - nonce             — `_nonces[`, `nonces[`, `nonce++`, etc.
 *   - deadline          — `deadline`, `expiry`, `expires`, `validUntil`.
 *   - domain_separator  — keccak256 of a DOMAIN_TYPEHASH-style typehash.
 *
 * Severity gate:
 *   HIGH    — V1/V2 strict-subset fingerprint OR cross-instance fingerprint diverge
 *   MEDIUM  — no-pair sig-verification site missing chainid OR address(this)
 *
 * Confidence calibration:
 *   0.85 — V1/V2 strict-subset asymmetry
 *   0.75 — cross-instance fingerprint divergence
 *   0.55 — no-pair MEDIUM (no paired stronger variant exists)
 *
 * Output JSON shape per finding:
 *   {
 *     severity: "HIGH" | "MEDIUM",
 *     detector: "buzzshield-167-cross-replay",
 *     mode: "source",
 *     file: <relative path>,
 *     line: <function declaration line>,
 *     contract_name: <name>,
 *     function_name: <name>,
 *     binding_fingerprint: { chainid, address_this, nonce, deadline,
 *                            domain_separator },
 *     paired_with: { contract, function, file, line, fingerprint } | null,
 *     asymmetry_class: "v1_v2_strict_subset" | "cross_instance_diverge"
 *                    | "no_pair_missing_canonical",
 *     hypothesis: <one-paragraph natural-language>,
 *     confidence: 0.55 | 0.75 | 0.85
 *   }
 *
 * Reference:
 *   - rules/audit-methodology-v2.md
 *   - rules/detector-pr-template.md
 *   - ground-truth/2026-05-10-renegade-r2-derivatives-held.md
 *     (R-2 #1 GasSponsor v1 cross-chain replay = canonical positive sample)
 *     (R-2 #2 TransferLib cross-instance replay = canonical positive sample)
 */

const fs = require("fs");
const path = require("path");
const scanner = require("./lib/proxy-admin-scanner.js");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Trailing version suffix patterns the V1/V2 pair-finder strips.
//   "GasSponsorV2"        → "GasSponsor"  (V2)
//   "GasSponsorV1"        → "GasSponsor"  (V1)
//   "FooV3"               → "Foo"         (V3)
//   "ContractV10"         → "Contract"    (V10)
const VERSION_SUFFIX_RE = /V(\d+)$/;

// The five fingerprint fields tracked per sig-verification site.
const FP_FIELDS = [
  "chainid",
  "address_this",
  "nonce",
  "deadline",
  "domain_separator",
];

// Sig-verification call patterns (anywhere in the function body).
const SIG_VERIFY_PATTERNS = [
  /\becrecover\s*\(/,
  /\bSignatureChecker\.isValidSignatureNow\s*\(/,
  /\bisValidSignatureNow\s*\(/,
  /\bSignatureCheckerLib\.isValidSignatureNow\s*\(/,
];

// Field-binding pattern matchers — applied to the function body PLUS its
// transitive helpers (digest constructors, _domainSeparator, etc.) when we
// can locate them in the same contract.
const FP_PATTERNS = {
  chainid: /\bblock\.chainid\b/,
  address_this: /\baddress\s*\(\s*this\s*\)/,
  nonce: /\b_?nonces?\b\s*\[|nonces?\s*\[|\bnonce\s*\+\+|\bnonce\s*\+=/,
  deadline: /\bdeadline\b|\bexpir(?:y|es|ation)\b|\bvalidUntil\b/,
  domain_separator:
    /\bDOMAIN_TYPEHASH\b|\bDOMAIN_SEPARATOR\b|_domainSeparator(?:V4)?\s*\(\)|\b_buildDomainSeparator\b|EIP712\b/,
};

// ---------------------------------------------------------------------------
// Utility: count newlines in a substring (for relative line offsets)
// ---------------------------------------------------------------------------

function countLines(s) {
  let n = 0;
  for (const c of s) if (c === "\n") n++;
  return n;
}

// ---------------------------------------------------------------------------
// Per-function fingerprint extraction
// ---------------------------------------------------------------------------

/**
 * Return true when the function body (or any of its same-contract callee
 * helpers) contains a sig-verification primitive.
 */
function hasSigVerification(text) {
  for (const re of SIG_VERIFY_PATTERNS) if (re.test(text)) return true;
  return false;
}

/**
 * Build the 5-field binding fingerprint for a single sig-verification site.
 *
 * The "search text" is the function body PLUS the bodies of any same-contract
 * functions the site calls (best-effort transitive trace, depth 1). This
 * catches the common pattern where `executeSignedX` calls an internal
 * `_hashWithdrawal` helper that builds the actual digest.
 *
 * @param {object} fn        the sig-verifying function
 * @param {object[]} allFns  all functions in the same contract
 */
function buildFingerprint(fn, allFns) {
  // Collect the body of the function PLUS transitive helpers in same
  // contract. We resolve callees with a simple regex pass; depth 1 is
  // enough for the common case (sig-verification → digest builder).
  let searchText = fn.body;
  const helpers = new Set();
  // Find candidate callee names: identifiers immediately followed by '('.
  // Filter to the set of known same-contract function names.
  const calleeRe = /\b([A-Za-z_]\w*)\s*\(/g;
  const sameContractNames = new Set(
    allFns.filter((f) => !f.abstract && f.name).map((f) => f.name),
  );
  let m;
  while ((m = calleeRe.exec(fn.body)) !== null) {
    const name = m[1];
    if (sameContractNames.has(name) && name !== fn.name) helpers.add(name);
  }
  for (const h of helpers) {
    const target = allFns.find((f) => f.name === h && !f.abstract);
    if (target) searchText += "\n" + target.body;
  }

  // Also include the modifiers on the function itself (e.g. EIP-712 mixins
  // that auto-bind chainid via inherited DOMAIN_SEPARATOR).
  searchText += "\n" + (fn.modifiersRaw || "");

  const fp = {};
  for (const k of FP_FIELDS) {
    fp[k] = FP_PATTERNS[k].test(searchText);
  }
  return { fp, helpers: [...helpers] };
}

/**
 * Per-contract sig-verification site discovery. Returns:
 *   [{ contract_name, function_name, line, file, fn, fingerprint, helpers, isHelper }, ...]
 *
 * Logic:
 *   - A function is a "primary" sig-verification site if it directly calls
 *     ecrecover/SignatureChecker OR if it calls a same-contract helper that
 *     does so AND the helper is referenced by THIS function specifically.
 *   - Helper functions (functions that contain ecrecover but are themselves
 *     called by another primary site in the same contract that also passes
 *     the digest in as input) are tagged isHelper=true and EXCLUDED from
 *     V1/V2 + cross-instance + no-pair flagging. They're not the digest
 *     constructor — the caller is.
 */
function findSigVerificationSites(contracts, file) {
  const sites = [];
  for (const c of contracts) {
    const fns = scanner.extractFunctions(c.body);
    // Pass 1 — collect every function that mentions sig-verification primitive
    // (direct or transitive).
    const sigSites = [];
    for (const fn of fns) {
      if (fn.abstract) continue;
      if (fn.kind !== "function") continue;
      const directSig = hasSigVerification(fn.body);
      let transitiveSig = false;
      const calleeRe = /\b([A-Za-z_]\w*)\s*\(/g;
      const sameContractNames = new Set(
        fns.filter((f) => !f.abstract && f.name).map((f) => f.name),
      );
      const calleesThatVerify = new Set();
      let m;
      while ((m = calleeRe.exec(fn.body)) !== null) {
        const name = m[1];
        if (sameContractNames.has(name) && name !== fn.name) {
          const target = fns.find((f) => f.name === name && !f.abstract);
          if (target && hasSigVerification(target.body)) {
            transitiveSig = true;
            calleesThatVerify.add(name);
          }
        }
      }
      if (!directSig && !transitiveSig) continue;
      sigSites.push({ fn, directSig, transitiveSig, calleesThatVerify });
    }

    // Pass 2 — mark helpers. A function is a HELPER iff:
    //   - it has direct sig-verification (ecrecover present)
    //   - AND another sig-verify site in the same contract calls it
    //     transitively (i.e., it appears in some other site's calleesThatVerify)
    const helperNames = new Set();
    for (const s of sigSites) {
      for (const callee of s.calleesThatVerify) {
        helperNames.add(callee);
      }
    }

    // Pass 3 — emit primary sites only (non-helpers). Build fingerprints
    // using transitive depth-1 trace.
    for (const { fn, directSig, transitiveSig } of sigSites) {
      const isHelper = helperNames.has(fn.name);
      if (isHelper) continue;
      const { fp, helpers } = buildFingerprint(fn, fns);
      sites.push({
        contract_name: c.name,
        function_name: fn.name,
        line: c.line + countLines(c.body.slice(0, fn.sigStart)),
        file,
        fingerprint: fp,
        helpers,
        directSig,
        transitiveSig,
      });
    }
  }
  return sites;
}

// ---------------------------------------------------------------------------
// V1/V2 pairing
// ---------------------------------------------------------------------------

/**
 * Group sites by contract base-name (contract name minus trailing Vn).
 * Returns a Map<baseName, Array<{site, version}>>
 */
function groupV1V2(sites) {
  const groups = new Map();
  for (const site of sites) {
    const cn = site.contract_name;
    let base = cn;
    let version = null;
    const m = cn.match(VERSION_SUFFIX_RE);
    if (m) {
      base = cn.slice(0, -m[0].length);
      version = parseInt(m[1], 10);
    } else {
      // No suffix — treat as v1 candidate. Will pair with explicit Vn variants.
      version = 1;
    }
    if (!groups.has(base)) groups.set(base, []);
    groups.get(base).push({ site, version, hadSuffix: !!m });
  }
  return groups;
}

/** A fingerprint is a STRICT SUBSET of B iff every field in A is also in B AND B has at least one field A lacks. */
function isStrictSubset(aFp, bFp) {
  let aHas = false;
  let bHasMore = false;
  for (const k of FP_FIELDS) {
    const a = !!aFp[k];
    const b = !!bFp[k];
    if (a && !b) return false; // A has a field B lacks → not subset
    if (a) aHas = true;
    if (!a && b) bHasMore = true;
  }
  // Allow A to have zero fields — that's still a subset of any B with ≥1 field.
  return bHasMore || (!aHas && Object.values(bFp).some(Boolean));
}

// ---------------------------------------------------------------------------
// Cross-instance pairing
// ---------------------------------------------------------------------------

/**
 * Group sites by function NAME across contracts. Returns a Map<fnName, Site[]>
 * but only for entries where ≥2 distinct contracts have the same function name.
 */
function groupCrossInstance(sites) {
  const byFn = new Map();
  for (const s of sites) {
    if (!byFn.has(s.function_name)) byFn.set(s.function_name, []);
    byFn.get(s.function_name).push(s);
  }
  // Filter to ≥2 distinct contracts
  for (const [fnName, arr] of [...byFn.entries()]) {
    const contracts = new Set(arr.map((s) => s.contract_name));
    if (contracts.size < 2) byFn.delete(fnName);
  }
  return byFn;
}

/**
 * Compute a "strength score" for a fingerprint — how many canonical
 * binding fields are present. Higher = stronger.
 */
function fpStrength(fp) {
  let n = 0;
  for (const k of FP_FIELDS) if (fp[k]) n++;
  return n;
}

/** Two fingerprints are equal iff every tracked field matches. */
function fpEqual(a, b) {
  for (const k of FP_FIELDS) if (!!a[k] !== !!b[k]) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Hypothesis text builders
// ---------------------------------------------------------------------------

function missingFieldsList(weakFp, strongFp) {
  const out = [];
  for (const k of FP_FIELDS) {
    if (!weakFp[k] && strongFp[k]) out.push(k);
  }
  return out;
}

function hypoV1V2(weak, strong, missing) {
  return (
    `Signature-verification site ${weak.contract_name}.${weak.function_name} ` +
    `binds {${FP_FIELDS.filter((k) => weak.fingerprint[k]).join(",") || "none"}} ` +
    `but the paired newer variant ${strong.contract_name}.${strong.function_name} ` +
    `binds {${FP_FIELDS.filter((k) => strong.fingerprint[k]).join(",")}}. ` +
    `Missing in older variant: {${missing.join(",")}}. ` +
    `If the older contract remains deployed, signatures grinded for it can replay ` +
    `wherever the missing field would have been the discriminator (cross-chain when ` +
    `chainid is missing; cross-instance when address(this) is missing; ` +
    `unbounded windows when nonce or deadline are missing).`
  );
}

function hypoCrossInstance(weak, strong, missing) {
  return (
    `Signature-verification function ${weak.function_name} appears on multiple ` +
    `contracts but with diverging binding fingerprints. Weaker site ${weak.contract_name} ` +
    `(${weak.file}:${weak.line}) lacks {${missing.join(",")}} that the stronger site ` +
    `${strong.contract_name} (${strong.file}:${strong.line}) binds. ` +
    `On a chain where multiple instances are deployed (multi-instance topology, ` +
    `fresh-wallet / future-redeploy variants), a signature grinded against one instance ` +
    `replays against any other where the missing fields are absent.`
  );
}

function hypoNoPair(weak, missing) {
  return (
    `Signature-verification site ${weak.contract_name}.${weak.function_name} ` +
    `is missing canonical EIP-712 binding fields {${missing.join(",")}} and no ` +
    `paired stronger variant exists in this source tree. While no asymmetry can be ` +
    `proven without a paired function, the absence of ${missing.join(" and ")} is a ` +
    `latent replay risk: cross-chain (no chainid), cross-instance (no address(this)).`
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

  // Step 1 — collect every sig-verification site across every file.
  const allSites = [];
  for (const file of files) {
    let src;
    try {
      src = fs.readFileSync(file, "utf8");
    } catch {
      continue;
    }
    const contracts = scanner.extractContracts(src);
    if (contracts.length === 0) continue;
    const sites = findSigVerificationSites(
      contracts,
      path.relative(target, file),
    );
    if (verbose && sites.length) {
      console.error(
        `[#167] ${path.relative(target, file)} — ${sites.length} sig-verify site(s)`,
      );
      for (const s of sites) {
        console.error(
          `        ${s.contract_name}.${s.function_name} L${s.line} fp=${JSON.stringify(s.fingerprint)}`,
        );
      }
    }
    allSites.push(...sites);
  }

  if (allSites.length === 0) return [];

  // Step 2 — V1/V2 pairing (per base-name group)
  const findings = [];
  const usedAsPaired = new Set(); // composite key file:contract:function — sites reported under V1/V2 are still eligible for cross-instance
  const v1v2Reports = new Set();

  const groups = groupV1V2(allSites);
  for (const [base, members] of groups.entries()) {
    if (members.length < 2) continue;
    // Sort by version ascending. The strongest wins; weaker subsets flag.
    members.sort((a, b) => a.version - b.version);
    // For each weaker member, find a strictly-stronger newer variant in the
    // same group with the SAME function name whose fingerprint is a strict
    // superset. Function-name match prevents helpers from pairing with
    // primary-site digest builders across V1/V2 boundary.
    for (let i = 0; i < members.length; i++) {
      const weak = members[i];
      for (let j = i + 1; j < members.length; j++) {
        const strong = members[j];
        if (weak.site.function_name !== strong.site.function_name) continue;
        if (weak.version >= strong.version) continue;
        if (isStrictSubset(weak.site.fingerprint, strong.site.fingerprint)) {
          const missing = missingFieldsList(
            weak.site.fingerprint,
            strong.site.fingerprint,
          );
          findings.push({
            severity: "HIGH",
            detector: "buzzshield-167-cross-replay",
            mode: "source",
            file: weak.site.file,
            line: weak.site.line,
            contract_name: weak.site.contract_name,
            function_name: weak.site.function_name,
            binding_fingerprint: weak.site.fingerprint,
            paired_with: {
              contract: strong.site.contract_name,
              function: strong.site.function_name,
              file: strong.site.file,
              line: strong.site.line,
              fingerprint: strong.site.fingerprint,
            },
            asymmetry_class: "v1_v2_strict_subset",
            missing_fields: missing,
            hypothesis: hypoV1V2(weak.site, strong.site, missing),
            confidence: 0.85,
          });
          v1v2Reports.add(siteKey(weak.site));
          // First strict-superset wins; don't double-flag the same weaker site.
          break;
        }
      }
    }
  }

  // Step 3 — Cross-instance pairing (group by function name)
  const ciGroups = groupCrossInstance(allSites);
  const ciReported = new Set();
  for (const [fnName, sites] of ciGroups.entries()) {
    // Skip if all fingerprints are equal (no divergence)
    let allEqual = true;
    for (let i = 1; i < sites.length; i++) {
      if (!fpEqual(sites[0].fingerprint, sites[i].fingerprint)) {
        allEqual = false;
        break;
      }
    }
    if (allEqual) continue;

    // Find the strongest fingerprint
    let maxStrength = -1;
    let strongest = null;
    for (const s of sites) {
      const st = fpStrength(s.fingerprint);
      if (st > maxStrength) {
        maxStrength = st;
        strongest = s;
      }
    }
    if (!strongest) continue;

    // Flag every site weaker than the strongest (skipping the strongest itself
    // and skipping anything already reported under V1/V2 pairing).
    for (const s of sites) {
      if (s === strongest) continue;
      if (fpEqual(s.fingerprint, strongest.fingerprint)) continue;
      if (v1v2Reports.has(siteKey(s))) continue;
      const missing = missingFieldsList(s.fingerprint, strongest.fingerprint);
      if (missing.length === 0) continue; // no missing — it's a peer not a weaker
      findings.push({
        severity: "HIGH",
        detector: "buzzshield-167-cross-replay",
        mode: "source",
        file: s.file,
        line: s.line,
        contract_name: s.contract_name,
        function_name: s.function_name,
        binding_fingerprint: s.fingerprint,
        paired_with: {
          contract: strongest.contract_name,
          function: strongest.function_name,
          file: strongest.file,
          line: strongest.line,
          fingerprint: strongest.fingerprint,
        },
        asymmetry_class: "cross_instance_diverge",
        missing_fields: missing,
        hypothesis: hypoCrossInstance(s, strongest, missing),
        confidence: 0.75,
      });
      ciReported.add(siteKey(s));
    }
  }

  // Step 4 — No-pair MEDIUM fallback (only if not already reported above
  // AND missing chainid OR address(this))
  for (const s of allSites) {
    const key = siteKey(s);
    if (v1v2Reports.has(key) || ciReported.has(key)) continue;
    const fp = s.fingerprint;
    if (fp.chainid && fp.address_this) continue; // strong enough
    // Also require at least ONE binding present — otherwise this is likely a
    // helper that doesn't reach a digest at all (false positive class).
    if (!fp.chainid && !fp.address_this && !fp.domain_separator) continue;
    const missing = [];
    if (!fp.chainid) missing.push("chainid");
    if (!fp.address_this) missing.push("address_this");
    if (missing.length === 0) continue;
    findings.push({
      severity: "MEDIUM",
      detector: "buzzshield-167-cross-replay",
      mode: "source",
      file: s.file,
      line: s.line,
      contract_name: s.contract_name,
      function_name: s.function_name,
      binding_fingerprint: fp,
      paired_with: null,
      asymmetry_class: "no_pair_missing_canonical",
      missing_fields: missing,
      hypothesis: hypoNoPair(s, missing),
      confidence: 0.55,
    });
  }

  return findings;
}

function siteKey(s) {
  return `${s.file}::${s.contract_name}::${s.function_name}`;
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
        "  buzzshield-167-cross-replay-detector.js --source <path>\n" +
        "Options: [--verbose] [--include-tests] [--out <file.json>]",
    );
    process.exit(1);
  }
  const findings = scanSource(args.source, {
    verbose: !!args.verbose,
    includeTests: !!args["include-tests"],
  });
  const summary = {
    detector: "buzzshield-167-cross-replay",
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
  findSigVerificationSites,
  buildFingerprint,
  groupV1V2,
  groupCrossInstance,
  isStrictSubset,
  fpStrength,
  fpEqual,
  missingFieldsList,
  FP_FIELDS,
  FP_PATTERNS,
  SIG_VERIFY_PATTERNS,
  _scanner: scanner,
};
