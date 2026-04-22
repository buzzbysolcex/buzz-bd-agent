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

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { initDB, getDB } = require("./db");
const { apiKeyAuth } = require("./middleware/auth");
const { rateLimit } = require("./middleware/rateLimit");

// Route imports — ALL 12 route files
const healthRoutes = require("./routes/health");
const agentRoutes = require("./routes/agents");
const pipelineRoutes = require("./routes/pipeline");
const costRoutes = require("./routes/costs");
const cronRoutes = require("./routes/crons");
const scoringRoutes = require("./routes/scoring");
const intelRoutes = require("./routes/intel");
const twitterRoutes = require("./routes/twitter");
const walletRoutes = require("./routes/wallets");
const webhookRoutes = require("./routes/webhooks");
const receiptRoutes = require("./routes/receipts");
const strategyRoutes = require("./routes/strategy");
const skillsRoutes = require("./routes/skills");
const memoryRoutes = require("./routes/memory");
const operatorRoutes = require("./routes/operator");
const contactRoutes = require("./routes/contacts");

// v7.5.0: Simulate Listing (Bags.fm removed 2026-04-22 — dead service, Almanax HIGH)
const simulateRoutes = require("./routes/simulate");

// v7.5.2: Nansen CLI + X Layer x402
const nansenRoutes = require("./routes/nansen");
const xlayerRoutes = require("./routes/xlayer");

// MiroFish Stage 1: Listing Proposal generator
const listingProposalRoutes = require("./routes/listing-proposal");

// MiroFish Stage 1: Listing Report (unified token report)
const listingReportRoutes = require("./routes/listing-report");

// MiroFish Stage 1: Simulation Report (cyberpunk HTML)
const simulationReportRoutes = require("./routes/simulation-report");

// MiroFish P1-B: Enhanced Simulation Engine
const simulateListingRoutes = require("./routes/simulate-listing");

// v7.6.0: Financial Datasets MCP — Intel Source #24
const financialDatasetsRoutes = require("./routes/financial-datasets");

// v7.7.0: Technical Analyst
const technicalRoutes = require("./routes/technical");

// v7.8.0: Agent Interview System (MiroFish Cherry-Pick)
const interviewRoutes = require("./routes/interview");

// v7.8.0: Knowledge Graph Layer (SQLite Adjacency)
const kgRoutes = require("./routes/kg");

// v7.5.4: CoinGecko CLI — Intel Source #23
const coingeckoRoutes = require("./routes/coingecko");

// Day 32 Revenue Sprint
const revenueRoutes = require("./routes/revenue");
const attributionRoutes = require("./routes/attribution");
const loopRoutes = require("./routes/loops");
const dashboardRoutes = require("./routes/dashboard");
const alertRoutes = require("./routes/alerts");
const reportRoutes = require("./routes/reports");

// Day 32B Data Hardening — Triple Verification Layer
const verifyRoutes = require("./routes/verify");
const { requireVerifiedAutoCheck } = require("./middleware/verification-gate");

// v7.5.5: LLM Cost Proxy — KILLED by Project Opus Brain (Claude Code is the brain now)
// const llmProxyRoutes = require('./routes/llm-proxy');

// Listing Readiness + Activity routes
const listingReadinessRoutes = require("./routes/listing-readiness");
const activityRoutes = require("./routes/activity");

// Whale Signal Intelligence (Nansen Hyperliquid)
const whaleSignalRoutes = require("./routes/whale-signal");

// Project Opus Brain — Raw Data Endpoints for Claude Code
const rawDataRoutes = require("./routes/raw-data");

// ARIA — Autonomous Research & Intelligence Agent
const ariaRoutes = require("./routes/aria");

// v8.3.0: Phantom MCP — Intel Source #31 (wallet ops, price verification)
const phantomRoutes = require("./routes/phantom");
const microbuzzV2Routes = require("./routes/microbuzz-v2");

// v9.0: Feature flags + Claude Code architecture modules
const { feature, allFlags } = require("./lib/feature-flags");

// x402 Premium endpoints (paywalled)
const premiumRoutes = require("./routes/premium");

// x402 Discovery — .well-known/x402.json for Bazaar auto-indexing
const BUZZ_WALLET =
  process.env.ACP_OWNER_ADDRESS || "0x2Dc03124091104E7798C0273D96FC5ED65F05aA9";
const X402_DISCOVERY = {
  provider: "Buzz BD Agent by SolCex Exchange",
  homepage: "https://buzzbd.ai",
  contact: "buzzbysolcex@gmail.com",
  endpoints: [
    {
      url: "https://api.buzzbd.ai/api/v1/premium/pipeline",
      method: "GET",
      description:
        "Real-time hot token pipeline with 100-point composite scoring across safety, wallet, social, scorer, and technical dimensions.",
      price: "0.01",
      asset: "USDC",
      network: "base",
      payTo: BUZZ_WALLET,
    },
    {
      url: "https://api.buzzbd.ai/api/v1/premium/score/:address",
      method: "GET",
      description:
        "Per-token intelligence score with multi-dimensional breakdown across 5 scoring dimensions.",
      price: "0.01",
      asset: "USDC",
      network: "base",
      payTo: BUZZ_WALLET,
    },
    {
      url: "https://api.buzzbd.ai/api/v1/premium/sim/:address",
      method: "GET",
      description:
        "1,000-agent MiroFish swarm simulation with 5 behavioral clusters. Monte Carlo EV + institutional skepticism index.",
      price: "0.05",
      asset: "USDC",
      network: "base",
      payTo: BUZZ_WALLET,
    },
  ],
};

// v7.3.1 Memory search engine + Contact intelligence
const { initFTS } = require("./services/memory-search");
const { initContacts } = require("./services/contact-intelligence");

// v7.0 Strategic Orchestrator engines
const ContextEngine = require("./lib/context-engine");
const DecisionEngine = require("./lib/decision-engine");
const PlaybookEngine = require("./lib/playbook-engine");

// v7.4.0 Hedge Brain routes
const pipelineStreamRoutes = require("./routes/pipeline-stream");
const createPersonaRoutes = require("./routes/personas");
const createBacktestRoutes = require("./routes/backtest");

const app = express();
const PORT = process.env.BUZZ_API_PORT || 3000;

// ─── Persistent Storage Paths ────────────────────────
const PIPELINE_DIR =
  process.env.PIPELINE_DIR || "/data/workspace/memory/pipeline";
const CRON_SCHEDULE_FILE =
  process.env.CRON_SCHEDULE_FILE || "/data/.openclaw/cron/jobs.json";

// ─── Static Files ────────────────────────────────────
app.use("/static", express.static(path.join(__dirname, "static")));

// ─── Middleware ───────────────────────────────────────
app.use(
  cors({
    origin: process.env.BUZZ_API_CORS_ORIGIN || "*",
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-API-Key",
      "X-402-Payment",
    ],
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(rateLimit);

// ─── Public Routes (no auth) ─────────────────────────
app.get("/.well-known/x402.json", (req, res) => res.json(X402_DISCOVERY));

// OpenAI/MCP plugin manifest
app.get("/.well-known/ai-plugin.json", (req, res) =>
  res.json({
    schema_version: "v1",
    name_for_human: "Buzz BD Agent",
    name_for_model: "buzz_bd_agent",
    description_for_human:
      "Honest token scoring and exchange listing intelligence. 11-factor scoring, 50-agent simulation, on-chain proof on Base.",
    description_for_model:
      "Query Buzz for token scores, pipeline data, and listing intelligence. Buzz scores tokens across 11 factors with dual-gate verification and records scores on-chain via ScoreStorage on Base mainnet.",
    auth: { type: "none" },
    api: { type: "openapi", url: "https://api.buzzbd.ai/api/v1/info" },
    logo_url: "https://buzzbd.ai/images/buzz-bee-mascot.jpg",
    contact_email: "buzzbysolcex@gmail.com",
    legal_info_url: "https://buzzbd.ai/proposal",
  }),
);

// v8.2.0: Machine-readable agent identity (P0 for ZHC readiness)
// JSON-LD / Schema.org compatible for agent-to-agent discovery
app.get("/agent", (req, res) => {
  let pipelineSize = 0,
    hotTokens = 0,
    qualifiedTokens = 0;
  try {
    const db = getDB();
    const total = db.prepare("SELECT COUNT(*) as c FROM pipeline_tokens").get();
    const hot = db
      .prepare("SELECT COUNT(*) as c FROM pipeline_tokens WHERE score >= 85")
      .get();
    const qual = db
      .prepare(
        "SELECT COUNT(*) as c FROM pipeline_tokens WHERE score >= 70 AND score < 85",
      )
      .get();
    pipelineSize = total.c;
    hotTokens = hot.c;
    qualifiedTokens = qual.c;
  } catch (e) {}
  res.json({
    "@context": "https://schema.org",
    "@type": "SoftwareAgent",
    name: "Buzz BD Agent",
    alternateName: "Ionic Nova",
    version: "8.2.0",
    dna: "3.0",
    type: "autonomous-bd-agent",
    specialization: "exchange-listing-intelligence",
    description:
      "Autonomous AI agent for exchange listing business development. Scores tokens across 5 dimensions using 29 intelligence sources with tri-source verification. ScoreStorage.sol live on Base mainnet.",
    capabilities: [
      "token-scoring",
      "triple-verification",
      "adversarial-debate",
      "listing-simulation",
      "signal-generation",
      "deal-proposal",
      "els-1-oracle",
    ],
    scoring: {
      dimensions: 5,
      max_score: 100,
      pipeline_size: pipelineSize,
      hot_tokens: hotTokens,
      qualified_tokens: qualifiedTokens,
    },
    agents: 12,
    intel_sources: 29,
    data_platforms: [
      "DexScreener",
      "DexTools",
      "Jupiter",
      "CoinGecko",
      "RugCheck",
    ],
    verification: {
      method: "tri-source",
      sources: 3,
      tiers: ["on-chain (1.0)", "market (0.6)", "social (0.3)"],
    },
    identity: {
      erc8004_base: "#17483",
      erc8004_eth: "#25045",
      erc8004_anet: "#18709",
      virtuals_acp: "#17681",
      moltbook: "c606278b",
      aibtc_correspondent: "Ionic Nova",
      agent_tld: ["buzz.agent", "buzzbd.agent"],
      colosseum: "#3734",
      izhc: {
        name: "IZHC",
        description: "Institute for Zero-Human Companies member",
        url: "https://zhcinstitute.com",
        status: "active",
        joined: "2026-03-27",
      },
      agentic_web_map: {
        name: "Agentic Web Map",
        description: "Agent Community recognized builder",
        status: "active",
        joined: "2026-03-29",
      },
    },
    contact: {
      twitter: "@BuzzBySolCex",
      telegram: "@Ogie2",
      api: "https://api.buzzbd.ai",
      website: "https://buzzbd.ai",
    },
    services: [
      {
        name: "token-scoring",
        protocol: "REST",
        pricing: "x402 micropayment",
        endpoint: "/api/v1/scores/components/:address",
      },
      {
        name: "listing-proposal",
        protocol: "REST",
        pricing: "per-deal commission",
      },
      { name: "safety-check", protocol: "ACP", pricing: "$0.10/check" },
      {
        name: "trending-intelligence",
        protocol: "ACP",
        pricing: "$0.25/query",
      },
      {
        name: "listing-protocol-oracle",
        description: "ELS-1 on-chain listing score oracle",
        status: "live",
        endpoint: "https://buzzbd.ai/proposal",
      },
    ],
    contracts: {
      network: "base-mainnet",
      score_storage: "0xbf81316266dBB79947c358e2eAAc6F338Fa388Fb",
      listing_oracle: "0xc584f9E3CF7d05D90Df0D59D6876B82D29f14463",
      listing_escrow: "0xc77F14e05fE57B5caf3213b2C5Db1627Db11b3ED",
      buzz_reputation: "0x723BD9E5aB505a1E653917F48B334f5d08F42747",
      deployer: "0xa57f4010d200dc1E67cAbede025b90090cd99206",
      total_deployed: 4,
    },
    infrastructure: {
      server: "Hetzner CX43",
      llm: "Claude Opus 4.7 (Pro Max, $0/day)",
      uptime: "24/7",
      ci_cd: "GitHub Actions",
    },
  });
});

app.use("/api/v1/health", healthRoutes);
// Root /health alias for uptime monitors (no auth)
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    version: "v9.3.1",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    buzzshield: {
      osv: feature("BUZZSHIELD_OSV"),
      sbom: feature("BUZZSHIELD_SBOM"),
      checklists: feature("BUZZSHIELD_CHECKLIST_API"),
      audit_engine: feature("BUZZSHIELD_AUDIT_ENGINE"),
    },
  });
});
app.use("/api/v1/simulation-report", simulationReportRoutes);

// x402 Premium (paywall handles auth — admin key bypasses, x402 payment required for others)
app.use("/api/v1/premium", premiumRoutes);

// v7.8.0: Agent Interview (public — simulation interview system)
app.use("/api/v1/interview", interviewRoutes);

// v7.8.0: Knowledge Graph (public read — entity/relationship explorer)
app.use("/api/v1/kg", kgRoutes);

// API info endpoint
app.get("/api/v1/info", (req, res) => {
  res.json({
    name: "Buzz BD Agent API",
    version: "3.9.0",
    agent: "Buzz by SolCex",
    architecture:
      "5 parallel sub-agents + orchestrator + MiroFish simulation engine",
    sub_agents: [
      "scanner-agent",
      "safety-agent",
      "wallet-agent",
      "social-agent",
      "scorer-agent",
    ],
    orchestrator_model: "MiniMax M2.7",
    sub_agent_model: "bankr/gpt-5-nano",
    llm_gateway: "Bankr LLM Gateway (8 models)",
    intel_sources: "24/24 connected",
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
        simulate: 2,
        simulate_listing: 1,
        financial_datasets: 5,
        ws: 2,
        nansen: 2,
        xlayer: 2,
        listing_report: 1,
        listing_proposal: 2,
        coingecko: 6,
        simulation_report: 1,
      },
    },
    documentation: "https://github.com/buzzbysolcex/buzz-bd-agent",
    links: {
      solcex: "https://solcex.cc",
      twitter: "https://x.com/BuzzBySolCex",
      erc8004: { ethereum: "#25045", base: "#17483", anet: "#18709" },
    },
  });
});

// ─── HSaaS Public Revenue Routes (NO auth) ──────────
// Free score + audit intake — public-facing HSaaS funnel
const freeScoreRouter = require("./routes/free-score");
app.use("/api/v1/score", freeScoreRouter);
app.use("/api/v1", freeScoreRouter); // mounts /scores and /scores/top/:n at /api/v1/scores
app.use("/api/v1/audit", require("./routes/audit-request"));

// ─── Buzz Shield — mounted early so public/scan + /info + /stats + /patterns
// are reachable without hitting the /api/v1 apiKeyAuth catchall on line ~444.
// (The shield router handles per-route auth internally; admin-only routes
// still require apiKeyAuth via middleware on those specific handlers.)
// Note: the SHIELD_ENGINE init block later in bootstrap still seeds tables.
//
// V4 Portal audit routes mount FIRST at the more specific /shield/audit path
// so tierGate() middleware runs before the generic shield-routes catchall.
// Must stay above the /api/v1 apiKeyAuth catchall so free-tier calls land.
try {
  app.use("/api/v1/shield/audit", require("./routes/shield-audit-routes"));
} catch (e) {
  console.error("[SHIELD-V4] audit mount failed (non-fatal):", e.message);
}
if (feature("SHIELD_ENGINE")) {
  try {
    app.use("/api/v1/shield", require("./routes/shield-routes"));
  } catch (e) {
    console.error("[SHIELD] early mount failed (non-fatal):", e.message);
  }
}

// ─── BuzzShield V5 — Public RDT + AISC Checklist (Cerebral Valley Apr 27)
// Feature-flag gated via process.env.RDT_THREAT_MODEL === 'true'.
// When OFF: do not mount — 404s are the correct behavior.
// When ON:  serves /api/v1/shield/public/checklist + /v5-threat-model publicly.
if (process.env.RDT_THREAT_MODEL === "true") {
  try {
    app.use("/api/v1/shield/public", require("./routes/shield-public-rdt"));
    console.log(
      "[SHIELD-V5] RDT_THREAT_MODEL=true — public checklist mounted at /api/v1/shield/public",
    );
  } catch (e) {
    console.error(
      "[SHIELD-V5] public RDT mount failed (non-fatal):",
      e.message,
    );
  }
} else {
  console.log(
    "[SHIELD-V5] RDT_THREAT_MODEL gated OFF — public checklist endpoint NOT mounted",
  );
}

// ─── Public landing-page + shield summary endpoints (no auth, CORS open)
// Added 2026-04-22 per Ogie directive msg 4403 (buzzbd.ai stats wiring) + msg 4404 (shield summary)
try {
  app.use("/api/v1/public", require("./routes/public-stats"));
  app.use("/api/v1/shield/public", require("./routes/shield-public-summary"));
  console.log(
    "[PUBLIC] /api/v1/public/stats + /api/v1/shield/public/summary mounted",
  );
} catch (e) {
  console.error("[PUBLIC] mount failed (non-fatal):", e.message);
}

// ─── Authenticated Routes ────────────────────────────
// Existing (Day 9)
app.use("/api/v1/agents", apiKeyAuth, agentRoutes);
app.use("/api/v1/pipeline", apiKeyAuth, pipelineRoutes);
app.use("/api/v1/costs", apiKeyAuth, costRoutes);
app.use("/api/v1/crons", apiKeyAuth, cronRoutes);
app.use("/api/v1", apiKeyAuth, require("./routes/score"));

// New (Day 11 — completing 64/64)
app.use("/api/v1/scoring", apiKeyAuth, scoringRoutes);
app.use("/api/v1/intel", apiKeyAuth, intelRoutes);
app.use("/api/v1/intel/aixbt", apiKeyAuth, require("./routes/aixbt"));
app.use(
  "/api/v1/mining",
  apiKeyAuth,
  require("./services/mining-intel/mining-routes"),
);
app.use("/api/v1/twitter", apiKeyAuth, twitterRoutes);
app.use("/api/v1/wallets", apiKeyAuth, walletRoutes);
app.use("/api/v1/webhooks", apiKeyAuth, webhookRoutes);
app.use("/api/v1/receipts", apiKeyAuth, receiptRoutes);
app.use("/api/v1/skills", apiKeyAuth, skillsRoutes);

// v7.3.1: Learning Loop + Memory + Operator + Contacts
app.use("/api/v1/memory", apiKeyAuth, memoryRoutes);
app.use("/api/v1/operator", apiKeyAuth, operatorRoutes);
app.use("/api/v1/contacts", apiKeyAuth, contactRoutes);

// v7.5.0: Simulate Listing (simulation GATED by verification; Bags.fm removed)
app.use(
  "/api/v1/simulate",
  apiKeyAuth,
  requireVerifiedAutoCheck,
  simulateRoutes,
);

// MiroFish P1-B: Enhanced Simulation Engine (separate from /simulate/* routes)
app.use("/api/v1", apiKeyAuth, simulateListingRoutes);

// v7.5.2: Nansen CLI (#17 activated) + X Layer x402 (BaaS payment layer)
app.use("/api/v1/nansen", apiKeyAuth, nansenRoutes);
app.use("/api/v1/xlayer", apiKeyAuth, xlayerRoutes);

// v7.6.0: WebSocket status routes (OKX + Helius)
app.use("/api/v1/ws", apiKeyAuth, require("./routes/ws"));

// MiroFish Stage 1: Listing Proposal + Listing Report
app.use("/api/v1/listing-proposal", apiKeyAuth, listingProposalRoutes);
app.use("/api/v1", apiKeyAuth, listingReportRoutes);

// v7.6.0: Financial Datasets MCP — Intel Source #24
app.use(
  "/api/v1/intel/financial-datasets",
  apiKeyAuth,
  financialDatasetsRoutes,
);

// v7.7.0: Technical Analyst
app.use("/api/v1/technical", apiKeyAuth, technicalRoutes);

// v7.8.0: Agent Interview System (MiroFish Cherry-Pick)
app.use("/api/v1/interview", apiKeyAuth, interviewRoutes);

// v7.5.4: CoinGecko CLI — Intel Source #23
app.use("/api/v1/coingecko", apiKeyAuth, coingeckoRoutes);

// Day 32 Revenue Sprint (25 endpoints)
app.use("/api/v1/revenue", apiKeyAuth, revenueRoutes);
app.use("/api/v1/attribution", apiKeyAuth, attributionRoutes);
app.use("/api/v1/loops", apiKeyAuth, loopRoutes);
app.use("/api/v1/dashboard", apiKeyAuth, dashboardRoutes);
app.use("/api/v1/alerts", apiKeyAuth, alertRoutes);
app.use("/api/v1/reports", apiKeyAuth, reportRoutes);

// Day 32B Data Hardening — Triple Verification (6 endpoints)
app.use("/api/v1/verify", apiKeyAuth, verifyRoutes);

// Listing Readiness + Activity
app.use("/api/v1/listing-readiness", apiKeyAuth, listingReadinessRoutes);
app.use("/api/v1/activity", apiKeyAuth, activityRoutes);

// Whale Signal Intelligence (Nansen Hyperliquid)
app.use("/api/v1/whale-signal", apiKeyAuth, whaleSignalRoutes);

// Project Opus Brain — Raw data endpoints for Claude Code
app.use("/api/v1", apiKeyAuth, rawDataRoutes);

// ARIA — Autonomous Research & Intelligence Agent
app.use("/api/v1/aria", apiKeyAuth, ariaRoutes);

// v8.3.0: Phantom MCP — Intel Source #31
app.use("/api/v1/phantom", apiKeyAuth, phantomRoutes);

// v8.3.0+: MicroBuzz v2 — 500-agent hybrid AMM prediction (ADR-010)
app.use("/api/v1/microbuzz", apiKeyAuth, microbuzzV2Routes);

// v9.0: Feature flags endpoint
app.get("/api/v1/flags", apiKeyAuth, (req, res) => res.json(allFlags()));

// v9.0: Claude Code architecture modules (routes registered, init deferred to start())
if (feature("MAILBOX")) {
  app.use(
    "/api/v1/mailbox",
    apiKeyAuth,
    require("./services/mailbox/mailbox-routes"),
  );
}
if (feature("TASK_DAG")) {
  app.use("/api/v1/tasks", apiKeyAuth, require("./services/tasks/task-routes"));
}
if (feature("DYNAMIC_CRONS")) {
  app.use(
    "/api/v1/dynamic-crons",
    apiKeyAuth,
    require("./services/cron/cron-routes"),
  );
}
if (feature("EVENT_BUS")) {
  app.use(
    "/api/v1/events",
    apiKeyAuth,
    require("./services/events/event-routes"),
  );
}
if (feature("MIROFISH_REALTIME")) {
  app.use("/api/v1/mirofish", apiKeyAuth, require("./routes/mirofish-routes"));
}

// NOTE: 404 + Error handlers registered in start() after v7.0 strategy routes

// ═════════════════════════════════════════════════════
// BOOT SYNC — v2.1.0 fix
// Reads persistent storage files into SQLite on startup
// so /api/v1/pipeline/ and /api/v1/crons/ return data
// ═════════════════════════════════════════════════════

function syncPipelineOnBoot() {
  const db = getDB();
  const existing = db
    .prepare("SELECT COUNT(*) as count FROM pipeline_tokens")
    .get().count;

  if (!fs.existsSync(PIPELINE_DIR)) {
    console.log(
      `[Boot Sync] Pipeline dir not found: ${PIPELINE_DIR} — skipping`,
    );
    return 0;
  }

  // Read all JSON files in pipeline directory
  const files = fs.readdirSync(PIPELINE_DIR).filter((f) => f.endsWith(".json"));
  if (files.length === 0) {
    console.log("[Boot Sync] No pipeline JSON files found — skipping");
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
          t.address || t.contract || t.contract_address || "unknown",
          t.chain || "solana",
          t.ticker || t.symbol || null,
          t.name || null,
          mapStage(t.stage || t.status || "discovered"),
          t.score || null,
          t.source || "pipeline-sync",
          t.notes || t.next_action || null,
          t.created_at || t.discovered_at || new Date().toISOString(),
          t.updated_at || new Date().toISOString(),
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
      const raw = JSON.parse(
        fs.readFileSync(path.join(PIPELINE_DIR, file), "utf8"),
      );
      if (Array.isArray(raw)) {
        allTokens.push(...raw);
      } else if (raw && typeof raw === "object") {
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

  console.log(
    `[Boot Sync] ✓ Pipeline: ${synced} tokens synced from ${files.length} files (${existing} existed in DB)`,
  );
  return synced;
}

function syncCronsOnBoot() {
  const db = getDB();
  const existing = db
    .prepare("SELECT COUNT(*) as count FROM cron_jobs")
    .get().count;

  if (!fs.existsSync(CRON_SCHEDULE_FILE)) {
    console.log(
      `[Boot Sync] Cron schedule not found: ${CRON_SCHEDULE_FILE} — skipping`,
    );
    return 0;
  }

  let cronData;
  try {
    cronData = JSON.parse(fs.readFileSync(CRON_SCHEDULE_FILE, "utf8"));
  } catch (e) {
    console.log(`[Boot Sync] Failed to parse cron schedule: ${e.message}`);
    return 0;
  }

  // Handle both formats: { jobs: [...] } or direct array
  const jobs = cronData.jobs || cronData;
  if (!Array.isArray(jobs)) {
    console.log("[Boot Sync] Cron schedule has no jobs array — skipping");
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
          job.schedule?.expr || job.schedule || job.cron || "0 * * * *",
          job.agent_name || job.agent || null,
          job.command || job.cmd || null,
          job.status || "active",
        );
        synced++;
      } catch (e) {
        console.log(`[Boot Sync] Cron skip: ${e.message}`);
      }
    }
  });

  syncMany(jobs);
  console.log(
    `[Boot Sync] ✓ Crons: ${synced} jobs synced (${existing} existed in DB)`,
  );
  return synced;
}

// Map various stage names from OpenClaw memory to DB-valid stages
function mapStage(raw) {
  const stage = (raw || "").toLowerCase().replace(/[_\s]+/g, "_");
  const map = {
    discovered: "discovered",
    scanned: "scanned",
    scored: "scored",
    prospect: "prospect",
    watch: "scored", // WATCH maps to scored (monitoring)
    watch_mode: "scored",
    qualified: "prospect", // QUALIFIED maps to prospect
    hot: "prospect", // HOT maps to prospect
    contacted: "contacted",
    outreach_sent: "contacted", // OUTREACH_SENT maps to contacted
    outreach: "contacted",
    negotiating: "negotiating",
    approved: "approved",
    listed: "listed",
    rejected: "rejected",
    skip: "rejected",
  };
  return map[stage] || "discovered";
}

// ─── Start ───────────────────────────────────────────
async function start() {
  try {
    await initDB();

    // v2.1.0: Sync persistent storage → SQLite BEFORE listening
    console.log("[Boot Sync] Starting data sync from persistent storage...");
    const pipelineSynced = syncPipelineOnBoot();
    const cronsSynced = syncCronsOnBoot();

    // Day 32B: Sync scanner MD files → pipeline_tokens
    try {
      const { syncPipelineFiles } = require("./lib/pipeline-persist");
      const mdSync = syncPipelineFiles();
      console.log(
        `[Boot Sync] ✓ Pipeline MD files: ${mdSync.synced} synced, ${mdSync.total} total in DB`,
      );
    } catch (e) {
      console.log(`[Boot Sync] ⚠️ Pipeline MD sync failed: ${e.message}`);
    }
    console.log(
      `[Boot Sync] ✓ Complete — ${pipelineSynced} pipeline tokens, ${cronsSynced} cron jobs`,
    );

    // v9.0: Initialize Claude Code architecture modules (DB is now ready)
    try {
      if (feature("MAILBOX")) {
        require("./services/mailbox/mailbox").initMailbox();
        console.log("[v9.0] ✓ Mailbox initialized");
      }
      if (feature("TASK_DAG")) {
        require("./services/tasks/task-manager").initTasks();
        console.log("[v9.0] ✓ Task DAG initialized");
      }
      if (feature("DYNAMIC_CRONS")) {
        require("./services/cron/dynamic-cron").initDynamicCrons();
        console.log("[v9.0] ✓ Dynamic crons initialized");
      }
      if (feature("EVENT_BUS")) {
        const {
          initEventBus,
          subscribe,
          EVENT_TYPES,
        } = require("./services/events/event-bus");
        initEventBus();
        subscribe("bd-agent", EVENT_TYPES.TOKEN_HOT);
        subscribe("signal-agent", EVENT_TYPES.SIGNAL_APPROVED);
        subscribe("signal-agent", EVENT_TYPES.SIGNAL_FILED);
        subscribe("bd-agent", EVENT_TYPES.SIMULATION_COMPLETE);
        subscribe("sentinel-agent", EVENT_TYPES.TOKEN_SCORED);
        subscribe("pulse-engine", EVENT_TYPES.SIGNAL_FILED);
        console.log("[v9.0] ✓ Event bus initialized + 6 default subscriptions");
      }

      // Mining Intelligence Engine v2.0 — auto-init tables on startup
      if (feature("MINING_INTEL")) {
        const {
          initMiningTables,
        } = require("./services/mining-intel/mining-intel");
        initMiningTables();
        console.log("[MINING-INTEL] Mining Intelligence Service initialized");
      }

      // Discord OPS + INTEL dashboard — Phase 1b Wave 1 (Apr 19 2026).
      // Pollers always start; every Discord send is a no-op when
      // DISCORD_OPS_DASHBOARD is false. Local DB writes proceed regardless
      // so the dispatcher + intel tables stay populated during dry-run.
      // Known debt: dispatcher last_error has no surfacing path today —
      // resolve in Phase 1b.2 via #sentinel-health wire (per Ogie msg 3905).
      try {
        const dispatcher = require("./services/discord/discord-ops-dispatcher");
        const intelIngest = require("./services/intel/discord-intel-ingest");
        const aii = require("./services/autodream/intel-ingest");
        const { getDB } = require("./db");
        aii.initIntelIngestTable(getDB());
        dispatcher.initDispatcherState(getDB());
        intelIngest.initIntelState(getDB());
        dispatcher.start();
        intelIngest.start();
        console.log(
          "[DISCORD] ✓ OPS dispatcher (60s poll) + INTEL ingest (5min poll) started; feature flag DISCORD_OPS_DASHBOARD gates actual posts",
        );
      } catch (e) {
        console.error(
          "[DISCORD] ⚠️ Phase 1b init error (non-fatal):",
          e.message,
        );
      }

      // AIBTC Signal Tracker — lifecycle tracking + event emission
      try {
        const {
          initSignalTracker,
        } = require("./services/signals/signal-tracker");
        initSignalTracker();
        app.use(
          "/api/v1/signals",
          apiKeyAuth,
          require("./routes/signal-routes"),
        );
        console.log(
          "[v9.3] ✓ Signal tracker initialized (aibtc_signals_filed table + 3 routes)",
        );
      } catch (e) {
        console.error(
          "[v9.3] ⚠️ Signal tracker init error (non-fatal):",
          e.message,
        );
      }

      // AIBTC Wallet Auto-Unlock — read password from .env.aibtc (container or host path)
      try {
        const envPaths = ["/data/.env.aibtc", "/home/claude-code/.env.aibtc"];
        const envPath = envPaths.find((p) => fs.existsSync(p));
        if (envPath) {
          const envContent = fs.readFileSync(envPath, "utf8");
          const match = envContent.match(/AIBTC_WALLET_PASSWORD=(.+)/);
          if (match) {
            process.env.AIBTC_WALLET_PASSWORD = match[1].trim();
            console.log(
              `[v9.3] ✓ AIBTC wallet password loaded from ${envPath}`,
            );
          }
        } else {
          console.log(
            "[v9.3] ⚠️ .env.aibtc not found at /data/ or /home/claude-code/ — manual unlock required",
          );
        }
      } catch (e) {
        console.error("[v9.3] ⚠️ AIBTC env load error:", e.message);
      }

      // HSaaS Event Wiring — auto-funnel from token.scored to upsell drafts
      if (feature("HSAAS_EVENT_WIRING")) {
        try {
          const {
            initHsaasEventWiring,
          } = require("./services/hsaas/event-wiring");
          initHsaasEventWiring();
          console.log(
            "[v9.3] ✓ HSaaS event wiring initialized (token.scored → audit_request + upsell draft)",
          );
        } catch (e) {
          console.error("[v9.3] ⚠️ HSaaS event wiring init error:", e.message);
        }
      }

      // GitHub PR Monitor — autonomous PR/issue watching
      if (feature("GITHUB_MONITOR")) {
        try {
          const {
            initGithubMonitor,
            trackPR,
          } = require("./services/github/pr-monitor");
          initGithubMonitor();
          app.use(
            "/api/v1/github",
            apiKeyAuth,
            require("./routes/github-routes"),
          );

          // Auto-track current PRs
          trackPR("aibtcdev/skills", 283);

          // Load PAT into process.env from .env.github (container or host path)
          const ghPaths = [
            "/data/.env.github",
            "/home/claude-code/.env.github",
          ];
          const ghEnvPath = ghPaths.find((p) => fs.existsSync(p));
          if (ghEnvPath) {
            const ghContent = fs.readFileSync(ghEnvPath, "utf8");
            const m = ghContent.match(/GITHUB_PAT=(.+)/);
            if (m) process.env.GITHUB_PAT = m[1].trim();
          }

          // Register 6-hour polling cron
          if (feature("DYNAMIC_CRONS")) {
            const { createCron } = require("./services/cron/dynamic-cron");
            const existing = getDB()
              .prepare(
                "SELECT id FROM dynamic_crons WHERE name = 'github-pr-monitor' AND active = 1",
              )
              .get();
            if (!existing) {
              createCron(
                "github-monitor",
                "github-pr-monitor",
                "0 */6 * * *",
                {
                  action: "check-pr-comments",
                  description:
                    "Poll tracked GitHub PRs for new comments and reviews",
                },
                { expiresAt: "2027-01-01T00:00:00Z" },
              );
              console.log(
                "[v9.3] ✓ GitHub PR monitor cron registered (every 6h)",
              );
            }
          }

          console.log(
            "[v9.3] ✓ GitHub PR Monitor initialized (tracking aibtcdev/skills#283)",
          );
        } catch (e) {
          console.error("[v9.3] ⚠️ GitHub PR Monitor init error:", e.message);
        }
      }

      // AIBTC Signal Status Polling — every 30 min via dynamic cron
      if (feature("DYNAMIC_CRONS") && feature("EVENT_BUS")) {
        try {
          const { createCron } = require("./services/cron/dynamic-cron");
          const existing = getDB()
            .prepare(
              "SELECT id FROM dynamic_crons WHERE name = 'aibtc-signal-poll' AND active = 1",
            )
            .get();
          if (!existing) {
            createCron(
              "signal-agent",
              "aibtc-signal-poll",
              "*/30 * * * *",
              {
                action: "poll-signal-status",
                description:
                  "Poll AIBTC news_check_status for signal approvals/rejections",
              },
              { expiresAt: "2027-01-01T00:00:00Z" },
            );
            console.log(
              "[v9.3] ✓ AIBTC signal status polling cron registered (every 30min)",
            );
          } else {
            console.log(
              "[v9.3] ✓ AIBTC signal status polling cron already active",
            );
          }
        } catch (e) {
          console.error("[v9.3] ⚠️ Signal polling cron error:", e.message);
        }
      }
    } catch (e) {
      console.error("[v9.0] ⚠️ Module init error (non-fatal):", e.message);
    }

    // ═══════════════════════════════════════════════════════
    // TASKS 14-18: KAIROS-CLASS EXTENSIONS
    // ═══════════════════════════════════════════════════════

    // TASK 14+16: PULSE ENGINE + OBSERVATION LOG
    if (feature("PULSE_ENGINE")) {
      // Init observation log + pulse_state tables first
      if (feature("OBSERVATION_LOG")) {
        require("./services/pulse/observation-schema").initObservationLog();
      }
      // Start tick loop (resumes from persisted state)
      require("./services/pulse/pulse-engine").initPulse();
      app.use("/api/v1/pulse", require("./routes/pulse-routes"));
    }

    // PULSE_MOLTBOOK (persistent Moltbook engagement)
    if (feature("PULSE_MOLTBOOK") && feature("PULSE_ENGINE")) {
      try {
        const {
          initMoltbookPulse,
        } = require("./services/moltbook/pulse-moltbook");
        initMoltbookPulse();
        console.log("[PULSE_MOLTBOOK] Moltbook engagement wired to PULSE");
      } catch (e) {
        console.error("[PULSE_MOLTBOOK] Init error:", e.message);
      }
    }

    // TASK 15: AUTODREAM
    if (feature("AUTODREAM")) {
      const {
        runDreamCycle,
        dreamRanToday,
      } = require("./services/autodream/autodream");
      app.use("/api/v1/dream", require("./routes/autodream-routes"));

      // Nightly dream at 02:00 UTC (with reboot dedup)
      const scheduleNightlyDream = () => {
        const now = new Date();
        const next2am = new Date(now);
        next2am.setUTCHours(2, 0, 0, 0);
        if (next2am <= now) next2am.setDate(next2am.getDate() + 1);
        const delay = next2am - now;

        setTimeout(() => {
          if (dreamRanToday()) {
            console.log(
              "[AUTODREAM] Nightly dream already ran today — skipping (reboot dedup)",
            );
          } else {
            runDreamCycle("nightly");
          }
          scheduleNightlyDream();
        }, delay);

        console.log(
          `[AUTODREAM] Nightly dream scheduled in ${Math.round(delay / 60000)}min`,
        );
      };
      scheduleNightlyDream();

      // Event-triggered dream (from PULSE idle threshold)
      if (feature("EVENT_BUS")) {
        const { subscribe } = require("./services/events/event-bus");
        subscribe("autodream", "autodream.trigger");
      }
    }

    // ═══════════════════════════════════════════════════════
    // BUZZ SHIELD — Agent Security Intelligence (Phase 1)
    // ═══════════════════════════════════════════════════════
    if (feature("SHIELD_ENGINE")) {
      try {
        const {
          createShieldTables,
        } = require("./services/shield/shield-schema");
        const {
          seedDrainPatterns,
        } = require("./services/shield/drain-patterns-seed");
        createShieldTables(getDB());
        const seeded = seedDrainPatterns(getDB());
        // BuzzShield v2.0 tables (shield_detections, shield_vulnerabilities, shield_sbom)
        try {
          const {
            createShieldV2Tables,
          } = require("./services/shield/buzzshield-v2");
          createShieldV2Tables(getDB());
        } catch (e) {
          console.warn("[SHIELD-V2] Table init (non-fatal):", e.message);
        }
        app.use("/api/v1/shield", require("./routes/shield-routes"));
        console.log(
          `[SHIELD] ✓ Buzz Shield initialized (${seeded} drain patterns, 8 tables, 6 endpoints, v2 layers wired)`,
        );
      } catch (e) {
        console.error("[SHIELD] Init error (non-fatal):", e.message);
      }
    }

    // AUTODREAM EVOLUTION — Telegram Intel + Hill-Climbing
    if (feature("TELEGRAM_CHANNEL_INTEL")) {
      try {
        const {
          initTelegramIntelTables,
        } = require("./services/intel/telegram-channel");
        initTelegramIntelTables();
        console.log("[INTEL] ✓ Telegram channel intel tables initialized");
      } catch (e) {
        console.error("[INTEL] Init error (non-fatal):", e.message);
      }
    }
    if (feature("AUTODREAM_HILLCLIMB")) {
      try {
        const {
          initHillClimberTables,
          seedGroundTruth,
        } = require("./services/autodream/hill-climber");
        initHillClimberTables();
        const seeded = seedGroundTruth();
        console.log(
          `[HILLCLIMB] ✓ Hill-climber tables initialized (${seeded} ground truth seeded)`,
        );
      } catch (e) {
        console.error("[HILLCLIMB] Init error (non-fatal):", e.message);
      }
    }

    // TASK 17: ANTI-DISTILLATION
    if (feature("ANTI_DISTILLATION")) {
      const { antiDistillation } = require("./middleware/anti-distillation");
      app.use("/api/v1", antiDistillation);
    }

    // ═══════════════════════════════════════════════════════
    // OUTREACH AUTOMATION (Tasks 14-17 v9.1)
    // ═══════════════════════════════════════════════════════

    // Task 15: Trust Gates (init first — outreach depends on it)
    if (feature("TRUST_GATES")) {
      try {
        const { initTrustGates } = require("./services/trust/trust-gates");
        const trustRoutes = require("./routes/trust-routes");
        initTrustGates();
        app.use("/api/v1/trust", trustRoutes);
        console.log("[v9.1] ✓ Trust gates initialized (TRUST_GATES=true)");
      } catch (e) {
        console.error(
          "[v9.1] ⚠️ Trust gates init error (non-fatal):",
          e.message,
        );
      }
    }

    // Task 14: Outreach Engine
    if (feature("AUTO_OUTREACH")) {
      try {
        const { initOutreach } = require("./services/outreach/outreach-engine");
        const { initGmail } = require("./services/outreach/gmail-sender");
        const { startSenderLoop } = require("./services/outreach/sender-loop");
        const outreachRoutes = require("./routes/outreach-routes");

        initOutreach();
        initGmail();
        app.use("/api/v1/outreach", outreachRoutes);
        startSenderLoop();
        console.log(
          "[v9.1] ✓ Outreach engine initialized (AUTO_OUTREACH=true)",
        );
      } catch (e) {
        console.error(
          "[v9.1] ⚠️ Outreach engine init error (non-fatal):",
          e.message,
        );
      }
    }

    // Task 16: Inbox Monitor
    if (feature("INBOX_MONITOR")) {
      try {
        const {
          initInboxMonitor,
          checkInbox,
        } = require("./services/outreach/inbox-monitor");
        initInboxMonitor();

        setInterval(
          async () => {
            try {
              const { google } = require("googleapis");
              const oauth2Client = new google.auth.OAuth2(
                process.env.GMAIL_CLIENT_ID,
                process.env.GMAIL_CLIENT_SECRET,
                "http://localhost",
              );
              oauth2Client.setCredentials({
                refresh_token: process.env.GMAIL_REFRESH_TOKEN,
              });
              await checkInbox(oauth2Client);
            } catch (e) {
              console.error("[inbox-monitor] Error:", e.message);
            }
          },
          30 * 60 * 1000,
        );
        console.log(
          "[v9.1] ✓ Inbox monitor initialized (INBOX_MONITOR=true, 30min interval)",
        );
      } catch (e) {
        console.error(
          "[v9.1] ⚠️ Inbox monitor init error (non-fatal):",
          e.message,
        );
      }
    }

    // Task 17: Wallet Guard
    if (feature("WALLET_GUARD")) {
      console.log("[v9.1] ✓ Wallet Guard enabled — AION evaluation active");
    }

    // ATV IDENTITY (Web3 deployer verification)
    if (feature("ATV_IDENTITY")) {
      try {
        const atvIdentity = require("./services/identity/atv-identity");
        atvIdentity.initIdentityTables();

        // ATV status endpoint
        app.get("/api/v1/identity/atv/status", apiKeyAuth, (req, res) => {
          const identityDb = getDB();
          const cached = identityDb
            .prepare("SELECT COUNT(*) as c FROM identity_cache")
            .get();
          const payments = identityDb
            .prepare(
              "SELECT COUNT(*) as c FROM x402_payments WHERE service LIKE ?",
            )
            .get("atv%");
          const recent = identityDb
            .prepare(
              "SELECT address, ens_name, twitter, github, resolved_at FROM identity_cache ORDER BY resolved_at DESC LIMIT 5",
            )
            .all();

          res.json({
            enabled: true,
            flag: "ATV_IDENTITY",
            cached_identities: cached.c,
            total_lookups: payments.c,
            recent_resolutions: recent,
            scoring: {
              identity_verified: "+5 (ENS + twitter/github)",
              ens_holder: "+3 (ENS only)",
              anon_deployer: "-3 (no ENS)",
            },
          });
        });

        console.log(
          "[v9.1] ✓ ATV Identity tables + status route initialized (ATV_IDENTITY=true)",
        );
      } catch (e) {
        console.error("[v9.1] ⚠️ ATV Identity init error:", e.message);
      }
    }

    // HEYANON MCP (Brain #2 — 51 protocols)
    if (feature("HEYANON_MCP")) {
      try {
        const { initHeyAnon } = require("./services/heyanon/mcp-client");
        const connected = await initHeyAnon();
        console.log(
          `[v9.2] ${connected ? "✓" : "⚠️"} HeyAnon MCP ${connected ? "connected (51 protocols)" : "failed to connect"}`,
        );
      } catch (e) {
        console.error("[v9.2] ⚠️ HeyAnon init error:", e.message);
      }
    }

    // SERVICE CATALOG
    app.use("/api/v1/catalog", require("./routes/catalog-routes"));

    // WALLET GUARD ROUTES + RECEIPT TABLE
    if (feature("WALLET_GUARD")) {
      try {
        const db = getDB();
        db.exec(`CREATE TABLE IF NOT EXISTS wallet_guard_receipts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          request_id TEXT UNIQUE,
          decision TEXT NOT NULL,
          risk_level TEXT,
          reason_code TEXT,
          reasoning TEXT,
          receipt_hash TEXT,
          receipt_json TEXT,
          tx_fingerprint TEXT,
          policy_version TEXT,
          override_required INTEGER DEFAULT 0,
          override_used INTEGER DEFAULT 0,
          token_address TEXT,
          token_chain TEXT,
          buzz_score REAL,
          sim_consensus REAL,
          sim_ev REAL,
          screening_class TEXT,
          counterfactual_summary TEXT,
          normalized TEXT,
          receipt_path TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )`);
        // Idempotent column adds for existing DBs (Apr 9 2026 — Aldo demo schema)
        for (const col of [
          "counterfactual_summary TEXT",
          "normalized TEXT",
          "receipt_path TEXT",
        ]) {
          try {
            db.exec(`ALTER TABLE wallet_guard_receipts ADD COLUMN ${col}`);
          } catch {
            /* column already exists — ignore */
          }
        }
        app.use("/api/v1/guard", require("./routes/guard-routes"));
        console.log("[v9.2] ✓ Wallet Guard routes + receipt table initialized");
      } catch (e) {
        console.error("[v9.2] ⚠️ Wallet Guard init error:", e.message);
      }
    }

    // SOLANA AGENT SKILLS (/.well-known/skills)
    if (feature("SOLANA_AGENT_SKILL")) {
      require("./routes/skills-route")(app);
      console.log(
        "[v9.2] ✓ Solana Agent Skills endpoint wired: /.well-known/skills",
      );
    }

    // Score Calibration — apply mcap/liquidity penalties after pipeline sync
    try {
      const { calibrateScores } = require("./lib/score-calibrator");
      calibrateScores()
        .then((result) => {
          console.log(
            `[Boot Sync] ✓ Score calibration: ${result.adjusted} adjusted, ${result.unchanged} unchanged, ${result.errors} errors`,
          );
        })
        .catch((e) => {
          console.log(`[Boot Sync] ⚠️ Score calibration failed: ${e.message}`);
        });
    } catch (e) {
      console.log(`[Boot Sync] ⚠️ Score calibrator load failed: ${e.message}`);
    }

    // v7.0: Initialize Strategic Orchestrator engines
    const db = getDB();
    const contextEngine = new ContextEngine(db);
    const decisionEngine = new DecisionEngine(db, contextEngine);
    const playbookEngine = new PlaybookEngine(db);
    console.log("[v7.0] ✓ Strategic Orchestrator engines initialized");

    // v7.3.1: Initialize FTS5 memory search + Contact intelligence
    initFTS(db);
    initContacts(db);
    console.log(
      "[v7.3.1] ✓ Memory FTS5 search + Contact intelligence initialized",
    );

    // v7.0: Strategy routes (8 endpoints)
    app.use(
      "/api/v1/strategy",
      apiKeyAuth,
      strategyRoutes(db, { decisionEngine, playbookEngine, contextEngine }),
    );

    // v7.5.5: LLM Cost Proxy — KILLED by Project Opus Brain
    // app.use('/api/v1/llm', llmProxyRoutes(db));

    // v7.4.0: Hedge Brain routes (SSE streaming, personas, backtest)
    app.use("/api/v1/pipeline", pipelineStreamRoutes); // SSE stream (adds /stream under existing /pipeline)
    app.use("/api/v1/personas", apiKeyAuth, createPersonaRoutes(db));
    app.use("/api/v1/backtest", apiKeyAuth, createBacktestRoutes(db));
    console.log(
      "[v7.4.0] ✓ Hedge Brain routes: pipeline/stream, personas, backtest",
    );

    // v8.2.0: ClawTeam Patterns for DNA v2.0 — 12 agents chained
    const ActivityBoard = require("./lib/activity-board");
    const AgentInbox = require("./lib/agent-inbox");
    const TaskChainExecutor = require("./lib/task-chains");
    const { sendTelegram } = require("./lib/telegram-notify");

    const activityBoard = new ActivityBoard(db);
    const agentInbox = new AgentInbox(db, activityBoard, (msg) => {
      try {
        sendTelegram(msg);
      } catch (e) {
        console.error("[v8.2.0] Telegram notify failed:", e.message);
      }
    });
    const taskChainExecutor = new TaskChainExecutor(
      db,
      activityBoard,
      agentInbox,
    );
    global.buzzModules = { activityBoard, agentInbox, taskChainExecutor };

    app.use(
      "/api/v1/chains",
      apiKeyAuth,
      require("./routes/chains")(db, taskChainExecutor),
    );
    app.use(
      "/api/v1/inbox",
      apiKeyAuth,
      require("./routes/inbox")(db, agentInbox),
    );
    app.use(
      "/api/v1/board",
      apiKeyAuth,
      require("./routes/board")(db, activityBoard, taskChainExecutor),
    );
    console.log(
      "[v8.2.0] ✓ ClawTeam patterns: chains(4) + inbox(4) + board(3) = 11 endpoints",
    );

    // v8.2.1: Colosseum Copilot — Intel Source #18
    if (process.env.COLOSSEUM_COPILOT_PAT) {
      app.use("/api/v1/copilot", apiKeyAuth, require("./routes/copilot")());
      console.log(
        "[v8.2.1] ✓ Colosseum Copilot: search, enrich, cluster, trends, landscape, status = 6 endpoints",
      );
    } else {
      console.log(
        "[v8.2.1] ⚠ Colosseum Copilot: COLOSSEUM_COPILOT_PAT not set, endpoints disabled",
      );
    }

    // ─── 404 Handler (must be after all route registrations) ───
    app.use((req, res) => {
      res.status(404).json({
        error: "not_found",
        message: `Route ${req.method} ${req.path} does not exist`,
        docs: "/api/v1/info",
      });
    });

    // ─── Error Handler ───
    app.use((err, req, res, next) => {
      console.error(`[API ERROR] ${err.message}`, err.stack);
      res.status(err.status || 500).json({
        error: "internal_error",
        message:
          process.env.NODE_ENV === "production"
            ? "Internal server error"
            : err.message,
      });
    });

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`[Buzz API] ✓ v3.6.0 — 113/113 endpoints on port ${PORT}`);
      console.log(`[Buzz API] ✓ Health: http://0.0.0.0:${PORT}/api/v1/health`);
      console.log(`[Buzz API] ✓ Info:   http://0.0.0.0:${PORT}/api/v1/info`);
      console.log(
        `[Buzz API] ✓ Routes: health, agents, pipeline, costs, crons, score-token, scoring, intel, twitter, wallets, webhooks, receipts, strategy, skills, memory, operator, contacts, simulate, ws, nansen, xlayer, personas, backtest, listing-report, listing-proposal, coingecko, simulation-report`,
      );

      // v7.6.0: Start WebSocket services (non-blocking, with delay for DB init)
      setTimeout(() => {
        try {
          require("./services/okx-websocket").init();
        } catch (e) {
          console.error("[okx-ws] Init failed:", e.message);
        }
        try {
          require("./services/helius-websocket").init();
        } catch (e) {
          console.error("[helius-ws] Init failed:", e.message);
        }
      }, 5000);

      // v8.1.0: Start Cron Executor (replaces host crontab + dead OpenClaw scheduler)
      setTimeout(() => {
        try {
          const cronExecutor = require("./services/cron-executor");
          cronExecutor.start();
        } catch (e) {
          console.error("[cron-executor] Init failed:", e.message);
        }
      }, 10000);
    });
  } catch (err) {
    console.error("[Buzz API] ✗ Failed to start:", err.message);
    process.exit(1);
  }
}

start();
