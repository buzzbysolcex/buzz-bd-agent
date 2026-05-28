# Gate 2 — Stader ETHx (Immunefi) — FORECLOSURE RECEIPT

**Date**: 2026-05-27
**Platform**: Immunefi
**Program**: staderforeth
**Bounty cap**: Critical 10% of funds (max $1M), High $100K
**Gate 1 reference**: `hunts/2026-05-27-stader-ethx-immunefi-gate1.md`
**Gate 2 dispatch**: G2-CAND-1 (DC-12 PoR staleness in `StaderOracle.getPORFeedData`)
**Disposition**: **FORECLOSED-ALL-CANDIDATES** at Phase 0 audit-dedup
**Phase reached**: 0 (audit-dedup) — Phases 1-5 (env + PoC build + bytecode-verify + paste-ready) NOT executed
**Time spent**: ~25 min (dedup + re-analysis only)

---

## Phase 0 — Audit dedup outcome

### G2-CAND-1 — DC-12 PoR staleness in `getPORFeedData` → FORECLOSED

| Source | Finding | Status |
|---|---|---|
| Code4rena 2023-06-stader | **M-14** "Chainlink's `latestRoundData` may return stale or incorrect result" — flags `getPORFeedData()` for missing `updatedAt` check | VALID + selected for report |
| Code4rena Issue #15 (primary) | `getPORFeedData()` lines 646-648 ignores `updatedAt` from `latestRoundData()` | VALID (primary, Medium) |
| Code4rena Issue #153 | `StaderOracle#latestRoundData()` may return a stale price | VALID + marked duplicate-15 |
| Halborn V2 (April 2023) | **HAL-09** "Chainlink's latestRoundData might return stale or incorrect result" — `getPORFeedData()` lines 637-651 missing staleness check | VALID — fix recommended |

The exact bug claim (missing `updatedAt` + `answeredInRound` checks in `StaderOracle.getPORFeedData`) is **publicly documented in three separate 2023 audit reports**, with the exact recommended remediation already published. Any submission to staderforeth on this finding would be triager-instant-DUP against the C4 + Halborn public corpus.

**Submission EV**: $0. **Verdict**: foreclosed.

---

### G2-CAND-2 — UserWithdrawalManager MIN-cap asymmetric value leak → NOT-A-BUG (re-analysis after code re-read)

Re-read of `contracts/UserWithdrawalManager.sol:137-179` against the Gate 1 attack hypothesis:

**Gate 1 claim**: protocol always retains upside on oracle-rate divergence → asymmetric value-leak.

**Code semantics**:
- Line 156: `minEThRequiredToFinalizeRequest = Math.min(requiredEth, (lockedEthX * exchangeRate) / ethxDecimals)` — pays MIN of (request-time-promise, finalize-time-rate-value)
- Line 164: `userWithdrawRequests[requestId].ethFinalized = minEThRequiredToFinalizeRequest`
- Line 165: `ethRequestedForWithdraw -= requiredEth` — decrements by request-time value (FULL liability cleared)

**Re-analysis**: This is the **canonical LST design pattern** (Lido + RocketPool implement identical semantics):
1. The MIN-cap is a **sandwich-protection feature** (Stader docs: "minimum of the unstake-time and finalization-time rate")
2. On rate-decrease (e.g., slashing event): user receives less than originally promised — **this is intentional risk-transfer**, slashing risk lives with stakers, not the pool
3. On rate-increase: user receives originally-promised amount — **this is the cap that prevents over-payment to fast-finalizers**
4. The "delta" that stays in the pool when rate decreases between request and finalize is NOT stolen — it accrues to remaining ETHx holders' rate (compounding effect)
5. `ethRequestedForWithdraw -= requiredEth` correctly clears the liability for the originally-requested amount; the extra ETH that didn't leave the pool stays as backing for remaining ETHx supply

This is "design-by-contract" behavior, explicitly documented in Stader's Tech Explainer. Triager-instant-reject: "this is the canonical LST finalize semantics, not a vulnerability". 

**Submission EV**: $0. **Verdict**: NOT-A-BUG (Gate 1 mis-classification — re-analysis identifies it as a design feature, not a vulnerability).

---

### G2-CAND-3 — Manager.deposit single-source oracle ER → WEAK + PARTIAL-DUP

| Source | Finding | Status |
|---|---|---|
| Halborn V2 | **HAL-11** "Lack of enforcement on minimum number of trusted nodes" — flags trusted-node consensus weakness | VALID — partial coverage |
| Sigma Prime V2 | **ETHX2-07** "No Minimum Trusted Node Validation" — flags trusted-node attack scenario where early-setup byzantine protection collapses | RESOLVED (min 5 nodes now enforced per remediation) |
| Code4rena | **M-05** "StaderOracle - Strict equal can cause no consensus if trusted nodes removed mid-submission" | VALID |
| Code4rena | **M-08** "Corruption of oracle data — Multiple reportable blocks can mix data in the prices array" | VALID |

The trust-model surface around StaderOracle is well-trodden. The remaining sliver (Manager.deposit single-source oracle without market-rate cross-check) is **trust-model-dependent** and lacks a concrete exploit primitive — triagers routinely dismiss "trusted-node collusion" as "out of trust model" without an actual collusion-attack PoC.

**Submission EV**: <$5K (speculative, low-confidence). **Verdict**: PARK — not paste-ready.

---

### G2-CAND-4 — `depositETHOverTargetWeight` permissionless trigger → FORECLOSED

**C4 M-09** "depositETHOverTargetWeight() malicious modifications poolIdArrayIndexForExcessDeposit" already flags the exact pool-rotation-manipulation primitive identified at Gate 1.

**Submission EV**: $0. **Verdict**: foreclosed.

---

### G2-CAND-5 — `maxNonRedeemedUserRequestCount` DoS → SELF-FLAGGED-OOS

Already self-flagged at Gate 1 as informational-only (no fund-loss path). No dispatch.

---

## Aggregate disposition

All 5 Gate 2 candidates foreclosed:
- 2 (G2-CAND-1, G2-CAND-4) by public audit DUP
- 1 (G2-CAND-2) by code re-analysis revealing intentional LST design
- 1 (G2-CAND-3) partial-DUP + insufficient exploit primitive
- 1 (G2-CAND-5) already self-flagged OOS

Stader ETHx HEAD `9d4a921` (2025-12-18, 5+ months stale) is too thoroughly audited (3 firms + C4 + 9 audit reports total) for paste-ready bounty extraction at Gate 2 dispatch depth. Phases 1-5 (Foundry env setup, PoC build, bytecode-verify, paste-ready draft) were NOT executed — would have produced inert work.

---

## Brain compounds filed

1. **`brain/Open-Questions-Tracker.md`** v1.4 → v1.5: Q-36 marked SUPERSEDED-BY-FORECLOSURE (→ Q-39); new Q-39 added (5-candidate foreclosure summary + EV-multiplier proposal for heavily-audited stale targets) — Q-37/Q-38 slots already taken by Balancer B-1 Gate 2 dispatch (same date)
2. **`brain/Watchlist-Candidate-Crossmap.md`** Stader row update: Gate 2 verdict = FORECLOSED-ALL, drop EV-rank to PARK
3. **`brain/Patterns-Defense-Classes.md`** DC-12: add Stader as a *positive corroboration* of "missing-staleness pattern surfaces consistently across LST PoR feeds" — but ALSO add as a **dedup-anchor** ("public audit DUP foreclosed bounty extraction despite confirmed vuln presence")
4. **Proposed corollary to Doctrine #29 v1.1** (queued in Q-37): heavily-audited stale targets EV-multiplier ≤0.25× — surfacing for operator decision

---

## Lessons + meta-doctrine

1. **Phase 0 audit-dedup is a paste-ready-killer** — investing 20 min in WebFetch + PDF-extract + grep against 3 audit firms saved 4+ hours of Foundry PoC work that would have produced an instant-DUP submission. Standing-Intake-Protocol Step 5.7 ("Check known issues / previous audits") is well-justified — this dispatch validates the rule.
2. **Gate 1 attack-claims need code re-read at Gate 2** — G2-CAND-2 was claimed as "asymmetric value-leak" at Gate 1 but is actually canonical LST design after re-analysis. Gate 1 surface-mapping pressure can mis-classify design features as bugs.
3. **HEAD-staleness × audit-depth is a strong negative EV signal** — Stader HEAD is 5+ months stale + 3 audit firms + 9 reports → near-zero paste-ready surface remains. Worth promoting an explicit EV-multiplier (Q-37 proposal).

---

## Recommended next-action

1. **Drop Stader from active Gate 2 dispatch queue** — verdict FORECLOSED-ALL filed
2. **Re-rank EV pipeline** — return to dispatcher; next-highest-EV unscanned target gets dispatch
3. **Surface Q-37 EV-multiplier proposal to operator** — formalize heavily-audited-stale-target downgrade rule in Standing-Intake-Protocol Step 3 EV formula
4. **Audit corpus archive** — Halborn V2 + SigmaPrime V2 text extracts saved to `data/lane1/halborn-stader.txt` + `data/lane1/sigmaprime-stader.txt` for future Stader-adjacent dedup runs (e.g., if `ETHx_Haven1` or similar derivative repo enters scope)

---

_Hunt: 2026-05-27-stader-ethx-gate2-foreclosure | Phase 0 audit-dedup foreclosure of all 5 Gate 1 candidates | Standing-Intake-Protocol v1.0 + Doctrine #29 v1.1 corollary proposed_
