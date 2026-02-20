# OpenClaw v2026.2.19 Upgrade — GitHub Prep Checklist

> **Goal:** Pre-build everything on GitHub so the Akash redeploy on Feb 25 (Indonesia Sprint Day 1) is a clean swap with zero downtime risk.
>
> **Current:** v2026.2.2 on Akash | v2026.2.17 on Mac (tested, confirmed working)
>
> **Target:** v2026.2.19 on Akash with eliza-adapter + plugin-solcex-bd + sub-agents
>
> **Why v2026.2.19 (not v2026.2.17):** Released Feb 19, 2026. Critical Telegram cron delivery fix, ACP session hardening, gateway auth auto-generation, streaming fixes. See "What's New" section below.

---

## What's New in v2026.2.19 (vs v2026.2.17)

### Directly Impacts Buzz
| Area | Fix | Why It Matters |
|------|-----|----------------|
| **Telegram/Cron** | Honors explicit topic targets in cron/heartbeat delivery | Cron jobs land in correct TG thread, not last active |
| **Telegram** | Unified message + channel_post pipeline | Cleaner message handling, fewer edge-case failures |
| **Telegram** | Tool-failure warnings gated behind verbose mode | Clean Telegram replies by default |
| **Gateway/Auth** | Auto-generates `gateway.auth.token` on startup | Gateway no longer runs without auth by default |
| **Security/ACP** | Hardened ACP sessions: idle reaping, burst rate limiting | Safer sub-agent delegation |
| **Cron/Heartbeat** | Skips heartbeat when HEARTBEAT.md missing/empty | No wasted LLM calls on empty heartbeats |
| **Streaming** | Keeps assistant streaming active during reasoning | Better response quality from MiniMax |
| **Security/Cron** | SSRF-guarded cron webhook delivery | Cron webhooks can't be exploited |
| **Security/Skills** | Rejects symlinks in skill packaging | ClawHub skill security |
| **Security/Gateway** | Fails startup if hooks.token = gateway.auth.token | Prevents token reuse misconfiguration |
| **Billing** | Shows active model in billing errors | Easier debugging when cascade fallback fires |

### Post-Deploy Action Required
- **Gateway auth token:** v2026.2.19 auto-generates `gateway.auth.token` on first boot. Verify Telegram bot and external connections work with this new auth.
- **Run `openclaw doctor`:** New security audit checks added — will flag any misconfigurations.
- **Check `gateway.auth.mode`:** If previously set to `"none"`, v2026.2.19 will flag this as a security finding.
- **Verify `hooks.token` ≠ `gateway.auth.token`:** v2026.2.19 fails startup if they match.

---

## Pre-Flight (Do in Bangkok, 64h window)

### Step 1: Update SDL with v2026.2.19 Base Image

**File:** `deploy.yaml` (Akash SDL)

Changes needed:
- Update container image tag from v2026.2.2 → v2026.2.19
- Verify resource allocation (CPU, memory, storage) is sufficient for multi-agent
- Ensure persistent storage mount paths are unchanged:
  - `/data/.openclaw` (state dir)
  - `/data/workspace` (workspace dir)

**Verification:**
- [ ] Image tag updated to v2026.2.19
- [ ] All env vars match Section 3.6 of Ops v5.2.0
- [ ] Storage mounts unchanged (critical: persistent data survives redeploy)
- [ ] Port 18789 exposed globally

---

### Step 2: Update entrypoint.sh

**File:** `entrypoint.sh`

This is the critical boot script. Must set env vars BEFORE gateway starts or config is ignored.

**Verification:**
- [ ] OPENCLAW_STATE_DIR set before gateway start
- [ ] OPENCLAW_WORKSPACE_DIR set before gateway start
- [ ] NPM_CONFIG_PREFIX set for global npm packages
- [ ] PATH includes npm-global/bin and linuxbrew
- [ ] eliza-adapter auto-installed if missing
- [ ] plugin-solcex-bd auto-installed if missing
- [ ] Config backup before gateway start
- [ ] Uses `exec openclaw gateway --port 18789` (not `--yes`)
- [ ] Runs in foreground (tini manages process)

---

### Step 3: Include eliza-adapter + plugin-solcex-bd in Build

**Option A: Install at runtime** (entrypoint.sh — already handled)
- Pros: Simpler Dockerfile, always gets latest
- Cons: Slower cold boot, depends on npm registry availability

**Option B: Bake into Docker image** (recommended for Akash)
- Pros: Fast cold boot, no external dependency at runtime
- Cons: Needs image rebuild for plugin updates

**Verification:**
- [ ] Dockerfile uses v2026.2.19 base
- [ ] eliza-adapter pre-installed
- [ ] plugin-solcex-bd@1.0.0 pre-installed
- [ ] entrypoint.sh copied and executable
- [ ] tini as PID 1

---

### Step 4: Update openclaw.json for Multi-Agent + Auth

**File:** `/data/.openclaw/openclaw.json`

Key changes for v2026.2.19:
- Add `gateway.auth.mode: "token"` explicitly
- Add scout agent alongside main
- Ensure `hooks.token` ≠ `gateway.auth.token`

> **⚠️ DO NOT commit API keys to GitHub.** Use environment variables or restore from backup on deploy.

**Verification:**
- [ ] Main agent configured with eliza-adapter + plugin
- [ ] Scout agent configured for token discovery
- [ ] MiniMax M2.5 as primary LLM for both agents
- [ ] `api` field is `"anthropic-messages"` (NOT "openai")
- [ ] `gateway.auth.mode` set to `"token"`
- [ ] No API keys in committed config (use env vars)
- [ ] `hooks.token` ≠ `gateway.auth.token` (v2026.2.19 fails startup if same)

---

### Step 5: Test Locally on Mac

**First:** Update your local Mac to v2026.2.19:
```bash
npm install -g openclaw@2026.2.19
# or if using beta:
npm install -g openclaw@beta
```

Then run tests:

```bash
# 1. Start gateway with new config
export OPENCLAW_STATE_DIR=~/.openclaw-test
export OPENCLAW_WORKSPACE_DIR=~/workspace-test
openclaw gateway --port 18789

# 2. CHECK: Gateway should auto-generate auth token on first boot
# Look in logs for: "gateway.auth.token generated"
# Save this token — Telegram bot needs it

# 3. Test main agent responds via Telegram
# Send to @BuzzBySolCex_bot: "health check"

# 4. Test sub-agent spawning
# Send: "Spawn TOKEN SCOUT — scan DexScreener for new Solana tokens over $1M MC"
# Expected: 15-second turnaround

# 5. Test cron topic delivery (v2026.2.19 fix)
# Create a test cron job targeting a specific TG topic
# Verify it lands in the correct thread

# 6. Test eliza-adapter + plugin loaded
# Send: "/scan" or "SCAN_TOKENS"

# 7. Test ACP bridge
# Send: "ACP bridge status"

# 8. Run openclaw doctor
openclaw doctor
# Check for: gateway.auth warnings, unpinned plugins, skill symlink warnings
```

**Verification:**
- [ ] v2026.2.19 installed locally
- [ ] Gateway starts cleanly
- [ ] Auth token auto-generated on first boot
- [ ] Main agent responds via Telegram
- [ ] Sub-agent (scout) spawns successfully
- [ ] sessions_spawn → execute → auto-announce works
- [ ] Cron delivers to correct TG topic (v2026.2.19 fix)
- [ ] eliza-adapter loaded
- [ ] plugin-solcex-bd actions working (SCAN_TOKENS, SCORE_TOKEN)
- [ ] ACP bridge connected
- [ ] `openclaw doctor` passes clean
- [ ] 15-second turnaround on delegation tasks

---

### Step 6: Push to GitHub

```bash
cd ~/buzz-bd-agent

git add deploy.yaml
git add entrypoint.sh
git add Dockerfile
git add openclaw.json.template
git add UPGRADE-CHECKLIST.md

git commit -m "feat: OpenClaw v2026.2.19 upgrade prep

- Updated SDL for v2026.2.19 (released Feb 19, 2026)
- entrypoint.sh with plugin auto-install + auth token notes
- Dockerfile with pre-baked eliza-adapter + plugin-solcex-bd
- Multi-agent config (main + scout) with gateway.auth.mode=token
- ACP session hardening + Telegram cron topic delivery fix
- Rollback SDL (v2026.2.2) included for safety

Ready for Akash redeploy Indonesia Sprint Day 1 (Feb 25)"

git push origin main
```

**Verification:**
- [ ] No API keys in any committed files
- [ ] No wallet private keys
- [ ] No Firecrawl key
- [ ] All files updated and committed

---

## Deployment Day (Feb 25 — Indonesia Sprint Day 1)

### Deploy Sequence (< 5 minutes)

```bash
# 1. Backup current state from Akash
tar -czf /data/workspace/buzz-backup-$(date +%Y%m%d).tar.gz \
  /data/.openclaw/openclaw.json \
  /data/.openclaw/cron/ \
  /data/workspace/memory/

# 2. Close current deployment
akash tx deployment close --from=<wallet> --dseq=<current-dseq>

# 3. Deploy new SDL
akash tx deployment create deploy.yaml --from=<wallet>

# 4. Wait for container to start (~60s)

# 5. IMPORTANT (v2026.2.19): Check gateway auth token
# Gateway auto-generates token on first boot
# Find in logs or: /data/.openclaw/openclaw.json
# Verify Telegram bot connects with this token

# 6. Verify gateway running
# Telegram: send "health check" to @BuzzBySolCex_bot

# 7. Verify cron jobs restored
# Send: "List all cron jobs — confirm 39 active"

# 8. Verify sub-agents work
# Send: "Spawn TOKEN SCOUT test"

# 9. Run openclaw doctor
openclaw doctor

# 10. Verify cron topic delivery
# Wait for next scheduled cron → confirm correct TG thread
```

### Rollback Plan

If anything fails:
```bash
# 1. Close failed deployment
akash tx deployment close --from=<wallet> --dseq=<new-dseq>

# 2. Redeploy with OLD SDL (v2026.2.2)
akash tx deployment create deploy-v2026.2.2-rollback.yaml --from=<wallet>

# 3. Restore from backup
# Cron auto-restore from /data/workspace/memory/cron-schedule.json
# Config from /data/.openclaw/openclaw.json.bak
```

---

## Bangkok 64h Action Plan

| Priority | Task | Time Est |
|----------|------|----------|
| 1 | Update local Mac to v2026.2.19 | 15 min |
| 2 | Update SDL (deploy.yaml) | 30 min |
| 3 | Update entrypoint.sh | 30 min |
| 4 | Create/update Dockerfile | 30 min |
| 5 | Update openclaw.json template | 30 min |
| 6 | Test locally on Mac — all 12 checks | 2 hrs |
| 7 | Push to GitHub | 15 min |
| 8 | Document rollback SDL | 15 min |
| **Total** | | **~5 hrs** |

---

## Files to Commit

```
buzz-bd-agent/
├── deploy.yaml                     # Akash SDL (v2026.2.19)
├── deploy-v2026.2.2-rollback.yaml  # Rollback SDL
├── Dockerfile                      # Pre-baked plugins
├── entrypoint.sh                   # Boot script
├── openclaw.json.template          # Config template (NO keys)
├── UPGRADE-CHECKLIST.md            # This file
└── memory/
    └── cron-schedule.json          # 39-job cron backup
```

---

## Ops Master Update (Post-Deploy)

| Field | Old Value | New Value |
|-------|-----------|-----------|
| Current on Buzz (Akash) | v2026.2.2 | **v2026.2.19** |
| Current on Mac (local) | v2026.2.17 | **v2026.2.19** |
| Target upgrade (Akash) | v2026.2.17 | **DONE** |
| Release date | — | Feb 19, 2026 |
| Key fixes | — | TG cron topic, ACP hardening, gateway auth, streaming |

---

*Prepared: Feb 19, 2026 — Claude Opus 4.6*
*Target: v2026.2.19 (released Feb 19, 2026)*
*For: Ogie @ SolCex Exchange*
*Repo: github.com/buzzbysolcex/buzz-bd-agent*
