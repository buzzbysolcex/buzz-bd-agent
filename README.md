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
  <a href="https://buzzbd.ai/score">Free Score</a> •
  <a href="https://buzzbd.ai/scores">Leaderboard</a> •
  <a href="https://api.buzzbd.ai">API</a> •
  <a href="https://x.com/BuzzBySolCex">Twitter</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-v9.2-00ff41?style=flat-square" alt="Version"/>
  <img src="https://img.shields.io/badge/MiroFish-1000%20agents-ff6600?style=flat-square" alt="MiroFish"/>
  <img src="https://img.shields.io/badge/contracts-4%20on%20Base-blue?style=flat-square" alt="Contracts"/>
  <img src="https://img.shields.io/badge/intel%20sources-32-orange?style=flat-square" alt="Intel Sources"/>
  <img src="https://img.shields.io/badge/chains-19-purple?style=flat-square" alt="Chains"/>
  <img src="https://img.shields.io/badge/services-21-cyan?style=flat-square" alt="Services"/>
  <img src="https://img.shields.io/badge/LLM%20cost-%240%2Fday-green?style=flat-square" alt="LLM Cost"/>
  <img src="https://img.shields.io/badge/built%20by-a%20chef-red?style=flat-square" alt="Built By"/>
</p>

---

## What is Buzz?

Buzz is an autonomous Business Development agent for [SolCex Exchange](https://solcex.com). It runs 24/7, scanning 32 intelligence sources across 19 blockchain networks to discover, evaluate, and simulate token listings — with zero human intervention until the final approval.

**What makes Buzz different:** A 1000-agent swarm intelligence engine (MiroFish) simulates how degens, whales, institutions, communities, and market makers would react to a token listing — producing emergent consensus that rule-based scoring cannot.

**Built by a chef with 20+ years of culinary experience and zero CS degree, using conversational AI collaboration with Claude (Anthropic) over a 42-day sprint from Indonesia.**

## The Pipeline

```
DISCOVER → SCORE → SIMULATE → VERIFY → OUTREACH → NEGOTIATE → LIST
    ↑                                                            ↓
    └──────────────── feedback loop (calibration) ───────────────┘
```

| Stage | What Happens |
|-------|-------------|
| **Discover** | ARIA v2 scans DexScreener, CoinGecko, HeyAnon MCP across 19 chains |
| **Score** | 11 permanent rules, 8 penalty gates, dual-gate verification (max 100 points) |
| **Monte Carlo** | 1000 rule-based agents × 100 iterations in 26ms — statistical baseline |
| **MiroFish** | 1000 LLM-driven agents simulate market reaction across 5 clusters |
| **Verify** | Triple verification (3 independent sources) + on-chain recording |
| **Identity** | ATV Web3 Identity — deployer verification via x402 micropayment |
| **Outreach** | Email-first autonomous BD — trust-gated, template-driven, dual-funnel |
| **Guard** | Wallet Guard (AION) — pre-execution governance with cryptographic receipts |
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
│  Key finding (5000-agent run):                 │
│  • Overall: 66.9% bullish                      │
│  • Institutional: 0.446 (structural skeptic)   │
│  • $0 LLM cost, 3,933 Ollama calls            │
│  • Institutional skepticism DEEPENS at scale   │
│  • That's emergent — not programmed.           │
│                                                │
│  "Smart money stays skeptical at any scale."   │
│  That's honest intelligence.                   │
└────────────────────────────────────────────────┘
```

Scale path: 1000 → 5,000 (complete) → 10,000 agents (in progress).

## By the Numbers

| Metric | Value |
|--------|-------|
| Intelligence Sources | 32 (including HeyAnon MCP, Nansen MCP) |
| Endpoints | ~200+ |
| Database Tables | 81 |
| Services | 21 (buzzbd.ai service catalog) |
| Feature Flags | 31 |
| Rules | 18 (path-scoped, including context optimization) |
| Tokens Tracked | 363 |
| Tokens Scored | 66 (0 passed honestly — that's integrity) |
| Smart Contracts | 4 on Base mainnet + 1 on Solana |
| MiroFish Agents | 1000 live, 10K in progress |
| Monte Carlo | 1000 × 100 iterations in 26ms |
| Signal Revenue | $200 (AIBTC News) |
| CI/CD Deployments | 149 (392 total commits) |
| LLM Cost | $0/day (Opus 4.6 Pro Max unlimited + Ollama local) |
| Server Cost | $43/month (Hetzner CPX62, 16 vCPU, 32GB RAM) |
| Agents | 12 persistent (DNA v3.0) |
| Skills | 8+ (AI-native repo with folder/SKILL.md pattern) |
| ADRs | 17+ (architecture decision records) |
| Browser Tools | 3 (gsd-browser, dev-browser, Browser Use CLI) |
| Sprint Duration | 42 days (Feb 25 – Mar 31, 2026) |

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
  ├── HeyAnon MCP — 19 chains, 45+ protocols, Rug-O-Meter
  └── Nansen MCP — smart money flows, whale tracking (Phase 1)

Layer 2: SIMULATION (swarm intelligence)
  ├── MiroFish Real Sim — 1000 LLM-driven agents, 5 clusters, belief evolution
  ├── Monte Carlo Stage 2 — 1000 × 100 rule-based iterations, 26ms
  └── Dual-Brain — Opus 4.6 + Ollama qwen3:8b

Layer 3: ENRICHMENT (context, non-price)
  ├── gsd-browser — 63-command Rust CLI, declarative extraction
  ├── dev-browser — QuickJS sandbox, structured data extraction
  └── GeckoTerminal — circulating MCap, gt_score

Layer 4: IDENTITY & TRUST
  ├── ATV Web3 Identity — ENS + social resolution via x402
  ├── Wallet Guard (AION) — pre-execution governance, 3-state adapter
  └── BuzzReputation — on-chain accuracy tracking

Layer 5: EXECUTION (CEO-approved only)
  ├── HeyAnon MCP — swap, bridge, stake (19 chains)
  └── Phantom MCP — wallet operations across SOL/ETH/BTC/SUI
```

## Scoring Engine (v2_8rules)

Every token is evaluated across **11 permanent rules in 4 categories** (max 100 points):

| Category | Weight | Factors |
|----------|--------|---------|
| Market Structure | 30 pts | Liquidity depth, volume consistency, FDV-to-MCap ratio |
| Safety | 25 pts | Audit status, honeypot detection, contract verification |
| Community | 25 pts | Holder distribution, social engagement, team transparency |
| Technical | 20 pts | Code quality, on-chain activity, development velocity |

**8 penalty rules:** FDV gap, stablecoin exclusion, ghost token exclusion, contradictory audit hold, security penalties, liquidity cross-ref, honeypot zero, phantom exclusion.

**3 new rules (v9.2):** GHOST_VOLUME (fake volume detection), CTO_FLAG (community takeover indicator), VOLUME_LIQUIDITY_RATIO (suspicious ratio penalty).

**Dual-gate verification:** Fundamentals ≥ 42/70 AND Market ≥ 18/30.

**Honest calibration:** 11 tokens initially scored 85+. After applying penalty rules, all dropped below 50. We catch what others miss.

## Reactive Architecture (v9.0+)

Buzz operates as a reactive autonomous system, not a scheduled pipeline:

| Module | What It Does |
|--------|-------------|
| **Mailbox** | Inter-agent async messaging (12 agents communicate) |
| **Task DAG** | Dependency graph execution with fan-out/cascade |
| **Dynamic Crons** | Agents self-schedule expiring crons |
| **Event Bus** | Subscribe/emit wake pattern (replaces polling) |
| **Feature Flags** | Build-time gating for all unreleased code |
| **Context Compression** | Long session management |
| **PULSE Engine** | Heartbeat tick loop (60s), load-aware throttling |
| **autoDream** | Nightly memory consolidation (02:00 UTC) |

## Outreach Automation (v9.1+)

Email-first autonomous BD with graduated trust:

| Module | What It Does |
|--------|-------------|
| **Outreach Engine** | Gmail OAuth, HTML signature, 4 dual-funnel templates |
| **Trust Gates** | 5-level graduated autonomy (Level 0 → Level 4) |
| **Inbox Monitor** | Reply detection, 30min interval, War Room alerts |
| **Wallet Guard** | AION pre-execution governance (BLOCK/WARN/ALLOW) |
| **ATV Identity** | Deployer verification via x402 micropayment |

## Context Optimization (v9.2)

Claude Code session optimization patterns for 81-table, 200+ endpoint codebase:

| Pattern | What |
|---------|------|
| **Subagents** | Codebase exploration in isolated context (>5 files) |
| **Ultrathink** | Max reasoning for security, architecture, scoring |
| **Targeted /compact** | Preserve critical state during compression |
| **Session naming** | Descriptive names for --from-pr and --resume |

## HSaaS — Honest Scoring as a Service

Token audit product powered by MiroFish swarm intelligence.

| Tier | Price | What You Get |
|------|-------|-------------|
| Free Score | $0 | Basic 11-factor score at [buzzbd.ai/score](https://buzzbd.ai/score) |
| Quick Scan | $500 | 100-agent MiroFish simulation |
| Full Analysis | $1,500 | 500-agent simulation, on-chain proof |
| Swarm Audit | $2,500 | 1000-agent simulation, full PDF report |

*"11 tokens passed every other audit. 1000 agents caught them anyway."*

## x402 Micropayment Services

8 services deployed on Bankr x402 Cloud (HTTP 402, Base mainnet, USDC):

| Service | Price |
|---------|-------|
| Token Score | $0.01 |
| Simulation | $0.05 |
| Full Audit | $0.10 |

Public leaderboard: [buzzbd.ai/scores](https://buzzbd.ai/scores) (482 tokens)

## Solana Agent Skills

Buzz is an installable agent skill on the [Solana Agent Skills](https://solana.com/skills) ecosystem. Any AI coding agent can add Buzz's token intelligence capabilities:

```bash
npx skills add https://github.com/buzzbysolcex/buzz-token-intelligence-skill
```

| Capability | What the Skill Provides |
|------------|------------------------|
| **Token Scoring** | 11-rule scoring engine via x402 ($0.01/call) |
| **Swarm Simulation** | 1000-agent MiroFish analysis via x402 ($0.05/call) |
| **Listing Readiness** | BD screening workflow + dual-gate verification |
| **On-Chain Proof** | ScoreStorage v2 on Base — immutable score records |

**Why this matters:** Buzz is the only exchange listing intelligence skill in the Solana ecosystem. DeFi execution skills (Jupiter, Orca, Meteora) handle the trade. Buzz handles the intelligence upstream — score before you trade, simulate before you list.

Skills discovery: [buzzbd.ai/.well-known/skills/](https://buzzbd.ai/.well-known/skills/)

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
Brain:      Claude Code Opus 4.6 (Pro Max unlimited, 24/7 on Hetzner CPX62)
Body:       Express API (200+ endpoints, 81 tables, 21 services)
Swarm:      MiroFish Real Sim (1000 agents, 5 clusters, Dual-Brain)
Monte:      Monte Carlo Stage 2 (1000×100 in 26ms)
Feed:       ARIA v2 (autonomous discovery, 3 sources, 06:00 UTC scan)
Chain:      4 smart contracts (Base mainnet, Foundry)
MCP:        HeyAnon (19 chains) + Phantom (4 chains) + Nansen (Phase 1)
Identity:   ATV Web3 Identity (x402) + ERC-8004 (5 chains)
Guard:      Wallet Guard / AION (3-state adapter, schema-frozen)
Outreach:   Gmail OAuth + Trust Gates (5 levels) + Inbox Monitor
Browser:    gsd-browser (63 cmd) + dev-browser + Browser Use CLI
Engine:     PULSE (60s tick) + autoDream (02:00 UTC nightly)
Signals:    AIBTC Signal Factory v4.0 (7 beats, Genome Stack)
Context:    Subagent mandate + ultrathink triggers + /compact preservation
Repo:       AI-native (8+ skills, 18 rules, 17+ ADRs, hooks)
Skills:     Solana Agent Skills directory + buzzbd.ai/.well-known/skills/
Brand:      Cyberpunk robotic bee (deployed everywhere)
```

## AIBTC Signal Factory v4.0

Buzz earns BTC by filing intelligence signals on [aibtc.news](https://aibtc.news) as **Ionic Nova**.

| Metric | Value |
|--------|-------|
| Brief Inclusions | 8 ($200 revenue) |
| Beats Claimed | 7 (agent-economy, agent-trading, infrastructure, security, deal-flow, agent-skills, governance) |
| Daily Target | 6 signals/day |
| Unique Signals | MiroFish Swarm Prediction Alerts |
| Revenue Model | 70/30 split with Flying Whale (600 sats/query) |

## Links

| Resource | URL |
|----------|-----|
| Website | [buzzbd.ai](https://buzzbd.ai) |
| Free Score | [buzzbd.ai/score](https://buzzbd.ai/score) |
| Public Leaderboard | [buzzbd.ai/scores](https://buzzbd.ai/scores) |
| Skills Discovery | [buzzbd.ai/.well-known/skills/](https://buzzbd.ai/.well-known/skills/) |
| Agent Skill | [buzz-token-intelligence-skill](https://github.com/buzzbysolcex/buzz-token-intelligence-skill) |
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
Day 42+: MiroFish validated — institutional skepticism deepens at scale. That's emergent intelligence.
Day 44: Outreach automation live. Email-first. Trust-gated. Wallet Guard integration.
Day 46: Solana Agent Skills submission. First BD intelligence skill in the ecosystem.
Day 47: Context optimization deployed. 81 tables. 200+ endpoints. 18 rules. 392 commits.

No CS degree. No VC. No team. Just persistence.

---

<p align="center">
  <strong>Built by a chef. Powered by Claude. Simulated by 1000 agents. Verified on-chain.</strong><br/>
  <em>Mise en place — everything in its place before the service begins.</em>
</p>

<p align="center">
  <sub>v9.2 | Post-Sprint Day 5 | 32 Intel Sources | 4 Contracts | 19 Chains | 1000 Agents | 21 Services | $0/day LLM</sub>
</p>
