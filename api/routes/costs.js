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
  const db = getDB();
  const dailyCap = 10.00;
  const today = new Date().toISOString().slice(0, 10);
  let dailyTotal = 0, callsMinimax = 0, callsBankr = 0, totalCalls = 0;

  // Primary source: llm_costs table (populated by LLM proxy on every call)
  try {
    const row = db.prepare(`
      SELECT
        COALESCE(SUM(cost_usd), 0) as daily_total,
        COUNT(*) as total_calls,
        COALESCE(SUM(CASE WHEN model LIKE '%MiniMax%' OR model LIKE '%minimax%' THEN 1 ELSE 0 END), 0) as calls_minimax,
        COALESCE(SUM(CASE WHEN model LIKE '%bankr%' OR model LIKE '%gpt-5%' OR model LIKE '%gemini%' THEN 1 ELSE 0 END), 0) as calls_bankr,
        COALESCE(SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END), 0) as success_calls,
        COALESCE(SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END), 0) as error_calls
      FROM llm_costs WHERE date(timestamp) = date('now')
    `).get();
    dailyTotal = row.daily_total || 0;
    callsMinimax = row.calls_minimax || 0;
    callsBankr = row.calls_bankr || 0;
    totalCalls = row.total_calls || 0;
  } catch (err) {
    console.error("[costs] llm_costs read error:", err.message);
  }

  // Per-agent breakdown for Sentinel/Telegram
  let byAgent = {};
  try {
    const agents = db.prepare(`
      SELECT caller, COUNT(*) as calls, COALESCE(SUM(cost_usd), 0) as cost
      FROM llm_costs WHERE date(timestamp) = date('now')
      GROUP BY caller ORDER BY cost DESC
    `).all();
    for (const a of agents) byAgent[a.caller] = { calls: a.calls, cost: Math.round(a.cost * 1_000_000) / 1_000_000 };
  } catch (e) {}

  // Write to cost-tracker.json for Sentinel compatibility
  try {
    const trackerPath = path.join(process.env.BUZZ_DATA_DIR || "/data", "workspace/memory/cost-tracker.json");
    const t = readCostTracker();
    t.date = today;
    t.daily_total = Math.round(dailyTotal * 1_000_000) / 1_000_000;
    t.calls_minimax = callsMinimax;
    t.calls_bankr_fallback = callsBankr;
    t.alert_70pct_sent = dailyTotal >= dailyCap * 0.7;
    t.alert_cap_sent = dailyTotal >= dailyCap;
    t.by_agent = byAgent;
    fs.writeFileSync(trackerPath, JSON.stringify(t, null, 2));
  } catch (e) {}

  res.json({
    date: today,
    daily_total: Math.round(dailyTotal * 1_000_000) / 1_000_000,
    daily_cap: dailyCap,
    remaining: Math.max(0, Math.round((dailyCap - dailyTotal) * 1_000_000) / 1_000_000),
    pct_used: dailyCap > 0 ? Math.round((dailyTotal / dailyCap) * 10000) / 100 : 0,
    throttled: dailyTotal >= dailyCap,
    calls_minimax: callsMinimax,
    calls_bankr: callsBankr,
    total_calls: totalCalls,
  });
});

// ─── GET /by-agent — Per-agent cost breakdown ────────
router.get('/by-agent', (req, res) => {
  const db = getDB();
  const today = new Date().toISOString().slice(0, 10);
  const period = req.query.period || 'today';
  const dateFilter = period === 'today' ? "date(timestamp) = date('now')" :
                     period === '7d' ? "timestamp >= datetime('now', '-7 days')" :
                     "timestamp >= datetime('now', '-30 days')";

  try {
    const agents = db.prepare(`
      SELECT
        caller as agent,
        COUNT(*) as total_calls,
        COALESCE(SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END), 0) as success_calls,
        COALESCE(SUM(prompt_tokens), 0) as total_tokens_in,
        COALESCE(SUM(completion_tokens), 0) as total_tokens_out,
        COALESCE(SUM(cost_usd), 0) as total_cost,
        ROUND(COALESCE(SUM(cost_usd), 0) / MAX(COUNT(*), 1), 8) as avg_cost_per_call
      FROM llm_costs
      WHERE ${dateFilter}
      GROUP BY caller
      ORDER BY total_cost DESC
    `).all();

    const totals = db.prepare(`
      SELECT COALESCE(SUM(cost_usd), 0) as cost, COUNT(*) as calls
      FROM llm_costs WHERE ${dateFilter}
    `).get();

    res.json({
      date: today,
      period,
      total_cost: Math.round((totals.cost || 0) * 1_000_000) / 1_000_000,
      total_calls: totals.calls || 0,
      agents: agents.map(a => ({
        agent: a.agent,
        calls: a.total_calls,
        success: a.success_calls,
        cost: Math.round(a.total_cost * 1_000_000) / 1_000_000,
        avg: Math.round(a.avg_cost_per_call * 1_000_000) / 1_000_000,
        tokens_in: a.total_tokens_in,
        tokens_out: a.total_tokens_out,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'query_error', message: err.message });
  }
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
