# ADR-002: Kill All External LLMs

**Date:** March 22, 2026 (Sprint Day 35)
**Status:** Accepted
**Decision:** Remove all external LLM dependencies, use Claude Opus 4.6 exclusively

**Context:**
Buzz used a 3-tier LLM cascade: MiniMax M2.5 -> Bankr LLM Gateway -> Anthropic API.
This added complexity, cost ($1,320/day at peak), and quality inconsistency.

**Decision:**
- Claude Opus 4.6 Pro Max (unlimited compute) as the ONLY brain
- ALL external LLMs killed: MiniMax, Bankr, GPT, any others
- $0/day LLM cost (Pro Max subscription covers everything)

**Consequences:**
- Cost: $0/day LLM (was ~$10-1320/day depending on usage)
- Quality: consistent Opus-level reasoning across all tasks
- Simplicity: one model, one context, one brain
- Dependency: tied to Anthropic Pro Max subscription
