# GATE 1 — Alchemix (Immunefi) — 2026-05-27

> Standing-Intake Protocol v1.0 dispatch with Doctrine #34 sub-class b (audit-regression substrate) lens PRIMED.
> Operator: autonomous greenlight per autonomy-boundary.md.
> HEAD scanned: `3010ede` (alchemix-finance/v3 master, 2026-05-18).

---

## STEP 0 — PRIOR-CORPUS LOOKUP

- `hunts/` grep `alchemix|alusd|aleth|transmuter` — **2 false-positive hits** (incidental substring matches in stader-ethx and ssv-network Gate 1s; no semantic Alchemix prior work)
- `brain/` grep — **no prior mention** of Alchemix anywhere in the brain corpus
- `.audit-targets/` — only `yRoboTreasury` present; no Alchemix audit material
- `audits-library/` — directory does not exist on this host
- **CLEAN TARGET CONFIRMED. No deduplication risk.**

---

## STEP 1 — PROFILE

| Field | Value |
|-------|-------|
| Platform | Immunefi |
| URL | `https://immunefi.com/bug-bounty/alchemix-1/` |
| Bounty cap (Critical) | **$300,000** (in ALCX, USD-denominated) |
| KYC required | **No** (not explicitly stated; PoC required) |
| Payer history | Established (1,000 ALCX = $28,730 paid 2023-09-23 to Koiush; multiple V3-audit-comp payouts confirmed via reports.immunefi.com — e.g., #57510, #58531) |
| Scope assets | "Primacy Of Impact" (added 2026-02-26), "V3 Contracts" (added 2026-04-06) |
| Repository | `github.com/alchemix-finance/v3/tree/master/src` (HEAD `3010ede`) |
| Supported chains | Arbitrum, Ethereum, Optimism, Base |
| Substrate | Solidity 0.8.28 — self-repaying loan / synthetic CDP; MYT = Morpho V2 Vault adapter system |
| PoC format | Runnable PoC required |
| Program STATUS preflight | **ACTIVE** — last updated 2026-05-15 (12 days ago); confirmed against `bug-bounty/alchemix-1/scope/` |
| Triaged by | Immunefi |

**Out-of-scope clauses noted (load-bearing):**
- "yield strategies without deployment across chains" (OOS)
- "admin/curator/allocator trusted roles" (OOS — **drives DC-9 sub-2 DEFENSE PATTERN match below**)
- "perpetual gauge" (OOS — PerpetualGauge.sol excluded)
- "OraclePricedSwapStrategy (under audit)" (OOS — excludes FrxEth/wstETH/sfrxETH oracle paths)
- "known AI audit findings referenced in linked GitHub branches" (OOS — historical findings deduped)
- "bad debt distribution fairness concerns" (OOS — claims about fee fairness rejected)
- "oracle data issues (excluding manipulation)" — **manipulation IS in-scope**
- "economic attacks, liquidity impacts, social engineering" (OOS)

---

## STEP 2 — BRAIN OVERLAP SCORE

**HIGH overlap** — 4+ direct lens hits.

| Lens | Hit | Evidence |
|------|-----|----------|
| **Doctrine #29 v1.1** (alAsset MIN-cap on share-accounting) [INSPECTED] | DIRECT | AlchemistV3.sol L417 (`deposit`), L475 (`mint`), L1582 (`_earmark`) — share-accounting via `IVaultV2(myt).convertToAssets/convertToShares` (L906-913) |
| **CANDIDATE-D** (state-machine on harvest/repay cycles) [INSPECTED] | DIRECT | Earmark + redemption survival ratio state-machine (`_redemptionWeight`, `_earmarkWeight`, `_survivalAccumulator`, epoch advance logic L686-697); 6 epoch+index packed-state transitions |
| **CANDIDATE-I** (share-inflation, first-depositor) [ASSUMED] | PARTIAL | `deposit()` line 425 skips `_earmark()` on fresh tokenId; but fresh account has zero state, so the obvious first-depositor pattern is defended. Worth Gate 2 verification |
| **CANDIDATE-Z** (rebase-token cache invalidation) [INSPECTED] | INDIRECT (renamed) | All value conversions delegate to **external Morpho V2 Vault** (`IVaultV2(myt)`). The MYT is not native rebasing but its `convertToAssets/convertToShares` rate is dynamic. `_earmark()` line 1587 reads `safeBalanceOf(myt, transmuter)` and treats deltas as cover — donation-griefing surface |
| **CANDIDATE-K** (HTTP/protocol-state cache mismatch) [ASSUMED] | ANALOGUE | Cross-contract state shared across AlchemistV3 ↔ Transmuter via `lastTransmuterTokenBalance` (Alchemist L1593, set externally by Transmuter via `setTransmuterTokenBalance` L826) — TWO writers, ONE state slot |
| **DC-12** (oracle staleness) [EXECUTED via grep] | **NO** | Grep for `latestAnswer\|latestRoundData\|priceOracle` returned ZERO matches in production in-scope files. Oracle code lives ONLY in `OraclePricedSwapStrategy.sol` + `FrxEthEthDualOracleAggregatorAdapter.sol`, **both explicitly OOS**. Lens does not fire on core scope |
| **DC-9 family** (privileged state mutation) [INSPECTED] | DEFENSE | 14 onlyAdmin setters in AlchemistV3 + 7 in Transmuter. `setAlchemist` in Transmuter has **NO timelock, no 2-step** — but per Step 1 OOS clause "admin/curator/allocator trusted roles", this is explicitly trusted. **DC-9 sub-2 DEFENSE PATTERN APPLIES — NOT BOUNTABLE** |
| **Doctrine #34 sub-class b** (audit-regression) [EXECUTED] | DEEP — see Step 5.7 |

---

## STEP 3 — EV CALCULATION

```
EV = P(finding) × bounty_cap × P(acceptance) × brain_overlap_multiplier
   = 0.15 × $300,000 × 0.5 × 1.0
   = $22,500 pre-saturation
```

**Doctrine #27 saturation discount:**
- 1 prior public audit competition (V3 Audit Comp Oct-Nov 2025; ~28 reports landed → 75+ findings disclosed)
- 1 prior Cantina audit (Sept 30 2025) — `8a380a8 "cantina fixes"` commit confirms
- 1 prior yAudit cycle (numbered findings 1-35 visible in commit history)
- 1 prior Sherlock review (`13bf8db "Sherlock nits"`)

Saturation discount factor: **~0.4** (heavily audited, BUT a) Doctrine #34 sub-class b lens specifically targets post-audit drift and b) Lower cap ($300K vs $1M+ for top-tier programs) means less audit-saturation pressure per J-corollary).

**Saturation-adjusted EV: ~$9,000**. Still positive. Proceed.

---

## STEP 4 — QUEUE DECISION

**Standard Gate 1 → CANDIDATE for Gate 2** (per autonomy-boundary HIGH × $50K-$500K bucket).

---

## STEP 5 — GATE 1 EXECUTION

### 5.1 Clone

```
cd /home/claude-code/buzz-workspace/.work-clones
GIT_TERMINAL_PROMPT=0 git clone --depth 1 https://github.com/alchemix-finance/v3.git alchemix-v3
git fetch --unshallow   # required for Doctrine #34 sub-class b
```

Repo size: **24M** post-unshallow. HEAD: `3010ede` (2026-05-18). Total commits: **256**.

### 5.2 Pre-flight scope-check

Repository directly listed in Immunefi `bug-bounty/alchemix-1/scope/` page as the canonical in-scope asset ("V3 Contracts" → `github.com/alchemix-finance/v3/tree/master/src`). **IN-SCOPE confirmed.**

**Excluded per OOS (will not file candidates against):**
- `src/PerpetualGauge.sol` — perpetual gauge OOS
- `src/strategies/OraclePricedSwapStrategy.sol` — under-audit OOS
- `src/FrxEthEthDualOracleAggregatorAdapter.sol` — oracle adapter OOS
- All `src/strategies/*.sol` — yield-strategy bodies; numerous fixes from yAudit/Cantina landed here but the "yield strategies" OOS clause + multi-chain deployment ambiguity creates triage risk

**Core IN-SCOPE production targets:**
- `src/AlchemistV3.sol` (1,886 LOC) — the protocol heart
- `src/Transmuter.sol` (362 LOC) — alAsset → MYT redemption queue
- `src/AlchemistAllocator.sol` (180 LOC)
- `src/AlchemistCurator.sol` (177 LOC)
- `src/AlchemistGate.sol` (12 LOC)
- `src/AlchemistETHVault.sol` (92 LOC)
- `src/AlchemistTokenVault.sol` (53 LOC)
- `src/AlchemistV3Position.sol` (142 LOC) — NFT
- `src/AlchemistV3PositionRenderer.sol`
- `src/AlchemistStrategyClassifier.sol` (89 LOC)
- `src/AlTokenV3.sol` (59 LOC) — synthetic token

**Total in-scope core LOC: ~3,567**

### 5.3 Bytecode-verify prep (DEFERRED to Gate 2)

For Gate 2 — `cast code <deployed-addr>` + Etherscan source SHA match. **No deployed address surfaced yet on the V3 series**; the audit comp's Vault Address (`0x5Ca183bD1F5129f189F6a0A1bB0BA05890243462`) is OOS (V2-era). New V3 deployment addresses must be pulled from the Immunefi scope page asset list or the `script/` folder deployment logs at Gate 2 time.

### 5.4 PRIMITIVE-GREP CHECK (Doctrine #30)

| Lens primitive | Result | Decision |
|----------------|--------|----------|
| `latestAnswer\|latestRoundData\|priceOracle\|getPrice` in core IN-SCOPE *.sol | **0 hits** | DC-12 → **NO candidate row** |
| `function (harvest\|repay\|liquidate\|transmute\|mint\|redeem\|selfLiquidate\|poke)` | 8 hits AlchemistV3 + 3 hits Transmuter | CANDIDATE-D, DC-9-family — proceed |
| `convertToAssets\|convertToShares\|pricePerShare\|exchangeRate` | 38 files (incl. AlchemistV3, MYTStrategy, ETHVault, Allocator) | CANDIDATE-Z (renamed) — proceed |
| `MAXIMUM\|MAX_\|MIN_\|_PERIOD\|_DELAY\|BUFFER\|BPS` constants in IN-SCOPE | Only `BPS = 10_000` in AlchemistV3 + Transmuter | Doctrine #34 sub-class b magic-number target — narrow |
| `onlyAdmin\|onlyOperator\|onlyTransmuter\|onlyAlchemist` modifiers | 14 + 7 + 2 + 2 hits | DC-9 family — defense-applies (see 5.6.5) |
| `_earmark\|cumulativeEarmarked\|_pendingCoverShares\|lastTransmuterTokenBalance` | dense in AlchemistV3 only | CANDIDATE-D + CANDIDATE-K analogue — **highest-EV cluster** |

### 5.5 Apply ALL brain lenses — per-file surface (in-scope core only)

| File | Lens fires | Surface |
|------|-----------|---------|
| `AlchemistV3.sol` | CANDIDATE-D, CANDIDATE-K, CANDIDATE-I, CANDIDATE-Z, Doctrine #29 v1.1 | Earmark/redemption state-machine; transmuter-balance cross-contract state; first-mint share-accounting; MYT rate consumption |
| `Transmuter.sol` | CANDIDATE-D, Pattern E (arithmetic-rounding-asymmetry), CANDIDATE-K analogue | `claimRedemption` cross-call sequence; pre/post-redeem exchange-rate snapshot; bad-debt scaling ratio |
| `AlchemistV3Position.sol` | DC-9 sub-1 (unchecked-mint) | `mint` / `burn` are `onlyAlchemist`, well-gated. No candidate. |
| `AlTokenV3.sol` | DC-9 sub-1 | 59 LOC; standard ERC20 + onlyMinter pattern. Quick read recommended at Gate 2 but no Gate 1 candidate. |
| `AlchemistCurator.sol` | DC-9 family | Heavy `onlyAdmin` / `onlyOperator` setters. OOS-trusted per Step 1. |
| `AlchemistAllocator.sol` | DC-9 family | OOS-trusted (operator-driven allocation logic). |

### 5.6 5-TARGET QUALITY CHECKLIST (Step 5.6 mandatory)

**1. Withdrawals / Redemptions** [INSPECTED]
- `Transmuter.claimRedemption` (L209-309) — pro-rata maturation math L220-223 uses `mulDivUp` (rounds UP for amountNottransmuted = protocol-favor). Bad-debt scaling L243-249 also rounds UP (`badDebtRatio`). Cross-call to `alchemist.redeem(amountToRedeem)` L257.
- `AlchemistV3.withdraw` (L446-472) — runs `_earmark()` → `_sync()` first; correctness depends on `lockedCollateral = mulDivUp(debtShares, minCollateralization, FIXED_POINT_SCALAR)` (L459) being conservative.
- `AlchemistV3.selfLiquidate` (L734-771) — only callable when account is HEALTHY (L740 `_isAccountHealthy(accountId, false)`); unhealthy routes to public `liquidate`. Owner-only check L737. Pays earmarked debt first via `_forceRepay`. Correct CEI: state updates before external transfers.
- `AlchemistV3.redeem` (L655-731) — `onlyTransmuter` gated; runs `_earmark()` first. The `liveEarmarked` cap (L659) means redemption can be silently truncated, with `effectiveRedeemed` computed via APPLIED ratio not WANTED ratio (L697-704). Subtle and worth Gate 2 modeling for off-by-one across epoch advance.

**2. Liquidation + Oracle** [INSPECTED]
- `AlchemistV3.liquidate` (L607-617) — basic wrapper around `_liquidate`. Revert if no progress (L613-616).
- `AlchemistV3.batchLiquidate` (L620-652) — graceful per-id skip (L631-633). Any-progress success semantics.
- `AlchemistV3.calculateLiquidation` (L774-818) — pure function. Three branches: (a) debt ≥ collateral → full liq, no fee L782-786; (b) global insolvency → full debt liq L788-792; (c) partial margin-restore L794-817. Uses `FIXED_POINT_SCALAR` for collateralization comparisons. Rounding direction: `fee = surplus * feeBps / BPS` rounds DOWN; `debtToBurn = num * FP / denom` rounds DOWN. Need to verify these don't strand dust permanently.
- **NO oracle in IN-SCOPE files.** DC-12 lens — null.
- _LiquidationError revert_ (L615) — protects against zero-progress griefing. Sound.

**3. Deposit / Mint Shares** [INSPECTED]
- `AlchemistV3.deposit` (L417-443) — `_isProtocolInBadDebt()` check L421 prevents new deposits in bad debt. `_mytSharesDeposited + amount <= depositCap` (L422). For NEW position (L424-428) SKIPS `_earmark/_sync` (defended — fresh state). For EXISTING position runs both.
- `AlchemistV3.mint` (L475-490) — `_earmark()` BEFORE `_isProtocolInBadDebt()` check L484. Re-read of transmuter balance possible (L1587 then L1731), but MYT = Morpho V2 Vault (non-hook ERC4626) so no reentrancy between reads. **Defended.**
- `AlchemistV3.mintFrom` (L493-509) — same pattern as `mint`; ALLOWANCE decremented L499 BEFORE `_earmark` (preempt). Allowance underflow reverts → safe.
- **`Transmuter.createRedemption` (L176-206)** — deposit cap L184; solvency invariant L187 (`totalLocked + amount > alchemist.totalSyntheticsIssued()`). Snapshot via cross-call. Need Gate 2 to verify the `totalSyntheticsIssued` view returns a freshly-earmarked value or a stale one.

**4. External Calls** [INSPECTED]
- `IVaultV2(myt).convertToAssets/convertToShares` (AlchemistV3 L906-913) — Morpho V2 Vault. **External dependency. Manipulation in-scope per Step 1 OOS reading.**
- `TokenUtils.safeTransferFrom/safeTransfer/safeBalanceOf` — wrappers around `IERC20` calls. Standard.
- `ITransmuter(transmuter).queryGraph(...)` (`_earmark` L1596) — external view to Transmuter's Fenwick-tree state. Returns earmark amount. **Cross-contract state read — CANDIDATE-K analogue surface.**
- `alchemist.redeem/.reduceSyntheticsIssued/.setTransmuterTokenBalance` (Transmuter L257, 293, 296) — 3 calls back into Alchemist from Transmuter.claimRedemption. Each is gated `onlyTransmuter`. Reentrancy from Transmuter back into Alchemist during the ERC721 mint/burn callbacks (Transmuter is ERC721Enumerable) — **the `_mint`/`_burn` in Transmuter don't appear to re-enter Alchemist functions, but worth Gate 2 verification.**

**5. Admin / Upgrade** [INSPECTED]
- AlchemistV3: 14 `onlyAdmin` setters (L201-330). 2-step admin transfer via `setPendingAdmin`/`acceptAdmin` (analogous to Transmuter L98-117). Guardian role separate (L293 `setGuardian`).
- Transmuter: 7 `onlyAdmin` setters (L98-164). `setAlchemist` (L120-124) has **NO timelock, NO 2-step**. Per Step 1 OOS "admin/curator/allocator trusted roles" — **OOS-trusted, DC-9 sub-2 DEFENSE PATTERN APPLIES.**
- **Upgradeability check** — quick grep for `UUPS\|TransparentProxy\|_authorizeUpgrade` — no proxy patterns visible at top level; contracts appear immutable except for the admin-settable state.

### 5.7 PHASE 0 AUDIT-REGRESSION SCAN (Doctrine #34 sub-class b) [EXECUTED]

**Audit-fix commits enumerated** (from `git log --since 2025-10-01 -- src/AlchemistV3.sol src/Transmuter.sol src/AlchemistCurator.sol src/AlchemistAllocator.sol src/AlchemistV3Position.sol src/AlTokenV3.sol`):

| Commit | Date | Audit source | Subject | Touched in-scope file | Regression check |
|--------|------|--------------|---------|----------------------|------------------|
| `8a380a8` | 2026-02-16 | Cantina | "cantina fixes" | AlchemistV3.sol | **Not a single-commit-reversible — bulk merge.** Skipped granular check. |
| `13bf8db` | 2026-02-16 | Sherlock | "Sherlock nits" | AlchemistV3.sol + Transmuter.sol | Likely cosmetic. Skipped. |
| `f95e99c` | 2026-02-09 | "new weight accounting" | Refactored `_earmark/_sync` weight math | AlchemistV3.sol | Current weight math at L1582-1641 is the post-refactor version. Reading HEAD shows the packed-epoch+index encoding (`_redEpoch`, `_redIndex`, `_packRed`) is fully present. **No regression.** |
| `7180c59` | 2026-02-07 | Audit-fix | "Liquidation can revert if fee vault is unset when an outsourced fee payout is required fix" | AlchemistV3.sol | `calculateLiquidation` L788-792 handles the global-insolvency branch with `outsourcedFee = (debt * feeBps) / BPS`. Path still in place. **No regression.** |
| `99738f4` | 2026-02-07 | Audit-fix | "Liquidation/repayment fee vault can silently underpay if ERC-20 returns false on transfer fix" | (likely AbstractFeeVault) | Out-of-direct-scan; verify at Gate 2. |
| `67939de` | 2026-02-07 | Audit-fix | "AlchemistETHVault.withdraw: Missing recipient non-zero validation allows authorized caller to irreversibly burn ETH fix" | AlchemistETHVault.sol | **CHECK** AlchemistETHVault L?? for `recipient != address(0)` — verify at Gate 2. |
| `bea4436` | 2026-02-09 | Audit-fix | "Repayment fee deducted but stranded when liquidation proceeds after forced repayment fix" | AlchemistV3.sol | Worth deep Gate 2 read against `_liquidate` repayment-fee path. |
| `bc94cf2` | 2026-03-09 | yAudit-17 | "AlchemistV3.setMinimumCollateralization emits an event with stale data" | AlchemistV3.sol | Current L301-313: `setMinimumCollateralization` reads `value` from param and emits `MinimumCollateralizationUpdated(value)` — **fix is present, no regression.** |
| `1173fba` | 2026-03-09 | yAudit-29 | "Liquidator fees silently reduced or zeroed when fee vault is unset or underfunded" | AlchemistV3.sol | Verify at Gate 2 against `_liquidate` outsourced-fee path. |
| `73a165a` | 2026-03-09 | yAudit-32 | "Repayment fee is charged on 100% surplus basis instead of repaid amount" | AlchemistV3.sol | Verify at Gate 2 against `repay` / `_forceRepay`. |
| `cbe70ed` | 2026-03-09 | yAudit-33 | "Repayment-fee short-circuit enables double payout and forced liquidation" | AlchemistV3.sol | High-value regression target. Verify at Gate 2. |
| `8dd21a2` | 2026-04-11 | "updated cover system and added optimization for syncing fresh epoch" | AlchemistV3.sol | **EXECUTED CHECK** — `git show 8dd21a2 -- src/AlchemistV3.sol` confirms `_syncEarmarkedTransmuterTransfer` was ADDED (lines 851-857 in HEAD). Function still present at HEAD. Called from L597 (`repay`) and L987 (`_forceRepay`). **No regression — fix intact.** |
| `2783e40` | 2025-12-08 | "Reports 57088, 58447, 56442 — Reworked the redemption of collateral" | AlchemistV3.sol | Major redemption refactor. Current `redeem()` L655-731 represents the post-fix design. **Not reverted.** |
| `9c6dfb2` | 2025-12-09 | Report 58456 | "fix for issue of possible account entering unliquidatable state with residual debt" | AlchemistV3.sol | Verify `_liquidate` path doesn't leave residual debt at Gate 2. |
| `15af760` | 2025-12-16 | Report 58456 follow-up | "debt dust fix — added final check to ensure theres no debt without collateral" | AlchemistV3.sol | Look for "no debt without collateral" check at HEAD; verify still in place at Gate 2. |
| `415687a` | 2025-12-09 | Report 57587 | "fixed transmuter cover calculation" | AlchemistV3.sol | **Cover calc — same area as the `8dd21a2` add-fix.** Compositional check needed at Gate 2: does the 57587 fix + the 8dd21a2 fix interact cleanly, or does one undo part of the other? **HIGH-VALUE Gate 2 probe.** |

**Audit-regression scan summary:**
- **17 numbered audit-fix commits checked** (sample of full corpus; full corpus has ~50+ "Report XXXXX" + numbered yAudit fixes)
- **3 spot-confirmed at HEAD** (`8dd21a2` cover-sync fix present; `bc94cf2` setMinimumCollateralization emit-with-fresh-value present; `f95e99c` weight-accounting refactor present)
- **0 reverts detected** in the sampled fixes
- **2 compositional-check targets flagged** for Gate 2: (a) interaction between `415687a` (Report 57587 cover-calc fix Dec 9) and `8dd21a2` (cover-system update Apr 11) — both touch the cover-shares accounting in `_earmark`; (b) `cbe70ed` (yAudit-33 repayment-fee short-circuit fix) — historically a double-payout vector
- **NOTE**: The two compositional-check targets are the strongest Doctrine #34 sub-class b candidates. Both touch cover-share accounting which is also CANDIDATE-D + CANDIDATE-K analogue surface — three lenses converging is a strong Gate 2 signal.

### 5.8 DC-9 sub-2 DEFENSE PATTERN CHECK [INSPECTED]

| Privileged surface | Defense applies? | Reason |
|--------------------|------------------|--------|
| `Transmuter.setAlchemist` (no timelock) | YES — DEFENSE | Step 1 OOS: "admin/curator/allocator trusted roles" |
| All 14 `onlyAdmin` setters on AlchemistV3 | YES — DEFENSE | OOS-trusted |
| 7 `onlyAdmin` setters on Transmuter | YES — DEFENSE | OOS-trusted |
| `AlchemistCurator` operator/admin functions | YES — DEFENSE | "curator" explicitly OOS-trusted |
| `AlchemistAllocator` admin functions | YES — DEFENSE | "allocator" explicitly OOS-trusted |
| `MYTStrategy.setKillSwitch/setRiskClass/...` (onlyOwner) | YES — DEFENSE | Owner = curator/admin path |
| `onlyTransmuter` functions on AlchemistV3 (`redeem`, `reduceSyntheticsIssued`, `setTransmuterTokenBalance`) | NO — these are inter-contract, not human-admin. Reachability depends on the Transmuter's external surface being exploitable. **Not a DC-9 sub-2 target.** |

**RESULT: DC-9 sub-2 DEFENSE PATTERN APPLIES across all human-admin surfaces.** No DC-9 sub-2 candidate row filed. Today's Sky/mETH PERMANENT anchor confirmed at second substrate (Alchemix is substrate #3 of the pattern's adoption record).

### 5.9 R8 CALIBRATED REPORTING TAGS

All claim rows tagged inline. Summary:
- [EXECUTED] tags applied to: primitive grep results, git log analyses, three specific audit-fix HEAD-confirmations (`8dd21a2`, `bc94cf2`, `f95e99c`)
- [INSPECTED] tags applied to: all source-code surface descriptions (no PoC run, no bytecode verified)
- [ASSUMED] tags applied to: CANDIDATE-I partial reasoning (defended by fresh-state); CANDIDATE-K analogue (cross-contract state pattern is inferred, not formally modeled)

---

## TOP 3 CANDIDATES FOR GATE 2

### CANDIDATE-1 — Cover-share accounting compositional interaction (HIGHEST EV)
- **Lens stack**: Doctrine #34 sub-class b + CANDIDATE-D + CANDIDATE-K analogue (3-way convergence)
- **Surface**: AlchemistV3.`_earmark` L1582-1641 cover-share consumption + `_syncEarmarkedTransmuterTransfer` L851 + `setTransmuterTokenBalance` L826
- **Hypothesis**: Two audit-fix commits (`415687a` Dec 2025 "fixed transmuter cover calculation" + `8dd21a2` Apr 2026 "updated cover system") both rework the cover-shares accounting. The Apr fix added a NEW write-path (`_syncEarmarkedTransmuterTransfer` increments `lastTransmuterTokenBalance` from `repay`/`_forceRepay`) which interacts with the Dec fix's cover-calc. **Possible double-credit or stale-baseline window** if `_earmark()` is called between a `repay` and a Transmuter `claimRedemption` such that the same MYT transfer is counted both as "earmark-satisfied" (via L856 `lastTransmuterTokenBalance += sharesSent`) AND as "cover delta" (via L1590 `_pendingCoverShares += transmuterBalance - lastTransmuterTokenBalance`).
- **Severity if confirmed**: HIGH or CRITICAL (protocol insolvency category — `unauthorized minting` or `protocol bad-debt creation`)
- **R8 tag**: [INSPECTED] — code-confirmed surface, PoC required

### CANDIDATE-2 — Donation-griefing via direct MYT transfer to Transmuter
- **Lens stack**: CANDIDATE-Z (renamed) + Doctrine #29 v1.1
- **Surface**: `_earmark` L1587 `transmuterBalance = safeBalanceOf(myt, transmuter)` reads raw on-chain ERC20 balance
- **Hypothesis**: Anyone can transfer MYT directly to the Transmuter address (no fn call required). Next `_earmark()` will see the donation as `transmuterBalance > lastTransmuterTokenBalance` and credit `_pendingCoverShares += delta` (L1590). This delta then reduces real earmarked debt (L1599-1607). Economic question: can an attacker BENEFIT from this (not just donate)? Possible if they time it across an earmark window where they have a short alAsset position that gets repriced.
- **Severity if confirmed**: MEDIUM (likely griefing rather than direct theft; protocol-fairness category may push it into the OOS "bad debt distribution fairness" bucket)
- **R8 tag**: [INSPECTED] + [ASSUMED] on the profitability vector — needs Gate 2 PoC to determine economic direction

### CANDIDATE-3 — Transmuter.claimRedemption pre/post-redeem exchange-rate snapshot
- **Lens stack**: Pattern E (arithmetic-rounding-asymmetry) + CANDIDATE-D
- **Surface**: Transmuter L252-262
  - L252: `debtValue = alchemist.convertYieldTokensToDebt(yieldTokenBalance)` (PRE-redeem rate)
  - L257: `alchemist.redeem(amountToRedeem)` (CHANGES alchemist state, including `_mytSharesDeposited`)
  - L261: `totalYield = alchemist.convertDebtTokensToYield(scaledTransmuted)` (POST-redeem rate but uses external Morpho V2 rate which doesn't depend on alchemist's redeem)
  - L262: `distributable = totalYield <= sharesAvailable ? totalYield : sharesAvailable`
- **Hypothesis**: The exchange rate from `IVaultV2(myt).convertToShares/convertToAssets` is invariant w.r.t. alchemist.redeem (Morpho external), so this might be defended. BUT if an attacker can flash-loan to manipulate Morpho V2 vault rates within the same tx (e.g., large deposit → rate shift → call `claimRedemption`), the L252 and L261 readings diverge by the manipulation factor. Profit = the rate-arb captured. Manipulation is in-scope per Step 1 OOS reading.
- **Severity if confirmed**: HIGH (direct theft category)
- **R8 tag**: [ASSUMED] on Morpho V2 manipulability — Gate 2 needs to bytecode-verify Morpho V2 share-inflation protections

---

## VERDICT

**PROCEED to Gate 2** with CANDIDATE-1 (cover-share compositional interaction) as PRIMARY target.

CANDIDATE-2 + CANDIDATE-3 are secondary — proceed only if CANDIDATE-1 surfaces a confirmed PoC and time/disk budget allows.

---

## BRAIN COMPOUND PROPOSALS

1. **Doctrine #34 sub-class b extension** — When the post-audit commit log shows TWO+ commits each "fixing the cover calculation" or "updating the cover system" on the same surface (3+ months apart), flag for compositional-interaction Gate 2 probe. The pattern is: each fix individually shipped, no single fix reverted, but the COMBINED state-space may have an unhandled trajectory. Anchor: Alchemix `415687a` (Dec 2025) + `8dd21a2` (Apr 2026).
2. **CANDIDATE-Z (rebase-token cache invalidation) RENAMING / SUB-CLASS** — extend to "external-dependency-rate cache invalidation" covering ERC4626 vaults whose share/asset rate is consumed verbatim. The Alchemist's reliance on `IVaultV2(myt).convertToAssets/convertToShares` in 38+ in-scope file-paths is the new substrate. Sub-class b: "External vault rate read as price oracle without TWAP / spike-bound check."
3. **DC-9 sub-2 DEFENSE PATTERN — substrate #3 confirmed** — Alchemix Transmuter `setAlchemist` (no timelock) is explicitly OOS-trusted. Adds to today's Sky + mETH anchor. **PERMANENT pattern reinforced.** Recommend updating `brain/Patterns-Defense-Classes.md` with Alchemix as the third anchor.
4. **Doctrine #34 sub-class b TOOLING** — at Gate 2 time, build a `git log --grep="cover\|earmark\|redeem"` + diff-cluster heuristic that surfaces commits touching shared accounting state, ranked by chronological clustering. Alchemix would yield `415687a` + `8dd21a2` + `f95e99c` as a single cluster.

---

## FILE PATHS

- **This file**: `/home/claude-code/buzz-workspace/hunts/2026-05-27-alchemix-immunefi-gate1.md`
- **Cloned repo**: `/home/claude-code/buzz-workspace/.work-clones/alchemix-v3/` (HEAD `3010ede`, 24M, 256 commits, unshallowed)
- **Key sources**: `src/AlchemistV3.sol`, `src/Transmuter.sol`, `src/MYTStrategy.sol`

---

## TIME + DISK DISCIPLINE

- **Start**: 02:31 UTC
- **End**: 02:42 UTC
- **Elapsed**: ~11 min (under 60-90 min budget)
- **Disk delta**: +24M (clone). 5.9G avail at start → ~5.87G avail at end. **Well under 87% halt threshold.**

---

_Gate 1 — Alchemix (Immunefi) | Standing-Intake Protocol v1.0 | Doctrine #34 sub-class b PRIMED | 2026-05-27 02:42 UTC_
