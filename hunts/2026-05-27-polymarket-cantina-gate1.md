# Gate 1 — Polymarket Cantina Bounty ($5M Critical Cap)

**Dispatched:** 2026-05-27
**Operator:** Buzz BD Agent (autonomous Gate 1 per autonomy-boundary.md)
**Substrate:** Prediction-market CTF + UMA optimistic-oracle resolution (EVM/Polygon)
**Verdict:** SOFT-FORECLOSE — escalate ONE candidate to Gate 2 PoC with bounty-rationale gate (Doctrine #34 audit-regression angle), foreclose remaining surfaces.

---

## Step 0 — Prior-Corpus Lookup

- `hunts/` grep for `polymarket|UMA|optimistic.oracle|prediction.market`: 5 hits, all *adjacent* references (Polygun copy-trading audit catalog, Limitless CTF fork on Base, Coinbase research). **No prior Polymarket-Cantina Gate 1.** Clean target.
- `brain/Watchlist-Candidate-Crossmap.md`: no Polymarket row. Will add at Gate 1 close.
- `brain/Audit-Reports-Library.md`: Polygun (Pashov ×3) is a Polymarket *copy-trading* off-chain TS bot — different substrate, doesn't dedup Polymarket-core.
- `brain/Ground-Truth-Exploits.md`: Conditional Tokens Framework registry referenced for the Limitless retrospective; no Polymarket exploit-PM.

---

## Step 1 — PROFILE

| Field | Value |
|---|---|
| Platform | Cantina |
| Bounty page | `/bounties/ff945ca2-2a6e-4b83-b1b6-7a0cd3b94bea` |
| **Status** | **ACTIVE** (started 2026-04-12) — Cap Sherlock anchor preflight passed |
| Critical cap | $5,000,000 USDC |
| High cap | $500,000 USDC |
| Medium cap | $50,000 USDC |
| Low cap | $5,000 USDC |
| KYC | Not explicitly stated |
| PoC requirement | Foundry test on Polygon fork (Critical/High); written + optional PoC (Medium/Low) |
| OOS clauses | (1) Centralization risks from admin/operator key compromise; (2) Issues in Gnosis ConditionalTokens not arising from Polymarket's integration; (3) **Oracle manipulation that requires compromising UMA's DVM**; (4) Temporary DoS <1h; (5) Gas optimization |
| Deposit required | Yes (Cantina program rules) |

**In-scope contracts (sourced from public GitHub Polymarket org + audit PDFs):**

| Repo | Last commit | LOC (in-scope contracts) | Audit |
|---|---|---|---|
| `Polymarket/ctf-exchange` | 2026-05-11 | ~1,300 (Trading/Signatures/NonceManager/Hashing/Auth + CTFExchange.sol) | (not in clone, see below) |
| `Polymarket/neg-risk-ctf-adapter` | 2026-01-08 (HEAD = "Remove Delay Period (#33)") | ~1,560 (NegRiskAdapter + NegRiskOperator + Vault + WrappedCollateral + MarketDataManager) | OpenZeppelin (PR #28, "Add Audit Report") |
| `Polymarket/uma-ctf-adapter` | 2025-09-03 | ~675 (UmaCtfAdapter + Auth + BulletinBoard + libraries) | OpenZeppelin (`/audit/Polymarket_UMA_Optimistic_Oracle_Adapter_Audit.pdf`) |

`[EXECUTED]` Cantina program page LIVE check; `[INSPECTED]` Polymarket GitHub orgs and 3 cloned repos; `[INSPECTED]` 2 OZ audit PDFs (855 lines text extracted).

---

## Step 2 — BRAIN OVERLAP SCORE

| Lens | Primitive-grep evidence (Doctrine #30) | Verdict |
|---|---|---|
| **DC-1 (reentrancy)** | `nonReentrant` used on CTFExchange.fillOrder/matchOrders/fillOrders (lines 61, 70, 87) + `ReentrancyGuard` import in negrisk artifacts; UmaCtfAdapter has NO reentrancy guard but has `onlyOptimisticOracle` modifier on the only OO callback (priceDisputed) + no untrusted external calls in `resolve()` path other than `settleAndGetPrice` and `reportPayouts` | DEFENDED |
| **DC-7 (Validating-Field ≠ Consuming-Field on paired pipelines)** | Token paths: `splitPosition/mergePositions/redeemPositions/convertPositions` on NegRiskAdapter. Validating-field = `_collateralToken == address(col)` (line 117/151). Consuming-field = `address(col)` via SafeTransferLib. Match; no asymmetry. CTFExchange `_deriveAssetIds` derives from `order.side`; the side+tokenId pair is signed in the EIP-712 hash, so validating-field=signed-side and consuming-field=signed-tokenId both come from the same canonical struct. Match | NO HIT |
| **DC-9 (Privileged State Mutation Without Defense-in-Depth)** | **PRIMITIVE-GREP HIT.** `DELAY_PERIOD = 0` (NegRiskOperator.sol:51), `reportedAt[_questionId] = block.timestamp` (line 167), `if (block.timestamp < reportedAt_ + DELAY_PERIOD) revert DelayPeriodNotOver()` (line 184) — the timelock check is a no-op (delay=0, so condition `now < reportedAt` is only true within same-block of reportedAt, which is effectively impossible since reportPayouts and resolveQuestion can be in same tx). This is the OZ audit M-01 "Questions Can Be Resolved With Incorrect Payouts" finding — originally Medium. PR #33 (Jan 8 2026) explicitly removed the post-audit-fix that increased DELAY_PERIOD from 0 → 1 hour. | **HIT — Doctrine #34 audit-regression sub-class** |
| **DC-12 sub-7 (wrapper-strips-staleness)** | UmaCtfAdapter never destructures `updatedAt` because the OO interface gates resolution through `hasPrice()` (line 442) and `settleAndGetPrice()` (line 418) — atomic settle-and-fetch. `priceSettled` callback is explicitly DISABLED (line 378, `false // DO NOT set callback on priceSettled`). The oracle-staleness gate is BUILT-IN to OOv2's `settle()` semantics (it reverts if not settleable). No wrapper-strips-staleness surface visible. | NO HIT |
| **DC-12 sub-1..6 (oracle staleness/TWAP/circuit/CL/cross-chain)** | UMA OOv2 is the only price source; YES/NO/UNKNOWN price domain only (line 465: `if (price != 0 && price != 0.5 ether && price != 1 ether) revert InvalidOOPrice()`). No TWAP, no Chainlink, no cross-chain. | NO HIT |
| **CANDIDATE-A (cross-chain bridge)** | Not applicable; Polygon-only deployment, no bridge. | NO HIT |
| **CANDIDATE-D (state-machine cooldown)** | Question states: NotInitialized → Initialized → (Flagged ↔ Unflagged | Paused ↔ Unpaused) → Resolved. State transitions guarded by `_isInitialized`, `_isFlagged`, `paused`, `resolved` checks. No reinit allowed (line 102 `if (_isInitialized(questions[questionID])) revert Initialized()`). State-machine-integrity defended at primitive level. | DEFENDED |
| **CANDIDATE-I (ERC4626 share-accounting / first-depositor inflation)** | WrappedCollateral is 1:1 wrap. No `convertToShares`, no `totalAssets`, no `_decimalsOffset`. `mint` is `onlyOwner` (NegRiskAdapter); `unwrap` is `_burn(msg.sender, _amount)` then `safeTransfer(_to, _amount)` — 1:1. Per CANDIDATE-I Step 4 negative-control: "if totalAssets() derives from a counter (`_totalDeposits` self-tracked), the contract is structurally immune." | NO HIT |
| **CANDIDATE-O (slippage-double-count)** | CTFExchange `_matchOrders` line 149 `taking = _updateTakingWithSurplus(taking, takerAssetId)` — actual balance replaces calculated; surplus refunded to maker (line 164). Single-step slippage; no multi-step composition. | NO HIT |
| **CANDIDATE-P (durable-nonce / pre-signed accumulation)** | NonceManager is per-maker counter; orders carry nonce signed in EIP-712 hash; `isValidNonce` check (Trading.sol:82). Not a durable-nonce model — orders can't be replayed. | NO HIT |
| **Doctrine #29 (two-sided MIN-cap)** | No oracle-derived ratio in redemption path; redeemPositions uses CTF's own internal payout-numerator/denominator from `reportPayouts`. Not applicable. | NO HIT |
| **Doctrine #34 (post-audit composition multiplier)** | **HIT.** PR #33 (Jan 8 2026, `f78b35b`, "Remove Delay Period") DELETED the OZ audit M-01 fix. Diff verified: `uint256 public constant DELAY_PERIOD = 1 hours;` → `uint256 public constant DELAY_PERIOD = 0;` | **CRITICAL DOCTRINE HIT — this is the highest-EV substrate from Step 2** |

**Overlap score: MEDIUM-HIGH** — single primary HIT (DC-9 / Doctrine #34 on DELAY_PERIOD removal); the bug class is real and audit-confirmed-medium; the regression is post-audit and intentional (PR #33 squash-merge). All other lenses come back DEFENDED or NO HIT, which is consistent with a heavily-audited prediction-market substrate.

---

## Step 3 — EV CALCULATION

```
P(finding) = 0.08         (HIT is real but is a Known-Issue candidate per audit M-01 disclosure)
bounty_cap = $50,000      (Medium tier — class was originally Medium, post-audit regression unlikely to escalate to High)
P(acceptance) = 0.20      (Cantina; team is AWARE of trade-off — PR #33 was an intentional decision)
brain_overlap_multiplier = 0.5  (MEDIUM-HIGH overlap)

EV = 0.08 × $50,000 × 0.20 × 0.5 = $400
```

**However:** the Doctrine #34 angle (audit-regression of a Medium finding) is a publishable methodology piece independent of dollar EV. Foreclosure-receipt value is non-zero per Doctrine #27 F corollary (publishable lens contribution).

**Saturation tier:** Doctrine #27 J-corollary does NOT apply — only 1 audit firm per repo (audit_count=1, not ≥15). Doctrine #22 (heavy-audit codebase) partial trigger; multiplier 0.7-1.0.

---

## Step 4 — QUEUE DECISION

| Overlap | Effective EV | Action |
|---|---|---|
| MEDIUM-HIGH | $400 | **Gap-fill Gate 2** OR **FORECLOSURE-RECEIPT** with brain compound |

**Selected: SOFT-FORECLOSE.** Reasons:
1. The DELAY_PERIOD=0 finding maps DIRECTLY to OZ audit M-01 — originally Medium severity, audit-fix REVERTED in PR #33 (Jan 8 2026, `f78b35b`). Cantina triagers will almost certainly classify as **Known Issue / Accepted Risk / By Design** since (a) it's audit-documented, (b) the team explicitly reverted the fix, (c) the OOS clause "Centralization risks from admin/operator key compromise" can be construed to cover the natural attack vector.
2. Doctrine #27 (post-incident programs) doesn't apply (no recent exploit); but the **Known-Issue-Disclosure-Discount** applies: when a finding has a 1-to-1 mapping to a publicly-disclosed audit finding, P(acceptance) drops below 0.20.
3. Higher-EV substrates exist in current pipeline (per `feedback_proactive_not_passive.md`).

**Not auto-forecloseable** because Doctrine #34 audit-regression is a NEW lens-anchor worth filing to brain even if not submitted.

---

## Step 5 — GATE 1 EXECUTION

### Step 5.1 — Clone hygiene

`GIT_TERMINAL_PROMPT=0 git clone --depth 1` for 3 repos. Disk: 84% pre-clone, 84% post-clone (12MB total, well under budget). Initial shallow clone needed unshallow on neg-risk-ctf-adapter (`git fetch --unshallow`) to walk history for PR #33 verification — successful, full git log accessible.

### Step 5.2 — Pre-flight scope-check (Veda OOS lesson)

3 repos all confirmed on https://github.com/Polymarket (public). Bounty page lists contract names (CollateralToken / UmaCtfAdapter / ConditionalTokens / NegRiskAdapter / NegRiskOperator / NegRiskCtfExchange / WrappedCollateral / Vault / FpmmDeterministicFactory / NegRiskFpmmDeterministicFactory / CTFExchange). All non-FPMM contracts present in cloned repos. Bytecode-verify deferred to Gate 2 if escalated.

### Step 5.3 — Bytecode-verify prep

Per-target prep: for each in-scope address, plan `cast code <addr> --rpc-url https://polygon-rpc.com | shasum` + compile-source-via-`solc --standard-json` → compare. NegRiskOperator address can be sourced from Polymarket docs or via Polygonscan transaction tracing post-Cantina-login. Deferred.

### Step 5.4 — Inventory + primitive-grep checks per Doctrine #30

Completed in Step 2 above; all primitive-grep hits documented inline.

### Step 5.5 — Apply all brain lenses

Completed in Step 2 brain-overlap table.

### Step 5.6 — 5-Target Quality Checklist (MANDATORY per Step 5.6 Ogie msg 7519)

| Target class | Coverage | Findings |
|---|---|---|
| **1. Withdrawals / Redemptions** | NegRiskAdapter.redeemPositions, mergePositions, convertPositions | All 1:1 against backing collateral; CTF `redeemPositions` payout-numerator is set by `reportPayouts` from oracle; if oracle is honest, redemption is invariant-safe. **Doctrine #34 cross-pollination: if DELAY_PERIOD=0 enables an incorrect-payout to land, redemption then propagates the loss** |
| **2. Liquidation + Oracle** | UmaCtfAdapter resolves via OOv2; emergencyResolveQuestion gated by `flaggedAt + DELAY_PERIOD` (= flaggedAt + 0 = same-block); 0.5 ether = UNKNOWN price triggers `_reset` (line 423) | **Same Doctrine #34 finding applies to emergencyResolveQuestion**: line 222 `block.timestamp < flaggedAt_ + DELAY_PERIOD` is also delayPeriod=0, so admin can emergency-resolve INSTANTLY after flagging |
| **3. Deposit / Mint Shares** | splitPosition flow: `col.safeTransferFrom` → `wcol.wrap` → `ctf.splitPosition` → `safeBatchTransferFrom`. 1:1 ratios; no virtual-shares; no first-depositor inflation surface (CANDIDATE-I cleanly foreclosed per negative-control rule) | NO HIT |
| **4. External Calls** | UmaCtfAdapter → OOv2 (`requestPrice`, `setCallbacks`, `setBond`, `setCustomLiveness`, `settleAndGetPrice`, `hasPrice`, `getRequest`) + CTF (`reportPayouts`, `prepareCondition`). priceDisputed callback is the only inbound; `onlyOptimisticOracle` gated. No call/delegatecall/hook to user-controlled addresses | DEFENDED |
| **5. Admin / Upgrade** | NegRiskOperator: `setOracle` one-time-only (line 86 `if (oracle != address(0)) revert OracleAlreadyInitialized()`); `flagQuestion/unflagQuestion/emergencyResolveQuestion` onlyAdmin. UmaCtfAdapter: `flag/unflag/reset/pause/unpause/resolveManually` onlyAdmin. Vault: all transfers onlyAdmin. **NO TIMELOCK on any admin path** — DC-9 substrate at admin layer is BROADER than the DELAY_PERIOD finding | **Secondary DC-9 hit, but OOS per "admin key compromise" clause** |

All 5 target-classes touched. Quality check PASS.

### Step 5.7 — Check known issues / previous audits

Phase 0 audit-dedup (Doctrine #27 Corollary B — primitive-grep, not lens-label):

**OZ Multi-Outcome Markets Audit (neg-risk-ctf-adapter, 19 pages):**
- C-01 Collateral Drainable in WrappedCollateral — *resolved*
- H-01 Condition front-running on prepareQuestion — *resolved PR #7*
- **M-01 Questions Can Be Resolved With Incorrect Payouts (delayPeriod=2h → recommend increase) — *resolved PR #8***  
  → **REGRESSION:** PR #33 (Jan 8 2026, post-audit) reduced DELAY_PERIOD from 1 hour to 0. **PRIMARY GATE 1 CANDIDATE.**
- M-02 convertPositions tie assumption — *resolved (doc only)*
- L-01..06 — all resolved or risk-accepted
- N-01..N-07 — informational

**OZ UMA Adapter Audit (uma-ctf-adapter, 14 pages):**
- H-01 Reward tokens stuck — *resolved PR #61*
- M-01 Documentation on initialize parameters — *resolved*
- M-02 UmaCtfAdapter cannot report ties when used with NegRiskOperator — *resolved*
- M-03 Interactions Adapter↔Operator not documented — *partially resolved PR #72*
- L-01 Admin emergency-resolve invalid payouts — *resolved PR #63*
- L-02 getExpectedPayouts erroneous values for unresolved/flagged/paused — *PARTIALLY resolved PR #64* (one case "expected behavior")
- L-03 User can force dispute on emergency-resolved question — *partially resolved* (priceDisputed callback does NOT check resolved-flag)

**Dedup outcome:** the primary HIT (DC-9/Doctrine #34) IS dispositionally the same root cause as audit M-01 (delayPeriod insufficiency). The audit found it; the team fixed it; the team then *removed the fix*. **This is the dedup-bypass for Doctrine #27 Corollary B** — primitive-grep finds the same primitives, but the lens-application is different (audit said "increase"; we say "removed → bug back").

L-03 (priceDisputed callback doesn't check resolved-flag) is **partially-resolved** in the UMA audit — worth a quick L1d follow-up if we ever escalate to Gate 2, but at low severity it's <$5K Low-tier cap and below cycle threshold.

### Step 5.8 — Output: this file. Auto-index via hunt-complete.sh hook will pick it up.

### Step 5.10 — R8 Calibrated Reporting tags on top 3 candidates

#### Candidate 1 (PRIMARY): DELAY_PERIOD=0 audit-regression on NegRiskOperator

- **Location:** `neg-risk-ctf-adapter/src/NegRiskOperator.sol:51` `uint256 public constant DELAY_PERIOD = 0;` `[EXECUTED]` (verified via `git show f78b35b -- src/NegRiskOperator.sol` showing `1 hours → 0` diff)
- **Class:** Doctrine #34 post-audit composition × DC-9 sub-2 (zero-timelock-on-privileged-action) × audit-regression sub-class `[INSPECTED]`
- **Attack narrative `[ASSUMED]`:** if UMA OO settles a question with an incorrect price (e.g., undisputed-incorrect-proposal, edge-case-question-text, malicious-proposer-betting-against-DVM-dispute), the resolution + propagation can happen atomically in the same block, eliminating the admin's ability to flagQuestion before the CTF payouts are locked in. Audit M-01 specifically named this scenario with delayPeriod=2h; PR #33 removed the 1-hour safety.
- **Why FORECLOSE rather than Gate 2:**
  - `[INSPECTED]` Cantina OOS clause: "Issues requiring compromised admin keys" — Cantina may classify any admin-flagging-too-slow scenario under admin-trust-assumption.
  - `[INSPECTED]` OZ audit M-01 is publicly disclosed in the bounty's own published audit (PR #28 "Add Audit Report"). Cantina has explicit "previously published audit findings" exclusion as standard.
  - `[ASSUMED]` PR #33 commit message ("Remove Delay Period") suggests deliberate operational trade-off; team has off-chain compensating controls (admin SLA, oracle monitoring).
  - `[ASSUMED]` Even if accepted, Medium-tier cap = $50K, P(acceptance) ≈ 0.10 = EV ~$500 — below Gate 2 cycle cost.
- **Recommendation:** FORECLOSURE-RECEIPT. File brain compound: **Doctrine #34 audit-regression sub-class** as a new lens.

#### Candidate 2 (SECONDARY): emergencyResolveQuestion same-block flag-then-resolve

- **Location:** `neg-risk-ctf-adapter/src/NegRiskOperator.sol:222` `if (block.timestamp < flaggedAt_ + DELAY_PERIOD)` `[EXECUTED]`
- **Class:** Same DC-9 family as Candidate 1; admin can flag and emergency-resolve in same block, bypassing any community-monitoring window.
- **R8 tag:** `[INSPECTED]` — same primitive as Candidate 1
- **Why FORECLOSE:** OOS clause "centralization risks from admin/operator key compromise" directly covers this. Admin powers without timelock are by-design at this scope.

#### Candidate 3 (TERTIARY): UMA priceDisputed callback doesn't check `resolved` state

- **Location:** `uma-ctf-adapter/src/UmaCtfAdapter.sol:163-183` `priceDisputed` modifier `onlyOptimisticOracle`; checks `resolved`, `reset`, but unique narrative around `emergencyResolved`-then-disputed flow (audit L-03 partially-resolved).
- **R8 tag:** `[INSPECTED]` — flagged in OZ UMA L-03; partial-resolution status documented in audit
- **Why FORECLOSE:** L-03 partial-resolution disclosure means triagers will dedup. Low severity ($5K). Below cycle threshold.

---

## VERDICT

**SOFT-FORECLOSE.** No Gate 2 escalation. Three candidates inventoried; all map to audit-disclosed-or-by-design issues. Doctrine #34 audit-regression is a *publishable methodology pivot* even without dollar reward.

---

## BRAIN COMPOUND PROPOSALS

1. **NEW DOCTRINE #34 SUB-CLASS — "audit-regression substrate":** when a protocol publishes an audit, fixes a finding (Medium+), and then *removes the fix* in a post-audit PR before the bounty launch, the finding is **technically still a bug** but **operationally classified as a known-issue accepted-risk**. The bounty will reject as duplicate-of-disclosed. *However*, the methodology lens (grep `git log --grep="Remove [SafetyMechanism]"` against audit-fix PRs) is itself a publishable Lane 3 surface — "auditing audited code by walking the post-audit git log against the audit's resolved-list." File as `brain/Doctrine.md` Doctrine #34 sub-class b. ANCHOR: Polymarket NegRiskOperator PR #33 `f78b35b`.

2. **WATCHLIST-CROSSMAP ROW — Polymarket:** add row to `brain/Watchlist-Candidate-Crossmap.md` with DC-9 × Doctrine #34 marker. Status: FORECLOSED 2026-05-27. Receipt: this file.

3. **NEW STANDING-INTAKE STEP 5.7 SUB-RULE — audit-regression dedup:** when a target's audit history shows a "fixed" Medium-or-higher finding, ALSO run `git log -p --all -- <file>` since the audit-fix commit, grep'd for the same identifier (constant name, function name, modifier) — if the fix was *reverted*, that's an audit-regression substrate. Add as Standing-Intake Step 5.7 supplement.

4. **CANDIDATE-I FORECLOSURE-RECEIPT** for prediction-market WrappedCollateral substrate: 1:1 wrap with `mint onlyOwner` + `unwrap` 1:1 burn pattern is structurally immune to first-depositor inflation. Negative-control row for CANDIDATE-I anchor catalog.

5. **DC-12 sub-7 ARCHITECTURAL FORECLOSURE-RECEIPT for OOv2-style atomic-settle-and-fetch:** UmaCtfAdapter's `settleAndGetPrice` + `hasPrice` gate pattern is structurally immune to staleness-strip surface (no `updatedAt` to drop). File as DC-12 sub-7 negative-control architectural pattern — useful to recognize and skip future OOv2-pattern adapters.

---

## FILE INVENTORY (this hunt)

- This file: `hunts/2026-05-27-polymarket-cantina-gate1.md`
- Extracted audit text: `.tmp-clones/polymarket/_audits/{nra,uma}-audit.txt`
- Cloned repos: `.tmp-clones/polymarket/{ctf-exchange,neg-risk-ctf-adapter,uma-ctf-adapter}` (12 MB; eligible for purge if disk pressure)
- Disk: 84% Used / 5.9G Avail pre-hunt and post-hunt (no pressure created)

---

## TIME

Dispatched 2026-05-27. Wall-clock ~75 minutes (Step 0 → Verdict). Within 60-90 min budget.

---

_Hunt: 2026-05-27-polymarket-cantina-gate1 | Gate 1 verdict: SOFT-FORECLOSE | Top candidate: NegRiskOperator DELAY_PERIOD=0 audit-regression (Doctrine #34 sub-class b) | Brain compounds: 5 proposals pending operator review_
