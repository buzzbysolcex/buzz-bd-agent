#!/bin/bash
# correction-hunter.sh — daily 06:00 UTC scan for correction-worthy signals.
#
# Contract:
#   1. Pull last 24h of aibtc.news signals
#   2. Filter to active-editor beats: bitcoin-macro, quantum
#      (Apr 23 2026 pivot per Ogie msg 4558 + correction rule update msg 4620
#       — Elegant Orb DARK 5+ days, so aibtc-network corrections rot
#       unapproved. DROPPED from filter entirely. Flip back when the
#       daily Elegant Orb revert monitor fires.)
#   3. For signals that reference github.com/{owner}/{repo}/(issues|pull)/NNN
#      across aibtcdev repos (agent-news, x402-sponsor-relay, skills,
#      landing-page) enrich with the real issue/PR title + state from the
#      GitHub REST API. Bare #NNN still defaults to agent-news for
#      back-compat.
#   4. Emit candidates JSON with signal snippet + referenced issues side-by-side
#   5. Post digest to War Room so a Buzz session can pick up draft work
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

# --- 2. Filter to last-24h + active beats + extract issue references ------
# Candidate rule:
#   - signal createdAt >= SINCE
#   - beatSlug in ACTIVE_BEATS (bitcoin-macro, quantum) — aibtc-network
#     excluded per msg 4620 while Elegant Orb is dark
#   - content or headline references github.com/{owner}/{repo}/(issues|pull)/NNN
#     OR bare #NNN (back-compat, defaults to aibtcdev/agent-news)
#   - NOT self (btcAddress != Buzz's)
#   - NOT already a correction
BUZZ_BTC="bc1qsja6knydqxj0nxf05466zhu8qqedu8umxeagze"
ACTIVE_BEATS="bitcoin-macro,quantum"

CANDS_FILE="$TMPDIR/candidates.json"
SINCE="$SINCE" BUZZ_BTC="$BUZZ_BTC" ACTIVE_BEATS="$ACTIVE_BEATS" RAW_FILE="$RAW_FILE" OUT_CANDS="$CANDS_FILE" python3 <<'PY' 2>/dev/null
import json, os, re, sys
raw = json.load(open(os.environ['RAW_FILE']))
since = os.environ.get('SINCE')
buzz = os.environ.get('BUZZ_BTC')
active_beats = set((os.environ.get('ACTIVE_BEATS') or '').split(','))
# URL-qualified: capture owner/repo/number → ground-truth fetch from correct repo
url_re = re.compile(r'github\.com/([\w.-]+)/([\w.-]+)/(?:issues|pull)/(\d+)')
# Bare #NNN → default to aibtcdev/agent-news (historical convention)
bare_re = re.compile(r'#(\d{2,4})\b')
out = []
for s in raw.get('signals', []):
    created = s.get('timestamp') or s.get('createdAt') or s.get('publishedAt') or ''
    if since and created and created < since:
        continue
    if s.get('btcAddress') == buzz:
        continue
    if s.get('correction_of'):
        continue
    if active_beats and s.get('beatSlug') not in active_beats:
        continue
    text = (s.get('headline','') or '') + "\n" + (s.get('content','') or '')
    refs = {}  # key "owner/repo#num" → {owner, repo, number}
    for m in url_re.finditer(text):
        owner, repo, num = m.group(1), m.group(2), int(m.group(3))
        key = f"{owner}/{repo}#{num}"
        refs[key] = {'owner': owner, 'repo': repo, 'number': num}
    for m in bare_re.finditer(text):
        num = int(m.group(1))
        key = f"aibtcdev/agent-news#{num}"
        refs.setdefault(key, {'owner': 'aibtcdev', 'repo': 'agent-news', 'number': num})
    # For BM/quantum, GH-issue references are rare — signals cite mempool.space,
    # api.hiro.so, arxiv.org, nist.gov, BIP drafts. Surface those as manual
    # fact-check candidates (numeric/factual claims to verify against live source).
    source_urls = []
    beat = s.get('beatSlug') or ''
    if beat in ('bitcoin-macro', 'quantum') and not refs:
        raw_sources = s.get('sources') or []
        for src in raw_sources:
            u = (src.get('url') if isinstance(src, dict) else str(src)) or ''
            if any(host in u for host in ('mempool.space','api.hiro.so','arxiv.org','eprint.iacr.org','nist.gov','github.com/bitcoin/bips','blockchain.info','blockstream.info')):
                source_urls.append({'url': u, 'title': (src.get('title') if isinstance(src, dict) else '')[:150]})
        if not source_urls:
            continue
    elif not refs:
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
        'referenced_issues': sorted(refs.values(), key=lambda r: (r['owner'], r['repo'], r['number'])),
        'primary_source_urls': source_urls,
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
def fetch_issue(ref):
    owner, repo, num = ref['owner'], ref['repo'], ref['number']
    key = f"{owner}/{repo}#{num}"
    if key in cache:
        return cache[key]
    url = f"https://api.github.com/repos/{owner}/{repo}/issues/{num}"
    req = urllib.request.Request(url, headers={'Accept':'application/vnd.github+json'})
    if auth:
        k,v = auth.split(': ',1)
        req.add_header(k, v)
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            d = json.loads(r.read())
            out = {
                'owner': owner,
                'repo': repo,
                'number': d.get('number'),
                'title': d.get('title'),
                'state': d.get('state'),
                'user': (d.get('user') or {}).get('login'),
                'created_at': d.get('created_at'),
                'merged_at': d.get('pull_request', {}).get('merged_at') if d.get('pull_request') else None,
                'labels': [l.get('name') for l in d.get('labels',[])],
                'url': d.get('html_url'),
                'is_pr': 'pull_request' in d,
            }
            cache[key] = out
            return out
    except urllib.error.HTTPError as e:
        cache[key] = {'owner': owner, 'repo': repo, 'number': num, 'error': f'http_{e.code}'}
        return cache[key]
    except Exception as e:
        cache[key] = {'owner': owner, 'repo': repo, 'number': num, 'error': str(e)[:100]}
        return cache[key]

for c in cands:
    c['issues_ground_truth'] = [fetch_issue(r) for r in c.get('referenced_issues', [])]
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
    print("CORRECTION-HUNTER (daily) — 0 candidates in last 24h (BM+quantum)")
    sys.exit(0)
# Group by beatSlug for at-a-glance triage
from collections import Counter
beat_counts = Counter(c.get('beatSlug','?') for c in cands)
beat_summary = ', '.join(f"{b}={n}" for b,n in beat_counts.most_common())
lines = [f"CORRECTION-HUNTER (daily) — {len(cands)} candidates ({beat_summary})"]
for c in cands[:8]:
    refs = c.get('referenced_issues',[])
    ref_str = ', '.join(f"{r['owner']}/{r['repo']}#{r['number']}" for r in refs[:4])
    lines.append(f"\n• {c.get('author')} ({c.get('beatSlug')})")
    lines.append(f"  {c.get('headline','')[:100]}")
    lines.append(f"  refs: {ref_str}")
    for g in c.get('issues_ground_truth',[])[:3]:
        label = f"{g.get('owner','?')}/{g.get('repo','?')}#{g.get('number')}"
        if g.get('error'):
            lines.append(f"    {label}: {g.get('error')}")
        else:
            kind = 'PR' if g.get('is_pr') else 'issue'
            lines.append(f"    {label} {kind} ({g.get('state')}): {(g.get('title') or '')[:80]}")
lines.append(f"\nFull JSON: /data/buzz/persistent/reports/correction-candidates/")
print("\n".join(lines))
PY
)
    curl -sS --max-time 10 "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
      -d chat_id="-1003701758077" \
      --data-urlencode "text=$DIGEST" > /dev/null 2>&1 || log "war-room post failed (non-fatal)"
fi

log "done candidates=$NUM_CANDIDATES"
