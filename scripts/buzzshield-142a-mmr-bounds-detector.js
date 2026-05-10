#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * BuzzShield #142a — MMR Bounds Detector (v1.0)
 *
 * Detects MISSING bounds-check primitives on Merkle Mountain Range (MMR)
 * proof-verifier functions in Solidity. This is the PURE STRUCTURAL leg of
 * the #166 split (paired with #142b reachability — see Doctrine #14
 * admin/source split decision in the build report).
 *
 * Identification heuristics for an "MMR-verifier function":
 *
 *   1. Function NAME matches one of: verifyMmrProof, verifyMMR, verifyProof
 *      AND its body / params reference at least one of: peaks, peak,
 *      leafCount, mmrSize.
 *   2. OR the file imports a path containing "MerkleMountainRange" / "MMR"
 *      AND the function body references peaks/leafCount/mmrSize.
 *   3. OR the contract holds a struct with the canonical MMR-proof shape
 *      (peaks bytes32[], leafIndex uint256, siblings bytes32[], merkleProof
 *      bytes32[]) AND the function body references that struct.
 *
 * Required bounds checks per MMR-verifier function:
 *
 *   leaf_index_bounds       — `require(leafIndex < leafCount)` or equivalent
 *                             (`<` not `<=`). Missing ⇒ HIGH.
 *   peak_count_consistency  — `require(peaks.length == popcount(leafCount))`
 *                             or assertion of MMR-size derivation. Missing
 *                             ⇒ HIGH.
 *   sibling_depth_bounds    — `require(siblings.length <= log2(leafCount)+1)`
 *                             or proof-depth bound. Missing ⇒ MEDIUM.
 *   overflow_guard          — pre-Solidity-0.8 only: SafeMath or unchecked-
 *                             free peak iteration. Auto-PASS on 0.8+. Missing
 *                             on pre-0.8 ⇒ LOW.
 *
 * If the function name matches but ALL required checks present → emit
 * NOTHING (negative case).
 *
 * Severity gate:
 *   HIGH    — leaf_index_bounds OR peak_count_consistency missing
 *   MEDIUM  — sibling_depth_bounds missing
 *   LOW     — overflow_guard missing on pre-0.8 Solidity
 *
 * Confidence calibration:
 *   0.85    — leaf_index_bounds (the canonical Hyperbridge / IBC class bug)
 *   0.75    — peak_count_consistency
 *   0.55    — sibling_depth_bounds OR overflow_guard
 *
 * Output JSON shape per finding:
 *   {
 *     severity: "HIGH" | "MEDIUM" | "LOW",
 *     detector: "buzzshield-142a-mmr-bounds",
 *     mode: "source",
 *     file: <relative path>,
 *     line: <function declaration line>,
 *     contract_name: <name>,
 *     function_name: <name>,
 *     missing_check: "leaf_index_bounds" | "peak_count_consistency" |
 *                    "sibling_depth_bounds" | "overflow_guard",
 *     bounds_present: { leaf_index_bounds, peak_count_consistency,
 *                       sibling_depth_bounds, overflow_guard },
 *     hypothesis: <one-paragraph natural-language>,
 *     confidence: 0.55 | 0.75 | 0.85
 *   }
 *
 * Reference:
 *   - rules/audit-methodology-v2.md  (L1d Phase 4 paired-asymmetry lens)
 *   - rules/detector-pr-template.md  (E2E emit/collect/consume mandate)
 *   - audits/2026-05-10-mmr-sweep-{snowbridge,hyperlane,polymer,composable}.md
 *     (Hyperbridge + IBC light-client + Polkadot ParachainBridge classes
 *      where MMR-bounds findings have shipped HIGH-severity bounties)
 */

const fs = require("fs");
const path = require("path");
const scanner = require("./lib/proxy-admin-scanner.js");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Function-name patterns that identify an MMR-verifier (must match in
// combination with at least one MMR_PARAM_HINT in the body or params).
const MMR_FN_NAME_RE = /^(verifyMmrProof|verifyMMR|verifyProof)$/;

// Body or parameter hints that elevate a generic verifyProof() into the
// "MMR-verifier" class.
const MMR_PARAM_HINTS = [
  /\bpeaks\b/,
  /\bpeak\b/,
  /\bleafCount\b/,
  /\bmmrSize\b/,
  /\bmmrProof\b/i,
  /\bsiblings\b/,
];

// Import-path hints — if any import in the file references these,
// verifyProof()-named functions become eligible too.
const MMR_IMPORT_HINTS = [
  /MerkleMountainRange/i,
  /\bMMR\b/,
  /merkle-mountain-range/i,
];

// Canonical MMR-proof struct field set. We don't need an exact match —
// presence of ≥3 of these fields in a struct definition is enough.
// Solidity syntax: `<type> <name>;` — type precedes name.
const MMR_STRUCT_FIELDS = [
  /\bbytes32\[\]\s+peaks\b/,
  /\buint\d*\s+leafIndex\b/,
  /\bbytes32\[\]\s+siblings\b/,
  /\bbytes32\[\]\s+merkleProof\b/,
  /\buint\d*\s+leafCount\b/,
  /\buint\d*\s+mmrSize\b/,
];

// ---------------------------------------------------------------------------
// Bounds-check pattern matchers
// ---------------------------------------------------------------------------

// Required check 1: leafIndex < leafCount  (strict less-than, not <=).
//   require(leafIndex < leafCount, ...)
//   if (leafIndex >= leafCount) revert
//   require(proof.leafIndex < proof.leafCount, ...)
const LEAF_INDEX_BOUNDS_PATTERNS = [
  /require\s*\([^)]*\bleafIndex\b[^)]*<[^)]*\bleafCount\b/,
  /require\s*\([^)]*\bleafCount\b[^)]*>[^)]*\bleafIndex\b/,
  /if\s*\([^)]*\bleafIndex\b[^)]*>=[^)]*\bleafCount\b[^)]*\)\s*\{?\s*revert/,
  /if\s*\([^)]*\bleafCount\b[^)]*<=[^)]*\bleafIndex\b[^)]*\)\s*\{?\s*revert/,
];

// Required check 2: peaks.length == popcount(leafCount)
//   require(peaks.length == _popcount(leafCount), ...)
//   require(peaks.length == popCount(leafCount), ...)
//   require(peaks.length == bitCount(leafCount), ...)
//   require(peaks.length == numPeaks(leafCount), ...)
//   uint expected = _popcount(leafCount); require(peaks.length == expected);
//   require(MMR.peaksFromSize(mmrSize).length == peaks.length, ...);
const PEAK_COUNT_PATTERNS = [
  /require\s*\([^)]*\bpeaks(?:\.length|Length)\b[^)]*==[^)]*(?:popcount|popCount|bitCount|numPeaks|countOnes|_popcount|peaksLength|peaksFromSize|countSetBits)/i,
  /require\s*\([^)]*(?:popcount|popCount|bitCount|numPeaks|countOnes|_popcount|peaksLength|peaksFromSize|countSetBits)[^)]*==[^)]*\bpeaks(?:\.length|Length)\b/i,
  /\b(?:expected|expectedPeaks|peakCount|numExpectedPeaks)\s*=\s*(?:_?popcount|popCount|bitCount|numPeaks|countOnes)/i,
];

// Required check 3: siblings.length <= log2(leafCount) + 1   (proof-depth bound).
//   require(siblings.length <= log2(leafCount) + 1)
//   require(siblings.length <= treeDepth)
//   require(merkleProof.length <= MAX_DEPTH)
//   require(siblings.length < MAX_PROOF_DEPTH)
const SIBLING_DEPTH_PATTERNS = [
  /require\s*\([^)]*(?:siblings|merkleProof)(?:\.length|Length)\b[^)]*<=?[^)]*(?:log2|treeDepth|MAX_DEPTH|MAX_PROOF_DEPTH|maxDepth|height|depth)/i,
  /if\s*\([^)]*(?:siblings|merkleProof)(?:\.length|Length)\b[^)]*>[^)]*(?:log2|treeDepth|MAX_DEPTH|MAX_PROOF_DEPTH|maxDepth|height|depth)[^)]*\)\s*\{?\s*revert/i,
];

// Overflow guards: SafeMath usage, explicit unchecked-free arithmetic, or
// `require(peakIndex < peaks.length)` style guard. Auto-PASS when Solidity
// version is 0.8.x+ (default checked arithmetic).
const SOLIDITY_VERSION_RE = /pragma\s+solidity\s+([^\s;]+)/;
const SAFEMATH_HINTS = [
  /\busing\s+SafeMath\b/,
  /\bSafeMath\.\w+\s*\(/,
  /\bSafeCast\.\w+\s*\(/,
];

// ---------------------------------------------------------------------------
// Solidity-version helper
// ---------------------------------------------------------------------------

function isSolidity08OrHigher(src) {
  const m = src.match(SOLIDITY_VERSION_RE);
  if (!m) return true; // assume modern if missing
  const v = m[1];
  // Strip the leading caret/tilde/etc.
  const stripped = v.replace(/^[\^~>=<\s]+/, "");
  const parts = stripped.split(".");
  if (parts.length < 2) return true;
  const major = parseInt(parts[0], 10);
  const minor = parseInt(parts[1], 10);
  if (!Number.isFinite(major) || !Number.isFinite(minor)) return true;
  if (major > 0) return true;
  return minor >= 8;
}

// ---------------------------------------------------------------------------
// MMR-verifier identification
// ---------------------------------------------------------------------------

/** Does this function look like an MMR-verifier? */
function isMmrVerifier(fn, fileImportHints, fileHasMmrStruct) {
  if (fn.abstract) return false;
  if (fn.kind !== "function") return false;
  if (!fn.name) return false;

  const nameMatch = MMR_FN_NAME_RE.test(fn.name);
  const paramHints = MMR_PARAM_HINTS.some(
    (re) => re.test(fn.paramsRaw) || re.test(fn.body),
  );

  // Direct hit: name pattern + param/body hint.
  if (nameMatch && paramHints) return true;

  // Indirect hit 1: file imports MMR library AND function name is verifyProof
  // AND there's any MMR param hint at all.
  if (fileImportHints && fn.name === "verifyProof" && paramHints) return true;

  // Indirect hit 2: file declares an MMR-struct AND function name verifies
  // and references the struct shape.
  if (fileHasMmrStruct && /^verify/.test(fn.name) && paramHints) return true;

  return false;
}

/**
 * Look at a file's top-level (outside contract bodies AND inside contract
 * bodies) for struct declarations matching the MMR-proof shape.
 *
 * Returns true if any struct in the file has ≥3 of the canonical fields.
 */
function fileDeclaresMmrStruct(src) {
  const stripped = scanner.stripComments(src);
  const re = /\bstruct\s+\w+\s*\{([^}]*)\}/g;
  let m;
  while ((m = re.exec(stripped)) !== null) {
    const body = m[1];
    let hits = 0;
    for (const fre of MMR_STRUCT_FIELDS) {
      if (fre.test(body)) hits++;
    }
    if (hits >= 3) return true;
  }
  return false;
}

function fileHasMmrImports(src) {
  const imports = scanner.extractImports(src);
  for (const imp of imports) {
    for (const re of MMR_IMPORT_HINTS) {
      if (re.test(imp.path)) return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Bounds-check evaluation
// ---------------------------------------------------------------------------

/**
 * Walk a function body PLUS its depth-1 same-contract callees to evaluate
 * each required bounds check. Returns a bool-keyed object.
 *
 * The depth-1 trace is essential because the canonical pattern wraps the
 * actual bounds check in a helper:
 *   function verifyMmrProof(...) {
 *       _validateProof(leafIndex, leafCount, peaks);   // helper does require
 *       ...
 *   }
 */
function evaluateBoundsChecks(fn, allFns, isV08Plus) {
  // Build search text — fn.body PLUS depth-1 helper bodies in same contract.
  let text = fn.body;
  const helpers = new Set();
  const calleeRe = /\b([A-Za-z_]\w*)\s*\(/g;
  const sameContractNames = new Set(
    allFns.filter((f) => !f.abstract && f.name).map((f) => f.name),
  );
  let mm;
  while ((mm = calleeRe.exec(fn.body)) !== null) {
    const name = mm[1];
    if (sameContractNames.has(name) && name !== fn.name) helpers.add(name);
  }
  for (const h of helpers) {
    const target = allFns.find((f) => f.name === h && !f.abstract);
    if (target) text += "\n" + target.body;
  }

  const present = {
    leaf_index_bounds: LEAF_INDEX_BOUNDS_PATTERNS.some((re) => re.test(text)),
    peak_count_consistency: PEAK_COUNT_PATTERNS.some((re) => re.test(text)),
    sibling_depth_bounds: SIBLING_DEPTH_PATTERNS.some((re) => re.test(text)),
    overflow_guard: isV08Plus || SAFEMATH_HINTS.some((re) => re.test(text)),
  };
  return { present, helpers: [...helpers] };
}

// ---------------------------------------------------------------------------
// Hypothesis text builders
// ---------------------------------------------------------------------------

function hypoLeafIndexBounds(contract, fn, file) {
  return (
    `MMR-verifier ${contract}.${fn} (${file}) does not enforce ` +
    `require(leafIndex < leafCount). An attacker can submit a leafIndex ` +
    `outside the committed range; if the verifier accepts and the upstream ` +
    `caller acts on the verified outcome, the bridge / light-client trusts a ` +
    `peak-bag computation built from out-of-range siblings. Canonical ` +
    `Hyperbridge / IBC light-client class — see ground-truth ` +
    `audits/2026-05-10-mmr-sweep-*.md for prior bounty placements.`
  );
}

function hypoPeakCountConsistency(contract, fn, file) {
  return (
    `MMR-verifier ${contract}.${fn} (${file}) does not enforce ` +
    `peaks.length == popcount(leafCount). The MMR has a fixed peak-count ` +
    `derived from the bit-population of leafCount; an attacker can submit a ` +
    `peak-array of arbitrary length, allowing peak-bagging against fabricated ` +
    `peaks that are never validated against the committed MMR size.`
  );
}

function hypoSiblingDepthBounds(contract, fn, file) {
  return (
    `MMR-verifier ${contract}.${fn} (${file}) does not bound ` +
    `siblings.length / merkleProof.length to log2(leafCount) + 1. While the ` +
    `verifier may still iterate correctly on shorter proofs, an unbounded ` +
    `sibling array enables gas-griefing and (depending on iteration logic) ` +
    `path-extension attacks where extra siblings are silently consumed.`
  );
}

function hypoOverflowGuard(contract, fn, file) {
  return (
    `MMR-verifier ${contract}.${fn} (${file}) is on a pre-Solidity-0.8 ` +
    `compiler and does not use SafeMath / SafeCast for peak-bag arithmetic. ` +
    `Peak-iteration on large MMR sizes can overflow uint256 boundaries when ` +
    `unguarded; modern compilers eliminate this class but the legacy code ` +
    `path remains exposed.`
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
    const isV08Plus = isSolidity08OrHigher(src);
    const fileImportHints = fileHasMmrImports(src);
    const fileHasMmrStruct = fileDeclaresMmrStruct(src);
    const contracts = scanner.extractContracts(src);
    if (contracts.length === 0) continue;
    const relPath = path.relative(target, file);

    for (const c of contracts) {
      const fns = scanner.extractFunctions(c.body);
      for (const fn of fns) {
        if (!isMmrVerifier(fn, fileImportHints, fileHasMmrStruct)) continue;
        const { present } = evaluateBoundsChecks(fn, fns, isV08Plus);
        const declLine = c.line + countLines(c.body.slice(0, fn.sigStart));

        if (verbose) {
          console.error(
            `[#142a] ${relPath} ${c.name}.${fn.name} L${declLine} present=${JSON.stringify(present)}`,
          );
        }

        // Emit one finding per missing required check (severity-ranked).
        // Order chosen so HIGHs surface first.
        if (!present.leaf_index_bounds) {
          findings.push({
            severity: "HIGH",
            detector: "buzzshield-142a-mmr-bounds",
            mode: "source",
            file: relPath,
            line: declLine,
            contract_name: c.name,
            function_name: fn.name,
            missing_check: "leaf_index_bounds",
            bounds_present: present,
            hypothesis: hypoLeafIndexBounds(c.name, fn.name, relPath),
            confidence: 0.85,
          });
        }
        if (!present.peak_count_consistency) {
          findings.push({
            severity: "HIGH",
            detector: "buzzshield-142a-mmr-bounds",
            mode: "source",
            file: relPath,
            line: declLine,
            contract_name: c.name,
            function_name: fn.name,
            missing_check: "peak_count_consistency",
            bounds_present: present,
            hypothesis: hypoPeakCountConsistency(c.name, fn.name, relPath),
            confidence: 0.75,
          });
        }
        if (!present.sibling_depth_bounds) {
          findings.push({
            severity: "MEDIUM",
            detector: "buzzshield-142a-mmr-bounds",
            mode: "source",
            file: relPath,
            line: declLine,
            contract_name: c.name,
            function_name: fn.name,
            missing_check: "sibling_depth_bounds",
            bounds_present: present,
            hypothesis: hypoSiblingDepthBounds(c.name, fn.name, relPath),
            confidence: 0.55,
          });
        }
        if (!present.overflow_guard) {
          findings.push({
            severity: "LOW",
            detector: "buzzshield-142a-mmr-bounds",
            mode: "source",
            file: relPath,
            line: declLine,
            contract_name: c.name,
            function_name: fn.name,
            missing_check: "overflow_guard",
            bounds_present: present,
            hypothesis: hypoOverflowGuard(c.name, fn.name, relPath),
            confidence: 0.55,
          });
        }
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
        "  buzzshield-142a-mmr-bounds-detector.js --source <path>\n" +
        "Options: [--verbose] [--include-tests] [--out <file.json>]",
    );
    process.exit(1);
  }
  const findings = scanSource(args.source, {
    verbose: !!args.verbose,
    includeTests: !!args["include-tests"],
  });
  const summary = {
    detector: "buzzshield-142a-mmr-bounds",
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
  isMmrVerifier,
  fileDeclaresMmrStruct,
  fileHasMmrImports,
  evaluateBoundsChecks,
  isSolidity08OrHigher,
  MMR_FN_NAME_RE,
  MMR_PARAM_HINTS,
  LEAF_INDEX_BOUNDS_PATTERNS,
  PEAK_COUNT_PATTERNS,
  SIBLING_DEPTH_PATTERNS,
  _scanner: scanner,
};
