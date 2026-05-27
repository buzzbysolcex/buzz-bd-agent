#!/usr/bin/env python3
"""HSaaS Tweet Draft Generator — Pillar 2 Phase 1 build.

Reads Pillar 1 scoring pipeline (public /scores endpoint, no admin key),
drafts tweets per `.claude/rules/tweet-on-score.md` v2.2, writes to
data/pillar2/tweet-drafts/<date>/, appends to ledger.

Cron: `15 0,6,12,18 * * * cd /home/claude-code/buzz-workspace && python3 scripts/hsaas-tweet-draft-generator.py`
Manual: python3 scripts/hsaas-tweet-draft-generator.py

Op approval queue (max 3 score tweets/day per v2.2) is enforced at the
War Room approval step, not here.
"""

import datetime
import json
import os
import subprocess
import sys
import urllib.request
from pathlib import Path

WORKSPACE = Path(__file__).resolve().parent.parent
OUT_DIR = WORKSPACE / "data" / "pillar2" / "tweet-drafts"
LEDGER = OUT_DIR / "tweet-draft-ledger.md"
TODAY = datetime.datetime.utcnow().strftime("%Y-%m-%d")
NOW = datetime.datetime.utcnow().strftime("%H:%M")

OUT_DIR.mkdir(parents=True, exist_ok=True)
DRAFTS_DIR = OUT_DIR / TODAY
DRAFTS_DIR.mkdir(parents=True, exist_ok=True)


def fetch_scores():
    try:
        with urllib.request.urlopen(
            "http://localhost:3000/api/v1/scores?limit=200", timeout=10
        ) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        print(f"[hsaas-draft] scores fetch failed: {e}", file=sys.stderr)
        return {"tokens": []}


def build_body(tier, ticker, score, addr_short, chain):
    if tier == "HOT":
        return (
            f"🐝 BUZZ SCORE: {ticker} — {score}/100\n"
            f"📋 Contract: {addr_short} ({chain})\n\n"
            f"[Category breakdown in visual card]\n\n"
            f"Scored across 31 sources on 19 chains.\n"
            f"1000-agent swarm simulation. On-chain verified.\n\n"
            f"[@project_twitter] — your token passed honest calibration.\n"
            f"Full report: shield.buzzbd.ai/audit\n\n"
            f"#BuildInPublic #TokenAudit #HonestScoring"
        )
    if tier == "QUALIFIED":
        return (
            f"🐝 BUZZ SCORE: {ticker} — {score}/100\n"
            f"📋 Contract: {addr_short} ({chain})\n\n"
            f"Strong calibration. Worth your attention.\n\n"
            f"[@project_twitter] — want the full 1000-agent swarm report?\n"
            f"shield.buzzbd.ai/audit\n\n"
            f"#HonestScoring"
        )
    return (
        f"🐝 BUZZ SCORE: {ticker} — {score}/100\n"
        f"📋 Contract: {addr_short} ({chain})\n\n"
        f"Not a fail. Not a pass. Worth watching.\n\n"
        f"[@project_twitter] — want the full 1000-agent swarm report?\n"
        f"shield.buzzbd.ai/audit\n\n"
        f"#HonestScoring"
    )


def read_existing_ledger():
    existing = set()
    if LEDGER.exists():
        for line in LEDGER.read_text().splitlines():
            if line.startswith("- "):
                parts = line.split(" | ")
                if len(parts) >= 2:
                    existing.add(parts[1].strip())
    return existing


def notify_war_room(message):
    bot_env = Path.home() / ".claude" / "channels" / "telegram" / ".env"
    if not bot_env.exists():
        return
    env = {}
    for ln in bot_env.read_text().splitlines():
        if "=" in ln and not ln.lstrip().startswith("#"):
            k, _, v = ln.partition("=")
            env[k.strip()] = v.strip().strip('"').strip("'")
    token = env.get("TELEGRAM_BOT_TOKEN")
    chat_id = env.get("TELEGRAM_CHAT_ID")
    if not (token and chat_id):
        return
    try:
        subprocess.run(
            [
                "curl", "-s", "-X", "POST",
                f"https://api.telegram.org/bot{token}/sendMessage",
                "-d", f"chat_id={chat_id}",
                "--data-urlencode", f"text={message}",
            ],
            check=False, capture_output=True, timeout=15,
        )
    except Exception as e:
        print(f"[hsaas-draft] war-room notify failed: {e}", file=sys.stderr)


def main():
    scores = fetch_scores()
    tokens = scores.get("tokens", [])
    existing = read_existing_ledger()

    drafts = []
    for t in tokens:
        addr = (t.get("address") or "").strip()
        if not addr or addr in ("unknown", "not_confirmed_from_dexscreener"):
            continue
        score = t.get("score")
        if score is None:
            continue
        ticker = t.get("ticker") or "?"
        name = t.get("name") or ticker
        chain = t.get("chain") or "?"

        if score >= 85:
            tier = "HOT"
        elif score >= 70:
            tier = "QUALIFIED"
        elif score >= 50:
            tier = "WATCH"
        else:
            continue

        if addr in existing:
            continue

        addr_short = f"{addr[:6]}...{addr[-4:]}" if len(addr) > 12 else addr
        body = build_body(tier, ticker, score, addr_short, chain)
        floor_status = "VERIFY_FLOOR"

        safe_ticker = ticker.replace("/", "_")
        safe_addr = addr_short.replace("...", "_")
        fname = f"{tier}-{score}-{safe_ticker}-{safe_addr}.md"
        fpath = DRAFTS_DIR / fname

        content = (
            f"# Tweet draft — {tier} {ticker} ({chain}) score {score}\n\n"
            f"**Token**: {name}\n"
            f"**Address**: `{addr}`\n"
            f"**Chain**: {chain}\n"
            f"**Score**: {score}/100\n"
            f"**Tier**: {tier}\n"
            f"**Generated**: {TODAY} {NOW}\n"
            f"**Liquidity floor (v2.2)**: {floor_status} — operator must verify ≥$50K liquidity before approval\n"
            f"**Twitter handle**: TBD (run DexScreener+CoinGecko handle-verify ≥0.85 conf)\n"
            f"**Visual card**: TBD (score-card template)\n\n"
            f"---\n\n"
            f"## Draft body\n\n"
            f"```\n{body}\n```\n\n"
            f"---\n\n"
            f'**To approve**: reply to War Room thread with "approve {tier}-{score}-{ticker}" — operator then posts via Twitter API.\n'
            f"**v2.2 compliance checklist**:\n"
            f"- [ ] Liquidity ≥ $50K verified\n"
            f"- [ ] Twitter handle verified (conf ≥ 0.85 from 2-of-3 sources)\n"
            f"- [ ] Visual score card attached (full address on card)\n"
            f"- [ ] Daily cap not exceeded (max 3 score tweets/day)\n"
        )
        fpath.write_text(content)
        drafts.append((tier, score, ticker, addr_short, str(fpath)))

    if drafts:
        ledger_lines = [f"\n## {TODAY} {NOW} cycle\n"]
        for tier, score, ticker, addr_short, fpath in drafts:
            ledger_lines.append(
                f"- {tier} | {addr_short} | {ticker} | score {score} | {fpath}"
            )
        with open(LEDGER, "a") as f:
            f.write("\n".join(ledger_lines) + "\n")

    print(f"[hsaas-draft] {TODAY} {NOW} UTC NEW_DRAFTS={len(drafts)}")
    for tier, score, ticker, addr_short, _ in drafts[:5]:
        print(f"  {tier} {score} {ticker} ({addr_short})")

    if drafts:
        msg = (
            f"📝 HSaaS: {len(drafts)} new score-tweet drafts queued in "
            f"data/pillar2/tweet-drafts/{TODAY}/. Approval queue. "
            f"Liquidity-floor verification required per draft (v2.2)."
        )
        notify_war_room(msg)


if __name__ == "__main__":
    main()
