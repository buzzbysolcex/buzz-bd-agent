/**
 * GitHub PR Monitor Routes
 * GET  /api/v1/github/tracked — list tracked PRs
 * POST /api/v1/github/track — add a PR to watch
 * POST /api/v1/github/check — manually trigger a check (also called by cron)
 */

const express = require('express');
const router = express.Router();
const {
  trackPR,
  getTrackedPRs,
  checkAllTracked,
  formatForWarRoom
} = require('../services/github/pr-monitor');

router.get('/tracked', (req, res) => {
  res.json({ tracked: getTrackedPRs() });
});

router.post('/track', (req, res) => {
  const { repo, pr_number } = req.body;
  if (!repo || !pr_number) {
    return res.status(400).json({ error: 'repo and pr_number required' });
  }
  res.json(trackPR(repo, parseInt(pr_number)));
});

router.post('/check', async (req, res) => {
  const result = await checkAllTracked();
  if (result.findings && result.findings.length > 0) {
    // Format findings for War Room
    const wrMessages = result.findings
      .filter(f => f.new_comments)
      .map(formatForWarRoom);

    // Send to War Room via telegram-notify if available
    try {
      const { sendTelegram } = require('../lib/telegram-notify');
      for (const msg of wrMessages) {
        await sendTelegram(msg);
      }
    } catch (e) {
      console.error('[github-routes] War Room notify error:', e.message);
    }
  }
  res.json(result);
});

module.exports = router;
