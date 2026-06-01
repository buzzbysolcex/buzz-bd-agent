#!/usr/bin/env python3
"""P3 v1.2 PROPER validation (Ogie msg 8097 TASK 3) — BACKGROUND, resumable.

Stratified ~50 sample from the 168 v1.1 hits on the 20k test set, GROUND_TRUTH
oversampled. Runs each through v1.2 (LOCAL qwen3, ~90s/call on CPU -> ~75min total).
Writes results incrementally + resumes (skip already-done lines). Also dumps the 50
bodies for human hand-labeling. Auto-file-to-canonical stays OFF.

  python3 -u v12_validate.py run        # build sample + run v1.2 (resumable)
  python3 -u v12_validate.py summary     # print v1.2 KEEP/DROP tallies so far
"""
import sys, json, importlib.util, time, os

ROOT = "/home/claude-code/buzz-workspace"
OUTDIR = ROOT + "/data/lane1/v12-validation"
SAMPLE = OUTDIR + "/sample-50.jsonl"        # idx, line, cls, sig, body  (for hand-labeling)
RESULTS = OUTDIR + "/v12-results.jsonl"     # idx, line, cls, verdict, reason  (v1.2 machine verdicts)
CORPUS = ROOT + "/data/lane4/corpus/era-2009-2011-batch.jsonl"
# GROUND_TRUTH oversampled: 34 GT + 8 RUG + 5 METH + 3 DET = 50
QUOTA = {"GROUND_TRUTH": 34, "RUG_PATTERN": 8, "METHODOLOGY": 5, "DETECTOR_SEED": 3}


def load(modpath, name):
    s = importlib.util.spec_from_file_location(name, modpath)
    m = importlib.util.module_from_spec(s); s.loader.exec_module(m); return m


def reproduce_hits(scan=20000):
    cons = load(ROOT + "/scripts/lane4-corpus-phase2-consumer.py", "cons")
    hits, n = [], 0
    with open(CORPUS) as f:
        for line in f:
            if n >= scan: break
            n += 1; line = line.strip()
            if not line: continue
            try: post = json.loads(line)
            except Exception: continue
            cls, sig = cons.classify_post(post)
            if cls: hits.append({"line": n, "cls": cls, "sig": sig, "body": post.get("body_excerpt") or ""})
    return hits


def build_sample():
    hits = reproduce_hits()
    by = {}
    for h in hits: by.setdefault(h["cls"], []).append(h)
    sample = []
    for cls, want in QUOTA.items():
        bucket = by.get(cls, [])
        # deterministic even spread across the bucket
        if not bucket: continue
        step = max(1, len(bucket) // want)
        picked = bucket[::step][:want]
        # top up if step skipped too many
        i = 0
        while len(picked) < min(want, len(bucket)):
            if bucket[i] not in picked: picked.append(bucket[i])
            i += 1
        sample.extend(picked[:want])
    os.makedirs(OUTDIR, exist_ok=True)
    with open(SAMPLE, "w") as f:
        for idx, h in enumerate(sample):
            f.write(json.dumps({"idx": idx, **{k: h[k] for k in ("line", "cls", "sig", "body")}}) + "\n")
    return sample


def done_idxs():
    if not os.path.exists(RESULTS): return set()
    d = set()
    with open(RESULTS) as f:
        for line in f:
            try: d.add(json.loads(line)["idx"])
            except Exception: pass
    return d


def run():
    q = load(ROOT + "/scripts/lane1/qwen_classify.py", "q")
    if not os.path.exists(SAMPLE):
        build_sample()
    sample = [json.loads(l) for l in open(SAMPLE)]
    print(f"[v12-validate] sample={len(sample)} (GT-oversampled). Resuming...", flush=True)
    have = done_idxs()
    t0 = time.time()
    for h in sample:
        if h["idx"] in have:
            continue
        t = time.time()
        try:
            v, reason = q.verdict_keep_drop(h["cls"], h["body"])
        except Exception as e:
            v, reason = "ERROR", f"{type(e).__name__}"
        with open(RESULTS, "a") as f:
            f.write(json.dumps({"idx": h["idx"], "line": h["line"], "cls": h["cls"],
                                "verdict": v, "reason": reason}) + "\n")
        print(f"  idx {h['idx']:2d} L{h['line']} {h['cls']:13s} -> {v}  ({time.time()-t:.0f}s)", flush=True)
    print(f"[v12-validate] done ({time.time()-t0:.0f}s). results -> {RESULTS}", flush=True)
    summary()


def summary():
    if not os.path.exists(RESULTS):
        print("no results yet"); return
    rows = [json.loads(l) for l in open(RESULTS)]
    from collections import Counter
    tot = Counter(r["verdict"] for r in rows)
    print(f"[v12 tallies] n={len(rows)}  {dict(tot)}", flush=True)
    by = {}
    for r in rows:
        by.setdefault(r["cls"], Counter())[r["verdict"]] += 1
    for cls, c in sorted(by.items()):
        print(f"   {cls:13s} {dict(c)}", flush=True)


if __name__ == "__main__":
    {"run": run, "summary": summary, "sample": build_sample}[sys.argv[1] if len(sys.argv) > 1 else "run"]()
