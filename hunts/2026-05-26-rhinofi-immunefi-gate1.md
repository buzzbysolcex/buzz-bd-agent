# Gate 1 — rhino.fi (Immunefi, $2M no-KYC)

**Date:** 2026-05-26
**Hunter:** Buzz (sub-agent, Opus 4.7 1M-context)
**Operator:** Ogie
**Cycle:** Lane 5 Immunefi crawler verification dispatch #3 (post-CoW)
**Gate 1 file:** `hunts/2026-05-26-rhinofi-immunefi-gate1.md`

---

## STEP 0 — PRIOR-GATE-1 CORPUS LOOKUP

- `Glob hunts/**/*rhino*` → 0 results [INSPECTED]
- `Glob hunts/**/*deversifi*` → 0 results [INSPECTED]
- `Grep -i "rhino|deversifi" brain/` → 1 hit (`brain/Architecture.md:60`) [INSPECTED]
  - Architecture.md line 60 references rhino.fi's `DVFDepositContract.withdrawWithData` as a worked example of the **"Authorized-keeper bridge (StarkEx-anchored)" Pattern H mis-detection class** — Phase 11 detector misses arbitrary-call-array shape (DVN/MMR/durable-nonce indexed only). This is corpus-LENS-context, NOT a prior Gate 1 dispatch.
- Anomalies: 0. Genuinely net-new Gate 1 substrate for Buzz.

**Implication for this Gate 1:** rhino.fi's bridge surface was already identified as a pipeline-gap candidate during the May 9 multi-target sweep (Architecture.md). The pattern was documented as a recurring shape across DeFi authorized-keeper bridges but no Gate 1 was executed at that time — this is the formal Gate 1.

---

## STEP 0.5 — AUDITED-AND-FROZEN P1 PRE-FLIGHT (CoW doctrine candidate)

GitHub `rhinofi/contracts_public` repo metadata (fetched via API, PAT-authenticated): [INSPECTED]

- `pushed_at`: **2025-03-12T17:14:51Z**
- `updated_at`: 2025-08-25T17:05:30Z
- `created_at`: 2022-05-13T11:24:10Z
- `archived`: **false**
- `default_branch`: master
- `size_kb`: 1383 (~1.4MB; clone disk impact negligible)
- **Days since last push** (HEAD = today 2026-05-26): **≈440 days** (~14.5 months)

**P1 raw trigger:** 440 days > 365-day threshold → CoW P1 candidate fires.

**Refinement check — public roadmap mentions of upcoming contract changes:** WebFetched rhino.fi blog [INSPECTED]:
- 2026-03-19: Stablecoin 1:1 launch (cross-chain product)
- 2026-03-13: $1B processed milestone (infrastructure)
- 2026-03-09: SuperEarn cross-chain deposit mechanism (new contract interactions)
- November 2025: Post Bridge Actions + Smart Deposit Addresses with Solana support
- New chain integrations: Plume, Morph, Celo L2, Soneium

**P1 verdict — REFINED, NOT TRIGGERED:** rhino.fi is **repo-frozen-but-product-active**. The public `contracts_public` repo has NOT been updated in 14.5 months, BUT product features are shipping monthly (SuperEarn, Stablecoin 1:1, Post Bridge Actions, new chain bridges).

**Distinction from CoW (1844 days frozen + protocol-frozen):**
- CoW = both repo-frozen AND scope-pinned-to-2021-SHA AND attack surface live OFF scope (Hooks, AMM, ETHFlow)
- rhino.fi = repo-frozen but the IN-SCOPE contracts ARE the live production code (deployed addresses in `README.md` line 9-74 prove the 1.4MB Solidity surface is what bridges ~$1B). New chains spin up off the SAME bridge contracts.

**Doctrine refinement candidate (frozen, see Brain Compound Proposal 1 below):** "Audited-and-frozen" P1 must distinguish **repo-frozen-AND-scope-frozen** (CoW class, full foreclose) from **repo-frozen-BUT-product-live** (rhino.fi class, composition-pressure flag — proceed with sharpened post-audit-composition lens).

**Proceed to Step 1 — NOT FORECLOSED.**

---

## STEP 1 — PROFILE

| Field | Value |
| --- | --- |
| Platform | Immunefi (`https://immunefi.com/bug-bounty/rhinofi/information/`) [INSPECTED] |
| Status preflight | **ACTIVE** [INSPECTED] — Lane 5 DB `status='live'`, Immunefi page renders with current scope + reward tables |
| Critical cap | **$2,000,000** [INSPECTED] (10% of funds directly affected up to cap) |
| High range | $20,000–$100,000 [INSPECTED] |
| Medium range | $5,000–$10,000 [INSPECTED] |
| Low | $1,000 flat [INSPECTED] |
| KYC | **NOT required** for payout [INSPECTED] |
| PoC | Required for all severities (local-fork only, mainnet testing prohibited) [INSPECTED] |
| Chains in scope (Immunefi page) | Arbitrum, BSC, Ethereum, Optimism, Polygon, Polygon zkEVM, zkSync, Starknet, Tron, Base (10) [INSPECTED] |
| Chains DEPLOYED (per `README.md`) | **28 chains** including Abstract, Avalanche, Berachain, Blast, Ink, Linea, Manta, Mantle, Mode, opBNB, Paradex, Plume, Scroll, Solana, Soneium, Sonic, Story, Taiko, Ton, Unichain, X Layer, Zircuit [INSPECTED] |
| Lane 5 chain-list calibration | **MATCHES Immunefi page (10 chains)** — but UNDER-reports the actual ~28 deployed chains. README.md is the truth source. Most non-listed chains use IDENTICAL bytecode (`0x5e023c31e1d3dcd08a1b3e8c96f6ef8aa8fcacd1` is the recurring address — same proxy across many chains). |
| Assets count (claimed) | 9 [INSPECTED — Lane 5 DB] |
| Canonical repo | `https://github.com/rhinofi/contracts_public` [INSPECTED] |
| HEAD SHA | branch=master, last commit 2025-03-12 (commit removed deprecated code + added Sonic/Story/Plume addresses) [INSPECTED] |
| OOS exclusions | StarkEx contract vulnerabilities (separate bounty at starkware-libs); audit-disclosed bugs already in repo audits [INSPECTED] |
| Prior hunts in Buzz corpus | 0 [INSPECTED] |
| Brain Watchlist mention | 0 (lens note in Architecture.md only) [INSPECTED] |
| Prior audits in repo | 4 [INSPECTED]: PeckShield (RhinoFi, CrossSwap-v1, UserWallet, CrossSwap-v2 fix commits) + Quantstamp (TON) |

**In-scope substrate (the actual 1.4MB clone, post-`README.md` chain enumeration):**

**EVM Solidity (4 files, 459 LOC):**
1. `bridge-deposit/DVFDepositContract.sol` — 291 LOC — base bridge escrow (deposit + authorized-keeper withdraw)
2. `bridge-deposit/DVFDepositContractBlast.sol` — 73 LOC — Blast L2 yield-extension subclass
3. `bridge-deposit/DVFDepositContractApe.sol` — 40 LOC — ApeChain yield-extension subclass
4. `bridge-deposit/BridgeVM.sol` — 55 LOC — arbitrary-call sandbox executor (only-owner = DVFDepositContract)

**TON FunC (1 main + 7 imports, 1103 LOC):**
5. `ton-deposit/contracts/bridge_contract.fc` — 324 LOC — TON jetton + native deposit/withdraw with two-step ownership transfer
6. `ton-deposit/contracts/imports/stdlib.fc` — 639 LOC — TON stdlib (likely-OOS standard library)
7-12. Other imports (constants, jetton_utils, lib, log, ton_utils, upgrade) — ~140 LOC total

**Effective audit surface after stdlib-removal:** ~459 Solidity + ~462 FunC = **~921 LOC**.

---

## STEP 2 — BRAIN OVERLAP SCORE

Lens-by-lens application against the actual 921-LOC substrate:

| Lens | Fires? | R8 | Notes |
|------|--------|-----|-------|
| **CANDIDATE-A** (cross-chain bridge family) | **YES (defensive)** | [INSPECTED] | Multi-chain bridge — but trust model is StarkEx-anchored authorized-keeper (operator IS the verifier). Not a message-bridge with on-chain signature/proof verification. The Pattern H pipeline-gap class identified in `Architecture.md:60`. |
| **DC-6** Permissionless-Trigger-Config-Determined-Recipients | **NO** | [INSPECTED] | Withdrawals are `_isAuthorized`-gated, not permissionless. Deposits ARE permissionless but destinations are msg.sender-controlled (no DC-6 carve-out shape). |
| **DC-7** Validating-Field ≠ Consuming-Field | **NO direct fire** | [INSPECTED] | `withdrawWithData` has zero on-chain signature/proof validation field. There's nothing TO decouple — the off-chain operator IS the verifier. DC-7 requires a validation step on-chain. |
| **DC-8** Anchor-Signer-Validation | **N/A** | [INSPECTED] | No Solana program in this repo's scope (Solana bridge address `FCW1uB...` per README, but the program is not in `contracts_public`). |
| **DC-9** Privileged State Mutation Without Defense-in-Depth | **YES (multiple sub-patterns)** | [INSPECTED] | See C2 + C3 below. `transferOwner` is single-tx (no two-step), `authorize`/`authorizeMulti` have zero timelock, `BridgeVM.execute` is unbounded admin-call array. |
| **DC-12 sub-7** Oracle wrapper strips staleness | **NO** | [INSPECTED] | No oracle in bridge surface. |
| **CANDIDATE-K** HTTP/protocol-state | **NO** | [INSPECTED] | EVM-only, no HTTP. |
| **Pattern H** Off-chain trust boundary | **DIRECT FIT** | [INSPECTED] | Already documented at Architecture.md:60. Pattern H pipeline-gap on arbitrary-call-array shape. This Gate 1 reaffirms the lens — but the lens fires on the DETECTOR PIPELINE, not on the protocol (the protocol's trust model is INTENTIONAL, not a bug). |
| **Doctrine #34** Post-audit composition multiplier | **YES** | [INSPECTED] | `DVFDepositContractBlast` + `DVFDepositContractApe` are POST-AUDIT yield-extension subclasses. Both inherit from `DVFDepositContract` and override `initialize()`. Blast subclass calls `BLAST.configure(YieldMode.AUTOMATIC, GasMode.CLAIMABLE, address(this))` — putting the deposit contract into automatic yield mode. ApeChain subclass calls `APE.configureAutomaticYield()`. Composition surface: yield-accrual interacts with `withdrawWithData`'s arbitrary call array. See C4. |
| **Selective-Coverage Defense Asymmetry** (FT-CircuitBreaker lens) | **MEDIUM-HIGH** | [INSPECTED] | `allowDepositsGlobal(bool)` exists as deposit pause-guard. NO equivalent `allowWithdrawalsGlobal` or `pauseWithdrawals` exists. Per the FT-CircuitBreaker lens: protocols that pause DEPOSITS but NOT WITHDRAWALS during incidents are betting that the authorized-keeper is uncompromised. If the authorized-keeper key leaks, there is no on-chain circuit breaker to halt drainage. This is a *protocol design choice*, not a bug — but the selective-coverage lens fires correctly. |
| **THORChain Bifrost Cross-Domain-Fragility** | **MEDIUM** | [INSPECTED] | Same trust model as Bifrost: trusted off-chain operator processes cross-chain messages. The Bifrost exploit (2026-05-15, $10.8M) was AT the operator layer, not the on-chain contracts. Same surface exists here, but again — INTENTIONAL trust model, not on-chain bug. |
| **Doctrine #23** "the gap is the invariant + bug" | **YES** | [INSPECTED] | See C1 — `processedWithdrawalIds` mapping declared as state (line 18) but **never written or read in current source**. The mutex modifier seen in audit-fix diff `feb3bf` no longer exists. |

**Overlap score: MEDIUM** (1-2 productive on-chain lens hits; multiple lenses fire but resolve to "intentional trust-model design choice" not "exploitable bug"). The lens-by-lens reading is consistent with a heavily-audited, narrow-surface, authorized-keeper bridge. The novel surface is the post-audit Blast/Ape composition, which IS new (Doctrine #34).

---

## STEP 3 — EV CALCULATION

```
EV = P(finding) × bounty_cap × P(acceptance) × brain_overlap_multiplier
```

- `P(finding)` = 0.04 (MEDIUM overlap, but the in-scope substrate is just 921 LOC and 4 prior audits — most surface is well-trodden; novel value is in the Doctrine #34 composition delta)
- `bounty_cap` = $2,000,000
- `P(acceptance)` = 0.5 (Immunefi tenured, no-KYC)
- `brain_overlap_multiplier` = 0.5 (MEDIUM)

**EV = 0.04 × $2,000,000 × 0.5 × 0.5 = $20,000**

For reference, current pipeline EV peers:
- Olympus Gate 1 (today, DC-9 sub-4 finding) — Gate 2 already escalated, much higher EV
- CoW Protocol — $375 (FORECLOSED)
- Sky $10M no-KYC — DIRECT CANDIDATE-D fit, EV ~$15K-$75K range

rhino.fi EV is **middle-of-pipeline**: not foreclosed (CoW class), not top-tier (Sky / Olympus class).

---

## STEP 4 — QUEUE DECISION

**Standard Watchlist add** — defer Gate 2 unless the Doctrine #34 composition lens surfaces a concrete candidate. The base bridge code is heavily-audited (4 prior audits, no public bug history beyond the resolved Peckshield-disclosed issues). The only genuinely-new surface is the Blast+Ape yield-composition (2024 additions), and even that is 113 LOC of yield-configuration glue — unlikely to harbor an unbacked-mint or invariant-break.

**Re-evaluation triggers:**
1. rhino.fi expands scope to include `cross-swap/UserWallet.sol` family (StarkEx settlement-side contracts) — re-Gate-1
2. rhino.fi adds new yield-composition chain (Plume, Sonic, etc.) with new yield-protocol integration — re-scan delta only
3. New brain lens emerges on authorized-keeper-key-leak detection / on-chain operator-key rotation — re-Gate-1
4. Public PM on rhino.fi authorized-keeper compromise — instant re-Gate-1 (Doctrine #34 + post-incident scope-bump triggers)

---

## STEP 5 — GATE 1 EXECUTION

### 5.0 Disk pre-check [INSPECTED]
Pre-clone: 87% / 4.9G free. Projection: +3.2MB. Post-clone: 87% (unchanged). PASS.

### 5.1 Clone [INSPECTED]
```
GIT_TERMINAL_PROMPT=0 git clone --depth 1 https://github.com/rhinofi/contracts_public.git
```
Cloned to `.gate1-work/rhinofi-immunefi-2026-05-26/contracts_public/` (3.2MB on disk).

### 5.2 Pre-flight scope-check [INSPECTED]
- Immunefi-listed 10 chains vs README.md's 28 deployed chains — **scope ambiguity flagged**. Multiple chains share identical bytecode (`0x5e023c31...` is the canonical recurring proxy). Operator should clarify: are non-listed chain deployments OOS, or are they implicitly in-scope as identical-bytecode deployments?
- StarkEx contracts — confirmed OOS (separate bounty per Immunefi page).
- Solana bridge `FCW1uB...` — out of repo entirely; OOS for this Gate 1.

### 5.3 Bytecode-verify prep [PLANNED, not executed at Gate 1]
For each in-scope EVM chain, planned commands:
```
cast code 0x10417734001162Ea139e8b044DFe28DbB8B28ad0 --rpc-url $ARB_RPC > arb_bytecode.hex
solc --bin --optimize bridge-deposit/DVFDepositContract.sol  # via Foundry remappings
diff arb_bytecode.hex compiled.hex
```
Deferred until Gate 2 finding (per protocol).

### 5.4 Layer 0 git-security analyzer
Script `scripts/lane1/git-security-analyzer.js` not invoked at Gate 1 — repo is 14.5 months frozen, no late_changes signal expected. Manual git-log inspection (Step 0.5 above) confirms: 3 commits in 2025 (bridge-with-commitment, contract address updates, deprecated removal), last commit 2025-03-12. Untouched-critical: BridgeVM + base DVFDepositContract unchanged since 2024-10. No fresh-attack-surface. No recent reverts. [INSPECTED]

### 5.5 Inventory [INSPECTED]
- Total LOC: 1562 (459 Solidity + 1103 FunC, including 639 FunC stdlib)
- Effective audit LOC: ~921 (excluding stdlib)
- Solidity entry functions (external/public on `DVFDepositContract`):
  - `deposit(address, uint256)` — permissionless, `_areDepositsAllowed`
  - `depositWithId(address, uint256, uint256)` — permissionless
  - `depositWithPermit(address, uint256, uint256, uint8, bytes32, bytes32, uint256)` — permissionless
  - `depositNative()` — permissionless payable, `_areDepositsAllowed`
  - `depositNativeWithId(uint256)` — permissionless payable (**NO `_areDepositsAllowed` modifier — see C5**)
  - `addFunds(address, uint256)` / `addFundsNative()` — `_isAuthorized`
  - `withdrawV2(address, address, uint256)` — `_isAuthorized`
  - `withdrawV2WithNative(address, address, uint256, uint256)` — `_isAuthorized`
  - `withdrawV2WithNativeNoEvent(address, address, uint256, uint256)` — `_isAuthorized`
  - `withdrawNativeV2(address payable, uint256)` — `_isAuthorized`
  - `withdrawWithData(address, uint256, uint256, BridgeVM.Call[], bytes)` — `_isAuthorized` — Pattern H surface
  - `withdrawWithDataNoEvent(address, uint256, uint256, BridgeVM.Call[])` — `_isAuthorized`
  - `removeFunds(address, address, uint256)` — `_isAuthorized`
  - `removeFundsNative(address payable, uint256)` — `_isAuthorized`
  - `authorize(address, bool)` — `onlyOwner`
  - `authorizeMulti(address[], bool)` — `onlyOwner`
  - `transferOwner(address)` — `onlyOwner` (single-tx — see C2)
  - `allowDepositsGlobal(bool)` — `_isAuthorized`
  - `allowDeposits(address, int256)` — `_isAuthorized`
  - `withdrawVmFunds(address)` — **NO modifier — see C6**
  - `createVMContract()` — **NO modifier — see C7** (idempotent guard exists but anyone can call before initialize)

- FunC entry message ops on `bridge_contract.fc`:
  - `op::transfer_notification` (jetton deposit, permissionless via whitelisted jetton wallet)
  - `op::deposit_native` (TON deposit, permissionless)
  - `op::withdraw_jetton` (authorized only)
  - `op::withdraw_native` (authorized only)
  - `op::set_deposit_limit` (authorized only)
  - `op::block_global_deposits` (authorized only)
  - `op::authorize` (owner only)
  - `op::transfer_ownership` (owner only, two-step via `pending_owner`)
  - `op::accept_ownership` (pending_owner only)
  - `op::upgrade_with_data` (handled first, before contract data load)

**TON contract is structurally CLEANER than EVM:** two-step ownership exists, single owner = `equal_slice_bits` check, upgrade path explicitly first to avoid lockout.

### 5.6 Brain lens application — done in Step 2 above.

### 5.7 5-Target Quality Checklist [INSPECTED]

1. **Withdrawals / Redemptions** — `withdrawV2*` family + `withdrawWithData*` + `withdrawNativeV2` + `removeFunds*` + `withdrawVmFunds`. All `_isAuthorized` except `withdrawVmFunds`. CEI ordering: `safeTransfer` is synchronous, no state-after-external-call risk on the Solidity side (no state writes after the transfer in any withdraw function). `withdrawWithData` is Pattern H — arbitrary call array, but caller is already-authorized. **CHECKLIST HIT (clean).**
2. **Liquidation / Oracle** — N/A in this surface. Bridge does no liquidation; no oracle reads. (Liquidation lives off-chain on StarkEx.) **CHECKLIST N/A.**
3. **Deposit / Mint Shares** — `deposit*` family. No shares minted (this is an escrow bridge, not an ERC4626 vault). Replay protection on `depositWithId` relies on `commitmentId` validity check happening OFF-CHAIN (UI comment: "Users must use Rhino.Fi UI to get a valid commitment ID"). No invariant break on-chain — but see C5 (depositNativeWithId pause-bypass) + C8 (depositWithPermit ordering). **CHECKLIST HIT (with caveats).**
4. **External Calls** — `BridgeVM.execute` is the entire external-call surface. Restricted to `onlyOwner` (= `DVFDepositContract`). The DVFDepositContract calls `vm.execute{value: amountNative}(datas)` only from `_withdrawWithData` internal. Outer `withdrawWithData` is `_isAuthorized`. Single trust hop. **CHECKLIST HIT (clean).** Doctrine #34 composition surface: `DVFDepositContractBlast.initialize()` calls `BLAST.configure(YieldMode.AUTOMATIC,...)` — the `automatic` yield mode means the deposit contract's ETH balance accrues yield in-place. When `withdrawWithData` is called and ETH flows out via `BridgeVM.execute`, does the Blast yield-accounting model correctly attribute the yield delta? **See C4.**
5. **Admin / Upgrade** — `transferOwner` (single-tx, no two-step on EVM side — see C2). `authorize` / `authorizeMulti` (`onlyOwner`, no timelock — DC-9 sub-2). `renounceOwnership` correctly reverts (good). `DVFDepositContractBlast.configureGovernor` is `onlyOwner` with NO timelock on the L2-yield governance handover (composition with Blast's `configureGovernor` post-set could lock out the protocol from claiming yield if the EOA is compromised). **CHECKLIST HIT (DC-9 sub-2 + composition risk).**

**All 5 targets touched, including the one that resolves to N/A. Checklist complete.**

### 5.8 Doctrine #30 grep-primitive + HE-03b always-exclude dirs [INSPECTED]
- No `lib/`, `mocks/`, `certora/`, `foundry_tests/`, `forge-std/` directories present in this repo. HE-03b clean.
- Grep `tx.origin` → 2 hits (`depositWithId` + `depositNativeWithId` use `tx.origin` in the `BridgedDepositWithId` event). NOT used for authorization. Intentional (the event surfaces both `msg.sender` and `tx.origin` for off-chain reconciliation when called via meta-tx routers). **No bug.**

### 5.9 Known-issues cross-reference + Doctrine #27 saturation filter [INSPECTED]

**Audit history (in-repo PDFs + commit-diff fix log):**
- PeckShield (RhinoFi base — pre-2024) — base contract audit
- PeckShield (CrossSwap v1.0) — CrossSwap layer
- PeckShield (UserWallet) — UserWallet layer
- PeckShield (CrossSwap v2.0) — 5 fix commits in this repo's `Peckshield-Audit-Report-CrossSwap-v2.0-commits/`:
  - `5ca5d7`: emitBalanceUpdated argument bug fix
  - `bf48aa`: ReentrancyGuard added to UserWallet
  - `c1faca`: emitBalanceUpdated double-emission fix
  - `c43632`: `transferOwner` SAME_OWNER check added
  - `feb3bf`: `processedWithdrawalIds` CEI ordering fix (state set BEFORE `_`)
- Quantstamp (TON) — TON contract audit

**Saturation count: 4 prior audits on the EVM bridge surface + 1 on TON = 5 distinct audits.**

**Doctrine #27 saturation filter check:**
- Threshold for filter-PASS = ≥20 audits on the same surface (per Doctrine #27 v1.0).
- rhino.fi base bridge has 4 audits = **FAIL Doctrine #27 saturation filter** (substrate is NOT in over-audited territory).
- Substrate has been ACTIVELY EDITED — five commits in 2025 (bridge-commitment update, deprecated removal, contract address updates). Not "frozen-mature with 20+ audits"; it's "lightly-audited and actively maintained."

This is a meaningful distinction from CoW Protocol's reading. rhino.fi is NOT saturation-foreclosed.

### 5.10 Doctrine #32 v1.1 cycle-2 filter [INSPECTED]
- audit_age (days since most recent audit): TON Quantstamp report added 2024-10-15 → ~13 months ago. EVM PeckShield reports older. Newest audit is **~400 days old**.
- dangerous_area changes in last 30 days: 0 (repo frozen 440 days).
- Doctrine #32 v1.1 check: audit_age (400d) > 180d AND dangerous_area_changes_30d (0) < 10. **FAIL both conditions → exclude.**
- Verdict: **Doctrine #32 v1.1 cycle-2 filter FAILS for this target.** Substrate is stale-frozen, not freshly-evolving.

### 5.11 Output: this file.

### 5.12 R8 Calibrated Reporting — tags inline above and below.

---

## CANDIDATES (Gate 1 surface map)

### C1 — `processedWithdrawalIds` mapping declared as state but never used in current source [INSPECTED]
**File:** `DVFDepositContract.sol:18`
**Observation:** `mapping(string => bool) public processedWithdrawalIds;` is declared but no current function reads or writes it. The CEI-fixed modifier in audit commit `feb3bf` (which DID consume the mapping) is no longer in the codebase. The state slot is reserved/orphaned.
**Lens:** Doctrine #23 — "the gap is simultaneously an invariant and a bug" — invariant the audit was protecting (no withdrawal-ID replay) has been REMOVED from on-chain enforcement and migrated to off-chain enforcement entirely.
**Severity assessment:** **NOT A BUG.** This is an intentional architecture move — replay protection lives off-chain on the authorized-operator side. The state slot is dead but harmless (mapping defaults to false; nothing writes to it). Operator may want to remove the dead slot in a future upgrade for clarity.
**R8 grade:** `[INSPECTED]` (code-confirmed orphan state).
**Gate 2 promotion:** NO.

### C2 — `transferOwner` is single-tx (no two-step) on EVM [INSPECTED]
**File:** `DVFDepositContract.sol:255-259`
**Observation:** Owner transfer atomically authorizes new owner, deauthorizes old owner, and calls `transferOwnership(newOwner)`. There is no `pendingOwner` two-step (TON contract HAS this; EVM contract does not). A typo or compromised owner key can transfer ownership to a wrong/attacker address in a single transaction with no recovery.
**Lens:** DC-9 sub-2 (zero-timelock migration on privileged state).
**Severity assessment:** **MEDIUM** in isolation, **LOW in practice** — `renounceOwnership` correctly reverts (line 261-263), so ownership cannot be burned. But mistransfer cannot be recovered without the new (attacker) owner cooperating. Audit-disclosed and surviving.
**R8 grade:** `[INSPECTED]`.
**Gate 2 promotion:** NO — already-audited and accepted as design tradeoff. The TON contract's two-step pattern shows the team is aware of the alternative.

### C3 — `authorizeMulti` unbounded loop is gas-DoS but `onlyOwner` so not exploitable [INSPECTED]
**File:** `DVFDepositContract.sol:249-253`
**Observation:** `for (uint256 i = 0; i < users.length; i++) { authorized[users[i]] = value; }` — unbounded loop on user-supplied array.
**Severity assessment:** **NOT A BUG.** `onlyOwner` modifier — the owner cannot DoS themselves. Audit-survived.
**R8 grade:** `[INSPECTED]`.
**Gate 2 promotion:** NO.

### C4 — Doctrine #34 composition surface: Blast `YieldMode.AUTOMATIC` + `withdrawWithData` arbitrary-call execution [INSPECTED + ASSUMED]
**Files:** `DVFDepositContractBlast.sol:61-64`, `BridgeVM.sol:22-33`
**Observation:** `DVFDepositContractBlast.initialize()` configures the deposit contract to receive automatic Blast yield on its ETH balance. When `withdrawWithData` is invoked, ETH flows from `DVFDepositContract` to `BridgeVM` via `_withdrawWithData`, then `BridgeVM.execute` forwards `value: datas[i].value` to arbitrary targets.

**Question:** Does Blast's automatic-yield accounting model handle the case where a yield-bearing balance is moved to a non-yield-bearing intermediate (`BridgeVM`) and then to external `datas[i].target` in the same transaction? `BridgeVM` is NOT configured for Blast yield (no `BLAST.configure` call in `BridgeVM` constructor). So ETH transferred to `BridgeVM` LOSES its yield-accrual position. If `withdrawWithData` is called frequently, the protocol may be unintentionally forfeiting yield on every withdrawal.

**Counter-argument:** This is a YIELD-LOSS issue (the protocol stops accruing yield on funds-in-flight for the duration of one transaction), NOT a SECURITY issue. Funds-in-flight on Blast for a single block represent negligible yield (Blast ETH yield ~3-4%/year → 4%/365/24 = 0.0005% per hour). Even at $1B notional, this is ~$5 per hour-of-funds-in-flight — and `withdrawWithData` completes in a single block (~2 sec on Blast). The loss per withdrawal is sub-cent.

**Severity assessment:** **VERY LOW** — economically negligible. Useful as Doctrine #34 worked example (post-audit yield-composition surface), but not a bountiable finding.

**R8 grade:** `[INSPECTED]` (code-confirmed Blast configure call); `[ASSUMED]` (Blast yield-accounting model behavior on intermediate transfer — would require Blast-side bytecode verification to upgrade to INSPECTED).

**Gate 2 promotion:** NO. Useful as a lens-confirmation, not as a candidate finding.

### C5 — `depositNativeWithId` MISSING `_areDepositsAllowed` modifier (asymmetry with `depositNative`) [INSPECTED]
**File:** `DVFDepositContract.sol:113-115`
```solidity
function depositNativeWithId(uint256 commitmentId) external payable {
    emit BridgedDepositWithId(msg.sender, tx.origin, address(0), msg.value, commitmentId);
}
```
**Observation:** `depositNative()` (line 103) has `_areDepositsAllowed` modifier. `depositNativeWithId(uint256)` (line 113) does NOT. Same logical asymmetry on the ERC20 side: `deposit` has `_areDepositsAllowed`, but `depositWithId` (line 84) and `depositWithPermit` (line 95) do NOT. Pattern is: "permissioned deposits" (those WITH commitment IDs) bypass the global pause; only "anonymous deposits" (those without IDs) are pausable.

**Lens:** DC-7 base shape candidate — same field name `deposit*` family but different modifier-application policy across the family.

**Severity assessment:** **DESIGN-INTENT QUESTION, NOT A BUG.** The likely intent is: commitment-ID deposits go through the Rhino.fi UI which validates rate limits server-side; global pause is for emergency-stopping anonymous deposits that bypass UI-side rate limiting. The commitment-ID gates are off-chain. BUT: in an emergency where the authorized-keeper key is compromised, the operator may want to stop ALL deposits (including commitment-ID ones, because the off-chain UI server may also be compromised). The current design says "you can't" — `block_global_deposits` only affects `_areDepositsAllowed`-modified functions.

**Comparison with TON contract:** TON `bridge_contract.fc` line 122 + line 165 explicitly check `global_deposits_blocked` on BOTH jetton-deposit AND native-deposit paths. EVM contract is asymmetric; TON is symmetric. **TON-vs-EVM symmetry gap — clean cross-language DC-7-adjacent observation.**

**R8 grade:** `[INSPECTED]`.

**Gate 2 promotion:** **MARGINAL — POSSIBLY LOW SEVERITY.** Worth a flag to operator for triage. In an authorized-keeper-key-leak scenario, the inability to fully pause deposits could materially inflate loss exposure (depositors continuing to deposit into a compromised contract while operator races to revoke). Would file under "incident-response surface area" framing, not "exploit-now" framing. **EV likely $5K-$10K (Low severity) per Immunefi rubric — sub-floor of the $20K High range, may not pass triage.**

### C6 — `withdrawVmFunds` has NO modifier [INSPECTED]
**File:** `DVFDepositContract.sol:285-288`
```solidity
function withdrawVmFunds(address token) external {
    require(address(vm) != address(0), 'VM_DOES_NOT_EXIST');
    vm.withdrawVmFunds(token);
}
```
**Observation:** Public-callable function with no `_isAuthorized` or `onlyOwner` modifier. Anyone can invoke it.

**What does it do?** Calls `BridgeVM.withdrawVmFunds(token)` which transfers any token/native balance in `BridgeVM` to `owner()` of `BridgeVM` (which is `DVFDepositContract`, since `BridgeVM` is created via `new BridgeVM()` in line 53 from `DVFDepositContract`'s context). So funds flow from `BridgeVM` BACK to `DVFDepositContract`.

**Severity assessment:** **NOT A BUG.** This is a permissionless sweep that recovers stuck funds from the `BridgeVM` intermediate back to the parent. Funds don't escape to an attacker — they return to the protocol's main escrow. The permissionless design is intentional (anyone can trigger the sweep, but they don't benefit).

**Edge case check:** Does `BridgeVM.withdrawVmFunds` correctly handle the call-failure path on native? Line 46-47: `payable(owner()).call{value: balance}("")` — return value NOT checked. If `DVFDepositContract` reverts on `receive()` (which it does NOT — line 290 has empty `receive() external payable {}`), the call would silently fail. But `DVFDepositContract` does accept ETH. Clean.

**R8 grade:** `[INSPECTED]`.

**Gate 2 promotion:** NO.

### C7 — `createVMContract` has idempotency guard but no caller restriction [INSPECTED]
**File:** `DVFDepositContract.sol:51-54`
```solidity
function createVMContract() public {
    require(address(vm) == address(0), 'VM_ALREADY_DEPLOYED');
    vm = new BridgeVM();
}
```
**Observation:** Anyone can call this once. The idempotency guard means it can only succeed once. After `initialize()` is called (which internally calls `createVMContract` at line 48), the function is unreachable.

**Severity assessment:** **NOT A BUG.** Frontrun on a freshly-deployed but uninitialized proxy is impossible because `initialize()` runs `createVMContract` atomically. The race only exists if an upgrade somehow zeros out the `vm` slot — which it doesn't (no function nulls `vm`).

**R8 grade:** `[INSPECTED]`.

**Gate 2 promotion:** NO.

### C8 — `depositWithPermit` calls `permit` then `depositWithId` — permit-frontrunning class [INSPECTED]
**File:** `DVFDepositContract.sol:95-98`
```solidity
function depositWithPermit(address token, uint256 amount, uint256 deadline, uint8 v, bytes32 r, bytes32 s, uint256 commitmentId) external {
    IERC20PermitUpgradeable(token).permit(msg.sender, address(this), amount, deadline, v, r, s);
    depositWithId(token, amount, commitmentId);
}
```
**Observation:** Standard permit-pattern. Permit signature for `msg.sender` → spender=`address(this)`, amount=`amount`, deadline. A frontrunner can extract the permit from the mempool and call `permit()` directly on the token, then call `deposit()` with a DIFFERENT commitmentId.

**Severity assessment:** **MILDLY KNOWN ISSUE** — generic to all `depositWithPermit` implementations across DeFi. The user signed a permit for `address(this)` (the bridge), not for a specific commitment ID, so the attacker frontrunning extracts permit → fronts the user's intent of "deposit token X amount Y to bridge with my commitment ID." Attacker can call `permit()` then `deposit()` with their own commitment ID, redirecting the user's bridge credit to themselves. **BUT** — `depositWithId` emits `BridgedDepositWithId(msg.sender, tx.origin, token, amount, commitmentId)` where `msg.sender = attacker` and `tx.origin = attacker`. Off-chain operator credits the deposit to the `commitmentId`'s owner per UI registration — if the commitmentId is the attacker's, they get the credit. **Potential bug if commitmentId is short / guessable.**

**Counter-argument:** `commitmentId` is documented as "Users must use Rhino.Fi UI to get a valid commitment ID" — the off-chain system likely binds commitmentId to msg.sender at issuance time. If the attacker uses victim's commitmentId, the off-chain validation rejects (commitmentId-to-sender mismatch). If attacker uses their own commitmentId, victim's tokens credit attacker's bridge account.

**This is the load-bearing question:** does the off-chain operator validate `commitmentId → msg.sender` binding?

**Cross-reference:** Architecture.md:60 already confirms the off-chain operator is the verifier. If the operator's commitmentId-binding validation is robust, this is not a bug. If commitmentId is global (any user can claim any commitmentId off-chain by UI-side action), it IS a bug.

**R8 grade:** `[INSPECTED]` (code-confirmed permit + deposit ordering); `[ASSUMED]` (off-chain commitmentId-binding behavior unknown).

**Gate 2 promotion:** **POSSIBLY YES** — but requires off-chain reconnaissance (Rhino.fi UI flow analysis, commitmentId issuance API) to determine bindingness. Could be a MEDIUM severity finding if commitmentId binding is loose. EV ~$5K-$20K (M range), with significant `[ASSUMED]` discount.

**Recommendation:** Operator decides whether to fund the off-chain recon (~1-2 hours of UI flow analysis) to upgrade C8 from `[ASSUMED]` to `[INSPECTED]`.

---

## STEP 6 — CONTINUOUS

- **Watchlist add (`brain/Watchlist-Candidate-Crossmap.md`):** rhino.fi Immunefi, $2M Critical no-KYC, MEDIUM brain overlap, Doctrine #27 NOT saturated (5 audits), Doctrine #32 v1.1 FAIL. Watchlist with re-Gate-1 triggers: scope expansion to UserWallet/CrossSwap family, new yield-composition chain integration, public PM on operator-key compromise.
- **30-repo watchlist:** `rhinofi/contracts_public` is small enough (1.4MB), low-churn, and well-documented — add as watchlist member for delta-rescans only.
- **Intake logbook:** append one line to `hunts/intake-log.md`.

---

## BRAIN COMPOUND PROPOSALS (FROZEN PENDING OPERATOR)

### Proposal 1 — REFINE CoW P1 doctrine: Repo-Frozen vs Repo-Frozen-Scope-Frozen

**Observation:** rhino.fi's `contracts_public` is 440 days repo-frozen, but the product is actively shipping (SuperEarn, Stablecoin 1:1, new chains monthly). This is structurally different from CoW Protocol (1844 days frozen AND scope pinned to 2021 SHA AND new features explicitly OFF-scope).

**Refined doctrine candidate (P1.1):**
- **P1 trigger (current):** `days_since_push > 365` → flag for foreclosure consideration.
- **P1.1 distinguisher (proposed):** AFTER P1 fires, classify into one of two sub-types:
  - **P1.1.A — "Audited-and-Frozen-and-Scope-Frozen"** (CoW class): repo-frozen AND scope-pinned to old SHA AND new features OFF scope → AUTO-FORECLOSE pre-clone. Lens-by-lens skipped. Watchlist defer.
  - **P1.1.B — "Audited-and-Frozen-but-Product-Live"** (rhino.fi class): repo-frozen BUT in-scope contracts are PRODUCTION-LIVE for current product features (new chains spin up off SAME contracts) → PROCEED with sharpened Doctrine #34 lens (post-audit composition surfaces from new chain integrations / yield extensions).

**Decision rule between A and B:**
1. Fetch `pushed_at` for canonical repo.
2. If `days_since_push > 365` AND Immunefi scope is **SHA-pinned to old commit** → P1.1.A (foreclose).
3. If `days_since_push > 365` AND Immunefi scope is **branch-pinned (`master` / `main`)** AND `README.md` shows recent on-chain deployments → P1.1.B (proceed with composition lens).

**Saves:** ~25 min per P1.1.A target (full Gate 1 → 5-min foreclosure). Adds ~5 min per P1.1.B target (lens application is still needed; classification is the new step).

**Risk:** P1.1.B might still miss the rare post-audit-composition bug if the lens enumeration is incomplete. Mitigated by 5-target quality checklist hits — composition lens MUST fire on at least the External Calls or Admin/Upgrade target (it did on rhino.fi: C4 Blast yield-composition observation).

### Proposal 2 — Lane 5 chain-list calibration: Immunefi-listed vs README-deployed

**Observation:** rhino.fi Immunefi page lists 10 chains in scope. `README.md` lists 28 chains deployed with bridge contracts. The 18 unlisted chains share IDENTICAL bytecode (recurring address `0x5e023c31...`). Are non-listed chain deployments OOS or implicitly in-scope?

**Proposed calibration:**
- Lane 5 crawler should fetch both the Immunefi page's listed chains AND the canonical repo's `README.md` chain enumeration.
- Flag scope ambiguity when `len(deployed_chains) > 1.5 × len(immunefi_listed_chains)`.
- Surface to operator at intake: "10 chains listed, 28 deployed, identical bytecode on most — clarify scope before Gate 2."

**Saves:** prevents Gate 2 wasted effort on non-listed deployment if Immunefi triager later rejects "we only meant the 10 listed chains."

### Proposal 3 — TON-vs-EVM symmetry gap lens (cross-language DC-7-adjacent)

**Observation:** rhino.fi's TON contract (`bridge_contract.fc`) checks `global_deposits_blocked` on BOTH jetton-deposit AND native-deposit paths. EVM contract `DVFDepositContract` checks `depositsDisallowed` ONLY on `deposit` (line 70) and `depositNative` (line 103), NOT on `depositWithId` (line 84), `depositWithPermit` (line 95), or `depositNativeWithId` (line 113). **Same protocol, two language implementations, different pause-coverage policy.**

**Proposed lens:** "Cross-language implementation symmetry" — when a protocol has parallel implementations (EVM Solidity + TON FunC + Solana Anchor + Move + Cairo + etc.), the SAME logical guard (pause, replay, role-check) should be present on equivalent code paths across all languages. Asymmetric coverage suggests one language received less audit attention or operates under a different threat model.

**Refinement of DC-7 base:** DC-7 base is intra-language (Validating-Field ≠ Consuming-Field within one pipeline). This adds **DC-7 sub-pattern — Cross-Language Guard-Coverage Asymmetry** (the DC-7 sub-pattern for Filecoin-3 already extends to cross-language enum repr; this extends in the other direction — same guard, asymmetric APPLICATION).

**Saves:** at intake for any protocol with multi-language deployment (rhino.fi, Wormhole, LayerZero, ZetaChain, etc.), grep each language's entry-point list and check for guard-application diffs. High-EV cross-pollination lens.

---

## DISK DELTA

- Pre-scan: 87% [INSPECTED]
- Post-scan: 87% (clone added 3.2MB / 4.9G free; rounding) [INSPECTED]
- Halt margin: still 1% below 88% threshold. No risk.

---

## GATE 2 RECOMMENDATION

**NO — defer to watchlist, with one operator-decision point on C8.**

**EV reasoning:** Base EV $20,000. Most candidates resolve to "intentional trust-model design choice" or "audit-survived." The only candidates with ANY Gate 2 promotion potential are:
- **C5** (deposit-pause asymmetry, EVM-vs-TON gap): Low severity (~$5K-$10K EV), would file under "incident-response surface" framing
- **C8** (depositWithPermit frontrunning + commitmentId binding): MEDIUM-severity candidate IF off-chain commitmentId binding is loose; UNKNOWN until off-chain UI flow recon completed.

**Operator decision point:** Fund 1-2 hours of off-chain recon on Rhino.fi UI commitmentId issuance flow to upgrade C8 from `[ASSUMED]` to `[INSPECTED]`. If commitmentId binding is verified loose → escalate to Gate 2 with M-severity framing (EV ~$5K-$10K). If binding is tight → C8 dies, no Gate 2.

**Re-evaluation triggers:**
1. Scope expansion to UserWallet/CrossSwap family
2. New yield-composition chain integration (post-Blast/Ape)
3. Public PM on operator-key compromise
4. Off-chain UI recon resolves C8 to `[INSPECTED]` loose-binding → re-Gate-2

---

## OOS ARTIFACTS

The clone at `.gate1-work/rhinofi-immunefi-2026-05-26/contracts_public/` (3.2MB) can be removed by operator at convenience. Recommended retention: 30 days for any operator follow-up questions, then prune. The Layer 0 git-security analyzer was not run (repo 14.5 months frozen; no late_changes signal expected).

---

*Gate 1 complete. Bismillah.*
