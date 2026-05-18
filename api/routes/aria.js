/**
 * ARIA Routes — Autonomous Research & Intelligence Agent
 *
 * GET  /api/v1/aria/discover        → Trigger multi-source discovery scan
 * GET  /api/v1/aria/feed            → Return latest candidates from DB
 * GET  /api/v1/aria/filter          → Return BD Sweet Spot qualified only
 * GET  /api/v1/aria/enrich/:address → Deep enrich single token
 * GET  /api/v1/aria/status          → Feed health, source statuses
 *
 * Buzz BD Agent | ARIA Service Layer
 */

const express = require("express");
const router = express.Router();
const { getDB } = require("../db");
const { discover } = require("../services/aria/aria-discovery");
const { emptyToken } = require("../services/aria/aria-normalizer");
const {
  filterTokens,
  qualifyToken,
  DEFAULT_CRITERIA,
} = require("../services/aria/aria-filter");
const { enrichToken } = require("../services/aria/aria-enricher");

// ─── Ensure aria_tokens table exists ─────────────────
function ensureTable() {
  const db = getDB();
  db.exec(`
    CREATE TABLE IF NOT EXISTS aria_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      address TEXT NOT NULL,
      chain TEXT DEFAULT 'solana',
      symbol TEXT,
      name TEXT,
      source TEXT,
      discovery_type TEXT,
      discovered_at TEXT DEFAULT (datetime('now')),
      mcap_circulating REAL,
      mcap_fdv REAL,
      fdv_gap REAL,
      volume_24h REAL,
      liquidity_usd REAL,
      pair_age_days REAL,
      exchange_count INTEGER,
      honeypot INTEGER DEFAULT 0,
      bd_qualified INTEGER DEFAULT 0,
      composite_score REAL,
      enriched_at TEXT,
      enrichment_sources TEXT,
      raw_json TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(address, chain)
    )
  `);
}

// Run on module load
try {
  ensureTable();
  // v8.3.0: Add rug_score column for HeyAnon Rug-O-Meter integration
  const db = getDB();
  try {
    db.exec("ALTER TABLE aria_tokens ADD COLUMN rug_score TEXT");
  } catch {
    /* already exists */
  }
} catch (e) {
  /* DB may not be ready yet at require time */
}

/**
 * Upsert a normalized token into aria_tokens
 */
function upsertToken(token) {
  const db = getDB();
  ensureTable();
  const stmt = db.prepare(`
    INSERT INTO aria_tokens (address, chain, symbol, name, source, discovery_type, discovered_at,
      mcap_circulating, mcap_fdv, fdv_gap, volume_24h, liquidity_usd, pair_age_days,
      exchange_count, honeypot, bd_qualified, composite_score, enriched_at, enrichment_sources, raw_json, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(address, chain) DO UPDATE SET
      symbol = COALESCE(excluded.symbol, symbol),
      name = COALESCE(excluded.name, name),
      mcap_circulating = COALESCE(excluded.mcap_circulating, mcap_circulating),
      mcap_fdv = COALESCE(excluded.mcap_fdv, mcap_fdv),
      fdv_gap = COALESCE(excluded.fdv_gap, fdv_gap),
      volume_24h = COALESCE(excluded.volume_24h, volume_24h),
      liquidity_usd = COALESCE(excluded.liquidity_usd, liquidity_usd),
      pair_age_days = COALESCE(excluded.pair_age_days, pair_age_days),
      exchange_count = COALESCE(excluded.exchange_count, exchange_count),
      honeypot = COALESCE(excluded.honeypot, honeypot),
      bd_qualified = COALESCE(excluded.bd_qualified, bd_qualified),
      composite_score = COALESCE(excluded.composite_score, composite_score),
      enriched_at = COALESCE(excluded.enriched_at, enriched_at),
      enrichment_sources = COALESCE(excluded.enrichment_sources, enrichment_sources),
      raw_json = COALESCE(excluded.raw_json, raw_json),
      updated_at = datetime('now')
  `);

  const qual = qualifyToken(token);
  stmt.run(
    token.address,
    token.chain,
    token.symbol,
    token.name,
    token.discovery?.source,
    token.discovery?.discovery_type,
    token.discovery?.discovered_at,
    token.market?.mcap_circulating,
    token.market?.mcap_fdv,
    token.market?.fdv_gap,
    token.market?.volume_24h,
    token.market?.liquidity_usd,
    token.market?.pair_age_days,
    token.market?.exchange_count,
    token.safety?.honeypot ? 1 : 0,
    qual.pass ? 1 : 0,
    token.classification?.composite_score,
    token.metadata?.enriched_at,
    JSON.stringify(token.metadata?.enrichment_sources || []),
    JSON.stringify(token),
  );
}

// ─── GET /discover ───────────────────────────────────
router.get("/discover", async (req, res) => {
  try {
    const sources = req.query.sources
      ? req.query.sources.split(",")
      : undefined;
    const result = await discover({ sources });

    // Persist all discovered tokens
    let persisted = 0;
    for (const token of result.tokens) {
      try {
        upsertToken(token);
        persisted++;
      } catch (e) {
        /* skip duplicates / errors */
      }
    }

    res.json({
      discovered: result.total,
      persisted,
      sources: result.sources,
      duration_ms: result.duration_ms,
      discovered_at: result.discovered_at,
    });
  } catch (err) {
    res.status(500).json({ error: err.message, code: "ARIA_DISCOVER_ERROR" });
  }
});

// ─── GET /feed ───────────────────────────────────────
router.get("/feed", (req, res) => {
  try {
    const db = getDB();
    ensureTable();
    const limit = parseInt(req.query.limit) || 50;
    const chain = req.query.chain;
    const since = req.query.since; // ISO date string

    let sql = "SELECT * FROM aria_tokens WHERE 1=1";
    const params = [];

    if (chain) {
      sql += " AND chain = ?";
      params.push(chain);
    }
    if (since) {
      sql += " AND discovered_at >= ?";
      params.push(since);
    }

    sql += " ORDER BY discovered_at DESC LIMIT ?";
    params.push(limit);

    const tokens = db.prepare(sql).all(...params);
    res.json({ count: tokens.length, tokens });
  } catch (err) {
    res.status(500).json({ error: err.message, code: "ARIA_FEED_ERROR" });
  }
});

// ─── GET /filter ─────────────────────────────────────
router.get("/filter", (req, res) => {
  try {
    const db = getDB();
    ensureTable();
    const limit = parseInt(req.query.limit) || 50;

    // Custom criteria from query params
    const criteria = {};
    if (req.query.mcap_min) criteria.mcap_min = parseFloat(req.query.mcap_min);
    if (req.query.mcap_max) criteria.mcap_max = parseFloat(req.query.mcap_max);
    if (req.query.liquidity_min)
      criteria.liquidity_min = parseFloat(req.query.liquidity_min);
    if (req.query.age_min_days)
      criteria.age_min_days = parseFloat(req.query.age_min_days);

    // Pull candidates from DB (pre-filter with SQL for performance)
    const c = { ...DEFAULT_CRITERIA, ...criteria };
    const rows = db
      .prepare(
        `
      SELECT raw_json FROM aria_tokens
      WHERE mcap_circulating >= ? AND mcap_circulating <= ?
        AND (liquidity_usd >= ? OR liquidity_usd IS NULL)
        AND honeypot = 0
      ORDER BY discovered_at DESC
      LIMIT ?
    `,
      )
      .all(c.mcap_min, c.mcap_max, c.liquidity_min, limit * 3);

    // Parse and run full filter
    const tokens = rows
      .map((r) => {
        try {
          return JSON.parse(r.raw_json);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    const result = filterTokens(tokens, criteria);

    res.json({
      qualified: result.qualified.slice(0, limit),
      count: result.stats.qualified,
      stats: result.stats,
      criteria: { ...DEFAULT_CRITERIA, ...criteria },
    });
  } catch (err) {
    res.status(500).json({ error: err.message, code: "ARIA_FILTER_ERROR" });
  }
});

// ─── GET /enrich/:address ────────────────────────────
router.get("/enrich/:address", async (req, res) => {
  try {
    const { address } = req.params;
    const chain = req.query.chain || "solana";

    // Check if we have this token in DB already
    const db = getDB();
    ensureTable();
    const existing = db
      .prepare(
        "SELECT raw_json FROM aria_tokens WHERE address = ? AND chain = ?",
      )
      .get(address, chain);
    let token;
    if (existing?.raw_json) {
      try {
        token = JSON.parse(existing.raw_json);
      } catch {
        token = null;
      }
    }
    if (!token) {
      token = emptyToken(address, chain);
    }

    const result = await enrichToken(token);

    // Persist enriched token
    try {
      upsertToken(result.token);
    } catch (e) {
      /* best effort */
    }

    res.json({
      address,
      chain,
      token: result.token,
      enrichment_sources: result.sources,
      duration_ms: result.duration_ms,
    });
  } catch (err) {
    res.status(500).json({ error: err.message, code: "ARIA_ENRICH_ERROR" });
  }
});

// ─── GET /status ─────────────────────────────────────
router.get("/status", (req, res) => {
  try {
    const db = getDB();
    ensureTable();

    const total = db.prepare("SELECT COUNT(*) as c FROM aria_tokens").get();
    const qualified = db
      .prepare("SELECT COUNT(*) as c FROM aria_tokens WHERE bd_qualified = 1")
      .get();
    const enriched = db
      .prepare(
        "SELECT COUNT(*) as c FROM aria_tokens WHERE enriched_at IS NOT NULL",
      )
      .get();
    const last24h = db
      .prepare(
        "SELECT COUNT(*) as c FROM aria_tokens WHERE discovered_at >= datetime('now', '-1 day')",
      )
      .get();
    const lastScan = db
      .prepare("SELECT MAX(discovered_at) as ts FROM aria_tokens")
      .get();

    const bySource = db
      .prepare(
        "SELECT source, COUNT(*) as count FROM aria_tokens GROUP BY source",
      )
      .all();
    const byChain = db
      .prepare(
        "SELECT chain, COUNT(*) as count FROM aria_tokens GROUP BY chain",
      )
      .all();

    res.json({
      status: "operational",
      service: "aria",
      version: "1.0.0",
      feed: {
        total: total.c,
        qualified: qualified.c,
        enriched: enriched.c,
        added_24h: last24h.c,
        last_scan: lastScan.ts,
      },
      by_source: bySource,
      by_chain: byChain,
      criteria: DEFAULT_CRITERIA,
    });
  } catch (err) {
    res.status(500).json({ error: err.message, code: "ARIA_STATUS_ERROR" });
  }
});

module.exports = router;
