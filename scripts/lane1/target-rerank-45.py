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
import json, sys

F = "/data/buzz/persistent/buzz-api/target-scores.json"
# Known 3+-top-tier-audited blue-chips / mega-programs = DENSE (#45 cap-traps). Lowercased substring match.
BLUECHIP = ("sky", "spark", "gmx", "olympus", "rhino", "gnosis", "lido", "beanstalk", "aave",
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
    for r in arr:
        t = density_tier(r)
        r["_tier"] = t
        r["_realizable_ev"] = round(realizable_ev(r, t), 1)
    TIER_RANK = {"THIN": 0, "MED": 1, "DENSE": 2}
    arr.sort(key=lambda r: (TIER_RANK[r["_tier"]], -r["_realizable_ev"]))
    from collections import Counter
    print("tier counts:", dict(Counter(r["_tier"] for r in arr)))
    print("\n=== NEW Top-10 (#45 + realizable-EV: THIN-tier first, then EV) ===")
    for r in arr[:10]:
        print(f"  [{r['_tier']:5s}] EV~${r['_realizable_ev']:>10,.0f}  {str(r.get('program'))[:26]:26s} {str(r.get('platform'))[:9]:9s} cap=${r.get('bounty_max') or 0:,} v1score={r.get('score')}")
    print("\n=== (for contrast) where the old cap-trap Top-5 landed now ===")
    for nm in ("Sky", "Spark", "GMX", "Olympus", "Rhino.fi"):
        for i, r in enumerate(arr):
            if (r.get("program") or "") == nm:
                print(f"  {nm}: now rank #{i+1} tier={r['_tier']} EV~${r['_realizable_ev']:,.0f}")
                break
    if "--write" in sys.argv:
        json.dump(arr, open(F.replace(".json", "-rerank45.json"), "w"), indent=0)
        print("\nwrote", F.replace(".json", "-rerank45.json"))


if __name__ == "__main__":
    main()
