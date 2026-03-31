---
paths: ["**/*"]
---
# Auto-Handover Rules (CONTEXT SURVIVAL)
- After every git commit: update .claude/HANDOVER.md with current state
- HANDOVER.md format (keep under 100 lines):
  1. DATE + SESSION: what day, what session number
  2. COMPLETED TODAY: list of completed tasks with commit hashes
  3. IN PROGRESS: what's currently being worked on
  4. PENDING: what's next in the queue
  5. BLOCKERS: anything waiting on Ogie or external
  6. SIGNAL STATUS: streak day, signals filed today, cooldown
  7. ACTIVE STATE: container status, last deploy, any errors
- This file is READ ON EVERY BOOT (startup order #3)
- Write it BEFORE git push so it survives in repo
- If session is about to compact, write HANDOVER.md FIRST
