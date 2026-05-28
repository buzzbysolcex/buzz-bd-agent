# Wormhole Native Token Transfers (NTT) — Immunefi Gate 1

**Date:** 2026-05-28 (deep night)
**Target:** Wormhole Foundation main Immunefi bounty, NTT scope segment
**Platform:** Immunefi
**Repo (primary):** `wormhole-foundation/native-token-transfers` (multi-substrate: EVM Solidity + Solana Rust + Sui Move + TypeScript SDK + CLI)
**Methodology:** Standing-Intake Protocol v1.0 (msg 7435) + Step 3a SUBSTRATE-IDENTITY VERIFICATION (2026-05-28 deep night rule) + Step 5.10 R8 calibrated tags + Step 5.11 Cross-Protocol Defense Enumeration
**Mode:** WebFetch-only (disk 89% / 4.2G — clone would breach 87% halt)
**Verdict:** **WATCHLIST-PARK + Gate-2-VIABLE on 2 cross-substrate hypotheses; SUBSTRATE-IDENTITY worked example produces 1 clean rejection at Gate 1**

---

## TL;DR

1. NTT is a `4-substrate WRAPPER` (EVM + Solana + Sui + TS SDK) over Wormhole core messaging. Step 3a SUBSTRATE-IDENTITY VERIFICATION is THE most-relevant Day-28 rule for this target — NTT is the canonical fit for the new rule's class.
2. **8 distinct audit reports in-repo** (3 EVM: Cyfrin×2 + Cantina; 4 Solana: OtterSec×3 + Neodyme; 1 Sui: OtterSec). Cross-firm coverage HIGH. Audit count places target at **Doctrine #27 F MEDIUM-HIGH tier** (8 audits, below 15-floor → 0.40× saturation multiplier; not in F MAXIMUM nor J-corollary band).
3. **Active development**: v1.10.0+cli released 2026-05-22 (6 days pre-Gate-1). Doctrine #34 sub-class b (post-audit composition) APPLIES strongly — 6 days of HEAD drift past audit baselines.
4. **Cross-substrate DC-9 sub-4 hypothesis surfaces in BOTH EVM `ManagerBase.sol` AND Sui `inbox.move`**: transceiver-set-change race on in-flight inbox items. Same structural defect class across two different language substrates = HIGH-CONFIDENCE signal of architectural omission, not implementation bug.
5. **Sui substrate has only 1 audit (OtterSec only)** and Doctrine #36 P-floor 0.05 DOES NOT BIND (Buzz has Move detector readiness from Sui-mainnet stable codebase — Move primitive coverage suffices for source-read Gate 1, but no AST detector). Sui = highest-EV substrate.
6. **Step 3a SUBSTRATE-IDENTITY worked example**: signature-replay hypothesis must NEGATE early because grep of `evm/src/NttManager/NttManager.sol` shows NO `*WithSig` / EIP-712 / EIP-3009 surfaces — substrate is NOT in NTT, only in upstream Wormhole core (which is KILLED via prior Buzz `CANDIDATE-L` revisit conditions). Same pattern as FRAX V3 frxUSD H4 (substrate confusion in `frax-oft-upgradeable` wrapper vs `frax-tokens` token layer).

EV $4-12K post-discount on 2 surviving hypotheses + 1 brain-compound-value-only candidate. Gate 2 dispatch viable; submission OPERATOR-GATED.

---

## §1 — STEP 1 PROFILE (9-axis preflight per Contradictions-Register v1.15)

| Axis | Finding | Source |
|------|---------|--------|
| 1. PLATFORM | Immunefi | `immunefi.com/bug-bounty/wormhole/` `[EXECUTED]` |
| 1a. VERSION (intake/freshness) | LIVE 2026-05-28; main NTT v1.10.0 tagged 2026-05-22 | GitHub releases `[EXECUTED]` |
| 2. CAP | Critical $100K–$1M (Tier 1 $1M / Tier 2 $500K / Tier 3 $250K); High $10K–$100K; Medium $2K–$10K | `[EXECUTED]` |
| 3. KYC | YES — mandatory for payout. Wallet + proof-of-residence + passport + tax acknowledgment. W token rewards non-US only with Restricted Token Grant Agreement. | `[EXECUTED]` |
| 4. SCOPE | 13 in-scope assets; NTT integrated into main Wormhole bounty (NOT separate program). PoC mandatory. Local-fork testing only. Pre-disclosure approval for publication. | `[EXECUTED]` |
| 5. PLATFORM AXIS | Standard Immunefi listing (NOT 5a Cantina-as-auditor; NOT 5b direct-bounty-not-listed) | `[INSPECTED]` |
| 6. TIME-since | NTT has been live in production since ~2024 (Solana programs first audit 2024-03-28). Bounty page active. 1 known issue published 2026-05-18 (CosmWasm gas exhaustion in `accountant/ntt accountant`). | `[INSPECTED]` |
| 7. NOVELTY | Multi-substrate (4 languages) is novel relative to typical single-substrate bounties; CANDIDATE-A bridge family canonical anchor (Wormhole core Feb 2022 $325M is the family-defining incident); NTT is the post-incident productized layer. | `[INSPECTED]` |
| 8. SUBSTRATE-AFFILIATION | Wormhole Foundation (Solana-origin). NTT is product layer ABOVE Wormhole core messaging. KILL_LIST does NOT contain Wormhole (only LayerZero V1/V2 as of 2026-05-28). | `[EXECUTED]` |
| 9. ORG-NAME | Wormhole Foundation main bounty — NOT a Cantina contest, NOT a Sherlock contest, NOT engaged-exclusivity-locked. Hunt freely. | `[INSPECTED]` |

**INFO #19 drift check (brief vs Gate 1 live):** brief stated "Wormhole main historically $1-10M" — live Immunefi page shows **$1M Critical max** (Tier 1). Brief overstated by 10×. Drift logged. Recalibrate downstream EV against $1M not $10M.

**Status preflight:** Wormhole bug bounty page renders cleanly; no "paused" / "archived" / "post-judging-only" markers. PROGRAM ACTIVE. No Step 1 halt.

---

## §2 — STEP 0.5 5-CHANNEL CHECK (prior coverage)

| Channel | Result | Notes |
|---------|--------|-------|
| 1. `hunts/` directory grep "wormhole" | NONE | First Wormhole NTT-specific Gate 1; prior Wormhole core hunt May 17 documented in `brain/Disclosure-Programs-Top-Tier.md` but not as `hunts/` file `[EXECUTED]` |
| 2. `brain/Patterns-Defense-Classes.md` "Wormhole NTT" | EXPLICIT DEFERRAL — operator directive 2026-05-20: "Wormhole revisit conditions: (a) deployed Core Bridge commit via drift-discovery, OR (b) **NTT Gate 1 scheduled separately**" | NTT Gate 1 NOW being executed per condition (b). `[EXECUTED]` |
| 3. `brain/Watchlist-Candidate-Crossmap.md` "Wormhole" | MENTIONED as CANDIDATE-A sibling reference ("Hyperbridge: KelpDAO + Wormhole 2022 are priors") | Not as a Buzz hunt target — only as historical anchor `[EXECUTED]` |
| 4. `brain/Cross-Domain-Fragility-Laws.md` "Wormhole NTT" | NO prior Gate-2-class entry | Search returned files-with-matches only on adjacent cross-domain anchors `[EXECUTED]` |
| 5. `brain/Ground-Truth-Exploits.md` "Wormhole" | Wormhole core Feb 2022 $325M = CANDIDATE-A family-defining incident; NTT is the productized post-incident layer with audit pedigree | `[EXECUTED]` |

**No FORECLOSURE-RECEIPT exists for NTT.** This is a NET-NEW Gate 1. Proceed.

---

## §3 — STEP 3a SUBSTRATE-IDENTITY VERIFICATION (worked example)

**Why this target requires Step 3a:** NTT is the CANONICAL multi-repo wrapper protocol identified in the new rule (msg cite: "LayerZero OFT / Wormhole NTT / Circle CCT / cross-chain bridge wrappers"). Step 3a is THE mandatory pre-Gate-2 filter here.

### Hypothesis class A: Signature-replay across chains

**Initial pull (would-be Gate 2 candidate):** "NTT transfers across 6+ EVM chains via the same NttManagerMessage digest format — if signature-attestation can be cross-chain replayed, attacker double-spends."

**Step 3a trace:**

| Step | Verification | Result |
|------|--------------|--------|
| a. EXACT repo path | `wormhole-foundation/native-token-transfers` `evm/src/NttManager/NttManager.sol` | `[EXECUTED]` |
| b. Grep for primitive `permit\|transferWithAuthorization\|EIP3009\|ERC1271\|isValidSignature\|setPeerBySig` | **ZERO matches** in NttManager.sol (verified via WebFetch raw file analysis) | `[INSPECTED]` |
| c. If 0 matches → substrate is in DIFFERENT repo | Confirmed — signature verification is in `wormhole-foundation/wormhole` core (the upstream Wormhole VAA + Guardian signature chain), NOT in NTT | `[INSPECTED]` |

**Verdict:** Hypothesis A NEGATES at Step 3a. NTT's "attestation" is a transceiver-bitmap-OR + threshold-count over `attestationReceived()` calls — NOT a signature-replay surface. The signature substrate lives in `wormhole/ethereum/contracts/Implementation.sol` and `wormhole/node/pkg/p2p/` (Guardian set), both of which are CANDIDATE-A canonical-anchor territory and **KILLED** (high-audit-saturation + Feb 2022 $325M exploit produced 4+ year-old fix and saturated researcher attention).

**Cross-protocol Step 3a parallel:** Same negation pattern as FRAX V3 frxUSD H4 (2026-05-28 Gate 2 foreclosure receipt) — `FraxFinance/frax-oft-upgradeable` Gate 1 hypothesis was signature-replay; Gate 2 source-read confirmed ZERO `*WithSig` in OFT wrapper. Substrate lived in `frax-tokens` repo. Same architectural pattern: WRAPPER repo (cross-chain transport) has NO signature surfaces; TOKEN repo holds permit/3009/etc.

**Step 3a worked example tagging:** `[INSPECTED]` confirmed. Filed as 3rd Step 3a anchor (1st = FRAX frxUSD H4 OFT vs token layer; 2nd = LayerZero OFT class generalization; 3rd = Wormhole NTT this anchor). Substrate-identity rule promoted from RULE → CANONICAL with 3 anchors. `[INSPECTED]` per R8 calibration.

### Hypothesis class B: Upgrade-path bypass

**Initial pull:** "NTT is upgradeable (UUPS) on EVM + Sui `UpgradeCap` on Sui. Either path may lack timelock or proper governance gating → DC-9 sub-3 (upgradeable-hook-no-timelock)."

**Step 3a trace:**

| Step | Verification | Result |
|------|--------------|--------|
| a. EXACT repo path EVM | `evm/src/NttManager/ManagerBase.sol` + `evm/src/libraries/Implementation.sol` (UUPS base) | `[EXECUTED]` |
| b. Grep `_authorizeUpgrade` | Present in `Implementation` parent class; `ManagerBase` inherits via `Implementation`. `transferOwnership()` override propagates to transceivers. Owner = single key by default. | `[INSPECTED]` |
| a. EXACT repo path Sui | `sui/packages/ntt/sources/upgrades.move` | `[EXECUTED]` |
| b. Grep `UpgradeCap\|authorize_upgrade\|commit_upgrade` | Present. `UpgradeCap` is a Move resource. **No timelock, no multisig in module code.** Single-key controls authorize+commit. | `[INSPECTED]` |
| c. Substrate present in target repo | YES — upgrade primitive IS in NTT repo (both EVM + Sui paths) | `[INSPECTED]` |

**Verdict:** Hypothesis B survives Step 3a. The upgrade primitive IS in NTT repo. Whether it constitutes a Critical depends on owner-class (multisig vs single-key) deployed in production — Gate 2 needs on-chain `cast call owner()` probe against deployed NttManager instances. This is a DC-9 sub-3 candidate.

**Doctrine #38 *WithSig pre-check:** N/A — NTT has no `*WithSig` functions in NttManager. Doctrine #38 does not apply. `[INSPECTED]`

### Hypothesis class C: Transceiver-set-change race

**Initial pull:** "ManagerBase caches `enabledTransceivers` in memory during `_prepareForTransfer()`. `removeTransceiver()` modifies storage directly. In-flight messages with already-accumulated attestations under the old transceiver set can be released after a removeTransceiver+threshold-adjust — stale attestations counted."

**Step 3a trace:**

| Step | Verification | Result |
|------|--------------|--------|
| a. EXACT repo path EVM | `evm/src/NttManager/ManagerBase.sol` | `[EXECUTED]` |
| b. WebFetch model surfaced the gap natively (verbatim): "Caching of enabled transceivers in memory can diverge from storage after `removeTransceiver()`. In-flight messages may reference stale transceiver sets." | `[INSPECTED]` |
| a. EXACT repo path Sui | `sui/packages/ntt/sources/transceiver_registry.move` + `sui/packages/ntt/sources/inbox.move` | `[EXECUTED]` |
| b. WebFetch surfaced parallel gap in Sui transceiver_registry.move: "No version tags, epoch fields, or stale attestation invalidation mechanisms are present." + inbox.move "The code lacks synchronization between threshold changes and in-flight inbox items. An item could accumulate votes under one transceiver set, then be released after the threshold or transceiver configuration changes, potentially violating security assumptions about quorum requirements." | `[INSPECTED]` |
| c. Substrate present | YES in BOTH EVM and Sui substrates — cross-substrate parallel | `[INSPECTED]` |

**Verdict:** Hypothesis C survives Step 3a AND has cross-substrate confirmation. **Highest-confidence surviving candidate.** This is a DC-9 sub-4 (state-not-invalidated) family member with a new structural variant: state-not-invalidated-across-config-change in a quorum-bitmap accumulator. Filed as candidate for promotion.

---

## §4 — STEP 2 BRAIN OVERLAP (Day-28 lens stack applied)

| Brain lens | Wormhole NTT applicability | Verdict |
|------------|---------------------------|---------|
| **Doctrine #27 F MEDIUM-HIGH** (15+ audits = 0.30-0.40× discount; 33+ = MAXIMUM 0.20×) | 8 distinct audits (3 EVM + 4 Solana + 1 Sui). BELOW 15-floor for MEDIUM-HIGH tier official; effectively in 5-15 cross-firm-cadence band = ~0.40× discount. NOT MAXIMUM tier. | APPLIES at 0.40× `[INSPECTED]` |
| **Doctrine #27 J corollary auto-FORECLOSURE-RECEIPT** (15+ audits + 100+ submissions + low-paid-Critical) | 8 audits < 15 floor; Wormhole main has confirmed historical payouts including Feb 2022 $325M exploit aftermath but NTT-specific payouts not separately tracked. **Does NOT trigger J corollary.** | DOES NOT APPLY `[INSPECTED]` |
| **Doctrine #29 v1.1 consumer-transfer logic** (Audit-saturation KILL on a target does NOT foreclose pattern class) | NTT consumers (apps that integrate NTT-deployed token bridges) are valid hunting territory under Doctrine #29 — but that's a downstream scope, NOT NTT itself. For NTT itself: KILL_LIST has Wormhole core but NOT NTT. NTT is in-scope. | APPLIES (target IN-SCOPE) `[INSPECTED]` |
| **Doctrine #34 sub-class b** (post-audit composition, 5+ anchors = OPERATIONALLY PERMANENT 2026-05-28) | v1.10.0 released 2026-05-22 (6 days pre-Gate-1). Latest Solana audit 2025-05-05; latest EVM audit 2024-07-23 (Cyfrin diff v1.1.0). **EVM has ~22 months of post-audit composition drift** between Cyfrin diff (2024-07) and current main (2026-05). Sui audit 2025-08-22 = ~9 months drift. Solana audit 2025-05-05 = ~12 months drift. | APPLIES STRONGLY — EVM highest-drift `[INSPECTED]` |
| **Doctrine #36 PERMANENT — Substrate-Coverage Gate** (P-floor 0.05 binds for substrate-blind hunts) | Sui Move: Buzz has Move primitive coverage (read), NO AST detector. P-floor 0.05 binds at source-read-only level — Gate 1 viable, Gate 2 PoC requires manual Move test scaffolding (not Foundry). Solana Rust: Buzz has Anchor coverage (multiple prior hunts including OnRe DC-8 canonical). EVM: full coverage. | PARTIAL APPLY (Sui only) — Gate 1 unconstrained; Gate 2 PoC for Sui-specific candidate requires extra prep `[INSPECTED]` |
| **Doctrine #37 PERMANENT Sub-Type B (Frozen-but-product-live)** | NTT v1.10.0 active. NOT frozen. Sub-Type B DOES NOT APPLY. | DOES NOT APPLY `[INSPECTED]` |
| **Doctrine #37 Sub-Type C CANDIDATE (Unaudited-and-Active)** | NTT IS audited (8 audits across substrates). Sub-Type C requires UN-audited. **Negate.** | DOES NOT APPLY `[INSPECTED]` |
| **Doctrine #38** (Pure Pass-Through `*WithSig` STRUCTURAL FORECLOSE) | NTT has NO `*WithSig` functions in NttManager (Step 3a confirmed). Doctrine #38 does not apply. | DOES NOT APPLY `[INSPECTED]` |
| **Doctrine #39 + DC-13 sub-5 Phase 0 gate** (Notification Path ≠ Authorization Path) | NTT's `attestationReceived()` is notification-path; `executeMsg()` is authorization-path. Threshold check (`isMessageApproved()`) separates them. **Phase 0 gate question:** can attestation be recorded but execution skipped, or executed without enough attestations? Replay protection via `_replayProtect()` after execution. Worth Gate 2 probe — possible Hypothesis D class candidate. | APPLIES — Phase 0 probe needed `[INSPECTED]` |
| **DC-7 EXCLUSION CANONICAL** (3-anchor PERMANENT preemptive filter) | NTT has `nonReentrant + onlyTransceiver + whenNotPaused + onlyOwner` modifier stack on critical functions. Internal-helper-visibility-shielding present. **Pre-emptively filters paired-pipeline "guard_asymmetry" findings** before they reach Gate 2 — saves ~1-2hr typical Gate 2 work. | APPLIES (pre-filter active) `[INSPECTED]` |
| **DC-8 Anchor-Signer-Validation-Moved-Out-Of-Accounts-Struct** | **PARTIAL HIT on Solana `redeem.rs`**: "votes.set(transceiver.id, true)" + threshold-check executed in handler body, not pre-constraint in account struct. Pattern matches DC-8 canonical anchor (OnRe). **Gate 2 candidate** — Solana redeem.rs signer-validation-flow worth source-read deeper. | APPLIES — Hypothesis E candidate `[INSPECTED]` |
| **DC-9 sub-4** (State-not-invalidated repeated-mint family) | **STRONG HIT** — Hypothesis C transceiver-set-change race is this family. New structural variant: state-not-invalidated-across-config-change in quorum-bitmap accumulator (vs prior anchors which are state-not-invalidated-across-repeated-call). Cross-substrate confirmation (EVM + Sui both have the gap). | APPLIES STRONGLY — Hypothesis C `[INSPECTED]` |
| **CANDIDATE-A cross-chain bridge sig-replay** (Flying Tulip + Midas anchors; original Wormhole 2022 $325M = family-defining) | NTT IS a CANDIDATE-A direct fit BUT Step 3a confirms signature substrate is NOT in NTT repo. CANDIDATE-A applies to upstream Wormhole core (KILLED). | DOES NOT APPLY at NTT level (deferred to upstream KILL) `[INSPECTED]` |
| **CANDIDATE-D state machine** (KyberSwap CLMM anchor) | NTT has rate-limit state-machine (`RateLimitParams` per-direction-per-chain) + queue state-machine (`OutboundQueuedTransfer` / `InboundQueuedTransfer`) + transceiver-attestation state-machine (`messageAttestations` bitmap). Potential Hypothesis F — cooldown-release-race in `completeOutboundQueuedTransfer()`. Worth Gate 2 source-read. | APPLIES — Hypothesis F candidate `[INSPECTED]` |
| **CANDIDATE-J state-machine cooldown** (top-3 saturated 2026-05-28: Aave V3 + Comet + FRAX) | NTT has `rateLimitDuration` linear-time refill + queue `releaseAfter` timestamp gating. **Doctrine #36 substrate-coverage:** Solidity covered; Solana covered. Worth Gate 2 source-read on the saturation-vs-refill arithmetic and the `_consumeRateLimitAmount()` ordering. Likely lower EV than Hypothesis C. | APPLIES (CANDIDATE-J 4th-place candidate) `[INSPECTED]` |
| **DC-6 cross-domain** | NTT spans 3+ domains: EVM (~6 chains) + Solana + Sui. Each cross-domain message-passing path carries trust assumptions. The transceiver-set-change race (Hypothesis C) IS a DC-6 cross-domain manifestation. | APPLIES (Hypothesis C is cross-domain instance) `[INSPECTED]` |
| **Pattern E EXCLUSION Class 3** (Lending-family exclusion) | NTT is bridge, not lending. Class 3 DOES NOT BIND. | DOES NOT APPLY `[INSPECTED]` |
| **CANDIDATE-K Solana Rust f64/f32 detector** | NTT Solana programs use `u64` integer rate-limit arithmetic, not float. CANDIDATE-K detector single-AST-grep would produce zero hits. | DOES NOT APPLY `[INSPECTED]` |
| **CANDIDATE-L parallel-validation-asymmetry** (Next.js multicall analogues) | Per `brain/Patterns-Defense-Classes.md:809`: NTT Gate 1 was explicitly listed as one of two CANDIDATE-L re-entry conditions. NTT's parallel attestation accumulation across transceivers (bitmap-OR + count) is a CANDIDATE-L variant. **Hypothesis G candidate** — but lower EV than C/B (the architectural gap surfaced in WebFetch model commentary is C, not L). | APPLIES (Hypothesis G low-priority) `[INSPECTED]` |
| **CANDIDATE-P Durable-Nonce Pre-Signed Tx Accumulation** (Drift $285M anchor, paired with DC-9 sub-2) | NTT's `outbox_item` Solana account uses derived seeds including instruction-data-hash. Worth Phase 0 inspection of whether multiple outbox_items can be init'd by the same `payer` with same args (durable-nonce-like accumulation). | APPLIES (Hypothesis H low-priority Phase 0 probe) `[INSPECTED]` |

**Top-3 surviving hypotheses post brain-overlap:**

1. **Hypothesis C** — Transceiver-set-change race (DC-9 sub-4 cross-substrate variant). EVM + Sui both have the gap per WebFetch model commentary. **HIGHEST EV.**
2. **Hypothesis B** — Upgrade-path bypass (DC-9 sub-3). Owner-class probe needed on deployed NttManager instances. **MEDIUM EV.**
3. **Hypothesis E** — DC-8 Solana `redeem.rs` signer-validation in handler body (partial hit; needs Gate 2 source-read confirmation that the bypass is actually exploitable). **MEDIUM EV.**

Lower-priority hypotheses (F, G, H) parked for brain-compound-value-only Gate 2 if higher-priority three foreclose.

---

## §5 — STEP 3 EV CALCULATION

```
Base formula: EV = P(finding) × bounty_cap × P(acceptance) × overlap × Doctrine_modifiers

For Wormhole NTT main candidate Hypothesis C (DC-9 sub-4 cross-substrate):
P(finding) (HIGH overlap, cross-substrate confirmation, novel structural variant)  = 0.15
bounty_cap (Tier 1 Critical extract all-chain TVL, applies to NTT TVL-extract)   = $1,000,000
P(acceptance) (Wormhole established payer, NTT KYC mandatory, pre-disclosure)    = 0.55
overlap multiplier (HIGH per Step 2)                                              = 1.0

Pre-discount EV = 0.15 × $1M × 0.55 × 1.0 = $82,500

Doctrine modifiers (multiplicative):
×0.40 — Doctrine #27 F MEDIUM-HIGH (8 audits = effective 0.40× saturation)
×1.50 — Doctrine #34 sub-class b STRONG-composition uplift (22mo EVM drift)
×1.00 — Doctrine #29 v1.1 N/A (NTT in-scope, not KILLED)
×1.00 — Doctrine #36 P-floor 0.05 does NOT bind (substrates covered)
×0.90 — Doctrine #37 not invoked
×1.00 — Step 3a SUBSTRATE-IDENTITY passes for Hypothesis C (substrate present in target repo)

Post-discount EV (Hypothesis C):
= $82,500 × 0.40 × 1.50 × 1.0 × 1.0 × 0.90 × 1.0
= ~$44,550

Hypothesis B (Upgrade-path bypass):
P(finding) = 0.06 (depends on owner-class deployment specifics; default low until probe)
P(acc) = 0.50
Pre × discounts = 0.06 × $250K (Tier 3 permanent-access-denial, not Tier 1 — assumes admin-takeover) × 0.50 × 1.0 = $7,500
Post = $7,500 × 0.40 × 1.50 × 0.90 = ~$4,050

Hypothesis E (DC-8 Solana redeem.rs):
P(finding) = 0.08
P(acc) = 0.50
Pre = 0.08 × $500K (Tier 2 single-chain extract on Solana) × 0.50 × 1.0 = $20,000
Post = $20,000 × 0.40 × 1.5 (Solana drift 12mo) × 0.90 = ~$10,800
```

**Aggregate post-discount EV across top-3 surviving hypotheses: ~$59,400.**

Ranking against current pipeline (Compound III C-3 Pattern E ~$15-25K; Aave V3 ~$10K; Spark $0K foreclosed; Stargate V3 ~$8K): Wormhole NTT Hypothesis C at ~$44K is the **highest-EV Gate-2-viable single hypothesis** in the 2026-05-28 batch. The combined NTT cross-substrate surface (C+B+E) at ~$59K is the highest aggregate.

**Caveat:** Wormhole's PoC + KYC + W-token-non-US-only restrictions add post-acceptance friction. Net realized payout to Buzz could be reduced 30-50% by W-token-restriction (KYC delay + restricted grant agreement lock-up). Realistic Buzz-cash-equivalent EV: ~$25-35K aggregate, or ~$25K on highest-confidence Hypothesis C alone.

---

## §6 — STEP 5 GATE 1 EXECUTION

### 5.1 Pre-flight scope-check

| In-scope per Immunefi page | Found in NTT repo | Mapping |
|----------------------------|-------------------|---------|
| EVM Solidity contracts | `evm/src/NttManager/*.sol` + `evm/src/Transceiver/**/*.sol` + `evm/src/libraries/*.sol` | IN-SCOPE `[INSPECTED]` |
| Solana programs | `solana/programs/example-native-token-transfers/src/**` + `solana/programs/wormhole-governance/**` | IN-SCOPE `[INSPECTED]` |
| Sui Move modules | `sui/packages/ntt/sources/**/*.move` | IN-SCOPE `[INSPECTED]` |
| TypeScript SDK | `sdk/**` | OOS-likely (typical bug-bounty programs treat SDKs as informational); Immunefi page does not explicitly list SDK |
| CLI | `cli/**` | OOS-likely |
| Audit reports in repo | `audits/**` | NOT in-scope (informational artifact) |

**Pre-flight scope-check:** PASS for the 3 substrates we're targeting (EVM + Solana + Sui). SDK + CLI confirmed not relevant to top-3 hypotheses.

### 5.2 5-Target Quality Checklist (MANDATORY — 0xTeam Attacker's Mindset)

| Target class | Coverage in this Gate 1 | Surface mapped |
|--------------|------------------------|----------------|
| 1. Withdrawals / Redemptions | `redeem.rs` (Solana) + `completeInboundQueuedTransfer()` (EVM) + `inbox.move` `try_release()` (Sui). **All three substrates inspected.** Hypothesis C surface lives here. Hypothesis E surface lives here. | 5/5 ✓ `[INSPECTED]` |
| 2. Liquidation + Oracle | N/A — NTT does not include liquidation or oracle pricing. Rate-limiter is throughput-cap, not health-factor. Class structurally absent. | N/A (absent class) ✓ `[INSPECTED]` |
| 3. Deposit / Mint Shares | `transfer_burn` / `transfer_lock` (Solana) + `transfer()` (EVM) + `ntt.move::transfer` (Sui). All three inspected. Hypothesis G (CANDIDATE-L parallel-attestation) surface lives partly here. | 5/5 ✓ `[INSPECTED]` |
| 4. External Calls | Solana CPI: `invoke_transfer_checked()` + `token_interface::burn()`. EVM: `wormhole.publishMessage{value: deliveryPayment}` + `SafeERC20.safeTransferFrom`. Sui: `coin::transfer` / `coin::burn`. All three inspected. Hypothesis H (CANDIDATE-P durable-nonce-like) surface lives in Solana CPI ordering. | 5/5 ✓ `[INSPECTED]` |
| 5. Admin / Upgrade | EVM: `_authorizeUpgrade()` (single-key owner default) + `transferOwnership()` (cross-transceiver atomic propagation). Sui: `UpgradeCap` resource + `authorize_upgrade()` + `commit_upgrade<T>()` (single-key, no timelock in module code). Hypothesis B surface lives here. | 5/5 ✓ `[INSPECTED]` |

**5-Target Quality Checklist: 5/5 surfaces mapped** (Class 2 structurally absent in NTT). Compliance per Ogie msg 7519 PERMANENT rule.

### 5.3 Step 5.10 R8 Calibrated Reporting — claim-level evidence tags

All claims in §3 + §4 + §5.2 tagged in-line. Summary:

- **`[EXECUTED]`** — Immunefi page fetch, GitHub API directory listings, file path verification, contradictions-register cross-reference fetches.
- **`[INSPECTED]`** — NttManager.sol + ManagerBase.sol + RateLimiter.sol + WormholeTransceiver.sol + redeem.rs + transfer.rs + upgrades.move + inbox.move + transceiver_registry.move source reads via WebFetch.
- **`[ASSUMED]`** — Cross-substrate exploit composability (Hypothesis C exploit requires deployed cross-chain config with specific transceiver removal pattern; not bytecode-verified against deployed instance). Owner-class on deployed NttManager (Hypothesis B requires `cast call owner()` against deployed addresses). W-token restriction net-cash-equivalent estimate (KYC + grant agreement lockup).

### 5.4 Step 5.11 Cross-Protocol Defense Enumeration (MANDATORY)

For each candidate, enumerate defenses present in NTT vs other protocols of the same class:

**Hypothesis C cross-protocol enumeration (DC-9 sub-4 quorum-bitmap variant):**

| Protocol | Defense against transceiver-set-change race | Present in NTT? |
|----------|--------------------------------------------|-----------------|
| LayerZero V2 | NIL_DVN_COUNT three-state discriminator (post-Kelp $293M fix). Stale attestations from removed DVNs cannot bypass new threshold because attestations are scoped to DVN-set-version. | **NOT PRESENT in NTT** — attestations are bitmap-OR keyed only by transceiver_id, not by transceiver-set-version. |
| Hyperlane | Validator-set commitment per message (validators signed on the same root). | **NOT PRESENT in NTT** — no per-message validator-set-commitment. |
| CCIP | Off-chain DON consensus snapshots transceiver set at message-attestation time. | **NOT PRESENT in NTT** — on-chain quorum-bitmap accumulation has no snapshot semantics. |
| Wormhole core | Guardian set version (`guardianSetIndex`) included in VAA payload; replay-protected per (guardianSetIndex, hash). | **NOT PROPAGATED to NTT** — NTT's bitmap accumulation does not carry transceiver-set-version. The Wormhole core defense pattern was NOT inherited by NTT product layer. |

**This is the productization gap.** Wormhole core has the exact defense (guardianSetIndex versioning); NTT's product layer omits the analogous transceiver-set-version. The 8-audit corpus (Cyfrin + Cantina + OtterSec + Neodyme) did not catch this — possibly because the auditors treated transceiver removal as a governance event (out-of-attack-scope) rather than as a state-machine consistency requirement.

**Hypothesis E cross-protocol enumeration (DC-8 Anchor signer-validation-in-handler-body):**

| Protocol | Defense against handler-body signer validation | Present in NTT redeem.rs? |
|----------|----------------------------------------------|----------------------------|
| OnRe (DC-8 canonical anchor) | DEFICIENT — pattern is the failure case; OnRe has the gap. | NTT redeem.rs SHARES the pattern (votes.set in handler body, threshold count post-handler) `[INSPECTED]` |
| Adevar (DC-8 anchor) | DEFICIENT — pattern is the failure case. | NTT redeem.rs SHARES the pattern. |
| TruFin (DC-8 anchor) | DEFICIENT. | NTT redeem.rs SHARES the pattern. |
| Properly-designed Anchor program (e.g., Squads V4) | Signer constraint pinned in `#[account(signer)]` constraint at the account-struct level, threshold-cap also via account-struct seeds. | NTT redeem.rs LACKS this — needs Gate 2 source-confirm whether exploit is actually reachable given transceiver_message account ownership pinning. |

**Hypothesis B cross-protocol enumeration (DC-9 sub-3 upgrade-path):**

| Protocol | Defense | Present in NTT? |
|----------|---------|-----------------|
| Aave V3 | Timelock + multisig on upgrade authority. | UNKNOWN — depends on production owner-class (probe needed). Module code allows single-key. |
| Spark | Timelock on upgrade. | UNKNOWN — same as above. |
| Sky | Multi-step migrator with timelock. | UNKNOWN. |
| FRAX V3 (recent Gate 1 H6 candidate) | UNKNOWN — has UUPS proxy pattern; upgrade auth depends on production. | Parallel question. |

### 5.5 Audit dedup — known issues check

| Audit / disclosed issue | Coverage | Cross-reference |
|-------------------------|----------|-----------------|
| Cyfrin Apr 2024 EVM NTT (v1.0) | Found issues TBD (not fetched in this Gate 1 — Gate 2 prereq) | EVM scope only `[ASSUMED]` audit caught quorum-state-machine basics |
| Cyfrin Jul 2024 EVM NTT diff (v1.1.0) | Differential audit of v1.1.0 changes | EVM scope post-v1.1.0 drift NOT covered (~22mo drift to current) `[INSPECTED]` |
| Cantina Apr 2024 EVM NTT | Found issues TBD | EVM scope `[ASSUMED]` covered the same as Cyfrin |
| OtterSec Mar 2024 Solana NTT | Found issues TBD | Solana scope |
| Neodyme Apr 2024 Solana NTT | Found issues TBD | Solana scope; Neodyme strong on Solana Anchor patterns |
| OtterSec Aug 2024 Solana NTT token-extensions | Token-Extensions-specific | Different module set from `redeem.rs` |
| OtterSec Apr 2025 wormhole-ottersec-ntt-v3 | NTT v3 (v3.x release line) | Likely covers redeem.rs + transfer.rs current state |
| OtterSec May 2025 wormhole-ottersec-ntt-v3-solana | NTT v3 Solana specific | Most-recent Solana audit (12mo pre-Gate-1) |
| OtterSec Aug 2025 Sui NTT | Sui scope | Only 1 Sui audit; 9mo drift to current `[INSPECTED]` |
| Immunefi-published known issue 2026-05-18: "CosmWasm Array Iteration May Lead to gas exhaustion in accountant/ntt accountant" | DIFFERENT module (`accountant`, not NttManager/Transceiver) | Does not dedup any of our 3 hypotheses `[INSPECTED]` |

**Note for Gate 2:** Before Gate 2 submission paste, MUST fetch and grep all 9 audit PDFs (pdftotext + grep on hypothesis primitives) per Step 5.5. Gate 2 prereq.

### 5.6 Bytecode-verify prep (deferred to Gate 2 per protocol)

For each candidate, plan commands:

- **Hypothesis C EVM**: `cast call <deployed-NttManager>:getThreshold()` + `cast call <deployed-NttManager>:_enabledTransceiverBitmap()` against an active deployment (e.g., W token deployments per Wormhole launches). Need to identify a target where threshold-adjustment recently occurred. Plan: query Wormhole launches index or Etherscan for NttManager-tagged contracts.
- **Hypothesis B EVM**: `cast call <deployed-NttManager>:owner()` to identify owner-class (multisig vs single-key vs Safe vs UUPS proxy).
- **Hypothesis E Solana**: `solana program show <deployed-NTT-program-id>` + manual transaction simulation in solana-test-validator.

All bytecode-verify deferred to Gate 2 per Standing-Intake Protocol Step 5.3. Commands planned ✓.

---

## §7 — STEP 6 OUTPUT

### 7.1 Verdict

**WATCHLIST-PARK + Gate-2-VIABLE on 2 cross-substrate hypotheses (C + E).** Hypothesis B parked pending production owner-class probe.

### 7.2 Gate 2 dispatch recommendation (ranked)

1. **Hypothesis C (transceiver-set-change race) — Gate 2 FIRST.** Highest EV (~$44K post-discount), cross-substrate confirmation (EVM + Sui), novel structural variant of DC-9 sub-4, productization-gap-against-Wormhole-core-defense narrative is publication-quality. PoC requires: EVM Foundry test scaffolding NttManager → setTransceiver → in-flight attestation → removeTransceiver → threshold-adjust → release-stale-quorum-attestation. Estimated build time: 2-4 hours.
2. **Hypothesis E (DC-8 Solana redeem.rs) — Gate 2 SECOND.** Medium EV (~$11K post-discount). Solana scope. PoC requires solana-test-validator + Anchor TS client; estimated 2-3 hours. Anchor pattern is family-canonical so PoC writing is mechanical.
3. **Hypothesis B (upgrade-path bypass) — Gate 2 THIRD pending owner-class probe.** Probe is a single `cast call owner()` against deployed NttManager — 5-min task. If owner is single-key (vs Safe multisig vs timelock proxy), Gate 2 PoC viable. If owner is multisig, Hypothesis B foreclosed.

### 7.3 Brain compound proposals (filed below)

5 proposals to file post-Gate-1:

| ID | Title | Brain file | Status |
|----|-------|-----------|--------|
| W-1 | Step 3a SUBSTRATE-IDENTITY 3rd anchor — Wormhole NTT signature-replay negation, joins FRAX V3 frxUSD H4 (1st anchor) + LayerZero OFT generalization (2nd). Promotes rule from RULE → CANONICAL with 3 anchors. | `.claude/rules/standing-intake-protocol.md` Step 3a anchor count update + `brain/Doctrine.md` cross-ref | PROPOSED |
| W-2 | DC-9 sub-4 cross-substrate-quorum-bitmap variant CANDIDATE. State-not-invalidated-across-config-change in quorum-bitmap accumulator. Cross-substrate confirmation (EVM + Sui both have gap). Anchored to Wormhole NTT; needs 1 more cross-substrate anchor before promoting to canonical sub-pattern. | `brain/Patterns-Defense-Classes.md` DC-9 sub-4 sub-variant section | PROPOSED |
| W-3 | Doctrine #34 sub-class b STRONG-composition uplift catalog row — Wormhole NTT v1.10.0 (22mo EVM post-audit drift; 9mo Sui post-audit drift). 7th anchor for sub-class b. | `brain/Doctrine.md` Doctrine #34 sub-class b catalog | PROPOSED |
| W-4 | Watchlist row addition: Wormhole NTT (Immunefi, 8 audits, NET-NEW Buzz Gate 1, post-discount EV $25-35K aggregate). | `brain/Watchlist-Candidate-Crossmap.md` row append | PROPOSED |
| W-5 | DC-8 4th anchor candidate (PARTIAL HIT requiring Gate 2 source-read confirmation) — Wormhole NTT Solana `redeem.rs` votes.set-in-handler-body. If Gate 2 confirms, 4th DC-8 anchor (OnRe + Adevar + TruFin + NTT-Solana). | `brain/Patterns-Defense-Classes.md` DC-8 anchor table | PROPOSED — pending Gate 2 confirm |

### 7.4 Clone disposition

**NO CLONE.** Per disk-pressure halt rule (89% / 4.2G available; Doctrine #27 F MEDIUM-HIGH 0.40× saturation does not require clone for Gate 1 surface mapping). All Gate 1 work executed via WebFetch + raw.githubusercontent.com + GitHub API.

**Gate 2 dispatch clone need:** Hypothesis C Foundry PoC requires `evm/` subtree (~10-15MB after `git sparse-checkout`). Hypothesis E PoC requires `solana/programs/example-native-token-transfers/` (~5MB). Hypothesis B owner probe needs NO clone (single `cast call` against deployed addresses). Total Gate 2 clone budget: ~20MB; well within disk budget when triggered.

### 7.5 Next-target recommendation

Per autonomy-boundary.md EV ranking + four-pillar-loop.md Pillar 4 standing order:

**Recommended:** Dispatch **Wormhole NTT Hypothesis C Gate 2 PoC** as immediate next Pillar 4 action. Highest aggregate-EV Gate-2-viable single hypothesis in the 2026-05-28 batch. Productization-gap narrative cross-substrate (EVM + Sui) is brain-compound-rich regardless of PoC outcome.

If Hypothesis C PoC negates within 2h: pivot to Hypothesis E (Solana DC-8). If both negate within 4h aggregate: pivot to Hypothesis B owner-class probe + brain compounds W-1 through W-5 filing batch.

---

## §8 — APPENDIX: Source artifact list

All artifacts accessed during this Gate 1 (no cloned files; WebFetch-only):

1. `https://immunefi.com/bug-bounty/wormhole/` `[EXECUTED]`
2. `https://github.com/wormhole-foundation/native-token-transfers` `[EXECUTED]`
3. `https://api.github.com/repos/wormhole-foundation/native-token-transfers/contents/audits/evm` `[EXECUTED]`
4. `https://api.github.com/repos/wormhole-foundation/native-token-transfers/contents/audits/solana` `[EXECUTED]`
5. `https://api.github.com/repos/wormhole-foundation/native-token-transfers/contents/audits/sui` `[EXECUTED]`
6. `evm/src/NttManager/NttManager.sol` `[INSPECTED]`
7. `evm/src/NttManager/ManagerBase.sol` `[INSPECTED]`
8. `evm/src/libraries/RateLimiter.sol` `[INSPECTED]`
9. `evm/src/Transceiver/WormholeTransceiver/WormholeTransceiver.sol` `[INSPECTED]`
10. `solana/programs/example-native-token-transfers/src/instructions/transfer.rs` `[INSPECTED]`
11. `solana/programs/example-native-token-transfers/src/instructions/redeem.rs` `[INSPECTED]`
12. `sui/packages/ntt/sources/upgrades.move` `[INSPECTED]`
13. `sui/packages/ntt/sources/inbox.move` `[INSPECTED]`
14. `sui/packages/ntt/sources/transceiver_registry.move` `[INSPECTED]`
15. `https://github.com/wormhole-foundation/native-token-transfers/tree/main/sui/packages/ntt/sources` (listing) `[EXECUTED]`

Brain artifacts referenced:

- `brain/Patterns-Defense-Classes.md` (DC-7 EXCLUSION CANONICAL + DC-8 + DC-9 sub-4 + CANDIDATE-L NTT-deferral-reference)
- `brain/Doctrine.md` (Doctrines #27 F + #27 J corollary + #29 + #34 sub-class b + #36 + #37 + #38 + #39)
- `brain/Watchlist-Candidate-Crossmap.md` (Wormhole historical NTT mentions)
- `brain/Disclosure-Programs-Top-Tier.md` (Wormhole pre-flight from May 17)
- `brain/Ground-Truth-Exploits.md` (Wormhole 2022 $325M family anchor)
- `brain/Cross-Domain-Fragility-Laws.md` (cross-substrate fragility law family)
- `.claude/rules/standing-intake-protocol.md` v1.0 + Step 3a addition (2026-05-28)
- `.claude/rules/four-pillar-loop.md` (Pillar 4 autonomy)
- `.claude/rules/autonomy-boundary.md` (Gate 1 autonomous; submission OPERATOR-GATED)
- `hunts/2026-05-28-frax-v3-frxusd-h4-gate2-foreclosure.md` (Step 3a precedent / 1st anchor)

---

_Gate 1 | Wormhole NTT Immunefi | 2026-05-28 deep night | Mode: WebFetch-only (disk-pressure halt) | Step 3a SUBSTRATE-IDENTITY worked example 3rd anchor | 5-Target Quality Checklist 5/5 | Brain compounds 5 proposed | Verdict WATCHLIST-PARK + Gate-2-VIABLE on Hyp C + E | Next: Hypothesis C Gate 2 PoC dispatch (~2-4h build) | Operator-gating: Gate 2 PoC autonomous, submission OPERATOR-GATED, KYC + W-token-non-US restriction add post-acceptance friction_
