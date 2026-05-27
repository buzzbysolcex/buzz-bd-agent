# Gains Network (gTrade) — Immunefi Gate 1

**Date:** 2026-05-27 21:48-21:57 UTC
**Operator dispatch:** Day 27 Gate 1 — full Standing-Intake with Day-27 brain compounds primed (Doctrine #27 Corollary B BOTH anchors, Doctrine #27 #27c == Doctrine #37 frozen-substrate, Doctrine #34 sub-class b, Doctrine #36 substrate-coverage gate, Doctrine #38 pass-through wrapper FORECLOSE, DC-9 sub-2 OPERATIONAL multisig probe).
**Target:** Gains Network / gTrade
**Platform:** Immunefi (`https://immunefi.com/bug-bounty/gainsnetwork/`)
**Substrate:** Solidity perp DEX — ERC4626-style vault + Chainlink-driven epoch PnL feed
**Chains:** Arbitrum + Polygon (in scope) — primary focus Arbitrum (impl Sourcify-verified)
**Lens stack at intake:** Doctrine #29 v1.1 two-sided MIN-cap, CANDIDATE-I (ERC4626 first-depositor), DC-12 (oracle staleness), CANDIDATE-O (multi-leg slippage), CANDIDATE-D (state-machine), CANDIDATE-K (state-not-invalidated), DC-7 (validating vs consuming field), Doctrine #34 sub-class b (post-audit composition), DC-9 sub-2 OPERATIONAL pre-flight, Doctrine #37/#38 frozen + pass-through pre-checks

---

## VERDICT (TOP)

**FORECLOSE — Audited-and-Frozen Substrate with Robust Defense-in-Depth + Narrow Surface for Day-27 Lens Stack.**

**EV pre-saturation:** $200K × 0.08 P(finding) × 0.5 P(acceptance) × 1.0 overlap = **$8,000**
**EV post-saturation (Doctrine #27 + Doctrine #37 B-class + DC-9 sub-2 defense found):** **~$1,200** (0.15× discount)

**Below silo-v2 foreclosure floor (~$3K).** No Gate 2 dispatch. Brain compound: confirms **Doctrine #37 Sub-Type B 2nd-class candidate** (audited-and-frozen-but-product-live, branch-pinned scope, OZ TimelockController + 2-of-4 Safe defense-in-depth, ERC4626 with CUSTOM share-pricing override that voids CANDIDATE-I).

---

## STEP 0 — Prior-Corpus Lookup + Step 0.5 Short-Circuit

```
$ grep -ril "gainsnetwork|gains.network|gtrade" hunts/ brain/
```

- **hunts/**: NO matching files. False positives on "GNS" symbol or "27c" hex string ruled out by full-word grep.
- **brain/Watchlist-Candidate-Crossmap.md:46**: row 17 — "Gains Network | Arb + Base + Polygon | $14M | $200K | Derivatives | H/–/M/–/L | NET-NEW | priority 16"
- **brain/Patterns-Defense-Classes.md / Doctrine.md**: no prior anchor entries naming Gains Network or gTrade

**Step 0.5 verdict: NOT a DEDUP-FORECLOSURE case.** Fresh Gate 1 dispatch proceeds. [INSPECTED]

---

## STEP 1 — PROFILE (LIVE)

| Field | Value | Source |
|---|---|---|
| Platform | Immunefi | Page header [EXECUTED] |
| Program status | **ACTIVE** (Live since 10 Mar 2022, last updated 29 Jan 2026) | Page header [EXECUTED] |
| Critical SC cap | **$25K-$200K** | Bounty table [EXECUTED] |
| High SC cap | $10K-$25K | Bounty table |
| Medium SC cap | $10K flat | Bounty table |
| Low SC cap | $2.5K flat | Bounty table |
| Web/App Critical cap | $40K flat | Bounty table |
| KYC | **NO** ("No KYC information is required for payout processing") | Information page [EXECUTED] |
| Total paid lifetime | **$364.2K** | Information page [EXECUTED] |
| Total in-scope assets | 27 | Page header [INSPECTED] |
| PoC requirement | "Proof of concept is always required for all severities" | Page text [INSPECTED] |
| GitHub repo links in scope | NONE (no canonical contracts repo published) | [INSPECTED] |
| Source-verification status | Arbitrum scope contracts SOURCIFY-VERIFIED (proxy + impl) | Sourcify v2 API [EXECUTED] |

### In-scope contract addresses (12 visible of 27 — Immunefi page truncation)

| Chain | Contract | Address | Added |
|---|---|---|---|
| Polygon | GainsNetworkToken | 0xE5417Af564e4bFDA1c483642db72007871397896 | 2022-05-10 |
| Arbitrum | GainsNetworkToken | 0x18c11FD286C5EC11c3b683Caa813B77f5163A122 | 2023-01-06 |
| Polygon | GFarm2Token | 0x7075cAB6bCCA06613e2d071bd918D1a0241379E2 | 2022-05-10 |
| Ethereum | GFarmToken | 0x831091da075665168e01898c6dac004a867f1e1b | 2023-01-06 |
| Polygon | ERC20Bridge | 0xDF774A4F3EA5095535f5B8f5b9149caF90FF75Bd | 2023-01-06 |
| Arbitrum | ERC20Bridge | 0x01cAaaA682Ceba8cd6c02f93BB1393fB415fA5e2 | 2023-01-06 |
| Polygon | ERC721LockingBridge | 0xa33f7069f075A54481868e4C0b8D26925A218362 | 2023-01-06 |
| Arbitrum | ERC721MintingBridge | 0x0F9E4375facBeB90DAA850f677819b438ce50827 | 2023-01-06 |
| Polygon | GToken | 0x91993f2101cc758D0dEB7279d41e880F7dEFe827 | 2023-01-06 |
| **Arbitrum** | **GToken** | **0xd85E038593d7A098614721EaE955EC2022B9B91B** | 2023-01-06 |
| Polygon | GTokenOpenPnlFeed | 0x8d687276543b92819F2f2B5C3faad4AD27F4440c | 2023-01-06 |
| **Arbitrum** | **GTokenOpenPnlFeed** | **0x990BA9Edd8a9615A23E4c452E63A80e519A4a23D** | 2023-01-06 |

15 additional contracts not enumerable from public Immunefi page (truncated). Likely candidates: TradingDiamond / TradingStorage / PairsStorage / Triggers / BorrowingFees / MultiCollatDiamond / additional bridges.

### Critical out-of-scope clauses (verbatim)

1. "Incorrect data supplied by **third party oracles** (Not to exclude oracle manipulation/flash loan attacks)" — narrows DC-12 surface to manipulation-not-staleness
2. **"Impacts involving centralization risks"** — caps DC-9 sub-2 admin-mutation surface
3. "Lack of liquidity impacts" — caps trade-execution surface
4. "Impacts caused by attacks requiring access to privileged addresses (including, but not limited to: governance and strategist contracts)" — narrows DC-3 + DC-9 family

### Platform STATUS preflight (Cap-Sherlock-anchor rule)

**ACTIVE.** "Live since 10 March 2022, Last Updated 29 January 2026." Confirmed payer ($364.2K lifetime). No FINISHED-platform pivot needed. [EXECUTED]

---

## STEP 2 — BRAIN OVERLAP SCORE

| Lens | Substrate fit | Verdict |
|---|---|---|
| Doctrine #29 v1.1 two-sided MIN-cap | GToken has `_convertToShares`/`_convertToAssets` that use STORED `shareToAssetsPrice`, not `totalAssets/totalSupply` ratio — NOT Balancer-style oracle-vs-pool MIN-cap substrate | **NO FIT** |
| CANDIDATE-I (ERC4626 first-depositor inflation) | `_convertToShares` uses `assets.mulDiv(PRECISION_18, shareToAssetsPrice, rounding)` — `shareToAssetsPrice` is initialized to `PRECISION_18` on init, then mutated only via `updateShareToAssetsPrice()` (depends on `accPnlPerTokenUsed` + `accRewardsPerToken`). Direct ERC20 transfer to vault does NOT affect `shareToAssetsPrice`. First-depositor cannot inflate the share price by donating tokens. | **NEGATED** at primitive-grep level |
| DC-12 (oracle staleness on `latestRoundData`) | GToken: zero `latestRoundData` calls. Oracle flow is request-based via Chainlink `ChainlinkClient.fulfill` callback in PnlFeed (NOT pushed-feed-with-`updatedAt`). Pendle-class structural negation (Doctrine #34 Sub-Rule 34.1 echo). | **NO FIT** (substrate not push-feed) |
| CANDIDATE-O (multi-leg slippage composition) | gToken does NOT execute multi-leg swaps — vault is counterparty to trades, not router | **NO FIT** |
| CANDIDATE-D (state-machine cooldown/transition) | `currentEpoch` + `withdrawRequests[owner][unlockEpoch]` + `nextEpochValuesRequestCount` form an epoch state machine. Withdraw requires 1-3 epoch lock (`WITHDRAW_EPOCHS_LOCKS = [3,2,1]` based on collat tier). Transitions in `updateAccPnlPerTokenUsed` and `tryNewOpenPnlRequestOrEpoch`. POTENTIAL surface. | **MEDIUM FIT** |
| CANDIDATE-K (state-not-invalidated across cross-call) | `requestIds[requestId]` mapping is deleted on fulfill (l293); `requestAnswers[reqId]` deleted when `answers.length == minAnswers` (l327); `requests[reqId].active=false` on completion. Good invalidation discipline. | **WEAK FIT** (invalidation present) |
| DC-7 (Validating-Field ≠ Consuming-Field) | `_executeDiscountAndLock` validates `lockDuration` via `_validDiscount` modifier (uses `MIN_LOCK_DURATION` + `MAX_LOCK_DURATION`); consuming function `lockDiscountP` consumes same `lockDuration` — no field divergence. `makeWithdrawRequest`: validates `shares` against `balanceOf - totalSharesBeingWithdrawn`; consuming function `withdraw` consumes from `withdrawRequests[owner][currentEpoch]` — field is `currentEpoch` but validation was on `currentEpoch + withdrawEpochsTimelock()` (unlockEpoch). MUST VERIFY field convergence in time. | **WEAK FIT — verify** |
| Doctrine #34 sub-class b (post-audit composition) | GToken v6.3 PnlFeed compiler 0.8.17 (frozen) + GToken impl compiler 0.8.23 (newer) — cross-version composition substrate. PnlFeed unchanged since v6.3 era, GToken got `reinitializer(3)` upgrades. | **MEDIUM FIT** |
| DC-9 sub-2 OPERATIONAL (multisig probe) | Owner = OZ TimelockController 14d; Manager = OZ TimelockController 3d; Admin = Gnosis Safe 2-of-4 (no timelock, emergency-only). | **OPERATIONAL DEFENSE PRESENT** (defense found at probe stage) |
| Doctrine #36 (substrate-coverage gate) | Solidity substrate fully covered by Buzz detector pack | **DOES NOT FIRE** |
| Doctrine #37 Sub-Type A (frozen scope + SHA-pinned) | Immunefi page does not show SHA-pin (no commit hash visible) | **NO FIT** |
| Doctrine #37 Sub-Type B (frozen scope + product-live) | Scope contracts added 2023-01-06 (~3.4 years ago), no GitHub repo published, GToken impl re-verified 2024-08-08 = ACTIVE evolution; gTrade product actively live on Arbitrum + Polygon | **FIT — 2nd B-class anchor candidate** |
| Doctrine #38 (pass-through wrapper FORECLOSE) | GToken is NOT a pass-through wrapper — it executes substantial local logic (vault accounting, share-pricing, epoch transitions, PnL flow control). Doctrine #38 does NOT auto-fire. | **DOES NOT FIRE (good)** |
| Doctrine #27 Corollary B (remediation-language search) | No audit PDFs publicly available, no canonical GitHub source repo → standard PDF-channel grep unavailable. In-source channel (git log) also unavailable (no source repo). | **CHANNEL BLOCKED — see Phase 0 below** |

### Brain Overlap Score: **MEDIUM**

- 2 medium-fit lenses (CANDIDATE-D state-machine, Doctrine #34 sub-class b composition delta)
- 2 weak-fit lenses (CANDIDATE-K verification, DC-7 verification)
- 6 lenses NEGATED at primitive-grep level (CANDIDATE-I, DC-12, Doctrine #29, CANDIDATE-O, Doctrine #36, Doctrine #38)
- 1 OPERATIONAL DEFENSE found (DC-9 sub-2 pre-flight: OZ TimelockController 14d + 3d governance)
- 1 channel-blocked (Doctrine #27 Corollary B — no audit PDFs published)

Score = MEDIUM-LEAN-LOW. The lens-hits that DO survive primitive-grep are the weakest in the Day-27 stack (composition + state-machine), not the strongest (CANDIDATE-I + DC-12 share-accounting + oracle-staleness).

---

## STEP 3 — EV CALCULATION

```
P(finding) = 0.08   (MEDIUM overlap, 2 medium-fit lenses, 6 negated, $364K lifetime payout = mature triage discipline)
bounty_cap = $200K Critical
P(acceptance) = 0.50   (established payer, OOS clauses narrow but reasonable)
brain_overlap_multiplier = 1.0   (no lens dominates so apply base)

EV_pre_saturation = 0.08 × 200,000 × 0.50 × 1.0 = $8,000
```

### Saturation discount (compound)

1. **Doctrine #27 baseline** — established Immunefi payer 3+ years live, OOS clauses narrow oracle-manipulation/centralization. No public audit count available, but the no-known-exploits-since-2022 operational record + $364K lifetime payouts implies **mature triage and prior bug clearance**. Apply 0.50× standard discount.
2. **Doctrine #37 Sub-Type B fit** — substrate is audited-and-frozen-but-product-live. Composition lens IS the high-EV angle (per Doctrine #37 B-class rule). EV multiplier from composition surface NOT additional — base 0.08 P(finding) already weighted for surface MEDIUM.
3. **DC-9 sub-2 OPERATIONAL defense found** — 14d + 3d OZ TimelockController on owner/manager mutation paths neutralizes the entire DC-9 family for parameter-mutation surface. Admin (2-of-4 Safe) has narrow emergency-only scope (`resetNextEpochValueRequests`, `updateAdmin`). Apply 0.50× compound.
4. **No CANDIDATE-I + No DC-12** — two of the strongest Day-27 lenses negated at primitive-grep. Lens-stack value compressed. Apply 0.60× compound.

```
Cumulative discount = 0.50 × 0.50 × 0.60 = 0.15×
EV_post_saturation = $8,000 × 0.15 = $1,200
```

**$1,200 is BELOW silo-v2 foreclosure floor (~$3K).**

---

## STEP 4 — QUEUE DECISION

Per Standing-Intake Protocol Step 4 decision table:

| Overlap | Cap | Recommended action |
|---|---|---|
| MEDIUM | <$500K | **Watchlist add — defer, monitor for scope expansion** |

But EV post-saturation $1,200 is below foreclosure floor → **FORECLOSE, do not queue for Gate 2.**

Reactivation triggers:
- Immunefi scope expansion to TradingDiamond / TradingStorage / Triggers (15 additional unenumerated contracts)
- New brain lens that fires on epoch-state-machine surface (CANDIDATE-D refinement)
- Scope SHA pin to a specific commit (would shift to Doctrine #37 Sub-Type A territory)
- Public audit-report drop → enables Doctrine #27 Corollary B Phase 0 dedup with actual remediation-verb grep

---

## STEP 5 — GATE 1 EXECUTION (PARTIAL — for foreclosure receipt)

### Step 5.1 — Clone scope repos

**No public canonical contracts repo.** GainsNetwork-org org has 17 public repos, all TypeScript/JavaScript/Go (sdk, trading-sdk, subgraphs, DefiLlama-Adapters, dimension-adapters, etc.). **Zero Solidity repos.**

**Pivot: Source obtained via Sourcify** (verified contracts). GToken impl `0xeb754588...` at compiler 0.8.23 with 33 source files including `contracts/core/GToken.sol`, `contracts/v6.3/GTokenOpenPnlFeed.sol`, supporting interfaces, libraries. PnlFeed `0x990BA9...` at compiler 0.8.17 with 16 source files. [EXECUTED]

### Step 5.2 — Pre-flight scope-check

| Address | Chain | Source verified? | Type |
|---|---|---|---|
| 0xd85E0385...91B (GToken Arb) | Arbitrum | ✅ Sourcify exact_match 2024-08-08 | OZ TransparentUpgradeableProxy → impl 0xeb754588... |
| 0xeb754588... (GToken impl) | Arbitrum | ✅ Sourcify full_match | ERC4626Upgradeable, OwnableUpgradeable, 920 LOC |
| 0x990BA9ED...23D (PnlFeed Arb) | Arbitrum | ✅ Sourcify verified | NOT a proxy, direct ChainlinkClient consumer |

EIP-1967 implementation slot probe (`eth_getStorageAt slot 0x3608...382bbc`):
- GToken Arb proxy → impl `0xeb754588eff264793bb80be65866d11bc8d6cbdd`
- PnlFeed Arb impl slot = `0x0` (not a proxy) [EXECUTED]

All probed addresses IN SCOPE per Immunefi page.

### Step 5.3 — Bytecode-verify prep

Bytecode-verify NOT executed at Gate 1 (Sourcify exact_match = sufficient evidence-grade for source-vs-deployed match). Defer to Gate 2 if any candidate survives to Foundry stage. Sourcify exact_match timestamp 2024-08-08 = same-day verification of both Arbitrum scope contracts → strong signal of coordinated deploy/verify pipeline. [EXECUTED]

### Step 5.4 — Inventory

| Module | LOC | Key entry points |
|---|---|---|
| GToken (impl, contracts/core/) | 920 | `deposit/mint/withdraw/redeem` (ERC4626), `makeWithdrawRequest/cancelWithdrawRequest`, `depositWithDiscountAndLock/mintWithDiscountAndLock/unlockDeposit`, `distributeReward`, `sendAssets/receiveAssets` (pnlHandler-only), `deplete/refill` (GNS mint/burn), `updateAccPnlPerTokenUsed` (PnlFeed-only), 20+ admin/manager/owner setters |
| GTokenOpenPnlFeed (contracts/v6.3/) | 400 | `newOpenPnlRequestOrEpoch` (gToken-callable), `fulfill` (Chainlink-callback-only), `forceNewEpoch` (anyone-callable safety), `resetNextEpochValueRequests` (admin-only emergency), 8+ owner/manager setters |
| Libraries (ChainUtils, CollateralUtils, TokenTransferUtils) | ~80 | Native-token wrap/unwrap, collateral precision helpers |

### Step 5.5 — Apply ALL brain lenses with primitive-grep verification (Doctrine #30)

#### Lens 1 — CANDIDATE-I (ERC4626 first-depositor inflation)

**Primitive-grep:** `mulDiv` + `totalSupply()` + `asset()` + `_convertToShares`/`_convertToAssets`

Result: `_convertToShares` returns `assets.mulDiv(PRECISION_18, shareToAssetsPrice, rounding)` — **NOT** the standard ERC4626 `assets * totalSupply() / totalAssets()` formula. The vault uses a stored `shareToAssetsPrice` variable initialized to `PRECISION_18` on init, mutated only via `updateShareToAssetsPrice()` (computed from `accPnlPerTokenUsed` + `accRewardsPerToken`). [EXECUTED via Sourcify source read]

**Verdict: NEGATED.** Direct token transfer to the vault does NOT inflate share price. The CANDIDATE-I substrate (ratio-based share accounting) is structurally absent. The `_executeDiscountAndLock` and `unlockDeposit` paths DO compute against `totalSupply()` for `accPnlDelta`, but those mutate `accPnlPerToken`/`accPnlPerTokenUsed`, not `shareToAssetsPrice` directly via deposit-time arithmetic. **No first-depositor surface.** [INSPECTED]

#### Lens 2 — DC-12 (oracle staleness on `latestRoundData`)

**Primitive-grep:** `latestRoundData|updatedAt|stalenessThreshold` across all source files

Result: **Zero matches.** [EXECUTED]

The Chainlink integration uses `ChainlinkClient.fulfill` (request/response callback pattern), not the push-feed `AggregatorV3Interface.latestRoundData()` pattern. PnL aggregation is via custom median-of-medians over 4 sequential request cycles, then averaged. **No DC-12 syntactic shape exists.** [INSPECTED]

#### Lens 3 — Doctrine #29 v1.1 two-sided MIN-cap

**Primitive-grep:** `min\(oracle|min\(pool|VaultReentrancyLib|ensureNotInVaultContext`

Result: **Zero matches.** Vault is NOT a Balancer-LP-receipt-token consumer. Share price is internal-PnL-driven, not pool-oracle-driven. **Substrate mismatch.** [EXECUTED]

#### Lens 4 — CANDIDATE-D (state-machine cooldown/transition)

**Substrate present.** Epoch state machine:
- `currentEpoch` (incremented in `updateAccPnlPerTokenUsed` only, by PnlFeed only)
- `currentEpochStart` (set when `currentEpoch++`)
- `withdrawRequests[owner][unlockEpoch]` (lock window `withdrawEpochsTimelock()` = 1-3 epochs based on collat tier)
- `nextEpochValuesRequestCount` (PnlFeed; gates `maxRedeem` and `makeWithdrawRequest`)
- `nextEpochValues[]` (PnlFeed; reset on `resetNextEpochValueRequests` admin-only OR on `startNewEpoch` completion)

**Potential angles:**
1. **Withdraw-window vs new-epoch race** — `makeWithdrawRequest` reverts when `openTradesPnlFeed.nextEpochValuesRequestCount() > 0` (epoch transition in progress). But `withdraw`/`redeem` can still execute against existing `withdrawRequests[owner][currentEpoch]` while a new epoch is being computed (`maxRedeem` checks `nextEpochValuesRequestCount == 0`). Could a user withdraw BEFORE `accPnlPerTokenUsed` updates, getting old `shareToAssetsPrice`, then re-deposit at new lower price? **NO** — `updateAccPnlPerTokenUsed` increments `currentEpoch`, so `withdrawRequests[owner][currentEpoch]` becomes stale; withdraw window is locked to the OLD epoch. User must call `makeWithdrawRequest` AGAIN with the new `currentEpoch + unlockEpoch`. Net effect: user IS exposed to delta within their pre-locked window, but that's the designed behavior (vault is counterparty to PnL). **Designed, not bug.** [INSPECTED]

2. **`forceNewEpoch` anyone-callable + epoch-start manipulation** — anyone can call `forceNewEpoch()` after `requestsStart + requestsEvery * requestsCount` elapsed. This triggers `startNewEpoch` which uses `int(currentEpochPositiveOpenPnl)` (carry-over) as the new PnL — NOT a fresh oracle aggregation. **Designed safety fallback** if oracles fail to respond. Could a withdrawer DOS the oracle response window via gas grief or front-running fulfill calls to force `nextEpochValues.length < requestsCount`, then force-epoch with stale carry-over? The carry-over is the SAME as the prior epoch positive open PnL — neutral economic effect, no manipulation surface. [INSPECTED]

3. **`scaleVariables` deposit-time / withdraw-time `accPnlPerToken` reset** — `scaleVariables` re-scales `accPnlPerToken` proportional to `supply` change on deposit/withdraw. This is the per-share-PnL adjustment. Could a user time their deposit to absorb a profit-shock at a favorable scale, or withdraw to dodge a loss-scale-up? Loss case (`accPnlPerToken < 0`): `accPnlPerToken *= supply / (supply + shares)` — depositors REDUCE the per-share loss-share for everyone. Withdrawers in loss state INCREASE per-share loss for remainers. This is correctly inverse — deposit-during-loss reduces loss-share, withdraw-during-loss increases loss-share. Profit case (`accPnlPerToken > 0`): tracks `totalLiability` adjustment but does NOT re-scale `accPnlPerToken` (only liability). This asymmetry could be a surface — depositing during profit phase doesn't dilute prior holders' per-share profit. Let me verify... [INSPECTED]

Actually re-reading: in profit case (`accPnlPerToken > 0`), `accPnlPerToken` is NOT scaled, only `totalLiability` adjusts proportional to `(shares * totalLiability) / supply` with `+` for deposit `-` for withdraw. The PROFIT distribution to share holders is captured in `shareToAssetsPrice` via `accPnlPerTokenUsed` (updated only by PnlFeed). So a profit-time deposit at high `shareToAssetsPrice` mints fewer shares (correct), and a profit-time withdraw at high `shareToAssetsPrice` burns fewer shares per asset (correct). No surface. [INSPECTED]

**CANDIDATE-D verdict on this substrate: WEAK FIT, no obvious surface after walkthrough.** [INSPECTED]

#### Lens 5 — CANDIDATE-K (state-not-invalidated)

**Substrate primitive-grep matches:** delete `requestIds[requestId]` (l293), `delete requestAnswers[reqId]` (l327), `requests[reqId].active=false` (l326).

Walkthrough:
- `fulfill` deletes the `requestIds` mapping entry, so the same Chainlink requestId can't be reused.
- `requestAnswers[reqId]` is deleted when `answers.length == minAnswers` (after median computed).
- `requests[reqId].active=false` set in two paths: (a) after median pushed; (b) in `resetNextEpochValueRequests` admin emergency. In path (a), late fulfills emit `RequestValueReceived(isLate=true, ...)` and return early without mutating state. Good. [INSPECTED]

Potential edge: `nextEpochValues` array. On `forceNewEpoch`, `startNewEpoch` runs `delete nextEpochValues` only at the END after `gToken.updateAccPnlPerTokenUsed` completes. If `updateAccPnlPerTokenUsed` reverts (would happen only if `accPnlPerToken + delta > maxAccPnlPerToken` after capping — no, the cap is applied BEFORE the increment, so should not revert), `nextEpochValues` is left intact. But `nextEpochValuesRequestCount` is reset to 0 at the TOP of `startNewEpoch`. If revert → `nextEpochValuesRequestCount=0` but `nextEpochValues` array still has old values → next `newOpenPnlRequestOrEpoch` call starts `firstRequest=true` (because `nextEpochValuesLastRequest=0` is also reset) → makes new request → eventually triggers `startNewEpoch` again with the OLD `nextEpochValues` PLUS new ones. `nextEpochValues.length >= requestsCount` check at l241 could pass prematurely. **POTENTIAL SURFACE** — but only fires if `updateAccPnlPerTokenUsed` reverts, which (as analyzed) it doesn't due to pre-cap. [ASSUMED — would require Foundry to confirm the revert-free path is truly revert-free in all corner cases]

**CANDIDATE-K verdict: WEAK FIT — discovered one [ASSUMED] edge but reachability blocked by pre-cap design.** [ASSUMED]

#### Lens 6 — DC-7 (Validating-Field ≠ Consuming-Field)

**Substrate walkthrough:**

- `makeWithdrawRequest(shares, owner)` validates: `totalSharesBeingWithdrawn(owner) + shares > balanceOf(owner)` revert. Consumes: `withdrawRequests[owner][currentEpoch + withdrawEpochsTimelock()] += shares`. **Validating-field is `owner`'s current `balanceOf`, consuming-field is `withdrawRequests` at a FUTURE epoch.** If the user transfers shares between request-time and unlock-time, `balanceOf(owner)` could drop below the still-locked `withdrawRequests` total. But `transfer`/`transferFrom` are overridden at l404/l412 to revert if `totalSharesBeingWithdrawn(sender) > balanceOf(sender) - amount`. **Defense present.** [INSPECTED]

- `_executeDiscountAndLock(assets, assetsDeposited, ...)` validates: `assets <= assetsDeposited` revert (`NoDiscount`). Consumes both `assets` and `assetsDeposited` in `_deposit` and `assetsDiscount = assets - assetsDeposited`. Field convergence OK. [INSPECTED]

- `unlockDeposit(depositId, receiver)` validates `block.timestamp < d.atTimestamp + d.lockDuration` revert. Consumes `d.shares`, `d.assetsDiscount`, `d.assetsDeposited`. The `accPnlDelta = d.assetsDiscount.mulDiv(precDelta * prec, totalSupply, UP)` consumes CURRENT `totalSupply()` not the supply at lock-time. **POTENTIAL DC-7 surface** — discount was calculated at lock-time based on lock-time `collatP` (which depends on lock-time supply), but unlock-time accPnl delta uses unlock-time supply. The delta-distribution-per-share is on a different supply scale than the discount-grant. If supply drifts significantly between lock and unlock (365d max lock, supply can change dramatically), the per-share PnL adjustment could under- or over-correct.

Walk: at lock-time, user gets X shares for Y assets at discount D = assetsDiscount. At unlock-time, vault must update `accPnlPerToken += X.assetsDiscount * 1e18 / totalSupply_now` — this charges the per-share loss proportional to CURRENT supply. If supply doubled since lock, each share absorbs HALF the loss it would have at lock-time. Equivalent: a user can lock-deposit when supply is low (large per-share discount cost) but the per-share cost is amortized to unlock-time-supply (could be 2-5x larger by 365d). **This is a designed amortization, not a bug** — the discount benefits the depositor; the vault eats the asset shortfall amortized across whoever holds shares at unlock-time. [INSPECTED]

**DC-7 verdict: weak field-drift detected, but designed amortization — no exploit angle.** [INSPECTED]

#### Lens 7 — Doctrine #34 sub-class b (post-audit composition)

**Substrate present:**
- GToken impl compiler 0.8.23 (modern, post-2023)
- PnlFeed compiler 0.8.17 (v6.3 era, frozen since ~2023)
- GToken has `initializeV3` (`reinitializer(3)`) — 3 init versions = 3 upgrade rounds
- Cross-version composition: newer GToken calls `openTradesPnlFeed.call("newOpenPnlRequestOrEpoch()")` against frozen v6.3 PnlFeed

**Phase 0 Vector 5 attempt — commit-diff inspection of audit-fix commits:**

**BLOCKED** — no public GitHub source repo, no `git log` available. Cannot apply Doctrine #27 Corollary B Anchor #2 (Alchemix-style commit-message + docstring self-disclosure) since the canonical repo is not published. [INSPECTED]

**Phase 0 Vector 1 attempt — audit PDF remediation-verb grep:**

**BLOCKED** — no public audit reports linked from Immunefi page, DefiLlama, or docs.gains.trade. The "Audits: Yes" indicator on DefiLlama provides no firm/date metadata. [INSPECTED]

**Doctrine #27 Corollary B status: BOTH CHANNELS BLOCKED.** Cannot run Phase 0 dedup. This forces a higher uncertainty band on EV — could be an under-discount (auditors found the composition surface) OR an over-discount (no one looked).

**Doctrine #34 sub-class b candidate hypothesis (TENTATIVE):** the v6.3 PnlFeed's `forceNewEpoch` carry-over uses `int(currentEpochPositiveOpenPnl)` which is set in v8.23 GToken's `updateAccPnlPerTokenUsed`. Cross-version semantic agreement assumed but not verified. If GToken ever upgrades the meaning of `currentEpochPositiveOpenPnl` (e.g., adds decimal scaling, sign convention change), the frozen PnlFeed's force-epoch path would use the stale semantic. [ASSUMED — requires audit history or full upgrade log to verify]

**Sub-class b verdict: surface present but Phase 0 dedup channels BLOCKED. Cannot escalate without breaking Doctrine #27 Corollary B "Phase 0 commit-diff REQUIRED for sub-class b candidates" rule (sub-class b can't go to Gate 2 without commit-diff scan).**

**Foreclose-by-rule: sub-class b candidate filed under hypothesis-level but NOT proceeded.** [INSPECTED + ASSUMED]

#### Lens 8 — DC-9 sub-2 OPERATIONAL pre-flight (NEW Day 27 rule)

**On-chain probe results [EXECUTED]:**

```
GToken Arb owner() = 0x5f5e4892bab94d94dc57a3edea3c138167c4df0f
  → Sourcify verified: GNSTimelockOwner = OZ TimelockController
  → getMinDelay() = 1,209,600 sec = 14 days

GToken Arb manager() = 0x1632c38cb208df8409753729dbfba5c58626f637
  → Sourcify verified: GNSTimelockManager = OZ TimelockController
  → getMinDelay() = 259,200 sec = 3 days

GToken Arb admin() = 0xe8997c502fcd0729b462fca19a50cf0daea0cab5
  → 342 bytes proxy bytecode (Gnosis Safe proxy)
  → getThreshold() = 2
  → getOwners() = [0x80fd0acc..., 0x211999e5..., 0x727695e7..., 0x52a722bc...] (4 owners)
  → 2-of-4 Safe, no attached timelock
```

**Applying the Day-27 standing rule:**

> "Multisig-with-Threshold ≥3-of-≥5 = Centralization-Accepted soft-foreclose. If threshold/N ratio satisfies 3-of-≥5 → SOFT FORECLOSE; if 1-of-N, EOA, or threshold == 1 → escalate to HIGH-severity DC-9 sub-2 finding."

The admin is **2-of-4** — does NOT meet the 3-of-≥5 soft-foreclose bar, but is NOT 1-of-N / EOA / threshold==1 either. Sits in the **GREY ZONE** of the standing rule.

**Refinement (proposed brain compound below):** the rule's binary classification needs middle-band treatment for 2-of-N where N ≥ 3 paired with NARROW admin surface. The Gains Network admin surface in source is:
- `updateAdmin(address)` — admin self-change (sets new admin)
- `resetNextEpochValueRequests()` — emergency-only PnlFeed: deletes pending Chainlink requests and resets request counter

Both are RECOVERY/SAFETY functions, not value-mutation. Admin CANNOT mint, burn, transfer, change share price, or alter PnL state. The substantive mutation surface (parameter updates, oracle changes, max-discount/lockup changes) ALL route through `onlyManager` (3d timelock) or `onlyOwner` (14d timelock). **2-of-4 Safe on narrow emergency surface + years-clean operational history (live since 2022, $364K paid, no known exploits) = effectively Centralization-Accepted in practice.**

**DC-9 sub-2 OPERATIONAL verdict: DEFENSE PATTERN PRESENT (timelock-routed mutation + narrow admin surface). No DC-9 sub-2 finding.** [EXECUTED — multisig probe; INSPECTED — surface mapping in source]

#### Lens 9 — Doctrine #38 PRE-CHECK (per candidate)

For each candidate hypothesis (CANDIDATE-D state-machine, CANDIDATE-K nextEpochValues residue, Doctrine #34 sub-class b cross-version semantic drift):

- CANDIDATE-D: GToken executes substantial local logic (vault accounting, share-pricing, epoch transitions, PnL flow). **NOT a pass-through wrapper.** Doctrine #38 does NOT fire.
- CANDIDATE-K: PnlFeed executes median/average computation, request lifecycle management, oracle dispatch. **NOT a pass-through wrapper.** Doctrine #38 does NOT fire.
- Doctrine #34 sub-class b: cross-version composition surface, not a wrapper. Doctrine #38 does NOT fire.

**Doctrine #38 PRE-CHECK clean for all candidates.** [INSPECTED]

### Step 5.6 — 5-Target Quality Checklist (MANDATORY, Ogie msg 7519)

1. **Withdrawals / Redemptions (CEI / reentrancy / solvency)** — ✅ MAPPED
   - `_withdraw` burns shares BEFORE `_transferAssets` (correct CEI: state→external)
   - `_transferAssets` handles ERC777/native-token reentrancy via post-burn ordering
   - `withdraw`/`redeem` decrement `withdrawRequests[owner][currentEpoch]` BEFORE `_withdraw` call → no double-spend within epoch
   - `transfer`/`transferFrom` overrides prevent share transfer that would violate withdraw-lock invariant
   - `maxRedeem` gated on `nextEpochValuesRequestCount == 0` (no withdraw during epoch transition)
   - **Surface clean** [INSPECTED]

2. **Liquidation + Oracle (TWAP / staleness / circuit breakers)** — ✅ MAPPED
   - No `latestRoundData` consumers in GToken/PnlFeed
   - PnL feed is request-based (Chainlink ClientCallback), aggregated via median-of-medians over 4 sequential requests
   - `forceNewEpoch` anyone-callable safety after `requestsStart + requestsEvery * requestsCount` elapsed = liveness defense
   - `resetNextEpochValueRequests` admin emergency = halt-the-feed defense
   - No liquidation-of-positions logic in GToken (vault is counterparty, not lender). Liquidation surface is in TradingDiamond (15 unenumerated scope contracts) — **not analyzed here**
   - **In-scope surface clean** [INSPECTED]

3. **Deposit / Mint Shares (invariants / rounding / oracles / state-not-invalidated)** — ✅ MAPPED
   - `_convertToShares` uses stored `shareToAssetsPrice`, not ratio formula → no CANDIDATE-I inflation
   - `_checks` modifier reverts on `shareToAssetsPrice == 0` and `assets/shares == 0`
   - `_executeDiscountAndLock` requires `assets > assetsDeposited` (NoDiscount revert)
   - `maxDeposit`/`maxMint` capped by `currentMaxSupply` when under-collat (`accPnlPerTokenUsed > 0`)
   - `currentMaxSupply` updated via `tryUpdateCurrentMaxSupply` (24h cooldown, max 50% growth)
   - **Surface clean** [INSPECTED]

4. **External Calls (call/delegatecall/hook surfaces)** — ✅ MAPPED
   - Two external calls identified:
     - `gnsPriceProvider.addr.staticcall` for GNS-to-asset price (used ONLY in `deplete`/`refill` — GNS mint/burn path)
     - `address(openTradesPnlFeed).call("newOpenPnlRequestOrEpoch()")` — fault-tolerant, success ignored
   - No `delegatecall`. No upgradeable-hook surfaces. CEI ordering correct in all paths.
   - Token transfers use `SafeERC20Upgradeable` or `TokenTransferUtils` (custom safe-call lib with `MAX_NATIVE_TRANSFER_GAS_LIMIT = 40_000` for native unwrap)
   - **Surface clean** [INSPECTED]

5. **Admin / Upgrade (timelock / multisig / access control / migration paths)** — ✅ MAPPED
   - Owner = 14d OZ TimelockController (broad mutation)
   - Manager = 3d OZ TimelockController (parameter updates)
   - Admin = 2-of-4 Gnosis Safe (narrow emergency: admin-self-change + PnlFeed-request-reset)
   - Proxy admin (TransparentUpgradeableProxy) → not Sourcify-resolved to specific owner here; standard OZ proxy admin pattern
   - `transferOwnership` blocks new-owner == manager/admin (de-dup)
   - `initializeV3` reinitializer(3) gate = post-deploy migration discipline
   - **Substantial defense-in-depth present** [EXECUTED probe + INSPECTED source]

### Step 5.7 — Check known issues / previous audits

**BLOCKED** — no `audits-library/` entry for Gains Network; no public audit PDFs linked from Immunefi/DefiLlama/docs; rekt.news + Medium search returned NO known exploits. Operational record: $364K lifetime payout via Immunefi + 3+ years live + no public incidents. [INSPECTED]

### Step 5.8 — Output

This file: `hunts/2026-05-27-gainsnetwork-immunefi-gate1.md`

### Step 5.9 — Auto-index via hunt-complete.sh PostToolUse hook

Will trigger on file save via the configured hook.

### Step 5.10 — R8 Calibrated Reporting

All load-bearing claims tagged inline above:
- [EXECUTED] for all on-chain probes (`eth_call`, `eth_getStorageAt`, `eth_getCode`), Sourcify HTTP fetches, primitive-grep counts, multisig threshold/owners reads, timelock minDelay reads
- [INSPECTED] for all source-code walkthroughs (GToken 920 LOC, PnlFeed 400 LOC, surface mappings, lens-by-lens analysis)
- [ASSUMED] for hypothesized cross-version semantic drift surface (Doctrine #34 sub-class b candidate, requires audit history to verify)
- [ASSUMED] for the 2-of-4-Safe "effectively Centralization-Accepted" judgment (refinement of standing rule needed)

---

## STEP 6 — CONTINUOUS UPDATES

- `brain/Watchlist-Candidate-Crossmap.md` row 17 (Gains Network) — already present. **Update to add: GATE 1 COMPLETED 2026-05-27, FORECLOSED EV $1.2K post-saturation. Reactivation triggers: scope SHA pin, scope expansion to 15 unenumerated contracts, public audit drop, or net-new brain lens fire.**
- `hunts/intake-log.md` — append one-line entry: `2026-05-27 | Gains Network | MEDIUM-lean-LOW overlap | EV $1.2K post-saturation | FORECLOSED — D37.B 2nd anchor candidate, DC-9 sub-2 OPERATIONAL defense found`
- `brain/Doctrine.md` Doctrine #37 entry — append candidate 2nd Sub-Type B anchor (Gains Network) pending operator approval for PERMANENT promotion (Doctrine #37 currently CANDIDATE single-anchor per sub-type)
- `brain/Patterns-Defense-Classes.md` DC-9 sub-2 DEFENSE PATTERN entry — add anchor #3 candidate (Gains Network: timelock-routed-mutation-with-narrow-emergency-admin-Safe), pending operator decision

---

## BRAIN COMPOUND PROPOSALS

### Compound 1 — Doctrine #37 Sub-Type B: 2nd anchor (proposed)

**Statement:** Gains Network gTrade satisfies all Doctrine #37 Sub-Type B triggers:
- Scope branch-pinned (no SHA visible on Immunefi page)
- `pushed_at` on canonical contracts repo: N/A (no public canonical repo) → effectively frozen since Sourcify verification 2024-08-08
- Product actively shipping (28-chain expansion roadmap per 2026 Medium roadmap)
- Same proxy contracts on Arbitrum + Polygon (cross-chain deployment of same bytecode)

**Distinct from rhino.fi anchor:** Gains Network does NOT have a canonical-contracts GitHub repo at all (rhino.fi at least has master-branch pinned to a public repo). Gains Network is a stronger "frozen" case because Phase 0 commit-diff dedup is structurally impossible.

**Promotes Doctrine #37 from single-anchor-per-sub-type to 2-anchor-Sub-Type-B.** Combined with CoW (Sub-Type A canonical anchor), Doctrine #37 has 2 sub-type-A candidates (CoW + future) and 2 sub-type-B anchors (rhino.fi + Gains) → eligible for PERMANENT promotion.

**Decision rule refinement:** When NO canonical-contracts repo is published at all (Gains case), Phase 0 Vector 5 (commit-diff inspection) is structurally blocked AND audit-PDF channel typically also blocked. Default action should be EV calculation with HIGH uncertainty band, NOT default-foreclose. Foreclosure here is driven by lens-level negation (CANDIDATE-I + DC-12 + Doctrine #29 all NEGATED at primitive-grep), not by the no-repo signal alone.

**Authority:** This Gate 1 file. Pending operator approval for Doctrine #37 promotion + canonical 2-anchor Sub-Type B status.

### Compound 2 — DC-9 sub-2 DEFENSE PATTERN: anchor #3 candidate (proposed)

**Statement:** Programs where (a) the **broad mutation surface is timelock-gated** (OZ TimelockController or equivalent) AND (b) the **bypass-timelock admin surface is narrow + RECOVERY-only (no value mutation)** AND (c) the bypass-timelock multisig has **threshold ≥2 of ≥4** AND (d) **years-clean operational history (no known exploits)**, the DC-9 sub-2 defense pattern is satisfied in OPERATIONAL form — even if the threshold/N ratio doesn't meet the 3-of-5 standing rule.

**Anchor #3 candidate:** Gains Network (Owner 14d OZ-TLC + Manager 3d OZ-TLC + Admin 2-of-4 Safe with narrow surface + 3+ years live + no known exploits + $364K lifetime payouts via Immunefi).

**Distinct from prior anchors:**
- Anchor #1 (Sky LockstakeMigrator): GOVERNANCE deny on the call-site target (ward-removal)
- Anchor #2 (DeFi Saver): 3-of-6 Safe with no timelock attached (narrower threshold/N ratio than rule, but BROAD admin surface)
- **Anchor #3 (Gains Network): TIMELOCK on broad surface + 2-of-4 Safe on narrow surface = LAYERED defense**

The pattern variation is: **the multisig-N-of-M threshold matters less when the admin surface is structurally narrow.** Refinement to the standing rule: pre-flight check should also map the EXACT admin functions (not just probe threshold). 2-of-4 on narrow surface ≈ 3-of-5 on broad surface in operational risk terms.

**Promotion path:** Anchor #3 strengthens DC-9 sub-2 DEFENSE PATTERN to 3-anchor PERMANENT-PROMOTED status. Refines the standing rule with a "narrow-surface" carve-out.

**Authority:** This Gate 1 file. Pending operator approval.

### Compound 3 — Doctrine #34 sub-class b "channel-blocked" sub-case (proposed)

**Statement:** Doctrine #27 Corollary B currently requires Phase 0 commit-diff inspection (Vector 5) on any Doctrine #34 sub-class b candidate before Gate 2 dispatch. But some programs (Gains Network type) publish NO canonical source repo AND NO audit PDFs — both channels are BLOCKED.

**Refinement proposed:** When BOTH Phase 0 channels are blocked, Doctrine #34 sub-class b candidates remain HYPOTHESIS-level only and DO NOT proceed to Gate 2 dispatch. This is the SAFE default — sub-class b without dedup is high-FP-risk. Foreclose at Gate 1 with note "Phase 0 dual-channel BLOCKED."

**Reactivation trigger:** publication of audit PDFs or canonical source repo.

**Anchor:** this Gate 1 (Gains Network sub-class b candidate left at hypothesis-level due to channel block).

### Compound 4 — Refined "no-canonical-repo" pre-clone classification (proposed)

**Statement:** When a target has NO public canonical-contracts repository (only deployed-bytecode-verified-via-Sourcify), apply at Gate 1 entry:
1. Sourcify-verify ALL in-scope addresses individually (no batch clone path)
2. Doctrine #27 Corollary B Phase 0 = BLOCKED, mark as such, do not block Gate 1 progression
3. Apply 0.30× compound on EV (representing the audit-history uncertainty)
4. Doctrine #34 sub-class b candidates → hypothesis-only, do not proceed to Gate 2

**Anchor:** Gains Network as canonical no-canonical-repo + branch-pinned-scope case. [INSPECTED]

---

## REPORTING SUMMARY

**Verdict:** FORECLOSE — EV post-saturation $1,200 below silo-v2 floor (~$3K)

**Top hypotheses (all FORECLOSED at Gate 1):**
1. **CANDIDATE-K nextEpochValues residue on `updateAccPnlPerTokenUsed` revert** [ASSUMED] — reachability blocked by pre-cap design. Would need Foundry to disprove.
2. **Doctrine #34 sub-class b cross-version semantic drift (GToken 0.8.23 ↔ PnlFeed 0.8.17 on `currentEpochPositiveOpenPnl` semantic)** [ASSUMED] — Phase 0 dual-channel BLOCKED, sub-class b rule defaults to hypothesis-only.
3. **DC-7 lock-time-supply vs unlock-time-supply discount amortization** [INSPECTED] — designed amortization, not bug.

**Phase 0 dedup outcome:**
- PDF channel: BLOCKED (no public audit reports linked)
- In-source channel: BLOCKED (no public canonical contracts repo)
- rekt.news + Medium search: NO known exploits since 2022

**DC-9 sub-2 OPERATIONAL multisig probe result:** Owner 14d OZ-TLC + Manager 3d OZ-TLC + Admin 2-of-4 Safe with narrow surface. DEFENSE PATTERN PRESENT (layered timelock + narrow-emergency-Safe).

**Doctrine #38 pre-check per candidate:** All clean (no pass-through wrapper structure).

**Doctrine #34 sub-class b scan:** Cross-version composition surface present (GToken 0.8.23 + PnlFeed 0.8.17 + reinitializer(3) upgrade history); Phase 0 dedup BLOCKED → hypothesis-only.

**File path:** `/home/claude-code/buzz-workspace/hunts/2026-05-27-gainsnetwork-immunefi-gate1.md`

**Saturation tier:** MEDIUM-LEAN-LOW (Doctrine #27 standard 0.50× + Doctrine #37 B-class composition surface + DC-9 sub-2 OPERATIONAL defense found + 2 strongest Day-27 lenses NEGATED at primitive-grep). Cumulative 0.15× discount → EV $1,200.

---

_Gate 1 | 2026-05-27 21:48-21:57 UTC | Gains Network gTrade | Immunefi $200K Critical | FORECLOSED EV $1.2K | Doctrine #37 Sub-Type B 2nd anchor candidate + DC-9 sub-2 anchor #3 candidate filed | Phase 0 dual-channel BLOCKED (no public repo, no public audit PDFs) | Sourcify-verified source obtained for both Arbitrum scope contracts._
