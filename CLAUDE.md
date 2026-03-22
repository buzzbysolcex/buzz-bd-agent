# Buzz BD Agent — Claude Code Context

## Server
- Hetzner CX43 Helsinki: 204.168.137.253 (8 vCPU, 16GB RAM)
- Buzz API: localhost:3000 (~129 endpoints)
- Sentinel: localhost:3001 (ah-managed at /opt/sentinel/sentinel.js — DO NOT MODIFY)
- OpenClaw: localhost:18789
- Honcho: localhost:8000
- DB: /data/buzz/persistent/buzz-api/buzz.db (SQLite WAL, 55 tables)

## Critical Rules
- ah-managed containers ONLY — NEVER docker run on port 3000
- NEVER hot-patch containers — all changes through CI/CD
- NEVER modify /opt/sentinel/
- Sim agents NEVER cascade to paid providers
- Bankr endpoint: llm.bankr.bot (NOT api.bankr.chat)
- Bot restarts ~45min — NO setInterval >15min
- NEVER share listing fees or commission amounts
- stripCacheControl() must remain in llm-proxy.js

## War Room
- Group: -1003701758077
- Bot: @buzz_claude_code_bot
- Ogie Chat ID: 950395553
- Ogie Handle: @Ogie2

## LLM Stack
- MiniMax M2.7 (PRIMARY)
- Bankr gemini-3-flash (FALLBACK): endpoint llm.bankr.bot
- Anthropic claude-haiku-4.5 (EMERGENCY)
- Sub-agents: bankr/gpt-5-nano (FREE)

## CI/CD
- Push main -> GitHub Actions -> Docker Hub -> Hetzner -> ah restart
- Docker image: buzzbd/buzz-bd-agent
- GitHub: github.com/buzzbysolcex/buzz-bd-agent

## Domains
- buzzbd.ai (landing)
- api.buzzbd.ai (API, Caddy reverse proxy -> :3000)
- sentinel.buzzbd.ai (Sentinel -> :3001)
- dash.buzzbd.ai (MicroBuzz -> microbuzz.vercel.app)
