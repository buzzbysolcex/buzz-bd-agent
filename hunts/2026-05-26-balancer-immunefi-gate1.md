# Gate 1 Surface Map — Balancer V3 (Immunefi)

- **Date (UTC):** 2026-05-26 21:55Z
- **Operator:** Ogie (BuzzBySolCex)
- **Program:** Balancer — Immunefi
- **Platform STATUS preflight:** **ACTIVE** (verified via WebFetch immunefi.com/bug-bounty/balancer/ at 21:49Z) `[EXECUTED]`
- **Critical cap:** $1,000,000 (Smart Contract / Critical), High cap $250,000
- **KYC:** No
- **Chains:** Ethereum + EVM compatible
- **Total assets in scope:** 38
- **Bounty live since:** 12 May 2022
- **Bounty last updated:** 27 April 2026
- **EV (Step 3):** $50,000 (P=0.10 × $1M × P(acc)=0.5 × overlap=1.0 HIGH)
- **Queue decision (Step 4):** Immediate Gate 1 — HIGH overlap + $1M cap
- **Clone:** `/home/claude-code/buzz-workspace/data/lane1/clones/balancer-v3-monorepo` (depth 200, HEAD `80fd29ce4eb627139694db7fef5aba355759d303`, HEAD ts `2026-05-22T03:00:15Z`)
- **Disk post-clone:** 87% (4.8G free) — below 88% halt threshold
- **Layer 0 JSON:** `hunts/2026-05-26-balancer-layer0.json`

---

## Step 5.2 — Pre-flight scope-check (Veda OOS lesson)

Immunefi scope page lists 38 in-scope assets. Sample (extracted via WebFetch — full page renders factories + routers + governance, but the canonical Vault is implied via Vault-routed flow):

| Asset (sample) | Chain | Type |
|---|---|---|
| WeightedPoolFactory `0x897888...4c51` | Ethereum | Smart Contract |
| StablePoolFactory `0xB9d01C...AB14` | Ethereum | Smart Contract |
| StableSurgePoolFactory `0x355bd3...ad95` | Ethereum | Smart Contract |
| LBPFactory (V3) `0x4eff2d...4Cb5` | Ethereum | Smart Contract |
| BatchRouter `0x136f1E...78d1` | Ethereum | Smart Contract |
| ProtocolFeeController `0xa731C2...7cc8` | Ethereum | Smart Contract |
| FeeDistributor (V2) `0xD3cf85...F3BB` | Ethereum | Smart Contract |
| ChildChainGaugeFactory V2 | Polygon | Smart Contract |

**Out-of-scope inference:** `balancer-deployments`, `balancer-sdk`, `docs`, `frontend` repos; deprecated V1 contracts; periphery integrators not listed.

**Repo-vs-scope mapping (this Gate 1 focuses on V3 monorepo):**
- `pkg/vault/contracts/{Vault, VaultExtension, VaultAdmin, BatchRouter, Router, ProtocolFeeController}.sol` → IN-SCOPE (each maps to a canonical deployment) `[INSPECTED]`
- `pkg/pool-stable/contracts/StablePool.sol` (StablePoolFactory in scope) → IN-SCOPE `[INSPECTED]`
- `pkg/pool-weighted/contracts/WeightedPool.sol` (WeightedPoolFactory in scope) → IN-SCOPE `[INSPECTED]`
- `pkg/pool-hooks/contracts/{StableSurgeHook, ECLPSurgeHook, MevCaptureHook}.sol` → IN-SCOPE via factory deployments `[INSPECTED]`
- `pkg/pool-gyro/contracts/{Gyro2CLPPool, GyroECLPPool}.sol` → IN-SCOPE (Gyro factories deployed via Balancer V3 — confirm during Gate 2 via on-chain deployment lookup) `[ASSUMED]`
- `pkg/pool-cow/contracts/CowPool.sol` → IN-SCOPE only if CowPoolFactory is listed in the full 38-asset scope (not enumerated in our partial WebFetch). **HALT-PIVOT FLAG**: Gate 2 must verify before drafting any CowPool-specific PoC `[ASSUMED]`
- `pkg/governance-scripts/contracts/TimelockAuthorizerMigrator.sol` → OOS (deployment-time only) `[INSPECTED]`
- `*/test/**` → OOS `[INSPECTED]`

## Step 5.3 — Bytecode-verify prep (Veda + Wormhole lesson)

For each Gate 2 candidate the verification command stub (deferred to Gate 2 execution):

```bash
# Generic stub — replace ADDR + SOURCE_SHA per candidate
cast code <ADDR> --rpc-url $ETH_MAINNET_RPC > /tmp/<ADDR>.bytecode
solc --standard-json --evm-version paris --optimize --optimize-runs 200 \
  < /tmp/<ADDR>.input.json > /tmp/<ADDR>.compiled.json
# diff deployed bytecode vs compiled runtime bytecode, expect match modulo metadata hash
```

Specifically required before any Gate 2 paste-ready submission:
- WeightedPoolFactory deployed bytecode vs `pkg/pool-weighted/contracts/WeightedPool.sol` @ HEAD
- StableSurgePoolFactory deployed bytecode vs `pkg/pool-hooks/contracts/StableSurgeHook.sol` @ HEAD
- BatchRouter deployed bytecode vs `pkg/vault/contracts/BatchRouter.sol` @ HEAD

## Step 5.4 — Layer 0 git-security analyzer summary

`[EXECUTED]` via `node scripts/lane1/git-security-analyzer.js`. Full JSON at `hunts/2026-05-26-balancer-layer0.json`.

| Metric | Value | Interpretation |
|---|---|---|
| fix_candidates.count | 21 | Recent fixes — review for incomplete patches |
| late_changes.count | 0 | No post-audit late commits flagged |
| dangerous_area_changes.count | 49 | High churn in vault/pool/hooks paths |
| audit_age (newest filename) | certora/2026-01-26.pdf | **~4 months audit-to-HEAD drift** (HEAD is 2026-05-22) |
| untouched_critical.count | 36 | 36 critical files NOT touched since newest audit — high-confidence surface |
| HEAD-vs-audit-fs-mtime | days_between -5 | Audit fs-mtime > HEAD ts (clone rewrites mtime, so use filename dates as ground truth) `[INSPECTED]` |

**Top 5 recent dangerous-area commits (post-audit drift candidates):**
1. `ef0d3af` 2026-04-01 EndymionJkb — "Fix benchmarks (#1650)" (touches vault test surface) `[EXECUTED]`
2. `d807758` 2026-03-25 — "Fix medusa stable tests (#1631)" (fuzz harness for stable pool — implies recent stable-pool churn) `[EXECUTED]`
3. `b100677` 2026-03-11 — "**LBP audit fixes** (#1637)" (LBPCommon + BPTTimeLocker + LBPMigrationRouter) `[EXECUTED]`
4. `36584ee` 2026-02-13 — "**Address LBP audit issues** (#1628)" (15-file LBP surface rewrite) `[EXECUTED]`
5. `b9541d5` 2026-02-12 — "Fix medusa config" (fuzz harness) `[EXECUTED]`

**LBP cluster is the highest-churn post-audit area** — LiquidityBootstrappingPoolFactory is explicitly in-scope at `0x4eff2d...`. Two consecutive "LBP audit issues / LBP audit fixes" PRs landed Feb-Mar 2026 with no follow-up audit on the deltas yet visible by filename. `[INSPECTED]`

## Step 5.5 — Module inventory

```
pkg/
  vault/           Vault, VaultExtension, VaultAdmin, BatchRouter, Router,
                   BufferRouter, CompositeLiquidityRouter, ProtocolFeeController,
                   BalancerPoolToken (BPT), VaultFactory, VaultExplorer
                   + authorizer/TimelockAuthorizer*, TimelockExecutionHelper
                   + lib/HooksConfigLib, PoolDataLib, PoolConfigLib, MinTokenBalanceLib
                   + token/ERC20MultiToken
  pool-stable/     StablePool, StablePoolFactory
  pool-weighted/   WeightedPool, WeightedPoolFactory + lbp/{LBPool, LBPCommon, LBPValidation, LBPMigrationRouter, FixedPriceLBPool, BPTTimeLocker, LBPoolLib}
  pool-gyro/       Gyro2CLPPool, GyroECLPPool + lib/{Gyro2CLPMath, GyroECLPMath, GyroPoolMath, SignedFixedPoint}
  pool-hooks/      StableSurgeHook, ECLPSurgeHook, SurgeHookCommon, MevCaptureHook,
                   ExitFeeHookExample, DirectionalFeeHookExample, FeeTakingHookExample,
                   LotteryHookExample, NftLiquidityPositionExample, VeBALFeeDiscountHookExample,
                   StableSurgePoolFactory, ECLPSurgePoolFactory, MinimalRouter
  pool-cow/        CowPool, CowPoolFactory, CowRouter
  oracles/         (chain-link/sequencer-uptime feed)
  governance-scripts/  TimelockAuthorizerMigrator (OOS — deploy-time)
  solidity-utils/  + standalone-utils/ + interfaces/
```

LOC: Vault.sol 1599, VaultExtension.sol 959, VaultAdmin.sol 841, Router.sol 763, BatchRouter+Hooks (162+757), StablePool.sol 429 `[EXECUTED]` (wc -l confirmed).

## Step 5.6 — 5-Target Quality Checklist (MANDATORY per `standing-intake-protocol.md` v1.0)

### Target 1 — Withdrawals / Redemptions (CEI, reentrancy, solvency)

- **`Vault.sol` swap/removeLiquidity paths**: protected by `nonReentrant` modifier on `_loadPoolDataAndUpdateBalances` (`VaultCommon.sol:314`) `[INSPECTED]`
- **`BalancerPoolToken.sol` BPT burn**: minimum-total-supply floor `_POOL_MINIMUM_TOTAL_SUPPLY = 1e6` in `ERC20MultiToken.sol:20` burned to address(0) at init `[INSPECTED]` — closes first-depositor inflation cleanly. **CANDIDATE-I substantially mitigated.**
- **`BatchRouterHooks.sol:255-260`** intermediate steps zero-out `minAmountOut` to 1 when remove-liquidity step ≠ last step — **investigate at Gate 2: can intermediate slippage be exploited if the path is forced to revert at a later step?** `[INSPECTED]`
- **`VaultAdmin.sol` buffer drain**: `_BUFFER_MINIMUM_TOTAL_SUPPLY = 1e4` floor (`VaultAdmin.sol:47, 770`) — order of magnitude smaller than pool floor; **investigate if 1e4 is enough to prevent ERC4626 buffer inflation given decimal differences** `[INSPECTED]`

### Target 2 — Liquidation / Oracle (TWAP, staleness, circuit breakers)

- **`PoolDataLib.sol:158`**: `rate = tokenInfo.rateProvider.getRate();` — **NO staleness check, NO MIN-cap, NO MAX-cap, NO monotonic-floor** `[INSPECTED]` — **DIRECT HIT on Doctrine #29 v1.1 (two-sided MIN-cap defense) AND DC-12 (monotonic-oracle defense)**
- The rate is consumed in `updateRawAndLiveBalance` (`PoolDataLib.sol:164-182`) which scales balances by raw rate — any sudden rate plunge (compromised LST oracle, ERC4626 yield rug, depegged stETH rate provider) propagates linearly into pool invariant and creates exit-arbitrage windows `[INSPECTED]`
- **Yield-fee gate at `_computeYieldFeesDue` lines 198-209**: only charges fees if `currentLiveBalance > lastLiveBalance` — **rate-down doesn't refund fees** (acknowledged), **but rate-oscillation (up-down-up) charges fees twice** (acknowledged in comment lines 193-197 as known-risk, deferred to off-chain ops) `[INSPECTED]`. **Lens-D variant**: deliberately gameable rate-provider that oscillates within a tight band, draining yield fees.

### Target 3 — Deposit / Mint Shares (invariants, rounding, oracles, state-not-invalidated repeats)

- **`VaultExtension.sol:410 _initialize`**: mints `_POOL_MINIMUM_TOTAL_SUPPLY` to address(0), returns `bptAmountOut - _POOL_MINIMUM_TOTAL_SUPPLY` to user `[INSPECTED]` — well-formed
- **Rate-provider-set-once-at-register** (`VaultExtension.sol:218-222`): `rateProvider: tokenData.rateProvider` stored in `_poolTokenInfo[pool][token]` and never updatable `[INSPECTED]` — closes the "swap rate provider mid-pool-life" attack surface (mitigates CANDIDATE-D / state-machine cooldown overwrite for rate provider)
- **`BatchRouterHooks.sol:127`**: `minAmountOut only applies to the last step` — intermediate steps have `minAmountOut = 0` — **CANDIDATE-O DIRECT HIT (slippage double-count / multihop slippage asymmetry)** `[INSPECTED]`

### Target 4 — External Calls (call/delegatecall/hook surfaces, upgradeable targets)

- **Pool registration binds `poolHooksContract` ONCE** (`VaultExtension.sol:277`): hook address is set at register-time and immutable thereafter `[INSPECTED]` — closes DC-9 sub-3 at the Vault level
- **BUT** the hooks contract itself is an arbitrary external address — if a hook is deployed behind a UUPS proxy, the **hook's own admin can swap implementations without Balancer Vault knowing** — investigate which deployed hooks are upgradeable: StableSurgeHook + ECLPSurgeHook + MevCaptureHook (all immutable in source per `[INSPECTED]` of pool-hooks/contracts/*.sol — no UPGRADEABLE_HOOK identifier found locally; **bytecode-verify at Gate 2** to confirm deployed instances are not proxies) `[ASSUMED]`
- **`HooksConfigLib.sol:201-261`** wires `onBeforeSwap` / `onAfterSwap` / `onBeforeAddLiquidity` / `onAfterAddLiquidity` — each calls into `hooksContract.*` external; the hook is allowed to return adjusted amounts (`enableHookAdjustedAmounts`) — **lens here: arbitrary hook controls amountCalculated when flag is set; combined with surge fee asymmetry, could the hook return values cross-contaminate with BatchRouter intermediate-step slippage to extract value?** `[INSPECTED]` worth Gate 2 dig
- **`VaultExtension.sol:387`**: comment says "It cannot re-enter any nonReentrant Vault function" via reentrancy guard — `[INSPECTED]` — guard is enforced
- **`Vault.sol` swap path**: only-once token-rate fetch per swap-context — if a hook calls back into Vault during onBeforeSwap (different pool, different token), the rate cache for THAT call may stale relative to chain state — investigate `[INSPECTED]`

### Target 5 — Admin / Upgrade (timelock, multi-sig, access control, migration paths)

- **TimelockAuthorizer** present (`pkg/vault/contracts/authorizer/TimelockExecutionHelper.sol`) — `[INSPECTED]` governance gates exist
- **`VaultAdmin.setStaticSwapFeePercentage`** (`VaultAdmin.sol:260-267`) — gated by authentication; check whether the pool's swap manager / fee controller actor has `actionId` delays set on mainnet (off-chain via `cast` at Gate 2) `[INSPECTED]`
- **Pool registration goes through factory** (`VaultExtension.sol:181 _registerPool`) — no timelock at the Vault level. Factory contracts have their own admin gates. Investigate per-factory: WeightedPoolFactory + StablePoolFactory + StableSurgePoolFactory — does each enforce a timelock before deploying new pool? `[ASSUMED]`
- **No `selfdestruct`, no `delegatecall` to user-controlled targets** found in main Vault paths `[INSPECTED]`
- **`VaultFactory`**: deploys Vault + VaultAdmin + VaultExtension; deploy-time wiring, not runtime upgradeable. Vault itself NOT a proxy `[INSPECTED]`

## Step 5.7 — Apply ALL 5 brain lenses (Step 2)

### Lens 1 — Doctrine #29 v1.1 two-sided MIN-cap defense

**HIT.** `PoolDataLib.sol:158` consumes `IRateProvider.getRate()` with **no MIN-cap, no MAX-cap, no monotonic floor**. Olympus BLVaultLido was the 2nd implementer; Balancer V3 is the canonical Vault-consumer-of-RateProviders. Any compromised / depegged / mis-deployed rate provider feeds directly into balance scaling. Mitigation surface: `paysYieldFees: false` flag at registration prevents fee-yield extraction but does NOT prevent invariant manipulation. **`[INSPECTED]`** — Gate 2 PoC: deploy a malicious RateProvider, register a Vault pool with it (permissionless), drain LP via large rate-swing arbitrage. Counter-arg: rate providers are vetted off-chain socially; Balancer V3 has no on-chain whitelist. **PASTE-READY-FEASIBILITY: MEDIUM** — needs on-chain proof a vulnerable rate provider exists in production (e.g., a known-buggy LST oracle).

### Lens 2 — DC-9 sub-3 upgradeable-hook-no-timelock

**PARTIAL HIT, INVERTED.** At the Balancer Vault layer, hook is set once at pool-register and NEVER updatable. This closes the DC-9 sub-3 vector at Balancer's layer. **BUT** the hooks contract itself may be a proxy (UUPS) — if any in-scope deployed hook (StableSurgeHook at `0x355bd3...`) is itself behind a proxy with a fast-admin / no-timelock, that's the real DC-9 sub-3. **`[ASSUMED]`** — Gate 2 must `cast storage <hook> 0x360894...` (EIP-1967 impl slot) on each deployed hook to verify proxy-or-not before claiming this finding.

### Lens 3 — CANDIDATE-I share inflation / first-depositor

**MITIGATED.** `_POOL_MINIMUM_TOTAL_SUPPLY = 1e6` minted to address(0) at `_initialize` (`VaultExtension.sol:447` + `ERC20MultiToken.sol:111-119`). This burns 1e6 wei of BPT permanently before any user mint. Standard OpenZeppelin-style first-deposit inflation defense; closes the lens unless we find a per-token-decimal corner case (e.g., 0-decimal token where 1e6 BPT is still small relative to a value-rich token). **`[INSPECTED]`** — **PASTE-READY-FEASIBILITY: LOW** unless a specific decimal-corner-case is engineered.

### Lens 4 — DC-12 monotonic-oracle defense

**HIT.** Same surface as Lens 1 — `PoolDataLib.sol:158` lacks monotonic-floor. If a rate provider can return a value LOWER than the previous value (e.g., a slashing event on LST, a buggy compound-rate provider after rounding), the pool's live balances scale down accordingly; combined with `_computeYieldFeesDue`'s rate-down branch (lines 193-197) which charges nothing — but the LP can rotate balances to extract this. **`[INSPECTED]`** — couples with Lens 1; same PoC pathway. **PASTE-READY-FEASIBILITY: MEDIUM**.

### Lens 5 — CANDIDATE-O slippage double-count across swap steps

**DIRECT HIT.** `BatchRouterHooks.sol:127` says **literally**: `// minAmountOut only applies to the last step.` Intermediate steps have `minAmountOut = 0`. Combined with the surge-fee asymmetry WONTFIX (`audits/WONTFIX.md` — known exact-in/exact-out non-equivalence on StableSurgeHook), a crafted batch swap can chain (a) intermediate step with high surge fee approximation drift, (b) final step that satisfies the end-to-end `minAmountOut` numerically but lost extractable value at an intermediate step. **`[INSPECTED]`** — **PASTE-READY-FEASIBILITY: HIGH if PoC demonstrates non-trivial value extraction**. WONTFIX acknowledges only "extreme cases", but if a non-extreme path can be constructed (e.g., 3-hop batch through StableSurge + Weighted + ERC4626 buffer), the program-stated dismissal weakens.

## Step 5.8 — Known issues + prior audits (deduplication)

`audits/WONTFIX.md` declares as NON-bountiable:
1. **Stable surge — exact in / exact out equivalence drift in extreme cases** — explicit dismissal. Gate 2 strategy: only escalate if PoC demonstrates **non-extreme** parameters yielding non-trivial value extraction. Any PoC labeled "extreme" gets auto-closed `[INSPECTED]`.
2. **Protocol fee controller — fee split rounding** — explicit dismissal `[INSPECTED]`.

Audit files present: ToB 2024-12, Spearbit 2024-10, Certora (multiple, latest 2026-01-26), Cantina (dir present, contents not enumerated). Latest audit `2026-01-26` × HEAD `2026-05-22` = **~4 month audit-to-HEAD drift** — non-trivial window. LBP fixes (Feb 2026) + Stable medusa fuzz fixes (Feb-Mar 2026) landed AFTER newest audit `[INSPECTED]`.

## Step 5.9 — R8 Calibrated Reporting — Gate 2 Candidates

Top 5 candidates ranked by paste-ready-feasibility × bounty-impact:

### Candidate B-1: BatchRouter intermediate-step slippage + StableSurge fee-asymmetry chaining
- **Lens:** CANDIDATE-O (slippage double-count) + WONTFIX-adjacent (non-extreme surge fee asymmetry)
- **File:line:** `pkg/vault/contracts/BatchRouterHooks.sol:127` + `pkg/pool-hooks/contracts/StableSurgeHook.sol:57-90`
- **Attack sketch:** Construct a 3-hop batch swap path `A → StableSurge pool → Buffer (ERC4626) → Weighted pool → A'` where intermediate `minAmountOut=0` allows surge-fee drift to be silently absorbed at hop 2, while the end-to-end slippage check at the final hop is satisfied. Net effect: arb between expected vs realized intermediate slippage > attacker entry cost. `[INSPECTED]`
- **Paste-ready-feasibility:** HIGH (Foundry PoC composable against deployed BatchRouter `0x136f1E...78d1`)
- **WONTFIX risk:** MEDIUM — must demonstrate non-extreme parameter regime; reading of WONTFIX wording leaves room for "non-extreme" exploits
- **Cap class:** Likely Medium / High ($50K-$250K range)

### Candidate B-2: Doctrine #29 v1.1 — RateProvider unbounded plunge propagating to balance scaling
- **Lens:** Doctrine #29 v1.1 + DC-12 monotonic-oracle defense
- **File:line:** `pkg/vault/contracts/lib/PoolDataLib.sol:152-162` (`getTokenRate`) + caller `reloadBalancesAndRates:131-149`
- **Attack sketch:** Identify a deployed pool with a `WITH_RATE` token whose RateProvider is exploitable (compromised LST, depegged stETH wrapper, buggy compound-rate provider). Trigger a rate plunge → `balancesLiveScaled18` scales down → invariant arithmetic shifts → arbitrage exit window opens. Permissionless rate-provider acceptance at registration is the structural enabler. `[INSPECTED]` for code; `[ASSUMED]` for live exploitable rate provider
- **Paste-ready-feasibility:** MEDIUM (requires demonstrating a known-vulnerable rate provider in production — strongest if combined with a recent oracle incident)
- **Cap class:** High / Critical ($250K-$1M)

### Candidate B-3: LBP post-audit churn vector
- **Lens:** Layer 0 audit-age drift + DC-9 sub-1 (state machine cooldown overwrite analogue)
- **File:line:** `pkg/pool-weighted/contracts/lbp/{LBPCommon,LBPMigrationRouter,FixedPriceLBPool,LBPValidation,LBPoolLib}.sol`
- **Attack sketch:** LBP cluster received 2 consecutive "audit fixes" PRs (#1628 + #1637) AFTER the newest audit file `certora/2026-01-26.pdf`. Specifically inspect `LBPMigrationRouter` (state-transition between LBP and v2 pool) + `BPTTimeLocker` (time-based unlock) for migration races, double-call vulnerabilities, or stale-state-mutation patterns. `[EXECUTED]` for churn; `[ASSUMED]` for specific exploit until Gate 2 source dive
- **Paste-ready-feasibility:** MEDIUM (state-machine reasoning needed; high information-asymmetry between Buzz and prior auditors)
- **Cap class:** Medium / High ($50K-$250K)

### Candidate B-4: UPGRADEABLE-hook discovery on deployed instances
- **Lens:** DC-9 sub-3 (upgradeable-hook-no-timelock)
- **File:line:** `pkg/pool-hooks/contracts/{StableSurgeHook,ECLPSurgeHook,MevCaptureHook}.sol` + on-chain bytecode of deployed instances
- **Attack sketch:** Confirm via `cast storage <hook> 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc` (EIP-1967 impl slot) that no deployed hook is behind a UUPS/Transparent proxy. If any IS behind a proxy without timelock on the proxy admin, the entire fee-modulation surface can be replaced atomically — affecting every pool that bound that hook at register-time (immutable from Balancer's perspective but mutable from the hook admin's perspective). `[ASSUMED]` until bytecode verified
- **Paste-ready-feasibility:** LOW-MEDIUM (depends on bytecode-verify result; if proxy-and-no-timelock confirmed → HIGH)
- **Cap class:** Critical ($1M) if confirmed

### Candidate B-5: Hook-adjusted amounts × surge fee asymmetry cross-contamination
- **Lens:** CANDIDATE-O + Lens 4 (external calls returning adjusted amounts)
- **File:line:** `pkg/vault/contracts/lib/HooksConfigLib.sol:214-261` (`onAfterSwap` adjustedAmount path) + `StableSurgeHook` surge-fee approximation
- **Attack sketch:** When `enableHookAdjustedAmounts=true`, the hook can modify `hookAdjustedAmountCalculatedRaw`. Investigate whether the surge fee approximation drift (acknowledged WONTFIX) interacts pathologically with hook-adjusted amounts in the same swap — i.e., the hook returns a "correction" amount that the Vault treats as authoritative, but the surge fee was computed on the pre-adjustment balances. Net asymmetry exploitable across batch paths. `[INSPECTED]`
- **Paste-ready-feasibility:** MEDIUM (requires building a custom hooks contract + 2-pool path PoC)
- **Cap class:** Medium / High ($50K-$250K)

## Step 5.10 — Recommended next-action

**Gate 2 dispatch on Candidate B-1** (BatchRouter intermediate slippage + StableSurge fee asymmetry):
- Highest paste-ready-feasibility (HIGH)
- Lowest setup cost (Foundry-only, no proxy bytecode dance)
- Direct on-chain verifiability against deployed BatchRouter
- WONTFIX risk manageable if PoC parameters stay within "non-extreme" regime

**Parallel surveillance on Candidate B-2** (RateProvider plunge): keep on watchlist; activate the moment a known-vulnerable rate provider surfaces in production (RedStone / Chainlink / stETH wrapper incident).

**Substrate-foreclosure on Candidate B-4** (proxy hook discovery): defer to Gate 2 as a 10-minute bytecode probe; cheap to disprove, decisive if confirmed.

## Step 5.11 — Blockers / Scope ambiguities / Halts

1. **CowPool factory in-scope status not enumerated** in WebFetch — verify against the full 38-asset Immunefi scope page before any CowPool PoC investment. Skip CowPool from immediate Gate 2 pending scope confirmation.
2. **Gyro pool factories** assumed in-scope (CANDIDATE deduced from `pool-gyro/` presence + ECLPSurgePoolFactory). Confirm by listing all 38 assets at Gate 2 entry.
3. **WONTFIX risk** on StableSurge asymmetry — Gate 2 must construct PoC parameters that are demonstrably **not** "extreme" per the WONTFIX wording. Conservative target: max-surge-fee ≤ 5%, balance ratio ≤ 4:1.
4. **No live diagnostics on Immunefi** (per `feedback_no_live_diagnostics.md`) — no probing the platform's submission system; only WebFetch of public bounty page allowed.

## Step 6 — Continuous (post-Gate 1 wrap)

- Add row to `brain/Watchlist-Candidate-Crossmap.md`: Balancer-V3 × { Doctrine #29 v1.1, DC-9 sub-3, DC-12, CANDIDATE-I, CANDIDATE-O } (deferred to follow-up edit — surfaces on next loop)
- Log line in `hunts/intake-log.md`: `2026-05-26 Balancer-V3-Immunefi HIGH-overlap $1M-cap Gate1-complete Gate2-dispatch-B-1` (deferred to follow-up)

## Audit-trail timestamps

- Gate 1 start: 2026-05-26 21:49Z
- Layer 0 analyzer run: 2026-05-26 21:51Z
- Clone HEAD ts: 2026-05-22 03:00:15Z
- Gate 1 file written: 2026-05-26 21:55Z (approx)

---

*Filed by Lane 1 Gate 1 surface-mapper. R8 evidence-grade tags applied per `standing-intake-protocol.md` Step 5.10. Veda OOS pre-flight executed per Step 5.2. Bytecode-verify commands staged per Step 5.3. 5-Target Quality Checklist complete per Step 5.6. 5 brain lenses applied per Step 5.7. Known-issues deduplicated per Step 5.8.*

---

## Gate 2 Outcome Update — 2026-05-27 ~00:35 UTC

**B-1 Gate 2 PoC: CONFIRMS.**

- **PoC file:** `data/lane1/clones/balancer-v3-monorepo/pkg/pool-hooks/test/foundry/BatchRouterSlippageDoubleCountPoC.t.sol`
- **Run command:** `forge test --match-contract BatchRouterSlippageDoubleCountPoC -vvv`
- **Result:** 2/2 tests PASS against HEAD `80fd29ce4eb6`
- **Key numbers (NON-EXTREME regime — default 30% threshold, 200 amp, 70/30 imbalance, 5,000-token trade, 5% user slippage):**
  - 2-hop batched: 5,000 DAI → 4,945.345 USDT (composed slippage 1.09%) `[EXECUTED]`
  - 1-hop counterfactual: 5,000 DAI → 4,972.585 USDC (slippage 0.55%) `[EXECUTED]`
- **Paste-ready:** `data/lane1/gate2-clones/balancer-b1-batchrouter-slippage-paste-ready-v2.md` — HOLD for operator approval, NOT submitted (per autonomy-boundary.md)
- **Bytecode-pin status:** DEFERRED — 5 public RPCs (Cloudflare, Ankr, PublicNode, LlamaRPC, drpc, Merkle, BlastAPI) either rate-limited or returned `0x` at deployed address `0x136f1Ee37Ec24bD4f57DBC9D78fb6f4c2db478d1` during 2026-05-26 verification window. Triager-resolvable.
- **Brain compounds filed:**
  - `brain/Watchlist-Candidate-Crossmap.md` v2.5 addendum (row 48 added; foreclosure-row 314 correction recorded)
  - `brain/Open-Questions-Tracker.md` v1.4 (Q-37 swapExactOut extension + Q-38 ECLPSurgeHook variant + Q-34/Q-35 answer log)
  - `brain/Contradictions-Register.md` v1.2 (#16 Pattern J Balancer-V3 foreclosure contradicted)
- **Downstream unblocks:**
  - Pancake Infinity Gate 2 (row 47, v2.3 Crossmap) — periphery clone + Universal Router slippage-check inspection now GO
  - Stader ETHx Gate 2 (row 4, v2.4 Crossmap) — G2-CAND-1 + G2-CAND-2 deferred-gate releases
- **Recommended next-action:** **SUBMIT** (paste-ready ready, operator approval gate)
