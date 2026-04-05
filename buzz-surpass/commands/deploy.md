---
name: deploy
description: Deploy smart contracts via Foundry. Base mainnet primary. Gas estimation, verification, and receipt logging.
---

# /deploy — Contract Deployment

Deploy smart contracts to Base mainnet via Foundry.

## Usage
```
/deploy ScoreStorage --chain base       # Deploy contract
/deploy --verify 0x...                  # Verify on block explorer
/deploy --status                        # Show deployed contracts
```

## Deployed Contracts (v9.2)
- ScoreStorage v2: 0xbf81316266dBB79947c358e2eAAc6F338Fa388Fb (Base)
- ListingOracle, ListingEscrow, BuzzReputation (Base)
- ScoreStorage (Solana — not actively called)

## Safety Rules
- NEVER use anet wallet (0x2Dc0...05aA9) as contract owner (EIP-7702 delegated)
- Always use Deployer wallet (0xa57f...9206)
- Gas estimation required before deployment
- Ogie approval required via Telegram
