<!-- P4P2-PRIVATE-SUPPRESS — PLATFORM-ONLY DISCLOSURE (Immunefi live program). NO public content drafts. -->

# Babylon Labs (Cosmos-Go chain) — Gate 1 (PRIVATE: Immunefi) — NEGATE (prioritized leads) / PARK (residual)

**Date:** 2026-05-29 (refreshed-queue #1, Ogie msg 8023)
**⚠️ PLATFORM-ONLY DISCLOSURE — Immunefi live program. P4→P2 fanout suppressed. No public content.**
**Target:** `babylonlabs-io/babylon` (Cosmos-SDK BTC-staking L1). Immunefi **$1M crit** [VER], 10%-of-funds, KYC likely (operator), 1/24h novice rate-limit. Blobless clone `gate2-clones/babylon` (KEEP — active Gate-1).
**Why #1 (realizable-EV ~$48K):** pure Cosmos-SDK state-logic (Go-unittest PoC-able) + **DIRECT #129/#137/#138/#166 arsenal fit** (tooling I built runs as-is) + fresh (2024-25) + less EVM-lens-saturated. Doubles as the June-Heimdall dry-run.
**Status:** IN-PROGRESS — arsenal first-pass DONE + triaged; module source-read NEXT.

---

## Arsenal first-pass (automated surface map)

In-scope modules (`x/`): `btccheckpoint btclightclient btcstaking checkpointing costaking epoching finality incentive mint monitor`. 374 Go files.

- **#166 Cache-Before-Validate** → **0 findings** (after the checkpoint/hook FP-tune this session). The 1 raw hit (`checkpointing SetCheckpointFinalized`) was source-read-triaged FP (validate-then-set; `SetLastFinalizedEpoch` is a monotonic counter, not a replay cache) — see detector README. [INSPECTED]
- **#138 No-Overwrite-Guard** → 37 raw (22 SET-NO-HAS + 15 SEQ-NO-MONOTONIC). **Genesis-noise filtered:** most SET-NO-HAS are in `InitGenesis`/`InitMsgQueue` (run-once trusted init, overwrite expected → DISCARD).
- **#129/#137** → not yet run (next).

### Source-read PRIORITY (the non-genesis SEQ-NO-MONOTONIC class — backwards-overwrite risk)
| Module | Class | Count | Why |
|--------|-------|-------|-----|
| **finality** | SEQ-NO-MONOTONIC | 5 | finality-provider votes/heights — a non-monotonic height/index write could overwrite a newer finality record (DC-9 sub-4 / #138 SEQ). Consensus-critical. |
| **btcstaking** | SEQ-NO-MONOTONIC | 6 | delegation/power sequence — backwards-overwrite of staking power. |
| **btclightclient** | SEQ-NO-MONOTONIC | 1 | BTC header chain tip/work index (lower PoC-feasibility — BTC-light-client). |
| incentive / monitor | SEQ-NO-MONOTONIC | 1 / 2 | reward/monitor counters — lower value. |

## Next steps (this Gate-1 continues)
1. Source-read the **finality SEQ-NO-MONOTONIC ×5** (highest: consensus-critical, pure-state, PoC-able via Go unit test) — confirm whether any height/index Set lacks a `>`/`>=` guard AND is reachable by a non-genesis msg path (not InitGenesis).
2. Source-read **btcstaking SEQ-NO-MONOTONIC ×6** (staking-power overwrite).
3. Run **#129** (keeper/handler/msg gate) + **#137** (cross-module canonicalization); re-run #138/#166 with `--from-c129 --scope-files-only` to focus.
4. Apply the **#166 + Doctrine #44 Step-5.12 checklist** to the epoching msg-queue + checkpointing dedup paths by hand (the detector cleared #166, but verify the epoch/checkpoint dedup semantics manually — bridges/epoch-queues are the highest-value #166 surface).
5. 5-target quality checklist (withdrawals/redemptions = costaking reward-claim; deposit/mint = btcstaking delegation; admin/upgrade = module params).
6. Verdict: CONFIRM (→ Go-unittest [EXECUTED] PoC) / NEGATE-compound / PARK.

**R-1 scope note:** confirm at dispatch which modules are in-scope on the Immunefi page (BTC-light-client may be partially OOS / lower-tier); KYC required for payout (operator step). PoC-mandatory + platform-only.

---

## VERDICT — NEGATE (prioritized high-severity leads) / PARK (residual)

**Finality SEQ-NO-MONOTONIC ×5 → NEGATE (direction-error trap caught).** #138 flagged the missing INLINE `>`/`>=` guard at the setter line, but the monotonicity guard lives in the CALLER on every path: [INSPECTED]
- `setNextHeightToFinalize` (tallying.go L114) — sole non-genesis callers are tallying.go L74 + L94, both INSIDE `TallyBlocks`'s `finalizationLoop` (L49-84): `startHeight = max(getNextHeightToFinalize, activatedHeight)` (L30-33, ≥ current) and `i` strictly increments, writing `i+1`. No path writes a value below the stored one. `grep` confirms NO other caller (+ genesis InitGenesis run-once).
- `SetNextHeightToReward` (rewarding.go L93) — sole non-genesis caller rewarding.go L48 is the same shape: loop from stored value, `height++`, write `height+1`, and gated `if nextHeightToReward != copiedNextHeightToReward` (only on advance).
- finality metrics hits (`SetGaugeWithLabels` L41/L53) = Prometheus telemetry, not state. genesis L64 = run-once.

**btcstaking SEQ-NO-MONOTONIC ×6 → NEGATE.** `IndexBTCHeight` (btc_height_index.go L22) keys by `babylonHeight` (consensus-monotonic block height → each EndBlock writes a fresh key, no sequence-overwrite; the flagged "value" is btcTip.Height stored per-height-key). `params.go` SetHeightToVersionMap (L96/L187) = governance-gated (admin-trust, R-1 OOS). genesis L292 + migrations/v2 L45/L54 = run-once. [INSPECTED]

**Net: no reachable backwards-overwrite in the prioritized class.** No surviving candidate → no PoC → no submission (correct under PoC-mandatory + Immunefi). NEGATE.

**PARK (residual, deeper pass / the June Heimdall hunt itself):** the checkpointing **BLS-multisig + validator-bitmap verify** path (`keeper.go` L108 `VerifyBLSSig` → L177 `GetValidatorSet(epoch).FindSubset(ckpt.Bitmap)` → L194 `VerifyMultiSig`) is a genuine **W-2 quorum-bitmap analogue** (does the bitmap bind to the SAME epoch+content the checkpoint commits to? Doctrine #44 territory). It is a *verify* path, NOT a dedup-cache (so #166 correctly stayed silent), but the bitmap-binding warrants a dedicated source-read — deferred, not foreclosed. Also residual: #129 C129-CHECKPOINT(6)+CROSS-MODULE(3) + #137 canonicalization(27) surface map.

## Compounds
- **#138 NEGATING-EXAMPLE — "Caller-Loop / Consensus-Key Monotonicity" (Babylon finality+btcstaking anchor):** a setter with no INLINE `>`/`>=` guard is NOT a backwards-overwrite when (a) its sole non-genesis caller is a monotonic increment loop (`start = max(stored, floor)`, `i++`, write `i+1`), OR (b) the store KEY is a consensus-monotonic block-height. **Directly sharpens #138 for the June Heimdall run** (Heimdall checkpoint/span/milestone finalization = the same setter-in-monotonic-loop shape → MUST trace the caller before flagging). Filed to Patterns + detector README.
- **#166 real-target FP-tune** (checkpoint/hook substring noise) already banked this session — Babylon = 0 after tune.
- **Heimdall dry-run = GO:** arsenal (#129/#137/#138/#166) ran clean end-to-end on a real Cosmos chain; #166 FP-tuned; #138 caller-loop NEGATING-example banked. June-ready.

---

_Gate 1: 2026-05-29-babylon-cosmos | PRIVATE/Immunefi | **NEGATE (finality+btcstaking SEQ leads — caller-loop/consensus-key monotonicity) / PARK (checkpointing BLS-bitmap W-2 analogue + #137 canonicalization residual)** | NO PoC (no candidate) | #138 caller-loop NEGATING-example compounded | June-Heimdall dry-run GO | clone purge-eligible | single-agent_
