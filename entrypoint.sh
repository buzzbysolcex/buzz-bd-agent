#!/bin/bash
set -e

# ============================================
# Buzz BD Agent — Entrypoint v2026.2.19
# github.com/buzzbysolcex/buzz-bd-agent
# ============================================

# CRITICAL: Set these BEFORE gateway start or config ignored
export OPENCLAW_STATE_DIR=/data/.openclaw
export OPENCLAW_WORKSPACE_DIR=/data/workspace
export NPM_CONFIG_PREFIX=/data/.npm-global
export PATH="/data/.npm-global/bin:/home/linuxbrew/.linuxbrew/bin:$PATH"

echo "============================================"
echo "  Buzz BD Agent — OpenClaw v2026.2.19"
echo "  State:     $OPENCLAW_STATE_DIR"
echo "  Workspace: $OPENCLAW_WORKSPACE_DIR"
echo "============================================"

# Ensure directories exist
mkdir -p /data/.openclaw
mkdir -p /data/workspace
mkdir -p /data/.npm-global
mkdir -p /data/workspace/memory

# ============================================
# Install/verify plugin dependencies
# ============================================

# Install eliza-adapter if not present
if ! command -v eliza-adapter &> /dev/null; then
  echo "[entrypoint] Installing eliza-adapter..."
  npm install -g @openclaw/eliza-adapter 2>/dev/null || echo "[entrypoint] WARNING: eliza-adapter install failed"
fi

# Install plugin-solcex-bd if not present
if [ ! -d "/data/.npm-global/lib/node_modules/@buzzbd/plugin-solcex-bd" ]; then
  echo "[entrypoint] Installing @buzzbd/plugin-solcex-bd@1.0.0..."
  npm install -g @buzzbd/plugin-solcex-bd@1.0.0 2>/dev/null || echo "[entrypoint] WARNING: plugin install failed"
fi

echo "[entrypoint] Plugin check complete"

# ============================================
# Restore cron jobs from backup
# ============================================
CRON_BACKUP="/data/workspace/memory/cron-schedule.json"
if [ -f "$CRON_BACKUP" ]; then
  echo "[entrypoint] Cron backup found: $CRON_BACKUP"
  echo "[entrypoint] Gateway will restore cron jobs on boot"
else
  echo "[entrypoint] ⚠️  WARNING: No cron backup found at $CRON_BACKUP"
  echo "[entrypoint] Cron jobs will need manual restoration via Telegram"
fi

# ============================================
# Config backup before start
# ============================================
CONFIG="/data/.openclaw/openclaw.json"
if [ -f "$CONFIG" ]; then
  cp "$CONFIG" "${CONFIG}.bak"
  echo "[entrypoint] Config backed up to ${CONFIG}.bak"
else
  echo "[entrypoint] ⚠️  WARNING: No config found at $CONFIG"
  echo "[entrypoint] Gateway may need manual configuration"
fi

# ============================================
# v2026.2.19 NOTES:
# - Gateway auto-generates gateway.auth.token on first boot
#   if not already set. This is expected behavior.
# - hooks.token MUST differ from gateway.auth.token
#   or startup will FAIL.
# - Cron/heartbeat delivery now honors explicit TG topic
#   targets (<chatId>:topic:<threadId>).
# - ACP sessions have idle reaping + burst rate limiting.
# ============================================

# ============================================
# Health check: verify critical env vars
# ============================================
echo "[entrypoint] ENV check:"
echo "  OPENCLAW_STATE_DIR=$OPENCLAW_STATE_DIR"
echo "  OPENCLAW_WORKSPACE_DIR=$OPENCLAW_WORKSPACE_DIR"
echo "  NPM_CONFIG_PREFIX=$NPM_CONFIG_PREFIX"
echo "  ANTHROPIC_API_KEY=$([ -n "$ANTHROPIC_API_KEY" ] && echo 'SET' || echo 'NOT SET')"
echo "  OPENROUTER_API_KEY=$([ -n "$OPENROUTER_API_KEY" ] && echo 'SET' || echo 'NOT SET')"

# ============================================
# Start gateway (foreground, tini manages)
# ============================================
echo "[entrypoint] Starting OpenClaw gateway on port 18789..."
echo "[entrypoint] $(date -u '+%Y-%m-%d %H:%M:%S UTC')"

# NOTE: Use 'openclaw gateway' NOT 'openclaw --yes' (--yes broken on v2026.2.2+)
exec openclaw gateway --port 18789
