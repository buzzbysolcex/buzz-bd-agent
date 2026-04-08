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
# Usage: morning-signals-v2.sh <1|2|3|4>

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
    echo "Usage: $0 <1|2|3|4>" >&2
    exit 1
fi

case "$SIGNAL_NUM" in
    1|2|3|4) ;;
    *)
        echo "ERROR: signal number must be 1-4 (got: $SIGNAL_NUM)" >&2
        exit 1
        ;;
esac

log "wake"

# find the matching draft for today
DRAFT_FILE="$(ls "$DRAFT_DIR"/${TODAY}-*-${SIGNAL_NUM}.json 2>/dev/null | head -n1)"

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
