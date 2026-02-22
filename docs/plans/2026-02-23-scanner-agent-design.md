# ScannerAgent Design — Buzz v6.0 Layer 1

## Overview

ScannerAgent covers Layer 1 (Cast the Net) of the 4-Layer Intelligence Architecture. It inherits from BaseAgent, queries 3 discovery sources in parallel via asyncio.gather(), deduplicates results, and returns a normalized list of token candidates for downstream scoring.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Architecture | Single class, parallel private fetchers | Simple, testable, matches Manus pattern |
| HTTP client | aiohttp | Production async HTTP, connection pooling, timeouts |
| Sources (v1) | DexScreener (trending+boosts), CoinGecko, AIXBT (stub) | Confirmed free APIs. Clawpump deferred. |
| Dedup key | (chain, contract_address) | Handles multi-chain correctly |
| AIXBT | Stub returning [] | Endpoint not verified as JSON API |
| Default chains | ["solana", "ethereum", "base"] | Matches existing v5.3.8 scanner |
| Timeout per source | 10 seconds | Fail fast, don't block other sources |

## Interface

```
ScannerAgent(BaseAgent)
  __init__(chains: List[str])
  execute(params) -> dict                      # gathers all sources in parallel
  _fetch_dexscreener(chains) -> List[dict]     # trending + boosts
  _fetch_coingecko() -> List[dict]             # trending
  _fetch_aixbt() -> List[dict]                 # stub
  _deduplicate(tokens) -> List[dict]           # merge by (chain, address)
```

## Token Candidate Schema

```python
{
    "contract_address": str,   # on-chain address
    "chain": str,              # "solana", "ethereum", "base"
    "name": str,
    "symbol": str,
    "mcap": float,             # market cap USD
    "volume_24h": float,       # 24h volume USD
    "liquidity": float,        # liquidity USD
    "source": str,             # which source found it (pre-dedup)
    "sources": List[str],      # all sources that found it (post-dedup)
    "source_url": str,         # link back
}
```

## Data Flow

```
execute(params={chains: ["solana", "ethereum", "base"]})
  -> asyncio.gather(
       _fetch_dexscreener(chains),
       _fetch_coingecko(),
       _fetch_aixbt(),
     )
  -> flatten all results
  -> _deduplicate by (chain, contract_address)
  -> log_event("observation", f"Found {n} unique tokens")
  -> write_scratchpad("last_scan", results)
  -> return {"tokens": [...], "source_counts": {...}, "total": n}
```

## Error Handling

- Each _fetch method catches its own exceptions
- On failure: logs error event, returns empty list
- Other sources continue (Manus: error isolation)
- execute() always returns a result, even if all sources fail

## API Endpoints

| Source | Endpoint | Auth |
|--------|----------|------|
| DexScreener boosts | `https://api.dexscreener.com/token-boosts/latest/v1` | None |
| DexScreener search | `https://api.dexscreener.com/latest/dex/search/?q={query}` | None |
| CoinGecko trending | `https://api.coingecko.com/api/v3/search/trending` | None |
| AIXBT | Stubbed | N/A |

## What's Not Included (YAGNI)

- No rate limiting (free APIs, 4x/day scan frequency)
- No caching (scratchpad serves as cache)
- No pagination (top N per source)
- No source registry (only 3 sources)
- No Clawpump (endpoint not specified, add later)

## Dependencies

- aiohttp (new — add to requirements-dev.txt or requirements.txt)
- BaseAgent from src/agents/base_agent.py
