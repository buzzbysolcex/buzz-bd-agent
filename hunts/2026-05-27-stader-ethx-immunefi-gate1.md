# Gate 1 — Stader ETHx (Immunefi)

**Date**: 2026-05-27
**Platform**: Immunefi
**Program**: staderforeth
**Bounty caps**: Critical 10% of funds affected, max $1,000,000 (min $100K); High $100K; Medium $20K. USDC on Ethereum. No-KYC.
**STATUS**: ACTIVE (live since 2023-07-08; program metadata last updated 2025-01-01)
**Repo**: github.com/stader-labs/ethx
**HEAD**: 9d4a921 (2025-12-18 — 5+ months staleness)
**Clone**: /home/claude-code/buzz-workspace/data/lane1/clones/stader-ethx (4.4M)
**LOC**: 9,731 across 54 .sol; 27 concrete contracts
**Layer 0**: 186 commits / 39 fix-pattern candidates — see hunts/layer0/layer0-stader.json

---

## Step 0 — Prior corpus

No prior Stader/ETHx Gate 1 in hunts/. Watchlist row #4 has Stader noted (priority 6, HIGH CI / M DC-7 / M CJ). audits-library/ has no Stader entries.

## Step 1 — Profile

| Field | Value |
|---|---|
| In-scope assets | "22 total" (Immunefi page); maps to 27 concrete contracts in stader-labs/ethx |
| Chains | Ethereum mainnet (primary). The Stader org also has BNB / MaticX / Hedera / Near repos — explicitly OUT-OF-SCOPE for ETHx bounty |
| PoC requirement | Required for ALL severities (Foundry-compatible) |
| Rep threshold | None |
| Rate-limits | None stated |
| Auditors (public) | Halborn, Sigma Prime, ChainSafe (per gitbook); no audit PDFs in repo audits/ folder |

## Step 2 — Brain overlap (HIGH)

| Lens | Hit | Evidence |
|---|---|---|
| **Doctrine #29 v1.1 MIN-cap defense** | **ABSENT** [INSPECTED] | Manager._convertToShares() (StaderStakePoolsManager.sol:289-295) is single-source: `_assets.mulDiv(supply, totalAssets(), Rounding.Down)` where `totalAssets()` = `IStaderOracle.getExchangeRate().totalETHBalance` (line 134-136). No `min(oracle, pool)`, no market-rate cross-check, no rate-provider. grep -rn "min(oracle\|rateProvider" returns zero matches. **Stader is a NEW CANDIDATE for Doctrine #29 v1.1, not a second anchor.** |
| **DC-9 sub-4 asset-vs-receipt** | **HIT** [INSPECTED] | UserWithdrawalManager.finalizeUserWithdrawalRequest() line 154-167: ethX burn amount = `lockedEthX` (request-time) but ETH transferred = `Math.min(requiredEth, lockedEthX * exchangeRate_finalize / decimals)` (line 156). `ethRequestedForWithdraw` decrement on line 165 uses `requiredEth` (request-time) but actual ETH-sent uses MIN — accounting decrements faster than actual outflow when oracle drops between request and finalize. Persistent skew possible. |
| **DC-12 monotonic oracle / staleness** | **HIT — HIGH severity** [INSPECTED] | StaderOracle.getPORFeedData() line 737-743: reads two Chainlink AggregatorV3 feeds (ETHBalancePORFeedProxy + ETHXSupplyPORFeedProxy) and **discards `updatedAt` and `answeredInRound`**. NO staleness check. NO `answer > 0` check. NO sequencer-uptime check. Returns `block.number` as reporting block — feed staleness fully invisible. Stale or frozen PoR feed → updateERFromPORFeed (line 182-188) silently accepts. Combined with ER change-limit (erChangeLimit = 5% per update, line 82) — a stale-but-still-in-band feed bypasses the inspection-mode safety. |
| **CANDIDATE-I share inflation / first-depositor** | LOW [INSPECTED] | `initialConvertToShares` (line 302-307) returns 1:1 when supply==0. ETHx initial mint path goes through StaderStakePoolsManager.deposit (line 187-195) which enforces `assets >= minDeposit()` — minDeposit set in StaderConfig (not constant). If minDeposit ≥ 1 ETH (standard for LST), first-depositor attack is non-trivial but the asymmetric rounding `Math.Rounding.Down` on shares + `Math.Rounding.Down` on assets on opposite sides is the classic Vault donation hole. **Needs Gate 2 PoC to confirm value-extraction magnitude.** |
| **CANDIDATE-O slippage** | MED [INSPECTED] | UserWithdrawalManager request→finalize delay: user records `ethExpected` at request-time; protocol pays `min(ethExpected, currentRate * shares)`. **WRONG-DIRECTION protection**: protocol always wins, user always loses on rate-decrease, breaks even on rate-increase. Asymmetric. Combined with the configurable `getMinBlockDelayToFinalizeWithdrawRequest()` (operator-controlled delay) this is a value-leak the operator can amplify. |
| **CANDIDATE-J state-machine cooldown overwrite** | LOW [INSPECTED] | excessETHDepositCoolDown (Manager line 233-264) — single-shot cooldown gate, no overwrite vector visible at Gate 1 depth. |
| **5-Target checklist** | All 5 touched [INSPECTED] | (1) Withdrawals: UserWithdrawalManager + SDUtilityPool finalize paths. (2) Liquidation/Oracle: StaderOracle PoR feed (DC-12 finding above). (3) Deposit/Mint: Manager.deposit single-oracle conversion. (4) External calls: validatorBatchDeposit `stakeUserETHToBeaconChain{ value: ... }()` on operator-influenced pool address. (5) Admin/Upgrade: 27 contracts upgradeable (OpenZeppelin Initializable), 3 .openzeppelin manifests (mainnet/holesky/arbitrum-one) — admin can swap any contract via DEFAULT_ADMIN_ROLE without timelock observed in repo. |

## Step 3 — EV

P(finding) = 0.12 (HIGH overlap, DC-12 missing-staleness is high-confidence; Doctrine #29 absence opens multiple sub-findings) × $1M cap × P(acc) = 0.5 × overlap_mult = 1.0 → **EV ~$60K**.

Re-rank vs Day 27 morning: was EV-tied #2 with Balancer at $50K. Upgraded to **$60K** after DC-12 confirmation. Still ranked below Balancer B-1 (under PoC) per "in-flight finding > new Gate 1" rule.

## Step 4 — Queue decision

**Gate 2 candidate, ranked HIGH** — but DEFER actual Gate 2 dispatch until Balancer B-1 PoC resolution. Three candidates below paste-ready:

---

## Top Gate 2 Candidates

### G2-CAND-1 — Chainlink PoR feed staleness check missing [HIGH severity expected, HIGH confidence]

- **File**: contracts/StaderOracle.sol:737-743 (`getPORFeedData`)
- **Lens**: DC-12 monotonic-oracle / staleness
- **R8 tag**: [INSPECTED]
- **Attack scenario**: PoR feed (ETHBalancePORFeed or ETHXSupplyPORFeed) freezes due to Chainlink node outage / sequencer downtime / manual pause. `getPORFeedData` returns stale answer but bumps `reportingBlockNumber = block.number`. `updateERFromPORFeed` (line 182-188) is permissionless and triggers `updateWithInLimitER` — if the stale value is still within ±5% of last accepted ER, it goes straight to `_updateExchangeRate` without inspection mode. Stale-but-in-band ER persists across the staleness window. New deposits get over/under shares; withdrawals settle on stale rate. Magnitude scales with PoR outage duration.
- **Paste-ready feasibility**: HIGH. Foundry PoC requires mocking AggregatorV3Interface to return constant `(answer, updatedAt)` where updatedAt is N hours old; call `updateERFromPORFeed`; assert ER updates with stale data. ~80 LOC.
- **Bounty hypothesis**: HIGH ($100K) — direct path to user-loss on every deposit/withdraw during staleness window. CRITICAL ($1M) plausible if combined with concurrent oracle manipulation showing scaled user loss > $1M attack surface.

### G2-CAND-2 — UserWithdrawalManager asymmetric MIN-cap value leak [MEDIUM/HIGH severity, MEDIUM confidence]

- **File**: contracts/UserWithdrawalManager.sol:154-167 (`finalizeUserWithdrawalRequest`)
- **Lens**: Doctrine #29 v1.1 ABSENT + CANDIDATE-O slippage + DC-9 sub-4
- **R8 tag**: [INSPECTED]
- **Attack scenario**: User requests withdraw of X ETHx → contract locks X shares + records `ethExpected = X * rate_t0`. Validator slashing/oracle-update lowers rate to rate_t1 < rate_t0. At finalize: ETH transferred = `min(ethExpected, X * rate_t1 / decimals)` = `X * rate_t1` (the lower). User receives less than ethExpected; protocol keeps the delta. But `ethRequestedForWithdraw` decrements by `ethExpected` (full), so protocol bookkeeping over-counts the outflow vs actual. Inverse case (rate increases): user STILL gets `ethExpected` (the original lower), protocol again keeps the delta. **Asymmetric: protocol always retains the upside on oracle-rate divergence.** Olympus-style "excess to treasury" pattern is absent — the value just stays in the pool, opaque to users.
- **Paste-ready feasibility**: MEDIUM. Foundry PoC requires mock IStaderOracle returning different rates at request vs finalize; assert (a) user receives less than `ethExpected` on rate-decrease, (b) user does NOT receive more than `ethExpected` on rate-increase, (c) `ethRequestedForWithdraw` decrements by stale value. ~120 LOC.
- **Bounty hypothesis**: MEDIUM ($20K). Conceivably HIGH ($100K) if reframed as systematic user-fund-loss exceeding threshold on aggregate-withdrawal scale.

### G2-CAND-3 — Manager.deposit single-source oracle exchange rate [MEDIUM severity, MEDIUM confidence]

- **File**: contracts/StaderStakePoolsManager.sol:289-295 (`_convertToShares`) + line 134-136 (`totalAssets`)
- **Lens**: Doctrine #29 v1.1 ABSENT
- **R8 tag**: [INSPECTED]
- **Attack scenario**: Oracle path-of-trust is consensus-attested (line 169-178 requires `submissionCount >= trustedNodesCount/2 + 1`) — trust-minimized but not trust-free. If trusted-node threshold colludes OR PoR feed mode is active (toggle line 614 by manager) and the feed is manipulated, inflated `totalETHBalance` directly inflates `shares_minted = assets * supply / totalAssets`. Inverse-deflated supply has the same effect. No market-rate sanity check (no Curve/Uniswap ETHx pool reference, no rate-provider snapshot) — the protocol entirely trusts its own oracle.
- **Paste-ready feasibility**: MEDIUM. Foundry PoC = mock oracle, show share-inflation under manipulated `totalETHBalance`. ~90 LOC.
- **Bounty hypothesis**: MEDIUM ($20K) — requires oracle-trust assumption violation. Triagers may dismiss as "out of trust model" unless paired with G2-CAND-1 (PoR-mode staleness gives the manipulation primitive).

### G2-CAND-4 — Permissionless trigger on excess-ETH deposit [LOW/MEDIUM, MEDIUM confidence]

- **File**: contracts/StaderStakePoolsManager.sol:233-264 (`depositETHOverTargetWeight`)
- **Lens**: CANDIDATE-J + 5-Target External-Calls
- **R8 tag**: [INSPECTED]
- **Attack scenario**: Permissionless function with cooldown (`excessETHDepositCoolDown` default 3×7200 ≈ 1 day). Anyone can trigger pool allocation to `IStaderPoolBase(poolAddress).stakeUserETHToBeaconChain{ value: ... }()`. Pool address resolved via `poolUtils.poolAddressById(poolIdArray[i])` — if PoolSelector logic is gameable or PoolUtils admin can rotate poolAddressById to attacker-controlled stub at the moment of call, ETH siphons to attacker pool. Needs deeper PoolSelector/PoolUtils review. Not paste-ready at Gate 1; queued as Gate 2.5.
- **Paste-ready feasibility**: LOW at Gate 1. Requires full PoolSelector + PoolUtils + node-registry trace.
- **Bounty hypothesis**: HIGH if found, but speculative.

### G2-CAND-5 — Withdraw-request DoS via maxNonRedeemedUserRequestCount [LOW, HIGH confidence]

- **File**: contracts/UserWithdrawalManager.sol:121-123 + 225-241 (`deleteRequestId`)
- **Lens**: 5-Target Withdrawals + linear-scan DoS
- **R8 tag**: [INSPECTED]
- **Attack scenario**: `requestIdsByUserAddress[_owner]` grows up to `maxNonRedeemedUserRequestCount = 1000`. `deleteRequestId` is O(N) linear scan. User with 1000 outstanding requests pays gradually-quadratic gas to claim. Likely Out-of-scope (operator-set limit), no fund loss — informational only.
- **Bounty hypothesis**: Out-of-scope.

---

## Veda-OOS pre-flight scope-check

ETHx repo only — all reads confined to `contracts/` excluding `interfaces/`. **OUT-OF-SCOPE adjacents** explicitly NOT touched: stader-node (Go infra), ethcli-ui (Go UI), ETHx_Haven1 (separate L1 deployment), ethx_oft (LayerZero OFT — separate program if any), MaticX/BNB repos (separate Stader products). No SDK/frontend reads.

## Bytecode-verify prep (Step 5.3)

Plan for Gate 2:

```bash
# StaderStakePoolsManager proxy (Ethereum mainnet)
cast code 0xcf5EA1b38380f6aF39068375516Daf40Ed70D299 --rpc-url $ETH_RPC
# StaderOracle proxy
cast code 0xF64bAe65f6f2a5277571143A24FaaFDFC0C2a737 --rpc-url $ETH_RPC
# UserWithdrawalManager proxy
cast code 0x9F0491B32DBce587c50c4C43AB303b06478193A7 --rpc-url $ETH_RPC
# ETHx token
cast code 0xA35b1B31Ce002FBF2058D22F30f95D405200A15b --rpc-url $ETH_RPC
```
(Addresses per Stader gitbook — verify against on-chain implementation slot before Gate 2 PoC.)

## Known issues / disclosed findings dedup

No accessible Immunefi disclosed-findings list for staderforeth at intake. Halborn / Sigma Prime / ChainSafe audit reports not in repo. **Pre-Gate-2 task**: cross-reference public Stader audit PDFs (likely on staderlabs.com or gitbook) to dedup before submission. DC-12 staleness in particular is a high-likelihood prior-finding candidate; confirm-or-eliminate before paste-ready.

## Recommended next-action

1. **HOLD** Gate 2 dispatch until Balancer B-1 PoC lands. EV-rank stays #2.
2. **When dispatched**: G2-CAND-1 (DC-12 PoR staleness) is the strongest paste-ready — start there.
3. **Pre-dispatch**: WebFetch Halborn/Sigma Prime/ChainSafe audit PDFs to dedup G2-CAND-1 + G2-CAND-2. If DC-12 staleness already flagged in any prior audit → drop G2-CAND-1, pivot to G2-CAND-2.
4. **Brain compounds queued** (5 items):
   - Watchlist-Candidate-Crossmap.md row 48: add Gate-1-result column update for Stader → Doctrine #29 ABSENT, DC-12 HIT, CANDIDATE-O HIT
   - hunts/intake-log.md: log line
   - Doctrine #29 v1.1: Stader = second NEGATIVE-anchor (LST that lacks the defense)
   - Open-Questions-Tracker.md (v1.3 if Pancake landed v1.2 ahead): Q-36 "Stader trusted-node colluding-threshold gameability under PoR-mode toggle"
   - brain/External-Frameworks.md or audits-library/: queue Stader Halborn/Sigma Prime/ChainSafe PDF ingestion before Gate 2

---

## Evidence-grade legend (R8)

- **[EXECUTED]** — bytecode verified, PoC run, on-chain confirmed
- **[INSPECTED]** — source code read + logic traced, NOT run
- **[ASSUMED]** — inferred from architecture / surrounding context

All claims in this Gate 1 are **[INSPECTED]** — no bytecode verification performed at this depth. Bytecode-verify queued for Gate 2 dispatch per Step 5.3.

---

_Hunt: 2026-05-27-stader-ethx-immunefi-gate1 | autonomous subagent dispatch | Standing-Intake Protocol v1.0 | Disk 85% → 85% (no change, 4.4M clone)_
