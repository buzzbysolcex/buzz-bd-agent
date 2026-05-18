# PULSE Engine — KAIROS-Class Tick System

## Pattern

Inspired by Claude Code's KAIROS proactive mode. Unreleased feature gated
behind PROACTIVE + KAIROS flags in Claude Code source (150+ references).
Buzz implements the same pattern: heartbeat ticks → evaluate context →
decide act/sleep → adaptive interval → autoDream trigger on sustained idle.

## Architecture

- pulse-engine.js — tick loop, context gathering, action decision, execution
- observation-schema.js — creates observation_log + pulse_state tables
- Tick interval starts at 60s, doubles on idle, caps at 5min (cache boundary)
- Blocking budget: 15s max per proactive action (KAIROS spec)
- After 10 consecutive idle ticks → emit autodream.trigger event
- All decisions logged to observation_log table (Task 16)
- All engine state persisted in pulse_state table (survives reboots)
- Load-aware: auto-throttles to 5min ticks when CPU > 80%

## Integration Points

- Event Bus (Task 11): emits pulse.act, pulse.sleep, autodream.trigger
- Mailbox (Task 8): checks unacked messages as action trigger
- Task DAG (Task 9): checks READY tasks as action trigger
- Dynamic Crons (Task 10): checks due crons as action trigger
- ARIA: triggers discovery scan during 05:00-07:00 UTC window
- Signal Agent: streak protection check at 16:00 UTC

## Decision Priority (rule-based, zero LLM burn)

0. CPU > 80% → SLEEP (only streak protection allowed at 16:00 UTC)
1. Unacked mailbox messages > 50 → cleanup
2. READY tasks waiting → process
3. Due crons → fire
4. ARIA discovery window (05:00-07:00 UTC) → trigger scan
5. Streak protection (16:00 UTC) → check daily signals
6. None of above → SLEEP (increase interval)

## Persistence (ALL state survives reboots)

- tick_count → pulse_state table
- consecutive_idle → pulse_state table
- current_interval_ms → pulse_state table
- last_tick_at → pulse_state table
- total_restarts → pulse_state table (incremented each boot)
- engine_started_at → pulse_state table

## Tables

- observation_log — append-only tick decisions
- pulse_state — key/value persistent engine state

## Danger Zones

- NEVER let PULSE create tasks that create more PULSE ticks (recursion)
- PULSE is infrastructure, NOT an agent — it orchestrates agents
- If CPU load > 80%, force 5min interval (MiroFish sim protection)
- The 15s blocking budget is a HARD LIMIT — defer anything slower
- In-memory variables for state are BANNED — use pulse_state table only
