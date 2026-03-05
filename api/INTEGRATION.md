# 🐝 /score-token Endpoint — Integration Guide
## Sprint Day 9 | March 3, 2026
## Buzz BD Agent v6.1.1

---

## FILES CREATED

```
buzz-api/
├── routes/
│   └── score.js                    ← 4 endpoints (POST + 3 GETs)
├── services/
│   ├── orchestrator.js             ← 5 parallel sub-agent dispatch
│   ├── agentproof.js               ← AgentProof telemetry (Agent #1718)
│   ├── costTracker.js              ← Cost tracking per request
│   └── agents/
│       ├── scanner.js              ← L1 Discovery (DexScreener)
│       ├── safety.js               ← L2 Filter (RugCheck + DFlow)
│       ├── wallet.js               ← L2 Filter (Helius + Allium)
│       ├── social.js               ← L3 Research (Grok + Serper + ATV)
│       └── scorer.js               ← L4 Score (11 factors, 100-point)
├── middleware/
│   └── validate.js                 ← Request validation (address format + chain)
├── migrations/
│   └── score-tables.js             ← DB migrations (token_scores + cost_log + agentproof)
└── INTEGRATION.md                  ← This file
```

---

## STEP 1: Copy files into existing scaffold

```bash
# From wherever you extracted the files:
cp -r buzz-api/routes/score.js ~/buzz-bd-agent/api/routes/
cp -r buzz-api/services/ ~/buzz-bd-agent/api/services/
cp -r buzz-api/middleware/validate.js ~/buzz-bd-agent/api/middleware/
cp -r buzz-api/migrations/ ~/buzz-bd-agent/api/migrations/
```

---

## STEP 2: Wire into server.js

Add to your existing `~/buzz-bd-agent/api/server.js`:

```javascript
// Add after existing route imports
const scoreRoutes = require('./routes/score');

// Add after existing app.use() route registrations
app.use('/api/v1', scoreRoutes);
```

---

## STEP 3: Run DB migrations

Add to your existing `db.js` initDb() function:

```javascript
const { migrations: scoreMigrations } = require('./migrations/score-tables');

// In initDb():
for (const migration of scoreMigrations) {
  db.exec(migration.sql);
  console.log(`Migration ${migration.version} (${migration.name}) applied`);
}
```

---

## STEP 4: Set environment variables

```bash
# Required for full functionality (add to .env or export)
export HELIUS_API_KEY=your_helius_key
export SERPER_API_KEY=your_serper_key
export GROK_API_KEY=your_grok_xai_key          # or XAI_API_KEY
export ATV_API_KEY=your_atv_key
export AGENTPROOF_API_KEY=ap_live_9d36bbc80ef67b7cf753c4e2829dacf2

# Already in scaffold from Day 8:
export BUZZ_DB_DIR=./data
export BUZZ_API_ADMIN_KEY=your-admin-key
```

---

## STEP 5: Test locally

```bash
cd ~/buzz-bd-agent/api
BUZZ_DB_DIR=./data BUZZ_API_ADMIN_KEY=test-admin node server.js

# In separate terminal — test with a Solana token:
curl -s -X POST http://localhost:3000/api/v1/score-token \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test-admin" \
  -d '{"address": "So11111111111111111111111111111111111111112", "chain": "solana"}' | jq

# Test with an EVM token (Base):
curl -s -X POST http://localhost:3000/api/v1/score-token \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test-admin" \
  -d '{"address": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", "chain": "base"}' | jq

# Get cached score:
curl -s http://localhost:3000/api/v1/score-token/So11111111111111111111111111111111111111112?chain=solana \
  -H "X-API-Key: test-admin" | jq

# Leaderboard:
curl -s "http://localhost:3000/api/v1/score-token/leaderboard?since=24h" \
  -H "X-API-Key: test-admin" | jq
```

---

## ENDPOINTS ADDED (4 new → total 34/64)

| # | Method | Path | Description | Auth |
|---|--------|------|-------------|------|
| 31 | POST | `/api/v1/score-token` | Score a token (5 parallel agents) | API key / x402 |
| 32 | GET | `/api/v1/score-token/:address` | Get latest cached score | API key |
| 33 | GET | `/api/v1/score-token/history/:address` | Score history for token | API key |
| 34 | GET | `/api/v1/score-token/leaderboard` | Top scored tokens | API key |

---

## ACP HANDLER WIRING

The `/score-token` endpoint serves double duty for ACP `token_intelligence_score` offering.
Update the ACP handler at:
```
/data/workspace/skills/virtuals-acp/src/seller/offerings/buzz-bd-agent/token_intelligence_score/handlers.ts
```

Replace the TODO with:

```typescript
import { handleJob } from '../../../utils/handler';

export async function onNewJob(job: any) {
  const { contract_address, chain, depth } = job.requirements;
  
  // Call Buzz REST API
  const response = await fetch('http://localhost:3000/api/v1/score-token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.BUZZ_API_ADMIN_KEY || 'internal'
    },
    body: JSON.stringify({
      address: contract_address,
      chain: chain || 'solana',
      depth: depth || 'standard'
    })
  });

  const result = await response.json();
  
  return {
    status: result.success ? 'completed' : 'failed',
    result: result
  };
}
```

Similarly wire `token_safety_check` to hit the safety-agent directly,
and `trending_token_intelligence` to the scanner endpoint.

---

## RESPONSE FORMAT

```json
{
  "success": true,
  "cached": false,
  "token": {
    "address": "...",
    "chain": "solana",
    "name": "ExampleToken",
    "symbol": "EXT",
    "market_cap": 5000000,
    "liquidity": 250000,
    "price_usd": 0.05
  },
  "score": {
    "total": 72,
    "verdict": "QUALIFIED",
    "verdict_emoji": "✅",
    "breakdown": {
      "safety": { "raw_score": 80, "weight": 0.30, "weighted": 24 },
      "wallet": { "raw_score": 65, "weight": 0.30, "weighted": 19.5 },
      "social": { "raw_score": 55, "weight": 0.20, "weighted": 11 },
      "scorer": { "raw_score": 72, "weight": 0.20, "weighted": 14.4 },
      "composite": 72,
      "formula": "safety(0.30) + wallet(0.30) + social(0.20) + scorer(0.20)"
    }
  },
  "sub_agents": {
    "scanner": { "status": "completed", "duration_ms": 1200 },
    "safety":  { "status": "completed", "score": 80, "weight": 0.30, "duration_ms": 3400 },
    "wallet":  { "status": "completed", "score": 65, "weight": 0.30, "duration_ms": 2800 },
    "social":  { "status": "completed", "score": 55, "weight": 0.20, "duration_ms": 45000 },
    "scorer":  { "status": "completed", "score": 72, "weight": 0.20, "duration_ms": 150 }
  },
  "agents_completed": 5,
  "agents_total": 5,
  "meta": {
    "request_id": "score-1709420000-abc123",
    "duration_ms": 48000,
    "depth": "standard",
    "source": "live",
    "buzz_version": "6.1.1",
    "engine": "5-parallel-sub-agents"
  }
}
```

---

## ARCHITECTURE NOTES

- **Phase 1:** Scanner + Safety + Wallet + Social run in PARALLEL (Promise.allSettled)
- **Phase 2:** Scorer runs AFTER Phase 1 with all collected data
- **Total typical time:** 30-120s (social-agent is the bottleneck due to Grok)
- **Cache:** 30-minute window — repeat requests hit cache
- **Graceful degradation:** If any agent fails, others still score. Weights normalize.
- **Cost per score:** ~$0.057 (5x gpt-5-nano @ ~$0.0013 + $0.05 AgentProof)
- **Revenue per score:** $0.05 (x402) or $0.50 (ACP) → net positive either way

---

*Sprint Day 9 | March 3, 2026 | Jakarta, WIB*
*"The intel is the hook. The relationship is the close." 🐝*
