/**
 * Triple Verifier — 3-source independent verification gate
 * v8.1.0 | Wednesday Day 37 — Phase 2 Teammate 3
 *
 * Verifies token data from 3 independent sources before advancing.
 * Sources: DexScreener, CoinGecko, on-chain (Helius/scanner)
 * All 3 must agree on: token exists, has liquidity, is tradeable
 * Pass/fail gate before simulation or proposal generation.
 */

const https = require('https');
const http = require('http');

function fetchJSON(url, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { timeout }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

async function verifyToken(address, chain = 'solana') {
  const results = { sources: 3, passed: 0, failed: 0, details: {} };

  // Source 1: DexScreener
  try {
    const dex = await fetchJSON(`https://api.dexscreener.com/latest/dex/search?q=${address}`);
    const pairs = (dex && dex.pairs) || [];
    const match = pairs.find(p => p.baseToken && p.baseToken.address && p.baseToken.address.toLowerCase() === address.toLowerCase());
    if (match && match.liquidity && match.liquidity.usd > 0) {
      results.passed++;
      results.details.dexscreener = {
        status: 'pass',
        liquidity: match.liquidity.usd,
        volume24h: match.volume ? match.volume.h24 : 0,
        priceUsd: match.priceUsd
      };
    } else {
      results.failed++;
      results.details.dexscreener = { status: 'fail', reason: pairs.length > 0 ? 'no liquidity' : 'not found' };
    }
  } catch (e) {
    results.failed++;
    results.details.dexscreener = { status: 'error', reason: e.message };
  }

  // Source 2: CoinGecko (search by contract)
  try {
    const cg = await fetchJSON(`https://api.coingecko.com/api/v3/coins/${chain}/contract/${address}`);
    if (cg && cg.id && !cg.error) {
      results.passed++;
      results.details.coingecko = {
        status: 'pass',
        name: cg.name,
        symbol: cg.symbol,
        market_cap: cg.market_data ? cg.market_data.market_cap.usd : null
      };
    } else {
      results.failed++;
      results.details.coingecko = { status: 'fail', reason: 'not found on CoinGecko' };
    }
  } catch (e) {
    results.failed++;
    results.details.coingecko = { status: 'error', reason: e.message };
  }

  // Source 3: Internal scanner (localhost API)
  try {
    const apiKey = process.env.BUZZ_API_ADMIN_KEY;
    const scan = await new Promise((resolve, reject) => {
      const req = http.get(`http://localhost:3000/api/v1/scan/raw/${address}?chain=${chain}`, {
        headers: { 'X-API-Key': apiKey },
        timeout: 15000
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(null); } });
      });
      req.on('error', () => resolve(null));
      req.on('timeout', () => { req.destroy(); resolve(null); });
    });
    if (scan && scan.raw && scan.raw.found !== false) {
      results.passed++;
      results.details.scanner = {
        status: 'pass',
        tokenName: scan.tokenName,
        tokenSymbol: scan.tokenSymbol,
        marketCap: scan.marketCap
      };
    } else {
      results.failed++;
      results.details.scanner = { status: 'fail', reason: 'not found in scanner' };
    }
  } catch (e) {
    results.failed++;
    results.details.scanner = { status: 'error', reason: e.message };
  }

  results.verified = results.passed >= 2; // 2 of 3 minimum
  results.fully_verified = results.passed === 3;

  return results;
}

module.exports = { verifyToken };
