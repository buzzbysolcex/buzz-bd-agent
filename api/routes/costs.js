/**
 * Buzz BD Agent — Cost Tracking Routes
 * 
 * GET  /api/v1/costs                → Total spend summary
 * GET  /api/v1/costs/by-model       → Per-model breakdown
 * GET  /api/v1/costs/by-agent       → Per sub-agent breakdown
 * GET  /api/v1/costs/trends         → Daily/weekly spend trends
 * POST /api/v1/costs/log            → Log a cost event
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { getDB } = require('../db');

// ─── Helper: read cost-tracker.json ─────────────
function readCostTracker() {
  const base = process.env.BUZZ_DATA_DIR || '/data';
  const trackerPath = path.join(base, 'workspace/memory/cost-tracker.json');
  try {
    return JSON.parse(fs.readFileSync(trackerPath, 'utf8'));
  } catch {
    return {
      date: new Date().toISOString().slice(0, 10),
      daily_total: 0,
      calls_minimax: 0,
      calls_bankr_fallback: 0,
      alert_70pct_sent: false,
      alert_cap_sent: false,
      by_agent: {}
    };
  }
}

// ─── GET /summary ───────────────────────────────
router.get('/summary', (req, res) => {
  const tracker = readCostTracker();
  const dailyCap = 10.00;
  const dailyTotal = tracker.daily_total || 0;

  res.json({
    date: tracker.date,
    daily_total: dailyTotal,
    daily_cap: dailyCap,
    remaining: Math.max(0, dailyCap - dailyTotal),
    pct_used: dailyCap > 0 ? Math.round((dailyTotal / dailyCap) * 10000) / 100 : 0,
    throttled: tracker.alert_cap_sent || dailyTotal >= dailyCap,
    calls_minimax: tracker.calls_minimax || 0,
    calls_bankr: tracker.calls_bankr_fallback || 0
  });
});

// ─── GET / ───────────────────────────────────────────
router.get('/', (req, res) => {
  const db = getDB();
  const period = req.query.period || '24h';

  const periodMap = {
    '1h': '-1 hour',
    '24h': '-1 day',
    '7d': '-7 days',
    '30d': '-30 days',
    'all': '-100 years'
  };

  const interval = periodMap[period] || '-1 day';

  const summary = db.prepare(`
    SELECT 
      COUNT(*) as total_requests,
      SUM(input_tokens) as total_input_tokens,
      SUM(output_tokens) as total_output_tokens,
      SUM(input_tokens + output_tokens) as total_tokens,
      ROUND(SUM(cost_usd), 4) as total_cost_usd,
      ROUND(AVG(duration_ms), 0) as avg_duration_ms
    FROM cost_logs 
    WHERE created_at > datetime('now', ?)
  `).get(interval);

  res.json({ period, ...summary });
});

// ─── GET /by-model ───────────────────────────────────
router.get('/by-model', (req, res) => {
  const db = getDB();
  const period = req.query.period || '24h';
  const periodMap = { '1h': '-1 hour', '24h': '-1 day', '7d': '-7 days', '30d': '-30 days', 'all': '-100 years' };
  const interval = periodMap[period] || '-1 day';

  const models = db.prepare(`
    SELECT 
      model,
      COUNT(*) as requests,
      SUM(input_tokens) as input_tokens,
      SUM(output_tokens) as output_tokens,
      ROUND(SUM(cost_usd), 4) as cost_usd,
      ROUND(AVG(duration_ms), 0) as avg_ms
    FROM cost_logs 
    WHERE created_at > datetime('now', ?)
    GROUP BY model
    ORDER BY cost_usd DESC
  `).all(interval);

  res.json({ period, models });
});

// ─── GET /by-agent ───────────────────────────────────
router.get('/by-agent', (req, res) => {
  const tracker = readCostTracker();
  const byAgent = tracker.by_agent || {};

  const agents = Object.entries(byAgent).map(([name, cost]) => ({ name, cost }));

  res.json({ period: tracker.date, agents });
});

// ─── GET /trends ─────────────────────────────────────
router.get('/trends', (req, res) => {
  const db = getDB();
  const granularity = req.query.granularity || 'daily';

  let groupBy, interval;
  if (granularity === 'hourly') {
    groupBy = "strftime('%Y-%m-%d %H:00', created_at)";
    interval = '-2 days';
  } else if (granularity === 'daily') {
    groupBy = "date(created_at)";
    interval = '-30 days';
  } else {
    groupBy = "strftime('%Y-W%W', created_at)";
    interval = '-90 days';
  }

  const trends = db.prepare(`
    SELECT 
      ${groupBy} as period,
      COUNT(*) as requests,
      SUM(input_tokens + output_tokens) as tokens,
      ROUND(SUM(cost_usd), 4) as cost_usd
    FROM cost_logs 
    WHERE created_at > datetime('now', ?)
    GROUP BY ${groupBy}
    ORDER BY period ASC
  `).all(interval);

  res.json({ granularity, data: trends });
});

// ─── POST /log ───────────────────────────────────────
router.post('/log', (req, res) => {
  const { agent_name, model, operation, input_tokens, output_tokens, cost_usd, duration_ms, metadata } = req.body;

  if (!agent_name || !model) {
    return res.status(400).json({ error: 'missing_fields', message: 'agent_name and model are required' });
  }

  const db = getDB();
  const result = db.prepare(`
    INSERT INTO cost_logs (agent_name, model, operation, input_tokens, output_tokens, cost_usd, duration_ms, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    agent_name, model,
    operation || null,
    input_tokens || 0,
    output_tokens || 0,
    cost_usd || 0,
    duration_ms || null,
    metadata ? JSON.stringify(metadata) : null
  );

  res.status(201).json({ message: 'Cost logged', id: result.lastInsertRowid });
});

module.exports = router;
