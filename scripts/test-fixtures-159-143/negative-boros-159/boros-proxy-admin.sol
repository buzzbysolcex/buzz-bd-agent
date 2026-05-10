// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Fixture: negative-boros-159
// Pattern: ProxyAdmin where admin commitment resolves to a multi-sig.
// Both timelock and multisig hints present in source; admin expression
// (`address(safe)`) resolves to the multisig.
// Expected #159 verdict: 0 findings (suppressed by admin_resolves_to_multisig_cast).

contract ProxyAdmin {}
contract GnosisSafe {}
contract TimelockController {}

contract BorosProxyAdmin is ProxyAdmin {
    constructor(GnosisSafe safe, TimelockController timelock) {
        _transferOwnership(address(safe));
    }
}
