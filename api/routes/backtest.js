/**
 * Backtest Routes — Hedge Brain backtester endpoints
 *
 * POST /api/v1/backtest/run           → Trigger backtest
 * GET  /api/v1/backtest/latest        → Latest backtest summary
 * GET  /api/v1/backtest/history       → All backtest runs
 * GET  /api/v1/backtest/agent/:name   → Accuracy for specific agent/persona
 *
 * Buzz BD Agent v7.4.0 | Hedge Brain — Section 13
 */

const express = require('express');
const router = express.Router();

module.exports = function createBacktestRoutes(db) {
  const {
    runBacktest,
    getLatestSummary,
    getSummaryHistory,
    getAgentAccuracy,
  } = require('../services/backtester');

  // ─── POST /run — Trigger backtest ─────────────────────
  router.post('/run', async (req, res) => {
    const daysBack = parseInt(req.body.days_back) || 7;
    const checkAfterDays = parseInt(req.body.check_after_days) || 3;

    try {
      const results = await runBacktest(db, { daysBack, checkAfterDays });
      res.json(results);
    } catch (err) {
      res.status(500).json({ error: 'backtest_error', message: err.message });
    }
  });

  // ─── GET /latest — Latest backtest summary ────────────
  router.get('/latest', (req, res) => {
    try {
      const summary = getLatestSummary(db);
      if (!summary) {
        return res.json({ message: 'No backtest runs yet', summary: null });
      }
      res.json({ summary });
    } catch (err) {
      res.status(500).json({ error: 'query_error', message: err.message });
    }
  });

  // ─── GET /history — All backtest runs ─────────────────
  router.get('/history', (req, res) => {
    const limit = parseInt(req.query.limit) || 20;

    try {
      const summaries = getSummaryHistory(db, limit);
      res.json({
        total: summaries.length,
        summaries,
      });
    } catch (err) {
      res.status(500).json({ error: 'query_error', message: err.message });
    }
  });

  // ─── GET /agent/:name — Agent/persona accuracy ───────
  router.get('/agent/:name', (req, res) => {
    const { name } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    try {
      const accuracy = getAgentAccuracy(db, name, limit);
      res.json(accuracy);
    } catch (err) {
      res.status(500).json({ error: 'query_error', message: err.message });
    }
  });

  return router;
};
