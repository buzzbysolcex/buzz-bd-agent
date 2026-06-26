# Memory-Type Schema (Doctrine #73)

> Ogie intake 2026-06-22, from Gulli _Agentic Design Patterns_ (Memory Management, ch. 8). Gap: the brain blurred memory types — doctrines (PROCEDURAL), negate-registry (SEMANTIC), and filed reports/hunt logs (EPISODIC) all lived in one undifferentiated store, retrieved by grep regardless of role. This schema makes the typing EXPLICIT and routes retrieval by type.

## The four types (tag axis)

| type           | "what it is"                              | the brain stores                                                                                                                                                                            | retrieved FOR                                                                  |
| -------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **procedural** | how to act / rules                        | `brain/Doctrine.md` (Doctrines #19–#77), `.claude/rules/*`, audit-methodology, GATE definitions                                                                                             | GATE checks (GATE-0, custody-model #72, 5-target checklist), pre-flight        |
| **semantic**   | durable generalized facts about the world | `data/lane1/negate-registry.json` (program+scope NEGATEs), `data/lane1/gate0/known-issues.json`, `brain/Watchlist-Candidate-Crossmap.md`, `brain/ev-weights.json` (learned bug-class facts) | DEDUP (scope-aware #69), known-issues pre-flight (#15), EV-class lookup        |
| **episodic**   | what happened, per event                  | `hunts/*.md` (per-hunt narratives), `hunts/intake-log.md`, `brain/Security-Research-Submission-Ledger.md` (per-submission outcomes), `brain/scoreboard.json` (outcome rollup)               | EV ESTIMATION (#75 post-mortem, base-rates), "have I seen this before"         |
| **preference** | operator / self preferences & feedback    | `memory/` files `type:user` + `type:feedback`, `CLAUDE.md` operator directives, the Hyperactive-Formula / posture docs                                                                      | BEHAVIOR/POSTURE decisions (notify-discipline, autonomy-boundary, lane choice) |

## Retrieval routing (the operative rule)

- **GATE-0 / any GATE check** → pull **procedural** (the doctrine/rule) FIRST, then **semantic** (registry + known-issues dedup). Never run a GATE from episodic narrative.
- **Dedup** (is this target/scope/finding already worked?) → pull **semantic** ONLY (negate-registry, known-issues) — keyed by program+scope (#69) / {class,mechanism,impact,component} (#15).
- **EV estimation** (is this hunt/hypothesis worth it?) → pull **episodic** (scoreboard base-rates, past outcomes) × **semantic** (ev-weights bug-class/platform multipliers, #75).
- **Posture / behavior** (notify? reallocate lane? autonomy?) → pull **preference** (operator directives) + **semantic** (scoreboard, #77).

## Backfill (store-level — the correct granularity)

An entry's type = its STORE's type (a store is single-type), EXCEPT `memory/` which is mixed. So the backfill is store-level tagging, not per-line (which would be redundant + low-value):

- `brain/Doctrine.md` + `.claude/rules/*` ⇒ **procedural**
- `data/lane1/negate-registry.json` ⇒ **semantic** (added top-level `"mem_type": "semantic"`)
- `data/lane1/gate0/known-issues.json` ⇒ **semantic**
- `hunts/*.md` + `hunts/intake-log.md` + `Security-Research-Submission-Ledger.md` + `scoreboard.json` ⇒ **episodic**
- `ev-weights.json` ⇒ **semantic** (learned facts), updated FROM episodic via #75
- `memory/` files: map the existing `{user|feedback|project|reference}` axis → this axis:
  - `type:user` → **preference** · `type:feedback` → **preference** · `type:reference` → **semantic** · `type:project` → **episodic** (status/what-happened) unless it states a durable fact (then **semantic**). (Note: ~20 legacy `type:memory` entries → reclassify per content on next touch.)

## Re-trigger

On creating ANY new brain store, declare its `mem_type` up front + which retrieval path consumes it. Cross-ref #75 (episodic→semantic learning), #76 (episodic rollup), #15/#69 (semantic dedup).
