# Arkadiko — Immunefi SUBMISSION-FINAL (TRACK 2 — review-ready; OGIE SUBMITS, do NOT auto-submit)

**Venue (confirmed):** Immunefi `immunefi.com/bug-bounty/arkadiko` — ACTIVE (live 2024-06-03, updated 2026-01-22), **NO KYC**, PoC always required. Bands: Critical $20K-$100K · High $1K-$20K (doubles/24h temp-freeze) · Medium/Low → Immunefi V2.3.
**Repo / commit:** `github.com/arkadiko-dao/arkadiko` @ master (clone `--depth 1`, 2026-06-01). In-scope = Clarity contracts in `clarity/contracts/`.
**On-chain principal (Ogie to confirm at submit):** Arkadiko mainnet deployer — verify on a Stacks explorer that `arkadiko-oracle-v2-3` + `arkadiko-vaults-helpers-v1-1` resolve to the canonical Arkadiko deployer principal before pasting. (Not asserted here — explorer-verify.)
**PoC (attach):** `hunts/poc/2026-06-01-arkadiko-oracle-166/` — `poc-166-oracle-sig-dos.mjs` (4/4 PASS, clarinet-sdk simnet) + `RESULT.txt` + `poc-staleness-outcome.mjs` (PASS) + the 3 contracts + Clarinet.toml.

---

## PRIMARY — Finding #1: Oracle signature cache-before-validate DoS — **Severity: Medium**

> **Up-front honest scoping (escapability):** this is a **recoverable** oracle-update griefing/DoS, not a permanent lock or direct fund-theft. The lockout is per-(block,price) message — the keeper recovers by re-signing for a fresh `block`, and the DAO owner can push price via `update-price-owner`. We therefore submit it as **Medium** (temporary, recoverable). We are NOT claiming High; the High-doubling "temporary freezing of funds" clause does not cleanly apply (this stalls the price-update path, it does not freeze user funds).

**Contract:** `clarity/contracts/arkadiko-oracle-v2-3.clar` · function `update-price-multi` (L102-119) + `check-unique-signatures-iter` (L144-152).

**Mechanism [EXECUTED]:** `update-price-multi` enforces signature-uniqueness via `check-unique-signatures-iter`, which `map-set`s each submitted signature into the `signatures-used` map (a **cache INSERT**) *inside the uniqueness `asserts!`* — **before** the signer-quorum check. When the quorum is not met the function returns `(ok false)` (a SUCCESS), so the inserts **commit** even though no price was written, and the failure path never unwinds them (CWE-459/460). An attacker who copies 2 of the keeper's 3 trusted signatures from the public mempool and submits them under-quorum **permanently burns those signatures**; the keeper's full-quorum transaction reusing them then reverts `ERR-SIGNATURES-NOT-UNIQUE` (u8403) = oracle-update lockout for that message.

**PoC result (4/4 PASS, clarinet-sdk simnet, genuine trusted-oracle sigs via `@stacks/transactions signMessageHashRsv`):** (1) 3 sigs recover to trusted signers; (2) under-quorum (2 trusted sigs) → `(ok false)`, both sigs now `is-signature-used = true`; (3) full-quorum reuse → reverts `u8403`; (4) replay-key is per-(block,price) signature → keeper escapes by re-signing a fresh block (severity-bounding).

**Remediation:** mark a signature `used` only on the success path (after quorum is met + price written), or unwind the inserts when returning `(ok false)`.

---

## HARDENING LEG — Finding #2: Missing oracle price-staleness check in the collateralization path

**Contract:** `clarity/contracts/vaults-v2/arkadiko-vaults-helpers-v1-1.clar` · `get-collateral-to-debt` (L22-35); consumed by `arkadiko-vaults-operations-v1-3` (open/update-vault L85/139) + `arkadiko-vaults-manager-v1-2` (liquidate L98).

**Mechanism [INSPECTED + EXECUTED-stale-consumption]:** `get-collateral-to-debt` reads `(get last-price price-info)` and computes the collateralization ratio with **no `last-block` age validation** (grep-confirmed across all `vaults-v2/`). The oracle enforces freshness only at update time; there is no consumer-side max-age. PoC: identical `(ratio 200%, valid true)` on a 500-burn-block-stale price. **Composition:** Finding #1 lets an attacker actively induce the price stall that #2 fails to reject; during a real price move this enables over-mint against overvalued collateral / liquidation evasion (quantified: ~$50 bad debt/vault at a $3→$1 move on a min-ratio vault). **Conditional** on a sustained stall (escapable per #1) — submitted as a hardening leg supporting #1, not a standalone High.

**Remediation:** reject prices older than a protocol-defined max age in `get-collateral-to-debt` (compare `last-block` to `burn-block-height`; revert when stale).

---

## Not an accepted-risk (verified)
The only related Arkadiko doc is `Audit.md` CR-01 (oracle signature **replay** → fixed by the `signatures-used` map) — and **CR-01's own fix is what introduced #1** (the cache-before-validate). Neither #1 nor #2 is covered by any documented accepted-risk. CR-01 is replay; #1 is under-quorum burn (different mechanism).

## Ogie's submit checklist
- [ ] Explorer-confirm the on-chain principal for the two contracts.
- [ ] Paste #1 (primary, Medium) + #2 (hardening) into one Immunefi report; attach the PoC dir.
- [ ] Keep the escapability paragraph up front (honest framing — improves first-pass acceptance, per DISC-019 AI-Report lesson).
