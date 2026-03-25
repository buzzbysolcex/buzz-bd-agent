---
paths: ["**/database*", "**/db*", "**/*.sql", "**/migration*", "**/schema*"]
---
# Database Rules
- SQLite WAL mode at /data/buzz-api/buzz.db
- 55 tables — NEVER DROP without explicit Ogie approval
- Backup DB before any schema migration: cp buzz.db buzz.db.bak.$(date +%s)
- Use parameterized queries — no string concatenation for SQL
- Test all migrations on local copy first
- pipeline_tokens is the critical table — verify writes after any pipeline change
