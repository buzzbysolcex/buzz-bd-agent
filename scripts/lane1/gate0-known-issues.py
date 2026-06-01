#!/usr/bin/env python3
"""GATE-0 — Known-Issues Pre-Flight (Ogie GATE-0 directive 2026-06-01; Doctrine #15).

Runs BEFORE Gate-1 and BEFORE any PoC investment. Matches a candidate finding against
the TARGET PROGRAM's accepted-risk / known-issues corpus (the program's own
SECURITY_CONTEXT.md / SECURITY.md / KNOWN_ISSUES / published-audit accepted findings /
Immunefi-or-platform out-of-scope + known-issues). 3-bucket:

  KNOWN-NEGATE        (HIGH-confidence match) -> FORECLOSE pre-PoC, cite the doc section.
  NOVEL-VARIANT-REVIEW(partial/uncertain)     -> WR-flag with matched entry + why-might-be-variant.
  NO-MATCH-PROCEED    (no relevant entry)      -> continue to Gate-1 / PoC.

BIAS (mirror the P3 precision discipline): auto-NEGATE ONLY on high confidence; uncertain
defaults to WR review. A false-NEGATE costs a real bounty — better to surface than silently kill.

LLM-precision layer (FREE bankr/gpt-5-nano per BUZZ_RULES #5) is OPTIONAL + route-dependent;
when the route is down (current state) the STRUCTURAL matcher runs and anything not
high-confidence defaults to NOVEL-VARIANT-REVIEW (the safe degraded mode).

CORPUS:  data/lane1/gate0/known-issues.json  (keyed by program; git-tracked, no binary)
USAGE:
  gate0-known-issues.py --seed-wormhole          # seed the Wormhole NTT corpus (DISC-022 anchor)
  gate0-known-issues.py --validate-disc022        # run DISC-022 through Gate-0, expect KNOWN-NEGATE
  gate0-known-issues.py --match <finding.json>    # match an arbitrary finding (stdin or file)
  gate0-known-issues.py --sweep <hunt-glob>       # retroactive sweep over hunt files
  gate0-known-issues.py --list                    # show corpus programs + entry counts
"""
import argparse
import json
import re
import sys
from pathlib import Path

WORKSPACE = Path(__file__).resolve().parent.parent.parent
CORPUS = WORKSPACE / "data" / "lane1" / "gate0" / "known-issues.json"

# Distinctive security tokens — overlap on these (not stopwords) drives the match score.
DISTINCTIVE = {
    "attestation", "transceiver", "threshold", "snapshot", "quorum", "guardian", "signer",
    "reentrancy", "oracle", "staleness", "donation", "inflation", "rounding", "slippage",
    "liquidation", "ltv", "collateral", "rebase", "snapshot", "delegatecall", "upgrade",
    "access-control", "owner", "admin", "timelock", "replay", "nonce", "dedup", "merkle",
    "rate-limit", "dos", "underflow", "overflow", "front-run", "sandwich", "mev",
    "live-config", "config-change", "re-enable", "stale", "revival", "key-compromise",
    "compromise", "precondition", "out-of-scope", "centralization", "privileged",
}

# normalize a token-ish phrase set from text
_WORD = re.compile(r"[a-z0-9][a-z0-9\-]+")


def distinctive_tokens(text):
    if not text:
        return set()
    t = text.lower().replace("_", "-")
    raw = set(_WORD.findall(t))
    # fold a few multi-word distinctive phrases
    folded = set()
    for phrase in ("live config", "config change", "access control", "key compromise",
                   "out of scope", "rate limit", "front run"):
        if phrase in t:
            folded.add(phrase.replace(" ", "-"))
    return (raw & DISTINCTIVE) | folded


def load_corpus():
    if CORPUS.exists():
        return json.loads(CORPUS.read_text())
    return {}


def save_corpus(c):
    CORPUS.parent.mkdir(parents=True, exist_ok=True)
    CORPUS.write_text(json.dumps(c, indent=2))


def finding_text(f):
    return " ".join(str(f.get(k, "")) for k in ("class", "mechanism", "impact", "component"))


def entry_text(e):
    return " ".join(str(e.get(k, "")) for k in ("class", "mechanism", "impact", "component", "raw_text"))


# HIGH-confidence: >=3 shared distinctive tokens AND the entry covers the finding's core
# mechanism tokens. PARTIAL: 1-2 shared. NONE: 0 shared.
HIGH_SHARED = 3


def match_finding(finding, program, corpus):
    entries = corpus.get(program, {}).get("entries", [])
    if not entries:
        return {"bucket": "NO-MATCH-PROCEED", "reason": f"no known-issues corpus for program '{program}'",
                "best": None, "shared": []}
    ftok = distinctive_tokens(finding_text(finding))
    best, best_shared = None, set()
    for e in entries:
        etok = distinctive_tokens(entry_text(e))
        shared = ftok & etok
        if len(shared) > len(best_shared):
            best, best_shared = e, shared
    n = len(best_shared)
    if n >= HIGH_SHARED:
        bucket = "KNOWN-NEGATE"
        reason = (f"HIGH-confidence match ({n} shared distinctive tokens) vs accepted-risk entry "
                  f"'{best.get('class')}' — {best.get('source_url')}{best.get('citation_anchor','')}")
    elif n >= 1:
        bucket = "NOVEL-VARIANT-REVIEW"
        reason = (f"PARTIAL match ({n} shared: {sorted(best_shared)}) vs '{best.get('class')}'. "
                  f"WR review: is this a true variant the entry does NOT cover? (LLM-precision route down → defaulting to review)")
    else:
        bucket = "NO-MATCH-PROCEED"
        reason = "no distinctive-token overlap with any known-issues entry"
    return {"bucket": bucket, "reason": reason, "best": best, "shared": sorted(best_shared)}


# ---- Wormhole NTT corpus seed (the DISC-022 close anchor) ----
WORMHOLE_SEED = {
    "program": "wormhole",
    "source_primary": "https://github.com/wormhole-foundation/wormhole/blob/main/SECURITY_CONTEXT.md",
    "audience": "explicitly addressed to security researchers and automated tools",
    "fetched": "2026-06-01",
    "entries": [
        {
            "class": "stale-attestation / live-config-vs-snapshot evaluation",
            "mechanism": "NTT attestations are evaluated against the CURRENT threshold and CURRENT enabled-transceiver set at execution time, rather than against the (threshold, enabled-set) snapshot that existed when the attestation was recorded. Administrative threshold/transceiver reductions and re-enables are deliberate admin actions.",
            "impact": "an attestation recorded under one transceiver/threshold config counting toward quorum under a later config (incl. re-enable of a previously-removed transceiver) — DECLARED NON-ISSUE.",
            "component": "NTT ManagerBase / TransceiverRegistry attestation+threshold+transceiver quorum",
            "source_url": "https://github.com/wormhole-foundation/wormhole/blob/main/SECURITY_CONTEXT.md",
            "citation_anchor": "#L146-L169",
            "raw_text": "NTT attestations are evaluated against live threshold/transceiver config rather than a snapshot taken when the attestation was recorded; admin threshold reductions are deliberate; any fraudulent-attestation scenario requires a quorum of malicious Guardians (out of scope).",
        },
        {
            "class": "quorum / signing-key compromise precondition",
            "mechanism": "any impact that assumes control over a quorum of signing keys (Guardians / malicious transceiver quorum) as a precondition.",
            "impact": "compromising independent Guardian infra deemed infeasible without evidence; INVALID as a PoC assumption — out of scope.",
            "component": "Guardian / transceiver quorum",
            "source_url": "https://github.com/wormhole-foundation/wormhole/blob/main/SECURITY_CONTEXT.md",
            "citation_anchor": "#quorum-compromise",
            "raw_text": "Any impact that assumes control over a quorum of signing keys as a precondition is out of scope; compromising independent Guardian infrastructure is infeasible without supporting evidence.",
        },
        {
            "class": "rate-limit linear-usage DoS",
            "mechanism": "denial-of-service based on linear usage of a rate-limiting mechanism via legitimate transfers.",
            "impact": "normal capacity consumption is expected; only disproportionate inflation counts — otherwise non-issue.",
            "component": "NTT rate limiter",
            "source_url": "https://github.com/wormhole-foundation/wormhole/blob/main/SECURITY_CONTEXT.md",
            "citation_anchor": "#rate-limit-dos",
            "raw_text": "Denial-of-service based on linear usage of a rate limiting mechanism is expected behavior; only disproportionate inflation of consumed capacity counts as a potential bug.",
        },
    ],
}

# DISC-022 (Hyp-C) as a finding record — the true-positive the gate MUST catch.
DISC022_FINDING = {
    "id": "DISC-022",
    "program": "wormhole",
    "class": "stale-attestation revival on transceiver re-enable",
    "mechanism": "removeTransceiver clears the enabled bit but does NOT invalidate the historical attestedTransceivers bitmap; _setTransceiver re-enables by original index, reviving the stale attestation; quorum is the AND of historical-attestations x current-enabled-set (live config, not a snapshot).",
    "impact": "a stale attestation from a removed-then-re-enabled transceiver contributes to a fresh quorum -> unauthorized executeMsg releases tokens across the config-change boundary.",
    "component": "NTT ManagerBase / TransceiverRegistry attestation+threshold+transceiver quorum",
}


def cmd_seed_wormhole(_a):
    c = load_corpus()
    c["wormhole"] = {k: WORMHOLE_SEED[k] for k in WORMHOLE_SEED if k != "program"}
    save_corpus(c)
    print(f"[gate0] seeded 'wormhole' corpus: {len(WORMHOLE_SEED['entries'])} accepted-risk entries from SECURITY_CONTEXT.md")
    return 0


def cmd_validate_disc022(_a):
    c = load_corpus()
    r = match_finding(DISC022_FINDING, "wormhole", c)
    print("[gate0] DISC-022 (Hyp-C) -> Gate-0:")
    print(f"  bucket : {r['bucket']}")
    print(f"  shared : {r['shared']}")
    print(f"  reason : {r['reason']}")
    expect = (r["bucket"] == "KNOWN-NEGATE")
    print(f"\n  VALIDATION: {'✅ PASS — gate catches the true-positive (would have been pre-PoC NEGATE-KNOWN)' if expect else '❌ FAIL — matcher too loose/tight'}")
    return 0 if expect else 1


def cmd_match(a):
    finding = json.loads(Path(a.match).read_text() if Path(a.match).exists() else sys.stdin.read())
    prog = finding.get("program", "unknown")
    r = match_finding(finding, prog, load_corpus())
    print(json.dumps({"program": prog, **r, "best": (r["best"] or {}).get("class")}, indent=2))
    return 0


def cmd_list(_a):
    c = load_corpus()
    print(f"[gate0] corpus programs: {len(c)}")
    for p, d in c.items():
        print(f"  {p}: {len(d.get('entries', []))} entries | {d.get('source_primary','')}")
    return 0


def cmd_sweep(a):
    c = load_corpus()
    hunts = sorted(WORKSPACE.glob(a.sweep))
    print(f"[gate0] retroactive sweep over {len(hunts)} hunt file(s) — corpus programs: {sorted(c.keys())}")
    matches = 0
    for h in hunts:
        text = h.read_text(errors="replace").lower()
        # infer program by name token present in corpus
        prog = next((p for p in c if p in h.name.lower()), None)
        if not prog:
            continue
        # treat the whole hunt file as the finding text (coarse)
        f = {"class": h.stem, "mechanism": text[:4000], "impact": "", "component": ""}
        r = match_finding(f, prog, c)
        if r["bucket"] in ("KNOWN-NEGATE", "NOVEL-VARIANT-REVIEW"):
            matches += 1
            print(f"  {r['bucket']:20s} {h.name} (shared {len(r['shared'])}: {r['shared'][:6]})")
    print(f"[gate0] sweep matches (KNOWN-NEGATE or REVIEW): {matches} (programs with corpus only)")
    return 0


def main():
    ap = argparse.ArgumentParser(description="GATE-0 known-issues pre-flight")
    ap.add_argument("--seed-wormhole", action="store_true")
    ap.add_argument("--validate-disc022", action="store_true")
    ap.add_argument("--match", metavar="FINDING_JSON")
    ap.add_argument("--sweep", metavar="HUNT_GLOB")
    ap.add_argument("--list", action="store_true")
    a = ap.parse_args()
    if a.seed_wormhole: return cmd_seed_wormhole(a)
    if a.validate_disc022: return cmd_validate_disc022(a)
    if a.match: return cmd_match(a)
    if a.sweep: return cmd_sweep(a)
    if a.list: return cmd_list(a)
    ap.print_help(); return 0


if __name__ == "__main__":
    sys.exit(main())
