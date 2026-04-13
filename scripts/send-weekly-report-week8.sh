#!/bin/bash
# Weekly BD Report — Week 8 (Apr 13, 2026)
# Run this on the production server where TELEGRAM_BOT_TOKEN is available
# Usage: bash scripts/send-weekly-report-week8.sh

CHAT_ID="950395553"
BOT_TOKEN="${TELEGRAM_BOT_TOKEN}"

if [ -z "$BOT_TOKEN" ]; then
  echo "ERROR: TELEGRAM_BOT_TOKEN not set"
  exit 1
fi

# Telegram has 4096 char limit per message — split into 3 parts

MSG1=$(cat <<'EOF'
📊 *WEEKLY BD REPORT — Week 8*
_April 7–13, 2026 | buzzbd.ai_

━━━━━━━━━━━━━━━━━━━━━━━━

*1. PIPELINE FUNNEL (598 Tokens)*

```
Discovered  ~340  (auto-ingested)
Scanned     ~150  (5-agent scan)
Scored       ~95  (dual-gate)
Prospect       5  (score 83-95)
Contacted      2  (BANANAS31 + $COW)
Negotiating    1  (ELS-1_SPEC warm)
Approved       0
Listed         0
Rejected      ~5
```

Growth: +344 tokens vs Week 6 (254→598)

━━━━━━━━━━━━━━━━━━━━━━━━

*2. TOP 5 TOKENS*

1️⃣ *BALLWARS* (SOL) — 95
   ⚠️ Needs Phase 2 security deep dive

2️⃣ *BANANAS31* (BSC) — 95 raw / 55 calibrated
   ❌ FDV gap 99%, Token Sniffer 0/100
   ❌ Wallet Guard: BLOCK
   ❌ Contacted Mar 23 — NO RESPONSE

3️⃣ *Max* (SOL) — 95
   ⚠️ Needs dual-source verification

4️⃣ *TRUMP* (SOL) — 95 raw / 56 calibrated
   ⚠️ High social, weak safety

5️⃣ *VELO* (BSC) — 95 raw / 60 calibrated
   ⚠️ Audit contradiction: Sniffer 0 vs DEXT 99
   ⚠️ Wallet Guard: WARN
EOF
)

MSG2=$(cat <<'EOF'
*3. MIROFISH SIMULATION*

*Nasdog* (SOL) — 10K agent swarm, 4 waves:
```
Wave  Belief  Consensus  Time
  1   0.620   BULLISH     —
  2   0.665   BULLISH    4.9h
  3   0.696   BULLISH   15.9h
  4   0.765   BULLISH   15.8h
```
Cluster beliefs (Wave 4):
• Degen: 1.000 ✅
• Community: 0.756 ✅
• Market: 0.714 ✅
• Whale: 0.692 ✅
• Institutional: 0.664 ✅

Strong BULLISH convergence across all clusters.

━━━━━━━━━━━━━━━━━━━━━━━━

*4. PIPELINE VELOCITY*

• New tokens: +344
• Stage advances: 0 ❌
• Outreach sent: 0 (last: Mar 23)
• Responses: 0
• Listings: 0

⚠️ *STALLED* — Discovery healthy, but zero deal flow for 3 weeks.
EOF
)

MSG3=$(cat <<'EOF'
*5. ION BSC — PRIMARY PROSPECT*

```
Score:    83 (QUALIFIED ✅)
Day:      32 as BD prospect
Contact:  @0xDeployer (Bankr warm intro)
Phase:    3 — BD Readiness
Blocker:  Needs simulation + outreach
```

🔴 *ION is our best prospect.* Score 83 = highest QUALIFIED token. Warm intro available. 32 days without outreach execution.

━━━━━━━━━━━━━━━━━━━━━━━━

*6. ACTION ITEMS*

🔴 P0: Run MiroFish sim on ION (R002)
🔴 P0: Execute Phase 4-5 BD on ION
🟡 P1: Follow up BANANAS31 (3wk overdue)
🟡 P1: Follow up $COW (3wk overdue)
🟡 P2: Resolve VELO audit contradiction
🟡 P2: Re-score BALLWARS + Max (calibrate)
⚪ P3: Check ELS-1_SPEC warm status
⚪ P3: Review $SAT (68) scoring gap

━━━━━━━━━━━━━━━━━━━━━━━━

_598 tokens | 23 sources | 15 rules | Dual-gate_
_Data: HANDOVER Apr 7 + local sources_
_buzzbd.ai | @BuzzBySolCex | Bismillah_
EOF
)

echo "Sending Part 1/3..."
curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
  -H "Content-Type: application/json" \
  -d "{\"chat_id\":\"${CHAT_ID}\",\"text\":$(echo "$MSG1" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))'),\"parse_mode\":\"Markdown\",\"disable_web_page_preview\":true}" | python3 -c "import json,sys; r=json.load(sys.stdin); print('OK' if r.get('ok') else f'FAIL: {r}')"

sleep 1

echo "Sending Part 2/3..."
curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
  -H "Content-Type: application/json" \
  -d "{\"chat_id\":\"${CHAT_ID}\",\"text\":$(echo "$MSG2" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))'),\"parse_mode\":\"Markdown\",\"disable_web_page_preview\":true}" | python3 -c "import json,sys; r=json.load(sys.stdin); print('OK' if r.get('ok') else f'FAIL: {r}')"

sleep 1

echo "Sending Part 3/3..."
curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
  -H "Content-Type: application/json" \
  -d "{\"chat_id\":\"${CHAT_ID}\",\"text\":$(echo "$MSG3" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))'),\"parse_mode\":\"Markdown\",\"disable_web_page_preview\":true}" | python3 -c "import json,sys; r=json.load(sys.stdin); print('OK' if r.get('ok') else f'FAIL: {r}')"

echo ""
echo "Weekly BD Report Week 8 sent to chat ${CHAT_ID}"
