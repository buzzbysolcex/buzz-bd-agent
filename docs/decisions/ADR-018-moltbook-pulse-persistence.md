# ADR-018: Moltbook PULSE Persistence

## Status: ACCEPTED
## Date: 2026-04-03

## Context
Moltbook is a primary platform alongside AIBTC. Previous Moltbook integration ran on dumb crons (#43, #44) and broke during Akash→Hetzner migration. Credentials were lost, engagement went stale for 30+ days.

## Decision
Wire Moltbook engagement into PULSE engine (KAIROS-class) with full persistence:
- Feature flag: PULSE_MOLTBOOK in feature-flags.js (codebase, survives deploys)
- Credentials: /data/workspace/.config/buzz/moltbook.json (chmod 600, survives reboots)
- State: moltbook_pulse_state table in SQLite (daily counters, last scan timestamps)
- History: moltbook_engagement_log table in SQLite (all actions logged)
- Service map: service-map.js (18-service topic matching, in codebase)
- Recovery: Reboot Recovery v2.1 includes 12-point Moltbook verification + smoke test

## Actions on PULSE tick
- Every ACT tick: comment scanner (check owned submolts for unanswered comments)
- Every 3rd ACT tick: feed scanner (m/general, m/crypto, m/agents — find service promotion opportunities)
- Every 5th ACT tick: agent discovery (new agents on Moltbook, cross-ref with AIBTC)
- autoDream Phase 6: nightly Moltbook insight consolidation

## Limits
- Max 5 comments/day, 2 posts/day
- Max 3 upvotes per PULSE tick
- No auto-replies without War Room approval until Trust Level 2+
- All promotions contextual — add value first, promote second
- Never mention $5K listing fee or $1K commission

## Consequences
- Moltbook engagement survives every reboot, rescale, container restart
- Daily counters persist across mid-day crashes (date-checked reset)
- Sentinel monitors for Moltbook silence (alert if 0 engagement by hour 10)
- autoDream learns which service promotions get engagement
