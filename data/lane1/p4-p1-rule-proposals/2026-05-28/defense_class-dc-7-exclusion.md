# P4 → P1 scoring rule proposal — DC-7 EXCLUSION

**Status:** DRAFT (operator approval pending → War Room)
**Source brain commit:** `a920ef245cc1c9d98320c2b5eb7a802d3cebb286`
**Pattern kind:** defense_class
**Auto-generated:** 2026-05-28 16:10 UTC

---

## Source brain context

> NEAR-only (live scope)** | $20M | $100K Critical / $10K High | Lending (cross-chain) | DC-7 **H** + DC-7 EXCLUSION CANONICAL preemptive + CANDIDATE-J + Doctrine #36 substrate-novelty | EV $3.6K post-discount | **GATE-1-COMPLETE / WATCHLIST-PARK pri 12** | `hunts/2026-05-27-templar-immunefi-gate1.md`

**Key Day-27 compounds from this Gate 1:**

1. **INFO #19 → 5th anchor.** Brief said Bitcoin+ETH+Stellar substrate; live Immunefi scope is NEAR-only. Substrate-drift this time (Kiln/Cap/Gearbox were platform/scope drift; OnRe was time-drift). Catalog now 5 anchors. **Standing rule reinforced: ever

---

## Proposed scoring rule

**Direction guidance (defense_class):**
Defense classes are the highest-yield → P1 translation source. If a DC-X pattern requires a specific defensive code shape (e.g., DC-9 sub-2 multi-sig + timelock), then DEPLOYERS who ship contracts WITHOUT that defense get a -10 to -25 penalty. Conversely, deployers WITH the defense get a small +5 bonus.

**Candidate rule (operator review required before append to scoring engine):**

```js
// scoring-rule candidate — DO NOT auto-apply
// DC-7 EXCLUSION
{
  id: "defense_class-dc-7-exclusion",
  weight: TBD (operator-decide: -25 to +5 range per direction guidance),
  description: "Apply when token's deployer wallet has historical "
               "association with the DC-7 EXCLUSION pattern per "
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

- Rule ID: `defense_class-dc-7-exclusion`
- Status: PROPOSED (autonomous generation)
- Source: brain commit `a920ef24`
- Operator decision: pending
