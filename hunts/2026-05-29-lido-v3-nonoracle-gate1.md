# Lido V3 stVaults — non-oracle modules (OperatorGrid + PredepositGuarantee) — Gate 1

**Date:** 2026-05-29 (fresh-queue #1, Ogie msg 8011)
**Hunter:** Buzz Lane 1 (WebFetch-only; disk 14G/63% — no clone)
**Target:** `lidofinance/core` v3.0.2 `contracts/0.8.25/vaults/{OperatorGrid.sol, predeposit_guarantee/PredepositGuarantee.sol}`
**Cap:** $2M Critical, **no-KYC**. Surface-age: V3 stVaults v3.0.2 (Apr-2026, ~1mo fresh).
**Why #1 on the fresh queue:** net-new V3 modules NOT covered by the earlier Lido core Gate 1 (which read only LazyOracle→VaultHub). Novel mechanisms = highest p. Oracle-testing clause does NOT touch these (non-oracle).
**Verdict:** **FORECLOSE** — both novel modules well-guarded; flagged gaps NEGATE on direction-trace.

---

## OperatorGrid (per-operator/group share-mint limits) — FORECLOSE [INSPECTED via WebFetch]

- **DC-7 COMPLIANT:** `onMintedShares()` (L565-593) — the field that ENFORCES the limit (`tier_.liabilityShares` / `group_.liabilityShares`, checked L580-587) IS the field CONSUMED (incremented L582/588, decremented L608/611). No validating≠consuming divergence. Single source of truth.
- **Access control:** group/tier/limit mutation = `onlyRole(REGISTRY_ROLE)` (governance); `changeTier()` = dual-sig (vault owner + node operator). No unilateral limit manipulation.
- **[ASSUMED→NEGATED] uint96-truncation (CANDIDATE-E):** WebFetch flagged "no pre-check `_amount <= type(uint96).max` before `uint96(_amount)` cast (L582/588)." **Direction-trace NEGATES:** the limit check `tierLiabilityShares + _amount > tier_.shareLimit` (shareLimit is uint96 ≤ ~7.9e28) reverts on any `_amount > 2^96`; therefore any `_amount` that PASSES the check is ≤ shareLimit ≤ 2^96-1 → the `uint96(_amount)` cast is exact, truncation unreachable. (4th WebFetch direction-error this session — `.claude/rules/webfetch-direction-error.md` rule fired.)
- **[ASSUMED→NEGATED] `_overrideLimits` bypass:** VaultHub-only caller (L575) — trusted-caller-by-design, not a bug.
- **[ASSUMED→NEGATED] changeTier TOCTOU:** VaultHub owns both onMintedShares + changeTier → no concurrent intra-tx race; cross-tx state updates atomically.

## PredepositGuarantee (validator pre-deposit guarantee) — FORECLOSE [INSPECTED via WebFetch]

6 attack paths checked, all guarded:
- Double-lock / same-pubkey-twice → `ValidatorNotNew` revert (L490). Validator keyed by pubkey → single status record.
- Guarantor-to-guarantor leakage → refund only claimable by prior guarantor via `claimGuarantorRefund()` (L364, `guarantorClaimableEther[msg.sender]`).
- Predeposit replay across vaults → pubkey-keyed uniqueness reverts 2nd predeposit.
- Front-run with invalid WC → independent per-pubkey tracking; `proveInvalidValidatorWC()` per-validator.
- Deposit-sig bypass → `verifyDepositMessage()` (BLS) on every predeposit (L495); WC proven via merkle-proof-vs-beacon-root (`_validatePubKeyWCProof` L548).
- Staged-balance race → graceful fallback to PROVEN, re-activatable.
- Only "gaps" = documented NO↔guarantor mutual-trust + vault-WC-immutability (by-design, not exploit vectors).

## VERDICT + COMPOUND

**FORECLOSE.** Both novel V3 modules are well-defended (BLS+merkle+role-gated+atomic-accounting; DC-7 compliant). The flagged gaps NEGATE on direction-trace.

**Doctrine #42 REFINEMENT (the key lesson):** **fresh ≠ unaudited.** Lido V3 stVaults is FRESH (v3.0.2, ~1mo) but had a HEAVY pre-launch audit cohort (Statemind/MixBytes/OZ on the V3 launch) → even its novel modules are defended. So Doctrine #42's "surface-freshness" weight must be qualified as **"fresh AND audit-LIGHT"** — a net-new module in a mature protocol that received a big pre-launch audit (Lido V3, Aave Umbrella) has LOWER p than a fresh protocol with 0-2 audits (Resolv/Falcon/Usual, fresh Solana). This is exactly Doctrine #37 Sub-Type C (unaudited-and-active = the real EV uplift). **Re-rank the fresh queue: audit-light-fresh > heavy-pre-launch-audited-fresh.** Lido V3 demoted (fresh but audit-heavy → predictable foreclose); the audit-light rows (7) promoted.

**Disk:** ZERO (WebFetch-only).

---

_Gate 1: 2026-05-29-lido-v3-nonoracle | WebFetch-only | **FORECLOSE** (OperatorGrid DC-7-compliant + uint96-truncation NEGATED-on-direction-trace [4th direction-error]; PredepositGuarantee 6/6 paths guarded) | Doctrine #42 refinement: fresh≠unaudited, weight audit-LIGHTness | NO CLONE | single-agent_
