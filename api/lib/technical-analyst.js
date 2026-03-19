/**
 * Technical Analyst — MiroFish P1-B4
 * Computes RSI, MACD, volume trends, and momentum from historical price data.
 *
 * All math is inlined — zero npm dependencies for TA indicators.
 * Input: Financial Datasets MCP historical prices → fallback: neutral score (50).
 *
 * Buzz BD Agent | MiroFish Integration
 */

const { getDB } = require('../db');

/**
 * Exponential Moving Average helper
 * @param {number[]} values - price series (oldest first)
 * @param {number} period  - EMA period
 * @returns {number[]} EMA series (same length, first period-1 entries are NaN)
 */
function computeEMA(values, period) {
  const k = 2 / (period + 1);
  const ema = new Array(values.length).fill(NaN);
  // Seed with SMA of first `period` values
  let sum = 0;
  for (let i = 0; i < period && i < values.length; i++) sum += values[i];
  if (values.length < period) return ema;
  ema[period - 1] = sum / period;
  for (let i = period; i < values.length; i++) {
    ema[i] = values[i] * k + ema[i - 1] * (1 - k);
  }
  return ema;
}

/**
 * Compute 14-period RSI from closing prices
 * @param {number[]} prices - closing prices, oldest first (need >= 15)
 * @returns {{ rsi: number, avgGain: number, avgLoss: number } | null}
 */
function computeRSI(prices, period = 14) {
  if (!prices || prices.length < period + 1) return null;

  let gainSum = 0;
  let lossSum = 0;
  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gainSum += change;
    else lossSum += Math.abs(change);
  }

  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;

  // Smooth over remaining data using Wilder's method
  for (let i = period + 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return { rsi: 100, avgGain, avgLoss };
  const rs = avgGain / avgLoss;
  const rsi = 100 - 100 / (1 + rs);
  return { rsi: Math.round(rsi * 100) / 100, avgGain, avgLoss };
}

/**
 * Compute MACD (12, 26, 9) from closing prices
 * @param {number[]} prices - closing prices, oldest first (need >= 35)
 * @returns {{ macdLine: number, signalLine: number, histogram: number, trend: string } | null}
 */
function computeMACD(prices) {
  if (!prices || prices.length < 35) return null;

  const ema12 = computeEMA(prices, 12);
  const ema26 = computeEMA(prices, 26);

  // MACD line = EMA12 - EMA26 (valid from index 25 onward)
  const macdLine = [];
  for (let i = 25; i < prices.length; i++) {
    macdLine.push(ema12[i] - ema26[i]);
  }

  // Signal line = EMA9 of MACD line
  const signal = computeEMA(macdLine, 9);
  const lastIdx = macdLine.length - 1;
  const prevIdx = lastIdx - 1;

  if (isNaN(signal[lastIdx]) || lastIdx < 1) return null;

  const histogram = macdLine[lastIdx] - signal[lastIdx];
  const prevHistogram = prevIdx >= 0 && !isNaN(signal[prevIdx])
    ? macdLine[prevIdx] - signal[prevIdx]
    : 0;

  let trend = 'neutral';
  if (prevHistogram <= 0 && histogram > 0) trend = 'bullish_crossover';
  else if (prevHistogram >= 0 && histogram < 0) trend = 'bearish_crossover';
  else if (histogram > 0) trend = 'bullish';
  else if (histogram < 0) trend = 'bearish';

  return {
    macdLine: Math.round(macdLine[lastIdx] * 1e8) / 1e8,
    signalLine: Math.round(signal[lastIdx] * 1e8) / 1e8,
    histogram: Math.round(histogram * 1e8) / 1e8,
    trend,
  };
}

/**
 * Compute 7-day volume trend from OHLCV data
 * @param {number[]} volumes - daily volumes, oldest first (need >= 7)
 * @returns {{ trend: string, avgRecent: number, avgPrior: number }}
 */
function computeVolumeTrend(volumes) {
  if (!volumes || volumes.length < 7) return { trend: 'unknown', avgRecent: 0, avgPrior: 0 };

  const recent = volumes.slice(-3);
  const prior = volumes.slice(-7, -3);
  const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length;
  const avgPrior = prior.reduce((a, b) => a + b, 0) / prior.length;

  if (avgPrior === 0) return { trend: 'unknown', avgRecent, avgPrior };
  const change = (avgRecent - avgPrior) / avgPrior;

  let trend = 'stable';
  if (change > 0.15) trend = 'increasing';
  else if (change < -0.15) trend = 'decreasing';

  return { trend, avgRecent: Math.round(avgRecent), avgPrior: Math.round(avgPrior) };
}

/**
 * Compute price momentum over 7d, 14d, 30d
 * @param {number[]} prices - closing prices, oldest first
 * @returns {{ pct7d: number|null, pct14d: number|null, pct30d: number|null }}
 */
function computeMomentum(prices) {
  if (!prices || prices.length < 2) return { pct7d: null, pct14d: null, pct30d: null };
  const last = prices[prices.length - 1];
  const pct = (idx) => {
    if (idx < 0 || idx >= prices.length) return null;
    const base = prices[idx];
    return base === 0 ? null : Math.round(((last - base) / base) * 10000) / 100;
  };
  return {
    pct7d: prices.length >= 8 ? pct(prices.length - 8) : null,
    pct14d: prices.length >= 15 ? pct(prices.length - 15) : null,
    pct30d: prices.length >= 31 ? pct(prices.length - 31) : null,
  };
}

/**
 * Score technical indicators on a 0-100 scale
 */
function scoreTechnicals(rsiResult, macdResult, volumeResult, momentum) {
  let score = 50; // neutral base

  // RSI scoring
  if (rsiResult) {
    if (rsiResult.rsi < 30) score += 20;       // oversold → bullish
    else if (rsiResult.rsi > 70) score -= 20;   // overbought → bearish
    // 30-70 is healthy, no adjustment
  }

  // MACD scoring
  if (macdResult) {
    if (macdResult.trend === 'bullish_crossover') score += 15;
    else if (macdResult.trend === 'bearish_crossover') score -= 15;
    else if (macdResult.trend === 'bullish') score += 8;
    else if (macdResult.trend === 'bearish') score -= 8;
  }

  // Volume scoring
  if (volumeResult) {
    if (volumeResult.trend === 'increasing') score += 10;
    else if (volumeResult.trend === 'decreasing') score -= 10;
  }

  // 7d momentum scoring
  if (momentum && momentum.pct7d !== null) {
    if (momentum.pct7d > 10) score += 10;
    else if (momentum.pct7d < -10) score -= 10;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Main entry point — compute full technical analysis for a token
 * @param {string} tokenAddress - on-chain address
 * @param {string} chain - blockchain (default 'solana')
 * @returns {Promise<Object>} analysis result
 */
async function analyzeTechnical(tokenAddress, chain = 'solana') {
  let closePrices = null;
  let volumes = null;

  // Try Financial Datasets MCP for historical data
  try {
    const { getHistoricalCryptoPrices } = require('../intel/financial-datasets-mcp');

    // Look up ticker from pipeline_tokens
    let ticker = null;
    try {
      const db = getDB();
      const row = db.prepare('SELECT ticker FROM pipeline_tokens WHERE address = ?').get(tokenAddress);
      if (row) ticker = row.ticker;
    } catch { /* ignore DB lookup failure */ }

    if (ticker) {
      const end = new Date().toISOString().split('T')[0];
      const start = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const data = await getHistoricalCryptoPrices(ticker, start, end, 'day');

      if (data && Array.isArray(data) && data.length >= 15) {
        closePrices = data.map(d => d.close || d.price || 0);
        volumes = data.map(d => d.volume || 0);
      }
    }
  } catch (err) {
    console.warn('[TechAnalyst] Financial Datasets fetch failed:', err.message);
  }

  // Fallback: return neutral score
  if (!closePrices || closePrices.length < 15) {
    return {
      technical_score: 50,
      rsi: null,
      macd: null,
      volumeTrend: { trend: 'unknown' },
      momentum: { pct7d: null, pct14d: null, pct30d: null },
      indicators_json: JSON.stringify({ fallback: true, reason: 'insufficient_data' }),
      source: 'fallback',
    };
  }

  // Compute indicators
  const rsiResult = computeRSI(closePrices);
  const macdResult = computeMACD(closePrices);
  const volumeResult = computeVolumeTrend(volumes);
  const momentum = computeMomentum(closePrices);
  const technical_score = scoreTechnicals(rsiResult, macdResult, volumeResult, momentum);

  const indicators = { rsi: rsiResult, macd: macdResult, volume: volumeResult, momentum };

  return {
    technical_score,
    rsi: rsiResult,
    macd: macdResult,
    volumeTrend: volumeResult,
    momentum,
    indicators_json: JSON.stringify(indicators),
    source: 'financial-datasets',
  };
}

module.exports = {
  analyzeTechnical,
  computeRSI,
  computeMACD,
  computeEMA,
  computeVolumeTrend,
  computeMomentum,
  scoreTechnicals,
};
