#!/bin/bash

export OPENCLAW_STATE_DIR=/data/.openclaw
export OPENCLAW_WORKSPACE_DIR=/data/workspace
export NPM_CONFIG_PREFIX=/data/.npm-global
export PATH="/data/.npm-global/bin:/home/linuxbrew/.linuxbrew/bin:$PATH"

echo "============================================"
echo "  Buzz BD Agent — OpenClaw v2026.2.19"
echo "  ClawRouter v0.9.39 — BlockRun x402"
echo "  State:     $OPENCLAW_STATE_DIR"
echo "  Workspace: $OPENCLAW_WORKSPACE_DIR"
echo "============================================"


mkdir -p /data/.openclaw /data/workspace /data/workspace/skills /data/.npm-global /data/workspace/memory

if [ -d "/opt/buzz-skills" ]; then
  cp -r /opt/buzz-skills/* /data/workspace/skills/ 2>/dev/null || true
  echo "[entrypoint] Skills synced"
fi

CONFIG="/data/.openclaw/openclaw.json"
echo "[entrypoint] Generating config from env vars..."
cat > "$CONFIG" << JSONEOF
{
  "gateway": {
    "port": 18789,
    "mode": "local"
  },
  "channels": {
    "telegram": {
      "enabled": true,
      "botToken": "$TELEGRAM_BOT_TOKEN"
    }
  },
  "env": {
    "MINIMAX_API_KEY": "$MINIMAX_API_KEY"
  },
  "plugins": {
    "allow": ["clawrouter"]
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "blockrun/eco"
      },
      "subagents": {
        "maxConcurrent": 8
      }
    }
  }
}
JSONEOF
echo "[entrypoint] Config generated at $CONFIG"

echo "[entrypoint] Setting up ClawRouter..."
if [ -d "/opt/buzz-clawrouter/clawrouter" ]; then
  mkdir -p /data/.openclaw/extensions
  cp -r /opt/buzz-clawrouter/clawrouter /data/.openclaw/extensions/
  echo "[entrypoint] ClawRouter plugin copied"
fi

if [ -n "$BLOCKRUN_WALLET_KEY" ]; then
  mkdir -p /data/.openclaw/blockrun
  echo "$BLOCKRUN_WALLET_KEY" > /data/.openclaw/blockrun/wallet.key
  echo "[entrypoint] BlockRun wallet injected"
fi

echo "[entrypoint] Running boot self-check..."
if [ -f "/data/workspace/memory/cron-schedule.json" ]; then
  CRON_COUNT=$(cat /data/workspace/memory/cron-schedule.json | grep -c '"id"' 2>/dev/null || echo "0")
  echo "[entrypoint] Cron schedule found: $CRON_COUNT jobs"
else
  echo "[entrypoint] WARNING: cron-schedule.json not found!"
fi

echo "[entrypoint] ENV check:"
echo "  MINIMAX_API_KEY=$([ -n "$MINIMAX_API_KEY" ] && echo 'SET' || echo 'NOT SET')"
echo "  BLOCKRUN_WALLET_KEY=$([ -n "$BLOCKRUN_WALLET_KEY" ] && echo 'SET' || echo 'NOT SET')"
echo "  TELEGRAM_BOT_TOKEN=$([ -n "$TELEGRAM_BOT_TOKEN" ] && echo 'SET' || echo 'NOT SET')"
echo "  OpenRouter: REMOVED (using BlockRun via ClawRouter)"

echo "[entrypoint] Starting gateway..."
echo "[entrypoint] $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
exec openclaw gateway --port 18789 --allow-unconfigured
