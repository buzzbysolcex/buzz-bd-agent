// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Fixture: negative-boros-143
// Pattern: UUPSUpgradeable + AccessControlUpgradeable, initializer grants
// DEFAULT_ADMIN_ROLE to address(timelock). TimelockController hint present.
// Expected #143 verdict: 0 findings (suppressed — admin role granted to
// timelock-named identifier with timelock present in source).

contract UUPSUpgradeable {}
contract AccessControlUpgradeable {}
contract TimelockController {}

contract BorosMarketHub is UUPSUpgradeable, AccessControlUpgradeable {
    bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;

    function initialize(TimelockController timelock) external initializer {
        _grantRole(DEFAULT_ADMIN_ROLE, address(timelock));
    }

    function _authorizeUpgrade(address) internal onlyRole(DEFAULT_ADMIN_ROLE) {}
}
