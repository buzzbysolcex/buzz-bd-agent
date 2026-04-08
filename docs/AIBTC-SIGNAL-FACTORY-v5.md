# AIBTC Signal Factory v5.0

> **Supersedes v4.0 Genome Stack.** Strategic pivot locked Apr 7-8, 2026 per Rising Leviathan scout signal + Apr 8 Ogie directive package.
>
> **Operational rules:** `.claude/rules/aibtc-signals-v5.md`
> **Filing infrastructure:** D1 direct filing path (scripts/signal-file-direct.js, scripts/morning-signals-v2.sh, scripts/signal-preflight.js)
> **Last revised:** 2026-04-08

---

## 1. IDENTITY

| Field        | Value                                                                                  |
| ------------ | -------------------------------------------------------------------------------------- |
| Display name | Ionic Nova                                                                             |
| Operator     | Buzz BD Agent (Claude Opus 4.6 Pro Max)                                                |
| BTC          | `bc1qsja6knydqxj0nxf05466zhu8qqedu8umxeagze`                                           |
| STX          | `SP24EH4DG99ZSSZY501BFH9Z4YTDJHC4B8X4K8BST`                                            |
| Profile      | https://aibtc.com/agents/bc1qsja6knydqxj0nxf05466zhu8qqedu8umxeagze                    |
| Host         | Hetzner CPX62 · tmux · 24/7 uptime                                                     |
| Stack        | 15 persistent agents · 105 tables · 298 API endpoints · 56 feature flags · 27 services |

## 2. CORE NUMBERS (updated 2026-04-08)

| Metric                 | Value                                                              |
| ---------------------- | ------------------------------------------------------------------ |
| Leaderboard rank       | #20 / 376 correspondents                                           |
| Current streak         | 5 days (locked Apr 8)                                              |
| Longest streak         | 10 days                                                            |
| Total signals filed    | 64+                                                                |
| sBTC balance           | 212,716 sats                                                       |
| Cumulative earnings    | ~200 USD (8 brief inclusions × 30,000 sats ≈ $25 each at $71K BTC) |
| Beats active           | agent-economy, agent-skills, quantum, infrastructure (4 of 12)     |
| Beat editor target     | agent-skills + agent-economy                                       |
| Signal revenue formula | `(brief_inclusions × 20) + (signals × 5) + (streak × 5)`           |

## 3. STRATEGIC PIVOT — THE 24/7 + DETERMINISTIC LOGGING EDGE

**Old target (Apr 4-7):** quantum beat editor seat.

**Why we pivoted:** Quantum competition is overwhelming.

- Elegant Orb (tearful-saw): 2,610 check-ins, zero missed cycles, caught live factual errors
- Serene Spring (IamHarrie-Labs): most operationally complete skill file submitted
- Prime Spoke: 11 corrections, deep data.json proximity
- Frosty Narwhal (@Iskander-Agent) WON the quantum seat on 2026-04-07 via the data.json proximity argument

Quantum is not our domain. The people who merge the Readiness Index PRs are the right editors for quantum signals. We do not.

**New target (Apr 7-8 onward):** `agent-skills` AND `agent-economy` beat editor seats.

### Why these beats are ours

Rising Leviathan's direct scout signal to Ionic Nova on 2026-04-07:

> _"For a future beat where 24/7 availability and deterministic logging are the primary editorial requirements, come back with a domain-specific audition."_

This is our edge:

1. **We BUILD agent skills.** Production skills shipped and running live: `token-scorer` (11-rule engine), `MiroFish v2` (10K-agent swarm simulation), `BuzzShield` (23 drain patterns + 47 crypto rules), `Wallet Guard` (3-state schema-frozen with AION), `Signal Factory` (7-beat genome stack). Every other agent-skills auditioner is a reviewer. Ionic Nova is a builder. The editorial bar for agent-skills is "does this skill actually do what it claims?" — a bar that only a builder can enforce deterministically.

2. **We OPERATE in agent-economy.** x402 payment infrastructure, Bankr CLI integration, AIBTC marketplace participation, 4 concrete revenue streams (signal earnings, Shield scans, Bankr fees, Moltbook engagement). We are not theorizing about the agent economy — we are running through it.

3. **We have deterministic logging.** `observation_log` table is append-only. Every PULSE tick, every signal action, every cron fire writes a row that is never mutated. 105 tables in production SQLite, all timestamped, all queryable, all replayable. HANDOVER.md auto-updates every 30 minutes. Rising Leviathan asked for audit trail — we are audit trail.

4. **We run 24/7.** Hetzner CPX62 + 15 persistent agents + health-check + memory-watchdog crons + PULSE tick every 60s + aibtc-heartbeat every 5 min. Uptime is infrastructure, not effort.

### Why NOT quantum, NOT social, NOT distribution, NOT onboarding

- **Quantum** — already won, and data.json proximity is not our moat
- **Agent-social** — low strategic value for our brand positioning
- **Distribution** — we are not a paperboy / brief distribution shop
- **Onboarding** — we are not in the Genesis / referral path

## 4. DAILY CADENCE

Target: **4-6 signals/day**. Minimum: **2 for streak**. Emergency: **file by 16:00 UTC if signals_today == 0**.

### Filing windows

**Window 1 — 06:00-08:00 UTC** (direct filing, D1 infrastructure)

- 4 signals staggered at :02 and :03 marks, 60 min apart to clear cooldown
- Drafts generated by autoDream Phase 6 at 02:00 UTC, written as JSON files to `/data/buzz-api/signal-drafts/`
- Filed automatically via `scripts/morning-signals-v2.sh` → `signal-preflight.js` → `signal-file-direct.js` → BIP-322 sign → AIBTC API POST
- **Zero dependency on Claude Code being awake.** Fires even if session is compacted, crashed, or not started

**Window 2 — 12:00-14:00 UTC** (opportunistic)

- Filed by Claude Code when an active session exists
- Reacts to real-time events — GitHub PRs, protocol updates, breaking news on primary beats

**Window 3 — 18:00-20:00 UTC** (evening batch, human-in-loop)

- War Room drafted signals, Ogie-approved before filing
- Best for pipeline / scoring / BD-adjacent signals that need extra scrutiny

### Cooldown

AIBTC enforces **60 minutes minimum between filings**. Windows are spaced to clear the cooldown. Preflight script checks the last filing timestamp and aborts if inside the cooldown window.

## 5. BEAT ROTATION

| Tier          | Beats                                                   | Frequency     | Focus                        |
| ------------- | ------------------------------------------------------- | ------------- | ---------------------------- |
| **PRIMARY**   | `agent-skills`, `agent-economy`                         | Daily         | Beat editor positioning      |
| **SECONDARY** | `agent-trading`, `infrastructure`, `security`           | 2-3× / week   | Reputation + cross-reference |
| **TERTIARY**  | `deal-flow`, `governance`, `bitcoin-macro`              | When relevant | Unique angles only           |
| **AVOID**     | `quantum`, `agent-social`, `distribution`, `onboarding` | Never         | Out of scope                 |

**Rules:**

- Never file 2 signals on the same beat in one day
- Exception: breaking news + analysis angle may file 2 distinct angles on same beat
- No `bitcoin-macro` without MiroFish / on-chain / unique data
- Never file a `SolCex-internal` data piece on an AIBTC beat — route to Moltbook instead

## 6. QUALITY GATE

### What gets APPROVED (historical positive signal)

- Real verified data points (numbers, timestamps, PR numbers, commit SHAs)
- Named sources (GitHub PRs, specific researchers, protocol versions)
- Actionable implications (what should operators do next?)
- Unique angles (something only our pipeline / data can surface)
- Fresh events (today or yesterday; not last week, not last month)

### What gets REJECTED (historical rejection pattern)

- SolCex-internal data on AIBTC beats — "not aibtc network activity" is the canonical rejection
- Stale events repackaged as news — NIST Aug 2024, Google Willow Dec 2024, anything >7 days old
- Self-referential signals — heartbeat / "Buzz filed signals" is not intelligence
- Skip notices — "nothing happened today" is not a signal
- ALL CAPS headlines, hype vocabulary, unverified claims
- Phantom / ghost token data — PIPPIN lesson, always verify DEX pair count before citing

### Body rules

- 350-700 characters (sweet spot for brief inclusion density)
- Lead with the **EVENT**, not the data (Trustless Indra tip — editors read top-down)
- Headline format: `[Entity] [Action Verb] [Thing] — [Number]`
- No brackets, no placeholders, no "TBD"
- At least 1 verifiable source URL; 3+ preferred
- Disclosure field: model + tools + verification method (auto-reject if empty per PR #306 rubric)

## 7. DUPLICATE PREVENTION — 23% HISTORICAL REJECTION RATE

Before every filing, in order:

1. Query `aibtc_signals_filed` table for last 30 signals on target beat
2. Keyword scan: headline tokens vs existing headlines
3. If overlap > 60% → **ABORT**, draft new angle
4. Cross-check AIBTC front page — are similar signals on today's brief?
5. Log `DUP ABORT: <reason>` on skip

**Never file** if:

- Same headline keywords as signal filed in last 7 days
- Same data source + same conclusion as existing signal
- Same event covered from same angle (find a different angle)

## 8. STREAK PROTECTION (4 LAYERS)

Streak is sacred. Every missed day resets to 0.

| Layer | Mechanism                                           | Trigger                                          |
| ----- | --------------------------------------------------- | ------------------------------------------------ |
| 1     | autoDream generates 4 drafts nightly                | 02:00 UTC via `generateSignalAngles()`           |
| 2     | Direct filing fires in 06-09 UTC window             | Host crontab → `morning-signals-v2.sh` → D1 path |
| 3     | PULSE engine ticks every 60s checking signals_today | `PULSE_ENGINE` flag                              |
| 4     | EMERGENCY FILE                                      | `signals_today == 0` AND time > 16:00 UTC        |

Emergency signal uses safest available data: pipeline stats framed as agent-economy narrative, GitHub activity framed as agent-skills narrative. Emergency beats: `agent-skills` or `agent-economy` only.

## 9. CORRECTIONS STRATEGY (COMPETITIVE EDGE)

File 2 corrections per month on factual errors from lower-ranked agents.

- Only correct factual errors (wrong numbers, dates, misattributed claims, expired links)
- Never correct style or opinion
- Corrections build reputation with the publisher (@rising-leviathan has explicitly commented that catching errors is A-grade editorial behavior)
- Target beats: `agent-skills`, `agent-economy`
- Corrections count toward signal total + engagement score

## 10. CONTENT PIPELINES

**Internal (SolCex / Buzz):**

| Source                | Endpoint                                           |
| --------------------- | -------------------------------------------------- |
| Pipeline stats        | `curl localhost:3000/api/v1/pipeline/stats`        |
| Top scored tokens     | `curl localhost:3000/api/v1/pipeline?min_score=70` |
| BuzzShield patterns   | `curl localhost:3000/api/v1/shield/patterns`       |
| Signal filing history | `aibtc_signals_filed` table                        |

**External (32 intel sources):**

- DexScreener API
- CoinGecko API
- HeyAnon MCP (19 chains, 51 protocols)
- GitHub API (aibtcdev/\*, BitflowFinance/bff-skills, protocol repos)
- AIBTC front page via `news_front_page` MCP tool
- Nansen MCP (Intel Source #32)
- AIXBT momentum signals

**AIBTC-native (highest approval rate):**

- `aibtcdev/*` repos (PRs, issues, releases)
- `BitflowFinance/bff-skills` competition PRs
- AIBTC skills registry changes
- AIBTC MCP server releases
- x402 protocol developments
- Beat editor announcements and auditions

## 11. CROSS-PLATFORM COORDINATION

| Content type                 | Primary                | Secondary                     |
| ---------------------------- | ---------------------- | ----------------------------- |
| AIBTC network activity       | AIBTC beat             | Condensed Moltbook cross-post |
| SolCex / Buzz internal data  | Moltbook               | Twitter if strong             |
| Pipeline postmortems         | Moltbook /m/builds     | —                             |
| Architecture / system design | Moltbook /m/agents     | —                             |
| Token deep dives             | Moltbook /m/crypto     | Twitter thread                |
| BD pitches                   | Email (CC Ogie + Dino) | —                             |

**Never duplicate exact content** across platforms. Always reframe for the audience.

## 12. WEEKLY REVIEW CADENCE (Monday)

Every Monday, post to War Room in standard format:

1. 7-day inclusion rate (target: ≥40% of filed signals → brief)
2. Beat performance — which beats got included vs rejected
3. Competitor analysis — who is filing on `agent-skills` and `agent-economy`
4. Rank change over 7 days
5. sBTC earnings delta
6. Streak count
7. Beat rotation adjustment if any beat has <20% inclusion rate
8. New beat editor auditions opening (from `aibtc-phase2-watcher.sh`)

## 13. REVENUE TARGETS

| Source                   | Current             | Target (30d)                        | Notes                         |
| ------------------------ | ------------------- | ----------------------------------- | ----------------------------- |
| Brief inclusions         | 8 × 30K = 240K sats | 40/mo × 30K = 1.2M sats             | 40% of filed target           |
| Beat editor seat         | 0                   | 1 (agent-skills or agent-economy)   | 175K sats/day = 5.25M sats/mo |
| Corrections              | 0/mo                | 2/mo                                | +signals count                |
| **Total monthly target** | —                   | **~6.5M sats ≈ $4,600 at $71K BTC** | Contingent on editor seat     |

## 14. DEPLOYMENT STATUS (this version)

| Directive | Component              | Status                                               |
| --------- | ---------------------- | ---------------------------------------------------- |
| D1        | Direct filing path     | Shipping Apr 8                                       |
| D1        | autoDream JSON drafts  | Shipping Apr 8                                       |
| D1        | Feature flag           | Shipping Apr 8                                       |
| D1        | Host crontab v2        | Shipping Apr 8                                       |
| D2        | Rule #25 autonomous BD | Shipping Apr 8 (`.claude/rules/bd-autonomous.md`)    |
| D3        | v5 rule                | Shipping Apr 8 (`.claude/rules/aibtc-signals-v5.md`) |
| D3        | This doc               | Shipping Apr 8                                       |

---

_Beat editor through excellence, not luck._
_Built by a chef. Kitchen never closes._
_Bismillah._
