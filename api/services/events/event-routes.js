const express = require('express');
const router = express.Router();
const eb = require('./event-bus');

router.post('/subscribe', (req, res) => {
  const { agent, eventType, filter } = req.body;
  if (!agent || !eventType) return res.status(400).json({ error: 'agent, eventType required' });
  res.json(eb.subscribe(agent, eventType, filter));
});

router.post('/emit', (req, res) => {
  const { source, eventType, payload } = req.body;
  if (!source || !eventType) return res.status(400).json({ error: 'source, eventType required' });
  res.json(eb.emit(source, eventType, payload));
});

router.get('/subscriptions', (req, res) => { res.json(eb.getSubscriptions(req.query.agent)); });
router.get('/log', (req, res) => { res.json(eb.getEventLog(req.query.type, parseInt(req.query.limit) || 20)); });
router.get('/types', (req, res) => { res.json(eb.EVENT_TYPES); });

module.exports = router;
