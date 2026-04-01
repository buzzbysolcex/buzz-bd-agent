# ADR-016: autoDream Memory Consolidation

**Date:** April 2026 (Frontier Build Phase)
**Status:** Accepted
**Decision:** Add 4-phase memory consolidation engine inspired by Claude Code autoDream

**Context:**
Claude Code's autoDream runs as a forked subagent between sessions to prune,
merge, and optimize memory. Buzz's 68+ SQLite tables accumulate stale data.
Without cleanup, DB grows indefinitely and agent context degrades.

**Decision:**
- 4-phase cycle: scan → identify → consolidate → optimize
- Archive before delete (tokens_archive, tasks_archive)
- Compress observations to daily summaries after 7 days
- Nightly at 02:00 UTC + event-triggered from PULSE idle threshold
- dreamRanToday() prevents double-run on reboot
- VACUUM skipped when CPU > 70% (MiroFish protection)

**Consequences:**
- DB stays lean: dead tokens archived, expired messages purged
- VACUUM reclaims disk space after deletions
- No data loss: archives preserve address + score for historical analysis
- Reboot-safe: nightly dream won't double-execute

**Reference:** Claude Code `services/autoDream/`, KAIROS memory consolidation
