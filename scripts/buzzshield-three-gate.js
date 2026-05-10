#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * BuzzShield #157 — Three-Gate Pre-Flight Wrapper (v1.0)
 *
 * Single-shot pre-submission walker. Runs all three gates in order:
 *   Gate 1: #133 OOS Pre-Filter (program-specific scope eligibility)
 *   Gate 2: #130 AI-Triage Simulator (forefy 6-rule format compliance)
 *   Gate 3: #134 Humanization Pass (anti-AI stylometry + required sections)
 *
 * Order chosen by cost: #133 first (cheapest regex registry), #130 second
 * (regex + tag), #134 last (most checks). Any BLOCK halts immediately.
 *
 * Authority: Two-Gate Pre-Flight Doctrine (Ogie msg 6561) + #134 addition
 * (Ogie msg 6562) + Three-Gate canonical worked example (VAULTS-001 audit).
 *
 * Usage:
 *   node buzzshield-three-gate.js --finding <draft.md> --program <id> --platform <name>
 *   node buzzshield-three-gate.js --finding <draft.md> --program <id> --platform <name> --auto-fix
 *
 * Programmatic:
 *   const { preflight } = require('./buzzshield-three-gate');
 *   const verdict = await preflight({ findingPath, program, platform, autoFix });
 */

const fs = require("fs");
const path = require("path");

const oosPrefilter = require("./buzzshield-oos-prefilter.js");
const humanizationPass = require("./buzzshield-humanization-pass.js");
// #130 AI-triage simulator — keep separate require because it lives at workspace root
const aiTriageSim = require("./buzzshield-ai-triage-simulator.js");

async function preflight(opts = {}) {
  const {
    findingPath,
    program,
    platform,
    autoFix = false,
    historyDir = null,
  } = opts;
  if (!findingPath) throw new Error("findingPath required");
  if (!program)
    throw new Error("program required (e.g. driftprotocol, dydx-cantina)");
  if (!platform)
    throw new Error(
      "platform required (e.g. immunefi-audit-comp, hackenproof)",
    );

  const startedAt = Date.now();
  const markdown = fs.readFileSync(findingPath, "utf8");
  const result = {
    finding: findingPath,
    program,
    platform,
    startedAt: new Date(startedAt).toISOString(),
    gates: {},
    verdict: null,
    blockedAt: null,
    summary: null,
    durationMs: 0,
  };

  // ---- Gate 1: #133 OOS ----
  const t1 = Date.now();
  const g1 = oosPrefilter.evaluate({ findingMarkdown: markdown }, program);
  result.gates.g1_oos = {
    detector: "#133 OOS Pre-Filter",
    durationMs: Date.now() - t1,
    ok: g1.ok,
    recommendation: g1.recommendation,
    violations: g1.violations,
    warnings: g1.warnings,
  };
  if (!g1.ok) {
    result.blockedAt = "G1_OOS";
    result.verdict = "BLOCK";
    result.summary = `BLOCK at Gate 1 (#133 OOS): ${g1.violations.length} violation(s) — ${g1.violations.map((v) => v.ruleId).join(", ")}. Shelve as informational ground truth OR rewrite to remove OOS pattern hits.`;
    result.durationMs = Date.now() - startedAt;
    return result;
  }

  // ---- Gate 2: #130 AI-Triage ----
  const t2 = Date.now();
  const g2 = aiTriageSim.evaluate(markdown, { platform });
  result.gates.g2_ai_triage = {
    detector: "#130 AI-Triage Simulator",
    durationMs: Date.now() - t2,
    ok: g2.ok,
    score: g2.score,
    rules_passed: g2.rules_passed,
    rules_failed: g2.rules_failed,
    recommendation: g2.recommendation,
    estimated_outcome: g2.estimated_triage_outcome,
    rewrite_playbook: g2.rewrite_playbook || null,
  };
  if (!g2.ok) {
    result.blockedAt = "G2_AI_TRIAGE";
    result.verdict = "BLOCK";
    result.summary = `BLOCK at Gate 2 (#130 AI-Triage): ${g2.rules_failed.length} rule(s) failed — ${g2.rules_failed.join(", ")}. Apply rewrite playbook and re-run.`;
    result.durationMs = Date.now() - startedAt;
    return result;
  }

  // ---- Gate 3: #134 Humanization ----
  const t3 = Date.now();
  let workingMarkdown = markdown;
  let g3 = humanizationPass.humanize(workingMarkdown, {
    historyDir,
    autoFix: false,
  });

  // If --auto-fix and Gate 3 has C1 BLOCK hits, sanitize + re-run Gates 2 + 3
  let sanitized = false;
  if (!g3.ok && autoFix) {
    const c1HasBlock = g3.checks.c1.findings.some(
      (f) => f.severity === "BLOCK",
    );
    if (c1HasBlock) {
      workingMarkdown = g3.checks.c1.sanitized;
      sanitized = true;
      // Persist sanitized
      const stamp = path.basename(findingPath, path.extname(findingPath));
      const dir = path.dirname(findingPath);
      const sanitizedPath = path.join(dir, `${stamp}-three-gate-sanitized.md`);
      fs.writeFileSync(sanitizedPath, workingMarkdown);
      result.sanitizedPath = sanitizedPath;

      // Re-run Gate 2 on sanitized
      const g2Re = aiTriageSim.evaluate(workingMarkdown, { platform });
      result.gates.g2_ai_triage_post_sanitize = {
        detector: "#130 AI-Triage (post-sanitize re-run)",
        ok: g2Re.ok,
        score: g2Re.score,
        rules_passed: g2Re.rules_passed,
        rules_failed: g2Re.rules_failed,
      };
      if (!g2Re.ok) {
        result.blockedAt = "G2_AI_TRIAGE_POST_SANITIZE";
        result.verdict = "BLOCK";
        result.summary = `BLOCK at Gate 2 post-sanitize: sanitization broke AI-triage compliance. Manual rewrite needed.`;
        result.durationMs = Date.now() - startedAt;
        return result;
      }

      // Re-run Gate 3 on sanitized
      g3 = humanizationPass.humanize(workingMarkdown, {
        historyDir,
        autoFix: false,
      });
    }
  }

  result.gates.g3_humanization = {
    detector: "#134 Humanization Pass",
    durationMs: Date.now() - t3,
    ok: g3.ok,
    recommendation: g3.recommendation,
    blockingIssues: g3.blockingIssues,
    warnIssues: g3.warnIssues,
    sanitized: sanitized,
  };

  if (!g3.ok) {
    result.blockedAt = "G3_HUMANIZATION";
    result.verdict = "BLOCK";
    result.summary = `BLOCK at Gate 3 (#134 Humanization): ${g3.blockingIssues.length} blocking issue(s). ${autoFix ? "--auto-fix did not resolve all issues; manual rewrite needed." : "Re-run with --auto-fix for C1 hits, OR rewrite for C4 missing sections."}`;
    result.durationMs = Date.now() - startedAt;
    return result;
  }

  // ---- ALL THREE GATES PASS ----
  result.verdict = "READY_TO_SUBMIT";
  const warningsCount =
    (g3.warnIssues?.length || 0) + (g1.warnings?.length || 0);
  result.summary = `READY_TO_SUBMIT via ${platform}.${warningsCount > 0 ? ` ${warningsCount} non-blocking warning(s) — review before submit.` : ""} Submit through platform UI per Pre-Submission Contact Discipline doctrine.${sanitized ? " (Used --auto-fix sanitized version.)" : ""}`;
  result.durationMs = Date.now() - startedAt;
  return result;
}

// --- CLI ---------------------------------------------------------------------

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      if (i + 1 < argv.length && !argv[i + 1].startsWith("--")) {
        args[key] = argv[++i];
      } else {
        args[key] = true;
      }
    } else {
      args._.push(a);
    }
  }
  return args;
}

async function cliMain() {
  const args = parseArgs(process.argv);
  if (!args.finding || !args.program || !args.platform) {
    console.error(
      "Usage: buzzshield-three-gate.js --finding <path> --program <id> --platform <name> [--auto-fix] [--history <dir>]",
    );
    console.error("");
    console.error("Programs: " + oosPrefilter.listPrograms().join(", "));
    console.error(
      "Platforms (per #130): immunefi-audit-comp, immunefi-standing-bounty, hackerone, hackenproof, code4rena, sherlock, cantina",
    );
    process.exit(1);
  }

  const verdict = await preflight({
    findingPath: args.finding,
    program: args.program,
    platform: args.platform,
    autoFix: Boolean(args["auto-fix"]),
    historyDir: args.history || null,
  });

  // Print abbreviated summary to stdout
  console.log(
    JSON.stringify(
      {
        verdict: verdict.verdict,
        blockedAt: verdict.blockedAt,
        summary: verdict.summary,
        finding: verdict.finding,
        program: verdict.program,
        platform: verdict.platform,
        durationMs: verdict.durationMs,
        gateOk: {
          g1_oos: verdict.gates.g1_oos?.ok ?? null,
          g2_ai_triage: verdict.gates.g2_ai_triage?.ok ?? null,
          g3_humanization: verdict.gates.g3_humanization?.ok ?? null,
        },
      },
      null,
      2,
    ),
  );

  // Persist full audit log
  if (!args["no-save"]) {
    const stamp = path.basename(args.finding, path.extname(args.finding));
    const dir = path.dirname(args.finding);
    const outPath = path.join(dir, `${stamp}-three-gate-verdict.json`);
    fs.writeFileSync(outPath, JSON.stringify(verdict, null, 2));
    console.error(`\nFull verdict saved: ${outPath}`);
  }

  if (verdict.verdict !== "READY_TO_SUBMIT") process.exit(2);
}

if (require.main === module)
  cliMain().catch((err) => {
    console.error("FATAL:", err.stack || err);
    process.exit(3);
  });

module.exports = { preflight };
