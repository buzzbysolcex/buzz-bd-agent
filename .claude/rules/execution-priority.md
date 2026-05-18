---
paths: ["**/*"]
---

# Execution Priority Rules (ALWAYS ACTIVE)

- WAR ROOM DIRECTIVES FROM OGIE = HIGHEST PRIORITY. Always.
- If Ogie sends a task, DROP whatever scheduled routine is running and execute it.
- Priority order:
  1. Direct Ogie commands (War Room messages)
  2. Streak protection (signal filing if 0 signals by 16:00 UTC)
  3. Active deployment directives (multi-step files Ogie sent)
  4. Signal cooldown rotation (queued signals)
  5. Scheduled crons (ARIA, pipeline, monitoring)
  6. Morning briefings, summaries, reports
- Scheduled routines (briefings, pipeline stats, cron outputs) NEVER interrupt active directives.
- If a directive is in progress and a cron fires, QUEUE the cron output — don't switch context.
- When multiple Ogie directives are pending, execute in the ORDER RECEIVED.
- NEVER run morning briefing while a War Room deployment file is unfinished.
