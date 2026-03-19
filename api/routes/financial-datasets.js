/**
 * Financial Datasets API Routes — Intel Source #24
 * 5 endpoints under /api/v1/intel/financial-datasets/*
 *
 * Buzz BD Agent v7.6.0 | MiroFish Integration
 */

const express = require('express');
const router = express.Router();
const { getDB } = require('../db');
const {
  getCryptoPrice,
  getHistoricalCryptoPrices,
  getAvailableCryptoTickers,
  getCompanyNews,
  healthCheck,
} = require('../intel/financial-datasets-mcp');

/**
 * Check DB cache before hitting API
 */
function getCached(db, ticker, dataType) {
  try {
    const row = db.prepare(
      `SELECT data FROM financial_datasets_cache
       WHERE ticker = ? AND data_type = ? AND expires_at > datetime('now')`
    ).get(ticker, dataType);
    return row ? JSON.parse(row.data) : null;
  } catch { return null; }
}

function setCache(db, ticker, dataType, data, ttlMinutes) {
  try {
    db.prepare(
      `INSERT OR REPLACE INTO financial_datasets_cache (ticker, data_type, data, fetched_at, expires_at)
       VALUES (?, ?, ?, datetime('now'), datetime('now', '+${Math.floor(ttlMinutes)} minutes'))`
    ).run(ticker, dataType, JSON.stringify(data));
  } catch (e) {
    console.error('[FinDatasets] Cache write error:', e.message);
  }
}

// GET /crypto/:ticker — current price snapshot (cache 5 min)
router.get('/crypto/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const db = getDB();
    const cached = getCached(db, ticker, 'price');
    if (cached) return res.json({ success: true, cached: true, data: cached });

    const data = await getCryptoPrice(ticker);
    if (!data) return res.status(502).json({ success: false, error: 'Upstream API unavailable' });

    setCache(db, ticker, 'price', data, 5);
    res.json({ success: true, cached: false, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /crypto/:ticker/history — historical OHLCV (cache 60 min)
router.get('/crypto/:ticker/history', async (req, res) => {
  try {
    const { ticker } = req.params;
    const { start, end, interval } = req.query;
    if (!start || !end) {
      return res.status(400).json({ success: false, error: 'start and end query params required (YYYY-MM-DD)' });
    }

    const db = getDB();
    const cacheKey = `history_${start}_${end}_${interval || 'day'}`;
    const cached = getCached(db, `${ticker}_${cacheKey}`, 'history');
    if (cached) return res.json({ success: true, cached: true, data: cached });

    const data = await getHistoricalCryptoPrices(ticker, start, end, interval || 'day');
    if (!data) return res.status(502).json({ success: false, error: 'Upstream API unavailable' });

    setCache(db, `${ticker}_${cacheKey}`, 'history', data, 60);
    res.json({ success: true, cached: false, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /tickers — all available crypto tickers (cache 24h)
router.get('/tickers', async (req, res) => {
  try {
    const data = await getAvailableCryptoTickers();
    if (!data) return res.status(502).json({ success: false, error: 'Upstream API unavailable' });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /news/:ticker — latest news (cache 30 min)
router.get('/news/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    const db = getDB();
    const cached = getCached(db, ticker, 'news');
    if (cached) return res.json({ success: true, cached: true, data: cached });

    const data = await getCompanyNews(ticker, limit);
    if (!data) return res.status(502).json({ success: false, error: 'Upstream API unavailable' });

    setCache(db, ticker, 'news', data, 30);
    res.json({ success: true, cached: false, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /health — API connectivity check
router.get('/health', async (req, res) => {
  const result = await healthCheck();
  res.json({ source: 'financial-datasets', source_id: 24, ...result });
});

module.exports = router;
