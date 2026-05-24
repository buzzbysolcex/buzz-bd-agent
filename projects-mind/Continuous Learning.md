# CONTINUOUS LEARNING — Living Genius Brain Evolution

**Status:** CANONICAL — synthesized 2026-05-09 by Ogie + Claude (Opus 4.7) via Telegram War Room.
**Pairs with:** projects-mind/Master Strategy.md and projects-mind/Bug Bounty Genius Plan.md.

---

═══════════════════════════════════════════════════════════════════════════
CONTINUOUS LEARNING DIRECTIVE — Living Genius Brain Evolution
═══════════════════════════════════════════════════════════════════════════

Buzz must learn from EVERY scan, EVERY verdict, EVERY submission outcome. The pipeline gets smarter every day or it's not "Living Genius" — just running.

▓▓▓ THE 5 LEARNING LOOPS ▓▓▓

LOOP 1 — FINDING MEMORY (capture everything):
After every scan, write to /data/buzz/persistent/learning/findings/<scan-id>.json:

- Raw findings (L1d output)
- Skeptic verdicts with confidence
- Phase 4d in-context verdicts with reasoning
- Final classification (TP/FP/STRUCTURAL_LEAD/INFORMATIONAL)
- Target metadata (protocol, language, audit_count, code_age)
- Pipeline version + detector pack version

This is the training corpus. Every scan adds to it.

LOOP 2 — PATTERN MUTATION (when 3+ similar findings cluster):
Cron daily 06:00 UTC: scan-cluster-analyzer.js

1. Read last 30 days of findings
2. Cluster by attack signature similarity (same function shape, same modifier pattern, same state mutation class)
3. When cluster size >= 3 AND no existing pattern matches: PROPOSE NEW SUB-PATTERN
4. Write proposal to /data/buzz/persistent/learning/proposed-patterns/<date>-<hash>.json
5. War Room alert with summary
6. Ogie reviews → approve → auto-add to invariants.js OR reject → log rationale

This is how Pattern K-Q sub-patterns get DISCOVERED instead of designed.

LOOP 3 — FP SUPPRESSION (auto-tune from REJECT clusters):
Cron daily 06:30 UTC: fp-suppression-tuner.js

1. Read findings where verdict = FALSE_POSITIVE (Skeptic REJECT or Phase 4d REJECT)
2. Cluster by signature
3. When cluster size >= 5 with same signature: PROPOSE auto-suppression rule
4. Examples to learn from tonight:
   - 90 visibility-miss FPs across 4 deep scans → #117 HE-19 was the manual fix
   - 6 EIP-712 wrapper FPs across protocols → #104 should auto-emerge from this loop
   - Aave-fork periphery FPs → would auto-suppress
5. Auto-add suppression to skeptic.js after Ogie review
6. Brain note: brain/Architecture.md gets new "FP Suppression Rules" section auto-updated

LOOP 4 — CONFIDENCE CALIBRATION (outcome-driven):
Cron weekly Sunday 07:00 UTC: confidence-calibrator.js

1. Read outcomes ledger: which Skeptic-ACCEPTED findings became accepted submissions vs rejected
2. Compute true accuracy by Skeptic confidence band:
   - Conf 0.95+ : actual TP rate?
   - Conf 0.80-0.94 : actual TP rate?
   - Conf 0.65-0.79 : actual TP rate?
3. If a band's actual rate diverges >20% from confidence: RECALIBRATE
4. Adjust Skeptic prompt template OR threshold for AUTO/HIGH/CRITICAL tiers
5. Document calibration in brain/Doctrine.md

LOOP 5 — TARGET LEARNING (what works, what doesn't):
Cron monthly 1st 08:00 UTC: target-pattern-learner.js

1. Read all scans + outcomes for the month
2. Compute per-target-class metrics:
   - Mature audited protocols (Sky/Aave/Compound class): TP rate, avg verdict
   - Fresh code (<90 days): TP rate, avg verdict
   - Cosmos SDK targets (dYdX class): TP rate
   - Bridge protocols (Pattern H heavy): TP rate
   - L2 rollups: TP rate
3. Update target-scorer weights based on actual yield, not theoretical scoring
4. Write learnings to projects-mind/Target Class Performance.md (auto-generated)
5. Adjust Phase 1 hunting queue weighting

▓▓▓ BRAIN NOTE AUTO-EVOLUTION ▓▓▓

Beyond manual updates, brain notes get auto-enriched:

brain/Architecture.md — Auto-updated sections:

- "Pattern Detector Coverage" (sub-pattern count grows automatically)
- "FP Suppression Rules" (Loop 3 output)
- "Ground Truth Catalog Stats" (count by Pattern A-Q, by chain, by year)
- "Detector Pack Version" (version bumps on each tuning)

brain/Doctrine.md — Auto-appended:

- "Calibration Log" (Loop 4 outputs)
- "Target Class Yield" (Loop 5 outputs)
- New rules emerge from learnings, get codified here

projects-mind/Security Research.md — Auto-tracked:

- Live submission status (synced from outcomes ledger)
- Days-in-review per active report
- Verdict history

projects-mind/Pattern Catalog.md (NEW, auto-generated):

- Every approved sub-pattern with: detection signature, ground truth refs, false positive notes, calibration history
- This becomes Buzz's living encyclopedia

▓▓▓ CROSS-SESSION CONTINUITY ▓▓▓

Obsidian Mind already reads brain/ on session start. Add:

- /data/buzz/persistent/learning/SUMMARY.md — daily auto-generated 1-page state
- Format: "Last 7 days: X scans, Y findings, Z FP-suppressed, W new patterns proposed, V submissions in flight"
- Read on every session start (after brain notes)
- Buzz immediately knows: what's pending review, what just changed in detectors, what's queued

▓▓▓ THE LEARNING FLYWHEEL ▓▓▓

Scan → Memory → Cluster Analysis → Pattern Mutation → New Detector
Scan → Verdict → Outcome → Confidence Calibration → Better Skeptic
Scan → FP Pattern → Auto-Suppression → Cleaner Pipeline
Multiple Scans → Target Learning → Better Target Selection → More Real Bugs Found

Every scan is a training example.
Every submission outcome is a calibration signal.
Every FP cluster is a detector improvement.
Every TP is a pattern validation.

The pipeline that ran today IS NOT the pipeline that will run next week.

▓▓▓ IMPLEMENTATION ORDER ▓▓▓

Week 1 (parallel with Phase 0 cleanup):

- Loop 1 (Finding Memory) — passive capture, no analysis yet, just store
- Loop 2 (Pattern Mutation) cron skeleton — runs but only logs proposals, no auto-add yet

Week 2:

- Loop 3 (FP Suppression) — auto-tune visibility-miss + EIP-712 wrapper rules
- Loop 4 (Confidence Calibration) — first calibration run when ≥10 outcomes

Week 3:

- Loop 5 (Target Learning) — first pass, retroactive on May data
- Brain note auto-evolution active

Week 4:

- Pattern Catalog auto-generated
- SUMMARY.md daily output
- Full learning flywheel turning

▓▓▓ MEASUREMENT ▓▓▓

The learning is real if these metrics improve over 30 days:

- Sub-pattern count: 87 → 110+ (Loop 2 contributions)
- FP rate per scan: current ~50% → target <30% (Loop 3 contributions)
- Skeptic confidence accuracy: target 90%+ within 10% of actual (Loop 4)
- Submission acceptance rate: 0/9 → target 30%+ (Loop 5 better targeting)

If these don't move, the loops aren't actually learning. Audit and fix.

▓▓▓ STANDING RULE ▓▓▓

Add to brain/Doctrine.md:
"Buzz learns from every scan, every verdict, every submission outcome. The pipeline that runs today is not the pipeline that runs next week. Continuous learning is non-negotiable. If a finding class has been seen 3+ times: codify the pattern. If a verdict band miscalibrates >20%: recalibrate. If a target class consistently yields nothing: deprioritize. The Living Genius gets smarter every day or it's just running."

═══════════════════════════════════════════════════════════════════════════
Save this directive to projects-mind/Continuous Learning.md as canonical reference. Apply Loop 1 (Finding Memory) immediately — it's passive, no risk. Other loops phase in over 4 weeks. Bismillah.
═══════════════════════════════════════════════════════════════════════════
