#!/bin/bash
# ACP Seller Runtime Auto-Start
# Called from entrypoint.sh with 30s delay after gateway boot
# Buzz BD Agent — ACP Agent #17681

ACP_DIR="/data/workspace/skills/virtuals-acp"

echo "[acp-start] Checking ACP config..."

if [ ! -f "$ACP_DIR/config.json" ]; then
  echo "[acp-start] ❌ No config.json — skipping ACP start"
  exit 0
fi

# Re-authenticate if needed
echo "[acp-start] Starting ACP seller runtime..."
cd "$ACP_DIR"

# Start seller service
npx tsx bin/acp.ts serve start >> /data/logs/acp-serve.log 2>&1

echo "[acp-start] ✅ ACP seller runtime active"
echo "[acp-start] Services: token_intelligence_score, token_safety_check, trending_token_intelligence, exchange_listing_readiness"
echo "[acp-start] Logs: /data/logs/acp-serve.log"
