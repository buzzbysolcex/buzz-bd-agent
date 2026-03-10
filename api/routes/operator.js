/**
 * Buzz BD Agent — Operator Profile Routes
 * v7.3.1 | Operator preferences + approval patterns
 *
 * GET   /api/v1/operator/profile
 * PATCH /api/v1/operator/profile
 */

const express = require('express');
const router = express.Router();
const { getProfile, updateProfile } = require('../services/operator-profile');

// ─── GET /operator/profile ──────────────────────────
router.get('/profile', (req, res) => {
  try {
    const result = getProfile();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── PATCH /operator/profile ────────────────────────
router.patch('/profile', (req, res) => {
  try {
    const patch = req.body;
    if (!patch || Object.keys(patch).length === 0) {
      return res.status(400).json({ success: false, error: 'request body must contain fields to update' });
    }
    const result = updateProfile(patch);
    if (result.success) res.json(result);
    else res.status(400).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
