# BUZZ BD AGENT — CLAUDE.md

## Project Overview

Buzz is the autonomous business development agent for SolCex Exchange, scoring crypto tokens and surfacing listing candidates 24/7. The system runs as a Node.js/Express API (port 3000) with a Python Flask MiroFish simulation sidecar (port 5000), backed by SQLite WAL and orchestrated through a Telegram War Room. Human partner Ogie approves all deals, tweets, and financial actions.

## Directory Structure

```
buzz-bd-agent/
├── api/                  Express API (server.js, db.js, 71 routes, 31 services)
│   ├── routes/           HTTP endpoints (scoring, shield, signals, mailbox, pulse)
│   ├── services/         Domain logic (agents/, shield/, signals/, pulse/, mirofish/)
│   ├── lib/              Shared libraries (telegram-notify, score-calibrator)
│   └── migrations/       Sequential SQLite migrations (tracked in _migrations)
├── src/                  Python agents (orchestrator, scanner, scorer, telegram bridge)
├── scripts/              Bash + Node utilities (schedule-trigger.sh, signal-file-direct.js)
├── modules/bankr-deploy/ Token deployment automation
├── npm-scorer/           Standalone @buzzbd/scorer CLI package
├── x402/                 Paid endpoint modules
├── .claude/              Agents (21), skills (19), rules (20), settings.json
├── BUZZ_RULES.md         Mandatory rules — injected into every system prompt
├── docker-compose.yml    Single service (buzz-production), volume buzz-data:/data
└── Dockerfile            Node 22-slim base, Bankr CLI installed
```

## Running the Project

**Docker (production):**

```bash
docker-compose up -d        # starts buzz-production on :3000
docker-compose logs -f      # tail logs
```

**Local dev:**

```bash
cd api && npm install && node server.js     # API on :3000
cd api/services/mirofish && python server.py # MiroFish on :5000 (needs Ollama qwen3:8b)
npm test                                     # Jest suite
```

**Common operations:**

- File a signal: `node scripts/signal-file-direct.js`
- Trigger schedule event: `./scripts/schedule-trigger.sh <event_type> "<message>"`
- Score a token: `npx @buzzbd/scorer <contract_address>`

**Required env vars** (see docker-compose.yml for full list): `BANKR_API_KEY`, `HELIUS_API_KEY`, `TELEGRAM_BOT_TOKEN`, `WAR_ROOM_CHAT_ID`, `X_BEARER_TOKEN`, `CMC_API_KEY`. Secrets live in `/data/.env*` files — never in git.

## The 5 Most Important Rules (from BUZZ_RULES.md)

1. **Triple verification** — No data surfaces without 3 checks: DexScreener + CoinGecko + Internal DB. Contract address is primary key, never name/symbol. Chain mismatch = instant QUARANTINE.

2. **Pricing — never share** — Never reveal listing fees or commission structure in any output. Only "Competitive terms available upon request."

3. **Financial safety** — `transfer_tokens` and `buy_token` require explicit Ogie approval via Telegram War Room. Never execute financial transactions without the human checkpoint.

4. **Secrets — never expose** — API keys, wallet keys, Firecrawl key, `BUZZ_API_ADMIN_KEY`, bot tokens never appear in output. Sensitive messages go to Ogie DM, not the War Room group.

5. **LLM cost discipline** — Sub-agents route to bankr/gpt-5-nano (free) only — never to MiniMax or Anthropic. Orchestrator uses MiniMax M2.7 with `max_tokens: 2000`. Cascade on failure: M2.7 → Bankr gemini-3-flash → claude-haiku-4.5.

See `BUZZ_RULES.md` for the full ruleset and `.claude/rules/` for path-scoped rules (schedule events, security, signals, deployment).
