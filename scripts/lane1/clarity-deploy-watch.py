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

# KNOWN Stacks/Clarity protocols WITH an Immunefi bounty / disclosure path → a NEW contract = TOP auto-queue.
KNOWN_BOUNTY = ["granite", "zest", "stacking-dao", "ststx", "stackingdao", "bitflow", "dlmm",
                "arkadiko", "usda", "hermetica", "usdh", "alex", "velar"]
# DeFi-relevant contract-name signal (unknown protocol → MED, verify bounty at Step-1).
DEFI = re.compile(r"vault|pool|lend|borrow|stake|oracle|swap|market|mint|collateral|liquidat|"
                  r"reserve|cdp|stable|amm|perp|\bdex\b|tranche|yield|redeem|peg|escrow", re.I)
# noise to ignore even if DeFi-ish (test/mock/personal).
NOISE = re.compile(r"test|mock|-demo|sandbox|tutorial|hello|example", re.I)


def fetch(n):
    req = urllib.request.Request(FEED.format(n=n), headers={"User-Agent": "buzz-deploy-watch"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read()).get("results", [])


def load_seen():
    if os.path.exists(SEEN):
        return set(json.load(open(SEEN)))
    return set()


def classify(cid):
    name = cid.split(".", 1)[1] if "." in cid else cid
    if NOISE.search(name):
        return None
    if any(k in name.lower() for k in KNOWN_BOUNTY):
        return "TOP"
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
    tops, meds = [], []
    for r in results:
        cid = (r.get("smart_contract") or {}).get("contract_id")
        if not cid or cid in seen:
            continue
        cls = classify(cid)
        if cls == "TOP":
            tops.append(cid)
        elif cls == "MED":
            meds.append(cid)
    fresh_total = len([1 for r in results if (r.get("smart_contract") or {}).get("contract_id") not in seen])
    print(f"[watch] fetched={len(results)} unseen={fresh_total} TOP={len(tops)} MED={len(meds)}")
    for c in tops:
        print("  TOP:", c)
    for c in meds:
        print("  MED:", c)

    if seed:
        json.dump(sorted(seen | {(r.get("smart_contract") or {}).get("contract_id") for r in results if (r.get("smart_contract") or {}).get("contract_id")}), open(SEEN, "w"))
        print("[watch] SEED: baseline recorded, no queue writes. Future runs flag only NEW.")
        return
    # record qualifying ships
    if tops or meds:
        with open(NEWQ, "a") as f:
            for c in tops: f.write(json.dumps({"cid": c, "priority": "TOP"}) + "\n")
            for c in meds: f.write(json.dumps({"cid": c, "priority": "MED"}) + "\n")
        with open(TOPQ, "a") as f:
            for c in tops: f.write(f"- [TOP] {c} — known-bounty Clarity protocol new deploy → Gate-1 NOW\n")
            for c in meds: f.write(f"- [MED] {c} — new Clarity DeFi deploy → verify bounty/disclosure at Step-1\n")
        if notify and tops:
            notify_wr([f"TOP {c}" for c in tops])
    # update seen (all fetched)
    for r in results:
        cid = (r.get("smart_contract") or {}).get("contract_id")
        if cid: seen.add(cid)
    json.dump(sorted(seen), open(SEEN, "w"))


if __name__ == "__main__":
    main()
