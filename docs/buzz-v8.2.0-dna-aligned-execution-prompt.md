# 🐝 BUZZ v8.2.0 — CLAWTEAM PATTERN INTEGRATION

# ALIGNED WITH DNA v2.0 (bcca37c, Mar 26, 2026)

# EXECUTION PROMPT FOR CLAUDE CODE ON HETZNER WAR ROOM

# Sprint Day 38 | Mar 26, 2026

---

## ⚠️ CONTEXT: DNA v2.0 IS THE FOUNDATION

This upgrade builds ON TOP of DNA v2.0. Do NOT overwrite any DNA v2.0 files.
DNA v2.0 commit: bcca37c "feat: Buzz DNA v2.0" (19 files, 2,514 insertions)

**DNA v2.0 already installed:**

- 12 persistent agents in `.claude/agents/` (signal-writer, signal-reviewer, signal-editor, pipeline-scanner, pipeline-scorer, pipeline-verifier, bd-proposer, bd-follower, moltbook-commenter, twitter-drafter, system-auditor, war-room-reporter)
- BUZZ-ZHC-HANDOVER-v2.md (the genome, replaces old Day 35 handover)
- AIBTC-SIGNAL-FACTORY.md (revenue engine) + root copy
- AUTO-APPROVE-DIRECTIVE.md + root copy
- PLATFORM-DOMINANCE-DIRECTIVE.md
- MOLTBOOK-CONTENT-STRATEGY.md
- CLAUDE.md updated with new startup read order (8 files)
- Signal Factory pipeline starts 06:00 UTC

**What this upgrade adds:**
ClawTeam v0.2.0 patterns that give those 12 agents a FORMAL coordination layer — task chains, structured inbox, activity board, and templates. The 12 agents currently exist as spec files. This upgrade gives them infrastructure to COMMUNICATE and CHAIN.

**Read order for this prompt:**

1. Read BUZZ-ZHC-HANDOVER-v2.md first (the genome)
2. Read AIBTC-SIGNAL-FACTORY.md (to understand signal pipeline flow)
3. Then execute this prompt step by step

---

## MISSION

Add 4 ClawTeam architectural patterns as permanent infrastructure for the 12 DNA v2.0 agents.
Version bump: v8.1.0 → v8.2.0.
Zero external dependencies. Zero new npm packages. Zero added LLM cost.
CI/CD only. NEVER hot-patch. Sentinel GREEN = only truth.

**References (on server):**

- Genome: /home/claude-code/buzz-workspace/docs/BUZZ-ZHC-HANDOVER-v2.md
- Signal Factory: /home/claude-code/buzz-workspace/docs/AIBTC-SIGNAL-FACTORY.md
- Agents: /home/claude-code/buzz-workspace/.claude/agents/ (12 files)
- Identity: /home/claude-code/buzz-workspace/CLAUDE.md
- API: localhost:3000 | Honcho: :8000 | Sentinel: :3001
- DB: /data/buzz-api/buzz.db (SQLite WAL)
- GitHub: buzzbysolcex/buzz-bd-agent → Docker Hub → Hetzner → ah restart

**Before (v8.1.0 + DNA v2.0):**
Tables: 55 | Endpoints: ~135 | Crons: 28 | Agents: 12 persistent | Templates: 0 formal

**After (v8.2.0):**
Tables: 58 (+3) | Endpoints: ~144 (+9) | Crons: 28 | Agents: 12 persistent | Templates: 5 TOML
ZHC: 78% → 83% | LLM: $0/day | Server: $9.99/mo

---

## HOW THE 12 DNA v2.0 AGENTS MAP TO CLAWTEAM PATTERNS

```
DNA v2.0 AGENTS              →  CLAWTEAM INFRASTRUCTURE
─────────────────────────────────────────────────────────
SIGNAL PIPELINE (3 agents):
  signal-writer               →  Receives inbox type 'signal_data'
  signal-reviewer              →  Receives inbox type 'signal_review'
  signal-editor                →  Receives inbox type 'signal_edit'
  ALL THREE                    →  Chained via aibtc-signal.toml

TOKEN PIPELINE (3 agents):
  pipeline-scanner             →  Sends inbox 'discovery' messages
  pipeline-scorer              →  Sends inbox 'score_alert' messages
  pipeline-verifier            →  Sends inbox 'verified' messages
  ALL THREE                    →  Chained via bd-scan.toml (steps 1-3)

BD PIPELINE (2 agents):
  bd-proposer                  →  Receives chain output from bd-scan
  bd-follower                  →  Receives inbox 'outreach' messages
  BOTH                         →  Chained via bd-outreach.toml

PLATFORM (2 agents):
  moltbook-commenter           →  Activity board tracks 'moltbook_posted'
  twitter-drafter              →  Chained via twitter-campaign.toml

OPERATIONS (2 agents):
  system-auditor               →  Reads activity_log for monitoring
  war-room-reporter            →  Reads board/summary for reports
```

---

## STEP 1: CREATE 3 SQLITE TABLES (#56-58)

Run against /data/buzz-api/buzz.db:

```sql
CREATE TABLE IF NOT EXISTS task_chains (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chain_id TEXT NOT NULL,
  chain_name TEXT NOT NULL,
  task_name TEXT NOT NULL,
  task_order INTEGER NOT NULL,
  depends_on TEXT DEFAULT '[]',
  status TEXT DEFAULT 'pending',
  endpoint TEXT,
  condition TEXT,
  token_address TEXT,
  agent_name TEXT,
  started_at DATETIME,
  completed_at DATETIME,
  result TEXT,
  error TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  timeout_seconds INTEGER DEFAULT 60,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tc_chain ON task_chains(chain_id);
CREATE INDEX IF NOT EXISTS idx_tc_status ON task_chains(status);
CREATE INDEX IF NOT EXISTS idx_tc_token ON task_chains(token_address);
CREATE INDEX IF NOT EXISTS idx_tc_agent ON task_chains(agent_name);

CREATE TABLE IF NOT EXISTS agent_inbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_agent TEXT NOT NULL,
  to_agent TEXT NOT NULL,
  message_type TEXT NOT NULL,
  chain_id TEXT,
  token_address TEXT,
  token_name TEXT,
  subject TEXT,
  body TEXT NOT NULL,
  priority TEXT DEFAULT 'normal',
  status TEXT DEFAULT 'unread',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  read_at DATETIME,
  actioned_at DATETIME,
  actioned_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_ai_to ON agent_inbox(to_agent);
CREATE INDEX IF NOT EXISTS idx_ai_status ON agent_inbox(status);
CREATE INDEX IF NOT EXISTS idx_ai_type ON agent_inbox(message_type);
CREATE INDEX IF NOT EXISTS idx_ai_chain ON agent_inbox(chain_id);
CREATE INDEX IF NOT EXISTS idx_ai_created ON agent_inbox(created_at);

CREATE TABLE IF NOT EXISTS activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  agent TEXT NOT NULL,
  token_address TEXT,
  token_name TEXT,
  chain_id TEXT,
  details TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_al_type ON activity_log(event_type);
CREATE INDEX IF NOT EXISTS idx_al_created ON activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_al_token ON activity_log(token_address);
CREATE INDEX IF NOT EXISTS idx_al_agent ON activity_log(agent);
```

---

## STEP 2-4: CREATE 3 MODULES

Create these 3 files. Full source code in the companion spec document (buzz-clawteam-integration-spec-v8.2.0.docx). Key design:

### api/lib/activity-board.js

- `log(eventType, agent, tokenAddress, tokenName, chainId, details)` — INSERT event
- `getActivity({hours, agent, eventType, limit})` — query feed
- `getSummary(hours)` — dashboard stats (pipeline/signals/chains/social/system + recent 10 events)
- system-auditor and war-room-reporter agents consume this

### api/lib/agent-inbox.js

- `send(from, to, type, {subject, body, priority, chain_id, token_address})` — send message
- `getInbox(agent, {status, type, limit})` — sorted by priority then time
- `updateStatus(id, status, actionedBy)` — mark read/actioned
- `getStats()` — by_agent + by_type_24h
- Auto-forwards high priority + approval_request to Telegram War Room
- Valid agents = DNA v2.0's 12 agents + system agents (brain, sentinel, chain-executor, ogie, all)

### api/lib/task-chains.js

- `startChain(templateName, tokenAddress, tokenName)` — loads TOML, creates chain
- `getChainStatus(chainId)` — with dependency resolution + completion %
- `updateTask(chainId, taskName, status, result, error)` — auto-unblocks downstream
- `_unblockDownstream(chainId)` — checks all deps met, evaluates conditions
- `_evalCondition(condition, allTasks)` — parses "scorer.result.score >= 70"
- `listTemplates()` — reads team-templates/\*.toml
- Inline TOML parser (zero npm dependency)
- agent_name field maps to DNA v2.0 .claude/agents/ filenames

---

## STEP 5: CREATE 3 ROUTE FILES (9+ endpoints)

### api/routes/chains.js

```
POST /api/v1/chains/start                        — Start chain from template
GET  /api/v1/chains                              — List recent chains
GET  /api/v1/chains/:chain_id                    — Get chain status
PATCH /api/v1/chains/:chain_id/tasks/:task_name  — Update task status
```

### api/routes/inbox.js

```
POST  /api/v1/inbox/send      — Send agent message
GET   /api/v1/inbox           — Global inbox stats
GET   /api/v1/inbox/:agent    — Get agent inbox
PATCH /api/v1/inbox/:id       — Update message status
```

### api/routes/board.js

```
GET /api/v1/board/activity    — Activity feed (filterable)
GET /api/v1/board/summary     — Dashboard summary
GET /api/v1/board/templates   — List TOML templates
```

All routes use existing authMiddleware (X-API-Key).

---

## STEP 6: CREATE 5 TOML TEMPLATES in team-templates/

Each template maps tasks to DNA v2.0 agent_name:

### bd-scan.toml (Token Pipeline)

scan(pipeline-scanner) → safety(pipeline-verifier) → score(pipeline-scorer) → simulate(pipeline-scorer, condition: score>=70) → propose(bd-proposer, condition: decision=='PROCEED')

### bd-outreach.toml (BD Pipeline)

proposal_draft(bd-proposer) → tweet_draft(twitter-drafter) + dm_draft(bd-follower) → war_room_approval(ogie, requires_human=true)

### aibtc-signal.toml (Signal Factory)

detect(pipeline-scanner) → verify(pipeline-verifier) → write_signal(signal-writer, condition: score>=60) → review_signal(signal-reviewer) → edit_signal(signal-editor) → file_signal(signal-writer)

### twitter-campaign.toml (Platform)

research(twitter-drafter) → draft(twitter-drafter) → war_room_review(ogie, requires_human) → post(twitter-drafter) → self_reply(twitter-drafter)

### hackathon-sprint.toml (Operations)

research(system-auditor) → build(brain) → test(system-auditor) → document(war-room-reporter) → submit(ogie, requires_human)

---

## STEP 7: WIRE INTO MAIN APP

Add to main Express app file:

```javascript
// === v8.2.0: ClawTeam Patterns for DNA v2.0 ===
const ActivityBoard = require("./lib/activity-board");
const AgentInbox = require("./lib/agent-inbox");
const TaskChainExecutor = require("./lib/task-chains");

const activityBoard = new ActivityBoard(db);
const agentInbox = new AgentInbox(db, activityBoard, telegramNotify || null);
const taskChainExecutor = new TaskChainExecutor(db, activityBoard, agentInbox);
global.buzzModules = { activityBoard, agentInbox, taskChainExecutor };

app.use(
  "/api/v1/chains",
  authMiddleware,
  require("./routes/chains")(db, taskChainExecutor),
);
app.use(
  "/api/v1/inbox",
  authMiddleware,
  require("./routes/inbox")(db, agentInbox),
);
app.use(
  "/api/v1/board",
  authMiddleware,
  require("./routes/board")(db, activityBoard, taskChainExecutor),
);
```

---

## STEP 8: WIRE ACTIVITY LOGGING (INSERT-ONLY)

Add to existing handlers — do NOT modify existing logic:

```javascript
// Discovery: global.buzzModules?.activityBoard?.log('discovery', 'pipeline-scanner', addr, name, null, JSON.stringify({chain, source}));
// Scored: global.buzzModules?.activityBoard?.log('scored', 'pipeline-scorer', addr, name, null, JSON.stringify({score, tier}));
// Opus override: global.buzzModules?.activityBoard?.log('opus_override', 'brain', addr, name, null, JSON.stringify({old_score, new_score}));
// Verified: global.buzzModules?.activityBoard?.log('verified', 'pipeline-verifier', addr, name, null, JSON.stringify({status: 'VERIFIED'}));
// Simulation: global.buzzModules?.activityBoard?.log('sim_completed', 'pipeline-scorer', addr, name, null, JSON.stringify({decision, probability, ev}));
// Tweet: global.buzzModules?.activityBoard?.log('tweet_posted', 'twitter-drafter', null, null, null, JSON.stringify({tweet_id}));
// Signal: global.buzzModules?.activityBoard?.log('signal_filed', 'signal-writer', addr, name, null, JSON.stringify({signal_id}));
// Cron: global.buzzModules?.activityBoard?.log('cron_executed', 'system-auditor', null, null, null, JSON.stringify({cron_name, duration_ms}));
```

---

## STEP 9: NEW WAR ROOM COMMANDS

```
/chain <template> <address>  — Start task chain
/chains                      — List recent chains
/chainstatus <chain_id>      — Chain status
/inbox [agent]               — Inbox (default: brain)
/approve <id>                — Approve request
/reject <id>                 — Reject request
/board                       — 24h activity summary
/activity                    — Last 10 events
/templates                   — List templates
Shorthand: /ch /ib /bd /tpl
```

---

## STEP 10: DEPLOY

```bash
git add api/lib/task-chains.js api/lib/agent-inbox.js api/lib/activity-board.js
git add api/routes/chains.js api/routes/inbox.js api/routes/board.js
git add team-templates/*.toml
git commit -m "v8.2.0: ClawTeam patterns for DNA v2.0 — 12 agents chained

Tables: 55→58 | Endpoints: ~135→~144 | Templates: 5 TOML
Maps to DNA v2.0 12 persistent agents via agent_name
ZHC: 78%→83% | $0 added cost | CI/CD #88+"
git push origin main
```

---

## STEP 11: VERIFY

```bash
sqlite3 /data/buzz-api/buzz.db ".tables" | grep -E "task_chains|agent_inbox|activity_log"
curl -s -X POST localhost:3000/api/v1/chains/start -H "Content-Type: application/json" -H "X-API-Key: $BUZZ_API_ADMIN_KEY" -d '{"template":"bd-scan","token_address":"0xtest","token_name":"TEST"}' | jq .chain_id
curl -s -X POST localhost:3000/api/v1/inbox/send -H "Content-Type: application/json" -H "X-API-Key: $BUZZ_API_ADMIN_KEY" -d '{"from_agent":"pipeline-scanner","to_agent":"brain","message_type":"discovery","subject":"Test","body":"{}"}' | jq .id
curl -s localhost:3000/api/v1/board/summary -H "X-API-Key: $BUZZ_API_ADMIN_KEY" | jq .pipeline
curl -s localhost:3000/api/v1/board/templates -H "X-API-Key: $BUZZ_API_ADMIN_KEY" | jq '.templates[].name'
curl -s localhost:3001/health | jq .status
```

All 5 return 200 + Sentinel GREEN = v8.2.0 permanent.

---

## STEP 12: UPDATE DOCS

1. CLAUDE.md — Add startup read: "9. team-templates/ (chain definitions)"
2. BUZZ-ZHC-HANDOVER-v2.md — Add: "ClawTeam Patterns (v8.2.0): 3 tables, 5 templates, 9 endpoints"
3. HANDOVER.md — Tables 58, Endpoints ~144, ZHC 83%
4. GSD.md — "ClawTeam patterns permanent. Agent inbox = coordination layer."

---

## CRITICAL RULES

1. CI/CD ONLY — Never hot-patch
2. Sentinel GREEN = only truth
3. Zero npm packages — TOML parser inline, UUID via crypto.randomUUID()
4. Zero LLM cost — all rule-based
5. Auth on all endpoints — existing X-API-Key
6. INSERT-ONLY activity logging — never modify existing handlers
7. ADDITIVE tables only — never ALTER existing
8. DNA v2.0 files READ-ONLY — never overwrite genome/signal factory/agent specs
9. agent_name MUST match .claude/agents/ filenames
10. If anything fails → STOP → report to War Room

---

**v8.2.0 | DNA v2.0 + ClawTeam | 12 Agents Chained | $0/day | Bismillah** 🤲
