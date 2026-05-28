# Hyperlane Warp Hyp-1 Gate 2 (HypERC4626 cross-chain rate-staleness) — FORECLOSURE

**Date:** 2026-05-29 (reboot-recovery TODO item 4)
**Target:** Hyperlane Warp Routes, `HypERC4626` (synthetic) + `HypERC4626Collateral` (collateral)
**Repo HEAD:** `hyperlane-xyz/hyperlane-monorepo @ 9a98c3ca6fdaf3b89149c70f6b27a112b09d987c` (main HEAD 2026-05-28)
**Files-of-record:** `solidity/contracts/token/extensions/HypERC4626.sol` (141 LOC), `HypERC4626Collateral.sol` (176 LOC), `solidity/contracts/token/libs/TokenRouter.sol` (637 LOC), `TokenMessage.sol` (42 LOC)
**Mode:** Sparse-clone `solidity/contracts/` (4.9 MB on-disk; 5.4 G free at start)
**Verdict:** **FORECLOSE Hyp-1.** The cross-chain conserved quantity is **shares**, not assets. The synthetic `exchangeRate` is display-only + a self-cancelling input parametrization; it never determines how many assets/shares leave the collateral vault. Stale synthetic rate creates ZERO arbitrage. Gate 1 mis-modeled the message as carrying an asset amount converted at the stale rate — it carries shares. Revised EV: **$0**.

---

## §1 — THE HYPOTHESIS (re-stated from Gate 1)

Per `hunts/2026-05-29-hyperlane-warp-immunefi-gate1.md` §6 Hyp-1:

> Synthetic chain `_handle` stores `exchangeRate` if `rateUpdateNonce > previousNonce` (no timestamp/age check). Synthetic `transferRemote(amount_assets)` burns `assetsToShares(amount)=amount*PRECISION/staleRate` and the outbound message contains `_outboundAmount(amount)=amount*PRECISION/staleRate` vault-share quantity; collateral `_transferTo` calls `vault.redeem(shares, recipient)` at the LIVE rate. When `staleRate < liveRate`, directional arbitrage profitable above (relay-latency × rate-drift).

Gate 1 tagged the mechanism claims `[INSPECTED]` but the **attack** and **magnitude** claims `[ASSUMED]` with explicit note: *"GATE 2 MUST verify via on-chain replay simulation."* EV pre-discount $100K → post-discount ~$28K.

---

## §2 — SOURCE-READ RESULT (commit `9a98c3ca`, full trace)

### 2.1 The conserved cross-chain unit is SHARES (dispositive)

`HypERC4626.sol` contract NatSpec (lines 31-34) `[INSPECTED]`:

> "Messages contain amounts as **shares** of ERC4626 and exchange rate of assets per share. internal ERC20 balances storage mapping is in **share units**. internal ERC20 allowances storage mapping is in asset units. public ERC20 interface is in **asset units**."

So the synthetic token's *internal* accounting (balances, cross-chain messages) is in SHARES; the *public* interface (transferRemote `_amount`, balanceOf) is in ASSETS, with `exchangeRate` bridging the two for display/UX only.

### 2.2 Synthetic outbound — the rate CANCELS (`[INSPECTED]`)

`HypERC4626.sol`:
- `_transferFromSender(_amount)` → `HypERC20._transferFromSender(assetsToShares(_amount))` (line 94-96) — burns `assetsToShares(amount) = amount*PRECISION/exchangeRate` SHARES from the user.
- `_outboundAmount(_localAmount)` → `TokenRouter._outboundAmount(assetsToShares(_localAmount))` (line 100-104) — message amount = `assetsToShares(amount) × scale` SHARES.

The SAME `assetsToShares(amount)` (same `exchangeRate`) is used for BOTH the burn and the message amount. **The exchangeRate cancels.** Whatever the synthetic rate (stale or fresh), the user burns exactly the shares they send, bounded by their share balance. The asset-denominated `_amount` input is pure UX — it parametrizes "how many of my shares to send."

### 2.3 Synthetic inbound mint — rate NOT applied (`[INSPECTED]`)

`HypERC4626.sol` line 116-117 comment: *"`_inboundAmount` implementation reused from `TokenRouter` unchanged because message accounting is in shares."* `TokenRouter._handle` (line 635) calls `_transferTo(recipient, _inboundAmount(amount))`; `_inboundAmount` (line 600-608) applies ONLY the scale fraction (`scaleDenominator/scaleNumerator`, default 1/1), NOT the exchangeRate. So inbound mint = message-shares × scale = SHARES. The `_handle` override (line 121-139) updates `exchangeRate` from metadata purely for subsequent display; it does not touch the minted share quantity.

### 2.4 Collateral side redeems message SHARES at live vault rate (`[INSPECTED]`)

`HypERC4626Collateral.sol`:
- Outbound `transferRemote` (line 82-126): pulls `_amount` of the underlying ASSET, `_depositIntoVault(_amount)` → `vault.deposit` returns `_shares`; message amount = `_outboundAmount(_shares)` = SHARES. Rate metadata `(vault.convertToAssets(PRECISION), nonce)` is attached for the synthetic side's display.
- Inbound `_transferTo(_recipient, _shares)` (line 142-147): `vault.redeem(_shares, _recipient, address(this))` — redeems the message's SHARE count at the vault's CURRENT (live) rate.

### 2.5 End-to-end conservation

```
Collateral→Synthetic:  deposit A assets → vault.deposit → S shares → msg(S shares) → mint S synthetic-shares
Synthetic→Collateral:  burn ≤S synthetic-shares → msg(shares) → vault.redeem(shares) → shares × liveRate assets
```

Shares are conserved 1:1 across the bridge. A round trip yields `convertToAssets(convertToShares(A))` ≈ A + legitimate vault yield accrued while holding (rate rises → more assets out). That yield is the SHARE-HOLDER'S by right — it is the entire purpose of a yield-bearing warp route, NOT an exploit. The synthetic `exchangeRate` never enters the collateral redemption math.

---

## §3 — ATTEMPTED EXPLOIT PATHS (all NEGATED, `[INSPECTED]`)

### Path A: Stale-low synthetic rate, send shares, redeem at high live rate
- Gate 1's primary claim. At `staleRate < liveRate`: `assetsToShares(amount) = amount*PRECISION/staleRate` is LARGER (more shares per asset — Gate 1 got the direction backwards, claiming "fewer"). But the user can only burn shares they HOLD (≤ S). The message carries exactly the burned shares. Collateral redeems those shares at live rate. Output = `shares_sent × liveRate ≤ S × liveRate` = the current value of holdings. **No excess.** NEGATES.

### Path B: Mint cheaply via stale rate then redeem
- Inbound mint = message shares (rate NOT applied, §2.3). There is no rate-dependent mint path to exploit. NEGATES.

### Path C: Replay an old favorable rate
- `if (rateUpdateNonce > previousNonce)` (line 132) — monotonic nonce rejects any rate whose nonce ≤ previousNonce. An old (e.g., higher) rate cannot overwrite a newer one. And even a wrong rate affects only display, not conserved shares. NEGATES.

### Path D: Local allowance asymmetry (out of Hyp-1 scope, noted)
- Allowances are stored in asset units; `_transfer` moves `assetsToShares(amount)` shares. This is the standard rebasing-token allowance property (cf. stETH) — a LOCAL ERC20 semantics note, not the cross-chain Hyp-1 finding, and conventionally a known/accepted rebasing property. NOT in Hyp-1 scope.

---

## §4 — EV REVISION

Gate 1 estimated Hyp-1 at ~$28K post-discount. Source-read shows the finding is structurally void — the stale rate cannot influence any conserved/extractable cross-chain quantity. **Revised EV: $0.** Foreclose. Brain-compound value remains HIGH (see §5).

---

## §5 — BRAIN COMPOUNDS (proposed)

### HG2-1 — Doctrine #41 CANDIDATE → 2nd anchor (PROMOTE)
Hyp-1 is a textbook 2nd anchor for Doctrine #41 (filed this same session on Wormhole Hyp-E): a Gate-1 PARTIAL-HIT whose **attack/magnitude were tagged `[ASSUMED]`** and which a commit-pinned Gate-2 source-read **NEGATES**. Two anchors now (Wormhole Hyp-E DC-8 + Hyperlane Hyp-1 DC-12 sub-6), both NEGATIVE-resolved [ASSUMED] Gate-1 claims. Promote Doctrine #41 from CANDIDATE to 2-anchor (toward PERMANENT). The ~30-min source-read SAVED the full hyperlane Foundry build (pnpm/node_modules ~hundreds of MB + cross-chain fork harness).

### HG2-2 — DC-12 sub-6 NEW EXCLUSION sub-rule: "Conserved-Quantity Test"
A stale cross-chain rate (DC-12 sub-6) is exploitable ONLY if the stale rate determines a **conserved / extractable cross-chain quantity**. If the protocol conserves the underlying unit (SHARES) across chains and the rate is (a) display-only and (b) a self-cancelling input-parametrization that appears identically on both sides of the local burn/mint, staleness creates NO arbitrage. **NEGATING anchor: Hyperlane HypERC4626** (message carries shares; rate cancels in burn+message; redemption uses live vault rate on message shares). Pre-filter sub-rule: before crediting DC-12 sub-6 EV on a cross-chain rate-syncing target, trace whether the synced rate enters the CONSERVED cross-chain quantity or only the local display/UX. If display-only → FORECLOSE. (Analogue of Pattern E EXCLUSION Class 3: the lens fires on the SHAPE but the conservation/topology negates it.)

### HG2-3 — Step 3a SUBSTRATE-IDENTITY 5th anchor (POSITIVE)
Hyperlane HypERC4626 is the pending 5th Step 3a anchor flagged in the Sky S-1 compound. Substrate-identity was POSITIVE: the rate-staleness primitive (`exchangeRate` + `_handle` nonce-ordering) IS correctly located in `extensions/HypERC4626.sol` as the brief claimed — Step 3a verifies LOCATION, independent of exploitability. Promotes rule from 4-anchor → **5-anchor**. (Distinct outcome from Sky 4th anchor which was a NEGATIVE-worked-example on *location*; Hyperlane is POSITIVE on location, NEGATIVE on the *finding* at full source-trace — a useful reminder that Step 3a ≠ Gate-2 exploitability.)

### HG2-4 — Watchlist row 419 + intake-log enrichment
- Hyp-1 → FORECLOSED (conserved-shares NEGATE). Hyp-2 (LpCollateralRouter `donate()` first-depositor inflation, CANDIDATE-I) + Hyp-3 (MovableCollateralRouter rebalancer admin-trust, likely OOS) remain PARKED per Gate 1 — not pursued this cycle.
- REVERSALS of Gate 1 proposals: H-1 (Doctrine #29 v1.1 4th positive anchor) and H-2 (DC-12 sub-6 positive 2-anchor promotion via Hyperlane) are RETRACTED — Hyperlane is a NEGATING/boundary anchor, not a positive one. Pendle PT-USDe remains the DC-12 sub-6 positive anchor; Hyperlane sharpens the exclusion boundary instead.

---

## §6 — AI-CLAUSE / SUBMISSION

This is a FORECLOSURE, not a paste-ready. No submission produced. No AI-clause action (Hyperlane has no AI-clause anyway per Gate 1 Axis 8). DISC-019/DISC-022b bindings N/A for foreclosures.

---

## §7 — CLONE DISPOSITION

Sparse clone at `gate2-clones/hyperlane/repo/` (4.9 MB, `solidity/contracts/` sparse-checkout). **PURGE after foreclosure-receipt logged in brain** (disk at 85% = purge-foreclosed-clones threshold per autonomy-boundary). Hyp-2/Hyp-3 remain parked but do not justify holding 4.9 MB at the disk threshold; re-clonable on demand if Hyp-2 is ever prioritized.

---

## §8 — VERDICT SUMMARY

**FORECLOSE Hyp-1.** Source-read at `9a98c3ca` proves the synthetic `exchangeRate` is display-only + self-cancelling; the conserved cross-chain unit is SHARES; collateral redemption uses the live vault rate on the message's share count. No stale-rate arbitrage exists. Three exploit paths (stale-low send/redeem, cheap mint, rate-replay) all NEGATE. Revised EV $0.

**Time-cost:** ~30 min Gate 2 (4.9 MB sparse clone + 4 file reads + arithmetic trace). Saved the full hyperlane pnpm/Foundry build + 2-chain fork harness (~hours + hundreds of MB) by foreclosing on rigorous source-read — exactly the Doctrine #41 pattern this session filed.

**Brain compounds:** HG2-1 (Doctrine #41 2nd anchor → promote), HG2-2 (DC-12 sub-6 Conserved-Quantity EXCLUSION, Hyperlane negating anchor), HG2-3 (Step 3a 5th positive anchor), HG2-4 (watchlist + Gate-1 H-1/H-2 retraction).

**Next-target rec:** TODO item 5 (Sherlock prep) per reboot-recovery sequence.

---

_Gate 2 Hyp-1 FORECLOSURE | Hyperlane Warp Immunefi | 2026-05-29 | Commit `9a98c3ca` | Sparse-clone solidity/ 4.9 MB | Source-read NEGATES via shares-conservation | 4 brain compounds | Doctrine #41 2nd anchor | reboot-recovery TODO item 4, Ogie msg 7962_
