/**
 * Activity Router
 * GET /activity/recent — returns recent agent activity
 */

const express = require('express');
const router = express.Router();
const { getDB } = require('../db');

router.get('/recent', (req, res) => {
  try {
    const db = getDB();
    const activities = [];

    // Recent pipeline tokens
    try {
      const tokens = db.prepare(
        'SELECT address, ticker, name, stage, score, updated_at FROM pipeline_tokens ORDER BY updated_at DESC LIMIT 10'
      ).all();
      for (const t of tokens) {
        activities.push({
          type: 'pipeline',
          ticker: t.ticker || null,
          address: t.address,
          detail: 'Stage: ' + (t.stage || 'unknown') + (t.score ? ' | Score: ' + t.score : ''),
          timestamp: t.updated_at || null,
        });
      }
    } catch {}

    // Recent listing simulations
    try {
      const sims = db.prepare(
        'SELECT token_address, consensus, recommendation, score, created_at FROM listing_simulations ORDER BY id DESC LIMIT 10'
      ).all();
      for (const s of sims) {
        activities.push({
          type: 'simulation',
          ticker: null,
          address: s.token_address,
          detail: 'Simulation: ' + (s.consensus || 'N/A') + (s.score ? ' | Score: ' + s.score : ''),
          timestamp: s.created_at || null,
        });
      }
    } catch {}

    // Sort combined by timestamp descending
    activities.sort((a, b) => {
      const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return tb - ta;
    });

    res.json({
      success: true,
      count: activities.length,
      activities,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
