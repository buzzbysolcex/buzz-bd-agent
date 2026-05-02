#!/bin/bash
# phase-a-trigger.sh — host-side wrapper for phase-a-host-trigger.js.
#
# Invoked by host crontab at 01:55 UTC (5 min before container's broken
# Phase 6 fires at 02:00). Writes 5 fileable drafts to
# /data/buzz/persistent/buzz-api/signal-drafts/ which morning-signals-v2.sh
# picks up at 04:02-07:08 UTC. Container Phase 6 also fires at 02:00 but
# its qwen3 calls fail (no Ollama reach) and stub bodies fail the 600c gate
# so it writes 0 files → host drafts survive.

set -uo pipefail

WORKSPACE="/home/claude-code/buzz-workspace"
LOG="/data/buzz/persistent/buzz-api/phase-a-trigger.log"
TG_ENV="/home/claude-code/.claude/channels/telegram/.env"

cd "$WORKSPACE"
mkdir -p "$(dirname "$LOG")" 2>/dev/null || true

START=$(date -u +%s)
echo "[$(date -u -Iseconds)] phase-a-trigger START" >> "$LOG"

# Run with generous timeout. May 2 2026 (Ogie msg 5555 forensics): qwen3:8b
# on CPX62 needs 13-17 min/slot, so 5 slots ≈ 70-85 min. Old 2700s (45m)
# killed Phase A right after slot 3 on May 2, dropping slots 4+5. Bumped to
# 5400s (90m) — ~5 min headroom over worst-case sequential run.
OUT=$(timeout 5400 node "$WORKSPACE/scripts/phase-a-host-trigger.js" 2>&1)
RC=$?
END=$(date -u +%s)
DURATION=$((END - START))

# Count drafts written for today
TODAY=$(date -u +%Y-%m-%d)
WRITTEN=$(ls /data/buzz/persistent/buzz-api/signal-drafts/${TODAY}-bitcoin-macro-*.json /data/buzz/persistent/buzz-api/signal-drafts/${TODAY}-quantum-*.json 2>/dev/null | wc -l)

echo "[$(date -u -Iseconds)] phase-a-trigger END rc=$RC duration=${DURATION}s drafts_written=$WRITTEN" >> "$LOG"
echo "$OUT" >> "$LOG"

# War Room report
if [ -f "$TG_ENV" ]; then
    . "$TG_ENV"
    MSG="🌙 PHASE A TRIGGER (host) — ${TODAY}
duration: ${DURATION}s | drafts written: ${WRITTEN}/5 | rc=$RC

Morning chain (04:02-07:08Z) picks up these drafts. Fallback nudge fires only if a slot's draft is missing."
    curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
        --data-urlencode "chat_id=${TELEGRAM_CHAT_ID}" \
        --data-urlencode "text=${MSG}" >/dev/null 2>&1
fi

exit $RC
