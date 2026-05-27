# Content Playbook — Pillar 2 Brain

**Purpose:** Track which content formats produce traction across Twitter, Moltbook, and AIBTC signals. Living document; appends per publish + per engagement-window close.

**Authority:** Created 2026-05-27 as Pillar 2 Obsidian Mind component. Companion to `HSaaS-Operations.md` (revenue/outreach) + `tweet-on-score.md` v2.2 (publishing rules).

**Versioning:** v1.0 = format inventory + hypotheses. v1.1+ = engagement data + winner identification.

---

## Section 1 — Tweet format inventory

Tweet formats currently in active rotation (per `.claude/rules/tweet-on-score.md` v2.2):

| Format ID | Trigger | Body template | Visual | Hypothesis |
|---|---|---|---|---|
| T-HOT-v22 | Token scores 85+ | "passed honest calibration" + 1000-agent swarm framing | Score card with full address | Drives audit-tier upsell via shield.buzzbd.ai/audit |
| T-QUALIFIED-v22 | Token scores 70-84 | "Strong calibration. Worth your attention." | Score card | Lower friction; informational |
| T-WATCH-v22 | Token scores 50-69 | "Not a fail. Not a pass." | Score card | Engages curiosity; lower commitment ask |
| T-FLAG-v22 | Rug catch / post-collapse | "Our 1000-agent swarm predicted this" + basescan link | Signal alert template | Highest visibility; methodology proof |
| T-CAL-v22 | Score change ±15 pts | Before/after calibration | Score card | Demonstrates engine sensitivity |
| T-CONTENT-MOLT | Moltbook deep-dive | Long-form X thread or moltbook article | Hero image | Drives long-tail engagement |
| T-AIBTC-SIG | AIBTC signal repost | Beat-tagged signal body | Signal card | AIBTC network amplification |

**v1.0 winner-pending:** no engagement data yet; all formats untested.

---

## Section 2 — Moltbook post performance

Moltbook strategy lives at `brain/Moltbook-Strategy.md` (Mon-Sun submolt schedule, max 2 posts/day, signature `🐝 Buzz BD Agent | SolCex Exchange | @BuzzBySolCex`).

**Schema for tracking individual posts:**

```
| date | submolt | post_id | format | engagement_score | top_metric | notes |
```

**v1.0 seed:** placeholder — operational entries appended per publish + engagement-window-close.

**Known wins (from Indonesia Sprint Mar 2026 history, per `Moltbook-Strategy.md` restoration notes):** specific high-engagement posts identified but not yet ported to schema. Backfill TBD.

---

## Section 3 — AIBTC signal performance

AIBTC signals are filed per `.claude/rules/aibtc-bm-3source-standard.md` (3-source standard for BM beat) + signal-filing skill.

**Schema:**

```
| date | beat | signal_id | qs_score | acceptance | inclusion_count | correction_filed | sats_earned |
```

**v1.0 seed (from prior session history):**

- Day 6 DC strategy: 2 BM + 3 quantum + 1 aibtc-network per day, tags[0]=beat_slug, 10K sats/inclusion
- BM differentiation rule: must reference TWO layers (market+on-chain, on-chain+ecosystem, etc.)
- Streak preserved through Day 26 per `feedback_no_live_diagnostics.md` discipline

**Acceptance rate target:** improve from ~0.3% BM baseline by avoiding template-spam class entirely.

---

## Section 4 — Content calendar patterns

Per `brain/Moltbook-Strategy.md` Mon-Sun submolt schedule + 3-tweets-per-day cap + 5-emails-per-day cap.

**Daily slots (UTC):**
- 00:00-06:00: night-work window (token scoring, brain compounds, no public posts)
- 06:00-14:00: morning publish window (Moltbook submolt + 1 score tweet)
- 14:00-22:00: afternoon publish window (1-2 score tweets, BD outreach + AIBTC signals)
- 22:00-00:00: evening publish window (1 rug-catch / Moltbook follow-up)

**Best-time hypotheses (untested):**
- Score tweets: peak Twitter engagement 14:00-18:00 UTC (US market open + Asia evening)
- Moltbook posts: weekday 13:00-15:00 UTC for max impression window
- AIBTC signals: file before 14:00 UTC cutoff (per `aibtc-bm-3source-standard.md` QS target)

**v1.0 calibration:** untested. Recalibrate per actual impression/engagement data when available.

---

## Section 5 — Methodology threads (long-form)

Methodology threads (e.g., "How we caught X token's exit liquidity 48h before the dump") are the highest-leverage content type — they demonstrate the engine's value without giving away the rule logic.

**Topics in queue (v1.0):**
- Multi-anchor pattern demonstration (B-1 + P-1 → DC-13 promotion) — DRAFT pending operator approval to publish post-disclosure
- Self-Correction Layer architecture (Contradictions Register + Open-Questions Tracker + Weekly Synthesis) — operator approval needed
- Audit-dedup gate saving Foundry investment (Stader + Lista G2 foreclosure stories) — operator approval needed

**Publishing constraint:** Methodology threads can only reference Pillar 4 findings POST-DISCLOSURE. Pre-disclosure work stays internal.

---

## Section 6 — Cross-format synergy

When the same finding hits multiple formats, document the chain:

**Example chain (anticipated, not yet observed):**

1. Pillar 4 rug-catch detected (token scored 75, later exploited)
2. T-CAL-v22 tweet: "Before: 75/100 ✅ → After: 18/100 ❌ — caught by [N] penalty rules"
3. Moltbook submolt: methodology deep-dive on which rule caught it
4. AIBTC signal: cross-chain pattern detection
5. HSaaS outreach: reference the catch in subsequent emails ("we caught X, want a scan?")

**Schema:**

```
| chain_id | trigger_event | tweet_id | moltbook_post_id | aibtc_signal_id | hsaas_referral_count | total_engagement |
```

**v1.0 seed (none — first cross-format chain pending).**

---

## Section 7 — Negative-result tracking

Posts that flopped (low engagement, no clicks, no replies) are equally valuable for calibration.

**Schema:**

```
| date | format | post_id | metrics | hypothesis_for_flop | corrective_action |
```

**v1.0 seed (none yet).**

---

## Section 8 — Cross-pillar handoffs from content

When a content piece produces a finding for another pillar:

- High-engagement score tweet → adjust Pillar 1 weight for that scoring rule (engagement correlates with rule "felt accuracy")
- Rug-catch tweet engagement spike → Pillar 4 reference anchor for similar future cases
- HSaaS outreach mentions a previously-tweeted finding → re-publish in calibration thread if engagement was low first time

---

_Brain Content Playbook | v1.0 | 2026-05-27 | 8 sections seeded. Engagement data backfills when Phase 2 publishing pipeline goes live. Cross-references: `tweet-on-score.md` v2.2, `Moltbook-Strategy.md`, `aibtc-bm-3source-standard.md`, `HSaaS-Operations.md`._
