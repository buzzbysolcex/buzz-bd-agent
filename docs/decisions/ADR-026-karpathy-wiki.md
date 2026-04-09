# ADR-026: Karpathy LLM Knowledge Base Integration

**Date**: 2026-04-09
**Status**: Implemented (scaffolded, flag off)
**Authors**: Buzz BD Agent (Claude Opus 4.6) + Ogie (CEO)
**Supersedes**: —
**Reference**: https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f

## Context

Every Claude Code session on the Buzz BD Agent re-reads CLAUDE.md, path-scoped
rules, and skills from scratch. The hill-climber has 595 ground truth rows but
zero context on _why_ any particular token died or survived. AIBTC signals
require manual research each morning. BuzzShield scans return scores without
compiled threat intelligence. All of this is memory being re-derived from raw
data on every invocation.

Andrej Karpathy's LLM Knowledge Base pattern (April 2025) solves this by
keeping a persistent, self-maintaining set of markdown files that the LLM both
reads and writes. Intelligence compounds. The same context that was expensive
to assemble once becomes cheap to reuse forever.

## Decision

Buzz adopts the Karpathy wiki pattern with the following adaptations for a
24/7 agent running in a Docker container on Hetzner:

1. **Persistence path**: `/data/buzz/persistent/wiki/`
   Already a Docker volume mount used for SQLite. Survives tmux crashes,
   container restarts, code redeploys, server reboots, and ah restarts. Not
   in git (too large, generated content, and we don't want wiki churn in
   code review).

2. **Layout**: four typed subdirs plus index/log:
   - `entities/` — tokens, projects, people, orgs
   - `concepts/` — scoring rules, attack patterns, techniques
   - `synthesis/` — cross-cutting analysis, strategy docs
   - `signals/` — AIBTC signal research by date + beat
   - `raw/` — immutable source documents (Buzz NEVER modifies)
   - `INDEX.md` — auto-regenerated master index
   - `LOG.md` — append-only activity log
   - `WIKI.md` — the schema, single source of truth

3. **Single code surface**: `api/services/wiki/wiki-manager.js`
   Every wiki read/write goes through this module. Exports CRUD, typed
   writers (`createEntityPage`, `createConceptPage`, `createSynthesisPage`,
   `createSignalPage`), query (`findRelevantPages`, `findPageContent`),
   maintenance (`wikiLint`, `wikiStats`, `generateIndex`, `appendLog`),
   and non-blocking hooks (`hookTokenScored`, `hookSignalResearch`).

4. **Feature flag**: `KARPATHY_WIKI: false`
   Stays off by default. All integration points are flag-gated. Ogie flips
   after reviewing seed pages, verifying persistence (docker restart), and
   running a test War Room query that requires wiki synthesis.

5. **autoDream integration**:
   - **Phase 10 (nightly)**: `wikiLint()` — orphans, missing pages, stale
     pages, contradictions. 30 min budget. Result logged in `dream_log`
     under `wikiLintResult`.
   - **Phase 11 (Sundays only)**: ingest — create entity pages for any
     HOT token (score ≥ 70) that doesn't yet have one; regenerate INDEX.md;
     append ingest summary to LOG.md. 60 min budget. Gate:
     `new Date().getUTCDay() === 0`. Result logged under `wikiIngestResult`.

6. **Scoring pipeline hook**:
   `hookTokenScored(token)` is called non-blocking from
   `api/lib/pipeline-persist.js` right after the `upsert` fires. Creates or
   updates the entity page for the scored token. All exceptions swallowed —
   the scoring pipeline must never wait for a wiki write.

7. **Signal factory hook**:
   `hookSignalResearch(beat)` is called from `generateSignalAngles` in
   `api/services/autodream/autodream.js`. Returns a compiled research string
   (up to 5 relevant pages) that gets embedded as a preview in the signal
   draft's `data_points` field so morning Claude Code can pull wiki context
   when hand-writing bodies.

8. **Backup strategy**:
   Host crontab (`claude` user) runs daily at 03:00 UTC:

   ```
   cd /data/buzz/persistent/wiki && tar czf /data/buzz/persistent/backups/wiki-$(date +\%Y\%m\%d).tar.gz . && find /data/buzz/persistent/backups/ -name 'wiki-*.tar.gz' -mtime +7 -delete
   ```

   7-day retention. Health check at 03:30 UTC appends page count + disk
   usage to `raw/health-checks.log`.

9. **Initial seed**: `scripts/wiki-seed.js`
   One-time bootstrap that creates:
   - 20 entity pages from top pipeline_tokens (actual 19 unique; PIPPIN
     dedup'd)
   - 12 concept pages — one per scoring rule with rationale + thresholds +
     example catches + related wikilinks
   - 5 synthesis pages — BuzzShield origin, scoring pipeline v2, MiroFish
     simulation design, AIBTC signal strategy, Wallet Guard trust pipeline
   - 7 partnership entity pages — Aldo/AION, Gary Palmer/ATV, Noah, Flying
     Whale, HeyAnon, Nansen, Bankr
   - INDEX.md + LOG.md
     Result: 26 entities + 12 concepts + 5 synthesis = 43 seed pages, ~50KB
     on disk.

## Alternatives considered

- **Store in SQLite**: Rejected. The wiki is read-most, write-few, graph-
  shaped content that's best manipulated by the LLM via file I/O. A
  database adds a query layer without benefit.
- **Store in git repo**: Rejected. Wiki content evolves daily; every LLM
  edit would be a commit. Git review overhead defeats the speed of the
  pattern. And the wiki is generated content — the code that maintains it
  lives in git, the content doesn't.
- **Store in Obsidian vault**: Conceptually nice, but Obsidian's features
  (graph view, plugins) are user-facing and irrelevant to a headless agent.
  Plain markdown files with `[[wikilinks]]` give us the same interop
  without the dependency.

## Consequences

### Positive

- Every agent session starts with INDEX.md + 3-5 relevant pages instead of
  re-reading raw data.
- Hill-climber can read `scoring-rule-evolution` to make context-aware
  mutations instead of blind number crunching.
- AIBTC signal drafting pulls compiled research from `synthesis/` pages.
- War Room queries hit the wiki first; instant synthesis-quality answers.
- New team members / reboots onboard by browsing `INDEX.md` rather than
  reading all skills + ADRs.
- Persistence survives tmux crashes, container restarts, and code redeploys.
- Zero runtime cost — file I/O, no DB, no network.

### Negative

- Another surface to maintain. Stale pages accumulate if Phase 10 lint is
  not run or ignored.
- Content drift risk: concept pages written today may not reflect rule
  changes made tomorrow. Mitigation: hill-climber updates
  `scoring-rule-evolution.md` after each experiment.
- Non-blocking hooks swallow errors silently. Mitigation: wiki-manager
  already writes to LOG.md on every operation; lint catches orphans.
- Wiki not in git means it's lost if `/data/buzz/persistent/` is wiped.
  Mitigation: daily tarball backup + optional off-server push.

### Neutral

- Flag stays false until Ogie review. Zero operational impact pre-flip.

## Implementation status (as of commit this ADR lands in)

| Step                                 | Status  | Notes                                 |
| ------------------------------------ | ------- | ------------------------------------- |
| Directory structure + WIKI.md schema | DONE    | `/data/buzz/persistent/wiki/`         |
| `KARPATHY_WIKI` feature flag         | DONE    | `api/lib/feature-flags.js:64` (false) |
| `wiki-manager.js` utility            | DONE    | 550+ lines, exports 18 functions      |
| Initial seed (43 pages)              | DONE    | `scripts/wiki-seed.js`                |
| autoDream Phase 10/11                | DONE    | Gated on `KARPATHY_WIKI`              |
| Scoring pipeline hook                | DONE    | `pipeline-persist.js` after upsert    |
| Signal factory research hook         | DONE    | `generateSignalAngles` data_points    |
| CLAUDE.md startup read sequence      | DONE    | Lines 27-29                           |
| Reboot recovery skill update         | DONE    | Step 9 + persistence table            |
| Host crontab (backup + health)       | DONE    | 03:00 + 03:30 UTC                     |
| `KARPATHY_WIKI = true` flip          | PENDING | Ogie decision                         |
| First live lint (Phase 10)           | PENDING | After flag flip                       |
| First live ingest (Phase 11)         | PENDING | Next Sunday after flag flip           |

## Test plan

1. `docker exec buzz-production ls /data/wiki/` → expect 26 entities, 12
   concepts, 5 synthesis, INDEX.md, LOG.md, WIKI.md
2. `docker restart buzz-production` → re-list; expect identical state
3. Ogie reads 2-3 seed pages (e.g., `fdv-gap-penalty.md`,
   `scoring-pipeline-v2.md`, `aldo-aion.md`) and confirms accuracy
4. Flip `KARPATHY_WIKI = true`
5. Wait for first nightly autoDream (02:00 UTC next day)
6. Query dream_log tonight's entry — expect `wikiLintResult` populated
7. Ask War Room: "What do we know about the FDV gap penalty?" — expect
   Buzz to synthesize from `[[fdv-gap-penalty]]` + `[[scoring-pipeline-v2]]`

## Related

- ADR-023 axios supply chain incident — seeded BuzzShield origin synthesis
- ADR-024 Buzz Shield — referenced by `buzzshield-origin-story.md`
- ADR-025 BuzzShield roadmap — referenced by synthesis pages

_Bismillah. The kitchen now writes its own cookbook._
