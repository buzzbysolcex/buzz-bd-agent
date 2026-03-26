/**
 * Agent Inbox Routes — v8.2.0 ClawTeam Pattern 2
 * POST  /api/v1/inbox/send — Send agent message
 * GET   /api/v1/inbox — Global inbox stats
 * GET   /api/v1/inbox/:agent — Get agent inbox
 * PATCH /api/v1/inbox/:id — Update message status
 */

const express = require('express');

module.exports = function(db, agentInbox) {
  const router = express.Router();

  // Send a message
  router.post('/send', (req, res) => {
    try {
      const { from_agent, to_agent, message_type, subject, body, priority, chain_id, token_address, token_name } = req.body;
      if (!from_agent || !to_agent || !message_type || !body) {
        return res.status(400).json({ error: 'from_agent, to_agent, message_type, and body required' });
      }

      const result = agentInbox.send(from_agent, to_agent, message_type, {
        subject, body, priority, chain_id, token_address, token_name
      });
      res.json(result);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  // Global inbox stats
  router.get('/', (req, res) => {
    const stats = agentInbox.getStats();
    res.json(stats);
  });

  // Get agent inbox
  router.get('/:agent', (req, res) => {
    const { status, type, limit } = req.query;
    const messages = agentInbox.getInbox(req.params.agent, {
      status, type, limit: parseInt(limit) || 20
    });
    res.json({ agent: req.params.agent, messages, count: messages.length });
  });

  // Update message status
  router.patch('/:id', (req, res) => {
    try {
      const { status, actioned_by } = req.body;
      if (!status) return res.status(400).json({ error: 'status required' });

      const result = agentInbox.updateStatus(parseInt(req.params.id), status, actioned_by);
      res.json(result);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  return router;
};
