# Rule: WebFetch/Search Summary Exploit-Direction Is Always [ASSUMED]

> Applies when: any Gate-1 / Gate-2 source-read uses WebFetch, WebSearch, or any LLM-summarized fetch of contract source, and the summary asserts an exploit / arbitrage / over-mint / over-withdraw DIRECTION.
> Authority: Ogie msg 8008 (2026-05-29). Promoted from a Doctrine #41 sub-note to a standing rule after **3 same-session direction-errors**.

---

## THE RULE

**WebFetch / search summaries assert exploit DIRECTION unreliably.** The summarizing model pattern-matches surface cues — "donation + cached value", "stale rate", "nonce-only ordering", "no freshness check" — into a vulnerability claim **without checking which way the arithmetic actually breaks**. It will confidently say "donation → over-mint" when the real direction is "donation → conservative under-mint."

Therefore:

1. **A summary's claimed exploit direction is ALWAYS `[ASSUMED]`** — never `[INSPECTED]`, never `[EXECUTED]` — until the arithmetic is traced by hand at the **action site** (the exact require/mint/redeem/transfer line, with the conserved quantity identified).
2. **NEVER let a summary's directional claim seed a Foundry build.** Trace the math first; confirm WHICH PARTY the asymmetry favors and WHETHER it crosses a profitability/collateral threshold; THEN build a PoC only if the direction survives the trace.
3. A summary "CONFIRMED RISK" / "exploitable" verdict is a HYPOTHESIS to disprove, not a finding to bank.

## THE TWO-SIDED ERROR (brain symmetry — Ogie msg 8008)

Two opposite failure modes, ONE fix:

| Side               | Failure                                                                                                  | Source                      | Correction                                                                                                                       |
| ------------------ | -------------------------------------------------------------------------------------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Over-assertion** | Summary layer OVER-asserts exploit direction (pattern-matches a vuln that isn't there / wrong direction) | WebFetch/search LLM summary | **THIS RULE** — direction is [ASSUMED] until traced at the action site                                                           |
| **Over-dismissal** | Human/agent instinct OVER-dismisses "boring" flags (assumes a flagged anomaly is benign)                 | Sectricity lesson           | anomaly-vs-vector distinction (PARKED) — don't dismiss an anomaly just because it looks boring; trace whether it's a real vector |

**The unifying fix: trace the actual arithmetic / chain. Trust neither the summary's assertion nor the instinct's dismissal.** This rule is the correction for the over-assertion side; the anomaly-vs-vector distinction is the correction for the over-dismissal side.

## ANCHORS (3 same-session direction-errors, 2026-05-29)

1. **Hyperlane Hyp-1** — WebFetch claimed "stale-low rate → fewer shares burned → over-redeem." Reality: stale-low rate → MORE shares per asset (denominator), bounded by holdings; message carries conserved SHARES. NEGATE. (`hunts/2026-05-29-hyperlane-hyp-1-gate2-foreclosure.md`)
2. **Lido V3 LazyOracle** — WebFetch claimed "donation → over-mint against stale low value." Reality: donation RAISES real balance while cached value lags → conservative UNDER-mint, + donations are quarantined. NEGATE. (`hunts/2026-05-29-lido-immunefi-gate1.md`)
3. _(prior session direction-error noted in the Doctrine #41 lineage.)_

## ENFORCEMENT

- Banking a WebFetch/summary directional exploit claim as `[INSPECTED]`/`[EXECUTED]` without an at-the-action-site arithmetic trace = violation.
- Dispatching a Foundry/Anchor PoC build on a summary's directional claim alone (no hand-trace) = violation (burns cycles on a likely NEGATE).
- Cross-reference: `brain/Doctrine.md` Doctrine #41 (Gate-1 PARTIAL-HIT requires Gate-2 positive/negative source-read); R8 Calibrated Reporting (`[ASSUMED]` tag discipline).

---

_Rule: webfetch-direction-error | v1.0 | 2026-05-29 (Ogie msg 8008 — promoted after 3 same-session direction-errors: Hyperlane Hyp-1 + Lido V3 + prior)_
