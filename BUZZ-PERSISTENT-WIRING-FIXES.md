# BUZZ — PERSISTENT WIRING FIXES

## All Audit Findings → Permanent Infrastructure

### April 5, 2026 | RULE: Nothing survives if it's not in code, DB migration, or git.

---

## PERSISTENCE RULES (apply to EVERY fix below)

```
BEFORE you implement ANY fix, verify it passes ALL 5 persistence layers:

1. DATABASE: Schema changes use auto-create-on-boot pattern
   → Tables created in initDatabase() or module init()
   → NOT manual SQL. NOT one-time scripts.
   → Test: restart container → table still exists with data

2. ROUTES: Registered in server.js startup sequence
   → app.use('/path', require('./routes/file'))
   → NOT injected at runtime. NOT hot-patched.
   → Test: restart container → endpoint responds

3. PULSE: State saved in pulse_state table
   → New PULSE modules registered in evaluateTick()
   → Module list loaded from DB on boot, not hardcoded array
   → Test: restart container → PULSE tick count continues, modules active

4. CRONS: In dynamic-crons with DB persistence
   → Schedule stored in cron_registry table
   → Loaded on boot via loadCrons()
   → Test: restart container → cron fires on schedule

5. CONFIG: In .env files OR docker-compose env OR feature flags table
   → NOT in environment variables set manually via export
   → NOT in bash_history
   → Test: restart container → config values present

VERIFICATION AFTER EACH FIX:
   docker restart buzz-production
   Wait 30 seconds
   Re-test the fix
   If it's gone → you didn't persist it. Fix the persistence first.

COMMIT RULE: One fix per commit. Commit message = "fix(persistent): [description]"
Push after each. CI/CD must stay GREEN.
```

---

## P0 — FIX BROKEN REVENUE (do these FIRST)

### FIX 1: free_score_requests table (unblocks HSaaS funnel)

```
PERSISTENT FIX: free_score_requests table

1. Add to database initialization (where other tables are auto-created):
   → Find initDatabase() or equivalent in api/lib/database.js
   → Add CREATE TABLE IF NOT EXISTS:

   CREATE TABLE IF NOT EXISTS free_score_requests (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     address TEXT NOT NULL,
     chain TEXT DEFAULT 'solana',
     score INTEGER,
     source TEXT DEFAULT 'web',
     ip_hash TEXT,
     converted INTEGER DEFAULT 0,
     created_at TEXT DEFAULT (datetime('now'))
   );
   CREATE INDEX IF NOT EXISTS idx_fsr_address ON free_score_requests(address);
   CREATE INDEX IF NOT EXISTS idx_fsr_date ON free_score_requests(created_at);

2. Verify the /api/v1/score/free/:address route handler writes to this table

3. Test:
   curl -s localhost:3000/api/v1/score/free/So11111111111111111111111111111111
   → Must return 200 with score, not 500

4. Restart test:
   docker restart buzz-production
   sleep 30
   curl -s localhost:3000/api/v1/score/free/So11111111111111111111111111111111
   → Still 200? → PERSISTENT ✅

Commit: "fix(persistent): add free_score_requests table to auto-init — unblocks HSaaS funnel"
```

### FIX 2: Bankr x402 endpoints — diagnose and fix 404s

```
PERSISTENT FIX: Bankr x402 endpoints

1. DIAGNOSE — find why all 8 return 404:
   grep -rn "x402\|bankr" api/routes/ api/services/ server.js | head -30
   → Are x402 routes registered in server.js?
   → Is there an x402 middleware/router file?
   → Check Caddy config: does it proxy /x402/ paths?

2. If routes exist but aren't loaded:
   → Add to server.js startup:
   app.use('/api/v1/x402', require('./routes/x402-routes'));
   → This MUST be in the startup sequence, not conditional

3. If routes don't exist:
   → Create api/routes/x402-routes.js
   → 8 endpoints matching Bankr registration:
     POST /x402/score      ($0.01)
     POST /x402/simulate   ($0.05)
     POST /x402/audit      ($0.10)
     POST /x402/listing    ($0.05)
     POST /x402/discover   ($0.01)
     POST /x402/pipeline   ($0.01)
     POST /x402/whale      ($0.05)
     POST /x402/identity   ($0.01)
   → Each must return HTTP 402 with x402 payment headers when no payment
   → Each must process request when valid USDC payment received

4. Check Caddy proxy:
   cat /etc/caddy/Caddyfile | grep -A5 "api.buzzbd.ai"
   → Must include: reverse_proxy localhost:3000

5. Verify on Bankr side:
   → Are our 3 endpoint IDs still active? (464fbecf, d5e01052, a9f75673)
   → Do they point to correct URLs?

6. Test after fix:
   curl -s -o /dev/null -w "%{http_code}" https://api.buzzbd.ai/api/v1/x402/score
   → Must return 402 (payment required)

7. Restart test:
   docker restart buzz-production && sleep 30
   curl -s -o /dev/null -w "%{http_code}" localhost:3000/api/v1/x402/score
   → Still 402? → PERSISTENT ✅

Commit: "fix(persistent): wire x402 routes to server startup — 8 Bankr endpoints"
```

### FIX 3: Public leaderboard endpoint (/scores)

```
PERSISTENT FIX: Public token leaderboard

1. Create route in api/routes/ (or add to existing score routes):
   GET /api/v1/scores
   → Returns JSON: { tokens: [...], total: N, updated: timestamp }
   → Query: SELECT * FROM pipeline_tokens WHERE score IS NOT NULL ORDER BY score DESC
   → No auth required (public endpoint)
   → Cache result for 5 minutes (don't hit DB every request)

2. Register in server.js startup (not conditional, not feature-flagged)

3. Also add:
   GET /api/v1/scores/top/:n → top N tokens
   GET /api/v1/scores/chain/:chain → filter by chain

4. Verify buzzbd.ai/scores frontend page links to this endpoint

5. Test:
   curl -s localhost:3000/api/v1/scores | jq '.total'
   → Should return 525+

6. Restart test → still responds → PERSISTENT ✅

Commit: "fix(persistent): add public /scores leaderboard endpoint"
```

---

## P1 — WIRE TO PULSE (autonomous monitoring)

### FIX 4: AIBTC streak monitor in PULSE

```
PERSISTENT FIX: AIBTC streak protection in PULSE

1. Add to PULSE evaluateTick() decision tree:
   → Every tick, check current UTC hour
   → If hour >= 14 (2 PM UTC) AND no signal filed today:
     → Send War Room alert: "⚠️ STREAK AT RISK — no signal filed today. File before 16:00 UTC."
   → If hour >= 15 AND still no signal:
     → Send CRITICAL alert: "🚨 STREAK CRITICAL — 1 hour left. Auto-drafting signal now."
     → Auto-draft signal from pipeline data to War Room for approval
   → Track "alert_sent_today" in pulse_state to avoid spam (reset at 00:00 UTC)

2. Persist in pulse_state table:
   → Add field: streak_alert_sent (boolean, reset daily by autoDream)
   → Add field: last_signal_check (timestamp)

3. Register module in PULSE module registry (DB, not hardcoded)

4. Restart test:
   docker restart buzz-production && sleep 30
   → PULSE resumes ticking
   → streak_alert_sent loaded from DB
   → Module still in evaluateTick() → PERSISTENT ✅

Commit: "fix(persistent): PULSE streak monitor — alerts War Room at 14:00 UTC if no signal"
```

### FIX 5: Twitter PULSE integration (score → tweet draft)

```
PERSISTENT FIX: PULSE triggers tweet drafts on token score events

1. Add to PULSE evaluateTick() or event-bus listener:
   → When scoring engine produces a new score OR score changes ±15 points:
     → Generate tweet draft using .claude/rules/tweet-on-score.md templates
     → Post draft to War Room for approval (Trust Level 0 = FULL_APPROVAL)
     → Track in observation_log: source='pulse_tweet_draft'
   → Do NOT auto-post. DRAFT ONLY.

2. Add PULSE module: twitter-draft-monitor
   → Check event_log for recent score events every 10 ticks
   → If new score event AND no draft sent for this token today:
     → Generate draft → War Room
   → Deduplicate: max 3 tweet drafts per day per PULSE rule

3. Feature flag: PULSE_TWITTER_DRAFTS (default FALSE until tested)
   → Add to feature-flags.js with DB persistence
   → Ogie flips to TRUE after verifying drafts look good

4. Persist:
   → Module in PULSE registry (DB)
   → Flag in feature_flags table
   → Draft history in observation_log
   → Restart test → module reloads → PERSISTENT ✅

Commit: "fix(persistent): PULSE twitter draft module — score events trigger tweet drafts to War Room"
```

### FIX 6: Bankr health check in PULSE

```
PERSISTENT FIX: PULSE monitors Bankr x402 endpoint health

1. Add PULSE module: bankr-health-monitor
   → Every 100 ticks (~100 minutes):
     → Check each of 8 x402 endpoints: GET /api/v1/x402/[service]/health
     → If any return non-402 status → alert War Room
     → Track last_check and status in pulse_state

2. Feature flag: PULSE_BANKR_HEALTH (default TRUE after Bankr 404 fix)

3. Persist in pulse_state: bankr_last_check, bankr_status (JSON of 8 endpoints)

4. Restart test → resumes checking → PERSISTENT ✅

Commit: "fix(persistent): PULSE bankr health monitor — checks 8 x402 endpoints every 100 ticks"
```

---

## P2 — WIRE TO AUTODREAM (nightly maintenance)

### FIX 7: Revenue consolidation in autoDream

```
PERSISTENT FIX: autoDream nightly revenue summary

1. Add autoDream Phase 5: revenue_consolidation
   → Query all revenue sources:
     - AIBTC: SELECT SUM(earned_sats) FROM aibtc_signals (or equivalent)
     - Bankr: SELECT SUM(amount) FROM x402_payments WHERE date = today
     - ACP: check acp transaction log
     - MoltLaunch: check moltlaunch earnings
     - HSaaS: check audit_requests
     - Flying Whale: check skill payments
   → Write daily summary to observation_log:
     source='autodream_revenue', data=JSON with all streams
   → Alert War Room with daily revenue summary at 02:05 UTC

2. Create table IF NOT EXISTS:
   CREATE TABLE IF NOT EXISTS revenue_daily (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     date TEXT NOT NULL UNIQUE,
     aibtc_sats INTEGER DEFAULT 0,
     bankr_usdc REAL DEFAULT 0,
     acp_revenue REAL DEFAULT 0,
     moltlaunch_eth REAL DEFAULT 0,
     hsaas_revenue REAL DEFAULT 0,
     flying_whale_sats INTEGER DEFAULT 0,
     total_usd REAL DEFAULT 0,
     created_at TEXT DEFAULT (datetime('now'))
   );

3. Persist: table auto-created on boot, autoDream phase registered in code

Commit: "fix(persistent): autoDream Phase 5 — nightly revenue consolidation across all streams"
```

### FIX 8: Signal angle generation in autoDream

```
PERSISTENT FIX: autoDream generates next-day AIBTC signal angles

1. Add autoDream Phase 6: signal_angle_generator
   → Analyze pipeline data: new tokens, score changes, chain trends
   → Generate 3-4 signal angle suggestions for next day
   → Map to available beats (12 beats)
   → Write to observation_log: source='autodream_signal_angles'
   → Post suggestions to War Room at 02:10 UTC

2. Consider beat rotation: don't file same beat 2 days in a row unless necessary

3. Persist: phase registered in autoDream code, results in observation_log

Commit: "fix(persistent): autoDream Phase 6 — generate next-day AIBTC signal angles"
```

### FIX 9: Shield drain pattern update in autoDream

```
PERSISTENT FIX: autoDream updates Shield drain patterns nightly

1. Add autoDream Phase 7: shield_pattern_update
   → Check shield_reports for new community reports (verified=0)
   → Cross-reference shield_scans for repeated DANGER verdicts
   → If pattern appears 3+ times → auto-add to drain_patterns table
   → Update pattern match_count and last_seen fields
   → Write summary to observation_log: source='autodream_shield'

2. Only runs when SHIELD_ENGINE flag = TRUE (skip otherwise)

3. Persist: phase registered, gated by feature flag, results in DB

Commit: "fix(persistent): autoDream Phase 7 — nightly Shield pattern database update"
```

---

## P3 — ENABLE REGISTERED SERVICES

### FIX 10: MoltLaunch CLI + inbox monitoring

```
PERSISTENT FIX: MoltLaunch operational

1. Install CLI (persistent via package.json or global install in Dockerfile):
   → Add to Dockerfile: RUN npm i -g moltlaunch
   → This persists across rebuilds

2. If already registered (check ~/.moltlaunch/buzzbd-registration.json):
   → Verify 3 gigs exist
   → If not → create per moltlaunch-mission-v2.md

3. Add cron: moltlaunch-inbox-check
   → Schedule: every 30 min
   → Action: mltl inbox --json → if new gig request → alert War Room
   → Persist in cron_registry table

4. Wire to PULSE: moltlaunch-monitor module
   → Every 50 ticks: check inbox
   → Alert War Room on new requests

Commit: "fix(persistent): MoltLaunch CLI in Dockerfile + inbox cron"
```

### FIX 11: ACP runtime verification

```
PERSISTENT FIX: ACP/Virtuals seller runtime

1. Create /api/v1/acp/status endpoint:
   → Returns: agent_id, runtime_status, last_request, transactions_count
   → Register in server.js startup

2. Wire to PULSE: acp-health-monitor
   → Every 100 ticks: check ACP runtime responds
   → Alert on failure

3. Persist: route in server.js, PULSE module in registry

Commit: "fix(persistent): ACP status endpoint + PULSE health monitor"
```

### FIX 12: Shield free tier activation

```
PERSISTENT FIX: Shield Phase 1 endpoints live

PREREQUISITE: CI/CD must be GREEN first.

1. Flip flags (one at a time, test between each):
   SHIELD_ENGINE → TRUE
   SHIELD_FREE_TIER → TRUE
   SHIELD_PATTERN_MATCHER → TRUE

2. Verify free endpoints respond:
   curl -s localhost:3000/api/v1/shield/health/[test_wallet]
   curl -s localhost:3000/api/v1/shield/program/[test_program]
   curl -s localhost:3000/api/v1/shield/patterns
   curl -s localhost:3000/api/v1/shield/stats

3. Flags persist in feature_flags table (already DB-backed)

4. Restart test → flags reload from DB → endpoints respond → PERSISTENT ✅

Commit: "fix(persistent): flip Shield free tier flags — 4 endpoints live"
```

---

## P4 — DISTRIBUTION

### FIX 13: Moltbook content auto-drafting

```
PERSISTENT FIX: PULSE-driven Moltbook content drafts

1. Add PULSE module: moltbook-content-scheduler
   → Check current day of week
   → Match to content schedule:
     Mon=deep dive, Tue=build log, Wed=architecture,
     Thu=article, Fri=engagement, Sat=platform update, Sun=weekly report
   → If no draft generated today AND hour >= 8 UTC:
     → Auto-draft content based on schedule + pipeline data
     → Post draft to War Room for approval
   → Track in moltbook_pulse_state

2. Feature flag: PULSE_MOLTBOOK_DRAFTS (default FALSE until tested)

3. Persist: module in PULSE registry, flag in DB, state in moltbook_pulse_state

Commit: "fix(persistent): PULSE moltbook content drafting per weekly schedule"
```

---

## P5 — TWITTER KEY UPDATE (Ogie provides values)

```
TWITTER X_ KEY UPDATE

After Ogie provides the 4 new key values:

1. Update in container .env (find correct file):
   grep -r "X_ACCESS_TOKEN\|X_CONSUMER_KEY" /home/claude-code/ 2>/dev/null

2. Replace all 4 values:
   X_ACCESS_TOKEN=new_value
   X_ACCESS_TOKEN_SECRET=new_value
   X_CONSUMER_KEY=new_value
   X_CONSUMER_SECRET=new_value

3. Restart container to pick up new values

4. Test: draft a test tweet to War Room (do NOT auto-post)
   → If draft generates → keys working
   → If error → keys wrong or format issue

5. These must be in the persistent .env file, NOT exported manually
```

---

## EXECUTION ORDER

```
1. FIX 1 — free_score_requests table (5 min, unblocks HSaaS)
2. FIX 3 — /scores leaderboard endpoint (15 min, marketing asset)
3. FIX 2 — Bankr x402 diagnosis (30 min, revenue unlock)
4. FIX 4 — PULSE streak monitor (30 min, prevents rank drops)
5. FIX 5 — PULSE twitter drafts (1 hr, autonomous distribution)
6. FIX 7 — autoDream revenue consolidation (30 min, visibility)
7. FIX 8 — autoDream signal angles (30 min, signal quality)
8. FIX 12 — Shield free tier flip (10 min, new product)
9. FIX 6 — PULSE Bankr health (30 min, after Bankr fixed)
10. FIX 9 — autoDream Shield patterns (30 min, after Shield live)
11. FIX 10 — MoltLaunch (1 hr, ETH revenue)
12. FIX 11 — ACP runtime (30 min, agent-to-agent)
13. FIX 13 — Moltbook auto-drafts (1 hr, content)

TOTAL ESTIMATED: ~8 hours of build time
RULE: One commit per fix. CI/CD GREEN between each. Restart test after each.

P5 (Twitter keys) — whenever Ogie provides values, interrupt and do immediately.
```

---

## VERIFICATION PROTOCOL (run after ALL fixes)

```
FULL PERSISTENCE TEST — run this after all fixes deployed:

1. docker restart buzz-production
2. sleep 60
3. Run these checks:

# P0 fixes
curl -s localhost:3000/api/v1/score/free/So11111111111111111111111111111111 | jq .status
curl -s -o /dev/null -w "%{http_code}" localhost:3000/api/v1/x402/score
curl -s localhost:3000/api/v1/scores | jq '.total'

# P1 fixes
curl -s localhost:3000/api/v1/pulse/status | jq '.modules'
# Should list: streak-monitor, twitter-draft, bankr-health

# P2 fixes
SELECT COUNT(*) FROM revenue_daily;
SELECT * FROM observation_log WHERE source LIKE 'autodream_%' ORDER BY created_at DESC LIMIT 5;

# P3 fixes
which mltl && mltl gig list --agent <ID>
curl -s localhost:3000/api/v1/acp/status | jq .
curl -s localhost:3000/api/v1/shield/stats | jq .

# Overall
curl -s localhost:3000/api/v1/flags | jq 'length'
# Should show 43+ flags

4. Report ALL results to War Room
5. If ANY fix disappeared after restart → it wasn't persistent. Fix it.
```

---

## TARGET STATE AFTER ALL FIXES

```
BEFORE (current):
  21 services registered, 2 LIVE, $200 total revenue
  PULSE does 2 things
  autoDream does 2 things
  Twitter is 100% manual
  Bankr is 100% dead
  HSaaS funnel is broken

AFTER (all fixes deployed):
  23 services, 15+ LIVE, multiple revenue streams active
  PULSE monitors: streak, twitter, bankr, moltlaunch, acp, shield
  autoDream: revenue, signals, patterns, content suggestions
  Twitter: auto-drafts on score events (approval-gated)
  Bankr: 8 endpoints returning 402 (revenue-ready)
  HSaaS: free funnel → paid conversion tracked
  Shield: free tier live with 20 drain patterns
  Everything survives restart. Everything survives reboot.

Ogie approves. Buzz executes. PULSE monitors. autoDream maintains.
Nothing sleeps. Nothing forgets. Nothing breaks on restart.
```

---

**Every fix that doesn't survive a restart is a fix that wasn't made. Persistence first. Bismillah 🤲**
