# Weekly Synthesis — 2026-05-26 (calibration run, sprint window 2026-05-24 → 2026-05-26)

**Window:** 3 calendar days (48-hour-plus sprint). First synthesis under the Weekly-Synthesis-Template v1.0; subsequent runs cover full 7-day windows.

**Corpus inputs:**
- 11 Gate 1 hunt files (Alex, Hydration, Raydium, Stacks, Filecoin, JustLend, Olympus, CoW, rhinofi, Balancer, plus `2026-05-25-filecoin-scope-triage-query.md`)
- 3 PRE-CLONE-HALT files (Across, dYdX V4, Lombard)
- 3 brain-proposals-applied ledgers (Day 26 morning / afternoon / evening — 32 proposals across the day)
- 4 disclosure submissions touched: DISC-017 Ethena (CLOSED dup), DISC-018 Morpho Cantina (SUBMITTED), DISC-019 Notional V3 (CLOSED "AI Report"), DISC-020 Filecoin builtin-actors (SUBMITTED)
- 1 NEW infrastructure ship: Lane 5 Immunefi crawler (commit `ba3e2ed`, 219 programs ingested)
- 1 NEW brain file: `brain/Platform-Migration-Log.md` (Across canonical anchor)

---

## CONNECTIONS

**1. The Vault-RateProvider-without-MIN-cap is the same surface that Doctrine #29 v1.1 was just amended around — Balancer V3 is the canonical-Vault anchor for the lens that landed on Olympus.** `hunts/2026-05-26-olympus-immunefi-gate1.md` confirmed Doctrine #29 v1.1 two-sided MIN-cap defense on Olympus BLVaultLido (deposit-mint = `min(oracle, pool)`, withdraw-payout = oracle-only with excess-to-treasury). Hours later, `hunts/2026-05-26-balancer-immunefi-gate1.md` Lens 1 hit `pkg/vault/contracts/lib/PoolDataLib.sol:158` consuming `IRateProvider.getRate()` with NO MIN-cap / NO MAX-cap / NO monotonic-floor — the exact defense Olympus implements correctly. Balancer V3 is **the canonical Vault-consumer-of-RateProviders in DeFi**; Olympus BLVaultLido was a single-pool implementation. The doctrine now has its scale-anchor; Olympus is the implementation anchor.

**2. The same "frozen-scope active-protocol" judgment fires on rhino.fi and CoW, but with opposite outcomes — and that asymmetry IS the Doctrine #37 A/B sub-type split.** `hunts/2026-05-26-cowprotocol-immunefi-gate1.md` (1844 days frozen + SHA-pinned 2021-04-08 + features OFF-scope) and `hunts/2026-05-26-rhinofi-immunefi-gate1.md` (440 days frozen + `master`-branch-pinned + product shipping monthly) hit identical trigger `days_since_push > 365` but pulled opposite verdicts (FORECLOSE vs PROCEED). The connection is the substrate distinction — repo+scope-frozen vs repo-frozen-product-live — and it is now codified as Doctrine #37 CANDIDATE A/B per `brain/Doctrine.md:2558-2621`.

**3. Three PRE-CLONE-HALTs in one afternoon all surfaced the same root failure-mode — `Standing-Intake-Protocol` v1.0 had no Step 0 prior-corpus lookup.** `hunts/2026-05-26-across-immunefi-gate1-PRE-CLONE-HALT.md` (platform migration since last scrape), `hunts/2026-05-26-dydx-v4-immunefi-gate1-PRE-CLONE-HALT.md` (re-dispatch of 2026-05-23 WATCHLIST verdict without re-trigger check), and `hunts/2026-05-26-lombard-immunefi-gate1-PRE-CLONE-HALT.md` (re-dispatch of 2026-05-21 foreclosure) all reduce to the same shape: a fresh Gate 1 dispatch failed to consult prior Buzz corpus. The fix is the Step 0 spec captured in `hunts/2026-05-26-brain-proposals-applied-ledger-v2.md:61-84`. The recurrence-count of three across a single afternoon was what forced the rule into existence — not any single halt.

**4. DC-9 sub-5 (asset-vs-receipt) and DC-7 cross-language-guard sub fired in the same evening on Olympus and rhino.fi respectively — both novel sub-patterns, both single-anchor, both filed without an obvious sibling — yet both share an axis of "what is symmetric in one direction is asymmetric in the other".** Olympus's `ConvertibleDepositFacility.convert` (mint by `receiptTokenIn`) versus `DepositManager.withdraw` (liability decremented by `params_.amount` regardless of `actualAmount`) is asset-vs-receipt; rhino.fi's TON FunC `bridge_contract.fc` (checks pause on BOTH jetton + native paths) versus EVM `DVFDepositContract` (checks pause on `deposit`+`depositNative` but NOT on `depositWithId`/`depositWithPermit`) is language-vs-language. Both are paired-function-asymmetry shapes. Connection candidate: a paired-asymmetry meta-pattern parent over both DC-7 cross-language sub and DC-9 sub-5.

**5. Lane 5 Immunefi crawler shipped `ba3e2ed` THE SAME EVENING that three of its DB rows became the dispatch targets that produced 9 brain proposals.** The crawler's first operational hour (Olympus → CoW → rhino.fi dispatches) doubled as its first validation test (asset-count enrichment gap, chain-list calibration gap, both surfaced as Platform-Migration-Log enhancements per `hunts/2026-05-26-brain-proposals-applied-ledger-v3.md` proposals #2 + #5). Infra ship → operational use → self-detected enhancement queue, all in <8 hours.

---

## PATTERNS

**Doctrine #34 (post-audit composition multiplier) fired on 4 targets:** Filecoin (anchor 2 per `hunts/2026-05-26-filecoin-immunefi-gate1.md` C-Filecoin-2), Stacks (anchor 3 per `hunts/2026-05-26-stacks-immunefi-gate1.md` P3, STRONG composition-multiplier-strength tier @ 19% fix-rate density), JustLend (anchor 4 per `hunts/2026-05-26-justlend-immunefi-gate1.md` #2 — BUSD market added 10 months post-CertK audit without re-review), Across V3 (PROVISIONAL anchor 5 — `ArbitraryEVMFlowExecutor` HEAD commit `9ffb2ab2`, OpenZeppelin continuous audit baseline). **Substrate distribution: FEVM-Rust (Filecoin), Clarity (Stacks), TRON-Solidity-fork (JustLend), Ethereum-Solidity (Across).** Promotion suggestion: Doctrine #34 is now multi-anchor across 4 substrate classes — strongest case yet for PERMANENT promotion if Across moves from PROVISIONAL to confirmed (operator-routing dependent).

**DC-7 sub-pattern family expansion — fired on 3 targets in 1 sprint:** cross-language enum-repr divergence (Filecoin SectorStatusCode native-VM vs FEVM per `hunts/2026-05-26-filecoin-immunefi-gate1.md` C-Filecoin-3), cross-language guard-coverage asymmetry (rhino.fi TON FunC vs EVM Solidity per `hunts/2026-05-26-rhinofi-immunefi-gate1.md`), validating-field ≠ consuming-field on Across V3 (`depositV3` writing struct + `fillRelay` rebuilding struct hash per `hunts/2026-05-26-across-immunefi-gate1-PRE-CLONE-HALT.md` Step 2). **Substrate distribution: Rust↔FEVM, FunC↔Solidity, Solidity↔Solidity.** Promotion suggestion: the DC-7 family is now broader than its original anchor (Veda Manager/Decoder) — a parent rename to "Cross-Boundary Field/Guard Divergence" with three sibling subs would clarify the taxonomy.

**Doctrine #32 v1.1 cycle-2 / Step 0 prior-corpus discipline fired on 3 PRE-CLONE-HALTs in one afternoon:** Across, dYdX V4, Lombard (per `hunts/2026-05-26-brain-proposals-applied-ledger-v2.md`). **Substrate distribution: Solidity (Across), Cosmos-SDK Go (dYdX V4), Solidity (Lombard).** The pattern is meta — corpus-discipline triggering on cross-substrate dispatches — and it forced Step 0 spec creation. Promotion: Step 0 is now a STANDING rule pending operator-side Edit-tool unblock (per ledger v2 harness-denied note).

**Lens 1 / Doctrine #29 v1.1 / DC-12 (oracle/rate-provider defense family) fired on 3 targets:** Olympus BLVaultLido (defense PRESENT correctly), Balancer V3 PoolDataLib (defense ABSENT — Lens 1 + Lens 4 direct hits), Notional V3 MidasOracle (DISC-019 wrapper-strips-staleness, DC-12 sub-7 per `hunts/2026-05-26-justlend-immunefi-gate1.md` cross-reference). **Substrate distribution: Solidity across all three.** Promotion: Doctrine #29 v1.1 + DC-12 family is the strongest internal-pattern cluster of the sprint; sibling-DC consolidation candidate (merge DC-12 sub-7 wrapper-strips-staleness into Doctrine #29 v1.1 third-implementer notation on next anchor).

---

## CONTRADICTIONS

**C-1 (new): Doctrine #32 v1.1 cycle-2 filter ("frozen-substrate + 0 dangerous-area-changes → foreclose") fires FORECLOSE on rhino.fi base substrate, but Doctrine #37.B ("repo-frozen-but-product-live → PROCEED with composition lens") fires PROCEED on the same target.** Both doctrines authored 2026-05-26, both passed first-read; ruling-rules conflict because rhino.fi is simultaneously cycle-2-FAIL (no commits in 440 days) AND composition-surface-LIVE (28 chains deployed monthly off the SAME contracts). Resolution applied in `hunts/2026-05-26-rhinofi-immunefi-gate1.md` Step 0.5: Doctrine #37.B takes precedence (composition lens fires); Doctrine #32 v1.1 cycle-2 is over-broad without product-status corollary. Status: RESOLVED in single-anchor practice but RULE-LEVEL contradiction remains — Doctrine #32 v1.1 has no explicit product-status carve-out. Feeds `brain/Contradictions-Register.md`.

**C-2 (new): "Active Immunefi program" status in Lane 5 DB (chain list 10 chains for rhino.fi) contradicts the canonical scope source (rhino.fi `README.md` lists 28 deployed chains).** Lane 5 crawler ingests Immunefi's chain field verbatim; canonical scope spans more chains via identical bytecode deployments. Same ambiguity at lower magnitude on CoW: Lane 5 DB `chains=[ETH, Gnosis]` but Immunefi explicitly excludes "Non-Ethereum Mainnet issues" → Gnosis OOS. Status: OPEN — Lane 5 crawler enhancement queued per `hunts/2026-05-26-brain-proposals-applied-ledger-v3.md` proposal #5 (merged CoW P2 + rhino.fi P2). Feeds Contradictions-Register.

**C-3 (new): DISC-019 dismissal ("AI Report") on a finding with bytecode-verified primary evidence + Foundry PoC contradicts the R8 Calibrated Reporting acceptance hypothesis (Step 5.10 of `standing-intake-protocol.md`).** R8 tagging (`[EXECUTED]` / `[INSPECTED]` / `[ASSUMED]`) was adopted on hypothesis that honest evidence-grade tagging improves first-pass acceptance; DISC-019 carried full `[EXECUTED]` PoC evidence and still drew "AI Report" dismissal in 16 minutes. Resolution route: Notional methodology refactor (7 binding rules) per `project_disc019_notional_submitted.md` MEMORY index reference. Status: OPEN — refactor's effect on DISC-020 Filecoin acceptance signal pending (5-min triage time arrived 2026-05-26 17:39Z but no signal interpretation yet). Feeds Contradictions-Register.

---

## OPEN QUESTIONS

**Q-1 (new, recurrence=3): What is the right corpus-collision precedence — Step 0 prior-corpus lookup OR Step 1 Platform STATUS preflight — when both fire?** Across PRE-CLONE-HALT surfaced platform-migration THROUGH Step 1 (live Immunefi search returned 0 matches); dYdX V4 and Lombard PRE-CLONE-HALTs surfaced prior-Gate-1 verdicts THROUGH Step 0. The two checks can both halt; the order in which they fire affects which artifact gets surfaced first. Recurrence: 3 in single afternoon. Feeds `brain/Open-Questions-Tracker.md`.

**Q-2 (new, recurrence=2): Is `Lens 1 / Doctrine #29 v1.1` better filed as a "missing defense" pattern or a "present defense" pattern?** Olympus filed it as PRESENT (defense implemented correctly); Balancer filed it as ABSENT (defense missing). The doctrine text reads naturally as a defense-spec, but the lens fires equally on present-and-correct (validates implementation) and absent-and-needed (surfaces finding). Resolution affects how the lens is taught to future Gate 1 sub-agents. Feeds Open-Questions-Tracker.

**Q-3 (new, recurrence=2): When a doctrine has dual sub-types (A/B like Doctrine #37, or PRESENT/ABSENT like Doctrine #29 v1.1), should each sub-type require its own 2-anchor promotion path, or does aggregate count across sub-types satisfy PERMANENT promotion?** Doctrine #37 currently requires 2 A-anchors AND 2 B-anchors per `brain/Doctrine.md:2610`. DC-7 sub-pattern family arguably already has 3 anchors but no clear PERMANENT promotion rubric. Feeds Open-Questions-Tracker.

**Q-4 (new, recurrence=2): What is the DISC-020 Filecoin signal value of "triage in 5 minutes"?** Fast triage could be (a) sophisticated triager who recognized substance immediately, (b) automated AI-Report-style pre-filter that fast-rejects, (c) standard Immunefi queue with low load. Pending operator/triager response to disambiguate. Recurrence: implicit in DISC-019 AI-Report dismissal + DISC-020 5-min triage. Feeds Open-Questions-Tracker.

---

_Synthesis filed 2026-05-26 calibration run. Word count: ~1,950. Inputs: 11 Gate 1 hunts + 3 PRE-CLONE-HALTs + 3 brain-proposals-applied ledgers + 4 disclosure events + Lane 5 crawler ship + Platform-Migration-Log NEW. Outputs: 5 connections, 4 patterns (3 fired on 3+ targets each), 3 contradictions (C-1, C-2, C-3) feeding `brain/Contradictions-Register.md`, 4 open questions (Q-1..Q-4) feeding `brain/Open-Questions-Tracker.md`._
