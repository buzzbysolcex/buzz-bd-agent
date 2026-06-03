pragma solidity ^0.8.0;
library WalletLibrary {
    address public owner;
    function initWallet(address _o) public { owner = _o; }
    function kill() public { selfdestruct(payable(msg.sender)); }   // anyone can brick the library
}
