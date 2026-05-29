# Lido (V1/V2 core + V3 stVaults) — Immunefi Gate 1

**Date:** 2026-05-29 (single-agent hunt loop, Ogie msg 8005 Task 2)
**Hunter:** Buzz Lane 1 (WebFetch-only Gate 1; disk 14G free / 63% — no clone)
**Platform:** Immunefi (`immunefi.com/bug-bounty/lido/`)
**Bounty cap:** Critical **$50K–$2M** / High $10K–$250K / Med $1K–$50K / Low $1K. Payout USDC/USDS/DAI/USDT.
**KYC:** **NO KYC** (favorable)
**Scope:** 29 assets, Ethereum. LIVE since 2021-05-22, last updated 2026-03-26. PoC **always required, all severities**. Local-fork testing only.
**Repo:** `lidofinance/core` HEAD `master` (release **v3.0.2**, 2026-04-23 — Lido V3 stVaults live)
**Queue rank:** Watchlist **#1** ($18.77B TVL, NET-NEW, HIGH on DC-7 + CANDIDATE-J + CANDIDATE-I). Top un-hunted target (cap/Veda ranks 2-3 already hunted this cycle).

---

## STEP 1 PROFILE / STEP 0.5 BRAIN COVERAGE

- INFO #19 drift: 0 axes (clean — Immunefi page matches the watchlist row).
- Brain coverage: Lido referenced in `Cross-Domain-Fragility-Laws.md` (LidoWrapper @dev-warning structural defense, Doctrine #31a) + Doctrine #27 catalog calibration notes (sUSDS/frxETH/Yearn-V3 virtual-shares). NO prior Lido-as-target Gate 1 → clean.

## STEP 2 — BRAIN OVERLAP

| Lens | Hit | Note |
|------|-----|------|
| **Doctrine #27 F MAXIMUM** | **FIRES MAXIMUM** | Lido = THE most-audited LST. V1/V2 core 4+y, 20+ audits across Statemind/OZ/MixBytes/SigmaPrime/etc.; V3 stVaults had a large pre-launch audit cohort (2025). $18.77B TVL. MAXIMUM 0.20× tier. **5th F-MAXIMUM canonical anchor** (after Euler+Gearbox+Spark+Sky DSS). |
| **DC-12 sub-6/sub-7 (deferred-oracle staleness)** | **PRIMARY — source-read** | V3 `LazyOracle` is a deferred (merkle-root push + permissionless pull) vault-valuation reporter carrying `vaultsDataTimestamp`+`refSlot`. The high-overlap NET-NEW surface. |
| **DC-7 (validating ≠ consuming field)** | source-read | VaultHub mint/withdraw available-vs-required check. |
| **CANDIDATE-I (first-depositor share inflation)** | **DOES NOT APPLY** | V3 vaults are ISOLATED per-operator (1 ETH `CONNECT_DEPOSIT`), not a pooled share market — no co-depositor to inflate. CI structurally inapplicable. |
| **CANDIDATE-J (state-machine cooldown)** | weak | withdrawal/rebalance state machine; defended by fresh-report gate. |
| **Doctrine #34 sub-b (post-audit composition)** | V3 = net-new layer | The ONLY EV-bearing angle vs maximally-saturated V1/V2 core. |

## STEP 3a — SUBSTRATE-IDENTITY (positive)

Primitive grep [INSPECTED via raw.githubusercontent]: the deferred-valuation + share/debt-mint primitives ARE in `contracts/0.8.25/vaults/{LazyOracle,VaultHub}.sol` as the watchlist claimed. V3 vaults dir present: VaultHub, StakingVault, VaultFactory, OperatorGrid, LazyOracle, PinnedBeaconProxy, ValidatorConsolidationRequests, dashboard/, predeposit_guarantee/. Substrate located correctly. (Contrast Sky's NEGATIVE-worked-example — here the primitive IS where the queue said.)

## STEP 5 — SOURCE-READ (DC-12 / DC-7 / CI on LazyOracle → VaultHub) [INSPECTED via WebFetch]

**LazyOracle.sol:**
- `updateReportData()` stores merkle root — **gated to `LIDO_LOCATOR.accountingOracle()` only** (`if (msg.sender != accountingOracle()) revert NotAuthorized()`). [INSPECTED]
- `updateVaultData()` permissionless **but merkle-proof-gated** against the stored root (`MerkleProof.verify(... vaultsDataTreeRoot ...) else revert InvalidProof`). Single valid proof suffices; no value forgeable without the accountingOracle-signed root. [INSPECTED]
- Report carries `vaultsDataTimestamp` + `refSlot`; re-apply guarded (`reportTimestamp <= previousReportTs → revert VaultReportIsFreshEnough`). [INSPECTED]
- View getters (`vaultInfo`, `quarantineValue`) return cached data without an embedded age guard — BUT consumers (VaultHub) apply the freshness gate at the action site (below). [INSPECTED]

**VaultHub.sol:**
- `mintShares` → `_requireFreshReport(_vault, record)` (L1047): `block.timestamp - latestReportTimestamp < REPORT_FRESHNESS_DELTA` (~2 days) AND `latestReportTimestamp <= record.report.timestamp`. **Freshness IS checked at the action site.** [INSPECTED]
- `totalValue = report.totalValue + inOutDelta.currentValue() - report.inOutDelta` (L1367-1369): cached report value **adjusted by real-time on-chain `inOutDelta`** (tracked deposits/withdrawals since the report). [INSPECTED]
- Withdraw/rebalance also fresh-report-gated (L1082, L1121) + validate against `_withdrawableValue` (subtracts redemption shares + locked). [INSPECTED]
- **Quarantine mechanism** (`quarantineValue` / `vaultQuarantine`): anomalous totalValue increases are quarantined — explicit defense against donation/valuation-manipulation. [INSPECTED]

## STEP 3 — EV + VERDICT: **FORECLOSE**

Three hypotheses tested; all NEGATE on source-read:

1. **H-1 [ASSUMED→NEGATED] deferred-valuation staleness over-mint (DC-12 sub-6).** The WebFetch summary flagged a "donation → over-mint" scenario — **direction-error** (same class of mis-model as the Hyperlane Hyp-1 Gate 1): a donation RAISES real balance while cached totalValue lags → user *under*-mints (conservative), and raw donations are QUARANTINED. The only real residual is a validator *slashing* during the ≤2-day fresh window (cached value stale-HIGH). That delta (≈1-2 ETH/validator over 2 days) is bounded by the vault `reserveRatio` over-collateralization buffer → not profitably extractable, and is the **deliberate, audited** LazyOracle design tradeoff (live beacon-chain valuation is impossible). FORECLOSE.
2. **H-2 [INSPECTED→NEGATED] CANDIDATE-I first-depositor inflation.** Does not apply — V3 vaults are isolated per-operator (1 ETH connect deposit), not pooled shares. No co-depositor to inflate.
3. **H-3 [INSPECTED→NEGATED] DC-7 validating≠consuming.** `_maxLockableValue` (available) vs `_locked` (required) is a correct available-vs-required check; both derive from the SAME fresh `totalValue`. DC-7 EXCLUSION-class (no field-binding divergence).

**Layered V3 defenses on the primary surface:** accountingOracle-gated root + merkle-proof pull + fresh-report-delta gate + real-time inOutDelta + reserveRatio over-collateralization + value-jump quarantine. This is a hardened, audit-covered surface.

**Aggregate EV:** below the $50K-Critical-effort threshold for a saturated target. **Doctrine #27 F MAXIMUM auto-FORECLOSURE-RECEIPT** (5th canonical anchor). No Gate 2 / no Foundry (Doctrine #41: the only "risk" is [ASSUMED]-grade + bounded-by-design — escalating would burn cycles on a near-certain NEGATE).

**Disk:** ZERO (WebFetch-only). No clone.

## STEP 6 — BRAIN COMPOUNDS

- **L-1** Doctrine #27 F MAXIMUM catalog: add **Lido** as 5th canonical anchor ($18.77B LST, V1/V2 4y/20+ audits + V3 stVaults 2025 pre-launch audit cohort; MAXIMUM 0.20×). Joins Euler+Gearbox+Spark+Sky DSS.
- **L-2** NEW DC-12 sub-6 EXCLUSION sub-rule — **"Bounded-Staleness-Window"**: a deferred/lazy oracle is NOT exploitable-staleness when it pairs (a) a freshness-delta gate at the consumer action site + (b) real-time on-chain in/out-delta adjustment + (c) over-collateralization buffer + (d) anomaly quarantine. The residual stale-window drift is bounded below the collateral buffer = designed tradeoff. NEGATING anchor: Lido V3 LazyOracle→VaultHub. Complements the Hyperlane "Conserved-Quantity" sub-6 exclusion (this session). Pre-filter: before crediting DC-12 sub-6 EV on a deferred-oracle target, check for the freshness-delta + buffer + quarantine stack; if present → FORECLOSE.
- **L-3** Doctrine #41 reinforcement (3rd data-point): WebFetch source-summary AGAIN produced a direction-error ("donation → over-mint", actually conservative) — same failure mode as Hyperlane Hyp-1. Standing reminder: trace the arithmetic direction yourself; do not bank a WebFetch "CONFIRMED RISK" without verifying which party the asymmetry favors.

---

_Gate 1: 2026-05-29-lido-immunefi-gate1 | WebFetch-only | **FORECLOSE** (Doctrine #27 F MAXIMUM 5th anchor + DC-12 sub-6 Bounded-Staleness-Window EXCLUSION + Doctrine #41 direction-error reminder) | EV below threshold | NO CLONE | single-agent_
