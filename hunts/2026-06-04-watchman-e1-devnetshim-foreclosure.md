# FORECLOSURE RECEIPT — Watchman E.1 FALSE POSITIVE (DevnetSwapRouterShim)

**Date:** 2026-06-04 · **Authority:** Ogie msg 8149 · **Verdict:** FALSE POSITIVE → FORECLOSE (Doctrine #48)

## The flag
Watchman E.1 surfaced `base/base …/crates/utilities/test-utils/.../DevnetSwapRouterShim.sol:93 quoteExactInput` as a candidate.

## Why it's a false positive — forecloses on BOTH counts
1. **PATH-OOS (Doctrine #48).** `DevnetSwapRouterShim.sol` in `crates/utilities/test-utils/` is a **devnet test shim** — a simplified mock router for local testing. Not production, not deployed, holds no funds → **never a real finding.** Matches the path-scope filter on the `test-utils/` segment AND the `*Shim.sol` filename marker.
2. **REPO #45 cap-trap.** `base/base` = Coinbase Base — a blue-chip, audit-dense, crowd-combed repo. Per Doctrine #45 the find-probability is ~0; never a hunt target.

## Fix shipped (filter wired, pre-flag, both dimensions)
- **`scripts/lib/scope_path_filter.py`** — NEW canonical single-source path filter (`is_out_of_scope_path()`), self-test PASS (this exact shim path → OOS).
- **Gate-0** (`scripts/lane1/gate0-known-issues.py`) — `match_finding()` now returns `OOS-BY-CONSTRUCTION` for any test/mock/shim/devnet/script/example/fixture path **before** any known-issues match. End-to-end test PASS (shim → OOS; `Facility.sol` → proceed).
- **Watchman** (`scripts/lane1/clarity-deploy-watch.py`) — NOISE extended (`shim|devnet|fixture`; `script` omitted to avoid `subscription` collision). #45 cap-trap fold (`classify()` DENSE_DEMOTE) confirmed already present.
- **Doctrine #48** banked; #45 REPO-dimension confirmed in `thin-pool-discovery-scorer.py` (validation gate) + `clarity-deploy-watch.classify()`.

**Net:** the DevnetSwapRouterShim class of FP can no longer reach a flag. Loop continues.
