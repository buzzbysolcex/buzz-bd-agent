# Gate-1/2 Foreclosure — BENQI (Avalanche) Ecosystem Markets (Immunefi) — 2026-06-11

> Ogie msg 8240 (P4 HUNT LOOP TICK-2). Gate-0 INSTADAPP vs BENQI → picked BENQI. Full 10-layer audit (4 finder angles + adversarial verify + completeness critic, separate contexts). Auto-mode ANALYSIS-ONLY. Bismillah.

## SELECTION — BENQI over Instadapp (Ogie's tie-breakers, applied honestly)
- **Cleanest Foundry PoC:** BENQI is Avalanche-only and the Avax C-chain RPC is reachable from the box (`eth_blockNumber` OK); Instadapp's value concentration is **Fluid on Ethereum**, where the public RPC is Cloudflare-blocked → would be capped at `[INSPECTED]` on the crown jewel. Foundry 1.5.1 present (`~/.foundry/bin`).
- **Least-trafficked / dup-risk:** Instadapp-Fluid has a **live Cantina contest** (`instadapp-fluid`, density COMBED) actively combing the in-scope code → worst dup-risk. BENQI has no active competition.
- Orca skipped per Ogie (combed major DEX, Rust PoC, poor arsenal fit). Sherlock deprioritized. Ankr = tick-1 banked NEGATE (do not re-hunt).

## STEP 1 — PROFILE
- **Platform:** Immunefi `immunefi.com/bug-bounty/benqi`. Avalanche lending (Compound-v2/Moonwell fork) + sAVAX liquid staking + Ignite. KYC: **NO**. PoC: **local-fork only**, required all severities.
- **Reward (the EV constraint):** Critical SC = **10% of directly-affected funds, MIN $50,000, MAX $500,000**. High up to $20K. Web Crit flat $10K. Pays USDC/USDT (+ up to 80% $QI above $50K).
- **In-scope impacts (Crit):** direct theft, permanent freezing, protocol insolvency/bad-debt, **+ oracle manipulation / flash-loan (explicitly NOT excluded)**.

## STEP 2 — REALIZABLE-EV + DEDUP (Gate-0 PASS)
- **EV:** 10%/$50K-floor/$500K-cap. A real permissionless Critical clears the floor; the dust/rounding class cannot (Doctrine #63 lens 3 — higher floor than Ankr's $10K, so dust is *even less* bankable). Funds: ecosystem pool is small-to-mid ($M-scale per market); core qisAVAX/USDC are larger.
- **Dedup:** no prior Buzz BENQI hunt; not in submission/NEGATE ledger. Clean.
- **Egress:** lending redeem/borrow/liquidate present → NOT a recovery bounty (#62 N/A).
- **Gate-0 OOS (shaped the hunt):** (a) admin/privileged-without-code-mod (Doctrine #59); (b)+(c) **reward-distribution bugs** (zero-reward / temporarily-disabled markets); (d) **ERC-777 reentrancy**; (e) **incorrect data from third-party oracles** (but oracle *manipulation* is IN); (f) 51%/governance economic attacks.

## STEP 3 — TARGETING (thin-within-funded)
On-chain (`cast`, Avax C-chain) confirmed **risk-segregated pools**: ecosystem markets (qiCOQ/qiSolvBTC/qiJOE/qiAUSD/qiNXPC) run on a **separate Moonwell-fork Comptroller** `0xD7c4006d33DA2A0A8525791ed212bbCD7Aca763F` (impl `0xfc8C…2Ce1`, oracle `0x926C…d73A`), distinct from the Core Comptroller `0x486A…D9b4`. The ecosystem deployment is the newer/thinner/less-audited surface → primary target. Source pulled (Sourcify full-match + Routescan): 86 files / 17.5K LOC.

## STEP 5 — FINDINGS: 5 raw candidates → 0 permissionless / 0 survivors → **NEGATE**
22→effective 5-candidate fan: 4 finder angles + per-candidate adversarial verify (2 refute-biased skeptics) + a completeness critic that did independent on-chain `cast` work.

**ANGLE 1 — Oracle (IN-SCOPE oracle-manipulation):** NEGATE. `BenqiDualOracle`/`BenqiPriceOracle` are **purely aggregator-based** (`latestRoundData()`; grep = zero `getReserves`/`slot0`/`observe`/TWAP) → **no on-chain DEX-spot surface, flash-loan price-manip structurally absent.** Every state-changing fn is `onlyOwner`/`onlyAdmin` → zero permissionless write surface. The two genuine logic gaps — (N1) staleness→fallback returns the surviving feed **without a deviation cross-check** (`BenqiDualOracle.sol:363-371`); (N2) `getPriceAndTimestamp` ignores `answeredInRound`/`roundId` + no min/max bounds (`BenqiPriceOracle.sol:90`) — are reachable **only if the external third-party feed itself goes stale or returns wrong-but-positive** = explicitly OOS category (e). `[INSPECTED]`
- **Completeness-critic correction (material):** the **live `oracleMode() = 1 = CL_ONLY`, not DUAL** `[EXECUTED, cast]`. The dual-fallback gap is **not on the active price path** at all — single-mode reverts on the sole feed's staleness rather than silently using it. Oracle posture is *stronger* than the finders assumed.

**ANGLE 2 — Ecosystem Comptroller (Moonwell fork):** NEGATE. `liquidateCalculateSeizeTokens` truncates DOWN (never over-seize); `getHypotheticalAccountLiquidity` symmetric, no ordering/rounding bug; **`seizeAllowed` enforces `collateral.comptroller()==borrowed.comptroller()` (Comptroller.sol:459) → ecosystem & core pools CANNOT cross-seize**; `exitMarket` runs the hypothetical-liquidity check; deprecated-market liquidation bypass is admin-gated (CF=0 && paused && reserveFactor=1e18). `MultiRewardDistributor.sendReward` is `nonReentrant` and only moves **emission tokens, never principal** → any over-accrual = OOS reward-distribution class + can't clear floor. `[INSPECTED]`

**ANGLE 3 — QiErc20Delegate/QiToken core:** NEGATE. `doTransferIn` measures **balance-delta** (COQ/SolvBTC fee-on-transfer cannot over-mint); **first-depositor/donation inflation CLOSED by seeding** (qiCOQ totalSupply 4.5e21, qiSolvBTC 5.7e7; no permissionless way to empty a market to re-arm `totalSupply==0`); CEI correct + `nonReentrant` on all mutating internals; `sweepToken`/`_reduceReserves` admin-only; `_addReserves` permissionless but caller-detrimental donation. `[INSPECTED]`

**ANGLE 4 — sAVAX (StakedAvax) + qisAVAX (Doctrine #63 lenses):** NEGATE. Ratio is a **PRIVILEGED STORED-SCALAR pair** (`getPooledAvaxByShares`/`getSharesByPooledAvax` divide `totalPooledAvax`/`totalShares`; grep for `address(this).balance`/`balanceOf(this)` = ZERO `[EXECUTED grep]`) → no permissionless manipulation surface (lens 2). Direct AVAX → `receive()→submit()` **mints shares** (no naked-donation skew → ERC4626 inflation absent). Redeem shares-gated with 1:1 floor; cooldown queue strictly `msg.sender`-scoped (no foreign-claim). The oracle does **not** read the on-chain sAVAX ratio (grep `pooled|staked|shares` in oracle dirs = ZERO `[EXECUTED grep]`) → ratio move can't create bad debt. `[INSPECTED]`

**Completeness critic — NEGATE CONFIRMED.** Also covered surfaces the angles skipped (qiToken ERC20 transfer/transferAllowed, mint/borrow/repay action sites, MRD depth, `_become`/`_setPriceOracle`/IRM — all admin-gated or canonical) and **independently traced the decimal convention on-chain** (`[EXECUTED]`: USDC 6-dec → oracle 9.997e29 = correct `1e(36-underlyingDec)`, cancels in liquidity math; the `18-decimals()` underflow only bites a >18-dec underlying, none live, admin-config DoS = OOS). Scope-boundary noted: oracle/comptroller would be bankable under Primacy-of-Impact **if** a defect routed through them — but none exists (zero permissionless price lever).

## VERDICT — NEGATE (not submitted). 0 permissionless direct-loss / freeze / insolvency survivor.
**Structural NEGATE drivers:** (1) oracle is admin/aggregator-only → in-scope oracle-manipulation carve-out has **no on-chain surface**; (2) Comptroller/qiToken are a faithful seeded Compound-v2/Moonwell fork where every conserved-quantity action site rounds in the protocol's favor, cross-pool seize is blocked, and first-depositor is closed by seeding; (3) sAVAX ratio is a privileged stored scalar (Doctrine #63); (4) the only permissionless reward path can't reach principal (OOS reward-distribution); (5) the $50K floor kills the dust class outright.

## LENSES BANKED → Doctrine #64 (cross-ref #63 LST, #59 admin-OOS, webfetch-direction-error)
1. **"Oracle manipulation IS in-scope" is an EMPTY carve-out when the oracle is purely aggregator/admin-priced** (no `getReserves`/`slot0`/TWAP). Grep for an on-chain DEX surface at Gate-1; absent → the in-scope oracle-manip impact has no permissionless lever and collapses to OOS third-party-feed-data or OOS admin.
2. **Always read the LIVE `oracleMode`/config on-chain, not just the most-interesting code path.** The dual-oracle staleness-fallback deviation-bypass looked like the prize; the live config (`CL_ONLY`) routes around it entirely. A code-path that isn't on the active configuration is not an exposure.
3. **Compound-v2/Moonwell ecosystem-market forks are defeated cross-pool by the `seizeAllowed` comptroller-equality check** — risk segregation (separate comptroller per pool) blocks cross-market collateral attacks by construction. Confirm the equality check before hypothesizing a cross-pool seize.
4. **A seeded market closes the first-depositor/donation exchangeRate-inflation class** — verify `totalSupply>0` on-chain AND that no caller can permissionlessly empty the market to re-arm the `totalSupply==0` branch.
