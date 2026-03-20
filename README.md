# 🐝 Buzz BD Agent — The Deal-Making Agent of Crypto

**Autonomous Business Development Agent for SolCex Exchange**

| Version | OpenClaw | ERC-8004 | Server | AgentProof | MicroBuzz | CI/CD |
|---------|----------|----------|--------|------------|-----------|-------|
| v7.7.0 | v2026.3.13 | #25045 | Hetzner CX23 via Agentic.hosting | #1718 | microbuzz.vercel.app/dashboard | ✅ GitHub Actions |

24/7 autonomous token discovery, **triple-verified** safety scoring, 10-agent parallel analysis, **MiniMax M2.7** orchestrator, **adversarial bull/bear debate**, **technical analysis (RSI/MACD)**, Premium Twitter BD outreach with 4-route funnel, MicroBuzz simulation engine with pipeline dashboard, **War Room Telegram command center**, revenue infrastructure with autonomous loop crons, 3-tier LLM cascade, **per-agent cost tracking**, and **BUZZ_RULES.md prompt hardening** for CEX listings. Self-improving AI agent with dual memory (Honcho + Supermemory), closed learning loop, CI/CD self-deploy pipeline, hybrid development swarm (Agent Teams + ClawTeam), and **4 public agent skills on skills.sh**. Built by a chef who codes through conversation. No CS degree. Just Claude and persistence.

**AIXBT finds alpha. Bankr deploys tokens. Buzz closes deals. And proves it with triple-verified simulation data.**

---

## 🐝 What Is Buzz?

Buzz is an autonomous AI BD (Business Development) agent that runs 24/7 on Hetzner CX23 (Helsinki), finding promising token projects for SolCex Exchange listings across **Solana, Ethereum, Base, BSC, and Tron** chains.

**The pipeline:** Discover → **Triple Verify** → Score (10 agents + technical analysis) → **Simulate (20 agents + adversarial debate)** → Outreach → Deploy → Learn → List

Buzz scans 100+ tokens per day across decentralized exchanges, filters through a 5-layer intelligence pipeline with **10 parallel agents** (5 sub-agents + 4 persona agents + 1 orchestrator), scores each token on a 100-point composite system with **5 dimensions (safety + wallet + social + scorer + technical)**, runs **20-agent MiroFish simulations with adversarial bull/bear debate and EV calculation**, initiates autonomous outreach via Twitter with Premium deep scan format, offers Bankr token deployment, and learns from every decision — all autonomously. **Managed from anywhere via Telegram War Room.**

**No data surfaces without triple verification. Our credibility is our product.**

**What's NEW in v7.7.0 (Day 33):**
- **MiniMax M2.7** — Upgraded orchestrator LLM. Same price as M2.5, 97% skill adherence, approaches Sonnet 4.6 on MMClaw. Verbosity guard (max_tokens limits). 15s timeout with retry + adaptive cascade.
- **Technical Analyst Agent** — RSI(14), MACD(12,26,9), volume trends, price momentum. New scoring dimension (0.20 weight). GET /api/v1/technical/:address.
- **Adversarial Bull/Bear Debate** — After 20 independent verdicts, top-3 bullish vs top-3 bearish cases debate. 1 round via bankr/gpt-5-nano (FREE). Produces refined consensus + key risks.
- **Per-Agent Cost Tracking** — Every LLM call tagged with agent_id. GET /api/v1/llm/costs-by-agent. Fixed llm_provider_log (was 0 rows).
- **War Room Telegram** — @buzz_claude_code_bot command center. 25+ slash commands + free text keyword matching. Token name resolution, partial address matching, context memory. Auto-monitors Buzz alerts (auto-sim on HOT tokens, auto-health on errors).
- **Batch Simulations** — 25/31 pipeline tokens simulated. 21 PROCEED, 4 CAUTION, 0 REJECT. Rate limit bumped to 20/hour.
- **MicroBuzz Dashboard** — microbuzz.vercel.app/dashboard. All simulation results color-coded, top BD prospects, click-through reports.
- **BUZZ_RULES.md Prompt Hardening** — 50-line mandatory rules file baked into Docker image. Prepended to every system prompt. Prevents agent drift on 24/7 crons. Sentinel monitors.
- **skills.sh Integration** — Consumed: Coinbase Agentic Wallet (9 skills), Firecrawl CLI (4 skills), Dev Quality (3 skills). Published: 4 public skills to buzzbysolcex/agent-skills.
- **Pipeline Growth** — 47 tokens (27 HOT, 5 QUALIFIED). 25 intel sources. Firecrawl CLI = #25.

**Previous milestones:**
- **v7.6.0 (Day 32)** — MiroFish Stage 1 COMPLETE: 20-agent simulation engine. Financial Datasets MCP (Intel #24). Revenue infrastructure (7 tables, ~31 endpoints, 3 autonomous crons). Hybrid swarm record: 16 files in 11 minutes.
- **v7.5.5 (Day 32B)** — Triple Verification Layer (3 independent checks, all outputs gated). 3-Tier LLM Cascade. Synthesis hackathon REGISTERED.
- **v7.5.3** — Agent Teams, endpoint corrections, scheduled tweet fix, buzz-x402 repo
- **v7.5.1** — CI/CD pipeline, Dual memory, Twitter Brain 5x, Premium deep scan, 4-route funnel
- **v7.5.0** — Bags.fm pipeline (168K tokens), /simulate-listing, Anthropic fallback, agentic.hosting
- **v7.4.x** — Twitter Brain + Hedge Brain, 9 parallel agents, Hetzner migration

Cost: ~$4.09/month infrastructure + ~$0-4/day LLM inference (Bankr FREE for sub-agents) = full autonomous BD operation for less than a coffee per day.

---

## 🐝 Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  HETZNER CX23 — Helsinki, Finland (204.168.137.253)               │
│  4 GB RAM / 2 vCPU / 40 GB SSD — $4.09/month                     │
│  Managed by: Agentic.hosting (ah) — systemd, port 8080           │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  Docker: buzzbd/buzz-bd-agent:latest                          │ │
│  │  Runtime: OpenClaw v2026.3.13                                  │ │
│  │  Prompt Hardening: BUZZ_RULES.md (auto-injected)              │ │
│  │                                                                │ │
│  │  PORT 18789 → OpenClaw Gateway (Telegram + Chat API)          │ │
│  │  PORT 3000  → REST API (Express + SQLite WAL, 51 tables)     │ │
│  │  PORT 8000  → Honcho v3.0.3 (Dialectic Memory, 36 endpoints) │ │
│  │  PORT 5432  → PostgreSQL + pgvector (Honcho embeddings)       │ │
│  │  PORT 3001  → Sentinel v2.0 (Watchdog)                        │ │
│  │                                                                │ │
│  │  ┌────────────────────────────────────────────────────┐       │ │
│  │  │  TRIPLE VERIFICATION LAYER                          │       │ │
│  │  │  ├── Check 1: DexScreener (contract address key)   │       │ │
│  │  │  ├── Check 2: CoinGecko (cross-reference)          │       │ │
│  │  │  ├── Check 3: Internal (DB consistency)             │       │ │
│  │  │  ├── VERIFIED = data surfaces                       │       │ │
│  │  │  └── QUARANTINED = data blocked                     │       │ │
│  │  └────────────────────────────────────────────────────┘       │ │
│  │                                                                │ │
│  │  ┌────────────────────────────────────────────────────┐       │ │
│  │  │  3-TIER LLM CASCADE                                 │       │ │
│  │  │  ├── PRIMARY: MiniMax M2.7 (15s timeout + retry)   │       │ │
│  │  │  ├── FALLBACK 1: Bankr gemini-3-flash              │       │ │
│  │  │  └── FALLBACK 2: Anthropic claude-haiku-4.5        │       │ │
│  │  └────────────────────────────────────────────────────┘       │ │
│  │                                                                │ │
│  │  ┌────────────────────────────────────────────────────┐       │ │
│  │  │  MIROFISH SIMULATION ENGINE                         │       │ │
│  │  │  ├── 20 agents vote (4 personas × 5 weights)       │       │ │
│  │  │  ├── Adversarial bull/bear debate (NEW v7.7.0)     │       │ │
│  │  │  ├── Technical analysis: RSI/MACD (NEW v7.7.0)    │       │ │
│  │  │  ├── EV = p × W − (1−p) × L                       │       │ │
│  │  │  ├── Requires VERIFIED status                       │       │ │
│  │  │  └── Dashboard: microbuzz.vercel.app/dashboard      │       │ │
│  │  └────────────────────────────────────────────────────┘       │ │
│  │                                                                │ │
│  │  ┌────────────────────────────────────────────────────┐       │ │
│  │  │  HEDGE BRAIN (4 Persona Agents)                     │       │ │
│  │  │  ├── degen-agent (momentum, 0.15)                   │       │ │
│  │  │  ├── whale-agent (smart money, 0.25)                │       │ │
│  │  │  ├── institutional-agent (compliance, 0.35)         │       │ │
│  │  │  └── community-agent (sentiment, 0.25)              │       │ │
│  │  └────────────────────────────────────────────────────┘       │ │
│  │                                                                │ │
│  │  ┌────────────────────────────────────────────────────┐       │ │
│  │  │  FOUNDATION (5 Sub-Agents + Technical Analyst)      │       │ │
│  │  │  ├── scanner-agent  → L1 Discovery (DexScreener)   │       │ │
│  │  │  ├── safety-agent   → L2 Verification (RugCheck)   │       │ │
│  │  │  ├── wallet-agent   → L2 Forensics (Helius)        │       │ │
│  │  │  ├── social-agent   → L3 Intelligence (Firecrawl)  │       │ │
│  │  │  ├── scorer-agent   → L4 100-point scoring         │       │ │
│  │  │  └── technical-analyst → L4 RSI/MACD (NEW v7.7.0) │       │ │
│  │  └────────────────────────────────────────────────────┘       │ │
│  │                                                                │ │
│  │  ~122 endpoints | 51 tables | 55 crons | 25 intel sources    │ │
│  │  2 WebSocket feeds | Triple Verification | Prompt Hardening    │ │
│  │  CI/CD: GitHub Actions → Docker Hub → ah API restart          │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  SENTINEL v2.0 (port 3001) — 15min sweeps, auto-repair, alerts   │
│  WAR ROOM BOT — Telegram command center (25+ commands)            │
│  MICROBUZZ — microbuzz.vercel.app/dashboard (simulation reports)  │
│  HYBRID SWARM — Agent Teams + ClawTeam (3+ TOML templates)       │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🐝 Triple Verification Layer

**NO DATA SURFACES WITHOUT TRIPLE VERIFICATION.**

| Check | Source | Verifies |
|-------|--------|----------|
| Check 1 | DexScreener API | Contract address → name, symbol, chain, mcap, liquidity |
| Check 2 | CoinGecko API | Cross-reference: name match, mcap within 20% |
| Check 3 | Internal DB | Consistency, chain format, freshness (<1 hour) |

| Status | Meaning | Action |
|--------|---------|--------|
| ✅ VERIFIED | All 3 pass | Data can surface |
| 🚫 QUARANTINED | 1+ failed | Data BLOCKED |
| ⚠️ UNVERIFIED | Insufficient data | Data BLOCKED |
| ⏰ STALE | >1 hour old | Must re-verify |

**Gated outputs:** Simulation engine, Twitter brain, autonomous crons, MicroBuzz, War Room alerts.

---

## 🐝 MiroFish Simulation Engine

AI-powered listing simulation with **adversarial debate**. Dashboard at **microbuzz.vercel.app/dashboard**.

| Field | Value |
|-------|-------|
| Dashboard | [microbuzz.vercel.app/dashboard](https://microbuzz.vercel.app/dashboard) |
| Agents | 20 (4 personas × 5 weight variations) + 1 debate round |
| EV Formula | EV = p × W − (1−p) × L |
| Technical | RSI(14), MACD(12,26,9), volume trend, momentum |
| Gate | Requires VERIFIED status |
| Rate Limit | 20 simulations/hour |
| Cost | $0 per simulation (bankr/gpt-5-nano FREE) |

**How it works:**
1. Token enters pipeline with score ≥ 70
2. Triple Verification runs (3 independent checks)
3. If VERIFIED → 20 simulation agents vote independently
4. **Adversarial debate:** top-3 bullish vs top-3 bearish cases argue
5. Technical analysis: RSI, MACD, volume, momentum computed
6. Consensus + EV calculated with debate refinement
7. Dashboard report at microbuzz.vercel.app/dashboard

**Batch Results (Day 33):** 25/31 tokens — 21 PROCEED, 4 CAUTION, 0 REJECT.

---

## 🐝 3-Tier LLM Cascade

| Tier | Provider | Model | Role |
|------|----------|-------|------|
| PRIMARY | MiniMax | **M2.7** | Orchestrator (15s timeout, retry, adaptive) |
| FALLBACK 1 | Bankr | gemini-3-flash | Orchestrator fallback |
| FALLBACK 2 | Anthropic | claude-haiku-4.5 | Emergency |
| FREE | Bankr | gpt-5-nano | All sub-agents + Hedge Brain + Simulation + Debate |

**Per-agent cost tracking:** GET /api/v1/llm/costs-by-agent
**Verbosity guard:** max_tokens 2000 (orchestrator), 4000 (simulation), 6000 (proposals)

---

## 🐝 War Room Telegram (NEW v7.7.0)

Command center for managing Buzz from your phone.

| Category | Commands |
|----------|----------|
| Monitoring | /help /health /status /version /logs /errors |
| Pipeline | /pipeline /sim /score /verify /technical /report /scan /find |
| Agents | /agents /costs /llm /crons /twitter |
| Ops | /restart /deploy /sentinel /ws /db |
| Batch | /simall /simtop N /results |

**Features:** Token name resolution, partial address matching, context memory, tappable commands, free text keyword matching, auto-monitoring (HOT tokens → auto-sim, errors → auto-health).

---

## 🐝 Scoring System (100 Points — 5 Dimensions)

| Dimension | Weight | Source |
|-----------|--------|--------|
| Safety | 0.25 | RugCheck, contract audit, LP lock |
| Wallet | 0.25 | Helius forensics, whale analysis |
| Social | 0.15 | Grok/xAI, Serper, Firecrawl |
| Scorer | 0.15 | OKX signals, Nansen, composite |
| Technical | 0.20 | RSI, MACD, volume, momentum (NEW v7.7.0) |

| Score | Verdict | Action |
|-------|---------|--------|
| 85-100 | 🔥 HOT | Immediate outreach + tweet + simulation |
| 70-84 | ✅ QUALIFIED | Queue outreach + simulation |
| 50-69 | 👀 WATCH | Monitor 48h |
| 0-49 | ❌ SKIP | Archive |

---

## 🐝 Twitter Funnel (4 Routes)

### Route 1 — SCAN (Premium Deep Scan)
`@BuzzBySolCex scan $TICKER` → 10 agents + technical analysis → **Triple Verification** → Premium reply with 7 sections. All outputs verified.

### Route 2 — LIST
Reply `LIST` → SolCex listing benefits → Lead saved → Ogie alerted.

### Route 3 — DEPLOY
Reply `DEPLOY` → Bankr token deploy on Base. Zero gas.

### Route 4 — ENGAGEMENT
Tag without command → Friendly ack + suggest scan.

---

## 🐝 Intelligence Sources (25)

| # | Source | Layer | Purpose |
|---|--------|-------|---------|
| 1 | DexScreener | L1 | Token discovery + Verification Check 1 |
| 2 | GeckoTerminal | L1 | Pool data |
| 3 | AIXBT | L1 | Momentum signals |
| 4 | CoinMarketCap | L1 | Market data |
| 5 | BNB Chain MCP | L1 | BSC tokens |
| 6 | Bitget API | L1 | Exchange data |
| 7 | OKX Market Data | L1 | 1,010 instruments (FREE) |
| 8 | Bags.fm | L1 | 168K tokens indexed |
| 9 | RugCheck | L2 | Rug pull detection |
| 10 | Helius API + MCP | L2 | Solana forensics (60 tools) |
| 11 | Allium | L2 | On-chain analytics |
| 12 | ETH Skills | L2 | Builder reputation |
| 13 | Grok/xAI | L3 | Social intelligence |
| 14 | Serper | L3 | Google search |
| 15 | ATV Web3 Identity | L3 | ENS + socials |
| 16 | Firecrawl API | L3 | Web scraping |
| 17 | Nansen CLI | L5 | Smart money |
| 18 | X API v2 | Amplify | OAuth 1.0a posting |
| 19 | Bankr | Deploy | Partner token launch |
| 20 | Moltbook | Social | Forum presence |
| 21 | AgentProof | Identity | #1718 Avalanche |
| 22 | CoinGecko REST | L1/Verify | Verification Check 2 + prices |
| 23 | OKX WebSocket | L1 | Real-time BTC/ETH/SOL |
| 24 | Financial Datasets MCP | L1 | OHLCV history + news |
| 25 | **Firecrawl CLI** | **L3** | **Enhanced scraping (NEW v7.7.0)** |

---

## 🐝 Agent Skills (skills.sh)

**Published:** `npx skills add buzzbysolcex/agent-skills`

| Skill | Description |
|-------|-------------|
| dexscreener-intel | Real-time DEX data across 60+ chains |
| aixbt-momentum | AI-powered crypto momentum tracking |
| token-scoring | 100-point composite scoring (5 dimensions) |
| listing-simulation | 20-agent MiroFish simulation with adversarial debate |

**Consumed:** Coinbase Agentic Wallet (9 skills), Firecrawl CLI (4 skills), Dev Quality (3 skills)

---

## 🐝 Prompt Hardening (BUZZ_RULES.md)

50-line mandatory rules file baked into Docker image. Prepended to every system prompt on boot. Covers: identity, triple verification, LLM cost discipline, pricing secrecy, financial safety, Twitter rules, secrets protection, simulation rules. Sentinel monitors every 15 minutes.

---

## 🐝 Cost

| Component | Cost |
|-----------|------|
| Hetzner CX23 | $4.09/month |
| MicroBuzz (Vercel) | $0 |
| War Room Bot | $0 |
| MiniMax M2.7 (orchestrator) | ~$2-4/day |
| bankr/gpt-5-nano (all agents + simulation + debate) | FREE |
| **Total infrastructure** | **$4.09/month** |

---

## 🐝 Version History

| Version | Date | Highlights |
|---------|------|------------|
| **v7.7.0** | **Mar 20, 2026** | **MiniMax M2.7. Technical Analyst (RSI/MACD). Adversarial Debate. Per-Agent Costs. War Room Telegram (25+ commands). Batch Sims (21 PROCEED). MicroBuzz Dashboard. BUZZ_RULES.md. skills.sh (4 published). Coinbase Wallet + Firecrawl CLI. Pipeline: 47 tokens.** |
| v7.6.0 | Mar 19, 2026 | MiroFish Stage 1: 20-agent simulation. Financial Datasets MCP. Revenue infra. Hybrid swarm. |
| v7.5.5 | Mar 19, 2026 | Triple Verification Layer. 3-Tier LLM Cascade. Synthesis hackathon. |
| v7.5.3 | Mar 18, 2026 | Agent Teams, endpoint corrections, buzz-x402 repo |
| v7.5.1 | Mar 15, 2026 | CI/CD, Dual memory, Twitter Brain 5x, Premium deep scan |
| v7.5.0 | Mar 15, 2026 | Bags.fm pipeline, /simulate-listing, agentic.hosting |
| v7.4.x | Mar 14, 2026 | Twitter + Hedge Brain, Hetzner migration |
| v1.0.0 | Feb 1, 2026 | First deployment on Akash Network |

---

## 🐝 Roadmap

| Phase | Target | Status |
|-------|--------|--------|
| Phase 0-E | Foundation → CI/CD → Twitter | ✅ COMPLETE |
| Phase SIM | MiroFish Simulation + Debate | ✅ LIVE |
| Phase VER | Triple Verification Layer | ✅ LIVE |
| Phase REV | Revenue Infrastructure | ✅ LIVE |
| Phase WAR | War Room Telegram | ✅ LIVE |
| Phase SKL | skills.sh + Prompt Hardening | ✅ LIVE |
| **Phase 1** | **Close First Deal ($5K)** | **🔨 ACTIVE** |
| Phase 2 | Monte Carlo + ARIA | 🔵 Month 2 |
| Phase 3 | BaaS x402 Subscriptions | 🔵 Month 2-3 |
| Phase 4 | Mobile App | 🔵 Month 3-6 |
| Phase 5 | $BUZZ Token | 🔵 Month 4-6 |
| Phase 6 | Zero-Human Exchange Listing Company | 🔵 Month 6-12 |

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
| Synthesis | e61039b7 | Base |
| skills.sh | buzzbysolcex/agent-skills | 4 skills |

---

## 🐝 Links

| Platform | URL |
|----------|-----|
| SolCex Exchange | [solcex.io](https://solcex.io) |
| MicroBuzz Dashboard | [microbuzz.vercel.app/dashboard](https://microbuzz.vercel.app/dashboard) |
| Agent Skills | `npx skills add buzzbysolcex/agent-skills` |
| Twitter | [@BuzzBySolCex](https://x.com/BuzzBySolCex) |
| SolCex Twitter | [@SolCex_Exchange](https://x.com/SolCex_Exchange) |
| Telegram Bot | [@BuzzBySolCex_bot](https://t.me/BuzzBySolCex_bot) |
| War Room Bot | [@buzz_claude_code_bot](https://t.me/buzz_claude_code_bot) |
| Builder | [@HidayahAnka1](https://x.com/HidayahAnka1) |

---

## 🐝 License

Proprietary — SolCex Exchange. All rights reserved.

---

*🐝 "AIXBT finds alpha. Bankr deploys tokens. Buzz closes deals."*

*Buzz BD Agent v7.7.0 — Sprint Day 33 | Mar 20, 2026 | Jakarta, Indonesia*
*~122 endpoints | 55 crons | 51 tables | 25 intel | 10 agents | $4.09/mo*
*MiniMax M2.7 | War Room LIVE | Technical Analyst | Adversarial Debate | Prompt Hardening*
*21 PROCEED | 4 CAUTION | 0 REJECT | MicroBuzz Dashboard LIVE | skills.sh Published*
*Built by a chef who codes through conversation. No CS degree. Just Claude and persistence.*
