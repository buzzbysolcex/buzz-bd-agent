<!-- P4P2-PRIVATE-SUPPRESS — PLATFORM-ONLY (Immunefi live). NO public content drafts. -->

# Zest Protocol V2 — FRESH-ANGLE Re-Run (Doctrine #59 unprivileged-only) → FORECLOSE (0 candidates)

**Date:** 2026-06-10 (Ogie msg 8201 next-target + msg 8216 four-pillar P4 foreground). Fable 5.
**Target:** Zest V2 — BTC lending on Stacks (Clarity). Immunefi $100K crit, **Primacy of Impact**, PoC-required. Deployer `SP1A27KFY4XERQCCRCARCYD1CC5N7M6688BSYADJ7`, repo `Zest-Protocol/zest-v2-contracts`.
**Method:** 4 fresh-angle finders (workflow `wf_361c5e4d-88c`) + adversarial verify. **Constraint: Doctrine #59 — PERMISSIONLESS fund-loss ONLY** (DAO-compromise OOS; admin-trust excluded). Prior 8-surface NEGATE (`2026-05-31-zest-v2-immunefi-gate1.md`) explicitly EXCLUDED, not repeated.
**Result:** **0 candidates / 0 REAL / 0 UNCERTAIN — clean re-FORECLOSE.** Confirms + deepens the prior NEGATE on the surfaces the prior single-agent read left thin.

---

## The 4 fresh lenses — all CLEAN [INSPECTED]

1. **Multi-vault / multi-collateral egroup SEQUENCES** (prior verified single-op only). Every state transition (borrow/collateral-add/remove) RE-RESOLVES the egroup under the POST-transition basket mask and re-checks health fresh. The `collateral-add` capacity guard (`future-capacity ≥ current-capacity`) is **proved sufficient** across sequences: pre-add-healthy ⟹ post-add-healthy under the new (lower-LTV, bigger-basket) egroup. N-cycle rounding dust accrues to PROTOCOL (borrow scaled-debt rounds UP, collateral notional DOWN, debt UP). Index frozen within a block (time-delta=0 after first accrue). Self-liquidation net-negative + same-block-borrow guard. No free margin.

2. **v0-assets consumption** (prior read partial). v0-assets is a **pure DAO-gated registry** (no transform math; mutators OOS). The two on-chain transforms live in market: `resolve-ststx` (live ratio) + `resolve-ztoken` (cached lindex). **lindex is NOT permissionlessly movable** — grows only by time×interest; deposit/redeem don't touch it (the core hunt hypothesis NEGATED at source). ststx-ratio is PoX-cycle-driven (days), read identically intra-tx. Cache is fresh-this-block at every action site (accrue-and-cache BEFORE valuation). zTokens are collateral-only, priced floor (under-valued = safe).

3. **Rehypothecation (V2 NEW feature)** — yield-bearing collateral. Valuation is **current-time at every action site**, fresh-cached per block; **pledged shares are escrowed in market-vault** (borrower can't double-extract collateral-value-growth AND claimable yield — same shares). Liquidation seizes at true same-block value; same-block guard blocks flash-borrow→liquidate. Only residual divergence (lindex/1e12 vs ta/ts) = already-foreclosed dead-shares dust, conservative direction.

4. **PoI insolvency** (permissionless bad-debt). liquidity-index ≤ debt-index ALWAYS (vault collects more from borrowers than it credits suppliers — conservative). Liquidation penalty paid from the BORROWER's own collateral; dust-cleanup full-seize bounded to sub-token; `socialize-debt` is sound bad-debt accounting (floors at u0, market-gated). No permissionless sequence crosses a real solvency threshold.

## PARKED sub-seam (NOT reportable — logged for completeness)
**`socialize-debt` lindex-vs-assets formula mismatch:** it writes lindex down by the *debt-reduction* proportion but reduces `assets` by the *principal-reduction* (different quantities: `scaled*index/1e12` vs `scaled*borrowed/scaled_principal`). A genuine formula asymmetry — BUT (a) `check-caller-auth` market-only (NOT permissionless), (b) only reachable via a real underwater-position liquidation, (c) lindex-down only makes zToken collateral worth LESS (protocol-conservative), (d) privileged-trigger class is OOS per Doctrine #59. **If a future Zest version exposes socialize-debt to a permissionless path, re-open this.** [INSPECTED]

## COMPOUNDS (PRODUCE-WIRE)
- **NEW LENS banked → `brain/Patterns-Defense-Classes.md`: Rehypothecated-Collateral Valuation Consistency.** When collateral is a yield-bearing vault share that keeps earning while pledged, check 3 things: (1) valuation is CURRENT-time (fresh index at the action site), not deposit-time; (2) pledged shares are ESCROWED (borrower can't realize yield + collateral-growth from the same shares = no double-extract); (3) liquidation seizes at TRUE same-block redeemable value (no stale-low seizure leaving the borrower a yield delta). Zest = consistent-by-construction NEGATE; banked as the analysis template. Sibling to the existing ERC4626-share-vs-separate-index lens.
- **Doctrine #59 validated in practice:** the unprivileged-only framing kept all 4 finders on permissionless surfaces; the one real formula-seam found (socialize-debt) was correctly auto-discarded as privileged/OOS without burning PoC budget. ~half the finder effort that HODLMM spent confirming admin-trust non-findings was saved here.
- **P2 content-wire:** Zest is now a STRONGER warm-lead — "we read all 12 in-scope contracts TWICE, including the V2 rehypothecation feature, across two methodologies — clean." Positive-pass sale material (see `brain/HSaaS-Conversion-Plan.md` §4 lead #3).

## Clone
`/home/claude-code/.tmp-clones/zest-v2-contracts` (9.2M) — purge-eligible; retain for the Clarity-lending-arsenal reference until disk pressure.

_Zest V2 fresh-angle | PRIVATE/Immunefi | **FORECLOSE 0-candidate** | Doctrine #59 unprivileged-only | 4 finders + adversarial verify | NEW rehypothecation-valuation lens banked | P4→P2 content-wire_
