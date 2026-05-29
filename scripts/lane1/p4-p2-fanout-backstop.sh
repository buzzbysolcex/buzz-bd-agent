#!/usr/bin/env bash
# p4-p2-fanout-backstop.sh — cron backstop for the P4→P2 fanout leak.
#
# THE LEAK (4-Pillar Calibration Audit 2026-05-29): the PostToolUse Write hook
# is armed but does not reliably auto-fire, so gate/foreclosure files accrued
# with zero content drafts. This backstop is hook-independent: every */30 it
# scans hunts/ for gate/foreclosure/DEDUP files NOT yet in the fanout ledger
# and hands them — IN A SINGLE invocation — to the proven generator
# scripts/p4-to-p2-fanout.py, which writes drafts + emits exactly ONE batched
# War Room summary per cycle.
#
# WHY ONE INVOCATION (Ogie msg 7997 — flood fix): the generator already batches
# its WR notify across ALL hunt-files passed to a single call. The original
# backstop looped, calling the generator once-per-hunt, so each call emitted its
# own "batched" notify of 1 hunt → a flood. Passing the whole set in one call
# restores the single-summary contract.
#
# Content eligibility (FORECLOSE / NEGATE / DEDUP / KILL / UNKNOWN → NO drafts)
# is enforced inside the generator; the backstop only feeds it the un-processed
# set and lets it ledger every hunt (drafts for eligible, "(skipped)" for the
# rest, so nothing is reprocessed next cycle).
#
# USAGE:  p4-p2-fanout-backstop.sh [--no-notify]
#   --no-notify   passed through to the generator to suppress the WR summary
#                 (use on the initial backlog drain / backfills).
#
# Authority: Ogie msg 7976 + 7997 (2026-05-28/29). Cron: */30 * * * *.
set -uo pipefail
cd /home/claude-code/buzz-workspace || exit 2

NOTIFY_FLAG=""
[ "${1:-}" = "--no-notify" ] && NOTIFY_FLAG="--no-notify"

GENERATOR="scripts/p4-to-p2-fanout.py"
LEDGER="data/lane1/p4-p2-drafts/p4-p2-fanout-ledger.md"
LOGDIR="data/lane1-logs"
LOG="$LOGDIR/p4-p2-fanout-backstop.log"
mkdir -p "$LOGDIR"
ts() { date -u +'%Y-%m-%dT%H:%M:%SZ'; }

if [ ! -f "$GENERATOR" ]; then
    echo "[$(ts)] backstop: FATAL — generator $GENERATOR missing; aborting" >>"$LOG"
    exit 3
fi

# Collect un-ledgered candidate hunts (ledger stores the source filename as the
# last "| <filename>" field — the dedup guard against reprocessing).
new_files=()
while IFS= read -r f; do
    base="$(basename "$f")"
    if [ -f "$LEDGER" ] && grep -qF "| $base" "$LEDGER" 2>/dev/null; then
        continue
    fi
    new_files+=("$f")
done < <(find hunts -maxdepth 1 -type f \( -iname '*gate*.md' -o -iname '*foreclosure*.md' -o -iname '*DEDUP*.md' \) 2>/dev/null | sort)

n=${#new_files[@]}
if [ "$n" -eq 0 ]; then
    echo "[$(ts)] backstop: 0 new hunts (silent)" >>"$LOG"
    exit 0
fi

# ONE generator invocation across ALL new hunts → ONE batched WR summary.
echo "[$(ts)] backstop: feeding $n new hunt(s) to generator (notify_flag='${NOTIFY_FLAG:-none}')" >>"$LOG"
if [ -n "$NOTIFY_FLAG" ]; then
    python3 "$GENERATOR" "$NOTIFY_FLAG" "${new_files[@]}" >>"$LOG" 2>&1
else
    python3 "$GENERATOR" "${new_files[@]}" >>"$LOG" 2>&1
fi
echo "[$(ts)] backstop: generator exit=$? on $n hunt(s)" >>"$LOG"
exit 0
