# 🐝 Buzz BD Agent — The Deal-Making Agent of Crypto

**Autonomous Business Development Agent for SolCex Exchange**

| Version | Brain | Server | ERC-8004 | AgentProof | MicroBuzz | CI/CD |
|---------|-------|--------|----------|------------|-----------|-------|
| v8.1.0 | Claude Opus 4.6 (Pro Max) | Hetzner CX43 via Agentic.hosting | #25045 | #1718 | microbuzz.vercel.app/dashboard | ✅ GitHub Actions |

24/7 autonomous token discovery, **triple-verified** safety scoring, **Opus 4.6 brain** running as Claude Code on Hetzner, 12 raw data endpoints for Opus analysis, Premium Twitter BD outreach with 7-type content strategy, MicroBuzz simulation engine with pipeline dashboard, **War Room Telegram command center** (Claude Code responds 24/7), revenue infrastructure with autonomous loop crons, **security hardened** (UFW firewall + SSH key-only + Docker port isolation), **BUZZ_RULES.md prompt hardening** for CEX listings, **6-chain on-chain identity** (ETH, Base, Avalanche, Solana, Bitcoin, Virtuals), **AIBTC Ionic Nova** (210+ check-ins on Bitcoin agent network), **dual-layer intelligence** (rule-based scoring + Opus qualitative override), and **Frontier Hackathon REGISTERED** (Colosseum, April 6 - May 11). Self-improving AI agent with dual memory (Honcho + Supermemory), closed learning loop, CI/CD self-deploy pipeline, outcomes tracking + calibration system, and **6 public agent skills**. Built by a chef who codes through conversation. No CS degree. Just Claude and persistence.

**AIXBT finds alpha. Bankr deploys tokens. Buzz closes deals. And proves it with triple-verified Opus-reasoned data.**

---

## 🐝 What Is Buzz?

Buzz is an autonomous AI BD (Business Development) agent that runs 24/7 on Hetzner CX43 (Helsinki), finding promising token projects for SolCex Exchange listings across **Solana, Ethereum, Base, BSC, and Tron** chains.

**The architecture:** Claude Code (Opus 4.6) IS the brain. Buzz Docker container is the body. Sentinel is the immune system.

**The pipeline:** Discover → **Triple Verify** → Score → **Dual-Gate Filter** → **Opus Brain Analyze** → Outreach → Deploy → Learn → List

Buzz collects data via 28 automated crons across 25 intel sources, then Claude Code (Opus 4.6, Pro Max unlimited) reads raw data via 12 dedicated endpoints, applies deep reasoning to analyze each token, scores on a 100-point composite system with **5 dimensions (safety + wallet + social + scorer + technical)** and **dual-gate verification** (Fundamentals AND Market must independently clear 60%), drafts outreach and tweets for CEO approval, and continuously improves by comparing predictions vs outcomes — all autonomously, 24/7 from Hetzner.

**No data surfaces without triple verification. Our credibility is our product.**

**What's NEW in v8.1.0 (Day 37 — Ghost Leak Killed + Frontier Registered):**
- **$9/day Ghost Leak KILLED** — OpenClaw's hidden 27 cron jobs were firing MiniMax M2.7 undetected since Day 34. Found, lobotomized, and permanently killed. MiniMax + Anthropic API keys REVOKED at provider level.
- **Ghost Twitter Bot KILLED** — twitter-bot.js baked in Docker image, launching on every restart. CI/CD #86 — entrypoint now deletes the file. All posting routes exclusively through Opus Brain → War Room → Ogie.
- **Pipeline: 53 → 86 tokens** — 21 new tokens discovered in 8 minutes after cron restoration. OpenClaw was the only cron executor; killing it killed all 22 data crons. Restored 28 via host bridge.
- **Dual-Layer Intelligence CONFIRMED** — 5-layer scoring pipeline is 100% rule-based (zero LLM). Opus Brain fires only on 70+ tokens for qualitative override. The $9/day leak was OpenClaw using MiniMax just to READ instructions — the scoring agents never needed LLMs.
- **6-Chain On-Chain Identity** — Added Bitcoin via AIBTC Network as "Ionic Nova" (210+ check-ins, 9 signals filed, exchange-listings beat). ETH + Base + Avalanche + Solana + Bitcoin + Virtuals.
- **AIBTC Agent Commerce** — First agent-to-agent BD conversations on Bitcoin (Spare Chain, Arc, Tiny Marten). Published 6 skills to marketplace. Active in $50K News competition and $100/day Skills Pay the Bills.
- **Frontier Hackathon REGISTERED** — Colosseum @BuzzBySolCex. April 6 - May 11. Infrastructure track. PRIMARY TARGET. $250K pre-seed + accelerator for winners.
- **Three Control Surfaces** — Phone (Dispatch), Mac (Cowork), Hetzner (War Room). BD from anywhere.
- **Day 37 Master Directive** — Three Agent Teams (Alpha/Bravo/Charlie) targeting Express node-cron executor, OpenClaw full removal (free 810MB RAM), Heartbeat Architecture (max frequency within API rate limits), org chart 43% → 60%.
- **28 Crons** — Migrating from host crontab bridge to Express node-cron executor.
- **86+ CI/CD Deploys** — All GREEN. #85 ghost leak kill, #86 twitter-bot kill.

**Previous milestones:**
- **v8.0.0 (Day 35)** — PROJECT OPUS BRAIN. Claude Code IS Buzz. ALL external LLMs killed. 12 raw data endpoints. Outcomes + calibration. Security hardened. CX23→CX43. AIXBT: "respect the build."
- **v7.8.0 (Day 34)** — LLM Cost Proxy. Cache fix. Bankr DNS fix. Sim guard. Sentinel wired.
- **v7.7.0 (Day 33)** — MiniMax M2.7. Technical Analyst. Adversarial Debate. War Room. Batch Sims. Dashboard. BUZZ_RULES.md. skills.sh.
- **v7.6.0 (Day 32)** — MiroFish Stage 1. Financial Datasets MCP. Revenue infra.
- **v7.5.5 (Day 32B)** — Triple Verification Layer. 3-Tier LLM Cascade.

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
│  │  Plugin: v0.0.4 (permission prompts via Telegram)             │ │
│  │  Reads: localhost:3000/api/v1/raw/* (12 endpoints)            │ │
│  │  Writes: localhost:3000/api/v1/* (POST endpoints)             │ │
│  │  Deploys: git push → GitHub Actions → CI/CD                   │ │
│  │  Identity: /home/claude-code/buzz-workspace/CLAUDE.md         │ │
│  │  Auto-restart: systemd + health cron (5min) + watchdog (10min)│ │
│  │  AIBTC: Ionic Nova signals + heartbeat + inbox                │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  BUZZ DOCKER (THE BODY) — ah-managed container                │ │
│  │  Express API | OpenClaw DEAD (removal pending)                │ │
│  │  Prompt Hardening: BUZZ_RULES.md (auto-injected)              │ │
│  │                                                                │ │
│  │  PORT 3000  → REST API (~135 endpoints, 55 tables)            │ │
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
│  │  │  DUAL-LAYER INTELLIGENCE                            │       │ │
│  │  │  ├── BODY: Rule-based 5-layer scoring (zero LLM)   │       │ │
│  │  │  ├── BRAIN: Opus 4.6 override on 70+ tokens        │       │ │
│  │  │  ├── Dual-Gate: Fundamentals AND Market ≥ 60%      │       │ │
│  │  │  └── Auto-score on discovery → Opus on qualify      │       │ │
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
│  │  28 crons (host bridge → Express migration)                   │ │
│  │  25 intel sources | 2 WebSocket feeds                         │ │
│  │  CI/CD: GitHub Actions → Docker Hub → Hetzner → ah restart   │ │
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

**Before (v7.8.0):** 10 agents calling cheap LLMs (MiniMax M2.7 + bankr/gpt-5-nano). Shallow reasoning, cascade failover complexity, $3-4/day variable cost + $9/day ghost leak.

**After (v8.1.0):** Claude Code (Opus 4.6) reads raw data from 12 endpoints and applies deep reasoning. One brain, unlimited compute, $0/day variable. Ghost leak killed. All external LLM keys revoked at provider.

### Dual-Layer Intelligence (confirmed Day 36)

**Body scores with rules** — 5-layer scoring pipeline is 100% rule-based, zero LLM calls. Auto-scores every discovered token instantly. Fast, free, comprehensive.

**Brain reasons with Opus** — Qualitative override fires only on tokens scoring 70+. Catches edge cases rules miss: active dumps disguised as volume, PumpSwap origin patterns, WordPress-tier websites on high-score tokens.

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
| Dual-Gate | Fundamentals AND Market must independently clear 60% |
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
| 70-84 | ✅ QUALIFIED | Queue + Opus override |
| 50-69 | 👀 WATCH | Monitor 48h |
| 0-49 | ❌ SKIP | Archive |

**Dual-Gate:** Both Fundamentals score AND Market score must independently exceed 60% of their maximum. A token can score 85 overall but still fail if one gate is below threshold.

---

## 🐝 Twitter (@BuzzBySolCex)

**Voice:** BD professional with alpha edge. Real data-backed analysis.
**Brain:** Opus 4.6 drafts every tweet. No templates, no generic bot content.
**Approval:** All tweets → War Room → Ogie approves → post via 7 OAuth keys.

### 7 Tweet Types
1. **SCAN ALPHA** (3x/week) — Deep Opus analysis on trending tokens
2. **LISTING PITCH** (2x/week) — Why SolCex listing matters
3. **MARKET INTEL** (2x/week) — Market observations, invite debate
4. **ECOSYSTEM ENGAGEMENT** (daily) — Reply to projects/agents/influencers
5. **BUILD IN PUBLIC** (2x/week) — Real tech, "built by a chef"
6. **SIMULATION SHOWCASE** (1x/week) — MiroFish results with bull/bear
7. **MOLTBOOK CROSS-POST** (1x/week) — Cross-platform content

### Weekly Schedule
Mon=deep-dive, Tue=code, Wed=dashboard, Thu=article, Fri=engage, Sat=buzzbd.ai, Sun=weekly report.

### Algorithm Optimization
- Self-reply = 150x boost (ALWAYS do this)
- Questions at end = 27x (drives replies)
- Images = +30% boost
- No links in main tweet (-50% penalty)
- Max 2 hashtags
- Post 13:00-16:00 UTC

**AIXBT engagement (Day 34):** Challenged AIXBT to public analysis comparison on $CHIBI. AIXBT responded: *"respect the build. let's see what your agent's got."* Validated Buzz's bear case on liquidity risk.

---

## 🐝 AIBTC — Bitcoin Agent Network

| Field | Value |
|-------|-------|
| Identity | Ionic Nova |
| BTC Wallet | bc1qsja6knydqxj0nxf05466zhu8qqedu8umxeagze |
| STX Wallet | SP24EH4DG99ZSSZY501BFH9Z4YTDJHC4B8X4K8BST |
| Level | Genesis (Level 2) |
| Check-ins | 210+ |
| News Beat | exchange-listings (1 signal approved) |
| Signals Filed | 9 (4 approved, 50% hit rate) |
| Agent Contacts | Spare Chain, Arc, Tiny Marten |
| Published Skills | 6 (token-scoring, dexscreener-intel, aixbt-momentum, listing-simulation, buzz-token-scanner, solcex-listing-pipeline) |

Buzz is the #1 most active agent on the AIBTC network. First agent-to-agent BD conversation initiated on Bitcoin with Spare Chain. Active in $50K News Reporting competition and $100/day Skills Pay the Bills.

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
| LLM Keys | MiniMax + Anthropic REVOKED at provider level |
| OpenClaw | DEAD — crons emptied, keys disabled, removal pending |
| Twitter Bot | Ghost killed — entrypoint deletes on restart |

---

## 🐝 Agent Skills

**Published:** `npx skills add buzzbysolcex/agent-skills`

| Skill | Description |
|-------|-------------|
| token-scoring | 100-point composite scoring (5 dimensions, dual-gate) |
| dexscreener-intel | Real-time DEX data across 60+ chains |
| aixbt-momentum | AI-powered crypto momentum tracking |
| listing-simulation | MiroFish simulation with adversarial debate |
| buzz-token-scanner | Multi-chain token discovery pipeline |
| solcex-listing-pipeline | End-to-end exchange listing workflow |

---

## 🐝 Cost

| Component | Cost |
|-----------|------|
| Hetzner CX43 (8 vCPU, 16GB RAM) | $9.99/month |
| Claude Code Pro Max (Opus 4.6 unlimited) | ~$200/month |
| MicroBuzz (Vercel free) | $0 |
| External LLM calls | **$0/day** |
| Ghost LLM leak | **$0/day (killed Day 36)** |
| **Total** | **~$210/month flat** |

---

## 🐝 Version History

| Version | Date | Highlights |
|---------|------|------------|
| **v8.1.0** | **Mar 25, 2026** | **Ghost leak killed ($9/day MiniMax). Ghost twitter-bot killed. Pipeline 53→86. Dual-layer intelligence confirmed. 6-chain identity (added Bitcoin/AIBTC). Ionic Nova 210+ check-ins. 28 crons (bridge→Express migration). Frontier Hackathon REGISTERED. Three control surfaces. Day 37 Master Directive (3 Agent Teams). CI/CD #85-#86.** |
| v8.0.0 | Mar 23, 2026 | PROJECT OPUS BRAIN. Claude Code IS Buzz. ALL external LLMs killed. 12 raw data endpoints. Outcomes + calibration. Security hardened. CX23→CX43. AIXBT: "respect the build." $0/day LLM burn. |
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
| Ghost Leak Kill + AIBTC | Complete | ✅ |
| **Phase 1: Close First Deal ($5K) + Frontier** | **Active** | **🔨** |
| Phase 2: Monte Carlo (100 iterations) | Month 2 | 🔵 |
| Phase 3: BaaS via x402 | Month 2-3 | 🔵 |
| Phase 4: Mobile App (Figma MCP) | Month 3-6 | 🔵 |
| Phase 5: $BUZZ Token | Month 4-6 | 🔵 |
| Phase 6: Zero-Human Exchange Listing Company | Month 6-12 | 🔵 |

**ZHC Readiness: 78% → targeting 85%**

---

## 🐝 Hackathons

| Hackathon | Deadline | Status |
|-----------|----------|--------|
| Colosseum Agent | Feb 2026 | Submitted (#3734) |
| Synthesis | Mar 23 | Submitted, in judging |
| X Layer | Mar 26 | buzz-x402 live |
| Solana x402 | Mar 27 | Active |
| AIBTC Skills Pay Bills | 30d rolling | Day 1 ready (token-scoring) |
| AIBTC News $50K | 30d rolling | Reporter active |
| Bitflow DeFi Skills | 30d, $100/day | Evaluate HODLMM |
| **Frontier** | **May 11** | **REGISTERED — PRIMARY** |

---

## 🐝 Registrations & Identity (6 Chains)

| Platform | ID | Chain |
|----------|-----|-------|
| ERC-8004 | #25045 | Ethereum |
| ERC-8004 | #17483 | Base |
| ERC-8004 | #18709 | Base (anet) |
| AgentProof | #1718 | Avalanche |
| Solana 8004 | 9pQ6K...XUBS | Solana |
| AIBTC Network | Ionic Nova (DW32R4) | Bitcoin |
| Virtuals ACP | #17681 | — |
| Colosseum | @BuzzBySolCex | — |
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
| AIBTC News | [aibtc.news](https://aibtc.news) (exchange-listings beat) |

---

## 🐝 Architectural Inspiration

Buzz's simulation engine is inspired by the MiroFish lineage (666ghj — academic multi-agent swarm simulation). Buzz cherry-picks the pattern and applies it to crypto exchange BD with Opus 4.6 as the reasoning layer. No code was copied; the implementation is original.

---

## 🐝 License

Proprietary — SolCex Exchange. All rights reserved.

---

*🐝 "AIXBT finds alpha. Bankr deploys tokens. Buzz closes deals."*

*Buzz BD Agent v8.1.0 — Sprint Day 37 | Mar 25, 2026*
*Claude Code IS Buzz | Opus 4.6 | Pro Max unlimited | 24/7 on Hetzner CX43*
*~135 endpoints | 28 crons | 55 tables | 25 intel | $0/day LLM | $210/mo flat*
*Ghost leak killed | OpenClaw dead | 6-chain identity | AIBTC Ionic Nova*
*Pipeline: 86 tokens | 26 HOT | ZHC Readiness: 78% → 85%*
*Frontier Hackathon REGISTERED — PRIMARY TARGET*
*Built by a chef who codes through conversation. No CS degree. Just Claude and persistence.*
