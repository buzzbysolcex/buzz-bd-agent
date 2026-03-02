#!/bin/bash

# ============================================
# Buzz BD Agent v6.1.0 — 5 Parallel Sub-Agents + Orchestrator
# OpenClaw v2026.3.1 | Bankr LLM Gateway
# Entrypoint for Akash Network deployment
# Indonesia Sprint — Mar 2, 2026
# ============================================

export OPENCLAW_STATE_DIR=/data/.openclaw
export OPENCLAW_WORKSPACE_DIR=/data/workspace
export NPM_CONFIG_PREFIX=/data/.npm-global
export PATH="/data/.npm-global/bin:/home/linuxbrew/.linuxbrew/bin:$PATH"

echo "============================================"
echo "  🐝 Buzz BD Agent v6.1.0"
echo "  5 Parallel Sub-Agents + Orchestrator"
echo "  OpenClaw v2026.3.1 | MiniMax M2.5"
echo "  Bankr LLM Gateway (8 models, dual keys)"
echo "  State:     $OPENCLAW_STATE_DIR"
echo "  Workspace: $OPENCLAW_WORKSPACE_DIR"
echo "============================================"

# === Directory setup ===
mkdir -p /data/.openclaw \
         /data/workspace \
         /data/workspace/skills \
         /data/workspace/memory/pipeline \
         /data/.npm-global \
         /data/pipeline \
         /data/bankr \
         /data/bankr/deploys \
         /data/logs \
         /data/outreach/drafts \
         /data/atv

# === Sync skills from Docker image to persistent workspace ===
if [ -d "/opt/buzz-skills" ]; then
  cp -r /opt/buzz-skills/* /data/workspace/skills/ 2>/dev/null || true
  SKILL_COUNT=$(ls -d /opt/buzz-skills/*/ 2>/dev/null | wc -l)
  echo "[entrypoint] Skills synced: $SKILL_COUNT skills"
fi

# ═══════════════════════════════════════════════════════════
# 📡 GITHUB SKILL SYNC — Auto-pull if missing or stale
# ═══════════════════════════════════════════════════════════
MASTER_OPS_PATH="/data/workspace/skills/master-ops/SKILL.md"
MASTER_OPS_URL="https://raw.githubusercontent.com/buzzbysolcex/buzz-bd-agent/main/skills/master-ops/SKILL.md"
L5_DIRECTIVE_PATH="/data/workspace/memory/pipeline-L5-upgrade.md"
L5_DIRECTIVE_URL="https://raw.githubusercontent.com/buzzbysolcex/buzz-bd-agent/main/memory/pipeline-L5-upgrade.md"

echo "┌─────────────────────────────────────────┐"
echo "│  📡 GITHUB SKILL SYNC                    │"
echo "└─────────────────────────────────────────┘"

# Master Ops
mkdir -p /data/workspace/skills/master-ops
if [ ! -f "$MASTER_OPS_PATH" ] || [ "$(find "$MASTER_OPS_PATH" -mtime +1 2>/dev/null)" ]; then
  echo "│  Master Ops: Pulling from GitHub..."
  curl -sL "$MASTER_OPS_URL" -o "$MASTER_OPS_PATH" 2>/dev/null
  if [ $? -eq 0 ] && [ -s "$MASTER_OPS_PATH" ]; then
    echo "│  Master Ops: ✅ Updated from GitHub"
  else
    echo "│  Master Ops: ⚠️ GitHub pull failed — using existing"
  fi
else
  echo "│  Master Ops: ✅ Current (< 24h old)"
fi

# L5 Directive
mkdir -p /data/workspace/memory
if [ ! -f "$L5_DIRECTIVE_PATH" ]; then
  echo "│  L5 Directive: Pulling from GitHub..."
  curl -sL "$L5_DIRECTIVE_URL" -o "$L5_DIRECTIVE_PATH" 2>/dev/null
  if [ $? -eq 0 ] && [ -s "$L5_DIRECTIVE_PATH" ]; then
    echo "│  L5 Directive: ✅ Installed"
  else
    echo "│  L5 Directive: ⚠️ GitHub pull failed"
  fi
else
  echo "│  L5 Directive: ✅ Exists"
fi
echo "└─────────────────────────────────────────┘"

# === Generate OpenClaw config from env vars ===
CONFIG="/data/.openclaw/openclaw.json"
echo "[entrypoint] Generating config from env vars..."
cat > "$CONFIG" << JSONEOF
{
  "gateway": { "port": 18789, "mode": "local" },
  "channels": {
    "telegram": {
      "enabled": true,
      "botToken": "$TELEGRAM_BOT_TOKEN",
      "dmPolicy": "open",
      "allowFrom": ["*"],
      "direct": {
        "950395553": {
          "dmPolicy": "open",
          "skills": ["*"],
          "systemPrompt": "You are Buzz BD Agent for SolCex Exchange. Ogie is your operator. Chat ID: 950395553."
        }
      }
    }
  },
  "env": {
    "MINIMAX_API_KEY": "$MINIMAX_API_KEY",
    "OPENROUTER_API_KEY": "$OPENROUTER_API_KEY",
    "BANKR_API_KEY": "$BANKR_API_KEY",
    "BANKR_LLM_KEY": "$BANKR_LLM_KEY",
    "BANKR_API_URL": "${BANKR_API_URL:-https://api.bankr.bot}",
    "BANKR_API_ENDPOINT": "${BANKR_API_ENDPOINT:-https://api.bankr.bot/token-launches/deploy}",
    "BANKR_FEE_WALLET": "$BANKR_FEE_WALLET",
    "BANKR_DEPLOY_WALLET": "$BANKR_DEPLOY_WALLET",
    "BANKR_CHAIN": "${BANKR_CHAIN:-base}",
    "BANKR_REFERRAL": "${BANKR_REFERRAL:-VFJ23TVS-BNKR}",
    "HELIUS_API_KEY": "$HELIUS_API_KEY",
    "GROK_API_KEY": "$GROK_API_KEY",
    "SERPER_API_KEY": "$SERPER_API_KEY",
    "FIRECRAWL_API_KEY": "$FIRECRAWL_API_KEY",
    "HYPERBROWSER_API_KEY": "$HYPERBROWSER_API_KEY",
    "ALLIUM_API_KEY": "$ALLIUM_API_KEY",
    "X_API_KEY": "$X_API_KEY",
    "X_API_SECRET": "$X_API_SECRET",
    "X_BEARER_TOKEN": "$X_BEARER_TOKEN",
    "X_ACCESS_TOKEN": "$X_ACCESS_TOKEN",
    "X_ACCESS_TOKEN_SECRET": "$X_ACCESS_TOKEN_SECRET",
    "GMAIL_CLIENT_ID": "$GMAIL_CLIENT_ID",
    "GMAIL_CLIENT_SECRET": "$GMAIL_CLIENT_SECRET",
    "GMAIL_REFRESH_TOKEN": "$GMAIL_REFRESH_TOKEN",
    "GMAIL_ADDRESS": "${GMAIL_ADDRESS:-buzzbysolcex@gmail.com}",
    "MOLTBOOK_AGENT_ID": "$MOLTBOOK_AGENT_ID",
    "MOLTBOOK_API_KEY": "$MOLTBOOK_API_KEY",
    "ATV_API_URL": "${ATV_API_URL:-https://api.web3identity.com}",
    "ATV_ENABLED": "${ATV_ENABLED:-true}",
    "ATV_BATCH_ENDPOINT": "${ATV_BATCH_ENDPOINT:-/api/ens/batch-resolve}",
    "DEXSCREENER_BASE_URL": "${DEXSCREENER_BASE_URL:-https://api.dexscreener.com}",
    "AUTONOMY_MODE": "${AUTONOMY_MODE:-operational}",
    "DATA_FAILOVER_ENABLED": "${DATA_FAILOVER_ENABLED:-true}",
    "TWITTER_COMMANDS_ENABLED": "${TWITTER_COMMANDS_ENABLED:-true}"
  },
  "models": {
    "providers": {
      "minimax": {
        "baseUrl": "https://api.minimax.io/anthropic",
        "apiKey": "$MINIMAX_API_KEY",
        "api": "anthropic-messages",
        "models": [{
          "id": "MiniMax-M2.5",
          "name": "MiniMax M2.5 229B",
          "contextWindow": 200000,
          "maxTokens": 8192
        }]
      },
      "bankr": {
        "baseUrl": "https://llm.bankr.bot",
        "apiKey": "$BANKR_LLM_KEY",
        "api": "openai-completions",
        "models": [
          { "id": "gemini-3-flash", "name": "Gemini 3 Flash", "input": ["text","image"], "contextWindow": 1048576, "maxTokens": 65535, "cost": { "input": 0.15, "output": 0.6 } },
          { "id": "claude-haiku-4.5", "name": "Claude Haiku 4.5", "input": ["text","image"], "contextWindow": 200000, "maxTokens": 64000, "api": "anthropic-messages", "cost": { "input": 0.8, "output": 4.0 } },
          { "id": "gpt-5-nano", "name": "GPT-5 Nano", "input": ["text"], "contextWindow": 400000, "maxTokens": 128000, "cost": { "input": 0.1, "output": 0.4 } },
          { "id": "claude-sonnet-4.6", "name": "Claude Sonnet 4.6", "input": ["text","image"], "contextWindow": 200000, "maxTokens": 64000, "api": "anthropic-messages", "cost": { "input": 3.0, "output": 15.0 } },
          { "id": "qwen3-coder", "name": "Qwen3 Coder", "input": ["text"], "contextWindow": 262144, "maxTokens": 65536, "cost": { "input": 0.3, "output": 1.2 } },
          { "id": "gpt-5-mini", "name": "GPT-5 Mini", "input": ["text"], "contextWindow": 400000, "maxTokens": 128000, "cost": { "input": 0.4, "output": 1.6 } },
          { "id": "gemini-3-pro", "name": "Gemini 3 Pro", "input": ["text","image"], "contextWindow": 1048576, "maxTokens": 65536, "cost": { "input": 1.25, "output": 10.0 } },
          { "id": "kimi-k2.5", "name": "Kimi K2.5", "input": ["text"], "contextWindow": 262144, "maxTokens": 65535, "cost": { "input": 0.6, "output": 2.4 } }
        ]
      }
    }
  },
  "agents": {
    "defaults": {
      "models": {
        "minimax/MiniMax-M2.5": {"alias": "MiniMax"},
        "bankr/gemini-3-flash": {"alias": "Gemini3Flash"},
        "bankr/claude-haiku-4.5": {"alias": "Haiku"},
        "bankr/gpt-5-nano": {"alias": "GPT5Nano"},
        "bankr/claude-sonnet-4.6": {"alias": "Sonnet"}
      },
      "model": {
        "primary": "minimax/MiniMax-M2.5",
        "fallbacks": ["bankr/gemini-3-flash","bankr/claude-haiku-4.5","bankr/gpt-5-nano"]
      },
      "subagents": {
        "model": "bankr/gpt-5-nano",
        "fallbacks": ["bankr/claude-haiku-4.5"],
        "runTimeoutSeconds": 120,
        "archiveAfterMinutes": 60,
        "maxConcurrent": 8,
        "maxChildrenPerAgent": 5,
        "maxSpawnDepth": 1
      }
    }
  }
}
JSONEOF
echo "[entrypoint] Config generated at $CONFIG"

# === Bankr CLI config ===
mkdir -p /root/.bankr
cat > /root/.bankr/config.json << BANKREOF
{
  "apiKey": "$BANKR_API_KEY",
  "apiUrl": "${BANKR_API_URL:-https://api.bankr.bot}"
}
BANKREOF
echo "[entrypoint] Bankr CLI configured"

# === ATV Web3 Identity config ===
cat > /data/atv/atv-config.json << ATVEOF
{
  "apiUrl": "${ATV_API_URL:-https://api.web3identity.com}",
  "enabled": true,
  "dailyLimit": ${ATV_DAILY_LIMIT:-100},
  "batchEndpoint": "${ATV_BATCH_ENDPOINT:-/api/ens/batch-resolve}"
}
ATVEOF
echo "[entrypoint] ATV config generated"

# === Boot self-check ===
echo "[entrypoint] Running boot self-check..."
if [ -f "/data/workspace/memory/cron-schedule.json" ]; then
  CRON_COUNT=$(cat /data/workspace/memory/cron-schedule.json | grep -c '"id"' 2>/dev/null || echo "0")
  echo "[entrypoint] Cron schedule found: $CRON_COUNT jobs"
else
  echo "[entrypoint] ⚠️  cron-schedule.json not found — Buzz will restore 40 crons on first boot"
fi

# Check orchestrator skill
if [ -f "/data/workspace/skills/orchestrator/orchestrate.js" ]; then
  echo "[entrypoint] Orchestrator skill: ✅ FOUND"
else
  echo "[entrypoint] Orchestrator skill: ⚠️  Not found — will be created by Buzz"
fi

# Check pipeline scan skill
if [ -f "/data/workspace/skills/buzz-pipeline-scan/scan.js" ]; then
  echo "[entrypoint] Pipeline scan skill: ✅ FOUND"
else
  echo "[entrypoint] Pipeline scan skill: ⚠️  Not found — will be created by Buzz"
fi

# === ENV check ===
echo "[entrypoint] ┌─── ENV CHECK ───────────────────────────────────┐"
echo "[entrypoint] │ LLM:"
echo "[entrypoint] │   MINIMAX_API_KEY=$([ -n "$MINIMAX_API_KEY" ] && echo '✅ SET' || echo '❌ NOT SET')"
echo "[entrypoint] │   BANKR_LLM_KEY=$([ -n "$BANKR_LLM_KEY" ] && echo '✅ SET' || echo '❌ NOT SET')"
echo "[entrypoint] │   DEFAULT_MODEL=${DEFAULT_MODEL:-minimax/MiniMax-M2.5}"
echo "[entrypoint] │ Telegram:"
echo "[entrypoint] │   TELEGRAM_BOT_TOKEN=$([ -n "$TELEGRAM_BOT_TOKEN" ] && echo '✅ SET' || echo '❌ NOT SET')"
echo "[entrypoint] │   TELEGRAM_CHAT_ID=${TELEGRAM_CHAT_ID:-not set}"
echo "[entrypoint] │ X API:"
echo "[entrypoint] │   X_API_KEY=$([ -n "$X_API_KEY" ] && echo '✅ SET' || echo '❌ NOT SET')"
echo "[entrypoint] │   X_ACCESS_TOKEN=$([ -n "$X_ACCESS_TOKEN" ] && echo '✅ SET' || echo '❌ NOT SET')"
echo "[entrypoint] │   X_BEARER_TOKEN=$([ -n "$X_BEARER_TOKEN" ] && echo '✅ SET' || echo '❌ NOT SET')"
echo "[entrypoint] │   X_API_MONTHLY_BUDGET=${X_API_MONTHLY_BUDGET:-30.00}"
echo "[entrypoint] │ Bankr:"
echo "[entrypoint] │   BANKR_API_KEY=$([ -n "$BANKR_API_KEY" ] && echo '✅ SET' || echo '❌ NOT SET')"
echo "[entrypoint] │   BANKR_FEE_WALLET=${BANKR_FEE_WALLET:-not set}"
echo "[entrypoint] │   BANKR_DEPLOY_WALLET=${BANKR_DEPLOY_WALLET:-not set}"
echo "[entrypoint] │   BANKR_SIGNALS=$([ "$BANKR_SIGNALS_ENABLED" = "true" ] && echo '✅ ON' || echo '⚪ OFF')"
echo "[entrypoint] │   BANKR_ERROR_HANDLING=$([ "$BANKR_ERROR_HANDLING_ENABLED" = "true" ] && echo '✅ ON' || echo '⚪ OFF')"
echo "[entrypoint] │ ATV Web3 Identity:"
echo "[entrypoint] │   ATV_API_URL=${ATV_API_URL:-NOT SET}"
echo "[entrypoint] │   ATV_ENABLED=${ATV_ENABLED:-false}"
echo "[entrypoint] │ Nansen x402 Smart Money:"
echo "[entrypoint] │   NANSEN_ENABLED=${NANSEN_X402_ENABLED:-NOT SET}"
echo "[entrypoint] │   NANSEN_THRESHOLD=${NANSEN_SCORE_THRESHOLD:-NOT SET}"
echo "[entrypoint] │   NANSEN_BUDGET=${NANSEN_DAILY_BUDGET_CENTS:-NOT SET}¢"
echo "[entrypoint] │   NANSEN_WALLET=$([ -n \"$NANSEN_X402_WALLET_KEY\" ] && echo '✅ SET' || echo '⚠️ NOT SET')"
echo "[entrypoint] │ Intelligence:"
echo "[entrypoint] │   HELIUS=$([ -n "$HELIUS_API_KEY" ] && echo '✅' || echo '❌')"
echo "[entrypoint] │   GROK=$([ -n "$GROK_API_KEY" ] && echo '✅' || echo '❌')"
echo "[entrypoint] │   SERPER=$([ -n "$SERPER_API_KEY" ] && echo '✅' || echo '❌')"
echo "[entrypoint] │   FIRECRAWL=$([ -n "$FIRECRAWL_API_KEY" ] && echo '✅' || echo '❌')"
echo "[entrypoint] │   HYPERBROWSER=$([ -n "$HYPERBROWSER_API_KEY" ] && echo '✅' || echo '❌')"
echo "[entrypoint] │   ALLIUM=$([ -n "$ALLIUM_API_KEY" ] && echo '✅' || echo '❌')"
echo "[entrypoint] │ Gmail:"
echo "[entrypoint] │   GMAIL=$([ -n "$GMAIL_CLIENT_ID" ] && echo '✅ SET' || echo '❌ NOT SET')"
echo "[entrypoint] │ Moltbook:"
echo "[entrypoint] │   MOLTBOOK=$([ -n "$MOLTBOOK_API_KEY" ] && echo '✅ SET' || echo '❌ NOT SET')"
echo "[entrypoint] │ Autonomy:"
echo "[entrypoint] │   MODE=${AUTONOMY_MODE:-supervised}"
echo "[entrypoint] │   TWEET_AUTO=${TWEET_AUTO_POST:-false}"
echo "[entrypoint] │   DEPLOY_AUTO=${DEPLOY_AUTO_EXECUTE:-false}"
echo "[entrypoint] │   CONTENT_FILTER=${CONTENT_FILTER_ENABLED:-false}"
echo "[entrypoint] │   LISTING_UPSELL=${LISTING_UPSELL_ON_DEPLOY:-false}"
echo "[entrypoint] │ Twitter Commands:"
echo "[entrypoint] │   COMMANDS=${TWITTER_COMMANDS_ENABLED:-false}"
echo "[entrypoint] │   MENTION_INTERVAL=${TWITTER_MENTION_CHECK_INTERVAL:-30}min"
echo "[entrypoint] │   REPLY_CAP=${TWITTER_REPLY_DAILY_CAP:-10}/day"
echo "[entrypoint] │   DM_CAP=${TWITTER_DM_DAILY_CAP:-5}/day"
echo "[entrypoint] │ Data Failover:"
echo "[entrypoint] │   ENABLED=${DATA_FAILOVER_ENABLED:-false}"
echo "[entrypoint] │   DUAL_VERIFY=${REQUIRE_DUAL_VERIFICATION:-false}"
echo "[entrypoint] │   MIN_SOURCES=${MIN_SOURCES_FOR_VALID_DATA:-1}"
echo "[entrypoint] └──────────────────────────────────────────────────┘"

# === Sub-agent banner ===
echo "[entrypoint] ┌─── 5 PARALLEL SUB-AGENTS + ORCHESTRATOR ─────────┐"
echo "[entrypoint] │ 1. scanner-agent  — L1 Discovery (DexScreener+)   │"
echo "[entrypoint] │ 2. safety-agent   — L2 RugCheck + DFlow MCP       │"
echo "[entrypoint] │ 3. wallet-agent   — L2 Helius + Allium forensics  │"
echo "[entrypoint] │ 4. social-agent   — L3 Grok + Serper + ATV        │"
echo "[entrypoint] │ 5. scorer-agent   — L4 100-Point composite score  │"
echo "[entrypoint] │ + Orchestrator    — MiniMax M2.5 (dispatch+agg)   │"
echo "[entrypoint] │                                                    │"
echo "[entrypoint] │ Sub-agent model: bankr/gpt-5-nano                 │"
echo "[entrypoint] │ Sub-agent fallback: bankr/claude-haiku-4.5        │"
echo "[entrypoint] │ Sub-agent timeout: 120s (FIX #1)                  │"
echo "[entrypoint] │ gemini-3-flash: EXCLUDED from sub-agents          │"
echo "[entrypoint] │ maxConcurrent: 8 | maxSpawnDepth: 1               │"
echo "[entrypoint] └──────────────────────────────────────────────────┘"

# === OpenClaw v2026.3.1 features ===
echo "[entrypoint] ┌─── OpenClaw v2026.3.1 NEW FEATURES ──────────────┐"
echo "[entrypoint] │ • Telegram DM topics (native per-DM dmPolicy)     │"
echo "[entrypoint] │ • Cron light-context (--light-context bootstrap)  │"
echo "[entrypoint] │ • Sub-agent typed task_completion events          │"
echo "[entrypoint] │ • Health endpoints (/health, /healthz, /ready)    │"
echo "[entrypoint] │ • Thinking fallback (think=off retry)             │"
echo "[entrypoint] │ • Telegram outbound chunking fix (sub-agents)     │"
echo "[entrypoint] │ • Cron delivery mode fix (mode:none works)        │"
echo "[entrypoint] └──────────────────────────────────────────────────┘"

# === CRITICAL: dmPolicy post-boot patch ===
# Belt-and-suspenders: config sets dmPolicy:"open" + direct config (v2026.3.1)
# But OpenClaw doctor may still overwrite on startup
(
  sleep 25
  CONFIG="/data/.openclaw/openclaw.json"
  if [ -f "$CONFIG" ]; then
    CURRENT_DM=$(cat "$CONFIG" | jq -r '.channels.telegram.dmPolicy // "not set"' 2>/dev/null)
    if [ "$CURRENT_DM" != "open" ]; then
      echo "[dmPolicy-patch] dmPolicy was '$CURRENT_DM' — patching to 'open'..."
      TMP=$(mktemp)
      jq '.channels.telegram.dmPolicy = "open" | .channels.telegram.allowFrom = ["*"]' "$CONFIG" > "$TMP" && mv "$TMP" "$CONFIG"
      echo "[dmPolicy-patch] ✅ dmPolicy patched to 'open'"
    else
      echo "[dmPolicy-patch] ✅ dmPolicy already 'open' — no patch needed"
    fi
  fi
  # Clean stale Telegram offset file
  if [ -f "/data/.openclaw/telegram/update-offset-default.json" ]; then
    OFFSET_AGE=$(find /data/.openclaw/telegram/update-offset-default.json -mmin +1440 2>/dev/null)
    if [ -n "$OFFSET_AGE" ]; then
      rm -f /data/.openclaw/telegram/update-offset-default.json
      echo "[dmPolicy-patch] Removed stale Telegram offset file (>24h old)"
    fi
  fi
  # Second patch at 90s
  sleep 65
  if [ -f "$CONFIG" ]; then
    CURRENT_DM=$(cat "$CONFIG" | jq -r '.channels.telegram.dmPolicy // "not set"' 2>/dev/null)
    if [ "$CURRENT_DM" != "open" ]; then
      TMP=$(mktemp)
      jq '.channels.telegram.dmPolicy = "open" | .channels.telegram.allowFrom = ["*"]' "$CONFIG" > "$TMP" && mv "$TMP" "$CONFIG"
      echo "[dmPolicy-patch] ✅ Second patch applied at 90s"
    fi
  fi
) &

# === Twitter Bot v3.0 Sales Funnel ===
echo "[entrypoint] 🐝 Starting Twitter Bot v3.0 Sales Funnel..."
pkill -f twitter-bot.js 2>/dev/null || true
sleep 1
if [ -f "/opt/buzz-scripts/twitter-bot.js" ]; then
  nohup node /opt/buzz-scripts/twitter-bot.js >> /data/logs/twitter-bot.log 2>&1 &
  echo "[entrypoint] Twitter Bot PID: $! (log: /data/logs/twitter-bot.log)"
else
  echo "[entrypoint] ⚠️  twitter-bot.js not found at /opt/buzz-scripts/"
fi

# === Post-boot GitHub skill sync ===
MASTER_OPS_PATH="/data/workspace/skills/master-ops/SKILL.md"
MASTER_OPS_URL="https://raw.githubusercontent.com/buzzbysolcex/buzz-bd-agent/main/skills/master-ops/SKILL.md"
mkdir -p /data/workspace/skills/master-ops
if [ ! -f "$MASTER_OPS_PATH" ] || [ "$(find "$MASTER_OPS_PATH" -mtime +1 2>/dev/null)" ]; then
  echo "[entrypoint] 📡 Master Ops: Pulling from GitHub..."
  curl -sL "$MASTER_OPS_URL" -o "$MASTER_OPS_PATH" 2>/dev/null && echo "[entrypoint] ✅ Master Ops updated" || echo "[entrypoint] ⚠️ Master Ops pull failed"
else
  echo "[entrypoint] ✅ Master Ops: Current (< 24h old)"
fi

echo "[entrypoint] Starting gateway..."
echo "[entrypoint] dmPolicy: open (config + background patch at 25s + 90s)"
echo "[entrypoint] $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
exec openclaw gateway --port 18789 --allow-unconfigured
