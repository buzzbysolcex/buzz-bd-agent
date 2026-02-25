# Sub-Agent Delegation Design

Issue: #9 — Add sub-agent delegation to OrchestratorAgent

## Problem

The OrchestratorAgent calls sub-agents via `_run_agents_parallel` with a flat 30s timeout and no structured delegation metadata. There is no public API for delegation, no per-depth timeout tuning, no escalation chain tracking, and no ability to delegate to a subset of agents.

## Solution

Add a dataclass-driven delegation protocol: `DelegationResult` and `AgentOutcome` dataclasses, a public `delegate()` method, per-depth timeouts, selective agent subsets, and escalation path tracking.

## Data Structures

```python
@dataclass
class AgentOutcome:
    agent_name: str
    score: Optional[int]       # None if failed
    result: Optional[Dict]     # Raw agent result
    elapsed_ms: float          # Wall-clock time for this agent
    error: Optional[str]       # Error message if failed/timed out

@dataclass
class DelegationResult:
    agent_outcomes: Dict[str, AgentOutcome]
    depth: str
    timeout_used: int
    started_at: float          # time.monotonic()
    elapsed_ms: float          # Total delegation wall-clock
    escalation_path: List[str] # e.g. ["quick"] or ["quick", "deep"]
```

## Constants

```python
DEPTH_TIMEOUTS = {"quick": 10, "standard": 20, "deep": 45}
```

Replaces the flat `AGENT_TIMEOUT = 30`.

## Public API

```python
async def delegate(
    self,
    token_data: Dict,
    depth: str = "quick",
    agents: Optional[List[str]] = None,  # None = all 5 agents
) -> DelegationResult
```

- Builds agent params via `_build_agent_params`
- Filters to requested agent subset (or all)
- Runs agents in parallel via `_run_agents_parallel` with depth-specific timeout
- Wraps each agent's outcome in `AgentOutcome` (with timing and error info)
- Returns `DelegationResult`

## Refactoring

- `_run_agents_parallel` gains a `timeout` parameter (defaults to depth lookup)
- `_evaluate_single_token` calls `delegate()` instead of `_run_agents_parallel` directly
- Escalation chain tracked by passing `escalation_path` through recursive calls
- Merged result gains `escalation_path` and `delegation_meta` fields

## What Stays the Same

- `_merge_results`, `_redistribute_weights`, `_compute_unified_verdict` — no changes
- `_build_agent_params` — no changes
- All existing tests continue to pass (backward-compatible)

## Testing

- `AgentOutcome` and `DelegationResult` construction
- `delegate()` with all agents, subset, empty subset
- Per-depth timeout verification (quick=10s, standard=20s, deep=45s)
- Agent subset filtering
- Escalation path tracking (quick -> standard, quick -> deep)
- Timing metadata populated correctly
- Error/timeout captured in `AgentOutcome.error`
- Integration: `_evaluate_single_token` uses `delegate()` and result includes delegation metadata
