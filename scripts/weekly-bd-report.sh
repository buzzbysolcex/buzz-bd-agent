#!/bin/bash
# Weekly BD Report — Gathers live data from API + sends to Telegram
# Run on Hetzner: bash scripts/weekly-bd-report.sh
# Requires: TELEGRAM_BOT_TOKEN env var set

set -euo pipefail

CHAT_ID="${TELEGRAM_CHAT_ID:-950395553}"
BOT_TOKEN="${TELEGRAM_BOT_TOKEN}"
API="http://127.0.0.1:3000/api/v1"
CONTAINER="buzz-production"
DATE=$(date -u +"%Y-%m-%d")

if [ -z "$BOT_TOKEN" ]; then
  echo "ERROR: TELEGRAM_BOT_TOKEN not set"
  exit 1
fi

echo "[weekly-bd-report] Gathering pipeline data..."

PIPELINE=$(docker exec "$CONTAINER" curl -s "$API/pipeline" 2>/dev/null || echo '{"error":"failed"}')
STATS=$(docker exec "$CONTAINER" curl -s "$API/pipeline/stats" 2>/dev/null || echo '{"error":"failed"}')
SIMS=$(docker exec "$CONTAINER" curl -s "$API/simulate-listing/results" 2>/dev/null || echo '{"error":"failed"}')
PROSPECTS=$(docker exec "$CONTAINER" curl -s "$API/pipeline/stage/prospect" 2>/dev/null || echo '{"error":"failed"}')

# ION BSC specific lookup
ION_DATA=$(docker exec "$CONTAINER" curl -s "$API/pipeline?chain=bsc&min_score=80" 2>/dev/null || echo '{"error":"failed"}')

# Stage movement this week
VELOCITY=$(docker exec "$CONTAINER" curl -s "$API/pipeline?limit=1000" 2>/dev/null | \
  python3 -c "
import json, sys
from datetime import datetime, timedelta
data = json.load(sys.stdin)
tokens = data.get('tokens', [])
week_ago = (datetime.utcnow() - timedelta(days=7)).isoformat()
moved = [t for t in tokens if t.get('updated_at','') > week_ago and t.get('stage') not in ('discovered','rejected')]
print(json.dumps({'moved_count': len(moved), 'tokens': [{'symbol': t.get('symbol','?'), 'stage': t.get('stage','?'), 'score': t.get('score',0)} for t in moved[:10]]}))" 2>/dev/null || echo '{"moved_count":0}')

# Build report
REPORT=$(python3 -c "
import json

stats = json.loads('''$STATS''')
sims = json.loads('''$SIMS''')
prospects = json.loads('''$PROSPECTS''')
velocity = json.loads('''$VELOCITY''')
ion = json.loads('''$ION_DATA''')

lines = []
lines.append('BUZZ WEEKLY BD REPORT')
lines.append('Week of $DATE')
lines.append('=' * 35)
lines.append('')

# Pipeline funnel
lines.append('PIPELINE FUNNEL')
lines.append('-' * 25)
total = stats.get('total', 'N/A')
lines.append(f'Total tokens: {total}')
lines.append(f'Added (24h): {stats.get(\"added_24h\", \"N/A\")}')
by_stage = stats.get('by_stage', {})
for stage in ['discovered','scanned','scored','prospect','contacted','negotiating','approved','listed','rejected']:
    info = by_stage.get(stage, {})
    count = info.get('count', 0)
    avg = info.get('avg_score')
    avg_str = f' (avg {avg})' if avg else ''
    lines.append(f'  {stage}: {count}{avg_str}')
lines.append('')

# Top prospects
lines.append('TOP PROSPECTS')
lines.append('-' * 25)
p_tokens = prospects.get('tokens', [])
for t in p_tokens[:5]:
    sym = t.get('symbol', '?')
    score = t.get('score', '?')
    chain = t.get('chain', '?')
    lines.append(f'  {sym} ({chain}): {score}/100')
lines.append('')

# Velocity
lines.append('PIPELINE VELOCITY (7d)')
lines.append('-' * 25)
lines.append(f'Tokens that moved stages: {velocity.get(\"moved_count\", 0)}')
for t in velocity.get('tokens', [])[:5]:
    lines.append(f'  {t[\"symbol\"]} -> {t[\"stage\"]} (score {t[\"score\"]})')
lines.append('')

# ION BSC
lines.append('ION BSC STATUS')
lines.append('-' * 25)
ion_tokens = ion.get('tokens', [])
ion_found = [t for t in ion_tokens if 'ION' in t.get('symbol','').upper()]
if ion_found:
    t = ion_found[0]
    lines.append(f'Score: {t.get(\"score\",\"?\")}/100')
    lines.append(f'Stage: {t.get(\"stage\",\"?\")}')
    lines.append(f'Chain: BSC')
    lines.append(f'Last updated: {t.get(\"updated_at\",\"?\")}')
else:
    lines.append('ION not found in live pipeline BSC 80+ filter')
lines.append('')

# Simulations
lines.append('SIMULATION VERDICTS')
lines.append('-' * 25)
sim_results = sims if isinstance(sims, list) else sims.get('results', sims.get('simulations', []))
if isinstance(sim_results, list):
    for s in sim_results[:5]:
        token = s.get('token', s.get('symbol', '?'))
        verdict = s.get('consensus', s.get('verdict', s.get('recommendation', '?')))
        ev = s.get('ev', s.get('expected_value', '?'))
        lines.append(f'  {token}: {verdict} (EV: {ev})')
else:
    lines.append('  No simulation results available')

lines.append('')
lines.append('— Buzz BD Agent | buzzbd.ai')

print('\n'.join(lines))
" 2>/dev/null)

if [ -z "$REPORT" ]; then
  REPORT="Weekly BD report generation failed — check API endpoints"
fi

echo "$REPORT"
echo ""
echo "[weekly-bd-report] Sending to Telegram chat $CHAT_ID..."

# Send to Telegram (split if >4096 chars)
MSG_LEN=${#REPORT}
if [ "$MSG_LEN" -gt 4000 ]; then
  PART1="${REPORT:0:4000}"
  PART2="${REPORT:4000}"
  curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
    -H "Content-Type: application/json" \
    -d "$(python3 -c "import json; print(json.dumps({'chat_id': '$CHAT_ID', 'text': '''$PART1''', 'parse_mode': 'Markdown'}))")" > /dev/null
  sleep 1
  curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
    -H "Content-Type: application/json" \
    -d "$(python3 -c "import json; print(json.dumps({'chat_id': '$CHAT_ID', 'text': '''$PART2''', 'parse_mode': 'Markdown'}))")" > /dev/null
else
  curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
    -H "Content-Type: application/json" \
    -d "$(python3 -c "import json; print(json.dumps({'chat_id': '$CHAT_ID', 'text': '''$REPORT''', 'parse_mode': 'Markdown'}))")" > /dev/null
fi

echo "[weekly-bd-report] Done."
