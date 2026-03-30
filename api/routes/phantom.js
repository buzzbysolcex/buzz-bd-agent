/**
 * Phantom MCP Routes — Intel Source #31
 * 4 chains (Solana, Ethereum, Bitcoin, Sui), wallet ops + price verification
 *
 * GET /api/v1/phantom/status        — Connection health
 * GET /api/v1/phantom/price/:token  — Price verification via swap quote
 * GET /api/v1/phantom/wallet        — Wallet balance check
 *
 * App ID: be4a0179-1113-416b-a6e6-45a09191f407
 * Auth: SSO required (one-time from Ogie's Mac)
 * Safety: READ-ONLY. No transfers without CEO approval.
 *
 * Buzz BD Agent v8.3.0 | Day 42
 */

const express = require('express');
const router = express.Router();

const PHANTOM_APP_ID = 'be4a0179-1113-416b-a6e6-45a09191f407';
const PHANTOM_SESSION_PATH = '/home/claude-code/.phantom-mcp/session.json';

// ─── Check if Phantom session exists ─────────────────
function hasSession() {
  try {
    require('fs').accessSync(PHANTOM_SESSION_PATH);
    return true;
  } catch {
    return false;
  }
}

// ─── GET /status ─────────────────────────────────────
router.get('/status', (req, res) => {
  const sessionExists = hasSession();

  res.json({
    service: 'phantom-mcp',
    intel_source: 31,
    app_id: PHANTOM_APP_ID,
    session_exists: sessionExists,
    auth_status: sessionExists ? 'authenticated' : 'needs_sso',
    supported_chains: [
      { chain: 'solana', network_id: 'solana:mainnet' },
      { chain: 'ethereum', network_id: 'eip155:1' },
      { chain: 'bitcoin', network_id: 'bip122:000000000019d6689c085ae165831e93' },
      { chain: 'sui', network_id: 'sui:mainnet' },
    ],
    capabilities: {
      read: ['get_wallet_addresses', 'buy_token (quote only)'],
      write: ['sign_message (identity only)'],
      restricted: ['transfer_tokens (CEO approval)', 'buy_token (execute)'],
    },
    next_action: sessionExists
      ? 'Phantom MCP ready for read operations'
      : 'SSO auth required: run npx @phantom/mcp-server on Ogie Mac, copy session.json to Hetzner',
  });
});

// ─── GET /price/:token ───────────────────────────────
router.get('/price/:token', async (req, res) => {
  const { token } = req.params;
  const chain = req.query.chain || 'solana';

  if (!hasSession()) {
    return res.status(503).json({
      error: 'phantom_not_authenticated',
      message: 'SSO auth required from Ogie Mac. Session not found.',
      next_action: 'Run npx @phantom/mcp-server on Mac, copy session.json to Hetzner',
    });
  }

  // Phantom price verification via swap quote (execute=false)
  // This requires the @phantom/mcp-server package
  try {
    // Attempt to use phantom MCP for price quote
    res.json({
      token,
      chain,
      status: 'session_exists_but_mcp_bridge_not_built',
      message: 'Phantom session found. MCP bridge module needed to query swap quotes.',
      next_step: 'Build api/services/phantom-bridge.js to connect to @phantom/mcp-server',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /wallet ─────────────────────────────────────
router.get('/wallet', async (req, res) => {
  if (!hasSession()) {
    return res.status(503).json({
      error: 'phantom_not_authenticated',
      message: 'SSO auth required from Ogie Mac.',
    });
  }

  res.json({
    status: 'session_exists_but_mcp_bridge_not_built',
    message: 'Phantom session found. Build phantom-bridge.js for wallet address queries.',
    app_id: PHANTOM_APP_ID,
  });
});

module.exports = router;
