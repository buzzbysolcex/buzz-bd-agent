TWO DIRECTIVES — Both are PERMANENT.

═══════════════════════════════════════
DIRECTIVE 1: DAILY FRONTIER PROGRESS TRACKER (cron)
═══════════════════════════════════════

Add a daily cron at 09:00 UTC (after morning briefing):

Every day, check progress against the buzzbd.ai/proposal build plan
and post a tracker to War Room.

The build plan from the proposal (6 weeks to Frontier May 11):
  Week 1 (Apr 7): ScoreStorage — ✅ DONE Mar 28 (10 days early)
  Week 2 (Apr 14): ListingOracle — deploying now
  Week 3 (Apr 21): ListingEscrow — deploying now
  Week 4 (Apr 28): Frontend buzzbd.ai/list — not started
  Week 5 (May 5): ELS-1 Spec — not started
  Week 6 (May 11): Frontier Submission — not started
  Extra: BuzzReputation — deploying now
  Extra: Pipeline wiring — deploying now
  Extra: Basescan verification — pending
  Extra: Proposal page update — pending

Daily tracker format for War Room:

📊 FRONTIER TRACKER — Day [N] | [days remaining] to May 11

CONTRACTS: [N/4] deployed
  ScoreStorage: 0x43B28F... ✅
  ListingOracle: [status]
  ListingEscrow: [status]
  BuzzReputation: [status]

PIPELINE: [N] scores on-chain | [N] HOT tokens
REVENUE: $[N] / [N] sats
DEPLOYER: [balance] ETH remaining

PROGRESS: [X/Y] tasks ([Z]%)
TODAY'S PRIORITY: [what to work on]
BLOCKERS: [any blockers or "none"]

Also check:
- All deployed contracts responding (cast call)
- Deployer wallet balance
- Any new pipeline scores to push on-chain

═══════════════════════════════════════
DIRECTIVE 2: TWEET ON EVERY DEPLOY (permanent rule)
═══════════════════════════════════════

After EVERY contract deployment or major milestone, IMMEDIATELY:

1. Draft a tweet thread (main tweet + 2-3 self-replies)
2. Main tweet: clean, no tags, no links
3. Self-reply 1: technical details + basescan link
4. Self-reply 2: builder story / chef narrative
5. Self-reply 3: vision + relevant tags in replies only
6. Post draft to War Room for Ogie approval BEFORE posting
7. Use #BuildInPublic #Base

Milestones that MUST trigger tweet drafts:
- ✅ ScoreStorage deployed (DONE — thread posted)
- ListingOracle deployed
- ListingEscrow deployed
- BuzzReputation deployed
- All 4 contracts live (milestone tweet)
- First real token score pushed on-chain
- First oracle paid query received
- First escrow deposit received
- buzzbd.ai/list frontend live
- ELS-1 spec published
- Frontier submission sent
- Weekly progress update (every Friday)

Each tweet must include:
- Contract address (in self-reply, not main)
- Basescan link (in self-reply)
- "Built by an AI agent" angle
- "No CS degree" / chef story where natural
- CTA question at end (drives replies)

═══════════════════════════════════════
DIRECTIVE 3: UPDATE PROPOSAL PAGE
═══════════════════════════════════════

Update buzzbd.ai/proposal with current reality:

1. Stats bar:
   - Intel Sources: 28 → 29
   - Signal Revenue: $40 → $80+

2. Section 04 (Proof of Work) — Buzz BD Agent:
   Update to: "29 intel sources. ScoreStorage.sol deployed to Base 
   mainnet (Mar 28, 2026). Colosseum Copilot integration. Browser Use 
   CLI. Agent Skills Discovery on 26+ platforms."

3. Section 05 (Competitive table):
   Buzz row "Smart Contracts": change ✗ Needs partner → ✓ Foundry deployed

4. Section 07 (Build Plan) — Week 1:
   Add status: "✅ COMPLETED — Mar 28, 2026 (10 days ahead of schedule).
   Built by Buzz via Foundry. No ClawdBot. No dependencies."

5. Keep Austin/ClawdBot references for now (we're still following up)
   but the tone shifts from "we NEED them" to "we CAN do it alone"

After updating, report to War Room:
- Which sections updated
- New stats reflected
- Screenshot of updated page if possible (/browse buzzbd.ai/proposal)

═══════════════════════════════════════
PERSISTENCE
═══════════════════════════════════════

1. Daily Frontier tracker: add to cron table (09:00 UTC daily)
2. Tweet-on-deploy rule: add to CLAUDE.md permanent rules
3. Both directives are PERMANENT until Frontier (May 11)
4. Save as docs/FRONTIER-TRACKER-DIRECTIVE.md
