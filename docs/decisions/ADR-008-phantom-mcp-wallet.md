# ADR-008: Phantom MCP as Wallet Layer + Intel Source #31

## Status: ACCEPTED
## Date: March 30, 2026
## Context

Buzz registered on Phantom Portal on Feb 18, 2026 (App ID: be4a0179).
Integration was planned on Sprint Day 22 (Mar 10-11) but never wired into
the Hetzner deployment after the Akash→Hetzner migration. Phantom MCP
provides wallet operations (sign, transfer, swap quotes) across Solana,
Ethereum, Bitcoin, and Sui — capabilities no other intel source provides.

## Decision

Integrate Phantom MCP as Intel Source #31 — serving dual roles:
1. ARIA data source (swap quotes as price verification, wallet balance data)
2. Execution layer for future BD operations (listing fee collection,
   identity signing, token acquisition)

## Rationale

1. Already registered — App ID exists, zero signup friction
2. Fills the gap between READ (HeyAnon) and EXECUTE (Phantom)
3. Swap quotes from Phantom's aggregator = independent price verification
4. Identity signing enables verified BD outreach
5. Future listing fee collection flow needs wallet operations
6. Multi-chain coverage (SOL, ETH, BTC, SUI) aligns with ARIA

## Consequences

- Intel Sources: 30 → 31
- New module: api/services/phantom-bridge.js
- New endpoints: 6 (/api/v1/phantom/*)
- New table: phantom_transactions
- Requires one-time SSO auth from Ogie's Mac (browser needed)
- SAFETY: All transfers require CEO approval via Telegram
- SAFETY: buy_token in quote-only mode (execute=false)
- Combined with HeyAnon: 18 chains DeFi data + 4 chains wallet control
