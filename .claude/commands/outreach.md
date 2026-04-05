---
name: outreach
description: Manage email-first BD outreach. Queue, send, follow-up, and track responses. Trust-gated with CC enforcement.
---

# /outreach — BD Outreach Manager

Email-first BD outreach with trust-gated automation.

## Usage
```
/outreach queue TOKEN_NAME      # Queue initial outreach email
/outreach status                # Show outreach queue (pending/sent/replied)
/outreach followup              # Trigger pending follow-ups
/outreach stats                 # Today's send count (max 10/day)
```

## Rules (Permanent)
- Max 10 emails/day (spam prevention)
- CC always: dino@solcex.cc + ogie.solcexexchange@gmail.com
- Template-only — no LLM-generated email bodies
- NEVER send to personal emails (team@, info@, contact@ only)
- Duplicate check mandatory before every send
- Trust Level 0: ALL emails require Ogie approval before send
