# Gate 1 — Cap (cap.app / cap-labs) — 2026-05-27

> **PLATFORM CORRECTION**: Operator dispatch said "Immunefi bounty program." Live Immunefi list returns 404 across `/bug-bounty/capapp/`, `/bug-bounty/cap-labs/`, `/bug-bounty/capmoney/`, `/bug-bounty/cap/`. WebSearch + Sherlock bounty index confirms **Cap's live bounty is on Sherlock, NOT Immunefi**: `audits.sherlock.xyz/bug-bounties/114` — LIVE, $1M USDC max, last updated 2025-10-24. Contradictions-Register INFO #19 BRIEF-VS-LIVE protocol triggered — logged in §5.
>
> Substrate (cap-contracts HEAD `7254ed0`, 2026-04-29) is the same; submission target rotates from Immunefi → Sherlock. Gate 1 proceeds.

## Step 1 — PROFILE

| Field | Value |
|---|---|
| Platform | **Sherlock** (NOT Immunefi — operator brief discrepancy) |
| URL | `audits.sherlock.xyz/bug-bounties/114` |
| Status | **LIVE** (verified 2026-05-27, last updated 2025-10-24) |
| Critical cap | **$1,000,000 USDC** (single max-reward; severity breakdown not yet extracted from JS-rendered page) |
| KYC | Sherlock standard: typically **no KYC** for bounty path; judging-based; rep-neutral (no novice gate) |
| Submission | Sherlock judging system; Foundry PoC standard; markdown writeup |
| Scope assets | 185 .sol files / **15,433 LOC** across 18 module dirs (excluding test/) [INSPECTED] |
| Chains | Ethereum primary; L2Token cross-chain wrapper present [INSPECTED via repo] |
| Languages | Solidity ^0.8.28 [EXECUTED via grep on contract files] |
| Repo HEAD | `7254ed0dda93367cf8c0a117cc4638f6fd22951e` (2026-04-29) [EXECUTED via `git log -1`] |
| Brief mismatch | Brief said last commit 2026-05-08; HEAD is 2026-04-29 (depth=1 default-branch clone). ~28d substrate freshness (FRESH per Doctrine #36, opposite of Veda's 525d stale) |

**Module dirs** (`contracts/`): `access/`, `delegation/` (eigenlayer + symbiotic), `deploy/`, `feeAuction/`, `feeReceiver/`, `fractionalReserve/`, `gelato/`, `ico/`, `interfaces/`, `lendingPool/` (with `libraries/` + `tokens/`), `lens/`, `oracle/` (with `libraries/`), `storage/`, `swapper/`, `token/`, `vault/` (with `libraries/`).

## Step 0.5 — 5-CHANNEL CHECK (Veda-formalized prerequisite)

| Channel | Result |
|---|---|
| 1. Brain ledger (`brain/Security-Research-Submission-Ledger.md`) | No prior Cap DISC entry [EXECUTED via Grep] |
| 2. Audit-Reports-Library (`brain/Audit-Reports-Library.md` §4) | **FULL profile already on file** since 2026-05-16 — 9 audits across Zellic / ToB / Electisec / Spearbit ×2 / Recon / Sherlock / Certora / Octane [EXECUTED via Grep, lines 18 + 453-580] |
| 3. In-source HEAD freshness | `7254ed0`, 2026-04-29 = **28d FRESH** (per Doctrine #36 substrate gate, qualifies for hunt) [EXECUTED via `git log -1`] |
| 4. Live Immunefi STATUS | **404 across all 4 candidate URLs**; live bounty actually on Sherlock (#114), LIVE, $1M USDC [EXECUTED via WebFetch + WebSearch] |
| 5. Receipt window | No prior Cap-related receipts in `Security-Research-Submission-Ledger.md` [EXECUTED via Grep] |

**Verdict**: NOT a DEDUP-FORECLOSURE-RECEIPT (only 1/5 channels signaled saturation: audits-library profile was prior intake, not a submission). Program is ACTIVE on a different platform. **Proceed with Gate 1**, with submission target rotated to Sherlock and platform-correction logged.

## Step 2 — BRAIN OVERLAP SCORE: **HIGH**

| Lens | Hit | Evidence (file:line) | R8 tag |
|---|---|---|---|
| **DC-7 H** (Validating-Field ≠ Consuming-Field paired-function gap) | **DIRECT** | `EigenOperator.advanceTotp()` writes `allowlistedDigests[digest]=true` with NO auth (lines 105-111); `isValidSignature()` consumes that mapping (lines 129-145). One-line setter → downstream ERC1271 oracle. Plus `Lender.borrow → BorrowLogic.borrow → ValidationLogic.validateBorrow` paired with `realizeInterest / realizeRestakerInterest` (3 consumers off 1 validation: validateBorrow / liquidation health / repay path). | [INSPECTED] |
| **CANDIDATE-J H** (state-machine cooldown overwrite / setter-vs-accumulator) | **DIRECT** | `BorrowLogic.realizeRestakerInterest()` at line 208: `reserve.lastRealizationTime[_agent] = block.timestamp` — assignment, NOT max() with prior. If called twice within same block from different code paths (borrow→realizeRestakerInterest; repay→realizeRestakerInterest), timestamp set lossy. Combined with `Delegation.slashTimestamp()` line 165-174 which uses `Math.max(epoch boundary, lastBorrow-1)` — these are the EXACT setter/consumer pair shape from Sky CANDIDATE-J Point-5. | [INSPECTED] |
| **CJ H / Pattern E** (Oracle SETTER + asymmetric staleness) | **DIRECT** | `PriceOracle.setStaleness(asset, value)` at line 32-35: **per-asset** staleness. `_isStale()` at line 95-97 reads `getPriceOracleStorage().staleness[_asset]` — per-asset. Backup oracle uses **SAME** staleness window as primary (line 44-48). If admin sets staleness=0 (or never sets it, default 0), `_isStale` returns `block.timestamp - lastUpdated > 0` ⇒ always true ⇒ falls through to backup ⇒ if backup also staleness=0 ⇒ `PriceError`. Per-asset asymmetry + zero-default is the CJ structural risk. | [INSPECTED] |
| **DC-9 sub-2 H** (zero-timelock admin migration + privileged state mutation) | **DIRECT** | `Lender.setGrace / setExpiry / setBonusCap / setMinBorrow / setInterestReceiver` all gated only by `checkAccess(selector)` from `Access.sol` — no timelock visible at this layer. `Delegation.setLtvBuffer / setFeeRecipient / setCoverageCap / modifyAgent` same shape. `PriceOracle.setPriceOracleData / setPriceBackupOracleData / setStaleness` same. If AccessControl admin role is single-sig or no-timelock multisig, mass-mutation in single tx is feasible. | [INSPECTED] |
| **DC-1 M** (reentrancy on external transfer) | **LIKELY** | `BorrowLogic.repay()` lines 142, 149, 154: three `safeTransfer` + `forceApprove + IVault(reserve.vault).repay()` calls AFTER state mutation (debt decrements at line 140-141, 148). CEI mostly clean BUT `_burn` at line 158 happens AFTER all external calls — debt token balance check at 160 reads burned state to clear borrowing flag. If `forceApprove` triggers re-entry through a malicious vault, manipulation feasible. | [INSPECTED] |
| **CANDIDATE-O M** (slippage double-count across swap steps) | **MEDIUM** | `Vault.mint / burn / redeem` have `_minAmountOut` checks BUT `Vault.borrow` (lines 117-125) calls `divest(_asset, _amount)` BEFORE `VaultLogic.borrow` runs — divest may pull from fractional-reserve strategy adapters which themselves may have rounding/slippage. Multi-step path with single-point slippage check at the top. | [INSPECTED] |
| **CANDIDATE-A M** (cross-chain bridge accounting) | **MEDIUM** | L2Token wrapper exists per `Audit-Reports-Library.md` §4 line 478; not deeply analyzed in this Gate 1 pass — surface flagged for Gate 2 if primary candidates fail. | [ASSUMED — based on Audit-Reports-Library prior profile] |
| **CANDIDATE-I L** (ERC4626 share accounting) | **STRUCTURAL-IMMUNE** | `Vault.sol` is **NOT ERC4626** — uses custom `mint/burn/redeem` with `_minAmountOut` parameters, not `previewMint/previewRedeem`. Per-asset accounting via `totalSupplies[asset]` mapping. No first-depositor inflation surface. Brief's L-tier rating confirmed correct: structurally immune. | [INSPECTED] |
| **Doctrine #38** (Pure Pass-Through *WithSig STRUCTURAL FORECLOSE) | **NOT APPLICABLE** | `advanceTotp()` is the OPPOSITE pattern — UNAUTHENTICATED setter, no signature verification at the wrapper. Doctrine #38 forecloses pass-through wrappers that just forward bytes — here there's no signature byte to forward. The lack-of-signature IS the finding axis. | [INSPECTED] |
| **DC-12** (rounding edge) | LOW | `BorrowLogic.repay` line 110 `Math.min(params.amount, agentDebt)`; line 115 `repaid = agentDebt - reserve.minBorrow` — caps boundary covered. WadRayMath / PercentageMath library present (per file inventory). Need fuzz-pass to confirm. | [ASSUMED] |
| **DC-13** (signature replay) | **DIRECT-NEGATED** | `EigenOperator.calculateTotpDigestHash()` at line 161-166 includes `expiryTimestamp = (currentTotp+1) * totpPeriod` in the digest. Per-period rotation prevents replay across periods. But within a period, digest is reusable (TOTP-style by design) — this IS the design, not a bug. | [INSPECTED] |

**Score**: **HIGH** — 4 direct lens hits (DC-7, CANDIDATE-J, CJ/Pattern E, DC-9 sub-2) + 2 medium + novel TOTP-EigenLayer surface not previously in Buzz corpus.

## Step 3 — EV CALCULATION

```
EV_raw = P(finding) × bounty_cap × P(acceptance) × overlap_multiplier
       = 0.15 × $1,000,000 × 0.5 × 1.0
       = $75,000

Discount stack (Doctrines #27 + #36):
  audit-saturation: 9 audits / 7 firms (Zellic / ToB / Electisec / Spearbit×2 / Recon / Sherlock / Certora / Octane)
    → MAXIMUM saturation tier; multiplier ≈ 0.20
  substrate-coverage: EigenLayer + Symbiotic + Yearn V3 forks all already-covered by prior audits
    → multiplier ≈ 0.50

EV_discounted = $75,000 × 0.20 × 0.50 = $7,500
```

**Realistic post-discount range: $5K–$15K**, matching Veda agent's note. Confirms HIGH-overlap-but-saturated category — the win-condition is finding a **novel surface that 9 audits collectively missed**, not pattern-replay.

**Saturation tier**: TIER-A SATURATED (≥7 audit firms). Pre-promotion expectation: only a NOVEL paired-function gap OR a fresh-commit-since-last-audit regression has acceptance probability >5%.

## Step 4 — QUEUE DECISION

Per standing-intake-protocol.md §Step 4 table: **HIGH overlap + $500K+ cap = Immediate Gate 1.** Already executing.

Per autonomy-boundary.md: this Gate 1 was autonomously dispatched. Submission to Sherlock would require operator approval (OPERATOR REQUIRED item #1: "Submitting to any bounty platform"). Gate 1 is autonomous; Gate 2 PoC dispatch is autonomous IF a candidate survives; paste-ready submission gets flagged.

## Step 5 — GATE 1 SURFACE MAP

### 5-Target Quality Checklist (Step 5.6 MANDATORY)

| # | Target Class | File(s) Touched | Status |
|---|---|---|---|
| 1 | **Withdrawals/Redemptions** | `Vault.sol` burn/redeem (lines 61-115); `BorrowLogic.sol` repay (lines 99-175) | ✅ INSPECTED |
| 2 | **Liquidation + Oracle** | `LiquidationLogic.sol` (referenced); `ValidationLogic.validateLiquidation` (lines 87-96); `PriceOracle.getPrice` (lines 38-50) | ✅ INSPECTED |
| 3 | **Deposit/Mint Shares** | `Vault.mint` (lines 35-58); `Minter.sol` (137 LOC, getMintAmount logic) | ✅ INSPECTED (Vault) |
| 4 | **External Calls** | `Vault.borrow → divest()` (line 122); `BorrowLogic.repay safeTransfer` (lines 142, 149, 154); `IVault.borrow` from Lender (line 83) | ✅ INSPECTED |
| 5 | **Admin/Upgrade** | `Access.sol` checkAccess modifier; all setters in Lender / Delegation / PriceOracle / Vault; `_authorizeUpgrade` (Lender L288, Delegation L260) gated only by `checkAccess(bytes4(0))` | ✅ INSPECTED |

All 5 targets touched. Surface map complete per Step 5.6 quality gate.

### Top Findings (ranked by EV after saturation discount)

#### Finding 1 — `advanceTotp()` permissionless allowlist mutator + `isValidSignature` consumer asymmetry

**[INSPECTED]** — `contracts/delegation/providers/eigenlayer/EigenOperator.sol:105-145`

```solidity
function advanceTotp() external {                                      // L105 — NO auth modifier
    EigenOperatorStorage storage $ = getEigenOperatorStorage();
    bytes32 digest = calculateTotpDigestHash($.restaker, address(this));
    $.allowlistedDigests[digest] = true;                                // L110 — PUBLIC WRITE
}

function isValidSignature(bytes32 _digest, bytes memory) external view returns (bytes4) {
    ...
    if ($.allowlistedDigests[_digest]) return bytes4(0x1626ba7e);       // L141 — TRUSTS PUBLIC WRITE
    else return bytes4(0xffffffff);
}
```

**Hypothesis**: Anyone can call `advanceTotp()`. The function deterministically computes the digest for the CURRENT period using stored `$.restaker` + `address(this)`. This means the next period's digest is allowlisted unconditionally any time anyone calls it. Combined with `isValidSignature` being called by the EigenLayer `DelegationManager` for delegation-approval (ERC1271 magic value `0x1626ba7e`), this means:

(a) Any external caller can pre-warm the allowlist for the next TOTP period → no realistic attack since the digest binds to `$.restaker` set in `registerOperatorSetToServiceManager()` (line 50) which IS access-gated to `$.serviceManager`. So pre-warming alone is not a finding.

(b) HOWEVER: if `$.serviceManager` ever calls `registerOperatorSetToServiceManager()` with a NEW staker (line 43 has `if ($.restaker != address(0)) revert AlreadyRegistered();` — so it can only be set ONCE per EigenOperator instance). This is single-use. NOT exploitable as a re-binding race.

(c) **Real concern**: `calculateTotpDigestHash` (L161-166) calls `IDelegationManager(delegationManager).calculateDelegationApprovalDigestHash($.restaker, _operator, address(this), bytes32(uint256(expiryTimestamp)), expiryTimestamp)`. The EXPIRY parameter is `expiryTimestamp = (currentTotp + 1) * totpPeriod` (L150-152). `totpPeriod = 28 days` hardcoded at init (L26). If `block.timestamp / 28 days` produces the SAME `currentTotp` value across two calls in the same period, the digest is identical — but the EigenLayer DelegationManager presumably tracks nonce/used-digests on ITS side. **Need to verify**: does EigenLayer's `delegateTo` reject re-use of the same approval digest within its expiry window? If yes, no finding. If no, a stale digest from a prior 28-day window where the staker withdrew/redelegated could be re-applied.

(d) **DC-7 paired-function gap**: `advanceTotp()` updates ONE field (`allowlistedDigests`); `isValidSignature` reads ONE field. But what about `restaker` change? There's NO function to ROTATE restaker → so the digest will ALWAYS be for the original `$.restaker`. If the original restaker exits the staking position via EigenLayer's own `queueWithdrawals`, the cap protocol's `advanceTotp` keeps allowlisting digests for an exited staker — silent stale-state. **Real candidate axis**: combine with EigenLayer withdrawal semantics for a Gate 2 PoC.

**Gate 2 PoC plan**: Foundry fork of mainnet EigenLayer; deploy EigenOperator with restaker=Alice; have Alice initiate `queueWithdrawals` on `DelegationManager`; advance time past the unbonding period; verify `advanceTotp` still allowlists fresh digest for Alice; verify whether DelegationManager accepts a `delegateTo` call using that digest after Alice has fully undelegated. If yes → loss-of-coverage exploit candidate.

**Foreclosure risk**: high — likely caught by Sherlock 2025-07 or Certora EigenAVS scope 2025-09. Confidence: 35% novel.

#### Finding 2 — `BorrowLogic.realizeRestakerInterest()` sets `lastRealizationTime` lossily (CANDIDATE-J Point-5 family)

**[INSPECTED]** — `contracts/lendingPool/libraries/BorrowLogic.sol:208`

```solidity
function realizeRestakerInterest(...) public returns (uint256 realizedInterest) {
    ILender.ReserveData storage reserve = $.reservesData[_asset];
    ...
    reserve.lastRealizationTime[_agent] = block.timestamp;   // L208 — ASSIGNMENT not max()
```

Called from `borrow` (L66) AND `repay` (L104). If a transaction does BOTH borrow-then-repay (or a flashloan-wrapped operation does both within a single block via a contract that holds both roles), the second call's `block.timestamp` is identical to the first — no lossy *value*. BUT: `accruedRestakerInterest` (ViewLogic) likely uses `lastRealizationTime` as the basis for interest computation. If a fork can call `realizeRestakerInterest` AFTER a high-rate period and BEFORE a settlement function consumes the accrued amount, the assignment overwrites a needed timestamp. Need to read ViewLogic.accruedRestakerInterest to confirm.

This is the EXACT Sky CANDIDATE-J Point-5 family shape per `brain/Audit-Reports-Library.md` line 537 ("cap is essentially 'Sky if Sky used restaking instead of MKR for backing'"). **Strong cross-pollination candidate.**

**Gate 2 PoC plan**: write Foundry test that (a) calls `realizeRestakerInterest`, (b) advances time, (c) calls `realizeRestakerInterest` again, (d) reads `accruedRestakerInterest` value before/after, (e) checks whether intermediate value was lost. If interest is accumulated correctly via cap's own rate model + Oracle index, no finding. If `lastRealizationTime = block.timestamp` overwrites a value needed for a separate consumer (e.g., `slashTimestamp` in Delegation.sol L165 reads `lastBorrow`, not `lastRealizationTime` — so the consumer-disjunction reduces this risk).

**Foreclosure risk**: medium-high. Likely audited by Spearbit lead-researchers Apr 2025 or Recon invariant-testing May 2025. Confidence: 25% novel.

#### Finding 3 — `PriceOracle` per-asset staleness asymmetry + zero-default fallback

**[INSPECTED]** — `contracts/oracle/PriceOracle.sol:38-50, 95-97`

```solidity
function getPrice(address _asset) external view returns (uint256 price, uint256 lastUpdated) {
    PriceOracleStorage storage $ = getPriceOracleStorage();
    IOracleTypes.OracleData memory data = $.oracleData[_asset];
    (price, lastUpdated) = _getPrice(data.adapter, data.payload);
    if (price == 0 || _isStale(_asset, lastUpdated)) {
        data = $.backupOracleData[_asset];
        (price, lastUpdated) = _getPrice(data.adapter, data.payload);
        if (price == 0 || _isStale(_asset, lastUpdated)) revert PriceError(_asset);
    }
}

function _isStale(address _asset, uint256 _lastUpdated) internal view returns (bool isStale) {
    isStale = block.timestamp - _lastUpdated > getPriceOracleStorage().staleness[_asset];
}
```

**Hypothesis 1 (DEAD)**: If `staleness[_asset] = 0`, then `_isStale` returns `block.timestamp - _lastUpdated > 0` — true for any price not updated in the EXACT current block. ALL prices become stale → falls through to backup → backup also has `staleness[_asset]=0` → reverts. Result = oracle DoS for that asset. NOT exploitable for value extraction, only for DoS — and an admin setting staleness=0 is a configuration error, not a bug.

**Hypothesis 2 (LIVE)**: The backup uses the SAME `staleness[_asset]` window as the primary. If the asset has a primary with tighter staleness (e.g., Chainlink with heartbeat ≤ staleness window) and a backup that updates LESS frequently (e.g., UniswapV3 TWAP with longer update cadence), the backup may ALWAYS be considered stale, and the protocol has no real fallback. Per `oracle/libraries/UniswapV3Adapter.sol` (85 LOC) and `ChainlinkAdapter.sol` (22 LOC) + `ChainlinkAdapterChained.sol` (37 LOC) — multi-adapter setup likely. The asymmetric-window-vs-source-update problem is a STRUCTURAL bug class. Whether it's exploitable depends on per-asset configuration deployed.

**Hypothesis 3 (CJ asymmetric pausing)**: Brief flagged "CJ H — Oracle SETTER + pausing at asset+protocol levels but NOT unified pauser." Verify: `Vault.pauseProtocol` (L153) + `Vault.pauseAsset` (L143) = 2-level. `Lender.pauseAsset` (L122) = 1-level (asset only). `PriceOracle` has NO pause function. The oracle has NO pause → `getPrice` will return values even during a Lender pause IF the Oracle data isn't pulled. If a divergence between Lender-pause-state and Oracle-pause-state allows liquidations (which read Oracle for health) to fire on a paused-by-vault asset, value extraction is possible. **Direct CJ candidate.**

**Gate 2 PoC plan**: Foundry deploy of Lender + Vault + PriceOracle; pause asset on Vault; trigger liquidation flow that reads Oracle for health-factor on the paused asset; confirm whether liquidation succeeds despite the pause. If yes → exploit.

**Foreclosure risk**: medium. CJ-class pausing-asymmetry findings are common audit targets; likely flagged by ToB Mar 2025 or Sherlock Jul 2025. Confidence: 30% novel.

#### Finding 4 — `_authorizeUpgrade` gated by `checkAccess(bytes4(0))` only (DC-9 sub-2 family)

**[INSPECTED]** — `contracts/lendingPool/Lender.sol:288`, `contracts/delegation/Delegation.sol:260`

```solidity
function _authorizeUpgrade(address) internal override checkAccess(bytes4(0)) { }
```

`bytes4(0)` is the selector `0x00000000`. If `Access.sol`'s checkAccess uses selector-based role mapping, this means upgrades are gated only by whoever holds the `0x00000000` role. If that role:
- Maps to `DEFAULT_ADMIN_ROLE` (single-sig) → critical risk
- Maps to a multi-sig with timelock → acceptable
- Is unset (no holder) → upgrades blocked (DoS)

Need to read `Access.sol` + `AccessControl.sol` to confirm role-binding. The same pattern repeats in `Vault.sol` (per inheritance to UUPSUpgradeable). DC-9 sub-2 (zero-timelock migration) candidate.

**Gate 2 plan**: read AccessControl.sol bind role-holder; check Etherscan for deployed AccessControl on Ethereum; verify multi-sig + timelock. If single-sig or no-timelock → systemic critical.

**Foreclosure risk**: high. Centralization findings are standard audit fare; ToB / Spearbit definitely flagged it if it's a single-sig deployment. Likely already publicly disclosed as "centralization risk" not paid. Confidence: 10% novel-and-payable.

#### Finding 5 — `Delegation.slashTimestamp()` boundary edge with `block.timestamp` decrement

**[INSPECTED]** — `contracts/delegation/Delegation.sol:165-174`

```solidity
function slashTimestamp(address _agent) public view returns (uint48 _slashTimestamp) {
    DelegationStorage storage $ = getDelegationStorage();
    _slashTimestamp = uint48(
        Math.max(
            (epoch() - 1) * $.epochDuration,
            $.agentData[_agent].lastBorrow > 0 ? $.agentData[_agent].lastBorrow - 1 : 0
        )
    );
    if (_slashTimestamp == block.timestamp) _slashTimestamp -= 1;
}
```

The `if (_slashTimestamp == block.timestamp) _slashTimestamp -= 1` is an ad-hoc fix to avoid querying a future-or-equal timestamp on Symbiotic's `slashableCollateral(agent, ts)` lookup. But:
- If `lastBorrow = block.timestamp` and `lastBorrow - 1 < (epoch()-1)*epochDuration`, the max() picks the epoch boundary, which is in the past → no decrement needed.
- If `lastBorrow > (epoch()-1)*epochDuration` AND `lastBorrow - 1 == block.timestamp`, the if-branch fires, returns `block.timestamp - 1`.

Edge case: in the SAME block as a `setLastBorrow` call (which sets `lastBorrow = block.timestamp` — Delegation.sol L75), an immediate `slashTimestamp()` call returns `block.timestamp - 1`. But `coverage()` reads `_lastborrowMinusOneDelegation` (L201-206) which queries `slashableCollateral(_agent, uint48(block.timestamp - 1))`. If the Symbiotic middleware uses a SEMANTIC of "snapshot at timestamp" that requires the timestamp to be AT LEAST 1 second old, this is fine. If it requires strict less-than-now, also fine. If a wrong off-by-one exists in Symbiotic's checkpoint logic, a single-block borrow-then-slash sequence could query an unset snapshot.

Likely a HARDENED-BOUNDARY edge case. Need to verify Symbiotic NetworkMiddleware semantics in Gate 2.

**Foreclosure risk**: very high — Recon's invariant-testing scope May 2025 almost certainly covered this. Confidence: 8% novel.

### Bytecode-verify prep (Step 5.3 MANDATORY)

Pre-flight: Sherlock bounty scope likely pins specific deployed contract addresses. Need to fetch program scope page (audits.sherlock.xyz/bug-bounties/114/scope) which is JS-rendered and not directly accessible. Workaround: extract deployed addresses from cap-contracts `script/` directory or from blocmates/OAK Research third-party explainers + cross-reference with mainnet Etherscan.

Commands to run in Gate 2 once addresses known:
```bash
cast code <address> --rpc-url $MAINNET_RPC > onchain.bin
solc --standard-json @ contracts/...:<Contract> compile_input.json | jq .contracts > local.bin
diff onchain.bin local.bin
```

Per Veda + Wormhole lesson: NEVER trust source repo HEAD = deployed bytecode without `cast code` verification. ESPECIALLY here where HEAD `7254ed0` (2026-04-29) post-dates Certora EigenAVS audit (2025-09) by ~7 months — deployment may be on a 2025-Q3 commit, not HEAD. **Bytecode-verify pin candidate determination is itself a Gate 2 prerequisite.**

## §5 — BRAIN COMPOUND PROPOSALS

(Do NOT apply — main session batches per autonomy-boundary.md)

### Proposal 1 — File new contradictions-register entry (INFO #19 BRIEF-VS-LIVE)

```
Entry: INFO-19-cap-platform-discrepancy
Date: 2026-05-27
Substrate: Cap (cap.app)
Channel: operator-brief-vs-live-platform-check
Discrepancy: Brief said "live Immunefi bounty program"; live Immunefi list returns 404 across all candidate URLs; actual bounty hosted on Sherlock (#114, $1M USDC, LIVE)
Resolution: Step 0.5 channel 4 caught discrepancy in pre-flight; Gate 1 proceeded with Sherlock as submission target
Lesson: Always run all 4 candidate Immunefi URL probes before clone. Platform-correction is autonomous (substrate same, submission target rotates).
```

### Proposal 2 — Update `brain/Audit-Reports-Library.md` §4 with bounty-platform correction

Existing §4 line 477 currently says: "**Immunefi listing did not resolve at standard slug `/bug-bounty/cap/` (404).** Operator-supplied watchlist data indicates $337M TVL × $1M bounty. Bounty cap, KYC requirements, jurisdictional restrictions NOT confirmed at intake — requires direct re-fetch with corrected URL (possibly `/bug-bounty/capapp/` or `/bug-bounty/capmoney/` or `/bug-bounty/cap-labs/`)."

Replace with:
```
**Bounty platform CORRECTED 2026-05-27 (Gate 1 hunt-record):** Cap bounty is on SHERLOCK, not Immunefi.
URL: audits.sherlock.xyz/bug-bounties/114
Status: LIVE since 2025-10-24
Max cap: $1,000,000 USDC (single max; per-severity breakdown not yet extracted from JS-rendered page)
KYC: Sherlock default (typically none)
Submission: Foundry PoC + markdown, judging-based
```

### Proposal 3 — Update `brain/Watchlist-Candidate-Crossmap.md` cap row

Add bounty-platform correction column entry: `bounty_platform: Sherlock (NOT Immunefi)` + `sherlock_id: 114`.

### Proposal 4 — Verify `brain/Disclosure-Programs-Top-Tier.md` does NOT have Cap under Immunefi

Cross-check + correct any Immunefi-platform misattribution.

### Proposal 5 — Append to `hunts/intake-log.md`

```
| 2026-05-27 | Cap (cap-labs) | HIGH overlap | Sherlock #114 | $1M USDC | Gate 1 filed; 5 findings; saturation tier A; bounty-platform corrected from Immunefi → Sherlock |
```

### Proposal 6 — Doctrine #38 PRE-CHECK worked-example entry

Document `EigenOperator.advanceTotp()` as a NEGATIVE example for Doctrine #38: the function is the OPPOSITE of a *WithSig wrapper (no signature, no pass-through) — Doctrine #38 does NOT apply. Strengthens the doctrine's scope by anchoring its boundary.

## §6 — VERDICT + NEXT-TARGET

**Verdict**: **PROCEED-DOWN-TO-GATE-2** — substrate intact, 5 candidates surfaced, top 3 (advanceTotp restaker rotation, CANDIDATE-J realizeRestakerInterest, CJ Oracle/Vault pause asymmetry) warrant Gate 2 PoC dispatch.

**Saturation tier**: **TIER-A SATURATED** (9 audits / 7 firms). EV-after-discount $5K–$15K. NOT worth deep Gate 2 if cleaner targets exist on the EV-ranked Lane 5 board.

**Recommended next action per autonomy-boundary.md EV ranking**:
1. Compare Gate 2 EV ($5–15K post-discount on saturated substrate) against the next clean target in `brain/Watchlist-Candidate-Crossmap.md`
2. If a CLEAN ($0 audits, ≥$50K bounty) target exists with HIGH overlap → dispatch THAT Gate 1 first
3. If no clean target, dispatch Gate 2 PoC for Finding 1 (advanceTotp restaker stale-state) — highest novelty (~35% novel) on Cap

**Next target recommendation** (without re-querying Lane 5 here — main session has DB access):
- If Lane 5 has a clean DC-7 / DC-9 substrate (unaudited or 1-audit) with ≥$50K cap → preempt Cap Gate 2
- Otherwise → Cap Gate 2 on Finding 1 (advanceTotp + EigenLayer withdrawal interaction). Budget 4-6 hours Foundry + mainnet fork + EigenLayer DelegationManager interaction.

## §7 — DISK STATUS

- At Gate 1 start: 85% used, 5.6G free
- After clone (cap-contracts: 9.4M): 85% used, 5.6G free (no measurable change)
- Hunt file: ~21KB
- Autonomy threshold (87%) NOT breached
- **Recommendation**: keep clone for Gate 2 if dispatched within 24h; purge if Cap deprioritized after main-session EV review

## §8 — STEP 6 CONTINUOUS

- [ ] Append intake row to `hunts/intake-log.md` (main session)
- [ ] Append cap row to `brain/Watchlist-Candidate-Crossmap.md` v2.10 or v2.11 addendum (main session)
- [ ] File Contradictions-Register INFO #19 entry (main session)
- [ ] Update `brain/Audit-Reports-Library.md` §4 bounty-platform correction (main session)
- [ ] Auto-index hook should fire on this file's creation (PostToolUse hunt-complete.sh)

---

_Hunt: 2026-05-27-cap-immunefi-gate1 | Filed by autonomous Gate 1 subagent | Substrate: cap-contracts HEAD 7254ed0 (2026-04-29) | Platform-corrected: Immunefi (brief) → Sherlock (live, #114, $1M USDC) | Verdict: PROCEED-DOWN-TO-GATE-2 (Tier-A saturated) | Disk: 85%/5.6G stable_
