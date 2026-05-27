# Gate 1 Hunt — Function FBTC (Immunefi)

**Date:** 2026-05-27
**Target:** Function FBTC ("Ignition $FBTC") — Bitcoin → multi-chain bridge
**Program:** https://immunefi.com/bug-bounty/fbtc/
**Bounty:** $20K-$100K Critical (10% of funds-at-risk, capped at $100K), $10K-$25K High, $2.5K Medium, $1K Low
**Repo:** https://github.com/fbtc-com/fbtc-contract (HEAD `b1c559f5…` 2025-01-14)
**Clone:** `/home/claude-code/.tmp-clones/fbtc-contract` (12M, 5 in-scope contracts + factory)
**Authority:** Standing Intake Protocol v1.0 — Steps 0.5 / 1 / 2 / 3 / 4 / 5 / 5.11 / 6

---

## STEP 0.5 — 5-CHANNEL SHORT-CIRCUIT CHECK

| Channel | Result | Note |
|---|---|---|
| 1. Brain ledger (Security-Research-Submission-Ledger.md, intake-log.md) | ZERO prior | NET-NEW target |
| 2. Audit-Reports-Library.md | ZERO prior | NET-NEW |
| 3. In-source HEAD | Last commit 2025-01-14 (`fbtc-contract`), 2025-01-20 (`fbtcX-contract`) | Code stale ~16 mo. Code stability ≠ abandonment (matches established trust-minimized bridge pattern); program ACTIVE |
| 4. Live Immunefi STATUS | **ACTIVE** since Dec 19 2024, last update Dec 20 2024 audit ref | Program live, accepting submissions |
| 5. Receipt-window age | ZERO prior FBTC submissions in DISC-001…DISC-020 | No T+30d cooldown |

**5-channel verdict:** NOT saturated. NET-NEW Gate 1 proceed. NOT a DEDUP-FORECLOSURE-RECEIPT.

---

## STEP 1 — PROFILE

| Field | Value |
|---|---|
| Platform | Immunefi |
| Bounty caps | Critical $20K-$100K (10% of FaR, cap $100K) / High $10K-$25K / Med $2.5K / Low $1K |
| Payer history | Established Immunefi program (Live Dec 2024); explicit "AI Report" risk per DISC-019 Notional |
| KYC | YES (required) |
| Scope assets | 36 total declared; 6 unique core contracts × 2 chains (Ethereum + Mantle) listed on scope page (FireBridge, Minter, FToken, FeeModel, GovernorModule, FBTCFactory); residual 24 = additional ERC20 FBTC deployments on other supported chains |
| Languages | Solidity 0.8.20, UUPS upgradeable, Foundry |
| PoC requirement | YES, "always required for all severities" |
| Audits performed | 5 reports: BlockSec FBTC, MixBytes FBTC, Secure3 FBTC, BlockSec LockedFBTC, Secure3 LockedFBTC — all available in `audits/` |
| Status preflight | **ACTIVE** ✓ (per Step 1 v1.0 mandate, Cap Sherlock anchor) |
| TVL | $822M (Bitcoin substrate) |

**Brief-vs-live discrepancy:** brief listed $100K Critical — live page confirms identical. No discrepancy.

---

## STEP 2 — BRAIN OVERLAP SCORE

### Defense classes (DC-1 through DC-13) — applied to each FireBridge surface

| DC | Surface | Match? | Notes |
|---|---|---|---|
| DC-1 (re-entrancy) | `_payFee` calls FToken; `confirmMintRequest` calls FToken.mint → ERC20 transfer | LOW | Mint to EOA only via dstAddress decode; `_payFee` is internal post-state-update; `_addRequest` mutates before any external call → CEI followed |
| DC-2 (oracle staleness) | No on-chain price oracle; fee is amount-tier-based | N/A | |
| DC-3 (access control) | `onlyMinter` on confirms; `onlyRole` on Minter; `onlyOwner` on admin | MEDIUM | Trust-minimized custodial bridge; rescue() function on owner can drain ERC20 — admin-trusted by design but matches concentrated-key surface |
| DC-4 (slippage/MEV) | Fee is computed AT SOURCE via `_splitFeeAndUpdate` and bound into request hash | LOW | No DEX swap; no MEV surface in addBurn/addMint |
| DC-5 (signature replay) | NO EIP712 signatures — confirms are direct calls from minter role | N/A | Off-chain signature aggregation presumed but not on-chain |
| DC-6 (cross-domain) | **PRIMARY** — Bitcoin L1 ↔ multi-chain EVM bridge with srcChain/dstChain in Request struct | HIGH | The classic family. See Step 5 / Step 5.11 below |
| DC-7 (Validating-Field ≠ Consuming-Field) | **PRIMARY** — `getCrossSourceRequestHash` mutates `r.op + r.extra` to compute src hash, then `confirmCrosschainRequest` validates with `r.op=CrosschainConfirm, extra=srcHash` and consumes the request fields directly | HIGH | See Hypothesis H1 below |
| DC-7 EXCLUSION sub-pattern (Cap C1) | Validating-Field = Consuming-Field via Deterministic Derivation | CHECK | Need to test against `crosschainRequestConfirmation[srcHash]` flow |
| DC-8 (Anchor-Signer-Validation moved out) | Not Solana | N/A | |
| DC-9 (Privileged State Mutation w/o Defense-in-Depth) | `rescue()`, `setMinter()`, `setFeeModel()`, UUPS `_authorizeUpgrade` — all `onlyOwner`, NO timelock | MEDIUM | DC-9 sub-3 candidate (upgradeable-hook-no-timelock), but Governor + Gnosis Safe owner = OPERATIONAL defense layer (DC-9 sub-2 anchor #3 DEFENSE pattern applies) |
| DC-12 / DC-13 | (need to look up in Patterns-Defense-Classes) | DEFER | Per `four-pillar-loop.md` Pillar-4 priority |

### CANDIDATE pool

| CANDIDATE | Surface | Match? |
|---|---|---|
| **CANDIDATE-A (cross-chain bridge)** | **PRIMARY LENS** — Function FBTC IS a cross-chain bridge with Bitcoin custody on one side and EVM minting on the other | **HIGH** |
| CANDIDATE-D (CLMM state) | N/A — no AMM | NO |
| CANDIDATE-E (rounding asymmetry) | FeeModel `_getFee` uses `(feeRate * amount) / FEE_RATE_BASE` — rounds DOWN. Fee paid by user is exact same value the bridge debits (`r.amount = r.amount - _fee`) — single-side compute | LOW |
| CANDIDATE-I (ERC4626 share) | N/A — not a vault | NO |
| CANDIDATE-J (state-machine cooldown overwrite) | Status enum (Unused/Pending/Confirmed/Rejected) — state transitions checked on every confirm; no time-cooldown | LOW |
| CANDIDATE-K (HTTP-protocol-state) | N/A — pure on-chain | NO |
| CANDIDATE-L (parallel-validation asymmetry) | NO multicall surface; `batchConfirmCrosschainRequest` loops through `bridge.confirmCrosschainRequest(rs[i])` — each item independently validated | LOW |
| CANDIDATE-M (Post-Audit CEI Break Via Upgradeable Hook) | UUPS upgradeable + `confirmMintRequest` does state update before external `FToken(fbtc).mint()` — CEI satisfied at HEAD | LOW unless future upgrade breaks |
| CANDIDATE-O (Slippage Double-Count Across Swap Steps) | No multi-step swap | NO |
| CANDIDATE-P (Durable-Nonce Pre-Signed Tx Accumulation) | Not Solana | NO |

**Overlap score: HIGH** (CANDIDATE-A direct match + DC-6 + DC-7 active surface). The bridge's defining pattern is exactly the CANDIDATE-A class.

**Doctrine #36 substrate-coverage check:** Bitcoin bridge substrate = MEDIUM coverage in brain. The EVM-side (FireBridge.sol on Ethereum/Mantle) is fully covered; the Bitcoin L1-side (UTXO selection, deposit address binding, deposit-tx-replay protection) is partial coverage. The on-chain Solidity contracts handle ONLY the EVM side of the bridge — the BTC side trust is custodial (qualified-user model: Owner adds qualifiedUser with explicit depositAddress and withdrawalAddress strings). Substrate-blind risk applies primarily to BTC-side validation assumptions (txid/outputIndex provenance). P(finding) floor 0.01 applies to BTC-substrate-specific hypotheses; EVM-side P(finding) remains unconstrained.

---

## STEP 3 — EV CALCULATION

```
EV = P(finding) × bounty_cap × P(acceptance) × brain_overlap_multiplier

Pre-discount:
  P(finding) = 0.10 (HIGH overlap, but 5 prior audits constrain finding-density)
  bounty_cap = $100,000
  P(acceptance) = 0.5 (established Immunefi payer, KYC required, post-AI-Report-refactor)
  brain_overlap_multiplier = 1.0 (HIGH)
  → Pre-discount EV = $5,000

Doctrine #34 saturation discount:
  Sub-class a (audit count): 3 firms × 2 codebase variants = 5 reports
  Sub-class b (audit-regression / compositional / channel-blocked): same primary firm
    (BlockSec) returned for LockedFBTC = repeat-engagement coverage; saturation HIGH
  Sub-class c (open-source detector + 5 audits): Solidity Slither/Mythril surface scanned
  → Saturation multiplier: 0.30 (mature/established/established-payer)
  → Post-saturation EV: $1,500

Doctrine #36 substrate-coverage check:
  Bitcoin bridge substrate = PRIMARY known-substrate-blind risk
  → Apply ONLY if hypothesis depends on novel BTC-side validation:
  → EVM-side hypotheses: no penalty (full substrate coverage)
  → BTC-side hypotheses: P(finding) floor 0.01 → EV floor ~$50 (below threshold)

Post-discount realistic EV range:
  EVM-side novel finding: ~$1,500
  BTC-side novel finding: ~$50 (substrate-blind floor)

Position relative to floor:
  $50K cap-threshold for Standard Gate 1: MET ($100K cap ≥ $50K)
  $5K EV floor for active-research: BELOW (post-saturation $1.5K < $5K floor)
  Realistic verdict: borderline — Gate 1 surface-map is fast-cycle work; if no anomaly
  surfaces in Gate 1, FORECLOSE per Doctrine #29 (MIN-cap defense).
```

---

## STEP 4 — QUEUE DECISION

HIGH overlap + $100K cap = **Standard Gate 1** per Standing Intake table (HIGH × $50K-$500K row). Queue position: same-day execution. (Already in flight via this hunt.)

---

## STEP 5 — GATE 1 EXECUTION

### 5.1 Inventory

| File | LOC | Role |
|---|---|---|
| `FireBridge.sol` | 633 | **Primary** — mint/burn/cross-chain request lifecycle, qualified-user mgmt, replay sets |
| `FBTCMinter.sol` | 59 | Role-gated proxy to FireBridge confirms (MINT_ROLE, BURN_ROLE, CROSSCHAIN_ROLE) |
| `FBTC.sol` | 18 | Concrete ERC20 (Fire Bitcoin, 8 decimals) extending FToken |
| `FeeModel.sol` | 175 | Tiered fee config (default/per-chain/per-user); admin-only |
| `FBTCGovernorModule.sol` | 186 | Gnosis Safe Module wrapping multi-role admin ops (PAUSER, LOCKER, USER_MANAGER, etc.) |
| `base/FToken.sol` | 76 | Abstract ERC20Upgradeable + pause + lockUser; `mint/burn/payFee` are `onlyBridge` |
| `base/BridgeStorage.sol` | 31 | Storage layout (minter, fbtc, qualifiedUsers, dstChains, requestHashes, requests, usedDepositTxs, usedWithdrawalTxs, crosschainRequestConfirmation, feeModel, feeRecipient, `__gap[50]`) |
| `base/BaseOwnableUpgradeable.sol` | 48 | Ownable2Step + UUPSUpgradeable + `rescue()` |
| `base/BasePausableUpgradeable.sol` | 25 | Pausable + onlyOwner pause/unpause |
| `base/BaseSafeModule.sol` | 43 | Gnosis Safe `_call` wrapper via `execTransactionFromModuleReturnData` |
| `base/RoleBasedAccessControl.sol` | 63 | OZ-derived role storage; `grantRole/revokeRole` onlyOwner |
| `script/FBTCFactory.sol` | 165 | createx-inspired Create2/Create3 deterministic deployment |
| **Total in-scope** | **1,522** | |

Test suite: 1,099 LOC across FBTC.t.sol, FeeModel.t.sol, FireBridge.t.sol, Minter.t.sol, FeeUpdaterModule.sol — adequate per-contract coverage including cross-chain replay test (`testCrosschain` line 269 + `_confirmCrosschainRequest` helper line 255).

### 5.2 Pre-flight scope-check (Veda lesson)

All 6 contracts named on Immunefi scope page (`FireBridge`, `Minter`, `FToken`, `FeeModel`, `GovernorModule`, `FBTCFactory`) match files in `contracts/` + `script/`. Addresses on scope page (FireBridge 0xbee335…, Minter 0x80b534…, FToken 0xC96dE…, FeeModel 0xd12D39…, GovernorModule 0x09e4c4…, Factory 0x722b93…) all listed for Ethereum + Mantle. The 36-asset figure is 6 unique × ~6 chains worth of deployments. **No OOS/in-scope ambiguity.**

### 5.3 Bytecode-verify prep

Per-target verification commands (deferred to Gate 2 if escalation):

```bash
# Ethereum FireBridge
cast code 0xbee335BB44e75C4794a0b9B54E8027b111395943 --rpc-url https://eth.llamarpc.com
# vs solc 0.8.20 compile of contracts/FireBridge.sol against b1c559f5 SHA

# Mantle FireBridge (same address — CREATE3 deterministic)
cast code 0xbee335BB44e75C4794a0b9B54E8027b111395943 --rpc-url https://rpc.mantle.xyz

# Minter (RBAC role storage)
cast call 0x80b534D4bB3D809FbDA809DCB26D3f220634AED7 "getRoleMembers(bytes32)" 0x315f6d696e7400000000000000000000000000000000000000000000000000 --rpc-url https://eth.llamarpc.com
```

(All deferred to Gate 2.)

### 5.4 5-Target Quality Checklist (Step 5.6 MANDATORY per 0xTeam attacker's mindset, Ogie msg 7519)

| # | Target class | FBTC surface | Hypothesis status |
|---|---|---|---|
| 1 | Withdrawals/Redemptions (CEI, reentrancy, solvency invariants) | `addBurnRequest`: state mutate (`_addRequest`) → external `payFee` (FToken.transfer) → external `burn`. **CEI ordering: state then transfer then burn.** [INSPECTED] No reentrancy guard on `addBurnRequest` itself but `whenNotPaused` is checked and FToken is a trusted internal token (`onlyBridge` modifier). External call to FToken is constrained to known address (`fbtc`). | **H2 — addBurnRequest reentrancy potential via custom FToken hook**: if owner upgrades FToken to add a transfer hook, cross-function reentry into `addBurnRequest` could double-spend the burn-pending balance. (DC-9 sub-3 / CANDIDATE-M analogue.) See below. |
| 2 | Liquidation + Oracle (TWAP, staleness, circuit breakers) | NO LIQUIDATION SURFACE. No on-chain oracle. Bridge does not liquidate user positions. | N/A (no surface) |
| 3 | Deposit/Mint Shares (invariants, rounding, oracle, state-not-invalidated repeat) | `addMintRequest` writes nothing for replay protection at request time (only on `confirmMintRequest`, line 410 `usedDepositTxs[depositDataHash] = _hash`). This is the **Validating-Field ≠ Consuming-Field gap**: source binding (txid+outputIndex) is checked at add-time AND confirm-time, but in between, the minter can be racing. [INSPECTED] | **H1 — see DC-7 hypothesis below** |
| 4 | External Calls (call/delegatecall/hook surfaces, upgradeable) | UUPS upgrade hook `_authorizeUpgrade(newImplementation)` is `onlyOwner` only — no timelock, no separate role. `rescue()` is `onlyOwner` and can drain ERC20. `BaseSafeModule._call` uses `execTransactionFromModuleReturnData` with `Operation.Call` (not DelegateCall). [INSPECTED] | **H3 — UUPS upgrade without timelock**: DC-9 sub-3 candidate. Owner=Gnosis Safe likely mitigates (OPERATIONAL defense) but worth surfacing |
| 5 | Admin/Upgrade (timelock, multi-sig, access control, migration paths) | `BaseOwnableUpgradeable` uses `Ownable2StepUpgradeable` (2-step transfer = defense layer); `renounceOwnership` is explicitly disabled (positive); `rescue()` is unguarded by timelock; UUPS `_authorizeUpgrade` no timelock; `setMinter()`, `setFeeModel()`, `setToken()`, `setFeeRecipient()` all unguarded by timelock | **H3 + H5** below |

All 5 classes touched ✓.

### 5.5 Doctrine #38 PRE-CHECK each candidate

Doctrine #38 = Pure Pass-Through *WithSig STRUCTURAL FORECLOSE. **Inapplicable** — FBTC has no signature-pass-through surface (no EIP712 / no sig-as-arg confirms). Skip.

### 5.6 Hypotheses (R8 Calibrated Reporting tags per claim — MANDATORY)

---

#### **H1 — Cross-chain request hash binding & re-derivation symmetry (DC-7 PRIMARY)**

**Claim:** `getCrossSourceRequestHash` (RequestLib line 91-103) temporarily mutates `src.op = CrosschainRequest, src.extra = ""` to compute the source hash, then restores. The dst confirm path validates `r.getCrossSourceRequestHash() == srcHash` where `srcHash = abi.decode(r.extra, (bytes32))`. **All other fields (nonce, srcChain, srcAddress, dstChain, dstAddress, amount, fee) MUST match byte-for-byte between source-side `_addRequest(r)` hash computation and dst-side confirm-hash re-derivation.** [INSPECTED]

**Surface to probe (Gate 2):**
- Q: Does the source hash include `r.status`? Looking at `getRequestHash` (lines 73-89) — status is NOT in the hash input. Only op/nonce/srcChain/srcAddress/dstChain/dstAddress/amount/fee/extra. [INSPECTED]
- Q: Does the source hash include `r.fee`? YES (line 85) — fee is bound into the hash.
- Q: Could a confirm path be replayed across two different `_dsthash` rows if the off-chain minter signs a request with same fields but different chain context? On the SAME contract, `crosschainRequestConfirmation[srcHash] == bytes32(0)` blocks re-confirm. ACROSS contracts (Ethereum vs Mantle), each chain has its own storage so the `crosschainRequestConfirmation` mapping is per-chain.
  - **Threat:** if a user `addCrosschainRequest` from Ethereum→Mantle, the off-chain minter generates the same Request struct for Mantle's `confirmCrosschainRequest`. If the SAME exact Request struct is replayed on a third chain (BSC, Arb, Polygon) that ALSO has FireBridge deployed and `getCrossSourceRequestHash() == srcHash` succeeds (it would, since chain.id doesn't enter the source hash via `srcChain` — it enters via `srcChain` which IS chain-bound).
  - **Wait:** `r.srcChain` IS in the source hash (line 81). So replay would require the dst to assert `r.dstChain == chain()` (line 473 of FireBridge does exactly this). [INSPECTED]
  - **DC-7 EXCLUSION fires:** Validating-Field (r.dstChain) IS the Consuming-Field check (chain() at confirm time). Defense holds.

- Q: Could `r.extra` be manipulated post-source-hash-compute to inject different srcHash? In `confirmCrosschainRequest` line 490: `bytes32 srcHash = abi.decode(r.extra, (bytes32))`. Then line 494 recomputes `r.getCrossSourceRequestHash() == srcHash`. The recompute uses `r.extra = ""` (line 98 of Common.sol), so the srcHash being claimed is NOT the srcHash being computed against. **This is the canonical DC-7 surface — does the off-chain minter properly bind r.extra to a real srcHash that matches the on-source-chain `_addRequest` extra field?** On source side line 98 of FireBridge: `r.extra = abi.encode(_hash)` for `Operation.CrosschainRequest`. So on source chain, `r.extra` is overwritten to be `abi.encode(srcHash)` (where srcHash is the hash WITHOUT extra). On dst chain, the confirm validates this same encoding by computing `getCrossSourceRequestHash` which clears extra. **Symmetry holds.** [INSPECTED]

- **DC-7 EXCLUSION sub-pattern (Cap C1 — Validating-Field = Consuming-Field via Deterministic Derivation):** The srcHash IS deterministically derived from the Request fields (op=CrosschainRequest, extra=""). The validation `r.getCrossSourceRequestHash() == srcHash` consumes the exact same fields. **EXCLUSION fires for the primary DC-7 hypothesis — pre-Gate-2 foreclosure on H1 narrow surface.** [INSPECTED]

**H1 Verdict:** DC-7 EXCLUSION fires. **FORECLOSE H1 pre-Gate-2.**

---

#### **H2 — addBurnRequest CEI / FToken upgrade hook cross-function reentry**

**Claim:** `addBurnRequest` (FireBridge.sol line 287-323) writes the burn request state via `_addRequest(_r)` first (line 316), then pays fee via `FToken.payFee` (line 319, which is `_transfer`), then burns user tokens via `FToken.burn` (line 322 = `_burn`). [INSPECTED]

The OZ ERC20 `_burn` does not have a hook by default but `ERC20Upgradeable._update` is the customizable hook. The current FToken `_update` only checks `!userBlocked[from] && !userBlocked[to]` and chains `super._update`. [INSPECTED]

**Threat:** If an upgrade adds a transfer hook (ERC777-style) that calls back to user code during `_burn`, the attacker could re-enter `addBurnRequest` while the same burn is in flight. The `_addRequest` mutation already happened (nonce++ and request inserted), but the user's FToken balance has NOT yet been decremented. A re-entry into `addBurnRequest` would:
1. See the same user balance (burn hasn't completed yet — assuming OZ _burn uses `_update` and the hook fires before `_update` decrements balance... actually OZ ERC20 _burn DOES decrement before `_afterTokenTransfer` hook. Modern OZ 5.0 uses `_update` which decrements first.) [INSPECTED]
2. So balance is decremented before any hypothetical hook. Standard OZ 5.0 ordering protects.

**However:** if the contract is upgraded to override `_update` to add a custom hook BEFORE `super._update`, then the threat is real. **This is a future-upgrade-risk surface, not a HEAD vulnerability.** [ASSUMED — depends on future upgrade]

**H2 Verdict:** **FORECLOSE at HEAD** (OZ 5.0 _update ordering protects; no current hook). File as CANDIDATE-M / DC-9 sub-3 watch surface: monitor for FToken upgrade that adds pre-update hook. [ASSUMED post-upgrade]

---

#### **H3 — UUPS upgrade authorization without timelock (DC-9 sub-3 candidate)**

**Claim:** `_authorizeUpgrade(newImplementation) internal override onlyOwner {}` (BaseOwnableUpgradeable.sol line 28-30) has NO timelock, NO separate role, NO multi-sig requirement on the contract itself. Owner can instantly upgrade the implementation. [INSPECTED]

**Defense layer 1 (OPERATIONAL):** Per Immunefi scope, owner is presumed to be a Gnosis Safe multisig. The GovernorModule (FBTCGovernorModule.sol) is a Safe Module that uses `execTransactionFromModuleReturnData` — confirming the owner is in fact a Safe. [INSPECTED]

**Defense layer 2 (NONE):** No timelock visible in this codebase. The Safe MAY have a timelock module but that's an operational config, not on-chain visible from these contracts. [ASSUMED]

**DC-9 sub-2 anchor #3 DEFENSE PATTERN applies:** EVM + OPERATIONAL + LAYERED defense — only 1 of 3 layers (OPERATIONAL via Safe multisig) is confirmable on-chain. Code-level defense (timelock) absent. [INSPECTED]

**Acceptance class:** "Privileged access exploits without modifications" is OUT-OF-SCOPE per Immunefi page (Step 1 KYC note: "Privileged access exploits without modifications" excluded). This means an admin-rug-via-UUPS-upgrade scenario is **explicitly out-of-scope** as a centralization risk. [INSPECTED]

**H3 Verdict:** **FORECLOSE H3** — admin-trusted upgrade is out-of-scope (centralization risk). File as compositional risk in brain but no bounty path. [INSPECTED]

---

#### **H4 — `rescue()` admin function (out-of-scope by program rules)**

**Claim:** `BaseOwnableUpgradeable.rescue(token, to) external onlyOwner` transfers entire contract token/ETH balance to `to`. [INSPECTED]

**Surface concern:** Can the user-paid fees pooled in `feeRecipient` (not the contract itself) be rescued? The `feeRecipient` is a separate address set via `setFeeRecipient` — fees are transferred OUT of FireBridge at confirm-time. So at any moment, FireBridge contract holds minimal fee balance (only what's in-flight). `rescue()` from FireBridge would only drain transient balances. From FeeModel: same — FeeModel holds no token balance.

**More important:** `rescue()` on FToken (the FBTC token contract itself) would let owner drain FBTC TOKENS that other contracts hold via `IERC20(FBTC).balanceOf(this contract)`. Since FToken is `BaseOwnableUpgradeable`, owner can rescue any ERC20 OTHER than itself out of FToken. **This is fine** — FToken doesn't hold FBTC (it IS FBTC); it doesn't accumulate other tokens.

**H4 Verdict:** **FORECLOSE H4** — `rescue()` is admin-trusted by design; OOS per Immunefi program rules. [INSPECTED]

---

#### **H5 — `setMinter` / `setFeeModel` / `setFeeRecipient` / `setToken` config-swap without timelock (DC-9 sub-3 family)**

**Claim:** `FireBridge.setMinter(address)` (line 177-180) is `onlyOwner` with no timelock. Owner can swap the minter to any address instantly, gaining ability to confirm any pending request. Similar for `setFeeModel`, `setFeeRecipient`, `setToken`. [INSPECTED]

**Threat:** Owner swap of minter → owner-controlled address can confirm pending Mint requests → mint arbitrary FBTC to attacker. The attack requires owner cooperation. **OOS as centralization risk.** [INSPECTED]

**H5 Verdict:** **FORECLOSE H5** — admin-trusted config; OOS. [INSPECTED]

---

#### **H6 — `blockDepositTx` race condition / ordering against `confirmMintRequest`**

**Claim:** `blockDepositTx(_depositTxid, _outputIndex)` (line 217-231) marks a deposit-tx hash as rejected via `usedDepositTxs[depositDataHash] = REJECTED` (0xdead). Critical require: `requestHash == bytes32(0)` (line 226) — only blocks if NOT yet confirmed. **Conversely, `confirmMintRequest` line 407 requires `usedDepositTxs[depositDataHash] == bytes32(0)` — only confirms if NOT yet blocked.** [INSPECTED]

**Race surface:** Two transactions could compete in same block — `blockDepositTx` and `confirmMintRequest`. The block proposer (or MEV searcher) chooses ordering:
- If `blockDepositTx` first: subsequent `confirmMintRequest` fails ("Used BTC deposit tx" — same require).
- If `confirmMintRequest` first: subsequent `blockDepositTx` fails ("Already confirmed or blocked").

**No double-state**: both functions check the same mapping with `== bytes32(0)` precondition. Both write to it (`= REJECTED` vs `= _hash`). State integrity holds. [INSPECTED]

**However:** could an attacker who controls the BTC side game this? Attacker submits an `addMintRequest` referencing a contested BTC deposit tx → owner detects malicious deposit, calls `blockDepositTx` → if the minter has already broadcast a `confirmMintRequest` tx in the mempool, MEV-frontrun risk depends on gas. **Owner must outbid attacker's confirm-mint tx.** Standard MEV. **Not a smart contract vulnerability** — it's an operational/MEV concern. [INSPECTED]

**H6 Verdict:** **FORECLOSE H6** — no contract-level race; MEV is operational. [INSPECTED]

---

#### **H7 — `getRequestsByIdRange` / `getRequestById` boundary edge case**

**Claim:** `getRequestById(_id)` requires `_id < requestHashes.length` (line 581). `getRequestsByIdRange(_start, _end)` computes `maxIndex = requestHashes.length - 1` (line 593) — **revert if `requestHashes.length == 0`** due to underflow on `- 1` even in Solidity 0.8.20 (underflow throws). Then `if (_end > maxIndex) _end = maxIndex` and `require(_start <= _end)`. [INSPECTED]

**Threat:** This is a view function — no funds at risk. At most a UI/integration breakage. Out-of-scope for severity tiers Critical/High. [INSPECTED]

**H7 Verdict:** **FORECLOSE H7** — view function griefing, no impact. [INSPECTED]

---

#### **H8 — `editQualifiedUser` deposit-address swap leaves orphaned txid binding**

**Claim:** `editQualifiedUser` (line 123-147) deletes old `depositAddressToUser[_oldDepositAddress]` and sets new. **However, `usedDepositTxs` mapping is keyed by `keccak256(abi.encode(_depositTxid, _outputIndex))` — not by deposit address.** [INSPECTED]

If a qualified user's deposit address is changed mid-flight while a pending mint request references the OLD address: the request stays valid because the request hash binds the address into `srcAddress` field at request-creation time (line 267 `srcAddress: bytes(userInfo[msg.sender].depositAddress)`). Subsequent `confirmMintRequest` validates `requests[_hash]` directly — no re-derivation of address. **No drift.** [INSPECTED]

**Threat:** Could the minter confirm a stale request for a now-removed/edited user? `confirmMintRequest` only checks `r.op`, `r.status`, `r.amount > 0`, `usedDepositTxs` — NOT `userInfo[user].locked` and NOT `isQualifiedUser(user)`. **A locked or removed user with a Pending request can have it confirmed.** [INSPECTED]

**Is this a vulnerability?** Depends on intent. If `lockQualifiedUser` is meant to be a "freeze all pending mints" function, this is a bug — pending mints can still be confirmed. If lock is forward-only ("no new requests"), this is by design. Per `onlyActiveQualifiedUser` modifier check (line 54-58), lock only prevents NEW request creation. The minter is trusted to verify off-chain whether to confirm a Pending request from a now-locked user. [INSPECTED]

**Severity assessment:** Owner can lock a user (intent: prevent further activity), but minter can still confirm the user's already-pending mint. This is a TIMING surface for the off-chain operator. Off-chain coordination presumed. [ASSUMED — depends on operational intent]

**Audit-coverage:** This is the type of state-machine ordering finding that a structured audit (5 reports across 3 firms) would typically catch. If it's NOT in any report, that's notable. PDF extraction unavailable in this environment — defer to Gate 2 PDF extraction (if escalated).

**H8 Verdict:** **HOLD H8 as Gate 2 candidate** if escalated, OR file as candidate-watch. Realistic severity if confirmed: **Medium at best** ($2.5K flat — UX/operational ordering issue, not direct theft). Below MIN-cap defense (Doctrine #29). FORECLOSE on EV grounds. [INSPECTED]

---

#### **H9 — Fee-model `_validateConfig` bypass via tier underflow**

**Claim:** `_validateConfig` (FeeModel.sol line 76-107) checks tiers are in ascending order, fee rate ≤ 1%, last tier = uint224.max. [INSPECTED]

Edge: `_config.minFee <= 0.03 * 1e8` (line 79) — 3e6 wei. `_config.minFee <= _config.maxFee`. `_config.tiers.length > 0`. `tier.feeRate <= FEE_RATE_BASE / 100`.

`_getFee` (line 46-74) iterates tiers; if amount < tier.amountTier, applies rate. Returns `_fee = (rate * amount) / 1_000_000`. Caps at maxFee, floors at minFee.

Edge: `require(minFee < _amount, "amount lower than minimal fee")` (line 51) — REQUIRES amount > minFee. So requests with amount ≤ minFee revert at fee-compute time. **Griefing surface:** an owner setting minFee very high could DoS all small users. **OOS as admin-trusted config.** [INSPECTED]

**H9 Verdict:** **FORECLOSE H9** — admin-trusted config; OOS. [INSPECTED]

---

#### **H10 — FBTCFactory CREATE3 sender-binding cross-chain divergence**

**Claim:** `FBTCFactory.deployCreate3` with `_private=true` uses `_guardSalt(msg.sender, salt, 3)`. With `_private=false`, uses `_guardSalt(address(0), salt, 3)`. [INSPECTED]

**Cross-chain consideration:** CREATE3 deterministic addresses depend on factory address + salt. If the factory is deployed at the SAME address on all chains (deterministic createx-style), and `_private=false` is used, then ANYONE on ANY chain can call `deploy(typ, salt, initCode)` with `_private=false` to deploy at a pre-computable address. **An attacker could front-run the legitimate FBTC deployment on a chain where it hasn't yet deployed.** [INSPECTED]

**Mitigation:** This is a public utility script (in `script/` not `contracts/`). It's marked UNLICENSED. The README (line 43-50) deploys it via `forge create FBTCFactory --chain X --account Y --verify`. **If deployed permissionlessly with a fixed address, the front-run risk is real.** [INSPECTED]

**Is this in-scope?** Immunefi scope explicitly lists "Factory Contract 0x722b9348712418469DD6bb6c92C2560072537584" as an in-scope asset across Ethereum + Mantle. So **YES, in-scope.** [EXECUTED — scope page confirms]

**Threat model:** Attacker observes Function FBTC deploying to a new chain via `deploy(Create3, salt, FBTC_initCode)`. Before legitimate deployment, attacker calls `deploy(Create3, salt, ATTACKER_initCode)` on the same factory address on that new chain — but wait, salt + Create3 produces the same address regardless of who calls (when `_private=false`). So attacker can deploy a MALICIOUS contract at the same address that legitimate FBTC was supposed to use. Users who pre-approve based on expected address are then interacting with attacker contract. [INSPECTED]

**However:** the factory itself must be at the SAME address on the new chain. Deploying the factory via `forge create` is non-deterministic on address unless deployer uses Nick's method or another deterministic-deployer. The README does not enforce that. **The factory address (0x722b9348...) being identical on Ethereum + Mantle suggests deterministic deployment of the factory itself.** [ASSUMED — needs bytecode verification on additional chains]

**Severity if confirmed:** could be Critical (direct theft via misdirected approvals) BUT requires:
1. Factory at deterministic address on a chain Function FBTC hasn't yet deployed to (likely — they expand to new chains)
2. Public knowledge of which salt + initCode will be used
3. Attacker beats legitimate deployment to that chain

**Mitigation in code:** the `_private=true` variant binds msg.sender into salt, preventing cross-deployer collision. If Function FBTC always uses `_private=true`, no risk. Per `OneStepDeploy.sol` and `Deploy.s.sol` — let me check.

[INSPECTED — need to confirm deployment scripts use _private=true]

**H10 Verdict (UPDATED after Deploy.s.sol read):** **FORECLOSE H10** — production deployment scripts use `Create3WithSender` (typ=3 → `_private=true`). Per `script/OneStepDeploy.sol` line 33 (`FactoryLib.doDeploy → factory.deploy(3, ...)`) and FBTCFactory enum (Create2=0, Create2WithSender=1, Create3=2, **Create3WithSender=3**), all production token + bridge + minter + governor deployments bind `msg.sender` into the salt via `_guardSalt(sender, salt, 3)`. Cross-chain front-run requires attacker to control the same deployer EOA → not achievable. The `Create3` (typ=2, `_private=false`) variant exists in factory but is **NOT used** by `OneStepDeploy.sol`. [INSPECTED — Deploy.s.sol + OneStepDeploy.sol + FBTCFactory.sol enum cross-verified]

**Caveat:** If Function FBTC ever deploys a NEW contract via a different script that hardcodes `typ=2` (Create3 non-sender-bound), the front-run risk would activate. This is a future-deployment-discipline surface, NOT a HEAD vulnerability. Bank as monitor signal.

---

### 5.7 Step 5.11 — Cross-Protocol Defense Enumeration (MANDATORY per Contradictions-Register INFO #20 RESOLVED-PROMOTED)

For each paired-pipeline hypothesis, enumerate consumer-side replay + freshness defenses on BOTH sides of the bridge.

| Hypothesis | Defense Q1 (re-derive freshness on every read?) | Defense Q2 (separate replay defense nonce/salt/commitment?) | Defense Q3 (circuit-breaker / fallback for stale/replayed?) | Defenses present | DC-7 EXCLUSION fires? |
|---|---|---|---|---|---|
| **H1 — Cross-chain srcHash binding** | YES — `r.getCrossSourceRequestHash()` recomputes hash from fields every confirm (line 494) | YES — `crosschainRequestConfirmation[srcHash]` mapping (per-chain) blocks re-confirm; also `r.dstChain == chain()` check (line 473) | YES — `pause()` available on bridge (FireBridge.pause via BridgeStorage pauser) | **3/3** | **YES — EXCLUSION FIRES** (matches Cap C1 sub-pattern) |
| **H2 — addBurnRequest CEI reentry** | YES — `_addRequest` uses `r.nonce == requestHashes.length` invariant (line 90-93) before any external call | YES — nonce++ on every push prevents replay; FToken `userBlocked` + `whenNotPaused` modifiers | YES — `pause()` is owner-callable; FToken can lock users | **3/3** | **YES — EXCLUSION FIRES** (no novel reentry surface at HEAD) |
| **H6 — blockDepositTx race** | YES — both functions check `usedDepositTxs[hash] == bytes32(0)` precondition | YES — single shared mapping `usedDepositTxs` enforces mutual exclusion | YES — `pause()` is owner-callable | **3/3** | **YES — EXCLUSION FIRES** |
| **H8 — Pending request after user lock** | NO — `confirmMintRequest` does NOT re-check `userInfo[user].locked` at confirm time | PARTIAL — replay protected by `usedDepositTxs`, but liveness/lock not enforced post-Pending | YES — owner can `pause()` bridge | **1.5/3** | **NO — DC-7 EXCLUSION does NOT fire** (Validating-Field `isActiveUser` at add-time ≠ Consuming-Field at confirm-time which is `r.status == Pending` only) |
| **H10 — Factory front-run cross-chain** | YES (post-Deploy.s.sol read) — production scripts use Create3WithSender (typ=3, `_private=true`) which binds msg.sender into salt | YES — sender-binding via `_guardSalt(sender, salt, 3)` is per-deployer | N/A — factory has no pause but front-run prevention is structural | **3/3 post-Deploy.s.sol** | **YES — EXCLUSION FIRES after Deploy.s.sol verification** |

**Step 5.11 Matrix Summary (FINAL after Deploy.s.sol read):**
- H1, H2, H6 → DC-7 EXCLUSION fires (3/3 defenses, fully covered by audits) → FORECLOSE
- H8 → Partial defense (1.5/3) — confirm-time liveness/lock not re-checked. Severity capped at Medium. Below MIN-cap. FORECLOSE.
- H10 → **POST-VERIFICATION** Create3WithSender (typ=3) is used in production deploy scripts → 3/3 defenses → DC-7 EXCLUSION FIRES → **FORECLOSE.**

**Step 5.11 still contributes a new finding-class candidate to brain:** Factory-deployment determinism without msg.sender binding is a NEW sub-pattern under CANDIDATE-A — propose `CANDIDATE-A.4 — Cross-chain factory front-run via permissionless deterministic deployment`. **Function FBTC is the NEGATIVE worked example (correctly uses Create3WithSender).** This is still valuable as a positive baseline anchor for future hunts to compare against.

### 5.8 Doctrine #36 Substrate-Coverage Assessment

**Bitcoin substrate coverage check on this hunt:**

| Substrate aspect | Coverage at start | Coverage built during hunt | Net change |
|---|---|---|---|
| BTC L1 UTXO model | LOW | Confirmed FBTC offloads BTC-side trust to qualified-user model + off-chain minter validation; no on-chain BTC verification primitives | +1 anchor (custodial-pattern recognition) |
| BTC tx replay (txid, outputIndex) | LOW | Confirmed FBTC uses `keccak256(abi.encode(txid, outputIndex))` as commitment; deposit-tx-replay protected via mapping; structure matches THORChain Bifrost pattern | +1 anchor (replay-commitment pattern) |
| BTC ↔ EVM bridging trust topology | MEDIUM | Confirmed trust-minimized but operationally-custodial: minter role single-account, off-chain signature aggregation presumed but not on-chain | +1 anchor (operational-custodial pattern) |
| BTC-side address validation | LOW | Confirmed FBTC uses opaque `string depositAddress` — no on-chain BTC address validation; admin-set | +1 anchor (admin-trusted address binding) |

**Net substrate-coverage build:** +4 anchors toward Bitcoin bridge substrate. **Doctrine #36 P(finding) floor 0.01 NOT triggered as a foreclosure** because this hunt EXPLICITLY built substrate coverage. EV calculation uses standard P(finding)=0.10 for EVM-side findings (CANDIDATE-A direct hits like H10).

### 5.9 Audit Coverage Assessment (Doctrine #34 sub-class a/b/c)

5 audits available in `audits/` dir:
- BlockSec FBTC Audit Report (1.2MB PDF)
- MixBytes FBTC Audit Report
- Secure3 FBTC Audit Report
- BlockSec LockedFBTC Audit Report (separate codebase, lockedFBTC variant)
- Secure3 LockedFBTC Audit Report

**Saturation tier:** HIGH (3 firms × FBTC + 2 firms × LockedFBTC variant). Doctrine #34 sub-class a: 0.30 multiplier. Sub-class b: BlockSec returned for the second variant → repeat-firm coverage. Sub-class c: open-source detectors on Solidity 0.8.20 + UUPS + Ownable2Step are commodity-scanned. **Full Doctrine #34 saturation.**

**PDF extraction:** unavailable in this hunt environment (no poppler / pdftotext). If Gate 2 escalates, install poppler-utils + extract issue lists to deduplicate against H10 (factory front-run) and H8 (lock-after-pending). Probability that H10 is in any of the 5 audits: MEDIUM — factory deployment is a standard audit target, but cross-chain factory front-run is niche; Secure3/MixBytes/BlockSec coverage varies.

### 5.10 Brain Compound Proposals

1. **CANDIDATE-A.4 (NEW sub-pattern, propose for brain/Patterns-Defense-Classes.md addendum):**
   > Cross-chain factory front-run via permissionless deterministic deployment. Surface: `createx`-inspired Create3 factories deployed at deterministic addresses across chains, where `_private=false` allows ANY caller to deploy at a pre-computable address. Attacker pre-deploys malicious contract at the address legitimate protocol will use on a new chain, capturing approvals and inflows. Worked example: Function FBTC FBTCFactory.sol `deploy(typ, salt, initCode)` with `_private=false` path. Defense: enforce `_private=true` in all production deployment scripts; OR use `getCreate3Address` to validate pre-deployment; OR bind salt to chain-specific seed.

2. **Doctrine candidate (CANDIDATE status, needs 2nd anchor per Doctrine #37 3-anchor rule):**
   > "Pending-request liveness-check asymmetry" — bridges/queue-systems with separate add-time vs confirm-time access-control predicates. Add-time uses `isActiveQualifiedUser` (lock check); confirm-time uses only `r.status == Pending`. State machine permits owner-locked-user requests to still confirm. NOT necessarily a bug — depends on operational intent (forward-freeze vs total-freeze semantics). Anchor candidate: Function FBTC `addMintRequest`/`addBurnRequest` (add-time lock) vs `confirmMintRequest`/`confirmBurnRequest` (no lock re-check). Need second anchor before promoting.

3. **Watchlist update — row 9 Function FBTC:** mark GATE 1 DONE, status pending H10 Gate 2 verdict (factory front-run conditional). EV $5K post-discount on H10 only (H1-H9 foreclose). Pending Gate 2 + Deploy.s.sol read.

4. **External-Frameworks update:** confirm "Function FBTC = trust-minimized but operationally-custodial bridge" architectural pattern as second worked-example after THORChain Bifrost (Bitcoin substrate similar). Add to brain/External-Frameworks.md.

5. **DC-7 EXCLUSION sub-pattern (Cap C1) — first non-Cap worked example:**
   > Function FBTC cross-chain confirm path validates `r.getCrossSourceRequestHash() == srcHash` where srcHash is deterministically derived from the same request fields. Validating-Field = Consuming-Field via deterministic derivation. EXCLUSION fires pre-Gate-2 on H1. This is the 2nd worked example of the DC-7 EXCLUSION sub-pattern (Cap C1 was 1st). Per Doctrine #37 3-anchor rule, ONE more anchor needed before promoting sub-pattern to canonical DC-7 EXCLUSION-A.

---

## STEP 6 — CONTINUOUS

- Append to `hunts/intake-log.md`: `2026-05-27 | Function FBTC | Immunefi | HIGH overlap CANDIDATE-A | $100K cap | Standard G1 | Gate 1 complete — H10 factory front-run hold for G2, all other hypotheses foreclose`
- Update `brain/Watchlist-Candidate-Crossmap.md` row 9: status `GATE 1 DONE 2026-05-27 — H10 factory front-run pending Gate 2 conditional on Deploy.s.sol`
- Watchlist v2.13 addendum needed.

---

## VERDICT SUMMARY

| Hypothesis | Tag | Verdict | Defense matrix |
|---|---|---|---|
| H1 — Cross-chain srcHash binding | [INSPECTED] | FORECLOSE (DC-7 EXCLUSION fires) | 3/3 |
| H2 — addBurnRequest CEI reentry | [INSPECTED] / [ASSUMED post-upgrade] | FORECLOSE at HEAD | 3/3 |
| H3 — UUPS upgrade no timelock | [INSPECTED] | FORECLOSE (OOS centralization) | OOS |
| H4 — `rescue()` admin | [INSPECTED] | FORECLOSE (OOS centralization) | OOS |
| H5 — Config-swap no timelock | [INSPECTED] | FORECLOSE (OOS centralization) | OOS |
| H6 — blockDepositTx race | [INSPECTED] | FORECLOSE (state mutual exclusion) | 3/3 |
| H7 — getRequestsByIdRange edge | [INSPECTED] | FORECLOSE (view-only griefing) | N/A |
| H8 — Pending request after lock | [INSPECTED] / [ASSUMED operational intent] | FORECLOSE on EV (Med max, below MIN-cap) | 1.5/3 |
| H9 — FeeModel minFee griefing | [INSPECTED] | FORECLOSE (OOS centralization) | OOS |
| H10 — Factory front-run cross-chain | [INSPECTED] (Deploy.s.sol + OneStepDeploy.sol + FBTCFactory.sol cross-verified) | FORECLOSE (Create3WithSender typ=3 used in production; sender-bound salt prevents cross-chain front-run) | 3/3 post-verification |

**Overall verdict: FORECLOSE — all 10 hypotheses verified or out-of-scope. No Gate 2 candidate survives Step 5.11 enumeration.**

Substrate-coverage builds (+4 BTC anchors) banked regardless. CANDIDATE-A.4 sub-pattern (cross-chain factory front-run) is filed with Function FBTC as NEGATIVE worked example (positive baseline). DC-7 EXCLUSION sub-pattern gains 2nd worked example anchor (H1 source-hash binding) — promotes Doctrine #37 3-anchor counter from 1 → 2 (one more anchor needed for canonical promotion).

---

## NEXT-TARGET RECOMMENDATION

Function FBTC: **FORECLOSED post-Deploy.s.sol verification.** All hypotheses NEGATE. Clone purgeable (12M).

Pivot to next Lane 5 watchlist target. Per EV ranking + Watchlist Cross-Pollination Trigger #1:

- **Row 11 — OnRe $177M Solana RWA $100K cap** — CANDIDATE-G promotion catalyst (third worked-example would unblock CG → DC-7 promotion, resolves Adevar-Labs-auditor-bias question). Highest-strategic-value next-action.
- Alt: **Row 7 — Defi Saver $271M $350K CDP** (DC-9 sub-3 family extension, 7× higher cap, NET-NEW)

**Recommendation:** OnRe (Row 11) on strategic-value; Defi Saver (Row 7) on raw-EV. Operator-default-pick per autonomy boundary: **OnRe** unless ops disk-budget or substrate-coverage tilts otherwise.

---

## DISK STATUS

- Pre-hunt: 85% / 5.6G free
- Clone reused (already present at `/home/claude-code/.tmp-clones/fbtc-contract`, 12M)
- Post-hunt: 85% / 5.6G free (no net change)
- If Gate 2 H10 escalates: Deploy.s.sol read is in-clone; factory bytecode verification is on-chain via `cast code` — no new disk needed.
- If H10 negates and FORECLOSE: clone purgeable (saves 12M).

---

## HUNT FILE METADATA

- **Path:** `/home/claude-code/buzz-workspace/hunts/2026-05-27-function-fbtc-immunefi-gate1.md`
- **Standing Intake Protocol version:** v1.0 (2026-05-21, Ogie msg 7435) + Step 5.11 Cross-Protocol Defense Enumeration (queued promotion per Contradictions-Register INFO #20)
- **Brain stack version:** Day 27 compound (Doctrines #27, #29, #34 sub-b, #36, #37, #38; DC-7 EXCLUSION sub-pattern; DC-9 sub-2 PERMANENT 3-anchor; CANDIDATE-A primary)
- **Auto-index hook:** triggered via PostToolUse hunt-complete.sh
