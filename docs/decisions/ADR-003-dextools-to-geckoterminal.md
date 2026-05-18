# ADR-003: DexTools to GeckoTerminal

**Date:** March 29, 2026 (Sprint Day 41)
**Status:** Accepted
**Decision:** Replace DexTools with GeckoTerminal as Tier 1 source for circulating MCap

**Context:**
DexTools has no free API. dev-browser scraping attempts blocked by Cloudflare
anti-bot protection from Hetzner datacenter IP.

**Decision:**

- GeckoTerminal API (api.geckoterminal.com/api/v2/) as replacement
- Free, no Cloudflare blocking, returns circulating supply + holder count + pool data
- dev-browser script: scripts/db-geckoterminal-scraper.js

**Consequences:**

- FDV gap calculation now works correctly (would have caught BANANAS31 at 99% gap)
- No Cloudflare workarounds needed
- Same data quality as DexTools for BD Screening purposes
- gt_score (trust score) is a bonus metric DexTools didn't provide
