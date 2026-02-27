#!/bin/bash

# ============================================
# Buzz BD Agent v6.0.5 — 7 Sub-Agent Architecture
# Entrypoint for Akash Network deployment
# Indonesia Sprint — Feb 27, 2026
# ============================================

export OPENCLAW_STATE_DIR=/data/.openclaw
export OPENCLAW_WORKSPACE_DIR=/data/workspace
export NPM_CONFIG_PREFIX=/data/.npm-global
export PATH="/data/.npm-global/bin:/home/linuxbrew/.linuxbrew/bin:$PATH"

echo "============================================"
echo "  🐝 Buzz BD Agent v6.0.5"
echo "  7 Sub-Agent Architecture + Autonomy Mode"
echo "  OpenClaw v2026.2.26 | MiniMax M2.5"
echo "  State:     $OPENCLAW_STATE_DIR"
echo "  Workspace: $OPENCLAW_WORKSPACE_DIR"
echo "============================================"

# === Directory setup ===
mkdir -p /data/.openclaw \
         /data/workspace \
         /data/workspace/skills \
         /data/workspace/memory \
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
      "allowFrom": ["*"]
    }
  },
  "env": {
    "MINIMAX_API_KEY": "$MINIMAX_API_KEY",
    "OPENROUTER_API_KEY": "$OPENROUTER_API_KEY",
    "BANKR_API_KEY": "$BANKR_API_KEY",
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
      }
    }
  },
  "agents": {
    "defaults": {
      "models": {
        "minimax/MiniMax-M2.5": {"alias": "MiniMax"}
      },
      "model": {
        "primary": "minimax/MiniMax-M2.5",
        "fallbacks": []
      },
      "subagents": { "maxConcurrent": 8 }
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

# === ENV check ===
echo "[entrypoint] ┌─── ENV CHECK ───────────────────────────────────┐"
echo "[entrypoint] │ LLM:"
echo "[entrypoint] │   MINIMAX_API_KEY=$([ -n "$MINIMAX_API_KEY" ] && echo '✅ SET' || echo '❌ NOT SET')"
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
echo "[entrypoint] ┌─── 7 SUB-AGENTS ─────────────────────────────────┐"
echo "[entrypoint] │ 1. TokenAgent     — L1 Discovery + Data Failover  │"
echo "[entrypoint] │ 2. SafetyAgent    — L2 RugCheck + Self-Heal       │"
echo "[entrypoint] │ 3. LiquidityAgent — L2 Helius/DFlow + DLMM Fix   │"
echo "[entrypoint] │ 4. SocialAgent    — L3 Research + Twitter + DMs   │"
echo "[entrypoint] │ 5. DeployAgent    — L3 Bankr Deploy + Upsell      │"
echo "[entrypoint] │ 6. ScoringAgent   — L4 100-Point Score & Route    │"
echo "[entrypoint] │ 7. Orchestrator   — Pipeline + Budget + 40 Crons  │"
echo "[entrypoint] │ maxConcurrent: 8 | Hybrid routing | $30/mo X API  │"
echo "[entrypoint] └──────────────────────────────────────────────────┘"

# === CRITICAL: dmPolicy post-boot patch ===
# OpenClaw doctor overwrites config on startup, resetting dmPolicy
# This background process re-patches dmPolicy after gateway starts
# Without this: Telegram won't accept messages from anyone
(
  sleep 20
  CONFIG="/data/.openclaw/openclaw.json"
  if [ -f "$CONFIG" ]; then
    # Check if dmPolicy got overwritten by doctor
    CURRENT_DM=$(cat "$CONFIG" | jq -r '.channels.telegram.dmPolicy // "not set"' 2>/dev/null)
    if [ "$CURRENT_DM" != "open" ]; then
      echo "[dmPolicy-patch] dmPolicy was '$CURRENT_DM' — patching to 'open'..."
      TMP=$(mktemp)
      jq '.channels.telegram.dmPolicy = "open" | .channels.telegram.allowFrom = ["*"]' "$CONFIG" > "$TMP" && mv "$TMP" "$CONFIG"
      echo "[dmPolicy-patch] ✅ dmPolicy patched to 'open' + allowFrom: ['*']"
    else
      echo "[dmPolicy-patch] ✅ dmPolicy already 'open' — no patch needed"
    fi
  fi
  # Also clean stale Telegram offset file that can block reconnection
  if [ -f "/data/.openclaw/telegram/update-offset-default.json" ]; then
    OFFSET_AGE=$(find /data/.openclaw/telegram/update-offset-default.json -mmin +1440 2>/dev/null)
    if [ -n "$OFFSET_AGE" ]; then
      rm -f /data/.openclaw/telegram/update-offset-default.json
      echo "[dmPolicy-patch] Removed stale Telegram offset file (>24h old)"
    fi
  fi
) &

echo "[entrypoint] Starting gateway..."
echo "[entrypoint] dmPolicy patch scheduled (20s background)"
echo "[entrypoint] $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
exec openclaw gateway --port 18789 --allow-unconfigured
