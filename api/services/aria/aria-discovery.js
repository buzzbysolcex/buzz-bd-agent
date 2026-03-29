/**
 * ARIA Discovery Engine — Multi-Source Token Discovery
 * Calls DexScreener trending/boosts, Jupiter recent tokens, CoinGecko trending.
 * Returns normalized token array in unified schema.
 *
 * Buzz BD Agent | ARIA Service Layer
 */

const { fromDexScreener, fromJupiter, fromCoinGecko, deduplicateTokens } = require('./aria-normalizer');

const TIMEOUT_MS = 15000;

// ─── Source: DexScreener Trending ────────────────────
async function fetchDexScreenerTrending() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch('https://api.dexscreener.com/token-boosts/latest/v1', {
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!res.ok) return { success: false, error: `DexScreener ${res.status}`, tokens: [] };
    const data = await res.json();
    const pairs = Array.isArray(data) ? data : [];
    const tokens = pairs.map(p => fromDexScreener(p, 'boost'));
    return { success: true, source: 'dexscreener_boosts', count: tokens.length, tokens };
  } catch (err) {
    return { success: false, error: err.message.substring(0, 200), tokens: [] };
  }
}

async function fetchDexScreenerLatest() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch('https://api.dexscreener.com/token-profiles/latest/v1', {
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!res.ok) return { success: false, error: `DexScreener profiles ${res.status}`, tokens: [] };
    const data = await res.json();
    const profiles = Array.isArray(data) ? data : [];
    const tokens = profiles.map(p => fromDexScreener(p, 'new_profile'));
    return { success: true, source: 'dexscreener_profiles', count: tokens.length, tokens };
  } catch (err) {
    return { success: false, error: err.message.substring(0, 200), tokens: [] };
  }
}

// ─── Source: Jupiter Recent Tokens ───────────────────
async function fetchJupiterRecent() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch('https://tokens.jup.ag/tokens?tags=verified', {
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!res.ok) return { success: false, error: `Jupiter ${res.status}`, tokens: [] };
    const data = await res.json();
    const items = Array.isArray(data) ? data.slice(0, 100) : [];
    const tokens = items.map(j => fromJupiter(j));
    return { success: true, source: 'jupiter', count: tokens.length, tokens };
  } catch (err) {
    return { success: false, error: err.message.substring(0, 200), tokens: [] };
  }
}

// ─── Source: CoinGecko Trending ──────────────────────
async function fetchCoinGeckoTrending() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch('https://api.coingecko.com/api/v3/search/trending', {
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!res.ok) return { success: false, error: `CoinGecko ${res.status}`, tokens: [] };
    const data = await res.json();
    const coins = data.coins || [];
    const tokens = coins.map(c => fromCoinGecko(c));
    return { success: true, source: 'coingecko', count: tokens.length, tokens };
  } catch (err) {
    return { success: false, error: err.message.substring(0, 200), tokens: [] };
  }
}

// ─── Main Discovery Orchestrator ─────────────────────
/**
 * Run all discovery sources in parallel, return deduplicated unified tokens.
 * @param {Object} opts - { sources: ['dexscreener', 'jupiter', 'coingecko'] }
 * @returns {{ tokens: Array, sources: Object, discovered_at: string }}
 */
async function discover(opts = {}) {
  const enabledSources = opts.sources || ['dexscreener', 'jupiter', 'coingecko'];
  const started = Date.now();

  const tasks = [];
  if (enabledSources.includes('dexscreener')) {
    tasks.push(fetchDexScreenerTrending());
    tasks.push(fetchDexScreenerLatest());
  }
  if (enabledSources.includes('jupiter')) {
    tasks.push(fetchJupiterRecent());
  }
  if (enabledSources.includes('coingecko')) {
    tasks.push(fetchCoinGeckoTrending());
  }

  const results = await Promise.allSettled(tasks);

  const allTokens = [];
  const sourceStatus = {};

  for (const r of results) {
    if (r.status === 'fulfilled' && r.value) {
      const v = r.value;
      sourceStatus[v.source || 'unknown'] = { success: v.success, count: v.count || 0, error: v.error || null };
      if (v.tokens?.length) allTokens.push(...v.tokens);
    } else if (r.status === 'rejected') {
      sourceStatus['error'] = { success: false, error: r.reason?.message || 'unknown' };
    }
  }

  const deduplicated = deduplicateTokens(allTokens);
  const duration_ms = Date.now() - started;

  return {
    tokens: deduplicated,
    total: deduplicated.length,
    sources: sourceStatus,
    discovered_at: new Date().toISOString(),
    duration_ms
  };
}

module.exports = {
  discover,
  fetchDexScreenerTrending,
  fetchDexScreenerLatest,
  fetchJupiterRecent,
  fetchCoinGeckoTrending
};
