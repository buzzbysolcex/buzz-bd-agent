#!/bin/bash
# send-weekly-bd-report.sh — Send Week 12 BD report to Telegram chat
# Usage: bash scripts/send-weekly-bd-report.sh
# Requires: TELEGRAM_BOT_TOKEN env var (or loads from cron-bot.env / docker)

set -euo pipefail

CHAT_ID="950395553"
TG_ENV="/home/claude-code/.claude/channels/telegram/cron-bot.env"

# Load bot token
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

# Message 1/3: Header + Pipeline Funnel + Top 5
MSG1=$(cat <<'EOFMSG'
🐝 BUZZ WEEKLY BD REPORT
Week 12 | May 11, 2026 | buzzbd.ai

📊 PIPELINE FUNNEL (671+ tokens)

scored ➜ 671+ (11-rule engine)
prospect ➜ 5 (dual-gate passed)
contacted ➜ 2 (DEAD — 49 days no reply)
negotiating ➜ 0
listed ➜ 0

🔥 TOP 5 HOT TOKENS

1. BALLWARS (SOL) — 95* — stalled 37+ days
2. BANANAS31 (BSC) — 95* — contacted 3/23, DEAD
3. Max (SOL) — 95* — stalled 37+ days
4. TRUMP (SOL) — 95* — stalled 37+ days
5. VELO (BSC) — 95* — stalled 37+ days

⚠️ *Pre-calibration scores. Calibrated: 55-68 range. Audit OVERDUE.

🤖 MIROFISH 10K SIMULATIONS (Nasdog only)

Wave 1: 0.620 → BULLISH
Wave 2: 0.665 → BULLISH
Wave 3: 0.696 → BULLISH
Wave 4: 0.765 → BULLISH (institutional flipped 0.66)

No other prospect tokens simulated.
EOFMSG
)

# Message 2/3: Velocity + Stalls + ION BSC
MSG2=$(cat <<'EOFMSG'
📉 PIPELINE VELOCITY: ZERO (3rd consecutive stalled week)

No stage movements May 5-11. Infra shipped:
• BuzzShield V2 (prompt injection + supply chain + SBOM)
• Wallet Guard AION live (12 receipts end-to-end)
• BuzzShield dApp on Netlify
• Karpathy LLM Wiki (43 pages)
• autoDream 13 phases + 595 ground truth
• DRI Sales audition posted (#439)

🚨 STALLED TOKENS

• BALLWARS/Max/TRUMP/VELO — 37+ days at prospect, no sim
• BANANAS31 — 49 days since contact, NO RESPONSE (DEAD)
• $COW — 49 days since contact, NO RESPONSE (DEAD)

🎯 ION BSC STATUS (Primary Prospect)

Score: 83/100 (QUALIFIED)
Chain: BSC
Contact: @0xDeployer (Bankr partner)
Outreach: NOT SENT ❌ (14+ days since first flagged)

ION BSC is the #1 most actionable path to first listing revenue. Score passes dual-gate. Contact known. ZERO blockers. 3 weeks overdue.
EOFMSG
)

# Message 3/3: Action Items + Revenue + Summary
MSG3=$(cat <<'EOFMSG'
🎯 BD ACTION ITEMS

1. [CRITICAL] ION BSC outreach — score 83, contact known, 3 weeks overdue
2. [CRITICAL] BANANAS31 — mark REJECTED (49 days, dead)
3. [CRITICAL] $COW — mark REJECTED (49 days, dead)
4. [HIGH] Calibration audit — pipeline scores inflated (95 vs ~60 real)
5. [HIGH] MiroFish sims on BALLWARS/Max/TRUMP/VELO
6. [HIGH] Fire first score tweet (daemon ready, never executed)
7. [MEDIUM] Scan for new 85+ tokens (2 weeks no intake)

💰 REVENUE: ~270K sats (~$192) | Listing revenue: $0

12 weeks. 671+ tokens scored. 0 listed. 0 deals closed.

📋 WEEK 12 VERDICT: Pipeline is STALLED. BD execution is at zero. Infrastructure is mature — BuzzShield V2, Wallet Guard, Gmail outreach scaffold all built. What's missing is DOING.

Make-or-break week:
→ Send ION BSC outreach TODAY
→ Close dead deals (BANANAS31 + $COW)
→ Shift 50% capacity to BD execution
→ First listing revenue or explain why not

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

echo "[$(date -u)] Sending Week 12 BD Report to chat $CHAT_ID..."
echo -n "Part 1/3: "; send_msg "$MSG1"
sleep 1
echo -n "Part 2/3: "; send_msg "$MSG2"
sleep 1
echo -n "Part 3/3: "; send_msg "$MSG3"
echo "[$(date -u)] Done."
