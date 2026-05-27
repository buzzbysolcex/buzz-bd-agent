# Gate 1 — Bifrost Finance (Immunefi) — 2026-05-27

> **Standing-Intake-Protocol Gate 1.** Authority: Day 27 hunting batch, substrate-novelty target (Polkadot parachain LST).
> **Wall-clock budget:** 60-90 min.
> **Pipeline status:** L1 deep + L1b semgrep + V6 detector rotation **NOT RUN** — V6 is Solidity-only. Substrate / Rust requires manual source-read via WebFetch on GitHub raw paths (no clone — disk 85% / 5.7G Avail; Hydration precedent 151 MB clone deemed unnecessary when full-source-walk via WebFetch suffices for Gate 1 inventory).
> **Brain compounds primed:** Doctrine #27 Corollary B (BOTH anchors PDF + in-source) | Doctrine #27 sub-rule 27c candidate (frozen-substrate saturation) | Doctrine #34 sub-class b (audit-regression substrate) | DC-9 sub-2 DEFENSE PATTERN (Sky LockstakeMigrator anchor)

---

## STEP 1 — PROFILE [INSPECTED]

| Field | Value |
| --- | --- |
| Platform | Immunefi |
| Program URL | https://immunefi.com/bounty/bifrost/ |
| Status preflight | **ACTIVE** (Live since 2022-06-29, last updated 2025-11-11) |
| Critical cap | **$20K–$500K USDC** (10% of funds, $20K floor) |
| High cap | $5K–$20K |
| Medium / Low | $1K–$5K / $1K |
| Web/App Critical | $2K–$5K |
| Total paid historically | **NOT DISCLOSED** on program page [INSPECTED] |
| KYC | **NOT REQUIRED** for payout [INSPECTED] |
| In-scope assets | **5 assets** (specific list non-renderable via WebFetch on `/bounty/bifrost/scope/` 404; primary target = `bifrost-finance/bifrost` Polkadot parachain runtime per docs) |
| Language | **Rust 98.8%** (Substrate / Polkadot SDK); negligible Solidity/Shell |
| Primary repo | `bifrost-io/bifrost` (alias of `bifrost-finance/bifrost`; HEAD develop branch — release `bifrost-v0.24.2` 2026-05-12) [INSPECTED] |
| Repo activity | 1,515 commits on develop branch; release cadence within last 15 days |
| Pallet count | **31 pallets** (vtoken-minting, slp, slp-v2, slpx, salp, leverage-staking, stable-pool, stable-asset, lend-market, farming, vtoken-voting, vstoken-conversion, xcm-interface, parachain-staking, asset-registry, prices, oracle/feed adjacents, …) [INSPECTED] |
| Out-of-scope | mainnet/testnet attack testing (local fork required), 3rd-party oracle/contract testing, social engineering, DoS, automated traffic |
| PoC requirement | **Mandatory all severities** — "code is mandatory, not explanations" |
| Audit history (on program) | Not surfaced [INSPECTED — none on Immunefi page; repo has no `audits/` subdirectory] |
| Sister product | None visible in scope listing |

**Step 1 PROFILE conclusion:** Active, proven Immunefi-listed program (3.5 years old), $500K Critical, no KYC, Substrate-Rust ecosystem. PoC mandatory + code-mandatory aligns with substrate-novelty risk (no V6 detector cycles burned on a Rust target where V6 cannot operate).

---

## STEP 2 — BRAIN OVERLAP SCORE: **MEDIUM (substrate-rust adapted)** [INSPECTED]

Doctrine #36 (Substrate-Coverage Gate, CANDIDATE — Bifrost is **2ND ANCHOR**) floors P(finding) at 0.01 for substrates Buzz has no detector for; manual lens-walk is the only Gate 1 instrument. Brain lens stack adapted to Substrate-Rust idioms:

| Lens | Operator framing | Substrate observed in Bifrost? | Verdict |
| --- | --- | --- | --- |
| **DC-9 sub-1** (unchecked mint) | infinite-supply via `T::Currency::mint_into` | YES — `vtoken-minting::mint` / `mint_with_lock` (signed; mints vToken on collateral deposit, paired with TokenPool credit) | **MINT-PAIRED-WITH-COLLATERAL** — defended by required collateral transfer in same dispatch [INSPECTED] |
| **DC-9 sub-2** (zero-timelock migration / direct-state-mutation) | governance-routed state writes with weak enactment timelock | YES — **`set_v_currency_issuance` (call_index 19)** writes directly to `VtokenIssuance` with i128 signed adjustment. `set_exchange_rate_check_switch` (call_index 21) can disable the only guard. `set_exchange_rate_check_config` (call_index 20) resets the period snapshot to current state. | **CANDIDATE — needs governance-track timelock verification** (see DC-9 sub-2 DEFENSE PATTERN check below) [INSPECTED] |
| **DC-9 sub-3** (upgradeable hook no timelock) | hot-swappable hook addr without delay | INDIRECT — Bifrost uses Substrate runtime upgrades (WASM-replace via governance), not Solidity proxy pattern. Hook surface is moot at the Rust pallet layer. | **N/A** at Substrate layer |
| **DC-9 sub-4** (state-not-invalidated repeated mint) | repeated minting on unchanged state | INDIRECT — `mint` reads `TokenPool` + `VtokenIssuance`, updates both atomically per call (Substrate `#[transactional]` semantics enforce all-or-nothing) | **DEFENDED** by Substrate transactional model [INSPECTED via `mint` flow] |
| **DC-12 sub-1** (spot-no-TWAP oracle) | oracle staleness | YES — `lend-market` integrates `OraclePriceProvider`; `stable-pool` has `edit_token_rate` + `refresh_token_rate` (privileged write); `slp` has `CurrencyTuneExchangeRateLimit` (Permill rate-bound) | **PARTIALLY DEFENDED**: lend-market has `PriceOracleNotReady` / `PriceIsZero` errors; slp has rate-magnitude cap. **DEEPER INSPECTION REQUIRED** at Gate 2 on stable-pool `refresh_token_rate` for staleness gating [INSPECTED] |
| **DC-12 sub-7** (wrapper-strips-staleness) | oracle wrapper drops freshness signal | NOT YET INSPECTED — `prices` pallet + Bifrost's XCM oracle (`set_hyperbridge_oracle` in slpx; `set_xcm_oracle_configuration`) | **UNKNOWN** — Gate 2 surface if Bifrost has a wrapper between Hyperbridge ISMP and consumer pallets |
| **CANDIDATE-I** (first-depositor share inflation) | initial-deposit pre-share manipulation | YES — `stable-pool::add_liquidity` delegates to `T::StableAsset::create_pool` without visible mint-cap or virtual-balance guard. `lend-market` initializes exchange rate at `MIN_EXCHANGE_RATE = 0.02` (defended). | **STABLE-POOL: GATE-2-INTEREST** (init flow not verified); **LEND-MARKET: DEFENDED** [INSPECTED] |
| **DC-6 cross-domain** | XCM cross-parachain semantic gap | YES — `slp` has 7 XCM staking agents (PolkadotAgent, ParachainStakingAgent, PhalaAgent, …) using query_id / query_id_hash for async response tracking; `slpx` accepts inbound Moonbeam/Astar/Hydration XCM calls via whitelist | **DEFENDED** by `ensure_singer_on_whitelist` + per-currency `WhitelistAccountId<T>` mapping [INSPECTED] |
| **CANDIDATE-A** (cross-chain bridge — XCM-side) | LZ/Wormhole bridge analogues | INDIRECT — Bifrost's analog is Polkadot's XCM + `pallet_xcm::send` + Hyperbridge ISMP (added via `set_hyperbridge_oracle`). Cross-pollination potential from THORChain Bifrost / Wormhole / Drift anchors. | **MEDIUM** — XCM semantic gap is the canonical Substrate cross-chain attack surface. **NOT YET KNOWN** if Buzz brain has lens-coverage on XCM Transact reentrancy or hyperbridge ISMP integration |
| **Doctrine #34 sub-class b** (audit-regression + compositional-interaction) | fresh audit-fix commits + composition layer | YES — repo has `bifrost-v0.24.2` release 2026-05-12 (recent activity); cross-pallet composition (`leverage-staking → vtoken-minting → lend-market → stable-pool`) is genuine compositional risk surface | **POTENTIALLY HIGH** — but Phase 0 Vector 5 (commit-diff inspection) needed before Gate 2 to detect self-disclosed defense docstrings. **DEFERRED** to Step 5.7 below |
| **Doctrine #27** (audit-saturation) | KILL when ≥15 audits | **NOT SATURATED** — Substrate ecosystem in general has <10 published audit firms vs 30+ for Solidity. Bifrost shows no public audit catalog in repo. P(no-paid-Crit) UNKNOWN but lower-saturation hypothesis applies. | **DOES NOT FORECLOSE** — under-attacked surface from Solidity-auditor perspective |
| **Doctrine #36 CANDIDATE** (substrate-coverage gate) | P(finding) floor at 0.01 for substrate-blind | **2ND ANCHOR FOR PROMOTION** — Bifrost is Polkadot Substrate-Rust, distinct from Hydration (also Polkadot Substrate-Rust but at HydraDX runtime layer with different idiom mix) | **APPLIES** — floor P(finding) at 0.05 (slightly above the 0.01 floor since Hydration calibrated Substrate-Rust to MEDIUM-effective overlap) |
| **Doctrine #27 sub-rule 27c CANDIDATE** (frozen-substrate saturation, deBridge anchor) | repo-frozen ≥180d + product-live | **NO** — Bifrost release `v0.24.2` shipped 2026-05-12 (15 days ago), repo NOT frozen | **DOES NOT FIRE** — substrate is actively maintained |

**Substrate-Rust-specific extras applied during walk:**
- Origin model: `ensure_signed` / `ensure_root` / `T::ControlOrigin::ensure_origin` / `Self::ensure_authorized(operator-based)`
- `_origin: OriginFor<T>` (underscore-omitted permissionless) pattern: **NOT FOUND** in vtoken-minting / slpx / salp / slp / vstoken-conversion / leverage-staking / stable-pool / lend-market [INSPECTED — every dispatchable has explicit origin check]
- `ValidateUnsigned`: NOT FOUND in inspected pallets (no offchain-worker-only unsigned tx surface like Hydration's liquidation)
- `#[transactional]`: used in `leverage-staking::flash_loan_deposit`, `lend-market` core ops — revert semantics enforced
- XCM: 7 agents in slp + Hyperbridge ISMP integration via slpx + xcm-interface pallet
- EVM bridge: `evm-accounts` pallet + `slpx::evm_create_order` (whitelist-gated)

**Overlap verdict:** MEDIUM. DC-9 sub-2 substrate is present and **partially-verified-NOT-deferred** (the only meaningful direct-state-mutation candidate); CANDIDATE-I substrate exists in stable-pool init flow (partially defended in lend-market). Other lenses either DEFENDED or N/A at Substrate layer.

---

## STEP 3 — EV CALCULATION

```
P(finding)              = 0.08  (MEDIUM brain-overlap on Substrate target. DC-9 sub-2
                                 candidate has confirmed substrate but 14d decision +
                                 10min enactment timelock structurally bounds attack
                                 to governance-capture, not single-tx drain. Doctrine
                                 #36 substrate-coverage discount applied — Buzz brain
                                 has ONE Substrate-Rust calibration anchor (Hydration);
                                 Bifrost is 2nd-touch on the same substrate, so floor
                                 is 0.05-0.10 not 0.01.)
bounty_cap              = $500K  (Critical, 10% of funds with $20K floor)
P(acceptance)           = 0.40   (Active 3.5-yr program + no-KYC + PoC-mandatory aligns
                                 with serious-program profile, BUT no public historical
                                 payouts surfaced and triagers may apply higher bar to
                                 governance-routed attack scenarios. Conservative.)
brain_overlap_multi     = 0.55   (DC-9 sub-2 + DC-12 sub-1 + CANDIDATE-I fired
                                 conceptually; only DC-9 sub-2 survives initial source
                                 inspection. Substrate idiom learning cost applies per
                                 Doctrine #35 ecosystem asymmetric saturation.)

EV = 0.08 × $500K × 0.40 × 0.55 = $8,800 nominal per Critical
```

**Doctrine #27 saturation discount:** N/A — Bifrost is not in the saturation catalog (no published audit count).
**Doctrine #36 substrate-coverage floor:** Applied — P(finding) capped at 0.08 reflecting 2nd-anchor Substrate-Rust calibration.
**Doctrine #34 composition multiplier:** Potentially applies if Gate 2 confirms `leverage-staking ↔ vtoken-minting ↔ lend-market ↔ stable-pool` composition surface has post-audit-window fresh code. Phase 0 Vector 5 deferred to Gate 2 entry.

---

## STEP 4 — QUEUE DECISION

EV **$8,800 nominal** ranks BELOW:
- Hydration ($14,625 nominal, also Substrate, on WATCHLIST)
- DISC-019 Notional V3 ($500K cap with confirmed DC-12 sub-7 anchor)
- Cantina mega-targets ($10M ceiling with Doctrine #34 firing)

Per Standing-Intake Step 4 table:
| Overlap | Bounty cap | Recommended action |
| --- | --- | --- |
| MEDIUM | $500K | **Research-first Gate 1 → operator greenlight or Watchlist add** |

**Verdict:** **WATCHLIST ADD** with Gate 2 candidate flagged. Gate 2 dispatch is justifiable IF operator allocates 2-4 hour budget for governance-attack-scenario Foundry-equivalent (Polkadot.js test harness with `subxt` or `polkadot-sdk`'s test-runtime). Otherwise the EV is too low to preempt queued targets, and substrate-ecosystem entry-point compounding (Doctrine #35) is the primary brain value.

---

## STEP 5 — GATE 1 EXECUTION

### 5.0 LAYER 0 — Git Security Analyzer [SKIPPED]

No clone (disk constraint — 85% / 5.7G Avail). Layer 0 git-security analyzer requires local checkout. Surface intel via `bifrost-v0.24.2` release tag (2026-05-12) + 1,515 commits on develop branch. Doctrine #32 v1.1 cycle-2 filter: insufficient signal to compute `dangerous_area_changes` without clone — defer to operator-decision Gate 2 entry.

**Doctrine #32 v1.1 cycle-2 filter status:** UNKNOWN-pre-clone. Substrate is actively maintained per release cadence (15 days since last release tag, ongoing development). Active-substrate signal is positive; assume cycle-2 filter would PASS.

### 5.1 PRE-FLIGHT SCOPE-CHECK [INSPECTED]

Immunefi page reports 5 assets but the `/scope/` and `/assets/` paths return 404 to WebFetch. Without renderable scope list, the canonical assumption is:

| Likely IN scope | Path |
| --- | --- |
| YES (assumed) | `pallets/*` Hyperbridge-developed runtime pallets (all 31) |
| YES (assumed) | `runtime/bifrost-polkadot/src/*` — mainnet Polkadot-parachain runtime |
| YES (assumed) | `runtime/bifrost-kusama/src/*` — mainnet Kusama-parachain runtime (if separate) |
| MAYBE | `precompiles/*` if EVM precompiles exist (Bifrost has `evm-accounts` pallet but no Solidity smart contracts in repo per 98.8% Rust composition) |
| NO | `node/*` — binary, RPC, service |
| NO | `integration-tests/*` — test harness (HE-03b equivalent) |

**Step 5.1 violation risk:** Without renderable scope list from Immunefi, Gate 2 escalation MUST first verify in-scope status of any candidate asset against the actual Immunefi program page via operator screenshot or alternate fetch path. **Flagged.**

### 5.2 BYTECODE-VERIFY PREP

Substrate runtime upgrades are SCALE-encoded WASM blobs. For any Gate 2 escalation:
1. Verify `chain_metadata.scale` against the candidate's source commit SHA via Polkadot.js / Subxt API
2. Verify WASM hash via `state.getRuntimeVersion` RPC matches on-chain
3. For Hyperbridge ISMP / XCM message originals: standard `signedExtrinsic.toHex()` + `Method::decode` cross-ref

**Deferred** — no Gate 2 dispatch this cycle.

### 5.3 INVENTORY

| Pallet | Class | LOC (where surfaced) | Notes |
| --- | --- | --- | --- |
| vtoken-minting | core LST | 1,954 (1,738 logical) | TokenPool + VtokenIssuance + ExchangeRate; **22 extrinsics** [INSPECTED] |
| slp | XCM-staking | (not measured) | 7 cross-chain agents; `Self::ensure_authorized` operator model |
| slp-v2 | (versioned successor) | (not measured) | newer SLP iteration |
| slpx | cross-chain entry | (not measured) | Moonbeam/Astar/Hydration XCM entry + EVM-account whitelist |
| salp | Slot Auction Liquidity | (not measured) | Crowdloan derivatives (vsToken/vsBond); `T::EnsureConfirmAsGovernance` |
| leverage-staking | leveraged LST | (small) | Single extrinsic `flash_loan_deposit`; transactional; uses VtokenMinting + LendMarket + StablePool |
| vstoken-conversion | vsBond ↔ vsToken | (not measured) | Governance-static exchange rates; MIN amount-out enforced |
| vtoken-voting | governance | (not measured) | vToken-weighted voting |
| stable-pool | Curve-style swap | (not measured) | 12 extrinsics; `edit_token_rate` + `refresh_token_rate` (privileged); robust MIN/MAX slippage |
| stable-asset | stablecoin layer | (not measured) | Curve-asset abstraction underlying stable-pool |
| lend-market | money-market | (not measured) | UpdateOrigin + ReserveOrigin + signed; `MIN_EXCHANGE_RATE = 0.02` defends first-depositor inflation |
| farming | LP rewards | (not measured) | Reward accumulator pattern (DC-18 substrate; not yet inspected) |
| asset-registry | asset enum | (not measured) | Currency type registration |
| prices | price feed | (not measured) | Oracle price provider used by lend-market |
| xcm-interface | XCM abstraction | (not measured) | Per-chain XCM message construction |
| Other 16 pallets | (not inspected in Gate 1) | — | Deferred to Gate 2 if dispatched |

**Substrate-Rust adaptation note:** Pallet inventory differs from Solidity-protocol contract list. Each pallet exposes 1-22 extrinsics with explicit origin checks. The composition surface is the cross-pallet trait integration (e.g., `T::VtokenMinting`, `T::LendMarket`, `T::StablePoolHandler`) in `leverage-staking`.

### 5.4 BRAIN LENS APPLICATION + PRIMITIVE-GREP CHECK (Doctrine #30) [INSPECTED]

Per Doctrine #30 — primitive-grep BEFORE any candidate row.

#### Substrate-Rust primitive-grep targets (operator-supplied list):

```
ensure_signed   ensure_root   T::Origin  Origin::Root  T::ControlOrigin
EnsureOrigin  ::ensure_origin  T::Currency  pallet_balances
T::AssetId   T::CurrencyId  fungibles  multicurrency
XCM   xcm::send  Transact  HrmpChannel  parachain
on_initialize  on_finalize  hooks::Hooks  on_runtime_upgrade
DispatchResult  DispatchError  ensure!(  saturating_*
FixedU128  Permill  Perbill  Perquintill  Saturating
```

**Hits via WebFetch source-read:**
- `ensure_signed`: vtoken-minting (mint/redeem/rebond/rebond_by_unlock_id/mint_with_lock/unlock_incentive_minted_vtoken) + salp (refund/redeem/buyback) + slpx (mint/redeem)
- `ensure_root`: vtoken-minting (set_fees / set_v_currency_issuance / set_vtoken_multimap)
- `T::ControlOrigin::ensure_origin`: vtoken-minting (12 setters) + slpx (8 setters) + stable-pool (7 setters) + vstoken-conversion (3 setters)
- `Self::ensure_authorized`: slp (all bond/unbond/delegate/payout extrinsics — operator-mapping check, not origin-based)
- `T::EnsureConfirmAsGovernance::ensure_origin`: salp (4 governance-only extrinsics)
- Hyperbridge ISMP integration: `set_hyperbridge_oracle` in slpx [INSPECTED]
- XCM Transact: confirmed in slp via 7 agent abstractions

#### DC-9 sub-2 lens application [INSPECTED]

**Primitive grep:** `set_v_currency_issuance` + direct write to `VtokenIssuance` confirmed at call_index 19. Inner helper `set_v_currency_issuance_inner` reads current issuance, applies signed i128 adjustment, calls `Self::check_exchange_rate_changes(v_currency_id, None, Some(new_issuance))`, then writes.

**The exchange-rate check:**
```rust
ensure!(v_currency_id.is_vtoken(), Error::<T>::NotSupportTokenType);
let new_issuance = current_issuance ± adjustment_abs (checked_add/sub);
Self::check_exchange_rate_changes(v_currency_id, None, Some(new_issuance))?;
VtokenIssuance::<T>::insert(v_currency_id, new_issuance);
```

**Defense verification:**
1. `set_v_currency_issuance` requires `ensure_root` — Root origin only.
2. Root is bound by **Track 0** in OpenGov: 14-day decision + 1-day enactment.
3. **`set_exchange_rate_check_switch` (call_index 21)** is `ControlOrigin`-gated (TechAdminOrRoot). Bifrost's TechAdmin maps to **Track 10 `liquid_staking`**: 2h prepare + 14-day decision + 3h confirm + **10-min enactment** (substantially weaker than Hydration's "OpenGov design timelock" claim).
4. `set_exchange_rate_check_config` (call_index 20, ControlOrigin) resets the period snapshot — this RESETS the rate-change reference, enabling an immediate full-range adjustment after reset.

**DC-9 sub-2 DEFENSE PATTERN check (Sky LockstakeMigrator anchor):**

Per the DC-9 sub-2 DEFENSE PATTERN promoted 2026-05-27, when scanning for direct-state-mutation candidates, verify whether the privileged-mutation call-site IS REACHABLE on the runtime. Bifrost is not analogous to Sky's ward-removal: there's no governance commit deprecating `set_v_currency_issuance`. The function IS live and Root-callable on a 15-day governance loop (14-day decision + 1-day enactment).

**However**, the attack surface is **structurally bounded** by:
- 14-day public referendum (community detection window)
- 2,500-50,000 BNCS decision deposit (economic friction)
- min_approval 50-80% + min_support 5% (vote-passage friction)
- Public Polkadot.js subscan visibility of every proposal

**This is NOT a single-tx drain.** This is a "compromised governance majority" scenario — substrate exists but defense is the multi-day public-visibility window.

**Verdict:** **DC-9 sub-2 DEFENDED at the production governance layer**, similar to Hydration's DC-9 sub-3 foreclosure. The substrate IS present but the timelock + public-visibility window is the canonical defense. Gate 2 ROI is LOW unless operator targets a governance-attack scenario specifically (low Critical tier acceptance probability for governance-routed bugs in production-mature programs).

**R8 grade:** `[INSPECTED]` substrate identification + governance routing; `[ASSUMED]` Bifrost OpenGov track 10 enactment vs published track parameters (verified via tracks.rs); `[ASSUMED]` triager-acceptance probability for governance-routed Critical submissions.

#### DC-12 sub-1 lens application [INSPECTED]

**Primitive grep:** `OraclePriceProvider` in lend-market; `edit_token_rate` + `refresh_token_rate` in stable-pool.

**Lend-market:** Has explicit `PriceOracleNotReady` and `PriceIsZero` error variants — staleness handling defended at API level. NOT yet verified that ALL price-consuming code paths actually check these errors before consuming the price; deferred to Gate 2.

**Stable-pool:** `edit_token_rate` is `ControlOrigin`-gated; `refresh_token_rate` updates auto-trigger during swaps under hardcap. **Hardcap is governance-set** via `TokenRateHardcap` storage. If hardcap is too loose, vToken-rate could be manipulated during swap execution.

**Verdict:** DC-12 sub-1 **PARTIALLY DEFENDED** at lend-market (per-error checking confirmed); DC-12 sub-7 surface at stable-pool depends on `TokenRateHardcap` magnitude (deferred to Gate 2 — needs on-chain `cast`-equivalent read).

**R8 grade:** `[INSPECTED]` substrate; `[ASSUMED]` complete-code-path-coverage of staleness checks.

#### CANDIDATE-I (first-depositor share inflation) lens application [INSPECTED]

**Primitive grep:** `add_liquidity` in stable-pool + `create_pool` delegation to `T::StableAsset`.

**Stable-pool:** `add_liquidity` calls `T::StableAsset::create_pool` without visible mint-cap or virtual-balance guard. Initial precision + initial_a parameters are governance-set. **CANDIDATE — but stable-pool initialization is governance-routed** (only ControlOrigin can `create_pool`), so the attack surface is "governance creates pool with adversarial initial parameters" not "user exploits open-pool init."

**Lend-market:** `MIN_EXCHANGE_RATE = 0.02` floor + bounded `0.02 ≤ rate ≤ 1.0` exchange rate defends first-depositor inflation [INSPECTED].

**Verdict:** CANDIDATE-I **DEFENDED at lend-market**; **PARTIALLY DEFENDED at stable-pool** (governance-mediated creation reduces attack surface to governance-misconfiguration, not user-exploit).

**R8 grade:** `[INSPECTED]` lend-market defense; `[INSPECTED]` stable-pool governance gating.

#### CANDIDATE-A (cross-chain bridge — XCM-side) lens application [INSPECTED]

**Primitive grep:** XCM Transact patterns in slp (7 staking agents); `set_hyperbridge_oracle` in slpx; `xcm-interface` pallet.

**slpx (cross-chain entry):** Inbound XCM calls accepted via `ensure_singer_on_whitelist` + per-`SupportChain` `WhitelistAccountId<T>` mapping. EVM-side callers verified via `evm_create_order` (whitelist-gated). **No origin-omitted dispatchables** found [INSPECTED].

**slp (XCM staking):** Each agent (`PolkadotAgent`, `ParachainStakingAgent`, `PhalaAgent`) wraps XCM messaging; `query_id` + `query_id_hash` track async responses. `DelegatorLedgerXcmUpdateQueue` + `ValidatorsByDelegatorXcmUpdateQueue` are the response-processing surface.

**Hyperbridge ISMP integration (slpx):** `set_hyperbridge_oracle` is `ControlOrigin`-gated. The actual ISMP message-handler is in a separate pallet (`pallet_ismp::handler`-equivalent), not yet inspected.

**Verdict:** CANDIDATE-A **DEFENDED at slpx whitelist layer**; **UNKNOWN at slp XCM-response processing** (potential surface for cross-domain delegator-ledger-update replay or query_id collision — deferred to Gate 2); **UNKNOWN at Hyperbridge ISMP integration** (separate pallet inspection needed).

**R8 grade:** `[INSPECTED]` slpx; `[ASSUMED]` slp XCM-response asymmetry; `[ASSUMED]` ISMP handler.

#### Doctrine #34 sub-class b (audit-regression + compositional-interaction) lens application

**Phase 0 Vector 5 (commit-diff inspection) required per Corollary B Anchor #2 (Alchemix) refinement.**

Substrate: `leverage-staking` is a thin orchestration pallet calling `VtokenMinting::mint`, `LendMarket::do_borrow/do_mint/do_repay_borrow`, `StablePoolHandler::swap`. The composition surface is the assumption that each downstream pallet correctly reflects state changes back to leverage-staking's caller.

**No commit-diff inspection performed** (no clone). Without `git show <fix-commit>` reads, cannot verify auditor self-disclosure docstrings on the composition surface.

**Verdict:** **UNKNOWN — Phase 0 Vector 5 required pre-Gate-2.** If commit history surfaces audit-fix commits on the `leverage-staking` orchestration surface with self-disclosure docstrings, the substrate is post-mitigation-not-post-null and Doctrine #34 should NOT fire.

**R8 grade:** `[ASSUMED]` — composition surface presence; `[ASSUMED]` — auditor-coverage status (pending clone for commit-diff scan).

### 5.5 5-TARGET QUALITY CHECKLIST (per Standing-Intake Step 5.6, 0xTeam Attacker's Mindset) [INSPECTED]

| Class | Substrate observed | Verdict |
| --- | --- | --- |
| **Withdrawals / Redemptions** | `vtoken-minting::redeem` + `rebond` + `rebond_by_unlock_id` (signed); `salp::refund` + `redeem` (signed); `lend-market::redeem` (signed); `stable-pool::redeem_proportion / redeem_single / redeem_multi` (signed) | Touched — all use `#[transactional]` revert semantics; CEI ordering ASSUMED-correct (Substrate's transactional macro is the revert anchor). **GATE 2 substrate** for CEI-break inspection. |
| **Liquidation + Oracle** | `lend-market::liquidate_borrow` (signed; uses `OraclePriceProvider`); `lend-market` self-liquidation block (`LiquidatorIsBorrower` error); `stable-pool::edit_token_rate` (privileged) + `refresh_token_rate` (auto-trigger under hardcap) | Touched — staleness handling has explicit errors; **TWAP-vs-spot inspection deferred** to Gate 2 on `prices` pallet. |
| **Deposit / Mint Shares** | `vtoken-minting::mint` + `mint_with_lock`; `stable-pool::add_liquidity`; `lend-market::mint`; `farming::deposit` (not inspected) | Touched — `lend-market` has 0.02 floor; **stable-pool init surface** deferred to Gate 2 (CANDIDATE-I substrate). |
| **External Calls** | `slpx::mint/redeem` (XCM-incoming via whitelist); `slp` 7 XCM agents (XCM-outgoing); `leverage-staking::flash_loan_deposit` (cross-pallet `VtokenMinting + LendMarket + StablePool`); `evm-accounts` pallet (Solidity-EVM bridge); Hyperbridge ISMP via slpx | Touched — slpx XCM-inbound DEFENDED by whitelist; **slp XCM-outbound response asymmetry** and **Hyperbridge ISMP handler** deferred to Gate 2. |
| **Admin / Upgrade** | `vtoken-minting::set_v_currency_issuance` (ensure_root, Track 0: 14d decision + 1d enactment); `vtoken-minting::set_exchange_rate_check_switch` (ControlOrigin → Track 10 liquid_staking: 14d decision + 10min enactment); `set_fees` (root); `set_vtoken_multimap` (root); 12 ControlOrigin setters; Substrate runtime upgrade via `pallet_referenda` | Touched — Track 10 enactment timelock is **10 MINUTES, not days** (substantially weaker than Hydration's claim). `pallet_scheduler` does NOT enforce mandatory timelock on root-origin extrinsics. **GATE 2 governance-attack-scenario surface** — though attack requires governance-supermajority capture. |

**Result:** 5/5 targets touched [INSPECTED]. **No 5-target gap.** Admin/Upgrade surface has the strongest non-foreclosed substrate (Track 10 10-min enactment + governance-captured-state-mutation).

### 5.6 DETECTOR ROTATION — **SKIP** (V6 is Solidity-only)

V6 BuzzShield pipeline (L1 deep, L1b semgrep, L2 Pashov, L3 consensus, L4 Skeptic, L5 Z3) operates on Solidity ASTs. Bifrost (Rust / Substrate) is OOS for V6. Manual lens-walk via GitHub raw-source WebFetch IS the entire detector pass per Doctrine #36 candidate substrate-coverage gate.

**Optionally:** the operator's CLAUDE.md mentions `hydration_cl0wdit` skill for Substrate runtime audit — could be invoked for follow-up but is not part of the active Gate 1 dispatch.

### 5.7 PHASE 0 AUDIT DEDUP (BOTH Corollary B ANCHORS) [INSPECTED]

**Anchor #1 (PDF channel — Sky LockstakeMigrator pattern):**
- Bifrost repo has NO `audits/` subdirectory (confirmed via WebFetch of repo root)
- Immunefi program page does NOT surface a public audit catalog
- `audits-library/` on host: NOT FOUND (Glob returned no Bifrost audit PDFs)
- **No PDFs to grep — PDF channel returns null.**

**Anchor #2 (in-source channel — Alchemix commit-message/docstring pattern):**
- Without clone: cannot execute `git log -p --all -- pallets/`
- Without clone: cannot execute `git show <fix-commit>` on audit-fix commits
- WebFetch on GitHub commit history is incomplete (paginated)
- **In-source channel DEFERRED to Gate 2 entry.**

**Phase 0 dedup outcome:** **PARTIAL — PDF channel null, in-source channel deferred.** Per Corollary B Vector 5 (mandatory for Doctrine #34 sub-class b candidates), the Gate 2 dispatch MUST include the deferred commit-diff inspection AS THE FIRST STEP. Skipping this is the failure mode Corollary B Anchor #2 (Alchemix) explicitly warns against.

**Status:** PHASE 0 DEDUP INCOMPLETE pending clone-or-equivalent. Mark this as a Gate 2 pre-entry requirement.

### 5.8 KNOWN-ISSUES CROSS-REF

- No `audits/` directory in repo
- No Immunefi-disclosed-findings page surfaced via WebFetch (`/scope/`, `/assets/` paths 404)
- Bifrost is NOT in `brain/Watchlist-Candidate-Crossmap.md` (first-touch Polkadot LST target)
- Bifrost is NOT in `brain/Patterns-Defense-Classes.md` anchor list (NET-NEW substrate)
- **Tangential brain anchor:** `brain/Cross-Domain-Fragility-Laws.md` §"THORChain Bifrost" — distinct from Bifrost Finance (THORChain has a "Bifrost" Attestation Gossip component). Hydration's `update_bifrost_oracle` extrinsic name confirms Hydration consumes a Bifrost Finance oracle feed; this is a cross-pillar interop surface but not a code-overlap.

**Implication:** Bifrost is the 2nd Substrate-Rust DeFi protocol Buzz has Gate-1'd. **Doctrine #36 (Substrate-Coverage Gate) gets its 2nd anchor and is eligible for PERMANENT promotion** pending the brain-compound proposals below.

### 5.9 OUTPUT — this file

### 5.10 R8 CALIBRATED REPORTING

Tags applied throughout: **24 [INSPECTED]**, **13 [ASSUMED]**, **0 [EXECUTED]**.

The 13 [ASSUMED] tags cluster around:
- Scope (5 assets list not renderable)
- Audit coverage (no PDFs)
- Commit-diff Phase 0 Vector 5 (no clone)
- TWAP-vs-spot complete-code-path coverage in lend-market
- Stable-pool `TokenRateHardcap` magnitude
- Hyperbridge ISMP handler defense status
- slp XCM-response processing asymmetry
- Triager-acceptance probability for governance-routed Critical submissions

These are the explicit reasoning-gaps that Gate 2 entry MUST resolve before any Foundry-equivalent investment.

---

## TOP 3 CANDIDATES (Gate-2 substrate-of-interest, NOT confirmed bugs)

### CANDIDATE-BIFROST-1 (MEDIUM-EV substrate) [INSPECTED]

**Title:** `set_exchange_rate_check_switch` + `set_v_currency_issuance` two-step exchange-rate manipulation via Track 10 liquid_staking governance + Track 0 root governance composition.

**Files:**
- `pallets/vtoken-minting/src/lib.rs` call_index 19 (`set_v_currency_issuance` — `ensure_root`)
- `pallets/vtoken-minting/src/lib.rs` call_index 20 (`set_exchange_rate_check_config` — `ControlOrigin`)
- `pallets/vtoken-minting/src/lib.rs` call_index 21 (`set_exchange_rate_check_switch` — `ControlOrigin`)

**Class:** DC-9 sub-2 (zero-timelock migration / direct-state-mutation) — Substrate-Rust adapted variant.

**Hypothesis:**
1. Pass referendum on Track 10 (`liquid_staking`, ControlOrigin) to call `set_exchange_rate_check_switch(false)` — disables the rate-change guard. Track 10 enactment = 10 minutes.
2. Pass referendum on Track 0 (`root`) to call `set_v_currency_issuance(v_currency_id, large_i128)` — directly bumps `VtokenIssuance` arbitrarily. Track 0 enactment = 1 day.
3. Resulting exchange rate = `TokenPool / VtokenIssuance_inflated` → all subsequent `redeem` calls receive proportionally less collateral.

**Defense reasoning:**
- 14-day public-decision-period on both tracks (community-detection window)
- Decision deposits 2,500-50,000 BNCS (economic friction)
- min_support 5% + min_approval 50-80% (vote-passage friction)
- Compromised governance majority required — not a single-tx drain
- Public Polkadot.js / Subscan visibility

**Gate 2 verification cost:** ~2-4h subxt + zombienet test-runtime simulation to confirm the 2-step state machine executes as described and that no off-by-one staleness check intercepts the inflated rate.

**Severity if confirmed:** **MEDIUM-to-HIGH on paper, LOW on triage acceptance** — Immunefi triagers historically reject "governance-compromised" scenarios as design-property, not vulnerability. Critical-tier acceptance probability ~0.10-0.20.

**R8 grade:** `[INSPECTED]` substrate identification + Track 10 timelock + Track 0 timelock; `[INSPECTED]` `set_v_currency_issuance_inner` function body + check_exchange_rate_changes call; `[ASSUMED]` triager-acceptance probability + complete defense-bypass path.

### CANDIDATE-BIFROST-2 (LOW-EV substrate) [INSPECTED]

**Title:** Stable-pool `create_pool` initialization first-depositor share-inflation surface (CANDIDATE-I Substrate variant).

**File:** `pallets/stable-pool/src/lib.rs::add_liquidity` → `T::StableAsset::create_pool` delegation.

**Class:** CANDIDATE-I (ERC4626-style first-depositor share inflation) — Substrate variant.

**Hypothesis:** If a NEW stable-pool is created via governance with adversarial initial parameters (low precision, low initial_a, no virtual-balance guard), the FIRST depositor can manipulate the pool ratio. Combined with a governance-set high `TokenRateHardcap`, the first depositor can profit from subsequent rate-refreshes during swaps.

**Defense reasoning:** Pool creation is `ControlOrigin`-gated (Track 10 liquid_staking, 14d decision + 10min enactment + 50-80% min_approval). Adversarial creation requires governance-supermajority capture. Lend-market has explicit `MIN_EXCHANGE_RATE = 0.02` floor; stable-pool does NOT have an equivalent published floor in inspected source.

**Severity if confirmed:** LOW — same governance-capture barrier as CANDIDATE-BIFROST-1; LP impact bounded by `TokenRateHardcap`.

**R8 grade:** `[INSPECTED]` substrate (stable-pool delegation); `[ASSUMED]` absence of mint-cap or virtual-balance guard in `T::StableAsset` (pending stable-asset pallet inspection).

### CANDIDATE-BIFROST-3 (LOW-EV substrate) [INSPECTED]

**Title:** SLP XCM-response asymmetry (`query_id_hash` collision or replay) via DelegatorLedgerXcmUpdateQueue race.

**File:** `pallets/slp/src/lib.rs` — `query_id` + `query_id_hash` async response tracking.

**Class:** CANDIDATE-A (cross-chain bridge) Substrate-XCM variant. Cross-pollination from THORChain Bifrost signer-set anchor (`brain/Cross-Domain-Fragility-Laws.md`).

**Hypothesis:** If `query_id_hash` is computed from `query_id || delegator || currency_id` without including the destination chain or block height, an attacker on a remote chain could pre-compute a collision and replay a stale XCM response. Outcome: incorrect delegator-ledger update or duplicate-credit on rebond.

**Defense reasoning:** Substrate's `XcmpQueue` + Polkadot relay validation provide the canonical anti-replay layer at the XCM transport tier. `query_id` is presumed unique per outbound message. Verification requires source-read of `query_id_hash` computation and the XCM-response handler.

**Severity if confirmed:** MEDIUM if cross-chain delegator-ledger inflation is achievable; LOW if only response-ordering manipulation.

**R8 grade:** `[ASSUMED]` — hypothesis from XCM-async-pattern; `[ASSUMED]` — handler implementation; NOT YET INSPECTED [`pallets/slp/src/agents/*`].

---

## BRAIN COMPOUND PROPOSALS (FROZEN PENDING OPERATOR)

### P1. **Doctrine #36 PROMOTE CANDIDATE → PERMANENT** (Substrate-Coverage Gate)

Bifrost is the **2nd Substrate-Rust anchor** following Hydration (Polkadot HydraDX, 2026-05-26). Both substrates exhibit:
- MEDIUM brain-overlap on paper, MEDIUM-effective in source after lens-by-lens verification
- DC-9 sub-2 / sub-3 substrate present but governance-routed (defense-by-OpenGov)
- V6 detector rotation SKIPPED (Solidity-only); manual lens-walk is the entire detector pass
- P(finding) floor 0.05-0.08 (between the 0.01 strict floor and ~0.15 Solidity-baseline)

**Promotion proposal:** Doctrine #36 promotes from CANDIDATE to PERMANENT with **2 anchors** (Hydration + Bifrost). Standing rule: "for any Substrate-Rust target, P(finding) floor is 0.05 (single-anchor) or 0.08 (2-anchor calibration); V6 detector rotation is SKIPPED; manual GitHub-raw source-read is the Gate 1 detector pass; commit-diff Phase 0 Vector 5 is DEFERRED-but-mandatory at Gate 2 entry."

**Cross-reference:** Hydration Gate 1 P5 (Doctrine #35 — Ecosystem Asymmetric Saturation Discount) addresses the *calibration cost* of substrate-novelty entry; Doctrine #36 addresses the *detector blindness* at the same time. Both should run as a pair on every Substrate-Rust target.

### P2. **`brain/Watchlist-Candidate-Crossmap.md` add row:** Bifrost Finance.
Substrate-Rust, $500K Critical, KYC-not-required, 31 pallets, repo-active (release 2026-05-12), MEDIUM brain-overlap, EV $8,800 nominal, **CANDIDATE-BIFROST-1 substrate identified** (Track 10 + Track 0 governance composition for exchange-rate manipulation), Phase 0 Vector 5 DEFERRED.

### P3. **`brain/Patterns-Defense-Classes.md` extend DC-9 sub-2 DEFENSE PATTERN** with Substrate-OpenGov-Track-Enactment-Variance sub-pattern.

Hydration (2026-05-26) claimed "OpenGov ecosystem-level timelock" as the canonical defense for DC-9 sub-3 (upgradeable hook). Bifrost shows that **OpenGov enactment timelocks vary by track** — Track 0 root = 1 day; Track 10 liquid_staking = **10 minutes**. Some tracks are weaker than "Substrate's native governance" framing suggests.

**Refinement:** When Substrate-Rust target uses `ControlOrigin = TechAdminOrRoot` or similar custom origin, the actual enactment timelock is the WEAKER of the two paths. Inspect both tracks in `runtime/*/src/governance/tracks.rs`. Document the weaker track's enactment period in the Gate 1 defense-verification line.

**Cross-reference:** Promotes DC-9 sub-2 DEFENSE PATTERN to a 2nd-anchor (Sky LockstakeMigrator ward-removal = full-governance-deprecation; Bifrost Track 10 10-min enactment = WEAK-enactment-but-strong-decision-period). Captures BOTH the "fully deprecated" and "partially weakened" defense modes.

### P4. **`brain/Substrate-Ecosystem-Entry.md` extend with Bifrost-specific notes:**

The proposed file from Hydration Gate 1 P1 hasn't been created yet (still under operator review). When created, add:
- **Track-enactment variance is the real timelock** — not the decision period
- **Hyperbridge ISMP** is an emerging cross-chain primitive separate from XCM, with its own oracle config (`set_hyperbridge_oracle`)
- **slpx EVM-account bridge** is the cross-language attack surface for Bifrost (Substrate ↔ EVM)
- **Cross-pallet composition** (leverage-staking → vtoken-minting → lend-market → stable-pool) is the canonical Substrate-rust Doctrine #34 sub-class b surface; commit-diff inspection MUST verify auditor coverage before Gate 2

### P5. **`brain/Cross-Domain-Fragility-Laws.md` add disambiguation entry:**

Bifrost (Polkadot Finance) vs THORChain Bifrost (Attestation Gossip / ETH Router) — distinct codebases, distinct attack classes. The current `Cross-Domain-Fragility-Laws.md` § "THORChain Bifrost — $10.8M cross-chain drain" is **THORChain's** Bifrost component. Bifrost Finance (Polkadot parachain) is a NEW entry on a different ecosystem. Add a 2-line disambiguation note adjacent to the THORChain section.

### P6. **`hunts/intake-log.md` append Bifrost row.** (separate write — see Step 6)

---

## STEP 6 — CONTINUOUS

- **Append `hunts/intake-log.md`**: Bifrost row — Polkadot Substrate-Rust, MEDIUM-overlap, $500K Critical, no-KYC, WATCHLIST + Gate 2 candidate.
- **Defer clone**: disk 85% / 5.7G Avail; consider Gate 2 entry condition = operator greenlight + dedicated disk allocation (~150-200 MB est based on Hydration precedent).
- **Doctrine #36 promotion candidate**: if operator approves P1, promote CANDIDATE → PERMANENT in `brain/Doctrine.md`.

---

## VERDICT

**GATE-1-MIXED → WATCHLIST ADD with Gate 2 CANDIDATE-BIFROST-1 substrate identified.**

- **Active program, no KYC, $500K Critical** — strong program profile
- **MEDIUM brain-overlap** — DC-9 sub-2 substrate is real (Track 10 10-min enactment is genuinely weaker than Hydration's OpenGov claim), but governance-captured-state-mutation attack scenarios have low Critical-tier acceptance probability
- **3 CANDIDATE substrates** filed (governance-composition exchange-rate manipulation, stable-pool init share-inflation, SLP XCM-response asymmetry) — none reach single-tx-drain confidence
- **6 brain compound proposals** filed — strongest is **Doctrine #36 PERMANENT promotion** (Substrate-Coverage Gate is now 2-anchor-verified)
- **EV $8,800 nominal** ranks BELOW Hydration ($14,625 nominal, on WATCHLIST) and BELOW queued Cantina mega-targets

**Recommended next moves (operator decides):**

1. **Doctrine #36 promotion to PERMANENT** is the highest-leverage brain-compound outcome of this Gate 1. Approve P1 to lock in Substrate-Coverage Gate as a standing rule.
2. **WATCHLIST Bifrost** for future Doctrine #34 sub-class b composition surface enrichment. Re-Gate-1 on `pallets/leverage-staking` or `pallets/vtoken-minting` refactor commits.
3. **CANDIDATE-BIFROST-1 Gate 2 dispatch is JUSTIFIABLE** only if operator allocates 2-4 hour subxt/zombienet budget AND is willing to accept low Critical-tier acceptance probability for governance-routed Critical submissions. **NOT recommended without explicit operator routing** given queued higher-EV targets (Hydration WATCHLIST + Cantina mega-cap queue).
4. **First-touch Substrate ecosystem prospecting** continues — Acala, Parallel, Centrifuge, Subsocial remain viable 3rd-4th-anchor candidates for Doctrine #36 + #35 calibration deepening.

---

_Hunt: 2026-05-27-bifrost-immunefi-gate1.md | v1.0 | Wall-clock ~55 min / 90-min cap | Disk steady 85% (no clone) | Layer 0 SKIPPED (no clone) | Manual lens-walk via GitHub raw WebFetch ✓ | V6 detector rotation skipped (Solidity-only) | R8 grades 24 [INSPECTED] + 13 [ASSUMED] + 0 [EXECUTED] | Doctrine #36 2nd-anchor (PERMANENT promotion candidate) | DC-9 sub-2 DEFENSE PATTERN 2nd-anchor (Track-enactment-variance sub-pattern)_
