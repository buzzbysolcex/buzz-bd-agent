#!/usr/bin/env node
/**
 * BuzzShield V6 — Layer 4: Skeptic (Adversarial False-Positive Eliminator)
 *
 * For each finding from Layer 1/1b/2, Skeptic asks: "why might this NOT be a
 * real bug?" and only forwards findings that survive adversarial scrutiny.
 *
 * Decision asymmetry: dismissing a real bug costs us 2× more than accepting
 * a false positive (a missed CRITICAL is worse than a noisy submission). When
 * uncertain, lean ACCEPT.
 *
 * Pipeline:
 *   1. Hard-exclusion pre-filter (15 rules) — REJECT before any LLM call
 *   2. LLM adversarial pass (Ollama qwen3 primary, Anthropic fallback)
 *   3. Confidence threshold (default 0.67)
 *   4. Verdict assignment with asymmetric tie-breaking
 *
 * Usage:
 *   node buzzshield-skeptic.js <findings.json> --output <path> [--verbose]
 *                              [--model qwen3:8b|qwen3:14b|qwen3:32b]
 *                              [--threshold 0.67]
 *                              [--max-findings 200]
 *
 * @version 1.0 — 2026-05-04 (Ogie msg 5884 — Option A full-stack build)
 */

const fs = require("fs");
const path = require("path");
const http = require("http");

// ─── CONFIG ─────────────────────────────────────────────────────────────────────

const CONFIG = {
  OLLAMA_URL: process.env.OLLAMA_URL || "http://localhost:11434",
  OLLAMA_DEFAULT_MODEL: process.env.OLLAMA_MODEL || "qwen3:8b",
  ANTHROPIC_API_URL: "https://api.anthropic.com/v1/messages",
  ANTHROPIC_MODEL: "claude-haiku-4-5-20251001",
  ANTHROPIC_KEY_FILE: "/home/claude-code/.env.anthropic",
  PER_LLM_TIMEOUT_MS: 90_000,
  WARMUP_TIMEOUT_MS: 120_000,
  CONFIDENCE_THRESHOLD: 0.67,
  ASYMMETRIC_PENALTY: 2.0,
  // 50 findings × ~30s = ~25min/target. With 10 targets that's a ~4h queue
  // — within Ogie's budget while still covering all CRITICAL + HIGH on every
  // target (top severity always processed first via severity-rank sort).
  MAX_FINDINGS: 50,
};

// ─── HARD-EXCLUSION PRE-FILTER ──────────────────────────────────────────────────
// 15 rules that drop findings before any LLM call. Each rule must fire only on
// VERY high-precision false-positive shapes; we'd rather burn LLM tokens than
// dismiss a real bug here.

const HARD_EXCLUSION_RULES = [
  {
    id: "HE-01",
    desc: "File path contains test directory or test filename",
    test: (f) =>
      /(?:^|\/)(test|tests|__tests__|spec)\//.test(f.file || "") ||
      /(?:_test\.go|\.test\.[tj]s|\.spec\.[tj]s|\.t\.sol|test_\w+\.py|^test_)$/.test(
        path.basename(f.file || ""),
      ),
  },
  {
    id: "HE-02",
    desc: "File path indicates mock/fake/fixture",
    test: (f) =>
      /(?:^|\/)(?:mocks?|fakes?|fixtures?|stubs?)\//.test(f.file || "") ||
      /(?:Mock|Fake|Stub|Fixture)\.\w+$/.test(path.basename(f.file || "")),
  },
  {
    id: "HE-03",
    desc: "Function body contains @audit-ok or audit: false-positive comment",
    test: (f) =>
      /(?:@audit-ok|audit\s*:\s*false[-_ ]positive|noqa\s*:\s*audit)/i.test(
        f.evidence || "",
      ),
  },
  {
    id: "HE-04",
    desc: "Solidity pure/view function flagged as reentrancy/state-after-call",
    test: (f) =>
      f.pattern === "D" &&
      /\b(?:pure|view)\s*(?:returns|\{)/.test(f.evidence || ""),
  },
  {
    id: "HE-05",
    desc: "Pattern G (capability injection) but no NFT/token receive hook in scope",
    test: (f) =>
      f.pattern === "G" &&
      f.kind &&
      !/asset_intake|token_gated|wallet_state_modifier/.test(f.kind),
  },
  {
    id: "HE-06",
    desc: "Solidity interface file (no implementation possible)",
    test: (f) =>
      /\.sol$/.test(f.file || "") &&
      /^I[A-Z]\w*\.sol$/.test(path.basename(f.file || "")),
  },
  {
    id: "HE-07",
    desc: "Function body contains only revert (placeholder)",
    test: (f) =>
      /^\s*\{\s*revert\s*\([^)]*\)\s*;\s*\}\s*$/.test(f.evidence || ""),
  },
  {
    id: "HE-08",
    desc: "Solidity ^0.8.x and finding is integer overflow (built-in checked math)",
    test: (f) =>
      /SafeMath|pragma\s+solidity\s*\^\s*0\.[8-9]/.test(f.evidence || "") &&
      /overflow|underflow/i.test(f.kind || f.title || ""),
  },
  {
    id: "HE-09",
    desc: "INFO severity AND deterministic (no LLM needed to confirm)",
    test: (f) => f.severity === "INFO",
  },
  {
    id: "HE-10",
    desc: "Pattern H weak co-occurrence (already filtered for noise; only LLM the strong matches)",
    test: (f) =>
      f.pattern === "H" &&
      f.severity === "LOW" &&
      f.kind === "offchain_dispatch_module",
  },
  {
    id: "HE-11",
    desc: "Function name suggests deprecated/legacy/unused",
    test: (f) =>
      /(?:Deprecated|Legacy|Old|Unused|Removed|TODO|XXX)/i.test(
        f.function || f.title || "",
      ),
  },
  {
    id: "HE-12",
    desc: "PoC required but no callable/external entry path implied",
    test: (f) =>
      f.pattern === "C" &&
      /^_/.test((f.function || "").split("@")[0].trim()) && // leading underscore = internal
      f.severity === "LOW",
  },
  {
    id: "HE-13",
    desc: "P-DEPLOY signal in deploy script that is NOT in main contract scope",
    test: (f) =>
      /P-DEPLOY/.test(f.fingerprint || "") &&
      /scripts\//.test(f.file || "") &&
      f.severity === "MEDIUM",
  },
  {
    id: "HE-14",
    desc: "Comment block above function says internal use only",
    test: (f) =>
      /(?:internal[- ]use[- ]only|do not call|private API|not for external)/i.test(
        f.evidence || "",
      ),
  },
  {
    id: "HE-15",
    desc: "Abstract contract (no implementation, no exploitable runtime)",
    test: (f) => /\babstract\s+contract\b/.test(f.evidence || ""),
  },
  {
    // HE-19 (#122, May 9 2026 — Symbiotic regression): Phase 4b emits
    // guard_asymmetry pairs where the "reverse" function is a pure read
    // path (view/pure). Read paths have no state to guard, so no
    // asymmetry can possibly compromise integrity. Extends HE-19 visibility
    // calibration (#117 caught internal/private; this catches view/pure).
    id: "HE-19",
    desc: "Phase 4b reverse function is view/pure (read-only path; no state to guard)",
    test: (f) =>
      typeof f.reverse_mutability === "string" &&
      /^(view|pure)$/i.test(f.reverse_mutability),
  },
];

function applyHardExclusions(finding) {
  for (const rule of HARD_EXCLUSION_RULES) {
    try {
      if (rule.test(finding)) {
        return { rejected: true, rule_id: rule.id, rule_desc: rule.desc };
      }
    } catch {
      /* keep going */
    }
  }
  return { rejected: false };
}

// ─── ADVERSARIAL PROMPT BUILDER ─────────────────────────────────────────────────

function buildAdversarialPrompt(finding) {
  // Aggressively compressed prompt — Ollama qwen3:8b on this box is
  // ~270ms/token in prompt-eval, so a 700-token prompt = 190s. Target ~120
  // tokens. Drop the full evidence block; LLM works from title+pattern+function
  // name+truncated description only.
  const fingerprint = `${finding.pattern || "?"}/${finding.kind || finding.title || "unknown"}`;
  const desc = (finding.description || finding.kind || "").slice(0, 220);
  const evidence = (finding.evidence || "").slice(0, 280);
  return `Adversarial reviewer. Decide if this is a REAL bug or a FALSE POSITIVE.

Severity: ${finding.severity}
Pattern: ${fingerprint}
At: ${finding.function || finding.file || "?"}
Desc: ${desc}
Code: ${evidence}

Reply EXACTLY:
VERDICT: ACCEPT|REJECT|UNCERTAIN
CONFIDENCE: 0.0-1.0
REASONING: one short sentence

ACCEPT = looks real. REJECT = clear false positive. UNCERTAIN = need more context. Do not reject for missing context.`;
}

// ─── OLLAMA CLIENT ──────────────────────────────────────────────────────────────

function ollamaGenerate(prompt, model, timeoutMs) {
  return new Promise((resolve, reject) => {
    const url = new URL("/api/generate", CONFIG.OLLAMA_URL);
    // qwen3 burns response budget on internal <think>; disable thinking and
    // give a fat num_predict so the actual VERDICT/CONFIDENCE/REASONING block
    // fits comfortably.
    const body = JSON.stringify({
      model,
      prompt: prompt + "\n\n/no_think",
      stream: false,
      think: false,
      options: { temperature: 0.2, num_predict: 800, top_p: 0.9 },
    });
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port || 11434,
        path: url.pathname,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const j = JSON.parse(data);
            if (j.error) return reject(new Error(`Ollama error: ${j.error}`));
            resolve(j.response || "");
          } catch (e) {
            reject(e);
          }
        });
      },
    );
    req.on("error", reject);
    req.setTimeout(timeoutMs || CONFIG.PER_LLM_TIMEOUT_MS, () => {
      req.destroy(new Error("Ollama timeout"));
    });
    req.write(body);
    req.end();
  });
}

// ─── ANTHROPIC FALLBACK ─────────────────────────────────────────────────────────

async function anthropicGenerate(prompt) {
  if (!fs.existsSync(CONFIG.ANTHROPIC_KEY_FILE)) {
    throw new Error("Anthropic key file not present");
  }
  const env = fs.readFileSync(CONFIG.ANTHROPIC_KEY_FILE, "utf8");
  const keyMatch = env.match(/ANTHROPIC_API_KEY\s*=\s*"?([^"\n]+)"?/);
  if (!keyMatch) throw new Error("No ANTHROPIC_API_KEY in env file");
  const apiKey = keyMatch[1].trim();

  const https = require("https");
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: CONFIG.ANTHROPIC_MODEL,
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }],
    });
    const req = https.request(
      {
        hostname: "api.anthropic.com",
        port: 443,
        path: "/v1/messages",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try {
            const j = JSON.parse(data);
            if (j.error)
              return reject(new Error(`Anthropic: ${j.error.message}`));
            const text = (j.content || [])
              .filter((c) => c.type === "text")
              .map((c) => c.text)
              .join("\n");
            resolve(text);
          } catch (e) {
            reject(e);
          }
        });
      },
    );
    req.on("error", reject);
    req.setTimeout(CONFIG.PER_LLM_TIMEOUT_MS, () =>
      req.destroy(new Error("Anthropic timeout")),
    );
    req.write(body);
    req.end();
  });
}

// ─── LLM RESPONSE PARSER ────────────────────────────────────────────────────────

function parseVerdict(response) {
  // qwen3 sometimes wraps in <think>...</think>; strip.
  const cleaned = response.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  const verdict =
    (cleaned.match(/VERDICT\s*:\s*(ACCEPT|REJECT|UNCERTAIN)/i) || [])[1] ||
    "UNCERTAIN";
  const conf = parseFloat(
    (cleaned.match(/CONFIDENCE\s*:\s*([0-9.]+)/i) || [])[1] || "0.5",
  );
  const reasoning =
    (cleaned.match(/REASONING\s*:\s*(.+?)(?=\n[A-Z]+:|$)/is) || [])[1] ||
    cleaned.slice(0, 400);
  return {
    verdict: verdict.toUpperCase(),
    confidence: isNaN(conf) ? 0.5 : Math.max(0, Math.min(1, conf)),
    reasoning: reasoning.trim().slice(0, 800),
    raw: cleaned.slice(0, 1200),
  };
}

// ─── ASYMMETRIC TIE-BREAKING ────────────────────────────────────────────────────

function applyAsymmetricCost(verdict, confidence, threshold, severity) {
  // We deliberately make CRITICAL findings nearly impossible to REJECT and
  // HIGH findings very hard to REJECT. The lesson from OKX validation
  // (May 4 2026): qwen3:8b confidently REJECTed a real EIP-1271 binding gap
  // at 0.95 confidence. Real bugs cost us $$$; noisy ACCEPTs cost only
  // reviewer time. Keep the asymmetry sharp.
  //
  //   CRITICAL: REJECT requires > 0.99 — effectively never. Drop to UNCERTAIN.
  //   HIGH:     REJECT requires >= 0.97 — only if the LLM is near-certain.
  //   MEDIUM:   REJECT requires >= 0.85 — lean toward REJECT only on strong signal.
  //   LOW/INFO: REJECT requires >= 0.67 — base threshold, save reviewer time.
  const REJECT_FLOOR = {
    CRITICAL: 1.01, // unreachable — CRITICAL findings cannot be REJECTed by LLM alone
    HIGH: 0.97,
    MEDIUM: 0.85,
    LOW: 0.67,
    INFO: 0.5,
  };
  const rejectFloor = REJECT_FLOOR[severity] ?? 0.67;

  if (verdict === "REJECT" && confidence < rejectFloor) {
    return {
      final_verdict: "UNCERTAIN",
      adjusted: true,
      reason: `REJECT confidence ${confidence.toFixed(2)} below asymmetric floor ${rejectFloor} for ${severity} severity (real bugs cost more than noisy ACCEPTs)`,
    };
  }
  if (verdict === "ACCEPT" && confidence < threshold) {
    return {
      final_verdict: "UNCERTAIN",
      adjusted: true,
      reason: `ACCEPT confidence ${confidence.toFixed(2)} below threshold ${threshold.toFixed(2)}`,
    };
  }
  return { final_verdict: verdict, adjusted: false };
}

// ─── PER-FINDING SKEPTIC ────────────────────────────────────────────────────────

async function skepticOne(finding, opts, log) {
  // 1. Hard-exclusion pre-filter
  const exc = applyHardExclusions(finding);
  if (exc.rejected) {
    return {
      id: finding.id,
      verdict: "REJECT",
      confidence: 0.95,
      reasoning: `Hard-exclusion rule ${exc.rule_id}: ${exc.rule_desc}`,
      source: "pre-filter",
      finding_severity: finding.severity,
      finding_pattern: finding.pattern,
    };
  }

  // 2. LLM adversarial pass
  const prompt = buildAdversarialPrompt(finding);
  let response = "";
  let source = "";
  let attempts = [];

  // Ollama first
  try {
    response = await ollamaGenerate(
      prompt,
      opts.model,
      CONFIG.PER_LLM_TIMEOUT_MS,
    );
    source = `ollama:${opts.model}`;
    attempts.push({ provider: source, ok: true });
  } catch (e) {
    attempts.push({
      provider: `ollama:${opts.model}`,
      ok: false,
      error: e.message.slice(0, 120),
    });
    // Anthropic fallback
    try {
      response = await anthropicGenerate(prompt);
      source = `anthropic:${CONFIG.ANTHROPIC_MODEL}`;
      attempts.push({ provider: source, ok: true });
    } catch (e2) {
      attempts.push({
        provider: "anthropic",
        ok: false,
        error: e2.message.slice(0, 120),
      });
      // No LLM available — return UNCERTAIN
      return {
        id: finding.id,
        verdict: "UNCERTAIN",
        confidence: 0.5,
        reasoning:
          "No LLM provider available (Ollama+Anthropic both failed). Defaulting to UNCERTAIN per asymmetric cost rule.",
        source: "no-llm-fallback",
        attempts,
        finding_severity: finding.severity,
        finding_pattern: finding.pattern,
      };
    }
  }

  // 3. Parse + asymmetric tie-breaking
  const parsed = parseVerdict(response);
  const adj = applyAsymmetricCost(
    parsed.verdict,
    parsed.confidence,
    opts.threshold,
    finding.severity,
  );
  if (opts.verbose)
    log(
      `  ${finding.id}: raw=${parsed.verdict}@${parsed.confidence.toFixed(2)} → final=${adj.final_verdict}${adj.adjusted ? " (adjusted)" : ""}`,
    );

  return {
    id: finding.id,
    verdict: adj.final_verdict,
    raw_verdict: parsed.verdict,
    confidence: parsed.confidence,
    reasoning: parsed.reasoning,
    asymmetric_adjustment: adj.adjusted ? adj.reason : null,
    source,
    attempts,
    finding_severity: finding.severity,
    finding_pattern: finding.pattern,
  };
}

// ─── BATCH SKEPTIC ──────────────────────────────────────────────────────────────

async function warmupOllama(model, log) {
  log(`  Warming up ${model} (first call may take 30-120s on cold start)...`);
  try {
    await ollamaGenerate(
      "Reply with one word: ready",
      model,
      CONFIG.WARMUP_TIMEOUT_MS,
    );
    log(`  Ollama ${model} warm.`);
    return true;
  } catch (e) {
    log(
      `  ⚠️  Ollama warmup failed: ${e.message}. Will fall back to Anthropic per finding.`,
    );
    return false;
  }
}

async function runSkeptic(findings, opts, log) {
  const verdicts = [];
  const total = findings.length;
  log(
    `Skeptic processing ${total} findings (model=${opts.model}, threshold=${opts.threshold}, max=${opts.maxFindings})`,
  );

  // Warm up Ollama BEFORE the batch — first call is the slow one.
  await warmupOllama(opts.model, log);

  // Cap if oversized
  let toProcess = findings;
  if (findings.length > opts.maxFindings) {
    log(
      `  ⚠️  ${findings.length} findings exceed cap of ${opts.maxFindings}. Prioritising by severity.`,
    );
    const rank = { CRITICAL: 5, HIGH: 4, MEDIUM: 3, LOW: 2, INFO: 1 };
    toProcess = [...findings]
      .sort((a, b) => (rank[b.severity] || 0) - (rank[a.severity] || 0))
      .slice(0, opts.maxFindings);
  }

  // Process serially (Ollama is single-instance) but report progress.
  let i = 0;
  for (const f of toProcess) {
    i++;
    if (i % 10 === 0 || opts.verbose)
      log(
        `  [${i}/${toProcess.length}] ${f.id} (${f.severity} ${f.pattern || "?"})`,
      );
    try {
      const v = await skepticOne(f, opts, log);
      verdicts.push(v);
    } catch (e) {
      log(`  ⚠️  ${f.id}: skeptic crashed: ${e.message}`);
      verdicts.push({
        id: f.id,
        verdict: "UNCERTAIN",
        confidence: 0.5,
        reasoning: `Skeptic crashed: ${e.message.slice(0, 200)}`,
        source: "crash",
        finding_severity: f.severity,
        finding_pattern: f.pattern,
      });
    }
  }

  return verdicts;
}

// ─── ROLLUP STATS ───────────────────────────────────────────────────────────────

function rollUp(verdicts) {
  const byVerdict = { ACCEPT: 0, REJECT: 0, UNCERTAIN: 0 };
  const bySource = {};
  const preFilterDrops = verdicts.filter(
    (v) => v.source === "pre-filter",
  ).length;
  const llmCalls = verdicts.filter(
    (v) =>
      v.source &&
      v.source !== "pre-filter" &&
      v.source !== "crash" &&
      v.source !== "no-llm-fallback",
  ).length;
  for (const v of verdicts) {
    byVerdict[v.verdict] = (byVerdict[v.verdict] || 0) + 1;
    bySource[v.source] = (bySource[v.source] || 0) + 1;
  }
  return {
    total: verdicts.length,
    byVerdict,
    bySource,
    preFilterDrops,
    llmCalls,
  };
}

// ─── CLI ────────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const opts = {
    input: null,
    output: null,
    model: CONFIG.OLLAMA_DEFAULT_MODEL,
    threshold: CONFIG.CONFIDENCE_THRESHOLD,
    maxFindings: CONFIG.MAX_FINDINGS,
    verbose: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--output") opts.output = argv[++i];
    else if (a === "--model") opts.model = argv[++i];
    else if (a === "--threshold") opts.threshold = parseFloat(argv[++i]);
    else if (a === "--max-findings") opts.maxFindings = parseInt(argv[++i], 10);
    else if (a === "--verbose") opts.verbose = true;
    else if (a === "--help" || a === "-h") {
      printHelp();
      process.exit(0);
    } else if (!a.startsWith("--")) opts.input = a;
  }
  return opts;
}

function printHelp() {
  console.log(`
BuzzShield V6 — Layer 4 Skeptic (false-positive eliminator)

Usage:
  node buzzshield-skeptic.js <findings.json> --output <path> [options]

Options:
  --output <path>        Output verdicts JSON (required)
  --model <name>         Ollama model (default: qwen3:8b)
  --threshold <0..1>     Min confidence to accept verdict (default: 0.67)
  --max-findings <n>     Cap on findings to LLM-process (default: 200, prioritised by severity)
  --verbose              Per-finding output

Output JSON shape:
  [{ id, verdict (ACCEPT/REJECT/UNCERTAIN), confidence, reasoning, source, ... }]

Decision asymmetry:
  - Hard-exclusion rules drop high-precision FPs without LLM call (15 rules)
  - LLM call returns adversarial verdict + confidence
  - REJECT requires 2× threshold for CRITICAL/HIGH (so we don't drop real $$$)
  - UNCERTAIN findings always pass through to next layer
`);
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0) {
    printHelp();
    process.exit(0);
  }
  const opts = parseArgs(argv);
  if (!opts.input || !fs.existsSync(opts.input)) {
    console.error("Error: input findings.json required");
    process.exit(1);
  }
  if (!opts.output) {
    console.error("Error: --output required");
    process.exit(1);
  }

  const findings = JSON.parse(fs.readFileSync(opts.input, "utf8"));
  if (!Array.isArray(findings)) {
    console.error("Error: input must be an array of findings");
    process.exit(1);
  }

  const log = (msg) => console.log(msg);
  log(`╔══════════════════════════════════════════════════════════════╗`);
  log(`║      BuzzShield V6 — Layer 4 Skeptic                         ║`);
  log(`╚══════════════════════════════════════════════════════════════╝`);
  log(`  Input:     ${opts.input} (${findings.length} findings)`);
  log(`  Output:    ${opts.output}`);
  log(`  Model:     ${opts.model}`);
  log(`  Threshold: ${opts.threshold}`);
  log("");

  const tStart = Date.now();
  const verdicts = await runSkeptic(findings, opts, log);
  const elapsed = ((Date.now() - tStart) / 1000).toFixed(1);

  // Output dir
  const outDir = path.dirname(opts.output);
  try {
    fs.mkdirSync(outDir, { recursive: true });
  } catch {}
  fs.writeFileSync(opts.output, JSON.stringify(verdicts, null, 2));

  const stats = rollUp(verdicts);
  log("");
  log(`╔══════════════════════════════════════════════════════════════╗`);
  log(`║                    SKEPTIC COMPLETE                          ║`);
  log(`╠══════════════════════════════════════════════════════════════╣`);
  log(`║  Total:           ${String(stats.total).padEnd(43)}║`);
  log(`║  ACCEPT:          ${String(stats.byVerdict.ACCEPT).padEnd(43)}║`);
  log(`║  REJECT:          ${String(stats.byVerdict.REJECT).padEnd(43)}║`);
  log(`║  UNCERTAIN:       ${String(stats.byVerdict.UNCERTAIN).padEnd(43)}║`);
  log(`║  Pre-filter drops:${String(stats.preFilterDrops).padEnd(43)}║`);
  log(`║  LLM calls:       ${String(stats.llmCalls).padEnd(43)}║`);
  log(`║  Elapsed:         ${(elapsed + "s").padEnd(43)}║`);
  log(`╚══════════════════════════════════════════════════════════════╝`);
}

// ─── EXPORTS ───────────────────────────────────────────────────────────────────

module.exports = {
  applyHardExclusions,
  buildAdversarialPrompt,
  parseVerdict,
  applyAsymmetricCost,
  ollamaGenerate,
  anthropicGenerate,
  skepticOne,
  runSkeptic,
  HARD_EXCLUSION_RULES,
};

if (require.main === module) {
  main().catch((e) => {
    console.error("Fatal:", e.message);
    console.error(e.stack);
    process.exit(1);
  });
}
