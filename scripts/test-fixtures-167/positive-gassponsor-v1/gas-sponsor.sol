// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Fixture: positive-gassponsor-v1
// Pattern: GasSponsor v1 + GasSponsorV2 in the SAME file. V1 builds the
// sponsorship-signature digest WITHOUT block.chainid AND WITHOUT
// address(this). V2 binds BOTH plus nonce + deadline.
// Expected #167 verdict on V1 sig-verify site: 1 HIGH,
// asymmetry_class=v1_v2_strict_subset, conf 0.85.

contract GasSponsor {
    mapping(address => uint256) public _nonces;

    function _assertSponsorshipSignature(
        address sponsor,
        bytes32 ticketHash,
        bytes calldata sig
    ) internal view {
        // V1 BUG: digest binds neither chainid nor address(this).
        // The user nonce is the only freshness primitive.
        bytes32 digest = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", ticketHash)
        );
        // Recover and check.
        require(_recover(digest, sig) == sponsor, "BAD_SIG");
    }

    function _recover(bytes32 digest, bytes calldata sig) internal pure returns (address) {
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(sig.offset)
            s := calldataload(add(sig.offset, 32))
            v := byte(0, calldataload(add(sig.offset, 64)))
        }
        return ecrecover(digest, v, r, s);
    }
}

contract GasSponsorV2 {
    mapping(address => uint256) public _nonces;

    function _assertSponsorshipSignature(
        address sponsor,
        bytes32 ticketHash,
        uint256 deadline,
        bytes calldata sig
    ) internal view {
        require(block.timestamp <= deadline, "EXPIRED");
        // V2 FIX: digest binds chainid + address(this) + nonce + deadline.
        bytes32 digest = keccak256(
            abi.encode(
                ticketHash,
                block.chainid,
                address(this),
                _nonces[sponsor],
                deadline
            )
        );
        require(_recover(digest, sig) == sponsor, "BAD_SIG");
    }

    function _recover(bytes32 digest, bytes calldata sig) internal pure returns (address) {
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(sig.offset)
            s := calldataload(add(sig.offset, 32))
            v := byte(0, calldataload(add(sig.offset, 64)))
        }
        return ecrecover(digest, v, r, s);
    }
}
