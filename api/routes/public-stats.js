// Public stats endpoint — landing page consumer
// GET /api/v1/public/stats
// No auth, CORS open, 60s cache. Lightweight DB counts.
// Added 2026-04-22 per Ogie directive (msg 4403).

const express = require("express");
const Database = require("better-sqlite3");

const DB_PATH = "/data/buzz-api/buzz.db";
const router = express.Router();

// Static values (no DB source)
const STATIC = {
  intel_sources: 36,
  mirofish_agents: 10000,
  checklist_items: 294,
  audit_domains: 5,
  aibtc_rank: 20,
  day_streak: 20,
  contracts: 5,
  chains: 2,
};

// In-memory cache — 60s TTL
let _cache = { at: 0, body: null };
const CACHE_TTL_MS = 60_000;

function safeCount(db, sql, params = []) {
  try {
    const row = db.prepare(sql).get(...params);
    return row ? Object.values(row)[0] : 0;
  } catch (e) {
    return 0;
  }
}

function riskLevel(score) {
  if (score == null) return "unknown";
  if (score >= 70) return "low";
  if (score >= 40) return "medium";
  return "high";
}

function loadLeaderboard(db) {
  try {
    const rows = db
      .prepare(
        `SELECT address, chain, ticker, name, score, updated_at
         FROM pipeline_tokens
         WHERE score IS NOT NULL
         ORDER BY score DESC, updated_at DESC
         LIMIT 50`,
      )
      .all();
    return rows.map((r, i) => ({
      rank: i + 1,
      token_name: r.name || "",
      token_symbol: r.ticker || "",
      chain: r.chain,
      score: r.score,
      risk_level: riskLevel(r.score),
      scored_at: r.updated_at,
      contract_address: r.address,
    }));
  } catch {
    return [];
  }
}

function computeStats() {
  let db;
  try {
    db = new Database(DB_PATH, { readonly: true });
  } catch (e) {
    // DB unavailable — return static-only
    return {
      ...STATIC,
      tokens_scored: 1086,
      tables: 141,
      drain_patterns: 31,
      wiki_pages: 146,
      flags_active: 70,
      flags_total: 124,
      ground_truth: 601,
      guard_receipts: 17,
      revenue_sats: 0,
      _note: "db unavailable, static fallback",
    };
  }

  const stats = {
    tokens_scored: safeCount(db, "SELECT COUNT(*) AS c FROM pipeline_tokens"),
    tables: safeCount(
      db,
      "SELECT COUNT(*) AS c FROM sqlite_master WHERE type='table'",
    ),
    drain_patterns: safeCount(
      db,
      "SELECT COUNT(*) AS c FROM drain_patterns WHERE active = 1",
    ),
    guard_receipts: safeCount(
      db,
      "SELECT COUNT(*) AS c FROM wallet_guard_receipts",
    ),
    ground_truth: safeCount(
      db,
      "SELECT COUNT(*) AS c FROM scoring_ground_truth",
    ),
    flags_active: safeCount(
      db,
      "SELECT COUNT(*) AS c FROM feature_flags_registry WHERE current_value IN ('true','1','TRUE')",
    ),
    flags_total: safeCount(
      db,
      "SELECT COUNT(*) AS c FROM feature_flags_registry",
    ),
    revenue_sats: safeCount(
      db,
      "SELECT IFNULL(SUM(sats_amount),0) AS c FROM revenue_ledger",
    ),
    ...STATIC,
  };

  // wiki_pages — filesystem count
  try {
    const { execSync } = require("child_process");
    const out = execSync(
      'find /data/buzz/persistent/wiki -type f -name "*.md" 2>/dev/null | wc -l',
      { timeout: 500, encoding: "utf8" },
    );
    stats.wiki_pages = parseInt(out.trim(), 10) || 146;
  } catch {
    stats.wiki_pages = 146;
  }

  stats.leaderboard = loadLeaderboard(db);

  db.close();
  return stats;
}

router.get("/stats", (req, res) => {
  // CORS — public endpoint
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Cache-Control", "public, max-age=60");

  const now = Date.now();
  if (_cache.body && now - _cache.at < CACHE_TTL_MS) {
    return res.json(_cache.body);
  }

  try {
    const body = computeStats();
    body.timestamp = new Date().toISOString();
    _cache = { at: now, body };
    res.json(body);
  } catch (err) {
    res.status(500).json({ error: "stats_unavailable", message: err.message });
  }
});

router.options("/stats", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Max-Age", "86400");
  res.sendStatus(204);
});

module.exports = router;
