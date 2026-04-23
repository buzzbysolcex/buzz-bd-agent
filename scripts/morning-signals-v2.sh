#!/bin/bash
# morning-signals-v2.sh — D1 of Apr 8, 2026 directive package.
#
# Direct signal filing path that bypasses the Claude Code idle
# dependency. Replaces the old morning-signals.sh chain
# (cron → Telegram → Claude Code) with:
#
#   cron → this script → signal-file-direct.js → BIP-322 → AIBTC API
#
# Reads pre-drafted signals from /data/buzz-api/signal-drafts/ written
# nightly at 02:00 UTC by autoDream Phase 6
# (api/services/autodream/autodream.js generateSignalAngles).
#
# Falls back to the old morning-signals.sh path (which posts to
# War Room for Claude Code to pick up) if the direct path fails for
# ANY reason. Old script remains as fallback only.
#
# Fires daily — duplicate + cooldown checks inside signal-preflight.js
# prevent misfires.
#
# ── SLOT MIX (per Ogie msg 4558 — Apr 23 2026 beat pivot) ──────
# Cron fires 5 slots per UTC-day (cap is 6/UTC-day, 1 reserved for
# intraday correction filing):
#
#   Slot 1 (06:02 UTC): bitcoin-macro  — beat BM cap (fills fast)
#   Slot 2 (07:03 UTC): bitcoin-macro  — second BM before 09:55 cap
#   Slot 3 (08:02 UTC): quantum        — Zen Rocket editor, lots of room
#   Slot 4 (09:03 UTC): bitcoin-macro OR correction
#   Slot 5 (10:03 UTC): quantum OR correction
#
# If slot 4/5 has no fresh BM/quantum draft, falls back to a same-day
# correction draft (filename pattern ${TODAY}-correction-*.json). Active
# until Elegant Orb (aibtc-network editor) resumes approvals; revert to
# 2BM+2Q+1AN when Elegant Orb active (monitor via /api/signals?beat=
# aibtc-network&status=approved).
#
# Usage: morning-signals-v2.sh <1|2|3|4|5>

set -uo pipefail

SIGNAL_NUM="${1:-}"
# Host paths — container's /data/buzz-api maps to host
# /data/buzz/persistent/buzz-api (verified via docker mount inspect).
LOG=/data/buzz/persistent/buzz-api/signal-filing.log
DRAFT_DIR=/data/buzz/persistent/buzz-api/signal-drafts
TODAY="$(date -u +%Y-%m-%d)"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DIRECT="$SCRIPT_DIR/signal-file-direct.js"
FALLBACK="$SCRIPT_DIR/morning-signals.sh"

mkdir -p "$(dirname "$LOG")" 2>/dev/null || true

log() {
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] morning-signals-v2[$SIGNAL_NUM]: $*" >> "$LOG"
}

if [ -z "$SIGNAL_NUM" ]; then
    echo "Usage: $0 <1|2|3|4|5>" >&2
    exit 1
fi

case "$SIGNAL_NUM" in
    1|2|3|4|5) ;;
    *)
        echo "ERROR: signal number must be 1-5 (got: $SIGNAL_NUM)" >&2
        exit 1
        ;;
esac

log "wake"

# find the matching draft for today
DRAFT_FILE="$(ls "$DRAFT_DIR"/${TODAY}-*-${SIGNAL_NUM}.json 2>/dev/null | head -n1)"

# Slots 4+5 correction fallback (per beat pivot msg 4558): if no fresh
# slot draft exists, look for any same-day correction draft that hasn't
# been filed yet. Signal-preflight.js dedup prevents double-filing.
if [ -z "$DRAFT_FILE" ] && [ "$SIGNAL_NUM" -ge 4 ]; then
    for cand in "$DRAFT_DIR"/${TODAY}-correction-*.json; do
        [ -f "$cand" ] || continue
        # Skip drafts already marked filed=true
        if python3 -c "import json,sys; d=json.load(open(sys.argv[1])); sys.exit(0 if not d.get('filed') else 1)" "$cand" 2>/dev/null; then
            DRAFT_FILE="$cand"
            log "correction_fallback_draft=$DRAFT_FILE"
            break
        fi
    done
fi

if [ -z "$DRAFT_FILE" ] || [ ! -f "$DRAFT_FILE" ]; then
    log "no_draft_found pattern=${DRAFT_DIR}/${TODAY}-*-${SIGNAL_NUM}.json"
    if [ -x "$FALLBACK" ]; then
        log "falling_back_to_legacy_script"
        "$FALLBACK" "$SIGNAL_NUM" || log "fallback_exit=$?"
    else
        log "no_fallback_available"
    fi
    exit 0
fi

log "draft_found=$DRAFT_FILE"

# attempt direct file
node "$DIRECT" "$DRAFT_FILE"
RC=$?

if [ "$RC" -eq 0 ]; then
    log "direct_file_ok rc=0"
    exit 0
fi

log "direct_file_failed rc=$RC — falling back"

if [ -x "$FALLBACK" ]; then
    "$FALLBACK" "$SIGNAL_NUM" || log "fallback_exit=$?"
else
    log "no_fallback_available"
fi

exit 0
