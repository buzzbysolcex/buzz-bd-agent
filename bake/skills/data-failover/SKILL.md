# Data Failover Skill

## Description
Handles API failover and fallback logic when intelligence sources are unavailable. Ensures scans complete even when individual APIs fail.

## Trigger
Keywords: failover, fallback, api down, retry, data source error

## Failover Chain (per source)
- DexScreener → GeckoTerminal → skip L1
- RugCheck → contract verification via Blockscout → mark safety "unverified"
- Helius → Allium → mark wallet data "unavailable"
- Grok → Serper → Firecrawl → mark social "pending"
- ATV Web3 Identity → mark identity "unknown"

## LLM Failover (already in openclaw.json)
- Main: MiniMax M2.5 → Gemini 3 Flash → Haiku 4.5 → GPT-5 Nano
- Sub-agents: GPT-5 Nano → Haiku 4.5 (NO Gemini 3 Flash)

## Rules
1. Never block a scan because one source is down
2. Score with available data, note missing sources
3. Log all failovers to Telegram
4. Retry failed sources on next scan cycle
5. Alert Ogie if >2 sources down simultaneously

## Usage
Automatic — triggered by API errors during scan pipeline
