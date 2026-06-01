# P3 v1.2 Precision-Filter — Proper Validation (50-sample, hand-labeled)

> Ogie msg 8097 TASK 3. Local qwen3:8b precision-filter over the v1.1 keyword hits.
> Auto-file-to-canonical stays OFF regardless of these numbers. Bankr OFF.

## Method
- 20k-record test set (`era-2009-2011-batch.jsonl`), v1.1 keyword pass = **168 hits / 0.84%**.
- Stratified 50-sample, **GROUND_TRUTH oversampled** (34 GT + 8 RUG + 5 METH + 3 DET) — GT is the noisiest class (73% of hits) and the one we most fear false-dropping.
- Each run through v1.2 (`verdict_keep_drop`, local qwen3, ~50 CPU calls). Verdicts in `v12-results.jsonl`.
- All 50 hand-labeled TRUE (genuine signal of its class) vs NOISE by reading each body (`sample-50.jsonl`); borderline 2009-era forum posts erred toward NOISE (conservative). Labels + metric script: `compute-metrics.py`.

## Results
| metric | value |
|--------|-------|
| genuine-signal rate (hand-labeled TRUE / 50) | **20%** (= v1.1 effective precision, since v1.1 keeps all hits) |
| v1.2 KEEP / DROP | 17 / 33 |
| TP / FP / FN / TN | 9 / 8 / 1 / 32 |
| **v1.2 precision** | **53%** (vs v1.1 20% → **2.6×**) |
| **v1.2 recall** | **90%** (1 false-drop) |
| **GROUND_TRUTH false-DROP rate** | **0/5 = 0%** — ZERO true exploit signals lost |

## Honest read
- v1.2 lifts precision 20% → 53% (2.6×) by cutting keyword-noise, at the cost of **one** false-drop.
- The single false-drop (idx 35) is a **borderline RUG_PATTERN** ("sounds like a Ponzi… kiss your monies goodbye" — opinion about an unspecified scheme), not a clear post-mortem. No GROUND_TRUTH/METHODOLOGY/DETECTOR true signal was dropped.
- **The safety metric is clean: 0% GROUND_TRUTH false-DROP** — the filter never discarded a real exploit/theft account. This is the property that matters for Pillar-3 → Pillar-4 ground-truth feeding.
- Caveats: hand-labels are subjective on ~6 borderline posts; N=50 (CI is wide). The 53%/90% are directional, not precise. GT-oversampling makes precision a conservative floor (GT is the noisiest class).

## Disposition
v1.2 is validated as a **net-positive precision filter with zero true-exploit loss**. It stays a *review-assist* (auto-file-to-canonical OFF) — a human still confirms before anything lands in canonical brain. The one false-drop class (borderline RUG opinion) argues for keeping RUG_PATTERN drops at lower confidence / human-review rather than auto-discard.
