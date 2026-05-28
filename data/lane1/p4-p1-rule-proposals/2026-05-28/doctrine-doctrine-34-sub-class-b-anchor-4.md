# P4 → P1 scoring rule proposal — Doctrine #34 sub-class b Anchor #4

**Status:** DRAFT (operator approval pending → War Room)
**Source brain commit:** `23ef71435b07f639357f4093e61532cb1511741b`
**Pattern kind:** doctrine
**Auto-generated:** 2026-05-28 16:10 UTC

---

## Source brain context

> for standing-intake-protocol.md MANDATORY-rule promotion)_
_Doctrine v3.8.4 | 2026-05-27 evening | Doctrine #34 sub-class b Anchor #4 added (Cap C3 PriceOracle pause-asymmetry NEGATED at Phase 1 via natspec self-disclosure, Doctrine #27 Corollary B Anchor #2 mechanism re-fires). Phase 0 commit-diff inspection: 4 surgical Aug 2025 audit-driven fix-commits touched the EXACT `liquidate` function (Issues 49 / 145 / 150 / #201) yet auditors deliberately did NOT add a pause check; `validateBorrow` natspec explicitly states "Check the pause state of the reserve and the health of the agent before and

---

## Proposed scoring rule

**Direction guidance (doctrine):**
Doctrines describe meta-process rules (saturation discount, MIN-cap defense, audit-regression cycle). Most doctrines do NOT map directly to a token-scoring rule. The exception: doctrines about deployer-side patterns (e.g., DC-9 sub-2 DEFENSE PATTERN = multi-sig timelock posture) CAN translate to a deployer-trust scoring bonus.

**Candidate rule (operator review required before append to scoring engine):**

```js
// scoring-rule candidate — DO NOT auto-apply
// Doctrine #34 sub-class b Anchor #4
{
  id: "doctrine-doctrine-34-sub-class-b-anchor-4",
  weight: TBD (operator-decide: -25 to +5 range per direction guidance),
  description: "Apply when token's deployer wallet has historical "
               "association with the Doctrine #34 sub-class b Anchor #4 pattern per "
               "brain/Deployer-Crossref.md or contract source exhibits "
               "the un-defended surface shape.",
  check: (token, scoring_ctx) => {
    // TODO: implement check against deployer-crossref + contract surface
  },
}
```

## Cross-pillar wiring

- **Trigger:** scoring engine evaluates this rule when a token enters the pipeline
- **Data source:** `brain/Deployer-Crossref.md` for deployer-side check; contract source-fetch (Sourcify / Etherscan / equivalent) for surface check
- **Cascade:** if the rule fires HIGH penalty, escalate to Pillar 4 watchlist (deployer wallet → Lane 5 target candidate)

## Operator decisions required

1. Approve the weight value (or reject the rule entirely)
2. Confirm the data-source path (deployer-crossref vs contract source vs both)
3. Edit `api/services/scoring/v2_8rules.js` (or equivalent file) to implement the check
4. Add unit test covering: positive case (rule should fire), negative case (rule should NOT fire on un-related token)

## Ledger entry

- Rule ID: `doctrine-doctrine-34-sub-class-b-anchor-4`
- Status: PROPOSED (autonomous generation)
- Source: brain commit `23ef7143`
- Operator decision: pending
