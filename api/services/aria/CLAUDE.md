# ARIA v2 — Autonomous Relay Intelligence Agent

ARIA is a SERVICE LAYER inside Buzz, NOT a separate container.
Original vision (Day 8) planned 4-6 Akash dockers. Replaced with lightweight Express modules.

## Architecture
- aria-discovery.js — Multi-source parallel scan (DexScreener, Jupiter, CoinGecko, Bags.fm, Colosseum)
- aria-normalizer.js — Unified token schema, dedup by chain+address
- aria-filter.js — BD Sweet Spot criteria ($500K-$50M MCap, >$100K liq, >7d age, no tier-1 CEX)
- aria-enricher.js — 6 parallel calls to Buzz raw endpoints (scan, safety, wallet, social, technical, scores)

## Endpoints (all behind apiKeyAuth)
- GET /aria/discover — trigger multi-source scan, persist to aria_tokens
- GET /aria/feed — latest candidates (?limit, ?chain, ?since)
- GET /aria/filter — BD Sweet Spot qualified only
- GET /aria/enrich/:address — deep enrich single token
- GET /aria/status — feed health, counts by source/chain

## Database
- aria_tokens table: auto-created, upsert on address+chain
- Full normalized JSON stored for lossless round-tripping

## Danger Zones
- Discovery sources have rate limits — don't parallelize more than 3 API calls
- Bags.fm tokens are mostly pre-graduation — filter for graduated only
- DexScreener boosts data changes frequently — cache for 1 hour max
