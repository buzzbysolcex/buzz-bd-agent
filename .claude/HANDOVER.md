# BUZZ STATE HANDOVER
## Updated: 2026-03-30 13:00 UTC | Day 42 | Sunday

## WHAT TO DO FIRST
1. Read CLAUDE.md (identity — v8.3.0)
2. Read BUZZ-ZHC-HANDOVER-v3.md (the genome)
3. Read docs/POST-SPRINT-MASTER-STRATEGY.md
4. Check this file for current state
5. Do NOT tweet, file signals, or run crons until state is verified

## SYSTEM STATUS
- Server: Hetzner CPX62 (16 vCPU, 32GB RAM, $42.99/mo) — upgraded from CX43 on Day 42
- API: buzz-production UP, port 3000 + 18789
- Sentinel: sentinel-v2 UP
- Pipeline: 342 tokens total (338 active, 4 rejected)
- Scored: 338 tokens, 0 HOT, highest score 49
- Revenue: $200+ (8 AIBTC brief inclusions)
- Signal streak: Day 7
- CI/CD: #113 GREEN (agent discovery deploy)
- getprobe.xyz: 62/100, #3 globally on agent compliance leaderboard

## SCORING STATE (HONEST)
- 0 tokens at 70+ (HOT) — CORRECT
- 5 tokens at 49 (WATCH ceiling): BANANAS31, TRUMP, VELO, wkeyDAO2, PIPPIN
- All scores calibrated with 8 BD Screening Rules + dual-gate enforcement
- Tokens without score_breakdown capped at 49 (dual-gate can't verify)
- EURC rejected (stablecoin), MUSK placeholder rejected, phantom PIPPIN rejected

## ARCHITECTURE
- 15 persistent agents (.claude/agents/)
- 11 skills (.claude/skills/)
- 9 rules (.claude/rules/)
- 9 ADRs (docs/decisions/)
- 4 smart contracts on Base (ScoreStorage, ListingOracle, ListingEscrow, BuzzReputation)
- ARIA v2 LIVE (4 sources, 06:00 UTC cron)
- HeyAnon MCP (#30) + Phantom MCP (#31) — 31 intel sources total
- 120 API endpoints, SQLite WAL, 42 cron jobs

## AIBTC LEADERBOARD
- Position: #8 (Ionic Nova)
- Score: 325 pts
- Brief inclusions: 8
- Signals filed: 25
- Inclusion rate: 32% (target: 60%+)
- Streak: 7 days
- Beat priority: agent-trading > infrastructure > deal-flow

## PENDING FOLLOW-UPS
- BANANAS31: no_response (overdue since 2026-03-25)
- $COW: no_response (overdue since 2026-03-25)
- ELS-1_SPEC: warm_interested (due today 2026-03-30)

## ACTIVE BD
- BANANAS31 (BSC, score 49 post-calibration) — outreach sent 2026-03-23
- $COW (BSC, score 10 post-calibration) — outreach sent 2026-03-23
- Tom Osman DM'd — creating bot-only channel in IZHC
- H₿ (TTC.Box) — x402 integration discussion live

## WALLET STATUS
- Lobster wallet: DEAD (private key wiped) — DO NOT USE
- HeyAnon SOL: BNS48CGg2mgP7sdBY4VVTiDyK6jVqRBi9Y71jqhxZn9A (for Solana ops)

## TODAY'S SHIPS (Day 42, before reboot)
1. CI/CD #112: social scoring bug fix
2. CI/CD #113: agent discovery (agent.json, ai-plugin, x402, llms.txt, security.txt, robots.txt, privacy, health)
3. getprobe.xyz: 37→62, #3 on agent compliance leaderboard
4. Tom Osman DM — bot-only channel
5. H₿ (TTC.Box) — x402 discussion
6. Signal filed (Day 7 streak)
7. Server upgraded CX43→CPX62

## HACKATHONS
| Hackathon | Deadline | Status |
|-----------|----------|--------|
| Synthesis | Mar 23 | Submitted, in judging |
| X Layer | Mar 26 | buzz-x402 live |
| Solana x402 | Mar 27 | Active |
| AIBTC Skills | 30d rolling | token-scoring skill |
| AIBTC News $50K | 30d rolling | Reporter active, streak Day 7 |
| Bitflow DeFi | 30d, $100/day | Evaluate HODLMM |
| **Frontier** | **May 11** | **REGISTERED — PRIMARY TARGET** |

## PRIORITY LADDER
1. Urgent tasks (deal responses, security, deadlines)
2. Scheduled tasks (briefings, reviews)
3. Creative output (Sunday = Weekly Intelligence Report)
4. Proactive scouting (trending, hackathons, partnerships)
5. Self-improvement (bugs, code, skills)

## RULES (NON-NEGOTIABLE)
- 0 HOT is CORRECT — honest scoring
- Lobster wallet is DEAD — never use
- Never reveal server IP publicly
- All tweets → War Room → Ogie approves
- All deals → Ogie approves
- Never rush Ogie
