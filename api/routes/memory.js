/**
 * Buzz BD Agent — Memory Routes
 * v7.3.1 | FTS5 full-text search endpoints
 *
 * GET  /api/v1/memory/search?q=...&source=...&limit=10
 * POST /api/v1/memory/index
 * GET  /api/v1/memory/stats
 */

const express = require('express');
const router = express.Router();
const { searchMemory, indexMemory, getStats } = require('../services/memory-search');

// ─── GET /memory/search ─────────────────────────────
router.get('/search', (req, res) => {
  try {
    const { q, source, limit } = req.query;
    if (!q) return res.status(400).json({ success: false, error: 'query parameter "q" is required' });
    const result = searchMemory(q, { source, limit: limit ? parseInt(limit) : 10 });
    if (result.success) res.json(result);
    else res.status(500).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /memory/index ─────────────────────────────
router.post('/index', (req, res) => {
  try {
    const { content, source } = req.body;
    if (!content) return res.status(400).json({ success: false, error: 'content is required in body' });
    const result = indexMemory(content, source);
    if (result.success) res.status(201).json(result);
    else res.status(400).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /memory/stats ──────────────────────────────
router.get('/stats', (req, res) => {
  try {
    const result = getStats();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
