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
STATE_DIR="/home/claude-code/buzz-workspace/state"
LOG="/home/claude-code/buzz-workspace/data/infra-logs/stall-watchdog.log"
ALERT_STATE="$STATE_DIR/stall-alert.state"
SEND_FAILED="$STATE_DIR/stall-alert-send-failed"
mkdir -p "$(dirname "$LOG")" "$STATE_DIR" 2>/dev/null || true

TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
OUT="$(python3 "$DIR/stall-check.py" 2>>"$LOG")"
RC=$?

case "$RC" in
  0)
    echo "$TS OK :: ${OUT%%$'\n'*}" >> "$LOG"
    rm -f "$SEND_FAILED" 2>/dev/null || true
    ;;
  10)
    echo "$TS STALL-ALERT firing:" >> "$LOG"
    echo "$OUT" >> "$LOG"
    if [ "${WARROOM_DRY_RUN:-0}" = "1" ]; then
      WARROOM_DRY_RUN=1 "$DIR/warroom-send.sh" "$OUT" >> "$LOG" 2>&1
    else
      if "$DIR/warroom-send.sh" "$OUT" >> "$LOG" 2>&1; then
        echo "$TS alert sent" >> "$LOG"
        rm -f "$SEND_FAILED" 2>/dev/null || true
      else
        # Delivery failed. stall-check already recorded the de-dup state, which
        # would suppress retries for RE_ALERT_SEC. Clear it so the NEXT 10-min
        # tick re-attempts delivery instead of going silent. Drop a marker a
        # secondary monitor can poll.
        echo "$TS ALERT SEND FAILED — clearing de-dup so next tick retries" >> "$LOG"
        rm -f "$ALERT_STATE" 2>/dev/null || true
        echo "{\"ts\":\"$TS\",\"reason\":\"warroom-send failed on a real stall\"}" > "$SEND_FAILED" 2>/dev/null || true
      fi
    fi
    ;;
  12)
    echo "$TS STALL-suppressed (re-alert window not elapsed)" >> "$LOG"
    ;;
  *)
    # The watchdog itself is broken (stall-check crashed, rc=$RC). Do NOT swallow
    # it — a silently-dead watchdog is exactly the failure this system exists to
    # prevent. Page the War Room about the watchdog's own health.
    echo "$TS stall-check SELF-ERROR rc=$RC — escalating" >> "$LOG"
    if [ "${WARROOM_DRY_RUN:-0}" != "1" ]; then
      "$DIR/warroom-send.sh" "⚠️ STALL WATCHDOG SELF-ERROR (rc=$RC) at $TS — the stall monitor crashed; stalls may go undetected until fixed. See data/infra-logs/stall-watchdog.log" >> "$LOG" 2>&1 || true
    fi
    ;;
esac
exit 0
