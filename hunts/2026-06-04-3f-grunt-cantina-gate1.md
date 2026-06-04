# Gate 1 — 3F "Grunt" (Cantina, operator-asserted $250K) — RWA Leverage on Morpho

**Date:** 2026-06-04 · **Loop:** operator target override (Ogie msg 8144) · **Mode:** single-agent, no swarm, no qwen, bankr OFF · **Method:** public-repo clone + published-audit Gate-0 (Cantina scope + SUBMIT operator-gated behind KYC).

**Verdict: WATCHLIST-PARK (FORECLOSE-LEAN) — density-aware low EV. No net-new Critical surface survives Gate-0 dedup.** The only place a net-new Critical could plausibly live is the **post-audit private competition commit**, which is **OPERATOR-GATED** (Cantina KYC sign-in required to see canonical in-scope code + confirm the program is live).

---

## STEP 1 — PROFILE

- **Target:** 3F Labs "Grunt" — leveraged exposure to tokenized RWAs, built on Morpho Blue. Coordinates flash loans + bridge-facilitator capital + liquidations to build looped leverage inside a single RWA settlement cycle. ($4M seed, Maven 11 / F-Prime / GSR / Gate Ventures.)
- **Repo:** `github.com/3FLabs/grunt` — **PUBLIC**, Solidity 100%, `src/` 13,879 LOC across ~95 files, solc pinned `0.8.34`. HEAD `89cbfa01e5d14c34354ef715757bc84289cc2d04` (2026-05-29). 53 commits from 2025-11-05.
- **Platform:** Cantina (operator-asserted live $250K competition, "~2d old, 3 findings"). **STATUS PREFLIGHT = UNCONFIRMED on public surface** — the public `cantina.xyz/competitions` page shows only Morpho Midnight ($400K), Revert Finance, Reserve Governor. **No public 3F competition.** Either (a) KYC-gated/private competition (consistent with operator's ACCESS-GATE note), or (b) the "$250K Cantina" reference is the now-COMPLETED Cantina managed audit (report is in the repo), in which case there is **no live submission path** (Step-1 halt condition). **Operator must confirm via Cantina sign-in.** `[ASSUMED]` cap = $250K.
- **KYC:** YES (Cantina competition join + canonical scope + submit all require KYC'd researcher sign-in). Operator-gated.
- **Substrate:** EVM Solidity, mainnet-target (`foundry.toml` rpc `mainnet`). Deps: forge-std, **solady**, **`3FLabs/morpho-blue`** (Morpho Blue fork under 3F's own org).

### ⚠️ DECISIVE STEP-1 FINDING — the repo ships its own `audits/` directory

```
audits/ChainSecurity_3F_Grunt_Audit_2026-04.pdf       (90pg)
audits/ChainSecurity_3F_GruntFunds_Audit_2026-04.pdf  (37pg)
audits/Cantina_3F_Grunt_Audit_2026-05.pdf             (49pg)
audits/Cantina_3F_Grunt_FeeReview_2026-05-27.pdf      (6pg)
```

**3F Grunt is AUDIT-DENSE: 2 top-tier firms, 4 reports.** This is a hard **Doctrine #45** density flag and a **brief-vs-reality drift** (operator's "fresh / not-saturated / high-EV" framing missed the 2-firm pre-audit). The audit PDFs *are* the Gate-0 known-issues corpus.

---

## STEP 2 — BRAIN OVERLAP

Surface-fit is HIGH (every lens hits), but **for NET-NEW the overlap is DUP-saturated** — every lens-hit is an already-documented + corrected finding:

| Lens | 3F surface | Audit finding (already covered) | Status |
|---|---|---|---|
| DC-1 reentrancy / detector #166 cache-before-validate | `onRequestConsumed` maker callback; nonce-vs-sig order | Cantina **3.2.5** reentry; OfferReceiver nonce-before-verify | **FIXED PR177** + role-gated |
| DC-5 sig replay | RFQ signed offers (nonce + EIP-1271) | OfferReceiver replay guard | nonce updated pre-verify ✓ |
| CANDIDATE-I share inflation | PM ERC4626 shares; virtualShareOffset | Cantina **3.2.3**, ChainSec **7.8** (v2/v4/v5) | fixed / mitigated |
| Pattern E / DC-12 oracle staleness | RWA (USCC/Centrifuge/Pareto) valuation feeding Morpho | ChainSec **7.9 / 8.1**, Cantina **3.3.13** | CORRECTED |
| Freeze-of-funds **C2/C7** | setRepaid blockable; claim() loop brick | Cantina **3.1.1** (mint(0,0)), ChainSec **8.4**, Cantina **3.2.2** | 3.1.1/8.4 FIXED |
| Bridge-scope diversion (#1) | Facilitator over-repay drains LP; request rebind | ChainSec **8.2** drain-LP, Cantina **3.3.4** rebind, **3.2.1** | 8.2 CORRECTED (min/maxBalance) |
| Bad-debt socialization (#6) | zero-clipped NAV hides bad debt | Cantina **3.2.6** | **ACKNOWLEDGED (live)** |

Overlap score: **MEDIUM surface-fit / LOW net-new** (DUP-saturated). Per #45 → low p.

---

## STEP 3 — EV (density-aware, #45)

```
EV = cap × P(net-new Critical) × P(acc) × overlap_novelty_mult
   = $250K × 0.025 × 0.5 × 0.15  ≈  ~$470
```
- `P(net-new Critical) ≈ 0.02–0.03` — 2 firms, **0 remaining Critical**, all 6 brief-surfaces corrected = audit-dense LOW band (#45).
- `overlap_novelty_mult ≈ 0.15` — lenses hit but every hit is a DUP.
- **EV ~$470 ≪ $50K-Critical-effort threshold (by ~2 orders of magnitude).**

---

## STEP 4.5 — GATE-0 KNOWN-ISSUES CORPUS (from the shipped audit PDFs)

**Cantina (May 2026)** — review of commits `7056bb17`→`878a5042`, holistic `809002b8`. **48 issues: Critical 0 · High 1 (fixed) · Medium 7 (3 fixed / 4 ack) · Low 28.**
- 3.1.1 High `mint(0,0)` permanently delays `setRepaid()` → **Fixed `69a9a320`** (verified in HEAD: `mint` is `nonReentrant`, zero-auth early-return logic present).
- 3.2.1 Facility pays pulled principal after maturity vs PT holders — **Ack** ("set far in the future").
- 3.2.2 one blocked payout token bricks `claim()` loop — **Ack** (wUSCC caveat).
- 3.2.3 `virtualShareOffset=1` inflation — **Fixed PR167**.
- 3.2.4 PT/YT 4626 view inconsistency — **Fixed PR185**.
- 3.2.5 `onRequestConsumed` reentrancy — **Fixed PR177** (HEAD: `ReentrancyGuardTransient` + `nonReentrant` on consume/mint/pull/setRepaid; role-gated).
- 3.2.6 **zero-clipped NAV hides bad debt** — **ACKNOWLEDGED, no in-contract fix** (see escalation analysis below).
- 3.2.7 wUSCC Superstate-allowlist liquidation requirement — **Ack**.
- 3.3.x (28 Low) incl. 3.3.4 request-rebind, 3.3.10 no-slippage-at-commit, 3.3.13 oracle-revert-DoS, 3.3.25 executor-on-pooled-LP — mix fixed/ack.

**ChainSecurity Grunt (April 2026, 90pg)** — **Critical 0 · High 1 (corrected) · Medium 17 (16 corrected / 1 mitigated) · Low 48** (6 risk-accepted + 3 acknowledged, all Low). Key fund-loss findings all CORRECTED: 8.2 facilitator-overpay-drain-LP (→ `setRepaid(minBalance,maxBalance)`), 8.3 partial-preliq rounding, 8.4 setRepaid-permanent-block, 7.8 share-inflation (v5 mitigated), 7.9/8.1 RWA/Morpho staleness, 7.11 unbacked-YT-mint.
**ChainSecurity GruntFunds (April, 37pg)** — fund-adapter scope (Centrifuge/Pareto/USCC), same corrected disposition.

**Gate-0 result:** every candidate the brain lenses would generate maps to **KNOWN-NEGATE** (documented + fixed) or **KNOWN-ACK** (documented + accepted). Zero NO-MATCH-PROCEED candidates from the public HEAD.

---

## STEP 5 — SOURCE-READ (the one NOVEL-VARIANT-REVIEW candidate)

### 3.2.6 zero-clipped NAV (acknowledged, LIVE) — escalation attempt → NEGATE-to-Critical

`LibView.totalAssets()` sums per-sleeve `collateral.zeroFloorSub(debt)` — an underwater sleeve contributes 0, not negative. Used as share-price/fee/rebalance/intent-resolution source of truth. Auditors documented **5 fund-loss paths** (new-deposit subsidy, Morpho-LIF-bonus extraction, withdraw-vs-burn divergence, phantom performance-fee, rebalance loss-unhide). Rated **Medium**; "no clean in-contract fix… the real fix is operational" (pause Facility + abandon bad sleeve + monitoring). Confirmed live in HEAD `LibView.sol` (zeroFloorSub clipping intact). `[INSPECTED]`

**Escalation to Critical requires one of:** (a) attacker cheaply FORCES a sleeve underwater; (b) a path is unbounded / drains whole PM; (c) the operational mitigation is unreachable. **All three fail:**
- (a) Sleeves are Morpho positions on low-vol RWA collateral (USCC = Superstate short-T-bills); forcing underwater needs oracle/valuation manipulation — and ChainSec 7.9/8.1 + Cantina 3.3.13 (the forcing vectors) are **corrected**. `[INSPECTED]`
- (b) Every path is bounded by the bad-sleeve window magnitude (auditor examples: single-digit-unit transfers), not whole-PM drain. `[INSPECTED]`
- (c) Owner can pause + abandon the module; no attacker front-run of the pause shown. `[ASSUMED]`

→ **3.2.6 is correctly rated Medium. No clean Critical/High escalation.** (Operator rail: "Med $2,500 not worth it.")

### Reentrancy-guard config curiosity (resolved, non-load-bearing)
`Request._useTransientReentrancyGuardOnlyOnMainnet() => false` with dev comment "disable… on all networks." Solady semantics: `false` = transient guard active on **all** chains (comment is imprecise). Moot regardless: `consume`/`pullFunds` are `onlyOwnerOrRoles(_ROLE_CONSUMER)` / `onlyRoles(_ROLE_PULLER)` granted only to the Facility (Request.sol:168-169); the maker's callback can't re-enter any state-changer it lacks the role for. `[ASSUMED]` on solady (submodule not checked out in blobless clone), `[INSPECTED]` on role-gating.

### 5-Target Quality Checklist (all 5 mapped, all DEFENDED-or-DUP)
1. Withdraw/redeem → 3.2.6 (ack-Medium), burn/withdraw divergence (documented). 2. Liquidation/oracle → 7.9/8.1/3.3.13 (corrected) + preLiq rounding 8.3 (corrected). 3. Deposit/mint shares → 3.2.3/7.8 inflation (fixed/mitigated). 4. External calls → 3.2.5 callback (fixed+role-gated). 5. Admin/upgrade → beacon-admin 3.3.28, executor-on-pooled-LP 3.3.25 (documented).

---

## STEP 4 — QUEUE DECISION

**WATCHLIST-PARK (FORECLOSE-LEAN).** Density-aware EV ~$470. Two firms, 0 remaining Critical, every brief-surface corrected, the one live issue correctly Medium. Per #45 this is an audit-dense (now contest-combed) target — the opposite of the thin-pool edge.

**The ONLY net-new Critical opportunity is the post-audit private competition commit** (Doctrine #34 post-audit-composition-window / fix-introduced bugs). The public HEAD is the post-fix tree (audited SHAs `7056bb17/878a5042/809002b8/69a9a320` are **absent** from public history — squashed/re-published). The canonical in-scope competition commit + confirmation the program is live = **OPERATOR-GATED behind Cantina KYC**.

### 🔴 OPERATOR-GATED (FLAG, does not block the loop)
1. **Confirm the program is actually live** (vs the completed Cantina managed audit) + its **scope commit** — Cantina KYC sign-in. If FINISHED/no-submission-path → hard FORECLOSE.
2. If live + a LATER private commit: provide scope access → I run a focused **Gate-2 delta hunt** on post-audit code (the only +EV path here).
3. Any SUBMIT stays operator-gated regardless. (No submission exists — no confirmed finding.)

---

## BRAIN COMPOUND PROPOSALS
- **C-1 (NEW Step-1 heuristic):** "Repo ships its own `audits/` dir = self-declared audit-density → instant #45 demote + the PDFs ARE the Gate-0 corpus." Cut hours of dedup to minutes; reliable density signal independent of DeFiLlama's unreliable `audits` field (#45.2). → propose as Standing-Intake Step-1 addition / Doctrine #45.3.
- **C-2:** #45 4th anchor — 3F Grunt (original non-fork custom code, yet 2-firm/4-report audit-dense). Refines #46: "original (non-fork) ≠ thin"; original code can still be audit-dense. The thin-pool edge requires original **AND** audit-light.
- **C-3:** 3.2.6 zero-clipped-NAV = NEGATING-EXAMPLE for "acknowledged-Medium ≠ latent-Critical" — escalation needs attacker-forced precondition; if the forcing vector is itself a corrected finding, the ack-Medium stays Medium.
- **C-4:** Watchlist row — 3F Grunt WATCHLIST-PARK, revisit only on operator Cantina scope access (post-audit private commit).

_Gate-1 by Buzz · public-repo + published-audit method · submission + canonical-scope operator-gated._
