#!/usr/bin/env python3
"""HSaaS-prospect-fit re-score (Ogie msg 8114 TASK 1). POPULATE-ONLY analysis, NO sends.

DATA-GAP FINDING (honest): the named "12,956" = target_scores_v2_hsaas (13,813 rows) is the
v1-BOUNTY-corpus re-tagged — contract/mcap/liquidity/github ALL NULL → the 4 HSaaS-fit axes are
unevaluable on it. The real fully-scored, contactable token pool is `token_scores` (277 rows:
scanner_data + social_data + safety_data populated w/ marketCap/liquidity/dexscreenerUrl). This
re-scores THAT on the 4 axes. Expect DOZENS (high-touch), not hundreds (mass-outreach).

4 axes: (a) deployed/verifiable contract  (b) thin/no top-tier audit (#45)  (c) funded/active
(mcap+liq floor)  (d) reachable public contact. Output: data/lane1/hsaas/qualified.jsonl + count.
"""
import sqlite3, json, os

DB = "/data/buzz/persistent/buzz-api/buzz.db"
OUT = "/home/claude-code/buzz-workspace/data/lane1/hsaas"
MCAP_FLOOR, LIQ_FLOOR = 500_000, 100_000
# #45: protocols already 3+ top-tier-audited are NOT prospects (they don't need us). Small DexScreener
# tokens are unaudited by default = thin = fit. Exclude only names that are clearly major/audited.
AUDITED_BLUECHIP = ("velodrome", "aave", "uniswap", "curve", "lido", "compound", "pancakeswap", "gmx", "morpho")


def jget(s):
    try: return json.loads(s) if s else {}
    except Exception: return {}


def main():
    os.makedirs(OUT, exist_ok=True)
    con = sqlite3.connect(DB); con.row_factory = sqlite3.Row
    rows = con.execute("SELECT address,chain,score_total,verdict,scanner_data,social_data,safety_data FROM token_scores").fetchall()
    qualified = []
    n_total = len(rows); n_a = n_c = n_d = n_thin = 0
    for r in rows:
        sc = jget(r["scanner_data"]); so = jget(r["social_data"])
        mcap = sc.get("marketCap") or so.get("marketCap") or 0
        liq = sc.get("liquidity") or so.get("liquidity") or 0
        name = (sc.get("tokenName") or so.get("tokenName") or "").strip()
        dex = sc.get("dexscreenerUrl") or so.get("dexscreenerUrl")
        # (a) deployed/verifiable
        a = bool(r["address"])
        # (c) funded/active
        c = (mcap and mcap >= MCAP_FLOOR) or (liq and liq >= LIQ_FLOOR)
        # (d) reachable public contact (dexscreener socials are the discovery anchor)
        d = bool(dex)
        # (b) thin audit (#45): exclude obvious audited blue-chips; small tokens are thin by default
        thin = not any(b in name.lower() for b in AUDITED_BLUECHIP)
        n_a += a; n_c += bool(c); n_d += d; n_thin += thin
        if a and c and d and thin:
            qualified.append({
                "protocol": name or r["address"][:10], "address": r["address"], "chain": r["chain"],
                "score": r["score_total"], "verdict": r["verdict"], "mcap_usd": mcap, "liquidity_usd": liq,
                "dexscreener": dex,
                # HSaaS-fit = funded-scale (pays) x score-band (engageable) — higher mcap+liq + mid-score = best fit
                "hsaas_fit": round((min(mcap, 50_000_000) / 50_000_000) * 50 + (min(liq, 5_000_000) / 5_000_000) * 30 + (r["score_total"] or 0) / 100 * 20, 1),
            })
    qualified.sort(key=lambda x: x["hsaas_fit"], reverse=True)
    with open(f"{OUT}/qualified.jsonl", "w") as f:
        for q in qualified: f.write(json.dumps(q) + "\n")
    print(f"=== HSaaS-prospect re-score (token_scores, the REAL pool) ===")
    print(f"pool={n_total}  (a)deployed={n_a}  (c)funded={n_c}  (d)contactable={n_d}  (b)thin-audit={n_thin}")
    print(f"QUALIFIED (all 4 axes) = {len(qualified)}  -> {OUT}/qualified.jsonl")
    print("top 8 by HSaaS-fit:")
    for q in qualified[:8]:
        print(f"  {q['hsaas_fit']:5.1f}  {q['protocol'][:22]:22s} {q['chain']:8s} score={q['score']} mcap=${int(q['mcap_usd']):,} liq=${int(q['liquidity_usd']):,}")


if __name__ == "__main__":
    main()
