# autoDream — Memory Consolidation Engine

## Pattern

Inspired by Claude Code's autoDream (services/autoDream/).
Runs as event-triggered process or nightly at 02:00 UTC.
4-phase cycle mirrors biological REM sleep consolidation.

## 4 Phases

1. SCAN — inventory all tables, count rows, measure DB size
2. IDENTIFY — find stale data (dead tokens, expired messages, old tasks)
3. CONSOLIDATE — archive/prune/merge/deduplicate
4. OPTIMIZE — VACUUM + ANALYZE (SKIPPED if CPU > 70%, MiroFish protection)

## Triggers

- Event-driven: autodream.trigger from PULSE (10 consecutive idle ticks)
- Scheduled: nightly at 02:00 UTC (with dedup — won't double-run on reboot)
- Manual: POST /api/v1/dream/run (War Room trigger)

## Tables Created

- tokens_archive — archived dead tokens (score < 30, > 14 days old)
- tasks_archive — archived FAILED/CANCELLED tasks (> 48h)
- observation_daily_summary — compressed tick stats per day
- dream_log — dream cycle history and metrics

## What Gets Cleaned

- Dead tokens → archived (keeps address + symbol + last_score)
- Expired mailbox messages → deleted
- Failed/cancelled tasks → archived
- Old observation logs (> 7 days) → compressed to daily summary
- Deactivated crons → deleted
- Old event log entries (> 30 days) → deleted
- Duplicate ARIA discoveries → deduplicated

## Reboot Safety

- dreamRanToday() checks dream_log before nightly execution
- Prevents double-run if container restarts after 02:00 UTC

## Danger Zones

- NEVER delete active tokens (score >= 30 OR updated < 14 days)
- NEVER delete unacked messages less than 24h old
- ALWAYS archive before delete (tokens_archive, tasks_archive)
- VACUUM skipped when CPU > 70% (MiroFish 10K sim protection)
- Dream cycle should complete in < 10 minutes
