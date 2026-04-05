---
name: guard
description: Evaluate a wallet transaction through Wallet Guard. 3-state decision (BLOCK/WARN/ALLOW) with schema-frozen interface.
---

# /guard — Wallet Guard

Transaction governance with 3-state evaluation.

## Usage
```
/guard 0x... swap 100           # Evaluate swap of $100
/guard 0x... transfer 50        # Evaluate transfer of $50
/guard --status                 # Show guard state + recent decisions
```

## Decision States
- **BLOCK**: Score <30, honeypot, blacklisted deployer → rejected
- **WARN**: Score 30-69, missing data, CTO flag → human approval needed
- **ALLOW**: Score >=70, security clean, identity verified → proceed

## Schema-Frozen
3 locked schemas with Aldo (CODÉ/AION). No changes without both parties.
Current feature flag: WALLET_GUARD=false (schemas incoming from Aldo)
