#!/usr/bin/env bash
# hunt-auto-index.sh — PostToolUse Write hook
# Auto-invokes hunt-complete.sh when a Gate hunt file is written.
#
# Filename pattern: hunts/YYYY-MM-DD-<target>-gate<N>.md
# Invocation: triggered by PostToolUse Write hook with $CLAUDE_FILE_PATH set.
#
# Verdict detection from file content (in order of precedence):
#   - "clean-sweep" / "clean sweep" → clean-sweep
#   - "finding confirmed" / "finding-confirmed" / "submission ready" → finding-confirmed
#   - "candidates-found" / "candidates found" / "KILL" / "verified" → candidates-found
#   - default fallback → candidates-found
#
# Idempotent: skips if INDEX.md already has entry for this hunt path.
#
# Authority: Master Ops 2026-05-20 (Hook 2 auto-fix per operator msg 7417).

set -eu

# Bail silently if no file path passed
FILE_PATH="${CLAUDE_FILE_PATH:-}"
if [ -z "$FILE_PATH" ]; then
    exit 0
fi

# Only fire for hunts/*gate*.md files
case "$FILE_PATH" in
    */hunts/*gate*.md|*/hunts/*Gate*.md) ;;
    *) exit 0 ;;
esac

# Parse filename: hunts/YYYY-MM-DD-<target>-gate<N>.md
FILENAME=$(basename "$FILE_PATH")
# Extract date (first 10 chars: YYYY-MM-DD)
if ! echo "$FILENAME" | grep -qE '^[0-9]{4}-[0-9]{2}-[0-9]{2}-.+-gate[0-9]\.md$'; then
    # Doesn't match expected pattern; bail silently
    exit 0
fi

# Extract target (everything between date and -gate<N>)
TARGET=$(echo "$FILENAME" | sed -E 's/^[0-9]{4}-[0-9]{2}-[0-9]{2}-(.+)-gate[0-9]\.md$/\1/')
GATE=$(echo "$FILENAME" | sed -E 's/^.+-gate([0-9])\.md$/\1/')

# Check INDEX.md for existing entry (idempotency)
INDEX=/home/claude-code/buzz-workspace/hunts/INDEX.md
if [ -f "$INDEX" ]; then
    # Match on artifact path to dedupe
    if grep -qF "$FILENAME" "$INDEX" 2>/dev/null; then
        # Already indexed — bail silently
        exit 0
    fi
fi

# Detect verdict from file content (first 100 lines)
VERDICT="candidates-found"  # default
CONTENT=$(head -100 "$FILE_PATH" 2>/dev/null || echo "")

# Order matters: most-specific first
if echo "$CONTENT" | grep -qiE 'finding[- ]confirmed|submission[- ]ready|ready to submit' ; then
    VERDICT="finding-confirmed"
elif echo "$CONTENT" | grep -qiE 'clean[- ]sweep|no submit|defensively tight|all defensively' ; then
    VERDICT="clean-sweep"
elif echo "$CONTENT" | grep -qiE 'candidates[- ]found|kill verdict|verified|gate.{0,5}complete' ; then
    VERDICT="candidates-found"
fi

# Compute relative artifact path from workspace root
ARTIFACT_REL=$(echo "$FILE_PATH" | sed 's|^/home/claude-code/buzz-workspace/||')

# Invoke hunt-complete.sh
HUNT_COMPLETE=/home/claude-code/buzz-workspace/.claude/hooks/hunt-complete.sh
if [ -x "$HUNT_COMPLETE" ]; then
    "$HUNT_COMPLETE" "$TARGET" "$GATE" "$VERDICT" "$ARTIFACT_REL" >&2 2>&1 || true
fi

exit 0
