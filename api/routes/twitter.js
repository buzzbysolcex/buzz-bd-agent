/**
 * Buzz BD Agent — Twitter Bot Routes
 *
 * GET  /api/v1/twitter/status           → Bot status + rate limits
 * GET  /api/v1/twitter/stats            → Reply count, engagement metrics
 * GET  /api/v1/twitter/replies          → Recent reply history
 * GET  /api/v1/twitter/leads            → Leads captured via Twitter
 * GET  /api/v1/twitter/routes           → Route breakdown (SCAN/LIST/DEPLOY/TOKEN)
 * POST /api/v1/twitter/brain/scan       → Trigger Twitter Brain scan manually
 * GET  /api/v1/twitter/brain/status     → Twitter Brain status + config
 * GET  /api/v1/twitter/brain/history    → Twitter Brain scan history
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

// ═════════════════════════════════════════════════════
// TWITTER BRAIN — v7.4.0 Autonomous BD Scanning
// ═════════════════════════════════════════════════════

const { executeTwitterBrainScan } = require('../cron/twitter-brain-scan');
const {
  TWITTER_BRAIN_ENABLED,
  MAX_REPLIES_DAY: TB_MAX_REPLIES,
  TWEET_AUTO,
  SCAN_KEYWORDS,
} = require('../services/twitter-brain');

// ─── POST /brain/scan — Trigger Twitter Brain scan manually ───
router.post('/brain/scan', async (req, res) => {
  try {
    const requestId = `TB-API-${Date.now()}`;
    const results = await executeTwitterBrainScan({ requestId });
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'twitter_brain_error', message: err.message });
  }
});

// ─── GET /brain/status — Twitter Brain config + status ────────
router.get('/brain/status', (req, res) => {
  const dailyCount = readJSON(path.join(TWITTER_DATA_DIR, 'daily-count.json'), { date: null, count: 0 });
  const today = new Date().toISOString().slice(0, 10);
  const repliesSentToday = dailyCount.date === today ? dailyCount.count : 0;

  const history = readJSON(path.join(TWITTER_DATA_DIR, 'scan-history.json'), []);
  const lastScan = history.length > 0 ? history[history.length - 1] : null;

  res.json({
    enabled: TWITTER_BRAIN_ENABLED,
    tweet_auto: TWEET_AUTO,
    max_replies_day: TB_MAX_REPLIES,
    replies_sent_today: repliesSentToday,
    replies_remaining: Math.max(0, TB_MAX_REPLIES - repliesSentToday),
    scan_interval: 'every 2 hours (0 */2 * * *)',
    keywords: SCAN_KEYWORDS,
    total_scans: history.length,
    last_scan: lastScan,
    api_keys_configured: {
      grok: !!process.env.GROK_API_KEY || !!process.env.XAI_API_KEY,
      serper: !!process.env.SERPER_API_KEY,
      x_api_bearer: !!process.env.X_API_BEARER_TOKEN,
      x_api_key: !!process.env.X_API_KEY,
    },
  });
});

// ─── GET /brain/history — Twitter Brain scan history ──────────
router.get('/brain/history', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const history = readJSON(path.join(TWITTER_DATA_DIR, 'scan-history.json'), []);
  const recent = history.slice(-limit).reverse();

  res.json({
    total: history.length,
    returned: recent.length,
    scans: recent,
  });
});

module.exports = router;
