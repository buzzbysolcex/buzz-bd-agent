/**
 * Revenue Reporting Routes — Day 32 Sprint Phase 7
 */

const express = require('express');
const router = express.Router();
const reports = require('../lib/revenue-reports');

router.get('/daily', (req, res) => {
  const report = reports.generateDailyReport(req.query.date);
  res.json(report);
});

router.get('/weekly', (req, res) => {
  const report = reports.generateWeeklyReport(req.query.week);
  res.json(report);
});

router.get('/monthly', (req, res) => {
  const report = reports.generateMonthlyReport(req.query.month);
  res.json(report);
});

router.get('/forecast', (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const forecast = reports.forecastRevenue(days);
  res.json(forecast);
});

router.get('/executive', (req, res) => {
  const summary = reports.getExecutiveSummary();
  res.json(summary);
});

module.exports = router;
