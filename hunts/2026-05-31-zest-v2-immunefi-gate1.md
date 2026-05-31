<!-- P4P2-PRIVATE-SUPPRESS — PLATFORM-ONLY DISCLOSURE (Immunefi live program). NO public content drafts. -->

# Zest Protocol V2 (Stacks/Clarity Bitcoin lending) — Gate 1 (PRIVATE: Immunefi) — NEGATE [INSPECTED] + THIRD CLARITY ANCHOR

**Date:** 2026-05-31 (autonomous EV-ordered loop; fresh-scout pick after Stacks-sBTC FORECLOSE on audit-saturation; arsenal-reuse of the Granite lending lens stack).
**Target:** Zest Protocol **V2** — Bitcoin multi-vault lending on **Stacks (Clarity)**. Immunefi **$100K crit, PoC-required**, live **2026-01-15** (~4.5mo), mid-audit (Clarity Alliance + top-15 Immunefi white-hats). V1 program → 404 (superseded; V2 is the live target). Deployer `SP1A27KFY4XERQCCRCARCYD1CC5N7M6688BSYADJ7`. Source via Hiro → `gate2-clones/zest-v2/*.clar` (~10K LOC in-scope core read).
**Substrate:** **CLARITY** — 3rd Clarity hunt (after Hermetica + Granite). Aave-style multi-vault ERC4626 lender — richest Clarity surface yet.

---

## STEP 1 PROFILE
- Platform Immunefi ACTIVE (V2 live 2026-01-15, updated 2026-04-27); $100K crit (range $20K–$100K + $5K flat other-crit); PoC-required; payout USDC/T on ETH. **Passes freshness gate** (≤2 audits, ~4.5mo) — contrast Stacks-sBTC (6 audit events / 2 Attackathons → FORECLOSED same session).
- Architecture: 6 near-identical per-asset ERC4626 vaults (`v0-vault-{usdh,usdc,stx,sbtc,ststx,ststxbtc}`, ~1045 LOC each, differ only in UNDERLYING/name/error-prefix) + `v0-4-market` (the live `impl` orchestrator: health/oracle/liquidation/borrow, 1662 LOC) + `v0-market-vault` (obligation storage, impl-auth) + `v0-egroup` (collateral-basket→LTV config + superset invariant) + `v0-assets` (oracle callcode config) + `v0-rates` + dao. (impl resolved on-chain via `market-vault.get-impl` → `v0-4-market`.)

## STEP 2 OVERLAP — Clarity + lending arsenal (Granite reuse)
DC-3-Clarity (auth), CANDIDATE-I-Clarity (ERC4626 share inflation + tracked-var sub-check), liquidation-3-guard checklist (Granite seed), oracle-gating (Pyth+DIA staleness/confidence), CANDIDATE-E rounding direction, #166 dedup (oracle monotonic-timestamp), flash-loan amplification.

## STEP 5 — full in-scope source-read

**Contracts read [INSPECTED]:** `v0-vault-usdh` (canonical of the 6) · `v0-market-vault` · `v0-egroup` · `v0-4-market` (orchestrator) · `v0-assets` (partial) · `v0-rates` · `v0-data`.

**Findings — all NEGATE or OOS:**

1. **CANDIDATE-I (ERC4626 share inflation / first-depositor) — NEGATE, STRUCTURAL.** Vault `total-assets` = tracked `assets` var + accrued interest (NOT raw `ft-get-balance`) → donation can't inflate share price (tracked-var-vs-raw-balance lens; same structural foreclosure as Granite). `initialize()` locks `MINIMUM-LIQUIDITY=1000` dead shares to NULL-ADDRESS (Uniswap-style first-depositor guard). `convert-to-shares`/`convert-to-assets` both `mul-div-down` (vault-favorable both directions). NEGATE.

2. **zToken-collateral-pricing vs ERC4626-share-value consistency — NEGATE, traced rigorously (the one real seam).** Market prices zToken collateral as `resolve-ztoken = underlying-price × cached-lindex / 1e12` (Aave-aToken-style), while the vault redeems shares at `total-assets/total-supply` (ERC4626). If lindex OVER-stated share value → over-borrow → bad debt. **Trace:** share-price growth factor `= 1 + (D−R)/ta` (D=debt-delta, R=reserve portion); liquidity-index growth `= borrow-rate·util·(1−rf)·dt`; and `util = debt/ta` EXACTLY (`available = assets−borrowed`, `ta = assets + debt − borrowed` ⇒ `debt+available = ta`), so to first order `(D−R)/ta = borrow-rate·(debt/ta)·(1−rf)·dt =` lindex growth. Treasury-LP minting reproduces the net-of-reserve index. Rounding: debt index `calc-multiplier-delta round-up` (debt over-stated) + liquidity index `round-down` (lindex under-states share value) → BOTH conservative → zToken collateral slightly UNDER-valued → no over-borrow. NEGATE [INSPECTED]. **NEW reusable lens banked (see compounds).**

3. **Liquidation (`v0-4-market` graduated) — BOUNDED.** (a) `current-ltv ≥ ltv-liq-partial` health-gate (can't liquidate healthy); (b) graduated `calc-liq-factor` capped at BPS + `max-debt-usd` cap + penalty scaled min↔max + coll capped at user balance (can't over-seize); (c) **same-block-borrow guard** `(not (is-eq last-borrow-block stacks-block-height))` blocks flash-borrow→liquidate; (d) rounding: `debt-to-repay` `mul-div-up` (liquidator pays more) + `coll` `mul-div-down` (seizes less) = conservative. Dust-cleanup branch (`remaining-debt-to-repay==0 → seize full balance`) bounded to <1 debt-token-worth = negligible/intentional. NEGATE on over-seize / heal­thy-liquidation.

4. **Oracle (`v0-4-market` + `v0-assets`) — Pyth+DIA, gated; residuals OOS.** Confidence (`conf ≤ price·max-confidence-ratio/BPS`, 10% default) + staleness (`delta ≤ max-staleness`) + **monotonic-timestamp** (`ts ≥ prev` recorded; updates last-update if newer — #166-adjacent anti-replay) + `oracle-price-legal (> p 0)` (price=0 rejected, cleaner than Granite's price==0 short-circuit) + negative price → `to-uint` abort. `write-feeds` takes attacker VAA but `verify-and-update-price-feeds` validates Wormhole sig. Callcode transforms (ststx-ratio, ztoken-lindex) sound. Oracle/feed manipulation = OOS. NEGATE.

5. **Access control (DC-3-Clarity) — SOUND.** `check-dao-auth` (tx-sender == .dao-executor) for config; `check-impl-auth` (contract-caller == impl) on market-vault storage mutators; `check-caller-auth` (authorized-contracts allowlist) on vault system-borrow/repay/socialize. User entry points bind `account` to `contract-caller` + assert `contract-caller == tx-sender` on borrow/repay/collateral (anti-intermediary-contract). No tx-sender/contract-caller inversion. NEGATE.

6. **egroup superset-invariant — SOUND risk design.** `validate-superset-invariant`: a collateral-mask superset must have LTV-BORROW/LIQ-PARTIAL/LIQ-FULL ≤ its subsets (broader basket → lower-or-equal LTV). `serialize-and-validate-input` enforces `LTV-BORROW < LTV-LIQ-PARTIAL < LTV-LIQ-FULL < BPS` + penalty bounds. collateral-add's "future-capacity ≥ current-capacity" guard prevents adding-collateral-reduces-borrowing-power. NEGATE.

7. **Reentrancy — guarded; ONE defense-in-depth note.** `deposit` + `flashloan` assert `(not (var-get in-flashloan))`; flashloan sets/clears the guard around the callback + pulls back `amount+fee`. **`redeem` lacks the `in-flashloan` guard** — but non-exploitable: all accounting is tracked-var (assets/index/lindex), flashloan only perturbs RAW token balance which no priced path reads; reentrant redeem/borrow/liquidate during a flashloan see consistent state and the actual transfer is balance-checked. Defense-in-depth gap (operator-discretion, LOW): add the guard to redeem + assert flashloan-immunity if future code reads raw balance. NOT a bankable finding.

8. **Interest model (`v0-rates` + vault index math) — conservative.** Kinked-rate interpolation (packed u16 points); debt index round-up, liquidity index round-down (both protocol-favorable); treasury-LP reserve accrual via dilution. No attacker-controllable in-tx index manipulation (time-delta=0 same block). NEGATE.

**Residual OOS:** Pyth/DIA oracle manipulation; ststx-ratio oracle (block-info-nakamoto-ststx-ratio-v2) trust; DAO/dao-executor + impl governance trust.

**Net: no externally-exploitable, in-scope candidate. NEGATE [INSPECTED].** No Gate-2 PoC (no surviving candidate). Operator-discretion LOW defense-in-depth item: redeem flashloan-guard.

## Compounds — THIRD CLARITY ANCHOR + new lens
- **NEW LENS — ERC4626-share-vs-separate-index collateral-pricing consistency** (`brain/Patterns-Defense-Classes.md`): when a protocol prices a tokenized-vault share as COLLATERAL via a SEPARATE liquidity-index (Aave-aToken-style) while the vault REDEEMS via ERC4626 `total-assets/total-supply`, the two valuations must track. Check: does index-growth == share-price-growth? The exploitable direction is **index OVER-states share value → over-borrow → bad debt**. Verify via (a) the reserve/treasury-dilution formula (does treasury-LP minting reproduce the net index?), (b) rounding direction (index round-down = conservative/safe; round-up = danger), (c) `util` denominator == `total-assets` (Zest: exact). Zest = consistent-by-construction + conservative-rounding NEGATE; banked as the analysis template.
- **tracked-var-vs-raw-balance = now 2 Clarity anchors (Granite + Zest)** → both tracked → donation-inflation structurally foreclosed. Promote toward canonical Clarity detector.
- **Clarity arsenal = 3 anchors (Hermetica + Granite + Zest).** Lending sub-arsenal (Granite + Zest) = 2 anchors: liquidation-3-guard checklist + oracle-staleness/confidence/monotonic + tracked-var + kinked-rate-index-direction all reused successfully.

**Clone purge-eligible** (NEGATE; sources retained in `gate2-clones/zest-v2/` for the Clarity-lending-arsenal reference until disk pressure).

---

_Gate 1: 2026-05-31-zest-v2 | PRIVATE/Immunefi | **NEGATE [INSPECTED]** — ERC4626 inflation foreclosed (tracked-var + min-liquidity); zToken-collateral lindex-pricing consistent-with-share-value + conservative-rounding (traced); liquidation bounded (graduated + same-block-borrow guard + conservative rounding); oracle Pyth+DIA confidence/staleness/monotonic/price>0 gated; egroup superset-invariant sound; DC-3 auth correct | lone LOW defense-in-depth: redeem missing flashloan-guard (non-exploitable, tracked-var) | NO Gate-2 PoC | **THIRD CLARITY ANCHOR + new ERC4626-share-vs-index pricing-consistency lens** | autonomous EV-ordered loop | single-agent | P4→P2 suppressed_
