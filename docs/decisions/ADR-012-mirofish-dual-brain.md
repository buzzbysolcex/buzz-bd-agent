# ADR-012: MiroFish Dual-Brain — 90% Opus / 10% Ollama

**Date:** March 31, 2026
**Status:** Accepted
**Decision:** Route 90% of MiroFish LLM calls to Claude Opus 4.6 via Pro Max, 10% to Ollama

**Context:**
MiroFish OASIS simulation requires LLM calls for each agent action per round.
Pro Max subscription provides unlimited Claude Opus 4.6 at $0/call.
Ollama qwen3:8b runs locally at $0/call but with 8B params vs frontier model.
Initial implementation used 100% Ollama. This underutilized the
$200/month Pro Max subscription.

**Decision:**

- 90% of LLM calls → Opus 4.6 via `claude -p` subprocess (Pro Max, $0)
- 10% of LLM calls → Ollama qwen3:8b (degen agents rounds 1-4 only)
- Default routing: Opus. Ollama is the exception, not the rule.
- Opus handles: institutional (all), whale (all), market_dynamics (all),
  community (all), degen R5+, all named tasks (persona, debate, report)
- Ollama handles: degen R1-4 only (simple FOMO reactions)

**Rationale:**

- Pro Max is already paid ($200/month) — unused capacity = wasted money
- Opus reasoning is dramatically deeper than qwen3:8b
- Simulation output quality = product quality = revenue
- Opus via CLI is ~4s/call vs Ollama CPU at ~9.3s/call — Opus is FASTER
- 90% Opus makes total sim ~1.2 hours vs ~2.5 hours all-Ollama

**Consequences:**

- llm_router.py created with 90/10 routing logic
- server.py uses router for all simulation calls
- Better persona generation (Opus creates richer, more unique personas)
- Deeper institutional skepticism (the contrarian view that makes sims valuable)
- Better adversarial debates (frontier reasoning on both bull and bear)
- Better reports (Opus writing quality for HSaaS deliverables)
- Fallback: Opus timeout → auto-fallback to Ollama (resilient)
