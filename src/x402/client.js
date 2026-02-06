/**
 * x402 Payment Client
 * Handles autonomous micropayments for premium intelligence APIs
 */

/**
 * x402 Payment Configuration
 * NOTE: Actual credentials stored in environment variables
 */
const X402_CONFIG = {
  networks: {
    solana: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    base: 'eip155:8453'
  },
  dailyBudget: 0.30, // $0.30 USDC per day
  maxPerCall: 0.15,  // $0.15 USDC max per call
  preferredChain: 'auto'
};

/**
 * Premium intelligence endpoints
 */
const PREMIUM_APIS = {
  einsteinAi: {
    name: 'Einstein AI',
    baseUrl: 'https://einstein-ai.com/api',
    endpoints: {
      whales: '/whales',
      accumulation: '/accumulation',
      walletFlow: '/wallet-flow'
    },
    costPerCall: 0.10
  },
  gloriaAi: {
    name: 'Gloria AI',
    baseUrl: 'https://gloria-ai.com/api',
    endpoints: {
      news: '/news',
      sentiment: '/sentiment',
      catalysts: '/catalysts'
    },
    costPerCall: 0.10
  }
};

/**
 * Track daily spending
 */
let dailySpend = {
  date: new Date().toISOString().split('T')[0],
  amount: 0,
  calls: []
};

/**
 * Make an x402 payment request
 * Uses AgentWallet's x402/fetch for one-step payment proxy
 * 
 * @param {string} url - Target API URL
 * @param {Object} options - Request options
 * @returns {Promise<Object>} API response
 */
async function x402Fetch(url, options = {}) {
  const { method = 'POST', body = {}, dryRun = false } = options;
  
  // Check daily budget
  if (!dryRun && dailySpend.amount >= X402_CONFIG.dailyBudget) {
    throw new Error('Daily budget exceeded. Waiting for reset.');
  }
  
  // AgentWallet x402/fetch endpoint
  // NOTE: USERNAME and TOKEN from environment
  const walletUrl = `https://agentwallet.mcpay.tech/api/wallets/${process.env.AGENTWALLET_USERNAME}/actions/x402/fetch`;
  
  const response = await fetch(walletUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.AGENTWALLET_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      url,
      method,
      body,
      dryRun,
      preferredChain: X402_CONFIG.preferredChain
    })
  });
  
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'x402 payment failed');
  }
  
  // Track spending (if not dry run)
  if (!dryRun && result.paid) {
    trackSpending(result.payment);
  }
  
  return result;
}

/**
 * Track spending for budget management
 */
function trackSpending(payment) {
  const today = new Date().toISOString().split('T')[0];
  
  // Reset if new day
  if (dailySpend.date !== today) {
    dailySpend = { date: today, amount: 0, calls: [] };
  }
  
  // Parse amount (e.g., "0.10 USDC" -> 0.10)
  const amount = parseFloat(payment.amountFormatted) || 0;
  
  dailySpend.amount += amount;
  dailySpend.calls.push({
    timestamp: new Date().toISOString(),
    amount,
    chain: payment.chain,
    recipient: payment.recipient
  });
}

/**
 * Get whale tracking data from Einstein AI
 * @param {string} chain - Chain to track (solana, ethereum, bsc)
 * @param {string} timeframe - Timeframe (1h, 24h, 7d)
 */
async function getWhaleData(chain = 'solana', timeframe = '24h') {
  const api = PREMIUM_APIS.einsteinAi;
  return x402Fetch(`${api.baseUrl}${api.endpoints.whales}`, {
    method: 'POST',
    body: { chain, timeframe }
  });
}

/**
 * Get accumulation signals from Einstein AI
 * @param {string} tokenAddress - Token contract address
 */
async function getAccumulationSignals(tokenAddress) {
  const api = PREMIUM_APIS.einsteinAi;
  return x402Fetch(`${api.baseUrl}${api.endpoints.accumulation}`, {
    method: 'POST',
    body: { address: tokenAddress }
  });
}

/**
 * Get breaking news from Gloria AI
 * @param {Array<string>} keywords - Keywords to filter
 */
async function getBreakingNews(keywords = ['solana', 'crypto', 'token']) {
  const api = PREMIUM_APIS.gloriaAi;
  return x402Fetch(`${api.baseUrl}${api.endpoints.news}`, {
    method: 'POST',
    body: { keywords, limit: 10 }
  });
}

/**
 * Get catalyst detection from Gloria AI
 * @param {string} tokenSymbol - Token symbol
 */
async function getCatalysts(tokenSymbol) {
  const api = PREMIUM_APIS.gloriaAi;
  return x402Fetch(`${api.baseUrl}${api.endpoints.catalysts}`, {
    method: 'POST',
    body: { symbol: tokenSymbol }
  });
}

/**
 * Preview cost without paying
 */
async function previewCost(url, body = {}) {
  return x402Fetch(url, { method: 'POST', body, dryRun: true });
}

/**
 * Get current spending status
 */
function getSpendingStatus() {
  return {
    ...dailySpend,
    budgetRemaining: X402_CONFIG.dailyBudget - dailySpend.amount,
    callsRemaining: Math.floor((X402_CONFIG.dailyBudget - dailySpend.amount) / 0.10)
  };
}

module.exports = {
  x402Fetch,
  getWhaleData,
  getAccumulationSignals,
  getBreakingNews,
  getCatalysts,
  previewCost,
  getSpendingStatus,
  X402_CONFIG,
  PREMIUM_APIS
};
