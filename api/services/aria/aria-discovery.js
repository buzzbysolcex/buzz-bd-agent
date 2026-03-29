/**
 * ARIA Discovery Engine — Multi-Source Token Discovery
 * Calls DexScreener trending/boosts, Jupiter recent tokens, CoinGecko trending.
 * Returns normalized token array in unified schema.
 *
 * Buzz BD Agent | ARIA Service Layer
 */

const { fromDexScreener, fromJupiter, fromCoinGecko, fromBagsFm, fromColosseum, deduplicateTokens, emptyToken } = require('./aria-normalizer');

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

// ─── Source: Jupiter — DISABLED (requires auth as of Mar 2026) ───
async function fetchJupiterRecent() {
  return { success: false, source: 'jupiter', count: 0, error: 'Jupiter API requires auth — disabled', tokens: [] };
}

// ─── Source: Bags.fm — Graduated Solana Tokens ──────
async function fetchBagsFmGraduated() {
  try {
    const { getDB } = require('../../db');
    const db = getDB();
    // Read from bags_tokens table (populated by bags-scanner cron)
    const rows = db.prepare(`
      SELECT token_mint, name, symbol, twitter, website, status, bags_score, scanned_at
      FROM bags_tokens
      WHERE status = 'graduated' OR damm_v2_pool_key IS NOT NULL
      ORDER BY scanned_at DESC LIMIT 50
    `).all();
    const tokens = rows.map(r => fromBagsFm(r));
    return { success: true, source: 'bags_fm', count: tokens.length, tokens };
  } catch (err) {
    return { success: false, source: 'bags_fm', count: 0, error: err.message.substring(0, 200), tokens: [] };
  }
}

// ─── Source: Colosseum Copilot — Hackathon Projects with Tokens ──
async function fetchColosseumProjects() {
  try {
    const copilot = require('../../lib/colosseum-copilot');
    const status = await copilot.checkStatus();
    if (!status || status.error) return { success: false, source: 'colosseum', count: 0, error: 'Copilot unavailable', tokens: [] };
    const results = await copilot.searchProjects('token launch defi', { hasToken: true }, 20);
    const projects = results?.results || results || [];
    const tokens = (Array.isArray(projects) ? projects : [])
      .filter(p => p.token_address || p.contract_address)
      .map(p => fromColosseum(p));
    return { success: true, source: 'colosseum', count: tokens.length, tokens };
  } catch (err) {
    return { success: false, source: 'colosseum', count: 0, error: err.message.substring(0, 200), tokens: [] };
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
  const enabledSources = opts.sources || ['dexscreener', 'coingecko', 'bags_fm', 'colosseum'];
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
  if (enabledSources.includes('bags_fm')) {
    tasks.push(fetchBagsFmGraduated());
  }
  if (enabledSources.includes('colosseum')) {
    tasks.push(fetchColosseumProjects());
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
