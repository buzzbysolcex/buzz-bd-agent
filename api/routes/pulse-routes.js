// PULSE Engine API routes — internal use + War Room
const express = require('express');
const router = express.Router();
const { apiKeyAuth } = require('../middleware/auth');
const { getDB } = require('../db');

router.use(apiKeyAuth);

// GET /api/v1/pulse/status — current engine state + persistent state
router.get('/status', (req, res) => {
  const lastObs = getDB().prepare(
    'SELECT * FROM observation_log ORDER BY id DESC LIMIT 1'
  ).get();

  const stats = getDB().prepare(`
    SELECT
      COUNT(*) as total_ticks,
      SUM(CASE WHEN decision = 'ACT' THEN 1 ELSE 0 END) as act_count,
      SUM(CASE WHEN decision = 'SLEEP' THEN 1 ELSE 0 END) as sleep_count
    FROM observation_log
    WHERE created_at > datetime('now', '-24 hours')
  `).get();

  // Persistent state from pulse_state table
  const state = {};
  const rows = getDB().prepare('SELECT key, value, updated_at FROM pulse_state').all();
  for (const row of rows) {
    state[row.key] = { value: row.value, updated_at: row.updated_at };
  }

  res.json({ persistent_state: state, last_observation: lastObs, stats_24h: stats });
});

// GET /api/v1/pulse/log — observation history
router.get('/log', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const decision = req.query.decision;
  let query = 'SELECT * FROM observation_log';
  const params = [];
  if (decision) {
    query += ' WHERE decision = ?';
    params.push(decision);
  }
  query += ' ORDER BY id DESC LIMIT ?';
  params.push(limit);
  res.json(getDB().prepare(query).all(...params));
});

// POST /api/v1/pulse/force-tick — manual tick (War Room trigger)
router.post('/force-tick', async (req, res) => {
  const { evaluateTick } = require('../services/pulse/pulse-engine');
  const result = await evaluateTick();
  res.json(result);
});

module.exports = router;
