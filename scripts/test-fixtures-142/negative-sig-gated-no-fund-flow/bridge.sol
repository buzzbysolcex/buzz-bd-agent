// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Fixture: negative-sig-gated-no-fund-flow
// Pattern: An MMR-verifier reachable ONLY through an onlyRole-gated entry
// point AND the call path is view-only (no transfer / call / mint / burn).
//
// Expected #142b verdict: INFO
//   reachability=role_gated, fund_flow_present=false,
//   fund_flow_kind=none, conf 0.55.
// (No CRITICAL-amplifier or HIGH-amplifier — neither permissionless nor
//  fund-flow-bearing.)

abstract contract AccessControl {
    modifier onlyRole(bytes32 role) {
        // mock — fixture only
        _;
    }
}

contract IBCLightClientReader is AccessControl {
    bytes32 public constant RELAYER_ROLE = keccak256("RELAYER_ROLE");

    struct ProofData {
        uint256 leafIndex;
        uint256 leafCount;
        bytes32[] peaks;
        bytes32[] merkleProof;
    }

    bytes32 public mmrRoot;

    function readVerifiedHeight(
        bytes32 leafHash,
        ProofData memory proof
    ) external view onlyRole(RELAYER_ROLE) returns (uint256) {
        require(verifyMMR(mmrRoot, leafHash, proof), "BAD_PROOF");
        // No fund flow — view-only state read.
        return proof.leafIndex;
    }

    function verifyMMR(
        bytes32 root,
        bytes32 leafHash,
        ProofData memory proof
    ) internal pure returns (bool) {
        bytes32 acc = leafHash;
        for (uint256 i = 0; i < proof.merkleProof.length; i++) {
            acc = keccak256(abi.encodePacked(acc, proof.merkleProof[i]));
        }
        for (uint256 j = 0; j < proof.peaks.length; j++) {
            acc = keccak256(abi.encodePacked(acc, proof.peaks[j]));
        }
        return acc == root;
    }
}
