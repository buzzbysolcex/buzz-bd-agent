# Docker Upgrade Plan: v5.3.8 → v6.0

## 1. New Python Files to Add to Docker Image

The v6.0 image adds a Python-based agent layer alongside the existing Node/OpenClaw gateway.

```
src/
  __init__.py
  agents/
    __init__.py
    base_agent.py          # ABC for all agents
    scanner_agent.py       # Token discovery (DexScreener, CoinGecko)
    scorer_agent.py        # Token scoring engine
    safety_agent.py        # Contract safety analysis (RugCheck, Helius)
    wallet_agent.py        # Deployer wallet forensics
    social_agent.py        # Social signal analysis (Grok, Serper)
    deploy_agent.py        # Deployment history analysis
    orchestrator.py        # Multi-agent orchestration (scan/evaluate/health/boot)
    task_registry.py       # Persistent task queue with file-lock safety
    health_monitor.py      # System health checks (crons, scans, pipeline)
    memory_manager.py      # Pipeline, experience, daily logs, compression
    telegram_bridge.py     # Command parser/formatter for Telegram bot
    requirements.txt       # Production Python dependencies
    tests/                 # TDD test suite (dev only, not shipped)
```

All files go into `/opt/buzz-agents/` in the Docker image and get synced to
`/data/workspace/src/agents/` at runtime.

## 2. Python Dependencies

### Production (requirements.txt)
```
aiohttp>=3.9
```

### Dev Only (requirements-dev.txt — NOT in Docker image)
```
pytest>=7.0
pytest-asyncio>=0.21
aiohttp>=3.9
aioresponses>=0.7
```

### Dockerfile additions
```dockerfile
# Add Python 3.11 runtime (node:22-slim is Debian-based)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip python3-venv \
    && rm -rf /var/lib/apt/lists/*

# Install Python agent dependencies
COPY src/agents/requirements.txt /opt/buzz-agents/requirements.txt
RUN python3 -m pip install --no-cache-dir -r /opt/buzz-agents/requirements.txt

# Copy agent source
COPY src/ /opt/buzz-agents/src/
```

## 3. Sub-Agent Integration with OpenClaw Gateway

### Architecture

```
┌─────────────────────────────────────────────────────┐
│  Docker Container                                    │
│                                                      │
│  ┌──────────────┐     ┌──────────────────────────┐  │
│  │  OpenClaw     │     │  Python Agent Layer       │  │
│  │  Gateway      │────▶│                          │  │
│  │  (Node.js)    │     │  OrchestratorAgent       │  │
│  │  :18789       │     │    ├─ ScannerAgent        │  │
│  │              │     │    ├─ ScorerAgent         │  │
│  │  Telegram ◀──┤     │    ├─ SafetyAgent         │  │
│  │  Channel     │     │    ├─ WalletAgent         │  │
│  │              │     │    ├─ SocialAgent         │  │
│  └──────────────┘     │    ├─ DeployAgent         │  │
│         ▲              │    ├─ TaskRegistry        │  │
│         │              │    ├─ HealthMonitor       │  │
│         │              │    ├─ MemoryManager       │  │
│         │              │    └─ TelegramBridge      │  │
│         │              └──────────────────────────┘  │
│         │                                            │
│  ┌──────┴──────────────────────────────────────┐    │
│  │  /data/workspace/memory/  (persistent vol)   │    │
│  │    pipeline/active.json                      │    │
│  │    active-tasks.json                         │    │
│  │    cron-schedule.json                        │    │
│  │    experience.json                           │    │
│  │    daily-log.json                            │    │
│  └──────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

### Integration points

1. **Telegram commands** — OpenClaw's built-in Telegram channel receives
   `/scan`, `/score`, etc. The OpenClaw skill layer calls `TelegramBridge.handle_command()`
   and returns the formatted string through the Telegram channel.

2. **Shared memory** — Both OpenClaw skills and Python agents read/write the same
   `/data/workspace/memory/` directory. File-locking in `TaskRegistry` prevents corruption.

3. **Boot sequence** — `entrypoint.sh` runs `MemoryManager.on_boot()` via a Python
   one-liner before starting the OpenClaw gateway. This validates crons, experience,
   and pipeline state.

4. **Health monitoring** — OpenClaw cron jobs can invoke `HealthMonitor.full_health_check()`
   periodically and alert via Telegram when status degrades.

## 4. Entrypoint.sh Changes for v6.0

Add after the workspace-init sync block, before "Boot self-check":

```bash
# ---------- Python Agent Boot Check (v6.0) ----------
echo "[entrypoint] Running Python agent on_boot() health check..."

# Sync agent source from image
if [ -d "/opt/buzz-agents/src" ]; then
  mkdir -p /data/workspace/src
  cp -r /opt/buzz-agents/src/* /data/workspace/src/ 2>/dev/null || true
  echo "[entrypoint] Agent source synced"
fi

# Run on_boot() health check
BOOT_RESULT=$(python3 -c "
import sys, json
sys.path.insert(0, '/data/workspace')
from src.agents.memory_manager import MemoryManager
mm = MemoryManager('/data/workspace/memory/')
result = mm.on_boot()
print(json.dumps(result))
" 2>&1) || true

if [ -n "$BOOT_RESULT" ]; then
  echo "[entrypoint] Agent boot result: $BOOT_RESULT"
  CRONS_OK=$(echo "$BOOT_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('crons_ok','?'))" 2>/dev/null || echo "?")
  PIPELINE=$(echo "$BOOT_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('pipeline_loaded','?'))" 2>/dev/null || echo "?")
  EXPERIENCE=$(echo "$BOOT_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('experience_loaded','?'))" 2>/dev/null || echo "?")
  echo "[entrypoint] Crons OK: $CRONS_OK | Pipeline: $PIPELINE | Experience: $EXPERIENCE"
else
  echo "[entrypoint] WARNING: Agent boot check returned no output"
fi
# ---------- End Python Agent Boot Check ----------
```

Update the banner:
```bash
echo "  v6.0 — Multi-Agent Intelligence Layer"
```

## 5. Deployment Workflow: Mac → Docker → GHCR → Akash

### Step-by-step

```
1. DEVELOP (Mac)
   └─ Write code, run TDD tests locally
   └─ python3 -m pytest src/agents/tests/ -v
   └─ git commit && git push

2. DOCKER BUILD (Mac)
   └─ docker build -t ghcr.io/buzzbysolcex/buzz-bd-agent:6.0.0 .
   └─ docker run --rm -it ghcr.io/buzzbysolcex/buzz-bd-agent:6.0.0
   └─ Verify entrypoint boot check passes

3. GHCR PUSH (Mac)
   └─ echo $GHCR_TOKEN | docker login ghcr.io -u buzzbysolcex --password-stdin
   └─ docker push ghcr.io/buzzbysolcex/buzz-bd-agent:6.0.0
   └─ docker push ghcr.io/buzzbysolcex/buzz-bd-agent:latest

4. AKASH SDL UPDATE
   └─ Update deploy.yaml image tag to 6.0.0
   └─ akash tx deployment update ... --from ogie
   └─ Monitor logs: akash provider lease-logs ...
   └─ Verify /health command returns green via Telegram
```

### Rollback procedure

```
# If v6.0 fails, revert to v5.3.8:
akash tx deployment update ... --image ghcr.io/buzzbysolcex/buzz-bd-agent:5.3.8
```

### Akash SDL changes (deploy.yaml)

```yaml
services:
  buzz:
    image: ghcr.io/buzzbysolcex/buzz-bd-agent:6.0.0  # was 5.3.8
    # ... rest unchanged
```
