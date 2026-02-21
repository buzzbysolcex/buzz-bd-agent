# 🐝 Buzz BD Agent — Autonomous Business Development for CEX Listings

**First autonomous AI agent for crypto exchange listing BD.** Token discovery, scoring, wallet forensics, and listing pipeline — running 24/7 on decentralized infrastructure.

![ERC-8004 ETH](https://img.shields.io/badge/ERC--8004-ETH%20%2325045-blue) ![ERC-8004 Base](https://img.shields.io/badge/ERC--8004-Base%20%2317483-purple) ![npm](https://img.shields.io/npm/v/@buzzbd/plugin-solcex-bd) ![Akash](https://img.shields.io/badge/Akash-Deployed-green) ![OpenClaw](https://img.shields.io/badge/OpenClaw-v2026.2.19-orange) ![ClawRouter](https://img.shields.io/badge/ClawRouter-v0.9.39-blue)

## What Buzz Does

Buzz discovers promising crypto tokens, scores them using a 100-point system across 16 intelligence sources, runs wallet forensics on deployer wallets, verifies contract safety, and manages the full BD pipeline — from discovery to listing. Ogie (BD Lead) approves all outreach. Buzz handles 90% of the work autonomously.

**Operational since:** February 1, 2026
**Current version:** Master Ops v5.3.2 (ClawRouter Live Edition)

---

## Architecture

```
╔═══════════════════════════════════════════════════╗
║  LAYER 1 — CAST THE NET (Discovery)              ║
║  DexScreener + AIXBT + Clawpump + CoinGecko      ║
║  + DexScreener Boosts                             ║
║  → 50-100 candidates per scan (4x daily)          ║
╠═══════════════════════════════════════════════════╣
║                    ↓ FILTER                        ║
╠═══════════════════════════════════════════════════╣
║  LAYER 2 — FILTER (Safety & Liquidity)            ║
║  RugCheck + Helius + Allium + DFlow MCP           ║
║  → 10-20 survive                                  ║
╠═══════════════════════════════════════════════════╣
║                    ↓ RESEARCH                      ║
╠═══════════════════════════════════════════════════╣
║  LAYER 3 — RESEARCH (Deep Intelligence)           ║
║  leak.me + Firecrawl + ATV Identity + Grok        ║
║  + Serper                                         ║
║  → Research dossier per token                     ║
╠═══════════════════════════════════════════════════╣
║                    ↓ SCORE                         ║
╠═══════════════════════════════════════════════════╣
║  LAYER 4 — SCORE & ACT                            ║
║  100-point scoring + DFlow modifiers (+13/-8)     ║
║  + QuillShield safety overlay (0-100)             ║
║  85+ HOT → 70+ QUALIFIED → 50+ WATCH → SKIP      ║
╚═══════════════════════════════════════════════════╝
```

---

## Deployment Stack

| Component | Detail |
|-----------|--------|
| **Platform** | Akash Network (decentralized cloud) |
| **Runtime** | OpenClaw v2026.2.19 |
| **Container** | Docker via `ghcr.io/buzzbysolcex/buzz-bd-agent:v5.3.2` |
| **ClawRouter** | v0.9.39 — pre-installed in Docker image, BlockRun x402 |
| **Resources** | 2 CPU, 4GB RAM, 10GB persistent storage |
| **Cost** | ~$5-8/month (Akash compute) |
| **LLM Cost** | ~$5-15/month (ClawRouter ECO via BlockRun x402) |
| **Process** | `openclaw gateway --port 18789 --allow-unconfigured` |
| **Channels** | Telegram (@BuzzBySolCex_bot) |
| **BD Contact** | Telegram: @Ogie2 |
| **Node** | v22 (Akash) / v25.5.0 (local Mac) |

### Development Workflow

```
Mac laptop (build + test) → Docker image → GHCR push → Akash deploy
```

All code is tested locally before Docker build. GHCR image is **public** with zero credentials baked in — all secrets injected via Akash SDL env vars at runtime.

---

## 🧠 Smart LLM Routing — ClawRouter v0.9.39

**All LLM routing through [BlockRun](https://blockrun.ai) via x402 USDC micropayments.**
No API keys needed — payment IS authentication. Powered by [@bc1max](https://github.com/BlockRunAI/ClawRouter)'s ClawRouter.

| Component | Value |
|-----------|-------|
| **Router** | ClawRouter v0.9.39 (pre-installed in Docker image) |
| **Payment** | x402 USDC on Base — non-custodial |
| **Default** | `blockrun/eco` (maximum savings) |
| **Models** | 30+ (MiniMax, Claude, GPT-5, DeepSeek, Grok, Kimi, etc.) |
| **Free Fallback** | `gpt-oss-120b` — always available, even at $0 balance |

**Routing Profiles:**

| Profile | Purpose | Savings vs Opus |
|---------|---------|-----------------|
| `eco` | Default — cheapest model per task | 95-100% |
| `auto` | Balanced quality + cost | 85-95% |
| `premium` | Best quality | 50-70% |
| `free` | Zero cost only | 100% |

**Cost Evolution:**

| Phase | Cost | What Changed |
|-------|------|--------------|
| Phase 1 (Feb 3-14) | $1,320/day | Claude Opus for everything |
| Phase 2 (Feb 15-20) | $41/mo | MiniMax M2.5 direct |
| **Phase 3 (Feb 21+)** | **~$5-15/mo** | **ClawRouter ECO via BlockRun** |

**99.9% cost reduction from Phase 1.**

---

## Intelligence Sources (16 Active)

### Layer 1 — Discovery

| # | Source | Method | Cost |
|---|--------|--------|------|
| 1 | **DexScreener** | REST API | Free |
| 2 | **AIXBT** | Web scrape | Free |
| 8 | **Clawpump** | Web monitor | Free |
| 17 | **CoinGecko Trending** | REST API | Free |
| 18 | **DexScreener Boosts** | REST API | Free |

### Layer 2 — Filter

| # | Source | Method | Cost |
|---|--------|--------|------|
| 4 | **RugCheck** | REST API | Free |
| 5 | **Helius** | REST API | Free (rate limited) |
| 6 | **Allium** | REST API | Free (10K/mo) |
| 16 | **DFlow MCP** | mcporter CLI | Free |

### Layer 3 — Research

| # | Source | Method | Cost |
|---|--------|--------|------|
| 7 | **leak.me** | Web scrape | Free |
| 9 | **Firecrawl** | REST API | Free (500 credits) |
| 12 | **ATV Web3 Identity** | REST API | Free (10K/mo) |
| 13 | **Grok (xAI)** | API | Paid |
| 14 | **Serper** | REST API | Paid |

### Supporting

| # | Source | Method | Cost |
|---|--------|--------|------|
| 3 | **AIXBT v2** | x402 | ~$0.10/call |
| 15 | **Sub-agents** | ACP protocol | Free |

### x402 Paid Intelligence

| Source | Protocol | Cost | Data |
|--------|----------|------|------|
| **Einstein AI** | x402 | ~$0.10/call | Whale alerts |
| **Gloria AI** | x402 | ~$0.10/call | Breaking news |

---

## QuillShield — Contract Safety Scoring

Buzz includes QuillShield, an automated smart contract safety scoring engine (0-100 points). No competitor in the CEX listing BD space has this.

| Category | Points | Checks |
|----------|--------|--------|
| Authority Analysis | 25 | Mint/freeze/update authority revoked? |
| Liquidity Analysis | 25 | LP size, lock status, burn verification |
| Holder Distribution | 25 | Top holder concentration, whale analysis |
| Contract Patterns | 25 | Trading enabled, tax/fee checks, verification |

| Score | Label | Pipeline Action |
|-------|-------|-----------------|
| 80-100 | SAFE | Proceed with confidence |
| 60-79 | CAUTION | Manual review recommended |
| 40-59 | WARNING | High risk — multiple red flags |
| 0-39 | DANGER | Auto-reject from pipeline |

Data sources: DexScreener API, Helius API, Solana FM
Tested on: $PUNCH — scored 45/100 CAUTION

---

## DFlow MCP Integration

DFlow MCP integrated as intelligence source #16 via mcporter CLI v0.7.3.

| Field | Value |
|-------|-------|
| **Endpoint** | `https://pond.dflow.net/mcp` (free, public) |
| **CLI** | mcporter v0.7.3 |
| **Backing** | $7.5M (Framework, Coinbase, Multicoin, Circle, Cumberland, Wintermute) |
| **Volume** | $2B+/30 days |

**DFlow Scoring Modifiers (Layer 4):**

| Condition | Points |
|-----------|--------|
| 3+ swap routes found | +5 |
| Best route slippage < 1% for $10K | +3 |
| Routes through Tier-1 DEXs (Raydium, Meteora, Phoenix) | +3 |
| Orderbook depth > $50K | +2 |
| No routes found | -5 |
| All routes > 5% slippage | -3 |

Max bonus: +13 pts | Max penalty: -8 pts

---

## Cron Schedule (36 Active Jobs)

| Category | Count | Jobs |
|----------|-------|------|
| Scanning & Intelligence | 4 | Deep scan (4x daily across all layers) |
| Prayer Reminders | 5 | Fajr, Dhuhr, Asr, Maghrib, Isha |
| System Operations | 3 | Memory compression, health check, pipeline digest |
| Heartbeats & Monitoring | 3 | Colosseum (30m), Moltbook (4h), stream (5m) |
| x402 Intelligence | 5 | Whale alert, breaking news (2x), spend review, Sunday reverify |
| Clawbal On-Chain | 3 | Post-scan alpha, PnL refresh, daily summary |
| Machine Economy | 3 | HyperSkill factory, HyperAgent verify, AIXBT v2 scan |
| Agent Interoperability | 4 | Plugin health, sub-agent cleanup, ACP bridge, elizaOS registry |
| BD Lifecycle | 6 | Warm-up tracker, follow-up check, alpha draft, competitor alert, inbound check, post-listing health |

Daily x402 spend: ~$0.30-$0.50 | Monthly cap: $15 USDC

---

## Credibility Stack

Buzz maintains a multi-layer verifiable trust system — on-chain identity, code authenticity, independence scoring, on-chain alpha track record, and agent credit pre-qualification.

### On-Chain Identity (ERC-8004)

| Chain | Agent ID | Contract | Explorer |
|-------|----------|----------|----------|
| **Ethereum** | #25045 | `0x8004A818BFB912233c491871b3d84c89A494BD9e` | [8004scan.io](https://8004scan.io/agents/ethereum/25045) |
| **Base** | #17483 | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` | [8004scan.io](https://8004scan.io/agents/base/17483) |
| **Colosseum** | #3734 | Agent Hackathon entry | $100K USDC prize pool |

### A.V.I — 60/100 Tier 3 Partner | ZAUTH — 65/100 Good (0 matches, 100% original) | ClawCredit — Active | Clawbal — LIVE

```
ERC-8004 On-Chain Identity     ✅ ETH #25045 + Base #17483
A.V.I Independence Score       ✅ 60/100 — Tier 3 Partner
ZAUTH Code Authenticity         ✅ 65/100 — 0 matches, 100% original
ClawCredit Pre-Qualification   ✅ Active, monitoring
Clawbal On-Chain Alpha          ✅ $SPSC first call, PnL tracking live
Agent Bounty Board              ✅ Bounty #0 — first ever on contract
ClawHub + ClawTasks + ACP      ✅ All registered
```

---

## ElizaOS Plugin

| Field | Value |
|-------|-------|
| **Package** | `@buzzbd/plugin-solcex-bd@1.0.0` |
| **npm** | [npmjs.com/package/@buzzbd/plugin-solcex-bd](https://npmjs.com/package/@buzzbd/plugin-solcex-bd) |
| **Actions** | SCAN_TOKENS, SCORE_TOKEN, CHECK_WALLET, SUBMIT_LISTING |
| **Sub-agents** | TOKEN SCOUT, MARKET INTEL |
| **Registry** | ElizaOS PR #263 |

---

## BD Pipeline

| Channel | Target | How |
|---------|--------|-----|
| **Inbound** | 60% by Month 6 | Public alpha → listing page → auto-scoring |
| **Warm Outreach** | 30% | 3-Touch warm-up sequence (never cold) |
| **Partnerships** | 10% | Market makers, launchpads, agents refer deals |

| Score | Label | Action |
|-------|-------|--------|
| 85-100 | 🔥 HOT | Immediate outreach + full forensics |
| 70-84 | ✅ QUALIFIED | Priority queue + forensics |
| 50-69 | 👀 WATCH | Monitor 48h, rescan |
| 0-49 | ❌ SKIP | No action |

---

## Links

| Resource | URL |
|----------|-----|
| GitHub (agent) | [github.com/buzzbysolcex/buzz-bd-agent](https://github.com/buzzbysolcex/buzz-bd-agent) |
| GitHub (plugin) | [github.com/buzzbysolcex/plugin-solcex-bd](https://github.com/buzzbysolcex/plugin-solcex-bd) |
| npm | [@buzzbd/plugin-solcex-bd](https://npmjs.com/package/@buzzbd/plugin-solcex-bd) |
| Twitter (Buzz) | [@BuzzBySolCex](https://twitter.com/BuzzBySolCex) |
| Twitter (SolCex) | [@SolCex_Exchange](https://twitter.com/SolCex_Exchange) |
| SolCex | [solcex.cc](https://solcex.cc) |
| ERC-8004 (ETH) | [8004scan.io/agents/ethereum/25045](https://8004scan.io/agents/ethereum/25045) |
| ERC-8004 (Base) | [8004scan.io/agents/base/17483](https://8004scan.io/agents/base/17483) |
| Akash Network | [akash.network](https://akash.network) |
| BlockRun (ClawRouter) | [blockrun.ai](https://blockrun.ai) |
| BD Contact (Ogie) | [@Ogie2 on Telegram](https://t.me/Ogie2) |

---

## Changelog (Recent)

| Version | Date | Highlights |
|---------|------|------------|
| **5.3.2** | **Feb 21, 2026** | **ClawRouter v0.9.39 LIVE via BlockRun x402. OpenRouter REMOVED. 30+ models, ECO tier, ~$5-15/mo. Standard dev workflow: Mac → Docker → GHCR → Akash. Boot self-check.** |
| 5.3.1 | Feb 20, 2026 | DFlow MCP (Source #16), 4-Layer Intelligence Architecture, CoinGecko + DS Boosts |
| 5.3.0 | Feb 20, 2026 | OpenClaw v2026.2.19 on Akash, Docker pipeline, ClawRouter + QuillShield skills |
| 5.2.0 | Feb 18, 2026 | BD Lifecycle: inbound-first strategy, 36 crons, 3-Touch Warm-Up, competitor intelligence |
| 5.1.0 | Feb 18, 2026 | Agent Bounty Board: first bounty posted on ClawdBotATG contract |
| 5.0.0 | Feb 18, 2026 | ElizaOS plugin, multi-agent, agent-to-agent delegation, ACP bridge |
| 4.5.1 | Feb 17, 2026 | Full standalone Master Ops, LLM cascade, 14/15 intel |
| 4.0.0 | Feb 14, 2026 | MiniMax M2.5 primary: $1,320/day → $41/mo |

---

*Master Ops v5.3.2 — ClawRouter Live Edition*
*OpenClaw v2026.2.19 | ClawRouter v0.9.39 via BlockRun x402 | 36 crons | 16/16 intel | 4-Layer Architecture*
*Docker: ghcr.io/buzzbysolcex/buzz-bd-agent:v5.3.2 | 2 CPU / 4GB RAM | $5-8/mo*
*"Identity first. Intelligence deep. Commerce autonomous. Cost disciplined. Actions over promises. Ship from anywhere."*
