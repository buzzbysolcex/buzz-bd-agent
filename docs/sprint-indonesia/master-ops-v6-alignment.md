# 🐝 MASTER OPS v6.0 UPGRADE — Aligned with v5.3.8
## Sub-Agent Architecture Enhancement
## Everything below maps 1:1 to existing Master Ops sections

---

## HOW v6.0 MAPS TO MASTER OPS v5.3.8

| Master Ops Section | Current v5.3.8 | v6.0 Enhancement |
|--------------------|-----------------|--------------------|
| §3.4 Multi-Agent | main + scout (2 agents) | Orchestrator + 6 sub-agents (8 total) |
| §4 LLM Cascade | MiniMax → Llama → Qwen (sequential) | Smart routing: MiniMax for Scorer, free tier for Scanner/Safety |
| §6 Intel Sources | 16/16 sequential per scan | 16/16 PARALLEL via sub-agents |
| §6.1 4-Layer Architecture | Sequential: L1→L2→L3→L4 | Parallel within layers, sequential between |
| §7 Scoring Engine | 100-point (single pass) | 100-point (aggregated from 6 sub-agents) |
| §8 Cron Schedule | 36 jobs (sequential execution) | 36 jobs (orchestrator dispatches parallel) |
| §9 Daily Schedule | Same timeline | Same timeline, 5x faster execution |
| §13 Machine Economy | Identity + Payments + Interop | + Sub-agent delegation layer |
| §22 Principles | 16 principles | +1: "Parallelize the intelligence. Orchestrate the action." |

---

## SECTION 3.4 — OPENCLAW MULTI-AGENT (v6.0 UPGRADE)

### Current v5.3.8:
```
main (Buzz BD) → scout (Token Scout) — 2 agents
Max 8 concurrent sub-agents (4GB RAM headroom)
15-second turnaround for token discovery missions
```

### v6.0 Enhancement:
```
┌──────────────────────────────────────────────────────────┐
│  ORCHESTRATOR (replaces direct main agent scan logic)     │
│  Role: Dispatch, aggregate, pipeline update               │
│  Model: MiniMax M2.5 (complex reasoning required)         │
│  Inherits: OpenClaw gateway, Telegram bot, all crons      │
└──────────┬───────────────────────────────────────────────┘
           ↓ spawns via sessions_spawn (existing OpenClaw API)
    ┌──────┼──────┬──────┬──────┬──────┬──────┐
    ↓      ↓      ↓      ↓      ↓      ↓      ↓
┌──────┐┌──────┐┌──────┐┌──────┐┌──────┐┌──────┐
│SCAN  ││SCORE ││SAFETY││WALLET││SOCIAL││DEPLOY│
│Agent ││Agent ││Agent ││Agent ││Agent ││Agent │
│      ││      ││      ││      ││      ││      │
│Model:││Model:││Model:││Model:││Model:││Model:│
│Qwen  ││Mini- ││Llama ││Llama ││Qwen  ││Qwen  │
│30B   ││Max   ││70B   ││70B   ││30B   ││30B   │
│FREE  ││M2.5  ││FREE  ││FREE  ││FREE  ││FREE  │
└──────┘└──────┘└──────┘└──────┘└──────┘└──────┘

Total: 7 agents (1 orchestrator + 6 sub-agents)
Within 8-agent max (4GB RAM headroom preserved)
```

### Smart LLM Routing Per Sub-Agent:
```
Orchestrator:  MiniMax M2.5  — needs complex reasoning for aggregation
Scanner Agent: Qwen 30B      — simple API fetch + format, FREE
Scorer Agent:  MiniMax M2.5  — 100-point algo needs quality reasoning
Safety Agent:  Llama 70B     — API calls + boolean safety checks, FREE
Wallet Agent:  Llama 70B     — API calls + pattern detection, FREE
Social Agent:  Qwen 30B      — search + summarize, FREE
Deploy Agent:  Qwen 30B      — API call + format, FREE

Cost impact: Only 2/7 agents use MiniMax (paid)
             5/7 agents use FREE tier
             Estimated: $41/mo → $25-30/mo (additional savings)
```

---

## SECTION 6.1 — 4-LAYER INTELLIGENCE (v6.0 PARALLEL)

### Current v5.3.8 (Sequential):
```
Layer 1 → Layer 2 → Layer 3 → Layer 4
(each source called one-by-one within each layer)
Total time per full scan: ~5-8 minutes for 10 tokens
```

### v6.0 (Parallel Within Layers):
```
LAYER 1 — CAST THE NET (Discovery)
┌────────────────────────────────────────────────┐
│  SCANNER AGENT dispatches ALL Layer 1 in parallel: │
│  DexScreener ──┐                                    │
│  AIXBT ────────┤ asyncio.gather()                   │
│  Clawpump ─────┤ All 5 sources simultaneously       │
│  CoinGecko ────┤                                    │
│  DS Boosts ────┘                                    │
│  Time: ~3s (vs ~15s sequential)                     │
└────────────────────────────────────────────────┘
              ↓ filtered candidates
LAYER 2 — FILTER (Safety & Liquidity)
┌────────────────────────────────────────────────┐
│  Per token, SAFETY + WALLET agents run parallel:    │
│  RugCheck ─────┐                                    │
│  Helius ───────┤ asyncio.gather()                   │
│  Allium ───────┤ All 4 sources per token            │
│  DFlow MCP ────┘                                    │
│  Time: ~5s per token (vs ~20s sequential)           │
└────────────────────────────────────────────────┘
              ↓ filtered list (10-20 survive)
LAYER 3 — RESEARCH (Deep Intel)
┌────────────────────────────────────────────────┐
│  SOCIAL AGENT dispatches ALL Layer 3 parallel:      │
│  leak.me ──────┐                                    │
│  Firecrawl ────┤ asyncio.gather()                   │
│  ATV Identity ─┤ All 5 sources per token            │
│  Grok ─────────┤                                    │
│  Serper ───────┘                                    │
│  Time: ~4s per token (vs ~20s sequential)           │
└────────────────────────────────────────────────┘
              ↓ research dossiers
LAYER 4 — SCORE & ACT
┌────────────────────────────────────────────────┐
│  SCORER AGENT + ORCHESTRATOR:                       │
│  100-point base + DFlow modifiers (+13/-8)          │
│  + QuillShield safety overlay                       │
│  + Sub-agent results aggregation                    │
│  Time: ~2s (vs ~5s sequential)                      │
└────────────────────────────────────────────────┘

Total v6.0 time per full scan: ~15-30s for 10 tokens
vs v5.3.8: ~5-8 minutes
= 10-20x speedup
```

---

## SECTION 6.2 — SOURCE-TO-AGENT MAPPING

| # | Source | Layer | v5.3.8 Handler | v6.0 Sub-Agent | Model |
|---|--------|-------|----------------|----------------|-------|
| 1 | DexScreener | L1 | main agent | **Scanner** | Qwen 30B (FREE) |
| 2 | AIXBT | L1 | main agent | **Scanner** | Qwen 30B (FREE) |
| 3 | AIXBT v2 (x402) | Support | main agent | **Scanner** | Qwen 30B (FREE) |
| 4 | RugCheck | L2 | main agent | **Safety** | Llama 70B (FREE) |
| 5 | Helius | L2 | main agent | **Wallet** | Llama 70B (FREE) |
| 6 | Allium | L2 | main agent | **Deploy** | Qwen 30B (FREE) |
| 7 | leak.me | L3 | main agent | **Social** | Qwen 30B (FREE) |
| 8 | Clawpump | L1 | main agent | **Scanner** | Qwen 30B (FREE) |
| 9 | Firecrawl | L3 | main agent | **Social** | Qwen 30B (FREE) |
| 10 | Colosseum | Support | main agent | Orchestrator | MiniMax M2.5 |
| 11 | Moltbook | Support | main agent | Orchestrator | MiniMax M2.5 |
| 12 | ATV Identity | L3 | main agent | **Social** | Qwen 30B (FREE) |
| 13 | Grok | L3 | main agent | **Social** | Qwen 30B (FREE) |
| 14 | Serper | L3 | main agent | **Social** | Qwen 30B (FREE) |
| 15 | Sub-agents | Support | scout agent | **All 6 sub-agents** | Mixed |
| 16 | DFlow MCP | L2 | main agent | **Safety** | Llama 70B (FREE) |
| 17 | CoinGecko | L1 | main agent | **Scanner** | Qwen 30B (FREE) |
| 18 | DS Boosts | L1 | main agent | **Scanner** | Qwen 30B (FREE) |

---

## SECTION 7 — SCORING ENGINE (v6.0 AGGREGATED)

### Current v5.3.8 (Single-pass scoring):
```
100 points = Liquidity(30) + Volume(25) + Age(15) + Community(15) + Contract(15)
+ Catalyst adjustments (+/- modifiers)
+ DFlow modifiers (+13/-8)
+ QuillShield overlay
```

### v6.0 (Multi-agent aggregated scoring):
```
Each sub-agent contributes to the final score:

Scanner Agent →  Base data (mcap, volume, age, chain)
                 Feeds: Liquidity(30) + Volume(25) + Age(15)

Safety Agent  →  Contract safety checks
                 Feeds: Contract Safety(15) + QuillShield overlay
                 + DFlow modifiers (+13/-8)

Wallet Agent  →  Deployer forensics
                 Feeds: IDENTITY_VERIFIED(+5), ENS_HOLDER(+3)
                 ANON_DEPLOYER(-3), serialCreator(-5), COMPOUND_RISK(-8)
                 netPositiveSol(+2), multiChain(+3)

Social Agent  →  Community & sentiment
                 Feeds: Community(15)
                 + AIXBT HIGH CONVICTION(+10)
                 + Viral moment/KOL(+10)

Deploy Agent  →  Cross-chain deployer intel
                 Feeds: multiChain deployer(+3)
                 + Allium 16-chain PnL data

ORCHESTRATOR AGGREGATION:
total = scanner_score + safety_score + wallet_modifiers 
        + social_score + deploy_modifiers + catalyst_adjustments

Same 100-point scale. Same thresholds:
  85-100 🔥 HOT → Immediate outreach + full forensics
  70-84  ✅ QUALIFIED → Priority queue + forensics  
  50-69  👀 WATCH → Monitor 48h
  0-49   ❌ SKIP → No action
```

---

## SECTION 8 — CRON SCHEDULE (v6.0 CHANGES)

**ALL 36 crons preserved. Only the scan execution method changes:**

| Cron # | Job | v5.3.8 Method | v6.0 Method |
|--------|-----|---------------|-------------|
| 1-4 | Scan jobs (4x/day) | Main agent sequential | **Orchestrator parallel dispatch** |
| 5-9 | Prayer reminders | No change | No change |
| 10-12 | System ops | No change | No change |
| 13-15 | Heartbeats | No change | No change |
| 16-20 | x402 intelligence | No change | No change |
| 21-23 | Clawbal on-chain | No change | No change |
| 24-26 | Machine economy | No change | No change |
| 27-30 | Agent interop | Plugin health check | **+ sub-agent health check** |
| 31-36 | BD lifecycle | No change | No change |

**New cron job (v6.0):**
```
| 37 | sub-agent-health | Every 2h | Check all 6 sub-agents responding. 
|    |                  |          | Restart any that failed. Log to scratchpad. |
```

---

## SECTION 3.6 — ENTRYPOINT (v6.0 ADDITIONS)

### Current entrypoint.sh additions for v6.0:
```bash
# === v6.0 Sub-Agent Setup ===
# Create scratchpad directories for file-based memory (Manus pattern)
mkdir -p /data/workspace/scratchpad/{scanner,scorer,safety,wallet,social,deploy,orchestrator}

# Initialize todo.md pipeline tracker
if [ ! -f /data/workspace/scratchpad/todo.md ]; then
  echo "# Buzz BD Pipeline — Todo" > /data/workspace/scratchpad/todo.md
  echo "Initialized on $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> /data/workspace/scratchpad/todo.md
fi

# Copy sub-agent skills to workspace
cp -r /opt/buzz-agents/ /data/workspace/agents/ 2>/dev/null || true

# Boot self-check: verify sub-agents can be spawned
echo "[BOOT] Sub-agent framework: checking..."
echo "[BOOT] Scratchpad dirs: $(ls /data/workspace/scratchpad/ | wc -l)/7"
```

### File system additions:
```
/data/workspace/
├── scratchpad/           ← NEW: Manus file-based memory
│   ├── scanner/          ← Scanner Agent scratchpad
│   │   └── last_scan.json
│   ├── scorer/           ← Scorer Agent scratchpad
│   │   └── score_*.json
│   ├── safety/           ← Safety Agent scratchpad
│   │   └── safety_*.json
│   ├── wallet/           ← Wallet Agent scratchpad
│   │   └── wallet_*.json
│   ├── social/           ← Social Agent scratchpad
│   │   └── social_*.json
│   ├── deploy/           ← Deploy Agent scratchpad
│   │   └── deploy_*.json
│   ├── orchestrator/     ← Orchestrator scratchpad
│   │   └── pipeline.json
│   └── todo.md           ← Live BD pipeline checklist
├── agents/               ← NEW: Sub-agent definitions
│   ├── base_agent.js     ← Base class
│   ├── scanner.js
│   ├── scorer.js
│   ├── safety.js
│   ├── wallet.js
│   ├── social.js
│   ├── deploy.js
│   └── orchestrator.js
├── skills/               ← Existing
│   ├── clawrouter/
│   └── quillshield/
└── memory/               ← Existing
    ├── pipeline.md
    └── cron-schedule.json
```

---

## SECTION 3.8 — DOCKERFILE (v6.0)

```dockerfile
FROM node:22-slim
RUN apt-get update && apt-get install -y tini curl ca-certificates git jq
RUN npm install -g openclaw@2026.2.19

# Pre-install ClawRouter (existing)
RUN mkdir -p /tmp/clawrouter-install/.openclaw && \
    HOME=/tmp/clawrouter-install openclaw plugins install @blockrun/clawrouter && \
    cp -r /tmp/clawrouter-install/.openclaw/extensions/clawrouter /opt/buzz-clawrouter/ && \
    rm -rf /tmp/clawrouter-install

# === v6.0 NEW: Copy sub-agent framework ===
COPY agents/ /opt/buzz-agents/

# Existing: Copy skills
COPY skills/ /opt/buzz-skills/
COPY entrypoint.sh /entrypoint.sh
ENTRYPOINT ["/usr/bin/tini", "--", "/entrypoint.sh"]
```

---

## SECTION 4.1 — LLM ROUTING (v6.0 SMART PER-AGENT)

### Current v5.3.8: All tasks → MiniMax → fallback Llama → fallback Qwen

### v6.0: Route by sub-agent complexity:

| Sub-Agent | Task Complexity | Model | Cost |
|-----------|----------------|-------|------|
| Orchestrator | HIGH (aggregation, decisions) | MiniMax M2.5 | ~$0.02/call |
| Scanner | LOW (API fetch + format) | Qwen 30B AkashML | **FREE** |
| Scorer | HIGH (100-point reasoning) | MiniMax M2.5 | ~$0.02/call |
| Safety | MEDIUM (API + boolean) | Llama 70B OpenRouter | **FREE** |
| Wallet | MEDIUM (API + patterns) | Llama 70B OpenRouter | **FREE** |
| Social | LOW (search + summarize) | Qwen 30B AkashML | **FREE** |
| Deploy | LOW (API + format) | Qwen 30B AkashML | **FREE** |

**Cost projection:**
- 4 scans/day × 10 tokens × 2 paid calls (Orchestrator + Scorer) = 80 paid calls/day
- 80 × $0.02 = $1.60/day = **~$48/mo** (similar to current $41/mo)
- BUT: 5x more intelligence gathered per scan (parallel vs sequential)
- Effective cost per token-evaluation: **75% cheaper**

---

## SECTION 9.3 — BD LIFECYCLE FLOW (v6.0 ENHANCED)

```
LAYER 1 — CAST THE NET (SCANNER AGENT, auto 4x/day)
    DexScreener + AIXBT + Clawpump + CoinGecko + DS Boosts
    → ALL 5 sources queried IN PARALLEL (3s vs 15s)
    → Raw candidate list (50-100 tokens)
    ↓
LAYER 2 — FILTER (SAFETY + WALLET + DEPLOY AGENTS, parallel per token)
    RugCheck + QuillShield + DFlow MCP (Safety Agent)
    Helius forensics (Wallet Agent)
    Allium 16-chain deployer (Deploy Agent)
    → ALL sources per token IN PARALLEL (5s vs 20s per token)
    → Filtered list (10-20 survive)
    ↓
LAYER 3 — RESEARCH (SOCIAL AGENT, parallel per token)
    leak.me + Firecrawl + ATV + Grok + Serper
    → ALL 5 sources per token IN PARALLEL (4s vs 20s per token)
    → Research dossier per token
    ↓
LAYER 4 — SCORE (SCORER AGENT + ORCHESTRATOR AGGREGATION)
    100-point scoring from all sub-agent data
    + DFlow modifiers (+13/-8 pts)
    + QuillShield safety overlay
    + Catalyst adjustments
    → 70+ → Pipeline → AUTO-ADVANCE to SCORED
    ↓
[Rest of BD lifecycle unchanged — same warm-up, outreach, follow-up]
```

---

## SECTION 10 — RECOVERY PROTOCOL (v6.0 ADDITIONS)

### 10.5 Sub-Agent Recovery
```bash
# If sub-agents not responding:
ls /data/workspace/scratchpad/
# Should show: scanner/ scorer/ safety/ wallet/ social/ deploy/ orchestrator/ todo.md

# If missing, recreate:
mkdir -p /data/workspace/scratchpad/{scanner,scorer,safety,wallet,social,deploy,orchestrator}

# Check last orchestrator run:
cat /data/workspace/scratchpad/orchestrator/pipeline.json | jq '.updated_at'

# Force re-scan:
# Via Telegram: /scan force
# This triggers orchestrator → all 6 sub-agents → full parallel evaluation
```

---

## SECTION 13 — MACHINE ECONOMY (v6.0 LAYER)

```
┌─────────────────────────────────────────────────────────────┐
│                    MACHINE ECONOMY LAYER                      │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐ │
│  │  IDENTITY     │  │  PAYMENTS    │  │    INTEROP         │ │
│  │  ERC-8004     │  │  x402 USDC   │  │  elizaOS plugin    │ │
│  │  ETH #25045   │  │  $0.30/day   │  │  Virtuals ACP      │ │
│  │  Base #17483  │  │  zauthx402   │  │  ClawHub Skill     │ │
│  └──────┬───────┘  └──────┬───────┘  └────────┬───────────┘ │
│         └─────────────────┼────────────────────┘             │
│                           ▼                                   │
│  ┌────────────────────────────────────────────────────────┐  │
│  │          SUB-AGENT DELEGATION LAYER (v6.0 NEW)         │  │
│  │                                                          │  │
│  │  Orchestrator: Dispatch + aggregate + pipeline           │  │
│  │  Scanner: L1 discovery (5 sources parallel)              │  │
│  │  Scorer: L4 scoring (100-point + modifiers)              │  │
│  │  Safety: L2 contract checks (RugCheck+QuillShield+DFlow) │  │
│  │  Wallet: L2 forensics (Helius deployer analysis)         │  │
│  │  Social: L3 research (Grok+ATV+Serper+leak.me+Firecrawl) │  │
│  │  Deploy: L2 cross-chain (Allium 16-chain deployer intel)  │  │
│  │                                                          │  │
│  │  File Memory: /data/workspace/scratchpad/ (Manus pattern) │  │
│  │  Pipeline: todo.md live checklist                        │  │
│  │  Smart LLM: MiniMax for reasoning, FREE for data tasks   │  │
│  └────────────────────────┬───────────────────────────────┘  │
│                           ▼                                   │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                  BUZZ BD AGENT                          │  │
│  │  LLM: 3-Provider Cascade (MiniMax + Llama + Qwen)      │  │
│  │  Intel: 16/16 Sources | Crons: 37/37 | BlockRun wallet  │  │
│  │  Score: 100-pt System | Forensics: Helius + Allium      │  │
│  └────────────────────────┬───────────────────────────────┘  │
│                           ▼                                   │
│  ┌────────────────────────────────────────────────────────┐  │
│  │              SOLCEX EXCHANGE                             │  │
│  │  15K USDT Listing | Market Making | Whale Airdrop       │  │
│  └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## SECTION 22 — PRINCIPLES (v6.0 ADDITION)

Add as Principle #17:

> **17. Parallelize the intelligence. Orchestrate the action.**
> — Sub-agents gather data simultaneously. The orchestrator aggregates 
> and decides. Never run Layer 1-4 sequentially when you can dispatch 
> all sources in parallel. Speed IS competitive advantage — the first 
> exchange to identify a hot token gets the listing.

---

## SECTION 20 — INDONESIA SPRINT (v6.0 ALIGNED)

| Week | Master Ops Section | v6.0 Task | Status |
|------|--------------------|-----------|--------|
| 1 (Feb 25-Mar 2) | §3.4, §3.6, §3.8 | BaseAgent class + Scanner + Scorer + Docker | 🔲 |
| 1 (Feb 25-Mar 2) | §6.1 | Safety + Wallet + Social + Deploy agents | 🔲 |
| 1-2 (Mar 1-3) | §6.1, §7 | Orchestrator + parallel 4-Layer pipeline | 🔲 |
| 2 (Mar 3-9) | §4.1 | Smart LLM routing per sub-agent | 🔲 |
| 2 (Mar 3-9) | §8 | Wire to 36 crons + add cron #37 | 🔲 |
| 2 (Mar 3-9) | §3.8 | Docker build → GHCR → Akash deploy | 🔲 |
| 3 (Mar 10-16) | §10 | 72h stability test + recovery protocol | 🔲 |
| 3 (Mar 10-16) | §14 | BD lifecycle with parallel scoring | 🔲 |
| 4 (Mar 17-24) | All | Refinement + optimization | 🔲 |
| 4 (Mar 24-31) | §22, Changelog | Master Ops v6.0 update + principle #17 | 🔲 |

---

## CHANGELOG ENTRY (Ready for v6.0 release)

```
| **6.0.0** | **Mar XX, 2026** | **SUB-AGENT ARCHITECTURE EDITION: 
Manus-inspired parallel sub-agent framework. 7 agents (1 orchestrator 
+ 6 sub-agents: Scanner, Scorer, Safety, Wallet, Social, Deploy). 
16/16 intel sources now queried IN PARALLEL within each layer. 
4-Layer Intelligence runs 10-20x faster (~30s vs 5-8min per scan). 
Smart LLM routing: MiniMax for reasoning (Orchestrator + Scorer), 
FREE tier for data tasks (Scanner/Safety/Wallet/Social/Deploy). 
File-based scratchpad memory (Manus pattern) at 
/data/workspace/scratchpad/. Live todo.md pipeline tracker. 
Structured event logging per sub-agent. Error preservation in context 
(Manus "leave wrong turns" pattern). Cron #37 added (sub-agent health). 
37 total crons. Principle #17 added. Cost neutral (~$48/mo vs $41/mo) 
but 5x more intelligence per scan. Inspired by Manus Wide Research 
pattern + Superpowers skills framework + Devin AI task architecture. 
Source study: github.com/x1xhlol/system-prompts-and-models-of-ai-tools 
(116K ⭐).** |
```

---

*All sections align with Master Ops v5.3.8 structure.*
*No existing functionality removed. Only enhanced.*
*Same 36 crons + 1 new. Same 16 intel sources. Same 100-point scoring.*
*Same LLM cascade. Same Docker→GHCR→Akash workflow.*
*Same BD lifecycle. Same outreach templates. Same principles.*
*Just faster, smarter, parallel.* 🐝
