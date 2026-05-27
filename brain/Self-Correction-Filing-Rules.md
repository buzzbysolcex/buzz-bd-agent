# Brain Self-Correction Filing Rules

**Purpose:** Encode the feedback-loop discipline that keeps the three Self-Correction Layer registers (Contradictions, Open Questions, Weekly Synthesis) alive across every Gate 1 brain-proposal cycle.

**Authority:** Created 2026-05-26 as Part 4 of Brain Self-Correction Layer rollout (operator directive). Maintained alongside `.claude/rules/standing-intake-protocol.md` Step 6 (CONTINUOUS).

**Scope:** every Gate 1, Gate 2, paste-ready, submission, and Weekly Synthesis cycle.

---

## RULE 1 — File new CONTRADICTIONS discovered during a cycle

**Trigger:** during any Gate 1 surface map, Gate 2 PoC build, paste-ready draft, brain-proposal application, or Weekly Synthesis run, you discover that two existing rules / doctrines / patterns / standing-rules produce conflicting outputs on the same target.

**Action:**
1. Open `brain/Contradictions-Register.md`
2. Insert a new numbered entry BEFORE the `## Aggregate notes` section, following the existing template:
   - `## #N — <conflict name>`
   - `**Rule A** (source: ...): <statement>`
   - `**Rule B** (source: ...): <statement>`
   - `**Conflict scenario:** <target type>`
   - `**Proposed resolution:** <MERGE / SCOPE-LIMIT / DEPRECATE-ONE / ESCALATE>`
   - `**Resolution detail:** <paragraph>`
   - `**Status:** UNRESOLVED | SCOPED | RESOLVED | ESCALATE`
3. Update the file footer: bump version (`v1.1` → `v1.2`, etc.) and entry count
4. If the contradiction is operator-decision-required, also surface to War Room with a one-line summary and link to the new entry

**Anti-pattern:** filing a "contradiction" that is actually two procedurally-compatible rules (one HOW, one WHAT). Only file when outputs are mutually incompatible (PROCEED vs FORECLOSE, AUTO-DISPATCH vs SURFACE-TO-OPERATOR, REJECT vs ACCEPT at same confidence).

---

## RULE 2 — Resolve OPEN QUESTIONS when evidence appears

**Trigger:** during a Gate 1, Gate 2, paste-ready, or submission cycle, you produce evidence that answers an existing OPEN entry in `brain/Open-Questions-Tracker.md`.

**Action:**
1. Open `brain/Open-Questions-Tracker.md`
2. Locate the matching `## #N — <question text>` entry by Grep
3. Edit the entry:
   - Change `**Status:** OPEN` → `**Status:** ANSWERED`
   - Replace `**Answer:**` body with the resolution and source link (file:line or operator message number)
   - Add a `**Resolved:**` line with the date and the hunt/file that produced the evidence
4. If the question recurred 3+ times across hunts but only now got answered, also leave a marker note: "Resolved after N recurrences — promotion candidate for permanent doctrine entry"

**Anti-pattern:** marking ANSWERED without a verifiable source. Every ANSWERED entry must cite a specific file path, line range, or operator message ID.

---

## RULE 3 — File new OPEN QUESTIONS when uncertainty appears

**Trigger:** during any cycle, you encounter:
- An R8 `[ASSUMED]` tag with no obvious path to upgrade to `[INSPECTED]` or `[EXECUTED]`
- A scope-clarification or DUP-check question that can't be answered with on-disk data
- An operator-decision-needed gate
- A methodology question that affects future cycles

**Action:**
1. Open `brain/Open-Questions-Tracker.md`
2. Append a new numbered entry BEFORE the footer:
   - `## #N — <question text, one sentence>`
   - `**Status:** OPEN`
   - `**First-surfaced:** <date>`
   - `**Hunt context:** <file:line or operator message>`
   - `**Answer:** OPEN — <one paragraph describing what's needed to resolve>`
   - `**Tags:** <substrate, methodology, operator-pending, etc.>`
3. Update the file footer: bump version + entry count
4. Before filing, Grep the tracker for similar questions — if a duplicate exists, instead mark the existing entry RECURRING and add the new context as a second `**Hunt context:**` reference

**Anti-pattern:** filing a question that's just a TODO. Open Questions are uncertainties that affect Gate 1/2 outcomes; TODOs go in hunt files or task lists.

---

## RULE 4 — Weekly Synthesis feedback loop

**Trigger:** the Sunday 06:00 UTC `bash scripts/weekly-synthesis.sh` cron fires (or operator triggers manually) and produces a synthesis file at `brain/weekly-synthesis/<date>-synthesis.md`.

**Action:** after the synthesis is written, the same session that produced it must:
1. For each `CONTRADICTIONS` section entry, check if it matches an existing register entry by Grep. If new, file via RULE 1.
2. For each `OPEN QUESTIONS` section entry, check if it matches an existing tracker entry by Grep. If new, file via RULE 3. If matches existing OPEN, promote to RECURRING and add the synthesis run as a `**Hunt context:**` reference. If matches existing ANSWERED, no action (the synthesis caught a stale entry — note in synthesis tail).
3. Update both register footers with the synthesis date in `last synthesis feed-back` field

**Anti-pattern:** filing the synthesis without feeding the registers. The feedback loop IS the value; the synthesis file alone is just a snapshot.

---

## RULE 5 — Startup-read discipline

Per `CLAUDE.md` startup-read priority items 10 + 11: every session reading the brain compound must Grep both registers for entries relevant to the current target's substrate or scoping path BEFORE dispatching a Gate 1. If a relevant UNRESOLVED contradiction exists, surface it; if a relevant RECURRING question exists, surface it. Do NOT silently dispatch through known contradictions or known recurring uncertainties.

---

## INTERACTION WITH EXISTING RULES

- **Standing-Intake Protocol** (`.claude/rules/standing-intake-protocol.md`) Step 6 CONTINUOUS already mandates Watchlist-Candidate-Crossmap + 30-repo watchlist + intake-logbook updates per cycle. This file ADDS Contradictions-Register + Open-Questions-Tracker to that same Step 6 list.
- **Hyperactive Formula** (`brain/Hyperactive-Formula.md`) loop continues to govern dispatch; this file does NOT introduce decision points or option menus. The registers are read-only context during dispatch; they only become write-targets after a Gate 1 surfaces new entries.
- **R8 Calibrated Reporting** (Step 5.10) — the `[ASSUMED]` tag is the trigger for RULE 3. Every `[ASSUMED]` claim that can't be upgraded to `[INSPECTED]` within the cycle should produce an Open Question entry.

---

_Brain Self-Correction Filing Rules | v1.0 | 2026-05-26 | Part 4 of Brain Self-Correction Layer rollout. Pairs with `brain/Contradictions-Register.md`, `brain/Open-Questions-Tracker.md`, `brain/Weekly-Synthesis-Template.md`, `brain/weekly-synthesis/`. Authority: Ogie operator directive. Next update on operator amendment._

---

# === v2.0 FOUR-PILLAR AUTO-FILING EXTENSION (2026-05-27) ===

**Authority:** Four-Pillar Brain Extension (Obsidian Mind upgrade) directive, 2026-05-27. Authored alongside 5 new pillar-brain files (Token-Scoring-Doctrine, HSaaS-Operations, Content-Playbook, Corpus-Digest-Log, Cross-Pollination-Log).

**Scope expansion:** Rules 1-5 above governed Pillar 4 cycles only. Rules 6-10 below extend the same filing discipline to Pillars 1, 2, 3, and cross-pillar events.

---

## RULE 6 — Auto-filing routing table (event → brain file)

When an event occurs in any pillar, the destination brain file(s) for the recorded artifact are deterministic. Operator never needs to surface "where does this go" — the routing IS the rule.

| Event class | Source pillar | Destination brain file(s) | Schema section |
|---|---|---|---|
| Token scored ≥85 (HOT) | P1 | `brain/HSaaS-Operations.md` §2 + `brain/Content-Playbook.md` §1 | append tweet-performance row |
| Token scored 70-84 (QUALIFIED) | P1 | `brain/HSaaS-Operations.md` §2 + `brain/Content-Playbook.md` §1 | append tweet-performance row |
| Token scored 50-69 (WATCH) | P1 | `brain/HSaaS-Operations.md` §2 | append tweet-performance row |
| Token scored <50 (SKIP) | P1 | `data/pillar1/skipped-{date}.json` (log-only) | no brain file |
| Rug catch (previously-scored token dumps) | P1 | `brain/Token-Rug-Patterns.md` (existing) + `brain/Content-Playbook.md` §1 + `brain/Token-Scoring-Doctrine.md` T-5 (worked example append) + `brain/Cross-Pollination-Log.md` §1 if pattern crossed to P4 | append rug catch + anchor list |
| New scoring rule promoted | P1 | `brain/Token-Scoring-Doctrine.md` T-1/T-2 + `brain/Token-Rug-Patterns.md` TRP-N | append doctrine entry + rule spec |
| New deployer flagged | P1 | `brain/Deployer-Crossref.md` (existing) | append row |
| HSaaS outreach sent | P2 | `brain/HSaaS-Operations.md` §1 outreach log | append row |
| HSaaS revenue event | P2 | `brain/HSaaS-Operations.md` §3 + `brain/Revenue.md` (existing) | append row to both |
| Tweet posted (any template) | P2 | `brain/Content-Playbook.md` §1 + `brain/HSaaS-Operations.md` §2 | append tweet-performance row |
| Moltbook post published | P2 | `brain/Content-Playbook.md` §2 | append post-performance row |
| AIBTC signal filed | P2 | `brain/Content-Playbook.md` §3 | append signal-performance row |
| Template A/B winner identified | P2 | `brain/HSaaS-Operations.md` §5 + `brain/Content-Playbook.md` (relevant template entry) | append A/B result |
| Phase 2 corpus consumer run | P3 | `brain/Corpus-Digest-Log.md` §1 + §2 (classification stats) | append digest run row + update classification stats |
| Corpus classification finding (any class) | P3 | `brain/Corpus-Digest-Log.md` §4 (cross-references) + destination brain file per classification (see RULE 7) | append cross-reference row |
| Corpus disk health check | P3 | `brain/Corpus-Digest-Log.md` §6 (daily health check) | append health log entry |
| Gate 1 dispatch | P4 | `hunts/<date>-<target>-gate1.md` + auto-indexed via hunt-complete.sh hook | new hunt file |
| Gate 2 escalation (CONFIRMED) | P4 | `data/lane1/gate2-clones/<target>-paste-ready-v2.md` + `brain/Cross-Pollination-Log.md` §3 (if post-disclosure content surface) | new paste-ready + cross-pollination row |
| Gate 2 escalation (FORECLOSED) | P4 | `hunts/<date>-<target>-gate2-foreclosure.md` + `brain/Doctrine.md` (worked example append if novel) + `brain/Patterns-Defense-Classes.md` (sub-pattern catalog update if new class) | foreclosure receipt + brain compound |
| New doctrine / DC / CANDIDATE promoted | P4 | `brain/Doctrine.md` OR `brain/Patterns-Defense-Classes.md` (per scope) + `brain/Watchlist-Candidate-Crossmap.md` (anchor row) | append entry + update crossmap |
| Bounty payment received | P4 | `brain/Security-Research-Submission-Ledger.md` + `brain/Revenue.md` + `brain/Cross-Pollination-Log.md` §3 (post-disclosure content unlock trigger) | append rows to all three |
| Submission filed (any platform) | P4 | `brain/Security-Research-Submission-Ledger.md` | append row |
| Cross-pillar event (any class) | CROSS | `brain/Cross-Pollination-Log.md` §1-§7 (per pillar pair) | append row to matching section |
| New contradiction discovered (any pillar) | any | `brain/Contradictions-Register.md` (matching pillar section per v1.4) | append entry per RULE 1 |
| New open question (any pillar) | any | `brain/Open-Questions-Tracker.md` (matching pillar section per v1.8) | append entry with pillar tag per RULE 3 |
| Weekly synthesis run (Sunday 06:00 UTC) | CROSS | `brain/weekly-synthesis/<date>-synthesis.md` (4-pillar template v2.0) | new dated synthesis file |

**Enforcement:** every cycle, after the primary work product (Gate 1 file / tweet draft / Phase 2 digest / score row) is written, check the table above for any required brain-file updates. Missing a routing destination is a Self-Correction Layer violation and gets logged as an Open Question.

---

## RULE 7 — Corpus classification routing (P3 sub-rule)

When the Phase 2 corpus consumer extracts a finding, the destination brain file depends on classification:

| Classification | Destination brain file | Promotion threshold |
|---|---|---|
| GROUND_TRUTH | `brain/Ground-Truth-Catalog.md` (to be created on first non-Phase-1 entry) + `brain/Corpus-Digest-Log.md` §4 cross-ref | 1 post = catalog entry |
| RUG_PATTERN | `brain/Token-Rug-Patterns.md` (existing) §pattern-N as anchor row | ≥2 corroborating posts = anchor |
| METHODOLOGY | `brain/Doctrine.md` as CANDIDATE worked example | ≥3 corroborating posts across distinct authors = CANDIDATE entry |
| DETECTOR_SEED | `brain/Patterns-Defense-Classes.md` as CANDIDATE-X | ≥3 corroborating posts across distinct authors + grep-confirmable primitive in modern code = CANDIDATE entry |

**Operator-decision threshold:** any METHODOLOGY or DETECTOR_SEED at ≥5 corroborating posts triggers Open Question entry requesting promotion review.

---

## RULE 8 — Cross-pollination event filing (CROSS sub-rule)

When an event in pillar A produces measurable value in pillar B, file a row in `brain/Cross-Pollination-Log.md` per the routing in its §1-§7:

- **P4 → P1** events (bug research feeds token scoring penalty rules) → `Cross-Pollination-Log.md` §1
- **P1 → P4** events (token scoring feeds hunting targets) → `Cross-Pollination-Log.md` §2
- **P4 → P2** events (bug research feeds HSaaS content / methodology threads) → `Cross-Pollination-Log.md` §3
- **P1 → P2** events (token scoring feeds HSaaS outreach pipeline) → `Cross-Pollination-Log.md` §4
- **P3 → P1 + P4** events (corpus feeds both brains) → `Cross-Pollination-Log.md` §5
- **P2 → P4** events (HSaaS audits surface bounty-eligible findings) → `Cross-Pollination-Log.md` §6
- **CROSS meta-events** (3+ pillars touched) → `Cross-Pollination-Log.md` §7

**Cycle detection:** when a cross-pollination event closes a cycle (event flowed A → B → A back to source pillar with measurable improvement), file a `Cross-Pollination-Log.md` §8 pattern-detection entry with cycle_id, source, path, duration, net_value, learnings.

---

## RULE 9 — Pillar self-discipline maintenance

Every pillar brain file has its own maintenance cadence:

- **`brain/Token-Scoring-Doctrine.md`** — append worked example per notable scoring outcome (rug catch / false positive / cross-pillar trigger). T-2 weight calibration review monthly per false-positive-rate.
- **`brain/HSaaS-Operations.md`** — append outreach + tweet + revenue rows per cycle. Weekly digest auto-generated for Sunday synthesis.
- **`brain/Content-Playbook.md`** — append engagement data per tweet / Moltbook post / AIBTC signal post-window-close. Template winner identification at A/B sample size threshold.
- **`brain/Corpus-Digest-Log.md`** — append digest run row per Phase 2 cron fire (Wed 06:00 UTC). Era productivity stats update per run. Daily health check appends per Hyperactive-Formula Step 7.
- **`brain/Cross-Pollination-Log.md`** — append row per cross-pillar event. Cycle detection on cumulative review. Weekly digest count fed to Sunday synthesis.

---

## RULE 10 — Brain extension boundary

When a new brain file is created (i.e., a new compound that doesn't fit any existing file), the creator must:

1. Add the file to `CLAUDE.md` startup-read priority list (matching the file's primary pillar)
2. Add a row to RULE 6 routing table above naming the event class that fills it
3. Add a `Cross-references:` footer entry pointing to related brain files
4. Surface to operator in next status report: "New brain file <name> created; routing wired into Self-Correction-Filing-Rules v2.0"

**Anti-pattern:** creating brain files without wiring routing. An orphaned brain file is a Self-Correction Layer violation — the file exists but no events route to it, so it never grows.

---

_Brain Self-Correction Filing Rules | v2.0 | 2026-05-27 | Four-Pillar Brain Extension expansion. Rules 1-5 = P4 baseline (v1.0). Rules 6-10 = P1+P2+P3+CROSS routing. RULE 6 routing table is authoritative for "where does this event go" — operator never surfaces routing questions. Authority: Ogie operator directive (Four-Pillar Brain Extension, 2026-05-27)._
