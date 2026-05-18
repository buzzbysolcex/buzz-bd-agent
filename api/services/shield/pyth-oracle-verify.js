/**
 * Pyth Oracle Verification — Intel Source #33
 * Cross-references DexScreener prices against Pyth oracle feeds
 * Closes Shield Gap #3: Input Data Verification
 *
 * "Shield doesn't just check what agents do — it verifies what agents know."
 *
 * Pyth: institutional-grade oracle, 400ms updates, confidence intervals
 * DexScreener: market data from DEX pools
 * Divergence = potential oracle manipulation or stale data
 */

const { feature } = require("../../lib/feature-flags");

// Pyth Hermes endpoint (free, no API key needed)
const HERMES_URL = "https://hermes.pyth.network";

// Popular Pyth price feed IDs
const PYTH_FEEDS = {
  SOL: "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
  BTC: "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
  ETH: "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
  USDC: "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a",
  USDT: "0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b",
  BONK: "0x72b021217ca3fe68922a19aaf990109cb9d84e9ad004b4d2025ad6f529314419",
  JUP: "0x0a0408d619e9380abad35060f9192039ed5042fa6f82301d0e48bb52be830996",
  WIF: "0x4ca4beeca86f0d164160323817a4e42b10010a724c2217c6ee41b54cd4cc61fc",
  RNDR: "0xab7347771135fc733f8f38db462ba085ed3309955f42554a14fa13e855ac0e2f",
  PYTH: "0x0bbf28e9a841a1cc788f6a361b17ca072d0ea3098a1e5df1c3922d06ed92f1e6",
};

/**
 * Fetch price from Pyth Hermes (off-chain, free, no key)
 */
async function fetchPythPrice(feedId) {
  try {
    const https = require("https");
    const url = `${HERMES_URL}/v2/updates/price/latest?ids[]=${feedId}&parsed=true`;

    return await new Promise((resolve, reject) => {
      const req = https.get(url, { timeout: 10000 }, (res) => {
        if (res.statusCode !== 200) {
          resolve(null);
          return;
        }
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            const data = JSON.parse(body);
            const parsed = data.parsed?.[0];
            if (!parsed) {
              resolve(null);
              return;
            }

            const price =
              Number(parsed.price.price) * Math.pow(10, parsed.price.expo);
            const conf =
              Number(parsed.price.conf) * Math.pow(10, parsed.price.expo);
            const publishTime = parsed.price.publish_time;

            resolve({
              price,
              confidence: conf,
              confidence_pct: price > 0 ? (conf / price) * 100 : 0,
              publish_time: new Date(publishTime * 1000).toISOString(),
              feed_id: feedId,
              age_seconds: Math.floor(Date.now() / 1000) - publishTime,
            });
          } catch (e) {
            resolve(null);
          }
        });
      });
      req.on("error", () => resolve(null));
      req.on("timeout", () => {
        req.destroy();
        resolve(null);
      });
    });
  } catch (e) {
    return null;
  }
}

/**
 * Verify price integrity: cross-reference claimed price against Pyth oracle
 *
 * @param {string} symbol - Token symbol (SOL, BTC, ETH, etc.)
 * @param {number} claimedPrice - Price from DexScreener/CoinGecko/other source
 * @returns {object} Verification result with verdict
 */
async function verifyPriceIntegrity(symbol, claimedPrice) {
  if (!feature("SHIELD_PYTH_ORACLE")) {
    return { verified: null, reason: "SHIELD_PYTH_ORACLE flag is false" };
  }

  const feedId = PYTH_FEEDS[symbol.toUpperCase()];
  if (!feedId) {
    return {
      verified: null,
      reason: `No Pyth feed for ${symbol}`,
      supported_symbols: Object.keys(PYTH_FEEDS),
    };
  }

  const pythData = await fetchPythPrice(feedId);
  if (!pythData) {
    return {
      verified: null,
      reason: "Pyth oracle unavailable",
      claimed_price: claimedPrice,
    };
  }

  // Check data freshness (> 60s = stale)
  const stale = pythData.age_seconds > 60;

  // Calculate deviation
  const deviation =
    (Math.abs(claimedPrice - pythData.price) / pythData.price) * 100;

  // Determine verdict
  let verdict = "SAFE";
  let explanation = "";

  if (stale) {
    verdict = "CAUTION";
    explanation = `Pyth data is ${pythData.age_seconds}s old — may not reflect current market`;
  } else if (deviation > 20) {
    verdict = "DANGER";
    explanation = `Price deviation ${deviation.toFixed(1)}% from Pyth oracle — possible manipulation or stale source data`;
  } else if (deviation > 5) {
    verdict = "WARNING";
    explanation = `Price deviation ${deviation.toFixed(1)}% from Pyth oracle — verify source data freshness`;
  } else if (pythData.confidence_pct > 1) {
    verdict = "CAUTION";
    explanation = `Pyth confidence interval is wide (${pythData.confidence_pct.toFixed(2)}%) — market may be volatile`;
  } else {
    explanation = `Price verified: ${deviation.toFixed(2)}% deviation from Pyth oracle (within tolerance)`;
  }

  return {
    verified: verdict === "SAFE",
    verdict,
    explanation,
    claimed_price: claimedPrice,
    pyth_price: pythData.price,
    deviation_pct: deviation,
    confidence: pythData.confidence,
    confidence_pct: pythData.confidence_pct,
    pyth_publish_time: pythData.publish_time,
    pyth_age_seconds: pythData.age_seconds,
    stale,
    feed_id: feedId,
    source: "pyth_hermes_v2",
  };
}

/**
 * Get all supported Pyth feed symbols
 */
function getSupportedSymbols() {
  return Object.keys(PYTH_FEEDS);
}

module.exports = {
  verifyPriceIntegrity,
  fetchPythPrice,
  getSupportedSymbols,
  PYTH_FEEDS,
};
