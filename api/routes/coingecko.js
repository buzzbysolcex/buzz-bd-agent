const express = require('express');
const router = express.Router();
const cg = require('../services/coingecko-cli');

// GET /api/v1/coingecko/price/:coinId
router.get('/price/:coinId', (req, res) => {
  const result = cg.getPrice(req.params.coinId);
  res.json({ success: result.success, source: 'coingecko-cli', intel: 23, ...result });
});

// GET /api/v1/coingecko/trending
router.get('/trending', (req, res) => {
  const result = cg.getTrending();
  res.json({ success: result.success, source: 'coingecko-cli', intel: 23, ...result });
});

// GET /api/v1/coingecko/history/:coinId
router.get('/history/:coinId', (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const result = cg.getHistory(req.params.coinId, days);
  res.json({ success: result.success, source: 'coingecko-cli', intel: 23, ...result });
});

// GET /api/v1/coingecko/markets
router.get('/markets', (req, res) => {
  const total = parseInt(req.query.total) || 100;
  const result = cg.getMarkets(total);
  res.json({ success: result.success, source: 'coingecko-cli', intel: 23, ...result });
});

// GET /api/v1/coingecko/search/:query
router.get('/search/:query', (req, res) => {
  const result = cg.searchCoin(req.params.query);
  res.json({ success: result.success, source: 'coingecko-cli', intel: 23, ...result });
});

// GET /api/v1/coingecko/status
router.get('/status', (req, res) => {
  res.json(cg.getStatus());
});

module.exports = router;
