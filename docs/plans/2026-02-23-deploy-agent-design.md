# DeployAgent Design

Layer 2 agent for deployer cross-chain intelligence and reputation analysis. Runs in parallel with SafetyAgent, WalletAgent, and SocialAgent; their results merge before ScorerAgent (Layer 4).

## Decisions

| Decision | Answer |
|----------|--------|
| Pipeline position | Layer 2, parallel with SafetyAgent + WalletAgent + SocialAgent |
| Architecture | Monolithic single-file agent (matches existing pattern) |
| Allium API | Stub with detailed SQL contracts (async query+poll), plug-and-play later |
| Helius scope | getAssetsByOwner (DAS) + enhanced transactions (deployment patterns) |
| Methods | 3: _analyze_deployments, _analyze_portfolio, _analyze_cross_chain (stub) |
| Depth modes | 3: quick (deployments), standard (+portfolio), deep (+cross-chain stub) |
| Scoring | Keep spec (30+30+20+20), weight redistribution handles stub unavailability |

## Input

```python
params = {
    "deployer_address": str,    # Deployer wallet address
    "chain": str,               # "solana" | "ethereum" | "base" | ...
    "token_address": str,       # Token being evaluated (optional context)
    "depth": str,               # "quick" | "standard" | "deep" (default: "standard")
}
```

## Output

```python
{
    "deployer_address": str,
    "chain": str,
    "depth": str,
    "deploy_score": int,             # 0-100
    "risk_level": str,               # "low" | "medium" | "high" | "critical"
    "cross_chain_reputation": str,   # "established" | "moderate" | "new" | "unknown"
    "chains_active": List[str],      # chains deployer has been active on
    "total_deployments": int,        # total token deployments detected
    "breakdown": {
        "cross_chain_activity": int,     # 0-30
        "deployment_history": int,       # 0-30
        "financial_health": int,         # 0-20
        "reputation": int,               # 0-20
    },
    "deployment_analysis": {
        "total_deployments": int,
        "deployment_frequency": str,     # "prolific" | "moderate" | "occasional" | "first_time"
        "wallet_age_days": int,
        "oldest_tx_timestamp": Optional[str],
        "available": bool,
    },
    "portfolio_analysis": {
        "total_tokens_held": int,
        "estimated_value_usd": float,
        "has_significant_holdings": bool,
        "available": bool,
    },
    "cross_chain_analysis": {
        "chains_detected": List[str],
        "total_cross_chain_txns": int,
        "cross_chain_pnl_usd": float,
        "available": bool,              # False until Allium is implemented
    },
    "red_flags": List[str],
    "green_flags": List[str],
    "sources_used": List[str],
}
```

## Verdict Mapping

| Score | Risk Level | Reputation |
|-------|-----------|------------|
| 80-100 | low | established |
| 60-79 | medium | moderate |
| 30-59 | high | new |
| 0-29 | critical | unknown |

## Depth Mode Gating

| Method | Quick (<5s) | Standard (<15s) | Deep (<30s) |
|--------|:-----------:|:---------------:|:-----------:|
| _analyze_deployments | Helius txns | Helius txns | Helius txns |
| _analyze_portfolio | skip | Helius DAS | Helius DAS |
| _analyze_cross_chain | skip | skip | Allium (stub) |

Skipped methods return `{"available": False, "score": 0}`. Their weight redistributes proportionally to methods that ran.

### Timeouts

| Depth | Per-source timeout | Total budget |
|-------|-------------------|-------------|
| quick | 3s | 5s |
| standard | 8s | 15s |
| deep | 15s | 30s |

## Scoring Engine

### Deployment History (0-30 pts) -- from Helius txns

| Condition | Points |
|-----------|--------|
| total_deployments >= 10 | +10 |
| total_deployments >= 5 | +7 |
| total_deployments >= 2 | +4 |
| wallet_age_days >= 365 | +10 |
| wallet_age_days >= 180 | +7 |
| wallet_age_days >= 30 | +4 |
| deployment_frequency in ("prolific", "moderate") | +5 |
| deployment_frequency == "occasional" | +3 |

### Financial Health (0-20 pts) -- from Helius DAS

| Condition | Points |
|-----------|--------|
| total_tokens_held >= 10 | +5 |
| total_tokens_held >= 3 | +3 |
| estimated_value_usd >= 10000 | +8 |
| estimated_value_usd >= 1000 | +5 |
| estimated_value_usd >= 100 | +3 |
| has_significant_holdings == True | +7 |

### Cross-Chain Activity (0-30 pts) -- from Allium (stubbed)

| Condition | Points |
|-----------|--------|
| chains_detected >= 5 | +15 |
| chains_detected >= 3 | +10 |
| chains_detected >= 2 | +6 |
| total_cross_chain_txns >= 100 | +8 |
| total_cross_chain_txns >= 20 | +5 |
| cross_chain_pnl_usd > 0 | +7 |

### Reputation (0-20 pts) -- derived from deployment + portfolio

| Condition | Points |
|-----------|--------|
| wallet_age_days >= 365 AND total_deployments >= 5 | +10 |
| wallet_age_days >= 180 AND total_deployments >= 2 | +6 |
| No failed/rugged tokens detected | +5 |
| has_significant_holdings == True | +5 |

### Weight Redistribution

When methods are skipped: `deploy_score = round((raw_score / available_points) * 100)`, normalized to 0-100 regardless of depth.

## Red Flags

- `fresh_wallet` -- wallet_age_days < 7
- `single_chain_deployer` -- chains_active has only 1 chain (when cross-chain data available)
- `high_failure_rate` -- more than 50% of deployments are dead/zero-value tokens
- `negative_pnl` -- estimated portfolio value < $10 and has deployed 3+ tokens
- `first_time_deployer` -- total_deployments == 1 and wallet_age_days < 30
- `empty_wallet` -- total_tokens_held == 0 and estimated_value_usd == 0

## Green Flags

- `multi_chain_active` -- chains_active has 3+ chains
- `positive_pnl` -- estimated_value_usd >= $1000
- `established_history` -- wallet_age_days >= 365 and total_deployments >= 5
- `diversified_portfolio` -- total_tokens_held >= 10
- `prolific_deployer` -- total_deployments >= 10

## API Integration

### Helius Enhanced Transactions (all depths)

- `GET https://api.helius.xyz/v0/addresses/{deployer}/transactions?api-key={HELIUS_API_KEY}&limit=100`
- Auth: `?api-key={HELIUS_API_KEY}` query param
- Returns: array of enhanced transactions with `timestamp`, `type`, `feePayer`, `tokenTransfers`
- Parse: count deployment-like txns (type contains "CREATE" or token mint patterns), calculate wallet age from oldest timestamp
- Deployment frequency: prolific (10+), moderate (5-9), occasional (2-4), first_time (1)

### Helius DAS API (standard + deep)

- `POST https://mainnet.helius-rpc.com/?api-key={HELIUS_API_KEY}`
- JSON-RPC: `{"jsonrpc": "2.0", "id": 1, "method": "getAssetsByOwner", "params": {"ownerAddress": "{deployer}", "page": 1, "limit": 100}}`
- Returns: `result.items[]` with token metadata, ownership, pricing info
- Parse: count tokens held, estimate value from token metadata

### Allium SQL Queries (deep only -- STUBBED)

- `POST https://api.allium.so/api/v1/query`
- Auth: `Authorization: Bearer {ALLIUM_API_KEY}`
- Request: `{"sql": "...", "parameters": {"deployer": "..."}}`
- Response: `{"run_id": "xxx"}` then poll `GET /api/v1/query/{run_id}/results`

Planned SQL queries (defined in stub docstrings):

Query 1 -- Cross-chain activity:
```sql
SELECT chain, COUNT(*) as tx_count, SUM(value_usd) as total_value
FROM crosschain.transactions
WHERE from_address = :deployer
GROUP BY chain
ORDER BY tx_count DESC
```

Query 2 -- Deployer PnL:
```sql
SELECT SUM(CASE WHEN direction='in' THEN value_usd ELSE -value_usd END) as pnl_usd
FROM crosschain.token_transfers
WHERE address = :deployer
AND block_timestamp > NOW() - INTERVAL '1 year'
```

## Error Handling

1. Per-source isolation -- each _analyze_* has own try/except
2. Graceful degradation -- failed source returns `{"available": False}`
3. All-sources-failed -- deploy_score: 0, risk_level: "critical", cross_chain_reputation: "unknown", red_flags: ["all_sources_failed"]
4. Event logging -- action/observation/error at every step
5. Never raise from execute() -- always return structured dict (top-level try/except)

## Testing (42 tests)

| Category | Count |
|----------|-------|
| Constructor & init | 3 |
| Input validation | 4 |
| Depth gating | 5 |
| _analyze_deployments | 7 |
| _analyze_portfolio | 6 |
| _analyze_cross_chain (stub) | 4 |
| _compute_verdict | 5 |
| Red/green flag detection | 4 |
| Full execute() integration | 4 |

All tests use pytest + pytest-asyncio + aioresponses + monkeypatch.
