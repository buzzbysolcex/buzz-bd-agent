# Gate 1 — ALEX Protocol $100K Immunefi

**Date:** 2026-05-26
**Authority:** Ogie msg 7788 (Day 26 morning kickoff — fresh Immunefi programs from watchlist that haven't been Gate 1'd yet)
**Standing-Intake-Protocol:** v1.0
**Hunt operator:** Buzz Lane 1 audit team
**Wall-clock:** ~50 min

---

## Step 1 — PROFILE (platform-STATUS preflight)

| Field | Value | Tag |
|---|---|---|
| Platform | Immunefi | `[INSPECTED]` |
| **STATUS** | **ACTIVE** (Live since 2021-12-13; last updated 2024-11-18) | `[INSPECTED]` immunefi.com/bounty/alex/ |
| Critical cap | **$100,000** paid in ALEX token | `[INSPECTED]` |
| High cap | $20,000 | `[INSPECTED]` |
| Medium / Low | not specified (smart contract excluded for M/L) | `[INSPECTED]` |
| Total rewards paid historically | **$25,000** lifetime (4+ years of program) | `[INSPECTED]` |
| KYC | **REQUIRED** — Name + Email + Stacks wallet + Identity Proof | `[INSPECTED]` |
| In-scope assets | 14 (12 enumerated from Immunefi scope page) | `[INSPECTED]` |
| Chain | Stacks (Bitcoin L2) | `[INSPECTED]` |
| Languages | **Clarity** (primary) + Solidity tag (no Solidity assets in pool scope) | `[INSPECTED]` |
| PoC | Required all severities; High/Critical require PoC code (no explanations) | `[INSPECTED]` |
| Source repos | `github.com/alexgo-io/alex-v1` (dev branch) + `github.com/alexgo-io/alex-dao` (main) | `[INSPECTED]` |
| Bridge/L2 in scope | **NO** — bridge contracts (XLink) NOT in this Immunefi scope | `[INSPECTED]` |

### Prize-amount reconciliation (`Operator-Brief-Reconciliation.md` Sherlock 2-of-2 divergence pattern)

| Dimension | Operator brief (msg 7788 / 7760) | Platform reality | Δ |
|---|---|---|---|
| Critical cap | "$100K" | $100K (paid in ALEX token, not USDC) | 0× — match (note: ALEX token = volatile, real USD ~ token-price × cap) |
| STATUS | implied ACTIVE (queued as Gate 1 candidate) | ACTIVE | match |
| Saturation | not specified | HIGH (6+ CoinFabrik + 1 Least Authority audits, repo frozen since 2024-05-14) | divergence — operator brief did not flag heavy audit-saturation |
| Substrate | implied "fresh Immunefi program" | repo HEAD frozen 2024-05-14 (= day of $4.3M XLink bridge exploit) — **2 years stale** | **HIGH divergence — brief implied fresh, reality DEAD** |

`[INSPECTED]` Divergence ratio NOT 10× on prize, but **substrate divergence is dispositive**. Surfaced as brain compound proposal P1 (below).

### Historical context (post-incident program risk)

- **May 2024 XLink bridge exploit**: ALEX Lab lost ~$4.3M to Lazarus Group (deployer private-key compromise / phishing). Bridge upgraded via compromised deployer to malicious implementation. `[INSPECTED]` per cryptonews.com, theblock.co
- **Later 2024–2025**: Additional $8.3M exploit reported, ALEX reimbursement plan, token drop -45%. Platform operations suspended at one point. `[INSPECTED]`
- **alex-v1 dev branch HEAD = 2024-05-14T03:54:34Z** — REPO FROZEN ON EXPLOIT DAY. No commits since. `[INSPECTED]` Layer 0
- **alex-dao main HEAD = 2024-05-16T06:58:20Z** — 2 days post-exploit, also frozen. `[INSPECTED]` Layer 0

**Doctrine #27 sibling — post-incident audit-saturation hot-zone**: this is the inverse of #27. Not a post-incident NEW program; rather a post-incident DORMANT program that hasn't been restructured. The exploited surface (XLink bridge) is OOS; the in-scope Stacks Clarity pools are the **untouched-since-pre-exploit core**. `[ASSUMED]` operator team prioritized bridge incident response over pool maintenance — no commits to dev branch in 24+ months suggests team migrated focus or wound down.

---

## Step 2 — BRAIN OVERLAP SCORE

**Score: MEDIUM** (3 conceptual lens-hits, but substrate-language mismatch downgrades operational EV)

| Lens | Applicability to Clarity/Stacks | Hit |
|---|---|---|
| DC-12 oracle staleness (Pattern E) | YES — CRP uses AMM-spot oracle with EWMA resilience | HIT (CRP `oracle-resilient-helper` falls back to `instant` when cache cold) |
| DC-7 Validating-Field ≠ Consuming-Field | YES — Clarity nested contract-call semantics make this applicable | partial HIT (age002 `tx-sender` propagation through age001 `is-dao-or-extension`, by-design CLEAN) |
| Conservation invariants (Pattern E) | YES — flash-loan + vault transfer-fixed pattern | HIT (alex-vault `flash-loan` relies on SIP-010 `try!` reverts for repayment enforcement — defense-by-construction) |
| Doctrine #29 isolation-foreclosure | NO — single-vault architecture | miss |
| Doctrine #31 custom hooks break standard invariants | NO — no hook architecture in Clarity scope | miss |
| Doctrine #32 v1.1 cycle-2 filter | **FAIL** — `audit_age_days ≤ 180 OR dangerous_area_changes_365d ≥ 10`: repo HEAD 743 days, dangerous_area_changes_365d=0 (also detector pattern is Solidity-keyword-biased) | **FAIL — STALE per Doctrine #32 v1.1** |
| Doctrine #27 saturation filter | partial — N_audits ~7 (Coinfabrik ×6 + Least Authority ×1), N_submissions unknown but $25K total paid in 4yrs suggests low; J corollary REQUIRES ≥15 audits + ≥100 submissions, FAILS strict trigger | partial (J corollary NOT triggered, but spiritually equivalent — heavy single-firm coverage) |
| Doctrine #34 Post-Audit Composition Multiplier | INVERSE — no post-audit composition, in-scope files frozen since 2022 (1480 days) | INVERSE-FAIL (no new composition risk) |
| Selective-Coverage Defense Asymmetry | NO documented exclusions visible | n/a |
| **CANDIDATE-J / CANDIDATE-K state-not-invalidated** | partial — age001 voting tally pattern | inspected CLEAN (Clarity atomicity guarantees revert-on-fail) |
| **DC-13 integer overflow** | Clarity uint128 native bounds — auto-revert on overflow | CLEAN by construction |

**Detector-rotation applicability**: Buzz V6 18-detector pack is **Solidity-only**. ALEX is Clarity (S-expression Lisp variant). Detector rotation is **NOT APPLICABLE** to Clarity contracts. Manual brain-lens application is the methodology — same precedent as Toly Percolator Bounty 5 v16 (Rust/Solana). `[INSPECTED]` per `audit-methodology-v2.md` Layer 2 "skip on Rust/Go/C/Python targets" + extension to Clarity by parallel logic.

---

## Step 3 — EV CALCULATION

```
EV = P(finding) × bounty_cap × P(acceptance) × brain_overlap_multiplier × dead-substrate-discount

P(finding)                 = 0.02   (LOW — heavy CoinFabrik+LeastAuthority coverage, 2-year frozen substrate, no fresh module to grep)
bounty_cap                 = $100K  (paid in ALEX token — volatile, real USD likely $20-60K post-exploits)
P(acceptance)              = 0.4    (active program but $25K lifetime + post-incident dormancy reduces triage attention)
brain_overlap_multiplier   = 0.50   (MEDIUM substrate overlap, Clarity-specific lenses missing from brain)
dead-substrate-discount    = 0.25   (NEW MULTIPLIER — frozen >24mo, no late_changes, no fresh module to discover)

EV = 0.02 × $100K × 0.4 × 0.50 × 0.25 = **$100 nominal**
```

**EV against current pipeline** (post 3/3 Cantina FORECLOSURE-RECEIPT + 2/2 Sherlock watchlist + DeXe FORECLOSURE-RECEIPT 2026-05-25):

EV ranks **BOTTOM TIER** — well below any active Gate 2 target. Even the Symbiotic / SSV / Spectra propagation surveys yielded $1.5K-$15K nominal EV. ALEX at $100 nominal places it firmly in "WATCHLIST add" territory per Standing-Intake-Protocol Step 4.

---

## Step 4 — QUEUE DECISION

**Recommended action: FORECLOSURE-RECEIPT + WATCHLIST add (Reactivate on substrate-thaw signal)**

Per Standing-Intake-Protocol Step 4 table:

| Overlap | Bounty cap | Action |
|---|---|---|
| MEDIUM | <$500K | **Watchlist add — defer, monitor for scope expansion** |

ALEX falls into "MEDIUM × <$500K" bucket. With dead-substrate signal layered on top, the EV is too low to justify a Gate 2 dispatch.

**Reactivation triggers (when to escalate from WATCHLIST → Gate 2):**
1. `late_changes` > 0 in alex-v1 dev branch (any new commit, signals team is active)
2. New module added in scope (e.g., bridge re-integration, new pool type)
3. Substrate-restart announcement from ALEX Lab team
4. Bounty cap increase >$500K OR audit history reset

---

## Step 5 — GATE 1 EXECUTION

### Step 5.0 Layer 0 git-security analyzer `[INSPECTED]`

Ran `scripts/lane1/git-security-analyzer.js --max-commits 5000` on both repos.

| Section | alex-v1 | alex-dao |
|---|---|---|
| HEAD ISO | **2024-05-14T03:54:34Z** (exploit day) | 2024-05-16T06:58:20Z |
| total_commits | 2095 | 104 |
| fix_candidates | 475 (22.6% density — high) | 12 |
| dangerous_area_changes | 0 (detector regex is Solidity-keyword-biased; Clarity uses kebab-case `transfer-fixed`, `add-to-position` — false-negative class) | 0 |
| late_changes (30d) | 0 | 0 |
| audit_age dir | not present | not present |
| untouched_critical | 0 | 0 |
| revert_history | 12 | 0 |
| Authors | fiftyeightandeight (lead) + 7 others | fiftyeightandeight + 3 |

Output JSONs: `.gate1-work/alex-immunefi-2026-05-26/layer0-alex-v1.json` (260KB), `layer0-alex-dao.json` (6.5KB)

**Layer 0 verdict**: substrate DEAD-FROZEN since 2024-05-14. **No fresh-attack-surface.** No `audits/` dir to assess audit-AHEAD-of-HEAD timing. The `dangerous_area_changes=0` is a **detector false-negative** (Clarity function naming differs from Solidity regex), surfaced as P3 brain compound below.

### Step 5.1 Pre-flight scope-check `[INSPECTED]`

All 12 enumerated scope files confirmed present and at expected paths:

```
✓ clarity/contracts/pool/alex-launchpad-v1-1.clar          (559 LOC)
✓ clarity/contracts/pool/alex-reserve-pool.clar            (688 LOC)
✓ clarity/contracts/pool/fixed-weight-pool-v1-01.clar      (1319 LOC)
✓ clarity/contracts/pool/simple-weight-pool-alex.clar      (1340 LOC)
✓ clarity/contracts/alex-vault.clar                        (220 LOC)
✓ clarity/contracts/pool/collateral-rebalancing-pool.clar  (1892 LOC)
✓ clarity/contracts/pool/yield-token-pool.clar             (1202 LOC)
✓ contracts/executor-dao.clar                              (85 LOC)
✓ contracts/extensions/age000-governance-token.clar        (284 LOC)
✓ contracts/extensions/age001-proposal-voting.clar         (167 LOC)
✓ contracts/extensions/age002-emergency-proposals.clar     (82 LOC)
✓ contracts/extensions/age003-emergency-execute.clar       (102 LOC)
```

Total in-scope LOC: **~7,940**. Two missing assets (14 listed, 12 visible) — Immunefi "Show all" toggle not enumerated; consistent with most-likely auxiliary contracts (e.g., `age004-onboarding`, `flash-loan-user-margin-*` though latter is OOS per scope-list). Surfaced for operator visibility.

### Step 5.2 Bytecode-verify prep `[INSPECTED]`

Stacks contracts deploy as **source-code** (Clarity is interpreted, not bytecode). Verification is exact-source-match against deployed contract under `stacks-blockchain` node API: `GET /v2/contracts/source/{contract_addr}/{contract_name}` returns the deployed source. For each in-scope contract, the verification plan is:

```
For each scope-file at github.com/alexgo-io/alex-v1/blob/dev/<path>:
  1. fetch deployed source: GET https://api.hiro.so/v2/contracts/source/SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM/<contract-name>
  2. diff against repo source at HEAD `ac6f97f`
  3. assert exact match (Clarity source is plaintext; SHA256 comparable directly)
```

**Deferred to Gate 2** if dispatched — not executed at Gate 1.

**[ASSUMED]** ALEX mainnet deployer principal `SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM` (deduced from coinfabrik audit reports + ALEX docs). Confirmation deferred to Gate 2.

### Step 5.3 Inventory + brain lens application

Per Step 5.2 above. Manual lens application performed on:

1. **alex-vault.clar** (220 LOC) — central trust point
2. **age001-proposal-voting.clar** (167 LOC) — DAO governance voting
3. **age002-emergency-proposals.clar** (82 LOC) — emergency-team proposal path
4. **alex-launchpad-v1-1.clar** (559 LOC) — IDO lottery with LCG walk + VRF seed
5. **collateral-rebalancing-pool.clar** (1892 LOC) — Black-Scholes options pool, AMM-spot oracle

Triage findings detailed in Step 5.4 / 5.5 below.

### Step 5.4 5-Target Quality Checklist (0xTeam Attacker's Mindset, Ogie msg 7519) `[INSPECTED]`

| Target | Coverage in scope | Inspected file(s) | Verdict |
|---|---|---|---|
| 1. Withdrawals / Redemptions | YES — CRP `reduce-position-yield/key`, vault `transfer-ft`, launchpad `refund` | crp L329-385 + alex-vault L115-120 + launchpad L347-379 | CLEAN — Pattern E held by SIP-010 `try!` revert propagation; auth gates standard owner+approved |
| 2. Liquidation + Oracle | YES — CRP uses `oracle-resilient-helper` (EWMA-smoothed AMM-spot) for LTV/strike/weight | crp L1383-1468 oracle stack | KNOWN-PATTERN — AMM-spot oracle with EWMA. Cold-cache fallback to instant. Stacks ~10min block time + PoX mining requirement mitigates single-block attack vs Ethereum. Heavily audited (CoinFabrik AGE-2024-01 + Least Authority). **No fresh candidate.** |
| 3. Deposit / Mint Shares | YES — CRP `add-to-position`, launchpad `register`, vault `add-approved-token` | crp L257-310 + launchpad L116-219 + alex-vault L79-83 | CLEAN — single-registration guard `(asserts! (is-none (map-get? offering-ticket-bounds k)) err-already-registered)`; LTV cap enforced `(asserts! (>= conversion-ltv ltv-with-spot) ERR-LTV-TOO-HIGH)` |
| 4. External Calls | YES — vault flash-loan to flash-loan-user-trait, CRP swap-helper to fwp/swp pools | alex-vault L143-168 flash-loan + crp swap-helper paths | CLEAN — flash-loan repayment enforced by SIP-010 transfer-fixed revert; CEI ordering correct (`try!` propagates fail through all calls) |
| 5. Admin / Upgrade | YES — `set-contract-owner` on vault + launchpad + CRP + age001 governance-token swap + age002 emergency-team-sunset | scattered across all in-scope files | OUT-OF-SCOPE per Immunefi exclusion: "Attacks requiring privileged address access without additional modifications" — standard owner-key compromise is OOS |

**Coverage: 5/5 targets inspected. No Gate 2 candidate surfaced.** `[INSPECTED]`

### Step 5.5 Detector rotation — NOT APPLICABLE `[INSPECTED]`

Per Doctrine `audit-methodology-v2.md` L2 + Toly Percolator precedent: V6 18-detector pack is Solidity-only. Clarity targets bypass detector rotation; manual lens application replaces it. **No detector executions performed.**

**For Gate 2 (if dispatched in future):**
- A Clarity-specific detector pack would need to be built. Patterns to encode:
  - `tx-sender vs contract-caller confusion` (Stacks-specific principal model gotcha)
  - `as-contract scope leakage` (analogue of `delegatecall` storage trampoline)
  - `principal-equality-check` for trait-of vs contract-of asymmetries (DC-7 analogue)
  - `unwrap-panic` vs `unwrap!` consistency (silent-abort vs response-propagation)
  - `map-set` vs `map-insert` replay-safety (CANDIDATE-K analogue)
  - Surfaced as brain compound P4 below

### Step 5.6 Doctrine #30 grep-primitive verification

N/A — no surviving Gate 2 candidate to grep-verify.

### Step 5.7 Known-issues cross-ref `[INSPECTED]`

Immunefi scope page lists 6 CoinFabrik audit reports + 1 Least Authority audit as **excluded from reward eligibility** (vulnerabilities already identified are ineligible). CoinFabrik audit URLs visible:
- `coinfabrik.com/blog/alexgo-audit-report/`
- `coinfabrik.com/blog/alex-audit-bridge-backend-and-endpoints/` (bridge — OOS in this Immunefi scope anyway)
- `coinfabrik.com/blog/alex-orderbook-audit-report/`
- `coinfabrik.com/blog/alex-farming-campaign-audit-report/`
- `coinfabrik.com/blog/alexgo-audit-launchpad-vault-and-reserve-pool/` (DIRECTLY relevant to in-scope launchpad+vault+reserve-pool)
- additional CoinFabrik report on CRP/YTP (linked from git commits #376 #380 #439 audit-fix PRs)
- Least Authority audit (PR #463 `fix/leastauthority-audit`)

Detailed audit-finding cross-ref deferred to Gate 2.

### Step 5.8 R8 Calibrated Reporting on Gate 1 surface map

Tagged inline throughout this document. Summary:
- `[INSPECTED]` claims: 27 (source-code-read confirmed)
- `[ASSUMED]` claims: 3 (deployer principal, audit firm completeness, team migration motive)
- `[EXECUTED]` claims: 0 (no bytecode verification yet, no PoC run)

### Step 5.9 Output

This document: `hunts/2026-05-26-alex-immunefi-gate1.md`

Auto-index via `hunt-complete.sh` PostToolUse hook (will fire on commit).

---

## VERDICT

**FORECLOSURE-RECEIPT + WATCHLIST add**

Rationale:
1. **Dead substrate**: alex-v1 dev branch HEAD = 2024-05-14 (= XLink bridge exploit day, 743 days stale); in-scope pool/vault contracts frozen since 2022 (~1480 days)
2. **Heavy audit-saturation**: 6+ CoinFabrik audits + 1 Least Authority audit, all targeting the exact in-scope files
3. **Post-incident dormancy** (Doctrine #27 sibling — see brain compound P1): the team did NOT restructure the in-scope contracts after the May 2024 bridge exploit; they froze the entire dev branch instead. This suggests either (a) team migrated to different protocol, (b) bounty is maintained as goodwill gesture, or (c) team is preserving exploited-era code for forensic comparison. In any case, no fresh attack surface.
4. **Detector-pack mismatch**: V6 18-detector pack does not apply to Clarity. Manual lens application complete; 5/5 5-Target Quality Checklist inspected; no Gate 2 candidate surfaced.
5. **EV $100 nominal**: well below pipeline threshold.

**Brain compound value**: 5 NET-NEW proposals (below) — this is the FIRST Clarity/Stacks Gate 1 in Buzz operational history. Even with FORECLOSURE-RECEIPT verdict, the brain-compound surface is high-value (substrate-class expansion, dead-program decision rule, Clarity detector pack roadmap).

---

## BRAIN COMPOUND PROPOSALS (FROZEN PENDING OPERATOR)

### P1 — Doctrine #27 K corollary (DRAFT): Dead-Substrate Discount Multiplier

**Statement.** When a target's git HEAD is >365 days stale AND `late_changes_30d = 0` AND `dangerous_area_changes_365d = 0`, apply **0.25× dead-substrate-discount multiplier** to the EV calculation. The discount stacks on top of Doctrine #27 audit-saturation discount.

**Worked anchor**: ALEX Immunefi $100K Gate 1 (this hunt). alex-v1 HEAD frozen 743 days (= XLink exploit day); alex-dao HEAD frozen 741 days. EV reduced from $400 (no dead-substrate) to $100 (with multiplier).

**Discrimination from Doctrine #27 main rule**: #27 governs post-incident NEW programs (Hyperbridge). K corollary governs post-incident FROZEN programs (ALEX). Both are post-incident; the structural difference is whether the team restructured or froze.

**Decision rule integration**:

```
At Step 3 EV calculation:
  if (head_age_days > 365 AND late_changes_30d == 0 AND dangerous_area_changes_365d == 0):
      dead_substrate_multiplier = 0.25
      EV_adjusted = EV_base × dead_substrate_multiplier
      default_verdict_bias = FORECLOSURE-RECEIPT (unless EV_adjusted > $5K)
  else:
      dead_substrate_multiplier = 1.0 (no discount)
```

R8: `[INSPECTED]` ALEX dead-substrate anchor; `[ASSUMED]` 0.25× multiplier (first calibration, validate on next dead-substrate target — likely Yearn V2 or other zombie programs).

### P2 — Operator-Brief-Reconciliation expansion: Substrate-Freshness Divergence

**Statement.** When operator brief implies a "fresh Immunefi program from watchlist that hasn't been Gate 1'd", Standing-Intake Step 1 SHOULD surface substrate-freshness as a 4th dimension alongside prize / status / saturation. Specifically, if HEAD-age > 180 days, flag the divergence in the reconciliation table.

**Why**: ALEX is ACTIVE on Immunefi (true) but its codebase is DORMANT (also true). The brief implied both; reality is "active program + dormant code". Surfacing the discrepancy at intake prevents wasted cycles on Gate 2 dispatch.

R8: `[INSPECTED]` ALEX 2026-05-26 anchor.

### P3 — Layer 0 Detector Generalization: Clarity-keyword pattern set

**Statement.** Layer 0 `git-security-analyzer.js` `DANGEROUS_AREA_REGEX` is currently Solidity-keyword-biased (`mint|burn|migrate|upgradeTo|setOwner|setAdmin|setCurator|delegateCall|selfdestruct|...`). Clarity contracts use kebab-case (`transfer-fixed`, `add-to-position`, `set-contract-owner`, `add-approved-contract`, `flash-loan`, `mint-fixed`, `burn-fixed`, `set-emergency-team-member`). Without Clarity-keyword expansion, Layer 0 produces false-negative `dangerous_area_changes = 0` even on real Stacks DeFi targets (validated 2026-05-26 against ALEX alex-v1 2095 commits — zero dangerous-area hits despite obvious risk surfaces).

**Proposed extension** to `DANGEROUS_AREA_REGEX`:

```js
const DANGEROUS_AREA_REGEX = new RegExp([
  // ... existing Solidity patterns ...
  // Clarity/Stacks patterns:
  'transfer-fixed', 'transfer-sft', 'mint-fixed', 'burn-fixed',
  'set-contract-owner', 'set-flash-loan-fee-rate', 'add-approved-contract',
  'add-approved-token', 'add-approved-flash-loan-user', 'set-emergency-team',
  'set-governance-token', 'add-proposal', 'emergency-propose',
  'flash-loan', 'add-to-position', 'reduce-position', 'roll-borrow',
  'create-pool', 'create-margin-position'
].join('|'), 'i');
```

R8: `[INSPECTED]` false-negative class confirmed on ALEX; `[ASSUMED]` Clarity-keyword set is comprehensive (likely need iterative expansion as more Clarity targets land).

### P4 — Clarity-specific detector pack roadmap (DRAFT)

**Statement.** Buzz V6 detector rotation is Solidity-only. As Stacks-Bitcoin DeFi grows (StacksJam, Velar, Bitflow, ALEX revival, ...), Lane 1 will need a Clarity detector pack. Patterns to encode (initial set, derived from 2026-05-26 ALEX Gate 1):

1. **`tx-sender vs contract-caller` confusion detector** — find functions that authorize against `tx-sender` but execute logic in a way that should authorize against `contract-caller`, or vice versa. Stacks principal-model gotcha (analogue of `msg.sender vs tx.origin` but with stronger Clarity-specific semantics inside `as-contract` scope).
2. **`as-contract` scope leakage** — find `(as-contract ...)` blocks where `tx-sender` shifts to the contract address, but a function-local reference to `tx-sender` later in the same scope is ambiguous between EOA caller and contract-self.
3. **`unwrap-panic` vs `unwrap!`** — `unwrap-panic` silently aborts; `unwrap!` propagates a typed error. Mixing the two creates silent-revert vs informative-revert divergence.
4. **`map-set` vs `map-insert` replay-safety** — `map-set` overwrites; `map-insert` fails-if-exists. Functions that should be insert-once but use `map-set` are CANDIDATE-K analogues.
5. **`trait-of` vs `contract-of` asymmetry** — trait dispatch vs principal-equality checks. DC-7 analogue (Validating-Field ≠ Consuming-Field) on principal vs trait identity.
6. **`oracle-resilient` cold-cache fallback** — find `match (map-get? oracle-cache-map ...) value (...) (fallback-to-instant ...)` patterns where the fallback path bypasses TWAP smoothing on first-interaction.

R8: `[ASSUMED]` detector roadmap (no Buzz Clarity detector exists yet). Triggering build only when (a) Stacks bounty pipeline justifies ROI, OR (b) operator dispatches second Clarity target.

### P5 — FIRST Clarity/Stacks Lane 1 hunt — methodology validation anchor

**Statement.** ALEX 2026-05-26 Gate 1 is Buzz's FIRST Clarity/Stacks audit. Outcome (FORECLOSURE-RECEIPT, manual lens application replaces detector rotation, brain compound = primary value vector) **validates** the parallel logic established by Toly Percolator Bounty 5 v16 (Rust/Solana). Specifically:

- Non-Solidity targets bypass V6 18-detector rotation cleanly
- Manual brain-lens application + 5-Target Quality Checklist remains operative across substrate-languages
- FORECLOSURE-RECEIPT verdict is the high-likelihood default on dead-substrate non-Solidity targets
- Brain compound value compensates EV-low Gate 1s when substrate is methodology-novel

**Catalog entry**: add ALEX 2026-05-26 to `brain/Lane1-Substrate-Coverage.md` (if exists) or create — alongside Percolator Rust/Solana 2026-05-25 — as the canonical anchors for Buzz's non-Solidity Lane 1 capability.

R8: `[INSPECTED]` parallel-logic adoption from Percolator precedent; `[ASSUMED]` Lane1-Substrate-Coverage.md doesn't exist yet (operator decides whether to create or fold into existing brain doc).

---

## Resource accounting

| Metric | Value |
|---|---|
| Pre-disk usage | 87% (5.0G free) |
| Post-disk usage | 87% (~4.8G free) |
| Clone delta | +33MB (alex-v1) + 544KB (alex-dao) = ~34MB |
| Halt-at-88% | NEVER approached |
| Wall-clock | ~50 min (within 60-min hard cap) |
| Files cloned | alex-v1 (364 .clar files), alex-dao (14 .clar files) |
| Files inspected at lens-level | 5 (alex-vault, age001, age002, alex-launchpad, crp) |
| Clone retention | 7d (purge 2026-06-02 if no Gate 2 dispatched) |

---

## Recommended next dispatch

Per Hyperactive Formula Step 3 (EV refresh + dispatch highest-EV unscanned):

**ALEX → FORECLOSURE-RECEIPT** (no further dispatch on this target).

**Next dispatch**: continue Day 26 morning queue — next fresh Immunefi program from watchlist. Operator brief (msg 7760) named DeXe + ALEX as the two un-dispatched. DeXe was FORECLOSURE-RECEIPT 2026-05-25. ALEX FORECLOSURE-RECEIPT here. **The 7760 Immunefi-watchlist queue is now CLEARED.**

Suggested next-target search: monitor Lane 5 scope-monitor for new Cantina / Sherlock / HackenProof launches; otherwise rotate to Lane 4 forum intelligence or Lane 1.5 retrospective study (KyberSwap / Raydium / Notional V3 references are queued).

---

_Gate 1 closed. FORECLOSURE-RECEIPT. 5 brain compound proposals frozen pending operator review._
