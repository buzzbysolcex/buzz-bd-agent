# orchestrate.js Skill

## Description
Orchestrates the 5 parallel sub-agents (scanner-agent, safety-agent, wallet-agent, social-agent, scorer-agent) to process tokens through the full pipeline.

## Trigger
Keywords: orchestrate, run pipeline, process token, full scan, pipeline run

## Sub-Agents
- **scanner-agent**: L1 token discovery via DexScreener API (Solana/Base)
- **safety-agent**: L2 RugCheck verification + DFlow MCP safety checks
- **wallet-agent**: L2 Helius + Allium on-chain forensics (wallet age, distribution, whale concentration)
- **social-agent**: L3 social research via Grok x_search + Serper + ATV Web3 Identity
- **scorer-agent**: L4 composite 100-point scoring (market 40pts + safety 30pts + team 30pts), threshold 70 = PROSPECT

## Pipeline Flow
1. scanner-agent finds trending/new tokens
2. safety-agent verifies rug check + DFlow
3. wallet-agent analyzes on-chain data
4. social-agent researches social presence
5. scorer-agent computes final score

## Configuration
- Model: bankr/gpt-5-nano
- Timeout: 120s per agent
- Max Concurrent: 8

## Output
Returns scored tokens with:
- Token address, name, symbol
- Market score (0-40)
- Safety score (0-30)
- Team/social score (0-30)
- Total score (0-100)
- PROSPECT status (score >= 70)

## DexScreener API (Free, no key)
- Boosted/Trending: https://api.dexscreener.com/token-boosts/top/v1
- New Listings: https://api.dexscreener.com/token-profiles/latest/v1
- Search: https://api.dexscreener.com/latest/dex/search?q=TOKEN
- Token data: https://api.dexscreener.com/tokens/v1/solana/ADDR

## Usage
@buzz orchestrate
@buzz run pipeline
@buzz process [token_address]
