---
name: buzz-bd-agent
version: 3.3.0
description: Autonomous business development agent for SolCex Exchange - multi-chain token scanning, forum experience, Minara analysis, zauthx402 trust verification, x402 payment integration, and outreach automation
homepage: https://github.com/buzzbysolcex/buzz-bd-agent
metadata:
  category: business-development
  api_base: https://solcex.cc
  chains: [solana, ethereum, bsc]
  x402:
    supported: true
    networks: [solana:mainnet, eip155:8453]
    budget: $0.30/day
---

# Buzz BD Agent Skill

> Autonomous business development for SolCex Exchange

## Overview

Buzz is a 24/7 autonomous BD agent that:
- Scans multiple chains for promising tokens
- Scores prospects using a 100-point system
- Drafts personalized outreach emails
- Pays for premium intelligence via x402
- Tracks pipeline and ROI

## Capabilities

### Token Scanning
```bash
# Scan DexScreener for Solana tokens
curl -s "https://api.dexscreener.com/latest/dex/tokens/solana" | \
  jq '.pairs[:10] | .[] | {name: .baseToken.name, mcap: .marketCap, vol: .volume.h24}'
```

### BD Scoring
Tokens are scored on a 100-point scale:
- Liquidity (30 pts): $500K+ = full points
- Volume 24h (25 pts): $1M+ = full points
- Age (15 pts): 7-30 days optimal
- Community (15 pts): Active socials
- Contract Safety (15 pts): Audited, no red flags

### x402 Payments
```javascript
// Pay for premium intel
const response = await x402Client.fetch({
  url: 'https://einstein-ai.com/api/whales',
  method: 'POST',
  body: { chain: 'solana' }
});
// Cost: $0.10 USDC per call
```

### zauthx402 Trust
```
Contract: DNhQZ1CE9qZ2FNrVhsCXwQJ2vZG8ufZkcYakTS5Jpump

Flags:
- [x402-VERIFIED]: +5 points, priority outreach
- [x402-CAUTION]: Manual review
- [x402-BLOCKED]: Auto-reject
```

## Cron Jobs

| Job | Schedule | Task |
|-----|----------|------|
| Morning Scan | 05:00 AST | Full deep scan |
| Midday Refresh | 12:00 AST | Quick update |
| Evening Scan | 18:30 AST | Full scan + report |
| Night Scan | 21:00 AST | Clawpump focus |
| Moltbook HB | Every 4h | Community engagement |

## Outreach Templates

### Initial Contact
```
Subject: SolCex Exchange Listing Opportunity — {TOKEN}

Hi {NAME},

Buzz here from SolCex Exchange. Tracking {TOKEN} — 
impressed by {METRIC}.

Listing includes:
- 3-month market making
- AMA hosting  
- Whale airdrop distribution

Fee: $5,000 USDC + $10K liquidity

Interested?

— Buzz 🐝
```

## Integration

### As a Skill
```bash
# Fetch skill definition
curl https://raw.githubusercontent.com/buzzbysolcex/buzz-bd-agent/main/SKILL.md
```

### Environment Variables
```bash
TELEGRAM_BOT_TOKEN=xxx    # Telegram channel
GMAIL_CLIENT_ID=xxx       # Gmail API
MOLTBOOK_TOKEN=xxx        # Moltbook API
X402_WALLET=xxx           # x402 payments
```

## API Endpoints Used

| Service | Endpoint | Purpose |
|---------|----------|---------|
| DexScreener | `/latest/dex/tokens/{chain}` | Token data |
| AIXBT | `/api/momentum` | Smart money |
| Clawpump | `/api/launches` | Agent tokens |
| Einstein AI | `/api/whales` | Whale tracking |
| Gloria AI | `/api/news` | Breaking news |

## Memory Structure

```
memory/
├── pipeline/
│   ├── active.json      # Current prospects
│   └── archived.json    # Past prospects
├── contacts/
│   └── relationships.json
├── reports/
│   └── YYYY-MM-DD.json
└── x402/
    └── transactions.json
```

## Health System

Buzz tracks its own health:
- Memory load (context usage)
- Pipeline health
- x402 balance
- Cron job status

## Security Notes

- All outreach requires human approval
- No trading (verification-only mode)
- API keys stored securely, never in code
- x402 budget limits enforced

---

*Skill version 3.3.0 — Updated Feb 6, 2026*
