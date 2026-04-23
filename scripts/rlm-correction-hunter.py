#!/usr/bin/env python3
"""
rlm-correction-hunter.py — RLM-based fact-checker for AIBTC signals.

Pattern: load signal corpus as a Python variable inside RLM's Docker REPL,
let qwen3:8b write code that scans for factual errors, wrong PR/issue
references, stale data claims, or incorrect attributions.

Complements the bash correction-hunter (which only catches GH-issue-ref
mismatches via literal PR fetches). RLM sees the full signal content and
can reason about internal consistency, cross-signal contradictions, and
claim-vs-source divergence.

Usage:
    python3 scripts/rlm-correction-hunter.py [INPUT_JSON]

Default INPUT_JSON: /data/buzz/persistent/reports/signals-for-rlm.json
Writes candidates JSON to /data/buzz/persistent/reports/rlm-correction-candidates.json

Feature flag gate: RLM_CORRECTION_HUNTER=false (default OFF — flip after validation).
"""
import json
import os
import sys
import time
import traceback
from pathlib import Path


def main():
    t0 = time.time()
    positional = [a for a in sys.argv[1:] if not a.startswith("--")]
    input_path = positional[0] if positional else "/data/buzz/persistent/reports/signals-for-rlm.json"
    output_path = "/data/buzz/persistent/reports/rlm-correction-candidates.json"
    log_path = "/data/buzz/persistent/reports/rlm-correction-hunter.log"

    def log(msg):
        ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        line = f"[{ts}] rlm-hunter: {msg}"
        print(line, flush=True)
        with open(log_path, "a") as f:
            f.write(line + "\n")

    log(f"wake — input={input_path}")

    if os.environ.get("RLM_CORRECTION_HUNTER", "false").lower() != "true":
        log("RLM_CORRECTION_HUNTER=false — skipping (set env var to 'true' to enable)")
        # But allow manual invocation via --force
        if "--force" not in sys.argv:
            return 0

    try:
        signals = json.load(open(input_path))
    except Exception as e:
        log(f"fail: cannot read input {input_path}: {e}")
        return 2

    log(f"loaded {len(signals)} signals; size={os.path.getsize(input_path)} bytes")

    # Import RLM only after input loaded — keeps fast-exit path cheap.
    try:
        from rlm import RLM
    except ImportError:
        log("fail: rlms not installed (pip install rlms litellm --break-system-packages)")
        return 3

    rlm = RLM(
        backend="litellm",
        backend_kwargs={
            "model_name": "ollama/qwen3:8b",
            "api_base": "http://localhost:11434",
            "timeout": 1200,
            "request_timeout": 1200,
        },
        environment="docker",
        environment_kwargs={"image": "python:3.11-slim"},
        verbose=False,
        max_iterations=8,
        max_depth=1,
        max_timeout=1500,
    )
    log("RLM constructed (docker env + litellm+ollama/qwen3:8b)")

    # Pass signals as a Python literal the REPL can exec.
    # qwen3:8b writes code that iterates `signals` and returns JSON.
    # Budget: single completion call, LLM writes ONE script that does all 68.
    signals_literal = json.dumps(signals, separators=(",", ":"))

    prompt = f"""You are a precise fact-checker for AIBTC signals — on-chain news posted by AI agents about Bitcoin / Solana / Stacks protocol activity.

The Python variable `signals` in the REPL contains a JSON list of {len(signals)} signals. Each item has:
  - id: UUID
  - author: correspondent display name
  - beat: "bitcoin-macro" or "quantum"
  - ts: timestamp
  - status: "submitted" or "approved"
  - headline: short title
  - content: signal body (<=1500 chars)
  - sources: array of URLs the signal cites

Your task: find **factual errors or stale claims** inside each signal. Focus on these error classes:

1. NUMERIC_MISMATCH — the headline asserts a number but the content contradicts it (e.g., headline says "-3.80% retarget" but body cites "-4.11%"), or two different signals from today cite clearly inconsistent numbers for the same on-chain fact at the same time window.
2. WRONG_PR_OR_ISSUE — the signal claims a GitHub PR/issue/repo does X, but the cited URL obviously mismatches (wrong repo in URL, number impossible for that repo, contradicts own description). You CANNOT fetch URLs from the Docker REPL — only catch internal contradictions visible in the text.
3. STALE_CLAIM — signal presents a state that its own body reveals is outdated (e.g., "ECDSA still exposed" paired with a body claim of >100 days since something that happened yesterday).
4. ATTRIBUTION_ERROR — signal names a person / editor / protocol role and the content contradicts that attribution.
5. DUP — two signals in this batch have near-identical headlines AND near-identical body claims (likely an intra-batch duplicate the editor should reject).

WRITE A SINGLE PYTHON SCRIPT that:
- Iterates `signals`
- Checks each of the 5 error classes
- Builds `candidates = [...]` — a list of dicts with keys: `signal_id, author, beat, error_class, claim (the wrong text quoted verbatim, max 200 chars), why (1 sentence explanation), suggested_correction (1 sentence or None)`
- Prints `json.dumps(candidates)` at the end

Rules:
- Conservative > aggressive. A candidate must be provably wrong from the text alone. If you cannot cite the specific mismatching phrase, don't include it.
- Max 15 candidates total. Rank by severity. If you find fewer, that's fine.
- For DUP class, emit exactly one candidate per duplicate cluster (pick the later one).
- Do not fetch URLs. Do not import `requests` or `urllib`. Stay in-memory.
- If in doubt, omit. Toly-grade precision: one false positive burns credibility.

Respond with the FINAL JSON array. No prose.

# The signals variable is already loaded in the REPL. Do not re-paste it in your code.
signals = {signals_literal}
"""

    log(f"prompt size: {len(prompt)} chars; calling rlm.completion()...")
    try:
        result = rlm.completion(prompt)
        elapsed = time.time() - t0
        log(f"rlm.completion returned in {elapsed:.1f}s")
    except Exception as e:
        log(f"fail: RLM call raised {type(e).__name__}: {str(e)[:300]}")
        traceback.print_exc()
        return 4

    resp = getattr(result, "response", None) or str(result)
    # Try to extract JSON array from response (qwen3:8b may wrap in code fence or prose)
    candidates = None
    for attempt in ("direct", "strip_fence", "find_bracket"):
        try:
            if attempt == "direct":
                candidates = json.loads(resp)
            elif attempt == "strip_fence":
                s = resp.strip()
                if s.startswith("```"):
                    s = "\n".join(s.split("\n")[1:])
                if s.endswith("```"):
                    s = s[: s.rfind("```")]
                s = s.strip()
                # Strip optional "json" language tag
                if s.startswith("json"):
                    s = s[4:].strip()
                candidates = json.loads(s)
            elif attempt == "find_bracket":
                start = resp.find("[")
                end = resp.rfind("]")
                if start >= 0 and end > start:
                    candidates = json.loads(resp[start : end + 1])
            if isinstance(candidates, list):
                break
        except Exception:
            candidates = None

    if candidates is None:
        log(f"fail: could not parse RLM response as JSON array (first 500 chars): {resp[:500]}")
        # Still save raw for post-mortem
        with open(output_path + ".raw", "w") as f:
            f.write(resp)
        return 5

    log(f"parsed {len(candidates)} candidates")

    # Write candidates JSON
    with open(output_path, "w") as f:
        json.dump({
            "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "input_signal_count": len(signals),
            "candidate_count": len(candidates),
            "rlm_wall_clock_seconds": round(time.time() - t0, 1),
            "model": "ollama/qwen3:8b via litellm",
            "environment": "docker:python:3.11-slim",
            "candidates": candidates,
        }, f, indent=2)

    log(f"wrote {output_path} ({len(candidates)} candidates) in {time.time()-t0:.1f}s total")
    return 0


if __name__ == "__main__":
    sys.exit(main())
