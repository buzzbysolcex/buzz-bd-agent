<!-- P4P2-PRIVATE-SUPPRESS — PLATFORM-ONLY DISCLOSURE (Immunefi live program). NO public content drafts. -->

# Hermetica (USDh / sUSDh — Stacks/Clarity) — Gate 1 (PRIVATE: Immunefi) — NEGATE [INSPECTED] + FIRST CLARITY SUBSTRATE COVERAGE

**Date:** 2026-05-30 (autonomous formula-loop, Ogie msg 8042 "continue hunting"; fresh-scout #1 dispatch)
**Target:** Hermetica — Bitcoin-backed delta-neutral synthetic dollar (USDh) + staked yield token (sUSDh), on **Stacks (Clarity)** + Bitcoin Runes. Immunefi **$100K crit (10%-of-funds), $5K other-crit, NO-KYC**, PoC-MANDATORY, Primacy-of-Impact. Source pulled on-chain via Hiro API → `gate2-clones/hermetica/*.clar` (12 contracts, ~1.5K LOC). Deployer `SPN5AKG35QZSK2M8GAMR4AFX45659RJHDW353HSG`.
**Substrate:** **CLARITY (Stacks L2)** — NOT EVM, NOT Cosmos-Go. Per Doctrine #36 I was substrate-blind (no Clarity arsenal) → P-floor ~0.05. Mitigated by Clarity's simplicity (decidable, no reentrancy/overflow) + universal lenses (DC-3 access-control, CANDIDATE-I share-accounting, replay/double-spend, oracle-gating).

---

## STEP 1 PROFILE
- Platform Immunefi ACTIVE (live 2026-02-12); **no-KYC** (rare, low-friction); PoC-mandatory; Primacy-of-Impact (testnet/mock OOS).
- Cap: 10%-of-funds-affected **max $100K** ($5K flat other-crit). USDh TVL ~$9.5M (mainnet supply 9.48M) → $100K cap realistically reachable on a true critical.
- Audits: Clarity Alliance (USDh + USDh-Upgrade, Sept-2025, 7 findings 1H all resolved) + Strata Labs. **Audit-light (2 firms)** + fresh → passes the audit-light-fresh + confirmed-platform gate.
- Out-of-scope (inferred): off-chain delta-neutral perp hedge (CEX positions — not on-chain), oracle manipulation (Pyth), operator/admin centralization, fixed audit-report findings.

## STEP 2 OVERLAP — universal lenses (no Clarity arsenal yet)
On-chain surface = USDh/sUSDh mint/redeem/stake/yield share-accounting. Lenses: CANDIDATE-I (sUSDh exchange-rate/inflation), DC-3 (privileged-fn auth via Clarity contract-caller-allowlist), replay/double-spend (OTC request-ids), oracle-gating (auto-mint Pyth).

## STEP 5 — full in-scope source-read (the named curator/allocator-analogue = staking share-accounting)

**Contracts read [INSPECTED]:** `staking-v1-1` · `staking-state-v1` · `staking-reserve-v1` · `staking-silo-v1-1` · `susdh-token-v1` · `usdh-token-v1` · `hq-v1` (auth hub) · `minting-auto-v1-2` (oracle peg) · `minting-otc-v1-1` (operator mint).

**Findings — all NEGATE:**

1. **sUSDh inflation / first-depositor (CANDIDATE-I) — structurally present, NON-EXPLOITABLE on live state.** `get-usdh-per-susdh = reserve_USDh_balance × 1e8 / susdh_supply` (default 1e8 when empty) — **no virtual shares / no dead-shares seed**, and `total-usdh-staked` reads the donatable raw balance of `.staking-reserve-v1`. Classic donation-inflation shape. BUT the vault is already seeded (~3.65M sUSDh supply) → the empty-vault attack window has passed and can't recur; on a seeded vault a "donation" simply raises the rate = **the intended yield mechanism** (sUSDh appreciates). Round-trip rounding (`/` floors both stake-shares and unstake-assets) is vault-favorable. NEGATE (post-seed + donation-is-yield). [INSPECTED]
2. **Privileged mint/burn (USDh + sUSDh) — gated.** `mint-for-protocol`/`burn-for-protocol` on both tokens require `check-is-minting-contract contract-caller` (hq-v1 allowlist, owner-set + 1008-block ~7day timelock to add). No open/unbacked mint path. SIP-10 `transfer` sender-auth (`sender == tx-sender || contract-caller`) correct. NEGATE.
3. **Reserve drain — gated.** `staking-reserve-v1.transfer` requires `check-is-minting-contract contract-caller` AND `check-is-protocol recipient` (recipient must be an allowlisted protocol contract) — attacker can't drain to self nor call uninvited. Uses `contract-caller` (not `tx-sender`) — correct Clarity auth. NEGATE.
4. **Silo claims (unstake cooldown) — sound.** `create-claim` is `staking-v1-1`-only; `withdraw(id)` pays the RECORDED recipient (permissionless cranking, not theft), cooldown-gated (`get-current-ts >= claim.ts`), deletes claim (no replay/double-spend); monotonic claim-id (no forging); atomic unstake ordering (try! rollback). `withdraw-many` partial-success benign. NEGATE.
5. **Auto-minting peg (`minting-auto-v1-2`) — permissioned + oracle-gated.** `is-minter` whitelist (external attacker can't call) + Pyth oracle (staleness `timestamp>block-timestamp`, confidence-tolerance, `price-feed-id` match) + mint-limit rate-limit + protocol-favorable rounding/slippage (divides by `price−slippage` → requires MORE collateral; floors → minter slightly overpays). The `price-feed-bytes=none` fallback defaults price=1e8/identifier=0x00 — rejected by the feed-id match (L116) for any oracle-priced asset → designed par-collateral path, not a bypass. NEGATE (oracle/operator-trust = OOS).
6. **OTC minting (`minting-otc-v1-1`) — operator-trust + guarded user paths.** `confirm-mint`/`confirm-redeem`/`cancel` are whitelisted-trader-only (operator-trust; external attacker excluded). Replay-blocked (`map-insert` + `ALREADY_CONFIRMED`); `request-redeem` request-id unique (`map-insert`→`REQUEST_ID_ALREADY_EXISTS`); `claim-unconfirmed-redeem` requester-only + window-gated + mutually-exclusive-delete with confirm (no double-spend); `confirm-redeem` conserves exactly the deposited USDh (burn + fee + refund = requested) + slippage-bounded in the user's favor. User-chosen request-id griefing is self-costly + low-sev. NEGATE.
7. **hq-v1 auth hub — sound.** owner+1008-block-timelock to add minting-contracts/admins; guardian emergency-disable; `check-is-*` use the right principal source. Two-step owner update with activation-delay. NEGATE.

**Residual risk classes = OOS:** Pyth oracle-trust; operator/admin centralization (whitelisted minters/traders/owner can act maliciously — Immunefi excludes centralization/key-compromise); fixed audit findings.

**Net: no externally-exploitable candidate. NEGATE [INSPECTED].** No PoC (no candidate; Clarinet PoC would only be needed on a CONFIRM).

## Compounds — FIRST CLARITY/STACKS SUBSTRATE COVERAGE (the strategic win)
This is Buzz's **first Clarity hunt** → seeds the Clarity/Stacks bug-research arsenal (aligns with our Bitcoin/Stacks/AIBTC identity; capability-investment like Cosmos-Go was for Heimdall). Clarity lens-map banked → `brain/Patterns-Defense-Classes.md`:
- **DC-3-Clarity (auth):** privileged inter-contract fns MUST gate on `contract-caller` against an allowlist (hq-style), NOT `tx-sender` (tx-sender = original signer, spoofable across a malicious intermediary contract). EOA-admin ops use `tx-sender`. Hermetica does both correctly → the footgun to hunt is the INVERSION (tx-sender where contract-caller needed, or vice-versa).
- **Replay/double-spend-Clarity:** `map-insert` (fails-if-exists) is the correct request-id/nonce replay guard; `map-set` (overwrites) is NOT. Confirm via both an explicit `confirmed`-flag assert AND the insert.
- **`as-contract` value-flow:** transfers under `as-contract` move the CONTRACT's funds (tx-sender→contract) — audit the recipient is allowlisted (Hermetica: `check-is-protocol recipient`).
- **CANDIDATE-I-Clarity (share vault):** Clarity SIP-10 yield vaults (sUSDh) have the SAME virtual-shares/first-depositor inflation surface as ERC4626 — but check LIVE seed-state (a seeded vault foreclosed the attack here). Donation-to-reserve = the intended rate mechanism, not always a bug.
- **Substrate-acquisition:** Stacks source is on-chain → pull via Hiro `api.hiro.so/v2/contracts/source/<principal>/<name>`; enumerate deployer via `/extended/v1/address/<P>/transactions`. No GitHub needed (gitbook auth-gates). Clarinet for any Gate-2 PoC.

**Clone purge-eligible** (NEGATE; sources retained in `gate2-clones/hermetica/` for the Clarity-arsenal reference until disk pressure).

---

_Gate 1: 2026-05-30-hermetica | PRIVATE/Immunefi | **NEGATE [INSPECTED] — sound access-control throughout; inflation non-exploitable post-seed; minting permissioned+oracle-gated+operator-trust (OOS residuals)** | NO PoC (no candidate) | **FIRST CLARITY/STACKS substrate coverage banked (Doctrine #36 arsenal seed)** | autonomous formula-loop | single-agent | P4P2 suppressed_
