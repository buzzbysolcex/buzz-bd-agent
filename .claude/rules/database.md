---
paths: ["**/database*", "**/db*", "**/*.sql", "**/migration*", "**/sqlite*"]
---

# Database Rules

- SQLite WAL mode at /data/buzz-api/buzz.db
- 58+ tables — NEVER DROP without explicit Ogie approval
- Backup before any schema migration
- Use parameterized queries — no string concatenation
- Test migrations on local copy first
- aria_tokens table: upsert on address+chain
