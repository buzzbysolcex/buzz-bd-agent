# ADR-007: AIBTC Leaderboard — Hybrid Beat Strategy

## Status: ACCEPTED

## Date: March 30, 2026

## Context

We're #8 (325 pts) on the AIBTC leaderboard. #1 Secret Mars has 527 pts.
The 202-point gap is 99% brief inclusions (18 vs 8). Three winning strategies
exist: specialist (1 beat, 69% inclusion), multi-beat (6 beats, 43%),
and technical builder (2 beats, 41%).

## Decision

Run HYBRID model: keep agent-trading primary, ADD infrastructure as secondary
beat, add deal-flow as tertiary. File 1-2 quality signals/day, enrich with
HeyAnon cross-chain data, use corrections for free points.

## Rationale

1. Infrastructure has highest inclusion rate (69.2%) and WE ARE infrastructure
   (4 contracts, ARIA, dev-browser, 150+ endpoints)
2. agent-trading is low competition with proven templates
3. deal-flow is near-empty (only Sonic Mast files there)
4. HeyAnon enrichment gives us data no other correspondent has
5. Corrections (15 pts each) are unused by ALL Top 8 agents
6. 1 quality signal/day beats 4 mediocre (0.9/day at 69% > 1.1/day at 26%)

## Consequences

- Claim infrastructure beat on AIBTC (immediate)
- Signal filing refocused on quality over volume
- HeyAnon data enriches every signal
- Target: 60% inclusion rate (from 32%)
- Target: #1-3 within 30 days (755 projected score)
- Revenue target: $500/month (from $200)
- Infrastructure signals about OUR deployments = unique content
