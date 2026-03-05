/**
 * Buzz BD Agent — Twitter Bot Routes
 * 
 * GET  /api/v1/twitter/status           → Bot status + rate limits
 * GET  /api/v1/twitter/stats            → Reply count, engagement metrics
 * GET  /api/v1/twitter/replies          → Recent reply history
 * GET  /api/v1/twitter/leads            → Leads captured via Twitter
 * GET  /api/v1/twitter/routes           → Route breakdown (SCAN/LIST/DEPLOY/TOKEN)
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const TWITTER_DATA_DIR = process.env.TWITTER_DATA_DIR || '/data/workspace/twitter-bot';
const MAX_REPLIES_DAY = parseInt(process.env.MAX_REPLIES_DAY || '12');

// Helper to safely read JSON file
function readJSON(filepath, fallback) {
  try {
    if (fs.existsSync(filepath)) {
      return JSON.parse(fs.readFileSync(filepath, 'utf8'));
    }
  } catch (e) {}
  return fallback;
}

// ─── GET /status ─────────────────────────────────────
router.get('/status', (req, res) => {
  const dailyCount = readJSON(path.join(TWITTER_DATA_DIR, 'daily-count.json'), { date: null, count: 0 });
  const today = new Date().toISOString().slice(0, 10);
  const repliesSent = dailyCount.date === today ? dailyCount.count : 0;

  res.json({
    bot_version: '3.1-final',
    status: 'active',
    account: '@BuzzBySolCex',
    user_id: process.env.X_BOT_USER_ID || '2018012888196370432',
    rate_limits: {
      max_replies_day: MAX_REPLIES_DAY,
      replies_sent_today: repliesSent,
      remaining: Math.max(0, MAX_REPLIES_DAY - repliesSent),
      scan_interval_min: 15,
      rate_limit_between_replies_sec: 30
    },
    routes: ['SCAN', 'LIST', 'DEPLOY', 'TOKEN'],
    api_configured: !!process.env.X_API_KEY
  });
});

// ─── GET /stats ──────────────────────────────────────
router.get('/stats', (req, res) => {
  const history = readJSON(path.join(TWITTER_DATA_DIR, 'scan-history.json'), []);
  const leads = readJSON(path.join(TWITTER_DATA_DIR, 'twitter-leads.json'), []);
  const deploys = readJSON(path.join(TWITTER_DATA_DIR, 'twitter-deploys.json'), []);

  const today = new Date().toISOString().slice(0, 10);
  const todayScans = history.filter(h => h.timestamp?.startsWith(today));

  res.json({
    total_scans: history.length,
    today_scans: todayScans.length,
    total_leads: leads.length,
    total_deploys: deploys.length,
    last_scan: history.length > 0 ? history[history.length - 1] : null
  });
});

// ─── GET /replies ────────────────────────────────────
router.get('/replies', (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const history = readJSON(path.join(TWITTER_DATA_DIR, 'scan-history.json'), []);

  const recent = history.slice(-limit).reverse();
  res.json({ count: recent.length, replies: recent });
});

// ─── GET /leads ──────────────────────────────────────
router.get('/leads', (req, res) => {
  const leads = readJSON(path.join(TWITTER_DATA_DIR, 'twitter-leads.json'), []);
  const limit = parseInt(req.query.limit) || 50;

  const recent = leads.slice(-limit).reverse();
  res.json({ count: leads.length, returned: recent.length, leads: recent });
});

// ─── GET /routes ─────────────────────────────────────
router.get('/routes', (req, res) => {
  const history = readJSON(path.join(TWITTER_DATA_DIR, 'scan-history.json'), []);

  const routeCounts = { SCAN: 0, LIST: 0, DEPLOY: 0, TOKEN: 0, OTHER: 0 };
  history.forEach(h => {
    const route = (h.route || 'OTHER').toUpperCase();
    if (routeCounts[route] !== undefined) routeCounts[route]++;
    else routeCounts.OTHER++;
  });

  res.json({
    total: history.length,
    routes: routeCounts,
    funnel: {
      scan_to_list_rate: history.length > 0 
        ? `${((routeCounts.LIST / Math.max(1, routeCounts.SCAN)) * 100).toFixed(1)}%` 
        : '0%',
      scan_to_deploy_rate: history.length > 0 
        ? `${((routeCounts.DEPLOY / Math.max(1, routeCounts.SCAN)) * 100).toFixed(1)}%`
        : '0%'
    }
  });
});

module.exports = router;
