/**
 * Buzz BD Agent — Intelligence Source Routes
 * 
 * GET  /api/v1/intel/sources           → List all 18 intel sources + status
 * GET  /api/v1/intel/sources/:id       → Get specific source details
 * GET  /api/v1/intel/trending          → Latest trending tokens (DexScreener + AIXBT)
 * GET  /api/v1/intel/boosted           → Currently boosted tokens (DexScreener Boosts)
 * GET  /api/v1/intel/momentum          → AIXBT momentum signals
 */

const express = require('express');
const router = express.Router();
const { getDB } = require('../db');
const fs = require('fs');
const path = require('path');

// Intel source registry — matches Master Ops 19/19 sources
const INTEL_SOURCES = [
  { id: 'dexscreener', name: 'DexScreener API', layer: 'L1', endpoint: 'api.dexscreener.com', env_key: 'DEXSCREENER_BASE_URL' },
  { id: 'geckoterminal', name: 'GeckoTerminal', layer: 'L1', endpoint: 'api.geckoterminal.com', env_key: null },
  { id: 'aixbt', name: 'AIXBT', layer: 'L1', endpoint: 'aixbt.tech/projects', env_key: null },
  { id: 'ds-boosts', name: 'DexScreener Boosts', layer: 'L1', endpoint: 'api.dexscreener.com/token-boosts', env_key: 'DEXSCREENER_BASE_URL' },
  { id: 'cmc', name: 'CoinMarketCap', layer: 'L1', endpoint: 'pro-api.coinmarketcap.com', env_key: 'CMC_API_KEY' },
  { id: 'rugcheck', name: 'RugCheck', layer: 'L2', endpoint: 'api.rugcheck.xyz', env_key: null },
  { id: 'dflow', name: 'DFlow MCP', layer: 'L2', endpoint: 'OpenClaw MCP', env_key: null },
  { id: 'helius', name: 'Helius', layer: 'L2', type: 'MCP+REST', endpoint: 'mainnet.helius-rpc.com', env_key: 'HELIUS_API_KEY' },
  { id: 'allium', name: 'Allium', layer: 'L2', endpoint: 'api.allium.so', env_key: 'ALLIUM_API_KEY' },
  { id: 'grok', name: 'Grok x_search', layer: 'L3', endpoint: 'api.x.ai', env_key: 'GROK_API_KEY' },
  { id: 'serper', name: 'Serper', layer: 'L3', endpoint: 'google.serper.dev', env_key: 'SERPER_API_KEY' },
  { id: 'atv', name: 'ATV Web3 Identity', layer: 'L3', endpoint: 'api.web3identity.com', env_key: 'ATV_API_URL' },
  { id: 'firecrawl', name: 'Firecrawl', layer: 'L3', endpoint: 'api.firecrawl.dev', env_key: 'FIRECRAWL_API_KEY' },
  { id: 'nansen', name: 'Nansen x402', layer: 'L5', endpoint: 'x402 micropayment', env_key: 'NANSEN_X402_ENABLED' },
  { id: 'twitter', name: 'X API v2', layer: 'Amplify', endpoint: 'api.twitter.com', env_key: 'X_API_KEY' },
  { id: 'bankr', name: 'Bankr CLI', layer: 'Deploy', endpoint: 'api.bankr.bot', env_key: 'BANKR_API_KEY' },
  { id: 'moltbook', name: 'Moltbook', layer: 'Social', endpoint: 'moltbook.com', env_key: 'MOLTBOOK_API_KEY' },
  { id: 'bnbchain', name: 'BNB Chain MCP', layer: 'L1', type: 'MCP', endpoint: 'OpenClaw MCP', env_key: 'BNB_PRIVATE_KEY' },
  { id: 'helius-mcp', name: 'Helius MCP', layer: 'L2', type: 'MCP', endpoint: 'mainnet.helius-rpc.com', env_key: 'HELIUS_API_KEY', tools: 60 },
];

// ─── GET /sources ────────────────────────────────────
router.get('/sources', (req, res) => {
  const sources = INTEL_SOURCES.map(s => ({
    ...s,
    configured: s.env_key ? !!process.env[s.env_key] : true,
    status: s.env_key ? (process.env[s.env_key] ? 'active' : 'unconfigured') : 'active'
  }));

  const active = sources.filter(s => s.status === 'active').length;
  res.json({
    total: sources.length,
    active,
    unconfigured: sources.length - active,
    sources
  });
});

// ─── GET /sources/:id ────────────────────────────────
router.get('/sources/:id', (req, res) => {
  const source = INTEL_SOURCES.find(s => s.id === req.params.id);
  if (!source) return res.status(404).json({ error: 'source_not_found' });

  res.json({
    ...source,
    configured: source.env_key ? !!process.env[source.env_key] : true,
    status: source.env_key ? (process.env[source.env_key] ? 'active' : 'unconfigured') : 'active'
  });
});

// ─── GET /trending ───────────────────────────────────
// Returns latest trending data from scan history
router.get('/trending', (req, res) => {
  const { chain, limit } = req.query;
  const db = getDB();

  let sql = `SELECT * FROM pipeline_tokens WHERE stage IN ('discovered', 'scanned', 'scored')`;
  const params = [];
  if (chain) { sql += ' AND chain = ?'; params.push(chain); }
  sql += ' ORDER BY created_at DESC LIMIT ?';
  params.push(parseInt(limit) || 20);

  const tokens = db.prepare(sql).all(...params);
  res.json({ count: tokens.length, chain: chain || 'all', tokens });
});

// ─── GET /boosted ────────────────────────────────────
// Returns tokens that were flagged as boosted
router.get('/boosted', (req, res) => {
  const db = getDB();
  const limit = parseInt(req.query.limit) || 10;

  const tokens = db.prepare(`
    SELECT * FROM pipeline_tokens 
    WHERE source LIKE '%boost%' OR notes LIKE '%boost%'
    ORDER BY created_at DESC LIMIT ?
  `).all(limit);

  res.json({ count: tokens.length, tokens });
});

// ─── GET /momentum ───────────────────────────────────
// Returns AIXBT momentum signals from pipeline
router.get('/momentum', (req, res) => {
  const db = getDB();
  const min_score = parseInt(req.query.min_score) || 50;

  const tokens = db.prepare(`
    SELECT * FROM pipeline_tokens 
    WHERE score >= ? AND source LIKE '%aixbt%'
    ORDER BY score DESC LIMIT 20
  `).all(min_score);

  res.json({ count: tokens.length, min_score, tokens });
});

module.exports = router;
