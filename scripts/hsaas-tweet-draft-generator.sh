#!/bin/bash
# HSaaS Tweet Draft Generator — Pillar 2 Phase 1 build
# Reads Pillar 1 scoring pipeline, drafts tweets per tweet-on-score.md v2.2,
# queues drafts to War Room for operator approval.
#
# Schedule: invoke after every Pillar 1 scoring cron cycle (every 6h).
# Manual: bash scripts/hsaas-tweet-draft-generator.sh
# Cron entry to add (operator-gated infrastructure change):
#   15 0,6,12,18 * * * cd /home/claude-code/buzz-workspace && bash scripts/hsaas-tweet-draft-generator.sh
#   (offset 15 min from pipeline-review at 0,6,12,18 to allow scoring cron to settle)

set -euo pipefail

cd "$(dirname "$0")/.."
WORKSPACE="$(pwd)"
OUT_DIR="$WORKSPACE/data/pillar2/tweet-drafts"
LEDGER="$OUT_DIR/tweet-draft-ledger.md"
TODAY="$(date -u +%Y-%m-%d)"
NOW="$(date -u +%H:%M)"

mkdir -p "$OUT_DIR"

# Bot config for War Room notification
BOT_TOKEN_FILE="$HOME/.claude/channels/telegram/.env"
if [ -f "$BOT_TOKEN_FILE" ]; then
  # shellcheck source=/dev/null
  source "$BOT_TOKEN_FILE"
fi
CHAT_ID="${TELEGRAM_CHAT_ID:-950395553}"
BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"

# Pull latest scored tokens from public scores endpoint (no admin key needed)
SCORES_JSON="$(curl -s "http://localhost:3000/api/v1/scores?limit=200" 2>/dev/null || echo '{"tokens":[]}')"

# Generate drafts: HOT (85+) + QUALIFIED (70-84) + WATCH (50-69)
# Apply tweet-on-score.md v2.2:
#   - $50K liquidity floor (log only below, no twitter draft)
#   - prefix...suffix address display compliant (full address on card)
#   - max 3 score tweets per day (handled at operator-approval queue, not here)
#
# The generator OUTPUTS drafts to disk; the operator approval queue is the
# rate-limit gate. Generator runs free; approval cycle enforces 3/day.

DRAFTS_DIR="$OUT_DIR/$TODAY"
mkdir -p "$DRAFTS_DIR"

NEW_DRAFTS=$(python3 <<PYEOF
import json, os, sys
from pathlib import Path

scores = json.loads('''$SCORES_JSON''')
tokens = scores.get('tokens', [])
out_dir = Path("$DRAFTS_DIR")
ledger_path = Path("$LEDGER")

# Read existing ledger to dedup
existing = set()
if ledger_path.exists():
    for line in ledger_path.read_text().splitlines():
        if line.startswith("- "):
            parts = line.split(" | ")
            if len(parts) >= 2:
                existing.add(parts[1].strip())

new_count = 0
drafts = []
for t in tokens:
    addr = (t.get("address") or "").strip()
    if not addr or addr in ("unknown", "not_confirmed_from_dexscreener"):
        continue
    score = t.get("score")
    if score is None: continue
    cls = t.get("classification") or ""
    chain = t.get("chain") or "?"
    ticker = t.get("ticker") or "?"
    name = t.get("name") or ticker

    # Bucket
    if score >= 85: tier = "HOT"
    elif score >= 70: tier = "QUALIFIED"
    elif score >= 50: tier = "WATCH"
    else: continue  # FLAGGED handled separately (rug catches), not here

    # Dedup on address
    if addr in existing:
        continue

    # v2.2 liquidity floor — we don't have per-token liquidity from /scores endpoint;
    # leave it as a "needs operator verify" tag rather than draft a tweet that may
    # violate the floor. When the scoring endpoint exposes liquidity, this becomes
    # an autonomous gate.
    floor_status = "VERIFY_FLOOR"  # operator manually confirms ≥\$50K liquidity before approval

    addr_short = f"{addr[:6]}...{addr[-4:]}" if len(addr) > 12 else addr

    # Template per tier (subset of tweet-on-score.md v2.2)
    if tier == "HOT":
        body = (
            f"🐝 BUZZ SCORE: {ticker} — {score}/100\\n"
            f"📋 Contract: {addr_short} ({chain})\\n\\n"
            f"[Category breakdown in visual card]\\n\\n"
            f"Scored across 31 sources on 19 chains.\\n"
            f"1000-agent swarm simulation. On-chain verified.\\n\\n"
            f"[@project_twitter] — your token passed honest calibration.\\n"
            f"Full report: shield.buzzbd.ai/audit\\n\\n"
            f"#BuildInPublic #TokenAudit #HonestScoring"
        )
    elif tier == "QUALIFIED":
        body = (
            f"🐝 BUZZ SCORE: {ticker} — {score}/100\\n"
            f"📋 Contract: {addr_short} ({chain})\\n\\n"
            f"Strong calibration. Worth your attention.\\n\\n"
            f"[@project_twitter] — want the full 1000-agent swarm report?\\n"
            f"shield.buzzbd.ai/audit\\n\\n"
            f"#HonestScoring"
        )
    else:  # WATCH
        body = (
            f"🐝 BUZZ SCORE: {ticker} — {score}/100\\n"
            f"📋 Contract: {addr_short} ({chain})\\n\\n"
            f"Not a fail. Not a pass. Worth watching.\\n\\n"
            f"[@project_twitter] — want the full 1000-agent swarm report?\\n"
            f"shield.buzzbd.ai/audit\\n\\n"
            f"#HonestScoring"
        )

    fname = f"{tier}-{score}-{ticker.replace('/','_')}-{addr_short.replace('...','_')}.md"
    fpath = out_dir / fname

    fpath.write_text(
        f"# Tweet draft — {tier} {ticker} ({chain}) score {score}\\n\\n"
        f"**Token**: {name}\\n"
        f"**Address**: \`{addr}\`\\n"
        f"**Chain**: {chain}\\n"
        f"**Score**: {score}/100\\n"
        f"**Tier**: {tier}\\n"
        f"**Generated**: {TODAY_ARG} {NOW_ARG}\\n"
        f"**Liquidity floor (v2.2)**: {floor_status} — operator must verify ≥\$50K liquidity before approval\\n"
        f"**Twitter handle**: TBD (run DexScreener+CoinGecko handle-verify ≥0.85 conf)\\n"
        f"**Visual card**: TBD (score-card template)\\n\\n"
        f"---\\n\\n"
        f"## Draft body\\n\\n"
        f"```\\n{body}\\n```\\n\\n"
        f"---\\n\\n"
        f"**To approve**: reply to War Room thread with \\"approve {tier}-{score}-{ticker}\\" — operator then posts via Twitter API.\\n"
        f"**v2.2 compliance checklist**:\\n"
        f"- [ ] Liquidity ≥ \$50K verified\\n"
        f"- [ ] Twitter handle verified (conf ≥ 0.85 from 2-of-3 sources)\\n"
        f"- [ ] Visual score card attached (full address on card)\\n"
        f"- [ ] Daily cap not exceeded (max 3 score tweets/day)\\n"
    )

    drafts.append((tier, score, ticker, addr_short, str(fpath)))
    new_count += 1

# Append to ledger
if drafts:
    ledger_lines = [f"\\n## {TODAY_ARG} {NOW_ARG} cycle\\n"]
    for tier, score, ticker, addr_short, fpath in drafts:
        ledger_lines.append(f"- {tier} | {addr_short} | {ticker} | score {score} | {fpath}")
    with open(ledger_path, "a") as f:
        f.write("\\n".join(ledger_lines) + "\\n")

print(f"NEW_DRAFTS={new_count}")
for tier, score, ticker, addr_short, fpath in drafts[:5]:
    print(f"  {tier} {score} {ticker} ({addr_short})")
PYEOF
TODAY_ARG="$TODAY" NOW_ARG="$NOW")

echo "[hsaas-tweet-draft-generator] $TODAY $NOW UTC"
echo "$NEW_DRAFTS"

# Notify War Room of new drafts (only if count > 0)
if echo "$NEW_DRAFTS" | grep -q "NEW_DRAFTS=[1-9]" && [ -n "$BOT_TOKEN" ]; then
  COUNT=$(echo "$NEW_DRAFTS" | head -1 | sed 's/NEW_DRAFTS=//')
  MSG="📝 HSaaS: $COUNT new score-tweet drafts queued in $DRAFTS_DIR. Approval queue. Liquidity-floor verification required per draft (v2.2)."
  curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
    -H "Content-Type: application/json" \
    -d "$(python3 -c "import json,sys; print(json.dumps({'chat_id': sys.argv[1], 'text': sys.argv[2]}))" "$CHAT_ID" "$MSG")" \
    >/dev/null || true
fi
