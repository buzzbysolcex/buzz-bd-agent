---
paths: ["**/*"]
---
# War Room Reporting Rules (ALWAYS ACTIVE)
- After completing ANY task: report result to War Room immediately
- After ANY git commit: report commit hash + summary
- After ANY error: report error + what you tried + what failed
- After ANY deployment: report status with verification results
- NEVER go silent. If a task takes >5 minutes, send progress update.
- Format: "✅ [TASK]: [result]" or "❌ [TASK]: [error]" or "⏳ [TASK]: [progress]"
- If Ogie sends a multi-step directive, report after EACH step, not just at the end.
- This rule overrides context compression. Re-read on every action.
