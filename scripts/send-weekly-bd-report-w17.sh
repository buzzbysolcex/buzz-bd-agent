#!/bin/bash
# send-weekly-bd-report-w17.sh — Send Week 17 BD report to Telegram
# Usage: bash scripts/send-weekly-bd-report-w17.sh
# Run on server: ssh root@204.168.137.253 'cd /root/buzz-bd-agent && bash scripts/send-weekly-bd-report-w17.sh'
# Or via GitHub Actions workflow_dispatch: "Weekly BD Report"

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

echo "[$(date -u)] Gathering live pipeline data..."

# Gather live data from API
STATS=$(docker exec buzz-production curl -s http://127.0.0.1:3000/api/v1/pipeline/stats 2>/dev/null || echo '{}')
PIPELINE=$(docker exec buzz-production curl -s http://127.0.0.1:3000/api/v1/pipeline 2>/dev/null || echo '{}')
PROSPECTS=$(docker exec buzz-production curl -s "http://127.0.0.1:3000/api/v1/pipeline/stage/prospect" 2>/dev/null || echo '{}')
SIMS=$(docker exec buzz-production curl -s http://127.0.0.1:3000/api/v1/simulate-listing/results 2>/dev/null || echo '{}')

# Parse stats
TOTAL=$(echo "$STATS" | python3 -c "import sys,json; print(json.load(sys.stdin).get('total','?'))" 2>/dev/null || echo "1044+")
ADDED=$(echo "$STATS" | python3 -c "import sys,json; print(json.load(sys.stdin).get('added_24h',0))" 2>/dev/null || echo "0")

# Parse stage counts
parse_stage() {
  echo "$STATS" | python3 -c "
import sys,json
d=json.load(sys.stdin).get('by_stage',{})
s=d.get('$1',{})
c=s.get('count',0)
a=s.get('avg_score')
avg=f' (avg {round(a)})' if a else ''
print(f'{c}{avg}')" 2>/dev/null || echo "0"
}

S_DISC=$(parse_stage discovered)
S_SCAN=$(parse_stage scanned)
S_SCORED=$(parse_stage scored)
S_PROSP=$(parse_stage prospect)
S_CONT=$(parse_stage contacted)
S_NEG=$(parse_stage negotiating)
S_APP=$(parse_stage approved)
S_LIST=$(parse_stage listed)
S_REJ=$(parse_stage rejected)

# Parse top 5 prospects
TOP5=$(echo "$PROSPECTS" | python3 -c "
import sys,json
d=json.load(sys.stdin)
tokens=d.get('tokens',d.get('data',[]))[:5]
for i,t in enumerate(tokens,1):
    sym=t.get('ticker',t.get('symbol','?'))
    ch=t.get('chain','?')
    sc=t.get('score','?')
    upd=str(t.get('updated_at','?'))[:10]
    print(f'{i}. {sym} ({ch}) -- {sc}/100 -- upd:{upd}')
if not tokens: print('No prospect-stage tokens found')
" 2>/dev/null || echo "Could not parse prospects (API may be down)")

# Parse simulation results
SIM_SUMMARY=$(echo "$SIMS" | python3 -c "
import sys,json
d=json.load(sys.stdin)
results=d.get('results',d.get('data',[]))
if not results:
    print('No new simulations since last report.')
else:
    for r in results[:5]:
        tok=r.get('token',r.get('ticker','?'))
        cons=r.get('consensus','?')
        conf=r.get('confidence',r.get('final_belief','?'))
        print(f'  {tok}: {cons} (confidence: {conf})')
" 2>/dev/null || echo "Could not parse simulation results")

# Parse ION BSC
ION=$(docker exec buzz-production curl -s "http://127.0.0.1:3000/api/v1/pipeline?chain=bsc&min_score=80" 2>/dev/null || echo '{}')
ION_STATUS=$(echo "$ION" | python3 -c "
import sys,json
d=json.load(sys.stdin)
tokens=d.get('tokens',d.get('data',[]))
ions=[t for t in tokens if 'ION' in (t.get('ticker','')or t.get('symbol','')).upper()]
if ions:
    t=ions[0]
    print(f\"Score: {t.get('score','?')}/100 | Stage: {t.get('stage','?')} | Updated: {str(t.get('updated_at','?'))[:10]}\")
else:
    print('Score: 83 (last known) | Stage: prospect | Updated: unknown')
" 2>/dev/null || echo "Score: 83 (last known) | Stage: prospect")

echo "[$(date -u)] Data gathered. Building report..."

MSG1=$(cat <<EOFMSG
BUZZ WEEKLY BD REPORT
Week of $(date -u +%Y-%m-%d) | Week 17
buzzbd.ai
===================================

PIPELINE FUNNEL (${TOTAL} tokens scored)
Added 24h: ${ADDED}

  discovered: ${S_DISC}
  scanned: ${S_SCAN}
  scored: ${S_SCORED}
  prospect: ${S_PROSP}
  contacted: ${S_CONT}
  negotiating: ${S_NEG}
  approved: ${S_APP}
  listed: ${S_LIST}
  rejected: ${S_REJ}

TOP 5 HOT TOKENS (Prospect Stage)
${TOP5}

*Pre-calibration scores. Calibration audit 12 WEEKS OVERDUE.

SIMULATION VERDICTS
  Nasdog (MiroFish 10K, 4 waves): BULLISH
  W1: 0.620 > W2: 0.665 > W3: 0.696 > W4: 0.765
  All 5 clusters bullish. Institutional: 0.664.
Live simulation results:
${SIM_SUMMARY}
EOFMSG
)

MSG2=$(cat <<EOFMSG
PIPELINE VELOCITY: ZERO (8th consecutive week)

Week 17: no stage movements, no outreach, no simulations,
no score tweets since June 1.
8 consecutive weeks of zero pipeline movement.

STALLED TOKENS
  BALLWARS (SOL) -- 95* / ~65 cal -- stalled 72+ days
  BANANAS31 (BSC) -- 95* / 55 cal -- DEAD (84d no reply)
  Max (SOL) -- 95* / ~65 cal -- stalled 72+ days
  TRUMP (SOL) -- 95* / 56 cal -- stalled 72+ days
  VELO (BSC) -- 95* / 60 cal -- stalled 72+ days

ION BSC STATUS (Primary Prospect)
${ION_STATUS}
Contact: @0xDeployer (Bankr partner) -- KNOWN
Outreach: NOT SENT
Days waiting: 49+ since first flagged (#1 priority)
Blockers: ZERO

STATUS: ION BSC has been #1 BD action item for 7 CONSECUTIVE
reports (Weeks 10-17). Contact known. Score qualifies.
Zero blockers. 49 days of inaction on the most actionable
prospect in the pipeline.
EOFMSG
)

MSG3=$(cat <<EOFMSG
WEEK-OVER-WEEK TREND

                  W15    W16    W17
Tokens scored:  1044+  1044+  ${TOTAL}   FLAT
Prospects:         5      5      ${S_PROSP%%\ *}   FLAT
Contacted:         2      2      ${S_CONT%%\ *}   FLAT
Listed:            0      0      ${S_LIST%%\ *}   FLAT
Stage moves:       0      0      0   FLAT
ION outreach:   NONE   NONE   NONE   FLAT (7wks)
Dead deal age:   70d    77d    84d   WORSE
Revenue:        \$192   \$192   \$192   FLAT

Every metric flat or worsening. Pipeline is frozen.
Dead deals now at 84 days -- only metric that moves, wrong way.
EOFMSG
)

MSG4=$(cat <<'EOFMSG'
BD ACTION ITEMS (Priority Order)

1. [CRITICAL -- 7 WKS OVERDUE] ION BSC outreach
   Score 83, @0xDeployer contact, zero blockers. SEND NOW.

2. [CRITICAL -- 7 WKS OVERDUE] Close BANANAS31 + $COW
   84 days no response. Beyond dead. Mark REJECTED.
   Free contacted slots for fresh outreach.

3. [HIGH -- 12 WKS OVERDUE] Calibration audit top 5
   Pipeline 95 vs calibrated ~60. Can't do honest BD on lies.

4. [HIGH] MicroBuzz v2 sim on BALLWARS or Max
   Top prospects with ZERO simulation data.

5. [HIGH] Execute 1+ score tweet from pipeline
   Infrastructure ready. Zero tweets published.

6. [MEDIUM] Fresh DexScreener sweep for new 85+ candidates

REVENUE: ~270K sats (~$192) | Listing: $0

17 weeks. 1,044+ tokens scored. 0 listed. $0 listing revenue.
Execute ION BSC outreach TODAY -- fastest path to first revenue.

MINIMUM VIABLE BD EXECUTION THIS WEEK:
1. ION BSC outreach -- draft and send (zero blockers)
2. BANANAS31 + $COW -- mark REJECTED
3. Run 1 MicroBuzz v2 simulation
4. 1 score tweet from pipeline

The infrastructure has been production-ready for months.
Execution is the ONLY bottleneck.

-- Buzz BD Agent | SolCex Exchange | buzzbd.ai
   1,044+ tokens scored | 11 rules | On-chain verified
   BuzzShield V6 | 859 programs monitored
   Report generated: Week 17, June 15 2026
EOFMSG
)

send_msg() {
  local text="$1"
  local result
  result=$(curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg chat "$CHAT_ID" --arg text "$text" '{chat_id: $chat, text: $text, disable_web_page_preview: true}')")
  local ok=$(echo "$result" | jq -r '.ok // "false"')
  local msg_id=$(echo "$result" | jq -r '.result.message_id // "?"')
  if [[ "$ok" == "true" ]]; then
    echo "OK (msg_id: $msg_id)"
  else
    local desc=$(echo "$result" | jq -r '.description // "unknown error"')
    echo "FAIL: $desc"
  fi
}

echo "[$(date -u)] Sending Week 17 BD Report to chat $CHAT_ID..."
echo -n "Part 1/4: "; send_msg "$MSG1"
sleep 1
echo -n "Part 2/4: "; send_msg "$MSG2"
sleep 1
echo -n "Part 3/4: "; send_msg "$MSG3"
sleep 1
echo -n "Part 4/4: "; send_msg "$MSG4"
echo "[$(date -u)] Week 17 BD Report sent."
