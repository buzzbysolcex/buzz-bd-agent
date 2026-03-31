const express = require('express');
const router = express.Router();
const { send, receive, ack, broadcast, cleanup } = require('./mailbox');

router.post('/send', (req, res) => {
  const { from, to, type, payload } = req.body;
  if (!from || !to || !type) return res.status(400).json({ error: 'from, to, type required' });
  const result = send(from, to, type, payload || {});
  res.json(result);
});

router.get('/inbox/:agent', (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const messages = receive(req.params.agent, limit);
  res.json({ agent: req.params.agent, count: messages.length, messages });
});

router.post('/ack/:id', (req, res) => {
  const result = ack(parseInt(req.params.id));
  res.json({ acked: result.changes > 0 });
});

router.post('/broadcast', (req, res) => {
  const { from, type, payload } = req.body;
  if (!from || !type) return res.status(400).json({ error: 'from, type required' });
  const result = broadcast(from, type, payload || {});
  res.json(result);
});

router.post('/cleanup', (req, res) => {
  const result = cleanup();
  res.json(result);
});

module.exports = router;
