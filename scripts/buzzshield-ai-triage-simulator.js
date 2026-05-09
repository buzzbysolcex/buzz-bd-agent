#!/usr/bin/env node
/**
 * BuzzShield AI-Triage Simulator — #130 (branch: ai-triage-simulator-v1)
 *
 * Pre-submission simulator that scores a draft markdown against the 6
 * forefy AI-triage rules (reverse-engineered from HackenProof's
 * hackenproof-bulk-triage skill, almost certainly applies to Immunefi).
 *
 * Origin: forefy intel May 9 2026 + imu-77340 4/6 rule postmortem.
 * Doctrine: brain/Doctrine.md "Pre-Submission AI-Triage Standard".
 * Authority: Ogie msg "CRITICAL INTEL: AI TRIAGE RULES LEAKED" (May 10 2026).
 *
 * The 6 rules:
 *   R1: Exact commit hash + chain required
 *   R2: Specific file:line scope (matched to scope entry name)
 *   R3: No weak-bug-category pattern matches
 *   R4: PoC demonstrates exploit not primitive
 *   R5: Privilege level explicitly declared
 *   R6: Single-block atomic framing (no multi-step coordination prose)
 *
 * USAGE:
 *
 *   node buzzshield-ai-triage-simulator.js \
 *       --draft path/to/draft.md \
 *       --platform immunefi-audit-comp
 *
 *   const sim = require('./buzzshield-ai-triage-simulator.js');
 *   const result = sim.evaluate(draftMarkdown, { platform: 'immunefi-audit-comp' });
 *
 * EXIT CODES:
 *   0  PASS (all 6 rules)
 *   2  BLOCK (one or more rules failed at platform-strict level)
 *   4  unknown platform
 *   5  internal error
 *
 * @version 1.0 (MVP, deterministic) — 2026-05-10
 *
 * SCOPE NOTE:
 *   v1.0 is deterministic regex/keyword classification (no LLM).
 *   qwen3:8b classification-only enrichment can be added v1.1 if
 *   deterministic accuracy plateaus. Per qwen3-no-content-generation
 *   doctrine, qwen3 is allowed for verification/classification only.
 */

"use strict";

const fs = require("fs");
const path = require("path");

// === Platform calibration matrix (from doctrine) ===

const PLATFORM_STRICTNESS = {
  "immunefi-audit-comp": {
    R1: "strict",
    R2: "strict",
    R3: "strict",
    R4: "strict",
    R5: "strict",
    R6: "strict",
  },
  "immunefi-standing-bounty": {
    R1: "strict",
    R2: "strict",
    R3: "relaxed",
    R4: "relaxed",
    R5: "strict",
    R6: "strict",
  },
  hackerone: {
    R1: "strict",
    R2: "strict",
    R3: "relaxed",
    R4: "relaxed",
    R5: "strict",
    R6: "relaxed",
  },
  hackenproof: {
    R1: "strict",
    R2: "strict",
    R3: "strict",
    R4: "strict",
    R5: "strict",
    R6: "strict",
  },
  code4rena: {
    R1: "strict",
    R2: "strict",
    R3: "per-spec",
    R4: "per-spec",
    R5: "strict",
    R6: "per-spec",
  },
  sherlock: {
    R1: "strict",
    R2: "strict",
    R3: "per-spec",
    R4: "per-spec",
    R5: "strict",
    R6: "per-spec",
  },
  cantina: {
    R1: "strict",
    R2: "strict",
    R3: "per-spec",
    R4: "per-spec",
    R5: "strict",
    R6: "per-spec",
  },
};

// === Rule evaluators ===

// R1: Exact commit hash + chain
function evalR1(draft) {
  const lines = draft.split("\n");
  const hasCommit =
    /\bcommit\b[:\s]*[a-f0-9]{7,40}/i.test(draft) ||
    /\b[a-f0-9]{40}\b/.test(draft) ||
    /\b[a-f0-9]{7,12}\b/.test(draft.slice(0, 4000)); // commit-hash-like in preamble
  const hasChain =
    /\b(mainnet|sepolia|base|arbitrum|optimism|polygon|solana|stacks|sui|aptos|avalanche|fantom|bnb|chain[ -]?id|ethereum)\b/i.test(
      draft,
    );
  if (hasCommit && hasChain)
    return { pass: true, reason: "commit hash + chain present" };
  if (!hasCommit)
    return {
      pass: false,
      reason:
        "no commit hash detected (need full hash or 7-12 char abbreviation in preamble)",
    };
  return { pass: false, reason: "commit hash present but chain not declared" };
}

// R2: Specific file:line scope
function evalR2(draft) {
  // Pattern: path/file.ext:LINE or path/file.ext#LXX
  const fileLineRe =
    /\b[\w/.-]+\.(?:sol|vy|rs|ts|js|py|go|cairo|move|fc|fe|cpp|c|h)(?::|#L)\d+/i;
  if (fileLineRe.test(draft))
    return { pass: true, reason: "file:line scope detected" };
  // Soft-fail: file ref without line
  const fileOnly =
    /\b[\w/.-]+\.(?:sol|vy|rs|ts|js|py|go|cairo|move|fc|fe)\b/i.test(draft);
  if (fileOnly)
    return {
      pass: false,
      reason: "file path present but no line number — pin file:LINE in summary",
    };
  return {
    pass: false,
    reason: "no file path detected — pin specific file:line scope",
  };
}

// R3: No weak-bug-category pattern matches
function evalR3(draft) {
  const weak = [
    /\bfee[- ]on[- ]transfer\b/i,
    /\bgovernance attack\b/i,
    /\boracle staleness\b/i,
    /\brfc[- ]conformance\b/i,
    /\brfc \d+\b/i,
    /\brfc-\d+\b/i,
    /\b(rfc|http|websocket) (violation|defect)\b/i,
    /\bcommon acknowledged\b/i,
    /\bfront[- ]?running\b/i,
    /\bsandwich attack\b/i,
    /\bmev\b/i,
    /\bgrief(?:ing)?\b/i,
  ];
  const hits = weak.filter((re) => re.test(draft)).map((re) => re.toString());
  if (hits.length === 0)
    return { pass: true, reason: "no weak-bug-category language detected" };
  return {
    pass: false,
    reason: `weak-bug-category language detected: ${hits.slice(0, 3).join(", ")}`,
    hits,
  };
}

// R4: PoC demonstrates exploit not primitive
function evalR4(draft) {
  // Look for exploit-class language (positive signal)
  const exploitSignals = [
    /\b(victim|attacker)['']?s? balance changed\b/i,
    /\bunauthorized state mutation\b/i,
    /\bfunds drained\b/i,
    /\bvictim drain(?:ed)?\b/i,
    /\bbalance dropped\b/i,
    /\bequity (?:dropped|drained|wiped)\b/i,
    /\b\$\d[\d,.]*\s*(?:drained|stolen|wiped)\b/i,
    /\bobserved (?:harm|drain|loss|theft)\b/i,
    /\baccounting wiped\b/i,
    /\bdebt wiped\b/i,
    /\bdepositors absorb\b/i,
  ];
  // Look for primitive-only language (negative signal)
  const primitiveSignals = [
    /\bframing accepted\b/i,
    /\bvalidation bypassed\b/i,
    /\bprimitive confirmed\b/i,
    /\bserver accepts\b/i,
    /\binput accepted\b/i,
    /\bnon[- ]conformant\b/i,
    /\b(parser|validator) accepts\b/i,
  ];
  const exploitHits = exploitSignals
    .filter((re) => re.test(draft))
    .map((re) => re.toString());
  const primitiveHits = primitiveSignals
    .filter((re) => re.test(draft))
    .map((re) => re.toString());

  if (exploitHits.length > 0) {
    return {
      pass: true,
      reason: `exploit-class language detected (${exploitHits.length} signals)`,
      exploitHits,
      primitiveHits,
    };
  }
  if (primitiveHits.length > 0) {
    return {
      pass: false,
      reason: `primitive-only language detected — PoC must demonstrate exploit not primitive (${primitiveHits.length} signals)`,
      exploitHits,
      primitiveHits,
    };
  }
  // Neither — ambiguous, soft-fail
  return {
    pass: false,
    reason:
      "no exploit-class OR primitive-class signals detected — PoC PASS-line unclear",
    exploitHits,
    primitiveHits,
  };
}

// R5: Privilege level explicitly declared
function evalR5(draft) {
  const privilegeDeclared = [
    /\bprivilege required[:\s]+(none|any eoa|any signer|admin|owner|trusted vault|manager|keeper)\b/i,
    /\bpermission(?:less|s required)\b/i,
    /\b(no role required|any unauthenticated|any user|any wallet)\b/i,
    /\bno privilege\b/i,
    /\bunauthenticated\b.*\b(client|caller|attacker)\b/i,
    /\b(role|access)[: -]+(any|none|public|admin|owner|keeper|manager|trusted)\b/i,
  ];
  for (const re of privilegeDeclared) {
    if (re.test(draft))
      return {
        pass: true,
        reason: `privilege explicitly declared: ${re.toString()}`,
      };
  }
  return {
    pass: false,
    reason:
      "privilege level NOT explicitly declared — add 'Privilege required: NONE / any EOA / Trusted Vault Manager / etc.' line in summary",
  };
}

// R6: Single-block atomic framing (no coordination prose)
function evalR6(draft) {
  // Coordination/conditional language is a NEGATIVE signal
  const coordinationPatterns = [
    /\bif (?:a |an )?(?:[a-z]+ )+exists?,? then\b/i,
    /\bcould (?:divert|drain|cause|enable|allow)\b/i,
    /\bwould (?:divert|drain|cause|enable|allow)\b/i,
    /\bmight (?:divert|drain|cause|enable|allow)\b/i,
    /\bin (?:a |the )?(?:right|specific|certain) condition\b/i,
    /\bassuming (?:the |a )(?:proxy|attacker|victim|operator)/i,
    /\bif coordinated with\b/i,
    /\brequires? (?:coordination|cooperation|multi[- ]?step)\b/i,
  ];
  const hits = coordinationPatterns
    .filter((re) => re.test(draft))
    .map((re) => re.toString());
  if (hits.length === 0)
    return {
      pass: true,
      reason: "no coordination prose detected (atomic framing)",
    };
  return {
    pass: false,
    reason: `coordination/conditional language detected: ${hits.slice(0, 2).join(", ")} — rewrite to single-block atomic ("Attacker calls X. State mutates to Y. No coordination required.")`,
    hits,
  };
}

const RULES = {
  R1: {
    fn: evalR1,
    name: "Exact commit hash + chain",
    playbook: "Add commit hash + chain to submission preamble",
  },
  R2: {
    fn: evalR2,
    name: "Specific file:line scope",
    playbook: "Pin file:LINE in summary, not just inside PoC",
  },
  R3: {
    fn: evalR3,
    name: "No weak-bug-category pattern matches",
    playbook:
      "Reframe away from weak categories OR add explicit non-acknowledged distinguishing factor",
  },
  R4: {
    fn: evalR4,
    name: "PoC demonstrates exploit not primitive",
    playbook: "Build end-to-end exploit chain with observed-harm PoC output",
  },
  R5: {
    fn: evalR5,
    name: "Privilege level explicitly declared",
    playbook:
      "Add explicit 'Privilege required: NONE / any EOA / Trusted role / etc.' line",
  },
  R6: {
    fn: evalR6,
    name: "Single-block atomic framing",
    playbook:
      "Rewrite to atomic 'Attacker calls X. State mutates to Y. No coordination required.' Avoid 'if/then/could/would/might'",
  },
};

// === Main evaluator ===

function evaluate(draft, opts = {}) {
  const platform = (opts.platform || "immunefi-audit-comp").toLowerCase();
  const calibration = PLATFORM_STRICTNESS[platform];
  if (!calibration) {
    return {
      ok: false,
      error: `unknown platform: ${platform}. Known: ${Object.keys(PLATFORM_STRICTNESS).join(", ")}`,
    };
  }

  const rules_results = {};
  const rules_passed = [];
  const rules_failed = [];
  const fail_reasons = {};

  for (const [id, def] of Object.entries(RULES)) {
    const r = def.fn(draft);
    rules_results[id] = { ...r, name: def.name, strictness: calibration[id] };
    if (r.pass) {
      rules_passed.push(id);
    } else {
      // BLOCK only if platform-strict OR per-spec (treat per-spec as strict for safety)
      if (calibration[id] === "strict" || calibration[id] === "per-spec") {
        rules_failed.push(id);
        fail_reasons[id] = r.reason;
      } else {
        // Relaxed — record but don't block
        rules_passed.push(id); // soft-pass under relaxed mode
        rules_results[id].relaxed_pass = true;
      }
    }
  }

  const blocked = rules_failed.length > 0;
  const passing_score = rules_passed.length;

  return {
    ok: true,
    platform,
    rules_passed,
    rules_failed,
    fail_reasons,
    rules_results,
    score: `${passing_score}/6`,
    recommendation: blocked
      ? `BLOCK SUBMISSION. Address ${rules_failed.join("/")} first. Rewrite playbook per failed rule.`
      : "PROCEED. All applicable rules pass under platform calibration.",
    estimated_triage_outcome: blocked
      ? rules_failed.length >= 3
        ? "auto-close-or-spam-reject"
        : "downgrade-or-manual-with-prejudice"
      : "human-triage-with-no-AI-prejudice",
    rewrite_playbook: rules_failed.map((id) => ({
      rule: id,
      name: RULES[id].name,
      playbook: RULES[id].playbook,
    })),
  };
}

// === CLI ===

if (require.main === module) {
  const args = process.argv.slice(2);
  const opts = {};
  let draftPath = null;
  for (let i = 0; i < args.length; i += 2) {
    const k = args[i].replace(/^--/, "");
    const v = args[i + 1];
    if (k === "draft") draftPath = v;
    else if (k === "platform") opts.platform = v;
  }
  if (!draftPath) {
    console.error(
      "usage: buzzshield-ai-triage-simulator.js --draft <path> [--platform <name>]",
    );
    console.error(`platforms: ${Object.keys(PLATFORM_STRICTNESS).join(", ")}`);
    process.exit(5);
  }
  let draft;
  try {
    draft = fs.readFileSync(draftPath, "utf8");
  } catch (e) {
    console.error(`failed to read draft: ${e.message}`);
    process.exit(5);
  }
  const result = evaluate(draft, opts);
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exit(4);
  process.exit(result.rules_failed.length > 0 ? 2 : 0);
}

module.exports = {
  evaluate,
  RULES,
  PLATFORM_STRICTNESS,
};
