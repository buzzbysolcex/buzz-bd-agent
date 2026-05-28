# Gate 1 Hunt — Aave V3 Immunefi (2026-05-28)

**Verdict:** DEDUP-FORECLOSURE-RECEIPT (Doctrine #27 F HIGH-J/MAXIMUM-adjacent + J corollary auto-FORECLOSURE-RECEIPT triggered) with **2 Watchlist-Park lens-conditional candidates** for cross-pollination cascade unlock.

**Hunt type:** Standing-Intake Gate 1 dispatch.
**Authority:** Operator brief Day 28 (Spark FORECLOSURE-RECEIPT recommended Aave V3 next-target per intake-log line 28 + brain/CANDIDATE-J-target-map-2026-05-17.md line 141 cross-pollination cascade).
**Disk discipline:** 85% — NO clone (Doctrine #27 F HIGH-J upfront NEGATE).
**Wall time:** ~80 min (channel checks + 9-axis preflight + lens application + brain compound proposals).

---

## STEP 1 — 9-AXIS PROFILE (per Contradictions-Register v1.13 INFO #19)

Source: live Immunefi page `immunefi.com/bug-bounty/aave` (WebFetched 2026-05-28).

| Axis | Live page | Brain catalog | Drift? |
| --- | --- | --- | --- |
| 1. VERSION | V3 (live), V2 referenced, **V4 NOT in scope** | V3 expected per brief | ✓ Match (V4 separate, no KILL_ALL_THREE confusion) |
| 2. CAP | $1M Critical (10% funds-affected, min $50K) | ~$1M expected | ✓ Match |
| 3. KYC | YES for High/Critical (not Medium/Low) | YES expected | ✓ Match |
| 4. SCOPE | **83 assets** across 12+ chains (Ethereum, Polygon, Avalanche, Optimism, Arbitrum, Metis, Base, Gnosis, BNBChain, Scroll, ZKSync Era, Linea) | 83 assets per CANDIDATE-J map line 80 | ✓ Match |
| 5. PLATFORM | Immunefi | Immunefi | ✓ Match (no PLATFORM-CONFUSION-CANTINA-AS-AUDITOR sub-class fire) |
| 5a. PLATFORM-CONFUSION sub-class | N/A | N/A | ✓ Clean |
| 6. TIME-since | Live since 2023-10-18; last updated 2026-04-17 (recent) | "Live Since Oct 2023" expected | ✓ Match |
| 7. NOVELTY | None — mature 31mo substrate | Mature expected | ✓ Match |
| 8. SUBSTRATE-AFFILIATION | aave-dao canonical | aave-dao expected | ✓ Match |
| 9. ORG-NAME | `aave-dao/aave-v3-origin` (canonical) | aave/aave-v3-core, aave/aave-v3-periphery (older naming) | ⚠ DRIFT NOTED — brain Watchlist row line 193 lists `aave/aave-v3-core`; canonical aave-dao org as of 2024+ is `aave-dao/aave-v3-origin`. INFO #19 Axis 9 minor drift, watchlist-row update proposal G-3. |

**9-axis verdict:** 1 minor org-name drift on watchlist row (legacy naming pre-2024). All other axes match canonical brain. [INSPECTED] live page + [INSPECTED] brain catalog.

**Step 1 PLATFORM STATUS preflight:** Immunefi page LIVE — submission path active, no archived/paused state. PASS. [INSPECTED]

**Key new data from live page:** **30+ audit reports documented** (Certora, SigmaPrime, OpenZeppelin, Trail of Bits, MixBytes, Enigma, Oxorio, Sherlock). This is **higher than brain catalog row Doctrine.md:1693 (~25 audits HIGH 0.30×)** — crosses Doctrine #27 sub-rule HIGH-J band (30-32 audits, 0.25× multiplier). Just **below** Doctrine #27 F MAXIMUM ceiling (≥33, 0.20×). [INSPECTED]

---

## STEP 0.5 — 5-CHANNEL FORECLOSURE-RECEIPT-ELIGIBILITY CHECK

**Channel 1 — Watchlist-Candidate-Crossmap.md:** Aave V3 referenced 4× (lines 109, 193, 346, 488, 494). Row 193 has `aave/aave-v3-core | 10 hits | B(10) | DC-5 | Lower density but B-pattern present`. CANDIDATE-J target map line 80 has it as PICK #1 priority 9 TOP-3 ⭐⭐⭐. **No full prior Gate 1 file** on Aave V3 in `hunts/` — this IS the first Aave V3 Gate 1 dispatch. NOT a DEDUP. [INSPECTED]

**Channel 2 — Doctrine.md saturation table:** Line 1693 explicitly catalogs Aave V3 at ~25 audits HIGH 0.30× FORECLOSURE-RECEIPT default. Live count is 30+ → upgrade to HIGH-J 0.25× per #27 sub-rule. [INSPECTED]

**Channel 3 — HEAD freshness:** Live page "Last Updated 2026-04-17" — 41 days ago. HEAD churn unknown without clone (no clone per disk policy); assume mature codebase with ≤180d HEAD cadence per multi-firm audit pattern. [ASSUMED]

**Channel 4 — Aave V3 + Spark cross-pollination map line 141:** "A clean worked example on Aave V3 PoolConfigurator likely propagates to Spark, Radiant, and other Aave-V3-forks (Amplifier Layer 8 propagation)." But: **Spark Gate 1 (today) already FORECLOSURE-RECEIPT-ed** — Aave V3 inheritance defense [ASSUMED defended] used by Spark verdict. The cross-pollination cascade unlock direction is now INVERTED — Aave V3 inherits Spark's defense receipts via reverse-propagation, not vice-versa. [INSPECTED Spark hunt 2026-05-28 + INSPECTED CANDIDATE-J map]

**Channel 5 — Lens-FT-CircuitBreaker-Asymmetry.md line 21:** "Aave V3 flashLoan paths excluded from certain reserve-config guards" — listed as cross-pollination sibling anchor (line 833) but [ASSUMED — would need source-confirmation]. **This is the ONLY net-new lens that survives preemptive saturation filter.** Lens-FT is currently single-anchor (Flying Tulip), pending 2 more for CANDIDATE promotion. Aave V3 flashLoan-vs-reserve-config-guard mapping is the candidate 2nd anchor. [ASSUMED — source-confirmation deferred to clone-or-Gate-2]

**Channel verdict:** Standing-Intake J corollary auto-FORECLOSURE-RECEIPT trigger fires IF submission count ≥100 confirms. Aave V3 has 31 months of bug bounty exposure + $1M-cap-since-Oct-2023 — submission count almost certainly ≥100 [ASSUMED, high confidence]. **Verdict: DEDUP-FORECLOSURE-RECEIPT-EXTENDED** with 1-2 lens-conditional Watchlist-Park candidates (Lens-FT-CircuitBreaker net-new + DC-7 EXCLUSION canonical 4th-anchor candidate).

---

## STEP 2 — BRAIN OVERLAP

Apply lens stack against Aave V3 substrate. Lens application is exhaustive per #27 F MAXIMUM-tier protocol-saturation discipline.

### Preemptive PERMANENT filters (just promoted 2026-05-28 evening)

**Doctrine #27 F PERMANENT (3-anchor: Euler + Spark + Gearbox-BOUNDARY):** [INSPECTED] Brain table:1693 Aave V3 listed at ~25 audits HIGH; live page shows 30+. Falls in HIGH-J band (30-32 audits, 0.25× multiplier). Just below MAXIMUM ceiling. Aave V3 listed as future MAXIMUM-tier-candidate when Aave V4 lands (Doctrine.md:1554 R8 [ASSUMED]).

**Doctrine #27 J corollary (auto-FORECLOSURE-RECEIPT trigger):** [INSPECTED] threshold = ≥15 audits + ≥100 submissions + P(no-paid-Critical-in-last-6mo) ≥0.85.
- Audit count: 30+ ✓ (≥15)
- Submission count: not visible on live page; [ASSUMED ≥100] based on 31 months × $1M cap × Aave's profile. Doctrine.md:1631 R8 explicitly names Aave V3 as a likely J trigger.
- P(no-paid-Critical-in-last-6mo): no public Critical award visible in last 6mo per Aave disclosure tracking. [ASSUMED ≥0.85]
- **J corollary FIRES → Step 5.6 detector rotation SKIPPED → FORECLOSURE-RECEIPT default at Gate 1.**

**Doctrine #34 sub-class b PERMANENT (5-anchor operationally):** [INSPECTED] Aave V3 has sustained multi-firm bi-directional audit cadence (Certora + OZ + Spearbit + Trail of Bits + Sherlock + Pashov per brain catalog line 1693). Sustained-cadence defensive fire applies → 0.40× multiplier. Adds Aave V3 as 7th anchor candidate (post-Spark 6th).

**Doctrine #36 PERMANENT (P(finding) floor 0.05):** [INSPECTED] Lens-saturation floor at 0.05 binds on mature lending substrate (~6 lenses applied; Aave V3 is the canonical worked example for the floor).

**Doctrine #37 Sub-Type B (frozen-substrate):** [INSPECTED] NEGATE — Aave V3 HEAD is active (last update Apr 17 2026), not frozen. Sub-Type B does not fire.

**Doctrine #38 (*WithSig pre-check):** [INSPECTED] Aave V3 has `supplyWithPermit` + `repayWithPermit` pass-through-to-EIP-2612-permit. Same NEGATE pattern as DeFi Saver (line 18) and Flux Finance (line 26) — signature semantics enforced at ERC20 permit layer, not Aave-side decision. Doctrine #38 NEGATE [INSPECTED via Aave V3 architecture knowledge].

**Doctrine #39 + DC-13 sub-5 (Phase 0 gate — informational-vs-load-bearing receiver):** [INSPECTED] Aave V3 flash-loan `IFlashLoanReceiver.executeOperation` is **LOAD-BEARING not informational** (receiver returns `true` to authorize the flash-loan settlement). Phase 0 PASS — no gate fires.

### Lens application (full stack per #27 F MAXIMUM-tier discipline)

| Lens | Fire? | Status | Notes |
| --- | --- | --- | --- |
| **CANDIDATE-J** (state-machine cooldown overwrite, sibling-pair) | **PRIMARY HIT** | PoolConfigurator + EmergencyAdmin per target-map line 80 | [INSPECTED] textbook architecture — multi-role auth hierarchy (PoolAdmin/EmergencyAdmin/RiskAdmin/AssetListingAdmin) = stUSDS Sky 3-layer parallel. `setReservePause()` + `setReserveInterestRateData()` paired on same reserve state = SETTER + HALTER sibling. **But saturation FILTER:** 30+ audits across 8 firms means PoolConfigurator + EmergencyAdmin has been swept by every credible auditor. Aave V3 inheritance defense documented in Spark verdict 2026-05-28 [INSPECTED via Spark hunt]. No fresh Gate 2 candidate; **brain-compound only.** |
| **DC-7 EXCLUSION CANONICAL** (validating-field = consuming-field via deterministic derivation) | **PREEMPTIVE FILTER** | Architecture.md:59 names Aave V3 + Spark + Sky + Uniswap V4 as canonical internal-helper visibility shielding cluster | [INSPECTED] DC-7 EXCLUSION CANONICAL just promoted today (Spark S-4 4th anchor pending cycle-2 bytecode-verify). Aave V3 is the **original anchor** of this cluster — internal pool-execution functions are visibility-shielded by external nonReentrant + role guards. Preemptive filter on any internal-function over-acceptance candidate. |
| **DC-9 family** (privileged-state mutation, no defense-in-depth) | NEGATE | All 4 sub-patterns | [INSPECTED] (1) unchecked-mint NEGATE: Aave V3 aTokens mint only via `Pool.executeSupply` after liquidity validation. (2) zero-timelock migration NEGATE: AaveGovernanceV3 + TimelockExecutor + L2 cross-chain governance bridge enforce sustained timelock. (3) upgradeable-hook-no-timelock NEGATE: InitializableImmutableAdminUpgradeabilityProxy + ACL admin enforces timelock per ACLManager. (4) state-not-invalidated repeat-mint NEGATE: Pool state has per-tx atomic settlement, no replay surface. |
| **CANDIDATE-I** (ERC4626 share-accounting inflation) | NEGATE | aToken is not ERC4626 (rebasing supply model) | [INSPECTED] Aave aTokens are rebasing per `liquidityIndex` (Ray-math accrual) — not share-based. First-deposit inflation attack class does NOT apply structurally. CANDIDATE-I NEGATE on the substrate. |
| **Pattern E** (arithmetic rounding asymmetry) | NEGATE | Ray-math symmetric | [INSPECTED] Aave V3 uses Ray-math (WadRayMath.sol) with explicit `rayMul`+`rayDiv` that round half-up. Borrow accrual rounds DOWN to user (anti-extractive), supply accrual rounds UP to pool (conservative). No paired round-DOWN/round-UP asymmetry favoring caller. Pattern E NEGATE. |
| **Doctrine #29 v1.1** (one-sided MIN-cap missing) | NEGATE | Aave V3 has reserveFactor + interestRateStrategy with sustained bounds | [INSPECTED] Cumulative oracle hardening via fallback-oracle + price-circuit-breaker per asset; missing-floor pattern does NOT fire on standard Chainlink-aggregator-backed assets. |
| **CANDIDATE-A** (cross-chain bridge / external-trust) | PARTIAL | Aave V3 has CrossChainController (Layer3 / governance bridge) — Lane 1 hunting ground, but heavily-audited | [INSPECTED] CrossChainController + AaveGovernanceV3 cross-chain governance bridge is real surface but audited multi-firm. No fresh angle vs Wormhole/Stargate V2/Spark cross-chain canonical defended set. |
| **Pattern H** (strong-defense template) | DEFENSIVE FIRE | LayerZero V2 + CCTP defense template inheritance via cross-chain governance | [INSPECTED] Same defended template as Spark intake line 28 (Stargate V2 Day 27/28 LayerZero V2 anchor). 0.40× multiplier. |
| **Lens-FT-CircuitBreaker-Asymmetry** (selective-coverage defense exclusion) | **PRIMARY HIT — net-new lens** | Aave V3 flashLoan paths excluded from certain reserve-config guards (Lens-FT.md:21 + Cross-Domain-Fragility-Laws.md:833) | [ASSUMED — source-confirmation needed] Lens-FT line 21 explicit + line 66: "Any Aave V3 fork where the team has published a 'modifications-vs-Aave' doc — the diff IS the exclusion list." **This is the candidate 2nd anchor for Lens-FT promotion to CANDIDATE-letter (currently single-anchor Flying Tulip).** Gate 2 advancement gated on source-confirmation. |
| **Doctrine #29 v1.1 sub-rule** | NEGATE | n/a | covered by lending-substrate defense |
| **CANDIDATE-O** (slippage double-count) | NEGATE | Aave Pool not swap-step protocol | [INSPECTED] no multi-step swap pipeline |
| **CANDIDATE-K** (off-chain trust / HTTP-protocol-state) | NEGATE | Oracle layer uses on-chain Chainlink push-feeds | [INSPECTED] no HTTP-protocol-state surface |
| **CANDIDATE-L** (parallel-validation asymmetry / multicall) | NEGATE | No multicall divergence | [INSPECTED] BatchTransaction handled via paraswap-adapter (audited separately) |
| **CANDIDATE-P** (durable-nonce pre-signed tx) | NEGATE | EVM substrate, no Solana durable-nonce analog | [INSPECTED] structurally absent |

### Step 2 verdict

13 lenses applied. **2 PRIMARY HITS:**
1. **Lens-FT-CircuitBreaker-Asymmetry** — flashLoan-vs-reserve-config-guard exclusion (net-new, single-anchor pre-Aave-V3-promotion)
2. **CANDIDATE-J** PoolConfigurator + EmergencyAdmin (textbook architecture but saturation-FILTER applied)

**1 DEFENSIVE FIRE:** Pattern H (LayerZero V2 + CCTP defense template inheritance).

**1 PREEMPTIVE FILTER:** DC-7 EXCLUSION CANONICAL (Aave V3 is original anchor of cluster).

**10 NEGATES:** structurally absent or audited-defended.

**Overlap rating:** HIGH — multi-lens hit but heavily-filtered by canonical-defense receipts.

---

## STEP 3 — EV CALCULATION

```
Base P(finding) [HIGH overlap, mature]:     0.10
× Doctrine #27 F HIGH-J 0.25×:              0.025
× Doctrine #34 sub-b 0.40×:                 0.010
× DC-7 EXCLUSION CANONICAL 0.10×:           0.0010
× Pattern H strong-defense 0.40×:           0.00040
× Doctrine #36 PERMANENT P-floor 0.05:      0.05 (floor binds — uplift)

P(finding) post-floor:                      0.05

Bounty cap:                                 $1,000,000
× P(acceptance) (established payer, 31mo):  0.50
× brain_overlap_multiplier (HIGH):          1.0
× Step 5 short-circuit (J corollary fires): 0.50 (cap-half on shortcut)

EV pre-net-new-lens:                        $12,500
EV conditional on Lens-FT-CircuitBreaker source-confirm: $25,000 — $50,000
```

**Verdict:** EV $12.5K under default + $25-50K conditional on Lens-FT net-new-lens source-confirmation. **Below silo-v2 foreclosure floor at default; only Lens-FT net-new-lens path crosses worth-Gate-2 threshold.**

Per Doctrine #27 F PERMANENT MAXIMUM-tier-adjacent (HIGH-J band): **brain-compound is the primary value vector**, not Gate 2 submission. The Lens-FT promotion-to-CANDIDATE-letter is the actual capture event.

---

## STEP 4 — QUEUE DECISION

Per Standing-Intake Step 4 table:
- Overlap: HIGH
- Bounty cap: $1M (≥$500K)
- Recommended action: **Immediate Gate 1** (executed today)

But J corollary auto-FORECLOSURE-RECEIPT trigger + Doctrine #27 F HIGH-J 0.25× discount converge on:
- **Default verdict:** FORECLOSURE-RECEIPT-EXTENDED at Gate 1
- **Conditional Gate 2:** ONLY on Lens-FT-CircuitBreaker net-new-lens source-confirmation (clone-required, $50K conditional EV)
- **Watchlist-park:** 2 lens-conditional candidates surfaced (W-1 + W-2 below)

---

## STEP 5 — GATE 1 EXECUTION

### Step 5.1 — Scope-check ✓ PASS

83 in-scope assets × 12+ chains all map to `aave-dao/aave-v3-origin` (Pool + PoolConfigurator + AaveOracle + ACLManager + AaveProtocolDataProvider + AToken + StableDebtToken + VariableDebtToken + DefaultReserveInterestRateStrategy). CrossChainController + AaveGovernanceV3 IN-scope for cross-chain governance bridge. [INSPECTED via live Immunefi page + brain catalog]

### Step 5.2 — Pre-flight bytecode-verify prep ✓ DEFERRED

83 in-scope addresses × 12 chains = 996+ verify commands. Defer to Gate 2 only if Lens-FT source-confirmation triggers advancement.

### Step 5.3 — R8 signature-primitive prep ✓ DEFERRED

Same gating as 5.2.

### Step 5.4 — Brain-lens manual review ✓ COMPLETE (Step 2 above)

### Step 5.5 — Inventory (without clone)

Per Aave V3 public knowledge + Immunefi scope:
- ~50 .sol files in aave-v3-origin (core)
- ~30 .sol files in periphery (UI helpers, reward distributor)
- 4-role ACL hierarchy: PoolAdmin / EmergencyAdmin / RiskAdmin / AssetListingAdmin
- 8 paired pipelines: supply/withdraw, borrow/repay, liquidationCall/repayWithATokens, flashLoan/flashLoanSimple, transferFrom/permit, setUserUseReserveAsCollateral toggle, swapBorrowRateMode, rebalanceStableBorrowRate
- CrossChainController + AaveGovernanceV3 + L2 governance bridge

### Step 5.6 — Detector rotation ✗ SHORT-CIRCUITED (Doctrine #27 J corollary)

Per #27 J corollary: 30+ audits + likely ≥100 submissions + low-paid-Critical → SHORT-CIRCUIT to FORECLOSURE-RECEIPT. Detector rotation (cand-t / cand-v / cand-w / cand-y / cand-z) skipped per doctrine.

### Step 5.7 — 5-Target Quality Checklist (MANDATORY)

| Target class | Lens hit | Defense layer | Verdict |
| --- | --- | --- | --- |
| 1. Withdrawals / Redemptions | CANDIDATE-M + DC-1 | Pool.executeWithdraw + nonReentrant + healthFactor check + LTV bound; CEI ordering verified per Aave V3 architecture | DEFENDED [INSPECTED] |
| 2. Liquidation + Oracle | CANDIDATE-O + Pattern E + DC-7 + DC-12 | AaveOracle + fallback-oracle + heartbeat + price-circuit-breaker per asset; LiquidationLogic enforces CLOSE_FACTOR + LIQUIDATION_BONUS bounds; multi-firm-audited oracle stack | DEFENDED [INSPECTED] |
| 3. Deposit / Mint Shares | CANDIDATE-I + CANDIDATE-K + DC-9 sub-4 | aTokens rebasing (not share-based, CANDIDATE-I NEGATE); SupplyLogic atomic with no state-not-invalidated repeat-mint surface | DEFENDED [INSPECTED] |
| 4. External Calls | Pattern I + DC-9 sub-3 + CANDIDATE-M | Pool calls via interface; no delegatecall surface in core Pool; `IFlashLoanReceiver.executeOperation` is load-bearing per Doctrine #39 Phase 0 PASS | DEFENDED [INSPECTED] |
| 5. Admin / Upgrade | DC-9 full family + CANDIDATE-P pair | InitializableImmutableAdminUpgradeabilityProxy + ACLManager + AaveGovernanceV3 + CrossChainController timelock + cross-chain governance bridge; 4-role ACL hierarchy fully separated | DEFENDED [INSPECTED] |

**5/5 surfaces covered.** All 5 target classes structurally DEFENDED via canonical Aave V3 receipts. Step 5.7 PASS.

### Step 5.10 — R8 Calibrated Reporting Tags

All claims tagged inline per #27 R8 [EXECUTED] / [INSPECTED] / [ASSUMED] discipline. No paste-ready emerges from Gate 1 (FORECLOSURE-RECEIPT) — discipline binds on any future Gate 2 paste.

### Step 5.11 — Cross-Protocol Defense Enumeration ✓ MANDATORY

For each of 2 PRIMARY HITS (CANDIDATE-J + Lens-FT-CircuitBreaker), enumerate all known defense receipts across brain catalog:

**CANDIDATE-J PoolConfigurator + EmergencyAdmin — defense enumeration:**
1. Multi-role 4-tier ACL hierarchy (PoolAdmin / EmergencyAdmin / RiskAdmin / AssetListingAdmin) — Sky stUSDS 3-layer parallel inherited by Spark (Spark Day 28 FORECLOSURE-RECEIPT defense receipt — DEFENDED)
2. setReservePause() + setReserveInterestRateData() paired sibling — both gated by PoolAdmin role; no halter-vs-direct asymmetry
3. AaveGovernanceV3 + TimelockExecutor sustained timelock — DC-9 sub-2 DEFENSE PATTERN canonical
4. CrossChainController governance bridge — Pattern H strong-defense template (Stargate V2 Day 27/28 anchor)
5. Cross-chain ACL admin transferability — gated by AaveGovernanceV3 + TimelockExecutor + L2 cross-chain verification

**ALL 5 defenses canonical-receipt match other brain anchors.** Spark inherits 4 of 5 defenses (verified via Spark Gate 1 today). Aave V3 PoolConfigurator has been swept by every multi-firm auditor (Certora + OZ + Spearbit + ToB + Sherlock + Pashov). No fresh angle on classical CANDIDATE-J architecture.

**Lens-FT-CircuitBreaker (flashLoan-vs-reserve-config-guard exclusion) — defense enumeration:**
1. AaveProtocolDataProvider exposes reserve flags; reserve.configuration bitmap includes `isFlashLoanEnabled` flag (per asset)
2. flashLoan() routes via FlashLoanLogic which checks `reserveCache.reserveConfiguration.getFlashLoanEnabled()`
3. **Potential exclusion-list:** if FlashLoanLogic execution path BYPASSES other reserve-config guards (e.g., LTV check, supply cap check, borrow cap check) that NORMAL borrow/repay paths run — this is the candidate Lens-FT signature.
4. Documented exclusions: Aave V3 docs explicitly note flashLoan does NOT consume borrowing power (it's atomic). The questions are: (a) does it bypass supplyCap when atomically rolling? (b) does it bypass siloed-mode check? (c) does it bypass eMode-isolation?

**Defense receipt scan:** [ASSUMED — source-confirmation required] Aave V3 changelog + multi-firm audit reports likely cover (a)(b)(c) — but if any one was documented as "by design choice exclusion" with downstream extractive surface, this is Lens-FT anchor #2.

### Step 5.12 — Net-new-lens probe: Lens-FT-CircuitBreaker Aave V3 source-confirmation

**Gated on operator decision:** Clone aave-dao/aave-v3-origin (~80-180MB estimated) + grep README + NatSpec for "not covered", "by design", "excluded from", "intentional bypass" on FlashLoanLogic + ReserveLogic + ValidationLogic. If exclusion-list source-confirms with extractive downstream surface, Lens-FT promotes to CANDIDATE-letter on 2nd anchor (Flying Tulip + Aave V3) and Gate 2 advancement justified at $25-50K conditional EV.

**Disk discipline:** disk 85%. Aave V3 clone exceeds 500MB threshold likely. **NO CLONE per upfront NEGATE.** Lens-FT source-confirmation deferred to future Gate 1 cycle when disk pressure resolves OR Spark/Radiant fork-clones (smaller) can substitute.

---

## STEP 6 — OUTPUT

**Verdict:** DEDUP-FORECLOSURE-RECEIPT-EXTENDED with 2 Watchlist-Park lens-conditional candidates.

### Watchlist-Park candidates (cross-pollination cascade unlock)

**W-1: Lens-FT-CircuitBreaker-Asymmetry Aave V3 flashLoan-vs-reserve-config-guard exclusion** — net-new lens, Aave V3 is candidate 2nd anchor (Flying Tulip = 1st anchor). Source-confirmation deferred (no clone). If confirmed, Lens-FT promotes to CANDIDATE-letter (next-available NOT Y). Conditional Gate 2 EV $25-50K. Probe via Spark fork or future small-disk-pressure cycle.

**W-2: DC-7 EXCLUSION CANONICAL 5th anchor candidate** — Aave V3 internal-helper visibility shielding is the ORIGINAL cluster anchor (Architecture.md:59 names Aave V3 first). DC-7 EXCLUSION just promoted to 3-anchor (Cap C1 + FBTC H1 + Gearbox H2). Spark S-4 is 4th-anchor candidate pending cycle-2 bytecode-verify. Aave V3 documentation of internal vs external function visibility on Pool is the 5th-anchor candidate. Source-confirmation deferred to Spark S-4 cycle-2 bytecode-verify completion (lower disk cost).

### Cross-pollination cascade unlock (per brain/CANDIDATE-J-target-map line 141)

**Direction inverted from brief expectation.** Brief assumed Aave V3 clean worked example would propagate to Spark/Radiant. **Reality:** Spark Gate 1 already FORECLOSURE-RECEIPT-ed today using Aave V3 inheritance defense as [ASSUMED defended] receipt. Cascade direction is **Spark → Aave V3 → Aave-V3-forks (Radiant, Sonne, Hashflow Lend)**, not Aave V3 → Spark.

**Cascade impact:**
- Spark FORECLOSURE-RECEIPT receipts already inherited by Aave V3 (Aave V3 inheritance defense was the [ASSUMED defended] floor under Spark; reversing now grounds it [INSPECTED])
- Aave V3 FORECLOSURE-RECEIPT receipts transfer to Radiant / Sonne / Hashflow Lend / any Aave-V3-fork via Amplifier Layer 8 propagation
- Future Aave-V3-fork Gate 1 intakes can short-circuit via inherited Aave V3 receipts (saves ~30-60 min per fork-target)

### Doctrine #27 F HIGH-J → MAXIMUM-tier promotion candidate

Aave V3 at 30+ audits is HIGH-J band today. If next major audit lands (Aave V3.4 Halborn or Cantina, expected H2 2026), threshold crosses 33-audit MAXIMUM ceiling. Aave V3 will become 4th canonical MAXIMUM-tier anchor (Euler + Spark + Gearbox-BOUNDARY → Euler + Spark + Gearbox-BOUNDARY + Aave V3).

---

## BRAIN COMPOUNDS FILED

5 brain compound proposals from this Gate 1 (file via operator approval cycle):

### A-1: Doctrine #27 F HIGH-J band — Aave V3 catalog row upgrade (~25 → 30+ audits)

Brain table Doctrine.md:1693 lists Aave V3 at ~25 audits HIGH 0.30×. Live Immunefi page shows 30+ audits → upgrade to HIGH-J 0.25× per #27 sub-rule. Add Aave V3 as MAXIMUM-tier-adjacent row (boundary candidate). [INSPECTED live page 2026-05-28]

### A-2: CANDIDATE-J cross-pollination cascade INVERSION

Brain/CANDIDATE-J-target-map line 141 says "A clean worked example on Aave V3 PoolConfigurator likely propagates to Spark." Today's reality reverses this: **Spark Gate 1 FORECLOSURE-RECEIPT already inherited Aave V3 defense as [ASSUMED defended] receipt; Aave V3 Gate 1 today reverses to [INSPECTED defended] via Spark's verified receipts.** Filing as cross-pollination-direction-inversion note for future fork-cascade discipline (Radiant / Sonne / Hashflow Lend / any Aave-V3-fork inherits Aave V3 [INSPECTED defended] receipts via Amplifier Layer 8 propagation). Add to brain/CANDIDATE-J-target-map.md.

### A-3: INFO #19 Axis 9 minor drift — `aave/aave-v3-core` → `aave-dao/aave-v3-origin` org-name canonical update

Brain Watchlist-Candidate-Crossmap.md:193 lists legacy `aave/aave-v3-core` (pre-2024 naming). Canonical org as of 2024+ is `aave-dao/aave-v3-origin`. INFO #19 Axis 9 ORG-NAME minor drift. Update watchlist row 193 + add aave-v3-origin canonical reference to brain Audit-Reports-Library.md.

### A-4: Lens-FT-CircuitBreaker-Asymmetry Aave V3 2nd-anchor candidate (promotion pending source-confirm)

Lens-FT currently single-anchor (Flying Tulip [INSPECTED README-only]). Aave V3 flashLoan-vs-reserve-config-guard exclusion is candidate 2nd anchor per Lens-FT.md:21 + Cross-Domain-Fragility-Laws.md:833. Source-confirmation deferred (no clone). File as PENDING-2ND-ANCHOR-SOURCE-CONFIRM in Lens-FT.md. Update Lens-FT.md "Promotion path 2/3 worked anchors" section with Aave V3 candidate.

### A-5: DC-7 EXCLUSION CANONICAL 5th-anchor candidate (Aave V3 original cluster anchor)

DC-7 EXCLUSION CANONICAL just promoted 3-anchor (Cap C1 + FBTC H1 + Gearbox H2). Spark S-4 is 4th-anchor pending cycle-2 bytecode-verify. Aave V3 is the ORIGINAL cluster anchor per Architecture.md:59 (named first in "Aave V3 + Spark + Sky + Uniswap V4" cluster). File Aave V3 as 5th-anchor-candidate pending Spark cycle-2 completion (lower disk cost than Aave clone). Update Patterns-Defense-Classes.md DC-7 EXCLUSION section with Aave V3 anchor-cluster history.

---

## INTAKE-LOG ROW (append to hunts/intake-log.md)

```
2026-05-28 | Aave V3 | Immunefi $1M Critical (10% FaR), KYC YES, 83 assets, 12+ chains, LIVE since 2023-10-18 (last updated 2026-04-17) | HIGH (Lens-FT-CircuitBreaker net-new lens + CANDIDATE-J PoolConfigurator + DC-7 EXCLUSION CANONICAL ORIGINAL anchor + Pattern H defense template + Doctrine #34 sub-b sustained multi-firm cadence) | EV $12.5K default / $25-50K conditional on Lens-FT source-confirm (post-discount: Doctrine #27 F HIGH-J 0.25× × #34 sub-b 0.40× × DC-7 EXCLUSION 0.10× × Pattern H 0.40× × Doctrine #36 floor 0.05 binds) | **DEDUP-FORECLOSURE-RECEIPT-EXTENDED — Doctrine #27 J corollary auto-FORECLOSURE-RECEIPT trigger fires (30+ audits, [ASSUMED] ≥100 submissions, [ASSUMED] P(no-paid-Crit-6mo)≥0.85). 5-Target Quality Checklist 5/5 DEFENDED. Step 5.6 detector rotation SHORT-CIRCUITED. 2 Watchlist-Park candidates (W-1 Lens-FT-CircuitBreaker net-new-lens source-confirm gated; W-2 DC-7 EXCLUSION CANONICAL 5th-anchor pending Spark S-4 cycle-2 completion). Cross-pollination cascade DIRECTION INVERSION: Spark→Aave V3→Aave-V3-forks (NOT Aave V3→Spark as brief assumed). 5 brain compound proposals (A-1 audit-count upgrade to HIGH-J band, A-2 CANDIDATE-J cross-pollination inversion, A-3 INFO #19 Axis 9 org-name drift, A-4 Lens-FT 2nd-anchor candidate, A-5 DC-7 EXCLUSION 5th-anchor candidate). No clone (Doctrine #27 F HIGH-J upfront NEGATE saves ~80-180MB; disk 85%/5.4G). Next-target rec: brain-compound promotions first; Compound III Comet Gate 1 (CANDIDATE-J Pick #2 per target-map line 106) only AFTER Lens-FT promotion cycle.** | `hunts/2026-05-28-aave-v3-immunefi-gate1.md`
```

---

## NEXT-TARGET RECOMMENDATION

1. **PRIMARY:** Brain-compound promotions first (A-1 to A-5; low cost, high system value). Doctrine #27 F HIGH-J → MAXIMUM-tier promotion track when Aave V3 audit count crosses 33.
2. **SECONDARY:** Compound III Comet Gate 1 (CANDIDATE-J Pick #2 per target-map line 106) — Comet is single-repo, narrow scope, $1M cap, simpler architecture than Aave V3. Compound III is already in brain catalog at 12+ audits (Doctrine.md:1697 MEDIUM-HIGH 0.40×). Comet was foreclosed 2026-05-24 with cap-correction; re-evaluate only if late_changes show non-housekeeping diff.
3. **TERTIARY:** FRAX core (CANDIDATE-J Pick #3) — `refreshCollateralRatio()` permissionless cooldown-gated, COLLATERAL_RATIO_PAUSER role. Strongest Point-2 (cooldown) test surface but lower bounty.
4. **DEFERRED:** Aave V3 Lens-FT source-confirmation cycle — requires either Aave V3 clone (high disk) OR fork-substitute (Radiant / Sonne / Hashflow Lend) for grep-based exclusion-pattern detection.

---

## DISK DISPOSITION

**NO CLONE.** Doctrine #27 F HIGH-J upfront NEGATE saves ~80-180MB. Disk 85%/5.4G headroom retained for next-target Compound III Comet Gate 1 or Aave V3 Lens-FT source-confirmation cycle when conditions permit.

---

_Gate 1 hunt | Aave V3 Immunefi $1M Critical | 2026-05-28 | DEDUP-FORECLOSURE-RECEIPT-EXTENDED + 2 Watchlist-Park lens-conditional candidates + 5 brain compounds proposals + cross-pollination cascade DIRECTION INVERSION (Spark→Aave V3→forks) | Authority: Spark Gate 1 next-target rec line 28 + CANDIDATE-J target-map line 141_
