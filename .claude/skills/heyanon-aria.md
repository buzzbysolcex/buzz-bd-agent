# SKILL: HeyAnon MCP × ARIA Integration
# Location: .claude/skills/heyanon-aria.md
# Intel Source #30 | 18 chains | 45+ protocols | 128 DeFi tools
# Created: March 30, 2026 (Post-Sprint)

---

## OVERVIEW

HeyAnon MCP is Buzz's multi-chain backbone — one endpoint delivering
18 chains, 45+ protocols, 5 CEXs, and Hyperliquid perps data.
Integrated as Intel Source #30 in the ARIA architecture.

## CONNECTION

```
Endpoint: https://api.heyanon.ai/mcp
Auth: X-API-Key: <HEYANON_API_KEY from .env>
Protocol: MCP standard
Latency: <200ms
Cost: Free tier
```

## ARIA ARCHITECTURE (with HeyAnon + Phantom)

```
Layer 1: CHAIN-NATIVE (deep, single-chain)
  ├── DexScreener (multi-chain pairs, liquidity, security)
  ├── CoinGecko (aggregated price, MCap, volume)
  ├── Bags.fm (Solana launchpad, graduated tokens)
  ├── Colosseum Copilot (hackathon projects with tokens)
  └── Phantom MCP (wallet balances, swap quotes, identity signing)

Layer 2: AGGREGATION (wide, multi-chain) ← HEYANON
  └── HeyAnon MCP (18 chains + 5 CEXs + Perps + Portfolio)
      ├── Multi-chain prices (universal cross-verification)
      ├── DeFi positions (lending, staking, LP across protocols)
      ├── CEX data (Binance, Bybit, OKX, Kraken, MEXC)
      ├── Perps data (Hyperliquid, Drift, Jupiter Perps)
      ├── Bridge volume (cross-chain capital flows)
      └── Token launchpads (PumpFun, Raydium Launchlab)

Layer 3: ENRICHMENT (context, non-price)
  ├── dev-browser scripts (contact screening, project pages)
  ├── GeckoTerminal scraper (circulating MCap, gt_score)
  └── Social/Twitter (community metrics)

Layer 4: EXECUTION (future, CEO-approved only)
  ├── Phantom MCP (transfer, swap, sign — requires approval)
  └── HeyAnon MCP (swap, bridge — requires approval)
```

## KEY MCP TOOLS FOR BUZZ (READ-ONLY)

| Tool | Use Case |
|------|----------|
| `ask` | Natural language → any DeFi query (128 operations) |
| `portfolio_tokens` | Token balances across wallets |
| `portfolio_defi` | LP, staking, lending positions |
| `portfolio_cex` | CEX balances and positions |
| `projects` | List all 45+ supported protocols |
| `ping` | Health check |

**CRITICAL: READ-ONLY ONLY. Never use execution tools (swap, bridge, stake)
without explicit Ogie approval. Same rule as Colosseum PAT.**

## SUPPORTED CHAINS (18)

Ethereum, Arbitrum, Base, Optimism, Polygon, BSC, Avalanche, Solana,
TON, Sonic, zkSync, Scroll, Gnosis, Metis, Kava EVM, HyperEVM, Plasma, Monad

## ARIA DEPTH SCORE (0-20 bonus points)

```
+5: Token found on HeyAnon (multi-chain presence confirmed)
+5: Hyperliquid perps listing (institutional interest signal)
+3: Lending markets on Aave/Kamino/Venus (DeFi utility)
+3: LP positions on 2+ DEXs (liquidity depth)
+2: CEX listing confirmed via HeyAnon
+2: Active staking/yield opportunities (ecosystem maturity)
```

Stacks with existing scoring (max 100 base + 20 ARIA bonus = 120 total).
For BD qualification, use base score (100-point scale).
ARIA Depth Score is enrichment metadata for deal intelligence.

## INTEGRATION MODULE

File: `api/lib/heyanon-mcp.js`

```javascript
// Core functions:
async function queryHeyAnon(prompt) // Natural language → DeFi data
async function getTokenPrice(symbol, chain) // Cross-chain price oracle
async function getHyperliquidOI(symbol) // Perps open interest
async function getDeFiDepth(tokenAddress) // Lending + LP positions
async function getCEXPresence(symbol) // Which CEXs list this token
async function calculateARIADepth(tokenAddress) // 0-20 score
```

## ENDPOINTS

```
GET /api/v1/heyanon/price/:symbol/:chain — Cross-chain price
GET /api/v1/heyanon/perps/:symbol — Hyperliquid OI + funding
GET /api/v1/heyanon/defi/:address — DeFi positions
GET /api/v1/heyanon/cex/:symbol — CEX listing status
GET /api/v1/heyanon/depth/:address — ARIA Depth Score
GET /api/v1/heyanon/status — Connection health
```

## CRONS

```
#31: heyanon-price-sync — every 6 hours — sync top pipeline token prices
#32: heyanon-perps-scan — daily 06:30 UTC — scan Hyperliquid for pipeline tokens
#33: heyanon-depth-enrich — daily 07:00 UTC — calculate ARIA Depth for WATCH+ tokens
```

## WIRING INTO EXISTING PIPELINE

### aria-enricher.js (add HeyAnon as enrichment source)
```javascript
// After existing 6 enrichment calls, add:
const heyAnonDepth = await calculateARIADepth(tokenAddress);
// Store in aria_tokens.heyanon_depth_score
```

### pipeline-scorer.js (add ARIA Depth metadata)
```javascript
// After base score calculation, add enrichment:
const ariaDepth = await getARIADepthFromDB(tokenAddress);
// Store as metadata, NOT added to base score
// Used in BD reports and signal enrichment
```

### Signal Factory (enrich signals with cross-chain data)
```javascript
// Before filing signal, query HeyAnon for context:
const perpsData = await getHyperliquidOI('BTC');
const defiData = await getDeFiDepth(tokenAddress);
// Include in signal body for higher inclusion rate
```

## IMPLEMENTATION TIMELINE

| Phase | Tasks | Effort |
|-------|-------|--------|
| A (today) | Sign up, get key, test ping + ask | 40 min |
| B (Week 1) | Build module + endpoints + crons | 7 hours |
| C (Week 1-2) | Wire into ARIA + scorer + signals | 8 hours |

## SECURITY RULES

- API key in .env only (HEYANON_API_KEY), never in code or GitHub
- READ-ONLY tools only — no execution without Ogie approval
- Cache aggressively (prices: 5 min, DeFi positions: 1 hour, CEX: 6 hours)
- Graceful fallback if HeyAnon is down (existing sources still work)
- Rate limit: TBD (test in Phase A, implement backoff)

---

*Intel Source #30 | One endpoint. 18 chains. 45+ protocols.*
*The multi-chain bridge ARIA needs.* 🐝
