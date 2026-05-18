# BUZZ — FULL SYSTEM WIRING AUDIT

## All 21 Services × PULSE × autoDream × Autonomous Operations

### April 5, 2026 | Priority: HIGH

### "Every service that isn't wired to PULSE is a service that sleeps when Buzz is awake."

---

## CONTEXT

Buzz has 21 registered services across 4 marketplaces (AIBTC, Bankr, ACP, MoltLaunch). But registration ≠ wired. We need to verify:

1. Which services are LIVE vs REGISTERED-ONLY?
2. Which services are wired to PULSE (autonomous heartbeat)?
3. Which services are wired to autoDream (nightly maintenance)?
4. Which services can operate autonomously vs require manual trigger?
5. Is Twitter autonomous via PULSE or still manual?

**The goal: every revenue-generating service should tick on PULSE and maintain itself via autoDream. Zero manual babysitting.**

---

## AUDIT 1: SERVICE CATALOG — FULL STATUS MAP

```
FULL SERVICE CATALOG AUDIT

Pull the complete service catalog:
curl -s localhost:3000/api/v1/services | jq .

For EACH of the 21 services, report this matrix:

SERVICE STATUS MATRIX:
| # | Service | Marketplace | Registered? | Endpoint Live? | PULSE Wired? | autoDream Wired? | Revenue? | Status |
|---|---------|-------------|-------------|----------------|--------------|------------------|----------|--------|

Fill in for ALL 21 services. Use these checks per service:

1. Registered? → Is it in the service-registry / catalog?
2. Endpoint Live? → Does the API endpoint respond? (curl test)
3. PULSE Wired? → Does PULSE tick trigger any action for this service?
4. autoDream Wired? → Does nightly dream maintain/clean data for this service?
5. Revenue? → Has this service earned anything? (sats, USDC, ETH)
6. Status: LIVE / REGISTERED-ONLY / BROKEN / PLANNED

Also check:
curl -s localhost:3000/api/v1/services/health | jq .
curl -s localhost:3000/api/v1/pulse/modules | jq .
```

---

## AUDIT 2: MARKETPLACE-BY-MARKETPLACE DEEP CHECK

### 2A: BANKR x402 CLOUD (8 services)

```
BANKR x402 AUDIT — All 8 services

Verify each endpoint returns HTTP 402 (payment required):

1. Token Score API
   curl -s -o /dev/null -w "%{http_code}" https://api.buzzbd.ai/x402/score

2. MiroFish Simulation (1K agents)
   curl -s -o /dev/null -w "%{http_code}" https://api.buzzbd.ai/x402/simulate

3. Security Audit
   curl -s -o /dev/null -w "%{http_code}" https://api.buzzbd.ai/x402/audit

4. Listing Readiness
   curl -s -o /dev/null -w "%{http_code}" https://api.buzzbd.ai/x402/listing

5. Token Discovery (ARIA)
   curl -s -o /dev/null -w "%{http_code}" https://api.buzzbd.ai/x402/discover

6. Pipeline Intelligence
   curl -s -o /dev/null -w "%{http_code}" https://api.buzzbd.ai/x402/pipeline

7. Whale Signal
   curl -s -o /dev/null -w "%{http_code}" https://api.buzzbd.ai/x402/whale

8. Identity Verification (ATV)
   curl -s -o /dev/null -w "%{http_code}" https://api.buzzbd.ai/x402/identity

For each: report HTTP status code + whether payment flow works.

BANKR PULSE INTEGRATION:
- Does PULSE monitor Bankr endpoint health?
- Does PULSE track x402 payment events?
- Does autoDream consolidate Bankr revenue data nightly?
- Are Bankr endpoints in the PULSE health check rotation?

BANKR CREDENTIALS:
- BANKR_API_KEY in .env? Working?
- BANKR_LLM_KEY in .env? Working?
- Partner key (buzz-by-solcex) active?
- 402index.io registration current? (3 endpoints: 464fbecf, d5e01052, a9f75673)
```

### 2B: AIBTC MARKETPLACE (signals + skills)

```
AIBTC AUDIT — Signal + Skill services

1. SIGNAL FILING:
   - MCP server version: npx @aibtc/mcp-server --version
   - Wallet unlocked? Can file signals?
   - Beats claimed: list all 12
   - Streak status: current day count
   - Total signals filed
   - Revenue earned (sats)

2. IONIC NOVA SKILLS:
   - Skill #110 (ionic-nova-token-scorer): LIVE?
   - Flying Whale 70/30 split: receiving payments?
   - 600 sats/query: verified?

3. AIBTC PULSE INTEGRATION:
   - Does PULSE trigger signal drafting?
   - Does PULSE monitor streak status?
   - Does PULSE alert if streak is at risk (no signal by 16:00 UTC)?
   - Does autoDream archive old signals nightly?
   - Does autoDream generate signal angle suggestions?

4. AIBTC NETWORK SCOUT:
   - Is scout automated via PULSE or manual?
   - Does PULSE trigger welcome messages?
   - Does autoDream consolidate network stats nightly?
```

### 2C: ACP / VIRTUALS PROTOCOL

```
ACP AUDIT — Agent Commerce Protocol

1. ACP REGISTRATION:
   - Agent #17681 on Virtuals Protocol: LIVE?
   - Seller runtime: responding?
   curl -s localhost:3000/api/v1/acp/status | jq .

2. ACP SERVICES:
   - Which services are registered on ACP?
   - Are they discoverable by other agents?
   - Any agent-to-agent transactions completed?

3. ACP PULSE INTEGRATION:
   - Does PULSE monitor ACP seller runtime?
   - Does PULSE process incoming ACP requests?
   - Does autoDream clean ACP transaction history?

4. ACP REVENUE:
   - Any revenue from ACP?
   - Creator fee split (75.05%): verified?
```

### 2D: MOLTLAUNCH

```
MOLTLAUNCH AUDIT — Agent Work Marketplace

1. REGISTRATION:
   which mltl 2>/dev/null || npm list -g moltlaunch 2>/dev/null
   cat ~/.moltlaunch/buzzbd-registration.json 2>/dev/null
   - Is BuzzBD registered? Agent ID?
   - Wallet address?
   - Profile visible at moltlaunch.com/agents?

2. GIGS:
   mltl gig list --agent <AGENT_ID> 2>/dev/null
   - 3 gigs created?
     a. Token Screening Report (0.005 ETH / 2h)
     b. Weekly Listing Intelligence Brief (0.02 ETH / 24h)
     c. Full BD Readiness Assessment (0.04 ETH / 48h)

3. INBOX + EARNINGS:
   mltl inbox --json 2>/dev/null
   mltl earnings --json 2>/dev/null
   - Any gig requests received?
   - Any ETH earned?

4. MOLTLAUNCH PULSE INTEGRATION:
   - Does PULSE check MoltLaunch inbox for new gig requests?
   - Does PULSE auto-notify War Room when a gig request arrives?
   - Does autoDream consolidate MoltLaunch earnings nightly?

5. IF NOT REGISTERED: Report to War Room. Mission MOLT-1 v2 needs execution.
   Build plan is at /home/claude-code/buzz-workspace/BUZZ-RESTART-MASTER-PROMPT-APR5.md
   or reference the moltlaunch-mission-v2.md file if available.
```

### 2E: MOLTBOOK

```
MOLTBOOK AUDIT — Social Engagement Platform

1. PULSE_MOLTBOOK:
   curl -s localhost:3000/api/v1/flags | jq '.PULSE_MOLTBOOK'
   - Flag TRUE?
   - Engagement windows: 4 daily (0 5,11,17,23 * * *)?
   - Last engagement timestamp?

2. MOLTBOOK STATE:
   SELECT COUNT(*) FROM moltbook_pulse_state;
   SELECT COUNT(*) FROM moltbook_engagement_log;
   - State table rows?
   - Engagement log entries?

3. CONTENT SCHEDULE:
   - Mon=deep dive m/crypto
   - Tue=build log m/builds
   - Wed=architecture m/agents
   - Thu=article m/crypto
   - Fri=engagement m/general
   - Sat=platform update m/builds
   - Sun=weekly report m/crypto
   Does PULSE know the schedule? Does it auto-draft per schedule?

4. MOLTBOOK CREDENTIALS:
   ls -la /data/workspace/.config/buzz/moltbook.json 2>/dev/null
   - Agent ID: c606278b?
   - API key present?
   - Owned submolts: m/listing-strategy, m/crypto-history?

5. autoDream MOLTBOOK:
   - Phase 6 (Moltbook insight consolidation): running?
   - Does autoDream generate next-day content suggestions?
```

---

## AUDIT 3: TWITTER / @BuzzBySolCex AUTONOMOUS OPS

```
TWITTER AUTONOMOUS AUDIT — Critical

1. TWITTER BOT STATUS:
   curl -s localhost:3000/api/v1/twitter/status | jq .
   - Bot connected?
   - OAuth keys working? (X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET, X_CONSUMER_KEY, X_CONSUMER_SECRET)
   - NOTE: These 4 keys were JUST ROTATED in GitHub secrets.
   - Are the NEW keys in the server .env?
   - Test: can Buzz post? (draft test tweet to War Room, don't auto-post)

2. TWEET-ON-SCORE RULE:
   cat .claude/rules/tweet-on-score.md | head -5
   - v2.0 deployed? (1000-agent language, 3-tier pricing)
   - Is this rule triggered by PULSE when a token is scored?
   - Or is it manual only?

3. TWITTER PULSE INTEGRATION — THE BIG QUESTION:
   - Does PULSE trigger tweet drafts when tokens are scored?
   - Does PULSE trigger engagement tweets per weekly schedule?
   - Does PULSE monitor @BuzzBySolCex mentions for scan requests?
   - Does PULSE track "Tag me to scan" CTA responses?
   - Does PULSE route scan requests to scoring engine automatically?

4. TWITTER autoDream INTEGRATION:
   - Does autoDream generate next-day tweet suggestions?
   - Does autoDream consolidate engagement metrics?
   - Does autoDream identify top-performing tweet formats?

5. TWITTER ENGAGEMENT ROUTES (v3.1):
   curl -s localhost:3000/api/v1/twitter/routes | jq .
   - SCAN route: working?
   - LIST route: working?
   - DEPLOY route: working?
   - ENGAGEMENT route: working?

6. CURRENT AUTONOMY LEVEL:
   - Can Buzz draft tweets autonomously? YES/NO
   - Can Buzz post tweets autonomously? YES/NO (should be NO — War Room approval)
   - Can Buzz respond to mentions autonomously? YES/NO
   - Can Buzz scan tokens from mention requests? YES/NO
   - What is the current Trust Level for Twitter? (should be 0 = FULL_APPROVAL)

Report what is autonomous, what is manual, what is broken.
```

---

## AUDIT 4: HSaaS GO-TO-MARKET STATUS

```
HSaaS INFRASTRUCTURE AUDIT

1. FREE SCORE FUNNEL:
   curl -s localhost:3000/api/v1/score/free/So11111111111111111111111111111111 | jq .
   - /score/free/:address exists?
   - Returns score without auth?
   - Linked from buzzbd.ai/score?

2. PUBLIC LEADERBOARD:
   curl -s localhost:3000/api/v1/scores | jq '.totalTokens'
   - /scores endpoint returning token list?
   - How many tokens visible?
   - Linked from buzzbd.ai/scores?

3. BUZZBD.AI LANDING PAGE v9.2:
   curl -s https://buzzbd.ai | grep -ci "resolution\|1000-agent\|swarm\|Quick Scan\|Full Analysis"
   - Shows 3-tier pricing?
   - Shows "1000-agent swarm"?
   - Shows "resolution" language?
   - Links to /score and /scores?
   - Shows "11 tokens caught" narrative?

4. AUDIT REQUEST ENDPOINT:
   curl -s localhost:3000/api/v1/audit/request 2>/dev/null
   - Exists? Or still planned?

5. HSaaS FILES (v2.0):
   grep "1000-agent" .claude/skills/hsaas-go-to-market.md && echo "v2.0 OK" || echo "STALE"
   grep "resolution" .claude/rules/tweet-on-score.md && echo "v2.0 OK" || echo "STALE"
   grep "Session 2" docs/references/juno-hsaas-strategy-session.md && echo "v2.0 OK" || echo "STALE"
   grep "v2.0" docs/decisions/009-hsaas-go-to-market.md && echo "v2.0 OK" || echo "STALE"

6. PRICING ALIGNMENT (must be consistent everywhere):
   x402 Cloud: $0.01 score / $0.05 sim / $0.10 audit
   HSaaS tiers: Quick Scan $500 / Full Analysis $1,500 / Swarm $2,500
   buzzbd.ai: should show BOTH (micropayment + enterprise)
   Any mismatches?

7. FREE_SCORE_REQUESTS TABLE:
   SELECT COUNT(*) FROM free_score_requests 2>/dev/null || echo "TABLE MISSING"
   - Lead tracking working?
```

---

## AUDIT 5: PULSE + autoDream COVERAGE MAP

```
PULSE/AUTODREAM UNIVERSAL COVERAGE AUDIT

This is the master check. For EVERY system, report:

PULSE COVERAGE:
| System | PULSE Monitors? | PULSE Triggers Actions? | Autonomous? |
|--------|----------------|------------------------|-------------|
| Bankr x402 (8 endpoints) | ? | ? | ? |
| AIBTC Signals | ? | ? | ? |
| AIBTC Network Scout | ? | ? | ? |
| AIBTC Skills (Flying Whale) | ? | ? | ? |
| ACP / Virtuals | ? | ? | ? |
| MoltLaunch | ? | ? | ? |
| Moltbook | ? | ? | ? |
| Twitter @BuzzBySolCex | ? | ? | ? |
| HeyAnon MCP | ? | ? | ? |
| Phantom MCP | ? | ? | ? |
| buzzbd.ai website | ? | ? | ? |
| Scoring Engine | ? | ? | ? |
| MiroFish Simulation | ? | ? | ? |
| Shield (Phase 1) | ? | ? | ? |
| Wallet Guard (Aldo) | ? | ? | ? |
| ATV.eth Identity | ? | ? | ? |
| Nansen MCP | ? | ? | ? |
| Sentinel Bot | ? | ? | ? |
| CI/CD Pipeline | ? | ? | ? |
| War Room Telegram | ? | ? | ? |
| autoDream itself | ? | ? | ? |

autoDream COVERAGE:
| System | Nightly Cleanup? | Data Consolidation? | Insight Generation? |
|--------|-----------------|--------------------|--------------------|
| (same systems as above) | ? | ? | ? |

TARGET STATE:
- Every revenue service should be PULSE-monitored
- Every data-producing service should be autoDream-maintained
- Every engagement service should be PULSE-triggered
- War Room gets alerts when any service goes unhealthy

GAP ANALYSIS:
After filling the matrix, list:
1. Services with NO PULSE coverage (blind spots)
2. Services with NO autoDream coverage (data rot risk)
3. Services that SHOULD be autonomous but are manual
4. Quick wins: services easy to wire to PULSE/autoDream

Report the full matrix + gap analysis to War Room.
```

---

## AUDIT 6: REVENUE PIPELINE STATUS

```
REVENUE AUDIT — All streams

1. AIBTC Signals: $____ earned (sats)
2. AIBTC Skills (Flying Whale 70/30): $____ earned
3. Bankr x402: $____ earned (USDC)
4. ACP / Virtuals: $____ earned
5. MoltLaunch: $____ earned (ETH)
6. HSaaS Audits: $____ earned
7. Free Score Funnel → Paid conversion: ___%
8. Total revenue to date: $____
9. Monthly run rate: $____/mo

Which revenue streams are:
- ACTIVE (earning now)?
- ENABLED (can earn, no customers yet)?
- BROKEN (should earn but something's wrong)?
- PLANNED (not built yet)?
```

---

## EXECUTION ORDER

```
Audit 1 (Service Catalog) → gives the overview
Audit 5 (PULSE/autoDream Coverage) → reveals blind spots
Audit 2A (Bankr) → highest revenue potential
Audit 2B (AIBTC) → current revenue stream
Audit 3 (Twitter) → distribution engine
Audit 4 (HSaaS) → go-to-market readiness
Audit 2C (ACP) → agent-to-agent
Audit 2D (MoltLaunch) → ETH revenue
Audit 2E (Moltbook) → social engagement
Audit 6 (Revenue) → bottom line
```

Report each audit separately to War Room. Flag any BROKEN or MISSING items.

After all audits: produce a WIRING PRIORITY LIST — which integrations to build first for maximum autonomous operation.

---

## THE VISION

```
FULLY WIRED BUZZ (target state):

PULSE ticks every 60s:
  → Checks all 21 service endpoints
  → Drafts tweets when tokens are scored
  → Monitors AIBTC streak (alerts if at risk)
  → Checks MoltLaunch inbox for gig requests
  → Checks Moltbook for engagement opportunities
  → Monitors Bankr x402 payment events
  → Processes ACP incoming requests
  → Routes Twitter scan requests to scoring engine
  → Alerts War Room on any service degradation

autoDream runs at 02:00 UTC:
  → Cleans stale pipeline data
  → Consolidates revenue across all streams
  → Archives old signals and engagement logs
  → Updates drain pattern database (Shield)
  → Generates next-day content suggestions (Moltbook schedule)
  → Generates next-day signal angles (AIBTC beats)
  → Produces daily dashboard summary
  → Identifies top-performing tweet formats
  → Flags services that had zero activity (dead services)

Result: Buzz operates 24/7 with minimal human input.
Ogie approves. Buzz executes. PULSE monitors. autoDream maintains.
```

**Every unwired service is a service that forgets to work. Wire everything. Bismillah 🤲**
