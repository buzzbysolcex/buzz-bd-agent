# BankrDeploy — Buzz BD Agent Skill

> Deploy tokens on Base via Bankr Partner API. Earn ~18% of 1.2% swap fee per trade.

## API

- **Endpoint:** `POST https://api.bankr.bot/token-launches/deploy`
- **Auth:** `X-Partner-Key: bk_YOUR_KEY`
- **Chain:** Base (EVM)
- **Rate Limit:** 50/24h (100 Bankr Club)

## Fee Recipient Types

| type | value example | Resolves to |
|------|---------------|-------------|
| wallet | 0x4b36...282Ab | Direct EVM address |
| x | 0xdeployer | Twitter handle → Bankr wallet |
| farcaster | dwr.eth | Farcaster → verified EVM |
| ens | vitalik.eth | ENS → address |

## Rules

1. NEVER deploy prospects with Buzz Score < 70
2. ALWAYS simulate before live deploy
3. Default feeRecipient: Buzz wallet 0x4b362B7db6904A72180A37307191fdDc4eD282Ab
4. Log all deploys to /data/workspace/memory/bankr-deploys.json
5. Live deploys require Ogie approval

## Fee Split

| Role | Share |
|------|-------|
| Creator | 57% |
| Partner (Buzz) | ~18% |
| Bankr | ~18% |
| Ecosystem | ~2% |
| Protocol | 5% |

## Module Location

`/data/workspace/modules/bankr-deploy/bankr-deploy.js`

## Env Var

`BANKR_PARTNER_KEY` — set in Akash SDL

---
*BankrDeploy v1.0.0 — Feb 21, 2026*
