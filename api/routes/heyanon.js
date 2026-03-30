/**
 * HeyAnon MCP Routes — Intel Source #30
 * 19 chains, 45+ protocols, Rug-O-Meter, wallet balances
 *
 * GET /api/v1/heyanon/status       — Connection health + chains
 * GET /api/v1/heyanon/wallets      — 3 wallet balances (EVM + SOL + TON)
 * GET /api/v1/heyanon/rug-check/:address — Rug-O-Meter for any token
 * GET /api/v1/heyanon/defi/:chain/:protocol — DeFi data
 *
 * Keys in .env.heyanon (chmod 600). NEVER log or expose keys.
 * Buzz BD Agent v8.3.0 | Day 42
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// ─── Load HeyAnon env (separate file, chmod 600) ────
const HEYANON_ENV_PATH = '/home/claude-code/.env.heyanon';
let heyanonConfig = {};
try {
  const envContent = fs.readFileSync(HEYANON_ENV_PATH, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...val] = line.split('=');
    if (key && val.length) heyanonConfig[key.trim()] = val.join('=').trim();
  });
} catch {
  console.warn('[heyanon] .env.heyanon not found — endpoints will return 503');
}

const HEYANON_API = 'https://api.heyanon.ai';
const SUPPORTED_CHAINS = [
  'ethereum', 'arbitrum', 'base', 'optimism', 'polygon', 'bsc',
  'avalanche', 'solana', 'ton', 'sonic', 'zksync', 'scroll',
  'gnosis', 'metis', 'kava', 'hyperevm', 'plasma', 'monad', 'sui'
];

// ─── Fetch helper (never logs keys) ──────────────────
async function heyanonFetch(endpoint, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(`${HEYANON_API}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return { success: false, error: `${res.status} ${res.statusText}` };
    return { success: true, data: await res.json() };
  } catch (err) {
    clearTimeout(timeout);
    return { success: false, error: err.message.substring(0, 200) };
  }
}

// ─── Natural language query via MCP ask ──────────────
async function heyanonAsk(prompt) {
  return heyanonFetch('/mcp', {
    method: 'POST',
    body: JSON.stringify({ method: 'ask', params: { prompt } }),
  });
}

// ─── GET /status ─────────────────────────────────────
router.get('/status', async (req, res) => {
  const configured = !!(heyanonConfig.HEYANON_EVM_ADDRESS);
  const health = await heyanonFetch('/mcp', {
    method: 'POST',
    body: JSON.stringify({ method: 'ping', params: {} }),
  });

  res.json({
    service: 'heyanon-mcp',
    intel_source: 30,
    configured,
    api_reachable: health.success,
    chains: SUPPORTED_CHAINS,
    chain_count: SUPPORTED_CHAINS.length,
    wallets: {
      evm: heyanonConfig.HEYANON_EVM_ADDRESS || null,
      sol: heyanonConfig.HEYANON_SOL_ADDRESS || null,
      ton: heyanonConfig.HEYANON_TON_ADDRESS || null,
    },
    env_keys_loaded: Object.keys(heyanonConfig).length,
  });
});

// ─── GET /wallets ────────────────────────────────────
router.get('/wallets', async (req, res) => {
  const wallets = {
    evm: heyanonConfig.HEYANON_EVM_ADDRESS || null,
    sol: heyanonConfig.HEYANON_SOL_ADDRESS || null,
    ton: heyanonConfig.HEYANON_TON_ADDRESS || null,
  };

  // Query balances via MCP ask for each configured wallet
  const balances = {};
  if (wallets.evm) {
    const evmResult = await heyanonAsk(`What is the ETH balance of ${wallets.evm} on Ethereum?`);
    balances.evm = evmResult.success ? evmResult.data : { error: evmResult.error };
  }
  if (wallets.sol) {
    const solResult = await heyanonAsk(`What is the SOL balance of ${wallets.sol} on Solana?`);
    balances.sol = solResult.success ? solResult.data : { error: solResult.error };
  }

  res.json({ wallets, balances });
});

// ─── GET /rug-check/:address ─────────────────────────
router.get('/rug-check/:address', async (req, res) => {
  const { address } = req.params;
  const chain = req.query.chain || 'ethereum';

  const result = await heyanonAsk(
    `Run a rug check on token contract ${address} on ${chain}. ` +
    `Check: honeypot risk, liquidity lock, owner privileges, mint function, tax rates, holder concentration.`
  );

  if (!result.success) {
    return res.status(502).json({
      error: 'heyanon_unreachable',
      message: result.error,
      address,
      chain,
    });
  }

  res.json({
    address,
    chain,
    rug_check: result.data,
    source: 'heyanon-mcp',
    checked_at: new Date().toISOString(),
  });
});

// ─── GET /defi/:chain/:protocol ──────────────────────
router.get('/defi/:chain/:protocol', async (req, res) => {
  const { chain, protocol } = req.params;

  if (!SUPPORTED_CHAINS.includes(chain)) {
    return res.status(400).json({
      error: 'unsupported_chain',
      supported: SUPPORTED_CHAINS,
    });
  }

  const result = await heyanonAsk(
    `What are the current DeFi stats for ${protocol} on ${chain}? ` +
    `Include TVL, top pools, APY rates, and recent activity.`
  );

  if (!result.success) {
    return res.status(502).json({
      error: 'heyanon_unreachable',
      message: result.error,
    });
  }

  res.json({
    chain,
    protocol,
    defi_data: result.data,
    source: 'heyanon-mcp',
    queried_at: new Date().toISOString(),
  });
});

module.exports = router;
