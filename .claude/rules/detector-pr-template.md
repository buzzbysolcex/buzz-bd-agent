# Rule: Detector PR Template — End-to-End Field-Flow Unit Test

> Applies when: opening any PR that touches BuzzShield V6 detectors, hard-exclusion rules, prompt enrichers, or pipeline collect() field-forwarding.
> Authority: Ogie msg 6495 (May 9 2026, 11:15 UTC). Permanent rule.
> Origin: #90 + #117 verification gaps (see `/data/buzz/persistent/buzz-api/ground-truth/implementation-verification-gaps.md`).

---

## THE RULE

Every PR that adds or modifies a detector / hard-exclusion rule / prompt enricher / Skeptic pre-filter MUST include a unit test that walks the new field END-TO-END from emit-site through every transform layer down to the consumer that acts on it.

Module-local unit tests pass while the feature stays inert end-to-end. That is exactly how #90 (HE-03b lib/ exclusion) and #117 (HE-19 visibility-miss prefilter) shipped task-marked-complete but were never wired through the upstream emit + downstream collect() layers. Symbiotic regression 2026-05-09 caught both, costing 30 min of mid-flight debugging.

---

## PR CHECKLIST (REQUIRED)

Every detector PR must include in the description:

- [ ] **Emit-site change** — the layer (e.g., `buzzshield-layer1-deep.js` Phase 4b) that produces the new field
- [ ] **Transform-layer changes** — every place between emit-site and consumer that copies, normalizes, or rebuilds the finding object (e.g., `buzzshield-v6-pipeline.js` `collect()` function)
- [ ] **Consumer-site change** — the layer (e.g., `buzzshield-skeptic.js` `applyHardExclusions()`) that reads the new field and acts on it
- [ ] **End-to-end unit test** — one test that exercises ALL THREE points (emit → transform → consume) on a synthesized target
- [ ] **Regression target** — name the prior FP class this PR addresses + the target where it can be validated
- [ ] **Regression scan plan** — which target the PR will be validated on post-merge (e.g., Symbiotic, Variational, Sky lockstake)

---

## END-TO-END UNIT TEST PATTERN

```js
const { applyHardExclusions } = require("./buzzshield-skeptic.js");
const { runLayer1Deep } = require("./buzzshield-layer1-deep.js");
const { collectIntoPipelineShape } = require("./buzzshield-v6-pipeline.js");

// 1. Synthesize a candidate target with the precise pattern the
//    detector should fire on. Write to /tmp/test-target/.
const target = synthesizePatternTargetFor(detectorUnderTest);

// 2. Run layer1-deep against it.
const deepOutput = runLayer1Deep(target);

// 3. Confirm the new field IS in deepOutput at the expected emit phase.
assert(
  deepOutput.phases["4_paired_analysis"]["4b_symmetric_paths"][0]
    .reverse_mutability === "view",
  "Phase 4b must emit reverse_mutability for HE-19 to fire",
);

// 4. Run pipeline collect(). Confirm field IS forwarded into pipeline shape.
const pipelined = collectIntoPipelineShape(deepOutput);
assert(
  pipelined[0].reverse_mutability === "view",
  "Pipeline collect() must forward reverse_mutability",
);

// 5. Run Skeptic pre-filter. Confirm rejection fires with the expected rule_id.
const verdict = applyHardExclusions(pipelined[0]);
assert(
  verdict.rejected && verdict.rule_id === "HE-19",
  "HE-19 hard-exclusion must fire on reverse_mutability=view",
);
```

Each layer transition (emit → collect → consume) is a potential field-stripping point. The test must walk every transition for the new field. If any layer drops the field, the detector is inert — exactly the gap pattern that #90 + #117 exhibited.

---

## REGRESSION VALIDATION (POST-MERGE)

Every detector PR must run a regression scan on a known target where the prior FP class was confirmed, AFTER merge to main. Report:

- Pre-PR baseline: how many of the FP class survived Skeptic
- Post-PR result: how many of the FP class survived Skeptic
- Gap: zero false positives vs target = pass; any survivor = follow-up tuning

Example (Symbiotic 2026-05-09 regression, validates #122 HE-19):

```
Pre-PR (baseline scan-2026-05-09-symbiotic-core):
  L1d-1..5 → all FP_visibility_miss → all ACCEPTed by qwen3 @ 0.95

Post-PR (regression scan-2026-05-09-symbiotic-regression):
  L1d-1..5 → all REJECTed by HE-19 hard-exclusion @ 0.95
  Pre-filter drops: 5 (no LLM cycles burned)

Gap: zero. PR validated.
```

---

## ANTI-PATTERN: TASK-MARKED-COMPLETE WITHOUT END-TO-END TEST

The two gaps captured in `implementation-verification-gaps.md`:

| ID   | Symptom                                                                                                  | Root cause                                                                                                                                                                                                      |
| ---- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #90  | HE-03b lib/ exclusion task marked done May 7. Symbiotic Day 9 still surfaced 11 lib/ findings.           | The constant `HE_03B_ALWAYS_EXCLUDE_DIRS` was specified in rule v2.5 but never declared in code.                                                                                                                |
| #117 | HE-19 prompt template enriched with `visibility=` field. Symbiotic Day 9 L1d-1..5 still ACCEPTed @ 0.95. | Phase 4b emit didn't write `reverse_mutability` field. Even after fix, pipeline collect() rebuilt the finding object with hardcoded field copying that didn't include the new field. Two-layer field-stripping. |

Both would have been caught by an end-to-end unit test that exercised emit → collect → consume on a synthesized target.

---

## WHEN THIS RULE DOES NOT APPLY

- Pure prompt-template tweaks that only touch the LLM prompt string and rely on existing fields (no new emit needed)
- Refactors that don't introduce new fields or new pre-filter rules
- Documentation-only changes
- Test additions for already-shipped detectors

If unsure: ask in War Room before opening the PR.

---

## REFERENCE

- `/data/buzz/persistent/buzz-api/ground-truth/implementation-verification-gaps.md` — Failure-mode log
- `audit-methodology-v2.md` v2.4 — L3 Consensus Safety-Net (related "rescue HIGH/CRITICAL findings dismissed by consensus" pattern, similar logic)
- `feedback_speedrunner_retired_for_audits.md` — Toly Percolator rule on full pipeline discipline (related "skipping a layer = unrecorded reasoning = no audit trail")

---

_Rule: detector-pr-template | v1.0 | 2026-05-09 (Ogie msg 6495)_
