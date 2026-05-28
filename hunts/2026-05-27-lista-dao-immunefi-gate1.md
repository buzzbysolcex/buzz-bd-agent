# Gate 1 — Lista DAO (Immunefi, $1M no-KYC)

**Date**: 2026-05-27 (Day 27 late-night autonomous loop)
**Operator**: Ogie (BuzzBySolCex)
**Authority**: Standing-Intake Protocol + Self-Correction Filing Rules
**Target**: lista-dao Moolah lending substrate + adjacent peripherals
**Status**: Gate 1 surface map filed. **Recommended next-action: Gate 2 dispatch on CAND-3 (PT oracle staleness) and CAND-1 (MoolahVault custom-name post-audit drift).**

---

## STEP 0 — Prior-corpus lookup

- `hunts/`: **NO** prior Lista / Helio Gate 1. New target.
- `brain/Clara-Ground-Truth-Bulk-Intake.md` line 280: **Helio 2023-06-17 Plugin Donation Inflation $686K ANKR + $25K lisUSD, cand:I**. Documented historical exploit on Helio (Lista's pre-rebrand identity). CANDIDATE-I family — relevant lens, but exploit was on legacy plugin contracts now archived (`lista-dao-contracts` archived 2026-05-19).
- `brain/Ground-Truth-Exploits.md` line 661: Helio listed among ~28 CANDIDATE-I anchors (ERC4626 / share-inflation family).
- **Implication**: Lista has historical share-inflation exposure in legacy Helio plugins. The active substrate (Moolah, declared "Powered by Morpho - Based on Morpho Blue smart contracts") shares the ERC4626 architectural family but is structurally distinct.

## STEP 1 — PROFILE

| Field | Value |
|---|---|
| Platform | Immunefi |
| Status | ACTIVE (last update 2026-04-24) `[INSPECTED]` |
| Critical cap | $1,000,000 USD-equivalent |
| High cap | $10,000 |
| Medium cap | $5,000 |
| KYC | No (no-KYC confirmed) |
| Payment | USDT/USDC/lisUSD on Base chain (discretion-paid) |
| In-scope assets count | "134 Total Assets in Scope" (Immunefi-stated) |
| Confirmed in-scope (extracted) | 12 BSC addresses (lisUSD, INTERACTION, VAT, SPOT, JUG, CeVault, CerosRouter, HelioProvider, HayJoin, AuctionLib, CeToken, clisBNB) |
| Out-of-scope | Prior CertiK/PeckShield/Slowmist/Veridise findings; mainnet testing; phishing; DoS; 3rd-party oracle testing |

**Active GitHub orgs (key shift)**:
- `lista-dao/lista-dao-contracts` — **ARCHIVED 2026-05-19** (legacy MakerDAO/Helio CDP)
- `lista-dao/moolah` — **ACTIVE**, last push 2026-05-26 (Morpho Blue fork — new lending substrate)
- `lista-dao/lista-new-contracts` — **ACTIVE**, last push 2026-05-26 (peripherals: BeraChain adapter, RWA, lending rewards distributor)
- `lista-dao/synclub-contracts` — **ACTIVE-LIGHT**, last push 2025-12-10 (slisBNB LST stake manager)

## PHASE 0a — Audit-Dedup Pre-Check

**Verdict: SATURATION-HIT on `Moolah.sol` + `MoolahVault.sol` core. SCOPED post-audit drift surfaces (PT oracle, MoolahVault setName/setSymbol, LendingBroker emergencyWithdraw, PositionMigrator). LegacyCDP foreclosed (archived repo, no fresh code).**

`docs/audits/` (Moolah repo) contains 20 audit reports across **7 firms** spanning 2025-04 → 2026-04 `[INSPECTED]`:

| Firm | Reports | Date span |
|---|---|---|
| Bailsec | 9 (ListaLending, Provider, SlisBNBMinter, Smart-Collateral+Liquidators, Credit-Loan, Credit-Liquidation, Fixed-Term+Rate, Position-Migrator) | 2025-04 → 2026-03 |
| Blocksec | 3 (ListaLending, Provider, SlisBNBxMinter) | 2025-04 → 2025-11 |
| Cantina | 3 (Credit-Loan, Fixed-Term+Rate, Position-Migrator + PositionManager) | 2025-11 → 2026-04 |
| CertiK | 1 (Lista-Dao-PositionManager) | 2026-04 |
| OpenZeppelin | 1 (Smart-Collateral) | 2025-10 |
| Spearbit | 1 (Credit-Liquidation) | 2026-03 |

Core `Moolah.sol` (913 LOC) post-audit drift: **ZERO commits since 2026-03-18** `[EXECUTED — git log]`. Defensive posture confirmed.

`MoolahVault.sol` (851 LOC) post-audit drift: **1 commit** (2026-04-15 setName/setSymbol/setWhiteList merge) `[EXECUTED — git show 5b050c7]`. **DC-9 sub-3 candidate — privileged setter expansion post-audit**.

LendingBroker.sol (1170 LOC, broker/) — **NO firm-named audit in `docs/audits/`**. Audit hits target "Smart-Collateral-and-Liquidators" + "Credit-Loan" but the broker family is not explicitly named. Massive post-audit drift (Mar 18 → May 21) `[INSPECTED]`.

## STEP 2 — BRAIN OVERLAP — **HIGH** (revised)

Lens hits with R8 tags:

1. **Doctrine #29 v1.1 two-sided MIN-cap defense** `[ASSUMED]` — slisBNB LST rate-provider sits in `src/provider/SlisBNBProvider.sol` (482 LOC). Need source-read to confirm presence/absence of `min(oracle, pool)` on mint-side vs oracle-only on redeem-side. Out-of-band for Gate 1; Gate 2 candidate.
2. **DC-9 sub-3 upgradeable-hook-no-timelock + privileged-setter post-audit drift** `[INSPECTED]` — `MoolahVault.setName/setSymbol` added 2026-04-15 by `DEFAULT_ADMIN_ROLE`, no timelock visible in modifier chain. Vault token rebrand attack surface — if vault is whitelisted as collateral elsewhere by symbol-string matching, attacker-controlled admin could grief.
3. **DC-9 sub-1 unchecked-mint via emergencyWithdraw** `[EXECUTED — code-read line 1155]` — `LendingBroker.emergencyWithdraw(address token, uint256 amount) external onlyRole(MANAGER)` drains arbitrary token to `msg.sender`. NO timelock, NO event-rate-limit, NO max-amount cap. MANAGER role compromise = full broker drain. Added 2026-03-31, post audit cycle.
4. **DC-12 monotonic-oracle / staleness defense** `[EXECUTED — code-read]` — `src/oracle/PTLinearDiscountOracle.sol:56` and `PTLinearDiscountMarketOracle.sol:83` both destructure `latestRoundData()` as `(, int256 answer, , , )` — **discarding `updatedAt` and `answeredInRound`**. No staleness guard. PT-stcUSD oracle wired 2026-05-13, post any oracle-coverage audit.
5. **CANDIDATE-D / DC-7 paired-validation asymmetry** `[ASSUMED]` — LendingBroker callback `onMoolahLiquidate` (line 580+) does `interestToBroker` rounding via `BrokerMath.mulDivCeiling(repaidAssets, totalDebtAtBroker, debtAtMoolah).zeroFloorSub(repaidAssets)` then calls `IMoolahLiquidateCallback(liquidator).onMoolahLiquidate(repaidAssets + interestToBroker, data)`. Asymmetric ceiling-then-floor sequence around an external-controlled callback boundary — high-EV rounding-arbitrage surface. Spearbit Credit-Liquidation audit (2026-03-03) likely covered this; needs dedup.
6. **CANDIDATE-I share-inflation** `[ASSUMED]` — MoolahVault inherits OpenZeppelin ERC4626Upgradeable + `DECIMALS_OFFSET = max(0, 18 - underlyingDecimals)`. OZ Math.mulDiv rounding-via-explicit-mode is the Morpho-blessed pattern. Lower EV vs PT oracle, but warrants 1-pass check on `_deposit/_mint/_withdraw/_redeem` overrides post-audit.
7. **PositionMigrator family — fresh attack surface** `[INSPECTED]` — `src/utils/PositionMigrator.sol` (323 LOC) + `PositionManager.sol` (200 LOC). 11 commits 2026-03-18 → 2026-05-08 including `fix: audit - support repay by borrowShares for exact full migration and native BNB repay` (2026-03-30). Migration-during-liquidation comment (`2ce4b5a chore: add commnet for migration a position during CDP liquidation`) and `e1426e4 fix: migrate locked() portion only` suggest reentrancy/cross-call attack surface. CertiK + Cantina PositionManager audits 2026-04, but 2 commits landed AFTER audit reports (May 7-8 merges).

## STEP 3 — EV CALCULATION

```
Cap = $1,000,000 (Critical)
P(finding) = 0.10 (HIGH overlap, but multi-firm saturation on core)
P(acceptance) = 0.55 (Immunefi tier-1 payer, $0-history not flagged)
brain_overlap_multiplier = 1.0 (HIGH)
EV = 1,000,000 × 0.10 × 0.55 × 1.0 = $55,000
```

Revised upward from intake-brief $12.5K-$25K due to:
- **Post-audit composition window** (Doctrine #34) — 50+ commits since latest audit, including 3 privileged-setter additions + 1 oracle config swap
- **PT oracle staleness gap** is concrete `[EXECUTED]` finding-candidate, not speculative
- Audit-agent CI integration (May 21 commits) suggests team actively expects external findings

Comparable Buzz pipeline EV: Stader $2K-$5K (foreclosed via dedup), Pancake P-1 in-flight (Gate 2 forge build phase). **Lista EV ranks above Stader, comparable to Pancake P-1 critical-tier**.

## STEP 4 — QUEUE DECISION

**Immediate Gate 2 dispatch on top 2 candidates** (sequential, not parallel — disk + Pancake P-1 in flight):

1. **CAND-3 (PT oracle staleness)** — surgical, ~3 files, no Foundry harness needed for source-level PoC, 1-2h turnaround
2. **CAND-1 (MoolahVault custom-name + setWhiteList drift)** — dedup against MoolahVaultFactory whitelist consumers — 2-3h

Defer to Gate 2 ranked queue:
- CAND-2 (LendingBroker.emergencyWithdraw drain) — MANAGER role threat model required
- CAND-7 (PositionMigrator post-CertiK/Cantina drift)
- CAND-5 (Liquidation callback rounding arbitrage) — Spearbit dedup required first
- CAND-1 (Doctrine #29 v1.1 slisBNB MIN-cap) — Gate 2 source-read required

## STEP 5 — GATE 1 EXECUTION RECORD

1. ✅ Clone: `lista-dao/moolah` master @ depth 200 → `/home/claude-code/buzz-workspace/data/lane1/clones/lista-moolah` (85M)
2. ✅ Pre-flight scope-check: 12 BSC addresses extracted from Immunefi; core lisUSD + INTERACTION + VAT cluster maps to **archived** `lista-dao-contracts` — confirmed legacy CDP foreclosure. Moolah substrate maps to "134 assets" not enumerated on Immunefi page — **operator clarification needed** on whether Moolah core addresses are in the "134" or out-of-scope.
3. ✅ Bytecode-verify prep planned for: lisUSD `0x0782b6d8...41E5`, INTERACTION `0xB68443Ee...75ec4`, VAT `0x33A34eAB...01c4`, SPOT `0x49bc2c4E...3038`, JUG `0x787BdEaa...A7B3`, clisBNB `0x4b30fcAA...d6F6`, slisBNB Provider `0xA186D236...dada8` (deferred until Gate 2 finding lands)
4. ✅ Layer 0 git-security analyzer: skipped — Moolah is OSS public repo, no secret-leak surface
5. ✅ Inventory:
   - Moolah core: 4002 LOC across 8 contracts (Moolah, MoolahVault, MoolahVaultFactory, MarketFactory, MoolahVaultManager, Liquidator family)
   - Broker family: 1545 LOC (LendingBroker, BrokerInterestRelayer, RateCalculator)
   - Credit-Loan: 1559 LOC (CreditBroker, CreditBrokerInfo, CreditBrokerInterestRelayer, CreditToken)
   - Provider: 1723 LOC (BNBProvider, ETHProvider, SlisBNBProvider, SmartProvider)
   - Oracle: 315 LOC (OracleAdaptor, PTLinearDiscountOracle, PTLinearDiscountMarketOracle)
   - Vault-allocator + Revenue + Timelock + DEX + IRM + Utils: ~2000 LOC combined
   - Total in-scope-candidate LOC: ~11,200
6. ✅ 7-lens application (Step 2 above)
7. ✅ 5-Target Quality Checklist:
   1. **Withdrawals/Redemptions** — MoolahVault `_withdraw/_redeem` (post-audit unchanged); LendingBroker.emergencyWithdraw (NEW privileged) ✅
   2. **Liquidation+Oracle** — Liquidator family + PT oracles ✅ — CAND-3 + CAND-5
   3. **Deposit/Mint Shares** — MoolahVault ERC4626 + DECIMALS_OFFSET (CANDIDATE-I check pending) ✅
   4. **External Calls** — `onMoolahLiquidate` callback chain (Broker→Vault→Liquidator) ✅
   5. **Admin/Upgrade** — `_authorizeUpgrade` gated by DEFAULT_ADMIN_ROLE (comment: "must be a TimeLock contract"); `setName/setSymbol/setWhiteList` MANAGER+ADMIN, no timelock on the setter itself ✅
8. ✅ Audit dedup: Phase 0a complete — 20 reports inventoried, gap-zones identified
9. ✅ Output filed: this document

## MakerDAO comparison

Lista has **bifurcated**: legacy CDP (`lista-dao-contracts`, MakerDAO Vat/Dog/Spotter/Jug fork) is **archived 2026-05-19**. Active substrate is **Moolah (Morpho Blue fork)** — NOT a Vat-family CDP, but ERC4626-vault-over-isolated-markets. This means:
- MakerDAO-class lenses (vat ilk authority, bite/grab, dust threshold gaming, vow surplus auction) → **foreclosed** on the active codebase
- Morpho-class lenses (LLTV liquidation threshold, isolated markets, IRM permissionlessness, vault role-tree, allocator) → **primary surface**

Immunefi page lists VAT + SPOT + JUG addresses, but those map to archived contracts. **Risk**: if Immunefi scope literally lists archived addresses as in-scope, the bounty may pay for legacy findings against contracts no longer in active development — but those contracts have 4+ years of multi-firm audit coverage. Realistic EV = active Moolah substrate.

## Stader/Olympus comparison (Doctrine #29 v1.1)

**Status: DEFERRED to Gate 2 source-read of `SlisBNBProvider.sol` (482 LOC).**

Lista is a candidate 3rd anchor for two-sided MIN-cap defense pattern (Olympus PRESENT, Stader ABSENT). slisBNB is a BNB-side LST rate-provider — different from ETH-LST family in cross-chain semantics but architecturally analogous. Gate 2 will confirm PRESENT or ABSENT and either widen Doctrine #29 v1.1 to BNB-LST scope or anchor a NEGATIVE-2 (ABSENT) match.

## Recommended next-action

**Gate 2 dispatch (sequential after Pancake P-1 wraps):**

1. **G2-LISTA-1**: PT oracle staleness — `[EXECUTED]` code-confirmed. Build minimal Foundry PoC showing stale `latestRoundData()` answer flows to Moolah market price → unfair liquidation OR borrow-against-stale-collateral. 4 PT markets (PT-stcUSD-23JUL2026, PT-sUSDai variants × USDT/USD1) added 2026-05-13 are the freshest attack surface. Cantina/Bailsec dedup required against `Cantina-Position-Migrator-20260318.pdf` and `Bailsec-Position-Migrator-20260318.pdf` (oracle context may be tangentially covered).
2. **G2-LISTA-2**: MoolahVault setName/setSymbol post-audit drift — confirm no downstream symbol-matching consumer (allocator, factory whitelist, frontend trust signal). Lower-tier finding but cheap-to-confirm.
3. **G2-LISTA-3** (deferred): LendingBroker.emergencyWithdraw drain — MANAGER role threat model; defer pending operator confirmation Lista MANAGER is multisig+timelock per docs.

## Brain compounds queued (for Self-Correction-Filing-Rules.md fold-back)

1. **Watchlist-Candidate-Crossmap.md row**: lista-moolah | 11200 LOC | 7 lenses hit | overlap 0.62 | "Morpho Blue fork + Lista-bespoke broker layer; PT oracle staleness gap + post-audit setter drift; 7-firm audit saturation on core but gaps on broker/oracle/migrator periphery"
2. **Open-Questions-Tracker.md candidate**: "Does Immunefi 'in-scope 134 assets' enumerate active Moolah substrate addresses, or are listed VAT/SPOT/JUG addresses archived-contract scope only?"
3. **Contradictions-Register.md candidate**: NONE detected this Gate 1
4. **Doctrine #34 (post-audit composition window) datapoint**: Lista exhibits classic Doctrine #34 profile — 50+ commits in the 70-day window between latest audit (2026-03-18 Position-Migrator) and today (2026-05-27). 7-firm core saturation **reduces** P(finding) on Moolah.sol/MoolahVault.sol post-audit-unchanged surfaces, but **increases** P(finding) on post-audit-drift surfaces (privileged setters, oracle config, broker emergencyWithdraw).
5. **Cross-pollination tag**: CANDIDATE-I anchor #29 candidate (Helio Plugin Donation 2023 → Moolah ERC4626 share-inflation potential — needs Gate 2 confirmation on inflated-empty-market deposit before promotion)

## Disk + clone status

- Clone: `/home/claude-code/buzz-workspace/data/lane1/clones/lista-moolah` (85M, depth 200)
- Disk: 6.0G free / 84% — within 88% halt threshold
- Parallel Pancake P-1: still running, no conflict

---

### Footer — R8 Calibrated Reporting

Evidence-grade per claim:
- `[EXECUTED]` (5): PT oracle `latestRoundData()` destructure gap; emergencyWithdraw signature + role guard; setName/setSymbol post-audit diff; LendingBroker authority modifier inventory; git-log post-audit drift on Moolah core (zero) and MoolahVault (one)
- `[INSPECTED]` (6): Immunefi page status + cap structure; audits inventory (file listing); commit-message archaeology; LOC inventory; PositionMigrator 11-commit drift; archived legacy CDP repo
- `[ASSUMED]` (3): Doctrine #29 v1.1 slisBNB MIN-cap (no source read of SlisBNBProvider yet); CANDIDATE-D liquidation rounding (Spearbit dedup pending); CANDIDATE-I MoolahVault inflation (no `_deposit/_mint` override read yet)

No `[EXECUTED]` claim relies on bytecode-verification (deferred to Gate 2). PT-oracle `latestRoundData()` destructure is source-confirmed in the cloned HEAD; if deployed bytecode diverges, Gate 2 must `cast code` + recompile.
