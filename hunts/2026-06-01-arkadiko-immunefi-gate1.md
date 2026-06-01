# Arkadiko (USDA CDP) — Immunefi Gate-1 — CANDIDATE [INSPECTED] (2 surviving, oracle path)

**Date:** 2026-06-01 (autonomous, Ogie msg 8097 — Bitflow→Arkadiko hunt)
**Target:** Arkadiko — USDA CDP stablecoin on Stacks (first DeFi on Stacks, Oct 2021)
**Platform:** Immunefi, **$100K max** (10% funds), PoC ALWAYS required (all severities), **no-KYC**, min severity Low
**Scope (Step-1 VERIFIED):** Clarity contracts in `contracts/` of master (`github.com/arkadiko-dao/arkadiko`), excluding test-only.
**Repo HEAD:** `--depth 1` 2026-06-01, 60M, 118 non-test contracts. Focus: `vaults-v2/` (freshest redesign) + `arkadiko-oracle-v2-3.clar`.
**Verdict:** **CANDIDATE → GATE-2 [EXECUTED] (both confirmed) → paste-ready drafted, operator-gated submit.** First survivor of the 2026-06-01 hunt. CR-01's own replay-fix introduced sub-finding #1.

**GATE-2 RESULT (2026-06-01, clarinet-sdk simnet — first Clarity exec harness on this box):**
- **#1 oracle signature cache-before-validate DoS — 4/4 PASS [EXECUTED]** (`hunts/poc/2026-06-01-arkadiko-oracle-166/`): under-quorum (2 trusted sigs) → `(ok false)` + both sigs marked `used`; full-quorum reuse → reverts `u8403` lockout; replay-key = per-(block,price) signature → keeper escapes by re-signing (=> **Medium, recoverable**, not permanent).
- **#2 missing consumer staleness — PASS [EXECUTED]**: `get-collateral-to-debt` returns identical `(ratio 20000, valid true)` on a 500-burn-block-stale price; quantified conditional bad-debt ~$50/vault for a $3→$1 move. TASK-3: NOT an accepted-risk (only an informal 2021 grant "30s cron" note) → clean novel gap.
- **Honest severity (Doctrine #14):** no GUARANTEED fund-loss end-state reproduced (the DoS is escapable; loss is conditional on a sustained stall over a price move on Stacks' miner-ordered mempool). Per operator gate → **#1 standalone Medium DoS, #2 standalone gap**; High-composition argument noted but conditional. Paste-ready: `hunts/poc/2026-06-01-arkadiko-oracle-166/PASTE-READY.md`. Submission OPERATOR-GATED.

---

## STEP-4.5 GATE-0 — KNOWN-ISSUES CORPUS (build-on-engagement)

Built `data/lane1/gate0/known-issues.json["arkadiko"]` (4 entries) from `Audit.md`: CR-01 (oracle signature **replay** → fixed by `signatures-used` map), ME-01 (staking rewards race), ME-02 (mint-fee front-run → `max-mint-fee`), ME-03 (tx-sender→contract-caller; `wstx-token` L55 keeps tx-sender BY DESIGN). SECURITY.md = boilerplate (min severity Low, test-only OOS).

## CANDIDATE DISPOSITIONS (Gate-0 live)

| Candidate | Gate-0 | Note |
|-----------|--------|------|
| **#1 Oracle signature cache-before-validate DoS (detector #166)** | NOVEL-VARIANT-REVIEW (1 shared baseline noun `oracle` vs CR-01; "same protocol, not same known-issue") | Distinct from CR-01 (replay). **CR-01's fix IS the source of this bug.** → Gate-2 |
| **#2 Missing oracle price staleness check in consumer** | NOVEL-VARIANT-REVIEW (1 shared `oracle`) | Not in any known-issue/audit entry. → Gate-2 |

Neither auto-killed — both proceed. (Gate-0 working as designed: dedup, not source-read substitute.)

---

## SUB-FINDING #1 — Oracle signature cache-before-validate DoS [INSPECTED]

`arkadiko-oracle-v2-3.clar` `update-price-multi` (L102-119):
```
(asserts! (< burn-block-height (+ block u10)) ERR-OLD-MESSAGE)                 ;; freshness
(asserts! (is-eq (fold and (map check-unique-signatures-iter signatures) true) true) ERR-SIGNATURES-NOT-UNIQUE) ;; <-- SIDE EFFECT
(if (>= check-result (var-get minimum-valid-signers)) (update-price-multi-helper ...) (ok false))  ;; quorum
```
`check-unique-signatures-iter` (L144-152) **map-sets each signature into `signatures-used` (cache INSERT) BEFORE the quorum gate.** The under-quorum branch returns `(ok false)` — a SUCCESS, so the inserts **COMMIT** without a price update, and the failure path never UNWINDS them. Textbook detector #166 (Zebra GHSA-4m69-67m6-prqp shape): cache-insert precedes validate; validation-failure branch doesn't unwind → a later legitimate same-id item is rejected as duplicate = lockout.

**Attack:** copy 2 of the keeper's 3 real signatures from the mempool (args are public). Submit `update-price-multi` with just those 2 → `check-result = 2 < 3` → `(ok false)` → those 2 signatures are now permanently `used`. The keeper's full-quorum tx `[sig1,sig2,sig3]` then reverts `ERR-SIGNATURES-NOT-UNIQUE`. Oracle-update lockout for that message. [INSPECTED]

## SUB-FINDING #2 — Missing oracle price-staleness check [INSPECTED]

`arkadiko-vaults-helpers-v1-1.clar` `get-collateral-to-debt` (L22-35) reads `(get last-price price-info)` and computes the collateralization ratio **without ever validating `last-block` age.** Grep of all of `vaults-v2/` + the oracle confirms NO consumer reads the oracle price `last-block` for staleness (only stability-fee accrual + DIKO rewards use `last-block`, unrelated). The price gates: `open-vault` (operations L85), `update-vault` (L139), and `liquidate` (manager L98 `asserts! (not (get valid …))`). Trust model is a "cron pushes price every 30s" (docs/grant.md) — keeper-liveness, NOT a documented staleness accepted-risk. [INSPECTED]

## COMPOSITION (the impact thesis)

#1 lets an attacker ACTIVELY induce the price stall that #2 fails to reject. During a real price move, a stale on-chain price → (a) mint USDA against overvalued collateral, or (b) evade liquidation of an under-collateralized vault → USDA bad debt / depeg; or (c) force unfair liquidation on a stale-low price.

## HONEST SKEPTIC / SEVERITY (do NOT over-assert — webfetch-direction discipline, Doctrine #14)

- **#1 is recoverable + probabilistic.** Nodes re-sign for a new `block` next round → keeper recovers; the attacker must win the tx-ordering race EVERY round (Stacks miner-ordered mempool — no Ethereum-style PGA guarantee). Sustained DoS is hard. Likely MEDIUM (oracle griefing/temporary lockout) on its own. The DAO-owner path `update-price-owner` (L87) is an out — owner can force a price, so worst case is bounded until owner intervenes.
- **#2 may be argued as accepted oracle-liveness design.** 4.5yr live + audited; if triage rules the no-staleness design an accepted keeper-liveness assumption, #2 is downgraded/OOS. BUT it's in the V2 path, not covered by the V1 CR-01 audit, and there's no written accepted-risk for it.
- **Severity is outcome-dependent (Doctrine #14: vector ≠ outcome).** The vectors are real + [INSPECTED]; the crit-tier OUTCOME (fund loss) needs a Gate-2 PoC showing a guaranteed stale window during a price move. Force nothing.

## GATE-2 PLAN

1. **#1 PoC (Clarinet, [EXECUTED] target):** set 3 trusted oracles; sign a price message off-chain (secp256k1 over `keccak256(block++token-id++price++decimals)`); submit under-quorum (2 sigs) → assert `(ok false)` + `is-signature-used` = true for both; then submit full-quorum (3 sigs incl. the 2 burned) → assert revert `ERR-SIGNATURES-NOT-UNIQUE`. Pure state-logic, no precompile — locally provable.
2. **#2 PoC:** `update-price-owner` set price P0; open a vault at min ratio; advance N blocks; (real price would move) — show `get-collateral-to-debt` still returns `valid` on the stale P0 and `liquidate` reverts `ERR_CAN_NOT_LIQUIDATE` despite an arbitrarily-old price (no staleness rejection).
3. Combine into a paste-ready ONLY if the PoC confirms a fund-loss-grade outcome; else file #1 as a MEDIUM DoS + #2 as an architectural staleness gap and let the operator decide submission.

## 5-TARGET SURFACE MAP (V2, [INSPECTED])

1. **Withdraw/Redeem** — operations close/withdraw + manager redemption (fee-block cap); gated by `get-collateral-to-debt`. (price-dependent → inherits #2)
2. **Liquidation+Oracle** — manager `liquidate` L98 gates on `(not valid)`; collateral-price fetched L126/161 for payout. **← #1 + #2 live here.**
3. **Deposit/Mint** — operations open/update L85/139 assert `valid`. (inherits #2)
4. **External calls** — trait-based (oracle/tokens/data/helpers traits); oracle is multisig 3-of-N + DAO-owner override.
5. **Admin/Upgrade** — oracle admin (set-trusted-oracle/min-signers/token-id) DAO-owner-gated; vaults migration v1-1..3. (centralization = OOS-class)

## BRAIN COMPOUND

- Detector #166 FIRST live Lane-1 hit (Zebra anchor → Arkadiko oracle). Pattern confirmed transferable to Clarity multisig-oracle signature dedup. The "fix-for-replay introduced a cache-before-validate DoS" is a reusable meta-pattern: **a replay-protection map added without unwinding on the failure path is a #166 candidate.**
- Lending arsenal: Arkadiko V2 = missing-oracle-staleness anchor (pairs with Granite/Zest oracle-freshness lenses; here the gap is the ABSENCE of the check the others HAD).
