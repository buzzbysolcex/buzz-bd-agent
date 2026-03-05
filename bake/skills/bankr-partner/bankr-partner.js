/**
 * bankr-partner.js — Buzz BD Agent Bankr Partner Integration
 * Partner Deploy API | Token Launching | Fee Collection
 *
 * Partner Key: via BANKR_PARTNER_KEY env
 * Fee Wallet:  0x2Dc03124091104E7798C0273D96FC5ED65F05aA9
 * Deploy Wallet: 0xfa04c7d627ba707a1ad17e72e094b45150665593
 * Fee Split: 50% from Bankr's portion (~9% of total 1.2% swap fee)
 *
 * Buzz BD Agent | SolCex Exchange
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// ─── CONFIG ─────────────────────────────────────────────
const CONFIG = {
  partnerKey: process.env.BANKR_PARTNER_KEY,
  feeWallet: process.env.BANKR_FEE_WALLET || '0x2Dc03124091104E7798C0273D96FC5ED65F05aA9',
  deployWallet: process.env.BANKR_DEPLOY_WALLET || '0xfa04c7d627ba707a1ad17e72e094b45150665593',
  apiBaseUrl: 'api.bankr.bot',
  agentApiKey: process.env.BANKR_AGENT_API_KEY,
  // Paths
  deploysDir: '/data/workspace/bankr/deploys/',
  feesDir: '/data/workspace/bankr/fees/',
  logsDir: '/data/workspace/bankr/logs/',
};

// Ensure directories exist
[CONFIG.deploysDir, CONFIG.feesDir, CONFIG.logsDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ─── HTTP REQUEST HELPER ────────────────────────────────
function bankrRequest(method, requestPath, body = null, useAgentKey = false) {
  return new Promise((resolve, reject) => {
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'BuzzBDAgent/6.2.0',
    };
    if (useAgentKey && CONFIG.agentApiKey) {
      headers['X-API-Key'] = CONFIG.agentApiKey;
    } else {
      headers['X-Partner-Key'] = CONFIG.partnerKey;
    }

    const options = {
      hostname: CONFIG.apiBaseUrl,
      port: 443,
      path: requestPath,
      method,
      headers,
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) {
            const err = new Error(`Bankr ${res.statusCode}: ${JSON.stringify(parsed)}`);
            err.statusCode = res.statusCode;
            err.response = parsed;
            reject(err);
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(new Error(`Bankr parse error: ${e.message} | Raw: ${data.slice(0, 300)}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Bankr API timeout (30s)')); });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ─── TOKEN DEPLOYMENT ───────────────────────────────────

/**
 * Deploy a token via Partner API
 *
 * Fee distribution (1.2% swap fee):
 *   Creator (feeRecipient): 57%
 *   Bankr platform: ~18%
 *   Partner (Buzz/SolCex): ~18% (50% of Bankr's share)
 *   Ecosystem: ~2%
 *   Protocol (Doppler): 5%
 *
 * @param {Object} params
 * @param {string} params.tokenName - Token name (1-100 chars, required)
 * @param {string} [params.tokenSymbol] - Ticker (1-10 chars)
 * @param {string} [params.description] - Description (max 500 chars)
 * @param {string} [params.image] - URL to token logo
 * @param {string} [params.tweetUrl] - URL to announcement tweet
 * @param {string} [params.websiteUrl] - Token website URL
 * @param {Object} [params.feeRecipient] - Fee recipient { type, value }
 * @param {boolean} [params.simulateOnly] - If true, returns predicted address without broadcasting
 * @returns {Object} { success, tokenAddress, poolId, txHash, chain, feeDistribution }
 */
async function deployToken({
  tokenName,
  tokenSymbol,
  description,
  image,
  tweetUrl,
  websiteUrl,
  feeRecipient,
  simulateOnly = false,
}) {
  if (!CONFIG.partnerKey) {
    throw new Error('BANKR_PARTNER_KEY not configured');
  }
  if (!tokenName || tokenName.length < 1 || tokenName.length > 100) {
    throw new Error('tokenName required (1-100 chars)');
  }

  const body = {
    tokenName,
    tokenSymbol: tokenSymbol || tokenName.replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase(),
    feeRecipient: feeRecipient || {
      type: 'wallet',
      value: CONFIG.feeWallet,
    },
    simulateOnly,
  };

  if (description) body.description = description.slice(0, 500);
  if (image) body.image = image;
  if (tweetUrl) body.tweetUrl = tweetUrl;
  if (websiteUrl) body.websiteUrl = websiteUrl;

  const result = await bankrRequest('POST', '/token-launches/deploy', body);

  // Log deployment
  const logEntry = {
    timestamp: new Date().toISOString(),
    tokenName,
    tokenSymbol: body.tokenSymbol,
    simulateOnly,
    tokenAddress: result.tokenAddress,
    poolId: result.poolId,
    txHash: result.txHash,
    chain: result.chain,
    feeDistribution: result.feeDistribution,
  };

  const logFile = path.join(CONFIG.deploysDir, `${body.tokenSymbol}-${Date.now()}.json`);
  fs.writeFileSync(logFile, JSON.stringify(logEntry, null, 2));

  if (!simulateOnly) {
    console.log(`[BANKR] Token deployed: ${tokenName} (${body.tokenSymbol}) → ${result.tokenAddress}`);
    console.log(`[BANKR] TX: ${result.txHash}`);
    console.log(`[BANKR] Pool: ${result.poolId}`);
  } else {
    console.log(`[BANKR] Simulation: ${tokenName} → predicted ${result.tokenAddress}`);
  }

  return result;
}

/**
 * Simulate deployment (no gas, no broadcast)
 */
async function simulateDeploy(tokenName, tokenSymbol) {
  return deployToken({ tokenName, tokenSymbol, simulateOnly: true });
}

/**
 * Deploy with fee recipient set to a Twitter/X user
 */
async function deployForTwitterUser(tokenName, tokenSymbol, xHandle, options = {}) {
  return deployToken({
    tokenName,
    tokenSymbol,
    feeRecipient: { type: 'x', value: xHandle.replace('@', '') },
    ...options,
  });
}

/**
 * Deploy with fee recipient set to an ENS name
 */
async function deployForENS(tokenName, tokenSymbol, ensName, options = {}) {
  return deployToken({
    tokenName,
    tokenSymbol,
    feeRecipient: { type: 'ens', value: ensName },
    ...options,
  });
}

// ─── FEE MANAGEMENT ─────────────────────────────────────

async function checkFees(tokenName) {
  if (!CONFIG.agentApiKey) {
    return { error: 'BANKR_AGENT_API_KEY not set — check fees manually at bankr.bot' };
  }
  return executeBankrPrompt(`check fees for ${tokenName}`);
}

async function claimFees(tokenName) {
  if (!CONFIG.agentApiKey) {
    return { error: 'BANKR_AGENT_API_KEY not set — claim fees manually at bankr.bot' };
  }
  return executeBankrPrompt(`claim my fees for ${tokenName}`);
}

async function executeBankrPrompt(prompt) {
  const submitRes = await bankrRequest('POST', '/agent/prompt', { prompt }, true);
  const jobId = submitRes.jobId;
  if (!jobId) throw new Error(`Bankr prompt failed: ${JSON.stringify(submitRes)}`);

  for (let i = 0; i < 60; i++) {
    const status = await bankrRequest('GET', `/agent/job/${jobId}`, null, true);
    if (status.status === 'completed') {
      logAction('bankr_prompt', { prompt, response: status.response?.slice(0, 200) });
      return status.response;
    }
    if (status.status === 'failed') {
      throw new Error(`Bankr prompt failed: ${status.error}`);
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  throw new Error('Bankr prompt timeout (120s)');
}

// ─── DEPLOYMENT HISTORY ─────────────────────────────────

function getDeployHistory() {
  if (!fs.existsSync(CONFIG.deploysDir)) return [];
  return fs.readdirSync(CONFIG.deploysDir)
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(fs.readFileSync(path.join(CONFIG.deploysDir, f), 'utf-8')))
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

function getDeployBySymbol(symbol) {
  return getDeployHistory().find(d =>
    d.tokenSymbol?.toLowerCase() === symbol.toLowerCase()
  );
}

// ─── TWEET FORMATTER FOR LAUNCHES ───────────────────────

function formatLaunchTweet(deployResult, extra = {}) {
  const { tokenAddress, txHash, chain } = deployResult;
  const symbol = extra.tokenSymbol || 'TOKEN';
  const name = extra.tokenName || symbol;

  return [
    `🐝 NEW LAUNCH: $${symbol}`,
    ``,
    `${name} deployed on ${chain || 'Base'} via @bankrbot Partner API`,
    ``,
    `CA: ${tokenAddress}`,
    `TX: ${txHash?.slice(0, 10)}...${txHash?.slice(-6)}`,
    ``,
    `Trade: bankr.bot/launches/${tokenAddress}`,
    ``,
    `Fees flow to @SolCex_Exchange ecosystem`,
    ``,
    `#${symbol} #SolCex #Base #AIAgents #Bankr`,
  ].join('\n');
}

// ─── LOGGING ────────────────────────────────────────────
function logAction(action, data) {
  const entry = { action, timestamp: new Date().toISOString(), ...data };
  const logFile = path.join(CONFIG.logsDir, `${new Date().toISOString().split('T')[0]}.jsonl`);
  fs.appendFileSync(logFile, JSON.stringify(entry) + '\n');
}

// ─── HEALTH CHECK ───────────────────────────────────────
function healthCheck() {
  return {
    partnerKeySet: !!CONFIG.partnerKey,
    agentApiKeySet: !!CONFIG.agentApiKey,
    feeWallet: CONFIG.feeWallet,
    deployWallet: CONFIG.deployWallet,
    totalDeploys: getDeployHistory().length,
    liveDeploys: getDeployHistory().filter(d => !d.simulateOnly).length,
  };
}

// ─── EXPORTS ────────────────────────────────────────────
module.exports = {
  deployToken,
  simulateDeploy,
  deployForTwitterUser,
  deployForENS,
  checkFees,
  claimFees,
  getDeployHistory,
  getDeployBySymbol,
  formatLaunchTweet,
  healthCheck,
};
