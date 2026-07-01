#!/bin/bash
# warroom-send.sh — single choke-point for War Room (Telegram) alerts.
# Sources the buzz_claude_code_bot creds (the bot that IS in the War Room group;
# the canonical BuzzBySolCex_bot is NOT — see memory reference_war_room_bot.md).
#
# Usage:  warroom-send.sh "message text"        # message as arg
#         echo "message" | warroom-send.sh       # message on stdin
# Env override: WARROOM_DRY_RUN=1  -> print the payload, do NOT send (for tests).
#
# Exit 0 on send (or dry-run), non-zero on failure. Never prints the bot token.
set -euo pipefail

BOT_ENV="/home/claude-code/.claude/channels/telegram/.env"
FALLBACK_CHAT="-1003701758077"   # War Room group (container WAR_ROOM_CHAT_ID)

MSG="${1:-}"
if [ -z "$MSG" ] && [ ! -t 0 ]; then MSG="$(cat)"; fi
if [ -z "$MSG" ]; then echo "warroom-send: empty message" >&2; exit 2; fi

if [ ! -f "$BOT_ENV" ]; then echo "warroom-send: bot env missing ($BOT_ENV)" >&2; exit 3; fi
# shellcheck disable=SC1090
set -a; source "$BOT_ENV"; set +a
CHAT="${TELEGRAM_CHAT_ID:-$FALLBACK_CHAT}"

if [ "${WARROOM_DRY_RUN:-0}" = "1" ]; then
  echo "=== WARROOM DRY-RUN (not sent) -> chat ${CHAT} ==="
  printf '%s\n' "$MSG"
  exit 0
fi

RESP=$(curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
  -d "chat_id=${CHAT}" \
  --data-urlencode "text=${MSG}")
if echo "$RESP" | grep -q '"ok":true'; then
  echo "$RESP" | grep -oE '"message_id":[0-9]+'
  exit 0
else
  # Scrub any token echo just in case; only surface the description.
  echo "warroom-send: send failed: $(echo "$RESP" | grep -oE '"description":"[^"]*"')" >&2
  exit 4
fi
