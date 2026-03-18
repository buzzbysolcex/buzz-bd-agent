/**
 * Revenue Alert Routes — Day 32 Sprint Phase 6
 */

const express = require('express');
const router = express.Router();
const alerts = require('../lib/revenue-alerts');

router.get('/revenue', (req, res) => {
  const activeAlerts = alerts.runAlertCheck();
  res.json({ count: activeAlerts.length, alerts: activeAlerts });
});

router.get('/config', (req, res) => {
  res.json({
    milestones: [1000, 5000, 10000, 50000, 100000],
    daily_target: 500,
    anomaly_threshold_pct: 30,
    telegram_configured: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID)
  });
});

router.patch('/config', (req, res) => {
  res.json({ status: 'acknowledged', message: 'Alert config updates require restart' });
});

router.post('/test', async (req, res) => {
  const message = alerts.formatAlertMessage('milestone', { message: 'Test alert from Buzz Revenue System' });
  const result = await alerts.sendTelegramAlert(message);
  res.json({ status: result.sent ? 'sent' : 'failed', ...result });
});

module.exports = router;
