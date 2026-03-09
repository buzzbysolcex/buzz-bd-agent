# 🐝 Buzz BD Agent

**Autonomous Business Development Agent for SolCex Exchange**

[![Version](https://img.shields.io/badge/version-v7.2.0-orange)](https://github.com/buzzbysolcex/buzz-bd-agent)
[![OpenClaw](https://img.shields.io/badge/OpenClaw-v2026.3.7-blue)](https://openclaw.com)
[![ERC-8004](https://img.shields.io/badge/ERC--8004-%2325045-green)](https://erc8004.org)
[![Akash](https://img.shields.io/badge/Akash-Decentralized%20Cloud-red)](https://akash.network)
[![AgentProof](https://img.shields.io/badge/AgentProof-%231718-purple)](https://agentproof.xyz)

> 24/7 autonomous token discovery, safety verification, scoring, and outreach for CEX listings.
> Built by a chef who codes through conversation. No CS degree. Just Claude and persistence.

---

## 🐝 What Is Buzz?

Buzz is an autonomous AI BD (Business Development) agent that runs 24/7 on [Akash Network](https://akash.network), finding promising token projects for [SolCex Exchange](https://solcex.io) listings across Solana, Base, and BSC chains.

**The pipeline:** Discover → Verify → Score → Outreach → List

Buzz scans 100+ tokens per day across decentralized exchanges, filters through a 5-layer intelligence pipeline with parallel sub-agents, scores each token on a 100-point system, and initiates outreach to qualified projects — all autonomously.

**Cost:** ~$6.58/month infrastructure + ~$3-5/day LLM inference = **full autonomous BD operation for less than a coffee per day.**

---

## 🐝 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  AKASH NETWORK — provider.boogle.cloud                       │
│  2 CPU / 4GB RAM / 10GB persistent                           │
│  Cost: ~$5.07/month                                          │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Docker: ghcr.io/buzzbysolcex/buzz-bd-agent:v7.2.0      │ │
│  │  Runtime: OpenClaw v2026.3.7                              │ │
│  │                                                           │ │
│  │  PORT 18789 → 31660: OpenClaw Gateway (Telegram)         │ │
│  │  PORT 3000  → 32138: REST API v3.0.0 (Express+SQLite)    │ │
│  │                                                           │ │
│  │  ┌─────────────────────────────────────────────────┐     │ │
│  │  │  STRATEGIC ORCHESTRATOR (MiniMax M2.5)          │     │ │
│  │  │  ├── Decision Engine (12 rules, no LLM needed)  │     │ │
│  │  │  ├── Playbook Engine (PB-001→004)               │     │ │
│  │  │  ├── Context Engine (8K tokens max per call)    │     │ │
│  │  │  └── Supermemory (50ms recall, zero LLM cost)   │     │ │
│  │  └─────────────────────────────────────────────────┘     │ │
│  │                                                           │ │
│  │  5 Parallel Sub-Agents (bankr/gpt-5-nano):               │ │
│  │  ├── scanner-agent  → L1 Discovery (DexScreener, CMC)   │ │
│  │  ├── safety-agent   → L2 Contract verification           │ │
│  │  ├── wallet-agent   → L2 On-chain forensics (Helius)    │ │
│  │  ├── social-agent   → L3 Social intelligence (Grok)     │ │
│  │  └── scorer-agent   → L4 100-point scoring               │ │
│  │                                                           │ │
│  │  REST API: 72 endpoints | SQLite: 20 tables              │ │
│  │  Twitter Bot v3.1: Premium SCAN + LIST + DEPLOY          │ │
│  │  18 Cron Jobs | 19 Intelligence Sources                   │ │
│  │  Gmail OAuth | JVR Receipt System                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  SENTINEL (separate container — provider.akashprovid.com)    │
│  Monitors Buzz REST API | 10 health crons | Telegram alerts  │
│  Cost: ~$1.51/month                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 🐝 Features

### Intelligence Pipeline (5 Layers)

| Layer | Agent | Sources | Purpose |
|-------|-------|---------|---------|
| **L1** | scanner-agent | DexScreener, GeckoTerminal, AIXBT, CMC, BNB MCP | Token discovery across SOL/BASE/BSC |
| **L2** | safety-agent | RugCheck, ethskills.com, Contract Auditor | Honeypot detection, contract verification |
| **L2** | wallet-agent | Helius (60 tools), Allium | Deployer forensics, holder analysis |
| **L3** | social-agent | Grok/xAI, Serper, ATV Web3 Identity, Firecrawl | Community health, deployer identity |
| **L4** | scorer-agent | 100-point composite (11 factors) | Final score + verdict |

### Strategic Orchestrator

- **Decision Engine** — 12 rules handle 90% of decisions with zero LLM cost
- **Playbook Engine** — 4 state machines (Discovery → Outreach → Negotiation → Post-Listing)
- **Context Engine** — Assembles max 8K tokens per LLM call (down from 250K)
- **Supermemory** — 50ms semantic recall, 3 custom containers (contacts, patterns, decisions)

### Scoring System (100 Points)

| Score | Verdict | Action |
|-------|---------|--------|
| 85-100 | 🔥 HOT | Immediate outreach |
| 70-84 | ✅ QUALIFIED | Queue outreach 24h |
| 50-69 | 👀 WATCH | Monitor 48h, auto-rescan |
| 0-49 | ❌ SKIP | Archive |

### Cost Guard

| Metric | Value |
|--------|-------|
| Daily LLM cap | $10.00 (auto-throttle to gpt-5-nano) |
| Infrastructure | ~$6.58/month (Buzz + Sentinel on Akash) |
| Cost reduction | 78% ($22/day → $5/day) |
| Context slim | 96% token reduction per scan |

---

## 🐝 REST API

**72 endpoints** across 13 categories. Express + SQLite WAL.

| Category | Endpoints | Key Routes |
|----------|-----------|------------|
| Health | 6 | `GET /health`, `GET /health/db` |
| Pipeline | 9 | `GET /pipeline`, `POST /pipeline/tokens` |
| Strategy | 8 | `POST /strategy/decide`, `GET /strategy/rules` |
| Agents | 5 | `GET /agents`, `GET /agents/:id` |
| Scoring | 5 | `GET /scoring/history` |
| Costs | 5 | `GET /costs/today` |
| Crons | 7 | `GET /crons` |
| Twitter | 5 | `GET /twitter/stats` |
| Receipts | 5 | `GET /receipts`, `POST /receipts` |
| Intel | 5 | `GET /intel/sources` |
| Wallets | 6 | `GET /wallets` |
| Webhooks | 5 | `POST /webhooks` |
| Score | 1 | `POST /score` |

---

## 🐝 Twitter Bot v3.1

Premium SCAN format with 5-layer intelligence report. Three revenue routes:

| Route | Trigger | Response |
|-------|---------|----------|
| **SCAN** | `@BuzzBySolCex scan $TICKER` | 5-layer Premium report (~1,100 chars) |
| **LIST** | Reply "LIST" to any scan | SolCex listing pitch → DM redirect |
| **DEPLOY** | Reply "DEPLOY" to any scan | Token deployment on Base via Bankr |

Every scan reply is a sales funnel. The scan is the hook, the CTA is the close.

---

## 🐝 LLM Stack

| Role | Model | Cost |
|------|-------|------|
| Orchestrator | MiniMax M2.5 | $0.30/$1.50 per 1M tokens |
| Sub-agents (5) | bankr/gpt-5-nano | $0.10/$0.40 per 1M tokens |
| Fallback | bankr/claude-haiku-4.5 | $0.80/$4.00 per 1M tokens |

Powered by [Bankr LLM Gateway](https://bankr.bot) — 8 models, dual API keys, self-sustaining inference.

---

## 🐝 Registrations & Identity

| Platform | ID | Chain |
|----------|----|-------|
| [ERC-8004](https://erc8004.org) | #25045 | Ethereum |
| [ERC-8004](https://erc8004.org) | #17483 | Base |
| [ERC-8004](https://erc8004.org) | #18709 | Base (anet) |
| [AgentProof](https://agentproof.xyz) | #1718 | Avalanche |
| Solana 8004 | Agent Asset 9pQ6K...XUBS | Solana |
| [Virtuals ACP](https://virtuals.io) | #17681 | — |
| [Colosseum](https://colosseum.org) | #3734 | — |
| [Moltbook](https://moltbook.com) | c606278b | — |
| [Molten.gg](https://molten.gg) | 57487 | — |

---

## 🐝 Cron Schedule (18 Active)

### Scanning (8 jobs)
| Job | Schedule | Description |
|-----|----------|-------------|
| scan-trending-00 | `0 0 * * *` | Trending tokens (midnight UTC) |
| scan-trending-06 | `0 6 * * *` | Trending tokens (6am UTC) |
| scan-trending-12 | `0 12 * * *` | Trending tokens (noon UTC) |
| scan-trending-18 | `0 18 * * *` | Trending tokens (6pm UTC) |
| scan-new-pairs | `0 */4 * * *` | New token pairs |
| scan-solana-dex | `30 */4 * * *` | Solana DEX scan |
| scan-base-dex | `30 */6 * * *` | Base DEX scan |
| scan-bsc-dex | `0 */6 * * *` | BSC DEX scan |

### Operations (5 jobs)
| Job | Schedule | Description |
|-----|----------|-------------|
| pipeline-status | `0 1 * * *` | Daily pipeline report |
| pipeline-weekly | `0 12 * * 0` | Weekly summary |
| daily-pipeline | `0 */2 * * *` | Pipeline health check |
| morning-reminder | `0 5 * * *` | Daily briefing |
| evening-review | `0 18 * * *` | End of day review |

### Prayer Reminders (5 jobs)
| Prayer | WIB Time | UTC Schedule |
|--------|----------|-------------|
| Fajr | 04:30 | `30 21 * * *` |
| Dhuhr | 11:45 | `45 4 * * *` |
| Asr | 15:00 | `0 8 * * *` |
| Maghrib | 17:45 | `45 10 * * *` |
| Isha | 19:00 | `0 12 * * *` |

---

## 🐝 Intelligence Sources (19)

### Layer 1 — Discovery
DexScreener `/tokens/v1/` | GeckoTerminal | AIXBT | DexScreener Boosts | CoinMarketCap | BNB Chain MCP

### Layer 2 — Safety
RugCheck | Helius MCP (60 tools) | Allium | ethskills.com (500+ vulnerability checklist)

### Layer 3 — Social
Grok/xAI | Serper | ATV Web3 Identity (ENS + socials) | Firecrawl

### Layer 4 — Identity
AgentProof | Nansen x402 | Bankr Partner | ACP/Virtuals | Hyperbrowser

---

## 🐝 Deployment

### Prerequisites
- Docker Desktop
- GHCR access (`ghcr.io/buzzbysolcex/buzz-bd-agent`)
- Akash Console account with AKT

### Build & Deploy

```bash
cd ~/buzz-bd-agent
rm -rf api/node_modules api/package-lock.json
docker build --no-cache -t ghcr.io/buzzbysolcex/buzz-bd-agent:v7.2.0 .
docker push ghcr.io/buzzbysolcex/buzz-bd-agent:v7.2.0
```

Then in Akash Console: **Close + New Deployment** with updated SDL.

### Important Notes
- Always `--no-cache` and delete `node_modules` before build
- New ENV vars require **Close + New** (Update won't apply them)
- OpenClaw 3.7 requires: `gateway.mode="local"`, `gateway.auth.mode="token"`, `allowFrom=["*"]`
- `bake/twitter-bot/` is what Dockerfile copies — sync from `twitter-bot/` before build
- If provider caches old image → deploy on a different provider

### Project Structure

```
buzz-bd-agent/
├── api/                    # REST API (72 endpoints)
│   ├── server.js           # Express server
│   ├── db.js               # SQLite schema + migrations (20 tables)
│   ├── routes/             # 13 route modules
│   └── migrations/         # Strategic orchestrator tables
├── bake/                   # Docker build sources
│   ├── twitter-bot/        # Twitter Bot v3.1 (856 lines)
│   ├── skills/             # OpenClaw skills (20)
│   ├── cron/               # Cron jobs (18)
│   ├── config/             # Strategic config + content calendar
│   └── memory/             # Seed memory files
├── skills/                 # Agent context slims + cost guard
├── config/                 # Decision rules + scoring rubric
├── prompts/                # Enhanced prompts
├── acp/                    # ACP/Virtuals offerings (4 services)
├── entrypoint.sh           # 16-block boot sequence
├── Dockerfile              # OpenClaw 2026.3.7 + OPENCLAW_EXTENSIONS
└── README.md               # This file
```

---

## 🐝 Supermemory

Persistent semantic memory via [@supermemory/openclaw-supermemory](https://supermemory.ai).

| Setting | Value |
|---------|-------|
| Container | `buzz_bd_agent` |
| Auto-Recall | true (5 results per query, 50ms) |
| Auto-Capture | true (with 12-pattern security filter) |
| Custom Containers | `buzz_contacts`, `buzz_patterns`, `buzz_decisions` |

Every scan makes the next one smarter. Every decision teaches the system. Every outcome feeds the loop.

---

## 🐝 JVR Receipt System

Every completed action generates a verifiable receipt.

| Setting | Value |
|---------|-------|
| Buzz Prefix | `BZZ-` |
| Sentinel Prefix | `SNT-` |
| Format | `BZZ-{YYYY}-{MMDD}-{SEQ}` |
| API | `POST /api/v1/receipts` |
| Categories | scan, score, pipeline, outreach, decision, diagnostic, deploy |

---

## 🐝 Revenue Stack

| Channel | Rate | Status |
|---------|------|--------|
| Listing Commission | $1,000/listing | ✅ Active |
| Bankr Partner Fees | 18.05% of 1.2% swap | ✅ Active |
| Creator Fees | 75.05% of 1.2% (own tokens) | ✅ Active |
| ACP Marketplace | Per-query USDC (4 services) | ✅ Active |
| BaaS | $29/$49/$99 subscription tiers | 🔵 Planned |

---

## 🐝 Version History

| Version | Date | Highlights |
|---------|------|------------|
| **v7.2.0** | **Mar 9, 2026** | **OpenClaw 3.7, Supermemory CONNECTED, Twitter v3.1 Premium, fresh Serper+Grok keys, DexScreener /tokens/v1/ fix, boogle.cloud, JVR active, $22→$5 cost reduction** |
| v7.1.1 | Mar 8, 2026 | Port migration, Sentinel re-wired, skills rewrite |
| v7.1.0 | Mar 7, 2026 | Strategic Orchestrator, Cost Guard, 18 crons, 72 endpoints, 20 tables |
| v6.3.0 | Mar 4, 2026 | Solid foundation, Twitter Bot v3.1, 40 crons |
| v6.0.19 | Mar 2, 2026 | 5 parallel sub-agents LIVE on production |
| v6.0.17 | Mar 1, 2026 | Bankr LLM Gateway, self-sustaining inference |
| v5.3.8 | Feb 22, 2026 | Last pre-sprint version |
| v1.0.0 | Feb 1, 2026 | First deployment on Akash Network |

---

## 🐝 The Story

Buzz was built from scratch by [Ogie](https://linkedin.com/in/howtobecomeachef/) — a 20+ year Executive Chef who transitioned to crypto BD. No CS degree. No engineering team. Just conversational collaboration with [Claude](https://anthropic.com) (Opus 4.6), building one feature at a time from a phone in Indonesia during Ramadan.

From first deploy (Feb 1, 2026) to fully autonomous BD pipeline (v7.2.0) in 37 days.

**Total infrastructure cost:** ~$6.58/month
**Revenue target:** $5,000/listing

---

## 🐝 Links

| Platform | URL |
|----------|-----|
| **SolCex Exchange** | [solcex.io](https://solcex.io) |
| **Docs** | [docs.solcex.cc](https://docs.solcex.cc) |
| **Twitter** | [@BuzzBySolCex](https://x.com/BuzzBySolCex) |
| **SolCex Twitter** | [@SolCex_Exchange](https://x.com/SolCex_Exchange) |
| **Telegram Bot** | [@BuzzBySolCex_bot](https://t.me/BuzzBySolCex_bot) |
| **Builder** | [@hidayahanka1](https://x.com/hidayahanka1) |

---

## 🐝 License

Proprietary — SolCex Exchange. All rights reserved.

---

*🐝 "Identity first. Intelligence deep. Commerce autonomous. Cost disciplined. Strategy embedded. Memory persistent."*

*Buzz BD Agent v7.2.0 — Sprint Day 17 | Mar 9, 2026 | Jakarta, Indonesia*
