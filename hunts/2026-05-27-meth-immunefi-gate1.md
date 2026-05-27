# Gate 1 — Mantle mETH (Immunefi)

**Date:** 2026-05-27
**Target:** mETH Protocol (Mantle LSP)
**Platform:** Immunefi — https://immunefi.com/bug-bounty/mantlelsp/information/
**Clone:** `.tmp-clones/meth-gate1/contracts/` (5.6 MB, depth-1, HEAD = `bbc4e8b` 2026-05-22)
**Operator dispatch:** Strategic pick per GMX cross-pollination handoff (commit 237346f); LayerZero-OFT consumer hypothesis testing on Mantle substrate
**Status:** Gate 1 — COMPLETE → see VERDICT

---

## Step 0 — Prior-Corpus Lookup

| Source | Hits |
|---|---|
| `hunts/` substring "meth\|mantle" | 24 files, ALL false-positive (`method`, `methodology`) — no prior mETH/Mantle Gate 1 |
| `brain/` substring "mETH\|mantle-lsp\|Mantle LSP" | 0 hits |
| `brain/Watchlist-Candidate-Crossmap.md` (tighter match) | 0 mETH/Mantle row |
| `brain/Audit-Reports-Library.md` (tighter match) | 0 mETH/Mantle row |
| `audits-library/` | not checked — repo path |

**Verdict:** Fresh substrate. Zero prior Buzz work on mETH or Mantle LSP. No foreclosure on file.

---

## Step 1 — PROFILE

| Field | Value |
|---|---|
| Platform | Immunefi |
| Live since | 2023-11-28 |
| Last updated | 2025-03-18 (program page); HEAD repo last commit 2026-05-22 |
| **Status preflight** | **ACTIVE** [INSPECTED, program page rendered with live cap structure] |
| Severity caps | Critical $100K–$500K (10% of funds, capped); High $20K–$100K; Medium $5K flat; Low N/A |
| KYC | **NO** [INSPECTED, program page explicit] |
| Submission requirement | PoC required for ALL severities (Immunefi PoC Guidelines compliant) |
| Reputation threshold | Not specified on page |
| Responsible publication | Category 3 (approval required) |
| In-scope chains | Ethereum L1 (9 contracts) + Mantle L2 (1 token contract) |
| Total scope assets | 10 |
| Historical $ paid | Not visible on program page; **no Immunefi hall-of-fame entries surfaced via search** |

### In-scope addresses [INSPECTED, fetched from /scope page]

| Contract | Address | Chain |
|---|---|---|
| mETH Token L1 | `0xd5F7838F5C461fefF7FE49ea5ebaF7728bB0ADfa` | Ethereum L1 |
| Staking | `0xe3cBd06D7dadB3F4e6557bAb7EdD924CD1489E8f` | Ethereum L1 |
| UnstakeRequestsManager | `0x38fDF7b489316e03eD8754ad339cb5c4483FDcf9` | Ethereum L1 |
| Oracle | `0x8735049F496727f824Cc0f2B174d826f5c408192` | Ethereum L1 |
| OracleQuorumManager | `0x92e56d2146D54d5AEcB25CA36c89D027a6ea0D90` | Ethereum L1 |
| ReturnsAggregator | `0x1766be66fBb0a1883d41B4cfB0a533c5249D3b82` | Ethereum L1 |
| ConsensusLayerReceiver | `0xD4e11C28E04c0c2bf370b7a9989498B7eA02493f` | Ethereum L1 |
| ExecutionLayerReceiver | `0xD6E4aA932147A3FE5311dA1b67D9e73da06F9cEf` | Ethereum L1 |
| Pauser | `0x29Ab878aEd032e2e2c86FF4A9a9B05e3276cf1f8` | Ethereum L1 |
| mETH Token L2 | (Mantle L2 — addr not extracted) | Mantle L2 |

### OOS clauses (selected)

- Mainnet/public testnet testing (local forks required)
- Testing with pricing oracles or third-party contracts
- Public disclosure of unpatched vulnerabilities
- Future contract misconfigurations are out of scope

### Critical scope observation

**`LiquidityBuffer` and `PositionManager` (Aave-V3 yield-routing modules, the entire `src/liquidityBuffer/` subdir of the repo) are NOT in the listed in-scope assets**, despite being the focus of 4 fresh 2025-Q4 audits and the only HEAD-drift activity since. This means findings in those modules — regardless of severity — are likely OOS on Immunefi (unless mETH adds them to scope post-deploy). **Material constraint on Gate 1 EV calculation.**

---

## Step 2 — BRAIN OVERLAP SCORE

| Lens | Primitive grep result | Verdict |
|---|---|---|
| **CANDIDATE-A** (LayerZero-OFT subclass — GMX handoff hypothesis) | `grep -rinl -E "lzReceive\|LayerZero\|OFT\|sendFrom\|_credit\(\|IOAppCore"` → **0 hits** in `src/` | **NO-HIT.** mETH L1 ↔ L2 bridge does NOT use LayerZero. The cross-pollination handoff hypothesis is FALSIFIED for this target. (Mantle L2 itself is an OP-Stack rollup; the mETH L2 token is bridged via the canonical Mantle bridge, not LZ-OFT.) |
| **DC-12** (oracle staleness) | `grep -rin -E "latestAnswer\|getExchangeRate\|getPrice\|updated.?At\|staleness\|maxAge"` in `Oracle.sol`/`OracleQuorumManager.sol` → **0 hits** | **NO-HIT.** mETH uses a custom consensus-layer-validator-quorum oracle pattern (`OracleRecord` reports gated by `OracleQuorumManager`), NOT a Chainlink/feed-staleness model. DC-12 primitives don't fire. |
| **CANDIDATE-E** (paired-function rounding asymmetry, Raydium-class) | `Math.mulDiv` used 6× across `Staking.ethToMETH` / `Staking.mETHToETH` / `LiquidityBuffer.fees` / `Oracle` / `ReturnsAggregator` | **WEAK HIT.** Both legs of `ethToMETH` ↔ `mETHToETH` use `Math.mulDiv` default-floor rounding (symmetric direction — both round in user-disfavorable). Raydium-class only exploits when legs round in OPPOSITE directions. Pattern matches structurally but exploit primitive absent. |
| **CANDIDATE-I** (ERC4626 share-inflation) | `mETH.totalSupply() == 0` bootstrap-check explicit (Staking.sol L558, L583); allowlist-gated initial stake | **NO-HIT.** Bootstrap-phase inflation defense is explicit + comment-anchored. Doctrine #29 v1.1 two-sided MIN-cap pattern is NOT directly applicable (mETH does not have Balancer-LP-wrapping, no spot-price oracle to dual-MIN against — exchange rate IS the only rate). |
| **DC-9 sub-2** (zero-timelock migration / unchecked-reinitializer) | `initializeV2` at LB.sol L171; **`external reinitializer(2)` with NO access-control modifier, NO zero-addr check** | **STRUCTURAL HIT, defense via atomic upgrade.** `script/liquidityBufferWithdrawRole.s.sol` L36-39 bundles `upgradeToAndCall(impl, initializeV2_calldata)` — the reinitializer is delivered atomically inside the ProxyAdmin upgrade tx. No front-run window on the canonical deploy path. BUT: scope is OOS (LiquidityBuffer not in Immunefi listed assets). |
| **DC-9 sub-4** (state-not-invalidated repeated-mint) | `UnstakeRequestsManager.claim` L184-220: deletes request before transfer; CEI compliant | **NO-HIT.** Proper CEI ordering; `delete _unstakeRequests[requestID]` before ETH transfer. |
| **DC-1** (reentrancy) | `.call{value:...}(new bytes(0))` in PositionManager L173; Staking `unstakeRequest` calls METH burn (trusted) | **WEAK HIT.** PositionManager has raw call but is OOS. Staking flow uses trusted internal contracts only. |
| **DC-7** (Validating-Field ≠ Consuming-Field) | OracleRecord validation in `OracleQuorumManager._trackReceivedRecord` (L154) → consumed by `Staking.totalControlled` via `oracle.latestRecord()` (L599). Quorum-validated record fields = exchange-rate-consumed fields. | **WEAK HIT.** Fields match by struct shape. No adjacent paired functions where one validates X and another consumes Y. Manual deep-trace would be required to falsify fully; primitive-grep finds no obvious adjacency gap. |
| **Doctrine #29 v1.1** (two-sided MIN-cap) | mETH has single-rate (no spot/oracle dichotomy) | **NO-HIT.** Pattern requires dual-rate substrate. |
| **Doctrine #34** (post-audit HEAD drift) | 4 audits dated 2025-10/11 cover LB+PM. HEAD commits 2026-05-22 `bbc4e8b` + 3 prior add `SERVICE_WITHDRAW_ROLE` + revoke `LIQUIDITY_MANAGER_ROLE` from allocator | **HIT but OOS.** The post-audit drift is precisely on the LB module — which is OOS on Immunefi. EV of this finding class is bounded by future scope expansion, not current scope. |

### Overlap classification

**MEDIUM** — 3 weak hits (CANDIDATE-E pattern-match without exploit primitive; DC-1 weak; DC-7 weak); 1 structural hit DC-9 sub-2 firmly defended by atomic upgrade + OOS scope; 1 Doctrine #34 hit OOS. **Hypothesis from GMX handoff (CANDIDATE-A) DEFINITIVELY FALSIFIED — Mantle does not use LayerZero-OFT.** No HIGH-overlap lens applies to the in-scope contract set.

---

## Step 3 — EV CALCULATION

### Audit-saturation analysis (Doctrine #27 + Corollary B/F/J)

**Audit count:** **16** (Mixbytes ×3, Hexens ×4, Blocksec ×2, Exvul ×1, Fuzzland/Verilog ×1, Quantstamp ×1, Secure3 ×3, Verilog ×1).
**Cadence:** sustained — 2023-08 through 2025-11, with 4 audits in Oct-Nov 2025 alone.
**Doctrine #27 tier:** **16 audits ≥ 15 threshold → HIGH-J tier eligible**. Need second J corollary condition: ≥100 submissions. Not visible on program page. Conservative: assume J-corollary tier without auto-FORECLOSURE (cannot confirm submission count).
**Multiplier:** **0.25× P(finding)** (Doctrine #27 HIGH-J without auto-FORECLOSURE-RECEIPT trigger confirmed). If submission count ≥100 ever confirmed → auto-FORECLOSURE-RECEIPT per Doctrine #27 J corollary.

### Doctrine #34 (post-audit HEAD drift)

- Last audit cluster: 2025-10/11 (4 audits on LB+PM).
- HEAD drift since: 4 commits (2026-05-21/22) adding SERVICE_WITHDRAW_ROLE migration.
- **Doctrine #34 fires** on LB/PM module — BUT that module is **OOS** on Immunefi scope list. Doctrine #34 multiplier therefore yields ZERO in-scope EV recovery.

### EV computation (in-scope only)

```
P(finding)_base = 0.10  (MEDIUM overlap, no HIGH-overlap lens hit)
× Doctrine #27 multiplier (0.25×)  → 0.025
× P(acceptance) 0.5 (established Immunefi payer, KYC-no)
× bounty_cap $500K
× overlap_multiplier 0.5 (MEDIUM)

EV = $500K × 0.025 × 0.5 × 0.5 = $3,125
```

### EV vs queued pipeline

Today's Gate 1 candidates have generally been forced to FORECLOSURE-RECEIPT on Doctrine #27 J-corollary triggers (Sky, Hyperbridge precedents). Even at 0.25× multiplier, this $3.1K EV is below current pipeline floor (queued targets generally ≥$10K post-discount).

---

## Step 4 — QUEUE DECISION

**Recommended action:** **FORECLOSURE-RECEIPT (NOT auto-FORECLOSURE — Step 5.4 detector rotation still run for brain-compound value per Doctrine #27 F corollary).**

Per `autonomy-boundary.md`, this is an autonomous decision. The EV table (Step 4 of standing-intake) yields:

| Overlap | Cap | Recommended | This target |
|---|---|---|---|
| MEDIUM | $500K | Research-first Gate 1, surface for greenlight | $500K cap MATCH; but Doctrine #27 HIGH-J discount drops in-scope EV to $3.1K |

Since EV after multipliers falls below the queued-target floor AND the cross-pollination hypothesis (CANDIDATE-A LZ-OFT) is **falsified** by primitive-grep, **FORECLOSURE-RECEIPT is the correct verdict**. Brain compounds below capture the value extracted from this dispatch.

---

## Step 5 — GATE 1 EXECUTION

### 5.2 Pre-flight scope-check [INSPECTED]

- All 9 in-scope L1 addresses confirmed on /scope page
- **`LiquidityBuffer` (src/liquidityBuffer/LiquidityBuffer.sol, 602 SLOC) and `PositionManager` (199 SLOC) are NOT in the listed in-scope assets** — flagged for operator
- `OldPositionManagerNewImpl.sol` (202 SLOC) is a transitional impl referenced by upgrade scripts — also OOS

### 5.3 Bytecode-verify prep [planned, not executed — FORECLOSURE]

If proceeding to Gate 2 on any in-scope contract, planned verification commands:
```bash
cast code 0xe3cBd06D7dadB3F4e6557bAb7EdD924CD1489E8f --rpc-url $ETH_RPC > onchain-staking.hex
solc --standard-json src/Staking.sol > local-staking-out.json
# compare runtime bytecode (last 53 bytes for metadata diff tolerated)
```
Bytecode-verify deferred — FORECLOSURE-RECEIPT verdict pre-empts.

### 5.4 Inventory [INSPECTED]

- **Total SLOC:** 4,042 across `src/` (excluding interfaces)
- **In-scope SLOC:** ~3,040 (excluding the 1,003 SLOC of LB+PM+OldPM, which are OOS)
- **Modules:**
  - `METH.sol` — ERC20 with mint/burn gated by Staking; blocklist hook
  - `Staking.sol` — primary entry-point; `stake`, `unstakeRequest`, `claimUnstakeRequest`, `ethToMETH`/`mETHToETH` conversion
  - `UnstakeRequestsManager.sol` — FIFO unstake queue + claim
  - `Oracle.sol` — consensus-layer record store + sanity-check gate
  - `OracleQuorumManager.sol` — validator-quorum aggregation upstream of `Oracle`
  - `ReturnsAggregator.sol` — fee skim on CL/EL rewards
  - `ReturnsReceiver.sol` — passthrough for CL/EL rewards
  - `Pauser.sol` — circuit-breaker

### 5.5 Brain-lens detector rotation per Step 2 table

See Step 2 above. **Zero CANDIDATE-row promotions justified** — no primitive-grep hit lands on an in-scope contract with the exploit primitive intact.

### 5.6 5-Target Quality Checklist [INSPECTED]

| Target class | Surface in mETH | Defense observed | Verdict |
|---|---|---|---|
| **(1) Withdrawals/Redemptions** | `Staking.unstakeRequest` (L354) → `UnstakeRequestsManager._unstakeRequests[id]` → `claimUnstakeRequest` (L403) → `claim` (URM L184) | (a) `minETHAmount` slippage guard L362 [EXECUTED via source-read]; (b) `delete _unstakeRequests[id]` BEFORE `safeTransferETH` (CEI compliant); (c) `_isFinalized` check requires oracle-finalized block before claim; (d) `cumulativeETHRequested > allocatedETHForClaims` solvency invariant | **PASS.** CEI + slippage + solvency invariant + oracle-finalization gate. No exploit primitive surfaces. |
| **(2) Liquidation + Oracle** | mETH has NO liquidation primitive (no debt position). `Oracle.sol` ingests CL state; `Staking.totalControlled` (L598) reads `oracle.latestRecord()` | (a) `OracleQuorumManager` requires multi-reporter quorum before pushing to Oracle [INSPECTED L128 `_hasReachedQuroum`]; (b) `Oracle` runs sanity-check via `_FINALIZATION_BLOCK_NUMBER_DELTA_UPPER_BOUND=2048` and `maxConsensusLayerLossPPM` bounds (L464); (c) pending-update workflow (admin can reject malicious quorum); (d) NO `block.timestamp` staleness check on `latestRecord` consumption — but consensus-layer is push-only via quorum, so cross-chain-staleness pattern N/A | **PASS.** No `block.timestamp - last_updated < max_age` check, but the model is push-quorum not pull-feed; absence of staleness check is structurally correct here. |
| **(3) Deposit/Mint Shares** | `Staking.stake` (L319) — accepts ETH, mints mETH via `ethToMETH(ethAmount)` | (a) `minMETHAmount` slippage L319 [EXECUTED via source-read]; (b) `minimumStakeBound = 0.1 ether` (L298) — first-stake inflation defense; (c) `mETHMintAmount + totalSupply > maximumMETHSupply` cap (L333); (d) `mETH.totalSupply() == 0` bootstrap-1:1 (L558 ethToMETH, L583 mETHToETH); (e) Allowlist-gated mode `STAKING_ALLOWLIST_ROLE` if enabled | **PASS.** Strong defenses. Inflation-attack surface absent (0.1 ETH min stake + allowlist mode). |
| **(4) External Calls** | (a) `Staking.unstakeRequest` → mints unstake position (internal contract); (b) `UnstakeRequestsManager.claim` → `_safeTransferETH` (raw `.call{value:}`); (c) `METH.sol` L129 — `blockListAddress.call(...)` to check if address blocked | (a) URM `claim` uses CEI properly (delete before transfer); (b) METH blocklist call return-checked; (c) NO delegatecall hooks; NO upgradeable-hook-no-timelock (DC-9 sub-3 patterns absent on in-scope contracts) | **PASS.** No reentrancy primitive on in-scope path. |
| **(5) Admin/Upgrade** | AccessControl-based with roles: `DEFAULT_ADMIN_ROLE`, `STAKING_MANAGER_ROLE`, `ALLOCATOR_SERVICE_ROLE`, `INITIATOR_SERVICE_ROLE`, `ORACLE_MANAGER_ROLE`, `ORACLE_MODIFIER_ROLE`, `ORACLE_PENDING_UPDATE_RESOLVER_ROLE`, `TOP_UP_ROLE`, `PAUSER_ROLE` | (a) NO `_authorizeUpgrade` in `Staking.sol` — upgrade authority lives in the TransparentUpgradeableProxy ProxyAdmin (separation of concerns); (b) DC-9 sub-2 DEFENSE PATTERN check — `LiquidityBuffer.initializeV2` (L171) is `reinitializer(2)` with NO access control, but bundled into `upgradeToAndCall` atomically by `script/liquidityBufferWithdrawRole.s.sol` L36-39; (c) `topUp()` requires `TOP_UP_ROLE`; (d) `reclaimAllocatedETHSurplus` requires `STAKING_MANAGER_ROLE` | **PASS in-scope.** All in-scope contracts use AccessControl + atomic upgrade via OZ TransparentUpgradeableProxy ProxyAdmin. DC-9 sub-2 DEFENSE PATTERN active (atomic upgrade closes reinitializer hijack window). |

All 5 target classes covered. None yield a candidate finding on in-scope contracts.

### 5.7 Phase 0 Dedup — Doctrine #27 Corollary B remediation-language grep

**Approach:** Per Doctrine #27 Corollary B, search for REMEDIATION VERBS (`deprecated`, `removed`, `denyed`, `no longer`, `disabled`, `fixed in`) tied to magic numbers from any candidate findings — not just lens-label keywords.

**Status:** **NOT APPLICABLE.** No candidate findings survived Step 5.5 detector rotation on in-scope contracts. There are no magic numbers / candidate-specific anchors to grep against the audit corpus. Phase 0 dedup is moot — there is nothing to dedup against.

**Coverage note:** 4 audits in 2025-10/11 (Mixbytes, Hexens, Blocksec, Exvul) explicitly scope LB+PM. The in-scope contracts (Staking/URM/Oracle/OQM/RA/etc.) have audit pedigree from 2023-2024 (Hexens, MixBytes, Secure3 ×3, Quantstamp, Verilog) — sustained-multi-firm-cadence per Doctrine #27 sub-rule. Public mixbytes audit README confirms 2023 audit found 14 issues (0 Critical, 3 High, 4 Medium, 7 Low); the 3 High findings were "Acknowledged" not "Fixed" — design-decision tolerance is documented.

### 5.8 DC-9 sub-2 DEFENSE PATTERN check [INSPECTED]

DC-9 sub-2 (today's Sky anchor) calls for verifying that **privileged-mutation surfaces have governance ward-status** (i.e., the writer is currently authorized AT CURRENT BLOCK, not just at constructor-time).

**Applied to in-scope contracts:**

- **`METH.mint()`** (METH.sol L67): caller must be Staking (hardcoded `stakingContract` immutable). Not a ward — single-author hard-pinned. Defense: **trust-pin** equivalent of "ward removal" by construction (no migration possible without proxy upgrade).
- **`Staking.allocateETH()`, `Staking.initiateValidatorsWithDeposits()`**: require `ALLOCATOR_SERVICE_ROLE`/`INITIATOR_SERVICE_ROLE` — AccessControl-checked at every call (`onlyRole` evaluates `hasRole(role, msg.sender)` AT CURRENT BLOCK). **DC-9 sub-2 DEFENSE PATTERN active.**
- **`Oracle.modifyExistingRecord()`** (Oracle.sol — line not shown but `ORACLE_MODIFIER_ROLE` enforced): same pattern — AccessControl current-block check. **Defense active.**

**Out-of-scope (informational):**

- **`LiquidityBuffer.initializeV2()`** — NO access control, BUT atomic-upgrade defense closes the hijack window. If the LB module were brought in-scope and a future upgrade ran `upgradeTo` (without `AndCall`), the 1-block front-run window would re-open. Operational risk, not present-state bug.

**Verdict:** All in-scope privileged-mutation surfaces have AccessControl ward-status pattern. DC-9 sub-2 defense is CURRENT AT BLOCK — no live surface to escalate.

### 5.9 R8 Calibrated Reporting tags (claim-by-claim)

Embedded inline above. Summary of evidence grades used:

- `[INSPECTED]` — used on source-code reads and program-page extracts (most claims)
- `[EXECUTED]` — used on primitive-grep results that consumed actual file content
- `[ASSUMED]` — used on submission-count threshold (could not confirm ≥100 → conservative HIGH-J without auto-FORECLOSURE)

No `[EXECUTED]` claims relying on on-chain `cast code` runs — those were planned but deferred per FORECLOSURE-RECEIPT verdict.

---

## VERDICT

**FORECLOSURE-RECEIPT** [INSPECTED + ASSUMED-submission-count]

**Reasoning (compounded):**

1. **Cross-pollination hypothesis FALSIFIED.** GMX Gate 1 handoff (commit 237346f) suggested testing Mantle as a LayerZero-OFT consumer. Primitive-grep confirms: **mETH does NOT use LayerZero anywhere in `src/`.** The L1↔L2 bridge for mETH is the canonical Mantle bridge (OP-Stack), not LZ-OFT. CANDIDATE-A subclass transfer to mETH is structurally impossible.

2. **Audit saturation HIGH-J tier.** 16 audits across 8 firms (2023-2025), with 4 audits in Oct-Nov 2025 specifically targeting the only HEAD-drift area (LB+PM). Doctrine #27 HIGH-J multiplier (0.25×) applies. Submission count not confirmable (≥100 would trigger auto-FORECLOSURE-RECEIPT per J corollary).

3. **In-scope vs HEAD-drift asymmetry.** The post-audit HEAD drift (Doctrine #34 normal hit) lives entirely on `src/liquidityBuffer/` — which is **OUT OF SCOPE** on the Immunefi program. The only fresh-detector EV avenue is OOS. Doctrine #34 yields zero in-scope EV here.

4. **5-Target checklist PASSES across all 5 classes** for in-scope contracts. No exploit primitive surfaces. Strong defenses observed: CEI on claim, slippage on stake+unstake, multi-firm-audited oracle quorum pattern, AccessControl ward-status on every privileged mutation.

5. **Post-Doctrine #27 EV ≈ $3.1K** — below the queued-target floor. Even setting aside the LZ-OFT hypothesis falsification, this target does not earn dispatch priority over current pipeline targets.

**Brain-compound value extracted (the reason we ran the full pipeline):**

- DC-9 sub-2 DEFENSE PATTERN verified on a second substrate (Sky was the anchor — mETH adds confirmation that AccessControl + atomic upgrade is the standard defense). Compounds onto today's earlier Sky compound.
- CANDIDATE-A FALSIFICATION on Mantle — narrows the LayerZero-OFT consumer hunt. Mantle uses canonical OP-Stack bridge for mETH L2, not LZ. Next LZ-OFT consumer candidates should be filtered by `grep "LayerZero\|OFT\|lzReceive"` BEFORE clone.
- Doctrine #34 OOS-substrate observation — Immunefi scope lists can lag HEAD by months. When the entire post-audit drift lives OOS, Doctrine #34 yields zero EV recovery. Propose corollary: **"Doctrine #34 EV recovery is bounded by scope-list inclusion of the drifted module."**

---

## Brain compound proposals (queued)

### Proposal 1 — CANDIDATE-A LayerZero filter pre-clone (Doctrine refinement)

**Statement.** For any GMX-handoff or other LZ-OFT-class cross-pollination target, run `WebFetch` for the program's GitHub `src/` listing + a single `grep "LayerZero\|OFT\|lzReceive\|IOAppCore"` BEFORE cloning. If zero hits → CANDIDATE-A transfer FALSIFIED, deprioritize substrate. Saves ~10-15 min per dispatch on LZ-falsified targets.

**File to:** `brain/Doctrine.md` as Doctrine #29 corollary or new sub-rule under CANDIDATE-A.

### Proposal 2 — Doctrine #34 OOS corollary

**Statement.** Doctrine #34 (Post-Audit HEAD Drift) EV recovery is bounded by SCOPE-LIST INCLUSION of the drifted module. When the entire post-audit drift surface lives outside the program's listed in-scope assets, Doctrine #34 multiplier yields zero in-scope EV. Confirm scope-list inclusion BEFORE applying the Doctrine #34 EV recovery multiplier.

**Worked anchor:** mETH 2026-05-27 Gate 1 — `src/liquidityBuffer/` has 4 fresh 2025-Q4 audits + 4 commits of post-audit drift, BUT is OOS on Immunefi.

**File to:** `brain/Doctrine.md` as Doctrine #34 OOS corollary.

### Proposal 3 — DC-9 sub-2 DEFENSE PATTERN second-substrate confirmation

**Statement.** mETH protocol confirms the AccessControl-ward-status pattern as the canonical DC-9 sub-2 defense in the LST/staking substrate class. Sky LockstakeMigrator anchor + mETH confirm. Pattern-class: any privileged-mutation surface with `onlyRole(X)` modifier where the role is granted/revoked via AccessControl + monitored at admin layer.

**File to:** `brain/Patterns-Defense-Classes.md` under DC-9 sub-2 DEFENSE PATTERN catalog (extend the Sky entry).

### Proposal 4 — Watchlist-Candidate-Crossmap row

**Row:**
```
| mETH (Mantle LSP) | Immunefi $500K, no-KYC | 16 audits, HIGH-J | FORECLOSED 2026-05-27 | CANDIDATE-A LZ falsified; in-scope contracts strong-defense; OOS LB+PM has drift but unbounty |
```

**File to:** `brain/Watchlist-Candidate-Crossmap.md`.

### Proposal 5 — Mantle bridge substrate note (for future cross-domain analysis)

**Statement.** Mantle L2 uses OP-Stack canonical bridge for L1↔L2 token movement (mETH L2 = canonical bridged ERC20). NOT a LayerZero-OFT substrate. Future Mantle-ecosystem dispatches should NOT carry CANDIDATE-A as a default lens. The OP-Stack bridge surface is its own substrate (Doctrine #29 LayerZero-DVN transfer DOES NOT apply; instead, OP-Stack cross-domain message verification applies — file DC-6 / DC-7 as primary lenses).

**File to:** `brain/Cross-Domain-Fragility-Laws.md` under Mantle entry.

---

## Disk discipline check

- Clone size: 5.6 MB (workspace `.tmp-clones/meth-gate1/contracts/`)
- Disk holds at 84% Avail 5.9G throughout dispatch — no pressure.
- Recommend: **purge clone post-foreclosure** to release 5.6 MB and stay aligned with foreclosure-purge protocol.

---

## Time accounting

- Step 0–1: 10 min (prior-corpus + WebFetch program page + scope page)
- Step 2: 15 min (primitive-greps + audit-saturation lookup)
- Step 3: 5 min (EV calc)
- Step 4: 2 min (queue decision)
- Step 5: 30 min (clone + 5-target checklist + DC-9 verification + initializeV2 deep-trace)
- Compose + write hunt file: 10 min
- **Total: ~72 min** — within the 60-90 min budget.

---

_Gate 1: mETH Immunefi | FORECLOSURE-RECEIPT | 2026-05-27_
_Brain compounds: 5 proposals queued | Next target: pull from Lane 5 DB highest-EV row not in current loop_
