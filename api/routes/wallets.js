/**
 * Buzz BD Agent — Wallet Routes
 * 
 * GET  /api/v1/wallets                  → Full wallet registry
 * GET  /api/v1/wallets/:label           → Specific wallet details
 * GET  /api/v1/wallets/deploys          → Bankr deploy history
 * GET  /api/v1/wallets/x402             → x402 payment status + spend
 * GET  /api/v1/wallets/revenue          → Revenue tracking (listing fees, BaaS)
 */

const express = require('express');
const router = express.Router();
const { getDB } = require('../db');

// Wallet registry — v6.1.1 (from Master Ops)
const WALLET_REGISTRY = [
  // ─── Active EVM ───
  { label: 'anet-main', address: '0x2Dc03124091104E7798C0273D96FC5ED65F05aA9', chain: 'base', role: 'Main ops, Bankr fees, LLM, AgentProof', active: true },
  { label: 'deploy', address: '0xfa04c7d627ba707a1ad17e72e094b45150665593', chain: 'base', role: 'Token deployment', active: true },
  { label: 'trading', address: '0x8ea018a9bF1Ae68AAEF7ad0d8E2AB82F3F3Ab967', chain: 'base', role: 'Trading operations', active: true },
  { label: 'buzz-base', address: '0x4b36DEdBb1c5D1e2c3c02A73C58bA2dF7b8082Ab', chain: 'base', role: 'Base operations', active: true },
  { label: 'acp-wallet', address: '0x01aBCA1E419A8abBf2a1D44Ba5e31F62F601dA19', chain: 'base', role: 'ACP Virtuals Protocol', active: true },
  // ─── Active Solana ───
  { label: 'lobster', address: '5iC7pGyzqpXD2xTK4Ww7zKRDVo9cceyHNeKBTiemo5Jp', chain: 'solana', role: 'SOL operations', active: true },
  { label: 'phantom-8004', address: '2dc6DrUypLL6519FEQ1fY5Uj3W3z3NgSzzgH6JieXSYc', chain: 'solana', role: 'Solana 8004 registry', active: true },
  // ─── Deprecated ───
  { label: 'clawrouter', address: '0x56f76...5C980', chain: 'base', role: 'DEPRECATED - ClawRouter', active: false },
  { label: 'blockrun-x402', address: '0x6ea36...5493b', chain: 'base', role: 'DEPRECATED - key lost', active: false },
  { label: 'clawrouter-blockrun', address: '0x9b28...3A76', chain: 'base', role: 'DEPRECATED - key lost', active: false },
];

// ─── GET / ───────────────────────────────────────────
router.get('/', (req, res) => {
  const { chain, active_only } = req.query;

  let wallets = WALLET_REGISTRY;
  if (chain) wallets = wallets.filter(w => w.chain === chain);
  if (active_only === 'true') wallets = wallets.filter(w => w.active);

  // Mask middle of address for security (show first 6 + last 4)
  const masked = wallets.map(w => ({
    ...w,
    address_masked: w.address.length > 10 
      ? `${w.address.slice(0, 6)}...${w.address.slice(-4)}` 
      : w.address,
  }));

  const active = wallets.filter(w => w.active).length;
  res.json({
    total: wallets.length,
    active,
    deprecated: wallets.length - active,
    wallets: masked
  });
});

// ─── GET /deploys ────────────────────────────────────
router.get('/deploys', (req, res) => {
  const db = getDB();
  const limit = parseInt(req.query.limit) || 20;

  // Check pipeline_tokens for deployed tokens
  const deploys = db.prepare(`
    SELECT * FROM pipeline_tokens 
    WHERE stage = 'listed' OR notes LIKE '%deploy%' OR source LIKE '%bankr%'
    ORDER BY updated_at DESC LIMIT ?
  `).all(limit);

  res.json({ count: deploys.length, deploys });
});

// ─── GET /x402 ───────────────────────────────────────
router.get('/x402', (req, res) => {
  const enabled = process.env.NANSEN_X402_ENABLED === 'true';
  const dailyBudget = parseInt(process.env.NANSEN_DAILY_BUDGET_CENTS || '50') / 100;

  const db = getDB();
  const today = new Date().toISOString().slice(0, 10);
  
  // Track x402 spend from cost_log
  const todaySpend = db.prepare(`
    SELECT COALESCE(SUM(api_cost_usd), 0) as total 
    FROM cost_log 
    WHERE auth_method = 'x402' AND created_at LIKE ?
  `).get(`${today}%`);

  res.json({
    x402_enabled: enabled,
    wallet_configured: !!process.env.NANSEN_X402_WALLET_KEY,
    daily_budget_usd: dailyBudget,
    today_spend_usd: todaySpend?.total || 0,
    remaining_budget_usd: Math.max(0, dailyBudget - (todaySpend?.total || 0)),
    nansen_threshold: parseInt(process.env.NANSEN_SCORE_THRESHOLD || '65')
  });
});

// ─── GET /revenue ────────────────────────────────────
router.get('/revenue', (req, res) => {
  const db = getDB();
  const period = req.query.period || '30d';

  const periodMap = { '24h': '-1 day', '7d': '-7 days', '30d': '-30 days', 'all': '-100 years' };
  const interval = periodMap[period] || '-30 days';

  // BaaS revenue from score-token endpoint
  const baasRevenue = db.prepare(`
    SELECT COUNT(*) as queries, 
           COALESCE(SUM(estimated_cost_usd), 0) as total_usd
    FROM cost_log 
    WHERE endpoint = '/score-token' AND created_at > datetime('now', ?)
  `).get(interval);

  // Pipeline stats for listing revenue tracking
  const listings = db.prepare(`
    SELECT COUNT(*) as count FROM pipeline_tokens 
    WHERE stage = 'listed' AND updated_at > datetime('now', ?)
  `).get(interval);

  res.json({
    period,
    baas: {
      score_queries: baasRevenue?.queries || 0,
      estimated_revenue_usd: baasRevenue?.total_usd || 0,
      price_per_query: 0.05
    },
    listings: {
      count: listings?.count || 0,
      estimated_revenue_usd: (listings?.count || 0) * 1000 // $1K commission per listing
    }
  });
});

// ─── GET /:label ─────────────────────────────────────
router.get('/:label', (req, res) => {
  const wallet = WALLET_REGISTRY.find(w => w.label === req.params.label);
  if (!wallet) return res.status(404).json({ error: 'wallet_not_found' });

  res.json({
    ...wallet,
    address_masked: wallet.address.length > 10 
      ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}` 
      : wallet.address
  });
});

module.exports = router;
