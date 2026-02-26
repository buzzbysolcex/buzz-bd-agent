# 🐝 Buzz BD Agent — Autonomous Token Discovery & Listing for SolCex Exchange

> The first AI Business Development agent operating autonomously 24/7 for a centralized exchange, powered by MiniMax M2.5 on decentralized compute.

[![ERC-8004](https://img.shields.io/badge/ERC--8004-Verified-blue)](https://8004scan.io)
[![Akash](https://img.shields.io/badge/Akash-Deployed-red)](https://akash.network)
[![OpenClaw](https://img.shields.io/badge/OpenClaw-2026.2.24-green)](https://openclaw.com)
[![Docker](https://img.shields.io/badge/Docker-v6.0.2-blue)](https://ghcr.io/buzzbysolcex/buzz-bd-agent)
[![npm](https://img.shields.io/badge/npm-plugin--solcex--bd-red)](https://npmjs.com/package/@buzzbd/plugin-solcex-bd)
[![Tests](https://img.shields.io/badge/Tests-602%20Passing-brightgreen)](#)

## What Buzz Does

Buzz scans 30+ tokens per session across multiple DEX data sources, runs them through a **4-layer intelligence pipeline**, scores them on a **100-point system**, and delivers qualified listing prospects to human BD leads via Telegram — all autonomously, 4x daily.

**NEW in v6.0.2:** Buzz can now **deploy tokens on Base chain** via the Bankr Partner API directly from Telegram, with automatic fee collection (75.05% creator share on all swaps).

> **SolCex Listing Package:** 15K USDT total (5K fee + 10K liquidity) with professional market making ($450K+ depth), 450+ whale trader airdrop, AMA, and 10-14 day fast-track to go-live.

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
│  │  Base #17483  │  │  BlockRun    │  │  ClawHub Skill         │ │
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
│  │              BUZZ BD AGENT v6.0.2                          │  │
│  │                                                             │  │
│  │  LLM: MiniMax M2.5 + ClawRouter/BlockRun x402 fallback    │  │
│  │  Skills: ClawRouter (LLM routing) + QuillShield (safety)   │  │
│  │  Intel: 16/16 Sources | Crons: 36/36 | 36 TG Commands     │  │
│  │  Score: 100-pt System | Forensics: Helius + DexScreener    │  │
│  │  Deploy: Bankr Partner API (Base chain token deployment)   │  │
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

---

## v6.0.2 — What's New (Sprint Day 2, Feb 26 2026)

### 🚀 Bankr Partner API — Token Deployment from Telegram

Buzz can now deploy ERC-20 tokens on Base chain with a single Telegram command:

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

**First deploy:** BuzzTestCoin (BZTC) — [View on BaseScan](https://basescan.org/token/0x21703579fd104ccd463c47b68e5673bf1b2efba3)

### 🔧 Infrastructure Fixes

- **DexScreener API:** Switched from website scraping to official REST API (no more Cloudflare blocks)
- **Firecrawl:** Fixed endpoint URL — now working for website research
- **Cron env passthrough:** `.env` file auto-generated on boot for cron sub-agent access
- **Model stability:** Locked to MiniMax M2.5 via env var — no more fallback loops to nvidia/gpt-oss-120b
- **Perplexity disabled:** Kill switch prevents crash loops from exhausted OpenRouter credits

### 📊 Scan Filter Upgrade

Tokens now tagged as **TEAM** or **COMMUNITY**:
- **TEAM TOKEN (+10 pts):** Identifiable team member, website with team page, active Telegram admin → Priority for listing outreach
- **COMMUNITY TOKEN (-10 pts):** No identifiable lead → Brand tweets only

---

## v6.0 Sub-Agent Architecture (602 Tests Passing)

| Agent | Purpose | Tests |
|-------|---------|-------|
| TokenAgent | DexScreener scanning, filtering | ✅ |
| SafetyAgent | RugCheck, contract verification | ✅ |
| LiquidityAgent | Helius, DFlow MCP integration | ✅ |
| SocialAgent | Grok/xAI Twitter, ATV Web3 Identity, Serper | ✅ |
| DeployAgent | Deployer cross-chain intelligence | ✅ |
| ScoringAgent | 100-point composite scoring | ✅ |
| Orchestrator | Parallel execution coordinator | ✅ |

---

## 4-Layer Intelligence Pipeline

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
║  → Kill bad tokens fast, 10-20 survive                          ║
╠══════════════════════════════════════════════════════════════════╣
║                           ↓ RESEARCH                             ║
╠══════════════════════════════════════════════════════════════════╣
║  LAYER 3 — RESEARCH (Deep Intelligence)                          ║
║  Firecrawl + ATV Identity + Grok Sentiment + Serper              ║
║  → Full research dossier per token                               ║
╠══════════════════════════════════════════════════════════════════╣
║                           ↓ SCORE                                ║
╠══════════════════════════════════════════════════════════════════╣
║  LAYER 4 — SCORE & ACT (100-Point System)                        ║
║  85-100 🔥 HOT    → Immediate outreach + full forensics          ║
║  70-84  ✅ QUAL   → Priority queue + forensics                   ║
║  50-69  👀 WATCH  → Monitor 48h, rescan                          ║
║  0-49   ❌ SKIP   → No action                                    ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## Intelligence Sources (16 Active)

| # | Source | Layer | Status | Data |
|---|--------|-------|--------|------|
| 1 | DexScreener API | Discovery | ✅ Working | Token profiles, pairs, boosts, trending |
| 2 | GeckoTerminal | Discovery | ✅ Working | Market data, volume, liquidity |
| 3 | AIXBT | Discovery | ✅ Working | Momentum scoring, catalysts |
| 4 | RugCheck | Filter | ✅ Working | Contract safety, honeypot detection |
| 5 | Helius | Filter | ✅ Working | Solana wallet forensics, deployer history |
| 6 | Allium | Filter | ❌ 404 | 16-chain wallet PnL (endpoint changed) |
| 7 | leak.me | Research | ✅ Working | KOL/smart money tracking |
| 8 | Firecrawl | Research | ✅ Working | Website scraping for team/roadmap |
| 9 | Grok x_search | Research | ✅ Working | Real-time X/Twitter sentiment |
| 10 | Serper | Research | ✅ Working | Web search verification |
| 11 | ATV Web3 Identity | Research | ✅ Working | ENS, Farcaster/Lens, Gitcoin Passport |
| 12 | DFlow MCP | Filter | ✅ Working | DEX swap routes, liquidity depth |
| 13 | Moltbook | Supporting | ✅ Working | Agent social network |
| 14 | Colosseum | Supporting | ✅ Working | Hackathon community |
| 15 | OpenClaw Sub-agents | Supporting | ✅ Working | Delegated intelligence via sub-agents |
| 16 | Bankr Partner API | Deploy | ✅ Working | Token deployment on Base chain |

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
  TOTAL:                $2,525/mo vs $46/mo costs = 55x ROI
```

---

## On-Chain Identity (ERC-8004)

| Chain | Agent ID | Registry |
|-------|----------|----------|
| Ethereum | #25045 | 0x8004A818BFB912233c491871b3d84c89A494BD9e |
| Base | #17483 | 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432 |
| Base (anet) | #18709 | 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432 |
| Colosseum | #3734 | Agent Hackathon entry |

---

## Wallets

| Name | Chain | Address |
|------|-------|---------|
| anet (fee recipient) | Base (EVM) | 0x2Dc03124091104E7798C0273D96FC5ED65F05aA9 |
| Deploy wallet | Base (EVM) | 0xfa04c7d627ba707a1ad17e72e094b45150665593 |
| ClawRouter (x402) | Base (EVM) | 0x56f76494a60eBb52325630e69F7d8C0635E5C980 |
| Buzz Base | Base (EVM) | 0x4b362B7db6904A72180A37307191fdDc4eD282Ab |
| BlockRun x402 | Base (EVM) | 0x6ea362d34238089Ec3226A256F25CbD14f35493b |
| Lobster | Solana | 5iC7pGyzqpXD2xTK4Ww7zKRDVo9cceyHNeKBTiemo5Jp |

---

## Deployment Stack

| Component | Technology |
|-----------|-----------|
| Compute | Akash Network — 2 CPU, 4GB RAM, 10GB persistent storage (~$5/mo) |
| Container | Docker on ghcr.io/buzzbysolcex/buzz-bd-agent:v6.0.2 |
| Base Image | node:22-slim + tini PID 1 |
| Runtime | OpenClaw v2026.2.24 |
| Primary LLM | MiniMax M2.5 (229B params) |
| Smart Fallback | ClawRouter + BlockRun x402 (30+ models via micropayments) |
| Token Deploy | Bankr Partner API (Base chain, zero gas cost) |
| LLM Cost | ~$41/mo (down from $1,320/day — 99.9% reduction) |
| Compute Cost | ~$5/mo |
| Total Cost | ~$46/mo for 24/7 autonomous BD + token deployment agent |
| Bot | @BuzzBySolCex_bot (Telegram, 36 registered commands) |
| Crons | 36 autonomous scheduled jobs |
| Tests | 602 passing |

---

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
│   ├── memory/                 ← Cron schedules, agent memory
│   ├── skills/                 ← Baked skills (synced from image)
│   └── .env                    ← Env passthrough for cron jobs
└── .openclaw/
    └── openclaw.json           ← Gateway config (generated on boot)
```

---

## Telegram Commands (36)

| Category | Commands |
|----------|----------|
| Scanning (8) | scan, score, verify, trending, boosts, aixbt, rugcheck, forensics |
| Pipeline (7) | pipeline, report, weekly, digest, alpha, warmup, followup |
| Wallet/Intel (5) | wallet, whales, dflow, bankr, budget |
| Outreach (5) | outreach, approve, reject, breakup, dealsheet |
| Bankr Deploy (3) | launch, deploys, deploy_stats |
| System (4) | health, sprint, prayer, postlisting |
| Emergency (4) | sos, stop, resume, crons |

---

## Scoring Engine (100-Point System)

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

### Key Penalties

| Flag | Points |
|------|--------|
| COMMUNITY TOKEN (no team) | -10 |
| Freeze authority active | -15 |
| Top 10 holders >50% | -15 |
| CEX already listed | -15 |
| Token age <24h | -10 |

---

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

---

## Integrations & Partnerships

### Tier 1 — Active Integrations

| Partner | Integration |
|---------|------------|
| Bankr / @bankrbot | Token launch partner API — 75.05% creator / 18.05% partner fee split |
| ClawRouter / @1bcmax | Smart LLM routing + BlockRun x402 (30+ models) |
| ATV Web3 Identity / Gary Palmer | ENS + deployer identity verification |
| Helius | Solana wallet forensics |
| MiniMax | Primary LLM provider |
| DexScreener | Token discovery API |
| GeckoTerminal | Market data |
| Firecrawl | Website intelligence |

### Tier 2 — Active Relationships

| Partner | Status |
|---------|--------|
| DFlow | MCP integrated — DEX route verification |
| ClawdBotATG | Agent Bounty Board — 3 bounties live |
| OpenClaw | ClawHub marketplace — Buzz-as-a-Service |
| Virtuals Protocol | ACP registered — 18K+ agent network |
| elizaOS | PR #263 + npm published |
| Hummingbot | Market-making integration (planned Week 3-4) |

---

## Cost History

| Period | LLM | Daily Cost | Notes |
|--------|-----|-----------|-------|
| Feb 3-14 | Claude Opus 4.5 | ~$1,320/day | Prayer reminders costing $5 each |
| Feb 14-15 | Haiku + Opus fallback | ~$5-10/day | First optimization |
| Feb 15+ | MiniMax M2.5 | ~$1.37/day | 99.9% cost reduction |
| Current | MiniMax + ClawRouter | ~$46/mo | Full autonomous BD + deploy agent |

---

## Version History

| Version | Date | Highlights |
|---------|------|-----------|
| **v6.0.2** | **Feb 26, 2026** | **Bankr Partner API live, token deployment from Telegram, DexScreener API fix, persistent storage structure, cron env passthrough, Perplexity kill switch, scan filter upgrade (TEAM/COMMUNITY)** |
| v6.0.1a | Feb 25, 2026 | OpenClaw 2026.2.24, ClawRouter/BlockRun x402, 47 commands, 602 tests |
| v6.0-alpha | Feb 24, 2026 | 602 tests, 7 sub-agents, dmPolicy debugging |
| v5.3.8-hotfix6 | Feb 22, 2026 | MiniMax anthropic-messages fix, tool calling restored |
| v5.3.5 | Feb 21, 2026 | ClawRouter removed (temp), clean deploy |
| v5.3.1 | Feb 20, 2026 | DFlow MCP, 4-Layer Architecture |

---

## Development Workflow

```bash
# Standard: Mac → Docker → GHCR → Akash (never install on Akash)
cd ~/buzz-bd-agent

# Build (ALWAYS --no-cache for config/version changes)
docker build --no-cache -t ghcr.io/buzzbysolcex/buzz-bd-agent:v6.0.2 .

# Push to GitHub Container Registry
docker push ghcr.io/buzzbysolcex/buzz-bd-agent:v6.0.2

# Deploy: Paste SDL in Akash Console → Create New Deployment
# ⚠️ ALWAYS use unique image tags — Akash providers cache by tag name
# ⚠️ Close + New Deployment for clean persistent volume
```

---

## Links

| Resource | URL |
|----------|-----|
| SolCex Exchange | [solcex.io](https://solcex.io) |
| List with Us | [solcex.cc/list-with-us](https://solcex.cc/list-with-us) |
| Buzz Twitter | [@BuzzBySolCex](https://x.com/BuzzBySolCex) |
| SolCex Twitter | [@SolCex_Exchange](https://x.com/SolCex_Exchange) |
| ERC-8004 Registry | [8004scan.io](https://8004scan.io) |
| First Token Deploy | [BuzzTestCoin on BaseScan](https://basescan.org/token/0x21703579fd104ccd463c47b68e5673bf1b2efba3) |
| Colosseum Entry | Agent #3734 |
| npm Plugin | [@buzzbd/plugin-solcex-bd](https://npmjs.com/package/@buzzbd/plugin-solcex-bd) |
| Bankr | [bankr.bot](https://bankr.bot) |
| ClawRouter | [@1bcmax](https://x.com/1bcmax) |
| x402 Protocol | [x402.org](https://x402.org) |

---

## Team

| Role | Handle | Responsibility |
|------|--------|---------------|
| BD Lead | @hidayahanka1 | Strategy, approvals, manual Twitter, partnerships |
| Strategy | Claude Opus 4.6 | Documentation, analysis, planning, outreach drafts |
| Autonomous Agent | Buzz 🐝 | Token scanning, scoring, pipeline management, deployment |

---

## Principles

> **Free first, pay for alpha.** — Free intelligence sources before paid  
> **On-chain track record IS credibility.** — Clawbal, ERC-8004, verifiable  
> **Inbound > Warm > Cold. Always.** — Build reputation so projects come to us  
> **The intel is the hook. The relationship is the close.** — Buzz discovers, Ogie closes  
> **Layer the intelligence. Don't spray and pray.** — 4 layers, every token through all  
> **Partnership not dependency.** — Distribution channels, not platform locks  
> **USDC primary.** — Other tokens for utility only  
> **Deploy from Telegram.** — Token launch is now a single command  
> **Agent-to-agent = the multiplier.** — Sub-agents extend reach  
> **Ship from anywhere.** — Docker + Akash + Telegram = deploy from any timezone  

---

Powered by [OpenClaw](https://openclaw.com) • Deployed on [Akash Network](https://akash.network) • ERC-8004 Verified  
*"Identity first. Intelligence deep. Commerce autonomous. Cost disciplined. Deploy from Telegram."*

#USDC #AgenticCommerce #Solana #AI #SolCex #BuzzBD #Base #ERC8004 #MachineEconomy #OpenClaw #Bankr
