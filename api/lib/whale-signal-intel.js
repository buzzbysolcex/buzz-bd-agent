/**
 * Whale Signal Intelligence Module
 * Nansen Hyperliquid smart money perp data
 * Intel Source #17 upgrade — whale flow scoring
 */

const https = require("https");
const { getDB } = require("../db");

const NANSEN_BASE = "https://api.nansen.ai/api/v1";

// ─── API caller ───────────────────────────────────────
async function nansenPost(path, body, timeout = 15000) {
  const apiKey = process.env.NANSEN_API_KEY;
  if (!apiKey) return null; // Graceful degradation — no key = no data

  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const req = https.request(
      {
        hostname: "api.nansen.ai",
        path: `/api/v1${path}`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "Content-Length": Buffer.byteLength(bodyStr),
        },
        timeout,
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString();
          if (res.statusCode >= 400) {
            reject(new Error(`Nansen ${res.statusCode}: ${raw.slice(0, 200)}`));
            return;
          }
          try {
            resolve(JSON.parse(raw));
          } catch {
            resolve(null);
          }
        });
      },
    );
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Nansen timeout"));
    });
    req.on("error", reject);
    req.write(bodyStr);
    req.end();
  });
}

// Log API cost
function logCost(endpoint, success, latencyMs) {
  try {
    const db = getDB();
    db.prepare(
      `INSERT INTO llm_provider_log (provider, model, agent, tokens_in, tokens_out, latency_ms, success, error_message)
      VALUES (?, ?, ?, 0, 0, ?, ?, ?)`,
    ).run(
      "nansen",
      "hyperliquid-api",
      "whale-signal-intel",
      latencyMs,
      success ? 1 : 0,
      success ? null : endpoint,
    );
  } catch (e) {
    /* silent */
  }
}

// ─── Fetch smart money perp trades ───────────────────
async function fetchSmartMoneyPerpTrades() {
  const start = Date.now();
  try {
    const data = await nansenPost("/smart-money/perp-trades", {
      filters: { value_usd: { min: 1000 } },
      only_new_positions: true,
      pagination: { page: 1, per_page: 50 },
      order_by: [{ field: "block_timestamp", direction: "DESC" }],
    });
    logCost("/smart-money/perp-trades", true, Date.now() - start);
    return data?.data || data || [];
  } catch (e) {
    logCost("/smart-money/perp-trades", false, Date.now() - start);
    console.error("[whale-signal] SM perp trades error:", e.message);
    return [];
  }
}

// ─── Fetch perp screener ─────────────────────────────
async function fetchPerpScreener(smartMoneyOnly = false) {
  const start = Date.now();
  const now = new Date();
  const from = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  try {
    const body = {
      date: { from, to: now.toISOString() },
      only_smart_money: smartMoneyOnly,
      pagination: { page: 1, per_page: 50 },
      order_by: [
        {
          direction: "DESC",
          field: smartMoneyOnly ? "net_position_change" : "volume",
        },
      ],
    };
    const data = await nansenPost("/perp-screener", body);
    logCost("/perp-screener", true, Date.now() - start);
    return data?.data || data || [];
  } catch (e) {
    logCost("/perp-screener", false, Date.now() - start);
    console.error("[whale-signal] Perp screener error:", e.message);
    return [];
  }
}

// ─── Fetch token perp positions ──────────────────────
async function fetchTokenPerpPositions(tokenSymbol) {
  const start = Date.now();
  try {
    const data = await nansenPost("/tgm/perp-positions", {
      token_symbol: tokenSymbol,
      label_type: "smart_money",
      pagination: { page: 1, per_page: 20 },
      filters: {
        include_smart_money_labels: ["Smart HL Perps Trader", "Fund"],
        position_value_usd: { min: 10000 },
      },
      order_by: [{ field: "position_value_usd", direction: "DESC" }],
    });
    logCost("/tgm/perp-positions", true, Date.now() - start);
    return data?.data || data || [];
  } catch (e) {
    logCost("/tgm/perp-positions", false, Date.now() - start);
    return [];
  }
}

// ─── Resolve pipeline token to Hyperliquid symbol ────
// Hyperliquid uses simple symbols (BTC, ETH, SOL, etc.)
// We check if the pipeline token's ticker matches any HL pair
let hlPairsCache = { data: null, ts: 0 };

async function getHyperliquidPairs() {
  if (hlPairsCache.data && Date.now() - hlPairsCache.ts < 24 * 60 * 60 * 1000)
    return hlPairsCache.data;
  try {
    const data = await new Promise((resolve, reject) => {
      const bodyStr = JSON.stringify({ type: "meta" });
      const req = https.request(
        {
          hostname: "api.hyperliquid.xyz",
          path: "/info",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(bodyStr),
          },
          timeout: 10000,
        },
        (res) => {
          const chunks = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () => {
            try {
              resolve(JSON.parse(Buffer.concat(chunks).toString()));
            } catch {
              resolve(null);
            }
          });
        },
      );
      req.on("error", reject);
      req.on("timeout", () => {
        req.destroy();
        reject(new Error("HL timeout"));
      });
      req.write(bodyStr);
      req.end();
    });
    const symbols = (data?.universe || []).map((p) => p.name?.toUpperCase());
    hlPairsCache = { data: new Set(symbols), ts: Date.now() };
    return hlPairsCache.data;
  } catch {
    return new Set([
      "BTC",
      "ETH",
      "SOL",
      "DOGE",
      "PEPE",
      "WIF",
      "BONK",
      "JUP",
      "ONDO",
      "SUI",
      "APT",
      "ARB",
      "OP",
      "AVAX",
      "LINK",
      "UNI",
      "AAVE",
      "MKR",
      "SNX",
      "CRV",
    ]);
  }
}

async function resolveToHyperliquidSymbol(ticker) {
  if (!ticker) return { symbol: null, hasPerp: false };
  const pairs = await getHyperliquidPairs();
  const upper = ticker.toUpperCase();
  return { symbol: upper, hasPerp: pairs.has(upper) };
}

// ─── Compute whale signal score ──────────────────────
function computeWhaleSignalScore(smTrades, screenerData, positions) {
  // Extract metrics for this token
  const longs = (positions || []).filter((p) => p.side === "Long").length;
  const shorts = (positions || []).filter((p) => p.side === "Short").length;
  const totalValue = (positions || []).reduce(
    (sum, p) => sum + (p.position_value_usd || 0),
    0,
  );
  const buyVol =
    screenerData?.smart_money_buy_volume || screenerData?.buy_volume || 0;
  const sellVol =
    screenerData?.smart_money_sell_volume || screenerData?.sell_volume || 0;
  const funding = screenerData?.funding || 0;
  const oi = screenerData?.open_interest || 0;
  const traderCount =
    screenerData?.smart_money_longs_count || screenerData?.trader_count || 0;

  // Score components
  let flowScore = 15; // neutral default
  if (longs > shorts * 2) flowScore = 30;
  else if (longs > shorts) flowScore = 22;
  else if (shorts > longs * 2) flowScore = 0;
  else if (shorts > longs) flowScore = 8;

  let countScore = 0;
  if (traderCount > 10) countScore = 25;
  else if (traderCount > 5) countScore = 15;
  else if (traderCount > 0) countScore = 8;

  let pressureScore = 12;
  const ratio = sellVol > 0 ? buyVol / sellVol : buyVol > 0 ? 2 : 1;
  if (ratio > 1.5) pressureScore = 20;
  else if (ratio < 1.0) pressureScore = 5;

  let valueScore = 0;
  if (totalValue > 1000000) valueScore = 15;
  else if (totalValue > 100000) valueScore = 10;
  else if (totalValue > 10000) valueScore = 5;

  let fundingScore = 10;
  const absRate = Math.abs(funding);
  if (absRate > 0.0005) fundingScore = 0;
  else if (absRate > 0.0001) fundingScore = 5;

  const score =
    flowScore + countScore + pressureScore + valueScore + fundingScore;
  const netFlow =
    longs > shorts ? "LONG_BIAS" : shorts > longs ? "SHORT_BIAS" : "NEUTRAL";
  const bearishFlag = shorts > longs && totalValue > 50000 && ratio < 1.0;

  return {
    score: Math.min(100, Math.max(0, score)),
    bearishFlag,
    netFlow,
    breakdown: {
      flow: flowScore,
      count: countScore,
      pressure: pressureScore,
      value: valueScore,
      funding: fundingScore,
    },
    metrics: {
      longs,
      shorts,
      totalValue,
      buyVol,
      sellVol,
      funding,
      oi,
      traderCount,
      pressureRatio: Math.round(ratio * 100) / 100,
    },
  };
}

// ─── Run full whale signal sweep ─────────────────────
async function runWhaleSignalSweep() {
  const db = getDB();
  console.log("[whale-signal] Starting whale signal sweep...");

  // 1. Fetch data (3 API calls)
  const [screenerDefault, screenerSM, smTrades] = await Promise.all([
    fetchPerpScreener(false),
    fetchPerpScreener(true),
    fetchSmartMoneyPerpTrades(),
  ]);

  // 2. Build screener lookup by symbol
  const screenerMap = {};
  for (const item of [...screenerDefault, ...screenerSM]) {
    const sym = (item.token_symbol || "").toUpperCase();
    if (!screenerMap[sym]) screenerMap[sym] = {};
    Object.assign(screenerMap[sym], item);
  }

  // 3. Get pipeline tokens
  let tokens = [];
  try {
    tokens = db
      .prepare(
        "SELECT address, ticker, score, chain FROM pipeline_tokens WHERE score >= 60 AND ticker IS NOT NULL",
      )
      .all();
  } catch (e) {
    /* empty pipeline */
  }

  // 4. Process each token
  const results = [];
  for (const token of tokens) {
    const { symbol, hasPerp } = await resolveToHyperliquidSymbol(token.ticker);
    if (!hasPerp) {
      results.push({
        ticker: token.ticker,
        address: token.address,
        score: 50,
        hasPerp: false,
      });
      continue;
    }

    // Fetch positions for tokens with perps and score >= 60
    let positions = [];
    if (token.score >= 60) {
      positions = await fetchTokenPerpPositions(symbol);
    }

    const screenerData = screenerMap[symbol] || {};
    const whaleScore = computeWhaleSignalScore(
      smTrades,
      screenerData,
      positions,
    );

    // Cache
    try {
      db.prepare(
        `INSERT OR REPLACE INTO whale_signal_cache
        (token_symbol, pipeline_address, chain, whale_signal_score, sm_net_flow_direction,
         sm_longs_count, sm_shorts_count, sm_total_value_usd, buy_sell_pressure,
         funding_rate, open_interest, bearish_flag, score_breakdown_json, raw_data_json, computed_at)
        VALUES (?, ?, 'hyperliquid', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `,
      ).run(
        symbol,
        token.address,
        whaleScore.score,
        whaleScore.netFlow,
        whaleScore.metrics.longs,
        whaleScore.metrics.shorts,
        whaleScore.metrics.totalValue,
        whaleScore.metrics.pressureRatio,
        whaleScore.metrics.funding,
        whaleScore.metrics.oi,
        whaleScore.bearishFlag ? 1 : 0,
        JSON.stringify(whaleScore.breakdown),
        JSON.stringify({
          screener: screenerData,
          positions: positions.slice(0, 5),
        }),
      );
    } catch (e) {
      console.error("[whale-signal] Cache write error:", e.message);
    }

    results.push({
      ticker: token.ticker,
      address: token.address,
      score: whaleScore.score,
      hasPerp: true,
      ...whaleScore,
    });
  }

  console.log(
    `[whale-signal] Sweep complete: ${results.length} tokens, ${results.filter((r) => r.hasPerp).length} with perps`,
  );
  return results;
}

// ─── Get cached whale signal ─────────────────────────
function getWhaleSignalFromCache(tokenSymbolOrAddress) {
  try {
    const db = getDB();
    let row = db
      .prepare(
        "SELECT * FROM whale_signal_cache WHERE token_symbol = ? COLLATE NOCASE",
      )
      .get(tokenSymbolOrAddress);
    if (!row)
      row = db
        .prepare("SELECT * FROM whale_signal_cache WHERE pipeline_address = ?")
        .get(tokenSymbolOrAddress);
    if (!row) return null;
    // Check TTL
    const age = (Date.now() - new Date(row.computed_at + "Z").getTime()) / 1000;
    if (age > (row.ttl || 3600)) return null; // Stale
    return row;
  } catch {
    return null;
  }
}

module.exports = {
  fetchSmartMoneyPerpTrades,
  fetchPerpScreener,
  fetchTokenPerpPositions,
  resolveToHyperliquidSymbol,
  computeWhaleSignalScore,
  runWhaleSignalSweep,
  getWhaleSignalFromCache,
};
