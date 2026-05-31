#!/usr/bin/env python3
"""P2 methodology content-wire — Tier 1 (Ogie msg 8078, 2026-05-31).

Reads promotion=True NEGATE-compound rows from the P4->P2 fanout ledger and emits
LEAK-SAFE methodology content drafts (tweet + Moltbook) for War Room approval.

DESIGN (leak-safe by construction):
  - The ledger row is ONLY a TRIGGER ("a new arsenal-win NEGATE landed"). This
    script NEVER reads the hunt file — so it cannot leak a live target/surface.
  - All content is drawn from a curated, generalized pool:
    data/lane1/p2-methodology/methodology-talking-points.json
  - Every draft is scanned against leak-forbidden-terms.txt; ANY hit BLOCKS the
    draft (not emitted) and is reported. Belt-and-suspenders over the curated pool.
  - NO auto-publish. Drafts land in drafts/<date>/ and are surfaced to the War
    Room by the operator/agent. `--approve <batch>` marks the covered ledger rows
    consumed so they never double-post.

USAGE:
  python3 scripts/lane1/p2-methodology-content.py --generate        # make a draft batch from new promotion=True rows
  python3 scripts/lane1/p2-methodology-content.py --list            # show pending batches + consumed/promotion counts
  python3 scripts/lane1/p2-methodology-content.py --approve <batch> # mark consumed after WR approval
"""
import argparse
import datetime
import json
import re
import sys
from pathlib import Path

WORKSPACE = Path(__file__).resolve().parent.parent.parent
BASE = WORKSPACE / "data" / "lane1" / "p2-methodology"
LEDGER = WORKSPACE / "data" / "lane1" / "p4-p2-drafts" / "p4-p2-fanout-ledger.md"
TALKING = BASE / "methodology-talking-points.json"
FORBIDDEN = BASE / "leak-forbidden-terms.txt"
STATE = BASE / "content-state.json"
DRAFTS = BASE / "drafts"

LEDGER_RE = re.compile(
    r"^-\s*(?P<date>\d{4}-\d{2}-\d{2})\s*\|\s*(?P<target>[^|]+?)\s*\|\s*(?P<verdict>[^|]+?)\s*\|"
    r"\s*(?P<types>[^|]*?)\s*\|\s*promotion=(?P<promo>True|False)\s*\|\s*(?P<hunt>.+?)\s*$"
)


def now_utc():
    # Date is injected by callers in tests; here we read the clock once at top-level.
    return datetime.datetime.now(datetime.timezone.utc)


def load_json(path, default):
    if path.exists():
        try:
            return json.loads(path.read_text())
        except Exception:
            return default
    return default


def load_state():
    return load_json(STATE, {"consumed": [], "pending": {}, "posted_lens_ids": []})


def save_state(state):
    BASE.mkdir(parents=True, exist_ok=True)
    STATE.write_text(json.dumps(state, indent=2))


def parse_ledger():
    """Return list of {hunt, target, verdict, date} for promotion=True rows."""
    rows = []
    if not LEDGER.exists():
        return rows
    for line in LEDGER.read_text(errors="replace").splitlines():
        m = LEDGER_RE.match(line.strip())
        if not m:
            continue
        if m.group("promo") != "True":
            continue
        rows.append({
            "hunt": m.group("hunt"),
            "target": m.group("target"),
            "verdict": m.group("verdict"),
            "date": m.group("date"),
        })
    return rows


def load_forbidden():
    plain, regex = [], []
    if not FORBIDDEN.exists():
        return plain, regex
    for ln in FORBIDDEN.read_text().splitlines():
        ln = ln.strip()
        if not ln or ln.startswith("#"):
            continue
        if ln.startswith("re:"):
            try:
                regex.append(re.compile(ln[3:], re.IGNORECASE))
            except re.error:
                pass
        else:
            plain.append(ln.lower())
    return plain, regex


def guardrail_violations(text):
    """Return list of forbidden terms/patterns found in text (leak check)."""
    plain, regex = load_forbidden()
    lo = text.lower()
    hits = []
    for term in plain:
        # word-ish boundary to avoid false hits inside longer benign words
        if re.search(r"(?<![a-z0-9])" + re.escape(term) + r"(?![a-z0-9])", lo):
            hits.append(term)
    for rx in regex:
        m = rx.search(text)
        if m:
            hits.append(f"re:{rx.pattern} -> '{m.group(0)}'")
    return hits


def pick_lens(tp, posted_ids):
    """Pick the freshest lens not yet posted; cycle if all used."""
    lenses = tp.get("lenses", [])
    fresh = [l for l in lenses if l["id"] not in posted_ids]
    pool = fresh if fresh else lenses
    return pool[0] if pool else None


TWEET_MAX = 280
URL_WEIGHT = 23  # Twitter counts any URL as 23 chars regardless of length


def _tweet_weight(s):
    """Approximate Twitter weighted length: URL=23, bee emoji counts ~2."""
    # collapse the audit URL to its weighted length
    n = len(s)
    if "shield.buzzbd.ai/audit" in s:
        n += URL_WEIGHT - len("shield.buzzbd.ai/audit")
    n += 1  # 🐝 surrogate buffer
    return n


def render_tweet(tp, lens, thesis):
    hook = lens.get("tweet") or (lens.get("claim", "").split(".")[0].strip() + ".")
    tags = " ".join(lens.get("hashtags", [])[:1] + ["#HonestScoring"])
    head = "🐝 New audit lens — "
    tail = f"\nshield.buzzbd.ai/audit {tags}"
    fixed = _tweet_weight(head) + _tweet_weight(tail)
    budget = TWEET_MAX - fixed
    if len(hook) > budget:
        # trim at a word boundary, leave room for the ellipsis
        cut = hook[: budget - 1]
        if " " in cut:
            cut = cut[: cut.rfind(" ")]
        hook = cut.rstrip(" ,;—-") + "…"
    return head + hook + tail


def render_moltbook(tp, lens, thesis):
    arsenal = tp.get("arsenal_state", {})
    headline = arsenal.get("headline", "")
    tags = " ".join(lens.get("hashtags", []) + ["#HonestScoring", "#BuildInPublic"])
    return f"""# Methodology drop: {lens['title']}

{headline}

## The lens

{lens['claim']}

## Why we publish the method, not the target

Every pass through our pipeline ends in one of two products: a confirmed, PoC-verified
finding (disclosed responsibly, through the program's own channel) — or a clean NEGATE
that compounds into a reusable lens like the one above. We publish the lens. We never
publish a live target or surface we're examining.

{thesis}

Full audit-tier surface: shield.buzzbd.ai/audit
Public scoring leaderboard: buzzbd.ai/scores

— @BuzzBySolCex  {tags}
"""


def cmd_generate(args):
    state = load_state()
    tp = load_json(TALKING, {})
    if not tp:
        print("[p2-content] talking-points pool missing/empty — nothing to draw from.", file=sys.stderr)
        return 2

    rows = parse_ledger()
    consumed = set(state["consumed"])
    pending_hunts = {h for b in state["pending"].values() for h in b["hunts"]}
    new = [r for r in rows if r["hunt"] not in consumed and r["hunt"] not in pending_hunts]

    if not new:
        print("[p2-content] no new promotion=True rows to convert. (nothing to do)")
        return 0

    lens = pick_lens(tp, state["posted_lens_ids"])
    if not lens:
        print("[p2-content] no lenses in pool.", file=sys.stderr)
        return 2
    thesis = (tp.get("thesis_lines") or ["Honest calibration scales."])[
        len(state["posted_lens_ids"]) % max(1, len(tp.get("thesis_lines", [1])))
    ]

    tweet = render_tweet(tp, lens, thesis)
    moltbook = render_moltbook(tp, lens, thesis)

    # GUARDRAIL — block on any leak.
    violations = guardrail_violations(tweet) + guardrail_violations(moltbook)
    if violations:
        print("[p2-content] 🚫 GUARDRAIL BLOCKED — leak terms in draft, NOT emitting:",
              file=sys.stderr)
        for v in sorted(set(violations)):
            print(f"    - {v}", file=sys.stderr)
        print("[p2-content] Generalize the talking-points entry harder, then re-run.", file=sys.stderr)
        return 3

    date = args.date or now_utc().strftime("%Y-%m-%d")
    batch_id = f"{date}-{lens['id']}"
    out_dir = DRAFTS / date
    out_dir.mkdir(parents=True, exist_ok=True)
    tweet_path = out_dir / f"{batch_id}-tweet.md"
    molt_path = out_dir / f"{batch_id}-moltbook.md"
    tweet_path.write_text(tweet + "\n")
    molt_path.write_text(moltbook)

    state["pending"][batch_id] = {
        "lens_id": lens["id"],
        "hunts": [r["hunt"] for r in new],
        "targets_count": len(new),
        "tweet": str(tweet_path.relative_to(WORKSPACE)),
        "moltbook": str(molt_path.relative_to(WORKSPACE)),
        "generated_at": now_utc().isoformat(),
        "status": "pending-WR-approval",
    }
    save_state(state)

    print(f"[p2-content] ✅ batch {batch_id} — {len(new)} promotion-event(s) → leak-safe drafts (GUARDRAIL passed)")
    print(f"  trigger hunts: {', '.join(r['hunt'] for r in new)}")
    print(f"  tweet:    {tweet_path.relative_to(WORKSPACE)}")
    print(f"  moltbook: {molt_path.relative_to(WORKSPACE)}")
    print("\n===== TWEET DRAFT =====\n" + tweet)
    print("\n===== MOLTBOOK DRAFT =====\n" + moltbook)
    print(f"\n[p2-content] NOT published. After WR approval: --approve {batch_id}")
    return 0


def cmd_list(_args):
    state = load_state()
    rows = parse_ledger()
    print(f"[p2-content] promotion=True ledger rows: {len(rows)} | consumed: {len(state['consumed'])} | pending batches: {len(state['pending'])}")
    for bid, b in state["pending"].items():
        print(f"  PENDING {bid}: lens={b['lens_id']} covers={b['targets_count']} status={b['status']}")
    return 0


def cmd_approve(args):
    state = load_state()
    b = state["pending"].pop(args.batch, None)
    if not b:
        print(f"[p2-content] no pending batch '{args.batch}'", file=sys.stderr)
        return 1
    for h in b["hunts"]:
        if h not in state["consumed"]:
            state["consumed"].append(h)
    if b["lens_id"] not in state["posted_lens_ids"]:
        state["posted_lens_ids"].append(b["lens_id"])
    save_state(state)
    print(f"[p2-content] ✅ approved {args.batch} — {len(b['hunts'])} hunt(s) marked consumed; lens '{b['lens_id']}' marked posted. No double-post.")
    return 0


def main():
    ap = argparse.ArgumentParser(description="P2 methodology content-wire (leak-safe)")
    ap.add_argument("--generate", action="store_true", help="generate a draft batch from new promotion=True rows")
    ap.add_argument("--list", action="store_true", help="list pending/consumed state")
    ap.add_argument("--approve", metavar="BATCH", help="mark a batch consumed after WR approval")
    ap.add_argument("--date", help="override UTC date (YYYY-MM-DD), for deterministic runs")
    args = ap.parse_args()
    if args.approve:
        return cmd_approve(args)
    if args.list:
        return cmd_list(args)
    if args.generate:
        return cmd_generate(args)
    ap.print_help()
    return 0


if __name__ == "__main__":
    sys.exit(main())
