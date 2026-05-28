# P4 → P1 scoring rule proposal — Doctrine #38 NEW

**Status:** DRAFT (operator approval pending → War Room)
**Source brain commit:** `9925d388dbd72e4b6c8c97166bc9b7b8a64c368e`
**Pattern kind:** doctrine
**Auto-generated:** 2026-05-28 16:10 UTC

---

## Source brain context

> P=20003/MTH=1442/DS=257 | proposals only (no brain writes) | 4.4m |
_Doctrine v3.8.2 | 2026-05-27 | Doctrine #38 NEW (Pure Pass-Through *WithSig Wrappers Are STRUCTURAL FORECLOSE) — DeFi Saver CANDIDATE-1 Gate 2 NEGATED at Phase 1 source-read (35min, Foundry investment NOT made). Claim: "A wrapper contract that forwards an EIP712 signed permit to a protocol's `*WithSig` endpoint and takes NO local validated action is a FORECLOSE — the signature binds all trust-relevant fields, the protocol's `ecrecover` enforces signer identity (signer = `permit.owner` / `delegator` / `authorizer`), and the wr

---

## Proposed scoring rule

**Direction guidance (doctrine):**
Doctrines describe meta-process rules (saturation discount, MIN-cap defense, audit-regression cycle). Most doctrines do NOT map directly to a token-scoring rule. The exception: doctrines about deployer-side patterns (e.g., DC-9 sub-2 DEFENSE PATTERN = multi-sig timelock posture) CAN translate to a deployer-trust scoring bonus.

**Candidate rule (operator review required before append to scoring engine):**

```js
// scoring-rule candidate — DO NOT auto-apply
// Doctrine #38 NEW
{
  id: "doctrine-doctrine-38-new",
  weight: TBD (operator-decide: -25 to +5 range per direction guidance),
  description: "Apply when token's deployer wallet has historical "
               "association with the Doctrine #38 NEW pattern per "
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

- Rule ID: `doctrine-doctrine-38-new`
- Status: PROPOSED (autonomous generation)
- Source: brain commit `9925d388`
- Operator decision: pending
