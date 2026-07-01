#!/bin/bash
# stall-watchdog.sh — INDEPENDENT stall monitor (runs from cron, NOT the session).
#
# This is the process that was missing during the 3.5-day silence: something
# OUTSIDE the loop that notices "a task is open but nothing is beating" and pages
# the War Room. It cannot itself be taken down by a stalled session because cron
# (crond) spawns it fresh each tick.
#
# Wiring (user crontab, matches the existing memory-watchdog pattern):
#   */10 * * * * /home/claude-code/buzz-workspace/scripts/infra/stall-watchdog.sh
#
# A ready-to-enable systemd timer equivalent lives in scripts/infra/systemd/
# (use it once passwordless sudo is available; cron is the no-sudo default).
#
# Env overrides (defaults chosen in stall-check.py):
#   STALL_THRESHOLD_SEC (45m) · RE_ALERT_SEC (60m) · PARK_GRACE_SEC (45m)
#   WARROOM_DRY_RUN=1  -> evaluate + log, do NOT page (used by the self-test)
set -uo pipefail

DIR="/home/claude-code/buzz-workspace/scripts/infra"
LOG="/home/claude-code/buzz-workspace/data/infra-logs/stall-watchdog.log"
mkdir -p "$(dirname "$LOG")" 2>/dev/null || true

TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
OUT="$(python3 "$DIR/stall-check.py" 2>>"$LOG")"
RC=$?

case "$RC" in
  0)
    echo "$TS OK :: ${OUT%%$'\n'*}" >> "$LOG"
    ;;
  10)
    echo "$TS STALL-ALERT firing:" >> "$LOG"
    echo "$OUT" >> "$LOG"
    if [ "${WARROOM_DRY_RUN:-0}" = "1" ]; then
      WARROOM_DRY_RUN=1 "$DIR/warroom-send.sh" "$OUT" >> "$LOG" 2>&1
    else
      "$DIR/warroom-send.sh" "$OUT" >> "$LOG" 2>&1 \
        && echo "$TS alert sent" >> "$LOG" \
        || echo "$TS ALERT SEND FAILED (see above)" >> "$LOG"
    fi
    ;;
  12)
    echo "$TS STALL-suppressed (re-alert window not elapsed)" >> "$LOG"
    ;;
  *)
    echo "$TS stall-check ERROR rc=$RC" >> "$LOG"
    ;;
esac
exit 0
