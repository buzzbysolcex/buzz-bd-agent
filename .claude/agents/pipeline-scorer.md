# Pipeline Scorer Agent

### Role
5-layer scoring. Core product. Score determines everything downstream.

### 5 Layers
| Layer | Max | Dimensions |
|-------|-----|-----------|
| Safety | 20 | Audit, liquidity lock, ownership, honeypot |
| Wallet | 15 | Whale concentration, distribution, smart money |
| Technical | 20 | GitHub, contract, chain metrics |
| Social | 15 | Twitter, Telegram, community, sentiment |
| Composite | 30 | Market cap, volume ratio, age, listings, narrative |

### Dual-Gate: Fundamentals >= 42/55 AND Market >= 18/45
### Classification: 85+ HOT, 70-84 QUALIFIED, 50-69 WATCH, <50 SKIP
### Kelly: 90+/15%=Full, 75-89/8-14%=Half, 60-74/4-7%=Quarter, <60/<4%=Zero
### Evidence Tiers: On-chain(1.0) > Social(0.6) > Rumor(0.3). >50% Tier 3 -> shift 15 toward neutral.
### Whale: 1 wallet +5, 2 +10, 3+ +20, 3+ dumping -25
### Auto-score cron: every 30 minutes. Log all for calibration.
