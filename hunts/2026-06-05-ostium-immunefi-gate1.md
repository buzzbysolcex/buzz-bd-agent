# Gate 1 — Ostium (Immunefi, $200K) — RWA Perps on gTrade-v5 base

**Date:** 2026-06-05 · **Loop:** autonomous (Ogie "let's goo" msg 8157) · **Mode:** single-agent, no swarm, no qwen, bankr OFF · **Selector:** #45 thin-pool discovery scorer → #46 fork-triage → Ostium.

**Verdict: WATCHLIST-PARK — the two highest-EV Ostium-delta theses NEGATED `[INSPECTED]`.** Residual RWA-delta math (funding/rollover + OLP vault share-accounting) un-traced → Gate-2-viable but lower-EV. No candidate survives to PoC this cycle.

---

## Selector path (how Ostium was picked)
`thin-pool-discovery-scorer.py` Top-10 → **#46 fork-triage at Step-1** killed the forks/dups: Quickswap V3 / Pharaoh CL = Uniswap-V3 forks (NEGATE-on-sight); YeiLend = the Yei Aave-V3 fork already foreclosed; Mezo Borrow = already NEGATE'd. The originals (Antarctic/FlashTrade/Mole) had **NO confirmable bounty** → EV≈0 (the scorer ranks surface-thinness but doesn't gate on a *payable program* — see Compound C-1). The search surfaced confirmed-bounty original Arbitrum perps; **Ostium** ($200K, original RWA code, audit-light, fresh, EVM) beat Variational ($100K, audited).

## STEP 1 — PROFILE
- **Ostium V2** — RWA perpetuals DEX (commodities/forex/indices/stocks + crypto) on Arbitrum. Public repo `github.com/0xOstium/smart-contracts-public`, Hardhat, HEAD `8390ce49` (2026-05-07), 8.2K LOC. **#45.3: NO `audits/` dir** (audit-light signal). Immunefi: $200K Crit / $50K High / $5K Med, KYC YES, ACTIVE (live 2025-04-30, updated 2026-05-29), 12+ SC assets.
- **#46 fork status (README, verbatim):** *"adapted from the Gains v5 open-source codebase... significant modifications... components specific to our system."* → **gTrade-v5 derivative.** NEGATE inherited gTrade-v5 core (audited); **hunt the Ostium DELTA** = RWA price layer + RWA-specific logic.
- **OOS:** trusted keeper + oracle operations; privileged admin (good faith); griefing >$10K no-gain; Arbitrum sequencer; USDC token. → in-scope attack must be **UNPRIVILEGED**.
- **#1 Critical impact in scope:** *"execution of trades at incorrect prices through validation bypass."* This drove the hunt.

## STEP 2 — BRAIN OVERLAP (#47 seam-hunter 3-pass)
- **TRUST-GAP** → `OstiumVerifier` price-signature verification + dual oracle (Chainlink low-latency + Stork RWA). DC-5 + Doctrine #44 (identity-vs-content) + #166 (cache/replay).
- **FLOW-GAP** → order→execution→PnL pipeline (PriceUpKeep → Callbacks → Storage). DC-7 validating-field≠consuming-field.
- **NUMERICAL-GAP** → PnL/funding/rollover/maintenance-margin (OstiumPairInfos), OLP vault shares (CANDIDATE-I).

## STEP 5 — SOURCE TRACE (the Ostium delta)

### Thesis A (highest-EV) — Verifier price-validation bypass → incorrect price. **NEGATED `[INSPECTED]`.**
- `OstiumVerifier.verify()` ecrecover-authenticates the signer of `reportData`, reverts if `!isAuthorizedSigner[signer]`; returns raw `reportData`. Zero-address vector closed (`registerAuthorizedSigner(0)` reverts). It does NOT validate report *contents* — burden is on the consumer. Seam identified.
- **Consumer re-binds (Feynman consumer-trace):** `OstiumPriceUpKeep` (Chainlink Data Streams) checks `expectedFeedId==reportFeedId && observationsTimestamp>=order.timestamp && block.timestamp<=order.timestamp+maxOrderAge`. `OstiumPrivatePriceUpKeep` (the Ostium-original Verifier path) requires **exact** `order.timestamp==report.timestamp && expectedFeedId==reportFeedId` (line 115). `order.feedId` is set at request (`pairFeed(pairIndex)`); the "backward-compat" branch (feedId==0) resolves to the same `pairFeed` → safe. `OstiumPriceRouter` bounds order timestamp (`<=block.timestamp && age<=maxTsValidity`).
- **Market-closed / price=0:** `!isMarketOpen` zeroes price/bid/ask → every callback guards `if (a.price<=0||a.bid<=0||a.ask<=0) → CancelReason.MARKET_CLOSED` (lines 175/252/374/479/653); `isDayTradingClosed` checked (177/392/668). Callbacks access-gated to PriceUpKeep (line 85) + `notDone`. `performUpkeep` is `isForwarder`-gated (keeper = OOS-trusted). → an unprivileged actor cannot inject an incorrect/stale/cross-asset price. **#1 critical impact DEFENDED.**

### Thesis B — `storedTradeId==0` trade-replacement validation-skip (#34 upgrade-delta + #47 flow-gap). **NEGATED `[INSPECTED]`.**
- `OstiumTradingCallbacks` validates `i.tradeId == storedTradeId` to *"prevent execution on replaced trades,"* but **skips when `storedTradeId==0`** (lines 256-263 market-close; 386-390 limit; 486-487 / 655-657 parallels) — the "legacy order before upgrade" sentinel.
- Trace: `closeTradeMarket` always binds `storePendingMarketCloseTradeId(orderId, i.tradeId)` (Trading.sol:329); TP/SL/LIQ binds too (632-636). `tradeId` = the open-order's `orderId` (registerTrade, callbacks:205/568) = a **global monotonic counter**. `storedTradeId==0` is therefore only reachable for **pre-upgrade legacy trades** (tradeId field defaulted 0) — an attacker cannot create a *new* trade with tradeId 0. Skip unreachable for any attacker-creatable trade → replacement guard sound. NEGATE.

### Residual (UN-TRACED, honest)
- **OstiumPairInfos** — RWA funding/rollover-fee math (Ostium-delta rates) — NOT traced.
- **OstiumVault (OLP)** — share-accounting / solvency (CANDIDATE-I) — NOT traced.
- **TradingCallbacksLib** — bid/ask spread-side selection + priceImpact correctness — NOT traced.
- These are closer to inherited gTrade-v5 (#46 → low p) + RWA-delta math; Gate-2-viable if pursued, lower-EV than the negated primary theses.

## STEP 3/4 — EV + QUEUE
- audit-light + $200K cap = attractive base; but the two novel highest-impact deltas (price-validation + replacement-guard) NEGATED. Realizable EV on residual ≈ low-moderate (funding-math/vault are the only un-traced RWA-delta; rest is audited gTrade-v5).
- **WATCHLIST-PARK.** Clone `gate2-clones/ostium` (purge-eligible). If revisited: trace OstiumPairInfos funding/rollover + OstiumVault CANDIDATE-I first.

## BRAIN COMPOUNDS
- **C-1 (discovery-scorer refinement):** thin-surface-rank ≠ payable target. The #45 scorer surfaced 3 top "originals" (Antarctic/FlashTrade/Mole) with **no confirmable bounty** → EV≈0. Add a **bounty-existence gate** (Immunefi/Cantina/Sherlock/HackenProof confirmed program) BEFORE Gate-1 dispatch. Thinness ∧ confirmed-bounty, not thinness alone.
- **C-2 (#46 worked example):** Ostium = gTrade-v5 fork (README-confirmed) → delta-hunt the RWA price layer (original) not the inherited core. The delta WAS the right surface; both top delta-seams sound → NEGATE. Reusable for any gTrade/GMX/Synthetix-perps fork.
- **C-3 (#47 seam-hunter worked example, both NEGATING):** trust-gap (Verifier returns unvalidated reportData) resolved by Feynman *consumer-trace* (keeper re-binds feedId+timestamp); flow-gap (skip-on-zero) resolved by tracing the zero-case to a non-attacker-creatable legacy artifact. **Lesson: a "validation-skip on a legacy sentinel" NEGATES if the sentinel value is unreachable by attacker-created state** (monotonic-counter id) — pair with #34. Cross-ref Doctrine #44, #166, webfetch-direction-error.

_Gate-1 by Buzz · public-repo source-trace · submission operator-gated (no finding)._
