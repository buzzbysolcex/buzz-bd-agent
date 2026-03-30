/**
 * MicroBuzz v2 — Constant-Product AMM Engine
 * ADR-010 | 500-agent hybrid prediction market
 *
 * reserve_yes × reserve_no = k
 * Price = reserve_no / (reserve_yes + reserve_no)
 * Initial pool: 10000/10000 (50/50 = 0.50)
 *
 * All 500 agents trade on the SAME pool.
 * Trade records stored for full audit trail.
 */

const INITIAL_RESERVE = 10000;

/**
 * Create a new prediction market for a token
 * @param {string} tokenSymbol - Token symbol
 * @returns {Object} market state
 */
function createMarket(tokenSymbol) {
  return {
    tokenSymbol,
    reserve_yes: INITIAL_RESERVE,
    reserve_no: INITIAL_RESERVE,
    k: INITIAL_RESERVE * INITIAL_RESERVE,
    trades: [],
    round_prices: [],
    created_at: new Date().toISOString()
  };
}

/**
 * Get current YES price from AMM state
 * @param {Object} market
 * @returns {number} price between 0.00 and 1.00
 */
function getPrice(market) {
  const total = market.reserve_yes + market.reserve_no;
  if (total === 0) return 0.5;
  return market.reserve_no / total;
}

/**
 * Execute an agent trade on the AMM using mint-and-swap
 *
 * Mint-and-swap: agent spends $amount to get complete sets,
 * then sells unwanted side back to pool. Net = desired outcome shares.
 *
 * @param {Object} market - market state (mutated in place)
 * @param {string} agentId - unique agent identifier
 * @param {string} agentType - 'llm' or heuristic subtype
 * @param {string} direction - 'YES' or 'NO'
 * @param {number} amount - USD amount to trade
 * @param {Object} [meta] - optional metadata (persona, risk, reasoning)
 * @returns {Object} trade record
 */
function agentTrade(market, agentId, agentType, direction, amount, meta = {}) {
  if (amount <= 0) {
    return { success: false, reason: 'amount must be positive' };
  }
  if (direction !== 'YES' && direction !== 'NO') {
    return { success: false, reason: 'direction must be YES or NO' };
  }

  const priceBefore = getPrice(market);
  const minted = amount; // 1 complete set per $1

  let sharesReceived, effectivePrice;

  if (direction === 'YES') {
    // Mint complete sets, sell NO shares back to pool
    const newReserveNo = market.reserve_no + minted;
    const newReserveYes = market.k / newReserveNo;
    sharesReceived = minted + (market.reserve_yes - newReserveYes);
    market.reserve_yes = newReserveYes;
    market.reserve_no = newReserveNo;
  } else {
    // Mint complete sets, sell YES shares back to pool
    const newReserveYes = market.reserve_yes + minted;
    const newReserveNo = market.k / newReserveYes;
    sharesReceived = minted + (market.reserve_no - newReserveNo);
    market.reserve_no = newReserveNo;
    market.reserve_yes = newReserveYes;
  }

  effectivePrice = amount / sharesReceived;
  const priceAfter = getPrice(market);

  const trade = {
    agent_id: agentId,
    agent_type: agentType,
    agent_persona: meta.persona || null,
    agent_risk: meta.risk || null,
    direction,
    amount,
    shares_received: sharesReceived,
    effective_price: effectivePrice,
    price_before: priceBefore,
    price_after: priceAfter,
    reasoning: meta.reasoning || null,
    round: meta.round || 0,
    timestamp: new Date().toISOString()
  };

  market.trades.push(trade);
  return { success: true, trade };
}

/**
 * Get LLM trading summary for a specific round
 * Used by heuristic agents to determine their reaction
 * @param {Object} market
 * @param {number} round
 * @returns {Object} summary
 */
function getLLMSummary(market, round) {
  const llmTrades = market.trades.filter(
    t => t.agent_type === 'llm' && t.round === round
  );

  const yesCount = llmTrades.filter(t => t.direction === 'YES').length;
  const noCount = llmTrades.filter(t => t.direction === 'NO').length;
  const totalLLM = yesCount + noCount;

  const yesAmount = llmTrades.filter(t => t.direction === 'YES')
    .reduce((sum, t) => sum + t.amount, 0);
  const noAmount = llmTrades.filter(t => t.direction === 'NO')
    .reduce((sum, t) => sum + t.amount, 0);

  const majorityDirection = yesCount >= noCount ? 'YES' : 'NO';
  const consensusStrength = totalLLM > 0
    ? Math.max(yesCount, noCount) / totalLLM
    : 0.5;

  return {
    round,
    yes_count: yesCount,
    no_count: noCount,
    nothing_count: 30 - totalLLM, // 30 LLM agents total
    total_traded: totalLLM,
    yes_amount: yesAmount,
    no_amount: noAmount,
    avg_amount: totalLLM > 0 ? (yesAmount + noAmount) / totalLLM : 0,
    majority_direction: majorityDirection,
    consensus_strength: consensusStrength // 0.5 = split, 1.0 = unanimous
  };
}

/**
 * Record end-of-round price snapshot
 * @param {Object} market
 * @param {number} round
 */
function recordRoundPrice(market, round) {
  market.round_prices.push({
    round,
    price: getPrice(market),
    total_trades: market.trades.filter(t => t.round === round).length,
    timestamp: new Date().toISOString()
  });
}

/**
 * Settle prediction — return final results
 * @param {Object} market
 * @returns {Object} settlement data
 */
function settlePrediction(market) {
  const finalPrice = getPrice(market);

  return {
    token_symbol: market.tokenSymbol,
    amm_final_price: finalPrice,
    microbuzz_score: Math.round(finalPrice * 100),
    round_prices: market.round_prices,
    total_trades: market.trades.length,
    reserve_yes: market.reserve_yes,
    reserve_no: market.reserve_no,
    trades: market.trades,
    settled_at: new Date().toISOString()
  };
}

module.exports = {
  createMarket,
  getPrice,
  agentTrade,
  getLLMSummary,
  recordRoundPrice,
  settlePrediction,
  INITIAL_RESERVE
};
