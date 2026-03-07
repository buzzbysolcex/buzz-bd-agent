# CLAUDE.md — Buzz BD Agent v7.0 Build
# Strategic Orchestrator + Cost Guard + Day 14 Fixes

## What Is This Project
Buzz is an autonomous BD agent for SolCex Exchange (Solana-native CEX). Runs 24/7 on Akash Network via OpenClaw runtime. Scans tokens across Solana/Base/BSC, scores them (100-point system), conducts Gmail OAuth outreach to token teams for listing.

## Current Live State (v6.3.6)
- Akash: provider.europlots.com:32422 (Buzz) + provider.akashprovid.com:31949 (Sentinel)
- REST API: 64 endpoints on Express.js, SQLite WAL (13 tables), port 3000
- Docker: ghcr.io/buzzbysolcex/buzz-bd-agent:v6.3.6
- LLM: MiniMax M2.5 orchestrator + Bankr/GPT-5-Nano sub-agents
- 38 crons, 16/20 skills loaded, Gmail OAuth active
- Pipeline: auto-persist fixed in v6.3.6, currently 7 tokens

## CRITICAL: MiniMax Cost Crisis
$13.49/day average (8.4x over $48/mo budget). $236.68 balance = runs out Mar 25.
Root causes: (1) cache-create hemorrhage (31.5% of spend), (2) 344:1 input:output ratio — full 50K+ system prompt sent to EVERY sub-agent call, (3) no cost tracking in API.

## v7.0 Scope (3 pillars)

### Pillar 1: Strategic Orchestrator
New decision layer ABOVE the 5 sub-agents. After sub-agents complete, it decides what to do.
- Decision Engine: 12 rules in config/decision-rules.json
- Playbook Engine: PB-001 to PB-004 state machines
- Context Engine: assembles relevant docs per LLM call (max 8K tokens)
- 8 new REST endpoints under /api/v1/strategy/*
- 5 new DB tables (migration 010)

### Pillar 2: Cost Guard
- Daily $10 MiniMax cap with auto-throttle to Bankr/GPT-5-Nano
- Cost tracker JSON at /data/workspace/memory/cost-tracker.json
- Cache pin on boot (warm MiniMax cache = 12.5x cheaper reads)
- Wire cost data into existing /costs/summary and /costs/by-agent endpoints

### Pillar 3: Context Slim
- Per-agent trimmed prompts (1-3K tokens instead of 50K+)
- 5 slim context files in skills/agent-contexts/
- 96% input token reduction per scan cycle

## Key Paths
```
Skills baked:     /opt/buzz-workspace-skills/  → synced to /data/workspace/skills/ on boot
REST API:         /opt/buzz-api/               → server.js, routes/, migrations/, lib/
Config:           /opt/buzz-config/            → decision-rules.json, scoring-rubric.json
Database:         /data/buzz-api/buzz.db       (13 tables, WAL mode)
Pipeline files:   /data/workspace/memory/pipeline/*.json
Cost tracker:     /data/workspace/memory/cost-tracker.json
```

## New Files for v7.0
```
api/lib/context-engine.js           — Context assembly
api/lib/decision-engine.js          — Rules evaluation + LLM fallback
api/lib/playbook-engine.js          — State machines PB-001 to PB-004
api/lib/strategic-orchestrator.js   — Main entry point
api/routes/strategy.js              — 8 new REST endpoints
api/migrations/010-strategic.js     — 5 new tables
api/__tests__/strategic.test.js     — 25 unit tests
config/decision-rules.json          — 12 decision rules
config/scoring-rubric.json          — 100-point scoring system
config/listing-package.json         — SolCex listing benefits (NO commission)
config/master-ops-context.md        — Condensed LLM context (~2K tokens)
skills/cost-guard/skill.md          — Daily budget enforcement
skills/agent-contexts/*.md          — 5 per-agent slim contexts
prompts/*.md                        — 5 enhanced system prompts
```

## Build Rules
- ALWAYS delete api/node_modules + api/package-lock.json before Docker build
- ALWAYS --no-cache for Docker builds
- ALWAYS increment version tag (Akash caches by tag)
- better-sqlite3 needs build-essential in Dockerfile (native C++ compile)
- MiniMax MUST use anthropic-messages API format at api.minimax.io/anthropic
- NEVER expose: commission ($1K/listing), API keys, wallet private keys

## Boot Warnings to Fix (from v6.3.6)
- Scan cron directive: 0/4 crons have correct endpoint
- Buzz directive not loading (5-layer ops rules)
- 16/20 skills (4 missing)
- Moltbook calendar not loading

## Pipeline Stages
discovered → scanned → scored → prospect → contacted → negotiating → approved → listed | rejected

## Scoring
85-100=HOT, 70-84=QUALIFIED, 50-69=WATCH, 0-49=SKIP

## MiniMax Pricing
cache-create: $0.375/M tokens | cache-read: $0.03/M (12.5x cheaper)
chatcompletion input: $0.30/M | output: $1.50/M

## Conventions
- REST: /api/v1/, auth via X-API-Key header
- JVR receipts on every operation
- Error format: { error: string, code: string }
- Timestamps: ISO 8601 UTC, display WIB (UTC+7)
- Jest for tests, in-memory SQLite for test isolation
