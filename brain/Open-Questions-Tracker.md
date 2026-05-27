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

**Pillar tags (v1.8 four-pillar extension, 2026-05-27):** Every new question MUST carry exactly one pillar tag among `[P1]` (Token Scoring) / `[P2]` (HSaaS / Content) / `[P3]` (Corpus) / `[P4]` (Bug Research) / `[CROSS]` (≥2 pillars). Questions #1–#41 are all `[P4]` (the original Self-Correction Layer scope was Pillar 4 hunts). Questions Q-P1-N, Q-P2-N, Q-P3-N, Q-CROSS-N follow below.

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

---

## Q-34: Does Pancake Infinity Router enforce slippage against pre-hookDelta or post-hookDelta `delta`?

**First-surfaced:** 2026-05-27

**Hunt context:** `hunts/2026-05-27-pancakeswap-v4-immunefi-gate1.md` finding-candidate P-1. CLPoolManager.sol:209-211 emits `delta` to vault AFTER `delta = delta - hookDelta` subtraction. Slippage enforcement is in periphery (Universal Router / Infinity Router) — NOT cloned this Gate 1 due to disk halt 94%. Load-bearing assumption for P-1 promotion to Gate 2 + bounty submission.

**Answer:** ANSWERED 2026-05-27 (Gate 2 PoC). The actual structural answer is more pointed than Q-34 framed: the Pancake Infinity Router does NOT enforce any per-hop slippage at all in multi-hop swaps. `CLRouterBase._swapExactInput` (`infinity-periphery/src/pool-cl/CLRouterBase.sol:40-65`) iterates the path, propagates each hop's `amountOut` as next hop's `amountIn`, and applies `params.amountOutMinimum` exactly once at loop end against the composed final output. The post-hookDelta value of every intermediate hop flows unchecked downstream. P-1 is therefore confirmed: exploit primitive exists for any multi-hop path through ≥1 hook-bound pool. PoC at `infinity-periphery/test/pool-cl/InfinityRouterSlippageDoubleCountPoC.t.sol` — 2-hop leaks 119.5 bps versus 1-hop 60 bps on identical 5% end-to-end envelopes with a 25-bps hook fee. Resolution: (a)-style — exploit primitive exists, P-1 PROMOTES to paste-ready (`data/lane1/gate2-clones/pancake-p1-infinity-router-slippage-paste-ready-v2.md`).

**Tags:** #candidate-O #pancakeswap-infinity #gate2-confirmed #b1-cross-pollination #answered

---

## Q-35: Does Pancake Infinity Universal Router accept per-route `minAmountOut=0`?

**First-surfaced:** 2026-05-27

**Hunt context:** Sibling to Balancer B-1 BatchRouter question. If Pancake Universal Router accepts per-route minAmountOut=0 in batch swaps AND Q-34 resolves to PRE-hookDelta, B-1's exploit class is directly replicable on Pancake Infinity with the same Foundry-fork PoC pattern.

**Answer:** ANSWERED 2026-05-27 (Gate 2 PoC). The Pancake Infinity Router is even more structurally exposed than the framing assumed: there is no per-step `minAmountOut` parameter to even pass `0` to. The `CLSwapExactInputParams` struct (`ICLRouterBase`) has exactly four fields — `currencyIn`, `path[]`, `amountIn`, `amountOutMinimum` — and `amountOutMinimum` applies only to the composed end. The same shape holds for `BinSwapExactInputParams`, and for the exact-out duals (`CLSwapExactOutputParams` + `BinSwapExactOutputParams`). Four multi-hop loops in two router-base contracts all share the floor-absent shape. P-1 PROMOTES.

**Tags:** #candidate-O #pancakeswap-infinity #gate2-confirmed #b1-cross-pollination #answered

---

## Q-36: Stader trusted-node colluding-threshold gameability under PoR-mode toggle

**First-surfaced:** 2026-05-27

**Hunt context:** `hunts/2026-05-27-stader-ethx-immunefi-gate1.md`. StaderOracle has dual ER-update paths: (a) trusted-node consensus (`submitExchangeRateData`, requires `trustedNodesCount/2 + 1` attestations) and (b) Chainlink PoR feed (`updateERFromPORFeed`, permissionless trigger). Manager toggles between modes via `togglePORFeedBasedERData` (StaderOracle.sol:614, manager-role only). Open question: does the trusted-node mode actually require off-chain consensus, or can a manager-induced PoR-mode-toggle create a permission asymmetry where (a) trusted-node compromise + (b) PoR-mode race-toggle combine to bypass the inspection-mode 5% guard?

**Answer:** SUPERSEDED-BY-FORECLOSURE — Gate 2 dispatch 2026-05-27 Phase 0 dedup foreclosed the DC-12 staleness primitive on which this question depends (see Q-39). Trusted-node trace remains theoretically open but loses dispatch priority: even if asymmetry exists, the staleness primitive needed to weaponize it is already publicly flagged + fixed. Park as background research, not a paste-ready path. (Foreclosure receipt: `hunts/2026-05-27-stader-ethx-gate2-foreclosure.md`)

**Tags:** #stader-ethx #dc-12 #manager-privilege #foreclosed-dedup

---

## Q-39: Are all 5 Stader ETHx Gate 1 candidates (G2-CAND-1..5) foreclosed by prior public audits + LST design semantics?

**First-surfaced:** 2026-05-27 (Gate 2 dispatch Phase 0 dedup)

**Hunt context:** `hunts/2026-05-27-stader-ethx-immunefi-gate1.md` queued 5 Gate 2 candidates. Phase 0 dedup against C4 2023-06-stader (M-09, M-14) + Halborn V2 (HAL-04, HAL-09, HAL-11) + Sigma Prime V2 (ETHX2-07 + ETHX2-20 area) + re-analysis of UserWithdrawalManager finalize semantics:
- G2-CAND-1 (DC-12 PoR staleness) → **FORECLOSED**: C4 M-14 + Halborn HAL-09 both VALID + fix published. Submission would be instant-DUP.
- G2-CAND-2 (UserWithdrawalManager MIN-cap asymmetry) → **NOT-A-BUG**: re-read of UserWithdrawalManager.sol:147-167 shows MIN is intentional sandwich-protection. Rate-delta accrues to remaining ETHx holders (Lido/RocketPool canonical LST pattern). `ethRequestedForWithdraw -= requiredEth` is correct liability bookkeeping; the "excess" that stays in pool is NOT stolen — it boosts the rate for non-withdrawing holders. Triager-instant-reject.
- G2-CAND-3 (Manager.deposit single-source oracle) → **WEAK**: trust-model dependent; trusted-node attack partially covered by Halborn HAL-11 + Sigma Prime ETHX2-07. No concrete attack PoC at Gate 1 depth.
- G2-CAND-4 (`depositETHOverTargetWeight` permissionless trigger) → **FORECLOSED**: C4 M-09 already flags `poolIdArrayIndexForExcessDeposit` manipulation.
- G2-CAND-5 (`maxNonRedeemedUserRequestCount` DoS) → **OOS**: self-flagged at Gate 1 as informational only.

**Answer:** YES, ANSWERED — all 5 G2 candidates foreclosed. Stader ETHx HEAD `9d4a921` (5+ months stale) is too thoroughly audited for paste-ready bounty extraction at current research depth. Foreclosure receipt + brain compound filed.

**Doctrine implication:** Reinforces a corollary to Doctrine #29 v1.1 — when a target has been audited by ≥3 reputable firms AND is HEAD-stale (5+ months no commit), the prior-corpus probability of paste-ready bounty extraction collapses toward zero on the audited surface. Heavily-audited stale targets should drop EV-rank automatically (proposed multiplier: 0.25× when ≥3 firms + HEAD-stale, applied at Step 3 EV calculation in Standing-Intake-Protocol).

**Tags:** #stader-ethx #foreclosure #brain-compound #ev-multiplier-proposal

---

## Q-37: Does the BatchRouter slippage-double-count exploit class transfer to Balancer V3 `swapExactOut` paths (vs the `swapExactIn` proven in B-1)?

**First-surfaced:** 2026-05-27

**Hunt context:** B-1 PoC (`pkg/pool-hooks/test/foundry/BatchRouterSlippageDoubleCountPoC.t.sol`) demonstrates the structural property on `batchRouter.swapExactIn`. The exact-out path (`BatchRouterHooks.sol::_swapExactOutHook` ~line 380+) is the dual: per-step `maxAmountIn` would be the analog cap. If exact-out also strips per-step caps (likely — same write-once design), the exploit surface is symmetric and bounty severity strengthens (catches users of either direction).

**Answer:** OPEN — extend PoC with `_swapExactOutHook` test, 60-min effort. Cheap to disprove; doubles attack surface if confirmed. Tag in paste-ready footer if added pre-submission.

**Tags:** #candidate-O #balancer-v3 #b1-extension

---

## Q-38: Does the same composition surface (per-step minOut=0 + hook-side approximation) exist in `ECLPSurgeHook` deployments?

**First-surfaced:** 2026-05-27

**Hunt context:** B-1 PoC uses StableSurgeHook. ECLPSurgeHook (asymmetric concentrated-liquidity surge variant, in-scope at `pkg/pool-hooks/contracts/ECLPSurgeHook.sol`) has a different fee-curve approximation. If its approximation drift is structurally similar (and the same BatchRouter behavior applies — confirmed: BatchRouter is hook-agnostic), the bounty submission can be widened to "all SurgeHook variants" before triager pickup. ~30-min Foundry test extension.

**Answer:** OPEN — file as bounty-widening follow-up if operator approves B-1 paste-ready.

**Tags:** #candidate-O #balancer-v3 #eclp #b1-extension

---

## Answer log for Q-34 + Q-35 (post-B-1)

**Q-34/Q-35 status update 2026-05-27 ~00:35 UTC:** Balancer B-1 PoC CONFIRMS the slippage-double-count exploit class is real and live in production-default parameter regimes (`data/lane1/gate2-clones/balancer-b1-batchrouter-slippage-paste-ready-v2.md`). The Pancake Infinity cross-pollination dispatch (row 47 in Crossmap v2.3) is now GO. Q-34 + Q-35 resolution still requires the Pancake periphery clone — but the cross-anchor confirmation is the highest-EV unblock.

_Brain Open Questions Tracker | v1.4 | 2026-05-27 ~00:35 UTC | 38 questions (36 v1.3 + Q-37 + Q-38 from Balancer B-1 Gate 2 PoC CONFIRM) | Q-34/Q-35 unblocked downstream by B-1 confirmation_

---

_Brain Open Questions Tracker | v1.5 | 2026-05-27 ~01:25 UTC | 39 questions (38 v1.4 + Q-39 from Stader ETHx Gate 2 dispatch FORECLOSURE; Q-36 superseded-by-foreclosure to Q-39) | EV-multiplier corollary for heavily-audited stale targets queued in Q-39 for operator decision_

---

## Q-40: Are there any Lista PT oracle variants bridging Pyth or Chainlink feed (CLASS C hybrid upstream) that would re-fire DC-12 sub-7h validly?

**Substrate:** `#solidity` `#methodology`
**Status:** OPEN (low priority bookmark)
**Origin:** Lista DAO Moolah Gate 2 dispatch foreclosure (2026-05-27).

**Context.** Lista's `PTLinearDiscountOracle.sol` + `PTLinearDiscountMarketOracle.sol` both consume Pendle `PendleSparkLinearDiscountOracle` which returns `updatedAt = 0` deterministically — CLASS B upstream per Sub-Rule 34.1. DC-12 lens NEGATED. But the Market variant ALREADY mixes a CLASS A upstream (`ResilientOracle.peek(WBNB)`) with the CLASS B linear-discount math — this is CLASS C hybrid. Lista delegates staleness on the CLASS A leg to upstream `ResilientOracle` (Venus fork, multi-firm audited). Question: are there any LATER Lista PT oracle additions that introduce a *new* CLASS A upstream (e.g., a Pyth-fed PT-base-asset) WITHOUT delegating staleness properly? Future Lista commits adding `Pyth*Oracle` or `*Chainlink*` adapter paired with PT discount math = re-fire opportunity.

**Why it matters:** Lista is in active development with audit-agent CI (per Gate 1 finding). New oracle adapters land monthly. The composition window stays open. A future PT-via-Pyth oracle could legitimately surface DC-12 if Lista doesn't propagate Pyth's `publish_time` staleness check into the wrapper layer.

**Resolution path:** Cron-watch `lista-dao/moolah` for new files matching `src/oracle/*Pyth*.sol` or `src/oracle/*Chainlink*.sol` post-2026-05-27. If any land, dispatch a fresh Gate 1 surface scan of the new file with DC-12 lens primed.

**Methodology note:** This is the CLASS B-to-CLASS C pivot pattern. Useful template for any Pendle-integrating protocol that may later add price-bridging adapters.

---

_Brain Open Questions Tracker | v1.6 | 2026-05-27 ~01:50 UTC | 40 questions (39 v1.5 + Q-40 from Lista DAO Moolah Gate 2 FORECLOSURE; Sub-Rule 34.1 monitor-bookmark for future Lista oracle bridges) | DC-12 sub-7h structurally-foreclosed class anchored at Lista PT oracles_

---

## Q-41: Does CANDIDATE-O multi-anchor confirmation across Balancer V3 + Pancake Infinity warrant promotion to a Defense-Class (DC-status)?

**First-surfaced:** 2026-05-27 (Pancake Infinity Gate 2 PoC CONFIRM)

**Hunt context:** Two production-deployed hook-based singleton-vault routers now confirmed to exhibit the same structural pattern: end-of-path-only slippage enforcement composed with permitted per-hop hook deltas. Anchors:
1. **Balancer V3 BatchRouter** — `pkg/vault/contracts/BatchRouterHooks.sol:122-127` explicit `minAmountOut = 0` per non-last step + `StableSurgeHook` approximation drift composing across hops. 2-hop leak 1.09% vs 1-hop 0.55% under default surge parameters (PoC HEAD `80fd29ce4eb6`).
2. **Pancake Infinity Router (CL + Bin paths)** — `infinity-periphery/src/pool-cl/CLRouterBase.sol:40-65` + `infinity-periphery/src/pool-bin/BinRouterBase.sol:42-66` per-step floor absence + `CLHooks.afterSwap`/`BinHooks.afterSwap` permitting positive hookDelta. 2-hop leak 1.195% vs 1-hop 0.600% under 25-bps hook fee (PoC HEAD `f39aef4a1be6`).

Both PoCs CONFIRMED 2026-05-27 within a 90-minute window. Both bytecode-verification-deferred but source SHAs anchored.

**Implication for promotion:** Pattern is no longer a single-anchor candidate. Two independent production deployments by two unrelated teams converge on the same structural shape — strong evidence the pattern is intrinsic to the hook-based singleton-vault architecture family, not an implementation accident. Promotion criteria for DC-status per `Patterns-Defense-Classes.md` (≥2 independent anchors + ≥1 PoC-confirmed leak) appears satisfied.

**Proposed promotion:** CANDIDATE-O → **DC-13: End-of-Path-Only Slippage Composition With Per-Hop Hook Deltas**. Sub-patterns:
- DC-13a: Multi-hop router with per-step floor absence + hook-returns-delta primitive (Balancer V3 + Pancake Infinity confirmed)
- DC-13b: Tentative — any future protocol that delegates per-step bounding to the user via array struct (e.g., the recommended fix) but ships v1 without the array

**Answer:** OPEN — pending operator decision on DC promotion + Patterns-Defense-Classes.md amendment.

**Tags:** #candidate-O #dc-promotion #balancer-v3 #pancakeswap-infinity #multi-anchor #pattern-class-evidence

---

_Brain Open Questions Tracker | v1.7 | 2026-05-27 ~02:25 UTC | 41 questions (40 v1.6 + Q-41 from Pancake Infinity Gate 2 PoC CONFIRM; multi-anchor confirmation of CANDIDATE-O across Balancer V3 + Pancake Infinity queued for DC-promotion operator decision)_

---

# === SECTION P1 — PILLAR 1 (TOKEN SCORING) QUESTIONS ===

*(v1.8 seed: none yet — first operational P1 question emerges when the Phase 1 tweet-draft-generator runs against a token whose scoring outcome doesn't fit cleanly into the 4 tier bands. Anticipated first question: how to score a token that fires CTO_FLAG + clean audit + low FDV gap — does the CTO flag still warrant T-WATCH framing, or does clean-audit + low-FDV elevate to T-QUALIFIED?)*

---

# === SECTION P2 — PILLAR 2 (HSAAS / CONTENT) QUESTIONS ===

## Q-P2-1 — What is the score-tweet → audit-tier inquiry conversion rate, and which template segment converts highest?

**Status:** OPEN

**First-surfaced:** 2026-05-27 (Four-Pillar Brain Extension cycle)

**Hunt context:** `brain/HSaaS-Operations.md` §2 tweet performance schema + §4 prospect-scoring hypotheses (all UNTESTED v1.0). `brain/Content-Playbook.md` §1 tweet format inventory (T-HOT-v22 / T-QUALIFIED-v22 / T-WATCH-v22 / T-FLAG-v22 / T-CAL-v22 — all winner-pending). Phase 1 tweet-draft-generator script (`scripts/hsaas-tweet-draft-generator.sh`, committed 3aa8db0) is the upstream — once it produces drafts that get tweeted, conversion measurement begins.

**Why it matters:** Pillar 2 monetization thesis (HSaaS audit-tier sales: Quick Scan $500 / Full Analysis $1,500 / Swarm $2,500) requires knowing which score-tweet template converts. Without measurement, all 4 templates burn the 3/day cap equally — no compounding. Resolution unblocks template-evolution A/B (HSaaS §5) and template prioritization at cap-bind (CROSS-1 contradiction).

**Answer:** OPEN — measurement requires (a) Phase 1 tweet-publishing cron live, (b) instrumented CTA URL (`shield.buzzbd.ai/audit`) with per-template query parameter, (c) inbound mapping (audit-inquiry → originating tweet ID) in HSaaS-Operations §1 schema. Minimum 30 tweets per template before meaningful winner identification (~3 weeks at 3 tweets/day across 5 templates).

**Tags:** `[P2]` `#measurement` `#conversion-tracking` `#template-evolution` `#hsaas`

---

# === SECTION P3 — PILLAR 3 (CORPUS) QUESTIONS ===

## Q-P3-1 — At what corpus size does Phase 2 consumer become useful vs noise?

**Status:** OPEN

**First-surfaced:** 2026-05-27 (Four-Pillar Brain Extension cycle)

**Hunt context:** `brain/Corpus-Digest-Log.md` §3 era productivity baseline: Phase 1 produced 5.5 findings per 1,000 posts (2009-2011 era). `brain/Lane4-Phase1-Results.md` (existing) anchors the 10-target-author extraction model. Phase 2 consumer build pending (`scripts/lane4-corpus-phase2-consumer.sh` not yet written). Corpus currently at 812K+ records, growing weekly.

**Why it matters:** Without a defensible signal-to-noise threshold, Phase 2 may surface false-positive DETECTOR_SEED rows at corpus scale (LLM classification at 590K+ posts → 1-2% FP class = 5,900-11,800 noise rows). Each noise row routes to a brain file as CANDIDATE-X, polluting the brain compound. Resolution unblocks the Phase 2 consumer cron schedule (currently queued at Wed 06:00 UTC pending build).

**Answer:** OPEN — initial calibration heuristic (untested): require ≥3 corroborating post-IDs across distinct authors before a single DETECTOR_SEED row gets routed to `brain/Patterns-Defense-Classes.md` as CANDIDATE. ≥2 corroborating posts for RUG_PATTERN. ≥1 for GROUND_TRUTH (single-post historical incidents are valid). METHODOLOGY threshold remains operator-decided per filing. Validate after first 3 Phase 2 runs.

**Tags:** `[P3]` `#corpus` `#phase-2` `#signal-to-noise` `#detector-promotion`

---

# === SECTION CROSS — CROSS-PILLAR QUESTIONS ===

*(v1.8 seed: none yet — first cross-pillar question emerges when an event in one pillar produces a measurement gap that only resolution from another pillar can fill. Anticipated first cross-pillar question: when Pillar 1 detects a rug-catch on a token that was ALSO previously flagged by Pillar 4 bug research, does the rug-catch tweet credit Pillar 1 calibration or Pillar 4 research foresight in the methodology framing?)*

---

_Brain Open Questions Tracker | v1.8 | 2026-05-27 | 43 questions (41 P4 + 1 P2 + 1 P3; v1.8 four-pillar section organization added + pillar tag requirement, P1/CROSS sections seeded with placeholders pending first operational entries)_
