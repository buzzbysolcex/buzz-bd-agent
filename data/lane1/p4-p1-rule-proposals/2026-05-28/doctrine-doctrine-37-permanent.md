# P4 → P1 scoring rule proposal — Doctrine #37 PERMANENT

**Status:** DRAFT (operator approval pending → War Room)
**Source brain commit:** `623d8e83287b429b2ed80f7cea4d3ec9296b2aae`
**Pattern kind:** doctrine
**Auto-generated:** 2026-05-28 16:10 UTC

---

## Source brain context

> adictions-Register INFO #19 → 2nd anchor (Cap platform discrepancy), version-bump to v1.6 — DONE
2. Doctrine #37 PERMANENT — NOT updated (Cap is PROCEED not Sub-Type B; cap-contracts FRESH 28d)
3. intake-log.md row append — DONE
4. Doctrine #38 boundary anchor (advanceTotp NEGATIVE example) — pending Doctrine.md edit
5. Watchlist v2.11 row — DONE (this row)

**Next-action queue:**
- Cap Gate 2 PoC on Finding 1 (advanceTotp + EigenLayer withdrawal stale-restaker interaction) — highest novelty, only finding with paste-ready bounty potential at TIER-A saturation. Budget 4-6h Foundry + mainnet for

---

## Proposed scoring rule

**Direction guidance (doctrine):**
Doctrines describe meta-process rules (saturation discount, MIN-cap defense, audit-regression cycle). Most doctrines do NOT map directly to a token-scoring rule. The exception: doctrines about deployer-side patterns (e.g., DC-9 sub-2 DEFENSE PATTERN = multi-sig timelock posture) CAN translate to a deployer-trust scoring bonus.

**Candidate rule (operator review required before append to scoring engine):**

```js
// scoring-rule candidate — DO NOT auto-apply
// Doctrine #37 PERMANENT
{
  id: "doctrine-doctrine-37-permanent",
  weight: TBD (operator-decide: -25 to +5 range per direction guidance),
  description: "Apply when token's deployer wallet has historical "
               "association with the Doctrine #37 PERMANENT pattern per "
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

- Rule ID: `doctrine-doctrine-37-permanent`
- Status: PROPOSED (autonomous generation)
- Source: brain commit `623d8e83`
- Operator decision: pending
