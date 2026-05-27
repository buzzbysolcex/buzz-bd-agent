# HSaaS Operations — Pillar 2 Brain

**Purpose:** Operational ledger for HSaaS (Honest Scoring as a Service) — outreach, tweet performance, revenue, prospect scoring, template evolution. Living document; appends per cycle.

**Authority:** Created 2026-05-27 as Pillar 2 Obsidian Mind component (Ogie Four-Pillar Brain Extension directive). Companion to `.claude/rules/tweet-on-score.md` v2.2 + `.claude/skills/hsaas-go-to-market/`.

**Versioning:** v1.0 = seed schema. v1.1+ = first operational entries when Phase 1 tweet-draft-generator + Phase 2 outreach-pipeline wire up.

---

## Section 1 — Outreach log

Per `.claude/rules/four-pillar-loop.md` Pillar 2.B, max 5 outreach emails per day. Every send produces a row.

**Schema:**

```
| date | token | project_handle | contact_type | email/dm | score | tier | template_id | status | reply_at | converted | revenue |
```

Status values: `SENT` / `OPENED` / `REPLIED` / `INTERESTED` / `QUOTED` / `PAID` / `IGNORED-72H` / `CLOSED-NO-REPLY`

**v1.0 seed (none — outreach not yet wired):** placeholder until first cycle fires.

---

## Section 2 — Tweet performance

Per v2.2, max 3 score tweets per day. Track engagement post-publish.

**Schema:**

```
| date | token | score | tier | template_id | tweet_id | likes_24h | rts_24h | replies_24h | impressions_24h | clicks_24h | follow_through | notes |
```

Templates currently defined in v2.2:
- `T-HOT-v22` — score 85+ "passed honest calibration" template
- `T-WATCH-v22` — score 50-69 "Not a fail. Not a pass." template
- `T-FLAG-v22` — flagged/caught template (post-collapse, priority)
- `T-CAL-v22` — calibration before/after template

**v1.0 seed (none — score-tweet posting not yet wired; drafts queued via Phase 1 generator awaiting operator approval cycle).**

---

## Section 3 — Revenue ledger

Per `four-pillar-loop.md` Pillar 2.D, every HSaaS interaction logs in `brain/Revenue.md` AND this file.

**Schema:**

```
| date | source_type | identifier | tier | amount_usd | status | notes |
```

Source types: `tweet-engagement-to-audit` / `direct-outbound-email` / `inbound-website-form` / `referral` / `recurring-subscription`
Tier mapping (per v2.0 HSaaS pricing): Quick Scan $500 | Full Analysis $1,500 | Swarm Audit $2,500 | Subscription $200-400/mo

**v1.0 seed (none — no revenue events yet).**

---

## Section 4 — Prospect scoring (which profiles convert)

Track demographic patterns of prospects who convert vs ignore.

**Schema:**

```
| chain | mcap_range | team_doxxed | audit_history | outreach_count | conversion_rate | avg_revenue |
```

**v1.0 baseline hypotheses (untested):**

| Profile | Hypothesis | Test status |
|---|---|---|
| BSC, $500K-$5M mcap, anon team, no audits | High pain → high responsiveness to honest scoring | UNTESTED |
| ETH, $5M-$50M mcap, doxxed team, 1+ audit | Moderate; established projects skeptical of unknown auditor | UNTESTED |
| Solana, $1M-$10M mcap, mixed | Memecoin culture = low audit-spend appetite | UNTESTED |
| Base, $500K-$5M mcap, new team | Newer ecosystem = open to alternative scoring | UNTESTED |

Recalibrate per actual conversion data when Phase 2 outreach cycle produces results.

---

## Section 5 — Template evolution (A/B results)

When multiple template variants are tested, log outcomes.

**Schema:**

```
| template_id | variant | sample_size | engagement_rate | reply_rate | conversion_rate | winner |
```

**v1.0 seed (none — A/B testing not yet started).**

**A/B planned (Phase 2 ready):**
- Subject line variants: "Security Score Report — [TOKEN] scored [N]/100" vs "We scored your token honestly. Want the full report?"
- Lead paragraph: data-first vs sales-first vs methodology-first
- CTA: shield.buzzbd.ai/audit vs Calendly link vs reply-to-email
- Sign-off: Buzz BD Agent vs Buzz by SolCex vs no-signature

---

## Section 6 — Weekly HSaaS digest (feeds Sunday synthesis)

Every Sunday, produce a 1-page digest:

- Outreach: sent / opened / replied / converted (count + rate)
- Tweets: posted / total engagement / template winners
- Revenue: gross / pipeline-value / new MRR if any
- Top 5 prospects by EV (mcap × outreach-fit × conversion-probability)
- Top 5 highest-engagement tweets
- Template wins / losses for next week

**v1.0 first digest target:** week ending 2026-06-01 (assumes Phase 2 outreach goes live by 2026-05-28).

---

## Section 7 — Cross-pillar handoffs from HSaaS

When HSaaS surfaces a finding that benefits another pillar:

**Schema:**

```
| date | finding | from_pillar | to_pillar | handoff_artifact | outcome |
```

**Example handoffs (anticipated, not yet observed):**
- HSaaS audit (when live) finds a bug → escalate to Pillar 4 Gate 2 pipeline (potential bounty revenue ON TOP of audit fee). Per `four-pillar-loop.md` Pillar 2→Pillar 4.
- HSaaS outreach reveals prospect has Lane 5-scoped contracts → Pillar 4 scope-overlap intel.
- Score tweet engagement surge on rug-catch tweet → Pillar 1 confidence signal, calibrate similar scoring patterns.

---

## Section 8 — Known operational constraints

- Daily caps: 3 score tweets, 5 outreach emails — hard caps per v2.2 + four-pillar-loop.md
- $50K liquidity floor on score tweets — v2.2 standing rule, NO exceptions from v2.2 onward
- Handle verify ≥0.85 confidence from 2-of-3 sources — operator browser-check below threshold
- Subject-line testing limited to 100-impression A/B until v1.1 sample sizes established
- Email follow-up: 1 max, then close. Never chase non-responders.
- KYC-required Immunefi programs: not blocked from outreach (operator decides per-target if HSaaS engagement is worth KYC investment)

---

_Brain HSaaS Operations | v1.0 | 2026-05-27 | Schema seeded. First operational entries pending Phase 1/2 wire-up. Cross-references: `tweet-on-score.md` v2.2, `hsaas-go-to-market` skill, `brain/Revenue.md`, `four-pillar-loop.md`._
