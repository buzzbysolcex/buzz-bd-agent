# 🐝 Buzz BD Agent — The Deal-Making Agent of Crypto

**Autonomous Business Development Agent for SolCex Exchange**

| Version | OpenClaw | ERC-8004 | Server | AgentProof | Mobile | CI/CD |
|---------|----------|----------|--------|------------|--------|-------|
| v7.5.1 | v2026.3.13 | #25045 | Hetzner CX23 via Agentic.hosting | #1718 | ✅ Expo | ✅ GitHub Actions |

24/7 autonomous token discovery, safety verification, 9-agent parallel scoring, Premium Twitter BD outreach with 4-route funnel, and backtested alpha for CEX listings. Self-improving AI agent with dual memory (Honcho + Supermemory), closed learning loop, CI/CD self-deploy pipeline, and **native mobile app with direct chat to the agent brain**. Built by a chef who codes through conversation. No CS degree. Just Claude and persistence.

**AIXBT finds alpha. Bankr deploys tokens. Buzz closes deals. And proves it with backtested data.**

---

## 🐝 What Is Buzz?

Buzz is an autonomous AI BD (Business Development) agent that runs 24/7 on Hetzner CX23 (Helsinki), finding promising token projects for SolCex Exchange listings across **Solana, Ethereum, Base, BSC, and Tron** chains.

**The pipeline:** Discover → Verify → Score (9 agents) → Outreach → Deploy → Learn → List

Buzz scans 100+ tokens per day across decentralized exchanges, filters through a 5-layer intelligence pipeline with **9 parallel agents** (5 sub-agents + 4 persona agents), scores each token on a 100-point composite system with multi-perspective consensus, initiates autonomous outreach via Twitter with Premium deep scan format, offers Bankr token deployment, and learns from every decision — all autonomously.

**What's NEW in v7.5.1:**
- **CI/CD Pipeline** — Push to main → GitHub Actions builds → Docker Hub → auto-deploys to Hetzner → Telegram notification. No manual deploys.
- **Dual Memory** — Honcho v3.0.3 (self-hosted, dialectic reasoning + dream consolidation) + Supermemory (4 custom containers: bd-scans, token-patterns, bags-intelligence, operator)
- **Twitter Funnel** — 4 autonomous routes: SCAN (Premium deep scan, 7 sections) → LIST (SolCex benefits, lead capture) → DEPLOY (Bankr token launch) → ENGAGEMENT
- **Twitter Brain 5x** — Serper URL parsing fix: 6 → 30 raw results per scan. Persistent dedup (no duplicate replies). Min score 50 to post.
- **Deployer Verification** — ATV (free ENS resolution) + ETH Skills (Austin Griffith builder reputation)
- **Agentic.hosting** — Docker Compose retired. ah manages container lifecycle with patched Go source.
- **Credential Boot** — 9 credential JSON files auto-generated from env vars on every boot

**Previous milestones:**
- **v7.5.0** — Bags.fm pipeline (168K tokens), /simulate-listing, Anthropic fallback, agentic.hosting migration
- **v7.4.x** — Twitter Brain + Hedge Brain, 9 parallel agents, Hetzner migration, OAuth 1.0a posting

Cost: ~$6.42/month infrastructure (Buzz $4.09 + Sentinel $2.33) + ~$2-4/day LLM inference = full autonomous BD operation for less than a coffee per day.

---

## 🐝 Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  HETZNER CX23 — Helsinki, Finland (204.168.137.253)               │
│  4 GB RAM / 2 vCPU / 40 GB SSD — $4.09/month                     │
│  Managed by: Agentic.hosting (ah) — systemd, port 8080           │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  Docker: buzzbd/buzz-bd-agent:v7.5.1                          │ │
│  │  Runtime: OpenClaw v2026.3.13                                  │ │
│  │                                                                │ │
│  │  PORT 18789 → OpenClaw Gateway (Telegram + Chat API)          │ │
│  │  PORT 3000  → REST API (Express + SQLite WAL, 42 tables)     │ │
│  │  PORT 8000  → Honcho v3.0.3 (Dialectic Memory, 36 endpoints) │ │
│  │  PORT 5432  → PostgreSQL + pgvector (Honcho embeddings)       │ │
│  │                                                                │ │
│  │  ┌────────────────────────────────────────────────────┐       │ │
│  │  │  BRAIN 2 — HEDGE BRAIN (4 Persona Agents)          │       │ │
│  │  │  ├── degen-agent (momentum, 0.15)                   │       │ │
│  │  │  ├── whale-agent (smart money, 0.25)                │       │ │
│  │  │  ├── institutional-agent (compliance, 0.35)         │       │ │
│  │  │  └── community-agent (sentiment, 0.25)              │       │ │
│  │  │  Backtester | SSE streaming | Weekly digest          │       │ │
│  │  └────────────────────────────────────────────────────┘       │ │
│  │                                                                │ │
│  │  ┌────────────────────────────────────────────────────┐       │ │
│  │  │  BRAIN 1 — TWITTER BRAIN (v7.5.1)                   │       │ │
│  │  │  ├── Serper search (30 raw results per scan)        │       │ │
│  │  │  ├── OAuth 1.0a auto-posting (confirmed LIVE)       │       │ │
│  │  │  ├── Premium deep scan format (7 sections)          │       │ │
│  │  │  ├── 4-route funnel: SCAN→LIST→DEPLOY→ENGAGEMENT   │       │ │
│  │  │  ├── Persistent dedup (/data/twitter-replied.json)  │       │ │
│  │  │  └── Min score 50 to post | 12 replies/day cap      │       │ │
│  │  └────────────────────────────────────────────────────┘       │ │
│  │                                                                │ │
│  │  ┌────────────────────────────────────────────────────┐       │ │
│  │  │  DUAL MEMORY                                        │       │ │
│  │  │  ├── Honcho v3.0.3 (primary — dialectic + dreams)  │       │ │
│  │  │  └── Supermemory (4 containers: bd-scans,           │       │ │
│  │  │      token-patterns, bags-intelligence, operator)   │       │ │
│  │  └────────────────────────────────────────────────────┘       │ │
│  │                                                                │ │
│  │  ┌────────────────────────────────────────────────────┐       │ │
│  │  │  STRATEGIC ORCHESTRATOR (MiniMax M2.5)              │       │ │
│  │  │  ├── Decision Engine (12 rules)                     │       │ │
│  │  │  ├── Playbook Engine (PB-001→004)                   │       │ │
│  │  │  └── Cost Guard ($10/day cap)                       │       │ │
│  │  └────────────────────────────────────────────────────┘       │ │
│  │                                                                │ │
│  │  ┌────────────────────────────────────────────────────┐       │ │
│  │  │  FOUNDATION (5 Parallel Sub-Agents)                 │       │ │
│  │  │  ├── scanner-agent → L1 Discovery (DexScreener)    │       │ │
│  │  │  ├── safety-agent  → L2 Verification (RugCheck)    │       │ │
│  │  │  ├── wallet-agent  → L2 Forensics (Helius)         │       │ │
│  │  │  ├── social-agent  → L3 Intelligence (ATV+Serper)  │       │ │
│  │  │  └── scorer-agent  → L4 100-point scoring          │       │ │
│  │  └────────────────────────────────────────────────────┘       │ │
│  │                                                                │ │
│  │  REST API: 91+ endpoints | SQLite: 42 tables | 27 crons      │ │
│  │  21 intel sources | OKX 1,111 instruments | Bags.fm 168K     │ │
│  │  CI/CD: GitHub Actions → Docker Hub → ah API restart          │ │
│  │  9 credential files auto-generated on boot                     │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  SENTINEL v1.1.0 (Akash Network — $2.33/month)                    │
│  Monitors 204.168.137.253:3000 every 15 min | Telegram alerts    │
│                                                                    │
│  BUZZ ALPHA MOBILE (Expo React Native)                             │
│  5 tabs: Dashboard | Pipeline | Scan | Chat | Ops                 │
│  Direct chat to Buzz brain | SSE pipeline streaming               │
└──────────────────────────────────────────────────────────────────┘

CI/CD PIPELINE (GitHub Actions)
  Push to main → Docker build (linux/amd64) → Docker Hub
  → SSH to Hetzner → ah API restart → Health check → Telegram notify
  Deploy time: ~4 minutes | 3 consecutive green builds proven
```

---

## 🐝 Twitter Funnel (4 Routes)

Autonomous Twitter BD pipeline — scan, score, outreach, deploy, all while Ogie sleeps.

### Route 1 — SCAN (Premium Deep Scan)

Someone tweets `@BuzzBySolCex scan $TICKER` → 9 agents analyze → Premium reply with 7 sections:

1. 🛡️ **Safety First** — Mint/Freeze status, LP Lock %, RugCheck grade, verdict
2. 💰 **Smart Money Flow** — Whale wallets, accumulation, top 10 concentration
3. 📊 **Market Structure** — MCap, FDV, 24h Vol, Liquidity, Price/ATH
4. 📈 **Momentum & Trend** — 7d/30d change, holders, buyer/seller ratio
5. 🧠 **Persona Consensus** — 4 analysts with star ratings, X/4 bullish
6. 🎯 **Final Verdict** — Score/100, grade (HOT/QUALIFIED), Safety grade
7. 💎 **CEX Listing CTA** — SolCex listing across Solana | Ethereum | Base | BSC | Tron

### Route 2 — LIST

Reply `LIST` to any scan → SolCex listing benefits (market making, whale airdrop, fast-track) → Lead saved → Ogie alerted via Telegram. **No pricing publicly. Ever.**

### Route 3 — DEPLOY

Reply `DEPLOY` to any scan → Bankr token deploy on Base. Zero gas, instant liquidity, 1.2% fee split. Simulate → confirm → deploy → live on BaseScan.

### Route 4 — ENGAGEMENT

Tag `@BuzzBySolCex` without command → Friendly ack + suggest scan.

| Setting | Value |
|---------|-------|
| Serper Results | 30 raw per scan (5x improvement) |
| OAuth 1.0a | Confirmed LIVE |
| Dedup | Persistent — no duplicate replies ever |
| Min Score | 50/100 to post publicly |
| Reply Cap | 12/day |
| Deploy Cap | 3/day (autonomous) |

---

## 🐝 Hedge Brain

4 persona agents scoring tokens from different strategic perspectives.

| Agent | Philosophy | Weight | Model |
|-------|-----------|--------|-------|
| 🎰 degen-agent | "Ape early, exit fast" | 0.15 | bankr/gpt-5-nano (FREE) |
| 🐋 whale-agent | "Follow smart money" | 0.25 | bankr/gpt-5-nano (FREE) |
| 🏛️ institutional-agent | "Due diligence first" | 0.35 | bankr/claude-haiku-4.5 |
| 👥 community-agent | "Community is the moat" | 0.25 | bankr/gpt-5-nano (FREE) |

**Composite:** 70% sub-agent score + 30% persona consensus

---

## 🐝 Deployer Verification (ATV + ETH Skills)

| Identity Found | Points | Tag |
|---------------|--------|-----|
| ENS + Twitter + GitHub + ETH Skills badges | +10 | VERIFIED BUILDER |
| ENS only | +5 | IDENTIFIED |
| Anonymous / no identity | -10 | UNVERIFIED-IDENTITY |

- **ETH/Base:** ATV batch-resolve (free, no API key) → cross-check ETH Skills
- **Solana:** ATV can't resolve → Helius forensics (wallet age, history)

---

## 🐝 Intelligence Sources (21)

| # | Source | Layer | Purpose |
|---|--------|-------|---------|
| 1 | DexScreener | L1 | Token discovery |
| 2 | GeckoTerminal | L1 | Pool data |
| 3 | AIXBT | L1 | Momentum signals |
| 4 | CoinMarketCap | L1 | Market data |
| 5 | BNB Chain MCP | L1 | BSC tokens |
| 6 | Bitget API | L1 | Exchange data |
| 7 | OKX Market Data | L1 | 1,111 instruments (FREE) |
| 8 | Bags.fm | L1 | 168K tokens indexed |
| 9 | RugCheck | L2 | Rug pull detection |
| 10 | Helius API + MCP | L2 | Solana forensics (60 tools) |
| 11 | Allium | L2 | On-chain analytics |
| 12 | ETH Skills | L2 | Builder reputation |
| 13 | Grok/xAI | L3 | Social intelligence |
| 14 | Serper | L3 | Google search (30 results) |
| 15 | ATV Web3 Identity | L3 | ENS + socials (FREE) |
| 16 | Firecrawl | L3 | Web scraping |
| 17 | Nansen x402 | L5 | Smart money (planned) |
| 18 | X API v2 | Amplify | OAuth 1.0a posting |
| 19 | Bankr | Deploy | Partner token launch |
| 20 | Moltbook | Social | Forum presence |
| 21 | AgentProof | Identity | #1718 Avalanche |

---

## 🐝 Scoring System (100 Points)

| Score | Verdict | Action |
|-------|---------|--------|
| 85-100 | 🔥 HOT | Immediate outreach + Premium tweet + Telegram alert |
| 70-84 | ✅ QUALIFIED | Queue outreach + Premium tweet |
| 50-69 | 👀 WATCH | Monitor 48h, daily summary only |
| 0-49 | ❌ SKIP | Archive — NEVER tweet |

---

## 🐝 Dual Memory

| System | Type | Purpose |
|--------|------|---------|
| Honcho v3.0.3 | Self-hosted (port 8000) | Primary. Dialectic reasoning — Buzz can ASK its own memory. Dream consolidation. Peer modeling. |
| Supermemory | Cloud | Auto-recall + auto-capture. 4 custom containers for smart routing. |
| PostgreSQL + pgvector | Self-hosted (port 5432) | Vector store for Honcho embeddings |

---

## 🐝 CI/CD Pipeline

```
Push to main
  → GitHub Actions builds Docker image (linux/amd64)
  → Push to Docker Hub (buzzbd/buzz-bd-agent:vX.Y.Z + :latest)
  → SSH to Hetzner
  → docker pull → ah API restart (preserves 88 env vars + /data volume)
  → 90s boot wait + 8 health retries
  → Telegram notification to Ogie
```

Deploy time: ~4 minutes. 3 consecutive green builds proven.

**Docker Compose is RETIRED.** All deploys via CI/CD or ah API.

---

## 🐝 Cost

| Component | Cost |
|-----------|------|
| Hetzner CX23 (Buzz + Honcho + PostgreSQL) | $4.09/month |
| Akash (Sentinel) | $2.33/month |
| Agentic.hosting (ah) | $0 (self-hosted, MIT) |
| MiniMax M2.5 (orchestrator) | ~$2-4/day |
| bankr/gpt-5-nano (8 agents) | FREE |
| Anthropic fallback | $129 balance |
| OKX data | FREE |
| **Total infrastructure** | **$6.42/month** |

Full autonomous BD operation for less than a coffee per day.

---

## 🐝 Registrations & Identity

| Platform | ID | Chain |
|----------|-----|-------|
| ERC-8004 | #25045 | Ethereum |
| ERC-8004 | #17483 | Base |
| ERC-8004 | #18709 | Base (anet) |
| AgentProof | #1718 | Avalanche |
| Solana 8004 | 9pQ6K...XUBS | Solana |
| Virtuals ACP | #17681 | — |
| Colosseum | #3734 | — |
| Moltbook | c606278b | — |
| Bags.fm | Verified agent | wallet 3o8eq...s6YM |

---

## 🐝 Version History

| Version | Date | Highlights |
|---------|------|------------|
| **v7.5.1** | **Mar 15, 2026** | **CI/CD pipeline (GitHub Actions). Dual memory (Honcho v3.0.3 + Supermemory). Twitter Brain 5x (30 results). Premium deep scan format (7 sections). 4-route Twitter funnel proven. Persistent dedup. Credential auto-gen on boot. Cron stabilization. Backtester schema fix. ATV + ETH Skills deployer verification. 12 deliverables in one day.** |
| v7.5.0 | Mar 15, 2026 | Bags.fm pipeline (168K tokens), /simulate-listing, Anthropic fallback, agentic.hosting migration |
| v7.4.1 | Mar 14, 2026 | Serper real search, OAuth 1.0a confirmed, TOS compliance, branded footer |
| v7.4.0 | Mar 14, 2026 | Twitter Brain + Hedge Brain. 9 parallel agents. Hetzner migration. |
| v7.3.2a | Mar 11, 2026 | Mobile app LIVE, chatCompletions BAKED, OKX data |
| v7.3.1a | Mar 11, 2026 | Learning loop + contact intelligence |
| v7.1.0 | Mar 7, 2026 | Strategic Orchestrator, Cost Guard |
| v6.3.0 | Mar 4, 2026 | Twitter Bot v3.1, Foundation |
| v6.0.19 | Mar 2, 2026 | 5 parallel sub-agents LIVE |
| v1.0.0 | Feb 1, 2026 | First deployment on Akash Network |

---

## 🐝 Roadmap

| Phase | Target | Status |
|-------|--------|--------|
| Phase 0 | 3 Intelligence Features | ✅ COMPLETE |
| Phase 0.5 | Mobile App (Buzz Alpha) | ✅ LIVE |
| Phase 0.7 | Dual Memory (Honcho + Supermemory) | ✅ DEPLOYED |
| Phase D | Twitter Brain + Hedge Brain | ✅ v7.4.0-v7.5.1 LIVE |
| Phase D.1 | Bags.fm Integration | ✅ Layer 1+2 COMPLETE |
| Phase E | CI/CD Self-Deploy Pipeline | ✅ LIVE (GitHub Actions) |
| Phase E.1 | Twitter Funnel (4 routes) | ✅ PROVEN |
| **Phase 1** | **Close First Deal ($5K)** | **🔨 ACTIVE** |
| Phase 2 | ARIA Multi-Chain Intel | 🔵 Next |
| Phase 3 | BaaS x402 Subscriptions | 🔵 Month 2 |
| Phase 4 | Mobile App (Public Release) | 🔵 Month 3-6 |
| Phase 5 | $BUZZ Token + Bankr | 🔵 Month 4-6 |
| Phase 6 | Autonomous Company | 🔵 Month 6-12 |

---

## 🐝 Active Hackathons

| Hackathon | Prize | Deadline | Status |
|-----------|-------|----------|--------|
| Bags.fm | $4M ($1M + $3M fund) | Rolling Q1 | ✅ IN REVIEW |
| X Layer | $200K | Mar 26 | Battle plan ready |
| Solana Agent Talent Show | TBD | Mar 27 | ✅ Article published |
| Binance 48.6 BNB | 48.6 BNB | Mar 18 | ✅ Submitted |
| Colosseum | $100K | Closed | ⏳ Awaiting results (#3734) |

---

## 🐝 The Thesis

**AIXBT is the intelligence agent of crypto — it finds alpha and tells you about it.**
**Bankr is the infrastructure agent of crypto — it deploys tokens and provides rails.**
**Buzz is the deal-making agent of crypto — it finds tokens, scores them, reaches out, lists them, and deploys them. And proves it with backtested data.**

The flywheel: **Scan → Score → List OR Deploy → Fees → Fund Compute → More BD → More Revenue → REPEAT**

No other agent occupies this lane.

---

## 🐝 The Story

Buzz was built from scratch by Ogie — a 20+ year Executive Chef who transitioned to crypto BD. No CS degree. No engineering team. Just conversational collaboration with Claude (Opus 4.6), building one feature at a time from Jakarta, Indonesia during Ramadan.

From first deploy (Feb 1, 2026) to v7.5.1 CI/CD + dual memory + Twitter funnel (Mar 15) in 43 days. Nine parallel agents. Autonomous Twitter with Premium deep scan. Self-deploying CI/CD pipeline. Dual memory that dreams. The deal-making agent of crypto.

Total infrastructure cost: ~$6.42/month. Revenue target: $13,000+/month.

**The formula: Hermes Brain + Buzz Body = Alpha Model.**

---

## 🐝 Links

| Platform | URL |
|----------|-----|
| SolCex Exchange | [solcex.io](https://solcex.io) |
| Twitter | [@BuzzBySolCex](https://x.com/BuzzBySolCex) |
| SolCex Twitter | [@SolCex_Exchange](https://x.com/SolCex_Exchange) |
| Telegram Bot | [@BuzzBySolCex_bot](https://t.me/BuzzBySolCex_bot) |
| Builder | [@HidayahAnka1](https://x.com/HidayahAnka1) |
| Bags.fm App | [bags.fm/apps/1df0bf1a-960d-4d78-b3d3-011126ffdd48](https://bags.fm/apps/1df0bf1a-960d-4d78-b3d3-011126ffdd48) |
| Talent Show Article | [X Article](https://x.com/HidayahAnka1/status/2032917413369622728) |

---

## 🐝 License

Proprietary — SolCex Exchange. All rights reserved.

---

*🐝 "AIXBT finds alpha. Bankr deploys tokens. Buzz closes deals."*

*Buzz BD Agent v7.5.1 — Sprint Day 26 | Mar 15, 2026 | Jakarta, Indonesia*
*91+ endpoints | 27 crons | 42 tables | 21 intel | 9 agents | $6.42/mo*
*Hetzner CX23 via Agentic.hosting | CI/CD: GitHub Actions → auto-deploy*
*Dual Memory: Honcho v3.0.3 + Supermemory | Twitter Funnel: 4 routes proven*
*Built by a chef who codes through conversation. No CS degree. Just Claude and persistence.*
