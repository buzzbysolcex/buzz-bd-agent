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

---

## 4-Target HackenProof/Cantina Batch — Gate-1 EV Triage (2026-05-29, Ogie msg 8019)

**PRIVATE platforms** (HackenProof / Cantina) — PLATFORM-ONLY disclosure, P4→P2 fanout SUPPRESSED (sentinel-gated). **RUNNABLE [EXECUTED] PoC MANDATORY** (no green PoC = no submission — HackenProof rejects AI-no-PoC). $5-20/sub. Parallel to Hyp-C (no 1/24h conflict). KYC likely for payout (operator step). Ranked by Doctrine #42 freshness **× PoC-feasibility** (the [EXECUTED]-only constraint makes PoC-feasibility a GATE, not a multiplier), NOT cap.

| Rank | Target | Platform | Cap | Fresh surface | Substrate-fit | PoC-feasibility | Audit/subs | EV ≈ p·W−(1−p)L |
|---|---|---|---|---|---|---|---|---|
| **1** | **Dexalot — `cd/removeAuction` DIFF vs main** | HackenProof | $50-100K Crit / $20-30K High | **HIGH — removal-refactor branch (net-new, un-audited); hunt the DIFF, NOT the 532-sub core** | EVM Solidity (Pattern A-J + DC-7 + #43 CLOB) **HIGH** | **HIGH (pure Solidity, local Foundry)** | $0 paid / 532 subs ($5/sub) | p≈0.12 · W $75K · **P(acc)≈0.25 ($0-paid haircut)** − small-L ≈ **~$2.2K** |
| **2** | **Hyperbridge — `solidity-merkle-trees`** | HackenProof | $30-50K Crit | MED — fresh-ish bridge proof-verification | EVM Solidity (CANDIDATE-A bridge, KelpDAO/Wormhole priors) **HIGH** for the Solidity side; Rust runtime = **LOW-fit (skip)** | **HIGH (pure Solidity merkle verify)** | $5/sub | p≈0.08 · W $40K · P(acc) 0.4 − L ≈ **~$1.3K** |
| **3** | **Ventuals — vHYPE LST** | Cantina | $1M Crit / $20K High | **HIGH — fresh 2025 Hyperliquid LST, audit-LIGHT** | HyperEVM (Pattern A-J + CANDIDATE-I/J share-accounting) | **MED — HyperEVM precompile RISK: a HYPE-staking-precompile bug can't be locally Foundry-PoC'd → fails [EXECUTED]; only pure share-math findings PoC-able** | $20 deposit, ARCHITECTURE.md | p≈0.10 · W $100K · P(acc) 0.4 = ~$4K NOMINAL, **but PoC-feasibility-gated → ~$2K realizable** |
| **4** | **OKX Labs** | Cantina | $1M | **LOW — vague scope ("OKX-deployed mainnet"), no fresh-surface signal** | EVM but unscoped | low (vague scope = high surface-map L) | **495 subs (Doctrine #27 J ≥100 → auto-foreclosure-receipt), big-exchange F-MAXIMUM**, KYC + $10 deposit | p≈0.02 · W $1M · P(acc) 0.4 − high-L ≈ **CAP-TRAP, deprioritize** |

**Ogie hypothesis (Dexalot-DIFF > Hyperbridge-merkle > Ventuals > OKX): CONFIRMED, with refinements:**
- **#1 Dexalot-DIFF** — driven by DIFF-freshness × pure-Solidity PoC-feasibility (the [EXECUTED] gate), NOT the cap. ⚠️ FLAG: **$0-paid / 532-subs** → P(acc) haircut to ~0.25 (realizable-W risk); the DIFF avoids the core's 532-sub saturation but the payer-history is real. Doctrine #43 applies directly (CLOB DEX — run the QC gates on any per-step/slippage pattern).
- **#3 Ventuals** has the HIGHEST *nominal* p·W ($1M cap + fresh + audit-light + Cantina-pays), but the **RUNNABLE-PoC-mandatory constraint drops it to #3**: HyperEVM staking-precompile findings can't reach [EXECUTED] on a local fork (only pure share-math can). If a pure-share-math candidate surfaces, Ventuals jumps.
- **#4 OKX** — CONFIRM deprioritize: cap-trap (max cap × 495-sub saturation × vague scope × big-exchange F-MAXIMUM = predictable foreclose, Doctrine #42 + #27 J).
- All: R-1 in-scope clarity — exclude front-run-only / theoretical-no-PoC / imported-contracts / gas-best-practice (do NOT hunt those).

**STEP 2 target = #1 Dexalot `cd/removeAuction` DIFF.** → DONE: NEGATE/PARK. Hyperbridge #2 → NEGATE/CLEAN. Ventuals #3 → deferred. OKX #4 → dropped (cap-trap).

---

## REFRESHED QUEUE — PoC-FEASIBILITY PRIMARY (2026-05-29, Ogie msg 8023)

**Re-rank key: realizable-EV = p × W × P(PoC-able) × P(acc)** — NOT nominal cap. The funnel that CONVERTS is pure-logic-PoC-able. P(PoC-able) HIGH for pure-math / in-contract-state / pure-state-machine / Go-state-logic (local-forkable, Foundry/Anchor/Go-unittest); LOW (→ DROP) for precompile / oracle-manipulation / cross-chain-relay / external-state. P(acc) discounts $0-paid + audit-saturated payers. Secondary: audit-light (≤2 OR net-new module) + fresh (≤1-3mo) + R-1 clarity + cap-floor + substrate-fit (EVM A-J / Solana DC-8 / Cosmos-Go #129/#137/#138/#165/#166). WebFetch-verified caps tagged [VER]; others [EST].

| # | Target | Platform / Cap | PoC-feasibility | Surface age / audit-count | Substrate-fit | Realizable-EV | Notes |
|---|--------|----------------|-----------------|---------------------------|---------------|---------------|-------|
| **1** | **Babylon — Cosmos-Go chain** (epoching / checkpointing / finality-provider / BTC-timestamping consensus modules) | Immunefi **$1M crit** [VER], 10%-of-funds, KYC likely | **HIGH** (pure Cosmos-SDK state-logic → Go-unittest PoC; BTC-light-client parts lower) | mainnet 2024-25 fresh; moderate audits | **Cosmos-Go — DIRECT #129/#137/#138/#166 arsenal fit** + my Heimdall tooling runs as-is | **~$48K** | ⭐ funnel-converter: arsenal BUILT, pure-state, fresh, less EVM-saturated. Doubles as June-Heimdall dry-run. **NEW #1.** |
| **2** | **Symbiotic** (vault / delegator / slasher / burner / epoch) | Immunefi **$500K crit** [VER], 10%-of-funds | **HIGH** (slashing math + epoch accounting = pure state-machine, forkable) | 2024-25, modules iterating; moderate audits | EVM CANDIDATE-J/D + DC-9 | **~$21K** | confirm not already Gate-1'd (BuzzShield regression-tested it 2026-05-09, not a hunt). |
| **3** | **Morpho Vaults V2** (curator / allocator) | Cantina ~$2.5M [EST] | **HIGH** (share-accounting + role logic, pure-EVM) | 2025-26 new standard | CANDIDATE-I + Pattern-A (distinct from V1/MetaMorpho = DISC-018) | **~$11K** | net-new curator/allocator surface. |
| **4** | **Euler v2** (EVC / EVK / EPO) | Cantina **$7.5M crit / $5M High / $200K High-FLOOR** [VER], 10%-of-impact | **HIGH** (modular lending share + operator/sub-account logic, forkable) | 2024-25; **audit-HEAVY (low p)** | CANDIDATE-I + DC-9 + operator-auth | **~$9K** but **$200K High-floor = high-variance** | research-first: low-p but the $200K min-High floor means any landed finding pays huge. |
| **5** | **EtherFi recent** (Liquid vaults / Cash) | Immunefi ~$500K-$1M [EST] | **MED-HIGH** (vault accounting forkable; Cash card flows external) | 2025 modules | CANDIDATE-I share-accounting | **~$9.6K** | hunt the pure-vault sliver, not the card rails. |
| **6** | **Usual / Falcon** (fresh yield-stablecoins — **NOT Resolv**) | Immunefi $100-500K [EST] | **HIGH** (collateral/share pure-math) | 2025 launches, audit-LIGHT (high p) | CANDIDATE-I + Pattern-E | **~$10K** | floor-clearing high-p. ⚠️ **Resolv DROPPED** (14 audits/5 firms; 2026-03 hack was AWS-cred not code — saturated, Doctrine #42-refined). |
| **7** | **Ethena recent** (USDtb / minting-converter) | Immunefi ~$1M [EST] | **HIGH** (mint/convert share-math) | 2025-26 fresh modules | CANDIDATE-I/J (cooldown already hunted #79589) | **~$7.6K** | USDtb + converter are fresh un-hunted. |
| **8** | **Solana restaking** (Jito / Sanctum / Kamino recent modules) | Immunefi varies [EST] | **MED** (Anchor PoC = more setup) | 2024-25 fresh | **Solana DC-8 Anchor-signer + CANDIDATE-G** | **~$6K** | verify bounty exists; less EVM-lens-saturated. |

**DROPPED / DEFERRED:** Ventuals (PoC-gated precompile, ~$2K realizable — bottom; revive only if a pure-share-math sliver lights up at Gate-1) · OKX (cap-trap, 495 subs) · Lido V3 (foreclosed) · Aave Umbrella (audit-heavy-fresh, demote) · Resolv (14-audit saturated) · Dexalot/Hyperbridge (hunted, NEGATE/CLEAN).

**#1 Babylon Cosmos-Go = FULLY CLOSED (2026-05-29).** NEGATE (prioritized leads: finality+btcstaking SEQ — caller-loop/consensus-key monotonicity) **+ NEGATE [EXECUTED] (checkpointing BLS-bitmap forged-quorum residual — 5-axis binding sound, 2 Go-test PoCs PASS).** Only un-hunted residual = #137 canonicalization(27) surface map (lower-value, deferred). June-Heimdall dry-run = GO at [EXECUTED] level (Go-unittest harness validated on real Cosmos BLS module). Compounds banked: #138 caller-loop NEGATING-example + W-2-FQ-NEG BLS-bitmap-binding + Heimdall ECDSA-array-vs-BLS-bitmap scheme split. Clone purge-eligible. See `hunts/2026-05-29-babylon-cosmos-gate1.md` + `brain/Sherlock-Polygon-Heimdall-Prep.md` §DRY-RUN COMPLETE.

**#2 Symbiotic = STEP-4 FORECLOSE-RECOMMEND (2026-05-29, post-clone Phase-0 dedup).** Inventory found **6 audit firms incl. Certora formal-verification on 6,574 LOC + HEAD 2025-10-30 (~7mo stale)** → fails this queue's OWN Doctrine-#42-refined dispatch criterion (≤2 audits AND ≤1-3mo) on BOTH axes. Demote exactly as Resolv (14-audit) was. Realizable-EV recomputed ~$5K (not ~$21K). **Operator (Ogie msg 8031) APPROVED a narrow time-boxed override on the cross-module seam → OVERRIDE-HUNT = NEGATE [INSPECTED].** VetoSlasher↔Delegator↔Vault epoch/veto interaction is sound: load-bearing invariant **2-epoch claim-delay > 1-epoch slash-window** + onSlash covers in-flight withdrawal buckets + offense-time stake binding (`stakeAt(capture)`) + vetoDeadline ≤ capture+epochDuration. All 3 hypotheses (stale-delegation race / withdraw-escape / epoch-view disagreement) NEGATE. No discrepancy → no PoC (time-box cheap-foreclose). Compound banked: **CANDIDATE-J Slash-Window⊂Claim-Delay NEGATING-EXAMPLE** → reuse on **Aave Umbrella (row 4)**, EigenLayer, Karak, Jito restaking. Clone purge-eligible. See `hunts/2026-05-29-symbiotic-immunefi-gate1.md`. **LESSON: check the queue's ≤2-audit criterion at CLONE-INVENTORY (audit-dir count), not just WebFetch PROFILE — Symbiotic's audit dir wasn't visible pre-clone.**

**Usual / Falcon = PARKED — "resolve platform before dispatch" (Ogie msg 8034).** Step-1 preflight found NO confirmable Immunefi program for either (Usual search returned the unrelated USDT0/Tether LayerZero-OFT $6M — foreclosed substrate). They may be on Sherlock/Cantina/self-hosted. Do NOT chase platform now; tagged **`resolve-platform-before-dispatch`** — unverified targets do not re-enter dispatch until platform+funded-bounty confirmed.

**#3 Morpho Vaults V2 = NEGATE [INSPECTED] (2026-05-29, Ogie msg 8034 APPROVED dispatch).** Source-read the curator/allocator-accounting seam (VaultV2.sol + the freshest sliver MarketV1AdapterV2.sol + MathLib). 7 candidates all dissolved into documented/accepted design (adapter delta-accounting correct; soft-caps-vs-interest intentional; flashloan-conservative relativeCap; vault-favorable rounding; once-per-tx accrual anti-shorting lock). HEAD 3wk-fresh but **10-audit incl. Certora formal-verif** → Doctrine #42-refined 3rd anchor (fresh ≠ unaudited, after Lido V3 + Symbiotic). No discrepancy → no PoC (cheap-foreclose). Compound: CANDIDATE-I curated-vault delta-accounting NEGATING-EXAMPLE. Clone purge-eligible. See `hunts/2026-05-29-morpho-vaultv2-cantina-gate1.md`.

**🔭 FRESH-SCOUT HOLDING LIST (2026-05-30 scout — VERIFY audit-count + scope + cap before dispatch, per the hard gate):** genuinely fresh + confirmed-Immunefi-platform leads found while course-correcting off the audit-saturated blue-chips:
- **Hermetica** — ✅ HUNTED 2026-05-30 = **NEGATE [INSPECTED]** (autonomous loop). Clarity/Stacks substrate (USDh/sUSDh); sound access-control throughout; inflation non-exploitable post-seed; minting permissioned+oracle-gated+operator-trust (OOS residuals). **First Clarity substrate arsenal seed banked.** See `hunts/2026-05-30-hermetica-immunefi-gate1.md`. NOTE: substrate-blind Clarity (Doctrine #36) + $100K-cap = low realizable-EV; value was the substrate-coverage investment.
- **Granite Protocol** — ✅ STEP-1 VERIFIED (2026-05-30, autonomous) = **ACTIVE NEXT UNIT.** Immunefi live, **$100K crit (10%-funds) / $1M hard-cap**, **Stacks/Clarity** BTC-collateralized LENDING (borrow/lend/liquidate, sBTC collateral, **Pyth oracle**) — RICHER high-severity surface than Hermetica (liquidation/LTV/oracle/interest/bad-debt) + **direct Clarity-arsenal reuse** (2nd anchor → promotes lenses to detectors). Clarity Alliance "Granite Upgrade v2" audit exists. **NEXT-STEP (next working block):** source is on-chain but spread across MULTIPLE per-market deployer principals (`state-v1` LP-token + `staking-v1` under many SPs; `SP1J45NVEGQ7ZA4M57TGF0RAB00TMYCYG00X8EF5B.granite-btc`). Identify the MAIN lending-logic deployer (borrow/liquidate/oracle/market contracts — NOT the per-market LP token), pull via Hiro `v2/contracts/source`, deep-read liquidation+oracle+interest core with the Clarity arsenal (DC-3-Clarity, CANDIDATE-I, oracle-gating, as-contract). **Tooling gap:** PDF audits unreadable (no poppler-utils, can't sudo) — get architecture from source, not the PDF. EV: $100K-cap + substrate-blind-ish but lending p higher + arsenal-reuse synergy + Clarity 2nd-anchor.
- **YO Protocol** — Immunefi, specifics unverified.
- SKIP: USDT0 (LayerZero OFT-wrapper = foreclosed no-novel-surface substrate per substrate-identity rule).
These sit in HOLDING until Step-1 [VER] (audit-count ≤2 + scope + cap floor). Note: $100K caps are floor-class — per Doctrine #42 ("hunt freshness not cap"), a fresh+audit-light $100K with real p beats a saturated $3M with ~0 p (the Ethena/Symbiotic/Morpho lesson).

**📌 QUEUE-ENTRY-GATE REFINEMENT TODO (Ogie msg 8034 — "when convenient, not now"):** make **"funded bounty + confirmed platform"** a HARD queue-ENTRY gate, not a deferred `[EST]` row. Unverified-platform targets (Usual/Falcon) cost a preflight cycle each. Tighten the funnel: a row only enters the dispatch queue once platform+funded-bounty is [VER]; otherwise it sits in a separate "unresolved — verify platform" holding list. Implement on next queue-maintenance pass.

**Ethena USDtb (was the NEXT lead) = STEP-1 HOLD (2026-05-30).** Platform gate PASSES (Immunefi Ethena active, Critical 10%-of-funds **max $3M, $100K min floor** — stronger than the ~$1M [EST]). BUT fresh thesis WEAK: Mint/Redeem V2 already passed audit (Zellic+Quantstamp+Spearbit core); cooldown saturated (DISC-017 #79589 dup of #68406); **USDtb-specific in-scope assets UNCONFIRMABLE from my side** (scope page bot-gates WebFetch — operator can see it). Reads as audit-heavy/hunt-saturated blue-chip = Doctrine #42-refined predictable-NEGATE (4th in the Symbiotic/Morpho pattern). NOT cloned. Surfaced the fork to operator (msg 8041): (1) source fresh+audit-light targets [my rec, scout started ↑] / (2) operator confirms USDtb in-scope contracts → hunt that sliver / (3) Euler v2 swing ($200K High-floor offsets low-p). Awaiting steer.

**NEXT ACTION:** pending operator fork (msg 8041). Default-rec = the FRESH-SCOUT HOLDING LIST above (Hermetica BTC-finance ~3.5mo-fresh $100K = lead) once Step-1 [VER]'d. **HOLD: Hyp-C = Immunefi slot 1 (window opened 21:40Z 2026-05-29, untouched, operator-gated submit); all Gate-1 work parallel, NO submission conflict.**

---

_Lane5-Fresh-Queue | v1.2 | 2026-05-29 (Ogie msg 8023 PoC-feasibility-primary re-rank — realizable-EV = p×W×P(PoC-able)×P(acc); Babylon Cosmos-Go = NEW #1 arsenal-fit funnel-converter; Resolv dropped 14-audit-saturated; Ventuals deferred precompile-gated). WebFetch-verified caps: Euler $7.5M/$5M-High/$200K-floor, Symbiotic $500K, Babylon $1M, Resolv $500K. Supersedes v1.1 cap/4-target sections. Companion: Doctrine #42 + #42-refined + #43. Verify [EST] rows at dispatch._
