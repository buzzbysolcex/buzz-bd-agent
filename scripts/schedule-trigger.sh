#!/bin/bash
# schedule-trigger.sh — v4.0 (msg 4928, Apr 26 2026)
#
# Inserts a mailbox EVENT row that any waking Claude Code session picks up.
# No prayer guards — Buzz keeps working. Prayer windows only mean ORANGE
# items wait for Ogie's go.
#
# Usage: schedule-trigger.sh <event_type> <message>
#   event_type  free-form string (rug_watch | score_tweets | ...). Stored
#               in payload.event_type (NOT in msg_type — that column has a
#               CHECK constraint allowing only ALERT/REQUEST/RESPONSE/EVENT).
#   message     human-readable directive for the consumer.
#
# Exits 0 on success, non-zero if the insert fails.
#
# Schema reminder (agent_mailbox):
#   from_agent TEXT NOT NULL
#   to_agent   TEXT NOT NULL
#   msg_type   TEXT NOT NULL CHECK(msg_type IN ('ALERT','REQUEST','RESPONSE','EVENT'))
#   payload    TEXT DEFAULT '{}'
#   created_at DATETIME DEFAULT CURRENT_TIMESTAMP
#   expires_at DATETIME DEFAULT (datetime('now','+24 hours'))
#
# There is NO status column. Older drafts of this script referenced one and
# would have failed at insert time.

set -euo pipefail

EVENT_TYPE="${1:?event_type required}"
MESSAGE="${2:?message required}"
WORKSPACE="/home/claude-code/buzz-workspace"
DB="/data/buzz/persistent/buzz-api/buzz.db"
LOG="$WORKSPACE/logs/schedule-triggers.log"

mkdir -p "$(dirname "$LOG")"
TS="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

# Build payload as JSON. Use python3 to escape safely (avoids quoting bugs
# when the message contains apostrophes or shell metas).
PAYLOAD="$(python3 -c '
import json, sys
print(json.dumps({
    "event_type": sys.argv[1],
    "message": sys.argv[2],
    "timestamp": sys.argv[3],
    "source": "schedule-trigger-v4",
}))
' "$EVENT_TYPE" "$MESSAGE" "$TS")"

# INSERT directly via sqlite3 CLI — avoids initDB() side-effects (migrations
# run, log spam) just to write one row.
if ! sqlite3 "$DB" \
    "INSERT INTO agent_mailbox (from_agent, to_agent, msg_type, payload) VALUES ('scheduler', 'claude-code', 'EVENT', json('$(printf '%s' "$PAYLOAD" | sed "s/'/''/g")'));" \
    2>>"$LOG"
then
    echo "[$TS] schedule-trigger FAILED event_type=$EVENT_TYPE" >>"$LOG"
    exit 1
fi

echo "[$TS] schedule-trigger OK event_type=$EVENT_TYPE message=\"${MESSAGE:0:80}\"" >>"$LOG"
exit 0
