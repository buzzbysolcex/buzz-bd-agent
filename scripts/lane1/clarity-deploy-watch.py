#!/usr/bin/env python3
"""Clarity/Stacks deploy-watch (Ogie msg 8108 TASK 4). Keeps the highest-p lane (thin-pool
Clarity, Doctrine #45) warm: detect NEW Clarity DeFi module deploys; auto-queue qualifying
ships at TOP. clarinet-sdk harness already built → near-zero marginal tooling to re-engage.

Source: Hiro /extended/v1/tx?type=smart_contract (152k+ deploys; reachable from box).
State: data/lane1/clarity-watch/seen.json (dedup). Output: new-deploys.jsonl + TOP-queue.md.

  python3 -u clarity-deploy-watch.py [--seed] [--limit N] [--notify]
    --seed   : first run — mark current deploys seen as baseline (report what WOULD flag), no queue writes
    --notify : post TOP hits to War Room (sources the bot env)
Reboot-survival: committed script + state file. Periodic run = operator-gated cron (flagged, not added).
"""
import sys, os, json, re, urllib.request, subprocess

ROOT = "/home/claude-code/buzz-workspace"
OUT = ROOT + "/data/lane1/clarity-watch"
SEEN = OUT + "/seen.json"
NEWQ = OUT + "/new-deploys.jsonl"
TOPQ = OUT + "/TOP-queue.md"
FEED = "https://api.hiro.so/extended/v1/tx?type=smart_contract&limit={n}"

# KNOWN Stacks/Clarity protocols WITH an Immunefi bounty / disclosure path.
KNOWN_BOUNTY = ["granite", "zest", "stacking-dao", "ststx", "stackingdao", "bitflow", "dlmm",
                "arkadiko", "usda", "hermetica", "usdh", "alex", "velar"]
# #45-DENSE known-bounty protocols (3+ top-tier audits / saturated) → NOT actionable, OPPORTUNISTIC only.
# ALEX = CoinFabrik x4 + Least Authority, core audit-excluded, post-hack -> demoted (Ogie msg 956).
DENSE_DEMOTE = ["alex"]
# DeFi-relevant contract-name signal (unknown protocol → MED, verify bounty at Step-1).
DEFI = re.compile(r"vault|pool|lend|borrow|stake|oracle|swap|market|mint|collateral|liquidat|"
                  r"reserve|cdp|stable|amm|perp|\bdex\b|tranche|yield|redeem|peg|escrow", re.I)
# noise to ignore even if DeFi-ish (test/mock/personal). Doctrine #48: non-production scaffolding
# is never a finding. NOTE name-substring match — 'script' deliberately OMITTED (would false-hit
# 'subscription'); the segment-exact full list (script/scripts/...) lives in scripts/lib/scope_path_filter.py.
NOISE = re.compile(r"test|mock|-demo|sandbox|tutorial|hello|example|shim|devnet|fixture", re.I)


def fetch(n):
    """Resilient: Hiro feed is flaky from the box (seen 000/500). Retry, then skip gracefully."""
    import time
    last = None
    for attempt in range(4):
        try:
            req = urllib.request.Request(FEED.format(n=n), headers={"User-Agent": "buzz-deploy-watch"})
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.loads(r.read()).get("results", [])
        except Exception as e:
            last = e
            if attempt < 3:
                try: time.sleep(5 * (attempt + 1))
                except Exception: pass
    print(f"[watch] Hiro feed unreachable after retries ({type(last).__name__}: {last}); skipping this run.")
    return []


def load_seen():
    if os.path.exists(SEEN):
        return set(json.load(open(SEEN)))
    return set()


def classify(cid):
    """3-way #45 fold: TOP=ACTIONABLE (known-bounty AND not-dense) · OPP=OPPORTUNISTIC (known-bounty
    BUT #45-dense, e.g. ALEX) · MED=WATCHLIST (DeFi-name, unknown bounty). None=ignore."""
    name = (cid.split(".", 1)[1] if "." in cid else cid).lower()
    if NOISE.search(name):
        return None
    if any(k in name for k in KNOWN_BOUNTY):
        return "OPP" if any(k in name for k in DENSE_DEMOTE) else "TOP"
    if DEFI.search(name):
        return "MED"
    return None


def notify_wr(lines):
    env = "/home/claude-code/.claude/channels/telegram/.env"
    msg = "🐝 CLARITY DEPLOY-WATCH — new qualifying ship(s):\n" + "\n".join(lines)
    try:
        sh = (f'set -a; . {env}; set +a; '
              f'curl -s -X POST "https://api.telegram.org/bot${{TELEGRAM_BOT_TOKEN:-$BOT_TOKEN}}/sendMessage" '
              f'--data-urlencode "chat_id=${{WAR_ROOM_CHAT_ID:--1003701758077}}" --data-urlencode text@- >/dev/null')
        subprocess.run(["bash", "-c", sh], input=msg.encode(), timeout=30)
    except Exception as e:
        print("[watch] WR notify failed:", e)


def main():
    seed = "--seed" in sys.argv
    notify = "--notify" in sys.argv
    limit = 50
    if "--limit" in sys.argv:
        limit = int(sys.argv[sys.argv.index("--limit") + 1])
    os.makedirs(OUT, exist_ok=True)
    results = fetch(limit)
    seen = load_seen()
    tops, opps, meds = [], [], []
    for r in results:
        cid = (r.get("smart_contract") or {}).get("contract_id")
        if not cid or cid in seen:
            continue
        cls = classify(cid)
        if cls == "TOP":
            tops.append(cid)
        elif cls == "OPP":
            opps.append(cid)
        elif cls == "MED":
            meds.append(cid)
    fresh_total = len([1 for r in results if (r.get("smart_contract") or {}).get("contract_id") not in seen])
    print(f"[watch] fetched={len(results)} unseen={fresh_total} TOP={len(tops)} OPP={len(opps)} MED={len(meds)}")
    for c in tops: print("  ACTIONABLE:", c)
    for c in opps: print("  OPPORTUNISTIC:", c)
    for c in meds: print("  WATCHLIST:", c)

    if seed:
        json.dump(sorted(seen | {(r.get("smart_contract") or {}).get("contract_id") for r in results if (r.get("smart_contract") or {}).get("contract_id")}), open(SEEN, "w"))
        print("[watch] SEED: baseline recorded, no queue writes. Future runs flag only NEW.")
        return
    # record qualifying ships (priority tag = current class; backlog split recomputes from cid so #45 demotes apply retroactively)
    if tops or opps or meds:
        with open(NEWQ, "a") as f:
            for c in tops: f.write(json.dumps({"cid": c, "priority": "TOP"}) + "\n")
            for c in opps: f.write(json.dumps({"cid": c, "priority": "OPP"}) + "\n")
            for c in meds: f.write(json.dumps({"cid": c, "priority": "MED"}) + "\n")
        with open(TOPQ, "a") as f:
            for c in tops: f.write(f"- [ACTIONABLE] {c} — thin+bounty Clarity protocol new deploy → Gate-1 NOW\n")
            for c in opps: f.write(f"- [OPPORTUNISTIC] {c} — known-bounty but #45-DENSE → only on a fresh-diff signal\n")
            for c in meds: f.write(f"- [WATCHLIST] {c} — new Clarity DeFi deploy → verify bounty/disclosure at Step-1\n")
    # update seen (all fetched)
    for r in results:
        cid = (r.get("smart_contract") or {}).get("contract_id")
        if cid: seen.add(cid)
    json.dump(sorted(seen), open(SEEN, "w"))
    # queue-DEPTH digest, 3-WAY #45 split — recomputed from cid so demotes apply to the existing backlog.
    a = o = w = 0
    if os.path.exists(NEWQ):
        for line in open(NEWQ):
            try:
                cid = json.loads(line).get("cid"); cl = classify(cid) if cid else None
                if cl == "TOP": a += 1
                elif cl == "OPP": o += 1
                elif cl == "MED": w += 1
            except Exception:
                pass
    print(f"[watch] queue-DEPTH (#45 3-way) — ACTIONABLE(thin+bounty+not-dense): {a} | OPPORTUNISTIC(bounty+dense): {o} | WATCHLIST(thin+no-bounty): {w}")
    if notify:
        digest = [f"new this run: {len(tops)} actionable + {len(opps)} opportunistic + {len(meds)} watchlist",
                  f"backlog #45-split — ACTIONABLE: {a} | OPPORTUNISTIC: {o} | WATCHLIST: {w}",
                  "(auto-QUEUED only — never auto-hunted; only ACTIONABLE drives a Gate-0 GO; OPPORTUNISTIC=fresh-diff-only; WATCHLIST waits for a bounty)"]
        digest += [f"ACTIONABLE {c}" for c in tops] + [f"OPP {c}" for c in opps] + [f"WL {c}" for c in meds[:4]]
        notify_wr(digest)


if __name__ == "__main__":
    main()
