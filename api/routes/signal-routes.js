/**
 * Signal Tracker Routes — AIBTC signal lifecycle
 * POST /api/v1/signals/filed — record signal filing + emit event
 * POST /api/v1/signals/status — update signal status from polling
 * GET  /api/v1/signals/streak — get streak info
 */

const express = require('express');
const router = express.Router();
const {
  recordSignalFiled,
  updateSignalStatus,
  getStreakInfo
} = require('../services/signals/signal-tracker');

// POST /signals/filed — record a filed signal
router.post('/filed', (req, res) => {
  const { signal_id, beat_slug, headline, pacific_date } = req.body;
  if (!signal_id || !beat_slug) {
    return res.status(400).json({ error: 'signal_id and beat_slug required' });
  }
  const result = recordSignalFiled({ signal_id, beat_slug, headline, pacific_date });
  res.json(result);
});

// POST /signals/status — update signal status (from polling)
router.post('/status', (req, res) => {
  const { signal_id, status, publisher_feedback } = req.body;
  if (!signal_id || !status) {
    return res.status(400).json({ error: 'signal_id and status required' });
  }
  const result = updateSignalStatus({ signal_id, status, publisher_feedback });
  res.json(result);
});

// GET /signals/streak — streak info
router.get('/streak', (req, res) => {
  res.json(getStreakInfo());
});

module.exports = router;
