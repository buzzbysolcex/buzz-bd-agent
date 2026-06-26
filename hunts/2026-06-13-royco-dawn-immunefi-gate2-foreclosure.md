# Royco V2 "Royco Dawn" — Immunefi Gate-1/Gate-2 FORECLOSURE (NEGATE)

- **Date:** 2026-06-13 (Opus 4.8, ultracode; P4 hunt-loop tick 3 — the genuine recency×EV×capability winner)
- **Target:** Royco Dawn (Royco V2) — `github.com/roycoprotocol/royco-dawn` (+ `royco-vault-makina-strategy`)
- **Program:** Immunefi `immunefi.com/bug-bounty/royco` — Critical **$250K**, KYC (allowed), **Primacy of Impact**. In-scope: srRoyUSDC (Senior tranche), Factory (ETH/AVAX/ARB), Vault Makina Strategy. Live **2026-02-17**, scope updated 2026-04-08.
- **Selection:** corrected recency-first scorer #1 (rec 9.4) after the Doctrine #70 recency fix. **Substrate-identity (Step 3a) caught a wrong-repo trap** — in-scope = fresh `royco-dawn` V2 (commit 2026-06, "bugfix/accountant-attribution"), NOT the mature 2025 `royco` V1 (cloned-then-purged).
- **Verdict:** **NEGATE** — honest Doctrine #45 audit-saturated foreclosure, [EXECUTED]-backed. 0 survivors across 2 rounds (9 finders + completeness-critic + focused Gate-2 trace).

## GATE-0 (strong PASS)
live ✓ · dedup clean (no prior hunt) ✓ · realizable $250K cap, fresh 2026 ✓ · egress N/A · capability FULL (EVM tranched-vault). Doctrine #65 recency-that-pays (fresh V2).

## Architecture
Tranched senior/junior structured-vault protocol (8,609 LOC, Solidity 0.8.34, prague, via_ir). SeniorTranche/JuniorTranche + RoycoAccountant (NAV/loss-attribution) + share-price Kernels (ERC4626/Chainlink/admin/Makina/Maple/Idle/reUSD/sUSDai/apyUSD) + YDM yield-split + RoycoEntryPoint (async deposit/redeem) + Factory + Makina strategy + Pendle SY wrapper.

## Audit density (Doctrine #45)
**5 audits** in-repo: Certora (FORMAL VERIFICATION), Hexens ×3, Cantina + WatchPug (Pendle-SY). **51 known issues** corpus-extracted. Core tranche/accountant NAV math formal-verified → net-new there ≈ 0.

## Round 1 (corpus + 5 finders + critic)
0 raw candidates. Genuinely closed [INSPECTED]: CANDIDATE-I structurally immune (RoycoKernel uses TRACKED `stOwnedYieldBearingAssets`, never `balanceOf`; quoters read external `convertToAssets` = external-bug OOS); accountant NAV_CONSERVATION Certora-verified; Makina strategy `onlyRoycoVault`-gated. **Completeness critic caught a potential OVER-DISMISSAL:** the EntryPoint async deposit/redeem LP selectors are **PUBLIC_ROLE / permissionless** (DeployEntryPoint.s.sol:40,158,295-307; ST/JT_LP_ROLE held by the EntryPoint itself) — the real permissionless front door, likely outside Certora's core-math scope → required a focused Gate-2.

## Round 2 (focused Gate-2 deep-trace — the critic-flagged seam)
4 arithmetic-at-action-site traces + adversarial verify. **All NEGATE:**
- **Executor bonus (deposit RoycoEntryPoint.sol:388-405 + redemption :461-491):** `executorBonusWAD` is USER-set at request, opt-in (`type(uint64).max` disables 3rd-party execution), Floor-rounded DOWN (favors user), deducted ONLY from the requester's OWN funds, routed only to the stored receiver. = accepted **ROYCO4-9** class, not net-new, not beyond-intended-permission. [INSPECTED]
- **Partial-redemption nav-rescale + yield-forfeiture (:437-449, :534-551):** **[EXECUTED]** — wrote+ran `test/poc/PartialRedeemForfeitDirectionPoC.t.sol`, **4/4 PASS**. Proven: partial-split (1/10/1000 slices) CANNOT inflate total forfeiture above one-shot (Floor only reduces it); forfeiture arises ONLY from genuine accrued yield (navExec>navReq); user redeemed-value stays **≥ locked principal** in every split; loss case = 0 forfeiture (user keeps all shares); MAX_NAV disables forfeiture. Forfeited quantity is **YIELD** (→ protocol fee-shares / burns to pool) = **OOS per ROYCO4-13**.
- **First-deposit boundary (RoycoVaultTranche._convertToShares:362-371):** **[EXECUTED]** `FirstDepositBoundaryPoC.t.sol` 4/4 PASS — tracked-credit (not balanceOf) → donation-inflation inert; dilution branch transfers ownership from unbacked holders to the new depositor recovering OWN principal. CANDIDATE-I structurally immune.
- **Request keying / cross-user (:93,103,202,215):** requests keyed by `msg.sender`, assets pulled FROM `msg.sender`, cancel/execute operate on own request → no cross-user theft/redirect.
- **5 untraced integration kernels + 2 factories + Makina:** in-Royco scaling correct / external-trust OOS / `restricted` sync.

## FLAG rubric
in-scope ✓ · not-known ✗ (executor-bonus=ROYCO4-9, yield-forfeit=ROYCO4-13) · **permissionless ✓** (seam IS public) · **direct-PRINCIPAL-loss ✗** ([EXECUTED] PoC proves conservation; forfeit is YIELD=OOS) · [EXECUTED] ✓ (negative result) · PoC-moves-funds ✗ → **NO FLAG. NEGATE.**

## Caveat (honest)
The 5 audit PDFs are image-based (no pdftotext on the box) → dedup leaned on the workflow-supplied 51-known-issue list, but the traced mechanisms map cleanly onto ROYCO4-9 / ROYCO4-13.

## Lens banked → Doctrine #71. Clones purgeable (royco-dawn 71M + makina).
