<!-- P4P2-PRIVATE-SUPPRESS — PLATFORM-ONLY DISCLOSURE (HackenProof private). NO public content drafts. -->

# Dexalot — `cd/removeAuction` DIFF — Gate 1 (PRIVATE: HackenProof)

**Date:** 2026-05-29 (Lane 5 batch #1, Ogie msg 8019)
**⚠️ PLATFORM-ONLY DISCLOSURE — HackenProof PRIVATE. P4→P2 fanout suppressed. No public content.**
**Target:** `Dexalot/contracts @ origin/cd/removeAuction` (CLOB DEX, Solidity). Diffed vs `origin/main` (HEAD `993df50c`). Cap $50-100K Crit / $20-30K High. **$0 paid / 532 subs** → P(acc) ~0.25. $5/sub. KYC likely (operator step).
**Method:** branch-DIFF source-read (local blobless clone). Doctrine #41 ([ASSUMED]→trace) + #42 (DIFF=fresh) + #43 (CLOB → run QC gates on any per-step pattern) + direction-error rule (verify Solidity memory-ref semantics myself).
**Verdict:** **NEGATE / WATCHLIST-PARK** — the DIFF's three bug-richest net-new surfaces are source-confirmed functionally correct. No genuine finding on the primary surface.

---

## The net-new surface (DIFF = 3 commits)
1. `9f0fa67` — auction logic removed + "simple controls for a future token launch."
2. `d1c05a1` — **gas-opt refactor**: TradePairs "minimize lookups from tradePairMap & orderMap" + NEW `Execution` struct; PortfolioSub "combine getFeeRates with calculateFeeAmounts."
3. `f7acdba` — obsolete files removed.

Top changed contracts: `TradePairs.sol` (+322), `PortfolioSub.sol` (+171), `ExchangeSub.sol` (+114).

## Hypotheses traced (all NEGATE)

**H-1 [INSPECTED→NEGATED] Taker-fill-tracking regression (the highest-risk change).** OLD `addExecution(...) returns (Order memory)` returned the updated taker; NEW `addExecution(bytes32, Order memory _takerOrder, ...)` returns VOID. **Direction-error-rule trace (Solidity memory-ref semantics, verified myself — NOT assumed):** a `memory` struct passed to a `private` fn is passed by REFERENCE; `addExecution` lines 668-671 mutate `_takerOrder.quantityFilled/status/totalAmount/totalFee` IN PLACE → those persist to the caller's loop variable. The matching loop (L1180-1228) re-reads `takerRemainingQuantity = getRemainingQuantity(_takerOrder.quantity, _takerOrder.quantityFilled)` AFTER each `addExecution` (L1227-1228) → cumulative taker fill tracked correctly across multi-maker matches; stop-condition (`takerRemainingQuantity > 0 && ... && _maxNbrOfFills > 0`) sound. "return-order" → "mutate-in-place" is functionally equivalent. NO over-fill / double-fill.

**H-2 [INSPECTED→NEGATED] Fee double-count / mis-apply (`getFeeRates`+`calculateFeeAmounts` merge).** NEW `calculateFeeAmounts(Execution)` (PortfolioSub L359-380): rate-lookup via `portfolioSubHelper.getRates(makerAddr,takerAddr,pairId,makerRate,takerRate)` (per-trader overrides preserved), then `makerFee/takerFee = getFee(<correct currency>, <correct rate>)` — once each, correct currency per side (makerSide BUY → makerFee on base / takerFee on quote; SELL → swapped), consistent with the Executed-event fee-currency doc. In `addExecution`, makerFee→maker leg, takerFee→taker leg (preserved transfer structure). NO double-count, NO rate-mixup.

**H-3 [INSPECTED→NEGATED] Doctrine #43 per-step/slippage misframe.** Dexalot is a CLOB **order-matching** engine, NOT a multi-hop router — there is no per-step `minAmountOut`/slippage chain. The #43 risk class did NOT materialize; I did NOT force a per-step framing onto the matching loop. (Explicitly avoided re-making the PancakeSwap/B-1 misframe per Ogie's warning.)

## Verdict + residual

**NEGATE on the primary surface** (matching-engine refactor + taker-tracking + fee-combine = clean gas-optimization preserving accounting invariants). Given the $0-paid/532-sub payer (P(acc) ~0.25) + the clean bug-richest surface, EV of deep-reading the residual surfaces drops below threshold → **WATCHLIST-PARK**.

**Residual un-read (lower-risk, noted for revisit if a signal emerges):** auction-removal "simple controls for future token launch" (access-control — likely `DEFAULT_ADMIN_ROLE`, admin-trust OOS per R-1); `ExchangeSub.sol` (+114); `PortfolioSubHelper.getRates` override-table internals; remnant `auctionPrice`/`getAuctionVaultAdress` read-only getters (harmless). No RUNNABLE PoC pursued (no surviving candidate → nothing to [EXECUTED]; per HackenProof's no-PoC-no-submission rule, correctly no submission).

## Compounds
- **Refactor-regression NEGATE anchor:** params→struct + lookup-caching + fee-fn-merge gas-opt, source-confirmed correct. Memory-ref struct mutation in a matching loop ≡ return-and-reassign (Solidity semantics) — a clean refactor, not a regression. Cross-ref the DC-8 refactor-regression class (this is the EVM-Solidity analogue, NEGATE side).
- **Doctrine #42 data-point:** the DIFF was genuinely fresh + audit-light (un-audited branch), but the refactor was DISCIPLINED/correct → "fresh ≠ buggy." Freshness raises p but doesn't guarantee a finding when the refactor preserves invariants.
- **Doctrine #43 non-application:** correctly did NOT apply the aggregate-bound/per-step lens to a CLOB matching engine (no multi-hop). The lens is for routers, not order-books.

**Disk:** clone `gate2-clones/dexalot` retained for possible residual revisit (purge before next target per one-clone-at-a-time).

---

_Gate 1: 2026-05-29-dexalot-cd-removeauction | PRIVATE/HackenProof | DIFF source-read | **NEGATE/PARK** (matching-engine + taker-tracking [memory-ref] + fee-combine all source-confirmed correct; no per-step misframe forced) | NO PoC (no surviving candidate) | single-agent_
