# MiroFish — Swarm Intelligence Simulation Skill

> 50-1000 agent OASIS simulation. Dual-Brain: 90% Opus / 10% Ollama.
> ADR-010 + ADR-012. $0/sim. Frontier hackathon + HSaaS + AIBTC signals.

---

## MiroFish Dual-Brain (90% Opus / 10% Ollama)

MiroFish Real Sim uses Claude Opus 4.6 Pro Max for 90% of all LLM calls.
Ollama qwen3:8b handles only degen early-round FOMO (rounds 1-4).

Every agent that matters — institutional, whale, market dynamics, community,
and degen round 5+ — thinks with frontier-model reasoning at $0 cost.

The router (llm_router.py) makes this automatic:
degen R1-4 → Ollama (fast FOMO, 10% of calls)
EVERYTHING ELSE → Opus (genius reasoning, 90% of calls)
Default → Opus. When in doubt → Opus. Always → Opus.

Pro Max = $200/month for UNLIMITED genius. 90% usage.
The simulation quality IS the product. Genius reasoning = better predictions.

## TOOLCHAIN

```
Primary LLM: Claude Opus 4.6 via claude -p (Pro Max, $0, ~4s/call)
Fallback LLM: Ollama qwen3:8b (local, $0, ~9s/call, degen R1-4 only)
Sidecar: api/services/mirofish/server.py (Flask, port 5000)
Router: api/services/mirofish/llm_router.py
Server: Hetzner CPX62 (16 vCPU, 32GB RAM)
Storage: SQLite (microbuzz_v2_simulations + microbuzz_v2_trades)
JS modules: api/lib/microbuzz-*.js + api/lib/mirofish-oasis.js
```

## MODULES

| File                            | Purpose                              |
| ------------------------------- | ------------------------------------ |
| api/lib/microbuzz-amm.js        | Constant-product AMM engine (x\*y=k) |
| api/lib/microbuzz-agents.js     | 30 LLM agent profiles (5×2×3)        |
| api/lib/microbuzz-heuristics.js | 470 rule-based market agents         |
| api/lib/microbuzz-ollama.js     | Ollama client + prompt builder       |
| api/lib/microbuzz-simulator.js  | 3-round orchestrator (500 agents)    |

## 500-AGENT HYBRID MODEL

### 30 LLM Agents (Ollama inference, ~30s each)

```
5 Personas × 2 Experience × 3 Risk = 30

Personas: analyst, trader, security_auditor, community_manager, whale_watcher
Experience: junior (conservative estimates), senior (nuanced analysis)
Risk tolerance:
  conservative: trades $10-30, needs 15%+ edge to act
  moderate: trades $30-80, needs 10%+ edge
  aggressive: trades $80-200, acts on 5%+ edge

Each agent: queries Ollama → returns { direction: YES/NO/NOTHING, amount, reasoning }
```

### 470 Heuristic Agents (pure JS, instant execution)

```
150 Momentum Followers:
  - After LLM agents trade, calculate LLM majority direction
  - Buy same direction as LLM majority
  - Trade size: proportional to LLM consensus strength
  - If 20/30 LLM bought YES → momentum agents buy YES with high conviction
  - If 16/30 LLM bought YES → momentum agents buy YES with low conviction

100 Contrarians:
  - Bet AGAINST the LLM majority direction
  - Trade size: inversely proportional to consensus strength
  - Strong LLM consensus → small contrarian bets
  - Weak LLM consensus → large contrarian bets
  - Purpose: prevents groupthink, adds price resistance

120 Noise Traders:
  - Random direction (50/50 YES/NO)
  - Random small amounts ($5-20)
  - No intelligence, pure randomness
  - Purpose: adds liquidity, market realism, prevents thin-market artifacts

100 Threshold Followers:
  - Do NOTHING unless AMM price crosses 0.60 (bullish trigger) or 0.40 (bearish trigger)
  - Above 0.60: buy YES (bandwagon effect)
  - Below 0.40: buy NO (panic selling)
  - Between 0.40-0.60: hold (wait and see)
  - Trade size: increases with distance from 0.50
  - Purpose: creates breakout/breakdown dynamics
```

## AMM ENGINE (microbuzz-amm.js)

```
Constant-product: reserve_yes × reserve_no = k
Initial: 10000 YES × 10000 NO (50/50 = 0.50 price, larger pool for 500 agents)
Price = reserve_no / (reserve_yes + reserve_no)

Functions:
  createMarket(tokenSymbol) → { reserve_yes, reserve_no, k, trades: [] }
  agentTrade(market, agentId, direction, amount) → updated market + trade record
  getPrice(market) → current YES price (0.00 - 1.00)
  getLLMSummary(market, round) → { yes_count, no_count, avg_amount, majority_direction }
  settlePrediction(market) → final price + all 1500 trade records
```

## MULTI-ROUND SIMULATION (microbuzz-simulator.js)

```
Each round has 2 phases:

PHASE A: LLM AGENTS (30 agents, Ollama, ~15 min per round)
  → Each agent receives token data + round context
  → Queries Ollama → decides trade → executes on AMM
  → Summary computed: majority direction, consensus strength

PHASE B: HEURISTIC AGENTS (470 agents, JS, ~2 seconds)
  → Receives LLM summary from Phase A
  → Each heuristic type reacts per its rules
  → All 470 execute trades on same AMM
  → Round AMM price recorded

ROUND 1: TOKEN DATA ONLY
  Phase A: 30 LLM agents see DexScreener + v2_8rules score
  Phase B: 470 heuristics react to LLM round 1 trades
  Output: Round 1 AMM price (500 agents traded)

ROUND 2: + SOCIAL CONTEXT
  Phase A: 30 LLM agents see Round 1 price + Twitter + community
  Phase B: 470 heuristics react to LLM round 2 trades
  Output: Round 2 AMM price (1000 cumulative trades)

ROUND 3: + HEYANON CROSS-CHAIN
  Phase A: 30 LLM agents see Round 1+2 + Hyperliquid OI + lending + LP
  Phase B: 470 heuristics react to LLM round 3 trades
  Output: Round 3 AMM price = FINAL (1500 cumulative trades)

Duration: ~45 min per token
  30 LLM × 3 rounds × 30s = ~45 min (Ollama)
  470 heuristic × 3 rounds × instant = ~6 seconds (JS)
```

## SCORING OUTPUT

```
AMM final price → listing probability (0.00 to 1.00)
MicroBuzz score = amm_final_price × 100 (0-100)
EV = p × W − (1−p) × L (unchanged)

Where:
  p = amm_final_price (from 500-agent AMM)
  W = estimated listing value ($5K listing fee)
  L = estimated BD cost ($200 research + outreach)

Additional metrics:
  - Round-by-round price evolution (shows conviction building or collapsing)
  - LLM consensus strength per round (% agreement)
  - Heuristic amplification factor (how much heuristics moved price after LLM)
  - Trade volume per round (liquidity indicator)
```

## API ENDPOINTS

```
POST /api/v1/microbuzz/simulate/:address  — run full 500-agent 3-round sim
GET  /api/v1/microbuzz/result/:address    — get latest result
GET  /api/v1/microbuzz/history/:address   — all simulation results
GET  /api/v1/microbuzz/status             — Ollama status + queue depth
```

## DATABASE

```sql
CREATE TABLE microbuzz_v2_simulations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_address TEXT NOT NULL,
  token_symbol TEXT,
  round_1_price REAL,
  round_2_price REAL,
  round_3_price REAL,
  amm_final_price REAL,
  ev_score REAL,
  llm_agent_count INTEGER DEFAULT 30,
  heuristic_agent_count INTEGER DEFAULT 470,
  total_agent_count INTEGER DEFAULT 500,
  total_trades INTEGER,
  llm_consensus_r1 REAL,
  llm_consensus_r2 REAL,
  llm_consensus_r3 REAL,
  simulation_time_ms INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE microbuzz_v2_trades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  simulation_id INTEGER REFERENCES microbuzz_v2_simulations(id),
  round INTEGER,
  agent_id TEXT,
  agent_type TEXT,
  agent_persona TEXT,
  agent_risk TEXT,
  direction TEXT,
  amount REAL,
  price_before REAL,
  price_after REAL,
  reasoning TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## RESOURCE MANAGEMENT

```
Before batch: ollama run qwen3:14b (loads model, ~9.3GB)
During batch: simulate tokens sequentially (1 at a time)
After batch: ollama stop qwen3:14b (releases RAM)
Monitor: free -h between simulations
Alert: if available RAM < 5GB, stop batch and report
```

## RELATIONSHIP TO v1

```
v1 (current): 10 agents, single-pass, weighted average
v2 (new): 500 agents (30 LLM + 470 heuristic), 3 rounds, AMM pricing

v1 stays active as fallback. v2 is primary when Ollama is loaded.
Both write to same pipeline — v2 overwrites v1 scores when available.
```

## FRONTIER HACKATHON ALIGNMENT

- "500 AI agents independently predict token listing probability"
- 30 analysts research + 470 market agents react = realistic prediction market
- HeyAnon cross-chain data = nobody else has this
- Loom video: show 3 rounds converging, price moving with 500 agents trading
- Demo: simulate real token → write score to Solana mainnet → Explorer link

---

_Skill: microbuzz-v2 | ADR-010 | 500-agent hybrid | Ollama + AMM + 3 rounds_
_$0/sim | MiroShark-informed | CPX62_
_Bismillah_ 🤲
