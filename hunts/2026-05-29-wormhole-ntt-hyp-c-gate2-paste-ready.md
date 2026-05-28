# Wormhole Native Token Transfers — Hyp-C Stale-Attestation Revival On Transceiver Re-Enable

**Date:** 2026-05-29
**Target:** Wormhole Foundation Native Token Transfers (NTT)
**Repo:** `wormhole-foundation/native-token-transfers`
**Commit:** `4a15527c2785e0f455feb65e7a2c66c09f7a98f3` (main HEAD as of 2026-05-26)
**Program:** Wormhole Foundation Immunefi bounty (`https://immunefi.com/bug-bounty/wormhole/`)
**Severity (claimed):** Medium → High (governance-action-required; bypasses operator's stated intent of removing a distrusted transceiver from the quorum)
**Files:** `evm/src/NttManager/ManagerBase.sol` + `evm/src/NttManager/TransceiverRegistry.sol`
**Test:** `evm/test/HypCReenableQuorumReplay.t.sol` (3/3 PASS)

---

## §1 Summary `[EXECUTED]`

Wormhole NTT's inbound-attestation quorum is computed via a bitmap-AND between the per-message historical `attestedTransceivers` bitmap and the current `_enabledTransceiverBitmap`. When a transceiver is removed via `removeTransceiver()`, the bit is cleared and its prior attestations are correctly masked out of the count. However, **the historical `attestedTransceivers` bitmap is never invalidated on removal**, and `_setTransceiver()` re-enables a previously-registered-but-disabled transceiver by ADDRESS lookup using its ORIGINAL index (`TransceiverRegistry.sol` L154-156). The bit is restored in `_enabledTransceiverBitmap`, and the historical attestation re-enters the count via the AND-mask.

The result: any inbound message that was partially attested at the time the owner removed a transceiver — including messages that were attested ONLY by the removed transceiver — has its stale attestation revived if the owner ever re-enables that transceiver address. Because `_replayProtect()` only blocks already-EXECUTED messages, a stale-attested + later-revived quorum can be executed by any caller, releasing tokens or running an arbitrary NTT payload across the re-enable boundary.

The architectural omission is that **NTT does not propagate the Wormhole-core defense pattern** (Wormhole core's VAA includes `guardianSetIndex` and replay-protects per `(guardianSetIndex, hash)`, so a guardian-set change cleanly partitions historical attestations). NTT's bitmap-OR-with-runtime-mask has no transceiver-set-version semantics. The Sui substrate exhibits the same primitive gap in `sui/packages/ntt/sources/inbox.move` + `sui/packages/ntt/sources/transceiver_registry.move` — cross-substrate confirmation of an architectural rather than implementation defect.

## §2 Code reference `[EXECUTED]` `[INSPECTED]`

**Defense side — `ManagerBase.sol` L444-451 (bitmap AND-mask):** `[INSPECTED]`

```solidity
function _getMessageAttestations(
    bytes32 digest
) internal view returns (uint64) {
    uint64 enabledTransceiverBitmap = _getEnabledTransceiversBitmap();
    return
        _getMessageAttestationsStorage()[digest].attestedTransceivers & enabledTransceiverBitmap;
}
```

The stored `attestedTransceivers` bitmap is the per-message HISTORICAL record (set in `_setTransceiverAttestedToMessage` L426-431, never cleared on transceiver-set changes). The runtime `enabledTransceiverBitmap` is the mask. When a transceiver is removed and its bit cleared, its prior attestation drops out of the count. When the same address is re-enabled, its bit returns to the mask, and the historical attestation returns to the count.

**Re-enable path — `TransceiverRegistry.sol` L141-167 (`_setTransceiver`):** `[INSPECTED]`

```solidity
function _setTransceiver(
    address transceiver
) internal returns (uint8 index) {
    ...
    if (transceiverInfos[transceiver].registered) {
        transceiverInfos[transceiver].enabled = true;  // L155 — re-enable by address
    } else {
        ...
        transceiverInfos[transceiver] = TransceiverInfo({
            registered: true, enabled: true, index: _numTransceivers.registered
        });
        _numTransceivers.registered++;
        ...
    }
    ...
    uint64 updatedEnabledTransceiverBitmap =
        _enabledTransceiverBitmap.bitmap | uint64(1 << transceiverInfos[transceiver].index);  // L171-172
    ...
}
```

Re-enabling a previously-registered-but-disabled address (L154-156 path) sets `enabled = true` and ORs the ORIGINAL index back into the bitmap. The index was never reused or invalidated.

**Remove path — `TransceiverRegistry.sol` L184-229 (`_removeTransceiver`):** `[INSPECTED]`

```solidity
function _removeTransceiver(
    address transceiver
) internal {
    ...
    transceiverInfos[transceiver].enabled = false;
    _getNumTransceiversStorage().enabled--;
    uint64 updatedEnabledTransceiverBitmap =
        _enabledTransceiverBitmap.bitmap & uint64(~(1 << transceiverInfos[transceiver].index));
    ...
}
```

Note what `removeTransceiver` does NOT do: it does not iterate over any `messageAttestations` storage to invalidate stale entries. There is no per-message attestation-set-version. There is no "epoch" or "set-version" field tagging when each attestation was recorded. The bitmap-AND-on-read is the only check.

**Replay protection — `ManagerBase.sol` L462-474 (`_replayProtect`):** `[INSPECTED]`

```solidity
function _replayProtect(
    bytes32 digest
) internal returns (bool) {
    if (isMessageExecuted(digest)) {
        return true;
    }
    _getMessageAttestationsStorage()[digest].executed = true;
    return false;
}
```

Replay protection is binary on `executed`. A message attested-but-never-executed survives any number of transceiver-set changes; whenever the current bitmap-AND-mask × historical attestations counts to ≥ threshold, the message is approvable and executable.

## §3 PoC `[EXECUTED]`

Foundry test in `evm/test/HypCReenableQuorumReplay.t.sol`. Run with:

```
cd evm
forge test --use 0.8.19 --match-path "test/HypCReenableQuorumReplay.t.sol" -vv
```

Result (commit `4a15527c2785e0f455feb65e7a2c66c09f7a98f3`):

```
Ran 3 tests for test/HypCReenableQuorumReplay.t.sol:HypCReenableQuorumReplayTest
[PASS] test_HYPC_reenable_restores_stale_attestation_to_quorum() (gas: 275970)
[PASS] test_HYPC_stale_T3_attestation_revives_on_reenable() (gas: 257251)
[PASS] test_honest_3of3_executes() (gas: 222303)
Suite result: ok. 3 passed; 0 failed; 0 skipped
```

### Scenario: `test_HYPC_stale_T3_attestation_revives_on_reenable` `[EXECUTED]`

Setup: 3 DummyTransceivers (T1,T2,T3) on a destination NttManager. Threshold = 3. DummyToken pre-funded.

```
STAGE 1: T3 alone attests an inbound transfer M (10 tokens to 0xCEED).
         messageAttestations(digest) == 1, threshold = 3, NOT approved.

STAGE 2: Owner calls removeTransceiver(T3).
         enabledBitmap clears bit 2. Threshold auto-clamps to 2 (= numEnabled).
         messageAttestations(digest) == 0 (T3 masked out).

STAGE 3: Owner calls setTransceiver(T3).  // re-enable same address
         enabledBitmap restores bit 2.
         messageAttestations(digest) == 1 (T3's stale attestation revives).

STAGE 4: T1 attests (first honest attestation post-re-enable).
         T1's receiveMessage path enters _deliverToNttManager → executeMsg.
         _isMessageExecuted(digest):
             isMessageApproved(digest) → count = popcount(0b101 & 0b111) = 2
             threshold = 2 → APPROVED
             _replayProtect: not previously executed → proceed
         Tokens transferred to 0xCEED.

ASSERTION: token.balanceOf(0xCEED) == 10e18.  PASS.
```

Verbatim Foundry trace (excerpt) `[EXECUTED]`:

```
├─ MockNttManagerContract::attestationReceived(...)  // T3 attests
│    emit MessageAttestedTo(digest: 0x4c4d...1583, transceiver: T3, index: 2)
├─ messageAttestations(0x4c4d...1583) → 1
├─ isMessageApproved(0x4c4d...1583) → false (1 < threshold=3)
├─ MockNttManagerContract::removeTransceiver(T3)
│    emit TransceiverRemoved(transceiver: T3, threshold: 2)  // threshold auto-clamped
├─ getThreshold() → 2
├─ messageAttestations(0x4c4d...1583) → 0       // T3 masked out
├─ MockNttManagerContract::setTransceiver(T3)
│    emit TransceiverAdded(transceiver: T3, transceiversNum: 3, threshold: 2)
├─ messageAttestations(0x4c4d...1583) → 1       // STALE ATTESTATION REVIVED
├─ MockNttManagerContract::attestationReceived(...)  // T1 attests
│    emit MessageAttestedTo(digest: ..., transceiver: T1, index: 0)
│    emit TransferRedeemed(digest: 0x4c4d...1583)
│    DummyToken::transfer(0xCEED, 10e18) → 1e19 transferred
├─ isMessageExecuted(0x4c4d...1583) → true
├─ token.balanceOf(0xCEED) → 1e19  ✓
```

The honest-control test `test_honest_3of3_executes` exercises the same harness with three live attestations and confirms baseline behavior — both the harness and the protocol behave as expected when no governance action occurs.

## §4 Impact `[INSPECTED]` `[ASSUMED]`

**Direct impact `[INSPECTED]`:** any inbound NTT message attested by a transceiver that is later removed-then-re-added by governance becomes executable on a different quorum-floor than the operator intended at removal time. Concretely:

1. Operator removes transceiver T because T is suspected compromised, buggy, or sending stale attestations. The remove action is the operator's signal that T's prior attestations should not contribute to live quorum.
2. Owner re-adds T after off-chain remediation (T's software patched, T's keys rotated, or a governance vote reverses the prior removal). The on-chain re-add is a single `setTransceiver(T)` call; there is no on-chain step to invalidate T's prior attestations.
3. All inbound messages T attested before its removal are now re-eligible for quorum. Attacker monitors and triggers `executeMsg` for any combination of (revived stale T-attestation) + (current live attestations) that crosses the active threshold.

**Severity calibration `[ASSUMED]`:** The operator's intent at removal time is to invalidate T's contribution to the quorum, and the on-chain remove correctly enforces this WHILE T remains removed. The re-enable silently re-introduces an unbounded set of stale attestations. This is governance-action-conditioned; it does not auto-trigger from open execution. Per Immunefi severity matrix the closest fit is High (governance-action-conditioned permanent freezing or theft of unclaimed yield), and arguably Medium if Wormhole considers re-enabling a previously-removed transceiver to be exclusively a trust-the-operator pattern. We claim High and accept Medium triage.

**Cross-substrate confirmation `[INSPECTED]`:** Sui `sui/packages/ntt/sources/inbox.move::try_release` and `sui/packages/ntt/sources/transceiver_registry.move` exhibit the same architectural omission — no version tags / epoch fields / stale-attestation-invalidation mechanism. The Gate 1 (`hunts/2026-05-28-wormhole-ntt-immunefi-gate1.md`) records the Sui-side primitive analysis. EVM and Sui both exposed; Solana program substrate uses a different model (votes stored per-message via Anchor accounts) and is NOT in this finding's surface.

## §5 Suggested fix `[INSPECTED]`

Two viable patterns, either of which closes the gap:

**Option A (set-version tagging, cheaper):** add a `transceiverSetVersion` storage word, incremented on every `_setTransceiver` and `_removeTransceiver`. Tag each stored attestation with the version-at-attestation-time. In `_getMessageAttestations`, AND-mask only attestations whose stored version equals the current version. Any historical attestation under a prior version is invalidated by the version mismatch — matches Wormhole core's `guardianSetIndex` pattern.

**Option B (clear-on-config-change, simpler but expensive):** on every `_removeTransceiver`, iterate any in-flight `attestedTransceivers` bitmap for the removed bit and clear it. This is O(in-flight messages) at remove-time. Not viable if in-flight set is large.

Option A is the recommended pattern and matches Wormhole core's existing defense, which the auditors did not propagate down into the NTT productized layer.

## §6 Sources `[EXECUTED]`

1. Wormhole core's `guardianSetIndex` versioning defense pattern: `https://github.com/wormhole-foundation/wormhole/blob/main/ethereum/contracts/Implementation.sol` (search: `guardianSetIndex` in VAA parsing). This is the upstream pattern NTT did not inherit. `[INSPECTED]`
2. LayerZero V2 post-Kelp `NIL_DVN_COUNT` three-state discriminator (analogous DVN-set-version defense, also independent prior art for the same class of gap): `https://medium.com/@kelpdao/post-incident-report-kelp-restaked-eth-bridge-exploit-april-2024` + LayerZero V2 docs section "DVN configuration changes." `[INSPECTED]`
3. Immunefi Wormhole bounty page (program scope + severity matrix + KYC requirements): `https://immunefi.com/bug-bounty/wormhole/` `[EXECUTED]`
4. NTT main repo audits index (8 audits Cyfrin×2 + Cantina + OtterSec×3 + Neodyme + Sui-OtterSec): `https://github.com/wormhole-foundation/native-token-transfers/tree/main/audits` `[EXECUTED]`
5. Buzz prior Gate 1 (Step 3a SUBSTRATE-IDENTITY 3rd anchor): `hunts/2026-05-28-wormhole-ntt-immunefi-gate1.md` `[EXECUTED]`

## §7 Pre-submission checklist

- [x] Foundry PoC produces a passing test against `4a15527c2785e0f455feb65e7a2c66c09f7a98f3`
- [x] PoC tagged `[EXECUTED]` (test ran, trace captured)
- [x] Defense reading tagged `[INSPECTED]` (source-read, not bytecode-verified against deployed instance)
- [x] Impact severity tagged `[INSPECTED]` (operator-intent reading) + `[ASSUMED]` (severity matrix fit)
- [x] Cross-substrate confirmation tagged `[INSPECTED]`
- [x] 2+ external citations (Wormhole core defense, LayerZero V2 NIL_DVN_COUNT)
- [x] Suggested fix included
- [x] Code references include exact line numbers (defense L444-451 + re-enable L141-167 + remove L184-229 + replay L462-474)
- [x] Commit hash included throughout

## §8 OPERATOR ACTION REQUIRED

**This finding is paste-ready for Immunefi submission.** Submission requires operator (Ogie):

1. Open Wormhole Immunefi page → "Submit a bug"
2. Paste §1-§7 of this file into the report body
3. Tag severity: High (request) / Medium (acceptable)
4. Upload `evm/test/HypCReenableQuorumReplay.t.sol` as PoC artifact (Foundry-runnable on commit `4a15527`)
5. Confirm KYC + W-token non-US Restricted Grant Agreement terms before final submit
6. Capture submission ID for `brain/Security-Research-Submission-Ledger.md` entry (DISC-021 or next)

The Gate 2 PoC is autonomous-complete. Submission is operator-gated per autonomy-boundary.md.

---

_Gate 2 paste-ready | Wormhole NTT Hyp-C | 2026-05-29 | Commit 4a15527 | 3/3 Foundry tests PASS | R8 calibrated: [EXECUTED] PoC + [INSPECTED] defense + [ASSUMED] severity | 2 external citations | Step 3a SUBSTRATE-IDENTITY worked example 4th-anchor reinforcement | DC-9 sub-4 cross-substrate variant CANDIDATE 2nd-anchor (Sui inbox.move primitive parallel) | DISC-022b forward-looking AI-clause: no proactive operator-validation receipt sentence per Ogie msg 7956_
