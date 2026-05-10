#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * E2E unit test for #178 subagent-spawn postflight verifier.
 *
 * Per detector-pr-template.md, this test walks the full field-flow path for
 * the new detector — emit (manifest list parsing) → collect (per-path stat
 * + shape check + #162 invocation) → consume (overall verdict +
 * recommendation + alert text).
 *
 * Two primary fixtures:
 *
 *   1. manifest-all-pass.json + 3 mock files (subagent shipped 3/3,
 *      mentioned all in text). Expected: overall=PASS recommendation=NONE.
 *
 *   2. manifest-partial-fail.json + 2-of-4 mock files (subagent shipped
 *      2/4, mentioned only 2 in text). Expected: overall=FAIL
 *      recommendation=MAIN_THREAD_COMPLETE_RECOMMENDED + at least one
 *      FAIL_MISSING verdict. This is the Doctrine-level test — the system
 *      must catch what Worked Example #17 documented.
 *
 * Plus offline coverage on the primitives:
 *   - manifest JSON load + absolute-path validation
 *   - per-path verifyManifestPath (PASS / FAIL_MISSING / FAIL_EMPTY / WARN_PREEXISTING)
 *   - reconcileManifestVsText (extras + unclaimed)
 *   - computeOverall + computeRecommendation
 *   - alert-text builder
 *
 * Run: node scripts/test-subagent-postflight.js
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");
const detector = require("./buzzshield-subagent-postflight.js");

const FIXTURES_ROOT = path.resolve(__dirname, "test-fixtures-postflight");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    const r = fn();
    if (r && typeof r.then === "function") {
      return r
        .then(() => {
          console.log(`  PASS  ${name}`);
          passed++;
        })
        .catch((err) => {
          console.log(`  FAIL  ${name}`);
          console.log("        " + (err.message || err));
          failed++;
        });
    }
    console.log(`  PASS  ${name}`);
    passed++;
    return null;
  } catch (err) {
    console.log(`  FAIL  ${name}`);
    console.log("        " + (err.message || err));
    failed++;
    return null;
  }
}

async function main() {
  console.log("=== #178 subagent postflight verifier E2E test ===\n");

  // ============================================================
  // EMIT layer probe — manifest list parsing
  // ============================================================
  console.log(
    "[Layer 1: EMIT — manifest JSON load + absolute-path validation]",
  );

  test("emit: manifest-all-pass.json parses to 3-element string array", () => {
    const raw = fs.readFileSync(
      path.join(FIXTURES_ROOT, "manifest-all-pass.json"),
      "utf8",
    );
    const m = JSON.parse(raw);
    assert.ok(Array.isArray(m), "manifest must be an array");
    assert.strictEqual(m.length, 3, `expected 3 entries, got ${m.length}`);
    for (const p of m) {
      assert.strictEqual(typeof p, "string");
      assert.ok(path.isAbsolute(p), `not absolute: ${p}`);
    }
  });

  test("emit: manifest-partial-fail.json parses to 4-element string array", () => {
    const raw = fs.readFileSync(
      path.join(FIXTURES_ROOT, "manifest-partial-fail.json"),
      "utf8",
    );
    const m = JSON.parse(raw);
    assert.strictEqual(m.length, 4);
    for (const p of m) assert.ok(path.isAbsolute(p));
  });

  test("emit: walkManifest invariant — output length matches input length", () => {
    const m = [
      path.join(FIXTURES_ROOT, "all-pass-source.js"),
      path.join(FIXTURES_ROOT, "all-pass-test.js"),
    ];
    const verdicts = detector.walkManifest(m);
    assert.strictEqual(verdicts.length, 2);
    assert.strictEqual(verdicts[0].path, m[0]);
    assert.strictEqual(verdicts[1].path, m[1]);
  });

  test("emit: walkManifest rejects non-array input", () => {
    assert.throws(
      () => detector.walkManifest("not-an-array"),
      /manifest must be an array/,
    );
  });

  // ============================================================
  // COLLECT layer probe — per-path stat + shape + #162 invocation
  // ============================================================
  console.log(
    "\n[Layer 2: COLLECT — per-path stat + shape check + #162 invocation]",
  );

  test("collect: verifyManifestPath returns PASS on existing non-empty .js file", () => {
    const v = detector.verifyManifestPath(
      path.join(FIXTURES_ROOT, "all-pass-source.js"),
    );
    assert.strictEqual(v.verdict, detector.V_PASS);
    assert.ok(v.bytes > 0, "bytes must be > 0");
    assert.ok(v.mtime, "mtime must be populated");
    assert.ok(v.shape_match, "shape_match must be populated");
  });

  test("collect: verifyManifestPath returns FAIL_MISSING on non-existent path", () => {
    const v = detector.verifyManifestPath(
      path.join(FIXTURES_ROOT, "this-file-does-not-exist.js"),
    );
    assert.strictEqual(v.verdict, detector.V_FAIL_MISSING);
    assert.strictEqual(v.bytes, 0);
    assert.match(v.reason, /does not exist/);
  });

  test("collect: verifyManifestPath returns FAIL_EMPTY on zero-byte file", () => {
    // Synthesize a zero-byte file
    const zpath = path.join(FIXTURES_ROOT, "tmp-empty.txt");
    fs.writeFileSync(zpath, "");
    try {
      const v = detector.verifyManifestPath(zpath);
      assert.strictEqual(v.verdict, detector.V_FAIL_EMPTY);
      assert.match(v.reason, /size is 0/);
    } finally {
      fs.unlinkSync(zpath);
    }
  });

  test("collect: verifyManifestPath returns WARN_PREEXISTING when file mtime predates subagent completion", () => {
    // Use an existing file but pretend the subagent completed in the
    // distant future. Should warn that the file pre-dates that.
    const futureIso = new Date(Date.now() + 1000 * 60 * 60).toISOString();
    const v = detector.verifyManifestPath(
      path.join(FIXTURES_ROOT, "all-pass-source.js"),
      { subagentCompletedAt: futureIso },
    );
    assert.strictEqual(v.verdict, detector.V_WARN_PREEXISTING);
    assert.match(v.reason, /predates subagent completion/);
  });

  test("collect: verifyManifestPath shape check rejects nothing on JSON file with valid JSON", () => {
    const v = detector.verifyManifestPath(
      path.join(FIXTURES_ROOT, "manifest-all-pass.json"),
    );
    assert.strictEqual(v.verdict, detector.V_PASS);
    assert.strictEqual(v.shape_match.expected, "json");
    assert.strictEqual(v.shape_match.ok, true);
  });

  test("collect: runLandingVerifier extracts text claims via #162", async () => {
    const text = fs.readFileSync(
      path.join(FIXTURES_ROOT, "subagent-text-all-pass.txt"),
      "utf8",
    );
    const lv = await detector.runLandingVerifier(text, []);
    assert.ok(Array.isArray(lv.claimedPaths));
    // text mentions 3 absolute paths
    assert.ok(
      lv.claimedPaths.length >= 3,
      `expected ≥3 path claims, got ${lv.claimedPaths.length}: ${JSON.stringify(lv.claimedPaths)}`,
    );
    for (const p of lv.claimedPaths) {
      assert.ok(p.startsWith("/"), `not absolute: ${p}`);
    }
  });

  test("collect: reconcileManifestVsText annotates claimed_in_text + returns extras + unclaimed", () => {
    const manifestVerdicts = [
      { path: "/a/file1", verdict: detector.V_PASS, claimed_in_text: false },
      { path: "/a/file2", verdict: detector.V_PASS, claimed_in_text: false },
      {
        path: "/a/file3-missing",
        verdict: detector.V_FAIL_MISSING,
        claimed_in_text: false,
      },
    ];
    const landingVerdict = {
      claimedPaths: ["/a/file1", "/a/extra-not-in-manifest"],
    };
    const { extras, unclaimed } = detector.reconcileManifestVsText(
      manifestVerdicts,
      landingVerdict,
    );
    assert.deepStrictEqual(extras, ["/a/extra-not-in-manifest"]);
    assert.deepStrictEqual(unclaimed.sort(), ["/a/file2", "/a/file3-missing"]);
    // Annotation
    assert.strictEqual(manifestVerdicts[0].claimed_in_text, true);
    assert.strictEqual(manifestVerdicts[1].claimed_in_text, false);
    assert.strictEqual(manifestVerdicts[2].claimed_in_text, false);
  });

  // ============================================================
  // CONSUME layer probe — overall verdict + recommendation + alert
  // ============================================================
  console.log(
    "\n[Layer 3: CONSUME — overall verdict + recommendation + alert text]",
  );

  test("consume: computeOverall returns PASS when all verdicts PASS, no unclaimed", () => {
    const v = [{ verdict: detector.V_PASS }, { verdict: detector.V_PASS }];
    assert.strictEqual(detector.computeOverall(v, 0), "PASS");
  });

  test("consume: computeOverall returns WARN when WARN_PREEXISTING present, no FAIL", () => {
    const v = [
      { verdict: detector.V_PASS },
      { verdict: detector.V_WARN_PREEXISTING },
    ];
    assert.strictEqual(detector.computeOverall(v, 0), "WARN");
  });

  test("consume: computeOverall returns WARN when unclaimed > 0 and no FAIL", () => {
    const v = [{ verdict: detector.V_PASS }];
    assert.strictEqual(detector.computeOverall(v, 1), "WARN");
  });

  test("consume: computeOverall returns FAIL when any FAIL_MISSING present", () => {
    const v = [
      { verdict: detector.V_PASS },
      { verdict: detector.V_FAIL_MISSING },
    ];
    assert.strictEqual(detector.computeOverall(v, 0), "FAIL");
  });

  test("consume: computeRecommendation returns NONE when no FAILs", () => {
    const v = [
      { verdict: detector.V_PASS },
      { verdict: detector.V_WARN_PREEXISTING },
    ];
    assert.strictEqual(detector.computeRecommendation(v), detector.REC_NONE);
  });

  test("consume: computeRecommendation returns MAIN_THREAD when ≤50% failed (1/4)", () => {
    const v = [
      { verdict: detector.V_PASS },
      { verdict: detector.V_PASS },
      { verdict: detector.V_PASS },
      { verdict: detector.V_FAIL_MISSING },
    ];
    assert.strictEqual(
      detector.computeRecommendation(v),
      detector.REC_MAIN_THREAD,
    );
  });

  test("consume: computeRecommendation returns MAIN_THREAD when exactly 50% failed (2/4)", () => {
    const v = [
      { verdict: detector.V_PASS },
      { verdict: detector.V_PASS },
      { verdict: detector.V_FAIL_MISSING },
      { verdict: detector.V_FAIL_MISSING },
    ];
    // Threshold is strictly > 0.5 → 50% exactly is MAIN_THREAD
    assert.strictEqual(
      detector.computeRecommendation(v),
      detector.REC_MAIN_THREAD,
    );
  });

  test("consume: computeRecommendation returns RESPAWN when >50% failed (3/4)", () => {
    const v = [
      { verdict: detector.V_PASS },
      { verdict: detector.V_FAIL_MISSING },
      { verdict: detector.V_FAIL_MISSING },
      { verdict: detector.V_FAIL_MISSING },
    ];
    assert.strictEqual(detector.computeRecommendation(v), detector.REC_RESPAWN);
  });

  test("consume: buildAlertLines includes one line per FAIL + recommendation footer", () => {
    const lines = detector.buildAlertLines({
      manifestVerdicts: [
        {
          path: "/a/missing.js",
          verdict: detector.V_FAIL_MISSING,
          reason: "file does not exist",
        },
        {
          path: "/a/empty.js",
          verdict: detector.V_FAIL_EMPTY,
          reason: "file size is 0",
        },
      ],
      extras: [],
      unclaimed: [],
      overall: "FAIL",
      recommendation: detector.REC_MAIN_THREAD,
      subagentCompletedAt: "2026-05-10T15:00:00Z",
    });
    const blob = lines.join("\n");
    assert.match(blob, /BuzzShield #178/);
    assert.match(blob, /FAIL_MISSING.*missing\.js/);
    assert.match(blob, /FAIL_EMPTY.*empty\.js/);
    assert.match(blob, /MAIN_THREAD_COMPLETE_RECOMMENDED/);
  });

  test("consume: buildAlertLines includes UNCLAIMED_BUT_MANIFEST line for silent-omission case", () => {
    const lines = detector.buildAlertLines({
      manifestVerdicts: [{ path: "/a/file1", verdict: detector.V_PASS }],
      extras: [],
      unclaimed: ["/a/file2"],
      overall: "WARN",
      recommendation: detector.REC_NONE,
      subagentCompletedAt: "2026-05-10T15:00:00Z",
    });
    const blob = lines.join("\n");
    assert.match(blob, /UNCLAIMED_BUT_MANIFEST.*file2/);
    assert.match(blob, /Worked Example #17/);
  });

  // ============================================================
  // FULL PIPELINE — end-to-end runPostflight on both fixtures
  // ============================================================
  console.log("\n[Pipeline: runPostflight end-to-end on both fixtures]");

  await test("pipeline: manifest-all-pass + matching text → overall=PASS recommendation=NONE", async () => {
    const manifest = JSON.parse(
      fs.readFileSync(
        path.join(FIXTURES_ROOT, "manifest-all-pass.json"),
        "utf8",
      ),
    );
    const subagentText = fs.readFileSync(
      path.join(FIXTURES_ROOT, "subagent-text-all-pass.txt"),
      "utf8",
    );
    const result = await detector.runPostflight({
      manifest,
      subagentText,
      subagentCompletedAt: null, // skip mtime check; fixture files predate "now"
    });
    assert.strictEqual(
      result.overall,
      "PASS",
      `expected overall=PASS, got ${result.overall}: ${JSON.stringify(result.alerts)}`,
    );
    assert.strictEqual(result.recommendation, detector.REC_NONE);
    assert.strictEqual(result.manifest_count, 3);
    assert.strictEqual(result.counts.pass, 3);
    assert.strictEqual(result.counts.fail_missing, 0);
    assert.strictEqual(result.unclaimed.length, 0);
    // All 3 manifest paths should be claimed_in_text=true
    for (const v of result.manifest_verdicts) {
      assert.strictEqual(
        v.claimed_in_text,
        true,
        `path not claimed in text: ${v.path}`,
      );
    }
  });

  await test("pipeline: manifest-partial-fail (2-of-4 shipped) → overall=FAIL + MAIN_THREAD_COMPLETE_RECOMMENDED + ≥1 FAIL_MISSING (Worked Example #17 case)", async () => {
    const manifest = JSON.parse(
      fs.readFileSync(
        path.join(FIXTURES_ROOT, "manifest-partial-fail.json"),
        "utf8",
      ),
    );
    const subagentText = fs.readFileSync(
      path.join(FIXTURES_ROOT, "subagent-text-partial-fail.txt"),
      "utf8",
    );
    const result = await detector.runPostflight({
      manifest,
      subagentText,
      subagentCompletedAt: null,
    });
    assert.strictEqual(
      result.overall,
      "FAIL",
      `expected overall=FAIL, got ${result.overall}: verdicts=${JSON.stringify(result.manifest_verdicts.map((v) => `${v.verdict}:${v.path}`))}`,
    );
    assert.strictEqual(
      result.recommendation,
      detector.REC_MAIN_THREAD,
      `expected MAIN_THREAD_COMPLETE_RECOMMENDED, got ${result.recommendation}`,
    );
    assert.strictEqual(result.manifest_count, 4);
    // Exactly 2 PASS, 2 FAIL_MISSING
    assert.strictEqual(result.counts.pass, 2);
    assert.strictEqual(result.counts.fail_missing, 2);
    // The 2 FAIL_MISSING entries should be partial-test.js + partial-report.md
    const failed = result.manifest_verdicts.filter(
      (v) => v.verdict === detector.V_FAIL_MISSING,
    );
    const failedNames = failed.map((v) => path.basename(v.path)).sort();
    assert.deepStrictEqual(failedNames, [
      "partial-report.md",
      "partial-test.js",
    ]);
    // Subagent text only mentioned the 2 source files; the missing 2 should
    // ALSO be in unclaimed (silent-omission case — Worked Example #17 exact)
    assert.ok(
      result.unclaimed.length >= 2,
      `expected ≥2 unclaimed, got ${result.unclaimed.length}: ${JSON.stringify(result.unclaimed)}`,
    );
    // Alert text should reference both #178 and Worked Example #17
    const alertBlob = result.alerts.join("\n");
    assert.match(alertBlob, /BuzzShield #178/);
    assert.match(alertBlob, /MAIN_THREAD_COMPLETE_RECOMMENDED/);
    assert.match(alertBlob, /Worked Example #17/);
  });

  await test("pipeline: empty manifest returns PASS + NONE (degenerate case)", async () => {
    const result = await detector.runPostflight({
      manifest: [],
      subagentText: "",
      subagentCompletedAt: null,
    });
    assert.strictEqual(result.overall, "PASS");
    assert.strictEqual(result.recommendation, detector.REC_NONE);
    assert.strictEqual(result.manifest_count, 0);
  });

  // ============================================================
  // FIELD-SHAPE CONTRACT — required fields on every result
  // ============================================================
  console.log("\n[Contract: result shape — required fields]");

  await test("contract: runPostflight result has full required field set", async () => {
    const manifest = JSON.parse(
      fs.readFileSync(
        path.join(FIXTURES_ROOT, "manifest-all-pass.json"),
        "utf8",
      ),
    );
    const subagentText = fs.readFileSync(
      path.join(FIXTURES_ROOT, "subagent-text-all-pass.txt"),
      "utf8",
    );
    const result = await detector.runPostflight({
      manifest,
      subagentText,
      subagentCompletedAt: null,
    });
    const required = [
      "detector",
      "version",
      "scanned_at",
      "subagent_completed_at",
      "manifest_count",
      "manifest_verdicts",
      "landing_verdict",
      "extras",
      "unclaimed",
      "counts",
      "overall",
      "recommendation",
      "alerts",
    ];
    for (const k of required) {
      assert.ok(
        Object.prototype.hasOwnProperty.call(result, k),
        `missing required key '${k}' in result: ${JSON.stringify(Object.keys(result))}`,
      );
    }
    // Per-verdict required fields
    const verdictRequired = [
      "path",
      "verdict",
      "bytes",
      "mtime",
      "claimed_in_text",
    ];
    for (const v of result.manifest_verdicts) {
      for (const k of verdictRequired) {
        assert.ok(
          Object.prototype.hasOwnProperty.call(v, k),
          `missing per-verdict key '${k}' in: ${JSON.stringify(v)}`,
        );
      }
    }
  });

  await test("contract: detector identifier is exactly 'buzzshield-178-postflight'", async () => {
    const result = await detector.runPostflight({
      manifest: [],
      subagentText: "",
    });
    assert.strictEqual(result.detector, "buzzshield-178-postflight");
    assert.strictEqual(result.version, "1.0");
  });

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log(`\n=== ${passed} passed, ${failed} failed ===`);
  if (failed > 0) process.exit(1);
  process.exit(0);
}

main().catch((err) => {
  console.error("FATAL:", err.stack || err);
  process.exit(2);
});
