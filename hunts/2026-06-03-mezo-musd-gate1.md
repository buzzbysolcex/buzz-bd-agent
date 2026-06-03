# Mezo MUSD (Borrow) — Gate-1 — NEGATE [INSPECTED] (autonomous loop cycle 1)

**Date:** 2026-06-03 (Formula loop LIVE). **Target:** Mezo MUSD — Liquity-fork CDP stablecoin (100% BTC-backed) on Mezo BTC-L2.
**Source:** `github.com/mezo-org/musd` @ main (`--depth 1`, 18M). Solidity, UPGRADEABLE (.openzeppelin proxies — delta from immutable canonical Liquity).
**Venue:** NO formal MUSD Immunefi bounty (Acre, a sibling Mezo protocol, has one). → whitehat-disclosure + HSaaS-relationship play (Mezo = Thesis-funded). EV = reputation + Lane-2 feed, not a paid bounty.
**#45:** thin/fresh chain; the high-p surface = the FORK-DELTA (Mezo's changes to canonical Liquity), NOT the inherited Liquity core (which carries Liquity's heavy audit).
**Verdict:** **NEGATE on the read fork-delta** — the two highest-value deltas are sound; codebase is Echidna-fuzzed + 115 slither annotations.

## Fork-delta seams read [INSPECTED]
1. **BorrowerOperationsSignatures.sol (EIP-712 signed ops — NEW):** `_verifySignature` checks `block.timestamp <= deadline`, builds the digest as `_hashTypedDataV4(keccak256(typeHash ++ data ++ nonces[borrower] ++ deadline))`, recovers via `ECDSA.recover`, enforces `recoveredAddress == _borrower`, and `nonces[_borrower]++`. No replay (nonce++), no signer-spoof (==borrower), no cross-op collision (typehash in digest + fixed-length data → no encodePacked ambiguity), deadline enforced. SOUND.
2. **InterestRateManager.sol + `_refinance` (interest accrual — NEW; canonical Liquity has none):** aggregate `interestNumerator = Σ(principal×rate)`. `_refinance` does `removePrincipal(oldPrincipal, oldRate)` then `addPrincipal(oldPrincipal, newRate)` then `setTroveInterestRate(newRate)` — invariant maintained (remove-at-old, add-at-new). Rate is governance-bounded (`MAX_INTEREST_RATE=10000`=100%, propose/approve flow). SOUND.
3. **Interest staleness:** `updateSystemInterest()` / `updateSystemAndTroveInterest` accrued at the START of refinance, liquidation (L302), and redemption (L662) → no stale-debt collateralization (the Arkadiko-style seam is CLOSED here). SOUND.

## Detectors (productized, auto-applied — rail 2)
buzz-detectors semgrep run: 6 C2-recall hits on Liquity pools (ActivePool/DefaultPool/CollSurplusPool/StabilityPool/PCV) — recall-FPs (the pools have `sendCollateral` egress; Skeptic-filtered). No DC-7/DC-8/Pattern-H/C1/C7/C10 confirmed hits.

## Honest scoping
Read the 2 highest-value deltas (signatures + interest) + the staleness seam → all sound. Did NOT exhaustively read the full Liquity core (inherited, Liquity-audited) or every delta (PCV, GovernableVariables, BTC-collateral SendCollateral, upgrade-init guards). NEGATE on the read surface; residual-delta p is low given the Echidna+slither coverage. If revisited: PCV interest-distribution + the BTC-native-collateral SendCollateral path.

## Brain compound
- Lending arsenal: **Liquity-interest-fork** sound-pattern anchor — a fork that ADDS interest to Liquity must (a) maintain `Σ(principal×rate)` via remove-at-old-rate/add-at-new-rate on refinance, (b) accrue interest before EVERY debt-reading op (open/adjust/liquidate/redeem). Mezo does both → the common interest-fork bugs (numerator drift, stale-debt) are absent. Use as the negative-control for future interest-fork Gate-1s.
