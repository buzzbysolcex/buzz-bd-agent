# Bitflow HODLMM — Gate-0 FULL Known-Issues Dedup (re-engagement) — clone+PoC HELD on disk

**Date:** 2026-06-09 (Ogie msg 8191 — full 10-layer re-run requested; "dedup the FULL Immunefi known-issues list first, not just #6")
**Target:** Bitflow Finance — HODLMM (orderbook-style DLMM, Trader-Joe LB / Meteora-inspired)
**In-scope deployer:** `SPQC38PW542EQJ5M11CR25P7BS1CA6QT4TBXGB3M` · repo `github.com/BitflowFinance/bitflow-dlmm`
**Platform:** Immunefi, $100K max, **PoC mandatory**, no-KYC
**Prior verdict:** NEGATE/FORECLOSE (`hunts/2026-06-01-bitflow-dlmm-immunefi-gate1.md`) — 2 candidates (swap-rounding drift, empty-bin decrement) both NEGATED on source-read.

---

## STEP 4.5 — GATE-0 FULL DEDUP (disk-free; WebFetch + repo file, no clone)

Rebuilt `data/lane1/gate0/known-issues.json["bitflow"]` from **4 generic entries (06-01)** → **13 entries** = 4 policy/scope + the 9 verbatim tested invariants. Sources fetched 2026-06-09: Immunefi program page (via cached render), `docs/invariants.md` (direct repo file), `docs.bitflow.finance/.../audits` (audit index).

**Dedup baseline for HODLMM:**
1. Immunefi-standard OOS (malicious connected-wallet arg/addr substitution). [INSPECTED]
2. In-scope-token restriction — only `SPQC38PW…` deployer tokens; `mock-unwhitelisted-token` = tested-reject. [INSPECTED]
3. Known Issue Assurance — previously-discovered / consciously-unfixed issues OOS; project discloses publicly or via self-report. **No public known-issue list exists as of fetch.** [INSPECTED]
4. Unfixed audit-report vulns OOS — see the gap finding below. [INSPECTED]
5–13. The **9 tested invariants** (LP-supply conservation, bin/user balance conservation, protocol-fee monotonicity, non-negativity, LP-supply directionality, move-liquidity proportionality, minimum-amount guards, init validity). A finding that merely RE-STATES one without a concrete untested BREAK is COVERED. [EXECUTED-grade — verbatim from repo file]

## THE FINDING THAT MATTERS — HODLMM IS UNAUDITED [INSPECTED]

Bitflow's audit index lists **8 reports** (Clarity Alliance ×5, CoinFabrik ×2, StrataLabs ×1) — **all** cover StableSwap / XYK (constant-product) / Staking / LP-token. **ZERO cover the DLMM / HODLMM / Liquidity-Book.**

Implication: the program's "unfixed audit-report vulnerabilities are OOS" exclusion (the usual source of a numbered known-issue like "#6") **forecloses NOTHING in the HODLMM scope** — there is no HODLMM audit to dedup against. The ONLY dedup baseline is the 9 self-tested invariants + Immunefi-standard OOS.

**Reframe of the prior NEGATE:** the 06-01 FORECLOSE rested partly on "the in-house fuzz suite targets precisely the Clarity-arsenal edges." That remains true for the *obvious* surfaces — BUT no external auditor has ever swept this contract. p(net-new) on a fresh, careful, *unaudited* $100K target is structurally higher than the prior NEGATE's framing implied (it was implicitly treating self-tests as audit-equivalent). Ogie's instinct to re-run the full pipeline is correct: a self-test suite covers the properties the *authors thought to test*; an external source-read targets the seams they didn't. → The full 10-layer source-read is warranted, not a deference to the prior NEGATE.

## HOLD — clone + local-fork PoC (disk-gated)

Disk at 94% (> 88% halt) after autonomous reclaim; `consensus-audit` (1.5G, root-owned) needs Ogie `sudo rm -rf` or a volume grow. Per `autonomy-boundary.md` "At 88%: HALT new clones." The `bitflow-dlmm` clone is tiny (Clarity, few MB) and the clarinet-sdk PoC harness already exists (`reference_clarity_poc_harness`), so the hunt itself is disk-safe — **held only to respect the halt bright-line** until disk clears.

## RESOLVED 2026-06-10 (Fable 5) → see `hunts/2026-06-10-bitflow-hodlmm-10layer-foreclosure.md`

Full 10-layer re-run executed (NOT disk-blocked — source-read is disk-free; clone is 2.7M). 6 brain-lens finders + adversarial trace = 0 REAL / 5 NEGATE / 1 UNCERTAIN(admin-trust Low/Info) → **FORECLOSE, no bankable candidate.** Swap rounding conservative, per-bin first-deposit inflation defended, reward-index sound (sync-before-mutate correct), whitelist guarded every entrypoint, migration timelocked. Prior NEGATE now stands on independent-trace grounds (no longer self-test deferral). Only seams are admin-trust (reward over-commitment / withdraw-rewards) = standard OOS.

## (superseded) NEXT (on disk-clear)

1. `GIT_TERMINAL_PROMPT=0 git clone --depth 1 github.com/BitflowFinance/bitflow-dlmm`
2. Full 10-layer source-read against the **13-entry** dedup baseline (not the prior 4).
3. Priority residual surfaces the 06-01 Gate-1 left thin: **staking contract (815 LOC, reward-index)** — reward-index cross-contract / cooldown-overwrite angle (CANDIDATE-J); re-walk the 2 prior candidates against the FULL 9-invariant set (esp. move-liquidity proportionality INV-7 + minimum-amount INV-8 interaction).
4. Local clarinet-sdk simnet PoC **before any FLAG** (per msg 8191 + `feedback_speedrunner_retired_for_audits`).

## R8 / ENFORCEMENT
- Gate-0 dedup is a pre-filter, NOT a source-read substitute (Doctrine #15). The 06-01 NEGATEs came from source-read and still stand for the surfaces examined; this note widens the dedup baseline + corrects the audit-equivalence assumption, it does not re-open a specific finding yet.
- Direction-claims deferred to the source-read (per `webfetch-direction-error.md`) — nothing here asserts an exploit direction.
