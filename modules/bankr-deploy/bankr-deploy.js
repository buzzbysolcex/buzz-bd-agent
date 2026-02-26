/**
 * Bankr Partner Deploy API — Buzz BD Agent
 * v1.0.0 | POST https://api.bankr.bot/token-launches/deploy
 */
const https = require('https');
const BANKR_API_BASE = 'https://api.bankr.bot';
const DEPLOY_ENDPOINT = '/token-launches/deploy';
const DEFAULT_FEE_RECIPIENT = { type: 'wallet', value: '0x4b362B7db6904A72180A37307191fdDc4eD282Ab' };
const RATE_LIMIT = { standard: 50, bankrClub: 100, windowHours: 24 };

async function deployToken(options) {
  const { partnerKey, tokenName, tokenSymbol, description, image, tweetUrl, websiteUrl, feeRecipient, simulateOnly = false } = options;
  if (!partnerKey || !partnerKey.startsWith('bk_')) throw new BankrError('Invalid partner key. Must start with bk_', 'INVALID_KEY');
  if (!tokenName || tokenName.length < 1 || tokenName.length > 100) throw new BankrError('tokenName required, 1-100 characters', 'VALIDATION');
  if (tokenSymbol && (tokenSymbol.length < 1 || tokenSymbol.length > 10)) throw new BankrError('tokenSymbol must be 1-10 characters', 'VALIDATION');
  if (description && description.length > 500) throw new BankrError('description max 500 characters', 'VALIDATION');
  if (!feeRecipient || !feeRecipient.type || !feeRecipient.value) throw new BankrError('feeRecipient is required for partner deploys', 'VALIDATION');
  const validTypes = ['wallet', 'x', 'farcaster', 'ens'];
  if (!validTypes.includes(feeRecipient.type)) throw new BankrError('feeRecipient.type must be one of: ' + validTypes.join(', '), 'VALIDATION');
  const body = { tokenName, feeRecipient, simulateOnly };
  if (tokenSymbol) body.tokenSymbol = tokenSymbol;
  if (description) body.description = description;
  if (image) body.image = image;
  if (tweetUrl) body.tweetUrl = tweetUrl;
  if (websiteUrl) body.websiteUrl = websiteUrl;
  return httpPost(BANKR_API_BASE + DEPLOY_ENDPOINT, body, { 'Content-Type': 'application/json', 'X-Partner-Key': partnerKey });
}

async function simulateDeploy(options) { return deployToken({ ...options, simulateOnly: true }); }

async function deployForProspect(prospect, feeRecipient, partnerKey, simulate = true) {
  if (prospect.buzzScore !== undefined && prospect.buzzScore < 70) {
    throw new BankrError('Prospect score ' + prospect.buzzScore + ' below threshold (70).', 'SCORE_TOO_LOW');
  }
  return deployToken({
    partnerKey, tokenName: prospect.name, tokenSymbol: prospect.symbol,
    description: (prospect.description || 'Deployed via Buzz BD Agent').substring(0, 500),
    image: prospect.logoUrl, websiteUrl: prospect.website, tweetUrl: prospect.tweetUrl,
    feeRecipient: feeRecipient || DEFAULT_FEE_RECIPIENT, simulateOnly: simulate
  });
}

function feeRecipientFromTwitter(handle) { return { type: 'x', value: handle.replace('@', '') }; }
function feeRecipientFromWallet(address) {
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) throw new BankrError('Invalid EVM address format', 'VALIDATION');
  return { type: 'wallet', value: address };
}
function feeRecipientFromENS(ensName) { return { type: 'ens', value: ensName }; }
function feeRecipientFromFarcaster(username) { return { type: 'farcaster', value: username }; }

class DeployTracker {
  constructor(storageFile = null) { this.deploys = []; this.storageFile = storageFile; }
  record(result) {
    const entry = { id: result.activityId || 'sim-' + Date.now(), tokenAddress: result.tokenAddress,
      tokenName: result._pipeline?.prospectName || 'Unknown', buzzScore: result._pipeline?.buzzScore,
      type: result._pipeline?.deployType || 'UNKNOWN', chain: result.chain || 'base',
      txHash: result.txHash || null, feeDistribution: result.feeDistribution || null,
      timestamp: new Date().toISOString() };
    this.deploys.push(entry);
    if (this.storageFile) this._persist();
    return entry;
  }
  getStats() {
    const live = this.deploys.filter(d => d.type === 'LIVE');
    const sim = this.deploys.filter(d => d.type === 'SIMULATION');
    return { totalDeploys: this.deploys.length, liveDeploys: live.length, simulations: sim.length,
      tokens: live.map(d => ({ name: d.tokenName, address: d.tokenAddress, score: d.buzzScore })),
      lastDeploy: this.deploys[this.deploys.length - 1] || null };
  }
  _persist() {
    try { const fs = require('fs'); fs.writeFileSync(this.storageFile, JSON.stringify({ deploys: this.deploys, lastUpdated: new Date().toISOString() }, null, 2)); }
    catch (e) { console.error('[BankrTracker] Persist failed:', e.message); }
  }
}

function httpPost(endpoint, body, headers) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(endpoint);
    const postData = JSON.stringify(body);
    const req = https.request({
      hostname: parsedUrl.hostname, port: 443, path: parsedUrl.pathname, method: 'POST',
      headers: { ...headers, 'Content-Length': Buffer.byteLength(postData), 'User-Agent': 'BuzzBDAgent/1.0' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) {
            const e = new BankrError(parsed.error || parsed.message || 'HTTP ' + res.statusCode,
              {400:'VALIDATION',401:'AUTH_INVALID',403:'AUTH_FORBIDDEN',429:'RATE_LIMITED'}[res.statusCode] || 'API_ERROR');
            e.statusCode = res.statusCode; e.response = parsed; reject(e);
          } else resolve(parsed);
        } catch (e) { reject(new BankrError('Invalid response: ' + data.substring(0, 200), 'PARSE_ERROR')); }
      });
    });
    req.on('error', e => reject(new BankrError('Network error: ' + e.message, 'NETWORK')));
    req.setTimeout(30000, () => { req.destroy(); reject(new BankrError('Request timeout (30s)', 'TIMEOUT')); });
    req.write(postData); req.end();
  });
}

class BankrError extends Error {
  constructor(message, code) { super(message); this.name = 'BankrError'; this.code = code; }
}

module.exports = { deployToken, simulateDeploy, deployForProspect, feeRecipientFromTwitter, feeRecipientFromWallet, feeRecipientFromENS, feeRecipientFromFarcaster, DeployTracker, BankrError, BANKR_API_BASE, DEPLOY_ENDPOINT, DEFAULT_FEE_RECIPIENT, RATE_LIMIT };
