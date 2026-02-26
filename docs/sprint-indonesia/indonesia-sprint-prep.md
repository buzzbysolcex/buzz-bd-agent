# 🐝 BUZZ INDONESIA SPRINT — DEVELOPMENT PREP PACK
## Feb 25 → Mar 31, 2026 | Superpowers Methodology

---

## 1. SUPERPOWERS INSTALLATION (Claude Code)

### Install on your Mac before flying:
```bash
# In Claude Code terminal:
/plugin marketplace add obra/superpowers-marketplace
/plugin install superpowers@superpowers-marketplace

# Verify:
/help
# Should see: /superpowers:brainstorm, /superpowers:write-plan, /superpowers:execute-plan
```

### What Superpowers gives you:
- **Brainstorming** → Forces spec before coding (no more jumping in blind)
- **Writing Plans** → Breaks work into 2-5 min tasks with exact file paths
- **Executing Plans** → Subagent-driven development with two-stage review
- **TDD** → RED-GREEN-REFACTOR enforced (write test first, always)
- **Systematic Debugging** → 4-phase root cause process
- **Git Worktrees** → Parallel development branches

---

## 2. SPRINT BACKLOG — PRIORITIZED

### 🔴 P0 — CRITICAL (Week 1: Feb 25-Mar 2)

#### Task 1: Fix 8004scan Metadata
**Goal:** Push full v2.0.0 metadata with MCP service + description
**Method:** Direct contract call via ethers.js or BaseScan write contract
```
Status: Partial update done (x402 enabled, score 34→59.4)
Missing: v2.0.0 description, MCP service with tools, reputation trust
```
**Files:** Create `scripts/update-8004-metadata.js`
**Test:** Verify at 8004scan.io/agents/base/17483 → Metadata tab shows full JSON

#### Task 2: Fix MiniMax M2.5 Empty tool_call_id
**Goal:** Resolve empty tool_call_id parameter bug
**Method:** Add fallback ID generation in LLM cascade handler
```python
# In buzz-bd-agent/src/llm_cascade.py
if not tool_call.get('id') or tool_call['id'] == '':
    tool_call['id'] = f"tc_{uuid.uuid4().hex[:8]}"
```
**Test:** Run 10 consecutive token scans, verify 0 empty tool_call_id errors

#### Task 3: Buzz v5.3.8 Akash Stability
**Goal:** 72-hour uptime without crashes
**Method:** Monitor via Akash console, check all 36 cron jobs execute
**Test:** `curl` health endpoint every hour for 72h, verify 100% uptime

---

### 🟡 P1 — HIGH (Week 2: Mar 3-9)

#### Task 4: Vitto/ERC-8004 Article Collaboration
**Goal:** Publish co-authored article on ERC-8004 + agent BD
**Method:** Draft in Google Docs, coordinate via Telegram
**Deliverable:** Published article on Mirror/Medium/Paragraph

#### Task 5: Get elizaOS Registry PR #263 Merged
**Goal:** Official plugin in elizaOS registry
**Method:** Follow up in Discord #plugins-github, tag maintainers
**Deliverable:** PR merged, plugin discoverable via elizaOS CLI

#### Task 6: Agent-to-Agent Commerce Test
**Goal:** Buzz receives x402 payment from another agent for token scoring
**Method:** Create test harness with mock agent calling Buzz MCP endpoint
```
Agent A (test) → x402 payment → Buzz MCP → SCORE_TOKEN → result returned
```
**Test:** End-to-end payment + service delivery in < 30 seconds

---

### 🟢 P2 — MEDIUM (Week 3-4: Mar 10-24)

#### Task 7: Buzz v6.0 — Subagent Architecture
**Goal:** Buzz dispatches sub-agents for parallel intelligence gathering
**Inspiration:** Superpowers' subagent-driven-development pattern
```
Buzz Orchestrator
├── Scanner Agent (DexScreener, trending)
├── Scorer Agent (100-point evaluation)
├── Wallet Agent (Helius forensics)
├── Safety Agent (RugCheck, QuillShield, DFlow)
└── Social Agent (Grok, ATV, Serper)
```
**Method:** Use Superpowers brainstorm → plan → execute workflow
**Test:** 5 parallel token evaluations complete in < 60 seconds

#### Task 8: Jeju Early Access Integration
**Goal:** Connect Buzz to Jeju when it launches
**Method:** Monitor elizaOS Discord #jeju channel, implement SDK
**Deliverable:** Buzz discoverable in Jeju agent marketplace

#### Task 9: Enhanced Telegram Bot UX
**Goal:** Improve 20 Telegram commands with inline keyboards
**Method:** Add callback_query handlers, rich formatting
**Test:** All 20 commands respond with interactive UI elements

---

### 🔵 P3 — NICE TO HAVE (Mar 25-31)

#### Task 10: Bankr Marketplace Live Integration
**Goal:** Buzz available as paid skill on Bankr
**Method:** Connect Bankr API key, configure pricing
**Test:** External agent purchases Buzz skill via Bankr

#### Task 11: Multi-Chain Token Scanning Expansion
**Goal:** Add Arbitrum, Avalanche, Polygon scanning
**Method:** Extend DexScreener API calls to new chains
**Test:** Scan returns results from 6+ chains

#### Task 12: Dashboard / Analytics Page
**Goal:** Web dashboard showing Buzz performance metrics
**Method:** HTML + Chart.js, served from Akash
**Test:** Dashboard loads with real-time pipeline data

---

## 3. SUPERPOWERS WORKFLOW FOR EACH TASK

```
For every task above, follow this exact flow:

1. BRAINSTORM (5-10 min)
   → "Help me plan [task name]"
   → Agent asks questions, explores alternatives
   → Design doc saved to docs/plans/

2. WRITE PLAN (5-10 min)
   → Break into 2-5 min micro-tasks
   → Each task has: file paths, code snippets, test steps
   → Plan saved to docs/plans/YYYY-MM-DD-<feature>.md

3. EXECUTE PLAN (varies)
   → TDD: Write test → Watch fail → Write code → Watch pass → Commit
   → Subagent reviews each task (spec compliance + code quality)
   → Human checkpoint every 3-5 tasks

4. VERIFY (5 min)
   → All tests pass
   → Manual smoke test
   → Git commit + push

5. DEPLOY (10 min)
   → Docker build → GHCR push → Akash deploy
   → Verify health endpoint
```

---

## 4. DAILY SCHEDULE (Indonesia Time, GMT+7)

```
05:00  Fajr prayer + review yesterday's progress
05:30  Morning coding session (deep work, P0 tasks)
08:00  Breakfast with family
09:00  Second coding session (P1 tasks)
12:00  Dhuhr prayer
12:30  Lunch break
13:00  Third coding session (testing, debugging)
15:00  Asr prayer
15:30  Community engagement (Discord, Twitter, Telegram)
17:00  Family time
18:00  Maghrib prayer
18:30  Light coding / documentation
19:30  Isha prayer
20:00  Sprint review + plan tomorrow
21:00  Rest
```

---

## 5. DEVELOPMENT ENVIRONMENT SETUP

### Mac Laptop Checklist:
```bash
# 1. Clone Buzz repo
git clone https://github.com/buzzbysolcex/buzz-bd-agent.git
cd buzz-bd-agent

# 2. Install dependencies
npm install  # or pip install -r requirements.txt

# 3. Docker setup
docker build -t buzz-bd-agent:dev .
docker run --env-file .env buzz-bd-agent:dev

# 4. Install Claude Code + Superpowers
# (see Section 1 above)

# 5. Verify GHCR access
echo $GHCR_TOKEN | docker login ghcr.io -u buzzbysolcex --password-stdin

# 6. Verify Akash CLI
akash version
```

### Environment Variables (.env):
```
# LLM Cascade
MINIMAX_API_KEY=xxx
OPENROUTER_API_KEY=xxx

# Intelligence Sources
HELIUS_API_KEY=xxx
ALLIUM_API_KEY=xxx
GROK_API_KEY=xxx
ATV_API_KEY=xxx
SERPER_API_KEY=xxx
DEXSCREENER_API_KEY=xxx  # free, no key needed

# Integrations
BANKR_API_KEY=bk_TN6CD4EKW52D2PCK2N7K8A7ZN9VWHRFU
TELEGRAM_BOT_TOKEN=xxx

# Deployment
GHCR_TOKEN=xxx
AKASH_KEY_NAME=xxx
```

---

## 6. KEY LINKS & REFERENCES

| Resource | URL |
|----------|-----|
| Buzz GitHub | github.com/buzzbysolcex/buzz-bd-agent |
| Plugin GitHub | github.com/buzzbysolcex/plugin-solcex-bd |
| npm Package | npmjs.com/package/@buzzbd/plugin-solcex-bd |
| elizaOS Registry PR | github.com/elizaos-plugins/registry/pull/263 |
| Bankr Skill PR | github.com/BankrBot/openclaw-skills/pull/165 |
| 8004scan Agent | 8004scan.io/agents/base/17483 |
| Akash Console | console.akash.network/deployments |
| Master Ops v5.3.8 | SKILL.md in /mnt/skills/user/solcex-ops-master |
| GHCR Image | ghcr.io/buzzbysolcex/buzz-bd-agent:v5.3.8 |
| Superpowers | github.com/obra/superpowers |
| elizaOS Discord | discord.gg/P4XuSdWJ |
| Visa Intel Commerce | visa.com/en-us/products/intelligent-commerce |

---

## 7. SUCCESS METRICS (End of Sprint)

| Metric | Target |
|--------|--------|
| Buzz uptime | 99%+ (72h+ continuous) |
| 8004scan score | 80+ (currently 59.4) |
| elizaOS PR | Merged ✅ |
| ERC-8004 article | Published ✅ |
| Agent-to-agent test | 1+ successful x402 transaction |
| Telegram commands | All 20 with inline keyboards |
| Cron jobs executing | 36/36 green |
| MiniMax bug | Resolved ✅ |
| Buzz version | v6.0 with subagent architecture |

---

## 8. EMERGENCY CONTACTS

| Person | Platform | Purpose |
|--------|----------|---------|
| Vitto Rivabella | Telegram | ERC-8004 article |
| bc1max | Telegram | ClawRouter support |
| Gary Palmer Jr | Telegram | ATV Web3 Identity API |
| Builder Benv1 | Telegram | AgentProof |
| elizaOS Discord | #builders | Plugin support |
| Claude Opus 4.6 | claude.ai | Strategy + coding |

---

*Bismillah. Let's build. 🐝🇮🇩*
