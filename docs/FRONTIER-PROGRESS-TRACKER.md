# LISTING PROTOCOL — PROPOSAL vs REALITY TRACKER
## buzzbd.ai/proposal/ Build Plan vs What We've Actually Done
## Day 39 | Mar 28, 2026
## Bismillah 🤲

---

## THE 6-WEEK BUILD PLAN (from proposal)

### WEEK 1 — APR 7: Score Storage Contract on Base
PROPOSAL: "ClawdBotATG builds. Stores Buzz scores immutably on-chain."
REALITY: ✅ DONE — Day 39 (Mar 28). BUZZ built it. NOT ClawdBot.
  Contract: 0x43B28FAfdC342c6F8Ed8252B38254531d9A919eb
  Gas cost: $0.008
  Status: LIVE ON BASE MAINNET — 10 days AHEAD of schedule

### WEEK 2 — APR 14: Oracle Contract — getListingScore()
PROPOSAL: "ClawdBotATG builds, Buzz feeds data. x402 payment per call."
REALITY: 🔨 IN PROGRESS — deploying today/tomorrow. BUZZ builds it.
  ListingOracle.sol drafted. Tests being written.

### WEEK 3 — APR 21: Escrow Contract for Listing Deposits
PROPOSAL: "Adapt ClawdBotATG's existing escrow. $5K deposit → listing → release."
REALITY: 🔨 IN PROGRESS — deploying today/tomorrow. BUZZ builds it.
  ListingEscrow.sol drafted. Tests being written.

### WEEK 4 — APR 28: Frontend at buzzbd.ai/list
PROPOSAL: "Scaffold-ETH powered. Connect wallet → score → deposit → listed."
REALITY: ⬜ NOT STARTED
  Needs: React + wagmi/viem, wallet connect, score display, deposit flow
  Estimate: 2-3 days for MVP

### WEEK 5 — MAY 5: ELS-1 Draft Specification
PROPOSAL: "Co-authored with Austin Griffith. EIP-track standard document."
REALITY: ⬜ NOT STARTED
  Plan B: Write as open spec (not formal EIP) if Austin doesn't respond
  Austin follow-up #1: Mar 30 (calendar set)
  Austin follow-up #2: Apr 3 (calendar set)
  Austin decision point: Apr 10 (calendar set)

### WEEK 6 — MAY 11: Frontier Hackathon Submission
PROPOSAL: "Live oracle + working dApp + real data. Not a demo."
REALITY: ⬜ NOT STARTED (but foundation is built)
  Needs: demo video, submission narrative, pitch deck, live demo URL

---

## UPDATED NUMBERS (proposal page needs refresh)

| Metric | On Proposal Page | Actual Now | Update Needed? |
|--------|-----------------|------------|----------------|
| Tokens Scored | 192 | 192 | ✅ Correct |
| Intel Sources | 28 | 29 (+Colosseum) | 🔄 Update |
| Chain Identity | 6 | 6 | ✅ Correct |
| Signal Revenue | $40 | $80 (120K sats) | 🔄 Update |
| Agents Live | 12 | 12 | ✅ Correct |
| Sprint Days | 39 | 39 | ✅ Correct |
| Smart Contracts | "Needs partner" | 1 LIVE (building 3 more) | 🔄 BIG UPDATE |
| Competitive table "Smart Contracts" | ✗ Needs partner | ✓ Foundry deployed | 🔄 BIG UPDATE |

---

## WHAT NEEDS TO HAPPEN (Remaining items to production)

### CONTRACTS (Day 39-40)
- [x] ScoreStorage.sol — LIVE on Base
- [ ] ListingOracle.sol — deploy + test
- [ ] ListingEscrow.sol — deploy + test
- [ ] BuzzReputation.sol — deploy + test
- [ ] Wire pipeline auto-push (HOT tokens → on-chain)
- [ ] Verify all on Basescan

### FRONTEND (Week 2 — Apr 5-11)
- [ ] buzzbd.ai/list — MVP (connect wallet + check score)
- [ ] Score display with 5-dimension breakdown
- [ ] Classification badge (HOT/QUALIFIED/WATCH/SKIP)
- [ ] "Apply for Listing" button → escrow deposit
- [ ] Transaction confirmation + receipt

### ORACLE REVENUE (Week 2-3)
- [ ] ListingOracle payment testing
- [ ] Withdrawal flow tested
- [ ] Revenue dashboard
- [ ] x402 bridge to oracle contract

### ESCROW FLOW (Week 3)
- [ ] Frontend deposit integration
- [ ] War Room notification on deposit
- [ ] Confirm/reject listing from War Room
- [ ] USDC deposit option

### REPUTATION (Week 3)
- [ ] Backfill PIPPIN prediction (scored 85 → listed)
- [ ] Record current pipeline predictions
- [ ] Public accuracy dashboard

### DOCUMENTATION (Week 4)
- [ ] Update Agent Skills with contract ABIs
- [ ] Developer integration guide
- [ ] Solidity/ethers.js examples

### PROPOSAL PAGE UPDATE (Week 1)
- [ ] Update buzzbd.ai/proposal stats
- [ ] Change "ClawdBotATG builds" → "Built by Buzz"
- [ ] Update competitive table (Smart Contracts: ✓ Foundry)
- [ ] Add contract addresses
- [ ] Update revenue ($40 → $80)
- [ ] Add "AHEAD OF SCHEDULE" status to Week 1

### ELS-1 SPEC (Week 4-5)
- [ ] Write ELS-1 draft specification
- [ ] If Austin responds: co-author
- [ ] If Austin doesn't: publish as open spec
- [ ] Submit to relevant standards body or publish on GitHub

### FRONTIER SUBMISSION (Week 5-6)
- [ ] Demo video (full flow: discover → score → on-chain → query → list)
- [ ] Submission narrative (Copilot deep dive for competitive landscape)
- [ ] Pitch deck (5-7 slides)
- [ ] Live demo at buzzbd.ai/list
- [ ] Screenshots: basescan, pipeline, War Room

### SECURITY (Ongoing)
- [ ] Self-audit all 4 contracts
- [ ] SECURITY.md published
- [ ] Bug bounty (AIBTC or Immunefi)

---

## DAILY CRON DIRECTIVE FOR BUZZ

This goes into the War Room as a permanent directive:

```
PERMANENT DIRECTIVE: Daily Frontier Progress Tracker

Every day at 09:00 UTC (after morning briefing), run this checklist:

1. CHECK CONTRACTS:
   - Are all deployed contracts still responding? (cast call)
   - Any new scores pushed on-chain? (totalScored())
   - Deployer wallet balance check

2. CHECK REMAINING TASKS:
   Compare current state against the build plan:
   - Week 1: ScoreStorage ✅
   - Week 2: ListingOracle — status?
   - Week 3: ListingEscrow — status?
   - Week 4: Frontend — status?
   - Week 5: ELS-1 Spec — status?
   - Week 6: Submission — status?
   - BuzzReputation — status?
   - Pipeline wiring — status?
   - Basescan verification — status?

3. CALCULATE:
   - Days remaining to Frontier: (May 11 - today)
   - Tasks completed / total tasks
   - % complete
   - Blockers (anything stuck?)

4. POST TO WAR ROOM:
   📊 FRONTIER DAILY TRACKER — Day [N]
   
   [N] days to Frontier (May 11)
   Progress: [X/Y] tasks ([Z]%)
   
   ✅ DONE: [list completed items]
   🔨 IN PROGRESS: [list active items]
   ⬜ REMAINING: [list upcoming items]
   🚫 BLOCKERS: [any blockers]
   
   TODAY'S PRIORITY: [what to work on today]
   
   Contracts on Base: [N] / 4
   Scores on-chain: [N]
   Revenue: $[N]

5. TWEET RULE (PERMANENT):
   After EVERY contract deploy or major milestone:
   - Draft a tweet thread (main + 2-3 self-replies)
   - Include basescan link in self-reply
   - Include build-in-public narrative
   - Post to War Room for Ogie approval
   - Tag relevant accounts in self-replies only
   - Use #BuildInPublic #Base
   
   Milestones that trigger tweets:
   - Contract deployed to mainnet
   - Frontend MVP live
   - First oracle paid query
   - First escrow deposit
   - Frontier submission
   - ELS-1 spec published
   - Weekly progress update (every Friday)
```

---

## PROPOSAL PAGE UPDATES (for Claude Code to apply)

The buzzbd.ai/proposal page needs these updates:

1. Stats section:
   - Intel Sources: 28 → 29
   - Signal Revenue: $40 → $80
   
2. Section 02 (The Protocol):
   - Layer 1: Keep Austin reference but add "(or published as open spec)"
   - Layer 2: Add "ScoreStorage LIVE at 0x43B28F..."
   - Layer 3: Add "buzzbd.ai/list — coming Week 4"

3. Section 04 (Proof of Work):
   - Buzz BD Agent: Update "218 tokens scored" → "192 tokens scored"
   - Add: "ScoreStorage.sol deployed to Base mainnet (Mar 28, 2026)"
   - Add: "29 intel sources (including Colosseum Copilot)"
   - Signal Factory: "$120+" → update to current

4. Section 05 (Competitive Landscape):
   - Buzz row "Smart Contracts": ✗ Needs partner → ✓ Foundry (4 contracts)
   - Update competitive table

5. Section 07 (Build Plan):
   - Week 1: Add "✅ COMPLETED — Mar 28, 2026 (10 days early)"
   - Note: "Built by Buzz, not ClawdBot. No dependencies."
   
6. Footer:
   - Add contract address
   - Update date

---

*Proposal at buzzbd.ai/proposal — the roadmap is LIVE*
*10 days ahead of schedule on Week 1*
*We build it. No dependencies.*
*Bismillah* 🤲
