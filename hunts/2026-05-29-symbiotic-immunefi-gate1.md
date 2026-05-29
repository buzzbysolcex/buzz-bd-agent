<!-- P4P2-PRIVATE-SUPPRESS — PLATFORM-ONLY DISCLOSURE (Immunefi live program). NO public content drafts. -->

# Symbiotic (restaking core) — Gate 1 (PRIVATE: Immunefi) — STEP-4 FORECLOSE-RECOMMEND (audit-saturated + stale)

**Date:** 2026-05-29 (refreshed-queue #2, post-Babylon)
**Target:** `symbioticfi/core` (shared-security / restaking marketplace, EVM Solidity). Immunefi **$500K crit** [VER prior-session] / **High up to 100% of funds-affected** + $50-100K hard-cap on yield/royalties theft, rewards USDT-on-ETH, KYC [EST]. Blobless clone `gate2-clones/symbiotic` (HEAD `7cb0663`, KEPT — disk 67%, no purge pressure).
**Substrate:** EVM Solidity 0.8.25 — Go arsenal (#129/#137/#138/#166) N/A. Lens = CANDIDATE-J (cooldown/epoch state-machine) + CANDIDATE-D + DC-9 + Doctrine #34 composition.

---

## STEP 1 PROFILE
- Platform: Immunefi (ACTIVE — listed on current 2026 bounty index). PoC likely mandatory; primacy-of-impact.
- Caps: Critical $500K [VER prior-session]; High up to 100% funds-affected, $50-100K hard-cap on unclaimed-yield/royalty theft.
- OOS: leaked secrets/keys in GitHub without production-use proof.
- Scope assets: full asset list NOT WebFetch-able (scope subpage 404/bot-gated) — verify at any dispatch.

## STEP 2 BRAIN OVERLAP — MEDIUM (downgraded from queue's implied HIGH by audit data)
- Lens hits: CANDIDATE-J (VetoSlasher veto-window / epoch cooldown state-machine), CANDIDATE-D (state machine), DC-9 (admin/migration: `MigratableEntity` upgrade paths), Pattern-I/ERC4626Math share accounting (`libraries/ERC4626Math.sol`, `VaultTokenized`).
- BUT scope-fit narrowed by audit saturation (see Step 4).

## STEP 3/4 — EV RE-COMPUTE on real repo state → FORECLOSE-RECOMMEND
**Disqualifying facts found at inventory (Phase-0 audit-dedup):**
1. **6 audit firms** aggregated in `./audits`: Cantina, **Certora (formal verification)**, ChainSecurity, OtterSec, Statemind, Zellic — on only **6,574 LOC** of `src/`. Audit-density is saturation-class.
2. **HEAD = 2025-10-30 (~7mo stale)**; last merge a CONTRIBUTING fix. NOT "modules iterating / fresh" as the queue premise assumed.
3. Uniform pragma 0.8.25, no post-audit version split → no obvious net-new-since-audit sliver (Doctrine #34 sub-b composition multiplier does NOT clearly apply to core).

**Fails the queue's own Doctrine-#42-refined dispatch criterion (`≤2 audits AND deploy/upgrade ≤1-3mo`) on BOTH axes.** Same predictable-foreclose class as Lido V3 (`fresh ≠ unaudited`) and Resolv (14-audit, already DROPPED from queue).

**Honest realizable-EV:** p≈0.02-0.03 (6 audits incl. formal-verif, mature, stale) × W $500K × P(acc)≈0.45 − high-L (full slasher/delegator/vault source-read to even attempt out-finding 6 firms) ≈ **~$5K nominal / negative net-EV** vs the ~$21K queue estimate. **Doctrine #27 F MAXIMUM applies.**

## DECISION (Step-4, 7th-override-category surface — $500K+ MEDIUM-overlap, new data contradicts queue premise)
**Default (doctrine-correct): FORECLOSE core, pivot to audit-LIGHT-fresh next target (Usual / Falcon — verify audit-count at dispatch).**

**One legitimate pro-hunt counter-angle (operator override option):** Certora formal-verification proves SPECIFIED invariants only — it does NOT cover unspecified **cross-module economic / composition** properties. A `VetoSlasher ↔ BaseDelegator ↔ Vault` epoch/veto-window cross-module economic edge (CANDIDATE-J + Doctrine #34) is the one class that can survive a 6-firm audit cohort. IF operator wants a deliberate research-first hunt, scope it to that cross-module slasher-economics sliver ONLY (not a full core re-read). Otherwise foreclose.

**Other Symbiotic surface (watchlist, not core):** `symbioticfi/relay` / middleware-sdk (newer middleware layer) may be fresher than core — verify scope-inclusion + audit-count if Symbiotic is revived.

---

_Gate 1: 2026-05-29-symbiotic | PRIVATE/Immunefi | **STEP-4 FORECLOSE-RECOMMEND (6-audit incl. Certora formal-verif + ~7mo stale = #27 F MAXIMUM / #42-refined)** | clone KEPT pending operator call on cross-module angle | NO source-read sunk (Phase-0 dedup pre-empted) | single-agent | P4P2 suppressed_
