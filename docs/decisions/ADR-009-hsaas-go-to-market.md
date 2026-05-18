# ADR-009: HSaaS (Honest Scoring as a Service) Go-to-Market

## Status: ACCEPTED (v2.0 — revised March 31, 2026)

## Date: March 30, 2026 (original) / March 31, 2026 (revision)

## Context

Buzz has 363 tokens in pipeline (66 scored honestly), 4 smart contracts on
Base mainnet, 31 intel sources across 19 chains, MiroFish running 1000-agent
swarm simulations (200 LLM + 800 heuristic) with Monte Carlo in 26ms, and
$200 signal revenue from AIBTC. The scoring engine proved its value when 11
tokens dropped from 85+ to below 50 after honest calibration.

Strategy sessions with Juno (ZHC Discord) on March 30-31 validated the
pricing model, introduced 3-tier audit pricing based on simulation resolution,
and confirmed the go-to-market sequence.

Server: Hetzner CPX62 (16 vCPU, 32GB RAM). MiroFish sidecar on port 5000.

## Decision

Launch HSaaS as the primary revenue product using a 3-tier audit model
based on simulation resolution:

**Free funnels:**

- Free Score funnel (buzzbd.ai/score) → paste address, get basic score
- Public leaderboard (buzzbd.ai/scores) → 363 tokens visible

**Paid audit tiers:**

- Quick Scan: $500 (100 agents) — indie devs, small teams
- Full Analysis: $1,500 (500 agents) — protocols seeking listing
- Swarm Audit: $2,500-3,000 (1000 agents) — exchanges, funds, serious protocols

**Subscriptions:**

- Professional: $200-400/mo — full 31-source scoring, API access
- Enterprise: $3-5K/mo — white-label, unlimited swarm sims

**Launch sequence:** 3 discounted pilot audits at $500 create case studies
that unlock the $1,500 and $2,500 tiers.

**Pricing philosophy (Juno):** "You're not charging for agents. You're
charging for resolution. 1000 agents catches failure modes 500 agents miss."

## Rationale

1. "11 tokens passed every other audit. We caught them anyway" — strongest case study
2. On-chain recording is the moat — no other audit firm can say "scores live forever"
3. Free Score funnel captures leads at zero marginal cost (rule-based, no LLM)
4. 3-tier audit pricing reflects simulation resolution, not just agent count
5. 1000-agent swarm at 26ms is a genuine differentiator — most can't run this fast at scale
6. Base airdrop hunters are a natural distribution channel
7. Factory Floor submission adds credibility (Juno is #2 on leaderboard)
8. Tom Osman bot-only channel (IZHC) provides direct distribution to ZHC community
9. Revenue stack: signals ($350) + swarm audit ($2,500) + full analysis ($1,500) + subs ($1,000) = $5,350/mo
10. The tech is already built — the blocker is case studies, not engineering

## Consequences

### New Endpoints:

- /api/v1/audit/request (Week 2)
- /api/v1/score/free/:address (Week 1)

### New Pages:

- buzzbd.ai/scores (public leaderboard, Week 1)
- buzzbd.ai/score (free score funnel, Week 1-2)

### New Tables:

- free_score_requests (lead tracking)

### New/Updated Files:

- .claude/skills/hsaas-go-to-market.md (v2.0)
- .claude/rules/tweet-on-score.md (v2.0)
- docs/references/juno-hsaas-strategy-session.md (v2.0 — both sessions)
- docs/decisions/009-hsaas-go-to-market.md (this file, v2.0)

### Pricing:

- Quick Scan: $500 (100 agents) — pilot price for first 3
- Full Analysis: $1,500 (500 agents) — base price after pilots
- Swarm Audit: $2,500-3,000 (1000 agents) — premium tier after case studies
- Subscription: $200-400/mo
- Enterprise: $3-5K/mo

### Targets:

- $1K/month in 4 weeks
- $5K/month in 8 weeks
- "Honest Calibration" badge as brand asset (shows simulation tier)

## Changelog

- v2.0 (Mar 31): 3-tier audit pricing (resolution-based), 1000-agent swarm, 363 tokens,
  CPX62, Factory Floor submitted, IZHC bot channel, Juno Session 2 quotes, updated revenue stack.
- v1.0 (Mar 30): Initial ADR from Juno Session 1. 50-agent sim, 256 tokens, single audit tier.
