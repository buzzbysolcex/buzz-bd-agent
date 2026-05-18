# Buzz Framework

**The reactive agent framework for crypto intelligence.** Build autonomous BD agents, token scorers, wallet guards, and swarm simulators — on the same architecture that powers a live exchange listing pipeline.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Built by a Chef](https://img.shields.io/badge/built%20by-a%20chef-orange.svg)](https://buzzbd.ai)

> Built by a chef with no CS background using conversational AI.
> 81 tables. 200+ endpoints. 12 agents. $200+ revenue. $0/day LLM cost.

---

## What's Inside (Open Source)

The **reactive infrastructure layer** that powers Buzz BD Agent — everything you need to build an autonomous crypto agent:

| Module                  | What It Does                                      | Tables                         |
| ----------------------- | ------------------------------------------------- | ------------------------------ |
| **Mailbox**             | Inter-agent async messaging                       | agent_mailbox                  |
| **Task DAG**            | Dependency graph execution with fan-out/cascade   | buzz_tasks                     |
| **Dynamic Crons**       | Agent self-scheduling with auto-expiry            | dynamic_crons                  |
| **Event Bus**           | Subscribe/emit wake pattern                       | event_subscriptions, event_log |
| **Feature Flags**       | Build-time gating for safe rollouts               | feature_flags (in-memory)      |
| **Context Compression** | Long session management for Claude Code           | N/A (file-based)               |
| **PULSE Engine**        | Heartbeat tick loop with load-aware throttling    | observation_log                |
| **autoDream**           | Nightly memory consolidation + pattern extraction | daily_summaries                |
| **Trust Gates**         | Graduated autonomy (5 levels)                     | trust_state, trust_audit       |

## What's Proprietary (Not Included)

| Component                     | Why                                               |
| ----------------------------- | ------------------------------------------------- |
| 32 Intel Source Connectors    | API keys, partnerships, data agreements           |
| 11 Scoring Rules (full impl.) | Competitive moat — use @buzzbd/scorer API instead |
| Outreach Templates            | SolCex-specific BD messaging                      |
| MiroFish Simulation Engine    | Swarm intelligence IP                             |
| AIBTC Signal Factory          | Ionic Nova identity and strategies                |

## Quick Start

```bash
# Clone the framework
git clone https://github.com/BuzzBySolCex/buzz-framework.git
cd buzz-framework

# Install (zero dependencies — pure Node.js)
npm install

# Initialize database
node scripts/init-db.js

# Start the reactive layer
node server.js
```

## Architecture

```
YOUR AGENT BRAIN (Claude Code / Codex / any LLM)
  │
  ├── Mailbox → send messages between agents
  ├── Task DAG → create dependency chains
  ├── Dynamic Crons → schedule your own recurring tasks
  ├── Event Bus → subscribe to events, wake on triggers
  ├── Feature Flags → gate unreleased features safely
  ├── PULSE → heartbeat loop with observation logging
  ├── autoDream → nightly cleanup + pattern extraction
  └── Trust Gates → graduated autonomy for operations
  │
  ↓
EXPRESS API (port 3000)
  │
  ↓
SQLite (portable, zero-config)
```

## Modules

### Mailbox — Inter-Agent Messaging

```javascript
// Send a message between agents
POST /api/mailbox/send
{
  "from": "scorer-agent",
  "to": "outreach-agent",
  "subject": "HOT token detected",
  "body": { "token": "PEPE", "score": 92 },
  "priority": "high"
}

// Read unread messages
GET /api/mailbox/inbox/outreach-agent

// Acknowledge (prevents reprocessing)
POST /api/mailbox/ack/:messageId
```

**Safety:** 100 unacked messages = circuit breaker. Messages expire after 24h.

### Task DAG — Dependency Graph

```javascript
// Create a task with dependencies
POST /api/tasks/create
{
  "name": "full-screen-PEPE",
  "type": "bd-screening",
  "dependencies": ["verify-PEPE", "security-PEPE"],
  "payload": { "token": "PEPE" }
}

// Tasks auto-execute when all dependencies complete
// Fan-out: one task can trigger multiple downstream tasks
```

**Safety:** Circular dependency detection on create. Tasks expire after 48h.

### Dynamic Crons — Self-Scheduling

```javascript
// Agent creates its own recurring task
POST /api/crons/schedule
{
  "name": "followup-48h-PEPE",
  "schedule": "0 */48 * * *",
  "handler": "outreach.followup",
  "payload": { "token": "PEPE" },
  "maxRuns": 1,
  "expiresAt": "2026-04-12T00:00:00Z"
}
```

**Safety:** MUST have maxRuns or expiresAt — infinite crons rejected.

### Event Bus — Subscribe/Emit Wake

```javascript
// Subscribe to events
POST /api/events/subscribe
{
  "event": "token.hot",
  "handler": "bd-screening.start",
  "filter": { "score_gte": 85 }
}

// Emit events (triggers all subscribers)
POST /api/events/emit
{
  "event": "token.hot",
  "data": { "token": "PEPE", "score": 92, "chain": "ethereum" }
}
```

12 built-in event types: token.hot, token.watch, token.cold, sim.complete,
outreach.sent, outreach.reply, guard.block, guard.allow, signal.filed,
dream.complete, pulse.tick, trust.promoted.

### Feature Flags

```javascript
const { feature } = require("./lib/feature-flags");

if (feature("WALLET_GUARD")) {
  // Only runs when flag is TRUE
  await evaluateTransaction(tx);
}
```

### Trust Gates

```javascript
const { resolveAction } = require("./services/trust");

const decision = await resolveAction(tokenScore);
// Returns: AUTO_SEND | SILENCE_CONSENT | APPROVAL_REQUIRED

if (decision === "APPROVAL_REQUIRED") {
  await notifyWarRoom("Approval needed for outreach to PEPE team");
}
```

## Claude Code Integration

### Plugin Install

```
/plugin marketplace add BuzzBySolCex/buzz-framework
/plugin install buzz-framework@buzz-framework
```

### Skills Included

- Token Scorer (11-rule engine)
- Wallet Guard (3-state governance)
- BD Screening (7-phase pipeline)
- BuzzShield (47-rule security scanner)

### Hooks Included

- SessionStart → auto-recovery
- PreToolUse:Bash → dangerous command blocking
- PostToolUse:Edit → auto-lint + secret detection
- Stop → state preservation

### 15 Slash Commands

/scan, /score, /simulate, /screen, /outreach, /signal, /deploy,
/guard, /trust, /dream, /pulse, /streak, /leaderboard, /security-scan, /reboot

## Philosophy

**ECC optimizes HOW you code. Buzz Framework optimizes WHAT you build.**

Everything Claude Code gives you better agents, skills, and commands for generic development. Buzz Framework gives you the reactive infrastructure for autonomous crypto operations — the mailbox, the task graph, the event bus, the trust gates, the heartbeat, and the dream cycle.

They're complementary. Install both.

## Stats (Production — buzzbd.ai)

- 81 SQLite tables
- 200+ REST endpoints
- 12 persistent agents
- 32 intel sources
- 31 feature flags
- 4 Base mainnet contracts + 1 Solana
- $200+ revenue
- $0/day LLM cost (qwen3:8b local + Claude Pro Max)
- CI/CD #149 GREEN, 392 commits
- Built in 42 days (Indonesia Sprint, Feb 25 — Mar 31 2026)

## License

MIT — reactive layer is free. Scoring rules, intel sources, and outreach templates are proprietary.

## Links

- **Live system**: https://buzzbd.ai
- **Score tokens**: https://buzzbd.ai/score
- **Leaderboard**: https://buzzbd.ai/scores
- **npm scorer**: [@buzzbd/scorer](https://www.npmjs.com/package/@buzzbd/scorer)
- **Twitter**: [@BuzzBySolCex](https://twitter.com/BuzzBySolCex)
- **Creator**: [@hidayahanka1](https://twitter.com/hidayahanka1)

---

_Built by a chef. Kitchen runs itself. Bismillah 🤲_
