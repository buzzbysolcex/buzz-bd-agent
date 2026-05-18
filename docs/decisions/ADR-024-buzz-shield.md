# ADR-024: Buzz Shield — Agent Security Intelligence

## Status: Accepted

## Date: 2026-04-05

## Context

250,000+ AI agents on-chain. $45M+ drained in 2026. Google DeepMind published 6 categories
of AI agent attacks (Apr 1, 2026). Anthropic warned agents can exploit contracts autonomously.
Claw Wallet launched Apr 2 as first "B2A" wallet. Nobody builds the intelligence layer between
agent and action.

The axios npm supply chain compromise (GHSA-fw8c-xr5c-95f9, March 31 2026) hit our CI/CD
runners — validating the need for pre-action security intelligence.

## Decision

Build Buzz Shield as a new module (api/services/shield/):

- **Program Risk Scorer** — 0-100 scoring for Solana programs (verified, immutable, age, deployer)
- **Drain Pattern Library** — 20 initial patterns from DeepMind, Blockaid, Blowfish, on-chain analysis
- **Verdict Engine** — SAFE/CAUTION/WARNING/DANGER from combined scores
- **Free Tier** — 4 public endpoints (health, program, patterns, stats)
- **Paid Tier** — x402 scan, audit, forensics (Phase 2)
- **Integration** — Wallet Guard, MiroFish, PULSE, autoDream

## Architecture

- 5 new tables: shield_scans, drain_patterns, program_risk_cache, shield_reports, shield_stats
- 10 feature flags (all start FALSE)
- 6 endpoints (4 public + 2 admin)
- Registered as Service #23 in catalog
- Wired to PULSE health monitoring + autoDream pattern updates

## Build Phases

1. Foundation — tables, flags, free endpoints, 20 drain patterns (Apr 5-12)
2. Instruction Scanner — Solana tx parser, x402 scan endpoint (Apr 14-25)
3. Intelligence Layer — ATV, Helius, Wallet Guard, MiroFish (Apr 21 - May 2)
4. Frontier Demo — full flow for Colosseum submission (May 2-11)

## Consequences

- Buzz evolves from token scoring to agent security infrastructure
- New revenue stream ($0.01-$0.10/scan + $500/mo enterprise)
- Frontier differentiator (only submission protecting OTHER agents)
- Free tier builds community moat (more scans = better pattern detection)
- Partnership path: Claw Wallet, Blockaid, Solana Foundation
