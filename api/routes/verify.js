/**
 * Verification Routes — Day 32B Data Hardening
 * 6 endpoints under /api/v1/verify/
 */

const express = require('express');
const router = express.Router();
const { getDB } = require('../db');
const verifier = require('../lib/data-verifier');

// Run triple verification on a token
router.get('/:contractAddress', async (req, res) => {
  const { contractAddress } = req.params;
  const chain = req.query.chain || 'solana';

  try {
    const result = await verifier.verifyToken(contractAddress, chain);
    const statusCode = result.overall === 'VERIFIED' ? 200 : 
                       result.overall === 'QUARANTINED' ? 422 : 200;
    res.status(statusCode).json(result);
  } catch (e) {
    res.status(500).json({ error: e.message, code: 'VERIFICATION_FAILED' });
  }
});

// Get current verification status (from cache)
router.get('/status/:contractAddress', (req, res) => {
  const { contractAddress } = req.params;
  const chain = req.query.chain || 'solana';

  const verified = verifier.isVerified(contractAddress, chain);
  const quarantined = verifier.isQuarantined(contractAddress, chain);

  if (quarantined.quarantined) {
    return res.status(422).json({ status: 'QUARANTINED', ...quarantined });
  }
  if (verified.verified) {
    return res.json({ status: 'VERIFIED', ...verified });
  }
  res.json({ status: 'UNKNOWN', message: 'No verification record. Run GET /api/v1/verify/' + contractAddress });
});

// List quarantined tokens
router.get('/quarantine/list', (req, res) => {
  const db = getDB();
  const active = req.query.active !== 'false';
  const sql = active
    ? 'SELECT * FROM quarantined_tokens WHERE resolved_at IS NULL ORDER BY quarantined_at DESC'
    : 'SELECT * FROM quarantined_tokens ORDER BY quarantined_at DESC';
  const tokens = db.prepare(sql).all();
  res.json({ count: tokens.length, tokens });
});

// Resolve a quarantine (admin only)
router.post('/resolve/:contractAddress', (req, res) => {
  const { contractAddress } = req.params;
  const chain = req.query.chain || 'solana';
  const resolvedBy = req.body.resolved_by || req.auth?.label || 'admin';

  const result = verifier.resolveQuarantine(contractAddress, chain, resolvedBy);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'not_found', code: 'NO_ACTIVE_QUARANTINE' });
  }
  res.json({ status: 'resolved', contract_address: contractAddress, resolved_by: resolvedBy });
});

// Verification audit trail
router.get('/log/history', (req, res) => {
  const db = getDB();
  const limit = parseInt(req.query.limit) || 50;
  const status = req.query.status;

  let sql = 'SELECT id, contract_address, chain, token_name, token_symbol, check1_pass, check2_pass, check3_pass, overall_status, mismatches, verified_at FROM verification_log';
  const params = [];
  if (status) { sql += ' WHERE overall_status = ?'; params.push(status); }
  sql += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit);

  const log = db.prepare(sql).all(...params);
  res.json({ count: log.length, log });
});

// Verification stats
router.get('/stats/summary', (req, res) => {
  res.json(verifier.getVerificationStats());
});

module.exports = router;
