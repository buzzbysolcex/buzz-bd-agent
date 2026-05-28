#!/usr/bin/env bash
# p4-to-p2-fanout.sh — PostToolUse Write hook
# Authority: Ogie msg 7896 (2026-05-27 23:56 UTC).
#
# Fires when Claude writes a Gate hunt or foreclosure-receipt file.
# Delegates to scripts/p4-to-p2-fanout.py for actual draft generation.
# Silent on missing-file / non-hunt-path (cron-safe).

set -eu

FILE_PATH="${CLAUDE_FILE_PATH:-}"
if [ -z "$FILE_PATH" ]; then
    exit 0
fi

# Only fire for hunts/*gate*.md, hunts/*foreclosure*.md, hunts/*DEDUP*.md
case "$FILE_PATH" in
    */hunts/*gate*.md|*/hunts/*Gate*.md|*/hunts/*foreclosure*.md|*/hunts/*DEDUP*.md) ;;
    *) exit 0 ;;
esac

cd "$(dirname "$0")/../.."
python3 scripts/p4-to-p2-fanout.py "$FILE_PATH" 2>/dev/null || true
