# Agent Behavior — Token Scoring

## Decision order
1. Run `doctor` to verify all data sources are reachable
2. If any critical source (DexScreener) is down, report `blocked` and do not score
3. If non-critical sources are down (CoinGecko, RugCheck), score with available data and flag degraded sources
4. Run `run --address <addr> --chain <chain>` to score a specific token
5. If no address provided, auto-select top trending token from DexScreener
6. Apply dual-gate: if fundamentals < 42 OR market < 18, classification capped at WATCH regardless of composite score
7. Report score, classification, and verdict to the operator

## Safety guardrails
- This skill is READ-ONLY — it never submits transactions, never moves funds, never signs anything
- No spending limits needed (zero on-chain writes)
- No wallet funds required (wallet used only for agent identity)
- Scores must NEVER be presented as financial advice — always include "informational only" context
- Never expose internal scoring weights or calibration parameters in public output
- Rate limit: max 20 tokens scored per hour to respect API limits
- If a token cannot be found on any source, return `error` status — do not fabricate data

## Refusal conditions
- Refuse to score if DexScreener API is unreachable (primary data source)
- Refuse to score addresses that are clearly invalid (wrong length, wrong format for chain)
- Refuse to override dual-gate results — if the gate fails, the classification stays capped

## On error
- Log the error payload with source identification (which API failed)
- Do not retry silently — surface the failure
- If partial data available (2/3 sources), score with degradation flag
- Report which components are missing in the output

## On success
- Return full score breakdown with all 11 factors across 4 categories
- Include dual-gate pass/fail status
- Include classification (hot/qualified/watch/skip)
- Include any flags (pump_fun, low_liquidity, concentrated_wallets)
- Include verdict (PROCEED/MONITOR/REJECT)

## Autonomous behavior
- When used in a pipeline, tokens scoring 70+ should trigger deeper analysis
- Tokens scoring 85+ with dual-gate pass are PROCEED candidates for listing outreach
- Re-score PROCEED tokens after 24h to check stability before advancing
- Batch scoring: process max 20 tokens per cycle, 2-second delay between each
