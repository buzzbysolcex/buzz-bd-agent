# Weekly Synthesis Template — Buzz Brain Self-Correction Layer

**Purpose:** Every Sunday at 06:00 UTC (after brain backup completes), run this template to synthesize the prior 7 days of hunts + brain proposals into 4 sections: CONNECTIONS, PATTERNS, CONTRADICTIONS, OPEN QUESTIONS.

**Authority:** Part 3 of Brain Self-Correction Layer (created 2026-05-26). Companion artifacts: `brain/Contradictions-Register.md` (Part 1), `brain/Open-Questions-Tracker.md` (Part 2), Part 4 = compounding-feedback wrap.

**Schedule:** Sundays 06:00 UTC. Cron entry: `0 6 * * 0 cd /home/claude-code/buzz-workspace && bash scripts/weekly-synthesis.sh` (or manual invocation via `bash scripts/weekly-synthesis.sh`).

**Why Sunday 06:00 UTC:** brain-backup-auto cron runs at 02:00 UTC daily and again at 05:00 UTC on Sundays as a pre-synthesis snapshot. 06:00 UTC gives a 1-hour buffer for the staging-repo push to complete before synthesis reads the brain state.

---

## PROMPT TEMPLATE (paste into a fresh session as the user message)

> You are running Buzz's Weekly Brain Synthesis. Today's date is {{TODAY_ISO}}. Read all files in `hunts/` modified in the last 7 days, all files in `brain/` modified in the last 7 days, and the current state of `brain/Contradictions-Register.md` and `brain/Open-Questions-Tracker.md`.
>
> Then produce a synthesis with these four sections:
>
> ## CONNECTIONS
> List 3-5 non-obvious links between findings from DIFFERENT targets this week. Each connection must reference specific hunt files by name. Examples of "non-obvious links": the same defense-class gap appearing in two unrelated protocols, the same audit firm missing the same pattern across two clients, a Doctrine #X lens firing on two targets in different substrates, the same dispatch-time corpus-collision pattern recurring across multiple PRE-CLONE-HALT files.
>
> ## PATTERNS
> List every doctrine, lens, defense class, or CANDIDATE that fired on 3+ targets this week. For each: name the pattern, list the targets, note the substrate distribution (Solidity / Rust / FunC / Clarity / Move / Cosmos-SDK Go / Substrate Rust / etc.), suggest whether the pattern is ripe for promotion (e.g., CANDIDATE → DC, or DC sub-type → standalone DC, or single-anchor Doctrine → multi-anchor PERMANENT).
>
> ## CONTRADICTIONS
> List any new contradictions discovered this week (rules that produced conflicting decisions on the same target, or doctrines that fire in opposite directions on the same input). Feed these into `brain/Contradictions-Register.md` by appending new numbered entries with the format: `## C-N — <one-line summary>` + ruling-rules + targets-affected + status (OPEN / RESOLVED).
>
> ## OPEN QUESTIONS
> List any questions that appeared 2+ times this week without resolution. Feed these into `brain/Open-Questions-Tracker.md` by appending new entries OR by promoting existing OPEN entries to RECURRING. Format: `## Q-N — <one-line question>` + first-observed-date + recurrence-count + targets-affected + status (OPEN / RECURRING / RESOLVED / DEFERRED).
>
> Write the synthesis to `brain/weekly-synthesis/{{TODAY_ISO}}-synthesis.md`. Cap the synthesis at 2000 words. Each section should be 300-500 words. Then UPDATE the Contradictions Register and Open Questions Tracker with the new entries discovered. After writing, return: (a) top 3 CONNECTIONS in one line each, (b) top 3 PATTERNS that fired on 3+ targets, (c) count of new CONTRADICTIONS surfaced, (d) count of new OPEN QUESTIONS surfaced.

---

## INVOCATION

**Manual:** `bash /home/claude-code/buzz-workspace/scripts/weekly-synthesis.sh`

**Cron (add to root crontab via existing cron framework — operator action):**

```
0 6 * * 0 cd /home/claude-code/buzz-workspace && bash scripts/weekly-synthesis.sh
```

The wrapper script `scripts/weekly-synthesis.sh` should:

1. Verify brain backup completed in the last hour (check `.brain-backup-staging/.git/refs/heads/main` mtime — if older than 60 min, halt + notify War Room)
2. Set `TODAY_ISO=$(date -u +%Y-%m-%d)`
3. Notify War Room: `weekly synthesis kicking off for {{TODAY_ISO}}`
4. File a reminder mailbox event with `event_type=weekly_synthesis` and the rendered prompt (with `{{TODAY_ISO}}` substituted) as the payload `message`
5. Note: the actual synthesis is operator-triggered for now (cron files the work order; operator pastes the prompt into a fresh session per the prompt template above)

When the synthesis-running session completes, it appends to `brain/Contradictions-Register.md` and `brain/Open-Questions-Tracker.md` and writes the dated synthesis file to `brain/weekly-synthesis/`.

---

## FILE NAMING + RETENTION

- Per-week files: `brain/weekly-synthesis/YYYY-MM-DD-synthesis.md` (one per Sunday, never deleted)
- Quarterly rollups: when 13+ weekly files exist, the operator may dispatch a quarterly-rollup synthesis (consolidates 13 weeklies into one quarterly meta-synthesis). This is a Part 4 evolution task; tracked separately.

---

## FAILURE MODES

1. **Empty week (no hunts):** if `git log --since="7 days ago" -- hunts/` returns zero commits, write a stub synthesis noting the empty week and the reason (operator pause / rest cycle / infra week). Still update tracker timestamps so the cadence is preserved.
2. **Brain-backup not fresh:** halt + notify War Room (per Step 1 of wrapper script). Do not synthesize against a stale brain — risk of compounding stale state into the synthesis.
3. **Hunt file count > 30 in 7 days:** the synthesis prompt is calibrated for 5-15 hunts/week. At >30, the 2000-word cap may compress too aggressively. Operator decides whether to (a) raise the cap to 3000 words, (b) split the synthesis into two halves (first 3.5 days + last 3.5 days), or (c) skip the synthesis and run a triage-only output.

---

## CALIBRATION (first run 2026-05-26 covering May 24-26)

The first run is documented at `brain/weekly-synthesis/2026-05-26-synthesis.md` and serves as the format reference for all future runs. It covers a 3-day sprint (the 48-hour-plus calibration window) rather than a full 7-day cycle. Subsequent weekly runs are expected to cover full 7-day cycles.

The first synthesis is a calibration run with these properties:
- Sprint window: 2026-05-24 → 2026-05-26 inclusive (3 calendar days)
- Hunt corpus: ~15 Gate 1 files + 3 PRE-CLONE-HALT files + 3 brain-proposals-applied ledgers + 4 disclosure submission events
- Brain compound state at start: pre-DISC-019-refactor
- Brain compound state at end: post-DISC-020-submission + Lane 5 crawler live + Platform-Migration-Log NEW file + Doctrine #37 CANDIDATE filed + DC-9 sub-5 NEW + DC-7 cross-language sub NEW

---

## Cross-references

- `brain/Contradictions-Register.md` — Part 1 artifact (numbered contradictions, append-only)
- `brain/Open-Questions-Tracker.md` — Part 2 artifact (numbered OPEN/RECURRING questions, append-only)
- `brain/weekly-synthesis/` — directory of dated synthesis files (this template + dated outputs)
- `.claude/rules/standing-intake-protocol.md` — Standing-Intake Protocol v1.0 (Step 0 prior-corpus + Step 1 Platform STATUS preflight are direct inputs to the synthesis CONNECTIONS section)
- `brain/Doctrine.md` — methodology backbone the synthesis CONNECTIONS / PATTERNS sections feed back into
- `scripts/weekly-synthesis.sh` — wrapper script (created separately by operator)

---

_Template v1.0 — 2026-05-26 — Part 3 of Brain Self-Correction Layer rollout. First calibration run: `brain/weekly-synthesis/2026-05-26-synthesis.md`._
