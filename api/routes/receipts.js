/**
 * Buzz BD Agent — JVR Receipt Routes
 * 
 * GET  /api/v1/receipts                 → Query receipts with filters
 * GET  /api/v1/receipts/stats           → Aggregated receipt statistics
 * GET  /api/v1/receipts/:code           → Get receipt by verification code
 * GET  /api/v1/receipts/:code/verify    → Verify receipt integrity (SHA-256)
 * POST /api/v1/receipts                 → Create manual receipt
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const RECEIPTS_DIR = process.env.RECEIPTS_DIR || '/data/workspace/memory/receipts';

// Helper: scan receipt files
function loadReceipts(filters = {}) {
  const receipts = [];
  if (!fs.existsSync(RECEIPTS_DIR)) return receipts;

  const dirs = fs.readdirSync(RECEIPTS_DIR).filter(d => {
    try {
      const stat = fs.statSync(path.join(RECEIPTS_DIR, d));
      return stat.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(d);
    } catch (e) { return false; }
  }).sort().reverse();

  const fromDate = filters.from_date || '2000-01-01';
  const toDate = filters.to_date || '2099-12-31';

  for (const dir of dirs) {
    if (dir < fromDate || dir > toDate) continue;

    const dayDir = path.join(RECEIPTS_DIR, dir);
    const files = fs.readdirSync(dayDir).filter(f => f.endsWith('.json'));

    for (const file of files) {
      try {
        const receipt = JSON.parse(fs.readFileSync(path.join(dayDir, file), 'utf8'));
        if (filters.category && receipt.category !== filters.category) continue;
        if (filters.status && receipt.status !== filters.status) continue;
        if (filters.session && receipt.session !== filters.session) continue;
        receipts.push(receipt);
      } catch (e) {}
    }

    if (filters.limit && receipts.length >= filters.limit) break;
  }

  return receipts;
}

// ─── GET / ───────────────────────────────────────────
router.get('/', (req, res) => {
  const { category, status, session, from_date, to_date, limit, offset } = req.query;

  const all = loadReceipts({
    category, status, session, from_date, to_date,
    limit: parseInt(limit || '100') + parseInt(offset || '0')
  });

  const start = parseInt(offset) || 0;
  const end = start + (parseInt(limit) || 50);
  const paged = all.slice(start, end);

  res.json({ total: all.length, returned: paged.length, receipts: paged });
});

// ─── GET /stats ──────────────────────────────────────
router.get('/stats', (req, res) => {
  const all = loadReceipts({});

  const byCat = {};
  const bySession = {};
  const byStatus = {};
  let totalDuration = 0;
  let durationCount = 0;

  for (const r of all) {
    byCat[r.category] = (byCat[r.category] || 0) + 1;
    bySession[r.session] = (bySession[r.session] || 0) + 1;
    byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    if (r.duration_ms) { totalDuration += r.duration_ms; durationCount++; }
  }

  res.json({
    total_receipts: all.length,
    avg_duration_ms: durationCount > 0 ? Math.round(totalDuration / durationCount) : 0,
    by_category: byCat,
    by_session: bySession,
    by_status: byStatus
  });
});

// ─── GET /:code ──────────────────────────────────────
router.get('/:code', (req, res) => {
  const { code } = req.params;
  if (!fs.existsSync(RECEIPTS_DIR)) {
    return res.status(404).json({ error: 'receipt_not_found' });
  }

  const dirs = fs.readdirSync(RECEIPTS_DIR).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d));
  for (const dir of dirs) {
    const filepath = path.join(RECEIPTS_DIR, dir, `${code}.json`);
    if (fs.existsSync(filepath)) {
      const receipt = JSON.parse(fs.readFileSync(filepath, 'utf8'));
      return res.json({ receipt });
    }
  }

  res.status(404).json({ error: 'receipt_not_found', code });
});

// ─── GET /:code/verify ──────────────────────────────
router.get('/:code/verify', (req, res) => {
  const { code } = req.params;
  if (!fs.existsSync(RECEIPTS_DIR)) {
    return res.status(404).json({ error: 'receipt_not_found' });
  }

  const dirs = fs.readdirSync(RECEIPTS_DIR).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d));
  for (const dir of dirs) {
    const filepath = path.join(RECEIPTS_DIR, dir, `${code}.json`);
    if (fs.existsSync(filepath)) {
      const receipt = JSON.parse(fs.readFileSync(filepath, 'utf8'));
      
      const { receipt_hash, ...payload } = receipt;
      const computedHash = crypto.createHash('sha256')
        .update(JSON.stringify(payload))
        .digest('hex');
      const valid = computedHash === receipt_hash;

      return res.json({
        verification_code: code,
        integrity_valid: valid,
        stored_hash: receipt_hash,
        computed_hash: computedHash,
        status: valid ? 'VERIFIED' : 'TAMPERED'
      });
    }
  }

  res.status(404).json({ error: 'receipt_not_found', code });
});

// ─── POST / ──────────────────────────────────────────
router.post('/', (req, res) => {
  const { category, session, status, summary, token_symbol, details } = req.body;
  if (!category || !summary) {
    return res.status(400).json({ error: 'category and summary required' });
  }

  const code = `AAB-${Math.floor(100000 + Math.random() * 900000)}-${Math.floor(10000 + Math.random() * 90000)}`;
  const timestamp = new Date().toISOString();
  const receipt = {
    verification_code: code,
    category: category || 'manual',
    session: session || 'api',
    status: status || 'completed',
    summary,
    token_symbol: token_symbol || null,
    details: details || null,
    timestamp
  };

  const receipt_hash = crypto.createHash('sha256')
    .update(JSON.stringify(receipt))
    .digest('hex');
  receipt.receipt_hash = receipt_hash;

  // Save to file
  const dateDir = timestamp.slice(0, 10);
  const dir = path.join(RECEIPTS_DIR, dateDir);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${code}.json`), JSON.stringify(receipt, null, 2));

  res.status(201).json({ receipt });
});

module.exports = router;
