# Revenue

## Truth (May 9): 239,500 sats AIBTC + first real bounty submission shipped today.

## Bounty Pipeline (live as of 2026-05-09 15:10Z, post-Firedancer ship)

| Metric                              | Value                                 |
| ----------------------------------- | ------------------------------------- |
| Outstanding bounty submissions      | 1 (imu-77340)                         |
| Cumulative deposit cost             | $100                                  |
| Cumulative payouts received         | $0                                    |
| Cumulative net                      | -$100 (until first payout lands)      |
| First-in (Chief) submissions        | 1                                     |
| False submissions                   | 0                                     |
| Verdict-matrix savings (FPs caught) | $300 (CHOREO/GOSSIP/RUNTIME re-audit) |

### imu-77340 — Firedancer V1 Audit Comp ($500K pool)

- Title: HTTP framing + WS upgrade smuggling chain (waltz/http) — RFC 7230 §3.3.3 / RFC 6455 §4.2 non-conformance
- Severity claimed: MED, Chief Finding (first-in)
- Sub-findings: 6 (FD-HTTP-1/-2/-3/-4/-5/-7) all PoC-reproducible
- Submitted: 2026-05-09 ~15:06 UTC
- Status: reported (review pending)
- Expected payout: p50 $6.5K, best-case $65K
- Disclosure window: 90 days (public-eligible 2026-08-07)
- Next watchdog check: 2026-05-11 15:00Z
- Loop 1 capture: `/data/buzz/persistent/buzz-api/learning/submissions/2026-05-09-firedancer-http-bundle.json`
- Ground truth Class K: `/data/buzz/persistent/buzz-api/ground-truth/2026-05-09-firedancer-http-bundle.md`

## Other Pipeline (pending decisions)

- Circle MALA HO-3710185 — IN REVIEW (validation/reproduction phase, ~3 days). Closest active to confirmed payout.
- Circle ARC HO-3710465 — pending triage (~3 days).
- Drift VAULTS-001 + ORACLE-001 — email sent 2026-05-03, no reply Day 6. Decision needed: DM @cindyleowtt OR escalate to Immunefi.
- Sui DISC-002 — blocked at HackenProof rep 80/100. Aurora Web $100K queued as rep-builder.

## Active legacy revenue

- AIBTC signals (~239,500 sats all-time, Day 7 streak today 6/6)
- x402 endpoints (6 endpoints, no buyers yet)
- Flying Whale (600 sats/query)

## Best path

Bug bounties. See [[Bug Bounty Genius Plan]] + [[Master Strategy]].

## HSaaS

$500-$7500. V6: Free/Pro $49/Enterprise.

## Significance of imu-77340

First concrete proof point that the May 2 BD-agent → security-research pivot has produced a credible, novel, first-in submission to a major pool. Pipeline-quality moat preserved (3 false positives caught in same target via Phase 4d re-audit). Honest verdict discipline > fast submission.

_Updated 2026-05-09 15:11Z (Ogie msg 6500-6501)._
