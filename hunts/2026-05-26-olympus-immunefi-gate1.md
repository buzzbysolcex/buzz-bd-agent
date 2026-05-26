# Gate 1 — Olympus DAO (Olympus V3 / Bophades) — Immunefi $3.33M no-KYC

**Date:** 2026-05-26
**Authority:** Operator dispatch (Lane 5 Immunefi-crawler verified live)
**Target repo:** github.com/OlympusDAO/olympus-v3
**HEAD SHA:** `ab021c3ce817c6c26c566d5fde1d29c1b271f131` (2026-05-19, "chore/brace-expansion-5-0-6")
**Clone:** `/home/claude-code/buzz-workspace/.gate1-work/olympus-immunefi-2026-05-26/` (depth=1, 50,614 LOC across 240 .sol files in src/)
**Layer 0 JSON:** `/home/claude-code/buzz-workspace/hunts/.olympus-immunefi-layer0.json`
**Lane 5 DB row:** `data/lane5/scope-monitor.db` programs WHERE program_name='olympus' AND platform='immunefi' (live)

---

## Step 0 — PRIOR-GATE-1 CORPUS LOOKUP

| Check | Result | Tag |
| --- | --- | --- |
| `Glob hunts/**/*olympus*` | 0 files | [INSPECTED] |
| `Glob hunts/**/*cooler*` | 1 file (`hunts/2026-05-25-cooler-loans-gate1.md`) — sibling target, cross-pollination input | [INSPECTED] |
| `Grep -i olympus brain/Watchlist-Candidate-Crossmap.md` | 1 tracking-only mention (line 409) — Doctrine #29 MIN-cap defense reference under cooler-loans row | [INSPECTED] |

No prior Gate 1 artifact. PROCEED.

---

## Step 1 — PROFILE (Lane 5 DB → URL-probe SKIPPED, Step 1 platform-status preflight satisfied by DB verification)

| Field | Value | Tag |
| --- | --- | --- |
| Platform | Immunefi (status='live' in `data/lane5/scope-monitor.db`) | [INSPECTED] |
| Canonical URL | `https://immunefi.com/bug-bounty/olympus/information/` | [INSPECTED] |
| Critical cap | $3,333,333 USD | [INSPECTED] |
| KYC | NO (`kyc_required=0`) | [INSPECTED] |
| Vault balance | NULL (not exposed by Immunefi for this program) | [INSPECTED] |
| Assets count | 72 (per DB row) — only first 12 visible without pagination; ~60 not enumerable via WebFetch (SPA-paginated) | [INSPECTED] for 12 of 72; [ASSUMED] for remaining 60 |
| Chains | Arbitrum, Avalanche, Boba, ETH, Fantom, Optimism, Polygon | [INSPECTED] |
| Substrate | Solidity ^0.8.15 / ^0.8.24, Default Framework (Kernel + Modules + Policies) | [INSPECTED] |

### IN-SCOPE explicit Ethereum mainnet (first page, 12 of 72)

| Asset | Address | [INSPECTED-grade] |
| --- | --- | --- |
| Clearinghouse v2 | 0xE634...ab4c | name + addr verified via Immunefi page |
| sOHM v2 | 0x0490...d460 | same |
| OHM v2 | 0x64aa...f1D5 | same |
| Staking v2 | 0xB63c...8020 | same |
| gOHM | 0x0ab8...a52f | same |
| Kernel | 0x2286...f54b | same |
| Emergency | 0x9229...4A75 | same |
| Roles Admin | 0xb216...9eC8 | same |
| Treasury Custodian | 0xC951...3Ccf | same |
| Olympus Price Config | 0xf6D5...9E90 | same |
| Bond Manager | 0xf577...B2A3 | same |
| Olympus Price | 0xd6C4...282f | same |

### OOS / unverifiable scope (60 of 72 assets, [ASSUMED]-grade)

Per the Information-page text, the program mentions "Inverse Bonds, Bond Manager, RBS Operator, Boosted Liquidity Vaults, Convertible Deposit, Deposit Manager, CCIP, Cross-Chain Bridge, Yield Repurchase Facility, Loan Consolidator" as bounty-relevant subsystems. These subsystems all exist in the repo (`src/policies/{Operator.sol,Heart.sol,BoostedLiquidity/,deposits/,bridge/,YieldRepurchaseFacility.sol,LoanConsolidator.sol,EmissionManager.sol,ReserveMigrator.sol}`) but specific deployed addresses were NOT verifiable via WebFetch (Immunefi SPA pagination). [ASSUMED] in-scope; pre-flight scope-check FLAG raised — any Gate 2 escalation MUST re-verify each address against the full Immunefi 72-asset list before submission (Veda OOS lesson).

### Out-of-Scope exclusions (Immunefi page-verified)

- Oracle manipulation not directly caused by code bugs
- Governance / 51% attacks
- Sybil, liquidity-impact, centralization
- Attacks requiring leaked keys / privileged access
- Stablecoin depeg not directly code-caused
- Social engineering / phishing

---

## Step 2 — BRAIN OVERLAP

| Lens | Match? | Notes |
| --- | --- | --- |
| **DC-9** Privileged state mutation w/o defense-in-depth | PARTIAL | Kernel.executeAction is `onlyExecutor` (single key — DC-9 sub-3 surface); MINTR.mintOhm is role-gated; multiple sub-pattern-4 candidates in deposits/ (asset-vs-receipt accounting). [INSPECTED] |
| **DC-12** Oracle staleness | PARTIAL | BLVaultManagerLido uses Chainlink `_validatePrice` with `updateThreshold`; the in-scope `OlympusPrice` and `OlympusPriceConfig` (PRICE module + PriceConfig policy) drive RBS — not inspected this Gate, defers to Gate 2. [ASSUMED] |
| **DC-13** Notification-callback CEI | NO | Clearinghouse v2 inherits CoolerCallback; `_onRepay` writes state BEFORE downstream calls (line 298-312). No nonReentrant-leakage seen. [INSPECTED] |
| **DC-9 sub-4** (state-not-invalidated repeated-mint) | **HIT (deposits/, [ASSUMED]-scope)** | ConvertibleDepositFacility.convert mints OHM on user-input `receiptTokenIn` but withdraws `actualAmount` from DepositManager where the comment explicitly says "actual amount withdrawn may differ from receiptTokenIn by a few wei" AND "Given a low enough amount, the actual amount withdrawn may be 0. This function will not revert in such a case." (DepositManager.sol:245). See Candidate C1 below. [INSPECTED]-code; [ASSUMED]-scope. |
| **Doctrine #29 MIN-cap defense** | **CONFIRMED PRESENT on DEPOSIT leg, NOT on WITHDRAW leg of BLVaultLido** | Deposit (line 174-184 in BLVaultLido.sol) does `min(ohmTknOraclePrice, ohmTknPoolPrice)` to cap mint. Withdraw (line 265-274) uses oracle-only `getTknOhmPrice()` then caps user payout at `min(actualWsteth, expectedWsteth)` and sends excess to TRSRY. Withdraw is bounded by oracle on the user-payout side — **NOT exploitable** for wsteth drain because excess goes to TRSRY, not attacker. [INSPECTED] |
| **CANDIDATE-I** ERC4626 share-asymmetry | PARTIAL | DepositManager `_withdrawAsset` uses ERC4626 `previewWithdraw`/`previewRedeem` with explicit `-1` adjustment (line 235-238) to account for rounding. **Defense IS PRESENT** — see C2 below for the nuance. [INSPECTED] |
| **CANDIDATE-O** Slippage double-count | NO | Operator.swap (in-scope) uses RANGE.price wall prices, fixed at Heart cadence. Not multi-step. [INSPECTED] |
| **CANDIDATE-Z** Rebase cache invalidation | NO | gOHM ↔ sOHM wrap is direct (no cached price field); Staking uses live rebase index. [INSPECTED] |
| **DC-7** Validating-field ≠ Consuming-field | PARTIAL | In ConvertibleDepositFacility.convert, OHM mint is based on `convertedTokenOut` calculated from `receiptTokenIn` (validating field) but the actual asset withdrawn is `actualAmount` (consuming field) — this IS the C1 lens hit. [INSPECTED] |
| **Doctrine #34** Post-audit composition multiplier | HIGH-SIGNAL | 5 audit dirs: 2024-10 loan-consolidator, 2025-05 ccip, 2025-07 + 2025-09 convertible-deposits, 2026-01 v1-migrator. Active dev. Cooler V2 + Convertible-deposits are POST-audit-baseline new components. | [INSPECTED] |
| **Selective-Coverage Defense Asymmetry** | PARTIAL | Emergency policy + Operator.deactivate + BLVault.deactivate pause-switches present. Layered. Not seen as flaw. [INSPECTED] |

**Overlap score: MEDIUM-HIGH** with the major caveat that the highest-EV lens hits (C1 deposit-asset asymmetry, BLVault MIN-cap defense check) are in [ASSUMED]-scope substrate (Convertible Deposits + BLVault). The IN-SCOPE substrate (legacy 12 assets — Clearinghouse v2, OHM, sOHM, gOHM, Kernel, Roles, Emergency, TreasuryCustodian, BondManager, OlympusPrice + PriceConfig) is MEDIUM overlap.

---

## Step 3 — EV CALCULATION

```
EV = P(finding) × bounty_cap × P(acceptance) × overlap_multiplier

  Optimistic (assuming OOS scope-verify confirms deposits + BLVault in-scope):
    = 0.10 × $3,333,333 × 0.5 × 0.75  (HIGH overlap multiplier × 0.75 OOS-risk discount)
    = ~$125,000

  Conservative (only legacy 12 assets in-scope):
    = 0.05 × $3,333,333 × 0.5 × 0.50  (MEDIUM overlap multiplier on mature substrate)
    = ~$41,700
```

**Reasoning:** P(finding) bounded by 5+ prior audits + Sherlock 2023 + Code4rena 2022 (mature). P(acceptance) 0.5 standard Immunefi. Olympus is reputable payer.

EV midpoint **~$83K** — high enough to justify a full Gate 1 spend. Below the Sky/Wormhole/Coinbase $500K-tier targets but well above watchlist threshold.

---

## Step 4 — QUEUE DECISION

**STANDARD (same-day Gate 1, completed in this artifact).** Recommended Gate 2 only if (a) scope-verify confirms convertible-deposits + BLVault in-scope, AND (b) one of C1/C2/C3 below survives Skeptic-style adversarial review on a deeper read.

---

## Step 5 — GATE 1 EXECUTION

### 5.0 Disk pre-check [INSPECTED]

Pre-clone: 87% (5.0G avail). Post-clone: 87% (4.9G avail). Delta ~100MB — projected stable. No HALT.

### 5.1 Clone [EXECUTED]

`GIT_TERMINAL_PROMPT=0 git clone --depth 1 https://github.com/OlympusDAO/olympus-v3.git .gate1-work/olympus-immunefi-2026-05-26/` — clean exit, HEAD ab021c3.

### 5.2 Pre-flight Scope-Check [INSPECTED with FLAG]

Veda-OOS-lesson flag raised: ~60 of 72 Immunefi-listed assets are NOT visible without SPA pagination. The 12 visible covers the legacy core (Kernel + ROLES + Clearinghouse v2 + OHM/sOHM/gOHM/Staking + TreasuryCustodian + PriceConfig + BondManager + OlympusPrice + Emergency). The Information page mentions deposits/BLVault/Operator/Heart/CCIP/RBS/LoanConsolidator/YRF/Bond as bounty-relevant. **Gate 2 MUST re-verify per-asset.**

### 5.3 Bytecode-Verify Prep [ASSUMED → INSPECTED-pending]

Plan: `cast code 0x2286...f54b` (Kernel) + `solc --standard-json` for `src/Kernel.sol` at HEAD SHA. Not executed this Gate. For C1 escalation: `cast code` against the deployed ConvertibleDepositFacility (address NOT obtained from Immunefi page; needs Olympus deploys file or block explorer).

### 5.4 Layer 0 git-security analyzer [EXECUTED, depth-1 limited]

Shallow clone yielded `total_commits=1`. Layer 0 captured only HEAD merge — touched 20 dangerous-area files (interfaces, MINTR, Burner, Emergency, LegacyBurner, Minter, bridge/CCIP, cooler/CoolerTreasuryBorrower, deposits/Base+Auctioneer+Facility+DepositManager, modules/DEPOS/OlympusDepositPositionManager). All in the convertible-deposits + bridge sphere. `late_changes.count=1, days_ago=7` — the brace-expansion chore. Limited diagnostic value from depth-1; not pursuing deeper history this Gate (would need depth=200 reclone, ~150MB more disk).

### 5.5 Inventory [INSPECTED]

- 240 .sol files, 50,614 LOC (src/)
- Modules: BLREG, CHREG, DEPOS, DLGTE, INSTR, MINTR, PRICE, RANGE, RGSTY, ROLES, TRSRY, VOTES (12 modules)
- Policies (selected, LOC): Operator (927), Heart (253), EmissionManager (818), Clearinghouse v2 (494), BoostedLiquidity/{BLVaultLido, BLVaultLusd, Managers} (~4 files), bridge/{CCIPBurnMintTokenPool, BurnMintTokenPoolBase} (188 LOC), deposits/{BaseDepositFacility(663), ConvertibleDepositAuctioneer(1198), ConvertibleDepositFacility(458), DepositManager(958), DepositRedemptionVault(1125), LimitOrders(776), ReceiptTokenManager(222)} = 5400 LOC
- audit/: 2024-10, 2025-05, 2025-07, 2025-09, 2026-01 (5 internal audit dirs)

### 5.6 5-Target Quality Checklist (Ogie msg 7519 mandatory)

| # | Target | Coverage in-this-Gate | Verdict |
| --- | --- | --- | --- |
| 1 | Withdrawals / Redemptions | ConvertibleDepositFacility.convert + BLVaultLido.withdraw + Operator.swap inspected. CEI ordering correct in all three. BLVault withdraw is oracle-bounded to user side (excess to TRSRY) — defense PRESENT. | [INSPECTED] CEI clean, defense in depth. |
| 2 | Liquidation + Oracle | Operator.swap uses RANGE.price (fixed wall, Heart-set). BLVaultManager uses Chainlink with `updateThreshold` + `_validatePrice` (line 655-680). Cooler V2 liquidation (out-of-this-gate, see cooler Gate 1) uses MonoCooler-internal LTV oracle. | [INSPECTED] Defenses present at each layer. |
| 3 | Deposit / Mint Shares | ConvertibleDepositFacility.convert + BLVaultLido.deposit + Operator.swap (reserve→OHM). **C1 lead surfaced here** — convertible-deposits asset/receipt accounting asymmetry. BLVault deposit uses `min(oracle, pool)` MIN-cap defense — Doctrine #29 PRESENT. | [INSPECTED] C1 candidate. |
| 4 | External Calls | Clearinghouse v2 → V1 Cooler.claimDefaulted (state-write-before-callback per cooler Gate 1). BLVault.deposit → Balancer.joinPool (after state write). BLVault.withdraw → Aura.withdrawAndUnwrap (state decremented before). CCIP bridge uses Chainlink token-pool burn/mint pattern (out-of-this-gate). | [INSPECTED] CEI clean where inspected. |
| 5 | Admin / Upgrade | Kernel.executeAction is `onlyExecutor` (single-key) — **standard Olympus tradeoff**, well-known. Module install/upgrade via Kernel. Pause switches: Operator.deactivate (OPERATOR_POLICY_ROLE), BLVault.deactivate (emergency_admin), Clearinghouse.emergencyShutdown (emergency_shutdown). Multi-tiered emergency surface. | [INSPECTED] No fresh angle. |

All 5 targets surfaced. C1 is the only Gate 2 lead worth carrying forward.

### 5.7 Manual Brain Lenses (worked notes)

**Doctrine #29 MIN-cap defense verification (BLVault Lido):** [INSPECTED]

- `BLVaultLido.sol:174-184` (deposit leg): `ohmWstethPrice = min(oraclePrice, poolPrice)` then `ohmMintAmount = (amount_ * ohmWstethPrice) / WSTETH_DECIMALS`. **MIN-cap PRESENT** on deposit-mint.
- `BLVaultManagerLido.sol:583-593` (`getOhmTknPoolPrice`): reads `vault.getPoolTokens()` DIRECTLY with NO `VaultReentrancyLib.ensureNotInVaultContext` defense (Pattern D enricher rule). Olympus relies on (b) MIN-cap, not (a) VaultReentrancyLib. Per audit-methodology-v2 v2.5 §"Balancer VaultReentrancyLib defense check", either is sufficient. (a) absent; (b) PRESENT for deposit, NOT applicable for withdraw because withdraw uses oracle-only AND caps user payout at oracle expected (excess to TRSRY, attacker pays gas + slippage for free, no exploit).
- **Verdict: Doctrine #29 MIN-cap defense PRESENT and architecturally correct on the deposit-mint asymmetry it was originally designed to defend.** No weakening observed at HEAD ab021c3.

**Operator.swap (in-scope):** [INSPECTED]

- Permissionless caller-facing (line 326-404, `nonReentrant`).
- Uses `RANGE.price(side, true)` wall prices set by Heart.beat.
- Comment at line 343-345 acknowledges `heart.beat front-running the sender` as a documented behavior.
- `_updateCapacity` decrements wall capacity BEFORE token transfer (CEI correct).
- OHM→reserve: `ohm.safeTransferFrom` → `MINTR.burnOhm` → `TRSRY.withdrawReserves(sReserve)` → `sReserve.withdraw(amountOut, msg.sender)`.
- reserve→OHM: `reserve.safeTransferFrom` → `sReserve.deposit(amountIn_, TRSRY)` → `MINTR.mintOhm(msg.sender, amountOut)`.
- **No surface for free OHM mint or reserve drain inspected.** RBS is the most-audited Olympus subsystem (Spearbit-class). Foreclosure.

**Clearinghouse v2.claimDefaulted (in-scope):** [INSPECTED]

- Permissionless. Validates `factory.created(coolers_[i])` + `lender == address(this)`.
- Inner `Cooler(coolers_[i]).claimDefaulted(loans_[i])` will revert on second-claim attempt (V1 Cooler clears the loan record).
- Keeper rewards capped at `min(5% of collateral, MAX_REWARD)`.
- `TRSRY.setDebt` updated with `outstandingDebt - totalPrincipal` (line 280-284). No underflow (ternary guard).
- **No fresh angle.** Cooler V1 + Clearinghouse v2 are heavily audited (Sherlock 2023 + Code4rena 2022).

**Kernel.executeAction (in-scope):** [INSPECTED]

- `onlyExecutor` modifier (line 227). Single-executor model is documented Olympus tradeoff.
- 5 action types: InstallModule, UpgradeModule, ChangeExecutor, MigrateKernel, (one more from policy install/uninstall).
- The "executor" is initially Olympus DAO multisig (per deployment scripts).
- **Not a fresh DC-9 sub-3 angle.** Single-executor is documented architecture, not a defect.

### 5.8 R8 Calibrated Reporting tags — applied per-row above.

### 5.9 Doctrine #30 primitive grep + HE-03b always-exclude

HE-03b dirs (certora, mocks, lib, forge-std, foundry_tests) are NOT used in this Gate's inspection — all reads are from `src/policies/` and `src/modules/`. Confirmed clean.

Doctrine #30 grep on top-3 leads: covered inline above (C1 traced through to `_withdrawAsset` definition; BLVault MIN-cap traced through deposit + withdraw legs; Operator.swap traced through getAmountOut).

### 5.10 Doctrine #32 v1.1 cycle-2 filter

- `audit_age.days_between_newest_audit_and_head = -7` (per Layer 0): newest audit dir mtime > HEAD commit time, meaning the audit dir was touched 7 days AFTER the HEAD commit. Audit is FRESH (≤180 days). **PASS gate (a).**
- `dangerous_area_changes.count = 1` (depth-1-limited; HEAD touches 20 dangerous files in the chore merge). For a depth-1 clone this is meaningful only as a single-point signal, not as the 30-day window cooler-loans Gate 1 used. Treating as PASS-with-caveat.
- **Verdict: Doctrine #32 PASS.** Olympus is active-dev, recently-audited substrate.

### 5.11 Doctrine #27 saturation filter

- 5 internal audit dirs + Sherlock 2023 + Code4rena 2022 + Kebabsec on V3 base + Spearbit-class on RBS = **moderate-to-high saturation**.
- $3.33M cap-per-program is substantial but **saturation-per-cap is lower** than Sky $10M or Wormhole $1M.
- Per cooler-loans Gate 1 verdict (FORECLOSURE on cooler V2 = heavily-audited): the SAME-class verdict applies to Olympus core legacy assets (Clearinghouse v2 + Kernel + Modules + ROLES + Operator + Heart + RBS).
- **Saturation: PASS** (clears Doctrine #27 because the LIKELY-HIGH-EV substrate is NEW (convertible-deposits + V1 migrator) which has only 1-2 audit rounds), but DO NOT spend cycles on legacy-core deep reads — those are foreclosed.

### 5.12 SURVIVING CANDIDATES

#### C1 — ConvertibleDepositFacility.convert: OHM mint based on `receiptTokenIn` while underlying withdrawn is `actualAmount` (delta acknowledged in source)

- **Files:** `src/policies/deposits/ConvertibleDepositFacility.sol:301-366`, `src/policies/deposits/DepositManager.sol:293-324, 244-246`
- **Mechanic:** In `convert(positionIds_, amounts_, ...)`, the loop accumulates `convertedTokenOut += previewConvertOut` based on user-input `depositAmount` (line 320-329). Then `DEPOSIT_MANAGER.withdraw(WithdrawParams{... amount: receiptTokenIn ...})` is called (line 346-355). DepositManager.withdraw returns `actualAmount` (line 295), where the source explicitly documents at line 245: *"Given a low enough amount, the actual amount withdrawn may be 0. This function will not revert in such a case."* Yet ConvertibleDepositFacility DISCARDS the returned `actualAmount` (no return-value capture at line 346) and proceeds to `MINTR.mintOhm(msg.sender, convertedTokenOut)` based on the user-input amount, NOT the actual asset withdrawn.
- **Lens fired:** DC-7 (validating-field [receiptTokenIn] ≠ consuming-field [actualAmount]) + DC-9 sub-4 (state-not-invalidated repeated-mint analog: asset-collateral asymmetry on mint-issuance).
- **Why it's NOT obviously dismissed:** The comment at line 341-342 of ConvertibleDepositFacility ACKNOWLEDGES the delta ("the actual amount withdrawn may differ from receiptTokenIn by a few wei, but will not materially affect the amount of OHM that is minted"). "A few wei" might be true for typical ERC4626 vaults at high TVL, but the DepositManager comment explicitly says the actual amount can be **0** for low enough inputs. If the user provides a `depositAmount` small enough that `_withdrawAsset` returns 0 (e.g., 1 wei against a vault with high share/asset ratio), the user gets OHM minted on `previewConvertOut` (computed at the position's stored conversion price) while ZERO asset reaches TRSRY. Repeated dust-conversion = inflation-from-nothing.
- **Defense considered:** DepositManager._validateOperatorSolvency runs AFTER `_withdrawAsset` (line 320-322). If the asset wasn't actually withdrawn (actualAmount=0), the operator's `_assetLiabilities` was decremented (line 314: `-= params_.amount`) anyway. **The solvency check (line 359) compares `operatorLiabilities > depositedSharesInAssets + borrowedAmount` AFTER the liability has already been reduced.** This makes the solvency check potentially insufficient to catch dust-conversion drift — the liability accounting was already adjusted by `params_.amount`, not `actualAmount`. **This is a real lead worth Gate 2.**
- **Caveat:** [ASSUMED]-scope. ConvertibleDepositFacility is NOT in the 12-asset legacy list. The Information page mentions "Convertible Deposit" as bounty-relevant. Scope-verify required before submission.
- **R8 grade:** Code-level mechanic [INSPECTED]. Scope membership [ASSUMED]. Exploit construction [ASSUMED] — needs Foundry PoC measuring dust-conversion magnitude across realistic vault states.

#### C2 — DepositManager.withdraw decrements `_assetLiabilities` by `params_.amount` regardless of `actualAmount`

- **File:** `src/policies/deposits/DepositManager.sol:313-321`
- **Mechanic:** Line 314 `_assetLiabilities[key] -= params_.amount` runs BEFORE `_withdrawAsset` (line 318). If `_withdrawAsset` returns `actualAmount < params_.amount` (e.g., due to ERC4626 share-rounding-down on tiny inputs), the recorded liability has been over-decremented. Over time, `_assetLiabilities` drifts below the true outstanding obligation, allowing future legitimate withdrawals to succeed even when the operator is actually insolvent on a true-accounting basis.
- **Lens fired:** CANDIDATE-I (ERC4626 share-asymmetry on cumulative accounting), DC-9 sub-4.
- **Defense considered:** Line 235-238 in `maxClaimYield` does have a `-1` adjustment. But that's for yield-claim, not withdraw. The withdraw path itself does NOT correct for the actual-vs-requested gap.
- **Sibling-finding to C1:** This is C1's accounting-ledger half. Together they form a paired hypothesis: convertible-deposit conversion drifts BOTH (a) OHM mint vs asset moved AND (b) operator liability ledger vs true obligation. Compound effect.
- **R8 grade:** Code-level mechanic [INSPECTED]. Scope membership [ASSUMED]. Exploit construction [ASSUMED].

#### C3 — BLVaultManagerLido.getOhmTknPoolPrice has NO Balancer VaultReentrancyLib defense

- **File:** `src/policies/BoostedLiquidity/BLVaultManagerLido.sol:583-593`
- **Mechanic:** `IVault(balancerData.vault).getPoolTokens(pool.getPoolId())` is called directly without `VaultReentrancyLib.ensureNotInVaultContext(vault)`.
- **Defense considered (audit-methodology-v2 v2.5 Pattern D enricher):** Olympus has chosen defense pattern (b) MIN-cap (oracle vs pool) on the DEPOSIT leg, which DOES protect deposit-mint against read-only reentrancy spike. On WITHDRAW, the function `getTknOhmPrice` is oracle-only — so the pool price is not read at all on withdraw user-payout-side. Excess wsteth on withdraw goes to TRSRY (attacker bears slippage). **Pattern D defense (a) absent; defense (b) sufficient for the use case as architecturally framed.**
- **Lens fired:** Pattern D (Balancer read-only reentrancy) — but MITIGATED at architecture level.
- **R8 grade:** [INSPECTED] no exploit path. **NOT a Gate 2 candidate** — this is a foreclosure-receipt: the defense is architecturally present and correct.

#### C4 (deprioritized) — Operator.swap permissionless + Heart-set wall prices

- **File:** `src/policies/Operator.sol:326-404`
- **Mechanic:** RBS swap is permissionless. Wall prices are Heart-managed. Heart is itself a policy with `_onlyWhileActive` and beat-cadence. The comment at Operator line 343-345 documents the known `heart.beat front-running` behavior (user's swap could land at a different price than the user expected if Heart.beat triggers in the same block).
- **Defense:** `minAmountOut_` parameter — user supplies their minimum acceptable output. Standard slippage check (line 346-347).
- **R8 grade:** [INSPECTED] defense PRESENT. **NOT a Gate 2 candidate** — this is the same RBS mechanic that's been Spearbit-audited and Sherlock-audited. Foreclosure.

---

## Step 6 — VERDICT

**Gate 1 status: SURFACED with 2 carry-forward leads (C1 + C2) and 2 foreclosure-receipts (C3 + C4).**

| Lead | Gate 2 recommendation | Conditional on |
| --- | --- | --- |
| C1 (ConvertibleDepositFacility.convert dust-mint) | **Y — pursue if scope confirmed** | Verifying ConvertibleDepositFacility deployed address is in the 72-asset Immunefi list (Step 5.2 scope-verify) |
| C2 (DepositManager.withdraw liability over-decrement) | **Y — paired with C1** | Same scope check |
| C3 (BLVault VaultReentrancyLib absence) | N — foreclosure-receipt | Architecture-level mitigation present |
| C4 (Operator.swap permissionless) | N — foreclosure-receipt | Documented + slippage-protected |

**Recommended next action:**

1. **Operator-gated:** Verify ConvertibleDepositFacility + DepositManager deployed addresses against the full Immunefi 72-asset list (page through SPA pagination or query Olympus deployments-canonical file). If in scope → Gate 2 C1+C2.
2. **If OOS:** Foreclosure on all 4 leads. Olympus legacy-12 substrate is heavily-audited, low fresh-EV. Watchlist-add for HEAD-monitor only.

---

## BRAIN COMPOUND PROPOSALS (FROZEN PENDING OPERATOR)

These are net-new lens/doctrine proposals derived from this Gate's worked findings. Frozen pending operator review before brain-write.

1. **DC-9 sub-pattern 5 candidate (proposal):** "Asset-vs-receipt-token accounting asymmetry on ERC4626-backed deposit-facility convert/redeem flows where the input-amount is used as the OHM-mint-driver but the actual-amount is the asset-moved." C1+C2 are the paired evidence. If C1 lands at Gate 2 with a Foundry PoC, this becomes a publishable doctrine. (Convergent with cross-domain-fragility-laws Pattern D family.)

2. **Lane 5 scraper enhancement proposal:** The Immunefi crawler currently records `assets_count` but not per-asset address list. For programs with paginated asset lists (72 here, similar for Coinbase Cantina, Aave, etc.), `assets_count > 12` should trigger a per-page scrape of asset names + addresses into a new `program_assets` table. This is the structural fix for the Veda-OOS-lesson recurrence prevented by Step 5.2.

3. **Doctrine #29 v1.1 amendment candidate:** "MIN-cap defense (oracle, pool) is sufficient on the DEPOSIT-MINT leg ONLY. On the WITHDRAW leg, the symmetric defense is oracle-only payout with excess-to-treasury (which Olympus BLVaultLido implements at line 270-272). VaultReentrancyLib defense (a) is NOT required when defense (b) is implemented symmetrically across mint AND payout." Olympus is the second confirmed implementer of this two-sided MIN-cap pattern (first was the doctrine's original anchor). Worth promoting to Pattern-Defense-Classes.md.

---

## EVIDENCE CITATIONS (R8 grades inline above)

- BLVaultLido.sol deposit MIN-cap: lines 174-184 [INSPECTED]
- BLVaultLido.sol withdraw oracle + excess-to-TRSRY: lines 265-276 [INSPECTED]
- BLVaultManagerLido.sol getOhmTknPoolPrice (no VaultReentrancyLib): lines 583-593 [INSPECTED]
- BLVaultManagerLido.sol _validatePrice: lines 655-680 [INSPECTED]
- ConvertibleDepositFacility.sol convert: lines 301-366 [INSPECTED]
- ConvertibleDepositFacility.sol delta-acknowledgment comment: lines 340-345 [INSPECTED]
- DepositManager.sol withdraw: lines 293-324 [INSPECTED]
- DepositManager.sol "actualAmount may be 0" comment: line 245 [INSPECTED]
- DepositManager.sol liability decrement before actualAmount return: line 314 vs 318 [INSPECTED]
- DepositManager.sol _validateOperatorSolvency: lines 353-367 [INSPECTED]
- Operator.sol swap permissionless: lines 326-404 [INSPECTED]
- Operator.sol getAmountOut: lines 873-899 [INSPECTED]
- Operator.sol heart-front-running comment: lines 343-345 [INSPECTED]
- Clearinghouse.sol claimDefaulted: lines 229-290 [INSPECTED]
- Kernel.sol executeAction onlyExecutor: lines 227-256 [INSPECTED]
- Layer 0 git-security analyzer output: `hunts/.olympus-immunefi-layer0.json` [EXECUTED]
- Cooler-loans Gate 1 cross-pollination: `hunts/2026-05-25-cooler-loans-gate1.md` [INSPECTED]
- Lane 5 DB row for Olympus program: `sqlite3 data/lane5/scope-monitor.db ...` [EXECUTED]
- Immunefi scope page 1 of 5 (12 of 72 assets): WebFetch live 2026-05-26 18:42Z [INSPECTED]
- Immunefi pagination pages 2-5 (60 of 72 assets): not fetchable via WebFetch (SPA-paginated) [ASSUMED]

---

_Gate 1 filed: 2026-05-26 18:50 UTC | Buzz Standing-Intake Protocol v1.0 (Ogie msg 7435)_
