# Audit Reports Library

> TL;DR — Catalog of external audit reports defensively read for methodology learning. No engagement with the auditors; pure intake. Each entry captures audit metadata, severity table, top pattern classes (auditor language + our brain-catalog reframing), runtime-specific gotchas, cross-pollination notes against existing brain entries, and methodology observations. Triggers DC-X candidate enrichment when the audit surfaces a pattern class with productization potential.
>
> Authority: Block 1 Task 1B, Day 17 operator directive.
> Workflow: identical to public-disclosure retrospective intakes (KyberSwap, Raydium, Next.js CVE). Difference: source is an auditor's report, not a post-mortem of a paid-out exploit. Findings are PREVENTED bugs caught during private audit, not live exploits. EV-weight to brain is similar (pattern is real, code shipped post-fix).
> Cyber pause discipline: defensive reading only. No automated pipeline scans on Indentura code. No exploit-chain construction.

---

## Index

| Audit                                                              | Auditor                                                                                | Date                                 | Scope                                                              | Severity (C/H/M/L)            | Brain entry below |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------ | ----------------------------- | ----------------- |
| Indentura PL Vault (Solana private credit, C)                      | Adevar Labs                                                                            | 2026-02-17                           | `src/program-c/src/pl_vault` (after-fix v1)                        | 0 / 2 / 2 / 5                 | §1 below          |
| M0 Extensions (Solana yield-bearing wrapped-token framework, Rust) | Adevar Labs                                                                            | 2025-07-02                           | `programs/m_ext` + `programs/ext_swap` + `programs/ext_earn` PR125 | 1 / 0 / 3 / 2                 | §2 below          |
| Veda (BoringVault EVM yield-vault framework)                       | Spearbit (Cantina) + 0xMacro ×13                                                       | 2024-2026 ongoing                    | BoringVault + Manager + Teller + Accountant + ~40 decoders         | N/A — profile only            | §3 below          |
| cap (Ethereum stablecoin + restaking-backed credit, EigenLayer)    | Zellic + Trail of Bits + Electisec + Spearbit ×2 + Recon + Sherlock + Certora + Octane | 2025-03 → 2026-03                    | cUSD / stcUSD / Vault / Minter / Delegation / Oracle / cap-yearn   | N/A — profile only (9 audits) | §4 below          |
| Polygun (Polymarket copy-trading Telegram bot, off-chain TS)       | Pashov Audit Group ×3                                                                  | 2026-02-17 / 2026-03-25 / 2026-04-16 | Off-chain TS/Postgres/BullMQ codebase + Gnosis Safe relayer        | 0 / 6 / 15 / 78 (101 total)   | §5 below          |
| Spicenet (Sovereign-SDK rollup settlements module, Rust)           | Pashov Audit Group                                                                     | 2026-04-06                           | `crates/settlements/src/*` (execute_intent_auth, process_tx, etc.) | 0 / 2 / 3 / 10                | §6 below          |

Future audits filed under this catalog at the bottom, with the same schema.

---

## §1 — Indentura Private Credit Vault (Adevar Labs, 2026-02-17)

> **DC-8 cross-reference (2026-05-19):** Pattern class 3 (L02 + L03) — missing on-chain account binding, relying on off-chain co-signer — is anchor #1 for DC-8 ("Anchor-Signer-Validation-Moved-From-Accounts-Struct-To-Function-Body — Refactor Regression Class"), PROMOTED 2026-05-19 per operator msg 7259 §5A. Full DC-8 entry: `brain/Patterns-Defense-Classes.md` DC-8 section.

### Audit metadata

- **Auditor:** Adevar Labs (boutique Solana-specialist; team origins in Bitdefender, Asymmetric Research, Quantstamp, Chainproof, Juicebox; 100+ audits portfolio; Code4rena + Sherlock contest placements)
- **Engagement type:** Private audit + fix review (after-fix version of report)
- **Target:** Indentura PL Vault — Solana private credit investment protocol
- **Language:** **C** (not Rust/Anchor — unusual for Solana)
- **Scope:** `src/program-c/src/pl_vault` (single module)
- **Repository:** `https://github.com/millionsols/Solana-RWA-Private-Credit-Vault`
- **Before-fix commit:** `c5d5a048be071f66e57732cd5f6ee3c62df01259`
- **After-fix commit:** `d1e1eb4700a4b56a880ee6bdefc751d5764e4884`
- **Report path (local):** `/home/claude-code/buzz-workspace/.tmp-audit/adevar/reports/2026-02-17_Indentura_Private_Credit_Vault_audit_report.pdf`

### Architecture summary

Indentura PL Vault is a Solana-native, C-language private-credit-vault protocol with the following flow:

1. **Vault lifecycle:** admin creates a time-bounded vault (states: NONE → OPEN → CLOSE → END). State transitions enforced off-chain by admin (the program does NOT enforce sequential transitions — flagged as centralisation risk).
2. **Deposit (user, OPEN state):** user transfers USDC into an intermediate PDA-owned ATA; program checks `available == deposit_usdc` strict equality; on pass, USDC moves to pool ATA and user receives SPL share tokens 1:1.
3. **Off-chain investment (admin, CLOSE state):** admin calls `admin_withdraw()` to pull USDC out of pool to deploy off-chain into private credit. Each call recalculates `dollar_per_dollar` ratio = `(deposit - withdraw) * 1e6 / deposit`.
4. **Performance update:** admin reports investment returns by updating `dollar_per_dollar` (1e6 = 100% par; <1e6 = loss; can be >1e6 conceptually for gain).
5. **Withdraw (user, END state):** user redeems SPL shares for USDC at the final `dollar_per_dollar`. Payout = `available_spl * dollar_per_dollar / 1e6` (or just `available_spl` if ratio == ONE_DOLLAR).
6. **Gatekeeping:** every user instruction (deposit / withdraw / claim / stake / unstake) requires Thor backend co-signer signature. Thor is a hardcoded pubkey baked into the program (no rotation mechanism).
7. **Centralisation surface (per audit):** admin controls vault state, can withdraw entire pool without timelock, unilaterally sets payout ratio (no on-chain verification of off-chain reporting), can extend lock period after user deposits, admin pubkey == royalties destination pubkey.

### Severity-count table

| Severity    | Count  | Status                     |
| ----------- | ------ | -------------------------- |
| Critical    | 0      | —                          |
| High        | 2      | Fixed                      |
| Medium      | 2      | Fixed                      |
| Low         | 5      | Fixed                      |
| Enhancement | 6      | Fixed/Ack                  |
| **Total**   | **15** | All resolved before launch |

### Top-3 pattern classes — auditor framing + brain reframing

#### Pattern class 1: silent uint64 overflow on intermediate-term multiplication (H01 + H02)

- **Adevar framing:** "Admin withdrawal can trigger silent uint64 overflow, resulting in `dollar_per_dollar` value corruption" (H01). "User withdrawal exceeding ~$20M can trigger silent uint64 overflow, resulting in fund loss for users" (H02).
- **Concrete site:** `dollar_per_dollar = (deposit - withdraw) * 1_000_000 / deposit` (admin.h:281-291) AND `withdraw_usdc = available_spl * dollar_per_dollar / ONE_DOLLAR` (pl_vault.c:439). Both compute `(uint64) * (uint64)` intermediate that overflows at ~1.845e19 = ~$18M-$20M scale.
- **Concrete impact:** user surrenders 20.5M USDC worth of SPL shares, receives ~3,250 USDC (a fraction of 1‱). Step-by-step: `20.5e6 * 1e6 * 9e5 = 1.845e19`; wraps to ~3.25e15; divide by 1e6 = 3.25e9 ≈ 3,250 USDC.
- **Fix:** cast to `__uint128_t` for the intermediate; check against `UINT64_MAX` before downcast; revert if overflow.
- **Brain reframing:** **arithmetic-rounding-asymmetry / overflow-on-intermediate-term** class. NOT exactly CANDIDATE-E (Raydium symmetric-pair-rounding) — that was per-side short-circuit on ceiling. This is a different sub-pattern of the same FAMILY: **fixed-precision arithmetic on a calculation where the intermediate term exceeds the result-type bit-width**. The bug fires at production-scale TVL ($20M is not exotic for private credit). The fix recommendation (use a wider intermediate type, check bounds before downcast) is a deterministic Layer-1b detector candidate.
- **Productization signal:** **HIGH**. Solana programs in C have NO built-in checked-math (unlike Rust's `checked_mul`). This pattern is broad-surface across any Solana-C codebase using uint64 financial arithmetic. Detector spec: grep for `uint64_t X = A * B` (or `*=`) where A and B are both uint64 token-amount-class variables and the result is consumed in a downstream fund-flow (`sendToken`, `transfer`, payout calculation), without an explicit `__uint128_t` cast on the multiplication. Estimated FP rate manageable (only catches one specific shape; downstream-fund-flow gate is strong).

#### Pattern class 2: missing slippage protection on multi-block-settled withdrawal (M01)

- **Adevar framing:** "Missing slippage protection in ACTION_WITHDRAW allows user payout to differ from expected value at time of transaction." If admin's `admin_withdraw()` lands in the same block as a pending user `ACTION_WITHDRAW`, user gets reduced `dollar_per_dollar` without consenting.
- **Concrete site:** `pl_vault.c:438-466`. No `min_output` field in user instruction data. User signs against the `dollar_per_dollar` at tx-construction time; on-chain execution may use a different value.
- **Fix:** add `min_output` to instruction data, revert if `withdraw_usdc < min_output`. OR (developer's chosen fix) block withdrawals while vault is in `STATE_VAULT_CLOSE` (the only state where ratio can change).
- **Brain reframing:** **temporal-state-mutability between user-sign and on-chain-execute** class. Similar in spirit to the EIP-712 deadline / DEX trade slippage class on EVM. On Solana, the gap is the same: tx is constructed against an observed state, but state can mutate between observation and execution. The state-segregation fix (forbid the ratio-changing action while withdrawals are accepted) is a clean alternative to the slippage-parameter fix — segregates the temporal window so the state CAN'T change while user-signs are pending. The state-segregation fix maps to: **mutually-exclusive state machines for "rate-change-allowed" vs "user-withdraw-allowed"**.
- **Productization signal:** **MEDIUM**. Class is well-known on EVM (every DEX has slippage). Solana-specific framing: any time a user-signed transaction reads a mutable state value, that value must either be (a) bounded by user-supplied min/max, or (b) provably stable within the validity window. Detector spec for L1b: find user-callable instruction handlers that compute payout from a `vault->*` / `pool->*` / `state->*` mutable field WITHOUT a paired user-supplied min/max parameter. Higher FP rate than overflow detector (many legit cases) but tractable.

#### Pattern class 3: missing on-chain account binding, relying on off-chain co-signer (L02 + L03 — note: classified Low but the family is severity-rich)

- **Adevar framing — L02:** "Staking account lacks on-chain binding to signer, relying solely on off-chain enforcement." Program writes user-specific data to `account_user_staking` without verifying that account is derived from `account_signer`'s wallet. Off-chain Thor co-signer is the only check.
- **Adevar framing — L03:** "Vault account not validated against vault seed in user instructions." Program reads vault state from `account_vault` (ka[8]) but never checks that the vault matches `action->vault_seed`. Same family: on-chain account binding deferred to off-chain co-signer.
- **Concrete impact:** if Thor co-signer is bypassed (key compromise / off-chain logic bug), attacker can pass victim accounts as inputs and overwrite their state OR pass mismatched (vault_state, vault_pool) pairs to exploit favorable `dollar_per_dollar` / time-window from one vault on funds owned by another.
- **Fix:** add PDA-derivation check OR memcmp comparison between the on-chain-account-data and the instruction-supplied seeds.
- **Brain reframing:** **canonical Solana "trust-the-co-signer" anti-pattern**. This is THE Solana-specific gotcha most worth productizing. On EVM, you cannot defer a `require(msg.sender == ...)` check to an off-chain co-signer without explicit on-chain verification. On Solana, the program can ACCEPT account inputs without validating their derivation, leaving the "is this the right account?" decision entirely off-chain. Adevar's framing — _"an on-chain program should not rely on an off-chain component for security"_ — is the canonical statement of the principle. This pattern is unique to Solana's accounts model and worth its own DC-X candidate slot.
- **Productization signal:** **VERY HIGH** for Solana. Detector spec for L1b/L3.5: for any account that program writes to (via deserialization + field-set + serialize back), verify that EITHER (a) the program performs a PDA-derivation check against the signer's pubkey, OR (b) the account contains a `wallet` / `owner` / `authority` field that is checked against the signer. If neither, flag as "trust-the-co-signer anti-pattern." Cross-program-invocation chains often hide this.

### Solana / C-runtime-specific gotchas surfaced

1. **No checked-math primitive in C** (vs Rust's `checked_mul`, `safe_math` on EVM since Solidity 0.8). H01 + H02 are the canonical case. Buzz brain catalog should treat `*.c` Solana programs as a HIGHER-RISK class than Rust/Anchor for arithmetic-overflow class. Adevar's fix recommendation (cast to `__uint128_t`) is the C idiom but the bug class is structural to the language choice. → cross-pollination candidate: any Solana-C program; relatively small set, likely <10 protocols on mainnet.

2. **No account discriminator** (E01, "Adding discriminator fields to account structs would harden deserialization against type confusion"). Native C programs don't get Anchor's 8-byte SHA256(account_name) discriminator for free. Program validates account type ONLY by ownership + size. Type confusion possible if a future account struct happens to match an existing struct's size. → cross-pollination candidate: any native Solana program (Rust or C) WITHOUT Anchor.

3. **ATA front-running for DoS** (M02, "Anyone can block user deposits by sending 1 lamport of USDC to their intermediate ATA"). Solana ATAs are deterministically derived from `(wallet, mint)` — anyone can compute any user's ATA and send tokens to it pre-emptively. Combined with strict-equality balance check (`available == deposit_usdc`), this becomes 1-lamport DoS. → cross-pollination candidate: any Solana program with strict-equality balance check on user-controlled ATA. The fix is `>=` check + use the actual observed balance OR sweep-all-balance pattern.

4. **`bool` vs `uint64_t` implicit conversion** (L05, "Broken clock check could allow manipulation of time-dependent vault logic"). The function returns `ERROR_INVALID_INSTRUCTION_DATA` (a non-zero uint64) from a bool-typed function. Implicit `uint64 → bool` conversion treats any non-zero as `true`, so the failure path was returning "success." → cross-pollination candidate: any C codebase with `bool`-typed functions returning enum-error constants. Detector: grep for `bool foo(...)` returning anything other than `true` / `false` / a `bool` expression.

5. **Hardcoded co-signer keypair with no rotation** (centralisation risk listed in Assumptions). Admin and Thor co-signer pubkeys are hard-coded in the program. Compromise requires full program redeployment. → not a vulnerability per se, but worth noting as a deployment-class anti-pattern for any private-credit Solana protocol.

6. **No state-transition enforcement** (admin assumption: NONE → OPEN → CLOSE → END). Program does not validate the order of state transitions; admin can revert from CLOSE back to OPEN. → cross-pollination candidate: any Solana program with state-machine vault. Detector: when state field is set, verify the transition is in an explicit `allowed_transitions[old_state] = {new_state, ...}` set.

7. **Vault reinitialization** (L04, "Missing state_vault check in ACTION_ADMIN_CREATE_VAULT allows reinitialization of active vaults"). Admin can call CREATE_VAULT on an already-OPEN/CLOSE/END vault and overwrite `deposit=0, withdraw=0, dollar_per_dollar=1e6`. → cross-pollination: classic "init function should be one-shot" class; Solana-specific framing is that PDAs persist across calls so the init guard must be explicit. Detector: any init handler that doesn't check the account's current state is in NONE/uninit before writing init defaults.

### Cross-pollination notes — Huma V1 EVM parallel + divergence

> **Honesty note:** brain references "Huma V1 INV-2 (lending domain, same integrity class)" as a sibling for state-machine integrity (`brain/Cross-Domain-Fragility-Laws.md` line 173, 252; `brain/Disclosure-Programs-Top-Tier.md` line 26, 93). No detailed Huma V1 intake artifact exists in `incidents/` at filing time. Cross-pollination below is at the **family level** (private-credit / lending state-machine integrity), which IS the documented connection — NOT an artifact-level diff that would require the Huma intake file.

**Family-level parallels (Indentura ↔ Huma V1 lending state-machine integrity):**

1. **Vault-as-state-machine.** Both protocols model the vault as a state machine (Indentura: NONE → OPEN → CLOSE → END; Huma V1 implied: similar deposit/active/redeem lifecycle). The state-machine integrity class — "transitions out-of-order break invariants" — applies to both. Indentura L04 (CREATE_VAULT can re-init active vault) is the canonical case for this family on Solana. Huma V1 INV-2 is the lending-domain sibling.

2. **dollar_per_dollar / NAV-update centralisation.** Indentura's `dollar_per_dollar` is the on-chain proxy for off-chain investment performance, set unilaterally by admin. EVM private-credit vaults (Huma class) use a similar NAV-update mechanism — operator updates the per-share value, no on-chain attestation of underlying performance. Same trust assumption, different runtime expression. Both protocols carry centralisation risk in the NAV-update authority. Both should be flagged as "operator-trusted NAV" in any future scoring.

3. **Withdrawal-timing slippage (M01).** Indentura's M01 — user withdrawal slippage when admin updates NAV mid-block — has direct analog in any EVM private-credit vault where NAV is updated atomically and user redemptions reference the post-update NAV. Same class, different runtime; the fix patterns (slippage parameter OR state-segregation) translate cleanly.

**Solana-runtime DIVERGENCES that wouldn't appear in EVM Huma V1:**

| Solana-only class                           | Indentura case | Why it wouldn't appear on EVM                                                                           |
| ------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------- |
| Account-discriminator confusion             | E01            | Solidity types are static; cross-type confusion needs explicit ABI mismatch (e.g. proxy storage clash)  |
| ATA front-running for DoS                   | M02            | ERC-20 balances don't deterministically depend on caller-controlled keys (no ATAs)                      |
| PDA / vault-seed binding gap                | L03            | EVM has no PDA model; "wrong contract address" is a different failure mode (and usually caller's fault) |
| Staking-account ownership binding           | L02            | EVM `msg.sender` is the canonical caller; no separate "is this the right state account?" question       |
| Co-signer baked into program (Thor)         | Centralisation | EVM uses on-chain signer-set contracts (e.g. Gnosis Safe); rotation is a method call, not a redeploy    |
| C-runtime uint64 overflow (no checked math) | H01 + H02      | Solidity 0.8+ has checked math by default; Yul / inline assembly is opt-in unchecked                    |
| `bool` vs uint64 implicit conversion        | L05            | Solidity has strict `bool` type; no implicit numeric → bool conversion                                  |

The Solana-runtime divergences are the **highest-value addition to brain** from this audit. They give us 5 Solana-specific patterns that EVM-anchored brain entries (Huma V1, KyberSwap, Sky, Wormhole) won't surface. The intersection class — **fixed-precision arithmetic intermediate-term overflow** — generalises across runtimes IF the runtime lacks default checked math (Solana-C, Solana-Rust pre-`checked_mul`, EVM <0.8, Move's u64 ops, Cairo numeric ops).

### Auditor methodology observations

Adevar's stated methodology (Page 33-34 of report):

1. **Phase 1 — Program Context and Architecture Analysis:** documentation review, account-design mapping, instruction-flow tracing, SPL Token / Stake / System Program integration check.
2. **Phase 2 — Threat Modeling:** Solana-specific threat surface (account-data manipulation, ownership/signer verification, PDA misuse, CPI privileges, rent-exemption/init logic).
3. **Phase 3 — In-depth Manual Security Review:** "line-by-line inspection" — explicitly manual, not tool-first. Coverage list aligns with our DC catalog (ownership/signer/CPI/overflow/deserialization/SPL-token/state-transition/input-validation/DoS).
4. **Phase 4 — Detailed Fix Review and Validation:** explicit fix-review pass on every finding before report finalization.

**Tools mentioned:** none explicitly. The marketing material mentions "custom fuzzers, exploit modeling, and runtime testing frameworks" but the methodology section is explicitly manual-review-led. No formal-methods (no Z3, no symbolic execution, no proof-of-correctness toolchain) referenced.

**Comparison to Buzz V6 pipeline:**

- Adevar Phase 1+2 = our L1d Phase 1-3 (inventory, entry points, state mutation tracking) + threat-model overlay.
- Adevar Phase 3 = manual analog of our L1d Phase 4 (paired-function), Phase 8 (access control), Phase 12 (economic invariants), augmented with hand-rolled Solana-account-model intuition.
- Adevar Phase 4 = our Layer 9 Feedback (outcome tracking) — but they execute it per-engagement, not cross-target.
- **Gap in their methodology:** no LLM-augmented adversarial pass (our L4 Skeptic), no SMT path satisfiability (our L5 Z3), no auto-PoC scaffolding (our L3 pentest). They make up for it with deep manual review by Solana-specialist humans, which costs more per-engagement but ships high-precision findings (15/15 fix-review-resolved, 0 flagged-then-disputed).
- **Strength in their methodology:** the threat-modeling phase explicitly enumerates Solana-runtime threats (PDA misuse, CPI privileges, rent-exemption, init logic). Our brain catalog has DC-1..6 strongly EVM-biased. **This audit highlights that we need a Solana-specific defense-class layer (DC-Sol-1..N) to surface these classes deterministically.**

### Productization candidates surfaced (NOT promoted; operator decides)

1. **CANDIDATE-G (proposed): Solana-Off-Chain-Cosigner-Trust-Boundary.** Active when: a Solana program writes to an account whose derivation is supplied as instruction data (not derived on-chain from the signer's pubkey). Defense: PDA derivation check OR `account->wallet == signer->key` check. Anchor: Indentura L02 + L03. This is **THE** canonical Solana antipattern; productizing it would yield a high-value Solana-specific detector with low FP rate. Worth its own DC slot if the next 1-2 Solana audits we read also surface it. **Status: CANDIDATE, not promoted; awaiting 1+ adjacent worked example.**

2. **CANDIDATE-H (proposed): C-Runtime-Uint64-Overflow-On-Multiplicative-Intermediate.** Active when: Solana C program computes `uint64 = uint64 * uint64` where both operands are token-amount-class variables (i.e., scaled by 1e6 or larger) AND the result feeds a downstream fund-flow. Defense: cast to `__uint128_t`, check against `UINT64_MAX`, downcast. Anchor: Indentura H01 + H02. **Status: CANDIDATE, not promoted; awaiting 1+ adjacent worked example. Solana-C ecosystem is small but high-EV — overflow in a private-credit C program is canonically 7-figure.**

3. **CANDIDATE-E enrichment.** Raydium symmetric-pair-rounding (CANDIDATE-E in `Patterns-Defense-Classes.md`) is closely adjacent to Indentura H01/H02. Both are "fixed-precision arithmetic that breaks at scale because the math is wrong at the bit-width level." Worth noting in CANDIDATE-E that the family includes BOTH per-side ceiling short-circuits (Raydium) AND multiplicative-intermediate overflow (Indentura), as two siblings of the same parent class "fixed-precision arithmetic surface gaps." This enrichment goes into `Patterns-Defense-Classes.md` as a CANDIDATE-E family-extension note (filed in same patch as this entry).

### URGENT-flag scan

- **Are we hunting any of these patterns RIGHT NOW in another protocol?** Checking against active hunts in `hunts/` and `brain/Disclosure-Programs-Top-Tier.md`:
  - **Sky vault state-machine** (top of H2 priority): Indentura's state-machine reinit (L04) + slippage-temporal (M01) are direct analogues for the vat/vow/dog/clip pipeline. **Worth a Sky-specific check: does any liquidator-trigger reset a vault state during an active auction? Does any user-callable redemption reference a NAV that admin can mid-block update?**
  - **Wormhole guardian attestation** (deferred on THORChain PM): no direct overlap (Wormhole is consensus-signer-set, Indentura is single-co-signer-bake). Not urgent.
  - **CANDIDATE-D (KyberSwap startSqrtP-equality)**: state-machine integrity sibling. Indentura adds a worked example in lending domain (admin reinit can corrupt vault economics) — this is the **second** worked example for CANDIDATE-D's family (KyberSwap + Indentura + Huma V1 reference). If we count Indentura as a same-family worked example, CANDIDATE-D moves closer to DC-7 promotion threshold (2 → 3 with Indentura). **Operator decision: does Indentura's L04 count as a same-family worked example for CANDIDATE-D promotion?** Default-stance: file as adjacent-but-distinct (state-machine integrity, but the violation is "init guard missing" not "tick-recomputation-gate wrong reference") — same family, different sub-pattern.

- **No emergency. Logged as situational-awareness for the Sky hunt.**

### Why this entry compounds the brain

Indentura is the **first Solana audit** in the brain catalog. Until now, brain has been EVM-heavy (KyberSwap, Sky, Wormhole, Polygon, Next.js + the Stride/Cosmos and Cosmos-SDK-Go intakes). The Indentura intake:

1. Anchors **two CANDIDATE Solana-specific defense classes** (CANDIDATE-G off-chain-cosigner, CANDIDATE-H C-runtime-overflow) that NO existing brain entry covers.
2. **Cross-pollinates the private-credit-vault class across runtimes** (Huma V1 EVM ↔ Indentura Solana-C). Same family, different runtime. Validates that the family is real and surfaces runtime-specific specialisations.
3. **Provides a high-quality auditor methodology benchmark** (Adevar — manual-led, Solana-specialist, 100% fix-resolution). Useful for calibrating our own pipeline's coverage on Solana targets.
4. **Reveals brain's EVM bias.** Our DC-1..6 catalog is heavily EVM-shape-biased. Indentura demonstrates we need a Solana-specific layer to surface PDA-derivation gaps, ATA front-running, account-discriminator confusion, etc., before we can claim parity coverage on Solana targets.

---

## §2 — M0 Extensions (Adevar Labs, 2025-07-02)

> **DC-8 cross-reference (2026-05-19):** Pattern class 1 (Finding #1, Critical) — `Signer<'info>` without `has_one` on whitelist-mutators — is anchor #2 for DC-8 ("Anchor-Signer-Validation-Moved-From-Accounts-Struct-To-Function-Body — Refactor Regression Class"), PROMOTED 2026-05-19 per operator msg 7259 §5A. Full DC-8 entry: `brain/Patterns-Defense-Classes.md` DC-8 section.

### Audit metadata

- **Auditor:** Adevar Labs (same firm as §1; profile + methodology details documented there — see §1 "Auditor methodology observations")
- **Engagement type:** Private audit + fix review (after-fix version of report)
- **Target:** M0 Extensions — Solana yield-bearing wrapped-token framework (m_ext + ext_swap + ext_earn). Enables creation of yield-bearing wrapped tokens based on the M token, with admin-configurable fees and Token2022 ScaledUI multipliers for yield distribution
- **Language:** **Rust / Anchor** (contrast vs §1 Indentura which was C — same auditor, totally different runtime + idiom set)
- **Scope:**
  - `solana-extensions` repo, commit `fc4d9343961092f31b19440915f64a9e5ab00c3e` — `programs/m_ext` (core extension program) + `programs/ext_swap` (token swap program)
  - `solana-m` repo, commit `8551bcb5f954a59a7cb677cfc72d244941d09c4b` — `programs/ext_earn` (yield distribution, LIMITED REVIEW per PR #125 only)
- **Exclusions:** Frontend components, off-chain infrastructure, third-party dependencies
- **Repository (current):** `https://github.com/m0-foundation/solana-extensions` + `https://github.com/m0-foundation/solana-m`
- **Report path (local):** `/home/claude-code/buzz-workspace/.tmp-audit/adevar/reports/2025-07-02_M0_MExtensions_audit_report.pdf` (35 pages)
- **P2-substitution note:** filename is `MExtensions` (= M Extensions framework) in repo; Day 17 evening digest queue named it "M0 Extensions" — these are the same artifact. NO substitution occurred. NO M0_Extensions-specific file exists; `2026-01-21_M0_Portal` and `2026-01-23_M0_Liquidity_Delivery` are different M0-ecosystem audits and were NOT used.

### Architecture summary

M0 Extensions is a Solana-Rust yield-bearing wrapped-token framework with the following flow:

1. **Two-program architecture:** `m_ext` manages individual extension tokens (one program instance per wrapped-yield variant); `ext_swap` facilitates swaps between different extension tokens. `ext_earn` (out-of-primary-scope, in `solana-m` repo) handles yield-source index updates and yield transfer validation.
2. **Wrap (user, m_ext):** user deposits M tokens; receives EXT tokens 1:1 at the current multiplier. EXT tokens are Token2022 with ScaledUI extension — the multiplier IS the yield.
3. **Yield accrual (off-chain trigger, on-chain math):** `sync_multiplier` recomputes `new_multiplier = (last_ext_multiplier * (new_m_multiplier / last_m_multiplier))^(1 - fee)`. This is the `powf` call that became the central technical-debt cluster (see Finding #3).
4. **Unwrap (user, m_ext):** user surrenders EXT tokens; receives M tokens at the current multiplier (= principal + accrued yield - fees).
5. **Inter-extension swap (user, ext_swap):** user holds EXT-A, swaps to EXT-B via unwrap-then-rewrap routed through `ext_swap`. Whitelist gates which extensions are swappable.
6. **Admin surface:** admin can set fees, whitelist/delist extensions, whitelist/delist wrap authorities, set the underlying M mint (later removed per Enhancement #7), claim accumulated fees.
7. **Solvency invariant:** `vault_balance >= principal_to_amount_down(total_ext_supply, current_multiplier) - 2` — the protocol must always hold enough M to redeem all outstanding EXT at current rate.

### Severity-count table

| Severity    | Count  | Resolved   | Acknowledged (won't-fix) |
| ----------- | ------ | ---------- | ------------------------ |
| Critical    | 1      | 1          | 0                        |
| High        | 0      | —          | —                        |
| Medium      | 3      | 3          | 0                        |
| Low         | 2      | 1          | 1                        |
| Enhancement | 8      | 7          | 1                        |
| **Total**   | **14** | 12 + 1 Ack | 1 won't-fix              |

(Risk profile table in report lists "Low: 3 (1 fixed, 2 acknowledged)" but only 2 Low findings exist in §4 — the discrepancy is likely a typo in the report's risk profile vs the actual finding count. We use the actual count.)

### Top-3 pattern classes — auditor framing + brain reframing

#### Pattern class 1: missing admin access control on whitelist mutators (Finding #1, Critical)

- **Adevar framing:** "Missing admin access control for whitelisting operations in ext_swap" — four whitelist-mutator handlers (`WhitelistExt::handler`, `WhitelistUnwrapper::handler`, `RemoveWhitelistedExt::handler`, `RemoveWhitelistedUnwrapper::handler`) lack any admin authorization. Anyone can call them. The `admin: Signer<'info>` field is declared but never enforced via `has_one = admin`.
- **Concrete site:** `programs/ext_swap/src/instructions/whitelist.rs:13-27` — Anchor `#[account(...)]` block has `seeds`, `bump`, `realloc::payer = admin`, `realloc::zero = false` — but NO `has_one = admin` constraint and NO inline `require!(signer.key() == swap_global.admin)`.
- **Concrete impact:** any address can add fake EXT programs to the whitelist (route legitimate swap flow through attacker-controlled fake "extension") OR remove real extensions from whitelist (DoS legitimate swap routes). For a swap protocol, both shapes are critical-economic.
- **Fix:** add `has_one = admin @ ExtError::NotAuthorized` constraint to each whitelist-mutator's account block.
- **Brain reframing:** **canonical Pattern A admin-unprotected mutator (Solana / Anchor variant)**. On EVM this would be a `function foo() public { state.x = y; }` with no `onlyOwner`. The Solana/Anchor variant is structurally identical — `Signer<'info>` field present but no `has_one` binding. Particularly insidious in Anchor because the `Signer<'info>` field LOOKS like authorization but only attests that _some_ signature was provided; binding to a specific authority requires the explicit `has_one` constraint.
- **Cross-pollination vs Indentura §1:** Indentura's L02/L03 was the inverse failure (account-binding deferred to off-chain co-signer); M0 Extensions' Finding #1 is admin-binding-not-declared-at-all. Both belong to the **Solana account/signer binding gap family** but at different levels: Indentura = account-pubkey check missing; M0 Ext = signer-pubkey check missing on admin role. Together they suggest a Solana-specific defense class around "declared-but-unenforced authority bindings" — see Cross-pollination Notes section below.
- **Productization signal:** **VERY HIGH** for Solana-Anchor. Detector spec: AST-grep all Anchor `#[derive(Accounts)]` structs containing a `Signer<'info>` field plus a sister `Account<'info, T>` field where T has an `admin` / `owner` / `authority` field. Verify either `has_one = admin` constraint OR inline `require!` in the handler. Low FP rate: the antipattern is structurally distinct. **Strong CANDIDATE-G enrichment** (or a CANDIDATE-G sibling, depending on whether operator treats account-binding + signer-binding as one family or two).

#### Pattern class 2: floating-point non-determinism causing solvency-check stall (Finding #3, Medium)

- **Adevar framing:** "Imprecise multiplier calculus could lead the token to become insolvent" — `calculate_new_multiplier` uses Rust `f64` for `(last_ext * new_m / last_m)^(1 - fee_bps/10000)` via `powf`. Float rounding causes the resulting multiplier to round UP instead of down for certain input domains, producing a `last_ext_index` larger than mathematically correct. Downstream solvency check `vault_balance >= total_ext * multiplier` then trips, halting the entire program until either (a) more M tokens are deposited, or (b) a new M index arrives. Adevar's PoC: with a $200M flashloan, the user can grief-stall the program at a cost of $0.20 (some flashloan providers offer 0% fee, so the grief cost approaches Solana tx fees only).
- **Concrete site:** `programs/m_ext/src/utils/conversion.rs:224-228`. The `INDEX_SCALE_F64` cast back to `u64` via `.floor()` is the rounding step where the bug crystallizes.
- **Concrete impact:** programmatic griefing — attacker stalls protocol with near-zero cost. Not a fund-extraction bug; an availability bug. But for a yield protocol, multi-hour stalls during high-volume periods cascade into integrator failures (DEXes routing through M Extensions, lending protocols holding M Extensions as collateral).
- **Fix (per Adevar):** three options — (a) deterministic Taylor-series approximation of `powf` (Appendix A worked out the math, max error 0.45% on `x ∈ [1, 1.1]`, `y ∈ [0.01, 1]`, always underestimating to preserve solvency); (b) redesign fee model to avoid exponentiation entirely (linear or logarithmic fee); (c) relax the solvency check to tolerate lamport-level rounding noise. Developer chose **option C** — removed the check, replaced last-index-claimed with global-index reference.
- **Brain reframing:** **floating-point-on-deterministic-VM class**. Solana is a deterministic execution environment — every validator must reach byte-identical state after a tx. `f64` operations are platform-dependent (x86 vs ARM vs other architectures can produce different rounding in the last bits of mantissa) and SHOULD NOT be used in any consensus-critical computation. This is a Solana-architecture-class anti-pattern: any `f64` / `f32` in a program is a structural smell. The fact that M0 needed `f64` to interface with Token2022's ScaledUI multiplier (which is a 64-bit float interface) is the system-level tension. Adevar's deterministic-approximation recommendation (Taylor series with always-underestimate property) is the textbook fix.
- **Productization signal:** **MEDIUM** for Solana. Detector spec: grep for `f64` / `f32` types in any Solana program's source. Most legitimate Solana programs use `u64` + fixed-precision throughout; `f64` is almost always a smell. False positives expected on UI-only display computations (acceptable per Adevar's framing — "purpose is purely UI"); high-quality smell on any computation feeding into a downstream consensus-impacting decision (solvency check, fee distribution, vault state). Worth filing as **new CANDIDATE-K candidate** if a second worked example surfaces.

#### Pattern class 3: retroactive fee application on accumulated yield (Finding #2, Medium)

- **Adevar framing:** "Retroactive Fee Application" — `set_fee` updates the protocol fee without first calling `sync_multiplier`. Any yield accumulated since the last sync gets retroactively re-priced at the new fee rate. If admin raises the fee from 1% → 5% mid-yield-period, users surrender 5% of yield they earned under the 1% expectation.
- **Concrete site:** `programs/m_ext/src/instructions/set_fee.rs:41`. Missing prerequisite call to `sync_multiplier` before fee mutation.
- **Concrete impact:** user-trust violation; loss-of-funds for users in proportion to (unsynced-yield × delta-fee). Magnitude bounded by yield-since-last-sync, which is small per-period but cumulative across users.
- **Fix:** call `sync_multiplier` first (locking in old fee on past yield), then update the fee variable (applying new fee to future yield only).
- **Brain reframing:** **temporal-state-mutation ordering class — set-config-after-settlement antipattern**. Generalises: ANY config variable (fee, rate, threshold) that's read by an accumulator function should be settled (`sync` / `drip` / `harvest` / `update`) BEFORE the config mutation. Failure to do so re-prices the unsettled accumulation at the new config. EVM analogue: Compound v2's `accrueInterest()`-before-`setReserveFactor()` ordering; Sky stUSDS's `drip()`-before-`file("ssr")` ordering. CANDIDATE-J's stUSDS reference checklist already covers this as Point 5 ("Drip-after-file in halt: when MOM unhalts, drip() must apply correctly across the halt window (no lost time, no double-credit)"). **Direct cross-pollination with CANDIDATE-J** — M0 Extensions' Finding #2 is a sibling worked example (same class, accumulator-vs-config ordering, different protocol).
- **Productization signal:** **MEDIUM**. Detector spec for L1b: in any Anchor handler that mutates a config field (`set_*`, `update_*`, `configure_*`), check whether the handler calls a sync/settle/accrue function FIRST. Heuristic but tractable.

### Solana / Anchor / Rust-runtime-specific gotchas surfaced

1. **Anchor `Signer<'info>` is NOT authorization, only attestation** (Finding #1). The field declares "some signer is present" but does NOT bind that signer to a specific authority. Authority binding requires either `has_one = field_name` in `Account<'info, T>` constraint OR explicit `require!(ctx.accounts.signer.key() == ctx.accounts.state.admin)` in the handler. This is THE most common Anchor antipattern — easy to miss because the type system makes it look secure. → cross-pollination candidate: any Anchor program with `Signer<'info>` and an admin-bearing state account. The detector is structural and FP-low.

2. **Token2022 ScaledUI requires `f64` interface, which conflicts with deterministic execution** (Finding #3, Enhancement #1). Solana's Token2022 extension `ScaledUiAmount` takes a `f64` multiplier — the on-chain SPL Token2022 implementation accepts this and does its own deterministic-conversion internally. But ANY computation OUTSIDE Token2022 that produces this `f64` is on the program's shoulders for determinism. Programs that compute the multiplier via Rust `powf` inherit `f64` non-determinism unless they implement deterministic approximation. → cross-pollination candidate: every Solana program using Token2022 ScaledUI with computed (not constant) multipliers.

3. **Init-function front-running on Solana** (Finding #5, acknowledged as low risk). The `initialize` instruction can be called by anyone if not bundled with mint creation in the same transaction. Attacker can race the legitimate deployer, set themselves as admin. Mitigation: bundle mint-creation + initialize in a single tx, OR verify deployer pubkey against a hardcoded list. M0 chose to accept the risk (deployment-process discipline). Same family as Indentura's vault-reinit (§1 L04) but different mechanism — Indentura's was admin-callable re-init on an already-initialized state; M0 Ext's is anyone-callable first-init front-running. → cross-pollination candidate: any Solana init function that's not bundled with the resource-creation it depends on.

4. **Anchor constraint typos that compile cleanly** (Finding #6). The `from_token_account` Anchor constraint specifies `token::token_program = to_token_program` (the wrong program). This compiles, runs, and validates against the OTHER token program — a subtle but real correctness bug. Mirrors a real EVM antipattern (`onlyHost` vs `onlyOwner` typo, or `_lockedTokens[from] -= amount` instead of `_lockedTokens[to]`). → cross-pollination candidate: any Anchor codebase with paired-token instructions (`from_*` and `to_*` field pairs). Detector: in any handler with `from_*` AND `to_*` fields, verify cross-field constraints reference the same prefix (no `from_x` constraint referencing `to_*`).

5. **Same-token swap not explicitly prevented** (Finding #4). `swap_a_for_b` is structurally unsafe when `a == b` — the code path executes unwrap-then-wrap on the same extension, accruing rounding errors that drain a small amount from the user with no economic purpose. Generalises to: any function with two same-type parameters where the operation is only meaningful when the two parameters differ. Detector: handlers with two `Pubkey` / `Account<'info, T>` parameters of the same `T` SHOULD include an explicit `require!(param_a.key() != param_b.key())` check.

6. **Token2022 extension-compatibility gaps** (Enhancement #4, Adevar acknowledged). Token2022 has many opt-in extensions (MemoTransfer, TransferFee, etc.) — the M Extensions protocol was not tested against Memo Transfer or Transfer Fee tokens. Combining wrapping with a TransferFee'd underlying could cause accounting drift. Generalises: any wrapper protocol must enumerate which Token2022 extensions it supports and either reject incompatible mints or document the limitation.

7. **Jito-bundle arbitrage-protection has structural ceiling at 12 extensions** (Enhancement #2). The current defense against ext↔ext yield-arbitrage is to bundle all `claimFor + sync` calls in a single Jito bundle (5 transactions × 35 accounts = capacity for 12 extensions × 7 accounts each). When extension count exceeds 12, defense breaks. This is a deployment-class limitation (Lane 1.5 family from `Cross-Domain-Fragility-Laws.md`) that the protocol must monitor as it scales. Acknowledged-not-fixed.

### Cross-pollination notes — Indentura §1 (same auditor, different runtime + different M0 ecosystem)

**Direct same-auditor comparison (Adevar Labs methodology consistency):**

1. **Both audits used the same 4-phase Solana-specialist methodology** (Architecture → Threat Modeling → Manual Review → Fix Review). Same threat-model surface enumeration. Same fix-review discipline.
2. **NEW METHODOLOGY ELEMENT vs §1 Indentura:** Adevar ran an **extensive coverage-guided fuzzing campaign** on M0 Extensions (Appendix B) — 3M+ executions on 4 invariants (vault solvency, index monotonicity, fee-claim idempotency, conservation of value). Indentura §1 had no fuzzing campaign mentioned. The fuzzing harness targeted 7 distinct protocol actions with byte-encoded input generation. **This is an Adevar capability we under-attributed in §1** — they DO have a fuzzing toolchain; they deploy it selectively on the more complex targets. M0's Rust + Token2022 + powf surface justified it; Indentura's C + simple-vault surface did not.
3. **NEW METHODOLOGY ELEMENT vs §1 Indentura:** Adevar performed **comprehensive mathematical modeling of the `powf` approximation** (Appendix A — Taylor series analysis with error heatmap, accuracy bounds on domain `x ∈ [1, 1.1]`, `y ∈ [0.01, 1]`). This is a math-modeling capability beyond pattern-matching auditing. Indentura had no equivalent — its overflow finding was math-checked but didn't require model-fitting. **Adevar applies math modeling on the targets that need it.**

**Solana-runtime PARALLELS (both audits, different runtime expression):**

| Family                              | Indentura case (§1, C)              | M0 Extensions case (§2, Rust)                         | Shared root cause                                            |
| ----------------------------------- | ----------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------ |
| Solana account/signer binding gap   | L02 + L03 (account-binding missing) | Finding #1 (Anchor `Signer<'info>` without `has_one`) | "Declared-but-unenforced authority" — both runtimes          |
| Init-function safety                | L04 (admin re-init bug)             | Finding #5 (anyone-callable init front-run)           | Init guards must be explicit, not implicit                   |
| Accumulator-vs-config ordering      | M01 (slippage / NAV-update timing)  | Finding #2 (set-fee-before-sync)                      | Config that affects accumulator → settle accumulator FIRST   |
| Token2022 / SPL extension awareness | M02 (ATA front-run for DoS)         | Enhancement #4 (untested Token2022 ext compatibility) | Token2022 surface is large + opt-in; programs must enumerate |

**Solana-runtime DIVERGENCES (Indentura-only vs M0-Ext-only):**

| Indentura-only (§1)                 | M0 Extensions-only (§2)                                                                 |
| ----------------------------------- | --------------------------------------------------------------------------------------- |
| C uint64 multiplicative overflow    | Rust f64 non-determinism on `powf`                                                      |
| ATA front-running for 1-lamport DoS | Jito-bundle arbitrage-protection ceiling (deployment-class scaling limit)               |
| bool↔uint64 implicit conversion     | Anchor `from_*` / `to_*` paired-token constraint typo                                   |
| Hardcoded co-signer (Thor)          | Whitelist-mutator no-admin-binding (Anchor `has_one` missing)                           |
| C-runtime missing checked-math      | Rust-side Token2022 ScaledUI interface forcing f64 into deterministic-VM consensus path |

**Net assessment vs §1 brain entry:** M0 Extensions adds **5 new Solana-Rust/Anchor-specific patterns** to the brain that Indentura (Solana-C) didn't surface. The combined intake gives us coverage on BOTH dominant Solana program-language idioms (C native + Rust Anchor). The Adevar capability profile is now better understood (manual + fuzzing + math-modeling, selectively deployed). Indentura is the **C-runtime canonical**; M0 Extensions is the **Rust-Anchor + Token2022 canonical**.

### Auditor methodology observations (Adevar Labs, follow-up to §1)

§1 documented Adevar's manual-led methodology in detail. M0 Extensions surfaces TWO methodology elements §1 didn't:

1. **Coverage-guided fuzzing campaign (Appendix B).** 3M+ fuzzing executions on 7 protocol actions (Wrap, Unwrap, WrapUnwrap, UpdateLastClaimIndex, ClaimFees, DoubleClaimFees, UnwrapAllForAllUsers). Action selection via byte-0 selector + bytes-1..8 parameters. Monitored 4 invariants:
   - Invariant 1 (Vault Solvency): `vault_balance >= principal_to_amount_down(total_ext_supply, current_multiplier) - 2`
   - Invariant 2 (Index Monotonicity): `current_index >= INITIAL_INDEX (1e12)`
   - Invariant 3 (Fee Claim Idempotency): `second_claim_amount == 0` for consecutive claims
   - Invariant 4 (Conservation of Value): `sum(user_m_tokens) + vault_m_tokens` conserved across actions

   The campaign VALIDATED that the invariants hold under stress, but did NOT find the `powf` bug (Finding #3) — that was discovered manually. **Methodology lesson:** fuzzing validates invariants you state; manual review discovers invariants you didn't state.

2. **Mathematical modeling of approximation alternatives (Appendix A).** When Adevar identified `powf` as non-deterministic, they didn't just say "use Taylor series" — they **modeled the Taylor approximation across the input domain**, computed maximum and mean error bounds (0.45% max, 0.05% mean on `x ∈ [1, 1.1]`, `y ∈ [0.01, 1]`), and PROVED the always-underestimate property required for solvency safety. This is rigorous-applied-math, not just code review. **Methodology lesson:** for math-heavy bugs, the fix recommendation should include the proof of safety, not just the technique name.

**Comparison to Buzz V6 pipeline (continued from §1):**

- **Adevar's fuzzing (Appendix B) = our L3 pentest layer.** Adevar's harness is custom-written per-engagement; our L3 auto-generates Foundry/Cargo/Go scaffolding from L1d findings. Both produce executable PoCs; theirs validates known invariants, ours scaffolds exploits from detected patterns. **Composition opportunity:** we could feed Adevar-style invariant declarations into our L3 pentest layer for invariant-fuzzing instead of just exploit-PoC scaffolding.
- **Adevar's math modeling (Appendix A) = NO Buzz equivalent.** Our pipeline has no math-proof / approximation-analysis layer. For Solana protocols using exponentiation / logs / non-linear math, this is a real coverage gap. Math-modeling is hard to automate; the Adevar approach (manually identify, manually model, validate via plot + error tabulation) is currently human-only. **Productization signal:** LOW — math-modeling layer is high-effort and rarely-fires; better to flag `powf` / `expf` / `log` / `sqrt` calls in deterministic-VM context as STRUCTURAL_SMELL and route to manual review.

### Productization candidates surfaced (NOT promoted; operator decides)

1. **CANDIDATE-G ENRICHMENT (Anchor `Signer<'info>`-without-`has_one` variant).** M0 Extensions Finding #1 IS a Solana-account/signer-binding-gap finding, but in the Anchor idiom (vs Indentura §1's native-C account-binding gap). The CANDIDATE-G class statement covers "account derivation not verified on-chain against signer pubkey"; Finding #1 generalizes this to "admin authority not bound to a signer pubkey via `has_one`." Worth recording as a CANDIDATE-G enrichment (one more worked-example, in a DIFFERENT runtime expression of the same class). **Operator decision pending:** does Finding #1 count as a 2nd brain-protocol worked-example for CANDIDATE-G's promotion math (1 → 2 protocols = ≥2 promotion threshold met)? Default-stance: **YES, count as separate protocol** — M0 and Indentura are different teams, different codebases, different runtimes (Rust vs C). CANDIDATE-G's promotion math improves from "2 findings in 1 audit = count as 1" to "2 findings + 1 finding across 2 protocols = count as 2." See Patterns-Defense-Classes.md update.

2. **CANDIDATE-J ENRICHMENT (accumulator-vs-config ordering, M0 Extensions Finding #2).** M0 Ext Finding #2 is a worked-example for CANDIDATE-J Point 5 ("Drip-after-file in halt: when MOM unhalts, drip() must apply correctly across the halt window"). M0 Ext violates the equivalent invariant: `sync_multiplier` not called before `set_fee` mutation. This is a non-Maker, non-Sky worked example for CANDIDATE-J's checklist Point 5. **Operator decision pending:** does this count as a 2nd sibling-pair audit against CANDIDATE-J's checklist? Default-stance: **partial credit** — M0 Ext's set_fee + sync_multiplier is structurally a setter+accumulator pair (not exactly setter+halter like stUSDS's RateSetter+MOM), so it validates Point 5 specifically but not the other 6 points. CANDIDATE-J promotion needs 2+ FULL sibling-pair audits against all 7 points; M0 Ext gives us a Point-5-only worked example.

3. **CANDIDATE-K (proposed): Floating-Point-In-Deterministic-VM-Consensus-Path.** Active when: a Solana program performs `f64` / `f32` operations on a code path that feeds into a consensus-critical decision (state mutation, fund flow, solvency check, fee distribution). Defense: replace `f64`/`f32` with fixed-precision integer math, OR with a deterministic approximation (Taylor series, piecewise polynomial) with proven error bounds and always-under/over-estimate property aligned to safety. Anchor: M0 Extensions Finding #3. **Status: PROPOSED CANDIDATE, NOT promoted.** Promotion blocked on 1+ additional anchor (any Solana program that uses `f64` in consensus path with concrete bug evidence). Cross-pollination scan target list (post-CVP): Solana programs using Token2022 ScaledUI / InterestBearing / TransferFee with computed (not constant) parameters; Solana DEX programs using log/exp for price curves; Solana lending programs using continuous-compound interest math.

4. **NEW productization-detector spec (Anchor `Signer<'info>` without `has_one` binding).** Independent of CANDIDATE-G promotion math. Detector:
   ```
   pattern: #[derive(Accounts)]
            pub struct $HANDLER {
              ...
              pub $SIGNER_NAME: Signer<'info>,
              ...
              #[account(...)]
              pub $STATE_NAME: Account<'info, $STATE_TYPE>,
              ...
            }
   where:
     $STATE_TYPE contains a `admin` / `owner` / `authority` field (any of these names)
     AND $STATE_NAME's #[account(...)] constraint does NOT include `has_one = $SIGNER_NAME` OR equivalent inline check
   ```
   Low FP rate, high EV. Worth shipping as a standalone L1b rule even if CANDIDATE-G doesn't promote.

### URGENT-flag scan

- **Are we hunting any of these patterns RIGHT NOW in another protocol?** Checking against `hunts/` + `brain/Disclosure-Programs-Top-Tier.md`:
  - **Wormhole CANDIDATE-A surface (deferred on THORChain PM):** Wormhole uses Rust + custom signer-set verification; the `Signer<'info>`-without-`has_one` pattern (M0 Ext Finding #1) is NOT structurally present (Wormhole's signer verification is bespoke not Anchor). Not urgent.
  - **Sky vault state-machine (top of H2 priority):** Sky vat/jug/pot ARE setter+accumulator pairs (rate-setter then drip), but Sky has the correct sync-before-set discipline (and CANDIDATE-J already documented this as a positive reference pattern). M0 Ext Finding #2 confirms our positive-pattern intuition — Sky did it right, M0 did it wrong; we can ground the CANDIDATE-J reference checklist on this counter-example. NOT URGENT for hunting Sky; just enriches our reference pattern.
  - **Solana-Anchor protocols in any active hunt:** if any Solana-Anchor target lands in the queue, the M0 Ext Finding #1 detector spec (Anchor `Signer<'info>`-without-`has_one`) is the **first-pass scan** to run. Estimated catch rate: 1 in 20 audited Anchor programs has at least one instance of this antipattern based on community reporting (informal estimate, no formal data). **Action: file the detector spec into the BuzzShield L1b backlog as a P1 candidate.**

- **No emergency. Logged as situational-awareness for the next Solana-Anchor target that enters the queue.**

### Why this entry compounds the brain

M0 Extensions is the **second Solana audit** and the **second Adevar Labs intake** in the brain catalog. Compounding deltas:

1. **Completes Solana-language coverage** (C from Indentura + Rust/Anchor from M0 Ext). Brain now has worked examples for both dominant Solana program-language idioms.
2. **Sharpens our Adevar Labs profile.** §1 framed Adevar as "manual-led, no formal-methods." §2 adds: **manual + coverage-guided fuzzing + math modeling, selectively deployed per-target complexity.** Adevar is a stronger benchmark than we initially assessed.
3. **Anchors 1 new productization-detector spec** (Anchor `Signer<'info>`-without-`has_one`) that ships independent of CANDIDATE promotion math.
4. **Proposes 1 new CANDIDATE-K** (Floating-Point-In-Deterministic-VM-Consensus-Path) anchored on Solana Token2022 ScaledUI interface tension. Promotion-blocked on 1+ adjacent worked example.
5. **Enriches CANDIDATE-G + CANDIDATE-J** via worked-example additions (operator-decision-pending on count math, default-stance documented).
6. **Identifies 1 Buzz V6 coverage gap** (math-modeling layer for non-linear arithmetic in deterministic-VM context). Filed as low-priority productization (flag-and-route rather than build).
7. **Demonstrates Lane 1.5 scaling-limit class** (Enhancement #2 — Jito-bundle arbitrage-protection breaks at 12+ extensions) as a deployment-class signal worth tracking when extension count grows.

---

_Audit Reports Library | v1.1 | 2026-05-17 (M0 Extensions §2 added — Adevar Labs 2025-07-02 Solana-Rust/Anchor yield-wrapper audit; 1 Critical / 0 High / 3 Medium / 2 Low / 8 Enhancement findings; CANDIDATE-G + CANDIDATE-J worked-example enrichments; new CANDIDATE-K proposed; new Anchor `Signer<'info>`-without-`has_one` detector spec; Adevar fuzzing + math-modeling capabilities documented)_

---

## §3 — Veda (BoringVault yield-vault framework — profile from public docs + Immunefi, 2026-05-16)

### Audit metadata

- **Profile date:** 2026-05-16 (intake — NOT a single audit report read; aggregated from public docs + Immunefi listing + audit-history page)
- **Auditors of record:** **Spearbit (Cantina)** ×1 (full BoringVault Arctic version security review) + **0xMacro** ×13 (per-module reviews A-4 through A-45, each scoped to specific decoder / teller / solver upgrade); plus the Veda team also references **Hexens** + **Secure3** on their Smart Contract Security page (no public reports linked, dates not visible to this intake)
- **Engagement type:** repeated incremental audits per protocol surface (every new decoder integration, every teller upgrade, every solver/queue modification gets its own 0xMacro pass)
- **Target:** Veda BoringVault — the most widely used vault standard in DeFi, securing >$3.5B in TVL across deployments (per Veda's own documentation marketing)
- **Language:** Solidity / EVM
- **Bounty profile (Immunefi, 2026-05-16):** Critical max **$1,000,000** (min $100K), High max $25,000 (min $10K); Medium/Low not visible from listing extract. PoC required for all severities. **KYC mandatory.** Rewards in USDC on Ethereum. Total Assets in Scope on Immunefi = 52.
- **Chains deployed:** Ethereum primary. Cross-chain present via LayerZero Teller (A-19) + Hyperlane decoder (A-19) + CCIP decoder (A-10) — multi-bridge surface.
- **Repository:** `https://docs.veda.tech/` + audit history at `https://docs.veda.tech/security-and-risk-controls/audits` (page exists; the catalog listing of 13 0xMacro + 1 Spearbit was extracted via the Veda docs site)
- **No before/after commit hashes captured at intake** (these vary per individual audit report; would require pulling each 0xMacro PDF individually)

### Architecture summary

Veda's BoringVault is an **enterprise-grade EVM yield-vault framework** with the explicit design principle "delegate complexity to external modules, keep the vault core ~100 lines." Architecture:

1. **BoringVault (core, ~100 LOC):** custodies all vault funds. Minimal logic — token holding + a single `manage()` entry point that the Manager calls with pre-verified-Merkle-proof operations.
2. **Teller:** handles user deposit / withdraw. Mints shares on deposit at the Accountant's current exchange rate; enforces share-lock periods (anti-MEV); burns shares on withdrawal. Variants exist: `TellerWithMultiAssetSupport`, `TellerWithRemediation`, `LayerZero Teller` (cross-chain), `Teller-with-deposit-caps`.
3. **Manager:** holds the Merkle root of the strategist's permitted operations. On `manage()`, validates the operation `(target, selector, value, data)` against the Merkle proof. The strategist (curator-appointed account) submits operations; Manager verifies, then forwards to BoringVault for execution.
4. **Accountant:** publishes exchange rate (vault NAV per share). On-chain safety checks limit update frequency + magnitude (rate cannot move more than X% per Y blocks). Sub-variant: `AccountantWithRateProviders`.
5. **DecoderAndSanitizer (~40 variants):** for each external protocol Veda's vaults can interact with (Aave, Morpho, EtherFi, Symbiotic, Pendle, Curve, Convex, Usual Money, BGT, etc.), a dedicated decoder validates the calldata before Manager allows it. This is the principal attack surface — every new integration adds a new decoder, every decoder is audited (hence 13+ 0xMacro reports).
6. **BoringSolver + BoringQueue:** time-delayed solver-based withdrawal queue. Users submit withdrawal request → matures after time-delay → third-party solvers fulfill from vault liquidity. Solver upgrades A-25 (deficit coverage) + A-44 (excess handling + cross-chain bridging) suggest active iteration on edge cases.
7. **Hook (optional):** pre-transfer hooks for whitelist / KYC / per-vault custom rules (e.g., institutional vaults requiring address whitelisting).
8. **Curator + Strategist roles:** Curator can update strategist whitelist (with pending review period — informal timelock); Strategist executes operations within the Merkle-pre-approved set.

**Risk-model summary:** Veda's primary risk surface is the **decoder cardinality** — 40+ decoders, each a separate trust boundary on external protocol calldata. The Merkle-tree pre-approval shifts the trust from "strategist is honest" to "the Merkle root was constructed correctly + each decoder catches malformed calldata for its protocol." A bug in any one decoder + a corresponding malicious Merkle pre-approval = full vault drain via that decoder's permitted protocol.

### Severity-count table

**N/A — profile only.** Aggregate severity stats across 14 audit reports were not extracted at intake. Future deep-dive on any individual 0xMacro report (especially A-4 Full Architecture, A-44 Cross-Chain Bridging, A-45 Deposit Caps) would populate this row.

### Architectural attack surface (Buzz brain-candidate classification)

**HIGH-confidence overlap with brain candidates:**

1. **CANDIDATE-I (ERC4626 wrapper without virtual-shares-defense) — HIGH.** BoringVault is share-minting on deposit at an Accountant-published exchange rate. If the Accountant rate-floor or the share-mint computation lacks virtual-shares-defense (OpenZeppelin's `DECIMALS_OFFSET = 6+` mitigation, or Cantina-style virtual-asset-minting), a first-depositor inflation attack is structurally possible. Veda's $3.5B TVL means an inflation attack would be early-vault-only (the standard is well-known) — but the **TellerWithMultiAssetSupport variant** + the **deposit-caps Teller variant (A-45)** are both fresh surfaces where virtual-shares-defense could be missing or implemented inconsistently per-asset. Worth a Gate 1 read.

2. **CANDIDATE-J (set-halt sibling-pair / accumulator-vs-config ordering) — HIGH.** Veda's Accountant publishes exchange-rate via an `updateExchangeRate()` flow with frequency + magnitude bounds. If a Veda vault has a fee-mutator (`setManagementFee()`, `setPerformanceFee()`) that doesn't first call `updateExchangeRate()` to settle accumulated yield at the OLD fee, M0 Extensions §2 Finding #2 retroactive-fee-application class fires. The Accountant + Teller separation makes the surface even larger because the fee-mutator is plausibly on the Manager or Accountant while the rate-update is on Accountant. Worth checking Veda's `Accountant.sol` setter functions for sync-before-mutate discipline.

3. **DC-7 (validation→consumption asymmetry, paired-function gap) — HIGH.** Veda has paired deposit (Teller.deposit) + withdraw (BoringQueue.requestWithdraw → BoringSolver.solve). Both flows reference the same Accountant exchange rate. Any field-binding gap between deposit-side rate-read and withdraw-side rate-read = arbitrage / drain. CANDIDATE-D (KyberSwap startSqrtP-equality) family direct sibling. Veda's solver-fulfillment (third-party solvers) adds a temporal-state-mutability surface where deposits-during-pending-withdraw can shift the rate the solver consumes vs the rate the user requested against.

4. **Cross-chain field-binding (CANDIDATE-A family, Wormhole-class) — MEDIUM-HIGH.** Veda has THREE cross-chain primitives: LayerZero Teller (A-19), Hyperlane decoder (A-19), CCIP decoder (A-10). Each bridge has its own message-authentication model. If any one of them is the canonical token-bridge for an asset that's also reachable via another bridge, field-binding asymmetries between bridges (cross-bridge replay, source-chain-id confusion) are CANDIDATE-A's exact shape. THORChain PM (deferred on `project_thorchain_pm_tracking.md`) is the live precedent for this family.

**MEDIUM-confidence overlap:**

5. **Pattern A (admin-unprotected mutator) — MEDIUM.** Veda has many admin-callable functions (curator updates strategist whitelist, governance updates curator, fee setters, decoder additions). The Merkle-root-update path on Manager is highest-EV: if `setMerkleRoot()` doesn't enforce curator-only, attacker installs a malicious Merkle root and drains via the existing decoder set. Likely already extensively audited (this is the obvious attack), but the variant surface (which has the binding, which doesn't) is the open question.

6. **Solver fulfillment temporal-state-mutability (M0 Ext §2 Finding #2 + Indentura §1 M01 family) — MEDIUM.** BoringQueue's time-delayed solver-fulfillment is structurally the same shape as Indentura's user-withdraw-during-admin-NAV-update (M01). If solvers can fulfill at a different exchange rate than the user requested against — and the user didn't sign with a min-out / slippage parameter — same class of bug.

**LOW-confidence / NOT-applicable:**

- **CANDIDATE-G (Solana off-chain cosigner) — N/A.** EVM-only deployment; no Solana surface.
- **CANDIDATE-K (floating-point in deterministic-VM) — N/A.** Solidity has no native float type; not applicable.

### Brain-catalog cross-pollination

- **§1 Indentura M01 (slippage / NAV-update timing):** Direct EVM analogue in Veda's BoringQueue solver-fulfillment. The Solana-runtime divergence noted in §1 is irrelevant for Veda (no PDA / ATA / discriminator); the temporal-state-mutability class is the shared root.
- **§2 M0 Extensions Finding #2 (set-fee-before-sync):** Direct sibling for any Veda Accountant fee-mutator that doesn't sync rate first. Same family, EVM expression.
- **CANDIDATE-D (KyberSwap startSqrtP-equality):** Cross-pollinates to Veda Accountant rate-publish + Teller/Solver consume — any equality / strict-comparison on rate-staleness check is the same pattern.
- **CANDIDATE-A (Wormhole guardian attestation):** Cross-pollinates to LayerZero Teller / Hyperlane / CCIP decoder surface. Veda has 3 bridge primitives = 3 cross-pollination opportunities.
- **Aave-fork visibility-miss FP-class** (audit-methodology-v2 v2.5): NOT directly applicable to Veda (Veda doesn't fork Aave), but Veda DOES build decoders for Aave (via `tokenized-aave-v3` integration on cap side, hence the cross-pollination is via integrator surface).

### Hunt-priority signals

- **TVL:** $1.05B Immunefi-scope (Veda-Immunefi listing); Veda itself markets $3.5B across all BoringVault deployments. Use $1.05B as the bounty-anchored TVL.
- **Bounty:** $1M Critical max ($100K min); $25K High max. Standard Tier-1 program.
- **Candidate-overlap count:** **4 HIGH (CANDIDATE-I, CANDIDATE-J, DC-7, CANDIDATE-A cross-chain) + 2 MEDIUM (Pattern A, solver temporal-state).** Strongest single-protocol candidate-density of any target profiled to date in this brain catalog.
- **Net-new to Buzz:** **YES.** Veda was not in the brain catalog before today; the BoringVault standard's specific modular architecture (Manager + Merkle-tree pre-approval + decoder sanitizers) is a new pattern surface for us.
- **Audit-maturity rating:** **HIGH** — 14 audits documented (1 Spearbit + 13 0xMacro), each focused on a specific module / decoder / upgrade. This is a heavily-audited target. **Implication for Buzz:** the obvious bugs are already caught; our edge has to be in the **module-interaction surface** (e.g., new Teller variant × existing Accountant invariant, new decoder × existing Solver assumption) — these are the inter-module field-binding gaps that single-module audits miss by construction.

### Discipline (pre-CVP scope notes)

- **READ-ONLY profile.** No source clone, no Layer 1d run, no PoC.
- **KYC requirement (Immunefi):** payout requires KYC. This is a "submit serious finding only" target — recreational hunting doesn't yield, only actual confirmed exploits do.
- **PoC requirement:** all severities. Cannot file speculative findings.
- **Auth gate requirements:** none for read-only profile work; future deep-dive on individual 0xMacro reports requires downloading PDFs (public from docs.veda.tech audits page).
- **Heavy audit cadence:** rescan strategy must account for the fact that 0xMacro re-audits each new module within weeks of integration. Best-EV scan window: **week-of-fresh-module-deploy BEFORE 0xMacro's review lands** — this is the speedrunner / Watchdog-Triage-Mode use-case (per `audit-methodology-v2.md` v2.5 — speedrunner survives only for cron commit-diff triage). Cap-labs commit-diff watchdog on `cap-contracts` (next §) is the same pattern.

---

## §4 — cap (Ethereum stablecoin + EigenLayer/Symbiotic restaking-backed credit — profile from public docs + GitHub, 2026-05-16)

### Audit metadata

- **Profile date:** 2026-05-16 (intake — NOT a single audit report read; aggregated from public docs + GitHub cap-audits repo + DefiLlama + blocmates + OAK Research third-party explainers)
- **Auditors of record (from `github.com/cap-labs-dev/cap-audits` repo file list):**

| Firm          | Date       | Notes                                                      |
| ------------- | ---------- | ---------------------------------------------------------- |
| Zellic        | 2025-03-17 | First audit                                                |
| Trail of Bits | 2025-05-15 | Tier-1                                                     |
| Electisec     | 2025-05-25 | Niche specialist                                           |
| Spearbit      | 2025-06-23 | First Spearbit pass                                        |
| Recon         | 2025-07-04 | Fuzzing / invariant specialist                             |
| Sherlock      | 2025-09-03 | Contest-class                                              |
| Certora       | 2025-09-15 | **EigenAVS scope (formal verification, scope-restricted)** |
| Spearbit      | 2025-11-27 | PR Review (delta audit)                                    |
| Octane        | 2026-03-24 | Most recent                                                |

**9 audits across 7 distinct firms in 12 months.** Includes 1 formal-verification (Certora, EigenAVS-scope) and 1 invariant-fuzzing (Recon). This is an **unusually thorough audit cadence** for a $337M TVL protocol; suggests institutional-track positioning (consistent with $9.9M raise from Franklin Templeton + GSR).

- **Engagement type:** mix of full-scope (Zellic, Trail of Bits, Spearbit, Sherlock) + delta / PR review (Spearbit second pass, Octane) + scope-restricted formal verification (Certora EigenAVS)
- **Target:** cap protocol — Ethereum stablecoin (cUSD) + yield-bearing variant (stcUSD) + L2Token cross-chain wrapper, backed by a Lender → Borrower → Underwriter three-party credit model with EigenLayer / Symbiotic restaking as the underwriting collateral layer
- **Language:** Solidity / EVM
- **Bounty profile (Immunefi, 2026-05-16):** **Immunefi listing did not resolve at standard slug `/bug-bounty/cap/` (404).** Operator-supplied watchlist data indicates $337M TVL × $1M bounty. Bounty cap, KYC requirements, jurisdictional restrictions NOT confirmed at intake — requires direct re-fetch with corrected URL (possibly `/bug-bounty/capapp/` or `/bug-bounty/capmoney/` or `/bug-bounty/cap-labs/`).
- **Chains deployed:** Ethereum primary; **L2Token contract exists** for cross-chain functionality (specific destination chains not enumerated in public docs extract); cap-yearn-strategies repo + tokenized-aave-v3 fork suggest deeper L2 / yield-source surface
- **Repositories:**
  - `https://github.com/cap-labs-dev/cap-contracts` (Solidity, 18 stars, 10 forks, last commit 2026-05-08) — primary
  - `https://github.com/cap-labs-dev/cap-audits` (audit PDF archive)
  - `https://github.com/cap-labs-dev/cap-yearn-strategies` (Solidity)
  - `https://github.com/cap-labs-dev/tokenized-aave-v3` (Solidity — **forked Aave V3** with tokenization layer)
  - `https://github.com/cap-labs-dev/pendle-generic-balance-fetcher` (TS utility)
  - `https://github.com/cap-labs-dev/metadata-mainnet` (forked Symbiotic Finance metadata)

### Architecture summary

cap is a **credit-backed stablecoin protocol** with a unique three-party trust model:

1. **Lenders** deposit whitelisted reserve assets (PYUSD, BUIDL, BENJI per OAK Research extract) → mint **cUSD** 1:1.
2. **stcUSD** = cUSD staked → captures the yield from the three-party credit market (currently ~12% floating per blocmates extract). Staking = locking cUSD in exchange for yield-bearing share.
3. **Borrowers** (called "Operators" in some marketing copy) draw stablecoins from the protocol to deploy yield strategies (real-world lending, market-making, DeFi).
4. **Underwriters** (called "Restakers") escrow collateral via cap's Delegation contract. The collateral lives on EigenLayer OR Symbiotic — both restaking primitives are supported. If a Borrower defaults, the Restaker's restaked-ETH (or other restaked asset) is slashed via the respective restaking protocol's slashing primitive.
5. **Fractional Reserve** contract enforces the reserve-ratio invariant (cUSD outstanding ≤ reserves + outstanding-borrower-debt × collateralization-factor).
6. **Fee Auction** contract manages fee distribution.
7. **Oracle** contract feeds prices for collateral valuation + liquidation health computation.
8. **Liquidation = permissionless** (per docs.cap.app extract); uses the Borrower's assigned network (EigenLayer or Symbiotic) for slashing execution.

**Risk-model summary:** cap's primary risk surface is **the three-party trust model's correctness under stress**. The novel element is **restaking as the underwriting collateral** — this means cap inherits **all of EigenLayer's slashing-correctness risk + all of Symbiotic's slashing-correctness risk** AS A DEPENDENCY. Either restaking primitive's slashing path failing = cap cannot recover defaulted borrower loans = stablecoin de-peg. The Certora EigenAVS-scope formal verification (2025-09-15) is exactly the EigenLayer-integration-correctness assurance this risk demands.

Secondary risk surface: the **Aave V3 fork** (`tokenized-aave-v3`). Aave V3 is well-audited, but FORKING it + adding a tokenization layer is exactly the Spark/Aave-fork-class FP / TP surface from `audit-methodology-v2.md` v2.5 — Aave-fork visibility-miss calibration is in our Skeptic prefilter. The cap-yearn-strategies repo adds Yearn V3 integration — another mature-but-fork-modified surface.

### Severity-count table

**N/A — profile only.** Aggregate severity stats across 9 audit reports were not extracted at intake. Future deep-dive on the most recent audits (Octane 2026-03-24 + Spearbit PR Review 2025-11-27) would be highest-EV — most recent code state, smallest delta to current production. Sherlock 2025-09-03 contest report would also surface volume of researcher-submitted findings (contest format generates higher-volume finding count than private audit).

### Architectural attack surface (Buzz brain-candidate classification)

**HIGH-confidence overlap with brain candidates:**

1. **CANDIDATE-J (set-halt sibling-pair / accumulator-vs-config ordering) — HIGH.** cap has Vault + Minter + Lender + Fractional Reserve + Fee Auction + Oracle. Multiple paired-setter/accumulator surfaces: setReserveRatio + reserveAccrual, setBorrowRate + interestAccrual, setLiquidationThreshold + healthFactor. Each pair is a Point-5 (drip-after-file-in-halt) candidate. Direct sibling of Sky vat/jug/pot model + M0 Ext §2 Finding #2. Octane 2026-03-24 audit being the most recent suggests fresh fee/rate/threshold mutator code is the right deep-dive surface.

2. **CANDIDATE-A (cross-chain message-authentication / signer-set field-binding) — HIGH.** cap has L2Token contract for cross-chain. EigenLayer + Symbiotic are BOTH cross-validator-set primitives (each has its own AVS / validator quorum). Slashing instructions traverse cap → restaking-primitive → validator-set with the slashing-event field needing to bind: (asset, validator, slashed-amount, source-loan-id). Any field-binding gap = either failure-to-slash (loan defaults but underwriter not punished) OR over-slash (underwriter slashed wrong amount). Wormhole/THORChain family. Certora EigenAVS scope likely covers EigenLayer side; Symbiotic side may have lighter coverage.

3. **DC-7 (validation→consumption asymmetry, paired-function gap) — HIGH.** cap's Lender ↔ Borrower ↔ Underwriter loan lifecycle has: open-loan-validates-collateral / repay-loan-consumes-collateral / liquidate-consumes-collateral / accrue-interest-consumes-rate. Three consumers off one validation = high paired-function-gap probability. Same family as KyberSwap startSqrtP-equality.

4. **CANDIDATE-I (ERC4626 wrapper without virtual-shares-defense) — HIGH.** stcUSD is the staked variant of cUSD — almost certainly an ERC4626 wrapper. First-depositor inflation attack is the textbook risk. Sherlock 2025-09-03 contest very likely covers this (contest researchers always check it); the variant-surface question is whether ALL deposit paths share the same virtual-shares-defense (e.g., stcUSD direct-stake AND L2Token cross-chain-arriving cUSD-conversion-to-stcUSD share the same accountant).

**MEDIUM-confidence overlap:**

5. **Aave-fork visibility-miss class (audit-methodology-v2.md v2.5 Sky/Spark/Aave FP-class) — MEDIUM.** `tokenized-aave-v3` is an Aave V3 fork. ANY symmetric-path-comparison detector run on cap-contracts will likely surface the same FP-class we calibrated for Spark/Sky. Skeptic's HE-19 prefilter (`reverse_mutability=view` auto-reject) should handle most of these — but the CAP-SPECIFIC additions (tokenization layer on top of Aave V3 functions) may introduce paired guards where the new tokenization wrapper has different visibility than the underlying Aave function. Worth running a delta-vs-Aave-V3 diff before pipeline scan.

6. **Pattern A (admin-unprotected mutator) — MEDIUM.** cap has Access Controls contract managing permissions. The privileged role enumeration (operator-whitelist, borrower-onboarding, oracle-update, fee-set) is the structural FP-vs-TP question — 9 audits make Pattern-A-LOW likely all caught, but the **role-binding** in Access Controls IS the surface (M0 Ext §2 Finding #1 Anchor-style binding-not-declared is the structural-cousin).

7. **Yearn-strategy integration surface — MEDIUM.** `cap-yearn-strategies` repo holds Yearn V3 strategies that cap likely uses for some yield deployment. Yearn V3 has its own audit history but strategy-implementation correctness is per-strategy, not inherited from Yearn core. Each strategy = its own surface. Lower-EV than core protocol but in-scope per the GitHub presence.

**LOW-confidence / NOT-applicable:**

- **CANDIDATE-G (Solana off-chain cosigner) — N/A.** Ethereum-only deployment.
- **CANDIDATE-K (floating-point in deterministic-VM) — N/A.** Solidity, not Solana/Sui/Move.

### Brain-catalog cross-pollination

- **§3 Veda BoringVault:** cap and Veda share the **EigenLayer / Symbiotic restaking-as-trust-primitive** pattern (Veda has SymbioticVaultDecoderAndSanitizer in A-27; cap uses EigenLayer + Symbiotic for slashing). Different roles — Veda uses restaking deposits as a yield-source decoder; cap uses restaking as the underwriter-collateral-slashing primitive — but both inherit restaking-protocol risk transitively. Cross-pollination: **any restaking-correctness finding on EigenLayer or Symbiotic core affects BOTH cap and Veda** (downstream protocol risk).
- **§1 Indentura + §2 M0 Extensions:** these are Solana-runtime brain entries; minimal direct cross-pollination to cap (EVM-only) BEYOND the canonical-pattern level. The CANDIDATE-J accumulator-vs-config ordering class is the cleanest shared pattern.
- **Sky disclosure-programs-top-tier (`brain/Disclosure-Programs-Top-Tier.md`):** Sky and cap are **structural siblings** — both are Ethereum stablecoin protocols with vault-as-state-machine architecture, both have setter+accumulator pairs, both have rate-mutators feeding consumer functions. **cap is essentially "Sky if Sky used restaking instead of MKR for backing."** Any Sky finding on CANDIDATE-J Point-5 family directly translates as a sibling-pattern hypothesis for cap.
- **CANDIDATE-D + CANDIDATE-E (KyberSwap + Raydium arithmetic-asymmetry):** Lower direct overlap (cap is not a CLMM nor an AMM) but the underlying "fixed-precision arithmetic surface gaps" family applies to cap's reserve-ratio + collateralization-factor computations. Marginal; not a primary surface.

### Hunt-priority signals

- **TVL:** $337M (DefiLlama 2026-05-16) — operator-watchlist anchor
- **Bounty:** $1M (operator-supplied watchlist data; Immunefi URL resolution failed at intake — needs follow-up)
- **Candidate-overlap count:** **4 HIGH (CANDIDATE-J, CANDIDATE-A cross-chain, DC-7, CANDIDATE-I) + 3 MEDIUM (Aave-fork visibility, Pattern A access controls, Yearn integration).** Same candidate-density as Veda; differentiator is the restaking-correctness inheritance (BIGGER risk surface, MORE third-party dependency, MORE cross-pollination value).
- **Net-new to Buzz:** **YES.** cap was not in the brain catalog before today; the EigenLayer/Symbiotic underwriter model is a new architectural pattern for us.
- **Audit-maturity rating:** **VERY HIGH** — 9 audits across 7 firms in 12 months, including Certora formal verification + Sherlock contest. This is an **institutional-track audit cadence**. **Implication for Buzz:** the textbook bugs are all caught. Our edge has to be (a) the **most-recent-delta surface** (Octane 2026-03-24 was the LATEST audit; any code shipped AFTER Octane is the open window), OR (b) **cross-dependency surface** (EigenLayer or Symbiotic core bug → cap downstream impact, which neither cap's audits nor EL/Symb audits would catch in isolation), OR (c) **inter-module field-binding gaps** that single-module audits miss by construction (same logic as Veda).

### Discipline (pre-CVP scope notes)

- **READ-ONLY profile.** No source clone, no Layer 1d run, no PoC.
- **KYC requirement (Immunefi):** UNCONFIRMED at intake — Immunefi URL needs re-resolution. Default-assume YES given the institutional positioning + Franklin Templeton / GSR investor base.
- **PoC requirement:** ASSUMED required for all severities (Immunefi standard).
- **Auth gate requirements:** none for read-only profile work; future deep-dive on cap-audits PDFs requires PDF download from public GitHub.
- **Heavy audit cadence + restaking dependency:** rescan strategy must include **EigenLayer + Symbiotic core delta monitoring** as a leading indicator for cap-side findings. Adding `cap-contracts`, `tokenized-aave-v3`, `cap-yearn-strategies` to the Watchdog-Triage-Mode commit-diff watchlist would catch the **post-Octane open window** automatically. The Symbiotic + EigenLayer core repos should already be in the disclosure-programs-top-tier watchlist; if not, this profile is a justification to add them.

### URGENT-flag scan

- **Are we hunting either Veda or cap in any active brain entry RIGHT NOW?** Cross-check `hunts/` + `brain/Disclosure-Programs-Top-Tier.md` + `brain/Cross-Domain-Fragility-Laws.md`:
  - Sky H2 hunt (top-of-queue per `project_h2_disclosure_scope_pull.md`): cap is the **structural sibling** to Sky. Any Sky finding on CANDIDATE-J Point-5 family becomes a cap deep-dive trigger. NOT URGENT today; logged as situational-awareness.
  - Wormhole/THORChain CANDIDATE-A (deferred on `project_thorchain_pm_tracking.md`): both Veda (LayerZero + Hyperlane + CCIP) and cap (EigenLayer + Symbiotic) inherit cross-chain / cross-quorum signer-set risk. When THORChain PM lands and CANDIDATE-A graduates to DC-7, Veda and cap are immediate cross-pollination targets.
  - Coinbase / Polygon disclosure scope: no direct overlap; Veda and cap stay in their own profile lane.
- **No emergency.** Neither protocol is publicly known to be exploited as of intake date; no rekt.news / PeckShield / SlowMist / CertiK alert on either name within the last 7 days (verified via baseline knowledge; no fresh news-fetch at intake).

### Why these two entries compound the brain

§3 (Veda) and §4 (cap) anchor TWO NEW NET-NEW Lane-1-hunt-eligible protocols into the brain catalog:

1. **EVM yield-vault standard expansion.** Brain previously had no entry on a major EVM vault framework. Veda's BoringVault is THE most widely used (by $TVL) — its modular architecture (vault + decoder + manager + accountant + teller separation) introduces a NEW intra-protocol field-binding-gap surface (inter-module gaps that single-module audits miss). This is a methodology insight that applies to ANY similarly-modular EVM protocol going forward.

2. **EigenLayer / Symbiotic restaking-as-underwriting-collateral pattern.** cap is the first brain entry to use restaking as the **collateral primitive** (not just as a yield source). This introduces a new cross-protocol-dependency class: **restaking-correctness inheritance** — cap's safety is a function of EigenLayer + Symbiotic safety. Brain now has a worked example for documenting / tracking this dependency.

3. **Audit-cadence calibration.** Both protocols have HEAVY audit cadences (Veda 14 audits, cap 9 audits). Both demonstrate that the EV-edge for Buzz on heavily-audited targets is NOT in the obvious single-module bugs but in: (a) post-most-recent-audit delta, (b) inter-module field-binding gaps, (c) cross-dependency surface. This is a methodology refinement that should propagate into our overall Lane-1 selection heuristic — **a 9-audit target is MORE hunt-eligible than a 0-audit target IF you can identify the post-audit delta window or the inter-module gap.**

4. **Aave-fork + Yearn-fork sub-surface.** cap's `tokenized-aave-v3` + `cap-yearn-strategies` repos add fork-modified-mature-protocol surface that pairs cleanly with our Skeptic HE-19 prefilter (Aave-fork visibility-miss class) and our forthcoming Yearn-V3 strategy-validation detector work.

5. **Veda Immunefi-scope-vs-Veda-self-marketed-TVL delta.** Veda markets $3.5B TVL across BoringVault deployments; Immunefi-scope is $1.05B. The delta = vaults that USE BoringVault but ARE NOT covered by Veda's bounty (third-party deployers like Etherfi Liquid, ResolvLabs, etc.). This is a Lane-1 expansion-opportunity: **a single BoringVault bug = potentially $3.5B blast radius, but only $1.05B bounty-collateralized**. The remaining $2.45B is "social-only" responsible-disclosure surface (no formal bounty). Worth documenting in the disclosure-programs-top-tier watchlist as a "responsible-disclosure-only" target class.

---

_Audit Reports Library | v1.2 | 2026-05-16 (§3 Veda BoringVault profile + §4 cap stablecoin profile added per operator directive msg 7209 §3.C; 2 NEW NET-NEW Lane-1-hunt-eligible protocols characterized; combined 8 HIGH + 5 MEDIUM brain-candidate overlaps surfaced across both targets; restaking-as-underwriting-collateral pattern newly documented; BoringVault modular-architecture inter-module gap thesis introduced; Aave-fork + Yearn-fork sub-surface flagged for HE-19 prefilter applicability)_

---

## §5 — Polygun (Pashov Audit Group ×3, 2026-02-17 / 2026-03-25 / 2026-04-16) — PDF-EXPANDED v2

> v2 expansion 2026-05-23 per operator msg 7582 intake batch D+E+F. All 3 PDFs successfully extracted via `pypdf` from raw.githubusercontent.com blobs (pypdf, 65 + 24 + 65 pages, [EXECUTED]). Findings catalog below is [INSPECTED] from extracted PDF text. Prior v1 INDEX-ONLY stub (op msg 7357, 2026-05-20) superseded.

### Audit metadata (corrected from PDF cover pages)

- **Auditor:** Pashov Audit Group ([INSPECTED] — credits 0xAlix2, Shurikenzer, defsec, 0xaudron, 0xrudra99, WarlordSam, Rayaa, naman, 5m477 across 3 engagements)
- **Target:** **Polygun** — Telegram-based Polymarket COPY-TRADING platform (NOT a Polymarket-trading-bot for users-composing-their-own-trades — it is a copy-trading service that mirrors KOL trades for subscribers). [INSPECTED]
- **Domain (correction to v1):** v1 entry described Polygun as "non-custodial trading bot with bot composing calldata". The PDF correction is: **Polygun is an OFF-CHAIN TypeScript codebase** (Postgres + BullMQ + Telegram UI + Drizzle-ORM) that orchestrates Polymarket positions via a **Gnosis Safe master wallet + per-user Gnosis Safes**. The "bot composes calldata for the user to sign" framing in v1 was wrong; Polygun has its OWN master Safe that holds USDC and pays out commissions/referrals, plus a 2FA TOTP-gated user-private-key export flow. [INSPECTED]
- **Language scope (3 audits combined, [INSPECTED]):** TypeScript files only — `commissions.ts`, `copy-trading.ts`, `deploy-safe.ts`, `fee-transfers.ts`, `index.ts`, `kol-promo.ts`, `limit-orders.ts`, `market-cache.ts`, `referrals.ts`, `schema.ts`, `temporary-wallets.ts`, `users.ts`, `wallets.ts`, `fee-errors.ts`, `scanner-state.ts`, `truncate-decimal.ts`. **No Solidity contracts in scope** — confirming Polygun is non-custodial only in the user-signs-their-own-Polymarket-trades sense; Polygun's own treasury moves via Gnosis Safe + admin signers.
- **Repository (private):** `toantt208/polygun_audit` ([INSPECTED] from review commit hashes)
- **Engagement type:** Three sequential audits over ~2 months (Feb 17-26 → Mar 25-31 → Apr 16-22). Each subsequent audit reviews the prior fix-commit + new feature delta. Commit chain: `360d6fe4` (Feb baseline) → `42f1f1e8` (Feb fixes = Mar baseline) → `3cd6ba3f` (Mar fixes = Apr baseline) → `7fc47592` (Apr fixes). [EXECUTED] from PDF cover page hash strings.
- **PER-AUDIT severity (corrected from PDF):**
  - **Feb 17 (Audit 1):** 0C / 2H / 10M / 41L = **53 findings**
  - **Mar 25 (Audit 2):** 0C / 0H / 2M / 15L = **17 findings**
  - **Apr 16 (Audit 3):** 0C / 2H / 7M / 22L = **31 findings** + 1 extra L found mid-doc → 22L confirmed in TOC, treating index value as authoritative
  - **AGGREGATE:** 0 Critical / 4 High / 19 Medium / 78 Low = **101 findings total** (v1 stub's "82 findings, 4H/19M/59L" was incorrect — corrected to **4H/19M/78L = 101**, [INSPECTED] from each PDF's "Findings count" table)
- **Methodology section quoted from PDFs ([INSPECTED]):** "Our auditors draw on experience from private engagements and public contests, and pick their own toolset per project — static analysis, fuzzers, formal verification, **and AI-assisted review** — based on what fits the codebase." [Polygun-2026-04-16.pdf p4]. **AI-assisted review explicitly disclosed.** Direct competitive-intel relevance vs BuzzShield V6 Layer 4 Skeptic + Phase 4d Opus pass.

### High findings — full catalog ([INSPECTED] from PDF body)

| ID         | Audit  | Title                                                                                            | Severity (Impact / Likelihood) | Root cause class                                                            | Status     |
| ---------- | ------ | ------------------------------------------------------------------------------------------------ | ------------------------------ | --------------------------------------------------------------------------- | ---------- |
| Feb [H-01] | Feb-17 | Race condition in limit order processor allows fee bypass                                        | H / M                          | TOCTOU race — concurrent BullMQ workers read stale `currentFilled`          | Resolved   |
| Feb [H-02] | Feb-17 | Promo claim race condition allows double payment                                                 | H / M                          | TOCTOU race — duplicate Telegram webhook → 2 BullMQ jobs both transferUsdc  | Resolved   |
| Apr [H-01] | Apr-16 | Receipt fetch failure after USDC transfer allows repeated commission payouts                     | H / M                          | Post-transfer error-handling: `addPendingCommission` restores balance after a successful on-chain transfer when `getTransactionReceipt` flakes  | Resolved   |
| Apr [H-02] | Apr-16 | `resetPendingCommission` returns zero instead of user pending commission value                   | H / M                          | TS type-cast escape-hatch (`as any` → `.rows` access on postgres-js result which is array-shaped, not `{rows:[…]}`) — returns '0' every call, silently zeros user balances on first withdrawal-tap | Resolved   |

**Mar 25 audit had zero Highs** — fix-review of Feb baseline added new TOTP/2FA features; only Mediums + Lows surfaced.

### Medium findings — key pattern clusters ([INSPECTED])

- **TOCTOU race pattern (recurrent):** Feb [M-01] Referral withdrawal double-claim, Feb [M-07] Non-atomic commission balance op, Feb [M-08] Promo claim updates state without validation, Apr [M-05] `updateFill` lacks idempotency guard. **5+ TOCTOU races over 3 audits** in BullMQ-driven worker code. Pattern class: **off-chain TS/Postgres TOCTOU with BullMQ enqueue** — equivalent to on-chain reentrancy but at the off-chain orchestration layer.
- **Idempotency / dedup gaps (recurrent):** Feb [L-20], Apr [M-01] (`fee_transfers` migration-only unique index not in schema), Apr [M-06] (missing unique constraint on `fee_transfers`), Apr [L-09] (`recordCopyTrade` lacks idempotency key), Apr [L-11] (`referral_commissions` no UNIQUE on (trade_id, beneficiary_id, level)). **5+ unique-constraint gaps.**
- **State-machine integrity (recurrent):** Apr [M-02] Promo stuck in `processing` (missing revert logic), Apr [M-03] `revertPromoToPending` allows reversion AFTER successful on-chain transfer. Both = on-chain commit point not respected by off-chain state machine.
- **2FA / private-key safety (Mar-25 cluster):** Mar [M-01] TOTP reuse-lock permanently fails BullMQ retry, Mar [M-02] **Compound private key extraction via job-data leak + wide TOTP window** = admin auth bypass + `/admin/jobs/search` returns raw TOTP codes from queue payloads + same TOTP code valid for both withdrawal AND private-key-export flows. Chain leads to full wallet takeover. This is a **DC-9-adjacent** "privileged-state-mutation without defense-in-depth" — admin role + TOTP-code reuse across two different authority levels (withdrawal vs export) = catastrophic if admin compromised.
- **Database safety nits (recurrent):** missing unique constraints, mixed timezone handling, `Math.random()` for share/referral codes, soft-delete asymmetries, decimal-rounding in PostgreSQL `decimal(18,6)`. These are the Pashov-style nit-pick coverage that drives the 78 Low count.

### 3-Review change-tracking (operator-requested)

| Question                                                              | Answer ([INSPECTED] from extracted text)                                                                                                                                                                                                                                                                                                                            |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| What was found in Feb that was fixed by Apr?                          | All Feb findings (53/53) marked "Resolved" by Mar baseline commit `42f1f1e8`. Apr review's baseline IS that fixed commit, so Apr re-audited the fix-deltas — finding the next layer of bugs introduced by the fixes themselves.                                                                                                                                     |
| What NEW findings appeared in later reviews (CANDIDATE-M class)?      | **YES — Apr [H-02] `resetPendingCommission` returns zero is a textbook CANDIDATE-M (Post-Audit Refactor Introduced New CEI/Trust Gap).** Apr [H-02] was introduced AFTER Feb [M-07] (non-atomic commission balance) was fixed — Mar baseline contains the new CTE-based atomic SQL that has the `.rows` TypeScript shape bug. The atomic fix to a race-condition introduced a silent-zero bug that wipes user balances every time they tap "Withdraw Earnings". **This is CANDIDATE-M post-audit refactor introducing a NEW class of bug** — analogous on-chain to a CEI fix introducing an upgradeable-hook trust gap. **Anchor candidate for CANDIDATE-M (off-chain variant).**                              |
| What was missed in earlier reviews and caught later?                  | Apr [M-04] Migrations hold ACCESS EXCLUSIVE on large tables — this was a structural pattern present in Feb baseline scope but only surfaced in Apr. Apr [M-07] Referral percent override cannot be applied — also a pre-existing condition. Mar audit's [M-02] compound-key-extraction chain was unfindable in Feb because admin dashboard + TOTP system shipped between Feb baseline and Mar baseline. |
| Findings showing in ALL THREE = unfixed-or-acknowledged risk?         | No literal duplicates (each finding ID is unique per audit). However, the TOCTOU race pattern recurs across all 3 (Feb H-01/H-02, Mar M-02 wide TOTP window, Apr H-01 receipt-fetch race, Apr M-05 updateFill idempotency). **Recurring pattern = systemic risk** in the BullMQ-driven architecture. **Status flags ACKNOWLEDGED (not Resolved):** Feb [L-03] (`isBanned` set path), Mar [L-08] (verified-2fa code not cleared), Mar [L-09] (bridge-withdraw queue retains TOTP+sigs plaintext), Apr [L-05] (migration ledger abandoned). 4 acknowledged-not-fixed risks tracked across all reviews.                                                       |

### CANDIDATE-M anchor (NEW v2 finding from this intake)

**Apr [H-02] is filed as a CANDIDATE-M off-chain-variant anchor.** The pattern signature:

1. Feb [M-07] flagged a non-atomic commission-balance operation (TOCTOU race in BullMQ workers)
2. Fix shipped between Feb-26 and Mar-25: replaced the multi-statement code with a CTE-based atomic SQL using `db.execute(sql\`WITH old AS (...) UPDATE ... RETURNING old.prev\`)`
3. The fix introduced a new bug: postgres-js result is array-shaped, not `{rows:[…]}`, so `(result as any).rows?.[0]?.previous_commission || '0'` always returns '0'
4. The TypeScript `as any` cast suppressed the type error that would have caught it at compile time
5. Caller (referral-withdraw handler) interprets '0' as "user balance was zero", enters minimum-withdrawal branch, returns out WITHOUT restoring balance — meanwhile the UPDATE already zeroed the DB column
6. Result: **post-audit fix silently introduces a HIGH-impact balance-wipe on every user tap of "Withdraw Earnings"**

This is the same logical shape as CANDIDATE-M on-chain (Post-Audit CEI Break Via Upgradeable Hook) — a SECURITY fix introduces a different vulnerability class because the refactor crosses an abstraction-layer boundary the auditor wasn't re-validating against. **Off-chain analogue: TS escape-hatches (`as any`) + ORM-driver shape mismatch + non-LLM-reviewable property access = silent regression class.**

Add to `brain/Patterns-Defense-Classes.md` CANDIDATE pool as **CANDIDATE-M-off (Off-chain Post-Audit Refactor Introducing Silent Type-Coerce Regression)** — distinct from on-chain CANDIDATE-M (CEI/hook) but same underlying meta-pattern.

### Cross-pollination vs Buzz brain catalog

- **DC-9 sub-2 (zero-timelock migration / unchecked privileged-state mutation):** Mar [M-02] compound private key extraction is a textbook DC-9-adjacent — admin's `/admin/jobs/search` mutates application authority (returns raw TOTP codes) without defense-in-depth (no rate limiting, no TOTP rotation, no encrypted job payloads). Off-chain analog of DC-9; sub-pattern catalog already covers this conceptually.
- **DC-7 (Validating-Field ≠ Consuming-Field):** Apr [H-02] is DC-7-adjacent — `resetPendingCommission` validates the UPDATE was applied (it was) but consumes a different field (`.rows`) than what postgres-js produces (array). The "validate one thing, consume another" pattern crossing the TS-type/ORM-shape boundary. Off-chain analog of DC-7. **Worth adding to Cross-Domain-Fragility-Laws.md as a TS/ORM cross-domain fragility example** when Cross-Domain doctrine is next revised.
- **Pattern E (Arithmetic Rounding Asymmetry):** Apr [L-21] `findBySafeAddress` is case-sensitive vs checksummed addresses — same pattern family (canonicalization gap) at the DB-query layer. Off-chain analog.
- **CANDIDATE-J (set-halt sibling-pair):** Feb [M-02] non-atomic pause allows active trades during pause — direct CANDIDATE-J off-chain analog. The "set_halt does not invalidate in-flight operations" pattern is universal.

### Strategic relevance (revised post-PDF)

1. **Polygun is OFF-CHAIN code, not Solidity.** v1 entry incorrectly framed it as EVM. Pashov's "trading-bot scope" expansion is into **off-chain TypeScript orchestration code that touches on-chain Polymarket positions via Gnosis Safe + ABI calldata composition**. This is a different domain than smart-contract audit — closer to web-app security + financial-state-machine audit. **Buzz hunt-eligibility on Polygun directly: ZERO** (no on-chain code in scope; off-chain TS doesn't fit BuzzShield V6 detector pack).

2. **Pashov's AI-assisted-review disclosure (in methodology section, all 3 PDFs)** is the most important competitive-intel takeaway. They are publicly using AI tooling in private audits. The Skeptic + Phase 4d Opus model Buzz uses internally is convergent with Pashov's methodology. **The competitive gap is at the productization layer** — Pashov ships private audits + an open `github.com/pashov/skills` repo; Buzz ships a single-pass automated pipeline + brain ledger + Lane 1.5 deployment hunting. Different go-to-market.

3. **CANDIDATE-M off-chain variant (Apr [H-02])** is the highest-EV brain-catalog contribution from this intake. It anchors a NEW failure-mode class: **post-audit refactor silent type-coerce regression via TS `as any` + ORM-shape mismatch**. Document the variant in CANDIDATE pool (deferred to next CANDIDATE-pool review; this entry is intake-only, no modifications to defense-class-mapping.json per task constraints).

### Discipline notes

- No PoC. No engagement with Pashov beyond intel-reading.
- Polygun is private repo (`toantt208/polygun_audit`); no public-bounty avenue exists for this codebase.
- All 4 PDF text extracts saved to ephemeral `/home/claude-code/.tmp-pdf-extract/` (NOT committed; per task constraint "DO NOT commit to git"). Source PDFs remain at the GitHub URLs.

---

## §6 — Spicenet (Pashov Audit Group, 2026-04-06)

### Audit metadata

- **Auditor:** Pashov Audit Group ([INSPECTED] — credits Nirlin, Playboieth, 0xAlix2, Newspace)
- **Target:** **Spicenet** — Sovereign-SDK-based rollup with on-chain settlement module for cross-chain token transfers + withdrawal-intent processing
- **Protocol category:** **Sovereign Rollup Settlements / Bridge** (cross-chain escrow with receipt-token minting, multi-chain token mapping, intent-authenticated withdrawals)
- **Architecture summary ([INSPECTED] from PDF §4):**
  - Receipt-token model: deposits on L1 escrow contracts → admin submits L1 transaction proofs → rollup mints receipt tokens via `sov_bank`
  - Multi-chain token mapping: single receipt token can be backed by multiple chain-specific addresses (Ethereum USDC, BSC USDC, etc.)
  - Withdrawal flow: user signs IntentAuth → `execute_intent_auth` debits user receipt tokens + decrements escrow ledger → admin submits L1 `WithdrawalProcessed` event proof → `process_withdrawal_confirmed` finalizes
  - Chain-agnostic design intended (supports EVM, Solana SVM, Aptos, Sui) but partially hardcoded to 20-byte EVM addresses in execute_intent_auth (see L-01)
  - Capsule module handles signature verification (ECDSA recover; EIP-1271 added post-fix for smart-contract wallets)
- **Language:** Rust (Sovereign SDK / Sov module framework)
- **Repository ([INSPECTED] from cover page):** `pepper-research/spicenet` — review commit `49342225` → fix commit `fd99accd`
- **Scope:** `execute_intent_auth.rs`, `process_transaction.rs`, `update_mapping.rs`, `lib.rs`, `error.rs`, `event.rs`, `get.rs`, `chain_address.rs`, `chain_id.rs`, `chain_scoped_data.rs`, `chain_transaction.rs`, `withdrawal_request.rs`, `svm_network.rs`, `token_id_ord.rs`, `helpers.rs`, `wallet.rs`
- **TVL / market cap:** Not present in PDF [ASSUMED] no public TVL data; Spicenet is pre-launch ([ASSUMED] from absence of mainnet activity references in PDF + private repo)
- **Bounty program status:** Not present in PDF; [ASSUMED] no public bug bounty yet (pre-launch posture)
- **Severity:** 0 Critical / 2 High / 3 Medium / 10 Low = **15 findings total**

### Full findings catalog ([INSPECTED])

| ID    | Title                                                                            | Severity (I/L) | Pattern class                                                                          | Status      |
| ----- | -------------------------------------------------------------------------------- | -------------- | -------------------------------------------------------------------------------------- | ----------- |
| H-01  | Inconsistent token decimal handling in `update_mapping` function                 | H / M          | **Cross-chain decimal-mismatch arbitrage** — admin can map 6-dec USDC + 18-dec USDC to same receipt token; attacker deposits 100 USDC (18-dec) and withdraws 50,000 USDC (6-dec). $10^12$ multiplier. | Resolved (new `ChainTokenConfig` carrying decimals field; `normalize_decimals` helper)  |
| H-02  | Missing recipient validation in `process_transaction` function                   | H / M          | **Phantom-deposit via `Transfer.to` not validated** — admin submits L1 tx with `Transfer(User, Escrow, 100)` + `Transfer(User, Attacker, 50000)`; both processed as deposits without checking destination. Fee-on-transfer tokens (USDT) double-emit a single transfer.  | Resolved (`log.address` validated against registered escrow contract per chain)         |
| M-01  | Withdrawal confirmation burns amounts without validating against stored request   | M / M          | **Off-chain ↔ on-chain event vs stored-state divergence** — burn amounts taken from `WithdrawalProcessed` event but never cross-checked against original `WithdrawalRequest.transfers`. Fee-on-transfer + partial multi-transfer execution both break invariants permanently.  | Resolved (transfer count + recipient + token_out cross-validated) |
| M-02  | Withdrawal confirmation lacks validation of `chain_hash` against stored request   | H / L          | **Cross-chain replay** — `WithdrawalProcessed` event from chain B can confirm a withdrawal request created for chain A; only `idempotence_key` checked. **DC-6 (cross-domain) DIRECT MATCH.**  | Resolved (chain_id cross-validated)                                                |
| M-03  | Failed withdrawals have no recovery path permanently locking user values         | M / M          | **Missing state-transition for failure path** — `WithdrawalRequestState::Failed` variant exists but no code path ever transitions to it. User tokens lock in admin custody forever.  | Resolved (`CancelWithdrawalRequest` admin call + refund flow)               |
| L-01  | Hardcoded user address in ExecuteIntentAuth restricts chain-agnostic design       | L / N/A        | Type-level coupling to 20-byte EVM address; inconsistent with declared chain-agnostic design (Solana 32-byte support advertised but not exercised in intent flow) | Acknowledged                                            |
| L-02  | Withdrawal requests persist unbounded user-controlled strings                     | L / N/A        | State-bloat via unbounded `metadata` / `token_out` / `recipient` strings              | Resolved (1024-byte cap)                                                                 |
| L-03  | Zero-amount deposits and withdrawals are accepted                                | L / N/A        | Spam-state class — zero-value deposits/withdrawals consume persistent state           | Acknowledged                                                                            |
| L-04  | Only the first call in a signed batch is executed while others are discarded     | L / N/A        | **Signature-scope mismatch** — user signs N-call batch; only call[0] executes; nullifier consumes entire intent so user cannot recover. **CANDIDATE-A (signature-scope-must-cover-outcome-bit) DIRECT MATCH.** | Resolved (all calls iterated)                       |
| L-05  | Admin address is immutable no key rotation mechanism                              | L / N/A        | **DC-9 sub-1 (admin lockout / no rotation)** — single admin, no propose/accept admin, no multisig, no timelock                  | Resolved                                                                                |
| L-06  | Inconsistent HashSet implementations across the crate                            | L / N/A        | `ahash::HashSet` vs `std::HashSet` — inconsistent hashing behavior                    | Resolved                                                                                |
| L-07  | Smart contract wallets unable to withdraw funds from L1 escrow                   | L / N/A        | **Optimism-bridge L2-counterpart class** — ECDSA-only verification rejects EIP-1271 smart-wallet sigs; deposits from CA wallets lock forever. **DC-6 + DC-3 cross.**                                                          | Resolved (EIP-1271 fallback added)                                                                            |
| L-08  | Inadequate validation in `update_mapping` function for token removal             | L / N/A        | **TOCTOU between mapping change and withdrawal confirmation** — admin removes token mapping while in-flight withdrawal requests reference it; confirmation reverts; user receipt tokens stranded forever         | Acknowledged                                                                |
| L-09  | Per-user withdrawal history grows unbounded with O(n) rewrite cost per request   | L / N/A        | DoS via per-user `Vec<HexHash>` grows unbounded, full deserialize/reserialize per op  | Acknowledged                                                                          |
| L-10  | No validation of `log.address` in `WithdrawalProcessed` event enables attack     | L / N/A        | **Phantom-event class** — same root cause as H-02 but for the OTHER event handler; rogue contract on L1 emits `WithdrawalProcessed` event with victim's idempotence_key → admin's relayer processes it → real withdrawal blocked, attacker-controlled burn amounts.  | Resolved (`log.address` validated against registered escrow)                                                                |

### Pattern classes flagged (auditor language → Buzz brain reframing)

| Auditor framing                                          | Buzz brain reframing                                                                                                              |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| "Inconsistent token decimal handling" (H-01)             | **Cross-chain canonical-unit gap** — DC-7 (Validating-Field ≠ Consuming-Field) where the field is "amount unit". Productization opportunity: BuzzShield V6 detector for `mint`/`burn` paths that don't normalize per-chain decimals. |
| "Missing recipient validation" (H-02 + L-10)             | **Pattern A1 (unchecked Transfer.to in event-driven deposit/withdrawal)** — applies to ALL rollups that ingest L1 event proofs. High-yield detector candidate. |
| "Stored request not cross-validated vs on-chain event" (M-01) | **DC-7 cross-layer field-binding gap** — the rollup STORES (validating side) one set of fields, the rollup CONSUMES (acting side) a different set of fields from the event. Pattern matches Veda Manager↔Decoder, OKX EIP-1271, Coinbase TEE-Verifier. **High brain-anchor value.** |
| "Cross-chain chain_hash not validated" (M-02)            | **DC-6 (Cross-Domain) DIRECT MATCH** — withdrawal created for chain A confirmed by event from chain B. Brain-catalog hit, no new candidate slot needed. |
| "Failed withdrawals no recovery path" (M-03)             | **CANDIDATE-J variant (state-machine-cooldown-overwrite)** — state enum has Failed variant declared but unreachable; partial state machine. |
| "Only first call in batch executes" (L-04)               | **CANDIDATE-A DIRECT MATCH** — signature-scope-must-cover-outcome-bit. User signs N calls, only 1 executes, but nullifier consumes all N. |
| "Smart contract wallets can't withdraw" (L-07)           | **DC-6 + DC-3 cross** — bridge-side ECDSA-only assumption + Optimism-bridge-historical class. Pattern surfaces in any new chain-agnostic protocol that doesn't add EIP-1271 path.                            |

### Methodology notes ([INSPECTED])

- Same Pashov methodology language as Polygun reports: "static analysis, fuzzers, formal verification, and AI-assisted review — based on what fits the codebase" (p4)
- Team of 4 reviewers (smaller than Polygun's 5-person Apr team)
- 5-day engagement (vs Polygun's 10-day Feb baseline) — smaller scope, fewer files
- "Fix Implemented" sections appear under most resolved findings — auditor verified each fix post-engagement. Higher-confidence resolution evidence than Polygun reports.

### Spicenet protocol intel (operator-requested watchlist-add eval)

| Dimension                                | Value                                                                                                                                                                                                                       |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Protocol category                        | Sovereign rollup with settlements module = **bridge / cross-chain settlement layer**                                                                                                                                       |
| Architecture                              | Sov-SDK rollup + admin-relayed L1 event ingestion + receipt-token mint/burn + multi-chain mapping. Trust model: admin is single signer (no multisig/timelock pre-fix).                                                      |
| TVL / market cap                          | Pre-launch ([ASSUMED]); no PDF disclosure                                                                                                                                                                                  |
| Bounty program                            | Pre-launch ([ASSUMED]); no PDF disclosure. Pepper Research is the apparent org (`pepper-research/spicenet` GitHub).                                                                                                       |
| Buzz brain lens fit                       | **HIGH OVERLAP** — DC-6 (M-02), DC-3 (L-05 admin lockout), CANDIDATE-A (L-04), DC-7 reframings of H-01/H-02/M-01, Optimism-bridge-L2-counterpart class (L-07). Bridge category is highest-EV Lane 1 family.                |
| Watchlist-add recommendation              | **YES — add to 30-repo watchlist as a NEW protocol entry.** [ASSUMED] watchlist exists per Standing Intake Protocol; note as candidate for next watchlist-revision per task constraint (do NOT modify watchlist files now). |

### Cross-pollination vs Buzz brain catalog

- **DC-6 (Cross-Domain Fragility):** M-02 chain_hash-not-validated is a direct add to `brain/Cross-Domain-Fragility-Laws.md` if a "stored-chain-id-not-checked-on-confirmation" sub-pattern is not already documented. Worth a CANDIDATE-A (cross-chain bridge) finder rule for BuzzShield Pattern A detector.
- **CANDIDATE-A (cross-chain bridge):** L-04 batch-signature-scope and M-02 chain_hash add 2 fresh exemplars for the candidate pool. Strengthens promotion case for CANDIDATE-A → DC-A.
- **DC-9 sub-1 (admin / no rotation):** L-05 immutable admin is a textbook DC-9-sub-1 hit. Direct add to DC-9 exemplar list.
- **L-07 EIP-1271 gap:** identical class to OKX EIP-1271 finding Buzz hunted in early 2026 (cited in `brain/Patterns-Defense-Classes.md`). Same root: ECDSA-only signature path doesn't fall back to EIP-1271 isValidSignature. Worth a BuzzShield V6 detector enricher: when a verifier uses `ecrecover` only AND the protocol accepts deposits from arbitrary `from` addresses, flag.
- **L-08 mapping-change TOCTOU:** generalizes to a new sub-pattern under CANDIDATE-J (set-halt + mid-flight ops): "admin config-change vs in-flight user-op" is a config-version-of CANDIDATE-J. Worth a sub-pattern doctrine note.

### Discipline notes

- Spicenet PDF source: `Spicenet-security-review_2026-04-06.pdf` (raw.githubusercontent.com/pashov/audits, [EXECUTED] via pypdf)
- No PoC. No engagement with Pepper Research. No watchlist-file modification per task constraint.
- Future watchlist-add: when next watchlist revision is performed, add `pepper-research/spicenet` with priority HIGH (bridge category, DC-6 + CANDIDATE-A direct overlap).

---

_Audit Reports Library | v1.4 | 2026-05-23 (§5 Polygun v2 PDF-expanded + §6 Spicenet added per operator msg 7582 intake batch D+E+F+G. Polygun severity corrected to 0C/4H/19M/78L = 101 findings; Polygun-domain corrected from EVM-trading-bot to off-chain TS/Postgres/BullMQ orchestration + Gnosis Safe. CANDIDATE-M off-chain variant anchored at Apr-2026 [H-02] (`resetPendingCommission` silent-zero regression). Spicenet new sovereign-rollup-bridge protocol catalogued; HIGH brain-lens overlap (DC-6/DC-3/CANDIDATE-A direct hits); watchlist-add candidate flagged. All 4 PDFs [EXECUTED] via pypdf, findings [INSPECTED] from extracted text. Pashov methodology AI-assisted-review disclosure logged.)_
