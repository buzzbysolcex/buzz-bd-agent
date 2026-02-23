# SocialAgent Design

Layer 2 agent for social media research and community analysis. Runs in parallel with SafetyAgent and WalletAgent; their results merge before ScorerAgent (Layer 4).

## Decisions

| Decision | Answer |
|----------|--------|
| Pipeline position | Layer 2, parallel with SafetyAgent + WalletAgent |
| Architecture | Monolithic single-file agent (matches existing pattern) |
| Depth modes | 3 depths: quick (ATV only), standard (+Serper), deep (+Grok) |
| Grok/xAI API | OpenAI-compatible chat API, JSON mode for structured output |
| ATV Identity API | Real production API, GET batch-resolve, no auth (free tier) |
| Serper API | Real + rate-limited, POST with X-API-Key, 1-2 searches/token |
| LLM parsing | JSON mode with schema in prompt |
| Score mapping | Grok -> Twitter + Community, ATV -> Team Identity, Serper -> Web Reputation |

## Input

```python
params = {
    "project_name": str,         # Token/project name (e.g., "BONK")
    "token_address": str,        # Contract address
    "deployer_address": str,     # Deployer wallet (for ATV identity lookup)
    "chain": str,                # "solana" | "ethereum" | "base" | ...
    "depth": str,                # "quick" | "standard" | "deep" (default: "standard")
}
```

## Output

```python
{
    "project_name": str,
    "token_address": str,
    "chain": str,
    "depth": str,                 # actual depth used
    "social_score": int,          # 0-100
    "sentiment": str,             # "positive" | "neutral" | "negative" | "suspicious"
    "community_health": str,      # "A" | "B" | "C" | "D" | "F"
    "team_verified": bool,        # deployer has on-chain identity
    "breakdown": {
        "twitter": int,           # 0-30
        "community": int,         # 0-25
        "team_identity": int,     # 0-25
        "web_reputation": int,    # 0-20
    },
    "grok_analysis": {
        "sentiment": str,
        "follower_estimate": int,
        "engagement_level": str,  # "high" | "medium" | "low" | "none"
        "tweet_frequency": str,   # "active" | "moderate" | "dormant" | "none"
        "bot_suspicion": float,   # 0.0-1.0
        "summary": str,
        "available": bool,
    },
    "team_identity": {
        "ens_name": Optional[str],
        "has_ens": bool,
        "twitter_handle": Optional[str],
        "github_handle": Optional[str],
        "discord_handle": Optional[str],
        "identity_count": int,    # number of linked identities
        "available": bool,
    },
    "web_reputation": {
        "total_results": int,
        "positive_mentions": int,
        "negative_mentions": int,
        "scam_mentions": int,
        "news_sources": List[str],
        "available": bool,
    },
    "red_flags": List[str],
    "green_flags": List[str],
    "sources_used": List[str],
}
```

## Sentiment Thresholds

| Score | Sentiment | Community Health |
|-------|-----------|-----------------|
| 80-100 | positive | A |
| 60-79 | positive/neutral | B |
| 40-59 | neutral | C |
| 20-39 | negative | D |
| 0-19 | suspicious | F |

## Depth Mode Gating

| Method | Quick (<3s) | Standard (<10s) | Deep (<20s) |
|--------|:-----------:|:---------------:|:-----------:|
| _search_atv | ATV Identity | ATV Identity | ATV Identity |
| _search_serper | skip | Serper (1 query) | Serper (2 queries) |
| _search_grok | skip | skip | Grok xAI chat |

Skipped methods return `{"available": False, "score": 0}`. Their weight redistributes proportionally to methods that ran.

### Timeouts

| Depth | Per-source timeout | Total budget |
|-------|-------------------|-------------|
| quick | 3s | 5s |
| standard | 5s | 10s |
| deep | 10s | 20s |

## Scoring Engine

### Twitter Presence (0-30 pts) -- from Grok

| Condition | Points |
|-----------|--------|
| follower_estimate >= 50,000 | +12 |
| follower_estimate >= 10,000 | +8 |
| follower_estimate >= 1,000 | +4 |
| engagement_level == "high" | +8 |
| engagement_level == "medium" | +5 |
| tweet_frequency == "active" | +5 |
| tweet_frequency == "moderate" | +3 |
| bot_suspicion < 0.3 | +5 |

### Community Health (0-25 pts) -- from Grok

| Condition | Points |
|-----------|--------|
| sentiment == "positive" | +10 |
| sentiment == "neutral" | +5 |
| engagement_level in ("high", "medium") | +8 |
| tweet_frequency in ("active", "moderate") | +7 |

### Team Identity (0-25 pts) -- from ATV

| Condition | Points |
|-----------|--------|
| has_ens == True | +10 |
| Has Twitter handle | +5 |
| Has GitHub handle | +5 |
| Has Discord handle | +3 |
| identity_count >= 3 | +2 (bonus) |

### Web Reputation (0-20 pts) -- from Serper

| Condition | Points |
|-----------|--------|
| total_results >= 20 | +5 |
| total_results >= 5 | +3 |
| positive_mentions > negative_mentions | +5 |
| scam_mentions == 0 | +5 |
| Has news from known sources | +5 |
| scam_mentions >= 3 | -5 |
| negative_mentions > positive_mentions * 2 | -5 |

### Weight Redistribution

When methods are skipped: `social_score = round((raw_score / available_points) * 100)`, normalized to 0-100 regardless of depth.

## Red Flags

- `fake_engagement` -- Grok bot_suspicion > 0.7
- `bot_farm` -- Grok bot_suspicion > 0.9
- `no_social_presence` -- Grok returns no Twitter data and ATV has no identities
- `anonymous_team` -- ATV identity_count == 0 (no ENS, no linked socials)
- `negative_press` -- Serper negative_mentions > positive_mentions * 2
- `scam_reports` -- Serper scam_mentions >= 3
- `dormant_social` -- Grok tweet_frequency == "dormant"

## Green Flags

- `verified_team` -- ATV has_ens AND identity_count >= 2
- `active_community` -- Grok engagement_level in ("high", "medium") AND tweet_frequency == "active"
- `positive_sentiment` -- Grok sentiment == "positive"
- `established_presence` -- Grok follower_estimate >= 10,000
- `clean_reputation` -- Serper scam_mentions == 0 AND positive > negative
- `multi_platform` -- ATV identity_count >= 3 (ENS + Twitter + GitHub)

## API Integration

### Grok/xAI (deep only)

- `POST https://api.x.ai/v1/chat/completions`
- Auth: `Authorization: Bearer {XAI_API_KEY}`
- Model: `grok-3-mini`
- response_format: `{"type": "json_object"}`
- Prompt requests JSON with: sentiment, follower_estimate, engagement_level, tweet_frequency, bot_suspicion, red_flags, summary

### ATV Web3 Identity (all depths)

- `GET https://api.web3identity.com/api/ens/batch-resolve?addresses={deployer_address}&include=name,twitter,github,discord`
- Auth: None (free tier, 100 addresses/day)
- Returns: ENS name, Twitter handle, GitHub handle, Discord handle per address

### Serper (standard + deep)

- `POST https://google.serper.dev/search`
- Auth: `X-API-Key: {SERPER_API_KEY}`
- Standard: 1 query -- `"{project_name}" crypto token review`
- Deep: 2 queries -- above + `"{project_name}" crypto scam OR rug OR hack`
- Parse organic results: classify titles+snippets as positive/negative/scam via keyword matching

### Serper Keyword Classification

**Negative keywords:** scam, rug, rugpull, hack, exploit, fraud, ponzi, warning, avoid, fake
**Positive keywords:** review, legit, legitimate, growing, bullish, innovative, partnership, audit
**Scam-specific keywords:** scam, rug, rugpull, fraud, ponzi

## Error Handling

1. Per-source isolation -- each _search_* has own try/except
2. Graceful degradation -- failed source returns `{"available": False}`
3. All-sources-failed -- social_score: 0, sentiment: "suspicious", community_health: "F", red_flags: ["all_sources_failed"]
4. Event logging -- action/observation/error at every step
5. Never raise from execute() -- always return structured dict (top-level try/except)

## Testing (52 tests)

| Category | Count |
|----------|-------|
| Constructor & init | 3 |
| Input validation | 4 |
| Depth gating | 6 |
| _search_grok | 7 |
| _search_atv | 7 |
| _search_serper | 7 |
| _compute_verdict | 6 |
| Full execute() | 5 |
| Red/green flag detection | 4 |
| Sentiment & community health mapping | 3 |

All tests use pytest + pytest-asyncio + aioresponses + monkeypatch.
