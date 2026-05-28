# P4 → P1 scoring rule proposal — Doctrine #36 sub-rule #36c

**Status:** DRAFT (operator approval pending → War Room)
**Source brain commit:** `a920ef245cc1c9d98320c2b5eb7a802d3cebb286`
**Pattern kind:** doctrine
**Auto-generated:** 2026-05-28 16:10 UTC

---

## Source brain context

> Promotion → compound-impact gap: ~30 min. First measurable doctrine-to-doctrine-saving cycle.

3. **Doctrine #36 sub-rule #36c (PROPOSED, PERMANENT pending acceptance) — Multi-substrate Account Abstraction signature scheme disambiguation.** Templar Universal Account accepts ed25519 + p256 + EIP-712 + Stellar SEP-53 + passkey signatures. The signed payload MUST include a scheme-id (or domain-separation byte) such that a signature valid under one scheme cannot be replayed under another. Salt + chain_id alone insufficient (chain_id shared). First-anchor candidate; needs 2 more anchors for promoti

---

## Proposed scoring rule

**Direction guidance (doctrine):**
Doctrines describe meta-process rules (saturation discount, MIN-cap defense, audit-regression cycle). Most doctrines do NOT map directly to a token-scoring rule. The exception: doctrines about deployer-side patterns (e.g., DC-9 sub-2 DEFENSE PATTERN = multi-sig timelock posture) CAN translate to a deployer-trust scoring bonus.

**Candidate rule (operator review required before append to scoring engine):**

```js
// scoring-rule candidate — DO NOT auto-apply
// Doctrine #36 sub-rule #36c
{
  id: "doctrine-doctrine-36-sub-rule-36c",
  weight: TBD (operator-decide: -25 to +5 range per direction guidance),
  description: "Apply when token's deployer wallet has historical "
               "association with the Doctrine #36 sub-rule #36c pattern per "
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

- Rule ID: `doctrine-doctrine-36-sub-rule-36c`
- Status: PROPOSED (autonomous generation)
- Source: brain commit `a920ef24`
- Operator decision: pending
