#!/bin/bash
# heartbeat.sh — writes a liveness beat for the main Claude Code loop.
#
# Invoked by Claude Code hooks:
#   * Stop         (fires once per turn  = one loop-tick)
#   * PostToolUse  (fires on every tool  = dense liveness)
# Either firing bumps the timestamp. When the session STALLS (turn ends and is
# never re-invoked, e.g. the 3.5-day STEP-0 silence), no hook fires, the beat
# goes stale, and stall-watchdog.sh (independent cron process) raises the alarm.
#
# The beat carries {ts, pid, source, event}. current_task_id / phase live in
# task-dag.json (written by task-dag.sh); the watchdog joins the two. Keeping the
# task pointer OUT of the hook means a stalled task's id survives even when no
# tool has run — exactly the failure we are hardening against.
#
# MUST be fast and MUST NEVER fail a tool call: always exit 0.
STATE_DIR="/home/claude-code/buzz-workspace/state"
HB="${STATE_DIR}/heartbeat.json"
mkdir -p "$STATE_DIR" 2>/dev/null || true

TS="$(date -u +%s)"
ISO="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
SRC="${HB_SOURCE:-hook}"          # hooks pass HB_SOURCE=stop / posttooluse
EVT="${1:-tick}"
# Best-effort PID of the live claude session (informational only).
PID="$(pgrep -f 'claude' 2>/dev/null | head -1)"

printf '{"ts":%s,"iso":"%s","pid":"%s","source":"%s","event":"%s"}\n' \
  "$TS" "$ISO" "${PID:-unknown}" "$SRC" "$EVT" > "$HB" 2>/dev/null || true

exit 0
