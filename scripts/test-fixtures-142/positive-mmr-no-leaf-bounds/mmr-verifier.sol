// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Fixture: positive-mmr-no-leaf-bounds
// Pattern: MMR verifier function that omits the canonical
//   require(leafIndex < leafCount)
// bounds check. Peak-count consistency IS present (peaks.length ==
// _popcount(leafCount)) so the only HIGH that should fire is the
// missing leaf-index bound.
//
// Expected #142a verdicts:
//   - HIGH  missing_check=leaf_index_bounds       (conf 0.85)
//   - MEDIUM missing_check=sibling_depth_bounds   (conf 0.55, no proof-depth bound)
//   (no peak_count_consistency miss — the require IS present)
//   (no overflow_guard miss — Solidity 0.8+)

contract HyperbridgeMMRVerifier {
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
        // BUG: no `require(proof.leafIndex < proof.leafCount)` here.

        // Peak-count consistency IS enforced.
        require(
            proof.peaks.length == _popcount(proof.leafCount),
            "BAD_PEAKS_LEN"
        );

        // ... peak-bag math ...
        bytes32 acc = leafHash;
        for (uint256 i = 0; i < proof.siblings.length; i++) {
            acc = keccak256(abi.encodePacked(acc, proof.siblings[i]));
        }
        // ... fold peaks ...
        bytes32 computedRoot = acc;
        for (uint256 j = 0; j < proof.peaks.length; j++) {
            computedRoot = keccak256(
                abi.encodePacked(computedRoot, proof.peaks[j])
            );
        }
        return computedRoot == root;
    }

    function _popcount(uint256 x) internal pure returns (uint256 n) {
        while (x != 0) {
            n += x & 1;
            x >>= 1;
        }
    }
}
