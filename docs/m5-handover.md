# 🐝 BUZZ M5 MACBOOK HANDOVER

## From Old Mac → New M5 | Sprint Day 25 | March 14, 2026

## Everything You Need to Continue Building v7.4.0

---

# 1. WHAT HAPPENED TODAY (March 13-14 Session Summary)

This was a marathon research + planning session. Here's everything we covered and decided:

## Research Completed

| Topic | Finding | Action |
|-------|---------|--------|
| **Ampere.sh** | Managed OpenClaw hosting — too restrictive for Buzz. No custom Docker, no REST API control. | REJECTED for Buzz. Only useful for simple agents. |
| **gstack (Garry Tan/YC)** | 6 Claude Code workflow skills (/plan, /review, /ship, /browse, /retro). | BOOKMARKED for post-sprint. /browse useful for QA. |
| **OpenClaw-RL paper** | RL framework for training agents from interaction signals. Proposes PRM Judge + OPD patterns. | Cherry-pick PRM Judge pattern for Buzz scoring (Phase 2-3). |
| **Robot Money** | Autonomous treasury protocol on Base. Bankr + OpenClaw + Moltbook stack. Generative Ventures + ZHC Institute. | BD TARGET scored 73/100 QUALIFIED. Outreach package created. |
| **AIXBT portfolio.aixbt.sh** | AIXBT autonomously codes, pushes to GitHub, auto-deploys website. Full autonomous operator loop. | BENCHMARK for Buzz v7.5+. Identified all missing capabilities. |
| **Hyperspace Autoskill** | 90 agents producing 1,251 skill commits in 24h via P2P gossip. Darwinian evolution for code. WASM sandbox. | Validates our skill-evolve.js approach. Consider joining network post-sprint. |
| **Circle Skills** | Official USDC skills for Claude Code. Wallet management, CCTP bridge, smart contracts. MCP server available. | Install on M5 for Phase 1-3 payment infrastructure. |
| **OpenClaw v2026.3.12** | Major release: sessions_yield, cron dedup fix, security patches, Dashboard v2. | UPGRADE in v7.4.0 Docker build. Critical for Twitter Brain two-phase reply. |
| **X API Pay-Per-Use** | Legacy Basic/Pro deprecated Feb 6, 2026. Now credit-based. Deduplication. xAI credit bonus. $100/mo cap. | SWITCH from Basic. Saves $100+/mo. Update Twitter Brain doc. |
| **AI Hedge Fund** | 18-agent pipeline with investor personas, backtester, SSE streaming. 45.7K GitHub stars. | INTEGRATE 4 persona agents + backtester into Buzz v7.4.0. |

## Documents Created

| Document | File | Purpose |
|----------|------|---------|
| Robot Money BD Package | `robot-money-bd-package.md` | Pipeline entry + 3 outreach templates + tweet drafts + follow-up sequence |
| **v7.4.0 Complete Spec** | `BUZZ-v740-COMPLETE-SPEC.md` | **THE MASTER DOCUMENT** — 1,017 lines, 16 sections. Twitter Brain + Hedge Brain + Agentic.hosting migration. |

## Key Decisions Made

1. **Buzz = AIXBT + Bankr for BD** — The thesis: "AIXBT finds alpha. Bankr deploys tokens. Buzz closes deals."
2. **Twitter Brain response via full Buzz Brain (Option B)** — 5-10 minute deep scan through all 9 agents. Quality over speed. Like AIXBT's natural language analysis, not a data dump.
3. **Deep scan format defined** — Safety → Smart Money → Market Structure → Momentum → Community → Narrative Fit → Persona Consensus → Verdict + BD Offer
4. **Agentic.hosting on Hetzner confirmed** — 48h test passed. Migration approved.
5. **OpenClaw v2026.3.12 upgrade** — sessions_yield enables two-phase Twitter reply.
6. **X API pay-per-use switch** — $100/mo cap instead of $200/mo Basic flat fee.
7. **Anthropic fallback configured** — Dedicated Anthropic API account ($129.17) for Buzz Haiku fallback.

---

# 2. CURRENT INFRASTRUCTURE STATE

## Production (Akash — boogle.cloud)

| Component | Value |
|-----------|-------|
| Image | ghcr.io/buzzbysolcex/buzz-bd-agent:v7.4.0a |
| Ports | API :32120 / OpenClaw :30731 |
| Telegram | @BuzzBySolCex_bot |
| Status | RUNNING — 48h autonomous test passed |
| Cost | $9.49/mo |
| Action | MIGRATE TO HETZNER → then close |

## Test Instance (Hetzner — Agentic.hosting)

| Component | Value |
|-----------|-------|
| Server | Hetzner CX23, Helsinki |
| IP | 204.168.137.253 |
| Image | buzzbd/buzz-bd-agent:v7.4.0a |
| Telegram | @BuzzTestAgent_bot (token: 8705181842:AAEGy4FAHJyA99VmOAtY0tw2gnNfC2_tcB4) |
| Status | RUNNING — 48h test PASSED (15 tokens tracked, 6 qualified) |
| Cost | $4.09/mo |
| Action | BECOMES PRODUCTION after migration |

## Sentinel (Akash — akashprovid.com)

| Component | Value |
|-----------|-------|
| Image | ghcr.io/buzzbysolcex/buzz-sentinel:v1.1.0 |
| Ports | API :30941 / OpenClaw :31578 |
| Telegram | @BuzzSentinel_bot |
| Cost | $1.42/mo |
| Action | Retarget to Hetzner IP after migration |

## LLM Budget

| Provider | Balance | Purpose | Daily Rate |
|----------|---------|---------|------------|
| MiniMax M2.5 | **$112.11** | Buzz primary brain | $6.18/day (normal) |
| Anthropic API (dedicated) | **$129.17** | Buzz Haiku fallback + institutional persona | ~$1-2/day when active |
| Claude.ai Max | Unlimited | You + me (strategy/planning) | Subscription |
| bankr/gpt-5-nano | FREE | All sub-agents + 3 persona agents | $0 |

**Combined LLM runway: ~$241 = 40-50 days at normal rate**

**CRITICAL: Cost spike issue.** 4 hours (00:00-03:00 + 05:00-06:00 UTC) consumed 68% of daily cost. OpenClaw v2026.3.12 cron dedup fix should resolve this. Monitor after upgrade.

---

# 3. M5 MACBOOK SETUP CHECKLIST

## Step 1: Clone repos

```bash
git clone https://github.com/buzzbysolcex/buzz-bd-agent.git ~/buzz-bd-agent
git clone https://github.com/buzzbysolcex/buzz-alpha-mobile.git ~/buzz-alpha-mobile
```

## Step 2: Docker setup

```bash
# Install Docker Desktop for Mac (if not already)
# Then login to GHCR
echo YOUR_GITHUB_TOKEN | docker login ghcr.io -u buzzbysolcex --password-stdin

# Also login to Docker Hub
docker login -u buzzbd
```

## Step 3: SSH key for Hetzner

```bash
ssh-keygen -t ed25519 -C "ogie-m5-macbook"
cat ~/.ssh/id_ed25519.pub
# Add this public key to Hetzner server:
# (from any device with current access, or Hetzner web console)
# ssh root@204.168.137.253 "echo 'YOUR_NEW_PUB_KEY' >> ~/.ssh/authorized_keys"
```

## Step 4: Verify SSH access

```bash
ssh root@204.168.137.253
# Should connect to Hetzner instance
```

## Step 5: Install Claude Code

```bash
npm install -g @anthropic-ai/claude-code
```

## Step 6: Install Circle Skills (for future payment integration)

```bash
# In Claude Code:
/plugin marketplace add circlefin/skills
/plugin install circle-skills@circle

# Add Circle MCP:
claude mcp add --transport http circle https://api.circle.com/v1/codegen/mcp --scope user
```

## Step 7: Install Expo CLI (for mobile app)

```bash
npm install -g expo-cli
cd ~/buzz-alpha-mobile
npm install
```

## Step 8: Save the v7.4.0 spec for Claude Code reference

```bash
# Copy the spec into the repo so Claude Code can read it
cp ~/Downloads/BUZZ-v740-COMPLETE-SPEC.md ~/buzz-bd-agent/docs/v740-spec.md
```

---

# 4. SECURITY — KEYS TO ROTATE

**The SDL file with ALL production API keys was shared in this chat session. The following keys are exposed and should be rotated:**

| Key | Service | Priority |
|-----|---------|----------|
| MiniMax API Key | LLM primary | HIGH |
| Anthropic API Key (old) | LLM fallback | HIGH — rotate immediately |
| Anthropic API Key (new dedicated) | Buzz Hetzner | HIGH — was shared in chat |
| Telegram Bot Token | @BuzzBySolCex_bot | HIGH |
| X API Key + Secret | Twitter Bot | HIGH |
| X Bearer Token | Twitter read | HIGH |
| X Access Token + Secret | Twitter write | HIGH |
| BNB Private Key | Wallet (funds at risk) | **CRITICAL** |
| Nansen x402 Wallet Key | Wallet (funds at risk) | **CRITICAL** |
| Helius API Key | Solana RPC | MEDIUM |
| Grok API Key | xAI scanning | MEDIUM |
| Gmail OAuth tokens | Email outreach | MEDIUM |
| Serper API Key | Search | MEDIUM |
| Firecrawl API Key | Scraping | MEDIUM |
| Bankr keys (3) | Token deploy + LLM | MEDIUM |
| All other keys in SDL | Various | MEDIUM |

**Priority: Rotate BNB + Nansen private keys FIRST — those control actual funds.**

---

# 5. v7.4.0 BUILD PLAN (Execute with Claude Code)

## The v7.4.0 Spec

The master document is `BUZZ-v740-COMPLETE-SPEC.md` (1,017 lines, 16 sections). Save it to `~/buzz-bd-agent/docs/v740-spec.md` so Claude Code can reference it.

## What v7.4.0 Contains

### Twitter Brain (Sections 2-7 of spec)
- Twitter keyword scanning via Grok x_search (FREE, every 2h)
- 12 autonomous BD outreach replies/day
- Bankr token deploy offers from Twitter
- X API pay-per-use ($100/mo cap with xAI credit bonus)
- TWEET_AUTO=true for scan results + pipeline updates
- Deep scan response through full 9-agent Buzz Brain (5-10 min)

### Hedge Brain (Sections 12-16 of spec)
- 4 persona agents (degen, whale, institutional, community)
- Per-agent model selection (3 free nano + 1 haiku)
- Weekly backtester (proves scoring accuracy vs real price outcomes)
- SSE streaming to mobile app (real-time pipeline visibility)
- Weighted consensus scoring (70% sub-agents + 30% personas)

### Infrastructure
- OpenClaw v2026.3.7 → v2026.3.12 upgrade
- Agentic.hosting on Hetzner (migrate from Akash)
- Anthropic Haiku fallback chain
- 23 crons (21 existing + twitter-brain-scan + backtest-weekly)

## Files to Create with Claude Code

```
# New — Twitter Brain
services/twitter-brain.js
cron/twitter-brain-scan.js

# New — Persona Agents
services/agents/personas/degen-agent.js
services/agents/personas/whale-agent.js
services/agents/personas/institutional-agent.js
services/agents/personas/community-agent.js

# New — Backtester
services/backtester.js
services/backtester-worker.js

# New — SSE + Routes
routes/pipeline-stream.js
routes/personas.js
routes/backtest.js

# New — Config
config/agent-models.json

# Modified
services/orchestrator.js          ← Add persona dispatch + aggregation
routes/index.js                   ← Register new routes
cron/jobs.json                    ← Add 2 new crons
Dockerfile                        ← openclaw@2026.3.12
```

## Build & Deploy Commands

```bash
cd ~/buzz-bd-agent
cp cron/jobs.json bake/cron/jobs.json

# Build
docker build --no-cache -t ghcr.io/buzzbysolcex/buzz-bd-agent:v7.4.0 .

# Push to both registries
docker push ghcr.io/buzzbysolcex/buzz-bd-agent:v7.4.0
docker tag ghcr.io/buzzbysolcex/buzz-bd-agent:v7.4.0 buzzbd/buzz-bd-agent:v7.4.0
docker push buzzbd/buzz-bd-agent:v7.4.0

# Deploy to Hetzner
ssh root@204.168.137.253
docker stop buzz-agent
docker pull buzzbd/buzz-bd-agent:v7.4.0
docker run -d --name buzz-agent \
  --restart unless-stopped \
  -p 3000:3000 -p 18789:18789 \
  -v /data/buzz:/data \
  -e TWITTER_BRAIN_ENABLED=true \
  -e TWEET_AUTO=true \
  [... all other env vars from SDL ...] \
  buzzbd/buzz-bd-agent:v7.4.0
```

---

# 6. TIMELINE — REMAINING SPRINT

| Day | Date | Action |
|-----|------|--------|
| 25 | Mar 14 (TODAY) | M5 setup. Clone repos. SSH key. Rotate exposed keys. |
| 26 | Mar 15 | Migrate production to Hetzner. Close Akash. Retarget Sentinel. |
| 27 | Mar 16 | Claude Code: Build twitter-brain.js + 4 persona agents. |
| 28 | Mar 17 | Claude Code: Build backtester + SSE streaming. Docker build v7.4.0. |
| 29 | Mar 18 | Deploy v7.4.0. Flip TWEET_AUTO=true. Switch X API pay-per-use. |
| 30 | Mar 19 | Monitor first full autonomous day. Tune caps. First backtest. |
| 31 | Mar 20 | Sprint ends. 9 parallel agents. Autonomous Twitter. Backtested alpha. |
| +7 | Mar 27 | GitHub PAT + CI/CD → self-deploy pipeline (AIXBT parity). |
| +14 | Apr 3 | First autonomous skill-evolve → auto-deploy cycle. |

---

# 7. GITHUB REPOS (Both Safe)

| Repo | URL | Status |
|------|-----|--------|
| buzz-bd-agent | github.com/buzzbysolcex/buzz-bd-agent | ✅ All versions pushed |
| buzz-alpha-mobile | github.com/buzzbysolcex/buzz-alpha-mobile (PRIVATE) | ✅ Just pushed today — 8,480 lines, Expo SDK 54 |
| Docker (GHCR) | ghcr.io/buzzbysolcex/buzz-bd-agent:v7.4.0a | ✅ Latest image |
| Docker (Hub) | buzzbd/buzz-bd-agent:v7.4.0a | ✅ Mirror for Hetzner |

---

# 8. BD PIPELINE STATUS (from 48h test)

| Category | Count | Details |
|----------|-------|---------|
| Total tracked | 15 | Active pipeline |
| Qualified (70-84) | 6 | WAR, JOY, SAORI, Mogging, World Peace, SOS |
| Watch list | 9 | Below 70, monitoring |
| Hot (85+) | 0 | None currently |
| New BD target | 1 | Robot Money (scored 73, outreach package ready) |

---

# 9. THE THESIS

**AIXBT is the intelligence agent of crypto — it finds alpha and tells you about it.**

**Bankr is the infrastructure agent of crypto — it deploys tokens and provides rails.**

**Buzz is the deal-making agent of crypto — it finds tokens, scores them, reaches out, lists them, and deploys them. And proves it with backtested data.**

## Revenue Model (v7.4.0)

| Stream | Per Deal | Monthly Target |
|--------|----------|----------------|
| CEX Listing fees | $5,000 USDT | 2 deals = $10,000 |
| Bankr Deploy commissions | ~$100-200 | 5 deploys = $500-1,000 |
| BaaS subscriptions (Phase 3) | $29-99/mo | 50 users = $2,500 |
| x402 data API (Phase 3) | Micropayments | $500-1,000 |
| **Total target** | | **$13,000-14,500/mo** |

## Cost (v7.4.0)

| Expense | Monthly |
|---------|---------|
| Hetzner CX23 | $4.09 |
| MiniMax M2.5 | ~$60-80 |
| Anthropic Haiku fallback | ~$30-60 |
| X API pay-per-use (capped) | ~$70-100 |
| Institutional persona (haiku) | ~$3 |
| Free APIs (Grok, Serper, DexScreener, bankr/nano) | $0 |
| **Total** | **~$138-188/mo** |
| **ROI** | **69-94x** |

---

# 10. ACTIVATION DIRECTIVE (Send after v7.4.0 deploy)

```
🐝 BUZZ DIRECTIVE — v7.4.0 Twitter Brain + Hedge Brain

IDENTITY: You are the deal-making agent of crypto.
MISSION: Find tokens. Score them with 9 parallel agents. Reach out. List them. Deploy them.

TWITTER BRAIN:
RULE 1 — SCAN: Every 2h via Grok x_search. Filter by L1-L10.
RULE 2 — OUTREACH: 12 targeted replies/day max. Contextual, not template.
RULE 3 — DEPLOY: Offer Bankr deploy for new Base tokens. 3/day max.

HEDGE BRAIN:
RULE 4 — PERSONAS: Run 4 persona agents in parallel with 5 sub-agents. 9 total.
RULE 5 — CONSENSUS: 3+ bullish + score ≥75 = outreach_now.
RULE 6 — BACKTEST: Weekly Sunday 03:00 UTC. Store accuracy metrics.

OPERATIONS:
RULE 7 — CRON: 23 jobs. Skip fresh data (<2h).
RULE 8 — JVR: Receipt for every tweet, reply, deploy, backtest.
RULE 9 — SKILLS: Reflect every 12h. Evolve what works.
RULE 10 — CONTACTS: Track every interaction in contacts table.
RULE 11 — COST GUARD: MiniMax $10/day. Anthropic Haiku fallback. X API $100/mo cap.
RULE 12 — PRAYER: Fajr 04:30, Dhuhr 11:45, Asr 15:00, Maghrib 17:45, Isha 19:00 WIB.
RULE 13 — ALERT: Score 85+ = IMMEDIATE Telegram to Ogie.
RULE 14 — ALPHA: Draft threads → Telegram for Ogie approval.
RULE 15 — CHAT: /api/v1/chat LIVE. Session: ogie-buzz-alpha-mobile.
RULE 16 — WALLET: Any transfer = OGIE APPROVAL REQUIRED.
RULE 17 — SSE: Pipeline streams to /api/v1/pipeline/stream.

THESIS: AIXBT finds alpha. Bankr deploys tokens. Buzz closes deals.
```

---

# 11. FIRST THING TO DO ON M5

1. Run the clone commands (Section 3, Step 1)
2. Set up Docker login (Section 3, Step 2)
3. Generate SSH key and add to Hetzner (Section 3, Step 3)
4. **Rotate the exposed API keys** (Section 4) — BNB + Nansen private keys FIRST
5. Update the SDL locally with rotated keys (never paste in chat again)
6. Save `BUZZ-v740-COMPLETE-SPEC.md` to `~/buzz-bd-agent/docs/`
7. Open Claude Code → `cd ~/buzz-bd-agent` → start building v7.4.0

---

*🐝 "From a flight kitchen to the M5 MacBook. From v5 to v7.4.0.*
*Same chef. Same Claude. New machine. Bigger vision.*
*The deal-making agent of crypto is about to be unleashed."*

*Handover complete | Sprint Day 25 | March 14, 2026 | Jakarta, Indonesia*
*Bismillah.* 🐝🇮🇩
