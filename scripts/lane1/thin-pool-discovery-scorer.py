#!/usr/bin/env python3
"""Thin-pool discovery scorer (Ogie msg 8123). Fixes the UNIVERSE + makes density BITE.

DIAGNOSIS (T1): the v1 scorer ranked the PUBLIC bug-bounty/contest list (immunefi/codehawks/...).
Thin-pool is structurally absent there. Failing term = audit_coverage: missing audit_count + a
contest platform scored 10 ("under-audited") — backwards (a CodeHawks contest = whole-crowd-combed
= MAX density). That floated Raydium/zkSync-Era.

FIX: T2 primary input = DeFiLlama protocol-discovery feed (small/thin protocols, SAME source as
HSaaS sourcing); the public-program list = a SEPARATE opportunistic tier. T3 real competition-density
signals: TVL-rank/prominence + audits-count + competitive-audit-CONTEST history (on the public-program
list = HEAVY demote) + known-major/exploit demote.

VALIDATION GATE (hard): Top-5 must contain NO top-50-TVL, NO public-contest protocol, NO known major.
"""
import json, sys, urllib.request

LLAMA = "https://api.llama.fi/protocols"
PROGRAMS = "/data/buzz/persistent/buzz-api/target-scores.json"  # the public-program list (contest/bounty-combed)
KNOWN_MAJOR = ("raydium", "zksync", "era", "meth", "mantle", "flux", "ondo", "lido", "aave", "uniswap",
               "curve", "compound", "gmx", "pyth", "sky", "spark", "morpho", "pendle", "ethena", "eigen",
               "jupiter", "orca", "marinade", "jito", "kamino", "drift", "aerodrome", "velodrome", "pancake",
               "sanctum", "swissborg", "obol", "solvbtc", "merlin", "doublezero", "hyperliquid", "nexo",
               "bedrock", "phemex", "binance", "bitget", "okx", "bybit")
# Exploit-history demote (T3): publicly-exploited = scrutinized + patched + crowd-combed post-mortem = DENSE.
KNOWN_REKT = ("penpie", "magnate", "radiant", "onyx", "sonne", "hundred", "platypus", "rari",
              "euler", "hope", "gamma", "conic", "prisma", "kyberswap", "exactly", "deus")
TOP_TVL_DEMOTE = 300        # top-N-TVL = prominence = max competition = DENSE (deepened from 50)
TVL_FLOOR = 100_000         # below = dust / dead, not worth a hunt
TVL_CEIL = 10_000_000       # above = prominent (DeFiLlama audits=0 unreliable for big names) = NOT thin
# Only categories with custom auditable on-chain contracts (exclude CEX/Chain/custodial/wallet).
CONTRACT_DEFI = {"Dexs", "Lending", "Yield", "CDP", "Derivatives", "Yield Aggregator", "Farm",
                 "Leveraged Farming", "Options", "Options Vault", "Synthetics", "Algo-Stables",
                 "Insurance", "Launchpad", "RWA Lending", "Liquid Staking", "Liquid Restaking",
                 "Restaking", "Staking Pool", "Bridge", "Decentralized Stablecoin", "Lending Pool"}

# ── #45 RE-WEIGHT (Ogie 2026-06-05): bias audit-THIN × complexity-HIGH × recent × ORIGINAL. ──
# Rationale: the real candidate (Arkadiko) came from thin-audit Clarity, NOT EVM majors. Demote
# audit-dense majors (NEGATE-prone) and FORKS (#46: fork inherits base audit → p(net-new) only in delta).
import time as _time
NOW = _time.time()
HIGH_COMPLEXITY = {"CDP", "Lending", "Lending Pool", "Derivatives", "Synthetics", "Options",
                   "Options Vault", "Leveraged Farming", "RWA Lending", "Restaking",
                   "Liquid Restaking", "Bridge", "Yield Aggregator", "Decentralized Stablecoin"}
LOW_COMPLEXITY = {"Dexs", "Liquid Staking", "Staking Pool", "Farm"}  # often forks / simpler surface


def complexity_mult(p):
    cat = p.get("category") or ""
    if cat in HIGH_COMPLEXITY: return 1.3
    if cat in LOW_COMPLEXITY: return 0.8
    return 1.0


def is_fork(p):
    return bool(p.get("forkedFrom"))  # DeFiLlama forkedFrom[] non-empty = #46 fork


def recency_mult(p):
    la = p.get("listedAt")  # DeFiLlama listing unix ts — rough freshness proxy (#42)
    try:
        age_days = (NOW - float(la)) / 86400.0
    except Exception:
        return 1.0
    return 1.2 if age_days <= 180 else (1.0 if age_days <= 540 else 0.9)


def fetch_json(url, timeout=60):
    req = urllib.request.Request(url, headers={"User-Agent": "buzz-thin-scorer"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read())


def main():
    prot = fetch_json(LLAMA)
    # contest/bounty-combed set: names on the public-program list
    try:
        progs = json.load(open(PROGRAMS))
        combed = {(p.get("program") or "").strip().lower() for p in progs}
    except Exception:
        combed = set()
    # TVL-rank
    ranked = sorted([p for p in prot if (p.get("tvl") or 0) > 0], key=lambda p: -(p.get("tvl") or 0))
    tvl_rank = {p.get("name"): i + 1 for i, p in enumerate(ranked)}

    def audits_n(p):
        a = p.get("audits")
        try: return int(a)
        except Exception: return 0

    def is_combed(name):
        n = name.lower()
        return any(n == c or (c and c in n) for c in combed if len(c) > 3)

    def tier(p):
        name = (p.get("name") or ""); n = name.lower()
        rank = tvl_rank.get(name, 99999); tvl = p.get("tvl") or 0
        cat = p.get("category") or ""
        if is_fork(p): return "FORK"                            # #46: fork inherits base audit -> out of THIN pool
        if any(m in n for m in KNOWN_MAJOR): return "DENSE"      # known major (incl. the false-pass names)
        if any(x in n for x in KNOWN_REKT): return "DENSE"       # exploit history = scrutinized/combed (T3)
        if rank <= TOP_TVL_DEMOTE: return "DENSE"                # top-300 TVL prominence = crowd-watched
        if tvl > TVL_CEIL: return "DENSE"                        # >$10M = prominent (DeFiLlama audits=0 unreliable here)
        if audits_n(p) >= 3: return "DENSE"                      # 3+ audits
        if is_combed(name): return "DENSE"                       # ran a public bounty/audit contest = crowd-combed
        if cat not in CONTRACT_DEFI: return "DENSE"              # CEX/Chain/custodial/wallet = no auditable custom contract
        if tvl < TVL_FLOOR: return "DENSE"                       # dust/dead
        if audits_n(p) >= 1: return "MED"                        # 1-2 audits = partial coverage
        return "THIN"                                            # audits=0, $100K-$10M, contract-DeFi, not-top-300, not-combed, not-major

    def ev(p, t):
        tvl = p.get("tvl") or 0
        # p(finding): thin high. W: TVL impact-at-risk (already <=$10M for THIN). P(PoC): DeFi-contract good. P(accept): research/disclosure.
        pf = {"DENSE": 0.01, "MED": 0.06, "THIN": 0.18, "FORK": 0.005}[t]
        has_contact = bool(p.get("twitter") or p.get("url")); has_addr = bool(p.get("address"))
        W = min(tvl, TVL_CEIL)
        p_poc = 0.7 if has_addr else 0.45
        p_acc = 0.4 if has_contact else 0.2
        # #45 re-weight: × complexity (HIGH-surface protocols) × recency (#42) × (forks already → FORK tier)
        return round(pf * W * p_poc * p_acc * complexity_mult(p) * recency_mult(p), 1)

    for p in prot:
        p["_tier"] = tier(p); p["_ev"] = ev(p, p["_tier"]); p["_tvl_rank"] = tvl_rank.get(p.get("name"), 99999)
    thin = [p for p in prot if p["_tier"] == "THIN"]
    thin.sort(key=lambda p: -p["_ev"])
    from collections import Counter
    print("DeFiLlama protocols:", len(prot), "| tier counts:", dict(Counter(p["_tier"] for p in prot)))
    print(f"\n=== THIN-POOL Top-10 (discovery feed; audits=0, TVL-rank>{TOP_TVL_DEMOTE}, not-combed, not-major) ===")
    for p in thin[:10]:
        print(f"  EV~${p['_ev']:>9,.0f}  {str(p.get('name'))[:26]:26s} tvl=${int(p.get('tvl') or 0):>11,} tvl#{p['_tvl_rank']:>4} audits={p.get('audits')} cat={str(p.get('category'))[:16]:16s} {(p.get('chains') or ['?'])[0]}")

    # ── HARD VALIDATION GATE ──
    top5 = thin[:5]
    fails = []
    for p in top5:
        n = (p.get("name") or "").lower()
        if any(m in n for m in KNOWN_MAJOR): fails.append(f"{p.get('name')}=known-major")
        if p["_tvl_rank"] <= TOP_TVL_DEMOTE: fails.append(f"{p.get('name')}=top-{TOP_TVL_DEMOTE}-TVL(#{p['_tvl_rank']})")
        if is_combed(p.get("name") or ""): fails.append(f"{p.get('name')}=public-contest/bounty")
        if audits_n(p) >= 1: fails.append(f"{p.get('name')}=audited({p.get('audits')})")
    print("\n=== VALIDATION GATE ===")
    if fails:
        print("❌ FAILED:", "; ".join(fails), "\n→ iterate, do NOT ship.")
    else:
        print("✅ PASS — Top-5 are thin-audit discovery-feed protocols (no top-50-TVL, no contest, no major):")
        for p in top5: print(f"   • {p.get('name')} (${int(p.get('tvl') or 0):,} TVL, audits={p.get('audits')}, {(p.get('chains') or ['?'])[0]}, tvl#{p['_tvl_rank']})")
    if "--write" in sys.argv:
        out = "/home/claude-code/buzz-workspace/data/lane1/thin-pool-discovery.jsonl"
        with open(out, "w") as f:
            for p in thin[:100]:
                f.write(json.dumps({k: p.get(k) for k in ("name", "slug", "tvl", "audits", "category", "chains", "address", "twitter", "url", "_ev", "_tier", "_tvl_rank")}) + "\n")
        print("\nwrote", out, f"({min(100,len(thin))} thin candidates)")


if __name__ == "__main__":
    main()
