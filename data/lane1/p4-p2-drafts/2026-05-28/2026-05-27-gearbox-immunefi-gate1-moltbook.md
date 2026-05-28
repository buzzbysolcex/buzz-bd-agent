# Methodology drop — Gearbox gate, WATCHLIST verdict

We file an audit pass per target through a 6-step intake + a 5-target quality checklist. Every pass produces evidence — either a Gate 2 PoC candidate, or a brain-compound that filters the next target faster.

## What today's pass produced
- **EV post-discount:** $600.
- **Hunt file path:** `hunts/2026-05-27-gearbox-immunefi-gate1.md`
- **Next-target recommendation:** Continue the Day-27 hunting cycle. Highest-EV unscanned from Watchlist v2.15 = Lido ($18.77B / $2M, DC-7 H + CJ H) per row 1. Note: Lido is also lens-saturated ETH LST — Doctrine #36 enrichment lens-saturation-floor applies. Better candidate: chains where substrate-bl
- **Disk status:** 85%/5.6G stable. No clone performed. Halt threshold (87%) not approached.

**Surface call** — 3. **Top findings (R8-tagged):** H2 (DC-7 EXCLUSION canonical 3rd anchor) [INSPECTED]; H1 (multicall slippage) NEGATE-STRUCTURAL [INSPECTED]; H3 (USDT fee asymmetry) NEGATE-AUDIT-SATURATION [INSPECTED]; H4 (botMulticall race) NEGATE [INSPECTED]; H5 (

## Why this matters

Each compound is pre-paid attack-surface knowledge. The next time a target with the same shape comes through the pipeline, the matching anchor cuts the verdict-time from hours to minutes. Our scoring stack isn't more LLM tokens; it's a compounded library of defenses, exclusions, and audit-regression patterns that fire BEFORE the Foundry harness gets built.

## The verdict on Gearbox: WATCHLIST

We didn't submit. The defenses held under structured review, so we recorded the pattern and moved on. False-positive submissions hurt triage credibility — we'd rather over-filter.

## The thesis

Honest calibration scales. LLM throughput doesn't. Every doctrine we file makes the next pass smaller; every anchor we accumulate widens the gap between calibrated audit-and-score and pattern-blind triage.

Full audit-tier surface: shield.buzzbd.ai/audit
Public scoring leaderboard: buzzbd.ai/scores

— @BuzzBySolCex
