#!/bin/bash
# elegant-orb-monitor.sh — daily poll for aibtc-network editor (Elegant Orb)
# approval resumption. While Elegant Orb is DARK per #629 DRI review, we
# run a 3 BM + 2 quantum + 0 aibtc-network mix (Apr 23 2026 pivot, msg 4558).
# When approvals resume, alert War Room to rebalance to 2 BM + 2 Q + 1 AN.
#
# Install: cron `30 7 * * * /home/claude-code/buzz-workspace/scripts/elegant-orb-monitor.sh`
# Alert is one-shot: re-sends only if another approved signal lands or day
# flips — state file /data/buzz/persistent/reports/elegant-orb-state.txt
# tracks last notified signal id.

set -uo pipefail

STATE=/data/buzz/persistent/reports/elegant-orb-state.txt
LOG=/data/buzz/persistent/reports/elegant-orb-monitor.log
mkdir -p "$(dirname "$STATE")" 2>/dev/null || true
touch "$STATE"

log() {
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] elegant-orb-monitor: $*" >> "$LOG"
}

log "wake"

RESP=$(curl -sS --max-time 15 "https://aibtc.news/api/signals?beat=aibtc-network&status=approved&limit=10" 2>/dev/null || echo '{"signals":[]}')

# Only count approvals in the last 24h — historical approvals (Elegant Orb's
# last good stretch) don't indicate he's back. Cutoff resets on wake.
CUTOFF=$(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%SZ)
FRESH_JSON=$(CUTOFF="$CUTOFF" python3 -c "
import json, os, sys
d = json.loads(sys.argv[1])
cutoff = os.environ.get('CUTOFF','')
fresh = [s for s in d.get('signals',[]) if (s.get('timestamp','') or '') >= cutoff]
print(json.dumps({'signals': fresh}))" "$RESP" 2>/dev/null || echo '{"signals":[]}')

COUNT=$(python3 -c "import json,sys; d=json.loads(sys.argv[1]); print(len(d.get('signals',[])))" "$FRESH_JSON" 2>/dev/null || echo 0)

if [ "$COUNT" -eq 0 ]; then
    log "no approved aibtc-network signals in last 24h (cutoff=$CUTOFF) — Elegant Orb still dark"
    exit 0
fi

# Get latest approved signal id (within 24h window)
LATEST_ID=$(python3 -c "import json,sys; d=json.loads(sys.argv[1]); sigs=d.get('signals',[]); print(sigs[0].get('id','') if sigs else '')" "$FRESH_JSON" 2>/dev/null || echo '')
LATEST_HEADLINE=$(python3 -c "import json,sys; d=json.loads(sys.argv[1]); sigs=d.get('signals',[]); print((sigs[0].get('headline','') if sigs else '')[:100])" "$FRESH_JSON" 2>/dev/null || echo '')
LATEST_AUTHOR=$(python3 -c "import json,sys; d=json.loads(sys.argv[1]); sigs=d.get('signals',[]); print(sigs[0].get('displayName','') if sigs else '')" "$FRESH_JSON" 2>/dev/null || echo '')

PREV_ID=$(cat "$STATE" 2>/dev/null | head -1)

if [ "$LATEST_ID" = "$PREV_ID" ]; then
    log "already alerted for latest approved id=$LATEST_ID — skip"
    exit 0
fi

log "ALERT: $COUNT approved aibtc-network signals, latest=$LATEST_ID ($LATEST_AUTHOR)"
echo "$LATEST_ID" > "$STATE"

# Post War Room alert
if [ -f /home/claude-code/.claude/channels/telegram/.env ]; then
    . /home/claude-code/.claude/channels/telegram/.env
    MSG="🟢 ELEGANT ORB APPROVAL DETECTED — aibtc-network resuming

$COUNT recent approved aibtc-network signal(s). Latest:
• $LATEST_AUTHOR: $LATEST_HEADLINE

Rebalance trigger: consider 2 BM + 2 quantum + 1 aibtc-network mix (from current 3/2/0 per msg 4558).

Verify: curl -sf \"https://aibtc.news/api/signals?beat=aibtc-network&status=approved&limit=5\"
To rebalance: edit SLOT_BEATS in api/services/autodream/autodream.js."
    curl -sS --max-time 10 "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
      -d chat_id="-1003701758077" \
      --data-urlencode "text=$MSG" > /dev/null 2>&1 || log "war-room post failed"
fi

log "done alert sent latest_id=$LATEST_ID"
