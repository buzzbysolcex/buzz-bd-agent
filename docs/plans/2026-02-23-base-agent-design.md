# BaseAgent Class Design — Buzz v6.0

## Overview

Foundation class for the Buzz v6.0 sub-agent architecture. Six sub-agents (Scanner, Scorer, Safety, Wallet, Social, Deploy) will inherit from this class. Inspired by the Manus AI architecture pattern: structured event logging, file-based memory externalization, and clean lifecycle management.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Inheritance model | ABC with `@abstractmethod` | Enforces execute() at class definition time |
| Status management | `run()` lifecycle wrapper | Sub-agents don't touch status directly |
| Event persistence | In-memory list + auto-append JSONL | Survives crashes, enables audit trail |
| Scratchpad path | `BUZZ_SCRATCHPAD_DIR` env var, fallback `data/scratchpad` | Works local + Akash production |
| Timestamp format | `time.time()` (Unix float) | Simple, sortable |
| Scratchpad format | JSON files (one per key) | Human-readable, matches existing memory/ pattern |
| LLM context | `context()` method returns recent state | Manus "pin plan in recency" pattern |

## Interface

```
BaseAgent (ABC)
  __init__(name: str)
  run(params: dict) -> dict         # lifecycle wrapper — manages status transitions
  execute(params: dict) -> dict     # abstract — sub-agents implement this
  log_event(type, desc, data)       # typed event + JSONL auto-persist
  write_scratchpad(key, data)       # write JSON to scratchpad dir
  read_scratchpad(key) -> Any       # read JSON from scratchpad dir
  context(max_events: int) -> dict  # recent state for LLM prompting
```

## Status States

`idle` -> `running` -> `complete` | `error`

Managed automatically by `run()`. Sub-agents never set status directly.

## Event Types

- `action` — agent is doing something (scanning, scoring, calling API)
- `observation` — agent received a result
- `error` — something failed
- `decision` — agent made a choice (e.g., score threshold, skip token)

## Data Flow

```
Orchestrator calls agent.run(params)
  -> status = "running"
  -> log_event("action", "{name} starting")
  -> self.execute(params)  [sub-agent logic]
     -> sub-agent calls log_event() during execution
     -> sub-agent calls write_scratchpad() for results
  -> on success: status = "complete", log observation
  -> on exception: status = "error", log error, re-raise
  -> return result dict
```

## File Layout

```
$BUZZ_SCRATCHPAD_DIR/    (default: data/scratchpad/)
  {agent_name}/
    events.jsonl         # append-only typed event log
    {key}.json           # scratchpad data files
```

## What's Not Included (YAGNI)

- No retry logic — sub-agents handle their own
- No serialization (to_dict/from_dict) — add when orchestrator needs it
- No event filtering/querying — just a list + file
- No inter-agent communication — orchestrator manages data flow

## Error Handling

- `run()` catches all exceptions from `execute()`
- Errors logged as events before re-raising (Manus: leave errors in context)
- Sub-agents handle API-specific errors inside `execute()`

## Dependencies

- Python stdlib only: `abc`, `json`, `os`, `time`, `typing`
- No external packages needed for BaseAgent
