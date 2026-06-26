#!/usr/bin/env python3
"""post-mortem.py — Doctrine #75 win/loss post-mortem hook + #78 exploration floor / confidence
gate / exploration slice (Ogie intake 2026-06-22, v2 2026-06-23).

The loop that turns ONE outcome into a permanent rule (Gulli) — WITHOUT letting a measured loop
converge on its own tiny history and die. On every submission outcome it:
  1. increments n + applies the multiplicative update to brain/ev-weights.json,
  2. CLAMPS the result by the confidence gate (low-n shrinkage toward neutral) THEN the 0.30 floor
     (structural-foreclosure classes exempt),
  3. updates brain/scoreboard.json + appends an ev-weights history line,
  4. prints the structured post-mortem (the 3 questions).
`--explore` reports whether a cycle should ignore weights and which least-observed class to sample.

Usage:
  python3 post-mortem.py --disc DISC-023 --target Foo --platform immunefi \\
      --class slippage_double_count --outcome duplicate [--dup-of 947] [--note "..."] [--write]
  python3 post-mortem.py --explore --cycle 7      # is this an exploration cycle? which class?
"""
import json, sys, argparse

EVW = "/home/claude-code/buzz-workspace/brain/ev-weights.json"
SB  = "/home/claude-code/buzz-workspace/brain/scoreboard.json"

RULE = {  # outcome -> (ev multiplier, scoreboard counter key)
    "paid": (1.25, "paid"), "duplicate": (0.85, "duplicate"),
    "closed_informative": (0.80, "closed_informative_or_oos"), "closed_oos": (0.80, "closed_informative_or_oos"),
    "closed_not_a_bug": (0.70, "closed_not_a_bug"), "ai_report_dismissal": (0.80, "closed_not_a_bug"),
    "no_response": (0.85, "no_response"), "missed_window": (1.00, "missed_window"),
}

def clamp(x, lo, hi): return max(lo, min(hi, x))

def gate_clamp(evw, mult, n, structural=False):
    """Doctrine #78: low-n shrinkage toward neutral, then the 0.30 floor (structural-exempt)."""
    g = evw["confidence_gate"]["clamps_by_n"]
    lo, hi = (g["n_lt_3"] if n < 3 else g["n_3_to_5"] if n < 6 else g["n_gte_6"])
    m = clamp(mult, lo, hi)
    if not structural:
        m = max(m, evw["exploration_floor"]["min_statistical_multiplier"])  # 0.30 floor
    return round(m, 3)

def explore(evw, cycle):
    pct = evw["exploration_slice"]["pct_of_cycles"]
    step = max(1, round(1 / pct))                       # 0.20 -> every 5th cycle
    is_explore = (cycle % step == 0)
    least = min(evw["bug_class"].items(), key=lambda kv: kv[1].get("n", 0))
    print(f"=== EXPLORATION SLICE (Doctrine #78) — cycle {cycle} ===")
    print(f"explore rate {pct} (every {step}th cycle) -> this cycle is {'an EXPLORATION cycle' if is_explore else 'an exploit cycle'}.")
    print(f"least-observed class to sample: {least[0]} (n={least[1].get('n',0)})"
          + ("  -> IGNORE ev-weights, hunt this class/a thin target regardless of multiplier." if is_explore
             else "  -> use ev-weights this cycle."))

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--explore", action="store_true"); ap.add_argument("--cycle", type=int, default=1)
    ap.add_argument("--disc"); ap.add_argument("--target"); ap.add_argument("--platform")
    ap.add_argument("--class", dest="bug_class"); ap.add_argument("--outcome", choices=list(RULE))
    ap.add_argument("--dup-of", default=""); ap.add_argument("--note", default=""); ap.add_argument("--write", action="store_true")
    a = ap.parse_args()
    evw = json.load(open(EVW))

    if a.explore:
        explore(evw, a.cycle); return
    if not (a.disc and a.platform and a.bug_class and a.outcome):
        ap.error("outcome mode needs --disc --target --platform --class --outcome")

    sb = json.load(open(SB)); mult, sb_key = RULE[a.outcome]
    bc = evw["bug_class"].setdefault(a.bug_class, {"mult": 1.0, "n": 0, "basis": "new class"})
    structural = bool(bc.get("structural"))
    old_bc, old_n = bc["mult"], bc.get("n", 0)
    bc["n"] = old_n + 1
    bc["mult"] = gate_clamp(evw, old_bc * mult, bc["n"], structural)   # update -> gate -> floor

    plat = evw["platform"].get(a.platform); plat_line = ""
    if plat:
        ps = bool(plat.get("structural")); pn = plat.get("n", 0) + 1; plat["n"] = pn
        plat["mult"] = gate_clamp(evw, plat["mult"] * (1 + (mult - 1) * 0.5), pn, ps)
        plat_line = f" | platform {a.platform} {round(plat['mult'],3)} (n={pn})"
    evw.setdefault("history", []).append(
        f"2026-06-23 {a.disc} {a.target} [{a.platform}/{a.bug_class}]->{a.outcome}: class {old_bc}->{bc['mult']} (n {old_n}->{bc['n']}, gated){plat_line}. {a.note}")
    evw["last_updated"] = "2026-06-23"

    t = sb["totals"]; t["submitted"] = t.get("submitted", 0) + 1; t[sb_key] = t.get(sb_key, 0) + 1
    t["hit_rate_paid_over_submitted"] = round(t.get("paid", 0) / t["submitted"], 3)
    t["dedup_rate_dup_over_submitted"] = round(t.get("duplicate", 0) / t["submitted"], 3)
    cls = sb["by_bug_class"].setdefault(a.bug_class, {"submitted": 0, "paid": 0})
    cls["submitted"] = cls.get("submitted", 0) + 1
    if a.outcome == "paid": cls["paid"] = cls.get("paid", 0) + 1
    cls["hit_rate"] = round(cls.get("paid", 0) / cls["submitted"], 3); sb["last_updated"] = "2026-06-23"

    print(f"=== POST-MORTEM {a.disc} — {a.target} [{a.platform}/{a.bug_class}] -> {a.outcome.upper()} ===")
    print(f"1. WHY: {a.note or '(fill in)'}" + (f"  dup-of #{a.dup_of}" if a.dup_of else ""))
    print(f"2. EV (gated #78): bug_class {old_bc} -> {bc['mult']} (n {old_n}->{bc['n']}; floor 0.30, structural={structural}){plat_line}")
    print(f"3. RULE: " + ("UP-WEIGHT (capped by n-gate) — replicate novel/thin." if a.outcome == "paid"
          else "DOWN-WEIGHT + #74 humanization gate." if a.outcome == "ai_report_dismissal"
          else "FORECLOSE LANE (#77, structural)." if (a.outcome == "no_response" and "email" in a.platform)
          else "DOWN-WEIGHT (gated, floored) — dedup-first/thinner/first-to-report." if a.outcome == "duplicate"
          else "DOWN-WEIGHT (gated, floored)."))
    print(f"scoreboard: {t['submitted']} submitted | hit {t['hit_rate_paid_over_submitted']} | dedup {t['dedup_rate_dup_over_submitted']}")
    if a.write:
        json.dump(evw, open(EVW, "w"), indent=2); json.dump(sb, open(SB, "w"), indent=2); print("[written]")
    else:
        print("[dry-run] pass --write to commit + append the ledger row.")

if __name__ == "__main__":
    main()
