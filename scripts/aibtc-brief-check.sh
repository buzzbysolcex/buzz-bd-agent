#!/bin/bash
# aibtc-brief-check.sh — Fetch yesterday's compiled brief, cross-ref
# our signal_ids against included_signals, update local status, report
# to War Room.
#
# Brief compiles at ~05:03Z each day (Apr 26 brief compiled 2026-04-27
# 05:03:22Z). Run at 06:00Z to catch the freshly-compiled brief.
#
# Usage:
#   aibtc-brief-check.sh                   # check yesterday
#   aibtc-brief-check.sh YYYY-MM-DD        # check that brief
#
# Wired into:
#   - crontab daily 06:00Z

set -uo pipefail

DB="/data/buzz/persistent/buzz-api/buzz.db"
LOG="/home/claude-code/data-crons.log"
OUR_ADDR="bc1qsja6knydqxj0nxf05466zhu8qqedu8umxeagze"
TG_ENV="/home/claude-code/.claude/channels/telegram/.env"

DATE="${1:-$(date -u -d 'yesterday' +%Y-%m-%d)}"
BRIEF_URL="https://aibtc.news/api/brief/$DATE"
TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT

curl -s "$BRIEF_URL" --max-time 20 -o "$TMP"

# Parse + cross-ref
RESULT=$(python3 << PYEOF
import json, sqlite3, sys
try:
    d = json.load(open("$TMP"))
except Exception as e:
    print(f"PARSE_ERR {e}")
    sys.exit(1)

compiled = d.get('compiledAt') or d.get('compiled_at')
if not compiled:
    print("NOT_COMPILED")
    sys.exit(2)

incl = d.get('included_signals', [])
roster = d.get('roster', {})

# Cross-ref against our address
ours = [s for s in incl if s.get('btc_address') == "$OUR_ADDR"]

# Pull our local signal_ids for this date
conn = sqlite3.connect("$DB")
cur = conn.cursor()
cur.execute("SELECT signal_id, beat_slug, headline FROM aibtc_signals_filed WHERE DATE(filed_at)=?", ("$DATE",))
local_rows = cur.fetchall()
local_ids = {r[0] for r in local_rows}
beat_map = {r[0]: r[1] for r in local_rows}

# Mark our brief_included signals locally
included_local = set()
for s in ours:
    sid = s.get('signal_id')
    if sid in local_ids:
        cur.execute("UPDATE aibtc_signals_filed SET status='brief_included' WHERE signal_id=?", (sid,))
        included_local.add(sid)
conn.commit()

# Per-beat split for our included
by_beat = {}
for s in ours:
    b = s.get('beat_slug', '?')
    by_beat[b] = by_beat.get(b, 0) + 1

# Local filed-by-beat for context
local_by_beat = {}
for r in local_rows:
    local_by_beat[r[1]] = local_by_beat.get(r[1], 0) + 1

# Output structured summary
print(f"COMPILED|{compiled}")
print(f"BRIEF_TOTAL|{len(incl)}")
print(f"OURS_INCLUDED|{len(ours)}")
print(f"LOCAL_FILED|{len(local_rows)}")
print(f"BY_BEAT_INCLUDED|{json.dumps(by_beat)}")
print(f"BY_BEAT_FILED|{json.dumps(local_by_beat)}")
for s in ours:
    h = (s.get('headline') or '')[:90].replace('|','/')
    print(f"INCLUDED|{s.get('beat_slug','?')}|pos={s.get('position','?')}|{s.get('signal_id','')[:8]}|{h}")
PYEOF
)

EXIT_STATE="ok"
case "$RESULT" in
    PARSE_ERR*) EXIT_STATE="parse_err"; ;;
    NOT_COMPILED) EXIT_STATE="not_compiled"; ;;
esac

# Build Telegram message
if [ "$EXIT_STATE" = "ok" ]; then
    COMPILED=$(echo "$RESULT" | grep '^COMPILED|' | cut -d'|' -f2)
    BRIEF_TOTAL=$(echo "$RESULT" | grep '^BRIEF_TOTAL|' | cut -d'|' -f2)
    OURS=$(echo "$RESULT" | grep '^OURS_INCLUDED|' | cut -d'|' -f2)
    FILED=$(echo "$RESULT" | grep '^LOCAL_FILED|' | cut -d'|' -f2)
    BEATS_INCL=$(echo "$RESULT" | grep '^BY_BEAT_INCLUDED|' | cut -d'|' -f2)
    BEATS_FILED=$(echo "$RESULT" | grep '^BY_BEAT_FILED|' | cut -d'|' -f2)
    ENTRIES=$(echo "$RESULT" | grep '^INCLUDED|' | sed 's/^INCLUDED|/• [/; s/|/] pos=/; s/|/ /; s/|/  /')
    if [ -z "$ENTRIES" ]; then
        ENTRIES="(none — 0 of our $FILED filed signals made the brief)"
    fi
    # Apr 30 2026 (Ogie msg 5402): correspondent rate is 10K sats per
    # brief inclusion, NOT 175K. 175K is editor seat day-rate (different
    # role entirely). Old script multiplied by 175000 → silently 17.5×
    # over-stated revenue in every War Room brief-result post.
    SATS=$((OURS * 10000))
    USD=$(python3 -c "print(round($SATS * 0.00001 * 79, 2))" 2>/dev/null || echo "?")
    MSG="📊 BRIEF RESULTS — $DATE (compiled $COMPILED)

Brief total: $BRIEF_TOTAL/30 signals
Buzz filed: $FILED ($BEATS_FILED)
Buzz included: $OURS ($BEATS_INCL)
Sats earned: $SATS @ 10K/incl (~\$$USD at \$79K BTC)

Inclusions:
$ENTRIES"
elif [ "$EXIT_STATE" = "not_compiled" ]; then
    MSG="⏳ BRIEF NOT COMPILED YET — $DATE
URL: $BRIEF_URL
Expected ~05:03Z next morning. Will retry next 06:00Z run."
else
    MSG="❌ BRIEF CHECK FAILED — $DATE
$RESULT"
fi

# Post to War Room
if [ -f "$TG_ENV" ]; then
    . "$TG_ENV"
    curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
        --data-urlencode "chat_id=${TELEGRAM_CHAT_ID}" \
        --data-urlencode "text=${MSG}" >/dev/null 2>&1
fi

echo "[$(date -u)] aibtc-brief-check($DATE): state=$EXIT_STATE result=$(echo "$RESULT" | tr '\n' ' ' | head -c 300)" >> "$LOG"
echo "$RESULT"
