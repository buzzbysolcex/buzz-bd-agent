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
# ── SLOT MIX (per Ogie msg 4844 — Apr 25 2026 inclusion-timing pivot) ──
# Brief inclusions cluster sharply by beat (subagent recon):
#   bitcoin-macro: 05-10 UTC
#   quantum:       00-05 UTC
#   aibtc-network: 00-02 UTC (Elegant Orb dark — omitted)
# We were filing 06-10 UTC across all beats. Quantum slots missed every
# window. New mix front-loads quantum, then bitcoin-macro:
#
#   Slot 1 (00:02 UTC): quantum        — quantum window opens
#   Slot 2 (01:04 UTC): quantum        — second quantum
#   Slot 3 (04:02 UTC): bitcoin-macro  — BM window opens
#   Slot 4 (05:04 UTC): bitcoin-macro  — second BM
#   Slot 5 (06:06 UTC): bitcoin-macro OR correction (BM/quantum only)
#
# If slot 4/5 has no fresh BM/quantum draft, falls back to a same-day
# correction draft (filename pattern ${TODAY}-correction-*.json). Per
# msg 4620: correction drafts targeting aibtc-network are SKIPPED
# (Elegant Orb dark — corrections on that beat rot unapproved). Revert
# to 2BM+2Q+1AN when Elegant Orb active (monitor via /api/signals?beat=
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
        # Skip drafts already marked filed=true OR targeting aibtc-network
        # (Elegant Orb dark per msg 4620 — BM/quantum corrections only)
        if python3 -c "
import json, sys
d = json.load(open(sys.argv[1]))
if d.get('filed'):
    sys.exit(1)
beat = (d.get('beat') or d.get('beatSlug') or '').lower()
if beat == 'aibtc-network':
    sys.exit(2)
sys.exit(0)
" "$cand" 2>/dev/null; then
            DRAFT_FILE="$cand"
            log "correction_fallback_draft=$DRAFT_FILE"
            break
        else
            rc=$?
            [ "$rc" = "2" ] && log "skip_aibtc-network_correction=$cand (msg 4620)"
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
