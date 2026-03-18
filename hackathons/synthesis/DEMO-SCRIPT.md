# Buzz BD Agent — 3-Minute Demo Script

**Hackathon:** Synthesis
**Presenter:** Ogie (@HidayahAnka1)
**Duration:** 3:00

---

## Act 1: The Hook (0:00 - 0:30)

**[Show: Buzz Twitter profile @BuzzBySolCex]**

> "I'm a chef from Jakarta. Twenty years in kitchens. No CS degree. No engineering team. I built an autonomous exchange listing agent with Claude AI, and it runs for $52 a month."

**[Show: Health endpoint response — all systems green]**

> "This is Buzz. It discovers tokens, scores them with 5 agents, simulates listing decisions with 20 more, and generates proposals for SolCex Exchange — all without me touching it. Let me show you what that looks like."

---

## Act 2: Live Scoring (0:30 - 1:30)

**[Show: Terminal or API client]**

> "I'm going to feed Buzz a token address right now."

**[Execute: POST /api/v1/score-token with a live token contract address]**

> "Watch the right side — five agents are running in parallel. Scanner pulls DexScreener and CoinGecko data. Safety checks RugCheck and ethskills. Wallet analyzes holder distribution through Helius and Allium. Social scrapes Twitter presence via Grok and Serper. Quality synthesizes everything."

**[Show: 100-point score breakdown as it returns]**

> "There it is. A composite score across safety, wallet health, social signal, market data, and quality. Every dimension scored independently by its own agent."

**[Show: JVR receipt generated for this operation]**

> "And here is the receipt. SHA-256 hash of the payload, AAB verification code, timestamp, pushed to my Telegram. Every operation in Buzz creates one of these. This is Bounty 3b — agents with receipts."

---

## Act 3: MiroFish Simulation (1:30 - 2:30)

**[Execute: POST /api/v1/simulate/simulate-listing with the same token]**

> "Now the interesting part. MiroFish takes that score and runs a simulation. Twenty agents across four behavioral clusters — conservative, aggressive, balanced, and contrarian — each with different risk weights."

**[Show: Simulation results loading — cluster-by-cluster consensus]**

> "The conservative cluster says MONITOR. The aggressive cluster says LIST. The balanced cluster agrees with LIST. The contrarian cluster says REJECT."

**[Show: EV calculation]**

> "MiroFish resolves this with expected value math. EV equals probability times win minus one-minus-probability times loss. It is not a vote — it is a calculation. The final verdict is..."

**[Show: LIST / MONITOR / REJECT verdict]**

> "...and Buzz has made a decision backed by 20 agents and hard math. Not vibes. Not a gut feeling."

**[Show: Cyberpunk HTML listing proposal]**

> "This is the proposal that gets auto-generated. Full breakdown, styled, ready to send. Nine of the agents that produced this run on Bankr's gpt-5-nano — for free. That is Bounty 8."

---

## Act 4: Identity Layer (2:30 - 3:00)

**[Show: ERC-8004 registrations — Ethereum #25045, Base #17483, Anet #18709]**

> "Buzz has a verifiable identity across three EVM chains through ERC-8004."

**[Show: Solana 8004 address]**

> "And on Solana."

**[Show: AgentProof #1718 telemetry on Avalanche]**

> "AgentProof tracks its operational telemetry on Avalanche."

**[Show: x402 USDC payment endpoint]**

> "And if you want to query Buzz programmatically, you pay with USDC through x402. Micropayments, on-chain, no API keys."

**[Pause. Look at camera.]**

> "Every action has a receipt. Every agent has an identity. Every decision has math. This is a $52-per-month autonomous business built by a chef with Claude AI. That is Buzz."

---

## Backup Talking Points

If asked about technical details:
- "28 cron jobs scan 23 intel sources — DexScreener, AIXBT, OKX, Bags.fm, CoinGecko, and more"
- "SQLite in WAL mode, 47 tables, running on a $4.09/month Hetzner VPS"
- "131+ REST endpoints — this is a production API, not a demo"
- "Sentinel v2.0 monitors health continuously with a 45-minute restart pattern"

If asked about the builder story:
- "The kitchen taught me mise en place — everything in its place before you cook. That is exactly what Buzz does for token evaluation."
- "Claude AI was my development partner for 18 months. Not runtime — I use Bankr for that. Claude helped me learn to build."
- "I went from zero code to 47 database tables and 10 agents. The tools exist. You just have to be stubborn enough to use them."

If asked about what is next:
- "More chains. More intel sources. The backtester is already adjusting scoring weights based on past predictions."
- "Virtuals ACP #17681 has 4 agent-to-agent offerings live — other agents can request Buzz evaluations directly."
- "The goal is for SolCex to never list a token that Buzz did not evaluate first."

---

## Technical Requirements for Demo

- API server running and healthy
- Pre-selected token address for live scoring (pick one with interesting results)
- Terminal or Postman for POST requests
- Browser for HTML proposal display
- Screenshots of ERC-8004 registrations as backup if chain explorers are slow
- Telegram open to show JVR notification arriving in real time
