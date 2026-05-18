/**
 * ATV Web3 Identity — Deployer Verification
 * Resolves ENS names + social accounts via ATV Web3 Identity API
 * x402 payment ($0.01 USDC on Base per call)
 * Only called for tokens scoring 70+
 */

const { getDB } = require("../../db");
const { feature } = require("../../lib/feature-flags");

function db() {
  return getDB();
}

const ATV_API = "https://api.web3identity.com/api/ens/batch-resolve";

/**
 * Initialize identity_cache and x402_payments tables
 */
function initIdentityTables() {
  db()
    .prepare(
      `
    CREATE TABLE IF NOT EXISTS identity_cache (
      address TEXT PRIMARY KEY,
      ens_name TEXT,
      twitter TEXT,
      github TEXT,
      resolved_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT DEFAULT (datetime('now', '+24 hours'))
    )
  `,
    )
    .run();

  db()
    .prepare(
      `
    CREATE TABLE IF NOT EXISTS x402_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service TEXT NOT NULL,
      amount_usd REAL NOT NULL,
      tx_hash TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `,
    )
    .run();

  console.log("[ATV Identity] Tables initialized");
}

/**
 * Check cache for a previously resolved address
 */
function getCachedIdentity(address) {
  const row = db()
    .prepare(
      `SELECT address, ens_name, twitter, github, resolved_at, expires_at
     FROM identity_cache
     WHERE address = ? AND expires_at > datetime('now')`,
    )
    .get(address.toLowerCase());
  return row || null;
}

/**
 * Resolve identity for a deployer address
 * 1. Check cache first
 * 2. If not cached, call ATV API with x402 payment flow
 * 3. Cache result and log payment
 */
async function resolveIdentity(address) {
  if (!feature("ATV_IDENTITY")) {
    return { status: "disabled", reason: "ATV_IDENTITY flag is off" };
  }

  const normalized = address.toLowerCase();

  // Step 1: Check cache
  const cached = getCachedIdentity(normalized);
  if (cached) {
    return {
      ens_name: cached.ens_name,
      twitter: cached.twitter,
      github: cached.github,
      source: "atv-ens",
      cached: true,
    };
  }

  // Step 2: Call ATV API (partner key — no x402 payment needed)
  try {
    const apiKey = process.env.ATV_API_KEY;
    const endpoint =
      process.env.ATV_ENDPOINT || "https://api.web3identity.com/api/reverse";
    if (!apiKey) {
      return { status: "error", reason: "ATV_API_KEY not configured" };
    }

    const url = `${endpoint}/${normalized}`;
    const response = await fetch(url, {
      headers: { "X-API-Key": apiKey },
      signal: AbortSignal.timeout(10000),
    });

    // Check credits remaining
    const creditsRemaining = response.headers.get("X-Credits-Remaining");
    if (creditsRemaining !== null) {
      const credits = parseInt(creditsRemaining);
      if (credits < 500) {
        console.warn(`[ATV Identity] ⚠️ LOW CREDITS: ${credits} remaining`);
      }
    }

    if (!response.ok) {
      console.error(
        "[ATV Identity] API error:",
        response.status,
        response.statusText,
      );
      return { status: "error", reason: `API returned ${response.status}` };
    }

    const data = await response.json();
    const result = Array.isArray(data) ? data[0] : data;

    const identity = {
      ens_name: result.ens_name || result.name || result.ens || null,
      twitter: result.twitter || result.social?.twitter || null,
      github: result.github || result.social?.github || null,
    };

    // Step 3: Cache result
    db()
      .prepare(
        `
      INSERT OR REPLACE INTO identity_cache (address, ens_name, twitter, github, resolved_at, expires_at)
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now', '+24 hours'))
    `,
      )
      .run(normalized, identity.ens_name, identity.twitter, identity.github);

    // Step 4: Log credit usage
    db()
      .prepare(
        `
      INSERT INTO x402_payments (service, amount_usd, tx_hash)
      VALUES (?, ?, ?)
    `,
      )
      .run(
        "atv-partner",
        0.008,
        `credits_remaining:${creditsRemaining || "unknown"}`,
      );

    return {
      ens_name: identity.ens_name,
      twitter: identity.twitter,
      github: identity.github,
      source: "atv-ens",
      cached: false,
      credits_remaining: creditsRemaining ? parseInt(creditsRemaining) : null,
    };
  } catch (err) {
    console.error("[ATV Identity] Resolve error:", err.message);
    return { status: "error", reason: err.message };
  }
}

/**
 * Score identity result — returns adjustment and reason
 * - ENS + (twitter OR github) = +5 IDENTITY_VERIFIED
 * - ENS only = +3 ENS_HOLDER
 * - No ENS = -3 ANON_DEPLOYER
 */
function scoreIdentity(identityResult) {
  if (
    !identityResult ||
    identityResult.status === "error" ||
    identityResult.status === "disabled"
  ) {
    return { adjustment: 0, reason: "IDENTITY_UNAVAILABLE" };
  }

  if (identityResult.status === "payment_required") {
    return { adjustment: 0, reason: "IDENTITY_PAYMENT_REQUIRED" };
  }

  const { ens_name, twitter, github } = identityResult;

  if (ens_name && (twitter || github)) {
    return { adjustment: 5, reason: "IDENTITY_VERIFIED" };
  }

  if (ens_name) {
    return { adjustment: 3, reason: "ENS_HOLDER" };
  }

  return { adjustment: -3, reason: "ANON_DEPLOYER" };
}

/**
 * Get recent x402 payment log entries
 */
function getPaymentLog(limit = 50) {
  return db()
    .prepare(
      `SELECT id, service, amount_usd, tx_hash, created_at
     FROM x402_payments
     ORDER BY created_at DESC
     LIMIT ?`,
    )
    .all(limit);
}

module.exports = {
  initIdentityTables,
  resolveIdentity,
  scoreIdentity,
  getCachedIdentity,
  getPaymentLog,
};
