# Detector #137 — Cross-Module Canonicalization Bypass

Companion to detector #129 (cosmos-sdk-go-ast). Walks a Go project, parses
each `.go` file with `go/parser`, and flags write / read paths that bypass
another module's canonical accessor on Cosmos SDK + Heimdall codebases.

Built 2026-05-28 per Ogie msg 7956 (Sherlock x Polygon Heimdall v2 prep,
critical path before Jun 15 contest window). Pure Go stdlib, zero external
deps, ~430 LOC.

## Build

```
TMPDIR=/home/claude-code/.go-tmp GOCACHE=/home/claude-code/.go-cache \
  go build -o detector137 ./...
```

(TMPDIR override required on Hetzner — host `/tmp` is restricted.)

## Usage

```
detector137 --path /path/to/heimdall-v2 \
  [--from-c129 c129-output.json] \
  [--scope-files-only] \
  [--json] [--include-tests]
```

- `--from-c129` consumes detector #129's JSON output. Findings inside files
  that #129 flagged as C129-CROSS-MODULE get `cross_module_gate=true`, which
  boosts confidence (higher cross-module-coupling = higher risk surface).
- `--scope-files-only` restricts the scan to files #129 flagged. Requires
  `--from-c129`.
- `--json` emits machine-readable JSON only. Default also prints a
  human-readable summary to stderr.

## Output shape

```json
{
  "target": "<dir>",
  "files_scanned": N,
  "files_skipped": M,
  "findings": [
    {
      "id": "C137-COIN-LITERAL",
      "file": "x/bank/keeper/send.go",
      "line": 142,
      "note": "sdk.Coin{} literal — use NewCoin(denom,amt) for denom regex validation",
      "cross_module_gate": true
    },
    ...
  ],
  "summary": {"C137-COIN-LITERAL": 3, "C137-DIRECT-KVSTORE": 1, ...},
  "from_c129": "c129-heimdall.json",
  "scope_files_only": false,
  "c129_files_loaded": 12,
  "elapsed_ms": 42
}
```

## Signature classes (10)

| ID                       | Detects                                                                            |
| ------------------------ | ---------------------------------------------------------------------------------- |
| `C137-DIRECT-KVSTORE`    | `ctx.KVStore(k.<Other>Keeper.storeKey)` — raw KV access from outside owning module |
| `C137-COIN-LITERAL`      | `sdk.Coin{Denom: ..., Amount: ...}` struct literal vs `NewCoin` (denom validated)  |
| `C137-ADDR-BYTES`        | `.Bytes()` on a likely bech32 address ident — skips canonical re-encode round-trip |
| `C137-CROSS-WRITE`       | `k.<Other>Keeper.<Field> = ...` direct field assignment bypassing owner's setter   |
| `C137-VALIDATE-SKIP`     | Cross-module call with inline struct-literal arg lacking upstream Validate         |
| `C137-PARAM-DIRECT`      | `k.paramSpace.Set(ctx, ...)` / `ps.Set` direct call bypassing owner module         |
| `C137-BECH32-PREFIX-RAW` | Hardcoded `"heimdall"` / `"cosmos"` / `"matic"` etc. bech32 prefix literals        |
| `C137-DEC-LITERAL`       | `sdk.Dec{}` literal vs `NewDec` / `NewDecFromStr` (precision-safe)                 |
| `C137-INT-CAST`          | `sdk.NewInt(int64(x))` overflow path — verify `x` bounded `int64`                  |
| `C137-CONSUMES-C129`     | Cross-reference flag — file appeared in C129-CROSS-MODULE list                     |

## Why this matters on Heimdall v2 (Sherlock Jun 15-Jul 6)

Multi-module Cosmos SDK chains (Heimdall = checkpoint + topup + clerk + bor
state-sync) share state across modules. Each module enforces invariants in
its own `Keeper.Set<X>` methods: denom regex, address normalization, event
emission, param-space validation. When a cross-module caller goes around
those wrappers — direct KVStore writes, struct-literal Coin construction,
raw `.Bytes()` casts on bech32 addresses — the owning module's invariants
can be silently violated. These are not always exploitable, but they are
the primary class of high-severity finding on multi-module Cosmos chains
because they break the implicit contract between modules.

Cross-reference: `brain/Sherlock-Polygon-Heimdall-Prep.md` §3 Detector
Priming; `brain/Doctrine.md` Doctrine #36 PERMANENT (Substrate-Coverage
Gate — detector #137 lifts P-floor on Heimdall family alongside #129).

## False-positive control

- `C137-VALIDATE-SKIP` fires liberally (any cross-module call with
  struct-literal arg). Use it as a triage signal, not a paste-ready
  candidate. Confirm upstream by reading the struct type's `Validate()`
  method (or absence thereof).
- `C137-COIN-LITERAL` and `C137-DEC-LITERAL` are sometimes intentional
  in test fixtures and migration code. Skip those by default — pass
  `--include-tests` only when needed.
- `C137-BECH32-PREFIX-RAW` may fire on constants module/config files
  where the hardcoding is intentional. Spot-check.
- `C137-CONSUMES-C129` is a confidence-boost flag, not a finding by
  itself.

## Smoke test

Synthetic fixture covers 8/10 signature classes (all except
`C137-VALIDATE-SKIP` which requires cross-keeper-call context and
`C137-CONSUMES-C129` which requires the `--from-c129` flag). On a clean
project with no Cosmos SDK imports, output is `files_scanned: N, findings: []`.

## Authority

- Ogie msg 7956 (2026-05-28) — build #137 in parallel with Wormhole NTT G2s
- `brain/Sherlock-Polygon-Heimdall-Prep.md` §3 — detector priming dossier
- Companion: `../cosmos-sdk-go-ast/` (detector #129) — gate-signal source
