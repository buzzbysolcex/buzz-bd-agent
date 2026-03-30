# Rule: MicroBuzz v2 Simulation Safety

> Applies when: running MicroBuzz simulations, Ollama operations, AMM scoring, heuristic agents, or batch token analysis

---

## MANDATORY

1. **NEVER** expose Ollama port 11434 externally — localhost ONLY
2. **NEVER** run simulations during signal filing windows (02:00-04:00 UTC)
3. **NEVER** start a simulation batch if available RAM < 10GB
4. **ALWAYS** release Ollama model after batch completes: `ollama stop qwen3:14b`
5. **ALWAYS** check `docker ps` before and after batch — Buzz services must stay UP
6. **ALWAYS** store ALL 1500 trades in microbuzz_v2_trades (full audit trail — LLM + heuristic)
7. **ALWAYS** run sequentially — one token at a time, never parallel simulations
8. **ALWAYS** run LLM agents (Phase A) before heuristic agents (Phase B) each round
9. AMM final price is the ONLY scoring output — do NOT override with manual scores
10. EV formula unchanged: EV = p × W − (1−p) × L
11. v2 scores overwrite v1 scores in pipeline when available
12. If Ollama crashes mid-simulation, mark simulation as FAILED, do NOT retry without checking RAM
13. Simulation results are INTERNAL — do NOT tweet scores without Ogie approval
14. Heuristic agents NEVER query Ollama — pure JS only
15. Do NOT pull larger models without Ogie approval — qwen3:14b is the approved model

## AGENT INTEGRITY

- 30 LLM agents: each MUST get unique Ollama call with full context. No caching between agents.
- 470 heuristic agents: deterministic rules. Same input = same output. No randomness except noise traders.
- Noise traders: use seeded PRNG for reproducibility (seed = simulation_id)
- Trade order within a phase: randomized (prevents position bias)
- All 500 agents trade on the SAME AMM pool — no separate markets

## BATCH CHECKLIST

Before every simulation batch:

- [ ] Ollama running: `curl http://localhost:11434/api/tags` returns 200
- [ ] Model loaded: qwen3:14b in response
- [ ] RAM check: `free -h` shows 10GB+ available
- [ ] Buzz services: `docker ps` shows buzz-production + sentinel-v2 UP
- [ ] No signal filing in next 2 hours (check UTC time)
- [ ] Token list: WATCH tokens only (score 40-65)

## RESOURCE LIMITS

```
Max concurrent simulations: 1
Max tokens per batch: 10
Max simulation time: 60 minutes per token
RAM alert threshold: 5GB available
Total agents per simulation: 500 (30 LLM + 470 heuristic)
Total trades per simulation: ~1500 (500 agents × 3 rounds)
Model: qwen3:14b ONLY
```

---

*Rule: microbuzz-simulation | 500-agent hybrid safety + resource management*
