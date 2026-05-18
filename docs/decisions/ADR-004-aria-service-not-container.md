# ADR-004: ARIA as Service Layer, Not Container Fleet

**Date:** March 29, 2026 (Sprint Day 41)
**Status:** Accepted
**Decision:** Deploy ARIA v2 as Express.js service module inside Buzz API, not as separate containers

**Context:**
Original ARIA vision (Day 8) planned 4-6 separate Akash dockers: EVM-Agent, BNB-Agent,
SOL-Agent, each feeding ARIA as central aggregator. This was overkill because DexScreener
API covers all chains and dev-browser replaces chain-specific data extraction.

**Decision:**

- ARIA = 4 JS modules in api/services/aria/
- 5 REST endpoints behind existing apiKeyAuth
- aria_tokens table in existing SQLite database
- Zero additional infrastructure cost

**Consequences:**

- Cost: $0 additional (was ~$15-20/mo for 4 additional containers)
- Maintenance: one codebase, one deploy (was 4 separate SDLs)
- Data sources: 29 API + 10 browser-scraped (more than the original 5 chain feeds)
- Simplicity: ah restart deploys everything (was 4 separate deploys)
