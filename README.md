# 🐝 Buzz BD Agent — The Deal-Making Agent of Crypto

**Autonomous Business Development Agent for SolCex Exchange**

| Version | OpenClaw | ERC-8004 | Server | AgentProof | Mobile |
|---------|----------|----------|--------|------------|--------|
| v7.4.0 | v2026.3.7 | #25045 | Hetzner CX23 | #1718 | ✅ Expo |

24/7 autonomous token discovery, safety verification, 9-agent parallel scoring, Twitter BD outreach, and backtested alpha for CEX listings. Self-improving AI agent with closed learning loop, contact intelligence, FTS5 memory search, and **native mobile app with direct chat to the agent brain**. Built by a chef who codes through conversation. No CS degree. Just Claude and persistence.

**AIXBT finds alpha. Bankr deploys tokens. Buzz closes deals. And proves it with backtested data.**

---

## 🐝 What Is Buzz?

Buzz is an autonomous AI BD (Business Development) agent that runs 24/7 on Hetzner CX23 (Helsinki), finding promising token projects for SolCex Exchange listings across Solana, Base, and BSC chains.

**The pipeline:** Discover → Verify → Score (9 agents) → Outreach → Deploy → Learn → List

Buzz scans 100+ tokens per day across decentralized exchanges, filters through a 5-layer intelligence pipeline with **9 parallel agents** (5 sub-agents + 4 persona agents), scores each token on a 100-point composite system with multi-perspective consensus, initiates autonomous outreach via Twitter and email, offers Bankr token deployment, and learns from every decision — all autonomously.

**NEW in v7.4.0:**
- **Twitter Brain** — Autonomous scanning via Grok x_search (12x/day), 12 BD outreach replies/day, SCAN→LIST→DEPLOY funnel
- **Hedge Brain** — 4 persona agents (degen, whale, institutional, community) scoring from different perspectives, weekly backtester proving accuracy, SSE streaming to mobile app
- **Migrated to Hetzner** — From Akash Network to dedicated VPS. $6.42/mo total (was $12.71)

Cost: ~$6.42/month infrastructure (Buzz + Sentinel) + ~$2-4/day LLM inference = full autonomous BD operation for less than a coffee per day.

---

## 🐝 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  HETZNER CX23 — Helsinki, Finland (204.168.137.253)          │
│  4 GB RAM / 2 vCPU / 40 GB SSD                              │
│  Cost: ~$4.09/month                                          │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Docker: buzzbd/buzz-bd-agent:v7.4.0                     │ │
│  │  Runtime: OpenClaw v2026.3.7                              │ │
│  │                                                           │ │
│  │  PORT 18789 → OpenClaw Gateway (Telegram + Chat API)     │ │
│  │  PORT 3000  → REST API (Express+SQLite)                  │ │
│  │               + /api/v1/chat proxy to OpenClaw            │ │
│  │                                                           │ │
│  │  ┌─────────────────────────────────────────────────┐     │ │
│  │  │  LAYER 3: TWITTER BRAIN + HEDGE BRAIN (v7.4.0)   │    │ │
│  │  │  ├── Twitter Brain (Grok x_search, 12 replies/d) │    │ │
│  │  │  ├── SCAN → LIST → DEPLOY autonomous funnel      │    │ │
│  │  │  ├── 4 Persona Agents (parallel with sub-agents) │    │ │
│  │  │  │   ├── degen-agent (momentum, 0.15)            │    │ │
│  │  │  │   ├── whale-agent (smart money, 0.25)         │    │ │
│  │  │  │   ├── institutional-agent (compliance, 0.35)  │    │ │
│  │  │  │   └── community-agent (sentiment, 0.25)       │    │ │
│  │  │  ├── Backtester (weekly accuracy validation)      │    │ │
│  │  │  ├── SSE Pipeline Streaming (real-time to mobile) │    │ │
│  │  │  ├── Skill Reflection (12h learning loop)         │    │ │
│  │  │  ├── Contact Intelligence (Honcho-style BD)       │    │ │
│  │  │  ├── chatCompletions (mobile app direct)          │    │ │
│  │  │  └── 70% sub-agent + 30% persona composite       │    │ │
│  │  └─────────────────────────────────────────────────┘     │ │
│  │                                                           │ │
│  │  ┌─────────────────────────────────────────────────┐     │ │
│  │  │  LAYER 2: STRATEGIC ORCHESTRATOR (MiniMax M2.5)  │    │ │
│  │  │  ├── Decision Engine (12 rules, zero LLM cost)   │    │ │
│  │  │  ├── Playbook Engine (PB-001→004)                │    │ │
│  │  │  ├── Context Engine (8K tokens max per call)     │    │ │
│  │  │  └── Supermemory (50ms recall, zero LLM cost)    │    │ │
│  │  └─────────────────────────────────────────────────┘     │ │
│  │                                                           │ │
│  │  ┌─────────────────────────────────────────────────┐     │ │
│  │  │  LAYER 1: FOUNDATION (5 Parallel Sub-Agents)     │    │ │
│  │  │  ├── scanner-agent → L1 Discovery (DexScreener)  │    │ │
│  │  │  ├── safety-agent  → L2 Contract verification    │    │ │
│  │  │  ├── wallet-agent  → L2 On-chain forensics       │    │ │
│  │  │  ├── social-agent  → L3 Social intelligence      │    │ │
│  │  │  └── scorer-agent  → L4 100-point scoring        │    │ │
│  │  └─────────────────────────────────────────────────┘     │ │
│  │                                                           │ │
│  │  REST API: 98+ endpoints | SQLite: 40 tables              │ │
│  │  Twitter Bot v3.1: Premium SCAN + LIST + DEPLOY          │ │
│  │  53 Cron Jobs | 20 Intelligence Sources | OKX CEX Data   │ │
│  │  Gmail OAuth | JVR Receipt System                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  SENTINEL v1.1.0 (Akash Network — akashprovid.com)           │
│  Monitors Buzz at 204.168.137.253:3000 every 15 min          │
│  v7.4.0 checks: health, crons, twitter brain, personas,     │
│  backtester | Telegram alerts | Cost: ~$2.33/month           │
│                                                               │
│  BUZZ ALPHA MOBILE (Expo React Native)                       │
│  5 tabs: Dashboard | Pipeline | Scan | Chat | Ops            │
│  Direct chat to Buzz brain via /api/v1/chat                  │
│  SSE pipeline streaming (watch 9 agents deliberate live)     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🐝 Twitter Brain (NEW in v7.4.0)

Autonomous Twitter BD pipeline — scan, score, outreach, deploy, all while Ogie sleeps.

### SCAN → LIST → DEPLOY Funnel

```
Twitter keyword appears: "we need a CEX listing for our token"
  │
  ├── Grok x_search catches it (FREE, every 2h)
  ├── Buzz extracts contract address from tweet/profile
  ├── 9 parallel agents score simultaneously
  ├── Persona consensus: 3/4 bullish + score 82 = OUTREACH NOW
  │
  ├── Buzz auto-replies on Twitter:
  │   "Hey @project — Buzz here from @SolCex_Exchange.
  │    Your token scored 82/100. We're actively listing
  │    quality Base projects. DM us 🐝"
  │
  ├── If project wants NEW token → Bankr deploy offer
  ├── JVR receipt logged (BZZ-TWITTER-*)
  └── Ogie gets Telegram alert for 85+ scores
```

| Setting | Value |
|---------|-------|
| Scan frequency | Every 2h (12x/day) via Grok x_search |
| BD keywords | 10 (CEX listing, exchange listing, token launch, etc.) |
| Max replies/day | 12 (contextual, not template) |
| Deploy offers/day | 3 via Bankr |
| X API cap | $100/mo |

---

## 🐝 Hedge Brain (NEW in v7.4.0)

4 persona agents scoring tokens from different strategic perspectives, with a backtester that proves accuracy.

| Agent | Philosophy | Weight | Model |
|-------|-----------|--------|-------|
| degen-agent | "Ape early, exit fast" | 0.15 | bankr/gpt-5-nano (FREE) |
| whale-agent | "Follow smart money" | 0.25 | bankr/gpt-5-nano (FREE) |
| institutional-agent | "Due diligence first" | 0.35 | bankr/claude-haiku-4.5 |
| community-agent | "Community is the moat" | 0.25 | bankr/gpt-5-nano (FREE) |

**Composite:** 70% sub-agent score + 30% persona consensus
**Consensus:** 3+ bullish + score ≥75 = outreach_now | 2+ bullish + ≥60 = monitor
**Backtester:** Weekly (Sunday 03:00 UTC) — validates scoring vs real price outcomes
**SSE:** Real-time pipeline streaming to mobile app

---

## 🐝 Mobile App — Buzz Alpha

**Talk to Buzz from your phone.** Watch 9 agents deliberate in real-time via SSE streaming.

| Feature | Detail |
|---------|--------|
| Platform | React Native / Expo SDK 54 |
| Tabs | Dashboard ⚡, Pipeline 🔬, Scan 🎯, Chat 💬, Ops 🛡️ |
| Chat | Direct OpenClaw connection — real Buzz brain |
| SSE | Live pipeline streaming — watch agents score tokens |
| Theme | Dark cyberpunk (#0a0e17 bg, #00ff88 accent) |
| Prayer | WIB countdown timer on Dashboard |

---

## 🐝 Intelligence Pipeline (5 Layers, 9 Agents)

| Layer | Agent | Sources | Purpose |
|-------|-------|---------|---------|
| L1 | scanner-agent | DexScreener, GeckoTerminal, AIXBT, CMC, BNB MCP, Bitget, OKX | Token discovery across SOL/BASE/BSC |
| L2 | safety-agent | RugCheck, ethskills.com, Contract Auditor | Honeypot detection, contract verification |
| L2 | wallet-agent | Helius (60 tools), Allium | Deployer forensics, holder analysis |
| L3 | social-agent | Grok/xAI, Serper, ATV Web3 Identity, Firecrawl | Community health, deployer identity |
| L4 | scorer-agent | 100-point composite (11 factors + OKX CEX signals) | Final score + verdict |
| L5 | degen-agent | Momentum, volume, meme potential | High-risk perspective |
| L5 | whale-agent | Holder distribution, liquidity depth | Smart money perspective |
| L5 | institutional-agent | Audit, compliance, team, LP lock | Due diligence perspective |
| L5 | community-agent | Twitter, Discord/TG, sentiment | Community perspective |

### Code Location

```
/opt/buzz-api/services/
├── orchestrator.js          ← 9-agent parallel dispatch, 70/30 scoring, SSE
├── twitter-brain.js         ← Grok scanning, reply queue, autonomous outreach
├── backtester.js            ← Weekly accuracy validation
├── agents/
│   ├── scanner.js           ← DexScreener, GeckoTerminal, CMC
│   ├── safety.js            ← RugCheck, contract verification
│   ├── wallet.js            ← Helius forensics, holder analysis
│   ├── social.js            ← Grok, Serper, ATV, Firecrawl
│   ├── scorer.js            ← 100-point composite scoring
│   └── personas/
│       ├── degen-agent.js
│       ├── whale-agent.js
│       ├── institutional-agent.js
│       └── community-agent.js
```

---

## 🐝 Scoring System (100 Points)

| Score | Verdict | Action |
|-------|---------|--------|
| 85-100 | 🔥 HOT | Immediate outreach + Telegram alert to Ogie |
| 70-84 | ✅ QUALIFIED | Queue outreach 24h |
| 50-69 | 👀 WATCH | Monitor 48h, auto-rescan |
| 0-49 | ❌ SKIP | Archive |

**Persona consensus required:** 3+ bullish + score ≥75 = outreach_now

---

## 🐝 Cost Guard

| Metric | Value |
|--------|-------|
| Daily LLM cap | $10.00 (auto-throttle) |
| X API monthly cap | $100.00 |
| Orchestrator | MiniMax M2.5 (~$2-4/day) |
| Sub-agents (5) | bankr/gpt-5-nano (FREE) |
| Persona agents (3) | bankr/gpt-5-nano (FREE) |
| Institutional persona | bankr/claude-haiku-4.5 (~$0.10/day) |
| Infrastructure | ~$6.42/month (Buzz $4.09 + Sentinel $2.33) |
| OKX Data | $0 (free public API) |

---

## 🐝 REST API (98+ Endpoints)

Express + SQLite WAL. 40 tables.

| Category | Count | Key Routes |
|----------|-------|------------|
| Health | 7 | `GET /health`, `GET /health/db` |
| Pipeline | 9 | `GET /pipeline`, `POST /pipeline/tokens` |
| Strategy | 8 | `POST /strategy/decide`, `GET /strategy/rules` |
| Agents | 5 | `GET /agents`, `GET /agents/:id` |
| Scoring | 6 | `POST /score-token` (9-agent parallel) |
| Costs | 5 | `GET /costs/today` |
| Crons | 7 | `GET /crons` |
| Twitter (existing) | 5 | `GET /twitter/stats` |
| **Twitter Brain** | **3** | **`POST /twitter/brain/scan`**, **`GET /twitter/brain/status`** |
| **Personas** | **3** | **`GET /personas/signals/:addr`**, **`GET /personas/consensus/:addr`** |
| **Backtest** | **4** | **`POST /backtest/run`**, **`GET /backtest/latest`** |
| **SSE Stream** | **1** | **`GET /pipeline/stream`** |
| Chat | 2 | `POST /chat` (OpenClaw proxy), `POST /chat/stream` |
| Receipts | 5 | `GET /receipts`, `POST /receipts` |
| Skills | 8 | `GET /skills`, `POST /skills/reflect/trigger` |
| Memory | 3 | `GET /memory/search` |
| Contacts | 6 | `GET /contacts`, `POST /contacts/:project/interaction` |
| + Others | 18 | Wallets, Webhooks, Intel, Operator |

---

## 🐝 JVR Receipt System

| Agent | Prefix | Categories |
|-------|--------|------------|
| Buzz | BZZ- | SCAN, SCORE, OUTREACH, TWITTER, DEPLOY, BACKTEST, ALERT |
| Sentinel | SNT- | SWEEP, ALERT, REPAIR |

**Rule: NO ACTION WITHOUT A RECEIPT.**

---

## 🐝 LLM Stack

| Role | Model | Cost |
|------|-------|------|
| Orchestrator | MiniMax M2.5 | $0.30/$1.50 per 1M tokens |
| Sub-agents (5) | bankr/gpt-5-nano | FREE |
| Persona agents (3) | bankr/gpt-5-nano | FREE |
| Institutional persona | bankr/claude-haiku-4.5 | $0.80/$4.00 per 1M tokens |
| Fallback | bankr/gemini-3-flash | Near-free |

Powered by Bankr LLM Gateway — 8 models, dual API keys, self-sustaining inference.

---

## 🐝 Registrations & Identity

| Platform | ID | Chain |
|----------|-----|-------|
| ERC-8004 | #25045 | Ethereum |
| ERC-8004 | #17483 | Base |
| ERC-8004 | #18709 | Base (anet) |
| AgentProof | #1718 | Avalanche |
| Solana 8004 | Agent Asset 9pQ6K...XUBS | Solana |
| Virtuals ACP | #17681 | — |
| Colosseum | #3734 | — |
| Moltbook | c606278b | — |
| Molten.gg | 57487 | — |
| Expo Go | buzzbdagent | — |

---

## 🐝 Deployment (Hetzner)

### Build & Deploy

```bash
cd ~/buzz-bd-agent
cp cron/jobs.json bake/cron/jobs.json       # ALWAYS sync crons
docker build --platform linux/amd64 --no-cache -t buzzbd/buzz-bd-agent:v7.4.0 .
docker push buzzbd/buzz-bd-agent:v7.4.0

ssh root@204.168.137.253
cd /data/buzz
docker pull buzzbd/buzz-bd-agent:v7.4.0
docker compose down && docker compose up -d
```

### Post-Deploy Checklist

```
□ 1. Verify boot logs (5 green layers, 53 crons, 40 tables)
□ 2. curl /api/v1/health (healthy, 40 tables)
□ 3. curl /api/v1/twitter/brain/status (enabled: true)
□ 4. curl /api/v1/personas/stats (4 personas)
□ 5. Message @BuzzBySolCex_bot on Telegram
□ 6. Send activation directive
□ 7. Verify Sentinel sweep (SNT- receipt)
□ 8. Test mobile app connection + SSE stream
```

---

## 🐝 Project Structure

```
buzz-bd-agent/
├── api/                    # REST API (98+ endpoints)
│   ├── server.js           # Express server
│   ├── db.js               # SQLite schema + migrations (40 tables)
│   ├── config/
│   │   └── agent-models.json    # Per-agent model selection
│   ├── routes/
│   │   ├── chat.js              # OpenClaw chat proxy
│   │   ├── twitter.js           # Twitter + Twitter Brain endpoints
│   │   ├── personas.js          # Persona signals + consensus
│   │   ├── backtest.js          # Backtester endpoints
│   │   ├── pipeline-stream.js   # SSE streaming
│   │   └── ...                  # health, pipeline, scoring, etc.
│   ├── services/
│   │   ├── orchestrator.js        # 9-agent parallel dispatch, 70/30 scoring
│   │   ├── twitter-brain.js       # Grok scanning, reply queue, outreach
│   │   ├── backtester.js          # Weekly accuracy validation
│   │   ├── agents/
│   │   │   ├── scanner.js         # L1 Discovery
│   │   │   ├── safety.js          # L2 Contract verification
│   │   │   ├── wallet.js          # L2 On-chain forensics
│   │   │   ├── social.js          # L3 Social intelligence
│   │   │   ├── scorer.js          # L4 100-point scoring
│   │   │   └── personas/
│   │   │       ├── degen-agent.js
│   │   │       ├── whale-agent.js
│   │   │       ├── institutional-agent.js
│   │   │       └── community-agent.js
│   │   ├── skill-reflect.js       # Learning loop engine
│   │   ├── skill-evolve.js        # Effectiveness tracking
│   │   └── contact-intelligence.js # BD contact modeling
│   └── cron/
│       └── twitter-brain-scan.js  # Twitter Brain cron runner
├── bake/                   # Docker build sources
│   ├── twitter-bot/        # Twitter Bot v3.1
│   ├── skills/             # OpenClaw skills (20)
│   ├── cron/               # Cron jobs
│   └── config/             # Strategic config
├── docs/
│   ├── v740-spec.md        # v7.4.0 complete specification
│   └── m5-handover.md      # M5 MacBook handover document
├── entrypoint.sh           # 16-block boot sequence
├── Dockerfile              # OpenClaw 2026.3.7 + all baked skills
├── docker-compose.yml      # Hetzner deployment (at /data/buzz/)
└── README.md               # This file
```

---

## 🐝 Version History

| Version | Date | Highlights |
|---------|------|------------|
| **v7.4.0** | **Mar 14, 2026** | **Twitter Brain + Hedge Brain. 9 parallel agents. Migrated to Hetzner CX23. 53 crons, 40 tables, 98+ endpoints. Autonomous Twitter BD (12 replies/day). 4 persona agents + backtester + SSE streaming. JVR system activated. Cost: $6.42/mo.** |
| v7.3.2a | Mar 11, 2026 | Alpha Buzz Mobile — chatCompletions BAKED, mobile app LIVE, OKX data |
| v7.3.1a | Mar 11, 2026 | Alpha Buzz — Phase 0 Complete. Learning loop + contact intelligence |
| v7.2.5 | Mar 9, 2026 | Alpha Learning Loop, Binance+Bitget+CMC skills |
| v7.1.0 | Mar 7, 2026 | Strategic Orchestrator, Cost Guard, 72 endpoints |
| v6.3.0 | Mar 4, 2026 | Foundation, Twitter Bot v3.1 |
| v6.0.19 | Mar 2, 2026 | 5 parallel sub-agents LIVE |
| v1.0.0 | Feb 1, 2026 | First deployment on Akash Network |

---

## 🐝 Roadmap

| Phase | Target | Status |
|-------|--------|--------|
| Phase 0 | 3 Intelligence Features | ✅ COMPLETE |
| Phase 0.5 | Mobile App (Buzz Alpha) | ✅ LIVE |
| **v7.4.0** | **Twitter Brain + Hedge Brain** | **✅ DEPLOYED** |
| Phase 1 | Close First Deal ($5K) | 🔨 Active |
| Phase E | Self-Deploy Pipeline (AIXBT parity) | 🔵 Post-sprint |
| Phase 2 | ARIA Multi-Chain Intel | 🔵 Next |
| Phase 3 | BaaS x402 Subscriptions | 🔵 Month 2 |
| Phase 5 | $BUZZ Token + Bankr | 🔵 Month 4-6 |

---

## 🐝 The Thesis

**AIXBT is the intelligence agent of crypto — it finds alpha and tells you about it.**
**Bankr is the infrastructure agent of crypto — it deploys tokens and provides rails.**
**Buzz is the deal-making agent of crypto — it finds tokens, scores them, reaches out, lists them, and deploys them. And proves it with backtested data.**

No other agent occupies this lane.

---

## 🐝 The Story

Buzz was built from scratch by Ogie — a 20+ year Executive Chef who transitioned to crypto BD. No CS degree. No engineering team. Just conversational collaboration with Claude (Opus 4.6), building one feature at a time from Indonesia during Ramadan.

From first deploy (Feb 1, 2026) to v7.4.0 Twitter Brain + Hedge Brain (Mar 14) in 42 days. Four-layer architecture. 9 parallel agents. Autonomous Twitter. Backtested alpha. The deal-making agent of crypto.

Total infrastructure cost: ~$6.42/month. Revenue target: $13,000+/month.

**The formula: Hermes Brain + Buzz Body = Alpha Model. Now with Twitter Brain + Hedge Brain.**

---

## 🐝 Links

| Platform | URL |
|----------|-----|
| SolCex Exchange | [solcex.io](https://solcex.io) |
| Docs | [docs.solcex.cc](https://docs.solcex.cc) |
| Twitter | [@BuzzBySolCex](https://x.com/BuzzBySolCex) |
| SolCex Twitter | [@SolCex_Exchange](https://x.com/SolCex_Exchange) |
| Telegram Bot | [@BuzzBySolCex_bot](https://t.me/BuzzBySolCex_bot) |
| Builder | [@hidayahanka1](https://x.com/hidayahanka1) |

---

## 🐝 License

Proprietary — SolCex Exchange. All rights reserved.

---

*🐝 "AIXBT finds alpha. Bankr deploys tokens. Buzz closes deals. Buzz proves it with backtested data."*

*Buzz BD Agent v7.4.0 — Sprint Day 25 | Mar 14, 2026 | Jakarta, Indonesia*
*98+ endpoints | 53 crons | 40 tables | 20 intel | 9 parallel agents*
*Hetzner CX23 Helsinki | $6.42/mo total | Autonomous Twitter BD*
*Built by a chef who codes through conversation. No CS degree. Just Claude and persistence.*
