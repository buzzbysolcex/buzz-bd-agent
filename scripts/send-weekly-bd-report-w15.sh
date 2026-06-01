#!/bin/bash
# send-weekly-bd-report-w15.sh — Send Week 15 BD report to Telegram
# Usage: bash scripts/send-weekly-bd-report-w15.sh
# Run on server: ssh root@204.168.137.253 'cd /root/buzz-bd-agent && bash scripts/send-weekly-bd-report-w15.sh'
# Or: docker exec buzz-production bash /app/scripts/send-weekly-bd-report-w15.sh

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

MSG1=$(cat <<'EOFMSG'
🐝 BUZZ WEEKLY BD REPORT
Week 15 | June 1, 2026 | buzzbd.ai

📊 PIPELINE FUNNEL (1,044+ tokens scored)

scored → 1,044+ (11-rule engine + on-chain)
prospect → 5 (dual-gate passed)
contacted → 2 (no response — both DEAD)
negotiating → 0
approved → 0
listed → 0

🔥 TOP 5 HOT TOKENS (Prospect Stage)

1. BALLWARS (SOL) — 95* / ~65 cal — stalled 58d
2. BANANAS31 (BSC) — 95* / 55 cal — DEAD (70d no reply)
3. Max (SOL) — 95* / ~65 cal — stalled 58d
4. TRUMP (SOL) — 95* / 56 cal — stalled 58d
5. VELO (BSC) — 95* / 60 cal — stalled 58d

⚠️ *Pre-calibration scores. Calibrated: 55-68. Audit OVERDUE 10 WEEKS.

🤖 SIMULATION VERDICTS

Nasdog (MiroFish 10K, 4 waves): BULLISH
W1: 0.620 → W2: 0.665 → W3: 0.696 → W4: 0.765
All 5 clusters bullish by Wave 4.
Institutional flipped 0.664 (was 0.488).

⚠️ ZERO simulations on any of the top 5 prospects.
MicroBuzz v2 (500-agent) available but UNUSED 8+ weeks.
EOFMSG
)

MSG2=$(cat <<'EOFMSG'
📉 PIPELINE VELOCITY: ZERO (6th consecutive week)

Week 15: no stage movements, no outreach, no simulations, no score tweets, no new scoring runs detected.

This is the LONGEST BD execution drought since Buzz went live.

🚨 STALLED TOKENS

• BALLWARS / Max / TRUMP / VELO — 58+ days at prospect, no sim, no action
• BANANAS31 — 70 days since contact, no response (DEAD)
• $COW — 70 days since contact, no response (DEAD)

🎯 ION BSC STATUS (Primary Prospect)

Score: 83/100 ✅ QUALIFIED (passes dual-gate)
Chain: BSC
Contact: @0xDeployer (Bankr partner) — KNOWN
Outreach: NOT SENT ❌
Days waiting: 35+ since first flagged (#1 priority)
Blockers: ZERO

STATUS: ION BSC has been the #1 BD action item for 5 CONSECUTIVE weekly reports (Weeks 10-15). Contact known. Score qualifies. Zero blockers. 35 days of inaction on the most actionable prospect in the pipeline.
EOFMSG
)

MSG3=$(cat <<'EOFMSG'
📈 WEEK-OVER-WEEK TREND

                    W13    W14    W15
Tokens scored:    1044+  1044+  1044+  FLAT
Prospects:           5      5      5   FLAT
Contacted:           2      2      2   FLAT
Listed:              0      0      0   FLAT
Stage moves:         0      0      0   FLAT
ION outreach:     NONE   NONE   NONE   FLAT (5wks)
Dead deal age:     56d    63d    70d   ↑ WORSE
Revenue:          $192   $192   $192   FLAT

Every metric flat or worsening. Pipeline is frozen.
EOFMSG
)

MSG4=$(cat <<'EOFMSG'
🎯 BD ACTION ITEMS (Priority Order)

1. [CRITICAL — 5 WKS OVERDUE] ION BSC outreach
   Score 83, @0xDeployer contact, zero blockers. SEND NOW.

2. [CRITICAL — 5 WKS OVERDUE] Close BANANAS31 + $COW
   70 days no response. Mark REJECTED. Free contacted slots.

3. [HIGH — 10 WKS OVERDUE] Calibration audit top 5
   Pipeline 95 vs calibrated ~60. Can't do honest BD on lies.

4. [HIGH] MicroBuzz v2 sim on BALLWARS or Max
   Top prospects with ZERO simulation data.

5. [HIGH] Execute 1+ score tweet from pipeline
   Infra built. Zero tweets published.

6. [MEDIUM] Fresh DexScreener sweep for new 85+ tokens

💰 REVENUE: ~270K sats (~$192) | Listing: $0

15 weeks. 1,044 tokens scored. 0 listed. $0 listing revenue.
ION BSC is the fastest path to first revenue. Execute TODAY.

The infrastructure has been ready for months.
Execution is the ONLY bottleneck.

— Buzz BD Agent | SolCex Exchange | buzzbd.ai
EOFMSG
)

send_msg() {
  local text="$1"
  curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg chat "$CHAT_ID" --arg text "$text" '{chat_id: $chat, text: $text, disable_web_page_preview: true}')" \
    | jq -r '.ok // "FAILED"'
}

echo "[$(date -u)] Sending Week 15 BD Report to chat $CHAT_ID..."
echo -n "Part 1/4: "; send_msg "$MSG1"
sleep 1
echo -n "Part 2/4: "; send_msg "$MSG2"
sleep 1
echo -n "Part 3/4: "; send_msg "$MSG3"
sleep 1
echo -n "Part 4/4: "; send_msg "$MSG4"
echo "[$(date -u)] Done."
