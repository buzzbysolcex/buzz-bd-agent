// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Fixture: positive-wasabi-159
// Pattern: TransparentUpgradeableProxy + ProxyAdmin with single literal EOA owner.
// No timelock present, no multisig present.
// Expected #159 verdict: 1 HIGH (literal_eoa_or_contract, confidence 0.9).

contract ProxyAdmin {}
contract TransparentUpgradeableProxy {}

contract WasabiProxyAdmin is ProxyAdmin {
    constructor() {
        _transferOwnership(0x1234567890aBcdEf1234567890aBcDeF12345678);
    }
}
