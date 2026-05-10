// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Fixture: positive-wasabi-143
// Pattern: UUPSUpgradeable + AccessControlUpgradeable, initializer grants
// DEFAULT_ADMIN_ROLE to msg.sender. _authorizeUpgrade gated by
// onlyRole(DEFAULT_ADMIN_ROLE). NO timelock, NO multisig.
// Expected #143 verdict: 1 HIGH (msg_sender, confidence 0.82).

contract UUPSUpgradeable {}
contract AccessControlUpgradeable {}
abstract contract Initializable {}

contract WasabiVault is UUPSUpgradeable, AccessControlUpgradeable, Initializable {
    bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    function initialize(address) external initializer {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function _authorizeUpgrade(address newImplementation) internal onlyRole(DEFAULT_ADMIN_ROLE) {}
}
