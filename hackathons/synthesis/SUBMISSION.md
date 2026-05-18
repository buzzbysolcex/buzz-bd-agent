# Buzz BD Agent — Synthesis Hackathon Submission

**Project:** Buzz BD Agent v7.5.5
**Builder:** Ogie (@HidayahAnka1)
**Twitter:** [@BuzzBySolCex](https://x.com/BuzzBySolCex)
**Exchange:** [SolCex](https://solcex.com)
**Bounties:** 3a + 3b + 8 + 2 (Open Track)

---

## The Story

I am a chef. Twenty years in kitchens across Jakarta. No computer science degree. No bootcamp certificate. No engineering team.

Eighteen months ago I discovered Claude AI and asked it a simple question: _Can you help me build something real?_

The answer became Buzz BD Agent — a fully autonomous business development pipeline that discovers, evaluates, simulates, and proposes token listings for SolCex Exchange. It runs 24/7 on a single Hetzner VPS for $52 per month. It has 10 agents, 20 simulation personas, 131+ API endpoints, and 47 database tables. It does in seconds what a BD team of five would take days to do.

This is what happens when you give the right tools to someone stubborn enough to use them.

---

## What Buzz Does

Buzz is the first autonomous agent that operates a complete exchange listing pipeline — from raw token discovery to structured listing proposals — with a single human checkpoint for final deal review.

### The 8-Stage Pipeline

| Stage            | What Happens                                                                                                                            |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **1. DISCOVER**  | 28 cron jobs scan 23 intel sources around the clock — DexScreener, AIXBT, OKX, Bags.fm, CoinGecko, and more                             |
| **2. ASSESS**    | 5 sub-agents score every candidate on a 100-point scale across safety, wallet health, social presence, market data, and overall quality |
| **3. SIMULATE**  | MiroFish engine: 20 agents across 4 behavioral clusters run expected-value calculations to produce a LIST / MONITOR / REJECT verdict    |
| **4. PROPOSE**   | Cyberpunk-styled HTML listing proposals are auto-generated with full scoring breakdowns                                                 |
| **5. OUTREACH**  | Twitter bot (@BuzzBySolCex) posts premium scan templates, replies to communities, and schedules content across 4 categories             |
| **6. NEGOTIATE** | The only human checkpoint — Ogie reviews listing deal terms before anything goes live                                                   |
| **7. VERIFY**    | Sentinel v2.0 monitors pipeline health; every operation generates a JVR (Job Verification Receipt)                                      |
| **8. LEARN**     | Backtester validates past predictions; skill reflection adjusts agent scoring weights over time                                         |

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│              BUZZ BD AGENT v7.5.5               │
│         Autonomous Exchange Listing Agent       │
├─────────┬───────────┬───────────┬───────────────┤
│ Scanner │  Safety   │  Wallet   │    Social     │
│ DexScr  │ RugCheck  │ Helius60  │  Grok/xAI    │
│ AIXBT   │ ethskills │ Allium    │  Serper      │
│ OKX     │ ATV       │           │  Firecrawl   │
│ Bags.fm │           │           │  ATV ENS     │
│ CoinGk  │           │           │              │
├─────────┴───────────┴───────────┴───────────────┤
│              SCORER (100-point)                  │
├─────────────────────────────────────────────────┤
│           MIROFISH SIMULATION ENGINE            │
│  4 personas × 5 weights = 20 agents            │
│  EV = p × W − (1−p) × L                        │
│  → LIST / MONITOR / REJECT                      │
├─────────────────────────────────────────────────┤
│         STRATEGIC ORCHESTRATOR (14 rules)       │
│  Decision Engine → Playbook Engine → Context    │
├────────────────────┬────────────────────────────┤
│  Twitter Bot v3.3  │  Listing Proposal Gen      │
│  12 replies/day    │  Cyberpunk HTML reports     │
│  4 scheduled types │  Simulation tweet templates │
├────────────────────┴────────────────────────────┤
│  SQLite WAL │ 47 tables │ Sentinel v2.0 │ JVR  │
└─────────────────────────────────────────────────┘
```

---

## Metrics

| Metric        | Value                                                   |
| ------------- | ------------------------------------------------------- |
| Agents        | 10 (5 sub + 4 persona + 1 orchestrator) + 20 simulation |
| Endpoints     | 131+                                                    |
| Tables        | 47                                                      |
| Intel Sources | 23                                                      |
| Cron Jobs     | 28                                                      |
| Monthly Cost  | $52 ($4.09 infra + ~$48 LLM)                            |
| Pipeline      | 13 tokens, 3 chains                                     |
| Uptime        | 24/7, 45min restart pattern                             |

---

## Bounty Alignment

### Bounty 3a: "Let the Agent Cook" ($8,000)

Buzz is the definition of "let the agent cook." It is not a chatbot with tools — it is a business that runs itself.

**What makes it autonomous:**

- **Discovery is continuous.** 28 cron jobs fire across 23 data sources. No human triggers scans. Buzz finds tokens the moment they surface on DexScreener trending, AIXBT signals, OKX new listings, Bags.fm feeds, or CoinGecko movers.

- **Assessment is multi-agent.** Five specialized sub-agents (Scanner, Safety, Wallet, Social, Quality) score every token independently on a 100-point composite scale. Each agent has its own data sources, its own scoring logic, and its own failure modes. They do not share state during evaluation.

- **Simulation is adversarial.** MiroFish is not a simple threshold check. It spawns 20 agents across 4 behavioral clusters (conservative, aggressive, balanced, contrarian), each with different risk weights. They deliberate. They disagree. The final verdict is an expected-value calculation: `EV = p * W - (1-p) * L`. The output is LIST, MONITOR, or REJECT — not a probability, but a decision.

- **Output is production-ready.** Listing proposals render as cyberpunk-themed HTML documents with full breakdowns. The Twitter bot generates scan templates, community replies, and scheduled posts. These are not drafts for a human to polish — they ship as-is.

- **Verification is built in.** Sentinel v2.0 tracks pipeline health. Every operation — every scan, every score, every simulation — produces a JVR receipt with SHA-256 hash and AAB-XXXXXX verification code.

- **Learning is closed-loop.** The backtester compares past simulation predictions against actual token performance. Skill reflection adjusts agent scoring weights. Buzz gets better at its job without being retrained.

**Infrastructure reality:**

- Hetzner CX23: 2 vCPU, 4GB RAM, 40GB disk — $4.09/month
- OpenClaw runtime on Node.js
- SQLite in WAL mode — no Postgres, no Redis, no managed databases
- 131+ REST endpoints serving the entire pipeline
- 47 tables tracking tokens, scores, simulations, receipts, and agent state

This is a $52/month company that never sleeps.

---

### Bounty 3b: "Agents With Receipts / ERC-8004" ($8,004)

Buzz does not just act — it proves it acted. Every agent has a verifiable on-chain identity. Every operation has a receipt.

**Multi-chain agent identity:**

| Registry       | Chain             | ID                                             |
| -------------- | ----------------- | ---------------------------------------------- |
| ERC-8004       | Ethereum          | #25045                                         |
| ERC-8004       | Base              | #17483                                         |
| ERC-8004       | Anet              | #18709                                         |
| Solana 8004    | Solana            | `9pQ6KMwu6etMjCambUo3BRPFbuzDcyTY9q1rgAWNXUBS` |
| AgentProof     | Avalanche C-Chain | #1718                                          |
| Virtuals ACP   | —                 | #17681 (4 agent-to-agent offerings)            |
| Phantom Portal | —                 | `be4a0179...407`                               |

**Job Verification Receipts (JVR):**

Every operation in the Buzz pipeline generates a JVR containing:

- **SHA-256 hash** of the operation payload
- **AAB-XXXXXX verification code** for audit trails
- **Telegram notification** pushed to the operator channel
- **8004 ATOM feed-ready format** for on-chain consumption

JVRs are not optional metadata. They are core to the pipeline. If Sentinel detects a missing receipt, the operation is flagged. Buzz treats verifiability as a first-class requirement, not a compliance afterthought.

---

### Bounty 8: "Best Bankr LLM Gateway" ($5,000)

Buzz runs its entire multi-agent system through Bankr's LLM gateway — and does it for nearly nothing.

**LLM architecture:**

| Component                                               | Model                  | Cost    |
| ------------------------------------------------------- | ---------------------- | ------- |
| 5 sub-agents (Scanner, Safety, Wallet, Social, Quality) | bankr/gpt-5-nano       | FREE    |
| 4 persona agents (MiroFish clusters)                    | bankr/gpt-5-nano       | FREE    |
| 1 strategic orchestrator                                | MiniMax M2.5 via Bankr | ~$48/mo |

**Bankr integrations:**

- **Partner API** — Autonomous token deployment on Base chain
- **x402 USDC micropayments** — On-chain API access via HTTP 402 payment protocol
- **Cost Guard** — Hard daily cap of $10/day with automatic throttling. If spend approaches the limit, non-critical agents pause. Critical scoring continues on the free tier.

Nine of ten agents run on the free tier. The orchestrator — the one agent that needs deeper reasoning for 14-rule decision logic — uses MiniMax M2.5. Total LLM spend: roughly $48/month for a system that evaluates hundreds of tokens per week.

---

### Bounty 2: "Open Track" ($20,000)

Buzz is not entering one bounty that happens to touch the others. It is a single, coherent product that naturally spans three categories because that is what a real autonomous business requires:

- **Autonomy (3a)** because the pipeline must run without humans to be viable at $52/month
- **Identity and receipts (3b)** because an autonomous agent handling exchange listings must be verifiable and auditable
- **LLM gateway (8)** because multi-agent orchestration needs an affordable inference layer to stay under budget

These are not bolt-on features. Remove any one of them and the product breaks. The identity layer is not a demo — it is how Buzz proves to token projects that it actually evaluated their asset. The Bankr gateway is not a showcase integration — it is how Buzz keeps nine agents running at zero marginal cost. The autonomy is not aspirational — it is the reason a chef in Jakarta can run a BD operation that competes with funded teams.

**The "Zero-Human Company" thesis:** One person, one VPS, one agent system, and an exchange that gets listing proposals backed by math instead of vibes. Every action has a receipt. Every agent has an identity. Every decision has an expected value.

---

## Links

- **Twitter:** https://x.com/BuzzBySolCex
- **Exchange:** https://solcex.com
- **ERC-8004 (Ethereum):** Registration #25045
- **ERC-8004 (Base):** Registration #17483
- **ERC-8004 (Anet):** Registration #18709
- **Solana 8004:** `9pQ6KMwu6etMjCambUo3BRPFbuzDcyTY9q1rgAWNXUBS`
- **AgentProof:** #1718 (Avalanche C-Chain)
- **Virtuals ACP:** #17681

---

## Built With

- Node.js + Express on OpenClaw runtime
- SQLite (WAL mode) — 47 tables
- Bankr LLM Gateway (gpt-5-nano + MiniMax M2.5)
- Hetzner CX23 ($4.09/month)
- Claude AI (development partner — not runtime dependency)

---

_"I don't have a CS degree. I have a knife, a cutting board, and Claude. The kitchen taught me mise en place — everything in its place before you cook. Buzz is mise en place for exchange listings."_

— Ogie, Jakarta, 2026
