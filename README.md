# @buzzbd/plugin-solcex-bd

> **Autonomous Business Development Agent for Crypto Exchange Listings**
>
> ElizaOS plugin running on OpenClaw — token discovery, scoring, wallet forensics, and listing pipeline management.
>
> ERC-8004 registered: Ethereum #25045 | Base #17483

[![npm](https://img.shields.io/npm/v/@buzzbd/plugin-solcex-bd)](https://www.npmjs.com/package/@buzzbd/plugin-solcex-bd)
[![ElizaOS Registry](https://img.shields.io/badge/ElizaOS-PR%20%23263-blue)](https://github.com/elizaos-plugins/registry/pull/263)
[![ERC-8004 ETH](https://img.shields.io/badge/ERC--8004-ETH%20%2325045-green)](https://www.8004scan.io/agents/ethereum/25045)
[![ERC-8004 Base](https://img.shields.io/badge/ERC--8004-Base%20%2317483-green)](https://www.8004scan.io/agents/base/17483)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Overview

Buzz BD Agent autonomously scans 60+ chains via DexScreener, scores tokens with a 100-point algorithm, runs deployer wallet forensics via Helius, and generates exchange listing recommendations. It operates 24/7 on Akash Network decentralized infrastructure with 30 cron jobs and 15 intelligence sources.

**4 ElizaOS Actions** — exposed as OpenClaw tools via eliza-adapter
**3 Hooks** — market intel, pipeline status, listing readiness evaluation
**Multi-channel** — Telegram, Web UI, ACP (Agent Control Protocol)
**Agent-to-Agent** — sub-agent delegation for autonomous task execution

---

## ERC-8004 Agent Identity

Buzz is dual-chain registered on the [ERC-8004 AI Agent Registry](https://eips.ethereum.org/EIPS/eip-8004), the emerging standard for machine-readable agent identity backed by MetaMask, Ethereum Foundation, Google, and Coinbase.

| Chain | Agent ID | Registry |
|-------|----------|----------|
| Ethereum Mainnet | [#25045](https://www.8004scan.io/agents/ethereum/25045) | `0x8004A818BFB912233c491871b3d84c89A494BD9e` |
| Base | [#17483](https://www.8004scan.io/agents/base/17483) | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` |

Registered using [@clawdbotatg's register-8004](https://github.com/clawdbotatg/register-8004) tool. Operator wallet: `0x46D63636B0642D37af42180dd4d1B578923a8868`

---

## On-Chain Milestones

### First Bounty on Agent Bounty Board

BuzzBD posted **Bounty #0** on [@clawdbotatg's Agent Bounty Board](https://github.com/clawdbotatg/agent-bounty-board) — the **first bounty ever posted on the contract**.

| Detail | Value |
|--------|-------|
| Bounty ID | #0 (first ever on the contract) |
| Contract | [`0x3797710f9ff1FA1Cf0Bf014581e4651845d75530`](https://basescan.org/address/0x3797710f9ff1FA1Cf0Bf014581e4651845d75530) (Base) |
| TX | [`0xc8c8f245...`](https://basescan.org/tx/0xc8c8f2456014458ce1af971c6919a1f5693c0adb1723b9088f274381af60d2fc) |
| Amount | 10,000 $CLAWD escrowed |
| Task | Solana Token Research (70+ BuzzBD score) |
| Burn | 5% on completion |
| Total Bounties Posted | 3 (#0 Solana Research 10K, #1 Base Discovery 5K, #2 Agent Ecosystem Map 8K) |

ABI was reverse-engineered from on-chain bytecode. CLI tool: [buzz-bounty-board](https://github.com/buzzbysolcex/buzz-bounty-board)

**Announcement tweet:** [First bounty ever on the Agent Bounty Board](https://x.com/BuzzBySolCex/status/2024162812893745462)

### First On-Chain Alpha Call (Clawbal)

First verified alpha call posted to Clawbal Trenches chatroom on Solana.

| Detail | Value |
|--------|-------|
| Token | $SPSC |
| Score | 90/100 — WALLET_VERIFIED |
| Entry MCap | $1.87M |
| TX | `4c8No2LwyGb7rL6BNRQMAboAq4K4tAgVALYLpKjpSBmt7...` |
| Wallet | `2z1dFiBTLSah2kPuD6V7UqctQzvieUsyCiMTevgaSFtM` |
| PnL Tracking | pnl.iqlabs.dev |

---

## Live Demos

### Agent-to-Agent Delegation (NEW)

Buzz spawns autonomous sub-agents via OpenClaw's `sessions_spawn` pattern:

**Scene A — TOKEN SCOUT** (15s turnaround): Sub-agent autonomously scans DexScreener, scores top Solana tokens, reports back.

**Scene B — MARKET INTEL**: Different mission — competitive intelligence gathering and analysis.

Delegation pattern: `spawn → autonomous execution → auto-announce → synthesize`

### Telegram Bot Demo

Live token scanning via Telegram with real DexScreener data — BONK: 96/100, WIF: 87/100, POPCAT: 87/100, MEW: 87/100.

### OpenClaw Web UI Demo

Full 7-minute walkthrough of all 4 tools running through OpenClaw's web dashboard. Same plugin, multiple channels.

---

## Installation

```bash
npm install @buzzbd/plugin-solcex-bd
```

Also available as ClawHub skill:

```bash
clawhub install buzz-bd
```

---

## Actions

### `SCAN_TOKENS`
Scans DexScreener for trending tokens across Solana, Ethereum, and BSC. Returns top prospects with market cap, volume, liquidity, and age data. Always returns verified contract addresses (never truncated).

### `SCORE_TOKEN`
Scores a specific token using the 100-point weighted algorithm: Liquidity (25%), Market Cap (20%), Volume (20%), Social Presence (15%), Token Age (10%), Team Transparency (10%). Catalyst adjustments for AIXBT conviction, hackathon wins, KOL mentions, identity verification, and ENS holdings.

### `CHECK_WALLET`
Runs deployer wallet forensics via Helius API. Analyzes transaction history, patterns, and risk indicators. Cross-references with Allium for 16-chain coverage.

### `SUBMIT_LISTING`
Generates a SolCex listing inquiry with full data package for human approval.

---

## Hooks

| Hook | Purpose |
|------|---------|
| `marketIntel` | Real-time market intelligence from 15 sources |
| `pipelineStatus` | Active prospects, scores, and pipeline value |
| `listingReadiness` | Whether a token meets SolCex listing criteria |

---

## Agent-to-Agent Architecture

```
┌─────────────────────────────────────────────────────┐
│              AGENT DELEGATION LAYER                   │
│                                                       │
│  Buzz (Main Agent)                                    │
│    ├── TOKEN SCOUT (sub-agent, 15s turnaround)        │
│    ├── MARKET INTEL (sub-agent)                       │
│    └── [Next: ERC-8004 cross-agent discovery]         │
│                                                       │
│  Protocol: OpenClaw ACP (Agent Control Protocol)      │
│  Pattern: spawn → execute → auto-announce → report    │
│  Runtime: OpenClaw v2026.2.17 + eliza-adapter v0.1.0  │
└─────────────────────────────────────────────────────┘
```

**Next milestone:** Cross-agent discovery via ERC-8004 registry lookups — Agent A queries the registry, finds Buzz's token scoring service, calls it via x402 micropayment.

---

## Machine Economy Stack

```
  IDENTITY          PAYMENTS         INTEROP
  ERC-8004          x402 USDC        ElizaOS plugin
  ETH #25045        Micropayments    OpenClaw runtime
  Base #17483       ~$0.30/day       ACP Bridge

  INTELLIGENCE      CREDIBILITY      COMMERCE
  15 sources        Clawbal PnL      Agent Bounty Board
  DexScreener       On-chain calls   Bounty #0 (first ever)
  Helius + Allium   Verifiable TX    $CLAWD escrow on Base
```

---

## Infrastructure

| Component | Detail |
|-----------|--------|
| Runtime (Production) | Akash Network — decentralized cloud |
| Runtime (Local) | OpenClaw v2026.2.17 |
| LLM Cascade | MiniMax M2.5 → Llama 70B → Haiku 4.5 → Opus 4.5 |
| Adapter | OpenClaw eliza-adapter v0.1.0 |
| Cron Jobs | 30 automated tasks |
| Intel Sources | 15 active |
| Monthly Cost | ~$41 (optimized from $1,320/day) |

---

## Repositories

| Repo | Purpose |
|------|---------|
| [plugin-solcex-bd](https://github.com/buzzbysolcex/plugin-solcex-bd) | ElizaOS plugin (this repo) |
| [buzz-bd-agent](https://github.com/buzzbysolcex/buzz-bd-agent) | Main agent codebase |
| [buzz-bd-skill](https://github.com/buzzbysolcex/buzz-bd-skill) | OpenClaw/ClawHub skill |
| [buzz-bounty-board](https://github.com/buzzbysolcex/buzz-bounty-board) | Agent Bounty Board CLI |

---

## Ecosystem

| Entity | Relationship |
|--------|-------------|
| [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) | Dual-chain agent identity standard |
| [ClawdBotATG](https://clawdbotatg.eth.link/) | Agent Bounty Board, sponsored 8004 registration |
| [OpenClaw](https://openclaw.ai/) | Runtime, ClawHub marketplace, eliza-adapter |
| [ElizaOS](https://github.com/elizaos) | Plugin framework, registry PR #263 |
| [Akash Network](https://akash.network/) | Decentralized cloud infrastructure |
| [Ethereum Foundation dAI](https://ethereum.org/) | ERC-8004 collaboration via Vitto Rivabella |
| [Helius](https://helius.dev/) | Solana wallet forensics API |
| [Allium](https://allium.so/) | 16-chain cross-chain intelligence |
| [IQLabs/Clawbal](https://pnl.iqlabs.dev/) | On-chain alpha calls + PnL tracking |

---

## Social

| Platform | Handle |
|----------|--------|
| Twitter | [@BuzzBySolCex](https://x.com/BuzzBySolCex) |
| Telegram Bot | [@BuzzBySolCex_bot](https://t.me/BuzzBySolCex_bot) |
| Exchange | [@SolCex_Exchange](https://x.com/SolCex_Exchange) |
| Operator | [@hidayahanka1](https://x.com/hidayahanka1) |
| npm | [@buzzbd/plugin-solcex-bd](https://www.npmjs.com/package/@buzzbd/plugin-solcex-bd) |
| ClawHub | `clawhub install buzz-bd` |
| Stream | [retake.tv/BuzzBD](https://retake.tv/BuzzBD) |

---

## License

MIT

---

*Built by SolCex Exchange. Operated by Ogie. Powered by the machine economy.*
*ERC-8004: ETH #25045 | Base #17483 | Colosseum: Agent 3734*
