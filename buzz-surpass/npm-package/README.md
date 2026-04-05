# @buzzbd/scorer

**Buzz Token Scorer** — 11-rule crypto token scoring engine. Zero LLM cost. Score any token from your terminal in seconds.

[![npm](https://img.shields.io/npm/v/@buzzbd/scorer)](https://www.npmjs.com/package/@buzzbd/scorer)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## Quick Start

```bash
# Score a token instantly
npx @buzzbd/scorer PEPE

# Score by contract address
npx @buzzbd/scorer 0x6982508145454Ce325dDbE47a25d4ec3d2311933

# JSON output for CI/CD
npx @buzzbd/scorer PEPE --json

# View leaderboard
npx @buzzbd/scorer --leaderboard
```

## As a Library

```javascript
const { scoreToken, calculateScore, RULES } = require('@buzzbd/scorer');

// Score via Buzz API (with DexScreener fallback)
const result = await scoreToken('PEPE');
console.log(result.score);          // 78
console.log(result.classification); // "WARM"
console.log(result.breakdown);      // Detailed breakdown

// Local scoring with your own data
const score = calculateScore({
  symbol: 'MYTOKEN',
  marketCap: 5000000,
  fdv: 8000000,
  volume24h: 250000,
  liquidity: 400000,
  txns24h: 1200,
  ageDays: 45,
  securityFlags: [],
  securityClean: true,
});
```

## 11 Scoring Rules

| Rule | Type | What It Catches |
|------|------|-----------------|
| FDV_GAP_PENALTY | Penalty | FDV/mcap divergence > 5x |
| STABLECOIN_EXCLUSION | Filter | Stablecoins auto-excluded |
| GHOST_TOKEN | Filter | No real on-chain activity |
| CONTRADICTORY_AUDIT | Hold | Conflicting security data |
| SECURITY_PENALTY | Penalty | Honeypot, security flags |
| LIQUIDITY_CROSSREF | Verify | Liquidity depth check |
| AGE_BONUS | Bonus | Token maturity (>90 days) |
| VOLUME_THRESHOLD | Filter | Minimum 24h volume |
| GHOST_VOLUME | Penalty | Wash trading detection |
| CTO_FLAG | Flag | Community takeover indicator |
| VOLUME_LIQUIDITY_RATIO | Penalty | Suspicious vol/liq ratio |

## Score Bands

| Range | Classification | Meaning |
|-------|---------------|---------|
| 85-100 | HOT | BD screening pipeline activated |
| 70-84 | WARM | Monitor, potential candidate |
| 50-69 | COLD | Low priority |
| 0-49 | REJECTED | Auto-filtered |

## Architecture

- **Zero LLM cost** — pure rule-based scoring
- **DexScreener API** — real-time market data (free tier)
- **Buzz API fallback** — enhanced scoring with 32 intel sources
- **On-chain proof** — ScoreStorage v2 on Base mainnet
- **Zero dependencies** — uses native Node.js fetch (18+)

## Links

- **Web scorer**: https://buzzbd.ai/score
- **Leaderboard**: https://buzzbd.ai/scores
- **API docs**: https://api.buzzbd.ai
- **Twitter**: [@BuzzBySolCex](https://twitter.com/BuzzBySolCex)

## About

Built by a chef with no CS background using conversational AI. Part of the Buzz BD Agent — an autonomous crypto business development system with 81 database tables, 200+ endpoints, 12 persistent agents, and $200+ revenue.

v9.2 — 392 commits, CI/CD #149 GREEN. Bismillah 🤲

## License

MIT
