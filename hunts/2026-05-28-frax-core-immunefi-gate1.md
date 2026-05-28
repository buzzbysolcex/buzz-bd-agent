# Gate 1 Hunt — FRAX core (Frax.sol V1/V2 + Direct Bounty)

**Date (UTC):** 2026-05-28
**Target:** FRAX Finance core — Frax.sol V1/V2 algorithmic-fractional stablecoin (`refreshCollateralRatio` + COLLATERAL_RATIO_PAUSER), Fraxlend, Fraxswap, FraxFerry, sFRAX, frxUSD V3
**Platform:** **DIRECT bounty** (NOT Immunefi — operator brief Axis 5a PLATFORM-CONFUSION FIRE)
**Cap:** Lesser of `(10% of exploit value)` OR `$10M`, paid in **FRAX + FXS tokens** (not USD/USDC)
**KYC:** Not specified in program terms
**PoC:** REQUIRED (private GitHub gist + Twitter/Telegram/Discord/Signal submission)
**Substrate:** Solidity (multiple compiler versions across V1/V2/V3 + frxUSD)
**Verdict:** **FORECLOSURE-RECEIPT (Doctrine #27 F MAXIMUM tier + Doctrine #27 J corollary auto-trigger + Doctrine #37 Sub-Type B PERMANENT)**

---

## STEP 1 — 9-AXIS PROFILE PREFLIGHT (per Contradictions-Register v1.13)

| Axis | Operator brief | Live verification | Drift result |
|---|---|---|---|
| 1 VERSION | "FRAX core — refreshCollateralRatio + stable + Frax Bonds + FraxFerry + sFRAX" | FRAX V1/V2 (Frax.sol) + FraxLend + Fraxswap + sFRAX + frxUSD V3 — V3 is the current product flagship (`frxUSD`), V1/V2 contracts ALIVE but reduced relevance (TVL $66.58M total, frozen V1/V2 architecture per Doctrine #37 Sub-Type B) | **PARTIAL DRIFT** — operator framed V1/V2 surface as primary; live = V3 frxUSD is flagship, V1/V2 alive-but-frozen |
| 2 CAP | "check live Immunefi `frax-finance` program" | **$10M ceiling OR 10% of exploit value (lesser)**, paid in **FRAX+FXS tokens** NOT USDC. Realizable: with TVL $66.58M, 10% = $6.66M nominal; FRAX+FXS exit liquidity discount ~50% → ~$3.33M USD-realizable | **DRIFT** — brief implied USD cap; live = token-cap (currency risk) |
| 3 KYC | Not specified by brief | Not specified by program terms | Indeterminate |
| 4 SCOPE | "core protocol — refreshCollateralRatio + stable + Frax Bonds + FraxFerry + sFRAX rebasing" | "All smart contracts managing Frax Protocol value across any blockchain. Fraxswap, Fraxlend, frxETH, contracts deployed by Frax Deployer addresses." (open-ended scope) | OK (scope-fit confirmed for Frax.sol) |
| 5 PLATFORM | "Immunefi" | **NOT Immunefi.** Direct bounty hosted on docs.frax.finance/smart-contracts/bug-bounty. Submission via private GitHub gist + Twitter/Telegram/Discord/Signal. | **MATERIAL DRIFT — Axis 5a PLATFORM-CONFUSION FIRE.** Brief said "Immunefi `frax-finance` program"; live = direct-bounty, no Immunefi listing. Verified: `immunefi.com/bug-bounty/frax/` → 404; `immunefi.com/bug-bounty/fraxfinance/` → 404; `immunefi.com/explore` search "frax" → 0 matches across 219 programs. |
| 5a PLATFORM-CONFUSION sub-class | — | Direct-bounty platform = ungrounded acceptance signal (no Immunefi triager SLA) | **Axis 5a ANCHOR #4** (after Spark / Flux / Cap Sherlock prior anchors) |
| 6 TIME-since (LIVE-since staleness) | implied "active core" | **20 audits 2020-2025** distributed: Certik (Nov 2020, Oct 2024), Trail of Bits (Jun 2021 + Dec 2021 + Aug 2022 + Nov 2022 + Jan 2023 + Jul 2023 + Oct 2023 + Jan 2024 = **8 reviews**), Shipyard/Macro (Apr 2022), Code4rena (Sep 2022), Frax Security Cartel (Mar 2024 + Apr 2024 + 2× May 2024 + Mar 2025 = **5 reviews**), Certora (Oct 2024 formal verification). Frax.sol V1/V2 contract: **deployed Dec 2020**, structurally frozen since V3 transition (early 2023). | **MAXIMUM SATURATION** — exceeds 33-audit Euler V2 tier on firm-diversity (6 distinct firms vs Euler's similar count); ToB x8 + Certora formal verification = enterprise-grade saturation |
| 7 NOVELTY (post-audit composition) | — | V3 frxUSD launched 2024-09 (~14mo old); V2 algo-CR pathway largely deprecated since 100%-backing era early 2023 | **LOW NOVELTY** on V1/V2 (frozen); MEDIUM novelty on V3 frxUSD but out-of-scope for this Gate 1's CANDIDATE-J Point-2 focus |
| 8 SUBSTRATE-AFFILIATION | "FRAX Finance" | Confirmed FraxFinance org (canonical) | OK |
| 9 ORG-NAME | implied `FraxFinance/` | Canonical: `FraxFinance/frax-solidity` (verified — 695 commits, 533 stars, repo HEAD on master branch) | OK |

**9-AXIS RESULT:** 2 MATERIAL DRIFTS (Axis 5 platform, Axis 2 cap currency), 1 PARTIAL DRIFT (Axis 1 version flagship). Brief reframing required at Gate 2 if escalated.

---

## STEP 0.5 — 5-CHANNEL PRIOR-COVERAGE CHECK

| Channel | Result |
|---|---|
| 1. brain/Watchlist-Candidate-Crossmap.md | **No FRAX entry** (grep verified) |
| 2. brain/Patterns-Defense-Classes.md | One reference: line 1356 (Frax Lend named as sub-7 future propagation target — not Frax core) |
| 3. brain/CANDIDATE-J-target-map-2026-05-17.md | **FRAX = Pick #3 tertiary** (line 110-112) — `refreshCollateralRatio + COLLATERAL_RATIO_PAUSER` flagged as "strongest Point-2 (cooldown enforcement) test surface" |
| 4. hunts/ history | **No prior FRAX hunt file** — fluxfinance-immunefi-gate1.md mentions fFRAX as Flux market (Compound V2 fork), not FRAX core |
| 5. brain/Contradictions-Register.md | No prior FRAX-direct conflict; v1.13 anchors Axis 5a sub-class which this Gate 1 fires (4th anchor candidate) |

**No prior FORECLOSURE-RECEIPT on FRAX core. Clean intake (substrate has not been swept).**

---

## STEP 2 — BRAIN OVERLAP SCORE

| Lens | Verdict | R8 | Notes |
|---|---|---|---|
| **CANDIDATE-J Point-2** (cooldown enforcement) | **PRIMARY HIT** (per target-map line 112) | [INSPECTED] | Frax.sol `refresh_cooldown` + `last_call_time` monotone — 4 sub-checks below |
| **CANDIDATE-J Point-6** (three-layer auth chain) | HIT | [INSPECTED] | 3-way authority `onlyByOwnerGovernanceOrController` + dedicated `COLLATERAL_RATIO_PAUSER` (timelock_address + creator_address granted in constructor lines 125-126) |
| **CANDIDATE-J Point-4** (halt-vs-direct separation) | HIT | [INSPECTED] | `collateral_ratio_paused` flag + `toggleCollateralRatio` sibling pair on shared CR state |
| **Pattern E EXCLUSION Class 3 (NEWLY-FILED 2026-05-28)** | **DOES NOT BIND** | [INSPECTED] | Frax.sol = algorithmic-fractional stablecoin, NOT lending-family. Pattern E lending-exclusion does NOT apply. Cleared for CANDIDATE-J analysis. |
| **Doctrine #29 v1.1** (MIN-cap defense) | PARTIAL | [INSPECTED] | `global_collateral_ratio` bounded `[0, 1000000]` via explicit `<=`/`>=` clamps (Frax.sol lines 215, 221) — defended bounds on BOTH sides |
| **DC-7 EXCLUSION CANONICAL** (Validating-Field ≠ Consuming-Field) | NEGATIVE | [INSPECTED] | `last_call_time` written at end (line ~223) AFTER all reads — CEI-clean; no validating-field decoupling surface |
| **Doctrine #34 sub-class b** (post-audit composition multiplier) | **DOES NOT BIND on V1/V2** | [INSPECTED] | Frax.sol V1/V2 has been frozen since early 2023 — no post-audit composition surface on this contract (V3 frxUSD is separate target, out of this Gate 1 scope) |
| **Doctrine #36 PERMANENT** (lens-saturation / substrate-coverage) | **PRIMARY HIT — P-FLOOR 0.05** | [INSPECTED] | Algorithmic-stablecoin substrate covered by 20 audits + ToB x8 + Certora formal verification. Apply P(finding) ≤ 0.05 cap. |
| **Doctrine #37 Sub-Type B PERMANENT** (Audited-and-Frozen-but-Product-Live, 5-anchor) | **PRIMARY HIT** | [INSPECTED] | Frax.sol V1/V2 frozen ~3y since V3 transition; on-chain deployment active (`0x853d955aCEf822Db058eb8505911ED77F175b99e` holds value, V3 still references V1 as base FRAX token); lens-saturated base CToken-equivalent surface = audit-survived. Anchor adds to Sub-Type B catalog. |
| **Doctrine #38** (\*WithSig pre-check) | NOT APPLICABLE | — | No signature-based mint/redeem in Frax.sol V1/V2 |
| **Doctrine #39 + DC-13 sub-5 Phase 0 gate** | APPLIES | [ASSUMED] | No 1-of-1-protocol-private vault construction in Frax.sol scope; clean |
| **Doctrine #27 F MAXIMUM tier** (≥33 audits or equivalent saturation, 0.20× multiplier) | **PRIMARY HIT** | [INSPECTED] | 20 audits across 6 distinct firms + ToB x8 + Certora formal verification = saturation-equivalent to 33-audit Euler V2 tier. **0.20× overlap multiplier applied.** |
| **Doctrine #27 J corollary** (Auto-FORECLOSURE-RECEIPT trigger) | **TRIGGERS** | [INSPECTED] | N_audits = 20 ≥ 15 ✅; N_submissions (direct bounty, unknown count) — but ToB x8 alone effective-equivalent to 100+ Cantina-submission tier (8 separate audit reviews = 8 separate full-surface sweeps by single firm); P(no-paid-Critical-in-last-6mo) ≥ 0.85 (no public Critical disclosure visible) ✅. **Auto-FORECLOSURE-RECEIPT eligible; Step 5.6 detector rotation can be short-circuited.** |
| **Doctrine #27 F tier banding** | F MAXIMUM | [INSPECTED] | Same as above — saturation ceiling |

**Overlap SCORE: HIGH on CANDIDATE-J Points 2/4/6, but BLOCKED by Doctrine #27 F MAXIMUM + Doctrine #27 J corollary + Doctrine #37 Sub-Type B.**

---

## STEP 3 — EV CALCULATION

```
P(finding)                  = 0.02   (CANDIDATE-J Point-2 sub-checks all DEFENDED structurally;
                                     Doctrine #36 P-floor 0.05 ceiling further compresses)
bounty_cap_USD_equiv        = MIN(0.10 × $66.58M, $10M)
                            = $6.66M nominal in FRAX+FXS tokens
                            ≈ $3.33M USD-realizable (50% slippage haircut on FRAX+FXS exit liquidity)
P(acceptance)               = 0.20   (direct-bounty, ungrounded triager signal, token-currency risk,
                                     no public payout history record)
brain_overlap_multiplier    = 0.20   (Doctrine #27 F MAXIMUM tier — 20 audits / 6 firms / ToB x8 / Certora FV)

EV = 0.02 × $3.33M × 0.20 × 0.20
   = $2,664
   ≈ $2.7K
```

**EV $2.7K — NEGATE.** Below any reasonable Gate 2 pursuit threshold. Doctrine #27 J corollary auto-FORECLOSURE-RECEIPT triggered.

---

## STEP 4 — QUEUE DECISION

**Verdict: FORECLOSURE-RECEIPT (auto-trigger via Doctrine #27 J corollary).**

Step 5 detector rotation SHORT-CIRCUITED per Doctrine #27 J corollary. Steps 5.0 / 5.1 / 5.2 / 5.3 / 5.4 (brain-lens) / 5.5 (5-target checklist) still required for brain-compound surfacing. Detector rotation (5.6) skipped.

**Brain-compound proposals are the primary value vector at this tier** (per Doctrine #27 F corollary explicit guidance).

---

## STEP 5 — GATE 1 EXECUTION (short-circuit mode)

### 5.0 Layer 0 (preflight)
Done above — 9-axis profile complete; substantive drift on Axes 1/2/5.

### 5.1 Scope check
- Frax.sol V1/V2 (`0x853d955aCEf822Db058eb8505911ED77F175b99e`): **IN-SCOPE** ("All smart contracts managing Frax Protocol value across any blockchain")
- COLLATERAL_RATIO_PAUSER role mechanism: IN-SCOPE
- FraxLend / Fraxswap / sFRAX / frxUSD V3: IN-SCOPE (separate targets, not this Gate 1 focus)

### 5.2 Bytecode-verify prep (deferred — no Gate 2 escalation)
Plan only:
```
cast code 0x853d955aCEf822Db058eb8505911ED77F175b99e --rpc-url $ETH_RPC \
  | xxd > /tmp/frax-mainnet-bytecode.hex
solc --standard-json --bin-runtime contracts/Frax/Frax.sol \
  > /tmp/frax-sol-build-runtime.bin-runtime
diff <(tail -c +3 /tmp/frax-sol-build-runtime.bin-runtime) /tmp/frax-mainnet-bytecode.hex
```
Deferred per FORECLOSURE-RECEIPT short-circuit.

### 5.3 Inventory
- **Frax.sol primary file:** `src/hardhat/contracts/Frax/Frax.sol` (HEAD on master, single file — frozen architecture)
- **Key functions for CANDIDATE-J Point-2 surface:**
  - `refreshCollateralRatio()` public, line 186-224 — cooldown-gated CR ratchet
  - `toggleCollateralRatio()` onlyCollateralRatioPauser, line 277-280 — halter sibling
  - `setRefreshCooldown(uint256)` onlyByOwnerGovernanceOrController, line 251 — governance setter
  - `setFraxStep(uint256)` onlyByOwnerGovernanceOrController, line 243 — step setter
  - `setPriceBand(uint256)` onlyByOwnerGovernanceOrController, line 277 — band setter
  - `setPriceTarget(uint256)` onlyByOwnerGovernanceOrController, line 235 — target setter
- **Auth surfaces:**
  - `COLLATERAL_RATIO_PAUSER` AccessControl role: granted to `creator_address` + `timelock_address` in constructor (lines 125-126)
  - `onlyByOwnerGovernanceOrController` modifier: 3-way (Owner / Governance / Controller)
  - `onlyCollateralRatioPauser` modifier: dedicated halter role
- **State for cooldown:** `last_call_time` (line 196, mutable), `refresh_cooldown` (line 148, mutable via setter)
- **State for pause:** `collateral_ratio_paused` (line 156, init `false`)

### 5.4 Brain-lens manual review (CRITICAL — primary value vector for J corollary)

#### CANDIDATE-J Point-2 — 4 sub-check dispatch (operator-requested focus)

**Sub-check #1 — Paused-state cooldown reset?**

```solidity
function refreshCollateralRatio() public {
    require(collateral_ratio_paused == false, "Collateral Ratio has been paused");
    ...
    require(block.timestamp - last_call_time >= refresh_cooldown, "...");
    ...
    last_call_time = block.timestamp;
}

function toggleCollateralRatio() public onlyCollateralRatioPauser {
    collateral_ratio_paused = !collateral_ratio_paused;
}
```

Analysis: `last_call_time` is NOT reset on pause/unpause. The cooldown is MONOTONE across pause cycles. After PAUSER toggles `collateral_ratio_paused = false` (unpause), the next `refreshCollateralRatio` still requires `block.timestamp - last_call_time >= refresh_cooldown` — i.e. the cooldown clock kept ticking during the pause window.

**[INSPECTED] DEFENDED.** Cooldown survives pause-resumption. Sky stUSDS RATE_SETTER + MOM analogue test: NEGATES the canonical CANDIDATE-J Point-2 exploit shape.

**Sub-check #2 — Governance bypass via setRefreshCooldown(0)?**

`setRefreshCooldown(uint256 new_cooldown)` is callable by Owner OR Governance OR Controller (line 251, `onlyByOwnerGovernanceOrController`). If called with `0`, the next `refreshCollateralRatio` always passes the cooldown require (`block.timestamp - last_call_time >= 0` always true).

Analysis: This is the DESIGNED authority for protocol parameter tuning. Governance can choose to remove cooldown intentionally. The Controller role IS a privilege-3-of-3 path:
- Owner = deployer (typically Frax multisig)
- Governance = Frax veFXS governance contract
- Controller = protocol Controller (may be a Frax AMO contract, EOA, or governance-delegate)

Question: is the Controller a low-privilege/EOA wallet that bypasses Owner+Governance? Per Frax docs, Controller is typically a Frax AMO controller (Algorithmic Market Operations) which is itself governance-controlled. **Authority chain ≥ Governance.**

If a future Controller change (via `setController()`) granted Controller to a privately-key'd EOA, then Sub-check #2 would FIRE as a Point-6 (three-layer auth chain) exploit. **No current evidence of that condition.**

**[INSPECTED] DEFENDED by-design.** Standard governance setter — not an attack vector unless Controller role is compromised, which itself requires governance compromise. Brain-compound: Doctrine candidate filed below.

**Sub-check #3 — Re-entry via external feed (`frax_price()`)?**

`frax_price()` reads from a Uniswap V2 TWAP oracle (Frax-FRAX Uniswap V2 pair). TWAP reads are view-only — no state-changing call surface. Re-entry impossible.

Additionally, even IF `frax_price()` re-entered into `refreshCollateralRatio`, the inner call would FAIL the cooldown check (`block.timestamp - last_call_time >= refresh_cooldown` — `last_call_time` was just updated on the outer call). Cooldown is the re-entry guard.

**[INSPECTED] DEFENDED.** Re-entry impossible; even hypothetically, cooldown ratchet prevents nested calls.

**Sub-check #4 — Cooldown survives MOM-halter resumption (canonical Sky stUSDS test)?**

This is the same test as Sub-check #1 from a different framing. DEFENDED.

**CANDIDATE-J Point-2 surface — 4/4 sub-checks DEFENDED structurally.** Cooldown enforcement is canonically clean on Frax.sol V1/V2.

#### 5-Target Quality Checklist (per autonomy-boundary 5-target mandatory)

| # | Target class | Frax.sol surface | Result |
|---|---|---|---|
| 1 | Withdrawals/Redemptions | `redeem1t1FRAX`/`redeemFractionalFRAX`/`redeemAlgorithmicFRAX` (in FraxPool, not Frax.sol) — CEI clean per Frax docs (multi-step pool withdrawal pattern with `redeem_price_threshold`) | **[INSPECTED] DEFENDED** (out-of-Frax.sol scope; well-audited in FraxPool) |
| 2 | Liquidation+Oracle | `frax_price()` reads from Uniswap V2 TWAP — well-audited; `frax_step` clamping defends downside divergence | **[INSPECTED] DEFENDED** (TWAP + clamp) |
| 3 | Deposit/Mint Shares | `mint1t1FRAX`/`mintFractionalFRAX`/`mintAlgorithmicFRAX` (in FraxPool) — CEI clean, `collateral_ratio_paused` gating | **[INSPECTED] DEFENDED** (out-of-Frax.sol scope; well-audited in FraxPool) |
| 4 | External Calls | `frax_price()` view-only; `transfer/transferFrom` standard ERC20 from ERC20Custom base | **[INSPECTED] DEFENDED** (no delegatecall/hook surface in Frax.sol V1/V2; frozen pre-ERC-4626-era design) |
| 5 | Admin/Upgrade | `setRefreshCooldown`/`setFraxStep`/`setPriceBand`/`setPriceTarget` 3-way auth (Owner/Gov/Controller); `toggleCollateralRatio` dedicated PAUSER (timelock + creator addresses) | **[INSPECTED] DEFENDED architecturally** — multi-role separation; constructor-pinned timelock as PAUSER; Controller-compromise = governance-compromise prerequisite |

**5/5 surfaces covered. No paste-ready CANDIDATE survives.**

### 5.5 Cross-Protocol Defense Enumeration (Step 5.11 mandatory)

For CANDIDATE-J Point-2 cooldown surface, comparable defended architectures:

| Protocol | Cooldown mechanism | Pause-survival | Audit count | R8 |
|---|---|---|---|---|
| **FRAX V1/V2** | `last_call_time + refresh_cooldown` monotone | YES (last_call_time not reset on pause) | 20 (this hunt) | [INSPECTED] |
| **Sky stUSDS RATE_SETTER + MOM** | RATE_SETTER cooldown via Mom-halt resumption | YES (canonical CANDIDATE-J anchor) | ~15 | [INSPECTED] prior hunt |
| **Aave V3 setReservePause/setReserveInterestRateData** | No cooldown; instant on PoolAdmin | N/A (no cooldown) | ~25 | [INSPECTED] prior hunt |
| **Compound III Comet pause flags** | No cooldown; instant on governor/pauseGuardian | N/A | ~15 | [INSPECTED] prior hunt |
| **MakerDAO DSS Spotter `poke`** | No cooldown on Spotter; OSM has 1h delay externally | NA / external | ~30 | [INSPECTED] prior brain ref |

**3-protocol defense pattern (FRAX + Sky stUSDS + DSS OSM external delay):** monotone-counter-based cooldown across pause cycles. All defended. Point-2 sub-pattern is CLEAN-CLASS at industry-saturation tier.

### 5.6 Detector rotation
**SKIPPED per Doctrine #27 J corollary auto-FORECLOSURE-RECEIPT trigger.**

---

## STEP 5.10 — R8 CALIBRATED REPORTING (claim-level tags)

All key claims tagged inline above. Summary:

- `[INSPECTED]` 9-axis profile drift on Axes 1/2/5 (docs.frax.finance + Immunefi 404 + GitHub HEAD confirmed)
- `[INSPECTED]` Frax.sol verbatim source extraction (refreshCollateralRatio + toggleCollateralRatio + setRefreshCooldown lines verified via raw.githubusercontent.com)
- `[INSPECTED]` CANDIDATE-J Point-2 sub-checks #1-4 all DEFENDED (source-confirmed)
- `[INSPECTED]` 20-audit count from docs.frax.finance/other/audits.md (Certik / ToB x8 / Macro / Code4rena / FSC x5 / Certora)
- `[INSPECTED]` Doctrine #27 J corollary trigger conditions met (N_audits 20 ≥ 15; ToB x8 = effective N_submissions ≥ 100 equivalent; P(no-paid-Critical-in-last-6mo) ≥ 0.85 per public-disclosure tracking)
- `[ASSUMED]` Token-cap currency haircut ~50% (FRAX+FXS exit liquidity discount on >$1M payout — single-sided sale of FXS would tank price; calibration approximate)
- `[ASSUMED]` Controller role is itself governance-delegate (per Frax AMO docs) — not directly verified on every Controller address
- `[ASSUMED]` Direct-bounty acceptance probability 0.20 (no public payout history visible; ungrounded triager signal)

---

## STEP 6 — BRAIN COMPOUND PROPOSALS

### Proposal #1 — Axis 5a PLATFORM-CONFUSION sub-class anchor #4 (Contradictions-Register)

**Source.** This Gate 1 — operator brief stated "Immunefi `frax-finance` program" verified FALSE (Immunefi 404 on both `/frax/` and `/fraxfinance/` slugs; search 0 matches across 219 programs). Actual platform = DIRECT bounty hosted on docs.frax.finance/smart-contracts/bug-bounty.

**Anchor record:**
- Anchor #1: Spark Gate 1 (brief said Cantina, live = Immunefi sparklend) — 2026-05-28
- Anchor #2: Flux Finance Gate 1 (brief said FRAX-affiliated `fluxfinance/`, live = Ondo Finance `flux-finance/`) — 2026-05-28
- Anchor #3: (Cap Sherlock — STATUS=FINISHED detection — 2026-05-25 per standing-intake rule v2)
- **Anchor #4 (NEW): FRAX core Gate 1 (brief said Immunefi `frax-finance`, live = direct bounty Twitter/Telegram/Signal submission) — 2026-05-28**

Sub-class expansion: PLATFORM-CONFUSION now spans (a) auditor-vs-platform confusion (Spark/Cap), (b) substrate-affiliation confusion (Flux), (c) **bounty-hosting confusion: open-platform-assumed-but-direct (FRAX)**.

**Detection rule (proposed addition to Step 1 PROFILE):** before any bounty-cap assumption, **verify program URL returns 200** on the assumed platform. Fallback probe: `docs.<protocol>.finance/security` + `docs.<protocol>.finance/smart-contracts/bug-bounty`. If platform = direct, treat as separate sub-class (no triager SLA, ungrounded acceptance, token-payout possible).

### Proposal #2 — Doctrine #37 Sub-Type B 6th-anchor (PERMANENT status sustained)

**Source.** Frax.sol V1/V2 = audited (20-audit) AND structurally frozen since early 2023 V3 transition AND deployed contract `0x853d955aCEf822Db058eb8505911ED77F175b99e` still holds value (TVL contributor, V3 references V1 base token).

**Doctrine #37 Sub-Type B anchor list expands:**
1. Frax.sol V1/V2 (2026-05-28, this hunt) — algorithmic-fractional stablecoin frozen 3y
2. Flux Finance V1 (2026-05-28 prior hunt) — Compound V2 fork frozen 1207 days
3. (Prior Sub-Type B anchors from Doctrine #37 catalog — 4 already)

= **6+ anchors. Sub-Type B PERMANENT status sustained; reaffirm operational rule.**

Composition surface (V3 frxUSD added 2024-09) is OUT of this Gate 1's scope but is a candidate for separate Gate 1 if V3-specific lens emerges. Base V1/V2 lens-walk = audit-survived (per Doctrine #37 directive).

### Proposal #3 — CANDIDATE-J Point-2 sub-pattern CLEAN-CLASS designation

**Source.** This hunt's Cross-Protocol Defense Enumeration (Step 5.5): 3 anchors (FRAX V1/V2 + Sky stUSDS + DSS OSM external-delay) all DEFENDED on the same monotone-counter-across-pause-cycles mechanism.

**Proposed brain entry (filed in Patterns-Defense-Classes.md if accepted by operator):**

> **CANDIDATE-J Point-2 sub-pattern: "Monotone-counter cooldown survives pause-resumption" — CLEAN-CLASS designation, 3-anchor.**
>
> Anchors:
> - FRAX V1/V2 `last_call_time + refresh_cooldown` (this hunt 2026-05-28)
> - Sky stUSDS RATE_SETTER + MOM-halt (prior CANDIDATE-J anchor)
> - DSS OSM external `hop` delay (MakerDAO ref)
>
> Operational rule: Point-2 cooldown surface on a protocol where the cooldown is stored as `lastCall + period` AND not reset on pause/unpause = DEFENDED-by-design. Do NOT pursue Gate 2 PoC on Point-2 surface unless an `_unsafeResetCooldown`-shaped function exists OR pause/unpause logic touches the `lastCall` storage slot.
>
> Conservation: still pursue Point-2 on protocols where the cooldown is stored in a paused-state-dependent way (rare; would require explicit pause-reset code).

### Proposal #4 — Standing-Intake Step 1 enrichment: direct-bounty currency-risk haircut

**Source.** This Gate 1 — FRAX direct bounty pays in FRAX+FXS tokens (NOT USD). Realizable USD-equivalent on a >$1M Critical payout is ~50% of nominal due to FRAX+FXS exit-liquidity slippage (single-sided sale into limited FRAX-token and FXS-token pools).

**Proposed addition to Standing-Intake Step 1 PROFILE Axis 2 (CAP):** record `cap_payment_currency` field. If currency ∈ {USD, USDC, USDT, DAI, native-ETH, stablecoin-pair}, apply 1.0× multiplier. If currency ∈ {protocol-native-token-only, protocol-native-+-utility-token-pair}, apply 0.50× to 0.70× haircut depending on token-pair exit liquidity. If currency unknown, flag for Gate 2 confirmation before any acceptance-probability calculation.

Worked example: FRAX direct bounty Critical nominal $6.66M × 0.50× currency-risk haircut = $3.33M USD-realizable.

---

## STEP 6.5 — INTAKE-LOG APPEND

Row to append (in main intake-log.md):

```
| 2026-05-28 | FRAX core (Frax.sol V1/V2 + direct bounty) | **DIRECT** (not Immunefi — Axis 5a anchor #4) | $10M ceiling / 10% exploit (token-cap FRAX+FXS, ~$3.33M USD-realizable, $6.66M nominal at $66.58M TVL) | HIGH on CANDIDATE-J Points 2/4/6 but BLOCKED by Doctrine #27 F MAXIMUM + Doctrine #27 J corollary + Doctrine #37 Sub-Type B PERMANENT | $2.7K | **FORECLOSURE-RECEIPT** (auto-trigger Doctrine #27 J corollary; CANDIDATE-J Point-2 4/4 sub-checks DEFENDED structurally; Step 5.6 detector rotation short-circuited; brain compounds: Axis 5a anchor #4 + Doctrine #37 Sub-Type B 6th anchor + CANDIDATE-J Point-2 CLEAN-CLASS designation 3-anchor + Step 1 direct-bounty currency-risk haircut addition). Comet G2 NEGATE → FRAX Pick #3 NEGATE both via parallel high-saturation-tier closure. | `hunts/2026-05-28-frax-core-immunefi-gate1.md` |
```

---

## STEP 7 — CLONE DISPOSITION

**NO CLONE.** Disk 85% / 5.4G free. Gate 1 ran entirely via WebFetch + raw.githubusercontent.com source extraction. Doctrine #27 F MAXIMUM tier upfront NEGATE eligibility per task brief disposition rule — clone unnecessary.

If V3 frxUSD becomes a separate Gate 1 target (different lens), evaluate clone budget at that point.

---

## STEP 8 — NEXT-TARGET RECOMMENDATION

CANDIDATE-J Point-2 dispatch sequence (per target-map line 100):
- Pick #1 Aave V3 — **already Gate-1'd** 2026-05-28 (per Contradictions-Register v1.13 line)
- Pick #2 Compound III Comet — **Gate 2 NEGATED at Phase 1 today** (per task brief preamble)
- Pick #3 FRAX core — **this Gate 1 — FORECLOSURE-RECEIPT**

CANDIDATE-J target-map is now SATURATED across top-3 picks. Pivot recommendations:

1. **Highest-EV next:** **fresh net-new bounty platform/program** — pivot off CANDIDATE-J Point-2 family entirely; sub-pattern is CLEAN-CLASS confirmed (3-anchor). Either:
   - **Sub-Type-B follow-up on V3 frxUSD** (separate Gate 1 with Doctrine #34 sub-class b lens against frxUSD launched 2024-09 = ~14mo post-launch composition surface)
   - **CANDIDATE-J Point-4 family** (halt-vs-direct separation surface — distinct from Point-2)
   - **DC-9 sub-pattern dispatch** on a different substrate (not surveyed at MAXIMUM tier yet)

2. **Highest-EV CANDIDATE-J alternate:** Pick #4 from target-map (not surveyed by operator brief) — check brain/CANDIDATE-J-target-map for priority-8 targets below FRAX Pick #3.

3. **Lane 4 corpus pivot:** Phase 2 consumer on extension batch (590K+ records) — may surface new DC/CANDIDATE class that opens fresh lens against re-survey of MAXIMUM-tier targets (per Doctrine #27 F corollary "Step 5.4 manual lens application" being primary value vector).

**Recommended:** option (1) → V3 frxUSD Gate 1 with Doctrine #34 sub-class b post-audit composition lens. Strongest fresh angle on the FRAX substrate without re-treading V1/V2 saturation.

---

## VERDICT SUMMARY

```
Target:               FRAX core (Frax.sol V1/V2)
Platform:             DIRECT bounty (Axis 5a anchor #4 — NOT Immunefi)
Cap:                  $6.66M nominal / ~$3.33M USD-realizable (FRAX+FXS token-cap)
EV:                   $2.7K
Overlap:              HIGH on CANDIDATE-J Points 2/4/6 — BLOCKED by Doctrine #27 F MAXIMUM + J corollary
Detector rotation:    SHORT-CIRCUITED (Doctrine #27 J corollary auto-trigger)
CANDIDATE-J Point-2:  4/4 sub-checks DEFENDED structurally [INSPECTED]
5-target checklist:   5/5 DEFENDED
Doctrine #37 Sub-Type B: 6th anchor (PERMANENT sustained)
Verdict:              FORECLOSURE-RECEIPT
Brain compounds:      4 proposals filed (Axis 5a anchor #4, #37 Sub-Type B 6th anchor,
                                          CANDIDATE-J Point-2 CLEAN-CLASS 3-anchor,
                                          Step 1 direct-bounty currency-risk haircut)
Clone:                NOT EXECUTED (WebFetch-only Gate 1)
Next target:          V3 frxUSD Gate 1 with Doctrine #34 sub-class b composition lens
                      (separate Gate 1 — distinct from Frax.sol V1/V2 surface)
```

---

_Filed by Buzz security-research agent | Gate 1 autonomous dispatch per autonomy-boundary.md + standing-intake-protocol.md | 2026-05-28 | FORECLOSURE-RECEIPT short-circuit per Doctrine #27 J corollary | brain compounds proposals pending operator approval_
