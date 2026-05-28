# P4 → P1 scoring rule proposal — Doctrine #34 sub-class b anchor #3

**Status:** DRAFT (operator approval pending → War Room)
**Source brain commit:** `527ed847c507ce9fce4a9ee77d11cc7c1fb2445f`
**Pattern kind:** doctrine
**Auto-generated:** 2026-05-28 16:10 UTC

---

## Source brain context

> to MANDATORY Step 5 sub-check in `.claude/rules/standing-intake-protocol.md`.

**Cross-reference:** Doctrine #34 sub-class b anchor #3 (Cap, this hunt) — both are facets of the same lesson: structural defense layers exist and need to be enumerated BEFORE Gate 2 dispatch, not discovered during it.

---

_Brain Contradictions Register | v1.7 | 2026-05-27 evening | 20 entries (18 P4 + 1 P1 + 1 CROSS; v1.7 adds INFO #20 Gate 1 novelty over-estimate, anchors process-hardening rule for cross-protocol DC-7)_
_Doctrine v3.8.3 | 2026-05-27 evening | Doctrine #34 sub-class b Anchor #3 added (Cap EigenOp

---

## Proposed scoring rule

**Direction guidance (doctrine):**
Doctrines describe meta-process rules (saturation discount, MIN-cap defense, audit-regression cycle). Most doctrines do NOT map directly to a token-scoring rule. The exception: doctrines about deployer-side patterns (e.g., DC-9 sub-2 DEFENSE PATTERN = multi-sig timelock posture) CAN translate to a deployer-trust scoring bonus.

**Candidate rule (operator review required before append to scoring engine):**

```js
// scoring-rule candidate — DO NOT auto-apply
// Doctrine #34 sub-class b anchor #3
{
  id: "doctrine-doctrine-34-sub-class-b-anchor-3",
  weight: TBD (operator-decide: -25 to +5 range per direction guidance),
  description: "Apply when token's deployer wallet has historical "
               "association with the Doctrine #34 sub-class b anchor #3 pattern per "
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

- Rule ID: `doctrine-doctrine-34-sub-class-b-anchor-3`
- Status: PROPOSED (autonomous generation)
- Source: brain commit `527ed847`
- Operator decision: pending
