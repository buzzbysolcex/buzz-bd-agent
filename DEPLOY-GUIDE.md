# 🐝 DEPLOYMENT GUIDE — v6.2.0-acp

## Sprint Day 9 | March 3, 2026

---

## WHAT'S NEW IN v6.2.0-acp

| Feature         | Previous (v6.1.1)         | New (v6.2.0-acp)                         |
| --------------- | ------------------------- | ---------------------------------------- |
| REST API        | Local scaffold only       | **Baked in, auto-starts on port 3000**   |
| ACP Marketplace | Manual patch on container | **Baked in, auto-starts after 30s**      |
| AgentProof SDK  | Not installed             | **`@agentproof/sdk` globally installed** |
| tsx runtime     | Manual install            | **Globally installed**                   |
| Bankr CLI       | Manual install            | **Globally installed**                   |
| OpenClaw        | v2026.2.26                | **v2026.3.1**                            |
| Ports exposed   | 18789 only                | **18789 + 3000**                         |
| ACP env vars    | None                      | **6 new ACP env vars**                   |

---

## PRE-BUILD CHECKLIST

Your project structure on Mac should look like:

```
~/buzz-bd-agent/
├── Dockerfile                  ← REPLACE with new version
├── entrypoint.sh               ← REPLACE with new version
├── deploy.yaml                 ← REPLACE with new version
├── skills/                     ← Existing skills (no changes)
│   ├── clawrouter/
│   ├── quillshield/
│   ├── orchestrator/
│   ├── buzz-pipeline-scan/
│   └── ...
├── api/                        ← NEW: REST API scaffold + score-token
│   ├── server.js               ← Day 8 scaffold
│   ├── db.js                   ← Day 8 scaffold + new migrations
│   ├── package.json            ← Needs: express, better-sqlite3, express-rate-limit
│   ├── routes/
│   │   ├── health.js           ← Day 8
│   │   ├── agents.js           ← Day 8
│   │   ├── pipeline.js         ← Day 8
│   │   ├── costs.js            ← Day 8
│   │   ├── crons.js            ← Day 8
│   │   └── score.js            ← NEW: /score-token endpoint
│   ├── services/
│   │   ├── orchestrator.js     ← NEW: 5 parallel sub-agent dispatch
│   │   ├── agentproof.js       ← NEW: AgentProof telemetry
│   │   ├── costTracker.js      ← NEW: Cost tracking
│   │   └── agents/
│   │       ├── scanner.js      ← NEW: L1 DexScreener
│   │       ├── safety.js       ← NEW: L2 RugCheck
│   │       ├── wallet.js       ← NEW: L2 Helius
│   │       ├── social.js       ← NEW: L3 Grok/Serper/ATV
│   │       └── scorer.js       ← NEW: L4 11-factor composite
│   ├── middleware/
│   │   ├── auth.js             ← Day 8
│   │   ├── rateLimit.js        ← Day 8
│   │   └── validate.js         ← NEW: Score request validation
│   └── migrations/
│       └── score-tables.js     ← NEW: DB migrations
├── acp/                        ← NEW: ACP configuration
│   ├── config.json.template
│   ├── start-acp.sh
│   └── offerings/              ← Copy from /data/ on current deploy
│       ├── token_intelligence_score/
│       │   ├── offering.json
│       │   └── handlers.ts
│       ├── token_safety_check/
│       │   ├── offering.json
│       │   └── handlers.ts
│       ├── trending_token_intelligence/
│       │   ├── offering.json
│       │   └── handlers.ts
│       └── exchange_listing_readiness/
│           ├── offering.json
│           └── handlers.ts
└── .git/
```

---

## STEP-BY-STEP BUILD & DEPLOY

### Step 0: Prep files on Mac

```bash
cd ~/buzz-bd-agent

# 1. Replace Dockerfile, entrypoint.sh, deploy.yaml with new versions
# (from the files I created)

# 2. Extract score-token tarball into api/
cd api
tar xzf ~/Downloads/buzz-score-token-endpoint-v1.0.tar.gz
cd ..

# 3. Wire score routes into server.js
# Add these lines to api/server.js:
#   const scoreRoutes = require('./routes/score');
#   app.use('/api/v1', scoreRoutes);

# 4. Add migrations to api/db.js (see INTEGRATION.md)

# 5. Copy ACP offerings from current Akash deploy
# In Akash Shell:
#   tar czf /data/acp-offerings.tar.gz /data/workspace/skills/virtuals-acp/src/seller/offerings/buzz-bd-agent/
# Then download and extract to acp/offerings/

# 6. Create acp/ directory with config template + start script
# (from the files I created)
```

### Step 1: Test API locally

```bash
cd ~/buzz-bd-agent/api
npm install  # Ensure express, better-sqlite3, express-rate-limit
BUZZ_DB_DIR=./data BUZZ_API_ADMIN_KEY=test-admin node server.js

# Test score endpoint
curl -s -X POST http://localhost:3000/api/v1/score-token \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test-admin" \
  -d '{"address": "So11111111111111111111111111111111111111112", "chain": "solana"}' | jq .score
```

### Step 2: Build Docker image

```bash
cd ~/buzz-bd-agent

# Clean previous builds
docker builder prune -f

# Build with NEW tag — NEVER reuse tags
docker build --no-cache -t ghcr.io/buzzbysolcex/buzz-bd-agent:v6.2.0-acp .
```

### Step 3: Push to GHCR

```bash
# Login if needed
echo $GITHUB_TOKEN | docker login ghcr.io -u buzzbysolcex --password-stdin

# Push
docker push ghcr.io/buzzbysolcex/buzz-bd-agent:v6.2.0-acp
```

### Step 4: Deploy to Akash

**⚠️ Use Option B (Close + New Deployment)** — config changes + new ports need fresh deploy.

1. Akash Console → Close current deployment
2. Create New Deployment
3. Paste deploy.yaml SDL (with all env vars filled in)
4. **IMPORTANT: Fill in ALL `<your-...-key>` placeholders**
5. Submit and wait for provider bid

### Step 5: Verify

```bash
# In Akash Shell:
# 1. Check boot logs — should see:
#   🐝 Buzz BD Agent v6.2.0-acp
#   ✅ Skills synced
#   ✅ ACP configured (Agent #17681)
#   ✅ REST API started
#   ✅ ACP auto-start scheduled
#   🐝 Starting OpenClaw gateway...

# 2. Pair Telegram
openclaw pairing approve telegram <PAIRING_CODE>

# 3. Test REST API
curl -s http://localhost:3000/api/v1/health | jq

# 4. Check ACP logs
tail -f /data/logs/acp-serve.log

# 5. Check API logs
tail -f /data/logs/api.log

# 6. Test score-token
curl -s -X POST http://localhost:3000/api/v1/score-token \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $BUZZ_API_ADMIN_KEY" \
  -d '{"address": "So11111111111111111111111111111111111111112", "chain": "solana"}' | jq
```

---

## NEW ENV VARS FOR SDL

Add these to your SDL (in addition to existing vars):

| Var                  | Value                      | Purpose                 |
| -------------------- | -------------------------- | ----------------------- |
| `BUZZ_API_ADMIN_KEY` | Generate a strong key      | REST API authentication |
| `AGENTPROOF_API_KEY` | `ap_live_9d36bbc...`       | AgentProof telemetry    |
| `ACP_API_KEY`        | `acp-300feee455111d5117dc` | ACP authentication      |
| `ACP_AUTH_TOKEN`     | From ACP login session     | ACP session token       |
| `ACP_AGENT_ID`       | `17681`                    | ACP Agent ID            |
| `ACP_WALLET_ADDRESS` | `0x01aBCA1E...`            | ACP wallet (Base)       |
| `ACP_OWNER_ADDRESS`  | `0x2Dc031...`              | Owner wallet (Base)     |

---

## WHAT BOOTS ON STARTUP (in order)

1. **Environment setup** — dirs, paths, npm prefix
2. **Skills sync** — copy from /opt/buzz-skills/ to /data/workspace/skills/
3. **ACP setup** — clone, install deps, generate config, install CLI wrapper
4. **REST API setup** — symlink data dir
5. **OpenClaw config** — generate from env vars (all providers, models, keys)
6. **Boot self-check** — crons, pipeline, orchestrator, ACP
7. **REST API start** — background, port 3000, logs to /data/logs/api.log
8. **ACP seller start** — background, 30s delay, logs to /data/logs/acp-serve.log
9. **OpenClaw gateway** — foreground (main process), port 18789

---

## ROLLBACK

If v6.2.0-acp has issues:

```bash
# Option 1: Redeploy v6.1.1 (previous working version)
# Akash Console → Close → New Deployment with v6.0.19 tag + old SDL

# Option 2: Git revert
cd ~/buzz-bd-agent
git log --oneline -5
git revert HEAD
docker build --no-cache -t ghcr.io/buzzbysolcex/buzz-bd-agent:v6.2.0-acp-fix .
docker push ghcr.io/buzzbysolcex/buzz-bd-agent:v6.2.0-acp-fix
```

---

## ACP OFFERINGS EXPORT

Before closing the current deployment, export the ACP offerings:

```bash
# In Akash Shell on CURRENT deployment:
cd /data/workspace/skills/virtuals-acp/src/seller/offerings/buzz-bd-agent
tar czf /data/acp-offerings-backup.tar.gz .

# Then download from Akash or cat + copy each file
# You need these directories:
#   token_intelligence_score/ (offering.json + handlers.ts)
#   token_safety_check/
#   trending_token_intelligence/
#   exchange_listing_readiness/
```

---

_Sprint Day 9 | v6.2.0-acp deployment guide_
_"Ship from anywhere. Docker + Akash + Telegram." 🐝_
