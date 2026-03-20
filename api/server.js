/**
 * Buzz BD Agent — REST API Server
 * v3.0.0 | Express + SQLite WAL | 72 Endpoints
 * 
 * Runs alongside OpenClaw gateway on port 3000
 * OpenClaw handles agent orchestration on 18789
 * This API exposes Buzz's capabilities for BaaS + Mobile App
 * 
 * v1.0.0 → 34 endpoints (Day 9)
 * v2.0.0 → 64 endpoints (Day 11) — full coverage
 * v2.1.0 → Boot sync fix (Day 11) — pipeline + crons populate from persistent storage
 *          FIX: /api/v1/pipeline/ no longer returns empty
 *          FIX: /api/v1/crons/ no longer returns empty
 * v3.0.0 → 72 endpoints (Day 14) — Strategic Orchestrator v7.0
 *          8 new /api/v1/strategy/* endpoints
 *          Decision Engine + Playbook Engine + Context Engine
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { initDB, getDB } = require('./db');
const { apiKeyAuth } = require('./middleware/auth');
const { rateLimit } = require('./middleware/rateLimit');

// Route imports — ALL 12 route files
const healthRoutes = require('./routes/health');
const agentRoutes = require('./routes/agents');
const pipelineRoutes = require('./routes/pipeline');
const costRoutes = require('./routes/costs');
const cronRoutes = require('./routes/crons');
const scoringRoutes = require('./routes/scoring');
const intelRoutes = require('./routes/intel');
const twitterRoutes = require('./routes/twitter');
const walletRoutes = require('./routes/wallets');
const webhookRoutes = require('./routes/webhooks');
const receiptRoutes = require('./routes/receipts');
const strategyRoutes = require('./routes/strategy');
const skillsRoutes = require('./routes/skills');
const memoryRoutes = require('./routes/memory');
const operatorRoutes = require('./routes/operator');
const contactRoutes = require('./routes/contacts');

// v7.5.0: Bags.fm routes + Simulate Listing
const bagsRoutes = require('./routes/bags');
const simulateRoutes = require('./routes/simulate');

// v7.5.2: Nansen CLI + X Layer x402
const nansenRoutes = require('./routes/nansen');
const xlayerRoutes = require('./routes/xlayer');

// MiroFish Stage 1: Listing Proposal generator
const listingProposalRoutes = require('./routes/listing-proposal');

// MiroFish Stage 1: Listing Report (unified token report)
const listingReportRoutes = require('./routes/listing-report');

// MiroFish Stage 1: Simulation Report (cyberpunk HTML)
const simulationReportRoutes = require('./routes/simulation-report');

// MiroFish P1-B: Enhanced Simulation Engine
const simulateListingRoutes = require('./routes/simulate-listing');

// v7.6.0: Financial Datasets MCP — Intel Source #24
const financialDatasetsRoutes = require('./routes/financial-datasets');

// v7.7.0: Technical Analyst
const technicalRoutes = require('./routes/technical');

// v7.5.4: CoinGecko CLI — Intel Source #23
const coingeckoRoutes = require('./routes/coingecko');

// Day 32 Revenue Sprint
const revenueRoutes = require('./routes/revenue');
const attributionRoutes = require('./routes/attribution');
const loopRoutes = require('./routes/loops');
const dashboardRoutes = require('./routes/dashboard');
const alertRoutes = require('./routes/alerts');
const reportRoutes = require('./routes/reports');

// Day 32B Data Hardening — Triple Verification Layer
const verifyRoutes = require('./routes/verify');
const { requireVerifiedAutoCheck } = require('./middleware/verification-gate');

// v7.5.5: LLM Cost Proxy
const llmProxyRoutes = require('./routes/llm-proxy');

// Listing Readiness + Activity routes
const listingReadinessRoutes = require('./routes/listing-readiness');
const activityRoutes = require('./routes/activity');

// Whale Signal Intelligence (Nansen Hyperliquid)
const whaleSignalRoutes = require('./routes/whale-signal');

// x402 Premium endpoints (paywalled)
const premiumRoutes = require('./routes/premium');

// v7.3.1 Memory search engine + Contact intelligence
const { initFTS } = require('./services/memory-search');
const { initContacts } = require('./services/contact-intelligence');

// v7.0 Strategic Orchestrator engines
const ContextEngine = require('./lib/context-engine');
const DecisionEngine = require('./lib/decision-engine');
const PlaybookEngine = require('./lib/playbook-engine');

// v7.4.0 Hedge Brain routes
const pipelineStreamRoutes = require('./routes/pipeline-stream');
const createPersonaRoutes = require('./routes/personas');
const createBacktestRoutes = require('./routes/backtest');

const app = express();
const PORT = process.env.BUZZ_API_PORT || 3000;

// ─── Persistent Storage Paths ────────────────────────
const PIPELINE_DIR = process.env.PIPELINE_DIR || '/data/workspace/memory/pipeline';
const CRON_SCHEDULE_FILE = process.env.CRON_SCHEDULE_FILE || '/data/.openclaw/cron/jobs.json';

// ─── Middleware ───────────────────────────────────────
app.use(cors({
  origin: process.env.BUZZ_API_CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-402-Payment']
}));
app.use(express.json({ limit: '1mb' }));
app.use(rateLimit);

// ─── Public Routes (no auth) ─────────────────────────
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/simulation-report', simulationReportRoutes);

// x402 Premium (paywall handles auth — admin key bypasses, x402 payment required for others)
app.use('/api/v1/premium', premiumRoutes);

// API info endpoint
app.get('/api/v1/info', (req, res) => {
  res.json({
    name: 'Buzz BD Agent API',
    version: '3.8.0',
    agent: 'Buzz by SolCex',
    architecture: '5 parallel sub-agents + orchestrator + MiroFish simulation engine',
    sub_agents: ['scanner-agent', 'safety-agent', 'wallet-agent', 'social-agent', 'scorer-agent'],
    orchestrator_model: 'MiniMax M2.7',
    sub_agent_model: 'bankr/gpt-5-nano',
    llm_gateway: 'Bankr LLM Gateway (8 models)',
    intel_sources: '24/24 connected',
    cron_jobs: 42,
    endpoints: {
      total: 120,
      categories: {
        health: 5,
        info: 1,
        agents: 5,
        pipeline: 9,
        costs: 5,
        crons: 7,
        score_token: 1,
        scoring: 5,
        intel: 5,
        twitter: 5,
        wallets: 6,
        webhooks: 5,
        receipts: 5,
        strategy: 8,
        skills: 8,
        memory: 3,
        operator: 2,
        contacts: 6,
        bags: 4,
        simulate: 2,
        simulate_listing: 1,
        financial_datasets: 5,
        ws: 2,
        nansen: 2,
        xlayer: 2,
        listing_report: 1,
        listing_proposal: 2,
        coingecko: 6,
        simulation_report: 1
      }
    },
    documentation: 'https://github.com/buzzbysolcex/buzz-bd-agent',
    links: {
      solcex: 'https://solcex.cc',
      twitter: 'https://x.com/BuzzBySolCex',
      erc8004: { ethereum: '#25045', base: '#17483', anet: '#18709' }
    }
  });
});

// ─── Authenticated Routes ────────────────────────────
// Existing (Day 9)
app.use('/api/v1/agents', apiKeyAuth, agentRoutes);
app.use('/api/v1/pipeline', apiKeyAuth, pipelineRoutes);
app.use('/api/v1/costs', apiKeyAuth, costRoutes);
app.use('/api/v1/crons', apiKeyAuth, cronRoutes);
app.use('/api/v1', apiKeyAuth, require('./routes/score'));

// New (Day 11 — completing 64/64)
app.use('/api/v1/scoring', apiKeyAuth, scoringRoutes);
app.use('/api/v1/intel', apiKeyAuth, intelRoutes);
app.use('/api/v1/twitter', apiKeyAuth, twitterRoutes);
app.use('/api/v1/wallets', apiKeyAuth, walletRoutes);
app.use('/api/v1/webhooks', apiKeyAuth, webhookRoutes);
app.use('/api/v1/receipts', apiKeyAuth, receiptRoutes);
app.use('/api/v1/skills', apiKeyAuth, skillsRoutes);

// v7.3.1: Learning Loop + Memory + Operator + Contacts
app.use('/api/v1/memory', apiKeyAuth, memoryRoutes);
app.use('/api/v1/operator', apiKeyAuth, operatorRoutes);
app.use('/api/v1/contacts', apiKeyAuth, contactRoutes);

// v7.5.0: Bags.fm + Simulate Listing (simulation GATED by verification)
app.use('/api/v1/bags', apiKeyAuth, bagsRoutes);
app.use('/api/v1/simulate', apiKeyAuth, requireVerifiedAutoCheck, simulateRoutes);

// MiroFish P1-B: Enhanced Simulation Engine (separate from /simulate/* routes)
app.use('/api/v1', apiKeyAuth, simulateListingRoutes);

// v7.5.2: Nansen CLI (#17 activated) + X Layer x402 (BaaS payment layer)
app.use('/api/v1/nansen', apiKeyAuth, nansenRoutes);
app.use('/api/v1/xlayer', apiKeyAuth, xlayerRoutes);

// v7.6.0: WebSocket status routes (OKX + Helius)
app.use('/api/v1/ws', apiKeyAuth, require('./routes/ws'));

// MiroFish Stage 1: Listing Proposal + Listing Report
app.use('/api/v1/listing-proposal', apiKeyAuth, listingProposalRoutes);
app.use('/api/v1', apiKeyAuth, listingReportRoutes);

// v7.6.0: Financial Datasets MCP — Intel Source #24
app.use('/api/v1/intel/financial-datasets', apiKeyAuth, financialDatasetsRoutes);

// v7.7.0: Technical Analyst
app.use('/api/v1/technical', apiKeyAuth, technicalRoutes);

// v7.5.4: CoinGecko CLI — Intel Source #23
app.use('/api/v1/coingecko', apiKeyAuth, coingeckoRoutes);

// Day 32 Revenue Sprint (25 endpoints)
app.use('/api/v1/revenue', apiKeyAuth, revenueRoutes);
app.use('/api/v1/attribution', apiKeyAuth, attributionRoutes);
app.use('/api/v1/loops', apiKeyAuth, loopRoutes);
app.use('/api/v1/dashboard', apiKeyAuth, dashboardRoutes);
app.use('/api/v1/alerts', apiKeyAuth, alertRoutes);
app.use('/api/v1/reports', apiKeyAuth, reportRoutes);

// Day 32B Data Hardening — Triple Verification (6 endpoints)
app.use('/api/v1/verify', apiKeyAuth, verifyRoutes);

// Listing Readiness + Activity
app.use('/api/v1/listing-readiness', apiKeyAuth, listingReadinessRoutes);
app.use('/api/v1/activity', apiKeyAuth, activityRoutes);

// Whale Signal Intelligence (Nansen Hyperliquid)
app.use('/api/v1/whale-signal', apiKeyAuth, whaleSignalRoutes);

// NOTE: 404 + Error handlers registered in start() after v7.0 strategy routes

// ═════════════════════════════════════════════════════
// BOOT SYNC — v2.1.0 fix
// Reads persistent storage files into SQLite on startup
// so /api/v1/pipeline/ and /api/v1/crons/ return data
// ═════════════════════════════════════════════════════

function syncPipelineOnBoot() {
  const db = getDB();
  const existing = db.prepare('SELECT COUNT(*) as count FROM pipeline_tokens').get().count;

  if (!fs.existsSync(PIPELINE_DIR)) {
    console.log(`[Boot Sync] Pipeline dir not found: ${PIPELINE_DIR} — skipping`);
    return 0;
  }

  // Read all JSON files in pipeline directory
  const files = fs.readdirSync(PIPELINE_DIR).filter(f => f.endsWith('.json'));
  if (files.length === 0) {
    console.log('[Boot Sync] No pipeline JSON files found — skipping');
    return 0;
  }

  let synced = 0;
  const upsert = db.prepare(`
    INSERT INTO pipeline_tokens (address, chain, ticker, name, stage, score, source, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(address, chain) DO UPDATE SET
      ticker = COALESCE(excluded.ticker, pipeline_tokens.ticker),
      name = COALESCE(excluded.name, pipeline_tokens.name),
      stage = excluded.stage,
      score = COALESCE(excluded.score, pipeline_tokens.score),
      source = COALESCE(excluded.source, pipeline_tokens.source),
      notes = COALESCE(excluded.notes, pipeline_tokens.notes),
      updated_at = excluded.updated_at
  `);

  const syncMany = db.transaction((tokens) => {
    for (const t of tokens) {
      try {
        upsert.run(
          t.address || t.contract || t.contract_address || 'unknown',
          t.chain || 'solana',
          t.ticker || t.symbol || null,
          t.name || null,
          mapStage(t.stage || t.status || 'discovered'),
          t.score || null,
          t.source || 'pipeline-sync',
          t.notes || t.next_action || null,
          t.created_at || t.discovered_at || new Date().toISOString(),
          t.updated_at || new Date().toISOString()
        );
        synced++;
      } catch (e) {
        console.log(`[Boot Sync] Pipeline skip: ${e.message}`);
      }
    }
  });

  // Process each file — handle both single object and array formats
  const allTokens = [];
  for (const file of files) {
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(PIPELINE_DIR, file), 'utf8'));
      if (Array.isArray(raw)) {
        allTokens.push(...raw);
      } else if (raw && typeof raw === 'object') {
        // Single token object or wrapper with tokens array
        if (raw.tokens && Array.isArray(raw.tokens)) {
          allTokens.push(...raw.tokens);
        } else if (raw.address || raw.contract || raw.symbol) {
          allTokens.push(raw);
        }
      }
    } catch (e) {
      console.log(`[Boot Sync] Failed to parse ${file}: ${e.message}`);
    }
  }

  if (allTokens.length > 0) {
    syncMany(allTokens);
  }

  console.log(`[Boot Sync] ✓ Pipeline: ${synced} tokens synced from ${files.length} files (${existing} existed in DB)`);
  return synced;
}

function syncCronsOnBoot() {
  const db = getDB();
  const existing = db.prepare('SELECT COUNT(*) as count FROM cron_jobs').get().count;

  if (!fs.existsSync(CRON_SCHEDULE_FILE)) {
    console.log(`[Boot Sync] Cron schedule not found: ${CRON_SCHEDULE_FILE} — skipping`);
    return 0;
  }

  let cronData;
  try {
    cronData = JSON.parse(fs.readFileSync(CRON_SCHEDULE_FILE, 'utf8'));
  } catch (e) {
    console.log(`[Boot Sync] Failed to parse cron schedule: ${e.message}`);
    return 0;
  }

  // Handle both formats: { jobs: [...] } or direct array
  const jobs = cronData.jobs || cronData;
  if (!Array.isArray(jobs)) {
    console.log('[Boot Sync] Cron schedule has no jobs array — skipping');
    return 0;
  }

  let synced = 0;
  const upsert = db.prepare(`
    INSERT INTO cron_jobs (id, name, schedule, agent_name, command, status)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      schedule = excluded.schedule,
      agent_name = COALESCE(excluded.agent_name, cron_jobs.agent_name),
      command = COALESCE(excluded.command, cron_jobs.command),
      status = excluded.status
  `);

  const syncMany = db.transaction((jobs) => {
    for (const job of jobs) {
      try {
        const id = job.id || job.name || `cron-${synced}`;
        upsert.run(
          id,
          job.name || job.desc || job.description || id,
          job.schedule?.expr || job.schedule || job.cron || '0 * * * *',
          job.agent_name || job.agent || null,
          job.command || job.cmd || null,
          job.status || 'active'
        );
        synced++;
      } catch (e) {
        console.log(`[Boot Sync] Cron skip: ${e.message}`);
      }
    }
  });

  syncMany(jobs);
  console.log(`[Boot Sync] ✓ Crons: ${synced} jobs synced (${existing} existed in DB)`);
  return synced;
}

// Map various stage names from OpenClaw memory to DB-valid stages
function mapStage(raw) {
  const stage = (raw || '').toLowerCase().replace(/[_\s]+/g, '_');
  const map = {
    'discovered': 'discovered',
    'scanned': 'scanned',
    'scored': 'scored',
    'prospect': 'prospect',
    'watch': 'scored',            // WATCH maps to scored (monitoring)
    'watch_mode': 'scored',
    'qualified': 'prospect',      // QUALIFIED maps to prospect
    'hot': 'prospect',            // HOT maps to prospect
    'contacted': 'contacted',
    'outreach_sent': 'contacted', // OUTREACH_SENT maps to contacted
    'outreach': 'contacted',
    'negotiating': 'negotiating',
    'approved': 'approved',
    'listed': 'listed',
    'rejected': 'rejected',
    'skip': 'rejected',
  };
  return map[stage] || 'discovered';
}

// ─── Start ───────────────────────────────────────────
async function start() {
  try {
    await initDB();

    // v2.1.0: Sync persistent storage → SQLite BEFORE listening
    console.log('[Boot Sync] Starting data sync from persistent storage...');
    const pipelineSynced = syncPipelineOnBoot();
    const cronsSynced = syncCronsOnBoot();

    // Day 32B: Sync scanner MD files → pipeline_tokens
    try {
      const { syncPipelineFiles } = require('./lib/pipeline-persist');
      const mdSync = syncPipelineFiles();
      console.log(`[Boot Sync] ✓ Pipeline MD files: ${mdSync.synced} synced, ${mdSync.total} total in DB`);
    } catch (e) {
      console.log(`[Boot Sync] ⚠️ Pipeline MD sync failed: ${e.message}`);
    }
    console.log(`[Boot Sync] ✓ Complete — ${pipelineSynced} pipeline tokens, ${cronsSynced} cron jobs`);

    // v7.0: Initialize Strategic Orchestrator engines
    const db = getDB();
    const contextEngine = new ContextEngine(db);
    const decisionEngine = new DecisionEngine(db, contextEngine);
    const playbookEngine = new PlaybookEngine(db);
    console.log('[v7.0] ✓ Strategic Orchestrator engines initialized');

    // v7.3.1: Initialize FTS5 memory search + Contact intelligence
    initFTS(db);
    initContacts(db);
    console.log('[v7.3.1] ✓ Memory FTS5 search + Contact intelligence initialized');

    // v7.0: Strategy routes (8 endpoints)
    app.use('/api/v1/strategy', apiKeyAuth, strategyRoutes(db, { decisionEngine, playbookEngine, contextEngine }));

    // v7.5.5: LLM Cost Proxy (6 endpoints)
    app.use('/api/v1/llm', llmProxyRoutes(db));

    // v7.4.0: Hedge Brain routes (SSE streaming, personas, backtest)
    app.use('/api/v1/pipeline', pipelineStreamRoutes); // SSE stream (adds /stream under existing /pipeline)
    app.use('/api/v1/personas', apiKeyAuth, createPersonaRoutes(db));
    app.use('/api/v1/backtest', apiKeyAuth, createBacktestRoutes(db));
    console.log('[v7.4.0] ✓ Hedge Brain routes: pipeline/stream, personas, backtest');

    // ─── 404 Handler (must be after all route registrations) ───
    app.use((req, res) => {
      res.status(404).json({
        error: 'not_found',
        message: `Route ${req.method} ${req.path} does not exist`,
        docs: '/api/v1/info'
      });
    });

    // ─── Error Handler ───
    app.use((err, req, res, next) => {
      console.error(`[API ERROR] ${err.message}`, err.stack);
      res.status(err.status || 500).json({
        error: 'internal_error',
        message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
      });
    });

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[Buzz API] ✓ v3.6.0 — 113/113 endpoints on port ${PORT}`);
      console.log(`[Buzz API] ✓ Health: http://0.0.0.0:${PORT}/api/v1/health`);
      console.log(`[Buzz API] ✓ Info:   http://0.0.0.0:${PORT}/api/v1/info`);
      console.log(`[Buzz API] ✓ Routes: health, agents, pipeline, costs, crons, score-token, scoring, intel, twitter, wallets, webhooks, receipts, strategy, skills, memory, operator, contacts, bags, simulate, ws, nansen, xlayer, personas, backtest, listing-report, listing-proposal, coingecko, simulation-report`);

      // v7.6.0: Start WebSocket services (non-blocking, with delay for DB init)
      setTimeout(() => {
        try { require('./services/okx-websocket').init(); } catch (e) { console.error('[okx-ws] Init failed:', e.message); }
        try { require('./services/helius-websocket').init(); } catch (e) { console.error('[helius-ws] Init failed:', e.message); }
      }, 5000);
    });
  } catch (err) {
    console.error('[Buzz API] ✗ Failed to start:', err.message);
    process.exit(1);
  }
}

start();
