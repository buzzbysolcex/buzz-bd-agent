/**
 * Cost Tracker Service
 * Tracks API costs per endpoint, per auth method
 * Budget enforcement: x402 $0.50/day default
 */

const { getDb } = require('../db');

function trackCost({ requestId, endpoint, chain, depth, agentTimings, authMethod }) {
  try {
    const db = getDb();
    
    // Estimate costs based on sub-agent usage
    const costs = estimateCosts(depth, agentTimings);
    
    db.prepare(`
      INSERT INTO cost_log 
      (request_id, endpoint, chain, depth, auth_method, 
       estimated_cost_usd, llm_cost_usd, api_cost_usd, 
       duration_ms, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      requestId,
      endpoint,
      chain,
      depth,
      authMethod,
      costs.total,
      costs.llm,
      costs.api,
      Object.values(agentTimings).reduce((a, b) => a + b, 0)
    );

  } catch (err) {
    console.error(`[cost-tracker] ❌ Failed:`, err.message);
  }
}

function estimateCosts(depth, agentTimings) {
  // gpt-5-nano: $0.10/$0.40 per 1M tokens
  // Typical sub-agent call: ~5K input + 2K output tokens
  const perAgentLlmCost = (5000 * 0.10 / 1000000) + (2000 * 0.40 / 1000000); // ~$0.0013
  const agentCount = 5;
  const llmCost = perAgentLlmCost * agentCount;
  
  // API costs (DexScreener free, Helius free tier, Serper free tier, etc.)
  const apiCost = depth === 'deep' ? 0.001 : 0; // Nansen L5 costs extra
  
  // AgentProof telemetry: $0.05/call
  const agentproofCost = 0.05;

  return {
    llm: Math.round(llmCost * 10000) / 10000,
    api: apiCost,
    agentproof: agentproofCost,
    total: Math.round((llmCost + apiCost + agentproofCost) * 10000) / 10000
  };
}

module.exports = { trackCost };
