#!/bin/bash
# Weekly Brain Synthesis — Sunday 06:00 UTC
# Reads brain/ + hunts/ from last 7 days and queues a synthesis trigger.
# The actual synthesis is operator-triggered for now; this script files the
# reminder mailbox event + War Room notification so a session picks it up.
#
# Schedule: 0 6 * * 0 cd /home/claude-code/buzz-workspace && bash scripts/weekly-synthesis.sh
# Manual: bash /home/claude-code/buzz-workspace/scripts/weekly-synthesis.sh

set -euo pipefail

cd "$(dirname "$0")/.."
WORKSPACE="$(pwd)"
TODAY_ISO="$(date -u +%Y-%m-%d)"
OUT_DIR="$WORKSPACE/brain/weekly-synthesis"
OUT_FILE="$OUT_DIR/$TODAY_ISO-synthesis.md"

mkdir -p "$OUT_DIR"

# Verify brain backup ran in the last 2 hours (sanity check — synthesis depends
# on a clean staging snapshot for the prior week).
STAGING_REF="$WORKSPACE/.brain-backup-staging/.git/refs/heads/main"
if [ -f "$STAGING_REF" ]; then
  REF_AGE=$(( $(date +%s) - $(stat -c %Y "$STAGING_REF") ))
  if [ "$REF_AGE" -gt 7200 ]; then
    echo "[weekly-synthesis] WARN: brain-backup staging ref is ${REF_AGE}s old (>2h). Proceeding anyway."
  fi
else
  echo "[weekly-synthesis] WARN: brain-backup staging not found at $STAGING_REF. Proceeding anyway."
fi

# Surface the trigger via War Room (Telegram) so an active session can pick up the work.
BOT_TOKEN_FILE="$HOME/.claude/channels/telegram/.env"
if [ -f "$BOT_TOKEN_FILE" ]; then
  # shellcheck source=/dev/null
  source "$BOT_TOKEN_FILE"
fi
CHAT_ID="${TELEGRAM_CHAT_ID:-950395553}"
BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
MSG="weekly-synthesis: trigger for $TODAY_ISO. Read brain/Weekly-Synthesis-Template.md and produce $OUT_FILE. Inputs: brain/ + hunts/ modified in last 7d. Feed new CONTRADICTIONS into Contradictions-Register and new OPEN QUESTIONS into Open-Questions-Tracker."

if [ -n "$BOT_TOKEN" ]; then
  curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
    -H "Content-Type: application/json" \
    -d "$(python3 -c "import json,sys; print(json.dumps({'chat_id': sys.argv[1], 'text': sys.argv[2]}))" "$CHAT_ID" "$MSG")" \
    >/dev/null || true
  echo "[weekly-synthesis] War Room notified for $TODAY_ISO."
else
  echo "[weekly-synthesis] No TELEGRAM_BOT_TOKEN; skipping War Room notification."
  echo "Reminder for operator: $MSG"
fi

# Also drop a mailbox event so daemon-mode picks it up (best-effort — no API present == no-op).
API_URL="${BUZZ_API_URL:-http://127.0.0.1:3000}"
if curl -sf "$API_URL/health" >/dev/null 2>&1; then
  curl -s -X POST "$API_URL/api/v1/mailbox/event" \
    -H "Content-Type: application/json" \
    -d "$(python3 -c "
import json
print(json.dumps({
  'source': 'weekly-synthesis-cron',
  'event_type': 'weekly_synthesis',
  'payload': {'date': '$TODAY_ISO', 'out_file': '$OUT_FILE'}
}))")" >/dev/null || true
  echo "[weekly-synthesis] Mailbox event filed for $TODAY_ISO."
else
  echo "[weekly-synthesis] Buzz API at $API_URL not reachable; mailbox event skipped."
fi

echo "[weekly-synthesis] Done. Output expected at $OUT_FILE."
