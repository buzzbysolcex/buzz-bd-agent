# Detector #138 — No-Overwrite-Guard

Cosmos SDK / Heimdall family. Flags state WRITES (`store.Set` / `k.Set*`) inside
**create-semantic** functions (`Add* / Create* / New* / Insert* / Register* /
Submit* / Append*`) that do **not** first check existence (`Has* / Exists /
Contains`, or `Get*`-then-`if found`). On a create path, a missing existence
guard lets a caller silently **overwrite** committed state.

## Why it matters on Heimdall v2

- **Checkpoint modules** — `AddCheckpoint` / checkpoint-buffer writes that
  overwrite an in-flight, validator-signed checkpoint.
- **Sequence / nonce state** — a sequence/ack write with no monotonic `>`/`>=`
  guard lets an older value overwrite a newer one → replay / double-spend.
- **Validator records** — an `AddValidator` overwrite can reset power / jail.

## Findings

| ID | Meaning |
|----|---------|
| `C138-SET-NO-HAS` | Set in a create-semantic fn with no existence guard. |
| `C138-CHECKPOINT-OVER` | ^ where the Set target/fn references checkpoint / header / snapshot / buffer (consensus-critical). |
| `C138-SEQ-NO-MONOTONIC` | Set on sequence/nonce/index/ack/height state with no `>`/`>=` comparison in the function. |
| `C138-CONSUMES-C129` | File was flagged by detector #129 (keeper/handler/msg surface) — confidence boost. |

Setter-named functions (`Set* / Update* / Upsert* / Overwrite*`) are excluded
(overwrite-by-contract). Guards recognized: strong (`Has*/Exists/Contains/IsSet`)
and soft (`Get*` paired with an `if`).

## Usage

```bash
go build -o /tmp/c138 .
/tmp/c138 --path /path/to/heimdall-v2 [--from-c129 c129.json] [--json] [--scope-files-only]
```

Output: JSON to stdout (same shape as detectors #129/#137), human summary to stderr.

Companion: `#129 cosmos-sdk-go-ast`, `#137 cosmos-cross-module-canonicalization`.
Authority: Ogie msg 7976 — Sherlock x Polygon Heimdall v2 prep (critical-path before Jun 15).
