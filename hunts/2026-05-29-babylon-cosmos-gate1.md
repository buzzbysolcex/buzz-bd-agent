<!-- P4P2-PRIVATE-SUPPRESS — PLATFORM-ONLY DISCLOSURE (Immunefi live program). NO public content drafts. -->

# Babylon Labs (Cosmos-Go chain) — Gate 1 (PRIVATE: Immunefi) — NEGATE (prioritized leads) / NEGATE [EXECUTED] (BLS-bitmap residual, resolved 2026-05-29)

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

**~~PARK~~ → RESOLVED: NEGATE [EXECUTED] (BLS-bitmap residual, 2026-05-29).** The checkpointing **BLS-multisig + validator-bitmap verify** path (`keeper.go` L173 `VerifyRawCheckpoint`: L177 `GetValidatorSet(epoch).FindSubset(ckpt.Bitmap)` → L190 `sum*3>totalPower*2` → L194 `VerifyMultiSig`) was traced end-to-end. The forged-quorum hypothesis (can a forged bitmap claim a quorum that didn't sign?) **NEGATES on every axis** — see "RESIDUAL RESOLVED" below. Remaining residual (un-hunted, lower-value): #129 C129-CHECKPOINT(6)+CROSS-MODULE(3) + #137 canonicalization(27) surface map.

## RESIDUAL RESOLVED — checkpointing BLS-bitmap forged-quorum = NEGATE [EXECUTED]

**Hypothesis (was [ASSUMED]):** can a forged/mismatched `ckpt.Bitmap` pass `VerifyRawCheckpoint` claiming a >2/3 quorum that did not actually sign? Traced the full bitmap→subset→power-tally→aggregate-verify chain. **NEGATE — binding sound on all 5 axes:**

1. **Aggregate-pubkey binding [EXECUTED].** `VerifyMultiSig` (`crypto/bls12381/bls.go` L138) does `AggrPKList(pks)` then `Verify(sig, aggPk, msg)` with `pkValidate=true`+`sigGroupcheck=true`. The sig verifies IFF the supplied pubkey set EXACTLY equals the real signer set. Setting a bit for a non-signer puts their key in the aggregate but their sig is not in `BlsMultiSig` → `e(sig,g)≠e(H(m),aggPk)` → fail. **PoC: `hunts/2026-05-29-babylon-bls-bitmap-binding-poc_test.go` `TestBitmapBindingPoC` PASS** — forged `{A,B,C}` against `agg(A,B)` FAILS; dropped-signer FAILS; cross-epoch replay FAILS; exact `{A,B}` verifies.
2. **Same-set power tally [INSPECTED].** `keeper.go` L181-189: `signersPubKeys[i]` and `sum += v.Power` are built in ONE loop over the SAME `FindSubset(ckpt.Bitmap)` result → the >2/3 check (L190) is over EXACTLY the verified signers. No split-set (tally-set ≠ verify-set) attack.
3. **Rogue-key defense via ENFORCED PoP [EXECUTED-callpath + INSPECTED-logic].** Only non-genesis registration = `WrappedCreateValidator` (`msg_server.go` L29), gated by `MsgWrappedCreateValidator.ValidateBasic` (`msgs.go` L35) → `VerifyPoP` → `pop.IsValid` (two-way: `PopVerify` under `DST_POP` proves BLS-sk possession + ed25519 signs the BLS pubkey, binding key↔validator). Enforced because **cosmos-sdk v0.53.5 `baseapp.runTx` calls `validateBasicTxMsgs` unconditionally for ALL exec modes** (read from SDK source L901-904; no `execModeCheck` guard) BEFORE the msg-handler dispatch (L906). `CreateRegistration` (`registration_state.go` L35) additionally blocks key-overwrite (L39) + cross-validator dup (L51). A rogue cancel-key `g^a·(∏pkᵢ)^{-1}` has unknown sk → no valid PoP → cannot register. **PoC: `TestPoPRejectsRogueKey` PASS** (PoP key-binding + DST≠DST_POP domain-separated).
4. **Construction-side hardening [INSPECTED].** `prepare/proposal.go` `VerifyVoteExtension`: per-VE epoch-match (L274, with an explicit in-code comment describing the "pollute the aggregate" attack + citing cometbft#2361), blockhash-match (L291), per-sig `VerifyBLSSig` (L297), `RejectUnknownFieldsStrict` (L239), re-marshal malleability check (L254). Babylon ALREADY hardened this exact family — the proposer cannot inject mismatched-epoch sigs into the aggregate.
5. **Selector mechanics [INSPECTED].** `FindSubset` (`x/epoching/types/validator.go` L49) iterates `0..len(vs)` (not `bm.Len()`), guards undersized bitmap (L53), ignores trailing over-bits (bounded loop); valset is address-sorted deterministic per epoch (`NewSortedValidatorSet`). Missing-BLS-key fails closed (`InitValidatorBLSSet` errors → BeginBlock fails). `GetSignBytes = BigEndian(epoch)||hash` (`types/utils.go` L122) — bitmap correctly NOT in signed bytes (it binds via pubkey aggregation, not via the message); epoch-in-message + DST = no cross-epoch/cross-context replay.

**Net: no candidate → no PoC-for-submission → no submission (correct under PoC-mandatory + Immunefi). NEGATE [EXECUTED].** The two load-bearing crypto claims are [EXECUTED] (Go-test PASS on the clone's real `bls12381` package); call-path enforcement is source-confirmed in SDK v0.53.5; module logic is [INSPECTED]. **The Go-test harness now validated end-to-end on a real Cosmos BLS module → June-Heimdall dry-run GO at [EXECUTED] level.**

## Compounds
- **BLS-aggregate-bitmap binding NEGATING-EXAMPLE [EXECUTED] (Babylon checkpointing W-2 anchor):** for a BLS-aggregate-over-bitmap quorum scheme, the validator-bitmap is AUTO-BOUND to the aggregate signature (wrong bit → wrong aggregate pubkey → verify fails) AND double-count is STRUCTURALLY IMPOSSIBLE (bitmap = set, each index 0/1), provided (a) the multisig is verified against exactly the bitmap-selected pubkeys with pkValidate/groupcheck, (b) the power tally is over the SAME bitmap subset, (c) rogue-key registration is PoP-gated. Filed to Patterns W-2 (forged-quorum facet) + Heimdall prep.
- **Heimdall cross-pollination (the high-value compound) [ASSUMED — verify at June Gate-1]:** the "validator-bitmap binding" question SPLITS BY SIGNATURE SCHEME. BLS-aggregate-bitmap (Babylon) = auto-bound + dedup-free + PoP-gated → LOW-p, hunt elsewhere. ECDSA-signature-ARRAY (Heimdall checkpoint votes, secp256k1 ecrecover) = binding shifts to per-sig `ecrecover` + EXPLICIT dedup + member-check + power-sum + canonical-digest. For Heimdall, the PRIMARY hunt axes become **double-count/no-dedup** (repeat one signer to inflate power — impossible in BLS-bitmap, possible in ECDSA-array if unsorted/undeduped), **non-member acceptance**, **signed-vote-bytes malleability/canonicalization** (Detector #44 identity-binding-gap: the signed digest must cover start+end+roothash+proposer+chainID+epoch), and ecrecover(0)/s-malleability. Do NOT port the BLS-binding low-p prior onto Heimdall.
- **#138 NEGATING-EXAMPLE — "Caller-Loop / Consensus-Key Monotonicity" (Babylon finality+btcstaking anchor):** a setter with no INLINE `>`/`>=` guard is NOT a backwards-overwrite when (a) its sole non-genesis caller is a monotonic increment loop (`start = max(stored, floor)`, `i++`, write `i+1`), OR (b) the store KEY is a consensus-monotonic block-height. **Directly sharpens #138 for the June Heimdall run** (Heimdall checkpoint/span/milestone finalization = the same setter-in-monotonic-loop shape → MUST trace the caller before flagging). Filed to Patterns + detector README.
- **#166 real-target FP-tune** (checkpoint/hook substring noise) already banked this session — Babylon = 0 after tune.
- **Heimdall dry-run = GO:** arsenal (#129/#137/#138/#166) ran clean end-to-end on a real Cosmos chain; #166 FP-tuned; #138 caller-loop NEGATING-example banked. June-ready.

---

_Gate 1: 2026-05-29-babylon-cosmos | PRIVATE/Immunefi | **NEGATE (finality+btcstaking SEQ leads — caller-loop/consensus-key monotonicity) / NEGATE [EXECUTED] (checkpointing BLS-bitmap forged-quorum — 5-axis binding sound; 2 Go-test PoCs PASS)** | residual: #137 canonicalization(27) un-hunted | #138 caller-loop NEGATING-example + BLS-bitmap-binding NEGATING-example + Heimdall ECDSA-array-vs-BLS-bitmap split compounded | June-Heimdall dry-run GO ([EXECUTED] harness validated) | clone purge-eligible | single-agent | PoC: hunts/2026-05-29-babylon-bls-bitmap-binding-poc_test.go_
