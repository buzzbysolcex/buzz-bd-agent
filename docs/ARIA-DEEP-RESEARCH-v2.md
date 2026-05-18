---
name: aria-deep-research
description: >
  ARIA (Autonomous Relay Intelligence Agent) deep research and analysis.
  Post-sprint implementation plan for Buzz's cross-chain intelligence feed.
  Maps ARIA's original vision (Q2 roadmap) against current reality (Day 41):
  Hetzner CX43 replaces Akash, dev-browser replaces chain-specific dockers,
  29 intel sources already operational, scoring engine honest. ARIA v2
  reimagined as a lightweight aggregation layer on existing infrastructure,
  not a separate container fleet. Integrates Bags.fm, Colosseum Copilot,
  DexTools browser scraping, and CoinGecko discovery into unified feed.
license: Internal — SolCex Exchange
---

# ARIA — Deep Research & Analysis

## Autonomous Relay Intelligence Agent

## Post-Sprint Implementation Plan

## Day 41 | Mar 29, 2026

## Bismillah 🤲

---

## 1. WHAT ARIA WAS SUPPOSED TO BE (Original Vision)

From the Sprint Day 8 roadmap (Mar 6, 2026):

**ARIA** = Autonomous Relay Intelligence Agent

- A dedicated Akash docker (#3) acting as the "data spine"
- Aggregates on-chain data from chain-specific agents
- Feeds enriched intel into Buzz's scoring pipeline
- "Think of it as Buzz's Bloomberg terminal"

**The Fleet Vision:**

```
Chain Agents (each a separate Akash docker):
├── EVM-Agent (Akash #4) — ETH, Base, Arbitrum
├── BNB-Agent (Akash #5) — BSC, opBNB, Greenfield
├── SOL-Agent (Akash #6) — Solana, SPL, Helius
└── + More Chains — Avalanche, TON, SUI

        ↓ feed data to ↓

ARIA (Akash #3) — Cross-chain aggregator
  ├── Normalizes data across chains
  ├── Caches + deduplicates
  ├── Applies SolCex filter criteria
  └── POST to Buzz /pipeline/add

        ↓ unified feed to ↓

Buzz (Akash #1 → now Hetzner) — Scoring + BD
Sentinel (Akash #2 → now Hetzner) — Health monitoring
```

**Original ARIA Filter Criteria (SolCex):**

- 24h volume > $500K
- Liquidity > $200K
- Age > 7 days
- Community active (Telegram/Twitter)
- Not listed on Binance/OKX/Bybit
- Compatible chain: ETH/BSC/SOL/BASE/TRON/AVAX

**Original Timeline:** ARIA skeleton deploy Week 4-5 of sprint (Mar 22-31)

**What Actually Happened:** Sprint pivoted to scoring engine calibration,
AIBTC Signal Factory, Listing Protocol, smart contracts, IZHC. ARIA was
deprioritized because revenue and honest scoring were more urgent.

---

## 2. WHAT CHANGED SINCE THE ORIGINAL VISION

### Infrastructure Migration

- **Akash → Hetzner CX43**: All services now on single Hetzner server
- No more multi-docker fleet — everything runs under `ah` management
- Claude Code Opus 4.6 running 24/7 in tmux as Buzz's brain
- Cost: $9.99/mo Hetzner (was ~$10/mo across multiple Akash deployments)

### Intelligence Sources Expanded (13 → 29)

The original vision assumed ARIA would ADD chain-specific data.
But Buzz already pulls from 29 sources WITHOUT ARIA:

- DexScreener (all chains via API)
- DexTools (now via dev-browser)
- Jupiter (Solana — 3 endpoints: search, /recent, /cooking)
- CoinGecko (multi-chain)
- Helius (Solana on-chain)
- Allium (16 chains)
- AIXBT (momentum)
- Bags.fm (168K Solana tokens)
- Colosseum Copilot (5,400 hackathon projects)
- RugCheck (Solana safety)
- - 19 more sources

### Browser Tools Added

- **dev-browser**: Structured extraction, persistent pages, scriptable
- **Browser Use CLI**: Screenshots, visual verification
- Together they cover sites with NO APIs (DexTools, project websites, social profiles)

### Scoring Engine Calibrated

- 8 BD Screening rules in code
- Honest re-score complete (254 tokens, 0 HOT — correct)
- ScoreStorage v2 on Base mainnet (3 corrected scores on-chain)

---

## 3. ARIA v2 — REIMAGINED FOR CURRENT ARCHITECTURE

The original ARIA assumed a fleet of chain-specific dockers feeding
a central aggregator. That architecture is OVERKILL for current Buzz.

**ARIA v2 is not a separate container. It's a SERVICE LAYER inside Buzz.**

### ARIA v2 Architecture

```
DISCOVERY SOURCES (the "chain agents" reimagined):
├── DexScreener API — all chains (already live)
├── Jupiter API — Solana tokens (already live, 3 endpoints)
├── CoinGecko API — multi-chain (already live)
├── Bags.fm Scanner — 168K Solana tokens (already live)
├── Colosseum Copilot — 5,400 projects (already live)
├── dev-browser DexTools — circulating MCap, DEXTscore (NEW — P0)
├── dev-browser CoinGecko Recently Added — quality filter (NEW — P1)
├── dev-browser DexScreener Boosts — projects spending money (NEW — P1)
├── dev-browser Project Websites — team/social extraction (NEW — P0)
└── Helius + Allium + RugCheck — on-chain data (already live)

        ↓ all feed into ↓

ARIA SERVICE (new Express.js module in Buzz API):
├── /api/v1/aria/discover — trigger multi-source discovery scan
├── /api/v1/aria/feed — get unified feed of latest candidates
├── /api/v1/aria/filter — apply SolCex listing criteria
├── /api/v1/aria/enrich/:address — deep enrich a single token
├── /api/v1/aria/status — feed health, source statuses, last scan
│
├── Normalizes data across all sources into unified token schema
├── Deduplicates (same token from DexScreener + CoinGecko + Bags)
├── Applies BD Sweet Spot filter (MCap $500K-$50M, liq >$100K, etc.)
├── Caches results in aria_candidates table
└── Triggers scoring pipeline for qualified candidates

        ↓ qualified candidates go to ↓

SCORING PIPELINE (already live — 5 layers, 8 rules, dual-gate):
├── Layer 1: Safety (25)
├── Layer 2: Wallet (25)
├── Layer 3: Technical (20)
├── Layer 4: Social (15)
└── Layer 5: Market/Scorer (30)

        ↓ scored tokens go to ↓

BD SCREENING WORKFLOW (already live — 7 phases):
├── Phase 1: Dual-source verification
├── Phase 2: Security deep dive
├── Phase 3: BD classification
├── Phase 4: Contact screening (dev-browser automated)
├── Phase 5: Outreach execution
├── Phase 6: Reporting
└── Phase 7: Continuous improvement
```

### Why This Is Better Than the Original Vision

| Factor             | Original ARIA                      | ARIA v2                                     |
| ------------------ | ---------------------------------- | ------------------------------------------- |
| Infrastructure     | 4-6 separate Akash dockers         | 1 service module in existing Buzz           |
| Cost               | ~$15-20/mo additional              | $0 additional                               |
| Data sources       | 5 chain feeds                      | 29 sources + 10 browser-scraped             |
| Maintenance        | Manage multiple containers         | One codebase                                |
| Deployment         | Multiple SDL files, separate CI/CD | Single `ah restart`                         |
| Chain coverage     | ETH/BSC/SOL/BASE/TRON              | All chains via DexScreener + specific feeds |
| Browser enrichment | None (API only)                    | dev-browser for DexTools, socials, projects |
| Compute            | Multiple small containers          | Hetzner CX43 (16GB RAM, 8 vCPU)             |

---

## 4. ARIA v2 — UNIFIED TOKEN SCHEMA

Every token from every source gets normalized into this schema:

```json
{
  "address": "0x...",
  "chain": "solana",
  "symbol": "TOKEN",
  "name": "Token Name",

  "discovery": {
    "source": "bags.fm",
    "discovered_at": "2026-03-29T06:00:00Z",
    "discovery_type": "graduated",
    "raw_data": {}
  },

  "market": {
    "price_usd": 0.0123,
    "mcap_circulating": 5200000,
    "mcap_fdv": 8000000,
    "fdv_gap": 0.35,
    "volume_24h": 450000,
    "liquidity_usd": 820000,
    "pair_count": 5,
    "pair_age_days": 45,
    "exchange_count": 3,
    "exchanges": ["Raydium", "Orca", "Jupiter"],
    "source": "dexscreener+dextools"
  },

  "safety": {
    "token_sniffer": 85,
    "token_sniffer_issues": [],
    "goplus_issues": 0,
    "honeypot": false,
    "sell_tax": 0,
    "dextscore": 72,
    "rugcheck": "SAFE",
    "contract_verified": true,
    "source": "dexscreener+dev-browser"
  },

  "social": {
    "twitter_handle": "@tokenproject",
    "twitter_followers": 12500,
    "twitter_last_post": "2026-03-28",
    "telegram_members": 3200,
    "discord_members": 800,
    "website": "https://tokenproject.io",
    "github": "https://github.com/tokenproject",
    "source": "dev-browser"
  },

  "team": {
    "doxxed": true,
    "founder": "@founder_handle",
    "dev": "@dev_handle",
    "community_manager": "@cm_handle",
    "email": "team@tokenproject.io",
    "source": "dev-browser"
  },

  "technical": {
    "github_stars": 45,
    "github_last_commit": "2026-03-25",
    "github_contributors": 8,
    "contract_verified": true,
    "has_documentation": true,
    "source": "dev-browser+github-api"
  },

  "classification": {
    "bd_class": "BD_SWEET_SPOT",
    "composite_score": 74,
    "safety_score": 22,
    "wallet_score": 18,
    "technical_score": 14,
    "social_score": 11,
    "market_score": 24,
    "dual_gate": "PASS",
    "outreach_ready": true
  },

  "metadata": {
    "bags_fm": { "status": "graduated", "holders": 450 },
    "colosseum": { "hackathon": "Frontier Spring", "result": "2nd place" },
    "enriched_at": "2026-03-29T07:30:00Z",
    "enrichment_sources": ["dexscreener", "dextools", "bags.fm", "dev-browser"]
  }
}
```

---

## 5. IMPLEMENTATION PLAN — POST-SPRINT

### Week 1 (Apr 1-7): ARIA Service Foundation

| Task                                                    | Effort | Output                         |
| ------------------------------------------------------- | ------ | ------------------------------ |
| Create `/services/aria/` module in Buzz API             | 2h     | Service scaffold               |
| Build unified token schema (above)                      | 1h     | aria_candidates table          |
| Build `/api/v1/aria/discover` endpoint                  | 3h     | Multi-source discovery trigger |
| Wire DexScreener + Jupiter + CoinGecko + Bags.fm        | 2h     | 4 sources feeding ARIA         |
| Build `/api/v1/aria/filter` with BD Sweet Spot criteria | 1h     | Automated filtering            |
| Add ARIA discovery cron (06:00 UTC daily)               | 30min  | Automated daily scan           |

### Week 2 (Apr 8-14): Browser Enrichment Layer

| Task                                               | Effort | Output                          |
| -------------------------------------------------- | ------ | ------------------------------- |
| DexTools scraper script (dev-browser)              | 2h     | Circulating MCap, DEXTscore     |
| Contact screening script (dev-browser)             | 2h     | Team, socials, email extraction |
| CoinGecko recently added scraper                   | 1h     | Quality discovery source        |
| DexScreener boosts scraper                         | 1h     | Projects spending money         |
| Wire all browser scripts into ARIA enrich pipeline | 2h     | Full enrichment flow            |
| Build `/api/v1/aria/enrich/:address` endpoint      | 1h     | On-demand deep enrichment       |

### Week 3 (Apr 15-21): Scoring Integration

| Task                                                         | Effort | Output                             |
| ------------------------------------------------------------ | ------ | ---------------------------------- |
| Wire ARIA candidates → scoring pipeline auto-trigger         | 2h     | Discover → Score automated         |
| Replace hardcoded stubs with browser-extracted data          | 3h     | Real deployer, social, tech scores |
| Build ARIA feed dashboard on buzzbd.ai                       | 3h     | Visual feed for Ogie               |
| Add War Room commands (/aria-scan, /aria-feed, /aria-enrich) | 2h     | War Room control                   |

### Week 4 (Apr 22-28): Full Pipeline

| Task                                                            | Effort | Output                      |
| --------------------------------------------------------------- | ------ | --------------------------- |
| End-to-end test: discover → enrich → score → classify → contact | 2h     | Full flow validated         |
| Wire to BD Screening Workflow Phase 4 auto-trigger              | 1h     | Contact screening automated |
| Build Sunday Report auto-generation from ARIA feed              | 2h     | Weekly report from data     |
| Performance optimization (caching, dedup, rate limits)          | 2h     | Stable at scale             |

**Total: ~32 hours over 4 weeks**

---

## 6. ARIA v2 vs ORIGINAL — WHAT WE KEEP, WHAT WE DROP

### KEEP (from original vision):

- ✅ Cross-chain data normalization
- ✅ SolCex filter criteria (updated with BD Screening rules)
- ✅ Unified feed into scoring pipeline
- ✅ Sentinel monitoring (already live on Hetzner)
- ✅ Caching + deduplication
- ✅ POST to pipeline/add pattern

### DROP (no longer needed):

- ❌ Separate Akash dockers per chain (DexScreener API covers all chains)
- ❌ EVM-Agent, BNB-Agent, SOL-Agent containers (dev-browser replaces)
- ❌ ARIA as separate container (becomes service module in Buzz)
- ❌ Nansen x402 ($35/mo) — not needed with dev-browser + free APIs
- ❌ Multi-container orchestration complexity

### ADD (new capabilities):

- ✅ dev-browser enrichment (DexTools, socials, project websites)
- ✅ Bags.fm as early warning (168K tokens, pre-graduation tracking)
- ✅ Colosseum Copilot (5,400 hackathon projects with real teams)
- ✅ DexScreener boosts (projects spending money = BD ready)
- ✅ CoinGecko recently added (quality filter)
- ✅ Browser Use CLI visual evidence (screenshots for BD proposals)
- ✅ On-chain score storage (ScoreStorage v2 on Base)

---

## 7. HOW ARIA v2 CONNECTS TO THE LISTING PROTOCOL

```
ARIA discovers token
  → ARIA enriches with 29 API + 10 browser sources
    → Scoring engine produces honest score
      → Score stored on-chain (ScoreStorage v2)
        → ListingOracle serves score via getListingScore()
          → ListingEscrow receives deposit
            → SolCex confirms listing
              → Revenue flows

ARIA is the INTAKE. The Listing Protocol is the OUTPUT.
Without ARIA, the oracle has nothing to score.
Without the oracle, ARIA's data has no on-chain value.
Together: autonomous end-to-end listing pipeline.
```

---

## 8. COMPETITIVE EDGE — WHY THIS MATTERS

### What Nobody Else Has:

1. **29 API sources + 10 browser-scraped sources** = deepest data coverage
2. **dev-browser for DexTools** = circulating MCap data nobody else extracts
3. **Bags.fm 168K tokens** = early warning system for pre-graduation projects
4. **Colosseum 5,400 projects** = hackathon-validated teams with real products
5. **Honest scoring engine** = 0 HOT out of 254 is the VALUE (most fail)
6. **On-chain scores** = ScoreStorage v2 on Base, verifiable, immutable
7. **AIBTC signal revenue** = $125+ proving data quality, inscribed on Bitcoin
8. **Pro Max unlimited compute** = no cost constraint per agent or per query

### The IZHC Benchmark:

ARIA v2 moves Buzz's ZHC readiness from 51.3% toward 65%+:

- Revenue: signals earning, oracle queries coming
- Agent autonomy: ARIA runs discovery without Ogie
- Machine-readable: /agent endpoint + ARIA API
- Radical transparency: buzzbd.ai/report + /data feed

---

## 9. THE ONE SENTENCE

**ARIA v2 is Buzz's Bloomberg terminal — a unified intelligence feed that
discovers tokens across 29 API sources + 10 browser-scraped sources,
normalizes them into a standard schema, filters for BD Sweet Spot,
triggers honest scoring, and feeds the Listing Protocol oracle.**

---

_ARIA was designed as a fleet of containers._
_ARIA v2 is a service layer that leverages everything we've already built._
_The infrastructure is here. The sources are connected. The scoring is honest._
_Now we wire them together into a single, unified intelligence feed._
_Built by Chef | Powered by Opus | Bismillah_ 🤲
