#!/bin/bash
# correction-hunter.sh — daily 06:00 UTC scan for correction-worthy signals.
#
# Contract:
#   1. Pull last 24h of aibtc.news signals
#   2. For signals that reference github.com/aibtcdev/agent-news issues
#      (either via direct URL or #NNN), enrich with the real issue title
#      from the GitHub REST API
#   3. Emit candidates JSON with signal snippet + referenced issues side-by-side
#   4. Post digest to War Room so a Buzz session can pick up draft work
#
# This script does NOT write correction drafts autonomously — the LLM-grade
# fact-checking happens in a Buzz session that ingests the candidates JSON.
# Correction-hunter is the surfacing backbone, not the drafter.
#
# Install: cron `0 6 * * * /home/claude-code/buzz-workspace/scripts/correction-hunter.sh`

set -uo pipefail

TODAY=$(date -u +%Y-%m-%d)
SINCE=$(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%SZ)

OUT_DIR=/data/buzz/persistent/reports/correction-candidates
LOG=/data/buzz/persistent/reports/correction-hunter.log
OUT_FILE="$OUT_DIR/${TODAY}.json"

mkdir -p "$OUT_DIR" 2>/dev/null || true

log() {
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] correction-hunter: $*" >> "$LOG"
}

log "wake (scanning since=$SINCE)"

# --- 1. Pull recent signals ------------------------------------------------
TMPDIR=$(mktemp -d -t correction-hunter.XXXXXX)
trap 'rm -rf "$TMPDIR"' EXIT
RAW_FILE="$TMPDIR/signals.json"
curl -sS --max-time 20 "https://aibtc.news/api/signals?limit=40" > "$RAW_FILE" 2>/dev/null || echo '{"signals":[]}' > "$RAW_FILE"
SIGNAL_COUNT=$(python3 -c "import json; print(len(json.load(open('$RAW_FILE')).get('signals',[])))" 2>/dev/null || echo 0)

if [ "$SIGNAL_COUNT" -eq 0 ]; then
    log "fail: aibtc API returned 0 signals — skipping tick"
    exit 0
fi

log "fetched=$SIGNAL_COUNT signals from aibtc.news"

# --- 2. Filter to last-24h + extract issue references ---------------------
# Candidate rule:
#   - signal createdAt >= SINCE
#   - content or headline references #NNN or aibtcdev/agent-news/issues/NNN
#   - NOT self (btcAddress != Buzz's)
BUZZ_BTC="bc1qsja6knydqxj0nxf05466zhu8qqedu8umxeagze"

CANDS_FILE="$TMPDIR/candidates.json"
SINCE="$SINCE" BUZZ_BTC="$BUZZ_BTC" RAW_FILE="$RAW_FILE" OUT_CANDS="$CANDS_FILE" python3 <<'PY' 2>/dev/null
import json, os, re, sys
raw = json.load(open(os.environ['RAW_FILE']))
since = os.environ.get('SINCE')
buzz = os.environ.get('BUZZ_BTC')
issue_re = re.compile(r'(?:aibtcdev/agent-news/(?:issues|pull)/(\d+))|(?:#(\d{2,4})\b)')
out = []
for s in raw.get('signals', []):
    created = s.get('timestamp') or s.get('createdAt') or s.get('publishedAt') or ''
    if since and created and created < since:
        continue
    if s.get('btcAddress') == buzz:
        continue
    # Skip signals that are themselves corrections — don't correct a correction
    if s.get('correction_of'):
        continue
    text = (s.get('headline','') or '') + "\n" + (s.get('content','') or '')
    issues = set()
    for m in issue_re.finditer(text):
        num = m.group(1) or m.group(2)
        if num:
            issues.add(int(num))
    if not issues:
        continue
    out.append({
        'id': s.get('id'),
        'author': s.get('displayName'),
        'btcAddress': s.get('btcAddress'),
        'beat': s.get('beat'),
        'beatSlug': s.get('beatSlug'),
        'headline': s.get('headline',''),
        'content_snippet': (s.get('content','') or '')[:600],
        'timestamp': created,
        'referenced_issues': sorted(issues),
    })
json.dump(out, open(os.environ['OUT_CANDS'],'w'))
PY

NUM_CANDIDATES=$(python3 -c "import json; print(len(json.load(open('$CANDS_FILE'))))" 2>/dev/null || echo 0)
log "candidates=$NUM_CANDIDATES after filter (last-24h, has issue refs, not-self)"

# --- 3. Enrich with GitHub issue ground truth -----------------------------
# Read PAT for higher rate limits. Falls back to anonymous if missing.
GH_AUTH=""
if [ -f /home/claude-code/.env.github ]; then
    GH_TOKEN_VAL=$(grep -E '^GITHUB_TOKEN=' /home/claude-code/.env.github | cut -d= -f2- | head -1)
    if [ -n "${GH_TOKEN_VAL:-}" ]; then
        GH_AUTH="Authorization: token $GH_TOKEN_VAL"
    fi
fi

ENRICH_FILE="$TMPDIR/enriched.json"
GH_AUTH="$GH_AUTH" CANDS_FILE="$CANDS_FILE" ENRICH_FILE="$ENRICH_FILE" python3 <<'PY' 2>/dev/null
import json, os, sys, urllib.request, urllib.error
cands = json.load(open(os.environ['CANDS_FILE']))
auth = os.environ.get('GH_AUTH','')

cache = {}
def fetch_issue(num):
    if num in cache:
        return cache[num]
    url = f"https://api.github.com/repos/aibtcdev/agent-news/issues/{num}"
    req = urllib.request.Request(url, headers={'Accept':'application/vnd.github+json'})
    if auth:
        k,v = auth.split(': ',1)
        req.add_header(k, v)
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            d = json.loads(r.read())
            out = {
                'number': d.get('number'),
                'title': d.get('title'),
                'state': d.get('state'),
                'user': (d.get('user') or {}).get('login'),
                'created_at': d.get('created_at'),
                'labels': [l.get('name') for l in d.get('labels',[])],
                'url': d.get('html_url'),
            }
            cache[num] = out
            return out
    except urllib.error.HTTPError as e:
        cache[num] = {'number': num, 'error': f'http_{e.code}'}
        return cache[num]
    except Exception as e:
        cache[num] = {'number': num, 'error': str(e)[:100]}
        return cache[num]

for c in cands:
    c['issues_ground_truth'] = [fetch_issue(n) for n in c.get('referenced_issues', [])]
json.dump(cands, open(os.environ['ENRICH_FILE'],'w'), indent=2)
PY

# --- 4. Emit candidates JSON ---------------------------------------------
cp "$ENRICH_FILE" "$OUT_FILE"
log "wrote $OUT_FILE ($(wc -c < "$OUT_FILE") bytes)"

# --- 5. War Room digest ---------------------------------------------------
if [ -f /home/claude-code/.claude/channels/telegram/.env ]; then
    . /home/claude-code/.claude/channels/telegram/.env
    DIGEST=$(ENRICH_FILE="$ENRICH_FILE" python3 <<'PY' 2>/dev/null
import json, os, sys
cands = json.load(open(os.environ['ENRICH_FILE']))
if not cands:
    print("CORRECTION-HUNTER (daily) — 0 candidates in last 24h")
    sys.exit(0)
lines = [f"CORRECTION-HUNTER (daily) — {len(cands)} candidates"]
for c in cands[:8]:
    issues = ', '.join(f"#{i}" for i in c.get('referenced_issues',[]))
    lines.append(f"\n• {c.get('author')} ({c.get('beatSlug')})")
    lines.append(f"  {c.get('headline','')[:100]}")
    lines.append(f"  refs: {issues}")
    for g in c.get('issues_ground_truth',[])[:3]:
        if g.get('error'):
            lines.append(f"    #{g.get('number')}: {g.get('error')}")
        else:
            lines.append(f"    #{g.get('number')} ({g.get('state')}): {(g.get('title') or '')[:80]}")
lines.append(f"\nFull JSON: /data/buzz/persistent/buzz-api/correction-candidates/")
print("\n".join(lines))
PY
)
    curl -sS --max-time 10 "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
      -d chat_id="-1003701758077" \
      --data-urlencode "text=$DIGEST" > /dev/null 2>&1 || log "war-room post failed (non-fatal)"
fi

log "done candidates=$NUM_CANDIDATES"
