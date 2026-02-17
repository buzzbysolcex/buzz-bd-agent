# 🐝 Buzz BD Agent v4.4.0

> Autonomous AI Business Development Agent for Crypto Token Listings
>
> **15 Intelligence Sources · 26 Cron Jobs · Multi-Chain · ERC-8004 Registered · elizaOS Native**

[![Platform](https://img.shields.io/badge/Platform-SolCex%20Exchange-blue)](https://solcex.io)
[![Infrastructure](https://img.shields.io/badge/Infra-Akash%20Network-red)](https://akash.network)
[![ERC-8004](https://img.shields.io/badge/ERC--8004-Ethereum%20%2325045-purple)](https://eips.ethereum.org/EIPS/eip-8004)
[![ERC-8004](https://img.shields.io/badge/ERC--8004-Base%20%2317483-blue)](https://eips.ethereum.org/EIPS/eip-8004)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)
[![Hackathon](https://img.shields.io/badge/Colosseum-Agent%20ID%203734-orange)](https://colosseum.org)

---

## What Buzz Does

Buzz is an autonomous BD agent that runs 24/7 on decentralized infrastructure, scanning tokens across multiple blockchains and managing a complete listing pipeline for SolCex Exchange. It discovers high-potential tokens, scores them against 15 intelligence sources, verifies team credentials, and prepares outreach — all without human intervention.

**Key differentiator:** Buzz doesn't just aggregate data. It cross-references paid and free intelligence, tracks ROI on every data call, learns from outcomes, and operates with verifiable on-chain identity via ERC-8004.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        BUZZ BD AGENT v4.4.0                                  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌──────────────┐  │
│  │ 15 Intel      │  │   Scoring     │  │   Wallet      │  │  Outreach    │  │
│  │ Sources       │  │   Engine      │  │  Forensics    │  │  System      │  │
│  │ (Free+Paid)   │  │  (100-point)  │  │  (Helius)     │  │  (Auto-DM)   │  │
│  └──────┬────────┘  └──────┬────────┘  └──────┬────────┘  └──────┬───────┘  │
│         │                  │                   │                  │           │
│  ┌──────┴──────────────────┴───────────────────┴──────────────────┴────────┐  │
│  │              LLM Cascade (AkashML + MiniMax M2.5-highspeed)            │  │
│  │         MiniMax M2.5 → Free APIs → Claude Sonnet → Claude Opus        │  │
│  └──────┬──────────────────┬───────────────────┬──────────────────┬───────┘  │
│         │                  │                   │                  │           │
│  ┌──────┴──────┐  ┌───────┴───────┐  ┌────────┴───────┐  ┌──────┴───────┐  │
│  │   Memory    │  │  26 Cron      │  │   ERC-8004     │  │  Channels    │  │
│  │   System    │  │  Jobs         │  │  Dual-Chain    │  │  (TG/Email/  │  │
│  │ (4 tracks)  │  │  (24/7)       │  │  Identity      │  │   elizaOS)   │  │
│  └─────────────┘  └───────────────┘  └────────────────┘  └──────────────┘  │
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│  INFRASTRUCTURE: Akash Network (Decentralized Cloud) · ~$41/month            │
│  LLM: MiniMax M2.5-highspeed via AkashML (optimized cascade)                │
│  IDENTITY: ERC-8004 — Ethereum #25045, Base #17483                           │
│  INTEROP: elizaOS + OpenClaw plugin (agent-to-agent native)                  │
│  PROTOCOL: x402 (autonomous micropayments on Base)                           │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## ERC-8004 Integration

Buzz is registered under ERC-8004 on both Ethereum and Base, establishing verifiable on-chain identity for autonomous agent commerce.

### Why ERC-8004 Matters for Buzz

Traditional BD agents have no way to prove identity in agent-to-agent interactions. When Buzz contacts a token project or interacts with another agent, there's no verifiable proof of who Buzz is, what exchange it represents, or its operational track record. ERC-8004 solves this by giving Buzz a machine-readable, on-chain identity that other agents and protocols can verify programmatically.

### Registration Details

| Field | Ethereum | Base |
|-------|----------|------|
| **Registry ID** | #25045 | #17483 |
| **Agent Name** | Buzz BD Agent | Buzz BD Agent |
| **Operator** | SolCex Exchange | SolCex Exchange |
| **Capabilities** | Token scanning, BD pipeline, x402 payments | Token scanning, BD pipeline, x402 payments |
| **Status** | Active | Active |

### registration.json

```json
{
  "erc8004": {
    "version": "1.0",
    "agent": {
      "name": "Buzz BD Agent",
      "version": "4.4.0",
      "description": "Autonomous AI business development agent for crypto token listing pipeline management",
      "operator": {
        "name": "SolCex Exchange",
        "website": "https://solcex.io",
        "contact": "buzzbysolcex@gmail.com"
      }
    },
    "registrations": [
      {
        "chain": "ethereum",
        "registry_id": 25045,
        "tx": "",
        "status": "active"
      },
      {
        "chain": "base",
        "registry_id": 17483,
        "tx": "",
        "status": "active"
      }
    ],
    "capabilities": {
      "intelligence": {
        "sources": 15,
        "chains_monitored": ["solana", "ethereum", "bsc", "base", "arbitrum", "polygon"],
        "scoring_system": "100-point weighted composite"
      },
      "commerce": {
        "protocol": "x402",
        "currency": "USDC",
        "network": "solana",
        "facilitator": "PayAI"
      },
      "interoperability": {
        "elizaos_plugin": "@solcex/plugin-buzz-bd",
        "openclaw_adapter": true,
        "actions": [
          "BUZZ_TOKEN_INTELLIGENCE",
          "BUZZ_LISTING_PROSPECTS",
          "BUZZ_AGENT_STATUS",
          "BUZZ_MOMENTUM_SCAN"
        ]
      },
      "trust_verification": {
        "protocol": "zauthx402",
        "levels": ["VERIFIED", "TRUSTED", "CAUTIOUS", "UNTRUSTED", "BLACKLISTED"]
      }
    },
    "metadata": {
      "infrastructure": "Akash Network",
      "llm_primary": "MiniMax M2.5-highspeed (via AkashML)",
      "uptime": "24/7 autonomous",
      "cron_jobs": 26,
      "monthly_cost_usd": 41,
      "github": "https://github.com/buzzbysolcex/buzz-bd-agent"
    }
  }
}
```

### Three Registries, One Agent

Buzz leverages all three ERC-8004 discovery layers:

| Registry | Purpose | Buzz Usage |
|----------|---------|------------|
| **On-Chain Registry** | Permanent identity anchor | ETH #25045, Base #17483 — proves Buzz exists and who operates it |
| **ENS/DNS Discovery** | Human-readable lookup | `buzz.solcex.eth` → resolves to agent metadata |
| **Well-Known URI** | Service endpoint discovery | `solcex.io/.well-known/agent.json` → capabilities, API endpoints |

This triple-layer approach means another agent can: (1) verify Buzz's identity on-chain, (2) discover Buzz via ENS, and (3) understand Buzz's capabilities and how to interact with it — all without human coordination.

---

## Machine Economy Positioning

Buzz operates at the intersection of three emerging standards that together define autonomous agent commerce:

```
                    ┌─────────────────────┐
                    │    ERC-8004         │
                    │    (Identity)       │
                    │  "Who is this agent?"│
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
    ┌─────────▼──────┐  ┌─────▼──────────┐  ┌──▼──────────────┐
    │    x402         │  │  elizaOS/      │  │  zauthx402      │
    │  (Payments)     │  │  OpenClaw      │  │  (Trust)        │
    │ "Pay per query" │  │ (Interop)      │  │ "Can I trust    │
    │                 │  │ "Talk to other │  │  this agent?"   │
    │                 │  │  agents"       │  │                 │
    └─────────────────┘  └───────────────┘  └─────────────────┘
```

**Identity (ERC-8004):** Other agents verify Buzz's legitimacy before engaging. No more anonymous bots — Buzz has a verifiable track record anchored on Ethereum and Base.

**Payments (x402):** Buzz pays for premium intelligence (whale alerts, breaking news) via autonomous micropayments. Budget-controlled, ROI-tracked, with experience learning that optimizes spend over time.

**Interoperability (elizaOS + OpenClaw):** Any agent in the elizaOS ecosystem can natively call Buzz's tools — token intelligence, momentum scans, pipeline queries. No custom integration needed.

**Trust (zauthx402):** Before Buzz pays for data, it verifies endpoint authenticity. Trust scores from 0-100 determine whether to auto-pay, require approval, or blacklist.

### Real-World Flow

```
1. Trading agent discovers Buzz via ERC-8004 registry
2. Verifies Buzz identity on-chain (ETH #25045)
3. Calls BUZZ_TOKEN_INTELLIGENCE("JUP") via elizaOS plugin
4. Buzz checks 15 sources, returns score + recommendation
5. Trading agent pays Buzz 0.01 USDC via x402 for the query
6. Both agents log interaction for reputation building
```

This isn't theoretical — the infrastructure is deployed and running on Akash.

---

## Intelligence Sources (15 Active)

### Free Sources (13)

| # | Source | Data | Status |
|---|--------|------|--------|
| 1 | DexScreener API | Prices, liquidity, pairs across 60+ chains | ✅ Active |
| 2 | AIXBT v2 Momentum | Trending tokens, momentum scores, surge detection | ✅ Active |
| 3 | leak.me KOL Tracker | Smart money follows, VC/influencer tracking | ✅ Active |
| 4 | Helius Wallet Forensics | On-chain activity, wallet history, token holds | ✅ Active |
| 5 | ATV Web3 Identity | ENS deployer verification, identity resolution | ✅ Active |
| 6 | Grok X Search | Real-time social sentiment from Twitter/X | ✅ Active |
| 7 | Clawpump | New agent token launches on Solana | ✅ Active |
| 8 | Moltbook Forums | Community signals, agent ecosystem intel | ✅ Active |
| 9 | CoinGecko | Market data, rankings, categories | ✅ Active |
| 10 | Clawbal On-Chain PnL | Wallet P&L tracking, performance metrics | ✅ Active |
| 11 | HyperAgent Verifier | Cross-reference scoring, batch validation | ✅ Active |
| 12 | HyperSkill Factory | Autonomous skill generation from intelligence | ✅ Active |
| 13 | elizaOS Agent Network | Agent-to-agent intelligence via OpenClaw | ✅ Active |

### Paid Sources (2 — x402 Protocol)

| # | Source | Cost/Call | Data | Schedule |
|---|--------|----------|------|----------|
| 14 | Einstein AI | $0.10 | Whale alerts, large wallet movements | 06:00 AST |
| 15 | Gloria AI | $0.10 | Breaking crypto news, sentiment shifts | 12:00 + 18:00 AST |

---

## Scoring System

100-point weighted composite with catalyst adjustments:

| Factor | Weight | What It Measures |
|--------|--------|-----------------|
| Liquidity | 25% | DEX liquidity depth (DexScreener) |
| Market Cap | 20% | Fully diluted valuation |
| Volume 24h | 20% | Trading activity |
| Social Metrics | 15% | Twitter, Discord, Telegram presence |
| Token Age | 10% | Maturity and track record |
| Team Transparency | 10% | Doxxed team, public commits, identity |

### Cross-Reference Bonuses

| Condition | Adjustment | Flag |
|-----------|-----------|------|
| AIXBT ≥80 + DexScreener trending | +5 | `[HIGH CONVICTION]` |
| AIXBT ≥50 + KOL follows | +3 | `[VALIDATED]` |
| Grok social + AIXBT momentum rising | +3 | `[TIMING OPTIMAL]` |
| ATV verified identity + AIXBT ≥60 | +5 | `[HIGH TRUST + MOMENTUM]` |
| Whale alert + breaking news | +5 | `[WHALE + CATALYST]` |

### Score Actions

| Range | Action |
|-------|--------|
| 85-100 🔥 | Immediate outreach |
| 70-84 ✅ | Priority queue |
| 50-69 👀 | Monitor 48h |
| 0-49 ❌ | No action |

---

## elizaOS Plugin

Buzz exposes its intelligence as an elizaOS-native plugin, enabling any agent in the elizaOS/OpenClaw ecosystem to call Buzz's tools directly.

### Installation

```bash
npm install @solcex/plugin-buzz-bd
```

### OpenClaw Configuration

```json
{
  "plugins": {
    "eliza-adapter": {
      "plugins": ["@solcex/plugin-buzz-bd"],
      "settings": {
        "BUZZ_WORKSPACE": "/data/workspace"
      },
      "agentName": "Buzz"
    }
  }
}
```

### Available Actions

| Action | Description | Parameters |
|--------|-------------|------------|
| `BUZZ_TOKEN_INTELLIGENCE` | Full token analysis with AIXBT cross-reference | `token`, `chain` |
| `BUZZ_LISTING_PROSPECTS` | Current hot prospects from BD pipeline | `min_score`, `limit` |
| `BUZZ_AGENT_STATUS` | Operational status and health check | — |
| `BUZZ_MOMENTUM_SCAN` | Latest AIXBT momentum data | `min_score` |

### Agent-to-Agent Example

```
TradingBot: "What does Buzz think about JUP?"
  → calls BUZZ_TOKEN_INTELLIGENCE({token: "JUP", chain: "solana"})

Buzz returns:
  Token: JUP (solana)
  AIXBT: 72/100 [WARM]
  Pipeline: YES - Active prospect
  Recommendation: MODERATE - Worth monitoring
  Sources: 15 intelligence feeds
```

---

## Operational Status

| Metric | Value |
|--------|-------|
| **Version** | 4.4.0 |
| **Infrastructure** | Akash Network (decentralized cloud) |
| **Uptime** | 24/7 autonomous |
| **Cron Jobs** | 26 active |
| **Intelligence Sources** | 15 (13 free + 2 paid) |
| **LLM** | MiniMax M2.5-highspeed via AkashML |
| **Monthly Cost** | ~$41 |
| **Chains Monitored** | Solana, Ethereum, BSC, Base, Arbitrum, Polygon |
| **ERC-8004** | ETH #25045, Base #17483 |
| **Hackathons** | Colosseum Agent Hackathon (ID 3734) |

### Daily Schedule (AST / Jeddah)

| Time | Task | Source |
|------|------|--------|
| 05:00 | Full deep scan + AIXBT momentum | DexScreener + AIXBT v2 |
| 06:00 | Whale alert scan | Einstein AI (x402) |
| 07:00 | Alpha tweet draft | Internal |
| 12:00 | AIXBT refresh + breaking news | AIXBT v2 + Gloria AI |
| 14:00 | Pipeline review | Internal scoring |
| 18:00 | Breaking news + AIXBT refresh | Gloria AI + AIXBT v2 |
| 21:00 | Evening scan | DexScreener + AIXBT v2 |
| 22:00 | Experience compression | Memory management |
| 23:00 | Daily spend + ROI report | Internal |

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Node.js 18+ on Akash Network |
| LLM | MiniMax M2.5-highspeed (primary) via AkashML |
| Payments | x402 protocol (USDC on Solana via PayAI) |
| Identity | ERC-8004 (Ethereum + Base) |
| Trust | zauthx402 verification protocol |
| Data | DexScreener, AIXBT, leak.me, Helius, ATV, Grok |
| Interop | elizaOS plugin + OpenClaw adapter |
| Communication | Telegram Bot, Email |
| Memory | JSON-based with compression and experience tracking |
| Monitoring | HEARTBEAT.md + health crons |

---

## Partnerships

| Partner | Integration | Status |
|---------|------------|--------|
| **Ethereum Foundation (dAI)** | ERC-8004 ecosystem, Vitto Rivabella collaboration | Active |
| **ATV / GaryPalmerJr.eth** | Web3 Identity API — ENS deployer verification | Active |
| **AIXBT** | x402 momentum API + web scrape fallback | Active |
| **Helius** | Solana wallet forensics and on-chain analysis | Active |
| **MiniMax** | M2.5-highspeed LLM via AkashML | Active |
| **Akash Network** | Decentralized compute infrastructure | Active |
| **PayAI** | Gasless x402 payment facilitation | Active |

---

## Repository Structure

```
buzz-bd-agent/
├── README.md                          ← This file
├── registration.json                  ← ERC-8004 registration data
├── package.json
├── LICENSE
│
├── modules/
│   ├── aixbt/                         ← AIXBT v2 momentum intelligence
│   │   ├── aixbt.js
│   │   └── SKILL.md
│   ├── dexscreener/                   ← DEX data intelligence
│   ├── leak-me/                       ← KOL tracking
│   ├── helius/                        ← Wallet forensics
│   ├── atv-identity/                  ← Web3 identity verification
│   ├── hyperskill/                    ← Autonomous skill factory
│   └── hyperagent/                    ← Cross-reference verification
│
├── eliza-plugin-buzz/                 ← elizaOS plugin
│   ├── index.js
│   ├── package.json
│   └── openclaw.plugin.json
│
├── memory/                            ← Operational memory
│   ├── pipeline.md
│   ├── cron-schedule.json
│   ├── aixbt/
│   ├── prospects/
│   └── x402/
│
└── docs/
    ├── HEARTBEAT.md                   ← Module health monitoring
    ├── SCORING.md                     ← 100-point scoring methodology
    └── X402.md                        ← Payment protocol integration
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Akash Network account (or any Docker-compatible host)
- Solana wallet with USDC (for x402 payments)
- API keys: Helius, DexScreener (free)

### Deploy on Akash

```bash
# Clone
git clone https://github.com/buzzbysolcex/buzz-bd-agent.git
cd buzz-bd-agent

# Configure
cp .env.example .env
# Edit .env with your API keys and wallet

# Deploy
akash tx deployment create deploy.yml --from wallet
```

### Create registration.json

```bash
cat > registration.json << 'EOF'
{
  "erc8004": {
    "version": "1.0",
    "agent": {
      "name": "Buzz BD Agent",
      "version": "4.4.0",
      "operator": "SolCex Exchange"
    },
    "registrations": [
      {"chain": "ethereum", "registry_id": 25045},
      {"chain": "base", "registry_id": 17483}
    ]
  }
}
EOF
```

### Test

```bash
# Test AIXBT module
cd modules/aixbt && node aixbt.js test

# Test elizaOS plugin
cd eliza-plugin-buzz && node -e "var p=require('./index.js'); console.log(p.name, p.actions.length+' actions')"
```

---

## Changelog

| Version | Date | Highlights |
|---------|------|-----------|
| **4.4.0** | Feb 17, 2026 | elizaOS plugin (4 actions), AIXBT v2 (x402 API + scrape), HyperSkill Factory, HyperAgent Verifier, 15 sources, 26 cron jobs |
| **4.3.0** | Feb 15, 2026 | ATV Web3 Identity API (Source #13), partnership blitz, ClawRouter removal, MiniMax direct via AkashML |
| **4.0.0** | Feb 14, 2026 | ERC-8004 dual-chain registration (ETH #25045, Base #17483), LLM cascade optimization |
| **3.7.0** | Feb 11, 2026 | Helius wallet forensics, Stripe x402 industry validation, 12 intelligence sources |
| **3.4.0** | Feb 7, 2026 | x402 autonomous payments, zauthx402 trust verification, dual experience learning |
| **3.0.0** | Feb 3, 2026 | OpenClaw skill submission, ERC-8004 planning, Bankr partnership strategy |

---

## Contact

| Channel | Handle |
|---------|--------|
| Twitter | [@BuzzBySolCex](https://twitter.com/BuzzBySolCex) |
| Telegram | [@BuzzBySolCex_bot](https://t.me/BuzzBySolCex_bot) |
| Email | buzzbysolcex@gmail.com |
| Operator | [@hidayahanka1](https://twitter.com/hidayahanka1) (Ogie) |
| Exchange | [SolCex Exchange](https://solcex.io) |

---

## License

MIT — See [LICENSE](LICENSE) for details.

---

*Built by Ogie + Claude Opus 4.6 · Running 24/7 on Akash Network · Powered by the machine economy*
