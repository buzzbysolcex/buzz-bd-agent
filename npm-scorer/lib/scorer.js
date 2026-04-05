/**
 * Buzz Token Scorer — Library
 * Zero dependencies. Uses native Node.js fetch (18+).
 *
 * API: https://api.buzzbd.ai/api/score/{address}
 * Leaderboard: https://api.buzzbd.ai/api/leaderboard
 * DexScreener fallback for local scoring.
 */

const API_BASE = process.env.BUZZ_API_URL || 'https://api.buzzbd.ai';
const DEXSCREENER_API = 'https://api.dexscreener.com';

// --- Scoring Rules (v2_8rules + 3 new) ---

const RULES = {
  FDV_GAP_PENALTY: {
    name: 'FDV Gap Penalty',
    check: (data) => {
      if (!data.fdv || !data.marketCap) return { score: 0, triggered: false };
      const gap = data.fdv / data.marketCap;
      if (gap > 5) return { score: -15, triggered: true, detail: `FDV/mcap gap: ${gap.toFixed(1)}x` };
      if (gap > 3) return { score: -8, triggered: true, detail: `FDV/mcap gap: ${gap.toFixed(1)}x` };
      return { score: 0, triggered: false };
    }
  },

  STABLECOIN_EXCLUSION: {
    name: 'Stablecoin Exclusion',
    check: (data) => {
      const stables = ['USDT', 'USDC', 'DAI', 'BUSD', 'TUSD', 'FRAX', 'LUSD', 'GUSD', 'USDP', 'PYUSD'];
      if (stables.includes(data.symbol?.toUpperCase())) {
        return { score: -100, triggered: true, detail: 'Stablecoin excluded' };
      }
      return { score: 0, triggered: false };
    }
  },

  GHOST_TOKEN: {
    name: 'Ghost Token Exclusion',
    check: (data) => {
      if (data.txns24h < 10 && data.volume24h < 1000) {
        return { score: -100, triggered: true, detail: 'No real activity' };
      }
      return { score: 0, triggered: false };
    }
  },

  CONTRADICTORY_AUDIT: {
    name: 'Contradictory Audit Hold',
    check: (data) => {
      if (data.securityFlags && data.securityFlags.length > 0 && data.securityClean) {
        return { score: -20, triggered: true, detail: 'Conflicting audit data' };
      }
      return { score: 0, triggered: false };
    }
  },

  SECURITY_PENALTY: {
    name: 'Security Penalty',
    check: (data) => {
      const flags = data.securityFlags || [];
      if (flags.includes('honeypot')) return { score: -50, triggered: true, detail: 'Honeypot detected' };
      if (flags.length > 2) return { score: -25, triggered: true, detail: `${flags.length} security flags` };
      if (flags.length > 0) return { score: -10, triggered: true, detail: flags.join(', ') };
      return { score: 0, triggered: false };
    }
  },

  LIQUIDITY_CROSSREF: {
    name: 'Liquidity Cross-Ref',
    check: (data) => {
      if (!data.liquidity || data.liquidity < 10000) {
        return { score: -20, triggered: true, detail: `Low liquidity: $${(data.liquidity || 0).toLocaleString()}` };
      }
      if (data.liquidity > 1000000) return { score: 10, triggered: true, detail: 'Strong liquidity' };
      return { score: 0, triggered: false };
    }
  },

  AGE_BONUS: {
    name: 'Age Bonus',
    check: (data) => {
      if (data.ageDays > 365) return { score: 10, triggered: true, detail: `${data.ageDays} days old` };
      if (data.ageDays > 90) return { score: 5, triggered: true, detail: `${data.ageDays} days old` };
      return { score: 0, triggered: false };
    }
  },

  VOLUME_THRESHOLD: {
    name: 'Volume Threshold',
    check: (data) => {
      if (data.volume24h < 5000) {
        return { score: -15, triggered: true, detail: `Low volume: $${(data.volume24h || 0).toLocaleString()}` };
      }
      if (data.volume24h > 1000000) return { score: 10, triggered: true, detail: 'High volume' };
      return { score: 0, triggered: false };
    }
  },

  GHOST_VOLUME: {
    name: 'Ghost Volume',
    check: (data) => {
      // Wash trading detection: high volume but very few unique transactions
      if (data.volume24h > 100000 && data.txns24h < 50) {
        return { score: -20, triggered: true, detail: 'Suspected wash trading' };
      }
      return { score: 0, triggered: false };
    }
  },

  CTO_FLAG: {
    name: 'CTO Flag',
    check: (data) => {
      // Community takeover indicator
      if (data.cto || data.description?.toLowerCase().includes('community takeover')) {
        return { score: -10, triggered: true, detail: 'Community takeover detected' };
      }
      return { score: 0, triggered: false };
    }
  },

  VOLUME_LIQUIDITY_RATIO: {
    name: 'Volume/Liquidity Ratio',
    check: (data) => {
      if (!data.liquidity || data.liquidity === 0) return { score: 0, triggered: false };
      const ratio = data.volume24h / data.liquidity;
      if (ratio > 10) {
        return { score: -15, triggered: true, detail: `Vol/liq ratio: ${ratio.toFixed(1)}x (suspicious)` };
      }
      return { score: 0, triggered: false };
    }
  },
};

// --- Core Scoring Function ---

function calculateScore(tokenData) {
  let baseScore = 50; // Start at neutral
  const triggered = [];
  const flags = [];

  // Apply all rules
  for (const [ruleName, rule] of Object.entries(RULES)) {
    const result = rule.check(tokenData);
    if (result.triggered) {
      baseScore += result.score;
      triggered.push(ruleName);
      if (result.score < -20) flags.push(ruleName);
    }
  }

  // Bonus for strong fundamentals
  if (tokenData.marketCap > 10000000) baseScore += 10;
  if (tokenData.holders > 10000) baseScore += 5;
  if (tokenData.website && tokenData.twitter) baseScore += 5;

  // Clamp 0-100
  const score = Math.max(0, Math.min(100, baseScore));

  let classification;
  if (score >= 85) classification = 'HOT';
  else if (score >= 70) classification = 'WARM';
  else if (score >= 50) classification = 'COLD';
  else classification = 'REJECTED';

  return {
    score,
    classification,
    flags,
    rules_triggered: triggered,
    breakdown: {
      liquidity: { score: Math.min(100, (tokenData.liquidity || 0) / 10000), value: `$${(tokenData.liquidity || 0).toLocaleString()}` },
      volume_24h: { score: Math.min(100, (tokenData.volume24h || 0) / 50000), value: `$${(tokenData.volume24h || 0).toLocaleString()}` },
      security: { score: flags.length === 0 ? 90 : Math.max(0, 90 - flags.length * 20), penalties: flags },
      deployer: { score: tokenData.identityVerified ? 80 : 40, identity: tokenData.identityVerified ? 'VERIFIED' : 'ANON' },
      age_days: tokenData.ageDays || 0,
      fdv_gap: tokenData.fdv && tokenData.marketCap ? (tokenData.fdv / tokenData.marketCap).toFixed(1) : 'N/A',
    },
    llm_cost: '$0.00',
    scored_at: new Date().toISOString(),
  };
}

// --- API Functions ---

async function scoreToken(tokenInput, chain) {
  // Try Buzz API first
  try {
    const url = `${API_BASE}/api/score/${encodeURIComponent(tokenInput)}${chain ? `?chain=${chain}` : ''}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (e) {
    // Fallback to local scoring via DexScreener
  }

  // Fallback: DexScreener + local scoring
  const isAddress = tokenInput.startsWith('0x') || tokenInput.length > 20;
  const searchUrl = isAddress
    ? `${DEXSCREENER_API}/token-pairs/v1/ethereum/${tokenInput}`
    : `${DEXSCREENER_API}/latest/dex/search?q=${encodeURIComponent(tokenInput)}`;

  const res = await fetch(searchUrl, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`DexScreener API error: ${res.status}`);
  const data = await res.json();

  const pairs = data.pairs || data || [];
  if (pairs.length === 0) throw new Error(`No pairs found for ${tokenInput}`);

  const pair = pairs[0];
  const tokenData = {
    symbol: pair.baseToken?.symbol || tokenInput,
    name: pair.baseToken?.name || tokenInput,
    chain: pair.chainId || chain || 'unknown',
    address: pair.baseToken?.address || tokenInput,
    marketCap: pair.marketCap || pair.fdv || 0,
    fdv: pair.fdv || 0,
    volume24h: pair.volume?.h24 || 0,
    liquidity: pair.liquidity?.usd || 0,
    txns24h: (pair.txns?.h24?.buys || 0) + (pair.txns?.h24?.sells || 0),
    ageDays: pair.pairCreatedAt ? Math.floor((Date.now() - pair.pairCreatedAt) / 86400000) : 0,
    securityFlags: [],
    securityClean: true,
    website: pair.info?.websites?.length > 0,
    twitter: pair.info?.socials?.some(s => s.type === 'twitter'),
    holders: pair.holders || 0,
    cto: false,
    identityVerified: false,
  };

  const result = calculateScore(tokenData);
  return {
    token: tokenData.symbol,
    name: tokenData.name,
    address: tokenData.address,
    chain: tokenData.chain,
    ...result,
  };
}

async function fetchLeaderboard(top = 20) {
  try {
    const url = `${API_BASE}/api/leaderboard?limit=${top}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (res.ok) return await res.json();
  } catch (e) {
    // Fallback
  }
  throw new Error('Leaderboard unavailable — visit https://buzzbd.ai/scores');
}

module.exports = { scoreToken, fetchLeaderboard, calculateScore, RULES };
