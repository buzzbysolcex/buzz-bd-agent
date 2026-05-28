# Gate 1 — Flux Finance (Immunefi) Lending Protocol Bounty

**Date (UTC):** 2026-05-28
**Target:** Flux Finance — Compound V2 fork, RWA-aware lending (fOUSG / fUSDC / fDAI / fFRAX / fUSDT), Ondo Finance team — Immunefi `fluxfinance` program
**Platform:** Immunefi
**Cap:** $550,000 Critical (no-KYC, PoC always required, flat rewards on lower tiers)
**Verdict:** **FORECLOSURE with 2 WATCHLIST-PARK candidates** — saturation-bound (Compound V2 fork lens-saturated per Doctrine #36 PERMANENT; first-mint inflation closed on existing markets; OndoPriceOracleV2 missing-floor is Doctrine #29 v1.1 one-sided MIN-cap candidate but third-party-oracle OOS likely caps it; KYC paired-pipeline symmetric on inspection; no Doctrine #39 / DC-13 sub-5 surface)
**Hunt path:** `hunts/2026-05-28-fluxfinance-immunefi-gate1.md`
**Clone path:** `data/lane1/gate1-clones/2026-05-28-fluxfinance/contracts/` (3.1MB)
**Disk at dispatch:** 85% / 5.4G

---

## STEP 0.5 — 5-CHANNEL SHORT-CIRCUIT PREREQUISITE

| # | Channel | Result | Action |
|---|---------|--------|--------|
| 1 | Brain ledger (`Watchlist-Candidate-Crossmap.md` + `hunts/intake-log.md`) | 1 brain ref: Watchlist `next-dispatch: Flux Finance G1` (v2.17 addendum). NO prior hunt content. | **PROCEED — clean target on first dispatch** |
| 2 | `brain/Audit-Reports-Library.md` | NO Flux Finance entry. Trail of Bits / ChainSecurity / OpenZeppelin / Halborn / Spearbit not indexed for this target. | **PROCEED — no library short-circuit** |
| 3 | In-source HEAD probe | Canonical `fluxfinance` GitHub org has **zero public repos**. Actual canonical is `flux-finance/contracts` (single repo, 14 stars, BSD-3-Clause). HEAD = `05bba79e`, **2023-02-07 21:50 UTC (1207 days frozen, single-commit shallow)**. | **HEAD identified; doctrine #37 Sub-Type B fires immediately (≥730d)** |
| 4 | Live Immunefi STATUS preflight | `immunefi.com/bounty/fluxfinance/` returns STATUS=Active since 2023-02-08; updated 2026-02-23; $550K Critical / $25K High / $10K Med / $1K Low (flat); KYC=No; PoC always required; 9 in-scope assets. | **STATUS ACTIVE — proceed** |
| 5 | Prior submissions / dedup receipts | Zero in `brain/Security-Research-Submission-Ledger.md`. | **PROCEED — first dispatch** |

**Verdict:** All 5 channels NEGATE the short-circuit. Standard Step 1-6 pipeline applies. R8 grades on each: [INSPECTED] (1), [INSPECTED] (2), [INSPECTED] (3), [EXECUTED] (4 WebFetch live), [INSPECTED] (5).

---

## STEP 1 — PROFILE

### Brief vs Live discrepancy (INFO #19 anchor)

| Field | Operator brief | Live Immunefi (preflight) | Resolution |
|-------|---------------|--------------------------|------------|
| Target | "Flux Finance — Ethereum, Compound V2 fork, **FRAX-affiliated**" | **Ondo Finance team built; FRAX is a SUPPORTED asset, not affiliated. Ondo Finance is the parent.** | **MATERIAL DRIFT — INFO #19 anchor #5 (substrate-affiliation drift)**. FRAX confusion arose from fFRAX being a market on Flux. The actual organizational parent is Ondo Finance (also issuers of OUSG). |
| Canonical repo | `fluxfinance/...` org or `frax-finance/fpi-lender` | **NEITHER exists. Canonical is `flux-finance/contracts` (note hyphen).** | **MATERIAL DRIFT — INFO #19 anchor #5b (org-name drift)**. `fluxfinance` returns zero public repos; FPI-Lender is a different FRAX-product entirely. |
| Substrate | Solidity (Compound V2 fork) | Confirmed: Solidity 0.6.12 (V1 oracle) + Solidity 0.8.16 (V2 oracle, CTokenModified, CTokenCash) | OK |
| Chains | Ethereum | Confirmed (ETH only) | OK |
| KYC | No | Confirmed | OK |
| Bounty caps | $550K Critical | $550K Critical / $25K High flat / $10K Med flat / $1K Low flat. Critical = 10% of funds-at-risk capped at $550K. | OK |
| Payer history | TBD | Not visible on Immunefi public page (no total-paid disclosed) | **WEAK PAYER HISTORY — apply $0-zone P(acceptance)≈0.3 (between $0 default 0.2 and established 0.5; Ondo is reputable issuer but bounty-payout track record opaque)** |
| Launch date | TBD | 2023-02-08 | 3.3 years live |
| Last updated | TBD | 2026-02-23 | 3 months stale on program page |
| PoC required | Yes | "Proof of concept is always required for all severities" | OK |

### In-scope assets (Step 5.2 pre-flight scope-check)

| # | Contract | Address | Chain | Tier | Bytecode-verify plan (deferred to G2) |
|---|---------|---------|-------|------|-----|
| 1 | Unitroller (Comptroller proxy) | `0x95Af143a021DF745bc78e845b54591C53a8B3A51` | ETH | Critical | `cast code 0x95Af...3A51 --rpc-url $ETH_RPC` vs `contracts/lending/compound/Unitroller.sol` HEAD source at Gate 2 |
| 2 | fOUSG (cCash variant) | `0x1dD7950c266fB1be96180a8FDb0591F70200E018` | ETH | Critical | `cast code` vs `CCash.sol` impl behind `cErc20ModifiedDelegator.sol` proxy |
| 3 | fUSDC | `0x465a5a630482f3abD6d3b84B39B29b07214d19e5` | ETH | Critical | `cast code` vs `CErc20.sol` impl behind `cErc20ModifiedDelegator.sol` proxy |
| 4 | fDAI | `0xe2bA8693cE7474900A045757fe0efCa900F6530b` | ETH | Critical | `cast code` vs `CErc20.sol` impl |
| 5 | fFRAX | `0x1C9A2d6b33B4826757273D47ebEe0e2DddcD978B` | ETH | Critical | `cast code` vs `CErc20.sol` impl (added 2023-03-21, **42 days post-launch, post-Code4rena**) |
| 6 | fUSDT | `0x81994b9607e06ab3d5cF3AffF9a67374f05F27d7` | ETH | Critical | `cast code` vs `CErc20.sol` impl (added 2023-03-21) |
| 7 | OndoPriceOracle V2 | `0xba9b10f90b0ef26711373a0d8b6e7741866a7ef2` | ETH | Critical | `cast code` vs `OndoPriceOracleV2.sol` HEAD source |
| 8 | GovernorBravoDelegator | `0x336505EC1BcC1A020EeDe459f57581725D23465A` | ETH | Critical | Off-the-shelf Compound governance; centralization-OOS clause likely captures most surfaces |
| 9 | Timelock | `0x2c5898da4DF1d45EAb2B7B192a361C3b9EB18d9c` | ETH | Critical | Off-the-shelf; centralization-OOS clause likely captures |

**Etherscan probe blocked at intake (HTTP 403 on free WebFetch);** bytecode-verify deferred to Gate 2 per Standing-Intake Step 5.3.

### Out-of-scope (Immunefi page reconciliation — material exclusions)

- **"Third-party oracle data errors (excluding flash loan attacks)"** — DOWNGRADES (1) Compound UniswapAnchoredView `0x50ce56A3239671Ab62f185704Caedf626352741e` dependency in OndoPriceOracleV2.getUnderlyingPrice OracleType.COMPOUND branch (line 100-103); (2) Chainlink oracle staleness on OracleType.CHAINLINK branch (line 291-316). Only flash-loan-amplified manipulation of these oracles would be in-scope.
- **51% attacks, Sybil attacks, liquidity impacts, centralization risks, best practices, social engineering, leaked credentials, phishing** — standard exclusions
- **"Impacts caused by attacks requiring access to privileged addresses without additional modifications"** — DOWNGRADES (1) admin-only KYC setters in CTokenModified.sol L1359/L1381; (2) `onlyOwner` OndoPriceOracleV2 oracle-type / price-cap setters L128/L143/L161/L180/L192/L232; (3) Comptroller pause guardians L1289/L1305/L1317/L1329; (4) Governor Bravo / Timelock controls

### LoC inventory

| Module | LoC (HEAD master) | Substrate |
|--------|-------------|-----------|
| `contracts/lending/tokens/cToken/*.sol` (CTokenModified+CTokenInterfacesModified+CTokenDelegate+CErc20) | 2225 LoC across 4 files | Solidity 0.8.16 — **forked from Compound cDAI with KYC/sanctions add-ons** |
| `contracts/lending/tokens/cCash/*.sol` (CTokenCash+CTokenInterfacesModifiedCash+CCashDelegate+CCash) | ~2200 LoC across 4 files | Solidity 0.8.16 — **forked from same with KYC-only + protocolSeizeShareMantissa=0** |
| `contracts/lending/tokens/cErc20ModifiedDelegator.sol` | 1270 LoC | Solidity 0.8.16 — **modified delegator with kycRegistry + kycRequirementGroup constructor params** |
| `contracts/lending/OndoPriceOracleV2.sol` | 325 LoC | **NEW post-V1-oracle composition surface** — Doctrine #34 sub-b primary fire |
| `contracts/lending/OndoPriceOracle.sol` | 127 LoC | V1 oracle (likely superseded by V2 in production) |
| `contracts/lending/JumpRateModelV2.sol` | unknown | Compound V2 IRM with `blocksPerYear` adjusted |
| `contracts/lending/compound/*` (Comptroller+Unitroller+Comp+GovBravo+Timelock) | ~5000 LoC | Pure Compound V2 fork; diff vs `compound-protocol/3affca87` = **import paths + title only** — IDENTICAL to canonical Compound V2. Lens-saturated. |

**Total in-scope-graph LoC:** ~11,150 lines core (of which ~5,000 is pure Compound V2 = lens-saturated, ~6,150 is modified surface).

### Audit inventory (Step 5.7 — Doctrine #34 sub-class b regression scan prep)

| Firm | Report | Year | Coverage |
|------|--------|------|----------|
| Code4rena | `2023-01-ondo-findings` (74 wardens, 85 issues) | Jan 11-17, 2023 | 19 contracts, 4,365 LoC. **Findings:** 1 HIGH (H-01 `completeRedemptions` totalBurned-not-updated, **CashManager — OOS for Flux Immunefi**), 5 MEDIUM (M-01 admin-cannot-refund-sanctioned-users **Cash OOS**; **M-02 First Deposit Bug — CANDIDATE-I cToken inflation, AUDITED**; M-03 setEpochDuration **Cash OOS**; **M-04 KYCRegistry signature replay — DC-5+DC-13, but KYCRegistry NOT in Immunefi scope**; M-05 setPendingRedemptionBalance **Cash OOS**). |

**TOTAL: 1 contest, ~6 valid findings.** Doctrine #27 saturation tier = **LOW (<8 audits = 1.0× multiplier, no audit-density discount).** Below catalog threshold (15+).

**Critical drift signal (Doctrine #34 sub-class b PRIMARY FIRE):**
- Code4rena audit period: **Jan 11-17, 2023**. Deployment: Feb 8, 2023. Net audit-to-deploy gap = 22 days.
- **fFRAX + fUSDT markets added 2023-03-21 = 42 days post-Code4rena, 41 days post-V1-deploy** — post-audit composition surface
- **OndoPriceOracleV2 contract** (deployed 0xba9b10f9..., 325 LoC) added price-caps + Chainlink + OracleType enum **AFTER** V1 OndoPriceOracle was audited (V1 is 127 LoC, much simpler) — post-audit composition surface, +198 LoC of new logic
- Per Doctrine #34 sub-class b OPERATIONALLY PERMANENT cluster (5 anchors): post-audit composition multiplier applies; +0.30 P(finding) boost on V2 oracle surface

`audit/` PDFs absent from clone (Code4rena findings repo only; not bundled). Doctrine #27 Corollary B Vector 1-4 (audit-PDF remediation-language search) **DEFERRED** to Gate 2 via Code4rena findings repo direct fetch (4kB report).

---

## STEP 2 — BRAIN OVERLAP SCORE

### Day-27/28 stack applied:

| Lens | Applicability | Map to in-scope surface | Strength |
|------|--------------|------------------------|----------|
| **DC-7** (Validating-Field ≠ Consuming-Field) | YES — borrow/repay/liquidate paired pipeline | borrowFresh validates KYC on borrower; repayBorrowFresh validates KYC on payer+borrower; liquidateBorrowFresh delegates via repayBorrowFresh → indirect KYC on liquidator | MEDIUM (asymmetry exists but defense-by-indirection inspected as covering) [INSPECTED] |
| **DC-7 EXCLUSION CANONICAL** (3-anchor, 4 compound-impacts) | YES — applied as negative-control | Pre-filter DC-7 hits via Q1/Q2/Q3 matrix per Step 5.11 (below) | Filter applied |
| **DC-9 sub-2** (Privileged State Mutation Without Defense-in-Depth) | PARTIAL — `setKYCRegistry`, `setKYCRequirementGroup`, `setFTokenToOracleType`, `setPriceCap`, `setPrice`, `setOracle` are all zero-timelock onlyOwner/onlyAdmin | All Likely OOS per centralization-OOS clause | LOW (centralization-OOS) |
| **DC-9 sub-2 DEFENSE PATTERN** | YES — applies as foreclosure-filter | Owner = Timelock + Governor Bravo. Verify Timelock min-delay > 0 → if defense fires → centralization-OOS confirmed | Filter applied [INSPECTED] |
| **DC-12 (Oracle staleness)** | YES on OndoPriceOracleV2 Chainlink branch | `getChainlinkOraclePrice` line 306-311 checks `updatedAt >= block.timestamp - maxChainlinkOracleTimeDelay` ✓ defense PRESENT. No `minAnswer/maxAnswer` circuit-breaker. | MEDIUM (defense present; floor-cap missing → C-2 candidate) |
| **DC-13 sub-5** (Notification Path ≠ Authorization Path) | NO — all Comptroller `*Verify` hooks are NO-OPS (`Shh - currently unused`) | Phase 0 GATE: **PASS** — no exploitable notification surface | N/A |
| **Doctrine #27** (audit-saturation discount) | At 1 contest / 6 findings = LOW tier (no discount, 1.0×) | Multiplier = 1.0 | LOW penalty |
| **Doctrine #27 Corollary B** (remediation-language search) | Applies — Code4rena findings markdown grep at Gate 2 Phase 0 | Deferred until Gate 2 | Deferred |
| **Doctrine #29 v1.1** (MIN-cap defense) | **PARTIAL FIRE** — OndoPriceOracleV2 line 112-114 applies `_min(price, fTokenToUnderlyingPriceCap)` — this is a price **CEILING** only, NOT a **FLOOR**. One-sided MIN-cap. Defends upward depeg (USDC>$1) but NOT downward depeg (USDC<$1). | C-2 candidate. [INSPECTED] | MEDIUM-HIGH on V2 oracle |
| **Doctrine #34 sub-class b** (post-audit composition multiplier — 5-anchor OPERATIONALLY PERMANENT) | **PRIMARY HIT** — fFRAX + fUSDT added 42d post-Code4rena; OndoPriceOracleV2 added post-V1 audit | All NEW market listings + V2 oracle = post-audit composition surface | **STRONG** |
| **Doctrine #36 PERMANENT** (substrate-coverage / lens-saturation gate) | **PRIMARY HIT** — Compound V2 fork = lens-saturated substrate (well-known surface; ~5,000 LoC of canonical Compound code = identical) | Apply P(finding) ≤ 0.05 floor for lens-saturated Compound V2 fork surface | **STRONG (saturation cap applied)** |
| **Doctrine #37 Sub-Type B PERMANENT** (Audited-and-Frozen-but-Product-Live, 4-anchor) | **PRIMARY HIT** — Single-commit repo, 1207 days frozen since 2023-02-07; live on-chain deployments active with millions in TVL | Composition surface (V2 oracle, V2 deployment with fFRAX/fUSDT/fLUSD) = highest-EV; base CToken lens-walk is audit-survived | **STRONG** |
| **Doctrine #38** (Pure Pass-Through `*WithSig` FORECLOSE) | NO — no `*WithSig` pattern; KYCRegistry signature replay is M-04 already-audited and not in Immunefi scope | N/A | — |
| **Doctrine #39** (Notification Path ≠ Authorization Path — CANDIDATE) | NO — Comptroller `*Verify` hooks are NO-OPS, not notification surfaces | Phase 0 GATE: **PASS** | N/A |
| **CANDIDATE-I** (ERC4626/cToken first-mint inflation) | YES — canonical Compound V2 surface | `exchangeRateStoredInternal` uses `getCashPrior()=balanceOf(this)` → inflation-attack surface. CLOSED on existing markets (fUSDC/fDAI/fOUSG live since Feb 2023, fFRAX/fUSDT since Mar 2023 — all have non-zero totalSupply 3+ years). FUTURE recurrence on any NEW market listing without anchor-mint contingent. Code4rena M-02 confirmed this class. | LOW (closed on existing); MEDIUM contingent on future listings |
| **CANDIDATE-J** (state-machine cooldown overwrite / state-residue) | YES on `setFTokenToOracleType` — switching enum without clearing residual mappings (e.g., stale `fTokenToChainlinkOracle[fX].maxChainlinkOracleTimeDelay` from prior CHAINLINK config) | Privileged-only (onlyOwner) → centralization-OOS. [INSPECTED] | LOW (OOS) |
| **CANDIDATE-O** (slippage double-count across swap steps) | NO — no router or multi-step swap; Compound V2 lending is single-step deposit/withdraw | N/A | — |

**Brain Overlap Score:** **MEDIUM-HIGH** — 3 direct lens hits (Doctrine #29 v1.1 partial fire on V2 oracle floor-cap; Doctrine #34 sub-b on V2 composition; Doctrine #37 Sub-Type B on frozen-but-live), but TWO STRONG NEGATIVE CONTROLS (Doctrine #36 lens-saturation P-floor cap; Doctrine #27 Corollary B pending audit-language verify; centralization-OOS clause eats most enum/setter angles).

---

## STEP 3 — EV CALCULATION

```
EV = P(finding) × bounty_cap × P(acceptance) × brain_overlap_multiplier × Doctrine_36_saturation_cap
```

| Factor | Value | Rationale |
|--------|-------|-----------|
| `P(finding)` baseline (MEDIUM-HIGH overlap pre-saturation) | 0.10 | Standing-Intake default for MEDIUM-HIGH |
| `Doctrine #36 lens-saturation P-floor cap` | 0.05 (cap) | Compound V2 fork = lens-saturated substrate; same baseline as Gearbox ETH-lending substrate floor |
| `P(finding) post-saturation` | **0.05** | Doctrine #36 floor binds |
| `bounty_cap` (Critical) | $550,000 | Per Immunefi |
| `P(acceptance)` | 0.30 | Weak payer history (no public total-paid data); Ondo reputable but bounty-track opaque → between $0-zone (0.2) and established (0.5) |
| `brain_overlap_multiplier` | 0.7 | Between MEDIUM (0.5) and HIGH (1.0); discounted for centralization-OOS eating most setters + Doctrine #36 floor binding |
| **Pre-discount EV** | **$5,775** | 0.05 × $550K × 0.30 × 0.7 |

**Discounted EV: ~$5K-$8K range.**

Pre-Doctrine-36 EV (operator brief estimate) was $27.5K; post-Day-27/28-brain-applied is **5x lower**. Doctrine #36 + payer-history weak + centralization-OOS clause cumulatively suppress.

Rank vs current pipeline:
- DISC-020 Filecoin pending response
- DISC-018 Morpho Cantina #1035 pending response
- DISC-017 Ethena CLOSED dup
- Templar G2 candidate pending
- Pancake P-1 paste-ready operator-gated

**Pipeline position:** below-median EV — comparable to Gearbox WATCHLIST-PARK (EV ~$3-15K post-Doctrine-#36). **WATCHLIST-PARK** is the natural verdict.

---

## STEP 4 — QUEUE DECISION

| Overlap | Bounty cap | Recommended action | Verdict |
|---------|------------|---------------------|---------|
| MEDIUM-HIGH (post-saturation MEDIUM) | $550K | Standard Gate 1 → assess for WATCHLIST-PARK based on Step 5 lens-walk | **GATE 1 COMPLETED → 2 WATCHLIST-PARK candidates → DEFER Gate 2 (below clean targets in queue)** |

---

## STEP 5 — GATE 1 EXECUTION

### 5.2 Pre-flight scope-check ✓

All 9 in-scope assets identified. Cross-reference repo-vs-Immunefi: contracts in `contracts/lending/tokens/cToken/` (CErc20+CTokenModified+CTokenInterfacesModified+CTokenDelegate) match in-scope fUSDC/fDAI/fFRAX/fUSDT (deployed via `cErc20ModifiedDelegator` proxy). `contracts/lending/tokens/cCash/*` matches fOUSG. `contracts/lending/OndoPriceOracleV2.sol` matches scope address. `contracts/lending/compound/governance/*` matches Bravo + Timelock. Unitroller = Comptroller proxy. **All 9 mapped.** No OOS/in-scope confusion at HEAD `05bba79e`.

### 5.3 Bytecode-verify prep ✓ (deferred to G2)

Etherscan 403 on free WebFetch. Plan: `cast code <addr> --rpc-url $ETH_RPC` + `solc 0.8.16 --standard-json` direct compile against the candidate source SHA. Deferred until Gate 2.

### 5.4 Inventory ✓ (above in Step 1)

### 5.5 Apply ALL brain lenses from Step 2 ✓ (above in Step 2)

### 5.6 5-Target Quality Checklist (MANDATORY)

| # | Target class | In-scope surface | Lens hits | Verdict |
|---|--------------|------------------|----------|---------|
| 1 | **Withdrawals / Redemptions** | `redeemFresh` (CTokenModified L576+) — sanction-check on redeemer; CEI proper (effects-before-doTransferOut); nonReentrant per-cToken `_notEntered` flag (NOT global Comptroller-level — CROSS-cToken reentry through Comptroller-routed callbacks possible per JustLend hunt's TRC20-callback pattern, but Compound V2 underlying assets (USDC/DAI/FRAX/USDT) don't have receive-hooks → not exploitable on Ethereum). | CANDIDATE-M (CEI break) — N/A no upgradeable hook; DC-1 reentrancy — N/A non-hook underlying. | [INSPECTED] CLEAN. No re-entry vector. |
| 2 | **Liquidation + Oracle** | `liquidateBorrowFresh` (CTokenModified L870) → delegates KYC via `repayBorrowFresh`; seize via `seizeInternal` checks sanction. `OndoPriceOracleV2.getUnderlyingPrice` → MANUAL/COMPOUND/CHAINLINK branches; Chainlink branch has staleness check (defense present); MANUAL branch is admin-set (centralization-OOS); COMPOUND branch hits UniswapAnchoredView (third-party-oracle OOS). **No `minAnswer/maxAnswer` circuit-breaker on Chainlink** → C-2 candidate. **`fTokenToUnderlyingPriceCap` is one-sided CEILING (no floor)** → C-3 candidate. | CANDIDATE-O (slippage double-count) — N/A no multi-step swap; **DC-12 (oracle staleness)** present defense; **Doctrine #29 v1.1 (MIN-cap)** one-sided fire; Pattern E (rounding asymmetry) — N/A. | [INSPECTED] C-2 + C-3 candidates surface here. |
| 3 | **Deposit / Mint Shares** | `mintFresh` (CTokenModified L491) — sanction-check on minter; CEI proper. `exchangeRateStoredInternal` = canonical Compound V2 formula `(cash + borrows - reserves) / totalSupply` → **CANDIDATE-I (first-mint inflation)** CLOSED on existing markets (3+ years totalSupply > 0). Future recurrence on new listings contingent on no anchor-mint in same tx as `_supportMarket`. `initialize_all.ts` deploy script DOES NOT include anchor mint. | **CANDIDATE-I** confirmed canonical anchor; **CANDIDATE-K** state-not-invalidated — N/A (no nonce-based state); **DC-9 sub-4 (repeated-mint state-not-invalidated)** — N/A. | [INSPECTED] CANDIDATE-I closed on existing; contingent on future listings (NOT current bounty surface). C-1 candidate documented for FUTURE recurrence watchlist. |
| 4 | **External Calls** | `doTransferIn` / `doTransferOut` use ERC20 SafeTransfer pattern (CErc20 L+); Comptroller `*Allowed` calls return error codes (not callbacks); Comptroller `*Verify` calls are NO-OPS (`Shh - currently unused`); `cTokenCollateral.seize(...)` external call to ANOTHER in-scope cToken (same-substrate trust). | Pattern I (call/delegatecall surfaces) — clean; DC-9 sub-3 (upgradeable hook no-timelock) — N/A no upgradeable hook in CToken; **CANDIDATE-M (Post-Audit CEI Break Via Upgradeable Hook)** — N/A no upgradeable hook here. | [INSPECTED] CLEAN. Phase 0 DC-13 sub-5 gate PASS. |
| 5 | **Admin / Upgrade** | `cErc20ModifiedDelegator` is a Compound-canonical proxy pattern with `setImplementation` (admin-gated, no timelock-on-proxy itself, but downstream-controlled by Timelock since admin = Timelock contract on Ethereum mainnet — likely). `setKYCRegistry` / `setKYCRequirementGroup` admin-gated. `_setPendingAdmin` + `_acceptAdmin` two-step pattern (defense present). | **DC-9 full family** — centralization-OOS clause eats most; DC-9 sub-2 DEFENSE PATTERN (Timelock = governance multisig) → defense fires → confirms centralization-OOS; CANDIDATE-P (Durable-Nonce) — N/A no Solana primitives. | [INSPECTED] OOS by centralization clause. |

**Step 5.6 5-Target Quality Checklist: ALL 5 TARGET-CLASSES TOUCHED. PASS.**

### 5.7 Audit / known-issues verification

Code4rena 2023-01 findings reviewed via WebFetch summary (Step 1 Audit inventory). Of 6 valid findings:
- H-01 + M-01 + M-03 + M-05 → **OUT-OF-FLUX-SCOPE** (CashManager — separate Ondo product not in Flux Immunefi scope)
- M-02 First Deposit Bug → **AUDITED**, CANDIDATE-I confirmed canonical; CLOSED on existing markets (see Target 3 above)
- M-04 KYCRegistry signature replay → **AUDITED, BUT KYCRegistry is NOT in the 9 Immunefi in-scope assets** (CTokenModified imports `IKYCRegistry` interface, doesn't include impl). External KYCRegistry — possibly third-party-substrate-OOS. Even if exploitable, finding would need to demonstrate impact on FLUX (not Ondo CashManager).

**Doctrine #27 Corollary B grep deferred to G2:** Code4rena findings markdown to be scanned for "mitigated", "fixed in PR #", "see commit" language — confirms remediation persistence.

### 5.8 Output ✓ (this file)

### 5.9 Auto-index via hunt-complete.sh PostToolUse hook ✓ (on save)

### 5.10 R8 Calibrated Reporting — claim-level evidence-grade tags

R8 tags applied throughout (see [EXECUTED] / [INSPECTED] / [ASSUMED] in surface map above). Summary:

- All static-source reads → [INSPECTED]
- WebFetch live Immunefi STATUS preflight → [EXECUTED]
- WebFetch GitHub canonical repo confirmation → [EXECUTED]
- WebFetch Code4rena findings count + severity breakdown → [EXECUTED]
- Etherscan bytecode probe attempt → [EXECUTED, FAILED 403]
- Bytecode-equivalence claim for deployed contracts vs HEAD source → [ASSUMED — deferred verification to G2 with paid RPC]
- Claim "fFRAX/fUSDT added 2023-03-21 post-Code4rena" → [EXECUTED] (Immunefi page Added column)
- Claim "OndoPriceOracleV2 added post-V1-audit" → [ASSUMED] (V1 contract present in repo + V2 contract present; deployment-order not directly proven from repo)

### 5.11 Cross-Protocol Defense Enumeration (MANDATORY)

| Paired pipeline | Forward action | Reverse action | Defense Validating-Field | Defense Consuming-Field | Asymmetry? |
|----------|----------|----------|----------|----------|----------|
| mint ↔ redeem | mint sanction-checks minter | redeem sanction-checks redeemer | sanctionsList.isSanctioned(minter) on mint | sanctionsList.isSanctioned(redeemer) on redeem | **NO** — symmetric |
| borrow ↔ repayBorrow | borrowFresh requires KYC(borrower) | repayBorrowFresh requires KYC(payer) AND KYC(borrower) | `_getKYCStatus(borrower)` on borrow | `_getKYCStatus(payer) && _getKYCStatus(borrower)` on repay | **MINOR** — repay requires PAYER KYC additionally; this protects against sanctioned-payer-funding-borrower; intentional defense [INSPECTED] |
| transfer ↔ transferFrom | sanction-check on spender/src/dst | sanction-check on spender/src/dst | identical | identical | **NO** — symmetric |
| liquidateBorrow ↔ seize | liquidateBorrowFresh delegates to repayBorrowFresh (KYC payer+borrower) + cTokenCollateral.seize | seizeInternal sanction-check liquidator + borrower | KYC via indirection + sanction on seize | sanction-only | **PARTIAL** — liquidator KYC via indirection; if cross-cToken liquidate, indirection still fires via repayBorrowFresh's `payer = liquidator` [INSPECTED] |
| mint ↔ seize (cross-action collateral inflow) | sanction-check on minter (first mint) | sanction-check on liquidator (collateral receipt) | symmetric | symmetric | **NO** |
| accrueInterest (single-side) | called before every mint/redeem/borrow/repay/liquidate | single-side, no reverse | n/a | n/a | n/a |

**Step 5.11 verdict:** No exploitable asymmetry. The borrow/repay payer-KYC discrepancy is **intentional defense** (prevents sanctioned-actor-via-proxy-payer pattern). The liquidate-via-indirection is **defense-by-composition** correctly maintained. **CLEAN.**

### 5.12 Doctrine #34 sub-b commit-diff inspection ✓

Single-commit repo (`05bba79e`, 2023-02-07). NO prior commits to diff against. Cannot perform Phase 0 Vector 5 commit-diff (no prior in this repo). However:
- README explicitly cites canonical Compound V2 commits (`compound-finance/compound-protocol/a3214f67` for cToken impl, `3affca8` for Comptroller). Diff vs `3affca87` for Comptroller = **import paths + title only** (verified above via bash diff). **CLEAN — no semantic delta.**
- V1 vs V2 oracle: V1 (127 LoC) → V2 (325 LoC) — V2 adds OracleType enum + Chainlink + price-cap + `getChainlinkOraclePrice`. **+198 LoC of post-V1-audit composition.** Per Doctrine #34 sub-b: V2 oracle requires re-validation by audit team OR by external researcher. No public audit visible for V2.

### 5.13 Doctrine #38 pre-check ✓

NO `*WithSig` pattern in any in-scope contract. Pure pass-through wrappers absent. KYCRegistry-related signature replay (M-04 Code4rena) is in EXTERNAL OOS KYCRegistry, not in scope. **PASS — no Doctrine #38 finding class on this target.**

### 5.14 Doctrine #39 + DC-13 sub-5 Phase 0 gate ✓

Comptroller `*Verify` hooks (mintVerify, redeemVerify, borrowVerify, seizeVerify, transferVerify) are all NO-OP stubs (`Shh - currently unused`, never affect control flow). They are **NOT notification surfaces** in the Doctrine #39 sense — they don't claim to provide authorization-relevant signal that consumers might confuse with authorization. Authorization is exclusively via `*Allowed` functions which return error codes that CALLERS check + revert on. **PHASE 0 GATE: PASS — no Doctrine #39 / DC-13 sub-5 fire.**

---

## CANDIDATE SURFACE (Step 5 lens-walk results)

### C-1 — CANDIDATE-I First-Mint Inflation Attack on Future Listings
- **File:** `contracts/lending/tokens/cToken/CTokenModified.sol` lines 357-379 (`exchangeRateStoredInternal`); `deploy/lending/production/initialize/initialize_all.ts` lines 21-22 (no anchor mint)
- **Class:** CANDIDATE-I (ERC4626/cToken first-mint inflation, canonical Compound V2)
- **Status:** **CLOSED on existing markets** (fUSDC/fDAI/fOUSG/fFRAX/fUSDT all have totalSupply > 0 since 2023, accumulated 3+ years of activity)
- **FUTURE recurrence:** contingent on next market listing without anchor-mint in same tx as `_supportMarket`. Even then, `_supportMarket` is Timelock-gated → governance proposal would be required; centralization-OOS clause likely captures.
- **Verdict:** **WATCHLIST-PARK — informational candidate, not actionable for current bounty.** Re-evaluate if Flux announces NEW market listing without anchor-mint provision.
- **R8 grade:** [INSPECTED] (source + deploy script reads); CLOSED-on-current-state [ASSUMED] pending bytecode verify (highly probable).

### C-2 — Doctrine #29 v1.1 One-Sided MIN-Cap (Missing Floor on Stablecoin Depeg-Downward)
- **File:** `contracts/lending/OndoPriceOracleV2.sol` lines 111-114, 75 (`fTokenToUnderlyingPriceCap` mapping definition)
- **Class:** Doctrine #29 v1.1 MIN-cap one-sided + DC-12 (oracle defense gap) + post-audit composition (Doctrine #34 sub-b)
- **Status:** [INSPECTED] V2 oracle applies `_min(price, fTokenToUnderlyingPriceCap[fToken])` as CEILING. No symmetric FLOOR. For Chainlink-OracleType assets, if Chainlink reports a stale-but-fresh-enough deeply-depegged price (e.g., USDC at $0.10 during a transient depeg event), V2 oracle returns that price unbounded-below → over-borrow → bad-debt scenario.
- **Bounty-class fit:** Critical "protocol insolvency". HOWEVER — "third-party oracle data errors (excluding flash-loan)" OOS clause likely captures unless framed as flash-loan-amplified. The flash-loan version: attacker flash-loans → depegs USDC briefly via Curve swap → triggers liquidation cascade on Flux using V2 Chainlink price → Chainlink updates lag → undercollateralized debt persists.
- **Gate 2 promotion criteria:**
  1. Verify on-chain V2 oracle config — which OracleType is fUSDC/fDAI/fFRAX/fUSDT set to? (Chainlink or Compound?)
  2. Check Chainlink USDC/USD aggregator's minAnswer/maxAnswer bounds (Chainlink aggregators OFTEN have minAnswer ≈ 0 — pin-to-bottom not impossible)
  3. Build Foundry PoC: fork mainnet → simulate USDC depeg via mocked oracle update → trigger liquidation cascade
  4. Verify whether protocol carries any natural FLOOR defense at Comptroller level (`liquidateCalculateSeizeTokens` math sanity-check)
- **Verdict:** **WATCHLIST-PARK — Gate 2 promotable IF (a) at least one in-scope fToken is currently CHAINLINK-type AND (b) flash-loan amplification framing survives OOS clause review.**
- **R8 grade:** [INSPECTED] source-level missing floor; [ASSUMED] flash-loan framing acceptability (Immunefi page says "third-party oracle errors EXCLUDING flash loan attacks" — strong indicator that flash-loan-amplified IS in-scope).

### C-3 (sub-candidate of C-2) — CANDIDATE-J `setFTokenToOracleType` State-Residue
- **File:** `contracts/lending/OndoPriceOracleV2.sol` lines 143-149
- **Class:** CANDIDATE-J (state-machine cooldown overwrite / state-residue)
- **Status:** [INSPECTED] `setFTokenToOracleType(fX, NEW_TYPE)` overwrites enum without clearing prior-type's mappings. Sequence: Set Y to CHAINLINK → configure Chainlink → admin changes to COMPOUND → admin changes back to CHAINLINK without re-configuring → stale `maxChainlinkOracleTimeDelay` reused.
- **Verdict:** **OOS (centralization)** — requires admin action. Cannot be triggered without privileged access.
- **R8 grade:** [INSPECTED] code-level confirmed; [INSPECTED] OOS by Immunefi privileged-address exclusion.

### Not-candidates (negative-control):
- DC-7 paired-pipeline asymmetry — Step 5.11 enumeration confirms symmetric defenses (no fire)
- Doctrine #39 / DC-13 sub-5 — Phase 0 gate PASS (no exploitable notification surface)
- Doctrine #38 — no `*WithSig` pattern
- CANDIDATE-O / Pattern-E — no multi-step swap / no arithmetic rounding asymmetry surface
- CANDIDATE-M — no upgradeable hook in CToken
- CANDIDATE-P — no Solana primitives

---

## STEP 6 — CONTINUOUS (deferred to commit-time)

Additions to be filed:
- `brain/Watchlist-Candidate-Crossmap.md` v2.18 addendum: row N+10 Flux Finance Immunefi WATCHLIST-PARK
- `hunts/intake-log.md` — one line per intake protocol
- `brain/Audit-Reports-Library.md` — index Code4rena 2023-01 Ondo Finance contest (1 H + 5 M, scope notes)
- `brain/Doctrine.md` — Doctrine #34 sub-b 6th-anchor enrichment candidate (Flux V2 oracle composition = anchor candidate; need 2nd confirming feature for promotion to 6-anchor cluster — defer until Templar G2 or next Compound V2 fork hunt)

---

## BRAIN COMPOUND PROPOSALS (5)

1. **F-1 — Watchlist row N+10 status (autonomous, FILE in v2.18 addendum)**: Flux Finance Immunefi WATCHLIST-PARK with C-2 (Doctrine #29 v1.1 missing-floor on V2 oracle Chainlink branch) as the surviving Gate 2 promotion candidate IF on-chain OracleType verification confirms CHAINLINK assignment.

2. **F-2 — Doctrine #34 sub-class b 6th-anchor candidate (PRE-PROMOTION queue)**: OndoPriceOracleV2 V1→V2 oracle composition surface (+198 LoC post-V1-audit). Single anchor candidate; needs 2nd confirming "post-audit composition multiplier" feature (e.g., the fFRAX/fUSDT post-launch market additions). Promote to 6-anchor cluster after Templar G2 or next Compound V2 fork hunt confirms second anchor.

3. **F-3 — Doctrine #36 PERMANENT FLOOR validation (DOCUMENT existing — already PERMANENT, this hunt validates again)**: Flux Finance hunt validates Doctrine #36 P(finding) ≤ 0.05 floor on Compound V2 fork substrate. EV dropped from $27.5K (operator brief) → $5.8K (post-Doctrine-#36 + payer-history). 5x reduction. Validation strengthens the "always-apply" prior.

4. **F-4 — INFO #19 7-axis drift catalog**: NEW drift axis "SUBSTRATE-AFFILIATION drift" (operator brief said FRAX-affiliated; live confirmed Ondo Finance-affiliated). Also "ORG-NAME drift" — `fluxfinance` vs canonical `flux-finance` (with hyphen). Now 7-axis (was 6: PLATFORM #1 Kiln, PLATFORM #2 Cap, TIME-drift OnRe, SCOPE-drift Gearbox, SUBSTRATE-LANGUAGE drift Gnosis, plus the two new from Flux).

5. **F-5 — Hunts/intake-log.md entry**: 2026-05-28 Flux Finance Immunefi `fluxfinance` MEDIUM-HIGH overlap → WATCHLIST-PARK with 2 candidates (C-1 CANDIDATE-I closed-on-existing-markets; C-2 Doctrine #29 v1.1 missing-floor pending Gate 2 on-chain verify).

---

## VERDICT SUMMARY

**Primary verdict:** **FORECLOSURE + WATCHLIST-PARK** (Gate 2 NOT immediately dispatched).

**Reasoning:**
- Doctrine #36 saturation-floor bind P(finding) = 0.05 → post-cap EV $5.8K → below median pipeline EV
- Doctrine #37 Sub-Type B confirms frozen-but-live composition surface is the highest-EV substrate, BUT V2 oracle's only Gate-2-promotable angle (C-2 missing-floor) is gated by:
  - Live on-chain OracleType verification (need RPC)
  - Flash-loan-framing acceptability review (need operator OOS-clause interpretation)
- All 5-Target classes touched; all Step 5.11 paired pipelines clean; Doctrine #38/39 + DC-13 sub-5 + DC-7 EXCLUSION CANONICAL all PASS without fire
- Audit landscape: 1 Code4rena contest (LOW saturation), 6 findings, none in current Flux Immunefi scope

**Next-action recommendation:**
1. **Park C-1 + C-2 in watchlist** (do not dispatch Gate 2 immediately)
2. **Probe on-chain V2 oracle config** at next gas-budget opportunity (single eth_call to `fTokenToOracleType[<each in-scope fToken>]` reads the enum — ~5 RPC calls total). If ANY fToken is set to CHAINLINK → C-2 becomes higher-EV Gate 2 candidate. If all are MANUAL or COMPOUND → C-2 collapses (MANUAL is admin-set centralization; COMPOUND is third-party-oracle-OOS).
3. **Move to next-highest-EV target** from Lane 5 DB

**Hunt path:** `hunts/2026-05-28-fluxfinance-immunefi-gate1.md`
**Clone disposition:** RETAIN until on-chain OracleType probe complete (clone is 3.1MB, low disk pressure). If C-2 collapses, purge.
**Disk status post-hunt:** 85% / 5.4G (clone added 3.1MB only; well under 87% halt threshold).

---

_Gate 1 closed 2026-05-28 ~16:45 UTC | Verdict FORECLOSURE+WATCHLIST-PARK | 2 candidates parked (C-1 closed-on-existing CANDIDATE-I; C-2 Doctrine #29 v1.1 missing-floor pending OracleType verify) | Doctrine #36 lens-saturation P-floor 0.05 binds | Doctrine #37 Sub-Type B 1207d frozen confirmed | Code4rena 2023-01 Ondo 1H/5M cross-walked (4 OOS-Cash, 1 audited-canonical, 1 OOS-KYCRegistry) | brain compounds F-1..F-5 queued | next-target: probe on-chain V2 oracle config OR next clean target from Lane 5 DB_
