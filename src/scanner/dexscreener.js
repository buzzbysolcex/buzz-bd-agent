/**
 * DexScreener API Integration
 * Fetches token data from DexScreener for multi-chain scanning
 */

const DEXSCREENER_API = 'https://api.dexscreener.com/latest/dex';

/**
 * Fetch top tokens by chain
 * @param {string} chain - Chain identifier (solana, ethereum, bsc)
 * @param {number} limit - Number of tokens to fetch
 * @returns {Promise<Array>} Token data
 */
async function fetchTopTokens(chain, limit = 100) {
  const response = await fetch(`${DEXSCREENER_API}/tokens/${chain}`);
  const data = await response.json();
  
  return data.pairs
    .slice(0, limit)
    .map(pair => ({
      address: pair.baseToken.address,
      name: pair.baseToken.name,
      symbol: pair.baseToken.symbol,
      chain: chain,
      price: parseFloat(pair.priceUsd) || 0,
      marketCap: parseFloat(pair.marketCap) || 0,
      liquidity: parseFloat(pair.liquidity?.usd) || 0,
      volume24h: parseFloat(pair.volume?.h24) || 0,
      priceChange24h: parseFloat(pair.priceChange?.h24) || 0,
      txns24h: (pair.txns?.h24?.buys || 0) + (pair.txns?.h24?.sells || 0),
      pairAddress: pair.pairAddress,
      dexId: pair.dexId,
      url: pair.url,
      createdAt: pair.pairCreatedAt
    }));
}

/**
 * Search for specific token
 * @param {string} query - Token name, symbol, or address
 * @returns {Promise<Array>} Matching tokens
 */
async function searchToken(query) {
  const response = await fetch(`${DEXSCREENER_API}/search?q=${encodeURIComponent(query)}`);
  const data = await response.json();
  return data.pairs || [];
}

/**
 * Get token by address
 * @param {string} chain - Chain identifier
 * @param {string} address - Token contract address
 * @returns {Promise<Object|null>} Token data or null
 */
async function getTokenByAddress(chain, address) {
  const response = await fetch(`${DEXSCREENER_API}/tokens/${address}`);
  const data = await response.json();
  
  const pair = data.pairs?.find(p => 
    p.chainId === chain || p.baseToken.address === address
  );
  
  return pair ? {
    address: pair.baseToken.address,
    name: pair.baseToken.name,
    symbol: pair.baseToken.symbol,
    chain: pair.chainId,
    marketCap: parseFloat(pair.marketCap) || 0,
    liquidity: parseFloat(pair.liquidity?.usd) || 0,
    volume24h: parseFloat(pair.volume?.h24) || 0,
    holders: pair.holders || null,
    url: pair.url
  } : null;
}

/**
 * Get trending tokens (boosted on DexScreener)
 * @returns {Promise<Array>} Trending tokens
 */
async function getTrending() {
  // DexScreener trending is visible on their site
  // For now, we sort by volume and recent creation
  const chains = ['solana', 'ethereum', 'bsc'];
  const allTokens = [];
  
  for (const chain of chains) {
    const tokens = await fetchTopTokens(chain, 50);
    allTokens.push(...tokens);
  }
  
  // Sort by 24h volume
  return allTokens
    .sort((a, b) => b.volume24h - a.volume24h)
    .slice(0, 20);
}

/**
 * Calculate age in days from creation timestamp
 * @param {number} createdAt - Unix timestamp
 * @returns {number} Age in days
 */
function calculateAge(createdAt) {
  if (!createdAt) return null;
  const now = Date.now();
  const created = new Date(createdAt).getTime();
  return Math.floor((now - created) / (1000 * 60 * 60 * 24));
}

module.exports = {
  fetchTopTokens,
  searchToken,
  getTokenByAddress,
  getTrending,
  calculateAge,
  DEXSCREENER_API
};
