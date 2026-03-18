/**
 * Autonomous Loop Cron Routes — Day 32 Sprint Phase 4
 */

const express = require('express');
const router = express.Router();
const { getDB } = require('../db');
const loops = require('../lib/autonomous-loops');
const authority = require('../lib/agent-authority');

// Loop management
router.get('/runs', (req, res) => {
  const { type, limit } = req.query;
  const runs = loops.getLoopHistory(type || null, parseInt(limit) || 20);
  res.json({ count: runs.length, runs });
});

router.get('/runs/:id', (req, res) => {
  const db = getDB();
  const run = db.prepare('SELECT * FROM loop_cron_runs WHERE id = ?').get(req.params.id);
  if (!run) return res.status(404).json({ error: 'not_found', code: 'RUN_NOT_FOUND' });
  const outputs = db.prepare('SELECT * FROM loop_cron_outputs WHERE run_id = ? ORDER BY created_at').all(run.id);
  res.json({ ...run, outputs });
});

router.post('/trigger/:type', (req, res) => {
  const { type } = req.params;
  try {
    let result;
    if (type === 'morning_brief') result = loops.generateMorningBrief();
    else if (type === 'discovery_alert') result = loops.generateDiscoveryAlert();
    else if (type === 'evening_recap') result = loops.generateEveningRecap();
    else return res.status(400).json({ error: 'invalid_type', code: 'INVALID_LOOP_TYPE' });

    res.json({ status: 'completed', type, result });
  } catch (e) {
    res.status(500).json({ error: e.message, code: 'LOOP_EXECUTION_FAILED' });
  }
});

// Authority matrix
router.get('/authority', (req, res) => {
  const { agent } = req.query;
  const permissions = agent ? authority.getAgentPermissions(agent) : authority.getAllPermissions();
  res.json({ count: permissions.length, permissions });
});

router.post('/authority/check', (req, res) => {
  const { agent_name, action } = req.body;
  if (!agent_name || !action) return res.status(400).json({ error: 'missing_fields', code: 'MISSING_REQUIRED_FIELDS' });
  const result = authority.checkPermission(agent_name, action);
  res.json(result);
});

router.post('/authority/grant', (req, res) => {
  const { agent_name, action, permission_level, max_daily_calls, requires_approval } = req.body;
  if (!agent_name || !action) return res.status(400).json({ error: 'missing_fields', code: 'MISSING_REQUIRED_FIELDS' });
  authority.grantPermission(agent_name, action, { permissionLevel: permission_level, maxDailyCalls: max_daily_calls, requiresApproval: requires_approval });
  res.json({ status: 'granted', agent_name, action });
});

router.post('/authority/revoke', (req, res) => {
  const { agent_name, action } = req.body;
  if (!agent_name || !action) return res.status(400).json({ error: 'missing_fields', code: 'MISSING_REQUIRED_FIELDS' });
  authority.revokePermission(agent_name, action);
  res.json({ status: 'revoked', agent_name, action });
});

router.post('/authority/reset-daily', (req, res) => {
  authority.resetDailyCounters();
  res.json({ status: 'reset', message: 'All daily counters reset to 0' });
});

router.get('/authority/audit', (req, res) => {
  const { agent, limit } = req.query;
  const log = authority.getAuditLog(agent || null, parseInt(limit) || 50);
  res.json({ count: log.length, log });
});

module.exports = router;
