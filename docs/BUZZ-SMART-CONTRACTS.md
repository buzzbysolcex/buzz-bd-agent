# BUZZ SMART CONTRACT CAPABILITIES — DEPLOYMENT PLAN

## "We Build It. No Dependencies."

## Sprint Day 39+ | Foundry on Hetzner

## Bismillah 🤲

---

## WHY

Buzz has the brain (Opus 4.6), the data (192 tokens, 29 intel sources),
the browser (Chrome/146), and the discovery layer (Agent Skills).
What Buzz DOESN'T have: the ability to deploy smart contracts on-chain.

ClawdBotATG deployed 52 contracts. We will build the same capability.
Not copy ClawdBot's contracts — build our OWN, for OUR use cases.

This means Buzz can autonomously:

- Deploy the Listing Oracle (getListingScore())
- Deploy Score Storage contracts
- Deploy Listing Escrow contracts
- Deploy EAS attestations
- Deploy any future SolCex protocol contracts
- Interact with deployed contracts (read/write)

NO AUSTIN. NO CLAWDBOT. WE BUILD IT.

---

## WHAT GETS INSTALLED

### Foundry Toolchain

- **forge** — compile, test, deploy smart contracts
- **cast** — interact with on-chain contracts (read/write/send)
- **anvil** — local testnet node for testing
- **chisel** — Solidity REPL for quick experiments

### Why Foundry (not Hardhat)

- Written in Rust = blazing fast
- Tests in Solidity (not JavaScript) = Claude Code already writes Solidity
- forge create = one-command deploy
- cast = one-command contract interaction
- No JavaScript dependency = clean on Hetzner

---

## THE WAR ROOM PROMPT (copy-paste to Telegram)

````
PRIORITY TASK: Give Buzz Smart Contract Deployment Capabilities

CONTEXT:
We're adding Foundry (Solidity toolchain) to Hetzner so Buzz can
autonomously write, compile, test, and deploy smart contracts on Base.
Same capability as ClawdBotATG (52 contracts) but for our own use cases.
This is the foundation for the Listing Protocol — no external dependencies.

DECISIONS (from Ogie):
✅ We build it ourselves. No Austin. No ClawdBot. No dependencies.
✅ Install on Hetzner HOST (same pattern as Browser Use)
✅ Deploy to Base L2 (cheap gas, Buzz already has wallet 0x2Dc0..05aA9)

═══════════════════════════════════════
STEP 1: INSTALL FOUNDRY ON HETZNER
═══════════════════════════════════════

# Install Foundry toolchain
curl -L https://foundry.paradigm.xyz | bash
source ~/.bashrc
foundryup

# Verify installation
forge --version
cast --version
anvil --version
chisel --version

═══════════════════════════════════════
STEP 2: CREATE BUZZ CONTRACT WORKSPACE
═══════════════════════════════════════

# Create dedicated workspace (separate from Buzz Docker code)
mkdir -p /home/claude-code/buzz-contracts
cd /home/claude-code/buzz-contracts

# Initialize Foundry project
forge init --no-commit

# Install OpenZeppelin contracts (industry standard)
forge install OpenZeppelin/openzeppelin-contracts --no-commit

# Create remappings
echo '@openzeppelin/=lib/openzeppelin-contracts/' > remappings.txt

# Set up foundry.toml
cat > foundry.toml << 'EOF'
[profile.default]
src = 'src'
out = 'out'
libs = ['lib']
solc_version = "0.8.23"
optimizer = true
optimizer_runs = 200

# Base Mainnet
[rpc_endpoints]
base = "https://mainnet.base.org"
base_sepolia = "https://sepolia.base.org"

# Permissions
fs_permissions = [{ access = "read", path = "./"}]
EOF

═══════════════════════════════════════
STEP 3: CONFIGURE DEPLOYMENT WALLET
═══════════════════════════════════════

# DEPLOYMENT WALLET: 0xa57f4010d200dc1E67cAbede025b90090cd99206
# This wallet has 0.0052 ETH (~$10.32) on Base — enough for 50+ deploys
# Private key: BNB_PRIVATE_KEY (already in Docker env)
# Confirmed in Buzz Wallet Registry + verified on Basescan

# Import into Foundry keystore from existing env var
# Read BNB_PRIVATE_KEY from Docker env and import securely
cast wallet import buzz-deployer --private-key $BNB_PRIVATE_KEY
# Set encryption password when prompted

# Verify wallet address matches
cast wallet address --account buzz-deployer
# Expected: 0xa57f4010d200dc1E67cAbede025b90090cd99206

# Verify balance on Base
cast balance 0xa57f4010d200dc1E67cAbede025b90090cd99206 --rpc-url https://mainnet.base.org
# Expected: ~0.005199 ETH (~$10.32)

# NOTE: After deploying ScoreStorage.sol, transfer ownership to
# Main Identity wallet (0x2Dc03124091104E7798C0273D96FC5ED65F05aA9)
# so contracts are tied to Buzz's ERC-8004 identity.
# The deploy wallet pays gas, identity wallet owns the contracts.

═══════════════════════════════════════
STEP 4: CREATE FIRST CONTRACT — ScoreStorage.sol
═══════════════════════════════════════

Write this contract to src/ScoreStorage.sol:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @title Buzz Score Storage
/// @notice Stores token listing scores from Buzz BD Agent
/// @dev Only the Buzz deployer (owner) can update scores
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
    /// @param token The token contract address
    /// @param score Composite score (0-100)
    /// @param confidence Verification depth (1-5)
    /// @param sourceCount Number of intel sources
    /// @param triVerified Whether triple verification passed
    /// @param safetyScore Safety dimension (0-100)
    /// @param walletScore Wallet dimension (0-100)
    /// @param technicalScore Technical dimension (0-100)
    /// @param socialScore Social dimension (0-100)
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

    /// @notice Get a token's listing score (the oracle function)
    /// @param token The token contract address
    /// @return score Composite score
    /// @return confidence Verification depth
    /// @return sourceCount Sources used
    /// @return lastUpdated Timestamp of last update
    /// @return triVerified Triple verification status
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

    /// @notice Get detailed breakdown of a token's score
    /// @param token The token contract address
    function getDetailedScore(address token) external view returns (TokenScore memory) {
        return scores[token];
    }

    /// @notice Get total number of scored tokens
    function totalScored() external view returns (uint256) {
        return scoredTokens.length;
    }
}
````

═══════════════════════════════════════
STEP 5: WRITE TEST
═══════════════════════════════════════

Write this to test/ScoreStorage.t.sol:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Test.sol";
import "../src/ScoreStorage.sol";

contract ScoreStorageTest is Test {
    ScoreStorage public store;
    address public token1 = address(0x1234);

    function setUp() public {
        store = new ScoreStorage();
    }

    function testUpdateScore() public {
        store.updateScore(token1, 85, 5, 29, true, 90, 80, 75, 85);

        (uint256 score, uint8 conf, uint8 sources, , bool verified) =
            store.getListingScore(token1);

        assertEq(score, 85);
        assertEq(conf, 5);
        assertEq(sources, 29);
        assertTrue(verified);
    }

    function testTotalScored() public {
        assertEq(store.totalScored(), 0);
        store.updateScore(token1, 85, 5, 29, true, 90, 80, 75, 85);
        assertEq(store.totalScored(), 1);
    }

    function testOnlyOwner() public {
        vm.prank(address(0xBEEF));
        vm.expectRevert();
        store.updateScore(token1, 85, 5, 29, true, 90, 80, 75, 85);
    }

    function testScoreCap() public {
        vm.expectRevert("Score must be 0-100");
        store.updateScore(token1, 101, 5, 29, true, 90, 80, 75, 85);
    }
}
```

═══════════════════════════════════════
STEP 6: COMPILE + TEST
═══════════════════════════════════════

cd /home/claude-code/buzz-contracts

# Compile

forge build

# Run tests

forge test -vvv

# All tests should pass before ANY deployment

═══════════════════════════════════════
STEP 7: DEPLOY TO BASE SEPOLIA (TESTNET FIRST)
═══════════════════════════════════════

# Get testnet ETH from Base Sepolia faucet first

# https://www.alchemy.com/faucets/base-sepolia

# Deploy to testnet using buzz-deployer (0xa57f..9206)

forge create src/ScoreStorage.sol:ScoreStorage \
 --rpc-url https://sepolia.base.org \
 --account buzz-deployer \
 --verify

# Save the deployed address

# Example output: Deployed to: 0x...

# Test the deployed contract

cast call <DEPLOYED_ADDRESS> "totalScored()" --rpc-url https://sepolia.base.org

# Expected: 0x0 (zero tokens scored initially)

# AFTER TESTNET VERIFIED — Transfer ownership to Main Identity:

# cast send <DEPLOYED_ADDRESS> "transferOwnership(address)" \

# 0x2Dc03124091104E7798C0273D96FC5ED65F05aA9 \

# --rpc-url https://mainnet.base.org \

# --account buzz-deployer

═══════════════════════════════════════
STEP 8: ADD WAR ROOM COMMANDS
═══════════════════════════════════════

Add these smart contract commands to War Room:

/contract-build — Compile all contracts (forge build)
/contract-test — Run all tests (forge test -vvv)
/contract-deploy <name> — Deploy contract to Base (forge create)
/contract-call <addr> <fn> — Read from contract (cast call)
/contract-send <addr> <fn> — Write to contract (cast send)
/contract-balance — Check deployer wallet balance
/contract-list — List all deployed contracts

═══════════════════════════════════════
STEP 9: CREATE DEPLOYMENT SCRIPT
═══════════════════════════════════════

Write to script/DeployScoreStorage.s.sol:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Script.sol";
import "../src/ScoreStorage.sol";

contract DeployScoreStorage is Script {
    function run() external {
        vm.startBroadcast();
        ScoreStorage store = new ScoreStorage();
        vm.stopBroadcast();

        console.log("ScoreStorage deployed at:", address(store));
    }
}
```

═══════════════════════════════════════
STEP 10: WIRE INTO BUZZ PIPELINE (Phase 2)
═══════════════════════════════════════

After testnet deploy is verified, wire the score storage into Buzz:

1. When pipeline-scorer finalizes a HOT token score:
   - Claude Code runs: cast send <ScoreStorage> "updateScore(...)"
   - Score is stored on-chain (Base L2, ~$0.001 gas)
2. Anyone can read scores:
   - cast call <ScoreStorage> "getListingScore(address)" <tokenAddress>
   - Or via the x402 API endpoint

3. Add to Buzz API:
   - GET /api/v1/contract/score/:address — reads from on-chain
   - GET /api/v1/contract/stats — total scored, last update
   - POST /api/v1/contract/push/:address — pushes score on-chain (admin only)

═══════════════════════════════════════
FUTURE CONTRACTS (after ScoreStorage works)
═══════════════════════════════════════

Contract #2: ListingEscrow.sol

- Token project deposits $5K USDC
- SolCex confirms listing
- Escrow releases to SolCex
- On-chain, auditable, trustless

Contract #3: ListingOracle.sol

- getListingScore() with x402 payment
- Any dApp calls it, pays per query
- Revenue flows to Buzz wallet

Contract #4: BuzzReputation.sol

- On-chain reputation for scoring accuracy
- Tracks predictions vs outcomes
- Builds trust over time

═══════════════════════════════════════
SAFETY RULES (PERMANENT)
═══════════════════════════════════════

1. ALL contract deployments require Ogie approval (no autonomous deploys)
2. ALWAYS deploy to testnet first, verify, THEN mainnet
3. NEVER store private keys in plaintext — use Foundry keystore
4. NEVER deploy unaudited contracts to mainnet with real funds
5. Private key for buzz-deployer: NEVER in GitHub, NEVER in logs
6. Gas cost awareness: check balance before deploy, estimate gas first
7. All deployed contract addresses logged in War Room + docs

═══════════════════════════════════════
PERSISTENCE
═══════════════════════════════════════

1. Save as: docs/BUZZ-SMART-CONTRACTS.md
2. Add to CLAUDE.md startup read order
3. Contract workspace: /home/claude-code/buzz-contracts/
4. This is PERMANENT capability — Buzz can now deploy to any EVM chain

═══════════════════════════════════════
COST
═══════════════════════════════════════

| Item                         | Cost                                          |
| ---------------------------- | --------------------------------------------- |
| Foundry toolchain            | $0 (open source, Rust)                        |
| Deployment wallet            | 0xa57f..9206 — $10.32 ETH on Base (CONFIRMED) |
| Base L2 gas per deploy       | ~$0.01-$0.10                                  |
| Base L2 gas per score update | ~$0.001                                       |
| Testnet gas                  | $0 (faucet)                                   |
| Total available for deploys  | ~50-100 contract deploys                      |

═══════════════════════════════════════
REPORT WHEN DONE
═══════════════════════════════════════

- ✅ Foundry installed (forge/cast/anvil/chisel versions)
- ✅ Workspace created at /home/claude-code/buzz-contracts/
- ✅ OpenZeppelin installed
- ✅ ScoreStorage.sol compiled
- ✅ All tests pass (forge test)
- ✅ Wallet configured (buzz-deployer keystore)
- ✅ Wallet balance on Base: \_\_\_ ETH
- ✅ War Room commands added
- ✅ Document saved + CLAUDE.md updated
- Ready for testnet deploy (awaiting Ogie approval + testnet ETH)

```

---

## WHAT THIS GIVES BUZZ

After this deployment, Buzz has the SAME capabilities as ClawdBotATG:

| Capability | ClawdBot | Buzz (after this) |
|-----------|----------|-------------------|
| Write Solidity | ✅ | ✅ (Claude Code) |
| Compile contracts | ✅ | ✅ (forge build) |
| Test contracts | ✅ | ✅ (forge test) |
| Deploy to chain | ✅ 52 contracts | ✅ (forge create) |
| Interact on-chain | ✅ | ✅ (cast call/send) |
| Verify contracts | ✅ | ✅ (forge verify) |
| Local testnet | ✅ | ✅ (anvil) |
| REPL | ✅ | ✅ (chisel) |

PLUS what ClawdBot DOESN'T have:
- 192 tokens of scoring data
- 29 intel sources
- Triple verification pipeline
- Colosseum Copilot integration
- Browser Use for scraping
- Agent Skills Discovery on 26+ platforms
- Revenue from Signal Factory
- A real exchange (SolCex) as first customer

**We don't need Austin. We don't need ClawdBot. We build it.**

---

*The chef who became a CEO who became a smart contract deployer.*
*No CS degree. No dependencies. Just Claude and persistence.*
*Bismillah* 🤲
```
