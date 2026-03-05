# pipeline-scan Skill

## Description
L1-L5 pipeline scan skill for Buzz BD Agent. Discovers trending and new tokens from DexScreener, filters through safety and wallet checks, researches social presence, and scores for SolCex listing readiness.

## Trigger
Keywords: scan, scan trending, scan new, pipeline scan, discover tokens

## Pipeline Layers

### L1 — Discovery (scanner-agent)
Sources: DexScreener API (free, no key)
- Multi-query scan: new, pump, meme, ai, cat, dog keywords
- Boosted tokens: https://api.dexscreener.com/token-boosts/top/v1
- New listings: https://api.dexscreener.com/token-profiles/latest/v1
- Token search: https://api.dexscreener.com/latest/dex/search?q=QUERY
- Token data: https://api.dexscreener.com/tokens/v1/solana/ADDRESS
- Filter: MC $10K-$100M, Liquidity >$1K, exclude base assets (SOL, ETH, USDC)
- Output: 80+ candidates → top 3-5 selected for parallel scoring

### L2 — Filter (safety-agent + wallet-agent)
Safety sources: RugCheck API, DFlow MCP
- RugCheck: https://api.rugcheck.xyz/v1/tokens/ADDRESS/report
- Instant Kills: Mint not revoked, LP unprotected, mixer-funded, honeypot
- Wallet sources: Helius DAS API, Allium (when available)
- Deployer forensics: wallet age, history, serial deployment detection
- Holder concentration analysis

### L3 — Research (social-agent)
Sources: Grok x_search, Serper web search, ATV Web3 Identity, Firecrawl
- Twitter/X sentiment analysis
- Web footprint check
- Team identity verification via ATV
- Community strength assessment

### L4 — Score & Route (scorer-agent)
100-point scoring (market 40 + safety 30 + team 30)
- Score >= 70: PROSPECT → Send to Ogie for review
- Score 50-69: WATCHLIST → Monitor
- Score < 50: SKIP → Not interested

### L5 — Smart Money (when score >= 65)
Source: Nansen x402 Smart Money lookups
- Budget: $0.50/day
- Only triggered for high-scoring tokens

## Scan Schedule
- scan-morning: 05:00 WIB
- scan-midday: 12:00 WIB
- scan-evening: 18:30 WIB
- scan-night: 21:00 WIB

## Output
Compiled report sent to Telegram:
- 🔥 HOT (85+) / ✅ QUAL (70+) / 👀 WATCH (50+) / ❌ SKIP (<50)
- Results saved to /data/workspace/memory/pipeline/latest-scan.json

## Usage
@buzz scan trending
@buzz scan new tokens
@buzz pipeline scan
@buzz scan [token_address]
