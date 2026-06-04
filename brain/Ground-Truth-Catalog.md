# Ground-Truth Catalog — Pillar 3 Compound

**Purpose:** Catalog of historically-confirmed exploit/loss/theft events extracted from the Lane 4 BitcoinTalk corpus (and future external corpora). Each entry is anchored to a forum post citing the incident. Feeds Pillar 4 bug-research as ground-truth anchors and Pillar 1 token-scoring as historical-deployer / known-exploit-pattern signals.

**Authority:** Created 2026-05-27 as Pillar 3 destination file per `brain/Self-Correction-Filing-Rules.md` RULE 7 (GROUND_TRUTH classification — 1 post = catalog entry). Companion to `brain/Corpus-Digest-Log.md`, `brain/Ground-Truth-Exploits.md` (existing curated catalog), `brain/Lane4-Phase1-Results.md` (existing Phase 1 results).

**External contest GT sets (recall self-diagnostic, Ogie msg 8148):** DODO Cross-Chain DEX (Sherlock #991), Megapot (C4 2025-11), PoolTogether V5 (C4 2024-03), **Ammplify + Panoptic (new, to-acquire)** — class-mapped to Buzz DC/C/Pattern lenses in `brain/Recall-Self-Diagnostic.md` (paper-recall done on DODO: 12/16 covered, weak-spot = encoding/byte-precision; live-recall queued, disk-gated). Used to find Buzz's OWN weak spots, NOT to chase a tool-recall number (Doctrine #19.1).

**Maintenance rule:** the Phase 2 consumer (`scripts/lane4-corpus-phase2-consumer.py`) generates proposals under `data/lane4/phase2-proposals/<date>/Ground-Truth-Catalog-proposals.md`. Operator reviews and appends qualifying entries to Section 1 below.

**Versioning:**

- v1.0 (2026-05-27) — file initialized, awaiting first Phase 2 production run

---

## Section 1 — Catalog entries

**Schema (per entry — copy this block when appending from proposals):**

```
### GT-<topic_id>-<line_no> — <keyword> — <YYYY-MM-DD>

- **Source:** forum/topic=<N>/file=<jsonl>/line=<M>
- **User:** <forum_username>
- **Date (raw):** <as recorded in post>
- **Subject:** <post subject if present>
- **Matched keyword:** `<keyword>`
- **Incident summary (operator one-line):** <human-written gist; what was lost, how, when>
- **Verdict:** [CONFIRMED] / [PROBABLE] / [SECOND-HAND] — operator's grade after review
- **Body excerpt:** <≤500c quote from the post>
- **Cross-references:**
  - Pillar 4: <DC / CANDIDATE if pattern matches a defense class>
  - Pillar 1: <Token-Rug-Pattern if deployer / token signature matches an existing TRP rule>
  - Other brain files: <Ground-Truth-Exploits.md entry if duplicates a curated entry>
```

**Entries (awaiting first Phase 2 production run 2026-06-03):**

_None yet — populated by operator review of `data/lane4/phase2-proposals/<date>/Ground-Truth-Catalog-proposals.md` blocks._

---

## Section 2 — Author productivity (top sources)

**Schema:**

```
| user | entries_anchored | first_seen | last_seen | top_keywords | cross-ref_value |
```

_Populated as catalog grows._

---

## Section 3 — Era productivity (which historical periods yield the most ground-truth)

**Schema:**

```
| era_window | entries | top_incidents | productivity_rank |
```

Hypothesis (per `Corpus-Digest-Log.md` §3): the 2009-2014 era yields the highest ground-truth density because attack surfaces were concentrated on-chain and discussion was open. 2017+ fragments across chains; need supplemental external corpora (Discord exports, Telegram leaks, Twitter archives).

---

## Section 4 — Cross-pillar handoffs

**Schema:**

```
| date | GT-entry | to_pillar | brain_file_target | outcome |
```

Examples of expected handoffs (none filed yet):

- GT entry citing a specific exploited deployer wallet → Pillar 1 `brain/Deployer-Crossref.md` (add deployer to blacklist with GT-anchor)
- GT entry citing a pattern (e.g., "rogue exchange held private keys") → Pillar 4 `brain/Patterns-Defense-Classes.md` (anchor for DC class)
- GT entry providing historical context for a current Lane 5 target → Pillar 4 hunt notes

---

## Section 5 — Maintenance + ops

- Phase 2 consumer runs weekly (Wed 06:00 UTC) — proposals generated under `data/lane4/phase2-proposals/<date>/`
- Operator reviews proposals, copies qualifying entries into Section 1 above
- Each appended entry should add a row to `brain/Corpus-Digest-Log.md` §4 (cross-references)
- No automatic appends — proposal-only routing per the LLM-cost-discipline rule in `BUZZ_RULES.md` #5

---

_Brain Ground-Truth Catalog | v1.0 | 2026-05-27 | File initialized awaiting Phase 2 production run (Wed 2026-06-03). Routing target per Self-Correction-Filing-Rules RULE 7 GROUND_TRUTH classification. Companion: `brain/Corpus-Digest-Log.md`, `brain/Ground-Truth-Exploits.md`, `brain/Lane4-Phase1-Results.md`._
