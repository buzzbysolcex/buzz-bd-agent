/**
 * Revenue Tracking Routes — Day 32 Sprint Phase 2
 * GET  /api/v1/revenue/summary
 * GET  /api/v1/revenue/events
 * GET  /api/v1/revenue/by-token/:address
 * GET  /api/v1/revenue/by-period
 * POST /api/v1/revenue/events
 */

const express = require('express');
const router = express.Router();
const { getDB } = require('../db');

router.get('/summary', (req, res) => {
  const db = getDB();
  const now = new Date();
  const monthStart = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`;
  const yearStart = `${now.getUTCFullYear()}-01-01`;

  const total = db.prepare('SELECT COALESCE(SUM(amount_usd), 0) as total FROM revenue_events').get();
  const mtd = db.prepare('SELECT COALESCE(SUM(amount_usd), 0) as total FROM revenue_events WHERE created_at >= ?').get(monthStart);
  const ytd = db.prepare('SELECT COALESCE(SUM(amount_usd), 0) as total FROM revenue_events WHERE created_at >= ?').get(yearStart);

  const byChain = db.prepare(`
    SELECT chain, COALESCE(SUM(amount_usd), 0) as total, COUNT(*) as count
    FROM revenue_events GROUP BY chain
  `).all();

  const byType = db.prepare(`
    SELECT event_type, COALESCE(SUM(amount_usd), 0) as total, COUNT(*) as count
    FROM revenue_events GROUP BY event_type
  `).all();

  res.json({
    total_revenue_usd: total.total,
    mtd_revenue_usd: mtd.total,
    ytd_revenue_usd: ytd.total,
    by_chain: byChain,
    by_type: byType
  });
});

router.get('/events', (req, res) => {
  const db = getDB();
  const { chain, type, from, to, limit = '50', offset = '0' } = req.query;

  let sql = 'SELECT * FROM revenue_events WHERE 1=1';
  const params = [];

  if (chain) { sql += ' AND chain = ?'; params.push(chain); }
  if (type) { sql += ' AND event_type = ?'; params.push(type); }
  if (from) { sql += ' AND created_at >= ?'; params.push(from); }
  if (to) { sql += ' AND created_at <= ?'; params.push(to); }

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  const events = db.prepare(sql).all(...params);
  res.json({ count: events.length, events });
});

router.get('/by-token/:address', (req, res) => {
  const db = getDB();
  const { address } = req.params;
  const { chain } = req.query;

  let sql = 'SELECT * FROM revenue_events WHERE token_address = ?';
  const params = [address];
  if (chain) { sql += ' AND chain = ?'; params.push(chain); }
  sql += ' ORDER BY created_at DESC';

  const events = db.prepare(sql).all(...params);
  const total = events.reduce((sum, e) => sum + e.amount_usd, 0);

  res.json({ token_address: address, total_revenue_usd: total, count: events.length, events });
});

router.get('/by-period', (req, res) => {
  const db = getDB();
  const { granularity = 'day', from, to } = req.query;

  let dateExpr;
  if (granularity === 'week') {
    dateExpr = "strftime('%Y-W%W', created_at)";
  } else if (granularity === 'month') {
    dateExpr = "strftime('%Y-%m', created_at)";
  } else {
    dateExpr = "date(created_at)";
  }

  let sql = `SELECT ${dateExpr} as period, COALESCE(SUM(amount_usd), 0) as total, COUNT(*) as count FROM revenue_events WHERE 1=1`;
  const params = [];
  if (from) { sql += ' AND created_at >= ?'; params.push(from); }
  if (to) { sql += ' AND created_at <= ?'; params.push(to); }
  sql += ` GROUP BY period ORDER BY period DESC`;

  const periods = db.prepare(sql).all(...params);
  res.json({ granularity, count: periods.length, periods });
});

router.post('/events', (req, res) => {
  const db = getDB();
  const { token_address, chain, token_ticker, event_type, amount_usd, amount_sol, source, pipeline_stage, metadata } = req.body;

  if (!token_address || !chain || !event_type || amount_usd == null) {
    return res.status(400).json({ error: 'missing_fields', code: 'MISSING_REQUIRED_FIELDS' });
  }

  const result = db.prepare(`
    INSERT INTO revenue_events (token_address, chain, token_ticker, event_type, amount_usd, amount_sol, source, pipeline_stage, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(token_address, chain, token_ticker || null, event_type, amount_usd, amount_sol || null, source || null, pipeline_stage || null, JSON.stringify(metadata || {}));

  res.status(201).json({ id: result.lastInsertRowid, status: 'created' });
});

module.exports = router;
