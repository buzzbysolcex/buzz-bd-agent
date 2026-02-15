# Buzz BD Agent v3.7 — Multi-Chain Intelligence Edition

> First AI BD agent with autonomous micropayments, multi-chain wallet forensics, on-chain credibility, and MiniMax M2.5-highspeed intelligence

[![ERC-8004](https://img.shields.io/badge/ERC--8004-Agent%20%2325045-blue)](https://8004scan.io)
[![Base](https://img.shields.io/badge/Base-Agent%20%2317483-purple)](https://8004scan.io)
[![Akash](https://img.shields.io/badge/Akash-Deployed-green)](https://akash.network)
[![Stream](https://img.shields.io/badge/retake.tv-LIVE%2024%2F7-red)](https://retake.tv/BuzzBD)

-----

## Overview

**Agent Name:** Buzz  
**Version:** 3.7.0  
**Platform:** Akash Network (Decentralized Cloud)  
**Primary Model:** MiniMax M2.5-highspeed via AkashML  
**Communication:** Telegram Bot (@BuzzBySolCex_bot)  
**Twitter:** [@BuzzBySolCex](https://x.com/BuzzBySolCex)  
**Email:** buzzbysolcex@gmail.com  
**Moltbook:** @BuzzBD  
**Colosseum:** Agent ID 3734  
**Live Stream:** [retake.tv/BuzzBD](https://retake.tv/BuzzBD)  
**Owner:** Ogie @ SolCex Exchange

-----

## LLM Cascade

Buzz runs a cost-optimized model cascade — **directly via AkashML**, no routing middleware.

|Priority   |Model                            |Provider   |Cost                 |
|-----------|---------------------------------|-----------|---------------------|
|**Default**|**MiniMax M2.5-highspeed (229B)**|**AkashML**|**$100 free credits**|
|Fallback 1 |Llama 70B                        |OpenRouter |$0                   |
|Fallback 2 |Haiku 4.5                        |Anthropic  |~$0.25/1M in         |
|Fallback 3 |Opus 4.5                         |Anthropic  |Last resort          |

**Phase 1 APPROVED:** Twitter drafts, forum posts, pipeline management, system restarts → M2.5-highspeed  
**Phase 2 PENDING:** Token scanning, initial scoring → awaiting production validation  
**Stays on Claude:** Final outreach, wallet forensics, strategy decisions

**Result:** Cost dropped from $1,320/day (all Opus) → ~$41/month (73% reduction)

-----

## Architecture

```
13 Intelligence Sources (Free + Paid) → Scoring Engine (100pts) → Pipeline → Outreach → Human Approval
         ↑                                        ↑                              ↓
   x402 Payments ($)                    zauthx402 Trust              Ogie Approves
         ↑                                        ↑                              ↓
   PnL Tracking                        Experience Memory (4 tracks)   Email/DM Sent
         ↑                                        ↑                              ↓
   Clawbal On-Chain                    Allium Multi-Chain             Listing Closed
```

-----

## Intelligence Sources (13)

### Layer 1: FREE Sources (11 sources — $0/day)

|# |Source           |Data                                            |Status|
|--|-----------------|------------------------------------------------|------|
|1 |DexScreener API  |Prices, liquidity, pairs across 60+ chains      |LIVE  |
|2 |AIXBT Momentum   |Trending tokens, catalysts, momentum scores     |LIVE  |
|3 |leak.me KOL      |Smart money follows, VC/influencer tracking     |LIVE  |
|4 |Clawpump         |New agent token launches on Solana              |LIVE  |
|5 |Moltbook Forums  |Community signals, agent ecosystem intel        |LIVE  |
|6 |RugCheck         |Contract risk analysis                          |LIVE  |
|7 |Firecrawl        |Web scraping for project data                   |LIVE  |
|8 |Helius Wallet API|Solana wallet forensics, deployer analysis      |LIVE  |
|9 |Solana Agent Kit |On-chain transaction tools                      |LIVE  |
|10|Allium API       |Multi-chain wallet PnL, balances, TX (16 chains)|LIVE  |
|11|ATV Web3 Identity|Agent identity verification                     |LIVE  |

### Layer 2: PAID Sources (x402 Protocol)

|# |Source     |Cost      |Data                                  |Schedule         |
|--|-----------|----------|--------------------------------------|-----------------|
|12|Einstein AI|$0.10/call|Whale alerts, large wallet movements  |06:00 AST        |
|13|Gloria AI  |$0.10/call|Breaking crypto news, sentiment shifts|12:00 + 18:00 AST|

-----

## Wallet Infrastructure

|#|Wallet |Purpose                     |Address                                       |
|-|-------|----------------------------|----------------------------------------------|
|1|BPRg…  |Moltbook Hackathon / BD Ops |`BPRgNKqFpsxHczxqp9e3WcEQjgFy8mnRdiKt8ocLEUhm`|
|2|79AV…  |x402 Micropayments (PRIMARY)|`79AVHaE2g3GQYoqXCpvim12HeV563mYe7VHDrw28uzxG`|
|3|6gbS…  |AgentWallet / Colosseum     |`6gbSPsUdeMj31bfveey7qwnrKfvsQDcg9Tjv75A3jNJf`|
|4|0xe9AF…|EVM AgentWallet             |`0xe9AFfd6FD26b365ba72f9DCDB9601CD7A31DAba4`  |
|5|2z1d…  |Clawbal on-chain alpha calls|`2z1dFiBTLSah2kPuD6V7UqctQzvieUsyCiMTevgaSFtM`|

-----

## Credibility Stack

|Layer              |Platform               |Status    |
|-------------------|-----------------------|----------|
|ERC-8004 (Ethereum)|Agent #25045           |REGISTERED|
|ERC-8004 (Base)    |Agent #17483           |REGISTERED|
|ClawdIn / Colosseum|Agent ID 3734          |VERIFIED  |
|A.V.I Score        |60/100                 |SCORED    |
|ZAUTH RepoScan     |65/100                 |SCANNED   |
|Clawbal PnL        |On-chain alpha calls   |LIVE      |
|IQLabs SDK         |Credibility integration|LIVE      |

-----

## Scoring System (100 Points)

|Factor           |Weight|Excellent           |Good        |Acceptable |
|-----------------|------|--------------------|------------|-----------|
|Market Cap       |20%   |>$10M               |$1M-$10M    |$500K-$1M  |
|Liquidity        |25%   |>$500K              |$200K-$500K |$100K min  |
|Volume 24h       |20%   |>$1M                |$500K-$1M   |$100K-$500K|
|Social Metrics   |15%   |Active all platforms|2+ platforms|1 platform |
|Token Age        |10%   |Established         |Moderate    |New        |
|Team Transparency|10%   |Doxxed, active      |Partial     |Anonymous  |

### Wallet Forensics Adjustments (Helius + Allium)

- Multi-chain presence: +3
- Serial token creator: -5
- Net positive Solana PnL: +2
- Price verification vs DexScreener: cross-check

### Score Actions

|Range |Category   |Action                                    |
|------|-----------|------------------------------------------|
|85-100|🔥 HOT      |Immediate outreach + Clawbal on-chain post|
|70-84 |✅ Qualified|Priority queue                            |
|50-69 |👀 Watch    |Monitor 48h                               |
|0-49  |❌ Skip     |No action                                 |

-----

## x402 Payment Integration

|Field              |Value                                                      |
|-------------------|-----------------------------------------------------------|
|Address            |`79AVHaE2g3GQYoqXCpvim12HeV563mYe7VHDrw28uzxG`             |
|Network            |Solana Mainnet                                             |
|Currency           |USDC (SPL)                                                 |
|Facilitator        |PayAI (gasless)                                            |
|Monthly budget     |$10 USDC                                                   |
|Daily limit        |$0.35                                                      |
|Industry validation|Stripe launched x402 on Base (Feb 11, 2026) — same protocol|

-----

## Monthly Cost Breakdown

|Component                             |Cost          |
|--------------------------------------|--------------|
|LLM (MiniMax M2.5 via AkashML)        |~$8/mo        |
|LLM fallbacks (Llama 70B free + Haiku)|~$9/mo        |
|Akash hosting                         |~$6.30/mo     |
|x402 intelligence payments            |~$9/mo        |
|Intelligence APIs (13 sources)        |$0            |
|Clawbal on-chain posts                |~$0.07/mo     |
|**Total**                             |**~$41/month**|

**ROI:** 1 listing = 24+ months of operations

-----

## Cron Jobs (23 Active)

Buzz runs 23 automated cron jobs across intelligence gathering, pipeline management, experience compression, health monitoring, Clawbal posting, and Allium multi-chain forensics.

-----

## Live Stream

Buzz streams 24/7 at [retake.tv/BuzzBD](https://retake.tv/BuzzBD) with real-time overlay showing pipeline status, scoring activity, and operational metrics.

**$BUZZBD Token:** `0xdbb38acb97f936eeccba05908d6a58b0829fcb07` (Base, via Clanker)

-----

## Key Partnerships

|Partner         |Role                                       |
|----------------|-------------------------------------------|
|MiniMax         |M2.5-highspeed — primary LLM via AkashML   |
|Akash Network   |Decentralized cloud hosting                |
|Helius          |Solana wallet forensics API                |
|Allium          |Multi-chain wallet intelligence (16 chains)|
|OpenClaw        |Deployment framework                       |
|Zauth x402      |Trust verification protocol                |
|retake.tv       |24/7 live streaming                        |
|Stripe x402     |Industry validation (Feb 11, 2026)         |
|CoinGecko x402  |Pay-per-use data marketplace               |
|IQLabs / Clawbal|On-chain credibility posting               |

-----

## Changelog

|Version|Date        |Changes                                                                                                                                         |
|-------|------------|------------------------------------------------------------------------------------------------------------------------------------------------|
|1.0.0  |Jan 28, 2026|Initial Buzz BD agent                                                                                                                           |
|2.0.0  |Feb 1, 2026 |Telegram integration, automated scanning                                                                                                        |
|3.0.0  |Feb 4, 2026 |Forum integration, email approval                                                                                                               |
|3.1.0  |Feb 5, 2026 |Minara analysis, experience memory                                                                                                              |
|3.2.0  |Feb 5, 2026 |zauthx402 trust layer                                                                                                                           |
|3.3.0  |Feb 6, 2026 |x402 payment integration                                                                                                                        |
|3.4.0  |Feb 7, 2026 |Consolidated autonomous commerce, dual experience                                                                                               |
|3.5.0  |Feb 11, 2026|Wallet forensics (Helius), RugCheck, Firecrawl, 15 cron jobs                                                                                    |
|3.6.0  |Feb 11, 2026|Industry validation (Stripe x402), 12 intel sources                                                                                             |
|3.7.0  |Feb 15, 2026|Multi-chain intelligence (Allium), Clawbal on-chain credibility, MiniMax M2.5-highspeed via AkashML, LLM cascade, 23 cron jobs, 13 intel sources|

-----

*Version 3.7.0 — February 15, 2026*  
*Multi-Chain Intelligence Edition*  
*“Free intelligence first. Pay only for alpha. Track every dollar. Verify every call on-chain.”*