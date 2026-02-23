# WalletAgent Design

Layer 2 agent for on-chain wallet forensics and holder analysis. Runs in parallel with SafetyAgent; their results merge before ScorerAgent (Layer 3).

## Decisions

| Decision | Answer |
|----------|--------|
| Pipeline position | Layer 2, parallel with SafetyAgent |
| Architecture | Monolithic single-file agent (matches existing pattern) |
| Depth control | Orchestrator passes hint, WalletAgent can auto-escalate |
| Allium API | Stubbed with detailed contract |
| LLM usage | None -- pure algorithmic |
| Verdict flow | 5 analyses parallel, then _compute_verdict sequential |
| Forensics | Basic heuristics (bundled wallets, funding source) + stub advanced (sybil, wash) |

## Input

```python
params = {
    "deployer_address": str,      # Deployer wallet address
    "token_address": str,         # Token contract address
    "chain": str,                 # "solana" | "ethereum" | "base" | ...
    "depth": str,                 # "quick" | "standard" | "deep" (default: "standard")
}
```

## Output

```python
{
    "deployer_address": str,
    "token_address": str,
    "chain": str,
    "depth": str,                 # actual depth used (may differ if escalated)
    "wallet_score": int,          # 0-100
    "risk_level": str,            # "low" | "medium" | "high" | "critical"
    "verdict": str,               # "CLEAN" | "CAUTION" | "SUSPICIOUS" | "RUG_RISK"
    "breakdown": {
        "liquidity": int,         # 0-25
        "holders": int,           # 0-25
        "deployer": int,          # 0-20
        "tx_flow": int,           # 0-15
        "forensics": int,         # 0-15
    },
    "liquidity_health": {
        "total_liquidity": float,
        "lp_locked": bool,
        "lp_lock_duration_days": Optional[int],
        "lp_burned": bool,
        "buy_sell_ratio": float,
        "available": bool,
    },
    "holder_distribution": {
        "top10_pct": float,
        "deployer_pct": float,
        "unique_holders": int,
        "whale_count": int,       # holders with >2%
        "available": bool,
    },
    "deployer_reputation": {
        "age_days": int,
        "total_tokens_deployed": int,
        "rug_count": int,
        "cross_chain_activity": bool,
        "available": bool,
    },
    "tx_flow": {
        "organic_score": float,   # 0-1
        "unique_buyers_24h": int,
        "unique_sellers_24h": int,
        "avg_tx_size": float,
        "available": bool,
    },
    "forensics": {
        "bundled_wallets": List[str],
        "sybil_clusters": List[List[str]],  # stubbed
        "wash_trading_detected": bool,       # stubbed
        "same_funding_source": bool,
        "available": bool,
    },
    "red_flags": List[str],
    "green_flags": List[str],
    "sources_used": List[str],
}
```

## Risk Level Thresholds

| Score | Risk Level | Verdict |
|-------|-----------|---------|
| 80-100 | low | CLEAN |
| 60-79 | medium | CAUTION |
| 35-59 | high | SUSPICIOUS |
| 0-34 | critical | RUG_RISK |

## Depth Mode Gating

| Method | Quick (<5s) | Standard (<15s) | Deep (<30s) |
|--------|:-----------:|:---------------:|:-----------:|
| _analyze_liquidity | DexScreener | DexScreener | DexScreener |
| _analyze_holders | skip | Helius | Helius |
| _analyze_deployer | skip | Helius (basic) | Helius + Allium |
| _analyze_tx_flow | DexScreener (basic) | Helius enhanced txs | Helius enhanced txs |
| _run_forensics | skip | Helius (bundled only) | Helius (bundled + funding source) |

Skipped methods return `{"available": False, "score": 0}`. Their weight redistributes proportionally to methods that ran.

### Auto-Escalation

Quick mode auto-escalates to standard if 2+ red flags detected after initial analysis. Escalation happens at most once (never standard -> deep).

### Timeouts

| Depth | Per-source timeout | Total budget |
|-------|-------------------|-------------|
| quick | 3s | 5s |
| standard | 8s | 15s |
| deep | 15s | 30s |

## Scoring Engine

### Liquidity (0-25 pts)

| Condition | Points |
|-----------|--------|
| Total liquidity >= $500k | +8 |
| Total liquidity >= $100k | +5 |
| Total liquidity >= $50k | +3 |
| LP locked >= 6 months | +7 |
| LP burned | +5 (or +7 if also locked) |
| Buy/sell ratio 0.7-1.5 | +5 |

### Holder Distribution (0-25 pts)

| Condition | Points |
|-----------|--------|
| Top 10 holders < 20% | +10 |
| Top 10 holders < 30% | +7 |
| Top 10 holders < 50% | +4 |
| Deployer holds < 5% | +5 |
| Deployer holds < 10% | +3 |
| Unique holders >= 1000 | +5 |
| Unique holders >= 500 | +3 |
| No single whale > 5% | +5 |

### Deployer Reputation (0-20 pts)

| Condition | Points |
|-----------|--------|
| Account age > 1 year | +8 |
| Account age > 6 months | +5 |
| Account age > 3 months | +3 |
| No prior rugs (rug_count == 0) | +7 |
| Cross-chain activity | +5 |
| Serial rugger (rug_count >= 2) | -10 |

### TX Flow (0-15 pts)

| Condition | Points |
|-----------|--------|
| Organic score > 0.8 | +8 |
| Organic score > 0.5 | +5 |
| Unique buyers 24h > 100 | +4 |
| Unique buyers 24h > 50 | +2 |
| Reasonable avg tx size | +3 |

### Forensics Clean (0-15 pts)

| Condition | Points |
|-----------|--------|
| No bundled wallets | +5 |
| No sybil clusters | +5 |
| No wash trading | +5 |
| Bundled wallets found | -5 |
| Same funding source | -3 |

### Weight Redistribution

When methods are skipped: `wallet_score = (raw_score / available_points) * 100`, normalized to 0-100 regardless of depth.

## Red Flags

- `whale_concentration` -- top 10 > 50%
- `dev_heavy_bag` -- deployer > 10%
- `unlocked_lp` -- LP not locked and not burned
- `wash_trading` -- wash trading detected (stubbed)
- `bundled_wallets` -- bundled wallets found
- `serial_rugger` -- deployer has 2+ prior rugs
- `honeypot_risk` -- buy/sell ratio > 5.0
- `artificial_demand` -- organic score < 0.3

## Green Flags

- `lp_locked_long` -- LP locked > 6 months
- `lp_burned` -- LP burned
- `well_distributed` -- top 10 < 20%
- `established_deployer` -- account age > 1 year
- `organic_trading` -- organic score > 0.8
- `broad_holder_base` -- 1000+ unique holders
- `smart_money_signal` -- (stubbed)

## API Integration

### DexScreener (all depths)

- `GET /dex/tokens/{tokenAddress}` -- liquidity, volume, pairs
- `GET /dex/pairs/{chainId}/{pairAddress}` -- specific pair data
- LP lock detection via known lock contract addresses (Team.Finance, Unicrypt)
- LP burn detection via dead address holdings

### Helius (standard + deep)

- `POST /v0/addresses/{address}/transactions` -- deployer tx history
- `POST /v0/token-metadata` -- token metadata + authority
- `POST /v0/addresses/{address}/balances` -- holder balances
- Auth: `?api-key={HELIUS_API_KEY}` query parameter

### Allium (deep only -- STUBBED)

```python
async def _fetch_allium(self, deployer_address: str) -> Dict:
    """
    Planned input: deployer wallet address
    Planned output: {
        "chains_active": List[str],
        "total_pnl_usd": float,
        "tokens_deployed": int,
        "rug_indicators": int,
        "available": True
    }
    Planned endpoint: POST https://api.allium.so/api/v1/query
    Auth: Bearer token
    """
    self.log_event("action", "Allium API not yet implemented")
    return {"available": False}
```

## Error Handling

1. Per-source isolation -- each _analyze_* has own try/except
2. Graceful degradation -- failed source returns `{"available": False}`
3. All-sources-failed -- wallet_score: 0, verdict: RUG_RISK, red_flags: ["all_sources_failed"]
4. Event logging -- action/observation/error at every step
5. Never raise from execute() -- always return structured dict

## Testing (58 tests)

| Category | Count |
|----------|-------|
| Constructor & init | 3 |
| Input validation | 4 |
| Depth gating | 6 |
| _analyze_liquidity | 8 |
| _analyze_holders | 7 |
| _analyze_deployer | 6 |
| _analyze_tx_flow | 5 |
| _run_forensics | 5 |
| _compute_verdict | 6 |
| Full execute() | 5 |
| Auto-escalation | 3 |

All tests use pytest + pytest-asyncio + aioresponses + monkeypatch.
