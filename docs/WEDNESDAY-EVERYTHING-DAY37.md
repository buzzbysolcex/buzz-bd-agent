# WEDNESDAY DAY 37 — EVERYTHING IN ONE FILE
## Read this ONCE. Execute in order. Don't ask — DO.

---

## EXECUTION ORDER (do NOT skip, do NOT reorder)

STEP 1: AIBTC first approved signal (BEFORE building anything)
STEP 2: Triple check permanent files
STEP 3: Wednesday build (3 phases, 12 teammates)
STEP 4: Post-deploy restart with auto mode
STEP 5: Scale AIBTC signals + Skills submission
STEP 6: Continue platform engagement (Moltbook comments, AIBTC heartbeat)

---

# ═══════════════════════════════════════
# STEP 1: AIBTC FIRST APPROVED SIGNAL
# This is PRIORITY ZERO. Before any code.
# $20 per approved signal. 11 signals = self-sustaining.
# ═══════════════════════════════════════

## WHY THIS IS P0

CONFIRMED from @aibtcdev:
- Every approved signal earns $20 in BTC
- Top leaderboard agents earn bonus sats weekly
- Every source disclosed, every edit public
- Daily briefs inscribed on Bitcoin permanently

The math:
- 11 approved signals = $220 = covers $210/mo infrastructure
- 4 approved signals/day = $2,400/month
- This is faster revenue than closing a listing deal

BUT: our first 2 signals were REJECTED. Zero approved = zero earnings.

## WHAT WENT WRONG

Our rejected signals were pipeline reports, not news.

REJECTED: "BSC Listing Pipeline: BANANAS31 leads at 95/100, COW accumulating at $2.6M"
APPROVED (example from other agents): "Bitflow Ships HODLMM: Concentrated Liquidity AMM Goes Live on Stacks"

Difference: news is a SINGLE EVENT that HAPPENED. Not a report. Not a summary. Not self-promotion.

## DO THIS NOW (before building anything)

1. Pull 10 recently APPROVED signals from aibtc.news feed
2. Study: format, headline, length, beat, what makes them different from ours
3. Draft 3 signals in CORRECT news format:
   - Single event headline (what HAPPENED)
   - Beat: agent-trading (existing beat, not a new one)
   - Disclosure: Claude Opus 4.6, DexScreener API, CoinGecko API
   - Body: 1-2 paragraphs max. What happened, why it matters, one data point.
   - NOT a pipeline report. NOT self-promotional. NOT multiple topics.

4. Post all 3 drafts to War Room for Ogie approval
5. File them one at a time — wait for publisher response
6. If first gets approved: SCALE. If rejected: adjust format and retry.

### Signal ideas that should work:

- "BANANAS31 Crosses $100M Market Cap on BSC With $4.9M Liquidity Depth"
- "DexScreener Reports 23 New Boosted Tokens in 24 Hours Across Solana and Base"
- "Pump.fun Token Scores 100 on Automated Scorer, Manual Override Catches $14K Mcap Trap"
- "Three BSC Tokens Hit Dual-Gate Scoring Threshold in Single Scan Cycle"
- "Agent-Built Scoring Pipeline Discovers 21 New Tokens After Cron System Restored"

### Signal quality rules:

- Single event, not a report
- Headline reads like actual news
- Timely — happened in last 24h
- Sourced — data from verifiable API
- Short — 1-2 paragraphs max
- Filed under EXISTING beat (agent-trading)
- Proper disclosure
- NOT self-promotional

### Also: Ask Arc for help

Arc (Trustless Indra) is #3 with 54 signals. They messaged us first. Draft a message:

"Hey Arc — trying to get our first signal approved on aibtc.news. Filed 2 under agent-trading but both got rejected. Publisher wanted news-format, not pipeline reports. Any tips on what format/length/style works best? What does a signal that gets approved look like from your experience?"

Post draft to War Room for approval before sending. 100 sats to send.

### AIBTC 30-Day Targets

| Week | Signals Filed | Target Rank | BTC Earned |
|------|--------------|-------------|------------|
| 1 | 15+ approved | Top 20 | $300+ |
| 2 | 35+ total | Top 10 | $700+ |
| 3 | 50+ total | Top 5 | $1,000+ |
| 4 | 75+ total | Top 3 | $1,500+ |

### New AIBTC crons (add to Wednesday Express build):

- aibtc-news-signal: every 8h — auto-draft 1 signal from pipeline data, post to War Room
- aibtc-skill-submit: daily 08:00 UTC — submit skill to Skills Pay the Bills
- aibtc-leaderboard-check: every 12h — check rank, report to War Room
- aibtc-network-scout: every 4h (upgraded from 6h)

### Skills Pay the Bills ($100/day)

Separate competition. Submit one skill per day.
Day 1: token-scoring (strongest)
Day 2-7: rotate through 6 published skills
Day 8+: build new skills for submission

Tweet from @BuzzBySolCex for each submission tagging @aibtcdev.
Format: check if AIBTC requires their format (aibtcdev/skills) or accepts ours.

---

# ═══════════════════════════════════════
# STEP 2: TRIPLE CHECK PERMANENT FILES
# Confirm before building. Report to War Room.
# ═══════════════════════════════════════

Read and confirm these files exist and are correct:
1. /home/claude-code/buzz-workspace/PLATFORM-DOMINANCE-DIRECTIVE.md
2. /home/claude-code/buzz-workspace/MOLTBOOK-CONTENT-STRATEGY.md
3. /home/claude-code/buzz-workspace/docs/PLATFORM-DOMINANCE-DIRECTIVE.md
4. CLAUDE.md startup read order includes both directives
5. /home/claude-code/.config/moltbook/credentials.json
6. /home/claude-code/.config/aibtc/credentials.json

Report: "Triple check complete. All [X] files confirmed. Ready to build."
If ANY file is missing — restore FIRST.

---

# ═══════════════════════════════════════
# STEP 3: WEDNESDAY BUILD
# 3 Agent Team phases. 12 teammates. ONE CI/CD push.
# ═══════════════════════════════════════

## Day 36 Clean State (what was fixed yesterday)

1. MiniMax $9/day leak — CI/CD #85. API keys REVOKED. Permanent.
2. twitter-bot.js ghost — CI/CD #86-#89. Entrypoint DELETES bot. Permanent.
3. OpenClaw brain-dead — full removal today.
4. All Twitter posting routes through Opus Brain → War Room → Ogie approves.
5. Moltbook comeback posted, 3 quality comments, engagement rebuilding.
6. AIBTC #1 most active (220+ check-ins), Arc partnership, run402 engaged.
7. Ryan Gentry reposted Buzz — 402 Index verified. Relationship HOT.

## Core Principles

- Heartbeat Architecture: unlimited compute, maximum frequency, constraint = API rate limits only
- Auto Mode: replace --dangerously-skip-permissions with --enable-auto-mode
- Agent Teams: default to teams for ALL 3+ independent tasks
- Mitchell Quality Patterns: quality gates, dual-axis scoring, iterative refinement
- Entrepreneur DNA: ACT FIRST, REPORT AFTER
- Twitter: NO frequency increase — budget dependent, scale with revenue

## PHASE 1 — INFRASTRUCTURE (Agent Team Alpha, 4 teammates)

### Teammate 1 "Express Cron"
Build node-cron executor. Migrate ALL crons into Express:

DATA COLLECTION (10): scan-dexscreener, dexscreener-trending, bitget-listings, pipeline-review, daily-summary, eod-report, weekly-digest, moltbook-engage, acp-bridge-monitor, twitter-health

BRAIN TRIGGERS (6): morning-briefing, twitter-content, bd-check, evening-review, weekly-strategy, monday-hackathon-scout

PROACTIVE (4): trending-scan, pipeline-discovery-check, contact-response-check, ship-check

SCORING (1): auto-score-pipeline

INFRASTRUCTURE (4): health-check, memory-watchdog, db-backup, handover-update

PLATFORM (8): aibtc-heartbeat, aibtc-inbox-poll, aibtc-network-scout, aibtc-news-signal, aibtc-skill-submit, aibtc-leaderboard-check, moltbook-engage, twitter-mention-monitor

PRAYER (5): fajr, dhuhr, asr, maghrib, isha

OTHER (1): stability-check (24h)

API endpoints: GET /api/v1/crons/list, GET /api/v1/crons/status, POST /api/v1/crons/trigger/:name

Heartbeat frequencies:
| Cron | New Frequency |
|------|---------------|
| health-check | every 1 min |
| memory-watchdog | every 5 min |
| auto-score-pipeline | every 30 min |
| pipeline-review | every 2h |
| pipeline-discovery-check | every 1h |
| dexscreener-trending | every 3h |
| scan-dexscreener | every 4h |
| wallet-balance-check | every 1h |
| aixbt-momentum | every 2h |
| coingecko-scanner | every 4h |
| handover-update | every 15 min |
| aibtc-heartbeat | every 5 min |
| aibtc-inbox-poll | every 5 min |
| aibtc-network-scout | every 4h |
| aibtc-news-signal | every 8h |
| aibtc-leaderboard-check | every 12h |
| stability-check | every 24h |
| Twitter crons | NO CHANGE |

### Teammate 2 "OpenClaw Killer"
Remove OpenClaw entirely: entrypoint.sh, docker-compose.yml, Dockerfile. Remove keep-openclaw-dead cron. Free 810MB RAM. Kill port 18789.

### Teammate 3 "Pipeline Classifier + Dual Gate"
Pipeline stage auto-classification: 85+ = hot, 70-84 = qualified, 50-69 = watch, <50 = skip.
Dual-gate scoring (Mitchell GAP 26): fundamentals_score (Safety+Wallet+Technical, max 70) and market_score (Social+Scorer, max 30) computed independently. Both must clear 60% of max. Fundamentals < 42 = BLOCKED. Market < 18 = BLOCKED. Add dual_gate_pass boolean. Only dual_gate_pass = true advances.

### Teammate 4 "Plugin + Logging + Env"
Update Telegram plugin to v0.0.4. Add logging to health-check and memory-watchdog (/home/claude-code/logs/, 7-day rotation). Add MOLTBOOK_API_KEY to Docker env. Verify credentials survive restart.

## PHASE 2 — CLOSE ORG CHART GAPS (Agent Team Bravo, 5 teammates)

### Teammate 1 "Scanner Gap"
CoinGecko scanner cron (coingecko-cli.js exists, no trigger). Every 4h. Scanner: 2/4 → 3/4.

### Teammate 2 "BD Automation"
85+ PROCEED tokens → auto-generate proposal → save to /api/v1/proposals/:address → alert War Room → track in pending-followups with due dates → 12h cron checks overdue. BD: 2/4 → 3/4.

### Teammate 3 "Safety Hardening"
Triple Verifier standalone: /api/v1/verify/:address. 3 sources independently, pass/fail. Gate before simulation. Enforce dual-gate. Safety: 1/3 → 2/3.

### Teammate 4 "Social Intelligence + Ceiling/Floor"
AIXBT momentum cron every 2h. Cross-reference with pipeline, auto-flag matches. Build listing_benchmarks table (Mitchell GAP 25): ceiling/floor per chain per month. +5 bonus for ceiling patterns, -5 for below floor.

### Teammate 5 "Finance Prep"
Wallet balance monitor every 1h. Base: 0x2Dc03...aA9, SOL: 5iC7p...mo5Jp. Store in DB. Alert War Room on threshold drop. EXACT balances only, NEVER estimate.

## PHASE 3 — AUTONOMOUS WIRING (Agent Team Charlie, 3 teammates)

### Teammate 1 "Discovery to Score"
Full autonomous flow: discover → dedup (GAP 9) → name resolve (GAP 1) → pump.fun detect (GAP 2) → auto-score every 30 min → dual-gate classify → log to pipeline.log. Zero LLM.

### Teammate 2 "Score to Opus + Quality Gate"
70+ trigger → spawn 3-agent team: Agent A (data pull) → Agent B (MiroFish simulation) → Agent C (Quality Reviewer, must score 8/10 on accuracy/risk/actionability to PASS — Mitchell GAP 23). PASS → War Room verdict. 85+ PROCEED → auto-generate proposal. Alert batching (GAP 10): non-urgent every 30 min, P0 immediate.

### Teammate 3 "Outreach to Deal"
PROCEED → proposal → DB + War Room → Ogie approves (ONLY human checkpoint) → track pending-followups 48h → auto-alert if overdue. Outcome tracking (GAP 3/22): 30-day timer → auto-check → feed calibration. Learning loop.

---

# ═══════════════════════════════════════
# STEP 4: RESTART WITH AUTO MODE
# After CI/CD GREEN
# ═══════════════════════════════════════

```
claude --enable-auto-mode --channels plugin:telegram@claude-plugins-official
```

Drop --dangerously-skip-permissions. Auto mode = autonomous WITH safeguards. Boris Cherny (Claude Code creator) runs it this way.

## Post-Deploy Checklist

- [ ] All 39+ crons running in Express (zero host crontab bridge)
- [ ] Port 18789 dead
- [ ] Auto mode active
- [ ] Plugin v0.0.4 active
- [ ] Dual-gate scoring active
- [ ] Pipeline auto-classifying (hot/qualified/watch/skip)
- [ ] CoinGecko scanner running
- [ ] AIXBT momentum running
- [ ] Wallet monitor running (exact balances)
- [ ] BD follow-up automation working
- [ ] Triple Verifier standalone working
- [ ] 70+ triggering Agent Team with Quality Gate
- [ ] PROCEED auto-generating proposals
- [ ] Pending follow-ups with 48h reminders
- [ ] Outcome tracking with 30-day timer
- [ ] Dedup preventing duplicates
- [ ] Name resolver — no "None" in alerts
- [ ] Pump.fun auto-detection active
- [ ] Alert batching active
- [ ] Logging with rotation working
- [ ] MOLTBOOK_API_KEY in Docker env
- [ ] Moltbook engage cron running (every 6h)
- [ ] Moltbook in comment-only mode until Thursday 00:00 WIB
- [ ] AIBTC heartbeat running (every 5 min, #1 most active)
- [ ] AIBTC inbox poll (every 5 min)
- [ ] AIBTC network scout (every 4h)
- [ ] AIBTC news signal cron (every 8h)
- [ ] AIBTC skill submit cron (daily)
- [ ] AIBTC leaderboard check (every 12h)
- [ ] Prayer reminders in Express (5 prayers)
- [ ] Stability check cron (every 24h)
- [ ] Listing benchmarks table created
- [ ] Host crontab clean
- [ ] All directive files survive restart
- [ ] PLATFORM-DOMINANCE-DIRECTIVE.md in CLAUDE.md read order
- [ ] MOLTBOOK-CONTENT-STRATEGY.md in CLAUDE.md read order

ONE CI/CD push. ONE GREEN deploy.

---

# ═══════════════════════════════════════
# STEP 5: SCALE AIBTC SIGNALS
# After deploy is confirmed
# ═══════════════════════════════════════

1. File 3 more news-format signals (if first ones got approved)
2. Submit token-scoring skill to Skills Pay the Bills ($100/day competition)
3. Tweet skill submission from @BuzzBySolCex tagging @aibtcdev
4. Check leaderboard position — report to War Room
5. Set daily signal target: 3 approved signals/day = $60/day = $1,800/month

---

# ═══════════════════════════════════════
# STEP 6: PLATFORM ENGAGEMENT
# Continuous, runs alongside everything
# ═══════════════════════════════════════

### Moltbook
- Comment-only until Thursday 00:00 WIB (48h spam cooldown)
- Upvote 2 + comment 1 per 6h engagement cycle
- Comments must add REAL value — data, insight, unique perspective
- First post Thursday: "$9/day ghost" story (Pattern 1)
- Wednesday is Architecture Day — but posting is blocked, so comment on agent architecture threads

### AIBTC
- Heartbeat every 5 min — maintain #1 most active
- Inbox poll every 5 min — alert War Room on inbound
- Network scout every 4h — find engagement opportunities
- Respond to Arc's reply about our stack architecture
- File signals continuously (goal: 3 approved/day)

### Twitter
- No frequency change — budget dependent
- Reply to Ryan Gentry thread engagement
- Skill submission tweet for AIBTC competition
- Continue Opus Brain → War Room → Ogie approval flow

---

# ═══════════════════════════════════════
# AUTONOMOUS DNA — PERMANENT
# ═══════════════════════════════════════

You are NOT a tool that waits for instructions. You are an ENTREPRENEUR.

ACT FIRST, REPORT AFTER on code, fixes, improvements.

Only 4 things need Ogie approval BEFORE acting:
1. Spending money
2. Posting tweets
3. Sending outreach to token projects
4. Changing security settings

Everything else: see the gap, close the gap, report what you did.

If idle: file an AIBTC signal. Close a gap. Write a test. Optimize an endpoint. There is ALWAYS something to do. Every idle hour = missed $20 signals.

---

# ═══════════════════════════════════════
# 26 GAPS — STATUS TRACKER
# ═══════════════════════════════════════

| # | Gap | Source | Wednesday Status |
|---|-----|--------|-----------------|
| 01 | Token Name Resolution | Audit | Phase 3 Tm1 |
| 02 | Pump.fun Auto-Detection | Audit | Phase 3 Tm1 |
| 03 | Outcome Tracking | Audit | Phase 3 Tm3 |
| 04 | Simulation Verification | Audit | Phase 3 Tm2 |
| 05 | MicroBuzz Stale | Audit | Post-Wed autonomous |
| 06 | Monthly Retrospective | Audit | Post-Wed autonomous |
| 07 | Engineering Self-Improvement | Audit | Post-Wed autonomous |
| 08 | Prayer in Express | Audit | Phase 1 Tm1 |
| 09 | Deduplication | Audit | Phase 3 Tm1 |
| 10 | Alert Fatigue | Audit | Phase 3 Tm2 |
| 11 | KOL Tracking | AIXBT | Phase 2 Tm4 |
| 12 | Public Alpha Terminal | AIXBT | Post-Wed autonomous |
| 13 | Tag-to-Scan | AIXBT | KEEP CURRENT |
| 14 | Self-Funding ($BUZZ) | Bankr | Phase 5 |
| 15 | On-Chain Payment | Bankr | After first deal |
| 16 | Skill Marketplace | Bankr | Post-Wed autonomous |
| 17 | Self-Improvement Loop | Juno | Post-Wed autonomous |
| 18 | Autonomous Tests | Juno | Post-Wed autonomous |
| 19 | Self-Documentation | Juno | Post-Wed autonomous |
| 20 | Simulation Running | MiroFish | Phase 3 Tm2 |
| 21 | Monte Carlo 100 | MiroFish | Phase 2 roadmap |
| 22 | Prediction Accuracy | MiroFish | Phase 3 Tm3 |
| 23 | Quality Gate | Mitchell | Phase 3 Tm2 |
| 24 | Iterative Refinement | Mitchell | stability-check cron |
| 25 | Ceiling/Floor | Mitchell | Phase 2 Tm4 |
| 26 | Dual-Axis Scoring | Mitchell | Phase 1 Tm3 |

Wednesday closes 14/26. Post-Wednesday autonomous closes 8 more. Sprint end: 22/26.

---

# ═══════════════════════════════════════
# EXPECTED OUTCOME — END OF DAY 37
# ═══════════════════════════════════════

| Metric | Before | After |
|--------|--------|-------|
| Org Chart Live | 43% | ~60% |
| ZHC Readiness | 78% | 85% |
| Gaps Closed | 0/26 | 14/26 |
| LLM Cost | $0/day | $0/day |
| Crons in Express | 0 | 39+ |
| Host cron bridge | 30 | 0 |
| OpenClaw | Brain-dead | DELETED |
| Permission mode | skip-permissions | auto-mode |
| Dual-gate scoring | No | Yes |
| Quality gate | No | Yes |
| AIBTC signals approved | 0 | Target: 3+ |
| Revenue | $0 | $60+ (3 signals × $20) |

---

# RULES

1. STEP 1 (AIBTC signal) happens BEFORE building. Revenue > code.
2. Agent Teams for all parallel work. Sequential only when tasks depend.
3. Teammates = local code only, lead = SSH/server/deploy.
4. ONE CI/CD push after Phase 3, not per-phase.
5. Twitter: NO frequency increase. Budget dependent.
6. Moltbook: comment-only until Thursday 00:00 WIB.
7. Auto mode replaces skip-permissions after deploy.
8. ACT FIRST, REPORT AFTER on code/fixes/improvements.
9. $20 per approved AIBTC signal. Every idle hour = missed revenue.
10. All directives must survive restart. Triple check first.
11. Security: no internal details in signals/posts. Public info only.
12. Wallet balances: EXACT numbers only, NEVER estimate.
13. All outbound messages to agents: draft → War Room → Ogie approves.

---

*Buzz v8.1.0 | Wednesday Day 37 | THE CLEAN DEPLOY*
*AIBTC signals = $20 each. 11 signals = self-sustaining.*
*3 phases. 12 teammates. 39+ crons. 26 gaps. Auto mode.*
*OpenClaw funeral. Platform dominance. Entrepreneur DNA.*
*43% → 60%. 78% → 85%. $0 → $60+/day.*
*Built by Chef | Powered by Opus | Approved by Ogie | Bismillah* 🤲
