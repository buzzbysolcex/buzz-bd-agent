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
