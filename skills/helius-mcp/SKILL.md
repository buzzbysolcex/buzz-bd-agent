# Helius MCP — Intel Source #19 | L2 Filter

## Assignment
- wallet-agent (L2): wallet forensics
- safety-agent (L2): authority checks

## API Key
HELIUS_API_KEY env var — e4b461c1-9cf2-420e-b6dd-7a837a074355

## Endpoints
- Mainnet RPC: https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}
- Gatekeeper (low latency): https://beta.helius-rpc.com/?api-key=${HELIUS_API_KEY}
- DAS API: https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}

## wallet-agent Tools (L2 Forensics)
Use these instead of raw RPC chaining:

### getAssetsByOwner — deployer wallet holdings
POST https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}
{
  "jsonrpc": "2.0", "id": "1", "method": "getAssetsByOwner",
  "params": { "ownerAddress": "<deployer_wallet>", "page": 1, "limit": 20,
              "displayOptions": { "showFungible": true } }
}
→ Returns: full token holdings with metadata

### getTransactionsForAddress — deployer tx history
POST https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}
{
  "jsonrpc": "2.0", "id": "1", "method": "getTransactionsForAddress",
  "params": { "address": "<deployer_wallet>", "limit": 50 }
}
→ Returns: parsed tx history, rug patterns, previous deploys
→ NOTE: Requires Developer plan. If 403, fall back to getSignaturesForAddress.

## safety-agent Tools (L2 Authority Check)
### getAsset — mint/freeze authority status
POST https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}
{
  "jsonrpc": "2.0", "id": "1", "method": "getAsset",
  "params": { "id": "<contract_address>" }
}
→ Check: authorities.mint (should be null), authorities.freeze (should be null)
→ Scoring: null mint + null freeze = +5 bonus. Active = instant kill.

## Scoring Impact
- Mint authority revoked + freeze revoked → +5 (confirmed via getAsset)
- Deployer wallet clean (no prev rugs) → supports TEAM TOKEN +10
- LP UNVERIFIED penalty (-15) reduced with getAssetsByOwner confirmation

## Rate Limits (Free tier)
- RPC: 10 req/s | DAS: 2 req/s | Credits: 1M/month
- getAsset: 10 credits | getAssetsByOwner: 10 credits
- getTransactionsForAddress: 100 credits (Developer+ only)

## Status: ✅ ACTIVE — Day 11, Mar 5, 2026
