PRIORITY TASK: Deploy Agent Skills Discovery at buzzbd.ai/.well-known/skills/

CONTEXT:
Agent Skills is an open standard (agentskills.io) adopted by 26+ platforms including 
Claude Code, OpenAI Codex, Gemini CLI, GitHub Copilot, Cursor, and more. Publishing 
a skill at buzzbd.ai/.well-known/skills/ makes Buzz auto-discoverable by ANY AI agent 
on ANY of these platforms. Zero configuration needed — agents find Buzz, read the skill, 
and start calling the API.

This follows the Cloudflare Well-Known Discovery RFC (RFC 8615 pattern). Same as how 
.well-known/security.txt and .well-known/acme-challenge/ work.

WHY THIS MATTERS:
Today Buzz intelligence is only accessible via War Room, Claude Code on Hetzner, 
and buzzbd.ai dashboard. After this deploy, Buzz becomes accessible to:
- Any developer's AI coding agent asking about token listing data
- Other AI agents that discover Buzz and want to consume its intelligence
- Machine-to-machine queries paid via x402 ($0.01-$0.05 per request)
This is Buzz as a PLATFORM, not just an internal tool.

REFERENCE: Lume (lume.top) already does this for prediction market trading.
Their skill at lume.top/.well-known/skills/ lets any agent discover, onboard, 
and start trading autonomously. We're doing the same for listing intelligence.

═══════════════════════════════════════
STEP 1: CREATE DIRECTORY STRUCTURE
═══════════════════════════════════════

mkdir -p /var/www/buzzbd.ai/.well-known/skills/buzz-bd-listing/references

Final structure:
/.well-known/skills/
├── index.json                          ← Discovery index (required)
└── buzz-bd-listing/                    ← Skill directory
    ├── SKILL.md                        ← Main skill file (required)
    └── references/                     ← Detailed docs (on-demand)
        ├── API_REFERENCE.md
        ├── EXAMPLES.md
        └── SCORING.md

═══════════════════════════════════════
STEP 2: CREATE index.json
═══════════════════════════════════════

File: /var/www/buzzbd.ai/.well-known/skills/index.json

```json
{
  "skills": [
    {
      "name": "buzz-bd-listing",
      "description": "Interact with Buzz BD Agent — an autonomous AI-powered exchange listing intelligence service for SolCex Exchange. Query the token pipeline (192+ tokens across multiple chains), get 5-layer scoring (Safety, Wallet, Technical, Social, Composite), access the Signal Factory for daily market signals, and consume listing intelligence reports. Supports x402 micropayments for keyless pay-per-request access. Built on Solana, powered by Claude Opus 4.6.",
      "files": [
        "SKILL.md",
        "references/API_REFERENCE.md",
        "references/EXAMPLES.md",
        "references/SCORING.md"
      ]
    }
  ]
}
```

Rules:
- name: 1-64 chars, lowercase alphanumeric + hyphens only
- description: 1-1024 chars (this is what agents see at discovery time ~50 tokens)
- files: SKILL.md MUST be first entry

═══════════════════════════════════════
STEP 3: CREATE SKILL.md
═══════════════════════════════════════

File: /var/www/buzzbd.ai/.well-known/skills/buzz-bd-listing/SKILL.md

```markdown
---
name: buzz-bd-listing
description: Token listing intelligence from Buzz BD Agent at SolCex Exchange
version: 1.0.0
---

# Buzz BD Agent — Listing Intelligence Skill

Buzz is an autonomous AI-powered BD (Business Development) agent that discovers, 
scores, and evaluates crypto tokens for listing on SolCex Exchange — a Solana-native 
centralized exchange registered in Colorado (SOS + FinCEN MSB).

## What You Can Do

1. **Query the Pipeline** — Browse 192+ tokens across multiple chains with scoring data
2. **Deep Scan a Token** — Get 5-layer scoring: Safety, Wallet, Technical, Social, Composite
3. **Access Signals** — Daily market signals from the AIBTC Signal Factory (06:00 UTC)
4. **Read Intelligence Reports** — Weekly Listing Intelligence Report (Sundays)
5. **Check Competitive Landscape** — Colosseum Copilot integration (5,400+ Solana projects)

## API Base URL

```
https://api.buzzbd.ai/api/v1
```

All endpoints require an API key header:
```
X-API-Key: <your-key>
```

Or use x402 micropayments for keyless access (see references/API_REFERENCE.md).

## Quick Start

### Get Pipeline Overview
```bash
curl https://api.buzzbd.ai/api/v1/pipeline \
  -H "X-API-Key: YOUR_KEY"
```

### Scan a Specific Token
```bash
curl https://api.buzzbd.ai/api/v1/raw/scan/TOKEN_ADDRESS \
  -H "X-API-Key: YOUR_KEY"
```

### Get Token Score
```bash
curl https://api.buzzbd.ai/api/v1/raw/scores/TOKEN_ADDRESS \
  -H "X-API-Key: YOUR_KEY"
```

## Scoring System

Tokens are scored 0-100 across 5 dimensions:
- **Safety** (25%): Token Sniffer, Go+ Security, honeypot detection
- **Wallet** (25%): Holder distribution, FDV gap, circulating supply
- **Technical** (20%): OHLCV, RSI, MACD, volume patterns
- **Social** (15%): Community size, engagement, team visibility
- **Composite** (15%): Overall market positioning

Classifications:
- **HOT** (85+): Immediate BD outreach candidate
- **QUALIFIED** (70-84): Queue for review
- **WATCH** (50-69): Monitor
- **SKIP** (<50): Archive

## x402 Micropayment Access

Three premium endpoints available via x402 protocol (no API key needed):
- Pipeline intelligence: $0.01/request
- Token deep scan: $0.03/request  
- Signal Factory report: $0.05/request

Registered on 402index.io (IDs: 464fbecf, d5e01052, a9f75673).

## More Information

- [API Reference](references/API_REFERENCE.md) — Full endpoint documentation
- [Examples](references/EXAMPLES.md) — Common query patterns and workflows
- [Scoring Methodology](references/SCORING.md) — How scores are calculated

## About SolCex Exchange

SolCex is a Solana-native centralized exchange offering:
- Free market making (3 months)
- 450 whale wallet airdrop program
- 10-14 day fast-track listing process

Website: https://buzzbd.ai
Twitter: @BuzzBySolCex
```

═══════════════════════════════════════
STEP 4: CREATE references/API_REFERENCE.md
═══════════════════════════════════════

File: /var/www/buzzbd.ai/.well-known/skills/buzz-bd-listing/references/API_REFERENCE.md

```markdown
# Buzz BD Agent — API Reference

## Base URL
```
https://api.buzzbd.ai/api/v1
```

## Authentication
All requests require: `X-API-Key: <key>` header
Or use x402 micropayments for keyless access.

## Pipeline Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /pipeline | Full pipeline overview (all tokens) |
| GET | /pipeline?status=HOT | Filter by classification |
| GET | /pipeline?chain=SOL | Filter by chain |

## Raw Data Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /raw/scan/:address | DexScreener + AIXBT + CMC data |
| GET | /raw/safety/:address | RugCheck + security checks |
| GET | /raw/wallet/:address | Holder distribution + wallet analysis |
| GET | /raw/social/:address | Social metrics + community data |
| GET | /raw/technical/:address | OHLCV + RSI + MACD |
| GET | /raw/scores/:address | All sub-scores + composite |
| GET | /raw/simulate/:address | Full data package for simulation |

## Copilot Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /copilot/status | Colosseum Copilot connection status |
| GET | /copilot/search?q=query | Search 5,400+ hackathon projects |
| GET | /copilot/enrich/:tokenName | Hackathon enrichment for a token |
| GET | /copilot/cluster/:key | Explore project cluster |
| GET | /copilot/trends | Weekly hackathon trend comparison |
| GET | /copilot/landscape?q=query | Full competitive landscape |

## Activity Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /board/activity | Pipeline activity feed |
| GET | /board/summary | Dashboard summary |
| POST | /chains/start | Start task chain from template |
| GET | /chains | List recent task chains |
| GET | /inbox/:agent | Get agent inbox |

## Response Format

All endpoints return JSON:
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2026-03-28T10:00:00Z"
}
```

## Rate Limits
- Standard: 60 requests/minute
- x402: 30 requests/minute
- Burst: 10 requests/second

## x402 Endpoints (keyless)
```
POST https://api.buzzbd.ai/x402/pipeline    ($0.01)
POST https://api.buzzbd.ai/x402/scan         ($0.03)
POST https://api.buzzbd.ai/x402/signal       ($0.05)
```
Payment via Lightning Network or on-chain USDC.
```

═══════════════════════════════════════
STEP 5: CREATE references/EXAMPLES.md
═══════════════════════════════════════

File: /var/www/buzzbd.ai/.well-known/skills/buzz-bd-listing/references/EXAMPLES.md

```markdown
# Buzz BD Agent — Example Queries

## 1. Get All HOT Tokens
```bash
curl https://api.buzzbd.ai/api/v1/pipeline?status=HOT \
  -H "X-API-Key: YOUR_KEY"
```
Returns tokens scoring 85+ — immediate BD outreach candidates.

## 2. Deep Scan a Specific Token
```bash
# Get the full scan data
curl https://api.buzzbd.ai/api/v1/raw/scan/So11111111111111111111111111111111111111112 \
  -H "X-API-Key: YOUR_KEY"

# Get just the scores
curl https://api.buzzbd.ai/api/v1/raw/scores/So11111111111111111111111111111111111111112 \
  -H "X-API-Key: YOUR_KEY"
```

## 3. Check Security Before Listing
```bash
curl https://api.buzzbd.ai/api/v1/raw/safety/TOKEN_ADDRESS \
  -H "X-API-Key: YOUR_KEY"
```
Returns: Token Sniffer score, Go+ Security issues, honeypot detection, sell tax.

## 4. Search Hackathon Projects (via Colosseum Copilot)
```bash
# Find related projects in 5,400+ Colosseum submissions
curl "https://api.buzzbd.ai/api/v1/copilot/search?q=AI%20agent%20trading" \
  -H "X-API-Key: YOUR_KEY"

# Enrich a token with hackathon intelligence
curl https://api.buzzbd.ai/api/v1/copilot/enrich/PIPPIN \
  -H "X-API-Key: YOUR_KEY"
```

## 5. Get Pipeline Activity Feed
```bash
curl https://api.buzzbd.ai/api/v1/board/activity \
  -H "X-API-Key: YOUR_KEY"
```
Returns recent pipeline events: discoveries, score changes, outreach status.

## 6. Workflow: Evaluate a Token for Listing

Step 1: Scan the token
Step 2: Check security
Step 3: Review scores
Step 4: Check hackathon history (Copilot enrichment)
Step 5: Decide: HOT → outreach, QUALIFIED → queue, SKIP → archive

```bash
# All-in-one simulation package
curl https://api.buzzbd.ai/api/v1/raw/simulate/TOKEN_ADDRESS \
  -H "X-API-Key: YOUR_KEY"
```
```

═══════════════════════════════════════
STEP 6: CREATE references/SCORING.md
═══════════════════════════════════════

File: /var/www/buzzbd.ai/.well-known/skills/buzz-bd-listing/references/SCORING.md

```markdown
# Buzz BD Agent — Scoring Methodology

## 5-Layer Scoring Pipeline

Every token is scored 0-100 using a weighted composite of 5 dimensions.
All scoring is rule-based (zero LLM cost). Tokens scoring 70+ get a 
qualitative override from Claude Opus 4.6.

## Dimensions

### Safety Score (25% weight)
- Token Sniffer: ≥70 pass, 30-69 caution, <30 fail (-25 penalty)
- Go+ Security: 0 issues pass, 1-2 caution, 3+ fail (-30 penalty)
- Honeypot detection: Any positive = auto-exclude
- Sell tax: 0% pass, 0.1-2% caution, >2% fail (-20 penalty)

### Wallet Score (25% weight)
- Holder count and distribution
- FDV Gap penalty:
  - <30% gap: no penalty
  - 30-50%: -5 points
  - 50-75%: -10 points
  - >75%: -15 points
  - >90%: -20 points + RED FLAG
- Circulating supply vs total supply
- Top wallet concentration

### Technical Score (20% weight)
- OHLCV (Open, High, Low, Close, Volume) patterns
- RSI (Relative Strength Index)
- MACD (Moving Average Convergence Divergence)
- Volume trend analysis
- Price stability metrics

### Social Score (15% weight)
- Community size (Twitter, Telegram, Discord)
- Engagement rates
- Team visibility and doxxed status
- Content frequency and quality

### Composite Score (15% weight)
- Overall market positioning
- Exchange coverage (number of existing listings)
- Liquidity depth across DEXes
- Market cap classification

## Auto-Exclusion Rules
- Known stablecoins (USDC, USDT, DAI, etc.)
- Ghost tokens: <10 holders OR <$100 daily volume
- Phantom tokens: No DEX pair found
- Honeypot detected

## Classification Thresholds
- HOT (85+): Immediate BD outreach
- QUALIFIED (70-84): Queue for review
- WATCH (50-69): Monitor
- SKIP (<50): Archive

## BD Readiness (for HOT tokens)
- BD SWEET SPOT: Circ MCap $500K-$50M, 2-8 exchanges, Liq >$100K, clean security
- POTENTIAL: Meets most criteria, 1-2 concerns
- TOO BIG: MCap >$100M or 10+ exchanges
- TOO RISKY: Security fails, ghost token, honeypot

## Colosseum Enrichment Bonuses
- Found in Colosseum hackathon submissions: +5
- Prize winner: +10
- Accelerator backed: +15
(Bonuses don't stack — highest applicable)

## Triple Verification
All public data must pass triple verification:
DexScreener + DexTools + Internal validation.
VERIFIED or blocked from pipeline.
```

═══════════════════════════════════════
STEP 7: UPDATE CADDY CONFIGURATION
═══════════════════════════════════════

Add to the existing Caddyfile for buzzbd.ai:

```caddyfile
# Add this block inside the buzzbd.ai server block
# Agent Skills Discovery (Cloudflare Well-Known RFC)
handle /.well-known/skills/* {
    root * /var/www/buzzbd.ai
    file_server

    @json path *.json
    header @json Content-Type "application/json; charset=utf-8"

    @md path *.md
    header @md Content-Type "text/markdown; charset=utf-8"

    header Cache-Control "public, max-age=3600"
    header Access-Control-Allow-Origin "*"
    header Access-Control-Allow-Methods "GET, HEAD, OPTIONS"
}
```

Then reload Caddy:
  systemctl reload caddy
  OR
  caddy reload --config /etc/caddy/Caddyfile

═══════════════════════════════════════
STEP 8: VERIFY DEPLOYMENT
═══════════════════════════════════════

Run these verification checks:

1. Discovery index:
   curl -s https://buzzbd.ai/.well-known/skills/index.json | jq .

2. Main skill file:
   curl -s https://buzzbd.ai/.well-known/skills/buzz-bd-listing/SKILL.md | head -20

3. Reference files:
   curl -s https://buzzbd.ai/.well-known/skills/buzz-bd-listing/references/API_REFERENCE.md | head -10
   curl -s https://buzzbd.ai/.well-known/skills/buzz-bd-listing/references/EXAMPLES.md | head -10
   curl -s https://buzzbd.ai/.well-known/skills/buzz-bd-listing/references/SCORING.md | head -10

4. Content types:
   curl -I https://buzzbd.ai/.well-known/skills/index.json 2>/dev/null | grep Content-Type
   # Expected: application/json; charset=utf-8

   curl -I https://buzzbd.ai/.well-known/skills/buzz-bd-listing/SKILL.md 2>/dev/null | grep Content-Type
   # Expected: text/markdown; charset=utf-8

5. CORS headers:
   curl -I https://buzzbd.ai/.well-known/skills/index.json 2>/dev/null | grep Access-Control
   # Expected: Access-Control-Allow-Origin: *

6. Skills CLI test (if npx available):
   npx skills add https://buzzbd.ai
   # Should auto-discover and list buzz-bd-listing

═══════════════════════════════════════
SECURITY CHECKLIST (CRITICAL)
═══════════════════════════════════════

Before deploying, verify NONE of these appear in ANY skill file:
- ❌ Hetzner IP (api.buzzbd.ai) — use domain names only
- ❌ Admin API keys or PATs
- ❌ Listing fee details ($5K USDT, $1K commission)
- ❌ Internal War Room chat IDs
- ❌ OAuth credentials or secrets
- ❌ Firecrawl API key
- ❌ Colosseum Copilot PAT

Only expose:
- ✅ Public domain names (api.buzzbd.ai, buzzbd.ai)
- ✅ Read-only endpoint paths
- ✅ x402 endpoint info (already public on 402index.io)
- ✅ Scoring methodology (public knowledge)
- ✅ General pipeline statistics

═══════════════════════════════════════
PERSISTENCE
═══════════════════════════════════════

1. Save this deployment as:
   /home/claude-code/buzz-workspace/docs/BUZZ-AGENT-SKILLS-DEPLOYMENT.md
2. Add to CLAUDE.md startup read order
3. This is PERMANENT — skill files at /.well-known/skills/ stay live

═══════════════════════════════════════
REPORT WHEN DONE
═══════════════════════════════════════

- ✅ Directory structure created
- ✅ index.json deployed
- ✅ SKILL.md deployed
- ✅ 3 reference files deployed (API_REFERENCE.md, EXAMPLES.md, SCORING.md)
- ✅ Caddy config updated + reloaded
- ✅ All 6 verification checks pass
- ✅ Security checklist verified (no secrets exposed)
- ✅ Document saved + added to CLAUDE.md
- URL: https://buzzbd.ai/.well-known/skills/index.json
