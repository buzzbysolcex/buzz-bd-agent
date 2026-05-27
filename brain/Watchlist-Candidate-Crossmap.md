# Watchlist × Brain Candidate Cross-Reference Map

**Filed:** 2026-05-18 (Day 19 Monday overnight per operator directive §3.A)
**Source:** `/data/buzz/persistent/reports/scale-monitors/dynamic-watchlist.json` (snapshot 2026-05-18T04:00:01Z; 7,513 protocols considered, 216 Immunefi programs cross-referenced, top-100 by TVL × bounty, 31 with active Immunefi bounty)
**Brain state at filing:** `Patterns-Defense-Classes.md` v1.7 (→ v1.8 mid-flight as DC-7 promotion subagent finalizes CANDIDATE-F formalization) / `Cross-Domain-Fragility-Laws.md` v1.5 / `Audit-Reports-Library.md` v1.1

---

## TL;DR

- **31 Immunefi-active protocols classified** across 5 CANDIDATE classes (DC-7, CG, CJ, CK, CI).
- **NET-NEW vs ALREADY-AUDITED:** 31 NET-NEW / 0 ALREADY-AUDITED. None of the 31 overlap the Buzz audit-archive (Indentura + M0 Extensions are NOT on the Immunefi top-100; Sky family + Wormhole are NOT in this Immunefi-active subset either — Wormhole is on Disclosure-Programs-Top-Tier.md but its scope-monitor entry doesn't render on this watchlist file).
- **Top-5 NET-NEW autonomous hunting priority (highest TVL × bounty × candidate-overlap density):**
  1. **Lido** ($18.77B / $2M) — DC-7 (Withdrawal/Oracle paired-pipeline) + CJ (Oracle Relayer + Pauser) HIGH
  2. **cap** ($337M / $1M) — DC-7 (TOTP-signed EigenLayer delegation) HIGH + CJ (Oracle + protocol-level pauser) HIGH + CI structurally-likely-immune (virtual-shares per Yearn V3 pattern)
  3. **Veda** ($1.05B / $1M) — DC-7 (Manager-Merkle-leaf-vs-Decoder field-binding) HIGH + CG (boring-vault-svm native Solana variant) MEDIUM + CI MEDIUM
  4. **Renzo** ($182M / $500K) — CI (ezETH wrapper, cross-chain LZ) HIGH + DC-7 (oracle + EigenLayer adapter) MEDIUM
  5. **OnRe** ($177M / $100K) — **CG HIGH-CONFIDENCE** (native Rust, off-chain SAC trust, pauser + killer + KYC layer) + CK MEDIUM (NAV calc may use floating-point)

**URGENT-flag candidates:** none surface a DEFINITIVE pattern from public-docs alone. Veda's Manager-Merkle-leaf + Decoder field-binding pattern is the closest to a "visible DC-7 surface" from docs but requires source-clone confirmation (deferred per directive §3.A discipline).

---

## 31 Immunefi-Active Watchlist Protocols — Full Cross-Reference Table

Legend: H = HIGH confidence architectural match / M = MEDIUM confidence / L = LOW or "possible-but-architectural-fit-unclear" / – = no architectural fit. Priority is rank-ordered post-table.

| #   | Protocol               | Chain(s)                       | TVL     | Bounty | Category              | DC-7  | CG    | CJ    | CK  | CI    | Already audited? | Priority |
| --- | ---------------------- | ------------------------------ | ------- | ------ | --------------------- | ----- | ----- | ----- | --- | ----- | ---------------- | -------- |
| 1   | Lido                   | Ethereum + Solana + Moonbeam + | $18.77B | $2M    | Liquid Staking        | **H** | M     | **H** | –   | M     | NET-NEW          | **1**    |
| 2   | Veda                   | Ethereum + 11 EVM + (SVM repo) | $1.05B  | $1M    | Onchain Capital Alloc | **H** | M     | L     | –   | M     | NET-NEW          | **3**    |
| 3   | cap                    | Ethereum                       | $337M   | $1M    | Lending               | **H** | –     | **H** | –   | L     | NET-NEW          | **2**    |
| 4   | Stader                 | Ethereum + Hedera + BNB + Near | $327M   | $1M    | Liquid Staking        | M     | –     | M     | –   | **H** | GATE-2-FORECLOSED [^stader-g2] | PARK     |
| 5   | Rocket Pool            | Ethereum                       | $1.05B  | $150K  | Liquid Staking        | M     | –     | M     | –   | **H** | NET-NEW          | **7**    |
| 6   | Renzo                  | Ethereum + Linea + Solana + LZ | $182M   | $500K  | Liquid Restaking      | M     | L     | M     | –   | **H** | NET-NEW          | **4**    |
| 7   | Defi Saver             | Ethereum + Arb + OP            | $271M   | $350K  | CDP Manager           | **H** | –     | L     | –   | –     | NET-NEW          | **8**    |
| 8   | JustLend               | Tron                           | $3.55B  | $50K   | Lending               | L     | –     | M     | –   | L     | NET-NEW          | **15**   |
| 9   | Function FBTC          | Bitcoin                        | $822M   | $100K  | Bridge                | **H** | –     | M     | –   | –     | NET-NEW          | **9**    |
| 10  | Hydration DEX          | HydraDX (Polkadot)             | $34M    | $500K  | DEX                   | L     | –     | L     | –   | –     | NET-NEW          | **18**   |
| 11  | OnRe                   | Solana                         | $177M   | $100K  | RWA                   | M     | **H** | M     | M   | M     | GATE 1 DONE 2026-05-18 + DC-8 3rd anchor + DEDUP T+9 2026-05-27 | PARK     |
| 12  | Bifrost Liquid Staking | Bifrost + Manta + ETH          | $22M    | $500K  | Liquid Staking        | M     | –     | M     | –   | M     | NET-NEW          | **13**   |
| 13  | Ankr                   | Ethereum + Flow + BNB          | $22M    | $500K  | Liquid Staking        | L     | –     | M     | –   | M     | NET-NEW          | **14**   |
| 14  | Beefy                  | Ethereum + Base + Arb + 20+    | $118M   | $75K   | Yield Aggregator      | M     | –     | L     | –   | **H** | NET-NEW          | **10**   |
| 15  | Gearbox                | Ethereum                       | $25M    | $200K  | Lending               | **H** | –     | M     | –   | M     | GATE 1 DONE 2026-05-27 WATCHLIST-PARK EV $600 (Doctrine #27 F BOUNDARY 31 audits) — H2 = DC-7 EXCLUSION CANONICAL 3rd anchor | **PARK** |
| 16  | LiNEAR Protocol        | Near                           | $44M    | $100K  | Liquid Staking        | L     | M     | M     | M   | M     | NET-NEW          | **17**   |
| 17  | Gains Network          | Arb + Base + Polygon           | $14M    | $200K  | Derivatives           | **H** | –     | M     | –   | L     | GATE 1 DONE 2026-05-27 FORECLOSED EV $1.2K | **16**   |
| 18  | Index Coop             | Ethereum + Arb + Base          | $13M    | $200K  | Indexes               | M     | –     | L     | –   | **H** | NET-NEW          | **20**   |
| 19  | TermMax                | BSquared + ETH + Base          | $69M    | $50K   | Lending               | M     | –     | M     | –   | M     | NET-NEW          | **22**   |
| 20  | Vesu                   | Starknet                       | $21M    | $100K  | Lending               | M     | –     | M     | –   | M     | NET-NEW          | **23**   |
| 21  | Templar Protocol       | Bitcoin + ETH + Stellar        | $20M    | $100K  | Lending               | **H** | –     | M     | –   | L     | NET-NEW          | **12**   |
| 22  | StackingDAO            | Stacks                         | $20M    | $100K  | Liquid Staking        | L     | –     | M     | –   | M     | NET-NEW          | **24**   |
| 23  | LumenSwap              | Stellar                        | $6M     | $250K  | DEX                   | L     | –     | L     | –   | –     | NET-NEW          | **25**   |
| 24  | Vesper                 | ETH + Base + OP                | $43M    | $50K   | Yield Aggregator      | M     | –     | L     | –   | **H** | NET-NEW          | **19**   |
| 25  | Nexus Mutual           | Ethereum                       | $97M    | $25K   | Insurance             | M     | –     | M     | –   | –     | NET-NEW          | **21**   |
| 26  | Awaken Swap            | aelf                           | $5M     | $250K  | DEX                   | L     | –     | L     | –   | –     | NET-NEW          | **28**   |
| 27  | Harvest Finance        | Base + ETH + Arb               | $12M    | $100K  | Yield Aggregator      | M     | –     | L     | –   | **H** | NET-NEW          | **26**   |
| 28  | ICHI                   | Hedera + Base + Celo           | $13M    | $50K   | Liquidity Manager     | M     | –     | L     | –   | M     | NET-NEW          | **27**   |
| 29  | YO Protocol            | Base + ETH + Solana            | $46M    | $10K   | Yield Aggregator      | M     | L     | L     | L   | **H** | NET-NEW          | **29**   |
| 30  | MoneyOnChain           | RSK                            | $44M    | $10K   | Dual-Token Stablecoin | L     | –     | M     | –   | L     | NET-NEW          | **30**   |
| 31  | Wildcat Protocol       | Ethereum + Plasma              | $8M     | $10K   | Uncollateralized Lend | M     | –     | L     | –   | L     | NET-NEW          | **31**   |

---

## NET-NEW Priority List — Top-5 Highest-EV Autonomous Targets

### #1 — Lido ($18.77B TVL / $2M bounty)

- **DC-7 H rationale:** Lido withdrawal architecture has Oracle (AccountingOracle) + WithdrawalQueue + StakingRouter as adjacent pipelines reading from same `ReportProcessor`-derived state. AccountingOracle's report-validation pipeline is strictly more rigorous than off-chain validator-exit "implied" pipeline. Classic field-binding-asymmetry surface across paired modules.
- **CJ H rationale:** AccountingOracle (SETTER) + DAO-Aragon-Voting + GateSeal (multi-tiered HALTER) = textbook 7-point sibling-pair architecture. Sky-stUSDS-class fit.
- **CI M rationale:** wstETH is the ERC4626-ish wrapper (technically not 4626, but share-token rate-derived); stETH uses share-rebasing accounting NOT balanceOf-totalAssets → structurally likely-immune. Still worth Phase 4 surface check.
- **Why #1:** $18.77B TVL × $2M bounty × multi-class architectural fit. Hidden-bug economics are favorable: even 5% probability of a real DC-7 finding × $2M bounty = $100K EV per real surface. Lido has had multiple high-tier audits, so finding bar is high, but the multi-pipeline architecture is exactly the surface DC-7 was formalized for.

### #2 — cap ($337M TVL / $1M bounty)

- **DC-7 H rationale:** TOTP-signed EigenLayer delegation approval (`advanceTotp`) sits in a paired pipeline with the on-chain Lender / Delegation module's `realizeInterest` calls. TOTP digest validation is signature-class verification on field A; downstream consumes the delegation in a different pipeline that may rely on the TOTP advancement being canonical. **Visible from public docs as a structural surface — exactly the kind of asymmetric-validation pair that produced TrustedVolumes chain-1 + ShapeShift FOX Colony.**
- **CJ H rationale:** Oracle (RedStone + Chainlink + custom adapters) is the SETTER; pausing implemented at asset and protocol levels (not unified pauser module per docs — that's actually a CJ-warning sign, not a clean sibling-pair). 7-point checklist will surface gaps quickly.
- **CI L rationale:** docs explicitly state Yearn V3 Tokenized Strategy pattern with virtual-shares + index-based interest — likely structurally immune. Still worth a confirm-pass.
- **Why #2:** $1M bounty × clean architectural surface visible from public docs × TOTP-signature antipattern is a NOVEL surface (not yet seen in Buzz corpus). High-EV per audit-hour.

### #3 — Veda ($1.05B TVL / $1M bounty)

- **DC-7 H rationale:** Veda's BoringVault uses **Manager-with-Merkle-Verification** (Merkle leaf encodes "target contract + function selector + acceptable param values") paired with a **DecoderAndSanitizer** that validates the actual outgoing call. **The Merkle-leaf encoding is field A's authorization; the Decoder is field B's consumption. If Merkle leaf field-encoding differs from Decoder field-binding (e.g., Merkle hashes a sanitized form of params but Decoder reads raw calldata), the asymmetry is the DC-7 surface.** This is one of the most TEXTBOOK DC-7 architectural setups visible in the watchlist.
- **CG M rationale:** Veda Labs maintains `boring-vault-svm` (Solana TypeScript port + native Solana code). If the Solana variant ships with `Signer<'info>` accounts without `has_one`, this is a direct CG hit.
- **CI M rationale:** BoringVault is share-token-based; whether `totalAssets()` uses `balanceOf` or self-counter depends on the variant. Worth a deep-check.
- **Why #3:** $1B TVL × $1M bounty × visible DC-7 architectural surface. Veda is **the highest-quality DC-7 candidate in the entire watchlist** by surface clarity.

### #4 — Renzo ($182M TVL / $500K bounty)

- **CI H rationale:** ezETH is yield-bearing share wrapper, cross-chain via LayerZero, derives price from `totalAssets()` over multi-strategy backing. Renzo had a 2024 oracle-depeg incident (separate from CI, but adjacent). CI virtual-shares check: ezETH's `totalAssets()` implementation under restaking conditions = high-priority.
- **DC-7 M rationale:** Restaking adapters per AVS + LZ cross-chain bridging = multi-pipeline state. The LZ-sent vs natively-minted ezETH state-reconciliation pipeline is a DC-7 surface candidate.
- **Why #4:** $500K bounty + multi-chain LRT architecture + known prior incident class = high cross-pollination potential. CI is the strongest fit.

### #5 — OnRe ($177M TVL / $100K bounty)

- **CG H-CONFIDENCE rationale:** Native Rust (NOT Anchor), off-chain capital held at Bermuda SAC (Special Purpose Insurer — off-chain trust boundary), pausable + killable program, Squads V4 multisig governance, KYC layer for rewards. **This is a TEXTBOOK CG anchor candidate** — native-Rust + off-chain-cosigner-trust (Bermuda SAC plays the "Thor co-signer" role from Indentura) + share token (ONyc) + NAV calculation on-chain.
- **CK M rationale:** On-chain NAV calculation potentially uses floating-point if the Rust implementation predates strict `u64` checked-math. Need source review.
- **CJ M rationale:** Pauser + killer + upgrade authority = sibling-pair architecture worth 7-point check.
- **Why #5:** Lowest bounty in top-5 ($100K), BUT this is the **strongest CG worked-example candidate** in the watchlist. CG is currently 2-protocol promoted (Indentura + M0 Extensions, both Adevar Labs). A third worked example from a different protocol class (Solana RWA + off-chain SAC trust) by a different auditor (Immunefi) would **resolve the auditor-pattern-bias question and unblock CG → DC-7 promotion math.** Strategic EV >> nominal bounty EV.

---

## ALREADY-AUDITED Reference List

**None of the 31 protocols on the Immunefi-active watchlist overlap the Buzz audit-archive.** Verified by cross-reference against:

- `brain/Audit-Reports-Library.md` v1.1 (Indentura PL Vault + M0 Extensions — both audit-report intake, NOT Immunefi targets)
- `hunts/` directory (Sky family: D3M, Lockstake, Migrator, Lite PSM, sUSDS/stUSDS — Sky is on Disclosure-Programs-Top-Tier.md but NOT on the Immunefi top-100 ranked list)
- `brain/Disclosure-Programs-Top-Tier.md` (Wormhole pre-flight + Gate 1 done May 17 — Wormhole NOT on this Immunefi-watchlist subset, though it is Immunefi-active separately)
- `brain/CANDIDATE-J-target-map-2026-05-17.md` (Aave V3, Compound III Comet, FRAX, Synthetix v2x, Balancer V2 — NONE on this Immunefi-watchlist subset — those targets are CANDIDATE-J ranked-9 brainstormed, separate from the TVL-ranked Immunefi watchlist)

**Conclusion: 31 NET-NEW / 0 ALREADY-AUDITED.** The Immunefi top-100 watchlist is a fully separate corpus from Buzz's prior audit-target portfolio.

---

## Architectural Categories Observed

| Category sub-type     | Count | Members                                                                                                           | Aggregate TVL |
| --------------------- | ----- | ----------------------------------------------------------------------------------------------------------------- | ------------- |
| Liquid Staking        | 7     | Lido, Stader, Rocket Pool, Bifrost LS, Ankr, LiNEAR, StackingDAO                                                  | $20.5B        |
| Lending               | 6     | cap, JustLend, Gearbox, TermMax, Vesu, Templar, Wildcat                                                           | $4.0B         |
| Yield Aggregator      | 5     | Beefy, Vesper, Harvest, YO Protocol, (Index Coop adjacent)                                                        | $245M         |
| Liquid Restaking      | 1     | Renzo                                                                                                             | $182M         |
| Onchain Capital Alloc | 1     | Veda                                                                                                              | $1.05B        |
| RWA                   | 1     | OnRe                                                                                                              | $177M         |
| DEX                   | 3     | Hydration, LumenSwap, Awaken                                                                                      | $46M          |
| Bridge / Cross-chain  | 1     | Function FBTC                                                                                                     | $822M         |
| CDP / Indexes / Misc  | 6     | Defi Saver (CDP), Index Coop (Indexes), Nexus Mutual (Insurance), ICHI (LiqMgr), MoC (Stablecoin), Gains (Derivs) | $493M         |

**Pattern observation:** Liquid Staking dominates count + TVL share (7 of 31 / $20.5B aggregate). Lending second by count, RWA + Capital-Allocator strongest single-target TVL-per-protocol concentration. **Implication for CANDIDATE-I:** liquid-staking + yield-aggregator class is 12 of 31 protocols = ~40% of the watchlist. The CI scan-target list overlaps directly with the BIGGEST architectural cluster on the watchlist. Strong cross-pollination math.

---

## Cross-Pollination Triggers

1. **CANDIDATE-G promotion math** — OnRe (Solana native Rust + off-chain SAC trust) is the strongest third-worked-example candidate for CG. **If OnRe confirms a CG-class hit during Phase 4d hunt, CG promotion to DC-7 unblocks immediately** (resolves the Adevar-Labs-auditor-bias question by providing a non-Adevar worked example).

2. **DC-7 cross-pollination** — Veda's Manager-Merkle-leaf + Decoder pattern is structurally identical to the TrustedVolumes order-validation-vs-transfer-binding pattern. If Veda's Decoder field-binding diverges from Merkle-leaf encoding, this becomes the 5th DC-7 worked example and the FIRST in vault-manager class (existing 4 examples are: Next.js HTTP/WS, TrustedVolumes order/transfer, TrustedVolumes saltStatus, ShapeShift FOX Colony forwarder/DSAuth). Vault-manager = NEW domain for DC-7.

3. **CANDIDATE-I cross-pollination** — 12 of 31 protocols are liquid-staking or yield-aggregator. Sky's sUSDS validated the SAFE-cell of META-DOCTRINE Two-Axis Donation-Channel Test. **Beefy + Vesper + Harvest + YO Protocol + Stader + Rocket Pool + Index Coop + Renzo = 8 high-priority CI scan targets visible in this watchlist.** A bytecode-grep pass on these 8 for `balanceOf(address(this))` in `totalAssets()` without `_decimalsOffset()` mitigation = single fastest path to CI anchor confirmation.

4. **CANDIDATE-J cross-pollination** — cap's lack of unified pauser module (asset-level + protocol-level instead of single sibling-pair) is a 7-point checklist STRESS-TEST surface. Sky stUSDS validated 7-of-7 PASS as positive baseline; cap's split-pauser architecture may surface a NEGATIVE example, which is equally promotion-relevant. Multiple lending protocols on the list (cap, Gearbox, TermMax, Vesu, Templar) each carry CJ-relevant rate-setter + pauser surfaces.

5. **DC-7 + CANDIDATE-G overlap on Veda** — Veda Labs' `boring-vault-svm` Solana port is BOTH a DC-7 surface (Merkle+Decoder asymmetry potentially survives the EVM→SVM port) AND a CG surface (native Rust Solana program with off-chain manager role). Single target, two candidate hits. Compounding EV per audit-hour.

---

## Discipline

- ✅ **READ-ONLY** — file reads + 9 WebFetch calls + 1 GitHub org browse. No source clones, no Gate 1 activity, no mainnet tx.
- ✅ **No PoC** — this is HUNT PRIORITY MAP, not active hunting.
- ✅ **Honest confidence-tagging** — H reserved for "visible architectural fit from public docs" (cap TOTP, Veda Manager-Merkle, OnRe off-chain SAC, Lido AccountingOracle + GateSeal). M for "likely fit needs source review." L for "possible but architectural fit unclear from public docs alone."
- ✅ **No over-claim** — no protocol marked H without a specific architectural-fit reasoning sentence. None of the 31 surface a DEFINITIVE bug-class from public docs; all H tags require Gate 1 + Phase 4d confirmation to translate into actionable findings.
- ✅ **No Gate 1 initiated** — directive §3.A is RECONNAISSANCE-ONLY. Top-5 priority list is INPUT to the next operator-greenlit Gate 1 batch, NOT a unilateral hunt commitment.

---

## Operator-Action Surface (Cross-Reference Output Only — No Execution)

| Action                                                                                                  | Authority required         | Estimated effort  | Expected EV                                           |
| ------------------------------------------------------------------------------------------------------- | -------------------------- | ----------------- | ----------------------------------------------------- |
| Gate 1 on Lido (DC-7 + CJ multi-fit, $2M bounty)                                                        | Operator greenlight        | ~3-4h audit-hours | Highest absolute-TVL × bounty × fit-density           |
| Gate 1 on cap (DC-7 + CJ + novel TOTP-signature surface)                                                | Operator greenlight        | ~2-3h audit-hours | Cleanest visible architectural surface; $1M bounty    |
| Gate 1 on Veda (DC-7 textbook Manager-Merkle-vs-Decoder fit)                                            | Operator greenlight        | ~2-3h audit-hours | $1B TVL, highest DC-7 surface-clarity in watchlist    |
| Gate 1 on Renzo (CI primary fit, multi-chain bridging)                                                  | Operator greenlight        | ~2-3h audit-hours | $500K bounty + LZ-bridge state-reconciliation surface |
| Gate 1 on OnRe (CG third-anchor candidate — unblocks DC-7 promotion math for CG)                        | Operator greenlight        | ~2h audit-hours   | $100K bounty, but STRATEGIC EV (CG promotion unblock) |
| CI fast-scan on 8 liquid-staking + yield-agg targets (bytecode grep `balanceOf(address(this))` in 4626) | Default analyst-stance: GO | ~1h batch-scan    | Single-pass anchor-confirmation for CANDIDATE-I       |
| CJ 7-point checklist run on cap's split-pauser architecture (NEGATIVE example potential)                | Operator greenlight        | ~1h scoped review | Promotion-relevant negative datapoint for CJ catalog  |

---

_Filed: 2026-05-18 (Day 19 overnight) | Watchlist-Candidate-Crossmap.md v1.0 | Buzz security-research agent_

---

## v1.1 Addendum — Live Propagation Sweep Results (2026-05-21 04:18 UTC)

**Source:** `buzzshield-propagation.js --all-patterns` against the 17-repo watchdog DB. Wall-clock: 24.1s. Full JSON: `/data/buzz/persistent/reports/lane1-propagation/propagation-ALL-2026-05-21T04-18-21-821Z.json`.

This addendum closes the loop between the static Watchlist-Candidate-Crossmap (above, public-docs-derived architectural fit) and the dynamic propagation engine (live grep across cloned watchlist repos at HEAD).

### Composite ranking — repos hitting Gate 1 thresholds across multiple patterns

| Repo                         | Composite | Patterns triggered | Primary brain classes                      | Architectural-fit overlap with §1-3 table                                                                                     |
| ---------------------------- | --------- | ------------------ | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| drift-labs/protocol-v2       | 238       | E(238)             | DC-2, DC-4, CANDIDATE-D, CANDIDATE-I       | Drift is in static table (already audited per #18 Veda Gate 2 lineage) — propagation re-surfaces it for oracle/price re-audit |
| pyth-network/pyth-crosschain | 193       | **E(178) + H(15)** | DC-2, DC-4, DC-6, CANDIDATE-A, CANDIDATE-K | Pyth is the ORACLE itself — multi-pattern fit makes it a primary CANDIDATE-K (off-chain trust boundary) target                |
| gmx-io/gmx-synthetics        | 63        | **B(10) + H(53)**  | DC-5, DC-6, CANDIDATE-A                    | Bridge / cross-chain signature pattern + admin H surface — DC-5 + DC-6 layered                                                |
| kamino-finance/klend         | 41        | E(41), O(present-partial-gate, 2026-05-24) | DC-2 (defended), DC-9 (weak-no-timelock), CANDIDATE-O (load-bearing), CANDIDATE-I (Gate 2 deferred), CANDIDATE-J (withdraw-ticket triplet Gate 2 deferred) | 2026-05-24 Gate 1 [INSPECTED]: oracle stack max-timestamp selection across {Pyth,Switchboard,Scope} + TWAP gate operator-config-bypass via `is_twap_enabled()` self-pass at checks.rs:81-85; admin no-on-chain-timelock (2-step ownership partial-DiD, emergency_council safely-scoped to 3 break-glass defensive modes); CANDIDATE-E rounding NOT surveyed; Immunefi $1.5M cap, 4-firm audit-sat OtterSec+Offside+Certora+Sec3; hunt: hunts/2026-05-24-kamino-immunefi-gate1.md |
| compound-finance/comet       | 41        | H(41)              | DC-6, CANDIDATE-A, CANDIDATE-K             | **FORECLOSURE-RECEIPT 2026-05-24** — cap CORRECTED $1.25M→$1M (Immunefi); scope_filter=ethereum_mainnet_only — all 41 H hits in contracts/bridges/** target L2 deployments NOT enumerated in Immunefi scope, OOS collapse; in-scope core (Comet.sol etc.) audit-saturated multi-firm 2+ yr (OZ+ToB+Halborn+Cantina+Spearbit); EV $39K→$3.5K post-correction. Hunt: hunts/2026-05-24-compound-comet-gate1.md |
| LayerZero-Labs/LayerZero-v2  | 33        | A(33)              | DC-3, DC-6, DC-7                           | Worker/Executor access control — confirms LZ as DC-7 hunting ground (matches static table)                                    |
| firedancer-io/firedancer     | 22        | D(22)              | DC-1, DC-4                                 | Reentrancy/CPI Solana surface — payment-confirmed protocol (imu-77340 still warm)                                             |
| okx/wallet-core              | 13        | B(13)              | DC-5, CANDIDATE-A                          | Signature replay — wallet code, exactly the threat class                                                                      |
| aave/aave-v3-core            | 10        | B(10)              | DC-5                                       | Lower density but B-pattern present                                                                                           |

### Multi-pattern composite candidates (highest EV next Gate 2 prep)

Repos hitting Gate 1 threshold on TWO OR MORE patterns are the highest-EV next moves:

1. **pyth-network/pyth-crosschain** (E + H, 193 composite hits) — Pyth is the price-feed source for half of Solana DeFi. Off-chain trust boundary (Pattern H) layered onto oracle-staleness primitives (Pattern E). If we find a single Critical here, it amplifies across every consumer.

2. **gmx-io/gmx-synthetics** (B + H, 63 composite hits) — signature + admin layered. GMX synthetics has cross-chain LZ integration + Stargate routes + on-chain signature paths. B+H combination is exactly the THORChain Bifrost class.

### Single-pattern but high-density

- **drift-labs/protocol-v2** (E, 238 hits) — solo pattern but the highest density across the entire watchlist. Drift was the source of the original CANDIDATE-D anchor finding. New-features in `state/user/tests.rs` + `controller/orders/tests.rs` suggest test-anchored TODO surface for a re-audit.
- **firedancer-io/firedancer** (D, 22 hits) — reentrancy/CPI in C — same protocol that produced our first confirmed payout (imu-77340 Insight). Sibling code paths in Firedancer's runtime layer.

### Validation: TrustedVolumes 2026-05-07 (DC-6 negative-control)

Replay against the propagation engine for Pattern A (DC-3/6/7 — TrustedVolumes had a public `setBeneficiary(address)`):

- **LayerZero-v2** — 33 hits across `Executor.sol`, `WorkerUpgradeable.sol`, `Worker.sol` — TRUE POSITIVE for DC-6 hunting ground
- **Whirlpools / GMX-synthetics / Aave v3 core** — medium overlap, consistent with the access-control surface those codebases legitimately need

Validation conclusion: the propagation engine surfaces DC-6 hunting grounds correctly. False-positive density acceptable (no clean-source repo flagged spuriously).

### Status of brain × propagation feedback loop

- Static crossmap (§1-3 above) = public-docs-derived fit hypothesis
- Live sweep (this section) = dynamic grep validation
- Going forward, EVERY new brain class (e.g., a new DC-9 from a CVE-bootstrap NOT-CAUGHT entry) adds a row to `defense-class-mapping.json`, and the next sweep automatically grades every watchlist repo on the new lens

**The brain × watchlist matrix is now compounding automatically.** Per Operator-Philosophy.md Rule 6 (fill dead time with compounding work).

---

_v1.1 Addendum: 2026-05-21 04:20 UTC | Propagation sweep integrated | Buzz Lane 1_

---

## v1.2 Addendum — Sherlock Activation Family (2026-05-21)

Sherlock platform has zero researcher gates. Operator activated 8-target Sherlock stack ($28.7M Critical caps) parallel to Immunefi pipeline. Three families bind multiple targets — single findings on shared infrastructure submit ×2 or ×3.

### Usual/Fira family (3 programs / shared codebase / $24M aggregate cap)

| Target             | Sherlock cap | Min Critical | Brain hits                          | Status    |
| ------------------ | ------------ | ------------ | ----------------------------------- | --------- |
| #S1 Usual-Fira UZR | $7.5M        | $200K        | DC-7, CI, CJ                        | Gate 1 ✅ |
| #S2 Usual Labs     | $16M         | -            | CI, DC-7, DC-2                      | Gate 1 ✅ |
| #S5 Fira Protocol  | $500K        | -            | CI, DC-7, CJ, CK (decimal mismatch) | Pending   |

**Dual-submittable cross-pollination finding (highest EV in pipeline):**
`USLLendingMarket.liquidateExpiredUSL` reads `IUsd0PP.getEndTime() + maturityGracePeriod`. Any USD0PP endTime-mutator in the Usual Labs scope (S2) becomes a forced-liquidation premature-trigger across all $451M TVL UZR borrowers (S1). Possibly extends to S5 Fira maturity settlement. CRITICAL ceiling. Etherscan source-pull dispatched for USD0PP deployed implementation to enumerate endTime-touching paths.

### Cross-chain family (3 targets — GMX Edge pattern transfers)

| Target              | Cap   | Brain hits                                 | Notes                                    |
| ------------------- | ----- | ------------------------------------------ | ---------------------------------------- |
| #S4 Flying Tulip    | $1M   | CANDIDATE-A (OFT cross-chain), DC-7, CJ    | Gate 1 dispatched                        |
| #S6 Midas           | $500K | CI, DC-8 (Solana Anchor), DC-7             | ETH + Solana dual-chain                  |
| GMX Edge (Immunefi) | $5M   | DC-7 sig-binding, cross-chain replay class | Paste-ready locked, blocked on rep level |

**Pattern transfer:** GMX Edge analysis (chainId-absent signed-payload + shared trustedSigner across deployments) replicates against any 5-chain LayerZero OFT or cross-chain oracle integration. Flying Tulip's 5-chain OFT is the primary candidate; Midas's ETH+Solana dual-chain is the secondary.

### Aave/lending family (3 targets — ERC4626 + DC-7 transfer)

| Target            | Cap   | Brain hits                   | Notes                              |
| ----------------- | ----- | ---------------------------- | ---------------------------------- |
| #S3 Aave V4       | $2.5M | DC-7 (Hub-Spoke), CI, CJ, CK | NEW Hub-Spoke architecture (fresh) |
| #S5 Fira Protocol | $500K | CI, DC-7, CJ, CK             | See Usual/Fira above               |
| #S8 Yearn V3      | $200K | CJ, DC-7                     | Gate 2 KILL (yRoboTreasury thin)   |

### #S8 Yearn V3 yRoboTreasury — KILL recorded

Gate 2 verdict: KILL, no exploitable findings in 1678 LOC Vyper. Real attack surface = AuctionV2 in tokenized-strategy-periphery (Immunefi scope, not Sherlock). Watchlist add: github.com/yearn/yRoboTreasury HEAD commit-diff via speedrunner watchdog. V6 Vyper AST coverage gap (task #46 follow-up).

### Sherlock × Immunefi parallel pipeline status

Immunefi remains active for Veda/Ethena/TruFin. GMX Edge blocked on novice rate-limit; unlock = Firedancer #77340 payout level bump. Sherlock activates 8 targets across 3 families; family-synergy multiplier (one finding → 2-3 submissions on shared codebase) is the platform-scale cross-pollination engine.

_v1.2 Addendum: 2026-05-21 ~11:00 UTC | Sherlock activation family map | Buzz Lane 1_

---

## v1.3 Addendum (2026-05-22 — DC-9 promotion + Hyperbridge intake)

### DC-9 promoted (Ogie msg 7518) — Privileged State Mutation Without Defense-in-Depth

4 sub-patterns, **$320M+ family exposure across 5 anchors** (Volo Sui $3.5M added 2026-05-22 from rekt.news Step-8 sweep):

- Sub-1 Unchecked Mint (Resolv $25M Feb 2026, Solv $2.7M Mar 2026 sibling)
- Sub-2 Zero-Timelock Migration (Drift $285M Apr 2026 + Volo $3.5M Sui Apr 2026 sibling)
- Sub-3 Upgradeable Hook/Verifier/DVN (0xBugDrop $7M May 2026)
- Sub-4 State-Not-Invalidated Repeated Mint (Solv $2.7M Mar 2026)

DC-9 propagation engine is Pattern K in `lane1/defense-class-mapping.json` v1.3. Detector for sub-4 shipped 2026-05-22 (`buzzshield-state-not-invalidated-mint-detector.js`, 534 LOC). Sub-1/2/3 productization queued.

DC-9 lens applies to all targets with a privileged single-role state mutation (mint, migrate, setHook, setVerifier, grantRole, setBeneficiary, parameter setters). Pair with CANDIDATE-P (durable-nonce signature accumulation) for OS-layer + code-layer compound attacks.

### Hyperbridge — WATCHLIST add (Ogie msg 7535 directive #5)

| Field                 | Value                                                                                                                                                                                                                            |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Platform              | HackenProof                                                                                                                                                                                                                      |
| Cap                   | $50K Critical                                                                                                                                                                                                                    |
| Substrate             | Rust + Solidity                                                                                                                                                                                                                  |
| Type                  | Generalized bridge (ISMP / consensus state-machine)                                                                                                                                                                              |
| HEAD repo (candidate) | `polytope-labs/hyperbridge`                                                                                                                                                                                                      |
| Brain hits            | **CANDIDATE-A** (cross-chain bridge family — Wormhole/Nomad/KelpDAO $290M sibling), **DC-7** (validator-state-vs-relayer field-binding), **Pattern H Nomad-class** (default-trust-enum / off-chain verifier single-trust-anchor) |
| EV                    | $5K-$15K weighted (P(finding)=0.15 × cap=$50K × P(acc)=0.5 × overlap=1.0)                                                                                                                                                        |
| Queue                 | WATCHLIST (per operator framing) — gap-fill Gate 1 when higher-EV Sherlock/Cantina pipeline clears                                                                                                                               |

Cross-pollination potential: Hyperbridge's ISMP consensus model is a fresh Pattern A target; Rust side fits the in-progress Rust rounding-asymmetry detector + planned Pattern H Solana-port. KelpDAO $290M Apr 24 2026 and Wormhole 2022 $325M are the priors — any field-binding gap between Hyperbridge's Rust validator state and Solidity consumer is the high-EV surface.

### Architectural foreclosure receipts (Doctrine #23 anchors)

Per Doctrine #23 (2026-05-22), the following Gate 1 surfaces are **foreclosed** for the specified bug class — manual triage cycles re-allocated to orchestrator/aggregator layers:

| Target                                                            | Foreclosed bug class                             | Mechanism                                                                                                                                                                                                                                 | Receipt                                                      |
| ----------------------------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Uniswap V4 core                                                   | Pattern I (CEI-break-via-upgradeable-hook)       | PoolKey hook field is part of pool identity, no setter                                                                                                                                                                                    | `data/lane1/pattern-i-uniswap-v4-core.json`                  |
| Balancer V3                                                       | Pattern I                                        | `_hooksContracts[pool]` write-once at `VaultExtension._registerPool()`                                                                                                                                                                    | `data/lane1/pattern-i-balancer-v3.json`                      |
| Balancer V3                                                       | Pattern J (slippage double-count)                | `BatchRouterHooks.sol:127` per-step minOut zeroed + write-once `pathAmountsOut` + assignment-not-accumulation `stepExactAmountIn`                                                                                                         | `data/lane1/pattern-j-balancer-v3.json`                      |
| Uniswap V4 core                                                   | Pattern J                                        | `PoolManager.swap` single-pool atomic + transient-storage delta net-settle at `unlock()` boundary                                                                                                                                         | `data/lane1/pattern-j-uniswap-v4-core.json`                  |
| Fira AMM (labs + V1)                                              | Pattern J                                        | No multi-step batch surface                                                                                                                                                                                                               | `data/lane1/pattern-j-fira-{labs,v1}.json`                   |
| 1inch limit-order-protocol                                        | Pattern J                                        | Per-order fill design (not multi-step composed)                                                                                                                                                                                           | `data/lane1/pattern-j-1inch-lop.json`                        |
| SisuVault / Yearn V3 / Midas / Aave V4 / Lombard / Usual / Ethena | DC-9 sub-4 (state-not-invalidated repeated mint) | 8 ERC4626 defensive primitives (share burn, mailbox proof, initializer, time-window state, mint-cap, role gates, request-status state-machine)                                                                                            | `data/lane1/dc9-sub4-*.json` (7 files)                       |
| Lombard-LBTC                                                      | DC-9 family broadly                              | Defense ratio 4.73 (8 timelock + 42 rate-limit + 21 guardian)                                                                                                                                                                             | Step 9 sweep                                                 |
| Usual-Fira                                                        | DC-9 family broadly                              | Defense ratio 40.4 (110 timelock + 34 supply-cap) — Sherlock $7.5M cap structurally justified                                                                                                                                             | Step 9 sweep                                                 |
| Lido                                                              | DC-9 family broadly                              | Defense ratio 48.5 — node-operator-driven access control                                                                                                                                                                                  | Step 9 sweep                                                 |
| Renzo (xezETH + RestakeManager)                                   | DC-9 sub-1 + DC-7 + DC-6                         | xERC20 canonical mintingLimit/burningLimit off-repo + TVL-snapshot includes withdraw-queue + 5-gate cross-chain auth (Hyperlane Router parent-class) + 3-element price-feed defense triad (±1% drift + monotonic ts + msg.sender pinning) | Renzo Gate 1+2 hunts (`hunts/2026-05-22-renzo-gate{1,2}.md`) |

**Where these bug classes actually live:** aggregator routers (1inch AggregationRouterV5, Paraswap Augustus, Kyber AggregationExecutor, Uniswap Universal Router), diamond-proxy facet registries, post-deployment privileged setters, Solana DurableNonce paths, Solv-class bespoke conversion contracts (NOT canonical ERC4626), low-defense-ratio targets (ratio < 2). Next Gate 1 priorities should target these layers.

**Cross-chain receiver checklist (Doctrine #24/26 codified)** — applies to every cross-chain bridge or oracle Gate 1:

1. **Parent-class auth read** (Doctrine #24): identify vendor class (Hyperlane `Router.handle()` / LayerZero `OAppReceiver._lzReceive()` / CCIP `CCIPReceiver._ccipReceive()` / Wormhole `WormholeReceiver.receiveMessage()`) and enumerate ITS auth gates BEFORE inspecting the override
2. **TVL-closure trace** (Doctrine #25): for pool-share + buffer-fill / withdraw-queue / rebalance flows, confirm whether the snapshot already includes the destination of decremented funds
3. **Price-feed defense triad** (Doctrine #26): score {±1% drift cap, monotonic timestamp, msg.sender pinning} presence. 3/3 = foreclosed; 0-1 = genuine surface

_v1.3 Addendum: 2026-05-22 ~11:10 UTC | DC-9 promotion + Hyperbridge intake + Doctrine #23 architectural-foreclosure receipts | Buzz Lane 1_

_v1.4 Addendum: 2026-05-22 ~11:40 UTC | DC-9 sub-4 ERC4626 foreclosure (7 targets) + Step 9 propagation foreclosure receipts (Lombard, Usual-Fira, Lido) + Renzo Gate 1+2 foreclosure (xERC20 + TVL-closure + Hyperlane parent-class + price-feed triad) + Doctrines #24/25/26 cross-chain receiver checklist | Buzz Lane 1_

---

## v1.5 Addendum — 2026-05-23 — Open Intakes (Standing Intake Steps 1-4 only, Gate 1 deferred)

Per Standing Intake Protocol Step 6 (Continuous), open intakes that have completed PROFILE + OVERLAP + EV + QUEUE-DECISION but for which Gate 1 execution is deferred:

| Date | Target | Platform | Cap | Brain overlap | EV (weighted) | Queue position | Substrate fit | Notes |
|------|--------|----------|-----|---------------|---------------|----------------|---------------|-------|
| 2026-05-23 | **chainlink** | HackerOne | $100K Critical | HIGH (3 lenses: DC-7 + Pattern E + DC-9) | **~$2,380** | Watchlist behind Coinbase | PARTIAL — Solidity Staking + AggregatorV3 in-scope; Core Node Go OUT of brain calibration | avg-bounty LOW ($125-236), 69% response efficiency (slow triage). Operator-flagged "rank behind Coinbase" msg 7629. Substrate-mismatch derate ~0.45 on scope. Gate 1 to apply Doctrine #30 PRIMITIVE-GREP-CHECK before any candidate row. Repo: github.com/smartcontractkit/chainlink (clone deferred to Gate 1 activation per disk discipline). |
| 2026-05-23 | **stargate-v3-fresh-intake** | Immunefi | $10M Critical, 15 assets | HIGH (DC-10 + CANDIDATE-A direct, also Pattern H + Pattern E + CANDIDATE-J) | **~$170K** | **#1 in this batch — IMMEDIATE Gate 1** | Solidity full-fit | LayerZero-derived bridge. Prior Buzz Gate 1 (stargate-v2 today) verdict WATCHLIST with DC-7 operator-misconfig-class lead. Doctrine #30 PRIMITIVE-GREP-CHECK on LayerZero/DVN/lzReceive/OFT/MessageLib before any candidate. Doctrine #29 transfer angle vs main LayerZero V2 |
| 2026-05-23 | **spark** | Immunefi | $5M Critical, **349 assets** | HIGH (DC-9 + Pattern E + CANDIDATE-I + DC-7 + CANDIDATE-J) | **~$180K** | #2 in this batch — Standard Gate 1 | Solidity full-fit | MakerDAO lending fork of Aave V3 + SparkLend + sUSDS + sUSDC + sDAI. Operator-flagged primacy-of-impact bonus on out-of-scope assets. Prior sparklend KILL_DUPLICATE_MISMAPPED (was aave-v3-core mis-clone) DOES NOT block this fresh intake — different scope (full Spark Immunefi program). Focus = non-canonical-ERC4626 vault adapters + 3rd-party plugin surface (Ethena/Aerodrome/Meta-Morpho per prior reserve-protocol Doctrine #27 anti-example) |
| 2026-05-23 | **sky-makerdao-submodules** | Immunefi | $10M (216 assets total, core foreclosed) | HIGH on submodules (DC-9 + DC-7 + CANDIDATE-J + CANDIDATE-I) | **$5K-$30K per submodule** | #3 in this batch — Gap-fill Gate 1 ranked by audit-coverage discount | Solidity full-fit | Core foreclosed (Step 9 sweep). Sub-targets = Lockstake (already scanned-clean 2026-05-08), dss-flappers, endgame-toolkit, SubDAO / Vest / LitePsm / SkyMoney non-core asset modules. Per Doctrine #29 transfer — least-audited sub-modules first. Primacy-of-impact applies |
| 2026-05-23 | **layerzero-fork-monitor** | Immunefi | $15M (main repo KILLED) | HIGH on fork-class (DC-10 + CANDIDATE-A + Pattern H) | **per-fork variable** | **CONTINUOUS MONITOR**, NOT a Gate 1 target | N/A | Per Doctrine #29 fork-transfer logic + Kelp DAO $292M anchor. Add tag to 30-repo watchlist as "LayerZero-V2-consumer-watch". Surface fresh LayerZero V2 consumer launches via contest-monitor for transfer evaluation. Consumer-list addendum per Standing Intake Protocol Step 6 codified |
| 2026-05-23 | **lido** (REQUEUE — operator SKIP) | Immunefi | $2M (KILLED) | KILL_DOCTRINE_RESPECT | $0 | **SKIP** | N/A | Already Gate 1 KILLED 2026-05-22 (reference-impl, defense_ratio 48.5). Operator-directive = DO NOT re-scan. Row logged to acknowledge requeue per ZERO option menus rule. Lane 3 publish opportunity still flagged on Lido state-invalidation reference impl |

### Foreclosure-class addition (Doctrine #29 anti-example, Cantina Base Divergences 2026-05-23)

The Base TEE+ZK hybrid proof system in `src/L1/proofs/` is added as a **Doctrine #29 ANTI-EXAMPLE**: audit-saturation here UPHOLDS the defense (not transfers downstream). The pattern class TRANSFERS DOWNSTREAM only to:

- New L2 forks copying Base TEE+ZK hybrid without the defensive-comment narration (likely to skip Pass 2 suffix-side revocation check — `NitroEnclaveVerifier.sol` L718-727)
- L2s using raw AWS Nitro without ZK-proof wrapping (DER/CBOR parse-layer known-complex, NOT foreclosed here)
- L2s using Solidity `immutable` inconsistently (some args clone-overridable when they shouldn't be — verify against CWIA semantics)

Future Gate 1 candidates of this class auto-route through the Cantina-Base-Divergences reference for comparison: if the target lacks any of the verified defensive layers, the class transfers and Gate 2 is warranted.

| Target | Foreclosed bug class | Mechanism | Receipt |
| --- | --- | --- | --- |
| Coinbase Base `src/L1/proofs/` (AggregateVerifier + NitroEnclaveVerifier + TEEProverRegistry + TEEVerifier + ZKVerifier + AnchorStateRegistry + DisputeGameFactory) | DC-7 + Pattern H + DC-10 lenses on TEE+ZK hybrid proof | Triple-redundant revocation enforcement (NitroEnclaveVerifier L643+L703+L718-727) + per-image isolation (TEEVerifier signerImageHash==imageId) + Solidity `immutable` binding (impl-not-clone-overridable) + strong journal binding (CONFIG_HASH + IMAGE_HASH + state-roots + L2-seq + L1-origin + proposer) + frozen-at-creation respected-game-type + soundness preservation bypasses paused() + anti-griefing locks on post-challenge nullify + asymmetric soundness fallback (TEE-alive-after-ZK-null) | `hunts/2026-05-23-coinbase-cantina-base-divergences.md` (Gate 1 + Gate 2 5-RQ sweep, ~68% LOC coverage) |

_v1.5 Addendum: 2026-05-23 ~22:20 UTC | Chainlink intake (HackerOne, $100K cap, EV $2.4K, watchlist behind Coinbase) + Cantina Base Divergences foreclosure receipt + Doctrine #29 ANTI-EXAMPLE table | Buzz Lane 1_

---

## v1.6 Addendum: Cantina 6-target intake batch (2026-05-24, operator-directed)

Six new Cantina bounty targets surfaced by operator with explicit per-target lens directives. Top 2 (Paxos + Kiln OmniVault) dispatched immediately for Gate 1 in parallel. Remaining 4 queued in priority order.

| # | Target | Cap | Scope | Operator-flagged lens | Queue position | Status |
|---|--------|-----|-------|----------------------|----------------|--------|
| 1 | **Paxos** | $1M | stablecoins PYUSD/PAXG/USDG/USDP + cross-chain bridging | DC-10 + upgrade lens (Pattern H bridging) | **IMMEDIATE** | **Gate 1 COMPLETE 2026-05-24 — WATCHLIST + FORECLOSURE-RECEIPT (Pattern H 3-required + 1-of-2-optional DVN exceeds Stargate v3; SupplyControl triple-gated; UUPS owner = OZ TimelockController [ASSUMED] pending bytecode-verify; 8 audit reports). EV $4K post-discount. Hunt: hunts/2026-05-24-paxos-cantina-gate1.md.** Re-dispatch 2026-05-27 (T+3 days): **DEDUP-FORECLOSURE-RECEIPT.** Day 27 compound stack (Doctrine #27 Corollary B + Sub-rule #27c + Doctrine #34 sub-class b + Doctrine #36 PERMANENT + DC-9 sub-2 DEFENSE PATTERN) re-applied; all REINFORCE prior verdict, none unlock fresh angle. Annual aggregate cap clarified at $2M (Cantina page refresh 2026-05-27 21:16Z) — strengthens discount further. Paxos proposed as DC-9 sub-2 DEFENSE PATTERN 2nd-anchor candidate (pending bytecode-verify of UUPS owner = OZ TimelockController). Receipt: `hunts/2026-05-27-paxos-cantina-redispatch-DEDUP-FORECLOSURE.md`. |
| 2 | **Kiln OmniVault** | $500K | ERC-4626 yield vaults wrapping MetaMorpho/AAVE/Compound via connector pattern | CANDIDATE-O + DC-9 + composition-surface (leverage existing Morpho Surface A deep knowledge) | **IMMEDIATE** | **Gate 1 COMPLETE 2026-05-24 ~13:35Z — WATCHLIST + ARCHITECTURAL-FORECLOSURE-RECEIPT. DC-9 sub-3 TWO HITS (ConnectorRegistry.update + Beacon.upgradeTo single-function instant swap NO TIMELOCK) but FORECLOSURE-class per docs explicit multisig-trust model (PROXY_ADMIN multisig + Quantstamp/Spearbit signed off). CANDIDATE-O substrate PARTIAL on MetamorphoConnector previewRedeem leg (propagation surface for Morpho-flashloan msg 7639 if upstream primitive lands — file sister submission then). Surface A class NOT-TRANSFERABLE (Kiln pattern is single-function instant swap akin to MetaMorpho V2 setCurator, NOT V1 two-step staging-vs-swap). CANDIDATE-J 0 hits. CANDIDATE-I well-defended. EV $3.75K below $50K floor. 11 contracts pulled via Sourcify (no GitHub repo). Hunt: hunts/2026-05-24-kiln-omnivault-cantina-gate1.md.** |
| 3 | **Kiln V1** | $1M | ETH staking contracts, proxy + fee dispatcher pattern | DC-9 sub-3 (upgradeable + fee-dispatcher mutation) + Pattern E (fee arithmetic asymmetry) + DC-3 (access control on dispatcher) | **Gate 1 COMPLETE 2026-05-24 — FORECLOSURE-WITH-RECEIPT.** Canonical codebase = `liquid-collective/liquid-collective-protocol` (Kiln co-built LsETH). **STRUCTURAL: Cantina program URL NOT FOUND on cantina.xyz/competitions OR /bounties — LC own VULNERABILITY_DISCLOSURE.md states bug bounty "currently being designed", $1M cap [ASSUMED] per operator directive.** Operator should confirm program source. All 3 operator-flagged lenses foreclosed: DC-9 sub-3 PRESENT-WITH-PARTIAL-DEFENSE-IN-DEPTH (proxyAdministrator distinct from governor + 2-step admin handoff + Firewall selector-gating, but [ASSUMED] NO on-chain Timelock between proxyAdministrator and upgrade — single receipt of note); Pattern E NOT-PRESENT (single `_onEarnings` formula on net-positive rewards, coverage explicitly excluded, slashing symmetric); DC-3 PRESENT-WITH-FORECLOSURE (mirror-guarded `pullELFees`/`sendELFees`, all setters `onlyAdmin`). CANDIDATE-I share math symmetric; DC-1 nonReentrant on claim; DC-2 oracle bounded by setReportBounds.annualAprUpperBound. Audit-saturation MAXIMUM: Halborn + Spearbit + **Certora FULL FV harness** (conf/+harness/+applyHarness.patch present). Doctrine #27 discount 0.4. **EV $1,800** post-discount. Second Kiln-family target today same pattern (OmniVault FORECLOSURE-RECEIPT). Hunt: hunts/2026-05-24-kiln-v1-cantina-gate1.md. |
| 4 | **Liquity V2** | 125K BOLD | collateralized debt, Chainlink oracle dependency | CANDIDATE-O (oracle dependency) + DC-2 (oracle staleness) + Pattern E (liquidation arithmetic) | **Gate 1 COMPLETE 2026-05-24 ~14:00Z — KILL + FORECLOSURE-RECEIPT. ALL operator-flagged lenses returned NOT-PRESENT or DEFENDED: CANDIDATE-O N/A (Chainlink-direct, no DEX volume), DC-2 fully defended (`<` strict-less-than is CORRECT per Compound lesson + branch-shutdown circuit breaker + 1/64-gas EIP-150 + zero-price check), Pattern E symmetric. DC-9 4-sub all defended (mint gated, ownership renounced post-setup, immutable). MAXIMUM audit-saturation observed: 5 firms (Certora FV + ChainSecurity + Coinspect + Dedaub×2 + Recon) + 26 documented "Known issues and mitigations" wontfix-labeled in README. EV $56 post-discount (Doctrine #27 at 0.3). STRUCTURAL: Cantina program URL NOT FOUND on cantina.xyz/bounties active list — operator likely mis-attributed (Immunefi historical Liquity presence more probable). Hunt: hunts/2026-05-24-liquity-v2-cantina-gate1.md.** |
| 5 | **Pump.fun** | $500K | Solana bonding curves + AMM, devnet only scope | DC-8 (Solana Anchor) + CANDIDATE-E (Rust rounding-asymmetry) + Pattern E (bonding curve arithmetic). NOTE: 492 prior submissions = audit-saturation HIGH → Doctrine #27 deep-discount expected | **SKIP-PER-MSG-7676** — operator: "492 submissions saturated on Solana devnet, watchlist-only" | watchlist-only, no Gate 1 |
| 6 | **Agglayer** | $250K | cross-chain settlement | DC-10 + Pattern H + DC-7 (cross-chain field-binding). NOTE: low non-critical payouts = P(acceptance) discount, gap-fill last | **SKIP-PER-MSG-7676** — operator: "non-critical payouts too low, watchlist-only" | watchlist-only, no Gate 1 |

**Pre-flight discipline applied to all six per operator directive:**
- Scope-check via Cantina program page WebFetch BEFORE cloning (Veda OOS lesson)
- Bytecode-verify BEFORE Gate 2 advancement (Wormhole lesson)
- Doctrine #30 PRIMITIVE-GREP-CHECK before any candidate row (Coinbase Cantina v2 retraction lesson)
- Step 5.3 R8 signature-primitive verification: visibility + modifiers + caller-reach (Aave V4 KILL_ALL_THREE lesson today)
- Submission velocity awareness: "obvious-once-pointed-out" classes go fast-track paste-ready (DISC-018 CLOSED_DUPLICATE lesson today)

Combined cap-weighted EV (pre-discount): $1M + $500K + $1M + $125K + $500K + $250K = $3.375M. Post Doctrine #27 audit-saturation + Doctrine #29 transfer discounting + P(finding)+P(acceptance) realistic gates, expected realized EV across the 6-target batch: $30K-$150K range, dominated by Kiln OmniVault (composition asymmetry × Morpho deep-knowledge × less-saturated audit history) and Paxos cross-chain bridging Pattern H if config diverges from Stargate v3 / Coinbase reference templates.

_v1.6 Addendum: 2026-05-24 ~13:00 UTC | 6-target Cantina batch intake (operator directive) | Top 2 dispatched IMMEDIATE, 4 queued in priority order | Buzz Lane 1_

---

## v1.7 ADDENDUM — Propagation Sweep Cycle 1 (2026-05-24 overnight)

**Authority:** operator msg 7684 — overnight propagation sweep cycle 1, autonomous overnight mode
**Substrate:** existing `data/lane1/step9-propagation-*.json` summary data for 17 rank 11-35 targets (zero re-clones, disk pressure 83-84%)
**Lens stack applied:** CANDIDATE-O substrate (E_hits proxy) + scope_filter v1.8 schema + Pattern H DVN strong-defense + Step 5.3 R8 discipline

### 5 NEW GATE 1 CANDIDATES QUEUED (operator review tomorrow)

| Repo | Bounty | Substrate signature | Top brain lenses | Priority |
|------|--------|--------------------|------------------|----------|
| **silo-v2** | Immunefi $1M | K_qual=20 + E_hits=349/61files + H_hits=289 + 416 total files | DC-9 sub-4 + CANDIDATE-O + Pattern H + multi-chain | **HIGH** |
| **origin-dollar** | Immunefi $1M | K_qual=15 + E_hits=56/16files + D=204 | DC-9 family + CANDIDATE-O + reentrancy/TOCTOU | HIGH |
| **venus-core-pool** | **NO LIVE BOUNTY** (verified 2026-05-24 via WebSearch + 3 WebFetch + immunefi explore search "venus" all ZERO; sweep "$1M Immunefi" was [ASSUMED] now REFUTED) | K_qual=15 + D=207 + E_hits=2 (CANDIDATE-O LOW) + Layer 0 audit_age `159_DonationAttack_Patch_Hashdit_20260320` triple-firm fresh + 714 fix_candidates active dev (HEAD 2026-05-17) | DC-11/CANDIDATE-I DIRECT (Compound v2 canonical fork triple-audited 20260320 first-depositor inflation patch), DC-12 substrate (DBO integration Apr 2-15 post-audit fix-cluster), DC-9 family substrate, **DC-15/CANDIDATE-U NEGATIVE** (single-asset vToken no LP collateral, R+S detectors empty), Doctrine #27 HIGH (60 audit reports) | **FORECLOSURE-RECEIPT (no live bounty)** — `bounty_relaunch_monitor=true` proposed for Lane 4 weekly cron on `immunefi.com/explore?search=venus` + GitHub SECURITY.md; substrate value $50-150K if relaunched (DonationAttack post-audit fix-cluster is highest-EV); hunts/2026-05-24-venus-core-pool-gate1.md |
| **lifi** | Immunefi $1M | D=478/394files + H=64/17files + K_qual=9 + J=12 | CANDIDATE-A bridge + DC-6 + CANDIDATE-O composition via cross-chain quote-aggregation | MEDIUM |
| **cooler-loans** | Immunefi ~$500K-1M | H=158/12files (13.2 ratio!) + K_qual=7 + E_hits=8 | DC-9 + Pattern H + Olympus MIN-cap-defense reference (Doctrine #29) | MEDIUM |

### 4 PATTERN H FORECLOSURE-RECEIPTS PROPOSED

All H qual_hits=0 — heuristics surfaced no field-pair gaps → strong-defense candidates per Doctrine #29 Stargate v3 + Paxos reference templates:

| Repo | H hits | H files | H density | Foreclosure-receipt template |
|------|--------|---------|-----------|------------------------------|
| stargate-v2 | 2 | 2 | 0.020 | "follows v3 sibling 2-of-2 + 0 optional ref" |
| layerzero-bridge | 16 | 7 | 0.023 | "ulnConfig presumed canonical; Stargate v3 endorsement chain" |
| hyperlane | 70 | 25 | 0.071 | "ISM-config-as-DVN reference template" |
| across | 29 | 10 | 0.102 | "UMA OO + Helios light client reference" |
| lista-moolah | (Gate 1 2026-05-27 / Gate 2 2026-05-27 FORECLOSED) | ~11.2K LOC | 0.62 overlap | "Morpho Blue fork + Lista-bespoke broker layer; 7-firm core saturation (20 audits). DC-12 PT-oracle staleness Gate 2 NEGATED — structural-not-a-bug (Pendle `PendleSparkLinearDiscountOracle` returns `updatedAt=0` by design, deterministic on-chain math, no stale-state). Foundry PoC NOT BUILT (Phase 0 NEGATE). Doctrine #34 Sub-Rule 34.1 (Upstream-Source Semantic Test) FILED. DC-12 sub-7h (Deterministic-Upstream-No-Staleness-State, STRUCTURAL-FORECLOSED-CLASS) FILED. LendingBroker.emergencyWithdraw STRUCTURALLY-OOS per Immunefi (privileged-role drain treated as governance). MoolahVault setName/setSymbol post-audit drift DEFERRED. Legacy Helio CDP foreclosed (lista-dao-contracts archived 2026-05-19). Monitor for future Lista PT oracle variants bridging Pyth/Chainlink upstream — would re-fire DC-12 lens validly. Receipt: `hunts/2026-05-27-lista-dao-gate2-foreclosure.md`." |

### scope_filter v1.8/v1.9 SUGGESTIONS (operator review tomorrow)

6 targets need scope_filter values per chain architecture:

- `origin-dollar` → `ethereum_mainnet_only` (v1.8 existing value)
- `venus-core-pool` → `bsc_mainnet_only` (v1.9 new value needed)
- `pancakeswap-amm-v3` → `bsc_mainnet_only` (v1.9)
- `aerodrome-slipstream` → `base_mainnet_only` (v1.9)
- `kyberswap-elastic` → `multi_chain_allowlist` (v1.9 new — paired with `scope_chains: [ethereum,bsc,polygon,arbitrum,optimism]`)
- `silo-v2` → `multi_chain_allowlist` (v1.9 — paired with `scope_chains: [sonic,arbitrum,optimism,base]`)

**v1.9 schema addition proposal:**
- New scope_filter values: `bsc_mainnet_only` | `base_mainnet_only` | `multi_chain_allowlist`
- New paired field: `scope_chains: [<chain_id_array>]` when `scope_filter == multi_chain_allowlist`

### CANDIDATE-O SUBSTRATE INVENTORY (E_hits × bounty ranking)

Highest CANDIDATE-O composition probability in cohort:

1. silo-v2 — E=349/61files, $1M bounty, multi-chain lending
2. aerodrome-slipstream — E=347/24files density 2.844, $500K, native Base CLMM
3. pancakeswap-amm-v3 — E=280/14files density 2.353, $1M, KSE-2023 sibling family
4. kyberswap-elastic — E=130/4files density 2.131, $1M, root-incident class
5. compound-v3 — E=125/21files, $1M (already scope_filter=ethereum_mainnet_only)

### NEXT-CYCLE PRIORITY

**silo-v2 Gate 1 dispatch tomorrow** — pre-flight requirement: Immunefi scope-page read for in-scope contract enumeration + chain allowlist confirmation.

Hunt file: `/home/claude-code/buzz-workspace/hunts/2026-05-24-propagation-sweep-cycle-1.md`

_v1.7 Addendum: 2026-05-24 overnight | propagation sweep cycle 1 per operator msg 7684 | 5 Gate 1 candidates QUEUED + 4 foreclosure-receipt candidates + 6 scope_filter suggestions + v1.9 schema proposal | Disk delta zero | Buzz Lane 1 overnight_

---

## v1.8 Addendum: 2026-05-24 Beanstalk Immunefi Operator-Injected Row

Operator dispatched Beanstalk Immunefi as overnight batch slot 1 (outside the 31-row TVL-ranked Immunefi-active subset). Foreclosed at vault-funding pre-check gate.

| # | Protocol | Chain(s) | TVL | Bounty | Category | DC-7 | CG | CJ | CK | CI | DC-9 | CAND-O | CAND-F | Composition | Vault status | Priority |
|---|----------|---------|-----|--------|----------|------|-----|-----|----|-----|------|--------|--------|-------------|--------------|----------|
| 32 | **Beanstalk + Basin + Pipeline** | Arbitrum (protocol) + Ethereum (BEAN token) | ~$30M (est) | $1.1M BEAN-paid | Stablecoin + DEX + ActionSandbox | L | – | M | – | L | M | **H** | **H** | **H** | **EMPTY ($0)** | **WATCH-REFUND** |

### Composition-surface lens (NEW load-bearing class — operator-flagged 2026-05-24)

Pipeline-as-action-sandbox composing Beanstalk Diamond + Basin Wells = first watchlist instance of "deliberately-composable 3-protocol single-bounty surface where the composition primitive itself is the substrate." Different from cross-domain (DC-6) and from CANDIDATE-F parallel-validation-asymmetry — Pipeline is single-tx + single-chain + user-supplied-action-array. Tag as **CANDIDATE-Q (Action-Sandbox-Composition-Substrate)** pending operator approval + second target appearing (Yearn's vault-relay or 1inch's aggregator-router would qualify as adjacent kin).

### Re-activation criterion

Vault BEAN balance ≥ 1.98M BEAN (≈$500K-equivalent at $0.2528 BEAN spot) → re-dispatch Gate 1 full Step 5 walk on all 3 codebases. Until then: WATCH-REFUND with weekly `balanceOf` poll suggested.

### Why this matters for the rest of the watchlist

Audit-saturation discipline (Doctrine #27) is the more conservative discount than this row models — the 0.30 multiplier may understate. Beanstalk-core has been reviewed 6 times by 6 different firms across 4 years. Pipeline-sandbox specifically has 2 audits (Halborn Nov 2022 + Cyfrin TBD). The composition-substrate angle (Pipeline + Diamond + Wells together) is the least-audited surface — but auditing composition is inherently harder, so historical FP/TP ratios in this class are unknown.

Hunt file: `/home/claude-code/buzz-workspace/hunts/2026-05-24-beanstalk-immunefi-gate1.md`

_v1.8 Addendum: 2026-05-24 overnight | Beanstalk Immunefi vault-empty foreclosure | NEW lens class CANDIDATE-Q (Action-Sandbox-Composition-Substrate) proposed pending second-instance confirmation | Disk delta zero | Re-activation = vault refund ≥ ~$500K | Buzz Lane 1 overnight_

---

## Row: Optimism Immunefi (2026-05-24, overnight batch slot 3)

| Program | Chain | Cap | Brain Lens Coverage | EV (post-saturation) | Action |
| --- | --- | --- | --- | --- | --- |
| optimism-immunefi | ethereum (L1 contracts) + L2 OP Mainnet + op-geth + Rust kona/op-reth | $2M Critical / $50K High / $15K Medium / Website $5-50K | DC-6: **REFERENCE-IMPL** (canonical bridge baseline, not divergence-target) — Buzz LEARNS from this, doesn't find bugs in it. DC-9: GOVERNANCE-FORECLOSED (Foundation Safe + onlyOwner across ProxyAdmin + Portal2.migrate* + ETHLockbox.migrate/authorize — same posture as Pendle/Sky/Compound/Aave V3/Uniswap V4 HE-26 6th worked example). CANDIDATE-A: **REFERENCE-IMPL** (canonical L1↔L2 bridge). CANDIDATE-O (Sharwa direct-validation): RESOLVED by AnchorStateRegistry.isGameClaimValid composition (Portal2:393+398 prove-time AND Portal2:651 finalize-time defense-in-depth). CANDIDATE-K (HTTP-protocol-state): N/A. Kamino max-timestamp-wins: N/A (no oracle-pair surface). Pattern E (rounding asymmetry, FaultDisputeGame bond curve): DEFERRED Sherlock-saturated. Pattern H: N/A (no DVN). | $24K nominal (0.04 × $2M × 0.5 × 0.6 audit-discount); deep-read collapses to LOW-MEDIUM | **WATCHLIST + defensive Foreclosure-Receipt**. 2 narrow Gate 2 candidates filed but neither submission-track: L1 DisputeGameFactory two-overload setImplementation stale-args asymmetry ($0 EV admin-error-class), G1 op-dispute-mon validateGameWithdrawals silent-skip on empty WithdrawalRequests ($5-15K EV pending upstream populator-trace). 30-repo monorepo-watch add. Veda 1c scope-stale-address sub-class flagged (L2OutputOracle source deleted from repo while address in-scope — operator clarifies with Immunefi triage). |

### Brain Compound (6 net-new proposals from this Gate 1)

1. **DC-6 / CANDIDATE-A canonical reference baseline** — add OP Stack (OptimismPortal2 + L1CrossDomainMessenger + AnchorStateRegistry + ETHLockbox) to `brain/Audit-Reports-Library.md` as the reference implementation against which all bridge divergences (Wormhole, KelpDAO, THORChain Bifrost) are measured. File:line citations from this Gate 1.
2. **DC-7 language-rewrite-field-drop sub-pattern** — Layer 0 caught kona-node `474bde76` 2026-05-22 fix where Rust rewrite dropped the hash component of (number, hash) when finalizing L2 blocks. First production-confirmed CANDIDATE-O instance in OP Stack code, language-rewrite axis. Add to `brain/Patterns-Defense-Classes.md` as DC-7 sub-pattern with kona-node worked example.
3. **HE-26 governance-layer-foreclosure 6th worked example** — OP Stack ProxyAdmin reaffirms Pendle/Sky/Compound/Aave V3/Uniswap V4 class. Confirm HE-26 enricher proposal (task #106) still queued.
4. **CANDIDATE-R-DRAFT setter-overload args-not-cleared** — new filing-candidate from DisputeGameFactory two-overload setImplementation. Scan all Conduit / OP-Stack-fork chains (Base, Mode, Manta, Zora, World Chain, Celo L2) for the same DisputeGameFactory pattern.
5. **CANDIDATE-Q-DRAFT monitor-silent-skip on iterator-input-empty** — new filing-candidate from op-dispute-mon validateGameWithdrawals. Cross-pollinate to all monitor-class contracts in watchlist (Wormhole monitors, Sky lockstake monitors). Likely promotion candidate if pattern recurs.
6. **Veda 1c scope-stale-address sub-class** — L2OutputOracle in-scope address with source deleted from repo. Add to standing-intake protocol Veda checklist as lens 1c (in-scope address with no current source = degraded scope, defer all work until triage clarifies).

### Layer 0 Git-Security Top Hits (200-commit window)

64 fix_candidates / 10 dangerous_area / 10 late_changes / 1 revert. HEAD `c49d3db6` 2026-05-24.

Load-bearing fixes worth Buzz brain compound:
- `d9d4e0bf` 2026-05-22 — `fix(ctb): increase cost of l2ProxyAdmin.upgradeExecution()` — deployment-script tuning (UpgradeUtils.sol gasLimits 3.5M→3.7M), NOT on-chain bug. Watch for upgrade bundle deploy event.
- `474bde76` 2026-05-22 — `fix(kona-node): carry L2 hash through finalization to prevent silent wrong-block finalize` — STRUCTURAL DC-7 instance now patched.
- `87afd208` 2026-05-22 — `fix(op-reth): prevent engine sync-target spin after deep unwind` — liveness defect, out of Gate 1 deep-read window.
- Revert `3d12e4b5` 2026-05-13 reverts `11863cb4 op-supernode under-claim i.currentL1 by one L1 block on Advance` — defensive off-by-one proved incorrect, pre-revert behavior restored.

Author distribution: Adrian Sutton 66 commits / +14.5K / -39.5K — NET DELETIONS dominate, recent activity is large-scale CLEANUP (op-supervisor #20891, OPCM remnants #20527, super-cannon game type #20363). Pattern: defensive simplification reducing attack surface.

Hunt file: `/home/claude-code/buzz-workspace/hunts/2026-05-24-optimism-immunefi-gate1.md`
Layer 0 JSON preserved: `/home/claude-code/buzz-workspace/hunts/.optimism-layer0.json`

_v1.8 Addendum: 2026-05-24 overnight | Optimism Immunefi WATCHLIST + defensive Foreclosure-Receipt | 2 narrow Gate 2 candidates (L1+G1), neither submission-track | 6 brain compound proposals | Disk delta +338MB (op-geth 132MB + optimism 206MB), clones retained 7d | Veda 1c scope-stale-address NEW sub-class flagged for L2OutputOracle | Buzz Lane 1 overnight_

---

## v1.9 Addendum: Clara Ground-Truth Bulk Intake Schema Extension (2026-05-24, Ogie msg 7695)

The Clara Ground-Truth bulk-intake (`brain/Clara-Ground-Truth-Bulk-Intake.md`, 400-incident corpus) introduced 7 new CANDIDATE classes (T through Z) and promoted 5 to DC-11 through DC-15. The 31-protocol cross-reference matrix above (v1.7 schema with columns DC-7 | CG | CJ | CK | CI) is now incomplete for new-target intakes.

### Extended column-header schema (effective for v1.10+ scans, applied incrementally per new intake)

The full lens-matrix for any new Gate 1 target now spans:

| Active DC catalog | CANDIDATE pool                                                    |
| ----------------- | ----------------------------------------------------------------- |
| DC-1 .. DC-10     | CANDIDATE-A (promoted DC-10), CANDIDATE-D, CANDIDATE-E            |
| **DC-11** (CANDIDATE-I → ERC4626 Share Inflation)         | CANDIDATE-F (promoted DC-7), CANDIDATE-G (promoted DC-8) |
| **DC-12** (CANDIDATE-O → Oracle/Slippage Manipulation)    | CANDIDATE-H, CANDIDATE-J, CANDIDATE-K, CANDIDATE-L       |
| **DC-13** (CANDIDATE-M → Post-Audit Hook CEI)             | CANDIDATE-N (promoted DC-9), CANDIDATE-P                 |
| **DC-14** (CANDIDATE-T → Unbound `from` Approval-Drain)   | CANDIDATE-Q (Truebit, hold)                              |
| **DC-15** (CANDIDATE-U → AMM Pair Reserve-Skew, PARENT)   | **CANDIDATE-R + CANDIDATE-S** kept as-is, treated as DC-15 sub-instances per Ogie msg 7695 |
|                                                           | **CANDIDATE-V** (Reward Accumulator no per-user invalidation) |
|                                                           | **CANDIDATE-W** (ERC2771 `_msgSender()` burn-spoof, 3 anchors) |
|                                                           | **CANDIDATE-X** (Decimal/unit-of-measure asymmetry, 3 anchors) |
|                                                           | **CANDIDATE-Y** (`from == to` self-transfer mutation, 8 anchors) |
|                                                           | **CANDIDATE-Z** (Rebase token cache invalidation, 5 anchors) |

### Row-schema impact (none — additive lens columns only)

The v1.7 row schema (per-protocol architectural-fit confidence H/M/L/–) remains unchanged. Future cross-reference scans append new lens columns for DC-11..15 + V/W/X/Y/Z as architectural-relevance dictates per target. No retroactive rewrite of v1.7 31-row table — existing rows are preserved as scan-time snapshots.

### Routing-doctrine update

Standing Intake Protocol Step 2 (brain overlap score) now MUST cross-reference target against:

1. Original META-DOCTRINE Two-Axis Donation-Channel Test (Patterns-Defense-Classes.md line 328) — applies BEFORE DC-11 fires
2. **NEW: Doctrine #31 "Custom hooks always break standard invariants"** (Doctrine.md line 1593+) — applies BEFORE DC-15 + CANDIDATE-V/W/Y/Z fires
3. DC-1 through DC-15 catalog (post-routing-doctrine lens application)
4. CANDIDATE pool (post-active-catalog application)

Effective immediately: any Gate 1 surface map for a target with custom `_transfer` / `_update` / `balanceOf` / `_msgSender` override MUST include a Doctrine #31 routing pass.

### Productization impact

5 new DC-class detectors enter the active backlog (DC-11 ERC4626-mitigation grep, DC-12 oracle-organicity multi-sub-pattern detector, DC-13 cei-violation-via-hook, DC-14 unbound-from-approval-drain L1b rule, DC-15 amm-pair-reserve-skew umbrella). Highest-EV productization priority per Clara intake §2: DC-12 (highest-frequency class in DeFi exploit history per Clara Observation A).

_v1.9 Addendum: 2026-05-24 | Clara Ground-Truth bulk intake schema extension | 7 new CANDIDATEs T-Z committed | 5 DC-promotions DC-11..15 committed | Doctrine #31 routing-layer addition | Ogie msg 7695 operator approval | row schema unchanged, additive lens columns only | Buzz Lane 1 brain compound._

---

## Post-v1.9 Gate 1 Additions (Crossmap-row append, per Standing-Intake Step 6.2)

### silo-v2 (Silo Finance) — first deployment of post-Clara DC-12 + DC-15 + Doctrine #31 lens stack

| #   | Protocol | Chain(s)                                  | TVL  | Bounty                  | Category               | DC-12 | DC-15 | DC-9 sub-4 | CANDIDATE-I | DC-7  | CANDIDATE-P | Doctrine #31 | DC-1 | Already audited?                                                       | Priority      |
| --- | -------- | ----------------------------------------- | ---- | ----------------------- | ---------------------- | ----- | ----- | ---------- | ----------- | ----- | ----------- | ------------ | ---- | ---------------------------------------------------------------------- | ------------- |
| 32  | silo-v2  | Sonic + Arbitrum + Optimism + Base + Eth  | ?    | $10K-$100K (10% of fnds) | Lending (Multi-Silo)   | **H** | M     | M          | **M-H**     | **H** | **H**       | **H**        | M    | NET-NEW (5 firms touched repo: Cantina + ABDK + 0xJCN + Silo-Ent + Oracle-dedicated) | **GATE-2-PENDING** |

Per Gate 1 at `hunts/2026-05-24-silo-v2-gate1.md`: 8 lens hits HIGH overlap. EV $3K nominal (NOT $75K — propagation sweep used wrong cap). Lead-1 (transient `_liquidationAllowed` cross-binding via LiquidationHelper try/catch) only Doctrine-#27-surviving Gate-2 candidate. First deployment of DC-12 + DC-15 + Doctrine #31 lenses post-Clara intake.

**Reference-baseline candidacy**: Silo's gauge/hook architecture is the canonical "custom hooks override standard share-token invariants" example. Worth adding Silo to Doctrine #31 doctrine entry as `[REFERENCE-BASELINE]`.

**FORECLOSED 2026-05-24 (Ogie msg 7701)** — Lead-1 EV $3K nominal is below floor. KILL.

**TVL re-evaluation threshold** — $30M+ TVL across the multi-Silo deployment activates the Immunefi 10%-of-funds-affected clause, which can scale the Critical-bucket EV above the $100K nominal floor. If aggregate Silo Finance TVL crosses $30M (currently `?` per Gate 1; check DefiLlama for the v2 monorepo across all chains), Lead-1 EV scales and re-evaluation is warranted. NO monitoring cron per operator directive — this is a passive re-evaluation note only.

**Clone management** — silo-v2 clone at `.gate1-work/silo-v2-2026-05-24/` (106MB) deleted on auto-purge schedule 2026-05-31 (7d retention per Aave V4 reference-clone protocol). NO manual purge.

_Post-v1.9 row 32 silo-v2 | 2026-05-24 | Hyperactive Formula Step 3 dispatch from propagation-sweep-cycle-1.md | FORECLOSED Ogie msg 7701, TVL re-eval $30M threshold noted_

---

## Origin Dollar (OUSD / OETH / OS) — Gate 1 2026-05-24

| Field | Value |
|-------|-------|
| Bounty | Immunefi `originprotocol`, $1M Critical, $15K High flat, $25K Web, no KYC, $84.2K paid / 34 reports |
| Chains | Ethereum (primary), Base, Sonic, Plume, Arbitrum |
| Repo | github.com/OriginProtocol/origin-dollar @ cd7218c2 (2026-05-13) |
| Brain overlap | **HIGH** (DC-9 sub-2 + Doctrine #31 + CANDIDATE-Z + DC-12 first-application against rebase-protocol) |
| Nominal EV | **$45K** (= $1M × 0.10 × 0.45 × 1.0) |
| Audit-saturation | HEAVY (ToB + OZ + Certora externally referenced, OOS prior-issues clause) |
| Verdict | **GATE 2 CANDIDATE QUEUED (Conditional)** — 3 verifications gate escalation |

**Lead-1 anchor**: PR #2889 (May 10) "Add permissioned rebase" — removed auto-rebase-on-mint/redeem trigger entirely. Yield batching now operator-driven only. Rebase-timing sandwich attack hypothesis: `mint` → wait for strategist's `rebase()` → `requestWithdrawal` → 10min delay → `claimWithdrawal`. Bounded by `MAX_REBASE = 2%` + 10-min `withdrawalClaimDelay`. **Viable IF avg-rebase-interval > 60 min** on mainnet Vault `0xe75d77b1865ae93c7eaa3040b038d7aa7bc02f70`. Gate 2 cron verification required.

**Brain compound proposals from this Gate 1**:
1. **Doctrine #31a (sub-doctrine candidate)** — "rebase-trigger-shift requires downstream integrator re-audit". Anchor: Origin PR #2889. When a rebase-protocol changes its TRIGGER mechanism (auto→manual or vice-versa), all integrators built against old cadence assumptions become re-audit candidates.
2. **CANDIDATE-Z first-application NEGATIVE example** — WOETH's `adjuster` initialize-time snapshot mechanism (`token/WOETH.sol:62-72`) is the canonical defended-design for rebase-token wrappers. Worth adding to CANDIDATE-Z "negative example" section so future scans don't re-flag well-designed adjusters.
3. **DC-12 first-application against rebase-protocol** — Origin's OracleRouter family is the first rebase-protocol target post-Ogie-msg-7699 O-RAW/O-WRAPPED split. Chainlink-primary path is trivially O-WRAPPED. Curve fallback path needs Gate 2 verification (raw `get_p()` = O-RAW; `last_prices_packed` running average = O-WRAPPED).

**Clone management** — origin-dollar clone at `.gate1-work/origin-dollar-2026-05-24/` (~30MB) RETAINED for Gate 2 oracle + integrator scan. Delete after Gate 2 resolution or auto-purge 2026-05-31 if not dispatched.

_Post-v1.9 row 33 origin-dollar | 2026-05-24 | Hyperactive Formula Step 3 dispatch from propagation-sweep-cycle-1.md cycle 3 | CONDITIONAL Gate 2 (3 verifications gate escalation), $45K nominal EV mid-pack_

_Post-v1.9 row 34 lifi | 2026-05-25 | Hyperactive Formula Step 3 default-next dispatch from propagation-sweep-cycle-1.md (D=478+H=64+J=12 highest D-class density) | FORECLOSURE-RECEIPT, brain-compound captured: DC-14 anchor regression-check CLEAN (cand-t-detector 0 findings on 394 .sol = post-2022 fix confirmed intact, lifi becomes reference baseline for DC-14 defense pattern), Doctrine #31a first-deployment substrate identified (LidoWrapper L2 stETH↔wstETH naming-inversion + balance-asymmetric unwrap, acknowledged-by-design via @dev MEV-sweep warning), Doctrine #27 maximum-discount applied (85 audits over 30-month cadence, Cantina+Sujith Somraaj+dedicated firm-per-facet). Cantina-platform (NOT Immunefi). EV $4K nominal placeholder (auth-walled cap). 3 brain compound proposals filed for DC-14 baseline + Doctrine #31a cross-chain extension + Doctrine #27 sub-rule. Clone retained 7d (.gate1-work/lifi-2026-05-25/ purge 2026-06-01). Layer 0 JSON .lifi-layer0.json retained indefinitely as DC-14 anchor reference._

---

## Cap Protocol — Sherlock Gate 1 2026-05-25 (proposal C-Cap-5, Ogie msg 7772)

| Field | Value |
|-------|-------|
| Contest | Sherlock #990 — **FINISHED 2025-07-24** ($93.1K final / $126K rewards, NOT $1M as briefed) |
| Repo | github.com/cap-labs-dev/cap-contracts @ HEAD `7254ed0` (2026-04-29); audited at `0a57fbf` (2025-07-24) → 9-mo gap |
| Scope drift | 49 .sol audited → 185 .sol HEAD = **+277% post-audit growth** |
| Chains | Multi-chain via LayerZero OFT |
| Brain overlap | **HIGH post-pivot** — DC-9 + DC-12 sub-7 + Doctrine #34 (NEW, this Gate 1 anchored it) + CANDIDATE-A LZ-OFT-default-DVN + CANDIDATE-Q grow-only-allowlist (NEW) + Pattern F |
| Verdict | **Gate-1-MIXED → watchlist-only** — contest finished, no submission path. 5 candidates surfaced in post-audit-new code per Ogie msg 7772 |

**Candidates surfaced (operator-decision: watchlist-only, no cold-email per msg 7772):**

| # | Sev | ID | File | Class |
|---|-----|----|------|-------|
| 1 | CRITICAL | CANDIDATE-EIGENOP-001 | EigenOperator.sol:105-111 | CANDIDATE-Q grow-only-allowlist (1st anchor) |
| 2 | HIGH | CANDIDATE-HARVESTER-001 | CapInterestHarvester.sol:69-91,149-192 | DC-9 + Dutch-auction asymmetry |
| 3 | HIGH | CANDIDATE-DELEGATION-001 | Delegation.sol coverage() | DC-7 timestamp asymmetry |
| 4 | HIGH | CANDIDATE-TEMPO-001 | TempoBridgeUpgradeable.sol:83-98 | CANDIDATE-A LZ-OFT-default-DVN (1st sub-class anchor) |
| 5 | MEDIUM | CANDIDATE-FRR-001 | FractionalReserveLogic.sol:100-110 | DC-7 pre-withdraw amount skim |

**Brain compounds landed (5 of 5, batch C-Cap-1..5):**

- C-Cap-1 → CANDIDATE-Q grow-only-allowlist filed as DC-5 sub-pattern in `Patterns-Defense-Classes.md`
- C-Cap-2 → CANDIDATE-A LZ-OFT-default-DVN sub-class enrichment in `Patterns-Defense-Classes.md`
- C-Cap-3 → Doctrine #34 Post-Audit Composition Multiplier filed PERMANENT in `Doctrine.md`
- C-Cap-4 → Standing-Intake Step 1 PROFILE rule extended with platform-STATUS preflight in `.claude/rules/standing-intake-protocol.md`
- C-Cap-5 → this Crossmap row

**Re-evaluation triggers** — any of:

1. Cap launches active Sherlock/Cantina/Immunefi bounty
2. Cap publishes SECURITY.md or security@ email
3. Post-audit composition layer receives independent audit
4. 6-month review tick (2026-11-25)

**Clone management** — `.gate1-work/cap-2026-05-25/` (11MB) retained 7d (purge 2026-06-01). Layer 0 JSON retained indefinitely as Doctrine #34 canonical anchor.

_Post-v1.9 row 35 cap-protocol | 2026-05-25 | Operator dispatch msg 7768 + Gate 1 pivot msg 7772 | Gate-1-MIXED → watchlist-only (contest finished, no submission path), 5 brain compounds landed including Doctrine #34 Post-Audit Composition Multiplier (first worked anchor)._

---

## Flying Tulip — Sherlock Gate 1 2026-05-25 (proposal P2 of 4, Ogie msg 7775)

| Field | Value |
|-------|-------|
| Contest | Sherlock #1223 — **FINISHED**, $100K USDC final (NOT $1M as briefed — 2nd 10× operator-brief divergence today) |
| Sherlock blog | "A Model Codebase" 2026-04-30 — adjudicated, 2,000+ submissions, **zero valid Medium/High findings** |
| Repo | github.com/zaki9501/2026-01-flying-tulip-zaki9501-main (audit-contest source mirror) |
| Chains | Ethereum + Sonic (mid-April 2026 launch) |
| Architecture | Multi-chain yield + puts protocol; LayerZero OFT (FT token, 5 chains); ftPUT proxy; PutManager proxy; FlyingTulipOracle; CircuitBreaker |
| Brain overlap | **HIGH despite zero-clone pass** — DC-10 OFT + DC-12 sub-7 + Doctrine #31 + CANDIDATE-A (LZ-OFT-DVN sibling to Cap TempoBridge) + **Selective-Coverage Defense Asymmetry lens** (NEW, P1 anchor, CircuitBreaker `withdrawFT()` README-confirmed exclusion) |
| Verdict | **Gate-1-FORECLOSURE-RECEIPT → watchlist-only** — contest finished, no submission path, no Immunefi/Cantina/HackerOne backup discoverable in public-source pass |

**5 pre-source candidate frames (Track-B only if operator greenlit; not pursued per msg 7775):**

| # | ID | Class | Evidence grade |
|---|----|----|-------|
| FT-1 | CircuitBreaker `withdrawFT()` selective-coverage asymmetry | Selective-Coverage Defense Asymmetry lens (P1, this batch) | [INSPECTED] README |
| FT-2 | Cross-chain OFT + AAVE oracle divergence | DC-10 + DC-12 sub-7 | [ASSUMED] |
| FT-3 | Cap-update front-run window | DC-9 sub-1 / Doctrine #31 | [INSPECTED] README known-issue |
| FT-4 | Production-timelock-vs-test drift | Doctrine #34 sibling | [ASSUMED] |
| FT-5 | AAVE-oracle wrapper price-bounds bypass | DC-12 sub-7 / wrapper-strips-staleness | [ASSUMED] |

**Brain compounds landed (4 of 4, batch P1-P4):**

- **P1** → NEW file `brain/Lens-FT-CircuitBreaker-Asymmetry.md` — Selective-Coverage Defense Asymmetry family lens, Flying Tulip CircuitBreaker `withdrawFT()` first anchor (LENS_TRACKED, needs 2 more for CANDIDATE promotion)
- **P2** → this Crossmap row 36
- **P3** → `brain/Cross-Domain-Fragility-Laws.md` Selective-Coverage Defense Asymmetry Law (v2.0 footer bump, companion to P1 lens)
- **P4** → NEW file `brain/Operator-Brief-Reconciliation.md` — Cap + Flying Tulip 2-of-2 divergence pattern formalized as PERMANENT brain rule, sibling to C-Cap-4 Standing-Intake Step 1 platform-STATUS preflight

**Re-evaluation triggers** — any of:

1. Flying Tulip announces new bounty (Immunefi/Cantina/Sherlock/Hyperdrive)
2. Flying Tulip publishes private security disclosure channel
3. CircuitBreaker module receives independent audit
4. Selective-Coverage Defense Asymmetry lens hits 2nd worked anchor on a different protocol (promotion path)

**Clone management** — NO clone executed (Cap-style waste avoidance at Step 1 preflight per C-Cap-4 platform-STATUS rule). Layer 0 JSON NOT generated.

_Post-v1.9 row 36 flying-tulip | 2026-05-25 | Operator dispatch msg 7768 + watchlist-only directive msg 7775 | Gate-1-FORECLOSURE-RECEIPT (contest finished, zero clone, 15min wall-clock), 4 brain compounds landed P1-P4 including NEW lens Selective-Coverage Defense Asymmetry + NEW brain file Operator-Brief-Reconciliation (2-of-2 Sherlock divergence pattern formalized)._

---

## Day 26 batch — rows 37-40 (2026-05-26, Ogie msg 7817)

Five-target hunting day (Raydium + Hydration + Stacks + Filecoin + JustLend + ALEX retrospective) generated 41 frozen brain proposals. Rows below capture per-target Watchlist matrix entries.

### Row 37 — Raydium CLMM Immunefi $505K (hunt `hunts/2026-05-26-raydium-immunefi-gate1.md`)

| Field | Value |
|-------|-------|
| Program | Raydium (Solana, Anchor Rust + cp-swap + AMM v4) |
| Bounty | $505K Critical (Immunefi historical anchor — @Lastc0de cp-swap 2025) |
| Brain overlap | **LOW-MEDIUM** — DC-7 LOW (audited 4x recent), DC-9 LOW (admin-only path), DC-12 N/A (no external oracle in CLMM), CANDIDATE-E direct anchor (fix verified line 124 withdraw.rs) |
| Layer 0 signals | 113 fix_candidates, 97 dangerous_area_changes, fresh limit_order subsystem (introduced 2025-09-16, 4 audits in 8 weeks) |
| Verdict | **Gate-1-FORECLOSURE-RECEIPT (MIXED)** — 3 Gate-2-eligible low-confidence threads (HUNT-CAND-7, 14, 18) documented for operator decision |
| EV | $12K-$30K range (Gate 2 conditional) — vendor-cadence-discounted per Doctrine #34 enrichment |
| Re-evaluation | Watchdog speedrunner on commit-diff for `programs/amm/`, `programs/cp-swap/`, new limit_order PRs |

**Brain compounds landed (4 of 4 proposals A-D):**
- **A** → this row 37
- **B** → CANDIDATE-E v2 deferred (pending CAND-G2-3 Gate 2 worked-example for promotion threshold)
- **C** → `brain/External-Frameworks.md` Raydium 4-audit Pre-Audit-Composition-Multiplier precedent (vendor-cadence anti-anchor for Doctrine #34)
- **D** → `.claude/rules/standing-intake-protocol.md` Solana-Rust CLMM-fork-family lens stack (canonical for Orca Whirlpool / Phoenix / Lifinity v3)

### Row 38 — Stacks sBTC Immunefi $250K (hunt `hunts/2026-05-26-stacks-immunefi-gate1.md`)

| Field | Value |
|-------|-------|
| Program | Stacks sBTC (Clarity, Bitcoin L2) |
| Bounty | $250K Critical Immunefi |
| Brain overlap | **MEDIUM-HIGH** — Doctrine #35 (Trust-Boundary Surface Asymmetry NEW), CANDIDATE-R (deploy-bootstrap window NEW), Doctrine #34 STRONG-composition anchor, DC-9 sub-3 |
| Layer 0 signals | 200 commits, ~39 fix candidates (~19% fix-density = STRONG composition multiplier strength), 4 audit firms + 2 attackathons + embedded security + Hypernative + SDL + Immunefi |
| Substrate | FIRST Clarity production-tier Gate 1 entry; net-new substrate-class for Buzz |
| Verdict | Gate-1-COMPLETE → 2 Gate 2 candidates (C1 quorum atomic swap + C2 max-fee unbounded) HOLD pending Clarity Alliance PDF DUP-check |
| EV | ~$2K adj per nominal (Gate-fill queue) |
| Re-evaluation | Watchdog speedrunner on commit-diff for `contracts/contracts/*.clar` (Clarity substrate untouched for 90+ days, any change is meaningful signal) |

**Brain compounds landed (5 of 5 proposals P1-P5):**
- **P1** → `brain/Doctrine.md` Doctrine #35 NEW (Trust-Boundary Surface Asymmetry)
- **P2** → `brain/Patterns-Defense-Classes.md` CANDIDATE-R NEW (renamed from hunt-file CANDIDATE-Q to avoid Cap-CANDIDATE-Q collision)
- **P3** → `brain/Doctrine.md` Doctrine #34 enrichment (STRONG-composition tier + Composition-Multiplier-Strength axis)
- **P4** → DEFERRED (Clarity detector pack spec; tracked in hunt file for build trigger)
- **P5** → this row 38

### Row 39 — Filecoin Immunefi $150K (hunt `hunts/2026-05-26-filecoin-immunefi-gate1.md`)

| Field | Value |
|-------|-------|
| Program | Filecoin builtin-actors + lotus + ref-fvm (Rust + Go + FEVM Solidity) |
| Bounty | $150K Critical Immunefi |
| Brain overlap | **HIGH** — DC-7 sub-pattern NEW (cross-language enum repr), DC-9 sub-2, DC-13 sub-4 NEW (notification-callback notifee), Doctrine #34 dual-anchor confirmation |
| Layer 0 signals | Builtin-actors 8.5MB; lotus 77MB partial; ~6+ FIPs shipped post-2023 Oak audit (FEVM-era composition multiplier) |
| Substrate | FIRST storage-L1 substrate-class for Buzz watchlist (joins Cosmos/Polkadot/Clarity/Rust-Solana/EVM/Sui-Move/CosmWasm-Wasm; storage-L1-FVM is new) |
| Verdict | Gate-1-COMPLETE → Lead 1 (FIP-0109 self-notifee bypass) HOLD pending operator scope-triage query at `hunts/2026-05-25-filecoin-scope-triage-query.md` |
| EV | $9K-10.8K nominal (Gate 2 conditional on bytecode verification of v17+ miner CodeCID) |
| Re-evaluation | Watchdog speedrunner on commit-diff for `actors/miner/`, `actors/market/`, FIP additions, EVM precompile dir |

**Brain compounds landed (5 of 5 proposals C-Filecoin-1..5):**
- **C-Filecoin-1** → `brain/Patterns-Defense-Classes.md` DC-13 sub-4 NEW (notification-callback-admits-attacker-controlled-notifee)
- **C-Filecoin-2** → `brain/Doctrine.md` Doctrine #34 enrichment anchor 2 (Filecoin FEVM-era dual-anchor confirmation)
- **C-Filecoin-3** → `brain/Patterns-Defense-Classes.md` DC-7 sub-pattern NEW (cross-language enum repr divergence)
- **C-Filecoin-4** → this row 39
- **C-Filecoin-5** → `.claude/rules/standing-intake-protocol.md` Step 5.3 enrichment for FEVM-era Filecoin substrates

### Row 40 — Hydration HydraDX Immunefi $500K (hunt `hunts/2026-05-26-hydration-immunefi-gate1.md`)

| Field | Value |
|-------|-------|
| Program | Hydration (Substrate / Polkadot, 39 pallets, 73 assets) |
| Bounty | $500K Critical Immunefi, $1M historical paid |
| Brain overlap | **MEDIUM-effective** — HIGH on paper, MEDIUM after lens-by-lens verification (all primary anchors found DEFENDED) |
| Substrate | FIRST Substrate/Polkadot comprehensive Gate 1 entry for Buzz; net-new ecosystem (Substrate-class detector rotation requires manual lens-walk per Hydration P6 proposal) |
| Verdict | **Gate-1-MIXED → WATCHLIST ADD (not immediate Gate 2 dispatch)** — 3 CANDIDATE substrates filed (slip-fee inverse, route-MEV, conviction-vote hook); none reach Critical confidence |
| EV | $14,625 nominal — below Cantina mega-targets, below DISC-019 |
| Re-evaluation | Re-Gate-1 on PR merges to `pallets/hsm`, `pallets/liquidation`, `math/src/omnipool/slip_fee.rs`; ecosystem cross-pollination on Substrate Pashov / ChainSecurity advisory drops |

**Brain compounds landed/deferred (6 proposals P1-P6 — most non-actionable for brain edits, but lens-stack value preserved):**
- **P1-P3** → DEFERRED (Substrate-Ecosystem-Entry.md / CANDIDATE-SUBSTRATE-1/2 — would require dedicated Substrate substrate file; deferred pending 2nd Substrate Gate 1 anchor for promotion threshold)
- **P4** → this row 40
- **P5** → DEFERRED (Doctrine #35 Ecosystem Asymmetric Saturation Discount candidate — wait for 2nd ecosystem-first-touch anchor; promotion threshold not yet met)
- **P6** → DEFERRED (.claude/rules/standing-intake-protocol.md Substrate-skip clause — already implicit in current Step 5.6 manual-lens-walk discipline)

### Row 41 — JustLend DAO Tron Immunefi $50K (hunt `hunts/2026-05-26-justlend-immunefi-gate1.md`)

**JustLend was previously row 8 in the 2026-05-18 table with overlap=15 (L-?-M-?-L). Re-scored per Day 26 Gate 1 outcome to overlap=22 (M-?-H-?-M) reflecting DC-12 sub-7f elevation + Pattern D CEI elevation.**

| Field | Value |
|-------|-------|
| Program | JustLend DAO (Tron, Compound V2 fork) |
| Bounty | $50K Critical Immunefi, $20K total paid (payer-risk flag per Standing-Intake Step 1 — `$0-history zone P(acceptance)≈0.2`) |
| Brain overlap | **M-?-H-?-M (overlap=22)** — UP from L-?-M-?-L=15 — DC-12 sub-7f NEW (PriceOracleProxy strips staleness), DC-13 (CEI) elevated, Doctrine #34 anchor 4 (BUSD market added post-audit) |
| Verdict | **Gate-1-COMPLETE → C1 FORECLOSURE-RECEIPT** — 5/5 in-scope TRC20 underlyings verified NO HOOK via TronScan methodMap; CEI reentrancy via underlying receive-hook NOT EXPLOITABLE. C3 (first-mint inflation), C4 (TRC20-callback griefing), C5 (Doctrine #32 stale-substrate cadence flag) remain as low-EV candidates |
| EV | $1,575 nominal Gate 2 — LOW priority vs sibling targets; defer to 6-month rescan cadence |
| Re-evaluation | 6-month Doctrine #32 v1.1 rescan; trigger on any new market addition to JustLend pool |

**Brain compounds landed (5 of 5 proposals):**
- **#1** → `brain/Patterns-Defense-Classes.md` DC-12 sub-7f NEW (PriceOracleProxy-class wrapper strips staleness)
- **#2** → `brain/Doctrine.md` Doctrine #34 enrichment anchor 4 (BUSD-market-added-Feb-2023)
- **#3** → this row 41 (re-score from overlap=15 → 22)
- **#4** → `brain/Cross-Domain-Fragility-Laws.md` TRC20-callback-hook addition (Compound-V2-fork-on-TRON law)
- **#5** → `brain/Disclosure-Programs-Top-Tier.md` JustLend payer-history annotation

### Row 42 — ALEX Stacks Immunefi $100K (hunt `hunts/2026-05-26-alex-immunefi-gate1.md`)

| Field | Value |
|-------|-------|
| Program | ALEX Lab Foundation (Stacks Clarity, alex-v1 + alex-dao) |
| Bounty | $100K Critical Immunefi |
| Brain overlap | LOW — substrate dormant (HEAD frozen 743 days = XLink exploit day); dead-substrate-discount fires per ALEX P1 corollary |
| Substrate | SECOND Clarity Lane 1 anchor (after Stacks sBTC same day); validates parallel logic of Toly Percolator Bounty 5 v16 (Rust/Solana) for non-Solidity targets |
| Verdict | **Gate-1-FORECLOSURE-RECEIPT** — dead-substrate, no further dispatch |
| EV | $100 adj per dead-substrate-discount (EV_base $400 × 0.25 multiplier) |
| Re-evaluation | Reactivate on substrate-thaw signal (ALEX revival announcement / new audit / fresh commit) |

**Brain compounds landed/deferred (6 detector-pack proposals P1-P6 — most NON-actionable for brain edits, primary value = Clarity detector pack roadmap):**
- **P1** → DEFERRED (Doctrine #27 K corollary "Dead-Substrate Discount Multiplier" — DRAFT pending 2nd dead-substrate anchor for calibration validation, likely Yearn V2 or other zombie program)
- **P2** → DEFERRED (Operator-Brief-Reconciliation expansion: Substrate-Freshness Divergence — captured in hunt file, awaiting follow-up Operator-Brief intake to formalize)
- **P3** → DEFERRED (Layer 0 detector generalization Clarity-keyword pattern set — captured in hunt file as detector spec; ship trigger when Stacks bounty pipeline justifies ROI)
- **P4** → DEFERRED (Clarity-specific detector pack roadmap — 6 detector specs in hunt file; ship when (a) Stacks pipeline justifies, OR (b) 3rd Clarity Gate 1 dispatched)
- **P5** → DEFERRED (`brain/Lane1-Substrate-Coverage.md` catalog entry — would require new brain file; tracked here in row 42 as substrate-coverage anchor pending file creation decision)
- **P6 (implicit)** → this row 42 (Watchlist entry, the only direct-edit-actionable proposal)

---

_Post-v2.0 rows 37-42 Day-26-batch | 2026-05-26 | Ogie msg 7817 batch — 5-target hunting day + ALEX retrospective. Brain edits landed: Doctrine #34 enrichment (4 anchors + vendor-cadence anti-anchor + Strength axis) + Doctrine #35 NEW (Trust-Boundary Surface Asymmetry) + DC-7 sub-pattern NEW (cross-language enum repr) + DC-12 sub-7f NEW (PriceOracleProxy-class) + DC-13 sub-4 NEW (notification-callback notifee) + CANDIDATE-R NEW (deploy-bootstrap window) + Cross-Domain-Fragility-Laws TRC20-callback-hook law + Standing-Intake Step 5.3 FEVM-era + Solana-Rust CLMM-fork-family lens stack + External-Frameworks Raydium 4-audit precedent + Disclosure-Programs JustLend payer-history annotation. JustLend C1 FORECLOSURE-RECEIPT: full 5-token TRC20 underlying set verified NO HOOK via TronScan methodMap, C1 NOT EXPLOITABLE dismissed before Gate 2._

---

## v2.1 Addendum — Day 26 afternoon (2026-05-26 post-3-halt batch)

Three PRE-CLONE-HALT files filed afternoon 2026-05-26 (Across + dYdX V4 + Lombard) surfaced 7 operator-approved brain compounds. Across P1-P4 approved by Ogie msg 7844; dYdX V4 P1-P3 + Lombard P3 auto-approve (corpus-internal discipline improvements, not external-claim-bearing).

### Row 43 — Across V3 Immunefi $1.5M cap (HALTED-platform-ambiguity)

| Field | Value |
|-------|-------|
| Repo | `across-protocol/contracts` |
| Bounty | **HALTED** — $1.5M Immunefi (Buzz watchlist 2026-05-23) vs $1M self-hosted email `bugs@across.to` (across docs 2026-05-26) — likely platform migration mid-window |
| Layer 0 signals | Layer 0 NOT RUN (PRE-CLONE HALT) — HEAD commit `9ffb2ab26464` (2026-05-19) touches `ArbitraryEVMFlowExecutor` (token/balance/drain — Doctrine #34 anchor candidate); `pushed_at` 2026-05-26 TODAY |
| Brain overlap | **HIGH** — DC-6 (HubPool↔SpokePool cross-domain), DC-7 (depositV3↔fillRelay field-binding gap candidate), DC-9 sub-2 (HubPool owner-functions timelock candidate), CANDIDATE-A (canonical intent-based bridge — FIRST Buzz Gate 1 on intent-based-bridge sub-family; LiFi was aggregator-quote), CANDIDATE-O (fillRelayWithMessage composition callback), Doctrine #34 (ArbitraryEVMFlowExecutor NEW component post-OpenZeppelin-continuous-audit baseline — anchor candidate) |
| Substrate | Multi-substrate EVM Solidity + Solana SVM Rust/Anchor — substrate diversity multiplier applies; Buzz Solana lenses (CANDIDATE-G + DC-8) could fire on `svm_spoke` |
| gate1_status | **HALTED-platform-ambiguity** — Step 5 not executed; awaiting operator clarification on canonical disclosure path |
| Verdict | PRE-CLONE-HALT pending operator Option 1-4 routing |
| EV | $90K Scenario A (Immunefi $1.5M × 0.15 × 0.40 × 1.0) / $30K Scenario B (self-hosted $1M × 0.15 × 0.20 × 1.0) / $0 if cannot adjudicate |
| Re-evaluation | Trigger on operator routing OR when ArbitraryEVMFlowExecutor moves out of HEAD (Doctrine #34 anchor staleness check) |

**Hunt file:** `hunts/2026-05-26-across-immunefi-gate1-PRE-CLONE-HALT.md`

**Brain compounds landed (4 of 4 proposals P1-P4):**
- **P1** → this row 43
- **P2** → `brain/Doctrine.md` Doctrine #34 enrichment (Across V3 `ArbitraryEVMFlowExecutor` as NEW anchor candidate post-OpenZeppelin-continuous-audit baseline)
- **P3** → `brain/External-Frameworks.md` (single-firm-continuous-audit sub-pattern; Across as 2nd canonical anchor after Risk Labs UMA)
- **P4** → `brain/Platform-Migration-Log.md` NEW (Across is first canonical anchor for FROM-Immunefi TO-self-hosted migration class)

### gate1_status column schema proposal (Lombard P3 — captures dispatch-vs-corpus collision history)

**Proposal (deferred to v3 schema cycle, captured here for reference):** add `gate1_status` column to canonical crossmap row schema with enum:

- `OPEN-CANDIDATE` — no prior Gate 1, dispatch-eligible
- `FORECLOSED` — prior Gate 1 surfaced zero submission-grade candidates; defer indefinitely unless re-trigger conditions met
- `DELTA-RESCAN-DUE` — prior Gate 1 complete but HEAD has advanced past pinned commit; rescan only on diff
- `NEVER-SCANNED` — discovered watchlist target, no Gate 1 yet
- `HALTED-platform-ambiguity` — PRE-CLONE-HALT due to platform/scope/migration uncertainty (this addendum is the canonical anchor)
- `HALTED-disk-pressure` — PRE-CLONE-HALT due to Doctrine #32 v1.1.1 disk-budget block

Rationale: dispatching parent prompts asserted "no prior Gate 1" for dYdX V4 AND Lombard within <12h on 2026-05-26, both wrong (dYdX had 2026-05-23 WATCHLIST verdict; Lombard had 2026-05-21 foreclosure). Both Step 0 prior-corpus lookups caught the dispatches before clone work, but the upstream cause is that crossmap rows don't carry foreclosure status. Adding gate1_status closes the loop. **Pending operator approval for full v3 schema migration.**

_v2.1 Addendum: 2026-05-26 afternoon | Across V3 row 43 (HALTED-platform-ambiguity) per Across P1; gate1_status column proposal per Lombard P3 deferred to v3 schema cycle. Authority: Ogie msg 7844 (Across proposals approved) + dYdX/Lombard auto-approve (corpus-internal discipline)._

---

## v2.2 Addendum — Day 26 evening (2026-05-26 post-3-Gate-1 batch)

Three Gate 1 hunt files filed during 2026-05-26 evening hunting cycle against DB-verified active Immunefi bounties surfaced 9 operator-approved brain compounds. All proposals applied; this addendum adds 3 rows (Olympus + CoW + rhino.fi). Authority: Ogie msg 7846 hunting cycle + Lane 5 crawler ship.

### Row 44 — Olympus DAO (Olympus V3 / Bophades) Immunefi $3.33M no-KYC (hunt `hunts/2026-05-26-olympus-immunefi-gate1.md`)

| Field | Value |
|-------|-------|
| Program | Olympus DAO (Olympus V3 / Bophades — Default Framework: Kernel + 12 modules + multi-policy) |
| Bounty | $3,333,333 Critical Immunefi, no-KYC |
| Brain overlap | **MEDIUM-HIGH** — DC-9 sub-4 partial fire on Convertible Deposits (`[ASSUMED]`-scope); Doctrine #29 MIN-cap defense CONFIRMED PRESENT on BLVaultLido (deposit + withdraw legs, v1.1 two-sided pattern anchored); Doctrine #34 HIGH-SIGNAL (5 internal audit dirs, post-audit Convertible Deposits + V1 Migrator); DC-7 fires on C1 paired finding |
| Substrate | Solidity ^0.8.15/^0.8.24 EVM (Arbitrum/Avalanche/Boba/ETH/Fantom/Optimism/Polygon); 240 .sol files / 50,614 LOC src/ |
| Verdict | **Gate-1-SURFACED** — 2 carry-forward leads (C1+C2 paired ConvertibleDepositFacility.convert dust-mint + DepositManager.withdraw liability over-decrement, ASSUMED-scope pending scope-verify of full 72-asset Immunefi list); 2 foreclosure-receipts (C3 BLVault VaultReentrancyLib absence — architecturally mitigated by two-sided MIN-cap; C4 Operator.swap permissionless — Spearbit-audited + minAmountOut slippage protection) |
| EV | **$83K midpoint** ($125K optimistic if deposits + BLVault scope-confirmed; $41.7K conservative if only legacy 12 assets in-scope) |
| Re-evaluation | (a) Scope-verify ConvertibleDepositFacility + DepositManager addresses against full Immunefi 72-asset list — if confirmed in-scope → Gate 2 C1+C2 paired finding; (b) new audit completion on Convertible Deposits subsystem (kills Doctrine #34 composition lens fire); (c) any new yield-extension subclass added beyond BLVaultLido / BLVaultLusd / BLVaultManagerLido (Doctrine #34 anchor refresh) |

**Brain compounds landed (3 of 3 proposals):**
- **#1** → `brain/Patterns-Defense-Classes.md` DC-9 sub-pattern 5 NEW (Asset-vs-Receipt Accounting Asymmetry; Olympus C1+C2 paired anchor)
- **#2** → `brain/Platform-Migration-Log.md` Lane 5 crawler asset-address enhancement (72-asset Immunefi anchor; per-page scrape into `program_assets` table)
- **#3** → `brain/Doctrine.md` Doctrine #29 v1.1 amendment (two-sided MIN-cap defense; BLVaultLido 2nd implementer anchor)

### Row 45 — CoW Protocol Immunefi $1M no-KYC (hunt `hunts/2026-05-26-cowprotocol-immunefi-gate1.md`)

| Field | Value |
|-------|-------|
| Program | CoW Protocol (GPv2 settlement layer) |
| Bounty | $1,000,000 Critical Immunefi, no-KYC |
| Brain overlap | **LOW** — DC-7 FALSE-FIRE on EIP-712 type-hash (verified bytecode-correct via keccak256); DC-9 acknowledged-by-design (manager = DAO multisig); DC-12 N/A (no oracle); CANDIDATE-A/E/I/O/W/Z all N/A or solver-trust-OOS; Doctrine #27 FAIL (≥20 audits over 5 years across canonical firms); Doctrine #32 v1.1 FAIL (1844 days frozen, 0 dangerous-area changes) |
| Substrate | Solidity 0.7.6, ~2100 production LOC; scope SHA-pinned to `6ebbd810ff2da635fb6f88e9a15fde196f8c852a` (2021-04-08); Ethereum mainnet ONLY (Lane 5 over-read on Gnosis-chain) |
| Verdict | **Gate-1-FORECLOSED** — Doctrine #37 CANDIDATE Sub-Type A canonical anchor (repo+scope frozen; CoW Hooks framework + CoW AMM + ETHFlow + MEV Blocker shipped post-2022 but explicitly OFF scope per Immunefi page); 3 candidates (C1 impl-vs-proxy initialize, C2 setManager single-sig DC-9 sub-2 analogue, C3 partiallyFillable rounding CANDIDATE-E) all resolved OOS via Immunefi carve-outs (leaked-keys/solver-behavior/migration explicit OOS) |
| EV | **$375** (0.005 × $1M × 0.5 × 0.15 LOW overlap multiplier) — below $500 threshold to justify Gate 2 work |
| Re-evaluation | (a) Scope expands to Hooks framework / CoW AMM / ETHFlow / MEV Blocker (post-2022 substrate) → re-Gate-1 against new SHA; (b) new brain lens emerges on EIP-712 multi-scheme signature recovery (EIP-1271 verifier-address-from-bytes) or batch-settlement-with-arbitrary-interactions pattern; (c) scope-SHA bump announcement |

**Brain compounds landed (3 of 3 proposals):**
- **#1** → `brain/Doctrine.md` Doctrine #37 CANDIDATE NEW Sub-Type A canonical anchor (Audited-and-Frozen-and-Scope-Frozen → AUTO-FORECLOSE pre-clone, saves ~30 min per A-class re-intake)
- **#2** → `brain/Platform-Migration-Log.md` Lane 5 chain-list calibration (CoW Immunefi excludes Non-Ethereum Mainnet but Lane 5 DB lists [ETH, Gnosis] — over-read; **MERGED with rhino.fi #2**)
- **#3** → `brain/External-Frameworks.md` Selective-Coverage Defense Asymmetry refinement (carve-out → genuine-risk-surface pairs; CoW canonical anchor — solver-theft / settlement-DoS / migration OOS systematically excludes largest attack surfaces; sibling-lens to FT-CircuitBreaker family)

### Row 46 — rhino.fi (DVF / DeversiFi) Immunefi $2M no-KYC (hunt `hunts/2026-05-26-rhinofi-immunefi-gate1.md`)

| Field | Value |
|-------|-------|
| Program | rhino.fi (StarkEx-anchored authorized-keeper bridge; multi-substrate EVM Solidity + TON FunC) |
| Bounty | $2,000,000 Critical Immunefi, no-KYC |
| Brain overlap | **MEDIUM** — Pattern H direct fit (authorized-keeper bridge, already lensed in Architecture.md:60); DC-9 sub-2 confirmed (transferOwner single-tx no two-step on EVM, contrasts with TON two-step pattern); Doctrine #34 fires (DVFDepositContractBlast + DVFDepositContractApe yield-extension subclasses POST-audit); Doctrine #23 fires on orphaned `processedWithdrawalIds` mapping; Selective-Coverage MEDIUM-HIGH (depositPause exists, NO withdrawal-pause symmetric circuit-breaker); Doctrine #27 PASSES (5 audits — NOT in ≥20-audit saturated territory); Doctrine #32 v1.1 FAIL (audit_age 400d > 180d AND dangerous_area_changes_30d=0) |
| Substrate | Solidity 0.8.x EVM (10 Immunefi-listed chains: Arbitrum/BSC/Ethereum/Optimism/Polygon/Polygon-zkEVM/zkSync/Starknet/Tron/Base; 28 chains in README with identical bytecode on `0x5e023c31...` recurring address) + TON FunC (Quantstamp-audited); ~921 effective LOC (excluding stdlib) |
| Verdict | **Gate-1-WATCHLIST** — Doctrine #37 CANDIDATE Sub-Type B canonical anchor (repo-frozen 440 days, product-live with new chains shipping monthly + SuperEarn + Stablecoin 1:1); 8 candidates filed (C1-C8): C1 orphan state (not a bug), C2 single-tx ownership (audit-survived), C3 unbounded loop (onlyOwner — not exploitable), C4 Blast yield composition (economically negligible YIELD-LOSS, not security), C5 deposit-pause TON-vs-EVM asymmetry (DC-7 sub-pattern Cross-Language Guard-Coverage NEW anchor; LOW-MEDIUM severity, incident-response framing), C6 withdrawVmFunds no-modifier (intentional permissionless sweep), C7 createVMContract idempotency (atomic with initialize), **C8 depositWithPermit + commitmentId binding (POSSIBLY MEDIUM, requires off-chain UI flow recon to upgrade [ASSUMED] → [INSPECTED])** |
| EV | **$20,000** (0.04 × $2M × 0.5 × 0.5 MEDIUM overlap multiplier); operator-decision point on C8 — fund 1-2hr off-chain UI recon to determine commitmentId-to-msg.sender binding; if loose → Gate 2 with M-severity framing (EV $5K-$10K) |
| Re-evaluation | (a) Scope expansion to UserWallet / CrossSwap family (StarkEx settlement-side contracts); (b) new yield-composition chain integration (post-Blast/Ape); (c) public PM on operator-key compromise; (d) off-chain UI recon resolves C8 to [INSPECTED] loose-binding → re-Gate-2 |

**Brain compounds landed (3 of 3 proposals):**
- **#1** → `brain/Doctrine.md` Doctrine #37 CANDIDATE NEW Sub-Type B canonical anchor (Audited-and-Frozen-but-Product-Live → PROCEED with composition lens; refines CoW P1 with A/B sub-types per joint anchor)
- **#2** → `brain/Platform-Migration-Log.md` Lane 5 chain-list calibration (10 Immunefi vs 28 README deployed, ratio>1.5× ambiguity flag; **MERGED with CoW #2** into single Platform-Migration-Log operator-action item)
- **#3** → `brain/Patterns-Defense-Classes.md` DC-7 sub-pattern NEW Cross-Language Guard-Coverage Asymmetry (rhino.fi TON-vs-EVM deposit-pause anchor; high-EV cross-pollination targets: Wormhole / LayerZero / ZetaChain / Stargate V2 / Hop / Synapse)

---

_v2.2 Addendum: 2026-05-26 evening | rows 44 (Olympus MEDIUM-HIGH, EV $83K, C1+C2 pending scope-verify) + 45 (CoW FORECLOSED, $375 EV, Doctrine #37 Sub-Type A canonical anchor) + 46 (rhino.fi WATCHLIST, EV $20K, C8 operator-decision-point, Doctrine #37 Sub-Type B canonical anchor). 9 of 9 brain compounds applied (1 duplicate-merged: Lane 5 chain-list calibration surfaced in CoW #2 AND rhino.fi #2). Authority: Ogie msg 7846 hunting cycle + Lane 5 crawler ship. Companion: `hunts/2026-05-26-brain-proposals-applied-ledger-v3.md`._

---

## v2.3 Addendum: 2026-05-27 PancakeSwap Infinity (V4) Multi-Anchor Scout

| # | Target | Platform | Cap | Status | Primary lens | Secondary lenses | EV | Notes |
|---|---|---|---|---|---|---|---|---|
| 47 | PancakeSwap Infinity Core (V4) | Immunefi | $1M Critical | Gate 1 COMPLETE 2026-05-27 — Gate 2 GATED on B-1 Balancer outcome | CANDIDATE-O slippage double-count analog (B-1 cross-pollination) | DC-9 sub-1/sub-2 (Vault.registerApp + Bin owner-setters no-timelock) + Pattern I (hook-call asymmetry) + DC-12 partial (protocolFeeController staticcall) | $40K base, elevated to $75K+ if B-1 confirms tonight | Same singleton-vault + hook-based architecture family as Uniswap V4 / Balancer V3. CORE confirmed; periphery (Universal Router) NOT cloned due to disk halt 94%. P-1 finding hinges on Infinity Router slippage-check placement (pre- vs post-hookDelta). Repo: `pancake-v4-core` HEAD. Gate 1 file: `hunts/2026-05-27-pancakeswap-v4-immunefi-gate1.md`. |

### Multi-Anchor Hypothesis (B-1 generalization)

If Balancer B-1 confirms (BatchRouterHooks per-step slippage zero + hookFee absorption), the SAME finding class is testable on Pancake Infinity within 4-6h (clone periphery + Foundry fork BSC). If B-1 disconfirms, both anchors likely disconfirm — singleton-vault hook architectures converge structurally. Pancake is the second-anchor proof-or-disproof for whether the hook-based AMM class has the slippage-double-count exploit primitive.

### Open Questions queued

- OQ-PCK-1: Does Infinity Router enforce slippage against pre-hookDelta or post-hookDelta `delta`? (load-bearing for P-1 promotion to Gate 2)
- OQ-PCK-2: Does Pancake Infinity Universal Router accept per-route `minAmountOut=0`? (sibling to Balancer B-1 BatchRouter question)

_v2.3 Addendum: 2026-05-27 00:30 UTC | row 47 PancakeSwap Infinity Gate 1 complete | multi-anchor scout for CANDIDATE-O generalization | autonomous dispatch per `.claude/rules/autonomy-boundary.md` | Companion: `hunts/2026-05-27-pancakeswap-v4-immunefi-gate1.md`_

[^stader-g1]: Stader row 4 promoted from priority 6 → priority 2 on 2026-05-27 post Gate 1. Findings: Doctrine #29 v1.1 MIN-cap defense ABSENT (Stader is NEW NEGATIVE-anchor candidate, not 2nd PRESENT-anchor); DC-12 monotonic-oracle staleness check MISSING in `StaderOracle.getPORFeedData` (HIGH-severity G2-CAND-1, paste-ready); CANDIDATE-O asymmetric MIN-cap in `UserWithdrawalManager.finalizeUserWithdrawalRequest` (G2-CAND-2, MEDIUM/HIGH); DC-9 sub-4 asset-vs-receipt accounting skew in same function. EV ~$60K. Gate 2 DEFERRED until Balancer B-1 PoC resolves. New OQT Q-36 logged. Companion: `hunts/2026-05-27-stader-ethx-immunefi-gate1.md`.

_v2.4 Addendum: 2026-05-27 ~00:55 UTC | row 4 Stader ETHx Gate 1 complete | autonomous dispatch per `.claude/rules/autonomy-boundary.md` | priority promoted 6 → 2 (post-Balancer-B-1) | OQT v1.2 → v1.3 (Q-36 added)_

---

## v2.5 Addendum — Balancer V3 B-1 Gate 2 PoC Result (2026-05-27 ~00:35 UTC, post-dispatch)

**Outcome: PoC CONFIRMS the slippage-double-count + StableSurgeHook approximation-drift composition in NON-EXTREME parameter regime.**

### Row 48 — Balancer V3 BatchRouter B-1 Gate 2 Foundry PoC

| # | Target | Platform | Cap | Status | Primary lens | Confirmation evidence | EV | Paste-ready |
|---|---|---|---|---|---|---|---|---|
| 48 | Balancer V3 BatchRouterHooks + StableSurgeHook | Immunefi | $1M Crit / $250K High | Gate 2 PoC CONFIRMS, paste-ready HOLD for operator | CANDIDATE-O (slippage double-count) + WONTFIX-non-extreme-regime | 2-test Foundry `BatchRouterSlippageDoubleCountPoC.t.sol` both PASS against HEAD `80fd29ce4eb6`. 5,000 DAI 2-hop = 1.09% composed slippage vs 0.55% single-hop on same surge pool. Production-default params (30% threshold, 200 amp, 70/30 imbalance). | $50-250K range (severity High recommended, escalation argument for Critical) | `data/lane1/gate2-clones/balancer-b1-batchrouter-slippage-paste-ready-v2.md` |

### Foreclosure-row correction (line 314)

The prior "Pattern J FORECLOSED — Balancer V3" entry (line 314) treated `BatchRouterHooks.sol:127` per-step minOut zeroing as a defended substrate. PoC demonstrates the foreclosure was INCOMPLETE — the per-step zero IS a real attack substrate when composed with StableSurgeHook's acknowledged approximation. **Foreclosure-row 314 should be updated from "Pattern J FORECLOSED" to "Pattern J PARTIAL — load-bearing in StableSurgeHook composition surface".** Deferred-edit: surfaces on next maintenance loop (this v2.5 addendum is the authoritative correction record).

### Downstream gate-resolution

- **Row 47 (PancakeSwap Infinity)**: B-1 CONFIRMS → second-anchor cross-pollination is GO. Pancake Infinity periphery clone + Universal Router slippage-check inspection now unblocks (4-6h estimate per v2.3). OQ-PCK-1 + OQ-PCK-2 should be prioritized.
- **Row 4 (Stader ETHx)**: B-1 CONFIRMS → Stader Gate 2 deferred-gate releases. G2-CAND-1 (DC-12 staleness) and G2-CAND-2 (CANDIDATE-O asymmetric MIN-cap) can now proceed independently.

### PoC environment note

- pnpm absent → yarn berry 4.12 used (engines mismatch ignored by Berry default)
- Node 22.22.1 used despite package.json requiring `>=24` (Berry doesn't gate)
- TMPDIR override required (`/tmp` host-restricted to claude user)
- Peak disk during yarn install: 94% — required cleanup to return to 85% baseline
- Bytecode pin against deployed BatchRouter `0x136f1Ee37Ec24bD4f57DBC9D78fb6f4c2db478d1` DEFERRED (5 public RPCs either rate-limited or returned `0x`; needs operator-supplied premium RPC). Paste-ready evidence-grade footer tags this as `[ASSUMED]`.

_v2.5 Addendum: 2026-05-27 ~00:35 UTC | row 48 Balancer V3 B-1 Gate 2 PoC CONFIRM | autonomous dispatch per `.claude/rules/autonomy-boundary.md` | unblocks row 47 (Pancake) + row 4 (Stader) Gate 2 work | foreclosure-row 314 correction noted_

[^stader-g2]: Stader row 4 Gate 2 dispatch 2026-05-27 — **FORECLOSED-ALL** at Phase 0 audit-dedup. G2-CAND-1 (DC-12 PoR staleness) dup of C4 M-14 + Halborn HAL-09 (both VALID 2023). G2-CAND-2 (UserWithdrawalManager MIN-cap) re-analyzed as canonical LST design feature (Lido/RocketPool pattern), NOT a bug. G2-CAND-3 (single-source oracle) partial-DUP of Halborn HAL-11 + SigmaPrime ETHX2-07. G2-CAND-4 (`depositETHOverTargetWeight`) dup of C4 M-09. G2-CAND-5 self-flagged OOS. Stader HEAD 9d4a921 (5+ months stale × 3 audit firms × 9 reports = exhausted paste-ready surface). EV-rank dropped 2 → PARK. Phases 1-5 (env + PoC + bytecode + paste-ready) NOT executed. Foreclosure receipt: `hunts/2026-05-27-stader-ethx-gate2-foreclosure.md`. OQT v1.4 → v1.5 (Q-36 superseded → Q-39 added with proposed EV-multiplier corollary for heavily-audited stale targets; Q-37/Q-38 slots already used by Balancer B-1 Gate 2).

_v2.6 Addendum: 2026-05-27 ~01:25 UTC | row 4 Stader ETHx Gate 2 FORECLOSED-ALL via Phase 0 audit-dedup | autonomous dispatch per `.claude/rules/autonomy-boundary.md` | 25min to foreclosure verdict | Phases 1-5 saved (would have produced instant-DUP submission) | Q-37 EV-multiplier proposal queued for operator decision_

## v2.7 Addendum: 2026-05-27 PancakeSwap Infinity P-1 Gate 2 — Foundry PoC CONFIRMS (Multi-Anchor Pattern)

### Row 47 — Pancake Infinity Router P-1 Gate 2 Foundry PoC

| # | Target | Platform | Cap | Status | Primary lens | Confirmation evidence | EV | Paste-ready |
|---|---|---|---|---|---|---|---|---|
| 47 (Gate 2) | PancakeSwap Infinity Router (CL + Bin multi-hop loops) | Immunefi | $1M Critical | Gate 2 PoC CONFIRMS, paste-ready HOLD for operator | CANDIDATE-O (slippage double-count) — DIRECT analog of Balancer B-1 | 3-test Foundry `InfinityRouterSlippageDoubleCountPoC.t.sol` all PASS against `infinity-periphery` HEAD `f39aef4a1be6`. 50 ether 2-hop = 1.195% composed slippage vs 0.600% single-hop on identical 25-bps hook fee + 5% end-to-end envelope. Affected: `CLRouterBase._swapExactInput`/`_swapExactOutput` + `BinRouterBase._swapExactInput`/`_swapExactOutput` (4 multi-hop loops, all share floor-absent shape). | $50-250K range (severity High recommended) | `data/lane1/gate2-clones/pancake-p1-infinity-router-slippage-paste-ready-v2.md` |

### Phase 0 audit-dedup verdict (CLEAR)

- **Cyfrin** (`infinity-universal-router/audits/Cyfrin.pdf`) — [M-2] "MEV Bots bypass slippage in Universal Router's stable swap" is a DIFFERENT finding: targets `StableSwapRouter::stableSwapExactInput` balance-check vs delta-diff, fixed in PR 22. Does NOT touch CL/Bin router multi-hop loop. **Not a duplicate.**
- **Hexens, OtterSec, Zellic** (`infinity-periphery/audits/`) — all 3 audited periphery scope; none flagged multi-hop slippage gap in CL/Bin router loops. Hexens covers `validateMaxIn` liquidity-side + Bin `idSlippage` ergonomics. OtterSec general findings. Zellic 2 informational findings on Bin position manager. **No dedup hit.**

P-1 is a fresh finding — the multi-hop loop pattern was visible to 4 audit firms but not flagged.

### Multi-anchor pattern verdict — CANDIDATE-O CONFIRMED ACROSS 2 ANCHORS

| Anchor | Repo | Floor-absence mechanism | Hook composition | PoC leak (1-hop vs 2-hop) |
|---|---|---|---|---|
| Balancer V3 (B-1) | `balancer-v3-monorepo` | `BatchRouterHooks.sol:122-127` explicit `minAmountOut = 0` per non-last step | `StableSurgeHook` approximation drift | 0.55% → 1.09% (~2x) |
| Pancake Infinity (P-1) | `infinity-periphery` | `CLRouterBase._swapExactInput:40-65` loop has NO per-step floor check at all (no zero-knob even exists) | `CLHooks.afterSwap` positive hookDelta (`delta = delta - hookDelta`) | 0.60% → 1.195% (~2x) |

Two independent production deployments by two unrelated teams converge on the same structural shape. Q-41 (OQT v1.7) queued for **DC-13 promotion** operator decision. Proposed name: "End-of-Path-Only Slippage Composition With Per-Hop Hook Deltas".

### Bytecode-verification status

- Deployed UniversalRouter at `0xd9c500dff816a1da21a48a732d3498bf09dc9aeb` on BSC confirmed live via `eth_getCode` (48702 bytes, non-empty). Address from `infinity-universal-router/deploy-addresses/bsc-mainnet.json`.
- Local build of `infinity-universal-router` did not complete within verification window (FFI dep + 20k optimizer-runs; deferred per Balancer B-1 precedent). SHA-level bytecode pin tagged `[ASSUMED]` in paste-ready footer.

### Source SHAs (paste-ready audit anchor)

- `infinity-periphery/src/pool-cl/CLRouterBase.sol` `4d38ad2c5f9080fd847ffb2681b0c8ca7caf5117ddf7997f2a31d20d4a20aeab`
- `infinity-periphery/src/pool-bin/BinRouterBase.sol` `c8eb71478353f35e074f4c800fc022d03a2a77e1237a0bb4d0e581b3d6a23cf4`
- `infinity-core/src/pool-cl/libraries/CLHooks.sol` `63847a57de7914b039156626ae34bbe1675af0df9ccfde3defb80c8ddcc48f8f`

### Downstream resolutions

- **Row 48 (Balancer V3 B-1)**: companion-anchor confirmed; both rows now eligible for parallel operator-gated submission. Multi-anchor argument woven into Pancake paste-ready §Historical Context.
- **CANDIDATE-O promotion to DC-13**: Q-41 OPEN, awaiting operator decision on `Patterns-Defense-Classes.md` amendment.

### PoC environment note

- Forge 1.5.1-stable from `/home/claude-code/.foundry/bin`
- Submodules initialized via `git submodule update --init --recursive --depth 1`
- TokenFixture mints only 100 ether per token; PoC top-up adds 1M ether per token to support 3 hook-bound pool initializations
- Hook permissions bitmap: `HOOKS_AFTER_SWAP_OFFSET=7` + `HOOKS_AFTER_SWAP_RETURNS_DELTA_OFFSET=11` → bitmap `0x880` + tickSpacing=1 (`0x10000`) → `parameters = 0x10880`
- Hook closes its own credit via `vault.take(unspecCurrency, address(this), hookFeeAbs)` to keep the Vault solvency invariant satisfied
- Disk during PoC build: 84% / 6.0G free (within 88% halt threshold)

_v2.7 Addendum: 2026-05-27 ~02:25 UTC | row 47 PancakeSwap Infinity Gate 2 PoC CONFIRMS | autonomous dispatch per `.claude/rules/autonomy-boundary.md` | multi-anchor confirmation: CANDIDATE-O now confirmed across Balancer V3 + Pancake Infinity | DC-13 promotion queued in Q-41 (OQT v1.7) for operator decision | Phase 0 audit-dedup verdict CLEAR (Cyfrin [M-2] not-a-dup, Hexens/OtterSec/Zellic no multi-hop slippage finding)_

---

### Row N+1 — DeFi Saver (Immunefi $350K Critical, no KYC)

**Date probed:** 2026-05-27 (Gate 1 + Gate 2 same-day)
**Status:** **FORECLOSED (Track A structural NEGATE) + SOFT-FORECLOSED (Track B Centralization-Accepted)**
**Gate 1 file:** `hunts/2026-05-27-defisaver-immunefi-gate1.md`
**Gate 2 receipt:** `hunts/2026-05-27-defisaver-c1-gate2-foreclosure.md`
**Repo clone:** `.work-clones/defisaver-v3/` (52MB, RETAINED for CANDIDATE-3 future re-probe)
**Lens-target matrix (final):**

| Lens / Candidate | Hits | Verdict |
|---|---|---|
| CANDIDATE-K (state-not-invalidated cross-call) — *WithSig family | 7 hits | **STRUCTURAL NEGATE** — pure pass-through, EIP712 enforces signer-binding |
| DC-7 — Validating-Field ≠ Consuming-Field | 3 hits (pause-asymmetry / L2 / *WithSig) | **NEGATE** — no validating-field exists on *WithSig wrappers |
| DC-9 sub-2 — Privileged State Mutation Without Defense-in-Depth | 2 hits (AdminVault + DFSRegistry.revertToPreviousAddress) | **SOFT FORECLOSE** — AdminVault.admin = Gnosis Safe 3-of-6 (5-year operational, OOS clause); revertToPreviousAddress gated on admin compromise (low EV) |
| Doctrine #34 sub-class b (audit-regression family-widening) | STRONG MATCH on *WithSig family | **NEGATE downstream** — family is post-audit but the substrate has no exploitable surface |
| CANDIDATE-O (slippage double-count) — exchangeV3 | indirect | NOT INVESTIGATED |

**Re-probe trigger conditions:**
- AdminVault.admin Gnosis Safe threshold drops below 3 OR signer count drops below 5 → re-escalate DC-9 sub-2
- Any new action contract added to `actions/aaveV4/`, `actions/morpho-blue/`, `actions/spark/` that takes LOCAL action beyond pass-through (i.e., extracts fields from the signed struct for downstream parameter resolution) → CANDIDATE-Q refined-hypothesis re-anchor opportunity
- DFSRegistry event log enumeration not done — CANDIDATE-3 re-probe defer until disk allows + 2nd anchor for revertToPreviousAddress pattern emerges

**Brain compounds from this row:**
- Doctrine #38 NEW: Pure Pass-Through *WithSig Wrappers Are STRUCTURAL FORECLOSE (Doctrine v3.8.2)
- DC-9 sub-2 DEFENSE PATTERN 2nd anchor: Multisig-with-Threshold-≥3-of-≥5 = Centralization-Accepted (Patterns v2.5)

---

_v2.8 Addendum: 2026-05-27 ~22:00 UTC | row N+1 DeFi Saver Gate 2 FORECLOSED (both tracks) | autonomous dispatch per `.claude/rules/autonomy-boundary.md` | structural NEGATE on EIP712 pass-through wrapper class — saves ~2-4h Foundry investment | DC-9 sub-2 DEFENSE PATTERN 2nd anchor lands (Patterns v2.5 — multisig-with-threshold rule) | Doctrine #38 NEW STRUCTURAL FORECLOSE class lands (Doctrine v3.8.2)_

---

## v2.9 Addendum: Kiln Immunefi v2 DEDUP-FORECLOSURE-RECEIPT (2026-05-27 22:09 UTC)

Step 0.5 short-circuit triggered — no clone spent. Dispatched per `.claude/rules/autonomy-boundary.md` autonomous next-target selection.

| # | Target | Cap | Scope | Brain overlap | Verdict | Receipt |
|---|--------|-----|-------|----------------|---------|---------|
| N+2 | **Kiln On-Chain v2** (Immunefi) | $500K Critical (KYC REQUIRED) | 13 contracts: Nexus + Coinbase Cloud Pool×4 + Kiln Pool×2 + 3 hatchers | HIGH on paper, but canonical substrate (`liquid-collective/liquid-collective-protocol`) already FORECLOSURE-WITH-RECEIPT at T-3 days (Kiln V1 Cantina row 3 above). 13 contracts are deployment-wrappers/hatchers around the canonical Nexus. | **DEDUP-FORECLOSURE-RECEIPT (Step 0.5)** — Day 27 compound stack REINFORCES all prior receipts: Doctrine #27 Corollary B + Sub-rule #27c (frozen-substrate 2.5yr + Halborn + Spearbit + Certora FULL FV harness with conf/+harness/+applyHarness.patch in-repo) + Doctrine #36 PERMANENT (substrate covered T-3) + Doctrine #37 Sub-Type B (LsETH mainnet via Nexus) + Doctrine #38 PARTIAL HIT (hatchers + per-operator pools = pure pass-through wrappers, NOT substantive logic surfaces). Operator brief said "Kiln on-chain v1 / $1M / NO KYC" — live Immunefi page = v2 only, $500K, KYC REQUIRED. EV $1,400 post-discount, below every threshold. | `hunts/2026-05-27-kiln-immunefi-gate1.md` |

**Sub-rule #27c canonical-anchor confirmation:**

Liquid Collective LsETH = **canonical anchor** for "frozen-substrate saturation" (mirrors Paxos PYUSD/USDP stablecoin substrate). Criteria met:
- 2.5yr mature primitive (since 2023)
- 3 top-tier firms: Halborn + Spearbit + Certora
- Certora **FULL FV** harness committed in-repo (`conf/`+`harness/`+`applyHarness.patch`)
- Both PDF channel (Notion audit catalog) + in-source channel (canonical GH repo) crawled at T-3 (2026-05-24) and T+3 (2026-05-27)
- Identical receipt structure both crawls → frozen-substrate predicate **CONFIRMED**

**Cross-platform deployment pattern (Doctrine #38 PARTIAL HIT):**
- 13 Immunefi v2 contracts = 6 substantive logic surfaces (Nexus core) + 7 deployment-wrappers (4 Coinbase Cloud Pool instances + 2 Kiln Pool instances + 1 hatcher class)
- The 7 wrappers are SAME-PATTERN re-deployments differentiated only by operator address → Doctrine #38 STRUCTURAL FORECLOSE applies to wrappers
- Validates "Pure Pass-Through *WithSig Wrappers" generalizes to "Pure Pass-Through Per-Operator Pool Re-Deployments"

**Validation event: Step 0.5 short-circuit reliability:**
- 2 same-day demonstrations on 2026-05-27 (Paxos T+3 + Kiln T+3)
- Both REINFORCE prior verdicts, neither unlocks new angle
- Confirms Step 0.5 short-circuit is reliable mechanism at T+3 days when Day 27 compound stack fully primed
- Open Questions Tracker Q-NEW: at what T+N does compound stack lose reinforcement strength? (suggests Day-45 retest as boundary probe)

_v2.9 Addendum: 2026-05-27 ~22:15 UTC | row N+2 Kiln Immunefi v2 DEDUP-FORECLOSURE-RECEIPT | Step 0.5 short-circuit no-clone-spent | LsETH = canonical Sub-rule #27c anchor | Doctrine #38 generalizes to per-operator pool wrappers | 2 same-day T+3 short-circuit demonstrations validate protocol reliability_

---

## v2.10 Addendum: Veda Immunefi T+5 DEDUP-FORECLOSURE-RECEIPT (2026-05-27 22:30 UTC)

5-channel Step 0.5 convergence (prior submission ledger + Audit-Reports library + in-source HEAD probe + live Immunefi STATUS + receipt-window age). No clone spent.

| # | Target | Cap | Scope | Brain overlap | Verdict | Receipt |
|---|--------|-----|-------|----------------|---------|---------|
| N+3 | **Veda BoringVault** (Immunefi) | $1M Critical (KYC) | 52 assets — EVM `Se7en-Seas/boring-vault` + SVM `veda-labs/boring-vault-svm` | HIGH (DC-7 Manager-Merkle/Decoder textbook + CANDIDATE-I/J/A + DC-9 + DC-12 + CANDIDATE-O + CG) — but Step 0.5 ledger probe surfaced DISC-015 CLOSED_OOS 2026-05-20 + DISC-015b DUP-of-#64307 2026-05-22 (BoringVault Manager, same finding, prior reporter won race) | **DEDUP-FORECLOSURE-RECEIPT (Step 0.5)** — 5-channel convergence on MAXIMUM saturation: EVM HEAD `0e23e7f` 525d stale + SVM HEAD `450cfd8` 275d stale + 4 firms × 14+ audits + 0xMacro continuous re-audit cadence + T+5 days post DISC-015b DUP. The most architecturally-obvious DC-7 surface (BoringVault Manager) was already enumerated by #64307. EV post-discount ~$750 (Doctrine #37 Sub-B 0.30× + Doctrine #27c frozen-substrate 0.50× + saturation 0.10×). | `hunts/2026-05-27-veda-immunefi-gate1.md` |

**Brain compounds from this row:**
1. **Doctrine #37 Sub-Type B → PERMANENT** (3 anchors: rhino.fi + Gains Network + Veda) — see Doctrine.md edit
2. **Doctrine #27c frozen-substrate multiplier formalization** (pending Doctrine.md edit) — HEAD >120 days stale + audit-saturation HIGH → 0.50× compound multiplier; 2-anchor evidence base (LsETH/Kiln + Veda BoringVault)
3. **Veda re-activation watchdog cron spec** (queued, project memory): add `Se7en-Seas/boring-vault` to commit-diff watchdog; trigger on new `*DecoderAndSanitizer.sol` / `Teller*.sol` / `*Solver*.sol` PRs to fire fresh-module Gate 1 within 0xMacro pre-audit ~5-10 day window
4. **Standing Intake Step 0.5 5-channel codification** (queued, rule file edit): formalize the 5 channels (brain ledger + Audit-Reports + in-source HEAD + live program-status + receipt-window age) as a checklist for `.claude/rules/standing-intake-protocol.md`

**Validation event — THREE same-day Step 0.5 receipts:**

Day-27 evening now has **three back-to-back Step 0.5 short-circuit successes**:
- Paxos T+3 (Cantina) — Day-27 stack REINFORCE
- Kiln T+3 (Immunefi) — Day-27 stack REINFORCE
- Veda T+5 (Immunefi) — 5-channel ledger+audits+HEAD+status+age convergence

Three demonstrations in <2 hours. Validates the Cross-Pollination-Log Section 10 thesis: the compound-engine positive feedback loop is OPERATIONAL — brain compounds discount-arbitrage future re-dispatches into 10-min receipts, freeing dispatch capacity for FRESH-substrate targets.

_v2.10 Addendum: 2026-05-27 ~22:30 UTC | row N+3 Veda Immunefi DEDUP-FORECLOSURE-RECEIPT (5-channel) | Doctrine #37 Sub-Type B PROMOTE PERMANENT (3 anchors) | 3 same-day Step 0.5 demonstrations | next-target pivot to FRESH-substrate Top-5 (cap Immunefi $1M, 2026-05-08 HEAD)_

---

## v2.11 Addendum: Cap (cap-labs) Gate 1 — PROCEED + Platform Correction (2026-05-27 22:35 UTC)

**FIRST PROCEED verdict in Day 27 night cycle.** Pivot from saturated Top-5 to FRESH substrate paid off. Platform correction is the highest-impact finding.

| # | Target | Cap | Platform-as-briefed | **Platform-actual** | Scope | Brain overlap | Verdict | Receipt |
|---|--------|-----|---------------------|---------------------|-------|----------------|---------|---------|
| N+4 | **Cap (cap-labs / cap.app)** | $1M USDC Critical | Immunefi (operator brief) | **Sherlock #114 LIVE since 2025-10-24** (all 4 Immunefi URLs 404) | cap-contracts HEAD `7254ed0` 2026-04-29 = **FRESH (~28d)** | HIGH (DC-7 TOTP↔Delegation H + CJ H + CANDIDATE-J Point-5 family + Pattern E + DC-9 sub-2) | **PROCEED-DOWN-TO-GATE-2** | `hunts/2026-05-27-cap-immunefi-gate1.md` (29KB) |

**Bounty platform correction (anchors INFO #19 2nd-anchor in Contradictions-Register v1.6):**
- Brief said: Immunefi
- Live programs verified via WebFetch: 4 Immunefi URLs 404 (`/capapp/`, `/cap-labs/`, `/capmoney/`, `/cap/`)
- Live program found: **Sherlock #114**, $1M USDC, LIVE since 2025-10-24
- Substrate identical: `cap-contracts` HEAD `7254ed0` 2026-04-29

**Top findings (5, R8-tagged [INSPECTED]):**

| # | Finding | DC/CAND lens | Novel% | EV-tier | PoC path |
|---|---------|---------------|--------|---------|----------|
| 1 | `EigenOperator.advanceTotp()` permissionless mutator + EigenLayer-withdrawal stale-restaker race | DC-7 H | **~35%** | $15K-$50K | Foundry + mainnet fork + EigenLayer DelegationManager (4-6h budget) |
| 2 | `BorrowLogic.realizeRestakerInterest()` lossy `lastRealizationTime = block.timestamp` | CANDIDATE-J Point-5 (Sky structural sibling) | ~25% | $5K-$30K | Lossy-truncation invariant check |
| 3 | `PriceOracle` per-asset staleness + Vault/Lender pause-asymmetry vs Oracle no-pause | CJ H + Pattern E | ~30% | $10K-$40K | Asymmetric pause/staleness Foundry tests |
| 4 | `_authorizeUpgrade(checkAccess(bytes4(0)))` AccessControl role-binding dep | DC-9 sub-2 | ~10% | known-centralization, low-pay | Etherscan role-verify |
| 5 | `Delegation.slashTimestamp()` `block.timestamp - 1` decrement edge | DC-9 / edge-case | ~8% | likely-Recon-covered | None |

**Saturation tier:** TIER-A SATURATED — 9 audits / 7 firms (Zellic + Trail of Bits + Electisec + Spearbit×2 + Recon + Sherlock + Certora EigenAVS + Octane). Audit-saturation multiplier ≈ 0.20.

**EV post-discount:**
```
EV_raw     = 0.15 × $1M × 0.5 × 1.0 = $75K
Discount   = audit-saturation (×0.20) × substrate-coverage (×0.50) = ×0.10
EV_final   = $7,500 (realistic range $5K-$15K)
```
Matches Veda agent's pre-Gate-1 estimate. Above $5K floor. Cap Gate 2 GREEN.

**Doctrine #38 NEGATIVE worked-example:** `advanceTotp()` is the OPPOSITE pattern from Doctrine #38 (Pure Pass-Through *WithSig STRUCTURAL FORECLOSE) — it is an **unauthenticated setter** (no signature, no caller-side decision), not a pass-through wrapper. Doctrine #38 does NOT apply, surface IS hunting-eligible. Use as **boundary anchor** when Doctrine #38 borderline triggers in future hunts.

**Brain compounds (this row):**
1. Contradictions-Register INFO #19 → 2nd anchor (Cap platform discrepancy), version-bump to v1.6 — DONE
2. Doctrine #37 PERMANENT — NOT updated (Cap is PROCEED not Sub-Type B; cap-contracts FRESH 28d)
3. intake-log.md row append — DONE
4. Doctrine #38 boundary anchor (advanceTotp NEGATIVE example) — pending Doctrine.md edit
5. Watchlist v2.11 row — DONE (this row)

**Next-action queue:**
- Cap Gate 2 PoC on Finding 1 (advanceTotp + EigenLayer withdrawal stale-restaker interaction) — highest novelty, only finding with paste-ready bounty potential at TIER-A saturation. Budget 4-6h Foundry + mainnet fork + EigenLayer DelegationManager.
- Clone kept at 9.4M, well under 87% threshold — preserved for Gate 2.

_v2.11 Addendum: 2026-05-27 ~22:35 UTC | row N+4 Cap Gate 1 PROCEED-DOWN-TO-GATE-2 | platform correction: Immunefi (briefed) → Sherlock #114 (live) | FIRST PROCEED in night cycle after 3 same-day DEDUP-FORECLOSURE-RECEIPTs | EV $5-15K post-discount, advanceTotp Finding 1 = highest paste-ready candidate_

---

## v2.12 Addendum: Cap Findings 1+3 BOTH NEGATED — skip remaining Cap findings (2026-05-27 22:55 UTC)

| Finding | Verdict | Mechanism | Time | Hunt receipt |
|---------|---------|-----------|------|---------------|
| F1 (advanceTotp + EigenLayer race) | NEGATED | DC-7 EXCLUSION (validating-field = consuming-field via deterministic derivation) + EigenLayer's `approverSaltIsSpent` + LIVE `getOperatorShares()` | ~50 min Phase 1 | `hunts/2026-05-27-cap-c1-gate2-foreclosure.md` |
| F3 (PriceOracle pause-asymmetry) | NEGATED | Doctrine #27 Corollary B Anchor #2 — `validateBorrow` natspec self-disclosure: "pause is borrow-only by design"; 4 surgical Aug-2025 audit-fix commits on `liquidate` deliberately did NOT add pause check (industry-standard liquidation-during-pause matches Aave/Compound/Sky/Maker) | ~7 min Phase 0 | `hunts/2026-05-27-cap-c3-gate2-foreclosure.md` |

**Combined Cap dispatch outcome:** 2 PROCEED candidates from Gate 1 → 2 Gate 2 NEGATEs. ~3.5h Foundry investment avoided across the two.

**Remaining Cap findings (F2 / F4 / F5) per Gate 1 hunt:** all ≤10% novel-payable probability after INFO #20 7.5× multiplier on TIER-A saturated substrate (9 audits / 7 firms). EV per finding < $5K floor. **Decision: SKIP remaining Cap findings, purge Cap clones (21.4M), pivot to fresh-substrate Lane 5 target.**

**Brain compounds from Cap C3:**
1. Doctrine v3.8.4 — Doctrine #34 sub-class b Anchor #4 (cumulative 5 anchors, ~10.5-17.5h Foundry saved): Sky + Alchemix + DeFi Saver + Cap C1 + Cap C3
2. Contradictions-Register v1.8 — INFO #20 RESOLVED-PROMOTED (2nd anchor Cap C3 = 7.5× overestimate matches predicted ~7× median exactly)
3. Patterns-Defense-Classes pending — "DefaultFallbackPause" non-finding: liquidation-during-protocol-pause is standard DeFi design, foreclose-signal documented
4. Standing-Intake Step 5.11 — Cross-Protocol Defense Enumeration MANDATORY rule (pending `.claude/rules/standing-intake-protocol.md` edit)

_v2.12 Addendum: 2026-05-27 ~22:55 UTC | rows N+4 (F1) + N+4 (F3) both NEGATED via Doctrine #34 sub-b anchor #3+#4 | skip remaining Cap findings (F2/F4/F5 EV <$5K floor) | Cap clones purge queued (21.4M) | next-target pivot: fresh-substrate Lane 5 target with 0-1 audits + ≥$50K cap (Function FBTC $822M BTC bridge $100K candidate; OnRe $177M Solana RWA $100K candidate)_

---

## v2.13 Addendum: Function FBTC Gate 1 FORECLOSE + Step 5.11 first deployment (2026-05-27 ~23:10 UTC)

**First hunt with NEW Step 5.11 Cross-Protocol Defense Enumeration MANDATORY rule applied.** Step 5.11 fired EXCLUSION on 4 of 5 hypotheses — saving Gate 2 dispatch on all 4.

| # | Target | Cap | Scope | Brain overlap | Verdict | Receipt |
|---|--------|-----|-------|----------------|---------|---------|
| N+5 | **Function FBTC** (Immunefi) | $100K Critical (KYC) | Bitcoin bridge, custodial-minter + qualified-user model + FBTCGovernorModule Gnosis Safe owner | HIGH on paper (DC-7 H + CJ M + CANDIDATE-A primary bridge lens) | **FORECLOSE** — 10 hypotheses all NEGATE/OOS; Step 5.11 EXCLUSION on H1/H2/H6/H10 (3/3 defenses each); H8 below MIN-cap Doctrine #29 (Medium severity max) | `hunts/2026-05-27-function-fbtc-immunefi-gate1.md` (44KB) |

**Step 5.11 Cross-Protocol Defense Enumeration matrix (FIRST PRODUCTION DEPLOYMENT):**

| Hypothesis | Q1 freshness | Q2 replay | Q3 fallback | Defenses | EXCLUSION |
|---|---|---|---|---|---|
| H1 srcHash binding (DC-7 PRIMARY) | YES (`getCrossSourceRequestHash` recompute) | YES (`crosschainRequestConfirmation[srcHash]` + `dstChain==chain()`) | YES (pause) | **3/3** | **FIRES** |
| H2 addBurnRequest CEI | YES (nonce invariant) | YES (nonce++ replay-prev) | YES (pause+userBlocked) | **3/3** | **FIRES** |
| H6 blockDepositTx race | YES (shared `usedDepositTxs` precondition) | YES (mutual-exclusion mapping) | YES (pause) | **3/3** | **FIRES** |
| H8 Pending after lock | NO (confirm-time no lock re-check) | PARTIAL | YES (pause) | **1.5/3** | NO (but Med severity < MIN-cap) |
| H10 Factory front-run | YES post-verification (`_private=true`) | YES (`_guardSalt(sender,...)` binds caller) | N/A structural | **3/3** | **FIRES** |

**Brain compounds (5 from this hunt):**

1. **CANDIDATE-A.4 NEW sub-pattern** — Cross-chain factory front-run via permissionless deterministic deployment. Function FBTC = NEGATIVE worked example (correct mitigation: Create3WithSender enum=3 + `_private=true` + sender-bound salt). File for `brain/Patterns-Defense-Classes.md`.
2. **Pending-request liveness-check asymmetry doctrine CANDIDATE** (1st anchor: Function FBTC H8 `confirmMintRequest` no lock re-check). Needs 2nd anchor per Doctrine #37 3-anchor rule.
3. **DC-7 EXCLUSION sub-pattern — 2nd worked example** (1st: Cap C1, 2nd: Function FBTC H1). **One more anchor needed for canonical PROMOTION to DC-7 EXCLUSION-A.**
4. **External-Frameworks update** — Function FBTC = trust-minimized-but-operationally-custodial bridge architecture (2nd anchor after THORChain Bifrost on Bitcoin substrate). Promotes architectural pattern recognition.
5. **Doctrine #36 substrate-coverage build** — +4 anchors banked for Bitcoin bridge substrate (UTXO model + tx-replay commitment + trust-minimized-but-operationally-custodial topology + admin-trusted address binding). Substrate-coverage build EXEMPTS this hunt from P(finding) floor 0.01.

**EV post-discount:**
- Pre-discount: 0.10 × $100K × 0.5 × 1.0 = $5,000
- Doctrine #34 saturation discount: 0.30 (5 audits / 3 firms: BlockSec×2 + MixBytes + Secure3)
- Post-saturation: $1,500 (below $5K floor → Doctrine #29 MIN-cap supports FORECLOSE)
- Realized EV: $0 (no Gate 2 candidate survives Step 5.11)

**Method validation:**

Step 5.11 deployment SUCCESS — fired EXCLUSION on 4 of 5 paired-pipeline hypotheses on the FIRST production hunt that applied it. Hypothesis-rejection signal-strength matches INFO #20 promotion rationale (cross-protocol defense enumeration BEFORE Gate 2 saves the dispatch). Function FBTC validates the rule's reliability.

_v2.13 Addendum: 2026-05-27 ~23:10 UTC | row N+5 Function FBTC FORECLOSE | Step 5.11 first production deployment (4-of-5 EXCLUSIONs fire) | Doctrine #36 +4 anchors banked for Bitcoin bridge substrate | DC-7 EXCLUSION sub-pattern 2nd worked example (Cap C1 + Function FBTC H1, 1 more anchor for canonical promotion) | next-target pivot: OnRe $177M Solana RWA $100K (CANDIDATE-G promotion catalyst, CG → DC-7 promotion unblock candidate)_

---

## v2.14 Addendum: OnRe Gate 1 DEDUP-FORECLOSURE + Watchlist row 11 staleness fix (2026-05-27 23:15 UTC)

**KEY CORRECTION**: The "OnRe = CG → DC-7 promotion catalyst" recommendation from Cap C3 G2 agent + Function FBTC G1 agent was **STALE BY 9 DAYS**. Per `brain/Patterns-Defense-Classes.md:265-345` + `brain/Vision-2027.md:63`:
- CG was already PROMOTED to **DC-8** (not DC-7) on 2026-05-18/19 via Ogie msg 7259 §5A
- OnRe is the 3rd anchor (alongside Indentura + M0 Extensions + TruFin cross-auditor)
- Watchlist row 11 had not been updated post-promotion — fixed in this addendum

OnRe G1 Step 0.5 5-channel check caught the staleness in ~7 min:
- Channel 1 (brain ledger): HIT — DC-8 3rd anchor record
- Channel 3 (in-source HEAD): CONFIRMED — clone `361cd588` static since 2026-03-06 (2.5 months)
- Channel 4 (live Immunefi STATUS): ACTIVE since 2026-05-11
- Channel 5 (receipt-window): 9 days, zero drift on all 4 Day-27 detector additions (Doctrine #34 sub-b / #36 / #38 / DC-7 EXCLUSION) produced ZERO new candidates

**Brain compounds from OnRe G1 (5 items):**
1. **DC-8 3-variant taxonomy refinement** — OnRe = "Tier 2 closure" variant (`require!` on lines 65-72 of `set_kill_switch.rs`); Indentura = "Tier 2 deferred"; M0 Extensions = "Tier 1+2 absent"
2. **Watchlist-Candidate-Crossmap row 11 staleness fix** — APPLIED (this addendum + row 11 status update)
3. **CANDIDATE-G negative-anchor clarifier** — OnRe NEGATIVE example: CG fires on signature-validation co-signers (DC-8 PRIMARY), NOT on capital-custody off-chain relationships (Bermuda SAC). Adevar Labs auditor-bias question RESOLVED (no bias detected; the surface OnRe presents is the surface auditors covered)
4. **Doctrine #36 substrate-coverage scoreboard** — Solana-Anchor RWA-fixed-income substrate now lens-complete: DC-8 ✅ (OnRe 3rd anchor) / CG NEGATIVE (clarifier) / CK NEGATIVE / DC-12 N/A / DC-9 sub-2 [ASSUMED] / Doctrine #38 inapplicable. Substrate-blind floor 0.01 LIFTED for Solana-Anchor RWA-fixed-income class.
5. **Contradictions-Register INFO #21 NEW** — Brief-generation freshness drift (3rd pattern after #19 platform-routing drift + #20 novelty-overestimate). Pattern: operator briefs / next-target-recommendation chains lag canonical brain state when watchlist priority lists aren't updated post-promotion. **Step 0.5 5-channel = positive worked example, defense already in place.**

**EV math:** brief's pre-converge EV $7.5K → post-converge EV $0 (would re-derive identical surface against unchanged HEAD). 30-60 min foreground-hunt-time returned to next-target queue.

| # | Target | Cap | Verdict | Receipt |
|---|--------|-----|---------|---------|
| N+6 | **OnRe** (Immunefi) | $100K Critical (KYC) | $177M Solana RWA, single program `onreuGhHHgVzMWSkj2oQDLDtvvGvoepBPkqyaubFcwe` | **DEDUP-FORECLOSURE-RECEIPT (Step 0.5)** — 4-channel converge + 9-day staleness on Watchlist row | `hunts/2026-05-27-onre-immunefi-DEDUP-FORECLOSURE.md` (31KB) |

_v2.14 Addendum: 2026-05-27 ~23:15 UTC | row N+6 OnRe DEDUP-FORECLOSURE | Watchlist row 11 PARK status + DC-8 3rd anchor recorded | INFO #21 NEW (Brief-generation freshness drift, 3rd Contradictions-Register info entry today) | Solana-Anchor RWA-fixed-income substrate-coverage now lens-complete (substrate-blind floor LIFTED) | 4 same-day Step 0.5 short-circuits (Paxos + Kiln + Veda + OnRe)_

---

## v2.15 Addendum: Gearbox Gate 1 WATCHLIST-PARK + DC-7 EXCLUSION CANONICAL promotion (2026-05-27 23:24 UTC)

**MILESTONE: DC-7 EXCLUSION sub-pattern → CANONICAL** via 3-anchor threshold met same-day (Cap C1 + Function FBTC H1 + Gearbox H2). Sub-pattern moved from CANDIDATE (filed evening) to CANONICAL (promoted in ~3 hours via 3 production validations).

| # | Target | Cap | Verdict | Brain compounds | Receipt |
|---|--------|-----|---------|------------------|---------|
| N+7 | **Gearbox V3** (Immunefi) | $200K Critical | **WATCHLIST-PARK** | DC-7 EXCLUSION CANONICAL 3rd anchor (Gearbox H2) + 5 brain compounds (G-1..G-5) | `hunts/2026-05-27-gearbox-immunefi-gate1.md` (31.8KB) |

**Saturation TIER-A+**: 31 audits across 7 firms (ChainSecurity 13 × continuous-cadence + Decurity 4 + ABDK/Peckshield/MixBytes 2 each + ConsenSys/SigmaPrime/Nethermind/Watchpug/SavantChat 1 each). 2 audits below Doctrine #27 F BOUNDARY ceiling of 33.

**EV post-discount: $600** (pre $10K × 0.40 F BOUNDARY × 0.50 sustained cadence × 0.50 vendor anti-anchor × 0.60 lens-saturation = below Gate-2 effort floor)

**Step 5.11 enumeration matrix (Gearbox H2 = canonical anchor):**

| Hypothesis | Q1 freshness | Q2 replay | Q3 fallback | Verdict |
|---|---|---|---|---|
| H1 multicall slippage | N/A | YES | YES (fullCollateralCheck) | NEGATE-STRUCTURAL |
| **H2 collateralDebtData trust** | **YES (storage re-derive)** | **YES (DebtUpdatedTwiceInOneBlockException)** | **YES (LossPolicy + maxDebtPerBlockMultiplier=0)** | **3/3 EXCLUSION FIRES → DC-7 EXCLUSION CANONICAL 3rd ANCHOR** |
| H3 USDT fee asymmetry | N/A | N/A | N/A | NEGATE-AUDIT-SATURATION |
| H4 botMulticall race | NO | YES | YES | 2/3 EXCLUSION-MEDIUM |

**Doctrine #34 sub-class b commit-diff result — POSITIVE FIRE — DEFENSIVE DIRECTION:**

3 fix-commits identified (all PATCHED at HEAD):
- 2025-02-28 core-v3 phantom token state-fallback (CANDIDATE-J class)
- 2025-03-16 core-v3 price-feed strictening (Doctrine #29 reinforcement)
- 2026-05-08 integrations-v3 "liquidator stablecoin-based valuation" (CANDIDATE-I class, 19 days old)

This produces the **G-2 Doctrine #34 sub-b BI-DIRECTIONAL CLARIFICATION** — defensive-direction inference (patches present = surface DEFENDED) vs offensive-direction inference (recent fix may have introduced regression).

**Brain compound proposals (5 from Gearbox G1):**

1. **G-1 — DC-7 EXCLUSION sub-pattern CANONICAL promotion (DONE in this commit batch)** — 3-anchor threshold met
2. **G-2 — Doctrine #34 sub-class b BI-DIRECTIONAL clarification** — fix-commit presence is bi-directional signal (defensive = patches in place; offensive = recent fix may regress). Need to document the inference direction per fix-commit observation.
3. **G-3 — Doctrine #27 F BOUNDARY-zone refinement** — 30-33 audit range is GRADIENT (0.30→0.50 multiplier scaling) vs discrete kill at 33. Gearbox at 31 = 0.40 multiplier. Anchor for gradient curve.
4. **G-4 — Watchlist row 15 status update (DONE in this addendum)** — NET-NEW → GATE 1 DONE WATCHLIST-PARK
5. **G-5 — Doctrine #36 lens-saturation-floor enrichment** — P(finding) ≤ 0.05 floor for lens-saturated ETH-lending substrate (vs 0.01 for substrate-blind class). Gearbox illustrates the "different floor for different saturation class" refinement.

**Brief-vs-live correction:** brief specified `Gearbox-Protocol/router-v3` as in-scope; live scope file makes NO mention of router-v3, repo returns 404. Logged per INFO #19 (4th anchor: PLATFORM #1 Kiln + PLATFORM #2 Cap + INFO #21 TIME-drift OnRe + INFO #19 SCOPE-drift Gearbox).

_v2.15 Addendum: 2026-05-27 ~23:25 UTC | row N+7 Gearbox WATCHLIST-PARK | **DC-7 EXCLUSION sub-pattern → CANONICAL same-day** (3-anchor threshold met in ~3 hours: Cap C1 + Function FBTC H1 + Gearbox H2) | 4-anchor INFO #19 PLATFORM/SCOPE drift catalog | 10 G1/G2 verdicts in Day-27 night cycle | next-target: Templar Protocol $20M BTC+ETH+Stellar $100K (multi-substrate novelty, avoids ETH-lending lens-saturation trap)_
