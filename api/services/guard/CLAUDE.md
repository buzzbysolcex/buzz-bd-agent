# Wallet Guard Integration (AION)

## Pattern
Aldo's aion-guard-lite provides execution-time provability.
Buzz calls the AION API before any irreversible action.
Returns ALLOW / WARN / BLOCK with a verifiable receipt.

## Integration Point
Before outreach sends, before escrow triggers, before listing executes:
  → Call AION: "Should this action execute?"
  → Receipt generated with deterministic decision + reason
  → ALLOW → proceed + store receipt
  → WARN → War Room alert + human review
  → BLOCK → stop + log why

## Trust Loop (complete)
1. Buzz scores token (pre-execution governance)
2. Wallet Guard approves action with receipt (execution-time provability)
3. BuzzReputation records outcome on-chain (post-execution reputation)

## API Surface
- POST /api/v1/evaluate — send action for preview
- Response: { decision: ALLOW|WARN|BLOCK, receipt: {...}, reason: "..." }

## Status
- Feature flag: WALLET_GUARD (starts false)
- Aldo offered first tester access (April 2, 2026)
- Currently Windows-first, EVM-first — Linux compatibility TBD
- Controlled test on escrow flow planned

## Schema Freeze (AION / Aldo collaboration)
Three schemas frozen with Aldo as of Apr 5, 2026:

1. **Evaluate Request Schema** — locked
   ```json
   { "action": "string", "target": "string", "chain": "string",
     "buzz_score": "number", "sim_consensus": "number", "context": "object" }
   ```

2. **Evaluate Response Schema** — locked
   ```json
   { "decision": "ALLOW|WARN|BLOCK", "risk_level": "string",
     "reason_code": "string", "reasoning": "string",
     "receipt": { "hash": "string", "timestamp": "string", "policy_version": "string" } }
   ```

3. **Receipt Storage Schema** — locked (wallet_guard_receipts table in DB)

Counterfactual overlay proposed by Aldo — under review.
Do NOT modify these schemas without Aldo + Ogie approval.

## Danger Zones
- AION is closed-core — we call the API, don't see internals
- If AION API is unreachable → fallback to trust gates (Task 15) only
- Never bypass Wallet Guard once enabled — it's a security layer
- Receipts should be stored alongside outreach records for audit trail
