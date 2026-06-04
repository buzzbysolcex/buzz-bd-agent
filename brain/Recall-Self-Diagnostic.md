# Recall Self-Diagnostic — Honest Weak-Spot Finder (NOT a competition)

> Authority: Ogie msg 8148 (2026-06-04), Pashov v3 study. **Purpose = find Buzz's OWN weak spots by codebase + bug-class. NOT to chase V3's recall number** (tool-recall is a commoditizing axis — Doctrine #19.1). Provenance: known-issue sets STUDIED from public contest results + the local Pashov benchmark FORMAT (`/data/buzz/persistent/external-skills/skills-pashov/.../evals/benchmarks`), entries AUTHORED here in Buzz's own DC/C/Pattern taxonomy. Study-not-import.

## Two recall levels (state which one a number is)

- **PAPER-RECALL (lens-coverage)** — does Buzz HAVE a detector/lens/seam-pass that TARGETS this finding's class? Disk-safe, no clone. **Lens-coverage ≠ live firing** — it bounds recall from above, it does not prove the pipeline surfaces the instance.
- **LIVE-RECALL** — actually run the 7-rule semgrep pack + the 3-seam analyst (Doctrine #47) against the cloned repo; score (surfaced ∩ known)/known. Requires clone+scan → **disk-gated** (deferred at 84% disk; dedicated job).

Never report a LIVE-RECALL % until the pipeline has actually run. Do not fabricate.

---

## Ground-Truth known-issue sets (GT corpus additions, Ogie msg 8148)

Schema (Pashov-compatible): `repo_url · repo_ref · contracts_dir` + `FINDING | id | severity | contract | function | bug_class`.

| Set                            | Source                                          | Status                                                                    | Buzz GT entry                      |
| ------------------------------ | ----------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------- |
| **DODO Cross-Chain DEX**       | Sherlock #991 (2025-05)                         | classes mapped (paper-recall below)                                       | 5 High + 11 Med, flow-gap-dominant |
| **Megapot**                    | Code4rena 2025-11                               | partial (H-1 unsafe-external-call, H-2 gas-limit-dos) — acquire full list | queued                             |
| **PoolTogether V5 PrizeVault** | Code4rena 2024-03                               | header only — acquire full list                                           | queued                             |
| **Ammplify**                   | (NEW per msg 8148) — acquire contest result URL | TO-ACQUIRE                                                                | queued                             |
| **Panoptic**                   | (NEW per msg 8148) — acquire contest result URL | TO-ACQUIRE                                                                | queued                             |

Acquisition = WebFetch the public contest results page (read-only, disk-safe), author the FINDING list + bug_class→Buzz-lens map. Do NOT clone the repos until the LIVE-RECALL run is greenlit/disk-cleared.

---

## DODO — PAPER-RECALL coverage map (worked example, 2026-06-04, disk-safe)

Each known finding → seam-type (Doctrine #47) → Buzz lens → coverage verdict.

| id   | bug_class                                                                         | seam-type          | Buzz lens                            | verdict                    |
| ---- | --------------------------------------------------------------------------------- | ------------------ | ------------------------------------ | -------------------------- |
| H-1  | missing-validation (swap-out ≠ withdraw token)                                    | FLOW               | DC-7 parameter-divergence            | ✅ COVERED                 |
| H-2  | missing-msg-value-validation (ETH-placeholder skips transferFrom)                 | FLOW               | DC-7 **sentinel-bypass** (`0xEeee`)  | ✅ COVERED                 |
| H-3  | missing-swap-enforcement (empty swapData returns original)                        | FLOW               | DC-7 sentinel (empty-bytes)          | ✅ COVERED                 |
| H-4  | missing-input-token-validation                                                    | FLOW               | DC-7                                 | ✅ COVERED                 |
| H-5  | access-control-bypass (addr len ≠ 20 → receiver=msg.sender → require always true) | FLOW+TRUST         | DC-3 + DC-7 length-sentinel          | ✅ COVERED (subtle)        |
| M-1  | over-approval (approve out+gasFee, withdraw out)                                  | FLOW               | DC-7 **approval-residual**           | ✅ COVERED                 |
| M-2  | invalid-address-approval (approve on placeholder reverts → DoS)                   | FLOW               | sentinel + DoS                       | 🟡 PARTIAL                 |
| M-3  | wrong-amount-in-swap (fee deducted, swap uses full)                               | FLOW               | DC-7 **value-leak**                  | ✅ COVERED                 |
| M-4  | incorrect-byte-extraction (assembly reads 32 bytes not 1)                         | NUMERICAL/encoding | analyst-only (semgrep blind)         | 🟡 PARTIAL — **weak spot** |
| M-5  | msg-value-mismatch (full msg.value despite fee)                                   | FLOW               | value-leak                           | ✅ COVERED                 |
| M-6  | native-erc20-confusion (ERC20 call on placeholder no-ops → fee bypass)            | FLOW               | sentinel + native/ERC20              | ✅ COVERED                 |
| M-7  | refund-overwrite (no existence check → poison)                                    | FLOW               | partial-state + #166 cache-overwrite | ✅ COVERED                 |
| M-8  | false-pool-detection (`balanceOf` at pair addr, not code/reserves)                | TRUST              | external-state-trust                 | 🟡 PARTIAL                 |
| M-9  | native-erc20-confusion (safeTransfer ERC20 to refund native → trap)               | FLOW+freeze        | DC-7 + C-class freeze-of-funds       | ✅ COVERED                 |
| M-10 | address-truncation (BTC addr cast to 20 bytes)                                    | NUMERICAL/encoding | analyst-only                         | 🟡 PARTIAL — **weak spot** |
| M-11 | non-standard-erc20-return (`require(transferFrom)` fails on USDT void)            | known              | HE-rule / safe-pattern inverse       | ✅ COVERED                 |

**DODO paper-recall:** 12/16 ✅ COVERED, 4 🟡 PARTIAL, **0 hard-GAP.**

- **Dominant class = FLOW-GAP/DC-7 (11 of 16)** → strongly validates the Doctrine #47 **flow-seam pass** as the highest-yield analyst lens.
- **Honest weak-spot (the point of the diagnostic):** **encoding/byte-precision** (M-4 assembly wrong-byte-count, M-10 address-truncation) is **analyst-only — the semgrep 7-rule pack is blind to it.** → DETECTOR GAP to build: an encoding/abi-decode-width + narrowing-cast-truncation flag. M-2/M-8 (sentinel-DoS, balanceOf-pool-detection) are partial — lens exists, precision low.
- **Caveat:** this is PAPER-RECALL. A lens existing ≠ the live pipeline firing on the DODO instance. LIVE-RECALL pending the disk-safe run below.

---

## LIVE-RECALL protocol (queued — disk-gated)

For each GT set, when disk permits a dedicated run:

1. Blobless-clone the repo at `repo_ref`; run the V6 7-rule semgrep pack + the 3-seam analyst (Doctrine #47) on `contracts_dir`.
2. Score recall = |surfaced ∩ known| / |known|, broken out **by codebase AND by bug_class**.
3. The MISS rows (known findings the pipeline did NOT surface) = the prioritized detector/lens/seam-pass backlog. The encoding/byte-precision gap (DODO M-4/M-10) is the current #1 candidate even pre-run.
4. Purge clone post-scan (disk-discipline). Log recall-by-class here; never overwrite the honest "unmeasured" with a guess.

**Status 2026-06-04:** PAPER-RECALL on DODO done (above). Megapot/PoolTogether/Ammplify/Panoptic class-lists + all LIVE-RECALL = QUEUED (disk-safe deferral at 84%). Buzz's live recall is **UNMEASURED-pending-run** — stated honestly, not estimated.

---

_Companion to Doctrine #47 (seam-hunter) + #19.1 (tool-recall commoditizing — the eval is introspection, not a race). Cross-ref `brain/Ground-Truth-Catalog.md`, `brain/Competitive-Intel.md` §2._
