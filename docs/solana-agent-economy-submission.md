# Buzz BD Agent — Solana Agent Economy Hackathon Submission

## From Kitchen to Blockchain

Ogie spent 20 years as a professional chef. No CS degree, no tech background. Then Claude happened.

In 30 days, working from Jakarta with nothing but Claude Code and determination, Ogie built Buzz BD Agent — a fleet of 10 autonomous AI agents that handle business development for a crypto exchange. No tutorials. No bootcamp. Just a chef who decided the kitchen was too small and the blockchain was the next frontier.

This is the story of radical AI-enabled builder empowerment.

---

## What is Buzz BD Agent?

Buzz is a fully autonomous Business Development engine for **SolCex Exchange** — the first Solana-native centralized exchange. It doesn't just monitor tokens. It **scouts, analyzes, simulates, and recommends** token listings using 10 specialized AI agents pulling from 23 distinct intelligence sources.

**Core Agents:**
- **Scanner Agent** — continuously scans Solana ecosystem for listing candidates
- **Intel Agent** — aggregates data from 23 sources (DexScreener, Helius, CoinGecko CLI, etc.)
- **Simulation Agent** — runs MiroFish multi-agent market simulations
- **Strategy Agent** — computes Expected Value and generates listing verdicts
- **Outreach Agent** — drafts partnership proposals in cyberpunk HTML format
- **Memory Agent** — persistent context across all agent interactions
- **Operator Agent** — system health, cron management, self-monitoring
- **Twitter Agent** — autonomous social media engagement
- **Backtest Agent** — validates strategies against historical data
- **Score Agent** — multi-dimensional token scoring (0-100)

---

## Architecture

```
┌─────────────────────────────────────────────┐
│              Buzz BD Agent v7.5.4            │
│         Express.js API + SQLite WAL          │
├─────────────────────────────────────────────┤
│  LLM Layer: bankr/gpt-5-nano (FREE)         │
│  Framework: OpenClaw AI Agent Framework      │
│  Database: SQLite WAL — 47 tables            │
│  Endpoints: 133+ REST API routes             │
│  Intel Sources: 23 (DexScreener, Helius,     │
│    CoinGecko CLI, Jupiter, Birdeye, etc.)    │
│  Cron Jobs: 28 autonomous scheduled tasks    │
│  Server: Hetzner CX23 — $4.09/month          │
└─────────────────────────────────────────────┘
```

**Key Technical Choices:**
- **bankr/gpt-5-nano** — free LLM via OpenRouter, zero inference cost
- **SQLite WAL mode** — single-file database, no external DB dependency
- **OpenClaw** — lightweight agent orchestration framework
- **Express.js** — battle-tested Node.js API framework
- **Docker** — single-container deployment

**Cost: $4.09/month total infrastructure.** That's radical capital efficiency.

---

## MiroFish Stage 1 — Multi-Agent Market Simulation

MiroFish is our proprietary simulation engine that predicts token listing outcomes before committing capital.

**How it works:**

20 simulation agents organized into 4 market clusters evaluate every token:

| Cluster | Agents | What They Evaluate |
|---------|--------|--------------------|
| Degen (5) | Momentum traders | Hype, narrative strength, meme potential, FOMO dynamics |
| Whale (5) | Smart money | Liquidity depth, accumulation patterns, exit strategies |
| Institution (5) | Conservative capital | Compliance, audit status, team credibility, legal risk |
| Community (5) | Retail participants | Social growth, organic engagement, holder distribution |

**Expected Value Engine:**

```
EV = P(success) × Revenue − (1 − P(success)) × Cost

Where:
- P(success) = weighted average of cluster confidence scores
- Revenue = projected listing fee ($5,000) + trading fee revenue
- Cost = integration effort + compliance risk + reputation risk
```

Each token receives a final verdict: **LIST**, **MONITOR**, or **REJECT** — backed by quantitative analysis, not gut feeling.

---

## Solana Integration

Buzz is built for Solana-first token intelligence:

- **Helius WebSocket** — real-time Solana transaction monitoring
- **Jupiter API** — DEX aggregator price data and routing
- **DexScreener** — pair analytics and volume tracking
- **Birdeye** — token analytics and holder data
- **RAY/JTO** — Raydium and Jito tokens in active pipeline
- **SolCex Exchange** — Solana-native centralized exchange (the client)
- **Solana 8004** — registered Solana ecosystem participant

**Pipeline tokens include:** RAY, JTO, BONK, WIF, JUP, PYTH, and 6 more Solana-native tokens under evaluation.

---

## Live Demo

**Simulate any Solana token listing:**

```bash
curl -X POST https://your-server/api/v1/simulate-listing \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-key" \
  -d '{"token": "RAY", "chain": "solana"}'
```

**Response includes:**
- MiroFish 20-agent simulation results
- Expected Value calculation
- Cluster-by-cluster breakdown (Degen/Whale/Institution/Community)
- Final verdict: LIST / MONITOR / REJECT
- Cyberpunk HTML report link

**Other key endpoints:**
- `GET /api/v1/coingecko/trending` — CoinGecko trending via CLI (Intel #23)
- `GET /api/v1/coingecko/price/:coinId` — Real-time price data
- `GET /api/v1/intel/scan` — Full ecosystem intelligence scan
- `GET /api/v1/score/:token` — Multi-dimensional token score
- `GET /api/v1/health` — System health and agent status

---

## Business Model

| Revenue Stream | Amount | Status |
|---------------|--------|--------|
| Token listing fee | $5,000 per token | 13 tokens in pipeline |
| Priority listing | $10,000 per token | Planned |
| Custom reports | $500 per report | Available |
| API access | $99/month | Planned |

**First $5K listing deal in progress.** 13 tokens actively evaluated.

---

## Stats at a Glance

| Metric | Value |
|--------|-------|
| API Endpoints | 133+ |
| Database Tables | 47 |
| Intel Sources | 23 |
| Cron Jobs | 28 |
| AI Agents | 10 core + 20 simulation |
| Monthly Cost | $4.09 |
| Build Time | 30 days |
| Builder Background | Professional chef, 20 years |
| LLM Cost | $0 (bankr/gpt-5-nano) |
| Framework | OpenClaw AI |

---

## Team

**Ogie** — CEO & Builder
- Twitter: [@HidayahAnka1](https://twitter.com/HidayahAnka1)
- 20-year professional chef turned AI agent builder
- Built entire system with Claude Code in 30 days from Jakarta

**Buzz BD Agent** — Autonomous AI
- Twitter: [@BuzzBySolCex](https://twitter.com/BuzzBySolCex)
- 10 specialized agents operating 24/7
- Self-monitoring, self-healing, autonomous BD operations

---

## Links

- **GitHub:** [buzz-bd-agent](https://github.com/HidayahAnka/buzz-bd-agent)
- **Twitter:** [@BuzzBySolCex](https://twitter.com/BuzzBySolCex)
- **SolCex Exchange:** [solcex.io](https://solcex.io)
- **Builder Twitter:** [@HidayahAnka1](https://twitter.com/HidayahAnka1)
- **OpenClaw:** [openclaw.ai](https://openclaw.ai)

---

## Why Buzz Matters

Most hackathon projects are proofs of concept. Buzz is a **production system** running on a $4.09/month server, actively evaluating 13 tokens for listing on a real exchange.

This isn't a demo. This is a chef from Jakarta who used Claude to build something that Wall Street firms spend millions on.

**From Kitchen to Blockchain. 30 days. $4.09/month. 10 autonomous agents. Zero excuses.**
