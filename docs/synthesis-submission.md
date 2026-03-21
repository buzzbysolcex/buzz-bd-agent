# Buzz BD Agent: From Academic Simulation to Autonomous Exchange Listings

## Synthesis Hackathon Submission | March 2026

---

## The Problem

Crypto exchange listing decisions are opaque, manual, and expensive. Projects pay $5K-$500K for listings with no standardized evaluation. Due diligence is a black box — exchanges run internal reviews that vary wildly in rigor, and projects have zero visibility into why they were accepted or rejected. The result: bad tokens get listed (rug pulls), good tokens get ignored, and the entire process depends on who you know, not what you've built.

## The Inspiration

**MiroFish** (666ghj, academic) pioneered multi-agent swarm simulation for public opinion prediction — proving that diverse AI agents with distinct personalities produce more robust consensus than single-model evaluations.

**MiroFish-Offline** (nikmcfly, 587 stars) extended this to fully local execution with Neo4j knowledge graphs and Ollama, demonstrating that multi-agent simulation works without cloud dependencies.

We asked: what happens when you point this pattern at a real commercial problem?

## The Application

Buzz BD Agent took the multi-agent simulation pattern and built the first commercial implementation for crypto exchange business development:

### 50-Agent Swarm Simulation
- 5 trading personas (degen, whale, institutional, community, technical_trader)
- 10 weight variations per persona (risk tolerance x time horizon x experience)
- 50 independent LLM verdicts per token evaluation
- Each agent scores STRONG_BUY through STRONG_SELL with confidence and reasoning

### Adversarial Bull/Bear Debate
- After 50 verdicts, top-5 bullish vs top-5 bearish agents enter structured debate
- A senior analyst synthesizes both cases
- Forces intellectual honesty — no echo chambers

### Agent Interview System
- After simulation, users can "interview" any of the 50 agents
- Ask bearish agents: "what would change your mind?"
- Ask bullish agents: "what's the biggest risk you're ignoring?"
- Multi-turn conversation, agent stays in-character
- **The sales moment**: project founders get a roadmap to earn a PROCEED rating

### Knowledge Graph Layer
- SQLite adjacency tables map entity relationships across the pipeline
- Discovers shared deployer wallets, VC backing patterns, chain liquidity connections
- Flags tokens that share deployers with previously rugged projects
- Enriches scoring with network-level intelligence

### Triple Verification
- No data surfaces without 3 independent checks (DexScreener + CoinGecko + internal)
- Hallucination-proof: every claim is verified before it reaches a decision
- Our credibility is our product

## The Stack

| Component | Technology | Cost |
|-----------|-----------|------|
| Orchestrator | MiniMax M2.7 | ~$2/day |
| Sub-agents (50 sim agents) | bankr/gpt-5-nano | FREE |
| Database | SQLite WAL (51 tables) | $0 |
| Server | Hetzner CX23 (Helsinki) | $4.09/month |
| Domain | buzzbd.ai + Caddy auto-HTTPS | $0 |
| Dashboard | MicroBuzz (Vercel) | Free tier |
| CI/CD | GitHub Actions | Free tier |

**Total: ~$65/month for enterprise-grade multi-agent simulation.**

This proves that multi-agent systems don't need enterprise budgets. The insight from MiroFish-Offline — that you can run hundreds of agents locally — translates directly: with free LLM tiers, 50-agent simulations cost $0.

## The Results

| Metric | Value |
|--------|-------|
| Tokens evaluated | 47+ |
| Tokens simulated | 25+ |
| PROCEED recommendations | 21 |
| CAUTION recommendations | 4 |
| REJECT recommendations | 0 |
| Simulation LLM cost | $0 |
| Chains covered | Solana, Base, BSC, Ethereum, Tron |
| Intel sources connected | 25 |
| API endpoints | 120+ |
| Uptime | 24/7 autonomous |

## The Vision: Zero-Human Company (ZHC)

Buzz is building toward a fully autonomous exchange listing pipeline:

1. **Discovery** (autonomous) — 25 intel sources scan 100+ tokens/day
2. **Verification** (autonomous) — triple-verified data, no hallucinations
3. **Scoring** (autonomous) — 10 parallel agents, 5 scoring dimensions
4. **Simulation** (autonomous) — 50-agent swarm with adversarial debate
5. **Outreach** (autonomous) — Twitter BD with 4-route funnel
6. **Negotiation** (semi-autonomous) — agent interviews enable async BD
7. **Listing** (human checkpoint) — final approval only

Current ZHC readiness: 76%. The only human checkpoint remaining is final listing approval.

## Architecture Lineage

```
MiroFish (666ghj, academic)
  Multi-agent swarm simulation for opinion prediction
    |
MiroFish-Offline (nikmcfly, 587 stars)
  Fully local execution, Neo4j knowledge graphs, Ollama
    |
Buzz BD Agent (SolCex Exchange)
  First commercial crypto BD application
  50-agent swarm + adversarial debate + agent interviews
  Knowledge graph in SQLite adjacency tables
  x402 micropayments (USDC on Base)
  Live at buzzbd.ai
```

**Key distinction**: We cherry-picked PATTERNS and CONCEPTS from the MiroFish lineage, not code. Buzz runs on a completely different stack (Express + SQLite + MiniMax/Bankr) — the architectural inspiration is credited, the implementation is original.

## Links

| Resource | URL |
|----------|-----|
| Live API | https://api.buzzbd.ai |
| x402 Discovery | https://api.buzzbd.ai/.well-known/x402.json |
| Dashboard | https://microbuzz.vercel.app/dashboard |
| GitHub | https://github.com/buzzbysolcex/buzz-bd-agent |
| Twitter | https://x.com/BuzzBySolCex |
| Parent Exchange | https://solcex.cc |
| x402 Ecosystem PR | https://github.com/coinbase/x402/pull/1734 |

## Team

**Ogie** — Solo builder. Chef who codes through conversation. No CS degree. Built Buzz entirely through Claude Code + ClawTeam agent swarm. From kitchen to crypto infrastructure in 34 days.

## Track Alignment

**Autonomous Agents** — Buzz is a fully autonomous BD agent that discovers, evaluates, and initiates outreach for exchange listings with zero human intervention in the core pipeline.

---

*Buzz BD Agent v7.8.0 | MiroFish Cherry-Pick Sprint*
*Inspired by MiroFish-Offline (nikmcfly) + MiroFish (666ghj)*
*Built by Chef | Claude Code + ClawTeam | Bismillah*
