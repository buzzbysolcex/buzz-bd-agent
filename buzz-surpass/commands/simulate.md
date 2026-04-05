---
name: simulate
description: Run MiroFish swarm simulation on a token. 1000-agent market behavior analysis with 5 investor clusters and Monte Carlo validation.
---

# /simulate — Swarm Simulation

Run MiroFish swarm simulation on a token for market behavior prediction.

## Usage
```
/simulate PEPE                  # 100-agent quick sim
/simulate PEPE --agents 1000    # Full 1000-agent simulation
/simulate PEPE --agents 10000   # 10K-agent deep analysis
```

## What It Does
1. Generates personas across 5 clusters: degen, whale, institutional, community, market_dynamics
2. Each agent evaluates the token based on its archetype + real market data
3. Agents vote: BULLISH / BEARISH / NEUTRAL with conviction score
4. Monte Carlo validation: 1000×100 iterations, 26ms runtime
5. Returns: consensus %, cluster breakdown, institutional skepticism index

## Output
- Overall sentiment: % bullish/bearish/neutral
- Per-cluster breakdown with conviction ranges
- Institutional cluster score (structural skepticism indicator)
- Monte Carlo confidence interval
- LLM cost: $0 (200 Ollama qwen3:8b + 800 heuristic agents)

## API Equivalent
```
POST https://api.buzzbd.ai:5000/simulate
POST https://api.buzzbd.ai:5000/simulate-10k
```
