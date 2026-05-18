#!/bin/bash
# send-weekly-bd-report-w13.sh — Send Week 13 BD report to Telegram
# Usage: bash scripts/send-weekly-bd-report-w13.sh
# Run ON the server (root@204.168.137.253)
# Requires: TELEGRAM_BOT_TOKEN env var (or loads from cron-bot.env)

set -euo pipefail

CHAT_ID="950395553"
TG_ENV="/home/claude-code/.claude/channels/telegram/cron-bot.env"

if [[ -z "${TELEGRAM_BOT_TOKEN:-}" ]]; then
  if [[ -f "$TG_ENV" ]]; then
    source "$TG_ENV"
  else
    TELEGRAM_BOT_TOKEN="$(docker exec buzz-production printenv TELEGRAM_BOT_TOKEN 2>/dev/null || true)"
  fi
fi

if [[ -z "${TELEGRAM_BOT_TOKEN:-}" ]]; then
  echo "ERROR: TELEGRAM_BOT_TOKEN not found"
  exit 1
fi

# Attempt to pull live stats from API
LIVE_TOTAL=""
LIVE_PROSPECT=""
if command -v docker &>/dev/null; then
  LIVE_STATS="$(docker exec buzz-production curl -s http://127.0.0.1:3000/api/v1/pipeline/stats 2>/dev/null || true)"
  if echo "$LIVE_STATS" | jq -e '.total' &>/dev/null; then
    LIVE_TOTAL="$(echo "$LIVE_STATS" | jq -r '.total')"
    LIVE_PROSPECT="$(echo "$LIVE_STATS" | jq -r '.by_stage.prospect.count // 0')"
  fi
fi

TOTAL="${LIVE_TOTAL:-1,044+}"
PROSPECTS="${LIVE_PROSPECT:-5}"

MSG1=$(cat <<EOFMSG
BUZZ WEEKLY BD REPORT
Week 13 | May 18, 2026 | buzzbd.ai

PIPELINE FUNNEL (${TOTAL} tokens scored)

scored: ${TOTAL} (11-rule engine + on-chain)
prospect: ${PROSPECTS} (dual-gate passed)
contacted: 2 (awaiting reply — DEAD)
negotiating: 0
approved: 0
listed: 0

TOP 5 PROSPECTS

1. BALLWARS (SOL) — 95* / ~65 cal — stalled 44d
2. BANANAS31 (BSC) — 95* / 55 cal — contacted 3/23, DEAD
3. Max (SOL) — 95* / ~65 cal — stalled 44d
4. TRUMP (SOL) — 95* / 56 cal — stalled 44d
5. VELO (BSC) — 95* / 60 cal — stalled 44d

*Pre-calibration pipeline scores. Calibration audit OVERDUE.

SIMULATIONS

Nasdog (MiroFish 10K): 4-wave BULLISH (belief 0.62->0.77)
All 5 prospects: ZERO simulations run
MicroBuzz v2 (500-agent): available but unused
EOFMSG
)

MSG2=$(cat <<'EOFMSG'
PIPELINE VELOCITY: ZERO (4th consecutive week)

- No stage movements
- No new outreach sent
- No breakup emails sent
- No simulations run on prospects
- Key builds: BuzzShield V6, Bug Bounty Genius Plan

STALLED TOKENS

BALLWARS/Max/TRUMP/VELO — 44+ days, no sim, no action
BANANAS31 — 56 days since contact, NO RESPONSE (DEAD)
$COW — 56 days since contact, NO RESPONSE (DEAD)

ION BSC STATUS (Primary Prospect)

Score: 83/100 (QUALIFIED, passes dual-gate)
Chain: BSC
Contact: @0xDeployer (Bankr partner) — KNOWN
Outreach: NOT SENT
Days as #1 priority: 21+ (3 consecutive weekly reports)
Blockers: ZERO

ION BSC is the most actionable path to first listing revenue.
3 weeks flagged, zero execution.
EOFMSG
)

MSG3=$(cat <<'EOFMSG'
WEEK 13 INFRASTRUCTURE WINS

1. BuzzShield V6 — 10-layer security pipeline
   68 sub-patterns, 10 attack classes, 859 programs
2. 9 vulnerability reports filed (HackerOne/Immunefi)
3. Toly (Solana co-founder) reviewed Percolator PR #79
4. Token count: 671+ -> 1,044+ (+55%)
5. Bug Bounty Genius Plan (12-priority roadmap)

BD ACTION ITEMS

1. [CRITICAL 3WK OVERDUE] ION BSC outreach
   Score 83, contact known, zero blockers. SEND NOW.
2. [CRITICAL 2WK OVERDUE] BANANAS31 breakup (56d dead)
3. [CRITICAL 2WK OVERDUE] $COW breakup (56d dead)
4. [HIGH] Calibration audit — pipeline 95 vs real ~60
5. [HIGH] MicroBuzz v2 sims on BALLWARS/Max/VELO
6. [HIGH] Execute score_tweets — infra ready, 0 tweets sent
7. [MEDIUM] Scan 373 new tokens for calibrated 85+

REVENUE: ~270K sats (~$192) | Listing: $0 | Bounties: TBD

13 weeks. 1,044+ scored. 0 listed. 0 deals closed.
Security research is impressive but BD pipeline is the mandate.

RECOMMENDATION: Execute this week or pipeline is dead weight.
- ION BSC outreach (no more delays)
- BANANAS31 + $COW breakup emails
- 1 MicroBuzz simulation
- 1 score tweet
Shift 50% capacity to BD execution.

— Buzz BD Agent | SolCex Exchange | buzzbd.ai
EOFMSG
)

send_msg() {
  local text="$1"
  local result
  result=$(curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg chat "$CHAT_ID" --arg text "$text" '{chat_id: $chat, text: $text, disable_web_page_preview: true}')")
  if echo "$result" | jq -e '.ok' &>/dev/null; then
    echo "OK (msg $(echo "$result" | jq -r '.result.message_id'))"
  else
    echo "FAILED: $(echo "$result" | jq -r '.description // "unknown error"')"
    return 1
  fi
}

echo "[$(date -u)] Sending Week 13 BD Report to chat $CHAT_ID..."
echo -n "Part 1/3: "; send_msg "$MSG1"
sleep 1
echo -n "Part 2/3: "; send_msg "$MSG2"
sleep 1
echo -n "Part 3/3: "; send_msg "$MSG3"
echo "[$(date -u)] Week 13 report sent."
