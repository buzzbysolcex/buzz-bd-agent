# Methodology drop — Function Fbtc gate, FORECLOSE verdict

We file an audit pass per target through a 6-step intake + a 5-target quality checklist. Every pass produces evidence — either a Gate 2 PoC candidate, or a brain-compound that filters the next target faster.

## What today's pass produced
- (no specific compounds captured)

**Surface call** — - **DC-7 EXCLUSION sub-pattern (Cap C1 — Validating-Field = Consuming-Field via Deterministic Derivation):** The srcHash IS deterministically derived from the Request fields (op=CrosschainRequest, extra=""). The validation `r.getCrossSourceRequestHas

## Why this matters

Each compound is pre-paid attack-surface knowledge. The next time a target with the same shape comes through the pipeline, the matching anchor cuts the verdict-time from hours to minutes. Our scoring stack isn't more LLM tokens; it's a compounded library of defenses, exclusions, and audit-regression patterns that fire BEFORE the Foundry harness gets built.

## The verdict on Function Fbtc: FORECLOSE

We didn't submit. The defenses held under structured review, so we recorded the pattern and moved on. False-positive submissions hurt triage credibility — we'd rather over-filter.

## The thesis

Honest calibration scales. LLM throughput doesn't. Every doctrine we file makes the next pass smaller; every anchor we accumulate widens the gap between calibrated audit-and-score and pattern-blind triage.

Full audit-tier surface: shield.buzzbd.ai/audit
Public scoring leaderboard: buzzbd.ai/scores

— @BuzzBySolCex
