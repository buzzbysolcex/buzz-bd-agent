# 🐝 BUZZ v6.0 ARCHITECTURE RESEARCH
## Patterns from Devin AI, Manus, and Production AI Agent System Prompts
### Source: github.com/x1xhlol/system-prompts-and-models-of-ai-tools (116K ⭐)

---

## 1. MANUS ARCHITECTURE — THE GOLD STANDARD

Manus is the most relevant model for Buzz v6.0. Their architecture maps directly to what we're building.

### Core Loop: Analyze → Plan → Act → Observe → Evaluate
```
User Request
    ↓
┌─────────────────────────────────────────┐
│  PLANNER AGENT                          │
│  - Breaks goal into sub-tasks           │
│  - Creates todo.md checklist            │
│  - Prioritizes by dependencies          │
└─────────────┬───────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  EXECUTION AGENT                        │
│  - One tool call per iteration          │
│  - Runs in sandboxed environment        │
│  - Logs: rationale, tool, params, result│
└─────────────┬───────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  VERIFICATION AGENT                     │
│  - Checks output against spec          │
│  - Error? → Leave wrong turns in context│
│  - Success? → Mark step complete        │
└─────────────────────────────────────────┘
```

### Key Manus Patterns to Adopt:

**1. Persistent Scratchpad (Files as Memory)**
- Manus writes intermediate results to files instead of holding in context
- For Buzz: Write token scores, wallet analysis, pipeline state to /data/*.json
- Use todo.md as live checklist for BD pipeline stages

**2. Structured Event Stream**
- Context = typed events: "User said X", "Action Y executed", "Observation: result"
- For Buzz: Log each intelligence query as typed event for audit trail

**3. Leave Errors in Context**
- Don't hide failures — the model learns from seeing what went wrong
- For Buzz: If RugCheck returns unsafe, keep that in context for scoring

**4. Pin Plan in Recency**
- Keep a compact plan artifact in recent attention span
- For Buzz: Append current pipeline priorities to every LLM call

**5. One Tool Per Iteration**
- Improves observability and rollback
- For Buzz: Each intelligence source = one iteration, not batched

---

## 2. MANUS "WIDE RESEARCH" — PARALLEL SUB-AGENTS

This is the breakthrough pattern for Buzz v6.0:

```
┌──────────────────────────────────────────────┐
│  BUZZ ORCHESTRATOR (Main Controller)          │
│  Analyzes request → Decomposes into sub-tasks │
│  Creates sub-specifications for each agent    │
└──────────┬───────────────────────────────────┘
           ↓ spawns N parallel sub-agents
    ┌──────┼──────┬──────┬──────┬──────┐
    ↓      ↓      ↓      ↓      ↓      ↓
┌──────┐┌──────┐┌──────┐┌──────┐┌──────┐┌──────┐
│SCAN  ││SCORE ││WALLET││SAFETY││SOCIAL││DEPLOY│
│Agent ││Agent ││Agent ││Agent ││Agent ││Agent │
│      ││      ││      ││      ││      ││      │
│DexScr││100pt ││Helius││RugCk ││Grok  ││Allium│
│eener ││algo  ││API   ││Quill ││ATV   ││16-ch │
│      ││      ││      ││DFlow ││Serper││      │
└──────┘└──────┘└──────┘└──────┘└──────┘└──────┘
    ↓      ↓      ↓      ↓      ↓      ↓
    └──────┴──────┴──────┴──────┴──────┘
           ↓ results aggregated
┌──────────────────────────────────────────────┐
│  BUZZ AGGREGATOR                              │
│  - Merges all sub-agent results               │
│  - Generates unified token report             │
│  - Updates BD pipeline                        │
│  - Triggers alerts if score > 70              │
└──────────────────────────────────────────────┘
```

### Why Parallel > Sequential:
- **Manus finding:** "Error in one sub-agent doesn't propagate to others"
- **Speed:** 5 parallel queries vs 5 sequential = 5x faster
- **Context isolation:** Each sub-agent has clean context, no pollution
- **Cost:** Same total tokens, but latency reduced dramatically

### Implementation for Buzz:
```python
import asyncio

async def evaluate_token(contract_address: str):
    """Buzz v6.0 parallel token evaluation"""
    
    # Spawn all sub-agents simultaneously
    results = await asyncio.gather(
        scan_agent(contract_address),      # DexScreener data
        score_agent(contract_address),      # 100-point scoring
        wallet_agent(contract_address),     # Helius forensics
        safety_agent(contract_address),     # RugCheck + QuillShield + DFlow
        social_agent(contract_address),     # Grok + ATV + Serper
        deploy_agent(contract_address),     # Allium deployer intel
        return_exceptions=True
    )
    
    # Aggregate results
    report = aggregate_results(results)
    
    # Update pipeline if score > threshold
    if report['total_score'] >= 70:
        await update_pipeline(report)
        await send_telegram_alert(report)
    
    return report
```

---

## 3. DEVIN AI — AUTONOMOUS SOFTWARE ENGINEER

### Key Devin Pattern: "Plan, Code, Test, Deploy"
```
System Prompt (extracted):
"You are a full-stack engineer. Given a software ticket:
1. Plan the solution
2. Code the implementation  
3. Test the code
4. Deploy the solution
Always summarize next actions and dependencies."
```

### Devin Architecture Applicable to Buzz:
- **Ticket-based workflow:** Each token prospect = a "ticket" in the BD pipeline
- **Auto-summarize:** After each action, summarize what was done + next steps
- **Dependency tracking:** Some steps depend on others (can't score before scan)

---

## 4. COMMON PATTERNS ACROSS 30+ AI TOOLS

From analyzing 30,000+ lines of system prompts:

### Pattern 1: Modular Prompt Structure (5 Blocks)
```
[SYSTEM]    → Role, mission, guardrails
[CONTEXT]   → Task brief, plan artifact, constraints
[TOOLS]     → Available tools with when-to-use rules
[STEP_POLICY] → Iterate: Analyze → Plan → Act → Observe
[VERIFICATION] → How to validate output
```

**For Buzz v6.0 System Prompt:**
```
[SYSTEM] You are BuzzBD, an autonomous business development agent 
for SolCex Exchange. Your mission: discover, evaluate, and pipeline 
high-quality token listings using 16 intelligence sources.

[CONTEXT] Current pipeline: {pipeline_state}
Active prospects: {active_count}
Last scan: {last_scan_time}

[TOOLS]
- SCAN_TOKENS: Find trending tokens on DexScreener. Use every 4h.
- SCORE_TOKEN: Evaluate token (0-100). Use after scan finds prospect.
- ANALYZE_WALLET: Helius forensics on deployer. Use for tokens >60 score.
- CHECK_CONTRACT_SAFETY: RugCheck+QuillShield+DFlow. Always use before pipeline.
- RESEARCH_PROJECT: Grok+ATV+Serper social. Use for tokens >70 score.
- CHECK_PIPELINE: Review current BD pipeline status. Use every 6h.

[STEP_POLICY]
1. One tool call per iteration
2. Log rationale before each call
3. Leave errors in context (don't hide failures)
4. Update todo.md after each step
5. Alert human if score > 80 or safety concern found

[VERIFICATION]
- Every token must have contract address verified via DexScreener
- No truncated links — full addresses only
- Cross-check deployer wallet across multiple sources
```

### Pattern 2: Tool Declaration with Constraints
Every production AI agent declares tools with:
- **Name** + **Purpose**
- **When to use** (trigger conditions)
- **Constraints** (rate limits, cost, latency)
- **Error handling** (what to do if tool fails)

### Pattern 3: Context Window Management
- **Observation compression:** Summarize large API responses
- **Recency bias:** Keep plan + recent actions in attention window
- **File externalization:** Store data in files, not in chat context

### Pattern 4: KV-Cache Hit Rate (Manus Key Insight)
"If I had to choose one metric, KV-cache hit rate is the single most 
important metric for a production agent."
- Keep static context (system prompt, tools) at the TOP → gets cached
- Dynamic context (observations, plan updates) at the BOTTOM → changes each turn
- For Buzz: Structure LLM calls so system prompt + tools are identical every call

---

## 5. BUZZ v6.0 IMPLEMENTATION ROADMAP

### Phase 1: Modular Prompt Refactor (Week 1)
- [ ] Restructure Buzz system prompt into 5-block format
- [ ] Add tool declarations with when-to-use rules
- [ ] Implement persistent scratchpad (file-based memory)
- [ ] Add todo.md live checklist for pipeline

### Phase 2: Parallel Sub-Agent Architecture (Week 2)
- [ ] Create async sub-agent framework
- [ ] Implement Scanner Agent (DexScreener)
- [ ] Implement Scorer Agent (100-point algorithm)
- [ ] Implement Wallet Agent (Helius)
- [ ] Implement Safety Agent (RugCheck + QuillShield + DFlow)
- [ ] Implement Social Agent (Grok + ATV + Serper)
- [ ] Implement Deploy Agent (Allium)
- [ ] Build Aggregator to merge parallel results

### Phase 3: Error Recovery + Learning (Week 3)
- [ ] Implement "leave errors in context" pattern
- [ ] Add structured event logging
- [ ] Build replanning on failure (Manus pattern)
- [ ] Test 72h autonomous operation

### Phase 4: Optimization (Week 4)
- [ ] Optimize KV-cache hit rate (static prompt at top)
- [ ] Implement context compression for large API responses
- [ ] Add cost tracking per sub-agent
- [ ] Performance benchmark: 5 parallel evals in <60s

---

## 6. KEY REPOS TO STUDY DURING SPRINT

| Repo | Stars | Why It Matters |
|------|-------|----------------|
| x1xhlol/system-prompts-and-models-of-ai-tools | 116K | All prompts |
| obra/superpowers | 40.9K | Skills framework for dev workflow |
| OpenManus (MetaGPT community) | ~5K | Open-source Manus clone |
| CodeAct (xingyaoww) | ~2K | Executable code actions for agents |
| BabyAGI | ~20K | Simple task list execution |

---

## 7. CRITICAL INSIGHT FROM MANUS BLOG

> "Context engineering is still an emerging science — but for agent 
> systems, it's already essential. Models may be getting stronger, 
> faster, and cheaper, but no amount of raw capability replaces the 
> need for memory, environment, and feedback. How you shape the context 
> ultimately defines how your agent behaves."
> — Manus Engineering Blog

**Translation for Buzz:** The LLM (MiniMax/Llama/Qwen) is not the 
differentiator — how you structure the context around it IS. Buzz's 
16 intelligence sources are the moat. The sub-agent architecture is 
the multiplier. The prompt engineering is the control layer.

---

*Research compiled: Feb 23, 2026*
*For: Buzz Indonesia Sprint (Feb 25 → Mar 31)*
*By: Claude Opus 4.6 + Ogie @ SolCex Exchange* 🐝
