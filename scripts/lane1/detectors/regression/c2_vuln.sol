pragma solidity ^0.8.0;
contract Donation {
    mapping(address => uint256) public deposits;
    receive() external payable { deposits[msg.sender] += msg.value; }  // accepts ETH, NO withdraw -> permanent freeze
}
