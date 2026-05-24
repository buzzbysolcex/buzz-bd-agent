# Invariants Ledger

> Layer 3.5 Invariant Analysis — accumulated protocol-safety properties discovered by Stage 1 across all scans.
> Initialized: 2026-05-14 (Layer 3.5 MVP ship day).
> Purpose: cross-pollination signal. An invariant that re-surfaces across multiple scans = a structural property worth permanent codification (eventually folds into deterministic detector packs).

---

## Schema

| Field              | Meaning                                                                                         |
| ------------------ | ----------------------------------------------------------------------------------------------- | ------ | --- | ------- | ------ | ----- | ---- |
| **ID**             | Stride-INV-N, Aave-INV-N, etc. — first-scan binding                                             |
| **Statement**      | Plain-language invariant from Stage 1 discovery                                                 |
| **Protocol class** | LST/staking                                                                                     | bridge | DEX | lending | oracle | mixer | etc. |
| **First scan**     | scan-id where surfaced                                                                          |
| **Re-surfaces**    | subsequent scan-ids where the same invariant (or paraphrase) was rediscovered                   |
| **Outcome**        | UNTRIAGED / FP_GOVERNANCE / FP_BOUNDED / FP_OOS / UNCERTAIN_CRITICAL / CONFIRMED_BUG / CODIFIED |

---

## Stride (LST / Cosmos SDK liquid staking) — 2026-05-14

First Layer 3.5 live test. 8 invariants discovered across 5 ranked critical contracts (x/stakeibc/keeper/transfer.go, x/stakeibc/types/params.go, x/interchainquery/module.go, app/upgrades/v18/constants.go, app/upgrades/v7/upgrades.go). 24 violation findings (3 CRITICAL + 8 HIGH + 13 MEDIUM/LOW). All CRITICAL/HIGH share governance-precondition or upgrade-migration shape. UNCERTAIN_CRITICAL pending operator gate 4/5 review.

| ID           | Statement                                                                                                                                                                                               | Class     | Outcome                                                                                                                                                                                                                                                                                                                   |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stride-INV-1 | Redemption rate must stay within [MinRedemptionRate, MaxRedemptionRate] with Min ≥ 0.75, Max ≤ 10.0                                                                                                     | LST       | UNTRIAGED (HIGH violations L3.5d-1/-2 in params.go — governance-precondition class)                                                                                                                                                                                                                                       |
| Stride-INV-2 | Deposit records must never transfer to halted host zone or empty delegation ICA; record status must progress TRANSFER_QUEUE → TRANSFER_IN_PROGRESS → DELEGATION_QUEUE → DELEGATION_IN_PROGRESS strictly | LST       | **VERIFIED FP_DORMANT_CODE** — L3.5d-5/-6 target community-pool functions whose caller `ProcessAllCommunityPoolTokens` is DISABLED in v28+ (hooks.go:91 commented out). Live deposit path enforces halt-check correctly.                                                                                                  |
| Stride-INV-3 | Total stToken supply per host zone = (total native delegated / current redemption rate) within rounding tolerance                                                                                       | LST       | UNTRIAGED (MEDIUM violations, conservation property)                                                                                                                                                                                                                                                                      |
| Stride-INV-4 | IBC transfer timeouts must be bounded [10 min, 1h], every in-flight transfer must have associated deposit record with completion/rollback path                                                          | LST + IBC | **VERIFIED FP_DORMANT_CODE + FP_SCOPE_OVERGEN** — L3.5d-11/-12 target community-pool path (DISABLED in v28+). Even hypothetical: no DepositRecord lifecycle in CP path, so no rollback needed. Live deposit path uses governance-bounded `KeyIBCTransferTimeoutNanos` param + IBCCallbacksID_NativeTransfer ack callback. |
| Stride-INV-5 | StrideCommission ≤ 100, ValidatorWeightCap positive ≤ 100                                                                                                                                               | LST       | **FP_GOVERNANCE** — 3 CRITICALs (L3.5d-13/-14/-15) all require malicious genesis or governance proposal. OOS for typical bug bounty.                                                                                                                                                                                      |
| Stride-INV-6 | Community pool transfers must route native to CommunityPoolStakeHoldingAddress, stTokens to CommunityPoolRedeemHoldingAddress only                                                                      | LST       | UNTRIAGED (MEDIUM violations, type-routing)                                                                                                                                                                                                                                                                               |
| Stride-INV-7 | Zero-amount deposit records must be removed not transferred; no IBC transfer for deposit Amount ≤ 0                                                                                                     | LST       | **VERIFIED FP_ATOMIC_SCOPE** — L3.5d-19 mis-read filter+removal-guard redundancy as race condition. Function takes `epochNumber` as parameter (fixed scope); SDK BeginBlocker is atomic. No race. Current-epoch zero records intentionally deferred to next epoch by design.                                              |
| Stride-INV-8 | Unbonding redemption rate must match rate-at-initiation, not current rate, to prevent retroactive manipulation                                                                                          | LST       | UNTRIAGED (HIGH violation L3.5d-22 in app/upgrades/v18/constants.go — upgrade-migration class, runs once, low live-exploit surface)                                                                                                                                                                                       |

---

## Cross-Pollination Watch

When future LST scans (Lido, Rocket Pool, Frax sfrxETH, EigenLayer pool restaking, Etherfi, Renzo, Stader, Ankr) run Layer 3.5:

- Re-surfacing of Stride-INV-1 (redemption-rate bounds) → strong signal that LST redemption-rate bound enforcement deserves a dedicated deterministic detector
- Re-surfacing of Stride-INV-3 (total-supply conservation) → universal LST invariant; codify as Pattern I (Conservation Asymmetry — share/asset balance)
- Re-surfacing of Stride-INV-8 (rate-at-initiation vs rate-at-redemption) → universal LST anti-flash-redemption invariant; codify if seen on a 2nd protocol

Cross-pollination threshold: 3 distinct protocols same invariant → codify into deterministic detector (skips L3.5 Anthropic cost on subsequent scans).

---

## GMX POC Retrospective — 2026-05-14 (validation gate)

POC fixture: `/home/claude-code/.tmp-poc/gmx-oracle-staleness/` (PriceFeed.sol + Vault.sol). Bug: silent stale-price return (staleness check exists but returns cached price instead of reverting).

L3.5 surfaced (confidence 0.97-0.99 on synth fixture, 235s elapsed):

| ID            | Statement                                                                                                            | Outcome                                                                                   |
| ------------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| GMX-POC-INV-1 | Any price consumed by Vault for PnL computation MUST have a timestamp within maxStaleness seconds of block.timestamp | **CONFIRMED_BUG** (synth) — VIO-1/3/7/10 caught the silent-stale-return at 0.97-0.99 conf |

**Conclusion:** Layer 3.5 successfully reverse-discovered the historical $565K GMX V1 oracle staleness invariant from a 30-line PriceFeed.sol synth fixture. Validates that Stage 1 + Stage 2 architecture is structurally sound for surfacing economic-safety properties beyond keyword-based detectors.

---

## Discovery Cost (Stride live test)

- Stage 1 (discover 8 invariants from 5 contracts): 62.3s, 18412 input + 3530 output tokens
- Stage 2 (3 violations × 8 invariants = 24 findings): 266.3s, ~93000 input + ~24000 output tokens (8 calls × ~12K avg)
- Total wall-clock: 328.7s (~5.5 min)
- Estimated cost (Sonnet 4.6): ~$0.40-$0.50 per target

L3.5 is therefore **5–10× cheaper than a deep-mode scan** and surfaces invariant-class candidates that pattern-based detectors structurally cannot.

---

## CANDIDATE INVs (post-mortem retrospectives, NOT in active scan catalog) — 2026-05-15

The following INVs are CANDIDATE entries from public-disclosure retrospective intakes. They are filed here for cross-pollination signal-tracking but are NOT in the active L3.5 scan invariant catalog. Promotion gated on: (a) 1+ additional adjacent worked example, AND (b) operator promotion decision, AND (c) post-CVP automated pipeline validation against the cross-pollination protocol list.

### INV-CLMM-TICK-1 (CANDIDATE) — KyberSwap Elastic 2023

**Statement:**

> For any CLMM pool, every sub-swap that does NOT change `sqrtP` MUST NOT advance `currentTick`. The tick recomputation gate's reference point MUST be the sub-swap's `startSqrtP` (entry snapshot), never the running `nextSqrtP` (most recent intermediate).

**Class:** state-machine integrity (CLMM tick-boundary)
**Specialization of:** Priority #1 WEAKER-PROPERTY-THAN-DOWNSTREAM-ASSUMES
**Canonical worked example:** KyberSwap Elastic `Pool.sol:405-408` (pre-fix) — bug fixed at `ks-elastic-sc Pool.sol:413-419` per 100Proof post-mortem 2023-05-23
**Same-family sibling in brain:** Huma V1 INV-2 (lending domain, same state-machine integrity class)
**Full intake artifact:** `incidents/2023-05-23-kyberswap-elastic-100m-double-add.md`
**Cross-pollination candidates (post-CVP scan queue):** Uniswap V3 (parent architecture), Trader Joe Liquidity Book, Algebra Finance, iZUMi Finance, Orca Whirlpool (Solana), Cykura (Solana)
**Promotion path:** at 3 protocols re-surfacing → codify as Pattern I or Pattern J in `audit-methodology-v2.md` + add to active L3.5 invariant catalog

### INV-PAIRED-ROUND-1 (CANDIDATE) — Raydium cp-swap 2025

**Statement:**

> For any symmetric token-pair mint / burn / swap routine, the ceiling/floor rounding decision on side A MUST be consistent with the decision on side B. Either both ceil, both floor, or both reject the operation. Asymmetric rounding (one side ceils, the other side rounds to zero and skips) on a symmetric input is a violation of pool proportionality.

**Class:** arithmetic-rounding asymmetry (NEW family — no prior brain sibling; this entry anchors)
**Specialization of:** Priority #1 WEAKER-PROPERTY-THAN-DOWNSTREAM-ASSUMES
**Canonical worked example:** Raydium cp-swap `lp_tokens_to_trading_tokens()` per-side `&& token_X_amount > 0` short-circuit on ceiling — fixed via non-zero `require` guards on `amount_out_less_fee`, `token_0_amount`, `token_1_amount`, `lp_token_amount` per Immunefi 2025-05-21 review ($505K USDC bounty to @Lastc0de)
**Full intake artifact:** `incidents/2025-03-10-raydium-cpswap-505k-rounding.md`
**Cross-pollination candidates (post-CVP scan queue):** Solana cp-swap forks, Uniswap V2 family, SushiSwap, PancakeSwap V2, TraderJoe V1, Curve stable-pool variants with per-side rounding short-circuit
**Promotion path:** more naturally a Defense Class than an Invariant — see CANDIDATE-E in `Patterns-Defense-Classes.md` candidate pool. Listed here too because the invariant statement holds independently of the detection mechanism.

### Cross-Pollination Watch refresh

Add to the existing watch list (Lido / Rocket Pool / Frax / EigenLayer / Etherfi / Renzo / Stader / Ankr) the following CLMM + V2 AMM targets:

- CLMM family (for INV-CLMM-TICK-1): Uniswap V3, Trader Joe LB, Algebra, iZUMi, Orca, Cykura
- V2/cp-swap family (for INV-PAIRED-ROUND-1): Uniswap V2 family + Solana cp-swap fork ecosystem

3-protocol threshold per family same as the LST family.

---

_Invariants ledger | v1.1 | 2026-05-15 (CANDIDATE INVs added from KyberSwap + Raydium retrospective intakes)_
