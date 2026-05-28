# P4 → P1 scoring rule proposal — Doctrine #36 PERMANENT

**Status:** DRAFT (operator approval pending → War Room)
**Source brain commit:** `7cd49cca6d078cc5e62af1c4a70b5044374259e3`
**Pattern kind:** doctrine
**Auto-generated:** 2026-05-28 16:10 UTC

---

## Source brain context

> tack | P4 next-target queue | Doctrine #27 Corollary B + Sub-rule #27c + Doctrine #34 sub-class b + Doctrine #36 PERMANENT + DC-9 sub-2 DEFENSE PATTERN — all REINFORCE prior receipt, none unlock fresh angle | DEDUP-FORECLOSURE-RECEIPT, no clone spent (~10min budget) |
| 2026-05-27 22:09 | Kiln Immunefi v2 T+3 redispatch | P4 brain stack | P4 next-target queue | All 7 Day-27 compounds re-applied: Doctrine #27 + Sub-rule #27c (LsETH = canonical anchor, mirrors Paxos PYUSD/USDP) + #34 sub-b + #36 PERMANENT + #37 Sub-Type B + #38 PARTIAL HIT (hatchers + per-operator pools = pass-through wrappers)

---

## Proposed scoring rule

**Direction guidance (doctrine):**
Doctrines describe meta-process rules (saturation discount, MIN-cap defense, audit-regression cycle). Most doctrines do NOT map directly to a token-scoring rule. The exception: doctrines about deployer-side patterns (e.g., DC-9 sub-2 DEFENSE PATTERN = multi-sig timelock posture) CAN translate to a deployer-trust scoring bonus.

**Candidate rule (operator review required before append to scoring engine):**

```js
// scoring-rule candidate — DO NOT auto-apply
// Doctrine #36 PERMANENT
{
  id: "doctrine-doctrine-36-permanent",
  weight: TBD (operator-decide: -25 to +5 range per direction guidance),
  description: "Apply when token's deployer wallet has historical "
               "association with the Doctrine #36 PERMANENT pattern per "
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

- Rule ID: `doctrine-doctrine-36-permanent`
- Status: PROPOSED (autonomous generation)
- Source: brain commit `7cd49cca`
- Operator decision: pending
