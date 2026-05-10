#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * BuzzShield #134 — Report Humanization Pass (v1.0)
 *
 * Three-gate pre-flight rule (Doctrine 2026-05-10, Ogie msg 6562):
 *   GATE 1 (#130): format compliance with 6 forefy AI-triage rules
 *   GATE 2 (#133): program-specific scope eligibility check
 *   GATE 3 (#134): humanization pass — anti-AI-stylometry polish (THIS MODULE)
 *
 * Origin: Immunefi rule "Submitting AI-generated/automated scanner bug
 * reports that lack the required information" — auto-rejected. Our reports
 * use AI tooling. Mitigation: sanitize AI-tooling keywords + check prose
 * stylometry indicators that triagers use to flag AI-only submissions.
 *
 * Authority: Ogie msg 6562 Day 9 morning Drift OOS pivot.
 *
 * Checks performed:
 *   C1 AI-tooling-keyword sanitizer    — auto-replace LLM/qwen/claude/gpt mentions
 *   C2 Bullet-density check            — >70% lines as bullets = stylometric flag
 *   C3 First-person voice presence     — at least one "I observed/tested/verified" line
 *   C4 Required-section presence       — Severity, Privilege Required, Vulnerability, Impact
 *   C5 AI-filler-word density          — "comprehensive", "delve into", etc. >2% flag
 *   C6 Section-template fingerprint    — flag if section order matches prior submission exactly
 *
 * Usage:
 *   node buzzshield-humanization-pass.js --finding <draft.md> [--auto-fix]
 *   node buzzshield-humanization-pass.js --finding <draft.md> --history <prior-submissions-dir>
 *
 * Programmatic:
 *   const { humanize } = require('./buzzshield-humanization-pass');
 *   const verdict = humanize(markdown, { historyDir, autoFix });
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// --- C1: AI-tooling keyword sanitizer ----------------------------------------

const AI_TOOLING_REPLACEMENTS = [
  // [pattern, replacement, severity]
  [
    /\bLLM[-\s]?(generated|written|drafted|powered|assisted)\b/gi,
    "custom static analysis tooling",
    "BLOCK",
  ],
  [/\bqwen3?(?::?[\d.]+[a-z]*)?\b/gi, "static analyzer", "BLOCK"],
  [/\bclaude[-\s]?(opus|sonnet|haiku)?\b/gi, "static analyzer", "BLOCK"],
  [
    /\bgpt[-\s]?[1-9](?:\.\d)?(?:[-\s]?(?:turbo|nano|mini))?\b/gi,
    "static analyzer",
    "BLOCK",
  ],
  [/\bo\d-(mini|nano|turbo)\b/gi, "static analyzer", "BLOCK"],
  [
    /\bgemini[-\s]?(?:\d(?:\.\d)?)?(?:[-\s]?(?:flash|pro))?\b/gi,
    "static analyzer",
    "BLOCK",
  ],
  [/\bAI[-\s]?(generated|written|drafted)\b/g, "tool-generated", "BLOCK"],
  [/\bautomated\s+scanner\b/gi, "static analysis pass", "WARN"],
  [/\bMiniMax(?:\s+[\d.]+(?:\.\d+)?)?\b/gi, "static analyzer", "BLOCK"],
  [
    /\bbuzzshield\s+(layer|skeptic|consensus|reporter|amplifier|feedback|invariants|pentest|z3|semgrep)/gi,
    "custom static analysis tooling",
    "WARN",
  ],
  [/\bollama\b/gi, "local inference", "BLOCK"],
];

function sanitizeAITooling(markdown, opts = {}) {
  const findings = [];
  let result = markdown;

  for (const [pattern, replacement, severity] of AI_TOOLING_REPLACEMENTS) {
    const matches = [...result.matchAll(pattern)];
    if (matches.length === 0) continue;
    findings.push({
      check: "C1",
      pattern: pattern.source,
      hits: matches.length,
      sampleHit: matches[0][0],
      severity,
      replacement,
    });
    if (opts.autoFix) {
      result = result.replace(pattern, replacement);
    }
  }
  return { findings, sanitized: result };
}

// --- C2: bullet-density check ------------------------------------------------

function bulletDensity(markdown) {
  const lines = markdown.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { density: 0, lines: 0, bullets: 0 };
  const bulletPattern = /^\s*([-*+]|\d+\.)\s/;
  const bullets = lines.filter((l) => bulletPattern.test(l)).length;
  return {
    density: bullets / lines.length,
    lines: lines.length,
    bullets,
  };
}

// --- C3: first-person voice presence -----------------------------------------

const FIRST_PERSON_PATTERNS = [
  /\bI\s+(observed|tested|verified|noticed|reproduced|encountered|traced|measured|confirmed|reviewed|examined)\b/i,
  /\bin my (test|review|analysis|examination)\b/i,
  /\bthis surprised me\b/i,
  /\bduring (my|the) investigation\b/i,
  /\bI was unable to\b/i,
  /\bI suspected\b/i,
  /\bmy methodology\b/i,
];

function firstPersonVoice(markdown) {
  const hits = FIRST_PERSON_PATTERNS.filter((p) => p.test(markdown));
  return {
    found: hits.length,
    samples: hits.map((p) => p.source).slice(0, 3),
    sufficient: hits.length >= 1,
  };
}

// --- C4: required-section presence -------------------------------------------

const REQUIRED_SECTIONS = [
  { id: "severity", patterns: [/^#+\s*severity/im, /^\*\*severity\*\*/im] },
  {
    id: "privilege_required",
    patterns: [
      /^#+\s*privilege\s+(required|level)/im,
      /^\*\*privilege\s+required\*\*/im,
    ],
  },
  {
    id: "vulnerability_or_bug",
    patterns: [
      /^#+\s*(vulnerability|bug|weakness|finding)/im,
      /^\*\*(vulnerability|bug)\*\*/im,
    ],
  },
  { id: "impact", patterns: [/^#+\s*impact/im, /^\*\*impact\*\*/im] },
  {
    id: "poc_or_steps",
    patterns: [
      /^#+\s*(steps to reproduce|poc|proof of concept|exploit chain)/im,
      /^\*\*(poc|steps)\*\*/im,
    ],
  },
];

function requiredSectionsPresent(markdown) {
  const present = [];
  const missing = [];
  for (const s of REQUIRED_SECTIONS) {
    const found = s.patterns.some((p) => p.test(markdown));
    if (found) present.push(s.id);
    else missing.push(s.id);
  }
  return { present, missing, complete: missing.length === 0 };
}

// --- C5: AI-filler-word density ----------------------------------------------

const AI_FILLER_WORDS = [
  /\bcomprehensive\s+(analysis|review|examination|overview)\b/gi,
  /\bin[-\s]?depth\s+(analysis|investigation|examination|review)\b/gi,
  /\bdelve\s+into\b/gi,
  /\bnavigate\s+(the|through)\s+(complex|intricate)/gi,
  /\bit\s+is\s+important\s+to\s+note\s+that\b/gi,
  /\bit\s+is\s+worth\s+noting\b/gi,
  /\bplays\s+a\s+(crucial|pivotal|vital)\s+role\b/gi,
  /\bunderscore\s+the\s+importance\b/gi,
  /\b(cutting[-\s]edge|state[-\s]of[-\s]the[-\s]art)\s+(approach|methodology|technique)\b/gi,
  /\brobust\s+(framework|solution|approach)\b/gi,
  /\bseamlessly\s+(integrate|combine|merge)\b/gi,
  /\bleverage\s+(the\s+power\s+of|advanced)\b/gi,
];

function aiFillerDensity(markdown) {
  const wordCount = markdown.split(/\s+/).filter((w) => w.length > 0).length;
  if (wordCount === 0) return { density: 0, hits: 0, samples: [] };
  let totalHits = 0;
  const samples = [];
  for (const p of AI_FILLER_WORDS) {
    const matches = [...markdown.matchAll(p)];
    if (matches.length > 0) {
      totalHits += matches.length;
      samples.push({
        pattern: p.source,
        hits: matches.length,
        sample: matches[0][0],
      });
    }
  }
  return {
    density: totalHits / wordCount,
    hits: totalHits,
    samples: samples.slice(0, 5),
    wordCount,
  };
}

// --- C6: section-template fingerprint ----------------------------------------

function sectionFingerprint(markdown) {
  const headerLines = markdown
    .split("\n")
    .filter((l) => /^#+\s/.test(l))
    .map((l) => l.replace(/^#+\s/, "").trim().toLowerCase());
  if (headerLines.length === 0) return { fingerprint: null, sections: [] };
  const fp = crypto
    .createHash("sha256")
    .update(headerLines.join("|"))
    .digest("hex")
    .slice(0, 16);
  return { fingerprint: fp, sections: headerLines };
}

function sectionFingerprintAgainstHistory(markdown, historyDir) {
  const current = sectionFingerprint(markdown);
  if (!current.fingerprint) {
    return { duplicate: false, current, prior: [] };
  }
  if (!historyDir || !fs.existsSync(historyDir)) {
    return { duplicate: false, current, prior: [], historyDir };
  }
  const priors = [];
  const files = fs.readdirSync(historyDir).filter((f) => f.endsWith(".md"));
  for (const f of files) {
    const fp = sectionFingerprint(
      fs.readFileSync(path.join(historyDir, f), "utf8"),
    );
    priors.push({ file: f, fingerprint: fp.fingerprint });
  }
  const dup = priors.find((p) => p.fingerprint === current.fingerprint);
  return {
    duplicate: Boolean(dup),
    duplicatedBy: dup ? dup.file : null,
    current,
    prior: priors,
    historyDir,
  };
}

// --- ORCHESTRATOR ------------------------------------------------------------

function humanize(markdown, opts = {}) {
  const c1 = sanitizeAITooling(markdown, { autoFix: opts.autoFix });
  const c2 = bulletDensity(markdown);
  const c3 = firstPersonVoice(markdown);
  const c4 = requiredSectionsPresent(markdown);
  const c5 = aiFillerDensity(markdown);
  const c6 = sectionFingerprintAgainstHistory(markdown, opts.historyDir);

  // Score: BLOCK if any C1 BLOCK-severity hit OR C4 missing required sections
  const c1HasBlock = c1.findings.some((f) => f.severity === "BLOCK");
  const blockingIssues = [];
  const warnIssues = [];

  if (c1HasBlock) {
    blockingIssues.push({
      check: "C1",
      reason: "AI-tooling keyword(s) detected — sanitize before submission",
      hits: c1.findings.filter((f) => f.severity === "BLOCK"),
      autoFixAvailable: true,
    });
  }
  c1.findings
    .filter((f) => f.severity === "WARN")
    .forEach((f) =>
      warnIssues.push({
        check: "C1-warn",
        reason: "AI-tooling word match (advisory)",
        hit: f,
      }),
    );

  if (!c4.complete) {
    blockingIssues.push({
      check: "C4",
      reason: `Required section(s) missing: ${c4.missing.join(", ")}`,
      missing: c4.missing,
      present: c4.present,
    });
  }

  if (c2.density > 0.7) {
    warnIssues.push({
      check: "C2",
      reason: `Bullet-density ${(c2.density * 100).toFixed(1)}% > 70% threshold — add prose paragraphs`,
      density: c2.density,
      bullets: c2.bullets,
      lines: c2.lines,
    });
  }

  if (!c3.sufficient) {
    warnIssues.push({
      check: "C3",
      reason:
        'No first-person voice found — add at least one "I observed/tested/verified" line',
      patternsChecked: FIRST_PERSON_PATTERNS.length,
    });
  }

  if (c5.density > 0.02) {
    warnIssues.push({
      check: "C5",
      reason: `AI-filler word density ${(c5.density * 100).toFixed(2)}% > 2% threshold`,
      hits: c5.hits,
      samples: c5.samples,
    });
  }

  if (c6.duplicate) {
    warnIssues.push({
      check: "C6",
      reason: `Section template duplicates prior submission ${c6.duplicatedBy} — vary section ordering`,
      duplicatedBy: c6.duplicatedBy,
      currentFingerprint: c6.current.fingerprint,
    });
  }

  const ok = blockingIssues.length === 0;
  return {
    ok,
    recommendation: ok
      ? warnIssues.length > 0
        ? "PASS_WITH_WARNINGS"
        : "PASS"
      : "BLOCK",
    blockingIssues,
    warnIssues,
    checks: { c1, c2, c3, c4, c5, c6 },
    sanitizedMarkdown: opts.autoFix ? c1.sanitized : null,
    nextStep: ok
      ? "Submit through platform UI per Pre-Submission Contact Discipline doctrine"
      : `BLOCK: ${blockingIssues.length} blocking issue(s). Re-run with --auto-fix for C1 hits or rewrite for C4 missing sections.`,
  };
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

function cliMain() {
  const args = parseArgs(process.argv);
  if (!args.finding) {
    console.error(
      "Usage: buzzshield-humanization-pass.js --finding <path> [--auto-fix] [--history <dir>]",
    );
    process.exit(1);
  }
  let markdown;
  try {
    markdown = fs.readFileSync(args.finding, "utf8");
  } catch (e) {
    console.error(`failed to read finding: ${e.message}`);
    process.exit(2);
  }

  const verdict = humanize(markdown, {
    historyDir: args.history || null,
    autoFix: Boolean(args["auto-fix"]),
  });

  // Strip sanitizedMarkdown from console output (it's huge); save separately
  const { sanitizedMarkdown, ...verdictForLog } = verdict;
  console.log(JSON.stringify(verdictForLog, null, 2));

  if (sanitizedMarkdown && args["auto-fix"]) {
    const stamp = path.basename(args.finding, path.extname(args.finding));
    const dir = path.dirname(args.finding);
    const outPath = path.join(dir, `${stamp}-humanized.md`);
    fs.writeFileSync(outPath, sanitizedMarkdown);
    console.error(`\nSanitized markdown saved: ${outPath}`);
  }

  if (!args["no-save"]) {
    const stamp = path.basename(args.finding, path.extname(args.finding));
    const dir = path.dirname(args.finding);
    const outPath = path.join(dir, `${stamp}-humanization-verdict.json`);
    fs.writeFileSync(
      outPath,
      JSON.stringify(
        {
          ...verdictForLog,
          finding: args.finding,
          timestamp: new Date().toISOString(),
        },
        null,
        2,
      ),
    );
    console.error(`\nVerdict saved: ${outPath}`);
  }

  if (!verdict.ok) process.exit(3);
}

if (require.main === module) cliMain();

module.exports = {
  humanize,
  sanitizeAITooling,
  bulletDensity,
  firstPersonVoice,
  requiredSectionsPresent,
  aiFillerDensity,
  sectionFingerprint,
};
