/**
 * Revenue Dashboard Routes — Day 32 Sprint Phase 5
 */

const express = require("express");
const router = express.Router();
const dash = require("../lib/revenue-dashboard");

router.get("/kpis", (req, res) => {
  res.json(dash.getKPIs());
});

router.get("/rollup", (req, res) => {
  const { period = "daily", date } = req.query;
  let result;
  if (period === "weekly") result = dash.getWeeklyRollup(date);
  else if (period === "monthly") result = dash.getMonthlyRollup(date);
  else result = dash.getDailyRollup(date);
  res.json({ period, ...result });
});

router.get("/top-tokens", (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const period = parseInt(req.query.period) || 30;
  const tokens = dash.getTopTokensByRevenue(limit, period);
  res.json({ count: tokens.length, period_days: period, tokens });
});

router.get("/by-chain", (req, res) => {
  const period = parseInt(req.query.period) || 30;
  const chains = dash.getRevenueByChain(period);
  res.json({ period_days: period, chains });
});

router.get("/velocity", (req, res) => {
  res.json(dash.getRevenueVelocity());
});

module.exports = router;
