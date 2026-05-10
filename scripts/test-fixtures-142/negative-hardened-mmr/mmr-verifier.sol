// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Fixture: negative-hardened-mmr
// Pattern: A correctly-hardened MMR verifier. ALL FOUR required bounds
// checks are present:
//   - leaf_index_bounds       (require(leafIndex < leafCount))
//   - peak_count_consistency  (require(peaks.length == _popcount(leafCount)))
//   - sibling_depth_bounds    (require(siblings.length <= log2(leafCount)+1))
//   - overflow_guard          (Solidity 0.8+ default checked arithmetic)
//
// Expected #142a verdict: 0 findings.

contract HardenedMMRVerifier {
    struct MmrProof {
        uint256 leafIndex;
        uint256 leafCount;
        bytes32[] peaks;
        bytes32[] siblings;
    }

    function verifyMmrProof(
        bytes32 root,
        bytes32 leafHash,
        MmrProof calldata proof
    ) external pure returns (bool) {
        // Required check 1: leaf-index bound.
        require(proof.leafIndex < proof.leafCount, "OOB_LEAF");

        // Required check 2: peak-count consistency.
        require(
            proof.peaks.length == _popcount(proof.leafCount),
            "BAD_PEAKS_LEN"
        );

        // Required check 3: proof-depth bound.
        require(
            proof.siblings.length <= _log2(proof.leafCount) + 1,
            "PROOF_TOO_DEEP"
        );

        // Required check 4: Solidity 0.8+ checked arithmetic — implicit.

        bytes32 acc = leafHash;
        for (uint256 i = 0; i < proof.siblings.length; i++) {
            acc = keccak256(abi.encodePacked(acc, proof.siblings[i]));
        }
        for (uint256 j = 0; j < proof.peaks.length; j++) {
            acc = keccak256(abi.encodePacked(acc, proof.peaks[j]));
        }
        return acc == root;
    }

    function _popcount(uint256 x) internal pure returns (uint256 n) {
        while (x != 0) {
            n += x & 1;
            x >>= 1;
        }
    }

    function _log2(uint256 x) internal pure returns (uint256 n) {
        while (x > 1) {
            x >>= 1;
            n++;
        }
    }
}
