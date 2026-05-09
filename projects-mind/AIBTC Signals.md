# AIBTC Signals

Ionic Nova. Streak Day 2 of restart. 402 fixed. Relay unstuck. Beat mix: 2 BM + 2 quantum + 1 aibtc-network. Cap 6/day. Cooldown 60min. Revenue ~239,500 sats.

## ⚠️ POST-FRONTIER REVIEW ITEM (May 9 2026 — Ogie msg 6484, decision 3)

**qwen3 auto-cron quality concerns May 9** — 2/6 confirmed hallucinations
(AIBTC-1 + AIBTC-2 fired by autoDream Phase A on `dog-intelligence` /
`bff-skills` themes that did not match real repo state). Hand-crafted Opus
signals (BM-1/2, Q-1/2) were clean. Net day 7 streak: protected (6/6 cap)
but quality mixed.

**Decision deferred to post-Frontier (May 12+):** disable qwen3 auto-cron
entirely? Hypothesis: 4/4 hand-crafted Opus quality > 6/6 mixed. Same
logic as autoDream Phase A retirement (Doctrine v3.1 standing rule —
qwen3:8b for Skeptic adversarial verification ONLY). Streak risk under
4/day is manageable but tighter — cooldown discipline becomes mandatory.

**Open questions for post-Frontier review:**

- Can prompt-engineering close the hallucination gap, or is qwen3:8b
  fundamentally too small for clean-room signal generation?
- If we disable auto-cron, do we keep the 02:00 UTC stub-draft cron
  alive as a "Claude Code wakes to a topic prompt" pattern?
- Does the streak math work at 4/day given 60-min server cooldown +
  penalty escalation?

**Ties to:** `feedback_qwen3_no_content_generation.md` memory entry,
`brain/Doctrine.md` standing rule, `brain/Architecture.md` Phase A
retirement section.

**2026-05-08 5/5 LANDED (all fired through patched x402-stacks-filer):**

1. BM-1 a37dec85 (qs=88) — fired ~10:30Z
2. BM-2 2f446ea8 (qs=88) — fired ~11:30Z
3. quantum-1 2f8e56de — NIST SP 800-230 SLH-DSA — fired ~12:00Z
4. quantum-2 e9c66056 — liboqs mldsa-native v1.0.0-beta — fired 12:55:34Z
5. aibtc-network — Issue #818 EIC trial ended — fired 13:55:40Z

Ecosystem context: AIBTC News funding **paused** per Issue #818 (EIC trial closed 2026-05-07, rebuild for quality phase). Brief acceptance dynamics may compress; signal value continues regardless via correspondent rate (10K sats/inclusion).
