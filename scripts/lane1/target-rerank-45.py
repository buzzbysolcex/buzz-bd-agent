#!/usr/bin/env python3
"""#45 + realizable-EV re-rank of the 883 bounty targets (Ogie msg 956 TASK 1).

The v1 scorer ranks by score then bounty_max DESC → pure cap-trap (Top-5 = Sky/Spark/GMX/
Olympus/Rhino, all 3+-top-tier-audited mega-caps). #45: find-prob is INVERSELY ~ audit/
competition-density; raw bounty W must not dominate. Fix = a density-TIER gate (THIN always
ranks above DENSE so the realizability term BITES) + realizable-EV = p·W·P(PoC)·P(accept)
within tier. DENSE (3+ top-tier audits / blue-chip / huge-cap-mature) → OPPORTUNISTIC, demoted
below every THIN target. Reads/writes target-scores.json siblings; non-destructive demo + the
logic mirrored into buzzshield-target-scorer.js.
"""
import json, sys, re

F = "/data/buzz/persistent/buzz-api/target-scores.json"

# ── #45.3 BOUNTY-LIVE GATE (Ogie msg 8176): an ENDED contest is NOT a live target → DROP (EV 0). ──
# Time-boxed contest platforms whose scope is combed-then-closed. A codehawks/c4 contest URL, or any
# slug with a YYYY-MM date older than ~90d, = a finished contest. (Sherlock /contests/ → COMBED demote.)
_DATE_SLUG = re.compile(r"/(20\d\d)-(0\d|1[0-2])-")  # /YYYY-MM- in the URL slug


def is_dead_contest(r):
    u = (r.get("url") or "").lower()
    plat = (r.get("platform") or "").lower()
    # codehawks + code4rena report/audit pages = finished, time-boxed contests
    if "codehawks.cyfrin.io/c/" in u:
        return True
    if "code4rena.com/reports" in u or "code4rena.com/audits" in u:
        return True
    # any platform with a past-dated YYYY-MM slug > ~90 days old (contest run is weeks)
    m = _DATE_SLUG.search(u)
    if m:
        y, mo = int(m.group(1)), int(m.group(2))
        # crude age in months vs a fixed "now" (2026-06); >3 months past a contest = ended
        age_months = (2026 - y) * 12 + (6 - mo)
        if age_months >= 3:
            return True
    return False


def is_contest_combed(r):
    # a LIVE bounty whose scope was already run through a finished crowd-contest → hard demote (COMBED).
    u = (r.get("url") or "").lower(); plat = (r.get("platform") or "").lower()
    return ("sherlock" in plat and "/contests/" in u) or ("cantina" in plat and "/competitions/" in u)


# Known 3+-top-tier-audited blue-chips / mega-programs = DENSE (#45 cap-traps). Lowercased substring match.
# (#45.3 saturation additions, Ogie msg 8176: Raydium/mETH/Flux/Nucleus = combed-by-everyone.)
BLUECHIP = ("raydium", "meth", "mantle", "flux", "nucleus",
            "sky", "spark", "gmx", "olympus", "rhino", "gnosis", "lido", "beanstalk", "aave",
            "compound", "uniswap", "curve", "makerdao", "maker", "morpho", "pendle", "eigenlayer",
            "pyth", "stargate", "frax", "balancer", "synthetix", "yearn", "convex", "1inch",
            "chainlink", "arbitrum", "optimism", "polygon", "starknet", "wormhole", "symbiotic", "renzo",
            # ETH-Foundation clients / L1 infra = MAX-scrutiny + NOT smart-contract-arsenal + hard-PoC = DENSE
            "ethereum-protocol", "lighthouse", "teku", "prysm", "nimbus", "besu", "reth", "grandine",
            "lodestar", "erigon", "geth", "nethermind", "consensus-spec", "execution-spec")
# Substrate NOT smart-contract-arsenal-fit (clients/zk/consensus/bridge) → P(PoC)≈low for us.
HARD_POC = ("bridge", " zk", "zk-", "precompile", "consensus", "validator", "prover", "cairo",
            "circuit", "client", "eth2", "execution-layer", "-node", "relayer", "sequencer")


def density_tier(r):
    name = (r.get("program") or "").lower()
    cap = r.get("bounty_max") or 0
    ac = (r.get("score_breakdown") or {}).get("audit_coverage")
    audit_n = r.get("audit_count")
    # explicit audit count wins
    if isinstance(audit_n, int) and audit_n >= 3:
        return "DENSE"
    if any(b in name for b in BLUECHIP):
        return "DENSE"
    # mega-cap (>=$1M) non-blue-chip = still high-competition/scrutiny → DENSE (contest platform is NOT a thinness signal)
    if cap >= 1_000_000:
        return "DENSE"
    # THIN = genuinely under-covered: small-mid cap (<$500K) OR an explicit under-audited signal, non-blue-chip
    if cap < 500_000 or (ac is not None and ac >= 8):
        return "THIN"
    return "MED"   # $500K-$1M non-blue-chip mid-tier


def realizable_ev(r, tier):
    cap = r.get("bounty_max") or 0
    bd = r.get("score_breakdown") or {}
    ac = bd.get("audit_coverage", 5) or 0          # 0..10, high = under-audited
    rec = bd.get("recency", 5) or 0                # 0..10, high = fresh
    name = (r.get("program") or "").lower()
    typ = ((r.get("type") or "") + " " + name).lower()
    # p(finding): inverse density. DENSE collapses; THIN high.
    p = {"DENSE": 0.01, "MED": 0.06, "THIN": 0.15}[tier]
    p *= 1 + (ac / 10) * 0.5 + (rec / 10) * 0.3    # under-audited + fresh nudge p up
    # W: realizable (cap, but a recoverable/realistic floor — dense mega-caps rarely pay max to a non-flagship researcher)
    W = cap
    # P(PoC-able): pure-logic high; precompile/zk/bridge/consensus low
    p_poc = 0.35 if any(h in typ for h in HARD_POC) else 0.7
    # P(accept): dense = dup/competition risk low; thin = higher
    p_acc = {"DENSE": 0.12, "MED": 0.3, "THIN": 0.45}[tier]
    kyc = r.get("kyc")
    if kyc is True or (isinstance(kyc, str) and kyc.lower() in ("yes", "required", "true")):
        p_acc *= 0.85
    return p * W * p_poc * p_acc


def main():
    arr = json.load(open(F))
    from collections import Counter
    # ── OLD ranking (pre-#45.3 gates): tier+EV only ──
    for r in arr:
        t0 = density_tier(r); r["_t0"] = t0; r["_ev0"] = round(realizable_ev(r, t0), 1)
    TR0 = {"THIN": 0, "MED": 1, "DENSE": 2}
    old5 = sorted(arr, key=lambda r: (TR0[r["_t0"]], -r["_ev0"]))[:5]
    # ── NEW ranking (with #45.3 gates: dead-drop + contest-combed demote + saturation) ──
    for r in arr:
        if is_dead_contest(r):
            r["_tier"] = "DEAD"; r["_realizable_ev"] = 0.0; continue
        t = density_tier(r)
        if is_contest_combed(r) and t != "DENSE":
            t = "COMBED"   # finished-contest scope → hard demote below THIN/MED
        r["_tier"] = t
        r["_realizable_ev"] = round(realizable_ev(r, "DENSE" if t == "COMBED" else t), 1)
    TIER_RANK = {"THIN": 0, "MED": 1, "COMBED": 2, "DENSE": 3, "DEAD": 9}
    live = [r for r in arr if r["_tier"] != "DEAD"]
    live.sort(key=lambda r: (TIER_RANK[r["_tier"]], -r["_realizable_ev"]))
    dead_n = sum(1 for r in arr if r["_tier"] == "DEAD")
    print("tier counts:", dict(Counter(r["_tier"] for r in arr)), f"| DROPPED dead-contest: {dead_n}/{len(arr)}")
    # ── #45.3 gate effect on the prior Top-5 ──
    print("\n=== #45.3 gate effect on the PRIOR Top-5 ===")
    removed = 0
    for r in old5:
        t = r["_tier"]
        if t == "DEAD": disp, hit = "DROPPED (dead contest)", True
        elif t in ("DENSE", "COMBED"): disp, hit = f"DEMOTED ({t})", True
        else: disp, hit = f"kept ({t})", False
        removed += 1 if hit else 0
        print(f"  {str(r.get('program'))[:24]:24s} {str(r.get('platform'))[:9]:9s} score={r.get('score')} -> {disp}")
    print(f"  => {removed}/5 of the prior Top-5 removed/demoted by the #45.3 gates")
    print("\n=== NEW Top-10 (#45.3: dead-dropped + contest-combed + saturation demoted) ===")
    for r in live[:10]:
        print(f"  [{r['_tier']:6s}] EV~${r['_realizable_ev']:>10,.0f}  {str(r.get('program'))[:26]:26s} {str(r.get('platform'))[:9]:9s} cap=${r.get('bounty_max') or 0:,} v1score={r.get('score')}")
    if "--write" in sys.argv:
        json.dump(live, open(F.replace(".json", "-rerank45.json"), "w"), indent=0)
        print("\nwrote", F.replace(".json", "-rerank45.json"))


if __name__ == "__main__":
    main()
