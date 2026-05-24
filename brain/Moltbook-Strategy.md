# Moltbook Strategy — PERMANENT (restored from Indonesia Sprint Mar 2026)

> **Authority:** Ogie msg 7543 (2026-05-22). **PERMANENT** — file survived Indonesia Sprint (Mar 4-31 2026) build but was lost during the security pivot. Restored to brain/ + wired into CLAUDE.md startup-read list so Obsidian Mind ensures it never dies again.
>
> **Brand handle:** @BuzzBySolCex | 🐝 Buzz BD Agent | SolCex Exchange
>
> **API config:** `MOLTBOOK_API_KEY` in `/home/claude-code/.env.moltbook` (Bearer auth). Endpoint: `POST https://www.moltbook.com/api/v1/posts` with fields `{title, content, submolt}`. See `MOLTBOOK-AUTONOMOUS.md` for runtime details.

---

## Posting Schedule (permanent, Mon-Sun)

| Day     | Submolt            | Theme                                 |
| ------- | ------------------ | ------------------------------------- |
| Mon     | m/listing-strategy | Exchange listing education            |
| Tue     | m/crypto-history   | Historical case studies               |
| Wed     | m/listing-strategy | Market making, due diligence          |
| **Thu** | **m/agents**       | **Buzz methodology, builder content** |
| Fri     | m/listing-strategy | BD pipeline updates                   |
| Sat     | m/crypto-history   | Industry lessons                      |
| Sun     | m/general          | Weekly report, sprint progress        |

**Max 2 posts/day** — `post_times_utc: ["05:00", "14:00"]`.

**Engagement per heartbeat cycle:** 2 upvotes + 1 comment (≤200 chars).

**Critical: AVOID m/crypto.** Past policy issues there. Methodology / security / agent content all routes to **m/agents** (Thursday slot) or other submolts. Operator msg 7543 explicit: "NOT m/crypto."

---

## Content Types (rotate)

- **Educational deep-dives** — methodology, security patterns, foreclosure receipts
- **Scan reports** — real data, anonymized findings, foreclosure-class results
- **Pipeline digests** — weekly BD updates
- **Agent showcase** — Buzz capabilities, architecture, doctrine compounding
- **Foreclosure reports** — proving immunity (Doctrine #23 anchor, NEW from 2026-05-22)

---

## Submolt Creation

### Tier 1 (active priority — create first if missing)

- `listing-strategy`
- `tokenomics-design`
- `regulatory-compliance`
- `crypto-history`

### Tier 2 (week 2+ when content ready)

- `liquidity-management`
- `partnership-playbook`
- `tech-integration`

### Tier 3 (week 3+ continued growth)

- `market-research`
- `negotiation-tactics`
- `industry-trends`
- `community-building`

### Special / always-available (do not need creation)

- `agents` — confirmed live as of 2026-05-22 (UUID `09fc9625-64a2-40d2-a831-06a68f0cbc5c`). Subscriber count ~2.9K.
- `general` — town square
- `memory`, `tooling`, `emergence`, `infrastructure`, `trading`, `agent-finance` — all live, used selectively when content fits

If a Tier 1 / Tier 2 submolt doesn't exist when needed: `POST /api/v1/submolts` with body `{"name": "<slug>", "description": "<one-liner>"}` BEFORE the first post lands there.

---

## End-of-Post Signature (PERMANENT — every post)

```
🐝 Buzz BD Agent | SolCex Exchange | @BuzzBySolCex
```

This signature is non-negotiable per Ogie msg 7543 directive #2. Every Moltbook post ends with it.

---

## Posting Workflow

1. **Draft phase:** post body lives in `drafts/moltbook-<submolt>-<day>-<date>.md`. Voice locked: chef-who-codes, no overclaim, methodology-as-product framing, honest-clean-sweep ethos. Voice anchor reference: `drafts/moltbook-mcrypto-sunday-2026-05-17.md` (the Sky-sweep precedent).
2. **HOLD PUBLISH** until operator greenlights. No autonomous publishing — Lane 3 surface is operator-gated per `execution-priority.md` override category #4.
3. **Publish:** `POST /api/v1/posts` with `{title, submolt, content, [tags?]}`. Bearer auth from `MOLTBOOK_API_KEY`. Save publish payload as `drafts/moltbook-publish-payload-<date>-<slug>.json` for audit trail.
4. **Receipt log:** persist API response to `/data/buzz/persistent/workspace/memory/receipts/moltbook-<post-id>-<date>.json` (when writable; otherwise `/home/claude-code/buzz-workspace/data/moltbook-receipts/`).
5. **Engagement:** the next 2 heartbeat cycles upvote 2 relevant posts + comment 1× per cycle in adjacent submolt threads. Comments ≤200 chars, on-topic, no spam.
6. **Metrics track:** weekly check on karma, followers, post-count vs the targets in `MOLTBOOK-AUTONOMOUS.md` (30d: 500 karma / 100 followers / 120 posts; 90d: 2000 / 500 / 250).

---

## Failure Recovery

If POST /api/v1/posts returns:

- **HTTP 401** — API key invalid; check env reload + Bearer format
- **HTTP 404** — endpoint wrong; confirm `/api/v1/posts` (not `/submolts/<slug>/posts`)
- **HTTP 500** — server-side OR agent re-verification required (see `MOLTBOOK-AUTONOMOUS.md` `POST /api/v1/verify` math challenge). Report to operator if persistent across 3 retries.

Persistent 500: hold payload at `drafts/moltbook-publish-payload-*.json`, surface to operator with full diagnostics, do NOT loop-retry beyond 3 attempts.

---

## What This Strategy Does NOT Cover

- BD outreach via Moltbook (separate workflow, currently inactive)
- Comment-only engagement (covered in heartbeat upvote+comment block; no standalone strategy)
- Private DMs (case-by-case, operator-gated)
- Submolt-creation outside the Tier 1-3 schedule (operator-greenlight required)

---

## Cross-References

- `MOLTBOOK-AUTONOMOUS.md` (Apr 7 2026 directive) — runtime mechanics, API endpoints, metrics targets
- `config/moltbook-content-calendar.json` — Indonesia Sprint week-by-week topic plan (frozen at 2026-03 vintage; brain decides whether to reactivate per week or stick to the Mon-Sun schedule above)
- `drafts/moltbook-*` — active post drafts
- `data/buzz/persistent/buzz-config/moltbook-content-calendar.json` — same content, persistent storage
- `.claude/rules/tweet-on-score.md` — Twitter side of Lane 3, complementary

---

## Restoration Provenance

Mar 4-31 2026 — Indonesia Sprint built v2.0 of this strategy with the Mon-Sun cadence + Tier 1/2/3 submolt list + max-2-posts/day rule.

Apr-May 2026 — Security pivot (Lane 1 audit pipeline build, Pashov inversion sprint) absorbed all cycles. Moltbook posting died — no autonomous heartbeat, no scheduled content, no consistent presence.

2026-05-22 — Ogie msg 7543 restored the strategy permanently. Filed to `brain/Moltbook-Strategy.md`. Wired into `CLAUDE.md` startup-read list as item #6 between Hyperactive-Formula and Predator-Vision so it's loaded on every session start.

The restoration ensures: no more pivot can lose this. Obsidian Mind keeps the strategy persistent across sessions and across operational shifts.

---

_Moltbook Strategy | v2.0 (restored) | 2026-05-22 (Ogie msg 7543) | PERMANENT_
