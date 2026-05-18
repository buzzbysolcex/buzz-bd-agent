# ADR-015: PULSE Engine (KAIROS-Class Tick System)

**Date:** April 2026 (Frontier Build Phase)
**Status:** Accepted
**Decision:** Add heartbeat tick evaluation loop inspired by Claude Code KAIROS

**Context:**
Claude Code source leak (Mar 31, 2026) exposed KAIROS — an unreleased always-on
proactive agent mode with tick-based heartbeat, SleepTool for cost-aware idle,
and 15-second blocking budget. Buzz v9 already has event bus and mailbox but
lacks the proactive orchestration layer that ties them together.

**Decision:**

- PULSE engine: 60s tick loop with adaptive sleep (doubles on idle, caps at 5min)
- Rule-based context evaluation (zero LLM burn)
- 15s blocking budget per proactive action
- All state persisted in SQLite pulse_state table (survives reboots)
- Load-aware: auto-throttles to 5min when CPU > 80% (MiroFish protection)
- Integrates with mailbox (Task 8), task DAG (Task 9), crons (Task 10), events (Task 11)
- autoDream trigger after 10 consecutive idle ticks

**Consequences:**

- Agents wake proactively without cron polling
- ARIA discovery, streak protection, cron firing become tick-driven
- Foundation for autoDream (Task 15) consolidation
- No additional LLM cost (rule-based decisions)
- Same CPX62 hardware — PULSE is lightweight, single setTimeout loop
- State persists across reboots — tick 4,827 continues at 4,828

**Reference:** Claude Code KAIROS (`src/assistant/`), SleepTool, proactive mode
