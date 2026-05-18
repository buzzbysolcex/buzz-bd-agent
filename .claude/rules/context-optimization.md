---
description: Context hygiene, subagent delegation, and thinking depth optimization
globs: ["**/*"]
---

# Context Optimization Rule (v9.2 — Apr 5, 2026)

## Subagent Mandate

When exploring the codebase (scanning >5 files, tracing implementations,
researching across tables, investigating patterns), ALWAYS use subagents.
Main context receives summary only. This preserves War Room context for
actual work.

Subagent triggers:

- "investigate how X works" → subagent
- "find all endpoints for Y" → subagent
- "check what tables are involved in Z" → subagent
- "scan the codebase for W" → subagent
- "read this one file and update it" → direct (no subagent)

## Thinking Depth

ULTRATHINK for:

- BD Screening Phase 2+ (Security Deep Dive)
- MiroFish simulation analysis and interpretation
- Architecture decisions (new modules, schema changes, new tables)
- Hackathon submissions (Frontier, Kite AI, any competition)
- Scoring rule changes or additions to v2_8rules
- Smart contract modifications or deployments
- Any decision that affects production data or on-chain state
- AIBTC signal synthesis (daily filing)
- Outreach template changes

DEFAULT thinking for:

- Status reports and health checks
- Simple CRUD operations and pipeline queries
- War Room acknowledgments
- Standard tweet drafts
- Log reads and cron monitoring
- Feature flag toggles

## Compact Preservation

When compacting context (/compact), ALWAYS preserve:

- Current feature flag states (all flags)
- Active hackathon deadlines (Frontier May 11, Kite AI May 6)
- AIBTC streak day count and next filing time
- List of all files modified in current session
- Pending War Room tasks from Ogie
- Trust gate level and outreach queue state
- Current deploy/CI run number
- Any schemas in active negotiation (Wallet Guard, etc.)

Suggested /compact syntax:
/compact Focus on [current task]. Preserve: flags, deadlines, streak, modified files, pending tasks.

## Session Naming

Name all sessions descriptively for --from-pr and --resume:

- feature-[name] for new features
- bugfix-[name] for fixes
- hackathon-[target] for competition work
- deploy-v[version] for deployments
- signal-[date] for AIBTC filing sessions

After creating ANY PR, verify session link is preserved.
