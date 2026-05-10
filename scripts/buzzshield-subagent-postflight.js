#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * BuzzShield #178 — Subagent-Spawn Postflight Verifier (v1.0)
 *
 * Meta-tooling that operationalizes the pre-spawn manifest discipline filed
 * today as Worked Example #17 in `brain/Doctrine.md`. Every multi-deliverable
 * subagent spawn carries an EXPLICIT pre-spawn manifest of file paths the
 * parent expects. After the subagent returns, the parent walks the manifest
 * with direct fs.statSync BEFORE quoting any deliverable to the operator.
 *
 * Replaces task #175 — the standalone manifest walker. Wraps #162
 * (`buzzshield-subagent-landing-verifier.js`) to add the manifest-source-of-
 * truth half that #162 alone does not cover (#162 verifies textual claims;
 * if the subagent never claimed a missing file, #162 returns
 * NO_CLAIMS_DETECTED — which is correct verifier behaviour but provides zero
 * coverage on missing-deliverables-from-spec).
 *
 * Origin: Worked Example #17 (2026-05-10) — paired-build subagent ae4a…
 * shipped 3 of 6 deliverables and exited terse mid-stream. Discipline-direct
 * `ls` per #129 caught the gap before any surface to operator. #178 codifies
 * that discipline as a CLI + programmatic API so the discipline is enforced
 * non-bypassably.
 *
 * Architecture (locked spec from msg 6660 + Worked Example #17):
 *
 *   Stage 1 — manifest verification (the CRITICAL part):
 *     For each path in the manifest:
 *       - fs.statSync existence check
 *       - size > 0 check
 *       - shape sanity (re-uses #162's inferExpectedShape + checkShape)
 *       - mtime check vs subagentCompletedAt (WARN if predates by >1s)
 *     Per-path verdict: PASS | FAIL_MISSING | FAIL_EMPTY | FAIL_SHAPE
 *                       | WARN_MTIME | WARN_PREEXISTING
 *
 *   Stage 2 — landing-verifier on text (the COMPLEMENTARY part):
 *     Invoke #162's verifyLanding({ subagentResultText, claimedPaths,
 *     subagentCompletedAt, options }) to extract path-claims from text.
 *     - claimedPaths NOT in manifest → EXTRA_CLAIM (informational)
 *     - manifest paths NOT claimed in text → UNCLAIMED_BUT_MANIFEST (warn:
 *       subagent shipped silently — Worked Example #17 case exactly)
 *
 *   Stage 3 — overall verdict + alerts:
 *     PASS — all manifest paths verified, no FAIL.
 *     WARN — at least one WARN_MTIME / WARN_PREEXISTING / UNCLAIMED_BUT_MANIFEST,
 *            no FAIL.
 *     FAIL — at least one FAIL_MISSING / FAIL_EMPTY / FAIL_SHAPE.
 *
 *   Recommendation:
 *     RESPAWN_RECOMMENDED — FAIL with > 50% manifest items missing/failed
 *     MAIN_THREAD_COMPLETE_RECOMMENDED — FAIL with ≤ 50% missing
 *     NONE — PASS or WARN
 *
 * Reference:
 *   - brain/Doctrine.md → Worked Example #17 (subagent partial-completion)
 *   - rules/detector-pr-template.md (emit + collect + consume coverage)
 *   - scripts/buzzshield-subagent-landing-verifier.js (#162, wrapped here)
 *
 * Usage (CLI):
 *   node buzzshield-subagent-postflight.js \
 *       --manifest <file>                    # JSON list of expected paths
 *       --subagent-text <file>               # plain-text final assistant message
 *       --subagent-completed-at <ISO8601>    # for mtime warning
 *       [--alert-webhook <url>]              # optional War Room webhook
 *       [--out <file>]                       # JSON output path; default stdout
 *       [--verbose]                          # log per-step decisions
 *
 * Programmatic:
 *   const { runPostflight } = require('./buzzshield-subagent-postflight');
 *   const result = await runPostflight({
 *     manifest: ['/abs/path/1', '/abs/path/2'],
 *     subagentText: '...',
 *     subagentCompletedAt: '2026-05-10T15:00:00Z',
 *     alertWebhook: 'https://...',
 *     verbose: false,
 *   });
 *   // result: { overall, manifest_verdicts, landing_verdict, alerts, ... }
 */

const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

const landing = require("./buzzshield-subagent-landing-verifier.js");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DETECTOR_ID = "buzzshield-178-postflight";
const VERSION = "1.0";

// Per-path manifest verdict constants
const V_PASS = "PASS";
const V_FAIL_MISSING = "FAIL_MISSING";
const V_FAIL_EMPTY = "FAIL_EMPTY";
const V_FAIL_SHAPE = "FAIL_SHAPE";
const V_WARN_MTIME = "WARN_MTIME";
const V_WARN_PREEXISTING = "WARN_PREEXISTING";

const FAIL_VERDICTS = new Set([V_FAIL_MISSING, V_FAIL_EMPTY, V_FAIL_SHAPE]);
const WARN_VERDICTS = new Set([V_WARN_MTIME, V_WARN_PREEXISTING]);

// Recommendation constants
const REC_NONE = "NONE";
const REC_RESPAWN = "RESPAWN_RECOMMENDED";
const REC_MAIN_THREAD = "MAIN_THREAD_COMPLETE_RECOMMENDED";

// ---------------------------------------------------------------------------
// Stage 1 — manifest verification
// ---------------------------------------------------------------------------

/**
 * Verify a single manifest path.
 *
 * @param {string} manifestPath  absolute path the parent expected to exist
 * @param {object} opts          { subagentCompletedAt: ISO|null }
 * @returns {object} { path, verdict, bytes, mtime, mtime_ms, shape_match,
 *                     reason, claimed_in_text }
 */
function verifyManifestPath(manifestPath, opts = {}) {
  const result = {
    path: manifestPath,
    verdict: null,
    bytes: 0,
    mtime: null,
    mtime_ms: null,
    shape_match: null,
    reason: null,
    claimed_in_text: false, // populated by caller after Stage 2
  };

  let st;
  try {
    st = fs.statSync(manifestPath);
  } catch (e) {
    if (e.code === "ENOENT") {
      result.verdict = V_FAIL_MISSING;
      result.reason = "file does not exist";
      return result;
    }
    result.verdict = V_FAIL_MISSING;
    result.reason = `stat failed: ${e.message}`;
    return result;
  }

  result.bytes = st.size;
  result.mtime_ms = st.mtimeMs;
  result.mtime = new Date(st.mtimeMs).toISOString();

  if (st.size === 0) {
    result.verdict = V_FAIL_EMPTY;
    result.reason = "file size is 0";
    return result;
  }

  // Shape sanity — reuse #162's inferExpectedShape + checkShape
  const expectedShape = landing.inferExpectedShape(manifestPath);
  let content = "";
  try {
    const fd = fs.openSync(manifestPath, "r");
    const buf = Buffer.alloc(Math.min(16384, st.size));
    fs.readSync(fd, buf, 0, buf.length, 0);
    fs.closeSync(fd);
    content = buf.toString("utf8");
  } catch (e) {
    result.verdict = V_FAIL_SHAPE;
    result.reason = `read failed: ${e.message}`;
    return result;
  }
  const shapeCheck = landing.checkShape(content, expectedShape);
  result.shape_match = { expected: expectedShape, ...shapeCheck };
  if (!shapeCheck.ok) {
    result.verdict = V_FAIL_SHAPE;
    result.reason = `shape mismatch: ${shapeCheck.reason}`;
    return result;
  }

  // Mtime check — WARN_PREEXISTING if file pre-dates subagent completion
  // by more than 1 second of clock drift slack.
  if (opts.subagentCompletedAt) {
    const completedMs = new Date(opts.subagentCompletedAt).getTime();
    if (Number.isFinite(completedMs) && st.mtimeMs < completedMs - 1000) {
      const ageSec = Math.round((completedMs - st.mtimeMs) / 1000);
      result.verdict = V_WARN_PREEXISTING;
      result.reason = `file mtime predates subagent completion by ${ageSec}s — likely pre-existing, not freshly written`;
      return result;
    }
  }

  result.verdict = V_PASS;
  result.reason = "exists, non-empty, shape-ok";
  return result;
}

/**
 * Walk every path in the manifest. Returns array of per-path verdicts in
 * input order. Caller fills `.claimed_in_text` after Stage 2 runs.
 */
function walkManifest(manifest, opts = {}) {
  if (!Array.isArray(manifest)) {
    throw new Error("manifest must be an array of absolute paths");
  }
  return manifest.map((p) => verifyManifestPath(p, opts));
}

// ---------------------------------------------------------------------------
// Stage 2 — landing-verifier on text + reconciliation with manifest
// ---------------------------------------------------------------------------

/**
 * Invoke #162 to extract path-claims from the subagent text. Returns the
 * full landing verdict (shape per #162). Quiets alerts inside the wrapped
 * call — #178 owns the alerting layer.
 */
async function runLandingVerifier(subagentText, manifest, opts = {}) {
  // Pass the manifest as the EXPECTED superset of claims — this lets #162
  // verify those paths exist (we'll do that ourselves in Stage 1, but the
  // overlap is intentional: #162's claim-extraction surfaces paths the
  // subagent claimed BEYOND the manifest).
  return landing.verifyLanding({
    subagentResultText: subagentText || "",
    claimedPaths: null, // null → auto-extract from text only
    options: {
      autoReconstruct: false, // #178 doesn't auto-reconstruct; surface gaps
      alertWebhook: null, // #178 owns alerting
      subagentCompletedAt: opts.subagentCompletedAt || null,
      expectedShape: null,
    },
  });
}

/**
 * Reconcile manifest vs text-claims:
 *   - extras: paths claimed in text but NOT in manifest
 *   - unclaimed: paths in manifest NOT mentioned in text
 *
 * Mutates manifestVerdicts to set `.claimed_in_text` per entry.
 */
function reconcileManifestVsText(manifestVerdicts, landingVerdict) {
  const manifestSet = new Set(manifestVerdicts.map((v) => v.path));
  const textClaims = Array.isArray(landingVerdict.claimedPaths)
    ? landingVerdict.claimedPaths
    : [];
  const textClaimSet = new Set(textClaims);

  for (const v of manifestVerdicts) {
    v.claimed_in_text = textClaimSet.has(v.path);
  }

  const extras = textClaims.filter((p) => !manifestSet.has(p));
  const unclaimed = manifestVerdicts
    .filter((v) => !v.claimed_in_text)
    .map((v) => v.path);

  return { extras, unclaimed };
}

// ---------------------------------------------------------------------------
// Stage 3 — overall verdict + recommendation + alert text
// ---------------------------------------------------------------------------

/**
 * Compute overall verdict from manifest verdicts + reconciliation.
 *
 * PASS — all manifest paths verified, no FAIL anywhere.
 * WARN — at least one WARN_* or UNCLAIMED_BUT_MANIFEST, no FAIL.
 * FAIL — at least one FAIL_* in manifest verdicts.
 */
function computeOverall(manifestVerdicts, unclaimedCount) {
  const hasFail = manifestVerdicts.some((v) => FAIL_VERDICTS.has(v.verdict));
  const hasWarn =
    manifestVerdicts.some((v) => WARN_VERDICTS.has(v.verdict)) ||
    unclaimedCount > 0;
  if (hasFail) return "FAIL";
  if (hasWarn) return "WARN";
  return "PASS";
}

/**
 * Compute the recommendation. RESPAWN if > 50% of manifest items failed;
 * MAIN_THREAD_COMPLETE if ≤ 50%; NONE if no FAILs.
 *
 * The 50% threshold is chosen so that a small gap (1-2 missing files in a
 * 6-deliverable spawn) → cache-warm main-thread completion (cheaper),
 * while a major gap (subagent died early, half+ the manifest missing) →
 * fresh respawn (clean state, full budget).
 */
function computeRecommendation(manifestVerdicts) {
  const total = manifestVerdicts.length;
  if (total === 0) return REC_NONE;
  const failCount = manifestVerdicts.filter((v) =>
    FAIL_VERDICTS.has(v.verdict),
  ).length;
  if (failCount === 0) return REC_NONE;
  const failRatio = failCount / total;
  if (failRatio > 0.5) return REC_RESPAWN;
  return REC_MAIN_THREAD;
}

/**
 * Build a multi-line War Room alert text block. One line per FAIL/WARN
 * manifest entry plus header and recommendation footer.
 */
function buildAlertLines({
  manifestVerdicts,
  extras,
  unclaimed,
  overall,
  recommendation,
  subagentCompletedAt,
}) {
  const lines = [
    `[BuzzShield #178] Subagent postflight: ${overall}`,
    `Manifest size: ${manifestVerdicts.length}`,
    `Subagent completed at: ${subagentCompletedAt || "(unknown)"}`,
  ];

  // FAIL entries first
  for (const v of manifestVerdicts) {
    if (FAIL_VERDICTS.has(v.verdict)) {
      lines.push(`  ${v.verdict}: ${v.path} (${v.reason})`);
    }
  }
  // WARN entries
  for (const v of manifestVerdicts) {
    if (WARN_VERDICTS.has(v.verdict)) {
      lines.push(`  ${v.verdict}: ${v.path} (${v.reason})`);
    }
  }
  // Unclaimed but in manifest (Worked Example #17 case)
  for (const p of unclaimed) {
    lines.push(
      `  UNCLAIMED_BUT_MANIFEST: ${p} (subagent shipped silently — Worked Example #17 pattern)`,
    );
  }
  // Extras — informational only
  for (const p of extras) {
    lines.push(`  EXTRA_CLAIM: ${p} (claimed in text but not in manifest)`);
  }

  if (recommendation !== REC_NONE) {
    lines.push(`Recommendation: ${recommendation}`);
  }
  return lines;
}

// ---------------------------------------------------------------------------
// Alert delivery (mirrors #162's postAlert)
// ---------------------------------------------------------------------------

function postAlert(webhookUrl, message) {
  return new Promise((resolve) => {
    if (!webhookUrl) {
      resolve({ sent: false, reason: "no webhook configured" });
      return;
    }
    let url;
    try {
      url = new URL(webhookUrl);
    } catch (e) {
      resolve({ sent: false, reason: `invalid webhook URL: ${e.message}` });
      return;
    }
    const lib = url.protocol === "https:" ? https : http;
    const body = JSON.stringify({ text: message });
    const req = lib.request(
      {
        method: "POST",
        host: url.host,
        path: url.pathname + url.search,
        headers: {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(body),
        },
        timeout: 5000,
      },
      (res) => {
        let resBody = "";
        res.on("data", (c) => (resBody += c));
        res.on("end", () =>
          resolve({
            sent: true,
            status: res.statusCode,
            body: resBody.slice(0, 200),
          }),
        );
      },
    );
    req.on("error", (e) => resolve({ sent: false, reason: e.message }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ sent: false, reason: "timeout" });
    });
    req.write(body);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Main entry — runPostflight (programmatic API)
// ---------------------------------------------------------------------------

async function runPostflight({
  manifest = [],
  subagentText = "",
  subagentCompletedAt = null,
  alertWebhook = null,
  verbose = false,
} = {}) {
  const scannedAt = new Date().toISOString();

  if (!Array.isArray(manifest)) {
    throw new Error("manifest must be an array of absolute paths");
  }

  if (verbose) {
    console.error(
      `[#178] runPostflight: manifest=${manifest.length} paths, text=${subagentText.length}b, completed_at=${subagentCompletedAt || "(none)"}`,
    );
  }

  // Stage 1 — manifest walk
  const manifestVerdicts = walkManifest(manifest, { subagentCompletedAt });
  if (verbose) {
    for (const v of manifestVerdicts) {
      console.error(`[#178] Stage 1: ${v.verdict} ${v.path} (${v.reason})`);
    }
  }

  // Stage 2 — landing-verifier on text
  const landingVerdict = await runLandingVerifier(subagentText, manifest, {
    subagentCompletedAt,
  });
  if (verbose) {
    console.error(
      `[#178] Stage 2: landing verdict=${landingVerdict.overall} (${landingVerdict.claimedPaths.length} claims extracted)`,
    );
  }

  // Reconcile — annotate manifestVerdicts with claimed_in_text
  const { extras, unclaimed } = reconcileManifestVsText(
    manifestVerdicts,
    landingVerdict,
  );
  if (verbose) {
    if (extras.length) {
      console.error(
        `[#178] Stage 2: ${extras.length} EXTRA_CLAIM(s) — ${extras.join(", ")}`,
      );
    }
    if (unclaimed.length) {
      console.error(
        `[#178] Stage 2: ${unclaimed.length} UNCLAIMED_BUT_MANIFEST — ${unclaimed.join(", ")}`,
      );
    }
  }

  // Stage 3 — overall + recommendation + alerts
  const overall = computeOverall(manifestVerdicts, unclaimed.length);
  const recommendation = computeRecommendation(manifestVerdicts);
  const alertLines = buildAlertLines({
    manifestVerdicts,
    extras,
    unclaimed,
    overall,
    recommendation,
    subagentCompletedAt,
  });

  let alertResult = null;
  if (overall !== "PASS" && alertWebhook) {
    alertResult = await postAlert(alertWebhook, alertLines.join("\n"));
  }

  const counts = {
    pass: 0,
    fail_missing: 0,
    fail_empty: 0,
    fail_shape: 0,
    warn_mtime: 0,
    warn_preexisting: 0,
  };
  for (const v of manifestVerdicts) {
    const k = v.verdict.toLowerCase();
    if (counts[k] !== undefined) counts[k]++;
  }

  return {
    detector: DETECTOR_ID,
    version: VERSION,
    scanned_at: scannedAt,
    subagent_completed_at: subagentCompletedAt,
    manifest_count: manifest.length,
    manifest_verdicts: manifestVerdicts,
    landing_verdict: landingVerdict,
    extras,
    unclaimed,
    counts,
    overall,
    recommendation,
    alerts: alertLines,
    alert_post_result: alertResult,
  };
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
      } else {
        args[key] = true;
      }
    } else {
      args._.push(a);
    }
  }
  return args;
}

function usage() {
  console.error(
    "Usage: buzzshield-subagent-postflight.js \\\n" +
      "    --manifest <file>                JSON array of absolute paths\n" +
      "    --subagent-text <file>           Plain-text final assistant message\n" +
      "    --subagent-completed-at <iso>    ISO8601 timestamp (mtime warn)\n" +
      "    [--alert-webhook <url>]          POST FAIL summary to this webhook\n" +
      "    [--out <file>]                   Write JSON verdict to file\n" +
      "    [--verbose]                      Log per-step decisions to stderr\n",
  );
}

function loadManifestFile(file) {
  const raw = fs.readFileSync(file, "utf8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error("manifest file must contain a JSON array of paths");
  }
  // Validate every entry is a non-empty string and absolute
  for (const p of parsed) {
    if (typeof p !== "string" || p.length === 0) {
      throw new Error(`manifest entry not a string: ${JSON.stringify(p)}`);
    }
    if (!path.isAbsolute(p)) {
      throw new Error(`manifest entry not absolute: ${p}`);
    }
  }
  return parsed;
}

async function cliMain() {
  const args = parseArgs(process.argv);

  if (!args.manifest) {
    usage();
    console.error("ERROR: --manifest is required");
    process.exit(1);
  }
  if (!args["subagent-text"]) {
    usage();
    console.error("ERROR: --subagent-text is required");
    process.exit(1);
  }

  let manifest;
  try {
    manifest = loadManifestFile(args.manifest);
  } catch (e) {
    console.error(`ERROR loading manifest: ${e.message}`);
    process.exit(1);
  }

  let subagentText = "";
  try {
    subagentText = fs.readFileSync(args["subagent-text"], "utf8");
  } catch (e) {
    console.error(`ERROR reading subagent text: ${e.message}`);
    process.exit(1);
  }

  const result = await runPostflight({
    manifest,
    subagentText,
    subagentCompletedAt: args["subagent-completed-at"] || null,
    alertWebhook: args["alert-webhook"] || null,
    verbose: !!args.verbose,
  });

  const json = JSON.stringify(result, null, 2);
  if (args.out) {
    fs.writeFileSync(args.out, json);
    console.error(
      `\nFull verdict saved: ${args.out} — overall=${result.overall} recommendation=${result.recommendation}`,
    );
  } else {
    console.log(json);
  }

  // Exit code: 0 = PASS, 2 = WARN, 3 = FAIL
  if (result.overall === "PASS") process.exit(0);
  if (result.overall === "WARN") process.exit(2);
  if (result.overall === "FAIL") process.exit(3);
  process.exit(4);
}

if (require.main === module) {
  cliMain().catch((err) => {
    console.error("FATAL:", err.stack || err);
    process.exit(5);
  });
}

module.exports = {
  runPostflight,
  walkManifest,
  verifyManifestPath,
  reconcileManifestVsText,
  computeOverall,
  computeRecommendation,
  buildAlertLines,
  runLandingVerifier,
  // Verdict constants
  V_PASS,
  V_FAIL_MISSING,
  V_FAIL_EMPTY,
  V_FAIL_SHAPE,
  V_WARN_MTIME,
  V_WARN_PREEXISTING,
  REC_NONE,
  REC_RESPAWN,
  REC_MAIN_THREAD,
  FAIL_VERDICTS,
  WARN_VERDICTS,
  DETECTOR_ID,
  VERSION,
};
