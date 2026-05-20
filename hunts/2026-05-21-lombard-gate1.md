# Lombard Finance — Gate 1 Surface Map

> Date: 2026-05-21 (filed overnight 2026-05-20→21 per FULL POWER directive)
> Commit pinned: HEAD `5ec153c` "Merge PR #449 from audit/20260515-add-report" (2026-05-15)
> Repo: `/home/claude-code/.tmp-build/lombard-clone/evm-smart-contracts/`
> Immunefi program: $50K-$250K crit / $10K-$50K high / $2.5K med / $1K low — **submission fee required, KYC required, Primacy of Impact for Crit/High SC**
> Status: **research only — no submit without operator approval** (submission fee gate)

---

## 0. Pre-flight scope check (curl-direct)

Immunefi /lombard-finance/scope returned 11 unique 0x addresses on Ethereum mainnet (compare Veda lesson: WebFetch understates). Highest-value surfaces in scope confirmed for Mailbox, BridgeV2, AssetRouter, BasculeV3, GMPBasculeV2, StakedLBTC family.

> Action: re-pull full scope JSON tomorrow morning before any submit (Doctrine #0 verify-premise-first).

---

## 1. Inventory

15,113 LOC across 22+ Solidity contracts. Top 12 by LOC:

| LOC | Contract                                                        | Role                                                                             |
| --- | --------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 986 | `contracts/LBTC/AssetRouter.sol`                                | Multi-asset mint/redeem router (per-token deposit/redeem/mint/route-pair)        |
| 821 | `contracts/bridge/BridgeV2.sol`                                 | Cross-chain ERC20 burn/mint via Mailbox GMP                                      |
| 624 | `contracts/gmp/Mailbox.sol`                                     | GMP message-sending + Consortium proof-delivery + payload-spend tracking         |
| 610 | `contracts/bridge/Bridge.sol`                                   | Legacy V1 bridge (kept for storage layout)                                       |
| 553 | `contracts/LBTC/NativeLBTC.sol`                                 | Native LBTC ERC20 (mint/burn-from-bridge)                                        |
| 538 | `contracts/LBTC/StakedLBTC.sol`                                 | Staked LBTC ERC20 (legacy storage + reinitializer(3) migration to AccessControl) |
| 511 | `contracts/bridge/BridgeTokenAdapter.sol`                       | Adapter to allow non-mintable tokens via bridge                                  |
| 428 | `contracts/stakeAndBake/depositor/veda/ERC4626VaultWrapper.sol` | Veda BoringVault integration shim                                                |
| 413 | `contracts/libs/Actions.sol`                                    | Action-codec library (FEE_APPROVAL, etc.)                                        |
| 393 | `contracts/bascule/BasculeV3.sol`                               | On-chain BTC bridge notarization layer                                           |
| 384 | `contracts/IBCVoucher.sol`                                      | Cosmos IBC voucher                                                               |
| 352 | `contracts/fbtc/PartnerVault.sol`                               | FBTC partner vault                                                               |
| 349 | `contracts/stakeAndBake/StakeAndBakeNativeToken.sol`            | StakeAndBake variant for native LBTC                                             |
| 327 | `contracts/stakeAndBake/StakeAndBake.sol`                       | One-shot mint-LBTC-then-deposit-to-vault convenience                             |
| 326 | `contracts/PoR.sol`                                             | Proof-of-Reserves                                                                |
| 314 | `contracts/bascule/BasculeV2.sol`                               | Previous Bascule version                                                         |
| 311 | `contracts/bascule/GMPBasculeV1.sol`                            | GMP Bascule V1 (stores full Message struct)                                      |
| 306 | `contracts/bascule/Bascule.sol`                                 | Original Bascule                                                                 |
| 306 | `contracts/bascule/GMPBasculeV2.sol`                            | GMP Bascule V2 (stores MintState only — storage-optimized)                       |
| 306 | `contracts/LBTC/StakedLBTCOracle.sol`                           | Oracle for staked LBTC rate                                                      |
| 299 | `contracts/CLAdapter.sol`                                       | Chainlink CCIP adapter                                                           |
| 294 | `contracts/bridge/LombardTokenPoolV2.sol`                       | CCIP-compatible token pool                                                       |

**V2/V3 versioning signal:** Bascule, GMPBascule, Bridge each have v1/v2/v3 contracts present. V2/V3 = RECENT REFACTOR = highest-EV targets per WhiteHatMage Rule 6 (speedrun new code) and Rule 7 (return after learning patterns).

**16 audit PDFs in docs/audit/:** ABDK_SAB_202509, ABDK_SaB_NativeToken_25_11, Halborn_V1, Halborn_V1_5, Halborn_V2, OZ_2025_10, OZ_YB, OZ_multipauser_04_26, OpenZeppelin_V2, Sherlock_GMP_Bascule_12_25, Sherlock_Wrapper_12_25, Sherlock_YB, Sherlock_multipauser_bridge_04_26, Veridise_V1, Veridise_V2. **Heavily audited** — typical bounty surface is post-audit code (V3 Bascule, V2 Bridge, audit/20260515-add-report HEAD).

---

## 2. Architecture (mint/redeem flow)

```
                 ┌─────────────────────────┐
                 │  Off-chain Consortium    │
                 │  (notarizes GMP payload) │
                 └────────────┬─────────────┘
                              │ signed payload
                              ▼
        ┌─────────────────────────────────────┐
        │             Mailbox.sol             │
        │  - deliverAndHandle(rawPayload,     │
        │    proof) → checkProof via consortium│
        │  - tracks deliveredPayload[hash]    │
        │  - tracks handledPayload[hash]      │
        │  - calls IHandler.handlePayload     │
        └────────────┬────────────────────────┘
                     │
        ┌────────────┴────────────────────────┐
        │                                     │
        ▼                                     ▼
  ┌───────────────────────┐         ┌─────────────────────┐
  │   AssetRouter.sol     │         │   BridgeV2.sol      │
  │  (LBTC mint/redeem)   │         │  (cross-chain ERC20)│
  │                       │         │                     │
  │  - usedPayloads[hash] │         │  - payloadSpent[id] │
  │  - mint → confirms    │         │  - rate-limits per  │
  │    via GMPBasculeV2   │         │    (srcChain,token) │
  │  - calls IBaseLBTC    │         │  - mintable token   │
  │    .mint(recipient,   │         │    .mint(recipient, │
  │     amount)           │         │     amount)         │
  └───────────┬───────────┘         └─────────────────────┘
              │
              ▼
  ┌───────────────────────┐
  │  GMPBasculeV2.sol     │
  │  - mintID = hash(     │
  │      nonce,           │
  │      block.chainid,   │
  │      recipient,       │
  │      toToken,         │
  │      amount)          │
  │  - mintHistory state  │
  │    machine:           │
  │    UNREPORTED →       │
  │    REPORTED → MINTED  │
  │  - requires SEPARATE  │
  │    trustedSigner key  │
  │    (defense in depth) │
  └───────────────────────┘
```

**Two-tier trust:** Consortium notarizes GMP delivery (Mailbox path), Bascule trustedSigner separately notarizes amount/recipient binding (GMPBasculeV2). For any mint to land, BOTH must agree (assuming `validateThreshold == 0`, which is the default and intended state).

---

## 3. Lens application

### CANDIDATE-I (ERC4626 + virtual-shares accounting)

**Hit surface:**

- `contracts/stakeAndBake/depositor/veda/ERC4626VaultWrapper.sol` (428 LOC) — Lombard's shim into Veda BoringVault. Cross-protocol surface: if Veda decoder/Manager bug exists at Veda layer, Lombard's StakeAndBake flow funnels users directly there. **Note: my Veda RESUBMIT (#79091 → resubmit ~2026-05-21 14:30 UTC) targets the Veda Manager. Lombard ERC4626VaultWrapper inherits Veda exposure.**

- `contracts/LBTC/StakedLBTCOracle.sol` (306 LOC) — oracle.getRate() consumed by AssetRouter.getRate() / .ratio(). If oracle stale/manipulable, downstream mint commission calc skews. Need to read `_changeOracle` validation (currently no zero-check on `newVal` in `_changeOracle`, only `changeMailbox` validates non-zero).

- `contracts/LBTC/AssetRouter.sol:262-282` — `ratio()` + `getRate()` fall through to oracle for non-native LBTC tokens. Native LBTC short-circuits to `1 ether`. Implication: if an attacker controls a token via `setRoute` (admin-only) and the oracle returns stale data, mint commissions price wrong. **Admin-gated, low EV unless governance compromise.**

### CANDIDATE-A (cross-chain bridge — direct primary class)

**Hit surface — HIGHEST EV (V2 fresh code):**

- `contracts/bridge/BridgeV2.sol:614-646` — `_withdraw` flow: decode msgBody → check `allowedDestinationToken[chainId, token]` → check rate-limit → mint(recipient, amount). **Note `decodeMsgBody:654` does its own version+length+zero checks via assembly.** The `decodeMsgBody` uses `mload(add(msgBody, 0x21))` to read bytes 1..32 directly. **Defensive check:** does any path call `_withdraw` with a msgBody where `version > MSG_VERSION` (currently 2)? `decodeMsgBody` checks `version > MSG_VERSION` and reverts. **OK.**

- `contracts/bridge/BridgeV2.sol:582-612` — `handlePayload` cross-references `chainId = mailbox.getInboundMessagePath(payload.msgPath)`, then `sourceBridge = $.bridgeContract[chainId]`, then `payload.msgSender == sourceBridge`. This is **DC-7 lens applied:** the validating field (msgSender) cross-binds to chainId derived from msgPath. If `getInboundMessagePath(msgPath)` returns a chainId for which `bridgeContract[chainId]` is `bytes32(0)` (disabled path), revert. **Defensively tight.** But IF a path is BOTH inbound-enabled and outbound-enabled AND admin reuses destinationBridge across chains, msgSender could cross-validate against the wrong chainId mapping. Audit angle: cross-chain `setDestinationBridge` duplicate-mapping → use-of-wrong-binding. **Low confidence without governance compromise.**

- `contracts/bridge/BridgeV2.sol:802-807` — `_calcAllowedTokenId(destChain, token)` vs `_calcRateLimitId(srcChain, token)`. Both use `keccak256(abi.encodePacked(bytes32, bytes32|address))`. They live in different mappings (`allowedDestinationToken` vs `rateLimit`), so no collision. **OK.**

- `contracts/gmp/Mailbox.sol:486-506` — `_verifyPayload` checks `deliveredPayload[payloadHash]` to skip re-verification. If already delivered, skip proof check. **Concern:** if `payloadHash` doubles up across chains (unlikely — message path is part of payload encoding), replay is impossible. The `GMPUtils.encodePayload(outboundId, nonce, msgSender, recipient, destinationCaller, body)` includes outboundId which encodes msgPath. **Tight.**

- `contracts/bascule/GMPBasculeV2.sol:294-305` — `_mintID = keccak256(abi.encode(nonce, block.chainid, recipient, toToken, amount))`. The `block.chainid` binding is **EXCELLENT defense** against cross-chain replay. **Tight.**

### DC-7 (Validating-Field ≠ Consuming-Field on Adjacent Function Pipelines)

**Hit surface — MEDIUM EV:**

- `contracts/LBTC/AssetRouter.sol:703-720` — `_mint(rawPayload, proof)` calls `mailbox.deliverAndHandle(rawPayload, proof)`, then **abi.decode(result, (address, address, uint256))** to extract recipient/token/amount. **But the actual mint already happened inside `handlePayload`** (line 809: `IBaseLBTC(receipt.toToken).mint(receipt.recipient, receipt.amount)`). The decoded values are just reflected back to caller as return.

  **Question:** Could `_mintWithFee` use the decoded `amount` differently than the on-chain minted amount? Looking at `_mintWithFee:751-768`: it uses `amount < fee` check, then burns `fee` from recipient. **The fee is burned from `recipient`, not the caller.** If the consortium-signed payload's amount/recipient is bound by Bascule's mintID, then a malicious CLAIMER_ROLE caller cannot manipulate the values. **Tight.**

- `contracts/stakeAndBake/StakeAndBake.sol:259-316` — `_stakeAndBake` flow:
  1. `owner = $.lbtc.mint(mintPayload, proof)` — mints LBTC to owner via mint payload.
  2. permit decode + verify allowance gap.
  3. `safeTransferFrom(owner, address(this), data.amount)` — pull `data.amount` from owner.
  4. transfer fee to treasury.
  5. deposit `(data.amount - feeAmount)` into depositor.

  **DC-7 gap candidate:** `data.amount` (caller-supplied) does NOT have to match `X` (the amount actually minted to owner). Constraint: `data.amount ≤ permitAmount` AND `data.amount ≤ existing-allowance + permit`. The owner controls the permit signature, so they bound the upper limit themselves. **BUT** if owner had existing LBTC balance from prior mints AND signs a permit for `data.amount > newly-minted`, the CLAIMER_ROLE could pull more than minted. This is **owner-self-griefing**, not protocol-exploitable. **Not a finding.**

- `contracts/bascule/BasculeV3.sol:323-352` — `validateWithdrawal(depositID, withdrawalAmount)`: amount is supplied by caller (WITHDRAWAL_VALIDATOR_ROLE), NOT cross-checked against the deposit's reported amount. **By design** — the depositID is supposed to be a hash that already binds the amount per the contract README. **Caller's responsibility** to construct depositID correctly.
  - GMPBasculeV2's `_mintID` correctly binds amount via `keccak256(abi.encode(nonce, chainid, recipient, toToken, amount))`. **Tight.**
  - BasculeV3 (used by NativeLBTC?) does NOT have a built-in mintID computation — depositID is supplied raw. If a caller of `reportDeposits`/`validateWithdrawal` constructs depositID without binding amount, an attacker who can manipulate amount could exploit. **This is a callsite-correctness question.** Need to find all `BasculeV3.validateWithdrawal` callers and verify depositID construction.

  > **DC-7 hunt candidate:** enumerate all `IBascule(...).validateWithdrawal(...)` callers across the repo. For each, verify depositID is computed via a hash binding amount + recipient + chainid + nonce. If any caller uses a depositID that doesn't bind amount, file Critical/High.

  Quick grep needed.

### Pattern: state-machine integrity (CANDIDATE-J)

**Hit surface — LOW-MEDIUM EV (well-audited):**

- `contracts/bascule/GMPBasculeV2.sol:176-213` — `reportMints` writes `mintHistory[mintID] = REPORTED` ONLY if UNREPORTED. If already REPORTED or MINTED, emits warning and continues. **Idempotent.** No way to demote a MINTED back to REPORTED. State machine: UNREPORTED → REPORTED → MINTED is monotonic. **Tight.**

- `contracts/bascule/GMPBasculeV2.sol:226-255` — `validateMint`: REPORTED → MINTED on validate. UNREPORTED → MINTED if amount < validateThreshold (skip-validation path). **`validateThreshold` default is 0, so any amount ≥ 0 satisfies `amount >= 0` and reverts UNREPORTED → MINTED skip.**

  **Wait — re-read:**

  ```solidity
  if (mintMsg.amount >= validateThreshold) {
      revert MintFailedValidation(...);
  }
  // Allow without validation
  mintHistory[mintID] = MintState.MINTED;
  ```

  With `validateThreshold == 0`, the condition `amount >= 0` is ALWAYS TRUE for any uint256 (including 0). So it ALWAYS reverts on UNREPORTED. **The skip-validation path is unreachable when threshold == 0.** Correct safe-by-default.

  But if VALIDATION_GUARDIAN_ROLE raises threshold to non-zero (e.g., 1 BTC for "small mints"), then any mint below 1 BTC bypasses Bascule check. This is documented and intentional, but if guardian role is compromised + minter is compromised, an unreported small-mint army could drain. **3-of-3 trust assumption.**

### Pattern: storage layout migration (StakedLBTC reinitializer)

- `contracts/LBTC/StakedLBTC.sol:134-166` — `migrateToAccessControl(minters_, claimers_)` is `reinitializer(3)`. Reads legacy `__removed__pauser` / `__removed__minters` / `__removed__claimers`, grants roles. One-shot. **Already executed on production.** Surface: if Lombard adds a future reinitializer(4) that touches these `__removed_*` fields incorrectly, storage corruption. **Out-of-scope unless a new reinitializer is shipped.**

---

## 4. Highest-EV candidates (priority-ordered)

1. **DC-7 enumeration: every `IBascule(...).validateWithdrawal(...)` caller** (BasculeV3 raw API).
   - Hypothesis: if any caller constructs depositID without binding amount + recipient + chainid + nonce, attacker who reports a valid deposit can withdraw a DIFFERENT amount.
   - **EXECUTED** — 2 production callsites:
     - `NativeLBTC.sol:488` (`_confirmDeposit` called from `_validateAndMint:467`)
     - `BridgeTokenAdapter.sol:458` (`_confirmDeposit` called from `_mintV1:391`)
   - **Both follow IDENTICAL pattern:**
     1. `Assert.selector(rawPayload, DEPOSIT_BTC_ACTION_V1)` — fixed selector
     2. `action = Actions.depositBtcV1(rawPayload[4:])` — decode
     3. `payloadHash = sha256(payload); consortium.checkProof(payloadHash, proof)` — consortium notarizes
     4. `usedPayloads[payloadHash] = true` — burn payload
     5. `_confirmDeposit($, keccak256(payload[4:]), action.amount)` — depositID = keccak256(payload[4:]), amount = decoded
   - **Verdict: TIGHT.** Both `depositID` and `amount` are derived from the SAME `payload`. depositID hashes the entire `payload[4:]` (which contains `action.amount`). The consortium signature binds the payloadHash. Off-chain Bascule reporter must construct depositID identically — implicit off-chain trust, but on-chain construction is consistent.
   - **EV: LOW** — no DC-7 gap at callsite. The off-chain depositID-construction contract between reporter and on-chain hash is the SPOF; can't audit it from on-chain code.

2. **Veda ERC4626VaultWrapper cross-protocol exposure.**
   - Lombard's StakeAndBake routes through Veda BoringVault. If my Veda RESUBMIT lands as Crit/High at Veda, Lombard users via StakeAndBake are EXPOSED.
   - Status: WAIT on Veda RESUBMIT outcome (2026-05-21 14:30 UTC). If accepted, file Lombard adjacency to Veda finding as defensive disclosure.
   - EV: indirect; depends on Veda outcome.

3. **GMPBasculeV2 `setTrustedSigner` zero-address check vs BasculeV3 absence.**
   - GMPBasculeV2:160 — `if (aTrustedSigner == address(0)) revert ZeroTrustedAddress();` ✓
   - BasculeV3:261-266 — `function setTrustedSigner(address aTrustedSigner) public whenNotPaused onlyRole(DEFAULT_ADMIN_ROLE) { _trustedSigner = aTrustedSigner; ... }` — **NO zero-check.** If admin accidentally sets to zero, `_checkProof` returns TRUE for any proof (line 376-378: `if (_trustedSigner == address(0)) return true;`).
   - Status: **GOVERNANCE-MISTAKE class.** Admin-gated. Not directly exploitable but is an asymmetric attack surface — single bad tx by admin disables ALL proof checks. Low severity (admin error class). **NOTE for disclosure but not submit.**
   - EV: LOW (informational only).

4. **Mailbox `deliverAndHandle` race vs handle-only flow.**
   - TODO comment at line 450: "TODO: implement deliver only method, then relayer can only deliver payload without attempt to execute".
   - Current flow forces handle attempt on every deliver. If handler reverts, payload is delivered (`deliveredPayload[hash] = true`) but `handledPayload[hash]` stays false. Caller can retry `_handle` independently? **No** — `_handle` is internal, only called from `deliverAndHandle`. Second call to `deliverAndHandle` on same payload skips delivery (already delivered) and re-tries handle. **Looks OK.**
   - Status: not exploitable. **TODO indicates future refactor.**

5. **BridgeV2 `decodeMsgBody` version-2 optional message length-handling.**
   - At line 688-702, if `version == MSG_VERSION (2)`, code reads `optMsg` bytes from offset `0xa1` to `msgBody.length`. **Assembly direct memory copy.** Edge case: what if `msgBody.length == 129` (exactly MSG_LENGTH) AND `version == 2`? Then `len = 0`, the loop body doesn't execute, `optMsg = new bytes(0)`. Fine.
   - What if `msgBody.length < MSG_LENGTH`? Line 657: `if (msgBody.length < MSG_LENGTH) revert`. Tight.
   - What if `msgBody.length == MSG_LENGTH AND version == MSG_VERSION_MIN (1)`? Line 679-687: `version == MSG_VERSION_MIN && msgBody.length != MSG_LENGTH` reverts. So v1 enforces exact 129.
   - **Looks tight.**

---

## 5. Next actions

1. **Grep `validateWithdrawal(`** callers across `contracts/` to enumerate BasculeV3 consumers.
2. **Read NativeLBTC.sol** (553 LOC) — sister contract to StakedLBTC, likely consumes BasculeV3 for native-token mint.
3. **Read PoR.sol** (326 LOC) — Proof-of-Reserves, possibly cross-binds to AssetRouter.ratio() / oracle.getRate().
4. **Veda RESUBMIT outcome** (2026-05-21 14:30 UTC) — if Crit/High accepted, file Lombard adjacency as defensive disclosure (or "informational" downgrade) via Immunefi message rather than full submission.
5. **No submit until operator approval** — Lombard's submission fee gate means no autonomous submit. Research-only ledger entry.

---

## 6. Brain compounding notes

- **Pattern: dual-trust mint chain (Consortium + Bascule trustedSigner).** Two independent signers for one mint to land. Defensive depth. Worth filing to `brain/Doctrine.md` as standalone worked example: any bridge can adopt this pattern by adding a SECOND independent attestation layer with a separate key. **Cross-pollination: Wormhole could add a 2nd-tier validator.**

- **Pattern: validateThreshold default 0 = validate-all.** Safe-by-default invariant. The skip-validation path is structurally unreachable until guardian raises threshold. Worth filing as a checklist item for any future threshold-based system: **default to 0/strict, require explicit role to relax.**

- **Pattern: storage-rename migration via `__removed__` fields.** StakedLBTC retains storage layout from pre-AccessControl version. `migrateToAccessControl` is reinitializer(3), one-shot. Worth noting as a reference for any contract that needs to migrate from Ownable → AccessControl on existing proxies. Compare: Yearn V3 uses 14-role bitmask (no migration), Ethena uses simple owner→admin role grants.

- **DC-7 caveat:** Bascule itself is a low-level recordkeeping primitive. The DC-7 question is at the **callsite**, not in Bascule. GMPBasculeV2 builds mintID internally (correct). BasculeV3 expects the caller to construct depositID correctly (callsite-dependent). **Lesson:** when reading Bascule-like primitives, always enumerate callers to verify field-binding.

---

_Lombard Finance Gate 1 — research-only, no submit (fee gate). Next: callsite enumeration of `validateWithdrawal`._
