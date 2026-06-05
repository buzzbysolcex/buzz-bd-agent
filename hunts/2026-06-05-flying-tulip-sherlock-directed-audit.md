# Flying Tulip (ftPUT) — Directed-Audit (Hornby method) — Sherlock

**Date:** 2026-06-05 · **Authority:** Ogie msg (Flying Tulip directive) · **Platform:** Sherlock bounty ($100K-$1M Crit) · **Mode:** single-agent, EV-gated, local-fork-PoC-before-FLAG, operator-gated, leak-safe.

**Verdict: NO CONFIRMED CANDIDATE.** Decisive #45 status: **FT ftPUT was Sherlock CONTEST #1223** (Jan 2026, hundreds of researchers, **ZERO valid Med/High after judging**, CircuitBreaker.sol **in-scope**) → **contest-combed, LOW-p** — a brief-vs-reality drift (the "highest-p target to date" framing vs the public contest record). H1 (breaker bypass) NEGATE `[INSPECTED]`; core (H3-H6) contest-combed NEGATE-LEAN; H2 (OFT) is the one un-contest-reviewed angle but likely #46-foreclosed. No PoC (no confirmed candidate).

- **Repo (contest scope):** `ftPUT/contracts/` — CircuitBreaker, PutManager, ftYieldWrapper, FlyingTulipOracle, ftACL, pFT, AaveStrategy (+ interfaces). **OFT token NOT in contest scope** (separate LayerZero OFT, `0x5DD1A7A3…082c`).
- **Gate-0:** 9 accepted known-issues foreclosed + **trusted roles (msig/admin/yieldClaimer-ops) OUT** (privileged-role harm = informational). `PutManager.withdrawFT()` un-gated = **known by-design**.

---

## P1

### H1 — Circuit-breaker bypass [Pattern-I containment escalator, the $1M class]. **NEGATE `[INSPECTED]`.**
**Breaker (`CircuitBreaker.sol`):** per-asset dual-buffer (`mainBuffer` time-replenish + `elasticBuffer` deposit-track); `checkAndRecordOutflow(asset, amount, preTvl)` deducts elastic-then-main, returns `(allowed, available)`, **caller must revert on `!allowed`**; both record fns `onlyProtectedContract` (owner-registered). The WebFetch-flagged "bypasses" — **pause → unlimited outflow** + **`emergencyOverride`** + buffer config — are **owner-only → trusted-role → OOS** (Gate-0; an unprivileged attacker can't pause or override).
**Wrapper exit-paths (`ftYieldWrapper.sol`) — the unprivileged surface:** `withdraw()`/`withdrawUnderlying()` both `try checkAndRecordOutflow … if(!allowed) revert` ✓ enforced; **record-before-transfer (CEI-correct** — check+record first, `safeTransfer(to, totalDelivered)` last) ✓; **`nonReentrant`** ✓. The breaker has no internal reentrancy guard but the wrapper's CEI + nonReentrant + record-before-transfer close it.
**Un-gated paths:** `forceWithdrawToWrapper()` = internal strategy→wrapper rebalance (funds stay in-protocol, NOT a user-exit → correctly un-gated); `withdrawQueued()` = **`onlyYieldClaimer`** (trusted-ops, OOS).
**Why it holds:** no unprivileged path moves user funds without the breaker. User-exits gated + CEI + nonReentrant; un-gated paths are internal-rebalance or trusted-role. **NEGATE.**
**Honest residual:** `withdrawQueued` — IF queued withdrawals aren't breaker-checked at queue-time AND the yieldClaimer can be induced to process attacker-shaped queue entries *beyond its intended action* → a composition seam. Yield-claimer-gated + contest-reviewed → not a confirmed candidate; queued for a deeper queue-time-gating trace.

### H2 — LayerZero OFT cross-chain supply + SD↔LD decimals. **NEGATE-LEAN (#46 prior) — the one fresh angle.**
OFT (`0x5DD1…`) is **NOT in the contest scope** → genuinely un-contest-reviewed (the directive's strongest point: async cross-chain clears the 1-hr cap). BUT: a **vanilla LayerZero OFT** inherits LayerZero's audits → **#46 forecloses** `_debit`/`_credit`/`_removeDust`/`_toSD`/`_toLD` (LayerZero-standard). p(net-new) lives ONLY in FT's **custom** OFT delta (custom rate-limiter, peer config, custom decimals). **The decisive next step = the custom-vs-vanilla determination** (Etherscan source on `0x5DD1…`): vanilla → NEGATE (#46); custom → the on-chain SD↔LD dust conversion IS live (Doctrine #57) → hunt the delta. Not deep-traced this turn (session-bounded); **honest prior = vanilla → low-p**, but this is the single highest-EV residual.

## P2 — core (contest-combed). **NEGATE-LEAN.**
- **H3 (PutManager put-settlement math), H4 (strategy share/yield), H5 (oracle/ftPerUSD), H6 (cross-product reentrancy/desync)** — all squarely in the **contest #1223 scope** that hundreds of researchers combed with **ZERO valid Med/High**. The directive's deltas-from-known are exactly the surfaces a Sherlock contest exhausts. Per #45 + #45.3, p≈0; not deep-traced (honest — contest-combed). H5 also fails the Sherlock "without external conditions" Critical bar if it needs market movement.

---

## Doctrine #52 impact-frame
No confirmed finding. Containment boundary (the circuit breaker) is the Pattern-I spine: verified **enforced** on all unprivileged user-exits (gated + CEI + nonReentrant). The only un-gated exits are internal-rebalance (not a user-outflow) or trusted-role (OOS) → no Pattern-I escalator surfaced.

## Brain compounds
- **C-1 (#45 contest-combed status):** a finished Sherlock CONTEST with hundreds of researchers + ZERO valid Med/High = the strongest crowd-comb signal (heavier than a private audit). The live BOUNTY covers only the residual-Critical the contest missed → moonshot, not "highest-p." Brief-vs-reality drift surfaced (3rd anchor after 3F + this).
- **C-2 (the real fresh-delta locator):** on a contest-combed target, the EDGE is the code OUTSIDE the contest scope — here the **OFT (not in contest scope)** is the one fresh angle; the contest-reviewed core is foreclosed. Always diff the BOUNTY scope vs the CONTEST scope; hunt the difference.
- **C-3:** Pattern-I worked-NEGATING-example — the FT circuit breaker is correctly enforced (CEI + nonReentrant + record-before-transfer on every user-exit; un-gated paths are non-user-exit or trusted) → reusable template for "is the containment boundary actually on every exit?"

_Directed-audit by Buzz · public contest-repo source-trace · PoC-before-FLAG (no confirmed candidate → no PoC) · submission operator-gated · leak-safe (Sherlock Category-3)._
