---
name: dream
description: Trigger or check autoDream nightly memory consolidation. Compresses observation logs, archives dead tokens, vacuums SQLite.
---

# /dream — autoDream Memory Consolidation

Nightly cleanup and memory compression.

## Usage
```
/dream status                   # Check last run + next scheduled
/dream run                      # Trigger manual consolidation
/dream log                      # Show consolidation report
```

## What autoDream Does (02:00 UTC)
1. Compress observation_log into daily summaries
2. Archive dead tokens (no activity >30 days)
3. Archive completed tasks (task-dag cleanup)
4. Clean expired crons (dynamic-cron cleanup)
5. SQLite VACUUM (reclaim disk space)
6. Reboot dedup: dreamRanToday() prevents double-run

First run: Apr 3, 2026 — 49 records cleaned.
Feature flag: AUTODREAM=true
