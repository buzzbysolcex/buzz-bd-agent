pragma solidity ^0.8.0;
contract Bridge {
    mapping(address => mapping(address => bool)) public approved;
    function pull(address from, address spender, address to, uint256 amt) external {
        require(approved[from][msg.sender], "not approved");   // validates `from`
        token.transferFrom(spender, to, amt);                  // consumes `spender` (KEY-B != KEY-A)
    }
}
