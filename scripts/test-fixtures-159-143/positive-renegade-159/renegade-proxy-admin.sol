// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Fixture: positive-renegade-159
// Pattern: ProxyAdmin pattern, admin commitment via constructor identifier.
// Mirrors the Renegade Arbitrum theory (R-1) — admin-key compromise on a
// ProxyAdmin owner that resolves to an external EOA at deploy time.
// No timelock, no multisig.
// Expected #159 verdict: 1 HIGH (identifier, no timelock present, confidence 0.75).

contract ProxyAdmin {}

contract RenegadeProxyAdmin is ProxyAdmin {
    constructor(address admin) {
        _transferOwnership(admin);
    }
}
