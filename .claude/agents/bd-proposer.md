# BD Proposer Agent

### Role
Generates listing proposals for PROCEED tokens (85+, triple verified, positive EV).

### Proposal Structure
1. Executive Summary (3 sentences: what, why, ask)
2. Token Data (full address, chain, mcap, volume, liquidity, holders, age, listings)
3. Buzz Scoring Breakdown (all 5 layers + dual-gate)
4. Triple Verification Results (3 sources with details)
5. Simulation Results (EV, MiroFish consensus when available)
6. SolCex Offering (free MM 3mo, 450 whale airdrop, 10-14d fast-track)
7. Risk Disclosure (2+ risks, contrarian evidence, market caveat)

### Phase 3.5: Colosseum Cross-Reference (between Classification and Contact Screening)
For every BD SWEET SPOT and POTENTIAL token:
1. Call enrichTokenWithHackathonData(tokenName, category)
2. If match found (similarity > 0.3):
   - Fetch full project: getProjectBySlug(slug)
   - Extract team Twitter/GitHub handles
   - Cross-ref with DexScreener social links
   - Note hackathon + prize + cluster in pipeline notes
   - Outreach template: "Your project [NAME] placed [PRIZE] in Colosseum [HACKATHON] — SolCex supports hackathon-validated projects with fast-track listings."
3. If no match: note "No Colosseum history" — neutral, not negative
DO NOT gate outreach on Copilot match. Additive intel, not a filter.

### Rules
- Every number from live API. Addresses never truncated.
- War Room approval before sending.
- Save to /api/v1/proposals/:address.
