#!/bin/bash
# run-schedule-daemon.sh — respawn wrapper for schedule-daemon.js
#
# Installed via @reboot cron until the systemd unit (buzz-schedule-daemon.service)
# is registered with sudo. Replicates `Restart=always RestartSec=10`:
#   - launches the daemon
#   - if it exits, sleeps 10s and relaunches
#   - on SIGTERM/SIGINT, exits cleanly so cron / kill stops it
#
# Single-instance guard: if another wrapper is already running, this one exits.
#
# Logs to logs/schedule-daemon-wrapper.log (separate from daemon's own log).

set -u
WORKSPACE="/home/claude-code/buzz-workspace"
DAEMON="$WORKSPACE/scripts/schedule-daemon.js"
NODE_BIN="/usr/local/bin/node"
NODE_PATH="$WORKSPACE/api/node_modules"
LOG="$WORKSPACE/logs/schedule-daemon-wrapper.log"
PIDFILE="$WORKSPACE/logs/schedule-daemon-wrapper.pid"

mkdir -p "$WORKSPACE/logs"

log() {
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*" >>"$LOG"
}

# single-instance guard
if [ -f "$PIDFILE" ]; then
  EXISTING_PID="$(cat "$PIDFILE" 2>/dev/null)"
  if [ -n "$EXISTING_PID" ] && kill -0 "$EXISTING_PID" 2>/dev/null; then
    log "wrapper already running pid=$EXISTING_PID — exiting"
    exit 0
  fi
fi
echo $$ > "$PIDFILE"

cleanup() {
  log "wrapper exit (signal=$1)"
  rm -f "$PIDFILE"
  if [ -n "${DAEMON_PID:-}" ]; then
    kill -TERM "$DAEMON_PID" 2>/dev/null || true
  fi
  exit 0
}
trap 'cleanup TERM' TERM
trap 'cleanup INT' INT

log "wrapper start pid=$$"

while true; do
  NODE_PATH="$NODE_PATH" "$NODE_BIN" "$DAEMON" &
  DAEMON_PID=$!
  log "daemon launched pid=$DAEMON_PID"
  wait "$DAEMON_PID"
  RC=$?
  log "daemon exited rc=$RC, sleeping 10s before respawn"
  sleep 10
done
