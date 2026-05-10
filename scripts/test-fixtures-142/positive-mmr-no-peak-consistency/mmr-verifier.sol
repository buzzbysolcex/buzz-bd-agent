// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Fixture: positive-mmr-no-peak-consistency
// Pattern: MMR verifier that DOES enforce `leafIndex < leafCount` (so the
// leaf-index HIGH does NOT fire) but OMITS the peak-count vs popcount(leafCount)
// consistency check. This is the IBC-light-client class bug — the verifier
// trusts the supplied peaks-array length without binding it to the committed
// MMR size.
//
// Expected #142a verdicts:
//   - HIGH   missing_check=peak_count_consistency  (conf 0.75)
//   - MEDIUM missing_check=sibling_depth_bounds    (conf 0.55, no proof-depth bound)
//   (no leaf_index_bounds miss — IS present)
//   (no overflow_guard miss — Solidity 0.8+)

contract IBCLightClientMMRVerifier {
    struct ProofData {
        uint256 leafIndex;
        uint256 leafCount;
        bytes32[] peaks;
        bytes32[] merkleProof;
    }

    function verifyMMR(
        bytes32 mmrRoot,
        bytes32 leafHash,
        ProofData memory proof
    ) external pure returns (bool) {
        // Leaf-index bound IS enforced.
        require(proof.leafIndex < proof.leafCount, "OOB_LEAF");

        // BUG: no peak-count consistency check. Attacker can supply
        // peaks-array of arbitrary length.

        // ... iterate siblings ...
        bytes32 acc = leafHash;
        for (uint256 i = 0; i < proof.merkleProof.length; i++) {
            acc = keccak256(abi.encodePacked(acc, proof.merkleProof[i]));
        }
        // ... bag peaks blindly ...
        for (uint256 j = 0; j < proof.peaks.length; j++) {
            acc = keccak256(abi.encodePacked(acc, proof.peaks[j]));
        }
        return acc == mmrRoot;
    }
}
