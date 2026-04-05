/**
 * ACP / Virtuals Protocol — Status & Health Routes
 * Agent Commerce Protocol integration status
 */

const express = require('express');
const router = express.Router();
const { apiKeyAuth } = require('../middleware/auth');

router.use(apiKeyAuth);

// GET /api/v1/acp/status — ACP runtime status
router.get('/status', (req, res) => {
  const agentId = process.env.ACP_AGENT_ID || null;
  const walletAddress = process.env.ACP_WALLET_ADDRESS || null;
  const ownerAddress = process.env.ACP_OWNER_ADDRESS || null;

  res.json({
    agent_id: agentId,
    wallet: walletAddress,
    owner: ownerAddress,
    configured: !!(agentId && walletAddress),
    runtime: agentId ? 'registered' : 'not_configured',
    protocol: 'Virtuals Protocol ACP',
    erc8004: '#17681'
  });
});

module.exports = router;
