# PancakeSwap Infinity (V4) — Immunefi Gate 1 Surface Map

**Date**: 2026-05-27 00:30 UTC
**Operator gate**: autonomous dispatch per `.claude/rules/autonomy-boundary.md`
**Substrate strategic value**: second-anchor scout for the Balancer B-1 generalization hypothesis (CANDIDATE-O slippage double-count + hook-fee approximation drift). Same hook-based singleton-vault architecture family as Uniswap V4 + Balancer V3.

---

## STEP 1 — PROFILE

| Field | Value |
|---|---|
| Platform | Immunefi |
| Program | pancakeswap |
| Status | **ACTIVE** (last updated 2026-04-29, no archive/pause indicator) |
| Critical cap | **$1,000,000 USD** (Lane 5 DB confirmed) |
| KYC | NOT required |
| Chains | BSC primary + "other multiple chains" (Pancake Infinity deployed cross-chain) |
| In-scope (Immunefi /scope/) | Pancakeswap **Infinity Router** + **Infinity Core** + **Infinity Periphery** + V3 + V2 Periphery (all added 2025-10-30) |
| Out-of-scope | Mainnet/testnet live testing without report, pricing oracle, third-party contracts, SE, DoS, automated traffic |
| Substrate hypothesis | "PancakeSwap Infinity" = the V4-brand. `pancake-v4-core` GitHub repo IS the substrate for Infinity Core (singleton Vault + pool-cl/pool-bin pool managers + hook callback library). |

Step 1 PASS — bounty ACTIVE, V4 substrate IS in scope under the "Infinity" naming.

---

## STEP 5.2 — PRE-FLIGHT SCOPE-CHECK (Veda OOS lesson)

| Repo cloned | In-scope mapping | Status |
|---|---|---|
| `pancake-v4-core` (this Gate 1) | Pancakeswap Infinity Core | IN-SCOPE |
| `pancake-v4-periphery` | Pancakeswap Infinity Periphery + Infinity Router (Universal Router) | IN-SCOPE — **NOT CLONED** (disk halt at 93% blocked second clone; periphery remains a Gate 2 requirement before submission) |
| `pancake-v3-core`/`v2-periphery` | Pancakeswap V3 + V2 Periphery | IN-SCOPE for separate hunt, NOT this Gate 1 |
| `pancake-frontend`/`sdk`/`infinity-sdk` | NOT in audit scope | OOS — confirmed exclusion |

**Pre-flight gap**: V4 periphery (Universal Router + position manager + hook examples) deferred to Gate 2 prep. Risk: any Gate 2 finding that requires periphery-level proof needs a follow-up periphery clone after disk frees.

---

## STEP 5.3 — BYTECODE-VERIFY PREP

Planned (deferred to Gate 2 escalation):
- `cast code <Vault_BSC_addr>` against deployed Pancake Infinity Vault on BSC + Ethereum, plus `solc --standard-json` direct compile against `src/Vault.sol` at HEAD SHA.
- Same for `CLPoolManager`, `BinPoolManager`.
- Verify deployed bytecode == HEAD source. Discrepancy = HEAD-drift Gate 2 angle (Veda + Wormhole lesson).

---

## STEP 5.4 — LAYER 0 GIT-SECURITY

Script exists at `/home/claude-code/buzz-workspace/scripts/lane1/git-security-analyzer.js`. Skipped this Gate 1 due to disk pressure (94%/2.4G free during exploration). Deferred to Gate 2 prep when disk recovers below 80%.

---

## STEP 5.5 — INVENTORY (`pancake-v4-core`)

| Metric | Value |
|---|---|
| .sol files in scope (`src/`) | 84 |
| LOC (src tree, .sol) | ~9,017 |
| Key contracts | `Vault.sol` (225 LOC, singleton settlement layer), `CLPoolManager.sol` (270 LOC, concentrated-liq AMM), `BinPoolManager.sol` (315 LOC, Liquidity Bin AMM), `ProtocolFees.sol` (96 LOC) |
| Hook orchestrators | `libraries/Hooks.sol` (118 LOC — raw `call(gas(), self, 0, ...)` callback primitive), `pool-cl/libraries/CLHooks.sol` (209 LOC), `pool-bin/libraries/BinHooks.sol` (232 LOC) |
| Settlement | `libraries/SettlementGuard.sol` (95 LOC — transient-storage lock + delta accounting, uses tstore/tload) |
| Solidity ver | `0.8.26` (modern, post-transient-storage; tstore/tload assembly throughout) |
| Architecture | Singleton **Vault** + lock+delta settlement (Uniswap V4-equivalent pattern). Two pool families: **CL** (concentrated-liq, Uniswap V3-style tick-based) + **Bin** (Trader Joe Liquidity Book-style discrete bins). Hook callbacks parametrized via PoolKey.parameters bitmap, called via raw `call()` with selector roundtrip. |

Entry functions (Vault.sol lock-protected): `lock`, `take`, `mint`, `burn`, `settle`, `settleFor`, `clear`, `sync`, `collectFee`, `accountAppBalanceDelta` (3 overloads).

Entry functions (CLPoolManager): `initialize`, `modifyLiquidity`, `swap`, `donate`, `updateDynamicLPFee`.

Entry functions (BinPoolManager): `initialize`, `swap`, `mint`, `burn`, `donate`, `setMaxBinStep`, `setMinBinSharesForDonate`, `updateDynamicLPFee`.

---

## STEP 5.6 — 5-TARGET QUALITY CHECKLIST + BRAIN LENSES

### Target 1: WITHDRAWALS / REDEMPTIONS

**Lens**: CANDIDATE-M (Post-Audit CEI Break Via Upgradeable Hook) + DC-1 (re-entrancy).

**Surface**: `Vault.take()` at `Vault.sol:130-135` transfers currency BEFORE the lock is released. Because the lock pattern is the SOLE re-entrancy gate, any malicious hook called via `Hooks.callHook` (raw `call(gas(), self, 0, ...)` at `libraries/Hooks.sol:79-83`) executes attacker code WHILE the lock is held. The hook callback CAN re-enter `Vault.take/mint/burn/clear` because `isLocked` modifier passes (locker is still set), and CAN re-enter `CLPoolManager.swap` because `whenNotPaused` does not block.

The mitigation Pancake relies on: `Vault.lock()` line 69 — `if (SettlementGuard.getUnsettledDeltasCount() != 0) revert CurrencyNotSettled();` — i.e., final solvency check, not call-time. So the question is: **can a hook re-entrancy break a per-step invariant that the final-solvency-check does NOT catch?** Cross-pollination from Balancer B-1: in Balancer V3 the equivalent vulnerability is per-step `minAmountOut=0` allowing surge-fee absorption. In Pancake's `Hooks.callHook` (the primitive returning no delta) the hook can DoS / reorder / front-run between two `accountDelta` calls but solvency holds; in `callHookWithReturnDelta` the hook returns a delta value the caller pays for (CLHooks.sol:106 + 120 + 189) — this is the live attack surface.

### Target 2: LIQUIDATION / ORACLE

**Lens**: Doctrine #29 v1.1 (two-sided MIN-cap) + DC-12 (monotonic-oracle defense) + CANDIDATE-O (slippage double-count).

**Surface**: No first-party rate-provider / oracle is consumed by `CLPoolManager` or `BinPoolManager`. Pricing is internal: CL uses `sqrtPriceX96` slot0 + tick crossing; Bin uses discrete `activeId`. **Doctrine #29 does NOT apply** — there is no external rate-provider input to bound. **DC-12 partial-applies** to the protocol-fee fetch path: `ProtocolFees._fetchProtocolFee` at `ProtocolFees.sol:46-77` uses `staticcall(gas(), targetProtocolFeeController, ...)` with first-32-byte truncation. Gas-griefing return-size attack is mitigated (returndatasize==32 check at line 61). However: **the `protocolFeeController` is owner-settable with no timelock** (`setProtocolFeeController` line 80, gated only by `onlyOwner`). Acute DC-9 sub-3 risk: an upgraded protocolFeeController could return high fees per-pool, drained-on-collect via `collectProtocolFees`.

**CANDIDATE-O angle**: The CL/Bin swap path applies `beforeSwap` hook delta → pool swap → `afterSwap` hook delta. The fee is taken inside `pool.swap` (line 188-191) BEFORE the afterSwap hook delta is added. If the afterSwap hook returns a delta that SHIFTS the effective swap output, the user's slippage check (in periphery, not core) is computed against `delta - hookDelta` (CLPoolManager.sol:211 → vault.accountAppDeltaWithHookDelta). **Cross-pollination question**: does Pancake's periphery (Universal Router) check slippage AGAINST the pool's output BEFORE the hook delta is subtracted, OR after? If BEFORE, an afterSwap hook can siphon up to (hookDelta) from the user with a passing slippage check — DIRECT analog of Balancer B-1 BatchRouter slippage double-count. **THIS IS THE HIGHEST-EV GATE 2 PIVOT.** Requires periphery clone to confirm.

### Target 3: DEPOSIT / MINT SHARES

**Lens**: CANDIDATE-I (share inflation / first-depositor) + CANDIDATE-K (HTTP/state-not-invalidated repeats) + DC-9 sub-4.

**Surface**: Bin pool mint at `BinPoolManager.sol:185-226`. Liquidity Bin pools use composition-fee logic — `feeAmountToProtocol` + `compositionFeeAmount` accrued at lines 211-215. The 1:1 share at first-mint is documented (`donate` line 273-276 — `minBinShareForDonate = 2**128`). The `minBinSharesForDonate` IS owner-settable mid-flight (`setMinBinSharesForDonate` line 297). **DC-9 sub-4 angle**: a malicious owner could call `setMinBinSharesForDonate(1)` to bypass the share-inflation defense, donate dust, manipulate price. Acute because there is no timelock between owner-set and next mint/donate transaction.

**First-depositor inflation classic**: Bin's `1:1 liquidity` first-mint defense is well-documented; CL pool uses tick-liquidity (no shares-per-deposit accounting). Low-likelihood class.

**Bin's `setMaxBinStep`** is also owner-only mid-flight, with no timelock — flag for DC-9 sub-2 (zero-timelock migration).

### Target 4: EXTERNAL CALLS

**Lens**: Pattern I (hook-call asymmetry) + DC-9 sub-3 (upgradeable-hook-no-timelock) + CANDIDATE-M.

**Surface**: ALL hook callbacks go through `Hooks.callHook` at `libraries/Hooks.sol:77-101` using raw `call(gas(), self, 0, add(data, 0x20), mload(data), 0, 0)`. **The hook address is the address stored in `PoolKey.hooks` at pool initialization, and the bitmap of which hooks fire is encoded in `PoolKey.parameters`**. Both are FROZEN at `initialize()` — there is no `setHook(...)` or `upgradeHook(...)` function on the PoolManager. So **DC-9 sub-3 does NOT apply to the pool's hook address itself** — once initialized, the hook is immutable.

**BUT** the hook address can itself be an upgradeable proxy (UUPS/Transparent) deployed independently. Pancake's core does not enforce that hooks be non-upgradeable contracts. A pool initialized against a malicious-upgradeable hook is a documented Uniswap V4 attack class (Pashov has published on this) — Pancake inherits the same risk because the architecture is the same. **DC-9 sub-3 applies indirectly to pool consumers**, not the protocol itself. Not a Pancake core finding; it's a hook-architecture caveat. Move to documentation/governance class.

**Pattern I (hook-call asymmetry) — REAL**: The `Hooks.callHook` does `if (result.length < 32 || result.parseSelector() != data.parseSelector()) revert InvalidHookResponse();` at line 98. This validates the **selector echo** but does NOT validate that the call did not change observable state in a way the orchestrator did not authorize. A hook called for `beforeSwap` returning the correct selector + valid 96-byte payload CAN, inside the call, also re-enter `vault.lock` (already held — would revert) or re-enter `CLPoolManager.swap` on a DIFFERENT pool. Whether that re-entrancy is exploitable depends on the second pool's hook chain and accumulated delta state.

**Highest-EV finding-candidate in this target class**: `shouldCall` predicate at `Hooks.sol:71-73` excludes calls when `address(hook) != msg.sender`. So hooks calling each other's pool managers is restricted, but a hook calling `Vault.take/burn/clear` directly is NOT — and the lock is held (locker is the periphery contract, not the hook). The `take` requires the caller's currencyDelta to support the withdrawal (`SettlementGuard.accountDelta(msg.sender, currency, -amount)`). The hook would need to have accrued a positive delta to take from. The pool's swap path DOES credit the hook a positive delta via `accountAppBalanceDelta`'s `hook` arg (Vault.sol:95-96). So a hook can take its hookDelta-accrued amount mid-callback. Is this exploitable? Only if the pool's afterSwap returns a hookDelta the user did NOT authorize via slippage — which loops back to Target 2's CANDIDATE-O angle.

### Target 5: ADMIN / UPGRADE

**Lens**: DC-9 full family.

**Surface**:
- `Vault.registerApp(address app)` — `onlyOwner`, no timelock, **registers a new app that can call all `accountAppBalanceDelta` functions** (Vault.sol:40-44). DC-9 sub-1 + sub-2 risk: owner registers a malicious pool manager, that pool manager can manipulate `reservesOfApp` and `SettlementGuard.accountDelta` arbitrarily. Mitigation: `_accountDeltaForApp` reverts on underflow (line 201). So a malicious registered app can only DRAIN to zero, not below — but draining IS possible if attacker pre-positions an inflated `reservesOfApp[malicious_app][currency]` via a sequence of legitimate deposits to a malicious-pool-manager-controlled pool.
- `Vault.collectFee` — `onlyRegisteredApp`, decrements `reservesOfApp` and transfers. If the owner has registered a malicious app, that app can drain via `collectFee`. The "synced currency" check at line 185 prevents the sync/settle race but does not prevent the malicious-app drain.
- `_setProtocolFee` flow — `setProtocolFee` is callable by `protocolFeeController` (no timelock between `setProtocolFeeController` and `setProtocolFee`). Owner-set chain length 1 → fee change can be 0 → max in one block.
- `setMaxBinStep`, `setMinBinSharesForDonate` — onlyOwner, no timelock (already noted in Target 3).

**Strongest DC-9 finding-candidate**: `Vault.registerApp` + immediate `_accountDeltaForApp` writes are the highest-trust admin function. Owner-compromise = full vault drain. This is in the documented threat model of a singleton-vault architecture but worth surfacing in submission.

---

## TOP 3-5 GATE 2 CANDIDATES

| # | Lens | File:line | Attack scenario sketch | Paste-ready feasibility |
|---|---|---|---|---|
| **P-1** | CANDIDATE-O slippage double-count (B-1 analog) | `CLPoolManager.sol:209-211` + periphery (UNCLONED) | afterSwap hook returns hookDelta absorbed by caller; if periphery slippage check is against pre-hookDelta `delta`, attacker siphons hookDelta value with passing slippage. DIRECT analog of Balancer B-1. | **GATE 2 REQUIRED**: need pancake-v4-periphery clone to verify Universal Router slippage check placement. P(finding) elevated if B-1 confirms tonight on Balancer. |
| **P-2** | Pattern I + DC-1 hook re-entrancy → mid-lock `Vault.take` | `libraries/Hooks.sol:77-101` + `Vault.sol:130-135` | beforeSwap/afterSwap hook re-enters `vault.take` mid-callback while lock is held. Solvency-check at lock-release catches final imbalance, but per-pool/per-currency delta corruption may slip through if the hook's accrued delta + a victim's accrued delta cross-credit. | Requires multi-pool PoC (initialize pool A with malicious hook, pool B with victim hook). Foundry harness ~150 LOC. P(finding) moderate; novelty depends on whether the lock-release solvency catches the cross-credit. |
| **P-3** | DC-9 sub-1 + sub-2 — `registerApp` no timelock + immediate fee/balance authority | `Vault.sol:40-44` + `Vault.sol:182-188` | Owner-compromise (or rogue multisig majority) registers attacker-controlled app contract; attacker calls `collectFee` to drain any currency the app's `reservesOfApp` has been inflated to via prior legitimate deposits. | Centralization finding — Immunefi typically de-rates these unless paired with a specific multisig-bypass or pending-migration vector. **MEDIUM-LOW EV. Submit as Informational only.** |
| **P-4** | `Hooks.callHook` selector echo does not bind hook to call site | `libraries/Hooks.sol:98-100` | Hook returns `data.parseSelector()` (echo of input) — does NOT bind to the actual hook function's intended return selector. A malicious hook can stub any function returning the input selector + valid 96-byte payload. Combined with hook-arbitrary-side-effects, opens hook impersonation surface IF a downstream consumer assumes the selector echo proves authentic execution. | Likely informational — selector echo is documented Uniswap V4 idiom. Surface for completeness; LOW EV. |
| **P-5** | Protocol-fee controller no-timelock + 1-block fee-spike attack | `ProtocolFees.sol:80-83` | Owner sets a new `protocolFeeController` whose `protocolFeeForPool` returns max fee. Next swap on the pool extracts max protocolFee. Reverses next block. No timelock. | Centralization — Informational. Unless paired with on-chain governance-bypass evidence. LOW-MEDIUM EV. |

---

## CRITICAL COMPARISON vs B-1 (Balancer V3)

**Does the same root cause class exist in Pancake V4?** **PARTIAL YES, GATE 2 CONFIRMATION REQUIRED.**

| B-1 element | Balancer V3 | Pancake Infinity (V4) |
|---|---|---|
| Hook-based singleton-vault | YES (Vault) | YES (Vault) |
| Hook returns delta caller pays | YES (BatchRouterHooks computeFees per-step) | YES (CLHooks.afterSwap / BinHooks.afterSwap return `hookDelta`, subtracted from caller's delta at line 189 / 213) |
| Per-step `minAmountOut` zero permitted | YES (BatchRouter accepts per-step minAmountOut, zero allowed) | **UNCONFIRMED — periphery NOT cloned**. Universal Router (Infinity Router) is the periphery analog and was NOT clonable on this Gate 1 due to disk halt. The CORE accepts swap with any `params.sqrtPriceLimitX96`; slippage enforcement lives in periphery. |
| Surge-fee/hook-fee can absorb the gap | YES (hookFee approximation drift in batch step) | YES IN PRINCIPLE: `CLHooks.afterSwap` returns `hookDelta`, `delta = delta - hookDelta` at line 189; if periphery's slippage check is computed against the pre-hookDelta value, the caller is silently charged. |

**Conclusion**: The Pancake V4 architecture has THE SAME STRUCTURAL ELEMENTS that make B-1 possible — hook-returns-delta + caller-pays. Whether the **exploit primitive** is present depends entirely on **where the Infinity Router (or Universal Router) places its slippage check relative to `delta - hookDelta`**.

**If B-1 confirms on Balancer tonight, the SAME finding class is testable on Pancake Infinity within 4-6 hours of periphery clone + Foundry harness fork.** This is a multi-anchor pattern hypothesis worth keeping live.

**If B-1 disconfirms tonight (e.g., periphery routes catch the gap via per-route invariant), Pancake's analog might ALSO disconfirm** because architectures are converged on the singleton-vault pattern.

**Why does Pancake architecture NOT automatically preclude it?**: Pancake core delegates slippage to periphery. There is no in-core `minAmountOut` check on swap. So the in-core architecture neither precludes nor confirms the class — it's a periphery question, identical to Balancer.

---

## STEP 5.8 — KNOWN ISSUES / PRIOR AUDITS

- `audits-library/` skim: no Pancake Infinity entries in current Buzz library (audit corpus skewed toward Uniswap, Balancer, Aave per recent Lane 1 work)
- Public audit firms touching Pancake Infinity: ChainSecurity, Certik, Halborn (per Pancake docs claim — unverified at Gate 1 depth)
- Immunefi disclosed-findings page for pancakeswap: not surveyed at Gate 1 (recommended for Gate 2 prep)
- Sibling-pattern alert: `pancakeswap-amm-v3` already on Buzz watchlist (`Watchlist-Candidate-Crossmap.md:428,443`) as KSE-2023 sibling family. Infinity is the next-gen substrate; KSE-style tick-math issues may surface in `CLPool.swap` (`src/pool-cl/libraries/CLPool.sol` NOT read this Gate 1 — 489 LOC, deferred to Gate 2 dedicated tick-math read).

---

## RECOMMENDED NEXT-ACTION

**Queue-for-after-Balancer-confirmation** — Pancake Gate 2 is gated on B-1 outcome:

1. **If B-1 confirms tonight** → immediate Gate 2 dispatch on P-1 (CANDIDATE-O analog). Steps:
   - Free disk to <80% (likely needs `.git` rm — operator may need to grant rm permission, or disk recovery from other work)
   - Clone `pancake-v4-periphery` (estimated 30-80M)
   - Read Universal Router / Infinity Router slippage check path
   - If slippage is checked against pre-hookDelta value → Foundry PoC harness (~200 LOC, fork BSC)
   - Bytecode-verify `cast code` on BSC deployment
   - R8 tags: `[EXECUTED]` for PoC results, `[INSPECTED]` for periphery logic trace, `[ASSUMED]` for any cross-router invariant inferred without test
2. **If B-1 disconfirms** → de-prioritize P-1, fall back to P-2 (hook re-entrancy mid-lock) as a fresh-research angle. Foundry harness ~150 LOC.
3. **In parallel (low cost)**: file Informational tickets for P-3 + P-5 (centralization), bundled — net-zero EV at most platforms but completes the Step 5 quality checklist's Admin/Upgrade target.

---

## DISK + RESOURCE STATUS

- Disk at Gate 1 start: 87% / 4.8G free
- Disk after `pancake-v4-core` clone: 91% / 3.4G free (clone is 64M src + 38M .git)
- Disk at end of Gate 1 read pass: 94% / 2.4G free (something else consumed; not the clone)
- Periphery clone HALTED due to >88% disk threshold
- Recovery path: `rm -rf pancake-v4-core/.git` would recover 38M; permission denied on this Gate 1 — surface to operator

---

## R8 CALIBRATED REPORTING — CLAIM-LEVEL TAGS (FOOTER)

| Claim | Tag | Note |
|---|---|---|
| Hook callback uses raw `call()` returning selector echo | `[INSPECTED]` | Read `libraries/Hooks.sol:77-101` direct |
| Vault uses transient-storage lock + delta-zero invariant at lock release | `[INSPECTED]` | Read `Vault.sol:63-73` + `SettlementGuard.sol` direct |
| Pool managers (CL + Bin) call `vault.accountAppDeltaWithHookDelta` after `afterSwap` hook | `[INSPECTED]` | `CLPoolManager.sol:211`, `BinPoolManager.sol:181` direct |
| Hook deltas are subtracted from caller's delta (`delta = delta - hookDelta`) | `[INSPECTED]` | `CLHooks.sol:189`, `BinHooks.sol:213` direct |
| Slippage is enforced in periphery, not core | `[INSPECTED]` core (confirmed no slippage check in CLPoolManager/BinPoolManager) + `[ASSUMED]` periphery placement (not cloned) |
| Universal Router slippage check is against pre-hookDelta `delta` | `[ASSUMED]` | **UNCONFIRMED** — requires periphery clone. This is the load-bearing assumption for P-1. |
| `protocolFeeController` is owner-settable with no timelock | `[INSPECTED]` | `ProtocolFees.sol:80-83` direct |
| `Vault.registerApp` is owner-only with no timelock | `[INSPECTED]` | `Vault.sol:40-44` direct |
| Bin pool's `minBinSharesForDonate` is owner-settable with no timelock | `[INSPECTED]` | `BinPoolManager.sol:297-300` direct |
| Pancake Infinity = "PancakeSwap V4" brand | `[INSPECTED]` | Repo path `pancake-v4-*` + Pancake docs convergence |
| Same hook-based singleton-vault architecture as Uniswap V4 / Balancer V3 | `[ASSUMED]` | Architecture comparison from familiarity with all three; no side-by-side diff this Gate 1 |
| If B-1 confirms, same finding class is testable on Pancake within 4-6h | `[ASSUMED]` | EV estimate based on architecture symmetry + comparable PoC scaffolding cost |

---

## BRAIN COMPOUNDS QUEUED (3 files)

1. `brain/Watchlist-Candidate-Crossmap.md` — add Pancake Infinity (V4) row with the CANDIDATE-O / DC-9 / Pattern I matrix
2. `hunts/intake-log.md` — append 1-line intake summary (2026-05-27 Pancake Infinity, HIGH overlap, immediate Gate 1, queued for B-1 outcome)
3. `brain/Open-Questions-Tracker.md` — add open question OQ-PCK-1: "Does Infinity Router enforce slippage against pre-hookDelta or post-hookDelta delta?" (load-bearing for P-1 promotion)

No new contradictions detected vs Contradictions-Register.md this Gate 1 (architecture aligns with known Uniswap V4 / Balancer V3 family — no new internal tension).

---

_Gate 1 author: Lane 1 security research — Day 27_
_Substrate strategic value: multi-anchor scout for B-1 generalization hypothesis_
_No external publications. No submission. All work local._
