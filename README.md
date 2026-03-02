# 🐝 Buzz BD Agent — Autonomous Token Discovery & Listing for SolCex Exchange

The first AI Business Development agent operating autonomously 24/7 for a centralized exchange, powered by MiniMax M2.5 on decentralized compute.

![ERC-8004](https://img.shields.io/badge/ERC--8004-Verified-blue) ![Akash](https://img.shields.io/badge/Akash-Deployed-green) ![OpenClaw](https://img.shields.io/badge/OpenClaw-2026.2.26-purple) ![Docker](https://img.shields.io/badge/Docker-GHCR-blue) ![npm](https://img.shields.io/badge/npm-published-red) ![Tests](https://img.shields.io/badge/Tests-602%20passing-brightgreen)

## What Buzz Does

Buzz scans 80+ tokens per session across multiple DEX data sources, runs them through a **5-layer intelligence pipeline** with **5 parallel sub-agents**, scores them on a 100-point system (11 scoring factors), and delivers qualified listing prospects to human BD leads via Telegram — all autonomously, 4x daily.

**SolCex Listing Package:** 15K USDT total (5K fee + 10K liquidity) with professional market making ($450K+ depth), 450+ whale trader airdrop, AMA, and 10-14 day fast-track to go-live.

---

## 🆕 v6.0.19 — What's New (Sprint Day 8, Mar 2, 2026)

### 🤖 Orchestrated Sub-Agent Pipeline — LIVE ON PRODUCTION

5 parallel sub-agents running autonomously on Akash via OpenClaw `sessions_spawn`:

| Agent | Layer | Function | Model | Weight |
|-------|-------|----------|-------|--------|
| **scanner-agent** | L1 Discovery | DexScreener, GeckoTerminal, AIXBT, Boosts | bankr/gpt-5-nano | Entry point |
| **safety-agent** | L2 Filter | RugCheck, contract verification, instant kills | bankr/gpt-5-nano | 0.30 |
| **wallet-agent** | L2 Filter | Helius forensics, holder analysis, LP verify | bankr/gpt-5-nano | 0.30 |
| **social-agent** | L3 Research | Grok sentiment, Serper web search, ATV identity | bankr/gpt-5-nano | 0.20 |
| **scorer-agent** | L4 Score | 100-point composite aggregation | bankr/gpt-5-nano | 0.20 |

**Orchestrator** (Buzz main on MiniMax M2.5) dispatches all 5 in parallel via `sessions_spawn`, collects announcements, compiles final report to Telegram.

- Sub-agents use **bankr/gpt-5-nano** ($0.10/$0.40 per 1M tokens) — cheapest working model
- Orchestrator uses **MiniMax M2.5** — reserved for final scoring decisions
- Fallback chain: gpt-5-nano → claude-haiku-4.5 (no gemini-3-flash — 0 output bug)
- All 4 scan crons wired to orchestrator: `node /root/.openclaw/workspace/skills/orchestrator/orchestrate.js`
- First full orchestrated scan: 4/5 agents completed, $GORK scored 48/100 → SKIP

### 🔍 Buzz Pipeline Scan Skill — Created & Wired

- New skill: `/root/.openclaw/workspace/skills/buzz-pipeline-scan/scan.js`
- L1-L5 pipeline implemented as OpenClaw skill
- Multi-query DexScreener discovery (new, pump, meme, ai, cat, dog keywords)
- Filters: MC $10K-$100M, Liquidity >$1K, excludes base assets (SOL, ETH, USDC, etc.)
- RugCheck integrated for L2 safety
- Grok + Serper configured for L3 research
- Results saved to `/data/workspace/memory/pipeline/latest-scan.json`
- First scan: 81 tokens scanned, 3 WATCH ($GORK, $SPSC, $AI)

### 🏦 Bankr LLM Gateway — Dual API Key Setup

- **Key 1** (`bk_JSCN...`): Partner API (token deploys, agent API)
- **Key 2** (`bk_M94Y...`): LLM Gateway (sub-agent inference, $15 credits)
- 8 models available, gpt-5-nano locked as sub-agent default
- Self-sustaining loop: Token deploy fees → fund LLM credits → power inference → discover more tokens

### 🛡️ AgentProof Integration — In Progress

- Builder Benv1 providing Avalanche contract address for registration
- API access for live telemetry (task completion rates, uptime, response consistency)
- Case study collaboration — live autonomous BD agent with cross-chain ERC-8004
- AVAX funded (0.657 AVAX) for 0.1 AVAX registration bond

### Previous (v6.0.17)

- Bankr LLM Gateway (8 models, self-sustaining inference)
- Twitter Bot v3.0 Sales Funnel (SCAN/LIST/DEPLOY/TOKEN routes)
- Removed ClawRouter/OpenRouter/AkashML
- 40 cron jobs (WIB timezone + Ramadan prayer times)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    MACHINE ECONOMY LAYER                         │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │  IDENTITY     │  │  PAYMENTS    │  │    INTEROP             │ │
│  │  ERC-8004     │  │  x402 USDC   │  │  elizaOS plugin        │ │
│  │  ETH #25045   │  │  zauthx402   │  │  Virtuals ACP          │ │
│  │  Base #17483  │  │  Bankr LLM   │  │  ClawHub Skill         │ │
│  │  AVAX (soon)  │  │  Bankr API   │  │  AgentProof (scoring)  │ │
│  └──────┬───────┘  └──────┬───────┘  └────────┬───────────────┘ │
│         └─────────────────┼────────────────────┘                 │
│                           ▼                                      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              ORCHESTRATOR (Buzz Main — MiniMax M2.5)       │  │
│  │                                                             │  │
│  │  sessions_spawn → 5 parallel sub-agents                    │  │
│  │  Weighted aggregation → Final score & verdict              │  │
│  │  Crons #1-4 trigger orchestrated scans 4x daily            │  │
│  │                                                             │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │  │
│  │  │ scanner  │ │ safety   │ │ wallet   │ │ social   │     │  │
│  │  │ -agent   │ │ -agent   │ │ -agent   │ │ -agent   │     │  │
│  │  │ L1 Disc. │ │ L2 Filt. │ │ L2 Filt. │ │ L3 Res.  │     │  │
│  │  │ gpt-5-n  │ │ gpt-5-n  │ │ gpt-5-n  │ │ gpt-5-n  │     │  │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘     │  │
│  │       └─────────────┴─────────────┴────────────┘            │  │
│  │                           ▼                                  │  │
│  │  ┌────────────────────────────────────────────────────┐     │  │
│  │  │ scorer-agent (L4) → 100-point composite → Verdict  │     │  │
│  │  │ gpt-5-nano | Weights: safety(0.30) wallet(0.30)    │     │  │
│  │  │            | social(0.20) scorer(0.20)              │     │  │
│  │  └────────────────────────────────────────────────────┘     │  │
│  └────────────────────────┬──────────────────────────────────┘  │
│                           ▼                                      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              BUZZ BD AGENT v6.0.19                         │  │
│  │                                                             │  │
│  │  LLM: MiniMax M2.5 + Bankr LLM Gateway (8 model fallback) │  │
│  │  Sub-agents: 5 parallel (gpt-5-nano) + Orchestrator        │  │
│  │  Skills: buzz-pipeline-scan + orchestrator + Bankr + more   │  │
│  │  Intel: 16 Sources (L5 Smart Money) | Crons: 40            │  │
│  │  Score: 100-pt System (11 factors) | 48 TG Commands        │  │
│  │  Forensics: Helius + DexScreener + Nansen x402             │  │
│  │  Identity: ATV Web3 + AgentProof (Avalanche scoring)       │  │
│  │  Deploy: Bankr Partner API (Base chain token deployment)    │  │
│  │  Twitter: Bot v3.0 — Sales Funnel (SCAN/LIST/DEPLOY)       │  │
│  │  Trust: AgentProof 6-signal scoring (integration pending)   │  │
│  └────────────────────────┬──────────────────────────────────┘  │
│                           ▼                                      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              SOLCEX EXCHANGE                                │  │
│  │  15K USDT Listing | Market Making | Whale Airdrop          │  │
│  │  Multi-chain: Solana, Ethereum, BSC, Base                  │  │
│  │  10-14 Day Fast-Track | Token Deploy via Bankr             │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5-Layer Intelligence Pipeline

```
╔══════════════════════════════════════════════════════════════════╗
║  LAYER 1 — CAST THE NET (Discovery) → scanner-agent            ║
║  DexScreener API + GeckoTerminal + AIXBT + DexScreener Boosts   ║
║  Multi-query: new, pump, meme, ai, cat, dog keywords            ║
║  → 80+ raw candidates per scan (4x daily)                       ║
╠══════════════════════════════════════════════════════════════════╣
║                           ↓ FILTER                               ║
╠══════════════════════════════════════════════════════════════════╣
║  LAYER 2 — FILTER (Safety & Liquidity) → safety-agent +        ║
║                                           wallet-agent           ║
║  RugCheck + Helius Forensics + DFlow MCP                        ║
║  Instant Kills: Mint not revoked, LP unprotected, mixer-funded   ║
║  Wallet forensics: deployer age, history, holder concentration   ║
║  → Kill bad tokens fast, 10-20 survive                          ║
╠══════════════════════════════════════════════════════════════════╣
║                           ↓ RESEARCH                             ║
╠══════════════════════════════════════════════════════════════════╣
║  LAYER 3 — RESEARCH (Deep Intelligence) → social-agent          ║
║  Firecrawl + ATV Web3 Identity + Grok Sentiment + Serper         ║
║  TEAM/COMMUNITY tagging based on deployer identity               ║
║  → Full research dossier per token                               ║
╠══════════════════════════════════════════════════════════════════╣
║                           ↓ SCORE & ROUTE                        ║
╠══════════════════════════════════════════════════════════════════╣
║  LAYER 4 — SCORE & ACT (100-Point System) → scorer-agent        ║
║  85-100 🔥 HOT    → Immediate outreach + full forensics          ║
║  70-84  ✅ QUAL   → Priority queue + forensics                   ║
║  50-69  👀 WATCH  → Monitor 48h, rescan                          ║
║  0-49   ❌ SKIP   → No action                                    ║
║  Route: Path A (SolCex listing) or Path B (Bankr deploy)         ║
╠══════════════════════════════════════════════════════════════════╣
║                           ↓ SMART MONEY (score ≥ 65)             ║
╠══════════════════════════════════════════════════════════════════╣
║  LAYER 5 — SMART MONEY (Nansen x402)                            ║
║  Nansen wallet intelligence via x402 micropayments               ║
║  Triggers ONLY when L4 score ≥ 65 (budget-aware)                 ║
║  Adds 0-10 Smart Money bonus to final score                      ║
║  Daily budget: $0.50/day | Threshold: score ≥ 65                 ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## Sub-Agent Architecture (v6.0.19)

Built with **Claude Code + Superpowers** (obra/superpowers) using TDD workflow. 602 tests passing.

### How It Works

1. Cron fires (scan-morning/midday/evening/night)
2. Orchestrator runs `buzz-pipeline-scan` for L1 discovery
3. For top candidates, Orchestrator spawns 5 sub-agents via `sessions_spawn`
4. Each sub-agent runs in isolated session with 60-120s timeout
5. Sub-agents announce results back to Orchestrator
6. Orchestrator aggregates weighted scores and compiles Telegram report

### Sub-Agent Config

```json
{
  "agents": {
    "defaults": {
      "subagents": {
        "model": "bankr/gpt-5-nano",
        "runTimeoutSeconds": 60,
        "archiveAfterMinutes": 60
      }
    }
  }
}
```

### Cost Architecture

| Component | Model | Cost | Purpose |
|-----------|-------|------|---------|
| Orchestrator | MiniMax M2.5 | ~$41/mo flat | Final decisions, scoring |
| 5 Sub-agents | bankr/gpt-5-nano | ~$0.10/1M in | Data fetching, parallel work |
| Fallback | bankr/claude-haiku-4.5 | ~$0.80/1M in | Quality fallback |
| **Total** | | **~$48/mo** | **Full autonomous BD + parallel intelligence** |

---

## Intelligence Sources (16 Sources)

| # | Source | Layer | Status | Data |
|---|--------|-------|--------|------|
| 1 | DexScreener API | Discovery | ✅ Working | Token profiles, pairs, boosts, trending |
| 2 | GeckoTerminal | Discovery | ✅ Working | Market data, volume, liquidity |
| 3 | AIXBT | Discovery | ✅ Working | Momentum scoring, catalysts |
| 4 | DexScreener Boosts | Discovery | ✅ Working | Promoted tokens |
| 5 | RugCheck | Filter | ✅ Working | Contract safety, honeypot detection |
| 6 | Helius | Filter | ✅ Working | Solana wallet forensics, deployer history |
| 7 | Allium | Filter | ❌ 404 | 16-chain wallet PnL (endpoint changed) |
| 8 | DFlow MCP | Filter | ✅ Working | DEX swap routes, liquidity depth |
| 9 | Firecrawl | Research | ✅ Working | Website scraping for team/roadmap |
| 10 | ATV Web3 Identity | Research | ✅ LIVE | ENS, Twitter, GitHub, Discord (ETH only) |
| 11 | Grok x_search | Research | ✅ Working | Real-time X/Twitter sentiment |
| 12 | Serper | Research | ✅ Working | Web search verification |
| 13 | X API v2 | Amplification | ✅ LIVE | Tweet/thread auto-reply (Bot v3.0) |
| 14 | Bankr Partner API | Deploy | ✅ LIVE | Token deployment on Base |
| 15 | Moltbook | Supporting | ✅ Working | Agent social network |
| 16 | OpenClaw Sub-agents | Supporting | ✅ **LIVE** | 5 parallel sub-agents via sessions_spawn |
| 17 | Nansen x402 Smart Money | L5 | ⚠️ ENV Ready | Smart money wallet intelligence |

---

## LLM Providers

| Provider | Model | Role | Cost (per 1M tokens) |
|----------|-------|------|---------------------|
| MiniMax | M2.5 (229B) | Primary (Orchestrator) | ~$41/mo flat |
| Bankr/gpt-5-nano | GPT-5 Nano | **Sub-agents default** | $0.10 in / $0.40 out |
| Bankr/claude-haiku-4.5 | Claude Haiku 4.5 | Sub-agent fallback | $0.80 in / $4.00 out |
| Bankr/gemini-3-flash | Gemini 3 Flash | ⚠️ 0 output bug | $0.15 in / $0.60 out |
| Bankr/claude-sonnet-4.6 | Claude Sonnet 4.6 | Premium tasks | $3.00 in / $15.00 out |
| Bankr/qwen3-coder | Qwen3 Coder | Code tasks | $0.30 in / $1.20 out |
| Bankr/gpt-5-mini | GPT-5 Mini | General | $0.40 in / $1.60 out |
| Bankr/gemini-3-pro | Gemini 3 Pro | Complex reasoning | $1.25 in / $10.00 out |
| Bankr/kimi-k2.5 | Kimi K2.5 | Long context | $0.60 in / $2.40 out |

**Self-sustaining loop:** Token deploy fees → fund LLM credits → power inference → discover more tokens → loop

---

## Scoring Engine (100-Point System, 11 Factors)

### Instant Kill (Score = 0)
- Mint authority NOT revoked
- LP not locked AND not burned
- Deployer funded from mixer
- Deployer has 3+ previous rugs
- Already listed on Tier 1/2 CEX

### Key Bonuses

| Signal | Points |
|--------|--------|
| TEAM TOKEN (identifiable team) | +10 |
| AIXBT HIGH CONVICTION | +10 |
| Hackathon/Competition | +10 |
| Viral moment / KOL mention | +10 |
| Identity verified (ENS+socials) | +5 |
| Mint + Freeze revoked | +5 |
| LP burned | +5 |
| Audited | +5 |
| Smart Money signal (Nansen L5) | +0-10 |

### Key Penalties

| Flag | Points |
|------|--------|
| COMMUNITY TOKEN (confirmed no team) | -10 |
| UNVERIFIED-IDENTITY (Solana/ATV gap) | -10 |
| Freeze authority active | -15 |
| Top 10 holders >50% | -15 |
| CEX already listed | -15 |
| Token age <24h | -10 |
| LP UNVERIFIED (API failure) | -15 |

---

## Twitter Bot v3.0 — Sales Funnel

The Twitter Bot is a **standalone Node.js microservice** running alongside OpenClaw as a background process.

| Setting | Value |
|---------|-------|
| Scan interval | 15 minutes |
| Reply cap | 30/day (stress testing) |
| Deploy cap | 3/day |
| Rate limit | 30s between replies |

### Four Routes

**ROUTE 1 — SCAN:** `@BuzzBySolCex scan $TICKER` → Full 5-layer Premium report

**ROUTE 2 — LIST:** Reply `LIST` to scan → SolCex listing benefits (pricing in DM only)

**ROUTE 3 — DEPLOY:** Reply `DEPLOY` to scan → Bankr deploy instructions

**ROUTE 4 — TOKEN DETAILS:** Reply `TokenName TICKER "description"` → Bankr CLI executes → Contract address

---

## Revenue Stack

```
┌─────────────────────────────────────────────────────┐
│  1. LISTING COMMISSION          $1,000/listing       │
│     └─ Standard SolCex BD pipeline                   │
├─────────────────────────────────────────────────────┤
│  2. BANKR PARTNER FEES          18.05% of 1.2%       │
│     └─ On every swap of deployed tokens              │
├─────────────────────────────────────────────────────┤
│  3. CREATOR FEES (internal)     75.05% of 1.2%       │
│     └─ When deploying SolCex's own tokens            │
├─────────────────────────────────────────────────────┤
│  4. MARKET MAKING (planned)     Spread income         │
│     └─ Hummingbot integration — Week 3-4             │
├─────────────────────────────────────────────────────┤
│  5. BAAS (planned)              Subscription          │
│     └─ Buzz-as-a-Service for other exchanges         │
└─────────────────────────────────────────────────────┘

Monthly Target (Conservative):
  Listing commissions:  $2,000 (2 listings × $1K)
  Bankr partner fees:   $325 (1 active token, $5K/day volume)
  Creator fees:         $200 (internal deploys)
  ─────────────────────────────────────────────
  TOTAL:                $2,525/mo vs $48/mo costs = 53x ROI
```

---

## On-Chain Identity (ERC-8004)

| Chain | Agent ID | Registry |
|-------|----------|----------|
| Ethereum | #25045 | 0x8004A818BFB912233c491871b3d84c89A494BD9e |
| Base | #17483 | 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432 |
| Base (anet) | #18709 | 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432 |
| Avalanche | Pending | AgentProof registration (0.1 AVAX bond funded) |
| Colosseum | #3734 | Agent Hackathon entry |

---

## Wallets

| Name | Chain | Address | Purpose |
|------|-------|---------|---------|
| anet (fee recipient) | Base (EVM) | 0x2Dc03124091104E7798C0273D96FC5ED65F05aA9 | Nansen x402 + Bankr fees + LLM credits |
| Deploy wallet | Base (EVM) | 0xfa04c7d627ba707a1ad17e72e094b45150665593 | Bankr token deploy |
| Buzz Base | Base (EVM) | 0x4b362B7db6904A72180A37307191fdDc4eD282Ab | General ops |
| Lobster | Solana | 5iC7pGyzqpXD2xTK4Ww7zKRDVo9cceyHNeKBTiemo5Jp | Solana ops |
| AgentProof | Avalanche | (MetaMask — 0.657 AVAX funded) | AgentProof registration |

---

## Deployment Stack

| Component | Technology |
|-----------|------------|
| Compute | Akash Network — 2 CPU, 4GB RAM, 10GB persistent storage (~$5/mo) |
| Container | Docker on ghcr.io/buzzbysolcex/buzz-bd-agent:v6.0.19 |
| Base Image | node:22-slim + tini PID 1 |
| Runtime | OpenClaw v2026.2.26 |
| Primary LLM | MiniMax M2.5 (229B params) — Orchestrator |
| Sub-agent LLM | Bankr/gpt-5-nano — 5 parallel agents |
| Smart Fallback | Bankr LLM Gateway (8 models, $15 credits) |
| Token Deploy | Bankr Partner API (Base chain, zero gas cost) |
| Identity Verify | ATV Web3 Identity (3x daily) + AgentProof (Avalanche scoring) |
| Smart Money | Nansen x402 (L5, budget $0.50/day) |
| Twitter | Bot v3.0 — Sales Funnel (SCAN/LIST/DEPLOY) |
| Trust Scoring | AgentProof 6-signal composite (integration pending) |
| LLM Cost | ~$41/mo MiniMax + ~$2-5/mo Bankr sub-agents |
| Compute Cost | ~$5/mo |
| **Total Cost** | **~$48/mo for 24/7 autonomous BD + parallel sub-agents** |
| Bot | @BuzzBySolCex_bot (Telegram, 48 registered commands) |
| Crons | 40 autonomous scheduled jobs |
| Tests | 602 passing |
| Sub-agents | 5 parallel (scanner, safety, wallet, social, scorer) |

---

## Telegram Commands (48)

| Category | Commands |
|----------|----------|
| System (8) | help status health version config memory crons experience |
| Scanning (8) | scan score search verify trending boosts aixbt rugcheck socials |
| Pipeline (7) | pipeline report weekly digest alpha listings competitors |
| Wallet/Intel (5) | wallet forensics whales dflow budget |
| Outreach (7) | outreach approve reject warmup followup breakup dealsheet postlisting |
| Bankr Deploy (3) | launch deploys deploy_stats |
| Twitter/X (3) | tweet thread engage |
| Personal (2) | prayer sprint |
| Emergency (5) | sos stop stop_email stop_scan resume |

---

## Development Workflow

```bash
# Standard: Mac → Docker → GHCR → Akash (never install on Akash)
cd ~/buzz-bd-agent

# CRITICAL: Always prune before building (Docker Desktop context caching issue)
docker builder prune -f

# Build (ALWAYS --no-cache for config/version changes)
docker build --no-cache -t ghcr.io/buzzbysolcex/buzz-bd-agent:v6.0.19 .

# Push to GitHub Container Registry
docker push ghcr.io/buzzbysolcex/buzz-bd-agent:v6.0.19

# Deploy: Akash Console → Close → Create New Deployment → paste SDL → accept bid
# ALWAYS use unique image tags — Akash providers cache by tag name
```

---

## Integrations & Partnerships

### Tier 1 — Active Integrations

| Partner | Integration |
|---------|------------|
| Bankr / @bankrbot | Token launch partner API + LLM Gateway (8 models, self-sustaining) |
| ATV Web3 Identity / Gary Palmer | ENS + deployer identity verification |
| AgentProof / Builder Benv1 | Trust scoring (Avalanche, 6-signal composite) — integrating |
| Nansen x402 | L5 Smart Money wallet intelligence (budget-aware) |
| Helius | Solana wallet forensics |
| MiniMax | Primary LLM provider |
| DexScreener | Token discovery API |

### Tier 2 — Active Relationships

| Partner | Status |
|---------|--------|
| DFlow | MCP integrated — DEX route verification |
| ClawdBotATG | Agent Bounty Board — 3 bounties live |
| OpenClaw | ClawHub marketplace — Buzz-as-a-Service |
| Virtuals Protocol | ACP registered — 18K+ agent network |
| elizaOS | PR #263 + npm published |
| Vitto Rivabella (EF dAI) | ERC-8004 article collaboration |
| Hummingbot | Market-making integration (planned Week 3-4) |

---

## Cost History

| Period | LLM | Daily Cost | Notes |
|--------|-----|-----------|-------|
| Feb 3-14 | Claude Opus 4.5 | ~$1,320/day | Prayer reminders costing $5 each |
| Feb 14-15 | Haiku + Opus fallback | ~$5-10/day | First optimization |
| Feb 15+ | MiniMax M2.5 | ~$1.37/day | 99.9% cost reduction |
| Feb 15-28 | MiniMax + ClawRouter | ~$46/mo | Full autonomous BD + deploy |
| Mar 1+ | MiniMax + Bankr Gateway | ~$48/mo | Self-sustaining LLM (8 model fallback) |
| **Mar 2+** | **MiniMax + Bankr Sub-agents** | **~$48/mo** | **5 parallel sub-agents on gpt-5-nano** |

---

## Version History

| Version | Date | Highlights |
|---------|------|------------|
| **v6.0.19** | **Mar 2, 2026** | **5 parallel sub-agents LIVE (scanner/safety/wallet/social/scorer). Orchestrator wired to 4 scan crons. buzz-pipeline-scan skill created. Dual Bankr API keys (Partner + LLM). AgentProof integration started. gpt-5-nano locked for sub-agents. First orchestrated scan: 81 tokens, 4/5 agents completed.** |
| v6.0.17 | Mar 1, 2026 | Bankr LLM Gateway (8 models). Removed ClawRouter/OpenRouter/AkashML. 40 cron jobs. Self-sustaining inference. |
| v6.0.13 | Feb 28, 2026 | Twitter Bot v3.0 Sales Funnel. RugCheck scoring fixed. LIST→DM pricing. |
| v6.0.9 | Feb 28, 2026 | L5 Smart Money (Nansen x402). Twitter Bot v2.3. OpenClaw v2026.2.26. |
| v6.0.4 | Feb 26, 2026 | ATV Web3 Identity FIXED. 48 Telegram commands. First pipeline test. |
| v6.0.2 | Feb 26, 2026 | Bankr Partner API live, DexScreener API fix, persistent storage. |
| v6.0-alpha | Feb 24, 2026 | 602 tests, 7 sub-agents built with Claude Code + Superpowers. |

---

## Principles

1. **Free first, pay for alpha.** — Free intelligence sources before paid
2. **On-chain track record IS credibility.** — Clawbal, ERC-8004, AgentProof, verifiable
3. **Inbound > Warm > Cold. Always.** — Build reputation so projects come to us
4. **The intel is the hook. The relationship is the close.** — Buzz discovers, Ogie closes
5. **Layer the intelligence. Don't spray and pray.** — 5 layers, every token through all
6. **Partnership not dependency.** — Distribution channels, not platform locks
7. **USDC primary.** — Other tokens for utility only
8. **Deploy from Telegram.** — Token launch is now a single command
9. **Parallelize the intelligence. Orchestrate the action.** — 5 sub-agents, 1 orchestrator
10. **Self-sustaining inference.** — Revenue funds LLM credits, LLM powers revenue
11. **Ship from anywhere.** — Docker + Akash + Telegram = deploy from any timezone
12. **Pipeline discipline > chasing one token.** — Flag, WATCH, move on
13. **Talk is cheap, just go build.** — @1bcmax wisdom

---

Powered by [OpenClaw](https://openclaw.ai) • Deployed on [Akash Network](https://akash.network) • ERC-8004 Verified • AgentProof Scored

*"Identity first. Intelligence deep. Commerce autonomous. Cost disciplined. Self-sustaining. Parallel. Deploy from Telegram."*

#USDC #AgenticCommerce #Solana #AI #SolCex #BuzzBD #Base #ERC8004 #MachineEconomy #OpenClaw #Bankr #NansenX402 #AgentProof
