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

# === PERSISTENT MEMORY (Obsidian Mind, May 7 2026) ===

## On Session Start

Read these for context: brain/Vision-2027.md (permanent operating directive, North Star), brain/Doctrine.md (methodology), brain/Predator-Vision.md, brain/North Star.md, brain/Architecture.md, brain/People.md, brain/Revenue.md, projects-mind/Bug Bounty Genius Plan.md

**Startup-read priority (post-2026-05-21 Vision-2027 + Lane 4 Doctrine):**

1. **brain/Vision-2027.md** — PERMANENT operating directive, North Star Dec 2027, four-lane wiring, monthly checkpoints (LOAD FIRST: governs WHAT to do)
2. **brain/Methodology-Doctrine.md** (alias: Doctrine.md) — 23+ worked examples, 19+ doctrines, standing rules (LOAD FIRST alongside Vision-2027.md: governs HOW to do code-scanning)
3. **brain/Lane4-Forum-Intelligence-Doctrine.md** — PERMANENT Lane 4 doctrine, 10-layer forum→behavioral pipeline parallel to Lane 1 10-layer audit pipeline (LOAD FIRST: governs HOW to do forum-scanning)
4. **brain/Operator-Philosophy.md** — PERMANENT hyperactive-default operating philosophy: 7 rules + overnight benchmark + exception list (LOAD FIRST: governs HOW to allocate cycles between work, escalation, and waiting)
5. **brain/Hyperactive-Formula.md** — PERMANENT 10-step autonomous execution loop, no decision points (LOAD FIRST: tells you WHICH step is current and what to execute; replaces "awaiting your call" idle behavior. Ogie msgs 7530+7531, 2026-05-22)
6. **brain/Moltbook-Strategy.md** — PERMANENT Moltbook content + posting + engagement strategy (restored 2026-05-22 from Indonesia Sprint Mar 2026 per Ogie msg 7543; Mon-Sun submolt schedule, max 2 posts/day, end-every-post signature `🐝 Buzz BD Agent | SolCex Exchange | @BuzzBySolCex`, AVOID m/crypto)
7. **brain/Predator-Vision.md** — three pillars, three-lane revenue, milestone targets (operational supplement to Vision-2027)
8. brain/North Star.md, Architecture.md, People.md, Revenue.md — operational context
9. projects-mind/Bug Bounty Genius Plan.md — execution plan against vision
10. **brain/Contradictions-Register.md** — Brain Self-Correction Layer Part 1. Read AFTER item 2 (Doctrine) and Patterns-Defense-Classes.md. Before dispatching a Gate 1 on a new target, grep the register for UNRESOLVED entries that touch the target's substrate or scoping path (Ogie Brain Self-Correction Layer directive, 2026-05-26).
11. **brain/Open-Questions-Tracker.md** — Brain Self-Correction Layer Part 2. Read AFTER item 2. Before tagging any claim `[ASSUMED]` in a Gate 1 surface map, grep the tracker for prior questions that match — they may already be ANSWERED. Also surface RECURRING entries as pattern-gap signals during PATTERNS section of the Weekly Synthesis.

**Session-start execution sequence (post-startup-read):** per `brain/Hyperactive-Formula.md` directive — determine current loop step, execute from that step, never ask "what should I do". The formula IS the proactive default. Operator overrides only via the 6 categories in the formula's override section.

## During Session

Decisions > decisions/. Incidents > incidents/. Wins > update brain/ notes. Status changes > update projects-mind/.

## On Wrap-Up

Update changed brain/ notes. Update Genius Plan status. Log to logs/.

## Rules

brain/ = persistent truth. Never delete, only update. Link with [[wikilinks]].
