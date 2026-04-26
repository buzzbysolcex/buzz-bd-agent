#!/usr/bin/env python3
"""autodream-stub-briefing.py — Phase D of Top-5 plan (Apr 26 2026, msg 4871).

Daily 03:30 UTC briefing to the War Room about autoDream Phase 6's stub drafts.
Reads the latest dream_log row, surfaces:
  - which slots were drafted last night
  - whether the disk-write loop kept them or skipped
  - which (if any) have been rewritten into fileable bodies
  - the morning cron hits ahead

Until the wake-rewrite path (B) ships and a real-body generator (A) ships,
this briefing is the safety net — it tells the operator (Ogie) which slots
will silently miss unless someone hand-crafts.

Cron: 30 3 * * * — runs daily at 03:30 UTC.
"""

import json
import os
import sqlite3
import sys
import time
import urllib.request

DB = "/data/buzz/persistent/buzz-api/buzz.db"
DRAFT_DIR = "/data/buzz/persistent/buzz-api/signal-drafts"
LOG = "/home/claude-code/buzz-workspace/logs/aibtc-monitors/autodream-stub-briefing.log"
TG_ENV = "/home/claude-code/.claude/channels/telegram/.env"


def log(msg: str) -> None:
    os.makedirs(os.path.dirname(LOG), exist_ok=True)
    ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    with open(LOG, "a") as f:
        f.write(f"[{ts}] autodream-stub-briefing: {msg}\n")


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
    today = time.strftime("%Y-%m-%d", time.gmtime())

    # Pull the latest dream_log row.
    try:
        conn = sqlite3.connect(f"file:{DB}?mode=ro", uri=True, timeout=10)
        cur = conn.cursor()
        cur.execute(
            "SELECT id, timestamp, full_report FROM dream_log "
            "ORDER BY timestamp DESC LIMIT 1"
        )
        row = cur.fetchone()
        conn.close()
    except Exception as e:
        log(f"db_read_failed: {e}")
        tg_send(
            f"⚠️ autoDream stub briefing — DB read failed: {e}. "
            f"Hand-crafts likely needed for Day {today}."
        )
        return 1

    if not row:
        log("no_dream_log_rows")
        tg_send(
            f"⚠️ autoDream stub briefing — no dream_log rows. "
            f"Phase 6 may not have run last night. Hand-crafts needed for {today}."
        )
        return 1

    cycle_id, ts, report_json = row
    try:
        report = json.loads(report_json or "{}")
    except Exception as e:
        log(f"report_parse_failed: {e}")
        report = {}

    sa = report.get("signalAngles", {}) or {}
    drafted = sa.get("drafted", 0)
    beats = sa.get("beats", []) or []
    written = sa.get("disk_written", 0)
    skipped = sa.get("disk_skipped", 0)
    skip_reasons = sa.get("disk_skip_reasons", []) or []

    # Inspect actual draft files for today.
    fileable = []
    stubs_pending = []
    if os.path.isdir(DRAFT_DIR):
        for fn in sorted(os.listdir(DRAFT_DIR)):
            if not fn.startswith(today) or not fn.endswith(".json"):
                continue
            fp = os.path.join(DRAFT_DIR, fn)
            try:
                d = json.load(open(fp))
            except Exception:
                continue
            if d.get("filed"):
                continue
            body_len = len(d.get("body") or "")
            if body_len >= 600:
                fileable.append({"file": fn, "beat": d.get("beat_slug"), "body": body_len})
            elif body_len > 0:
                stubs_pending.append(
                    {"file": fn, "beat": d.get("beat_slug"), "body": body_len}
                )

    morning_slots = [
        ("Slot 1", "00:02Z", "quantum"),
        ("Slot 2", "01:04Z", "quantum"),
        ("Slot 3", "04:02Z", "bitcoin-macro"),
        ("Slot 4", "05:04Z", "bitcoin-macro"),
        ("Slot 5", "06:06Z", "bitcoin-macro"),
    ]

    msg_lines = [
        f"🌅 autoDream stub briefing — {today} 03:30Z",
        "",
        f"Last cycle: {cycle_id} at {ts}",
        f"Phase 6 drafted: {drafted} (beats: {', '.join(beats) or 'n/a'})",
        f"Disk written: {written} | skipped: {skipped}",
        "",
        "Skip reasons:" if skip_reasons else "",
    ]
    for r in skip_reasons[:6]:
        msg_lines.append(f"  • {r[:140]}")
    msg_lines.append("")

    if fileable:
        msg_lines.append(f"✅ Fileable drafts ({len(fileable)}):")
        for d in fileable:
            msg_lines.append(f"  • {d['file']} ({d['beat']}, body {d['body']}c)")
    else:
        msg_lines.append("⚠️ NO fileable drafts on disk for today.")

    if stubs_pending:
        msg_lines.append("")
        msg_lines.append(f"Stub drafts (need rewrite, body <600c, {len(stubs_pending)}):")
        for d in stubs_pending:
            msg_lines.append(f"  • {d['file']} ({d['beat']}, body {d['body']}c)")

    msg_lines.append("")
    msg_lines.append("Morning chain timing (cron a23f223):")
    for label, t, beat in morning_slots:
        msg_lines.append(f"  {label} {t} {beat}")

    if not fileable:
        msg_lines.append("")
        msg_lines.append("→ Hand-craft expected. Streak protection trigger fires at 16:00Z.")

    msg = "\n".join([line for line in msg_lines if line is not None])

    log(
        f"drafted={drafted} written={written} skipped={skipped} "
        f"fileable={len(fileable)} stubs_pending={len(stubs_pending)}"
    )
    tg_send(msg)
    log("done")
    return 0


if __name__ == "__main__":
    sys.exit(main())
