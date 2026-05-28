# Gate 2 — Lista DAO Moolah (Immunefi, $1M no-KYC) — FORECLOSURE RECEIPT

**Date**: 2026-05-27
**Platform**: Immunefi
**Program**: Lista DAO (Moolah substrate)
**Bounty cap**: Critical $1,000,000 USD-equivalent, High $10K, Medium $5K
**Gate 1 reference**: `hunts/2026-05-27-lista-dao-immunefi-gate1.md`
**Gate 2 dispatch**: G2-LISTA-1 (DC-12 PT oracle staleness in `PTLinearDiscountOracle` + `PTLinearDiscountMarketOracle`)
**Disposition**: **FORECLOSED — NOT-A-BUG (structural)** at Phase 0 dedup + upstream-source verification
**Phase reached**: 0 (audit-dedup + upstream-source verification) — Phases 1-5 (Foundry harness build + Foundry PoC + bytecode-verify + paste-ready draft) NOT executed
**Time spent**: ~45 min (dedup + Pendle source verification + LendingBroker pivot scope-check)

---

## Phase 0 — Audit dedup outcome

### G2-LISTA-1 — DC-12 PT oracle staleness → FORECLOSED (NOT-A-BUG, structural)

#### Audit-dedup scan

`docs/audits/` Moolah corpus (19 PDFs from 7 firms, 2025-04 → 2026-04) scanned for keyword set:
- `PTLinearDiscountOracle`, `PTLinearDiscount`, `PT oracle`, `PT Oracle`
- `Pendle`, `pendle`, `PT-stcUSD`, `PT-sUSDai`, `PT-sUSDE`, `PT-clisBNB`
- `linearDiscount`, `LinearDiscount`, `discountOracle`
- `latestRoundData`, `updatedAt`, `answeredInRound`, `staleness`, `stale price`, `stale answer`
- `sequencer`, `Sequencer`

**Result**: **ZERO hits across all 19 audit PDFs** `[EXECUTED — pypdf scan]`. PT linear discount oracle is entirely outside the audited surface of Moolah. Doctrine #34 (post-audit composition window) trigger CONFIRMED on this surface.

However, dedup-CLEAR does not preserve EV when the bug class is **structurally NOT a bug**. The bug-class re-analysis follows.

#### Bug-class structural verification (the negation)

Gate 1 claim: `(, int256 answer, , , ) = ILinearDiscountOracle(discountOracle).latestRoundData();` discards `updatedAt` + `answeredInRound`, NO staleness check → stale Chainlink answer can flow to liquidation engine.

**Pendle's actual `latestRoundData()` implementation** (`PendleSparkLinearDiscountOracle.sol`, fetched from `pendle-finance/pendle-core-v2-public/contracts/oracles/internal/PendleSparkLinearDiscountOracle.sol`) `[EXECUTED — source pull]`:

```solidity
function latestRoundData()
    external
    view
    returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
{
    uint256 timeLeft = (maturity > block.timestamp) ? maturity - block.timestamp : 0;
    uint256 discount = getDiscount(timeLeft);
    require(discount <= ONE, "discount overflow");
    return (0, int256(ONE - discount), 0, 0, 0);
}

function getDiscount(uint256 timeLeft) public view returns (uint256) {
    return (timeLeft * baseDiscountPerYear) / SECONDS_PER_YEAR;
}
```

**Structural finding** — three observations that jointly negate the bug:

1. **`updatedAt` is HARDCODED to `0`** (line 33 of `PendleSparkLinearDiscountOracle.sol`). Any staleness check of the form `require(updatedAt > block.timestamp - X)` against this source would **permanently revert all PT oracle reads**. Adding a staleness check is not just unnecessary, it would BREAK the oracle. The Lista omission is **deliberate and correct**.

2. **`answer` is computed deterministically from `block.timestamp` and immutable storage** (`PT`, `maturity`, `baseDiscountPerYear` are all immutables set in constructor). There is **no external feed** that can become stale. The price changes every block by exactly `baseDiscountPerYear / SECONDS_PER_YEAR`. The output is by construction always-fresh — it is a pure function of (current block timestamp, PT maturity, base discount).

3. **For the Market variant** (`PTLinearDiscountMarketOracle`), the formula is `(basePrice * answer) / 1e18`. The `basePrice` leg comes from `baseTokenOracle.peek(baseToken)` which delegates to Lista's pre-existing `ResilientOracle` (Venus Protocol fork, multi-firm-audited). Staleness on the WBNB/USD leg is the responsibility of the upstream `ResilientOracle` — not of `PTLinearDiscountMarketOracle`. The Lista PT contract correctly does not duplicate staleness logic that belongs upstream.

**Conclusion**: The bug class "missing `updatedAt` staleness check on `latestRoundData()`" is a generic DC-12 lens that **fires on the syntactic signature** (the destructured-tuple pattern) but **fails the semantic test** (the source has no staleness-state to validate). This is the Stader G2-CAND-1 trap reframed: a DC-12 signature match without a structural bug. Stader was foreclosed via 3-firm prior-publication dedup; Lista is foreclosed via upstream-source semantics.

**Triager response forecast (Immunefi)**: Triager-instant-reject — "the source returns `updatedAt=0` by design; staleness check would brick the oracle; the deterministic time-based formula has no stale state". Submission EV: $0.

**Submission EV**: $0. **Verdict**: FORECLOSED — NOT-A-BUG (structural).

---

### G2-LISTA-3 — `LendingBroker.emergencyWithdraw` MANAGER drain → STRUCTURALLY OOS (Immunefi)

Quick-pivot scope-check per dispatch ("if NEGATE, pivot to G2-LISTA-3"):

```solidity
function emergencyWithdraw(address token, uint256 amount) external onlyRole(MANAGER) {
  if (amount == 0) revert ZeroAmount();
  if (token == address(0)) {
    (bool success, ) = msg.sender.call{ value: amount }("");
    if (!success) revert TransferFailed();
  } else {
    IERC20(token).safeTransfer(msg.sender, amount);
  }
  emit EmergencyWithdrawn(msg.sender, token, amount);
}
```

`[EXECUTED — source-read LendingBroker.sol:1155-1166]`

Added: 2026-03-31 `[EXECUTED — git log -S emergencyWithdraw]` — Lista commit `e9e643b feat: add emergencyWithdraw to LendingBroker`. POST-audit (latest broker audit: Cantina_Credit_loan_04Feb2026).

MANAGER address per `script/broker/deploy_broker_20260408.s.sol:16`: `0x8d388136d578dCD791D081c6042284CED6d9B0c6` `[INSPECTED — deploy script constant]`.

**Structural OOS verdict**: Immunefi's standard exclusion list ("Out-of-Scope and Rules" template) categorically excludes "Centralization risks where the team has admin keys to perform privileged actions" — including the case where the team's MANAGER role can drain arbitrary funds. Whether MANAGER is a multisig or EOA, the bug class "privileged role can drain" is **trust-model-by-design**, not a smart-contract vulnerability. The Lista CLAUDE.md confirms: `DEFAULT_ADMIN_ROLE` is timelock-protected (the upgrade path), MANAGER is operational. Immunefi does not pay for trust-model findings absent an exploitable bypass.

**Submission EV**: $0 (Immunefi structural-OOS). **Verdict**: PARK — not a paste-ready candidate without a privilege-escalation primitive (no escalation path identified in this Gate 2 scope-check).

---

### G2-LISTA-2 — MoolahVault setName/setSymbol post-audit drift → DEFERRED (Gate 2 quick-check)

Not re-examined this dispatch. Gate 1 noted: low-tier finding, "cheap-to-confirm". Defers to subsequent Gate 2 if operator-greenlit. Likely OOS for same reason as G2-LISTA-3 (privileged-role pattern).

---

## Brain compounds (filed during Phase 0)

### Doctrine.md — Doctrine #34 (Post-Audit Composition Window)

Lista does NOT become a 6th positive anchor for Doctrine #34. Lista becomes a **negative-anchor / refinement** for Doctrine #34: the post-audit-composition window IS present (PT oracle added 2025-04-23, no firm-named PT oracle audit in the 19-report corpus), but the surface that "should" have produced a finding under Doctrine #34 is **structurally not-a-bug**. The post-audit-window heuristic is necessary but not sufficient — the bug-class must also pass an upstream-source semantic test.

**Refinement**: Doctrine #34 augmented with **Sub-Rule 34.1 (Upstream-Source Semantic Test)** — for DC-12-class candidates (missing-staleness-check), before promoting to Gate 2, verify the upstream `latestRoundData()` source IS Chainlink (or another stale-able feed). If the source is deterministic on-chain math (Pendle LinearDiscount, custom maturity-curve oracles, fixed-formula adapters), the staleness lens fires on syntax but not semantics. **Foreclose at Gate 1, not Gate 2.**

### Patterns-Defense-Classes.md — DC-12 family

Add **DC-12 sub-7h: Deterministic-Oracle-No-Staleness-State (FORECLOSED-CLASS)** — alongside the recently-added DC-12 sub-7g (LST-PoR-feed-no-staleness, DEDUP-FORECLOSED-CLASS from Stader).

Pattern: `latestRoundData()` consumer destructures `(, answer, , , )` discarding `updatedAt`. The destructure pattern fires the DC-12 lens. **The lens MISFIRES when the upstream is a deterministic on-chain formula** with no stale-state (e.g., Pendle LinearDiscount oracle returns `updatedAt = 0` by design). Adding a staleness check would brick the oracle. Foreclose at upstream-source-verification step.

Anchors:
- Lista PT oracles (PTLinearDiscountOracle, PTLinearDiscountMarketOracle) — both pull from Pendle SparkLinearDiscountOracle which is deterministic time-based math, `updatedAt = 0` hardcoded.
- Generic pattern: time-based discount oracles, fixed-formula maturity adapters, on-chain TWAP-derivation oracles with no external source.

### Watchlist-Candidate-Crossmap.md — Lista row

Lista row Gate 2 verdict: **FORECLOSED on PT oracle (NOT-A-BUG); MANAGER-drain OOS; setName/setSymbol DEFERRED**. Watchlist promoted to "monitor for new oracle adapters added that bridge non-deterministic upstreams" (e.g., if Lista later adds a Pyth-based PT oracle without staleness on the Pyth leg, the lens would re-fire valid).

### Open-Questions-Tracker.md — answered + new

- Answered: "Does Lista PT oracle use Chainlink as upstream?" → **NO**, uses Pendle LinearDiscount deterministic formula.
- New question (low priority): "Are there any Lista PT oracle variants that bridge a Pyth or Chainlink feed for the non-time leg?" — bookmark for next Lista intake.

### Contradictions-Register.md

No contradictions filed. Sub-Rule 34.1 ADDITION to Doctrine #34, not a contradiction.

---

## Disk + clone status

- Clone: `/home/claude-code/buzz-workspace/data/lane1/clones/lista-moolah` (85M, unchanged from Gate 1)
- No `forge install` executed (PoC build aborted at Phase 0 NEGATE → no need)
- Disk: 5.6G free / 85% used (delta +1% from Gate 1 start, likely from concurrent Pancake P-1 forge build)
- Within 88% halt threshold

---

## Recommended next-action

1. **Gate 2 LISTA pivot**: Operator decides whether to spend cycles on G2-LISTA-2 (MoolahVault setName/setSymbol) or G2-LISTA-5 (Liquidation callback rounding arbitrage, requires Spearbit Credit-Liquidation audit-dedup against the `onMoolahLiquidate` callback flow). G2-LISTA-2 is likely OOS-similar-to-G2-LISTA-3. G2-LISTA-5 is the strongest remaining candidate but requires Spearbit audit page-by-page read for dedup.

2. **Doctrine compound**: Sub-Rule 34.1 to Doctrine #34 (Upstream-Source Semantic Test) should land in `brain/Doctrine.md` (or `brain/Methodology-Doctrine.md` alias). Adds a step between Gate 1 surface map and Gate 2 dispatch: for DC-12 lens-hits, verify upstream-source-feed-class before dispatching.

3. **Lane queue**: Lista Gate 2 effectively foreclosed for current top-3 candidates. Pipeline reorder: next-highest-EV unscanned target (operator's call — likely a fresh Cantina/Immunefi intake or a Pancake P-1 follow-on after that wraps).

---

### Footer — R8 Calibrated Reporting

Evidence-grade per claim:
- `[EXECUTED]` (4): pypdf audit-corpus keyword scan (19 PDFs, zero hits); Pendle source pull from pendle-finance/pendle-core-v2-public main branch; LendingBroker.sol:1155-1166 emergencyWithdraw source-read; git log -S emergencyWithdraw addition date.
- `[INSPECTED]` (3): Lista PT oracle source files PTLinearDiscountOracle.sol + PTLinearDiscountMarketOracle.sol + test fork-test config; MANAGER deploy-script constant address; CLAUDE.md trust-model summary.
- `[ASSUMED]` (2): Immunefi's standard out-of-scope clause for centralization/privileged-role findings (rule-set is well-known but not freshly verified against Lista's specific Immunefi page text this dispatch); Venus ResilientOracle staleness behavior on the WBNB-USD leg (general knowledge, not source-verified this dispatch — out of scope since PT-side is the negation focus).

No `[EXECUTED]` claim relies on bytecode-verification (not needed — bug-class structurally negated at source level).
