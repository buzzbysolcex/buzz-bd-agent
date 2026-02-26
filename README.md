# 🐝 Buzz BD Agent — Autonomous Token Discovery & Listing for SolCex Exchange

The first AI Business Development agent operating autonomously 24/7 for a centralized exchange, powered by MiniMax M2.5 on decentralized compute.

![ERC-8004](https://img.shields.io/badge/ERC--8004-Verified-blue) ![Akash](https://img.shields.io/badge/Akash-Deployed-green) ![OpenClaw](https://img.shields.io/badge/OpenClaw-2026.2.24-purple) ![Docker](https://img.shields.io/badge/Docker-ghcr.io-blue) ![npm](https://img.shields.io/badge/npm-published-red) ![Tests](https://img.shields.io/badge/Tests-602%20passing-brightgreen)

## What Buzz Does

Buzz scans 30+ tokens per session across multiple DEX data sources, runs them through a 4-layer intelligence pipeline, scores them on a 100-point system, and delivers qualified listing prospects to human BD leads via Telegram — all autonomously, 4x daily.

**NEW in v6.0.4:** ATV Web3 Identity API fixed and operational with 3x daily batch verification. Bankr skill installed for token deployment on Base chain. 48 Telegram commands registered. Full pipeline tested with live tokens.

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
│  │              BUZZ BD AGENT v6.0.4                          │  │
│  │                                                             │  │
│  │  LLM: MiniMax M2.5 + ClawRouter/BlockRun x402 fallback    │  │
│  │  Skills: ClawRouter (LLM routing) + QuillShield (safety)   │  │
│  │  Intel: 15/16 Sources | Crons: 36/36 | 48 TG Commands     │  │
│  │  Score: 100-pt System | Forensics: Helius + DexScreener    │  │
│  │  Identity: ATV Web3 (api.web3identity.com) — 3x daily      │  │
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

## v6.0.4 — What's New (Sprint Day 2, Feb 26 2026)

### 🔧 ATV Web3 Identity — FIXED & Operational

Previous endpoints (api.atv.ai, api.atv.app, etc.) were all dead. Discovered correct endpoint and integrated:

- **Base URL:** `https://api.web3identity.com`
- **Endpoint:** `GET /api/ens/batch-resolve`
- **Free tier:** 100 addresses/day, x402 auto-pay for overflow
- **Batch mode:** Up to 100 addresses per request
- **3x daily verification passes:** 09:00, 15:00, 22:00 WIB

Verified working: vitalik.eth returns full identity (ENS + Twitter + GitHub).

**Chain limitation:** ATV resolves ETH addresses only. Solana deployers use Helius forensics and are tagged UNVERIFIED-IDENTITY (not auto-COMMUNITY).

### 🏦 Bankr Skill — Installed & Authenticated

Full bankr skill installed from `github.com/BankrBot/openclaw-skills`:
- Wallet: `0xfa04c7d627ba707a1ad17e72e094b45150665593`
- Referral: VFJ23TVS-BNKR
- Rate limit: 100 messages/day
- Token deployment on Base via `/launch` command

### 📡 48 Telegram Commands (up from 47)

New commands added:
- **Bankr Deploy (3):** `/launch`, `/deploys`, `/deploy_stats`
- **Twitter/X (3):** `/tweet`, `/thread`, `/engage`

### 📊 Pipeline Discipline Rules (Learned from Live Testing)

1. LP verification fails = 2 attempts max → flag HIGH RISK, 48h WATCH
2. PumpFun migrations go to Meteora DLMM pools (not just Raydium/PumpSwap)
3. GeckoTerminal returns better pair data than DexScreener for pre-DEX tokens
4. Opportunity cost: don't chase one token endlessly, next scan has fresh prospects

### 🔍 First Pipeline Test Results

- **$NIRE** — Score 78 ✅ QUALIFIED, WATCH 48h (LP unverified, Meteora DLMM)
- **$BABYCLAW** — Score 51-56 👀 WATCH (ATV confirmed no identity → COMMUNITY)

---

## 🚀 Bankr Partner API — Token Deployment from Telegram

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

First deploy: BuzzTestCoin (BZTC) — [View on BaseScan](https://basescan.org)

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
║  LAYER 4 — SCORE & ACT (100-Point System)                        ║
║  85-100 🔥 HOT    → Immediate outreach + full forensics          ║
║  70-84  ✅ QUAL   → Priority queue + forensics                   ║
║  50-69  👀 WATCH  → Monitor 48h, rescan                          ║
║  0-49   ❌ SKIP   → No action                                    ║
║  Route: Path A (SolCex listing) or Path B (Bankr deploy)         ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## Intelligence Sources (15/16 Active)

| # | Source | Layer | Status | Data |
|---|--------|-------|--------|------|
| 1 | **DexScreener API** | Discovery | ✅ Working | Token profiles, pairs, boosts, trending |
| 2 | **GeckoTerminal** | Discovery | ✅ Working | Market data, volume, liquidity |
| 3 | **AIXBT** | Discovery | ✅ Working | Momentum scoring, catalysts |
| 4 | **DexScreener Boosts** | Discovery | ✅ Working | Promoted tokens |
| 5 | **RugCheck** | Filter | ✅ Working | Contract safety, honeypot detection |
| 6 | **Helius** | Filter | ✅ Working | Solana wallet forensics, deployer history, LP tracing |
| 7 | **Allium** | Filter | ❌ 404 | 16-chain wallet PnL (endpoint changed) |
| 8 | **DFlow MCP** | Filter | ✅ Working | DEX swap routes, liquidity depth |
| 9 | **Firecrawl** | Research | ✅ Working | Website scraping for team/roadmap |
| 10 | **ATV Web3 Identity** | Research | ✅ FIXED | ENS, Twitter, GitHub, Discord (ETH addresses only) |
| 11 | **Grok x_search** | Research | ✅ Working | Real-time X/Twitter sentiment |
| 12 | **Serper** | Research | ✅ Working | Web search verification |
| 13 | **X API v2** | Amplification | ✅ NEW | Tweet/thread drafting |
| 14 | **Bankr Partner API** | Deploy | ✅ NEW | Token deployment on Base |
| 15 | **Moltbook** | Supporting | ✅ Working | Agent social network |
| 16 | **OpenClaw Sub-agents** | Supporting | ✅ Working | Delegated intelligence |

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
| ClawRouter | Base (EVM) | 0x56f76494a60eBb52325630e69F7d8C0635E5C980 |
| Buzz Base | Base (EVM) | 0x4b362B7db6904A72180A37307191fdDc4eD282Ab |
| BlockRun x402 | Base (EVM) | 0x6ea362d34238089Ec3226A256F25CbD14f35493b |
| Lobster | Solana | 5iC7pGyzqpXD2xTK4Ww7zKRDVo9cceyHNeKBTiemo5Jp |

---

## Deployment Stack

| Component | Technology |
|-----------|------------|
| Compute | Akash Network — 2 CPU, 4GB RAM, 10GB persistent storage (~$5/mo) |
| Container | Docker on ghcr.io/buzzbysolcex/buzz-bd-agent:v6.0.4 |
| Base Image | node:22-slim + tini PID 1 |
| Runtime | OpenClaw v2026.2.24 |
| Primary LLM | MiniMax M2.5 (229B params) |
| Smart Fallback | ClawRouter + BlockRun x402 (30+ models via micropayments) |
| Token Deploy | Bankr Partner API (Base chain, zero gas cost) |
| Identity Verify | ATV Web3 Identity (api.web3identity.com, 3x daily batch) |
| LLM Cost | ~$41/mo (down from $1,320/day — 99.9% reduction) |
| Compute Cost | ~$5/mo |
| Total Cost | ~$46/mo for 24/7 autonomous BD + token deployment agent |
| Bot | @BuzzBySolCex_bot (Telegram, 48 registered commands) |
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
│   ├── memory/                 ← Cron schedules, agent memory, rules
│   │   ├── cron-schedule.json  ← 36 jobs backup
│   │   ├── web3-identity-api.md ← ATV endpoint config
│   │   ├── pipeline-rules.md   ← Pipeline discipline rules
│   │   └── solana-deployer-verification.md
│   ├── skills/                 ← Baked skills (synced from image)
│   └── .env                    ← Env passthrough for cron jobs
└── .openclaw/
    └── openclaw.json           ← Gateway config (generated on boot)
```

---

## Telegram Commands (48)

| Category | Commands |
|----------|----------|
| System (8) | help, status, health, version, config, memory, crons, experience |
| Scanning (8) | scan, score, search, verify, trending, boosts, aixbt, rugcheck, socials |
| Pipeline (7) | pipeline, report, weekly, digest, alpha, listings, competitors |
| Wallet/Intel (5) | wallet, forensics, whales, dflow, budget |
| Outreach (7) | outreach, approve, reject, warmup, followup, breakup, dealsheet, postlisting |
| Bankr Deploy (3) | launch, deploys, deploy_stats |
| Twitter/X (3) | tweet, thread, engage |
| Personal (2) | prayer, sprint |
| Emergency (5) | sos, stop, stop_email, stop_scan, resume |

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
| COMMUNITY TOKEN (confirmed no team) | -10 |
| UNVERIFIED-IDENTITY (Solana/ATV gap) | -10 |
| Freeze authority active | -15 |
| Top 10 holders >50% | -15 |
| CEX already listed | -15 |
| Token age <24h | -10 |
| LP UNVERIFIED (API failure) | -15 |

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
|---------|-------------|
| Bankr / @bankrbot | Token launch partner API — 75.05% creator / 18.05% partner fee split |
| ClawRouter / @1bcmax | Smart LLM routing + BlockRun x402 (30+ models) |
| ATV Web3 Identity / Gary Palmer | ENS + deployer identity verification (api.web3identity.com) |
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
|---------|------|------------|
| **v6.0.4** | **Feb 26, 2026** | **ATV Web3 Identity FIXED (api.web3identity.com). 48 Telegram commands. 3x daily ATV batch verification. Bankr skill installed. First pipeline test ($NIRE 78pts, $BABYCLAW 51pts). Pipeline discipline rules. Deployer identity verification rules. Meteora DLMM detection. WIB timezone + Ramadan crons.** |
| v6.0.2 | Feb 26, 2026 | Bankr Partner API live, DexScreener API fix, persistent storage, cron env passthrough |
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
docker build --no-cache -t ghcr.io/buzzbysolcex/buzz-bd-agent:v6.0.4 .

# Push to GitHub Container Registry
docker push ghcr.io/buzzbysolcex/buzz-bd-agent:v6.0.4

# Deploy: Paste SDL in Akash Console → Create New Deployment
# ⚠️ ALWAYS use unique image tags — Akash providers cache by tag name
# ⚠️ Close + New Deployment for clean persistent volume
```

---

## Links

| Resource | URL |
|----------|-----|
| SolCex Exchange | solcex.io |
| List with Us | solcex.cc/list-with-us |
| Buzz Twitter | @BuzzBySolCex |
| SolCex Twitter | @SolCex_Exchange |
| ERC-8004 Registry | 8004scan.io |
| ATV Web3 Identity | api.web3identity.com |
| First Token Deploy | BuzzTestCoin on BaseScan |
| Colosseum Entry | Agent #3734 |
| npm Plugin | @buzzbd/plugin-solcex-bd |
| Bankr | bankr.bot |
| ClawRouter | @1bcmax |
| x402 Protocol | x402.org |

---

## Team

| Role | Handle | Responsibility |
|------|--------|----------------|
| BD Lead | @hidayahanka1 | Strategy, approvals, manual Twitter, partnerships |
| Strategy | Claude Opus 4.6 | Documentation, analysis, planning, outreach drafts |
| Autonomous Agent | Buzz 🐝 | Token scanning, scoring, pipeline management, deployment |

---

## Principles

1. **Free first, pay for alpha.** — Free intelligence sources before paid
2. **On-chain track record IS credibility.** — Clawbal, ERC-8004, verifiable
3. **Inbound > Warm > Cold. Always.** — Build reputation so projects come to us
4. **The intel is the hook. The relationship is the close.** — Buzz discovers, Ogie closes
5. **Layer the intelligence. Don't spray and pray.** — 4 layers, every token through all
6. **Partnership not dependency.** — Distribution channels, not platform locks
7. **USDC primary.** — Other tokens for utility only
8. **Deploy from Telegram.** — Token launch is now a single command
9. **Agent-to-agent = the multiplier.** — Sub-agents extend reach
10. **Ship from anywhere.** — Docker + Akash + Telegram = deploy from any timezone
11. **Pipeline discipline > chasing one token.** — Flag, WATCH, move on
12. **Talk is cheap, just go build.** — @1bcmax wisdom

---

Powered by [OpenClaw](https://openclaw.ai) • Deployed on [Akash Network](https://akash.network) • ERC-8004 Verified

*"Identity first. Intelligence deep. Commerce autonomous. Cost disciplined. Deploy from Telegram."*

#USDC #AgenticCommerce #Solana #AI #SolCex #BuzzBD #Base #ERC8004 #MachineEconomy #OpenClaw #Bankr
