# Brain Contradictions Register

**Purpose:** Catalog every pair of doctrines / patterns / rules in Buzz's brain compound that could produce conflicting decisions on the same target. Resolution proposals require operator approval.

**Authority:** Created 2026-05-26 as Part 1 of Brain Self-Correction Layer rollout. Maintained by every Gate 1 brain-proposal cycle and at every doctrine commit that touches an existing doctrine.

**Status legend:**

- **UNRESOLVED** — conflict identified, no resolution applied yet
- **SCOPED** — resolution applied via scope-limit; both rules retained, governed by an explicit `applies-when` boundary
- **RESOLVED** — one rule deprecated, merged, or amended to eliminate the conflict
- **ESCALATE** — operator decision required before any resolution can be applied

**Discovery method.** For each pair: read both rule statements as currently written. Construct a hypothetical target T that satisfies the trigger of both rules. Compare outputs. If the outputs are procedurally compatible (e.g., one prescribes a verification step, another prescribes a downstream submission gate), there is NO contradiction. If the outputs are mutually incompatible (PROCEED vs FORECLOSE, AUTO-DISPATCH vs SURFACE-TO-OPERATOR, REJECT vs ACCEPT at same confidence), the contradiction is logged below.

**Section organization (v1.4 four-pillar extension, 2026-05-27):** Entries 1-16 are Pillar 4 (bug research — original Self-Correction Layer scope). Entries from #P1-1 onward are organized by pillar:

- **#1-#16** — P4 (Pillar 4 — bug research)
- **#P1-N** — P1 (Pillar 1 — token scoring) contradictions
- **#P2-N** — P2 (Pillar 2 — HSaaS / Content) contradictions
- **#P3-N** — P3 (Pillar 3 — corpus) contradictions
- **#CROSS-N** — cross-pillar contradictions (rules from ≥2 pillars conflict)

When adding a new contradiction, place it under the matching section (P1/P2/P3/P4/CROSS) and number within that pillar's sequence.

**Sources read end-to-end for v1.0:** `brain/Doctrine.md` (2631 lines, Doctrines #19–#37 + 23+ worked examples + Priority #0–#4 hierarchy), `brain/Patterns-Defense-Classes.md` (DC-1..DC-20 + CANDIDATE-A..R + META-DOCTRINE Two-Axis Donation-Channel Test + sub-patterns), `brain/External-Frameworks.md` (Meta-LLM Charter / Anthropic Glasswing / 0xTeam lending+stablecoin / TU-Berlin agent-OS / Single-Firm-Continuous-Audit Sub-Pattern / Selective-Coverage Defense Asymmetry), `brain/Hyperactive-Formula.md` (10-step loop + v1.1 ZERO OPTION MENUS appendix), `.claude/rules/standing-intake-protocol.md` (6-step intake pipeline), `.claude/rules/aibtc-bm-3source-standard.md` (signal source standard), `.claude/rules/tweet-on-score.md` (v2.2 liquidity floor), and structural section-headers of `brain/Cross-Domain-Fragility-Laws.md` + `brain/Watchlist-Candidate-Crossmap.md`. `brain/Methodology-Doctrine.md` was listed in inputs as an alias of Doctrine.md; file does NOT exist at that path (verified 2026-05-26). Doctrine.md is canonical.

---

## #1 — Multi-firm-saturation discount vs Single-firm-continuous-audit discount

**Rule A** (source: `brain/Doctrine.md` §"Doctrine #27 sub-rule — Sustained Multi-Firm Audit Cadence Hard Discount"): When a target's audit log reveals **≥30 audit reports over ≥18 months of sustained cadence (multi-firm, facet-by-facet, with audit-AHEAD-of-HEAD or audit-mirror-of-HEAD timing)**, apply **maximum 0.4× Doctrine #27 discount** AND skip deep-Gate-2-trace by default. Brain-compound is the primary value vector; FORECLOSURE-RECEIPT is the default verdict.

**Rule B** (source: `brain/External-Frameworks.md` §"Single-Firm-Continuous-Audit Sub-Pattern"): "Doctrine #27 [as originally calibrated] assumes audits come from DIFFERENT firms, applying different threat models, so each marginal audit reduces the residual attack surface. The single-firm-continuous model violates this assumption: **One firm = one threat model.** ... Findings cluster within the firm's lens, not across the codebase." Proposed calibration tier: single-firm-continuous = **0.5–0.7× (lighter discount; one-lens coverage)**, distinct from multi-firm-saturated 0.2–0.4×.

**Conflict scenario:** A target with 30+ OpenZeppelin audits over 18+ months (e.g., a deeply-engaged Risk Labs UMA / Across V3-class protocol, where ALL audits came from one firm). Rule A would foreclose by default at ≤0.4× multiplier. Rule B says one-lens coverage warrants a LIGHTER discount (0.5–0.7×) — meaning EV stays higher, Gate 2 dispatch is more justified.

**Proposed resolution:** SCOPE-LIMIT Rule A to "multi-firm" only. External-Frameworks already calls Doctrine #27's calibration tiers PENDING 3rd anchor (Risk Labs UMA + Across V3 are 2 anchors so far); both are explicitly the same auditor. The sub-rule in Doctrine #27 needs an explicit "multi-firm" qualifier added to its trigger. The single-firm-continuous tier is the canonical 3rd-anchor-pending refinement.

**Resolution detail:** Update Doctrine #27 sub-rule statement to read: "When a target's audit log reveals ≥30 audit reports over ≥18 months of sustained cadence **AND multi-firm coverage (≥3 distinct audit firms)** AND audit-AHEAD-of-HEAD or audit-mirror-of-HEAD timing, apply maximum 0.4× discount." Single-firm-continuous substrates explicitly fall under External-Frameworks single-firm-continuous tier (0.5–0.7×). When the 3rd single-firm-continuous anchor lands, promote that tier into Doctrine #27 as a parallel sub-rule with its own multiplier band.

**Status:** SCOPED (resolution proposal pending operator review).

---

## #2 — Hyperactive Formula deterministic dispatch vs Standing-Intake "research-first" surface-to-operator

**Rule A** (source: `brain/Hyperactive-Formula.md` §"v1.1 APPENDIX — ZERO OPTION MENUS"): "ZERO A/B/C menus. ZERO 'your call.' ZERO 'next-step menu.' ZERO 'awaiting direction.' ZERO 'operator-decide.' ... Pick the highest-EV next action per Formula step priority. Execute it. Surface result. Continue loop." Only six categories interrupt the loop (operator-sent program, "stop X do Y," Gate 4-5 submission paste, public-post approval, partnership relay, server-root access).

**Rule B** (source: `.claude/rules/standing-intake-protocol.md` §"STEP 4 — QUEUE DECISION"): The queue-decision matrix prescribes "**Research-first Gate 1 — surface to operator for greenlight**" for any MEDIUM overlap + $500K+ bounty cap target. Also: "If unsure where a new program fits, run Steps 1–3 anyway and **surface to War Room with the EV table. Operator decides the queue position**."

**Conflict scenario:** A new bounty program arrives via operator (e.g., a $1M Cantina contest with MEDIUM brain overlap — 2 lens hits, partial scope-fit). Rule A says: deterministic dispatch — execute Gate 1 as the formula's Step 3 work-unit, surface result. Rule B says: SURFACE-TO-OPERATOR with EV table, await greenlight, do not auto-dispatch.

**Proposed resolution:** SCOPE-LIMIT Rule A. Hyperactive Formula's "no decision points" applies to dispatch ORDERING within an established queue, not to the act of admitting a target to the queue in the first place. Standing-Intake Step 4 governs the queue-admission decision; once a target is admitted, the formula's deterministic dispatch governs ordering.

**Resolution detail:** Amend Hyperactive Formula §"WHAT REQUIRES OPERATOR OVERRIDE" to add a 7th category: "Standing-Intake Step 4 queue-admission decisions for MEDIUM overlap + $500K+ targets — operator greenlight required before target enters Step 3 queue (after greenlight, formula dispatches deterministically)." HIGH overlap + any cap auto-admits (per Step 4 matrix); LOW overlap + any cap auto-watchlists. The narrow surface-to-operator band is MEDIUM + ≥$500K only.

**Status:** SCOPED (resolution proposal pending operator review).

---

## #3 — Tweet-on-score $50K liquidity floor vs Flagged/Caught "post same day" override

**Rule A** (source: `.claude/rules/tweet-on-score.md` §"LIQUIDITY FLOOR (v2.2 STANDING RULE — Ogie msg 6737)"): "Score tweet posting requires minimum $50,000 liquidity in target token. Below threshold: score logs to public leaderboard (`buzzbd.ai/scores`), **NO Twitter post**. **Hold regardless of band (Watch / High / Flagged / Calibration).**" Hard rule from v2.2 onward; "**NO exceptions, $50K floor is hard.**"

**Rule B** (source: `.claude/rules/tweet-on-score.md` §"Flagged / Caught" template): "PRIORITY: Post IMMEDIATELY — don't wait" — and an explicit parenthetical: "**(NOTE: Flagged/Caught post-collapse logic may have separate floor — operator decides per-case. v2.2 baseline $50K floor applies unless explicitly waived.)**"

**Conflict scenario:** A token Buzz scored 60/100 in March on $30K liquidity (below floor — no tweet at scoring time, log-only). In May, the token rugs publicly with $1M+ damage. Rule A says HOLD regardless of band — "regardless of NFA framing." Rule B says PRIORITY: post immediately — but admits the floor still applies unless explicitly waived.

**Proposed resolution:** ESCALATE. The rule text itself flags the resolution as operator-decides-per-case. The contradiction is genuinely unresolved at brain level and intentionally so — `tweet-on-score.md` v2.2 left it as an operator hot-seat decision. The conflict will recur on every actual rug catch where the liquidity at scoring time was sub-floor.

**Resolution detail:** Codify the operator-decides exception as a structured waiver path: (a) the Flagged/Caught draft is composed and held; (b) operator pings approve/deny in War Room with a documented reason; (c) approved waivers are logged to `data/buzz/persistent/audits/sub-floor-waivers.json` for quarterly review. The structure removes the "operator decides per-case" ambiguity by making the decision explicit, documented, and reviewable.

**Status:** ESCALATE (resolution proposal requires operator decision on waiver framework adoption).

---

## #4 — Doctrine #34 STRONG-composition "continued surveillance" vs Doctrine #27 J corollary auto-FORECLOSURE-RECEIPT

**Rule A** (source: `brain/Doctrine.md` §"Doctrine #34 enrichment — Day 26 multi-anchor expansion → Composition Multiplier Strength axis"): "**STRONG: 5+ fix-commits per 100 commits** (Stacks sBTC = ~19% = STRONG, given 39 fix candidates in 200 commits). STRONG-composition substrates **warrant continued surveillance even when EV is medium-low** — the bug-discovery rate outpaces audit-coverage extension, so the EV ceiling is structurally floor-raised regardless of nominal bounty cap."

**Rule B** (source: `brain/Doctrine.md` §"Doctrine #27 J corollary — Auto-FORECLOSURE-RECEIPT trigger"): "If a target satisfies ALL THREE — `N_audits ≥ 15`, `N_submissions ≥ 100`, `P(no-paid-Critical-in-last-6mo) ≥ 0.85` — the Standing-Intake Step 5 detector rotation can be **SHORT-CIRCUITED to FORECLOSURE-RECEIPT** at Gate 1 pre-detector-rotation. ... operator override required to override default verdict."

**Conflict scenario:** Stacks sBTC (the canonical Doctrine #34 STRONG anchor). 4 audit firms + 2 attackathons + Hypernative + embedded security + Staking Defense League + Immunefi bug bounty — almost certainly satisfies ≥15 audits + ≥100 submissions + low-Critical-in-6mo. Rule A says: continued surveillance, EV floor-raised, do not foreclose. Rule B says: auto-FORECLOSURE-RECEIPT, skip detector rotation.

**Proposed resolution:** SCOPE-LIMIT Rule B (J corollary). Add a STRONG-composition exemption clause: "J corollary does NOT short-circuit Step 5 detector rotation when Doctrine #34 STRONG-composition tier fires on the same target. STRONG-composition's structural bug-discovery-rate-outpaces-audit-coverage signal overrides J's saturation foreclosure default."

**Resolution detail:** Update Doctrine #27 J corollary §"Where this DOES NOT apply" with a new bypass condition: "**Doctrine #34 STRONG-composition tier** (≥5 fix-commits per 100 commits in last 365d) — STRONG-composition substrates require continued surveillance regardless of audit-saturation tier. Run full Step 5.6 detector rotation; promote any Gate 2 candidate even from heavily-audited surface."

**Status:** SCOPED (resolution proposal pending operator review). High-stakes — applies to Stacks sBTC, Stargate-class, Wormhole-class, any actively-patched mature bridge.

---

## #5 — Step 1 PROFILE Sherlock-FINISHED preflight halt vs Doctrine #37 Sub-Type B "repo-frozen-product-live PROCEED"

**Rule A** (source: `.claude/rules/standing-intake-protocol.md` §"STEP 1 — PROFILE Platform STATUS preflight"): "**Sherlock** — fetch contest page; STATUS=FINISHED means contest is closed (judging done, no live submission path). ... Halt-at-Step-1 saves ~5-15 min of subagent work + clone disk."

**Rule B** (source: `brain/Doctrine.md` §"Doctrine #37 CANDIDATE Sub-Type B — Audited-and-Frozen-but-Product-Live"): "**Trigger:** `days_since_push > 365` AND Immunefi scope is **branch-pinned (`master`/`main`)** AND `README.md` shows recent on-chain deployments off the SAME contracts. **Action: PROCEED with sharpened post-audit-composition lens (Doctrine #34).** New chain integrations / yield extensions / product features that compose with the frozen base substrate ARE the highest-EV surface."

**Conflict scenario:** A protocol with a Sherlock contest STATUS=FINISHED (closed, judging done) BUT product is live on mainnet, actively shipping to new chains every month against the same contract bytecode. Rule A says halt at Step 1. Rule B says PROCEED with composition lens — composition surface is the highest-EV slice.

**Proposed resolution:** SCOPE-LIMIT Rule A. The Sherlock-FINISHED preflight halt is correct when the goal is contest-submission revenue, but wrong when the goal is brain-compound + composition-surface analysis. Rule A already has an escape hatch ("If FINISHED but operator wants post-audit-HEAD-drift analysis, surface that as a Step 4 queue decision") — but does not auto-route Doctrine #37 Sub-Type B classification.

**Resolution detail:** Amend Rule A: "Sherlock STATUS=FINISHED triggers Step 4 queue decision instead of Step 1 halt **IF** Doctrine #37 Sub-Type B classification triggers (repo > 365d frozen AND product is live AND post-audit composition surface exists on the same contracts). Auto-route to Doctrine #37.B PROCEED-with-composition-lens default. Operator can override back to halt if brain-compound EV is too low."

**Status:** SCOPED. The two rules can coexist with this explicit auto-route.

---

## #6 — Doctrine #34 post-audit composition multiplier (post-audit modules) vs Doctrine #32 v1.1 cycle-2 filter (audit_age ≤180 preference)

**Rule A** (source: `brain/Doctrine.md` §"Doctrine #34 — Post-Audit Composition Multiplier"): "When a protocol layers a NEW external system on top of an audited codebase AFTER the audit window closes, the cumulative attack surface should be re-audited at parity with the original review depth — NOT treated as a thin extension. ... `P(finding)_post_audit_module = P(finding)_unaudited × 1.0` (no audit-coverage discount applies)." High-EV trigger.

**Rule B** (source: `brain/Doctrine.md` §"Doctrine #32 v1.1 PERMANENT calibration"): Cycle-2 PASS filter is `audit_cadence_months < 12 AND (dangerous_area_changes_365d >= 10 OR audit_age_days <= 180)`. Targets with FRESH audits (≤180d) are PREFERRED cycle-2 dispatch — the filter is intentionally optimized for recently-audited substrate where the Clara lens stack would find binding surface.

**Conflict scenario:** A protocol audited 60 days ago (fresh — passes v1.1 by `audit_age_days ≤ 180`) that has ALSO shipped a new module 30 days ago (post-audit composition surface). Rule A treats the new module as un-audited, full P(finding) multiplier. Rule B prefers the target as cycle-2 PASS because audit is fresh. Both produce ELEVATED dispatch priority — they agree on direction. But on a target where audit is OLD (e.g., 12 months) AND new module shipped post-audit, Rule A says ELEVATED dispatch (composition multiplier fires), Rule B says cycle-2 FAIL (audit too old, `dangerous_area_changes_365d` may not exceed 10 if changes were minor) — and per Doctrine #32 v1.0/v1.1 base, cycle-2 FAIL forecloses by default.

**Proposed resolution:** SCOPE-LIMIT Rule B. Add an override: "Doctrine #34 firing (post-audit composition surface present) overrides Doctrine #32 cycle-2 FAIL verdict. The new-module surface is the active substrate even when audit age exceeds 180 days."

**Resolution detail:** Amend Doctrine #32 v1.1 §"Where v1.1 STILL does not apply": add bypass condition "**Doctrine #34 composition multiplier fires** (new module added after last audit window) — cycle-2 FAIL does NOT foreclose; dispatch against the post-audit composition surface even when base substrate is cycle-2 FAIL." This makes the two rules cooperative: cycle-2 base filter governs base substrate; Doctrine #34 governs composition surface; they target different layers of the same target and the verdicts compose.

**Status:** SCOPED.

---

## #7 — Step 5.6 "5-target quality checklist MANDATORY (any missing class = violation)" vs Doctrine #37 A "AUTO-FORECLOSE pre-clone"

**Rule A** (source: `.claude/rules/standing-intake-protocol.md` §"STEP 5.6" + ENFORCEMENT): "Every Gate 1 surface map MUST touch all 5 target-classes [Withdrawals/Redemptions, Liquidation+Oracle, Deposit/Mint Shares, External Calls, Admin/Upgrade]. If any are missing, the surface map is incomplete and the Gate 1 fails its quality check. ... Skipping Step 5.6 (5-target quality checklist) = incomplete surface map = violation."

**Rule B** (source: `brain/Doctrine.md` §"Doctrine #37 CANDIDATE Sub-Type A — Audited-and-Frozen-and-Scope-Frozen"): "**Trigger:** `days_since_push > 365` AND Immunefi scope is **SHA-pinned to old commit** AND new features explicitly OFF scope. **Action: AUTO-FORECLOSE pre-clone.** Lens-by-lens skipped. ... Saves ~30-40 min per A-class re-intake (full Gate 1 → 5-min foreclosure)."

**Conflict scenario:** A CoW-Protocol-class target (Doctrine #37 Sub-Type A canonical anchor): 1844 days frozen, SHA-pinned scope, ≥20 audits. Rule A says: Gate 1 must touch all 5 target classes (Withdrawals + Liquidation + Deposit + External Calls + Admin/Upgrade) — a pure aggregator-style settlement core has minimal Admin/Upgrade surface and effectively zero Liquidation surface. Filing all 5 classes = manufactured analysis. Rule B says: skip the lens-by-lens entirely, AUTO-FORECLOSE.

**Proposed resolution:** SCOPE-LIMIT Rule A. The 5-target quality checklist is a defense against incomplete surface mapping on FRESH substrate. Doctrine #37 A targets are NOT surface-mapped at all — they are foreclosed pre-clone. The 5-target checklist does not apply to pre-clone foreclosure verdicts.

**Resolution detail:** Amend Step 5.6 enforcement: "The 5-target quality checklist applies to Gate 1 surface maps that proceed past the clone-and-inventory stage. **Doctrine #37 Sub-Type A AUTO-FORECLOSE-PRE-CLONE verdicts are exempt** — the foreclosure rationale (frozen scope + audit saturation + SHA-pinned) is itself the surface-map output. Brain-compound proposal documents the foreclosure rationale; no per-class enumeration needed."

A secondary refinement applies to pure-DEX / pure-aggregator / pure-router targets even when NOT Doctrine #37 A: "When a target has NO admin/upgrade surface (e.g., immutable settlement core), filing 'Admin/Upgrade: NONE (immutable; verified via grep <terms>)' satisfies the checklist; absence of class is itself a documented observation."

**Status:** SCOPED.

---

## #8 — R8 `[ASSUMED]` evidence tag vs Hyperactive Formula no-decision-points + Doctrine #30 grep-check primitive

**Rule A** (source: `.claude/rules/standing-intake-protocol.md` §"R8 Calibrated Reporting" + `brain/External-Frameworks.md` §"ADOPTED — R8 Calibrated Reporting"): `[ASSUMED]` = "inferred from architecture / surrounding context / documentation (NOT code-confirmed; explicit signal that the reporter is reasoning architecturally and may be wrong)." Allowed at Gate 1 surface map per-claim and at Gate 2 finding per-claim. Adopted from entropyvortex Meta-LLM Charter (Ogie msg 7555). R8 tags do NOT block submission — they grade evidence base.

**Rule B** (source: `brain/Doctrine.md` §"Doctrine #30 — Lens-Overreach-Without-Source-Verify"): "The R8 grade system (`[EXECUTED]` / `[INSPECTED]` / `[ASSUMED]`) is the defense — but only if applied honestly. A claim that should be `[ASSUMED]` (architectural reasoning) was tagged `[INSPECTED]` (source-confirmed) ... Sub-step 5.4 PRIMITIVE-GREP CHECK: For each lens applied (DC-N or CANDIDATE-X): Run: `grep -r "<primitive_terms>" <scope_paths>`. **If empty: DO NOT generate candidate row.** Lens does not apply."

**Rule C** (source: `brain/Hyperactive-Formula.md` v1.1): Deterministic dispatch, zero option menus, "Pick the highest-EV next action per Formula step priority. Execute it." No surface-to-operator on internal work.

**Conflict scenario:** A Gate 1 lens application produces a candidate finding where the lens narrative is structurally sound but the primitive-grep check returns empty (the protocol does not have the surface the lens names). Rule A says: tag the claim `[ASSUMED]`, proceed to file the row, submission grading happens at Skeptic/Gate 2. Rule B says: DO NOT generate the candidate row at all; empty grep = lens does not apply. Rule C says: keep moving, deterministic dispatch.

**Proposed resolution:** RESOLVED via doctrine ordering. Doctrine #30's PRIMITIVE-GREP CHECK gates the generation of a candidate row at Step 5.4 (between brain-lens application and 5-target checklist). R8 tags govern the *content* of claims that survive the grep check — not the *existence* of the candidate row itself. The hierarchy: Step 5.4 PRIMITIVE-GREP CHECK fires FIRST → if empty, candidate row never gets drafted (no R8 tag question). If hit, candidate row drafts with per-claim R8 tags. Hyperactive Formula's deterministic dispatch operates inside this verified-candidate space, not bypassing it.

**Resolution detail:** No rule change needed — the resolution is the ordering already present in Doctrine #30 (PRIMITIVE-GREP CHECK is sub-step 5.4, before candidate-row drafting). Document the ordering explicitly in the Standing-Intake `STEP 5 — GATE 1 EXECUTION` section: "5.4 PRIMITIVE-GREP CHECK runs BEFORE candidate-row drafting. If grep returns empty, the lens does not apply and no candidate row is generated regardless of R8-tag potential. R8 tags govern only claims that survive 5.4."

**Status:** RESOLVED (ordering codification — no rule deletion or merge needed). Documentation update recommended for clarity.

---

## #9 — Doctrine #29 v1.1 two-sided MIN-cap as sufficient defense vs DC-12 sub-7 wrapper-staleness defense triad mandatory

**Rule A** (source: `brain/Doctrine.md` §"Doctrine #29 v1.1 amendment — Two-Sided MIN-Cap Defense"): "When BOTH deposit and withdraw legs implement their respective side of the MIN-cap pattern, the protocol does NOT need a separate `VaultReentrancyLib.ensureNotInVaultContext` defense (Pattern D defense (a)). The two-sided MIN-cap IS Pattern D defense (b), **architecturally complete**."

**Rule B** (source: `brain/Patterns-Defense-Classes.md` §"DC-12 sub-7 wrapper-strips-staleness-from-feed" + "Contrastive Anchor Pair — DC-12 sub-7 CLEAN baseline"): "Future detector rotations targeting [oracle-consuming protocols] can use the Euler+Reserve 2-anchor reference to validate candidate wrapper-implementations. Match against BOTH anchors structurally: (1) `latestRoundData()` not `latestAnswer()`; (2) `answeredInRound >= roundId`; (3) per-feed staleness buffer; (4) reject `answer <= 0`; (5) try/catch with explicit fallback." 5/5 required for CLEAN.

**Conflict scenario:** An Olympus BLVaultLido-class Balancer-LP-wrapping protocol with two-sided MIN-cap defense (Rule A satisfied) but using a Chainlink feed wrapper that consumes `latestAnswer()` instead of `latestRoundData()` (Rule B sub-rule 1 fails — sub-7b flavor). Rule A says: structurally complete, FORECLOSURE-RECEIPT verdict. Rule B says: 4/5 sub-rules at best, DIRTY canonical pattern — flag as Gate 2 candidate.

**Proposed resolution:** SCOPE-LIMIT both. Rule A's "architecturally complete" claim is bounded to *read-only reentrancy on pool reserves* (the specific Pattern D defense (b) Balancer V2 class). It does NOT foreclose oracle-feed-side staleness, because two-sided MIN-cap depends on the oracle returning a fresh price — if the oracle wrapper strips staleness, the MIN-cap is computing against a stale `expectedAsset` and the conservative-bounding property no longer holds.

**Resolution detail:** Amend Doctrine #29 v1.1 amendment statement: "The two-sided MIN-cap is architecturally complete for **read-only reentrancy on Balancer/Curve pool reserves** (Pattern D defense (b)). Oracle-feed staleness defense (DC-12 sub-7 wrapper triad) is a separate layer and remains required. A protocol with two-sided MIN-cap + DC-12 sub-7 DIRTY wrapper is still vulnerable — the MIN-cap protects against pool-reserve manipulation but propagates oracle-side staleness directly into the conservative bound." Document Olympus BLVaultLido's oracle-wrapper status as a Gate 1 follow-up before granting FORECLOSURE-RECEIPT on the parent finding.

**Status:** SCOPED. Operator review recommended — the two-sided MIN-cap promotion was already operator-approved (Ogie msg 7846); this scope refinement preserves the promotion and clarifies its boundaries.

---

## #10 — First-Submission Anchoring HOLD-30d vs Hyperactive Formula Step 1 SUBMIT NOW

**Rule A** (source: `brain/Doctrine.md` §"First-Submission Anchoring"): "When we have a clean MEDIUM ready BUT a HIGH+ candidate is plausibly within 7-14 days from active workstreams, **HOLD the MEDIUM and submit as a paired package alongside the HIGH+** when it lands. Hold limit: 30 days."

**Rule B** (source: `brain/Hyperactive-Formula.md` §"STEP 1 — CHECK SUBMISSION QUEUE"): "If paste-ready submission exists AND rate-limit window is open AND no platform gate blocks: Pre-flight verify ... Alert operator 'SUBMIT NOW' with link + window. Continue to Step 2 while waiting for paste."

**Conflict scenario:** A clean MEDIUM is paste-ready, the rate-limit window opens, no platform gate blocks — Rule B says ALERT SUBMIT NOW. Rule A says HOLD if HIGH+ workstream is plausibly within 7–14 days.

**Proposed resolution:** RESOLVED via "platform gate" interpretation. Hyperactive Formula Step 1's "no platform gate blocks" condition can be read to include strategic-hold gates (First-Submission Anchoring is a strategic hold, not a platform gate, but functionally blocks the submission for the same dispatch-decision purpose). The explicit reading should be: "no platform gate blocks **AND no strategic-hold gate (e.g., First-Submission Anchoring, Doctrine #19 paired-submission strategy) is active**."

**Resolution detail:** Amend Hyperactive Formula §"STEP 1 — CHECK SUBMISSION QUEUE" to add: "Pre-condition for SUBMIT NOW alert: paste-ready exists AND rate-limit window open AND no platform gate blocks AND **no strategic-hold gate active per First-Submission Anchoring (Doctrine, Worked Example #13) or Doctrine #19 paired-submission strategy**. If strategic hold is active, log to held-submissions ledger; do not alert operator unless 30-day hold-limit approaches."

**Status:** RESOLVED via condition expansion. First-Submission Anchoring's HOLD list is a documented input to Step 1 dispatch gating.

---

## #11 — Doctrine #36 substrate-coverage floor (P(finding) ≤ 0.01) vs Standing-Intake Step 4 "HIGH overlap = Immediate Gate 1"

**Rule A** (source: `brain/Doctrine.md` §"Doctrine #36 CANDIDATE — Substrate-Coverage Gate"): "When Buzz's detector pack has ZERO mechanical coverage for a target substrate (no AST walker, no Layer 1 deep-analyzer for the language, no semgrep ruleset binding), apply a floor `P(finding) ≤ 0.01` in Step 3 EV calculation."

**Rule B** (source: `.claude/rules/standing-intake-protocol.md` §"STEP 4 — QUEUE DECISION"): "HIGH overlap (3+ direct lens hits, scope-fit obvious) + $500K+ bounty cap → **Immediate Gate 1** — preempt other work if highest EV in queue."

**Conflict scenario:** A Cosmos-SDK Go target like dYdX V4 (substrate-blind per Doctrine #36) with HIGH brain overlap (DC-7, DC-9 sub-2, DC-9 sub-4, CANDIDATE-L all map onto Cosmos consensus + multi-signer aggregation layers) + $5M Cantina cap. Rule A says: P(finding) capped at 0.01 → EV ≈ $5M × 0.01 × 0.5 × 1.0 = $25K, MAYBE below Immediate Gate 1 threshold depending on per-finding EV bar. Rule B says: HIGH overlap + $500K+ = Immediate Gate 1. The two rules disagree on whether to dispatch.

**Proposed resolution:** SCOPE-LIMIT Rule B. Rule B's queue-decision matrix assumes the EV calculation produces a meaningful number. When Rule A's P(finding) floor fires, the EV reflects the substrate-coverage reality — the target is not dispatch-ready even if brain-overlap is HIGH on paper, because the lenses cannot bind without the detector substrate.

**Resolution detail:** Amend Standing-Intake Step 4 matrix to gate "Immediate Gate 1" on the EV calculation post-Doctrine-#36-floor: "HIGH overlap + $500K+ → Immediate Gate 1 **IF post-floor EV ≥ $50K**; otherwise route to Gate 1 ONLY AFTER detector pack for the substrate is built (Hyperactive Formula Step 5 prerequisite)." This makes Doctrine #36 the gating constraint upstream of the queue-decision matrix.

**Status:** SCOPED.

---

## #12 — Cap Sherlock anchor: Doctrine #27 J auto-FORECLOSURE-RECEIPT vs Doctrine #34 post-audit composition multiplier on EigenLayer stack

**Rule A** (source: `brain/Doctrine.md` §"Doctrine #34 — Post-Audit Composition Multiplier") — Canonical anchor for Cap Sherlock: "Cap contest #990 audited at `0a57fbf` (2025-07-24), HEAD at `7254ed0` (2026-04-29) = 9-month post-audit window. EigenLayer stack (EigenServiceManager 547 LOC + EigenAgentManager + EigenOperator) added entirely post-audit. CANDIDATE-EIGENOP-001 (permissionless TOTP grow-only allowlist) lives in this new module. ... with the doctrine, the stack is treated as **unaudited substrate**."

**Rule B** (source: `brain/Doctrine.md` §"Doctrine #27 J corollary"): As referenced in #4 above — auto-FORECLOSURE-RECEIPT when audits ≥15, submissions ≥100, no-paid-Critical-6mo. (Cap audit-count is lower than 15 historically; however Doctrine #27 sub-rule maximum-discount tier — "≥30 audits ≥18 months multi-firm" — does NOT apply to Cap. Cap fires Doctrine #34 directly with no #27 conflict at Cap-specific catalog entry.)

**Conflict scenario:** Different scenario — a Cap-clone protocol that has 15+ audits + 100+ submissions on its BASE substrate AND has added an EigenLayer stack post-audit. Rule A (#34) says treat the EigenLayer module as un-audited → full P(finding) on the new module → dispatch. Rule B (#27 J) auto-forecloses based on base substrate's saturation profile, even though the post-audit module has zero of those 15 audits.

**Proposed resolution:** SCOPE-LIMIT Rule B (J corollary). The J corollary's `N_audits ≥ 15` and `N_submissions ≥ 100` apply to the SUBSTRATE THAT WAS AUDITED. The post-audit composition module did not receive those audits and is not covered by those submissions. Rule A correctly identifies the post-audit composition module as the active substrate.

**Resolution detail:** Amend Doctrine #27 J corollary §"Where this DOES NOT apply" to add: "**Doctrine #34 post-audit composition surface present** — J corollary does NOT cover modules added after the audit window. The audit-count and submission-count metrics that anchor J apply to the pre-composition substrate only. Run full Step 5.6 detector rotation on the post-audit composition surface; J auto-FORECLOSURE-RECEIPT applies only to the audited base."

This is the broader principle: composition surfaces inherit the saturation profile of the substrate they were AUDITED against. New substrate = new dispatch decision.

**Status:** SCOPED. Compounds with contradiction #4 (STRONG-composition vs J corollary) — both point at J corollary's over-eager application to surfaces it does not actually cover. The two resolutions together carve J back to its proper substrate-saturation scope.

---

## #13 — Doctrine #32 v1.1 cycle-2 filter (frozen-substrate FORECLOSE) vs Doctrine #37 Sub-Type B (repo-frozen-product-live PROCEED)

**Rule A** (source: `brain/Doctrine.md` §Doctrine #32 v1.1 cycle-2 filter): "frozen-substrate + 0 dangerous-area-changes → foreclose" — applied at Gate 1 entry, reads HEAD repo activity over 180-day window.

**Rule B** (source: `brain/Doctrine.md` §Doctrine #37 Sub-Type B): "repo-frozen-but-product-live → PROCEED with composition lens" — applied at Gate 1 entry, reads product-deployment activity (chains added, factories deployed) independent of HEAD repo activity.

**Conflict scenario:** rhino.fi 2026-05-26 — 440 days since last HEAD commit (cycle-2 FAIL per Rule A) AND product shipping monthly across 28 chains off the same contracts (PROCEED per Rule B). Both rules authored same day, both pass first-read.

**Proposed resolution:** SCOPE-LIMIT. Doctrine #37.B takes precedence at Step 0.5 when its trigger fires (product-deployment activity in last 90 days off frozen contracts). Doctrine #32 v1.1 cycle-2 needs an explicit product-status carve-out added to its trigger: "frozen-substrate AND no product-deployment activity in last 90 days".

**Resolution detail:** Practical precedence is already encoded in `hunts/2026-05-26-rhinofi-immunefi-gate1.md` Step 0.5 (Doctrine #37.B fires first, cycle-2 deferred). Rule-level fix needed in `brain/Doctrine.md` §Doctrine #32 v1.1 trigger spec — add product-activity carve-out. Compounds with #6 (post-audit composition vs cycle-2 audit_age preference).

**Status:** SCOPED (practice) / UNRESOLVED (rule-text). Source: Synthesis 2026-05-26 C-1.

---

## #14 — Lane 5 Immunefi DB chain-list vs canonical scope (project README / deployment manifest)

**Rule A** (source: `scripts/lane5-scope-monitor.py` Next.js SSR ingestion): chain-list = `chains_json` field as published by Immunefi program page, verbatim.

**Rule B** (source: canonical project documentation, e.g., rhino.fi `README.md`, CoW Immunefi page non-Ethereum exclusion clause): chain-list = actual on-chain deployment manifest, which may have MORE chains than Immunefi advertises (rhino.fi: 10 in DB, 28 in README) OR FEWER in-scope chains than Immunefi lists (CoW: DB lists `[ETH, Gnosis]`, Immunefi page text excludes Gnosis "non-Ethereum issues").

**Conflict scenario:** Any Lane 5 dispatch where chain-coverage drives EV calculation or Step 1 PROFILE substrate identification. rhino.fi: under-count → missed 18 chains of attack surface. CoW: over-count → Gate 2 PoC against a chain that's OOS.

**Proposed resolution:** SCOPE-LIMIT Rule A (Immunefi chain-list = informational only; never authoritative for scope). Add Step 1.5 (canonical-source verification) to Standing-Intake Protocol: for any target with multi-chain claim, cross-check the project README / docs / deployment registry before EV calc.

**Resolution detail:** Lane 5 crawler enhancement queued per `hunts/2026-05-26-brain-proposals-applied-ledger-v3.md` proposal #5 — merge canonical-source field on next crawler iteration. Until then, every Gate 1 sub-agent must manually verify chain list.

**Status:** UNRESOLVED — infra enhancement pending. Source: Synthesis 2026-05-26 C-2.

---

## #15 — DISC-019 "AI Report" dismissal contradicts the R8 Calibrated Reporting acceptance hypothesis

**Rule A** (source: `.claude/rules/standing-intake-protocol.md` Step 5.10 R8 Calibrated Reporting): "honest evidence-grade tagging (`[EXECUTED]`/`[INSPECTED]`/`[ASSUMED]`) improves first-pass acceptance because triagers can short-circuit re-verification on `[EXECUTED]`, scope verification windows on `[INSPECTED]`, and explicit reasoning-gaps on `[ASSUMED]`."

**Rule B** (observed: DISC-019 Notional V3 #79837 dismissal as "AI Report" 16 minutes post-submit with full `[EXECUTED]` Foundry PoC evidence): R8 tagging did NOT prevent AI-Report-class dismissal; methodology-presentation features (R8 tags inline, HOLD/STATUS headers, mechanical cadence, bulleted recommendations) actively SIGNAL "AI Report" to triagers and trigger fast-reject.

**Conflict scenario:** Any submission where the bug substance is bytecode-verifiable AND high-severity but the writing carries methodology-fingerprints. R8's "tags inline" interferes with the AI-Report refactor's "tags to footer" rule (7 binding rules adopted 2026-05-26).

**Proposed resolution:** MERGE. R8 tagging remains MANDATORY at the claim level — but TAG PLACEMENT moves to a per-finding footer (one R8 block at the end of each finding), NOT inline per sentence. The 7 binding AI-Report refactor rules already encode this; Step 5.10 needs an amendment recognizing tag-placement-discipline as part of the rule, not just tag-presence.

**Resolution detail:** Awaiting DISC-020 Filecoin #79987 acceptance signal (5-min triage 2026-05-26 17:44Z; substance unread by operator as of this writing). If DISC-020 advances past triage with R8-in-footer + 7-rule refactor applied, the resolution is validated. If DISC-020 also dismisses as AI Report, R8 needs deeper rework (placement alone insufficient).

**Status:** UNRESOLVED — DISC-020 outcome is the calibration anchor. Source: Synthesis 2026-05-26 C-3.

---

## Aggregate notes

**Cross-cutting pattern observed across #1, #4, #5, #6, #7, #11, #12:** Doctrine #27's catalog calibration tiers (F, G, J, sub-rule) and Doctrine #32's cycle-2 filter (v1.0, v1.1, v1.1.1) were each calibrated against a SPECIFIC substrate profile (Euler V2, Reserve, LiFi, Pendle, Uniswap V4) and PROMOTED to general application — but were not stress-tested against composition-surface targets (Doctrine #34 anchors: Cap EigenLayer stack, Filecoin FVM, Stacks sBTC, JustLend, Across V3) or substrate-blind targets (Doctrine #36 anchor: dYdX V4). The general pattern: **EV-calibration doctrines from saturated-substrate anchors do not safely extrapolate to composition-surface or substrate-blind anchors.** Future EV-calibration doctrine commits should explicitly enumerate "this calibration was anchored on X; here are the substrate profiles where it does NOT extrapolate."

**Cross-cutting pattern observed across #2, #8, #10:** Hyperactive Formula's deterministic-dispatch + zero-decision-points discipline is operationally correct INSIDE the dispatch loop but creates friction at the boundaries of the loop (queue-admission decisions, strategic-hold gates, primitive-grep verification before candidate-row generation). The resolutions in #2 and #10 codify the boundary protocols; #8's resolution clarifies that the loop respects gates inside Step 5 (primitive-grep gate before candidate generation). Future Hyperactive Formula updates should explicitly document the gate-protocols at the loop's input boundaries (Step 1 entry, Step 3 entry, Step 5 sub-step 5.4).

**Method gap:** Three full reads — `Lane4-Forum-Intelligence-Doctrine.md`, `Operator-Philosophy.md`, full `Cross-Domain-Fragility-Laws.md`, full `Watchlist-Candidate-Crossmap.md` — were NOT performed end-to-end during this v1.0 pass. Section headers were scanned for `Cross-Domain-Fragility-Laws.md` and `Watchlist-Candidate-Crossmap.md`. If those files contain rule statements that conflict with documented contradictions above, they will be surfaced in v1.1 — file a brain task to re-run this register after the next 2 Gate 1 brain-proposal cycles touching cross-domain laws.

**Quality bar.** Each contradiction above passes the threshold "a hypothetical target T exists where applying both rules produces incompatible outputs." Near-misses where one rule is procedural (e.g., HOW to verify) and the other is content (e.g., WHAT to verify) were excluded. The 12 contradictions above are the load-bearing ones.

---

_Brain Contradictions Register | v1.1 | 2026-05-26 | 15 entries (12 v1.0 + 3 fed back from Weekly Synthesis 2026-05-26) | Part 1 of Brain Self-Correction Layer rollout. Next update on next 2 Gate 1 brain-proposal cycles, or upon any Doctrine.md commit touching #27 / #32 / #34 / #36 / #37 calibration tiers, or upon any Hyperactive-Formula.md or standing-intake-protocol.md commit, or after the next Sunday weekly-synthesis run feeds new entries._

---

## #16 — Pattern J (slippage double-count) FORECLOSURE for Balancer V3 contradicted by composition with StableSurgeHook approximation

**Source A:** `brain/Watchlist-Candidate-Crossmap.md:314` — "Balancer V3 | Pattern J FORECLOSED | `BatchRouterHooks.sol:127` per-step minOut zeroed + write-once `pathAmountsOut` + assignment-not-accumulation `stepExactAmountIn`"

**Source B:** B-1 Gate 2 Foundry PoC (`pkg/pool-hooks/test/foundry/BatchRouterSlippageDoubleCountPoC.t.sol`, 2026-05-27) — Pattern J substrate IS load-bearing when composed with StableSurgeHook's acknowledged approximation. 2-hop batched swap leaks ~1.09% vs 0.55% single-hop on production-default parameters.

**Conflict:** Foreclosure row was written treating "per-step minOut=0" as a defended-by-design choice. PoC demonstrates the per-step zero IS the vulnerability substrate when downstream calculation has structural approximation error. The substrate isn't foreclosed by router design — it's exposed by router design combined with hook design.

**Proposed resolution:** Upgrade foreclosure-row 314 status from `Pattern J FORECLOSED` to `Pattern J PARTIAL — load-bearing in StableSurgeHook composition surface`. The pure Pattern J substrate (router-only, no hook) is still architecturally bounded by end-to-end slippage check on a single-fee curve. The compounded Pattern J (router + approximation-hook) is NOT bounded. This is a Doctrine #34 Post-Audit Composition Multiplier instance — the router and hook were audited separately and each in isolation was "defended"; the composition reveals the substrate.

**Resolution status:** Pending — surfaces on next maintenance loop. Notes in Crossmap v2.5 addendum (2026-05-27 ~00:35 UTC). Until row 314 is corrected, treat the v2.5 addendum as authoritative.

**2026-05-27 ~02:25 UTC reinforcement (Pancake Infinity Gate 2 CONFIRM):** Independent second-anchor for the same structural pattern. `infinity-periphery/src/pool-cl/CLRouterBase.sol:40-65` exhibits the same end-of-path-only floor + hook-returns-delta composition with 1.195% 2-hop vs 0.600% 1-hop leakage on identical envelopes. Two production deployments, two unrelated teams, same structural shape — the contradiction is now multi-anchored. CANDIDATE-O DC-promotion queued in OQT Q-41. Foreclosure-row 314 correction priority elevated.

---

_Brain Contradictions Register | v1.3 | 2026-05-27 ~02:25 UTC | 16 entries (15 v1.1 + Pattern J Balancer V3 foreclosure contradicted by Gate 2 PoC; reinforced 2026-05-27 by Pancake Infinity Gate 2 second-anchor CONFIRM)_

---

# === SECTION P1 — PILLAR 1 (TOKEN SCORING) CONTRADICTIONS ===

## #P1-1 — Instant-kill "already listed on Tier 1/2 CEX" vs HSaaS outreach to established projects

**Rule A** (source: `brain/Token-Scoring-Doctrine.md` T-1, current instant-kills list): Instant-kill rules deterministically disqualify tokens from scoring (STABLECOIN_EXCLUSION, GHOST_TOKEN). Hypothetical expansion candidate: "ALREADY_LISTED_TIER_1_CEX" — token already trades on Binance/Coinbase/Kraken → instant-skip because the listing-pipeline value vector (SolCex listing intelligence) does not apply.

**Rule B** (source: `brain/HSaaS-Operations.md` §4 prospect-scoring hypotheses + `.claude/rules/tweet-on-score.md` v2.2): HSaaS audit-tier outreach targets ESTABLISHED projects (mcap $5M-$50M, doxxed team, prior audits) as a moderate-conversion segment. Many such projects are also Tier 1/2 CEX listed. The HSaaS sales pitch ("we'll audit your token honestly") does not require unlisted-status; it requires audit-budget appetite.

**Conflict scenario:** A token like LDO or PENDLE — listed on Binance + Coinbase, $1B+ mcap, audit-budget present. Rule A (proposed instant-kill) would silently remove the token from the scoring pipeline → no score tweet draft → no HSaaS outreach trigger. Rule B (HSaaS) says these are valid outreach targets. Instant-killing them at Pillar 1 forecloses the Pillar 2 path.

**Proposed resolution:** SCOPE-LIMIT. Do NOT promote "ALREADY_LISTED_TIER_1_CEX" to instant-kill. Instead: treat already-listed status as a SIGNAL routed to the Pillar 2 segmentation engine (HSaaS prospect scoring), NOT as a scoring-engine exclusion. The token still scores; the score-tweet template chooses between BD-listing-pitch framing vs HSaaS-audit-pitch framing based on listing status.

**Resolution detail:** Add `tier_1_cex_listed` field to Pillar 1 scoring output (Boolean). Pillar 2 tweet-draft generator branches on the field: if `true` → HSaaS-pitch template + audit-tier CTA; if `false` → SolCex-listing-pitch template + BD-outreach CTA. The two pillars share the score but route different downstream actions.

**Status:** ESCALATE (proposed rule; await operator decision on whether to add the field + template branching). Source: Four-Pillar Brain Extension cycle 2026-05-27.

---

# === SECTION P2 — PILLAR 2 (HSAAS / CONTENT) CONTRADICTIONS ===

*(v1.4 seed: none yet — first operational P2 contradictions emerge when HSaaS outreach cycle goes live and engagement data accumulates. Anticipated first conflict: template-A vs template-B A/B winner-vs-Hyperactive-Formula deterministic-dispatch on next outreach batch.)*

---

# === SECTION P3 — PILLAR 3 (CORPUS) CONTRADICTIONS ===

*(v1.4 seed: none yet — first operational P3 contradictions emerge when Phase 2 corpus consumer runs and classification mix produces a DETECTOR_SEED row that conflicts with an existing Pillar 4 detector. Anticipated first conflict: corpus-extracted historical pattern flagged DETECTOR_SEED vs the same pattern already FORECLOSED in Patterns-Defense-Classes.md as a defended-by-design class.)*

---

# === SECTION CROSS — CROSS-PILLAR CONTRADICTIONS ===

## #CROSS-1 — Tweet daily cap (3 max) vs Pillar 4 wanting to tweet every confirmed exploit

**Rule A** (source: `.claude/rules/tweet-on-score.md` v2.2 + `brain/Content-Playbook.md` §8 known constraints): "Maximum 3 score tweets per day (quality over spam)." Hard cap from v2.2 onward. Applies to all score-tweet templates (T-HOT, T-WATCH, T-FLAG, T-CAL).

**Rule B** (source: `four-pillar-loop.md` Pillar 4 → Pillar 2 wiring + `brain/Cross-Pollination-Log.md` §3 anticipated handoffs): "Bug research confirms exploit POST-DISCLOSURE → Moltbook case study + 'Caught' tweet + shield.buzzbd.ai gallery + HSaaS outreach reference." The "Caught" tweet flow assumes every confirmed exploit produces a tweet. On a high-throughput day (e.g., 2 Gate 2 CONFIRMs land same day, AND a separate rug-catch fires from Pillar 1, AND a previously-scored token dumps), 4+ tweets queue against a 3-tweet cap.

**Conflict scenario:** Day-with-4-events. Pillar 4 produces 2 "Caught" tweets (B-1 + P-1 post-disclosure). Pillar 1 produces 1 calibration tweet (a previously-scored 75/100 token dumped → T-CAL-v22). Pillar 1 also has 1 fresh 87/100 score → T-HOT-v22. Total: 4 tweets demanded, 3 allowed. Which 3 get tweeted? Which 1 gets dropped (log-only, no public surface)?

**Proposed resolution:** SCOPE-LIMIT Rule A. Introduce a priority ordering inside the 3-tweet daily slot:

1. **T-FLAG-v22 / "Caught" tweets (Pillar 4 confirmed exploit post-disclosure)** — priority 1, always-on regardless of other queue depth
2. **T-CAL-v22 calibration tweets (Pillar 1 rug catch on previously-scored token)** — priority 2, methodology proof
3. **T-HOT-v22 high-score tweets (Pillar 1 fresh score ≥85)** — priority 3
4. **T-WATCH-v22 mid-score tweets (Pillar 1 fresh score 50-69)** — priority 4

When the cap binds, drop from the bottom of the priority list. The cap remains 3/day (quality over spam preserved), but the priority preserves the highest-leverage content.

**Alternative resolution:** Operator-decides-per-day exception — if a multi-exploit day produces 4+ confirmed P4 catches, operator approves a one-day expansion to N tweets. The cap remains the default; the exception path is documented.

**Resolution detail:** Codify priority ordering in `tweet-on-score.md` v2.3 (or as a Content-Playbook §1 amendment). When `pending_tweets.count > 3`, sort by template priority, tweet top 3, log remainder to `data/buzz/persistent/audits/dropped-tweets-{date}.json` for next-day promotion if still relevant.

**Status:** ESCALATE (operator decision on which resolution path; both are operationally viable). Source: Four-Pillar Brain Extension cycle 2026-05-27.

---

---

## #19 INFO — Operator brief vs live Immunefi/Cantina page profile drift

**Pillar:** P4
**Status:** INFO (not a contradiction; a recurring pattern worth tracking)
**Anchored:** 2026-05-27 Kiln Immunefi v2 Step 0.5 receipt

**Pattern observation:** Operator briefs occasionally cite expected program profile (cap, KYC, version, no-KYC status) that diverges from the live Immunefi/Cantina page profile at dispatch time. Day-27 anchored on Kiln: brief said "Kiln on-chain **v1**, $1M cap, NO KYC", live page = "Kiln On-Chain **v2** only (v1 URL 404s), $500K Critical cap, KYC REQUIRED". 4-axis discrepancy (version + cap + KYC + scope).

**Why this is INFO not a contradiction:**
- Operator briefs are sourced from rotating signal-feeds, contest aggregators, and Telegram referrals, where profile data ages
- Live page is canonical at dispatch time
- The Standing-Intake Step 1 PROFILE step is precisely the corrective control — it forces canonical-page fetch before EV computation

**How to apply:**
- Step 1 PROFILE is MANDATORY (already enforced by `standing-intake-protocol.md`); never act on briefed cap/KYC/scope/version without WebFetch verification
- When the live page diverges materially (cap ≥50% drift OR KYC flag flip OR major version-change), record the drift in the hunt receipt as `[ASSUMED]→[EXECUTED via WebFetch]` correction trace
- Operator briefs remain the **dispatch trigger** even when imprecise; do not block on profile-verification, just verify before EV-commit

**Recurrence count:** 3 anchored events:
1. Kiln 2026-05-27 (4-axis drift: v1→v2, $1M→$500K, NO KYC→KYC, scope ~half)
2. Cap 2026-05-27 evening (1-axis but high-impact: **platform discrepancy** — brief said Immunefi, live is Sherlock #114 $1M USDC since 2025-10-24; all 4 candidate Immunefi URLs returned 404)
3. Gearbox 2026-05-27 23:24 (scope drift: brief listed `Gearbox-Protocol/router-v3` as in-scope, live scope file made NO mention of router-v3, GitHub repo 404). Same-axis as #2 but on SCOPE-asset dimension rather than PLATFORM dimension.

Pattern transition: simple cap/KYC/version drift → **platform-routing drift**. The Cap case is more consequential because platform-routing affects submission discipline (Sherlock contest rules vs Immunefi bounty rules), not just discount math. **At 3rd anchor, promote to Doctrine entry**.

**How to apply (updated):** Step 1 PROFILE MUST verify (a) live page exists at briefed URL, (b) if 404, try 3-5 slug variants before halting, (c) if all variants 404, cross-check Sherlock + Cantina + HackerOne for the same project name. Cap lesson: when brief platform says Immunefi but URL 404s, the program may exist on a different platform with same scope.

---

---

## #20 INFO — Gate 1 novelty over-estimate on cross-protocol DC-7 hypotheses

**Pillar:** P4
**Status:** INFO (process-hardening rule, not a contradiction in a doctrine)
**Anchored:** 2026-05-27 evening Cap Gate 2 NEGATE

**Pattern observation:** Cross-protocol DC-7 hypotheses generated at Gate 1 systematically over-estimate novelty when the consumer-side replay/freshness defenses on the OTHER protocol are not pre-enumerated.

**Concrete data:** Cap Gate 1 estimated Finding 1 (`advanceTotp` + EigenLayer stale-restaker race) novelty at **35%**, EV $15K-$50K. Cap Gate 2 source-read showed actual novelty **<5%**: EigenLayer's `DelegationManager.approverSaltIsSpent[approver][salt]` replay defense + `getOperatorShares()` LIVE state reads + Cap's own deterministic-derivation key-binding meant the hypothesis was structurally non-applicable, not partially-defended. Gap = 7× over-estimate.

**Why this happens:** Gate 1 surface-mapping focuses on the in-scope protocol's surface. Cross-protocol DC-7 (key-A in protocol-X, key-B in protocol-Y) requires reading the OTHER protocol's defenses too — but Gate 1 budget rarely covers that depth. Auditor often catches the cross-protocol angle, BUT only the consuming side's defenses; the originating side's setter may still look "permissionless".

**How to apply (Standing-Intake Step 5 hardening proposal):**

When Gate 1 surface map includes any DC-7 hypothesis that spans protocol boundaries (X writes, Y reads, OR X writes + downstream Y consumes via callback/integration), the Gate 1 file MUST include a "**Cross-Protocol Defense Enumeration**" subsection that lists:
- Consumer-side replay defenses (saltIsSpent / nonceUsed / commitmentRevealed patterns)
- Consumer-side freshness defenses (live-read vs cached-read, stale-tolerance windows)
- Writer-side key-binding determinism (is the key fully determined by stored state? Or does attacker control any input?)

If 2+ of those 3 defenses are present → DC-7 EXCLUSION sub-pattern fires (see Patterns-Defense-Classes.md), foreclose at Gate 1.

**Recurrence count:** **2 anchored events — PROMOTION-ELIGIBLE:**
1. Cap C1 (advanceTotp + EigenLayer race) — Gate 1 novelty 35% → actual <5% = 7× overestimate
2. Cap C3 (PriceOracle pause-asymmetry) — Gate 1 novelty 30% → actual ~4% = **7.5× overestimate, exact match to predicted median**

Both anchors fired on cross-protocol DC-7 hypotheses where the consumer-side replay/freshness defenses were not pre-enumerated. The 7× factor reproduced with high precision (7.0 + 7.5 / 2 = 7.25 median, within sampling noise). **Promote rule to MANDATORY Step 5 sub-check** in `.claude/rules/standing-intake-protocol.md` (Step 5.11 Cross-Protocol Defense Enumeration). Status: **RESOLVED-PROMOTED** pending the .claude/rules file edit (queued for batch commit).

**Cross-reference:** Doctrine #34 sub-class b anchor #3 (Cap, this hunt) — both are facets of the same lesson: structural defense layers exist and need to be enumerated BEFORE Gate 2 dispatch, not discovered during it.

---

---

## #21 INFO — Brief-generation freshness drift on watchlist-derived next-target recommendations

**Pillar:** P4
**Status:** INFO (process pattern; Step 0.5 5-channel ledger check is the defense, validated by 1 worked example)
**Anchored:** 2026-05-27 OnRe Gate 1 DEDUP-FORECLOSURE

**Pattern observation:** Subagent next-target recommendations can be stale by 7-14 days when the source watchlist priority list wasn't updated post-canonical-promotion. The Cap C3 G2 agent + Function FBTC G1 agent both recommended OnRe as "CANDIDATE-G promotion catalyst" — but CG was already PROMOTED to DC-8 (not DC-7) on 2026-05-18/19 via Ogie msg 7259 §5A. OnRe G1 Step 0.5 5-channel check caught the drift in ~7 min via brain-ledger lookup (Channel 1: `Patterns-Defense-Classes.md:265-345` DC-8 anchor record).

**Why this is INFO not a contradiction:**
- The drift is operator-brief-class (msg 7259 was a promotion directive that landed but watchlist priority list wasn't synced)
- Step 0.5 5-channel check IS the defense — and it FIRED CORRECTLY here, ~7 min cost vs ~30-60 min sub-agent re-derivation against unchanged source
- This is the SECOND positive worked example of Step 0.5 catching brief staleness (1st: Paxos T+3 redispatch 2026-05-27 — different staleness mechanism but same defense activated)

**How to apply:**
- Step 0.5 5-channel check stays MANDATORY (already enforced in Standing-Intake protocol)
- Channel 1 (brain ledger) is the highest-yield channel for catching post-promotion drift — it has both the canonical doctrine + the original anchor evidence + the Watchlist row at synchronization time
- When dispatching from a stale watchlist row, NORMAL behavior is the Step 0.5 catches it within 5-10 min — DO NOT pre-validate watchlist freshness, just dispatch and let Step 0.5 do its job

**Cross-references:**
- INFO #19 (platform-routing drift): brief said Immunefi, live was Sherlock #114 — 1-axis drift on PLATFORM dimension
- INFO #20 (novelty over-estimate): cross-protocol DC-7 hypotheses 7× overestimate — 1-axis drift on NOVELTY dimension
- INFO #21 (brief-generation freshness drift, THIS entry): watchlist row stale post-canonical-promotion — 1-axis drift on TIME dimension

The three INFO entries together describe **three distinct drift axes** that Standing-Intake protocol must absorb. All three defenses (Step 1 PROFILE, Step 5.11 Cross-Protocol Defense Enumeration, Step 0.5 5-channel ledger check) are now MANDATORY-or-promoted.

**Recurrence count:** 1 anchored event (OnRe 2026-05-27). Track for 2nd+ anchor. If pattern recurs ≥2 times within 14d, consider auto-watchlist-staleness scanner cron (Wednesday 06:00 UTC after Phase 2 corpus consumer).

---

_Brain Contradictions Register | v1.10 | 2026-05-27 23:25 UTC | 21 entries (19 P4 + 1 P1 + 1 CROSS; v1.10 adds 3rd anchor to INFO #19 (Gearbox router-v3 scope drift) — now 4-axis: VERSION/CAP/KYC/SCOPE + PLATFORM + TIME + NOVELTY. Step 5.11 promoted MANDATORY validated by Cap C1 + Cap C3 + Function FBTC + Gearbox = 4 production deployments)_
