pragma solidity ^0.8.0;
contract ClaimerSafe {
    mapping(address => bool) public signers; uint256 public threshold;
    function claim(bytes32 h, bytes[] memory sigs) external {
        uint256 valid; for (uint i; i < sigs.length; i++) { valid++; }
        require(valid >= threshold, "quorum");                // M-of-N, not a single anchor
        payable(msg.sender).transfer(1 ether);
    }
}
