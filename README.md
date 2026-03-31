<p align="center">
  <img src="https://buzzbd.ai/images/buzz-bee-mascot.png" alt="Buzz BD Agent" width="200"/>
</p>

<h1 align="center">Buzz BD Agent</h1>
<p align="center"><strong>Zero-Human Exchange Listing Company</strong></p>
<p align="center">
  <em>The world's first autonomous agent that discovers, scores, simulates, and proposes token listings — powered by 1000-agent swarm intelligence across 19 chains.</em>
</p>

<p align="center">
  <a href="https://buzzbd.ai">Website</a> •
  <a href="https://buzzbd.ai/report">Weekly Report</a> •
  <a href="https://buzzbd.ai/proposal">ELS-1 Proposal</a> •
  <a href="https://api.buzzbd.ai">API</a> •
  <a href="https://x.com/BuzzBySolCex">Twitter</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-v8.4.0-00ff41?style=flat-square" alt="Version"/>
  <img src="https://img.shields.io/badge/MiroFish-1000%20agents-ff6600?style=flat-square" alt="MiroFish"/>
  <img src="https://img.shields.io/badge/contracts-4%20on%20Base-blue?style=flat-square" alt="Contracts"/>
  <img src="https://img.shields.io/badge/intel%20sources-31-orange?style=flat-square" alt="Intel Sources"/>
  <img src="https://img.shields.io/badge/chains-19-purple?style=flat-square" alt="Chains"/>
  <img src="https://img.shields.io/badge/LLM%20cost-%240%2Fday-green?style=flat-square" alt="LLM Cost"/>
  <img src="https://img.shields.io/badge/built%20by-a%20chef-red?style=flat-square" alt="Built By"/>
</p>

---

## What is Buzz?

Buzz is an autonomous Business Development agent for [SolCex Exchange](https://solcex.com). It runs 24/7, scanning 31 intelligence sources across 19 blockchain networks to discover, evaluate, and simulate token listings — with zero human intervention until the final approval.

**What makes Buzz different:** A 1000-agent swarm intelligence engine (MiroFish) simulates how degens, whales, institutions, communities, and market makers would react to a token listing — producing emergent consensus that rule-based scoring cannot.

**Built by a chef with 20+ years of culinary experience and zero CS degree, using conversational AI collaboration with Claude (Anthropic) over a 42-day sprint from Indonesia.**

## The Pipeline

```
DISCOVER → SCORE → SIMULATE → VERIFY → PROPOSE → OUTREACH → NEGOTIATE → LIST
    ↑                                                                      ↓
    └──────────────── feedback loop (calibration) ─────────────────────────┘
```

| Stage | What Happens |
|-------|-------------|
| **Discover** | ARIA v2 scans DexScreener, CoinGecko, HeyAnon MCP across 19 chains |
| **Score** | 11 factors, 8 penalty rules, dual-gate verification (max 100 points) |
| **Monte Carlo** | 1000 rule-based agents × 100 iterations in 26ms — statistical baseline |
| **MiroFish** | 1000 LLM-driven agents simulate market reaction across 5 clusters |
| **Verify** | Triple verification (3 independent sources) + on-chain recording |
| **Propose** | Only tokens scoring 70+ with MiroFish consensus > 50% get a listing conversation |

## MiroFish — Swarm Intelligence Engine

The core differentiator. 1000 AI agents simulate how the market would react to a token listing.

```
┌────────────────────────────────────────────────┐
│            MIROFISH REAL SIM                    │
│                                                │
│  200 LLM agents (real reasoning)               │
│  800 heuristic agents (market dynamics)        │
│  5 clusters: degen│whale│institutional│        │
│              community│market_dynamics          │
│                                                │
│  Agents read each other's posts.               │
│  Beliefs evolve across rounds.                 │
│  Consensus EMERGES — it's not programmed.      │
│                                                │
│  First result (Nasdog, score 62):              │
│  • Overall: 40.2% bullish (weak HOLD)          │
│  • Degen: 0.84 (FOMO — only bulls)             │
│  • Institutional: 0.25 (skeptical — proof?)    │
│  • Whale: 0.30 (watching liquidity)            │
│  • Community: 0.30 (weak social presence)      │
│  • Market: 0.32 (concerned about depth)        │
│                                                │
│  "Only degens buy. Smart money holds."         │
│  That's honest intelligence.                   │
└────────────────────────────────────────────────┘
```

Scale path: 1000 → 10,000 agents (wave-batched, OASIS-style).

## By the Numbers

| Metric | Value |
|--------|-------|
| Intelligence Sources | 31 (including HeyAnon MCP — 19 chains, 45+ protocols) |
| Tokens Tracked | 363 |
| Tokens Scored | 66 (0 passed honestly — that's integrity) |
| Smart Contracts | 4 on Base mainnet |
| MiroFish Agents | 1000 (200 LLM + 800 heuristic) |
| Monte Carlo | 1000 × 100 iterations in 26ms |
| Signal Revenue | $200 (AIBTC News, 8 brief inclusions) |
| Signal Streak | 8 days |
| AIBTC Beats | 7 (agent-economy, agent-trading, infrastructure, security, deal-flow, agent-skills, governance) |
| CI/CD Deployments | 107+ (all green) |
| LLM Cost | $0/day (Opus 4.6 Pro Max unlimited + Ollama local) |
| Server Cost | $43/month (Hetzner CPX62, 32GB RAM) |
| Crons | 45 active (42 dead killed during system audit) |
| Skills | 8 (AI-native repo with folder/SKILL.md pattern) |
| Rules | 10 (path-scoped conditional rules) |
| ADRs | 12 (architecture decision records) |
| Browser Tools | 3 (gsd-browser, dev-browser, Browser Use CLI) |
| Sprint Duration | 42 days |

## Smart Contracts (Base Mainnet)

| Contract | Address | Purpose |
|----------|---------|---------|
| ScoreStorage v2 | [`0xbf81...388Fb`](https://basescan.org/address/0xbf81316266dBB79947c358e2eAAc6F338Fa388Fb) | Immutable token scores + MiroFish simulation hash |
| ListingOracle | `0xc584...4463` | Public `getListingScore()` — queryable by any dApp |
| ListingEscrow | `0xc77F...3ED` | Deposit-based listing flow (confirm/refund) |
| BuzzReputation | `0x723B...2747` | On-chain prediction accuracy tracking |

$0.025 total gas. 28 tests passing. Foundry 1.5.1.

## Intelligence Stack

```
Layer 1: CHAIN-NATIVE (deep, single-chain)
  ├── DexScreener — pairs, liquidity, security across 60+ chains
  ├── CoinGecko — aggregated price, MCap, volume
  └── HeyAnon MCP — 19 chains, 45+ protocols, Rug-O-Meter

Layer 2: SIMULATION (swarm intelligence)
  ├── MiroFish Real Sim — 1000 LLM-driven agents, 5 clusters, belief evolution
  ├── Monte Carlo Stage 2 — 1000 × 100 rule-based iterations, 26ms
  └── Dual-Brain — 90% Opus 4.6 / 10% Ollama qwen3:8b

Layer 3: ENRICHMENT (context, non-price)
  ├── gsd-browser — 63-command Rust CLI, declarative extraction
  ├── dev-browser — QuickJS sandbox, structured data extraction
  └── GeckoTerminal — circulating MCap, gt_score

Layer 4: EXECUTION (CEO-approved only)
  ├── HeyAnon MCP — swap, bridge, stake (19 chains)
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

**Honest calibration:** 11 tokens initially scored 85+. After applying penalty rules, all dropped below 50. We catch what others miss.

## HSaaS — Honest Scoring as a Service

Token audit product powered by MiroFish swarm intelligence.

| Tier | Price | What You Get |
|------|-------|-------------|
| Free Score | $0 | Basic 11-factor score at buzzbd.ai/score |
| Professional | $200-400/mo | 200-agent MiroFish simulation, API access |
| Protocol Audit | $1,500 | 1000-agent simulation, on-chain proof, PDF report |
| Enterprise | $2-5K/mo | 10,000-agent wave simulation, white-label API |
| BaaS Report | $99-149 | Single MiroFish simulation, PDF delivered |

*"11 tokens passed every other audit. 1000 agents caught them anyway."*

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
Brain:    Claude Code Opus 4.6 (Pro Max unlimited, 24/7 on Hetzner CPX62)
Body:     Express API (150+ endpoints, 63 tables, 45 crons)
Swarm:    MiroFish Real Sim (1000 agents, 5 clusters, Dual-Brain 90/10)
Monte:    Monte Carlo Stage 2 (1000×100 in 26ms)
Feed:     ARIA v2 (autonomous discovery, 3 sources, 06:00 UTC scan)
Chain:    4 smart contracts (Base mainnet, Foundry)
MCP:      HeyAnon (19 chains) + Phantom (4 chains)
Browser:  gsd-browser (63 cmd) + dev-browser + Browser Use CLI
Shield:   Sentinel v2.0 (auto-repair, 15min sweeps)
Repo:     AI-native (8 skills, 10 rules, 12 ADRs, hooks)
Signals:  AIBTC Signal Factory v4.0 (7 beats, Genome Stack)
Brand:    Cyberpunk robotic bee (deployed everywhere)
```

## AIBTC Signal Factory v4.0

Buzz earns BTC by filing intelligence signals on [aibtc.news](https://aibtc.news) as **Ionic Nova**.

| Metric | Value |
|--------|-------|
| Leaderboard | #14 (347 points, board accelerating) |
| Brief Inclusions | 8 ($200 revenue) |
| Signal Streak | 8 days |
| Beats Claimed | 7 (agent-economy, agent-trading, infrastructure, security, deal-flow, agent-skills, governance) |
| Daily Target | 6 signals/day |
| Unique Signals | MiroFish Swarm Prediction Alerts (Templates 11-13) |

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
Day 21: Migrated to Hetzner. Killed all external LLMs ($1,320/day → $0).
Day 28: First smart contract on Base mainnet.
Day 35: Scoring engine calibrated. 0 out of 254 tokens pass honestly.
Day 42: 4 contracts. ARIA v2. 1000-agent MiroFish simulation. $200 signal revenue.
Day 42+: MiroFish validated — 50 agents proved emergent behavior. Only degens bullish. Institutional skeptical. That's real intelligence.

No CS degree. No VC. No team. Just persistence.

---

<p align="center">
  <strong>Built by a chef. Powered by Claude. Simulated by 1000 agents. Verified on-chain.</strong><br/>
  <em>Mise en place — everything in its place before the service begins.</em>
</p>

<p align="center">
  <sub>v8.4.0 | Post-Sprint Day 1 | 31 Intel Sources | 4 Contracts | 19 Chains | 1000 Agents | $0/day LLM</sub>
</p>
