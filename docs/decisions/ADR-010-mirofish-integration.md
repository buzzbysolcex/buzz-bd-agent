# ADR-010: MicroBuzz v2 — 500-Agent Hybrid AMM Prediction Market

**Status:** ACCEPTED
**Date:** Mar 30, 2026
**Sprint:** Day 42 (Indonesia Sprint Final)
**Deciders:** Ogie (CEO), Claude Opus (Strategy)

---

## Context

MicroBuzz v1 runs 10 agents in a single-pass consensus vote with weighted averaging. MiroShark (by @aaronjmars) was studied on Day 42 — it uses the OASIS framework (CAMEL-AI.org) with AMM-based prediction markets, multi-round simulations, and 500+ agent personas. Three extractable patterns were identified. Server upgraded to CPX62 (16 vCPU, 32GB RAM). Ollama installed with qwen3:14b (9.3GB, 8.6 tok/s CPU). 19GB RAM headroom. $0/simulation cost.

## Decision

Replace MicroBuzz v1 (10-agent single-pass) with a **500-agent hybrid AMM prediction market**. 30 LLM-powered "analyst" agents think via Ollama. 470 heuristic "market" agents react via pure JS rules. All local on CPX62. $0/sim.

### Why 500 agents (hybrid model):

- MiroShark runs 500+ agents — that's the benchmark
- Real prediction markets have few informed traders + many followers
- 30 LLM agents = the "analysts" who do real research (Ollama inference)
- 470 heuristic agents = the "market" who react to analyst signals (pure JS, instant)
- AMM price reflects full 500-agent market, not just 30 opinions
- Cost stays at ~45 min per sim (only 30 agents hit Ollama, 470 are instant)

### Agent breakdown (500 total):

**30 LLM Agents (Ollama, ~30s each):**

- 5 personas × 2 experience × 3 risk tolerance = 30
- Personas: analyst, trader, security_auditor, community_manager, whale_watcher
- Experience: junior, senior
- Risk: conservative, moderate, aggressive
- Each queries Ollama with full token context per round

**470 Heuristic Agents (pure JS, instant):**

- 150 Momentum followers: buy what LLM majority bought last round
- 100 Contrarians: bet against the LLM majority direction
- 120 Noise traders: random small trades (adds market realism + liquidity)
- 100 Threshold followers: only trade when AMM price crosses 0.60 or 0.40

### Why AMM over weighted average:

- AMM natural price discovery — agents "bet" conviction with sized trades
- 500 agents trading creates realistic market depth
- Price reflects market consensus with momentum, contrarian, and noise dynamics
- Final price (0.00-1.00) directly maps to listing probability

### Why multi-round over single-pass:

- Round 1: raw data only → LLM agents form initial opinion → heuristics react
- Round 2: + social data + Round 1 AMM price → LLM agents update → heuristics react
- Round 3: + HeyAnon cross-chain + Round 1+2 → LLM agents final conviction → heuristics react
- Beliefs evolve. Heuristic agents amplify or dampen LLM signals each round.

## Consequences

### Positive

- 500-agent simulation matching MiroShark scale
- $0/simulation (Ollama local)
- ~45 min per sim (only 30 LLM calls per round, 470 instant)
- Realistic market dynamics (momentum, contrarian, noise, threshold)
- HeyAnon cross-chain data as Round 3 exclusive (differentiator)
- EV formula unchanged: EV = p × W − (1−p) × L
- Frontier demo: "500 agents independently predict listing probability"

### Negative

- ~45 min per simulation (30 LLM calls × 3 rounds × ~30s)
- 9.3GB RAM when model loaded (release after batch)
- CPU-only inference — acceptable for batch, not real-time

## Architecture

```
Token enters simulation queue
  │
  ├─→ Round 1: DexScreener + scoring data
  │     ├─→ 30 LLM agents query Ollama → trade YES/NO on AMM
  │     └─→ 470 heuristic agents react → trade on AMM
  │
  ├─→ Round 2: + Twitter social + Round 1 AMM price
  │     ├─→ 30 LLM agents update positions via Ollama
  │     └─→ 470 heuristic agents react to new LLM positions
  │
  ├─→ Round 3: + HeyAnon cross-chain + Round 1+2 prices
  │     ├─→ 30 LLM agents final conviction via Ollama
  │     └─→ 470 heuristic agents final reaction
  │
  └─→ Final AMM price = listing probability (0.00-1.00)
       └─→ 500 agents | ~1500 total trades | full audit trail
```

---

_ADR-010 | v8.3.0+ | MicroBuzz v2 | 500-agent hybrid | Ollama local_
_Approved by Ogie | Bismillah_ 🤲
