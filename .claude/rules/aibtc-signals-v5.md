---
paths: ["**/signal*", "**/aibtc*", "**/correspondent*", "**/news*"]
---

# AIBTC Signal Filing Rules v5.0 — Supersedes v4.0 Genome Stack (D3, Apr 8, 2026)

> Strategic pivot locked Apr 7-8, 2026: beat editor target is **agent-skills** and **agent-economy**, NOT quantum. Rising Leviathan scout signal cited 24/7 availability + deterministic logging as our edge. Full strategy doc: `docs/AIBTC-SIGNAL-FACTORY-v5.md`.

## CORE RULES

- **File 4-6 quality signals per day.** Minimum 2 for streak protection.
- **Beat rotation:** `agent-skills` and `agent-economy` PRIMARY. Never 2 same-beat signals in one day.
- **Lead with the event**, not the data. News-style headline under 120 characters.
- **350-700 char body.** At least 1 verifiable source URL. Disclosure field mandatory.
- **Duplicate check before EVERY filing** (23% historical rejection rate — last 30 signals on beat + 60% keyword overlap = ABORT).
- **Streak protection:** emergency file by 16:00 UTC if `signals_today = 0`.
- **Direct filing at 06:02/07:03/08:02/09:03 UTC** via `signal-file-direct.js` (D1). No Claude Code dependency.
- **SolCex-internal data** (pipeline stats, scorer metrics, our own revenue) → Moltbook / Twitter, **NOT** AIBTC beats.
- **Phantom / ghost verification** BEFORE citing any token data (PIPPIN lesson — 0 DEX pairs = phantom).
- **Corrections:** 2 per month on lower-ranked agent factual errors (targeted at agent-skills and agent-economy beats).
- **Weekly Monday review:** inclusion rate, beat performance, rank delta, streak, sBTC earnings delta.

## CADENCE

```
Window 1 — 06:00-08:00 UTC (direct filing, autoDream-drafted)
  06:02  signal #1  (agent-skills or agent-economy, auto-rotated)
  07:03  signal #2
  08:02  signal #3
  09:03  signal #4

Window 2 — 12:00-14:00 UTC (opportunistic, Claude Code live)
  React to real-time events, GitHub PRs, protocol updates

Window 3 — 18:00-20:00 UTC (evening batch, War Room drafts)
  Pipeline / scoring / BD-related signals after Ogie approval
```

**AIBTC cooldown:** 60 minutes minimum between filings. Windows are spaced to clear.

## BEAT ROTATION

**PRIMARY (file daily):**

- `agent-skills` — BFF Skills competition, skills registry, new skill launches, MCP tool benchmarks
- `agent-economy` — x402 flows, payment infrastructure, marketplace activity, revenue data

**SECONDARY (file 2-3× per week):**

- `agent-trading` — token scoring, DEX data, algorithmic trading signals
- `infrastructure` — MCP updates, server architecture, deployment patterns
- `security` — BuzzShield patterns, supply chain attacks, audit data

**TERTIARY (file when relevant):**

- `deal-flow` — partnership signals, commercial activity
- `governance` — DAO proposals, protocol governance updates
- `bitcoin-macro` — only when we have unique BTC data (MiroFish sims, on-chain)

**AVOID (for now):**

- `quantum` — competition too strong (Elegant Orb 2,610 check-ins; Frosty Narwhal won editor seat Apr 7), not our domain
- `agent-social` — low strategic value for editor positioning
- `distribution` — not our strength
- `onboarding` — not our strength

**ROTATION RULE:** Never file 2 signals on the same beat in one day.
**EXCEPTION:** Breaking news + analysis angle (two distinct angles on same beat) is acceptable.

## QUALITY FRAMEWORK

**WHAT GETS APPROVED** (learn from history):

- ✅ Real verified data points (numbers, scores, timestamps, PR numbers, commit SHAs)
- ✅ Named sources (GitHub PRs, specific researchers, protocol versions, API endpoints)
- ✅ Actionable implications (what should operators do?)
- ✅ Unique angle (something only we can see from our pipeline / data)
- ✅ Fresh events (happened today or yesterday, not last week)

**WHAT GETS REJECTED** (learn from history):

- ❌ SolCex-internal data on AIBTC beats (our pipeline stats = not AIBTC network activity)
- ❌ Stale events repackaged as news (NIST Aug 2024, Google Willow Dec 2024, anything >7 days old)
- ❌ Self-referential signals (heartbeat / "Buzz filed signals" is not a signal)
- ❌ Skip notices ("nothing happened" is not a signal)
- ❌ ALL CAPS / hype vocabulary / unverified claims
- ❌ Phantom / ghost token data (PIPPIN lesson — verify before citing)

**SIGNAL BODY RULES:**

- 350-700 characters (sweet spot for brief inclusion)
- Lead with the EVENT, not the data (Trustless Indra tip)
- News-style headline: `[Entity] [Action Verb] [Thing] — [Number]`
- No brackets, no placeholders, no "TBD"
- At least 1 verifiable source URL
- Disclosure field: model + tools + verification method

## DUPLICATE PREVENTION (23% HISTORICAL REJECTION RATE)

Before every filing:

1. Query `aibtc_signals_filed` table for last 30 signals on target beat
2. Keyword scan: check headline words against existing headlines
3. If any overlap > 60% keyword match → **ABORT**, draft new angle
4. Check AIBTC front page: are similar signals already published today?
5. If duplicate detected: log `"DUP ABORT: <reason>"` and skip

**NEVER file if:**

- Same headline keywords as a signal filed in the last 7 days
- Same data source + same conclusion as an existing signal
- Same event covered from the same angle (find a different angle)

## STREAK PROTECTION PROTOCOL

**Streak is sacred.** Every missed day resets to 0.

Protection layers (deepest → shallowest):

1. autoDream generates 4 signal drafts nightly at 02:00 UTC and writes JSON to `/data/buzz-api/signal-drafts/`
2. Direct filing script fires at 06:02 UTC via host crontab → `morning-signals-v2.sh` (D1, no Claude Code dependency)
3. PULSE engine checks `signals_today` at every tick (60s)
4. If `signals_today == 0` AND time > 16:00 UTC → **EMERGENCY FILE**
5. Emergency signal uses safest available data (pipeline stats framed as agent-economy narrative, GitHub activity framed as agent-skills narrative)
6. Emergency beats: `agent-skills` or `agent-economy` only (highest approval rate)

**Streak reporting (daily to War Room):**

- Current streak day count
- Signals filed today / target
- Cooldown status
- Next scheduled signal time
- Rank change since yesterday

## CORRECTIONS STRATEGY (COMPETITIVE EDGE)

File 2 corrections per month on weak signals from lower-ranked agents.

- Only correct factual errors (wrong numbers, wrong dates, misattributed claims, expired sources)
- Never correct style or opinion
- Corrections build reputation with the publisher
- Target beats where we want editor position: `agent-skills`, `agent-economy`
- Corrections count toward signal total and engagement score

## CONTENT PIPELINES

**INTERNAL DATA SOURCES:**

- Pipeline stats — `curl localhost:3000/api/v1/pipeline/stats`
- Top scored tokens — `curl localhost:3000/api/v1/pipeline?min_score=70`
- BuzzShield patterns — `curl localhost:3000/api/v1/shield/patterns`
- AIBTC leaderboard — via MCP tools
- Signal filing history — `aibtc_signals_filed` table

**EXTERNAL DATA SOURCES (32 intel sources):**

- DexScreener API (trending, pairs, boosts)
- CoinGecko API (trending, categories)
- HeyAnon MCP (19 chains, 51 protocols)
- GitHub API (aibtcdev repos, BFF skills, protocol PRs)
- AIBTC front page via `news_front_page` MCP tool
- Nansen MCP (Intel Source #32)
- AIXBT momentum signals

**AIBTC-SPECIFIC SOURCES (highest approval rate):**

- GitHub `aibtcdev/*` repos (PRs, issues, releases)
- GitHub `BitflowFinance/bff-skills` (competition PRs)
- AIBTC skills registry changes
- AIBTC MCP server releases
- Network statistics (agent count, signals/day, beat activity)
- x402 protocol developments
- Beat editor announcements and auditions

## MOLTBOOK + TWITTER COORDINATION

**Too-internal for AIBTC** (pipeline data, SolCex metrics, our revenue) → Moltbook or Twitter, never AIBTC beats.

**AIBTC-relevant** (network activity, protocol updates, agent data) → AIBTC beat + optional condensed cross-post to Moltbook. NEVER duplicate exact content across platforms.

**Moltbook weekly schedule:**

| Day | Theme           | Submolt     |
| --- | --------------- | ----------- |
| Mon | Token deep dive | `m/crypto`  |
| Tue | Build log       | `m/builds`  |
| Wed | Architecture    | `m/agents`  |
| Thu | Article         | `m/crypto`  |
| Fri | Engagement      | `m/general` |
| Sat | Platform update | `m/builds`  |
| Sun | Weekly report   | `m/crypto`  |

Max 2 posts per day on Moltbook.

## REVENUE

- **30,000 sats per brief inclusion** (APPROVED ≠ INCLUDED; inclusion is the payout event)
- Approved signals that don't reach the daily brief earn 0
- Editor payout (when we win a beat editor seat): 175,000 sats/day per quantum reference rate
- Target: ≥40% of filed signals reach brief (historical baseline)

## SUMMARY

- 4-6 signals/day. `agent-skills` and `agent-economy` are primary.
- Direct filing at 06:02/07:03/08:02/09:03 UTC via D1 infrastructure.
- Dup check before every file. SolCex data routes to Moltbook.
- Streak protection is automatic down to emergency file at 16:00 UTC.
- Weekly Monday review in War Room.
- Full strategy: `docs/AIBTC-SIGNAL-FACTORY-v5.md`.

---

_AIBTC Signal Factory v5.0 | Supersedes v4.0 Genome Stack | Apr 8, 2026 directive package_
_Beat editor through excellence, not luck._
_Bismillah._
