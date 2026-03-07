---
name: solcex-ops-master
description: >
  System Operations Manual for Akash container services at SolCex Exchange.
  v7.1.0 — Indonesia Sprint Day 15 Edition (Mar 7, 2026).
  OpenClaw 2026.3.2 | 5 Parallel Sub-Agents | Strategic Orchestrator LIVE
  Decision Engine 12 rules | Playbook Engine PB-001→004 | Context Engine + Supermemory
  Cost Guard $10/day MiniMax cap | Context Slim 96% token reduction | Cache Pin
  Notification Filter (18 send / 11 silent) | 18 Crons (trimmed from 38)
  Twitter Bot v3.1 Sales Funnel | MiniMax M2.5 primary + bankr/gpt-5-nano sub-agents
  Bankr LLM Gateway (8 models, dual API keys) | 18 cron jobs | 19 intel sources
  REST API v3.0.0 (72/72 endpoints) LIVE | Sentinel v1.0.2 LIVE + wired
  JVR receipt system | ACP #17681 | AgentProof #1718 | BSC/BNB Chain MCP
  Gmail OAuth outreach active | Contract Auditor (L2) | 3-chain pipeline (SOL/BASE/BSC)
  Supermemory semantic memory LIVE (container: buzz_bd_agent)
  Reporting rule: every completed task reports to Telegram via JVR receipts.
---

# SYSTEM OPERATIONS MANUAL v7.1.0 — Indonesia Sprint Day 15

> **Technical reference documentation** for all services running in this Akash stack.
> Updated Mar 7, 2026 from Jakarta, Indonesia.
> v7.1.0 = Strategic Orchestrator + Supermemory + Cost Guard + Notification Filter

---

## 1. TEAM CONTACTS

| Role | Identity | Responsibility |
|------|----------|----------------|
| **Ogie** | Operations Lead, Inflight Chef (Saudia) + BD Lead (SolCex) | Strategy, approvals, manual Twitter, partnerships |
| **Claude Opus 4.6** | Strategy/ops advisor + dev partner | Documentation, analysis, planning, code, outreach drafts |
| **Buzz** | Autonomous BD Agent | 24/7 scanning, scoring, strategic decisions, pipeline management |
| **Sentinel** | Ops Watchdog Agent | 24/7 monitoring of Buzz REST API, alerts on failures |

---

## 2. INFRASTRUCTURE

| Agent | Version | Provider | External URL | Cost |
|-------|---------|----------|-------------|------|
| **Buzz BD Agent** | v7.1.0 | provider.akash-palmito.org | :30299 (API) :30233 (OpenClaw) | ~$5.27/mo |
| **Sentinel Ops** | v1.0.2 | provider.akashprovid.com | :31949 (API) :31336 (OpenClaw) | ~$1.51/mo |
| **Total** | | | | **~$7/mo** |

### Buzz v7.1.0 Infrastructure

| Component | Value |
|-----------|-------|
| Image | ghcr.io/buzzbysolcex/buzz-bd-agent:v7.1.0 |
| Runtime | OpenClaw v2026.3.2 |
| CPU/RAM | 2 cores / 4 GB |
| Storage | 2 GB root + 10 GB persistent (/data/) |
| Port 18789 → 30233 | OpenClaw gateway (Telegram) |
| Port 3000 → 30299 | REST API v3.0.0 (Express + SQLite WAL) |
| Database | 20 tables (13 core + 5 strategic + 2 system) |
| REST Endpoints | 72 (64 base + 8 strategy) |
| Crons | 18 essential |
| Skills | 20 loaded |

---

## 3. STRATEGIC ORCHESTRATOR (v7.1.0 — NEW)

### 3.1 Decision Engine — 12 Rules

| ID | Name | Condition | Action | Auto? |
|----|------|-----------|--------|-------|
| R001 | HOT_IMMEDIATE_OUTREACH | Score 85-100, safety PASS | Trigger PB-002 immediately | Yes |
| R002 | QUALIFIED_PRIORITY_QUEUE | Score 70-84, safety PASS | Queue outreach 24h | Yes |
| R003 | QUALIFIED_SAFETY_WARNING | Score 70-84, safety WARN | Re-scan + escalate | No → Ogie |
| R004 | WATCH_MONITOR | Score 50-69 | Watch 48h, rescan | Yes |
| R005 | SKIP_LOW_SCORE | Score 0-49 | Archive | Yes |
| R006 | SKIP_SAFETY_FAIL | Safety FAIL any score | Immediate skip | Yes |
| R007 | FOLLOWUP_NO_REPLY_48H | Contacted 48h, no reply | Follow-up email | Yes |
| R008 | BREAKUP_NO_REPLY_96H | Contacted 96h, no reply | Breakup email | Yes |
| R009 | COLD_NO_REPLY_144H | Contacted 144h, no reply | Archive cold, revisit 30d | Yes |
| R010 | PRICE_DROP_PAUSE | Price -40% 24h | Pause outreach, rescan | Yes → Alert |
| R011 | NEGOTIATION_REPLY | Reply received | Escalate + PB-003 | No → Ogie |
| R012 | LISTING_APPROVAL | Terms agreed | Escalate for approval | No → Ogie |

### 3.2 Playbook Engine — 4 State Machines

| Playbook | Name | States | Chains To |
|----------|------|--------|-----------|
| PB-001 | Discovery → Qualification | DISCOVERED → DEDUP → SCANNING → SCORED → PROSPECT/WATCH/SKIP | PB-002 |
| PB-002 | Outreach Sequence | PROSPECT → CONTACT_SEARCH → CONTACTED → FOLLOW_UP → BREAKUP → COLD/NEGOTIATING | PB-003 |
| PB-003 | Negotiation Support | NEGOTIATING → REPLY_ANALYSIS → POSITIVE/QUESTIONS/PUSHBACK/NEGATIVE → DEAL_SHEET → APPROVED | PB-004 |
| PB-004 | Post-Listing Lifecycle | LISTED → ANNOUNCEMENT → MONITORING → UPSELL/WARNING/STABLE | — |

### 3.3 Context Engine + Supermemory

Assembles max 8K tokens per LLM call (was 50K+):
1. Decision rules (relevant to current stage)
2. Scoring rubric (condensed)
3. Token pipeline history
4. Similar recent tokens
5. **Supermemory semantic recall (50ms, zero LLM cost)**
6. Outreach capacity (active/10)
7. Sub-agent outputs
8. Listing package (outreach stages only)

### 3.4 Supermemory Configuration

| Setting | Value |
|---------|-------|
| Container | buzz_bd_agent |
| Auto-Recall | true (5 results per query) |
| Auto-Capture | true (with security filter) |
| Profile Frequency | Every 25 turns |
| Capture Mode | all (filters noise) |
| Security | 12 regex patterns block: commission, fees, API keys, wallet keys |
| Plan | Free tier (1M tokens/mo, 10K queries/mo) |

---

## 4. COST GUARD

| Setting | Value |
|---------|-------|
| Daily MiniMax cap | $10.00 |
| Alert threshold | 70% ($7.00) |
| Throttle model | bankr/gpt-5-nano |
| Fallback model | bankr/claude-haiku-4.5 |
| Tracker file | /data/workspace/memory/cost-tracker.json |
| Cache pin | System prompt warmed on boot |
| Reset | UTC midnight |

### Cost Reduction Stack

| Optimization | Before | After | Savings |
|-------------|--------|-------|---------|
| Crons | 38 | 18 | 50% fewer orchestrator calls |
| Input tokens per scan | ~250K | ~9K | 96% reduction |
| Decision Engine | LLM every time | Rules match (no LLM) | 90% fewer LLM calls |
| Cache efficiency | 42% reuse | 80%+ reuse | 12.5x cheaper reads |
| **Daily MiniMax cost** | **$13.49** | **~$3-5 (cap $10)** | **60-75% reduction** |

---

## 5. NOTIFICATION FILTER

### SEND to Telegram (18 rules)
- Token scored 70+ (QUALIFIED or HOT)
- Pipeline stage change
- Outreach sent / reply received / follow-up due
- ACP service purchased
- Cost Guard cap triggered
- Sentinel HIGH alert
- Prayer reminders
- Sprint daily briefing + evening review

### SILENT — JVR Only (11 rules)
- Routine scans below 70
- Health checks, heartbeats
- Cron completion confirmations
- Moltbook/Molten routine posts
- Pipeline checks with no changes

### Dedup: Same notification not sent twice within 60 minutes

---

## 6. SUB-AGENT ARCHITECTURE

| Agent | Layer | Sources | Model | Context |
|-------|-------|---------|-------|---------|
| scanner-agent | L1 Discovery | DexScreener, GeckoTerminal, AIXBT, Boosts, CMC, BNB MCP | bankr/gpt-5-nano | ~2K tokens |
| safety-agent | L2 Filter | RugCheck, DFlow MCP, Contract Auditor (BSC) | bankr/gpt-5-nano | ~1.5K tokens |
| wallet-agent | L2 Filter | Helius, Allium | bankr/gpt-5-nano | ~1K tokens |
| social-agent | L3 Research | Grok, Serper, ATV, Firecrawl | bankr/gpt-5-nano | ~1.5K tokens |
| scorer-agent | L4 Score | 100-point composite (11 factors) | bankr/gpt-5-nano | ~3K tokens |

Context slim files at: /data/workspace/skills/agent-contexts/*.md

---

## 7. CRON SCHEDULE (18 Active)

### Scanning (8 jobs)
| Job | Schedule | Description |
|-----|----------|-------------|
| scan-trending-00 | 0 0 * * * | Trending tokens (midnight WIB) |
| scan-trending-06 | 0 6 * * * | Trending tokens (6am WIB) |
| scan-trending-12 | 0 12 * * * | Trending tokens (noon WIB) |
| scan-trending-18 | 0 18 * * * | Trending tokens (6pm WIB) |
| scan-new-pairs | 0 */4 * * * | New token pairs |
| scan-solana-dex | 30 */4 * * * | Solana DEX scan |
| scan-base-dex | 30 */6 * * * | Base DEX scan |
| scan-bsc-dex | 0 */6 * * * | BSC DEX scan |

### Operations (5 jobs)
| Job | Schedule | Description |
|-----|----------|-------------|
| pipeline-status | 0 1 * * * | Daily pipeline report |
| pipeline-weekly | 0 12 * * 0 | Weekly summary |
| daily-pipeline | 0 */2 * * * | Pipeline check |
| morning-reminder | 0 5 * * * | Daily briefing |
| evening-review | 0 18 * * * | End of day review |

### Prayer (5 jobs)
| Prayer | WIB | UTC Cron |
|--------|-----|----------|
| Fajr | 04:30 | 30 21 * * * |
| Dhuhr | 11:45 | 45 4 * * * |
| Asr | 15:00 | 0 8 * * * |
| Maghrib | 17:45 | 45 10 * * * |
| Isha | 19:00 | 0 12 * * * |

---

## 8. REST API v3.0.0 — 72 Endpoints

Base URL: http://provider.akash-palmito.org:30299/api/v1
Auth: X-API-Key: bzz_0S4j71ZWSqTgd_m8JyydXp1uqwmhN6GADi_9MEJmAg0

| Category | Count |
|----------|-------|
| Health & System | 6 |
| Agents | 5 |
| Pipeline | 9 |
| Costs | 5 |
| Crons | 7 |
| Score Token | 1 |
| Scoring | 5 |
| Intel | 5 |
| Twitter | 5 |
| Wallets | 6 |
| Webhooks | 5 |
| Receipts | 5 |
| **Strategy (NEW)** | **8** |
| **Total** | **72** |

### Strategy Endpoints (NEW)
- POST /strategy/decide — Submit sub-agent outputs, get decision
- GET /strategy/playbook/:id — Playbook instance state
- POST /strategy/playbook/:id/advance — Advance playbook
- GET /strategy/context/:token — Assembled context preview
- GET /strategy/rules — List 12 decision rules
- PUT /strategy/rules — Update rules
- GET /strategy/history — Decision history with reasoning
- GET /strategy/analytics — Decision quality metrics

---

## 9. REVENUE STACK

| Channel | Rate | Status |
|---------|------|--------|
| Listing Commission | $1,000/listing | ✅ Active |
| Bankr Partner Fees | 18.05% of 1.2% swap | ✅ Active |
| Creator Fees | 75.05% of 1.2% (own tokens) | ✅ Active |
| ACP Marketplace | Per-query USDC (4 services) | ✅ Active |
| BaaS (planned) | Subscription | 🔵 Month 3-6 |

Monthly ops cost: ~$7/mo (Buzz $5.27 + Sentinel $1.51) + ~$3-5/day MiniMax (capped $10)
Monthly Target: $2,575/mo

---

## 10. SCORING ENGINE (100-Point, 11 Factors)

### Verdicts
| Score | Verdict | Decision Engine Action |
|-------|---------|----------------------|
| 85-100 | HOT | R001: Immediate outreach via PB-002 |
| 70-84 | QUALIFIED | R002: Queue outreach 24h |
| 50-69 | WATCH | R004: Monitor 48h, auto-rescan |
| 0-49 | SKIP | R005: Archive, no action |

---

## 11. SENTINEL OPS AGENT

| Field | Value |
|-------|-------|
| Version | v1.0.2 |
| Provider | provider.akashprovid.com |
| Buzz target | http://provider.akash-palmito.org:30299 |
| Crons | 10 health checks |
| Alert tiers | Silent (all pass) / MEDIUM (something broke) / HIGH (Buzz down) |
| JVR prefix | SNT- |

---

## 12. DEPLOYMENT WORKFLOW

```bash
cd ~/buzz-bd-agent
rm -rf api/node_modules api/package-lock.json
docker build --no-cache -t ghcr.io/buzzbysolcex/buzz-bd-agent:TAG .
docker push ghcr.io/buzzbysolcex/buzz-bd-agent:TAG
# Akash Console → Update Deployment (same env) or Close + New (new env vars)
```

Rules: Always increment tag. Always --no-cache. Always delete node_modules before build.
New ENV vars require Close + New Deployment (Update won't apply new ENV).

---

## 13. VERSION HISTORY

| Version | Date | Highlights |
|---------|------|------------|
| **v7.1.0** | **Mar 7, 2026** | **Strategic Orchestrator + Supermemory + Cost Guard + Context Slim + Notification Filter + Cron cleanup 38→18. 72 endpoints, 20 tables. Full autonomous BD pipeline.** |
| v6.3.6 | Mar 7, 2026 | Pipeline auto-persist fix, health/db bug fix |
| v6.3.5 | Mar 5, 2026 | REST API 64/64 LIVE, Gmail OAuth, Sentinel wired |
| v6.3.0 | Mar 4, 2026 | Solid foundation, 40 crons, Twitter Bot v3.1 |
| v6.0.19 | Mar 2, 2026 | 5 parallel sub-agents LIVE, orchestrator |
| v6.0.17 | Mar 1, 2026 | Bankr LLM Gateway, self-sustaining inference |

---

*"Identity first. Intelligence deep. Commerce autonomous. Cost disciplined. Strategy embedded. Memory persistent."*

*Updated: Mar 7, 2026 | Jakarta, Indonesia | Sprint Day 15*
