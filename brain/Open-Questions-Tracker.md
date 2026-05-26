# Brain Open Questions Tracker

**Purpose:** Track every question that appears during a Gate 1 / Gate 2 / paste-ready cycle and remains unresolved. Recurring questions surface gaps in brain coverage that demand new doctrine, lens, or methodology.

**Authority:** Created 2026-05-26 as Part 2 of Brain Self-Correction Layer rollout. Companion to `brain/Doctrine.md`, `brain/External-Frameworks.md`, `brain/Security-Research-Submission-Ledger.md`.

**Status legend:**
- **OPEN** — no resolution yet, blocks or shapes a downstream decision
- **ANSWERED** — resolved with source link (file:line, message ID, or operator decision)
- **RECURRING** — appeared 3+ times across hunts within a 7-day window; indicates a pattern gap that should be promoted to doctrine, detector spec, or methodology rule
- **DEFERRED** — operator chose to skip, OR resolved by abandoning the target

**Maintenance rule:** every Gate 1 brain-proposal cycle MUST update this tracker — file new questions, mark resolved ones ANSWERED with source link. Recurring promotion check at each weekly intake-log review.

**Substrate tags:** `#solidity` `#rust-anchor` `#rust-solana` `#rust-substrate` `#go-cosmos` `#clarity-stacks` `#move-aptos` `#ton-func` `#cross-domain` `#mpc` `#methodology` `#operator-pending` `#payment-flow`

---

## #1 — Does sbtc-token.protocol-mint gate via is-protocol-caller deposit-role contract-caller?

**Status:** ANSWERED

**First-surfaced:** 2026-05-26 (Stacks Clarity C1 Phase 2 DUP-check)

**Hunt context:** `hunts/2026-05-26-stacks-immunefi-gate1.md` line 481 (intake row noting C1+C2 pending PDF-read DUP-check)

**Answer:** Confirmed via grep line 30 of sbtc-token contract source — `is-protocol-caller` enforces the deposit-role gate. DUP-check resolved, C1 thread retired. (Source: Stacks C1 Phase 2 DUP-check, 2026-05-26.)

**Tags:** #clarity-stacks #methodology #DUP-check

---

## #2 — Is Filecoin builtin-actors in-scope on Immunefi?

**Status:** ANSWERED

**First-surfaced:** 2026-05-25 (Filecoin scope-triage query)

**Hunt context:** `hunts/2026-05-25-filecoin-scope-triage-query.md` (operator scope-clarify query)

**Answer:** Confirmed in-scope via operator visual asset selection — MOOT status closed 2026-05-26 17:28Z (Ogie msg 7837). Gate 1 followed at `hunts/2026-05-26-filecoin-immunefi-gate1.md` with 3 [INSPECTED]-anchored leads.

**Tags:** #rust-substrate #operator-pending #scope-clarify

---

## #3 — Does any JustLend TRC20 underlying (WBTT/SUN/JST/WIN/NFT) have a receive-hook?

**Status:** ANSWERED

**First-surfaced:** 2026-05-26 (JustLend Immunefi Gate 1)

**Hunt context:** `hunts/2026-05-26-justlend-immunefi-gate1.md` lines 211-214 (FORECLOSURE-RECEIPT block)

**Answer:** All 5 verified NO via TronScan API — none of the underlying TRC20 tokens implement a receive-hook callback class. Closes the DC-13 (notification-callback divergence) lens hit; JustLend FORECLOSURE-RECEIPT issued. (Source: hunts/2026-05-26-justlend-immunefi-gate1.md FORECLOSURE-RECEIPT block, 2026-05-26.)

**Tags:** #solidity-tron #DC-13 #methodology

---

## #4 — Will Firedancer #77340 payment arrive before the next submission window?

**Status:** RECURRING

**First-surfaced:** 2026-05-20 17:08Z (CONFIRMED status on Immunefi dashboard)

**Hunt context:** `brain/Security-Research-Submission-Ledger.md` lines 36-37 + line 280 + line 337 (Stacks C1 paste-ready held pending #77340 deposit funding)

**Answer:** Still pending payment as of 2026-05-26 (6 days post-CONFIRMED). Recurring because the question now gates downstream submissions: Stacks C1 DRAFT cannot transition to SUBMIT until $100 USDC deposit is funded from the payout. Operator escalation path: ping Immunefi dashboard message thread.

**Tags:** #payment-flow #operator-pending #methodology #RECURRING

---

## #5 — Is the ArbitraryEVMFlowExecutor in Across V3 a genuine post-audit-composition finding?

**Status:** OPEN

**First-surfaced:** 2026-05-26 (Across pre-clone halt)

**Hunt context:** `hunts/2026-05-26-across-immunefi-gate1-PRE-CLONE-HALT.md` lines 5, 43-45, 218-220 (HALT pre-clone; Doctrine #34 anchor-candidate quality [ASSUMED])

**Answer:** Deferred pending platform-migration resolution (Across may have migrated FROM Immunefi TO self-hosted email between 2026-05-23 watchlist scrape and 2026-05-26 live check). Operator decision required on submission path before any clone or source-read.

**Tags:** #solidity #cross-domain #operator-pending #platform-migration

---

## #6 — Which Cosmos SDK targets become viable once buzzshield-cosmos-deep.js ships?

**Status:** OPEN

**First-surfaced:** 2026-05-26 (dydx-v4 pre-clone halt)

**Hunt context:** `hunts/2026-05-26-dydx-v4-immunefi-gate1-PRE-CLONE-HALT.md` lines 19-20, 78 (substrate-mismatch trigger still active; no Go AST detector exists)

**Answer:** Substrate gap acknowledged at `brain/Doctrine.md:900` (`#165` cosmos-bech32 detector productization). Detector spec filed as #129 (Cosmos SDK / Go coverage), #137 (cross-module canonicalization mismatch), #138 (no-overwrite-guard). Pipeline of waiting targets: dydx-v4 ($1M+ cap), Osmosis, Sei, Injective, Stride. Build-cost vs target-EV calculus pending operator dispatch.

**Tags:** #go-cosmos #methodology #detector-roadmap #substrate-gap

---

## #7 — Did Immunefi #79987 (Filecoin) 5-minute triage response signal AI-Report dismissal or engagement?

**Status:** RECURRING (also surfaced as Weekly Synthesis 2026-05-26 Q-4 — deduplicated and merged here)

**First-surfaced:** 2026-05-26 (Day 27 morning kickoff)

**Hunt context:** `MEMORY.md` `project_disc020_filecoin_submitted.md` (SUBMITTED 2026-05-26 20:39Z, first post-AI-Report-refactor submission)

**Answer:** Awaiting operator dashboard read. The 5-minute response time is anomalously fast — could indicate immediate-rejection (DISC-019 Notional V3 pattern, AI Report dismissal) or genuine triager engagement. Resolution unblocks the methodology-refactor validation question (`feedback_strategic_recon_format.md` related, but specifically: does R8 + 5-target checklist + paste-ready format restore triager acceptance after the Notional AI-Report dismissal?).

**Tags:** #operator-pending #methodology #methodology-refactor

---

## #8 — Are Balancer V3 Gyro2CLPPool + GyroECLPPool deployed via Balancer V3 factories (and thus in-scope)?

**Status:** OPEN

**First-surfaced:** 2026-05-26 (Balancer Immunefi Gate 1)

**Hunt context:** `hunts/2026-05-26-balancer-immunefi-gate1.md` line 43 ([ASSUMED]: factory listing confirmation needed)

**Answer:** Gate 2 must verify via on-chain deployment lookup before drafting any Gyro-specific PoC. Tied to question #9 (CowPoolFactory same-class scope verification).

**Tags:** #solidity #operator-pending #scope-clarify #gate-2-prep

---

## #9 — Is CowPoolFactory listed in the Balancer V3 full 38-asset scope?

**Status:** OPEN

**First-surfaced:** 2026-05-26 (Balancer Immunefi Gate 1)

**Hunt context:** `hunts/2026-05-26-balancer-immunefi-gate1.md` line 44 (HALT-PIVOT FLAG: full 38-asset scope not enumerated in partial WebFetch)

**Answer:** Pending full-scope-table re-pull (WebFetch pagination limitation, same class as Olympus #11 below). Gate 2 must verify before any CowPool-specific PoC draft. Operator may use Immunefi authenticated session to enumerate full list.

**Tags:** #solidity #operator-pending #scope-clarify #webfetch-pagination

---

## #10 — Does any Balancer V3 factory (Weighted/Stable/StableSurge) enforce a timelock before deploying new pools?

**Status:** OPEN

**First-surfaced:** 2026-05-26 (Balancer Immunefi Gate 1)

**Hunt context:** `hunts/2026-05-26-balancer-immunefi-gate1.md` line 145 ([ASSUMED]: per-factory admin-gate investigation deferred to Gate 2)

**Answer:** No timelock at Vault level confirmed via `VaultExtension.sol:181 _registerPool`. Each factory has independent admin gates — needs per-factory inspection. DC-9 sub-2 (zero-timelock migration) candidate. Gate 2 source-dive will resolve.

**Tags:** #solidity #DC-9 #gate-2-prep

---

## #11 — What are the 60 unverifiable Olympus V3 assets in scope pages 2-5?

**Status:** OPEN

**First-surfaced:** 2026-05-26 (Olympus Immunefi Gate 1)

**Hunt context:** `hunts/2026-05-26-olympus-immunefi-gate1.md` lines 34, 55, 300 (60 of 72 assets [ASSUMED]; SPA-paginated, not WebFetch-able)

**Answer:** Pending operator-mediated full-scope enumeration (Immunefi authenticated session needed to overcome SPA pagination). Specifically blocks scope-verify on ConvertibleDepositFacility + BLVaultManagerLido (the highest-EV lens hits live in [ASSUMED]-scope substrate, see lines 86, 220-221, 230).

**Tags:** #solidity #operator-pending #scope-clarify #webfetch-pagination

---

## #12 — Does Rhino.fi UI commitmentId issuance flow bind permit + amount tightly?

**Status:** OPEN

**First-surfaced:** 2026-05-26 (Rhino.fi Immunefi Gate 1)

**Hunt context:** `hunts/2026-05-26-rhinofi-immunefi-gate1.md` lines 384-388, 460 (C8 [ASSUMED] → [INSPECTED] upgrade path)

**Answer:** Operator decision point — fund 1-2 hours of off-chain UI flow analysis + commitmentId issuance API recon. If binding is loose → escalate to Gate 2 with M-severity (EV ~$5K-$20K). If binding is tight → C8 dies, no Gate 2. Documented in `hunts/2026-05-26-brain-proposals-applied-ledger-v3.md` line 73.

**Tags:** #solidity #operator-pending #off-chain-recon

---

## #13 — Does Rhino.fi Blast configure-call yield-accounting behave correctly on intermediate transfer?

**Status:** OPEN

**First-surfaced:** 2026-05-26 (Rhino.fi Immunefi Gate 1)

**Hunt context:** `hunts/2026-05-26-rhinofi-immunefi-gate1.md` line 307 ([ASSUMED] Blast-side bytecode verification required)

**Answer:** Pending Blast-side bytecode verification per Doctrine #24 (`solc --standard-json` direct compile against canonical Blast yield contracts). Resolution upgrades C-Blast finding from [ASSUMED] to [INSPECTED]; potential M-severity.

**Tags:** #solidity #cross-domain #bytecode-verify

---

## #14 — Did Raydium CLMM `tick_spacing_index` saturating_mul ever clamp incorrectly during non-volatility-saturated windows?

**Status:** OPEN

**First-surfaced:** 2026-05-26 (Raydium Immunefi Gate 1)

**Hunt context:** `hunts/2026-05-26-raydium-immunefi-gate1.md` lines 199, 212, 235 (HUNT-CAND-7 [ASSUMED], operator-decision Gate 2 cycle)

**Answer:** OPEN — Gate 2 cycle requires Foundry-equivalent PoC measurement of `bounded_sqrt_price` floor at MIN_TICK across realistic swap traces. EV ~$12K, below typical Gate 2 threshold. Operator decision pending whether to invest cycle.

**Tags:** #rust-solana #DC-7 #gate-2-prep #ev-marginal

---

## #15 — Does Raydium CLMM `update_dynamic_fee_index` re-ordering produce observable economic effect across call boundary?

**Status:** OPEN

**First-surfaced:** 2026-05-26 (Raydium Immunefi Gate 1)

**Hunt context:** `hunts/2026-05-26-raydium-immunefi-gate1.md` line 220 (HUNT-CAND-14 [ASSUMED])

**Answer:** OPEN — Self-corrected at line 787 of source; needs mid-call read by integrating program to construct observable effect. Same operator-decision Gate 2 cycle as #14.

**Tags:** #rust-solana #gate-2-prep #ev-marginal

---

## #16 — Does Raydium CLMM `get_price_at_tick(tick, false)` vs `get_price_at_tick(tick, true)` round-trip produce >1-ULP discrepancy at extreme ticks?

**Status:** OPEN

**First-surfaced:** 2026-05-26 (Raydium Immunefi Gate 1)

**Hunt context:** `hunts/2026-05-26-raydium-immunefi-gate1.md` line 228 (HUNT-CAND-18 [ASSUMED], Pattern E arithmetic-rounding-asymmetry)

**Answer:** OPEN — Anchor candidate for CANDIDATE-E (arithmetic-rounding-asymmetry family) extension. Worked-example PoC needed at extreme tick values (MIN_TICK, MAX_TICK, near-zero). Same operator-decision cycle as #14, #15.

**Tags:** #rust-solana #CANDIDATE-E #gate-2-prep

---

## #17 — Did ALEX team abandon Stacks Clarity pools post-XLink-exploit, or is the dev branch dormancy intentional?

**Status:** OPEN

**First-surfaced:** 2026-05-26 (ALEX Immunefi Gate 1)

**Hunt context:** `hunts/2026-05-26-alex-immunefi-gate1.md` lines 47, 169, 229, 277 (dead-substrate anchor [ASSUMED]; 24+ month no-commit pattern; 0.25× multiplier first-calibration)

**Answer:** OPEN — Hypothesis: team migrated focus or wound down post-XLink-bridge exploit. The dead-substrate-multiplier (0.25×) is a first-calibration value; validate on next dead-substrate target (likely Yearn V2 or other zombie programs). Doctrine-promotion candidate if pattern recurs.

**Tags:** #clarity-stacks #dead-substrate #doctrine-candidate

---

## #18 — Is Clarity-keyword set used in V6 detectors comprehensive enough for ALEX-class targets?

**Status:** OPEN

**First-surfaced:** 2026-05-26 (ALEX Immunefi Gate 1)

**Hunt context:** `hunts/2026-05-26-alex-immunefi-gate1.md` line 306 (false-negative class confirmed on ALEX; iterative expansion expected)

**Answer:** OPEN — Buzz has no Clarity detector yet (per line 319: triggering build only when ROI justifies OR operator dispatches second Clarity target). Recurring with #6 — both are substrate-gap signals.

**Tags:** #clarity-stacks #substrate-gap #detector-roadmap

---

## #19 — Should Lane1-Substrate-Coverage.md be created or folded into existing brain doc?

**Status:** OPEN

**First-surfaced:** 2026-05-26 (ALEX Immunefi Gate 1)

**Hunt context:** `hunts/2026-05-26-alex-immunefi-gate1.md` line 332 ([ASSUMED] Lane1-Substrate-Coverage.md doesn't exist yet)

**Answer:** OPEN — Operator decides: new dedicated brain doc, or fold into `brain/Doctrine.md` substrate-coverage table, or fold into `brain/External-Frameworks.md`. Parallel-logic adoption from Percolator precedent. Resolution unblocks substrate-coverage roadmap clarity for #6, #18.

**Tags:** #methodology #operator-pending #doctrine-structure

---

## #20 — Are Filecoin v17 mainnet-deployed miners still affected by the v18 power-repr fix?

**Status:** OPEN

**First-surfaced:** 2026-05-26 (Filecoin Immunefi Gate 1)

**Hunt context:** `hunts/2026-05-26-filecoin-immunefi-gate1.md` line 213 ([INSPECTED] for diff; [ASSUMED] for mainnet-deploy of v17)

**Answer:** OPEN — Requires on-chain deployment-history query for miner actor versions. Gate 2 would EXECUTE this via Lotus RPC or similar. The actual exploit-window question hinges on whether v17 was production-deployed before v18 superseded it.

**Tags:** #rust-substrate #bytecode-verify #gate-2-prep

---

## #21 — Does Filecoin dispute_windowed_post reporter-reward-degradation edge case have realistic-impact at-scale?

**Status:** OPEN

**First-surfaced:** 2026-05-26 (Filecoin Immunefi Gate 1)

**Hunt context:** `hunts/2026-05-26-filecoin-immunefi-gate1.md` lines 83, 90, 156, 196 ([ASSUMED] reporter-reward = 0 when miner deeply underwater)

**Answer:** OPEN — Gate 2 economic analysis required: simulate miner balance-sheet at various penalty depths, measure reporter-reward distribution. Likely by-design (penalty-priority drains before reward), but worth quantifying the dispute-economy degradation curve.

**Tags:** #rust-substrate #economic-analysis #gate-2-prep

---

## #22 — Did Across-Protocol migrate FROM Immunefi TO self-hosted email between 2026-05-23 and 2026-05-26?

**Status:** RECURRING

**First-surfaced:** 2026-05-26 (Across pre-clone halt)

**Hunt context:** `hunts/2026-05-26-across-immunefi-gate1-PRE-CLONE-HALT.md` lines 43-45, 218 (two-source conflict; alternative explanation: Buzz watchlist data inaccurate at scrape time)

**Answer:** RECURRING — third-instance of Buzz-watchlist-vs-live-state divergence within May 2026 (priors: Sherlock contest #990 FINISHED status not in watchlist, Cap-Sherlock anchor; Cantina program ambiguity). Promotion candidate: add a Lane 5 freshness-check pre-Gate-1 hook to compare watchlist `last_verified_at` vs current time. Operator decision required on Across submission path before resolution.

**Tags:** #methodology #lane-5-freshness #RECURRING #platform-migration

---

## #23 — Does Stacks sBTC withdraw-asset path enforce same protocol-caller gate as mint?

**Status:** OPEN

**First-surfaced:** 2026-05-26 (Stacks Immunefi Gate 1)

**Hunt context:** `hunts/2026-05-26-stacks-immunefi-gate1.md` line 481 (C2 candidate pending PDF-read DUP-check)

**Answer:** OPEN — C2 candidate, parallel question to #1 (which resolved sBTC mint path). The withdraw path has separate caller-validation; needs grep-confirmation analogous to #1's grep line 30 anchor. Bundled with operator PDF-read DUP-check.

**Tags:** #clarity-stacks #DUP-check #methodology

---

## #24 — Does any Bascule V3 caller construct depositID without binding amount + recipient + chainid + nonce?

**Status:** OPEN

**First-surfaced:** 2026-05-21 (Lombard Gate 1)

**Hunt context:** `hunts/2026-05-21-lombard-gate1.md` lines 155, 157, 247 (DC-7 hunt-candidate: enumerate all `IBascule.validateWithdrawal` callers)

**Answer:** OPEN — Callsite-correctness question. Lesson filed: when reading Bascule-like primitives, always enumerate callers to verify field-binding. Detector spec candidate: AST walker over `validateWithdrawal` / `reportDeposits` callsites that flags depositID constructions missing any of {amount, recipient, chainid, nonce}.

**Tags:** #solidity #DC-7 #detector-roadmap #callsite-analysis

---

## #25 — Should the 2 in-scope TruFin Ethereum addresses be bytecode-verified against TruStakeMATICv2 + TruStakePOL canonical deployments?

**Status:** OPEN

**First-surfaced:** 2026-05-21 (TruFin Gate 1)

**Hunt context:** `hunts/2026-05-21-trufin-gate1.md` lines 34, 185-187 (operator should bytecode-verify; Doctrine #24 `solc --standard-json` direct compile)

**Answer:** OPEN — Pre-Gate-2 prerequisite. Methodology different for Solana program (TruSOL uses `solana program show <program-id>` + `cargo-build-sbf`); Solidity uses Doctrine #24 path. Both verifications gate any Gate 2 submission.

**Tags:** #solidity #rust-solana #bytecode-verify #gate-2-prep

---

## #26 — Does Coinbase cb-mpc accept arbitrary participant input without re-verifying session binding (DC-8 MPC analog)?

**Status:** OPEN

**First-surfaced:** 2026-05-21 (Coinbase cb-mpc research)

**Hunt context:** `hunts/2026-05-21-coinbase-cb-mpc-research.md` lines 102, 169 (DC-8 analog in MPC: participant-validation-out-of-session-state)

**Answer:** OPEN — Cross-pollination candidate: DC-8 (Anchor-Signer-Validation moved out of Accounts struct) may extend from Solana to MPC. Filing candidate for `brain/Cross-Domain-Fragility-Laws.md`. Requires cb-mpc source-read to verify or refute. EV high if confirmed (Coinbase H1 bounty tier).

**Tags:** #mpc #DC-8 #cross-domain #cross-pollination

---

## #27 — Should Buzz invest in HE-18 Go AST coverage to unlock dydx-v4 + Cosmos targets?

**Status:** RECURRING

**First-surfaced:** 2026-05-23 (dydx-v4 first attempt)

**Hunt context:** `hunts/2026-05-26-dydx-v4-immunefi-gate1-PRE-CLONE-HALT.md` lines 19-20, 65-78 (substrate-mismatch trigger STILL active 3 days post first surfacing); `brain/Doctrine.md` line 411, 427, 900 (detector specs #129, #137, #138, #165 filed)

**Answer:** RECURRING — third surfacing within 7 days (May 23, May 26 prep, May 26 halt). Combined with #6 + #18 = clearest pattern-gap signal in the entire tracker. Promotion: should be elevated to standing brain doc (`brain/Substrate-Coverage-Roadmap.md` candidate, or fold into #19). Operator decision: greenlight detector build vs continue cycling Solidity/Rust-Solana targets.

**Tags:** #go-cosmos #substrate-gap #detector-roadmap #RECURRING #operator-pending

---

## #28 — Is Lane 4 Phase 0A corpus collection plan greenlit for next idle window?

**Status:** OPEN

**First-surfaced:** 2026-05-21 (Lane 4 Phase 0A plan)

**Hunt context:** `hunts/2026-05-21-lane4-phase0a-corpus-plan.md` line 205 (operator greenlight pending)

**Answer:** OPEN — Research-only task; will proceed in next idle window per Hyperactive Formula step rotation. Not blocking any current Gate 1/2/submission. Closure when 0A.1 inventory + sampling deliverable lands.

**Tags:** #lane-4 #operator-pending #methodology

---

## #29 — Does the Olympus ConvertibleDepositFacility dust-conversion mechanic produce a measurable exploit magnitude across realistic vault states?

**Status:** OPEN

**First-surfaced:** 2026-05-26 (Olympus Immunefi Gate 1)

**Hunt context:** `hunts/2026-05-26-olympus-immunefi-gate1.md` lines 220-221, 230 (Code [INSPECTED]; Exploit construction [ASSUMED]; Foundry PoC needed)

**Answer:** OPEN — Double-blocked: (a) scope-verify (question #11), (b) Foundry PoC magnitude measurement. Gate 2 cannot escalate until both resolved. Highest-EV lens hit in Olympus surface map.

**Tags:** #solidity #foundry-poc #gate-2-prep #ev-high

---

## #30 — Will the methodology refactor (post-Notional AI-Report dismissal) restore submit→paid conversion rate?

**Status:** OPEN

**First-surfaced:** 2026-05-25 (DISC-019 Notional V3 closed as "AI Report")

**Hunt context:** `MEMORY.md` `project_disc019_notional_submitted.md`; `brain/Security-Research-Submission-Ledger.md` lines 36-37, 337 (methodology refactor = only path to recover conversion rate)

**Answer:** OPEN — Tracking question across N future submissions. First post-refactor test = DISC-020 Filecoin #79987 (question #7). Need at least 3 post-refactor data points to establish trend. Tally check 2026-05-26: live submissions = 1 (Firedancer), submitted-this-week 3, paid-this-week 0.

**Tags:** #methodology #methodology-refactor #operator-pending #measurement

---

## #31 — When both Step 0 (prior-corpus lookup) and Step 1 (Platform STATUS preflight) fire on the same dispatch, which precedence rule governs?

**Status:** OPEN (recurrence=3 across single afternoon 2026-05-26)

**First-surfaced:** 2026-05-26

**Hunt context:** `hunts/2026-05-26-across-immunefi-gate1-PRE-CLONE-HALT.md` (Across — Step 1 surfaced platform migration), `hunts/2026-05-26-dydx-v4-immunefi-gate1-PRE-CLONE-HALT.md` (dYdX V4 — Step 0 surfaced prior 2026-05-23 Gate 1), `hunts/2026-05-26-lombard-immunefi-gate1-PRE-CLONE-HALT.md` (Lombard — Step 0 surfaced prior 2026-05-21 Gate 1).

**Answer:** OPEN — both checks can halt the same dispatch; the order in which they fire affects which artifact gets surfaced first. Provisional procedural ordering: Step 0 BEFORE Step 1 (cheaper to check, doesn't burn a WebFetch). Operator decision pending — encode in `.claude/rules/standing-intake-protocol.md` once Edit-tool harness unblock resolves.

**Tags:** #methodology #standing-intake #step-0 #step-1 #procedural

---

## #32 — Is Doctrine #29 v1.1 two-sided MIN-cap better filed as a "missing defense" pattern or a "present defense" pattern?

**Status:** OPEN (recurrence=2)

**First-surfaced:** 2026-05-26

**Hunt context:** `hunts/2026-05-26-olympus-immunefi-gate1.md` (filed Doctrine #29 v1.1 as DEFENSE PRESENT — validates implementation), `hunts/2026-05-26-balancer-immunefi-gate1.md` (filed Doctrine #29 v1.1 as DEFENSE ABSENT — surfaces finding).

**Answer:** OPEN — the doctrine fires correctly in both framings, but lens-teaching to future Gate 1 sub-agents needs a canonical framing. Resolution affects sub-agent prompt-templates: "look for MIN-cap absence" vs "verify MIN-cap presence" produces different scan paths.

**Tags:** #methodology #doctrine-29 #lens-framing

---

## #33 — When a doctrine has dual sub-types (A/B like Doctrine #37, PRESENT/ABSENT like Doctrine #29 v1.1), does each sub-type require its own 2-anchor promotion path, or does aggregate count across sub-types satisfy PERMANENT promotion?

**Status:** OPEN (recurrence=2)

**First-surfaced:** 2026-05-26

**Hunt context:** `brain/Doctrine.md:2610` (Doctrine #37 spec requires 2 A-anchors AND 2 B-anchors); DC-7 sub-pattern family has 3 anchors across sub-types but no clear PERMANENT promotion rubric per Weekly Synthesis 2026-05-26 PATTERNS section.

**Answer:** OPEN — operator decision needed on whether dual-sub-type doctrines need per-sub-type anchor count or aggregate count. Affects DC-7 cross-language family promotion + Doctrine #29 v1.1 framing + future dual-sub-type doctrines.

**Tags:** #methodology #doctrine-promotion #operator-pending

---

_Brain Open Questions Tracker | v1.1 | 2026-05-26 | 33 questions (30 v1.0 + 3 fed back from Weekly Synthesis 2026-05-26 Q-1..Q-3; Synthesis Q-4 deduplicated against existing #7) | Maintenance: every Gate 1 brain-proposal cycle MUST update_
