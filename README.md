<p align="center">
  <img src="https://buzzbd.ai/images/buzz-bee-mascot.png" alt="Buzz BD Agent" width="200"/>
</p>

<h1 align="center">Buzz BD Agent</h1>
<p align="center"><strong>Zero-Human Exchange Listing Company</strong></p>
<p align="center">
  <em>The world's first autonomous agent that discovers, scores, simulates, and proposes token listings across 19 chains.</em>
</p>

<p align="center">
  <a href="https://buzzbd.ai">Website</a> •
  <a href="https://buzzbd.ai/report">Weekly Report</a> •
  <a href="https://buzzbd.ai/proposal">ELS-1 Proposal</a> •
  <a href="https://api.buzzbd.ai">API</a> •
  <a href="https://x.com/BuzzBySolCex">Twitter</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-v8.3.0-00ff41?style=flat-square" alt="Version"/>
  <img src="https://img.shields.io/badge/contracts-4%20on%20Base-blue?style=flat-square" alt="Contracts"/>
  <img src="https://img.shields.io/badge/intel%20sources-31-orange?style=flat-square" alt="Intel Sources"/>
  <img src="https://img.shields.io/badge/chains-19-purple?style=flat-square" alt="Chains"/>
  <img src="https://img.shields.io/badge/LLM%20cost-%240%2Fday-green?style=flat-square" alt="LLM Cost"/>
  <img src="https://img.shields.io/badge/built%20by-a%20chef-red?style=flat-square" alt="Built By"/>
</p>

---

## What is Buzz?

Buzz is an autonomous Business Development agent for [SolCex Exchange](https://solcex.com). It runs 24/7 on a $10/mo server, scanning 31 intelligence sources across 19 blockchain networks to discover, evaluate, and propose token listings — with zero human intervention until the final approval.

**Built by a chef with 20+ years of culinary experience and zero CS degree, using conversational AI collaboration with Claude (Anthropic) over a 42-day sprint from Indonesia.**

## The Pipeline

```
DISCOVER → SCORE → SIMULATE → VERIFY → PROPOSE → OUTREACH → NEGOTIATE → LIST
    ↑                                                                      ↓
    └──────────────── feedback loop (calibration) ─────────────────────────┘
```

| Stage | What Happens |
|-------|-------------|
| **Discover** | ARIA v2 scans DexScreener, CoinGecko, Bags.fm, Colosseum across 19 chains |
| **Score** | 11 factors, 8 penalty rules, dual-gate verification (max 100 points) |
| **Simulate** | 50-agent MiroFish adversarial debate produces EV verdict |
| **Verify** | Triple verification (3 independent sources) + on-chain recording |
| **Propose** | Only tokens scoring 70+ get a listing conversation |
| **Outreach** | Automated contact screening + personalized BD proposals |

## By the Numbers

| Metric | Value |
|--------|-------|
| Intelligence Sources | 31 (including HeyAnon MCP — 19 chains, 45+ protocols) |
| Tokens Tracked | 301 |
| Tokens Scored | 256 (0 passed honestly — that's integrity) |
| Smart Contracts | 4 on Base mainnet |
| Simulation Agents | 50 (MiroFish adversarial engine) |
| Signal Revenue | $200 (AIBTC News, 8 brief inclusions) |
| CI/CD Deployments | 107+ (all green) |
| LLM Cost | $0/day (was $1,320/day) |
| Server Cost | $10/month (Hetzner CX43) |
| Sprint Duration | 42 days |

## Smart Contracts (Base Mainnet)

| Contract | Address | Purpose |
|----------|---------|---------|
| ScoreStorage v2 | [`0xbf81...388Fb`](https://basescan.org/address/0xbf81316266dBB79947c358e2eAAc6F338Fa388Fb) | Immutable token scores |
| ListingOracle | `0xc584...4463` | Public `getListingScore()` — queryable by any dApp |
| ListingEscrow | `0xc77F...3ED` | Deposit-based listing flow (confirm/refund) |
| BuzzReputation | `0x723B...2747` | On-chain prediction accuracy tracking |

$0.025 total gas. 28 tests passing. Foundry 1.5.1.

## Intelligence Stack

```
Layer 1: CHAIN-NATIVE (deep, single-chain)
  ├── DexScreener — pairs, liquidity, security across 60+ chains
  ├── CoinGecko — aggregated price, MCap, volume
  ├── Bags.fm — Solana launchpad (graduated tokens)
  └── Colosseum Copilot — hackathon project intelligence

Layer 2: AGGREGATION (wide, multi-chain)
  └── HeyAnon MCP — 19 chains, 45+ protocols, 5 CEXs, Hyperliquid perps
      ├── Rug-O-Meter (AI-powered scam detection)
      ├── 3 embedded wallets (EVM + SOL + TON)
      └── DeFi depth: Aave, Kamino, Jito, Lido, Pendle, Beefy...

Layer 3: ENRICHMENT (context, non-price)
  ├── dev-browser — structured data extraction
  ├── GeckoTerminal — circulating MCap, gt_score
  └── Social/Twitter — community metrics

Layer 4: EXECUTION (CEO-approved only)
  ├── HeyAnon MCP — swap, bridge, stake
  └── Phantom MCP — wallet operations across SOL/ETH/BTC/SUI
```

## Scoring Engine (v2_8rules)

Every token is evaluated across **11 factors in 4 categories** (max 100 points):

| Category | Weight | Factors |
|----------|--------|---------|
| Market Structure | 30 pts | Liquidity depth, volume consistency, FDV-to-MCap ratio |
| Safety | 25 pts | Audit status, honeypot detection, contract verification |
| Community | 25 pts | Holder distribution, social engagement, team transparency |
| Technical | 20 pts | Code quality, on-chain activity, development velocity |

**8 penalty rules:** FDV gap, stablecoin exclusion, ghost token exclusion, contradictory audit hold, security penalties, liquidity cross-ref, honeypot zero, phantom exclusion.

**Dual-gate verification:** Fundamentals ≥ 42/70 AND Market ≥ 18/30.

## ELS-1: Exchange Listing Standard

An open protocol proposal for honest, data-driven exchange listings.

- **Spec:** EIP-track standard for listing qualification criteria
- **Oracle:** On-chain scoring accessible by any dApp
- **Reference Implementation:** 4 contracts on Base + Buzz intelligence engine
- **Proposal:** [buzzbd.ai/proposal](https://buzzbd.ai/proposal)

## On-Chain Identity

| Chain | Identity |
|-------|----------|
| Ethereum | ERC-8004 #25045 |
| Base | ERC-8004 #17483 |
| Avalanche | AgentProof #1718 |
| Solana | `9pQ6K...XUBS` |
| Bitcoin (AIBTC) | `bc1qsja6...umxeagze` (Ionic Nova) |
| HeyAnon EVM (19 chains) | `0xE5d2...f60b` |
| HeyAnon Solana | `BNS48CG...Zn9A` |

## Architecture

```
Brain:  Claude Code Opus 4.6 (Pro Max unlimited, 24/7 on Hetzner)
Body:   Express API (150+ endpoints, 63 tables, 87 crons)
Feed:   ARIA v2 (autonomous discovery, 4 sources, 06:00 UTC scan)
Chain:  4 smart contracts (Base mainnet, Foundry)
MCP:    HeyAnon (19 chains) + Phantom (4 chains)
Shield: Sentinel v2.0 (auto-repair, 15min sweeps)
Repo:   AI-native (9 skills, 6 rules, 8 ADRs, hooks)
Brand:  Cyberpunk robotic bee (deployed everywhere)
```

## AIBTC Signal Factory

Buzz earns BTC by filing intelligence signals on [aibtc.news](https://aibtc.news) as **Ionic Nova**.

| Metric | Value |
|--------|-------|
| Leaderboard | #8 (325 points) |
| Brief Inclusions | 8 ($200 revenue) |
| Signal Streak | 8 days |
| Target | #1-3 within 30 days |

## Links

| Resource | URL |
|----------|-----|
| Website | [buzzbd.ai](https://buzzbd.ai) |
| Weekly Report | [buzzbd.ai/report](https://buzzbd.ai/report) |
| ELS-1 Proposal | [buzzbd.ai/proposal](https://buzzbd.ai/proposal) |
| API | [api.buzzbd.ai](https://api.buzzbd.ai) |
| Agent Endpoint | [api.buzzbd.ai/agent](https://api.buzzbd.ai/agent) |
| Twitter | [@BuzzBySolCex](https://x.com/BuzzBySolCex) |
| Discord | [Buzz BD Agent](https://discord.com/oauth2/authorize?client_id=1475792150380941372&permissions=2147568704&scope=bot) |
| SolCex Exchange | [@SolCex_Exchange](https://x.com/SolCex_Exchange) |
| Builder | [@HidayahAnka1](https://x.com/HidayahAnka1) |

## The Story

Day 1: A chef in Saudi Arabia who'd never written code.
Day 7: First API deployed on Akash Network.
Day 14: 5 sub-agents scoring tokens.
Day 21: Migrated to Hetzner. Killed all external LLMs.
Day 28: First smart contract on Base mainnet.
Day 35: Scoring engine calibrated. 0 out of 254 tokens pass honestly.
Day 42: 4 contracts. ARIA v2. 50-agent simulation. $200 signal revenue.

No CS degree. No VC. No team. Just persistence.

---

<p align="center">
  <strong>Built by a chef. Powered by Claude. Verified on-chain.</strong><br/>
  <em>Mise en place — everything in its place before the service begins.</em>
</p>

<p align="center">
  <sub>v8.3.0 | Sprint Day 42 | 31 Intel Sources | 4 Contracts | 19 Chains | $0/day LLM</sub>
</p>
