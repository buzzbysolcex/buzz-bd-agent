# ADR-006: HeyAnon MCP as ARIA Multi-Chain Backbone

## Status: ACCEPTED
## Date: March 30, 2026
## Context

ARIA v2 is deployed with 4 sources (DexScreener, CoinGecko, Bags.fm, Colosseum).
Pipeline covers primarily Solana with limited multi-chain data. AIBTC signal
inclusion rate is 32% — the #1 agent achieves 69.2% partly through richer data.

We evaluated standalone solutions (Hyperliquid MCP, individual chain RPCs)
vs aggregation layers (HeyAnon MCP, custom aggregator).

## Decision

Integrate HeyAnon MCP as Intel Source #30 — the ARIA multi-chain backbone.
One endpoint delivers 18 chains, 45+ protocols, 5 CEXs, 128 DeFi tools.

## Rationale

1. Fills EVERY gap ARIA needs: multi-chain prices, DeFi positions, CEX data,
   perps (Hyperliquid), bridging, token launches
2. MCP standard — no SDK, no wrapper, no maintenance burden
3. Free tier — $0 cost (vs $80/mo AIXBT, $35/mo Unusual Whales)
4. Enables AIBTC signal enrichment with cross-chain data nobody else has
5. One integration replaces 15+ individual chain integrations

## Consequences

- Intel Sources: 29 → 30
- Chains covered: ~3 → 18+
- New ARIA Depth Score (0-20 bonus points)
- New crons: #31 (price sync), #32 (perps scan), #33 (depth enrich)
- New endpoints: 6 (/api/v1/heyanon/*)
- SECURITY: READ-ONLY tools only. Never execute without CEO approval.
- API key stored in .env (HEYANON_API_KEY), never committed to GitHub
