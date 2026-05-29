<!-- P4P2-PRIVATE-SUPPRESS — PLATFORM-ONLY DISCLOSURE (Immunefi live program). NO public content drafts. -->

# Babylon Labs (Cosmos-Go chain) — Gate 1 SEED (PRIVATE: Immunefi) — IN PROGRESS

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

_Gate 1 SEED: 2026-05-29-babylon-cosmos | PRIVATE/Immunefi | arsenal first-pass DONE (#166 0-after-tune, #138 37→ genesis-filtered, finality+btcstaking SEQ-NO-MONOTONIC = priority) | #129/#137 + module source-read NEXT | clone KEPT (active) | single-agent_
