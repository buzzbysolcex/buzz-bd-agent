# Gate 1: Stacks $250K Immunefi — sBTC Clarity + Signer

**Hunt Date:** 2026-05-26
**Operator authority:** Ogie Day 26 morning hunting batch
**Repo HEAD:** `stacks-sbtc/sbtc` @ `11567fc` (2026-05-something, depth 200)
**Pipeline budget:** 90 min hard cap
**Final disk:** captured post-execution
**Output:** this file + `.gate1-work/stacks-immunefi-2026-05-26/`

---

## Step 1 — PROFILE

| Field | Value |
|---|---|
| Platform | Immunefi |
| Status | **ACTIVE** (live since 31 Mar 2022) [INSPECTED — Immunefi page fetch 2026-05-26] |
| Critical cap | $250,000 USD |
| High cap | $25,000 |
| Medium cap | $5,000 |
| Low cap | $1,000 |
| Minimum-payout guarantee | $25,000 USD (Critical floor) |
| KYC | YES, mandatory for payout |
| Payer history | **$1.6M paid lifetime** (proven payer) |
| Languages | Rust, Bitcoin Script, Clarity |
| Triaged | Immunefi-triaged |
| In-scope (12 assets) | sBTC: `signer/src`, `emily/src`, `contracts`, `sbtc/src` (repo `stacks-sbtc/sbtc`); stacks-core: `stacks-common`, `stacks-node/src`, `stackslib`, `stacks-signer`, `clarity`; Smart contracts: `costs`, `lockup`, `pox-4` |
| Out of scope | Third-party services, public/known vulns, mainnet/testnet testing, secp256r1 high-S sig bugs, theoretical attacks without PoC |
| Critical cap detail | "10% of funds directly affected", $250K hard cap, $25K floor |
| Special clause | sBTC downgrades apply for impacts affecting <1% of users |
| Submission | PoC required ALL severities, template-based, testing limited to private testnet |

### Status verdict: **ACTIVE — proceed.**

(Doctrine #28 STATUS-CHECK pass. No FORECLOSURE-RECEIPT trigger.)

---

## Step 1.5 — DUP-AVOIDANCE CORPUS (CRITICAL — saturation target)

**Known audits + bounty disclosures on sBTC scope:**

| Source | Scope | Date | Findings detail |
|---|---|---|---|
| Ottersec | sBTC | 2 reports | 2 reports referenced on `docs.stacks.co/learn/sbtc/security-model-of-sbtc/sbtc-audits` |
| CoinFabrik | stacks-signer binary | -- | Pre-mainnet signer audit |
| Clarity Alliance | sBTC | 1 report | Pre-mainnet Clarity contract review |
| **Immunefi Attackathon 1** | sBTC | Dec 2-Jan 13, 2025 | **25,492 LOC scoped; 25+ valid bugs (2 Crit / 12 High / 8 Med / 4 Low / 6 Insight)** |
| **Immunefi Attackathon 2** | sBTC | Feb 24-Mar 27, 2025 | **9+ valid bugs (3 High / 4 Med / 1 Low / 5 Insight)** |
| Asymmetric Research | sBTC (embedded) | 2024-ongoing | Core security contributor + signer participant |
| Hypernative | sBTC (monitoring) | ongoing | Live on-chain monitoring |
| Staking Defense League | consultation | ongoing | -- |

**DUP-RISK CLASS = EXTREME.** Top researchers (1f4lc0n, n4nika, throwing5tone7, Blobism, f4lc0n, vini_btc, leadwiz) have specialized in sBTC peg + signer + Emily attack surfaces. Most of the obvious classes are burned.

### Attackathon 1 fully-burned classes (DO NOT re-file)
- WSTS nonce replay → Critical (#1f4lc0n, $50K+)
- Empty BTC transaction drain coordinator → Critical (#throwing5tone7)
- Aggregate key sweep failure (#37718)
- DKG deadlock + invalid shares + length checks crash (#37811/37814)
- Single signer block finalization (#38053)
- Signer fee theft + invalid principal mint (#38392/38740)
- Censoring deposits via Emily API (#38133/37470/37384)
- Lock_time=16 deposit failure (#37545)
- Network DoS via P2P/junk messages (#38270)
- BTC transaction fee elevation + blocklist bypass (#38460/37500)

### Attackathon 2 fully-burned classes (DO NOT re-file)
- Large BTC tx with many sBTC deposits halts signers (#42747)
- Multi-withdrawal in single tx halts signers (#40692)
- Large reclaim_scripts DoS Emily/Signers (#40806) — **patched #2030 Apr 28**
- libp2p DoS class (#42752/42773)
- Coordinator OOM during DKG (#42404)
- Withdrawal-vote inconsistency (#40655)
- Withdrawal confirmation manipulation (#41111)
- Emily API key Lambda exposure (#41340)
- Blocklisted BTC wallet network DoS (#42764)

**Anything matching the above 22+ patterns = AUTO-REJECT in Gate 2.**

---

## Step 2 — BRAIN OVERLAP SCORE

Lens application against sBTC Clarity (1148 LOC) + signer Rust + Emily + stacks-core scope.

| Lens | Hit? | Rationale | Burned? |
|---|---|---|---|
| **DC-9 (privileged state mutation w/o defense-in-depth, sub-1 unchecked-mint)** | ✓ | `sbtc-deposit.clar:62` mints sBTC on burn-hash match only — single signer-set check + replay check; no aggregate balance invariant check pre-mint | Partial — Att1 burned the nonce-replay class but not the conservation-invariant class |
| **DC-9 sub-2 (zero-timelock signer-set rotation)** | ✓ | `sbtc-bootstrap-signers.clar:20-49` `rotate-keys-wrapper` permits immediate signer-set rotation w/ no timelock; only check is signature threshold + replay map | Likely partial-burn; check Att1 corpus for "rotation in-flight" findings |
| **DC-9 sub-3 (upgradeable-hook-no-timelock)** | ✓ | `sbtc-bootstrap-signers.clar:53-60` `update-protocol-contract-wrapper` swaps entire deposit/withdrawal/governance contracts atomically with NO timelock + NO version check + NO new-contract-validation | **NET-NEW class — not surfaced in either Attackathon disclosed-finding list** |
| **DC-9 sub-4 (state-not-invalidated repeated-mint)** | ✓ | `sbtc-deposit.clar` replay-guard uses `(deposit-status txid vout-index)` — but compound key `(txid, vout-index)` collision class warrants check; `sbtc-registry.clar:67` deposit-status is bool map | Likely burned in Att1 (replay class explicitly covered) |
| **DC-12 (Bitcoin price feed)** | ✗ | sBTC is 1:1 BTC-backed, no price oracle in peg path. Stacks-core consumes Bitcoin block headers (burn-hash) but no $ price oracle in scope | N/A |
| **DC-5 (signature replay / EIP-712 analog)** | ✓ | Registry tracks `aggregate-pubkeys` map for rotation replay — but `current-aggregate-pubkey` initial value is `0x00`; first-rotation edge case worth checking | Burned in Att1 (WSTS replay) |
| **DC-7 (Validating-Field ≠ Consuming-Field on adjacent functions)** | ✓ | `sbtc-withdrawal.clar:130-143` validates `(> amount DUST_LIMIT)` only — does NOT validate `max-fee` upper bound. `protocol-lock (+ amount max-fee)` consumes both fields, but `max-fee` is unbounded user input that can be arbitrarily large | Partial burn — Rust `i64::MAX` patches (#1926/1927) suggest historic Rust-side max-fee bounds class. **Clarity-side max-fee bounds is NET-NEW for Clarity** |
| **CANDIDATE-P (Durable-Nonce pre-signed tx accumulation)** | ✗ | Stacks tx nonce model is per-account counter; not durable-nonce-pre-signed analog. No direct match | N/A |
| **CANDIDATE-O (Slippage double-count)** | ✗ | sBTC peg is 1:1, no swap path; no slippage | N/A |
| **CANDIDATE-M (Post-audit CEI break via upgradeable hook)** | ✓ | `update-protocol-contract-wrapper` (above) IS the hook surface — but the contracts swapped are themselves non-CEI (Clarity has no reentrancy); however the **trust assumption that .sbtc-deposit / .sbtc-withdrawal / .sbtc-bootstrap-signers are immutable code-as-trust is broken** by this function. Composition: a malicious-or-compromised signer-key holder can swap `.sbtc-deposit` to a malicious contract that mints unlimited sBTC. | Unclear — surface for verification vs Att1/Att2 |
| **Clarity tx-sender vs contract-caller confusion** | ✓ | `sbtc-deposit.clar:44` uses `tx-sender` for signer-principal check; `sbtc-registry.clar:171/209/242/271/303/333` uses `contract-caller`. **There's an intentional asymmetry**: `tx-sender` for "is this the multisig principal calling top-level?" + `contract-caller` for "is this protocol-internal contract-to-contract?" Logic looks correct but worth verification | Partial — Att1 likely covered |
| **Clarity `as-contract` scope leakage** | ✗ | Only `as-contract` usage is in `sbtc-token-test.clar` (test, OOS) | N/A |
| **Clarity `unwrap-panic` abort risk** | ✓ | `sbtc-bootstrap-signers.clar:105/125/130/134` uses `unwrap-panic` on element-at / principal-construct — all on bounded inputs (BUFF_TO_BYTE lookup table indexed by `n` ∈ [0,255]). `sbtc-withdrawal.clar:267` uses `unwrap-panic` on `current-bitcoin-txid`/`current-output-index`/`current-fee`/`current-sweep-txid` but ALL are guarded by `(asserts! (and (is-some ...) ...))` at line 264-266. **No panic-without-guard surface found** | Burned/not-applicable |
| **Doctrine #34 Post-Audit Composition Multiplier** | ✓ HIGH | Layer 0 shows 3 dangerous-area-changes in last 30d + 39 fix candidates in 200 commits; most recent **#2030 / #2028** are direct Att2 fixes still merging in May 2026. Sustained post-audit composition pressure | Active multiplier |
| **Doctrine #29 isolation-foreclosure** | ✓ | sBTC peg-vault isolation is via Bitcoin-on-chain multisig + Stacks contract — but the `update-protocol-contract-wrapper` breaks isolation: same N-of-M signer key holders can swap deposit/withdrawal logic atomically. Composition-attack surface. | Net-new framing |
| **Selective-Coverage Defense Asymmetry lens** | ✓ | `sbtc-deposit.clar` has 6 explicit asserts (caller, dust, txid-len, sweep-txid-len, replay, burn-hash). `sbtc-withdrawal.clar` `initiate-withdrawal-request` has ONLY 2 (dust + recipient validation) — no upper-bound on `amount` or `max-fee`. **Asymmetric coverage** between deposit-side (strict) and withdrawal-side (lax) | Possibly net-new |

### Brain overlap score: **MEDIUM-HIGH**

5 net-new lens-hits (DC-9 sub-3, withdrawal max-fee bounds, post-audit-composition multiplier via #2033 fix, isolation-foreclosure framing on `update-protocol-contract-wrapper`, selective-coverage withdrawal asymmetry), all in surface NOT covered by Attackathon 1+2 disclosed findings.

---

## Step 3 — EV CALCULATION

```
EV = P(finding) × bounty_cap × P(acceptance) × overlap_multiplier × Doctrine_27_saturation_filter

P(finding)    ≈ 0.04 (heavy saturation — 47+ disclosed findings already)
bounty_cap    = $250,000 (with $25K floor)
P(acceptance) ≈ 0.5 (proven payer, but PoC-required + private-testnet-only adds friction)
overlap       ≈ 0.5 (MEDIUM brain overlap)
saturation    ≈ 0.4 (Doctrine #27 — 4 audit firms + 2 attackathons + embedded security team)
extreme-saturation factor = post-audit-composition multiplier compensates partially

Raw EV: 0.04 × $250K × 0.5 × 0.5 × 0.4 = $1,000

Adjusted EV (Doctrine #34 compensator for live post-audit churn): $1,000 × 2.0 = ~$2,000
```

**Action queue:** Gap-fill priority. Worth proceeding with Gate 1 because the substrate is small (1148 LOC Clarity tractable in a single read pass) and the Clarity Lane 1 anchor pair completes (paired with ALEX). But Gate 2 escalation requires high confidence on net-new — given saturation, prepare for 70%+ DUP-rate on any candidates.

**Strategic value beyond direct EV:** Completes Buzz Clarity Lane 1 anchor pair (ALEX is dead-frozen substrate; Stacks is live substrate). Provides anti-canonical pair for Clarity lens calibration. Justifies Clarity detector pack build (ALEX P4 proposal).

---

## Step 5 — GATE 1 EXECUTION

### 5.0 Layer 0 git-security snapshot

**sBTC repo (`stacks-sbtc/sbtc` @ `11567fc`, depth 200):**

| Section | Count | Notes |
|---|---|---|
| commits_analyzed | 200 | |
| total_commits | 200 | depth-limited; full history likely much larger |
| fix_candidates | **39** | very active patching |
| dangerous_area_changes | **30** | heavy mutation on risk surface (in 200 commits) |
| late_changes (30d) | **3** | #2033 emily-max-fee, #2030 cap-reclaim-length, #2028 op-successx-validation |
| untouched_critical (90d+) | **50** | sBTC Clarity contracts have not changed in months (stable peg substrate) |
| audit_age | NO embedded audits/ dir | external docs.stacks.co/learn/sbtc reference only |
| revert_history | 1 | clean |

**Doctrine #32 v1.1 filter:** dangerous_area_changes_365d ≥ 10 (∴ ≥ 30 in 200 commits) → **PASS**. Substrate is live + actively patched (not dead-frozen).

**Clarity-keyword false-negative note (ALEX P3 proposal anchor):** Layer 0 detects English keywords (`mint`, `burn`, `migrate`, `as-contract`, `tx-sender`). It DID detect changes touching `deposits.rs`/`emily/handler/.../deposit.rs` correctly. The Clarity contracts themselves had `untouched_critical` 90d+ status — verified by reading source files (last meaningful commits to `contracts/contracts/*.clar` predate the 90-day window). Clarity-keyword detection is OK in this case because all dangerous mutation activity is on the Rust side (signer + Emily); the Clarity contracts ARE stable. Doctrine #32 v1.1 holds.

### 5.1 Pre-flight scope-check

| Asset (Immunefi-declared) | Mapped to repo path | In-scope verification |
|---|---|---|
| `signer/src` | `sbtc/signer/src/*.rs` | ✓ confirmed |
| `emily/src` | `sbtc/emily/handler/src/*` (path is `emily/handler/src` not `emily/src` — minor scope-prose vs repo-reality drift) | ⚠ scope-prose says `emily/src` but repo has `emily/handler/src/*` — surface for clarification; assume Immunefi-intent = whatever lives in `emily/` |
| `contracts` | `sbtc/contracts/contracts/*.clar` | ✓ confirmed (5 in-scope `.clar` + 1 test) |
| `sbtc/src` | `sbtc/sbtc/src/*.rs` | ✓ confirmed (this is the Rust library for sBTC primitives) |
| `stacks-core/stacks-common` | NOT cloned (separate repo) | ✓ in-scope on stacks-network/stacks-core repo |
| Costs/Lockup/POX-4 | stacks-core embedded | NOT cloned this Gate 1 |

### 5.2 Bytecode-verify prep

Stacks contracts: source-deployed (no bytecode equivalent). Address = principal `SP000000000000000000002Q6VF78.sbtc-deposit` / `SP000000000000000000002Q6VF78.sbtc-withdrawal` / `SP000000000000000000002Q6VF78.sbtc-registry` / `SP000000000000000000002Q6VF78.sbtc-bootstrap-signers` / `SP000000000000000000002Q6VF78.sbtc-token` (mainnet principal needs confirmation — Stacks Foundation deployer; the burned-address `SP000...2Q6VF78` is the Costs contract; sBTC mainnet deployer is `SP3Y2ZSH8P7D50B0VBTSX11S7XSG24M1VB9YFQA4K` or similar — verify at Gate 2 via Hiro explorer).

For Gate 2: pull mainnet source via Hiro API `GET /v2/contracts/source/SP.../sbtc-deposit?proof=0` → SHA256 vs `contracts/contracts/sbtc-deposit.clar`. Confirms substrate matches HEAD.

### 5.3 Inventory

- **Clarity contracts (in-scope):** 5 production + 1 test
  - `sbtc-deposit.clar` (115 lines, 2 public functions: `complete-deposit-wrapper`, `complete-deposits-wrapper`)
  - `sbtc-withdrawal.clar` (310 lines, 4 public functions: `initiate-withdrawal-request`, `accept-withdrawal-request`, `reject-withdrawal-request`, `complete-withdrawals`)
  - `sbtc-bootstrap-signers.clar` (154 lines, 2 public functions: `rotate-keys-wrapper`, `update-protocol-contract-wrapper`)
  - `sbtc-registry.clar` (369 lines, 5 public functions: `create-withdrawal-request`, `complete-withdrawal-accept`, `complete-withdrawal-reject`, `complete-deposit`, `rotate-keys`, `update-protocol-contract`)
  - `sbtc-token.clar` (157 lines, fungible + locked-fungible token, 9 protocol functions + SIP-010 transfer)
- **Signer Rust (in-scope, sampled, not exhaustively read):**
  - `signer/src/block_observer.rs` (50KB)
  - `signer/src/dkg/*.rs`
  - `signer/src/stacks/*.rs`
  - `signer/src/wsts_state_machine.rs`
  - `signer/src/request_decider.rs`
- **Emily Rust (in-scope, NOT deep-read this Gate 1):** `emily/handler/src/api/handlers/*.rs`
- **sBTC primitive Rust (in-scope):** `sbtc/src/deposits.rs`, `sbtc/src/withdrawals.rs`

### 5.4 Brain lens application — manual triage results

(See Step 2 table above for full lens × hit matrix. Five net-new candidate threads identified for deeper triage. Skipping repetition.)

### 5.5 5-Target Quality Checklist (Ogie msg 7519 mandate)

| Target | sBTC equivalent | Buzz lens | Coverage in Gate 1 |
|---|---|---|---|
| **Withdrawals/Redemptions** | `sbtc-withdrawal.clar` accept/reject/complete | CANDIDATE-M + DC-1 analog + selective-coverage | ✓ Examined — selective-coverage finding (no max-fee upper bound) |
| **Liquidation + Oracle** | N/A — sBTC 1:1 peg has no liquidation; no oracle in peg path | CANDIDATE-O + Pattern E + DC-7 | ✗ Skip — no oracle surface |
| **Deposit/Mint Shares** | `sbtc-deposit.clar` complete-deposit-wrapper | CANDIDATE-I + CANDIDATE-K + DC-9 sub-4 | ✓ Examined — replay-guarded; conservation-invariant net-new framing |
| **External Calls** | All `contract-call?` cross-contract Clarity calls + Bitcoin chain reads via `get-burn-block-info?` | Pattern I + DC-9 sub-3 + CANDIDATE-M | ✓ Examined — `update-protocol-contract-wrapper` IS the hook surface |
| **Admin/Upgrade** | `rotate-keys-wrapper` + `update-protocol-contract-wrapper` + threshold-validation | DC-9 full family + CANDIDATE-P pair | ✓ Examined — net-new no-timelock + no-new-contract-validation candidates |

**Checklist complete: 4 of 5 with coverage, 1 (Liquidation+Oracle) N/A by design.** Surface map quality check **PASS**.

### 5.6 Detector rotation

**SKIP** — V6 BuzzShield is Solidity-only. Manual Clarity triage complete. (ALEX P4 proposal anchor: Clarity detector pack would catch the patterns surfaced manually here — `update-protocol-contract-wrapper` no-timelock, selective-coverage withdrawal max-fee bounds.)

### 5.7 Doctrine #30 grep-primitive — defense markers in Clarity

- `(asserts! ...)` count: deposit=6, withdrawal-initiate=2 (dust + recipient-validate), withdrawal-accept=4 (burn-hash, caller, status, fee≤max-fee), withdrawal-reject=2 (caller, status), bootstrap-rotate=4 (size, threshold, caller, keylen), bootstrap-update=1 (caller), registry-update-protocol=1 (caller via `is-protocol-caller`)
- `(try! (contract-call? ...is-protocol-caller ...))` enforcement count: 7 (registry-side gating to protocol contracts)
- **Asymmetry**: deposit-side has 6 input-validation asserts; withdrawal-initiate has 2; bootstrap-update has 1 (only caller check, no new-contract-validation)
- **Net signal**: Selective-coverage asymmetry between deposit (strict) vs withdrawal-init (lax) vs bootstrap-update (lax) — the upgrade-path has THE LEAST validation despite being THE highest-blast-radius operation

### 5.8 Known-issues cross-ref

Reviewed (via WebFetch + WebSearch):
- Stacks Attackathon 1 disclosed leaderboard + finding categories (25+ findings)
- Stacks Attackathon 2 disclosed leaderboard + finding categories (9+ findings)
- Asymmetric Research embedded program (continuous)
- `docs.stacks.co/learn/sbtc/security-model-of-sbtc/sbtc-audits` (Ottersec 2 + CoinFabrik 1 + Clarity Alliance 1)
- No public PDF audit reports were directly readable (Ottersec/CoinFabrik/Clarity-Alliance PDFs not accessed)

**Pre-Gate-2 hold**: BEFORE filing any Gate 2 finding, MUST re-read the actual Attackathon report PDFs at `https://reports.immunefi.com/stacks-i-attackathon` + `https://reports.immunefi.com/stacks-ii-attackathon` to confirm net-new vs DUP per finding ID.

### 5.9 Output

This file is the Gate 1 output. `.gate1-work/stacks-immunefi-2026-05-26/sbtc/` clone retained for Gate 2 (~18MB).

### 5.10 R8 Calibrated Reporting

All claims in Sections 5.4–5.7 tagged `[INSPECTED]` (code-confirmed via source read). Net-new framings (DC-9 sub-3 on `update-protocol-contract-wrapper`, withdrawal max-fee bounds) are `[INSPECTED]` (Clarity logic-traced). Gate 2 escalation will produce `[EXECUTED]` tags via Clarinet PoC.

---

## TOP CANDIDATES (Gate 2 surface map)

### C1 — `update-protocol-contract-wrapper` zero-timelock + zero-new-contract-validation (DC-9 sub-3, net-new framing) [INSPECTED]

**File:** `contracts/contracts/sbtc-bootstrap-signers.clar:53-60` + `contracts/contracts/sbtc-registry.clar:327-345`

**Pattern:**
```clarity
(define-public (update-protocol-contract-wrapper (contract-type (buff 1)) (contract-address principal))
    (begin
        (asserts! (is-eq (contract-call? .sbtc-registry get-current-signer-principal) tx-sender) ERR_INVALID_CALLER)
        (contract-call? .sbtc-registry update-protocol-contract contract-type contract-address)))
```
Registry side:
```clarity
(define-public (update-protocol-contract (contract-type (buff 1)) (new-contract principal))
    (begin
        (try! (is-protocol-caller governance-role contract-caller))
        (map-set active-protocol-contracts contract-type new-contract)
        (map-set active-protocol-roles new-contract contract-type)
        ...))
```

**Why it's a candidate:**
1. **No timelock.** Signer-set principal can swap the entire deposit-logic, withdrawal-logic, or governance-logic contract in a single block, with no waiting period.
2. **No new-contract validation.** Any principal (including a contract not even deployed yet, or a contract with malicious code) can be installed as `.sbtc-deposit` — and then immediately call `protocol-mint` on `.sbtc-token` because the registry checks `is-protocol-caller` via the just-updated `active-protocol-roles` map.
3. **Blast radius: full sBTC supply.** A malicious or compromised signer set (or a quorum-rotation-attack window) can mint arbitrary sBTC by swapping the deposit contract.
4. **DUP-avoidance check needed:** verify the actual Att1/Att2 report PDFs don't already list this. The disclosed categories shown to me did NOT mention this finding — but PDFs may have it.

**Gate 2 PoC plan:**
- Clarinet test: deploy a malicious deposit-contract `mock-deposit.clar` that mints arbitrary sBTC; call `update-protocol-contract-wrapper deposit-role .mock-deposit` as the signer principal; call `mock-deposit.malicious-mint user u100000000` and assert ft-balance increase.
- Severity classification per Immunefi: trust-assumption breach + unbounded fund minting = Critical (caps at $250K with 10%-funds-affected limit).

**Confidence vs DUP:** Medium-high. The class is a structural inevitability of the design, but the Stacks team may consider it "by design" (signer-set is the trust root). If filed, need to argue why the absence of timelock or candidate-validation is a security violation rather than a design choice. **High likelihood of "informational" or "by design" verdict** unless we can argue specific exploit path (e.g., compromised single-signer threshold + temporal window).

---

### C2 — `sbtc-withdrawal.initiate-withdrawal-request` missing upper-bound on `max-fee` (Selective-Coverage Defense Asymmetry, partial net-new) [INSPECTED]

**File:** `contracts/contracts/sbtc-withdrawal.clar:130-143`

**Pattern:**
```clarity
(define-public (initiate-withdrawal-request (amount uint)
                                            (recipient { version: (buff 1), hashbytes: (buff 32) })
                                            (max-fee uint))
    (begin
        (try! (contract-call? .sbtc-token protocol-lock (+ amount max-fee) tx-sender withdraw-role))
        (asserts! (> amount DUST_LIMIT) ERR_DUST_LIMIT)
        (try! (validate-recipient recipient))
        (ok (try! (contract-call? .sbtc-registry create-withdrawal-request amount max-fee tx-sender recipient burn-block-height)))))
```

**Why it's a candidate:**
1. **No upper bound on `max-fee`.** User supplies any `uint` (Clarity native uint is 128-bit unsigned; sBTC `protocol-lock` will fail at `ft-burn?` if user balance < `amount + max-fee`, but a user with N sBTC can lock N sBTC as max-fee against a tiny `amount`).
2. **Class history (Layer 0 signal):** Rust side had 3 patches (#1926, #1927, #2033) for max-fee overflow/bounds class. Suggests historic awareness of the field as problematic.
3. **Exploit angle:** Not obviously a fund-loss bug (user pays from own balance), but may enable:
   - Griefing: lock another user's sBTC if cross-account `tx-sender` confusion exists (it doesn't here, `tx-sender` is the caller)
   - **Signer-side DoS:** Signers in the Rust signer path (`sbtc/src/withdrawals.rs`) may compute `requested-max-fee - fee` and other arithmetic on the user-supplied max-fee. If signer-side has an i64::MAX bug (Rust #1926 was for this class), a malicious user could trigger signer panic by submitting max-fee > i64::MAX.

**Gate 2 PoC plan:**
- Read `sbtc/src/withdrawals.rs` + signer Rust withdrawal-handling path to find max-fee arithmetic
- If a Rust-side max-fee overflow exists despite #1926/#1927 patches → CRITICAL (signer halt class)
- If only Clarity-side max-fee is unbound → likely LOW (griefing only)

**Confidence vs DUP:** Low-medium. Att1 has finding #38392 ("Signers steal STX via excessive transaction fees") — different class but same field family. Att1 #38605 ("Missing fee validation causes financial loss") is the closest DUP. **Need PDF read to confirm.**

---

### C3 — Initial `current-signer-principal` = `tx-sender` at contract-deploy time (DC-9 + Doctrine #34 framing) [INSPECTED]

**File:** `contracts/contracts/sbtc-registry.clar:18`

**Pattern:**
```clarity
(define-data-var current-signer-principal principal tx-sender)
```

**Why it's a candidate:**
1. The initial value of `current-signer-principal` is whatever `tx-sender` was at the moment of contract deployment.
2. If the registry was deployed by the bootstrap-signers contract, then the initial signer-principal = bootstrap-signers (intentional).
3. If the registry was deployed by an admin EOA (manual deploy), then the initial signer-principal = that EOA — which means before `rotate-keys` is called, the EOA has full authority over `update-protocol-contract` and signer rotation.
4. **Pre-rotation window:** between contract deployment and first `rotate-keys-wrapper` call, the deploying principal has unrestricted admin over the entire sBTC protocol.

**Gate 2 PoC plan:**
- Check mainnet deployment sequence: which principal deployed `.sbtc-registry`?
- Was `rotate-keys-wrapper` called in the same block (atomic deployment + rotation)?
- If multi-block, what was the temporal window?

**Confidence vs DUP:** Very low — this is a deployment-bootstrapping concern, likely already verified by Ottersec/Clarity-Alliance pre-mainnet audits. Almost certainly DUP.

---

### C4 — `aggregate-pubkeys` replay-map asymmetry (DC-5 framing variant) [INSPECTED]

**File:** `contracts/contracts/sbtc-registry.clar:305`

**Pattern:**
```clarity
(asserts! (map-insert aggregate-pubkeys new-aggregate-pubkey true) ERR_AGG_PUBKEY_REPLAY)
```

**Why it's a candidate:**
1. The replay-map prevents reuse of an aggregate-pubkey across signer rotations.
2. The initial value of `current-aggregate-pubkey` is `0x00` (line 17). This value is NEVER inserted into `aggregate-pubkeys`.
3. **Subtle edge case:** if a malicious signer set during a rotation somehow constructs an aggregate-pubkey that hashes to `0x00` (or includes byte-prefixes that cause Clarity buffer-comparison to match), the first-time rotation might bypass the check... no — `map-insert` semantics: it adds to a map keyed by `(buff 33)`; `0x00` as a literal initial-var is a `(buff 33)` of one byte? No, `0x00` initial value is a 1-byte buff but the var-type is `(buff 33)`. So the type-check at compile-time fixes the bytes. Likely false alarm.

**Confidence vs DUP:** Very low. Likely already audited by Clarity Alliance + Ottersec.

---

### C5 — `signer-bitmap` semantic ambiguity in reject-withdrawal-request (Selective-coverage) [INSPECTED]

**File:** `contracts/contracts/sbtc-withdrawal.clar:192-216`

**Pattern:**
```clarity
(define-public (reject-withdrawal-request (request-id uint) (signer-bitmap uint))
    (let (...)
        ;; Check that the caller is the current signer principal
        (asserts! (is-eq (get current-signer-principal current-signer-data) tx-sender) ERR_INVALID_CALLER)
        ;; Check that request status is currently-pending
        (asserts! (is-none (get status withdrawal)) ERR_ALREADY_PROCESSED)
        ;; Burn sbtc-locked & re-mint sbtc to original requester
        (try! (contract-call? .sbtc-token protocol-unlock (+ requested-amount requested-max-fee) requester withdraw-role))
        ;; Call into registry to confirm accepted withdrawal
        (try! (contract-call? .sbtc-registry complete-withdrawal-reject request-id signer-bitmap))
        (ok true)))
```

**Why it's a candidate:**
1. `signer-bitmap` is passed-through from public function → registry → print event with NO validation.
2. Contrast with `accept-withdrawal-request` (line 146-189) which has identical signer-bitmap pass-through.
3. The signer-bitmap likely encodes which signers voted (per Att2 #40655 finding context). **If the bitmap fails to encode a valid signing-quorum but is set to arbitrary uint, the on-chain record is corrupt — but the off-chain peg vault still executes the BTC release.**
4. **Specifically:** the Clarity contract does NOT verify that the signer-bitmap represents a valid signing quorum. It just records whatever the signer-principal multisig caller supplies.

**Confidence vs DUP:** Medium. Att2 #40655 "Malicious signers block sBTC withdrawal through inconsistent voting" is the closest DUP. **Likely DUP — different angle but same field semantics.** Drop unless PDF read shows no overlap.

---

## Survival summary

| Candidate | Net-new likelihood | Priority |
|---|---|---|
| C1 — `update-protocol-contract-wrapper` zero-timelock + no-validation | **Highest (specific framing not in disclosed Att1/Att2 categories)** | Gate 2 if PDF-read clears |
| C2 — `max-fee` unbounded (Clarity-side) | Medium (cross-class with Rust #1926/#1927/#2033) | Gate 2 if signer-side arithmetic chain found |
| C3 — initial signer-principal = tx-sender at deploy | Very low | Drop — almost certainly DUP |
| C4 — aggregate-pubkeys 0x00 initial-value replay | Very low | Drop — false alarm on closer read |
| C5 — signer-bitmap pass-through on reject-withdrawal | Low (Att2 #40655 cross-class) | Drop unless PDF-read clears |

**Gate 2 escalation: ONLY C1 + C2 are worth carrying forward.** And both are gated on reading the actual Attackathon 1+2 disclosed-findings PDFs to confirm no overlap.

---

## VERDICT

**Gate 2 conditional escalation — 2 candidates (C1 + C2) survive Gate 1.**

Pre-Gate-2 mandate: **MUST read Attackathon 1+2 finding PDFs in full before authoring any Gate 2 submission.** If C1 (`update-protocol-contract-wrapper` zero-timelock) is in those PDFs, drop. If not, escalate as **HIGH-severity finding** (signer-set trust assumption breach + unbounded mint surface), arguing the absence of timelock or candidate-validation as a defense-in-depth violation.

If C2 confirmed in signer-side Rust arithmetic chain, escalate as separate **CRITICAL** (signer halt or fund-loss).

**Substrate verdict:** sBTC Clarity substrate is **TIGHT** — 1148 LOC across 5 contracts, strong assert-guards in deposit + token + bootstrap, defensible code quality. Most of the obvious surface is burned by Att1+Att2. Net-new surface is at the **trust-boundary** (signer-set authority extent, deployment-bootstrapping window) rather than at the implementation level. This is consistent with a heavily-audited 18-month-old peg system.

**Lane 1 anchor pair status:** Stacks (live, heavily-audited) + ALEX (dead-frozen) — **Clarity Lane 1 anchor pair COMPLETE.** Comparative framing for ALEX P4 proposal:
- ALEX: substrate dead, NO active patching, no recent attackathon → low EV
- Stacks: substrate live, 39 fix-candidates in 200 commits, 2 attackathons, embedded security team → MEDIUM EV but extreme saturation

**Doctrine #34 case study:** Stacks is the canonical Post-Audit Composition Multiplier example. Even with 4 audit firms + 2 attackathons + Asymmetric Research embedded, fixes are STILL landing in May 2026 (#2030 Apr 28, #2033 May 6). Composition pressure on a tight substrate keeps surfacing new bugs.

---

## BRAIN COMPOUND PROPOSALS (FROZEN PENDING OPERATOR)

### P1 — Doctrine #35 candidate: "Trust-Boundary Surface Asymmetry" (NEW)

**Anchor:** Stacks `update-protocol-contract-wrapper` (sBTC bootstrap-signers, line 53-60).

**Pattern:** When a contract has an admin function whose authority delta (what changes after the call) is large (e.g., entire protocol-logic swap) AND has fewer defense layers than user-facing functions on the same contract, the asymmetry IS the finding even if individually each defense layer is "correct".

**Test:** count `(asserts! ...)` calls per public function. If admin-function count < user-function count AND admin function blast radius > user function blast radius → flag.

**Stacks example:**
- `complete-deposit-wrapper` (user-facing-ish via signer-multisig): 6 asserts
- `initiate-withdrawal-request` (user-facing): 2 asserts
- `update-protocol-contract-wrapper` (admin, swaps protocol-logic): 1 assert
- **Defense-asymmetry inversion**: most-blast-radius function has LEAST defense

This complements DC-9 (privileged state mutation w/o defense-in-depth) but adds the **comparative** dimension across functions on the same contract.

### P2 — CANDIDATE-Q: "Pre-rotation deploy-bootstrap window" (NEW)

**Anchor:** Stacks `current-signer-principal` init = `tx-sender` at deploy time (sbtc-registry.clar:18).

**Pattern:** Multi-stage protocol deployments where the initial admin/signer/governance value defaults to the deploying EOA, with the intent that a "first rotation" transaction immediately replaces it. The temporal window between deploy + first-rotation = full-admin compromise window for the deployer key.

**Examples to seed:**
- Stacks sBTC: deploy → rotate-keys → multisig active
- Generic Solidity: deploy → transferOwnership(timelock) → renounceOwnership
- Solana Anchor: deploy → set_authority → freeze_authority

**Defense:** atomic deploy + rotate (constructor-equivalent), or compile-time-set immutable signer-principal.

### P3 — Doctrine #34 enrichment: "Post-Audit Composition Multiplier MAGNITUDE"

**Anchor:** Stacks sBTC is the strongest known example of sustained post-audit churn — 4 audit firms + 2 attackathons + embedded security + Hypernative + Staking Defense League + Immunefi bug bounty, AND STILL #2030 + #2033 fixes landing in April-May 2026.

**Quantification proposal:** add a "Composition Multiplier Strength" axis to Doctrine #34 based on fix-rate-density:
- WEAK: <1 fix-commit per 100 commits in last 365d
- MEDIUM: 1-5 fix-commits per 100 commits  
- STRONG: 5+ fix-commits per 100 commits (Stacks sBTC = ~19% = STRONG, given 39 fix candidates in 200 commits)

STRONG-composition substrates warrant continued surveillance even when EV is medium-low — composition pressure surfaces new bugs faster than human review can audit-out.

### P4 — Clarity detector pack prioritization (re-affirms ALEX P4 proposal)

**Anchor:** Manual Clarity triage of Stacks sBTC (this Gate 1) identified 2 net-new candidates (C1 + C2) that a Clarity-aware detector pack would catch automatically:
- `update-protocol-contract-wrapper` no-timelock + no-new-contract-validation (pattern: `(define-public ... contract-address principal)` with assert-count ≤ 1)
- `initiate-withdrawal-request` max-fee unbounded (pattern: `(define-public ...max-fee uint)` with no `(<` or `(<=` assert on max-fee)

**Build trigger from ALEX P4: REINFORCED.** Two Clarity Lane 1 targets in 24h with net-new findings reachable by detector = high ROI for Clarity detector pack build. Recommend including:
- DC-9 sub-3 detector: `(define-public ... new-contract|contract-address principal)` + no `(asserts! ...)` check on supplied principal
- Selective-coverage detector: cross-function assert-count comparison within same contract (function with `principal` admin authority + assert-count < average)
- max-* field bounds check: `(define-public ... max-* uint)` + no `(<` or `(<=` upper-bound assertion

### P5 — Watchlist add: stacks-sbtc/sbtc + stacks-network/stacks-core

Add both repos to the 30-repo watchlist for `buzzshield-watchdog` continuous monitoring. Speedrunner mode on commit-diff. Trigger: any new commit touching `contracts/contracts/*.clar` (high signal — Clarity production substrate untouched for 90+ days, so any change is meaningful).

---

## DISK + CLONE RETENTION

| Item | Size | Action |
|---|---|---|
| `.gate1-work/stacks-immunefi-2026-05-26/sbtc/` (full clone) | 18 MB | RETAIN pending Gate 2 |
| `layer0-sbtc.json` | 60 KB | RETAIN |
| Pre-execution disk | 87% | -- |
| Post-execution disk | 87% (delta negligible) | -- |
| Halt-at-88% margin | 1% — DID NOT BREACH | -- |

Add to `hunts/intake-log.md`:
```
2026-05-26 | Stacks $250K Immunefi | sBTC Clarity + signer | Brain overlap MEDIUM-HIGH | EV adj ~$2K | Queue: Gap-fill | Gate 1 complete | 2 Gate 2 candidates (C1+C2) pending PDF-read DUP-check
```

---

_Gate 1 Hunt: Stacks Immunefi | 2026-05-26 | Authority: Ogie Day 26 morning batch | Lane 1 Clarity anchor pair completes (paired with ALEX)_
