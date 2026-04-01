# Outreach Engine

## Pattern
Email-first autonomous outreach. Wired into v9 reactive flow via event bus.
Twitter DM is DEAD (403, closed DMs, wrong contacts — proven over 42-day sprint).
Gmail OAuth on buzzbysolcex@gmail.com is the primary channel.

## Channel Priority (proven by 42-day sprint history)
1. Email (Gmail OAuth) — ~60% success, FULL automation
2. Telegram group — ~30% success, SEMI automation
3. Twitter public reply — ~15% success, postReply works
4. Twitter DM — ~2% success, DEAD — never invest further

## Flow
1. Event bus emits 'token.hot' (score 85+)
2. BD Agent receives via mailbox → starts BD Screening (7 phases)
3. Phase 4 triggers contact discovery via gsd-browser + dev-browser
4. If email found → template generates personalized email
5. Trust gate check (Task 15): AUTO_SEND / SILENCE_CONSENT / APPROVAL_REQUIRED
6. If Wallet Guard enabled (Task 17): AION preview → receipt
7. Email queued in outreach_queue (SQLite, survives reboot)
8. Sender loop picks up ready emails → Gmail OAuth sends
9. CC always: dino@solcex.cc + ogie.solcexexchange@gmail.com
10. Dynamic crons created: 48h follow-up + 7d break-up (both maxRuns:1)
11. Event emitted: 'outreach.sent'

## Limits
- Max 10 outreach emails per day (spam prevention)
- Template-only for auto sends — no LLM-generated bodies
- 3-source contact verification before sending
- NEVER mention listing fees ($5K) in automated emails
- NEVER send without CC to Ogie — non-negotiable

## Tables
- outreach_queue: email send queue with status tracking
- outreach_contacts: discovered contacts per token

## Danger Zones
- Gmail OAuth refresh token is permanent but check for 401 errors
- Don't send to personal emails (only team@, info@, contact@, hello@)
- Rate limit: 500 Gmail sends/day (10/day self-imposed limit)
- Duplicate check: never send two emails to same address for same token
