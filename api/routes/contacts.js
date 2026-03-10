/**
 * Buzz BD Agent — Contact Intelligence Routes
 * v7.3.1 | Phase 0 Feature 3 — Alpha Buzz
 *
 * GET    /api/v1/contacts                      — list all contacts
 * GET    /api/v1/contacts/:project             — get contact profile
 * POST   /api/v1/contacts                      — create new contact
 * PATCH  /api/v1/contacts/:project             — update contact
 * POST   /api/v1/contacts/:project/interaction — record interaction
 * GET    /api/v1/contacts/:project/history     — get interaction history
 */

const express = require('express');
const router = express.Router();
const {
  createContact,
  updateContact,
  getContact,
  listContacts,
  recordInteraction,
  getContactHistory
} = require('../services/contact-intelligence');

// ─── GET /contacts ──────────────────────────────────
router.get('/', (req, res) => {
  try {
    const { chain, sentiment, limit } = req.query;
    const result = listContacts({ chain, sentiment, limit });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /contacts ─────────────────────────────────
router.post('/', (req, res) => {
  try {
    const result = createContact(req.body);
    if (result.success) res.status(201).json(result);
    else res.status(400).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /contacts/:project ─────────────────────────
router.get('/:project', (req, res) => {
  try {
    const result = getContact(req.params.project);
    if (result.success) res.json(result);
    else res.status(404).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── PATCH /contacts/:project ───────────────────────
router.patch('/:project', (req, res) => {
  try {
    const result = updateContact(req.params.project, req.body);
    if (result.success) res.json(result);
    else res.status(400).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /contacts/:project/interaction ────────────
router.post('/:project/interaction', (req, res) => {
  try {
    const { type, outcome, notes } = req.body;
    if (!type) return res.status(400).json({ success: false, error: 'type is required' });
    const result = recordInteraction(req.params.project, type, outcome, notes);
    if (result.success) res.status(201).json(result);
    else res.status(400).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /contacts/:project/history ─────────────────
router.get('/:project/history', (req, res) => {
  try {
    const result = getContactHistory(req.params.project);
    if (result.success) res.json(result);
    else res.status(404).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
