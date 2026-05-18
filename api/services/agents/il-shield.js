/**
 * IL Shield Agent — DeFi Impermanent Loss Risk via Flying Whale x402
 *
 * Sub-score #12: Fetches IL risk data from Flying Whale's IL Shield endpoint.
 * Applied as a post-composite adjustment (not a weighted sub-agent).
 *
 * Scoring:
 *   IL risk >10%  → -5 penalty
 *   IL risk 5-10% → -2 penalty
 *   IL risk <5%   → +3 bonus (stable LP = safer token)
 *   No LP data    → 0 (neutral, no penalty)
 *   Endpoint down → 0 (graceful degradation)
 *
 * Cost: 0.001 STX per call via x402
 * Cache: 1h TTL per token address
 * Feature flag: ILSHIELD_ENABLED
 *
 * Buzz BD Agent v9.0 | Flying Whale Partnership
 */

const { feature } = require("../../lib/feature-flags");

const IL_SHIELD_BASE =
  "https://flying-whale-il-shield-x402.flying-whale-ai.workers.dev";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const TIMEOUT_MS = 10000; // 10s

// In-memory cache: address -> { data, ts }
const cache = new Map();

/**
 * Check IL risk for a token address
 * @param {string} address - Token contract address
 * @param {string} chain - Chain name
 * @returns {{ adjustment: number, ilRisk: number|null, status: string, source: string }}
 */
async function checkILRisk(address, chain) {
  if (!feature("ILSHIELD_ENABLED")) {
    return {
      adjustment: 0,
      ilRisk: null,
      status: "disabled",
      source: "feature-flag",
    };
  }

  // Check cache
  const cacheKey = `${chain}:${address}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return { ...cached.data, source: "cache" };
  }

  try {
    const url = `${IL_SHIELD_BASE}/api/il-shield/status?address=${encodeURIComponent(address)}&chain=${encodeURIComponent(chain)}`;
    const resp = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-PAYMENT-TOKEN-TYPE": "STX",
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    // x402 payment required — endpoint is gated
    if (resp.status === 402) {
      // In production, this would go through the x402 payment flow.
      // For now, log and return neutral (no penalty, no bonus).
      console.log(
        `[IL-SHIELD] 402 Payment Required for ${address} — x402 flow not yet wired`,
      );
      return {
        adjustment: 0,
        ilRisk: null,
        status: "payment_required",
        source: "il-shield",
      };
    }

    if (!resp.ok) {
      console.log(`[IL-SHIELD] Error ${resp.status} for ${address}`);
      return {
        adjustment: 0,
        ilRisk: null,
        status: "error",
        source: "il-shield",
      };
    }

    const data = await resp.json();
    const ilRisk = parseFloat(
      data.il_risk_pct || data.ilRisk || data.risk || 0,
    );

    let adjustment = 0;
    let status = "neutral";

    if (ilRisk > 10) {
      adjustment = -5;
      status = "high_risk";
    } else if (ilRisk > 5) {
      adjustment = -2;
      status = "medium_risk";
    } else if (ilRisk >= 0 && data.has_lp) {
      adjustment = 3;
      status = "low_risk";
    }

    const result = { adjustment, ilRisk, status, source: "il-shield" };
    cache.set(cacheKey, { data: result, ts: Date.now() });
    return result;
  } catch (err) {
    console.log(`[IL-SHIELD] Failed for ${address}: ${err.message}`);
    return {
      adjustment: 0,
      ilRisk: null,
      status: "error",
      source: "il-shield",
    };
  }
}

/**
 * Clear cache (for testing)
 */
function clearCache() {
  cache.clear();
}

module.exports = { checkILRisk, clearCache };
