// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Fixture: positive-transferlib-multi-instance
// Pattern: TWO TransferLib-class contracts both expose `executeSignedWithdrawal`.
// One binds block.chainid AND address(this); the other binds chainid only.
// Expected #167 verdict on the weaker site: 1 HIGH,
// asymmetry_class=cross_instance_diverge, conf 0.75.

contract TransferLibStrong {
    mapping(address => uint256) public nonces;

    function executeSignedWithdrawal(
        address user,
        uint256 amount,
        uint256 deadline,
        bytes calldata sig
    ) external {
        require(block.timestamp <= deadline, "EXPIRED");
        bytes32 digest = keccak256(
            abi.encode(
                user,
                amount,
                nonces[user]++,
                deadline,
                block.chainid,
                address(this)
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
        require(ecrecover(digest, v, r, s) == user, "BAD_SIG");
        // ... transfer logic
    }
}

contract TransferLibWeak {
    mapping(address => uint256) public nonces;

    function executeSignedWithdrawal(
        address user,
        uint256 amount,
        uint256 deadline,
        bytes calldata sig
    ) external {
        require(block.timestamp <= deadline, "EXPIRED");
        // BUG: binds chainid but NOT address(this). Sig grinded for one
        // instance can replay against any other TransferLibWeak-class instance
        // on the same chain.
        bytes32 digest = keccak256(
            abi.encode(
                user,
                amount,
                nonces[user]++,
                deadline,
                block.chainid
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
        require(ecrecover(digest, v, r, s) == user, "BAD_SIG");
        // ... transfer logic
    }
}
