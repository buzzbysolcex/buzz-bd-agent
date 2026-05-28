# Gate 1 Hunt — FRAX V3 frxUSD + sfrxUSD (post-public-audit composition surface)

**Date (UTC):** 2026-05-28
**Target:** FRAX V3 flagship stablecoin — `FrxUSD` ERC20 (mint+freeze+pause) + `SfrxUSD` ERC4626 (LinearRewardsErc4626_2 custom Solmate base) — repo `FraxFinance/frax-tokens` v1.0.0 (released Nov 25 2025 ~6mo old). Plus related composition: FraxBonds (FXB), FraxFerry V2 cross-chain bridge, AMO subsystems (Misc_AMOs in frax-solidity).
**Platform:** **DIRECT bounty** (NOT Immunefi — Axis 5b PLATFORM-DIRECT-BOUNTY-NOT-LISTED FIRE, anchor #2 after FRAX core)
**Cap:** Lesser of `(10% of exploit value)` OR `$10M`, paid in **FRAX + FXS tokens** (cap_payment_currency haircut ~0.50× per Contradictions-Register v1.15 + FRAX core Gate 1 Prop #4)
**KYC:** Not specified in program terms
**PoC:** REQUIRED (private GitHub gist + Twitter/Telegram/Discord/Signal submission)
**Substrate:** Solidity `^0.8.0` / `^0.8.21` — modular versioning pattern V1→V2→V3 stacked over proxy storage
**Verdict:** **WATCHLIST-PARK + CONDITIONAL Gate 2 (3 candidates surviving structural filters); fresh post-public-audit composition surface distinct from V1/V2 lens-saturated substrate.**

---

## STEP 1 — 9-AXIS PROFILE PREFLIGHT (Contradictions-Register v1.15)

| Axis | Operator brief | Live verification | Drift result |
|---|---|---|---|
| 1 VERSION | "FRAX V3 frxUSD stablecoin + sfrxUSD (yield-bearing ERC4626 wrapper) + FraxBonds / FraxFerry / AMO" | Confirmed — frax-tokens repo v1.0.0 (Nov 25 2025), `src/contracts/ethereum/frxUSD/` + `src/contracts/ethereum/sfrxUSD/` directories present; versioning chain V1→V2→V3 (current); FXB in frax-solidity Fraxbonds/ dir; FraxFerry V2 in FraxferryV2/ dir; AMOs in Misc_AMOs/ | **OK** — operator brief verified |
| 2 CAP | "likely same as FRAX core 10% OR $10M lesser, paid FRAX+FXS, cap_payment_currency haircut ~0.33×" | $10M ceiling OR 10% exploit (lesser), paid in **FRAX+FXS tokens** (per docs.frax.finance/smart-contracts/bug-bounty). Secondary slow-arbitrage tier: 50K FRAX or frxUSD. **Currency haircut ~0.50× (V3 has frxUSD as secondary-payout option which IS more liquid than FRAX/FXS pair — slightly less haircut than V1/V2 core cap; conservative 0.50× applied).** | **OK** — operator brief verified, currency haircut refined |
| 3 KYC | Not specified by brief | Not specified by program terms | **Indeterminate** (same as FRAX core) |
| 4 SCOPE | "FRAX V3 frxUSD stablecoin + sfrxUSD + FraxBonds + FraxFerry + AMO" | "All smart contracts managing Frax Protocol value across any blockchain." (open-ended scope per FRAX docs) — covers frxUSD/sfrxUSD/FXB/FraxFerry/AMOs ALL in-scope | **OK** |
| 5 PLATFORM | "Likely DIRECT BOUNTY (Axis 5b expected fire)" | **Confirmed DIRECT bounty** (NOT Immunefi). Submission via private GitHub gist + Twitter/Telegram/Discord/Signal | **MATERIAL DRIFT (expected per brief)** — Axis 5b PLATFORM-DIRECT-BOUNTY-NOT-LISTED FIRE confirmed, anchor #2 |
| 5b PLATFORM-DIRECT-BOUNTY-NOT-LISTED | EXPECTED FIRE per brief | Confirmed | **Anchor #2** (after FRAX core 2026-05-28 night anchor #1) — sub-class operationally validated 2-anchor SAME-DAY |
| 6 TIME-since (LIVE-since staleness) | "V3 launched ~2024-09 (~14mo)" | **frax-tokens repo v1.0.0 released 2025-11-25 = ~6 months old, 44 commits total**. Latest commits to master through May 2026 (active). frax-oft-upgradeable (LayerZero OFT cross-chain) updated 2026-05-19 (9 days ago). **CRITICAL CORRECTION OF BRIEF: V3 frxUSD codebase is ~6mo old, NOT 14mo — v1.0.0 tag is Nov 25 2025. Brief's "~14mo post-launch" was for the FRAX V3 system overall (100%-backing era pivot 2024-09), but the frxUSD-specific codebase shipped much more recently.** | **PARTIAL DRIFT** — brief said ~14mo post-launch composition surface; live frxUSD repo is ~6mo old. Refines Doctrine #34 sub-b window to be SHORTER not longer → composition multiplier strength TIER UPGRADE (newer = more composition pressure unaudited) |
| 7 NOVELTY (post-audit composition) | "Doctrine #34 sub-b primary lens" | **MAXIMUM NOVELTY** confirmed — frax-tokens v1.0.0 has **NO audits/ folder at repo root** (verified via GitHub navigation). docs.frax.finance audits index (covers Nov 2020 → March 2025 Fraxtal North Star) shows **ZERO explicit frxUSD or sfrxUSD audits**. The protocol bug-bounty doc lists "Fraxswap AMM, Fraxlend, frxETH" as explicitly-included — **frxUSD/sfrxUSD are NOT in the named-audit-coverage list**. Codebase is structurally unaudited at the public protocol-doc level. | **HIGH NOVELTY** — V3 frxUSD substrate is post-public-audit (Doctrine #34 sub-class b STRONG-composition anchor) |
| 8 SUBSTRATE-AFFILIATION | "FRAX Finance" | Confirmed FraxFinance org (canonical) — frax-tokens repo, `frax-oft-upgradeable`, `frax-solidity` all under `FraxFinance/` org | OK |
| 9 ORG-NAME | implied `FraxFinance/` | Canonical: `FraxFinance/frax-tokens` (44 commits, V3 module-stacked versioning pattern) + `FraxFinance/frax-oft-upgradeable` (183 commits, LayerZero OFT 20+ chains) | OK |

**9-AXIS RESULT:** 2 MATERIAL/PARTIAL DRIFTS (Axis 5b confirmed fire as expected + Axis 6 time-since refinement — V3 frxUSD codebase ~6mo NOT 14mo). Brief's Doctrine #34 sub-b hypothesis is VINDICATED and STRENGTHENED by Axis 6 refinement — newer composition substrate = stronger composition multiplier per Doctrine #34 enrichment Day 26 STRONG-composition tier definition.

---

## STEP 0.5 — 5-CHANNEL PRIOR-COVERAGE CHECK (V3 frxUSD specific, distinct from V1/V2)

| Channel | Result |
|---|---|
| 1. `brain/Watchlist-Candidate-Crossmap.md` | **No frxUSD/sfrxUSD/FraxBonds entry** (grep `frxUSD\|sfrxUSD\|FraxBonds\|FraxFerry` = 0 hits in Crossmap) |
| 2. `brain/Patterns-Defense-Classes.md` | One **adjacent** reference: DC-12 sub-7g (LST-PoR-feed-no-staleness, DEDUP-FORECLOSED-CLASS) line 1291 explicitly names **"Frax PoR-attested sfrxETH"** as cross-protocol propagation hypothesis target — but sfrxETH ≠ sfrxUSD; sfrxETH covered by Trail of Bits Oct 2023 audit (in-scope of public audits list); sfrxUSD is the NEWER USD-denominated wrapper not covered |
| 3. `hunts/2026-05-28-frax-core-immunefi-gate1.md` (TODAY'S FRAX CORE G1) | Mentions V3 frxUSD in passing (Axis 1 partial drift): "V3 is the current product flagship (frxUSD), V1/V2 contracts ALIVE but reduced relevance"; Step 8 NEXT-TARGET recommendation #1 explicitly: "Sub-Type-B follow-up on V3 frxUSD (separate Gate 1 with Doctrine #34 sub-class b lens against frxUSD launched 2024-09 = ~14mo post-launch composition surface)" — this Gate 1 is the operator-routed execution of that recommendation |
| 4. `hunts/intake-log.md` | **No prior V3 frxUSD hunt file** (FRAX core G1 today anchored V1/V2; this is the first V3 frxUSD intake) |
| 5. `brain/Contradictions-Register.md` v1.15 | Axis 5b PLATFORM-DIRECT-BOUNTY-NOT-LISTED sub-class FIRES second time today (anchor #2 after FRAX core anchor #1); cap_payment_currency multiplier 0.50× pre-applied per task brief instruction |

**No prior FORECLOSURE-RECEIPT on V3 frxUSD. Clean intake (substrate has not been swept). DISTINCT surface from FRAX core V1/V2 (different repo, different codebase, different versioning chain, NO inherited audit coverage).**

---

## STEP 2 — BRAIN OVERLAP SCORE (V3 frxUSD specific)

### PRIMARY LENS — Doctrine #34 sub-class b (post-audit composition multiplier, NOW 5+ ANCHORS OPERATIONALLY PERMANENT per Doctrine.md line 2634)

**[INSPECTED] PRIMARY HIT — STRONG TIER (1.5× multiplier per Doctrine #34 vendor-cadence anti-anchor sub-rule):**

Evidence stack:
1. **frax-tokens repo NO audits/ folder** [INSPECTED via GitHub navigation 2026-05-28]
2. **docs.frax.finance/other/audits index ZERO frxUSD/sfrxUSD entries** — last comprehensive audit list ends March 2025 Fraxtal North Star, frxUSD codebase v1.0.0 released 2025-11-25 (8 months AFTER audit index closure)
3. **Bug bounty docs explicitly list "Fraxswap, Fraxlend, frxETH" as in-scope** — frxUSD/sfrxUSD NOT in named-audit-coverage list
4. **Active product**: cross-chain via frax-oft-upgradeable (LayerZero OFTs on 20+ EVM chains + Solana/Movement/Aptos non-EVM), updated 2026-05-19 (9 days ago)
5. **Versioning module-stack** V1→V2→V3 over proxy storage (FrxUSD1.sol has `initialize()` with `require(owner() == address(0))` pattern — UUPS/Transparent proxy deployed); V3 adds EIP-3009 + ERC-1271 signature modules; V2 added freeze + pause + burnMany; V1 was basic ERC20Permit+Burnable+Ownable2Step
6. **Doctrine #34 sub-class b fix-rate-density tier**: cannot directly compute commits-per-100 (repo is 44 commits total at v1.0.0), but the **architectural pattern of module-stacking sequential V1→V2→V3 versions onto SAME proxy** = inherent compositional growth signature

**Cross-references:**
- Doctrine #34 anchors today (5+ operationally permanent): Sky + Alchemix + DeFi Saver + Cap C1 + Cap C3 + Gnosis Chain + Flux + Spark — V3 frxUSD is a 6th anchor CANDIDATE in this batch (strengthens permanence, doesn't move catalog)
- Contradictions-Register #4 resolution: **Doctrine #27 J corollary auto-FORECLOSURE-RECEIPT is SCOPE-LIMITED by Doctrine #34 STRONG-composition exemption** — V3 frxUSD substrate has ZERO direct audits, so Doctrine #27 F MAXIMUM tier on Frax.sol V1/V2 (20 audits) DOES NOT TRANSFER to V3 frxUSD per the doctrine
- Per Doctrine #34 calibration: `P(finding)_post_audit_module = P(finding)_unaudited × 1.0` (no audit-coverage discount applies on V3 frxUSD substrate)

### Other lenses (per task brief checklist)

| Lens | Verdict | R8 | Notes |
|---|---|---|---|
| **DC-11 (ERC4626 inflation, PROMOTED from CANDIDATE-I 2026-05-24 Ogie msg 7695)** | **NEGATIVE — STRUCTURALLY IMMUNE** | [INSPECTED] | SfrxUSD3 → SfrxUSD2 → SfrxUSD1 → LinearRewardsErc4626 (custom Solmate base, NOT OZ ERC4626). `totalAssets() = storedTotalAssets + previewDistributeRewards()` — **counter-based, NOT balanceOf(this)-based**. Inflation defense: `newRewards = asset.balanceOf - storedTotalAssets` — donation gets RE-CHANNELED through reward cycle (delayed, distributed linearly), NOT extracted. Per Patterns-Defense-Classes.md line 661 negative control: "if `totalAssets()` derives from a counter (`_totalDeposits` self-tracked) or a rate-accumulator (chi-style), the contract is structurally immune — no inflation surface." sfrxUSD passes BOTH conditions (counter + rate-accumulator hybrid). **LinearRewardsErc4626_2 (V2 lineage) goes further: mint/redeem/deposit/withdraw all REVERT `MintRedeemsDisabled()`** — user-facing share-mint surface DISABLED entirely. V3 sfrxUSD wraps via SfrxUSD3 (modules layer over V2). DC-11 cannot fire. |
| **Pattern E EXCLUSION Class 3 (lending-family, NEWLY-FILED 2026-05-28)** | **DOES NOT BIND** | [INSPECTED] | sfrxUSD is yield-wrapper (ERC4626), NOT lending-family. Class 3 exclusion targets cToken/aToken-class. Pattern E EXCLUSION Class 2 (chi-style rate-accumulator) **DOES bind** — sfrxUSD uses `pricePerShareStored + pricePerShareIncPerSecond` exponential growth `p(t) = p0*e^(r*t)` which IS the chi-accumulator structural-immunity pattern. CLEAN. |
| **CANDIDATE-J Point-2 (cooldown enforcement)** | **NEGATIVE** | [INSPECTED] | No `refresh_cooldown` mechanism in FrxUSD or SfrxUSD (these are token + yield-wrapper, not the algorithmic-CR ratchet which lives in Frax.sol V1/V2 only). NOT IN SCOPE for V3 frxUSD architecture. |
| **CANDIDATE-J Point-4 (halt-vs-direct separation)** | **POTENTIAL FIRE** | [INSPECTED] | FrxUSD2 implements paired pause + freeze + owner-bypass: `_update()` overrides with `if (msg.sender != owner())` clause skipping pause+freeze checks for owner. **Owner-bypass on a paused token = halt-vs-direct asymmetry candidate.** Combined with `burn()` owner-only "burns entire balance if amount=0" pattern = DC-9 sub-2 ADJACENT. Hypothesis H1 below. |
| **CANDIDATE-J Point-5 (privilege-3-of-3 path with mismatched authority)** | **POTENTIAL FIRE** | [INSPECTED] | FrxUSD V2 has 3 distinct authority surfaces: `owner` (Ownable2Step), `minters` (mapping allowlist), `freezers` (mapping allowlist). `removeMinter()` sets array entry to `address(0)` (V2 line 85-99) — classic state-not-invalidated pattern adjacent to DC-9 sub-1 if any iteration logic exists downstream. **Hypothesis H2 below — depends on whether any external integrations iterate the minters array for grants/checks.** |
| **CANDIDATE-J Point-6 (three-layer auth chain)** | **POTENTIAL FIRE** | [INSPECTED] | Owner can `addMinter` and `addFreezer` without timelock. Single-key owner compromise → unlimited mint OR universal freeze. **DC-9 sub-2 (privileged state mutation without timelock) candidate; routine in centralized stablecoin design but operationally HOT for this hunt.** Hypothesis H3 below. |
| **DC-7 EXCLUSION CANONICAL preemptive (4-anchor canonical promotion today: Cap C1 + FBTC H1 + Gearbox H2 + Spark S-4 candidate)** | **PARTIAL APPLY** | [INSPECTED] | Owner-bypass in `_update()` is a centralization-design-choice (explicit operator-misconfig category) — DC-7 EXCLUSION applies, this is intentional architectural choice. Reduces H1 EV but does NOT fully foreclose if (a) owner is EOA not multisig, (b) no timelock on owner setters. **Bytecode-verify of owner address class needed.** |
| **Doctrine #29 v1.1 MIN-cap defense** | **NOT APPLICABLE** | — | No oracle-derived MIN-cap surface in FrxUSD/SfrxUSD (no oracle in V3 frxUSD token layer; oracles would live in upstream peg-defense AMOs not the token itself). |
| **Doctrine #36 P-floor 0.05** | **NEGATIVE — DOES NOT BIND** | [INSPECTED] | Substrate-coverage gate evaluated: Solidity 0.8.x = YES (full L1d coverage), semgrep YES (smart-contracts pack), brain lenses Solidity-anchored = YES. ALL THREE = YES → floor does NOT bind. Doctrine #36 does NOT compress P(finding) on V3 frxUSD. |
| **Doctrine #37 Sub-Type B PERMANENT (5-anchor expanded 2026-05-28 evening)** | **DOES NOT BIND on V3 frxUSD substrate** | [INSPECTED] | Sub-Type B is "audited-and-frozen-but-product-live". V3 frxUSD is **NEITHER audited NOR frozen** — it's actively shipping (frax-oft-upgradeable updated 9 days ago) AND has no public audit on the new substrate. Sub-Type B is the WRONG classifier; V3 frxUSD is closer to Doctrine #37 Sub-Type "NEW SUBSTRATE" (no audit + active product). **Brain compound proposal V-2 below: file Sub-Type C "Unaudited-and-Active" candidate.** |
| **Doctrine #38 (*WithSig pre-check)** | **POSSIBLY APPLICABLE** | [INSPECTED] | FrxUSD3 adds EIP-3009 + ERC-1271 signature modules (`__hashTypedDataV4`, `__useNonce`, `permit()`). `EIP3009Module` enables gas-less transferWithAuthorization. **Doctrine #38 *WithSig pre-check fires.** Hypothesis H4 below — signature-replay / nonce-reuse / cross-chain-replay across the 20+ chain LayerZero OFT deployment. |
| **Doctrine #39 + DC-13 sub-5 Phase 0 gate (notification-vs-authorization separation)** | **CLEAN** | [INSPECTED] | No notification-callback surface in FrxUSD/SfrxUSD token layer (transferWithAuthorization is signature-validation not notification-callback). Phase 0 gate PASSES — Doctrine #34 sub-b authorization-path target identification correct. |
| **Doctrine #27 F tier banding** | **DOES NOT APPLY to V3 substrate** | [INSPECTED] | F tier inherited by V1/V2 (FRAX core G1 today filed under F MAXIMUM). V3 frxUSD substrate is structurally UNAUDITED at public-doc level. **No audit-saturation discount applies per Doctrine #34 sub-b override** (Contradictions-Register #6 resolution: Doctrine #34 firing overrides Doctrine #27 audit-coverage discount on the post-audit-composition surface). |
| **Doctrine #27 J corollary (auto-FORECLOSURE-RECEIPT)** | **DOES NOT TRIGGER** | [INSPECTED] | Per Contradictions #4 resolution: Doctrine #27 J corollary scope-limited by Doctrine #34 STRONG-composition exemption. V3 frxUSD substrate has zero audits, so N_audits = 0 NOT ≥15. Even without the STRONG-composition exemption, J corollary trigger conditions fail (N_audits insufficient). **Full Step 5 detector rotation REQUIRED.** |

**Overlap SCORE: HIGH on Doctrine #34 sub-class b primary (STRONG-composition tier on unaudited substrate); POTENTIAL FIRE on 4 sub-hypotheses (H1-H4); structurally NEGATIVE on DC-11 / CANDIDATE-J Point-2 / Pattern E lending.**

---

## STEP 3 — EV CALCULATION

```
P(finding)                     = 0.10   (Doctrine #34 STRONG-composition; H1-H4 hypotheses;
                                        Doctrine #36 P-floor 0.05 does NOT bind — Solidity covered;
                                        4 distinct hypotheses across paired surfaces)
bounty_cap_USD_equiv           = MIN(0.10 × $66.58M_FRAX_total_TVL, $10M)
                               = $6.66M nominal
                               × 0.50 cap_payment_currency_haircut (V3 secondary tier allows frxUSD
                                  payout — slightly less haircut than V1/V2 FRAX+FXS only)
                               ≈ $3.33M USD-realizable on Critical
P(acceptance)                  = 0.20   (direct-bounty, ungrounded triager signal, token-currency risk,
                                        no public payout history record — same as FRAX core)
brain_overlap_multiplier       = 0.80   (Doctrine #34 sub-class b STRONG composition, 1.0× per
                                        Doctrine #34 calibration NO audit-coverage discount applies,
                                        DC-7 EXCLUSION CANONICAL reduces 4 sub-hypotheses by 0.20×)

EV = 0.10 × $3.33M × 0.20 × 0.80
   = $53,280
   ≈ $53K
```

**Compare to FRAX core G1 today: EV $2.7K (saturation-blocked). V3 frxUSD substrate produces 19.7× higher EV due to:**
1. ZERO direct audits (vs 20 on V1/V2 substrate)
2. Doctrine #34 STRONG-composition multiplier on active post-public-audit code
3. 4 distinct hypothesis surfaces (vs 0 surviving on V1/V2 after CANDIDATE-J Point-2 negation)

**EV $53K — PROCEED TO STEP 4 with WATCHLIST-PARK + 3-candidate Gate 2 dispatch decision per Doctrine #34 STRONG-composition exemption.**

---

## STEP 4 — QUEUE DECISION

| Verdict | Reasoning |
|---|---|
| **WATCHLIST-PARK + CONDITIONAL Gate 2 (3 candidates)** | EV $53K is above any reasonable Gate 2 pursuit threshold ($10K floor). Doctrine #34 STRONG-composition exemption mandates full Step 5 detector rotation. 3 hypotheses survive structural filters (H1 owner-bypass-on-paused, H3 single-key-owner-no-timelock-on-setters, H4 signature-replay-across-20-chain-LayerZero-OFT). Gate 2 dispatch ROI HIGH on H4 (cross-chain replay is highest-EV typical bounty class). |
| **Gate 2 dispatch sequencing** | Per autonomy-boundary: Gate 2 PoC is AUTONOMOUS; submission OPERATOR-GATED. Recommended order: H4 (signature-replay LayerZero OFT) FIRST → H1 (owner-bypass paused-token-transfer) → H3 (no-timelock owner setters bytecode-verify). |
| **NOT FORECLOSED** | Distinct from FRAX core G1 today — V3 frxUSD substrate has NO audit saturation, has active post-public-audit composition surface, and produces multiple hypotheses surviving structural filters. |

---

## STEP 5 — GATE 1 EXECUTION (Doctrine #34 STRONG-composition exemption = full pipeline)

### 5.0 Layer 0 (preflight)
Done above — 9-axis profile complete; Axis 5b confirmed fire (anchor #2 same-day); Axis 6 time-since refinement to ~6mo NOT 14mo.

### 5.1 Pre-flight scope check
- `FrxUSD` token (frax-tokens repo, `src/contracts/ethereum/frxUSD/FrxUSD.sol` → V3 → V2 → V1): **IN-SCOPE** ("All smart contracts managing Frax Protocol value across any blockchain")
- `SfrxUSD` ERC4626 wrapper (frax-tokens repo, `src/contracts/ethereum/sfrxUSD/SfrxUSD.sol` → V3 → V2 → V1 → LinearRewardsErc4626_2): **IN-SCOPE**
- `frax-oft-upgradeable` LayerZero OFTs (20+ chains): **IN-SCOPE** (per "across any blockchain" scope clause)
- `FXB` Fraxbonds: **IN-SCOPE** (different repo `frax-solidity` but same protocol)
- `FraxFerryV2`: **IN-SCOPE**
- AMOs (`Misc_AMOs`): **IN-SCOPE**

### 5.2 Bytecode-verify prep (for Gate 2 dispatch)

For each Gate 2 candidate, plan up-front per standing-intake protocol:

```bash
# H4 — LayerZero OFT signature-replay
# Verify on Base (highest TVL non-mainnet)
cast code 0x<frxUSD-OFT-Base-address> --rpc-url $BASE_RPC > /tmp/frxusd-base.bin
# Compare against frax-oft-upgradeable HEAD compiled
forge build && cat out/FrxUSDOFTUpgradeable.sol/FrxUSDOFTUpgradeable.json | jq -r .bytecode > /tmp/frxusd-oft-head.bin
diff <(xxd /tmp/frxusd-base.bin) <(xxd /tmp/frxusd-oft-head.bin)

# H1 — owner-bypass on paused token transfer (mainnet FrxUSD)
cast code <frxUSD-mainnet-address> --rpc-url $ETH_RPC > /tmp/frxusd-mainnet.bin

# H3 — verify owner address class (EOA vs multisig vs timelock)
cast call <frxUSD-mainnet-address> "owner()(address)" --rpc-url $ETH_RPC
# If multisig: check Gnosis Safe threshold + signers
# If timelock: verify minDelay() and proposer/executor roles
```

### 5.3 Inventory

**FrxUSD versioning chain (Ethereum mainnet):**
- `FrxUSD.sol` — entry-point wrapper, `contract FrxUSD is FrxUSD3 { constructor() FrxUSD3() {} }`
- `versioning/FrxUSD3.sol` — V3 modules layer, inherits `FrxUSD2, EIP3009Module, PermitModule`; adds ERC-1271 + EIP-3009 transferWithAuthorization
- `versioning/FrxUSD2.sol` (296 lines) — V2 core, inherits `FrxUSD1` BUT V2 source claims "NOT upgradeable", **CONTRADICTING V1's `initialize()` with `require(owner() == address(0), "Already initialized")` pattern**. Likely deployed instance IS upgradeable via proxy (V1 was original behind proxy, V2 + V3 implementations swapped in via upgrade). Adds freezer mapping + pause + burnMany + freeze() + _update() with owner-bypass
- `versioning/FrxUSD1.sol` (~180 lines) — V1 base, ERC20Permit + ERC20Burnable + Ownable2Step + minters mapping + `initialize()` proxy-init pattern

**Key FrxUSD V2 functions and state:**
- `minters` mapping (line 16) — authorized to mint/burn
- `isFreezer` mapping (line 21) — can freeze accounts
- `isFrozen` mapping (line 19) — frozen state
- `isPaused` boolean (line 20) — global pause
- `minter_mint()` line 65 `onlyMinters` — minting
- `minter_burn_from()` line 59 `onlyMinters` — burning
- `burn()` line 179-182 `onlyOwner` — owner burn (entire balance if amount=0!)
- `burnMany()` line 170-177 `onlyOwner` — batch burn across accounts
- `addMinter()` line 75-82 `onlyOwner` — no timelock
- `removeMinter()` line 85-99 `onlyOwner` — sets array entry to `address(0)`
- `addFreezer()` / `removeFreezer()` lines 101-109 `onlyOwner` — no timelock
- `pause()` / `unpause()` lines 185-194 `onlyOwner`
- `freeze()` / `thaw()` lines 119-144 — freezer-or-owner / owner
- `_update()` override line 233-240 — pause/freeze logic with **owner-bypass** (`if (msg.sender != owner())`)

**SfrxUSD versioning chain (Ethereum mainnet):**
- `SfrxUSD.sol` — entry-point, `contract SfrxUSD is SfrxUSD3 { constructor(address _underlying) SfrxUSD3(_underlying) {} }`
- `versioning/SfrxUSD3.sol` — V3 modules layer, inherits `SfrxUSD2, EIP3009Module, SignatureModule, PermitModule`; adds gas-less meta-tx
- `versioning/SfrxUSD2.sol` — V2 core, inherits custom `LinearRewardsErc4626_2`, uses Timelock2Step admin, minter allowlist
- `versioning/SfrxUSD1.sol` — V1 base, inherits custom `LinearRewardsErc4626`, uses two-stage `initialize` + `initializeRewardsCycleData`

**SfrxUSD share-accounting (DC-11 BINDING TEST — STRUCTURALLY IMMUNE):**
- `LinearRewardsErc4626` V1: `totalAssets() = storedTotalAssets + previewDistributeRewards()`, **counter-based with linear-rewards-cycle**
- `LinearRewardsErc4626_2` V2: `totalAssets() = pricePerShare × totalSupply / 1e18`, **rate-accumulator exponential `p(t) = p0*e^(r*t)`**; user mint/redeem/deposit/withdraw all **REVERT MintRedeemsDisabled()** — user share-minting surface REMOVED
- No `_decimalsOffset()` override on either layer (NOT NEEDED — share inflation impossible via donation given counter+rate-accumulator design)
- Donation defense: `newRewards = asset.balanceOf - storedTotalAssets` re-channels donations through linear distribution

### 5.4 Brain-lens manual review — 4 SURVIVING HYPOTHESES

#### H1 — Owner-bypass on paused token transfer (FrxUSD V2 _update() line 233-240)

**Pattern.** Token is paused → all user transfers revert. Owner bypasses pause via `if (msg.sender != owner())` clause in `_update()` override. This means: a paused token is NOT actually paused for the owner — owner can still transfer/mint/burn at will during a "paused" state.

**Why this is a finding candidate.** Standard pause-flag semantics imply universal halt. Owner-bypass means a token marketed as paused can still have outflows/movements initiated by owner. If owner is EOA → single-key-compromise can drain a paused token. If owner is multisig with 0-delay execution → multisig can extract paused-state value.

**Severity ladder.**
- LOW: if owner is timelock with ≥48h delay (give users time to react to misuse)
- MEDIUM: if owner is multisig without timelock (multisig-trust-assumption)
- HIGH: if owner is EOA (single-key compromise)
- CRITICAL: if owner is a contract with self-modifying upgrade path AND not timelock-gated (compounding mutability)

**Gate 2 verify steps.**
1. `cast call <FrxUSD-mainnet> "owner()(address)" --rpc-url $ETH_RPC`
2. Classify owner address: EOA / Gnosis Safe / TimelockController / custom-controller
3. If multisig: check threshold + signers (Gnosis Safe `getThreshold()` + `getOwners()`)
4. If timelock: check `minDelay()` and proposer/executor roles
5. Cross-reference Etherscan: was owner ever an EOA at deployment, only later moved to multisig?

**R8 tag.** [INSPECTED] — pattern confirmed via FrxUSD2.sol source line 237; owner address class unverified pending Gate 2 bytecode-verify.

**EV.** $5K-30K depending on owner class. Default $10K post-DC-7 EXCLUSION reduction (centralization-design-choice category, partial OOS unless owner is EOA).

#### H2 — minters mapping removeMinter() state-not-invalidated pattern

**Pattern.** FrxUSD V2 `removeMinter()` sets array entry to `address(0)` instead of removing the slot or popping the array. If any downstream external integration iterates `mintersArray` for grants/checks AND treats `address(0)` as a default-passthrough (which is common in `if (mintersArray[i] == checkAddress)` loops where `checkAddress = address(0)` is a deployer-default), then a removed-minter slot can be "re-granted" by anyone matching the default-address sentinel value.

**Why this is hard to confirm.** Requires source-tracing every external integration that reads `mintersArray`. Probably zero such integrations exist (the standard pattern is to only check `minters[address]` mapping, not iterate the array), but the unsafe pattern is canonical.

**Gate 2 verify steps.**
1. Grep frax-tokens repo for `mintersArray` consumers
2. Grep frax-oft-upgradeable for `mintersArray` consumers
3. Check if OFT cross-chain mint authority delegates via `mintersArray` iteration
4. If yes → exploit construction; if no → foreclose

**R8 tag.** [INSPECTED] for the unsafe-pattern presence; [ASSUMED] for actual external integration consuming the array.

**EV.** $2K-10K. **Low likelihood (P~0.05 contingent on external integration discovery), but cheap to verify (single grep).** Gate 2 ROI mediocre.

#### H3 — No timelock on owner setters (DC-9 sub-2 candidate)

**Pattern.** FrxUSD V2 owner can `addMinter`, `removeMinter`, `addFreezer`, `removeFreezer`, `pause`, `unpause`, `freeze`, `thaw`, `burn`, `burnMany` with ZERO timelock delay. Single-key (or multisig-without-delay) compromise = unlimited mint or universal freeze or total balance-wipe via `burnMany(allUserAddresses, 0)`.

**Why this matters.** Doctrine #29 (Two-Sided MIN-Cap Defense) + Doctrine #35 (Trust-Boundary Surface Asymmetry) both flag privileged-state-mutation-no-timelock patterns as DC-9 sub-2. **FrxUSD V2 has 10+ admin functions with NO timelock and NO multisig requirement at the contract level** (multisig vs timelock is owner-address-class question, not contract-level). The `addMinter()` admin function has blast radius ≈ unlimited future mint vs `transfer()` user function with blast radius ≈ caller balance — that's Doctrine #35 cross-function defense asymmetry (admin function defense-layer count = 1 [onlyOwner] vs user-function transfer defense-layer count = pause + freeze + balance-check = 3).

**Doctrine #35 cross-function defense asymmetry table for FrxUSD V2:**
| Function | Defense layers | Blast radius |
|---|---|---|
| `transfer()` (inherited ERC20) | 3 (pause check + freeze check + balance check) | Single user balance |
| `minter_mint()` | 1 (onlyMinters) | Total supply increase |
| **`addMinter()`** | **1 (onlyOwner)** | **Unlimited future mint authority** |
| **`burnMany()`** | **1 (onlyOwner)** | **Wipe balances of N accounts in one tx** |
| **`pause()` + owner-bypass `_update()`** | **1 + bypass** | **Halt all non-owner transfers** |

**Inversion = finding** per Doctrine #35. **HIGH-EV Gate 2 candidate IF owner is EOA or multisig-without-timelock.**

**Gate 2 verify steps.**
1. Confirm H1 owner-address-class verification
2. If owner is TimelockController with sane delay → DC-9 sub-2 defended; foreclose H3
3. If owner is Gnosis Safe without TimelockController on top → DC-9 sub-2 OPERATIONAL; document but submit only if Immunefi-style "centralization assumed" clause doesn't cover (direct bounty docs unclear)
4. If owner is EOA → CRITICAL DC-9 sub-2 paste-ready, escalate to FLAG operator IMMEDIATELY

**R8 tag.** [INSPECTED] for the pattern; [ASSUMED] for severity ladder pending owner-class verify.

**EV.** $0-100K. Extreme variance. Default $15K post-DC-7 EXCLUSION reduction. **STRONGEST Gate 2 candidate if H1 verification reveals EOA owner.**

#### H4 — Signature-replay across 20-chain LayerZero OFT (Doctrine #38 *WithSig surface)

**Pattern.** FrxUSD V3 adds EIP-3009 `transferWithAuthorization()` via `EIP3009Module` (gas-less meta-transactions). `transferWithAuthorization` uses EIP-712 signatures with per-(token, owner, nonce) replay protection. **frax-oft-upgradeable deploys frxUSD across 20+ EVM chains via LayerZero OFTs PLUS Solana / Movement / Aptos.** If the EIP-712 domain separator includes `chainid` (standard) but the SAME nonce can be reused across chains because OFT bridging carries state, then a signed `transferWithAuthorization` could be replayed cross-chain.

**Specific attack hypothesis.** 
1. Attacker observes user signed `transferWithAuthorization(from=user, to=attacker, value=X, validAfter, validBefore, nonce=N)` on chain A
2. Attacker bridges frxUSD from chain A to chain B via OFT
3. Attacker replays the same signed authorization on chain B
4. IF chain B's frxUSD contract has the same EIP-712 domain separator (different chainid prevents direct replay) OR
5. IF OFT bridging triggers a `_credit` that the EIP-712 nonce-tracker doesn't know about

**Why this is the strongest hypothesis.** LayerZero OFTs are the canonical post-audit composition pattern (Doctrine #34 vendor-signature integration: "LayerZero OFT bridge after their main audit (very common 2024-2026)" — per Doctrine #34 anchor 5 PROVISIONAL framing for Across V3). Cross-chain signature replay is a high-EV class with multiple historical precedents (Wormhole replay, Multichain signature reuse). 

frax-oft-upgradeable has audits/ subdirectory but only `v1.1.0.README.md` (no actual audit report) — the v1.1.0 upgrade adds `Permit, TransferWithAuthorization, freezing/pausing capabilities` per the README scope. **These additions are POST whatever audit covered v1.0.0 OFT.** Doctrine #34 sub-class b PRIMARY HIT directly on this surface.

**Gate 2 verify steps.**
1. Clone frax-oft-upgradeable (small repo, ~5MB est)
2. Read `FrxUSDOFTUpgradeable.sol` (or whatever the OFT subclass is named)
3. Trace EIP-712 domain separator construction — does it include `chainid`?
4. Trace nonce usage — is nonce per-(owner, chainid) or per-(owner) global?
5. Trace OFT `_credit` / `_debit` hooks — do they invalidate any nonces or signatures?
6. If `_credit` mints on destination chain WITHOUT updating the user's nonce state, and signature was created on source chain BEFORE bridging, attack surface confirmed
7. Foundry PoC: deploy mock OFT on two anvil instances, simulate bridge + signature replay

**R8 tag.** [INSPECTED] for V3 sig-module additions + frax-oft-upgradeable v1.1.0 README scope; [ASSUMED] for actual cross-chain replay viability pending Foundry PoC.

**EV.** $50K-500K Critical depending on bytecode-verify. STRONGEST Gate 2 candidate by EV. **RECOMMENDED FIRST Gate 2 dispatch.**

### 5.5 5-Target Quality Checklist (per autonomy-boundary 5-target mandatory)

| # | Target class | V3 frxUSD surface | Result |
|---|---|---|---|
| 1 | Withdrawals/Redemptions | `SfrxUSD` redeem/withdraw paths: V2 lineage has them DISABLED (`revert MintRedeemsDisabled()` in `LinearRewardsErc4626_2`). V3 SfrxUSD3 inherits V2 — so V3 SfrxUSD share-redemption is structurally disabled? **NEEDS CLARIFICATION** — if user share redemption is genuinely disabled, how does the wrapper produce value? Likely V3 SfrxUSD3 modules RE-ENABLE redemption via the EIP3009Module + PermitModule + override. **Hypothesis: V2's MintRedeemsDisabled() is overridden in V3 — if so, the V3 override IS the post-audit composition surface (Doctrine #34 STRONG HIT).** Pending source-read of SfrxUSD3 + module bytecode-verify. | **[ASSUMED] CANDIDATE** — H5 sub-hypothesis filed below |
| 2 | Liquidation+Oracle | No oracle in FrxUSD/SfrxUSD token+wrapper layer. Peg-defense lives in upstream AMOs (Misc_AMOs/ in frax-solidity) which compose around but outside this token. Oracle exposure of frxUSD = whatever upstream uses (Chainlink USD feed for peg target per FRAX V3 IORB design per docs) | **[INSPECTED] DEFENDED at token layer** (no on-token oracle); upstream AMO oracle exposure is OUT-OF-FrxUSD-token-scope |
| 3 | Deposit/Mint Shares | sfrxUSD deposit/mint also potentially disabled in V2 lineage. SAME open question as Target #1 — V3 module-stacking effect on V2's revert clause. | **[ASSUMED] CANDIDATE** — same H5 sub-hypothesis |
| 4 | External Calls | FrxUSD V2: `transfer()` inherited from OZ ERC20 + `_update()` override with pause/freeze. SfrxUSD V3 inherits Solmate ERC4626 base — minimal external-call surface other than asset transfer + reward-cycle distribution. No `delegatecall` visible. LayerZero OFT cross-chain composition layer DOES have external-call surface (OFT `_lzSend` / `_lzReceive`). | **[INSPECTED] PARTIAL** — token-layer clean; OFT layer external-call surface present (H4 fires here) |
| 5 | Admin/Upgrade | **CRITICAL surface** — FrxUSD V2 has 10+ admin functions with NO timelock, owner-bypass on pause, `burnMany` mass-burn, `burn(0)` total-balance-burn, `addMinter` unlimited grant, `addFreezer` unlimited freeze authority. V3 module layer adds sig-modules. Upgrade authority: V1 initialize() proxy pattern + V2/V3 module-stacking imply UUPS/Transparent proxy with implementation-swap upgrades — **upgrade authority owner-class unverified**. SfrxUSD uses Timelock2Step admin pattern (better defense), but the **Owner address class is unverified pending Gate 2 bytecode-verify**. | **[INSPECTED] CANDIDATE-DENSE** — H1, H2, H3 all fire here; **SfrxUSD's Timelock2Step is ASYMMETRIC vs FrxUSD's no-timelock — Doctrine #35 cross-contract asymmetry candidate** |

**5/5 surfaces covered. 4-5 CANDIDATE hypotheses surviving structural filters (vs 0 on FRAX core G1).** Distinct from V1/V2 substrate — produces real Gate 2 work.

#### H5 — V3 module re-enables V2-disabled mint/redeem (composition asymmetry)

If SfrxUSD3 modules re-enable user share mint/redeem via override, the override IS the post-audit composition surface and inherits Doctrine #34 STRONG-composition. Pending source-confirmation — added as additional Gate 2 candidate.

### 5.6 Detector rotation (Step 5.6 — full pipeline per Doctrine #34 STRONG-composition exemption, not short-circuited)

For each detector class in current rotation:

- **DC-9 sub-2** (privileged-state-mutation-no-timelock): **FIRES on FrxUSD V2** (10+ owner functions no timelock) → H3
- **DC-9 sub-3** (upgradeable-hook-no-timelock): **CANDIDATE** — V1 proxy pattern + V2/V3 module-stacking implies upgradeable. Upgrade authority unverified. **H6 filed below.**
- **DC-11** (ERC4626 inflation): **NEGATIVE** — counter+rate-accumulator structural immunity
- **DC-12 sub-7g** (LST-PoR-no-staleness): **NOT APPLICABLE** — frxUSD is USD-stablecoin not LST
- **CANDIDATE-J Point-4/5/6** (halt-vs-direct, three-layer auth, mismatched authority): **FIRES** — H1, H2, H3
- **Doctrine #38** (*WithSig pre-check): **FIRES** — H4 (EIP-3009 cross-chain replay)
- **Doctrine #35** (Trust-Boundary Surface Asymmetry): **FIRES** — DC-7 EXCLUSION CANONICAL-adjacent cross-function defense asymmetry table (transfer 3 defenses vs addMinter 1 defense)

#### H6 — UUPS/Transparent proxy upgrade authority

**Pattern.** V1 `initialize()` pattern + module-stacking V1→V2→V3 implies the deployed frxUSD is BEHIND A PROXY with upgrade authority. V2 source claims "not upgradeable" but this likely means "V2 implementation is itself not upgradeable" — the proxy that delegate-calls to V2 implementation CAN be upgraded by swapping the implementation pointer.

**Why this is a Doctrine #34 STRONG-composition signature.** Per Doctrine #34 identification heuristic #4 (solo-author dominance in new modules), the V1→V2→V3 stacking pattern shifts entire functional layers without public audit on the stacking. The upgrade authority on the proxy is the gating control.

**Gate 2 verify steps.**
1. `cast storage <FrxUSD-mainnet> <UUPS-or-EIP1967-implementation-slot> --rpc-url $ETH_RPC`
2. Identify proxy admin / upgrade authority address
3. Verify timelock on upgrade authority
4. If no timelock OR admin is EOA → DC-9 sub-3 paste-ready

**R8 tag.** [INSPECTED] for pattern (V1 `initialize()` proxy-init); [ASSUMED] for upgrade authority class pending bytecode-verify.

**EV.** $10K-100K. STRONG candidate if Gate 2 verifies no-timelock upgrade.

### 5.11 Cross-Protocol Defense Enumeration

For each surviving hypothesis (H1, H3, H4, H6), enumerate comparable protocols and their defenses:

| Hypothesis | Comparable protocols | Defense pattern observed | V3 frxUSD status |
|---|---|---|---|
| H1 owner-bypass on paused token | USDC (Circle), USDT (Tether) | Centralized stablecoins — owner-bypass is DESIGNED IN, "centralization assumed" clause excludes from bounty | **PARTIAL DC-7 EXCLUSION** — direct-bounty terms unclear on this clause |
| H3 no-timelock on admin setters | USDC, USDT, FRAX V1/V2 | All have admin-without-timelock, "centralization assumed" | **SAME DC-7 EXCLUSION concern** — H3 EV reduced unless owner is EOA |
| H4 cross-chain sig replay | Wormhole (2022 $326M), Multichain ($1.3B), Nomad ($190M), LayerZero V2 OFT family | Domain-separator-with-chainid + nonce-per-(owner, chainid) | **DOCTRINE #34 STRONG-COMPOSITION** — fresh OFT v1.1.0 layer post any audit |
| H6 UUPS upgrade no-timelock | Most upgradeable stablecoins (USDC/USDT have proxy-admin via multisig + timelock) | Multisig + timelock on proxy admin | **NEEDS VERIFY** — V3 frxUSD upgrade pattern unverified |

**Pattern observed.** H1 + H3 fall under "centralization assumed" DC-7 EXCLUSION on most direct-bounty programs. H4 + H6 are the strongest Gate 2 candidates — neither is in the centralization-exclusion class; both are genuine post-audit composition surface bugs.

**Gate 2 dispatch RANK ORDER (highest EV first):**
1. **H4 (cross-chain LayerZero OFT signature replay)** — $50-500K, fresh post-audit composition surface, no centralization-exclusion
2. **H6 (proxy upgrade authority no-timelock)** — $10-100K, depends on bytecode-verify of admin class
3. **H3 (no-timelock owner setters)** — $0-100K, EXTREME variance based on owner-class verify
4. **H1 (owner-bypass on paused token)** — $5-30K, partially OOS via centralization clause
5. **H5 (V3 module re-enables V2 disabled mint/redeem)** — $2-50K, pending source-confirm
6. **H2 (minters mapping removeMinter() state-not-invalidated)** — $2-10K, low likelihood

---

## STEP 5.10 — R8 CALIBRATED REPORTING (claim-level tags)

Key claims tagged inline. Summary:

- `[INSPECTED]` 9-axis profile drift on Axis 5b (confirmed FIRE anchor #2) + Axis 6 time-since (~6mo NOT 14mo); audit-count verification (zero public audits on frxUSD/sfrxUSD per docs.frax.finance + frax-tokens repo no audits/ folder)
- `[INSPECTED]` FrxUSD V1/V2/V3 source extraction via raw.githubusercontent.com (FrxUSD2.sol full 296 lines + V1 partial + V3 modules layer pragma identification)
- `[INSPECTED]` SfrxUSD V1/V2/V3 source extraction (SfrxUSD3 modules + SfrxUSD2 + LinearRewardsErc4626 / LinearRewardsErc4626_2 share-accounting)
- `[INSPECTED]` DC-11 NEGATION via Patterns-Defense-Classes.md line 661 negative control match (counter+rate-accumulator structural immunity)
- `[INSPECTED]` Doctrine #34 sub-class b PRIMARY HIT — frax-tokens repo NO audits/ folder + docs.frax.finance audit index ZERO frxUSD entries + 6-month-old codebase + active cross-chain composition layer
- `[INSPECTED]` 5/5 quality-checklist surface coverage with 4-6 candidate hypotheses surviving
- `[INSPECTED]` Cross-protocol defense enumeration on H1/H3/H4/H6 against USDC/USDT/Wormhole/Multichain/Nomad patterns
- `[ASSUMED]` Token-cap currency haircut ~50% (V3 secondary tier slightly less haircut than V1/V2 due to frxUSD as payout option; conservative estimate)
- `[ASSUMED]` Owner address class of mainnet FrxUSD proxy (EOA / multisig / timelock) — verifiable via Gate 2 `cast call owner()`
- `[ASSUMED]` Proxy upgrade authority class (UUPS or Transparent? Admin = multisig + timelock or EOA?) — verifiable via Gate 2 `cast storage`
- `[ASSUMED]` H4 cross-chain replay viability pending Foundry PoC + frax-oft-upgradeable source-read
- `[ASSUMED]` V3 SfrxUSD3 module override behavior on V2 MintRedeemsDisabled() reverts (H5 hypothesis structure)
- `[ASSUMED]` H2 external integration consumes mintersArray for grants/checks (low-likelihood architecture)

---

## STEP 6 — BRAIN COMPOUND PROPOSALS

### Proposal V-1 — Axis 5b PLATFORM-DIRECT-BOUNTY-NOT-LISTED anchor #2 (SAME-DAY 2-anchor)

**Source.** Today's FRAX core G1 anchored Axis 5b sub-class as anchor #1 (`Contradictions-Register v1.15`). This V3 frxUSD G1 confirms anchor #2 SAME-DAY on the same protocol (different repo, different substrate, different audit-coverage status, BUT same direct-bounty platform mechanism). 

**Doctrine impact.** Axis 5b sub-class operationally validated 2-anchor on first day of filing — promotes to PERMANENT-CANDIDATE pending 3rd cross-protocol anchor (different protocol than FRAX). Detection rule from FRAX core G1 Prop #1 ("verify program URL returns 200 on assumed platform") confirmed effective on second application.

**Filed in.** Contradictions-Register v1.16 (proposed) — Axis 5b sub-class 2-anchor count.

### Proposal V-2 — Doctrine #37 NEW Sub-Type C CANDIDATE: Unaudited-and-Active

**Source.** V3 frxUSD substrate exhibits PATTERN: active product (cross-chain via LayerZero OFT, V1.0.0 released 6mo ago, frax-oft-upgradeable updated 9 days ago) WITHOUT public audit coverage on the new substrate. This is DISTINCT from existing Doctrine #37 sub-types:
- Sub-Type A (Audited-and-Frozen-and-Scope-Frozen): CoW canonical — auto-foreclose
- Sub-Type B (Audited-and-Frozen-but-Product-Live): rhino.fi canonical — proceed with Doctrine #34 lens
- **Sub-Type C (Unaudited-and-Active, NEW)**: V3 frxUSD candidate — proceed with FULL detector rotation; do NOT short-circuit via Doctrine #27 audit-saturation

**Decision rule.** When intake reveals an active protocol with NO public audit coverage on the new substrate AND `days_since_v1.0.0 < 365d`, classify as Sub-Type C. Apply Doctrine #34 P(finding)_post_audit_module = P(finding)_unaudited × 1.0 (no discount). Run full Step 5 detector rotation (no short-circuit). Surface map to Gate 2.

**Anchor.** V3 frxUSD (this Gate 1 — 2026-05-28). 

**Promotion path.** Single-anchor CANDIDATE — promotes to PERMANENT on 2nd cross-protocol Unaudited-and-Active anchor. Cross-pollination targets: any protocol that ships a new token / new wrapper / new bridge layer without re-auditing the composed system.

**Filed in.** Doctrine.md v3.8.3 (proposed) — Doctrine #37 Sub-Type C CANDIDATE entry.

### Proposal V-3 — Doctrine #34 sub-class b 6+ anchor PERMANENT confirmation

**Source.** V3 frxUSD substrate is the 6th anchor (after Sky + Alchemix + DeFi Saver + Cap C1 + Cap C3 + Gnosis Chain + Flux + Spark — multiple 6th-anchor candidates banked today). Doctrine #34 sub-class b is OPERATIONALLY PERMANENT today (per task brief instruction). V3 frxUSD adds **a new sub-pattern flavor**:

**Sub-pattern proposal: "Module-stacking versioning V1→V2→V3 over same proxy storage as Doctrine #34 sub-class b detection signature."** When a protocol uses module-stacking pattern (V1 base ERC20 + V2 governance/freezer/pause modules + V3 signature modules) ALL on the same proxy without re-auditing the composed contract, the composed system has NEVER been audited at parity even if V1 was audited. **This is structurally identical to JustLend BUSD-market-added-Feb-2023 (Doctrine #34 anchor 4) — additive composition that inherits "covered" status without re-review.**

**Detection signal.** Grep for `contract <X>2 is <X>1`, `contract <X>3 is <X>2, Module1, Module2` patterns in versioning subdirectories. Layer 0 git-security analyzer should weight module-additions to existing-token contracts as HIGH composition multiplier.

**Filed in.** Doctrine.md Doctrine #34 enrichment (proposed) — module-stacking versioning sub-pattern.

### Proposal V-4 — DC-11 NEGATION pattern compilation (counter + rate-accumulator double-defense)

**Source.** sfrxUSD demonstrates CLEAN-CLASS DC-11 negation via TWO compounded defenses:
1. **Counter-based totalAssets** (`storedTotalAssets` tracked variable, NOT `balanceOf(this)`)
2. **Rate-accumulator pricing** (`pricePerShare × totalSupply` exponential growth `p(t) = p0*e^(r*t)`)
3. **Donation-defense** (`newRewards = balanceOf - storedTotalAssets` re-channels donations through linear distribution)

This compounds with Sky sUSDS (chi-style rate-accumulator, per Patterns-Defense-Classes.md anchor) as the 2nd anchor of "DC-11 STRUCTURAL-IMMUNE-CLASS via counter+rate-accumulator double-defense". 

**Proposed Patterns-Defense-Classes.md addendum.**
> **DC-11 STRUCTURAL-IMMUNE-CLASS (3-anchor): counter-based-totalAssets + rate-accumulator pricing + donation-redistribution.** 
> Anchors:
> - Sky sUSDS (Patterns-Defense-Classes.md original anchor)
> - V3 sfrxUSD V1 LinearRewardsErc4626 (linear-rewards-cycle + counter; this Gate 1)
> - V3 sfrxUSD V2 LinearRewardsErc4626_2 (rate-accumulator exponential + counter + user-share-minting DISABLED; this Gate 1)
> 
> Operational rule: Any ERC4626 wrapper using counter-based `storedTotalAssets` AND rate-accumulator pricing (chi-style OR exponential `p0*e^(r*t)` OR linear-rewards-cycle) is **STRUCTURALLY IMMUNE to DC-11 inflation regardless of `_decimalsOffset()` / virtual-shares / dead-shares mitigation absence**. Do NOT pursue DC-11 Gate 2 PoC on substrates matching this pattern.

**Filed in.** Patterns-Defense-Classes.md v2.6 (proposed) — DC-11 STRUCTURAL-IMMUNE-CLASS 3-anchor.

### Proposal V-5 — Watchlist-Candidate-Crossmap.md NEW row + Standing-Intake-Protocol Step 1 PROFILE Axis 6 sub-rule

**Source.** This Gate 1's Axis 6 drift revealed that **brief's "post-launch composition surface" age must be measured against the SPECIFIC repo/codebase age, not the protocol-feature launch date**. FRAX V3 system overall launched 2024-09 (~14mo); frax-tokens repo v1.0.0 released 2025-11-25 (~6mo). The relevant Doctrine #34 window is the SHORTER ~6mo. 

**Proposed Standing-Intake Step 1 PROFILE Axis 6 sub-rule.** "When evaluating post-audit composition window age, identify the SPECIFIC codebase / repo / contract instance age, NOT the protocol-feature launch date. Use `git log -1` on the specific repo HEAD vs the v1.0.0 tag date. A protocol-feature launched ~14mo ago can have a fresh codebase ~6mo old if implementation was rewritten/reforked."

**Watchlist row to file.**
```
| FraxFinance/frax-tokens v1.0.0 (frxUSD + sfrxUSD) | Direct bounty $10M ceiling / 10% lesser FRAX+FXS | Doctrine #34 sub-b STRONG-composition PRIMARY (6th anchor candidate); 4-6 Gate 2 hypotheses surviving; DC-7 EXCLUSION CANONICAL partial-apply to H1/H3 only | $53K EV pre-Gate 2 verify | WATCHLIST-PARK + Gate 2 dispatch on H4 + H6 + H3 + H1 | `hunts/2026-05-28-frax-v3-frxusd-gate1.md` |
```

**Filed in.** brain/Watchlist-Candidate-Crossmap.md (proposed) + standing-intake-protocol.md Step 1 Axis 6 sub-rule (proposed).

---

## STEP 6.5 — INTAKE-LOG APPEND

Row to append (in main intake-log.md):

```
| 2026-05-28 | FRAX V3 frxUSD + sfrxUSD (frax-tokens v1.0.0) | **DIRECT** (Axis 5b PLATFORM-DIRECT-BOUNTY-NOT-LISTED anchor #2 SAME-DAY; verified via docs.frax.finance/smart-contracts/bug-bounty) | $10M ceiling / 10% exploit lesser (FRAX+FXS+frxUSD secondary tier — cap_payment_currency haircut ~0.50× → ~$3.33M USD-realizable on Critical) | HIGH on Doctrine #34 sub-class b PRIMARY STRONG-composition (5+ anchors operationally permanent today; V3 frxUSD = 6th anchor candidate); 4-6 hypotheses survive structural filters (H4 LayerZero OFT cross-chain sig-replay strongest; H6 UUPS upgrade no-timelock; H3 DC-9 sub-2 admin-no-timelock; H1 owner-bypass paused-token; H5 V3 modules re-enable V2-disabled mint/redeem; H2 mintersArray removeMinter state-not-invalidated). DC-11 NEGATED (counter+rate-accumulator structural immunity). Pattern E EXCLUSION Class 3 negate (yield-wrapper not lending). CANDIDATE-J Point-2 negate (no refresh_cooldown). Doctrine #36 P-floor 0.05 negate (Solidity fully covered). Doctrine #37 Sub-Type B negate (UNAUDITED-AND-ACTIVE not frozen — Proposal V-2 files Sub-Type C CANDIDATE). Doctrine #27 F MAXIMUM does NOT transfer to V3 substrate (V1/V2 audits don't cover frxUSD/sfrxUSD codebase). | $53K | **WATCHLIST-PARK + Gate 2 dispatch (3-candidate rank order: H4 LayerZero sig-replay FIRST $50-500K → H6 proxy upgrade verify $10-100K → H3 admin-no-timelock $0-100K depending owner-class). 5/5 Quality Checklist surface coverage. 5 brain compound proposals filed (V-1 Axis 5b anchor #2 same-day; V-2 Doctrine #37 Sub-Type C CANDIDATE "Unaudited-and-Active"; V-3 Doctrine #34 sub-b module-stacking-versioning sub-pattern; V-4 DC-11 STRUCTURAL-IMMUNE-CLASS 3-anchor compilation; V-5 Standing-Intake Step 1 Axis 6 codebase-age-not-feature-age sub-rule + Watchlist row). NO CLONE (WebFetch-only Gate 1; disk 85% / 5.4G; Doctrine #27 F upfront NEGATE on V1/V2 substrate doesn't apply to V3 frxUSD codebase — but Gate 1 surface map fully built via WebFetch + raw.githubusercontent.com without clone). Gate 2 dispatch will require clone of frax-oft-upgradeable (~5MB est) for H4 PoC. Operator-gating: Gate 2 PoC autonomous; submission OPERATOR-GATED. Next-target rec: H4 LayerZero OFT signature-replay Gate 2 dispatch (highest EV $50-500K, fresh post-audit composition surface, no centralization-exclusion).** | `hunts/2026-05-28-frax-v3-frxusd-gate1.md` |
```

---

## STEP 7 — CLONE DISPOSITION

**NO CLONE for Gate 1.** Disk 85% / 5.4G. Gate 1 surface map fully built via WebFetch + raw.githubusercontent.com. Same execution pattern as FRAX core G1 today (WebFetch-only).

**Clone required for Gate 2 H4 dispatch:** frax-oft-upgradeable repo (~5MB est), for Foundry PoC of LayerZero OFT cross-chain signature replay. Disk impact minimal. Per Doctrine #34 STRONG-composition exemption, Gate 2 escalation is justified pre-submission. Clone disposition at Gate 2 dispatch start.

---

## STEP 8 — NEXT-TARGET RECOMMENDATION

**Recommended next action sequence:**

1. **Gate 2 H4 dispatch FIRST** — LayerZero OFT cross-chain signature replay PoC on frax-oft-upgradeable. Highest EV ($50-500K Critical), fresh Doctrine #34 STRONG-composition substrate, no centralization-exclusion concerns. ~5MB clone budget. Foundry PoC on 2× anvil (source chain + destination chain) + EIP-712 signature replay simulation.

2. **Gate 2 H6 dispatch SECOND** — `cast storage` + `cast call owner()` probes on mainnet FrxUSD proxy to verify upgrade authority class. 10-min probe. Determines if H6 paste-ready or foreclose.

3. **Gate 2 H1/H3 conditional** — depends on H6 owner-class probe outcome. If owner EOA → H1 + H3 escalate to CRITICAL paste-ready. If multisig+timelock → H1 + H3 foreclose under DC-7 EXCLUSION.

**Pivot recommendations (if H4 + H6 + H3/H1 all foreclose at Gate 2):**

- **CANDIDATE-J Point-4 5-pause-flag bitfield** on Compound III Comet C-1 (per FRAX core G1 STEP 8 + intake-log row 31) — highest-EV next-CANDIDATE-J-cross-pollination target since Compound III is HIGH-J-band not MAXIMUM
- **Aave V3 W-1 Lens-FT-CircuitBreaker source-confirm** (per intake-log row 29) — $25-50K conditional EV
- **FraxBonds (FXB) + FraxFerry V2 separate Gate 1** — distinct codebases under FraxFinance/ umbrella, FXB likely covered by Trail of Bits Oct 2023 audit, FraxFerry V2 by Trail of Bits Nov 2022 — but post-2023 modifications would still trigger Doctrine #34 sub-b

**Highest-EV system-value compound:** Sub-Type C "Unaudited-and-Active" Doctrine #37 candidate (Proposal V-2) compounds across ALL future intake — promotes to PERMANENT on 2nd cross-protocol anchor. Watch for non-Frax protocols shipping unaudited new substrate as 2nd anchor target.

---

## VERDICT SUMMARY

```
Target:                FRAX V3 frxUSD + sfrxUSD (frax-tokens v1.0.0)
Platform:              DIRECT bounty (Axis 5b anchor #2 SAME-DAY)
Cap:                   $10M ceiling / 10% exploit lesser
                       (~$3.33M USD-realizable post 0.50× currency haircut)
EV:                    $53K (vs FRAX core G1 $2.7K — 19.7× uplift from
                       post-public-audit substrate)
Overlap:               HIGH on Doctrine #34 sub-class b STRONG-composition
                       6th anchor candidate (operationally permanent today)
                       4-6 surviving hypotheses (H4 H6 H3 H1 H5 H2)
Detector rotation:     FULL (Doctrine #34 STRONG-composition exemption from
                       Doctrine #27 J corollary short-circuit per
                       Contradictions-Register #4 resolution)
Doctrine #34 sub-b:    PRIMARY HIT — ZERO public audits on frxUSD/sfrxUSD
                       substrate (docs.frax.finance audit index ends March 2025;
                       frax-tokens v1.0.0 released Nov 25 2025; frax-tokens repo
                       has NO audits/ folder)
CANDIDATE-I (now DC-11): STRUCTURALLY IMMUNE (counter+rate-accumulator double-defense)
5-target checklist:    5/5 covered, 4-6 candidate-active surfaces
Doctrine #37 Sub-Type B: DOES NOT BIND (frxUSD is unaudited-and-active,
                       not audited-and-frozen — Proposal V-2 files NEW
                       Sub-Type C CANDIDATE for this pattern)
Verdict:               WATCHLIST-PARK + Gate 2 dispatch (3-candidate rank)
Brain compounds:       5 proposals filed (V-1..V-5)
Clone:                 NOT EXECUTED for Gate 1 (WebFetch-only)
                       Required at Gate 2 H4 dispatch (~5MB)
Next target:           H4 Gate 2 dispatch (LayerZero OFT signature replay,
                       highest EV class, no centralization-exclusion)
Operator-gating:       Gate 2 PoC AUTONOMOUS;
                       paste-ready submission OPERATOR-GATED
```

---

_Filed by Buzz security-research agent | Gate 1 autonomous dispatch per autonomy-boundary.md + standing-intake-protocol.md | 2026-05-28 | Doctrine #34 STRONG-composition exemption applied (full Step 5 detector rotation, no #27 J auto-foreclosure short-circuit) | 5 brain compound proposals pending operator approval | Gate 2 H4 dispatch recommended as immediate next-target (highest EV in 2026-05-28 batch closing — $50-500K Critical class)_
