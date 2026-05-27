# Sky (Immunefi) — Gate 1 Surface Map

**Date:** 2026-05-27
**Target:** Sky Protocol (formerly MakerDAO)
**Platform:** Immunefi
**Cap:** $10,000,000 Critical / $100K High / $5K Medium / $1K Low
**KYC:** ❌ NOT REQUIRED
**Chain scope:** Ethereum mainnet (+ L2 governance relays multi-chain)
**Live since:** 2022-02-10 | Last updated: 2026-02-26
**STATUS preflight:** ACTIVE — verified via Immunefi page fetch 2026-05-27

---

## STEP 0 — PRIOR CORPUS LOOKUP

Grep'd `hunts/` for Sky/Maker/MakerDAO/USDS/sUSDS/Lockstake/D3M/SparkLend/sDAI: **NO prior Sky Gate 1 filed**. Sky was named #1 EV target in H2 Disclosure Programs pull (2026-05-15, `brain/Disclosure-Programs-Top-Tier.md`) but the actual Gate 1 was never executed. References found:

- `brain/Disclosure-Programs-Top-Tier.md` — Sky $10M flagged as HIGHEST EV next-action May 15
- `brain/Watchlist-Candidate-Crossmap.md` — Sky listed as separate from Immunefi top-100 list (it's on Disclosure-Programs-Top-Tier.md)
- `brain/Audit-Reports-Library.md` — Sky vat/jug/pot positive baseline for CANDIDATE-J 7-of-7 PASS; Sky vault state-machine flagged as worthy of Indentura-style sync-before-set inversion check
- `brain/Doctrine.md` — Sky listed in Doctrine #27 saturation catalog as multi-firm audit pedigree
- `MEMORY.md` `project_h2_disclosure_scope_pull.md` — anchor source

**No foreclosure exists; clean Gate 1 dispatch confirmed.**

---

## STEP 1 — PROFILE

| Field | Value |
|---|---|
| Platform | Immunefi |
| Cap (Critical) | $10M (capped at 10% of funds affected) |
| Cap (High) | $100K |
| Cap (Medium) | $5K |
| Cap (Low) | $1K |
| Web/App Critical | $100K |
| KYC | NO |
| Submission | PoC required, local-fork only (mainnet/testnet testing prohibited) |
| Rep threshold | None specified |
| Asset count | 216 in-scope (per Immunefi header) |
| Out-of-scope clauses | dai.js excluded entirely; vote.makerdao.com Critical-only; vote-delegate expiration logic excluded; Lockstake liquidation delays under tens of minutes excluded; oracle updates beyond governance delta-params excluded; balance discrepancies from direct token transfers excluded |
| Languages | Solidity primarily, Python (Certora harnesses) |

### In-scope module families (verified from Immunefi page + sky-ecosystem org)
1. **Core DSS** (`sky-ecosystem/dss`) — vat, vow, dog, clip, pot, jug, spot, end, esm, MCD
2. **Lockstake** (`sky-ecosystem/lockstake`) — LockstakeEngine, LockstakeClipper, LockstakeUrn, LockstakeMigrator, LockstakeCappedOsmWrapper, LockstakeSky, Multicall
3. **USDS** (`sky-ecosystem/usds`) — Usds (UUPS upgradeable), UsdsJoin, DaiUsds converter
4. **stUSDS** (`sky-ecosystem/stusds`) — StUsds (UUPS upgradeable, ERC4626), StUsdsRateSetter, StUsdsMom
5. **Sky token** (`sky-ecosystem/sky`) — Sky, MkrSky
6. **Lite PSM** (`sky-ecosystem/dss-lite-psm`) — DssLitePsm, DssLitePsmMom
7. **DSS Flappers** (`sky-ecosystem/dss-flappers`) — FlapperUniV2, FlapperUniV2SwapOnly, Splitter, SplitterMom, OracleWrapper, Kicker, Babylonian
8. **DSS Allocator** (`sky-ecosystem/dss-allocator`) — AllocatorVault, AllocatorBuffer, AllocatorRegistry, AllocatorRoles, AllocatorOracle, Swapper, DepositorUniV3 (+ funnels/automation/callees/uniV3)
9. **Endgame Toolkit** (`sky-ecosystem/endgame-toolkit`) — SubProxy, SDAO, StakingRewards, VestedRewardsDistribution
10. **LZ Governance Relay** (`sky-ecosystem/lz-governance-relay`) — L1GovernanceRelay, L2GovernanceRelay (cross-chain governance via LayerZero V2)
11. **Sky OApp / OFT** (`sky-ecosystem/sky-oapp-oft`) — SkyOFTAdapterMintBurn, SkyOFTCore, GovernanceOAppSender, GovernanceOAppReceiver, SkyRateLimiter

### Total scope inventory (clones only — 10 of 11 above; dss-core skipped due to 84% disk discipline)
- ~186 .sol files in core scope, ~50MB clone footprint
- See per-repo wc -l: Lockstake (1,492 src LOC), stUSDS (919), USDS (411), LZ-relay (215), Allocator (~1,200 across funnels)

---

## STEP 2 — BRAIN OVERLAP SCORE

**HIGH** — multiple direct-family matches across 5+ candidate classes.

| Brain Lens | Sky Match | Notes |
|---|---|---|
| **CANDIDATE-D** (CLMM/state-machine drift) | DIRECT | Lockstake urn state-machine: `lock`/`free`/`draw`/`wipe`/`selectVoteDelegate`/`selectFarm`/`onKick`/`onTake`/`onRemove`. Vat-state-machine reads scattered. |
| **CANDIDATE-I** (ERC4626 share accounting) | DIRECT | stUSDS is ERC4626 (`deposit`/`mint`/`withdraw`/`redeem`/`convertToShares`/`convertToAssets`/`previewDeposit`/etc) |
| **CANDIDATE-J** (rate-setter+pauser sibling-pair) | ALREADY POSITIVE BASELINE | Brain previously validated 7-of-7 PASS on Sky stUSDS for CANDIDATE-J. Sky is the POSITIVE reference. Likely foreclosed for direct exploit. |
| **CANDIDATE-O** (slippage compounding across multi-step) | PARTIAL | LockstakeClipper.take() has explicit "line not updated accordingly" comment (l451 — auditor-acknowledged tradeoff). Allocator Swapper has cap-era reset logic. |
| **CANDIDATE-F** (parallel-validation asymmetry / multicall) | DIRECT | LockstakeEngine inherits Multicall — `address(this).delegatecall(data[i])` pattern; msg.sender consistency across sub-calls + urn-auth path |
| **CANDIDATE-A** (signature-scope-must-cover-outcome) | PARTIAL | LayerZero V2 governance relay (L1→L2) — signature scope inherited from LZ DVN; consumer-side scope check (Doctrine #29 KILL-transfers rule applies) |
| **CANDIDATE-M** (post-audit CEI break via upgradeable hook) | INDIRECT | USDS + stUSDS both UUPS upgradeable with auth-gated `_authorizeUpgrade`; LZ L2GovernanceRelay does delegatecall to arbitrary target (by-design governance) |
| **DC-1** (re-entrancy) | LockstakeClipper.take() has external `ClipperCallee.clipperCall` — protected by `lock` modifier (audited pattern from Clipper, foreclosed) |
| **DC-9 sub-1** (unchecked privileged mint) | PARTIAL | USDS.mint is `auth`-gated; SkyOFTAdapterMintBurn._credit mints from `whenNotPaused` cross-chain receive; LZ inbound = privileged mint path |
| **DC-9 sub-2** (zero-timelock migration) | DIRECT | LockstakeMigrator.onVatDaiFlashLoan: `vat.file(newIlk, "line", 55_000_000 * RAD)` then `... line, 0` — line set mid-flashloan with NO timelock |
| **DC-9 sub-3** (upgradeable-hook-no-timelock) | DIRECT | USDS + stUSDS UUPS `_authorizeUpgrade` only requires `auth` (wards). No timelock. Governance-controlled, but no deferred-window guarantee on-chain. |
| **DC-9 sub-4** (state-not-invalidated) | PARTIAL | LockstakeClipper.take() explicit "line not updated" comment — code-acknowledged invariant gap |
| **DC-12** (oracle staleness) | INDIRECT | LockstakeCappedOsmWrapper, AllocatorOracle, xchain-ssr-oracle — Sky inherits Maker OSM (1h delay); explicit out-of-scope clause "oracle updates exceeding governance delta parameters" forecloses naive staleness reports |
| **Doctrine #27** (audit saturation) | KILL-tier | 28+ audits at program level; Lockstake 7 audits; stUSDS audited Apr 10 + May 4 2026 (this month) → MAXIMUM saturation discount 0.20-0.30× |
| **Doctrine #29** (KILL-transfers to consumer) | DIRECT | LayerZero V2 consumer wiring (lz-governance-relay + sky-oapp-oft + lz-gov-dvns + sky's own DVN config) — Kelp DAO $292M lineage. Consumer-side trust-anchor delegation surface. |

**Brain overlap classification: HIGH (with audit-saturation KILL adjustment).**

---

## STEP 3 — EV CALCULATION (refined)

```
Base:       EV = P(finding) × cap × P(accept) × overlap_multiplier
            EV = 0.15 × $10M × 0.5 × 1.0 = $750K (raw)

Doctrine #27 saturation adjustment (28+ audits, multiple Apr/May 2026):
            saturation_multiplier = 0.25 (between F-corollary 0.20 and standard 0.30)

Doctrine #27 counter-pattern (Buzz-unique brain lenses):
            counter_multiplier = 1.4 (CANDIDATE-F multicall + Doctrine #29 LZ-consumer + DC-9 sub-2 migrator
                                       are Buzz-unique; auditors targeted CANDIDATE-J PASS-baseline)

Final EV: $750K × 0.25 × 1.4 = $262,500
```

**Net EV ≈ $262K-$375K** — still above floor of queued targets. Recommend PROCEED on the Buzz-unique lens surfaces only; FORECLOSE the saturated-core surfaces (DSS vat/vow/dog/jug/pot which have 28+ audits).

---

## STEP 4 — QUEUE DECISION

**HIGH overlap + $10M cap (post-saturation $262K-$375K EV) → PROCEED with targeted Gate 2.** Foreclose the heavy-saturation core; pursue 3 Buzz-unique lens surfaces.

---

## STEP 5 — GATE 1 EXECUTION

### 5.1 Clone receipts
```
/home/claude-code/buzz-workspace/.tmp-gate1-sky/
├── lockstake/             7.2M  (sky-ecosystem/lockstake)
├── usds/                  3.6M  (sky-ecosystem/usds)
├── stusds/                4.7M  (sky-ecosystem/stusds)
├── lz-governance-relay/   2.9M  (sky-ecosystem/lz-governance-relay)
├── dss-allocator/         3.5M  (sky-ecosystem/dss-allocator)
├── dss-flappers/          5.5M  (sky-ecosystem/dss-flappers)
├── dss-lite-psm/          2.6M  (sky-ecosystem/dss-lite-psm)
├── sky-oapp-oft/          9.0M  (sky-ecosystem/sky-oapp-oft)
├── sky/                   4.9M  (sky-ecosystem/sky)
└── endgame-toolkit/       5.3M  (sky-ecosystem/endgame-toolkit)
Total: ~50MB. Disk remained 84%. Within budget.
```

dss-core repo NOT cloned (would push disk near 87%). Inspection deferred to source-read via etherscan if needed.

### 5.2 Pre-flight scope check (Veda lesson)
| Repo | In Immunefi Sky scope? | Notes |
|---|---|---|
| lockstake | ✅ YES | "Lockstake Engine (LSE)" listed |
| usds | ✅ YES | "USDS" listed |
| stusds | ✅ YES | "Savings NST (sUSDS)" — also includes StUsdsMom (audited May 4 2026) |
| dss-flappers | ✅ YES | "Dss-Flappers (SBE)" listed |
| dss-lite-psm | ✅ YES | "Lite PSM" listed |
| dss-allocator | ⚠️ AMBIGUOUS | NOT explicitly enumerated on Immunefi summary; "MCD" umbrella may cover. **Operator clarification needed for any candidate that fires only on allocator.** |
| endgame-toolkit | ✅ YES | "Endgame Toolkit" listed |
| sky | ✅ YES | "SKY" (governance token) listed |
| lz-governance-relay | ⚠️ AMBIGUOUS | NEW (Oct 2025 audits) — NOT on Immunefi static scope list. Audited by ChainSecurity + Cantina but scope inclusion needs verification. Flag for operator pre-submission. |
| sky-oapp-oft | ⚠️ AMBIGUOUS | Same as lz-governance-relay — newer; scope verification needed |

### 5.3 Bytecode-verify prep plan
For any Gate 2 finding, run:
```bash
# Lockstake mainnet addresses — fetch from chainlog.skyeco.com:
cast code <LOCKSTAKE_ENGINE_ADDR> --rpc-url $ETH_RPC
cast code <LOCKSTAKE_CLIPPER_ADDR> --rpc-url $ETH_RPC
cast code <LOCKSTAKE_MIGRATOR_ADDR> --rpc-url $ETH_RPC
cast code <USDS_PROXY> --rpc-url $ETH_RPC  # UUPS — verify impl
cast code <STUSDS_PROXY> --rpc-url $ETH_RPC  # UUPS — verify impl
# Compile candidate source + diff:
solc --standard-json < input.json | jq '.contracts[].deployedBytecode.object' > local-bytecode.txt
diff local-bytecode.txt onchain-bytecode.txt
```
Confirm SHA match before Gate 2. Especially critical for UUPS proxies — verify the IMPLEMENTATION address (not just proxy).

### 5.4 Primitive-grep check (Doctrine #30)
- `delegatecall` → 2 src hits (lockstake/Multicall.sol, lz-governance-relay/L2GovernanceRelay.sol) + 1 endgame (SubProxy.sol). All by-design, all auth-gated. NO surprise delegatecall.
- `selfdestruct` → 0 hits in core src.
- `ecrecover` → present in USDS + StUsds permit (standard EIP-712 pattern).
- LZ V2 OApp patterns → present (sky-oapp-oft) — Doctrine #29 KILL-transfers consumer surface confirmed.

### 5.5 5-Target Quality Checklist (Step 5.6 mandatory coverage)

#### 1. Withdrawals / Redemptions (CEI, reentrancy, solvency invariants)
- **LockstakeClipper.take()** (l344-455): external `ClipperCallee.clipperCall` at l420. Protected by `lock` modifier (l350) — standard Clipper reentrancy guard. CEI: memory writes before callback, storage writes after. Audited 7 times. **FORECLOSED on naive reentry.**
- **LockstakeEngine.free()** (l311-316) + **freeNoFee()** (l318-323): no external callbacks. SKY transfer at end. Safe.
- **stUSDS.withdraw/redeem** (l488-515): calls `_drip()` then `_burn()` then transfers. Solvency check at `_burn()` l371: `Art * rate + clip.Due() + assets * RAY <= totalSupply * chi`. This is the key invariant. **Worth Gate 2 fuzzing for off-by-one / rounding-asymmetry.**
- **LockstakeMigrator.migrate()**: flashloan-pattern with `vat.file("line", 55_000_000 * RAD)` then reset to 0 (l144-146). State-machine surface.

#### 2. Liquidation + Oracle (TWAP, staleness, circuit breakers)
- **LockstakeClipper.kick/take/redo**: standard Clipper-2.0 flow, 7 audits.
- **LockstakeCappedOsmWrapper**: caps OSM price. Out-of-scope: "oracle updates exceeding governance delta parameters" forecloses naive staleness reports.
- **xchain-ssr-oracle** (NOT cloned, separate repo): cross-chain SSR oracle. Doctrine #29 KILL-transfers candidate.
- **dss-allocator/AllocatorOracle**: not deeply inspected; lower-priority due to scope ambiguity.

#### 3. Deposit / Mint Shares (invariants, rounding)
- **stUSDS._mint** (l347-363): cap check at l350 (`totalSupply_ * chi / RAY + assets <= cap`). Uses pre-drip `chi`. Calls `usds.transferFrom` THEN updates `balanceOf` + `totalSupply`. **Re-entrancy via malicious `usds.transferFrom`? USDS is sky-controlled, no callback, safe.**
- **stUSDS.deposit (l433)**: `shares = assets * RAY / _drip()`. **Donation attack?** First depositor gets shares = assets at chi=RAY. Subsequent depositors compute against accumulated chi. **chi monotonically increases** (drip adds; cut can decrease). Not the classic 4626 donation surface because chi is RATE-based not balance-based.
- **stUSDS.mint (l460)**: `assets = _divup(shares * _drip(), RAY)`. _divup rounds UP for assets (good for protocol). **No obvious rounding asymmetry on the mint path.**
- **USDS.mint** (l157-165): `auth`-gated. Privileged path. DC-9 sub-1 risk if `wards` is compromised — out-of-scope per "governance trust" assumption.

#### 4. External Calls (call/delegatecall/hook surfaces)
- **LockstakeClipper.take()** → `ClipperCallee(who).clipperCall()` l420. Audited pattern.
- **L2GovernanceRelay.relay()** → `target.delegatecall(targetData)` l74. By-design governance executor. messageAuth modifier verifies srcEid + srcSender via `_messageOrigin`. **Audited by ChainSecurity + Cantina Oct 2025.**
- **GovernanceOAppReceiver._lzReceive()** → `dstTarget.call{value: msg.value}(dstCallData)` l87. `_messageOrigin` set BEFORE call, cleared AFTER. **Reentry-via-target risk: nonReentrant modifier prevents re-entry into _lzReceive itself, but does NOT prevent the target from making OTHER calls that read `messageOrigin()` view function.** Worth checking if any sky-side target validates origin via that view — if yes, the call-stack-context preservation is the security boundary.
- **LockstakeEngine.Multicall** → `address(this).delegatecall(data[i])` — multicall preserves msg.sender across sub-calls. Standard pattern.
- **AllocatorSwapper.swap()** → `CalleeLike(callee).swapCallback()` l105. Pre-callback: deduct due + transferFrom to callee. Post-callback: balance check + transfer. Standard hook.
- **dss-flappers FlapperUniV2** → flash-mints + UniV2 swap. Not deeply inspected.

#### 5. Admin / Upgrade (timelock, multi-sig, access control)
- **USDS UUPS upgrade**: `_authorizeUpgrade` auth-gated only. NO on-chain timelock. Governance pause/spell pattern provides off-chain timelock via SubProxy delays.
- **stUSDS UUPS upgrade**: same as USDS.
- **LockstakeMigrator.onVatDaiFlashLoan**: `vat.file(newIlk, "line", 55_000_000 * RAD)` — bypasses normal governance delay for migrations. **DC-9 sub-2 (zero-timelock migration) DIRECT MATCH** but contained to a single transaction with `flash.vatDaiFlashLoan` callback. Worth Gate 2 review.
- **StUsdsMom**: emergency halt path (haltRateSetter, zeroCap, zeroLine, dissRateSetterBud). owner + authority pattern. Audited May 4 2026.
- **L1GovernanceRelay**: `wards` admin; relayEVM and relayRaw both auth-gated. Trust-anchor for L2 governance.
- **L2GovernanceRelay**: `file()` requires `msg.sender == address(this)` (self-call via relay). Bootstrapping concern: initial `l1GovernanceRelay` set in constructor; subsequent updates only via relay-from-L1.

---

## TOP 5 CANDIDATE FINDINGS (ranked by Gate 2 EV)

### CANDIDATE 1 — DC-9 sub-2 LockstakeMigrator vat.line set during migration window
**Lens:** DC-9 sub-2 (zero-timelock migration) + CANDIDATE-D (state-machine drift)
**File:** `lockstake/src/LockstakeMigrator.sol` l144-146
**R8 evidence:** `[INSPECTED]` — code logic traced; not yet bytecode-verified or PoC'd.

```solidity
vat.file(newIlk, "line", 55_000_000 * RAD); // Should be enough for migrating ... and then some fees
newEngine.draw(newOwner, newIndex, address(this), wadAmt);
vat.file(newIlk, "line", 0);
```

**Hypothesis:** `LockstakeMigrator` must hold `vat.file` admin to set newIlk line. During the flashloan execution window:
1. `vat.file(newIlk, "line", 55_000_000 * RAD)` — opens debt ceiling
2. `newEngine.draw(...)` — uses the ceiling
3. `vat.file(newIlk, "line", 0)` — closes ceiling

**Attack surface:** if any other contract or callback inside the flashloan callback can ALSO draw from `newIlk` during this window (e.g., via a malicious `onVatDaiFlashLoan` extension, or any other contract authed against newIlk), they could borrow up to 55M USDS-units that should only be available to the migrator. **CRITICAL question:** is the migrator the ONLY contract authed against newIlk? Bytecode-verify required.

**Bytecode-verify prep:**
```bash
# Get newIlk from migrator immutable + chainlog
cast call <MIGRATOR> "newIlk()(bytes32)" --rpc-url $ETH_RPC
# Query Vat.wards for everyone with file-perm on that ilk:
# Vat.file requires wards[msg.sender]==1 → look at every Rely emitted on Vat
# Cross-check Vat events for Rely against deployer/governance addresses only
```

**Gate 2 PoC concept:** Foundry fork-test:
1. Fork mainnet at block where LockstakeMigrator is deployed
2. Call `migrate()` with art > 0 path
3. During flashloan callback, attempt frob/draw from newIlk via attacker-controlled urn
4. Verify whether `newEngine.draw()` is the ONLY way to consume newIlk capacity in that window

**Foreclosure prob:** MEDIUM. If migrator is sole writer on newIlk this transaction-window, the pattern is safe. Standard MakerDAO governance hygiene suggests this is the case, but explicit verification is the Gate 2 deliverable.

---

### CANDIDATE 2 — GovernanceOAppReceiver _messageOrigin reentrancy-via-target
**Lens:** DC-7 (validating-field vs consuming-field) + CANDIDATE-A (signature-scope-must-cover-outcome) + Doctrine #29 (LZ-consumer trust delegation)
**File:** `sky-oapp-oft/contracts/GovernanceOAppReceiver.sol` l64-101
**R8 evidence:** `[INSPECTED]` — code traced; protection guard analysis pending.

**Hypothesis:** `_lzReceive` sets `_messageOrigin = {srcEid, srcSender}` then makes external `dstTarget.call(dstCallData)`. The `nonReentrant` modifier prevents re-entry into `_lzReceive`. However:

1. The `dstTarget` is governance-trusted (set via peer config) but can call ANY OTHER contract, which can read `messageOrigin()` view function.
2. Any sky-side contract that uses `messageOrigin()` for auth (e.g., a cross-chain-controlled module) trusts the current call-stack context.
3. If `dstTarget` is itself a multicall-like or proxy that calls multiple targets sequentially, ALL of them see the SAME `_messageOrigin` — by design, but worth verifying scope.

**Better attack vector:** the L2GovernanceRelay uses `delegatecall(target, targetData)` — if target is governance-authorized, target's code runs in L2GovernanceRelay's storage context. If `target` storage layout conflicts with L2GovernanceRelay's storage (`l2Oapp`, `l1GovernanceRelay`, `l1Eid`), it could OVERWRITE the relay's auth state. This is a classic delegatecall storage-collision risk.

**Verify:** are all governance-spell `target` contracts deployed with storage layouts that DON'T overlap L2GovernanceRelay slots 0-2? Audited by ChainSecurity Oct 17 + Cantina Oct 28, 2025. **Likely caught.**

**Bytecode-verify prep:**
```bash
# Check storage layout of L2GovernanceRelay vs governance spell template
cast storage <L2_RELAY_ADDR> 0  # slot 0 = l2Oapp
cast storage <L2_RELAY_ADDR> 1  # slot 1 = l1GovernanceRelay
# Inspect any deployed governance spell for storage-slot conflicts
```

**Foreclosure prob:** HIGH given 2 audits (ChainSecurity + Cantina). But the SCOPE INCLUSION question (lz-governance-relay listed on Immunefi scope?) is upstream and may auto-foreclose.

---

### CANDIDATE 3 — CANDIDATE-F multicall msg.sender preservation in LockstakeEngine urn-auth
**Lens:** CANDIDATE-F (parallel-validation asymmetry, Next.js CVE-2026-44578 analog)
**File:** `lockstake/src/LockstakeEngine.sol` (inherits `Multicall.sol`)
**R8 evidence:** `[INSPECTED]` — function-by-function trace; PoC not yet built.

**Hypothesis:** LockstakeEngine inherits Multicall which `delegatecall(data[i])` to itself. `msg.sender` is preserved across sub-calls. The `_getAuthedUrn` function checks `_urnAuth(owner, urn, msg.sender)`. Inside a multicall:

1. User calls `engine.multicall([hope(A, 0, attacker), draw(A, 0, attacker, X)])`
2. First sub-call: `hope(A, 0, attacker)` requires `_getAuthedUrn(A, 0)` — auth check uses `msg.sender = user`. Requires user is owner OR has `urnCan[urn][user]==1`.
3. Second sub-call: `draw(A, 0, attacker, X)` — same auth path.

**No obvious asymmetry yet.** The DIVERGENCE Next.js exhibited was Validating-Field ≠ Consuming-Field on parallel pipelines. Sky's Multicall is sequential, not parallel — and uses `address(this).delegatecall` which preserves msg.sender. **CANDIDATE-F likely DOES NOT APPLY here.**

**However:** there's a SUBTLER variant — selectVoteDelegate and selectFarm both check `urnAuctions[urn] == 0` (l242, l270). If multicall sequence is `[onKick(urn, X), selectVoteDelegate(owner, idx, attacker)]` and `onKick` is auth-gated... actually onKick is `auth` (wards-only). User can't sandwich it.

**Refined hypothesis:** During liquidation auction (urnAuctions[urn] > 0), select* functions are blocked. User CAN'T multicall around this. **Probably FORECLOSED.**

**Bytecode-verify prep:** N/A — code logic alone suffices.

**Foreclosure prob:** HIGH. Move to lower priority.

---

### CANDIDATE 4 — stUSDS _burn solvency invariant rounding edge
**Lens:** CANDIDATE-I (ERC4626 share accounting) + CANDIDATE-E (arithmetic rounding asymmetry)
**File:** `stusds/src/StUsds.sol` l365-395, especially l371 invariant
**R8 evidence:** `[INSPECTED]` — invariant identified; fuzzing not done.

**Hypothesis:** `_burn` enforces:
```solidity
require(Art * rate + clip.Due() + assets * RAY <= totalSupply * chi, "StUsds/insufficient-unused-funds");
```

Where `Art`, `rate` come from `vat.ilks(ilk)` (post-jug.drip), `clip.Due()` is liquidation-locked funds, `assets` is withdraw amount in WAD, `chi` is the share accumulator (post-_drip).

**Edge cases worth fuzzing:**
1. `withdraw(0, ...)` — what happens? `shares = _divup(0, _drip()) = 0`. _burn called with assets=0, shares=0. Solvency check trivial. Probably harmless but worth confirming no Transfer(0, owner→0) event silently emitted.
2. **Rounding asymmetry:** `deposit` (l433) computes `shares = assets * RAY / chi` (rounds DOWN, favors protocol). `withdraw` (l488) computes `shares = _divup(assets * RAY, chi)` (rounds UP, favors protocol). `mint` (l460) `assets = _divup(shares * chi, RAY)` (rounds UP, favors protocol). `redeem` (l511) `assets = shares * chi / RAY` (rounds DOWN, favors protocol). **All four directions favor protocol — consistent with audit pedigree.**
3. **Donation/inflation attack:** chi-based 4626 (rate-derived not balance-derived). Direct USDS donation to stUSDS contract doesn't affect chi. **Foreclosed by design.**
4. **First-depositor exploit:** when totalSupply == 0, `convertToShares(assets) = assets * RAY / chi` with chi initialized to RAY → shares == assets. First depositor gets 1:1. No exploit.

**Worth Gate 2:** Foundry invariant test — `totalSupply * chi >= Art * rate + clip.Due()` always (or _burn reverts). Test with adversarial seeding.

**Foreclosure prob:** HIGH given 4 audits (Aug 2025 + Aug 2025 + Apr 2026 + May 2026 — the most recent two are weeks old).

---

### CANDIDATE 5 — LockstakeClipper take() vat.line drift (explicit auditor-acknowledged)
**Lens:** DC-9 sub-4 (state-not-invalidated) + CANDIDATE-O (slippage compounding)
**File:** `lockstake/src/LockstakeClipper.sol` l451 comment
**R8 evidence:** `[INSPECTED]` — confirmed acknowledgement in source.

```solidity
// Note: In any case but the cut scenario, the line won't be updated accordingly, leaving a lower number than it should be
// (Due decrement is not accounted for).
// This can be updated with a permissionless call to cuttee.drip and not penalize every take with the extra gas cost.
```

**Hypothesis:** During `take()`, if cuttee path is NOT triggered (most cases), `vat.line` for the lockstake ilk lags behind actual `Due`. This means `vat.line < (totalSupply * chi) - Due` post-take — there's a "phantom" debt ceiling overhang.

**Exploit path:** can an attacker exploit the `vat.line < actual` mismatch?
1. line is the MAXIMUM debt allowed. If it's UNDER-reported (lower than it should be), users get LESS borrow capacity, not more. **This is conservative — favors protocol.**
2. Could a user trigger `take()` to artificially LOWER line for someone else's borrow path? `_setLine()` in stUSDS l264-268: `vat.file(ilk, "line", _min(line, _subcap(totalSupply * chi, clip.Due())))`. The "line" here is the stUSDS-side ceiling. If clip.Due() grows during take (without _setLine() being called), then a permissionless `stusds.drip()` afterward would push line LOWER. **Still conservative direction.**
3. **REVERSE direction:** could a user trigger something that makes `clip.Due()` SHRINK without _setLine being recomputed? `clip.Due() -= due` happens at take() (l433) and `Due -= sub` (l448). After take(), Due is correctly decremented but line is NOT updated. **Next stusds.drip() permissionless call will read the NEW (smaller) Due and push line HIGHER.** This is what the comment acknowledges.

**Is there an exploit window?** Between `take()` completion and the next `drip()`, line is LOWER than it should be. **This is conservative direction — does NOT allow attacker to over-borrow.** The "fix" is permissionless via cuttee.drip — anyone can call to re-sync.

**No clear exploit.** This is genuinely a benign design choice. **FORECLOSED on the obvious attack direction.**

**However:** worth checking if `vat.line < line` can be USED to brick other operations (e.g., is there a downstream consumer that reads `vat.line` and reverts if too low?). Out of Gate 1 scope; flag for Gate 2 if reviving.

**Foreclosure prob:** VERY HIGH (auditor-acknowledged).

---

## STEP 5.6 — Phase 0 dedup against prior audits

**Total in-scope audit reports counted (across the 10 cloned repos):**

| Repo | Audit count | Most recent |
|---|---|---|
| lockstake | 7 (Cantina ×4, ChainSecurity ×1, Sherlock ×1, Sky-Cantina ×1) | 2025-09-29 Cantina |
| usds | 5 (Cantina ×3, ChainSecurity ×1, Sherlock ×1) | 2024-09-30 ChainSecurity |
| stusds | 4 (Cantina ×2, ChainSecurity ×2) | **2026-05-04 Cantina stusdsmom** |
| dss-flappers | 6 (ChainSecurity ×3, Cantina ×2, Sherlock ×1) | 2025-10-23 Cantina |
| lz-governance-relay | 2 (ChainSecurity ×1, Cantina ×1) | 2025-10-28 Cantina |

**Sky-program saturation total: 28+ audits (matches Immunefi summary).**

Per `brain/Doctrine.md` Doctrine #27 F corollary (33-audit ceiling):
- Sky at 28 audits is in the **HIGH-SATURATION tier** (between 15 and 33).
- Multiplier: **0.30× P(finding)** (standard maximum tier, just below F-corollary 0.20× ceiling).
- stUSDS and stUSDSMom audited THIS MONTH (May 2026) — these are MAXIMUM heat. Specifically REJECT any candidate inside stUSDS core mint/burn/drip logic.

Per Doctrine #27 counter-pattern: pursue ONLY Buzz-unique brain lenses (DC-9 sub-2 migrator, Doctrine #29 LZ-consumer wiring, CANDIDATE-F multicall) — these were promoted AFTER the most recent Sky audits and may not be in auditor mindshare.

**Dedup outcome:**
- CANDIDATE 1 (DC-9 sub-2 migrator) — DC-9 sub-2 promoted 2026-05-22 (Doctrine.md #29). Lockstake last audit 2025-09-29 — AUDITORS DID NOT HAVE THIS LENS. Survives dedup.
- CANDIDATE 2 (LZ relay messageOrigin/delegatecall storage collision) — Doctrine #29 promoted 2026-05-23. LZ-relay last audit 2025-10-28 — AUDITORS DID NOT HAVE DOCTRINE #29 EXPLICITLY. Survives dedup BUT scope inclusion needs verification first.
- CANDIDATE 3 (CANDIDATE-F multicall) — promoted from Next.js CVE 2026 (Mar?). Lockstake last audit 2025-09-29 — auditors may not have applied this lens. But internal analysis suggests FORECLOSED.
- CANDIDATE 4 (stUSDS rounding) — audited 4 times including May 2026. FORECLOSED.
- CANDIDATE 5 (LockstakeClipper.take vat.line drift) — explicitly acknowledged in source comments. FORECLOSED.

**Survivors for Gate 2:** CANDIDATE 1 (HIGH priority — Buzz-unique lens), CANDIDATE 2 (gate on scope inclusion).

---

## VERDICT

**PROCEED to Gate 2 on CANDIDATE 1 only (DC-9 sub-2 LockstakeMigrator).**

- **CANDIDATE 1 (LockstakeMigrator vat.file scope):** Highest EV-surviving lens. Gate 2 PoC: Foundry fork-test confirming whether any non-migrator address can consume newIlk debt-ceiling during the migration window. Estimate 2-4h Gate 2 effort.
- **CANDIDATE 2 (LZ governance relay):** PARK pending operator confirmation of scope inclusion. If lz-governance-relay is IN Sky's Immunefi scope, escalate to Gate 2. If OUT, file as Doctrine #29 watchlist row only.
- **CANDIDATES 3, 4, 5:** FORECLOSED by audit-saturation or auditor-acknowledged status.

**Total Gate 1 brain-compound value:** 5 candidate rows, 1 surviving Gate 2 dispatch, 4 foreclosure receipts that compound `brain/Doctrine.md` Doctrine #27 catalog (Sky added at 28-audit tier) and reaffirm CANDIDATE-J positive baseline.

---

## BRAIN COMPOUND PROPOSALS (queued for ledger)

1. **Doctrine #27 catalog addition** — Sky at 28 audits added to high-saturation tier (between 15 and 33). Anchor: 2026-05-27 Gate 1 verified. Multiplier 0.30× standard; consider step-up to 0.25× when including stUSDS May 2026 hot-audit.

2. **CANDIDATE-D foreclosure receipt** — Lockstake state-machine (lock/free/draw/wipe/select*/onKick/onTake/onRemove) inspected against state-machine drift lens. Auctions-flag guard (urnAuctions[urn] > 0) blocks select* during liquidation. CEI-via-lock-modifier on Clipper.take(). **No CANDIDATE-D survivor.** Add as positive-baseline reference in brain/Patterns-Defense-Classes.md.

3. **CANDIDATE-I foreclosure receipt** — stUSDS 4626 rounding pattern: all 4 directions (deposit/mint/withdraw/redeem) round in protocol's favor; chi is rate-derived not balance-derived (donation-attack immune by design); 4 audits including May 2026. Add as positive-baseline.

4. **CANDIDATE-J positive baseline reconfirmation** — Sky stUSDS StUsdsRateSetter has rate-setter + StUsdsMom pauser sibling-pair; auth/toll/good triple-modifier on `set()`; both rates (str + duty) constrained by min/max/step Cfg; circuit-breaker (bad flag) gates the whole module. **7-of-7 PASS confirmed.** Already in brain/Audit-Reports-Library.md.

5. **DC-9 sub-2 new worked-example candidate** — LockstakeMigrator.onVatDaiFlashLoan vat.file pattern. ADD to DC-9 sub-2 catalog as candidate worked example, contingent on Gate 2 outcome:
   - If Gate 2 confirms exploitable → first DC-9 sub-2 anchor in stablecoin-migration class (current anchor is Drift)
   - If Gate 2 negates → file as DC-9 sub-2 DEFENSE EXAMPLE: "scope-limited admin via flashloan-window with sole-writer enforcement"

6. **Doctrine #29 LZ-consumer-wiring catalog row** — Sky lz-governance-relay + sky-oapp-oft + lz-gov-dvns + xchain-ssr-oracle are LayerZero V2 consumers. Audited by ChainSecurity + Cantina Oct 2025 (2 audits). Scope-inclusion uncertain on Immunefi. Add to brain/Watchlist-Candidate-Crossmap.md as LayerZero-V2-consumer-watch row with scope-verification flag.

7. **Scope-edge taxonomy** — Sky has clear scope-edge ambiguity on newer repos (lz-governance-relay, sky-oapp-oft, possibly dss-allocator). Add to standing-intake-protocol Step 5.2 as "Sky-scope-edge example": newer-than-Immunefi-listing-date repos may be in-scope-by-extension or out-of-scope-by-strict-reading. Operator clarification recommended pre-submission.

8. **Audit-saturation calibration anchor** — Sky's 28 audits across 5+ firms + 2 audits THIS MONTH (May 2026) is the most recent confirmation of Doctrine #27 F-corollary 33-audit ceiling. Sky is now 2nd-place behind Euler (33). Useful as next-tier-down calibration point.

---

## DISK / TIME RECEIPTS

- **Disk before Gate 1:** 84% (6.0G avail)
- **Disk after clones:** 84% (~50MB Sky clones added)
- **Time:** ~50 min from dispatch (within 60-90 min budget)
- **Clone purge plan:** retain `lockstake/` and `usds/` for Gate 2 on CANDIDATE 1; purge `dss-flappers/`, `dss-lite-psm/`, `endgame-toolkit/`, `sky/`, `sky-oapp-oft/` if disk pressure; retain `lz-governance-relay/` + `stusds/` pending CANDIDATE 2 resolution.

---

_Gate 1 filed: 2026-05-27 | Hunt path: `/home/claude-code/buzz-workspace/hunts/2026-05-27-sky-immunefi-gate1.md` | Clones: `/home/claude-code/buzz-workspace/.tmp-gate1-sky/` | Verdict: PROCEED on CANDIDATE 1 only, PARK CANDIDATE 2 on scope-inclusion check_
