<!-- P4P2-PRIVATE-SUPPRESS — PLATFORM-ONLY DISCLOSURE (Cantina/Immunefi live program). NO public content drafts. -->

# Morpho Vaults V2 — Gate 1 (PRIVATE: Cantina/Immunefi) — NEGATE [INSPECTED] (curator/allocator-accounting seam sound)

**Date:** 2026-05-29 (queue #3, Ogie msg 8034 APPROVED dispatch)
**Target:** `morpho-org/vault-v2` (Solidity 0.8.28, Forge), in Morpho's **live $1.5M Cantina+Immunefi bounty** (Vaults V2 in scope; the `morpho-vaults-v2` Cantina *competition* is a separate finished event — the live BOUNTY is the submission path, KYC at payout). Blobless clone `gate2-clones/morpho-vault-v2` (HEAD `398f85b`, **2026-05-06 ~3wk fresh**).
**Substrate:** EVM Solidity — CANDIDATE-I (ERC4626 share-accounting) + Pattern-E (rounding) + DC-9 (roles/timelock) + Doctrine #43 (per-step). Step-3a: curator/allocator-accounting primitive confirmed in `VaultV2.sol` (caps/allocate) + `MorphoMarketV1AdapterV2.sol` (cross-protocol value reporting) — NOT in the OOS `imports/` (V1 compat shims).

---

## STEP 1 PROFILE
- Platform: **Cantina + Immunefi live $1.5M bounty** (Vaults V2 in scope) [VER via morpho.org + cantina]. Separate finished `morpho-vaults-v2` competition ($200K, 2025-07) — NOT the live path.
- Cap: $1.5M pool (per morpho.org blog); memory `reference_morpho_bounty.md` notes Cantina Morpho bounty historically $2.5M cap, KYC required. Verify exact crit cap at submission (operator).
- Substrate: EVM Solidity 0.8.28, Forge. ERC-4626 + ERC-2612.
- **Audit-count: 10 reports** in `audits/` (4× Spearbit, Zellic, ChainSecurity, **Certora formal-verification**, 2× Blackthorn, + competition). Core audited 2025-05..09; **`market-v1-adapter-v2` got its own Dec-2025 round** (newest component).
- OOS: secrets-in-github-without-prod-proof; oracle/market-manipulation likely OOS (standard clause).

## STEP 2 OVERLAP — MEDIUM (operator-greenlit despite audit-saturation; Doctrine #42-refined)
- 2091 LOC src, tight. Net-new 2025 curated-vault standard (distinct from V1/MetaMorpho = DISC-018). Ogie greenlit as confirmed-fresh; curator/allocator-accounting named as bug-rich. But 10-audit-incl-Certora → low base-p (eyes-open queue-admission, Ogie msg 8031/8034).

## STEP 5 — 5-target checklist + source-read (curator/allocator-accounting seam)
**Covered [INSPECTED]:** `VaultV2.sol` FULL (roles/owner/curator/sentinel/allocator, timelock submit/accept/revoke/abdicate, absolute+relative caps, allocate/deallocate, deposit/mint/withdraw/redeem/forceDeallocate, accrueInterest(View), fees, ERC4626 preview math, permit, gates) · `MorphoMarketV1AdapterV2.sol` FULL (allocate/deallocate `change`, expectedSupplyAssets, realAssets, ids, supplyShares, burnShares, skim) · `MathLib` · `ConstantsLib`.

**Findings — all NEGATE (each candidate dissolved into documented/accepted design):**
1. **Adapter delta-accounting [INSPECTED]:** `change = newAllocation(=expectedSupplyAssets) − oldAllocation(=stored id[2])` applied uniformly to the 3 shared cap-ids (adapterId, collateralToken, market) is the CORRECT delta-propagation — keeps aggregate caps consistent under per-market interest. id[2] hash binds adapter address + full marketParams → no cross-adapter/cross-market collision. NEGATE.
2. **Soft-caps-vs-interest:** stale aggregate allocation (sibling market interest uncounted until touched) can let total real exceed an absolute/relative cap — **but NatSpec L56 documents this as accepted** ("Caps can be exceeded because of interest and donations"). Not a bug. NEGATE.
3. **relativeCap on `firstTotalAssets` (L595):** flashloan-resistant snapshot (transient, set at first accrual of tx); big deposits via liquidity adapter check against PRE-deposit total → conservative false-positive (revert), not a bypass (NatSpec L63-64). NEGATE.
4. **ERC4626 rounding (CANDIDATE-I/Pattern-E):** all 4 previews vault-favorable — deposit/redeem `mulDivDown`, mint/withdraw `mulDivUp`; virtual shares + `+1` inflation defense. No rounding-extraction. NEGATE.
5. **Once-per-tx accrual / reentrancy:** no ReentrancyGuard, but `firstTotalAssets` transient = once-per-tx accrual lock (anti-shorting, L32-33); adapters "must not re-enter" (L78) + ERC777-style token reentrancy EXCLUDED by TOKEN REQUIREMENTS (L114-120). Curator-vetted adapters. NEGATE (documented assumptions).
6. **deallocate burnedShares underflow / burnShares writeoff:** `supplyShares -= burnedShares` underflow-reverts (0.8 checked) = DoS-safe; `burnShares` writeoff is an intentional curator tool (L36-39, timelocked). NEGATE.
7. **forceDeallocate penalty (L834):** penalty via `withdraw(.., address(this), onBehalf)` stays in vault (benefits holders); allowance-checked for onBehalf≠sender; capped 2%. NEGATE.

**Net: no concrete cross-module / curator-allocator-accounting discrepancy.** Every subtle edge pre-documented in the exhaustive NatSpec and covered by the 10-audit-incl-Certora cohort. NEGATE [INSPECTED]. Per time-box (Ogie: foreclose cheap, CONFIRM→PoC): no candidate → NO Foundry PoC.

## HONEST COVERAGE COUNTS (Ogie: "honest counts")
- **Read [INSPECTED]:** VaultV2.sol, MorphoMarketV1AdapterV2.sol, MathLib, ConstantsLib (the named curator/allocator-accounting core + freshest sliver).
- **NOT read (lower-EV / scope-expansion / parallel-pattern):** MorphoVaultV1Adapter.sol (V1-vault adapter, similar pattern), VaultV2Factory + adapter factories (boilerplate), Gate implementations (external/curator-supplied), SafeERC20Lib, AdaptiveCurveIrmLib (morpho-blue-irm dep), imports/ (V1 compat). A deeper multi-day audit could probe adaptive-curve-IRM interaction, V1-vault adapter, gate-callback edges, cross-adapter id-economics — beyond the named surface + heavily audited. NEGATE is scoped to the named curator/allocator-accounting seam, honestly bounded.

## Compounds
- **Doctrine #42-refined 3rd anchor (fresh ≠ unaudited):** Morpho V2 is 3wk-fresh HEAD but 10-audit-incl-Certora → predictable NEGATE, like Lido V3 + Symbiotic. **The freshest-sliver heuristic (hunt the newest-audited component, here MarketV1AdapterV2) is sound but doesn't manufacture p when that sliver is ALSO audited (Dec-2025 round).** Operator-greenlit ≠ high-p.
- **CANDIDATE-I NEGATING-EXAMPLE — Curated-vault-of-adapters delta-accounting** (`change = realValueNow − storedAllocation` propagated to shared cap-ids; soft-caps-w.r.t-interest intentional). Reusable on Aave/Euler vaults, Yearn v3, MetaMorpho — see `brain/Patterns-Defense-Classes.md`.

**Clone purge-eligible** (NEGATE complete; disk 67%).

---

_Gate 1: 2026-05-29-morpho-vaultv2 | PRIVATE/Cantina+Immunefi | **NEGATE [INSPECTED] (curator/allocator-accounting seam sound; 7 candidates all documented/accepted)** | NO PoC (no discrepancy, time-box cheap-foreclose) | Doctrine #42-refined 3rd anchor + CANDIDATE-I curated-vault delta-accounting NEGATING-EXAMPLE | single-agent | P4P2 suppressed_
