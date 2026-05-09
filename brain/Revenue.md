# Revenue

## Truth (May 9): 239,500 sats AIBTC. First real bounty submission shipped + closed-by-triage same day. Confirmed -$100 net on Immunefi.

## Bounty Pipeline (live as of 2026-05-09 15:35Z, post-imu-77340 closure)

| Metric                                     | Value                                      |
| ------------------------------------------ | ------------------------------------------ |
| Outstanding bounty submissions (Immunefi)  | 0 (was 1; imu-77340 closed-by-triage)      |
| Outstanding bounty submissions (HackerOne) | 2 pending (Circle MALA + Circle ARC)       |
| Cumulative deposit cost                    | $100 (confirmed forfeited)                 |
| Cumulative payouts received                | $0                                         |
| Cumulative net                             | **-$100**                                  |
| First-in (Chief) submissions               | 1 (imu-77340 — closed)                     |
| Closed-by-triage (Immunefi)                | 1                                          |
| Dup-closed (HackerOne)                     | 4                                          |
| False submissions                          | 0                                          |
| Verdict-matrix savings (FPs caught)        | $300 (CHOREO/GOSSIP/RUNTIME re-audit)      |
| Calibration-error tuition                  | $100 (one — primitive-vs-exploit-chain)    |

### imu-77340 — Firedancer V1 Audit Comp ($500K pool) — CLOSED-BY-TRIAGE

- Title: HTTP framing + WS upgrade smuggling chain (waltz/http) — RFC 7230 §3.3.3 / RFC 6455 §4.2 non-conformance
- Severity claimed: MED, Chief Finding (first-in)
- Sub-findings: 6 (FD-HTTP-1/-2/-3/-4/-5/-7) all PoC-reproducible primitives
- Submitted: 2026-05-09 15:06 UTC
- **Closed: 2026-05-09 15:20 UTC** (14 minutes after submission)
- Triager: andrew (Immunefi staff)
- Outcome: **closed-by-triage** — primitive-only PoCs, no end-to-end exploit chain
- Triage critique (verbatim): "The PoC scripts send crafted HTTP requests but do not demonstrate actual request smuggling or queue-poisoning against a real Firedancer deployment — they only show that the server accepts certain non-conformant framing, not that a proxy-assisted attack chain produces the claimed impact. No evidence of attacker-controlled bytes reaching the GUI/RPC application before authentication is provided."
- Expected payout: p50 $6.5K, best-case $65K → **realized -$100**
- Calibration error: 65× best case
- Appeal/mediation: NOT available (triage-closed reports per Immunefi Audit Comp policy)
- Reopen probability: LOW (project discretion only)
- Next action: NONE on this report. Lessons captured into doctrine + detector spec.
- Loop 1 capture: `/data/buzz/persistent/buzz-api/learning/submissions/2026-05-09-firedancer-http-bundle.json`
- Ground truth Class K (defect): `/data/buzz/persistent/buzz-api/ground-truth/2026-05-09-firedancer-http-bundle.md`
- Ground truth Class L (calibration): `/data/buzz/persistent/buzz-api/ground-truth/2026-05-09-immunefi-primitive-vs-chain-calibration.md`
- Doctrine: `brain/Doctrine.md` Pre-Submission PoC Standard
- Rejection log: `/data/buzz/persistent/buzz-api/rejection-log.jsonl` rejection-001-imu-77340
- Detector spec queued: #128 PoC Type Classifier (branch poc-type-classifier-v1)

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
