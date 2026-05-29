# MiroFish Swarm Simulation Engine

> ⚠️ **DORMANT — qwen3:8b reclaimed 2026-05-29 for disk** (Ogie msg 8003). MicroBuzz/MiroFish LLM agents cannot run until the model is re-pulled (`ollama pull qwen3:8b`, ~4.9G) **and** `ollama serve` is started. Heuristic-only paths (470 JS-rule agents, Monte Carlo) are unaffected. Re-pull to revive.

## Architecture

- Flask Python sidecar on port 5000
- 1000 agents: 200 LLM (Ollama qwen3:8b) + 800 heuristic (JS rules)
- Dual-Brain: 90% Opus (quality gates) / 10% Ollama (bulk simulation)
- 5 clusters: degen, whale, institutional, community, market_dynamics
- Monte Carlo: 1000x100 iterations in 26ms (separate rule-based engine)

## Endpoints (port 5000)

- POST /simulate — run simulation (agents, rounds, token config)
- POST /simulate-10k — wave-batched 10K agent run (4x2500)
- POST /generate-personas — create persona set for token
- POST /report — generate ReACT analysis report

## DB Integration (port 3000)

- POST /api/v1/mirofish/store — save simulation results
- GET /api/v1/mirofish/token/:address — get results by token
- GET /api/v1/mirofish/token/:address/latest — latest result
- GET /api/v1/mirofish/list — all simulations (paginated)
- GET /api/v1/mirofish/stats — aggregate stats

## Table: mirofish_simulations (70th table)

- Stores all simulation runs with cluster beliefs and Monte Carlo comparison
- Indexed on token_address+chain and created_at

## Validated Results

- Nasdog R20: 0.669 final belief, institutional 0.440, 8.17h, $0 cost
- Monte Carlo: 0.94 (too bullish) vs MiroFish: 0.669 (honest)
- Emergent behavior: institutional cluster resisted peer pressure for all 20 rounds

## Danger Zones

- Port 5000 is NOT a persistent service — needs manual start
- qwen3:8b must be loaded in Ollama before LLM agents can run
- 1000-agent sim takes ~8 hours on CPU (GPU would be <30 min)
- Don't run simulations during signal filing (CPU contention)
- Feature flag: MIROFISH_REALTIME must be TRUE
