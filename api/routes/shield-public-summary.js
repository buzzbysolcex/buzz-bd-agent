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

// Apr 30 2026 fix (msg 5375 bonus): streak_days was hard-coded at 20. Compute
// from the canonical streak start date (Apr 1 2026 = Day 1) so the public
// stats card stays current without manual bumps.
const STREAK_START_MS = Date.UTC(2026, 3, 1); // 2026-04-01T00:00:00Z (April = month index 3)
function currentStreakDays() {
  return Math.max(
    1,
    Math.floor((Date.now() - STREAK_START_MS) / (24 * 3600 * 1000)) + 1,
  );
}

const STATS_STATIC = {
  audit_checks: 294,
  scoring_rules: 15,
  // streak_days is computed at request time — see currentStreakDays() injection below.
};

function computeShieldStats() {
  let db;
  try {
    db = new Database(DB_PATH, { readonly: true });
  } catch {
    return {
      ...STATS_STATIC,
      streak_days: currentStreakDays(),
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
    streak_days: currentStreakDays(),
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
      total: safeCount(db, "SELECT COUNT(*) AS c FROM feature_flags_registry"),
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
    res.status(500).json({ error: "stats_unavailable", message: err.message });
  }
});

router.options("/stats", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Max-Age", "86400");
  res.sendStatus(204);
});

// ─── /patterns/summary — drain pattern statistics for homepage threat matrix
// GET /api/v1/shield/public/patterns/summary
// Returns: severity_breakdown, total_active, categories.
// Added 2026-04-30 per Ogie msg 5375 (Noah pitch fix-1).

let _patternsCache = { at: 0, body: null };

function computePatternsSummary() {
  let db;
  try {
    db = new Database(DB_PATH, { readonly: true });
  } catch {
    return {
      severity_breakdown: { critical: 0, high: 0, medium: 0, low: 0 },
      total_active: 31,
      categories: [
        "reentrancy",
        "access_control",
        "oracle_manipulation",
        "flash_loan",
        "front_running",
        "integer_overflow",
        "unchecked_return",
        "delegatecall",
        "tx_origin",
        "selfdestruct",
        "gas_limit",
        "timestamp_dependency",
      ],
      _note: "db unavailable, static fallback",
    };
  }

  const sevRow = db
    .prepare(
      `SELECT
        SUM(CASE WHEN severity='critical' THEN 1 ELSE 0 END) AS critical,
        SUM(CASE WHEN severity='high' THEN 1 ELSE 0 END) AS high,
        SUM(CASE WHEN severity='medium' THEN 1 ELSE 0 END) AS medium,
        SUM(CASE WHEN severity='low' THEN 1 ELSE 0 END) AS low,
        COUNT(*) AS total
       FROM drain_patterns WHERE active = 1`,
    )
    .get();

  // categories = distinct prefix tokens of pattern names (best-effort)
  const cats = db
    .prepare(
      `SELECT DISTINCT lower(replace(replace(name,' ','_'),'-','_')) AS c
       FROM drain_patterns WHERE active = 1 LIMIT 50`,
    )
    .all()
    .map((r) => r.c);

  db.close();
  return {
    severity_breakdown: {
      critical: sevRow?.critical || 0,
      high: sevRow?.high || 0,
      medium: sevRow?.medium || 0,
      low: sevRow?.low || 0,
    },
    total_active: sevRow?.total || 0,
    categories: cats.length
      ? cats
      : ["reentrancy", "access_control", "oracle_manipulation", "flash_loan"],
  };
}

router.get("/patterns/summary", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Cache-Control", "public, max-age=60");
  const now = Date.now();
  if (_patternsCache.body && now - _patternsCache.at < CACHE_TTL_MS) {
    return res.json(_patternsCache.body);
  }
  try {
    const body = computePatternsSummary();
    body.timestamp = new Date().toISOString();
    _patternsCache = { at: now, body };
    res.json(body);
  } catch (err) {
    res
      .status(500)
      .json({ error: "patterns_unavailable", message: err.message });
  }
});

router.options("/patterns/summary", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.sendStatus(204);
});

// ─── /guard/distribution — wallet-guard verdict distribution
// GET /api/v1/shield/public/guard/distribution
// Returns: allow, warn, block counts + total_processed.

let _guardCache = { at: 0, body: null };

function computeGuardDistribution() {
  let db;
  try {
    db = new Database(DB_PATH, { readonly: true });
  } catch {
    return {
      allow: 0,
      warn: 0,
      block: 0,
      total_processed: 0,
      _note: "db unavailable",
    };
  }
  const row = db
    .prepare(
      `SELECT
        SUM(CASE WHEN upper(decision)='ALLOW' THEN 1 ELSE 0 END) AS allow_n,
        SUM(CASE WHEN upper(decision)='WARN' THEN 1 ELSE 0 END) AS warn_n,
        SUM(CASE WHEN upper(decision)='BLOCK' THEN 1 ELSE 0 END) AS block_n,
        COUNT(*) AS total
       FROM wallet_guard_receipts`,
    )
    .get();
  db.close();
  return {
    allow: row?.allow_n || 0,
    warn: row?.warn_n || 0,
    block: row?.block_n || 0,
    total_processed: row?.total || 0,
  };
}

router.get("/guard/distribution", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Cache-Control", "public, max-age=60");
  const now = Date.now();
  if (_guardCache.body && now - _guardCache.at < CACHE_TTL_MS) {
    return res.json(_guardCache.body);
  }
  try {
    const body = computeGuardDistribution();
    body.timestamp = new Date().toISOString();
    _guardCache = { at: now, body };
    res.json(body);
  } catch (err) {
    res.status(500).json({ error: "guard_unavailable", message: err.message });
  }
});

router.options("/guard/distribution", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.sendStatus(204);
});

// ─── /audit/sample — sample audit result for hero "SAMPLE AUDIT RESULT" card
// GET /api/v1/shield/public/audit/sample
// Returns the most recent completed pashov audit's score + severity counts.

let _auditSampleCache = { at: 0, body: null };

function computeAuditSample() {
  let db;
  try {
    db = new Database(DB_PATH, { readonly: true });
  } catch {
    return {
      score: 0,
      verdict: "CAUTION",
      severity: { critical: 0, high: 0, medium: 0, low: 0 },
      _note: "db unavailable",
    };
  }
  const row = db
    .prepare(
      `SELECT findings_count, findings_high, findings_medium, findings_low,
              verdict, buzz_score_at_audit
       FROM pashov_audits
       WHERE status = 'complete'
       ORDER BY completed_at DESC LIMIT 1`,
    )
    .get();
  db.close();
  if (!row) {
    return {
      score: 0,
      verdict: "CAUTION",
      severity: { critical: 0, high: 0, medium: 0, low: 0 },
      _note: "no completed audits yet",
    };
  }
  // findings_critical not stored; derive from findings_high split if needed
  return {
    score: row.buzz_score_at_audit || 0,
    verdict: row.verdict || "CAUTION",
    severity: {
      critical: 0,
      high: row.findings_high || 0,
      medium: row.findings_medium || 0,
      low: row.findings_low || 0,
    },
    findings_total: row.findings_count || 0,
  };
}

router.get("/audit/sample", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Cache-Control", "public, max-age=60");
  const now = Date.now();
  if (_auditSampleCache.body && now - _auditSampleCache.at < CACHE_TTL_MS) {
    return res.json(_auditSampleCache.body);
  }
  try {
    const body = computeAuditSample();
    body.timestamp = new Date().toISOString();
    _auditSampleCache = { at: now, body };
    res.json(body);
  } catch (err) {
    res
      .status(500)
      .json({ error: "audit_sample_unavailable", message: err.message });
  }
});

router.options("/audit/sample", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.sendStatus(204);
});

module.exports = router;
