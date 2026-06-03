pragma solidity ^0.8.0;
contract Vault {
    address public owner;
    function withdraw(uint256 a) external { require(msg.sender == owner); payable(owner).transfer(a); }
    // no selfdestruct — not killable
}
