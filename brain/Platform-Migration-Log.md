# Platform-Migration Log — Disclosure-Channel Migration Tracking

> **Filed:** 2026-05-26 afternoon
> **Authority:** Across V3 P4 proposal, Ogie msg 7844 (operator explicitly endorsed: "Platform-Migration-Log is a real gap")
> **Status:** NEW brain file (canonical-anchor entry: Across Protocol 2026-05-26)
> **Companion:** `brain/Watchlist-Candidate-Crossmap.md` (gate1_status column proposal, Lombard P3) + `.claude/rules/standing-intake-protocol.md` Step 1 Platform STATUS preflight rule

---

## Why this brain file

Bug bounty programs **migrate disclosure platforms** between dispatch windows. The 2026-05-26 Across discovery was the canonical anchor: Buzz watchlist scraped 2026-05-23 recorded Across on Immunefi at $1.5M Critical cap; live check 2026-05-26 returned 404 across 5 URL variants AND zero results on Immunefi explore search; canonical `docs.across.to/introduction/bug-bounty` page showed self-hosted `bugs@across.to` email path at $1M Critical cap. Migration occurred IN-WINDOW.

Standing-Intake Protocol v1.0 Step 1 PROFILE column captures CURRENT platform but does NOT carry **migration history**. Without history, every dispatch has to re-derive platform-status from scratch, and Buzz watchlist data goes stale silently. This log closes that gap.

### Failure modes prevented by this log

1. **Brief-mismatch on clone-and-submit** — operator briefs "Immunefi program" but submission path is broken at Gate 4-5 because the program migrated mid-dispatch-window. Wasted clone + Gate 1 cycle.
2. **EV miscalibration** — different platforms have different P(acceptance) — Immunefi-tenured payer ≈ 0.4-0.5 default; self-hosted email path with no public payer history ≈ 0.2 default. Stale platform data inflates EV by 2-2.5×.
3. **Public-payout-tracker absence** — Immunefi publishes a payout-tracker; self-hosted email programs typically don't. Migration to email = loss of public-feedback signal for Buzz feedback-ledger calibration (`buzzshield-feedback.js`).
4. **Triager-less path risk** — Immunefi triagers screen submissions to standard; self-hosted email programs may have varying triager quality or no triager. Submission EV depends on triager presence.

---

## Why this matters operationally

**For Standing-Intake Step 1 (PROFILE):** when intaking ANY target with a prior Buzz watchlist entry, the Platform STATUS preflight rule now has a corollary — **check this log FIRST**. If the program has migrated, the watchlist data is provisionally stale; live-verify the new platform's submission path before EV calculation.

**For dispatch-vs-corpus collision prevention:** combined with Step 0 prior-Gate-1 corpus lookup (dYdX V4 P1 + Lombard P3 + Across-implicit lesson), this log is the **third corpus check** that runs before clone work:

1. **Step 0** — `Glob hunts/**/*<target>*` + `Grep <target> brain/Watchlist-Candidate-Crossmap.md` — catches dispatch-vs-Gate-1-corpus collisions
2. **Platform-Migration-Log check** (this file) — catches dispatch-vs-platform-corpus collisions
3. **Step 1 PROFILE** — captures CURRENT platform state (verifies live, doesn't rely on cache)

**For Lane 5 Immunefi crawler integration** (highest-priority post-cycle infrastructure task per Ogie msg 7844): the crawler's primary job is to keep platform-status data fresh by polling Immunefi `/explore` daily and detecting migrations. Migration events here = automatic Platform-Migration-Log entry.

---

## Schema

| Column | Description |
|---|---|
| Program slug | Canonical identifier — repo or program name |
| Prior platform | Where the program WAS hosted (Immunefi / HackerOne / Cantina / Sherlock / Code4rena / direct-email / self-hosted) |
| New platform | Where the program currently IS (same enum) |
| Date observed | UTC date Buzz detected the migration |
| Source of observation | Hunt file, live check method, or operator brief |
| Impact on prior Gate 1 / submission | Concrete operational consequences |

---

## Entries

### 2026-05-26 — Across Protocol (FROM Immunefi → TO self-hosted `bugs@across.to`)

| Field | Value |
|---|---|
| Program slug | `across-protocol` (repo `across-protocol/contracts`) |
| Prior platform | Immunefi |
| New platform | Self-hosted email (`bugs@across.to`) |
| Date observed | 2026-05-26 (observed between 2026-05-23 Buzz watchlist scrape and 2026-05-26 live check) |
| Source of observation | `hunts/2026-05-26-across-immunefi-gate1-PRE-CLONE-HALT.md` Step 1 PROFILE table; 5 URL variants returned 404; `immunefi.com/explore?query=across` returned 0 matches across 219 programs; `docs.across.to/introduction/bug-bounty` canonical page showed self-hosted path |
| Impact on prior Gate 1 / submission | (a) **Cap discrepancy:** Buzz watchlist recorded $1.5M Immunefi Critical; new self-hosted path is $1M Critical ($500K downside delta = -33% cap). (b) **P(acceptance) drop:** default Immunefi-tenured payer ≈ 0.40; self-hosted email with no public payout tracker ≈ 0.20 (50% drop). Combined EV impact: Scenario A → Scenario B = $90K → $30K (66% EV drop). (c) **Triager-less path:** self-hosted email has no Immunefi triager screening; submission velocity + dispute path unknown. (d) **No public payout tracker:** Buzz feedback-ledger loses cross-protocol-payout calibration signal for Across; CANDIDATE-A bridge-family EV calibration becomes harder. (e) **Cap-Sherlock-class status drift:** any future Buzz dispatch on Across must first check this log to avoid re-discovering migration |

**Anchor status:** FIRST canonical entry in this log. Established the schema. Operator endorsed file creation (msg 7844: "real gap").

**Re-evaluation trigger:** if Across migrates BACK to Immunefi, OR if `bugs@across.to` is replaced with a different self-hosted email, OR if Across joins a contest platform (Cantina / Sherlock / Code4rena), update this entry with the new transition.

---

## Lane 5 Immunefi crawler integration note

**Highest-priority post-cycle infrastructure task per Ogie msg 7844.**

Lane 5 (the crawler infrastructure lane, per Vision-2027) currently scrapes Immunefi explore page weekly to refresh Buzz watchlist. Per Across discovery, the crawler must be extended to:

1. **Diff-and-detect migrations:** for each program in Buzz watchlist, on each crawl, compare presence-on-Immunefi vs prior state. Disappearance from Immunefi = candidate migration event. Trigger automatic check of program's canonical docs / project website for the new disclosure path.

2. **Write to this log automatically:** detected migrations should land as new Platform-Migration-Log entries via a scripted append. Eliminates manual log maintenance.

3. **Surface to operator:** when a watchlist target migrates, surface to War Room with: (a) prior platform + cap, (b) new platform + cap, (c) impact-on-EV-calculation projection, (d) recommend re-intake action (full re-dispatch / parameter update / foreclosure).

4. **Cross-platform polling:** extend crawler to Cantina + HackerOne + Sherlock + Code4rena program directories for full coverage. Each platform has a different API/scrape pattern.

5. **Daily cadence target:** Buzz watchlist refresh from weekly → daily for the high-value subset (any program with Immunefi $250K+ Critical OR currently Gate-2-active). Disk impact: negligible (metadata-only, no source-code clones).

**Substrate priority:** start with Immunefi-only crawler enhancement (most Buzz watchlist entries are Immunefi-hosted). Extend to other platforms as Buzz pipeline grows their dispatch share.

**Owner:** TBD. Tracked as highest-priority Lane 5 infrastructure task post-Day-26 hunting cycle. Build trigger = operator routing OR next platform-migration event detected manually.

---

## Cross-references

- `brain/Watchlist-Candidate-Crossmap.md` — gate1_status column proposal (v3 schema cycle pending); row 43 Across entry references HALTED-platform-ambiguity status
- `brain/Doctrine.md` Doctrine #34 — Across V3 `ArbitraryEVMFlowExecutor` PROVISIONAL anchor 5 (Doctrine #34 fires regardless of disclosure platform; platform-migration impacts EV calculation, not finding probability)
- `brain/External-Frameworks.md` — Single-Firm-Continuous-Audit Sub-Pattern (Across as 2nd anchor)
- `.claude/rules/standing-intake-protocol.md` Step 1 Platform STATUS preflight rule (C-Cap-4 anchor, Cap Sherlock #990 FINISHED canonical example)

---

_brain/Platform-Migration-Log.md | v1.0 | 2026-05-26 afternoon (Ogie msg 7844 — Across V3 P4 proposal approved; operator explicitly endorsed file as "real gap"). First canonical entry: Across Protocol Immunefi→self-hosted migration. Schema established. Lane 5 Immunefi crawler integration queued as highest-priority post-cycle infrastructure task._
