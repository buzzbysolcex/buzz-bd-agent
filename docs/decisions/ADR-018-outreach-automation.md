# ADR-018: Outreach Automation (Email-First)

**Date:** April 2, 2026 (Post-Sprint Day 2)
**Status:** Accepted
**Decision:** Build email-first outreach automation, abandon Twitter DM

**Context:**
42-day sprint history proved Twitter DM has ~2% success rate (403 errors,
closed DMs, wrong contacts). Gmail OAuth has ~60% success rate and has been
reliable since Feb 4.

**Decision:**
- Gmail OAuth (buzzbysolcex@gmail.com) as primary outreach channel
- gsd-browser + dev-browser for contact discovery
- Trust gates control sending permissions (graduated autonomy)
- Dynamic crons for follow-up scheduling (48h + 7d, self-deactivating)
- All emails CC to dino@solcex.cc + ogie.solcexexchange@gmail.com
- Feature flagged: AUTO_OUTREACH, SILENCE_CONSENT
- Max 10 emails/day, template-only, no LLM bodies
- Twitter DM: officially DEAD — never invest further

**Consequences:**
- Outreach moves from manual to semi-autonomous immediately
- Full autonomy earned through trust gates (50 clean sends = auto-send for 85+)
- Reboot-safe: all state in SQLite with CREATE IF NOT EXISTS
