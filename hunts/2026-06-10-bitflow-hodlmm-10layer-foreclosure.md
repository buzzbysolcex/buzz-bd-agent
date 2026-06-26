# Bitflow HODLMM — FULL 10-Layer Re-Run (Fable 5) → FORECLOSE (no bankable candidate)

**Date:** 2026-06-10 (Ogie msg 8197 — full 10-layer re-run on Fable 5; flag-check + real hunt)
**Target:** Bitflow Finance — HODLMM (Clarity DLMM / Liquidity-Book). Immunefi, $100K max, PoC mandatory, no-KYC.
**In-scope deployer:** `SPQC38PW542EQJ5M11CR25P7BS1CA6QT4TBXGB3M` · repo `github.com/BitflowFinance/bitflow-dlmm` (cloned `.tmp-clones/bitflow-dlmm`, 2.7M).
**Method:** 6 parallel brain-lens finders (workflow `wf_7ce7eeaf-fb9`, 12 subagents, 1.57M tok) + adversarial action-site arithmetic tracing, cross-checked by independent main-agent source reads of staking (815 LOC) + core swap/liquidity (`dlmm-core` swap-x-for-y, add/withdraw/move) + pool accounting.
**Prior:** `2026-06-01` Gate-1 NEGATE (over-deferred to self-tests) + `2026-06-09` Gate-0 full dedup (corpus 13, HODLMM confirmed UNAUDITED).

---

## VERDICT: FORECLOSE — corrected, NOT a self-test deferral

The re-run was warranted (prior NEGATE implicitly treated self-tests as audit-equivalent). This time the untested surfaces were **independently traced**, not deferred. Result: the contract family is genuinely well-built. The only seams are **admin-trust**, which are standard Immunefi OOS/Informational. The 06-01 NEGATE now stands on solid independent-trace grounds.

### What was confirmed DEFENDED (independently traced, [INSPECTED])
1. **Swap rounding is conservative (favors pool).** `swap-x-for-y` L1316/1330/1334, `swap-y-for-x` L1459/1473/1478: outputs `dy`/`dx` FLOORED to the user; the only CEILs (L1316/1459) are on the *input cap* (rounds user's required input UP); input conserves exactly (`dx + protocol + provider + variable == updated-x-amount`, provider absorbs the split residual L1326); capped input means no over-charge on full drain. No `/`-before-`*` precision loss anywhere. `quote-engine-validation.test.ts` hard-asserts `actualOut > floored-float == 0` across single+multi-bin fuzz → over-payment is gated.
2. **Per-bin first-depositor inflation is defended** (the canonical dead-shares mitigation, applied PER BIN not just at pool creation). `add-liquidity` first-deposit branch L1645-1652: `intended-dlp = sqrti(value)` MUST be `>= minimum-bin-shares` (u10000), `minimum-burnt-shares` (u1000) minted to BURN_ADDRESS (permanently locked — `pool-burn` requires `amount <= caller balance`, BURN_ADDRESS never withdraws), so `bin-shares` floors at u1000 forever and can never return to 0; subsequent deposits take the proportional branch whose denominator reads residual reserves. **Plus every add asserts `min-dlp > u0` (L1677)** — a victim cannot even set zero slippage.
3. **Staking reward-index accounting is sound.** `update-reward-index` (sync) is called BEFORE every `lp-staked` mutation in stake/unstake/early-unstake (CANDIDATE-J Pt#5 satisfied); re-stake banks pending into `accrued-rewards` (L470-472); `claim-rewards` zeroes accrued + resets user index to current global (L667-670) → DC-9 repeated-claim blocked. `get-updated-reward-index` denominator `lp-staked` is `>0`-guarded.
4. **Whitelist / trait-substitution guarded on every fund-moving entrypoint.** Token traits re-bound to stored x/y-token via `(asserts! (is-eq (contract-of x-token-trait) x-token))` on swap/add/withdraw/move; pool is a pure core-gated slave (`contract-caller == core-address`). Pool creation intentionally does not whitelist tokens (tests `settings.test.ts` L293/319 document this as intended) — known/intended, not novel.
5. **Core migration has a real timelock + bounds chain** (`set-core-migration-target` → execution-time = now + cooldown ≥ 1 week; `migrate-pool` enforces cooldown-passed + target-match + unclaimed-fees==0) — genuine DC-9 defense-in-depth, not a bare privileged mutation.

### The 5 NEGATES (all independently re-traced, agree)
- **E-1** residual-dust re-deposit inflation → NEGATE (BURN_ADDRESS dead-shares mean `bin-shares` never returns to 0; proportional branch reads residual). [INSPECTED]
- **E-2** swap user-favored asymmetry → NEGATE (all output rounding favors pool). [INSPECTED]
- **CANDD-1** same-multi router `unfavorable` accounting → NEGATE (live-bin pricing; user protected by per-entry `min-received` + aggregate `min-total`; Doctrine #43 foreclose). [INSPECTED]
- **BFS-J-2** `get-reward-token-balance` re-pledge → NEGATE/LOW (admin-only; the "doc-referenced reserved-balance helper" claim was disproved against the auto-gen doc). [INSPECTED]
- **DC9-STAKE-01** `withdraw-rewards` admin drain → NEGATE/LOW (admin-trust centralization; reward token only, LP principal untouchable). [INSPECTED]

### The 1 UNCERTAIN survivor — adjudicated to FORECLOSE
- **BFS-J-1 — cross-bin reward over-commitment → FCFS claim DoS (insolvency).** `set-rewards-to-distribute` (L405/L414) commits each bin's budget against the WHOLE raw `token-stx` balance with no global committed-reserve ledger → Σ over 1001 bins can exceed balance → late honest stakers' `claim-rewards` reverts `ERR_INSUFFICIENT_TOKEN_BALANCE`. [INSPECTED, mechanism real]
  - **Adjudication (main agent):** SAME admin-trust class as the two NEGATES. Trigger is **admin-only** (`set-rewards-to-distribute` L383, `withdraw-rewards` L688) — no permissionless path. The "intended-and-dropped reserve helper" novelty hook is **refuted** (the `get-available-contract-balance`/`total-rewards-per-block` references live only in stale `architecture.md` whose trait shape doesn't match the deployed 816-line source; the auto-gen per-contract doc describes the raw-balance impl verbatim). Harm is **recoverable** (admin tops up `token-stx` → stuck claims clear) and bounded to the **reward token**, not LP principal. → Standard Immunefi "requires privileged/erroneous action" exclusion = Informational/Low, **not bankable**. FORECLOSE-for-submission; logged as a trusted-admin centralization note.

---

## R8 / DISCIPLINE NOTES
- **Self-caught misread (discipline win):** a grep initially conflated `get-overall-supply` (L117 `ft-get-supply`, global) with `get-total-supply` (L113, per-bin `bin-shares`). Verified against source before banking → the feared `bin-shares` global-desync does NOT exist; `pool-mint`/`pool-burn` are per-bin-correct. (`webfetch-direction-error` / verify-at-action-site discipline.)
- **No FLAG, so no PoC required** (Ogie msg 8197 "Local-fork PoC before any FLAG" — I am not FLAGGING for submission). A clarinet simnet PoC of BFS-J-1 would mechanically reproduce an admin-induced over-commit but would NOT change the admin-trust triage (per the verifiers' own note). Harness reuse (`.tmp-clones/ark-poc` clarinet-sdk, ~0 marginal disk) is available IF Ogie wants the `[EXECUTED]` artifact for the centralization note or his own scope call.
- **Disk:** clone is 2.7M (negligible); the full re-run was disk-safe. Clone retained pending Ogie's PoC decision; add to `foreclosed-clones.txt` after.

## CROSS-POLLINATION
- DLMM/Liquidity-Book first-deposit inflation defense = **per-bin** dead-shares + mandatory `min-dlp>0`. Add to the inflation-defense reference: per-bin (not just per-pool) MINIMUM_LIQUIDITY is the correct LB pattern; absence of EITHER the burn OR the `min-dlp>0` assert would re-open it.
- Clarity staking reward-index "sync-before-mutate + bank-accrued-on-restake + zero-on-claim" is a clean reference implementation of the Synthetix/Compound index pattern — contrast for future CANDIDATE-J hunts.
