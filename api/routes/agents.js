/**
 * Buzz BD Agent — Agent Management Routes
 * 
 * GET  /api/v1/agents                    → List all agents
 * GET  /api/v1/agents/parallel-status    → All 5 sub-agents in one call
 * GET  /api/v1/agents/:name              → Get specific agent
 * PATCH /api/v1/agents/:name             → Update agent config
 * POST /api/v1/agents/:name/heartbeat    → Record heartbeat
 */

const express = require('express');
const router = express.Router();
const { getDB } = require('../db');

// ─── GET / ───────────────────────────────────────────
router.get('/', (req, res) => {
  const db = getDB();
  const agents = db.prepare('SELECT * FROM agents ORDER BY name').all();
  res.json({ count: agents.length, agents });
});

// ─── GET /parallel-status ────────────────────────────
// Dashboard view: all sub-agents + orchestrator in one call
router.get('/parallel-status', (req, res) => {
  const db = getDB();
  const agents = db.prepare('SELECT * FROM agents ORDER BY name').all();

  const orchestrator = agents.find(a => a.name === 'orchestrator');
  const subAgents = agents.filter(a => a.name !== 'orchestrator');

  // Get recent cost per agent (last 24h)
  const costByAgent = db.prepare(`
    SELECT agent_name, 
           SUM(cost_usd) as total_cost, 
           SUM(input_tokens + output_tokens) as total_tokens,
           COUNT(*) as request_count
    FROM cost_logs 
    WHERE created_at > datetime('now', '-1 day')
    GROUP BY agent_name
  `).all();

  const costMap = {};
  costByAgent.forEach(c => { costMap[c.agent_name] = c; });

  res.json({
    orchestrator: {
      ...orchestrator,
      cost_24h: costMap['orchestrator'] || null
    },
    sub_agents: subAgents.map(a => ({
      ...a,
      cost_24h: costMap[a.name] || null
    })),
    summary: {
      total_active: agents.filter(a => a.status === 'active').length,
      total_errors: agents.filter(a => a.status === 'error').length,
      total_cost_24h: costByAgent.reduce((sum, c) => sum + c.total_cost, 0).toFixed(4)
    }
  });
});

// ─── GET /:name ──────────────────────────────────────
router.get('/:name', (req, res) => {
  const db = getDB();
  const agent = db.prepare('SELECT * FROM agents WHERE name = ?').get(req.params.name);

  if (!agent) {
    return res.status(404).json({ error: 'not_found', message: `Agent '${req.params.name}' not found` });
  }

  // Get recent runs for this agent
  const recentCosts = db.prepare(`
    SELECT model, operation, input_tokens, output_tokens, cost_usd, duration_ms, created_at
    FROM cost_logs WHERE agent_name = ? ORDER BY created_at DESC LIMIT 20
  `).all(req.params.name);

  res.json({ ...agent, recent_activity: recentCosts });
});

// ─── PATCH /:name ────────────────────────────────────
router.patch('/:name', (req, res) => {
  const db = getDB();
  const { model, status, config } = req.body;

  const agent = db.prepare('SELECT * FROM agents WHERE name = ?').get(req.params.name);
  if (!agent) {
    return res.status(404).json({ error: 'not_found', message: `Agent '${req.params.name}' not found` });
  }

  const updates = [];
  const params = [];

  if (model) { updates.push('model = ?'); params.push(model); }
  if (status) { updates.push('status = ?'); params.push(status); }
  if (config) { updates.push('config = ?'); params.push(JSON.stringify(config)); }
  updates.push("updated_at = datetime('now')");
  params.push(req.params.name);

  db.prepare(`UPDATE agents SET ${updates.join(', ')} WHERE name = ?`).run(...params);

  const updated = db.prepare('SELECT * FROM agents WHERE name = ?').get(req.params.name);
  res.json({ message: 'Agent updated', agent: updated });
});

// ─── POST /:name/heartbeat ──────────────────────────
router.post('/:name/heartbeat', (req, res) => {
  const db = getDB();
  const { status, error } = req.body;

  const result = db.prepare(`
    UPDATE agents 
    SET last_heartbeat = datetime('now'),
        status = COALESCE(?, status),
        last_error = ?,
        updated_at = datetime('now')
    WHERE name = ?
  `).run(status || 'active', error || null, req.params.name);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'not_found', message: `Agent '${req.params.name}' not found` });
  }

  res.json({ message: 'Heartbeat recorded', agent: req.params.name, timestamp: new Date().toISOString() });
});

module.exports = router;
