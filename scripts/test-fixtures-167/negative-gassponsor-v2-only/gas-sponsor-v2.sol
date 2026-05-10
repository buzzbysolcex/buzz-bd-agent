// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Fixture: negative-gassponsor-v2-only
// Pattern: GasSponsorV2 standalone — binds chainid + address(this) + nonce
// + deadline. No paired V1, no cross-instance peer with diverging fingerprint,
// strong fingerprint = no MEDIUM no-pair fallback.
// Expected #167 verdict: 0 findings.

contract GasSponsorV2 {
    mapping(address => uint256) public _nonces;

    function _assertSponsorshipSignature(
        address sponsor,
        bytes32 ticketHash,
        uint256 deadline,
        bytes calldata sig
    ) internal view {
        require(block.timestamp <= deadline, "EXPIRED");
        bytes32 digest = keccak256(
            abi.encode(
                ticketHash,
                block.chainid,
                address(this),
                _nonces[sponsor],
                deadline
            )
        );
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(sig.offset)
            s := calldataload(add(sig.offset, 32))
            v := byte(0, calldataload(add(sig.offset, 64)))
        }
        require(ecrecover(digest, v, r, s) == sponsor, "BAD_SIG");
    }
}
