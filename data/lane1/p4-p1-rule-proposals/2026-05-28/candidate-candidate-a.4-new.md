# P4 → P1 scoring rule proposal — CANDIDATE-A.4 NEW

**Status:** DRAFT (operator approval pending → War Room)
**Source brain commit:** `f1846de15a44e9b7a821b5bb60b1276880e20128`
**Pattern kind:** candidate
**Auto-generated:** 2026-05-28 16:10 UTC

---

## Source brain context

> nds caller) | N/A structural | **3/3** | **FIRES** |

**Brain compounds (5 from this hunt):**

1. **CANDIDATE-A.4 NEW sub-pattern** — Cross-chain factory front-run via permissionless deterministic deployment. Function FBTC = NEGATIVE worked example (correct mitigation: Create3WithSender enum=3 + `_private=true` + sender-bound salt). File for `brain/Patterns-Defense-Classes.md`.
2. **Pending-request liveness-check asymmetry doctrine CANDIDATE** (1st anchor: Function FBTC H8 `confirmMintRequest` no lock re-check). Needs 2nd anchor per Doctrine #37 3-anchor rule.
3. **DC-7 EXCLUSION sub-pattern —

---

## Proposed scoring rule

**Direction guidance (candidate):**
CANDIDATE-* entries are exploitation-pattern catalog. Map: a deployer wallet that has historically shipped contracts exhibiting CANDIDATE-X vulnerability class (per brain/Deployer-Crossref.md) gets a -15 penalty. Multi-incident deployers stack the penalty up to -40.

**Candidate rule (operator review required before append to scoring engine):**

```js
// scoring-rule candidate — DO NOT auto-apply
// CANDIDATE-A.4 NEW
{
  id: "candidate-candidate-a.4-new",
  weight: TBD (operator-decide: -25 to +5 range per direction guidance),
  description: "Apply when token's deployer wallet has historical "
               "association with the CANDIDATE-A.4 NEW pattern per "
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

- Rule ID: `candidate-candidate-a.4-new`
- Status: PROPOSED (autonomous generation)
- Source: brain commit `f1846de1`
- Operator decision: pending
