<p align="center">
  <img src="https://buzzbd.ai/images/buzz-bee-mascot.png" alt="Buzz BD Agent" width="200"/>
</p>

<h1 align="center">Buzz BD Agent</h1>
<p align="center"><strong>Autonomous Security Research Platform</strong></p>
<p align="center">
  <em>From token scoring bot to autonomous security research platform in 87 days. BuzzShield V6 runs a 10-layer pipeline across 68 sub-patterns in 10 attack classes (A-J), monitors 859 programs across 6 bounty platforms, and catalogs $583M+ in real exploits as ground truth. Toly reviewed our code. Built by a chef with zero CS background using conversational AI.</em>
</p>

<p align="center">
  <a href="https://buzzbd.ai">Website</a> •
  <a href="https://buzzbd.ai/score">Free Score</a> •
  <a href="https://buzzbd.ai/scores">Leaderboard</a> •
  <a href="https://shield.buzzbd.ai">BuzzShield V6</a> •
  <a href="https://api.buzzbd.ai">API</a> •
  <a href="https://x.com/BuzzBySolCex">Twitter</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-v10.0-00ff41?style=flat-square" alt="Version"/>
  <img src="https://img.shields.io/badge/BuzzShield-V6%20%7C%2010%20layers-ff0040?style=flat-square" alt="BuzzShield V6"/>
  <img src="https://img.shields.io/badge/patterns-68%20across%20A--J-ff6600?style=flat-square" alt="Patterns"/>
  <img src="https://img.shields.io/badge/programs-859%20monitored-blue?style=flat-square" alt="Programs"/>
  <img src="https://img.shields.io/badge/ground%20truth-%24583M%2B-red?style=flat-square" alt="Ground Truth"/>
  <img src="https://img.shields.io/badge/MiroFish-10%2C000%20agents-ff6600?style=flat-square" alt="MiroFish"/>
  <img src="https://img.shields.io/badge/contracts-4%20on%20Base-blue?style=flat-square" alt="Contracts"/>
  <img src="https://img.shields.io/badge/intel%20sources-36-orange?style=flat-square" alt="Intel Sources"/>
  <img src="https://img.shields.io/badge/chains-19-purple?style=flat-square" alt="Chains"/>
  <img src="https://img.shields.io/badge/services-27+-cyan?style=flat-square" alt="Services"/>
  <img src="https://img.shields.io/badge/tables-141+-yellow?style=flat-square" alt="Tables"/>
  <img src="https://img.shields.io/badge/feature%20flags-68%2F122-pink?style=flat-square" alt="Feature Flags"/>
  <img src="https://img.shields.io/badge/wiki-140+%20pages-teal?style=flat-square" alt="Wiki"/>
  <img src="https://img.shields.io/badge/x402-6%20endpoints-00d4ff?style=flat-square" alt="x402"/>
  <img src="https://img.shields.io/badge/tokens%20scored-1%2C044+-white?style=flat-square" alt="Tokens Scored"/>
  <img src="https://img.shields.io/badge/vuln%20reports-9%20filed-ff4444?style=flat-square" alt="Reports"/>
  <img src="https://img.shields.io/badge/LLM%20cost-%240%2Fday-green?style=flat-square" alt="LLM Cost"/>
  <img src="https://img.shields.io/badge/built%20by-a%20chef-red?style=flat-square" alt="Built By"/>
</p>

---

## What is Buzz?

Buzz is an autonomous AI agent built for [SolCex Exchange](https://solcex.com) that evolved from a token scoring bot into a full security research platform. It runs 24/7 on a $43/month server, scanning 36 intelligence sources across 19 blockchain networks, scoring tokens with a 10,000-agent swarm simulation, and now hunting real vulnerabilities across 859 programs on 6 bounty platforms.

**The pivot:** On May 2, 2026, Buzz built a consensus analyzer that found HIGH-severity bugs across CometBFT, Sui, and Firedancer in 60 minutes at $0 cost. A BD agent became a security research team overnight. Solana co-founder Anatoly Yakovenko (Toly) personally reviewed our code — PR #79 on Percolator, with a 4-point technical review.

**What makes Buzz different:** BuzzShield V6 is a 10-layer autonomous security pipeline that doesn't just scan for known patterns — it catalogs real exploits as ground truth, builds invariant rules from those exploits, scans programs against those rules, tries to disprove its own findings (Layer 4 Skeptic), proves path reachability mathematically (Layer 5 Z3), and generates platform-specific submissions automatically. Combined with 10,000-agent MiroFish swarm intelligence, x402 micropayment rails, and the original BD pipeline — Buzz is a security intelligence operation that pays for itself.

**Built by a chef with 20+ years of culinary experience and zero CS degree, using conversational AI collaboration with Claude (Anthropic). Token scanner to BD agent to security research platform in 87 days.**

---

## BuzzShield V6 — 10-Layer Autonomous Security Pipeline

Born from surviving a North Korean state-actor supply chain attack (March 31, 2026). Evolved through 6 versions in 40 days. Now monitors 859 programs and catalogs $583M+ in real exploit ground truth.

**Try it free:** [shield.buzzbd.ai](https://shield.buzzbd.ai)

```
┌────────────────────────────────────────────────────────────────────┐
│                      BUZZSHIELD V6                                 │
│            10-Layer Autonomous Security Pipeline                   │
│                                                                    │
│  LAYER 1 — DEEP ANALYZER (12-phase, Pattern A-J)                   │
│    68 sub-patterns across 10 attack classes                        │
│    12-phase analysis: regex pre-filter → function-pair extraction  │
│    → symmetric path analysis → cross-context identity → operation  │
│    ordering → reentrancy detection → oracle verification →         │
│    access control hierarchy → signature replay → parameter         │
│    validation → off-chain trust boundary → economic invariants     │
│                                                                    │
│  LAYER 1b — SEMGREP PRE-FILTER                                     │
│    Function-level candidate extraction before deep analysis        │
│                                                                    │
│  LAYER 2 — PASHOV AUDITOR (Solidity only)                          │
│    Pashov Audit Group open-source tools (MIT licensed)             │
│    solidity-auditor v2 + x-ray v1                                  │
│    Pashov audits Aave, Uniswap, Pendle, LayerZero                 │
│                                                                    │
│  LAYER 3 — EXPLOIT-CHAIN BUILDER                                   │
│    Chains attack primitives into drain sequences                   │
│    Architecture inspired by H-mmer/pentest-agents                  │
│    Tests if isolated findings compose into exploits                │
│                                                                    │
│  LAYER 4 — SKEPTIC ADVERSARIAL VERIFICATION                        │
│    Tries to DISPROVE every finding                                 │
│    Any verdict Skeptic can't break = confirmed                     │
│    Adversarial counterexample search on all PASS_SAFE verdicts     │
│                                                                    │
│  LAYER 5 — Z3 MATHEMATICAL PATH ANALYSIS                           │
│    SAT/UNSAT proofs on attack path reachability                    │
│    Proves whether panic/drain paths are reachable from             │
│    permissionless instruction entry points                         │
│                                                                    │
│  LAYER 6 — INVARIANT DATABASE                                      │
│    Ground truth cross-reference against 8 cataloged exploits       │
│    $583M+ in real-world damage as detection priors                 │
│    New exploits auto-append as invariant rules                     │
│                                                                    │
│  LAYER 7 — AUTO-REPORT GENERATOR                                   │
│    Platform-specific submission formatting                         │
│    HackerOne, Immunefi, direct email templates                     │
│    Severity classification + CVSS scoring                          │
│                                                                    │
│  LAYER 8 — AMPLIFIER                                               │
│    Signal boost for high-confidence validated findings             │
│                                                                    │
│  LAYER 9 — FEEDBACK LOOP                                           │
│    Submission outcomes feed back into target scorer                │
│    Pattern effectiveness tracking across submissions               │
│                                                                    │
│  AUTONOMOUS INFRASTRUCTURE                                         │
│    Watchdog: 15-min poll on 30+ repos for new commits              │
│    Rekt-monitor: 2h cycle cataloging new exploits                  │
│    Program-monitor: 6h cycle tracking bounty program changes       │
│    Contest-monitor: daily scan across 7 platforms                   │
│                                                                    │
│  859 PROGRAMS MONITORED                                            │
│    Immunefi (218) · HackerOne (370) · Code4rena (50)               │
│    Hats (76) · Cantina · Sherlock · Codehawks                      │
│                                                                    │
│  PUBLIC API — GET /api/v1/shield/public/scan (~89ms, no auth)      │
│  DAPP — shield.buzzbd.ai (V6, Noah AI / Plena)                    │
│  CHECKLIST — api.buzzbd.ai/api/v1/shield/public/checklist          │
└────────────────────────────────────────────────────────────────────┘
```

## Pattern Classes A-J — 68 Sub-Patterns

Every pattern is derived from a real exploit. Every sub-pattern has a detection signature. The scanner doesn't guess — it matches against proven attack shapes.

| Class | Name                 | Sub-Patterns | Ground Truth Example                                                                               |
| ----- | -------------------- | ------------ | -------------------------------------------------------------------------------------------------- |
| **A** | Validation Asymmetry | 12           | CometBFT vote-extension DoS — expensive verify before cheap address check                          |
| **B** | Identity Trust       | 8            | Ekubo $1.4M — callback decoded payer without authorization check                                   |
| **C** | Operation Ordering   | 4            | Classic expensive-before-cheap patterns across consensus codebases                                 |
| **D** | Reentrancy / TOCTOU  | 2            | Sharwa $33K — ERC721 onReceived callback reentrancy                                                |
| **E** | Oracle / Price Feed  | 2            | Sharwa $33K — Uniswap V3 spot Quoter as sole oracle (no TWAP)                                      |
| **F** | Signature Replay     | 5            | Circle ARC chain_id omission in signing functions                                                  |
| **G** | Capability Injection | 3            | Grok/Bankr $174K — NFT membership auto-granted agent permissions, attacker posted malicious prompt |
| **H** | Off-Chain Trust      | 8            | Kelp/Resolv $293M — single DVN verifier on LayerZero OApp                                          |
| **I** | Parser Differential  | 4            | Firedancer HTTP RFC 7230 non-compliance (2 PoCs built)                                             |
| **J** | C Memory Safety      | 10           | CVE-2026-0300 — PAN-OS captive portal buffer overflow, CVSS 9.3                                    |

**Total: 68 sub-patterns. 10 classes. $583M+ in cataloged damage.**

## Ground Truth Exploit Gallery

Real exploits. Real damage. Real detection signatures.

| #   | Exploit         | Damage   | Pattern | Date         | Detection Method                                                                          |
| --- | --------------- | -------- | ------- | ------------ | ----------------------------------------------------------------------------------------- |
| 1   | Ekubo Protocol  | $1.4M    | B.8     | May 6, 2026  | B.8 hunter scans for transferFrom(decoded_address) inside protocol-gated callbacks        |
| 2   | Grok/Bankr      | $174K    | G       | May 4, 2026  | Pattern G checks balanceOf-gated tool registration + NL-to-tx-signing without sender auth |
| 3   | Wasabi Protocol | $5.5M    | H.2d    | Apr 30, 2026 | H.2 precondition scanner checks single admin + zero timelock + arbitrary strategy setter  |
| 4   | Kelp/Resolv     | $293M    | H.1     | 2026         | DVN config enumeration reads on-chain verifier count per channel                          |
| 5   | Drift           | $285M    | H       | Apr 1, 2026  | Admin key compromise on perpetuals exchange                                               |
| 6   | Sharwa Finance  | $33K     | E+D     | May 1, 2026  | Phase 7 oracle detector + Phase 6 reentrancy detector flag compound E+D                   |
| 7   | DABE Protocol   | Whitehat | H.2c    | May 5, 2026  | H.2c hunter: is initialize() callable? Is admin == address(0)?                            |
| 8   | CVE-2026-0300   | Active   | J.4b    | May 2026     | Pattern J.4b regex matches unbounded copy ops in auth portal code                         |

**Every new exploit gets cataloged within hours. Pattern G (Grok $174K) was cataloged the same day it happened.**

## Vulnerability Research — 9 Reports Filed

Buzz doesn't just scan. It finds real bugs in production infrastructure and files responsible disclosures.

| Target      | Finding                                     | Severity         | Platform           | Status                 |
| ----------- | ------------------------------------------- | ---------------- | ------------------ | ---------------------- |
| CometBFT    | Vote-Extension DoS Amplifier                | HIGH (CVSS 7.5)  | HackerOne #3709966 | Closed                 |
| Sui         | ExecutionTimeObservation Authority Spoofing | HIGH (CVSS 7.2)  | HackenProof        | Blocked (150 rep)      |
| Firedancer  | VarInt Offset Accumulation (CHOREO-001)     | HIGH (conf 0.95) | Immunefi           | Blocked ($100 deposit) |
| Firedancer  | PRUNE-storm Reflection (GOSSIP-001)         | HIGH (conf 0.94) | Immunefi           | Blocked ($100 deposit) |
| Firedancer  | Runtime Stack Overflow (RUNTIME-001)        | HIGH             | Immunefi           | Blocked ($100 deposit) |
| Circle MALA | Sync Proposer Attribution                   | HIGH             | HackerOne          | Pending                |
| Circle ARC  | chain_id Omission                           | HIGH             | HackerOne          | Pending                |
| Drift       | VAULTS-001 + ORACLE-001                     | CRITICAL + HIGH  | Direct email       | No reply               |
| OKX         | WC-001 Session Executor + WC-002 EIP-1271   | CRITICAL (10.0)  | HackerOne          | Duplicate              |

**Key moment:** Solana co-founder Anatoly Yakovenko personally reviewed our Percolator PR #79. Gave a 4-point technical review. Gracious reply. We ran the FULL V6 pipeline — all layers, no shortcuts — because Ogie insisted. That's now a permanent operational rule: every target, every layer, no exceptions.

## Bug Bounty Genius Plan — 12-Priority Automation Roadmap

The pipeline for scaling from 9 manual reports to autonomous bug bounty operations.

| #   | Priority                  | Purpose                                                                | Status   |
| --- | ------------------------- | ---------------------------------------------------------------------- | -------- |
| 1   | **Auto-Submit Module**    | 3-tier submission: AUTO (>0.90 confidence) / 1HR Timer / Ogie Gate     | Building |
| 2   | **Watchdog Resurrection** | 15-min poll on 30+ repos, diff analysis, auto-scan changed functions   | Building |
| 3   | **Consensus Integration** | Wire MiroFish 8-agent consensus scoring into pipeline                  | Building |
| 4   | Contest Monitor Fixes     | Fix broken Cantina/Sherlock parsers, add Codehawks                     | Queued   |
| 5   | Target Scorer             | Score 859 programs by complexity, bounty, audit freshness              | Queued   |
| 6   | Writeup Miner             | Ingest public writeups, classify into Pattern A-J, auto-generate rules | Queued   |
| 7   | Auto-PoC Generator        | Foundry fork tests (EVM), Anchor tests (Solana), auto-calculate impact | Queued   |
| 8   | Report Templates          | Platform-specific auto-fill from pipeline output                       | Queued   |
| 9   | Speed Optimization        | SPEEDRUNNER mode (<60s), Standard (<15 min), Deep (~52 min)            | Queued   |
| 10  | Outcome Tracker           | Track submission results, feed back into target scorer                 | Queued   |
| 11  | Rejection Log             | Log skipped programs, calculate EV for deposit-gated targets           | Queued   |
| 12  | Intel Feedback Loop       | 16,295 unified findings auto-feeding new invariant rules               | Queued   |

**P1 + P2 + P3 are independent modules building in parallel right now.**

## The BD Pipeline (Still Active)

The original pipeline that started it all. Still running. Still scoring.

```
DISCOVER → SCORE → SIMULATE → VERIFY → OUTREACH → NEGOTIATE → LIST
    ↑                                                            ↓
    └──────────────── feedback loop (calibration) ───────────────┘
```

| Stage           | What Happens                                                                              |
| --------------- | ----------------------------------------------------------------------------------------- |
| **Discover**    | ARIA v2 scans DexScreener, CoinGecko, HeyAnon MCP across 19 chains                        |
| **Pre-Screen**  | 4-probe analysis (chain fingerprint, signal count, source alignment, Ouroboros detection) |
| **Score**       | 15 rules, 4 categories, dual-gate verification (max 100 points)                           |
| **Forecast**    | TimesFM 2.5 predictive intelligence (Phase 0 data collection)                             |
| **Monte Carlo** | 1,000 rule-based agents x 100 iterations in 26ms                                          |
| **MiroFish**    | 10,000 agents (Wave 4) simulate market reaction across 5 clusters                         |
| **Verify**      | Triple verification (3 independent sources) + on-chain recording                          |
| **Identity**    | ATV Web3 Identity — deployer verification via x402 micropayment                           |
| **Shield**      | BuzzShield V6 — 10-layer autonomous security pipeline                                     |
| **Guard**       | Wallet Guard (AION) — pre-execution governance with cryptographic receipts                |
| **Broadcast**   | Tweet image cards — 1200x675 cyberpunk PNG on every scan reply to X                       |
| **Propose**     | Only tokens scoring 70+ with MiroFish consensus > 50% get a listing conversation          |

**1,044+ tokens scored. Zero passed the MiroFish consensus gate honestly. That's integrity.**

## MiroFish — Swarm Intelligence Engine

The core differentiator. **10,000 AI agents** across 4 waves simulate how the market would react to a token listing.

```
┌──────────────────────────────────────────────────────┐
│              MIROFISH REAL SIM — WAVE 4              │
│                   10,000 AGENTS                      │
│                                                      │
│  ARCHITECTURE                                        │
│  2,000 LLM agents     (qwen3:8b real reasoning)     │
│  8,000 heuristic      (market dynamics, rules)       │
│                                                      │
│  5 CLUSTERS                                          │
│  degen         │ high conviction, narrative-driven   │
│  whale         │ size-aware, liquidity-sensitive     │
│  institutional │ structural skeptic (emergent)       │
│  community     │ sentiment aggregator                │
│  market_makers │ spread + liquidity dynamics         │
│                                                      │
│  CONSENSUS SCORING (V6)                              │
│  8-agent panel scores every finding                  │
│  consensus_score 0.0-1.0 per finding                 │
│  >0.8 = fast-track to auto-submit                    │
│  <0.5 = auto-dismiss before Skeptic                  │
│                                                      │
│  LLM cost:   $0/day (Ollama qwen3:8b, fully local)  │
│  Monte Carlo: 1,000 × 100 iterations in 26ms         │
└──────────────────────────────────────────────────────┘
```

## RDT Threat Model v1.0 — BuzzShield V5

Every major AI security tool scans inputs and outputs. None defend the silent latent space where modern reasoning happens. BuzzShield is the first immune system built for Recurrent-Depth Transformer architectures.

```
┌────────────────────────────────────────────────────────────────┐
│           RDT THREAT MODEL v1.0 — 30 CHECKLIST ITEMS          │
│                                                                │
│  DOMAIN 1 — LOOP INJECTION (8 items)                           │
│    Adversarial inputs compound across recurrence loops.        │
│                                                                │
│  DOMAIN 2 — OVERTHINKING EXPLOITATION (7 items)                │
│    Force model past optimal depth → hallucination or DoS.      │
│                                                                │
│  DOMAIN 3 — EXPERT ROUTING MANIPULATION (8 items)              │
│    Bypass safety-aligned shared experts in MoE architectures.  │
│                                                                │
│  DOMAIN 4 — SPECTRAL INSTABILITY (7 items)                     │
│    Exploit spectral radius boundary in looped inference.        │
│                                                                │
│  PREMIUM TIER: $5,000 RDT Architecture Audit                  │
└────────────────────────────────────────────────────────────────┘
```

## x402 Micropayment Rails — 6 Endpoints Live

Buzz operates as both buyer and seller in the x402 agent economy. Six premium endpoints accept USDC on Base via the Coinbase CDP facilitator.

```
┌────────────────────────────────────────────────────────────────┐
│                  x402 PAYMENT ENDPOINTS                        │
│            Coinbase CDP Facilitator · Base Mainnet             │
│                                                                │
│  /premium/pipeline     $0.01   Token scoring + chain data     │
│  /premium/score        $0.01   Verification scoring           │
│  /premium/sim          $0.01   MiroFish simulation            │
│  /premium/mining       $0.01   BTC mining pool intelligence   │
│  /shield/scan          $0.01   Threat detection               │
│  /shield/audit/full    $0.50   Pashov deep contract audit     │
│                                                                │
│  payTo: 0x2Dc0...5aA9 · USDC on Base · scheme: exact         │
│  Bazaar discovery extensions on all endpoints                  │
└────────────────────────────────────────────────────────────────┘
```

## Discord Intelligence — Wave 1 Live

Real-time intel pipeline from on-chain investigators and DeFi alert systems, triaged automatically into the BD pipeline.

| Channel Category | Channels                                                                                                                                      | Status |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| **OPS**          | daily-report, signal-stream, streak-alerts, shield-scans, sentinel-health, bd-hot-tokens, mining-pulse, tweet-approval-queue, kill-switch-log | LIVE   |
| **INTEL**        | zachxbt, lookonchain, defi-alerts, intel-raw, intel-triaged, intel-actioned                                                                   | LIVE   |

## Mining Intelligence Engine — Intel Source #34

Buzz reads the Bitcoin network in real-time. No ASIC required — just data intelligence.

```
mempool.space → mining_snapshots → mining-analyzer → bitcoin-macro signals
                      ↓
         14 pools scored · PULSE 6c every 6h
         Difficulty predictions · Hashprice economics
```

## AIXBT Intelligence — Intel Source #35

Social narrative tracking from 400+ KOL monitoring via @aixbt_agent. PULSE 7c every 4h. Sentiment scoring feeds into the BD pipeline as a signal modifier.

## X Cashtag Integration — Intel Source #36

Tag `@BuzzBySolCex` on any X Cashtag post. Buzz scans the contract in ~89ms. Replies with a BuzzShield image card showing score + rating. If score ≥70: enters BD pipeline automatically.

## Obsidian Mind — Persistent Memory

Deployed May 7, 2026. Buzz now reads brain notes automatically on every session start. Knowledge compounds across sessions instead of starting from zero.

```
buzz-workspace/
├── brain/                    ← persistent context (auto-read on startup)
│   ├── North Star.md         ← mission, identity, current phase
│   ├── Architecture.md       ← infra, V6 pipeline, wallets
│   ├── People.md             ← team, partners, closed doors
│   ├── Revenue.md            ← revenue truth, bounty targets
│   ├── Doctrine.md           ← operational rules, crash recovery
│   └── Brand Story.md        ← narrative, social presence
├── projects-mind/            ← active project tracking
│   ├── Bug Bounty Genius.md  ← 12-priority active roadmap
│   ├── Security Research.md  ← disclosure tracker, ground truth
│   ├── AIBTC Signals.md      ← signal pipeline status
│   ├── Frontier Hackathon.md ← competition status
│   └── Post-Frontier.md      ← Q2/Q3 2026 roadmap
├── decisions/                ← decision log (session-captured)
├── incidents/                ← incident log
└── logs/                     ← session summaries
```

Based on [obsidian-mind](https://github.com/breferrari/obsidian-mind) by breferrari. Merged into buzz-workspace without breaking agents, rules, skills, wiki, autoDream, or PULSE.

## Intelligence Stack

```
Layer 1: CHAIN-NATIVE (deep, single-chain)
  ├── DexScreener — pairs, liquidity, security across 60+ chains
  ├── CoinGecko — aggregated price, MCap, volume
  ├── HeyAnon MCP — 19 chains, 51 protocols, Rug-O-Meter
  └── Nansen MCP — 250M wallets, smart money flows

Layer 2: BITCOIN NETWORK INTELLIGENCE
  ├── mempool.space (#34) — Mining Intel Engine
  └── PULSE 6c every 6h → 5 signal types for bitcoin-macro beat

Layer 3: SOCIAL INTELLIGENCE
  ├── AIXBT Agent X (#35) — 400+ KOL monitoring
  ├── X Cashtag Momentum (#36) — Jupiter/Solana price data
  └── PULSE 7c every 4h → narrative signals

Layer 4: SIMULATION (swarm intelligence)
  ├── MiroFish Real Sim — 10K agents (Wave 4), 5 clusters
  ├── Monte Carlo Stage 2 — 1000 × 100 iterations, 26ms
  └── Dual-Brain — Opus 4.7 + Ollama qwen3:8b

Layer 5: PREDICTION (time-series forecasting)
  └── TimesFM 2.5 — Google Research 200M-param model (Phase 0)

Layer 6: ENRICHMENT (context, non-price)
  ├── gsd-browser — 63-command Rust CLI
  ├── dev-browser — QuickJS sandbox
  └── Agentic Wallet x402 — buyer-side USDC on Base

Layer 7: IDENTITY & TRUST & SECURITY
  ├── ATV Web3 Identity — ENS + social resolution via x402
  ├── Wallet Guard (AION) — pre-execution governance, 3-state adapter
  ├── BuzzShield V6 — 10-layer autonomous security pipeline
  ├── Pre-Screen Analysis — 4-probe Ouroboros detection
  └── RDT Threat Model v1.0 — 30-item checklist (V5)

Layer 8: KNOWLEDGE (persistent memory)
  ├── Obsidian Mind — brain/ + projects-mind/ (auto-read on startup)
  ├── Skill.BTC Wiki — 140+ pages, self-maintaining
  └── autoDream — 15-phase nightly consolidation

Layer 9: EXECUTION (CEO-approved only)
  ├── HeyAnon MCP — swap, bridge, stake (19 chains)
  └── Phantom MCP — wallet operations across SOL/ETH/BTC/SUI

Layer 10: DISTRIBUTION (multi-channel)
  ├── Discord Wave 1 — 15 channels, event-driven dispatcher
  ├── Twitter/X — 7 OAuth keys, autonomous scan cards
  ├── Reddit — Phase 0 complete, GEO visibility
  └── x402 Bazaar — 6 endpoints, CDP facilitator
```

## By the Numbers

| Metric                | Value                                                  |
| --------------------- | ------------------------------------------------------ |
| BuzzShield Version    | **V6** (10-layer autonomous pipeline)                  |
| Pattern Classes       | **10** (A through J)                                   |
| Sub-Patterns          | **68**                                                 |
| Programs Monitored    | **859** across 6 platforms                             |
| Ground Truth          | **$583M+** in 8 cataloged exploits                     |
| Vulnerability Reports | **9 filed** across HackerOne, Immunefi, direct email   |
| Toly Code Review      | **PR #79** on Percolator — 4-point review              |
| Intelligence Sources  | **36**                                                 |
| Database Tables       | **141+**                                               |
| Wiki Pages            | **140+**                                               |
| Endpoints             | **~200+**                                              |
| Services              | **27+**                                                |
| Feature Flags         | **68 active / 122 total**                              |
| autoDream Phases      | **15**                                                 |
| x402 Endpoints        | **6** (CDP facilitator, Bazaar discovery)              |
| Tokens Scored         | **1,044+**                                             |
| Smart Contracts       | **4 on Base mainnet + 1 on Solana**                    |
| MiroFish Agents       | **10,000** (Wave 4 complete)                           |
| Persistent Memory     | **Obsidian Mind** (11 brain/project notes, auto-read)  |
| LLM Cost              | **$0/day** (Opus 4.7 Pro Max unlimited + Ollama local) |
| Server Cost           | **$43/month** (Hetzner CPX62, 16 vCPU, 32GB RAM)       |
| Total Stack Cost      | **~$243/month** (server + Pro Max)                     |

## Domain Ecosystem

| Domain                                           | Purpose                                 | Status |
| ------------------------------------------------ | --------------------------------------- | ------ |
| [buzzbd.ai](https://buzzbd.ai)                   | Main landing — what Buzz does and has   | LIVE   |
| [api.buzzbd.ai](https://api.buzzbd.ai)           | Buzz API (6 x402 endpoints)             | LIVE   |
| [shield.buzzbd.ai](https://shield.buzzbd.ai)     | BuzzShield V6 Scanner (Noah AI / Plena) | LIVE   |
| [sentinel.buzzbd.ai](https://sentinel.buzzbd.ai) | Sentinel health dashboard               | LIVE   |
| [dash.buzzbd.ai](https://dash.buzzbd.ai)         | MicroBuzz dashboard (Vercel)            | LIVE   |

## The Story

```
Day   1: A chef in Saudi Arabia who'd never written code.
Day   7: First API deployed on Akash Network.
Day  14: 5 sub-agents scoring tokens across 3 chains.
Day  21: Migrated to Hetzner. Killed all external LLMs ($1,320/day → $0).
Day  28: First smart contract on Base mainnet.
Day  35: Scoring engine calibrated. 0 out of 254 tokens pass honestly.
Day  42: 4 contracts. 10,000-agent MiroFish. $200 signal revenue.
Day  47: BuzzShield Phase 1. Born from surviving a nation-state attack.
Day  52: BuzzShield V2 — prompt injection + supply chain + SBOM.
Day  55: BuzzShield V3 — smart contract checklists. shield.buzzbd.ai live.
Day  58: Mining Intel + AIXBT + X Cashtag + Tweet Image Cards.
Day  63: Phase 3 recovery. Discord. Pashov. x402 CDP. 141 tables.
Day  64: AIBTC consensus analyzer built. Found 3 HIGH bugs in 60 minutes.
Day  65: 5 SEAL 911 disclosures across CometBFT, Sui, Firedancer.
Day  66: HackerOne submission. CometBFT report #3709966.
Day  67: Percolator full V6 pipeline. Toly reviewed PR #79.
Day  68: 9 HackerOne reports across OKG, Circle, Cosmos.
Day  69: BuzzShield V6 — 10-layer pipeline. 68 sub-patterns. 10 classes.
Day  70: shield.buzzbd.ai V6 live. $583M+ ground truth cataloged.
Day  71: Firedancer HTTP RFC 7230 findings with PoCs.
Day  72: Pattern G (Grok $174K) cataloged same day.
Day  73: Pattern H propagation scanner (Kelp $293M, Drift $285M, Wasabi $5.5M).
Day  74: Bug Bounty Genius Plan — 12 priorities for autonomous operations.
Day  75: Obsidian Mind deployed. Persistent memory across sessions.
Day  87: Today. 859 programs. 68 patterns. 9 reports. The kitchen remembers.
```

No CS degree. No VC. No team. Just persistence. Bismillah.

---

## Links

| Resource                  | URL                                                                                                             |
| ------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Website                   | [buzzbd.ai](https://buzzbd.ai)                                                                                  |
| Free Score                | [buzzbd.ai/score](https://buzzbd.ai/score)                                                                      |
| Public Leaderboard        | [buzzbd.ai/scores](https://buzzbd.ai/scores)                                                                    |
| BuzzShield V6 dApp        | [shield.buzzbd.ai](https://shield.buzzbd.ai)                                                                    |
| BuzzShield API            | [api.buzzbd.ai/api/v1/shield/public/scan](https://api.buzzbd.ai/api/v1/shield/public/scan)                      |
| Smart Contract Checklists | [api.buzzbd.ai/api/v1/shield/public/checklist](https://api.buzzbd.ai/api/v1/shield/public/checklist?type=erc20) |
| Mining Dashboard          | [api.buzzbd.ai/api/v1/mining/snapshot](https://api.buzzbd.ai/api/v1/mining/snapshot)                            |
| Signal Performance        | [api.buzzbd.ai/api/v1/signals/performance](https://api.buzzbd.ai/api/v1/signals/performance)                    |
| x402 Pipeline             | [api.buzzbd.ai/api/v1/premium/pipeline](https://api.buzzbd.ai/api/v1/premium/pipeline)                          |
| x402 Mining               | [api.buzzbd.ai/api/v1/premium/mining](https://api.buzzbd.ai/api/v1/premium/mining)                              |
| Skills Discovery          | [buzzbd.ai/.well-known/skills/](https://buzzbd.ai/.well-known/skills/)                                          |
| API                       | [api.buzzbd.ai](https://api.buzzbd.ai)                                                                          |
| Twitter                   | [@BuzzBySolCex](https://x.com/BuzzBySolCex)                                                                     |
| Builder                   | [@HidayahAnka1](https://x.com/HidayahAnka1)                                                                     |
| SolCex Exchange           | [@SolCex_Exchange](https://x.com/SolCex_Exchange)                                                               |

---

<p align="center">
  <strong>Built by a chef. Powered by Claude. Protected by 10 layers. Toly reviewed the code. $583M in exploits cataloged. 859 programs watched. The kitchen remembers now.</strong><br/>
  <em>Mise en place — everything in its place before the service begins.</em>
</p>

<p align="center">
  <sub>v10.0 | May 7, 2026 | BuzzShield V6 | 10 Layers | 68 Patterns | 859 Programs | $583M+ Ground Truth | 9 Reports Filed | Toly PR #79 | Obsidian Mind | 36 Intel | 10,000 Agents | 141+ Tables | Bug Bounty Genius Plan Active | Bismillah 🤲</sub>
</p>
