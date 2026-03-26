/**
 * Task Chain Routes — v8.2.0 ClawTeam Pattern 1
 * POST /api/v1/chains/start — Start chain from template
 * GET  /api/v1/chains — List recent chains
 * GET  /api/v1/chains/:chain_id — Get chain status
 * PATCH /api/v1/chains/:chain_id/tasks/:task_name — Update task
 */

const express = require('express');

module.exports = function(db, taskChainExecutor) {
  const router = express.Router();

  // Start a new chain from template
  router.post('/start', (req, res) => {
    try {
      const { template, token_address, token_name } = req.body;
      if (!template) return res.status(400).json({ error: 'template required' });

      const result = taskChainExecutor.startChain(template, token_address, token_name);
      res.json(result);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  // List recent chains
  router.get('/', (req, res) => {
    const limit = parseInt(req.query.limit) || 20;
    const chains = db.prepare(`
      SELECT chain_id, chain_name, token_address, MIN(created_at) as started_at,
        COUNT(*) as total_tasks,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_tasks
      FROM task_chains
      GROUP BY chain_id
      ORDER BY started_at DESC
      LIMIT ?
    `).all(limit);

    res.json({ chains, count: chains.length });
  });

  // Get chain status
  router.get('/:chain_id', (req, res) => {
    const status = taskChainExecutor.getChainStatus(req.params.chain_id);
    if (!status) return res.status(404).json({ error: 'Chain not found' });
    res.json(status);
  });

  // Update task in chain
  router.patch('/:chain_id/tasks/:task_name', (req, res) => {
    try {
      const { status, result, error } = req.body;
      if (!status) return res.status(400).json({ error: 'status required' });

      const updated = taskChainExecutor.updateTask(
        req.params.chain_id, req.params.task_name,
        status, result, error
      );
      res.json(updated);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  return router;
};
