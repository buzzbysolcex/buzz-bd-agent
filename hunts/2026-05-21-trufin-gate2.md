# TruFin Solana — Gate 2 Confirm/Kill

> Date: 2026-05-21 (filed per Master Ops directive — Lane 1 immediate queue B)
> Commit pinned: HEAD `8c31598` (TruFin solana-smart-contracts, May 2026)
> Repo: `/home/claude-code/.tmp-build/trufin-clone/solana-smart-contracts/`
> Status: **KILL — Critical thesis FAILS premise. Residual finding downgraded to Medium-Low (referral-fee diversion).** No same-day submit.

---

## TL;DR

The Gate 1 hypothesis that 6+ `/// CHECK:` unvalidated `AccountInfo<'info>` fields in `process_deposit` enable a $30K-class Critical referral-fee redirect attack **FAILS premise** under deeper trace. **SPL stake-pool program itself enforces the constellation of related accounts** (withdraw_authority, pool_reserve, pool_mint, fee_token_account) against the user-supplied `stake_pool` account's stored config. The only un-validated-by-anyone account is `referral_fee_token_account`, which **IS exploitable but per SPL stake-pool design**, not a TruFin bug.

**Three confirm/kill questions answered:**

| Q   | Question                                                  | Verdict                                                                                                                                                                                                                                                                                                                                                                     |
| --- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Canonical SPL stake-pool bound in protocol state?         | **NO** — `Access` struct lacks any stake-pool field; NO setter exists. **Confirmed structural gap.** But not exploitable for theft because SPL stake-pool internally validates all related accounts against the passed stake-pool's stored config. Net effect: user can choose ANY real SPL stake-pool; their deposit goes there; protocol pays nothing — it's user choice. |
| 2   | Referral-fee redirect requires only unvalidated accounts? | **YES** — `referral_fee_token_account` is `/// CHECK:` with no Anchor constraint AND SPL stake-pool DOES NOT validate it (per SPL design — referral fee is caller-specified).                                                                                                                                                                                               |
| 3   | Fee-receiver = signer-derived PDA vs caller-supplied?     | **Caller-supplied with SPL-side validation.** `fee_token_account` (manager fee) IS validated by SPL stake-pool against `stake_pool.manager_fee_account`. Attacker cannot redirect manager fee. `referral_fee_token_account` is NOT validated by SPL — attacker CAN set it freely.                                                                                           |

**Net submittable finding:** Medium-Low (referral-fee diversion, attacker pays themselves the referral cut on their own deposit fees). **NOT a Critical.** Estimated bounty if accepted: $1K–$5K, not $30K.

---

## 1. The full trace

### 1.1 Account binding analysis

`programs/staker/src/instructions/staking.rs` — `Deposit` struct (lines 14-79):

```rust
#[derive(Accounts)]
pub struct Deposit<'info> {
    pub user: Signer<'info>,
    pub user_whitelist_account: Account<'info, UserStatus>,  // PDA: ["user", user.key()]
    pub access: Box<Account<'info, Access>>,                  // PDA: ["access"]

    /// CHECK: the stake pool account                         ← unbound
    pub stake_pool: AccountInfo<'info>,
    /// CHECK: the deposit authority PDA                      ← unbound (TruFin's "deposit" PDA passed as separate signer below)
    pub deposit_authority: AccountInfo<'info>,
    /// CHECK: the withdraw authority PDA                     ← unbound
    pub withdraw_authority: AccountInfo<'info>,
    /// CHECK: the reserve account of the stake pool         ← unbound
    pub pool_reserve: AccountInfo<'info>,
    /// CHECK: User's pool token associated token account     ← unbound
    pub user_pool_token_account: AccountInfo<'info>,
    /// CHECK: Fee token account                              ← unbound
    pub fee_token_account: AccountInfo<'info>,
    /// CHECK: Pool token mint                                ← unbound
    pub pool_mint: AccountInfo<'info>,
    /// CHECK: Referral fee token account                     ← unbound — THE attack surface
    pub referral_fee_token_account: AccountInfo<'info>,
    ...
}
```

### 1.2 Access state has no canonical binding

`programs/staker/src/state/types.rs`:

```rust
#[account]
pub struct Access {
    pub owner: Pubkey,
    pub stake_manager: Pubkey,
    pub is_paused: bool,
    pub pending_owner: Option<Pubkey>,
}
```

**Verified by `grep -rn "stake_pool|fee_token_account|referral" state/`: zero matches.** Access does NOT store canonical stake_pool, fee_token_account, or referral_fee_token_account addresses. No setter functions exist to set these values.

This confirms structural gap — TruFin's on-chain code has NO concept of a "canonical" stake-pool. The protocol is purely a permissioning wrapper (whitelist + pause) around SPL stake-pool's DepositSol.

### 1.3 Why the attack vector COLLAPSES at SPL stake-pool's internal validation

The Gate 1 hypothesis assumed: "attacker passes ANY combination of fake/real accounts and steals fees." Trace what SPL stake-pool actually validates inside its `DepositSol` instruction:

| Account                      | SPL stake-pool validation                                                                | Attacker freedom                                      |
| ---------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `stake_pool`                 | Validated as `is_signer == false`, has stake-pool magic + owner == STAKE_POOL_PROGRAM_ID | Must be REAL SPL stake-pool                           |
| `withdraw_authority`         | Validated against `stake_pool.withdraw_bump_seed` derivation                             | Must match passed stake-pool                          |
| `pool_reserve`               | Validated against `stake_pool.reserve_stake`                                             | Must match passed stake-pool                          |
| `fee_token_account`          | Validated against `stake_pool.manager_fee_account`                                       | Must match passed stake-pool                          |
| `pool_mint`                  | Validated against `stake_pool.pool_mint`                                                 | Must match passed stake-pool                          |
| `referral_fee_token_account` | **NOT validated** — must be owned by token_program + pool_mint                           | Attacker freely chooses ANY valid ATA                 |
| `deposit_authority`          | Validated against `stake_pool.sol_deposit_authority` AND must be signer                  | Must match passed stake-pool — TruFin's "deposit" PDA |

**Key insight:** SPL stake-pool acts as a strict checker: if you pass stake-pool X, ALL related accounts must be X's. You can't mix-and-match.

**What the attacker CAN do:**

1. Pass the **canonical TruFin SPL stake-pool** (the one TruFin's frontend uses)
2. Pass the matching withdraw_authority, pool_reserve, pool_mint, fee_token_account (all canonical)
3. Pass **TruFin's deposit_authority PDA** (computed by `find_program_address(["deposit"], program_id)`)
4. Substitute **ATTACKER's referral_fee_token_account** (their own ATA for pool_mint)
5. Pay normal deposit fee
6. SPL stake-pool splits fee → manager_fee_account (canonical) + referral_fee_token_account (attacker's ATA)

**What the attacker pays themselves:** the REFERRAL cut of their OWN deposit fee. Not theft of other users' funds.

### 1.4 Severity assessment

**Magnitude per attack:**

- Deposit fee: typically 0.1-0.5% of deposit (TruFin-specific config)
- Referral cut: typically 50% of deposit fee (TruFin-specific config)
- Net diversion per attacker deposit: 0.05%-0.25% of deposit

**Cumulative impact:**

- TruFin treasury loses the referral cut of every "non-referral" deposit
- If attacker deposits $100K → diverts ~$50-$250 in referral cut (one-shot)
- Sustained drain: low because users typically deposit once-twice

**Per Immunefi severity matrix:**

- Direct theft of user funds: NO
- Theft of unclaimed yield: NO (this is fee revenue, not yield)
- Theft of protocol fees / griefing of protocol revenue: arguably Medium per Immunefi "theft of unclaimed yield" interpretation
- Most likely classification: **Medium ($1K–$10K)** or **Low ($200–$1K)**

**The original Gate 1 "Critical $30K flat" thesis was WRONG.** Vector ≠ outcome (Doctrine #14).

---

## 2. What's left submittable

### 2.1 Medium-Low: Referral-fee diversion

**Finding:** `process_deposit` and `process_deposit_to_specific_validator` accept `referral_fee_token_account` as an unconstrained `/// CHECK:` AccountInfo, allowing any depositor to set their own ATA as the referral-fee receiver. Since the SPL stake-pool program does not validate the referral receiver against any TruFin state, depositors can divert the referral portion of their own deposit fees away from TruFin's intended treasury.

**Impact:** Loss of expected referral revenue to TruFin treasury. Each diverted attack returns the referral-cut portion of one user's deposit fee. Cumulative impact scales with deposit volume but is bounded by referral percentage.

**Recommendation for TruFin:** add Anchor constraint on `referral_fee_token_account` against an on-chain canonical address stored in Access (or a per-partner registry account). Example:

```rust
#[account(
    mut,
    constraint = referral_fee_token_account.key() == access.canonical_referral_account
        || partner_referral_registry.contains(referral_fee_token_account.key())
        @ ErrorCode::InvalidReferralAccount
)]
pub referral_fee_token_account: AccountInfo<'info>,
```

**Submission decision:** WAIT. Reasons:

1. The severity is Medium-Low ($1K-$10K). At 50% probability of acceptance, EV is $500-$5K.
2. Submit cost: ~1 hour to write + Immunefi rate-limit budget (currently 1/24h shared with Veda + Ethena queue).
3. **Higher-EV alternative use of submit slot:** Veda RESUBMIT ($10-25K HIGH) and Ethena ($10K HIGH) are queued.
4. Hold TruFin Medium-Low for a future cycle when no HIGH submissions are queued.

### 2.2 Informational: stake-pool address not state-bound

**Finding:** The TruFin program does not store the canonical SPL stake-pool address in any on-chain state, relying on users (and SPL stake-pool's internal validation) to supply the correct pool. While this does not enable direct theft, it represents a defense-in-depth gap.

**Impact:** Informational only. Users could deposit into a different SPL stake-pool, receiving that pool's tokens (not TruFin's), but this is user choice and not protocol loss.

**Recommendation:** add a `canonical_stake_pool: Pubkey` field to Access and an `#[account(constraint = stake_pool.key() == access.canonical_stake_pool)]` to all deposit instructions.

**Submission decision:** DO NOT SUBMIT. Informational findings on Immunefi rarely pay; this would burn a submission slot for $0.

---

## 3. Doctrine #0 (VERIFY-PREMISE-FIRST) lesson logged

The Gate 1 hypothesis "$30K flat Critical" rested on the assumption that 6+ unvalidated `/// CHECK:` accounts directly enable theft. **The premise was incomplete** — it ignored SPL stake-pool's INTERNAL validation chain. Verifying that internal validation reveals the attack surface is much narrower (referral_fee only).

**Lesson:** When a target's `/// CHECK:` accounts feed into a sub-program via CPI, the sub-program's internal validation MUST be traced before concluding "no validation = exploitable." The validation may be at the SUB-program layer, not the caller.

**Filed to brain/Doctrine.md as worked example candidate** — "Doctrine #0 worked example: CPI sub-program validation chain. Stop at the CPI boundary, trace the callee's checks before assigning severity."

---

## 4. Decision and next steps

**DECISION:** KILL the Critical thesis. No same-day submit.

**Residual:** Medium-Low referral-fee diversion finding documented. Submit decision deferred — current submit queue (Veda + Ethena) is HIGH-severity higher-EV.

**Next actions:**

1. **Update brain ledgers:** mark TruFin CANDIDATE-G #1 as "verified-but-downgraded-from-Critical-to-Medium-Low." This is a partial KILL, not a full kill — the surface is real, just smaller than first believed.
2. **DC-8 family promotion check:** the TruFin surface STILL counts as a DC-8 instance (signer-validation pattern moved out of Accounts struct). The class remains valid even though THIS specific instance is Medium-Low. **Adevar (Crit) + OnRe (Crit) + TruFin (Med-Low)** still anchors the family. Update Cross-Domain-Fragility-Laws.md if severity-grading by anchor matters.
3. **Forward to Veda RESUBMIT (14:30 UTC) and Ethena (next day):** higher-EV.
4. **Queue TruFin Medium-Low submission** for a future cycle when no HIGH submissions are pending. Estimated future submit window: 2026-05-23 or later.

---

## 5. Brain compounding notes

- **Doctrine #0 worked example candidate:** CPI sub-program validation chain. Don't assume caller-level missing validation = exploitable; trace the callee.
- **DC-8 family stability:** TruFin instance keeps class viable as 4th anchor even at Medium-Low severity. Pattern doesn't require all instances to be Crit.
- **vector ≠ outcome (Doctrine #14) confirmed AGAIN.** A clean attack vector (passing arbitrary accounts) does NOT imply a clean attack outcome (theft). The outcome depends on downstream validation chains.

---

_TruFin Gate 2 — Critical thesis KILLED, Medium-Low residual documented, submit deferred. Doctrine #0 lesson logged. Veda + Ethena remain primary submit queue._
