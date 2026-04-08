#!/bin/bash
# aibtc-phase2-watcher.sh — Beat editor Phase 2 issue watcher
#
# Polls aibtcdev/agent-news for new GitHub issues mentioning a beat
# editor Phase 2 audition. Pings War Room IMMEDIATELY when one opens
# for agent-economy or agent-skills (our pitch beats per Rising
# Leviathan's scout signal on 2026-04-07).
#
# State file dedup ensures each issue alerts once. Quantum already
# went to Frosty Narwhal — we monitor for the next opening.
#
# Schedule: every 17 minutes via host crontab.

set -euo pipefail

REPO="aibtcdev/agent-news"
STATE_FILE="/home/claude-code/.aibtc-phase2-seen.json"
LOG_FILE="/home/claude-code/aibtc-phase2-watcher.log"
TRIGGER="/home/claude-code/schedule-trigger.sh"
ENV_GH="/home/claude-code/.env.github"

if [ ! -f "$ENV_GH" ]; then
    echo "[$(date -u)] ERROR: $ENV_GH missing" >> "$LOG_FILE"
    exit 1
fi

# shellcheck disable=SC1090
source "$ENV_GH"

if [ -z "${GITHUB_PAT:-}" ]; then
    echo "[$(date -u)] ERROR: GITHUB_PAT empty" >> "$LOG_FILE"
    exit 1
fi

# Initialize state file if missing
if [ ! -f "$STATE_FILE" ]; then
    echo '{"seen":[]}' > "$STATE_FILE"
fi

# Pull open issues with phase-2 / beat editor / audition keywords
ISSUES_JSON="$(curl -s -H "Authorization: Bearer $GITHUB_PAT" \
    -H "Accept: application/vnd.github+json" \
    "https://api.github.com/repos/${REPO}/issues?state=open&per_page=50" 2>/dev/null || echo '[]')"

if [ -z "$ISSUES_JSON" ] || [ "$ISSUES_JSON" = "[]" ]; then
    echo "[$(date -u)] no issues / api unavailable" >> "$LOG_FILE"
    exit 0
fi

PARSER_SCRIPT="$(mktemp /tmp/aibtc-phase2-parser.XXXXXX.py)"
trap 'rm -f "$PARSER_SCRIPT"' EXIT
cat > "$PARSER_SCRIPT" << 'PY'
import json, sys, re

issues = json.loads(sys.stdin.read())
state_path = sys.argv[1]

with open(state_path) as f:
    state = json.load(f)
seen = set(state.get("seen", []))

# Phase 2 / beat editor / audition keywords (case-insensitive)
PHASE_PAT = re.compile(r"phase\s*2|beat\s*editor|audition", re.I)
# Our pitch beats — Rising Leviathan signal
PITCH_BEATS = ["agent-economy", "agent-skills", "agent economy", "agent skills"]

new_alerts = []
for iss in issues:
    if not isinstance(iss, dict):
        continue
    if iss.get("pull_request"):
        continue  # skip PRs
    num = iss.get("number")
    if num is None or str(num) in seen:
        continue
    title = iss.get("title", "") or ""
    body = (iss.get("body", "") or "")[:2000]
    blob = (title + " " + body).lower()
    if not PHASE_PAT.search(blob):
        continue
    # Match if any pitch beat appears
    matched_beat = next((b for b in PITCH_BEATS if b in blob), None)
    priority = "HIGH" if matched_beat else "WATCH"
    new_alerts.append({
        "number": num,
        "title": title,
        "url": iss.get("html_url"),
        "priority": priority,
        "matched_beat": matched_beat,
    })
    seen.add(str(num))

# Persist updated seen set
state["seen"] = sorted(seen)
with open(state_path, "w") as f:
    json.dump(state, f)

print(json.dumps(new_alerts))
PY

ALERTS="$(printf '%s' "$ISSUES_JSON" | python3 "$PARSER_SCRIPT" "$STATE_FILE")"

# Parse and dispatch
COUNT="$(printf '%s' "$ALERTS" | python3 -c 'import sys,json; print(len(json.loads(sys.stdin.read())))')"

if [ "$COUNT" = "0" ]; then
    echo "[$(date -u)] no new phase-2 issues" >> "$LOG_FILE"
    exit 0
fi

echo "[$(date -u)] $COUNT new phase-2 issue(s)" >> "$LOG_FILE"

# Build alert message and fire
FORMATTER_SCRIPT="$(mktemp /tmp/aibtc-phase2-formatter.XXXXXX.py)"
trap 'rm -f "$PARSER_SCRIPT" "$FORMATTER_SCRIPT"' EXIT
cat > "$FORMATTER_SCRIPT" << 'PY'
import sys, json
alerts = json.loads(sys.stdin.read())
high = [a for a in alerts if a['priority'] == 'HIGH']
watch = [a for a in alerts if a['priority'] == 'WATCH']
parts = []
if high:
    parts.append('🚨 PHASE 2 OPENING — PITCH BEAT MATCH:')
    for a in high:
        parts.append(f"#{a['number']} [{a['matched_beat']}] {a['title']} {a['url']}")
if watch:
    parts.append('Phase 2 (other beats):')
    for a in watch:
        parts.append(f"#{a['number']} {a['title']} {a['url']}")
print(' | '.join(parts))
PY

MSG="$(printf '%s' "$ALERTS" | python3 "$FORMATTER_SCRIPT")"

if [ -n "$MSG" ] && [ -x "$TRIGGER" ]; then
    "$TRIGGER" "Buzz: AIBTC PHASE 2 WATCHER — $MSG. Per Ogie directive 2026-04-07: if a pitch beat (agent-economy or agent-skills) opens, AUDITION IMMEDIATELY with domain-specific depth. Otherwise track for context."
    echo "[$(date -u)] alerted: $MSG" >> "$LOG_FILE"
fi
