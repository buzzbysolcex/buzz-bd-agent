#!/usr/bin/env python3
"""achievement-watchdog.py — Phase 3A of Top-5 plan (Apr 25 2026, msg 4844).

Daily watchdog over Ionic Nova's AIBTC achievements. Pulls the live list,
diffs against the baseline file, and alerts the War Room on:
  - any newly-unlocked achievement (positive)
  - any unexpected disappearance from the list (regression — should never
    happen, but if it does we want to know immediately)

Baseline file is rewritten after each scan so future runs only diff against
the most recently-known state.

Cron: 30 0 * * * — runs at 00:30 UTC daily.
"""

import json
import os
import sys
import time
import urllib.request

ADDR = "bc1qsja6knydqxj0nxf05466zhu8qqedu8umxeagze"
STATE_DIR = "/home/claude-code/buzz-workspace/logs/aibtc-monitors"
BASELINE = f"{STATE_DIR}/achievements-baseline.json"
LOG = f"{STATE_DIR}/achievement-watchdog.log"
TG_ENV = "/home/claude-code/.claude/channels/telegram/.env"


def log(msg: str) -> None:
    os.makedirs(os.path.dirname(LOG), exist_ok=True)
    ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    with open(LOG, "a") as f:
        f.write(f"[{ts}] achievement-watchdog: {msg}\n")


def load_tg_creds():
    if not os.path.exists(TG_ENV):
        return None, None
    creds = {}
    for line in open(TG_ENV):
        line = line.strip()
        if "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            creds[k.strip()] = v.strip()
    return creds.get("TELEGRAM_BOT_TOKEN"), creds.get("TELEGRAM_CHAT_ID")


def tg_send(text: str) -> bool:
    token, chat = load_tg_creds()
    if not token or not chat:
        log("tg_env_incomplete")
        return False
    try:
        body = json.dumps({"chat_id": chat, "text": text}).encode()
        req = urllib.request.Request(
            f"https://api.telegram.org/bot{token}/sendMessage",
            data=body,
            headers={"Content-Type": "application/json"},
        )
        urllib.request.urlopen(req, timeout=10)
        return True
    except Exception as e:
        log(f"tg_send_failed: {e}")
        return False


def main() -> int:
    log("wake")
    try:
        req = urllib.request.Request(
            f"https://aibtc.com/api/achievements?btcAddress={ADDR}",
            headers={"User-Agent": "buzz-watchdog"},
        )
        with urllib.request.urlopen(req, timeout=30) as r:
            live = json.load(r)
    except Exception as e:
        log(f"fetch_failed: {e}")
        return 1

    live_ids = sorted({a["id"] for a in live.get("achievements", []) if a.get("id")})
    live_count = len(live_ids)

    baseline_ids = set()
    if os.path.exists(BASELINE):
        try:
            baseline = json.load(open(BASELINE))
            baseline_ids = set(baseline.get("ids", []))
        except Exception:
            baseline_ids = set()

    new = sorted(set(live_ids) - baseline_ids)
    gone = sorted(baseline_ids - set(live_ids))

    log(f"count={live_count} new={new} gone={gone}")

    if new or gone:
        msg_lines = [
            "🎯 Achievement watchdog (Day rolling)",
            "",
            f"count: {live_count}",
            f"new unlocks: {', '.join(new) if new else 'none'}",
        ]
        if gone:
            msg_lines.append(f"⚠️ unexpected disappearances: {', '.join(gone)}")
        msg_lines.append("")
        msg_lines.append("Watchdog runs daily at 00:30 UTC. Diff vs last scan.")
        tg_send("\n".join(msg_lines))
        log("alert_sent")

    os.makedirs(os.path.dirname(BASELINE), exist_ok=True)
    json.dump(
        {
            "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "count": live_count,
            "ids": live_ids,
        },
        open(BASELINE, "w"),
        indent=2,
    )

    log("done")
    return 0


if __name__ == "__main__":
    sys.exit(main())
