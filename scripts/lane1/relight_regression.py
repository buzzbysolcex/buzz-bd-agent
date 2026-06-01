#!/usr/bin/env python3
"""Relight regression — P3 v1.2 precision-filter + Gate-0 LLM-matcher (LOCAL qwen3, CPU).

Two bounded modes (CPU inference ~43s/call, so keep sample small & per-run < timeout):
  python3 -u relight_regression.py v12 [N=8] [SCAN=20000]
  python3 -u relight_regression.py gate0

v12   : reproduce v1.1 keyword hits over first SCAN records, then LLM-filter a
        deterministic stratified sample of N hits -> KEEP/DROP precision.
gate0 : re-run DISC-022 (must stay KNOWN-NEGATE) + hyp-e mechanism-match.
Auto-file-to-canonical stays OFF. Bankr stays OFF. Prints incrementally (flush)."""
import sys, json, importlib.util, time

ROOT = "/home/claude-code/buzz-workspace"
sys.path.insert(0, ROOT + "/scripts/lane1")


def load(modpath, name):
    s = importlib.util.spec_from_file_location(name, modpath)
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


def p(*a):
    print(*a, flush=True)


q = load(ROOT + "/scripts/lane1/qwen_classify.py", "q")
cons = load(ROOT + "/scripts/lane4-corpus-phase2-consumer.py", "cons")
CORPUS = ROOT + "/data/lane4/corpus/era-2009-2011-batch.jsonl"


def reproduce_hits(scan):
    """Pure-keyword v1.1 pass over first <scan> records. Returns (n_scanned, hits)."""
    hits, n = [], 0
    with open(CORPUS) as f:
        for line in f:
            if n >= scan:
                break
            n += 1
            line = line.strip()
            if not line:
                continue
            try:
                post = json.loads(line)
            except Exception:
                continue
            cls, sig = cons.classify_post(post)
            if cls:
                hits.append((n, cls, sig, post.get("body_excerpt") or ""))
    return n, hits


def stratified(hits, k):
    """Deterministic: round-robin across classes, evenly spaced within each class."""
    by_cls = {}
    for h in hits:
        by_cls.setdefault(h[1], []).append(h)
    order = sorted(by_cls)  # stable
    picked, i = [], 0
    while len(picked) < k and any(by_cls.values()):
        cls = order[i % len(order)]
        i += 1
        bucket = by_cls[cls]
        if bucket:
            # evenly spaced pull
            idx = (len([x for x in picked if x[1] == cls]) * max(1, len(bucket) // 3)) % len(bucket)
            picked.append(bucket.pop(idx))
    return picked[:k]


def mode_v12(argv):
    k = int(argv[0]) if argv else 8
    scan = int(argv[1]) if len(argv) > 1 else 20000
    p(f"=== P3 v1.2 RELIGHT — scan first {scan} records, LLM-filter {k}-hit sample ===")
    t0 = time.time()
    n, hits = reproduce_hits(scan)
    rate = 100.0 * len(hits) / max(1, n)
    p(f"[v1.1 keyword pass] scanned={n}  hits={len(hits)}  hit-rate={rate:.2f}%  ({time.time()-t0:.1f}s)")
    cls_counts = {}
    for h in hits:
        cls_counts[h[1]] = cls_counts.get(h[1], 0) + 1
    p(f"[v1.1 per-class] {dict(sorted(cls_counts.items()))}")
    sample = stratified(hits, k)
    p(f"[LLM filter] running v1.2 on {len(sample)} stratified hits (~43s each, CPU)...")
    keep = drop = timedout = 0
    for j, (ln, cls, sig, body) in enumerate(sample, 1):
        t = time.time()
        try:
            v, reason = q.verdict_keep_drop(cls, body)
        except Exception as e:
            timedout += 1
            p(f"  [{j}/{len(sample)}] L{ln} {cls} (sig={sig}) -> TIMEOUT/{type(e).__name__}  ({time.time()-t:.0f}s)")
            continue
        if v == "KEEP":
            keep += 1
        else:
            drop += 1
        p(f"  [{j}/{len(sample)}] L{ln} {cls} (sig={sig}) -> {v}  ({time.time()-t:.0f}s)")
        p(f"        reason: {reason}")
        p(f"        body:   {body[:90].replace(chr(10),' ')}")
    if timedout:
        p(f"  ({timedout} call(s) timed out — excluded from precision)")
    tot = keep + drop
    prec = 100.0 * keep / max(1, tot)
    proj = rate * keep / max(1, tot)
    p("")
    p(f"=== v1.2 RESULT === sample={tot}  KEEP={keep}  DROP={drop}  est-precision={prec:.0f}%")
    p(f"    v1.1 hit-rate {rate:.2f}%  ->  v1.2 projected hit-rate {proj:.2f}%  (drop-rate {100-prec:.0f}%)")
    p(f"    total wall {time.time()-t0:.0f}s")


HYPE_FINDING = {
    "id": "hyp-e", "program": "wormhole",
    "class": "DC-8 signer/authorization validation moved out of Anchor Accounts struct",
    "mechanism": ("redeem.rs handler body does votes.set(transceiver.id,true) then counts votes vs threshold; "
                  "hypothesis was that pre-handler authorization of the vote write is MISSING, letting an "
                  "unauthorized transceiver record a vote toward quorum."),
    "impact": "hypothesized unauthorized transceiver vote contributing to quorum on the Solana NTT manager.",
    "component": "NTT Solana example-native-token-transfers redeem.rs",
}


def mode_gate0(_argv):
    g = load(ROOT + "/scripts/lane1/gate0-known-issues.py", "g")
    wh = g.WORMHOLE_SEED["entries"]
    attest = wh[0]  # stale-attestation / live-config-vs-snapshot
    p("=== GATE-0 LLM-MATCHER RELIGHT (local qwen3) ===")
    p("[1/2] DISC-022 (Hyp-C) vs Wormhole accepted-risk #1 (attestation live-config) — MUST stay KNOWN-NEGATE")
    t = time.time()
    v1, r1 = q.gate0_mechanism_match(g.DISC022_FINDING, attest)
    p(f"   verdict: {v1}   ({time.time()-t:.0f}s)")
    p(f"   reasoning: {r1}")
    p("")
    p("[2/2] hyp-e (DC-8 redeem.rs, Gate-2 NEGATED) vs Wormhole accepted-risk #1")
    t = time.time()
    v2, r2 = q.gate0_mechanism_match(HYPE_FINDING, attest)
    p(f"   verdict: {v2}   ({time.time()-t:.0f}s)")
    p(f"   reasoning: {r2}")
    p("")
    p(f"=== GATE-0 RESULT === DISC-022={v1} (regression {'PASS' if v1=='KNOWN-NEGATE' else 'FAIL'})  |  hyp-e={v2}")


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "v12"
    {"v12": mode_v12, "gate0": mode_gate0}[mode](sys.argv[2:])
