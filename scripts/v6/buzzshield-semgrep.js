#!/usr/bin/env node
/**
 * BuzzShield Semgrep Wrapper — Sprint 2 / Upgrade #3 (msg 5839)
 *
 * Runs semgrep against a target repo with multiple security rule packs,
 * normalises output into BuzzShield's `findings.json` shape, and (when
 * called by the V6 pipeline) merges with the existing Layer 1 regex
 * scanner.
 *
 * Origin: @rootedrescue's $400K Enzyme bounty methodology — semgrep's
 * AST-aware pattern-matching catches data-flow / cross-function bugs
 * that pure regex misses.
 *
 * Usage:
 *   node buzzshield-semgrep.js <target-dir>                     # default packs
 *   node buzzshield-semgrep.js <target-dir> --config p/smart-contracts
 *   node buzzshield-semgrep.js <target-dir> --merge-with <findings.json>
 *   node buzzshield-semgrep.js --self-test                      # synthetic vuln
 *
 * Default packs:
 *   p/smart-contracts    — Solidity security (50+ rules)
 *   p/security-audit     — generic security audit pack
 *   p/trailofbits        — Trail of Bits curated rules
 *   p/javascript         — JS/TS rules (relevant for off-chain agent code)
 *   p/python             — Python rules
 *
 * Output: buzzshield-findings.json in target dir, OR stdout when --stdout.
 *
 * @version 1.0 — 2026-05-04 (Sprint 2 / Upgrade #3)
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const CONFIG = {
  SEMGREP_BIN: process.env.SEMGREP_BIN || "semgrep",
  DEFAULT_PACKS: ["p/smart-contracts", "p/security-audit", "p/trailofbits"],
  AUX_PACKS: {
    js: ["p/javascript", "p/typescript"],
    ts: ["p/javascript", "p/typescript"],
    py: ["p/python"],
    sol: [], // covered by smart-contracts/security-audit/trailofbits
  },
  TIMEOUT_SEC: 600,
  MAX_TARGET_BYTES: 50_000_000, // 50MB cap on target dir to keep semgrep bounded
};
// HE-03b (#123, May 9 2026): mirrored from buzzshield-v6-pipeline.js. Semgrep
// has its own walker, so we pass --exclude flags directly to its CLI to ensure
// FV harnesses (certora/), mocks/, and Foundry submodule deps (lib/, forge-std/)
// never reach the rule engine. Single source of truth lives in pipeline.js.
const HE_03B_ALWAYS_EXCLUDE_DIRS = [
  "certora",
  "mocks",
  "mock",
  "lib",
  "forge-std",
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────────

function dirSize(dir, cap) {
  let size = 0;
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      if (e.name === ".git" || e.name === "node_modules") continue;
      const full = path.join(d, e.name);
      if (e.isDirectory()) stack.push(full);
      else if (e.isFile()) {
        try {
          size += fs.statSync(full).size;
          if (size > cap) return size;
        } catch {}
      }
    }
  }
  return size;
}

function detectLanguages(dir) {
  const langs = new Set();
  const stack = [dir];
  let count = 0;
  while (stack.length && count < 5000) {
    const d = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      if (
        e.name === ".git" ||
        e.name === "node_modules" ||
        e.name === "target" ||
        e.name === "dist"
      )
        continue;
      const full = path.join(d, e.name);
      if (e.isDirectory()) stack.push(full);
      else if (e.isFile()) {
        const ext = path.extname(e.name).slice(1).toLowerCase();
        if (["sol", "js", "ts", "tsx", "jsx", "py", "rs", "go"].includes(ext)) {
          langs.add(ext);
          count++;
        }
      }
    }
  }
  return [...langs];
}

function runSemgrepOnce(targetDir, configs, opts = {}) {
  const args = [
    "scan",
    "--json",
    "--quiet",
    "--metrics=off",
    "--no-git-ignore",
    "--timeout",
    "120",
  ];
  for (const c of configs) args.push("--config", c);
  // HE-03b (#123): unconditional excludes for FV harnesses, mocks, Foundry deps.
  for (const d of HE_03B_ALWAYS_EXCLUDE_DIRS) args.push("--exclude", d);
  // #124: Solidity-only mode — when caller asserts language=solidity (or auto-
  // detection sees only .sol), restrict to *.sol so OZ/forge-std submodule
  // build scripts (.js docs tooling, etc.) never reach the rule engine.
  if (opts.solidityOnly) args.push("--include", "*.sol");
  args.push(targetDir);

  // Semgrep-core writes intermediate metavar/pattern files to TMPDIR (default
  // /tmp). On Hetzner /tmp is locked-down for the agent user — without an
  // override we silently get 0 findings + "Sys_error: Permission denied"
  // entries in `errors[]`. Default TMPDIR to a path we can definitely write.
  const env = { ...process.env };
  if (!env.TMPDIR || !fs.existsSync(env.TMPDIR)) {
    const fallback = "/home/claude-code/.tmp-build/semgrep-tmp";
    try {
      fs.mkdirSync(fallback, { recursive: true });
      env.TMPDIR = fallback;
    } catch {}
  }

  const t0 = Date.now();
  const res = spawnSync(CONFIG.SEMGREP_BIN, args, {
    timeout: CONFIG.TIMEOUT_SEC * 1000,
    maxBuffer: 64 * 1024 * 1024, // 64 MB
    encoding: "utf8",
    env,
  });
  const dt = (Date.now() - t0) / 1000;

  if (res.error) return { error: res.error.message, dt };
  if (!res.stdout)
    return {
      error: `no stdout (status ${res.status}): ${res.stderr.slice(0, 200)}`,
      dt,
    };
  let parsed;
  try {
    parsed = JSON.parse(res.stdout);
  } catch (e) {
    return {
      error: `JSON parse failed: ${e.message}; stdout head: ${res.stdout.slice(0, 200)}`,
      dt,
    };
  }
  return {
    results: parsed.results || [],
    errors: parsed.errors || [],
    paths: parsed.paths || {},
    dt,
  };
}

function severityFromMetadata(r) {
  // Semgrep maps to ERROR/WARNING/INFO; we normalise to BuzzShield CRITICAL/HIGH/MEDIUM/LOW.
  const sev = (r.extra?.severity || "").toUpperCase();
  const conf = (r.extra?.metadata?.confidence || "").toUpperCase();
  if (sev === "ERROR" && conf === "HIGH") return "CRITICAL";
  if (sev === "ERROR") return "HIGH";
  if (sev === "WARNING") return "MEDIUM";
  return "LOW";
}

function ruleToPattern(checkId) {
  // Heuristic mapping from common semgrep rule IDs to BuzzShield Patterns A-G.
  const id = (checkId || "").toLowerCase();
  if (/reentran|cross-function|callback/.test(id)) return "D";
  if (/oracle|price|twap|stale/.test(id)) return "E";
  if (/replay|signature|nonce|permit/.test(id)) return "F";
  if (
    /access|missing-validation|unchecked|unrestricted|tx-origin|delegatecall/.test(
      id,
    )
  )
    return "A";
  if (/identity|spoof|sender/.test(id)) return "B";
  if (/dos|gas|griefing|denial/.test(id)) return "C";
  if (/nft|capability|plugin/.test(id)) return "G";
  return "UNCLASSIFIED";
}

function normaliseFinding(r) {
  return {
    source: "semgrep",
    rule_id: r.check_id,
    severity: severityFromMetadata(r),
    pattern: ruleToPattern(r.check_id),
    file: r.path,
    start_line: r.start?.line,
    end_line: r.end?.line,
    message: r.extra?.message || "",
    code_snippet: (r.extra?.lines || "").slice(0, 400),
    cwe: r.extra?.metadata?.cwe || [],
    owasp: r.extra?.metadata?.owasp || [],
    references: r.extra?.metadata?.references || [],
    confidence: r.extra?.metadata?.confidence || null,
  };
}

// ─── MERGE / DEDUPE WITH REGEX LAYER ─────────────────────────────────────────────

function fingerprint(f) {
  // Stable fingerprint = source-relative-file + start_line + pattern (not rule_id)
  // so semgrep + regex hits at the same site collapse to one finding.
  const file = (f.file || "").replace(/^.*\/(?=[^/]+\/[^/]+\/[^/]+$)/, "");
  return `${file}::${f.start_line || f.line || 0}::${f.pattern || "?"}`;
}

function mergeFindings(semgrepFindings, regexFindingsPath) {
  if (!regexFindingsPath || !fs.existsSync(regexFindingsPath)) {
    return { merged: semgrepFindings, regex_count: 0 };
  }
  let regex = [];
  try {
    const data = JSON.parse(fs.readFileSync(regexFindingsPath, "utf8"));
    regex = Array.isArray(data) ? data : data.findings || data.hits || [];
  } catch {
    regex = [];
  }
  const seen = new Map();
  for (const f of [
    ...semgrepFindings,
    ...regex.map((r) => ({ ...r, source: r.source || "regex" })),
  ]) {
    const fp = fingerprint(f);
    if (!seen.has(fp)) seen.set(fp, { ...f, sources: [f.source] });
    else seen.get(fp).sources.push(f.source);
  }
  return { merged: [...seen.values()], regex_count: regex.length };
}

// ─── MAIN ────────────────────────────────────────────────────────────────────────

function selfTest() {
  const tmpDir =
    (process.env.TMPDIR || "/tmp") +
    `/buzzshield-semgrep-selftest-${process.pid}`;
  fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.mkdirSync(tmpDir, { recursive: true });
  fs.writeFileSync(
    path.join(tmpDir, "Vuln.sol"),
    `pragma solidity ^0.8.0;
contract Vuln {
  mapping(address=>uint) public balances;
  function withdraw() public {
    uint amount = balances[msg.sender];
    (bool ok,) = msg.sender.call{value: amount}("");
    require(ok);
    balances[msg.sender] = 0;
  }
  function getOwner() public view returns (address) { return tx.origin; }
}
`,
  );
  console.log(`Running semgrep self-test against ${tmpDir} ...`);
  const out = runSemgrepOnce(tmpDir, CONFIG.DEFAULT_PACKS);
  if (out.error) {
    console.error("FAIL:", out.error);
    process.exit(2);
  }
  console.log(`  ${out.results.length} findings in ${out.dt.toFixed(1)}s`);
  for (const r of out.results.slice(0, 8)) {
    const f = normaliseFinding(r);
    console.log(
      `    ${f.severity.padEnd(8)} ${f.pattern} ${f.rule_id} @ L${f.start_line}`,
    );
  }
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.length === 0) {
    console.log(`
BuzzShield Semgrep Wrapper

Usage:
  node buzzshield-semgrep.js <target-dir> [--config p/...] [--merge-with findings.json] [--stdout]
  node buzzshield-semgrep.js --self-test

Options:
  --config <pack>       override default pack list (repeatable)
  --merge-with <path>   merge with existing findings JSON (Layer 1 regex output)
  --stdout              print findings to stdout instead of writing to file
  --output <path>       custom output path (default: <target>/buzzshield-findings.json)
`);
    return;
  }
  if (args.includes("--self-test")) {
    selfTest();
    return;
  }

  const targetDir = args[0];
  if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) {
    console.error(`Target dir does not exist: ${targetDir}`);
    process.exit(2);
  }

  const configIdx = args.indexOf("--config");
  const customConfigs = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--config" && args[i + 1]) customConfigs.push(args[i + 1]);
  }
  const mergeIdx = args.indexOf("--merge-with");
  const mergePath = mergeIdx >= 0 ? args[mergeIdx + 1] : null;
  const outputIdx = args.indexOf("--output");
  const customOutput = outputIdx >= 0 ? args[outputIdx + 1] : null;
  const toStdout = args.includes("--stdout");
  // --files-from <path>: post-hoc filter findings to only those whose path is
  // in the allowlist. Used by v6 pipeline's --git-delta mode to scope semgrep
  // to changed files only. Semgrep itself still walks the full target (cheaper
  // than re-invoking per-file), but findings outside the allowlist are dropped.
  const filesFromIdx = args.indexOf("--files-from");
  const filesFromPath = filesFromIdx >= 0 ? args[filesFromIdx + 1] : null;
  // #124 (May 9 2026): caller can force solidity-only mode (--include='*.sol').
  // Auto-enables when language detection finds .sol AND no other contract
  // languages — see langs check below.
  const solidityOnlyForced = args.includes("--solidity-only");
  let filesAllow = null;
  if (filesFromPath) {
    try {
      const lines = fs
        .readFileSync(filesFromPath, "utf8")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      filesAllow = new Set(lines.map((p) => path.resolve(p)));
      console.log(
        `[files-from] loaded ${filesAllow.size} allowlisted files for semgrep filter`,
      );
    } catch (e) {
      console.warn(
        `[files-from] failed to load ${filesFromPath}: ${e.message}`,
      );
    }
  }

  console.log(`\n🐝 BuzzShield Semgrep — ${new Date().toISOString()}`);
  console.log(`Target: ${targetDir}`);

  const size = dirSize(targetDir, CONFIG.MAX_TARGET_BYTES);
  if (size > CONFIG.MAX_TARGET_BYTES) {
    console.warn(
      `  warn: target size > ${CONFIG.MAX_TARGET_BYTES / 1e6}MB, expect long runtime`,
    );
  }
  const langs = detectLanguages(targetDir);
  console.log(`  languages detected: ${langs.join(", ") || "(none)"}`);

  // Build config list: explicit override OR default + per-language adds.
  let configs;
  if (customConfigs.length) {
    configs = customConfigs;
  } else {
    const set = new Set(CONFIG.DEFAULT_PACKS);
    for (const l of langs)
      for (const p of CONFIG.AUX_PACKS[l] || []) set.add(p);
    configs = [...set];
  }
  console.log(`  configs: ${configs.join(", ")}`);

  // #124: solidity-only when forced OR when only .sol contract code detected
  // (rs/go are other contract langs we don't want to suppress).
  const solidityOnlyAuto =
    langs.length > 0 &&
    langs.includes("sol") &&
    !langs.includes("rs") &&
    !langs.includes("go");
  const solidityOnly = solidityOnlyForced || solidityOnlyAuto;
  if (solidityOnly)
    console.log(
      `  solidity-only: --include='*.sol' (${solidityOnlyForced ? "forced" : "auto"})`,
    );

  const out = runSemgrepOnce(targetDir, configs, { solidityOnly });
  if (out.error) {
    console.error(`Fatal: ${out.error}`);
    process.exit(1);
  }
  console.log(`  semgrep ran in ${out.dt.toFixed(1)}s`);
  console.log(`  raw findings: ${out.results.length}`);
  console.log(`  errors: ${out.errors.length}`);

  let findings = out.results.map(normaliseFinding);
  if (filesAllow) {
    const before = findings.length;
    findings = findings.filter((f) =>
      filesAllow.has(path.resolve(f.file || "")),
    );
    console.log(
      `[files-from] filter dropped ${before - findings.length} findings outside allowlist (${findings.length} kept)`,
    );
  }
  const bySev = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  for (const f of findings) bySev[f.severity] = (bySev[f.severity] || 0) + 1;
  console.log(
    `  by severity: C=${bySev.CRITICAL} H=${bySev.HIGH} M=${bySev.MEDIUM} L=${bySev.LOW}`,
  );

  let { merged, regex_count } = mergeFindings(findings, mergePath);
  if (mergePath)
    console.log(
      `  merged with regex layer (${regex_count} regex findings) → ${merged.length} unique`,
    );

  const payload = {
    generated_at: new Date().toISOString(),
    target: targetDir,
    semgrep_version: "1.161.0",
    configs,
    languages: langs,
    elapsed_sec: out.dt,
    semgrep_errors: out.errors,
    findings: merged,
    summary: { total: merged.length, by_severity: bySev },
  };

  if (toStdout) {
    process.stdout.write(JSON.stringify(payload, null, 2));
  } else {
    const outPath =
      customOutput || path.join(targetDir, "buzzshield-findings.json");
    fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
    console.log(`\n💾 Wrote ${outPath}`);
  }
}

main();
