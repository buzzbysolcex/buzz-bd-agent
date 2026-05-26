# Across Protocol — Gate 1 PRE-CLONE HALT (Platform-Status Preflight Failed)

**Target:** Across Protocol V3 (`across-protocol/contracts`)
**Date:** 2026-05-26
**Status:** HALTED at Standing-Intake Step 1 (Platform-Status Preflight) — operator decision required
**Reason:** C-Cap-4 Platform-Status Preflight rule cannot confirm canonical Immunefi listing for Across; conflicting signals between Buzz internal watchlist + live Immunefi search + Across docs.

---

## STEP 0 — PRIOR-CORPUS LOOKUP (CLEAN)

- **`hunts/**/*across*`**: 0 files [INSPECTED]
- **`decisions/**/*across*`**: 0 files [INSPECTED]
- **`brain/**/*[Aa]cross*`**: 0 files matching (all 26 grep matches on "across" in brain are generic-preposition uses, NOT Across-Protocol-as-entity) [INSPECTED]
- **`brain/Watchlist-Candidate-Crossmap.md`**: NO row for Across [INSPECTED]
- **`brain/Audit-Reports-Library.md`**: NO entry for Across [INSPECTED]
- **`brain/Disclosure-Programs-Top-Tier.md`**: NO row for Across [INSPECTED]
- **`brain/Security-Research-Submission-Ledger.md`**: NO submission [INSPECTED]
- **2026-05-23 Lane 1 watchlist-expansion** (`hunts/2026-05-23-lane1-watchlist-expansion-defillama-top100.md` line 92, 148): Across DID appear as `immunefi $1500K, repo across-protocol/contracts, TVL $350M, EV-Tier medium, slug across`. Source: DeFiLlama+scrape, NOT live-verified at time of dispatch [INSPECTED]

**No prior Gate 1 artifact for Across. Confirmed net-new dispatch.**

---

## STEP 1 — PROFILE (HALT — conflicting signals)

| Field | Buzz watchlist (2026-05-23) | Live Immunefi (2026-05-26 fetch) | Across docs (2026-05-26 fetch) |
|---|---|---|---|
| Platform | `immunefi` | NOT FOUND on `/explore?query=across` (219 programs scanned) | Self-hosted via `bugs@across.to` |
| Slug | `across` | `/bug-bounty/across/` → 404, `/bug-bounty/acrossprotocol/` → 404, `/bug-bounty/across-protocol/` → 404, `/bug-bounty/acrosstoken/` → 404, `/bounty/across/` → 404 | N/A (email-only) |
| Critical cap | $1.5M (USD) | (cannot verify — slug returns 404) | $1M (USD) per `docs.across.to/introduction/bug-bounty` |
| High cap | (not specified in cached watchlist) | (cannot verify) | $10K |
| Medium cap | (not specified) | (cannot verify) | $1K |
| Low cap | (not specified) | (cannot verify) | $250 |
| KYC | (not specified in cached watchlist) | (cannot verify) | Not specified in docs |
| Payer history | (not specified in cached watchlist) | (cannot verify) | UMA/Risk Labs (T&C references UMA bug-bounty program) |
| Scope | `across-protocol/contracts` | (cannot verify) | "all smart contracts in across-protocol repo + off-chain code + bots + front-end; excludes previously known/disclosed vulns" |
| PoC | (not specified) | (cannot verify) | Detailed exploit + mitigation guidance + suggested severity (OWASP risk-rating) |
| Public payout tracker | (not visible) | (cannot verify — no program page found) | None |

**Repo HEAD verified live:** [INSPECTED] `across-protocol/contracts` master @ `9ffb2ab264643d2efe137f629ebc95d667c1e2ec` (commit 2026-05-19 21:40Z, 7 days ago); default_branch=`master`, size 26MB, primary language Solidity. Last `pushed_at` 2026-05-26T03:59Z (TODAY). HEAD commit touches `ArbitraryEVMFlowExecutor` (token handling + balance reads + drain logic — a NEW component per HEAD message).

**Anomaly:** [ASSUMED] Across likely **migrated OFF Immunefi to self-hosted email disclosure** between 2026-05-23 watchlist scrape and 2026-05-26 live check. OR the Buzz watchlist data was inaccurate at scrape time. Cannot adjudicate without operator clarification.

**Platform STATUS preflight verdict:** **HALT** per C-Cap-4 rule (added 2026-05-25 — Cap Sherlock #990 FINISHED anchor). Operator brief specified "Immunefi program"; live Immunefi search returns no match; canonical bug-bounty docs page on Across shows self-hosted email path. **Proceeding with clone risks brief-mismatch + wasted disk** (currently 87%, in caution band per Doctrine #32 v1.1.1 halt-at-88% rule).

---

## STEP 2 — BRAIN OVERLAP SCORE (computed, surface preserved regardless of platform decision)

**Score: HIGH** [INSPECTED] — strongest cross-chain-bridge candidate evaluated since LiFi (which foreclosed at MEDIUM per Doctrine #27 sub-rule).

| Brain lens | Hit? | Reasoning [grade] |
|---|---|---|
| **CANDIDATE-A** (cross-chain bridge family — Wormhole/Nomad/KelpDAO $290M sibling) | **DIRECT FIT** | Across V3 is canonical intent-based cross-chain bridge: HubPool (Ethereum) ↔ SpokePool (per chain) attestation, Optimistic Oracle dispute, relayer-fill path. Same family as Wormhole guardian-attestation + Nomad message-root + Stargate OFT-DVN. **First Buzz Gate 1 on intent-based-bridge sub-family** (LiFi was aggregator-quote; Across is settlement-layer.) [INSPECTED] |
| **DC-6** cross-domain trust boundary | **HIGH** | HubPool root-bundle propagation to SpokePool across N chains. Validator(s) post root, relayer asserts fill, Optimistic Oracle adjudicates dispute window. Each leg is a trust boundary. [INSPECTED] |
| **DC-7** Validating-Field ≠ Consuming-Field on adjacent function pipelines | **HIGH** | Across V3 has `depositV3` writing one struct shape + `fillRelay` consuming a re-built struct hash. Field-binding gap risk class is the exact DC-7 anchor (Wormhole `_completeTransfer` divergence is the canonical sibling per `brain/Patterns-Defense-Classes.md:222`). [ASSUMED — not source-confirmed without clone] |
| **DC-9** privileged state mutation without defense-in-depth | **MEDIUM-HIGH** | HubPool owner functions (`setLiveness`, `setBond`, `setSpoke`) — DC-9 sub-2 (zero-timelock migration) candidate. [ASSUMED] |
| **DC-12 sub-7** oracle wrapper strips staleness | **MEDIUM** | Across uses UMA Optimistic Oracle for dispute; price-feed wrapper for token-to-token swap fees. Sub-7 fits if any wrapper sheds staleness invariants. [ASSUMED] |
| **DC-13** notification-callback divergence | **MEDIUM** | `handleAcrossMessage` cross-chain callback on `fillRelayWithMessage` — receiver-contract callback class. [ASSUMED] |
| **CANDIDATE-O** lending composition | **LOW-MEDIUM** | Across V3 SpokePool composability — `fillRelayWithMessage` callback to recipient contract is composition surface. Less canonical-fit than vault-class. [ASSUMED] |
| **CANDIDATE-P** durable-nonce pre-signed tx accumulation (Drift $285M anchor) | **LOW** | Across relayer signs fills off-chain; if any relayer-replay path exists, CANDIDATE-P applies. Most pre-signing on Across is per-fill not durable. [ASSUMED] |
| **CANDIDATE-R** reward-accumulator | **LOW** | LP fee distribution via HubPool — accumulator pattern present but lower-attention-surface than bridge mechanics. [ASSUMED] |
| **Doctrine #34** post-audit composition multiplier | **HIGH (anchor candidate)** | HEAD commit 2026-05-19 touches `ArbitraryEVMFlowExecutor` — a NEW component handling token transfers + balance reads + drain logic. New component added post-OpenZeppelin-audit-baseline = Doctrine #34 multiplier candidate. **This is the highest-signal finding from Step 1+2.** [INSPECTED — HEAD commit message confirms] |
| **Lens-FT-CircuitBreaker-Asymmetry** (Selective-Coverage Defense Asymmetry) | **NOT TESTABLE pre-clone** | Need to grep README + source for "by design" / "does not cover" / "out-of-scope" comments on any defense module (CircuitBreaker / Pauser / Guardian / KillSwitch / RateLimiter / SlippageGuard). Defer to Step 5.6. [DEFERRED] |

**HIGH overlap drivers (3+ direct lens hits):**
1. CANDIDATE-A DIRECT FIT (canonical bridge family)
2. DC-6 + DC-7 HIGH (cross-domain + field-binding-gap, both bridge-architecture-native)
3. Doctrine #34 anchor candidate (new component `ArbitraryEVMFlowExecutor` in HEAD)

**Compounding factor:** Across V3 spans EVM (Solidity) + Solana SVM (Rust/Anchor) — multi-substrate. Buzz brain has cross-substrate Solana lenses (CANDIDATE-G Anchor-Signer-Validation, DC-8 moved-out-of-Accounts-struct) that could fire on `svm_spoke`. **Substrate diversity multiplier applies.**

---

## STEP 3 — EV CALCULATION

Two EV scenarios, depending on Step 1 platform-status resolution:

### Scenario A — Immunefi $1.5M Critical cap (per Buzz watchlist, requires operator confirmation)

```
P(finding)              = 0.15  (HIGH overlap; intent-based-bridge family novel for Buzz; Doctrine #34 anchor candidate present)
bounty_cap              = $1,500,000 USD (Immunefi Critical)
P(acceptance)           = 0.40  (Immunefi-tenured payer assumed; specific Across payout history unverified)
brain_overlap_multiplier = 1.0   (HIGH)

EV = 0.15 × 1,500,000 × 0.40 × 1.0 = $90,000
```

### Scenario B — Self-hosted email $1M Critical cap (per docs.across.to)

```
P(finding)              = 0.15  (same as A; substrate same)
bounty_cap              = $1,000,000 USD
P(acceptance)           = 0.20  (self-hosted-email path; no public payer history; UMA T&C reference but unverified Across-direct payouts)
brain_overlap_multiplier = 1.0

EV = 0.15 × 1,000,000 × 0.20 × 1.0 = $30,000
```

**Doctrine #27 saturation check:** [ASSUMED — not source-confirmed] Across is audited by OpenZeppelin "continuously" per README. Specific audit-count not surfaced in WebFetch (`docs.across.to/resources/audits` returned non-audit-content; GitHub `audits/` tree URL returned 404). Cannot apply Doctrine #27 discount precisely. Default assumption: **<15 audits** (Across is one-firm-continuous-audit model, NOT multi-firm-saturation pattern). Doctrine #27 discount: **none applied** until audit count verified post-clone.

**Doctrine #32 v1.1 check:** **PASS** [INSPECTED]. HEAD commit 7 days ago + `pushed_at` TODAY = high commit recency. `dangerous_area_changes_365d` cannot be confirmed without Layer 0 git-security analyzer, but the HEAD message ("fixes to `ArbitraryEVMFlowExecutor`, improvements to token handling, balance reads, drain logic") implies dangerous-area mutation in current 30d window. Doctrine #32 v1.1 PASS condition `dangerous_area_changes_365d >= 10 OR audit_age_days <= 180` likely satisfied via first leg.

**Doctrine #32 v1.1.1 mature-deploy check:** `days_since_last_commit = 7` (FAR below 365 threshold). NOT a mature-deploy hold. Active-development substrate. ✓

---

## STEP 4 — QUEUE DECISION (operator decides; my recommendation conditional on Step 1 resolution)

| Step 1 resolution | EV tier | Recommended action |
|---|---|---|
| Confirmed Immunefi $1.5M | $90K EV | **Standard Gate 1** — queue same-day (HIGH overlap + $50K-$500K cap row in protocol) |
| Confirmed self-hosted email $1M | $30K EV | **Gap-fill Gate 1** — queue when high-priority Gate 1s clear (HIGH overlap + <$50K-EV-equivalent row) |
| Cannot confirm either | $0 EV (cannot bid) | **Watchlist hold** — pending operator clarification |

**My recommendation:** **STANDARD GATE 1 if operator confirms Immunefi path is viable** (Scenario A). The brain-overlap is the highest-confidence intent-based-bridge candidate evaluated since LiFi, with a Doctrine #34 anchor-candidate in HEAD. Even at Scenario B ($30K EV), Across is worth a Gate 1 IF disk pressure allows, because the substrate diversity (EVM+SVM) + new-component (`ArbitraryEVMFlowExecutor`) combination is a productive brain-compound surface regardless of submission economics.

---

## STEP 5 — GATE 1 EXECUTION (NOT EXECUTED — held pending Step 1 resolution)

**Pre-flight checks completed (operator may consume):**

5.0 **Disk pre-check:** [INSPECTED] `df -h /` → 87% used, 5.0G available. **Caution band per Doctrine #32 v1.1.1.** Shallow clone of `across-protocol/contracts` (26MB repo) is feasible (projected post-clone ~87.1%, below 89% halt-threshold). NOT projected to breach.

5.1 **Clone command prepared (not executed):**
```bash
GIT_TERMINAL_PROMPT=0 git clone --depth 1 \
  https://github.com/across-protocol/contracts \
  /home/claude-code/buzz-workspace/.gate1-work/across-immunefi-2026-05-26/contracts
```

5.2 **Pre-flight scope-check:** [DEFERRED] — need verified scope list from canonical bounty page (whichever path operator confirms). Buzz watchlist says `across-protocol/contracts` repo entirely; Across docs say "all smart contracts in across-protocol repo + off-chain code + bots + front-end" — the latter is broader (includes `across-protocol/relayer-v2` TypeScript relayer). Operator should clarify which sub-repos are in-scope before clone.

5.3 **Bytecode-verify prep:** [DEFERRED] — HubPool + SpokePool addresses available in repo `deployments/mainnet.json` post-clone. Plan: `cast code <addr> --rpc-url <chain>` + `solc --standard-json` direct compile per Veda+Wormhole lesson.

5.4 **Layer 0 git-security analyzer:** [READY] Script exists at `/home/claude-code/buzz-workspace/scripts/lane1/git-security-analyzer.js` [INSPECTED `ls`]. Will run post-clone if operator GREEN-LIGHTS.

5.5-5.13 **Inventory + brain-lens application + 5-target checklist + R8 grading + auto-index:** [DEFERRED pending operator decision]

---

## OPERATOR-OPTIONS SURFACE

**OPTION 1 — Confirm Immunefi path, dispatch Standard Gate 1 (Scenario A, EV $90K)**
- I clone shallow + run full Standing-Intake Steps 5.0-5.13
- Output: `hunts/2026-05-26-across-immunefi-gate1.md`
- Risk: if Immunefi listing actually inactive, submission path is broken at Gate 4-5 (post-finding). Brain compound preserved either way.
- Operator action: paste the canonical Immunefi URL OR confirm "use the cached $1.5M datapoint from watchlist; we'll verify submission path at Gate 4."

**OPTION 2 — Confirm self-hosted email path, dispatch Gap-Fill Gate 1 (Scenario B, EV $30K)**
- I clone shallow + run full Standing-Intake Steps 5.0-5.13
- Output: `hunts/2026-05-26-across-self-hosted-gate1.md` (different filename to reflect platform divergence)
- Risk: lower EV, longer SLA, no triager. But Doctrine #34 anchor candidate makes brain compound positive regardless.
- Operator action: confirm "use bugs@across.to path; $1M Critical cap acceptable."

**OPTION 3 — Pivot to next-highest-EV target on the dispatch queue (skip Across this cycle)**
- I HALT Across Gate 1, log this PRE-CLONE-HALT file as decision artifact, return to dispatch queue
- Risk: lose timing window if Across moves back to Immunefi later. Doctrine #34 anchor remains in HEAD until Across patches the new component.
- Operator action: name a substitute target (e.g., `safe`, `aave-v3`, `pancakeswap-amm-v3`, or a non-watchlist target).

**OPTION 4 — Brain-compound only, no Gate 1 file (lowest-cost path)**
- I skip clone, file proposals P1+P2+P3 below to brain (per "BRAIN COMPOUND PROPOSALS" section), close intake without Gate 1 file
- Risk: lose the Doctrine #34 anchor signal if it stays unexamined; competitor auditor may find `ArbitraryEVMFlowExecutor` issue first
- Operator action: confirm "brain-compound only; circle back to Across if a $250K+ EV signal emerges."

---

## BRAIN COMPOUND PROPOSALS (FROZEN PENDING OPERATOR)

### P1 — Add Across V3 to `brain/Watchlist-Candidate-Crossmap.md` as CANDIDATE-A direct-anchor

**Why:** Across V3 is the canonical intent-based cross-chain bridge — sibling of Wormhole guardian-attestation + Nomad message-root families. Buzz has NO entry for Across in the crossmap despite multiple HIGH-DC overlap (DC-6, DC-7, CANDIDATE-A). Watchlist-row anchors the substrate for future propagation scans (next time CANDIDATE-A worked-example surfaces in another bridge, Across is one row to check).

**Row proposal (uses existing crossmap schema):**
```
| across-protocol/contracts | <TBD post-clone> | <TBD post-Layer0> | DC-6, DC-7, DC-9, CANDIDATE-A, CANDIDATE-O, Doctrine #34 | Intent-based bridge family; HubPool↔SpokePool↔OptimisticOracle; multi-substrate EVM+SVM. ArbitraryEVMFlowExecutor new component in HEAD 2026-05-19. |
```

### P2 — `brain/Doctrine.md` Doctrine #34 anchor candidate: `ArbitraryEVMFlowExecutor` in Across V3 HEAD

**Why:** Per Doctrine #34 ("post-audit composition multiplier"), new components added to a continuously-audited bridge codebase AFTER the audit baseline are the highest-signal candidates. The HEAD commit message for Across (`9ffb2ab26464`, 2026-05-19) explicitly cites improvements to a component that handles token movements + balance reads + drain logic — the exact functional surface where post-audit Pattern A / Pattern E / DC-9 sub-pattern bugs land in bridge history (Nomad replay, Wormhole signature-validation gap, KelpDAO L2 transfer).

**Proposal:** Once Gate 1 is dispatched (if operator approves Option 1 or 2), document Across `ArbitraryEVMFlowExecutor` as the 2nd anchor (or 1st, if no prior anchor exists) for Doctrine #34 v1.0 anchor catalog.

### P3 — `brain/Audit-Reports-Library.md` — add Across continuous-OpenZeppelin-audit row

**Why:** Across uses a single-firm-continuous-audit model (OpenZeppelin) which is DIFFERENT from the multi-firm-saturation pattern (Sky 12-audit / Uniswap 9+/Cantina). This is the **second canonical anchor** for the "single-firm-continuous" sub-pattern (first anchor: Risk Labs UMA, also OpenZeppelin-audited). Doctrine #27 saturation calibration may need a sub-pattern for single-firm-continuous (potentially different discount tier vs multi-firm-saturated).

**Proposal:** Once audit list is verified post-clone, file row in Audit-Reports-Library with audit-firm-count=1, cadence=continuous, distinct from multi-firm-saturated catalog rows.

### P4 — `brain/Disclosure-Programs-Top-Tier.md` — clarify platform-migration tracking

**Why:** Across appears to have migrated OFF Immunefi between 2026-05-23 (Buzz watchlist) and 2026-05-26 (live check). This is a NEW failure mode for Standing-Intake Step 1 — programs CAN migrate platforms mid-dispatch-window. Current Step 1 PROFILE column doesn't track platform-migration history.

**Proposal:** Add a "Platform Migration Log" sub-section to `Disclosure-Programs-Top-Tier.md` (or a new `brain/Platform-Migration-Log.md`) that records: program slug, prior platform, new platform, date observed, source of observation. Across is the first canonical anchor. Sets expectation for future Step 1 PROFILE freshness checks.

---

## DISK DELTA

Pre-intake: 87% used [INSPECTED]
Post-intake: 87% used [INSPECTED] — NO clone performed, only WebFetch + brain reads + this file write (<10KB)

---

## R8 CALIBRATED SUMMARY

| Claim | Grade |
|---|---|
| Across V3 NOT on Immunefi as of 2026-05-26 live check | `[INSPECTED]` (5 URL variants 404, explore search returned 0 matches) |
| Across V3 on Buzz watchlist as of 2026-05-23 with Immunefi $1.5M cap | `[INSPECTED]` (hunts/2026-05-23-lane1-watchlist-expansion-defillama-top100.md line 92, 148) |
| Across docs (`docs.across.to/introduction/bug-bounty`) shows self-hosted email $1M Critical | `[INSPECTED]` (WebFetch result) |
| HEAD commit `9ffb2ab26464` touches `ArbitraryEVMFlowExecutor` (token/balance/drain) | `[INSPECTED]` (GitHub API + commit endpoint) |
| Across V3 substrate spans EVM Solidity + Solana SVM | `[INSPECTED]` (README scope) |
| Across-Protocol migrated FROM Immunefi TO self-hosted email between 2026-05-23 and 2026-05-26 | `[ASSUMED]` (two-source conflict; alternative explanation: Buzz watchlist data was incorrect at scrape time) |
| Across <15 audits (NOT Doctrine #27 saturation tier) | `[ASSUMED]` (audit count not verified; OpenZeppelin "continuous" cadence cited in README, count not enumerated in `docs.across.to/resources/audits` WebFetch) |
| Doctrine #34 anchor-candidate quality of `ArbitraryEVMFlowExecutor` | `[ASSUMED]` (HEAD commit message strongly indicates dangerous-area surface, but full code-read not performed pre-HALT) |

---

## GATE 2 RECOMMENDATION

**N — no Gate 2 dispatch until Gate 1 file is produced.** Re-enter dispatch queue post-operator-decision per Option 1-4 above.

---

_Standing-Intake Step 1 HALT | C-Cap-4 Platform-Status Preflight rule | Operator decision required before Step 5 clone proceeds_
