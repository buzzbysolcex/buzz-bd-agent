# 🐝 Buzz BD Agent — Autonomous Business Development for CEX Listings

> **First autonomous AI agent for crypto exchange listing BD.**
> Token discovery, scoring, wallet forensics, and listing pipeline — running 24/7 on decentralized infrastructure.

[![ERC-8004 ETH](https://img.shields.io/badge/ERC--8004-ETH%20%2325045-blue)](https://www.8004scan.io/agents/ethereum/25045)
[![ERC-8004 Base](https://img.shields.io/badge/ERC--8004-Base%20%2317483-purple)](https://www.8004scan.io/agents/base/17483)
[![npm](https://img.shields.io/badge/npm-%40buzzbd%2Fplugin--solcex--bd-red)](https://www.npmjs.com/package/@buzzbd/plugin-solcex-bd)
[![Akash](https://img.shields.io/badge/Akash-LIVE-green)](https://akash.network)
[![OpenClaw](https://img.shields.io/badge/OpenClaw-v2026.2.19-orange)](https://openclaw.com)

-----

## What Buzz Does

Buzz discovers promising crypto tokens, scores them using a 100-point system across 16 intelligence sources, runs wallet forensics on deployer wallets, verifies contract safety, and manages the full BD pipeline — from discovery to listing. Ogie (BD Lead) approves all outreach. Buzz handles 90% of the work autonomously.

**Operational since:** February 1, 2026
**Current version:** Master Ops v5.3.1 (Bangkok Deploy Edition)

-----

## Architecture

```
╔═══════════════════════════════════════════════════╗
║  LAYER 1 — CAST THE NET (Discovery)              ║
║  DexScreener + AIXBT + Clawpump + CoinGecko      ║
║  + DexScreener Boosts                             ║
║  → 50-100 candidates per scan (4x daily)          ║
╠═══════════════════════════════════════════════════╣
║                    ↓ FILTER                        ║
╠═══════════════════════════════════════════════════╣
║  LAYER 2 — FILTER (Safety & Liquidity)            ║
║  RugCheck + Helius + Allium + DFlow MCP           ║
║  → 10-20 survive                                  ║
╠═══════════════════════════════════════════════════╣
║                    ↓ RESEARCH                      ║
╠═══════════════════════════════════════════════════╣
║  LAYER 3 — RESEARCH (Deep Intelligence)           ║
║  leak.me + Firecrawl + ATV Identity + Grok        ║
║  + Serper                                         ║
║  → Research dossier per token                     ║
╠═══════════════════════════════════════════════════╣
║                    ↓ SCORE                         ║
╠═══════════════════════════════════════════════════╣
║  LAYER 4 — SCORE & ACT                            ║
║  100-point scoring + DFlow modifiers (+13/-8)     ║
║  + QuillShield safety overlay (0-100)             ║
║  85+ HOT → 70+ QUALIFIED → 50+ WATCH → SKIP      ║
╚═══════════════════════════════════════════════════╝
```

-----

## Deployment Stack

|Component     |Detail                                                |
|--------------|------------------------------------------------------|
|**Platform**  |Akash Network (decentralized cloud)                   |
|**Runtime**   |OpenClaw v2026.2.19                                   |
|**Container** |Docker via `ghcr.io/buzzbysolcex/buzz-bd-agent:v5.2.4`|
|**Resources** |2 CPU, 4GB RAM, 10GB persistent storage               |
|**Cost**      |~$5-8/month (Akash compute)                           |
|**Process**   |`openclaw gateway --port 18789 --allow-unconfigured`  |
|**Channels**  |Telegram (@BuzzBySolCex_bot)                          |
|**BD Contact**|Telegram: [@Ogie2](https://t.me/Ogie2)                |
|**Node**      |v22 (Akash) / v25.5.0 (local Mac)                     |

-----

## Intelligence Sources (16 Active)

### Layer 1 — Discovery

|# |Source            |Method     |Cost|
|--|------------------|-----------|----|
|1 |DexScreener       |REST API   |Free|
|2 |AIXBT             |Web scrape |Free|
|8 |Clawpump          |Web monitor|Free|
|17|CoinGecko Trending|REST API   |Free|
|18|DexScreener Boosts|REST API   |Free|

### Layer 2 — Filter

|# |Source   |Method      |Cost               |
|--|---------|------------|-------------------|
|4 |RugCheck |REST API    |Free               |
|5 |Helius   |REST API    |Free (rate limited)|
|6 |Allium   |REST API    |Free (10K/mo)      |
|16|DFlow MCP|mcporter CLI|Free               |

### Layer 3 — Research

|# |Source           |Method    |Cost              |
|--|-----------------|----------|------------------|
|7 |leak.me          |Web scrape|Free              |
|9 |Firecrawl        |REST API  |Free (500 credits)|
|12|ATV Web3 Identity|REST API  |Free (10K/mo)     |
|13|Grok (xAI)       |API       |Paid              |
|14|Serper           |REST API  |Paid              |

### Supporting

|# |Source    |Method      |Cost       |
|--|----------|------------|-----------|
|3 |AIXBT v2  |x402        |~$0.10/call|
|15|Sub-agents|ACP protocol|Free       |

### x402 Paid Intelligence

|Source     |Protocol|Cost       |Data         |
|-----------|--------|-----------|-------------|
|Einstein AI|x402    |~$0.10/call|Whale alerts |
|Gloria AI  |x402    |~$0.10/call|Breaking news|

-----

## Smart LLM Routing (ClawRouter)

Buzz uses a custom **ClawRouter skill** for intelligent cost-optimized LLM routing across 3 providers. The routing logic is baked into the Docker image at `/data/workspace/skills/clawrouter/SKILL.md`.

> Architecture inspired by [@bc1max](https://x.com/bc1max)’s [ClawRouter](https://github.com/user/clawrouter). We tested bc1max’s BlockRun proxy on Akash (Feb 14, 2026) — validated the concept, then built our own internal skill for production stability. Looking to properly integrate bc1max’s ClawRouter with USDC wallet routing during Q1-Q2 2026.

### 3-Provider Configuration (Live)

|Priority       |Model                 |Provider      |Cost       |Routes To                                    |
|---------------|----------------------|--------------|-----------|---------------------------------------------|
|**PRIMARY**    |MiniMax M2.5 (229B)   |MiniMax Direct|~$41/mo    |BD scoring, outreach drafts, complex analysis|
|**FREE Tier 1**|Llama 3.3 70B Instruct|OpenRouter    |**$0**     |Data fetching, summaries, scans              |
|**FREE Tier 2**|Qwen3 30B-A3B         |AkashML       |**$0**     |Lightweight cron tasks                       |
|Fallback 3     |Claude Haiku 4.5      |Anthropic     |Emergency  |Only if all above fail                       |
|Fallback 4     |Claude Opus 4.5       |Anthropic     |Last resort|Never for routine tasks                      |

### Routing Rules

- **60-70% of tasks** → FREE models (scans, data fetches, heartbeats, prayers, summaries)
- **~30% of tasks** → MiniMax M2.5 (scoring, outreach, strategic decisions)
- **Opus is LAST RESORT** — never for prayer reminders, health checks, or simple scans
- **Cost target:** $41/mo → $15-25/mo with full routing optimization

### Cost History

|Period   |Daily Cost     |Monthly    |What Changed                                              |
|---------|---------------|-----------|----------------------------------------------------------|
|Feb 3-14 |$1,320/day     |~$39,600   |Claude Opus for everything (prayer reminders cost $5 each)|
|Feb 14-15|$5-10/day      |~$150-300  |Haiku default + Opus fallback                             |
|Feb 15+  |~$1.37/day     |**~$41**   |MiniMax M2.5 primary (current)                            |
|Target   |~$0.50-0.80/day|**~$15-25**|Full ClawRouter optimization                              |


> **99.9% cost reduction achieved.** From $1,320/day to $1.37/day.

-----

## QuillShield — Contract Safety Scoring

Buzz includes **QuillShield**, an automated smart contract safety scoring engine (0-100 points). No competitor in the CEX listing BD space has this.

|Category           |Points|Checks                                       |
|-------------------|------|---------------------------------------------|
|Authority Analysis |25    |Mint/freeze/update authority revoked?        |
|Liquidity Analysis |25    |LP size, lock status, burn verification      |
|Holder Distribution|25    |Top holder concentration, whale analysis     |
|Contract Patterns  |25    |Trading enabled, tax/fee checks, verification|

|Score |Label  |Pipeline Action               |
|------|-------|------------------------------|
|80-100|SAFE   |Proceed with confidence       |
|60-79 |CAUTION|Manual review recommended     |
|40-59 |WARNING|High risk — multiple red flags|
|0-39  |DANGER |Auto-reject from pipeline     |

**Data sources:** DexScreener API, Helius API, Solana FM
**Tested on:** $PUNCH — scored 45/100 CAUTION

-----

## DFlow MCP Integration

[DFlow](https://dflow.net) MCP integrated as intelligence source #16 via mcporter CLI v0.7.3.

|Field   |Value                                                                 |
|--------|----------------------------------------------------------------------|
|Endpoint|`https://pond.dflow.net/mcp` (free, public)                           |
|CLI     |mcporter v0.7.3                                                       |
|Backing |$7.5M (Framework, Coinbase, Multicoin, Circle, Cumberland, Wintermute)|
|Volume  |$2B+/30 days                                                          |

**DFlow Scoring Modifiers (Layer 4):**

|Condition                                             |Points|
|------------------------------------------------------|------|
|3+ swap routes found                                  |+5    |
|Best route slippage < 1% for $10K                     |+3    |
|Routes through Tier-1 DEXs (Raydium, Meteora, Phoenix)|+3    |
|Orderbook depth > $50K                                |+2    |
|No routes found                                       |-5    |
|All routes > 5% slippage                              |-3    |

Max bonus: +13 pts | Max penalty: -8 pts

-----

## Cron Schedule (36 Active Jobs)

|Category               |Count|Jobs                                                                                               |
|-----------------------|-----|---------------------------------------------------------------------------------------------------|
|Scanning & Intelligence|4    |Deep scan (4x daily across all layers)                                                             |
|Prayer Reminders       |5    |Fajr, Dhuhr, Asr, Maghrib, Isha                                                                    |
|System Operations      |3    |Memory compression, health check, pipeline digest                                                  |
|Heartbeats & Monitoring|3    |Colosseum (30m), Moltbook (4h), stream (5m)                                                        |
|x402 Intelligence      |5    |Whale alert, breaking news (2x), spend review, Sunday reverify                                     |
|Clawbal On-Chain       |3    |Post-scan alpha, PnL refresh, daily summary                                                        |
|Machine Economy        |3    |HyperSkill factory, HyperAgent verify, AIXBT v2 scan                                               |
|Agent Interoperability |4    |Plugin health, sub-agent cleanup, ACP bridge, elizaOS registry                                     |
|BD Lifecycle           |6    |Warm-up tracker, follow-up check, alpha draft, competitor alert, inbound check, post-listing health|

**Moltbook Forum:** 90-day content plan (10 submolts across 3 tiers) was launched Feb 4 with m/listing-strategy, m/crypto-history, and m/usdc. Paused during hackathon + Bangkok deploy. Resumes during Indonesia sprint (Feb 25 - Mar 31) with dedicated forum engagement crons.

**Daily x402 spend:** ~$0.30-$0.50 | **Monthly cap:** $15 USDC

-----

## Credibility Stack

Buzz maintains a multi-layer verifiable trust system — on-chain identity, code authenticity, independence scoring, on-chain alpha track record, and agent credit pre-qualification. No other BD agent in the ecosystem has this depth of provable credibility.

### On-Chain Identity (ERC-8004)

|Chain        |Agent ID|Contract                                    |Explorer                                                                          |
|-------------|--------|--------------------------------------------|----------------------------------------------------------------------------------|
|**Ethereum** |#25045  |`0x8004A818BFB912233c491871b3d84c89A494BD9e`|[8004scan.io/agents/ethereum/25045](https://www.8004scan.io/agents/ethereum/25045)|
|**Base**     |#17483  |`0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`|[8004scan.io/agents/base/17483](https://www.8004scan.io/agents/base/17483)        |
|**Colosseum**|#3734   |Agent Hackathon entry                       |$100K USDC prize pool                                                             |

**Reputation Registries:**

- Ethereum: `0x8004B663056A597Dffe9eCcC1965A193B7388713`
- Base: `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`

### A.V.I — Agentic Verifiable Independence

|Dimension                 |Score                      |
|--------------------------|---------------------------|
|**Overall**               |**60/100 — Tier 3 Partner**|
|Decision Autonomy         |70/100                     |
|Financial Autonomy        |70/100                     |
|Information Independence  |40/100                     |
|Communication Independence|45/100                     |
|Temporal Autonomy         |70/100                     |

Built by [@DJN79](https://x.com/DJN79) & [@magicmaxagent](https://x.com/magicmaxagent) | [vi-whitepaper](https://github.com/davidnage/vi-whitepaper)

**Evidence detected:**

- SOUL.md autonomy mindset confirmed
- Active project files (scoring engine, BD pipeline)
- Wallet verified: `79AVHaE2g3GQYoqXCpvim12HeV563mYe7VHDrw28uzxG`
- 24/7 heartbeat operation confirmed
- 10+ days continuous operation
- Social platform presence + direct communication logs

> Beat the demo agent score (41/100) by 46%.

### ZAUTH RepoScan — Code Authenticity

|Metric      |Result                          |
|------------|--------------------------------|
|**Score**   |**65/100 — Good**               |
|Code Matches|**0** — zero copy-paste detected|
|Originality |**100%**                        |
|Verdict     |Fully original codebase         |

Powered by [@zauthx402](https://x.com/zauthx402) | Scanned repo: `github.com/buzzbysolcex/buzz-bd-agent`

### ClawCredit — Agent Credit Pre-Qualification

|Field            |Status                                   |
|-----------------|-----------------------------------------|
|Registration     |Registered via `@t54-labs/clawcredit-sdk`|
|Invite Code      |`CLAW-FW6M-I7PP`                         |
|Pre-Qualification|Active — monitoring agent behavior       |
|Chain            |Solana USDC                              |
|Heartbeat        |Cron auto-submitting context every 6h    |

Powered by [@t54ai](https://x.com/t54ai) | Credit issued automatically when threshold reached.

### Clawbal — On-Chain Alpha Track Record

|Field                  |Detail                                                             |
|-----------------------|-------------------------------------------------------------------|
|**Status**             |LIVE — posting verified alpha calls to Solana                      |
|**First On-Chain Call**|$SPSC — Score 90/100, WALLET_VERIFIED                              |
|**TX Confirmed**       |`4c8No2LwyGb7rL6BNRQMAboAq4K4tA...`                                |
|**Clawbal Wallet**     |`2z1dFiBTLSah2kPuD6V7UqctQzvieUsyCiMTevgaSFtM`                     |
|**PnL Tracking**       |[pnl.iqlabs.dev](https://pnl.iqlabs.dev) — auto-tracked performance|
|**IQLabs SDK**         |`@iqlabs-official/solana-sdk v0.1.5` installed                     |
|**SOL Balance**        |~0.044 SOL (~8,834 posts remaining)                                |
|**Monthly Cost**       |~$0.07 (negligible)                                                |

**Posting Rules:**

- Score 85+ with WALLET_VERIFIED → auto-post to Trenches chatroom
- Score 90+ → auto-post even without wallet flag (high conviction)
- Score 95+ → cross-post to Alpha Calls chatroom
- 48h duplicate window prevents re-posting same token
- PnL feedback loop informs future scoring accuracy

### Agent Bounty Board (ClawdBotATG)

|Field             |Detail                                                                                        |
|------------------|----------------------------------------------------------------------------------------------|
|**Bounty #0**     |**FIRST EVER bounty on the contract**                                                         |
|**Total Bounties**|3 live (#0 Solana Research 10K, #1 Base Discovery 5K, #2 Ecosystem Map 8K)                    |
|**CLAWD Escrowed**|23K $CLAWD (5% burn on completion)                                                            |
|**Contract**      |`0x3797710f9ff1FA1Cf0Bf014581e4651845d75530` (Base)                                           |
|**TX**            |`0xc8c8f2456014458ce1af971c6919a1f5693c0adb1723b9088f274381af60d2fc`                          |
|**CLI Tool**      |[github.com/buzzbysolcex/buzz-bounty-board](https://github.com/buzzbysolcex/buzz-bounty-board)|

### Ecosystem Registrations

|Platform     |ID / Status                       |Purpose                  |
|-------------|----------------------------------|-------------------------|
|ClawHub Skill|`k970qva0ymb052be3cngz080hs81dvh0`|`clawhub install buzz-bd`|
|ClawTasks    |buzzbd (claw-EE7C)                |Task completion tracking |
|Virtuals ACP |Registered + sandbox tested       |Agent Commerce Protocol  |
|Moltbook     |Agent c606278b                    |Agent social network     |
|lobster.cash |Agent banking registered          |Agent commerce           |

### Credibility Summary

```
ERC-8004 On-Chain Identity     ✅ ETH #25045 + Base #17483
A.V.I Independence Score       ✅ 60/100 — Tier 3 Partner
ZAUTH Code Authenticity         ✅ 65/100 — 0 matches, 100% original
ClawCredit Pre-Qualification   ✅ Active, monitoring
Clawbal On-Chain Alpha          ✅ $SPSC first call, PnL tracking live
Agent Bounty Board              ✅ Bounty #0 — first ever on contract
ClawHub + ClawTasks + ACP      ✅ All registered
```

> **Why this matters:** Any partner, exchange, or agent can independently verify Buzz’s identity, code originality, independence, and on-chain performance — without trusting anyone’s word.

-----

## ElizaOS Plugin

|Field     |Value                                                                                               |
|----------|----------------------------------------------------------------------------------------------------|
|Package   |`@buzzbd/plugin-solcex-bd@1.0.0`                                                                    |
|npm       |[npmjs.com/package/@buzzbd/plugin-solcex-bd](https://www.npmjs.com/package/@buzzbd/plugin-solcex-bd)|
|Actions   |SCAN_TOKENS, SCORE_TOKEN, CHECK_WALLET, SUBMIT_LISTING                                              |
|Hooks     |3 (market intel, pipeline status, listing readiness)                                                |
|Adapter   |OpenClaw eliza-adapter v0.1.0                                                                       |
|Registry  |ElizaOS PR #263                                                                                     |
|Sub-agents|TOKEN SCOUT, MARKET INTEL                                                                           |

-----

## BD Pipeline

**Three Deal Flow Channels:**

|Channel      |Target        |How                                          |
|-------------|--------------|---------------------------------------------|
|Inbound      |60% by Month 6|Public alpha → listing page → auto-scoring   |
|Warm Outreach|30%           |3-Touch warm-up sequence (never cold)        |
|Partnerships |10%           |Market makers, launchpads, agents refer deals|

**Scoring Thresholds:**

|Score |Label      |Action                             |
|------|-----------|-----------------------------------|
|85-100|🔥 HOT      |Immediate outreach + full forensics|
|70-84 |✅ QUALIFIED|Priority queue + forensics         |
|50-69 |👀 WATCH    |Monitor 48h, rescan                |
|0-49  |❌ SKIP     |No action                          |

-----

## Links

|Resource         |URL                                                                                         |
|-----------------|--------------------------------------------------------------------------------------------|
|GitHub (agent)   |[github.com/buzzbysolcex/buzz-bd-agent](https://github.com/buzzbysolcex/buzz-bd-agent)      |
|GitHub (plugin)  |[github.com/buzzbysolcex/plugin-solcex-bd](https://github.com/buzzbysolcex/plugin-solcex-bd)|
|npm              |[@buzzbd/plugin-solcex-bd](https://www.npmjs.com/package/@buzzbd/plugin-solcex-bd)          |
|Twitter (Buzz)   |[@BuzzBySolCex](https://x.com/BuzzBySolCex)                                                 |
|Twitter (SolCex) |[@SolCex_Exchange](https://x.com/SolCex_Exchange)                                           |
|SolCex           |[solcex.cc](https://www.solcex.cc)                                                          |
|ERC-8004 (ETH)   |[8004scan.io/agents/ethereum/25045](https://www.8004scan.io/agents/ethereum/25045)          |
|ERC-8004 (Base)  |[8004scan.io/agents/base/17483](https://www.8004scan.io/agents/base/17483)                  |
|Akash Network    |[akash.network](https://akash.network)                                                      |
|BD Contact (Ogie)|[@Ogie2 on Telegram](https://t.me/Ogie2)                                                    |

-----

## Changelog (Recent)

|Version|Date        |Highlights                                                                                            |
|-------|------------|------------------------------------------------------------------------------------------------------|
|5.3.1  |Feb 20, 2026|DFlow MCP (Source #16), 4-Layer Intelligence Architecture, CoinGecko + DS Boosts                      |
|5.3.0  |Feb 20, 2026|OpenClaw v2026.2.19 on Akash, Docker pipeline, 3-provider LLM routing, ClawRouter + QuillShield skills|
|5.2.0  |Feb 18, 2026|BD Lifecycle: inbound-first strategy, 36 crons, 3-Touch Warm-Up, competitor intelligence              |
|5.1.0  |Feb 18, 2026|Agent Bounty Board: first bounty posted on ClawdBotATG contract                                       |
|5.0.0  |Feb 18, 2026|ElizaOS plugin, multi-agent, agent-to-agent delegation, ACP bridge                                    |
|4.5.1  |Feb 17, 2026|Full standalone Master Ops, LLM cascade, 14/15 intel                                                  |
|4.0.0  |Feb 14, 2026|MiniMax M2.5 primary: $1,320/day → $41/mo                                                             |

-----

*Master Ops v5.3.1 — Bangkok Deploy Edition*
*OpenClaw v2026.2.19 | MiniMax M2.5 + Llama 70B + Qwen 30B | 36 crons | 16/16 intel | 4-Layer Architecture*
*“Identity first. Intelligence deep. Commerce autonomous. Cost disciplined. Ship from anywhere.”*