# ADR-019: Trust Gates (Graduated Autonomy)

**Date:** April 2, 2026 (Post-Sprint Day 2)
**Status:** Accepted
**Decision:** Implement graduated trust for autonomous actions

**Context:**
Buzz self-assessed at 55% autonomous. The gap between 55% and 85% is
outreach execution. Binary human-approval is too slow. Fully autonomous
is too risky. Graduated trust solves both.

**Decision:**

- 5 trust levels (0-4), stored in SQLite, survives reboots
- Level 0: all approval required (default)
- Level 4: auto-send for 85+ scores (after 50 clean, 0 complaints, 80% accuracy)
- Promotion: system recommends, Ogie confirms (/promote-trust)
- Demotion: any complaint → instant reset to 0
- On-chain integration: BuzzReputation accuracy feeds trust calculation
- AION Wallet Guard: additional pre-execution check when enabled

**Consequences:**

- Buzz earns its own permissions over time
- Single complaint resets everything (safety first)
- Audit trail: every level change logged with reason
- Reboot-safe: trust_state table with CREATE IF NOT EXISTS
