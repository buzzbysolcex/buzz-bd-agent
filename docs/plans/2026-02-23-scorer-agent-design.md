# ScorerAgent Design — Buzz v6.0 Layer 2

## Overview

ScorerAgent covers Layer 2 (Score & Qualify) of the 4-Layer Intelligence Architecture. It inherits from BaseAgent, accepts a fully-assembled token_data dict, applies a 100-point scoring engine (ported from v5.3.8 score.js), and returns a score, status, and recommendation. Auto-reject criteria gate the scoring pipeline.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Architecture | Single class, private scorer methods | Direct port of score.js, matches ScannerAgent pattern |
| Config source | Hardcoded Python constants | Simpler, testable, no file I/O. Same values as scoring.json |
| Input | Full token_data dict from caller | Caller assembles data from all agents before scoring |
| Missing data | Defaults to 0/empty | No exceptions for incomplete data |
| Grade system | Status labels (HOT/QUALIFIED/WATCH/SKIP) | Matches existing v5.3.8 system |
| DFlow | Separate method, not part of catalysts | Distinct concern with its own logic |

## Interface

```
ScorerAgent(BaseAgent)
  __init__()
  execute(params) -> dict                       # scores a single token
  _check_auto_reject(token_data) -> dict        # pre-check disqualifiers
  _score_liquidity(liquidity) -> int            # 0-30
  _score_volume(volume_24h) -> int              # 0-25
  _score_age(age_days) -> int                   # 0-15
  _score_community(socials) -> int              # 0-15
  _score_safety(contract) -> int                # 0-15
  _apply_catalysts(catalysts) -> dict           # net bonus + applied list
  _apply_dflow(dflow_data) -> int               # +13, 0, or -8
  _get_status(score) -> str                     # HOT/QUALIFIED/WATCH/SKIP
  _get_recommendation(status) -> str            # PIPELINE/WATCH/SKIP
```

## Input Schema (token_data)

```python
{
    # From ScannerAgent
    "contract_address": str,
    "chain": str,
    "name": str,
    "symbol": str,
    "mcap": float,
    "volume_24h": float,
    "liquidity": float,

    # From future agents (or caller)
    "age_days": float | None,
    "socials": {
        "twitter_followers": int,
        "telegram_members": int,
        "discord_members": int,
        "engagement_rate": float,       # 0.0-1.0
    },
    "contract": {
        "verified_source": bool,
        "no_honeypot": bool,
        "renounced_ownership": bool,
        "locked_liquidity": bool,
        "audit_report": bool,
    },
    "catalysts": {
        "hackathon_winner": bool,
        "viral_moment": bool,
        "kol_mention": bool,
        "aixbt_high_conviction": bool,
        "dexscreener_trending": bool,
        "x402_verified": bool,
        "major_cex_listed": bool,
        "liquidity_dropping": bool,
        "team_inactive": bool,
        "recent_dump": bool,
        "suspicious_volume": bool,
        "x402_blocked": bool,
    },
    "dflow": {
        "routes_available": int,
        "slippage_quality": str,        # "excellent"/"good"/"poor"
    },
}
```

## Output Schema

```python
{
    "contract_address": str,
    "chain": str,
    "name": str,
    "symbol": str,
    "total_score": int,                 # 0-100, clamped
    "breakdown": {
        "liquidity": int,               # 0-30
        "volume": int,                  # 0-25
        "age": int,                     # 0-15
        "community": int,              # 0-15
        "safety": int,                  # 0-15
    },
    "catalysts": {
        "bonus": int,
        "applied": ["str"],             # ["+viral", "-cex", ...]
    },
    "dflow_modifier": int,              # +13, 0, or -8
    "status": str,                      # "HOT"/"QUALIFIED"/"WATCH"/"SKIP"
    "recommendation": str,              # "PIPELINE"/"WATCH"/"SKIP"
    "auto_rejected": bool,
    "reject_reason": str | None,
}
```

## Scoring Thresholds

### Liquidity (0-30 points)

| Level | Min USD | Points |
|-------|---------|--------|
| Excellent | $500K | 30 |
| Good | $250K | 22 |
| Fair | $100K | 15 |
| Poor | $50K | 8 |
| None | $0 | 0 |

### Volume 24h (0-25 points)

| Level | Min USD | Points |
|-------|---------|--------|
| Excellent | $1M | 25 |
| Good | $500K | 18 |
| Fair | $100K | 12 |
| Poor | $50K | 6 |
| None | $0 | 0 |

### Age (0-15 points)

| Range | Points |
|-------|--------|
| 7-30 days (optimal) | 15 |
| 3-7 days (new but stable) | 10 |
| 30-90 days (mature) | 10 |
| >90 days (too old) | 5 |
| <2 days (too new) | 0 |
| None/missing | 0 |

### Community (0-15 points)

Weighted sum: twitter(0.3) + telegram(0.3) + discord(0.2) + engagement(0.2). Each factor scores proportionally vs threshold (10K twitter, 5K telegram, 3K discord, 5% engagement), capped at its weight * 15.

### Contract Safety (0-15 points)

3 points each: verified_source, no_honeypot, renounced_ownership, locked_liquidity, audit_report.

### DFlow Modifier

- 3+ routes AND "excellent" slippage: +13
- "poor" slippage: -8
- Otherwise: 0

### Catalysts

Bonuses: hackathon_winner(+10), viral_moment(+10), kol_mention(+10), aixbt_high_conviction(+10), dexscreener_trending(+5), x402_verified(+5).

Penalties: x402_blocked(-20), major_cex_listed(-15), liquidity_dropping(-15), team_inactive(-15), recent_dump(-15), suspicious_volume(-10).

### Auto-Reject Criteria

- liquidity < $100K
- age < 2 hours (age_days < 0.083)
- volume_24h / mcap > 10x (when mcap > 0)

Auto-rejected tokens get score=0, status=SKIP, recommendation=SKIP.

### Status Thresholds

| Score | Status | Recommendation |
|-------|--------|----------------|
| 85-100 | HOT | PIPELINE |
| 70-84 | QUALIFIED | PIPELINE |
| 50-69 | WATCH | WATCH |
| 0-49 | SKIP | SKIP |

## Data Flow

```
execute(params={"token_data": {...}})
  -> _check_auto_reject(token_data)
     -> if rejected: log decision, return early with score=0, SKIP
  -> _score_liquidity(token_data["liquidity"])
  -> _score_volume(token_data["volume_24h"])
  -> _score_age(token_data.get("age_days"))
  -> _score_community(token_data.get("socials", {}))
  -> _score_safety(token_data.get("contract", {}))
  -> sum breakdown = base_score
  -> _apply_catalysts(token_data.get("catalysts", {}))
  -> _apply_dflow(token_data.get("dflow", {}))
  -> total = clamp(base + catalyst_bonus + dflow_mod, 0, 100)
  -> _get_status(total)
  -> _get_recommendation(status)
  -> log_event("observation", f"Scored {symbol}: {total} ({status})")
  -> write_scratchpad(f"score_{contract_address}", result)
  -> return result
```

## Error Handling

- Missing fields default to 0/empty — no exceptions for incomplete data
- Auto-reject returns early with full result structure
- execute() always returns a result, never raises

## What's Not Included (YAGNI)

- No batch scoring (call execute() per token)
- No config file loading (hardcoded constants)
- No grade letters (status labels only)
- No historical score tracking (scratchpad overwrites)
- No weighted scoring profiles (fixed weights)

## Dependencies

- BaseAgent from src/agents/base_agent.py
- No external packages needed
