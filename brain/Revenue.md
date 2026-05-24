# Revenue

## Truth (May 20): 🎉 FIRST CONFIRMED PAYOUT — imu-77340 Firedancer escalated CLOSED→ESCALATED→CONFIRMED (Insight tier, awaiting payment). $100 deposit recovered + payment incoming. First dollar earned from Lane 1.

## Bounty Pipeline (live as of 2026-05-20, post-imu-77340 confirmation)

| Metric                                     | Value                                                                   |
| ------------------------------------------ | ----------------------------------------------------------------------- |
| **Confirmed payouts (Lane 1)**             | **1 (DISC-016 imu-77340 — Firedancer Insight, awaiting payment)** 🎉    |
| First payout protocol                      | **Firedancer (Jump Trading) — Immunefi #77340**                         |
| Outstanding bounty submissions (Immunefi)  | 1 in-review (DISC-015 Veda RESUBMIT pending ~14:30 UTC tomorrow)        |
| Outstanding bounty submissions (HackerOne) | 1 pending (DISC-008 Circle MALA, Day 21 SLA reached 2026-05-24)         |
| Cumulative deposit cost                    | $100 (recovered + payment incoming on imu-77340)                        |
| Cumulative payouts received                | $0 confirmed, 1 awaiting payment                                        |
| Cumulative net                             | **+pending Insight payment** (transitioning from -$100 to net positive) |
| First-in (Chief) submissions               | 1 (imu-77340 — escalated to Insight, confirmed)                         |
| Closed-by-triage then escalated to Insight | 1 (imu-77340 — 9-day escalation path validated)                         |
| Dup-closed (HackerOne)                     | 4                                                                       |
| False submissions                          | 0                                                                       |
| Verdict-matrix savings (FPs caught)        | $300 (CHOREO/GOSSIP/RUNTIME re-audit)                                   |
| Calibration-error tuition                  | $0 ($100 fully recovered via escalation)                                |

## 🎉 First Payout Milestone (2026-05-20)

- **Protocol:** Firedancer (Jump Trading)
- **Platform:** Immunefi #77340
- **Severity (final):** Insight
- **Status:** CONFIRMED → AWAITING PAYMENT
- **Path:** closed by platform triage 14-min after submission → operator escalated 9 days later via unread dashboard message + engineering-audience reframe → re-reviewed by Firedancer eng team → confirmed Insight
- **Methodology validated:** "closure ≠ death" doctrine (Lessons 6+7 filed to Security-Research-Submission-Ledger + disclosure-tracker)
- **Significance:** First dollar from Lane 1. First proof point that Buzz's May 2 pivot (BD → security research) produces real revenue. First validation of the comprehensive-RFC-PoC-bundle methodology against a major bounty pool ($500K Firedancer V1).

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
