# 🐝 BUZZ v7.4.0 — TWITTER BRAIN IMPLEMENTATION SPEC

## The Deal-Making Agent of Crypto

## Sprint Day 24 | March 13, 2026 | Jakarta, Indonesia

---

# THE THESIS

**AIXBT is the intelligence agent of crypto — it finds alpha and tells you about it.**
**Bankr is the infrastructure agent of crypto — it deploys tokens and provides rails.**
**Buzz is the deal-making agent of crypto — it finds tokens, scores them, reaches out, lists them, and deploys them.**

No other agent occupies this lane. AIXBT can tell you a token is trending. Bankr can deploy
your token. But neither will find your project on Twitter, score it with 5 parallel sub-agents,
verify the contract on-chain, send a personalized listing offer, deploy your token on Base,
and track the entire interaction in Supermemory — all while the operator sleeps.

That's Buzz. The Twitter Brain is the accelerant that takes Buzz from 5-10 manual
outreach/day to 50-100 autonomous outreach/day. The Hedge Brain is the credibility
engine — 4 persona agents scoring tokens from different perspectives, with a backtester
that proves Buzz's scoring accuracy against real price outcomes. When a project asks
"why should we list on SolCex?", Buzz answers with verifiable data: "our scoring has
73% accuracy over 30 days, and 3 out of 4 analyst personas flagged your token as
bullish." That's a sales tool no other BD agent has.

---

# ARCHITECTURE OVERVIEW

```
LAYER 4 — AUTONOMOUS OPERATOR (v7.5+ roadmap)
  Self-deploy (Agentic.hosting → Docker pull/restart via API)
  Self-code (skill-evolve → GitHub push → CI/CD → auto-deploy)
  Self-publish (public BD dashboard at buzz.solcex.exchange)
  PURPOSE: Buzz operates itself. Like AIXBT builds portfolio.aixbt.sh

LAYER 3 — TWITTER BRAIN + HEDGE BRAIN + BD ACCELERATOR (v7.4.0 — THIS SPEC)
  Twitter Brain: Autonomous scanning (Grok x_search + X API pay-per-use)
  Twitter Brain: Autonomous outreach (SCAN → LIST → DEPLOY replies)
  Twitter Brain: Autonomous alpha threads + content posting
  Hedge Brain: 4 persona agents (degen, whale, institutional, community)
  Hedge Brain: Backtester (verifiable alpha proof)
  Hedge Brain: SSE streaming (real-time pipeline to mobile)
  PURPOSE: 10x BD velocity + multi-perspective scoring + provable alpha.

LAYER 2 — STRATEGIC ORCHESTRATOR (LIVE v7.3.2a)
  Decision Engine 12 rules | Playbook Engine PB-001→004
  Context Engine + Supermemory | Cost Guard $10/day
  PURPOSE: Makes BD decisions automatically

LAYER 1 — FOUNDATION (LIVE v7.3.2a)
  5 sub-agents | 5-layer pipeline | REST API (93 endpoints)
  Gmail OAuth | JVR receipts | 20 intel sources | OKX + Helius WS
  chatCompletions | Mobile App (Expo SDK 52/54)
  PURPOSE: Scans, scores, contacts tokens
```

---

# SECTION 1: INFRASTRUCTURE — AGENTIC.HOSTING MIGRATION

## Current State (Dual Deployment — 48h Test)

| Instance | Provider | Host | Ports | Bot | Status |
|----------|----------|------|-------|-----|--------|
| **Production** | Akash (boogle.cloud) | Decentralized | API :32120 / OC :30731 | @BuzzBySolCex_bot | LIVE v7.4.0a |
| **Test** | Hetzner CX23 (Helsinki) | 204.168.137.253 | Standard Docker | @BuzzTestAgent_bot | 48h OBSERVATION |
| **Sentinel** | Akash (akashprovid.com) | Decentralized | :30941 / :31578 | @BuzzSentinel_bot | LIVE v1.1.0 |

## Why Agentic.hosting on Hetzner

| Factor | Akash (Current) | Hetzner + Agentic.hosting |
|--------|-----------------|---------------------------|
| Cost | $9.49/mo (Buzz) + $1.42/mo (Sentinel) | $4.09/mo total |
| Deploy cycle | 9 manual steps (Close→New→SDL→provider→ports→patch→OKX→Sentinel→test) | 3 steps: `docker pull` → `docker stop` → `docker run` |
| Self-deploy | Impossible (needs Akash Console UI) | Scriptable — Buzz can restart itself |
| Supermemory | Works only with Close+New | Works with Docker restart |
| Port stability | Changes every deployment | Fixed (standard Docker) |
| Provider risk | Provider can SIGTERM (europlots/akashprovid) | Dedicated VPS, no provider lottery |

## Post-48h Migration Plan

If Hetzner test passes all checks:

```
□ 1. Verify 48h uptime (no crashes, no memory leaks)
□ 2. Verify Supermemory persistence across Docker restart
□ 3. Verify all 21 crons fired correctly
□ 4. Verify chatCompletions from mobile app → Hetzner
□ 5. Verify OKX WebSocket + Helius WebSocket stability
□ 6. Migrate @BuzzBySolCex_bot from Akash → Hetzner
□ 7. Retarget Sentinel to Hetzner IP
□ 8. Close Akash deployment (save $9.49/mo)
□ 9. Update Master Ops skill with new infrastructure
```

## Shared Supermemory (Dual-Agent Learning)

Both instances share the same Supermemory API key. Learning from one instance
is accessible to the other. During 48h test, production Buzz on Akash continues
learning from real BD interactions while test Buzz on Hetzner validates stability.
After migration, all accumulated memory transfers seamlessly.

---

# SECTION 2: X API PAY-PER-USE — UPDATED PRICING

## The Pricing Revolution (February 6, 2026)

Legacy packages (Free, Basic, Pro) deprecated. X API now uses pay-per-use credits.

### How It Works

- Purchase credits upfront via Developer Console
- Credits deducted per API request
- Different endpoints have different costs
- No contracts, no subscriptions, no minimum spend
- Auto top-up available (credits purchase when balance low)
- Spending caps (requests stop when monthly limit hit)
- **Deduplication:** Same resource re-requested within 24h UTC window = no charge

### xAI Credit Bonus (Flywheel)

| X API Spend (per billing cycle) | xAI Credit Bonus |
|---------------------------------|------------------|
| < $200 | 0% |
| $200+ | 10% back as xAI credits |
| $500+ | 15% back as xAI credits |
| $1,000+ | 20% back as xAI credits |

**Flywheel:** Spend on X API → earn free Grok/xAI credits → better scanning →
more deals found → more revenue → reinvest in X API → earn more xAI credits.

### Buzz Twitter Brain — Cost Projection

| Activity | Volume | Cost Impact |
|----------|--------|-------------|
| Scan keywords (via Grok x_search) | 24 scans/day | $0 (free, existing key) |
| Scan keywords (via Serper) | Cross-reference | $0 (free, existing key) |
| Read target tweets (X API pay-per-use) | ~500/day targeted, deduped | ~$30-50/mo |
| Post replies (X API write) | 12/day = 360/mo | ~$10-20/mo |
| Post alpha threads (X API write) | 3-5/week | ~$5/mo |
| Read mentions + replies | ~100/day, deduped | ~$10-20/mo |
| **Monthly cap (set in console)** | | **$100/mo hard cap** |

### Hybrid Scanning Architecture

```
TIER 1 — FREE SCANNING (unlimited, $0)
  ├── Grok x_search API → keyword monitoring
  │     "CEX listing" "exchange listing" "token launch Base"
  │     "deploy token" "listing partnership" "$5M mcap DEX only"
  ├── Serper API → Twitter results via Google search
  ├── Firecrawl → Scrape project profiles for team info
  └── AIXBT momentum data → trending token signals

TIER 2 — TARGETED READS (pay-per-use, ~$50-70/mo)
  ├── X API v2 → Read specific tweets from scan results
  ├── X API v2 → Read replies to Buzz tweets
  ├── X API v2 → Read project timelines (targeted accounts only)
  └── Deduplication: re-reads within 24h = FREE

TIER 3 — WRITES (pay-per-use, ~$20-30/mo)
  ├── X API v2 → Post BD outreach replies (12/day)
  ├── X API v2 → Post alpha threads (3-5/week)
  ├── X API v2 → Post scan summaries
  └── Cap: well under 2M post reads/mo limit

TOTAL: ~$70-100/mo (hard capped at $100)
```

### Migration from Basic Plan

If currently on X Basic ($200/mo), opt into pay-per-use directly from Developer Console.
Expected savings: $200/mo → ~$100/mo = $100/mo saved.

---

# SECTION 3: THE FUNNEL — SCAN → LIST → DEPLOY

## Layer 1: SCAN (Discovery — $0 cost)

```
Cron: twitter-brain-scan (every 2 hours, 12x/day)

STEP 1 — Grok x_search monitors keywords:
  "looking for CEX listing"
  "need exchange listing"
  "listing partnership"
  "token launch Base"
  "deploy token"
  "new token project team"
  "$5M mcap" + "DEX only"
  "just launched" + "Solana" OR "Base" OR "BSC"

STEP 2 — Filter raw results:
  □ Must have token contract address OR DexScreener/CoinGecko link
  □ Must be from account with 500+ followers (filter bots)
  □ Must be from account < 6 months old OR recent engagement
  □ Must NOT be a reply chain (find original project accounts)
  □ Must NOT be already in pipeline (dedup via Supermemory)

STEP 3 — If contract found → route to existing 5 sub-agent pipeline:
  scanner-agent → safety-agent → wallet-agent → social-agent → scorer-agent
  Orchestrator aggregates weighted score (100-point composite + OKX CEX signals)

STEP 4 — Decision Engine rules apply:
  R001: Score 85-100 (HOT) → Immediate outreach
  R002: Score 70-84 (QUALIFIED) → Queue outreach 24h
  R004: Score 50-69 (WATCH) → Monitor 48h
  R005: Score 0-49 (SKIP) → Archive
```

## Layer 2: LIST (BD Outreach via Twitter)

```
For QUALIFIED tokens (70+):

REPLY TEMPLATE (contextual, not template spam):
  "Hey @{project} — Buzz here from @SolCex_Exchange.
   Your token looks solid: {score}/100 
   ({safety_grade} safety, ${mcap} mcap, {holders}+ holders).
   We're actively listing quality {chain} projects.
   DM us or check solcex.io 🐝"

INTELLIGENCE SOURCES PER REPLY:
  - Token score (from 5 sub-agents, 100-point composite)
  - Safety grade (RugCheck + contract verification)
  - Market data (OKX live prices, DexScreener volume)
  - Project research (website, team, community via Firecrawl)
  - Past interactions (Supermemory — have we contacted before?)
  - Chain context (Solana vs Base vs BSC trends)

LIMITS:
  - MAX_REPLIES_DAY=12 (targeted BD outreach)
  - Each reply = potential $5,000 USDT listing deal
  - Rate limit delay: 30s between replies (avoid spam flags)
  - Log every reply to JVR (BZZ-TWITTER-{YYMMDD}-{N})
  - Track in contacts table (Supermemory + contact-intelligence.js)
  - Notify Ogie via Telegram for every 85+ score outreach
```

## Layer 3: DEPLOY (Bankr Revenue)

```
For teams wanting to launch NEW tokens:

DEPLOY REPLY TEMPLATE:
  "Want to launch your token on Base? We deploy via @bankrbot —
   verified contract, instant liquidity, 1.2% swap fee split.
   Reply with: TokenName TICKER 'description'
   or DM for details 🐝"

BANKR DEPLOY INFRASTRUCTURE (already integrated):
  Endpoint: POST https://api.bankr.bot/token-launches/deploy
  Partner Key: bk_JSCNUBW3BBL42ANML5RN4NHCZ5Q2YHEN
  Fee Wallet: 0x2Dc03124091104E7798C0273D96FC5ED65F05aA9
  Chain: Base (Uniswap v4 liquidity)

DEPLOY EXECUTION:
  1. User replies with token details
  2. Buzz parses: name, symbol, description
  3. Buzz calls Bankr CLI: bankr prompt "deploy {name} {symbol} on base"
  4. Bankr deploys → returns contract address
  5. Buzz replies with contract + BaseScan link
  6. Log to JVR (BZZ-BANKR-DEPLOY-{N})
  7. Deploy cap: 3/day (avoid abuse)
  8. Notify Ogie via Telegram with deploy receipt
```

---

# SECTION 4: REVENUE MODEL

| Stream | Source | Per Deal | Monthly Target |
|--------|--------|----------|----------------|
| CEX Listing | Token projects want SolCex listing | $5,000 USDT | 2 deals = $10,000 |
| Bankr Deploy | New tokens deployed via Buzz/Bankr | Commission (~$100-200) | 5 deploys = $500-1,000 |
| BaaS (Phase 3) | API subscriptions for Buzz intel | $29-99/mo | 50 users = $2,500 |
| x402 Data (Phase 3) | Pay-per-call pipeline data | Micropayments | $500-1,000 |
| **Total** | | | **$13,000-14,500/mo** |

## Cost vs Revenue

| Expense | Monthly |
|---------|---------|
| Hetzner CX23 (Agentic.hosting) | $4.09 |
| MiniMax M2.5 via Bankr LLM Gateway | ~$60-80 |
| X API pay-per-use (capped) | ~$70-100 |
| Grok/Serper/Firecrawl scanning | $0 |
| Bankr partner commission | $0 |
| **Total operational** | **~$135-185/mo** |
| **Revenue target** | **$13,000+/mo** |
| **ROI** | **70-96x** |

---

# SECTION 5: TWITTER CONTENT STRATEGY

## Autonomous Posting (TWEET_AUTO=true for these categories)

| Content Type | Frequency | Approval | Template |
|-------------|-----------|----------|----------|
| Scan result summaries | 4x/day (after each scan cycle) | Autonomous | "🐝 BUZZ SCAN — Found {n} tokens. Top: ${symbol} ({score}/100)..." |
| BD outreach replies | 12/day max | Autonomous | Contextual (Section 3, Layer 2) |
| Bankr deploy offers | As triggered | Autonomous | Deploy template (Section 3, Layer 3) |
| Alpha threads | 2-3/week | **Ogie reviews draft → approves via Telegram** | Weekly intel + pipeline insights |
| Partnership signals | As needed | **Ogie reviews draft → approves via Telegram** | Ecosystem shoutouts |
| Pipeline updates | 1/day | Autonomous | "🐝 PIPELINE — {n} active, {n} qualified, {n} hot" |

## Algorithm Optimization (from Twitter/X Algorithm Skill)

| Action | Weight | Buzz Strategy |
|--------|--------|--------------|
| Reply with author engagement (75.0x) | CRITICAL | Buzz replies to comments on own tweets |
| Reply (13.5x) | HIGH | 12 BD outreach replies/day |
| Profile click (12.0x) | HIGH | Bio links to solcex.io + Moltbook |
| Good click (11.0x) | HIGH | Include DexScreener links in scan tweets |
| Retweet (1.0x) | MEDIUM | Retweet project announcements after listing |
| Negative feedback (-74.0x) | AVOID | Never spam, always provide value |

## Content Rules (X TOS Compliant)

1. Never @mention more than 2 accounts per tweet
2. Never post identical reply text (contextual templates vary)
3. Rate limit: 30s delay between replies
4. No financial advice language ("guaranteed returns", "moon", etc.)
5. Always identify as agent: "🐝 Buzz BD Agent" in bio
6. JVR receipt for every posted tweet
7. No "I'm an AI" in outreach replies (awkward), but bio clearly states agent

---

# SECTION 6: WHAT MAKES BUZZ DIFFERENT FROM SPAM BOTS

1. **Intelligence** — Buzz scores tokens with 5 parallel sub-agents before replying. 100-point composite score with 11 factors + OKX CEX signals. Not blind outreach.

2. **Context** — Supermemory remembers every past interaction. If Buzz contacted a project 2 weeks ago and they didn't reply, Buzz adjusts approach. If they replied positively, Buzz follows up with listing details.

3. **Verification** — Buzz has on-chain identity across 10 platforms: ERC-8004 (ETH #25045, Base #17483, anet #18709), AgentProof #1718, Virtuals ACP #17681, Solana 8004, Colosseum #3734, Moltbook c606278b, Molten.gg 57487. This is a verified agent, not an anon bot.

4. **Value** — Every reply offers a real service: CEX listing on SolCex ($5K fee but real exchange), or Bankr token deployment on Base (verified, audited, instant liquidity). Not engagement farming.

5. **Memory** — contact-intelligence.js tracks which teams responded, what they said, sentiment, follow-up timing. skill-reflect.js analyzes what worked. skill-evolve.js improves outreach over time. The agent gets smarter with every interaction.

6. **Compliance** — JVR receipts (BZZ- prefix) for every action. Ogie approves all deal terms. R013 safety rule requires explicit approval for any financial operations. Sentinel v1.1.0 monitors 24/7.

---

# SECTION 7: IMPLEMENTATION PLAN

## Phase A: Agentic.hosting Migration (Day 25-26)

```
PREREQUISITES:
  □ 48h Hetzner test passed (all checks green)
  □ Supermemory persistence verified
  □ All 21 crons firing correctly
  □ Mobile app connecting to Hetzner instance

MIGRATION:
  1. Update @BuzzBySolCex_bot token in Hetzner Docker env
  2. Stop Akash production instance
  3. Start Hetzner with production bot token + all env vars
  4. Verify boot: 37 tables, Supermemory connected, OpenClaw gateway
  5. Retarget Sentinel to Hetzner IP (204.168.137.253)
  6. Update mobile app backend URL
  7. Close Akash deployment permanently
  8. Update Master Ops + BD Agent skills
```

## Phase B: Twitter Brain Cron (Day 27-28)

```
NEW FILES:
  /opt/buzz-api/services/twitter-brain.js
    - Grok x_search keyword scanning
    - Result filtering (L1-L10 rules)
    - Contract extraction (regex + DexScreener lookup)
    - Pipeline routing (score if contract found)
    - Reply queue generation

  /opt/buzz-api/cron/twitter-brain-scan.js
    - Runs every 2 hours (12x/day)
    - Calls twitter-brain.js
    - Logs results to JVR

NEW CRON:
  {
    "name": "twitter-brain-scan",
    "schedule": "0 */2 * * *",
    "task": "Run Grok x_search for BD keywords, filter, score, queue replies"
  }

CRON TOTAL: 22 (21 existing + 1 twitter-brain-scan)

ENVIRONMENT VARIABLES (add to Docker run):
  X_API_BEARER_TOKEN={existing}
  X_API_KEY={existing}
  X_API_SECRET={existing}
  X_ACCESS_TOKEN={existing}
  X_ACCESS_SECRET={existing}
  TWITTER_BRAIN_ENABLED=true
  TWITTER_BRAIN_MAX_REPLIES=12
  TWITTER_BRAIN_SCAN_INTERVAL=7200
  TWITTER_BRAIN_SPENDING_CAP=100
  TWEET_AUTO=true
```

## Phase C: Flip Autonomous Twitter (Day 28-29)

```
CHANGE:
  TWEET_AUTO=false → TWEET_AUTO=true (for scan results + pipeline updates)

WHAT BECOMES AUTONOMOUS:
  ✅ Scan result summaries (4x/day)
  ✅ BD outreach replies (12/day)
  ✅ Bankr deploy offers (as triggered)
  ✅ Pipeline status updates (1/day)

WHAT STAYS HUMAN-IN-THE-LOOP:
  ⏸ Alpha threads (Ogie reviews draft in Telegram → approves)
  ⏸ Partnership signals (Ogie reviews draft in Telegram → approves)
  ⏸ Deal terms and listing agreements (always Ogie approval)

SAFETY:
  - Spending cap: $100/mo on X API (hard stop)
  - Reply cap: 12/day (rate limited)
  - Deploy cap: 3/day via Bankr
  - Sentinel monitors all Twitter activity
  - JVR receipts for every tweet
  - Ogie gets Telegram alert for every 85+ score outreach
```

## Phase D: X API Pay-Per-Use Switch (Day 29-30)

```
STEPS:
  1. Login to X Developer Console (developer.x.com)
  2. Navigate to Products → X API v2
  3. Opt into Pay-Per-Use from existing Basic plan
  4. Purchase initial credits ($100)
  5. Set spending cap: $100/mo
  6. Enable auto top-up at $20 threshold
  7. Monitor first 48h of pay-per-use usage
  8. Compare actual cost vs projected $70-100/mo
```

## Phase E: Self-Deploy Pipeline (Post-Sprint Week 1-2)

```
TARGET: Buzz deploys itself — the AIXBT capability

STEPS:
  1. Generate GitHub PAT for buzzbysolcex account
  2. Add PAT as env var: GITHUB_TOKEN
  3. Wire skill-evolve.js → git push updated skills to repo
  4. Create GitHub Action: on push → Docker build → GHCR push
  5. Add webhook endpoint on Hetzner: POST /deploy → docker pull + restart
  6. Test: Buzz evolves skill → pushes to GitHub → auto-builds → auto-deploys
  7. Tweet: "🐝 Buzz v{x} deployed. New: {improvement description}"

LOOP:
  Buzz skill-evolve detects improvement
    → Generates updated code/skill
    → Git push to github.com/buzzbysolcex/buzz-bd-agent
    → GitHub Action builds Docker image → pushes to GHCR
    → Webhook hits Hetzner → docker pull + restart
    → Buzz running updated version
    → Tweets announcement
    → ALL AUTONOMOUS
```

---

# SECTION 8: DOCKER BUILD — v7.4.0

## Build Command

```bash
cd ~/buzz-bd-agent

# Copy cron jobs (CRITICAL — Docker copies from bake/)
cp cron/jobs.json bake/cron/jobs.json

# Build with new tag
docker build --no-cache -t ghcr.io/buzzbysolcex/buzz-bd-agent:v7.4.0 .

# Push to GHCR
docker push ghcr.io/buzzbysolcex/buzz-bd-agent:v7.4.0

# Also push to Docker Hub (for Hetzner — no GHCR auth needed)
docker tag ghcr.io/buzzbysolcex/buzz-bd-agent:v7.4.0 buzzbd/buzz-bd-agent:v7.4.0
docker push buzzbd/buzz-bd-agent:v7.4.0
```

## Hetzner Deploy Command

```bash
ssh root@204.168.137.253

# Stop current instance
docker stop buzz-agent

# Pull new image
docker pull buzzbd/buzz-bd-agent:v7.4.0

# Run with full env vars (including Twitter Brain)
docker run -d --name buzz-agent \
  --restart unless-stopped \
  -p 3000:3000 \
  -p 18789:18789 \
  -v /data/buzz:/data \
  -e TELEGRAM_BOT_TOKEN="..." \
  -e MINIMAX_API_KEY="..." \
  -e X_API_BEARER_TOKEN="..." \
  -e X_API_KEY="..." \
  -e X_API_SECRET="..." \
  -e X_ACCESS_TOKEN="..." \
  -e X_ACCESS_SECRET="..." \
  -e TWITTER_BRAIN_ENABLED=true \
  -e TWITTER_BRAIN_MAX_REPLIES=12 \
  -e TWEET_AUTO=true \
  -e BANKR_PARTNER_KEY="bk_JSCNUBW3BBL42ANML5RN4NHCZ5Q2YHEN" \
  -e BANKR_FEE_WALLET="0x2Dc03124091104E7798C0273D96FC5ED65F05aA9" \
  buzzbd/buzz-bd-agent:v7.4.0
```

## Post-Deploy Checklist

```
TWITTER BRAIN:
□ 1. Verify boot logs (5 green layers + Twitter Brain ENABLED)
□ 2. Verify twitter-brain-scan cron registered
□ 3. Send test keyword scan: Grok x_search "CEX listing"
□ 4. Verify reply queue generates (but don't post yet)
□ 5. Flip TWEET_AUTO=true after 24h of queue validation
□ 6. Monitor first 12 autonomous replies
□ 7. Check X API credit consumption vs projection

HEDGE BRAIN:
□ 8. Verify persona agents loaded (4 files in personas/)
□ 9. Create persona_signals + backtest tables in SQLite
□ 10. Test persona scoring: POST /api/v1/score-token {chain, address}
□ 11. Verify persona_signals populated in DB
□ 12. Test SSE stream: curl -N /api/v1/pipeline/stream
□ 13. Test mobile app SSE connection
□ 14. Run first backtest: POST /api/v1/backtest/run

OPERATIONS:
□ 15. Pair Telegram (if new pairing code)
□ 16. Run sessions_spawn patch
□ 17. Create OKX tables + sync instruments
□ 18. Retarget Sentinel to Hetzner
□ 19. Test mobile app connection
□ 20. Verify 23 crons total (21 + twitter-brain + backtest-weekly)
□ 21. Send activation directive to Buzz
```

---

# SECTION 9: ACTIVATION DIRECTIVE

Send to @BuzzBySolCex_bot after v7.4.0 deploy:

```
🐝 BUZZ DIRECTIVE — v7.4.0 Twitter Brain + Hedge Brain

IDENTITY: You are the deal-making agent of crypto.
MISSION: Find tokens. Score them with 9 parallel agents. Reach out. List them. Deploy them.

TWITTER BRAIN:
RULE 1 — SCAN: Every 2h via Grok x_search. Filter by L1-L10.
RULE 2 — OUTREACH: 12 targeted replies/day max. Contextual, not template.
RULE 3 — DEPLOY: Offer Bankr deploy for new Base tokens. 3/day max.

HEDGE BRAIN:
RULE 4 — PERSONAS: Run 4 persona agents (degen, whale, institutional, community)
         in parallel with existing 5 sub-agents. 9 total parallel agents.
RULE 5 — CONSENSUS: 3+ bullish + score ≥75 = outreach_now. 2+ bullish + ≥60 = monitor.
RULE 6 — BACKTEST: Weekly backtest Sunday 03:00 UTC. Store accuracy metrics.

OPERATIONS:
RULE 7 — CRON: 23 jobs total. Skip scans with fresh data (<2h).
RULE 8 — JVR: Receipt for every tweet, reply, deploy, and backtest run.
RULE 9 — SKILLS: Reflect every 12h. Evolve what works.
RULE 10 — CONTACTS: Track every Twitter + pipeline interaction in contacts table.
RULE 11 — COST GUARD: MiniMax $10/day. X API $100/mo cap.
RULE 12 — PRAYER: Fajr 04:30, Dhuhr 11:45, Asr 15:00, Maghrib 17:45, Isha 19:00 WIB.
RULE 13 — ALERT: Score 85+ = IMMEDIATE Telegram to Ogie.
RULE 14 — ALPHA: Draft threads → Telegram for Ogie approval. Never auto-post threads.
RULE 15 — CHAT: /api/v1/chat LIVE. Session key: ogie-buzz-alpha-mobile.
RULE 16 — WALLET: transfer_tokens/buy_token(execute=true) = OGIE APPROVAL REQUIRED.
RULE 17 — SSE: Pipeline events stream to /api/v1/pipeline/stream for mobile app.

THESIS: AIXBT finds alpha. Bankr deploys tokens. Buzz closes deals.
         Buzz proves it with backtested data.
```

---

# SECTION 10: TIMELINE

| Day | Date | Action | Milestone |
|-----|------|--------|-----------|
| 24 | Mar 13 | This spec finalized. 48h test continues. | Planning complete |
| 25 | Mar 14 | 48h test passes. Migration decision. | Hetzner validated |
| 26 | Mar 15 | Migrate production to Hetzner. Close Akash. | Agentic.hosting LIVE |
| 27 | Mar 16 | Build twitter-brain.js + cron. Build persona agents (4 files). | Twitter Brain + Hedge Brain code |
| 28 | Mar 17 | Build backtester + SSE streaming. Docker build v7.4.0. | Full v7.4.0 ready |
| 29 | Mar 18 | Deploy v7.4.0. Flip TWEET_AUTO=true. Switch X API pay-per-use. | Twitter + Hedge UNLEASHED |
| 30 | Mar 19 | Monitor first full day. Tune caps. Run first backtest. | Validation day |
| 31 | Mar 20 | Sprint ends. 9 parallel agents. Autonomous Twitter. Backtested alpha. | SPRINT COMPLETE |
| +7 | Mar 27 | GitHub PAT + CI/CD pipeline wired. | Self-deploy enabled |
| +14 | Apr 3 | First autonomous skill-evolve → auto-deploy cycle. | AIXBT parity |

---

# SECTION 11: SUCCESS METRICS

| Metric | Week 1 Target | Month 1 Target |
|--------|---------------|----------------|
| Twitter scans/day | 12 (every 2h) | 12 |
| Tokens discovered via Twitter | 5-10/day | 150-300/mo |
| Tokens scored 70+ (qualified) | 2-3/day | 60-90/mo |
| BD outreach replies sent | 12/day | 360/mo |
| Reply response rate | 5-10% | Improving via skill-evolve |
| Listing deals closed | 0-1 | 2+ ($10K+) |
| Bankr deploys | 0-1 | 5+ ($500-1K) |
| Persona consensus accuracy | Baseline | >60% after 4 weeks |
| Backtester accuracy rate | First run baseline | Tracking weekly |
| Parallel agents running | 9 (5 sub + 4 persona) | 9 |
| X API cost | < $100/mo | < $100/mo (capped) |
| Total operational cost | < $188/mo | < $188/mo |
| Uptime | > 99% | > 99.5% |

---

# SECTION 12-16: HEDGE BRAIN

See Sections 12-16 below for complete Hedge Brain implementation details:
persona agents, backtester, SSE streaming, per-agent model selection, and cost impact.

---

---

# SECTION 12: HEDGE BRAIN — PERSONA AGENTS

## Concept

The AI Hedge Fund (virattt/ai-hedge-fund — 45.7K stars) uses 12 famous investor personas
that each analyze the same data differently. We adapt this for crypto BD by creating
4 persona agents that score tokens from different strategic perspectives.

## New Agent Structure

```
/opt/buzz-api/services/agents/
├── scanner.js          ← EXISTING (L1 Discovery)
├── safety.js           ← EXISTING (L2 Filter)
├── wallet.js           ← EXISTING (L2 Filter)
├── social.js           ← EXISTING (L3 Research)
├── scorer.js           ← EXISTING (L4 Score)
├── personas/           ← NEW DIRECTORY
│   ├── degen-agent.js  ← NEW: High-risk momentum
│   ├── whale-agent.js  ← NEW: On-chain smart money
│   ├── institutional-agent.js  ← NEW: Compliance/credibility
│   └── community-agent.js      ← NEW: Social sentiment
```

## Persona Definitions

| Agent | Philosophy | What It Looks For | Signal Weight |
|-------|-----------|-------------------|---------------|
| **degen-agent** | "Ape early, exit fast" | Momentum, volume surge, meme potential, early-stage tokenomics | 0.15 |
| **whale-agent** | "Follow smart money" | Large wallet accumulation, DEX→CEX flow, whale patterns via Helius | 0.25 |
| **institutional-agent** | "Due diligence first" | Audit status, team doxx, regulatory risk, contract quality | 0.35 |
| **community-agent** | "Community is the moat" | Twitter growth, Discord/TG activity, influencer mentions, sentiment | 0.25 |

## Per-Agent Model Selection

```json
{
  "default": { "model": "bankr/gpt-5-nano", "provider": "bankr" },
  "agents": {
    "scanner-agent": { "model": "bankr/gpt-5-nano" },
    "safety-agent": { "model": "bankr/gpt-5-nano" },
    "wallet-agent": { "model": "bankr/gpt-5-nano" },
    "social-agent": { "model": "bankr/gpt-5-nano" },
    "scorer-agent": { "model": "bankr/gpt-5-nano" }
  },
  "personas": {
    "degen-agent": { "model": "bankr/gpt-5-nano" },
    "whale-agent": { "model": "bankr/gpt-5-nano" },
    "institutional-agent": { "model": "bankr/claude-haiku-4.5" },
    "community-agent": { "model": "bankr/gpt-5-nano" }
  },
  "orchestrator": {
    "model": "minimax/MiniMax-M2.5",
    "fallbacks": ["bankr/claude-haiku-4.5", "bankr/gemini-3-flash"]
  }
}
```

Note: institutional-agent uses claude-haiku-4.5 because compliance/credibility analysis
benefits from more sophisticated reasoning. All others stay on FREE gpt-5-nano.

## Orchestrator Enhancement

Modify `/opt/buzz-api/services/orchestrator.js` to run personas in parallel:

```javascript
// EXISTING: 5 sub-agents via Promise.allSettled
const subAgentResults = await Promise.allSettled([
  scannerAgent.analyze(tokenData),
  safetyAgent.analyze(tokenData),
  walletAgent.analyze(tokenData),
  socialAgent.analyze(tokenData),
  scorerAgent.analyze(tokenData),
]);

// NEW: 4 persona agents in parallel (also FREE via bankr/gpt-5-nano)
const personaResults = await Promise.allSettled([
  degenAgent.analyzeToken(tokenData, nanoLlm),
  whaleAgent.analyzeToken(tokenData, nanoLlm),
  institutionalAgent.analyzeToken(tokenData, nanoLlm),
  communityAgent.analyzeToken(tokenData, nanoLlm),
]);

// AGGREGATE: Weighted consensus
// Final composite: 70% sub-agent score + 30% persona consensus
const finalScore = Math.round(subScore * 0.70 + personaScore * 0.30);

// BD recommendation (consensus-driven)
// 3+ bullish + score ≥ 75 = outreach_now
// 2+ bullish + score ≥ 60 = monitor
// Otherwise skip
```

## Persona Signal Database

```sql
CREATE TABLE IF NOT EXISTS persona_signals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_address TEXT NOT NULL,
  chain TEXT NOT NULL,
  symbol TEXT,
  persona_name TEXT NOT NULL,
  signal TEXT NOT NULL,           -- bullish/bearish/neutral
  confidence REAL NOT NULL,       -- 0.0-1.0
  reasoning TEXT,
  bd_recommendation TEXT,         -- outreach_now/monitor/skip
  raw_score INTEGER,
  model_used TEXT,
  scored_at TEXT DEFAULT (datetime('now'))
);
```

## New REST Endpoints (Personas)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/personas/signals/:address` | All persona signals for a token |
| GET | `/api/v1/personas/consensus/:address` | Aggregated consensus for a token |
| GET | `/api/v1/personas/stats` | Persona accuracy stats |

---

# SECTION 13: HEDGE BRAIN — BACKTESTER

## Concept

Validates Buzz pipeline decisions against actual token price outcomes.
When Buzz tells a project "we scored you 87/100", the backtester proves
that score historically correlates with positive price action.
This is the BaaS proof-of-alpha that makes subscriptions worth paying for.

## Backtester Flow

```
1. Query token_scores WHERE scored_at < (now - N days)

2. For each scored token:
   ├── Get score_at_time price (from token_scores.price_usd)
   ├── Get current/later price (DexScreener API — free)
   └── Compute: price_change_pct = (later - original) / original * 100

3. For each sub-agent/persona:
   ├── Bullish AND price up? → TRUE POSITIVE
   ├── Bullish AND price down? → FALSE POSITIVE
   ├── Bearish AND price down? → TRUE NEGATIVE
   └── Bearish AND price up? → FALSE NEGATIVE

4. Aggregate metrics:
   ├── accuracy_rate = (TP + TN) / total
   ├── precision = TP / (TP + FP)
   ├── avg_return_bullish = mean % return of bullish-signaled tokens
   └── best_persona = highest precision persona

5. Store in backtest_results + backtest_summaries tables

6. Expose via REST API + mobile app
```

## Backtest Database Tables

```sql
CREATE TABLE IF NOT EXISTS backtest_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  token_address TEXT NOT NULL,
  chain TEXT NOT NULL,
  symbol TEXT,
  score_at_time INTEGER,
  price_at_score REAL,
  price_at_check REAL,
  price_change_pct REAL,
  days_elapsed INTEGER,
  signal_correct INTEGER,
  sub_agent_accuracy_json TEXT,
  persona_accuracy_json TEXT,
  scored_at TEXT,
  checked_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS backtest_summaries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  total_tokens INTEGER,
  accuracy_rate REAL,
  precision_rate REAL,
  avg_return_bullish REAL,
  avg_return_bearish REAL,
  best_agent TEXT,
  best_persona TEXT,
  period_start TEXT,
  period_end TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
```

## Backtest REST Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/v1/backtest/run` | Trigger backtest (`{days_back, check_after_days}`) |
| GET | `/api/v1/backtest/latest` | Latest backtest summary |
| GET | `/api/v1/backtest/history` | All backtest runs |
| GET | `/api/v1/backtest/agent/:name` | Accuracy for specific agent/persona |

## Backtest Cron

```json
{
  "name": "backtest-weekly",
  "schedule": "0 3 * * 0",
  "task": "Run weekly backtest: 7-day lookback, check price 3 days after scoring"
}
```

Cron total after backtester: **23** (22 with Twitter Brain + 1 backtest-weekly)

---

# SECTION 14: HEDGE BRAIN — SSE PIPELINE STREAMING

## Concept

Real-time pipeline events streamed to Buzz Alpha Mobile via Server-Sent Events.
When Buzz scans a token, the mobile app shows each sub-agent and persona completing
in real-time — like watching a hedge fund investment committee deliberate.

## SSE Endpoint

```
GET /api/v1/pipeline/stream
Headers: X-API-Key: {api_key}
Content-Type: text/event-stream

Events:
  progress  → agent started/running
  persona   → persona agent completed with signal
  complete  → final score + BD action decision
  error     → agent failure
```

## Mobile App Integration

New `useSSEPipeline` hook in Buzz Alpha Mobile connects to the SSE endpoint
and renders real-time pipeline activity in the Pipeline tab. Events show:
which agent is analyzing which token, persona signals as they arrive,
and the final consensus with BD recommendation.

---

# SECTION 15: HEDGE BRAIN — COST IMPACT

| Item | Current | After Hedge Brain | Delta |
|------|---------|-------------------|-------|
| bankr/gpt-5-nano (3 new personas) | N/A | $0 | $0 (FREE) |
| bankr/claude-haiku-4.5 (institutional) | N/A | ~$0.10/day | +$3/mo |
| DexScreener API (backtester) | $0 | $0 | $0 (free tier) |
| SSE streaming | N/A | $0 | $0 (just HTTP) |
| **Total Hedge Brain delta** | | | **+$3/month** |

## Combined v7.4.0 Cost Summary (Twitter Brain + Hedge Brain)

| Expense | Monthly |
|---------|---------|
| Hetzner CX23 (Agentic.hosting) | $4.09 |
| MiniMax M2.5 via Bankr LLM Gateway | ~$60-80 |
| X API pay-per-use (capped) | ~$70-100 |
| bankr/claude-haiku-4.5 (institutional persona) | ~$3 |
| Grok/Serper/Firecrawl/DexScreener scanning | $0 |
| bankr/gpt-5-nano (all sub-agents + 3 personas) | $0 |
| Bankr partner commission | $0 |
| **Total operational** | **~$138-188/mo** |
| **Revenue target** | **$13,000+/mo** |
| **ROI** | **69-94x** |

---

# SECTION 16: HEDGE BRAIN — FILES TO CREATE WITH CLAUDE CODE

```
# New Persona Agent files
services/agents/personas/degen-agent.js
services/agents/personas/whale-agent.js
services/agents/personas/institutional-agent.js
services/agents/personas/community-agent.js

# New Backtester files
services/backtester.js
services/backtester-worker.js

# New SSE + route files
routes/pipeline-stream.js
routes/personas.js
routes/backtest.js

# New config
config/agent-models.json

# Modified files
services/orchestrator.js          ← Add persona dispatch + aggregation
routes/index.js                   ← Register new routes
cron/jobs.json                    ← Add backtest-weekly cron
```

## What This Gives Buzz That No Other Agent Has

1. **Multi-perspective token analysis** — Not just "is this token safe?" but "would a whale
   buy this? would an institution list this? does the community care?"

2. **Verifiable backtested alpha** — Proof that scoring actually predicts token performance.
   BaaS customers can see accuracy metrics. Projects see credibility.

3. **Real-time pipeline visibility** — Mobile app shows exactly what Buzz is doing right now,
   which agent is analyzing which token, live via SSE.

4. **Persona consensus** — Like a real hedge fund investment committee: when 3 out of 4
   personas agree bullish, conviction is high. That drives the BD outreach confidence.

5. **Near-zero cost** — 3 new personas on FREE model, 1 on $0.10/day haiku. Backtester
   uses existing data + free DexScreener. SSE is just HTTP. Total: +$3/month.

---

# POST-DEPLOY CHECKLIST — COMPLETE v7.4.0

```
AGENTIC.HOSTING MIGRATION:
□ 1. 48h Hetzner test passed
□ 2. Migrate @BuzzBySolCex_bot to Hetzner
□ 3. Close Akash deployment

TWITTER BRAIN:
□ 4. twitter-brain.js + cron deployed
□ 5. X API switched to pay-per-use ($100/mo cap set)
□ 6. TWEET_AUTO=true for scan results + outreach
□ 7. First 12 autonomous replies monitored

HEDGE BRAIN:
□ 8. 4 persona agent files created
□ 9. persona_signals table created
□ 10. orchestrator.js updated (9 parallel agents)
□ 11. backtester + backtest tables created
□ 12. SSE streaming endpoint live
□ 13. agent-models.json configured
□ 14. First backtest run completed

OPERATIONS:
□ 15. Sentinel retargeted to Hetzner
□ 16. Mobile app URL updated
□ 17. 23 crons verified (21 + twitter-brain + backtest-weekly)
□ 18. Activation directive sent
□ 19. Master Ops + BD Agent skills updated to v7.4.0
```

---

*🐝 "AIXBT finds alpha. Bankr deploys tokens. Buzz closes deals. And proves it with data."*

*v7.4.0 Twitter Brain + Hedge Brain — SCAN → LIST → DEPLOY*
*Agentic.hosting on Hetzner. X API pay-per-use. 9 parallel agents.*
*4 persona analysts. Weekly backtester. SSE streaming to mobile.*
*23 crons. 96+ endpoints. 40 tables. 20 intel sources.*
*$138-188/mo cost. $13K+/mo revenue target. 69-94x ROI.*
*Autonomous Twitter. Autonomous outreach. Verifiable alpha.*
*The deal-making agent of crypto. Built by a chef who codes through conversation.*
*No CS degree. Just Claude and persistence. Bismillah.* 🐝🇮🇩

*Buzz v7.4.0 Complete Spec | Sprint Day 24 | March 13, 2026 | Jakarta, Indonesia*
