/**
 * Buzz BD Agent — Token Pipeline Routes
 * 
 * GET  /api/v1/pipeline                          → Full pipeline view
 * GET  /api/v1/pipeline/stats                    → Pipeline funnel metrics
 * GET  /api/v1/pipeline/stage/:stage             → Tokens at specific stage
 * POST /api/v1/pipeline/tokens                   → Add token to pipeline
 * GET  /api/v1/pipeline/tokens/:address          → Get token detail
 * PATCH /api/v1/pipeline/tokens/:address         → Update token
 * POST /api/v1/pipeline/tokens/:address/advance  → Move to next stage
 * POST /api/v1/pipeline/tokens/:address/reject   → Reject token
 * POST /api/v1/pipeline/tokens/:address/notes    → Add note
 */

const express = require('express');
const router = express.Router();
const { getDB } = require('../db');

const STAGES = [
  'discovered', 'scanned', 'scored', 'prospect', 'contacted',
  'negotiating', 'approved', 'listed', 'rejected'
];

// ─── GET / ───────────────────────────────────────────
router.get('/', (req, res) => {
  const db = getDB();
  const { chain, stage, min_score, limit } = req.query;

  let sql = 'SELECT * FROM pipeline_tokens WHERE 1=1';
  const params = [];

  if (chain) { sql += ' AND chain = ?'; params.push(chain); }
  if (stage) { sql += ' AND stage = ?'; params.push(stage); }
  if (min_score) { sql += ' AND score >= ?'; params.push(parseInt(min_score)); }

  sql += ' ORDER BY updated_at DESC';
  if (limit) { sql += ' LIMIT ?'; params.push(parseInt(limit)); }

  const tokens = db.prepare(sql).all(...params);
  res.json({ count: tokens.length, tokens });
});

// ─── GET /stats ──────────────────────────────────────
router.get('/stats', (req, res) => {
  const db = getDB();

  const byStage = db.prepare(`
    SELECT stage, COUNT(*) as count, AVG(score) as avg_score
    FROM pipeline_tokens GROUP BY stage
  `).all();

  const byChain = db.prepare(`
    SELECT chain, COUNT(*) as count FROM pipeline_tokens GROUP BY chain
  `).all();

  const recent = db.prepare(`
    SELECT COUNT(*) as count FROM pipeline_tokens 
    WHERE created_at > datetime('now', '-1 day')
  `).get();

  const total = db.prepare('SELECT COUNT(*) as count FROM pipeline_tokens').get();

  // Conversion funnel
  const funnel = {};
  byStage.forEach(s => { funnel[s.stage] = { count: s.count, avg_score: s.avg_score ? Math.round(s.avg_score) : null }; });

  res.json({
    total: total.count,
    added_24h: recent.count,
    by_stage: funnel,
    by_chain: byChain,
    stages: STAGES
  });
});

// ─── GET /stage/:stage ───────────────────────────────
router.get('/stage/:stage', (req, res) => {
  if (!STAGES.includes(req.params.stage)) {
    return res.status(400).json({ error: 'invalid_stage', valid_stages: STAGES });
  }

  const db = getDB();
  const tokens = db.prepare(
    'SELECT * FROM pipeline_tokens WHERE stage = ? ORDER BY score DESC, updated_at DESC'
  ).all(req.params.stage);

  res.json({ stage: req.params.stage, count: tokens.length, tokens });
});

// ─── POST /tokens ────────────────────────────────────
router.post('/tokens', (req, res) => {
  const { address, chain, ticker, name, source, score, score_breakdown } = req.body;

  if (!address) {
    return res.status(400).json({ error: 'missing_field', message: 'address is required' });
  }

  const db = getDB();

  try {
    const result = db.prepare(`
      INSERT INTO pipeline_tokens (address, chain, ticker, name, source, score, score_breakdown)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      address,
      chain || 'solana',
      ticker || null,
      name || null,
      source || 'manual',
      score || null,
      score_breakdown ? JSON.stringify(score_breakdown) : null
    );

    const token = db.prepare('SELECT * FROM pipeline_tokens WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ message: 'Token added to pipeline', token });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ error: 'duplicate', message: `Token ${address} on ${chain || 'solana'} already exists` });
    }
    throw err;
  }
});

// ─── GET /tokens/:address ────────────────────────────
router.get('/tokens/:address', (req, res) => {
  const db = getDB();
  const chain = req.query.chain || 'solana';
  const token = db.prepare(
    'SELECT * FROM pipeline_tokens WHERE address = ? AND chain = ?'
  ).get(req.params.address, chain);

  if (!token) {
    return res.status(404).json({ error: 'not_found' });
  }

  res.json(token);
});

// ─── PATCH /tokens/:address ──────────────────────────
router.patch('/tokens/:address', (req, res) => {
  const db = getDB();
  const chain = req.query.chain || 'solana';
  const { stage, score, score_breakdown, ticker, name, notes, assigned_to } = req.body;

  const updates = [];
  const params = [];

  if (stage) {
    if (!STAGES.includes(stage)) {
      return res.status(400).json({ error: 'invalid_stage', valid_stages: STAGES });
    }
    updates.push('stage = ?'); params.push(stage);
  }
  if (score !== undefined) { updates.push('score = ?'); params.push(score); }
  if (score_breakdown) { updates.push('score_breakdown = ?'); params.push(JSON.stringify(score_breakdown)); }
  if (ticker) { updates.push('ticker = ?'); params.push(ticker); }
  if (name) { updates.push('name = ?'); params.push(name); }
  if (notes) { updates.push('notes = ?'); params.push(notes); }
  if (assigned_to) { updates.push('assigned_to = ?'); params.push(assigned_to); }

  updates.push("updated_at = datetime('now')");
  params.push(req.params.address, chain);

  const result = db.prepare(
    `UPDATE pipeline_tokens SET ${updates.join(', ')} WHERE address = ? AND chain = ?`
  ).run(...params);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'not_found' });
  }

  const token = db.prepare(
    'SELECT * FROM pipeline_tokens WHERE address = ? AND chain = ?'
  ).get(req.params.address, chain);

  res.json({ message: 'Token updated', token });
});

// ─── POST /tokens/:address/advance ───────────────────
router.post('/tokens/:address/advance', (req, res) => {
  const db = getDB();
  const chain = req.query.chain || 'solana';

  const token = db.prepare(
    'SELECT * FROM pipeline_tokens WHERE address = ? AND chain = ?'
  ).get(req.params.address, chain);

  if (!token) {
    return res.status(404).json({ error: 'not_found' });
  }

  const currentIdx = STAGES.indexOf(token.stage);
  if (currentIdx === -1 || currentIdx >= STAGES.length - 2) {
    return res.status(400).json({
      error: 'cannot_advance',
      message: `Token at stage '${token.stage}' cannot be advanced`,
      current_stage: token.stage
    });
  }

  // Skip 'rejected' — advance goes to next non-terminal stage
  let nextStage = STAGES[currentIdx + 1];
  if (nextStage === 'rejected') nextStage = STAGES[currentIdx]; // stay put

  db.prepare(
    "UPDATE pipeline_tokens SET stage = ?, updated_at = datetime('now') WHERE address = ? AND chain = ?"
  ).run(nextStage, req.params.address, chain);

  res.json({
    message: `Token advanced: ${token.stage} → ${nextStage}`,
    previous_stage: token.stage,
    new_stage: nextStage
  });
});

// ─── POST /tokens/:address/reject ────────────────────
router.post('/tokens/:address/reject', (req, res) => {
  const db = getDB();
  const chain = req.query.chain || 'solana';
  const { reason } = req.body;

  const result = db.prepare(`
    UPDATE pipeline_tokens 
    SET stage = 'rejected', notes = COALESCE(notes || ' | REJECTED: ', '') || ?, updated_at = datetime('now')
    WHERE address = ? AND chain = ?
  `).run(reason || 'No reason provided', req.params.address, chain);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'not_found' });
  }

  res.json({ message: 'Token rejected', reason });
});

module.exports = router;
