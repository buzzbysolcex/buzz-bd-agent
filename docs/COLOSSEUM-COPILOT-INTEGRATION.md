# COLOSSEUM COPILOT INTEGRATION — WAR ROOM DEPLOYMENT PACKAGE
## Day 39 | Sprint Day 39 | Mar 28, 2026
## Bismillah 🤲

---

# ═══════════════════════════════════════════════════════
# SECTION A: WAR ROOM PROMPT (paste this into Telegram)
# ═══════════════════════════════════════════════════════

```
PRIORITY TASK: Install Colosseum Copilot as Intel Source #18

CONTEXT:
Colosseum Copilot is a research API with 5,400+ Solana hackathon projects, 
84,000+ archive docs, 6,300+ live crypto products. Free, read-only, PAT-based auth.
Buzz is already registered on Colosseum as @BuzzBySolCex (Agent ID #3734, Frontier).
This gives Buzz hackathon intelligence for BD enrichment, competitive landscape, 
and Sunday report trend data.

PERSISTENCE (do these FIRST):
─────────────────────────────
1. Save this ENTIRE message as:
   /home/claude-code/buzz-workspace/docs/COLOSSEUM-COPILOT-INTEGRATION.md
2. Add to CLAUDE.md startup read order (after MASTER-OPS-BD-SCREENING.md):
   - docs/COLOSSEUM-COPILOT-INTEGRATION.md
3. This document is PERMANENT. Same treatment as:
   - BUZZ-ZHC-HANDOVER-v3.md (genome)
   - AIBTC-SIGNAL-FACTORY.md (revenue engine)
   - MASTER-OPS-BD-SCREENING.md (BD workflow)
   Claude Code must know Copilot = Intel Source #18 on every boot.

STEP 1: Add env vars to /opt/buzz/.env
───────────────────────────────────────
Add these two lines:

COLOSSEUM_COPILOT_API_BASE=https://copilot.colosseum.com/api/v1
COLOSSEUM_COPILOT_PAT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzY29wZSI6ImNvbG9zc2V1bV9jb3BpbG90OnJlYWQiLCJ1c2VybmFtZSI6IkJ1enpCeVNvbENleCIsImRpc3BsYXlOYW1lIjoiQnV6eiBCRCBBZ2VudCIsInJvbGVzIjpbXSwidG9rZW5WZXJzaW9uIjoxLCJpYXQiOjE3NzQ2NDk1MDMsImF1ZCI6ImNvbG9zc2V1bV9jb3BpbG90Iiwic3ViIjoiODQwMjUiLCJleHAiOjE3ODI0MjU1MDMsImp0aSI6IjExNzAzNTA4LTE2ODMtNDhhOS1iZWNjLWMwMzg0OGJiZGZiMSJ9.fzjDbcBk8saRNzL7ZT8-6YRu8gHjn6bmnU0o3v74NQU

SECURITY: This PAT is SECRET. Never commit to GitHub. Never expose in logs.
Same treatment as Firecrawl key and Gmail OAuth.

STEP 2: Install the Claude Code skill
──────────────────────────────────────
npx skills add ColosseumOrg/colosseum-copilot

STEP 3: Verify connection
─────────────────────────
curl "$COLOSSEUM_COPILOT_API_BASE/status" \
  -H "Authorization: Bearer $COLOSSEUM_COPILOT_PAT"

Expected: { "authenticated": true, "expiresAt": "2026-06-25T...", "scope": "colosseum_copilot:read" }

STEP 4: Test — search for Buzz's competitive landscape
───────────────────────────────────────────────────────
curl -X POST "$COLOSSEUM_COPILOT_API_BASE/search/projects" \
  -H "Authorization: Bearer $COLOSSEUM_COPILOT_PAT" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "autonomous exchange listing agent BD",
    "limit": 10,
    "filters": {}
  }'

STEP 5: Check AI Agent Infrastructure cluster
──────────────────────────────────────────────
curl "$COLOSSEUM_COPILOT_API_BASE/clusters/v1-c14" \
  -H "Authorization: Bearer $COLOSSEUM_COPILOT_PAT"

STEP 6: Pull available filters
──────────────────────────────
curl "$COLOSSEUM_COPILOT_API_BASE/filters" \
  -H "Authorization: Bearer $COLOSSEUM_COPILOT_PAT"

STEP 7: Create the Copilot module
──────────────────────────────────
Create api/lib/colosseum-copilot.js with these functions:
- searchProjects(query, filters, limit) → POST /search/projects
- searchArchives(query, sources, limit) → POST /search/archives
- getProjectBySlug(slug) → GET /projects/by-slug/:slug
- getCluster(key) → GET /clusters/:key
- analyzeCohort(cohort, dimensions) → POST /analyze
- compareCohorts(cohortA, cohortB, dims) → POST /compare
- enrichTokenWithHackathonData(tokenName, desc) → search + format for pipeline

All use Bearer auth from env. All return JSON. Handle 429 with Retry-After.

STEP 8: Add Express endpoints
──────────────────────────────
GET /api/v1/copilot/search?q={query}        — Project search
GET /api/v1/copilot/enrich/:tokenName       — Token enrichment for pipeline
GET /api/v1/copilot/cluster/:key            — Cluster details
GET /api/v1/copilot/trends                  — Hackathon trend comparison
GET /api/v1/copilot/landscape?q={query}     — Full landscape check

All require X-API-Key header (same admin key as other endpoints).

STEP 9: Add War Room commands
─────────────────────────────
/copilot <query>     — Search Colosseum projects
/landscape <token>   — Competitive landscape for a token
/trends              — Latest hackathon trend comparison
/cluster <key>       — Explore a project cluster

STEP 10: Wire into pipeline-scanner (Phase 2)
─────────────────────────────────────────────
After token discovery, before scoring:
- Call enrichTokenWithHackathonData(tokenName, tokenDescription)
- If hackathon match found: +5 composite bonus
- If prize winner: +10 composite bonus
- If accelerator backed: +15 composite bonus
- Store enrichment data in pipeline notes

STEP 11: Add Phase 3.5 to BD Screening
───────────────────────────────────────
Between Phase 3 (Classification) and Phase 4 (Contact Screening):
- Cross-ref BD SWEET SPOT tokens against Copilot projects
- Extract team members from /projects/by-slug/:slug
- Use hackathon history in outreach personalization

STEP 12: Sunday Report trend section
─────────────────────────────────────
Add weekly cron (Sun 16:00 UTC):
- POST /compare with latest vs previous hackathon
- Dimensions: problemTags, primitives, techStack
- Output: "SOLANA BUILDER TRENDS" section for report

After all steps, report to War Room:
- ✅ Document saved to docs/ and added to CLAUDE.md startup read order
- Connection status
- Number of projects found for "exchange listing agent"
- Cluster v1-c14 size
- New endpoints added
- Module file location

PAT ROTATION: Expires ~Jun 25, 2026. Calendar reminder set for Jun 20.
Renew at https://arena.colosseum.org/copilot → update .env → ah restart buzz.
```

---

# ═══════════════════════════════════════════════════════
# SECTION B: FULL INTEGRATION ARCHITECTURE (reference)
# ═══════════════════════════════════════════════════════

## OVERVIEW

```
Intel Source #18: Colosseum Copilot
Cost: $0 (free API, PAT auth, 90-day rotation)
Data: 5,400+ hackathon projects, 84,000+ archives, 6,300+ products
Rate limits: 30 search/min, 10 analysis/min, 2 concurrent
Account: BuzzBySolCex (ID 84025)
Scope: colosseum_copilot:read
PAT expires: ~Jun 25, 2026
```

## API ENDPOINTS (Copilot)

```
Base: https://copilot.colosseum.com/api/v1
Auth: Bearer $COLOSSEUM_COPILOT_PAT

GET  /status                          — Auth check
GET  /filters                         — Available filters + hackathon list
POST /search/projects                 — Semantic project search (30 req/min)
POST /search/archives                 — Archive document search (30 req/min)
GET  /archives/:documentId            — Fetch archive document
GET  /projects/by-slug/:slug          — Full project details
POST /analyze                         — Cohort analysis (10 req/min)
POST /compare                         — Compare two cohorts (10 req/min)
GET  /clusters/:key                   — Cluster details
POST /source-suggestions              — Suggest new archive source (5 req/hr)
POST /feedback                        — Report issues (10 req/hr)
```

## INTEGRATION ARCHITECTURE

```
┌─────────────────────────────────────────────────────┐
│                BUZZ v8.2.0+                          │
│                                                      │
│  ┌──────────────┐  ┌─────────────────────────────┐  │
│  │ pipeline-     │  │ bd-proposer                 │  │
│  │ scanner       │  │                             │  │
│  │               │  │ Phase 3.5 (NEW):            │  │
│  │ Discovery →   │  │ Colosseum cross-ref         │  │
│  │ Copilot       │  │ before outreach             │  │
│  │ enrichment    │  │                             │  │
│  └──────┬───────┘  └──────────┬──────────────────┘  │
│         │                      │                      │
│  ┌──────▼──────────────────────▼──────────────────┐  │
│  │         COLOSSEUM COPILOT MODULE                │  │
│  │         api/lib/colosseum-copilot.js            │  │
│  │                                                 │  │
│  │  searchProjects(query, filters)                 │  │
│  │  searchArchives(query, sources)                 │  │
│  │  getProjectBySlug(slug)                         │  │
│  │  getCluster(key)                                │  │
│  │  analyzeCohort(cohort, dimensions)              │  │
│  │  compareCohorts(cohortA, cohortB, dims)         │  │
│  │  enrichTokenWithHackathonData(name, desc)       │  │
│  └──────┬──────────────────────┬──────────────────┘  │
│         │                      │                      │
│  ┌──────▼───────┐  ┌──────────▼──────────────────┐  │
│  │ war-room-    │  │ Sunday Listing               │  │
│  │ reporter     │  │ Intelligence Report          │  │
│  │              │  │                              │  │
│  │ /copilot cmd │  │ Trend section from           │  │
│  │ in War Room  │  │ /analyze + /compare          │  │
│  └──────────────┘  └────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

## MODULE CODE: api/lib/colosseum-copilot.js

```javascript
const COPILOT_BASE = process.env.COLOSSEUM_COPILOT_API_BASE;
const COPILOT_PAT = process.env.COLOSSEUM_COPILOT_PAT;

const headers = {
  'Authorization': `Bearer ${COPILOT_PAT}`,
  'Content-Type': 'application/json'
};

async function copilotFetch(path, options = {}) {
  const url = `${COPILOT_BASE}${path}`;
  const res = await fetch(url, { headers, ...options });
  
  if (res.status === 429) {
    const retryAfter = res.headers.get('Retry-After') || 5;
    console.warn(`[Copilot] Rate limited. Retry after ${retryAfter}s`);
    throw new Error(`RATE_LIMITED: retry after ${retryAfter}s`);
  }
  
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Copilot ${res.status}: ${body}`);
  }
  
  return res.json();
}

async function searchProjects(query, filters = {}, limit = 10) {
  return copilotFetch('/search/projects', {
    method: 'POST',
    body: JSON.stringify({ query, limit, filters })
  });
}

async function searchArchives(query, sources = [], limit = 5) {
  return copilotFetch('/search/archives', {
    method: 'POST',
    body: JSON.stringify({ query, limit, sources: sources.length ? sources : undefined })
  });
}

async function getProjectBySlug(slug) {
  return copilotFetch(`/projects/by-slug/${encodeURIComponent(slug)}`);
}

async function getCluster(key) {
  return copilotFetch(`/clusters/${encodeURIComponent(key)}`);
}

async function analyzeCohort(cohort, dimensions, topK = 10) {
  return copilotFetch('/analyze', {
    method: 'POST',
    body: JSON.stringify({ cohort, dimensions, topK })
  });
}

async function compareCohorts(cohortA, cohortB, dimensions, topK = 5) {
  return copilotFetch('/compare', {
    method: 'POST',
    body: JSON.stringify({ cohortA, cohortB, dimensions, topK })
  });
}

async function enrichTokenWithHackathonData(tokenName, tokenDescription = '') {
  try {
    const data = await searchProjects(
      `${tokenName} ${tokenDescription}`.trim(),
      {},
      5
    );
    
    return {
      hasHackathonHistory: data.results.length > 0,
      relatedProjects: data.results.map(r => ({
        name: r.name,
        slug: r.slug,
        hackathon: r.hackathon?.name,
        similarity: r.similarity,
        isWinner: !!r.prize,
        prize: r.prize,
        cluster: r.cluster,
        links: r.links,
        crowdedness: r.crowdedness
      })),
      totalFound: data.totalFound,
      scoringBonus: data.results.length > 0
        ? data.results[0].accelerator ? 15
          : data.results[0].prize ? 10
          : 5
        : 0
    };
  } catch (err) {
    console.error('[Copilot] Enrichment failed:', err.message);
    return { hasHackathonHistory: false, relatedProjects: [], scoringBonus: 0, error: err.message };
  }
}

async function getWeeklyTrends() {
  try {
    const comparison = await compareCohorts(
      { hackathons: ['cypherpunk'] },
      { hackathons: ['breakout'] },
      ['problemTags', 'primitives', 'techStack'],
      5
    );
    return comparison;
  } catch (err) {
    console.error('[Copilot] Trends failed:', err.message);
    return null;
  }
}

async function checkStatus() {
  return copilotFetch('/status');
}

module.exports = {
  searchProjects,
  searchArchives,
  getProjectBySlug,
  getCluster,
  analyzeCohort,
  compareCohorts,
  enrichTokenWithHackathonData,
  getWeeklyTrends,
  checkStatus
};
```

## BD SCORING BONUSES (add to pipeline-scorer)

```
COLOSSEUM ENRICHMENT SCORING:

Token found in Colosseum hackathon submissions:  +5 composite
Token project is a Colosseum prize winner:       +10 composite  
Token project in Colosseum Accelerator:          +15 composite
(bonuses do NOT stack — use highest applicable)

Apply AFTER base scoring, BEFORE Opus qualitative override.
Log enrichment source: "Colosseum Copilot (Intel #18)"
```

## PHASE 3.5: COLOSSEUM CROSS-REFERENCE (add to BD Screening)

```
Insert between Phase 3 (Classification) and Phase 4 (Contact Screening):

For every BD SWEET SPOT and POTENTIAL token:
1. Call enrichTokenWithHackathonData(tokenName, category)
2. If match found (similarity > 0.3):
   a. Fetch full project via getProjectBySlug(slug)
   b. Extract team Twitter/GitHub handles
   c. Cross-ref with DexScreener social links
   d. Note hackathon + prize + cluster in pipeline notes
   e. Use in outreach personalization:
      "Your project [NAME] placed [PRIZE] in Colosseum [HACKATHON] — 
       SolCex supports hackathon-validated projects with fast-track listings."
3. If no match (similarity < 0.3 or no results):
   a. Note "No Colosseum hackathon history" — neutral signal
   b. Proceed to Phase 4 normally

DO NOT gate outreach on Copilot match. 
Copilot enrichment is additive intelligence, not a filter.
```

## WAR ROOM COMMANDS

```
/copilot <query>     — Search Colosseum projects
                       Example: /copilot AI agent exchange listing
                       Returns: top 5 projects with name, hackathon, similarity, prize

/landscape <token>   — Full competitive landscape for a token
                       Example: /landscape PIPPIN
                       Returns: related projects, cluster, crowdedness, team data

/trends              — Latest hackathon trend comparison (Cypherpunk vs Breakout)
                       Returns: top 5 rising/falling problem tags, primitives, tech stack

/cluster <key>       — Explore a project cluster
                       Example: /cluster v1-c14
                       Returns: label, summary, project count, top tags, representatives
```

## WEEKLY CRON

```
# Sunday 16:00 UTC — Fetch weekly trends for Sunday report
# Runs before report compilation at 18:00 UTC
0 16 * * 0  cd /opt/buzz && node -e "
  const c = require('./api/lib/colosseum-copilot');
  c.getWeeklyTrends().then(t => {
    if (t) console.log(JSON.stringify(t, null, 2));
    else console.error('Trends fetch failed');
  });
"
```

## IMPLEMENTATION PRIORITY

```
DAY 39-40 (immediate):
  ✅ Add PAT to /opt/buzz/.env
  ✅ Install skill: npx skills add ColosseumOrg/colosseum-copilot  
  ✅ Verify connection
  ✅ Test queries
  ✅ Check cluster v1-c14

DAY 41-42:
  □ Create api/lib/colosseum-copilot.js
  □ Add 5 Express endpoints
  □ Add 4 War Room commands
  □ Wire enrichment into pipeline-scanner

POST-SPRINT:
  □ Add scoring bonuses to pipeline-scorer
  □ Implement Phase 3.5 in BD Screening
  □ Build Sunday report trend section
  □ Add weekly cron
  □ CI/CD deploy
```

## FRONTIER HACKATHON ANGLE

```
Deep Dive query to run for submission narrative:

"I'm building an autonomous BD agent that discovers, scores, and pitches 
token projects for exchange listing on a Solana-native CEX. It uses 
rule-based scoring across 5 dimensions (safety, wallet, technical, social, 
market) with an LLM qualitative override, triple verification, and 
autonomous Twitter/Telegram outreach. Has anyone in the Solana ecosystem 
built anything like this? What's the competitive landscape?"

Use Copilot's response to:
1. Identify competitors and differentiation
2. Find gaps Buzz fills
3. Get archive citations for submission writeup
4. Show Copilot integration as demo feature
```

## TOKEN ROTATION

```
PAT: BuzzBySolCex (ID 84025)
Generated: Mar 28, 2026
Expires: ~Jun 25, 2026
Renewal reminder: Jun 20, 2026 (Google Calendar set ✅)

To renew:
1. Go to https://arena.colosseum.org/copilot
2. Click "Regenerate token" (invalidates current)
3. Copy new PAT immediately
4. Update /opt/buzz/.env → COLOSSEUM_COPILOT_PAT=<new>
5. ah restart buzz
6. Verify: curl status endpoint
```

## SECURITY

```
- PAT in .env ONLY (never GitHub, never logs, never public)
- API base URL is public — safe for code
- Read-only scope — no write operations
- No Hetzner IP whitelisting needed
- Same security class as Firecrawl key
```

---

*Intel Source #18: Colosseum Copilot*
*5,400+ projects | 84,000+ archives | 6,300+ products*
*Zero cost | Read-only | 90-day rotation*
*Built by Chef | Powered by Opus | Approved by Ogie | Bismillah* 🤲
