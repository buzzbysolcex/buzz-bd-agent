// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Fixture: positive-permissionless-fund-flow
// Pattern: A bridge contract with an MMR-verifier reachable from a
// PERMISSIONLESS external entry point (no onlyOwner / onlyRole / sig
// gating) AND the same call path triggers ERC20 fund flow.
//
// Expected #142b verdict: CRITICAL-amplifier
//   reachability=permissionless, fund_flow_present=true,
//   fund_flow_kind=erc20_transfer, conf 0.85.
// Caller chain: claimWithProof → verifyMmrProof.

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
}

contract HyperbridgePermissionlessBridge {
    IERC20 public immutable token;
    bytes32 public immutable mmrRoot;

    struct MmrProof {
        uint256 leafIndex;
        uint256 leafCount;
        bytes32[] peaks;
        bytes32[] siblings;
    }

    constructor(IERC20 _token, bytes32 _root) {
        token = _token;
        mmrRoot = _root;
    }

    // PERMISSIONLESS external entry-point. No onlyOwner, no onlyRole,
    // no msg.sender == ... require. Reachable by anyone.
    function claimWithProof(
        address recipient,
        uint256 amount,
        bytes32 leafHash,
        MmrProof calldata proof
    ) external {
        require(verifyMmrProof(mmrRoot, leafHash, proof), "BAD_PROOF");
        // ERC20 fund flow on the same path post-verification.
        token.transfer(recipient, amount);
    }

    function verifyMmrProof(
        bytes32 root,
        bytes32 leafHash,
        MmrProof calldata proof
    ) public pure returns (bool) {
        // (Bounds checks may or may not be present — irrelevant to #142b.)
        bytes32 acc = leafHash;
        for (uint256 i = 0; i < proof.siblings.length; i++) {
            acc = keccak256(abi.encodePacked(acc, proof.siblings[i]));
        }
        for (uint256 j = 0; j < proof.peaks.length; j++) {
            acc = keccak256(abi.encodePacked(acc, proof.peaks[j]));
        }
        return acc == root;
    }
}
