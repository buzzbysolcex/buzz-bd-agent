#!/usr/bin/env python3
"""inclusion-poller.py — Phase 3B of Top-5 plan (Apr 25 2026, msg 4844).

Hourly cron over Ionic Nova's recent signals. Polls aibtc.news for status
changes (submitted -> approved -> brief_included) and logs every transition.
Surfaces brief inclusions to the War Room — those are the 30K-sat events.

Validates whether the 2A timing-shift is working by tracking inclusion rate
pre/post Apr 25.

Cron: 17 * * * * — runs every hour at HH:17.
"""

import json
import os
import sys
import time
import urllib.request

ADDR = "bc1qsja6knydqxj0nxf05466zhu8qqedu8umxeagze"
STATE_DIR = "/home/claude-code/buzz-workspace/logs/aibtc-monitors"
HISTORY = f"{STATE_DIR}/inclusion-history.jsonl"
SEEN = f"{STATE_DIR}/inclusion-seen.json"
LOG = f"{STATE_DIR}/inclusion-poller.log"
TG_ENV = "/home/claude-code/.claude/channels/telegram/.env"


def log(msg: str) -> None:
    os.makedirs(os.path.dirname(LOG), exist_ok=True)
    ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    with open(LOG, "a") as f:
        f.write(f"[{ts}] inclusion-poller: {msg}\n")


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
            "https://aibtc.news/api/signals?limit=30",
            headers={"User-Agent": "buzz-poller"},
        )
        with urllib.request.urlopen(req, timeout=30) as r:
            raw = json.load(r)
    except Exception as e:
        log(f"fetch_failed: {e}")
        return 1

    signals = raw.get("signals", [])
    ours = [s for s in signals if s.get("btcAddress") == ADDR]

    seen = {}
    if os.path.exists(SEEN):
        try:
            seen = json.load(open(SEEN))
        except Exception:
            seen = {}

    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    transitions = []
    inclusions = []
    for s in ours:
        sid = s.get("id")
        status = s.get("status")
        prev = seen.get(sid)
        if prev != status:
            transitions.append(
                {
                    "sid": sid,
                    "headline": (s.get("headline") or "")[:80],
                    "beat": s.get("beat"),
                    "prev_status": prev,
                    "new_status": status,
                    "detected_at": now,
                }
            )
            seen[sid] = status
            if status and "include" in status.lower():
                inclusions.append(s)

    if transitions:
        os.makedirs(os.path.dirname(HISTORY), exist_ok=True)
        with open(HISTORY, "a") as f:
            for t in transitions:
                f.write(json.dumps(t) + "\n")

    json.dump(seen, open(SEEN, "w"))

    log(
        f"polled={len(ours)} transitions={len(transitions)} inclusions={len(inclusions)}"
    )

    for inc in inclusions:
        text = f"""💰 BRIEF INCLUSION

signal_id: {inc.get('id', '')[:8]}
beat: {inc.get('beat', '')}
headline: {(inc.get('headline') or '')[:120]}
status: {inc.get('status', '')}
qs: {inc.get('quality_score', '—')}

30,000 sats earned. Inclusion poller validates 2A timing shift is working."""
        tg_send(text)

    log("done")
    return 0


if __name__ == "__main__":
    sys.exit(main())
