# Gate-0 — Ankr Staking (Immunefi) — 2026-06-11

> Ogie msg 8233. Gate-0 FIRST (scope + realizable-EV + dedup) before the full sink. Local-fork only, operator-gated. Bismillah.

## STEP 1 — PROFILE
- **Platform:** Immunefi `immunefi.com/bug-bounty/ankr/`. Liquid-staking. KYC: **NO**. PoC required, **local-fork only**.
- **Reward (the EV constraint):** Critical SC = **5% of economic damage, MIN $10K, MAX $500K**. High $50K, Med $5K, Low $1K. Web-app tier separate (Crit $10K). Pays ANKR/USDT/USDC on ETH+Base.
- **Impacts in scope (Crit):** direct theft (at-rest/in-motion, excl. unclaimed yield), permanent freezing, MEV, protocol insolvency, + web/app. High: theft of unclaimed yield.

## STEP 1b — IN-SCOPE ASSETS (7: 6 SC + 1 web)
| # | Asset | Chain | Address | Logic (impl) | Source |
|---|-------|-------|---------|--------------|--------|
| 1 | ETH Pool (proxy) | ETH | `0x84db6eE82b7Cf3b47E8F19270abdE5718B936670` | impl `0xecce…bc4a` = **GlobalPool_R46** | Sourcify ✅ match |
| 2 | aETHc (proxy) | ETH | `0xE95A203B1a91a908F9B9CE46459d101078c2c3cb` | impl `0xe672…da64` = **AETH_R21** | Sourcify ✅ match |
| 3 | aETHb (proxy) | ETH | `0xd01ef7c0a5d8c432fc2d1a85c66cf2327362e5c6` | impl `0x518d…8125` = **FETH_R20** | Sourcify ✅ match |
| 4 | BNB Pool | BSC | `0x9e347Af362059bf2E55839002c699F7A5BaFE86E` | (proxy; impl TBD) | Sourcify ✗ (BscScan blocked) |
| 5 | ankrBNB | BSC | `0x52F24a5e03aee338Da5fd9Df68D2b6FAe1178827` | TransparentUpgradeableProxy | Sourcify proxy only |
| 6 | BNBStakingConfig | BSC | `0x67428dE0680494E448F1A19d33C2022a51719348` | (config) | Sourcify ✗ |
| 7 | Main Web App | web | `ankr.com/staking/*` | — | separate $10K tier |

(OUT of scope: ankrPOL/ankrAVAX/ankrFTM/ankrFLOW; aBNBc/aBNBb — discontinued post-2022.)

## STEP 2 — REALIZABLE-EV READ (per Doctrine #62 generalized — funds × formula, NOT headline cap)
- **TVL anchor (on-chain):** aETHc supply 7067 × ~$2033 ≈ **$14.4M** (2145 holders). ETH Pool direct balance ~97 ETH (~$159K; staked principal sits in the beacon deposit, not the pool). ankrBNB (BSC) is a separate multi-$M system.
- **Realizable $ = min($500K cap, 5% × economic-damage):** floor **$10K**; a single-function theft affecting ~$1–3M → **$50K–$150K**; full ETH-system insolvency (~$14M) → 5% = $700K → **$500K cap**.
- **Honest band: $10K (floor) → ~$150K (realistic) → $500K (full-insolvency tail).** The 5% formula is stingy; the core (GlobalPool/AETH/ankrBNB) is heavily audited (R46/R21/R20 revisions + post-2022 hardening) → low p(find) on core.

## STEP 2b — DEDUP (HARD)
- **2022 aBNBc infinite-mint** (func sig `0x3b3a5522` bypassing `onlyMinter`, ~$5M) → aBNBc/aBNBb **discontinued, NOT in scope**. The **mint-authority-bypass class is a KNOWN-ISSUE boundary** — do NOT re-tread on AETH/FETH/ankrBNB. Cross-ref ankr.com/docs/staking/extra/audit-reports/ (ineligible list).
- No prior Buzz Ankr hunt; not in submission/NEGATE ledger. Clean.
- Gate-0 OOS: oracle (excl. manip/flashloan), governance/51%, liquidity, sybil, **centralization**, **leaked-credentials/privileged-address** (→ admin paths OOS, Doctrine #59), stablecoin depeg, github-secrets, feature-requests, phishing.

## STEP 3 — TARGETING (Ogie: "thin-within-the-funded", not the combed LST core)
- **Primary (least-trafficked):** `FETH_R20` (aETHb **bond** variant — far less used than the aETHc certificate), `GlobalPool_R46` **non-core paths** (unstake/claim/ratio/pending/migration, NOT the audited stake-core), `BNBStakingConfig` (config-driven invariants).
- **Avoid:** AETH_R21 certificate core + the mint-authority class (aBNBc boundary).
- **Hunt:** permissionless direct-theft / freezing / insolvency on the thin paths — ratio/exchange-rate manipulation (in-scope: oracle *manipulation* is NOT excluded), share/cert accounting, pending-unstake queue, claim double-spend, cross-variant (b↔c) conversion seams.

## FEASIBILITY
ETH logic source available (Sourcify match) → Foundry local-fork PoC feasible. BSC source needs impl-resolution (RPC) + Sourcify-56/repo (BscScan blocked) — handle if targeting BSC.

## STEP 5 — GATE-1 FINDINGS — NEGATE-COMPOUND (22 agents, 4 angles + separate-context verify + completeness critic)

**17 candidates → 0 REAL / 0 NEEDS_POC / 17 NEGATE.** The completeness critic independently re-read all 3 impls + libs and re-derived the rounding math (3M-iteration integer model) — confirmed and *strengthened* every NEGATE.

**Why the thin paths are clean:**
1. **FETH bond ↔ AETH cert (A1):** the Ceil(`bondsToShares`)/Floor(`sharesToBonds`) asymmetry is **display-only** — every aETHc asset leg (`lockShares`/`unlockShares`/`*For`) moves **1:1 in shares**, gated on `_shares[account]`, never on `totalSupply()`/`balanceOf()`. Fee is a fully-backed redistribution to `swapFeeOperator` (≤1%, onlyOwner-set = OOS). A direct aETHc donation only raises solvency (redemption is `_shares`-gated, not balance-gated → no ERC4626 inflation). Conservation exact across 200K+ modeled cycles.
2. **Claims (A2):** `claimManually`/`claimAETH`/`claimFETH` are CEI-correct (state zeroed before transfer) + `nonReentrant` + AETH has no transfer hook (empty `_beforeTokenTransfer`, no `_afterTokenTransfer`) → no reentrancy/double-claim; claimable increments are 1:1 deposit-backed; the only claimable-setter (`updateClaimableShares`) is onlyOwner (OOS).
3. **Unstake queue (A3):** FIFO consumed once via delete+monotonic gap; `For`-variants burn the **caller's own** shares; ETH payout only via `distributeRewards` (onlyOperator). No double-process/front-run/foreign-claim.
4. **Ratio/stake/insolvency (A4):** `ratio()` is a **privileged stored scalar** (onlyOperator `updateRatio`: 12h cooldown, downward-only, threshold-banded; onlyOwner `repairRatio`) — **not balance/market-derived**, so the in-scope oracle-*manipulation* carve-out has **no permissionless surface**. `restake()` is a credit-less self-donation no-op (protocol-recoverable). Stake-mint(Ceil)/unstake(Floor) asymmetry = **1 wei** worst-case round-trip → gas-negative, ~6e14× below the $10K floor.

**The structural NEGATE driver:** the **5%-of-damage / $10K-floor** reward formula makes the entire dust/rounding class unbankable even where a real asymmetry exists. And every value-moving primitive is either 1:1-deposit-backed or privileged (OOS). **No permissionless direct-theft / insolvency / freeze. NEGATE. Not submitted.**

## LENS BANKED → Doctrine #63
(1) **Rebasing LST shares-vs-bonds rounding is DISPLAY-ONLY when redemption is share-gated, not balance-gated** — the ERC4626 inflation attack needs share-MINTING to read a balance-derived price; an LST that mints 1:1 on deposit (not on a balance read) is immune; verify the redeem gate reads `_shares`, not `totalSupply()/balanceOf()`. (2) **Before hunting "oracle/ratio manipulation" (even where in-scope), verify the ratio SOURCE** — a privileged *stored scalar* (operator setter w/ cooldown/bands) has no permissionless manipulation surface; only a *balance/market-derived* ratio is attackable. (3) **A %-of-damage + min-floor reward formula converts the whole dust/rounding class into structural NEGATEs** — compute the per-op residual × realistic volume vs the floor at Gate-1, foreclose if it can't cross.
