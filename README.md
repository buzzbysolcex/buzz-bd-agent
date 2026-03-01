# 🐝 Buzz BD Agent — Autonomous Token Discovery & Listing for SolCex Exchange

**The first AI Business Development agent operating autonomously 24/7 for a centralized exchange, powered by MiniMax M2.5 on decentralized compute.**

![ERC-8004](https://img.shields.io/badge/ERC--8004-Verified-blue) ![Akash](https://img.shields.io/badge/Akash-Deployed-green) ![OpenClaw](https://img.shields.io/badge/OpenClaw-2026.2.26-purple) ![Docker](https://img.shields.io/badge/Docker-v6.0.17-blue) ![npm](https://img.shields.io/badge/npm-%40buzzbd%2Fplugin--solcex--bd-red) ![Tests](https://img.shields.io/badge/Tests-602%20passing-brightgreen)

## What Buzz Does

Buzz scans 30+ tokens per session across multiple DEX data sources, runs them through a 5-layer intelligence pipeline, scores them on a 100-point system (11 scoring factors), and delivers qualified listing prospects to human BD leads via Telegram — all autonomously, 4x daily.

**SolCex Listing Package:** 15K USDT total (5K fee + 10K liquidity) with professional market making ($450K+ depth), 450+ whale trader airdrop, AMA, and 10-14 day fast-track to go-live.

---

## 🆕 v6.0.17 — What's New (Sprint Day 5, Mar 1, 2026)

### 🏦 Bankr LLM Gateway — Self-Sustaining Inference
- **Bankr LLM Gateway** integrated as multi-model fallback provider
- **8 models available:** Gemini 3 Flash, Claude Haiku 4.5, GPT-5 Nano, Claude Sonnet 4.6, Qwen3 Coder, GPT-5 Mini, Gemini 3 Pro, Kimi K2.5
- **Fallback cascade:** MiniMax M2.5 → Gemini 3 Flash → Claude Haiku 4.5 → GPT-5 Nano
- **Self-sustaining loop:** Token deploy fees → fund LLM credits → power inference → discover more tokens
- **$15 LLM credits** funded and active
- **Removed:** ClawRouter/BlockRun x402, OpenRouter (dead key), AkashML (401 error)
- **Cost:** ~$2-5/mo fallback vs ~$10-15/mo previous multi-provider stack

### 🧹 Infrastructure Cleanup
- Removed port 8402 (ClawRouter proxy — no longer needed)
- Removed `OPENROUTER_API_KEY` and `CLAWROUTER_WALLET` from SDL
- Consolidated Bankr section: Partner API + LLM Gateway under single API key
- Docker image: `ghcr.io/buzzbysolcex/buzz-bd-agent:v6.0.17`

### 🧠 L5 Smart Money Intelligence (Nansen x402)
- 5th intelligence layer — Nansen Smart Money lookups via x402 micropayments
- Triggers only when L4 score ≥ 65 (budget-aware activation)
- Score now 100-point system with 11 factors (10 original + Smart Money 0-10)
- Daily budget: $0.50/day ($15/month max)
- Status: Environment configured, awaiting x402-client package install for live payments

### 🐦 Twitter Bot v2.3 — Auto-Reply LIVE
- Auto-reply to mentions every 15 minutes
- Daily cap: 10 tweets, 5 DMs
- All 5 X API keys regenerated (API Key, Secret, Access Token, Access Secret, Bearer)
- pkill guard added to entrypoint for clean bot restarts

### 🔧 OpenClaw v2026.2.26
- MiniMax auth fix (no more 401 errors)
- Telegram fixes + cron reliability improvements

### 🆔 ATV Web3 Identity — Enabled in SDL
- ATV_API_URL=https://api.web3identity.com
- Batch endpoint: /api/ens/batch-resolve
- Daily limit: 100 addresses
- 3x daily verification passes: 09:00, 15:00, 22:00 WIB

### 📋 48 Telegram Commands
- Aligned with Master Ops — includes Bankr deploy commands, Twitter/X commands, and all system operations.

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
│  │  Base #18709  │  │  Bankr API   │  │  Agent Bounty Board    │ │
│  └──────┬───────┘  └──────┬───────┘  └────────┬───────────────┘ │
│         └─────────────────┼────────────────────┘                 │
│                           ▼                                      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              AGENT-TO-AGENT LAYER                          │  │
│  │  ACP Bridge: Agent Control Protocol communication          │  │
│  │  Sub-agents: TOKEN SCOUT, MARKET INTEL (autonomous)        │  │
│  │  Plugin: @buzzbd/plugin-solcex-bd@1.0.0 on npm             │  │
│  └────────────────────────┬──────────────────────────────────┘  │
│                           ▼                                      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              BUZZ BD AGENT v6.0.17                         │  │
│  │                                                             │  │
│  │  LLM: MiniMax M2.5 + Bankr LLM Gateway (8 model fallback) │  │
│  │  Skills: Bankr (LLM+Deploy) + QuillShield (safety)         │  │
│  │  Intel: 16 Sources (L5 Smart Money) | Crons: 40            │  │
│  │  Score: 100-pt System (11 factors) | 48 TG Commands        │  │
│  │  Forensics: Helius + DexScreener + Nansen x402             │  │
│  │  Identity: ATV Web3 (api.web3identity.com) — 3x daily      │  │
│  │  Deploy: Bankr Partner API (Base chain token deployment)    │  │
│  │  Twitter: Bot v2.3 — Auto-reply every 15min                │  │
│  │  Cred: Clawbal On-Chain | ERC-8004 Verified                │  │
│  │  v6.0: 7 Sub-Agents | 602 Tests Passing                   │  │
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

## 5-Layer Intelligence Pipeline

```
╔══════════════════════════════════════════════════════════════════╗
║  LAYER 1 — CAST THE NET (Discovery)                             ║
║  DexScreener API + GeckoTerminal + AIXBT + DexScreener Boosts   ║
║  → 50-100 raw candidates per scan (4x daily)                    ║
╠══════════════════════════════════════════════════════════════════╣
║                           ↓ FILTER                               ║
╠══════════════════════════════════════════════════════════════════╣
║  LAYER 2 — FILTER (Safety & Liquidity Verification)             ║
║  RugCheck + Helius Forensics + DFlow MCP                        ║
║  Instant Kills: Mint not revoked, LP unprotected, mixer-funded   ║
║  → Kill bad tokens fast, 10-20 survive                          ║
╠══════════════════════════════════════════════════════════════════╣
║                           ↓ RESEARCH                             ║
╠══════════════════════════════════════════════════════════════════╣
║  LAYER 3 — RESEARCH (Deep Intelligence)                          ║
║  Firecrawl + ATV Web3 Identity + Grok Sentiment + Serper         ║
║  TEAM/COMMUNITY tagging based on deployer identity               ║
║  → Full research dossier per token                               ║
╠══════════════════════════════════════════════════════════════════╣
║                           ↓ SCORE & ROUTE                        ║
╠══════════════════════════════════════════════════════════════════╣
║  LAYER 4 — SCORE & ACT (100-Point System, 11 Factors)            ║
║  85-100 🔥 HOT    → Immediate outreach + full forensics          ║
║  70-84  ✅ QUAL   → Priority queue + forensics                   ║
║  50-69  👀 WATCH  → Monitor 48h, rescan                          ║
║  0-49   ❌ SKIP   → No action                                    ║
║  Route: Path A (SolCex listing) or Path B (Bankr deploy)         ║
╠══════════════════════════════════════════════════════════════════╣
║                           ↓ SMART MONEY (score ≥ 65)             ║
╠══════════════════════════════════════════════════════════════════╣
║  LAYER 5 — SMART MONEY (Nansen x402) 🆕                         ║
║  Nansen wallet intelligence via x402 micropayments               ║
║  Triggers ONLY when L4 score ≥ 65 (budget-aware)                 ║
║  Adds 0-10 Smart Money bonus to final score                      ║
║  Daily budget: $0.50/day | Threshold: score ≥ 65                 ║
╚══════════════════════════════════════════════════════════════════╝
```

## Intelligence Sources (16 Sources)

| # | Source | Layer | Status | Data |
|---|--------|-------|--------|------|
| 1 | DexScreener API | Discovery | ✅ Working | Token profiles, pairs, boosts, trending |
| 2 | GeckoTerminal | Discovery | ✅ Working | Market data, volume, liquidity |
| 3 | AIXBT | Discovery | ✅ Working | Momentum scoring, catalysts |
| 4 | DexScreener Boosts | Discovery | ✅ Working | Promoted tokens |
| 5 | RugCheck | Filter | ✅ Working | Contract safety, honeypot detection |
| 6 | Helius | Filter | ✅ Working | Solana wallet forensics, deployer history, LP tracing |
| 7 | Allium | Filter | ❌ 404 | 16-chain wallet PnL (endpoint changed) |
| 8 | DFlow MCP | Filter | ✅ Working | DEX swap routes, liquidity depth |
| 9 | Firecrawl | Research | ✅ Working | Website scraping for team/roadmap |
| 10 | ATV Web3 Identity | Research | ✅ LIVE | ENS, Twitter, GitHub, Discord (ETH addresses only) |
| 11 | Grok x_search | Research | ✅ Working | Real-time X/Twitter sentiment |
| 12 | Serper | Research | ✅ Working | Web search verification |
| 13 | X API v2 | Amplification | ✅ LIVE | Tweet/thread auto-reply (Bot v2.3) |
| 14 | Bankr Partner API | Deploy | ✅ LIVE | Token deployment on Base |
| 15 | Nansen x402 | Smart Money | 🟡 ENV Ready | Smart money wallet intelligence (L5) |
| 16 | Moltbook | Supporting | ✅ Working | Agent social network |
| — | OpenClaw Sub-agents | Supporting | ✅ Working | Delegated intelligence |

## LLM Providers

| Provider | Model | Role | Cost (per 1M tokens) |
|----------|-------|------|---------------------|
| MiniMax | M2.5 (229B) | **Primary** | ~$41/mo flat |
| Bankr/gemini-3-flash | Gemini 3 Flash | Fallback #1 | $0.15 in / $0.60 out |
| Bankr/claude-haiku-4.5 | Claude Haiku 4.5 | Fallback #2 | $0.80 in / $4.00 out |
| Bankr/gpt-5-nano | GPT-5 Nano | Fallback #3 | $0.10 in / $0.40 out |
| Bankr/claude-sonnet-4.6 | Claude Sonnet 4.6 | Premium tasks | $3.00 in / $15.00 out |
| Bankr/qwen3-coder | Qwen3 Coder | Code tasks | $0.30 in / $1.20 out |
| Bankr/gpt-5-mini | GPT-5 Mini | General | $0.40 in / $1.60 out |
| Bankr/gemini-3-pro | Gemini 3 Pro | Complex reasoning | $1.25 in / $10.00 out |
| Bankr/kimi-k2.5 | Kimi K2.5 | Long context | $0.60 in / $2.40 out |

**Self-sustaining loop:** Token deploy fees → fund LLM credits → power inference → discover more tokens → loop

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
| Smart Money signal (Nansen L5) 🆕 | +0-10 |

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

## Bankr Partner API — Token Deployment from Telegram

Buzz can deploy ERC-20 tokens on Base chain with a single Telegram command:

```
/launch SolCexGold SGOLD "Gold-backed token by SolCex Exchange"
```

**How it works:**
1. Buzz simulates the deploy first (safety check)
2. Shows predicted token address + fee distribution
3. Asks for confirmation before real deploy
4. Deploys on Base via Bankr/Doppler protocol
5. Returns token address, pool ID, BaseScan link
6. Tracks all deploys in persistent storage

**Fee Distribution (1.2% on all swaps):**

| Role | Share | BPS |
|------|-------|-----|
| Creator (feeRecipient) | 75.05% | 7505 |
| Bankr Platform | 18.05% | 1805 |
| Doppler Protocol | 5.00% | 500 |
| Ecosystem Fund | 1.90% | 190 |

**Two deployment modes:**
- **Internal:** SolCex captures 75.05% of swap fees
- **Client:** Client gets creator share, SolCex keeps 18.05% partner share

First deploy: [BuzzTestCoin (BZTC) — View on BaseScan](https://basescan.org)

## On-Chain Identity (ERC-8004)

| Chain | Agent ID | Registry |
|-------|----------|----------|
| Ethereum | #25045 | 0x8004A818BFB912233c491871b3d84c89A494BD9e |
| Base | #17483 | 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432 |
| Base (anet) | #18709 | 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432 |
| Colosseum | #3734 | Agent Hackathon entry |

## Wallets

| Name | Chain | Address | Purpose |
|------|-------|---------|---------|
| anet (fee recipient) | Base (EVM) | 0x2Dc03124091104E7798C0273D96FC5ED65F05aA9 | Nansen x402 + Bankr fees |
| Deploy wallet | Base (EVM) | 0xfa04c7d627ba707a1ad17e72e094b45150665593 | Bankr token deploy |
| Buzz Base | Base (EVM) | 0x4b362B7db6904A72180A37307191fdDc4eD282Ab | General ops |
| Lobster | Solana | 5iC7pGyzqpXD2xTK4Ww7zKRDVo9cceyHNeKBTiemo5Jp | Solana ops |

## Deployment Stack

| Component | Technology |
|-----------|------------|
| Compute | Akash Network — 2 CPU, 4GB RAM, 10GB persistent storage (~$5/mo) |
| Container | Docker on `ghcr.io/buzzbysolcex/buzz-bd-agent:v6.0.17` |
| Base Image | node:22-slim + tini PID 1 |
| Runtime | OpenClaw v2026.2.26 |
| Primary LLM | MiniMax M2.5 (229B params) |
| Smart Fallback | Bankr LLM Gateway (8 models, self-sustaining credits) |
| Token Deploy | Bankr Partner API (Base chain, zero gas cost) |
| Identity Verify | ATV Web3 Identity (api.web3identity.com, 3x daily batch) |
| Smart Money | Nansen x402 (L5, budget $0.50/day) |
| Twitter | Bot v2.3 — Auto-reply every 15min (10 tweets/5 DMs daily) |
| LLM Cost | ~$41/mo MiniMax + ~$2-5/mo Bankr fallback |
| Compute Cost | ~$5/mo |
| **Total Cost** | **~$48/mo for 24/7 autonomous BD + token deployment agent** |
| Bot | @BuzzBySolCex_bot (Telegram, 48 registered commands) |
| Crons | 40 autonomous scheduled jobs |
| Tests | 602 passing |

## Telegram Commands (48)

| Category | Commands |
|----------|----------|
| System (8) | `help` `status` `health` `version` `config` `memory` `crons` `experience` |
| Scanning (8) | `scan` `score` `search` `verify` `trending` `boosts` `aixbt` `rugcheck` `socials` |
| Pipeline (7) | `pipeline` `report` `weekly` `digest` `alpha` `listings` `competitors` |
| Wallet/Intel (5) | `wallet` `forensics` `whales` `dflow` `budget` |
| Outreach (7) | `outreach` `approve` `reject` `warmup` `followup` `breakup` `dealsheet` `postlisting` |
| Bankr Deploy (3) | `launch` `deploys` `deploy_stats` |
| Twitter/X (3) | `tweet` `thread` `engage` |
| Personal (2) | `prayer` `sprint` |
| Emergency (5) | `sos` `stop` `stop_email` `stop_scan` `resume` |

## BD Strategy — Inbound First

| Channel | Target % | Method |
|---------|----------|--------|
| INBOUND | 60% | Public alpha threads → listing page → they apply |
| WARM OUTREACH | 30% | 3-Touch warm-up → natural conversation |
| PARTNERSHIPS | 10% | Market makers, launchpads, agents refer deals |

### Pipeline Stages
```
DISCOVERED → SCORED → QUALIFIED → WARM_UP → OUTREACH_SENT →
FOLLOW_UP_1 → FOLLOW_UP_2 → RESPONDED → NEGOTIATING → LISTED → POST_LISTING
```

## Integrations & Partnerships

### Tier 1 — Active Integrations

| Partner | Integration |
|---------|-------------|
| Bankr / @bankrbot | Token launch partner API + LLM Gateway (8 models, self-sustaining) |
| ATV Web3 Identity / Gary Palmer | ENS + deployer identity verification (api.web3identity.com) |
| Nansen x402 🆕 | L5 Smart Money wallet intelligence (budget-aware) |
| Helius | Solana wallet forensics + LP tracing |
| MiniMax | Primary LLM provider |
| DexScreener | Token discovery API |
| GeckoTerminal | Market data (better pair data for pre-DEX tokens) |
| Firecrawl | Website intelligence |

### Tier 2 — Active Relationships

| Partner | Status |
|---------|--------|
| DFlow | MCP integrated — DEX route verification |
| ClawdBotATG | Agent Bounty Board — 3 bounties live |
| OpenClaw | ClawHub marketplace — Buzz-as-a-Service |
| Virtuals Protocol | ACP registered — 18K+ agent network |
| elizaOS | PR #263 + npm published |
| Vitto Rivabella (EF dAI) | ERC-8004 article collaboration |
| AgentProof / Builder Benv1 | Exploring — auto-indexes Buzz on ERC-8004 |
| Hummingbot | Market-making integration (planned Week 3-4) |

## Persistent Storage Layout

```
/data/                          ← 10Gi persistent volume on Akash
├── bankr/                      ← Bankr Partner API data
│   ├── bankr-config.json       ← API config + deploy history
│   └── deploys/                ← Individual deploy records
├── pipeline/                   ← BD pipeline data
├── outreach/                   ← Outreach campaigns
│   └── drafts/                 ← Draft messages for review
├── logs/                       ← Operation logs
├── workspace/
│   ├── memory/                 ← Cron schedules, agent memory, rules
│   │   ├── cron-schedule.json  ← 40 jobs backup
│   │   ├── web3-identity-api.md ← ATV endpoint config
│   │   ├── pipeline-rules.md   ← Pipeline discipline rules
│   │   └── solana-deployer-verification.md
│   ├── skills/                 ← Baked skills (synced from image)
│   └── .env                    ← Env passthrough for cron jobs
└── .openclaw/
    └── openclaw.json           ← Gateway config (generated on boot)
```

## Development Workflow

```bash
# Standard: Mac → Docker → GHCR → Akash (never install on Akash)
cd ~/buzz-bd-agent

# CRITICAL: Always prune before building (Docker Desktop context caching issue)
docker builder prune -f

# Build (ALWAYS --no-cache for config/version changes)
docker build --no-cache -t ghcr.io/buzzbysolcex/buzz-bd-agent:v6.0.17 .

# Push to GitHub Container Registry
docker push ghcr.io/buzzbysolcex/buzz-bd-agent:v6.0.17

# Deploy: Akash Console → Close → Create New Deployment → paste SDL → accept bid
# ALWAYS use unique image tags — Akash providers cache by tag name
# Close + New Deployment for clean persistent volume
```

## Cost History

| Period | LLM | Daily Cost | Notes |
|--------|-----|------------|-------|
| Feb 3-14 | Claude Opus 4.5 | ~$1,320/day | Prayer reminders costing $5 each |
| Feb 14-15 | Haiku + Opus fallback | ~$5-10/day | First optimization |
| Feb 15+ | MiniMax M2.5 | ~$1.37/day | 99.9% cost reduction |
| Feb 15-28 | MiniMax + ClawRouter | ~$46/mo | Full autonomous BD + deploy + Twitter agent |
| **Mar 1+** | **MiniMax + Bankr Gateway** | **~$48/mo** | **Self-sustaining LLM via Bankr (8 model fallback)** |

## Version History

| Version | Date | Highlights |
|---------|------|------------|
| **v6.0.17** | **Mar 1, 2026** | **Bankr LLM Gateway (8 models, self-sustaining). Removed ClawRouter/OpenRouter/AkashML. SDL cleanup (port 8402, dead env vars). Fallback cascade: MiniMax → Gemini 3 Flash → Haiku → GPT-5 Nano.** |
| v6.0.9 | Feb 28, 2026 | L5 Smart Money (Nansen x402). Twitter Bot v2.3 auto-reply LIVE. OpenClaw v2026.2.26 (MiniMax auth fix). All X API keys regenerated. ATV enabled in SDL. 11 scoring factors. 48 TG commands. |
| v6.0.4 | Feb 26, 2026 | ATV Web3 Identity FIXED. 48 Telegram commands. 3x daily ATV batch. Bankr skill installed. First pipeline test ($NIRE 78pts, $BABYCLAW 51pts). |
| v6.0.2 | Feb 26, 2026 | Bankr Partner API live, DexScreener API fix, persistent storage, cron env passthrough |
| v6.0.1a | Feb 25, 2026 | OpenClaw 2026.2.24, ClawRouter/BlockRun x402, 47 commands, 602 tests |
| v6.0-alpha | Feb 24, 2026 | 602 tests, 7 sub-agents, dmPolicy debugging |
| v5.3.8-hotfix6 | Feb 22, 2026 | MiniMax anthropic-messages fix, tool calling restored |
| v5.3.5 | Feb 21, 2026 | ClawRouter removed (temp), clean deploy |
| v5.3.1 | Feb 20, 2026 | DFlow MCP, 4-Layer Architecture |

## Pipeline Discipline Rules

- LP verification fails = 2 attempts max → flag HIGH RISK, 48h WATCH
- PumpFun migrations go to Meteora DLMM pools (not just Raydium/PumpSwap)
- GeckoTerminal returns better pair data than DexScreener for pre-DEX tokens
- Opportunity cost: don't chase one token endlessly, next scan has fresh prospects
- Chain limitation: ATV resolves ETH addresses only. Solana deployers use Helius forensics and are tagged UNVERIFIED-IDENTITY

## Links

| Resource | URL |
|----------|-----|
| SolCex Exchange | [solcex.io](https://solcex.io) |
| List with Us | [solcex.cc/list-with-us](https://solcex.cc/list-with-us) |
| Buzz Twitter | [@BuzzBySolCex](https://twitter.com/BuzzBySolCex) |
| SolCex Twitter | [@SolCex_Exchange](https://twitter.com/SolCex_Exchange) |
| ERC-8004 Registry | [8004scan.io](https://8004scan.io) |
| ATV Web3 Identity | [api.web3identity.com](https://api.web3identity.com) |
| First Token Deploy | [BuzzTestCoin on BaseScan](https://basescan.org) |
| Colosseum Entry | Agent #3734 |
| npm Plugin | [@buzzbd/plugin-solcex-bd](https://www.npmjs.com/package/@buzzbd/plugin-solcex-bd) |
| Bankr | [bankr.bot](https://bankr.bot) |
| Bankr LLM Gateway | [bankr.bot/llm](https://bankr.bot/llm) |
| x402 Protocol | [x402.org](https://x402.org) |

## Team

| Role | Handle | Responsibility |
|------|--------|----------------|
| BD Lead | @hidayahanka1 | Strategy, approvals, manual Twitter, partnerships |
| Strategy | Claude Opus 4.6 | Documentation, analysis, planning, outreach drafts |
| Autonomous Agent | Buzz 🐝 | Token scanning, scoring, pipeline management, deployment, Twitter auto-reply |

## Principles

> **Free first, pay for alpha.** — Free intelligence sources before paid
>
> **On-chain track record IS credibility.** — Clawbal, ERC-8004, verifiable
>
> **Inbound > Warm > Cold. Always.** — Build reputation so projects come to us
>
> **The intel is the hook. The relationship is the close.** — Buzz discovers, Ogie closes
>
> **Layer the intelligence. Don't spray and pray.** — 5 layers, every token through all
>
> **Partnership not dependency.** — Distribution channels, not platform locks
>
> **USDC primary.** — Other tokens for utility only
>
> **Deploy from Telegram.** — Token launch is now a single command
>
> **Agent-to-agent = the multiplier.** — Sub-agents extend reach
>
> **Ship from anywhere.** — Docker + Akash + Telegram = deploy from any timezone
>
> **Pipeline discipline > chasing one token.** — Flag, WATCH, move on
>
> **Self-sustaining inference.** — Revenue funds LLM credits, LLM powers revenue
>
> **Talk is cheap, just go build.** — @1bcmax wisdom

---

Powered by [OpenClaw](https://openclaw.ai) • Deployed on [Akash Network](https://akash.network) • ERC-8004 Verified

*"Identity first. Intelligence deep. Commerce autonomous. Cost disciplined. Self-sustaining. Deploy from Telegram."*

`#USDC #AgenticCommerce #Solana #AI #SolCex #BuzzBD #Base #ERC8004 #MachineEconomy #OpenClaw #Bankr #NansenX402`
