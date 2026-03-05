/**
 * Buzz BD Agent — Rate Limiting Middleware
 * Simple in-memory sliding window rate limiter
 * No Redis needed — fits Akash single-container deployment
 */

const windowMs = 60 * 1000; // 1 minute window
const defaultLimit = 60;     // 60 requests per minute (public)
const store = new Map();

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of store) {
    if (now - data.windowStart > windowMs * 2) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

function rateLimit(req, res, next) {
  // Skip rate limiting for health checks
  if (req.path.startsWith('/api/v1/health') || req.path === '/api/v1/info') {
    return next();
  }

  const key = req.headers['x-api-key'] || req.ip || 'anonymous';
  const now = Date.now();
  const limit = (req.auth && req.auth.rateLimit) || defaultLimit;

  let data = store.get(key);

  if (!data || now - data.windowStart > windowMs) {
    data = { windowStart: now, count: 0 };
    store.set(key, data);
  }

  data.count++;

  // Set rate limit headers
  res.setHeader('X-RateLimit-Limit', limit);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - data.count));
  res.setHeader('X-RateLimit-Reset', Math.ceil((data.windowStart + windowMs) / 1000));

  if (data.count > limit) {
    return res.status(429).json({
      error: 'rate_limited',
      message: `Rate limit exceeded. ${limit} requests per minute allowed.`,
      retry_after_ms: data.windowStart + windowMs - now
    });
  }

  next();
}

module.exports = { rateLimit };
