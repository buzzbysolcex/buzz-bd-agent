pragma solidity ^0.8.0;
contract VestingSafe {
    uint256 public total; uint256 public start; uint256 public duration;
    function release() external {
        require(duration > 0, "dur");
        uint256 vested = total * (block.timestamp - start) / duration; // guarded denominator
    }
}
