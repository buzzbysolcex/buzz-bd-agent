# Arkadiko — Immunefi paste-ready DRAFTS (OPERATOR-GATED — do NOT submit without Ogie's call)

Two independent findings on the Arkadiko V2 oracle path. Both PoC-confirmed [EXECUTED] via
`@hirosystems/clarinet-sdk` simnet (artifacts in this dir; `node poc-166-oracle-sig-dos.mjs`
= 4/4 PASS, `node poc-staleness-outcome.mjs` = PASS). Severity stated honestly per Doctrine #14
(vector ≠ outcome): the guaranteed-reproducible part is bounded; the higher-severity composition
is real but conditional. No fund-loss end-state was reproduced as a guaranteed exploit.

---

## FINDING #1 — Oracle signature cache-before-validate DoS (Medium)

**Contract:** `arkadiko-oracle-v2-3.clar` · `update-price-multi`
**Severity:** Medium (oracle-update griefing / temporary lockout; recoverable).
**Class:** CWE-459/460 (incomplete cleanup on failure path) — "cache-before-validate."

### Description
`update-price-multi` enforces signature-uniqueness via `check-unique-signatures-iter`, which
**`map-set`s each submitted signature into the `signatures-used` map (a cache INSERT) as a side
effect inside the `asserts!`, BEFORE the signer-quorum is checked.** When the quorum is not met
the function returns `(ok false)` — a SUCCESS response — so the inserted "used" keys **commit**
even though no price was written. The failure path never unwinds the inserts. [INSPECTED L102-119,144-152]

Because `signatures-used` is keyed by the raw 65-byte signature (which signs
`(block, token-id, price, decimals)`), an attacker who copies a subset of the keeper's real,
trusted signatures from the public mempool and submits them in an **under-quorum** call burns
those exact signatures. The keeper's subsequent full-quorum transaction reusing them then reverts
`ERR-SIGNATURES-NOT-UNIQUE` (u8403) = oracle-update lockout for that message. [EXECUTED]

### PoC (`poc-166-oracle-sig-dos.mjs`, 4/4 PASS)
1. Register 3 trusted oracle keys; all 3 signatures recover to trusted signers (`check-price-signer = u1`). [EXECUTED]
2. Submit under-quorum (2 of 3 trusted sigs) → `(ok false)`; both signatures are now `is-signature-used = true` despite no price update. [EXECUTED]
3. Submit full-quorum (3 sigs incl. the 2 burned) → reverts `(err u8403)` = lockout. [EXECUTED]
4. **Bounding:** a fresh-`block` re-sign is NOT pre-consumed and updates successfully — the lockout is per-(block,price) message, escapable by re-signing. [EXECUTED]

### Impact (honest)
Temporary oracle-update DoS: an attacker can block a specific price-update message. **Recoverable** —
the keeper re-signs for a fresh `block`, and the DAO owner can push price via `update-price-owner`.
Sustained DoS requires winning the tx-ordering race every round on Stacks' miner-ordered mempool
(no Ethereum-style PGA guarantee) → griefing, not a guaranteed outage. Medium.

### Remediation
Mark a signature `used` ONLY on the success path (after quorum is met and the price is written), or
unwind the inserts when returning `(ok false)`; alternatively gate the marking behind the quorum check.

---

## FINDING #2 — Missing oracle price-staleness check in the collateralization path (Medium; High if composed)

**Contract:** `arkadiko-vaults-helpers-v1-1.clar` · `get-collateral-to-debt` (consumed by
`arkadiko-vaults-operations-v1-3` open/update-vault and `arkadiko-vaults-manager-v1-2` liquidate)
**Severity:** Medium standalone; High under the #1 composition (conditional — see below).

### Description
`get-collateral-to-debt` reads `(get last-price price-info)` from the oracle and computes the
collateralization ratio + `valid` flag **without ever validating the price's `last-block` age.**
A repo-wide grep confirms NO V2 consumer checks the oracle price `last-block` for staleness (it is
used only for stability-fee accrual and DIKO rewards, unrelated). The oracle enforces freshness only
at UPDATE time (`burn-block-height < block + 10`); there is no consumer-side max-age. The price gates
`open-vault`, `update-vault`, and `liquidate`. [INSPECTED + grep-confirmed]

The only related documentation is an informal 2021 grant note (`docs/grant.md`) describing a "30s
cron" keeper; no SECURITY doc or audit accepts consumer-side staleness as a trust assumption. So this
is a genuine gap, not a documented accepted-risk. [TASK-3 verified]

### PoC (`poc-staleness-outcome.mjs`, PASS)
Set price $3.00; `get-collateral-to-debt` → `(ratio u20000 = 200%, valid true)`. Mine **500 burn
blocks with no oracle update** → the consumer returns the **identical** `(ratio u20000, valid true)`
using the frozen `last-block`. No age rejection. [EXECUTED]

### Impact (honest, quantified + conditional)
If the real price moves while the on-chain price is stale (e.g. STX $3.00 → $1.00 during a stall):
on-chain ratio stays 200% (`valid`) while the true ratio is 66% — an under-collateralized vault
(collateral $100 < debt $150) cannot be liquidated (`liquidate` asserts `(not valid)` → reverts
`ERR_CAN_NOT_LIQUIDATE` [INSPECTED mgr L98]) → **~$50 locked bad debt per such vault**, scaling with
vault size + price move. Symmetrically, a stale-low price enables unfair liquidation, and a stale
price enables minting USDA against overvalued collateral.
**CONDITION:** realizing this needs a sustained stall across the price move. Passively it depends on
keeper liveness; actively it composes with #1 — but #1 is escapable (above), so the fund-loss is
**conditional, not a guaranteed exploit.** Stated as Medium; High only under a demonstrated sustained stall.

### Remediation
Reject prices older than a protocol-defined max age in `get-collateral-to-debt` (compare
`(get last-block price-info)` to `burn-block-height`); revert when stale.

---

## SUBMIT-CALL SUMMARY (for Ogie)
- **#1** → file standalone, **Medium**, [EXECUTED] 4/4 PoC. Clean, novel (CR-01's own replay-fix introduced it).
- **#2** → file standalone, **Medium** (High-argument conditional), [EXECUTED] stale-consumption + quantified loss; not an accepted-risk (TASK-3).
- Did NOT reproduce a guaranteed fund-loss end-state → not claiming High. Operator decides whether to submit one, both, or hold.
