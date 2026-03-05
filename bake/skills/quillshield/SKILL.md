# QuillShield Skill

## Description
Smart contract safety analysis and verification. Cross-references RugCheck results with on-chain contract data for comprehensive safety scoring.

## Trigger
Keywords: quillshield, contract safety, verify contract, check contract, audit

## Safety Checks
1. **Mint Authority** — Is mint revoked? (CRITICAL for Solana)
2. **Freeze Authority** — Is freeze disabled? (Solana)
3. **Contract Verified** — Source code verified on explorer? (EVM)
4. **LP Locked** — Is liquidity locked or burned?
5. **Top Holder Concentration** — >50% = penalty
6. **Honeypot Detection** — Can tokens be sold?
7. **Proxy Contract** — Is it upgradeable? (risk)

## Data Sources
- RugCheck API: https://api.rugcheck.xyz/v1/tokens/{address}/report (Solana)
- Blockscout: https://base.blockscout.com/api/v2/addresses/{address} (Base/ETH)
- DFlow MCP: Safety checks via OpenClaw MCP integration

## Scoring Impact
- Contract verified: +10 safety points
- Mint not revoked: -10 (instant kill)
- LP locked: +10 safety points
- Top holder >50%: -10 penalty

## Usage
@buzz verify [contract_address]
@buzz safety check [contract_address]
