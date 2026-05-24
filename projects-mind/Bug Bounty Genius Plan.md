# Bug Bounty Genius Plan — COMPLETE

| #   | Priority              | Time | Status   | Dep |
| --- | --------------------- | ---- | -------- | --- |
| 1   | Auto-submit module    | 2-3h | COMPLETE | -   |
| 2   | Watchdog resurrection | 2h   | COMPLETE | -   |
| 3   | Consensus integration | 1h   | COMPLETE | -   |
| 4   | Contest monitor fixes | 2h   | COMPLETE | -   |
| 5   | Target scorer         | 3h   | COMPLETE | -   |
| 6   | Writeup miner Phase A | 2h   | COMPLETE | -   |
| 7   | Auto-PoC generator    | 4h   | COMPLETE | P1  |
| 8   | Report templates      | 3h   | COMPLETE | P7  |
| 9   | Speed optimization    | 3h   | COMPLETE | P3  |
| 10  | Outcome tracker       | 1h   | COMPLETE | P1  |
| 11  | Rejection log         | 30m  | COMPLETE | P5  |
| 12  | Intel feedback loop   | 2h   | COMPLETE | P6  |

P1: Auto-submit tiers (AUTO >0.9/free/Med, 1HR 0.7-0.9/High, OGIE GATE Crit/deposit/<0.7) — 477 LOC
P2: Watchdog cron _/15, expanded 17→30→34 repos (incl 4 Anthropic per msg 6287) — 345 LOC
P3: consensus.js wired between L1b-L4, <0.5 dismiss / >0.8 fast-track — 58 LOC delta
P4: Cantina parser fixed (5→142), Sherlock fixed (0→2 floor), Codehawks added (35), delta-alert >10% — v1.1
P5: 892 programs scored 0-60 daily 05:00 UTC, top-5 War Room — 363 LOC
P6: 3 no-auth sources enabled (daily-bb / awesome-bb / rekt.news), Pattern A-J classifier, daily 04:00 UTC — 663 LOC
P7: Foundry / Anchor / Go runnable PoCs, DeFiLlama TVL impact calc — 874 LOC
P8: 6 platform templates + Pattern→CWE map + 19-entry fix library + AI-sanitization — 561 LOC reporter
P9: **Watchdog Triage Mode** (legacy speedrunner ~4s, retained ONLY for 15-min commit-diff watchdog cron — NOT for audit targets) + standard 11.5min + deep ~52min, L1+L1b parallel, Skeptic --workers 4 — 195 LOC delta. Audit modes are STANDARD or DEEP, **default DEEP**. **Speedrunner RETIRED for bounty audits per Ogie msg 6410 (May 9 2026, PERMANENT — Percolator rule made permanent after Toly's PR #79 review).** audit-methodology v2.5.
P10: Outcome tracker JSONL ledger + getProgramScoreBoost hook into P5 — 396 LOC
P11: Rejection log JSONL + EV calc + War Room flag for EV>$500 — 294 LOC
P12: writeup-miner-feed → unified-findings (W._ filtered), conservative variant proposals — 468 LOC

All 12 shipped May 7-8 2026. ~5,037 LOC. 6 crons installed. audit-methodology rule at v2.3. Pipeline fully autonomous: 9 layers + L3 consensus + 3 speed tiers + auto-submit + auto-PoC + outcome boost.

Anthropic added (msg 6273 + 6287): always_ogie_gate=true, requires_human_rewrite=true, target_score_override=45, 4 GitHub repos in watchdog, recon-only mode (4 phases, no probes until Ogie authorizes).

Next: scan Sky deep mode (Immunefi, 60/60 score, $10M bounty, free submission). Awaiting Ogie call.
