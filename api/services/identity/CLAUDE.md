# ATV Web3 Identity — Deployer Verification

## Pattern
Resolves ENS names + social accounts for token deployer addresses via ATV Web3 Identity API.
x402 payment ($0.01 USDC on Base per call). Only called for tokens scoring 70+.

## API
- Endpoint: GET https://api.web3identity.com/api/ens/batch-resolve
- Params: ?addresses=addr1,addr2&include=name,twitter,github
- Payment: x402 on Base (USDC), $0.01/call
- Rate limit: 10 req/min

## Scoring Rules
- ENS + twitter OR github = IDENTITY_VERIFIED (+5 pts)
- ENS only = ENS_HOLDER (+3 pts)
- No ENS = ANON_DEPLOYER (-3 pts)
- ANON + wallet age < 30 days = compound risk (-8 combined)

## Tables
- identity_cache: 24h cache per address (saves x402 costs)
- x402_payments: payment audit log

## Gates
- Feature flag: ATV_IDENTITY
- Score >= 70 only
- EVM chains only (ETH/Base/BSC/Arbitrum)
- Cache check before API call
- Deployer address (not pair contract)

## Danger Zones
- x402 payment requires funded wallet — check balance before batch
- Never resolve DEX pair addresses — only deployer addresses
- 24h cache is critical — without it, costs multiply on re-scores
- Budget: ~$0.30-0.50 per scoring run, ~$45/month max
