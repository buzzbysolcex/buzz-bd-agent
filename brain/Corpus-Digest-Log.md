# Corpus Digest Log — Pillar 3 Brain

**Purpose:** Track Phase 2 corpus-consumer runs against the Lane 4 BitcoinTalk scraper output (`data/lane4/corpus/`). Every digest run produces a row. The log surfaces which corpus eras yield the most useful patterns, what classification mix emerges, and which patterns cross-pollinate to Pillars 1 and 4.

**Authority:** Created 2026-05-27 as Pillar 3 Obsidian Mind component (Ogie Four-Pillar Brain Extension directive). Companion to `brain/Lane4-Forum-Intelligence-Doctrine.md` (existing) + `brain/Lane4-Phase1-Results.md` (existing Phase 1 results).

**Companion data:** `data/lane4/corpus/` (812K+ records as of 2026-05-27).

**Versioning:** v1.0 = schema + Phase 1 backfill. v1.1+ = Phase 2 ongoing runs.

---

## Section 1 — Digest run log

**Schema:**

```
| date | phase | era_window | input_records | findings_extracted | classification_mix | brain_files_updated | runtime |
```

Classification mix counts: GROUND_TRUTH / RUG_PATTERN / METHODOLOGY / DETECTOR_SEED

**Existing Phase 1 backfill (per `brain/Lane4-Phase1-Results.md`):**

| date | phase | era_window | input_records | findings_extracted | classification_mix | brain_files_updated | runtime |
|---|---|---|---|---|---|---|---|
| 2026-05-20 | Phase 1 | 2009-2011 (topic IDs 1-30000) | 221,804 posts (corpus) → 1,230 extracted | 1,230 posts across 10 target authors | GROUND_TRUTH dominant | `brain/Lane4-Phase1-Results.md` created | not recorded |

**Phase 2 pending (not yet built):** extension batch (30001-221000 range, 590K+ records) NOT YET consumed. Builds queued in `four-pillar-loop.md` Pillar 3 Phase 3 task list. First Phase 2 run target: Wednesday 06:00 UTC after `scripts/lane4-corpus-phase2-consumer.sh` lands (script not yet written).

---

## Section 2 — Classification stats (running)

Aggregate of all digest runs by classification:

**Schema:**

```
| classification | count_total | last_added | top_5_targets | brain_file_destination |
```

| classification | count_total | last_added | top_5_targets | brain_file_destination |
|---|---|---|---|---|
| GROUND_TRUTH | 1,230 (Phase 1 only) | 2026-05-20 | (10 target authors per Phase1-Results) | `brain/Ground-Truth-Catalog.md` (to be created) + `brain/Lane4-Phase1-Results.md` |
| RUG_PATTERN | 0 | n/a | n/a | `brain/Token-Rug-Patterns.md` (created 2026-05-27, anchors pending) |
| METHODOLOGY | 0 | n/a | n/a | `brain/Doctrine.md` (as CANDIDATE) |
| DETECTOR_SEED | 0 | n/a | n/a | `brain/Patterns-Defense-Classes.md` (as CANDIDATE) |

---

## Section 3 — Era productivity (which corpus eras yield most patterns)

Hypothesis: the 2009-2014 era (Bitcoin's pre-Ethereum years) yields the most foundational security-pattern discussions because all attack surfaces were on-chain and discussed openly. 2017+ shifts to multi-chain and the surface fragments.

**Schema:**

```
| era_window | topic_id_range | posts_consumed | findings_per_1k_posts | top_patterns | productivity_rank |
```

**v1.0 baseline (Phase 1 only):**

| era_window | topic_id_range | posts_consumed | findings_per_1k_posts | top_patterns | productivity_rank |
|---|---|---|---|---|---|
| 2009-2011 | 1-30000 | 221,804 → 1,230 | 5.5 | (TBD) | 1 (baseline) |

Phase 2 runs will populate 2012-2015 (topic IDs 30001-221000) and reveal era-productivity comparison.

---

## Section 4 — Cross-references (corpus → brain compound)

When a corpus finding directly produces a brain compound (doctrine, detector, candidate, ground-truth entry), log the connection.

**Schema:**

```
| corpus_post_id | classification | extracted_finding | brain_file | brain_entry_id | added_date |
```

**v1.0 example format (no real entries yet — first Phase 2 run will produce these):**

```
| forum/topic=N/post=M | DETECTOR_SEED | "2011 discussion of double-spend prevention via timestamping" | brain/Patterns-Defense-Classes.md | CANDIDATE-T-bitcoin-timestamping | 2026-05-XX |
```

---

## Section 5 — Phase 2 consumer specification (pending build)

Per `four-pillar-loop.md` Pillar 3, the Phase 2 consumer is a script that:

1. Reads new JSONL records since last digest checkpoint
2. Scans for pattern-relevant content via keyword + LLM-classification combo:
   - GROUND_TRUTH keywords: "exploit", "lost", "wallet", "private key", "stolen", confirmed-historical incidents
   - RUG_PATTERN keywords: "scam", "rug", "exit", "abandon", token-failure post-mortems
   - METHODOLOGY keywords: "security", "audit", "analyze", "verify" + analysis-pattern discussion
   - DETECTOR_SEED keywords: tool/code/process patterns that could become automated checks
3. Routes findings to brain files per the routing table in `four-pillar-loop.md` Pillar 3
4. Updates this digest log

**Script path (pending):** `scripts/lane4-corpus-phase2-consumer.sh`
**Cron entry (pending):** `0 6 * * 3 cd /home/claude-code/buzz-workspace && bash scripts/lane4-corpus-phase2-consumer.sh` (Wed 06:00 UTC, offset from Sun synthesis)

---

## Section 6 — Daily Lane 4 health check (lightweight)

Per `four-pillar-loop.md` Pillar 3 DAILY block + Hyperactive-Formula Step 7:

- Check PID alive (currently 150428, S state, 2d19h uptime as of 2026-05-27 00:25Z)
- Check disk usage of corpus directory (609M as of 2026-05-27 00:45Z)
- Check checkpoint freshness (`.checkpoint-extension` last updated < 1h ago = healthy)
- Compress completed JSONL batches when over 1GB total
- Log silent-drop incident if PID dead AND checkpoint stale (per Ogie msg 7646)

---

## Section 7 — Corpus → cross-pillar handoffs

**Schema:**

```
| date | corpus_finding | source_post | to_pillar | brain_file_target | outcome |
```

**v1.0 seed (none — first Phase 2 run will produce these).**

**Anticipated handoffs:**
- Historical exploit discussion → Pillar 4 brain/Ground-Truth-Catalog
- Pre-rug warning pattern → Pillar 1 brain/Token-Rug-Patterns
- Audit-methodology insight → Pillar 4 brain/Doctrine (CANDIDATE)
- Tool/code-pattern → Pillar 4 brain/Patterns-Defense-Classes (DETECTOR_SEED)

---

## Section 8 — Maintenance + ops

- Phase 2 runs weekly (Wednesday 06:00 UTC)
- Daily lightweight health check during Step 7 of Hyperactive Formula
- Corpus compression when corpus dir > 1GB OR disk pressure
- Never delete corpus data (archive-only per `four-pillar-loop.md` Pillar 3 autonomy rules)
- Phase 2 consumer LLM cost discipline: route classification through bankr/gpt-5-nano (free) per `BUZZ_RULES.md` #5

---

_Brain Corpus Digest Log | v1.0 | 2026-05-27 | Schema + Phase 1 backfill. Phase 2 consumer build pending. Cross-references: `brain/Lane4-Forum-Intelligence-Doctrine.md`, `brain/Lane4-Phase1-Results.md`, `four-pillar-loop.md` Pillar 3, `brain/Token-Rug-Patterns.md`._
