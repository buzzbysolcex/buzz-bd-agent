/**
 * Backtester — Validates Buzz scoring against actual price outcomes
 *
 * Proves pipeline accuracy: "our scoring has 73% accuracy over 30 days"
 * Computes per-agent and per-persona accuracy, precision, avg returns.
 * Runs weekly via cron (Sunday 03:00 UTC) or on-demand via REST.
 *
 * Flow:
 *   1. Query token_scores scored N days ago
 *   2. Fetch current price from DexScreener (free)
 *   3. Compute price change since scoring
 *   4. Evaluate each agent/persona signal correctness
 *   5. Aggregate metrics → store in backtest_results + backtest_summaries
 *
 * Buzz BD Agent v7.4.0 | Hedge Brain
 */

const crypto = require('crypto');

const DEXSCREENER_BASE = 'https://api.dexscreener.com';

/**
 * Run a backtest cycle
 * @param {object} db - SQLite database instance
 * @param {object} opts - { daysBack, checkAfterDays }
 */
async function runBacktest(db, { daysBack = 7, checkAfterDays = 3 } = {}) {
  const runId = `BT-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  const start = Date.now();

  console.log(`[${runId}] 📊 Backtester: Starting (${daysBack}d lookback, check after ${checkAfterDays}d)`);

  const results = {
    runId,
    startedAt: new Date().toISOString(),
    daysBack,
    checkAfterDays,
    tokensEvaluated: 0,
    errors: [],
  };

  try {
    // Step 1: Get tokens scored in the target window
    const cutoffStart = new Date(Date.now() - daysBack * 86400000).toISOString();
    const cutoffEnd = new Date(Date.now() - checkAfterDays * 86400000).toISOString();

    const scoredTokens = db.prepare(`
      SELECT address, chain, symbol, score, verdict, price_usd, scored_at,
             sub_agent_scores, persona_scores
      FROM token_scores
      WHERE scored_at >= ? AND scored_at <= ?
      ORDER BY scored_at DESC
    `).all(cutoffStart, cutoffEnd);

    if (scoredTokens.length === 0) {
      console.log(`[${runId}] ⚠️ No scored tokens in window ${cutoffStart} → ${cutoffEnd}`);
      results.status = 'no_data';
      results.message = 'No scored tokens in the specified time window';
      return results;
    }

    console.log(`[${runId}] 📊 Found ${scoredTokens.length} tokens to backtest`);

    // Step 2-3: Fetch current prices and compute changes
    const backtestResults = [];
    for (const token of scoredTokens) {
      try {
        const priceResult = await fetchCurrentPrice(token.address);
        if (!priceResult) continue;

        const priceAtScore = parseFloat(token.price_usd || 0);
        const priceNow = priceResult.priceUsd;

        if (priceAtScore <= 0) continue;

        const priceChangePct = ((priceNow - priceAtScore) / priceAtScore) * 100;
        const daysElapsed = Math.floor(
          (Date.now() - new Date(token.scored_at).getTime()) / 86400000
        );

        // Step 4: Evaluate signal correctness
        const signalCorrect = evaluateSignalCorrectness(token, priceChangePct);
        const subAgentAccuracy = evaluateSubAgentAccuracy(token, priceChangePct);
        const personaAccuracy = evaluatePersonaAccuracy(token, priceChangePct);

        const entry = {
          run_id: runId,
          token_address: token.address,
          chain: token.chain,
          symbol: token.symbol,
          score_at_time: token.score,
          price_at_score: priceAtScore,
          price_at_check: priceNow,
          price_change_pct: Math.round(priceChangePct * 100) / 100,
          days_elapsed: daysElapsed,
          signal_correct: signalCorrect ? 1 : 0,
          sub_agent_accuracy_json: JSON.stringify(subAgentAccuracy),
          persona_accuracy_json: JSON.stringify(personaAccuracy),
          scored_at: token.scored_at,
        };

        // Persist individual result
        db.prepare(`
          INSERT INTO backtest_results
          (run_id, token_address, chain, symbol, score_at_time, price_at_score,
           price_at_check, price_change_pct, days_elapsed, signal_correct,
           sub_agent_accuracy_json, persona_accuracy_json, scored_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          entry.run_id, entry.token_address, entry.chain, entry.symbol,
          entry.score_at_time, entry.price_at_score, entry.price_at_check,
          entry.price_change_pct, entry.days_elapsed, entry.signal_correct,
          entry.sub_agent_accuracy_json, entry.persona_accuracy_json,
          entry.scored_at
        );

        backtestResults.push(entry);

        // Rate limit DexScreener calls
        await sleep(500);
      } catch (err) {
        results.errors.push({ token: token.address, error: err.message });
      }
    }

    results.tokensEvaluated = backtestResults.length;

    // Step 5: Aggregate metrics
    if (backtestResults.length > 0) {
      const summary = computeSummary(runId, backtestResults, cutoffStart, cutoffEnd);

      db.prepare(`
        INSERT INTO backtest_summaries
        (run_id, total_tokens, accuracy_rate, precision_rate,
         avg_return_bullish, avg_return_bearish, best_agent, best_persona,
         period_start, period_end)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        summary.run_id, summary.total_tokens, summary.accuracy_rate,
        summary.precision_rate, summary.avg_return_bullish, summary.avg_return_bearish,
        summary.best_agent, summary.best_persona,
        summary.period_start, summary.period_end
      );

      results.summary = summary;
    }

    results.status = 'completed';
    results.durationMs = Date.now() - start;
    results.completedAt = new Date().toISOString();

    console.log(`[${runId}] ✅ Backtest complete: ${results.tokensEvaluated} tokens, accuracy ${results.summary?.accuracy_rate || 'N/A'}%`);

  } catch (err) {
    results.status = 'error';
    results.error = err.message;
    console.error(`[${runId}] ❌ Backtest error: ${err.message}`);
  }

  return results;
}

/**
 * Fetch current price from DexScreener
 */
async function fetchCurrentPrice(address) {
  try {
    const res = await fetch(`${DEXSCREENER_BASE}/latest/dex/tokens/${address}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;

    const data = await res.json();
    const pairs = data.pairs || [];
    if (pairs.length === 0) return null;

    // Use highest-liquidity pair
    const primary = pairs.reduce((best, p) =>
      (parseFloat(p.liquidity?.usd || 0) > parseFloat(best.liquidity?.usd || 0)) ? p : best,
      pairs[0]
    );

    return {
      priceUsd: parseFloat(primary.priceUsd || 0),
      liquidity: parseFloat(primary.liquidity?.usd || 0),
      volume24h: parseFloat(primary.volume?.h24 || 0),
    };
  } catch {
    return null;
  }
}

/**
 * Evaluate if the overall scoring signal was correct
 * Bullish (score >= 70) + price up → correct
 * Bearish (score < 50) + price down → correct
 */
function evaluateSignalCorrectness(token, priceChangePct) {
  const score = token.score || 0;
  if (score >= 70 && priceChangePct > 0) return true;   // True Positive
  if (score < 50 && priceChangePct <= 0) return true;    // True Negative
  return false;
}

/**
 * Evaluate per sub-agent accuracy
 */
function evaluateSubAgentAccuracy(token, priceChangePct) {
  const accuracy = {};
  let subScores;
  try {
    subScores = typeof token.sub_agent_scores === 'string'
      ? JSON.parse(token.sub_agent_scores)
      : token.sub_agent_scores;
  } catch {
    return accuracy;
  }

  if (!subScores) return accuracy;

  for (const [agent, agentScore] of Object.entries(subScores)) {
    const s = typeof agentScore === 'object' ? agentScore.score || 0 : agentScore || 0;
    const bullish = s >= 65;
    const priceUp = priceChangePct > 0;
    accuracy[agent] = {
      score: s,
      signal: bullish ? 'bullish' : 'bearish',
      correct: (bullish && priceUp) || (!bullish && !priceUp),
    };
  }

  return accuracy;
}

/**
 * Evaluate per persona accuracy
 */
function evaluatePersonaAccuracy(token, priceChangePct) {
  const accuracy = {};
  let personaScores;
  try {
    personaScores = typeof token.persona_scores === 'string'
      ? JSON.parse(token.persona_scores)
      : token.persona_scores;
  } catch {
    return accuracy;
  }

  if (!personaScores) return accuracy;

  for (const [persona, pData] of Object.entries(personaScores)) {
    const signal = typeof pData === 'object' ? pData.signal || 'neutral' : 'neutral';
    const bullish = signal === 'bullish';
    const priceUp = priceChangePct > 0;
    accuracy[persona] = {
      signal,
      confidence: typeof pData === 'object' ? pData.confidence || 0 : 0,
      correct: (bullish && priceUp) || (!bullish && !priceUp),
    };
  }

  return accuracy;
}

/**
 * Compute aggregate summary metrics
 */
function computeSummary(runId, results, periodStart, periodEnd) {
  const total = results.length;
  const correct = results.filter(r => r.signal_correct).length;
  const accuracyRate = Math.round((correct / total) * 10000) / 100;

  // Precision: TP / (TP + FP) — for bullish signals only
  const bullishResults = results.filter(r => r.score_at_time >= 70);
  const truePositives = bullishResults.filter(r => r.price_change_pct > 0).length;
  const precisionRate = bullishResults.length > 0
    ? Math.round((truePositives / bullishResults.length) * 10000) / 100
    : 0;

  // Average returns
  const bullishReturns = bullishResults.map(r => r.price_change_pct);
  const bearishResults = results.filter(r => r.score_at_time < 50);
  const bearishReturns = bearishResults.map(r => r.price_change_pct);

  const avgReturnBullish = bullishReturns.length > 0
    ? Math.round(bullishReturns.reduce((a, b) => a + b, 0) / bullishReturns.length * 100) / 100
    : 0;
  const avgReturnBearish = bearishReturns.length > 0
    ? Math.round(bearishReturns.reduce((a, b) => a + b, 0) / bearishReturns.length * 100) / 100
    : 0;

  // Best agent and persona
  const bestAgent = findBestPerformer(results, 'sub_agent_accuracy_json');
  const bestPersona = findBestPerformer(results, 'persona_accuracy_json');

  return {
    run_id: runId,
    total_tokens: total,
    accuracy_rate: accuracyRate,
    precision_rate: precisionRate,
    avg_return_bullish: avgReturnBullish,
    avg_return_bearish: avgReturnBearish,
    best_agent: bestAgent,
    best_persona: bestPersona,
    period_start: periodStart,
    period_end: periodEnd,
  };
}

/**
 * Find the best-performing agent/persona across all results
 */
function findBestPerformer(results, jsonField) {
  const stats = {};

  for (const r of results) {
    let data;
    try {
      data = typeof r[jsonField] === 'string' ? JSON.parse(r[jsonField]) : r[jsonField];
    } catch { continue; }
    if (!data) continue;

    for (const [name, info] of Object.entries(data)) {
      if (!stats[name]) stats[name] = { correct: 0, total: 0 };
      stats[name].total++;
      if (info.correct) stats[name].correct++;
    }
  }

  let best = null;
  let bestRate = -1;
  for (const [name, s] of Object.entries(stats)) {
    if (s.total >= 3) { // Minimum sample size
      const rate = s.correct / s.total;
      if (rate > bestRate) {
        bestRate = rate;
        best = name;
      }
    }
  }

  return best || 'insufficient_data';
}

/**
 * Get latest backtest summary
 */
function getLatestSummary(db) {
  return db.prepare(`
    SELECT * FROM backtest_summaries ORDER BY created_at DESC LIMIT 1
  `).get() || null;
}

/**
 * Get all backtest summaries
 */
function getSummaryHistory(db, limit = 20) {
  return db.prepare(`
    SELECT * FROM backtest_summaries ORDER BY created_at DESC LIMIT ?
  `).all(limit);
}

/**
 * Get accuracy stats for a specific agent/persona
 */
function getAgentAccuracy(db, agentName, limit = 50) {
  const results = db.prepare(`
    SELECT * FROM backtest_results ORDER BY checked_at DESC LIMIT ?
  `).all(limit);

  let correct = 0;
  let total = 0;
  const entries = [];

  for (const r of results) {
    // Check both sub_agent and persona accuracy
    for (const field of ['sub_agent_accuracy_json', 'persona_accuracy_json']) {
      let data;
      try {
        data = JSON.parse(r[field]);
      } catch { continue; }
      if (data && data[agentName]) {
        total++;
        if (data[agentName].correct) correct++;
        entries.push({
          token: r.symbol || r.token_address,
          chain: r.chain,
          signal: data[agentName].signal,
          correct: data[agentName].correct,
          price_change: r.price_change_pct,
          scored_at: r.scored_at,
        });
      }
    }
  }

  return {
    agent: agentName,
    total_evaluations: total,
    correct,
    accuracy_rate: total > 0 ? Math.round((correct / total) * 10000) / 100 : 0,
    entries: entries.slice(0, 20),
  };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  runBacktest,
  getLatestSummary,
  getSummaryHistory,
  getAgentAccuracy,
};
