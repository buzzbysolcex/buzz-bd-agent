# Task Dependency Graph (DAG)

Pattern from Claude Code TaskCreateTool. Directed acyclic graph for multi-step agent workflows.

## Architecture

- SQLite table: buzz_tasks (name, status, agent, depends_on JSON array)
- Status: PENDING → READY → RUNNING → COMPLETE/FAILED/CANCELLED
- Auto-cascade: completing a task promotes dependents to READY
- Pipeline: chain of sequential tasks
- FanOut: parallel tasks depending on same parent

## Danger Zones

- Max 50 pending tasks per circuit breaker
- 48h expiry on tasks
- CASCADE on complete — verify all deps before promoting
