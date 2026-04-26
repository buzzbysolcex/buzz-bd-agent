#!/bin/bash
# schedule-trigger.sh — v4.0 + Path B (msg 4928 + msg 4930, Apr 26 2026)
#
# (1) Inserts a mailbox EVENT row (paper trail).
# (2) Sends a Telegram nudge to the War Room — the inbound message wakes
#     a Claude Code session via the existing telegram plugin. This is
#     Path B: no daemon needed, the cron itself is the wake mechanism.
#
# Usage: schedule-trigger.sh <event_type> <message>
#
# Schema (agent_mailbox):
#   from_agent | to_agent | msg_type ∈ {ALERT,REQUEST,RESPONSE,EVENT}
#   payload (JSON) | created_at | acked_at | expires_at
#   No `status` column — proposed scripts referencing one would fail.
#
# Telegram creds: /home/claude-code/.claude/channels/telegram/.env

set -euo pipefail

EVENT_TYPE="${1:?event_type required}"
MESSAGE="${2:?message required}"
WORKSPACE="/home/claude-code/buzz-workspace"
DB="/data/buzz/persistent/buzz-api/buzz.db"
LOG="$WORKSPACE/logs/schedule-triggers.log"
TG_ENV="/home/claude-code/.claude/channels/telegram/.env"

mkdir -p "$(dirname "$LOG")"
TS="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

# ── (1) Build payload + insert mailbox EVENT row ────────────────────────
PAYLOAD="$(python3 -c '
import json, sys
print(json.dumps({
    "event_type": sys.argv[1],
    "message": sys.argv[2],
    "timestamp": sys.argv[3],
    "source": "schedule-trigger-v4-pathB",
}))
' "$EVENT_TYPE" "$MESSAGE" "$TS")"

if ! sqlite3 "$DB" \
    "INSERT INTO agent_mailbox (from_agent, to_agent, msg_type, payload) VALUES ('scheduler', 'claude-code', 'EVENT', json('$(printf '%s' "$PAYLOAD" | sed "s/'/''/g")'));" \
    2>>"$LOG"
then
    echo "[$TS] schedule-trigger MAILBOX_FAIL event_type=$EVENT_TYPE" >>"$LOG"
    # Don't exit — try the Telegram nudge anyway as a degraded-mode wake.
fi

# ── (2) Send Telegram nudge (Path B — wakes Claude Code) ────────────────
# keepalive is SILENT (msg 4934, Ogie): mailbox row still queued, but no WR
# post. Named events still wake; on the next named-event wake I drain the
# accumulated keepalive rows and check Telegram + stall flags. Only post to
# WR if I find something to flag.
# Prayer reminders are forwarded as-is (Ogie reads them; Buzz keeps working).
# Other events are framed "⏰ SCHEDULE: <type>".
if [[ "$EVENT_TYPE" == "keepalive" ]]; then
    echo "[$TS] schedule-trigger OK event_type=$EVENT_TYPE tg=skipped (silent keepalive per msg 4934)" >>"$LOG"
    exit 0
fi

if [[ "$EVENT_TYPE" == "prayer_reminder" ]]; then
    TG_TEXT="$MESSAGE"
else
    TG_TEXT="⏰ SCHEDULE: ${EVENT_TYPE}
${MESSAGE}"
fi

if [[ -f "$TG_ENV" ]]; then
    # shellcheck disable=SC1090
    set -a; . "$TG_ENV"; set +a
    if [[ -n "${TELEGRAM_BOT_TOKEN:-}" && -n "${TELEGRAM_CHAT_ID:-}" ]]; then
        TG_RESP="$(curl -sS -m 10 \
            -H 'Content-Type: application/json' \
            -d "$(python3 -c '
import json, sys, os
print(json.dumps({"chat_id": os.environ["TELEGRAM_CHAT_ID"], "text": sys.argv[1]}))
' "$TG_TEXT")" \
            "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" 2>>"$LOG" || echo '{"ok":false}')"
        if echo "$TG_RESP" | grep -q '"ok":true'; then
            echo "[$TS] schedule-trigger OK event_type=$EVENT_TYPE tg=sent" >>"$LOG"
        else
            echo "[$TS] schedule-trigger OK event_type=$EVENT_TYPE tg=FAILED resp=${TG_RESP:0:120}" >>"$LOG"
        fi
    else
        echo "[$TS] schedule-trigger OK event_type=$EVENT_TYPE tg=skipped (no creds)" >>"$LOG"
    fi
else
    echo "[$TS] schedule-trigger OK event_type=$EVENT_TYPE tg=skipped (no env file)" >>"$LOG"
fi

exit 0
