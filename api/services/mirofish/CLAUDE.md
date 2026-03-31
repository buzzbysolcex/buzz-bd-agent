# MiroFish — Real Swarm Intelligence Simulation Engine

## Architecture
- server.py: Flask sidecar on port 5000 (Python)
- llm_router.py: 90% Opus 4.6 / 10% Ollama qwen3:8b
- Buzz API (port 3000) calls MiroFish sidecar for simulations
- NOT MiroShark. This is the REAL OASIS simulation engine.

## Dual-Brain (90% Opus / 10% Ollama)
- Opus 4.6 via `claude -p`: 90% of all calls (Pro Max unlimited, $0)
- Ollama qwen3:8b: 10% of calls (degen early rounds 1-4 only)
- Default: ALWAYS Opus. When in doubt: Opus.

### Opus handles (90%):
- ALL persona generation
- ALL institutional reasoning (every round)
- ALL whale decisions (every round)
- ALL market dynamics (every round)
- ALL community agents (every round)
- ALL degen agents round 5+
- ALL adversarial debates
- ALL report generation
- ALL final consensus

### Ollama handles (10%):
- Degen agents rounds 1-4 only (FOMO is simple)
- If Ollama fails → auto-escalate to Opus

## Endpoints
- GET /health — sidecar status + brain config
- POST /simulate — full OASIS simulation (agents × rounds)
- POST /generate-personas — create personas from token data
- POST /report — ReACT analysis report

## Danger Zones
- claude -p spawns subprocess — max 5 concurrent, sequential safer
- 60s timeout per Opus call — auto-fallback to Ollama
- Python venv at /opt/mirofish-env — keep separate from Node.js
- Ollama model must be loaded before simulation starts
- CLAUDE_CODE_SUBPROCESS_ENV_SCRUB=1 for security
