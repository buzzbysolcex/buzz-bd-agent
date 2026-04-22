// Public shield summary endpoint — for shield.buzzbd.ai (Noah) + AI crawlers
// GET /api/v1/shield/public/summary
// No auth, CORS open, 60s cache.
// Added 2026-04-22 per Ogie directive (msg 4404).

const express = require("express");
const Database = require("better-sqlite3");

const DB_PATH = "/data/buzz-api/buzz.db";
const router = express.Router();

const STATIC = {
  version: "V5",
  checklist_items: 294,
  audit_domains: 5,
  domain_names: [
    "Loop Injection",
    "Overthinking",
    "Expert Routing",
    "Spectral Instability",
    "AI Supply Chain",
  ],
  avg_scan_time_ms: 89,
  pashov_enabled: true,
  x402_endpoints: 6,
};

let _cache = { at: 0, body: null };
const CACHE_TTL_MS = 60_000;

function safeCount(db, sql, params = []) {
  try {
    const row = db.prepare(sql).get(...params);
    return row ? Object.values(row)[0] : 0;
  } catch {
    return 0;
  }
}

function computeSummary() {
  let db;
  try {
    db = new Database(DB_PATH, { readonly: true });
  } catch {
    return {
      ...STATIC,
      tokens_scanned: 0,
      drain_patterns: 31,
      _note: "db unavailable, static fallback",
    };
  }

  const body = {
    ...STATIC,
    tokens_scanned: safeCount(db, "SELECT COUNT(*) AS c FROM shield_scans"),
    drain_patterns: safeCount(
      db,
      "SELECT COUNT(*) AS c FROM drain_patterns WHERE active = 1",
    ),
  };

  db.close();
  return body;
}

router.get("/summary", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Cache-Control", "public, max-age=60");

  const now = Date.now();
  if (_cache.body && now - _cache.at < CACHE_TTL_MS) {
    return res.json(_cache.body);
  }

  try {
    const body = computeSummary();
    body.timestamp = new Date().toISOString();
    _cache = { at: now, body };
    res.json(body);
  } catch (err) {
    res
      .status(500)
      .json({ error: "summary_unavailable", message: err.message });
  }
});

router.options("/summary", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Max-Age", "86400");
  res.sendStatus(204);
});

// ─── /stats — hero-section shape for Noah's SPA (msg 4425) ────────────
// GET /api/v1/shield/public/stats
// Noah expects: { tokens_scored, drain_patterns, audit_checks, guard_receipts,
//                 wiki_pages, ground_truth_rows, scoring_rules, streak_days,
//                 feature_flags: { active, total } }

let _statsCache = { at: 0, body: null };

const STATS_STATIC = {
  audit_checks: 294,
  scoring_rules: 15,
  streak_days: 20,
};

function computeShieldStats() {
  let db;
  try {
    db = new Database(DB_PATH, { readonly: true });
  } catch {
    return {
      ...STATS_STATIC,
      tokens_scored: 1086,
      drain_patterns: 31,
      guard_receipts: 17,
      wiki_pages: 146,
      ground_truth_rows: 601,
      feature_flags: { active: 70, total: 124 },
      _note: "db unavailable, static fallback",
    };
  }

  const body = {
    ...STATS_STATIC,
    tokens_scored: safeCount(
      db,
      "SELECT COUNT(*) AS c FROM pipeline_tokens WHERE score IS NOT NULL",
    ),
    drain_patterns: safeCount(
      db,
      "SELECT COUNT(*) AS c FROM drain_patterns WHERE active = 1",
    ),
    // Ogie spec said `guard_receipts`; actual table is `wallet_guard_receipts`.
    guard_receipts: safeCount(
      db,
      "SELECT COUNT(*) AS c FROM wallet_guard_receipts",
    ),
    // Ogie spec said `ground_truth_log`; actual table is `scoring_ground_truth`.
    ground_truth_rows: safeCount(
      db,
      "SELECT COUNT(*) AS c FROM scoring_ground_truth",
    ),
    feature_flags: {
      active: safeCount(
        db,
        "SELECT COUNT(*) AS c FROM feature_flags_registry WHERE current_value IN ('true','1','TRUE')",
      ),
      total: safeCount(
        db,
        "SELECT COUNT(*) AS c FROM feature_flags_registry",
      ),
    },
  };

  // wiki_pages — filesystem count
  try {
    const { execSync } = require("child_process");
    const out = execSync(
      'find /data/buzz/persistent/wiki -type f -name "*.md" 2>/dev/null | wc -l',
      { timeout: 500, encoding: "utf8" },
    );
    body.wiki_pages = parseInt(out.trim(), 10) || 146;
  } catch {
    body.wiki_pages = 146;
  }

  db.close();
  return body;
}

router.get("/stats", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Cache-Control", "public, max-age=60");

  const now = Date.now();
  if (_statsCache.body && now - _statsCache.at < CACHE_TTL_MS) {
    return res.json(_statsCache.body);
  }

  try {
    const body = computeShieldStats();
    body.timestamp = new Date().toISOString();
    _statsCache = { at: now, body };
    res.json(body);
  } catch (err) {
    res
      .status(500)
      .json({ error: "stats_unavailable", message: err.message });
  }
});

router.options("/stats", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Max-Age", "86400");
  res.sendStatus(204);
});

module.exports = router;
