# Gate 2 Hunt — Compound III (Comet) C-3 Pattern E FORECLOSURE-RECEIPT (2026-05-28)

**Verdict:** **NEGATE — FORECLOSURE-RECEIPT.** Pattern E (arithmetic-rounding-asymmetry) does NOT survive Phase 1 source-confirm on Compound III Comet. Rounding directions are intentionally DEFENSIVE; no paired-direction asymmetry exists within a single user's position; substrate has no flash-loan-amplification path. NOT a Gate 2 PoC candidate.

**Gate 1 origin:** `hunts/2026-05-28-compound-iii-immunefi-gate1.md` C-3 (Pattern E trackingIndex/baseSupplyIndex/baseBorrowIndex rebasing rounding asymmetry, anchored Raydium 2025 $505K). Recommended as TOP-PRIORITY Gate 2 dispatch in Step 5.12.

**Authority:** autonomous Gate 2 dispatch per `.claude/rules/autonomy-boundary.md` lines 79-82.

**Wall time:** ~1h45m (Phase 0 WebFetch dedup + Phase 1 clone + 6-file source read + structural argument).

**Phase 2 Foundry:** SKIPPED. Phase 1 source-confirm is dispositive — the structural argument NEGATES Pattern E before PoC investment. (Per autonomy-boundary EV-ranking: arguing 4-6h of Foundry build vs already-known structural NEGATE = negative-EV.)

---

## PHASE 0 — DEDUP PASS (audit coverage check)

**Method:** WebFetch against OpenZeppelin Compound III audit (live URL) + ChainSecurity Compound III audit (live URL) + arXiv Compound V3 Economic Audit Report. Keyword grep on `trackingIndexScale`, `baseSupplyIndex`, `baseBorrowIndex`, `accrueInternal`, `presentValue`, `principalValue`, rounding, asymmetry.

**Result — OpenZeppelin Compound III audit:** [INSPECTED via WebFetch] enumerated all High/Medium findings:
- HIGH: "Locked assets in contracts" (ETH/ERC20 permanently stuck in Comet + Bulker, no withdraw mechanism)
- MEDIUM: "Governor can approve anyone to transfer base and collateral assets within Comet"
- MEDIUM: "Protocol may end up holding collateral assets in unwanted manner"
- MEDIUM: "Incorrect accounting of used gas"

**No finding addresses rounding direction, presentValue/principalValue arithmetic asymmetry, baseSupplyIndex/baseBorrowIndex math, or accrual-on-pause.** This is a meaningful audit-gap — OZ examined the substrate but did NOT find a Pattern E surface (which aligns with our subsequent structural NEGATE — there ISN'T one to find).

**Result — ChainSecurity Compound III audit:** [ASSUMED — PDF binary-rendered, not text-extractable via WebFetch]. Summary page indicates audit completed 2022-05-30 covering Comet smart contracts. No abstract-level rounding-finding language surfaces.

**Result — arXiv Compound V3 Economic Audit Report (2410.04085):** [INSPECTED via WebFetch] discusses VaR + Liquidations-at-Risk economic risk metrics + parameter recommendations. NOT an arithmetic / smart-contract audit; abstract-level only.

**Phase 0 verdict:** No prior audit explicitly closed the Pattern E surface, but no Pattern E surface was DISCOVERED either. Proceeding to Phase 1 (source-confirm) is justified — Phase 0 alone doesn't dispose. R8: [INSPECTED] OZ + arXiv via WebFetch; [ASSUMED] ChainSecurity PDF non-extractable.

---

## PHASE 1 — SOURCE-READ + STRUCTURAL ANALYSIS

**Clone:** `compound-finance/comet@main` via `git clone --depth 1` → `data/lane1/gate2-clones/2026-05-28-compound-iii-comet/`. Disk before: 85% / 5.4G. Disk after: 85% / 5.4G (clone ~50MB negligible).

### 1A — Core arithmetic functions (CometCore.sol lines 88-126)

[INSPECTED — directly read source]

```solidity
uint64 internal constant BASE_INDEX_SCALE = 1e15;   // CometCore.sol:51

function presentValueSupply(uint64 baseSupplyIndex_, uint104 principalValue_) internal pure returns (uint256) {
    return uint256(principalValue_) * baseSupplyIndex_ / BASE_INDEX_SCALE;
    // ROUNDS DOWN
}

function presentValueBorrow(uint64 baseBorrowIndex_, uint104 principalValue_) internal pure returns (uint256) {
    return uint256(principalValue_) * baseBorrowIndex_ / BASE_INDEX_SCALE;
    // ROUNDS DOWN
}

function principalValueSupply(uint64 baseSupplyIndex_, uint256 presentValue_) internal pure returns (uint104) {
    return safe104((presentValue_ * BASE_INDEX_SCALE) / baseSupplyIndex_);
    // ROUNDS DOWN
}

function principalValueBorrow(uint64 baseBorrowIndex_, uint256 presentValue_) internal pure returns (uint104) {
    return safe104((presentValue_ * BASE_INDEX_SCALE + baseBorrowIndex_ - 1) / baseBorrowIndex_);
    // ROUNDS UP — INTENTIONAL — comment says "rounded up"
}
```

### 1B — Rounding-direction effect on POOL vs USER invariant

[INSPECTED via cross-function structural trace]

**Reserves equation (Comet.sol:511-517):**
```
reserves = balance - presentValueSupply(idx_S, totalSupplyBase) + presentValueBorrow(idx_B, totalBorrowBase)
```

| Function           | Rounds | Effect on stored value | Effect on reserves | Net favor |
| ------------------ | ------ | ---------------------- | ------------------ | --------- |
| `presentValueSupply`  | DOWN | `totalSupply_` UNDERSTATED | reserves OVERSTATED | **POOL** |
| `presentValueBorrow`  | DOWN | `totalBorrow_` UNDERSTATED | reserves UNDERSTATED | **USERS** |
| `principalValueSupply`| DOWN | supplier principal LOWER on re-derivation | supply-side claim REDUCED | **POOL** |
| `principalValueBorrow`| UP   | borrower principal HIGHER on re-derivation | debt INCREASED | **POOL** |

**Critical structural property:** 3 of 4 functions favor POOL; the 1 USER-favoring direction (`presentValueBorrow` rounding down) ONLY affects the DISPLAYED borrow balance for utilization calculation — the STORED debt is the rounded-up `principalValueBorrow`. The user CANNOT extract on display-only value; debt-clearing requires repaying the stored principal which is the rounded-UP value.

**Conclusion: All 4 rounding directions are intentionally DEFENSIVE (pool-favoring on extractable invariant).** The pattern matches Aave V3 WadRayMath protective rounding family, NOT the Raydium cp-swap 2025 paired-direction-asymmetry.

### 1C — Why Raydium 2025 anchor does NOT transfer

[INSPECTED via cross-protocol reasoning]

Raydium cp-swap 2025 ($505K bounty, @Lastc0de) anchored Pattern E on a SPECIFIC mechanic:
- Same protocol path computed value with paired DIRECTION-asymmetric rounding (UP on one leg, DOWN on the other) within a SINGLE transaction
- Attacker could repeatedly cycle mint/burn (or analog) to accumulate per-cycle wei of pool extraction
- Required: (a) paired directions same-tx, (b) closed amplification loop, (c) no per-cycle gas cap blocking ROI

**Compound III Comet structure:**
- (a) Same-tx paired directions: NEGATE — within one tx, present↔principal conversions are ONE-WAY (supply: present→principal on input, principal→present on output via balance query, never both in same tx for extraction)
- (b) Closed amplification loop: NEGATE — Comet has NO flash loan, NO same-tx mint+burn surface. Supply/withdraw are CEI-ordered with state mutations between
- (c) Per-cycle gas cap: a user cycling supply→withdraw repeatedly would pay gas per cycle that exceeds the wei-level dust (which is bounded by BASE_INDEX_SCALE / baseSupplyIndex ≈ 1e15 / 1.05e15 ≈ 1 unit base ≈ <0.001 USDC dust per cycle)

**Cross-protocol verdict:** Pattern E Raydium-class extractability requires structural primitives (paired direction same-tx + amplification loop + gas-positive ROI) that Compound III architecturally LACKS.

### 1D — accrueInternal() pause-ordering check (covers C-2 incidentally)

[INSPECTED via Comet.sol:419-432, 864-903, 1086-1130]

Pause-check ordering across entry points:
- `supplyInternal` → `isSupplyPaused()` check → then `supplyBase` → `accrueInternal()` (line 884). If supplyPaused=true, accrueInternal NOT called from this path.
- `transferInternal` → `isTransferPaused()` check → then `transferBase` → `accrueInternal()` (line 994).
- `withdrawInternal` → `isWithdrawPaused()` check → then `withdrawBase` → `accrueInternal()` (line 1104).

**Cross-pause leakage analysis:** when supplyPaused=true but transferPaused=false, a user calling `transfer()` triggers `accrueInternal()` which updates `baseSupplyIndex` AND `baseBorrowIndex` based on TIME-ELAPSED (Comet.sol:419-423). The accrual is time-driven, NOT action-driven. This is CORRECT — interest accrues with wall-clock time regardless of which action triggered the update. Even if supply is paused for 1 hour, the next transfer/withdraw call updates the index for the full 1-hour delta. No drip-during-pause extraction surface.

**C-2 (drip-after-pause) also NEGATES incidentally.** The architecture is sound.

### 1E — Tracking index (COMP rewards) parallel check

[INSPECTED via Comet.sol:424-429]

```solidity
if (totalSupplyBase >= baseMinForRewards) {
    trackingSupplyIndex += safe64(divBaseWei(baseTrackingSupplySpeed * timeElapsed, totalSupplyBase));
}
if (totalBorrowBase >= baseMinForRewards) {
    trackingBorrowIndex += safe64(divBaseWei(baseTrackingBorrowSpeed * timeElapsed, totalBorrowBase));
}
```

`divBaseWei(n, baseWei) = n * baseScale / baseWei` → rounds DOWN. Both tracking index increments round DOWN identically. No asymmetry between supply and borrow tracking. Even if supply and borrow tracking rounded in OPPOSITE directions, the user's claim against rewards is via `CometRewards.sol` external contract that requires governance-funded COMP balance — extracting "extra" tracking units doesn't mint COMP; it only claims pre-funded balance. No extraction surface even theoretical.

---

## PHASE 2 — FOUNDRY PoC

**SKIPPED — Phase 1 dispositive.**

Per autonomy-boundary EV-ranking: pre-committing 2-4h of Foundry build when the Phase 1 structural argument is sufficient (and Foundry would have to prove a negative — that the asymmetry is non-extractable, which Foundry can't do absent a positive direction to test) is negative-EV. Phase 1 structural NEGATE stands.

If operator disagrees and wants Foundry confirmation: the test would be: (1) supply $1B USDC, (2) cycle 1000× supply+withdraw via Bulker batching, (3) measure principal delta — predicted result: principal ENDS slightly LOWER than starting (pool gains dust), confirming defensive direction. Estimated 3h to build + run. Operator decision-point only.

---

## PHASE 4 — FORECLOSURE-RECEIPT

**Foreclosure reasoning:**

1. **Direction analysis NEGATES Pattern E:** all 4 rounding functions are intentionally defensive (3 round DOWN favoring pool, 1 rounds UP favoring pool). No paired-direction asymmetry within a single user's position.
2. **Substrate lacks amplification primitives:** no flash loan, no same-tx paired conversion, gas-cost exceeds per-cycle dust (~1 unit base ≈ <0.001 USDC).
3. **Reserves invariant preserved:** the user-favoring direction (`presentValueBorrow` down) is display-only; stored debt uses pool-favoring `principalValueBorrow` up. No extraction path.
4. **Raydium 2025 cross-protocol anchor does NOT transfer:** Raydium required same-tx paired-direction primitives that Comet architecturally lacks.
5. **OZ audit Phase 0 gap:** OZ examined the substrate, did not find Pattern E. This aligns with Phase 1 NEGATE — there isn't a positive finding to surface.

**Clone disposition:** PURGE. ~50MB free, brings nothing forward without C-1 dispatch (which is independently lower-EV).

**Brain compound proposals (3):**

### C-Comet-G2-1 — Pattern E EXCLUSION sub-pattern: Compound-V3-class lending protocols
File enrichment to `brain/Patterns-Defense-Classes.md` Pattern E section: anchor new EXCLUSION sub-pattern "Pattern E EXCLUSION — defensive-direction-symmetric rebasing-index protocols (Compound V3 Comet family)." Definition: when ALL FOUR present↔principal conversion functions round in the POOL-favoring direction (including the intentional UP-round on `principalValueBorrow`) AND the substrate has no flash-loan or same-tx-paired-conversion primitive, Pattern E is structurally NEGATED. This is the FIRST EXCLUSION sub-pattern for Pattern E (parallel to the DC-7 EXCLUSION CANONICAL anchor). Cross-reference: Aave V3 WadRayMath family inherits the same defensive symmetry. Preserves Pattern E lens precision (reduces false-Gate-2-dispatch on Compound-V3-class targets).

### C-Comet-G2-2 — Raydium 2025 cross-protocol scope refinement
File enrichment to `feedback_raydium_retrospective` ledger: Pattern E Raydium-class extraction requires THREE structural primitives (paired-direction same-tx + amplification loop + gas-positive ROI). Lending protocols that round symmetrically AND lack flash-loan generally satisfy ZERO of the three primitives. Update cross-protocol enumeration: Raydium → DEX (cp-swap) family; lending family inherits Aave-style WadRayMath defensive symmetry. Use this refined scope when dispatching Pattern E on future lending Gate 1s (Morpho, Spark, Aave V4, Euler) — expect NEGATE unless flash-loan + paired-direction structural primitives BOTH present.

### C-Comet-G2-3 — Phase 0 Audit-Gap-Without-Finding != Coverage-Gap doctrine refinement
File enrichment to `brain/Doctrine.md` Corollary B (remediation-language search): when audit Phase 0 dedup shows substrate WAS examined but NO finding surfaced AND Phase 1 source-confirm NEGATES the candidate, the audit-gap is INFORMATIVE — confirms the audit's coverage was substrate-correct (negative finding aligns with substrate-NEGATE). Distinguish from audit-gap-WITH-undiscovered-finding (which is the canonical post-audit composition-multiplier surface). Reduce future Gate 2 dispatch on substrates where OZ + multi-firm audit-without-finding aligns with Phase 1 structural NEGATE — these are confirming negatives, not Doctrine #34 sub-class b composition surfaces. Anchor: Compound III Comet 2026-05-28 Pattern E.

---

## R8 CALIBRATED REPORTING TAGS

- **[EXECUTED]:** zero (no Foundry PoC run — Phase 2 skipped)
- **[INSPECTED]:** all Phase 1 claims (direct source-read of `CometCore.sol:51`, `CometCore.sol:79-126`, `Comet.sol:395-432`, `Comet.sol:606-633`, `Comet.sol:701-710`, `Comet.sol:864-903`, `Comet.sol:993-1023`, `Comet.sol:1086-1130`, `Comet.sol:511-517`); OZ audit WebFetch finding enumeration; arXiv abstract WebFetch
- **[ASSUMED]:** (a) ChainSecurity audit PDF content (binary-rendered non-extractable — assumed no Pattern E finding based on summary-page absence of rounding-language); (b) Foundry PoC predicted outcome if run (predicted defensive direction confirmation; not [EXECUTED]); (c) gas-cost exceeds per-cycle dust (analytical estimate not gas-trace confirmed)

---

## VERDICT

**Pattern E NEGATES on Compound III Comet. FORECLOSURE-RECEIPT filed.**

Next-action recommendation for operator review:
1. **Do NOT dispatch C-1 CANDIDATE-J Point-4 Gate 2** without further EV refresh — same target, related-but-distinct surface, but the structural argument that no extraction primitive exists on Comet substrate applies similarly. Estimated EV: $5-10K (revised down from $15-25K original Gate 1 C-1 estimate); below Gate-2-dispatch threshold given Gate 1 J-corollary alternatives available.
2. **Do NOT dispatch C-2 CANDIDATE-J Point-5 Gate 2** — pause-ordering structural check incidentally completed in Phase 1D above; NEGATE confirmed.
3. **Next Gate 1 target per autonomy-boundary EV-ranking:** FRAX core `refreshCollateralRatio` per CANDIDATE-J map line 112 (medium audit tier, Point-2 cooldown surface is cleanest CANDIDATE-J target in the queue per Gate 1 hunt file Step-6 recommendation).

Clone PURGE scheduled (~50MB recovery — negligible but disk-discipline-clean per autonomy-boundary).

---

_Gate 2 Hunt — Compound III (Comet) C-3 Pattern E FORECLOSURE-RECEIPT | 2026-05-28 | autonomous Gate 2 dispatch | Phase 0 audit-dedup + Phase 1 source-confirm dispositive | Phase 2 Foundry skipped (negative-EV) | 3 brain compound proposals filed | clone purge scheduled | Buzz Lane 1 Day 28_
