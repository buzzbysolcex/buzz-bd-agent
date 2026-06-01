# Bitflow DLMM (HODLMM) — Immunefi Gate-1 — NEGATE [INSPECTED]

**Date:** 2026-06-01 (autonomous, Ogie msg 8097 — Bitflow→Arkadiko hunt, FIRST live Gate-0 run)
**Target:** Bitflow Finance — DLMM / "HODLMM" (discretized-liquidity AMM, Liquidity-Book style)
**Platform:** Immunefi, live 2025-11-26, **$100K max** (10% of funds, USDC on ETH), **PoC mandatory**, no-KYC class
**Scope (Step-1 VERIFIED):** `github.com/BitflowFinance/bitflow-dlmm` — Clarity contracts. In-scope tokens only from deployer `SPQC38PW542EQJ5M11CR25P7BS1CA6QT4TBXGB3M`.
**Repo HEAD:** `--depth 1` clone 2026-06-01. Core `dlmm-core-v-1-1.clar` 2139 LOC; pool `dlmm-pool-sbtc-usdc-v-1-1.clar` 684; staking 815; routers 291+308.
**Verdict:** **NEGATE / FORECLOSE.** Carefully-implemented Liquidity-Book clone — pool-favorable rounding throughout, value-conserving liquidity ops, locked-down core-only authorization, consistent SIP-013 share accounting. No net-new candidate survives the Clarity arsenal; the arsenal's strongest edges map onto the project's own 276+ unit tests + 6 Critical fuzz/invariant properties.

---

## STEP-1 SCOPE CORRECTION (why the preflight is mandatory)

Lane5 queue profiled Bitflow as "stableswap AMM = CANDIDATE-E rounding/slippage." **Live scope is the `bitflow-dlmm` (HODLMM) repo — a *discretized-liquidity* / Liquidity-Book AMM (bins), NOT the StableSwap.** Substrate is bin/tick state-machine → CANDIDATE-D joins CANDIDATE-E + invariant-K + Doctrine #43. Corrected at dispatch.

## STEP-4.5 GATE-0 — KNOWN-ISSUES CORPUS (build-on-engagement, FIRST live build)

Built `data/lane1/gate0/known-issues.json["bitflow"]` (4 entries) from: Immunefi program OOS + the in-repo `docs/invariants.md`. **No in-repo SECURITY_CONTEXT/SECURITY.md/KNOWN_ISSUES file exists.** Corpus entries:
1. Immunefi-standard OOS — malicious already-connected-wallet interactions (arg/address substitution).
2. Token-scope restriction — only `SPQC38PW…` tokens in scope; `mock-unwhitelisted-token` exists for negative testing (unwhitelisted = tested-reject, not a bug).
3. Tested-and-guaranteed invariant — **LP-supply conservation on swap** (project's own Critical fuzz property `checkSwapXForY/YForX`).
4. Tested-and-guaranteed invariant — **bin/user balance conservation + rounding + arithmetic-edge** (276+ tests incl. `swap-calculations-validation-logic`, `arithmetic-edge-cases`; explicit "exploit detection, rounding").

## CANDIDATE DISPOSITIONS (Gate-0 demonstrated live)

| Candidate | Gate-0 (structural) | Gate-1 source-read verdict |
|-----------|--------------------|----------------------------|
| **A. plain swap rounding/precision drift** | NOVEL-VARIANT-REVIEW (2 attack-tier shared {rounding, slippage}, below 3-token auto-NEGATE bar → flagged, not killed) | **NEGATE** — output `dy` floors DOWN (pool-favorable), required-input `max-x-amount` CEILs (`+ bin-price-1`), `dy=min(dy-before-cap, y-balance)` caps over-withdraw, protocol fee tracked separately. Exactly their fuzz envelope (corpus #4). |
| **B. empty-bin active-bin free-decrement** | NO-MATCH-PROCEED (no known-issue overlap) | **NEGATE** — swap on an empty active bin decrements `active-bin-id` with no transfer, but you **cannot skip a *funded* bin** (those require draining = paying), and empty bins hold nothing to extract. Benign Liquidity-Book bin-crossing. |

**Gate-0 working-as-designed note:** neither candidate was auto-killed by Gate-0 (it's a known-issues dedup, not a source-read substitute). The NEGATEs came from the Gate-1 source-read. This is the intended two-stage flow (Doctrine #15 / #15.1).

## SURFACE MAP — 5-TARGET CHECKLIST (all [INSPECTED])

1. **Withdrawals/Redemptions** — `withdraw-liquidity` / `move-liquidity`: x/y withdrawn = `floor(amount·balance/bin-shares)` (DOWN, pool-favorable); `move-liquidity` conserves real tokens (no revaluation arb — tokens physically move, shares recomputed at to-bin price); empty-bin path mints `minimum-burnt-shares` to BURN_ADDRESS (UniV2-style). [INSPECTED]
2. **Liquidation+Oracle** — N/A (AMM, no oracle/liquidation). Price is the deterministic bin ladder `bin-price=(initial-price·bin-factor)/1e8` (floor, asserts >0 → reverts on underflow, no silent-zero). [INSPECTED]
3. **Deposit/Mint shares** — `add-liquidity` / `move-liquidity` `dlp`: floored DOWN; active-bin anti-JIT liquidity fee stays in-bin (accrues to existing LPs); `min-dlp` + `max-x/y-liquidity-fee` slippage guards; LB bin-side asserts (x only in bins ≥active, y only ≤active). [INSPECTED]
4. **External calls** — core↔pool via traits; pool verified by `contract-hash?` against `verified-pool-code-hashes`; core checks `pool-data.core-address == current-contract` (two-sided binding). [INSPECTED]
5. **Admin/Upgrade** — `pool-mint`/`pool-burn`/`update-bin-balances`/`update-bin-balances-on-withdraw`/`pool-transfer`/`set-dynamic-config` ALL assert `contract-caller == core-address`; `pool-burn` enforces `amount ≤ user-balance`; admins list max-5, `add-admin` costs 1 uSTX + existing-admin gate; migration is admin-gated w/ cooldown (centralization = OOS-class). [INSPECTED]

## SHARE-ACCOUNTING CROSS-CONTRACT CHECK (the one non-obvious seam)

`move-liquidity` calls `update-bin-balances-on-withdraw(from-bin, …, bin-shares-a)` (sets shares = OLD total) THEN `pool-burn(from-bin, amount)` (reads fresh total, sets = total−amount). Composes correctly → final `bin-shares = bin-shares-a − amount`, **no desync.** `bin-shares` IS the SFT total-supply (`get-total-supply` reads the same map field). [INSPECTED]

## WHY NEGATE (honest EV)

Doctrine #42 says fresh+audit-light $100K beats saturated $3M. Bitflow IS fresh + audit-light — BUT the in-house fuzz/test suite targets *precisely* the Clarity-arsenal edges (rounding asymmetry, balance/LP conservation, arithmetic edges, "exploit detection"). p(net-new) on the obvious surfaces is low; the non-obvious cross-contract seam (share accounting) and the novel state-machine seam (empty-bin walk) both NEGATE on source-read. Foreclosing the in-scope core. Staking contract (815 LOC, reward-index) left as a thin residual surface — flagged for a future revisit only if a reward-index cross-protocol angle emerges.

## BRAIN COMPOUND

- Clarity arsenal: +1 substrate class — **Liquidity-Book / discretized-bin AMM** (Trader-Joe-style; SIP-013 SFT per-bin LP). First DLMM coverage. Pattern: pool-favorable floor on output + CEIL on required-input + min-cap is the safe-rounding signature; when present + fuzzed, CANDIDATE-E/invariant-K p collapses.
- Gate-0: FIRST live build-on-engagement corpus (`bitflow`, 4 entries) + FIRST live candidate dispositions. Confirmed Gate-0 is a dedup pre-filter, not a source-read replacement.
