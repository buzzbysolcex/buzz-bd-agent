# Supermemory Semantic Memory Layer — v7.1.0

## Overview

Supermemory adds persistent semantic memory to Buzz BD Agent. Strategic decisions, token evaluations, and outreach outcomes are captured and recalled across agent sessions, enabling pattern recognition and improved decision quality over time.

## Architecture

```
Sub-Agents → Context Engine → [Supermemory Recall] → Decision Engine → [Supermemory Capture]
                                    ↕                                        ↕
                          api.supermemory.ai/v3                    api.supermemory.ai/v3
                          POST /memories/search                    POST /memories
```

### Components Modified

| File | Change |
|------|--------|
| `entrypoint.sh` | Block 11e: installs OpenClaw plugin, sets env vars |
| `api/lib/context-engine.js` | `_recallFromSupermemory()`, `captureToSupermemory()`, `assemble()` made async |
| `api/lib/decision-engine.js` | Captures decisions after SQLite write, awaits async `assemble()` |
| `api/routes/strategy.js` | `/context/:token` route awaits async `assemble()` |

### Data Flow

1. **Recall** (in `ContextEngine.assemble()`): Before sub-agent outputs are injected, Supermemory is queried with `{ticker} {chain} token evaluation listing`. Up to 5 semantically similar past memories are included in the context block.

2. **Capture** (in `DecisionEngine._logDecision()`): After every strategic decision is written to SQLite, a summary is fire-and-forget captured to Supermemory with metadata (token address, chain, decision type, score).

## Environment Variable

Add to your Akash SDL `env` block:

```yaml
SUPERMEMORY_OPENCLAW_API_KEY: "sm_..."
```

This single key enables both the OpenClaw plugin (auto-recall/capture in chat sessions) and the REST API integration (recall/capture in the strategic orchestrator).

### Auto-set Variables (by entrypoint.sh)

| Variable | Value | Purpose |
|----------|-------|---------|
| `SUPERMEMORY_CONTAINER_TAG` | `buzz_bd_agent` | Namespace for all memories |
| `AUTO_RECALL` | `true` | OpenClaw plugin auto-recalls in chat |
| `AUTO_CAPTURE` | `true` | OpenClaw plugin auto-captures in chat |
| `MAX_RECALL_RESULTS` | `5` | Limit recall to 5 results |
| `PROFILE_FREQUENCY` | `25` | Profile update every 25 interactions |
| `CAPTURE_MODE` | `all` | Capture all interactions |

## Privacy & Security Rules

The following data is **NEVER** captured to Supermemory:

- Commission amounts (`commission`, `$1K`, `$1,000`)
- Listing fees (`5K USDT`, `listing fee`)
- API keys (patterns: `api_key=`, `sk-...`, `sm_...`)
- Private/wallet keys (`private_key=`, `wallet_key=`)
- Bearer tokens (`Bearer ...`)
- Any secret values (`secret=...`)

When sensitive data is detected, the capture is silently skipped with a log line:
```
[Supermemory] BLOCKED: Sensitive data
```

## Graceful Degradation

Supermemory is entirely optional. If the env var is not set or the API is unreachable:

- **No env var**: All Supermemory code paths are skipped. No errors.
- **API timeout/error**: `_recallFromSupermemory()` returns `[]`, `captureToSupermemory()` logs a warning and returns. Neither blocks the main flow.
- **Plugin install failure**: Logged as non-critical warning. Agent operates normally without the OpenClaw plugin.

All Supermemory calls use try/catch with timing logs for observability.

## Boot Banner

The boot banner includes a Supermemory status line:
```
Supermemory:   ✅ ACTIVE (container: buzz_bd_agent)
```
or
```
Supermemory:   ❌ DISABLED (SUPERMEMORY_OPENCLAW_API_KEY not set)
```

## API Endpoints

Supermemory is used internally by the strategic orchestrator. No new REST endpoints are exposed. The recall results appear in the context assembly visible via:

```
GET /api/v1/strategy/context/:token?chain=solana
```

## Container Tag

All memories are tagged with `buzz_bd_agent` to isolate Buzz's memories from any other agents sharing the same Supermemory account.
