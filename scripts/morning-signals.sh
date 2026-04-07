#!/bin/bash
# morning-signals.sh — Apr 8, 2026 one-shot signal filing fires.
#
# Wired into host crontab (not the container) to survive any
# Claude session drop or container restart between Apr 7 evening
# and Apr 8 morning UTC.
#
# Posts a directive to War Room via schedule-trigger.sh, which
# Buzz (Claude in tmux) sees and acts on.
#
# Date-gated: only fires on 2026-04-08 UTC. The cron entries
# can stay in the crontab indefinitely as no-ops after that.
#
# Usage: morning-signals.sh <1|2|3|4>

set -euo pipefail

SIGNAL_NUM="${1:-}"
TARGET_DATE="2026-04-08"
TODAY="$(date -u +%Y-%m-%d)"
TRIGGER="/home/claude-code/schedule-trigger.sh"

if [ "$TODAY" != "$TARGET_DATE" ]; then
    # Silent no-op on any date other than the target.
    exit 0
fi

if [ -z "$SIGNAL_NUM" ]; then
    echo "Usage: $0 <1|2|3|4>" >&2
    exit 1
fi

if [ ! -x "$TRIGGER" ]; then
    echo "ERROR: $TRIGGER not found or not executable" >&2
    exit 1
fi

case "$SIGNAL_NUM" in
    1)
        PROMPT='Buzz: FILE SIGNAL #1 — agent-economy — Editor Audition Economics. Headline: "175K Sats/Day Editor Seat: Break-Even Math at Current sBTC Price and Operating Cost Thresholds". Pre-flight: (1) wallet unlock check, (2) duplicate scan against last 30 agent-economy signals for 175K/editor/audition/break-even — ABORT if dup, (3) verify sBTC/USD price live (DexScreener or tenero), (4) verify Prime Spoke audition signal exists, (5) compute 175K × 30 = 5.25M sats/mo in USD minus operating cost, state min throughput to net-positive. Body 350-700 chars, no brackets, no placeholders. File via mcp__aibtc__news_file_signal with 180s timeout. Report ✅/❌ to War Room.'
        ;;
    2)
        PROMPT='Buzz: FILE SIGNAL #2 — agent-economy — Null Txid Postmortem. Headline: "270K Sats Stuck at 16:15 UTC: Cross-Ref of Issues #404/#405 With x402 Dispatch Commit #320 Points to Bounded-Queue Race". Pre-flight: (1) wallet unlock, (2) dup scan last 30 agent-economy signals for null txid/270K/#404/#405/Commit #320 — ABORT if dup, (3) verify GitHub Issues #404 and #405 exist (use /home/claude-code/.env.github PAT), (4) verify Commit #320 + tx-schemas v1.27.4 release notes, (5) correlate timestamps and propose ONE reproducible test case. Body 350-700 chars, real source links. If sources cannot be verified, ABORT — do not file with placeholders. File via mcp__aibtc__news_file_signal with 180s timeout. Report ✅/❌ to War Room.'
        ;;
    3)
        PROMPT='Buzz: FILE SIGNAL #3 — agent-skills — BFF Competition Velocity. Headline: "BFF Skills Competition Days 9–11: Three HODLMM-Family Merges in 48h — Velocity and Test Coverage Ranked". Pre-flight: (1) wallet unlock, (2) dup scan last 30 agent-skills signals for BFF/HODLMM/velocity — ABORT if dup, (3) GitHub API fetch (PAT in /home/claude-code/.env.github) for PR #163 hodlmm-range-keeper in BitflowFinance/bff-skills + Day 11 tx-schemas PR + today HODLMM PR — pull additions, deletions, files_changed, commits count, created_at→merged_at, (4) rank by velocity-vs-rigor, (5) one-sentence prediction of which ships first. Body 350-700 chars, real PR numbers, real LOC. If any PR cannot be verified, ABORT — do not fabricate. File via mcp__aibtc__news_file_signal with 180s timeout. Report ✅/❌ to War Room.'
        ;;
    4)
        PROMPT='Buzz: FILE SIGNAL #4 — agent-skills — News-Editor Rubric Stress Test. Headline: "aibtc-news-editor 4-Question Rubric Replayed Against 100 Recent Published Signals: Rejection Rate and Calibration Gaps". Pre-flight: (1) wallet unlock, (2) dup scan last 30 agent-skills signals for news-editor/rubric/4-question/Issue #306 — ABORT if dup, (3) verify Issue #306 exists in aibtcdev/skills (or wherever Opal Gorilla filed) and pull the 4 questions verbatim, (4) pull last 100 published signals via news_front_page, (5) replay each of the 4 questions against the 100 — count failures per question, identify strictest filter, note miscalibration. Body 350-700 chars, real percentages, real question text. If Issue #306 cannot be verified, ABORT — do not invent question text. File via mcp__aibtc__news_file_signal with 180s timeout. Report ✅/❌ to War Room. Then report end-of-batch summary: how many of 4 succeeded, rank delta vs yesterday, sBTC earnings delta.'
        ;;
    *)
        echo "ERROR: signal number must be 1, 2, 3, or 4 (got: $SIGNAL_NUM)" >&2
        exit 1
        ;;
esac

"$TRIGGER" "$PROMPT"
