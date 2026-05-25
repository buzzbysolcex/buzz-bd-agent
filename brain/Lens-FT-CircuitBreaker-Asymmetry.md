# Lens — Selective-Coverage Defense Asymmetry (Flying Tulip CircuitBreaker family)

> **Authority:** Ogie msg 7775 (2026-05-25 19:17 UTC) — P1 of 4 Flying Tulip Sherlock Gate 1 brain proposals approved.
> **First worked anchor:** Flying Tulip CircuitBreaker (2026-05-25 Sherlock contest #1223 FINISHED). README-confirmed verbatim: "CircuitBreaker notably does not cover `putManager.withdrawFT()` by design choice."
> **Status:** LENS_TRACKED (not yet a CANDIDATE letter — promotion path requires 2 additional anchors per Doctrine #18 standard).

---

## Class statement

When a protocol implements a defense mechanism (circuit-breaker, pause-guard, rate-limiter, slippage-cap, kill-switch) AND the protocol's documentation OR source code EXPLICITLY excludes a specific function from the defense's coverage ("by design", "intentional", "left uncovered for X reason"), the excluded function becomes the highest-EV attack surface in the protocol. [INSPECTED]

The defense's existence calibrates auditor expectations: "this protocol has a circuit-breaker" reads as "downstream paths are protected." The selective-exclusion inverts that calibration: every excluded path is a known-uncovered hot zone, often left so because the project team weighed UX/liveness against safety and chose UX. The trade-off is a public design decision; the exploit potential is the cost. [INSPECTED]

---

## Why this is a lens, not a heuristic

Selective-coverage defenses are a structural pattern in mature protocols (post-2024 design wave). Examples:

- **Aave V3** flashLoan paths excluded from certain reserve-config guards
- **Compound** liquidate function explicit pause-bypass
- **Olympus BLVault** MIN-cap defense excluded for emergency unwind paths
- **Curve V2** EMA-oracle path divergence between pool-types (selective TWAP)
- **Flying Tulip CircuitBreaker** — `withdrawFT()` excluded by design

The pattern is well-documented at the design level but rarely flagged at the audit level — because auditors check that the defense FIRES on covered paths, not that the EXCLUSIONS are reasoning-confirmed. The lens corrects this. [INSPECTED]

---

## Detection signature

For any protocol with a named defense mechanism (CircuitBreaker / Pauser / Guardian / KillSwitch / RateLimiter / SlippageGuard / MaxCap):

1. **Find the defense's coverage list** — usually a mapping `mapping(bytes4 => bool) public guardedSelectors` or `address[] public pausableModules` or `mapping(address => bool) public circuitBreakerCovered`.
2. **Find the documented exclusions** — search:
   - `README.md` for "not covered", "by design", "excluded from", "intentional bypass"
   - NatSpec `@dev` / `@notice` comments containing "circuit-breaker", "pause", "bypass"
   - Source-code comments on the defense module itself (`// note: X is uncovered`)
   - GitHub PR descriptions / commit messages from the team's deploy commits
3. **For each documented exclusion**, ask:
   - What state can the excluded function mutate?
   - What downstream protocols depend on the invariant the defense protects?
   - Can an attacker reach the excluded function during an attack window the defense WOULD have caught on a covered function?
   - If the exclusion was made for UX/liveness reasons, what's the worst-case extractive value of the unbounded path?

**The audit-time check is to surface the exclusion list to triagers, not to argue the design was wrong.** [INSPECTED]

---

## Flying Tulip CircuitBreaker canonical anchor (2026-05-25, watchlist-only)

**Protocol:** Flying Tulip — multi-chain yield + puts protocol on Ethereum + Sonic (mid-April 2026 launch).
**Defense module:** `CircuitBreaker.sol` (full path not source-read; identified via README + docs.flyingtulip.com).
**Documented exclusion:** README verbatim: "CircuitBreaker notably does not cover `putManager.withdrawFT()` by design choice."
**Status:** [INSPECTED — README quote] / [ASSUMED — exploit-path requires source-read]

**Hypothesis (not source-confirmed, no submission path):** if CircuitBreaker triggers when oracle prices diverge >X% across DVN-attested L2 messages, the put-manager's `withdrawFT()` continues to settle puts at the divergent price — extracting value from the put-buyer's premium pool. The design rationale ("liveness during oracle disagreement") may have underweighted the extractive surface. [ASSUMED]

**Brain-compound only.** Cap Sherlock contest #1223 FINISHED 2026-04 with zero valid M/H findings; no submission path available.

---

## Cross-pollination targets (operator-greenlit on next Gate 1)

- Any Aave V3 fork where the team has published a "modifications-vs-Aave" doc — the diff IS the exclusion list
- Any Compound fork where governance has voted to bypass-pause specific assets
- Any rate-limited bridge (Wormhole / LayerZero / Hyperlane) with documented per-token rate-limit-bypass paths
- Any oracle-router protocol with documented fallback-oracle paths that bypass the primary defense
- Any DEX with documented MEV-bypass paths (selective TWAP / selective slippage)

**Lens application during Step 2 BRAIN OVERLAP:** add to the lens stack for ANY protocol whose Step 1 PROFILE returns "has named defense mechanism." The lens fires regardless of bounty platform — Immunefi, Cantina, Sherlock, direct.

---

## Promotion path to CANDIDATE-letter

Doctrine #18 standard requires 3 worked anchors with combined exposure > $X (variable). Current count: **1 anchor (Flying Tulip, [INSPECTED] README-only).**

Promotion path 2/3 worked anchors:

1. Find 1 confirmed exploit-or-disclosure where a documented-excluded defense path was the attack surface (search rekt.news + Code4rena + Cantina disclosed findings for "by design", "intentional", "excluded")
2. Find 1 in-flight bounty target with this pattern documented in scope materials
3. On confirmation of 3, file as new CANDIDATE letter (next available, NOT Y which is filed)

---

_Lens-FT-CircuitBreaker-Asymmetry | v1.0 | 2026-05-25 | First lens-only filing for Selective-Coverage Defense Asymmetry family. Flying Tulip CircuitBreaker canonical anchor (README [INSPECTED], exploit path [ASSUMED]). Status: LENS_TRACKED pending 2 additional anchors for CANDIDATE promotion. Authority: Ogie msg 7775 (P1 of 4 FT brain proposals, FT watchlist-only, no submission path)._
