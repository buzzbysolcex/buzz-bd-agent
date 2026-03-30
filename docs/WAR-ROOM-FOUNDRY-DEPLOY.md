PRIORITY TASK: Give Buzz Smart Contract Deployment Capabilities (Foundry)

CONTEXT:
We're adding Foundry (Solidity toolchain) to Hetzner so Buzz can autonomously 
write, compile, test, and deploy smart contracts on Base L2.
Same capability as ClawdBotATG (52 contracts) but for our own use cases.
This is the foundation for the Listing Protocol — no external dependencies.
We build it ourselves. No Austin. No ClawdBot.

DEPLOYMENT WALLET (CONFIRMED on Basescan):
Address: 0xa57f4010d200dc1E67cAbede025b90090cd99206
Balance: 0.0052 ETH (~$10.32) on Base — enough for 50+ deploys
Key: BNB_PRIVATE_KEY (already in Docker env)
Signing: YES (confirmed)

IDENTITY WALLET (for ownership transfer after deploy):
Address: 0x2Dc03124091104E7798C0273D96FC5ED65F05aA9
Has ERC-8004 Agent Identity on Base (#17483)
Strategy: Deploy from 0xa57f (has gas) → transfer ownership to 0x2Dc0 (identity)

═══════════════════════════════════════
STEP 1: INSTALL FOUNDRY ON HETZNER HOST
═══════════════════════════════════════

curl -L https://foundry.paradigm.xyz | bash
source ~/.bashrc
foundryup

# Verify
forge --version
cast --version
anvil --version
chisel --version

═══════════════════════════════════════
STEP 2: CREATE CONTRACT WORKSPACE
═══════════════════════════════════════

mkdir -p /home/claude-code/buzz-contracts
cd /home/claude-code/buzz-contracts

# Initialize Foundry project
forge init --no-commit

# Install OpenZeppelin
forge install OpenZeppelin/openzeppelin-contracts --no-commit

# Remappings
echo '@openzeppelin/=lib/openzeppelin-contracts/' > remappings.txt

# Config
cat > foundry.toml << 'EOF'
[profile.default]
src = 'src'
out = 'out'
libs = ['lib']
solc_version = "0.8.23"
optimizer = true
optimizer_runs = 200

[rpc_endpoints]
base = "https://mainnet.base.org"
base_sepolia = "https://sepolia.base.org"

fs_permissions = [{ access = "read", path = "./"}]
EOF

═══════════════════════════════════════
STEP 3: IMPORT DEPLOYMENT WALLET
═══════════════════════════════════════

# Import BNB_PRIVATE_KEY into Foundry encrypted keystore
# Read the key from Docker env
cast wallet import buzz-deployer --private-key $BNB_PRIVATE_KEY

# Verify address matches
cast wallet address --account buzz-deployer
# MUST return: 0xa57f4010d200dc1E67cAbede025b90090cd99206

# Verify balance
cast balance 0xa57f4010d200dc1E67cAbede025b90090cd99206 --rpc-url https://mainnet.base.org
# Expected: ~0.005199 ETH

# SECURITY: After import, the key is encrypted in Foundry keystore.
# Never print BNB_PRIVATE_KEY in logs or War Room messages.

═══════════════════════════════════════
STEP 4: WRITE ScoreStorage.sol
═══════════════════════════════════════

Delete the default Counter.sol and write src/ScoreStorage.sol:

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @title Buzz Score Storage — On-Chain Listing Intelligence Oracle
/// @notice Stores token listing scores from Buzz BD Agent (SolCex Exchange)
/// @dev Only the deployer (owner) can update scores. Anyone can read.
contract ScoreStorage is Ownable {
    
    struct TokenScore {
        uint256 score;           // 0-100 composite score
        uint8 confidence;        // 1-5 verification depth
        uint8 sourceCount;       // number of intel sources used
        uint256 lastUpdated;     // block.timestamp
        bool triVerified;        // passed triple verification
        uint8 safetyScore;       // 0-100
        uint8 walletScore;       // 0-100
        uint8 technicalScore;    // 0-100
        uint8 socialScore;       // 0-100
    }
    
    mapping(address => TokenScore) public scores;
    address[] public scoredTokens;
    mapping(address => bool) private tokenExists;
    
    event ScoreUpdated(
        address indexed token,
        uint256 score,
        uint8 confidence,
        bool triVerified,
        uint256 timestamp
    );
    
    constructor() Ownable(msg.sender) {}
    
    /// @notice Update or create a token's listing score
    function updateScore(
        address token,
        uint256 score,
        uint8 confidence,
        uint8 sourceCount,
        bool triVerified,
        uint8 safetyScore,
        uint8 walletScore,
        uint8 technicalScore,
        uint8 socialScore
    ) external onlyOwner {
        require(score <= 100, "Score must be 0-100");
        
        scores[token] = TokenScore({
            score: score,
            confidence: confidence,
            sourceCount: sourceCount,
            lastUpdated: block.timestamp,
            triVerified: triVerified,
            safetyScore: safetyScore,
            walletScore: walletScore,
            technicalScore: technicalScore,
            socialScore: socialScore
        });
        
        if (!tokenExists[token]) {
            scoredTokens.push(token);
            tokenExists[token] = true;
        }
        
        emit ScoreUpdated(token, score, confidence, triVerified, block.timestamp);
    }
    
    /// @notice THE ORACLE FUNCTION — get a token's listing score
    function getListingScore(address token) external view returns (
        uint256 score,
        uint8 confidence,
        uint8 sourceCount,
        uint256 lastUpdated,
        bool triVerified
    ) {
        TokenScore memory s = scores[token];
        return (s.score, s.confidence, s.sourceCount, s.lastUpdated, s.triVerified);
    }
    
    /// @notice Get detailed breakdown
    function getDetailedScore(address token) external view returns (TokenScore memory) {
        return scores[token];
    }
    
    /// @notice Total scored tokens
    function totalScored() external view returns (uint256) {
        return scoredTokens.length;
    }
    
    /// @notice Get scored token by index
    function getScoredToken(uint256 index) external view returns (address) {
        require(index < scoredTokens.length, "Index out of bounds");
        return scoredTokens[index];
    }
}

═══════════════════════════════════════
STEP 5: WRITE TESTS
═══════════════════════════════════════

Delete default Counter.t.sol and write test/ScoreStorage.t.sol:

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Test.sol";
import "../src/ScoreStorage.sol";

contract ScoreStorageTest is Test {
    ScoreStorage public store;
    address public token1 = address(0x1234);
    address public token2 = address(0x5678);
    
    function setUp() public {
        store = new ScoreStorage();
    }
    
    function testUpdateAndGetScore() public {
        store.updateScore(token1, 85, 5, 29, true, 90, 80, 75, 85);
        
        (uint256 score, uint8 conf, uint8 sources, , bool verified) = 
            store.getListingScore(token1);
        
        assertEq(score, 85);
        assertEq(conf, 5);
        assertEq(sources, 29);
        assertTrue(verified);
    }
    
    function testDetailedScore() public {
        store.updateScore(token1, 85, 5, 29, true, 90, 80, 75, 85);
        
        ScoreStorage.TokenScore memory s = store.getDetailedScore(token1);
        assertEq(s.safetyScore, 90);
        assertEq(s.walletScore, 80);
        assertEq(s.technicalScore, 75);
        assertEq(s.socialScore, 85);
    }
    
    function testTotalScored() public {
        assertEq(store.totalScored(), 0);
        store.updateScore(token1, 85, 5, 29, true, 90, 80, 75, 85);
        assertEq(store.totalScored(), 1);
        store.updateScore(token2, 70, 3, 15, false, 60, 70, 80, 65);
        assertEq(store.totalScored(), 2);
    }
    
    function testUpdateExistingToken() public {
        store.updateScore(token1, 85, 5, 29, true, 90, 80, 75, 85);
        store.updateScore(token1, 55, 3, 29, false, 40, 30, 75, 85);
        
        (uint256 score, , , , bool verified) = store.getListingScore(token1);
        assertEq(score, 55);
        assertFalse(verified);
        assertEq(store.totalScored(), 1); // still 1, not 2
    }
    
    function testOnlyOwnerCanUpdate() public {
        vm.prank(address(0xBEEF));
        vm.expectRevert();
        store.updateScore(token1, 85, 5, 29, true, 90, 80, 75, 85);
    }
    
    function testScoreCap() public {
        vm.expectRevert("Score must be 0-100");
        store.updateScore(token1, 101, 5, 29, true, 90, 80, 75, 85);
    }
    
    function testGetScoredToken() public {
        store.updateScore(token1, 85, 5, 29, true, 90, 80, 75, 85);
        assertEq(store.getScoredToken(0), token1);
    }
    
    function testGetScoredTokenOutOfBounds() public {
        vm.expectRevert("Index out of bounds");
        store.getScoredToken(0);
    }
}

═══════════════════════════════════════
STEP 6: COMPILE + TEST
═══════════════════════════════════════

cd /home/claude-code/buzz-contracts

# Compile
forge build

# Run tests (verbose)
forge test -vvv

# ALL tests must pass before any deployment.
# Report test results to War Room.

═══════════════════════════════════════
STEP 7: DEPLOY TO BASE SEPOLIA (TESTNET)
═══════════════════════════════════════

# Get testnet ETH first:
# https://www.alchemy.com/faucets/base-sepolia
# OR use cast to check if we have any on testnet
cast balance 0xa57f4010d200dc1E67cAbede025b90090cd99206 --rpc-url https://sepolia.base.org

# If we have testnet ETH, deploy:
forge create src/ScoreStorage.sol:ScoreStorage \
  --rpc-url https://sepolia.base.org \
  --account buzz-deployer

# Save the deployed address from output
# Test it:
cast call <TESTNET_ADDRESS> "totalScored()" --rpc-url https://sepolia.base.org

# Test writing a score:
cast send <TESTNET_ADDRESS> \
  "updateScore(address,uint256,uint8,uint8,bool,uint8,uint8,uint8,uint8)" \
  0x0000000000000000000000000000000000001234 85 5 29 true 90 80 75 85 \
  --rpc-url https://sepolia.base.org \
  --account buzz-deployer

# Verify score was stored:
cast call <TESTNET_ADDRESS> \
  "getListingScore(address)" \
  0x0000000000000000000000000000000000001234 \
  --rpc-url https://sepolia.base.org

# If testnet deploy works → report to War Room → await Ogie approval for mainnet

═══════════════════════════════════════
STEP 8: DEPLOY TO BASE MAINNET (after Ogie approves)
═══════════════════════════════════════

# DO NOT execute until Ogie explicitly approves in War Room

forge create src/ScoreStorage.sol:ScoreStorage \
  --rpc-url https://mainnet.base.org \
  --account buzz-deployer \
  --verify

# After deploy, transfer ownership to identity wallet:
cast send <MAINNET_ADDRESS> \
  "transferOwnership(address)" \
  0x2Dc03124091104E7798C0273D96FC5ED65F05aA9 \
  --rpc-url https://mainnet.base.org \
  --account buzz-deployer

# Verify new owner:
cast call <MAINNET_ADDRESS> "owner()" --rpc-url https://mainnet.base.org
# Expected: 0x2Dc03124091104E7798C0273D96FC5ED65F05aA9

═══════════════════════════════════════
STEP 9: ADD WAR ROOM COMMANDS
═══════════════════════════════════════

/contract-build          — forge build (compile all contracts)
/contract-test           — forge test -vvv (run all tests)
/contract-deploy <name>  — Deploy contract to Base (requires Ogie approval)
/contract-call <addr> <fn>  — Read from deployed contract (cast call)
/contract-send <addr> <fn>  — Write to deployed contract (cast send)
/contract-balance        — Check deployer wallet balance
/contract-list           — List all deployed contracts with addresses

═══════════════════════════════════════
STEP 10: WIRE INTO BUZZ PIPELINE (after mainnet deploy)
═══════════════════════════════════════

When pipeline-scorer finalizes a HOT token score:
1. Claude Code runs cast send to push score on-chain
2. Score is immutably stored on Base L2 (~$0.001 gas)
3. Anyone can read via getListingScore(tokenAddress)

Add Express endpoints:
  GET /api/v1/contract/score/:address  — reads score from on-chain
  GET /api/v1/contract/stats           — total scored, last update
  POST /api/v1/contract/push/:address  — pushes score on-chain (admin only)

═══════════════════════════════════════
FUTURE CONTRACTS (after ScoreStorage works)
═══════════════════════════════════════

Contract #2: ListingEscrow.sol
  - Token project deposits $5K USDC
  - SolCex confirms listing → escrow releases
  - On-chain, auditable, trustless

Contract #3: ListingOracle.sol
  - getListingScore() with x402 payment gate
  - Any dApp calls it, pays per query
  - Revenue flows to Buzz wallet

Contract #4: BuzzReputation.sol
  - On-chain reputation for scoring accuracy
  - Tracks predictions vs outcomes
  - Builds trust over time

═══════════════════════════════════════
SAFETY RULES (PERMANENT)
═══════════════════════════════════════

1. ALL mainnet deployments require Ogie approval (testnet is free to test)
2. ALWAYS deploy to testnet first → verify → THEN mainnet
3. NEVER store private keys in plaintext — use Foundry keystore
4. NEVER deploy unaudited contracts to mainnet with real funds
5. Gas awareness: check balance before deploy, estimate gas first
6. All deployed contract addresses logged in War Room + docs
7. After mainnet deploy, transfer ownership to identity wallet (0x2Dc0...)
8. Contract workspace: /home/claude-code/buzz-contracts/ (NOT in Buzz Docker)

═══════════════════════════════════════
PERSISTENCE
═══════════════════════════════════════

1. Save as: docs/BUZZ-SMART-CONTRACTS.md
2. Add to CLAUDE.md startup read order
3. Workspace: /home/claude-code/buzz-contracts/
4. This is PERMANENT capability

═══════════════════════════════════════
REPORT WHEN DONE
═══════════════════════════════════════

- ✅ Foundry installed (forge/cast/anvil/chisel — report versions)
- ✅ Workspace created at /home/claude-code/buzz-contracts/
- ✅ OpenZeppelin installed
- ✅ ScoreStorage.sol written + compiled (forge build)
- ✅ All 8 tests pass (forge test -vvv)
- ✅ Wallet imported as buzz-deployer (0xa57f..9206 confirmed)
- ✅ Wallet balance: _____ ETH on Base
- ✅ War Room commands added
- ✅ Document saved + CLAUDE.md updated
- Testnet deploy status: [ready / deployed / blocked on faucet]
- Awaiting Ogie approval for mainnet deploy
