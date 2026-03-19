/**
 * Financial Datasets MCP Client — Intel Source #24
 * Base URL: https://api.financialdatasets.ai
 * Auth: FINANCIAL_DATASETS_API_KEY env var
 *
 * Provides historical crypto price data for simulation calibration.
 * Buzz BD Agent v7.6.0 | MiroFish Integration
 */

const https = require('https');

const BASE_URL = 'https://api.financialdatasets.ai';
const MAX_RETRIES = 3;

// In-memory cache for tickers (24h TTL)
let tickerCache = { data: null, expiresAt: 0 };

/**
 * Make an authenticated GET request with exponential backoff on 429
 */
async function apiGet(path, retries = 0) {
  const apiKey = process.env.FINANCIAL_DATASETS_API_KEY;
  if (!apiKey) throw new Error('FINANCIAL_DATASETS_API_KEY not configured');

  const { URL } = require('url');
  const url = new URL(path, BASE_URL);

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'X-API-Key': apiKey,
        'Accept': 'application/json',
      },
      timeout: 15000,
    }, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');

        // Rate limited — retry with backoff
        if (res.statusCode === 429 && retries < MAX_RETRIES) {
          const delay = Math.pow(2, retries) * 1000; // 1s, 2s, 4s
          console.warn(`[FinDatasets] 429 rate limited — retry in ${delay}ms (attempt ${retries + 1}/${MAX_RETRIES})`);
          setTimeout(() => apiGet(path, retries + 1).then(resolve).catch(reject), delay);
          return;
        }

        if (res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}: ${raw.slice(0, 200)}`));
          return;
        }

        try {
          resolve(JSON.parse(raw));
        } catch {
          reject(new Error('Failed to parse JSON response'));
        }
      });
    });

    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    req.on('error', (err) => reject(err));
    req.end();
  });
}

/**
 * Get current crypto price snapshot
 */
async function getCryptoPrice(ticker) {
  try {
    return await apiGet(`/crypto/prices/snapshot/?ticker=${encodeURIComponent(ticker)}`);
  } catch (err) {
    console.error(`[FinDatasets] getCryptoPrice(${ticker}) failed:`, err.message);
    return null;
  }
}

/**
 * Get historical OHLCV crypto prices
 */
async function getHistoricalCryptoPrices(ticker, startDate, endDate, interval = 'day') {
  try {
    const params = new URLSearchParams({ ticker, interval, start_date: startDate, end_date: endDate });
    return await apiGet(`/crypto/prices/?${params.toString()}`);
  } catch (err) {
    console.error(`[FinDatasets] getHistoricalCryptoPrices(${ticker}) failed:`, err.message);
    return null;
  }
}

/**
 * Get available crypto tickers (cached 24h in-memory)
 */
async function getAvailableCryptoTickers() {
  const now = Date.now();
  if (tickerCache.data && now < tickerCache.expiresAt) {
    return tickerCache.data;
  }
  try {
    const data = await apiGet('/crypto/tickers/');
    tickerCache = { data, expiresAt: now + 24 * 60 * 60 * 1000 };
    return data;
  } catch (err) {
    console.error('[FinDatasets] getAvailableCryptoTickers failed:', err.message);
    return null;
  }
}

/**
 * Get company/crypto news for a ticker
 */
async function getCompanyNews(ticker, limit = 10) {
  try {
    return await apiGet(`/news/?ticker=${encodeURIComponent(ticker)}&limit=${limit}`);
  } catch (err) {
    console.error(`[FinDatasets] getCompanyNews(${ticker}) failed:`, err.message);
    return null;
  }
}

/**
 * Health check — verify API connectivity
 */
async function healthCheck() {
  try {
    const result = await apiGet('/crypto/tickers/');
    return { status: 'ok', configured: true, tickers: Array.isArray(result) ? result.length : 0 };
  } catch (err) {
    return { status: 'error', configured: !!process.env.FINANCIAL_DATASETS_API_KEY, error: err.message };
  }
}

module.exports = {
  getCryptoPrice,
  getHistoricalCryptoPrices,
  getAvailableCryptoTickers,
  getCompanyNews,
  healthCheck,
};
