# ADR-009: HSaaS (Honest Scoring as a Service) Go-to-Market

## Status: ACCEPTED
## Date: March 30, 2026
## Context

Buzz has 256 tokens scored honestly, 4 smart contracts on Base, 31 intel
sources across 19 chains, and $200 signal revenue. The scoring engine
proved its value when 11 tokens dropped from 85+ to below 50 after honest
calibration. Strategy session with Juno (ZHC Discord) validated the
pricing model and go-to-market sequence.

## Decision

Launch HSaaS as the primary revenue product using a 4-tier model:
Free Score funnel → $500 pilot audits → $1,500 full audits → $200-500/mo subscriptions.
Lead with "proof, not opinion" positioning. Ship buzzbd.ai/scores
(public leaderboard) before the audit endpoint. 3 discounted pilot audits
create the case studies that unlock everything above.

## Rationale

1. "11 tokens passed every other audit. We caught them anyway" — strongest case study
2. On-chain recording is the moat — no other audit firm can say "scores live forever"
3. Free Score funnel captures leads at zero marginal cost (rule-based, no LLM)
4. Protocol audits at $1,500 is the differentiated product
5. Base airdrop hunters are a natural distribution channel
6. Revenue stack math: signals ($350) + audits ($1K) + subs ($2K) + API ($1.5K) = $4,850/mo
7. The tech is already built — the blocker is case studies, not engineering

## Consequences

- New endpoint: /api/v1/audit/request (Week 2)
- New endpoint: /api/v1/score/free/:address (Week 1)
- New page: buzzbd.ai/scores (public leaderboard, Week 1)
- New page: buzzbd.ai/score (free score funnel, Week 1-2)
- New table: free_score_requests (lead tracking)
- New rule: .claude/rules/tweet-on-score.md
- New skill: .claude/skills/hsaas-go-to-market.md
- Pricing: $500 pilot → $1,500 full → $200-500/mo subscription
- Target: $1K/month in 4 weeks, $5K/month in 8 weeks
- "Honest Calibration" badge as brand asset
