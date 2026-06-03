pragma solidity ^0.8.0;
contract Claimer {
    address public verifier;                                  // single trust anchor
    function setVerifier(address v) external onlyOwner { verifier = v; }  // no timelock
    function claim(bytes32 h, bytes memory sig) external {
        require(ecrecover(h, 27, bytes32(0), bytes32(0)) == verifier, "bad sig"); // single-anchor gate
        payable(msg.sender).transfer(1 ether);
    }
}
