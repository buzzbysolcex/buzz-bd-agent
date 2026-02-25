# 🐝 Buzz BD Agent — Autonomous Token Discovery & Listing for SolCex Exchange

> The first AI Business Development agent operating autonomously 24/7 for a centralized exchange, powered by MiniMax M2.5 on decentralized compute.

[![ERC-8004](https://img.shields.io/badge/ERC--8004-ETH%20%2325045-purple)](https://etherscan.io)
[![Akash](https://img.shields.io/badge/Akash-Deployed-green)](https://akash.network)
[![OpenClaw](https://img.shields.io/badge/OpenClaw-2026.2.24-blue)](https://github.com/openclaw/openclaw)
[![Docker](https://img.shields.io/badge/Docker-ghcr.io-orange)](https://ghcr.io/buzzbysolcex/buzz-bd-agent)
[![npm](https://img.shields.io/badge/npm-@buzzbd/plugin--solcex--bd-red)](https://www.npmjs.com/package/@buzzbd/plugin-solcex-bd)
[![Tests](https://img.shields.io/badge/Tests-602%20passing-brightgreen)]()

---

## What Buzz Does

Buzz scans 30+ tokens per session across multiple DEX data sources, runs them through a 4-layer intelligence pipeline, scores them on a 100-point system, and delivers qualified listing prospects to human BD leads via Telegram — all autonomously, 4x daily.

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
│  │              BUZZ BD AGENT v6.0.1                          │  │
│  │                                                             │  │
│  │  LLM: MiniMax M2.5 + ClawRouter/BlockRun x402 fallback    │  │
│  │  Skills: ClawRouter (LLM routing) + QuillShield (safety)   │  │
│  │  Intel: 16/16 Sources | Crons: 36/36 | 47 TG Commands     │  │
│  │  Score: 100-pt System | Forensics: Helius + Allium         │  │
│  │  Cred: Clawbal On-Chain | ERC-8004 Verified                │  │
│  │  v6.0: 7 Sub-Agents | 602 Tests Passing                   │  │
│  └────────────────────────┬──────────────────────────────────┘  │
│                           ▼                                      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              SOLCEX EXCHANGE                                │  │
│  │  15K USDT Listing | Market Making | Whale Airdrop          │  │
│  │  10-14 Day Fast-Track | Solana-Native CEX                  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### v6.0 Sub-Agent Architecture (602 Tests Passing)

| Agent | Purpose | Tests |
|-------|---------|-------|
| **TokenAgent** | DexScreener scanning, filtering | ✅ |
| **SafetyAgent** | RugCheck, contract verification | ✅ |
| **LiquidityAgent** | Helius, Allium, DFlow MCP integration | ✅ |
| **SocialAgent** | Grok/xAI Twitter, ATV Web3 Identity, Serper | ✅ |
| **DeployAgent** | Deployer cross-chain intelligence | ✅ |
| **ScoringAgent** | 100-point composite scoring | ✅ |
| **Orchestrator** | Parallel execution coordinator | ✅ |

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
| 1 | DexScreener | Discovery | REST (free) | Token profiles, pairs, boosts, trending |
| 2 | AIXBT | Discovery | Scrape (free) | Momentum scoring, catalysts |
| 3 | AIXBT v2 | Supporting | x402 ($0.10/call) | Premium momentum + sentiment |
| 4 | RugCheck | Filter | REST (free) | Contract safety, honeypot detection |
| 5 | Helius | Filter | REST (free tier) | Solana wallet forensics, deployer history |
| 6 | Allium | Filter | REST (free 10K/mo) | 16-chain wallet PnL, balances, transactions |
| 7 | leak.me | Research | Scrape (free) | KOL/smart money tracking |
| 8 | Clawpump | Discovery | Monitor (free) | Agent token launches |
| 9 | Firecrawl | Research | REST (free 500 credits) | Website scraping for team/roadmap |
| 10 | Colosseum | Supporting | Forum (free) | Hackathon community |
| 11 | Moltbook | Supporting | API (free) | Agent social network |
| 12 | ATV Web3 Identity | Research | REST (free 10K/mo) | ENS, Farcaster/Lens, Gitcoin Passport |
| 13 | Grok x_search | Research | xAI API | Real-time X/Twitter sentiment |
| 14 | Serper | Research | REST | Web search verification |
| 15 | OpenClaw Sub-agents | Supporting | ACP (free) | Delegated intelligence via sub-agents |
| 16 | DFlow MCP | Filter | mcporter (free) | DEX swap routes, liquidity depth, slippage |

---

## On-Chain Identity (ERC-8004)

| Chain | Agent ID | Registry | Skills |
|-------|----------|----------|--------|
| Ethereum | #25045 | `0x8004A818BFB912233c491871b3d84c89A494BD9e` | — |
| Base | #17483 | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` | — |
| Base (anet) | #18709 | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` | 4 skills |
| Colosseum | #3734 | Agent Hackathon entry | — |

**Reputation Registries:**
- Ethereum: `0x8004B663056A597Dffe9eCcC1965A193B7388713`
- Base: `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`

---

## Wallets

| Name | Chain | Address |
|------|-------|---------|
| anet | Base (EVM) | `0x2Dc03124091104E7798C0273D96FC5ED65F05aA9` |
| Buzz Base | Base (EVM) | `0x4b362B7db6904A72180A37307191fdDc4eD282Ab` |
| ClawRouter | Base (EVM) | `0x9b28931785c5687811850AD08e158F8479743A76` |
| BlockRun x402 | Base (EVM) | `0x6ea362d34238089Ec3226A256F25CbD14f35493b` |
| Lobster | Solana | `5iC7pGyzqpXD2xTK4Ww7zKRDVo9cceyHNeKBTiemo5Jp` |

---

## Deployment Stack

| Component | Technology |
|-----------|-----------|
| Compute | Akash Network — 2 CPU, 4GB RAM, 10GB persistent storage (~$5/mo) |
| Container | Docker on `ghcr.io/buzzbysolcex/buzz-bd-agent:v6.0.1a` |
| Base Image | node:22-slim + tini PID 1 |
| Runtime | **OpenClaw v2026.2.24** |
| Primary LLM | MiniMax M2.5 (229B params, anthropic-messages API) |
| Smart Fallback | ClawRouter + BlockRun x402 (30+ models via micropayments) |
| Free Fallbacks | Free models via BlockRun (wallet unfunded) |
| Emergency | Claude Haiku 4.5 → Claude Opus 4.5 (last resort) |
| LLM Cost | ~$41/mo (down from $1,320/day — 99.9% reduction) |
| Compute Cost | ~$5/mo |
| Total Cost | ~$46/mo for 24/7 autonomous BD agent |
| Bot | @BuzzBySolCex_bot (Telegram, 47 registered commands) |
| Crons | 36 autonomous scheduled jobs |
| Skills | ClawRouter (smart LLM routing) + QuillShield (contract safety) |
| Tests | 602 passing (TDD via Claude Code) |

---

## LLM Stack

| Priority | Model | Provider | Cost |
|----------|-------|----------|------|
| **Primary** | MiniMax M2.5 (229B) | Direct API (`api.minimax.io/anthropic`) | ~$41/mo |
| **Fallback** | 30+ models via BlockRun | [ClawRouter](https://github.com/1bcmax/clawrouter) x402 | Micropayments |
| **Free** | Free models | BlockRun | $0 |
| **Emergency** | Claude Haiku / Opus | Anthropic | Last resort |

**ClawRouter** by [@1bcmax](https://github.com/1bcmax) provides smart LLM routing via x402 micropayments with 30+ model access. Integrated as Docker-baked plugin with BlockRun proxy on port 8402.

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
- CEX listing check: CoinGecko + CMC
- CTO detection: Community Takeover flag
- Volatility check: >+100% or <-30% → wait 48h

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

## Integrations & Partnerships

### Tier 1 — Active Integrations

| Partner | Integration |
|---------|-------------|
| [ClawRouter / @1bcmax](https://github.com/1bcmax/clawrouter) | Smart LLM routing + BlockRun x402 (30+ models, baked in Docker) |
| [Bankr](https://bankr.bot) | Token launch partner API — 50% fee split |
| [ATV Web3 Identity](https://atv.dev) / Gary Palmer | ENS + deployer identity verification — confirmed partnership |
| zauthx402 | x402 trust verification |
| Einstein AI | x402 whale alerts |
| Gloria AI | x402 breaking news |
| [Helius](https://helius.dev) | Solana wallet forensics |
| [Allium](https://allium.so) | 16-chain PnL/balances |
| [MiniMax](https://minimax.io) | Primary LLM provider |
| [ATV Web3 Identity](https://atv.dev) / Gary Palmer | ENS + deployer identity verification — confirmed partnership |
| Rich Pedersen (AgenticTrust.io) | Agent trust ontology |
| AgentProof | Agent verification |

### Tier 2 — Active Relationships

| Partner | Status |
|---------|--------|
| [DFlow](https://dflow.net) | MCP integrated — Source #16, DEX route verification |
| ClawdBotATG | Austin Griffith ecosystem — Agent Bounty Board |
| OpenClaw | ClawHub marketplace — Buzz-as-a-Service |
| Virtuals Protocol | ACP registered — 18K+ agent network |
| elizaOS | PR #263 + npm published — Plugin registry |
| lobster.cash | Agent commerce |

---

## Agent Bounty Board

Buzz posted **Bounty #0** — the first-ever bounty on ClawdBotATG's Agent Bounty Board contract.

| Field | Value |
|-------|-------|
| Contract | `0x3797710f9ff1FA1Cf0Bf014581e4651845d75530` (Base) |
| TX | `0xc8c8f2456014458ce1af971c6919a1f5693c0adb1723b9088f274381af60d2fc` |
| Bounties | 3 live (Solana Research, Base Discovery, Agent Ecosystem Map) |
| Escrowed | 23K $CLAWD |
| CLI | `buzz-bounty-board` |

---

## ElizaOS Plugin

```bash
npm install @buzzbd/plugin-solcex-bd
```

| Field | Value |
|-------|-------|
| Package | `@buzzbd/plugin-solcex-bd@1.0.0` |
| Actions | SCAN_TOKENS, SCORE_TOKEN, CHECK_WALLET, SUBMIT_LISTING |
| Hooks | 3 (market intel, pipeline status, listing readiness) |
| Channels | Telegram ✅, Web UI ✅, ACP ✅ |
| Registry PR | #263 (elizaos-plugins/registry) |

---

## Telegram Commands (47)

| Category | Commands |
|----------|----------|
| **System (9)** | help, status, health, version, config, memory, crons, experience, reset |
| **Scanning (8)** | scan, score, search, verify, trending, boosts, aixbt, rugcheck, socials |
| **Pipeline (7)** | pipeline, report, weekly, digest, alpha, listings, competitors |
| **Wallet/Intel (6)** | wallet, forensics, whales, dflow, bankr, budget |
| **Outreach (7)** | outreach, approve, reject, warmup, followup, breakup, dealsheet, postlisting |
| **Personal (2)** | prayer, sprint |
| **Emergency (6)** | sos, stop, stop_email, stop_forum, stop_scan, resume |

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
cd ~/buzz-bd-agent

# Build (ALWAYS --no-cache for config/version changes)
docker build --no-cache -t ghcr.io/buzzbysolcex/buzz-bd-agent:vNEW .

# Push to GitHub Container Registry
docker push ghcr.io/buzzbysolcex/buzz-bd-agent:vNEW

# Deploy: Update SDL image tag → Akash Console → Create New Deployment
# For ENV var changes: Close deployment → Fresh deploy with new SDL
# ⚠️ ALWAYS use unique image tags — Akash providers cache by tag name
```

---

## Cost History

| Period | LLM | Daily Cost | Notes |
|--------|-----|-----------|-------|
| Feb 3-14 | Claude Opus 4.5 | ~$1,320/day | Prayer reminders costing $5 each |
| Feb 14-15 | Haiku + Opus fallback | ~$5-10/day | First optimization |
| Feb 15+ | MiniMax M2.5 | ~$1.37/day | 99.9% cost reduction |
| **Current** | MiniMax + ClawRouter/BlockRun | ~$46/mo | Full autonomous BD agent |

---

## Version History

| Version | Date | Highlights |
|---------|------|------------|
| **v6.0.1a** | **Feb 25, 2026** | **OpenClaw 2026.2.24, ClawRouter/BlockRun x402, Bankr Partner API, 47 commands, 602 tests** |
| v6.0-alpha | Feb 24, 2026 | 602 tests, 7 sub-agents, dmPolicy debugging |
| v5.3.8-hotfix6 | Feb 22, 2026 | MiniMax anthropic-messages fix, tool calling restored |
| v5.3.5 | Feb 21, 2026 | ClawRouter removed (temp), clean deploy |
| v5.3.1 | Feb 20, 2026 | DFlow MCP, 4-Layer Architecture |

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
| npm Plugin | [@buzzbd/plugin-solcex-bd](https://www.npmjs.com/package/@buzzbd/plugin-solcex-bd) |
| Bounty Board CLI | `buzz-bounty-board` |
| Plugin Repo | [plugin-solcex-bd](https://github.com/buzzbysolcex/plugin-solcex-bd) |
| x402 Protocol | [x402](https://x.com/x402) |
| ClawRouter | [@1bcmax](https://github.com/1bcmax/clawrouter) |
| Bankr | [bankr.bot](https://bankr.bot) |

---

## Team

| Role | Handle | Responsibility |
|------|--------|----------------|
| BD Lead | [@hidayahanka1](https://x.com/hidayahanka1) | Strategy, approvals, manual Twitter, partnerships |
| Strategy | Claude Opus 4.6 | Documentation, analysis, planning, outreach drafts |
| Autonomous Agent | Buzz 🐝 | Token scanning, scoring, pipeline management, reporting |

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

*Powered by [OpenClaw](https://github.com/openclaw/openclaw) • Deployed on [Akash Network](https://akash.network) • ERC-8004 Verified*
*"Identity first. Intelligence deep. Commerce autonomous. Cost disciplined. Ship from anywhere."*

#USDC #AgenticCommerce #Solana #AI #SolCex #BuzzBD #Base #ERC8004 #MachineEconomy #OpenClaw
