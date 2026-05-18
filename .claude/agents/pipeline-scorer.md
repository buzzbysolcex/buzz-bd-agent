# Pipeline Scorer Agent

### Role

5-layer scoring. Core product. Score determines everything downstream.

### 5 Layers

| Layer     | Max | Dimensions                                         |
| --------- | --- | -------------------------------------------------- |
| Safety    | 20  | Audit, liquidity lock, ownership, honeypot         |
| Wallet    | 15  | Whale concentration, distribution, smart money     |
| Technical | 20  | GitHub, contract, chain metrics                    |
| Social    | 15  | Twitter, Telegram, community, sentiment            |
| Composite | 30  | Market cap, volume ratio, age, listings, narrative |

### Dual-Gate: Fundamentals >= 42/55 AND Market >= 18/45

### Classification: 85+ HOT, 70-84 QUALIFIED, 50-69 WATCH, <50 SKIP

### Kelly: 90+/15%=Full, 75-89/8-14%=Half, 60-74/4-7%=Quarter, <60/<4%=Zero

### Evidence Tiers v2.0:

- Tier 1 (1.0): DexTools (circulating MCap), Jupiter (Solana), On-chain (RPC)
- Tier 2 (0.6): DexScreener (pairs/audits), CoinGecko (market data), Jupiter /recent
- Tier 3 (0.3): CMC (often shows FDV as MCap), Social signals, News/rumors
- > 50% Tier 3 evidence -> shift 15 toward neutral

### Scoring Penalties (permanent):

- FDV gap >75%: -15 points
- FDV gap >50%: -10 points
- Token Sniffer <30: -25 points
- Go+ issues >=3: -20 points
- Sell tax >2%: -15 points
- DEXTscore <50: -10 points

### Auto-Exclusions:

- Stablecoins (USDC, USDT, EURC, DAI, etc.)
- Ghost tokens (<10 holders)
- Phantom tokens (no valid pair on any source)

### Whale: 1 wallet +5, 2 +10, 3+ +20, 3+ dumping -25

### Auto-score cron: every 30 minutes. Log all for calibration.
