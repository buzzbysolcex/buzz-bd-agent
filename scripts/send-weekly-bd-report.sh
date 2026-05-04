#!/bin/bash
# send-weekly-bd-report.sh — Send Week 11 BD report to Telegram chat
# Usage: bash scripts/send-weekly-bd-report.sh
# Requires: TELEGRAM_BOT_TOKEN env var (or loads from cron-bot.env)

set -euo pipefail

CHAT_ID="950395553"
TG_ENV="/home/claude-code/.claude/channels/telegram/cron-bot.env"

# Load bot token
if [[ -z "${TELEGRAM_BOT_TOKEN:-}" ]]; then
  if [[ -f "$TG_ENV" ]]; then
    source "$TG_ENV"
  else
    # Try docker env
    TELEGRAM_BOT_TOKEN="$(docker exec buzz-production printenv TELEGRAM_BOT_TOKEN 2>/dev/null || true)"
  fi
fi

if [[ -z "${TELEGRAM_BOT_TOKEN:-}" ]]; then
  echo "ERROR: TELEGRAM_BOT_TOKEN not found"
  exit 1
fi

# Message 1/3: Header + Pipeline Funnel
MSG1=$(cat <<'EOFMSG'
🐝 BUZZ WEEKLY BD REPORT
Week 11 | May 4, 2026 | buzzbd.ai

📊 PIPELINE FUNNEL (671+ tokens)

scored ➜ 671+ (11-rule engine)
prospect ➜ 5 (dual-gate passed)
contacted ➜ 2 (awaiting reply)
negotiating ➜ 0
listed ➜ 0

🔥 TOP 5 HOT TOKENS

1. BALLWARS (SOL) — 95* — stalled
2. BANANAS31 (BSC) — 95* — contacted 3/23
3. Max (SOL) — 95* — stalled
4. TRUMP (SOL) — 95* — stalled
5. VELO (BSC) — 95* — stalled

⚠️ *Pre-calibration scores. Calibrated: 55-68 range. Audit OVERDUE.

🤖 MIROFISH 10K SIMULATIONS (Nasdog)

Wave 1: 0.620 belief → BULLISH
Wave 2: 0.665 belief → BULLISH
Wave 3: 0.696 belief → BULLISH
Wave 4: 0.765 belief → BULLISH

Institutional cluster flipped bullish in Wave 4 (0.66 vs 0.49 W1). No other tokens simulated.
EOFMSG
)

# Message 2/3: Velocity + Stalls + ION
MSG2=$(cat <<'EOFMSG'
📉 PIPELINE VELOCITY: ZERO

Week 11: no stage movements (2nd consecutive stalled week). 25 commits shipped — all infra:
• Real score_tweets daemon handler
• GoPlus pre-tweet cross-verify
• Gmail outreach scaffold (Phase 2.4)
• BuzzShield V5 exploit-chain detection

🚨 STALLED TOKENS

• BALLWARS/Max/TRUMP/VELO — 30+ days at prospect, no sim, no calibration
• BANANAS31 — 42 days since contact, no response (DEAD)
• $COW — 42 days since contact, no response (DEAD)

🎯 ION BSC STATUS (Primary Prospect)

Score: 83/100 (QUALIFIED)
Chain: BSC
Contact: @0xDeployer (Bankr partner)
Outreach: NOT SENT ❌
Days waiting: 7+ since last report flagged

ION is the #1 most actionable prospect. Score passes dual-gate. Contact known. Zero blockers.
EOFMSG
)

# Message 3/3: Action Items + Revenue
MSG3=$(cat <<'EOFMSG'
🎯 BD ACTION ITEMS

1. [CRITICAL] ION BSC outreach — score 83, contact known, send NOW
2. [CRITICAL] BANANAS31 breakup email — 42 days, dead
3. [CRITICAL] $COW breakup email — 42 days, dead
4. [HIGH] Calibration audit on top 5 — scores inflated (95 vs ~60)
5. [HIGH] MiroFish sims on BALLWARS/Max/TRUMP/VELO
6. [HIGH] Execute score_tweets daemon — infra built, needs first run
7. [MEDIUM] Scan for new 85+ tokens

💰 REVENUE: ~270K sats (~$192) | Listing revenue: $0

11 weeks, 671+ tokens scored, 0 listed. ION BSC is the fastest path to first listing revenue.

📋 RECOMMENDATION: Shift 40% daily capacity to BD execution. Send ION outreach + 2 breakup emails THIS WEEK. Infrastructure is built — time to use it.

— Buzz BD Agent | SolCex Exchange
EOFMSG
)

send_msg() {
  local text="$1"
  curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg chat "$CHAT_ID" --arg text "$text" '{chat_id: $chat, text: $text, disable_web_page_preview: true}')" \
    | jq -r '.ok // "FAILED"'
}

echo "[$(date -u)] Sending Week 11 BD Report to chat $CHAT_ID..."
echo -n "Part 1/3: "; send_msg "$MSG1"
sleep 1
echo -n "Part 2/3: "; send_msg "$MSG2"
sleep 1
echo -n "Part 3/3: "; send_msg "$MSG3"
echo "[$(date -u)] Done."
