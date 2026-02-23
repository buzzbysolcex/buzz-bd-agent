# Orchestrator Agent Design

## Overview

Central coordinator that wires all 7 sub-agents together. Inherits from BaseAgent. Owns the full pipeline: scan (Layer 1) then parallel evaluate (Layer 2) then merge then verdict then persist.

## Architecture

Flat Orchestrator pattern: single `OrchestratorAgent` class in `src/agents/orchestrator.py`. No pipeline abstraction, no event bus. Follows existing agent conventions.

## Class Structure

```python
class OrchestratorAgent(BaseAgent):
    AGENT_WEIGHTS = {"safety": 0.25, "wallet": 0.25, "social": 0.20, "scorer": 0.15, "deploy": 0.15}
    STRONG_LIST_THRESHOLD = 80
    LIST_THRESHOLD = 60
    REVIEW_THRESHOLD = 40
    STANDARD_ESCALATION = 50
    DEEP_ESCALATION = 70
    AGENT_TIMEOUT = 30  # seconds
```

Sub-agents instantiated once in `__init__`, stored in `self._agents` dict. Scanner stored separately as `self._scanner`.

## Pipeline Flow

### execute(params)

Two modes:
- `mode="scan"`: Full pipeline. Calls ScannerAgent.run(), iterates tokens, evaluates each via _evaluate_single_token().
- `mode="evaluate"`: Single token evaluation.

### _evaluate_single_token(token_data, depth)

1. Build per-agent params from unified token_data
2. Run 5 Layer 2 agents in parallel via asyncio.gather with asyncio.wait_for (30s timeout each)
3. Merge results (weighted average, flag compilation)
4. Depth escalation: if quick and score >= 70 -> re-eval at deep; if score >= 50 -> re-eval at standard
5. Persist to scratchpad

### Token Data Input Format

```python
{
    "token_address": str,
    "deployer_address": str,  # optional, may be empty
    "chain": str,
    "project_name": str,
    "market_data": {"mcap": float, "volume_24h": float, "liquidity": float},
}
```

## Result Merging

### Weight Redistribution

Proportional: if agent fails, its weight distributed proportionally across survivors. `weight / sum(surviving_weights)`.

### Unified Score

Weighted average of agent scores (0-100), clamped.

### Unified Verdict

- Score >= 80: STRONG_LIST
- Score >= 60: LIST
- Score >= 40: REVIEW
- Score < 40: REJECT

Critical flag override: `safety:honeypot_detected`, `wallet:serial_rugger`, `wallet:bundled_wallets` force REJECT regardless of score.

### Flag Namespacing

All flags prefixed with agent name: `"safety:honeypot_detected"`, `"wallet:lp_burned"`.

## Error Handling

- Per-agent timeout: 30s via asyncio.wait_for
- Failed agents return None, excluded from scoring
- Weights redistributed proportionally
- If all agents fail: score = 0, verdict = REJECT
- Events logged for all failures

## Telegram Formatting

Methods on Orchestrator:
- `format_scan_result(scan_result)`: Summary + top 10 passing tokens
- `format_evaluate_result(eval_result)`: Full breakdown with agent scores, flags, failed agents

## Depth Escalation

Inline per-token: evaluate at quick, check unified score, immediately re-evaluate at higher depth if threshold met. Bounded recursion (quick -> standard -> deep, never deeper).

## Testing Strategy (47 tests)

1. Constructor & Setup (3): name, sub-agents, constants
2. Parallel Execution (7): all succeed, timeouts, exceptions, all fail, concurrency
3. Weight Redistribution (6): no failures, 1-4 failures, all fail, ratio preservation
4. Result Merging (7): weighted avg, failures, namespaced flags, clamping, all-fail
5. Verdict Logic (8): each verdict level, critical overrides, boundary values
6. Depth Escalation (6): no escalation, escalate to standard/deep, depth passthrough
7. Pipeline/execute (5): scan mode, evaluate mode, invalid mode, scratchpad, summary
8. Telegram Formatting (5): scan/evaluate formatting, empty, failures
