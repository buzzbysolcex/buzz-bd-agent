#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║        BuzzShield V6 — Unified Security Scanner             ║
 * ║        7-Layer Pipeline Orchestrator                        ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║  Layer 1: Consensus Analyzer (meta-pattern scanner)         ║
 * ║  Layer 2: Pashov Audit Group (Solidity auditor + x-ray)     ║
 * ║  Layer 3: H-mmer/pentest-agents (PoC construction)          ║
 * ║  Layer 4: Skeptic (adversarial false-positive elimination)  ║
 * ║  Layer 5: Raptor Z3 (mathematical path verification)        ║
 * ║  Layer 6: Invariant Database (pattern priors)               ║
 * ║  Layer 7: Auto-Report Generator (platform submissions)      ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Usage:
 *   node buzzshield-v6-pipeline.js --target <repo-path> [options]
 *
 * Options:
 *   --target <path>      Path to cloned repository to scan
 *   --language <lang>    Force language (auto-detected if not set)
 *   --platform <name>    Target bounty platform (hackerone|immunefi|hackenproof)
 *   --program <name>     Program name (e.g., "Circle BBP", "OKG")
 *   --output <dir>       Output directory
 *   --skip-layers <n,n>  Skip specific layers (e.g., --skip-layers 3,5)
 *   --dry-run            Run Layers 1-2 + 6 only (no LLM, no Z3)
 *   --verbose            Detailed output
 *
 * @author Buzz Security Research (SolCex Exchange)
 * @version 1.0.0 — 2026-05-04
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// ─── LAYER IMPORTS ──────────────────────────────────────────────────────────────

// All layers are loaded relative to this script's directory
const SCRIPT_DIR = __dirname;

function loadLayer(name, opts = {}) {
  try {
    return require(path.join(SCRIPT_DIR, name));
  } catch (e) {
    if (opts.required) {
      console.error(`❌ Required layer module ${name} not found: ${e.message}`);
      console.error(
        `   Pipeline cannot continue. Build the missing module before re-running.`,
      );
      process.exit(2);
    }
    console.warn(`⚠️  Layer module ${name} not found: ${e.message}`);
    return null;
  }
}

/**
 * Verify a layer produced its expected output file. If --strict-layers is on,
 * fail the pipeline when an expected file is missing or empty.
 */
function verifyLayerOutput(name, file, strict) {
  if (!fs.existsSync(file)) {
    const msg = `Layer ${name} did not produce output ${file}`;
    if (strict) {
      console.error(`❌ ${msg}`);
      process.exit(3);
    }
    console.warn(`⚠️  ${msg}`);
    return false;
  }
  const sz = fs.statSync(file).size;
  if (sz === 0) {
    const msg = `Layer ${name} produced empty output ${file}`;
    if (strict) {
      console.error(`❌ ${msg}`);
      process.exit(3);
    }
    console.warn(`⚠️  ${msg}`);
    return false;
  }
  return true;
}

// ─── CONFIGURATION ──────────────────────────────────────────────────────────────

const CONFIG = {
  PASHOV_AUDITOR_PATH:
    "/home/claude-code/buzz-workspace/node_modules/.bin/solidity-auditor",
  PASHOV_XRAY_PATH: "/home/claude-code/buzz-workspace/node_modules/.bin/x-ray",
  PENTEST_AGENTS_PATH: "/home/claude-code/pentest-agents",
  RAPTOR_PATH: "/home/claude-code/raptor",
  BUG_HUNTER_PATH: "/home/claude-code/bug-hunter",
  OUTPUT_BASE: "/data/buzz/persistent/reports",
  POC_BASE: "/home/claude-code/buzz-secrets/poc",
};

// ─── FILE DISCOVERY ─────────────────────────────────────────────────────────────

/**
 * Hard-exclusion sets, named so individual rules can be selectively relaxed
 * by feature flags (--include-periphery, --include-tests).
 *
 * HE-01: build artefacts and dependency caches — always skipped.
 * HE-02: test files — patterns evaluated at filename level only. Periphery
 *        code that happens to live under test-named directories (e.g.
 *        Foundry's `test/helpers/Setup.sol`) is in-scope when
 *        --include-periphery is set; the test-FILE skip remains.
 * HE-03: periphery / deployment / utility directories — skipped by DEFAULT
 *        (signal-to-noise is poor on a scoped audit). Re-included via
 *        --include-periphery. Origin: @rootedrescue's $400K Enzyme bounty
 *        was found in periphery/ — main-contract scope alone misses this
 *        bug class entirely.
 */
const HE_01_DIRS = [
  "node_modules",
  "vendor",
  "target",
  "build",
  "dist",
  ".git",
  ".next",
  "out",
];
const HE_02_FILE_PATTERNS = {
  go: (name) => name.endsWith("_test.go"),
  ts: (name) => name.endsWith(".test.ts") || name.endsWith(".spec.ts"),
  js: (name) => name.endsWith(".test.js") || name.endsWith(".spec.js"),
  py: (name) => /^test_|_test\.py$/.test(name),
  sol: (name) => /\.t\.sol$|^Test[A-Z].*\.sol$/.test(name), // Foundry test conventions
};
const HE_03_PERIPHERY_DIRS = new Set([
  "test",
  "tests",
  "__tests__", // test dirs
  "scripts",
  "script", // deploy / forge scripts
  "deploy",
  "deployments",
  "migrations", // hardhat / truffle migrations
  "relayer",
  "relayers",
  "forwarder",
  "forwarders", // ERC-2771 / meta-tx infra
  "periphery",
  "helpers",
  "utils",
  "ops",
  "tools", // utility code
  "examples",
]);
// HE-03b (#123, May 9 2026 — Symbiotic regression): unconditional excludes.
// FV harnesses (certora/), mock contracts (mocks/, mock/), and Foundry submodule
// dependencies (lib/, forge-std/) are NEVER in audit scope regardless of
// --include-periphery. Symbiotic surfaced 11 lib/ findings before this guard.
// Single source of truth — semgrep + L1d both consult this set.
const HE_03B_ALWAYS_EXCLUDE_DIRS = new Set([
  "certora",
  "mocks",
  "mock",
  "lib",
  "forge-std",
]);

function discoverFiles(targetPath, opts = {}) {
  const files = {
    solidity: [],
    rust: [],
    go: [],
    typescript: [],
    python: [],
    c: [],
  };
  const peripheryFiles = []; // separate bucket — only populated when includePeriphery
  const includePeriphery = !!opts.includePeriphery;

  function classifyFile(fullPath, name, isPeriphery) {
    if (name.endsWith(".sol")) {
      if (HE_02_FILE_PATTERNS.sol(name)) return;
      files.solidity.push(fullPath);
      if (isPeriphery) peripheryFiles.push(fullPath);
    } else if (name.endsWith(".rs")) {
      files.rust.push(fullPath);
      if (isPeriphery) peripheryFiles.push(fullPath);
    } else if (name.endsWith(".go")) {
      if (HE_02_FILE_PATTERNS.go(name)) return;
      files.go.push(fullPath);
      if (isPeriphery) peripheryFiles.push(fullPath);
    } else if (name.endsWith(".ts")) {
      if (HE_02_FILE_PATTERNS.ts(name)) return;
      files.typescript.push(fullPath);
      if (isPeriphery) peripheryFiles.push(fullPath);
    } else if (name.endsWith(".js")) {
      if (HE_02_FILE_PATTERNS.js(name)) return;
      // Existing pipeline never ingested .js — leave it that way for now;
      // periphery scan can still see it via the bespoke deploy-analyzer pass.
      if (isPeriphery) peripheryFiles.push(fullPath);
    } else if (name.endsWith(".py")) {
      if (HE_02_FILE_PATTERNS.py(name)) return;
      files.python.push(fullPath);
      if (isPeriphery) peripheryFiles.push(fullPath);
    } else if (name.endsWith(".c") || name.endsWith(".h")) {
      files.c.push(fullPath);
      if (isPeriphery) peripheryFiles.push(fullPath);
    }
  }

  function walk(dir, inheritPeriphery) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (HE_01_DIRS.includes(entry.name)) continue;
        if (HE_03B_ALWAYS_EXCLUDE_DIRS.has(entry.name)) continue; // HE-03b unconditional
        const isPeriphery =
          inheritPeriphery || HE_03_PERIPHERY_DIRS.has(entry.name);
        if (isPeriphery && !includePeriphery) continue; // HE-03 default skip
        walk(fullPath, isPeriphery);
      } else {
        classifyFile(fullPath, entry.name, inheritPeriphery);
      }
    }
  }

  walk(targetPath, false);
  files.periphery = peripheryFiles;
  return files;
}

function detectLanguage(files) {
  const counts = Object.entries(files)
    .map(([lang, f]) => [lang, f.length])
    .sort((a, b) => b[1] - a[1]);
  return counts[0]?.[0] || "unknown";
}

// ─── LAYER 1: CONSENSUS ANALYZER ────────────────────────────────────────────────

/**
 * Periphery / deploy-script signal set. Layer 1 runs this regex bank ONLY on
 * files in the periphery bucket (scripts/, deploy/, migrations/, etc.) when
 * --include-periphery is on. Each hit is a Pattern A candidate — the question
 * the hit forces the auditor to answer is: "does the main contract re-validate
 * what this script set, or does it assume the deploy-time config is immutable?"
 *
 * Origin: @rootedrescue's $400K Enzyme bounty on Immunefi (msg 5839). The bug
 * sat in deploy code, not the scoped contracts.
 */
const PERIPHERY_DEPLOY_SIGNALS = [
  {
    id: "P-DEPLOY-01",
    desc: "Hardcoded admin/owner/multisig address",
    re: /\b(?:admin|owner|treasury|multisig|deployer|guardian|protocolFeeRecipient)\s*[:=]\s*(?:address\s*\(\s*)?(?:0x[a-fA-F0-9]{40}|"0x[a-fA-F0-9]{40}")/g,
  },
  {
    id: "P-DEPLOY-02",
    desc: "Permission grant / role assignment in deploy",
    re: /\b(?:grantRole|transferOwnership|setAdmin|setOwner|setOperator|setController|addPauser|addMinter|setGov|setGovernance)\s*\(/g,
  },
  {
    id: "P-DEPLOY-03",
    desc: "Proxy upgrade pattern without access-control hint",
    re: /\b(?:upgradeTo|upgradeToAndCall|setImplementation|changeAdmin|TransparentUpgradeableProxy|UUPSUpgradeable)\b/g,
  },
  {
    id: "P-DEPLOY-04",
    desc: "init/initialize function defined or called — front-run risk",
    re: /\bfunction\s+initialize\s*\(|\.initialize\s*\(/g,
  },
  {
    id: "P-DEPLOY-05",
    desc: "Constructor + initializer mismatch (upgradeable proxy pattern)",
    re: /\bconstructor\s*\([^)]*\)[\s\S]{0,500}?function\s+initialize\s*\(/g,
  },
  {
    id: "P-DEPLOY-06",
    desc: "No timelock on admin setup",
    re: /\b(?:setAdmin|transferOwnership|grantRole|setController|setOperator)\s*\([^)]*\)\s*;/g,
  },
  {
    id: "P-DEPLOY-07",
    desc: "Possible deployer private-key pattern in plaintext",
    re: /\b(?:DEPLOYER_KEY|PRIVATE_KEY|MNEMONIC|deployerKey|privateKey)\s*[:=]\s*['"]?[0-9a-fA-FxX]{32,}/g,
  },
  {
    id: "P-DEPLOY-08",
    desc: "Cross-chain deployer wallet reuse (same key on multiple chains)",
    re: /(?:vm\.startBroadcast|deployerPrivateKey|deployer\.connect)\s*\([^)]*0x[a-fA-F0-9]{32,}/g,
  },
];

function runPeripheryDeploySweep(peripheryFiles) {
  const findings = [];
  for (const file of peripheryFiles) {
    let code;
    try {
      code = fs.readFileSync(file, "utf8");
    } catch {
      continue;
    }
    for (const sig of PERIPHERY_DEPLOY_SIGNALS) {
      const re = new RegExp(sig.re.source, sig.re.flags);
      let m;
      while ((m = re.exec(code)) !== null) {
        const lineNo = code.slice(0, m.index).split("\n").length;
        findings.push({
          id: `L1-PERI-${findings.length + 1}`,
          layer: 1,
          title: `Periphery / deploy: ${sig.desc}`,
          severity: sig.id === "P-DEPLOY-07" ? "CRITICAL" : "MEDIUM",
          file,
          line: lineNo,
          language: "periphery",
          cwe: "CWE-732", // Incorrect Permission Assignment for Critical Resource
          pattern: "A",
          description: `Pattern A target in periphery file. Question: does the main contract re-validate ${sig.desc.toLowerCase()}, or assume the deploy-script value is immutable? See @rootedrescue Enzyme $400K bounty (Apr 2026) for prior art.`,
          evidence: `${sig.id} @ ${path.basename(file)}:${lineNo}\n  ${m[0].slice(0, 200)}`,
          fingerprint: sig.id,
        });
      }
    }
  }
  return findings;
}

function runLayer1(files, language, invariants, opts = {}) {
  console.log("\n📡 Layer 1: Consensus Analyzer (Meta-Pattern Scanner)");
  const findings = [];
  const targetFiles = files[language] || [];
  console.log(`   Scanning ${targetFiles.length} ${language} files...`);

  if (!invariants) {
    console.log("   ⚠️  Invariant DB not loaded — using built-in patterns");
  }

  for (const file of targetFiles) {
    try {
      const code = fs.readFileSync(file, "utf8");
      const matches = invariants
        ? invariants.matchPatterns(code, language)
        : [];

      for (const match of matches) {
        findings.push({
          id: `L1-${findings.length + 1}`,
          layer: 1,
          title: `${match.pattern_name} detected in ${path.basename(file)}`,
          severity: "MEDIUM",
          file: file,
          line: null,
          language,
          cwe: match.cwe?.[0] || "CWE-Unknown",
          pattern: match.pattern,
          description: `${match.pattern_name}: ${match.description}. ${match.match_count} signal(s) found.`,
          evidence: match.matches
            .map((m) => `${m.role}: ${m.match}`)
            .join("\n"),
          match_count: match.match_count,
        });
      }
    } catch {}
  }

  // Periphery / deploy-script Pattern A sweep — only when --include-periphery
  if (
    opts.includePeriphery &&
    Array.isArray(files.periphery) &&
    files.periphery.length > 0
  ) {
    console.log(
      `   Periphery sweep: scanning ${files.periphery.length} files for deploy-script Pattern A signals...`,
    );
    const peripheryFindings = runPeripheryDeploySweep(files.periphery);
    findings.push(...peripheryFindings);
    console.log(
      `   Periphery sweep: +${peripheryFindings.length} candidate finding(s)`,
    );
  }

  console.log(`   Found ${findings.length} pattern matches`);
  return findings;
}

// ─── LAYER 2: PASHOV AUDIT ──────────────────────────────────────────────────────

function runLayer2(files) {
  console.log("\n🔐 Layer 2: Pashov Audit Group (Solidity Auditor + X-Ray)");
  const findings = [];
  const solFiles = files.solidity || [];

  if (solFiles.length === 0) {
    console.log("   No Solidity files found — skipping Layer 2");
    return findings;
  }

  console.log(`   Scanning ${solFiles.length} Solidity files...`);

  for (const file of solFiles) {
    // Try x-ray v2
    try {
      const result = execSync(
        `cd ${path.dirname(file)} && npx x-ray ${file} --json 2>/dev/null || echo '[]'`,
        { timeout: 60000, stdio: ["pipe", "pipe", "pipe"] },
      )
        .toString()
        .trim();

      const xrayFindings = JSON.parse(result || "[]");
      for (const xf of xrayFindings) {
        findings.push({
          id: `L2-XRAY-${findings.length + 1}`,
          layer: 2,
          title: xf.title || xf.name || "X-Ray finding",
          severity: xf.severity || "MEDIUM",
          file: file,
          line: xf.line || null,
          language: "solidity",
          cwe: xf.cwe || "CWE-Unknown",
          pattern: null,
          description: xf.description || "Pashov x-ray finding",
          evidence: xf.code || "",
        });
      }
    } catch (e) {
      if (e.message.includes("not found") || e.message.includes("ENOENT")) {
        console.log(
          `   ⚠️  Pashov x-ray not installed — run: npm install -g @pashov/x-ray`,
        );
      }
    }

    // Try solidity-auditor v2
    try {
      const result = execSync(
        `cd ${path.dirname(file)} && npx solidity-auditor ${file} --json 2>/dev/null || echo '[]'`,
        { timeout: 60000, stdio: ["pipe", "pipe", "pipe"] },
      )
        .toString()
        .trim();

      const auditorFindings = JSON.parse(result || "[]");
      for (const af of auditorFindings) {
        findings.push({
          id: `L2-AUDIT-${findings.length + 1}`,
          layer: 2,
          title: af.title || "Solidity auditor finding",
          severity: af.severity || "MEDIUM",
          file: file,
          line: af.line || null,
          language: "solidity",
          cwe: af.cwe || "CWE-Unknown",
          pattern: null,
          description: af.description || "Pashov solidity-auditor finding",
          evidence: af.code || "",
        });
      }
    } catch {}
  }

  console.log(`   Found ${findings.length} Pashov findings`);
  return findings;
}

// ─── MAIN PIPELINE ──────────────────────────────────────────────────────────────

async function runPipeline(options) {
  const startTime = Date.now();
  const skipLayers = new Set(
    (options.skipLayers || "").split(",").map(Number).filter(Boolean),
  );

  console.log(
    "╔══════════════════════════════════════════════════════════════╗",
  );
  console.log(
    "║        BuzzShield V6 — Unified Security Scanner             ║",
  );
  console.log(
    "╚══════════════════════════════════════════════════════════════╝",
  );
  console.log(`\n   Target:   ${options.target}`);
  console.log(`   Platform: ${options.platform || "hackerone"}`);
  console.log(`   Program:  ${options.program || "auto"}`);
  console.log(
    `   Skipping: ${skipLayers.size > 0 ? [...skipLayers].join(", ") : "none"}`,
  );

  // ─── Setup ────────────────────────────────────────────────────────────────
  const commitHash = (() => {
    try {
      return execSync(`cd ${options.target} && git rev-parse HEAD 2>/dev/null`)
        .toString()
        .trim();
    } catch {
      return "unknown";
    }
  })();
  console.log(`   Commit:   ${commitHash}`);

  const files = discoverFiles(options.target, {
    includePeriphery: options.includePeriphery,
  });
  const language = options.language || detectLanguage(files);
  if (options.includePeriphery) {
    console.log(
      `   Periphery: included (${(files.periphery || []).length} files in scripts/, deploy/, relayer/, etc.)`,
    );
  }
  const totalFiles = Object.values(files).reduce((sum, f) => sum + f.length, 0);
  console.log(`   Language: ${language} (${totalFiles} source files total)`);
  console.log(
    `   Files:    Sol=${files.solidity.length} Rs=${files.rust.length} Go=${files.go.length} TS=${files.typescript.length} Py=${files.python.length} C=${files.c.length}`,
  );

  // Output directory
  const scanId = `scan-${new Date().toISOString().slice(0, 10)}-${path.basename(options.target)}`;
  const outputDir = path.join(options.output || CONFIG.OUTPUT_BASE, scanId);
  fs.mkdirSync(outputDir, { recursive: true });

  // ─── --git-delta <since> ─────────────────────────────────────────────────
  // Compute the list of files touched in <target>'s git history since <since>.
  // Pass as --files-from to layer1-deep + semgrep so they scope to changed
  // files only. This shifts the scan from "audit-current-snapshot" to
  // "audit-the-unaudited-changeset" — the actual high-EV surface for mature
  // protocols where the snapshot has been audited already.
  let gitDeltaFile = null;
  let gitDeltaCount = 0;
  if (options.gitDelta) {
    try {
      const cmd = `cd "${options.target}" && git log --since="${options.gitDelta}" --name-only --pretty=format: -- . 2>/dev/null | sort -u | grep -v '^$' || true`;
      const raw = execSync(cmd, {
        encoding: "utf8",
        maxBuffer: 16 * 1024 * 1024,
      });
      const rel = raw
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      // Resolve to absolute paths under the target so layer1-deep / semgrep
      // can match against their full-path file lists.
      const abs = rel
        .map((r) => path.join(options.target, r))
        .filter((p) => fs.existsSync(p)); // drop deletes/renames-then-deleted
      gitDeltaFile = path.join(outputDir, "git-delta-files.txt");
      fs.writeFileSync(gitDeltaFile, abs.join("\n") + "\n");
      gitDeltaCount = abs.length;
      console.log(
        `   Git delta: --since "${options.gitDelta}" → ${gitDeltaCount} files (allowlist at ${gitDeltaFile})`,
      );
    } catch (e) {
      console.warn(
        `   ⚠️  --git-delta failed: ${e.message.slice(0, 200)} — proceeding with full scan`,
      );
      gitDeltaFile = null;
    }
  }

  let allFindings = [];

  // ─── Layer 6: Load Invariant Database (runs first as priors) ──────────
  let invariants = null;
  if (!skipLayers.has(6)) {
    console.log("\n📚 Layer 6: Invariant Database (Loading Pattern Priors)");
    invariants = loadLayer("buzzshield-invariants");
    if (invariants) {
      const prefix = invariants.buildPatternPrefix(language);
      fs.writeFileSync(path.join(outputDir, "pattern-prefix.md"), prefix);
      console.log(
        `   Loaded ${Object.keys(invariants.PATTERNS).length} core patterns + ${Object.keys(invariants.SOLIDITY_PATTERNS || {}).length} Solidity patterns`,
      );
    }
  }

  // ─── Layer 1: Consensus Analyzer (Deep — 12-phase) ─────────────────────
  // Default = Layer 1 v2 (deep). Use --legacy-l1 to fall back to regex/invariants pass.
  if (!skipLayers.has(1)) {
    if (options.legacyL1) {
      const l1Findings = runLayer1(files, language, invariants, {
        includePeriphery: options.includePeriphery,
      });
      allFindings.push(...l1Findings);
    } else {
      console.log("\n📡 Layer 1 v2: Deep Consensus Analyzer (12 phases)");
      try {
        const deepOut = path.join(outputDir, "layer1-deep.json");
        const extraFlags = [
          gitDeltaFile ? `--files-from ${gitDeltaFile}` : "",
          options.designIntent ? `--design-intent ${options.designIntent}` : "",
        ]
          .filter(Boolean)
          .join(" ");
        execSync(
          `node ${path.join(SCRIPT_DIR, "buzzshield-layer1-deep.js")} --target ${options.target} --output ${outputDir} ${extraFlags}`.trim(),
          { timeout: 900000, stdio: "inherit" },
        );
        const deep = JSON.parse(fs.readFileSync(deepOut, "utf8"));
        // Walk each phase that produces findings, normalise into pipeline format
        const collect = (arr, phase) => {
          if (!Array.isArray(arr)) return;
          for (const f of arr) {
            allFindings.push({
              id: `L1d-${allFindings.length + 1}`,
              layer: "1d",
              source_phase: phase,
              title: f.kind
                ? `${f.kind} (Phase ${phase})`
                : `Layer 1 deep finding (Phase ${phase})`,
              severity: f.severity || "MEDIUM",
              file:
                f.function &&
                typeof f.function === "string" &&
                f.function.includes("@")
                  ? f.function.split("@")[1].split(":")[0].trim()
                  : "",
              line:
                f.function &&
                typeof f.function === "string" &&
                f.function.includes(":")
                  ? parseInt(f.function.split(":").pop(), 10) || null
                  : null,
              language: language,
              cwe: "CWE-Unknown",
              pattern: f.pattern || null,
              description: JSON.stringify(f).slice(0, 600),
              evidence:
                f.signer ||
                f.consumer ||
                f.forward ||
                f.reverse ||
                f.signed_fields ||
                f.gap ||
                "",
              kind: f.kind,
              ground_truth_ref: f.ground_truth_ref,
              source: "layer1-deep",
              // #122: forward structured visibility/mutability fields so
              // Skeptic HE-19 can pre-filter view/pure reverse functions.
              forward_visibility: f.forward_visibility || null,
              forward_mutability: f.forward_mutability || null,
              reverse_visibility: f.reverse_visibility || null,
              reverse_mutability: f.reverse_mutability || null,
            });
          }
        };
        const p4 = (deep.phases || {})["4_paired_analysis"] || {};
        collect(p4["4a_validation_asymmetry"], "4a");
        collect(p4["4b_symmetric_paths"], "4b");
        collect(p4["4c_field_binding"], "4c");
        collect(p4["4d_cross_context_identity"], "4d");
        collect(
          ((deep.phases || {})["5_operation_ordering"] || {}).findings,
          "5",
        );
        collect(((deep.phases || {})["6_reentrancy"] || {}).findings, "6");
        collect(((deep.phases || {})["7_oracle"] || {}).findings, "7");
        collect(
          ((deep.phases || {})["8_access_control"] || {}).escalations,
          "8",
        );
        collect(
          ((deep.phases || {})["9_signature_replay"] || {}).findings,
          "9",
        );
        collect(
          ((deep.phases || {})["10_capability_injection"] || {}).findings,
          "10",
        );
        collect(
          ((deep.phases || {})["11_offchain_trust"] || {}).findings,
          "11",
        );
        collect(
          ((deep.phases || {})["12_economic_invariants"] || {}).findings,
          "12",
        );
        console.log(
          `   Layer 1 v2: +${deep.summary?.total_candidates || 0} finding(s) merged (CRITICAL=${deep.summary?.CRITICAL || 0}, HIGH=${deep.summary?.HIGH || 0})`,
        );
      } catch (e) {
        console.log(
          `   ⚠️  Layer 1 v2 deep failed — falling back to legacy regex pass: ${e.message.slice(0, 200)}`,
        );
        const l1Findings = runLayer1(files, language, invariants, {
          includePeriphery: options.includePeriphery,
        });
        allFindings.push(...l1Findings);
      }
    }
  }

  // ─── Layer 1b: Semgrep AST scan (optional, --semgrep) ─────────────────
  if (!skipLayers.has(1) && options.semgrep) {
    console.log("\n🧠 Layer 1b: Semgrep (AST scan)");
    try {
      const semgrepOut = path.join(outputDir, "semgrep-findings.json");
      const semgrepExtra = gitDeltaFile ? ` --files-from ${gitDeltaFile}` : "";
      // #124: when pipeline language is solidity, force semgrep to *.sol only.
      const semgrepSolidity = language === "solidity" ? " --solidity-only" : "";
      execSync(
        `node ${path.join(SCRIPT_DIR, "buzzshield-semgrep.js")} ${options.target} --output ${semgrepOut}${semgrepExtra}${semgrepSolidity}`,
        { timeout: 600000, stdio: "inherit" },
      );
      const semgrepData = JSON.parse(fs.readFileSync(semgrepOut, "utf8"));
      for (const f of semgrepData.findings || []) {
        allFindings.push({
          id: `L1b-${allFindings.length + 1}`,
          layer: "1b",
          title: f.message || f.rule_id,
          severity: f.severity || "MEDIUM",
          file: f.file,
          line: f.start_line || null,
          language: language,
          cwe: (Array.isArray(f.cwe) && f.cwe[0]) || "CWE-Unknown",
          pattern: f.pattern,
          description: f.message || "",
          evidence: f.code_snippet || "",
          rule_id: f.rule_id,
          source: "semgrep",
        });
      }
      console.log(
        `   Layer 1b: +${(semgrepData.findings || []).length} semgrep finding(s) merged`,
      );
    } catch (e) {
      console.log(`   ⚠️  Layer 1b failed: ${e.message.slice(0, 200)}`);
    }
  }

  // ─── Layer 2: Pashov Audit ────────────────────────────────────────────
  if (!skipLayers.has(2)) {
    const l2Findings = runLayer2(files);
    allFindings.push(...l2Findings);
  }

  // Save raw findings before verification layers
  const rawFindingsPath = path.join(outputDir, "raw-findings.json");
  fs.writeFileSync(rawFindingsPath, JSON.stringify(allFindings, null, 2));
  console.log(
    `\n📄 Raw findings saved: ${rawFindingsPath} (${allFindings.length} total)`,
  );

  if (allFindings.length === 0) {
    console.log("\n⚠️  No findings from Layers 1-2. Pipeline complete.");
    return { findings: [], outputDir };
  }

  // ─── Layer 4: Skeptic (False Positive Elimination) — REQUIRED ─────────
  let verifiedFindings = allFindings;
  let skepticVerdicts = [];
  if (!skipLayers.has(4) && !options.dryRun) {
    console.log("\n🔍 Layer 4: Skeptic (Adversarial Verification)");
    const skepticInput = path.join(outputDir, "skeptic-input.json");
    fs.writeFileSync(skepticInput, JSON.stringify(allFindings, null, 2));
    const skepticOutput = path.join(outputDir, "skeptic-verdicts.json");
    if (!fs.existsSync(path.join(SCRIPT_DIR, "buzzshield-skeptic.js"))) {
      const msg = "Layer 4 module buzzshield-skeptic.js missing.";
      if (options.strictLayers) {
        console.error(`❌ ${msg}`);
        process.exit(2);
      }
      console.warn(`⚠️  ${msg} — using identity verdict (all UNCERTAIN).`);
      skepticVerdicts = allFindings.map((f) => ({
        id: f.id,
        verdict: "UNCERTAIN",
        confidence: 0.5,
        source: "no-skeptic",
      }));
      fs.writeFileSync(skepticOutput, JSON.stringify(skepticVerdicts, null, 2));
    } else {
      try {
        execSync(
          `node ${path.join(SCRIPT_DIR, "buzzshield-skeptic.js")} ${skepticInput} --output ${skepticOutput}${options.verbose ? " --verbose" : ""}`,
          { timeout: 7_200_000, stdio: "inherit" },
        );
        verifyLayerOutput("Skeptic", skepticOutput, options.strictLayers);
        skepticVerdicts = JSON.parse(fs.readFileSync(skepticOutput, "utf8"));
        const acceptedIds = new Set(
          skepticVerdicts
            .filter((v) => v.verdict === "ACCEPT" || v.verdict === "UNCERTAIN")
            .map((v) => v.id),
        );
        verifiedFindings = allFindings.filter((f) => acceptedIds.has(f.id));
        console.log(
          `   Passed Skeptic: ${verifiedFindings.length}/${allFindings.length}`,
        );
      } catch (e) {
        if (options.strictLayers) {
          console.error(`❌ Skeptic crashed: ${e.message}`);
          process.exit(2);
        }
        console.log(
          `   ⚠️  Skeptic crashed: ${e.message.slice(0, 200)} — proceeding with all findings`,
        );
      }
    }
  }

  // ─── Layer 5: Z3 Path Verification ────────────────────────────────────
  if (!skipLayers.has(5) && !options.dryRun && verifiedFindings.length > 0) {
    console.log("\n🔬 Layer 5: Z3 (Path Satisfiability)");
    const z3Input = path.join(outputDir, "z3-input.json");
    fs.writeFileSync(z3Input, JSON.stringify(verifiedFindings, null, 2));
    const z3Output = path.join(outputDir, "z3-results.json");
    if (!fs.existsSync(path.join(SCRIPT_DIR, "buzzshield-z3.js"))) {
      const msg = "Layer 5 module buzzshield-z3.js missing.";
      if (options.strictLayers) {
        console.error(`❌ ${msg}`);
        process.exit(2);
      }
      console.warn(`⚠️  ${msg}`);
    } else {
      try {
        execSync(
          `node ${path.join(SCRIPT_DIR, "buzzshield-z3.js")} ${z3Input} --output ${z3Output}${options.verbose ? " --verbose" : ""}`,
          { timeout: 600000, stdio: "inherit" },
        );
        verifyLayerOutput("Z3", z3Output, options.strictLayers);
      } catch (e) {
        if (options.strictLayers) {
          console.error(`❌ Z3 crashed: ${e.message}`);
          process.exit(2);
        }
        console.log(`   ⚠️  Z3 crashed: ${e.message.slice(0, 200)}`);
      }
    }
  }

  // ─── Layer 3: PoC Generation ──────────────────────────────────────────
  if (!skipLayers.has(3) && verifiedFindings.length > 0) {
    console.log("\n⚔️  Layer 3: Pentest (PoC Generation)");
    const pentestInput = path.join(outputDir, "pentest-input.json");
    fs.writeFileSync(pentestInput, JSON.stringify(verifiedFindings, null, 2));
    const pocDir = path.join(CONFIG.POC_BASE, scanId);
    if (!fs.existsSync(path.join(SCRIPT_DIR, "buzzshield-pentest.js"))) {
      const msg = "Layer 3 module buzzshield-pentest.js missing.";
      if (options.strictLayers) {
        console.error(`❌ ${msg}`);
        process.exit(2);
      }
      console.warn(`⚠️  ${msg}`);
    } else {
      try {
        execSync(
          `node ${path.join(SCRIPT_DIR, "buzzshield-pentest.js")} ${pentestInput} --output ${pocDir}${options.verbose ? " --verbose" : ""}`,
          { timeout: 120000, stdio: "inherit" },
        );
        verifyLayerOutput(
          "Pentest",
          path.join(pocDir, "pentest-manifest.json"),
          options.strictLayers,
        );
      } catch (e) {
        if (options.strictLayers) {
          console.error(`❌ Pentest crashed: ${e.message}`);
          process.exit(2);
        }
        console.log(`   ⚠️  Pentest crashed: ${e.message.slice(0, 200)}`);
      }
    }
  }

  // ─── Layer 7: Report Generation ───────────────────────────────────────
  if (!skipLayers.has(7) && verifiedFindings.length > 0) {
    console.log("\n📝 Layer 7: Auto-Report Generator");
    const reporterModule = loadLayer("buzzshield-reporter");
    if (reporterModule) {
      const platform = options.platform || "hackerone";
      const reportsDir = path.join(outputDir, "submissions");
      fs.mkdirSync(reportsDir, { recursive: true });

      for (const f of verifiedFindings) {
        const enriched = {
          ...f,
          platform_program: options.program || "Unknown Program",
          repo: options.target,
          commit_hash: commitHash,
          affected_components: f.file,
          impact: f.description,
          fix: `Review and fix the ${f.pattern ? `Pattern ${f.pattern} (${f.title})` : f.title} issue at ${f.file}:${f.line || "?"}`,
          references: [`${f.file}:${f.line || "?"} — ${f.title}`],
        };
        const bundle = reporterModule.generateBundle(enriched, platform);
        fs.writeFileSync(
          path.join(reportsDir, `${f.id}-${platform}.md`),
          bundle.report,
        );
      }
      console.log(
        `   Generated ${verifiedFindings.length} ${platform} submissions`,
      );
    }
  }

  // ─── Layer 8: Amplifier (pattern propagation) ─────────────────────────
  if (!skipLayers.has(8) && verifiedFindings.length > 0) {
    console.log("\n📡 Layer 8: Amplifier (Pattern Propagation)");
    const ampInput = path.join(outputDir, "amplifier-input.json");
    fs.writeFileSync(ampInput, JSON.stringify(verifiedFindings, null, 2));
    const ampOut = path.join(outputDir, "amplifier");
    if (!fs.existsSync(path.join(SCRIPT_DIR, "buzzshield-amplifier.js"))) {
      const msg = "Layer 8 module buzzshield-amplifier.js missing.";
      if (options.strictLayers) {
        console.error(`❌ ${msg}`);
        process.exit(2);
      }
      console.warn(`⚠️  ${msg}`);
    } else {
      try {
        execSync(
          `node ${path.join(SCRIPT_DIR, "buzzshield-amplifier.js")} ${ampInput} --output ${ampOut}${options.verbose ? " --verbose" : ""}`,
          { timeout: 600000, stdio: "inherit" },
        );
        verifyLayerOutput(
          "Amplifier",
          path.join(ampOut, "fingerprints.json"),
          options.strictLayers,
        );
      } catch (e) {
        if (options.strictLayers) {
          console.error(`❌ Amplifier crashed: ${e.message}`);
          process.exit(2);
        }
        console.log(`   ⚠️  Amplifier crashed: ${e.message.slice(0, 200)}`);
      }
    }
  }

  // ─── Layer 9: Feedback (no submissions yet, just record the run) ──────
  if (!skipLayers.has(9)) {
    console.log("\n📊 Layer 9: Feedback (Run Recorded)");
    if (!fs.existsSync(path.join(SCRIPT_DIR, "buzzshield-feedback.js"))) {
      const msg = "Layer 9 module buzzshield-feedback.js missing.";
      if (options.strictLayers) {
        console.error(`❌ ${msg}`);
        process.exit(2);
      }
      console.warn(`⚠️  ${msg}`);
    } else {
      // Pre-populate "pending" outcomes for each verified finding so the
      // operator can later resolve them with `record --outcome accepted` etc.
      try {
        const fb = require(path.join(SCRIPT_DIR, "buzzshield-feedback.js"));
        for (const f of verifiedFindings) {
          // Only add a pending record if not already tracked.
          fb.recordOutcome({
            findingId: f.id,
            target: options.program || path.basename(options.target),
            pattern: f.pattern,
            severity: f.severity,
            skepticVerdict: (skepticVerdicts.find((v) => v.id === f.id) || {})
              .verdict,
            skepticConfidence: (
              skepticVerdicts.find((v) => v.id === f.id) || {}
            ).confidence,
            outcome: "pending",
            notes: `auto-pending from scan ${scanId}`,
          });
        }
        console.log(
          `   Recorded ${verifiedFindings.length} pending outcome(s) in feedback log.`,
        );
      } catch (e) {
        if (options.strictLayers) {
          console.error(`❌ Feedback crashed: ${e.message}`);
          process.exit(2);
        }
        console.log(`   ⚠️  Feedback crashed: ${e.message.slice(0, 200)}`);
      }
    }
  }

  // ─── Summary ──────────────────────────────────────────────────────────
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(
    "\n╔══════════════════════════════════════════════════════════════╗",
  );
  console.log(
    "║                    PIPELINE COMPLETE                         ║",
  );
  console.log(
    "╠══════════════════════════════════════════════════════════════╣",
  );
  console.log(`║  Target:     ${path.basename(options.target).padEnd(43)}║`);
  console.log(`║  Commit:     ${commitHash.slice(0, 12).padEnd(43)}║`);
  console.log(`║  Files:      ${String(totalFiles).padEnd(43)}║`);
  console.log(`║  Raw finds:  ${String(allFindings.length).padEnd(43)}║`);
  console.log(`║  Verified:   ${String(verifiedFindings.length).padEnd(43)}║`);
  console.log(`║  Elapsed:    ${(elapsed + "s").padEnd(43)}║`);
  console.log(`║  Output:     ${outputDir.slice(-43).padEnd(43)}║`);
  console.log(
    "╚══════════════════════════════════════════════════════════════╝\n",
  );

  // Save final summary
  const summary = {
    target: options.target,
    commit_hash: commitHash,
    language,
    total_files: totalFiles,
    raw_findings: allFindings.length,
    verified_findings: verifiedFindings.length,
    elapsed_seconds: parseFloat(elapsed),
    timestamp: new Date().toISOString(),
    output_dir: outputDir,
  };
  fs.writeFileSync(
    path.join(outputDir, "scan-summary.json"),
    JSON.stringify(summary, null, 2),
  );

  return { findings: verifiedFindings, summary, outputDir };
}

// ─── CLI ────────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help")) {
    console.log(`
BuzzShield V6 — Unified Security Scanner

Usage:
  node buzzshield-v6-pipeline.js --target <repo-path> [options]

Options:
  --target <path>        Path to cloned repository
  --language <lang>      Force language (solidity|rust|go|typescript|python|c)
  --platform <name>      Bounty platform (hackerone|immunefi|hackenproof)
  --program <name>       Program name for reports
  --output <dir>         Output directory
  --skip-layers <n,n>    Skip layers (e.g., 3,5)
  --dry-run              Layers 1-2 + 6 only
  --verbose              Detailed output
  --include-periphery    Scan scripts/ deploy/ migrations/ relayer/ forwarder/
                         periphery/ helpers/ utils/ ops/ (HE-03 relaxed).
                         Origin: $400K Enzyme bounty was found in periphery.
                         Adds a deploy-script Pattern A sweep in Layer 1.
  --semgrep              Run buzzshield-semgrep.js as Layer 1b (AST scan,
                         merged into raw-findings.json before Skeptic).

Examples:
  # Scan OKX wallet-core for HackerOne/OKG
  node buzzshield-v6-pipeline.js --target /path/to/wallet-core --platform hackerone --program "OKG"

  # Scan Circle Arc for HackerOne
  node buzzshield-v6-pipeline.js --target /path/to/arc-node --program "Circle BBP"

  # Quick scan (skip LLM layers)
  node buzzshield-v6-pipeline.js --target /path/to/repo --dry-run
`);
    process.exit(0);
  }

  const options = {
    target: null,
    language: null,
    platform: "hackerone",
    program: null,
    output: null,
    skipLayers: "",
    dryRun: args.includes("--dry-run"),
    verbose: args.includes("--verbose"),
    includePeriphery: args.includes("--include-periphery"),
    semgrep: args.includes("--semgrep"),
    legacyL1: args.includes("--legacy-l1"),
    strictLayers: args.includes("--strict-layers"),
    gitDelta: null, // ISO date / git ref — restrict scan to files touched since
    designIntent: null, // path to manifest JSON (staking/naming/lending/dex)
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--target":
        options.target = args[++i];
        break;
      case "--language":
        options.language = args[++i];
        break;
      case "--platform":
        options.platform = args[++i];
        break;
      case "--program":
        options.program = args[++i];
        break;
      case "--output":
        options.output = args[++i];
        break;
      case "--skip-layers":
        options.skipLayers = args[++i];
        break;
      case "--git-delta":
        options.gitDelta = args[++i];
        break;
      case "--design-intent":
        options.designIntent = args[++i];
        break;
    }
  }

  if (!options.target) {
    console.error("Error: --target is required");
    process.exit(1);
  }
  if (!fs.existsSync(options.target)) {
    console.error(`Error: Target not found: ${options.target}`);
    process.exit(1);
  }

  await runPipeline(options);
}

main().catch((e) => {
  console.error("Fatal:", e.message);
  process.exit(1);
});
