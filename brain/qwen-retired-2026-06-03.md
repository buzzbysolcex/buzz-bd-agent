# qwen3:8b RETIRED — 2026-06-03 (Ogie msg 8129)

## Why

Disk hit 94% on the 38G box; qwen3:8b was the single biggest reclaimable item (**~4.9GB**). Ogie's call: free space by retiring qwen + cleanup, **NO Hetzner volume (no cost before revenue)**. qwen was a **recall-upgrade, NOT load-bearing** — its consumers degrade safely:

- **Gate-0** → structural-matcher-only (`gate0-known-issues.py` `match_finding`, attack-tier token gate #15.1). The LLM-matcher (qwen) was a second-opinion recall upgrade; uncertain → WR-review is UNCHANGED.
- **P3** → v1.1 keyword (`lane4-corpus-phase2-consumer.py` `classify_post`) + WR-review. The v1.2 LLM precision-filter was REVIEW-ASSIST (non-urgent, validated at 53% precision / 0% GT-false-drop but never load-bearing).

**No live cron ever called qwen** — confirmed before deletion. Only manual/validation tools (`relight_regression.py`, `v12_validate.py`) + the `qwen_classify.py` helper used it; those now degrade gracefully (see below).

## What was done (reversible)

1. `ollama rm qwen3:8b` → `.ollama` now 12K (model gone). `ollama serve` stopped. **`@reboot ollama serve` cron REMOVED** (crontab backed up `data/infra-logs/cron-backups/`).
2. `qwen_classify.py`: `QWEN_RETIRED=True`; `chat()` raises a clear retired error; `verdict_keep_drop()` → `("KEEP", "qwen-retired…")` (don't-drop = defer to v1.1 + WR-review); `gate0_mechanism_match()` → `("NOVEL-VARIANT-REVIEW", …)` (the structural gate's safe default). **Nothing errors.**
3. Reclaim-guard: qwen exemption removed (the inverted guard is default-protect; `.ollama` is empty now anyway).
4. **bankr stays OFF** — no LLM fallback (local-none for now), per BUZZ_RULES #5 partnership-not-dependency. Sub-agent LLM = none until revenue justifies re-enabling local.

## How to RE-ENABLE (if revenue later justifies it)

```bash
ollama serve &                 # or re-add the @reboot cron
ollama pull qwen3:8b           # ~5GB — confirm disk headroom FIRST (needs the Hetzner volume or <80% disk)
```

Then in `scripts/lane1/qwen_classify.py` set `QWEN_RETIRED = False`. Consumers to re-enable:

- **Gate-0 LLM-matcher**: `relight_regression.py gate0` (the impact-equivalence second opinion on top of the structural gate).
- **P3 v1.2 precision-filter**: `v12_validate.py` / the `verdict_keep_drop` path (review-assist over the v1.1 keyword hits).

Cross-ref: [[reference_qwen3_local_llm]] (CPU-latency + helper API) · [[reference_clarity_poc_harness]] (separate, NOT qwen-dependent).
