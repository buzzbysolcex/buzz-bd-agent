#!/bin/bash
set -e

export OPENCLAW_STATE_DIR=/data/.openclaw
export OPENCLAW_WORKSPACE_DIR=/data/workspace
export NPM_CONFIG_PREFIX=/data/.npm-global
export PATH="/data/.npm-global/bin:/home/linuxbrew/.linuxbrew/bin:$PATH"

echo "============================================"
echo "  Buzz BD Agent — OpenClaw v2026.2.19"
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
    "MINIMAX_API_KEY": "$MINIMAX_API_KEY",
    "OPENROUTER_API_KEY": "$OPENROUTER_API_KEY"
  },
  "models": {
    "providers": {
      "akashml": {
        "baseUrl": "https://api.akashml.com/v1",
        "apiKey": "akml-VLgEXJDTuTPueuoGPXVtoPGzUfarBCNL",
        "api": "openai-completions",
        "models": [
          {
            "id": "Qwen/Qwen3-30B-A3B",
            "name": "Qwen3 30B",
            "contextWindow": 128000,
            "maxTokens": 8192
          }
        ]
      }
    }
  },
  "agents": {
    "defaults": {
      "models": {
        "minimax/MiniMax-M2.5": {"alias": "MiniMax"},
        "openrouter/meta-llama/llama-3.3-70b-instruct:free": {"alias": "Llama70B"},
        "akashml/Qwen/Qwen3-30B-A3B": {"alias": "Qwen30B"}
      },
      "model": {
        "primary": "minimax/MiniMax-M2.5",
        "fallbacks": [
          "openrouter/meta-llama/llama-3.3-70b-instruct:free",
          "akashml/Qwen/Qwen3-30B-A3B"
        ]
      },
      "subagents": {
        "maxConcurrent": 8
      }
    }
  }
}
JSONEOF
echo "[entrypoint] Config generated at $CONFIG"

echo "[entrypoint] ENV check:"
echo "  MINIMAX_API_KEY=$([ -n "$MINIMAX_API_KEY" ] && echo 'SET' || echo 'NOT SET')"
echo "  OPENROUTER_API_KEY=$([ -n "$OPENROUTER_API_KEY" ] && echo 'SET' || echo 'NOT SET')"
echo "  TELEGRAM_BOT_TOKEN=$([ -n "$TELEGRAM_BOT_TOKEN" ] && echo 'SET' || echo 'NOT SET')"

echo "[entrypoint] Starting gateway..."
echo "[entrypoint] $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
exec openclaw gateway --port 18789 --allow-unconfigured
