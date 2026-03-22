# 🐝 Buzz BD Agent — The Deal-Making Agent of Crypto

**Autonomous Business Development Agent for SolCex Exchange**

| Version | Brain | Server | ERC-8004 | AgentProof | MicroBuzz | CI/CD |
|---------|-------|--------|----------|------------|-----------|-------|
| v8.0.0 | Claude Opus 4.6 (Pro Max) | Hetzner CX43 via Agentic.hosting | #25045 | #1718 | microbuzz.vercel.app/dashboard | ✅ GitHub Actions |

24/7 autonomous token discovery, **triple-verified** safety scoring, **Opus 4.6 brain** running as Claude Code on Hetzner, 12 raw data endpoints for Opus analysis, Premium Twitter BD outreach with 7-type content strategy, MicroBuzz simulation engine with pipeline dashboard, **War Room Telegram command center** (Claude Code responds 24/7), revenue infrastructure with autonomous loop crons, **security hardened** (UFW firewall + SSH key-only + Docker port isolation), and **BUZZ_RULES.md prompt hardening** for CEX listings. Self-improving AI agent with dual memory (Honcho + Supermemory), closed learning loop, CI/CD self-deploy pipeline, outcomes tracking + calibration system, and **4 public agent skills on skills.sh**. Built by a chef who codes through conversation. No CS degree. Just Claude and persistence.

**AIXBT finds alpha. Bankr deploys tokens. Buzz closes deals. And proves it with triple-verified Opus-reasoned data.**

---

## 🐝 What Is Buzz?

Buzz is an autonomous AI BD (Business Development) agent that runs 24/7 on Hetzner CX43 (Helsinki), finding promising token projects for SolCex Exchange listings across **Solana, Ethereum, Base, BSC, and Tron** chains.

**The architecture:** Claude Code (Opus 4.6) IS the brain. Buzz Docker container is the body. Sentinel is the immune system.

**The pipeline:** Discover → **Triple Verify** → Score → **Opus Brain Analyze** → Outreach → Deploy → Learn → List

Buzz collects data via 22 automated crons across 25 intel sources, then Claude Code (Opus 4.6, Pro Max unlimited) reads raw data via 12 dedicated endpoints, applies deep reasoning to analyze each token, scores on a 100-point composite system with **5 dimensions (safety + wallet + social + scorer + technical)**, drafts outreach and tweets for CEO approval, and continuously improves by comparing predictions vs outcomes — all autonomously, 24/7 from Hetzner.

**No data surfaces without triple verification. Our credibility is our product.**

**What's NEW in v8.0.0 (Day 35 — Project Opus Brain):**
- **Claude Code IS Buzz** — Opus 4.6 brain running 24/7 in tmux on Hetzner CX43 (8 vCPU, 16GB RAM). Pro Max unlimited compute. $0/day LLM burn.
- **ALL external LLMs KILLED** — MiniMax, Bankr LLM, Anthropic API all stripped. 50+ cascadeCall() removed. LLM proxy/cascade disabled.
- **12 Raw Data Endpoints** — Claude Code consumes raw scanner, safety, wallet, social, technical, scores, and simulation data directly.
- **Outcomes Tracking + Calibration** — Compare predictions vs reality at 30/60/90 days. Self-improving scoring.
- **Security Hardened** — UFW firewall (22/80/443 only), SSH key-only auth, Docker port isolation via DOCKER-USER iptables chain.
- **Server Upgraded** — CX23 (4GB) → CX43 (16GB RAM, 8 vCPU, $9.99/mo). Room for brain + body.
- **15 LLM Crons Disabled** — Replaced by Opus Brain scheduled tasks (morning review, evening review, weekly digest).
- **8 Dead Crons Removed** — Bankr, AgentProof, Nansen, Financial Datasets endpoints all dead.
- **AIXBT Engaged** — Public analysis comparison. AIXBT responded: "respect the build."
- **First Opus Brain Tweets** — Data-backed analysis with bull/bear cases, algorithm-optimized.
- **War Room 24/7** — Claude Code responds to Ogie in Telegram without @mention, any time.

**Previous milestones:**
- **v7.8.0 (Day 34)** — LLM Cost Proxy (6 endpoints), Cache fix (stripCacheControl), Bankr DNS fix, Sim agent guard, Sentinel wired to real cost data.
- **v7.7.0 (Day 33)** — MiniMax M2.7, Technical Analyst (RSI/MACD), Adversarial Debate, War Room Telegram, Batch Sims (21 PROCEED), MicroBuzz Dashboard, BUZZ_RULES.md, skills.sh.
- **v7.6.0 (Day 32)** — MiroFish Stage 1: 20-agent simulation. Financial Datasets MCP. Revenue infrastructure. Hybrid swarm record.
- **v7.5.5 (Day 32B)** — Triple Verification Layer. 3-Tier LLM Cascade. Synthesis hackathon.

Cost: $9.99/month infrastructure + ~$200/month Pro Max subscription = **~$210/month flat** for a full autonomous BD operation with Opus-level intelligence. $0/day variable LLM costs.

---

## 🐝 Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  HETZNER CX43 — Helsinki, Finland (buzzbd.ai / 204.168.137.253)  │
│  16 GB RAM / 8 vCPU / 40 GB SSD — $9.99/month                    │
│  Security: UFW ON | SSH key-only | Docker ports isolated          │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  CLAUDE CODE (THE BRAIN) — tmux session, claude user          │ │
│  │  Opus 4.6 | Pro Max unlimited | 24/7                          │ │
│  │  Telegram: War Room + Ogie DM (requireMention: false)         │ │
│  │  Reads: localhost:3000/api/v1/raw/* (12 endpoints)            │ │
│  │  Writes: localhost:3000/api/v1/* (POST endpoints)             │ │
│  │  Deploys: git push → GitHub Actions → CI/CD                   │ │
│  │  Identity: /home/claude-code/buzz-workspace/CLAUDE.md         │ │
│  │  Auto-restart: systemd + health cron (5min) + watchdog (10min)│ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  BUZZ DOCKER (THE BODY) — ah-managed container                │ │
│  │  Runtime: OpenClaw v2026.3.13                                  │ │
│  │  Prompt Hardening: BUZZ_RULES.md (auto-injected)              │ │
│  │                                                                │ │
│  │  PORT 3000  → REST API (~135 endpoints, 55 tables)            │ │
│  │  PORT 18789 → OpenClaw Gateway                                │ │
│  │  PORT 8000  → Honcho v3.0.3 (Dual Memory)                    │ │
│  │  PORT 5432  → PostgreSQL + pgvector                           │ │
│  │  PORT 9222  → Headless Chrome (localhost only)                │ │
│  │                                                                │ │
│  │  ┌────────────────────────────────────────────────────┐       │ │
│  │  │  TRIPLE VERIFICATION LAYER                          │       │ │
│  │  │  ├── Check 1: DexScreener (contract address key)   │       │ │
│  │  │  ├── Check 2: CoinGecko (cross-reference)          │       │ │
│  │  │  ├── Check 3: Internal (DB consistency)             │       │ │
│  │  │  ├── VERIFIED = data surfaces                       │       │ │
│  │  │  └── QUARANTINED = data blocked                     │       │ │
│  │  └────────────────────────────────────────────────────┘       │ │
│  │                                                                │ │
│  │  ┌────────────────────────────────────────────────────┐       │ │
│  │  │  RAW DATA ENDPOINTS (Claude Code consumes)          │       │ │
│  │  │  ├── /raw/scan/:address     (DexScreener+AIXBT)    │       │ │
│  │  │  ├── /raw/safety/:address   (RugCheck+ethskills)   │       │ │
│  │  │  ├── /raw/wallet/:address   (Helius+Allium)        │       │ │
│  │  │  ├── /raw/social/:address   (Serper+social)        │       │ │
│  │  │  ├── /raw/technical/:address (OHLCV+RSI+MACD)     │       │ │
│  │  │  ├── /raw/scores/:address   (all sub-scores)       │       │ │
│  │  │  ├── /raw/simulate/:address (full data package)    │       │ │
│  │  │  ├── /outcomes/:address     (30/60/90 day track)   │       │ │
│  │  │  └── /calibration/*         (prediction accuracy)  │       │ │
│  │  └────────────────────────────────────────────────────┘       │ │
│  │                                                                │ │
│  │  ┌────────────────────────────────────────────────────┐       │ │
│  │  │  MIROFISH SIMULATION ENGINE                         │       │ │
│  │  │  ├── Rule-based verdicts (50 agents)                │       │ │
│  │  │  ├── Opus Brain qualitative override                │       │ │
│  │  │  ├── EV = p × W − (1−p) × L                       │       │ │
│  │  │  ├── Outcomes tracking + calibration                │       │ │
│  │  │  └── Dashboard: microbuzz.vercel.app/dashboard      │       │ │
│  │  └────────────────────────────────────────────────────┘       │ │
│  │                                                                │ │
│  │  22 active crons (data collection) | 25 intel sources         │ │
│  │  2 WebSocket feeds | CI/CD: GitHub Actions → Docker Hub       │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  SENTINEL v2.0 (port 3001) — ah-managed, DO NOT MODIFY            │
│  CADDY — HTTPS auto-cert, reverse proxy (buzzbd.ai)               │
│  MICROBUZZ — microbuzz.vercel.app/dashboard                       │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🐝 Triple Verification Layer

**NO DATA SURFACES WITHOUT TRIPLE VERIFICATION.**

| Check | Source | Verifies |
|-------|--------|----------|
| Check 1 | DexScreener API | Contract address → name, symbol, chain, mcap, liquidity |
| Check 2 | CoinGecko API | Cross-reference: name match, mcap within 20% |
| Check 3 | Internal DB | Consistency, chain format, freshness (<1 hour) |

| Status | Meaning | Action |
|--------|---------|--------|
| ✅ VERIFIED | All 3 pass | Data can surface |
| 🚫 QUARANTINED | 1+ failed | Data BLOCKED |
| ⚠️ UNVERIFIED | Insufficient data | Data BLOCKED |
| ⏰ STALE | >1 hour old | Must re-verify |

---

## 🐝 Opus Brain — How Intelligence Works

**Before (v7.8.0):** 10 agents calling cheap LLMs (MiniMax M2.7 + bankr/gpt-5-nano). Shallow reasoning, cascade failover complexity, $3-4/day variable cost.

**After (v8.0.0):** Claude Code (Opus 4.6) reads raw data from 12 endpoints and applies deep reasoning. One brain, unlimited compute, $0/day variable.

**Example — Opus Brain catching what rules miss:**
```
Rule engine: $LUCIA scores 100/100. STRONG_BUY. 50/50 unanimous.
Opus Brain: Override to 35. REJECT.
  - $15K mcap with $38K volume = active dump
  - Down 42% in 24h = death spiral  
  - 1 buy vs 10 sells last hour = buyers gone
  - PumpSwap origin = 95% failure rate
  - WordPress website = 10-minute setup
```

Rules can't smell a rug. Opus can.

---

## 🐝 MiroFish Simulation Engine

Dashboard at **microbuzz.vercel.app/dashboard**.

| Field | Value |
|-------|-------|
| Rule Engine | 50 agents (5 personas × 10 weight variations) — instant, $0 |
| Opus Override | Claude Code qualitative analysis — deep, $0 (Pro Max) |
| EV Formula | EV = p × W − (1−p) × L |
| Gate | Requires VERIFIED status |
| Calibration | /outcomes + /calibration endpoints track prediction accuracy |

---

## 🐝 Scoring System (100 Points — 5 Dimensions)

| Dimension | Weight | Source |
|-----------|--------|--------|
| Safety | 0.25 | RugCheck, contract audit, LP lock |
| Wallet | 0.25 | Helius forensics, whale analysis |
| Technical | 0.20 | RSI, MACD, volume, momentum |
| Social | 0.15 | Serper, social metrics |
| Scorer | 0.15 | OKX signals, Nansen, composite |

| Score | Verdict | Action |
|-------|---------|--------|
| 85-100 | 🔥 HOT | Immediate outreach + Opus analysis |
| 70-84 | ✅ QUALIFIED | Queue + Opus analysis |
| 50-69 | 👀 WATCH | Monitor 48h |
| 0-49 | ❌ SKIP | Archive |

---

## 🐝 Twitter (@BuzzBySolCex)

**Voice:** BD professional with alpha edge. Real data-backed analysis.
**Brain:** Opus 4.6 drafts every tweet. No templates, no generic bot content.
**Approval:** All tweets → War Room → Ogie approves → post.

### 7 Tweet Types
1. **SCAN ALPHA** (3x/week) — Deep Opus analysis on trending tokens
2. **LISTING PITCH** (2x/week) — Why SolCex listing matters
3. **MARKET INTEL** (2x/week) — Market observations, invite debate
4. **ECOSYSTEM ENGAGEMENT** (daily) — Reply to projects/agents/influencers
5. **BUILD IN PUBLIC** (2x/week) — Real tech, "built by a chef"
6. **SIMULATION SHOWCASE** (1x/week) — MiroFish results with bull/bear
7. **MOLTBOOK CROSS-POST** (1x/week) — Cross-platform content

### Algorithm Optimization
- Self-reply = 150x boost (ALWAYS do this)
- Questions at end = 27x (drives replies)
- Images = +30% boost
- No links in main tweet (-50% penalty)
- Max 2 hashtags
- Post 13:00-16:00 UTC

**AIXBT engagement (Day 34):** Challenged AIXBT to public analysis comparison on $CHIBI. AIXBT responded: *"respect the build. let's see what your agent's got."* Validated Buzz's bear case on liquidity risk.

---

## 🐝 Intelligence Sources (25)

| # | Source | Layer | Purpose |
|---|--------|-------|---------|
| 1 | DexScreener | L1 | Token discovery + Verification |
| 2 | GeckoTerminal | L1 | Pool data |
| 3 | AIXBT | L1 | Momentum signals |
| 4 | CoinMarketCap | L1 | Market data |
| 5 | BNB Chain MCP | L1 | BSC tokens |
| 6 | Bitget API | L1 | Exchange data |
| 7 | OKX Market Data | L1 | 1,010 instruments + WebSocket |
| 8 | Bags.fm | L1 | 168K tokens indexed |
| 9 | RugCheck | L2 | Rug pull detection |
| 10 | Helius API + MCP | L2 | Solana forensics (60 tools) + WebSocket |
| 11 | Allium | L2 | On-chain analytics |
| 12 | ETH Skills | L2 | Builder reputation |
| 13 | Serper | L3 | Google search |
| 14 | Firecrawl API | L3 | Web scraping |
| 15 | ATV Web3 Identity | L3 | ENS + socials |
| 16-25 | Nansen, X API, Bankr, Moltbook, AgentProof, CoinGecko, OKX WS, Financial Datasets, Firecrawl CLI | Various | Smart money, social, identity, prices |

---

## 🐝 Security

| Layer | Status |
|-------|--------|
| UFW Firewall | ON — 22/80/443 only, all else DENIED |
| SSH | Key-only auth, no passwords, max 3 tries |
| Docker Ports | DOCKER-USER iptables chain blocks external access |
| Caddy | HTTPS auto-cert, reverse proxy for all public endpoints |
| Chrome | Bound to localhost only |
| API | BUZZ_API_ADMIN_KEY on all endpoints |
| Prompt | BUZZ_RULES.md hardening in Docker image |
| Sentinel | 15min sweeps, auto-repair |

---

## 🐝 Agent Skills (skills.sh)

**Published:** `npx skills add buzzbysolcex/agent-skills`

| Skill | Description |
|-------|-------------|
| dexscreener-intel | Real-time DEX data across 60+ chains |
| aixbt-momentum | AI-powered crypto momentum tracking |
| token-scoring | 100-point composite scoring (5 dimensions) |
| listing-simulation | MiroFish simulation with adversarial debate |

---

## 🐝 Cost

| Component | Cost |
|-----------|------|
| Hetzner CX43 (8 vCPU, 16GB RAM) | $9.99/month |
| Claude Code Pro Max (Opus 4.6 unlimited) | ~$200/month |
| MicroBuzz (Vercel free) | $0 |
| External LLM calls | **$0/day** |
| **Total** | **~$210/month flat** |

---

## 🐝 Version History

| Version | Date | Highlights |
|---------|------|------------|
| **v8.0.0** | **Mar 23, 2026** | **PROJECT OPUS BRAIN. Claude Code IS Buzz. Opus 4.6, Pro Max unlimited, 24/7 Hetzner. ALL external LLMs killed. 12 raw data endpoints. Outcomes + calibration. Security hardened (UFW+SSH+Docker). CX23→CX43. 15 LLM crons disabled. AIXBT: "respect the build." $0/day LLM burn.** |
| v7.8.0 | Mar 22, 2026 | LLM Cost Proxy. Cache fix. Bankr DNS fix. Sim guard. Sentinel wired. |
| v7.7.0 | Mar 20, 2026 | MiniMax M2.7. Technical Analyst. Adversarial Debate. War Room. Batch Sims. Dashboard. BUZZ_RULES.md. skills.sh. |
| v7.6.0 | Mar 19, 2026 | MiroFish Stage 1. Financial Datasets MCP. Revenue infra. |
| v7.5.5 | Mar 19, 2026 | Triple Verification. 3-Tier LLM Cascade. |
| v7.5.0 | Mar 15, 2026 | Bags.fm, agentic.hosting migration. |
| v7.4.x | Mar 14, 2026 | Twitter + Hedge Brain, Hetzner migration. |
| v1.0.0 | Feb 1, 2026 | First deployment on Akash Network. |

---

## 🐝 Roadmap

| Phase | Target | Status |
|-------|--------|--------|
| Foundation → CI/CD → Twitter | Complete | ✅ |
| MiroFish Simulation + Debate | Complete | ✅ |
| Triple Verification | Complete | ✅ |
| Revenue Infrastructure | Complete | ✅ |
| War Room + Opus Brain | Complete | ✅ |
| **Phase 1: Close First Deal ($5K)** | **Active** | **🔨** |
| Phase 2: Monte Carlo (100 iterations) | Month 2 | 🔵 |
| Phase 3: BaaS via x402 | Month 2-3 | 🔵 |
| Phase 4: Mobile App | Month 3-6 | 🔵 |
| Phase 5: $BUZZ Token | Month 4-6 | 🔵 |
| Phase 6: Zero-Human Exchange Listing Company | Month 6-12 | 🔵 |

**ZHC Readiness: 78%**

---

## 🐝 Registrations & Identity

| Platform | ID | Chain |
|----------|-----|-------|
| ERC-8004 | #25045 | Ethereum |
| ERC-8004 | #17483 | Base |
| ERC-8004 | #18709 | Base (anet) |
| AgentProof | #1718 | Avalanche |
| Solana 8004 | 9pQ6K...XUBS | Solana |
| Virtuals ACP | #17681 | — |
| Colosseum | #3734 | — |
| Moltbook | c606278b | — |
| Synthesis | e61039b7 | Base |

---

## 🐝 Links

| Platform | URL |
|----------|-----|
| Domain | [buzzbd.ai](https://buzzbd.ai) |
| SolCex Exchange | [solcex.io](https://solcex.io) |
| MicroBuzz Dashboard | [microbuzz.vercel.app/dashboard](https://microbuzz.vercel.app/dashboard) |
| Agent Skills | `npx skills add buzzbysolcex/agent-skills` |
| Twitter | [@BuzzBySolCex](https://x.com/BuzzBySolCex) |
| SolCex Twitter | [@SolCex_Exchange](https://x.com/SolCex_Exchange) |
| Telegram (BD Agent) | [@BuzzBySolCex_bot](https://t.me/BuzzBySolCex_bot) |
| Telegram (Brain) | [@buzz_claude_code_bot](https://t.me/buzz_claude_code_bot) |
| Builder | [@HidayahAnka1](https://x.com/HidayahAnka1) |

---

## 🐝 Architectural Inspiration

Buzz's simulation engine is inspired by the MiroFish lineage (666ghj — academic multi-agent swarm simulation). Buzz cherry-picks the pattern and applies it to crypto exchange BD with Opus 4.6 as the reasoning layer. No code was copied; the implementation is original.

---

## 🐝 License

Proprietary — SolCex Exchange. All rights reserved.

---

*🐝 "AIXBT finds alpha. Bankr deploys tokens. Buzz closes deals."*

*Buzz BD Agent v8.0.0 — Sprint Day 35 | Mar 23, 2026*
*Claude Code IS Buzz | Opus 4.6 | Pro Max unlimited | 24/7 on Hetzner CX43*
*~135 endpoints | 22 crons | 55 tables | 25 intel | $0/day LLM | $210/mo flat*
*ALL external LLMs killed | Security hardened | AIXBT: "respect the build"*
*Pipeline: 53 tokens | 26 HOT | ZHC Readiness: 78%*
*Built by a chef who codes through conversation. No CS degree. Just Claude and persistence.*
