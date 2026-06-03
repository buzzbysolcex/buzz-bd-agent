pragma solidity ^0.8.0;
contract DonationSafe {
    mapping(address => uint256) public deposits;
    receive() external payable { deposits[msg.sender] += msg.value; }
    function withdraw() external { uint256 a = deposits[msg.sender]; deposits[msg.sender] = 0; payable(msg.sender).transfer(a); }
}
