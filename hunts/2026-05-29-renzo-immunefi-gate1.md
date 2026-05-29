# Renzo Protocol — Immunefi Gate 1

**Date:** 2026-05-29 (single-agent hunt loop, Ogie msg 8008 Part 2)
**Hunter:** Buzz Lane 1 (WebFetch-only; disk 14G/63% — no clone)
**Platform:** Immunefi (`immunefi.com/bug-bounty/renzoprotocol/` — note slug is `renzoprotocol`, NOT `renzo` which 404s → INFO #19 Axis-5 slug-drift, caught at Step 1)
**Bounty cap:** Critical **$500K** (10% of funds, min $100K) / High $100K / Med $10K / Low $1K. **KYC: YES** (name + DOB + proof-of-address + gov-ID).
**Scope:** 9 assets, EVM (+ Linea/Solana/LZ per watchlist). **LIVE since 2023-12-14, last updated 2025-05-16** (~12 months stale at intake). PoC always required. **Testing terms: "prohibited with pricing oracles or third-party smart contracts; local-forks only."**
**Queue rank:** Watchlist **#4** ($182M restaking, $500K). Top un-hunted after Lido (#1) FORECLOSED + cap/Veda (#2-3) done this cycle.
**Overlap (watchlist):** CANDIDATE-I (ezETH wrapper, cross-chain LZ) HIGH + DC-7 (oracle + EigenLayer adapter) MED + DC-12 sub-6 (cross-chain ezETH rate sync).

---

## STEP 1 PROFILE — EV-reducer stack (decisive)

| Signal | Finding | EV impact |
|--------|---------|-----------|
| **Oracle-testing-prohibited clause** | "Testing prohibited with pricing oracles or third-party smart contracts." | De-ranks the oracle-MANIPULATION hypothesis class (DC-7 RenzoOracle manipulation OOS). **Calibration nuance (NEW Step-1 check):** this restricts oracle *manipulation* testing (fork-only), it does NOT make oracle-*consumption-logic* bugs OOS — a missing staleness check in a Renzo contract is still a valid Renzo-contract logic bug demonstrable on a local fork. So it narrows but does not kill the DC-12 sub-6 consumption surface. |
| **TIME-drift (INFO #19 Axis-6)** | last updated 2025-05-16 = ~12 months stale. | Frozen-scope: Doctrine #34 sub-b post-audit composition window CLOSED (no net-new modules added to scope in a year). The highest-EV angle (net-new module) is absent. |
| **KYC required** | full name + DOB + proof-of-address + gov-ID. | Operator-realizable-value friction (~0.7-0.8×). |
| **Audit-hardening on the exact target surface** | Renzo's cross-chain ezETH rate was the **April-2024 ezETH depeg vector**; the protocol hardened the rate-sync (staleness bounds + price sanity) post-incident, audit-covered. | The one live hypothesis (DC-12 sub-6 cross-chain rate-consumption) targets the most-hardened, most-attacked surface in Renzo's history. |

## STEP 2/3a — OVERLAP + SUBSTRATE-IDENTITY (source-read attempted, blocked)

- Highest-overlap IN-SCOPE hypothesis: **DC-12 sub-6 cross-chain ezETH-rate-consumption** in the L2 deposit path (`xRenzoDeposit`-class) — a *logic* staleness/conservation bug (not oracle-manipulation), so in-scope despite the oracle-testing clause.
- **Step 3a substrate-identity: BLOCKED.** Source not cheaply reachable: `renzo-protocol/contracts` (assumed) + the `Bridge/L2/xRenzoDeposit.sol` path BOTH 404 — the public contracts repo is at a non-obvious org/casing. Per disk-discipline + Doctrine #41, did NOT spend further fetches chasing the repo for a plausibly-hardened, oracle-clause-narrowed surface.
- **WebFetch direction-error rule (NEW, `.claude/rules/webfetch-direction-error.md`): honored.** No summary seeded any directional claim; foreclosing on PROFILE-level EV-reducers, not on an unverified exploit-direction assertion.

## STEP 3 — EV + VERDICT: **WATCHLIST-PARK** (EV below threshold)

EV calc: $500K cap × ~0.06 P(finding) × 0.5 P(acc) × KYC 0.75 × (oracle-clause-narrowed overlap) × Doctrine #27 HIGH ~0.30× × (frozen-scope, no net-new) ≈ **<$3K post-discount**. Below the watchlist-park / Gate-2-dispatch threshold.

**Honest verdict: WATCHLIST-PARK — NOT a defense-confirmed FORECLOSE.** I could not read the cross-chain rate-consumption source (repo at non-obvious location); the Bounded-Staleness defense is `[ASSUMED]` (well-grounded in the post-depeg-hardening + audit history) but UNCONFIRMED. The EV-reducer stack (oracle-clause + 12mo-stale + KYC + depeg-vector-hardening) puts EV below the threshold that would justify locating the repo + cloning. PARK.

**Revisit trigger:** if (a) the Renzo contracts repo location is identified AND (b) a net-new module enters scope (the program updates from its 2025-05-16 freeze) justifying the KYC+stale friction → re-dispatch a source-read on the DC-12 sub-6 consumption surface.

**Disk:** ZERO (WebFetch-only, no clone).

## STEP 6 — COMPOUNDS (honest)

- **R-1** NEW Standing-Intake **Step-1 PROFILE sub-check — Oracle-Testing-Prohibited clause calibration**: when program terms prohibit testing "with pricing oracles / third-party contracts", DISTINGUISH (a) oracle-MANIPULATION hypotheses → OOS-for-testing (de-rank), from (b) oracle-CONSUMPTION-LOGIC hypotheses (missing staleness/bounds in the protocol's own contract) → still in-scope, fork-demonstrable. Do not over-foreclose the whole oracle-overlap class on this clause. Anchor: Renzo (2026-05-29). Cross-ref: Selective-Coverage Defense Asymmetry Law (Flying Tulip documented-exclusion) — Renzo is a 2nd, distinct flavor (testing-method restriction vs documented-function-exclusion).
- **R-2** INFO #19 Axis-6 TIME-drift anchor: Renzo last-updated 2025-05-16 (~12mo stale) = frozen-scope signal; Doctrine #34 sub-b composition-window CLOSED. Pair with the freeze-detection heuristic (a program not updated in ≥6mo has no net-new composition surface).
- **R-3** WebFetch direction-error rule (`.claude/rules/webfetch-direction-error.md`) applied cleanly: foreclosed on PROFILE signals, never let an unverified directional summary seed a build. (No source was even reachable — strongest form of "don't bank unverified.")

---

_Gate 1: 2026-05-29-renzo-immunefi-gate1 | WebFetch-only | **WATCHLIST-PARK** (EV <$3K: oracle-clause-narrowed + 12mo-stale-scope + KYC + depeg-vector-hardening; source not cheaply reachable, Bounded-Staleness defense [ASSUMED]-not-confirmed) | NO CLONE | single-agent | honest park, not a claimed defense-FORECLOSE_
