# ADR-015: Task Dependency Graph (DAG)

**Date:** March 31, 2026
**Status:** Accepted
**Decision:** Implement DAG-based task orchestration using TaskCreateTool pattern from Claude Code architecture.

**Context:** Claude Code uses task dependency graphs for multi-step workflows. Buzz pipeline (discover → score → screen → outreach) is a natural DAG. Currently sequential with no dependency tracking.

**Consequences:** Pipeline and fan-out patterns. Auto-cascade on completion. 48h expiry. Max 50 pending circuit breaker.
