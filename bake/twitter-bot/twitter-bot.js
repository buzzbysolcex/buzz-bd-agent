#!/usr/bin/env node
// =============================================================================
// 🐝 BUZZ TWITTER BOT v3.0 — Sales Funnel + 4-Layer Intelligence Pipeline
//
// Standalone microservice running alongside OpenClaw on Akash.
// No LLM dependency. Pure code. All 4 Buzz intelligence layers.
//
// L1 TokenAgent   → DexScreener (price, vol, liq, FDV, socials, holders)
// L2 SafetyAgent  → RugCheck (Solana) / Contract checks (Base/ETH)
// L3 IdentityAgent → Blockscout deployer + ATV Web3 Identity (ENS)
// L4 ScoringAgent → 10-factor weighted scoring system (100 points) + Grade
//
// v2.2 Changes (Feb 28):
//   - Fixed scoring flatness (everything was ~50/100)
//   - Unknown/missing data now scores LOW (1-3) not MID (4-5)
//   - Volume fallback: extrapolates from h6/h1 if h24 missing
//   - Added letter grades (A/B/C/D/F)
//   - More granular scoring tiers across all factors
//   - Vol/Liq ratio bonus signal
//
// Architecture: twitter-bot.js (PID 2) ←→ Akash Container ←→ Twitter API
// Dev workflow:  Mac → Docker → GHCR → Akash (never install on Akash)
// =============================================================================

const https = require('https');
const http  = require('http');
const crypto = require('crypto');
const fs = require('fs');

// ── Config ──────────────────────────────────────────────────────────────────
const CHECK_INTERVAL_MS = 15 * 60 * 1000;   // 15 minutes
const MAX_RESULTS       = 10;                // Twitter API minimum
const MAX_REPLIES_DAY   = 12;                // Daily reply cap
const REPLY_DELAY_MS    = 30000;             // 30s between replies
const API_TIMEOUT_MS    = 15000;             // 15s per API call
const DATA_DIR          = '/data/workspace';
const REPLIED_FILE      = `${DATA_DIR}/twitter-replied.json`;
const LOG_FILE          = `${DATA_DIR}/twitter-bot.log`;
const DAILY_COUNT_FILE  = `${DATA_DIR}/twitter-daily-count.json`;
const SCAN_HISTORY_FILE = `${DATA_DIR}/twitter-scan-history.json`;

// Telegram bridge — notify Buzz after each scan
const TG_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_CHAT_ID   = process.env.TELEGRAM_CHAT_ID;

// ── Logging ─────────────────────────────────────────────────────────────────
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(LOG_FILE, line + '\n'); } catch {}
}

// ── Persistence ─────────────────────────────────────────────────────────────
function loadJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return fallback; }
}
function saveJSON(file, data) {
  try { fs.writeFileSync(file, JSON.stringify(data, null, 2)); } catch {}
}
function loadReplied() { return loadJSON(REPLIED_FILE, []); }
function saveReplied(ids) { saveJSON(REPLIED_FILE, ids.slice(-500)); }
function getDailyCount() {
  const d = loadJSON(DAILY_COUNT_FILE, { date: '', count: 0 });
  const today = new Date().toISOString().slice(0, 10);
  return d.date === today ? d : { date: today, count: 0 };
}
function incrementDailyCount() {
  const d = getDailyCount();
  d.count++;
  saveJSON(DAILY_COUNT_FILE, d);
  return d.count;
}
function saveScanHistory(scan) {
  const history = loadJSON(SCAN_HISTORY_FILE, []);
  history.push({ ...scan, timestamp: new Date().toISOString() });
  saveJSON(SCAN_HISTORY_FILE, history.slice(-200));
}

// ── Telegram: Notify Buzz ───────────────────────────────────────────────────
// Sends full scan report to Buzz via Telegram so Buzz has context for
// follow-up questions, memory, pipeline tracking, and learning.
async function notifyBuzz(l1, l2, l3, scoring, tweetId) {
  const chain = l1.chain === 'solana' ? 'SOL' : l1.chain === 'base' ? 'Base' : l1.chain.toUpperCase();

  // Build detailed report for Buzz (no 280 char limit)
  let msg = `🐝 TWITTER SCAN COMPLETED\n\n`;
  msg += `📋 Tweet: ${tweetId}\n`;
  msg += `🔗 https://x.com/BuzzBySolCex/status/${tweetId}\n\n`;

  msg += `━━ L1 TokenAgent ━━\n`;
  msg += `Token: $${l1.symbol} (${l1.name})\n`;
  msg += `Chain: ${chain} | DEX: ${l1.dex}\n`;
  msg += `Price: ${fmtPrice(l1.price)} | FDV: $${fmtNum(l1.fdv)}\n`;
  msg += `Vol 24h: $${fmtNum(l1.vol24h)} | Liq: $${fmtNum(l1.liq)}\n`;
  msg += `Txns 24h: ${l1.txns24h} | Change: ${l1.priceChange24h > 0 ? '+' : ''}${l1.priceChange24h.toFixed(1)}%\n`;
  msg += `Socials: ${l1.hasSocials ? 'YES' : 'NONE'}\n`;
  msg += `CA: ${l1.ca}\n\n`;

  msg += `━━ L2 SafetyAgent ━━\n`;
  if (l1.chain === 'solana') {
    msg += `RugCheck: ${l2.rugResult || 'N/A'} (score: ${l2.rugScore || 'N/A'})\n`;
    msg += `Mint: ${l2.mintAuthority} | Freeze: ${l2.freezeAuthority}\n`;
    msg += `LP: ${l2.lpLocked}\n`;
    if (l2.risks.length > 0) {
      msg += `Risks: ${l2.risks.map(r => `${r.name}(${r.level})`).join(', ')}\n`;
    }
  } else {
    msg += `Contract verified: ${l2.isVerified ? 'YES ✅' : 'NO'}\n`;
  }
  msg += `Top holders risk: ${l2.topHoldersRisk ? 'YES ⚠️' : 'NO'}\n\n`;

  msg += `━━ L3 IdentityAgent ━━\n`;
  msg += `Deployer: ${l3.deployer || 'unknown'}\n`;
  msg += `ENS: ${l3.ens || 'none'}\n`;
  msg += `Twitter: ${l3.twitter || 'none'} | GitHub: ${l3.github || 'none'}\n`;
  msg += `Label: ${l3.label}\n`;
  msg += `Holders: ${l3.holders || 'unknown'}\n\n`;

  msg += `━━ L4 ScoringAgent ━━\n`;
  msg += `⭐ SCORE: ${scoring.score}/100 (${scoring.grade})\n`;
  const f = scoring.factors;
  msg += `Safety:${f.safety} Liq:${f.liquidity} Vol:${f.volume} MCap:${f.mcap} Social:${f.social}\n`;
  msg += `Age:${f.age} Holders:${f.holders} Activity:${f.activity} LP:${f.lpLock} Identity:${f.identity}\n\n`;

  // Pipeline recommendation
  if (scoring.score >= 70) {
    msg += `📌 RECOMMENDATION: HIGH PRIORITY — add to pipeline for outreach\n`;
  } else if (scoring.score >= 50) {
    msg += `📌 RECOMMENDATION: MONITOR — decent project, needs more data\n`;
  } else if (scoring.score >= 35) {
    msg += `📌 RECOMMENDATION: LOW PRIORITY — weak metrics\n`;
  } else {
    msg += `📌 RECOMMENDATION: SKIP — poor fundamentals\n`;
  }

  // Send to Buzz via Telegram
  try {
    const body = JSON.stringify({
      chat_id: TG_CHAT_ID,
      text: msg,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    });

    const res = await safeReq({
      hostname: 'api.telegram.org',
      path: `/bot${TG_BOT_TOKEN}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, body);

    if (res && res.status === 200) {
      log('  📨 Buzz notified via Telegram');
    } else {
      log(`  ⚠ Telegram notify failed: ${res?.status || 'null'}`);
    }
  } catch (e) {
    log(`  ⚠ Telegram notify error: ${e.message}`);
  }
}

// ── HTTP Helper ─────────────────────────────────────────────────────────────
function httpReq(options, body) {
  return new Promise((resolve, reject) => {
    const lib = options.port === 80 ? http : https;
    const req = lib.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(API_TIMEOUT_MS, () => { req.destroy(); reject(new Error('timeout')); });
    if (body) req.write(body);
    req.end();
  });
}

// Safe wrapper — returns null on any error
async function safeReq(options, body) {
  try { return await httpReq(options, body); }
  catch (e) { log(`  ⚠ API error (${options.hostname}${options.path?.slice(0,40)}): ${e.message}`); return null; }
}

// ── OAuth 1.0a Signature ────────────────────────────────────────────────────
function oauthSign(method, url) {
  const ck = process.env.X_API_KEY;
  const cs = process.env.X_API_SECRET;
  const tk = process.env.X_ACCESS_TOKEN;
  const ts = process.env.X_ACCESS_TOKEN_SECRET;
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomBytes(16).toString('hex');

  const oauthParams = {
    oauth_consumer_key: ck, oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1', oauth_timestamp: timestamp,
    oauth_token: tk, oauth_version: '1.0'
  };

  const paramStr = Object.keys(oauthParams).sort()
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(oauthParams[k])}`).join('&');
  const baseStr = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(paramStr)}`;
  const sigKey = `${encodeURIComponent(cs)}&${encodeURIComponent(ts)}`;
  const sig = crypto.createHmac('sha1', sigKey).update(baseStr).digest('base64');

  return 'OAuth ' + Object.keys(oauthParams).sort()
    .map(k => `${k}="${encodeURIComponent(oauthParams[k])}"`)
    .join(', ') + `, oauth_signature="${encodeURIComponent(sig)}"`;
}

// =============================================================================
// L1 — TOKEN AGENT (DexScreener)
// =============================================================================
async function l1_tokenAgent(query) {
  log('  [L1 TokenAgent] DexScreener lookup...');
  const res = await safeReq({
    hostname: 'api.dexscreener.com',
    path: `/latest/dex/search?q=${encodeURIComponent(query)}`,
    method: 'GET',
    headers: { 'Accept': 'application/json' }
  });
  if (!res || res.status !== 200 || !res.data.pairs?.length) {
    log('  [L1] ❌ No pairs found');
    return null;
  }

  // Sort by liquidity, pick top pair
  const pair = res.data.pairs.sort((a, b) =>
    (parseFloat(b.liquidity?.usd || 0)) - (parseFloat(a.liquidity?.usd || 0))
  )[0];

  // FIX v2.2: Volume fallback — extrapolate from h6/h1 if h24 is missing/zero
  let vol24h = parseFloat(pair.volume?.h24 || 0);
  if (vol24h === 0) {
    const vol6h = parseFloat(pair.volume?.h6 || 0);
    const vol1h = parseFloat(pair.volume?.h1 || 0);
    if (vol6h > 0) vol24h = vol6h * 4;
    else if (vol1h > 0) vol24h = vol1h * 24;
  }

  const result = {
    symbol: pair.baseToken?.symbol || query,
    name: pair.baseToken?.name || '',
    chain: pair.chainId || 'unknown',
    ca: pair.baseToken?.address || '',
    pairAddress: pair.pairAddress || '',
    dex: pair.dexId || '',
    price: parseFloat(pair.priceUsd || 0),
    fdv: parseFloat(pair.fdv || 0),
    mcap: parseFloat(pair.marketCap || pair.fdv || 0),
    liq: parseFloat(pair.liquidity?.usd || 0),
    vol24h: vol24h,
    priceChange24h: parseFloat(pair.priceChange?.h24 || 0),
    txns24h: (pair.txns?.h24?.buys || 0) + (pair.txns?.h24?.sells || 0),
    hasSocials: !!(pair.info?.websites?.length || pair.info?.socials?.length),
    websites: pair.info?.websites?.map(w => w.url) || [],
    socials: pair.info?.socials || [],
    pairCreatedAt: pair.pairCreatedAt || null,
  };

  log(`  [L1] ✅ ${result.symbol} on ${result.chain} — $${fmtNum(result.liq)} liq, $${fmtNum(result.vol24h)} vol`);
  return result;
}

// =============================================================================
// L2 — SAFETY AGENT (RugCheck for Solana, Contract checks for Base/ETH)
// =============================================================================
async function l2_safetyAgent(l1) {
  log('  [L2 SafetyAgent] Safety analysis...');

  const safety = {
    mintAuthority: 'unknown',
    freezeAuthority: 'unknown',
    rugScore: null,
    rugResult: null,
    risks: [],
    lpLocked: 'unknown',
    isVerified: false,
    topHoldersRisk: false,
  };

  if (l1.chain === 'solana') {
    // RugCheck API for Solana tokens
    const res = await safeReq({
      hostname: 'api.rugcheck.xyz',
      path: `/v1/tokens/${l1.ca}/report`,
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (res && res.status === 200 && res.data) {
      const d = res.data;
      safety.rugScore = d.score || null;
      safety.rugResult = d.result || null;
      safety.mintAuthority = d.mintAuthority ? 'ENABLED ⚠️' : 'DISABLED ✅';
      safety.freezeAuthority = d.freezeAuthority ? 'ENABLED ⚠️' : 'DISABLED ✅';

      // Parse risks
      if (d.risks && Array.isArray(d.risks)) {
        safety.risks = d.risks.map(r => ({
          name: r.name || r.description || 'Unknown',
          level: r.level || 'info',
          score: r.score || 0
        }));
        safety.topHoldersRisk = d.risks.some(r =>
          r.name?.toLowerCase().includes('holder') && r.level === 'danger'
        );
      }

      // LP info
      if (d.markets && Array.isArray(d.markets)) {
        const totalLpLocked = d.markets.reduce((sum, m) => sum + (m.lp?.lpLockedPct || 0), 0);
        safety.lpLocked = totalLpLocked > 0 ? `${(totalLpLocked * 100).toFixed(1)}%` : 'unknown';
      }

      // Lockers
      if (d.lockers && d.lockers.length > 0) {
        safety.lpLocked = 'LOCKED ✅';
      }

      log(`  [L2] ✅ RugCheck: score=${safety.rugScore} result=${safety.rugResult} mint=${safety.mintAuthority}`);
    } else {
      log('  [L2] ⚠ RugCheck unavailable, using defaults');
      safety.mintAuthority = 'UNVERIFIED';
      safety.freezeAuthority = 'UNVERIFIED';
    }
  } else {
    // Base/ETH: Check via Blockscout contract verification
    const host = l1.chain === 'base' ? 'base.blockscout.com' : 'eth.blockscout.com';
    const res = await safeReq({
      hostname: host,
      path: `/api/v2/addresses/${l1.ca}`,
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (res && res.status === 200 && res.data) {
      safety.isVerified = res.data.is_verified || false;
      safety.mintAuthority = 'N/A (ERC-20)';
      safety.freezeAuthority = 'N/A (ERC-20)';

      // Check token data for holder count
      if (res.data.token) {
        const holders = parseInt(res.data.token.holders_count || 0);
        safety.topHoldersRisk = holders < 50;
      }

      log(`  [L2] ✅ Contract verified=${safety.isVerified}`);
    } else {
      log('  [L2] ⚠ Blockscout unavailable');
    }
  }

  return safety;
}

// =============================================================================
// L3 — IDENTITY AGENT (Blockscout Deployer + ATV Web3 Identity)
// =============================================================================
async function l3_identityAgent(l1) {
  log('  [L3 IdentityAgent] Deployer + identity analysis...');

  const identity = {
    deployer: null,
    ens: null,
    twitter: null,
    github: null,
    label: 'UNKNOWN',
    holders: null,
  };

  if (l1.chain === 'solana') {
    // ATV cannot resolve Solana addresses
    identity.label = 'UNVERIFIED (Solana)';
    log('  [L3] ⚠ Solana — ATV cannot verify deployer');
    return identity;
  }

  // Get deployer from Blockscout
  const host = l1.chain === 'base' ? 'base.blockscout.com' : 'eth.blockscout.com';
  const res = await safeReq({
    hostname: host,
    path: `/api/v2/addresses/${l1.ca}`,
    method: 'GET',
    headers: { 'Accept': 'application/json' }
  });

  if (res && res.status === 200 && res.data) {
    identity.deployer = res.data.creator_address_hash || null;
    if (res.data.token) {
      identity.holders = parseInt(res.data.token.holders_count || 0);
    }
  }

  if (!identity.deployer) {
    identity.label = 'DEPLOYER UNKNOWN';
    log('  [L3] ⚠ Could not find deployer');
    return identity;
  }

  log(`  [L3] Deployer: ${identity.deployer.slice(0, 12)}...`);

  // ATV Web3 Identity resolve
  const atv = await safeReq({
    hostname: 'api.web3identity.com',
    path: `/api/ens/batch-resolve?addresses=${identity.deployer}&include=name,twitter,github`,
    method: 'GET',
    headers: { 'Accept': 'application/json' }
  });

  if (atv && atv.status === 200 && atv.data.addresses?.[0]) {
    const a = atv.data.addresses[0];
    identity.ens = a.ens || null;
    identity.twitter = a.social?.twitter || null;
    identity.github = a.social?.github || null;

    if (identity.ens && identity.twitter) {
      identity.label = `${identity.ens} ✅ (ENS+Twitter)`;
    } else if (identity.ens && identity.github) {
      identity.label = `${identity.ens} ✅ (ENS+GitHub)`;
    } else if (identity.ens) {
      identity.label = `${identity.ens} (ENS only)`;
    } else {
      identity.label = 'ANONYMOUS (ATV verified)';
    }

    log(`  [L3] ✅ ATV: ens=${identity.ens || 'none'} twitter=${identity.twitter || 'none'}`);
  } else {
    identity.label = 'ANONYMOUS (ATV verified)';
    log('  [L3] ⚠ ATV: no identity found');
  }

  return identity;
}

// =============================================================================
// L4 — SCORING AGENT v2.2 (10-Factor Weighted System, 100 Points + Grade)
//
// v2.2 FIX: Unknown/missing data now scores LOW (1-3) instead of MID (4-5).
// This prevents the "everything is 50" problem where 5 unknown factors
// each contributing 5 points = 25 free points pushing every token to ~50.
// =============================================================================
function l4_scoringAgent(l1, l2, l3) {
  log('  [L4 ScoringAgent] Computing 10-factor score (v2.2)...');

  const factors = {};

  // Factor 1: Safety (0-10)
  // Unknown/null rugResult = 3 (not 5). Missing data = risk.
  if (l1.chain === 'solana') {
    if (l2.rugResult === 'Good') factors.safety = 10;
    else if (l2.rugResult === 'Warn') factors.safety = 5;
    else if (l2.rugResult === 'Danger') factors.safety = 1;
    else if (l2.mintAuthority?.includes('DISABLED') && l2.freezeAuthority?.includes('DISABLED')) factors.safety = 8;
    else if (l2.mintAuthority?.includes('DISABLED')) factors.safety = 6;
    else factors.safety = 3; // was 5
  } else {
    factors.safety = l2.isVerified ? 9 : 4; // was 8/5
  }

  // Factor 2: Liquidity (0-10)
  if (l1.liq > 5000000) factors.liquidity = 10;
  else if (l1.liq > 1000000) factors.liquidity = 9;
  else if (l1.liq > 500000) factors.liquidity = 8;
  else if (l1.liq > 200000) factors.liquidity = 7;
  else if (l1.liq > 100000) factors.liquidity = 5;
  else if (l1.liq > 50000) factors.liquidity = 4;
  else if (l1.liq > 10000) factors.liquidity = 2;
  else factors.liquidity = 1;

  // Factor 3: Volume (0-10)
  // Added: vol/liq ratio bonus for healthy trading
  const volLiqRatio = l1.liq > 0 ? l1.vol24h / l1.liq : 0;
  if (l1.vol24h > 5000000) factors.volume = 10;
  else if (l1.vol24h > 1000000) factors.volume = 8;
  else if (l1.vol24h > 500000) factors.volume = 7;
  else if (l1.vol24h > 100000) factors.volume = 5;
  else if (l1.vol24h > 10000) factors.volume = 3;
  else if (l1.vol24h > 1000) factors.volume = 2;
  else factors.volume = 0; // was 1 — zero volume = zero score

  // Bonus: healthy vol/liq ratio (0.3x to 3x is good sign)
  if (volLiqRatio > 0.3 && volLiqRatio < 3 && factors.volume > 0) {
    factors.volume = Math.min(10, factors.volume + 1);
  }

  // Factor 4: Market Cap (0-10)
  if (l1.fdv > 500000000) factors.mcap = 10;
  else if (l1.fdv > 100000000) factors.mcap = 9;
  else if (l1.fdv > 50000000) factors.mcap = 8;
  else if (l1.fdv > 10000000) factors.mcap = 6;
  else if (l1.fdv > 1000000) factors.mcap = 4;
  else if (l1.fdv > 100000) factors.mcap = 2;
  else factors.mcap = 1;

  // Factor 5: Social Presence (0-10)
  const socialCount = (l1.hasSocials ? 1 : 0)
    + (l1.websites.length > 0 ? 1 : 0)
    + Math.min(3, l1.socials.length); // cap at 3 to avoid gaming
  if (socialCount >= 5) factors.social = 10;
  else if (socialCount >= 4) factors.social = 8;
  else if (socialCount >= 3) factors.social = 7;
  else if (socialCount >= 2) factors.social = 5;
  else if (socialCount >= 1) factors.social = 3;
  else factors.social = 0; // was 1 — no socials = red flag

  // Factor 6: Token Age (0-10)
  // Unknown age = 2 (not 5). No data = risk signal.
  if (l1.pairCreatedAt && l1.pairCreatedAt > 0) {
    const ageMs = Date.now() - l1.pairCreatedAt;
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    if (ageDays > 365) factors.age = 10;
    else if (ageDays > 180) factors.age = 9;
    else if (ageDays > 90) factors.age = 7;
    else if (ageDays > 30) factors.age = 5;
    else if (ageDays > 7) factors.age = 3;
    else if (ageDays > 1) factors.age = 2;
    else factors.age = 1; // less than 1 day old
  } else {
    factors.age = 2; // was 5
  }

  // Factor 7: Holder Distribution (0-10)
  // Unknown holders = 2 (not 5).
  if (l3.holders && l3.holders > 0) {
    if (l3.holders > 50000) factors.holders = 10;
    else if (l3.holders > 10000) factors.holders = 9;
    else if (l3.holders > 5000) factors.holders = 7;
    else if (l3.holders > 1000) factors.holders = 5;
    else if (l3.holders > 200) factors.holders = 3;
    else if (l3.holders > 50) factors.holders = 2;
    else factors.holders = 1;
  } else {
    factors.holders = 2; // was 5
  }
  if (l2.topHoldersRisk) factors.holders = Math.max(0, factors.holders - 3);

  // Factor 8: Transaction Activity (0-10)
  if (l1.txns24h > 10000) factors.activity = 10;
  else if (l1.txns24h > 5000) factors.activity = 9;
  else if (l1.txns24h > 1000) factors.activity = 7;
  else if (l1.txns24h > 500) factors.activity = 5;
  else if (l1.txns24h > 100) factors.activity = 3;
  else if (l1.txns24h > 20) factors.activity = 2;
  else factors.activity = 1;

  // Factor 9: LP Lock Status (0-10)
  // Unknown LP = 2 (not 4).
  if (l2.lpLocked === 'LOCKED ✅') factors.lpLock = 10;
  else if (typeof l2.lpLocked === 'string' && l2.lpLocked.includes('%')) {
    const pct = parseFloat(l2.lpLocked);
    if (pct > 95) factors.lpLock = 10;
    else if (pct > 80) factors.lpLock = 8;
    else if (pct > 50) factors.lpLock = 5;
    else if (pct > 20) factors.lpLock = 3;
    else factors.lpLock = 1;
  } else {
    factors.lpLock = 2; // was 4
  }

  // Factor 10: Deployer Identity (0-10)
  if (l3.label.includes('ENS+Twitter') || l3.label.includes('ENS+GitHub')) {
    factors.identity = 10;
  } else if (l3.label.includes('ENS only')) {
    factors.identity = 6; // was 7
  } else if (l3.label.includes('ANONYMOUS')) {
    factors.identity = 2;
  } else if (l3.label.includes('UNVERIFIED')) {
    factors.identity = 1; // was 2 — Solana unverified = worst case
  } else {
    factors.identity = 2;
  }

  // Weighted total (each factor is 0-10, total max = 100)
  const total = Object.values(factors).reduce((s, v) => s + v, 0);
  const capped = Math.min(100, Math.max(0, total));

  // Letter grade
  let grade;
  if (capped >= 80) grade = 'A';
  else if (capped >= 65) grade = 'B';
  else if (capped >= 50) grade = 'C';
  else if (capped >= 35) grade = 'D';
  else grade = 'F';

  log(`  [L4] ✅ Score: ${capped}/100 (${grade})`);
  log(`  [L4]   Safety=${factors.safety} Liq=${factors.liquidity} Vol=${factors.volume} MCap=${factors.mcap}`);
  log(`  [L4]   Social=${factors.social} Age=${factors.age} Holders=${factors.holders} Activity=${factors.activity}`);
  log(`  [L4]   LP=${factors.lpLock} Identity=${factors.identity}`);

  return { score: capped, factors, grade };
}

// ── Format Helpers ──────────────────────────────────────────────────────────
function fmtNum(n) {
  if (n >= 1000000000) return `${(n / 1000000000).toFixed(1)}B`;
  if (n >= 1000000)    return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000)       return `${(n / 1000).toFixed(0)}K`;
  return `${n.toFixed(0)}`;
}
function fmtPrice(n) {
  if (n >= 100)   return `$${n.toFixed(0)}`;
  if (n >= 1)     return `$${n.toFixed(2)}`;
  if (n >= 0.01)  return `$${n.toFixed(4)}`;
  if (n >= 0.0001) return `$${n.toFixed(6)}`;
  return `$${n.toFixed(8)}`;
}

// ── Build Scan Reply (280 char Twitter limit) ───────────────────────────────
function buildReply(l1, l2, l3, scoring) {
  const chain = l1.chain === 'solana' ? 'SOL'
    : l1.chain === 'base' ? 'Base'
    : l1.chain === 'ethereum' ? 'ETH'
    : l1.chain.toUpperCase();

  // Safety line
  let safetyLine;
  if (l1.chain === 'solana' && l2.rugScore !== null) {
    safetyLine = `🛡️ Rug:${l2.rugScore} | Mint ${l2.mintAuthority?.includes('DISABLED') ? '✅' : '⚠️'} Freeze ${l2.freezeAuthority?.includes('DISABLED') ? '✅' : '⚠️'}`;
  } else if (l2.isVerified) {
    safetyLine = `🛡️ Contract verified ✅`;
  } else {
    safetyLine = `🛡️ Safety: check`;
  }

  // Trim safety line if too long
  if (safetyLine.length > 50) safetyLine = safetyLine.slice(0, 50);

  let t = `🐝 BUZZ SCAN — $${l1.symbol} (${chain})\n`;
  t += `━━━━━━━━━━━━━━\n`;
  t += `💰 ${fmtPrice(l1.price)} | FDV $${fmtNum(l1.fdv)}\n`;
  t += `📊 Vol $${fmtNum(l1.vol24h)} | Liq $${fmtNum(l1.liq)}\n`;
  t += `${safetyLine}\n`;
  t += `🪪 ${l3.label}\n`;
  t += `⭐ ${scoring.score}/100 (${scoring.grade})\n\n`;
  t += `CA: ${l1.ca.slice(0, 44)}\n\n`;
  t += `Automated by @HidayahAnka1`;

  if (t.length > 280) t = t.slice(0, 277) + '...';
  return t;
}

// ── Twitter: Fetch Mentions ─────────────────────────────────────────────────
async function fetchMentions() {
  const res = await safeReq({
    hostname: 'api.twitter.com',
    path: `/2/tweets/search/recent?query=%40BuzzBySolCex&max_results=${MAX_RESULTS}`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${process.env.X_BEARER_TOKEN}` }
  });
  if (!res || res.status !== 200) {
    log(`⚠ Mention fetch failed: ${res?.status || 'null'}`);
    return [];
  }
  return res.data.data || [];
}

// ── Twitter: Post Reply ─────────────────────────────────────────────────────
async function postReply(tweetId, text) {
  const url  = 'https://api.twitter.com/2/tweets';
  const body = JSON.stringify({ text, reply: { in_reply_to_tweet_id: tweetId } });
  const auth = oauthSign('POST', url);
  return await safeReq({
    hostname: 'api.twitter.com',
    path: '/2/tweets',
    method: 'POST',
    headers: {
      'Authorization': auth,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    }
  }, body);
}

// ── Parse Scan Command ──────────────────────────────────────────────────────
function parseScan(text) {
  const tickerMatch = text.match(/scan\s+\$?([A-Za-z]\w{1,15})/i);
  if (tickerMatch) return { type: 'ticker', value: tickerMatch[1].toUpperCase() };
  const addrMatch = text.match(/scan\s+(0x[a-fA-F0-9]{40})/i);
  if (addrMatch) return { type: 'address', value: addrMatch[1] };
  const solMatch = text.match(/scan\s+([1-9A-HJ-NP-Za-km-z]{32,44})/i);
  if (solMatch) return { type: 'address', value: solMatch[1] };
  return null;
}

// ── Full 4-Layer Scan Pipeline ──────────────────────────────────────────────
async function runScanPipeline(query) {
  log(`\n  ╔══════════════════════════════════════╗`);
  log(`  ║  🐝 BUZZ 4-LAYER SCAN: ${query.padEnd(14)} ║`);
  log(`  ╚══════════════════════════════════════╝`);

  // L1: Token data
  const l1 = await l1_tokenAgent(query);
  if (!l1) return null;

  // L2: Safety
  const l2 = await l2_safetyAgent(l1);

  // L3: Identity
  const l3 = await l3_identityAgent(l1);

  // L4: Score
  const scoring = l4_scoringAgent(l1, l2, l3);

  // Build reply
  const reply = buildReply(l1, l2, l3, scoring);

  // Save to history
  saveScanHistory({
    symbol: l1.symbol, chain: l1.chain, ca: l1.ca,
    score: scoring.score, grade: scoring.grade, identity: l3.label,
    price: l1.price, fdv: l1.fdv, liq: l1.liq
  });

  return { l1, l2, l3, scoring, reply };
}

// ── Credential Check ────────────────────────────────────────────────────────
function checkCreds() {
  const required = ['X_BEARER_TOKEN', 'X_API_KEY', 'X_API_SECRET', 'X_ACCESS_TOKEN', 'X_ACCESS_TOKEN_SECRET'];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length) {
    log(`❌ Missing env vars: ${missing.join(', ')}`);
    process.exit(1);
  }
  log('✅ All Twitter credentials verified');
}

// ── Main Loop ───────────────────────────────────────────────────────────────
async function run() {
  log('');
  log('╔═══════════════════════════════════════════════════╗');
  log('║  🐝 BUZZ TWITTER BOT v2.2 — 4-Layer + TG Bridge  ║');
  log('║  L1: TokenAgent (DexScreener)                     ║');
  log('║  L2: SafetyAgent (RugCheck/Contract)              ║');
  log('║  L3: IdentityAgent (Blockscout + ATV)             ║');
  log('║  L4: ScoringAgent v2.2 (10-factor + grade)        ║');
  log('║  📨: Telegram bridge to Buzz (context + memory)   ║');
  log(`║  Interval: ${CHECK_INTERVAL_MS / 60000}min | Max: ${MAX_REPLIES_DAY}/day               ║`);
  log('╚═══════════════════════════════════════════════════╝');

  checkCreds();

  // First-run safety: if no replied file exists, fetch current mentions
  // and mark them as "seen" to avoid re-replying to old tweets
  if (!fs.existsSync(REPLIED_FILE)) {
    log('🆕 FIRST RUN — marking existing mentions as seen...');
    try {
      const existing = await fetchMentions();
      if (existing.length > 0) {
        const ids = existing.map(t => t.id);
        saveReplied(ids);
        log(`  ✅ Marked ${ids.length} existing mentions as seen. Will only reply to NEW mentions.`);
      } else {
        saveReplied([]);
        log('  ✅ No existing mentions found. Ready for new ones.');
      }
    } catch (e) {
      saveReplied([]);
      log(`  ⚠ Could not fetch existing mentions: ${e.message}. Starting fresh.`);
    }
  } else {
    log(`📋 Loaded ${loadReplied().length} previously replied tweet IDs`);
  }

  while (true) {
    try {
      log('\n── Mention check ──');

      const daily = getDailyCount();
      if (daily.count >= MAX_REPLIES_DAY) {
        log(`⚠ Daily limit reached (${daily.count}/${MAX_REPLIES_DAY}). Skipping.`);
      } else {
        const mentions = await fetchMentions();
        log(`Found ${mentions.length} mentions`);

        const replied = loadReplied();
        let processed = 0;

        for (const tweet of mentions) {
          if (replied.includes(tweet.id)) continue;
          if (tweet.text.startsWith('RT @')) {
            replied.push(tweet.id);
            saveReplied(replied);
            continue;
          }

          const cmd = parseScan(tweet.text);
          if (!cmd) {
            log(`Skip ${tweet.id}: no scan cmd in "${tweet.text.slice(0, 60)}"`);
            replied.push(tweet.id);
            saveReplied(replied);
            continue;
          }

          log(`\n🔍 Tweet ${tweet.id}: scan ${cmd.type}=${cmd.value}`);

          // Run full 4-layer pipeline
          const result = await runScanPipeline(cmd.value);
          if (!result) {
            log('  ❌ Pipeline returned no result');
            replied.push(tweet.id);
            saveReplied(replied);
            continue;
          }

          log(`  📝 Reply (${result.reply.length} chars)`);

          // Post reply
          const postResult = await postReply(tweet.id, result.reply);
          if (postResult && postResult.status === 201) {
            const count = incrementDailyCount();
            log(`  ✅ POSTED! Tweet replied. (${count}/${MAX_REPLIES_DAY} today)`);

            // Notify Buzz via Telegram with full scan data
            await notifyBuzz(result.l1, result.l2, result.l3, result.scoring, tweet.id);
          } else {
            log(`  ❌ Post failed: ${postResult?.status || 'null'} ${JSON.stringify(postResult?.data || '').slice(0, 200)}`);
          }

          replied.push(tweet.id);
          saveReplied(replied);
          processed++;

          if (processed < mentions.length) {
            log(`  ⏳ Rate limit delay ${REPLY_DELAY_MS / 1000}s...`);
            await new Promise(r => setTimeout(r, REPLY_DELAY_MS));
          }
        }

        if (processed === 0) log('No new scan requests.');
        else log(`✅ Processed ${processed} scan(s) this cycle.`);
      }
    } catch (err) {
      log(`❌ Loop error: ${err.message}`);
    }

    log(`💤 Next check in ${CHECK_INTERVAL_MS / 60000} min`);
    await new Promise(r => setTimeout(r, CHECK_INTERVAL_MS));
  }
}

// ── Start ───────────────────────────────────────────────────────────────────
run().catch(err => { log(`FATAL: ${err.message}`); process.exit(1); });
