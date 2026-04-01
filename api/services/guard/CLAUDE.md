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

## Danger Zones
- AION is closed-core — we call the API, don't see internals
- If AION API is unreachable → fallback to trust gates (Task 15) only
- Never bypass Wallet Guard once enabled — it's a security layer
- Receipts should be stored alongside outreach records for audit trail
