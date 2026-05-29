# Pillar-Wiring Sprint — DEFERRED (post-Sherlock)

**Status:** QUEUED. Do NOT start until Sherlock x Polygon Heimdall detectors (#138/#165) + prep are built. Sherlock contest Jun 15 is the binding deadline; P3 is not on fire.
**Authority:** Ogie msg 7976 + 7997 (2026-05-29). Defers Fixes #2 + #3 from the 4-Pillar Calibration Audit (`brain/4-Pillar-Calibration-2026-05-29.md`).
**Trigger to start:** Sherlock detector build complete OR operator greenlight, whichever first.

---

## DONE before this sprint (Fix #1 — P4→P2 leak)
- ✅ `scripts/lane1/p4-p2-fanout-backstop.sh` + `*/30` cron installed (single batched summary, `--no-notify` backfill, ledger dedup).
- ✅ `scripts/p4-to-p2-fanout.py` patched: content-eligibility filter (FORECLOSE/NEGATE/DEDUP/KILL/UNKNOWN → NO drafts; only PROCEED/WATCHLIST/CONFIRM) + CONFIRM detection via `*-paste-ready.md` filename.
- ✅ Backlog drained + cleaned (63 hunts ledgered, 17 eligible-only drafts).

---

## SPRINT SCOPE (2 fixes)

### Fix #2 — Build P3 Phase-2 consumer v2 (corpus → brain) — HIGH VALUE
- **Problem (audit):** `scripts/lane4-corpus-phase2-consumer.py` is **v1.0 keyword-only NOISE** (self-marked "DO-NOT-APPEND", L25 "LLM enrichment deferred to v1.1"). 798M corpus is a dead-end accumulator. P3→P1 and P3→P4 wires are DARK.
- **Build:** v2 = keyword-prefilter → LLM structured extraction classifying each record as GROUND_TRUTH / RUG_PATTERN / DETECTOR_SEED / METHODOLOGY → append to the matching brain file (`Ground-Truth-Catalog.md` / `Token-Rug-Patterns.md` / `Patterns-Defense-Classes.md` CANDIDATE / `Doctrine.md` CANDIDATE).
- **HARD CONSTRAINT (BUZZ_RULES #5):** LLM routes to **free bankr/gpt-5-nano ONLY — NEVER Anthropic/MiniMax.** v1 noise must NOT be appended; v2 output is CANDIDATE-tagged, needs 2nd anchor to promote.
- **Cron:** install `0 6 * * 3` (Wednesday 06:00 UTC), first run 2026-06-03 (currently NOT installed — verified absent in `crontab -l`).
- **Lights up:** P3→P1 (RUG_PATTERN → scoring rules) + P3→P4 (DETECTOR_SEED/GROUND_TRUTH → detector candidates) simultaneously.
- **Effort:** medium (~200 LOC extractor + cron). OPERATOR-GATED (new cron + LLM routing).

### Fix #3 — Wire P1→P4 deployer-escalation — closes the one missing cross-pollination direction
- **Problem (audit):** the 4×4 matrix has NO P1→P4 wire. `brain/Deployer-Crossref.md` is manual-only.
- **Build (per `four-pillar-loop.md`):** token scores <30 with a deployer flag → look up the deployer wallet's other contracts → if any in Lane 5 scope → escalate to a Gate 1 → log `brain/Deployer-Crossref.md`.
- **Effort:** medium (cross-ref job against Lane 5 scope DB — real pipeline DB is `/data/buzz/persistent/buzz-api/buzz.db`, 2049 tokens). OPERATOR-GATED (new automation/cron).

---

## MINOR follow-ups (fold in when convenient)
- Moltbook extractor v2 patch (audit found still pending; v1 grabbed non-compound bullets).
- P2 draft-drain / posting tracking (drafts accrue; no "posted" markers).
- Resolve +1-day workspace-label vs UTC drift (hunts dated 2026-05-29 while UTC mtimes 2026-05-28/29).
- Stale `/data/buzz-api/buzz.db` 0-row shadow — ensure all consumers point at `/data/buzz/persistent/buzz-api/buzz.db` (see `[[reference_pipeline_db_path]]`).

---

_Pillar-Wiring Sprint | filed 2026-05-29 | DEFERRED post-Sherlock | Ogie msg 7976+7997 | source: brain/4-Pillar-Calibration-2026-05-29.md_
