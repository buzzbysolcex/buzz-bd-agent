#!/usr/bin/env python3
"""SECONDARY / manual one-shot target-scorer finalizer (Ogie msg 8227, 2026-06-11).

>>> CANONICAL gate now lives in `.tmp-build/v6/buzzshield-target-scorer.js` (the 05:00 UTC cron) <<<
This script was the one-shot that re-gated today's canonical file BEFORE the JS rebuilder was
patched; the durable source-level fix is in the JS scorer (isDeadContest45 + saturation + COMBED).
Keep this only as a manual emergency re-gate / verifier. NOTE: it tiers $500K as MED (the JS tiers
$500K-with-high-audit_coverage as THIN) — the JS output is authoritative on that boundary.

WHY THIS EXISTS — the #45.3 bug:
  `target-rerank-45.py` computed the dead-contest + saturation gates but wrote them to a
  NON-DESTRUCTIVE DEMO SIBLING (`target-scores-rerank45.json`). The canonical
  `target-scores.json` — the file every consumer actually ranks from — never received the
  gate, so each rebuild re-surfaced dead contests (e.g. "Era" = codehawks 2024-10-zksync,
  ended 2024-12-02) at the top by realizable_ev. The gate "didn't survive the rebuild"
  because it never wrote the path the ranker reads.

THE FIX (this script): the gates are baked IN-PLACE into the SAME fields the ranker already
  uses — `realizable_ev` (DEAD -> 0.0; saturation-demoted) and `density_tier` — and written
  back to the CANONICAL target-scores.json (raw backed up to target-scores.raw-<ts>.json).
  New audit fields (`live_gate`, `dead_reason`, `saturation_reason`, `realizable_ev_raw`,
  `final_tier`) are added for transparency, but correctness does NOT depend on any consumer
  knowing about them — the legacy `realizable_ev` ordering is now correct on its own.

  Idempotent: re-running re-derives from `realizable_ev_raw` (preserved), never double-applies.

DEAD-CONTEST GATE (end-date / state based, NOT a "live" status string):
  A program is DEAD (EV 0, dropped from the live ranking) if ANY of:
   1. an explicit end/close field (end_date/close_date/contest_end/ends_at) parses to a PAST date;
   2. an explicit status/state in DEAD_STATES (judging, appeals, rewards-distribution, complete, ...);
   3. it is a time-boxed CONTEST whose end is past: codehawks / code4rena entries, or any
      cantina /competitions/ or URL carrying a /YYYY-MM-/ slug whose month is >= DEAD_AGE_MONTHS
      months before NOW_Y/NOW_M.
  We NEVER treat a "live"/"the contest is live" string as a keep-signal (the CodeHawks page
  template always says that — it is exactly what fooled the old live-status gate).

SATURATION PENALTY (realizable EV != bounty magnitude):
  marquee/blue-chip (combed-by-everyone) -> DENSE; mega-cap >= $1M -> DENSE;
  live-but-crowd-combed contest (cantina /competitions/ not yet ended) -> COMBED;
  small/mid non-marquee -> THIN/MED by cap. p(find) & p(accept) collapse for DENSE/COMBED so
  $500K marquees (Raydium/Flux/Nucleus/mETH tier) fall below genuinely thin, uncombed targets.

Usage:  python3 target-scorer-finalize.py            # dry-run: prints corrected Top-10 + Era check
        python3 target-scorer-finalize.py --write    # overwrites canonical (backs up raw first)
"""
import json, sys, re, datetime

F = "/data/buzz/persistent/buzz-api/target-scores.json"

# Fixed "now" — derived from the run date so slug-age is stable within a run.
NOW_Y, NOW_M = 2026, 6
DEAD_AGE_MONTHS = 2          # a contest whose slug month is >= 2 months past has ended (contests run weeks)
DEAD_STATES = ("judging", "appeal", "reward", "distribut", "complete", "completed",
               "finished", "ended", "closed", "archiv", "resolved", "settled")
CONTEST_PLATFORMS = ("codehawks", "code4rena")   # time-boxed crowd contests (finished archives)

_DATE_SLUG = re.compile(r"/(20\d\d)-(0\d|1[0-2])(?:-|/|$)")   # /YYYY-MM in the URL slug

# Marquee / blue-chip programs = combed-by-everyone (high researcher density, dup-saturated).
BLUECHIP = ("raydium", "meth", "mantle", "flux", "nucleus",
            "sky", "spark", "gmx", "olympus", "rhino", "gnosis", "lido", "beanstalk", "aave",
            "compound", "uniswap", "curve", "makerdao", "maker", "morpho", "pendle", "eigenlayer",
            "pyth", "stargate", "frax", "balancer", "synthetix", "yearn", "convex", "1inch",
            "chainlink", "arbitrum", "optimism", "polygon", "starknet", "wormhole", "symbiotic",
            "renzo", "ethena", "usual", "etherfi", "ether.fi", "kelp", "swell", "puffer", "karak",
            # ETH-Foundation clients / L1 infra = max-scrutiny, not SC-arsenal, hard-PoC = DENSE
            "ethereum-protocol", "lighthouse", "teku", "prysm", "nimbus", "besu", "reth",
            "grandine", "lodestar", "erigon", "geth", "nethermind", "consensus-spec", "execution-spec")
HARD_POC = ("bridge", " zk", "zk-", "precompile", "consensus", "validator", "prover", "cairo",
            "circuit", "client", "eth2", "execution-layer", "-node", "relayer", "sequencer")


def _parse_date(v):
    if not v or not isinstance(v, str):
        return None
    s = v.strip().replace("Z", "")
    for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M", "%Y-%m-%d", "%Y/%m/%d", "%m/%d/%Y"):
        try:
            return datetime.datetime.strptime(s[:len(fmt) + 6] if "T" in fmt else s[:10], fmt)
        except Exception:
            continue
    return None


def _months_past(y, mo):
    return (NOW_Y - y) * 12 + (NOW_M - mo)


def is_dead_contest(r):
    """Return (dead: bool, reason: str). End-date / state driven; never a 'live' string."""
    url = (r.get("url") or "").lower()
    plat = (r.get("platform") or "").lower()
    name = (r.get("program") or "").lower()

    # 1. explicit end/close date field in the past (future-proof for when the feed adds it)
    for k in ("end_date", "close_date", "contest_end", "ends_at", "ended_at", "deadline"):
        d = _parse_date(r.get(k))
        if d and (d.year, d.month, d.day) < (NOW_Y, NOW_M, 2):
            return True, f"end_date_past:{k}={r.get(k)}"

    # 2. explicit terminal state/status
    st = " ".join(str(r.get(k) or "") for k in ("status", "state", "phase")).lower()
    for token in DEAD_STATES:
        if token in st:
            return True, f"state:{st.strip()}"

    # 3. time-boxed contest whose run has ended (slug-month derived)
    is_contest = (plat in CONTEST_PLATFORMS
                  or "codehawks.cyfrin.io/c/" in url
                  or "code4rena.com/report" in url or "code4rena.com/audit" in url
                  or (plat == "cantina" and "/competitions/" in url))
    m = _DATE_SLUG.search(url)
    if m:
        y, mo = int(m.group(1)), int(m.group(2))
        if _months_past(y, mo) >= DEAD_AGE_MONTHS:
            return True, f"contest_slug_ended:{y}-{mo:02d} ({_months_past(y, mo)}mo past)"
        if is_contest:
            return False, ""   # recent/active contest slug -> keep, but COMBED (handled in tier)
    if plat in CONTEST_PLATFORMS:
        # codehawks/code4rena entry with no parseable future slug = a finished archive
        return True, f"finished_contest_archive:{plat}"
    return False, ""


def saturation_tier(r):
    name = (r.get("program") or "").lower()
    url = (r.get("url") or "").lower()
    plat = (r.get("platform") or "").lower()
    cap = r.get("bounty_max") or 0
    # live-but-crowd-combed contest (recent cantina competition / codehawks live) -> COMBED demote
    if (plat == "cantina" and "/competitions/" in url) or _DATE_SLUG.search(url):
        return "COMBED"
    if any(b in name for b in BLUECHIP):
        return "DENSE"
    if cap >= 1_000_000:
        return "DENSE"
    if cap < 500_000:
        return "THIN"
    if cap <= 1_000_000:
        return "MED"
    return "DENSE"


def realizable_ev(r, tier):
    cap = r.get("bounty_max") or 0
    bd = r.get("score_breakdown") or {}
    ac = bd.get("audit_coverage", 5) or 0      # 0..10 (heuristic; high=claimed under-audited)
    rec = bd.get("recency", 5) or 0            # 0..10 high=fresh
    typ = ((r.get("type") or "") + " " + (r.get("program") or "")).lower()
    base_p = {"DENSE": 0.01, "COMBED": 0.02, "MED": 0.06, "THIN": 0.15}[tier]
    p = base_p * (1 + (ac / 10) * 0.5)
    # RECENCY = STRONG multiplier (Doctrine #65/#70): mature(rec~0)->0.25 .. fresh(rec=10)->2.0,
    # so a fresh listing outranks a mature one within-tier AND survives the 0.85 KYC discount.
    rec_mult = 0.25 + (rec / 10) * 1.75
    p_poc = 0.35 if any(h in typ for h in HARD_POC) else 0.7
    p_acc = {"DENSE": 0.12, "COMBED": 0.15, "MED": 0.30, "THIN": 0.45}[tier]
    kyc = r.get("kyc")
    if kyc is True or (isinstance(kyc, str) and kyc.lower() in ("yes", "required", "true")):
        p_acc *= 0.85
    return round(p * cap * p_poc * p_acc * rec_mult, 1)


def main():
    arr = json.load(open(F))
    try:
        NEG = json.load(open("/home/claude-code/buzz-workspace/data/lane1/negate-registry.json")).get("negated", {})
    except Exception:
        NEG = {}
    dead_n = 0
    negated_n = 0
    for r in arr:
        # idempotency: restore the pre-gate EV if we stamped it on a prior run
        if "realizable_ev_raw" in r:
            r["realizable_ev"] = r["realizable_ev_raw"]
        else:
            r["realizable_ev_raw"] = r.get("realizable_ev")
        # scope-aware dedup-vs-NEGATE (Ogie msg 8274): respect JS-baked NEGATED + registry slug-level.
        slug = r.get("slug")
        key = f'{r.get("platform")}:{slug}' if slug else None
        if r.get("live_gate") == "NEGATED" or (key and key in NEG and not r.get("new_scope")):
            negated_n += 1
            r["live_gate"] = "NEGATED"; r["final_tier"] = "NEGATED"; r["density_tier"] = "NEGATED"
            r["realizable_ev"] = 0.0
            r.pop("saturation_reason", None); r.pop("dead_reason", None)
            continue
        dead, reason = is_dead_contest(r)
        if dead:
            dead_n += 1
            r["live_gate"] = "DEAD"
            r["dead_reason"] = reason
            r["final_tier"] = "DEAD"
            r["density_tier"] = "DEAD"
            r["realizable_ev"] = 0.0
            r.pop("saturation_reason", None)
            continue
        tier = saturation_tier(r)
        r["live_gate"] = "LIVE"
        r.pop("dead_reason", None)
        r["final_tier"] = tier
        r["density_tier"] = tier
        r["realizable_ev"] = realizable_ev(r, tier)
        if tier in ("DENSE", "COMBED"):
            r["saturation_reason"] = ("marquee/blue-chip" if any(b in (r.get("program") or "").lower() for b in BLUECHIP)
                                      else "mega-cap>=1M" if (r.get("bounty_max") or 0) >= 1_000_000
                                      else "contest-combed")
        else:
            r.pop("saturation_reason", None)

    TIER_RANK = {"THIN": 0, "MED": 1, "COMBED": 2, "DENSE": 3, "NEGATED": 8, "DEAD": 9}
    live = [r for r in arr if r["live_gate"] not in ("DEAD", "NEGATED")]
    live.sort(key=lambda r: (TIER_RANK[r["final_tier"]], -r["realizable_ev"]))

    from collections import Counter
    print(f"records: {len(arr)} | DROPPED dead-contest: {dead_n} | NEGATE-deduped: {negated_n} | live: {len(live)}")
    print("tier counts:", dict(Counter(r["final_tier"] for r in arr)))

    # Era verification (the regression anchor)
    era = [r for r in arr if r.get("program") == "Era" and "codehawks" in (r.get("platform") or "").lower()]
    if era:
        e = era[0]
        print(f"\nERA CHECK -> live_gate={e['live_gate']} reason={e.get('dead_reason')} ev={e['realizable_ev']} "
              f"({'PASS: dropped' if e['live_gate'] == 'DEAD' else 'FAIL: still live'})")

    print("\n=== NEW Top-12 (dead-dropped + saturation-demoted) ===")
    for r in live[:12]:
        print(f"  [{r['final_tier']:5s}] EV~${r['realizable_ev']:>9,.0f}  "
              f"{str(r.get('program'))[:26]:26s} {str(r.get('platform'))[:9]:9s} "
              f"cap=${r.get('bounty_max') or 0:>10,} kyc={r.get('kyc')}")

    if "--write" in sys.argv:
        ts = f"{NOW_Y}{NOW_M:02d}11"
        bak = F.replace(".json", f".raw-{ts}.json")
        json.dump(arr, open(bak, "w"))                 # backup current canonical (pre-overwrite)
        json.dump(arr, open(F, "w"), indent=0)         # overwrite canonical WITH gates baked into realizable_ev
        print(f"\nwrote canonical {F} (raw backup -> {bak})")
    else:
        print("\n(dry-run; pass --write to overwrite the canonical target-scores.json)")


if __name__ == "__main__":
    main()
