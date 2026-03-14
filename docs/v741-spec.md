# 🐝 BUZZ v7.4.1 — TWITTER BRAIN FIX + CHROME MCP

## Sprint Day 26 | March 15, 2026

---

# BATCH 1: TWITTER BRAIN — SERPER REAL SEARCH

## Problem
- Grok x_search doesn't exist as a real-time Twitter search API
- Grok chat generates fake/hallucinated tweet data
- Twitter Brain scans return 0 results
- The entire SCAN→LIST→DEPLOY funnel is dead without real search

## Solution: Serper Google Search + X API v2 Fallback

### Tier 1 — Serper (FREE, existing key)

```javascript
// In services/twitter-brain.js — replace grokSearch() with:

async function serperTwitterSearch(keyword) {
  const response = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'X-API-Key': process.env.SERPER_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      q: `site:x.com "${keyword}"`,
      num: 10,
      tbs: 'qdr:d' // last 24 hours
    })
  });
  
  const data = await response.json();
  
  // Parse Google results for Twitter/X posts
  return (data.organic || []).map(result => ({
    url: result.link,
    title: result.title,
    snippet: result.snippet,
    // Extract handle from x.com URL: https://x.com/handle/status/123
    handle: extractHandleFromUrl(result.link),
    // Extract contract addresses from snippet
    contracts: extractContracts(result.snippet),
    source: 'serper'
  }));
}

function extractHandleFromUrl(url) {
  const match = url.match(/x\.com\/([^\/]+)/);
  return match ? `@${match[1]}` : null;
}

function extractContracts(text) {
  // Solana: base58, 32-44 chars
  const solana = text.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/g) || [];
  // EVM: 0x + 40 hex chars
  const evm = text.match(/0x[a-fA-F0-9]{40}/g) || [];
  return [...solana, ...evm];
}
```

### Tier 2 — X API v2 Search (Pay-per-use fallback)

```javascript
async function xApiSearch(keyword) {
  if (!process.env.X_API_BEARER_TOKEN) return [];
  
  const query = encodeURIComponent(`"${keyword}" -is:retweet lang:en`);
  const response = await fetch(
    `https://api.x.com/2/tweets/search/recent?query=${query}&max_results=10&tweet.fields=author_id,created_at,public_metrics&expansions=author_id&user.fields=public_metrics,username`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.X_API_BEARER_TOKEN}`
      }
    }
  );
  
  const data = await response.json();
  
  return (data.data || []).map(tweet => ({
    url: `https://x.com/i/status/${tweet.id}`,
    text: tweet.text,
    author_id: tweet.author_id,
    handle: findHandle(data.includes?.users, tweet.author_id),
    followers: findFollowers(data.includes?.users, tweet.author_id),
    contracts: extractContracts(tweet.text),
    source: 'x_api'
  }));
}
```

### Combined Search Flow

```javascript
async function twitterBrainScan(keywords) {
  const allResults = [];
  
  for (const keyword of keywords) {
    // Tier 1: Serper (FREE)
    let results = await serperTwitterSearch(keyword);
    
    // Tier 2: X API fallback if Serper returns nothing
    if (results.length === 0 && process.env.X_API_BEARER_TOKEN) {
      results = await xApiSearch(keyword);
    }
    
    allResults.push(...results);
  }
  
  // Dedup by URL
  const unique = [...new Map(allResults.map(r => [r.url, r])).values()];
  
  // Filter: must have handle, prefer posts with contracts
  const filtered = unique.filter(r => r.handle);
  
  // Extract contracts and route to 9-agent pipeline
  const withContracts = filtered.filter(r => r.contracts.length > 0);
  
  for (const result of withContracts) {
    for (const contract of result.contracts) {
      // Route to existing pipeline
      await routeToPipeline(contract, result);
    }
  }
  
  // Queue replies for results without contracts (manual review)
  const withoutContracts = filtered.filter(r => r.contracts.length === 0);
  
  return {
    rawResults: allResults.length,
    afterFilter: filtered.length,
    contractsFound: withContracts.length,
    replyQueue: withoutContracts.length
  };
}
```

### Files to Modify

```
api/services/twitter-brain.js  — Replace grokSearch with serperTwitterSearch + xApiSearch
```

### Test After Fix

```bash
# Manual trigger
curl -s -X POST http://localhost:3000/api/v1/twitter/brain/scan \
  -H "X-API-Key: bzz_0S4j71ZWSqTgd_m8JyydXp1uqwmhN6GADi_9MEJmAg0"

# Should return rawResults > 0
```

---

# BATCH 2: CHROME DEVTOOLS MCP ON HETZNER

## What OpenClaw v2026.3.13 Added

- Chrome DevTools MCP attach mode for signed-in Chrome sessions
- `profile="user"` for logged-in host browser
- `profile="chrome-relay"` for extension relay
- Batched browser actions, selector targeting, delayed clicks

## Architecture

```
Hetzner CX23 (204.168.137.253)
├── Buzz Container (Docker)
│   ├── OpenClaw v2026.3.13 (gateway :18789)
│   ├── REST API (:3000)
│   └── Browser control (:18791) ← already listening!
│
├── Chrome Headless (new — install on host)
│   ├── Remote debugging enabled (:9222)
│   ├── WebMCP flag enabled (Chrome 146+)
│   └── Can be logged into X, DexScreener, etc.
│
└── Connection:
    OpenClaw browser control → Chrome DevTools Protocol → Chrome :9222
```

## Installation Steps

### Step 1: Install Chrome on Hetzner

```bash
ssh root@204.168.137.253

# Install Chrome
wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add -
echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list
apt-get update
apt-get install -y google-chrome-stable

# Verify version (need 146+ for WebMCP)
google-chrome --version
```

### Step 2: Start Chrome with Remote Debugging

```bash
# Start Chrome headless with remote debugging
google-chrome \
  --headless=new \
  --disable-gpu \
  --no-sandbox \
  --remote-debugging-port=9222 \
  --remote-debugging-address=127.0.0.1 \
  --enable-features=WebMCP \
  --user-data-dir=/data/chrome-profile \
  &

# Verify Chrome is listening
curl -s http://localhost:9222/json/version
```

### Step 3: Configure OpenClaw to Use Chrome

```json
// Add to openclaw.json (or via env var)
{
  "browser": {
    "provider": "chrome-devtools",
    "endpoint": "http://127.0.0.1:9222",
    "profile": "user",
    "existingSession": true
  }
}
```

### Step 4: Add Chrome to Docker Compose (Alternative)

If running Chrome inside Docker alongside Buzz:

```yaml
# Add to /data/buzz/docker-compose.yml
services:
  chrome:
    image: zenika/alpine-chrome:latest
    container_name: buzz-chrome
    restart: unless-stopped
    ports:
      - "9222:9222"
    command: >
      --headless=new
      --disable-gpu
      --no-sandbox
      --remote-debugging-port=9222
      --remote-debugging-address=0.0.0.0
    volumes:
      - /data/chrome-profile:/data/chrome-profile
```

### Step 5: Test Browser Control

```bash
# From inside Buzz container
curl -s http://localhost:9222/json/version

# Or test via OpenClaw
docker exec buzz-production openclaw browser list-pages
```

## WebMCP Integration (When Sites Support It)

```javascript
// Future: Buzz discovers and calls WebMCP tools on websites
async function discoverWebMCPTools(url) {
  // Navigate to page
  await browser.navigate(url);
  
  // Query registered tools via navigator.modelContext
  const tools = await browser.evaluate(`
    navigator.modelContext.tools.map(t => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema
    }))
  `);
  
  return tools;
}

// Example: If DexScreener adds WebMCP
const tools = await discoverWebMCPTools('https://dexscreener.com');
// tools = [{ name: "search_token", inputSchema: {...} }, ...]
// Buzz can now call search_token directly!
```

## Use Cases (Immediate — No WebMCP Needed)

Even without WebMCP, Chrome DevTools MCP gives Buzz:

1. **Twitter posting** — Navigate to x.com, post tweets via DOM manipulation (no API needed)
2. **DexScreener enhanced** — Access pro features via logged-in session
3. **SolCex admin** — Manage listings through browser automation
4. **Telegram web** — Monitor channels via web.telegram.org
5. **Screenshot proof** — Take screenshots of listed tokens for outreach proof

## Use Cases (Future — When WebMCP Adopted)

1. **Any exchange** with WebMCP: `list_token`, `check_pair`, `verify_deposit`
2. **DexScreener**: `search_token`, `get_pair_data`, `get_top_boosts`
3. **X/Twitter**: `post_tweet`, `search_tweets`, `send_dm`
4. **Bankr**: `deploy_token`, `check_deploy_status`

---

# DEPLOYMENT

## Quick Deploy (Batch 1 only — Twitter Brain fix)

```bash
# Claude Code
cd ~/buzz-bd-agent
# Fix twitter-brain.js
docker build --platform linux/amd64 --no-cache -t buzzbd/buzz-bd-agent:v7.4.1 .
docker push buzzbd/buzz-bd-agent:v7.4.1

# Hetzner
ssh root@204.168.137.253
cd /data/buzz
sed -i 's/v7.4.0/v7.4.1/' docker-compose.yml
docker pull buzzbd/buzz-bd-agent:v7.4.1
docker compose down && docker compose up -d
```

## Full Deploy (Batch 1 + 2)

```bash
# Same as above plus Chrome installation
ssh root@204.168.137.253
apt-get install -y google-chrome-stable
# Start Chrome headless
# Configure OpenClaw browser settings
# Test: openclaw browser list-pages
```

---

# TIMELINE

| Task | Time | Priority |
|------|------|----------|
| Batch 1: Twitter Brain Serper fix | 30 min (Claude Code) | HIGH — unlocks deal hunting |
| Batch 2a: Chrome install on Hetzner | 15 min | MEDIUM |
| Batch 2b: OpenClaw browser config | 30 min | MEDIUM |
| Batch 2c: Test browser automation | 30 min | MEDIUM |
| WebMCP SolCex implementation | Day 28+ | LOW (Chrome 146 not stable) |

---

*v7.4.1 — Twitter Brain Fix + Chrome MCP*
*Sprint Day 26 | March 15, 2026*
