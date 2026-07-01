#!/usr/bin/env python3
"""stall-check.py — decide whether the main loop has silently stalled.

Run by stall-watchdog.sh from cron (an INDEPENDENT process — it does NOT share
the session that can stall). Joins two files:
  * heartbeat.json  (bumped by hooks on every turn/tool)  -> liveness
  * task-dag.json   (written by the session)              -> "is work open?"

A STALL = heartbeat is stale AND a task is genuinely mid-flight:
  - status == in_progress                          (must be advancing), OR
  - status == parked AND now > resume_at + grace   (a wait that never resumed)

Idle-with-nothing-open is NOT a stall (no false alarm between wake cycles).
Intentional waits (parked with resume_at) are NOT a stall until overdue.

Exit codes (consumed by stall-watchdog.sh):
  0   healthy / nothing open / not stalled
  10  STALL — ALERT NOW (alert text on stdout); de-dup state updated
  12  STALL — suppressed (alerted recently); text on stdout for logging only
  2   internal error

Env (all seconds unless noted):
  STALL_THRESHOLD_SEC  default 2700 (45m)  heartbeat-staleness that = stalled
  PARK_GRACE_SEC       default 2700 (45m)  slack after a parked task's resume_at
  RE_ALERT_SEC         default 3600 (60m)  re-alert cadence while still stalled
"""
import json, os, sys, time

STATE_DIR = os.environ.get("BUZZ_STATE_DIR", "/home/claude-code/buzz-workspace/state")
HB = os.path.join(STATE_DIR, "heartbeat.json")
DAG = os.path.join(STATE_DIR, "task-dag.json")
ALERT_STATE = os.path.join(STATE_DIR, "stall-alert.state")

STALL_THRESHOLD = int(os.environ.get("STALL_THRESHOLD_SEC", "2700"))
PARK_GRACE = int(os.environ.get("PARK_GRACE_SEC", "2700"))
RE_ALERT = int(os.environ.get("RE_ALERT_SEC", "3600"))

NOW = int(os.environ.get("STALL_NOW_OVERRIDE", str(int(time.time()))))  # test hook


def _read_json(p):
    try:
        with open(p) as f:
            return json.load(f)
    except Exception:
        return None


def _fmt_age(s):
    if s < 0:
        return "0s"
    d, r = divmod(s, 86400)
    h, r = divmod(r, 3600)
    m, _ = divmod(r, 60)
    out = []
    if d: out.append("%dd" % d)
    if h: out.append("%dh" % h)
    if m or not out: out.append("%dm" % m)
    return "".join(out)


def main():
    dag = _read_json(DAG) or {"tasks": {}}
    tasks = dag.get("tasks", {})

    # Partition open work.
    in_progress, parked_overdue = [], []
    for tid, t in tasks.items():
        st = t.get("status")
        if st == "in_progress":
            in_progress.append((tid, t))
        elif st == "parked":
            ra = t.get("resume_at")
            if ra is not None and NOW > (int(ra) + PARK_GRACE):
                parked_overdue.append((tid, t))
    if not in_progress and not parked_overdue:
        print("OK: no in-progress/overdue task; idle is fine.")
        return 0

    # Heartbeat age. Missing heartbeat while work is open = maximally stale.
    hb = _read_json(HB)
    if hb and "ts" in hb:
        hb_age = NOW - int(hb["ts"])
        hb_iso = hb.get("iso", "?")
    else:
        hb_age = 10 ** 9
        hb_iso = "MISSING"

    # What is ACTUALLY stalled — two independent tests (fixes the red-team gap
    # where a fresh heartbeat masked an overdue parked task):
    #   in_progress   -> stalled ONLY if heartbeat is stale (session went quiet)
    #   parked-overdue -> stalled REGARDLESS of heartbeat. A live session that
    #                     never resumed its own parked task past resume_at is the
    #                     dropped-work failure, even though it's beating elsewhere.
    stalled = []
    if hb_age > STALL_THRESHOLD:
        for tid, t in in_progress:
            stalled.append((tid, t, "in_progress-stale"))
    for tid, t in parked_overdue:
        stalled.append((tid, t, "parked-overdue"))

    if not stalled:
        print("OK: %d in-progress task(s), heartbeat fresh (%s ago); 0 parked-overdue."
              % (len(in_progress), _fmt_age(hb_age)))
        return 0

    # ---- STALL confirmed. Build alert. ----
    lines = []
    for tid, t, why in stalled:
        task_age = NOW - int(t.get("updated_at", NOW))
        if why == "parked-overdue":
            overdue = NOW - int(t.get("resume_at", NOW))
            detail = "overdue %s past resume_at (session may be alive but dropped this)" % _fmt_age(overdue)
        else:
            detail = "no heartbeat for %s (threshold %s)" % (_fmt_age(hb_age), _fmt_age(STALL_THRESHOLD))
        lines.append(
            "• task=%s [%s] phase=%s\n    %s · task-age=%s\n    resume: %s"
            % (tid, why, t.get("phase") or "-", detail, _fmt_age(task_age),
               t.get("resume_hint") or "(no resume hint recorded)"))
    ids = ",".join(tid for tid, _, _ in stalled)

    alert = (
        "\U0001F6A8 STALL WATCHDOG — open work is not advancing\n\n"
        "Heartbeat last beat: %s (%s ago; stall threshold %s)\n"
        "Stalled work:\n\n%s\n\n"
        "Re-kick: resume the task above from its recorded phase, or reply to clear."
        % (hb_iso, _fmt_age(hb_age), _fmt_age(STALL_THRESHOLD), "\n".join(lines))
    )

    # ---- De-dup / escalation ----
    prev = _read_json(ALERT_STATE) or {}
    same = prev.get("ids") == ids
    last = int(prev.get("last_alert", 0))
    if same and (NOW - last) < RE_ALERT:
        print(alert)  # for logging
        print("\n[suppressed: re-alert window %s not elapsed]" % _fmt_age(RE_ALERT), file=sys.stderr)
        return 12

    try:
        with open(ALERT_STATE, "w") as f:
            json.dump({"ids": ids, "last_alert": NOW,
                       "first_alert": (prev.get("first_alert") if same else NOW)}, f)
    except Exception:
        pass
    print(alert)
    return 10


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as e:
        print("stall-check internal error: %r" % e, file=sys.stderr)
        sys.exit(2)
