# Bankr Token Deploy Skill

## Description
Deploy tokens via Bankr CLI and Partner API on Base chain. Handles token creation, simulation, and fee management.

## Trigger
Keywords: deploy token, launch token, bankr deploy, create token, token launch

## Bankr CLI Commands
- `bankr deploy "TokenName" TICKER "description"` — Deploy a new token
- `bankr deploy --simulate "TokenName" TICKER` — Simulate without gas
- `bankr balance` — Check wallet balance
- `bankr launches` — List recent launches
- `bankr fees` — Check accumulated fees

## Partner API
- Endpoint: POST https://api.bankr.bot/token-launches/deploy
- Header: X-Partner-Key (from BANKR_PARTNER_KEY env)
- Docs: https://docs.bankr.bot/token-launching/partner-api

## Fee Structure (1.2% swap fee)
- Creator (feeRecipient): 57%
- Bankr platform: ~18%
- Partner (Buzz/SolCex): ~18% (50% of Bankr share)
- Ecosystem: ~2%
- Protocol (Doppler): 5%

## Wallets
- Fee Wallet: 0x2Dc03124091104E7798C0273D96FC5ED65F05aA9
- Deploy Wallet: 0xfa04c7d627ba707a1ad17e72e094b45150665593

## Usage
@buzz deploy TokenName TICKER "description"
@buzz simulate TokenName TICKER
@buzz check fees
