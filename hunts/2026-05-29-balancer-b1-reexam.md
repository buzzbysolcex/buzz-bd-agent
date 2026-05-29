# Balancer V3 B-1 (#80150) — Self-Re-Examination vs Doctrine #43

**Date:** 2026-05-29 (Ogie msg — triggered by PancakeSwap #80247 INVALID; re-exam B-1 BEFORE it earns a matching rejection)
**Subject:** DISC-021 Balancer V3 BatchRouter "slippage double-count" (#80150, SUBMITTED 2026-05-28 00:12Z, awaiting triage)
**Method:** verbatim re-read of our paste-ready + source-read of the actual `BatchRouterHooks.sol` (local clone `data/lane1/clones/balancer-v3-monorepo`) at commit `80fd29ce4eb6`. Applied Doctrine #43 + the 3 QC gates + [ASSUMED]-until-traced. Brutal honesty: willing to invalidate our own finding.

## VERDICT: **MISFRAME — REJECTION-BOUND** (same thesis PancakeSwap correctly rejected). NOT a genuine double-count.

---

## 1. What B-1 ACTUALLY claimed (verbatim, no charitable re-interpretation)

Two facts composed:
1. `BatchRouterHooks.sol:127` — `minAmountOut = isLastStep ? path.minAmountOut : 0` → intermediate steps have NO per-step slippage floor. (TRUE, [INSPECTED].)
2. `StableSurgeHook._isSurgingSwap` uses an explicitly-approximate surge-fee balance calc (WONTFIX-acknowledged). (TRUE, [INSPECTED].)
**Claim:** the router "silently doubles the user's exposure to surge-fee approximation drift across hops"; PoC shows 2-hop "leak" 1.09% vs 1-hop 0.55% ("almost exactly double"); "$50K-500K/year leaked." Titled "slippage double-count" (CANDIDATE-O).

## 2. Source-read — the decisive accounting (`BatchRouterHooks._computePathAmountsOut`, [INSPECTED])

```
L106  stepExactAmountIn = path.exactAmountIn        // user's input
L127  minAmountOut = isLastStep ? path.minAmountOut : 0
L165  amountOut = _swapExactIn(..., stepExactAmountIn, minAmountOut, isLastStep)
L176  if (isLastStep) pathAmountsOut[i] = amountOut  // final, bounded by path.minAmountOut
L182  else stepExactAmountIn = amountOut             // hop N out -> hop N+1 in
```
**Clean single-chain accounting. The intermediate `amountOut` is consumed by EXACTLY ONE thing — the next hop's input (L182). There is NO second consumer. There is NO literal double-DEBIT anywhere.** The path's `minAmountOut` is checked once, at the last step, against the composed final output.

## 3. Doctrine #43 QC gates — B-1 fails all three

- **(a) Aggregate-surface check — FAILS.** The user HAS an aggregate bound: `path.minAmountOut` (5% = 4750 USDT). Our own PoC output = **4945.35 USDT > 4750** → the aggregate floor was SATISFIED; the user got within their chosen tolerance. Any loss beyond 5% would revert. The claim "the user has no surface to bound per-hop loss" ignores that the user bounds TOTAL loss, which is what they care about. (Identical to PancakeSwap: tighten the floor and the PoC reverts.)
- **(b) Expected-accumulation check — FAILS.** 2-hop (DAI→USDC→USDT) crosses TWO surge pools = TWO surge fees ≈ 2× one fee. "1.09% ≈ 2× 0.55%" is literally "2 hops cost ~2× one hop." Expected accumulation, not theft. We never proved the aggregate floor FAILS.
- **(c) Counterfactual-comparison check — FAILS.** Our PoC compares 2-hop-DAI→USDC→**USDT** (1.09%) vs 1-hop-DAI→**USDC** (0.55%) — DIFFERENT trades, different output tokens, different pool count. Calling the delta a "loss" is apples-to-oranges (the exact PancakeSwap error). The VALID counterfactual we never ran: batched 2-hop vs the same route as two sequential single swaps — which would be equal (no double-count).

## 4. CANDIDATE-O genuine-vs-misframe test — B-1 is the MISFRAME side

Genuine CANDIDATE-O (Rhea Finance $18.4M anchor): the same value feeds a SECOND, aggregate-UNprotected consumer (swap-amount → oracle/liquidation, a DIFFERENT victim). **B-1 has no second consumer** — the intermediate `amountOut` feeds only the next swap step (L182), and the only victim (the swapper) is protected by `path.minAmountOut`. The StableSurge approximation is a per-hop fee-estimation imprecision that (i) goes to the pool/LPs, (ii) is explicitly WONTFIX-accepted, (iii) is no worse per-hop in a multi-hop than single-hop, and (iv) is bounded by the swapper's aggregate floor. No second victim, no double-consumption.

## 5. Aggravating factors

- B-1 fights a **WONTFIX** (`audits/WONTFIX.md` names the StableSurge approximation as accepted) — our "inside the non-extreme envelope" argument was a stretch; the aggregate-bound logic defeats it regardless of regime.
- The "$50K-500K/year" was already tagged `[ASSUMED]` (derived from volume bands) — the load-bearing impact number was never grounded.
- B-1 pre-dates tonight's rigor (submitted 2026-05-28 00:12Z); it would FORECLOSE at Gate-1 Step-5.11 under Doctrine #43 today.

## 6. CODE-LEVEL DISTINCTION FROM PANCAKESWAP (for defensibility) — **there is none**

Asked to find a defensible distinction if B-1 were genuine. There is none: `BatchRouterHooks` is clean output→input single-chain accounting with one aggregate floor — structurally identical to the PancakeSwap multi-hop router. B-1 is the SAME misframe on a different DEX. The "double-count" in our title is the per-step-absence framing + the apples-to-oranges 1-vs-2-hop comparison, NOT a literal double-debit.

## 7. OPERATOR OPTIONS (analysis only — withdraw/edit/submit is YOUR action, I do not act)

**Recommendation: (a) proactively withdraw #80150** with a good-faith technical note, BEFORE triage rejects it.
- **(a) Withdraw + good-faith note** — RECOMMENDED. Same logic we're accepting for PancakeSwap. Reputation-POSITIVE: converts a likely 2nd invalid-closure (right after PancakeSwap) into a documented self-correction, signaling calibration discipline to the program + Immunefi. Suggested note (for your paste, your call): *"On further analysis applying an aggregate-bound review, we conclude the user's `path.minAmountOut` already governs total loss across the batched path; the intermediate `minAmountOut=0` is bounded by it, and the multi-hop fee accumulation is expected behavior rather than extraction. Withdrawing in good faith."*
- **(b) Leave it** — NOT recommended. There is no genuinely defensible distinction (§6, source-confirmed). Leaving it → near-certain invalid-closure (same as PancakeSwap) → a 2nd invalid-closure on the record with no offsetting learning (PancakeSwap already gave us the dismissal vector). The only argument for (b) is if you have an Immunefi-relationship or withdraw-mechanics reason I'm not seeing — your call.

**Holds:** Hyp-C unchanged (slot 1, 21:40Z). I have NOT touched #80150. Disk: ZERO (source-read local clone).

---

_B-1 self-reexam | 2026-05-29 | VERDICT: MISFRAME (source-confirmed: BatchRouterHooks clean output→input chain, one aggregate floor, no double-debit; output > minAmountOut; 1-vs-2-hop apples-to-oranges). Doctrine #43 + CANDIDATE-O EXCLUSION anchor. Recommend (a) proactive withdraw — OPERATOR-GATED._
