PRIORITY TASK: Ship All Three Remaining Contracts + Wire Pipeline

ScoreStorage.sol is LIVE on Base at 0x43B28FAfdC342c6F8Ed8252B38254531d9A919eb.
Now ship the rest. All three contracts + pipeline wiring. Keep shipping.

DEPLOYER: 0xa57f4010d200dc1E67cAbede025b90090cd99206 (BNB_PRIVATE_KEY)
OWNER: 0x2Dc03124091104E7798C0273D96FC5ED65F05aA9 (identity wallet)
WORKSPACE: /home/claude-code/buzz-contracts
BALANCE: ~0.005196 ETH ($10.91) — enough for all three + pipeline writes

Execute in this order:

═══════════════════════════════════════
TASK 1: WIRE PIPELINE TO SCORESTORAGE (do this FIRST)
═══════════════════════════════════════

ScoreStorage is deployed but only has 1 test entry.
Make it useful — push real HOT token scores on-chain.

1. Create a script that Claude Code can call to push scores:
   scripts/push-score.sh

   Usage: ./push-score.sh <token_address> <score> <confidence> <sources> <triVerified> <safety> <wallet> <technical> <social>

   Under the hood:
   cast send 0x43B28FAfdC342c6F8Ed8252B38254531d9A919eb \
     "updateScore(address,uint256,uint8,uint8,bool,uint8,uint8,uint8,uint8)" \
     <args> \
     --rpc-url https://mainnet.base.org \
     --account buzz-deployer

2. Push the current 4 HOT tokens from pipeline on-chain NOW.
   Pull their scores from localhost:3000/api/v1/pipeline?status=HOT
   For each, run push-score.sh with their real data.

3. Add to pipeline-scorer agent spec:
   When a token reaches HOT (85+) → auto-push score on-chain via push-score.sh
   Log: "[ON-CHAIN] Token 0x... scored 85 → pushed to ScoreStorage"

4. Add Express endpoint:
   GET /api/v1/contract/scores — reads all on-chain scores via cast call
   GET /api/v1/contract/score/:address — reads single token score
   POST /api/v1/contract/push/:address — manually push score (admin only)

5. Add War Room command:
   /onchain <address> — push token score on-chain
   /onchain-status — show total scored on-chain + last update

After this task, ScoreStorage has REAL data and pipeline auto-pushes HOT tokens.

═══════════════════════════════════════
TASK 2: BUILD + DEPLOY ListingOracle.sol
═══════════════════════════════════════

The revenue contract. Wraps ScoreStorage with a payment requirement.
Anyone can query, but they pay per call.

Write src/ListingOracle.sol:

Key features:
- getListingScore(address token) — same interface as ScoreStorage
- Requires msg.value >= queryFee (start at 0.000005 ETH ≈ $0.01)
- Owner can update queryFee
- Owner can withdraw accumulated fees
- Reads from ScoreStorage contract (pass ScoreStorage address in constructor)
- Events: ScoreQueried(address indexed querier, address indexed token, uint256 fee)
- Free queries for owner (Buzz doesn't pay itself)

Constructor params:
- address _scoreStorage (0x43B28FAfdC342c6F8Ed8252B38254531d9A919eb)
- uint256 _queryFee (5000000000000 wei = 0.000005 ETH ≈ $0.01)

Write tests in test/ListingOracle.t.sol:
- testQueryWithPayment (send enough ETH, get score back)
- testQueryWithoutPayment (should revert)
- testQueryUnderpayment (should revert)
- testOwnerQueryFree (owner doesn't pay)
- testUpdateFee (only owner)
- testWithdraw (only owner, check balance)
- testWithdrawToOwner (funds go to owner address)

Compile: forge build
Test: forge test -vvv
Deploy: forge create --rpc-url https://mainnet.base.org --account buzz-deployer
Transfer ownership: cast send <addr> "transferOwnership(address)" 0x2Dc03124091104E7798C0273D96FC5ED65F05aA9

═══════════════════════════════════════
TASK 3: BUILD + DEPLOY ListingEscrow.sol
═══════════════════════════════════════

The money contract. Token projects deposit listing fees into escrow.
SolCex confirms listing → escrow releases payment.

Write src/ListingEscrow.sol:

Key features:
- deposit(address token) payable — project deposits listing fee
- confirmListing(address token) — only owner (SolCex) confirms
- refund(address token) — only owner can refund if listing rejected
- getDeposit(address token) — view deposit status
- Minimum deposit: configurable (start at 0.01 ETH for testing)
- States: PENDING → CONFIRMED → RELEASED (or REFUNDED)
- Events: DepositReceived, ListingConfirmed, FundsReleased, DepositRefunded
- Timeout: if not confirmed within 30 days, depositor can claim refund

Struct:
  ListingDeposit {
    address depositor;
    uint256 amount;
    uint256 depositedAt;
    Status status; // PENDING, CONFIRMED, RELEASED, REFUNDED
  }

Write tests in test/ListingEscrow.t.sol:
- testDeposit (deposit and verify state)
- testConfirmAndRelease (owner confirms, funds released)
- testRefund (owner refunds, depositor gets money back)
- testOnlyOwnerConfirm (non-owner can't confirm)
- testOnlyOwnerRefund (non-owner can't refund)
- testDoubleDeposit (can't deposit twice for same token)
- testTimeoutRefund (depositor can claim after 30 days)
- testMinimumDeposit (below minimum reverts)

Compile: forge build
Test: forge test -vvv
Deploy: forge create --rpc-url https://mainnet.base.org --account buzz-deployer
Transfer ownership: cast send <addr> "transferOwnership(address)" 0x2Dc03124091104E7798C0273D96FC5ED65F05aA9

═══════════════════════════════════════
TASK 4: BUILD + DEPLOY BuzzReputation.sol
═══════════════════════════════════════

The trust contract. Tracks prediction accuracy on-chain.

Write src/BuzzReputation.sol:

Key features:
- recordPrediction(address token, uint256 score, string outcome)
  — owner records "we scored token X at 85 on date Y"
- recordOutcome(address token, bool listed, string exchange)
  — owner records "token X got listed on SolCex on date Z"
- getAccuracy() — returns (totalPredictions, correctPredictions, accuracyBps)
  — accuracy in basis points (8500 = 85%)
- getPrediction(address token) — returns prediction details
- A prediction is "correct" if score >= 85 AND token got listed,
  OR score < 50 AND token did NOT get listed

Write tests in test/BuzzReputation.t.sol:
- testRecordPrediction
- testRecordOutcome
- testAccuracyCalculation
- testOnlyOwner
- testCorrectPrediction (high score + listed = correct)
- testIncorrectPrediction (high score + not listed = incorrect)

Compile: forge build
Test: forge test -vvv
Deploy: forge create --rpc-url https://mainnet.base.org --account buzz-deployer
Transfer ownership: cast send <addr> "transferOwnership(address)" 0x2Dc03124091104E7798C0273D96FC5ED65F05aA9

═══════════════════════════════════════
TASK 5: UPDATE WAR ROOM + DOCS
═══════════════════════════════════════

After all deploys, add War Room commands:
  /onchain <addr>        — push score on-chain
  /onchain-status        — total on-chain scores + last update
  /oracle-stats          — ListingOracle query count + revenue
  /escrow-status         — active escrow deposits
  /reputation            — accuracy stats

Update docs/BUZZ-SMART-CONTRACTS.md with:
  - All 4 contract addresses
  - Deploy TX hashes
  - Gas costs
  - ABI locations

═══════════════════════════════════════
SAFETY RULES
═══════════════════════════════════════

1. ALL contracts: write tests FIRST, compile, test, THEN deploy
2. ALL contracts: transfer ownership to 0x2Dc0... after deploy
3. ALL mainnet deploys: report address + TX to War Room immediately
4. Check deployer balance between deploys (should have plenty)
5. If any test fails: FIX before deploying. Do NOT deploy broken contracts.
6. Verify each contract on basescan after deploy if possible

═══════════════════════════════════════
REPORT AFTER EACH CONTRACT
═══════════════════════════════════════

For each contract deployed, report to War Room:

Contract: [name]
Address: [0x...]
Deploy TX: [0x...]
Gas cost: $[amount]
Tests: [N/N] passed
Owner: 0x2Dc03124091104E7798C0273D96FC5ED65F05aA9
Basescan: https://basescan.org/address/[address]

═══════════════════════════════════════
FINAL REPORT (after all 4 tasks complete)
═══════════════════════════════════════

- ✅ ScoreStorage pipeline wired (N HOT tokens pushed on-chain)
- ✅ ListingOracle deployed (address + fee)
- ✅ ListingEscrow deployed (address + minimum deposit)
- ✅ BuzzReputation deployed (address)
- ✅ All ownership transferred to identity wallet
- ✅ All tests passing
- ✅ War Room commands added
- ✅ Docs updated
- Deployer balance remaining: ___ ETH
- Total contracts on Base: 4
- Total gas spent today: $___
