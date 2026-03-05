/**
 * Buzz BD Agent — REST API Server
 * v2.1.0 | Express + SQLite WAL | 64 Endpoints
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
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { initDB, getDB } = require('./db');
const { apiKeyAuth } = require('./middleware/auth');
const { rateLimit } = require('./middleware/rateLimit');

// Route imports — ALL 11 route files
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

// API info endpoint
app.get('/api/v1/info', (req, res) => {
  res.json({
    name: 'Buzz BD Agent API',
    version: '2.1.0',
    agent: 'Buzz by SolCex',
    architecture: '5 parallel sub-agents + orchestrator',
    sub_agents: ['scanner-agent', 'safety-agent', 'wallet-agent', 'social-agent', 'scorer-agent'],
    orchestrator_model: 'MiniMax M2.5',
    sub_agent_model: 'bankr/gpt-5-nano',
    llm_gateway: 'Bankr LLM Gateway (8 models)',
    intel_sources: '19/19 connected',
    cron_jobs: 40,
    endpoints: {
      total: 64,
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
        receipts: 5
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

// ─── 404 Handler ─────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    error: 'not_found',
    message: `Route ${req.method} ${req.path} does not exist`,
    docs: '/api/v1/info'
  });
});

// ─── Error Handler ───────────────────────────────────
app.use((err, req, res, next) => {
  console.error(`[API ERROR] ${err.message}`, err.stack);
  res.status(err.status || 500).json({
    error: 'internal_error',
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

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
    console.log(`[Boot Sync] ✓ Complete — ${pipelineSynced} pipeline tokens, ${cronsSynced} cron jobs`);

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[Buzz API] ✓ v2.1.0 — 64/64 endpoints on port ${PORT}`);
      console.log(`[Buzz API] ✓ Health: http://0.0.0.0:${PORT}/api/v1/health`);
      console.log(`[Buzz API] ✓ Info:   http://0.0.0.0:${PORT}/api/v1/info`);
      console.log(`[Buzz API] ✓ Routes: health, agents, pipeline, costs, crons, score-token, scoring, intel, twitter, wallets, webhooks, receipts`);
    });
  } catch (err) {
    console.error('[Buzz API] ✗ Failed to start:', err.message);
    process.exit(1);
  }
}

start();
