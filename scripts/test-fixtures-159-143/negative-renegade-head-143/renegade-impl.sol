// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Fixture: negative-renegade-head-143
// Pattern: TransparentUpgradeableProxy + atomic 3-arg deploy + _disableInitializers.
// This is the Renegade HEAD source (per Doctrine #14 — POSITIVE for #159 admin
// pattern, NEGATIVE for #143 source pattern). The implementation contract is
// NOT UUPS — it doesn't inherit UUPSUpgradeable + AccessControlUpgradeable.
// Expected #143 verdict: 0 findings (file-level UUPS+AC gate fails).

contract TransparentUpgradeableProxy {}

contract RenegadeImpl {
    constructor() {
        // _disableInitializers() — Renegade-class hardening.
    }
    function initialize(address admin) external {
        // gated externally by ProxyAdmin owner only
    }
}
