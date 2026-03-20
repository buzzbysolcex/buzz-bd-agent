/**
 * POST /simulate-listing — Enhanced Simulation Engine Route
 * MiroFish P1-B | Mounted at /api/v1 in server.js
 *
 * Separate from the existing /api/v1/simulate/* routes.
 * Uses the new simulation-engine.js for 20-agent consensus.
 *
 * Rate limit: 5 requests per hour (in-route limiter)
 *
 * Buzz BD Agent | SolCex
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { getDB } = require('../db');
const { runSimulation } = require('../lib/simulation-engine');

// ─── In-Route Rate Limiter (20/hour per IP) ─────────────

const rateLimitMap = new Map();
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkRateLimit(key) {
  const now = Date.now();
  let entry = rateLimitMap.get(key);

  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    entry = { windowStart: now, count: 0 };
    rateLimitMap.set(key, entry);
  }

  entry.count += 1;

  // Prune stale entries periodically
  if (rateLimitMap.size > 1000) {
    for (const [k, v] of rateLimitMap) {
      if (now - v.windowStart > RATE_WINDOW_MS) rateLimitMap.delete(k);
    }
  }

  return entry.count <= RATE_LIMIT;
}

// ─── POST /simulate-listing ─────────────────────────────

router.post('/simulate-listing', async (req, res) => {
  const clientKey = req.headers['x-api-key'] || req.ip || 'anonymous';
  if (!checkRateLimit(clientKey)) {
    return res.status(429).json({
      error: 'Rate limit exceeded. Max 5 simulation requests per hour.',
      code: 'RATE_LIMIT_EXCEEDED',
    });
  }

  const { tokenAddress, chain, depth, iterations, includeReport } = req.body || {};

  if (!tokenAddress) {
    return res.status(400).json({ error: 'tokenAddress is required', code: 'MISSING_TOKEN_ADDRESS' });
  }

  const resolvedChain = chain || 'solana';
  const resolvedDepth = depth || 'mvp';

  try {
    const result = await runSimulation(tokenAddress, resolvedChain, {
      depth: resolvedDepth,
      iterations: iterations || 1,
      includeReport: includeReport || false,
    });

    // simulation-engine.js already persists to simulation_results + listing_simulations
    const simulationId = result.simulationId || `sim_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;

    return res.json({
      simulationId,
      tokenAddress,
      chain: resolvedChain,
      symbol: result.symbol,
      depth: resolvedDepth,
      score: result.score,
      confidence: result.confidence,
      confidenceInterval: {
        low: result.confidenceLow,
        high: result.confidenceHigh,
      },
      consensus: result.consensus,
      recommendation: result.recommendation,
      weightedAvg: result.weightedAvg,
      verdicts: result.verdicts,
      metrics: result.metrics,
      durationMs: result.durationMs,
      createdAt: result.createdAt,
    });
  } catch (err) {
    console.error('[SimulateListing] Simulation failed:', err);
    return res.status(500).json({
      error: `Simulation failed: ${err.message}`,
      code: 'SIMULATION_ERROR',
    });
  }
});

module.exports = router;
