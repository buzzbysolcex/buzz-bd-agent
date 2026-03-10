# 🐝 Buzz BD Agent — Alpha Buzz
### Autonomous Business Development Agent for SolCex Exchange

[![Version](https://img.shields.io/badge/version-v7.3.1a-blue)]() [![OpenClaw](https://img.shields.io/badge/OpenClaw-v2026.3.7-green)]() [![ERC-8004](https://img.shields.io/badge/ERC--8004-%2325045-purple)]() [![Akash](https://img.shields.io/badge/Akash-boogle.cloud-orange)]() [![AgentProof](https://img.shields.io/badge/AgentProof-%231718-red)]()

24/7 autonomous token discovery, safety verification, scoring, and outreach for CEX listings. Self-improving AI agent with closed learning loop, contact intelligence, and FTS5 memory search. Built by a chef who codes through conversation. No CS degree. Just Claude and persistence.

**Alpha Buzz = Hermes Brain + Buzz Body.** Cherry-picked Nous Research's Hermes Agent intelligence concepts into Buzz's commercial architecture. Phase 0 Complete.

---

## 🐝 What Is Buzz?

Buzz is an autonomous AI BD (Business Development) agent that runs 24/7 on Akash Network, finding promising token projects for SolCex Exchange listings across Solana, Base, and BSC chains.

**The pipeline:** Discover → Verify → Score → Outreach → **Learn** → List

Buzz scans 100+ tokens per day across decentralized exchanges, filters through a 5-layer intelligence pipeline with parallel sub-agents, scores each token on a 100-point system, initiates outreach to qualified projects, and **learns from every decision** — all autonomously.

**Cost:** ~$12.72/month infrastructure (Buzz + Sentinel) + ~$3-5/day LLM inference = full autonomous BD operation for less than a coffee per day.

---

## 🐝 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  AKASH NETWORK — provider.boogle.cloud                       │
│  4 CPU / 8GB RAM / 10GB persistent                           │
│  Cost: ~$9.53/month                                          │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Docker: ghcr.io/buzzbysolcex/buzz-bd-agent:v7.3.1a     │ │
│  │  Runtime: OpenClaw v2026.3.7                              │ │
│  │                                                           │ │
│  │  PORT 18789 → OpenClaw Gateway (Telegram)                │ │
│  │  PORT 3000  → REST API v3.1.0 (Express+SQLite)           │ │
│  │                                                           │ │
│  │  ┌─────────────────────────────────────────────────┐     │ │
│  │  │  LAYER 3: ALPHA INTELLIGENCE (Hermes Cherry-Pick)│    │ │
│  │  │  ├── Skill Reflection (12h learning loop)        │    │ │
│  │  │  ├── Skill Evolution (+1/-1 effectiveness)       │    │ │
│  │  │  ├── Contact Intelligence (Honcho-style BD)      │    │ │
│  │  │  ├── FTS5 Memory Search (BM25 cross-session)     │    │ │
│  │  │  ├── Operator Profile (preferences + prayer)     │    │ │
│  │  │  └── Block 11B (auto-load learned skills)        │    │ │
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
│  │  REST API: 91 endpoints | SQLite: 28 tables              │ │
│  │  Twitter Bot v3.1: Premium SCAN + LIST + DEPLOY          │ │
│  │  42 Cron Jobs | 19+ Intelligence Sources                  │ │
│  │  Gmail OAuth | JVR Receipt System                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  SENTINEL v1.1.0 (separate container)                        │
│  provider.cpu.phl.aes.akash.pub                              │
│  Monitors 91 endpoints | 3 health crons | Telegram alerts    │
│  /alpha-status endpoint for Phase 0 monitoring               │
│  Cost: ~$3.19/month                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 🐝 Alpha Intelligence (Phase 0 — Complete)

The Alpha Model cherry-picks three breakthrough capabilities from [Hermes Agent](https://hermes-agent.nousresearch.com/) (Nous Research) into Buzz's commercial architecture.

| Feature | What It Does | Status |
|---------|-------------|--------|
| **Closed Learning Loop** | Reviews pipeline patterns every 12h, auto-creates skills from experience | ✅ Live |
| **Skill Self-Improvement** | Tracks skill effectiveness (+1/-1), marks proven vs needs-review | ✅ Live |
| **Contact Intelligence** | Builds deepening profiles of every token team contacted | ✅ Live |
| **FTS5 Memory Search** | SQLite full-text search across all pipeline decisions (BM25 ranking) | ✅ Live |
| **Operator Profile** | Models operator preferences, prayer times, approval patterns | ✅ Live |
| **Block 11B** | Auto-loads learned skills on boot — survives redeploys | ✅ Live |

---

## 🐝 Intelligence Pipeline (5 Layers)

| Layer | Agent | Sources | Purpose |
|-------|-------|---------|---------|
| L1 | scanner-agent | DexScreener, GeckoTerminal, AIXBT, CMC, BNB MCP, Bitget | Token discovery across SOL/BASE/BSC |
| L2 | safety-agent | RugCheck, ethskills.com, Contract Auditor | Honeypot detection, contract verification |
| L2 | wallet-agent | Helius (60 tools), Allium | Deployer forensics, holder analysis |
| L3 | social-agent | Grok/xAI, Serper, ATV Web3 Identity, Firecrawl | Community health, deployer identity |
| L4 | scorer-agent | 100-point composite (11 factors) | Final score + verdict |

### Sub-Agent Real Code

```
/opt/buzz-api/services/
├── orchestrator.js          ← 242 lines, Promise.allSettled parallel dispatch
├── agents/
│   ├── scanner.js           ← DexScreener, GeckoTerminal, CMC
│   ├── safety.js            ← RugCheck, contract verification
│   ├── wallet.js            ← Helius forensics, holder analysis
│   ├── social.js            ← Grok, Serper, ATV, Firecrawl
│   └── scorer.js            ← 100-point composite scoring
```

**Weights:** safety(0.30) + wallet(0.30) + social(0.20) + scorer(0.20) = 1.0

Built with Claude Code + Superpowers (obra). 602 tests passing.

---

## 🐝 Strategic Orchestrator

| Component | Function |
|-----------|----------|
| **Decision Engine** | 12 rules handle 90% of decisions with zero LLM cost |
| **Playbook Engine** | 4 state machines (Discovery → Outreach → Negotiation → Post-Listing) |
| **Context Engine** | Assembles max 8K tokens per LLM call (down from 250K) |
| **Supermemory** | 50ms semantic recall, 3 custom containers |

---

## 🐝 Scoring System (100 Points)

| Score | Verdict | Action |
|-------|---------|--------|
| 85-100 | 🔥 HOT | Immediate outreach |
| 70-84 | ✅ QUALIFIED | Queue outreach 24h |
| 50-69 | 👀 WATCH | Monitor 48h, auto-rescan |
| 0-49 | ❌ SKIP | Archive |

---

## 🐝 Cost Guard

| Metric | Value |
|--------|-------|
| Daily LLM cap | $10.00 (auto-throttle) |
| Orchestrator | MiniMax M2.5 (~$3-5/day) |
| Sub-agents (5) | bankr/gpt-5-nano (**FREE**) |
| Infrastructure | ~$12.72/month (Buzz + Sentinel) |
| Cost reduction | 78% ($22/day → $5/day) |

---

## 🐝 REST API

91 endpoints across 17 categories. Express + SQLite WAL.

| Category | Endpoints | Key Routes |
|----------|-----------|------------|
| Health | 7 | `GET /health`, `GET /health/db`, `GET /health/storage` |
| Pipeline | 9 | `GET /pipeline`, `POST /pipeline/tokens` |
| Strategy | 8 | `POST /strategy/decide`, `GET /strategy/rules` |
| Agents | 5 | `GET /agents`, `GET /agents/:id` |
| Scoring | 5 | `GET /scoring/history` |
| Score Token | 1 | `POST /score-token` (5-layer parallel) |
| Costs | 5 | `GET /costs/today` |
| Crons | 7 | `GET /crons` |
| Twitter | 5 | `GET /twitter/stats` |
| Receipts | 5 | `GET /receipts`, `POST /receipts` |
| Intel | 5 | `GET /intel/sources` |
| Wallets | 6 | `GET /wallets` |
| Webhooks | 5 | `POST /webhooks` |
| **Skills** | **8** | `GET /skills`, `GET /skills/reflect/status`, `POST /skills/reflect/trigger`, `GET /skills/effectiveness` |
| **Memory** | **3** | `GET /memory/search`, `POST /memory/index`, `GET /memory/stats` |
| **Operator** | **2** | `GET /operator/profile`, `PATCH /operator/profile` |
| **Contacts** | **6** | `GET /contacts`, `POST /contacts`, `POST /contacts/:project/interaction` |

---

## 🐝 Twitter Bot v3.1

Premium SCAN format with 5-layer intelligence report. Three revenue routes:

| Route | Trigger | Response |
|-------|---------|----------|
| SCAN | `@BuzzBySolCex scan $TICKER` | 5-layer Premium report (~1,100 chars) |
| LIST | Reply "LIST" to any scan | SolCex listing pitch → DM redirect |
| DEPLOY | Reply "DEPLOY" to any scan | Token deployment on Base via Bankr |

Every scan reply is a sales funnel. The scan is the hook, the CTA is the close.

---

## 🐝 LLM Stack

| Role | Model | Cost |
|------|-------|------|
| Orchestrator | MiniMax M2.5 | $0.30/$1.50 per 1M tokens |
| Sub-agents (5) | bankr/gpt-5-nano | $0.10/$0.40 per 1M tokens |
| Fallback 1 | bankr/claude-haiku-4.5 | $0.80/$4.00 per 1M tokens |
| Fallback 2 | bankr/gemini-3-flash | Near-free |

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

---

## 🐝 Cron Schedule (42 Active)

### Scanning (9 jobs)

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
| bitget-listings-intel | `0 */8 * * *` | Bitget CEX cross-reference |

### Operations (5 jobs)

| Job | Schedule | Description |
|-----|----------|-------------|
| pipeline-status | `0 1 * * *` | Daily pipeline report |
| pipeline-weekly | `0 12 * * 0` | Weekly summary |
| daily-pipeline | `0 */2 * * *` | Pipeline health check |
| morning-reminder | `0 5 * * *` | Daily briefing |
| evening-review | `0 18 * * *` | End of day review |

### Learning Loop (1 job)

| Job | Schedule | Description |
|-----|----------|-------------|
| skill-reflect | `0 */12 * * *` | Review patterns, create/patch learned skills |

### Prayer Reminders (5 jobs)

| Prayer | WIB Time | UTC Schedule |
|--------|----------|-------------|
| Fajr | 04:30 | `30 21 * * *` |
| Dhuhr | 11:45 | `45 4 * * *` |
| Asr | 15:00 | `0 8 * * *` |
| Maghrib | 17:45 | `45 10 * * *` |
| Isha | 19:00 | `0 12 * * *` |

### Additional (22+ jobs)
Twitter polling, ACP heartbeat, Moltbook posting, AgentProof telemetry, cost tracking, strategic reviews, and more.

---

## 🐝 Intelligence Sources (19+)

**Layer 1 — Discovery:**
DexScreener /tokens/v1/ | GeckoTerminal | AIXBT | DexScreener Boosts | CoinMarketCap | BNB Chain MCP | Bitget Listings API

**Layer 2 — Safety:**
RugCheck | Helius MCP (60 tools) | Allium | ethskills.com

**Layer 3 — Social:**
Grok/xAI | Serper | ATV Web3 Identity (ENS + socials) | Firecrawl

**Layer 4+ — Identity & Smart Money:**
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
cp cron/jobs.json bake/cron/jobs.json       # ALWAYS sync crons
rm -rf api/node_modules api/package-lock.json
docker build -t ghcr.io/buzzbysolcex/buzz-bd-agent:v7.3.1a .
docker push ghcr.io/buzzbysolcex/buzz-bd-agent:v7.3.1a
```

Then in Akash Console: **Close + New Deployment** with updated SDL on **boogle.cloud**.

### Important Notes

- **ALWAYS Close + New** — NEVER Update Deployment (Supermemory fails)
- Use `--no-cache` ONLY for Dockerfile/npm changes (file-only = fast cached build)
- **boogle.cloud** is the stable provider
- After deploy: patch `sessions_spawn` in Akash shell if sub-agents blocked
- Send activation directive to @BuzzBySolCex_bot on Telegram

---

## 🐝 Project Structure

```
buzz-bd-agent/
├── api/                    # REST API (91 endpoints)
│   ├── server.js           # Express server
│   ├── db.js               # SQLite schema + migrations (28 tables)
│   ├── routes/             # 17 route modules
│   │   ├── health.js       # Health (alpha: true, phase0_features)
│   │   ├── skills.js       # Skills + reflect + effectiveness
│   │   ├── memory.js       # FTS5 search
│   │   ├── operator.js     # Operator profile
│   │   ├── contacts.js     # Contact intelligence
│   │   └── ...             # pipeline, scoring, strategy, etc.
│   ├── services/
│   │   ├── orchestrator.js        # 242-line parallel dispatch
│   │   ├── agents/                # 5 sub-agent implementations
│   │   │   ├── scanner.js
│   │   │   ├── safety.js
│   │   │   ├── wallet.js
│   │   │   ├── social.js
│   │   │   └── scorer.js
│   │   ├── skill-reflect.js       # Learning loop engine
│   │   ├── skill-evolve.js        # Effectiveness tracking
│   │   ├── contact-intelligence.js # BD contact modeling
│   │   ├── memory-search.js       # FTS5 search
│   │   └── operator-profile.js    # Operator preferences
│   └── migrations/         # Strategic orchestrator tables
├── bake/                   # Docker build sources
│   ├── twitter-bot/        # Twitter Bot v3.1 (856 lines)
│   ├── skills/             # OpenClaw skills (20)
│   ├── cron/               # Cron jobs (42)
│   ├── config/             # Strategic config + content calendar
│   └── memory/             # Seed memory files
├── skills/                 # Agent context slims + cost guard
├── config/                 # Decision rules + scoring rubric
├── prompts/                # Enhanced prompts
├── acp/                    # ACP/Virtuals offerings (4 services)
├── entrypoint.sh           # 16-block boot sequence + Block 11B
├── Dockerfile              # OpenClaw 2026.3.7 + all baked skills
└── README.md               # This file
```

---

## 🐝 Supermemory

Persistent semantic memory via `@supermemory/openclaw-supermemory`.

| Setting | Value |
|---------|-------|
| Container | buzz_bd_agent |
| Auto-Recall | true (5 results per query, 50ms) |
| Auto-Capture | true (with 12-pattern security filter) |
| Custom Containers | buzz_contacts, buzz_patterns, buzz_decisions |

Every scan makes the next one smarter. Every decision teaches the system. Every outcome feeds the loop.

---

## 🐝 JVR Receipt System

Every completed action generates a verifiable receipt.

| Setting | Value |
|---------|-------|
| Buzz Prefix | BZZ- |
| Sentinel Prefix | SNT- |
| Format | BZZ-{HHMMSS}-{XXXXX} |
| API | `POST /api/v1/receipts` |
| Categories | scan, score, pipeline, outreach, decision, diagnostic, deploy, learning |

---

## 🐝 Sentinel (Ops Watchdog)

Separate container monitoring Buzz 24/7.

| Field | Value |
|-------|-------|
| Version | v1.1.0 (aligned with Alpha Buzz) |
| Image | `ghcr.io/buzzbysolcex/buzz-sentinel:v1.1.0` |
| Provider | cpu.phl.aes.akash.pub |
| Monitoring | 91 endpoints, 42 crons, 19+ intel sources |
| New | `/alpha-status` — checks all Phase 0 features in one call |
| Cost | ~$3.19/month |

Three-tier severity: 🟢 LOW (self-heal) | 🟡 MEDIUM (fix + notify) | 🔴 HIGH (SOS + fix steps)

---

## 🐝 Revenue Stack

| Channel | Rate | Status |
|---------|------|--------|
| Listing Commission | $1,000/listing | ✅ Active |
| Bankr Partner Fees | 18.05% of 1.2% swap | ✅ Active |
| Creator Fees | 75.05% of 1.2% (own tokens) | ✅ Active |
| ACP Marketplace | Per-query USDC (4 services) | ✅ Active |
| BaaS | $29/$49/$99 subscription tiers | 🔵 Planned (Month 2) |

---

## 🐝 Version History

| Version | Date | Highlights |
|---------|------|------------|
| **v7.3.1a** | **Mar 11, 2026** | **Alpha Buzz — Phase 0 Complete. Learning loop + skill-evolve + contact intelligence + FTS5 memory + operator profile. 91 endpoints, 42 crons, 28 tables. Sentinel v1.1.0 aligned.** |
| v7.3.0 | Mar 10, 2026 | BSC DexScreener fix, Bitget intel cron, 4 CPU / 8 GB upgrade, boogle.cloud |
| v7.2.5 | Mar 9, 2026 | Alpha Learning Loop (Feature 1), Binance+Bitget+CMC skills, social-agent fix |
| v7.2.0 | Mar 9, 2026 | OpenClaw 3.7, Supermemory CONNECTED, Twitter v3.1 Premium |
| v7.1.0 | Mar 7, 2026 | Strategic Orchestrator, Cost Guard, 18 crons, 72 endpoints |
| v6.3.0 | Mar 4, 2026 | Foundation, Twitter Bot v3.1, 40 crons |
| v6.0.19 | Mar 2, 2026 | 5 parallel sub-agents LIVE on production |
| v6.0.17 | Mar 1, 2026 | Bankr LLM Gateway, self-sustaining inference |
| v5.3.8 | Feb 22, 2026 | Last pre-sprint version |
| v1.0.0 | Feb 1, 2026 | First deployment on Akash Network |

---

## 🐝 Alpha Model Roadmap

| Phase | Target | Status |
|-------|--------|--------|
| **Phase 0** | 3 Intelligence Features | ✅ **COMPLETE** |
| **Phase 1** | Close First Deal ($5K) | 🔨 Active |
| Phase 2 | ARIA Multi-Chain Intel | 🔵 Mar 22-31 |
| Phase 3 | BaaS x402 Subscriptions | 🔵 Month 2 |
| Phase 4 | Mobile App (Rork Max) | 🔵 Month 3-6 |
| Phase 5 | $BUZZ Token + Bankr | 🔵 Month 4-6 |
| Phase 6 | Autonomous Company | 🔵 Month 6-12 |

---

## 🐝 The Story

Buzz was built from scratch by Ogie — a 20+ year Executive Chef who transitioned to crypto BD. No CS degree. No engineering team. Just conversational collaboration with Claude (Opus 4.6), building one feature at a time from a phone in Indonesia during Ramadan.

From first deploy (Feb 1, 2026) to Alpha Buzz (v7.3.1a) in 39 days. Three-layer architecture: Foundation → Strategic Orchestrator → Alpha Intelligence. Self-improving agent that learns from every scan, every score, every outreach.

**The formula:** Hermes Brain + Buzz Body = Alpha Model.

Total infrastructure cost: ~$12.72/month. Revenue target: $5,000/listing.

---

## 🐝 Links

| Platform | URL |
|----------|-----|
| SolCex Exchange | [solcex.io](https://solcex.io) |
| Docs | [docs.solcex.cc](https://docs.solcex.cc) |
| Twitter | [@BuzzBySolCex](https://twitter.com/BuzzBySolCex) |
| SolCex Twitter | [@SolCex_Exchange](https://twitter.com/SolCex_Exchange) |
| Telegram Bot | [@BuzzBySolCex_bot](https://t.me/BuzzBySolCex_bot) |
| Builder | [@hidayahanka1](https://twitter.com/hidayahanka1) |
| LinkedIn | [linkedin.com/in/howtobecomeachef](https://linkedin.com/in/howtobecomeachef) |

---

## 🐝 License

Proprietary — SolCex Exchange. All rights reserved.

---

🐝 *"Identity first. Intelligence deep. Commerce autonomous. Cost disciplined. Strategy embedded. Memory persistent. Learning continuous."*

**Buzz BD Agent v7.3.1a — Alpha Buzz (Phase 0 Complete) | Sprint Day 21 | Mar 11, 2026 | Jakarta, Indonesia**
