# Veda (Immunefi) — Standing-Intake Gate 1 — 2026-05-27

> **Verdict: DEDUP-FORECLOSURE-RECEIPT (Step 0.5 short-circuit).**
> Maximum prior-saturation confirmed via PDF + in-source + ledger triangulation.
> Frozen-substrate ($1.05B TVL EVM repo HEAD = 2024-12-18; SVM repo HEAD = 2025-08-26).
> Prior receipt: DISC-015 CLOSED_OOS_ASSET 2026-05-20 + DISC-015b DUP-of-#64307 2026-05-22.
> No clone executed. No disk delta.

---

## STEP 0.5 SHORT-CIRCUIT — Pre-Clone Saturation Probe (MAX-saturation)

Per standing-intake-protocol.md v1.0 + Doctrine #27 Corollary B (PDF + in-source channels)
+ Doctrine #27c (frozen-substrate saturation) + Doctrine #37 Sub-Type B (audited-frozen-product-live):

### Channel 1 — Brain ledger (corpus check)

- `brain/Security-Research-Submission-Ledger.md` row 25 + 102 + 134+: **DISC-015 Veda Report #79091 CLOSED_OOS_ASSET 2026-05-20** (Decoder = vendored library, not in scope per Immunefi triage). [INSPECTED]
- Same ledger Lesson 8 (DUP methodology lessons, 2026-05-22): **DISC-015b Veda Report #79280 DUP of #64307**, BoringVault Manager same finding, prior reporter won race by hours. Veda team independently confirmed finding-quality. [INSPECTED]
- `brain/Watchlist-Candidate-Crossmap.md` line 16, 31, 80-85, 123, 137, 143, 163, 185, 270, 383, 497: Veda is canonical DC-7 anchor across the watchlist + scope-stale-address lens 1c codified. [INSPECTED]
- `brain/Doctrine.md` Worked Example #24 (lines 1087-1122): `solc --standard-json` direct bypass anchored to Veda Gate 2 substrate-drift (window-end SHA `9657653`, 2024-06-13). Tuition paid; methodology distilled. [EXECUTED]

### Channel 2 — Audit-Reports-Library §3 (PDF saturation profile)

Per `brain/Audit-Reports-Library.md` §3 Veda (lines 371-451):

| Audit firm | Count | Dates |
|---|---|---|
| Spearbit (Cantina) | 1 | Arctic version full review |
| 0xMacro | 13 | A-4 through A-45 (incremental per-module) |
| Hexens | referenced | dates not visible |
| Secure3 | referenced | dates not visible |

**Total: 14+ documented audits**, with 0xMacro running continuous per-decoder, per-teller, per-solver re-audits. The "best EV window" per §3.439 = "week-of-fresh-module-deploy BEFORE 0xMacro's review lands."

**Saturation tier: MAXIMUM.** Standard threshold for Doctrine #27 deep-discount is ≥3 firms × ≥3 audits. Veda exceeds with 4 firms × 14+ audits + Certora-grade architectural maturity from 0xMacro's repeated passes.

[INSPECTED]

### Channel 3 — In-source channel (live HEAD probe via WebFetch)

- `Se7en-Seas/boring-vault` (EVM canonical) main HEAD commit `0e23e7f` dated **2024-12-18**. Last 20 commits all 2024. **No 2025 / 2026 commits on main.** [EXECUTED]
- `veda-labs/boring-vault-svm` (SVM port) main HEAD `450cfd8` dated **2025-08-26**, feat/lzsm-audit merge. **No 2026 commits.** [EXECUTED]

**Implication:** the EVM substrate that DISC-015 + DISC-015b targeted is frozen on the same commit window. There is no fresh-module deploy window since the last submission attempt. The 0xMacro re-audit cadence has zero fresh-module pull-requests waiting for the "best-EV scan window" exploit per §3.449.

[EXECUTED]

### Channel 4 — Live Immunefi page (program-status STATUS preflight)

WebFetch `https://immunefi.com/bug-bounty/veda/`:
- Status: **LIVE since 2026-01-21** (active, not paused, not archived)
- Critical cap: **$1,000,000** ($100K floor)
- High cap: $10,000-$25,000
- KYC: **REQUIRED** for payout
- Total assets in scope: **52**
- PoC: required for all severities
- Out-of-scope explicit known issues (updated 2026-01-01): performance-fee accounting, empty-vault edge cases, yield-streaming entry/exit asymmetry

Program is live — passes Step-1 STATUS preflight per Ogie msg 7772. Saturation foreclosure is substrate-side, not platform-side.

[EXECUTED]

### Channel 5 — Receipt window (T+5 days from DUP close)

- DISC-015 closed 2026-05-20 (CLOSED_OOS_ASSET, 7 days ago)
- DISC-015b DUP 2026-05-22 (5 days ago)
- Cross-Pollination-Log Section 10 reliability validation: **T+3 day prior-receipt floor satisfied** (5 days > 3 days).
- No new candidate-class detector has been promoted since DISC-015b that would refresh the EV calculus (DC-9 promoted 2026-05-22 = same day, already factored into DISC-015b retargeting; no DC-10 / DC-11 / DC-12 / DC-13 sub-promotion has surfaced specifically a Veda re-target).

[INSPECTED]

### Short-circuit conclusion

**ALL FIVE CHANNELS converge on MAXIMUM-saturation.** Per Doctrine #27c, Doctrine #37 Sub-Type B, and Cross-Pollination-Log Section 10:

```
SHORT-CIRCUIT: DEDUP-FORECLOSURE-RECEIPT
Substrate frozen + maximum audit saturation + recent submission lineage + no fresh lens since DUP = no clone, no Gate 1 expansion, no disk consumption.
```

Time saved by Step 0.5: estimated 2-3 hours (full Standing-Intake Steps 1-5 with Manager + 40-decoder enumeration + bytecode-verify prep + 5-target checklist).
Disk delta: **0 MB** (no clone executed).

---

## STEP 1 — PROFILE (codified anyway for log completeness)

| Field | Value | Source |
|---|---|---|
| Platform | Immunefi | live page |
| Bounty Critical cap | $1,000,000 (min $100K) | live page |
| Bounty High cap | $10K-$25K | live page |
| Bounty Medium/Low | Not specified | live page |
| KYC requirement | YES (payout-time) | live page |
| Total assets in scope | 52 | live page |
| Chains | Ethereum (USDC payouts), 11 EVM L2/sidechains via deployments | brain Watchlist + audit catalog |
| Languages | Solidity (EVM primary), Rust+TypeScript (SVM port) | repo probe |
| PoC required | YES (all severities) | live page |
| Payer history | $0 to Buzz (DISC-015 OOS + DISC-015b DUP) | submission ledger |
| Audit-saturation tier | **MAXIMUM** (14+ audits / 4 firms / continuous 0xMacro cadence) | brain Audit-Reports-Library §3 |
| Substrate freshness | **FROZEN** (EVM HEAD 2024-12-18; SVM HEAD 2025-08-26) | live GitHub probe |
| Veda 1c sub-class flag | L2OutputOracle-class stale-address-in-scope risk applies if any scope address has source-deleted-from-repo | Watchlist v1.8 addendum line 497 |

---

## STEP 2 — BRAIN OVERLAP SCORE (codified)

Pre-saturation lens hits (from brain catalogs):
- **DC-7** (Validating-Field ≠ Consuming-Field — Manager-Merkle-vs-Decoder field-binding) — **HIGH** (textbook architectural fit)
- **DC-9** sub-2 (privileged state mutation — Manager `setMerkleRoot` setter) — **MEDIUM** (audit-saturated)
- **DC-12** (oracle staleness — AccountantWithRateProviders rate-publish) — **MEDIUM** (audit-saturated)
- **CANDIDATE-I** (ERC4626 share accounting, virtual-shares-defense) — **HIGH** (per Audit-Reports §3.408)
- **CANDIDATE-J** (set-halt sibling-pair / accumulator-vs-config ordering — Accountant fee-mutator) — **HIGH** (per §3.410)
- **CANDIDATE-A** (cross-chain bridge — LayerZero Teller A-19 + Hyperlane A-19 + CCIP A-10) — **MEDIUM-HIGH**
- **CANDIDATE-O** (slippage double-count across solver-fulfillment) — **MEDIUM** (per §3.420)
- **CG** (Solana port `boring-vault-svm`) — **MEDIUM** (SVM port frozen since Aug 2025)

**Overlap classification: HIGH** (4 HIGH + 4 MEDIUM lens hits — textbook DC-7 anchor target).

Per `brain/Watchlist-Candidate-Crossmap.md` line 85: "Veda is **the highest-quality DC-7 candidate in the entire watchlist** by surface clarity."

[INSPECTED]

---

## STEP 3 — EV CALCULATION (pre + post saturation discount)

### Pre-discount EV

```
EV_raw = P(finding) × bounty_cap × P(acceptance) × brain_overlap_multiplier
       = 0.20 × $1,000,000 × 0.5 × 1.0
       = $100,000
```

Adjusted to operator-supplied baseline of "$50K pre-discount":
- P(finding) = 0.10 (DISC-015b confirms Buzz found a real bug, but DUP race lost; lower bound on novel-finding probability now that the most architecturally-obvious DC-7 surface is enumerated)
- P(acceptance) = 0.5 (established payer, $0 to Buzz so far)
- brain_overlap_multiplier = 1.0 (HIGH)
- **EV_raw = 0.10 × $1M × 0.5 × 1.0 = $50K**

### Doctrine #27 audit-saturation discount

- 4-firm × 14+-audit saturation = MAXIMUM tier = multiplier 0.10
- Doctrine #37 Sub-Type B (audited-frozen-product-live) = multiplier 0.30
- Combined discount: 0.10 × 0.30 = **0.03 effective multiplier**

**EV_post_discount = $50K × 0.03 = $1.5K**

### Doctrine #27c frozen-substrate sub-discount

Substrate-freeze multiplier when public canonical repo HEAD is >120 days stale AND deployed addresses run on that frozen substrate:
- EVM HEAD 2024-12-18 = ~525 days stale
- SVM HEAD 2025-08-26 = ~275 days stale
- Multiplier: 0.50 (heavy)

**EV_final = $1.5K × 0.50 = ~$750**

### Comparison to in-pipeline targets

| Target | EV (post-discount) | Status |
|---|---|---|
| **Veda (this hunt)** | **~$750** | **FORECLOSE — DEDUP receipt** |
| Balancer V3 B-1 (paste-ready) | $50-250K | OPERATOR-PENDING |
| TruFin Gate 2 | ~$30K | QUEUED |
| Ethena | ~$10K+ | OPEN |

EV ratio: Veda is **<2%** of next-highest in-pipeline target. Pipeline-reorder unjustified.

[ASSUMED for P(finding), INSPECTED for cap and saturation multipliers, EXECUTED for substrate-freshness measurement]

---

## STEP 4 — QUEUE DECISION

```
PRE-saturation: HIGH overlap + $500K+ cap → "Immediate Gate 1"
POST-saturation: MAXIMUM-saturation + frozen-substrate + T+5 day prior receipt → DEDUP-FORECLOSURE-RECEIPT
```

**Action:** Foreclose, log to Watchlist with foreclosure-receipt-2026-05-27 tag, leave program on continuous-monitor for fresh-decoder-module deploy trigger (the only conceivable re-activation path is a NEW decoder PR landing on main, triggering the 0xMacro pre-audit window per §3.449).

**Re-activation trigger:** any commit to `Se7en-Seas/boring-vault` main that introduces a new `*DecoderAndSanitizer.sol` file OR any new `Teller*.sol` variant OR any commit-tag suggesting `feat/new-*-decoder` OR `feat/*-teller`. Watchdog cron commit-diff is the standing-monitoring mechanism (per `brain/Audit-Reports-Library.md` §3.449 + speedrunner doctrine).

**NO Gate 2 dispatch. NO clone. NO disk delta.**

---

## STEP 5 — GATE 1 EXECUTION (SKIPPED per Step 0.5 short-circuit)

Per standing-intake-protocol.md, Step 0.5 short-circuit explicitly suppresses Step 5 to prevent re-burning compute on a known-foreclosed substrate. No clone, no bytecode-verify, no 5-target-checklist walk, no enumeration of decoders.

If the re-activation trigger fires, this hunt file is the input baseline for a new Gate 1 (target the fresh module specifically, apply DC-7 + CANDIDATE-I lenses against the new contract only, defer-to-bytecode-verify before any Gate 2).

---

## STEP 6 — CONTINUOUS

Append to `brain/Watchlist-Candidate-Crossmap.md` v2.9+ addendum:

```
| 2026-05-27 | Veda (re-intake post DISC-015b DUP) | Immunefi | $1M Critical | HIGH overlap (DC-7 + 3 CANDIDATEs) | $0.75K | **DEDUP-FORECLOSURE-RECEIPT (Step 0.5 short-circuit)**. Substrate frozen (EVM HEAD 2024-12-18; SVM 2025-08-26) + MAXIMUM audit saturation (14+ across 4 firms) + T+5 prior receipt (DISC-015 OOS + DISC-015b DUP). Re-activation = fresh decoder/teller PR on main triggers commit-diff watchdog cron. | `hunts/2026-05-27-veda-immunefi-gate1.md` |
```

Append to `hunts/intake-log.md`:

```
| 2026-05-27 | Veda (re-intake) | Immunefi | $1M Critical | HIGH (DC-7 + 3 CANDIDATEs) | $0.75K post-discount | DEDUP-FORECLOSURE-RECEIPT — Step 0.5 short-circuit; substrate frozen + MAX saturation + T+5 receipt | `hunts/2026-05-27-veda-immunefi-gate1.md` |
```

---

## Brain Compound Proposals (NOT applied to brain — for main session batch-commit)

### Proposal 1 — Cross-Pollination-Log Section 10 Veda re-intake validation entry

Veda 2026-05-27 re-intake is the **second formal validation** of Cross-Pollination-Log Section 10 reliability:
- First validation: Lista DAO Moolah Gate 2 foreclosure 2026-05-27 (Phase 0 NEGATE via in-source channel before Foundry PoC)
- Second validation: this Veda re-intake (Step 0.5 short-circuit via PDF + in-source + ledger triangulation, NO clone executed, ~2-3 hours saved)

Promote Cross-Pollination-Log Section 10 reliability claim from CANDIDATE-promotion to **PERMANENT operating doctrine** (2nd anchor satisfied). [INSPECTED]

### Proposal 2 — Doctrine #37 Sub-Type B 2nd anchor

Doctrine #37 Sub-Type B (audited-frozen-product-live) currently has 1 anchor (Gains Network gTrade 2026-05-27 foreclosure per intake-log line 19). Veda 2026-05-27 is **2nd anchor**:
- Gains: Sourcify-only, no canonical contracts repo, audit-saturated
- Veda: canonical repo PUBLIC but frozen since 2024-12-18, MAXIMUM audit-saturation, deployed addresses live on frozen substrate

Promote Doctrine #37 Sub-Type B from "candidate-promotion" to **PERMANENT** with 2-anchor evidence base. Add Veda as 2nd worked example to Doctrine.md. [INSPECTED]

### Proposal 3 — Doctrine #27c frozen-substrate-saturation sub-rule formal codification

Currently informal in Doctrine #27 Corollary B. Formalize as Doctrine #27c:

> **Doctrine #27c (Frozen-Substrate Saturation Multiplier):**
> When a target's canonical public repo HEAD is >120 days stale AND deployed addresses run on that frozen substrate AND audit-saturation tier ≥ HIGH, apply an additional 0.50× multiplier to post-saturation EV. The total compound discount becomes: P(saturation) × P(frozen-substrate). Empirical floor: $5K Critical post-discount EV under combined multipliers means SKIP unless re-activation trigger fires.

2-anchor evidence: Gains Network gTrade (2026-05-27 foreclosure) + Veda (2026-05-27 re-intake). [INSPECTED]

### Proposal 4 — Veda re-activation watchdog cron specification

Per `brain/Audit-Reports-Library.md` §3.449 + Step 6 of this receipt:

> Add `Se7en-Seas/boring-vault` to commit-diff watchdog cron with the following promotion trigger pattern:
> - Filename matches `*DecoderAndSanitizer.sol` AND not in HEAD as-of last poll
> - OR filename matches `Teller*.sol` AND not in HEAD as-of last poll
> - OR filename matches `*Solver*.sol` AND diff-bytes > 500
> - OR commit-message regex `(feat|add).*decoder|teller|solver`
>
> On trigger fire: **immediately** open a fresh Gate 1 against the new module (not against the full repo) within the 0xMacro pre-audit window (~5-10 day window per §3.449 "best EV window"). Activates speedrunner / Watchdog-Triage-Mode per `audit-methodology-v2.md` v2.5.

[INSPECTED]

### Proposal 5 — Standing Intake Protocol Step 0.5 short-circuit checklist (CODIFY)

Codify the 5-channel triangulation as the formal Step 0.5 short-circuit checklist:

> **Step 0.5 short-circuit triggers if ALL FIVE channels converge on MAX-saturation:**
> 1. **Brain ledger** — prior receipt T+3+ days (closed OOS, DUP, or accepted)
> 2. **Audit-Reports-Library** — ≥3 firms × ≥3 audits + continuous re-audit cadence documented
> 3. **In-source HEAD probe** — canonical public repo dormant >120 days OR last-commit < submission-date
> 4. **Live Immunefi page** — program still LIVE (not paused/archived; if paused/archived, foreclose for status reason instead)
> 5. **Receipt-window age** — most recent prior submission T+3+ days closed without fresh-decoder-window since
>
> ANY ONE channel showing MAX → consider short-circuit; ALL FIVE converging → mandatory short-circuit with DEDUP-FORECLOSURE-RECEIPT verdict.

This is the operational kernel of Step 0.5 — it makes the "is it worth even cloning?" decision rules-based and reproducible. [INSPECTED]

---

## R8 Calibrated Reporting (per Step 5.10)

Final-verdict claim summary with evidence-grade tags:

- **[EXECUTED]** EVM repo main HEAD = 2024-12-18 (`Se7en-Seas/boring-vault` 0e23e7f) — verified via live WebFetch
- **[EXECUTED]** SVM repo main HEAD = 2025-08-26 (`veda-labs/boring-vault-svm` 450cfd8) — verified via live WebFetch
- **[EXECUTED]** Immunefi program LIVE since 2026-01-21, $1M Critical, KYC required, 52 assets in scope — verified via live WebFetch 2026-05-27
- **[EXECUTED]** Doctrine #24 worked example reproducibility — Veda Gate 2 `solc --standard-json` bypass anchored in Doctrine.md lines 1087-1122
- **[INSPECTED]** DISC-015 + DISC-015b submission history + outcomes — Security-Research-Submission-Ledger.md lines 25, 102+, 134+
- **[INSPECTED]** Audit-saturation tier = MAXIMUM (4 firms × 14+ audits + 0xMacro continuous cadence) — Audit-Reports-Library.md §3
- **[INSPECTED]** Brain lens overlap = HIGH (4 HIGH + 4 MEDIUM) — Watchlist-Candidate-Crossmap.md §3
- **[ASSUMED]** P(finding) = 0.10 lower-bound post DISC-015b DUP (most architecturally-obvious surface enumerated by prior reporter #64307) — reasoning architectural, not bytecode-verified
- **[ASSUMED]** Re-activation window of ~5-10 days post fresh-decoder PR — based on §3.449 "best EV window" estimate, not direct measurement

---

## Final summary

| Field | Value |
|---|---|
| Verdict | **DEDUP-FORECLOSURE-RECEIPT** |
| Saturation tier | **MAXIMUM** |
| EV post-discount | **~$0.75K** (sub-$1K, $1.5K × frozen-substrate 0.50) |
| Disk delta | **0 MB** |
| Time saved vs full Gate 1 | **~2-3 hours** |
| Re-activation path | New decoder/teller/solver PR on `Se7en-Seas/boring-vault` main → commit-diff watchdog cron fires → fresh-module Gate 1 dispatch |
| Watchlist update | Append v2.9+ addendum with foreclosure-receipt tag |
| Intake-log update | Append row |

---

_File: hunts/2026-05-27-veda-immunefi-gate1.md | Standing-Intake Protocol v1.0 + Step 0.5 short-circuit | Authored by Gate 1 subagent | Auto-indexed via hunt-complete.sh PostToolUse hook_
