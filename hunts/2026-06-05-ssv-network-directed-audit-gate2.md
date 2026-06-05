# SSV Network — Directed-Audit (Hornby method) — Gate-2 hypothesis battery

**Date:** 2026-06-05 · **Authority:** Ogie msg 8165-8167 · **Method:** directed-hypothesis (name component × bug-class × impact × delta-from-known), NOT a sweep · **Mode:** single-agent, PoC-before-FLAG, submission operator-gated, leak-safe.

**Verdict: NO CANDIDATE. 5/7 hypotheses traced → all NEGATE `[INSPECTED]`; 2 residual (delta-from-accepted-known) not-directly-traced.** No PoC, nothing to FLAG. EV-honest result (the seams hold — not forcing a finding for the $250K).

- **Repo/commit:** `ssvlabs/ssv-network` HEAD `9bb7b21` (PR #612, 2026-04-28; v2.0.0 staking+EB). In-scope proxy `0xDD9BC35aE942eF0cFa76930954a156B3fF30a4E1`. Immunefi ACTIVE $250K Crit (10%-funds, $50K floor), KYC, PoC-mandatory.
- **Prior Gate-1** (`hunts/2026-05-21-ssv-network-gate1.md`) covered the new staking + `commitRoot` (root COMMITMENT) voting → tight. It explicitly **deferred the proof CONSUMPTION** ("yet-to-find the consumer") — H4 is that fresh angle. Gate-0: 5 accepted known-issues (76267 EB-drift, 75571 frozen-index, 67215 1-wei-deposit, 66362 uint64-overflow, 77910 liquidator-liveness) foreclosed pre-hunt.

---

## P1 — likeliest net-new seams

### H4 — `SSVClusters.updateClusterBalance` EB-proof binding SOUNDNESS [constraint-completeness 4th seam — the Orchard analog]. **NEGATE `[INSPECTED]`.**
**Hypothesis:** missing constraint binding cluster-id ↔ EB-leaf ↔ root → forged effective-balance accepted → inflation/mis-liq.
**Trace (the constraint set, code not doc):** `_verifyMerkleProof` leaf = `keccak256(abi.encodePacked(keccak256(abi.encode(ctx.clusterId, ctx.effectiveBalance))))` against `ebRoots[blockNum]` — binds **both** clusterId + EB. `ctx.clusterId` is owner+operatorId-derived via `validateHashedCluster` (+ validates the `cluster` struct vs stored hash). `_verifyEBStaleness` **forces `blockNum == latestCommittedBlock`** (no stale-root replay) + `blockNum <= lastRootBlockNum` per-cluster backward guard. `_verifyEBLimits` range-bounds EB to `[32,2048]·validatorCount`. Double-hash with `abi.encode` (fixed 64-byte preimage → non-malleable, no aliasing).
**Why it holds:** every field the accounting consumes (clusterId, EB, blockNum, operatorIds, cluster struct) is leaf-bound, leaf-derived, or storage-validated. The "missing constraint" H4 names **exists**. Constraint-complete. **First EVM application of the constraint-completeness seam (DC-21/#47 4th seam) → clean NEGATE.**

### H2 — `ClusterLib.updateBalanceSSV` precision / rounding-direction [numerical-gap / C7]. **NEGATE `[INSPECTED]`.**
**Trace:** `usage = (newIndex - cluster.index)*validatorCount + (networkFeeIndexDelta*validatorCount)` — **exact integer multiply, no division → no rounding asymmetry in the function.** vUnit conversion: `ebToVUnits` = **CEILING** (`(vUnits-1)/32 + 1` → protocol-favorable over-charge, the *safe* direction); `vUnitsToEB` = floor (display/migration only). Balance floored at 0 (`usage > balance ? 0 : balance-usage`).
**Why it holds:** no loss-to-owner beyond intended conservative ceil-rounding (< 1 vUnit-fee/update = sub-dust); the protocol never under-charges itself. 66362 (overflow) already accepted; precision-direction is conservative-by-design.

### H6 — cross-cluster shared-operator corruption [`OperatorLib.updateClusterOperators`]. **NEGATE `[INSPECTED]`.**
**Trace:** operator `ethSnapshot.index` is a **global monotonic rate-accumulator** (advances `blockDiff·ethFee` once per block via `updateSnapshotSt`, sets `ethSnapshot.block = now`). Each cluster checkpoints its own `cluster.index`; charge = `(Σ operator.ethSnapshot.index) − cluster.index`. `ethValidatorCount` is per-operator (validator-limit only, NOT per-cluster fee).
**Why it holds:** settling cluster A advances O's index legitimately (elapsed-block fee) + moves O's block checkpoint forward — it injects no extra index; cluster B charges from its OWN checkpoint to the current monotonic index. Cross-cluster independent. (Accepted 75571 = the by-design frozen-index-on-remove.)

## P2 — composition hypotheses (P1 negated cleanly → assessed)

### H5 — third-party-forced liquidation of a VICTIM cluster. **NEGATE `[INSPECTED]`.**
**Trace:** `liquidate` is permissionless but guarded `if (clusterOwner != msg.sender && !isLiquidatableWithEB(...)) revert ClusterNotLiquidatable` — a third party can only liquidate a **genuinely** under-collateralized cluster; the liquidatable balance → liquidator is the intended incentive. An attacker can only submit the **TRUE** oracle-proven EB (H4 sound — can't fabricate adverse EB), which enforces correct accounting. A cluster collateralized for its real EB is not forcibly-liquidatable. The "force a HEALTHY cluster" premise fails; the genuine case folds into accepted-known **76267** + the liquidation-incentive design.

### H7 — permissionless `deposit` state-manipulation beyond griefing. **NEGATE `[INSPECTED]`.**
**Trace:** `deposit(clusterOwner,...)` is permissionless + only `cluster.balance += msg.value` (no settle, intentionally non-reentrant). Depositing to a cluster you don't own = keep-alive, but the depositor **cannot recover** the ETH (only owner withdraws). So manipulating liquidation state = burning own ETH to benefit the victim + deny a liquidator a discretionary reward = **self-harm, no gain, no fund-loss**. Folds into accepted **67215** (deposit-griefing class). No economic-state exploit.

### H1 — EB-drift COMPOSED / opposite direction. **NOT-TRACED (residual).**
Delta-from-accepted-**76267**. Premise (exploit the add-side 32-ETH-baseline latency against another party) is substantially undercut by H4 (EB-proof sound — attacker can't inject false EB) + H5 (forced-liq folds into 76267). Honest: not directly traced this cycle; the surviving angle would be a *different-victim* fee/liq mis-attribution during the add-side window — queued.

### H3 — `removeOperator` frozen-index COMPOSED. **NOT-TRACED (residual).**
Delta-from-accepted-**75571**. The sequence (remove → re-register, or co-operator settle ordering) making the preserved index double/under-count needs a `removeOperator`→`_resetOperatorState`→re-register trace + `updateClusterOperators` interaction with `block==0` (removed) operators (line 247: removed operators contribute their preserved index but skip snapshot-advance). Honest: not directly traced; queued as the highest-value residual (the `cumulativeIndex += operator.ethSnapshot.index` for `block==0` operators is the exact seam to walk next).

---

## Doctrine #52 impact-frame (per directive)
No finding → no impact to calibrate. Conservation boundaries identified + verified intact: **cluster-balance** (floored ≥0, fees protocol-favorable-rounded), **EB-root accounting** (constraint-complete proof binding), **fee-index** (monotonic per-operator accumulator), **liquidation-threshold** (genuine-undercollateralization-gated). None missing/mis-enforced on the traced paths → no Pattern-I escalator.

## Brain compounds
- **C-1 (DC-21/#47 first EVM anchor):** the constraint-completeness 4th seam applied to a non-ZK EVM Merkle-proof consumer (SSV EB-proof) → clean NEGATE. **SSV `updateClusterBalance` is a constraint-complete worked-NEGATING-reference** (leaf binds id+value, latest-root forced, range-limited, non-malleable double-hash) — reuse as the positive template for any future Merkle/EB/proof-consumption target (e.g., other DVT/restaking EB systems).
- **C-2:** Hornby directed-hypothesis method validated — naming component×class×impact×delta produced 5 clean rigorous NEGATES vs the prior Gate-1's broader sweep that deferred the consumer. Directed > sweep for audit-dense targets (Quantstamp ×2 + 5 known-issues).
- **C-3 (residual):** H3 frozen-index-on-remove composed-sequence is the one un-traced seam with genuine net-new potential (the `block==0` preserved-index contribution at OperatorLib:247) — next-cycle Gate-2 target.

_Directed-audit by Buzz · public-repo source-trace · PoC-before-FLAG (no candidate → no PoC) · submission operator-gated · leak-safe (Category-3, no public detail)._
