pragma solidity ^0.8.0;
contract Vesting {
    uint256 public total; uint256 public claimed; uint256 public cliff;
    function release() external {
        uint256 vested = total * (block.timestamp - cliff) / (cliff - cliff); // div-by-zero -> release reverts forever
        uint256 amount = vested - claimed; claimed += amount;
    }
}
