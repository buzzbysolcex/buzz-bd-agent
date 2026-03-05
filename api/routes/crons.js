/**
 * Buzz BD Agent — Cron Management Routes
 * 
 * GET  /api/v1/crons              → List all cron jobs
 * GET  /api/v1/crons/status       → Health summary of all 40 crons
 * GET  /api/v1/crons/:id          → Get specific cron job
 * GET  /api/v1/crons/:id/runs     → Run history
 * POST /api/v1/crons              → Create cron job
 * PATCH /api/v1/crons/:id         → Update cron job
 * POST /api/v1/crons/:id/trigger  → Manual trigger
 */

const express = require('express');
const router = express.Router();
const { getDB } = require('../db');

// ─── GET / ───────────────────────────────────────────
router.get('/', (req, res) => {
  const db = getDB();
  const { status } = req.query;

  let sql = 'SELECT * FROM cron_jobs';
  const params = [];
  if (status) { sql += ' WHERE status = ?'; params.push(status); }
  sql += ' ORDER BY name';

  const crons = db.prepare(sql).all(...params);
  res.json({ count: crons.length, crons });
});

// ─── GET /status ─────────────────────────────────────
router.get('/status', (req, res) => {
  const db = getDB();
  const crons = db.prepare('SELECT * FROM cron_jobs').all();

  const summary = {
    total: crons.length,
    active: crons.filter(c => c.status === 'active').length,
    paused: crons.filter(c => c.status === 'paused').length,
    error: crons.filter(c => c.status === 'error').length,
    total_runs: crons.reduce((sum, c) => sum + c.run_count, 0),
    total_failures: crons.reduce((sum, c) => sum + c.fail_count, 0),
    crons: crons.map(c => ({
      id: c.id,
      name: c.name,
      status: c.status,
      schedule: c.schedule,
      last_run: c.last_run,
      next_run: c.next_run,
      fail_count: c.fail_count,
      last_error: c.last_error
    }))
  };

  res.json(summary);
});

// ─── GET /:id ────────────────────────────────────────
router.get('/:id', (req, res) => {
  const db = getDB();
  const cron = db.prepare('SELECT * FROM cron_jobs WHERE id = ?').get(req.params.id);

  if (!cron) {
    return res.status(404).json({ error: 'not_found' });
  }

  res.json(cron);
});

// ─── GET /:id/runs ───────────────────────────────────
router.get('/:id/runs', (req, res) => {
  const db = getDB();
  const limit = parseInt(req.query.limit) || 20;

  const runs = db.prepare(
    'SELECT * FROM cron_runs WHERE cron_id = ? ORDER BY created_at DESC LIMIT ?'
  ).all(req.params.id, limit);

  res.json({ cron_id: req.params.id, count: runs.length, runs });
});

// ─── POST / ──────────────────────────────────────────
router.post('/', (req, res) => {
  const { id, name, schedule, agent_name, command } = req.body;

  if (!id || !name || !schedule) {
    return res.status(400).json({ error: 'missing_fields', message: 'id, name, schedule required' });
  }

  const db = getDB();
  try {
    db.prepare(`
      INSERT INTO cron_jobs (id, name, schedule, agent_name, command) VALUES (?, ?, ?, ?, ?)
    `).run(id, name, schedule, agent_name || null, command || null);

    const cron = db.prepare('SELECT * FROM cron_jobs WHERE id = ?').get(id);
    res.status(201).json({ message: 'Cron job created', cron });
  } catch (err) {
    if (err.message.includes('UNIQUE') || err.message.includes('PRIMARY')) {
      return res.status(409).json({ error: 'duplicate', message: `Cron job '${id}' already exists` });
    }
    throw err;
  }
});

// ─── PATCH /:id ──────────────────────────────────────
router.patch('/:id', (req, res) => {
  const db = getDB();
  const { schedule, status, agent_name, command } = req.body;

  const updates = [];
  const params = [];

  if (schedule) { updates.push('schedule = ?'); params.push(schedule); }
  if (status) { updates.push('status = ?'); params.push(status); }
  if (agent_name) { updates.push('agent_name = ?'); params.push(agent_name); }
  if (command) { updates.push('command = ?'); params.push(command); }
  params.push(req.params.id);

  if (updates.length === 0) {
    return res.status(400).json({ error: 'no_updates', message: 'No fields to update' });
  }

  const result = db.prepare(`UPDATE cron_jobs SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'not_found' });
  }

  const cron = db.prepare('SELECT * FROM cron_jobs WHERE id = ?').get(req.params.id);
  res.json({ message: 'Cron updated', cron });
});

// ─── POST /:id/trigger ──────────────────────────────
router.post('/:id/trigger', (req, res) => {
  const db = getDB();
  const cron = db.prepare('SELECT * FROM cron_jobs WHERE id = ?').get(req.params.id);

  if (!cron) {
    return res.status(404).json({ error: 'not_found' });
  }

  // Log the manual trigger as a run
  db.prepare(`
    INSERT INTO cron_runs (cron_id, status, output) VALUES (?, 'ok', 'Manual trigger')
  `).run(req.params.id);

  db.prepare(`
    UPDATE cron_jobs SET run_count = run_count + 1, last_run = datetime('now') WHERE id = ?
  `).run(req.params.id);

  // TODO: Actually trigger the cron via OpenClaw gateway
  // For now, log and return success
  res.json({
    message: `Cron '${cron.name}' triggered manually`,
    cron_id: req.params.id,
    triggered_at: new Date().toISOString()
  });
});

module.exports = router;
