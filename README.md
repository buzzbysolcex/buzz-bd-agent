# 🐝 Buzz BD Agent — Autonomous Token Discovery & Outreach for SolCex Exchange

> The first AI Business Development agent operating autonomously for a centralized exchange, powered by USDC settlement and x402 payment protocol.

**Live:** [@BuzzBySolCex](https://x.com/BuzzBySolCex) · [Moltbook](https://moltbook.com/u/BuzzBD) · [ClawdIn Verified](https://clawdin.com)

---

## What Buzz Does

Buzz is an autonomous AI agent that discovers, evaluates, and initiates outreach to promising token projects for listing on SolCex Exchange. It operates 24/7 on decentralized infrastructure, scanning multiple blockchains and intelligence sources to build a qualified pipeline of listing prospects.

**The core loop:**

```
DISCOVER → SCORE → VERIFY → OUTREACH → SETTLE (USDC)
```

Every step runs autonomously. The human (Ogie, SolCex BD Lead) provides final approval on outreach — everything else is agent-driven.

---

## x402 Payment Integration

Buzz is a **buyer** in the x402 ecosystem — it autonomously pays for premium intelligence using USDC micropayments.

```
Buzz Agent                    x402 Service
    │                              │
    ├── GET /intelligence ────────►│
    │                              │
    │◄── 402 Payment Required ─────┤
    │    (price, token, payTo)     │
    │                              │
    ├── Verify via zauthx402 ──►   │  ← Trust layer
    │                              │
    ├── Sign USDC payment ─────►   │
    │   (from 79AV... wallet)      │
    │                              │
    │◄── 200 OK + Data ────────────┤
    │                              │
    └── Log tx + update budget     │
```

### Payment Safety

| Rule | Limit |
|------|-------|
| Auto-approve | ≤ $1.00 USDC |
| Requires human approval | > $1.00 USDC |
| Hard block per transaction | > $5.00 USDC |
| Hard block per day | > $50.00 USDC |
| Daily budget target | $0.30 |
| Monthly budget | ~$9.00 |

### Trust Verification (zauthx402)

Before any x402 transaction, Buzz checks endpoint success rate > 90%, pricing consistency, and vulnerability flags. If NOT verified → `[x402-CAUTION]` → manual review required.

### x402 Services

| Service | Purpose | Cost | Frequency |
|---------|---------|------|-----------|
| Einstein AI | Whale movement alerts | $0.10/call | 1x daily (06:00) |
| Gloria AI | Breaking crypto news | $0.10/call | 2x daily (12:00, 18:00) |

**Wallet:** `79AVHaE2g3GQYoqXCpvim12HeV563mYe7VHDrw28uzxG`
**Balance:** $10.66 USDC (35+ days runway)

---

## Intelligence Stack

| Source | Data | Cost |
|--------|------|------|
| **DexScreener API** | Prices, liquidity, pairs, volume (60+ chains) | FREE |
| **AIXBT** | Trending tokens, AI confidence, catalysts | FREE |
| **leak.me KOL** | VC follows, smart money tracking | FREE |
| **Clawpump** | New agent token launches (Solana) | FREE |
| **Einstein AI** | Whale wallet movements | $0.10 x402 |
| **Gloria AI** | Breaking news, sentiment | $0.10 x402 |

Cross-reference: When a token appears on **both** AIXBT trending AND DexScreener gainers → `[HIGH CONVICTION]` with priority scoring.

---

## 100-Point Scoring Engine

| Factor | Weight |
|--------|--------|
| Market Cap | 20% |
| Liquidity | 25% |
| Volume 24h | 20% |
| Social Metrics | 15% |
| Token Age | 10% |
| Team Transparency | 10% |
| + Catalyst Adjustments | ±10-15 pts |
| + [x402-PAID] bonus | +3 pts |

| Score Range | Action |
|-------------|--------|
| 85-100 🔥 | Immediate outreach |
| 70-84 ✅ | Priority queue |
| 50-69 👀 | Watch 48h |
| 0-49 ❌ | Skip |

---

## Current Pipeline (Feb 7, 2026)

| Token | Score | Market Cap | Liquidity | Volume 24h |
|-------|-------|-----------|-----------|------------|
| ARC | 91 🔥 | $80M | $3.76M | $8.39M |
| BEAM | 84 ✅ | $4.8M | — | +61% 7d |
| BUTTCOIN | 84 ✅ | $30.2M | — | +32% 7d |
| PENGUIN | 84 ✅ | $21.6M | $719K | +20% 7d |
| BIGTROUT | 82 ✅ | $5.6M | $291.8K | $7.23M |
| COPPERINU | 81 ✅ | $5.5M | — | +38% 7d |
| TOILET | 76 ✅ | $2.0M | — | +88% 7d |
| JARVIS | 72 ⚠️ | $639K | — | -21% 7d |

**Pipeline value:** ~$40,000 USDC (8 listings × $5K avg). All data DexScreener verified.

---

## Wallet Infrastructure

| # | Wallet | Purpose | Status |
|---|--------|---------|--------|
| 1 | `BPRgNKqFpsxHczxqp9e3WcEQjgFy8mnRdiKt8ocLEUhm` | BD Ops / Moltbook Hackathon | SOL gas |
| 2 | `79AVHaE2g3GQYoqXCpvim12HeV563mYe7VHDrw28uzxG` | x402 Micropayments | $10.66 USDC ✅ |
| 3 | `6gbSPsUdeMj31bfveey7qwnrKfvsQDcg9Tjv75A3jNJf` | AgentWallet / Colosseum | Pending |
| EVM | `0xe9AFfd6FD26b365ba72f9DCDB9601CD7A31DAba4` | EVM AgentWallet | — |

---

## Deployment

| Component | Detail |
|-----------|--------|
| **Infrastructure** | Akash Network (decentralized cloud) |
| **Framework** | OpenClaw |
| **Model** | Claude Sonnet 4 |
| **Communication** | Telegram Bot (@BuzzBySolCex_bot) |
| **Social** | Twitter (@BuzzBySolCex), Moltbook (@BuzzBD) |
| **Email** | buzzbysolcex@gmail.com |
| **Verification** | ClawdIn Agent Verified ✅ — 3 skills |

---

## Supported Chains

| Chain | Priority | Listing Fee (USDC) |
|-------|----------|-------------------|
| Solana | 1 (Home chain) | $5,000 |
| Ethereum | 2 | $7,500 |
| BSC | 3 | $7,500 |

---

## Revenue Model

| Timeline | Target | Revenue |
|----------|--------|---------|
| Month 1 | Pipeline building | $0-5K |
| Month 2 | 2-3 listings | $10-22.5K |
| Month 3 | 3-5 listings | $15-37.5K |

**Agent cost:** ~$9/month | **ROI at first listing:** 555x ($5,000 / $9)

---

## What Makes This Novel

1. **First AI BD Agent for a CEX** — Business development, not trading
2. **Real USDC Commerce** — Listing fees + x402 payments, all on-chain auditable
3. **x402 Buyer Agent** — Self-funded premium intelligence via micropayments
4. **Trust-Verified Commerce** — zauthx402 prevents scam payments
5. **Decentralized Infra** — Akash Network, not AWS
6. **Human-in-Loop Safety** — Autonomous scanning, human-approved outreach
7. **Multi-Source Intelligence** — 6 sources (4 free + 2 paid) with cross-reference

---

## Emergency Controls

| Command | Action |
|---------|--------|
| `STOP` | Full freeze — all operations halt |
| `STOP x402` | Freeze x402 payments only |
| `STOP PAYMENTS` | Freeze ALL payments |
| `STOP EMAIL` | Freeze email outreach |
| `STOP FORUM` | Freeze forum posts |
| `STOP SCAN` | Freeze scanning |

All via Telegram to @BuzzBySolCex_bot.

---

## Memory & Lifecycle

Buzz operates on 10-14 day cycles. Compression protocol: store TOP 5 per chain, offload scores < 70, auto-purge no-response > 5 days. Health monitored every scan cycle.

---

## Hackathon Submissions

| Hackathon | Track | Prize Pool | Deadline | Status |
|-----------|-------|-----------|----------|--------|
| OpenClaw USDC | Agentic Commerce | $30K (Circle) | Feb 8, 2026 | ✅ Submitted |
| Colosseum Agent | AI Agent | $100K (Solana Foundation) | Feb 12, 2026 | ✅ Submitted |

---

## File Structure

```
buzz-bd-agent/
├── README.md
├── SKILL.md
├── docs/
│   └── x402-capability-proof.md
├── src/
│   ├── scorer/
│   │   └── scoring-engine.js
│   ├── scanner/
│   │   └── dexscreener.js
│   └── x402/
│       └── x402-client.js
└── config/
    └── schedule.json
```

---

## Links

| Resource | URL |
|----------|-----|
| Twitter | [@BuzzBySolCex](https://x.com/BuzzBySolCex) |
| Moltbook | [@BuzzBD](https://moltbook.com/u/BuzzBD) |
| SolCex Exchange | [@SolCex_Exchange](https://x.com/SolCex_Exchange) |
| AgentWallet | [agentwallet.mcpay.tech/u/buzzbysolcex](https://agentwallet.mcpay.tech/u/buzzbysolcex) |
| Colosseum | [Project Page](https://colosseum.com/agent-hackathon/projects/buzz-bd-agent-autonomous-token-discovery-outreach) |

---

## Team

| Role | Entity | Handle |
|------|--------|--------|
| Builder & BD Lead | Ogie | [@hidayahanka1](https://x.com/hidayahanka1) |
| Strategy & Ops | Claude Opus 4.6 | — |
| Autonomous Agent | Buzz v3.3 | [@BuzzBySolCex](https://x.com/BuzzBySolCex) |

---

*Built with 🐝 by SolCex Exchange*

#USDC #AgenticCommerce #Solana #x402 #OpenClaw #AkashNetwork
