<!-- P4P2-PRIVATE-SUPPRESS — PLATFORM-ONLY DISCLOSURE (Immunefi live program). NO public content drafts. -->

# Symbiotic (restaking core) — Gate 1 (PRIVATE: Immunefi) — STEP-4 FORECLOSE-RECOMMEND → OVERRIDE-HUNT NEGATE [INSPECTED] (cross-module slash-window seam sound)

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

---

## OVERRIDE HUNT (Ogie msg 8031, APPROVED narrow + time-boxed) — VetoSlasher ↔ Delegator ↔ Vault epoch/veto seam = NEGATE [INSPECTED]

Source-read the 3-contract epoch/window interaction ONLY (the class Certora per-contract specs miss). All [INSPECTED] from direct source trace (no WebFetch — direction-error rule honored).

**Mechanics traced:**
- `VetoSlasher.__initialize` L277: **`vetoDuration < epochDuration`** (enforced).
- `VetoSlasher.requestSlash` L92-96: `captureTimestamp ∈ [now + vetoDuration − epochDuration, now)`; `vetoDeadline = now + vetoDuration`.
- `VetoSlasher.executeSlash` L153: **`now − captureTimestamp ≤ epochDuration`** (else `SlashPeriodEnded`) → execute lands in epoch `{c, c+1}`. Slash amount via `_slashableStake(.., captureTimestamp)` (offense-time).
- `BaseSlasher._slashableStake` L114-130: window `[now−epochDuration, now)`; **monotonic `latestSlashedCaptureTimestamp` double-slash guard** (L116/L142); `stakeAt(capture) − min(cumulativeSlash_now − cumulativeSlashAt(capture), stake)` (overlap guard).
- `BaseDelegator.stakeAt` L102: immutable historical checkpoint + opt-in-at-capture gate. `onSlash` L176-199: gas-capped hook, **return swallowed (`pop(call)` L194)** → hook can't veto a slash.
- `Vault._withdraw` L377: booked to `withdrawals[currentEpoch+1]`. `_claim` L391: claimable only when `epoch < currentEpoch` → **2-epoch delay** (withdraw epoch E → claimable epoch E+2).
- `Vault.onSlash` L223: `captureEpoch ∈ {currentEpoch−1, currentEpoch}`; slashes `activeStake + withdrawals[curr+1]` (capture==curr) or `+ withdrawals[curr] + withdrawals[curr+1]` (capture==curr−1).

**The 3 hypotheses (all NEGATE):**
1. **Veto-window vs epoch-boundary race / stale delegation** → slash binds to `stakeAt(captureTimestamp)` (immutable history + opt-in-at-capture); post-offense re-delegation doesn't reduce it. `vetoDeadline = T_r + vetoDuration ≤ captureTimestamp + epochDuration` (from requestSlash lower bound) → veto ALWAYS ends within the executable window; no legitimate slash gets time-boxed out by the veto. NEGATE.
2. **Withdraw/re-delegate escapes between request and execute** → 2-epoch claim delay > 1-epoch slash window. Withdrawn funds sit in `withdrawals[c+1]` (claimable only epoch c+2), but execute closes at epoch ≤ c+1. `onSlash` reduces exactly the buckets a mid-window withdrawal lands in (`activeStake → withdrawals[c+1]`, both slashed). Nothing the slash needs is claimable in-window. NEGATE.
3. **Cross-module epoch-view disagreement** → VetoSlasher slash-period, BaseSlasher `_slashableStake` window, Vault `onSlash` capture-epoch set are mutually consistent (same ~1-epoch capture-anchored window). Razor-thin boundary case (capture at epoch start, request near epoch end, vetoDeadline ≈ rollover) still lands execute at exactly captureEpoch+1, inside `onSlash`'s `{currentEpoch−1, currentEpoch}`. NEGATE.

**Load-bearing invariant:** `claim_delay (2 epochs) > slash_window (1 epoch)` + onSlash covers in-flight withdrawal buckets + offense-time stake binding. Holds by construction.

**Time-box honored:** no concrete cross-module discrepancy surfaced in the 3-contract seam → NEGATE, no expansion into audited single-contract surface, NO Foundry PoC (Ogie: PoC only if a discrepancy survives; foreclose cheap on NEGATE). A confirmatory Foundry test (withdraw-mid-window still slashed) is trivially writable but UNNEEDED per directive.

**Compound:** CANDIDATE-J / restaking-slashing **NEGATING-EXAMPLE — "Slash-Window ⊂ Claim-Delay" invariant** (see `brain/Patterns-Defense-Classes.md`). Reusable lens for EigenLayer / Karak / Aave Umbrella (queue row 4, stkToken slashing+cooldown — check the SAME invariant there).

**Clone purge-eligible** (NEGATE complete; disk 67%, keep until next disk pressure).

---

_Gate 1: 2026-05-29-symbiotic | PRIVATE/Immunefi | **STEP-4 FORECLOSE-RECOMMEND (6-audit + ~7mo stale) → OVERRIDE-HUNT NEGATE [INSPECTED] (VetoSlasher↔Delegator↔Vault slash-window⊂claim-delay invariant sound; 3 hypotheses NEGATE)** | NO PoC (no discrepancy, time-box cheap-foreclose) | compound: CANDIDATE-J restaking-slashing NEGATING-EXAMPLE | NEXT = Usual/Falcon audit-light-fresh | single-agent | P4P2 suppressed_
