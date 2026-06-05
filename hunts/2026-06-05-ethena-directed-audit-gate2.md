# Ethena — Directed-Audit (Hornby method) — Gate-2 hypothesis battery

**Date:** 2026-06-05 · **Authority:** Ogie msg (Ethena directive) · **Method:** directed-hypothesis · **Mode:** single-agent, EV-gated moonshot, PoC-before-FLAG, submission operator-gated, leak-safe (Category-3).

**Verdict: NO CANDIDATE. P1 (H1/H5/H2) NEGATE `[INSPECTED]` via verbatim source; P2 (H3/H4/H6/H7) NEGATE-LEAN (audit-saturated / dual-authorized).** Moonshot NEGATE'd fast as anticipated — the signature gadget is constraint-complete, the decimals seam doesn't exist on-chain. No PoC, nothing to FLAG.

- **Repo:** `ethena-labs/bbp-public-assets` (the canonical bug-bounty in-scope assets) — `contracts/contracts/` EthenaMinting.sol, USDe.sol, StakedUSDe(V2).sol, USDeSilo.sol. Immunefi $3M Crit (10%-funds, $100K floor), KYC, PoC-mandatory, triaged, arbitration, audit-dense (#45.3 → bar HIGH).
- **Prior Buzz:** DISC-017 (#79589, cooldown) CLOSED as dup of #68406 → **cooldown surface (H3/H4) is hunt-saturated.** No prior hunts/ Gate-1 file (fresh Gate-1, saturated-cooldown).
- **Gate-0 (4 accepted known-issues foreclosed):** SOFT_RESTRICTED bypass via open-market; maxRedeemPerBlock-not-rate-limited-on-key-compromise (by design); 8h-vesting-vs-weekly snipe (mitigated); FULL_RESTRICTED-bypass-via-approvals.

---

## P1 — likeliest net-new seams

### H1 — `EthenaMinting` EIP-712 order signature/hash binding [constraint-completeness 4th seam — the gadget]. **NEGATE `[INSPECTED]`.**
**Trace (verbatim):** `hashOrder = toTypedDataHash(domainSeparator, keccak256(encodeOrder(order)))`. `encodeOrder = abi.encode(ORDER_TYPE, order_type, expiry, nonce, benefactor, beneficiary, collateral_asset, collateral_amount, usde_amount)` — **all 8 order fields bound via `abi.encode` (fixed-width, non-malleable).** `ORDER_TYPE` typehash lists all 8 with correct types. Domain `= keccak256(abi.encode(EIP712_DOMAIN, NAME, REVISION, block.chainid, address(this)))` → **binds chainid + verifyingContract.** `verifyOrder` recovers signer, requires `signer == benefactor || delegatedSigner[signer][benefactor]==ACCEPTED`, + beneficiary≠0, amounts≠0, not-expired.
**Why it holds:** (a) **order_type is bound** (first field) → no MINT↔REDEEM confusion; (b) **domain binds chainid+contract** → no cross-chain/contract replay; (c) the **route is NOT in the order hash** but `verifyRoute` constrains it to **custodian-allowlisted addresses + `totalRatio == ROUTE_REQUIRED_RATIO`**, and `mint` is MINTER_ROLE-gated → an unsigned route can only split collateral among Ethena custodians, never redirect to an attacker; redeem has no route (`_transferToBeneficiary` to the signed beneficiary). The benefactor's economic protection (signed collateral_amount↔usde_amount) is complete. The "missing field" H1 names doesn't exist. **2nd EVM application of the #47 constraint-completeness seam → clean NEGATE.**

### H5 — Multi-asset DECIMALS / rounding in mint & redeem [numerical-gap / C7]. **NEGATE `[INSPECTED]`.**
**Trace:** `mint`: `_transferCollateral(order.collateral_amount, order.collateral_asset, order.benefactor, route...)` + `usde.mint(order.beneficiary, order.usde_amount)`. `redeem`: `usde.burnFrom(order.benefactor, order.usde_amount)` + `_transferToBeneficiary(order.beneficiary, order.collateral_asset, order.collateral_amount)`.
**Why it holds:** **there is NO on-chain conversion between `collateral_amount` and `usde_amount`** — both are *independent signed values* set by Ethena's off-chain RFQ pricer (collateral_amount in the asset's native decimals, usde_amount in 18-dec). No on-chain decimals-normalization or division → no rounding-direction surface. The H5 premise (an on-chain decimals conversion that could over-release/under-collateralize) is **structurally absent**. (The heterogeneous-decimals risk is borne by the off-chain pricer, OOS trusted-operations.)

### H2 — Bitmap NONCE / replay [trust/replay]. **NEGATE `[INSPECTED]`.**
**Trace:** `verifyNonce`: `slot = uint64(nonce)>>8; bit = 1<<uint8(nonce); revert if _orderBitmaps[sender][slot] & bit`. `_deduplicateOrder` sets it. Bitmap is **per-sender** (sender = benefactor, bound in the signed order).
**Why it holds:** nonce is in the signed order (benefactor-chosen) + per-sender bitmap + dedup-on-use → no cross-user replay, no double-execution (mint/redeem is all-or-nothing, no partial-fill). The `uint64(nonce)` truncation aliases nonces differing only above bit-64 — but that's **self-only** (a benefactor's own two orders collide → their second is rejected), not an attack on others. No replay.

## P2 — composition hypotheses (NEGATE-LEAN; P1 negated → assessed, not deep-traced)

- **H3/H4 — cooldown/silo + rewards-vesting composition. NEGATE-LEAN (audit-saturated).** The StakedUSDeV2 cooldown + 8h-linear-vesting is Ethena's MOST-audited surface (C4 2023 + Spearbit/Quantstamp) AND **Buzz already hunted it → DISC-017 #79589 CLOSED as dup**. Known-issue #3 (vesting snipe) is mitigated (cron-slice). Per #45.3 + the moonshot framing, p≈0; not deep-re-traced (honest — saturated, dup-confirmed). A genuinely-different cooldown/vesting-compose path would need to beat both the audits and our own prior dup.
- **H6 — delegated-signer / role authz. NEGATE-LEAN `[INSPECTED-partial]`.** `verifyOrder` requires `delegatedSigner[signer][benefactor] == ACCEPTED` — the **ACCEPTED** enum is a 2-way handshake (benefactor must accept a delegate), so an attacker can't unilaterally become a benefactor's signer. MINTER/REDEEMER/GATEKEEPER are admin-granted (OOS trusted). (Full `setDelegatedSigner`/`confirmDelegatedSigner` handshake trace deferred — the ACCEPTED-gate is the load-bearing defense.)
- **H7 — USDe↔collateral supply-conservation [Pattern-I]. NEGATE-LEAN.** Mint is **dual-authorized** (benefactor signature + MINTER_ROLE) + `maxMintPerBlock` rate-cap; redeem burns usde + releases collateral. No on-chain conservation break on a **non-key-compromise** path (the key-compromise redeem-gap is accepted #2). The "is collateral_amount sufficient backing for usde_amount" check is the off-chain pricer's job (OOS trusted-operations) — not an on-chain invariant to break. No Pattern-I escalator on the traced paths.

---

## Doctrine #52 impact-frame
No finding. Conservation boundaries identified + intact: **signature soundness** (constraint-complete, all fields bound), **USDe↔collateral backing** (dual-auth + maxMintPerBlock + off-chain pricer), **share-price/cooldown** (audit-saturated, dup-confirmed). None missing/mis-enforced on traced paths → no Pattern-I escalator.

## Brain compounds
- **C-1:** 2nd EVM anchor for the constraint-completeness 4th seam (DC-21/#47) — EthenaMinting EIP-712 order = constraint-complete (all 8 fields in `abi.encode`, order_type bound, domain binds chainid+contract). Together with SSV EB-proof = **two clean NEGATING worked-references** for "is the signed/proven digest constraint-complete?" → reusable template.
- **C-2 (the seam-absence lesson):** H5 "decimals seam" NEGATED because the conversion is OFF-CHAIN (amounts independently signed) — **a numerical-gap hypothesis NEGATES when the protocol moves the computation off-chain (no on-chain division to round wrong).** Check FIRST whether an on-chain conversion even exists before tracing rounding direction. Reusable on any RFQ/intent/signed-amount protocol.
- **C-3:** Ethena moonshot confirmed low-p — signature + decimals + nonce are the audit-hardened core; the only un-deep-traced residual (H6 setDelegatedSigner handshake) is the queued item, but the ACCEPTED-gate makes it NEGATE-lean.

_Directed-audit by Buzz · verbatim-source-trace (bbp-public-assets) · PoC-before-FLAG (no candidate → no PoC) · submission operator-gated · leak-safe._
