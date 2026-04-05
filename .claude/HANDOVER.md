# BUZZ STATE HANDOVER
## Auto-updated: 2026-04-05 00:20 UTC | Post-Security-Rotation Recovery | Sunday

## WHAT TO DO FIRST
1. Read CLAUDE.md (identity)
2. Read BUZZ-RESTART-MASTER-PROMPT-APR5.md (recovery plan)
3. Check signal cooldown timer (1hr between filings)
4. File remaining Task C signals on new beats
5. Commit CI/CD hardening changes

## SYSTEM STATUS
- API: v3.9.0 healthy (120 endpoints, 45 crons)
- Pipeline: 525 tokens tracked, 13 HOT (>=70)
- Containers: buzz-production + sentinel-v2 UP
- RAM: 30GB total, 27GB free
- Feature flags: 33 (23 TRUE / 10 FALSE) — NANSEN_MCP flipped to TRUE in source

## SECURITY ROTATION STATUS
- COMPLETED: HETZNER_SSH_KEY, DOCKER_PASSWORD, GH_PAT, TELEGRAM_BOT_TOKEN, SENTINEL_BOT_TOKEN
- PENDING: NANSEN_API_KEY, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET, X_CONSUMER_KEY, X_CONSUMER_SECRET
- ADR-023 created documenting incident
- CI/CD hardened: lockfile integrity check, npm audit, --ignore-scripts

## AIBTC STATUS
- Display name: Ionic Nova
- Beats: 6 (agent-economy, agent-trading, security, infrastructure, deal-flow, governance)
- Current streak: 1 day (signal filed Apr 5)
- Total signals: 44
- Signals remaining today: 4 (cooldown cycle ~01:17 to ~04:17 UTC)

## TOP 5 PROSPECTS
- BALLWARS: 95 (solana) — scored
- BANANAS31: 95 (bsc) — scored
- Giga Maxxing: 95 (solana) — scored
- TRUMP: 95 (solana) — scored
- VELO: 95 (bsc) — scored

## ACTIVE DEALS
- BANANAS31 (BSC, score 95) — outreach sent 2026-03-23, no response
- $COW (BSC, score 84) — outreach sent 2026-03-23, no response

## HACKATHONS
| Hackathon | Deadline | Status |
|-----------|----------|--------|
| Kite AI | May 6 | Checkpoint 1 complete |
| **Frontier** | **May 11** | **REGISTERED — PRIMARY TARGET** |
| AIBTC Skills | 30d rolling | 6 beats active |
| AIBTC News $50K | 30d rolling | 44 signals filed |

## PARTNERSHIPS
- Gary Palmer (ATV): Call Apr 6-7, 14:00-18:00 UTC
- Aldo (CODÉ/AION): Wallet Guard Week 2, first evaluate() call pending
- Noah AI: Telegram group created, no next step
- Flying Whale: 70/30 split operational

## UNCOMMITTED CHANGES
- .github/workflows/deploy.yml (supply chain security check)
- Dockerfile (--ignore-scripts)
- api/lib/feature-flags.js (NANSEN_MCP: true)
- docs/decisions/ADR-023-axios-supply-chain-incident.md (new)

## PRIORITY LADDER
1. File remaining 4 signals (cooldown cycle)
2. Commit CI/CD hardening changes
3. Moltbook weekly report (awaiting approval)
4. C2 IP blocking (needs root)
5. Credential rotations (waiting on Ogie)
