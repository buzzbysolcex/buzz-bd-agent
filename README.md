# 🐝 Buzz BD Agent — Autonomous Token Discovery & Listing for SolCex Exchange

> The first AI Business Development agent operating autonomously 24/7 for a centralized exchange, powered by MiniMax M2.5 on decentralized compute.

[![ERC-8004](https://img.shields.io/badge/ERC--8004-Agent%20%2325045-blue)](https://8004scan.io)
[![Akash](https://img.shields.io/badge/Akash-Deployed-red)](https://akash.network)
[![OpenClaw](https://img.shields.io/badge/OpenClaw-v2026.2.21-green)](https://github.com/openclaw/openclaw)
[![Docker](https://img.shields.io/badge/GHCR-v5.3.8--hotfix6-purple)](https://ghcr.io/buzzbysolcex/buzz-bd-agent)
[![npm](https://img.shields.io/badge/npm-@buzzbd/plugin--solcex--bd-orange)](https://npmjs.com/package/@buzzbd/plugin-solcex-bd)

---

## What Buzz Does

Buzz scans **30+ tokens per session** across multiple DEX data sources, runs them through a **4-layer intelligence pipeline**, scores them on a **100-point system**, and delivers qualified listing prospects to human BD leads via Telegram — all autonomously, 4x daily.

**SolCex Listing Package:** 15K USDT total (5K fee + 10K liquidity) with professional market making ($450K+ depth), 450+ whale trader airdrop, AMA, and 10-14 day fast-track to go-live.

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
│  │  Base #17483  │  │  $0.30/day   │  │  ClawHub Skill         │ │
│  │  Base #18709  │  │              │  │  Agent Bounty Board    │ │
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
│  │              BUZZ BD AGENT v5.3.8                          │  │
│  │                                                             │  │
│  │  LLM: MiniMax M2.5 (anthropic-messages API)                │  │
│  │  Skills: ClawRouter (LLM routing) + QuillShield (safety)   │  │
│  │  Intel: 16/16 Sources | Crons: 36/36 | 20 TG Commands     │  │
│  │  Score: 100-pt System | Forensics: Helius + Allium         │  │
│  │  Cred: Clawbal On-Chain | ERC-8004 Verified                │  │
│  └────────────────────────┬──────────────────────────────────┘  │
│                           ▼                                      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              SOLCEX EXCHANGE                                │  │
│  │  15K USDT Listing | Market Making | Whale Airdrop          │  │
│  │  10-14 Day Fast-Track | Solana-Native CEX                  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4-Layer Intelligence Pipeline

```
╔══════════════════════════════════════════════════════════════════╗
║  LAYER 1 — CAST THE NET (Discovery)                             ║
║  DexScreener + AIXBT + Clawpump + CoinGecko + DexScreener Boosts║
║  → 50-100 raw candidates per scan (4x daily)                    ║
╠══════════════════════════════════════════════════════════════════╣
║                           ↓ FILTER                               ║
╠══════════════════════════════════════════════════════════════════╣
║  LAYER 2 — FILTER (Safety & Liquidity Verification)             ║
║  RugCheck + Helius Forensics + Allium 16-Chain + DFlow MCP      ║
║  → Kill bad tokens fast, 10-20 survive                          ║
╠══════════════════════════════════════════════════════════════════╣
║                           ↓ RESEARCH                             ║
╠══════════════════════════════════════════════════════════════════╣
║  LAYER 3 — RESEARCH (Deep Intelligence)                          ║
║  leak.me KOLs + Firecrawl + ATV Identity + Grok Sentiment + Serper║
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

| # | Source | Layer | API | Data |
|---|--------|-------|-----|------|
| 1 | **DexScreener** | Discovery | REST (free) | Token profiles, pairs, boosts, trending |
| 2 | **AIXBT** | Discovery | Scrape (free) | Momentum scoring, catalysts |
| 3 | **AIXBT v2** | Supporting | x402 ($0.10/call) | Premium momentum + sentiment |
| 4 | **RugCheck** | Filter | REST (free) | Contract safety, honeypot detection |
| 5 | **Helius** | Filter | REST (free tier) | Solana wallet forensics, deployer history |
| 6 | **Allium** | Filter | REST (free 10K/mo) | 16-chain wallet PnL, balances, transactions |
| 7 | **leak.me** | Research | Scrape (free) | KOL/smart money tracking |
| 8 | **Clawpump** | Discovery | Monitor (free) | Agent token launches |
| 9 | **Firecrawl** | Research | REST (free 500 credits) | Website scraping for team/roadmap |
| 10 | **Colosseum** | Supporting | Forum (free) | Hackathon community |
| 11 | **Moltbook** | Supporting | API (free) | Agent social network |
| 12 | **ATV Web3 Identity** | Research | REST (free 10K/mo) | ENS, Farcaster/Lens, Gitcoin Passport |
| 13 | **Grok x_search** | Research | xAI API | Real-time X/Twitter sentiment |
| 14 | **Serper** | Research | REST | Web search verification |
| 15 | **OpenClaw Sub-agents** | Supporting | ACP (free) | Delegated intelligence via sub-agents |
| 16 | **DFlow MCP** | Filter | mcporter (free) | DEX swap routes, liquidity depth, slippage |

---

## On-Chain Identity (ERC-8004)

| Chain | Agent ID | Registry | Skills |
|-------|----------|----------|--------|
| **Ethereum** | #25045 | `0x8004A818BFB912233c491871b3d84c89A494BD9e` | — |
| **Base** | #17483 | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` | — |
| **Base (anet)** | #18709 | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` | 4 skills |
| **Colosseum** | #3734 | Agent Hackathon entry | — |

**Reputation Registries:**
- Ethereum: `0x8004B663056A597Dffe9eCcC1965A193B7388713`
- Base: `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`

---

## Wallets

| Name | Chain | Address |
|------|-------|---------|
| **anet** | Base (EVM) | `0x2Dc03124091104E7798C0273D96FC5ED65F05aA9` |
| **Buzz Base** | Base (EVM) | `0x4b362B7db6904A72180A37307191fdDc4eD282Ab` |
| **ClawRouter** | Base (EVM) | `0x9b28931785c5687811850AD08e158F8479743A76` |
| **Lobster** | Solana | `5iC7pGyzqpXD2xTK4Ww7zKRDVo9cceyHNeKBTiemo5Jp` |

---

## Deployment Stack

| Component | Technology |
|-----------|-----------|
| **Compute** | Akash Network — 2 CPU, 4GB RAM, 10GB persistent storage (~$5-8/mo) |
| **Container** | Docker on `ghcr.io/buzzbysolcex/buzz-bd-agent:v5.3.8-hotfix6` |
| **Base Image** | `node:22-slim` + tini PID 1 |
| **Runtime** | OpenClaw v2026.2.21 |
| **Primary LLM** | MiniMax M2.5 (229B params, `anthropic-messages` API) |
| **Free Fallbacks** | Llama 3.3 70B (OpenRouter) → Qwen3 30B (AkashML) |
| **Emergency** | Claude Haiku 4.5 → Claude Opus 4.5 (last resort) |
| **LLM Cost** | ~$41/mo (down from $1,320/day — 99.9% reduction) |
| **Compute Cost** | ~$5-8/mo |
| **Total Cost** | **~$48/mo for 24/7 autonomous BD agent** |
| **Bot** | @BuzzBySolCex_bot (Telegram, 20 registered commands) |
| **Crons** | 36 autonomous scheduled jobs |
| **Skills** | ClawRouter (smart LLM routing) + QuillShield (contract safety) |

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
| AIXBT HIGH CONVICTION | +10 |
| Hackathon/Competition | +10 |
| Viral moment / KOL mention | +10 |
| Identity verified (ENS+socials) | +5 |
| DFlow 3+ swap routes | +5 |
| Mint + Freeze revoked | +5 |
| LP burned | +5 |
| Audited | +5 |
| Age >14d stable volume | +5 |

### Key Penalties
| Flag | Points |
|------|--------|
| Freeze authority active | -15 |
| Top 10 holders >50% | -15 |
| CEX already listed | -15 |
| Liquidity dropping | -15 |
| Top holder >15% | -10 |
| Token age <24h | -10 |
| Deployer holds >10% | -10 |

### Layer 2 Mandatory Checks (before scoring 70+)
1. **CEX listing check:** CoinGecko + CMC
2. **CTO detection:** Community Takeover flag
3. **Volatility check:** >+100% or <-30% → wait 48h

---

## BD Strategy — Inbound First

| Channel | Target % | Method |
|---------|----------|--------|
| **INBOUND** | 60% | Public alpha threads → listing page → they apply |
| **WARM OUTREACH** | 30% | 3-Touch warm-up → natural conversation |
| **PARTNERSHIPS** | 10% | Market makers, launchpads, agents refer deals |

### 3-Touch Warm-Up (Never Cold DM)
| Touch | Timing | Action |
|-------|--------|--------|
| 1 | Day 0 | Public engagement on their tweet |
| 2 | Day 2-3 | Valuable signal or alpha tag |
| 3 | Day 5-7 | Natural listing conversation |

### Pipeline Stages
```
DISCOVERED → SCORED → QUALIFIED → WARM_UP → OUTREACH_SENT → FOLLOW_UP_1 → FOLLOW_UP_2 → RESPONDED → NEGOTIATING → LISTED → POST_LISTING
```

---

## Cron Schedule (36 Jobs)

| Category | Count | Schedule |
|----------|-------|----------|
| Token Scanning | 4 | 05:00, 12:00, 18:30, 21:00 AST |
| Prayer Reminders | 5 | Fajr, Dhuhr, Asr, Maghrib, Isha |
| System Operations | 3 | Compression, health, digest |
| Heartbeats | 3 | Colosseum 30m, Moltbook 4h, stream 5m |
| x402 Intelligence | 5 | Whale alerts, breaking news, spend tracking |
| Clawbal On-Chain | 3 | Post-scan, PnL update, daily summary |
| Machine Economy | 3 | HyperSkill, HyperAgent, AIXBT v2 |
| Agent Interop | 4 | Plugin health, sub-agent cleanup, ACP, elizaOS |
| BD Lifecycle | 6 | Warm-up tracker, follow-ups, alpha draft, competitor alerts, inbound, post-listing |

---

## Partnerships

### Tier 1 — Active Integrations

| Partner | Integration |
|---------|-------------|
| **Vitto Rivabella** (EF dAI) | ERC-8004 article collaboration |
| **Gary Palmer** (ATV) | ENS deployer verification |
| **zauthx402** | x402 trust verification |
| **Einstein AI** | x402 whale alerts |
| **Gloria AI** | x402 breaking news |
| **Helius** | Solana wallet forensics |
| **Allium** | 16-chain PnL/balances |
| **MiniMax** | Primary LLM provider |
| **Rich Pedersen** (AgenticTrust.io) | Agent trust ontology |
| **AgentProof** | Agent verification |

### Tier 2 — Active Relationships

| Partner | Status |
|---------|--------|
| **DFlow** | MCP integrated — Source #16, DEX route verification |
| **Bankr** | Partnership pitch — USDC primary |
| **ClawdBotATG** | Austin Griffith ecosystem — Agent Bounty Board |
| **OpenClaw** | ClawHub marketplace — Buzz-as-a-Service |
| **Virtuals Protocol** | ACP registered — 18K+ agent network |
| **elizaOS** | PR #263 + npm published — Plugin registry |
| **lobster.cash** | Agent commerce |

---

## Agent Bounty Board

Buzz posted **Bounty #0** — the first-ever bounty on ClawdBotATG's Agent Bounty Board contract.

| Field | Value |
|-------|-------|
| Contract | `0x3797710f9ff1FA1Cf0Bf014581e4651845d75530` (Base) |
| TX | `0xc8c8f2456014458ce1af971c6919a1f5693c0adb1723b9088f274381af60d2fc` |
| Bounties | 3 live (Solana Research, Base Discovery, Agent Ecosystem Map) |
| Escrowed | 23K $CLAWD |
| CLI | [buzz-bounty-board](https://github.com/buzzbysolcex/buzz-bounty-board) |

---

## ElizaOS Plugin

```bash
npm install @buzzbd/plugin-solcex-bd
```

| Field | Value |
|-------|-------|
| **Package** | `@buzzbd/plugin-solcex-bd@1.0.0` |
| **Actions** | SCAN_TOKENS, SCORE_TOKEN, CHECK_WALLET, SUBMIT_LISTING |
| **Hooks** | 3 (market intel, pipeline status, listing readiness) |
| **Channels** | Telegram ✅, Web UI ✅, ACP ✅ |
| **Registry PR** | #263 (elizaos-plugins/registry) |

---

## Telegram Commands (20)

| Command | Description |
|---------|-------------|
| `/scan` | Run token scan now |
| `/score` | Score a specific token |
| `/pipeline` | Show active pipeline |
| `/status` | System health check |
| `/report` | Generate daily report |
| `/search` | Search for a token |
| `/wallet` | Check wallet forensics |
| `/outreach` | Draft outreach message |
| `/approve` | Approve outreach |
| `/reject` | Reject outreach |
| `/weekly` | Generate weekly report |
| `/alpha` | Draft public alpha thread |
| `/crons` | List active cron jobs |
| `/health` | Full system health |
| `/experience` | Show learned patterns |
| `/help` | List all commands |
| `/reset` | Reset conversation |
| `/memory` | Show memory status |
| `/config` | Show configuration |
| `/version` | Show version info |

---

## Competitor Intelligence

| Exchange | Tokens | Fee Range | SolCex Advantage |
|----------|--------|-----------|-----------------|
| MEXC | 3,600+ | $30K–$80K | We're faster + cheaper |
| Bitget | 800+ | $50K–$100K+ | Automated scoring matches their Nansen |
| Gate.io | 3,800+ | $200K–$250K | 85-95% cheaper |
| Binance | 400+ | $500K+ | Their Alpha additions = future signal |
| Bybit | 600+ | $50K–$100K | Their listings = validation for our angle |

**SolCex edge:** 85-95% cheaper than Tier 1/2. 10-14 day fast-track. 450 whale airdrop. Solana-native.

---

## Development Workflow

```bash
# Standard: Mac → Docker → GHCR → Akash (never install on Akash)
cd ~/buzz-v538-hotfix6

# Build (ALWAYS --no-cache for config/version changes)
docker build --no-cache -t ghcr.io/buzzbysolcex/buzz-bd-agent:vNEW .

# Push to GitHub Container Registry
docker push ghcr.io/buzzbysolcex/buzz-bd-agent:vNEW

# Deploy: Update SDL image tag → Akash Console → Update Deployment
# For ENV var changes: Close deployment → Fresh deploy with new SDL
```

---

## Cost History

| Period | LLM | Daily Cost | Notes |
|--------|-----|-----------|-------|
| Feb 3-14 | Claude Opus 4.5 | ~$1,320/day | Prayer reminders costing $5 each |
| Feb 14-15 | Haiku + Opus fallback | ~$5-10/day | First optimization |
| Feb 15+ | MiniMax M2.5 | ~$1.37/day | **99.9% cost reduction** |
| **Current** | **MiniMax + Akash** | **~$48/mo** | **Full autonomous BD agent** |

---

## Links

| Resource | URL |
|----------|-----|
| SolCex Exchange | [solcex.io](https://solcex.io) |
| List with Us | [solcex.cc/list-with-us](https://solcex.cc/list-with-us) |
| Buzz Twitter | [@BuzzBySolCex](https://x.com/BuzzBySolCex) |
| SolCex Twitter | [@SolCex_Exchange](https://x.com/SolCex_Exchange) |
| ERC-8004 Registry | [8004scan.io](https://8004scan.io) |
| Colosseum Entry | Agent #3734 |
| npm Plugin | [@buzzbd/plugin-solcex-bd](https://npmjs.com/package/@buzzbd/plugin-solcex-bd) |
| Bounty Board CLI | [buzz-bounty-board](https://github.com/buzzbysolcex/buzz-bounty-board) |
| Plugin Repo | [plugin-solcex-bd](https://github.com/buzzbysolcex/plugin-solcex-bd) |
| x402 Protocol | [x402](https://x.com/x402) |

---

## Team

| Role | Handle | Responsibility |
|------|--------|----------------|
| **BD Lead** | [@hidayahanka1](https://x.com/hidayahanka1) | Strategy, approvals, manual Twitter, partnerships |
| **Strategy** | Claude Opus 4.6 | Documentation, analysis, planning, outreach drafts |
| **Autonomous Agent** | Buzz 🐝 | Token scanning, scoring, pipeline management, reporting |

---

## Principles

1. **Free first, pay for alpha.** — Free intelligence sources before paid
2. **On-chain track record IS credibility.** — Clawbal, ERC-8004, verifiable
3. **Inbound > Warm > Cold. Always.** — Build reputation so projects come to us
4. **The intel is the hook. The relationship is the close.** — Buzz discovers, Ogie closes
5. **Layer the intelligence. Don't spray and pray.** — 4 layers, every token through all
6. **Partnership not dependency.** — Distribution channels, not platform locks
7. **USDC primary.** — Other tokens for utility only
8. **LLM cascade = cost discipline.** — MiniMax first, Anthropic last resort
9. **Agent-to-agent = the multiplier.** — Sub-agents extend reach
10. **Ship from anywhere.** — Docker + Akash + Telegram = deploy from any timezone

---

*Powered by OpenClaw • Deployed on Akash Network • ERC-8004 Verified*
*"Identity first. Intelligence deep. Commerce autonomous. Cost disciplined. Ship from anywhere."*

#USDC #AgenticCommerce #Solana #AI #SolCex #BuzzBD #Base #ERC8004 #MachineEconomy #OpenClaw
