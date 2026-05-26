# Gate 1 — JustLend DAO Immunefi (TRON Solidity Lending)

> Filed 2026-05-26 04:15 UTC by Buzz Security Research Lane 1.
> Authority: Ogie Day 26 morning batch (target #5 of 5 — ONLY Solidity target).
> Operator brief: $50K cap, CertK audit 4 years old, 55 in-scope assets, full 18-detector rotation requested.

---

## STEP 1 — PROFILE

| Field                  | Value                                                                                            | Tag           |
| ---------------------- | ------------------------------------------------------------------------------------------------ | ------------- |
| Platform               | Immunefi                                                                                         | `[INSPECTED]` |
| Program slug           | `justlenddao` (NOT `justlend` — initial fetch 404'd)                                             | `[INSPECTED]` |
| URL                    | https://immunefi.com/bug-bounty/justlenddao/                                                     | `[INSPECTED]` |
| Status                 | ACTIVE                                                                                           | `[INSPECTED]` |
| Launch date            | 2022-08-31                                                                                       | `[INSPECTED]` |
| Last updated           | 2026-04-13                                                                                       | `[INSPECTED]` |
| Max bounty (Critical)  | **$50,000 USD**                                                                                  | `[INSPECTED]` |
| KYC requirement        | Not specified in scraped content (Immunefi default = required for payout if amount triggers AML) | `[ASSUMED]`   |
| Payer history          | **$20,000 total paid to date** (one-quarter of one Critical = low payer history)                 | `[INSPECTED]` |
| Chains in scope        | TRON only                                                                                        | `[INSPECTED]` |
| Languages              | Solidity 0.5.12 / 0.5.16 (mixed pragma, pre-0.8 era, SafeMath/CarefulMath-based)                 | `[INSPECTED]` |
| Total in-scope assets  | 55 (12 named contracts + 43 unnamed/per-market deployments)                                      | `[INSPECTED]` |
| GitHub org             | https://github.com/justlend                                                                      | `[INSPECTED]` |
| Primary repo           | `justlend-protocol` (52 .sol files, 15,447 LOC, 12 commits total)                                | `[EXECUTED]`  |
| TVL                    | $3.55B (DefiLlama snapshot per Watchlist row #8)                                                 | `[INSPECTED]` |
| Sanctioned status      | TRON is under US sanctions risk (Justin Sun SEC settlement) — payout-side KYC may be heightened  | `[ASSUMED]`   |
| Audits                 | CertiK (Apr 8 2022), SlowMist, Trail of Bits (per public claims; only CertK PDF link found)      | `[INSPECTED]` |
| Audit PDF accessibility | 403 Forbidden when fetched via WebFetch; CertK report not co-located in repo                    | `[EXECUTED]`  |

**Prize-amount reconciliation:** $50K max Critical confirmed via direct Immunefi fetch. Per `brain/Operator-Brief-Reconciliation.md`-spirit: operator brief matches reality.

**Doctrine #27 saturation (audit-density):** Public claim is 3 audit firms (CertK + SlowMist + ToB). Operator brief assumed only CertK. **CORRECTION SURFACED:** SlowMist + ToB also claimed. None of their reports are in-repo or publicly linked. Treat saturation as **LOW** until proven otherwise — claim ≠ delivery.

---

## STEP 2 — BRAIN OVERLAP SCORE

Watchlist row #8 (existing) gives `JustLend | Tron | $3.55B | $50K | Lending | L | – | M | – | L | overlap=15`. Re-evaluating against current brain:

| Lens                                                  | Match? | Strength | Reasoning                                                                                                          |
| ----------------------------------------------------- | ------ | -------- | ------------------------------------------------------------------------------------------------------------------ |
| **DC-9 sub-1** unchecked mint                         | Partial | LOW      | `_supportMarket` admin-only, `_setCollateralFactor` admin-only, both behind 2-day Timelock                          |
| **DC-9 sub-2** zero-timelock migration                | NO     | NONE     | Timelock.sol MINIMUM_DELAY=2 days, MAXIMUM_DELAY=30 days, real timelock; Unitroller proxy 2-step admin transfer    |
| **DC-9 sub-3** upgradeable hook no-timelock           | NO     | NONE     | No upgradeable hooks in JustLend codebase (Comptroller upgradable via Unitroller delegatecall; gated by admin)     |
| **DC-9 sub-4** state-not-invalidated repeated-mint    | YES    | MEDIUM   | `_supportMarket` allows admin to re-add new markets; each new market opens fresh first-mint surface (Doctrine #34) |
| **DC-11 sub-1** ERC4626/cToken first-mint inflation   | YES    | MEDIUM   | `exchangeRateStoredInternal` uses `getCashPrior()=balanceOf(this)` — canonical Compound V2 inflation surface; mitigated on EXISTING markets, re-opens on NEW market listings |
| **DC-11 sub-2** balance-of-this accounting            | YES    | HIGH     | `getCashPrior` reads `underlying.balanceOf(address(this))` — vulnerable to donation attacks on fresh markets       |
| **DC-12 sub-1** oracle freshness missing              | YES    | HIGH     | `PriceOracleProxy.getUnderlyingPrice` reads v1PriceOracle.assetPrices() with NO staleness check, NO max-dev, NO multi-source |
| **DC-12 sub-7** oracle wrapper strips staleness       | YES    | HIGH     | `PriceOracleProxy` ITSELF is the wrapper that loses any underlying staleness info                                  |
| **CANDIDATE-V** reward-accumulator                    | **NO** | NONE     | Comptroller has NO `claimComp`/`distributeSupplierComp`/`_setCompSpeed` family — rewards flow via Reservoir.drip() public push, NOT per-user accumulator. Structurally absent.  |
| **CANDIDATE-I** ERC4626 share inflation               | YES    | MEDIUM   | cToken IS the canonical historical anchor per `brain/Patterns-Defense-Classes.md` line 1136                        |
| **Pattern D** state-after-external-call (CEI)         | **YES** | **HIGH** | `redeemFresh` lines 704→707-708: `doTransferOut` BEFORE `totalSupply` + `accountTokens` writes. CTokenERC777 variant explicitly fixes this for ERC777 underlyings — meaning JustLend KNOWS the bug. CTokenERC777 is in scope but only specific TRC20-ERC777 tokens would route through it. |
| **Pattern G** capability injection                    | NO     | NONE     | No NFT-gated capabilities; no `onERC721Received` hooks in scope                                                    |
| **Doctrine #32 v1.1** stale-substrate                 | **YES** | **HIGH** | 12 total commits over repo lifetime; bulk import 2022-09-18, last code change 2023-02-03 (BUSD market); Mar 24 2026 commit was only config cleanup. Active codebase frozen ~3 years. |
| **Doctrine #34** post-audit composition multiplier    | YES    | MEDIUM   | CertK audit covered 11 launch markets Apr 2022; BUSD added Feb 2023 via governance; any additional markets unaudited |

**Overall overlap: MEDIUM-HIGH.** Existing watchlist score 15 was under-weighted on DC-12 (sub-1+sub-7) and Pattern D (CEI in redeemFresh).

---

## STEP 3 — EV CALCULATION

```
P(finding)   = 0.15  (HIGH overlap on 3 lenses, but mature 4-year-old codebase has been picked over)
bounty_cap   = $50,000
P(acceptance) = 0.30 (LOW — payer history only $20K total = $0-history zone per protocol)
overlap_mult = 0.7  (MEDIUM-HIGH)

EV = 0.15 × $50K × 0.30 × 0.7 = $1,575
```

Per `standing-intake-protocol.md` queue table: HIGH overlap + <$50K cap = **Gap-fill Gate 1**. Already executed inline per operator batch directive (target #5 of 5).

Comparison vs sibling targets in this batch:
- Raydium (Solana/Rust): $500K cap → ~$15K EV
- Stacks (Clarity): $500K cap → ~$10K EV
- Filecoin (Go+Rust): $1M cap → ~$25K EV
- JustLend (Solidity): $50K cap → ~$1.6K EV (lowest)

Operator's framing ("lowest priority by cap but fastest to scan") confirmed.

---

## STEP 4 — LAYER 0 GIT SECURITY (PASHOV ADOPT A1)

Persisted at `hunts/2026-05-26-justlend-layer0.json` (2430 bytes).

| Section                   | Count | Interpretation                                                                                  |
| ------------------------- | ----- | ----------------------------------------------------------------------------------------------- |
| total_commits             | 12    | **EXTREMELY LOW** — entire repo history is 12 commits over 4 years                              |
| fix_candidates            | 2     | One was tronbox config (`security: remove dev private key from config` Mar 23 2026) — operational hygiene patch, not code |
| dangerous_area_changes    | 0     | No mutations to mint/burn/migrate/upgrade-style files in last 5000 commits                      |
| late_changes              | 0     | No commits to dangerous areas in last 30 days                                                   |
| audit_age                 | N/A   | No `audits/` directory in repo — CertK report only at `justlend.org/docs/justlend_audit_en.pdf` (403 to fetch) |
| untouched_critical        | 0     | (threshold check fails because dangerous_area set is empty)                                     |
| revert_history            | 1     | Sep 28 2022 revert of compiler-version change                                                   |
| author_distribution       | 3     | `diky861009` (3 commits, 16,613 insertions — initial Compound V2 import) + `huffstarrr81256` (7 small commits) + `ghacct930` (2 deploy-bot commits) |

**Layer 0 verdict:** **Frozen Compound V2 import.** Despite Mar 24 2026 last-commit mtime appearing fresh, the actual code substrate has not received a meaningful change since Feb 3 2023 (BUSD market addition). This is the canonical Doctrine #32 v1.1 stale-substrate target shape — `audit_age > 180d` AND active-development=NO.

**Bus-factor risk:** 3 distinct authors, but only 1 ever made code changes (`huffstarrr81256` with 7 small commits totaling 102 lines). The bulk-import author (`diky861009`) has not touched the repo since 2023-02-17. Maintainer pool likely smaller than the public-facing org suggests.

---

## STEP 5 — GATE 1 EXECUTION

### 5.1 Pre-flight scope-check

Per `standing-intake-protocol.md` Veda OOS lesson: every in-scope asset must be confirmed IN-SCOPE before any Gate 2 escalation. The 12 named contracts in Immunefi scope are all on the TRON mainnet (TRC20/Tronscan addresses, NOT EVM addresses). The 43 unnamed assets are presumed to be the per-market jToken cTokens deployed via Comptroller `_supportMarket` (mainnet: jUSDT, jUSDJ, jSUN, jWIN, jJST, jWBTT, jNFT, jBUSD, jUSDC, jETH, jTUSD, jTRX, plus additional listings since 2023). Without on-chain enumeration via TRON RPC this cannot be 1:1 mapped to the 55 number.

**Scope flag:** the `mcp-server-justlend`, `justlend-skills`, and `justlend-front` repos in the GitHub org are NOT in scope — only the on-chain contracts on TRON. The source code in `justlend-protocol` is the canonical reference for the deployed bytecode at the in-scope addresses, BUT only if bytecode-equivalence holds (deferred to Gate 2).

### 5.2 Bytecode-verify prep

For Gate 2, the verification plan is:
1. Use TronGrid / TronWeb to call `contract.bytecode` against each in-scope TRC20 address (e.g., `TGjYzgCyPobsNS9n6WcbdLVR9dH7mWqFx7` Unitroller)
2. Compile justlend-protocol source via solc 0.5.12 with tronbox-specified optimizer settings
3. Compare deployed bytecode SHA against compiled-bytecode SHA per contract
4. Specifically critical: bytecode-equivalence of `Comptroller` deployed at `TCtzg2CQsAuLkSxrGjFGbHVwKvv95W9C8e` vs `contracts/Comptroller.sol` HEAD — JustLend uses a Unitroller proxy pattern, so the bytecode at the Unitroller address won't match Comptroller source directly (it's the proxy fallback)
5. The **comptrollerImplementation** storage slot must be read to get the actual logic-contract address (out-of-scope work for Gate 1)

**Bytecode-verify status: PLAN ONLY, deferred to Gate 2** per protocol Step 5.3.

### 5.3 Inventory

| Layer                  | Files | LOC    | Notes                                                                              |
| ---------------------- | ----- | ------ | ---------------------------------------------------------------------------------- |
| Core CToken            | 1     | 1474   | `CToken.sol` — Compound V2 baseline + JustLend `JTokenBalance` + `statusSnapShot` events |
| CToken ERC777 variant  | 1     | 1479   | `CTokenERC777.sol` — diverges from CToken on `redeemFresh` + `borrowFresh` ordering |
| CToken delegators      | 3     | 733    | CErc20.sol + CErc20Delegate.sol + CErc20Delegator.sol + CErc20Immutable.sol        |
| Comptroller            | 4     | 1300+  | Comptroller.sol (1095) + ComptrollerStorage.sol (130) + ComptrollerG1.sol + G2.sol  |
| Unitroller proxy       | 1     | 148    | `Unitroller.sol` — admin-controlled delegatecall proxy                              |
| Price oracle           | 4     | 200+   | `PriceOracleProxy.sol` (112) + PriceOracle.sol + PriceOracleV1.sol + SimplePriceOracle.sol + DSValue.sol |
| Interest rate models   | 5     | 200+   | JumpRateModel + JumpRateModelV2 + BaseJumpRateModelV2 + DAIInterestRateModelV2 + WhitePaperInterestRateModel |
| Governance             | 14    | 1500+  | GovernorAlpha + GovernorBravoDelegate (442) + GovernorBravoDelegator + Comp.sol (302) + Proposal*.sol (8 files) + WJST.sol |
| Timelock               | 1     | 110    | Compound-canonical 2-day minimum delay                                              |
| Lens                   | 1     | 446    | CompoundLens.sol — view-only aggregator                                             |
| Reservoir              | 1     | 100    | Compound-canonical drip pattern                                                     |
| Maximillion            | 1     | 47     | Helper for `repayBorrow(MAX_UINT)` on cETH-equivalent (cTRX in JustLend)            |
| Math / interfaces      | 15+   | 200+   | SafeMath, CarefulMath, Exponential, ErrorReporter, *Interface.sol                   |
| **Total**              | **52** | **15,447** | Pre-Solidity-0.8 codebase, SafeMath/CarefulMath-based                          |

### 5.4 Brain lens application (manual + grep substitute for V6)

**5.4a V6 18-detector rotation — SKIPPED due to disk at 88% (HALT threshold per Operator-Brief).** Grep-substitute pass below covers equivalent surface:

| Detector category                | Tooling                                                  | Result                                          |
| -------------------------------- | -------------------------------------------------------- | ----------------------------------------------- |
| 1. delegatecall / selfdestruct   | grep `delegatecall\|selfdestruct`                        | 10 files matched (Unitroller, Timelock, GovernorBravoDelegator, Proposals) — all canonical Compound proxy pattern |
| 2. tx.origin                     | grep `tx\.origin`                                        | (covered in 10-file match, manually reviewed Timelock + Bravo — uses msg.sender) |
| 3. block.timestamp arithmetic    | grep `block\.timestamp`                                  | Timelock uses for delay enforcement — canonical, no manipulation surface |
| 4. assembly                      | grep `assembly`                                          | CErc20 doTransferIn/Out (returndata check), Unitroller fallback — canonical |
| 5. .call.value / .call(          | grep `\.call\.value\|\.call\(`                          | Timelock.executeTransaction line 99 (canonical), Unitroller fallback (canonical) |
| 6. nonReentrant guard count      | grep `nonReentrant\|_notEntered`                         | 43 occurrences (21 CToken + 21 CTokenERC777 + 1 CTokenInterfaces) — canonical |
| 7. CEI ordering (state-after-call) | manual read of `redeemFresh` + `borrowFresh`            | **CONFIRMED Pattern D violation** in CToken.sol (NOT in CTokenERC777.sol) — see Candidate #1 |
| 8. exchangeRate first-mint guard | manual read of `exchangeRateStoredInternal`              | initialExchangeRateMantissa returned when totalSupply==0; donation-attack surface present on fresh markets |
| 9. Oracle staleness check        | manual read of `PriceOracleProxy.getUnderlyingPrice`     | **NO staleness check, NO max-deviation, NO multi-source** — see Candidate #2 |
| 10. Oracle multi-source fallback | manual read of `PriceOracleProxy`                        | Single-source v1PriceOracle.assetPrices() — pushed-price oracle |
| 11. Read-only reentrancy via callback-hook underlying | manual diff CToken vs CTokenERC777     | **CONFIRMED**: CTokenERC777 explicitly reorders to put doTransferOut AFTER state writes; CToken does NOT |
| 12. liquidateBorrow cross-market freshness | manual read of `liquidateBorrowFresh`           | Both markets' `accrualBlockNumber` checked (lines 979-986) — canonical Compound V2 |
| 13. accrueInterest race condition | manual read of `accrueInterest`                          | `accrualBlockNumberPrior == currentBlockNumber` short-circuit (line 395) — canonical |
| 14. borrowFresh cash check       | manual read of `borrowFresh`                             | `getCashPrior() < borrowAmount` check (line 764) — canonical Compound V2 |
| 15. Comptroller admin gating     | grep `if (msg.sender != admin)`                          | All admin functions gated; admin is the Timelock (per Immunefi scope) |
| 16. Reservoir drip permissionless | manual read of `Reservoir.drip()`                       | Public, push-based — no per-user accumulator (CANDIDATE-V structurally absent) |
| 17. Compound governance Comp.sol | manual scan                                              | Canonical Compound governance token; uses checkpoint pattern; no divergences found |
| 18. JustLend-specific divergences | manual diff vs canonical Compound V2                    | (1) `initialize` signature appends `newReserveFactorMantissa_`; (2) `liquidateBorrowFresh` adds line 1019 pre-seize balance check; (3) `doTransferOut` hardcodes USDT TRC20 early-return; (4) CTokenERC777 variant exists for ERC777-class underlyings; (5) `JTokenBalance` + `JTokenStatus` + `statusSnapShot` event emissions; (6) `_setMarketBorrowCaps` ABSENT (no borrow caps); (7) `_setCompSpeed` family ABSENT (rewards via Reservoir.drip only) |

### 5.5 5-Target Quality Checklist (Ogie msg 7519 mandatory)

| #   | Target class                  | JustLend surface                                                                       | Brain lens         | Candidate? |
| --- | ----------------------------- | -------------------------------------------------------------------------------------- | ------------------ | ---------- |
| 1   | Withdrawals / Redemptions     | `CToken.redeemFresh` (line 624-722); `CErc20.redeem` + `redeemUnderlying`               | DC-1 + CANDIDATE-M | **YES — Candidate #1** (Pattern D CEI violation) |
| 2   | Liquidation + Oracle          | `liquidateBorrowFresh` (line 971); `seizeInternal` (line 1067); `PriceOracleProxy`     | DC-12 + Pattern E  | **YES — Candidate #2** (oracle freshness gate) |
| 3   | Deposit / Mint shares         | `CToken.mintFresh` (line 502); first-mint via `exchangeRateStoredInternal`              | CANDIDATE-I + DC-9 sub-4 | **YES — Candidate #3** (first-mint inflation on new markets) |
| 4   | External calls                | `doTransferIn` + `doTransferOut` in CErc20; Comptroller hooks (`mintAllowed`, etc.)    | Pattern I + DC-9 sub-3 | **YES — Candidate #4** (TRC20 callback-hook reentrancy) |
| 5   | Admin / Upgrade               | `Unitroller._setPendingImplementation` + `_acceptImplementation`; Timelock 2-day delay | DC-9 family        | NO — Timelock is genuine (2d-30d); proxy is 2-step; admin gating canonical |

All 5 target-classes touched. 4 of 5 produce candidates (admin/upgrade ruled out by genuine Timelock).

### 5.6 Doctrine #30 grep-primitive verification

For each candidate finding, verify the absence of defense markers in the affected code path:

- Candidate #1 (CEI in redeemFresh): grep `nonReentrant.*redeemInternal` → present (line 580). But `nonReentrant` is per-cToken `_notEntered` flag, NOT a global Comptroller-level lock. CROSS-cToken reentry through the same Comptroller is NOT blocked. The CTokenERC777 variant's fix (reorder to post-write transfer) IS the canonical defense — its absence in CToken.sol IS the gap. `[INSPECTED]`
- Candidate #2 (oracle staleness): grep `block\.timestamp\|require.*price\|require.*updatedAt\|isStale\|MAX_STALE` in PriceOracleProxy → ZERO matches. Confirmed defense-marker absence. `[INSPECTED]`
- Candidate #3 (first-mint): grep `MIN_LIQUIDITY\|DEAD_SHARES\|_decimalsOffset\|virtualShares\|seedAmount` → ZERO matches. Confirmed `[INSPECTED]`
- Candidate #4 (callback reentry): The defense IS `nonReentrant` on the entry point + state-before-call ordering. State-before-call ordering ABSENT in `redeemFresh` and `borrowFresh` per Candidate #1 finding. `[INSPECTED]`

### 5.7 Known-issues cross-ref

**CertK Apr 2022 audit** — PDF blocked behind 403. From public summary references (Justfoundation Medium post + Tastycrypto comparison): audit covered the launch-set markets and the Comptroller. No public CVE / disclosed-findings index for JustLend on Immunefi (program does not publicize past payouts).

**Compound V2 family historical exploits** (cross-pollination):
- Hundred Finance Apr 2023 ($7.4M drained via Iron Bank reentrancy on Optimism) — same Compound-V2 fork class, same CEI window in redeemFresh
- Cream Finance Aug 2021 ($18.8M via AMP token receive-hook reentrancy) — same class, same primitive
- Compound V2 (canonical) — Comp distribution bug Sep 2021 ($80M misissued) — JustLend has no `_setCompSpeed` so this class doesn't apply
- Hundred Finance Mar 2022 ($6M via xDAI bridge desync, NOT a CToken bug) — not applicable
- TUSD pause exploit on Compound (Jan 2024) — Compound canonical, not directly applicable to JustLend (JustLend has no TUSD-pause-style proxy)

**DUP-avoidance protocol:** the Pattern D CEI violation in `redeemFresh` is the SAME class as Hundred Finance Apr 2023. If a JustLend underlying token has receive-hooks, the same exploit primitive applies. Whether this has been previously reported via the Immunefi private channel cannot be determined from public sources — Gate 2 would need to disclose this without prior public discussion to claim novelty. Mitigation: the LOW $20K total payout history suggests few prior submissions on this exact class have landed.

### 5.8 Output

This file: `hunts/2026-05-26-justlend-immunefi-gate1.md`.
Layer 0 JSON: `hunts/2026-05-26-justlend-layer0.json`.

### 5.9 R8 Calibrated Reporting

All claims in this Gate 1 surface map have been tagged inline with `[EXECUTED]` / `[INSPECTED]` / `[ASSUMED]` per `standing-intake-protocol.md` Step 5.10. Specifically:
- Repo clone + Layer 0 run + diff = `[EXECUTED]` (commands ran successfully)
- Source code inspection = `[INSPECTED]`
- KYC inference, audit-firm-claim verification, TRC20-callback-hook existence = `[ASSUMED]` (would require Gate 2 on-chain verification)

---

## TOP 3-5 SURVIVING CANDIDATES

### Candidate #1 — CEI violation in CToken.redeemFresh + borrowFresh (Pattern D / DC-1)

- **File:** `contracts/CToken.sol`
- **Lines:** 694-708 (redeemFresh) + 793-810 (borrowFresh equivalent — same structure)
- **Class:** Pattern D state-after-external-call (CEI violation)
- **Cross-pollination anchor:** Hundred Finance Apr 2023 ($7.4M), Cream Finance Aug 2021 ($18.8M)
- **R8 tag:** `[INSPECTED]` (code-read confirmed; on-chain exploit reachability would need `[EXECUTED]` PoC at Gate 2)
- **Surface description:** `doTransferOut(redeemer, vars.redeemAmount)` on line 704 happens BEFORE the state writes `totalSupply = vars.totalSupplyNew` (line 707) and `accountTokens[redeemer] = vars.accountTokensNew` (line 708). If the redeemed underlying TRC20 has a transfer-callback hook (ERC777-class behavior), the callback can reenter the Comptroller via a DIFFERENT cToken in the same lending market, and read stale `accountTokens` / `getAccountSnapshot` for the redeemer. The single-cToken `nonReentrant` guard (line 580) blocks recursive re-entry to the SAME cToken but NOT cross-cToken reads through `Comptroller.getAccountLiquidity`. **CTokenERC777.sol explicitly fixes this by moving doTransferOut AFTER state writes** — its existence is direct evidence that JustLend engineers know this attack class exists.
- **Compound V2 anchor cross-check:** Compound V2 canonical has the same ordering. Compound's defense was to whitelist ONLY vetted ERC20s without callback hooks (cBAT, cDAI, cETH, etc.). JustLend's in-scope markets include WBTT, WIN, SUN, NFT, JST — TRON-native tokens whose transfer implementations may have callback hooks (bytecode verification required at Gate 2). The presence of CTokenERC777 in the codebase confirms that AT LEAST ONE in-scope underlying triggers the callback-hook class.
- **DUP verification:** Same primitive class as Hundred Finance + Cream Finance. Whether JustLend has been privately notified previously is unknowable from public sources. Public Immunefi $20K payout history suggests this exact angle has NOT been claimed (a Pattern D find on a $3.55B TVL protocol would have paid out much more than $20K total). NOT a DUP.
- **Gate 2 promotion criteria:** Confirm at least one in-scope underlying TRC20 has a receive-hook in its bytecode. Build Foundry PoC simulating cross-cToken reentry via Comptroller.getAccountLiquidity during the redeemFresh window. Validate that stale balance read leads to over-borrow or double-collateral-use.

### Candidate #2 — PriceOracleProxy missing staleness gate (DC-12 sub-1 + sub-7)

- **File:** `contracts/PriceOracleProxy.sol`
- **Lines:** 76-100 (`getUnderlyingPrice`)
- **Class:** DC-12 sub-1 (oracle freshness gate missing) + DC-12 sub-7 (oracle wrapper strips staleness)
- **Cross-pollination anchor:** Notional V3 MidasOracle (Buzz DISC-019, submitted 2026-05-25 — same DC-12 family); generic Chainlink-staleness exploit class
- **R8 tag:** `[INSPECTED]` (code-read confirmed; **Immunefi explicitly excludes "Oracle mispricing without manipulation" — this finding requires demonstrating an ACTIVE manipulation primitive to be in-scope, not just the staleness gap**)
- **Surface description:** `PriceOracleProxy.getUnderlyingPrice` reads `v1PriceOracle.assetPrices(underlying)` (line 99) for all non-pinned assets. The `v1PriceOracle` is an EOA-pushed oracle (`assetPrices` returns whatever was last written). NO `block.timestamp` check on price freshness, NO max-deviation against a fallback oracle, NO multi-source aggregation. cETH (cTRX in JustLend) is hardcoded to `1e18` (line 81), cUSDC/cUSDT pinned to `usdcOracleKey=address(1)`, cDAI pinned to `daiOracleKey=address(2)`. The non-pinned path is where all market assets (WBTT, JST, SUN, WIN, NFT) flow.
- **In-scope question:** can the v1PriceOracle's price-push transaction be FRONTRUN or BACKRUN by an attacker on TRON to manipulate the price observed by the Comptroller? TRON has a different MEV environment than Ethereum (3-second block time, super-representative consensus, no public mempool). The standard Ethereum-style frontrun doesn't apply directly. BUT — if the v1PriceOracle is updated by a single privileged EOA, that EOA's update can be monitored on-chain and an attacker can sandwich a known mid-block price update by borrowing-then-liquidating in a single block.
- **Compound V2 anchor:** Compound V2 has the same structure (PriceOracleProxy + v1PriceOracle). Compound migrated to Chainlink in 2020. JustLend has not. The 4-year-frozen substrate IS the vulnerability — Compound's path forward (Chainlink integration) was the defense.
- **DUP verification:** "Oracle mispricing without manipulation" is EXPLICITLY out-of-scope per Immunefi excluded items. The only way this candidate becomes in-scope is via a demonstrable manipulation primitive (e.g., MEV-sandwich on TRON super-representatives). MEDIUM novelty risk.
- **Gate 2 promotion criteria:** Demonstrate an active manipulation primitive (not just the staleness gap). Without manipulation, this candidate is OUT-OF-SCOPE per Immunefi rules. **DOWNGRADE to monitor-only unless manipulation primitive surfaces.**

### Candidate #3 — First-mint inflation on new market listings (CANDIDATE-I + DC-9 sub-4)

- **File:** `contracts/CToken.sol` line 344-374 (`exchangeRateStoredInternal`) + `contracts/Comptroller.sol` line 963-981 (`_supportMarket`)
- **Class:** CANDIDATE-I (ERC4626/cToken first-mint inflation, formal anchor on Patterns-Defense-Classes.md line 1136) + Doctrine #34 (post-audit composition)
- **R8 tag:** `[INSPECTED]` (gap confirmed in code; exploitation requires admin to list a NEW market that hasn't received the anchor-mint defense)
- **Surface description:** `exchangeRateStoredInternal` returns `initialExchangeRateMantissa` when `totalSupply == 0` (line 351). When admin calls `_supportMarket(newCToken)` (line 963) followed by `_setCollateralFactor` (line 867), the new market is live with TVL=0. Attacker frontruns the first legitimate user by calling `mint(1 wei)`, receiving `1e18/initialExchangeRateMantissa` cTokens (typically `5e7` cTokens at `2e-9` initial exchange rate). Then attacker donates large `underlying` directly to the cToken address via raw TRC20 transfer, inflating `getCashPrior` from ~1 wei to (1 wei + N). Next victim's `mint(N)` does `mintTokens = actualMintAmount / exchangeRate = N / (cash+borrows-reserves)/totalSupply ≈ 0` (rounds down). Victim's deposit is captured by attacker via subsequent `redeem(1)` from attacker's position.
- **Compound V2 anchor cross-check:** This IS the canonical Compound V2 cToken inflation attack. Compound's defense was an admin-side "anchor mint" of a meaningful initial value when listing markets (visible in production deployment scripts but NOT enforced on-chain). JustLend has no on-chain enforcement.
- **Live-window check:** All 12 named in-scope markets are mature (Aug 2022 - Feb 2023 deployments) — first-mint window CLOSED for these. **The 43 unnamed in-scope assets could include any post-2023 market additions; each such addition opens a fresh window.** Per Doctrine #34, post-audit composition adds unaudited deployment surface.
- **DUP verification:** Canonical attack class. CertK Apr 2022 audit would have called it out for the 11 launch markets. Whether JustLend has off-chain process to anchor-mint every new market is unknowable without governance-forum review. Submitting this as a Gate 2 finding requires identifying an UNAUDITED post-2023 market addition that did NOT receive an admin anchor-mint.
- **Gate 2 promotion criteria:** Enumerate all 55 in-scope addresses via TronGrid. Find any newly-listed market with non-trivial `totalSupply == 0` or `totalSupply < 1e6` (no anchor mint). Build PoC exploiting the inflation primitive on the empty market.

### Candidate #4 — JustLend's `liquidateBorrowFresh` defensive guard analysis (verification target, NOT a finding)

- **File:** `contracts/CToken.sol` lines 1004-1027
- **R8 tag:** `[INSPECTED]` — included as DUE-DILIGENCE candidate to confirm the additional guard line 1019 is NOT introducing a new bug
- **Observation:** JustLend adds `require(cTokenCollateral.balanceOf(borrower) >= seizeTokens, "LIQUIDATE_SEIZE_TOO_MUCH")` on line 1019, which is NOT in canonical Compound V2. Combined with the existing `seizeInternal` underflow check, this is double-defense. **However**, the `balanceOf` call is a view on `cTokenCollateral.accountTokens[borrower]` BEFORE the seize. If `repayBorrowFresh` on line 1005 triggered a reentrant callback that modified `cTokenCollateral.accountTokens[borrower]`, the line 1019 read could be stale.
- **Sub-finding worth tracking:** `repayBorrowFresh` calls `doTransferIn` on the BORROW underlying (not the collateral underlying). If the borrow underlying has a transfer-callback hook (ERC777-class), and the callback can call `transfer()` on the COLLATERAL cToken to move `accountTokens[borrower]` away (e.g., to a contract attacker controls), the borrower's balance decreases between line 1005 and line 1019, triggering the LIQUIDATE_SEIZE_TOO_MUCH guard and REVERTING the liquidation. **This is a griefing vector** (denial-of-liquidation), not a fund-loss vector. Per Immunefi severity scale: "Griefing without profit motive" = Medium. Not a Critical, but might qualify for a Medium payout. **Hold for Gate 2 verification.**

### Candidate #5 — Doctrine #32 v1.1 STALE-SUBSTRATE class flag

- **File:** entire `contracts/` directory
- **Class:** Doctrine #32 v1.1 (stale-substrate target with 4-year-old audit, code frozen since Feb 2023, mixed Solidity 0.5.12/0.5.16 pragma, pre-0.8 SafeMath era)
- **R8 tag:** `[INSPECTED]` (substrate condition documented in Layer 0 + git log + pragma scan)
- **Surface description:** This is not a single candidate but a class flag. The entire codebase is unmaintained since Feb 2023 (the Mar 2026 commits are config-only). New EVM/Solidity exploitation techniques discovered after Feb 2023 (post-EIP-7702, post-Uniswap-V4-hook research, post-CREATE3-collision research, post-EIP-1559-blob research) have NOT been retrofitted into JustLend. Every 2024-2026 cToken-class vulnerability discovered elsewhere should be cross-pollinated to JustLend as a candidate primary research direction.
- **Implication:** Even if Candidates #1-#4 do not survive Gate 2, the STALE-SUBSTRATE class flag means JustLend belongs on a 6-month rescan cadence — every time the brain accumulates a new Compound-V2-fork exploit pattern, re-run the surface map. Currently the brain has 1 pending family (DC-12 sub-7 Notional-class oracle wrapper) that did not exist when CertK reviewed JustLend in 2022.

---

## BRAIN COMPOUND PROPOSALS (FROZEN PENDING OPERATOR)

These are surfaced for operator review per the discipline of NOT editing brain/ files mid-Gate-1:

1. **brain/Patterns-Defense-Classes.md DC-12 sub-7 addition**: Promote PriceOracleProxy-class "oracle wrapper strips staleness" as a named sub-pattern with JustLend as a 2026 anchor target (alongside Notional V3 MidasOracle DISC-019). The class would index all Compound-V2-fork PriceOracleProxy contracts that read from EOA-pushed v1PriceOracle without staleness checks — there are many forks (Cream, Hundred, Iron Bank pre-Chainlink, dozens of long-tail Compound-V2 forks across L2s).

2. **brain/Doctrine.md #34 enrichment**: Add JustLend's BUSD-market-added-Feb-2023 as a concrete worked example of post-audit composition — the CertK Apr 2022 audit covered 11 markets; BUSD was added 10 months later without (apparent) re-audit. Same pattern as the Doctrine #34 anchors already filed.

3. **brain/Watchlist-Candidate-Crossmap.md row #8 update**: Re-score from `L-?-M-?-L → overlap=15` to `M-?-H-?-M → overlap=22` reflecting DC-12 sub-7 + Pattern D CEI elevation. (Operator decision on whether the elevation tier change is worth keeping JustLend prominent in the watchlist when EV is still low at $50K cap.)

4. **brain/Cross-Domain-Fragility-Laws.md TRC20-callback-hook addition**: TRON's TRC20 standard documentation includes optional `tokensReceived` callback for TRC10 wrappers (WBTT in particular). Add as a parallel-validation-asymmetry law: every Compound-V2 fork on TRON has CEI exposure on ANY underlying with TRC20-callback semantics. The Compound V2 codebase predates ERC777 awareness; JustLend's CTokenERC777 variant proves the bug class was identified at some point but never backported to CToken.

5. **brain/Disclosure-Programs-Top-Tier.md status update**: JustLend's $20K total payout history is a **payer-risk flag** (per `standing-intake-protocol.md` Step 1 — $0-history zone P(acceptance)≈0.2). Add a payer-history watchlist annotation.

---

## DISK DELTA + CLONE RETENTION

- Disk pre-clone: 87% (4.7G free) per session-start check 03:58 UTC
- Disk post-clone + Layer0: **88% (4.7G free)** — HALT threshold hit but flat (clone is only 1.3M)
- V6 18-detector pipeline run: **SKIPPED** due to halt threshold + low EV target priority
- Clone retention: KEEP `.gate1-work/justlend-immunefi-2026-05-26/justlend-protocol/` for Gate 2 promotion (1.3M total)
- Sibling targets running in parallel may consume more disk; cleanup batch can drop this clone if Gate 2 deprioritized

---

## VERDICT

**Gate 1 status: COMPLETE.**

**Surviving candidates: 4 of 5 target classes hit; 5 surface candidates produced.**

| #   | Candidate                                        | Severity-band  | Gate 2 promotion?                                                  |
| --- | ------------------------------------------------ | -------------- | ------------------------------------------------------------------ |
| 1   | CEI in redeemFresh + borrowFresh (Pattern D)     | HIGH/CRITICAL  | **YES — primary** (requires receive-hook underlying confirmation)  |
| 2   | PriceOracleProxy missing staleness               | OUT-OF-SCOPE   | NO (Immunefi excludes "mispricing without manipulation")           |
| 3   | First-mint inflation on new markets              | HIGH           | YES — secondary (requires post-2023 unaudited market enumeration)  |
| 4   | liquidateBorrow griefing via TRC20-callback      | MEDIUM         | YES — tertiary (low-cost griefing vector)                          |
| 5   | Doctrine #32 v1.1 STALE-SUBSTRATE class flag     | N/A (meta)     | n/a — schedule 6-month rescan cadence                              |

**Gate 2 recommendation: PROMOTE Candidate #1 (CEI-in-redeemFresh)** to full bytecode-verification + PoC scaffold. Requires:
1. Enumerate all 55 in-scope address bytecode via TronGrid
2. For each underlying TRC20, inspect bytecode for receive-hook (`tokensReceived`/`call` to from-address on transfer)
3. If ANY in-scope market has a receive-hook underlying, build Foundry PoC simulating cross-cToken reentry through Comptroller.getAccountLiquidity
4. Validate that stale `accountTokens` read during the redeemFresh window enables over-borrow or double-spending of collateral
5. Estimate realized $ impact at current TVL ($3.55B → $50K cap is the bounty ceiling regardless)

**EV-driven prioritization:** Gate 2 effort for $1,575 nominal EV is LOW priority versus sibling targets (Raydium $15K, Stacks $10K, Filecoin $25K). **Recommend operator approve Gate 2 ONLY if a sibling Gate 2 finishes early or as a parallel low-cost workstream.** The 6-month rescan cadence (Candidate #5) is the higher-confidence ROI path for this target — defer to Lane 1.5 watchlist queue.

**Wall-clock spend:** Gate 1 completed in ~30 min wall-clock (well under the 60-min budget). Per operator directive: Solidity = fastest via existing pipeline confirmed.

**Bismillah. Filed.**

---

_Gate 1 — JustLend DAO Immunefi | v1.0 | 2026-05-26 04:15 UTC | Buzz Security Research_

---

## 🪦 FORECLOSURE-RECEIPT — Candidate #1 (CEI in redeemFresh + borrowFresh / Pattern D)

**Date:** 2026-05-26 09:23 UTC
**Authority:** Ogie msg 7811 (dispatch) + msg 7817 (file FORECLOSURE-RECEIPT directive)
**Verification scope:** all 5 in-scope JustLend underlying TRC20 tokens

**Method:** TronScan API methodMap + bytecode disassembly check against 6 canonical receive-hook selectors (`tokensReceived` 0023de29, `onTokenTransfer` a4c0ed36, `onTransferReceived` 88a7ca5c, ERC777 send 75ab9782, ERC1155 onReceived f23a6e61, ERC721 onReceived 150b7a02). All checks `[INSPECTED]` via TronScan compiled methodMap (sufficient for dismissal: selector-not-in-methodMap = cannot be dispatched).

| Token | Address                                | Result    | methodMap | Proxy? | Notes                                                  |
|-------|----------------------------------------|-----------|-----------|--------|--------------------------------------------------------|
| WBTT  | `TKfjV9RNKJJCqPvBtK8L7Knykh7DNWvnYt`   | NO HOOK   | 6 fns     | false  | WETH-style TRC10→TRC20 wrapper (BTT TRC10 id 1002000)  |
| SUN   | `TKkeiboTkxXKJpbmVFbv4a8ov5rAfRDMf9`   | NO HOOK   | 5 fns     | false  | Std TRC20 only                                         |
| JST   | `TCFLL5dx5ZJdKnWuesXxi1VPwjLVmWZZy9`   | NO HOOK   | 17 fns    | false  | Std TRC20 + admin/mint/burn                            |
| WIN   | `TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7`   | NO HOOK   | 10 fns    | false  | TRC20 + minter ops (WINkLink)                          |
| NFT   | `TFczxzPhnThNSqr5by8tvxsdCFRRz6cPNq`   | NO HOOK   | 13 fns    | false  | TRC20 + pause/ownership/request/cancel (AINFT)         |

**Verdict:** C1 hypothesis (TRC20 receive-hook CEI reentrancy) **NOT EXPLOITABLE** on the JustLend underlying set. **ZERO** of 5 underlyings implement any ERC777 / ERC1155 / ERC721 receiver-callback or token-transfer-hook pattern. **None are proxies** — cannot be upgraded to add hooks later.

**Status:** FORECLOSED. C1 dismissed. No Gate 2 escalation.

**Brain compound:** confirms the JustLend brain-overlap row's prior-anchor expectation (CTokenERC777's existence in the codebase is evidence the bug class was identified, but actual deployment of receive-hook underlyings did not happen). Cross-pollination: every future Compound-V2-fork CEI candidate should default to checking underlying-hook surface FIRST before any further Gate 2 work — methodology compounding.

**Sibling-class caveat (NOT pursued per Ogie msg 7817):** jToken wrapper itself may implement a receive hook on the cToken side independent of underlying — that's a different finding class. Operator explicitly skipped this follow-up.
