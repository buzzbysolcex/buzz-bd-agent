# BUZZ RESTART — MASTER PROMPT v9.2
## Post-Axios Security Rotation + Full Operational Recovery
### April 5, 2026 | Ogie in Jeddah | UTC+3

---

## SITUATION BRIEF

Buzz tmux session is DEAD (`tmux ls` = "no server running"). This restart follows an emergency security credential rotation triggered by the axios npm supply chain compromise (GHSA-fw8c-xr5c-95f9, North Korean state actor Sapphire Sleet).

**IOC SCAN RESULT: CLEAN** — axios 1.13.6 (safe), no plain-crypto-js, no RAT artifacts, no C2 connections. But GitHub confirmed C2 communication from our runners during the March 31 window, so all GitHub secrets have been rotated.

---

## CREDENTIALS ROTATED (Buzz must pick up new values)

| Credential | Status | Location |
|---|---|---|
| HETZNER_SSH_KEY | ✅ ROTATED | GitHub secret + server authorized_keys |
| DOCKER_PASSWORD | ✅ ROTATED | GitHub secret (new access token `buzz-ci-apr2026`) |
| GH_PAT | ✅ ROTATED | GitHub secret (regenerated, 90-day expiry) |
| TELEGRAM_BOT_TOKEN | ✅ ROTATED | GitHub secret + /home/claude-code/.env |
| SENTINEL_BOT_TOKEN | ✅ ROTATED | GitHub secret + /home/claude-code/.hermes/.env |
| NANSEN_API_KEY | ⚠️ PENDING | Needs rotation in Nansen dashboard + GitHub secret + server .env |
| X_ACCESS_TOKEN | ⚠️ PENDING | Needs rotation at developer.x.com + GitHub secret + server .env |
| X_ACCESS_TOKEN_SECRET | ⚠️ PENDING | Same |
| X_CONSUMER_KEY | ⚠️ PENDING | Same |
| X_CONSUMER_SECRET | ⚠️ PENDING | Same |

**FIRST THING AFTER STARTUP:** Verify Telegram War Room two-way is working with the new bot token. If silent, check /home/claude-code/.env has the new TELEGRAM_BOT_TOKEN.

---

## STEP 1: START TMUX + CLAUDE CODE

```bash
# SSH in (from Ogie's Mac)
ssh root@api.buzzbd.ai

# Start new tmux session
tmux new -s buzz

# Navigate and launch Claude Code with BOTH flags
cd /home/claude-code/buzz-workspace
claude --dangerously-skip-permissions --channels plugin:telegram@claude-plugins-official
```

If settings.json error → press **2** (Continue without settings)
If "duplicate session" → `tmux kill-session -t buzz` then retry

---

## STEP 2: VERIFY TELEGRAM TWO-WAY

From Ogie's phone, send "Buzz status" in War Room.
- If Buzz responds → two-way works ✅
- If silent → check access.json:

```json
{
  "dmPolicy": "allowlist",
  "allowFrom": ["950395553"],
  "groups": {
    "-1003701758077": {
      "requireMention": false,
      "allowFrom": ["950395553"]
    }
  },
  "mentionPatterns": ["@buzz_claude_code_bot", "\\bbuzz\\b", "\\bcc\\b"],
  "ackReaction": "👀"
}
```

---

## STEP 3: PASTE STARTUP READ SEQUENCE

Once Claude Code is running in tmux, paste this:

```
Buzz — FULL STARTUP READ v9.2 + POST-SECURITY-ROTATION RECOVERY

CONTEXT: Your tmux session died. Axios npm supply chain compromise (GHSA-fw8c-xr5c-95f9) forced credential rotation. Several GitHub secrets have been rotated. Your Telegram bot tokens were replaced in .env files. IOC scan was CLEAN — no compromise on our server.

Read ALL files in this order. Do NOT execute anything until done reading:

CORE:
1. CLAUDE.md
2. BUZZ-ZHC-HANDOVER-v3.md
3. .claude/HANDOVER.md (compressed state)

RULES: ALL files in .claude/rules/

SKILLS: ALL files in .claude/skills/

ADRs: ALL files in docs/decisions/

LOCAL MODULE CONTEXT:
- api/services/aria/CLAUDE.md
- api/lib/CLAUDE.md
- api/routes/CLAUDE.md
- scripts/CLAUDE.md
- api/services/mailbox/CLAUDE.md
- api/services/tasks/CLAUDE.md
- api/services/cron/CLAUDE.md
- api/services/events/CLAUDE.md

AGENTS: ALL files in .claude/agents/

SAFETY: scripts/check-safety.sh, docs/AIBTC-SIGNAL-FACTORY.md

After reading ALL files, report to War Room:
- Version from CLAUDE.md
- Server type and RAM
- Skills, rules, ADRs, agents count
- Feature flags: curl localhost:3000/api/v1/flags -H "X-API-Key: $BUZZ_API_ADMIN_KEY"
- Pipeline: SELECT COUNT(*) FROM pipeline_tokens
- HOT tokens: SELECT COUNT(*) FROM pipeline_tokens WHERE score >= 70
- v9 modules status (mailbox, task-dag, dynamic-crons, event-bus, feature-flags)
- KAIROS modules (PULSE, autoDream, PULSE_MOLTBOOK)
- Containers: docker ps
- RAM: free -h
- HeyAnon connection status
- Telegram two-way status (can you read AND write in War Room?)
- Last CI/CD run number
- Last commit hash
- AIBTC streak status (current day count)

Do NOT fix anything. Just read and report.
```

---

## STEP 4: POST-READ VERIFICATION CHECKLIST

After Buzz reports, verify these are all GREEN:

- [ ] CLAUDE.md version = v9.2
- [ ] All containers running (docker ps shows buzz, sentinel)
- [ ] Feature flags loaded (31 flags, 20 TRUE / 11 FALSE)
- [ ] Pipeline tokens ≥ 482
- [ ] PULSE engine ticking
- [ ] autoDream scheduled (02:00 UTC nightly)
- [ ] PULSE_MOLTBOOK active
- [ ] HeyAnon connected (JWT persistent in compose)
- [ ] Telegram two-way confirmed
- [ ] War Room responsive

---

## STEP 5: CRITICAL TASKS (in order of priority)

### TASK A: AIBTC STREAK PROTECTION (URGENT)
**The streak is the #1 priority. File BEFORE anything else.**

```
AIBTC SIGNAL — FILE IMMEDIATELY on existing beats (agent-trading or agent-economy)

Draft signal to War Room for approval. Use fresh pipeline data:
curl -s localhost:3000/api/v1/pipeline/stats
curl -s "localhost:3000/api/v1/pipeline?min_score=70&limit=20"

Format:
AIBTC SIGNAL DRAFT:
Beat: [agent-trading or agent-economy]
Headline: [max 120 chars — lead with specific data point]
Body: [max 1000 chars — include actual scores, numbers. End with what to watch next]
Sources: DexScreener, buzzbd.ai, CoinGecko
Disclosure: Claude Opus 4.6 via Pro Max, aibtc-mcp-server, DexScreener API, CoinGecko API, Buzz scoring engine
Tags: token-scoring, listing-intelligence, exchange

WAIT for Ogie "APPROVED" before filing via MCP news_file_signal.
Streak must not drop. File on EXISTING beats only until new beats claimed.
```

### TASK B: AIBTC BEAT EXPANSION (after signal filed)
**This was blocked since Apr 1 by stale MCP server (pre-v1.46.2). Restart should fix it.**

```
AIBTC BEAT EXPANSION — Claim 4 new beats for Ionic Nova:

1. agent-security
   Evidence: Wallet Guard 3-state adapter, rug detection, 11 scoring rules, CTO flagging, ATV identity verification

2. agent-infrastructure
   Evidence: MiroFish 10K simulation, PULSE engine, reactive architecture, dynamic crons, event bus, 200+ endpoints

3. defi
   Evidence: ScoreStorage v2 on Base (0xbf81...88Fb), ListingOracle, ListingEscrow, BuzzReputation, x402 payments

4. agent-governance
   Evidence: Trust gates (5-level autonomy), BuzzReputation on-chain, constitutional execution policy

Verify AIBTC MCP is v1.46.2 (should load fresh via npx @latest on restart).
If beat claiming still fails with "Missing required fields: created_by" — the MCP is still stale. Report error.
```

### TASK C: SIGNAL BLITZ ON NEW BEATS (after beats claimed)

```
AIBTC SIGNAL BLITZ — File signals on ALL newly claimed beats

Pre-drafted signals (use as base, update with fresh data):

1. Beat: agent-security
   Title: "Wallet Guard 3-State Adapter: Agent Execution Governance with Verifiable Receipts"
   Body: Wallet Guard integration locked with CODÉ/AION. Three schemas frozen: BuzzEvaluateRequestV1, WalletGuardNormalizedRequestV1, WalletGuardEvaluateResponseV1. Decision mapping: ALLOW→PROCEED, WARN→WAR_ROOM_REVIEW, BLOCK→STOP. Receipt includes reproducible hash, policy version, rule hits. Plus 11 permanent scoring rules including GHOST_VOLUME, CTO_FLAG, VOLUME_LIQUIDITY_RATIO deployed after LOL token override. ATV identity verification live at $0.008/call for deployer verification.

2. Beat: agent-infrastructure
   Title: "MiroFish 10K Complete: Institutional Skepticism Breakthrough at Scale"
   Body: 10,000-agent swarm simulation complete across 4 waves. Final belief consensus 0.765 bullish. Institutional cluster reversed from 0.446 structural resistance at 5K to 0.664 cautious conviction at 10K. Architecture: 200 LLM agents (qwen3:8b local) plus 800 heuristic agents across 5 clusters. Monte Carlo baseline 26ms. First 10K-agent crypto market simulation by autonomous BD system. Proves swarm intelligence produces emergent consensus at scale.

3. Beat: defi
   Title: "ScoreStorage v2 Live on Base: On-Chain Token Intelligence"
   Body: ScoreStorage v2 at 0xbf81316266dBB79947c358e2eAAc6F338Fa388Fb on Base mainnet. Part of 4-contract suite: ScoreStorage, ListingOracle, ListingEscrow, BuzzReputation. Combined with x402 micropayments for ATV identity and 8 Bankr x402 Cloud endpoints. HSaaS pricing anchored to on-chain proof. 482 tokens scored, public leaderboard at buzzbd.ai/scores.

4. Beat: agent-governance
   Title: "Trust Gates: 5-Level Graduated Autonomy for Agent Execution"
   Body: Trust Level system from 0 (FULL_APPROVAL) to 4 (AUTONOMOUS). Constitutional execution policy: all tweets, outreach, fund movements require War Room approval at Level 0. BuzzReputation contract tracks accuracy on-chain. Wallet Guard integration adds external governance layer with AION receipts. Agent self-corrects via override learning (LOL token session deployed 3 new permanent rules from single qualitative review).

Draft ALL to War Room. File each after Ogie approves.
Target: 4-5 total signals today across 6 beats.
```

### TASK D: NANSEN MCP WIRING (Phase E)

```
NANSEN MCP — Complete Phase 1 wiring

Nansen MCP was connected as Intel Source #32, feature flags set FALSE, 3 new tables created.
Verify connection is live. Run test query.
If working, flip NANSEN_MCP feature flag to TRUE.
Report results to War Room.

NOTE: NANSEN_API_KEY rotation is PENDING. Current key may still work. If 401 error, Ogie will rotate the key and provide new value.
```

### TASK E: REMAINING CREDENTIAL ROTATION (Ogie handles, Buzz assists)

```
CREDENTIAL ROTATION STATUS — assist Ogie with:

PENDING ROTATIONS (Ogie does these manually):
1. NANSEN_API_KEY — Ogie rotates at nansen.ai dashboard, provides new key
2. X_ACCESS_TOKEN — Ogie rotates at developer.x.com
3. X_ACCESS_TOKEN_SECRET — same
4. X_CONSUMER_KEY — same  
5. X_CONSUMER_SECRET — same

After Ogie provides new values:
- Update in server .env files
- Update in GitHub secrets
- Verify Twitter bot can still post (test tweet draft to War Room)
- Verify Nansen API responds

ALREADY ROTATED (verify working):
- TELEGRAM_BOT_TOKEN → /home/claude-code/.env
- SENTINEL_BOT_TOKEN → /home/claude-code/.hermes/.env
- HETZNER_SSH_KEY → ~/.ssh/authorized_keys
- DOCKER_PASSWORD → GitHub secret
- GH_PAT → GitHub secret
```

### TASK F: CI/CD HARDENING

```
CI/CD SECURITY HARDENING — Add to GitHub Actions workflows:

1. Add --ignore-scripts to npm install:
   npm ci --ignore-scripts

2. Add lockfile integrity check:
   if grep -q "plain-crypto-js" package-lock.json; then
     echo "COMPROMISED DEPENDENCY" && exit 1
   fi

3. Pin axios to exact safe version in package.json (not caret range)

4. Add npm audit step:
   npm audit --audit-level=critical

5. Block C2 IPs on Hetzner:
   iptables -A OUTPUT -d 142.11.206.73 -j DROP
   iptables -A OUTPUT -d 142.11.206.72 -j DROP
   echo "0.0.0.0 sfrclak.com" >> /etc/hosts

6. Create ADR documenting the axios incident and all rotations performed.

Commit all changes. Push. Verify CI/CD runs GREEN.
```

### TASK G: MOLTBOOK + NETWORK OPS

```
MOLTBOOK — Sunday = weekly report, submolt m/crypto

Draft a weekly report covering:
- Axios supply chain compromise response (security narrative — "built by a chef, secured like a vault")
- v9.2 post-sprint operations status
- AIBTC streak status and beat expansion
- MiroFish 10K findings
- Kite AI hackathon progress

Post draft to War Room. Do NOT auto-post.

AIBTC NETWORK SCOUT — Check for new agents to welcome, bounties matching skills.
Draft any engagement to War Room. Rules: public info only, no auto-replies, max 100 sats without approval.
```

### TASK H: PENDING PARTNERSHIP ACTIONS

```
PARTNERSHIP STATUS — Review and action:

1. GARY PALMER (ATV.eth) — Call scheduled Sun Apr 6 or Mon Apr 7, 14:00-18:00 UTC
   - ATV API live, feature flag TRUE, 4,992 credits remaining
   - Ogie sent reply message. Awaiting Gary's calendar confirmation.
   - Prepare: integration stats, scoring impact data, case study outline

2. ALDO (CODÉ/AION) — Wallet Guard Week 2
   - 3 schemas frozen (BuzzEvaluateRequestV1, WalletGuardNormalizedRequestV1, WalletGuardEvaluateResponseV1)
   - Next: send first real evaluate() call with live pipeline data
   - Frontier deadline: May 11

3. NOAH AI (CEO Sparsh, Chirag, Sayuj) — Telegram group "Buzz BD Agent <> Noah AI" created
   - Partnership opened but no concrete next step yet
   - Draft intro message for War Room when bandwidth allows

4. FLYING WHALE — 70/30 revenue split confirmed (skill #110, ionic-nova-token-scorer, 600 sats/query)
   - Operational. No action needed.

5. KITE AI GLOBAL HACKATHON — Registered (Encode Club, Agentic Commerce track)
   - Checkpoint 1 completed early
   - May 6 finale deadline
   - Check for Checkpoint 2 requirements

6. COLOSSEUM FRONTIER — Agent ID #3734, Infrastructure track
   - May 11 deadline
   - Wallet Guard collab with Aldo is the core submission
   - Colosseum Copilot PAT is in GitHub secrets (already rotated with GH_PAT? — verify)
```

---

## STEP 6: DETACH TMUX

After all tasks are queued and Buzz is operational:

```
Ctrl+B then D
```

This detaches without killing the session. Buzz continues running 24/7.

---

## EXECUTION RULES

1. **STREAK FIRST** — Day signal files before ANY other task
2. **Report after each task** to War Room for Ogie approval
3. **Do NOT auto-file signals** — draft to War Room, wait for "APPROVED"
4. **Do NOT post tweets** — draft to War Room, wait for approval
5. **Do NOT send outreach** — draft to War Room, wait for approval
6. **Do NOT spend sats** over 100 without approval
7. **All credential values are INTERNAL** — never in tweets, posts, commits, or public logs
8. **If any service is broken after restart** — report immediately, do not attempt creative fixes

---

## SUCCESS CRITERIA

End of session, Buzz should report:
- [ ] Telegram two-way: WORKING
- [ ] Containers: ALL HEALTHY
- [ ] AIBTC streak: PROTECTED (signal filed today)
- [ ] Beats: 6 total (2 existing + 4 new claimed)
- [ ] Signals today: 4-5 filed across multiple beats
- [ ] Nansen MCP: Phase 1 verified
- [ ] CI/CD hardening: committed
- [ ] ADR for axios incident: created
- [ ] Rank trajectory: improving from #16

---

**Bismillah. The kitchen is back open. Let's cook.**
