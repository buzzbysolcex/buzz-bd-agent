# Lane 5 — FRESH-WEIGHTED Hunt Queue (surface-freshness, not cap)

**Authority:** Ogie msg 8011 (2026-05-29). REPLACES walking down the cap-sorted blue-chip watchlist (Watchlist-Candidate-Crossmap.md priority column).
**Sort key:** p(finding) ≈ audit-recency / surface-age — NOT W (cap). Cap is a FLOOR. See Doctrine #42 ("Hunt Freshness Not Cap").
**Method:** WebFetch / API only, zero-to-low disk. Per-row EV = p × W − (1−p) × L.
**MANDATORY at dispatch:** re-run Step-1 PROFILE (INFO #19 9-axis) per target — caps/KYC/scope-freshness/clauses below are best-current-estimate; verify before committing. Rows tagged [VERIFIED] checked this session; [EST] = verify at Gate-1.

---

## PARKED (cap-sorted blue-chips that predictably foreclose — Doctrine #27 F MAXIMUM)
- **Lido core / Renzo / Beefy / cap / Veda / Aave-v3 / Sky / Spark / Frax / Compound / Stargate / Gnosis** — all hunted/foreclosed/parked this cycle. Max-cap = max-audit = low-p. Do NOT re-walk.
- **Beefy** (2026-05-29): EV ≈ $2.4K − high-L. $75K-flat cap but realistic finding = $2-15K single-strategy; 5y-mature core; 244-asset sprawl (high L); oracle-testing clause. PARK.

---

## FRESH QUEUE (rank by surface-freshness)

| # | Target | Chain | Cap / KYC | Surface age (deploy/upgrade) | Why fresh | EV (p×W−L) | Scope clauses | Conf |
|---|--------|-------|-----------|------------------------------|-----------|------------|---------------|------|
| **1** | **Lido V3 stVaults — non-oracle modules** (PredepositGuarantee, OperatorGrid, ValidatorConsolidationRequests, Dashboard/Delegation) | Ethereum | $2M / **no-KYC** | **v3.0.2 Apr-2026 (~1mo)**; scope updated 2026-03-26 | Net-new V3 architecture; I source-read only LazyOracle→VaultHub (foreclosed). PredepositGuarantee (novel pre-deposit-guarantee) + OperatorGrid (per-operator share-limit tiers, DC-9/Pattern-A) + ValidatorConsolidation (EIP-7251) are FRESH + un-source-read. | p≈0.10 × W≈$300K blended × no-KYC − low-L, ×#27 ~0.5 (V3 less-saturated than core) ≈ **~$15K** | oracle-testing-OOS (R-1: non-oracle modules unaffected) | **[VERIFIED]** |
| **2** | **Morpho Vaults V2** (curator-managed vault standard) | Ethereum | ~$2.5M / KYC? | 2025-26 new standard | Distinct from V1/MetaMorpho (DISC-018 hit V1/V2 factory); Vaults V2 curator/allocator roles = fresh Pattern-A + share-accounting surface. | p≈0.08 × W≈$300K − L ≈ **~$20K** [EST] | verify | [EST] |
| **3** | **Symbiotic** (restaking: vault / delegator / slasher / networkRegistry) | Ethereum | ~$1M / ? | mainnet 2024-25, modules iterating | Novel restaking primitive (≠ EigenLayer); slasher + burner + epoch accounting = fresh state-machine (CANDIDATE-J/D + DC-9). Note: BuzzShield regression-tested on Symbiotic 2026-05-09 — confirm not already Gate-1'd. | p≈0.08 × W≈$200K − L ≈ **~$14K** [EST] | verify | [EST] |
| **4** | **Aave Umbrella** (new staking/slashing safety module) | Ethereum | ~$1M / ? | ~2025-26 (replaced Safety Module) | Net-new module on mature Aave (Doctrine #34 sub-b composition); stkToken slashing + cooldown = CANDIDATE-J + DC-9. | p≈0.06 × W≈$400K − L ≈ **~$18K** [EST] | verify | [EST] |
| **5** | **Solana restaking/LST fresh** (Jito restaking / Sanctum / Kamino recent modules) | Solana | varies / ? | 2024-25 fresh | DC-8 Anchor-signer detector + CANDIDATE-G (off-chain cosigner) apply; less EVM-lens-saturated. | p≈0.08 × W≈$250K − L ≈ **~$15K** [EST] | verify bounty exists | [EST] |
| **6** | **Ethena recent modules** (USDtb / minting-converter, not the hunted cooldown) | Ethereum | ~$1M / ? | 2025-26 fresh modules | Cooldown hunted (#79589); USDtb + converter are fresh un-hunted surface. | p≈0.06 × W≈$300K − L ≈ **~$12K** [EST] | verify | [EST] |
| **7** | **Resolv / Falcon / Usual** (recent yield-stablecoins) | Ethereum | $100-500K / ? | 2025 launches | Genuinely fresh + less-audited (higher p), lower cap. Floor-clearing only. | p≈0.10 × W≈$120K − L ≈ **~$10K** [EST] | verify cap floor | [EST] |
| **8** | **EtherFi recent** (Liquid vaults / Cash) | Ethereum | ~$500K-$1M / ? | 2025 modules | Fresh modules on a maturing LRT; Liquid vault accounting + Cash card flows. | p≈0.06 × W≈$300K − L ≈ **~$11K** [EST] | verify | [EST] |

---

## NEXT ACTION (updated post-#1-hunt, 2026-05-29)

**#1 Lido V3 non-oracle = FORECLOSED** (`hunts/2026-05-29-lido-v3-nonoracle-gate1.md`): OperatorGrid DC-7-compliant + uint96-truncation NEGATED-on-direction-trace (4th direction-error); PredepositGuarantee 6/6 paths guarded. **Lesson: fresh ≠ unaudited** — Lido V3 is fresh (~1mo) but had a heavy pre-launch audit cohort → predictable foreclose.

**RE-RANK (Doctrine #42 refinement): weight fresh-AND-audit-LIGHT, not just fresh.** Demote audit-heavy-fresh (Lido V3 ✗, Aave Umbrella — big pre-launch audits); promote audit-LIGHT-fresh:
- **New top candidates (verify audit-COUNT + bounty + cap at dispatch):** row 7 **Resolv / Falcon / Usual** (fresh 2025 yield-stablecoins, likely 0-2 audits = high p, lower cap) · row 5 **fresh Solana** (Jito/Sanctum/Kamino recent modules — DC-8 Anchor fit, new modules often audit-light) · row 3 **Symbiotic** (fresh restaking, slasher/burner modules iterating).
- **Dispatch criterion (refined):** ≤2 audits AND deploy/upgrade ≤1-3mo AND scope-fresh AND cap-floor AND low-friction. A fresh-but-20-audit module is NOT a hunt target.

All rows: verify scope-freshness / cap / KYC / clauses / **audit-count** at Gate-1 Step-1 (INFO #19 + Doctrine #42 refinement).

---

_Lane5-Fresh-Queue | v1.0 | 2026-05-29 (Ogie msg 8011 — fresh-weighted re-sort; replaces cap-sorted blue-chip walk). Companion: Doctrine #42 (Hunt Freshness Not Cap). Verify [EST] rows at dispatch._
