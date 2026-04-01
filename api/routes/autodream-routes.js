// autoDream API routes — memory consolidation
const express = require('express');
const router = express.Router();
const { apiKeyAuth } = require('../middleware/auth');
const { runDreamCycle, scanMemoryState, identifyStaleData } = require('../services/autodream/autodream');
const { getDB } = require('../db');

router.use(apiKeyAuth);

// POST /api/v1/dream/run — trigger dream cycle manually
router.post('/run', (req, res) => {
  const result = runDreamCycle('manual');
  res.json(result);
});

// GET /api/v1/dream/scan — preview stale data without cleaning
router.get('/scan', (req, res) => {
  res.json({ memory_state: scanMemoryState(), stale_data: identifyStaleData() });
});

// GET /api/v1/dream/log — dream history
router.get('/log', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);
  try {
    const dreams = getDB().prepare(
      'SELECT id, timestamp, trigger, duration_ms, total_cleaned, db_size_kb FROM dream_log ORDER BY created_at DESC LIMIT ?'
    ).all(limit);
    res.json(dreams);
  } catch (e) {
    res.json([]); // dream_log table may not exist yet until first run
  }
});

module.exports = router;
