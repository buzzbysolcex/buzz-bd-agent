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
| 4   | Stader                 | Ethereum + Hedera + BNB + Near | $327M   | $1M    | Liquid Staking        | M     | –     | M     | –   | **H** | NET-NEW          | **6**    |
| 5   | Rocket Pool            | Ethereum                       | $1.05B  | $150K  | Liquid Staking        | M     | –     | M     | –   | **H** | NET-NEW          | **7**    |
| 6   | Renzo                  | Ethereum + Linea + Solana + LZ | $182M   | $500K  | Liquid Restaking      | M     | L     | M     | –   | **H** | NET-NEW          | **4**    |
| 7   | Defi Saver             | Ethereum + Arb + OP            | $271M   | $350K  | CDP Manager           | **H** | –     | L     | –   | –     | NET-NEW          | **8**    |
| 8   | JustLend               | Tron                           | $3.55B  | $50K   | Lending               | L     | –     | M     | –   | L     | NET-NEW          | **15**   |
| 9   | Function FBTC          | Bitcoin                        | $822M   | $100K  | Bridge                | **H** | –     | M     | –   | –     | NET-NEW          | **9**    |
| 10  | Hydration DEX          | HydraDX (Polkadot)             | $34M    | $500K  | DEX                   | L     | –     | L     | –   | –     | NET-NEW          | **18**   |
| 11  | OnRe                   | Solana                         | $177M   | $100K  | RWA                   | M     | **H** | M     | M   | M     | NET-NEW          | **5**    |
| 12  | Bifrost Liquid Staking | Bifrost + Manta + ETH          | $22M    | $500K  | Liquid Staking        | M     | –     | M     | –   | M     | NET-NEW          | **13**   |
| 13  | Ankr                   | Ethereum + Flow + BNB          | $22M    | $500K  | Liquid Staking        | L     | –     | M     | –   | M     | NET-NEW          | **14**   |
| 14  | Beefy                  | Ethereum + Base + Arb + 20+    | $118M   | $75K   | Yield Aggregator      | M     | –     | L     | –   | **H** | NET-NEW          | **10**   |
| 15  | Gearbox                | Ethereum                       | $25M    | $200K  | Lending               | **H** | –     | M     | –   | M     | NET-NEW          | **11**   |
| 16  | LiNEAR Protocol        | Near                           | $44M    | $100K  | Liquid Staking        | L     | M     | M     | M   | M     | NET-NEW          | **17**   |
| 17  | Gains Network          | Arb + Base + Polygon           | $14M    | $200K  | Derivatives           | **H** | –     | M     | –   | L     | NET-NEW          | **16**   |
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
| 1 | **Paxos** | $1M | stablecoins PYUSD/PAXG/USDG/USDP + cross-chain bridging | DC-10 + upgrade lens (Pattern H bridging) | **IMMEDIATE** | **Gate 1 COMPLETE 2026-05-24 — WATCHLIST + FORECLOSURE-RECEIPT (Pattern H 3-required + 1-of-2-optional DVN exceeds Stargate v3; SupplyControl triple-gated; UUPS owner = OZ TimelockController [ASSUMED] pending bytecode-verify; 8 audit reports). EV $4K post-discount. Hunt: hunts/2026-05-24-paxos-cantina-gate1.md.** |
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
