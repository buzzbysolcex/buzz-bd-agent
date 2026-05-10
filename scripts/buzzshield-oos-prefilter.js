#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * BuzzShield #133 — Out-Of-Scope Pre-Filter (v1.0)
 *
 * Two-gate pre-flight rule (Doctrine 2026-05-10):
 *   GATE 1 (#130): format compliance with 6 forefy AI-triage rules
 *   GATE 2 (#133): program-specific scope eligibility check (THIS MODULE)
 * Both must PASS before submission.
 *
 * Architecture: thin layer over a program-rule registry. Each program
 * registers an OOS rule list; pre-submission walks rules against the
 * finding's threat model + technical category + impact framing.
 *
 * Authority: Ogie msg 6561 + 6562 Day 9 morning Drift OOS pivot.
 * Origin: VAULTS-001 6/6 PASS on #130 + Drift OOS on privileged-address
 *         exclusion. Without #133, would have submitted category-excluded.
 *
 * Usage:
 *   node buzzshield-oos-prefilter.js --finding <draft.md> --program <id>
 *   node buzzshield-oos-prefilter.js --list-programs
 *   node buzzshield-oos-prefilter.js --rules <program-id>
 *
 * Programmatic:
 *   const { evaluate, register } = require('./buzzshield-oos-prefilter');
 *   const verdict = evaluate({ findingMarkdown, threatModel }, 'driftprotocol');
 */

const fs = require("fs");
const path = require("path");

// --- REGISTRY ----------------------------------------------------------------

const REGISTRY = new Map();

function register(programId, rules, opts = {}) {
  REGISTRY.set(programId, {
    rules,
    sourceUrl: opts.sourceUrl || null,
    lastVerified: opts.lastVerified || null,
    notes: opts.notes || null,
  });
}

function listPrograms() {
  return Array.from(REGISTRY.keys());
}

function getRules(programId) {
  return REGISTRY.get(programId);
}

// --- BUILT-IN RULE LISTS -----------------------------------------------------

// Pattern: each rule has
//   id          short stable identifier (e.g., "DR-PRIV-ADDR")
//   category    threat-model | bug-class | reporting-process | severity-cap
//   description what this rule excludes
//   patterns    regex array (case-insensitive) — match against finding markdown
//   severity    'OOS' (auto-block) | 'WARN' (surface to operator)
//   docsUrl     link to program's published rule (for citation in audit log)

register(
  "driftprotocol",
  [
    {
      id: "DR-PRIV-ADDR",
      category: "threat-model",
      description:
        "Attacks requiring access to privileged addresses (governance, admin)",
      patterns: [
        /\bprivileged\s+(address|role|wallet)/i,
        /\b(admin|governance|owner)\s+(wallet|key|credential)\s+(compromise|leak|theft)/i,
        /\b(trusted\s+)?(insider|admin)\s+(rogue|malicious|compromised)/i,
        /\bmanager\s+wallet\s+compromise/i,
      ],
      severity: "OOS",
      docsUrl: "https://docs.drift.trade/security/bug-bounty",
    },
    {
      id: "DR-LEAKED-CRED",
      category: "threat-model",
      description: "Attacks requiring access to leaked keys/credentials",
      patterns: [
        /\bleaked?\s+(key|credential|secret|seed)/i,
        /\bsocial\s+engineering/i,
        /\bphishing\s+(attack|vector)/i,
      ],
      severity: "OOS",
      docsUrl: "https://docs.drift.trade/security/bug-bounty",
    },
    {
      id: "DR-3P-ORACLE",
      category: "bug-class",
      description:
        "Incorrect data supplied by third-party oracles (does NOT exclude oracle manipulation/flash loan attacks)",
      patterns: [
        /\bthird[-\s]party\s+oracle\s+(data|feed)\s+(stale|incorrect|wrong)/i,
        /\bpyth\s+returns?\s+(stale|wrong|incorrect)\s+(data|price|value)/i,
      ],
      severity: "OOS",
      docsUrl: "https://docs.drift.trade/security/bug-bounty",
      exception: {
        // If the finding ALSO mentions manipulation/flash-loan, override to PASS
        patterns: [/\boracle\s+manipulation/i, /\bflash[\s-]?loan/i],
      },
    },
  ],
  {
    sourceUrl: "https://docs.drift.trade/security/bug-bounty",
    lastVerified: "2026-05-10",
    notes:
      "Verified by Ogie via web search Day 9 morning (msg 6561). Permanent OOS list.",
  },
);

register(
  "immunefi-default",
  [
    {
      id: "IMU-CONTACT",
      category: "reporting-process",
      description:
        "Pre-submission contact with project (security@, info@) before platform submission",
      patterns: [
        /\b(emailed?|contacted?|reached\s+out\s+to)\s+(security@|info@)/i,
        /\b(prior|previous|earlier)\s+(email|contact|outreach)\s+to\s+(team|project|security)/i,
      ],
      severity: "OOS",
      docsUrl: "https://immunefi.com/rules/",
      notes:
        "ORACLE-001 worked example: May 4 security@drift.trade email = permanent Immunefi disqualification.",
    },
    {
      id: "IMU-AI-NO-INFO",
      category: "reporting-process",
      description:
        "AI-generated/automated scanner reports lacking required information (impact, scope, mainnet PoC)",
      patterns: [
        /\bai[-\s]generated/i,
        /\bautomated\s+scanner/i,
        /\bllm[-\s](generated|written|drafted)/i,
        /\bgpt[-\s](written|generated|drafted)/i,
        /\bclaude[-\s](written|generated|drafted)/i,
        /\bqwen[-\s](written|generated|drafted)/i,
      ],
      severity: "OOS",
      docsUrl: "https://immunefi.com/rules/",
      notes:
        "#134 Humanization Pass MUST run before submission. Sanitize AI-tooling-keywords.",
    },
    {
      id: "IMU-KNOWN-ISSUE",
      category: "bug-class",
      description:
        "Already-acknowledged known-issues / known-limitations in published audit reports",
      patterns: [
        /\back(nowledged|wn)\s+(issue|limitation|trade[\s-]?off)/i,
        /\bknown[\s-]issue/i,
        /\bdocumented\s+limitation/i,
      ],
      severity: "WARN",
      docsUrl: "https://immunefi.com/rules/",
      notes:
        "Surface for operator review; not auto-block (could be a known-issue cited as background).",
    },
  ],
  {
    sourceUrl: "https://immunefi.com/rules/",
    lastVerified: "2026-05-10",
    notes: "Default Immunefi rules; per-program overrides may extend.",
  },
);

register(
  "dydx-cantina",
  [
    {
      id: "DC-GOV-ONLY",
      category: "threat-model",
      description:
        "Vulnerabilities requiring governance proposal / chain authority privilege",
      patterns: [
        /\bgovernance\s+(proposal|vote|authority)\s+required/i,
        /\bchain\s+authority\s+(only|required)/i,
        /\b(MsgSubmitProposal|gov\.Authority)/i,
      ],
      severity: "OOS",
      docsUrl: "https://cantina.xyz/competitions/dydx",
      notes:
        "Permissionless vectors only. QED finding was permissionless MsgCreateMarketPermissionless.",
    },
    {
      id: "DC-QED-DUPLICATE",
      category: "bug-class",
      description:
        "Duplicate of QED's published canonicalization-mismatch finding (May 6 2026)",
      patterns: [
        /MsgCreateMarketPermissionless\s+ticker\s+case[\s-]?(insensitive|variant)/i,
        /\bEIGEN-USD\s+(vs|versus|or)\s+eigen-usd/i,
        /\bcurrencyPairIDStore\s+overwrit/i,
      ],
      severity: "OOS",
      docsUrl: "https://www.qed.audit/blog/dydx-v4-oracle-hijack",
      notes:
        "Already paid by dYdX to QED. Re-submission = duplicate rejection.",
      exception: {
        patterns: [
          /\bdistinct\s+(code\s+path|module|seam)/i,
          /\b(x\/listing|x\/clob|x\/sending|x\/affiliates|x\/marketmap|x\/subaccounts).*case[\s-]?(insensitive|variant)/i,
        ],
      },
    },
  ],
  {
    sourceUrl: "https://cantina.xyz/competitions/dydx",
    lastVerified: "2026-05-10",
    notes:
      "Cantina dYdX program (active 2026-05-08). Inherits QED-class IN-SCOPE baseline; OOS only on duplicates + governance-gated paths.",
  },
);

register(
  "hackenproof-default",
  [
    {
      id: "HP-CONTACT",
      category: "reporting-process",
      description:
        "Pre-submission contact with project before platform submission",
      patterns: [/\b(emailed?|contacted?|reached\s+out)\s+(security@|info@)/i],
      severity: "OOS",
      docsUrl: "https://hackenproof.com/rules",
    },
    {
      id: "HP-AI-NO-INFO",
      category: "reporting-process",
      description:
        "Automated AI scanner reports without verified PoC + custom analysis framing",
      patterns: [
        /\bllm[-\s](generated|written|drafted)/i,
        /\bgpt[-\s](written|generated)/i,
        /\bautomated\s+scanner\s+only/i,
      ],
      severity: "OOS",
      docsUrl: "https://hackenproof.com/rules",
    },
  ],
  {
    sourceUrl: "https://hackenproof.com/rules",
    lastVerified: "2026-05-10",
  },
);

register(
  "immunefi-aave",
  [
    {
      id: "AAVE-PROXY-ADMIN",
      category: "threat-model",
      description:
        "Aave-specific: proxy admin compromise / governance compromise OOS",
      patterns: [
        /\baave\s+(proxy\s+)?admin\s+compromise/i,
        /\baave\s+governance\s+(compromise|attack)/i,
      ],
      severity: "OOS",
      docsUrl: "https://immunefi.com/bug-bounty/aavev3/",
    },
  ],
  {
    sourceUrl: "https://immunefi.com/bug-bounty/aavev3/",
    lastVerified: "2026-05-10",
  },
);

// --- EVALUATOR ---------------------------------------------------------------

function evaluate(finding, programId) {
  const programData = REGISTRY.get(programId);
  if (!programData) {
    return {
      ok: false,
      error: `unknown program: ${programId}. Registered: ${listPrograms().join(", ")}`,
    };
  }

  // Prepare the haystack: combine finding markdown + threat model summary
  const haystack = [
    finding.findingMarkdown || finding.markdown || "",
    finding.threatModel || "",
    finding.summary || "",
    finding.privilegeRequired || "",
  ]
    .join("\n\n")
    .toLowerCase();

  const violations = [];
  const warnings = [];
  const exceptionsSatisfied = [];

  for (const rule of programData.rules) {
    const ruleHits = rule.patterns.filter((p) => p.test(haystack));
    if (ruleHits.length === 0) continue;

    // Check exception
    let exceptionSatisfied = false;
    if (rule.exception && rule.exception.patterns) {
      exceptionSatisfied = rule.exception.patterns.some((p) =>
        p.test(haystack),
      );
    }
    if (exceptionSatisfied) {
      exceptionsSatisfied.push({
        ruleId: rule.id,
        description: rule.description,
        exceptionMatched: true,
      });
      continue;
    }

    const violation = {
      ruleId: rule.id,
      category: rule.category,
      description: rule.description,
      severity: rule.severity,
      hits: ruleHits.map((r) => r.source).slice(0, 3),
      docsUrl: rule.docsUrl,
      notes: rule.notes || null,
    };
    if (rule.severity === "OOS") violations.push(violation);
    else warnings.push(violation);
  }

  const ok = violations.length === 0;
  return {
    ok,
    program: programId,
    programDocsUrl: programData.sourceUrl,
    violations,
    warnings,
    exceptionsSatisfied,
    recommendation: ok
      ? warnings.length > 0
        ? "PASS_WITH_WARNINGS"
        : "PASS"
      : "BLOCK",
    nextStep: ok
      ? "Proceed to #130 AI-triage simulator (Gate 1 of two-gate pre-flight)"
      : `BLOCK: rewrite to remove OOS violations OR shelve as informational ground truth. ${violations.length} OOS violation(s) hit.`,
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

  if (args["list-programs"]) {
    console.log(JSON.stringify({ programs: listPrograms() }, null, 2));
    return;
  }

  if (args.rules) {
    const data = getRules(args.rules);
    if (!data) {
      console.error(
        `unknown program: ${args.rules}. Registered: ${listPrograms().join(", ")}`,
      );
      process.exit(2);
    }
    console.log(
      JSON.stringify(
        {
          program: args.rules,
          sourceUrl: data.sourceUrl,
          lastVerified: data.lastVerified,
          ruleCount: data.rules.length,
          rules: data.rules.map((r) => ({
            id: r.id,
            category: r.category,
            severity: r.severity,
            description: r.description,
          })),
        },
        null,
        2,
      ),
    );
    return;
  }

  if (!args.finding || !args.program) {
    console.error(
      "Usage: buzzshield-oos-prefilter.js --finding <path> --program <id>",
    );
    console.error("       buzzshield-oos-prefilter.js --list-programs");
    console.error("       buzzshield-oos-prefilter.js --rules <program-id>");
    process.exit(1);
  }

  let findingMarkdown;
  try {
    findingMarkdown = fs.readFileSync(args.finding, "utf8");
  } catch (e) {
    console.error(`failed to read finding: ${e.message}`);
    process.exit(2);
  }

  const verdict = evaluate({ findingMarkdown }, args.program);
  console.log(JSON.stringify(verdict, null, 2));

  // Persist verdict alongside finding (audit trail)
  if (!args["no-save"]) {
    const stamp = path.basename(args.finding, path.extname(args.finding));
    const dir = path.dirname(args.finding);
    const outPath = path.join(dir, `${stamp}-oos-verdict.json`);
    fs.writeFileSync(
      outPath,
      JSON.stringify(
        {
          ...verdict,
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

module.exports = { evaluate, register, listPrograms, getRules };
