/**
 * Buzz BD Agent — Webhook Routes
 * 
 * GET    /api/v1/webhooks                → List registered webhooks
 * POST   /api/v1/webhooks                → Register new webhook
 * DELETE /api/v1/webhooks/:id            → Remove webhook
 * GET    /api/v1/webhooks/:id/deliveries → Delivery history
 * POST   /api/v1/webhooks/test           → Send test event
 */

const express = require('express');
const router = express.Router();
const { getDB } = require('../db');
const crypto = require('crypto');

// ─── GET / ───────────────────────────────────────────
router.get('/', (req, res) => {
  const db = getDB();
  const webhooks = db.prepare('SELECT id, url, events, active, created_at FROM webhooks ORDER BY created_at DESC').all();

  res.json({
    count: webhooks.length,
    webhooks: webhooks.map(w => ({
      ...w,
      events: w.events ? w.events.split(',') : []
    }))
  });
});

// ─── POST / ──────────────────────────────────────────
router.post('/', (req, res) => {
  const { url, events } = req.body;
  if (!url) return res.status(400).json({ error: 'url_required' });
  if (!events || !Array.isArray(events) || events.length === 0) {
    return res.status(400).json({ error: 'events_required', valid_events: [
      'score.completed', 'pipeline.advanced', 'pipeline.rejected',
      'scan.completed', 'alert.volume', 'alert.liquidity',
      'twitter.reply', 'cron.failed'
    ]});
  }

  const db = getDB();
  const secret = crypto.randomBytes(32).toString('hex');

  const result = db.prepare(
    'INSERT INTO webhooks (url, events, secret) VALUES (?, ?, ?)'
  ).run(url, events.join(','), secret);

  res.status(201).json({
    id: result.lastInsertRowid,
    url,
    events,
    secret,
    message: 'Webhook registered. Store the secret — it will not be shown again.'
  });
});

// ─── DELETE /:id ─────────────────────────────────────
router.delete('/:id', (req, res) => {
  const db = getDB();
  const result = db.prepare('DELETE FROM webhooks WHERE id = ?').run(req.params.id);

  if (result.changes === 0) return res.status(404).json({ error: 'webhook_not_found' });
  res.json({ deleted: true, id: parseInt(req.params.id) });
});

// ─── GET /:id/deliveries ─────────────────────────────
router.get('/:id/deliveries', (req, res) => {
  const db = getDB();
  const limit = parseInt(req.query.limit) || 20;

  const webhook = db.prepare('SELECT id, url FROM webhooks WHERE id = ?').get(req.params.id);
  if (!webhook) return res.status(404).json({ error: 'webhook_not_found' });

  const deliveries = db.prepare(`
    SELECT * FROM webhook_deliveries 
    WHERE webhook_id = ? 
    ORDER BY created_at DESC LIMIT ?
  `).all(req.params.id, limit);

  res.json({ webhook_id: webhook.id, url: webhook.url, count: deliveries.length, deliveries });
});

// ─── POST /test ──────────────────────────────────────
router.post('/test', (req, res) => {
  const { webhook_id } = req.body;
  if (!webhook_id) return res.status(400).json({ error: 'webhook_id_required' });

  const db = getDB();
  const webhook = db.prepare('SELECT * FROM webhooks WHERE id = ?').get(webhook_id);
  if (!webhook) return res.status(404).json({ error: 'webhook_not_found' });

  // Record test delivery attempt
  const payload = {
    event: 'test.ping',
    agent: 'Buzz BD Agent',
    timestamp: new Date().toISOString(),
    message: 'Webhook test delivery'
  };

  db.prepare(`
    INSERT INTO webhook_deliveries (webhook_id, event, payload, status_code, response, delivered_at)
    VALUES (?, 'test.ping', ?, 0, 'queued', datetime('now'))
  `).run(webhook_id, JSON.stringify(payload));

  res.json({
    status: 'test_queued',
    webhook_id,
    url: webhook.url,
    payload
  });
});

module.exports = router;
