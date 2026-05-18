---
paths: ["**/cron*", "**/scheduler*", "**/jobs*"]
---

# Cron Rules

- 22 active crons (data collection only) — no LLM calls in crons
- 15 LLM crons DISABLED (Opus Brain replaces them)
- Bot restart cycle ~45min — no setInterval > 15min
- 5 prayer crons are SACRED — never disable or modify timing
- New crons must be documented in Master Ops before deploy
