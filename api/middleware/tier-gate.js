/**
 * BuzzShield V4 Tier Gate — subscription-based rate limiting + auth.
 *
 * 4 tiers (matches buzzbd.ai subscription model):
 *   free       — no auth, 10/hour/IP
 *   pro        — API key, 100/day
 *   business   — API key + webhook entitlement, 500/day
 *   enterprise — API key + white-label, 2000/day
 *
 * NOT x402. x402 stays on /api/v1/premium/*. This middleware only handles
 * the subscription flow for the shield portal.
 *
 * Usage:
 *   router.post("/audit/full", tierGate("free"), handler);
 *   router.post("/audit/full", tierGate("free", "pro"), handler);
 *
 * Admin API key bypasses all tier gating (internal ops, demo permalinks).
 */

const ADMIN_KEY = process.env.BUZZ_API_ADMIN_KEY;

// Per-IP rate limit buckets — in-memory for now, graduate to Redis later.
// Each bucket = { timestamps: [..], tier: "free" }.
const buckets = new Map();

// Windows + caps (per buzzbd.ai subscription spec)
const LIMITS = {
  free: { window_ms: 60 * 60 * 1000, cap: 10 }, // 10/hour
  pro: { window_ms: 24 * 60 * 60 * 1000, cap: 100 }, // 100/day
  business: { window_ms: 24 * 60 * 60 * 1000, cap: 500 }, // 500/day
  enterprise: { window_ms: 24 * 60 * 60 * 1000, cap: 2000 }, // 2000/day
};

function resolveClientKey(req) {
  // Prefer API key when present, fall back to IP. API keys aggregate
  // rate usage across all IPs for the same customer.
  const apiKey =
    req.headers["x-api-key"] ||
    (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (apiKey) return "key:" + apiKey.slice(0, 16);
  return (
    "ip:" + (req.ip || req.connection?.remoteAddress || "unknown").toString()
  );
}

/**
 * Determine the caller's tier from their API key.
 * For now: admin key = internal bypass, any other non-empty key = pro,
 * no key = free. Supabase-backed tier lookup lands in Phase 3.
 */
function resolveTier(req) {
  const apiKey =
    req.headers["x-api-key"] ||
    (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (ADMIN_KEY && apiKey === ADMIN_KEY) return "admin";
  if (!apiKey) return "free";
  // Placeholder until Phase 3: any valid-looking key is Pro
  // TODO (Phase 3): look up apiKey in supabase.users → tier
  return "pro";
}

/**
 * Tier gate factory.
 * @param {...string} allowed — tiers permitted for this route. Callers in
 *   lower tiers get 401 (if requested paid route) or 429 (if over free cap).
 *   Callers in higher tiers always pass.
 *
 * Ordering: free < pro < business < enterprise < admin (admin bypass).
 */
const TIER_RANK = { free: 0, pro: 1, business: 2, enterprise: 3, admin: 99 };

function tierGate(...allowed) {
  const minTier = allowed.length ? allowed[0] : "free";
  const minRank = TIER_RANK[minTier] ?? 0;

  return (req, res, next) => {
    const tier = resolveTier(req);
    const rank = TIER_RANK[tier] ?? 0;

    // Admin always bypasses
    if (tier === "admin") {
      req.tier = "admin";
      return next();
    }

    // Reject if caller's tier is below minimum required
    if (rank < minRank) {
      return res.status(401).json({
        error: "tier_insufficient",
        message: `This endpoint requires ${minTier} tier or higher. Current: ${tier}.`,
        upgrade_url: "https://buzzbd.ai/pricing",
      });
    }

    // Rate limit per caller+tier
    const limit = LIMITS[tier] || LIMITS.free;
    const clientKey = resolveClientKey(req);
    const bucketKey = `${tier}:${clientKey}`;
    const now = Date.now();
    const existing = buckets.get(bucketKey) || [];
    const recent = existing.filter((t) => now - t < limit.window_ms);
    if (recent.length >= limit.cap) {
      const retryAfter = Math.ceil(
        (limit.window_ms - (now - recent[0])) / 1000,
      );
      return res
        .status(429)
        .set("Retry-After", String(retryAfter))
        .set("X-RateLimit-Tier", tier)
        .set("X-RateLimit-Limit", String(limit.cap))
        .set("X-RateLimit-Window-Seconds", String(limit.window_ms / 1000))
        .json({
          error: "rate_limited",
          tier,
          limit: limit.cap,
          window_seconds: limit.window_ms / 1000,
          retry_after_seconds: retryAfter,
          upgrade_url: tier === "free" ? "https://buzzbd.ai/pricing" : null,
        });
    }
    recent.push(now);
    buckets.set(bucketKey, recent);
    req.tier = tier;
    res
      .set("X-RateLimit-Tier", tier)
      .set("X-RateLimit-Limit", String(limit.cap))
      .set("X-RateLimit-Remaining", String(limit.cap - recent.length));
    next();
  };
}

module.exports = { tierGate, resolveTier, LIMITS, TIER_RANK };
