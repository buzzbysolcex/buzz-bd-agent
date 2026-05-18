/**
 * ARIA Filter — BD Sweet Spot Qualification
 * Filters normalized tokens against BD qualification criteria.
 *
 * Sweet Spot:
 *   - MCap circulating $500K - $50M
 *   - Liquidity > $100K
 *   - Age > 7 days
 *   - Not listed on Binance/OKX/Bybit (exchange_count < 10)
 *   - Not a stablecoin
 *   - No honeypot flag
 *
 * Buzz BD Agent | ARIA Service Layer
 */

const STABLECOIN_SYMBOLS = new Set([
  "USDT",
  "USDC",
  "DAI",
  "BUSD",
  "TUSD",
  "FRAX",
  "USDP",
  "GUSD",
  "LUSD",
  "sUSD",
  "USDD",
  "PYUSD",
  "USDe",
  "crvUSD",
  "GHO",
  "FDUSD",
  "ZUSD",
  "DOLA",
  "MIM",
  "UST",
  "EURS",
  "EURT",
  "agEUR",
]);

const TIER1_EXCHANGES = new Set([
  "binance",
  "okx",
  "bybit",
  "coinbase",
  "kraken",
  "kucoin",
  "htx",
  "gate",
]);

const DEFAULT_CRITERIA = {
  mcap_min: 500000, // $500K
  mcap_max: 50000000, // $50M
  liquidity_min: 100000, // $100K
  age_min_days: 7,
  exchange_count_max: 10,
  exclude_stablecoins: true,
  exclude_honeypots: true,
};

/**
 * Check if a single token passes the BD Sweet Spot filter.
 * @param {Object} token - Normalized ARIA token
 * @param {Object} criteria - Override default criteria
 * @returns {{ pass: boolean, reasons: string[] }}
 */
function qualifyToken(token, criteria = {}) {
  const c = { ...DEFAULT_CRITERIA, ...criteria };
  const reasons = [];

  // MCap range
  const mcap = token.market?.mcap_circulating;
  if (mcap != null) {
    if (mcap < c.mcap_min) reasons.push(`mcap_too_low:${mcap}`);
    if (mcap > c.mcap_max) reasons.push(`mcap_too_high:${mcap}`);
  }

  // Liquidity floor
  const liq = token.market?.liquidity_usd;
  if (liq != null && liq < c.liquidity_min) {
    reasons.push(`low_liquidity:${liq}`);
  }

  // Pair age
  const age = token.market?.pair_age_days;
  if (age != null && age < c.age_min_days) {
    reasons.push(`too_young:${age}d`);
  }

  // Exchange count (proxy for already-listed on majors)
  const exCount = token.market?.exchange_count;
  if (exCount != null && exCount >= c.exchange_count_max) {
    reasons.push(`too_many_exchanges:${exCount}`);
  }

  // Check for tier-1 exchange listing
  const exchanges = token.market?.exchanges || [];
  for (const ex of exchanges) {
    if (TIER1_EXCHANGES.has(ex.toLowerCase())) {
      reasons.push(`tier1_listed:${ex}`);
      break;
    }
  }

  // Stablecoin check
  if (c.exclude_stablecoins && token.symbol) {
    if (STABLECOIN_SYMBOLS.has(token.symbol.toUpperCase())) {
      reasons.push("stablecoin");
    }
  }

  // Honeypot check
  if (c.exclude_honeypots && token.safety?.honeypot === true) {
    reasons.push("honeypot");
  }

  return {
    pass: reasons.length === 0,
    reasons,
  };
}

/**
 * Filter an array of tokens through the BD Sweet Spot.
 * @param {Array} tokens - Normalized ARIA tokens
 * @param {Object} criteria - Override default criteria
 * @returns {{ qualified: Array, rejected: Array, stats: Object }}
 */
function filterTokens(tokens, criteria = {}) {
  const qualified = [];
  const rejected = [];

  for (const token of tokens) {
    const result = qualifyToken(token, criteria);
    if (result.pass) {
      qualified.push(token);
    } else {
      rejected.push({ token, reasons: result.reasons });
    }
  }

  return {
    qualified,
    rejected,
    stats: {
      total: tokens.length,
      qualified: qualified.length,
      rejected: rejected.length,
      pass_rate:
        tokens.length > 0
          ? parseFloat(((qualified.length / tokens.length) * 100).toFixed(1))
          : 0,
    },
  };
}

module.exports = {
  qualifyToken,
  filterTokens,
  DEFAULT_CRITERIA,
  STABLECOIN_SYMBOLS,
  TIER1_EXCHANGES,
};
