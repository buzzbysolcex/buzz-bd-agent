#!/usr/bin/env python3
"""autodream-stub-rewrite-trigger.py — Phase B of Top-5 plan (Apr 26 2026, msg 4871).

Daily 03:00 UTC trigger that bridges autoDream Phase 6 stubs to a wakable
Claude Code session.

Flow:
  1. Read the latest agent_mailbox EVENT from autodream→war-room-reporter
     for today (type=AUTODREAM_SIGNAL_ANGLES). This is where Phase 6 puts
     the 5 stub drafts {beat, headline, hook}. They never reach disk
     because the disk-write gate requires body 600-1000c and hooks are
     296-372c research prompts.
  2. INSERT a new mailbox EVENT to_agent='claude-code' with the actual
     stub content + a rewrite_autodream_stubs request, so any waking
     Claude Code session can pick it up on inbox poll.
  3. Send a War Room ping listing the stubs and asking for hand-craft if
     no rewrite consumer fires by 06:00Z.

Architectural gap (flagged to Ogie msg 4871):
  No autonomous "wake Claude Code" daemon exists. This trigger maximizes
  the chance the rewrite happens in time by (a) queueing the event and
  (b) alerting the operator. Phase A (real-body LLM Phase 6) is the
  permanent fix and will replace this stop-gap.

Cron: 0 3 * * * — runs daily at 03:00 UTC.
"""

import json
import os
import sqlite3
import sys
import time
import urllib.request

DB = "/data/buzz/persistent/buzz-api/buzz.db"
LOG = "/home/claude-code/buzz-workspace/logs/aibtc-monitors/autodream-stub-rewrite-trigger.log"
TG_ENV = "/home/claude-code/.claude/channels/telegram/.env"
FROM_AGENT = "autodream-cron"
TO_AGENT = "claude-code"


def log(msg: str) -> None:
    os.makedirs(os.path.dirname(LOG), exist_ok=True)
    ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    with open(LOG, "a") as f:
        f.write(f"[{ts}] autodream-stub-rewrite-trigger: {msg}\n")


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


def fetch_phase6_event(today: str):
    """Return (mailbox_id, payload_dict) for today's Phase 6 event, or (None, None)."""
    try:
        conn = sqlite3.connect(f"file:{DB}?mode=ro", uri=True, timeout=10)
        cur = conn.cursor()
        cur.execute(
            "SELECT id, payload FROM agent_mailbox "
            "WHERE from_agent='autodream' AND to_agent='war-room-reporter' "
            "AND date(created_at) = ? "
            "ORDER BY id DESC LIMIT 1",
            (today,),
        )
        row = cur.fetchone()
        conn.close()
    except Exception as e:
        log(f"db_read_failed: {e}")
        return None, None
    if not row:
        return None, None
    try:
        payload = json.loads(row[1] or "{}")
    except Exception as e:
        log(f"payload_parse_failed: {e}")
        return None, None
    if payload.get("type") != "AUTODREAM_SIGNAL_ANGLES":
        return None, None
    return row[0], payload


def insert_rewrite_event(payload: dict) -> int:
    try:
        conn = sqlite3.connect(DB, timeout=10)
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO agent_mailbox (from_agent, to_agent, msg_type, payload) "
            "VALUES (?, ?, 'EVENT', ?)",
            (FROM_AGENT, TO_AGENT, json.dumps(payload)),
        )
        conn.commit()
        new_id = cur.lastrowid
        conn.close()
        return new_id
    except Exception as e:
        log(f"mailbox_insert_failed: {e}")
        return 0


def main() -> int:
    log("wake")
    today = time.strftime("%Y-%m-%d", time.gmtime())

    src_id, phase6 = fetch_phase6_event(today)
    if not phase6:
        log(f"no_phase6_event_for_{today}")
        tg_send(
            f"🤖 autoDream rewrite trigger — {today} 03:00Z\n\n"
            f"⚠️ No AUTODREAM_SIGNAL_ANGLES event found for today. Phase 6 "
            f"may not have run, or DB unreachable. Phase D briefing at "
            f"03:30Z will confirm. Hand-crafts likely needed."
        )
        return 1

    drafts = phase6.get("drafts", []) or []
    if not drafts:
        log("phase6_event_has_no_drafts")
        tg_send(
            f"🤖 autoDream rewrite trigger — {today} 03:00Z\n\n"
            f"Phase 6 event {src_id} has 0 drafts. Hand-crafts needed."
        )
        return 1

    SLOT_TIMING = ["00:02Z", "01:04Z", "04:02Z", "05:04Z", "06:06Z"]

    rewrite_payload = {
        "event": "rewrite_autodream_stubs",
        "date": today,
        "source_event_id": src_id,
        "stub_count": len(drafts),
        "stubs": [
            {
                "slot": i + 1,
                "fire_time": SLOT_TIMING[i] if i < len(SLOT_TIMING) else "n/a",
                "beat": d.get("beat"),
                "headline": d.get("headline"),
                "hook": d.get("hook"),
            }
            for i, d in enumerate(drafts)
        ],
        "instructions": (
            "Each stub's hook is a research prompt. Rewrite the body to "
            "600-1000c using live data per beat: mempool.space for "
            "bitcoin-macro (difficulty/blocks/fees), arxiv quant-ph + "
            "bitcoin/bips commits for quantum. Keep headline ≤120c. "
            "Append the 'For agents:' line for the EIC rubric. Save "
            "rewritten draft to /data/buzz/persistent/buzz-api/signal-drafts/"
            "<date>-<beat>-<slot>.json before its slot fire time. "
            "scripts/morning-signals-v2.sh will pick it up."
        ),
        "fallback": (
            "If no Claude Code session consumes this event by 06:00Z, "
            "morning-signals-v2.sh will fall back to its hand-craft path."
        ),
    }

    new_id = insert_rewrite_event(rewrite_payload)
    log(
        f"rewrite_event_inserted id={new_id} src={src_id} "
        f"stubs={len(drafts)}"
    )

    msg_lines = [
        f"🤖 autoDream rewrite trigger — {today} 03:00Z",
        "",
        f"Phase 6 event {src_id} has {len(drafts)} stub drafts (hooks "
        f"296-372c, gate is 600c).",
        f"Rewrite event queued in agent_mailbox id={new_id} "
        f"(to_agent=claude-code).",
        "",
        "Stubs awaiting rewrite:",
    ]
    for i, d in enumerate(drafts):
        slot = i + 1
        fire = SLOT_TIMING[i] if i < len(SLOT_TIMING) else "n/a"
        beat = d.get("beat", "?")
        headline = (d.get("headline") or "")[:80]
        hook_len = len(d.get("hook") or "")
        msg_lines.append(
            f"  Slot {slot} {fire} {beat} (hook {hook_len}c)"
        )
        msg_lines.append(f"    {headline}")
    msg_lines.append("")
    msg_lines.append(
        "If no Claude Code session wakes by 06:00Z, hand-crafts via "
        "morning-signals-v2.sh fallback. Phase D briefing at 03:30Z "
        "will list fileable vs pending."
    )

    tg_send("\n".join(msg_lines))
    log("done")
    return 0


if __name__ == "__main__":
    sys.exit(main())
