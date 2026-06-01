# Aave Umbrella — Immunefi Gate-1 — NEGATE (core) [INSPECTED] + residual surface flagged

**Date:** 2026-06-01 (autonomous "formula loop", Ogie msg 8105 — through Gate-0)
**Target:** Aave Umbrella — upgraded Safety Module (stake aTokens/waToken → auto-slash on reserve deficit + cooldown)
**Platform:** Aave Immunefi, **$1M cap**, PoC-required. **Chain:** Ethereum (deployed **June 2025**, expanding).
**Scope (Step-1 VERIFIED):** `github.com/aave-dao/aave-umbrella` — `src/contracts/{umbrella,stakeToken,rewards,automation,stewards}`. `--depth 1` clone 2026-06-01, 13M.
**Audits:** 4 firms — Certora, MixBytes, Ackee, StErMi (in-repo `audits/Stermi/` covers StakeToken + Umbrella + RewardsController + BatchHelper).
**Verdict:** **NEGATE on the stake-token core** (thoroughly read, sound + accepted-risk-foreclosed). Residual surface (Umbrella.sol deficit/fee math, RewardsController emission) audit-covered + flagged honestly as not-deep-read this pass — low residual p. Net: fresh BUT 4-audit-dense; my CANDIDATE-I/J + DC-9 lenses map onto documented accepted-risk → low p(net-new).

---

## STEP-4.5 GATE-0 CORPUS (build-on-engagement)

Built `data/lane1/gate0/known-issues.json["aave-umbrella"]` (5 entries) from `assets/operating_conditions.md` (accepted-risk) + `audits/Stermi/*` (acknowledged findings):
1. Exchange-rate inflation / precision-loss WITHIN the `totalSupply/totalAssets≤100` bound + `totalAssets≤totalSupply` hard-invariant = accepted design.
2. Fee-on-transfer / non-standard ERC20 underlying = documented limitation.
3. StataToken rewards lost on deposit/unwrap/transfer = acknowledged.
4. Rewards not refreshed on all flows = by design.
5. Privileged slash/admin via trusted UmbrellaController (DAO/5-9 multisig, not EOA) = accepted trust model.

## CANDIDATE DISPOSITIONS (Gate-0 live)

| Candidate | Gate-0 | Gate-1 source-read |
|-----------|--------|--------------------|
| **Slash-evasion within open unstake window** (staker front-runs a pending slash, redeems at pre-slash rate) | NO-MATCH-PROCEED | **NEGATE (accepted design tension)** — inherent to all cooldown-slashing systems (stkAAVE lineage); the cooldown+short-window is the mitigation, not a guarantee. Not a novel contract bug; low severity. |
| **ERC4626 share-inflation / donation** | (corpus entry 1) | **NEGATE** — `_totalAssets` is a TRACKED var (`_deposit`+=, `_withdraw`−=, `_slash`−=), NOT `balanceOf(asset)` → donation-resistant; `totalSupply≥1e6` min; matches accepted-risk. |
| **Slash → stale-rate redemption** | — | **NEGATE** — `maxRedeem` returns the cooldown snapshot in SHARES; `_withdraw` converts at the CURRENT (post-slash) rate → cooldowned stakers correctly bear the slash. |
| **Cooldown over-redeem via transfer** | — | **NEGATE** — `_update` caps `cooldownSnapshot.amount` to `balanceAfter` on transfer and `-=value` on redeem → snapshot ≤ balance always; no over-redeem. |

## CORE READ ([INSPECTED] — `ERC4626StakeTokenUpgradeable.sol` 355 LOC)

- **Cooldown state-machine (CANDIDATE-J):** `_cooldown` snapshots `{amount=balanceOf (shares), endOfCooldown=now+cooldown, withdrawalWindow=unstakeWindow}`. `maxRedeem` returns snapshot.amount only inside `[endOfCooldown, endOfCooldown+window]`. `_update` adjusts the snapshot on every balance decrease ("cooldowned tokens at the bottom of the balance"). Sound.
- **Slash (DC-9):** `_slash` is onlyOwner-gated (trusted controller, corpus #5); caps to `totalAssets − MIN_ASSETS_REMAINING`; `handleAction` (reward sync) BEFORE `_totalAssets −= amount`; reduces assets only (rate drops, shares unchanged). Sound.
- **Share accounting (CANDIDATE-I):** tracked `_totalAssets`; OZ ERC4626 convert with Floor rounding; donation-resistant. Matches `operating_conditions` invariants. Sound.

## RESIDUAL SURFACE — honestly NOT deep-read this pass

- `umbrella/Umbrella.sol` (243 LOC) — `slash(reserve)` / `coverDeficitOffset` / `_coverDeficit` / `_slashAsset` deficit-accounting + `deficitOffset` desync handling + dust handling. **The StErMi audit already flagged + the team ACKNOWLEDGED a `liquidationFee` "DAO under-receives slash fee → loss" issue** (so that class is KNOWN). A novel finding here must differ from the acknowledged set — low residual p, but not a clean clear.
- `rewards/RewardsController.sol` + `EmissionMath.sol` — emission-curve precision (operating_conditions proves ~707yr no-overflow + zero-indexIncrease bounds; two "code improvements acknowledged, won't implement").
- `automation/SlashingRobot.sol` — the slash trigger (keeper).

If revisited: focus Umbrella.sol deficit-offset desync (the `deficitOffset` manual-increase path L75-86) for an accounting gap NOT covered by the acknowledged liquidationFee issue.

### TASK-6 CLOSURE (2026-06-01, Ogie msg 8108 — verify before abandoning) → **CLOSED-INSTANCE, NEGATE UPGRADED scoped→VERIFIED**

Targeted read of `Umbrella.sol` `slash`/`_slashAsset`/`_coverDeficit` vs StErMi **H-01** (`liquidationBonus`-in-`pendingDeficit`, sev High, status **Fixed**):
- **Fix verified [INSPECTED]:** `_slashAsset` computes `deficitToCoverWithFee = deficitToCover·(liquidationFee+100%)/100%` and slashes for it, but returns ONLY `newCoveredAmount` (= `deficitToCover`, full-slash; pro-rata on partial); `liquidationFeeAmount` is computed + emitted but NEVER returned. `slash()` does `_setPendingDeficit(+= newCoveredAmount)` — fee EXCLUDED from `pendingDeficit`. Invariant `pendingDeficit ≤ poolDeficit` holds (newCoveredAmount ≤ deficitToCover ≤ newDeficit). H-01 is a CLOSED instance.
- **No open variant:** partial-slash uses floor division → UNDER-counts newCoveredAmount (conservative, invariant-safe — opposite direction to H-01's over-count). Fee never leaks into pendingDeficit on any path. Dust-handling documented (L187-190).
- **Adjacent concerns = audit-acknowledged (KNOWN, not new):** `_slashAsset` underlying price via `latestAnswer()` (no staleness check) = StErMi **I-03** (align Chainlink getters, **Ack**); eliminateReserveDeficit-return dust = **L-01 (Ack)**. Both Gate-0 KNOWN.
- **Verdict:** residual CLOSED. Aave Umbrella NEGATE is now VERIFIED (core + deficit/fee math read; arsenal lenses sound or audit-acknowledged). Clone foreclosed → added to disk-evict manifest.

## WHY NEGATE (honest EV — Doctrine #42)

Umbrella IS fresh (June 2025) — but it carries **4 audits + an explicit accepted-risk doc** that pre-empts exactly the Clarity/lending arsenal's strongest edges (ERC4626 inflation, slash/share accounting, cooldown state-machine, admin trust). Freshness does not overcome audit-density here; p(net-new) on the read core is low and the residual is audit-covered. Foreclosing the core; residual flagged not-cleared.

## BRAIN COMPOUND

- Lending arsenal: **cooldown-slashing ERC4626** anchor (Aave Umbrella) — the safe pattern = tracked `_totalAssets` (donation-resistant) + share-denominated cooldown snapshot (slash-aware redemption) + `_update` snapshot-cap (no over-redeem) + onlyOwner slash. When all four present + audited, CANDIDATE-I/J/DC-9 p collapses.
- Meta: a fresh module with ≥4 audits + an in-repo `operating_conditions`/accepted-risk doc is a Gate-0-rich, low-p target — the accepted-risk doc IS the foreclosure (Doctrine #15). Build-on-engagement corpus paid off (foreclosed 3 candidates pre-PoC).
