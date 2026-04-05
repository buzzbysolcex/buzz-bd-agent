# BUZZ — SUPPLEMENTARY OPS PROMPT
## Shield Build + System Audit + Axios Narrative Integration
### April 5, 2026 | Post-Restart | After Tasks A-H

---

## CONTEXT

Tasks A-H from the restart prompt are executing. This supplementary prompt adds:
1. Full PULSE + autoDream system audit
2. Buzz Shield build kickoff (Phase 1)
3. Solana Agent Skills integration for Shield
4. Axios incident as real-world validation narrative for Buzz Shield

**The axios compromise is not just a security event — it's Buzz Shield's origin story.**
A North Korean state actor weaponized a supply chain dependency. Our CI/CD runners communicated with a C2 server. We survived because our dependency was pinned to 1.13.6 and our wallet keys weren't in GitHub secrets. But 637 AIBTC agents, millions of npm users, and 135+ endpoints worldwide weren't as lucky. That's exactly the problem Buzz Shield solves — intelligence BEFORE execution.

---

## TASK I: PULSE ENGINE AUDIT

```
PULSE ENGINE — FULL HEALTH AUDIT

Check and report:

1. PULSE tick status:
   curl -s localhost:3000/api/v1/pulse/status | jq .
   - Current tick count
   - Last tick timestamp
   - Tick interval (should be consistent)
   - Modules wired to PULSE

2. PULSE module health:
   - PULSE_ENGINE flag: TRUE? Verify: curl localhost:3000/api/v1/flags | jq '.PULSE_ENGINE'
   - PULSE_MOLTBOOK flag: TRUE? Verify: curl localhost:3000/api/v1/flags | jq '.PULSE_MOLTBOOK'
   - PULSE tick → triggers what? List all downstream actions per tick
   - Service catalog wired? Verify PULSE reads service-registry
   - Moltbook PULSE state table: SELECT COUNT(*) FROM moltbook_pulse_state
   - Moltbook engagement log: SELECT COUNT(*) FROM moltbook_engagement_log
   - Last Moltbook engagement timestamp

3. PULSE persistence check (reboot survival):
   - Does PULSE auto-start on container boot?
   - Does tick count survive restart? (check against last known: ~1096+)
   - Does PULSE_MOLTBOOK state survive restart?
   - Are credentials loaded from /data/workspace/.config/buzz/moltbook.json?

4. PULSE → Shield wiring readiness:
   - PULSE has modular tick hooks?
   - Can Shield health check plug into PULSE every 100 ticks?
   - Can Shield pattern database updates run via PULSE?

Report ALL findings to War Room. Flag any anomalies.
```

---

## TASK J: AUTODREAM AUDIT

```
AUTODREAM — FULL HEALTH AUDIT

Check and report:

1. autoDream status:
   curl -s localhost:3000/api/v1/autodream/status | jq .
   - AUTODREAM flag: TRUE? Verify: curl localhost:3000/api/v1/flags | jq '.AUTODREAM'
   - Last run timestamp (should be 02:00 UTC daily)
   - Last run results (records cleaned, duration)
   - Next scheduled run

2. autoDream run history:
   SELECT * FROM observation_log WHERE source = 'autodream' ORDER BY created_at DESC LIMIT 5
   - How many nightly runs have completed successfully?
   - Any failures?
   - Average records cleaned per run

3. autoDream pipeline:
   Phase 1: Clean stale pipeline tokens? (expected)
   Phase 2: Consolidate scoring data? (expected)
   Phase 3: Update intelligence source health? (expected)
   Phase 4: Archive old signals? (expected)
   Phase 5: Generate daily insights? (expected)
   Phase 6: Moltbook nightly insight consolidation? (expected — from PULSE_MOLTBOOK)
   - Which phases are active?
   - Which phases have actually run?
   - Any phases failing silently?

4. autoDream persistence check:
   - Does autoDream schedule survive container restart?
   - Is cron/dynamic-cron set for 02:00 UTC?
   - CPU-load-aware? (should skip VACUUM if CPU > 100%)
   - Report last 3 run timestamps to verify daily consistency

5. autoDream → Shield integration readiness:
   - Can autoDream update drain pattern database nightly?
   - Can autoDream consolidate Shield scan results?
   - Can autoDream generate Shield daily report?

Report ALL findings to War Room. Flag any anomalies.
```

---

## TASK K: BUZZ SHIELD — PHASE 1 KICKOFF

```
BUZZ SHIELD — Phase 1 Build (Week 1: April 5-12)

Read the full build plan:
cat /home/claude-code/buzz-workspace/BUZZ-SHIELD-FULL-BUILD-PLAN.md

If file not found, report to War Room and I will SCP it.

PHASE 1 SCOPE (Foundation — this week):

1. DATABASE: Create 5 new tables
   - shield_scans
   - drain_patterns
   - program_risk_cache
   - shield_reports
   - shield_stats
   SQL schemas are in Part 3 of the build plan.
   Total tables after: current + 5

2. FEATURE FLAGS: Add 10 new flags (all FALSE initially)
   - BUZZ_SHIELD (master kill switch)
   - SHIELD_FREE_TIER
   - SHIELD_PAID_TIER
   - SHIELD_PROGRAM_SCORER
   - SHIELD_INSTRUCTION_SCANNER
   - SHIELD_DRAIN_PATTERNS
   - SHIELD_AGENT_CONTEXT
   - SHIELD_DEPLOYER_FORENSICS
   - SHIELD_VERDICT_ENGINE
   - SHIELD_PULSE_HOOK

3. MODULE STRUCTURE:
   mkdir -p api/services/shield
   Create CLAUDE.md for the module
   Create shield-service.js (skeleton)
   Create shield-routes.js (skeleton endpoints)

4. FREE ENDPOINTS (implement first):
   GET /shield/health/:walletAddress
   GET /shield/program/:programId
   GET /shield/patterns
   GET /shield/stats

5. DRAIN PATTERN SEED DATA:
   Seed drain_patterns table with initial 20 patterns from Part 6 of build plan:
   - owner_reassign_combo (critical)
   - set_authority_hijack (critical)
   - bulk_transfer_drain (critical)
   - durable_nonce_trap (high)
   - program_upgrade_bait (high)
   - token_approval_drain (high)
   - close_account_sweep (high)
   ... (all 20 from the plan)

6. ADR: Create ADR-024 (Buzz Shield) — use Part 14 of build plan as base
   NOTE: ADR-023 was already created for the axios incident.
   Update ADR number accordingly — check docs/decisions/ for next available number.

7. WIRING:
   - Register Shield as Service #23 (or next) in service catalog
   - Add BUZZ_SHIELD to PULSE health check (every 100 ticks)
   - Add Shield pattern update to autoDream Phase 7

RULES:
- All flags start FALSE — we flip one at a time
- Do NOT deploy to Bankr x402 yet (Phase 2)
- Do NOT build paid endpoints yet (Phase 2)
- Do NOT interact with Wallet Guard yet (Phase 3)
- Commit incrementally — one feature per commit
- CI/CD must stay GREEN

Draft implementation plan to War Room before writing code. Ogie approves, then build.
```

---

## TASK L: AXIOS NARRATIVE INTEGRATION

```
AXIOS AS BUZZ SHIELD ORIGIN STORY

The axios supply chain compromise (GHSA-fw8c-xr5c-95f9) is not just a security incident for us — it's the perfect real-world proof that Buzz Shield is needed.

NARRATIVE ELEMENTS TO WEAVE INTO:

1. AIBTC SIGNALS (security beat):
   Draft a signal: "North Korean Supply Chain Attack Validates Agent Security Intelligence Need — From Incident Response to Buzz Shield"
   Angle: We lived through it. We rotated 8+ credentials. We hardened CI/CD. Now we're building the intelligence layer so other agents don't have to learn the hard way.

2. MOLTBOOK POST (m/agents — Wednesday architecture day):
   Draft a post: "Buzz Shield: Born from an npm Supply Chain Attack"
   Angle: Chef builds agent, agent gets hit by nation-state supply chain attack, chef builds shield. The story writes itself.

3. FRONTIER SUBMISSION NARRATIVE:
   The axios incident gives Buzz Shield a real origin story for judges:
   "On March 31, a North Korean state actor compromised the most popular JavaScript HTTP client.
   Our CI/CD runners communicated with their C2 server.
   We survived — our dependency was pinned, our keys were segmented.
   But 135+ endpoints worldwide weren't as lucky.
   That's when we built Buzz Shield.
   Not because we read about the problem.
   Because we lived it."

4. SOLANA AGENT SKILL (buzz-shield):
   When Shield Phase 1 is complete, publish as second Solana Agent Skill
   Reference axios incident in the SKILL.md as real-world motivation
   Include drain pattern library as immediate value

5. TWITTER THREAD (draft for approval):
   "A North Korean state actor hit our CI/CD on March 31.
   GitHub confirmed our runners talked to their C2 server.
   We rotated everything. Hardened everything.
   Then we built the thing that would have caught it.
   Buzz Shield. Intelligence before execution.
   buzzbd.ai/shield | @BuzzBySolCex
   #AgentSecurity #BuzzShield #Frontier"

Draft ALL content to War Room. Do NOT auto-post anything.
```

---

## TASK M: SOLANA AGENT SKILLS STATUS

```
SOLANA AGENT SKILLS — STATUS CHECK

1. Verify buzz-token-intelligence-skill:
   - Files exist at /home/claude-code/buzz-token-intelligence-skill/?
   - /.well-known/skills/ endpoint responding?
     curl -s localhost:3000/.well-known/skills/ | jq .
   - Service #22 in catalog?
   - SOLANA_AGENT_SKILL flag: TRUE?
   - Backed up to /data/backups/?

2. Buzz Shield skill (buzz-shield-skill):
   - NOT YET BUILT — blocked until Shield Phase 1 complete
   - When ready, create repo structure:
     buzz-shield-skill/
     ├── skill/
     │   ├── SKILL.md
     │   └── references/
     │       ├── drain-patterns.md
     │       ├── program-scoring.md
     │       └── integration-guide.md
     ├── README.md
     ├── install.sh
     └── LICENSE
   - Register as Service #24 (or next)
   - Submit as second community skill to Solana Foundation

3. Check if Solana Foundation has responded to first submission
   - PR to awesome-solana-ai: status?
   - PR to solana.com/skills: status?

Report status to War Room.
```

---

## EXECUTION ORDER

After Tasks A-H from the restart prompt are complete:

```
I → PULSE audit (quick, read-only)
J → autoDream audit (quick, read-only)
K → Shield Phase 1 kickoff (plan first, then build)
L → Axios narrative content (draft all to War Room)
M → Solana Agent Skills status check
```

Tasks I and J are audits — no changes, just reporting.
Task K is the big build — gets its own approval gate.
Tasks L and M are content/status — War Room drafts.

**Do NOT start Task K (Shield build) until Tasks I and J audits are clean.** If PULSE or autoDream have issues, fix those first — Shield depends on both.

---

**The axios attack gave us scars and a story. Buzz Shield turns both into product. Bismillah 🤲**
