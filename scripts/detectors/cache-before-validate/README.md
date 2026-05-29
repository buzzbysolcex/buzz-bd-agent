# Detector #166 — Cache-Before-Validate-No-Cleanup (CWE-459/460)

**Sherlock arsenal** (joins #138 no-overwrite-guard + #165 bech32-deep for the June Polygon-Heimdall hunt). Go-AST walker matching the #129/#137/#138/#165 framework. Ground-truth-spec'd from **Zebra GHSA-4m69-67m6-prqp** (Ogie msg 8021 + 8023). Paired primitive: **Doctrine #44** (Identity-vs-Content Binding Gap).

## The pattern

An identifier is inserted into a dedup / seen / receipt / nonce / processed set on the **optimistic path (before validation completes)**, and the validation-**failure** branch does **not** remove it. A later **legitimate** item carrying the same identifier is then rejected as a duplicate → **lockout / DoS**.

Ground-truth anchor: `zebra-state` `service.rs` @ `d4cd662c` — `queue_and_commit` (L659-714) + hash-added-before-validation (L797-802). Fixed zebrad 4.4.2 / zebra-state 7.0.0. **Not a hunt target** (patched/public); ingested as a reusable detector seed.

## Sub-findings

| ID                           | Meaning                                                                                                            |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `C166-CACHE-BEFORE-VALIDATE` | dedup insert precedes a Verify/Validate/Check/Prove call, with **no** unwinding delete after it (the Zebra shape). |
| `C166-NO-CLEANUP-ON-ERR`     | dedup insert precedes a fallible early-return guard (`if … { return }`), with **no** unwinding delete.             |
| `C166-CONSUMES-C129`         | file was flagged by detector #129 (keeper/handler/msg surface) — escalation signal.                                |

## Control-flow heuristic (not pure-syntactic)

Per function, in source order:

1. **Insert** — `Set*/Add/Insert/Store/Mark/Record/Append/Register/…` call, or a `map[key]=val` assign, whose method/receiver/map-name/arg-key matches a **dedup keyword** (`receipt|seen|sent|nonce|processed|ack|commitment|replay|used|spent|claimed|packet|…`). Non-dedup `Set`s (e.g. `balanceStore.Set`) are ignored — this gate is what keeps FP low.
2. **Validate / fallible-after** — a Verify/Validate/Check/Prove call, **or** an `if … { return }` guard, occurring **after** the insert.
3. **Cleanup** — any `Delete/Remove/Unset/Clear/…` call or builtin `delete(m,k)` after the insert.

**FLAG** when (insert is dedup-class) ∧ (validate-or-guard-return after insert) ∧ (**no** delete after insert). The presence of _any_ post-insert delete suppresses the flag — that's the done-right cleanup-on-failure path (Hyperbridge `EvmHost.dispatchIncoming` L807→L814).

**CANDIDATE-surfacing** (flag-for-source-read), not zero-FP precise — per Ogie msg 8023.

### Known v1 limitations (tune in v2)

- Cleanup is matched at function granularity: _any_ dedup-class delete after the insert clears the flag. A function that unwinds a **different** key on the error path could be a false-negative. v2: key-level match (insert-key ↔ delete-key).
- Cross-function flows (insert in `f`, validate in callee `g`) are not traced — single-function only. v2: consume #129 keeper-graph to follow `dispatchIncoming`-style indirection.
- `defer k.Delete(...)` cleanup is counted as a post-insert delete (correctly suppresses; defers run on all return paths).

## Fixtures — bidirectional, 0 FP / 0 FN

`fixtures/positive_zebra.go` (must FIRE):

- `QueueAndCommitBlock` — seen-set insert before `VerifyBlockContextual`, no removal → `C166-CACHE-BEFORE-VALIDATE` ✅
- `RecvPacketBuggy` — `SetPacketReceipt` before `VerifyPacketCommitment`, no removal → `C166-CACHE-BEFORE-VALIDATE` ✅
- `HandleNonceBuggy` — `processedNonces[id]=true` before a sig guard-return, no delete → `C166-NO-CLEANUP-ON-ERR` ✅

`fixtures/negative_controls.go` (must NOT fire):

- `DispatchIncoming` — Hyperbridge done-right: receipt written then `DeleteRequestReceipt` on failure ✅ quiet
- `RecvWithUnwind` — map insert + builtin `delete(k.receipts, …)` on failure ✅ quiet
- `HandlePostRequest` — validate-then-cache (verify + Has-check BEFORE insert) ✅ quiet
- `SetBalance` — non-dedup setter ✅ quiet
- `MarkProcessedNoValidation` — dedup insert but no fallible op after ✅ quiet

```
RESULT: PASS (0 FP, 0 FN) — 2× CACHE-BEFORE-VALIDATE + 1× NO-CLEANUP-ON-ERR
```

## Heimdall-intended dedup surfaces (June hunt priming)

Pre-identified Cosmos-SDK / Tendermint / Heimdall-v2 dedup paths this detector targets — run `#166` over these first when the contest opens:

| Surface                          | Insert primitive                                    | #166 question                                                                                                                                  |
| -------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Checkpoint dedup**             | `SetCheckpoint` / `SetCheckpointBuffer` / ack-count | is the buffer/ack set written before checkpoint-signature/header validation, no unwind on reject?                                              |
| **Validator-set-update dedup**   | `SetValidatorSetUpdate` / nonce                     | is the VSU nonce marked processed before the update is validated?                                                                              |
| **Statesync nonce / chunk sets** | chunk-`Set` / `seen`                                | is a chunk marked received before its hash is verified? (reject → permanent gap)                                                               |
| **Span / milestone dedup**       | `SetSpan` / `SetMilestone` / `SetLastMilestone`     | is the span/milestone id recorded before validation, no unwind?                                                                                |
| **IBC packet-receipt**           | `SetPacketReceipt` / `SetPacketAcknowledgement`     | is the receipt set before `VerifyMembership` of the commitment proof? (ibc-go does verify-first — confirm any Heimdall fork didn't reorder it) |

Pairs with **Doctrine #44**: where a dedup id is computed over a strict subset (malleable), a #166 cache-before-validate becomes a _poisoning_ primitive (pre-seed a same-id variant) rather than just self-DoS.

## Real-target validation + FP tuning (Babylon, 2026-05-29)

First run on a real fresh Cosmos chain (`babylonlabs-io/babylon`, 374 Go files under `x/`): **1 raw hit** — `checkpointing/keeper/keeper.go:357 SetCheckpointFinalized`. Source-read triaged as a **FALSE POSITIVE**: `setCheckpointStatus(…, [Confirmed], Finalized)` validates the status and returns early on failure _before_ the `SetLastFinalizedEpoch` insert (validate-then-set), and `SetLastFinalizedEpoch` is a monotonic last-epoch counter, not a replay-dedup cache. Root cause: `validateMethodRe` substring-matched **"check" inside `AfterRawCheckpointFinalized`** (a hook).

**Fix applied (improves the June Heimdall run — same "checkpoint"/`Confirmed` noise):** `check` → `check([^p]|$)` (excludes the `checkpoint` substring); dropped bare `confirm` (status/hook noise); added `nonValidatePrefixRe = ^(After|Before|Emit|Event|Log|On|Get|Has|Is)` to exclude hooks/events/logging/reads from validation-classification. Post-fix: **Babylon → 0 findings**, fixtures still **0 FP / 0 FN**. Known residual: a real validation named `Confirm*` is now a false-negative (rare; noted for v2).

## Usage

```bash
go run main.go --path /path/to/heimdall-v2 [--from-c129 c129.json] [--scope-files-only] [--json] [--include-tests]
```

`--from-c129` + `--scope-files-only` restricts the scan to files #129 flagged as keeper/handler/msg surfaces (the highest-value dedup loci). Output: JSON (stdout) + human summary (stderr), same shape as #129/#137/#138/#165.

## Authority

Ogie msg 8021 (Zebra ground-truth intake) + msg 8023 (Go-AST build, Heimdall arsenal). Brain: Detector Seed #166 + Doctrine #44 (`brain/Patterns-Defense-Classes.md` v2.7, `brain/Doctrine.md` v3.18). Cross-pollination: first lit P3→P4 wire (`brain/Cross-Pollination-Log.md` §11). NEGATING-example anchor: Hyperbridge sibling-scan (`hunts/2026-05-29-hyperbridge-166-44-siblingscan-gate1.md`).
