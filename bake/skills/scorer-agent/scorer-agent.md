# scorer-agent Skill

## Description
Calculates composite scores for tokens using the 4-category system. Tokens scoring 70+ become PROSPECTS for SolCex listing.

## Scoring Formula (100-point system)

### Market Score (40 pts max)
| Criterion | Points |
|-----------|--------|
| Liquidity > $100K | 15 |
| Volume 24h > $50K | 10 |
| FDV reasonable (< 10x liquidity) | 10 |
| Price trend stable (not dumping >20%) | 5 |
| Holder count > 1000 | +5 bonus |

### Safety Score (30 pts max)
| Criterion | Points |
|-----------|--------|
| Contract verified on Explorer | 10 |
| No mint authority risk (no Pump.fun/centralized) | 10 |
| Liquidity locked | 10 |
| Top holder concentration > 50% | -10 penalty |

### Team/Social Score (30 pts max)
| Criterion | Points |
|-----------|--------|
| Team doxxed/identified | 10 |
| Community > 1K members | 10 |
| Active social presence (Twitter/Telegram) | 10 |

## Wallet Data Integration
Wallet forensics feeds INTO market and safety as intelligence:
- Holder distribution → Market bonus (if >1000 holders = +5)
- Top holder concentration → Safety penalty (if >50% = -10)
- Deployer wallet age → Safety intelligence
- Whale activity → Market intelligence

## Output Categories
| Score | Status |
|-------|--------|
| 70+ | PROSPECT - Send to Ogie for review |
| 50-69 | WATCHLIST - Monitor |
| <50 | SKIP - Not interested |

## Output Format
```json
{
  "token": "SYMBOL",
  "address": "TOKEN_ADDRESS",
  "chain": "solana/base",
  "scores": {
    "market": {"score": X, "max": 40, "details": [...]},
    "safety": {"score": X, "max": 30, "details": [...]},
    "team_social": {"score": X, "max": 30, "details": [...]}
  },
  "total": X,
  "status": "PROSPECT|WATCHLIST|SKIP"
}
```

## Usage
@buzz score TOKEN_ADDRESS
@buzz rate TOKEN_ADDRESS
