# BD Screening Workflow

## 7 Phases (from MASTER-OPS-BD-SCREENING.md)
1. Dual-Source Verification (DexScreener + GeckoTerminal)
2. Security Deep Dive (Token Sniffer, Go+, Honeypot.is)
3. BD Readiness Classification (Sweet Spot / Potential / Too Big / Too Risky)
4. Contact Screening (dev-browser: db-contact-screener.js — 10 seconds)
5. Outreach Execution (message templates, channel priority)
6. Reporting (War Room + Sunday Intelligence Report)
7. Continuous Improvement (auto-learning from outcomes)

## 8 Scoring Rules (in auto-score cron)
1. Stablecoin exclusion (USDC, USDT, DAI, etc.)
2. Ghost token exclusion (<10 holders OR <$100 daily volume)
3. Phantom token cap (no DexScreener/DexTools pair found)
4. Honeypot kill (Honeypot.is positive = auto-exclude)
5. FDV gap penalty (30-50% = -5, 50-75% = -10, >75% = -15, >90% = -20)
6. Security penalty (Token Sniffer 0 = -25, Go+ >3 = -30)
7. Market missing penalty (no market data = cap at 40)
8. Liquidity cross-reference (DexScreener vs GeckoTerminal)

## Dual-Gate
Both composite AND fundamental scores must pass. A token at 84 composite / 38 fundamental = BLOCKED.

## Contact Screening Automation
Run: dev-browser --headless < scripts/db-contact-screener.js
Input: project website + Twitter handle
Output: Phase 4.2 contact template JSON (team, socials, email, follower count)
