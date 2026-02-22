# SafetyAgent Design — Buzz v6.0 Layer 2

## Overview

SafetyAgent covers Layer 2 (Filter) of the 4-Layer Intelligence Architecture. It inherits from BaseAgent, accepts a contract_address and chain, runs 3 safety sources in parallel via `asyncio.gather()`, and returns a unified safety score, individual source results, and risk flags. The 3 sources are RugCheck (honeypot/contract safety), QuillShield (0-100 safety score via authority/liquidity/holders/contract analysis), and DFlow MCP (swap route verification).

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Architecture | Flat agent with private methods | Matches ScannerAgent/ScorerAgent pattern, simplest for 3 sources |
| RugCheck | Real API (Solana-first) | RugCheck.xyz REST API available, other chains can be added later |
| QuillShield | Python module import | Extracted to src/scorers/quillshield.py, reusable across agents |
| DFlow | Stubbed with correct interface | MCP integration deferred; modifier logic implemented now |
| Scoring | Weighted average + additive modifier | RugCheck 30%, QuillShield 50%, remaining 20% redistributed if source unavailable; DFlow is additive |
| Error handling | Graceful degradation | Failed sources excluded from weighted average, not scored as 0 |
| Config | Hardcoded constants | Matches codebase convention, testable, no file I/O |

## Interface

```
SafetyAgent(BaseAgent)
  __init__()
  execute(params) -> dict                              # runs all sources, aggregates
  _fetch_rugcheck(address, chain) -> dict              # RugCheck API call
  _fetch_quillshield(address, chain) -> dict           # QuillShield module call
  _fetch_dflow(address, chain) -> dict                 # DFlow stub
  _calculate_dflow_modifier(dflow_result) -> int       # DFlow scoring rules
  _map_rugcheck_score(report) -> int                   # Map RugCheck response to 0-100
  _collect_risk_flags(rugcheck, quillshield, dflow) -> list  # Aggregate risk flags
  _aggregate_score(rugcheck, quillshield, dflow_mod) -> int  # Weighted average + modifier
```

## Input Schema

```python
{
    "contract_address": str,   # Token contract/mint address
    "chain": str,              # "solana", "ethereum", "base"
}
```

## Output Schema

```python
{
    "contract_address": str,
    "chain": str,
    "safety_score": int,           # 0-100, clamped
    "is_safe": bool,               # safety_score >= 60
    "sources": {
        "rugcheck": {
            "score": int,          # 0-100
            "is_honeypot": bool,
            "risks": [str],
            "available": bool,
        },
        "quillshield": {
            "score": int,          # 0-100
            "breakdown": {
                "authority": int,  # 0-25
                "liquidity": int,  # 0-25
                "holders": int,    # 0-25
                "contract": int,   # 0-25
            },
            "flags": [str],
            "available": bool,
        },
        "dflow": {
            "routes_found": int,
            "best_slippage": float,
            "best_dex": str,
            "orderbook_depth": float,
            "available": bool,
        },
    },
    "risk_flags": [str],
    "dflow_modifier": int,         # -8 to +13
}
```

## Source Details

### RugCheck (30% weight)

- **API**: `GET https://api.rugcheck.xyz/v1/tokens/{address}/report`
- **Chain support**: Solana only. Non-Solana chains return `{"score": 0, "available": false}`
- **Score mapping**: Start at 100, deduct per risk:
  - Honeypot detected: -40
  - Mint authority not revoked: -20
  - Freeze authority not revoked: -15
  - Each additional risk from API: -10
  - Clamped to 0 minimum
- **Risk flags extracted**: `honeypot_detected`, `mint_authority_active`, `freeze_authority_active`, plus `risks[].name` from API
- **Timeout**: 10 seconds

### QuillShield (50% weight)

- **Implementation**: Python module at `src/scorers/quillshield.py`
- **Score**: 0-100 across 4 categories (25 points each):
  - **Authority** (25pts): mint revoked (+10/-10), freeze revoked (+10/-10), update authority (+5)
  - **Liquidity** (25pts): LP ratio vs mcap (+10), locked LP >6mo (+10), LP burned (+5)
  - **Holders** (25pts): top 10 < 30% (+10), creator < 5% (+10), no whale >10% (+5)
  - **Contract** (25pts): trading both ways (+10), no excessive tax (+5), verified (+5), no suspicious transfers (+5)
- **Data sources**: DexScreener API, Helius API, Solana FM
- **Risk flags extracted**: `top_holders_concentrated`, `lp_not_locked`, `high_tax`, `unverified_contract` (derived from category scores below 50% of max)

### DFlow MCP (Additive modifier: -8 to +13)

- **Status**: Stubbed — returns placeholder data with `available: false`
- **Modifier rules** (from Master Ops §6.3):
  - `+5` for `routes_found >= 3`
  - `+3` for `best_slippage < 1.0%`
  - `+3` for `best_dex` in Tier-1 list (Jupiter, Raydium, Orca, Uniswap, etc.)
  - `+2` for `orderbook_depth > 50000`
  - `-5` for `routes_found == 0`
  - `-3` for `best_slippage > 5.0%`
- **Risk flags extracted**: `no_swap_routes`, `high_slippage`, `low_orderbook_depth`

## Scoring Aggregation

```
base_weights = {rugcheck: 0.3, quillshield: 0.5}
# Remaining 0.2 is redistributed if a source is unavailable
# E.g., if rugcheck fails: quillshield gets full weight (1.0)
# E.g., if quillshield fails: rugcheck gets full weight (1.0)
# E.g., if both fail: safety_score = 0

weighted_avg = sum(source.score * adjusted_weight for available sources)
dflow_modifier = _calculate_dflow_modifier(dflow_result)
safety_score = clamp(weighted_avg + dflow_modifier, 0, 100)
is_safe = safety_score >= 60
```

## Data Flow

```
execute(params={"contract_address": str, "chain": str})
  -> log_event("action", "Starting safety check")
  -> asyncio.gather(
       _fetch_rugcheck(address, chain),
       _fetch_quillshield(address, chain),
       _fetch_dflow(address, chain),
     )
  -> _calculate_dflow_modifier(dflow_result)
  -> _collect_risk_flags(rugcheck, quillshield, dflow)
  -> _aggregate_score(rugcheck, quillshield, dflow_modifier)
  -> is_safe = safety_score >= 60
  -> log_event("observation", f"Safety check: {safety_score} ({'SAFE' if is_safe else 'UNSAFE'})")
  -> write_scratchpad(f"safety_{contract_address}", result)
  -> return result
```

## Risk Flag Collection

| Source | Flag | Condition |
|--------|------|-----------|
| RugCheck | `honeypot_detected` | `is_honeypot == True` |
| RugCheck | `mint_authority_active` | Mint authority not revoked |
| RugCheck | `freeze_authority_active` | Freeze authority not revoked |
| QuillShield | `top_holders_concentrated` | Holders score < 13 (50% of 25) |
| QuillShield | `lp_not_locked` | Liquidity score < 13 |
| QuillShield | `high_tax` | Contract score < 13 |
| QuillShield | `unverified_contract` | Contract score < 13 |
| DFlow | `no_swap_routes` | `routes_found == 0` |
| DFlow | `high_slippage` | `best_slippage > 5.0` |
| DFlow | `low_orderbook_depth` | `orderbook_depth < 10000` |

## Error Handling

- Each source is independently wrapped in try/except
- Failed source: log `"error"` event, set `available: false`, exclude from weighted average
- All sources fail: `safety_score = 0`, `is_safe = False`, `risk_flags = ["all_sources_failed"]`
- Invalid input (missing contract_address/chain): return early with error dict
- `execute()` always returns a result dict, never raises

## Event Logging

| Phase | Event Type | Example |
|-------|-----------|---------|
| Start | action | "Starting safety check for {address} on {chain}" |
| Per source | action | "Calling RugCheck API" |
| Per source result | observation | "RugCheck score: 85, no honeypot" |
| Source failure | error | "RugCheck API failed: timeout" |
| Aggregation | decision | "Safety score: 72 (SAFE), 2 risk flags" |

## Files

| File | Purpose |
|------|---------|
| `src/agents/safety_agent.py` | SafetyAgent class |
| `src/scorers/__init__.py` | Scorers package init |
| `src/scorers/quillshield.py` | QuillShield scoring module |
| `src/agents/tests/test_safety_agent.py` | SafetyAgent tests |
| `src/scorers/tests/__init__.py` | Scorers tests package init |
| `src/scorers/tests/test_quillshield.py` | QuillShield module tests |

## What's Not Included (YAGNI)

- No multi-chain RugCheck (Solana only for now)
- No real DFlow MCP integration (stubbed)
- No caching of safety results (scratchpad overwrites)
- No batch checking (call execute() per token)
- No safety history tracking
- No GoPlus/other EVM safety APIs

## Dependencies

- BaseAgent from src/agents/base_agent.py
- aiohttp for RugCheck API calls
- QuillShield module (src/scorers/quillshield.py) for scoring
