/**
 * Free Score Endpoint — Public token score lookup
 * NO auth required. Rate limited to 10 requests per IP per day.
 *
 * GET /api/v1/score/free/:address — Free token score
 *
 * Part of HSaaS (Honest Scoring as a Service) revenue funnel:
 *   Free score → x402 micropayment → Full audit ($500-$2500)
 *
 * Buzz BD Agent | SolCex Exchange
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { getDB } = require('../db');

// ─── Create rate limit table on load ─────────────────
try {
  const db = getDB();
  db.exec(`
    CREATE TABLE IF NOT EXISTS free_score_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip_hash TEXT NOT NULL,
      address TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_free_score_ip ON free_score_requests(ip_hash, created_at);
  `);
} catch (e) {
  console.error('[free-score] Table init deferred:', e.message);
}

/**
 * Classify token by score
 */
function classify(score) {
  if (score >= 80) return 'HOT';
  if (score >= 70) return 'WARM';
  if (score >= 40) return 'WATCH';
  return 'SKIP';
}

/**
 * Risk level from score
 */
function riskLevel(score) {
  if (score >= 70) return 'LOW';
  if (score >= 50) return 'MEDIUM';
  if (score >= 30) return 'HIGH';
  return 'CRITICAL';
}

/**
 * Summary line from score range
 */
function summary(score) {
  if (score >= 80) return 'Strong fundamentals across all scoring dimensions. Rare.';
  if (score >= 70) return 'Solid token with minor weaknesses. Worth deeper analysis.';
  if (score >= 50) return 'Mixed signals. Some red flags detected in scoring pipeline.';
  if (score >= 30) return 'Multiple risk factors identified. Proceed with extreme caution.';
  return 'Failed majority of scoring criteria. High probability of loss.';
}

/**
 * Hash IP for privacy-preserving rate limiting
 */
function hashIP(ip) {
  return crypto.createHash('sha256').update(ip || 'unknown').digest('hex').slice(0, 16);
}

// ─── GET /free/:address — Public free score lookup ───
router.get('/free/:address', (req, res) => {
  try {
    const db = getDB();
    const { address } = req.params;
    const clientIp = req.headers['x-forwarded-for'] || req.ip || req.connection?.remoteAddress || '';
    const ipHash = hashIP(clientIp);

    // Rate limit: max 10 per IP per day
    const today = new Date().toISOString().split('T')[0];
    const count = db.prepare(
      `SELECT COUNT(*) as cnt FROM free_score_requests
       WHERE ip_hash = ? AND created_at >= ?`
    ).get(ipHash, today + 'T00:00:00');

    if (count && count.cnt >= 10) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        limit: '10 free scores per day',
        upgrade: 'API key access at buzzbd.ai removes limits'
      });
    }

    // Log the request
    db.prepare(
      `INSERT INTO free_score_requests (ip_hash, address) VALUES (?, ?)`
    ).run(ipHash, address);

    // Look up token
    const token = db.prepare(
      `SELECT address, ticker, name, chain, score, stage, updated_at
       FROM pipeline_tokens WHERE address = ?`
    ).get(address);

    if (!token || token.score == null) {
      return res.status(404).json({
        error: 'Token not in pipeline',
        hint: 'Submit at buzzbd.ai/score',
        address
      });
    }

    const score = token.score;

    res.json({
      address: token.address,
      ticker: token.ticker || null,
      name: token.name || null,
      chain: token.chain,
      score,
      classification: classify(score),
      risk_level: riskLevel(score),
      summary: summary(score),
      scored_at: token.updated_at,
      upgrade: 'Full 11-factor analysis + 1000-agent simulation at buzzbd.ai',
      provider: 'Buzz BD Agent | SolCex Exchange'
    });
  } catch (err) {
    console.error('[free-score] Error:', err.message);
    res.status(500).json({ error: 'Internal error', message: err.message });
  }
});

module.exports = router;
