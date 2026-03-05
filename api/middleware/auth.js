/**
 * Buzz BD Agent — Authentication Middleware
 * 
 * Three auth methods:
 * 1. Admin API key (Ogie) — full access
 * 2. BaaS API key — per-customer, rate-limited
 * 3. x402 USDC micropayment — pay-per-query for /score-token
 */

const crypto = require('crypto');
const { getDB } = require('../db');

// Admin key from env (set in Akash SDL)
const ADMIN_KEY = process.env.BUZZ_API_ADMIN_KEY;

/**
 * Hash an API key for storage comparison
 */
function hashKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * API Key authentication middleware
 * Checks X-API-Key header or Authorization: Bearer <key>
 */
function apiKeyAuth(req, res, next) {
  const key = req.headers['x-api-key'] || extractBearer(req.headers.authorization);

  if (!key) {
    return res.status(401).json({
      error: 'unauthorized',
      message: 'Missing API key. Provide X-API-Key header or Authorization: Bearer <key>'
    });
  }

  // Check admin key first (fastest path)
  if (ADMIN_KEY && key === ADMIN_KEY) {
    req.auth = { role: 'admin', label: 'admin', keyId: 0 };
    return next();
  }

  // Check database for BaaS keys
  try {
    const db = getDB();
    const hash = hashKey(key);
    const record = db.prepare(
      'SELECT id, label, role, rate_limit, active FROM api_keys WHERE key_hash = ?'
    ).get(hash);

    if (!record || !record.active) {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'Invalid or inactive API key'
      });
    }

    // Update usage stats
    db.prepare(
      'UPDATE api_keys SET total_requests = total_requests + 1, last_used = datetime("now") WHERE id = ?'
    ).run(record.id);

    req.auth = {
      role: record.role,
      label: record.label,
      keyId: record.id,
      rateLimit: record.rate_limit
    };

    return next();
  } catch (err) {
    console.error('[Auth] DB error:', err.message);
    return res.status(500).json({ error: 'auth_error', message: 'Authentication service error' });
  }
}

/**
 * x402 USDC payment verification middleware
 * For pay-per-query endpoints like /score-token
 */
function x402Auth(req, res, next) {
  const paymentProof = req.headers['x-402-payment'];

  if (paymentProof) {
    // TODO: Verify x402 payment against Buzz anet wallet
    // 0x2Dc03124091104E7798C0273D96FC5ED65F05aA9 on Base
    // For now, log and pass through for development
    console.log(`[x402] Payment received: ${paymentProof.substring(0, 20)}...`);
    req.auth = { role: 'baas_query', label: 'x402-payment', keyId: null };
    return next();
  }

  // Fall back to API key auth
  return apiKeyAuth(req, res, next);
}

/**
 * Role-based access control
 * Usage: requireRole('admin', 'operator')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({ error: 'unauthorized', message: 'Not authenticated' });
    }
    if (!roles.includes(req.auth.role)) {
      return res.status(403).json({
        error: 'forbidden',
        message: `Role '${req.auth.role}' cannot access this endpoint. Required: ${roles.join(', ')}`
      });
    }
    next();
  };
}

function extractBearer(header) {
  if (!header) return null;
  const parts = header.split(' ');
  return parts[0] === 'Bearer' && parts[1] ? parts[1] : null;
}

module.exports = { apiKeyAuth, x402Auth, requireRole, hashKey };
