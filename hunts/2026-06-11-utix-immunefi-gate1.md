# Gate-1 — Utix (Immunefi) — 2026-06-11 — NEGATE-COMPOUND

> Target picked by the corrected scorer (Ogie msg 8227 re-rank). Full 10-layer (20 agents, 4 angles + adversarial verify). Local-fork only. Operator-gated. Bismillah.

## STEP 1 — PROFILE
- **Platform:** Immunefi `immunefi.com/bug-bounty/utix/`. LIVE since 2023-07-26.
- **In-scope (1 asset, bytecode-verified):** `MintedTokenCappedCrowdsaleExtv1` @ `0xc9d7bd1Fad7D5621DdA20335818E9575Ae07Ea03` (Ethereum). TokenMarketNet-framework ICO crowdsale, Solidity 0.4.x. Sourcify `exact_match`.
- **Reward:** Critical = 25% of funds recovered, scaled to **$500K for 100% recovery**, min $25K. KYC: NO. PoC required.
- **FUNDS-AT-RISK (on-chain VERIFIED 2026-06-11, [EXECUTED]):** `address(0xc9d7…Ea03)` holds **451.32 ETH ≈ $748K** (ethplorer + publicnode RPC `eth_getBalance` `0x1877…a000`, both agree). NOT trivial → EV ceiling = full $500K. Token holdings = worthless phishing-airdrop scams + WETH dust (no value).
- **EGRESS = ZERO ([INSPECTED], the NEGATE linchpin):** the deployed Sourcify exact-match source set contains **no `address(this).balance` reference and no function moving the contract's ETH**. The only `address(this).balance` transfer in the repo is `ETHUSD.sol:93 withdrawFunds` — and **ETHUSD is NOT in the deployed source set** (separate, non-deployed, OOS oracle helper). No selfdestruct / delegatecall / `.call.value`. Sourcify `exact_match` ⇒ source == bytecode ⇒ **proof of impossibility**: no call (obvious or non-obvious) can move the 451 ETH.
- **The only in-scope impact:** "Find a way to UNLOCK the stuck funds."
- **Gate-0 OOS:** owner/privileged/leaked-credentials, **centralization**, oracle (except manip/flashloan), governance/51%, best-practice. → in-scope unlock must be **PERMISSIONLESS**.

## STEP 2 — OVERLAP
EVM/Solidity 0.4.x single-contract recovery. Lenses: DC-1 reentrancy, DC-3 access-control, DC-9 privileged-state, Pattern-E rounding, 0.4.x integer-overflow. No prior hunt (clean; not in ledger).

## STEP 5 — FINDINGS: 16 candidates → 0 REAL / 0 NEEDS_POC / **16 NEGATE**

**Root cause of the NEGATE (two independent, structural blockers):**
1. **No ETH egress for the contract balance — at all.** The in-scope crowdsale + its entire base chain contain **zero `address(this).balance` references** and **no** withdraw / refund / sweep / selfdestruct / `.transfer` / `.call.value` of contract-held ETH. The *sole* ETH-mover is `multisigWallet.send(weiAmount)` inside `investInternal` (`CrowdsaleExt.sol:286`), which forwards the **caller's `msg.value`** to the external multisig (`0xf9c3…11a`) — it never reads or moves the stuck balance. So the locked 451 ETH is **structurally unreachable by any call**, permissionless *or* owner.
2. **State-machine brick + role gates.** `getState()` is pinned to `Preparing` (`finalizeAgent.isSane()==false`, `CrowdsaleExt.sol:648`) → `invest()/buy()` revert. Every un-brick lever (`setFinalizeAgent`/`finalize`/`setMultisig`/`setReleaseAgent`/`claimTokens`) is `onlyOwner` = **OOS**, and `setReleaseAgent` is **owner-impossible** once `released==true` (`inReleaseState(false)` freeze). Token release is likewise `onlyReleaseAgent` and frozen.

**Permissionless surface enumerated, all inert:** `invest`/`buy` (revert in Preparing), `updateEarlyParticipantWhitelist` (`:443` — only writes `earlyParticipantWhitelist`, absent from `getState()` deps; also `assert(now<=endsAt)` reverts today, on-chain `endsAt`=2023-05-14), `TokenVesting.releaseMyVestedTokens` (no payable surface; moves vested ERC20 to the vestee, not the stuck ETH; precondition owner-set & never set), `UpgradeableToken.upgrade` (moves only the caller's own token balance). Arithmetic/reentrancy (U4): no permissionless value path reaches the stuck balance; the lone `.send` forwards `msg.value`, no CEI/reentrancy lever on contract balance.

**Verdict:** The stuck $800K is locked **by design** (no egress in the bytecode). There is **no permissionless in-scope recovery** — and effectively no on-chain recovery at all. **NEGATE. No bankable finding. Not submitted.** (Operator-confirmed NEGATE, Ogie msg 8233.)

**Exact EV-math banked (Ogie msg 8233):** even IF an unlock existed, the realizable ceiling was **25% × $748K ≈ $187K**, NOT the $500K cap — the cap only binds at ~$2M funds-at-risk. Moot here (unwinnable), but the lesson: for %-of-funds bounties, compute `min(cap, formula% × on-chain funds-at-risk)` and never quote the headline cap as the EV ceiling.

## LENS BANKED → Doctrine #62
A "recover stuck funds" bounty is only worth a Gate-2 PoC if an **egress for the locked asset EXISTS**. Pre-flight grep BEFORE picking/cloning: for the locked asset, is there ANY function that moves `address(this).balance` / the contract's own token holdings (`withdraw|sweep|refund|selfdestruct|.transfer(|.call.value|releaseAgent`)? If NONE → the funds are bricked-by-design → **realizable EV ≈ 0 regardless of the cap** → foreclose at Gate-0. (Realizable EV ≠ bounty magnitude — same family as the #45.3 saturation lesson.)
