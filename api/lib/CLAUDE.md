# Core Libraries

## simulation-engine.js (MiroFish Stage 1)

- 50 agents: 5 personas x 10 variations (5 risk levels x 2 experience)
- Personas: degen, whale, institutional, community, technical_trader
- EV formula: EV = p x W - (1-p) x L
- 2-second simulation runs
- Returns: consensus, recommendation, weighted avg, per-agent verdicts
- Stage 1 MVP: LIVE. Monte Carlo (Stage 2): NOT STARTED.
- Rate limit: 5 simulations per hour

## Danger Zones

- simulation-engine.js is 15,261 bytes — large file, edit carefully
- Persona weights affect consensus — don't change without understanding the math
- Financial Datasets MCP integration may be stale — check connection before relying on it
