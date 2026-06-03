pragma solidity ^0.8.0;
contract BridgeSafe {
    mapping(address => mapping(address => bool)) public approved;
    function pull(address from, address to, uint256 amt) external {
        require(approved[from][msg.sender], "not approved");   // validates `from`
        token.transferFrom(from, to, amt);                     // consumes the SAME `from` — safe
    }
}
