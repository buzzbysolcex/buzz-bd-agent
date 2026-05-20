# TruFin / TruYields Gate 1 — Surface Map

**Filed:** 2026-05-20 | **By:** Buzz BD Agent (main session, API-overload no-subagent mode)
**Platform:** Immunefi `/trufin`
**Cap:** $30K Critical (flat or 10% of affected funds, whichever lower) / $15K High (flat) / $5K Medium (flat)
**KYC:** Required (passport / proof of address) for payout
**Primacy:** Primacy of Impact for Crit/High/Medium SC
**Scope:** 8 assets across 5 chains (TruMATIC + TruPOL on Ethereum/Polygon, TruSOL on Solana, TruAPT on Aptos, TruNEAR on NEAR, TruINJ on Injective)
**Known issues (OOS, must NOT submit):**

1. Slashing functionality (Injective only)
2. Allocation feature exceeding staked amounts
3. MATIC validator privacy status changes

**Substrate (5 repos, HEADs as of 2026-05-20):**

- `TruFin-io/staking-contracts` @ `0a9a85a` — TruStakeMATICv2 (1112 LOC) + TruStakePOL (781 LOC) + MasterWhitelist
- `TruFin-io/solana-smart-contracts` @ `8c31598` — programs/staker (~1359 LOC across instructions/)
- `TruFin-io/cosmos-smart-contracts` @ `76a20fd` — contracts/injective-staker/src/contract.rs (1995 LOC)
- `TruFin-io/near-staker-audit` @ `ea7be78` — near-staker/src/lib.rs (822 LOC)
- `TruFin-io/smart-contracts-aptos` @ `c484c4e` — aptos-staker/sources/staker.move (2405 LOC)

---

## Pre-flight scope check (curl-direct, Veda lesson)

Immunefi `/trufin/scope/` direct curl returned 2 unique 0x addresses:

```
0x480791becb289aa1ea4678a4e29cd0661d35ff36
0x89f93b7bf55b86e26d62cb508663cd6cb8ceaa8b
```

(The other 6 assets are on non-Ethereum chains — Aptos/NEAR/Injective/Solana use non-0x address formats and may not surface in HTML-extracted address regex.) Operator should bytecode-verify these 2 against the canonical TruStakeMATICv2 + TruStakePOL deployments before any Gate 2 submission. Likely mapping: one is the live MATIC staker, one is the live POL staker.

---

## Architecture summary

**Per-chain liquid-staking wrapper, 5 chain implementations sharing a common UX surface.** Each chain has a TruFin-deployed validator-aware staking wrapper that mints a liquid receipt token (TruMATIC/TruPOL/TruSOL/TruAPT/TruNEAR/TruINJ) representing the user's claim on staked principal + auto-compounded rewards. The Ethereum-side (TruStakePOL, TruStakeMATICv2) is an ERC20Upgradeable share token (NOT strict ERC4626) with whitelist-gated deposit/withdraw, multi-validator state machine, and fee-on-rewards charged via auto-mint to treasury. Withdrawals use unbond-nonce queues mapped per-validator. The Solana-side (`solana-smart-contracts/programs/staker`) is an Anchor program that CPIs into SPL stake-pool program — meaning TruFin's Solana program is a thin wrapper around the canonical SPL stake-pool. Aptos/NEAR/Injective each have native-language implementations following the same model: validator-aware deposit/unbond/withdraw queue with fee-on-rewards.

---

## Contract inventory

| Repo / Contract                                          | Language / LOC                   | Critical entry points                                                                                                                                                                                                                                                                                                                                            |
| -------------------------------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `staking-contracts/pol-staker/TruStakePOL.sol`           | Solidity 0.8.28 / 781            | `initialize`, `deposit`, `depositToSpecificValidator`, `withdraw`, `withdrawFromSpecificValidator`, `withdrawClaim`, `claimList`, `compoundRewards`, `pause`/`unpause`, `setWhitelist`, `setTreasury`, `setDefaultValidator`, `setFee`, `setMinDeposit`, `addValidator`, `disableValidator`, `enableValidator`, `setDelegateRegistry`, `setGovernanceDelegation` |
| `staking-contracts/matic-staker/TruStakeMATICv2.sol`     | Solidity / 1112                  | Similar API surface to POL but v1-MATIC token (deprecated post-POL migration); review for residual storage/proxy state                                                                                                                                                                                                                                           |
| `solana-smart-contracts/programs/staker`                 | Rust / 1359 (instructions split) | `initialize`, `deposit`, `deposit_to_specific_validator`, `withdraw`, `withdraw_claim`, `compound_rewards`, validator/whitelist setters                                                                                                                                                                                                                          |
| `cosmos-smart-contracts/injective-staker/contract.rs`    | Rust (CosmWasm) / 1995           | `instantiate`, `execute_stake`, `execute_unstake`, `execute_claim`, `execute_compound_rewards`, validator state setters                                                                                                                                                                                                                                          |
| `near-staker-audit/near-staker/lib.rs`                   | Rust (NEAR) / 822                | `stake`, `unstake`, `withdraw`, `compound`, validator state setters                                                                                                                                                                                                                                                                                              |
| `smart-contracts-aptos/aptos-staker/sources/staker.move` | Move / 2405                      | `stake`, `unstake`, `withdraw`, `compound_rewards`, validator setters                                                                                                                                                                                                                                                                                            |

Treasury share-mint on every deposit AND withdrawal: `shareIncreaseTsy = (getRewardsFromValidator * fee * WAD * globalPriceDenom) / (globalPriceNum * FEE_PRECISION)` — auto-compound model where the fee is collected as treasury-share-mint on rewards seen-but-not-yet-restaked.

---

## CANDIDATE-I candidates (ERC4626 wrapper / share accounting)

1. **TruStakePOL.sol uses ERC20Upgradeable, NOT ERC4626.** L34-37 inheritance chain is `TruStakePOLStorage, ITruStakePOL, ERC20Upgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable, PausableUpgradeable` — no `ERC4626Upgradeable`. Yet exposes `previewWithdraw`, `previewRedeem`, `convertToShares`, `convertToAssets`, `maxWithdraw` (L290-310). **The vault MIMICS the 4626 interface but doesn't inherit it.** Gate 2: verify the implementation is 4626-compliant. If the public `convertToShares(assets)` defaults to one rounding direction and the internal `_withdrawRequest` (L639) uses `Math.Rounding.Ceil` — see #2 — the implementation's preview/actual disagreement is a 4626-spec violation.

2. **Rounding-direction asymmetry: public `previewWithdraw` (L290) vs internal `_withdrawRequest` share-burn (L639).** `_withdrawRequest` at L639:

   ```solidity
   shareDecreaseUser = Math.mulDiv(_amount * WAD, globalPriceDenom, globalPriceNum, Math.Rounding.Ceil);
   ```

   Burns shares ROUNDED UP (vault-favor). If public `previewWithdraw` rounds DOWN, a user's preview underestimates share burn by 1 wei per withdrawal. Repeated dust withdrawals compound. Gate 2: read L290's body to confirm rounding direction.

3. **Treasury share-mint inflation surface (L572-573 + L643-644).** On every deposit AND every withdraw, treasury mints shares proportional to accrued-but-not-restaked rewards × fee. The auto-compound flow `_stake` (L590) immediately restakes the user-deposit + previous claimed rewards together. **Race condition:** if a malicious validator briefly reports inflated `getLiquidRewards()` (which the vault reads in `getRewardsFromValidator`), the treasury mint is inflated. Validators are owner-curated, so this is a Pattern B (operator-trust) dependency — but a compromised validator on the allowlist could lead to outsize treasury-share dilution of existing holders.

4. **Validator state machine (NONE/ENABLED/DISABLED) — withdrawClaim doesn't gate on state.** `withdrawClaim` (L531) requires `onlyWhitelist + nonReentrant + whenNotPaused` but does NOT check `$._validators[_validator].state`. After `disableValidator` (L395) flips state to DISABLED, users can still claim from prior unbond nonces. Likely intentional (allow legitimate claims to drain after validator disable), but if the `disableValidator` operation is supposed to also halt all claims from a misbehaving validator, this is a gap.

5. **`_stake` and `_unbond` use 1:1 slippage check `(_amount, _amount)` against Polygon validator (L703, L713).** `IValidatorShare(_validator).buyVoucherPOL(_amount, _amount)` — the second arg is minSharesToReceive. Setting it to `_amount` requires a strict 1:1 POL-to-voucher-share exchange rate. POL was launched at 1:1 vs MATIC and validator exchangeRate accumulates over time → this 1:1 check could revert under most non-trivial exchangeRate states. Gate 2: confirm Polygon V2 ValidatorShare exchange-rate semantics during the v3 POL period (POL exchange rate IS reset to 1:1 at validator restake epoch, so this likely works). If exchangeRate ever drifts permanently, both deposit + withdraw revert.

---

## CANDIDATE-G candidates (Solana Rust staker / DC-8 anchor account-binding)

6. **HIGH-priority candidate: Solana `process_deposit` has 6 unvalidated `/// CHECK` accounts (`stake_pool`, `deposit_authority`, `withdraw_authority`, `pool_reserve`, `pool_mint`, `fee_token_account`, `referral_fee_token_account`).** `solana-smart-contracts/programs/staker/src/instructions/staking.rs:38-69`. These accounts are passed straight to the CPI invocation against `STAKE_POOL_PROGRAM_ID`. **The TruFin program does NOT enforce that the user-supplied `stake_pool`, `pool_mint`, `fee_token_account` match the TruFin-canonical SPL stake pool.** Confirmed via grep over the file — no `address =` constraint, no body-level check against `access.stake_pool` or similar canonical-pool storage.

   **Attack vector:** anyone calling `process_deposit` can pass an arbitrary `referral_fee_token_account` (and possibly `fee_token_account`). The SPL stake pool program credits referral fees + manager fees directly to those caller-controlled accounts on every successful DepositSol. **Result: referral fees that should have flowed to TruFin treasury are redirected to the caller (attacker) on every deposit they make on behalf of themselves or third parties via signed transactions they craft.**

   This is structurally identical to the DC-8 (Anchor-Signer-Validation moved from Accounts struct to function body) class — except here, validation was moved to _nowhere_ on non-signer account-binding. The attacker doesn't need to compromise a signer; they just need to be the transaction submitter providing the AccountInfo set. Cross-pollination: this is the _same shape_ as the Veda Manager-trusts-decoder-output bug (one layer trusts the other to enumerate completely) — here the TruFin program trusts the caller to provide the canonical SPL stake pool addresses, but Anchor's `/// CHECK` annotation explicitly waives validation.

   **HIGHEST EV target on this whole report.** Gate 2 verification: read `Access` account fields in `state/types.rs` to confirm canonical stake_pool + pool_mint + treasury are stored there; if yes, the missing constraint is a Gate 2 file-and-submit candidate.

7. **`DepositToSpecificValidator` instruction has the same pattern (L144-211)** — `validator_list_account` + `validator_stake_account` are also `/// CHECK`. Multi-validator variant of the same vulnerability class.

8. **Withdraw / withdraw_claim instructions likely share the pattern.** Gate 2 enumerate all instructions in `staking.rs` (374 LOC) + `validators.rs` (547 LOC) and inventory every `/// CHECK` against expected canonical-account validation.

---

## CANDIDATE-K candidates (Solana precision / lamport rounding)

9. **TruFin Solana is a thin CPI wrapper.** Most precision-math happens in the SPL stake-pool program (canonical, audited). TruFin doesn't compute its own share ratios on-chain at deposit (relies on SPL pool's `pool_mint` rate). Lower CANDIDATE-K surface than naked Rust-staker implementations.

10. **Aptos / NEAR / Injective rate math.** Each chain implementation has its own asset↔share conversion. Gate 2 deep-read needed per chain to identify rounding asymmetries. Out-of-scope for a single Gate 1 surface map.

---

## DC-7 candidates (Validating-Field ≠ Consuming-Field)

11. **POL deposit: `_deposit(user, amount, validator)` (L564).** Validator field is validated at L566: `if ($._validators[_validator].state != ValidatorState.ENABLED) revert ValidatorNotEnabled();`. The user-supplied validator is then used at L587 (`safeIncreaseAllowance(_stakeManagerContractAddress, stakeAmount)` — note: approval goes to StakeManager, NOT validator) and at L590 (`_stake(stakeAmount, _validator)` → `buyVoucherPOL`). KEY-A (validation) and KEY-B (consumption) both use the same `_validator` address. No DC-7 hit on this path.

12. **Withdrawal `withdrawClaim(_unbondNonce, _validator)`.** Per L676-696, the validator field is used to look up `$._withdrawals[_validator][_unbondNonce]`. The lookup IS the validation. If user-supplied `_validator` is wrong, the lookup returns `Withdrawal(address(0), 0)` which triggers `revert WithdrawClaimNonExistent()` at L682. No DC-7.

---

## Pattern A / D candidates

13. **`_unbond` (L710-715): state mutation BEFORE external call.** Reentrancy-safe pattern. ValidatorShare cannot reenter to claim a fresh unbond before storage updates.

14. **`_restake` (L730-747) try/catch on `Error(string memory reason)` only — doesn't catch panic-style reverts.** If a validator's `restakePOL()` triggers a panic (division-by-zero, overflow), `_restake` itself reverts. Cascading DoS surface across all enabled validators. Validators are owner-curated (high trust), so this requires validator-malicious-or-buggy scenario.

15. **POL `_deposit` MINTS treasury shares BEFORE user shares (L578 vs L582).** Order matters if `_mint` triggers a hook (it doesn't in standard ERC20). Order is intentional and safe.

---

## Roles + privileges

- **`onlyOwner`**: most setters (whitelist, treasury, validators, fee, delegation, pause)
- **`onlyWhitelist`**: deposit, depositToSpecificValidator, withdraw, withdrawFromSpecificValidator, withdrawClaim, claimList (gated by external `MasterWhitelist` contract)
- **No multi-role bitmask** like Yearn V3 or Veda — single-admin (`OwnableUpgradeable`), single-whitelist gate.
- Solana: `Access` account stores `is_paused` + admin keys; whitelist via `UserStatus` PDA per user. Admin-equivalent role for the Solana program.

---

## Off-chain trust boundary

- **MasterWhitelist contract** at `$._whitelistAddress`: ALL user-facing operations gate on `isUserWhitelisted(msg.sender)`. If MasterWhitelist returns false for a previously-whitelisted user, that user is permanently blocked from withdrawing. Owner of MasterWhitelist has full power to grief individual users.
- **Validator allowlist** ($.\_validators map): owner-curated. Disabled validators retain stake (must drain via unbond).
- **Treasury address**: owner-set, receives fee shares.
- **`_delegateRegistry`**: optional Snapshot governance delegation hook (L423+). Off-chain governance integration.
- **No oracle dependency**: pps = totalAssets / totalSupply computed from on-chain `validator.balanceOf(this) + liquid_rewards` view.
- **No signature-gated operations** in POL/MATIC stakers. All gating is whitelist + role.
- **Solana**: SPL stake pool program (canonical Solana Foundation program) is the downstream trust boundary.

---

## Top-3 Gate 2 lens recommendations (rank-ordered by EV)

### 1. **CANDIDATE-G #6 — Solana `process_deposit` referral-fee redirect via missing account-binding** [HIGHEST EV]

Surface: `solana-smart-contracts/programs/staker/src/instructions/staking.rs:38-69`. Verify that `Access` account stores canonical `stake_pool`, `pool_mint`, `fee_token_account` keys; if yes, the missing constraint is a Gate 2 file-and-submit. EV: Critical-tier if referral-fee siphon is sustained and TruSOL has any deposit volume (any TVL > 0 + non-zero referral fee on the SPL pool = direct fee redirect).

Gate 2 verification steps:

1. Read `solana-smart-contracts/programs/staker/src/state/types.rs` for `Access` struct definition.
2. If `stake_pool: Pubkey` / `pool_mint: Pubkey` / `treasury: Pubkey` are stored, the missing `constraint = stake_pool.key() == access.stake_pool` is a Gate 2 file.
3. If those fields are NOT in `Access`, the program may be designed for a callable-against-any-pool flow (in which case the threat is operator-doc clarity, not a bug).
4. Check the SPL stake pool config: is the TruFin pool configured with non-zero `referral_fee_bps`? Even 1 bp on $1M TVL = ~$100/yr ongoing redirect.

Cross-pollination: this is the _same shape_ as Veda DC-7 (Manager trusts decoder output without enumeration). Same lens applied to a different account-binding layer.

### 2. **CANDIDATE-I #2 — Rounding-direction asymmetry: previewWithdraw vs `_withdrawRequest`** [MEDIUM-HIGH EV]

Surface: `TruStakePOL.sol:290` (previewWithdraw view) vs `:639` (actual share-burn). Read previewWithdraw body and compare rounding direction. If preview rounds Floor and actual rounds Ceil, every withdrawal burns 1 wei more shares than the user previewed. Cumulative across many withdrawals = small but real share-dilution attacking holders that rely on preview.

EV: Medium-tier impact (small per-call value, but ERC4626 spec compliance is a defined HIGH-tier surface on Immunefi for vault programs). Cross-pollination: same shape as Veda Ethena CANDIDATE-J cooldown asymmetry — state-machine setter creates a small-but-systematic accounting drift.

### 3. **Pattern A #14 — `_restake` validator DoS via panic-revert** [MEDIUM EV]

Surface: `TruStakePOL.sol:730-747`. The try/catch handles `Error(string memory)` but not panics. A validator that emits a panic from `restakePOL()` reverts the entire restake loop. Affects every deposit and withdraw (both call `_deposit/_withdrawRequest` → `_stake` which calls `_restake`). One bad validator = full deposit/withdraw lockup.

EV: Medium-tier (validators are owner-curated, so attacker would need to compromise validator-allowlist process). Worth filing as defensive observation.

---

## Cross-pollination summary (for brain catalog)

| TruFin candidate                                            | Cross-pollinates with                     | Shape                                                              |
| ----------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------ |
| CANDIDATE-G #6 (Solana referral-fee redirect via /// CHECK) | Veda DC-7 (Manager trusts decoder output) | Same layer trusts the other to enumerate canonical addresses       |
| CANDIDATE-I #2 (preview vs actual rounding asymmetry)       | Ethena CANDIDATE-J cooldown overwrite     | State-machine setter creates small-but-systematic accounting drift |
| Pattern A #14 (`_restake` panic-DoS)                        | (none direct)                             | Loop-of-external-calls with insufficient error-class coverage      |

The strongest single Gate 2 target is **CANDIDATE-G #6 (Solana referral-fee redirect)** — this is a DC-8-class missing-account-binding bug in the LIVE TruSOL deployment, and the verification path is a 20-minute file-read.

---

## Blockers / open questions for operator

1. **Bytecode-verify deployed TruSOL Solana program against `solana-smart-contracts` HEAD `8c31598`.** Solana program verification uses `solana program show <program-id>` + `cargo-build-sbf` reproducibility. Different toolchain than Solidity. Document the methodology if Gate 2 escalates.

2. **Bytecode-verify the 2 in-scope Ethereum addresses.** Likely TruStakeMATICv2 + TruStakePOL deployments. Use Doctrine #24 `solc --standard-json` direct compile.

3. **3 known-issues dedupe before any submission.** Slashing (Injective), allocation > staked, MATIC validator privacy. None of the 3 Gate 2 picks above overlap with these — but Gate 2 must explicitly check finding text against the known-issues list.

4. **Audit history check.** TruFin has multiple audits visible at `truefi.io/audits` (likely Trail of Bits, OpenZeppelin, Hacken). Pull the latest published audit reports for TruStakePOL + TruSOL before any deep-read to ensure findings aren't already remediated.

5. **KYC overhead.** TruFin requires KYC for payout. Operator should have KYC docs ready before any submission.

---

_Filed: 2026-05-20 | TruFin/TruYields Gate 1 Surface Map | Buzz BD Agent main-session (no-subagent mode) | 5 chains, 5 repos, ~6700 LOC core read in summary across Solidity + Rust + Move | 2 scope addresses + 5 known-issue references | Ready for operator Gate 2 lens-selection_
