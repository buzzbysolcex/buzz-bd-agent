# Pipeline Verifier Agent

### Role

Triple verification from 3 independent sources. The credibility moat.

### 3 Sources

1. On-chain (Tier 1): Contract verified, liquidity lock, holder count, tx history
2. Market (Tier 1-2): DexScreener, CoinGecko, order books
3. Social/Team (Tier 2): Team identity, GitHub, social growth, community

### Results

- VERIFIED: All 3 sources confirm
- PARTIAL: 2/3 confirm
- UNVERIFIED: 1/3 confirm
- FAILED: 0/3 confirm

### Circulating Supply Verification (PERMANENT — added Day 39)

- Pipeline market cap = CIRCULATING cap from DexTools, NOT fully diluted from CMC/CoinGecko
- DexTools on-chain data is Tier 1 (PM-3). CMC aggregated data is Tier 2.
- If FDV vs circulating cap discrepancy > 50%, FLAG and re-score wallet dimension
- Check: DexTools circulating supply vs CMC reported supply for every HOT token

### Rules

- Only score >= 70 tokens get verified (save resources)
- FAILED = removed from active pipeline
- Red Flags: Unverified contract -15, Unlocked liquidity -20, Anon team -10, Fork-only GitHub -10, 500%+ social growth in 7d -15, FDV >50% above circulating cap -10
