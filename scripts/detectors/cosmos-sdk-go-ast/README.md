# Detector #129 — Cosmos SDK Go AST surface mapper

**Status:** v1.0 LIVE 2026-05-28 deep night
**Build:** `go build -o c129-cosmos-go-ast .`
**Smoke-test:** `cosmos/cosmos-sdk@HEAD` (2026-05-28): 1690 files / 2.76s / is_cosmos_sdk=true / 5254 IMPORT + 92 KEEPER + 400 MSG + 25 BEGIN + 29 END + 87 CROSS-MODULE + 81 EVIDENCE + 8 INVARIANT
**Authority:** Operator directive 2026-05-28 deep night (msg 7951). CRITICAL PATH for Sherlock x Polygon Heimdall v2 engagement (lifts Doctrine #36 P-floor binding before Jun 15).

---

## Usage

```
./c129-cosmos-go-ast --path /path/to/heimdall-v2 [--json] [--include-tests]
```

Flags:

- `--path` (default `.`) — project root to scan
- `--json` — JSON to stdout only, no human-readable summary on stderr
- `--include-tests` — include `_test.go` files (default: skip)

Output format:

```
{
  "target": "<path>",
  "files_scanned": N,
  "files_skipped": M,
  "findings": [
    { "id": "C129-KEEPER", "file": "x/staking/keeper/keeper.go", "line": 42, "name": "Keeper" }
  ],
  "summary": { "C129-IMPORT": 5254, "C129-KEEPER": 92, ... },
  "is_cosmos_sdk": true,
  "elapsed_ms": 2764
}
```

The `is_cosmos_sdk` flag (true iff `C129-IMPORT > 0`) is the gate signal: BuzzShield V6 pipeline can branch on it to enable Cosmos-SDK-specific downstream lenses.

---

## Detected signatures (15 ids)

| ID | What it catches | Why it matters |
|---|---|---|
| `C129-IMPORT` | Import path starting with `github.com/cosmos/cosmos-sdk`, `cosmossdk.io/`, `github.com/cometbft/cometbft`, or `github.com/tendermint/tendermint` | Substrate gate — confirms Cosmos SDK target |
| `C129-KEEPER` | Type declaration ending in `Keeper` (not bare `Keeper`) | State-management hub; primary attack surface |
| `C129-MSG` | Type declaration starting with `Msg` (not bare `Msg`) | Tx request shape; entry point to handlers |
| `C129-HANDLER` | Receiver-method with `(ctx sdk.Context, msg *Msg<X>)` signature | Message handler — DC-3/DC-9 surface, Pattern A access control |
| `C129-BEGIN` | Function named `BeginBlocker` or `BeginBlock` | Block-start hook (DC-13 sub-5 informational vs authorization gate) |
| `C129-END` | Function named `EndBlocker` or `EndBlock` | Block-end hook (validator rotation, reward distribution) |
| `C129-INVARIANT` | Function `RegisterInvariants` or `AllInvariants` | Module-level invariants — what the protocol commits to |
| `C129-PARAM-SET` | Call to `SetParams` | Governance-mutable parameter write (DC-9 sub-2 timelock candidate) |
| `C129-PARAM-GET` | Call to `GetParams` | Parameter read — staleness candidate |
| `C129-CROSS-MODULE` | Struct field name matching `^[A-Z]...Keeper$` inside a Keeper type | Cross-module keeper reference (DC-6 cross-domain analog) |
| `C129-BECH32` | Call to `AccAddressFromBech32`, `ValAddressFromBech32`, or `ConsAddressFromBech32` | Address canonicalization (detector #165 sub-class — bech32 parse validation) |
| `C129-EVIDENCE` | Import from `cometbft/cometbft/types` or `tendermint/types` | Tendermint evidence module — equivocation surface |
| `C129-SLASH` | Call to `.Slash(` (any receiver) | Slashing logic — validator-jail-bypass + nothing-at-stake candidate |
| `C129-GOV-PROPOSAL` | Call to `.SubmitProposal(` | Governance proposal handler — DC-9 sub-2/sub-3 |
| `C129-CHECKPOINT` | Function name matching checkpoint heuristic (case-insensitive submit/validate/propose/ack/noack prefix or heimdall-prefix) | Heimdall-specific checkpoint surface (Polygon-Ethereum bridge) |
| `C129-STATESYNC` | Function name matching state-sync heuristic (state_sync / StateSyncer) | Heimdall to Bor state-sync surface |

---

## False-positive control

The detector source itself (`main.go`) contains zero Cosmos SDK signatures. Running the detector against its own directory:

```
./c129-cosmos-go-ast --path .
# → files_scanned: 1  is_cosmos_sdk: false  findings: []
```

This is the FP control — if it ever emits non-zero findings on self, a heuristic has regressed.

---

## Doctrine #36 P-floor lift

Per `brain/Doctrine.md` Doctrine #36 PERMANENT (Substrate-Coverage Gate, 2-anchor PERMANENT band: dYdX V4 Cosmos-Go + Bifrost Polkadot-Substrate-Rust + Hydration Substrate-Rust), substrate-blind hunts hit a P(finding) floor of **0.05**. The floor reflects: without language-aware AST coverage, the hunter cannot apply protocol-specific lenses with high confidence.

Detector #129 is the **first Cosmos-Go AST detector** in the brain catalog. It does NOT yet implement deep detectors (#137 cross-module canonicalization, #138 no-overwrite-guard) — those are downstream consumers of the surface map this produces. But the surface map itself is sufficient to:

1. **Gate-signal Cosmos SDK targets** — `is_cosmos_sdk: true` triggers Cosmos-specific downstream lenses
2. **Surface map for Step 5 (Standing-Intake)** — `summary` counts give a fast "what classes of surface exist here" answer
3. **Targeted file-list for Step 5.4 manual lens application** — `findings` array routes Phase 1 source-read time

For Heimdall v2 specifically, the Heimdall-tagged detectors (`C129-CHECKPOINT`, `C129-STATESYNC`) provide first-pass routing to the bridge surfaces operator named in §2 of the prep dossier (`brain/Sherlock-Polygon-Heimdall-Prep.md`).

P-floor lift status: **PARTIAL** (surface map LIVE; deep semantic detectors #137 + #138 + #165 remain to build). The Sherlock-Polygon engagement EV math can now use a substrate-aware P(finding) ≥ 0.05 floor + per-signature lens-fit multipliers, not the substrate-blind floor.

---

## Future work (Sherlock prep timeline)

- [ ] Detector #137 — cross-module canonicalization mismatch (semantic; build on C129-CROSS-MODULE surface)
- [ ] Detector #138 — no-overwrite-guard (semantic; build on C129-KEEPER + C129-PARAM-SET surface)
- [ ] Detector #165 — cosmos-bech32 deep validation (semantic; build on C129-BECH32 surface)
- [ ] 5 new consensus-specific detector seeds (equivocation evidence verification, validator-jail bypass, checkpoint signature aggregation, Bor-Heimdall state-sync nonce, governance parameter bounds)
- [ ] BuzzShield V6 pipeline wiring (Layer-1 surface map consumer)

---

_Detector #129 v1.0 | 2026-05-28 deep night | smoke-tested against cosmos/cosmos-sdk@HEAD (1690 files / 2.76s / 5254 IMPORT + 92 KEEPER + 400 MSG + 25 BEGIN + 29 END + 87 CROSS-MODULE + 81 EVIDENCE + 8 INVARIANT + 57 BECH32 + 14 GOV-PROPOSAL + 6 PARAM-SET + 30 PARAM-GET + 1 SLASH + 1 CHECKPOINT). Authority: operator msg 7951 2026-05-28 deep night._
