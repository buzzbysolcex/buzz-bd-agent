# Operator-Brief Reconciliation Rule

> **Authority:** Ogie msg 7775 (2026-05-25 19:17 UTC) — P4 of 4 Flying Tulip Sherlock Gate 1 brain proposals approved.
> **Trigger:** 2-of-2 Sherlock operator briefs on 2026-05-25 diverged 10× from on-chain reality on prize amount AND contest status.
> **Status:** PERMANENT brain file. Linked from `.claude/rules/standing-intake-protocol.md` Step 1 PROFILE platform-STATUS preflight (added 2026-05-25 per C-Cap-4).

---

## The pattern

Operator briefs are high-velocity surface descriptions delivered via Telegram. They are written from memory or quick scan and can diverge from on-chain reality on any of three axes:

| Axis | Cap Sherlock divergence | Flying Tulip Sherlock divergence |
|---|---|---|
| **Prize amount** | $1M briefed | $93.1K final | $1M briefed | $100K actual |
| **Status** | "active" implied | FINISHED 2025-07-24 (10mo ago) | "active" implied | FINISHED, judging adjudicated zero valid M/H findings |
| **Scope** | EigenLayer "in scope" | EigenLayer added post-audit | (FT not source-checked) | (FT not source-checked) |

**2-of-2 same-day divergence is a pattern, not noise.** [INSPECTED]

---

## Why this happens (no operator blame — pure process)

1. Operator runs HIGH-frequency BD pipeline scanning + Master Ops + brain-compound + multi-Gate-1 dispatch in parallel
2. Memory-based recall on a contest the operator saw briefly on Sherlock blog/Twitter/forum
3. Sherlock contest pages don't surface STATUS prominently in the URL or contest-card layout — `FINISHED` is buried in a sidebar field
4. The default assumption "operator-named contest = active contest" was structurally embedded in pre-2026-05-25 Standing-Intake — Step 1 read the named platform and clone-cycled into Step 5
5. No automated reconciliation check existed between operator brief and the on-chain reality before subagent dispatch [INSPECTED]

---

## The reconciliation rule

**For every Standing-Intake Step 1 PROFILE dispatch where the bounty/contest was named by operator:**

1. **Platform STATUS preflight** (Standing-Intake Step 1 platform-STATUS rule, C-Cap-4, shipped 2026-05-25): confirm contest is ACTIVE before clone. Specific platforms:
   - **Sherlock** — fetch contest page, verify `status` field ≠ FINISHED / closed / judging-complete
   - **Cantina** — verify program shows current caps + not "archived" / "paused"
   - **Immunefi** — verify program page shows current caps + not "archived"
   - **HackerOne** — verify program status not "pending" or "closed"
2. **Prize-amount reconciliation** (added 2026-05-25 per P4): cross-check operator-briefed prize vs the platform page's `total_rewards_paid` + `prize_pool_remaining` + `prize_pool_total` fields. Surface the diff if >2× divergence. [INSPECTED]
3. **Scope reconciliation** (added 2026-05-25 per P4): for any operator-named modules, verify they appear in the contest's published scope table. If a named module is in HEAD but NOT in audited-scope (Cap EigenLayer pattern), flag as **post-audit composition** (Doctrine #34 fires).
4. **No-blame surface** — surface divergences as **facts**, not corrections. Format: "Operator brief: X. On-chain reality: Y. Implication: Z." Operator decides response (pivot to HEAD analysis vs FORECLOSURE-RECEIPT vs cold-email).

---

## Worked anchors (2026-05-25)

### Anchor 1 — Cap Sherlock contest #990

- **Briefed:** $1M Sherlock, 9 core contracts (AccessControl, Delegation, FeeAuction, FeeReceiver, Oracle, Lender, Vault, FractionalReserve, Minter), EigenLayer in scope
- **Reality:** $93.1K final / $126K rewards, contest FINISHED 2025-07-24 (10mo ago), 610 issues filed, judging closed 2025-08-23, EigenLayer added POST-audit (132 commits between audit commit `0a57fbf` and HEAD `7254ed0`)
- **Pivot:** Subagent pivoted to HEAD post-audit-drift analysis. 5 candidates surfaced (1 CRIT TOTP grow-only-allowlist + 1 HIGH LZ-OFT DVN trust + 2 HIGH + 1 MED). All in post-audit-new code.
- **Outcome:** Watchlist-only — no submission path. 5 brain compounds landed including **Doctrine #34 Post-Audit Composition Multiplier** as first PERMANENT doctrine on this pattern.

### Anchor 2 — Flying Tulip Sherlock contest #1223

- **Briefed:** $1M Sherlock, multi-chain yield + puts + LayerZero OFT + circuit breaker
- **Reality:** $100K USDC final, contest FINISHED, Sherlock blog 2026-04-30 "A Model Codebase" article: "After review and adjudication, the final count was clear: zero valid Medium or High severity findings."
- **Pivot:** Subagent halted at Step 1 PROFILE (no clone executed per Cap-style waste avoidance). 5 pre-source candidate frames identified including the Selective-Coverage Defense Asymmetry lens (P1) on CircuitBreaker `withdrawFT()` exclusion.
- **Outcome:** Watchlist-only — no submission path. 4 brain compounds landed including this Operator-Brief-Reconciliation rule (P4).

---

## Estimated impact

**Time savings:** 30-90 min per misaligned brief. Cap subagent burned ~14 min on the Step-5 pivot before realizing the contest was finished. Flying Tulip subagent halted at Step 1 in 15 min (vs the 25-min Euler / 22-min Uniswap / 14-min Reserve full-pipeline budget). Pre-Cap-4 baseline: the operator would have needed to manually verify and re-dispatch.

**False-confidence elimination:** the brain previously treated operator-named contests as "verified active." This was a STRUCTURAL gap — Buzz had no internal reconciliation. The C-Cap-4 platform-STATUS preflight + P4 brief-reconciliation closes the gap. [INSPECTED]

**Brain-compound multiplier:** Cap pivot surfaced Doctrine #34 (Post-Audit Composition Multiplier) as a PERMANENT new doctrine — net-new brain compound on a FORECLOSED-contest target. This validates that "failed" Gate 1 dispatches still produce methodology yield when properly framed.

---

## Implementation status

- **Standing-Intake Step 1 platform-STATUS preflight rule:** SHIPPED 2026-05-25 (C-Cap-4 commit eaf6c9e)
- **This brain file:** SHIPPED 2026-05-25 (P4)
- **Subagent-prompt standard reference:** all future Gate 1 subagent prompts must reference this file under "STEP 1 PROFILE (MANDATORY FIRST)" with the literal text "**STATUS CHECK FIRST** — confirm contest is ACTIVE (not FINISHED). If FINISHED → STOP, report finding + skip clone."
- **Cron monitoring (not yet implemented):** monthly recon-tick that re-scans all platforms (Sherlock + Cantina + Immunefi + HackerOne) for currently-active programs, populates a buzz-internal "active-programs" table, surfaces stale operator references. P4 candidate follow-up for 2026-06+.

---

## Cross-references

- `.claude/rules/standing-intake-protocol.md` Step 1 PROFILE platform-STATUS preflight (C-Cap-4 sibling)
- `brain/Doctrine.md` Doctrine #34 Post-Audit Composition Multiplier (C-Cap-3 sibling — Cap canonical anchor)
- `brain/Watchlist-Candidate-Crossmap.md` Cap row 35 (C-Cap-5) + Flying Tulip row 36 (P2 sibling)
- `brain/Lens-FT-CircuitBreaker-Asymmetry.md` (P1 sibling)
- `brain/Cross-Domain-Fragility-Laws.md` Selective-Coverage Defense Asymmetry Law (P3 sibling)

---

_Operator-Brief-Reconciliation | v1.0 | 2026-05-25 | First filing — P4 of 4 Flying Tulip Sherlock Gate 1 brain proposals approved by Ogie msg 7775 (FT watchlist-only). Companion to C-Cap-4 platform-STATUS preflight (shipped same-day). 2-of-2 Sherlock operator-brief 10× divergence is the worked anchor pair (Cap contest #990 + Flying Tulip contest #1223, both FINISHED, both briefed as $1M, both reality $100K range)._
