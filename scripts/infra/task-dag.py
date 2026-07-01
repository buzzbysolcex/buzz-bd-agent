#!/usr/bin/env python3
"""task-dag.py — the durable task-dag the stall-watchdog reads.

The main loop (this Claude session) records long-running work here so that an
INDEPENDENT process can tell "a task is open and should be advancing" apart from
"nothing is running, all quiet". That distinction is the whole point: the
3.5-day stall was an OPEN task with no liveness and nothing watching.

Statuses:
  open        queued, not started (no heartbeat expectation yet)
  in_progress actively being worked  -> heartbeat MUST stay fresh, else STALL
  parked      intentionally waiting (build/subagent/ScheduleWakeup) -> carries
              resume_at; only considered stalled AFTER resume_at + grace
  done        finished (ignored by the watchdog)

Every task carries a `resume_hint` (a one-line "next phase" pointer) so a stall
alert can be re-kicked in a single message.

Usage:
  task-dag.py open   <id> "<desc>" [--hint "<resume hint>"]
  task-dag.py start  <id> [--phase P] [--hint "..."] [--desc "..."]
  task-dag.py phase  <id> --phase P [--hint "..."]
  task-dag.py park   <id> --for 30m|--until <epoch> [--hint "..."]
  task-dag.py done   <id>
  task-dag.py list [--json]
  task-dag.py get    <id>
"""
import json, os, sys, time, argparse, tempfile

STATE_DIR = os.environ.get("BUZZ_STATE_DIR", "/home/claude-code/buzz-workspace/state")
DAG = os.path.join(STATE_DIR, "task-dag.json")


def _now():
    return int(time.time())


def _load():
    os.makedirs(STATE_DIR, exist_ok=True)
    if not os.path.exists(DAG):
        return {"tasks": {}, "updated_at": _now()}
    try:
        with open(DAG) as f:
            return json.load(f)
    except Exception:
        # Never crash the loop on a corrupt file; start fresh but keep a copy.
        try:
            os.rename(DAG, DAG + ".corrupt.%d" % _now())
        except Exception:
            pass
        return {"tasks": {}, "updated_at": _now()}


def _save(d):
    d["updated_at"] = _now()
    # Atomic write so the watchdog never reads a half-written file.
    fd, tmp = tempfile.mkstemp(dir=STATE_DIR, prefix=".task-dag.", suffix=".tmp")
    with os.fdopen(fd, "w") as f:
        json.dump(d, f, indent=2)
    os.replace(tmp, DAG)


def _parse_for(s):
    """'30m' '2h' '90s' '3600' -> seconds"""
    s = s.strip().lower()
    mult = {"s": 1, "m": 60, "h": 3600, "d": 86400}
    if s and s[-1] in mult:
        return int(float(s[:-1]) * mult[s[-1]])
    return int(float(s))


def _touch(t):
    t["updated_at"] = _now()


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    for c in ("open", "start", "phase", "park", "done", "get"):
        p = sub.add_parser(c)
        p.add_argument("id")
        p.add_argument("desc_pos", nargs="?", default=None)
        p.add_argument("--desc", default=None)
        p.add_argument("--phase", default=None)
        p.add_argument("--hint", default=None)
        p.add_argument("--for", dest="for_", default=None)
        p.add_argument("--until", default=None)
    pl = sub.add_parser("list")
    pl.add_argument("--json", action="store_true")
    args = ap.parse_args()

    d = _load()
    tasks = d["tasks"]

    if args.cmd == "list":
        if args.json:
            print(json.dumps(d, indent=2))
        else:
            if not tasks:
                print("(task-dag empty)")
            for tid, t in sorted(tasks.items()):
                age = _now() - t.get("updated_at", _now())
                print("[%s] %-12s phase=%s age=%ds hint=%s :: %s" % (
                    tid, t.get("status"), t.get("phase"), age,
                    (t.get("resume_hint") or "-"), t.get("desc", "")))
        return

    tid = args.id
    t = tasks.get(tid, {"id": tid, "created_at": _now()})
    desc = args.desc or args.desc_pos

    if args.cmd == "open":
        t.update({"status": "open", "desc": desc or t.get("desc", ""),
                  "phase": t.get("phase"), "resume_hint": args.hint or t.get("resume_hint")})
    elif args.cmd == "start":
        t["status"] = "in_progress"
        if desc: t["desc"] = desc
        if args.phase: t["phase"] = args.phase
        if args.hint: t["resume_hint"] = args.hint
        t.pop("resume_at", None)
    elif args.cmd == "phase":
        t["status"] = "in_progress"
        if args.phase: t["phase"] = args.phase
        if args.hint: t["resume_hint"] = args.hint
        t.pop("resume_at", None)
    elif args.cmd == "park":
        t["status"] = "parked"
        if args.until:
            t["resume_at"] = int(args.until)
        elif args.for_:
            t["resume_at"] = _now() + _parse_for(args.for_)
        else:
            print("park needs --for <dur> or --until <epoch>", file=sys.stderr); sys.exit(2)
        if args.phase: t["phase"] = args.phase
        if args.hint: t["resume_hint"] = args.hint
    elif args.cmd == "done":
        t["status"] = "done"
    elif args.cmd == "get":
        print(json.dumps(t, indent=2)); return

    _touch(t)
    tasks[tid] = t
    _save(d)
    print("ok: [%s] -> %s" % (tid, t["status"]))


if __name__ == "__main__":
    main()
