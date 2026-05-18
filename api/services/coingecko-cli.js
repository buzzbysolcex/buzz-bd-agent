/**
 * CoinGecko REST API Service — Intel Source #23
 * Replaces broken CLI wrapper with direct REST API calls
 * FREE tier: 30 calls/min, no API key needed for basic endpoints
 *
 * Buzz BD Agent v7.5.5 | Day 31
 */

const BASE_URL = "https://api.coingecko.com/api/v3";
const RATE_LIMIT_MS = 2500; // 2.5s between calls = ~24/min (under 30 limit)
let lastCallTime = 0;

async function cgFetch(endpoint, params = {}) {
  // Rate limiting
  const now = Date.now();
  const elapsed = now - lastCallTime;
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise((r) => setTimeout(r, RATE_LIMIT_MS - elapsed));
  }
  lastCallTime = Date.now();

  const url = new URL(`${BASE_URL}${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return {
        success: false,
        error: `CoinGecko API ${res.status}: ${res.statusText}`,
        status: res.status,
      };
    }
    const data = await res.json();
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message.substring(0, 200) };
  }
}

async function getPrice(coinId) {
  return cgFetch("/simple/price", {
    ids: coinId,
    vs_currencies: "usd",
    include_24hr_change: "true",
    include_market_cap: "true",
  });
}

async function getTrending() {
  return cgFetch("/search/trending");
}

async function getHistory(coinId, days = 30) {
  return cgFetch(`/coins/${coinId}/market_chart`, {
    vs_currency: "usd",
    days: String(days),
  });
}

async function getMarkets(total = 100) {
  return cgFetch("/coins/markets", {
    vs_currency: "usd",
    order: "market_cap_desc",
    per_page: String(Math.min(total, 250)),
    page: "1",
    sparkline: "false",
  });
}

async function searchCoin(query) {
  return cgFetch("/search", { query });
}

async function getCoinData(coinId) {
  return cgFetch(`/coins/${coinId}`, {
    localization: "false",
    tickers: "false",
    community_data: "true",
    developer_data: "false",
  });
}

function getStatus() {
  return {
    installed: true,
    source: "coingecko-rest-api",
    intel_number: 23,
    mode: "REST API v3",
    rate_limit: "30 calls/min",
  };
}

module.exports = {
  getPrice,
  getTrending,
  getHistory,
  getMarkets,
  searchCoin,
  getCoinData,
  getStatus,
  cgFetch,
};
