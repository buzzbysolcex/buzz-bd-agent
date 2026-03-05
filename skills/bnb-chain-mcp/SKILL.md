# BNB Chain MCP — Intel Source #18 | L1 Discovery

## Assignment
- scanner-agent (L1): BSC token discovery

## Package
@bnb-chain/mcp (installed globally in Docker)

## BNB_PRIVATE_KEY
Set via BNB_PRIVATE_KEY env var in Akash SDL.
Used for read operations + BSC queries. Never expose.

## scanner-agent Usage
When scanning for token prospects, query BSC in parallel with Solana sources:

### Check BSC token data
Use BNB MCP tool: getTokenInfo
- Input: contract address (BSC format 0x...)
- Returns: name, symbol, decimals, totalSupply, holders

### Check BSC liquidity
Use BNB MCP tool: getLiquidityPools
- Input: token address
- Returns: PancakeSwap/Venus pools, TVL, pair depth

### Cross-chain signal
If a token has BOTH Solana + BSC presence → strong legitimacy signal
Add +5 to score if cross-chain verified

## Wiring Check
On boot, scanner-agent should confirm:
  BNB_PRIVATE_KEY: SET ✅
  BNB MCP: ACTIVE ✅

If BNB MCP shows "unconfigured":
1. Verify BNB_PRIVATE_KEY is set in SDL (not empty)
2. Confirm @bnb-chain/mcp is installed: npm list -g @bnb-chain/mcp
3. Check entrypoint.sh ENV check includes BNB_PRIVATE_KEY

## Status: ✅ ACTIVE — Day 11, Mar 5, 2026 (wiring confirmed)
