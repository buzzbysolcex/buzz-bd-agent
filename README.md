# 🐝 Buzz BD Agent

> **First AI Business Development Agent That Pays for Its Own Intelligence**

Autonomous 24/7 BD agent for [SolCex Exchange](https://solcex.cc) — scanning tokens, scoring prospects, and executing outreach without human intervention.

[![OpenClaw](https://img.shields.io/badge/Powered%20by-OpenClaw-blue)](https://openclaw.ai)
[![Akash Network](https://img.shields.io/badge/Deployed%20on-Akash%20Network-red)](https://akash.network)
[![Hackathon](https://img.shields.io/badge/Colosseum-Agent%20Hackathon-purple)](https://colosseum.com/agent-hackathon)
[![USDC Hackathon](https://img.shields.io/badge/OpenClaw-USDC%20Hackathon-green)](https://openclaw.ai)

---

## 🎯 What Is Buzz?

Buzz is an autonomous AI agent that handles business development for SolCex Exchange — a Solana-native CEX focused on listing emerging tokens. Unlike traditional BD processes that require constant human attention, Buzz:

- **Scans** multiple data sources 24/7 for promising tokens
- **Scores** prospects using a 100-point system
- **Qualifies** leads based on liquidity, volume, community, and safety
- **Drafts** personalized outreach emails
- **Tracks** pipeline and engagement metrics
- **Pays** for premium intelligence using x402 protocol

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    BUZZ BD AGENT v3.3.0                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ Intelligence│  │   Scoring   │  │  Outreach   │             │
│  │   Layer     │  │   Engine    │  │   System    │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         │                │                │                     │
│  ┌──────┴────────────────┴────────────────┴──────┐             │
│  │              CORE AGENT (Claude Opus 4.5)     │             │
│  └──────┬────────────────┬────────────────┬──────┘             │
│         │                │                │                     │
│  ┌──────┴──────┐  ┌──────┴──────┐  ┌──────┴──────┐             │
│  │   Memory    │  │    Cron     │  │  Channels   │             │
│  │   System    │  │   Jobs      │  │  (TG/Email) │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  INFRASTRUCTURE: Akash Network (Decentralized Cloud)            │
│  FRAMEWORK: OpenClaw                                            │
│  MODEL: Claude Opus 4.5 (Anthropic)                            │
└─────────────────────────────────────────────────────────────────┘
```

## 📊 Multi-Chain Token Scanning

Buzz scans tokens across multiple chains to find listing opportunities:

| Chain | Tag | Listing Fee | Data Sources |
|-------|-----|-------------|--------------|
| Solana | [SOL] | $5,000 USDC | DexScreener, Clawpump, AIXBT |
| Ethereum | [ETH] | $5,000 USDC | DexScreener, GeckoTerminal |
| BSC | [BSC] | $5,000 USDC | DexScreener, GeckoTerminal |

### Scan Schedule (AST/UTC+3)
- **05:00** — Full deep scan (all sources)
- **12:00** — Midday refresh
- **18:30** — Evening scan + Moltbook report
- **21:00** — Night scan + Clawpump focus

## 🧠 Intelligence Layers

### Layer 1: FREE Sources
| Source | Data Type | Update Frequency |
|--------|-----------|------------------|
| DexScreener API | Price, volume, liquidity, holders | Real-time |
| AIXBT | Smart money movements, momentum | 4 hours |
| Clawpump | Agent token launches | Real-time |
| bankrbot | Market sentiment | Hourly |
| Moltbook | Agent ecosystem signals | 4 hours |

### Layer 2: PAID Sources (x402)
| Source | Data Type | Cost | Value |
|--------|-----------|------|-------|
| Einstein AI | Whale wallet tracking | $0.10/call | Early accumulation signals |
| Gloria AI | Breaking crypto news | $0.10/call | Catalyst detection |

### Layer 3: Cross-Reference Engine
Combines signals from Layer 1 + Layer 2 to generate **HIGH CONVICTION** prospects:
- Whale accumulation + volume spike = 🔥 HOT
- KOL mention + liquidity growth = ✅ QUALIFIED
- News catalyst + price stability = 👀 WATCH

## 💯 BD Scoring System (100 Points)

```python
SCORING_WEIGHTS = {
    "liquidity": 30,      # $500K+ = full points
    "volume_24h": 25,     # $1M+ = full points
    "age": 15,            # 7-30 days optimal
    "community": 15,      # Active socials
    "contract_safety": 15 # Audited, no red flags
}

CATALYST_BONUSES = {
    "hackathon_winner": +10,
    "viral_moment": +10,
    "kol_mention": +10,
    "aixbt_high_conviction": +10,
    "dexscreener_trending": +5
}

PENALTIES = {
    "major_cex_listed": -15,  # Already on Binance/Coinbase
    "liquidity_dropping": -15,
    "team_inactive": -15
}
```

### Score Thresholds
| Score | Status | Action |
|-------|--------|--------|
| 85+ | 🔥 HOT | Immediate outreach |
| 70-84 | ✅ QUALIFIED | Queue for outreach |
| 50-69 | 👀 WATCH | Monitor, no outreach |
| <50 | ❌ PASS | Archive |

## 💰 x402 Payment Integration

Buzz autonomously pays for premium intelligence using the x402 HTTP payment protocol:

```javascript
// x402 Payment Flow
const response = await fetch('https://einstein-ai.com/api/whales', {
  method: 'POST',
  headers: {
    'X-Payment': signedPaymentHeader,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ chain: 'solana', timeframe: '24h' })
});

// Cost: $0.10 USDC per call
// Budget: $10 USDC = 35+ days of premium intel at 3 calls/day
```

### Wallet Details
- **Address**: `79AVHaE2g3GQYoqXCpvim12HeV563mYe7VHDrw28uzxG`
- **Budget**: $0.30/day (3 premium calls)
- **ROI Tracking**: Every dollar spent is logged and measured

## 🔐 zauthx402 Trust Verification

Buzz integrates with zauthx402 for on-chain trust verification:

```
Contract: DNhQZ1CE9qZ2FNrVhsCXwQJ2vZG8ufZkcYakTS5Jpump

Trust Flags:
- [x402-VERIFIED]  → +5 score points, priority outreach
- [x402-CAUTION]   → Manual review required
- [x402-BLOCKED]   → Auto-reject
- [x402-UNKNOWN]   → Standard processing
```

## 📧 Automated Outreach

Buzz drafts personalized emails for qualified prospects:

```
From: buzzbysolcex@gmail.com
To: [project_contact]
Subject: SolCex Exchange Listing Opportunity — [TOKEN_NAME]

Hi [NAME],

I'm Buzz, the BD agent for SolCex Exchange. I've been tracking 
[TOKEN_NAME] and I'm impressed by your [SPECIFIC_METRIC].

[PERSONALIZED_PITCH based on token data]

Listing package includes:
- 3-month market making
- AMA hosting
- Whale airdrop distribution

Would love to discuss. Reply to this email or reach our BD lead 
@HidayahAnka1 on X.

Best,
Buzz 🐝
SolCex Exchange BD Agent
```

**Human Approval**: All outreach requires approval from Ogie before sending.

## 🕌 Cultural Integration

Buzz respects Ogie's schedule and religious practices:

- **Prayer Reminders**: Fajr, Dhuhr, Asr, Maghrib, Isha (AST times)
- **Family Birthdays**: Never misses — reminders 7 days before + day of
- **Flight Schedule**: Autonomous mode during flying days

## 🚀 Deployment (Akash Network)

Buzz runs on Akash Network — decentralized cloud infrastructure:

```yaml
# akash-deploy.yaml
services:
  buzz-agent:
    image: openclaw/agent:latest
    env:
      - AGENT_NAME=buzz-bd-agent
      - MODEL=claude-opus-4.5
      - CHANNEL=telegram
    resources:
      cpu: 2
      memory: 4Gi
      storage: 10Gi
```

### Why Akash?
- ✅ Decentralized — no single point of failure
- ✅ Cost-effective — 85% cheaper than AWS
- ✅ Censorship-resistant — agent runs independently
- ✅ 24/7 uptime — always scanning, always ready

## 📁 Project Structure

```
buzz-bd-agent/
├── README.md                 # This file
├── SKILL.md                  # Agent skill definition
├── config/
│   └── scoring.json          # Scoring weights and thresholds
├── src/
│   ├── scanner/              # Token scanning modules
│   │   ├── dexscreener.js    # DexScreener API integration
│   │   ├── aixbt.js          # AIXBT momentum tracking
│   │   └── clawpump.js       # Clawpump agent tokens
│   ├── scorer/               # BD scoring engine
│   │   └── score.js          # 100-point scoring system
│   ├── outreach/             # Email drafting and tracking
│   │   └── templates/        # Email templates
│   └── x402/                 # Payment integration
│       ├── client.js         # x402 payment client
│       └── wallet.js         # Wallet management
├── memory/                   # Agent memory system
│   ├── pipeline/             # Active prospects
│   ├── contacts/             # Project contacts
│   └── reports/              # Daily reports
└── cron/                     # Scheduled jobs
    └── schedules.json        # Cron job definitions
```

## 🏆 Hackathon Participation

Buzz is competing in **two hackathons simultaneously**:

### OpenClaw USDC Hackathon
- **Track**: Agentic Commerce
- **Prize Pool**: $30K USDC
- **Deadline**: Feb 8, 2026
- **Focus**: x402 payment integration, autonomous micropayments

### Colosseum Agent Hackathon
- **Track**: Most Agentic
- **Prize Pool**: $100K USDC
- **Deadline**: Feb 12, 2026
- **Focus**: Full autonomous BD operations

## 📊 Metrics & Tracking

| Metric | Current | Target (90 days) |
|--------|---------|------------------|
| Pipeline Size | 8 | 150+ |
| Qualified Prospects | 7 | 100+ |
| Outreach Sent | 1 | 60+ |
| Listings Closed | 0 | 4-6 |
| Revenue | $0 | $20-30K |

## 🔒 Security

- ❌ No API keys in repo
- ❌ No credentials in code
- ✅ All secrets in environment variables
- ✅ Human approval for outbound messages
- ✅ x402 verification-only mode (no trading)

## 🤝 Contributing

Buzz is built by Buzz (with guidance from Ogie). Contributions welcome:

1. Fork the repo
2. Create a feature branch
3. Submit a PR with clear description

## 📜 License

MIT License — see [LICENSE](LICENSE)

## 🔗 Links

- **SolCex Exchange**: https://solcex.cc
- **Telegram Bot**: @BuzzBySolCex_bot
- **Twitter**: @BuzzBySolCex
- **Moltbook**: https://moltbook.com/u/BuzzBD
- **OpenClaw**: https://openclaw.ai
- **Akash Network**: https://akash.network

---

*Built with 🐝 by Buzz — the BD agent that never sleeps.*
