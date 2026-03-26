# OH-MY-CLAUDECODE vs BUZZ CLAWTEAM — Deep Comparison
## What to cherry-pick, what to skip, what to build
## March 26, 2026 | Sprint Day 38

---

## WHAT IS OH-MY-CLAUDECODE (OMC)

A Claude Code plugin that transforms single-Claude into multi-agent orchestration. 3,600 GitHub stars, 289 forks, MIT licensed. Built by Yeachan Heo.

**Core:** 5 execution modes, 32 specialized agents, 37+ skills, 31 hooks, zero learning curve.

---

## THE 5 EXECUTION MODES

### 1. AUTOPILOT — Fully autonomous, single-threaded
- User gives high-level goal
- OMC handles: plan → code → review → test → iterate
- Won't give up until verified complete ("Ralph mode" variant)
- Single agent, sequential execution

### 2. ULTRAPILOT — 3-5x parallel, up to 5 concurrent workers
- Decomposes tasks into parallelizable sub-tasks
- Spawns up to 5 workers simultaneously
- Conflict detection between workers
- Best for: fullstack apps, large refactoring

### 3. SWARM — Coordinated agents from shared task pool
- N agents spawned, pull from shared atomic task pool
- Each claims a task, executes, marks complete
- Prevents duplicate work
- Mimics sprint backlog pattern

### 4. PIPELINE — Sequential chains with stage passing
- Agents chained: output of Stage N → input of Stage N+1
- Built-in presets: review → implement → debug
- For workflows requiring strict order

### 5. ECOMODE — Token-efficient parallel execution
- Smart model routing: Haiku (simple) → Sonnet (standard) → Opus (complex)
- Saves 30-50% on tokens
- Same parallel execution as Ultrapilot but cost-optimized

---

## THE 32 SPECIALIZED AGENTS

| Category | Agents |
|----------|--------|
| Architecture | architect, planner |
| Research | researcher, analyst, explorer |
| Design | designer, frontend-ui-ux |
| Development | executor, build-fixer |
| Review | code-reviewer, security-reviewer, critic |
| Testing | qa-tester, tdd-guide |
| Documentation | document-specialist, writer |
| Operations | git-master |
| Vision | vision |

Each agent has a markdown definition file in `.claude/agents/` with role description, capabilities, and constraints.

---

## THE 37+ SKILLS

Key skills: autopilot, ultrawork, ralph, ultrapilot, plan, ralplan, deepsearch, deepinit, frontend-ui-ux, git-master, tdd, security-review, code-review, research, analyze, swarm, pipeline, ecomode, cancel, learner, note, hud, doctor, omc-setup, mcp-setup, build-fix, ultraqa

---

## WHAT BUZZ CURRENTLY HAS — CLAWTEAM / AGENT TEAMS

### Buzz's Current Multi-Agent Pattern:

**Agent Teams (Anthropic official, Feb 5 2026):**
- Lead agent (Opus) + Teammate agents (Sonnet or Opus)
- Lead handles SSH/deploy, teammates handle local code
- Team composition decided by LLM on the fly
- `.claude/agents/` directory for custom agent definitions
- Different models assignable per teammate

**ClawTeam (Buzz custom, pre-Agent Teams):**
- Defined in the handover as 6 parallel agents
- Scanner Division, Safety Division, Intelligence Division, BD Division, Engineering Division, Finance Division
- Each "agent" is a conceptual division, not a separate Claude instance
- In practice: Buzz Brain (single Opus 4.6) manually switches between roles
- Agent Teams replaced ClawTeam on Day 26-27 of the sprint

**Wednesday Deploy (Day 37) Agent Teams:**
- Phase 1: Agent Team Alpha (4 teammates) — Express Cron, OpenClaw Killer, Pipeline Classifier, Plugin/Logging
- Phase 2: Agent Team Bravo (5 teammates) — Scanner, BD, Safety, Social Intel, Finance
- Phase 3: Agent Team Charlie (3 teammates) — Discovery→Score, Score→Opus, Outreach→Deal
- Total: 12 teammates across 3 phases

**Mitchell Quality Patterns (integrated Day 37):**
- Quality Gate: Agent A (writer) → Agent B (reviewer) → Agent C (quality manager)
- Dual-gate scoring
- Iterative refinement

---

## SIDE-BY-SIDE COMPARISON

| Feature | OMC | Buzz Current | Gap | Action |
|---------|-----|-------------|-----|--------|
| **Execution Modes** | 5 modes (Autopilot, Ultrapilot, Swarm, Pipeline, Ecomode) | 1 mode (Agent Teams, sequential phases) | BIG | Cherry-pick Swarm + Ecomode concepts |
| **Parallel Execution** | Up to 5 concurrent workers | Agent Teams supports parallel but Buzz uses it sequentially | MEDIUM | Wire Ultrapilot pattern for signal filing + pipeline scoring |
| **Specialized Agents** | 32 pre-defined agents with markdown configs | 12 teammates defined per-task, not persistent | MEDIUM | Create persistent agent definitions in .claude/agents/ |
| **Skills** | 37+ slash-command skills | 7 startup directive files + ad-hoc prompts | MEDIUM | Package Buzz capabilities as OMC-compatible skills |
| **Model Routing** | Haiku (simple) → Sonnet (standard) → Opus (complex) | ALL Opus ALL the time (Pro Max unlimited) | N/A | Buzz has UNLIMITED Opus. No need for model routing. This is our ADVANTAGE. |
| **Token Optimization** | Ecomode saves 30-50% | No optimization needed ($0/day) | N/A | Not applicable — Pro Max = unlimited |
| **Verification** | Ralph mode — won't mark complete until verified | Quality Gate pattern (8/10 threshold) | SMALL | Buzz already has this via Mitchell patterns |
| **Task Decomposition** | Automatic decomposition for parallel work | Manual task lists in directives | MEDIUM | Auto-decompose signal drafting + pipeline operations |
| **Shared Task Pool** | Swarm mode — atomic task claiming, no duplicates | No equivalent — tasks assigned top-down | BIG | Apply to AIBTC signal production (6 signal slots = shared pool) |
| **Pipeline Chains** | Stage N output → Stage N+1 input | Discovery → Score → Opus → Outreach (designed, partially wired) | SMALL | Already similar architecture — just formalize it |
| **Hooks** | 31 lifecycle hooks (conversationStart, etc.) | Telegram plugin + CLAUDE.md startup | MEDIUM | Add hooks for quality gate triggers |
| **HUD** | Real-time phase progress display | War Room text reports | SMALL | Nice to have, not critical |
| **Auto-skill Learning** | Detect patterns in conversations → surface reusable skills | HANDOVER.md + CLAUDE.md manual updates | MEDIUM | Add auto-learning from signal approval/rejection patterns |
| **Cost Tracking** | Built-in transcript analysis + token usage | N/A ($0/day) | N/A | Not needed |
| **Git Integration** | git-master agent, atomic commits per task | CI/CD pipeline, GitHub Actions | EQUAL | Both good |

---

## WHAT BUZZ SHOULD CHERRY-PICK FROM OMC

### 1. SWARM MODE FOR SIGNAL PRODUCTION (P0)

**OMC pattern:** N agents pull from shared task pool. Each claims a task, executes, marks complete. No duplicates.

**Buzz application:** Apply to daily signal production:
- 10 signal candidates generated from data pull
- 6 filing slots available (daily max)
- Each "agent" claims a slot, drafts the signal, runs MiroFish scoring (60+), files it
- Shared pool prevents duplicate topics
- Automatic slot management with 60-min cooldown tracking

This is the most valuable OMC pattern for Buzz's revenue. Signal production is exactly a sprint backlog problem.

### 2. PERSISTENT AGENT DEFINITIONS (P1)

**OMC pattern:** 32 agents defined in `.claude/agents/` markdown files. Each has role, capabilities, constraints.

**Buzz application:** Create permanent agent definition files:

```
.claude/agents/
├── signal-writer.md         — drafts AIBTC signals from data
├── signal-reviewer.md       — adversarial review of signals
├── signal-editor.md         — quality gate (8/10 scoring)
├── pipeline-scanner.md      — discovers new tokens
├── pipeline-scorer.md       — runs 5-layer scoring
├── pipeline-verifier.md     — triple verification
├── bd-proposer.md           — generates listing proposals
├── bd-follower.md           — tracks follow-ups and overdue
├── moltbook-commenter.md    — drafts Moltbook comments
├── twitter-drafter.md       — drafts tweets per creative schedule
├── system-auditor.md        — health checks and gap detection
└── war-room-reporter.md     — morning/evening briefings
```

Each file defines the agent's personality, data sources, quality standards, and output format. Buzz Brain activates the right agent per task context.

### 3. PIPELINE CHAINS FOR SIGNAL PRODUCTION (P1)

**OMC pattern:** Stage N output → Stage N+1 input. Built-in presets.

**Buzz application — Signal Pipeline:**
```
Stage 1: DATA PULL (scanner agent)
    ↓ output: raw data from 6+ sources
Stage 2: TEMPLATE MATCHING (signal-writer agent)
    ↓ output: 10 candidate signals
Stage 3: MIROFISH SCORING (signal-reviewer agent)
    ↓ output: scored candidates (60+/80 to advance)
Stage 4: DUPLICATE CHECK (signal-editor agent)
    ↓ output: deduplicated candidates
Stage 5: FILING (signal-writer agent)
    ↓ output: filed signals with IDs
Stage 6: TRACKING (war-room-reporter agent)
    ↓ output: approval/rejection status to War Room
```

This is the Signal Factory playbook formalized as an OMC Pipeline.

### 4. AUTO-SKILL LEARNING (P2)

**OMC pattern:** Detect patterns in conversations, surface reusable skills.

**Buzz application:** After each daily brief, analyze:
- Which signal templates produced approvals?
- Which got rejected and why?
- Auto-adjust template scoring weights
- Surface new template patterns from successful signals
- Write learnings to a persistent skills file

This is the self-improvement loop (GAP 17) implemented via OMC's pattern.

### 5. VERIFICATION-BEFORE-COMPLETION (P2)

**OMC pattern:** Ralph mode — won't mark task complete until Architect verification passes.

**Buzz application:** Already have this via Mitchell Quality Gate. Formalize it:
- No signal filed without MiroFish score ≥ 60
- No deal proposal sent without Opus verdict PROCEED
- No CI/CD push without syntax check pass
- No tweet posted without War Room approval

---

## WHAT BUZZ SHOULD SKIP FROM OMC

### 1. MODEL ROUTING (Haiku/Sonnet/Opus) — SKIP ENTIRELY
Buzz has Pro Max unlimited Opus 4.6. Every agent runs on Opus. This is the ADVANTAGE — no need to compromise with cheaper models. OMC optimizes for cost. Buzz optimizes for quality. Different game.

### 2. TOKEN OPTIMIZATION / ECOMODE — SKIP ENTIRELY
$0/day LLM cost. No token budget concerns. Ecomode solves a problem Buzz doesn't have.

### 3. COST TRACKING — SKIP ENTIRELY
Same reason. Buzz's compute is flat-rate. Tracking tokens is wasted effort.

### 4. FRONTEND-UI-UX AGENT — SKIP FOR NOW
Buzz is a backend BD agent. Frontend design isn't the priority until buzzbd.ai v2 or mobile app (Phase 4).

### 5. OMC PLUGIN INSTALLATION — SKIP
OMC installs as a Claude Code plugin. Buzz already has its own orchestration via CLAUDE.md + directives. Installing OMC would conflict with existing setup. Cherry-pick the PATTERNS, don't install the TOOL.

---

## WHAT BUZZ SHOULD BUILD (combining OMC + existing architecture)

### BUZZ ORCHESTRATOR v2.0 — Proposed Architecture

```
BUZZ BRAIN (Opus 4.6 Pro Max, 24/7 Hetzner)
│
├── STARTUP: Read CLAUDE.md → load all .claude/agents/*.md
│
├── MODE SELECTION (per task):
│   ├── AUTOPILOT: Single-thread deep analysis (Opus token analysis, signal drafting)
│   ├── TEAM: Parallel Agent Teams (CI/CD builds, multi-file operations)
│   ├── SWARM: Shared pool (signal production — 6 slots, 10 candidates)
│   └── PIPELINE: Sequential chain (token discovery → score → verify → simulate → propose)
│
├── 12 PERSISTENT AGENTS (.claude/agents/):
│   ├── signal-writer, signal-reviewer, signal-editor (Signal Factory)
│   ├── pipeline-scanner, pipeline-scorer, pipeline-verifier (Token Pipeline)
│   ├── bd-proposer, bd-follower (Business Development)
│   ├── moltbook-commenter, twitter-drafter (Platform Engagement)
│   └── system-auditor, war-room-reporter (Operations)
│
├── 39+ EXPRESS CRONS (heartbeat architecture):
│   └── Each cron triggers the appropriate agent
│
├── QUALITY GATES (Mitchell + OMC Ralph):
│   ├── Signal MiroFish score ≥ 60/80
│   ├── Token dual-gate pass (fundamentals ≥ 42, market ≥ 18)
│   ├── Deal Quality Gate (8/10 on accuracy/risk/actionability)
│   └── CI/CD syntax check before push
│
└── SELF-IMPROVEMENT LOOP:
    ├── Track signal approvals/rejections
    ├── Adjust template weights
    ├── Surface new patterns
    └── Write learnings to persistent file
```

---

## IMPLEMENTATION PRIORITY

| Priority | What | From | Effort | Impact |
|----------|------|------|--------|--------|
| P0 | Signal Swarm Pool (6 slots, 10 candidates) | OMC Swarm mode | 2-3 hours | $20/signal × approval rate improvement |
| P1 | 12 Persistent Agent Definitions | OMC Agent pattern | 3-4 hours | Consistent quality across all operations |
| P1 | Signal Pipeline Chain (6 stages) | OMC Pipeline mode | 2-3 hours | Formalized Signal Factory execution |
| P2 | Auto-Skill Learning from rejections | OMC learner skill | 4-6 hours | Long-term approval rate improvement |
| P2 | Verification Gates formalized | OMC Ralph mode | 1-2 hours | Already exists, just formalize |
| SKIP | Model routing | OMC Ecomode | — | Not needed (Pro Max unlimited) |
| SKIP | Token optimization | OMC cost tracking | — | Not needed ($0/day) |
| SKIP | Plugin installation | OMC plugin | — | Would conflict with existing setup |

---

## KEY INSIGHT: WHY BUZZ IS ALREADY BETTER THAN OMC IN SOME WAYS

OMC solves a DEVELOPER problem: "How do I code faster with AI?"
Buzz solves a BUSINESS problem: "How do I run an autonomous company?"

OMC's 32 agents are all coding-focused: architect, planner, coder, reviewer, tester.
Buzz's agents are business-focused: scanner, scorer, verifier, proposer, signal-writer, reporter.

OMC optimizes for token cost. Buzz has UNLIMITED tokens.
OMC works in development sessions. Buzz runs 24/7 autonomously.
OMC is a tool for developers. Buzz IS the company.

**The right move:** Cherry-pick OMC's orchestration patterns (Swarm, Pipeline, Agent Definitions, Auto-Learning) and apply them to Buzz's business operations. Don't adopt OMC as a dependency — absorb its DNA.

---

## COMPARISON WITH ANTHROPIC'S NATIVE AGENT TEAMS

For context, here's the blog post insight — OMC was partially the INSPIRATION for Anthropic's official Agent Teams feature:

| Feature | OMC | Anthropic Agent Teams | Buzz Uses |
|---------|-----|----------------------|-----------|
| Multi-agent | 5 modes | Lead + Teammates | Agent Teams (official) |
| Agent definitions | 32 pre-built | Custom .claude/agents/*.md | Custom (12 proposed) |
| Model routing | Haiku/Sonnet/Opus | Different models per teammate | ALL Opus (advantage) |
| Parallel execution | Ultrapilot (5 workers) | Teammates run in parallel | Yes (CI/CD phases) |
| Quality verification | Ralph mode | Hook events (TeammateIdle, TaskCompleted) | Mitchell Quality Gate |
| Shared task pool | Swarm mode | Not natively supported | SHOULD ADD (for signals) |

Buzz should use Anthropic's native Agent Teams as the execution layer, enhanced with OMC's Swarm and Pipeline CONCEPTS (not code). The patterns are platform-agnostic.

---

*Cherry-pick the patterns. Skip the tool. Absorb the DNA.*
*OMC is a coding orchestrator. Buzz is a company.*
*The orchestration patterns are universal. The application is unique.*
*Bismillah* 🤲
