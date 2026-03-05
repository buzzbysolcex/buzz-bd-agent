/**
 * Buzz BD Agent — Scoring Routes
 * 
 * GET  /api/v1/scoring/history          → Score history with filters
 * GET  /api/v1/scoring/history/:address → Score history for specific token
 * GET  /api/v1/scoring/leaderboard      → Top scored tokens
 * GET  /api/v1/scoring/stats            → Scoring analytics (avg, distribution)
 * GET  /api/v1/scoring/verdicts         → Breakdown by verdict (HOT/QUALIFIED/WATCH/SKIP)
 */

const express = require('express');
const router = express.Router();
const { getDB } = require('../db');

// ─── GET /history ────────────────────────────────────
router.get('/history', (req, res) => {
  const db = getDB();
  const { chain, verdict, depth, limit, offset } = req.query;

  let sql = 'SELECT * FROM token_scores WHERE 1=1';
  const params = [];

  if (chain) { sql += ' AND chain = ?'; params.push(chain); }
  if (verdict) { sql += ' AND verdict = ?'; params.push(verdict.toUpperCase()); }
  if (depth) { sql += ' AND depth = ?'; params.push(depth); }

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit) || 50);
  params.push(parseInt(offset) || 0);

  const scores = db.prepare(sql).all(...params);
  const total = db.prepare('SELECT COUNT(*) as count FROM token_scores').get().count;

  res.json({ total, returned: scores.length, scores });
});

// ─── GET /history/:address ───────────────────────────
router.get('/history/:address', (req, res) => {
  const db = getDB();
  const { address } = req.params;

  const scores = db.prepare(
    'SELECT * FROM token_scores WHERE contract_address = ? ORDER BY created_at DESC'
  ).all(address);

  if (scores.length === 0) {
    return res.status(404).json({ error: 'no_scores_found', address });
  }

  // Parse result_json for the latest score
  const latest = scores[0];
  let breakdown = null;
  try { breakdown = JSON.parse(latest.result_json); } catch (e) {}

  res.json({
    address,
    total_scores: scores.length,
    latest: { ...latest, breakdown },
    history: scores
  });
});

// ─── GET /leaderboard ────────────────────────────────
router.get('/leaderboard', (req, res) => {
  const db = getDB();
  const { chain, limit, period } = req.query;

  const periodMap = {
    '24h': '-1 day',
    '7d': '-7 days',
    '30d': '-30 days',
    'all': '-100 years'
  };
  const interval = periodMap[period] || '-7 days';

  let sql = `
    SELECT contract_address, chain, 
           MAX(score) as best_score, 
           COUNT(*) as times_scored,
           MAX(verdict) as latest_verdict,
           MAX(created_at) as last_scored
    FROM token_scores 
    WHERE created_at > datetime('now', ?)
  `;
  const params = [interval];
  if (chain) { sql += ' AND chain = ?'; params.push(chain); }
  sql += ' GROUP BY contract_address, chain ORDER BY best_score DESC LIMIT ?';
  params.push(parseInt(limit) || 20);

  const leaders = db.prepare(sql).all(...params);
  res.json({ period: period || '7d', count: leaders.length, leaderboard: leaders });
});

// ─── GET /stats ──────────────────────────────────────
router.get('/stats', (req, res) => {
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

  const stats = db.prepare(`
    SELECT 
      COUNT(*) as total_scores,
      ROUND(AVG(score), 1) as avg_score,
      MIN(score) as min_score,
      MAX(score) as max_score,
      ROUND(AVG(duration_ms), 0) as avg_duration_ms,
      SUM(CASE WHEN verdict = 'HOT' THEN 1 ELSE 0 END) as hot_count,
      SUM(CASE WHEN verdict = 'QUALIFIED' THEN 1 ELSE 0 END) as qualified_count,
      SUM(CASE WHEN verdict = 'WATCH' THEN 1 ELSE 0 END) as watch_count,
      SUM(CASE WHEN verdict = 'SKIP' THEN 1 ELSE 0 END) as skip_count
    FROM token_scores
    WHERE created_at > datetime('now', ?)
  `).get(interval);

  res.json({ period, stats });
});

// ─── GET /verdicts ───────────────────────────────────
router.get('/verdicts', (req, res) => {
  const db = getDB();

  const verdicts = db.prepare(`
    SELECT verdict, COUNT(*) as count, 
           ROUND(AVG(score), 1) as avg_score,
           MIN(score) as min_score, MAX(score) as max_score
    FROM token_scores 
    GROUP BY verdict 
    ORDER BY avg_score DESC
  `).all();

  res.json({ verdicts });
});

module.exports = router;
