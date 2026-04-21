/**
 * AIXBT Intel Routes — Intel Source #34
 * GET /api/v1/intel/aixbt/signals — list signals with filters
 * GET /api/v1/intel/aixbt/signals/:token_symbol — signals for specific token
 * GET /api/v1/intel/aixbt/latest — latest 20 signals
 * POST /api/v1/intel/aixbt/scrape — manual trigger
 */

const express = require("express");
const router = express.Router();
const { getDB } = require("../db");
const { feature } = require("../lib/feature-flags");
const { runScrapeAndIngest } = require("../intel/aixbt-scraper");

// Gate all routes behind AIXBT_INTEL flag
router.use((req, res, next) => {
  if (!feature("AIXBT_INTEL")) {
    return res.status(503).json({ error: "AIXBT_INTEL feature disabled" });
  }
  next();
});

// GET /api/v1/intel/aixbt/latest
router.get("/latest", (req, res) => {
  try {
    const db = getDB();
    const signals = db
      .prepare("SELECT * FROM aixbt_signals ORDER BY scraped_at DESC LIMIT 20")
      .all();
    const stats = db
      .prepare(
        `SELECT
          COUNT(*) as total,
          SUM(CASE WHEN sentiment='BULLISH' THEN 1 ELSE 0 END) as bullish,
          SUM(CASE WHEN sentiment='BEARISH' THEN 1 ELSE 0 END) as bearish,
          SUM(CASE WHEN sentiment='NEUTRAL' THEN 1 ELSE 0 END) as neutral
         FROM aixbt_signals
         WHERE scraped_at > datetime('now', '-24 hours')`,
      )
      .get();
    res.json({ signals, stats_24h: stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/intel/aixbt/signals
router.get("/signals", (req, res) => {
  try {
    const db = getDB();
    const { limit = 20, sentiment, since } = req.query;
    let query = "SELECT * FROM aixbt_signals WHERE 1=1";
    const params = [];

    if (sentiment) {
      query += " AND sentiment = ?";
      params.push(sentiment.toUpperCase());
    }
    if (since) {
      query += " AND posted_at > ?";
      params.push(since);
    }

    query += " ORDER BY posted_at DESC LIMIT ?";
    params.push(Math.min(parseInt(limit) || 20, 100));

    const signals = db.prepare(query).all(...params);
    res.json({ signals, count: signals.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/intel/aixbt/signals/:token_symbol
router.get("/signals/:token_symbol", (req, res) => {
  try {
    const db = getDB();
    const symbol = req.params.token_symbol.toUpperCase();
    const signals = db
      .prepare(
        `SELECT * FROM aixbt_signals
         WHERE token_mentions LIKE ?
         ORDER BY posted_at DESC LIMIT 20`,
      )
      .all(`%${symbol}%`);
    res.json({ token: symbol, signals, count: signals.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/intel/aixbt/scrape — manual trigger
router.post("/scrape", async (req, res) => {
  try {
    const result = await runScrapeAndIngest();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
