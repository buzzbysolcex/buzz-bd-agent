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

**Startup-read priority — Four-Pillar Brain (2026-05-27 Obsidian Mind upgrade):**

**Priority 1 — LOAD FIRST (governs all decisions):**

1. **brain/Doctrine.md** — 23+ worked examples, 37+ doctrines, standing rules. Governs HOW to do everything Pillar 4.
2. **brain/Predator-Vision.md** — three pillars, three-lane revenue, milestone targets. Governs WHAT to build.
3. **brain/Vision-2027.md** — PERMANENT North Star Dec 2027, four-lane wiring, monthly checkpoints.
4. **brain/Hyperactive-Formula.md** — 10-step autonomous loop, ZERO option menus (Ogie msgs 7530+7531, 7628).
5. **brain/Operator-Philosophy.md** — hyperactive-default operating philosophy.

**Priority 2 — operational context:**

6. brain/North Star.md, brain/Architecture.md, brain/People.md, brain/Revenue.md
7. brain/Moltbook-Strategy.md (Mon-Sun submolt schedule, max 2 posts/day; AVOID m/crypto)
8. brain/Lane4-Forum-Intelligence-Doctrine.md — 10-layer forum-scanning pipeline parallel to Lane 1
9. projects-mind/Bug Bounty Genius Plan.md — execution plan against vision

**Priority 3 — pillar-specific (read when working on that pillar):**

10. **brain/Token-Scoring-Doctrine.md** — Pillar 1 doctrine (8 doctrines T-1..T-8); rules + calibration
11. **brain/Token-Rug-Patterns.md** — Pillar 1 catalog (11 TRP rules mapped to Pillar 4 lenses)
12. **brain/Deployer-Crossref.md** — Pillar 1 ↔ Pillar 4 deployer index with ESCALATE promotion rules
13. **brain/HSaaS-Operations.md** — Pillar 2 outreach + revenue + prospect-scoring ledger
14. **brain/Content-Playbook.md** — Pillar 2 tweet/Moltbook/AIBTC format inventory + engagement tracking
15. **brain/Corpus-Digest-Log.md** — Pillar 3 Phase 2 consumer runs + classification stats
16. **brain/Cross-Pollination-Log.md** — Cross-pillar event ledger; the compound-engine proof

**Priority 4 — hunt-specific (read per autonomy-boundary.md before Gate 1 dispatch):**

17. brain/Patterns-Defense-Classes.md (DC-1..DC-20 + CANDIDATE-A..R + sub-patterns)
18. brain/Watchlist-Candidate-Crossmap.md (target × DC matrix)
19. brain/Security-Research-Submission-Ledger.md (DISC-001..DISC-020+)
20. brain/Cross-Domain-Fragility-Laws.md
21. brain/External-Frameworks.md
22. **brain/Contradictions-Register.md** — grep UNRESOLVED entries touching current target substrate
23. **brain/Open-Questions-Tracker.md** — grep before tagging any claim [ASSUMED]; RECURRING entries are pattern-gap signals

**Always-loaded standing orders:**

24. **.claude/rules/autonomy-boundary.md** — what's autonomous vs operator-required
25. **.claude/rules/four-pillar-loop.md** — all four pillars run in parallel; cross-pollination wiring

**Session-start execution sequence (post-startup-read):** per `brain/Hyperactive-Formula.md` directive — determine current loop step, execute from that step, never ask "what should I do". The formula IS the proactive default. Operator overrides only via the 6 categories in the formula's override section + the 7th category added in Contradictions-Register #2 (Standing-Intake Step 4 queue-admission for MEDIUM overlap + $500K+ targets).

## During Session

Decisions > decisions/. Incidents > incidents/. Wins > update brain/ notes. Status changes > update projects-mind/.

## On Wrap-Up

Update changed brain/ notes. Update Genius Plan status. Log to logs/.

## Rules

brain/ = persistent truth. Never delete, only update. Link with [[wikilinks]].
