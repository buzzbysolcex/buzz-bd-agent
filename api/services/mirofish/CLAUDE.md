# MiroFish — Swarm Intelligence Simulation Engine

## Architecture
- server.py: Flask sidecar on port 5000 (Python)
- Buzz API (port 3000) calls MiroFish sidecar for simulations
- Agent LLM: Ollama qwen3:8b (local, fast, $0)
- Report LLM: Claude Opus via Pro Max (quality, $0)
- Graph DB: Neo4j (Phase C) or SQLite graph extension (MVP)

## Endpoints
- GET /health — sidecar status
- POST /simulate — run OASIS simulation
- POST /generate-personas — create agent personas from token data
- POST /report — generate ReACT analysis report

## Danger Zones
- Python venv at /opt/mirofish-env — keep separate from Node.js
- Ollama model must be unloaded when not simulating (saves ~5GB RAM)
- Neo4j needs 2-4GB RAM when running — don't leave idle
- OASIS camel-ai==0.2.78 — pin this version, don't upgrade without testing
- Simulation data can be large — clean monte_carlo_results older than 30 days
