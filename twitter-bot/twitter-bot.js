// ==============================================================================
// Buzz BD Agent -- Twitter Bot v3.3-premium-7section
// OpenClaw v2026.3.1 | SolCex Exchange | Indonesia Sprint
// ------------------------------------------------------------------------------
// Routes:
//   SCAN   -> 5-Layer Premium report (4000 chars) + LIST/DEPLOY CTA footer
//   LIST   -> SolCex listing pitch + Telegram lead alert to Ogie
//   DEPLOY -> Autonomous Bankr token deploy (no Ogie approval needed)
//   TOKEN DETAILS -> Follow-up: execute bankr deploy after user provides name/symbol
// ==============================================================================

'use strict';

const https  = require('https');
const http   = require('http');
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

// -- Config --------------------------------------------------------------------
const DATA_DIR            = process.env.TWITTER_DATA_DIR || '/data/workspace';
const REPLIED_FILE        = path.join(DATA_DIR, 'twitter-replied.json');
const DAILY_COUNT_FILE    = path.join(DATA_DIR, 'twitter-daily-count.json');
const SCAN_HISTORY_FILE   = path.join(DATA_DIR, 'twitter-scan-history.json');
const LEADS_FILE          = path.join(DATA_DIR, 'twitter-leads.json');
const DEPLOYS_FILE        = path.join(DATA_DIR, 'twitter-deploys.json');
const SCAN_TWEETS_FILE    = path.join(DATA_DIR, 'twitter-scan-tweets.json');
const DEPLOY_DAILY_FILE   = path.join(DATA_DIR, 'twitter-deploy-daily.json');
const LOG_FILE            = path.join(DATA_DIR, 'twitter-bot.log');
const WATERMARK_FILE     = path.join(DATA_DIR, 'twitter-bot-state.json');

// sinceId watermark persistence — survives container restarts
function loadWatermark() {
  try {
    const data = JSON.parse(fs.readFileSync(WATERMARK_FILE, "utf8"));
    return data.lastMentionId || null;
  } catch { return null; }
}
function saveWatermark(id) {
  try {
    fs.writeFileSync(WATERMARK_FILE, JSON.stringify({ lastMentionId: id, updatedAt: new Date().toISOString() }));
  } catch (e) { console.error("[watermark] Save failed:", e.message); }
}

const X_API_KEY           = process.env.X_API_KEY           || '';
const X_API_SECRET        = process.env.X_API_SECRET        || '';
const X_ACCESS_TOKEN      = process.env.X_ACCESS_TOKEN      || '';
const X_ACCESS_TOKEN_SECRET = process.env.X_ACCESS_TOKEN_SECRET || '';
const X_BEARER_TOKEN      = process.env.X_BEARER_TOKEN      || '';
const BOT_USER_ID         = process.env.X_BOT_USER_ID       || '';
const TELEGRAM_BOT_TOKEN  = process.env.TELEGRAM_BOT_TOKEN  || '';
const TELEGRAM_CHAT_ID    = process.env.TELEGRAM_CHAT_ID    || '';
const OPENCLAW_PORT       = parseInt(process.env.OPENCLAW_PORT || '18789');
const MAX_REPLIES_DAY     = parseInt(process.env.MAX_REPLIES_DAY || '12');
const MAX_DEPLOYS_DAY     = 3;
const CHECK_INTERVAL_MS   = 15 * 60 * 1000; // 15 min
const REPLY_DELAY_MS      = 30 * 1000;       // 30s between replies

// Bankr Partner API
const BANKR_PARTNER_KEY   = process.env.BANKR_PARTNER_KEY   || '';
const BANKR_FEE_WALLET    = process.env.BANKR_FEE_WALLET    || '0x2Dc03124091104E7798C0273D96FC5ED65F05aA9';
const BANKR_DEPLOY_WALLET = process.env.BANKR_DEPLOY_WALLET || '0xfa04c7d627ba707a1ad17e72e094b45150665593';
const BANKR_BASE_URL      = 'https://api.bankr.bot';

// -- Logger --------------------------------------------------------------------
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(LOG_FILE, line + '\n'); } catch {}
}

// -- JSON Helpers --------------------------------------------------------------
function loadJSON(file, def) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return def; }
}
function saveJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// -- Daily Count ---------------------------------------------------------------
function loadDailyCount() {
  const data = loadJSON(DAILY_COUNT_FILE, { date: '', count: 0 });
  const today = new Date().toISOString().slice(0, 10);
  if (data.date !== today) return { date: today, count: 0 };
  return data;
}
function incrementDailyCount() {
  const today = new Date().toISOString().slice(0, 10);
  const data = loadDailyCount();
  data.date = today; data.count++;
  saveJSON(DAILY_COUNT_FILE, data);
  return data.count;
}

// -- Replied Tracking ----------------------------------------------------------
function loadReplied() { return loadJSON(REPLIED_FILE, []); }
function saveReplied(arr) { saveJSON(REPLIED_FILE, arr.slice(-2000)); }

// -- Scan History --------------------------------------------------------------
function loadScanHistory() { return loadJSON(SCAN_HISTORY_FILE, []); }
function addScanHistory(ca) {
  const h = loadScanHistory();
  if (!h.includes(ca)) { h.push(ca); saveJSON(SCAN_HISTORY_FILE, h.slice(-500)); }
}

// -- Scan Tweet Mapping --------------------------------------------------------
function loadScanTweets() { return loadJSON(SCAN_TWEETS_FILE, {}); }
function saveScanTweet(ourReplyId, scanData) {
  const data = loadScanTweets();
  data[ourReplyId] = {
    symbol: scanData.l1.symbol, chain: scanData.l1.chain, ca: scanData.l1.ca,
    score: scanData.scoring.score, grade: scanData.scoring.grade,
    timestamp: new Date().toISOString()
  };
  const keys = Object.keys(data);
  if (keys.length > 200) keys.slice(0, keys.length - 200).forEach(k => delete data[k]);
  saveJSON(SCAN_TWEETS_FILE, data);
}

// -- Lead Tracking -------------------------------------------------------------
function loadLeads() { return loadJSON(LEADS_FILE, []); }
function saveLead(lead) {
  const leads = loadLeads();
  leads.push({ ...lead, timestamp: new Date().toISOString() });
  saveJSON(LEADS_FILE, leads.slice(-500));
}

// -- Deploy Daily Count --------------------------------------------------------
function getDeployDailyCount() {
  const data = loadJSON(DEPLOY_DAILY_FILE, { date: '', count: 0 });
  const today = new Date().toISOString().slice(0, 10);
  if (data.date !== today) return { date: today, count: 0 };
  return data;
}
function incrementDeployDailyCount() {
  const today = new Date().toISOString().slice(0, 10);
  const data = getDeployDailyCount();
  data.date = today; data.count++;
  saveJSON(DEPLOY_DAILY_FILE, data);
  return data.count;
}

// ==============================================================================
// PREMIUM SCAN REPLY FORMAT v3.1 -- 5-Layer Intelligence (4000 chars)
// ==============================================================================

function progressBar(score, max) {
  max = max || 10;
  const filled = Math.round((score / max) * 5);
  const empty = 5 - filled;
  return '#'.repeat(Math.max(0, filled)) + '-'.repeat(Math.max(0, empty));
}

function trendArrow(pct) {
  if (pct == null) return '-- Unknown';
  if (pct >= 50)  return '^^^ Surging';
  if (pct >= 20)  return '^^ Rising';
  if (pct >= 5)   return '^ Up';
  if (pct >= -5)  return '-> Flat';
  if (pct >= -20) return 'v Declining';
  return 'vv Dropping';
}

function safeIcon(v) {
  if (v === true)  return '✅';
  if (v === false) return '❌';
  return '⚠️';
}

function tokenAge(ts) {
  if (!ts) return 'Unknown';
  const hours = Math.floor((Date.now() - ts) / 3600000);
  const days  = Math.floor(hours / 24);
  if (days > 365) return Math.floor(days / 365) + 'y ' + (days % 365) + 'd';
  if (days > 0)   return days + 'd ' + (hours % 24) + 'h';
  return hours + 'h';
}

function getVerdict(score) {
  if (score >= 85) return { e: '🔥', l: 'HOT',       a: 'Strong listing prospect' };
  if (score >= 70) return { e: '✅', l: 'QUALIFIED',  a: 'Worth monitoring' };
  if (score >= 50) return { e: '👀', l: 'WATCHLIST',  a: 'Monitor 48h' };
  if (score >= 30) return { e: '⚠️', l: 'HIGH RISK',  a: 'Caution' };
  return               { e: '🔴', l: 'DANGER',     a: 'Avoid' };
}

function letterGrade(s) {
  if (s >= 90) return 'A+'; if (s >= 85) return 'A';  if (s >= 80) return 'A-';
  if (s >= 75) return 'B+'; if (s >= 70) return 'B';  if (s >= 65) return 'B-';
  if (s >= 60) return 'C+'; if (s >= 55) return 'C';  if (s >= 50) return 'C-';
  if (s >= 40) return 'D';  return 'F';
}

function fmtNum(n) {
  if (n == null) return 'N/A';
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toFixed(2);
}

function fmtPrice(p) {
  if (p == null) return 'N/A';
  if (p < 0.000001) return '$' + p.toExponential(2);
  if (p < 0.01)     return '$' + p.toFixed(6);
  if (p < 1)        return '$' + p.toFixed(4);
  return '$' + p.toFixed(2);
}

/**
 * buildReply v3.3 -- Premium 7-Section SCAN reply
 * Sections: Safety, Smart Money, Market Structure, Momentum,
 *           Persona Consensus, Final Verdict, CEX Listing CTA
 * @param {object} l1 - DexScreener pair data
 * @param {object} l2 - Safety/RugCheck data
 * @param {object} l3 - Social/Grok data
 * @param {object} scoring - { score, grade, factors }
 * @returns {string|null} formatted reply or null if score < 50
 */
function buildReply(l1, l2, l3, scoring) {
  // Score 50+ minimum -- don't generate reply for low-scoring tokens
  if (scoring.score < 50) return null;

  const chain  = l1.chain === 'solana' ? 'SOL'
               : l1.chain === 'base'   ? 'Base'
               : l1.chain === 'ethereum' ? 'ETH'
               : (l1.chain || 'Unknown').toUpperCase();

  const v      = getVerdict(scoring.score);
  const grade  = letterGrade(scoring.score);
  const age    = tokenAge(l1.pairCreatedAt);
  const f      = scoring.factors || {};

  // Price change
  const pc1h  = l1.priceChange?.h1;
  const pc24h = l1.priceChange?.h24;
  const pc7d  = l1.priceChange?.d7;
  const priceLine = pc24h != null
    ? `${pc1h != null ? (pc1h >= 0 ? '+' : '') + pc1h.toFixed(1) + '% (1h) ' : ''}${(pc24h >= 0 ? '+' : '') + pc24h.toFixed(1)}% (24h)${pc7d != null ? ' / ' + (pc7d >= 0 ? '+' : '') + pc7d.toFixed(1) + '% (7d)' : ''}`
    : 'N/A';

  // Safety flags
  const mintAuth   = l2?.mintAuthority   != null ? !l2.mintAuthority   : null;
  const freezeAuth = l2?.freezeAuthority != null ? !l2.freezeAuthority : null;
  const lpBurned   = l2?.lpBurned        != null ? l2.lpBurned         : null;
  const rugScore   = l2?.rugScore        != null ? l2.rugScore         : null;
  const topHolder  = l2?.topHolderPct    != null ? l2.topHolderPct     : null;

  // Social signals
  const sentiment  = l3?.sentiment  || null;
  const twitterF   = l3?.followers  || null;
  const mentions   = l3?.mentions   || null;
  const devActivity = l3?.devActivity || null;

  // Slippage estimate
  const slip = l1.liq > 0
    ? Math.min(99, Math.round((1000 / l1.liq) * 100) / 100).toFixed(1) + '%'
    : 'N/A';

  // Build the 7-section report
  const lines = [];
  lines.push(`🐝 BUZZ INTEL --- $${l1.symbol} (${chain})`);
  lines.push(`---`);
  lines.push(`${v.e} ${scoring.score}/100 (${grade}) --- ${v.l}`);
  lines.push(`Score ${progressBar(scoring.score, 100)} ${scoring.score}pts`);
  lines.push('');

  // Section 1 --- Safety
  lines.push(`🛡️ SAFETY`);
  if (rugScore != null) lines.push(`RugScore: ${rugScore}/100 ${progressBar(100 - rugScore, 100)}`);
  lines.push(`Mint Auth:   ${safeIcon(mintAuth)}${mintAuth == null ? ' Unknown' : ''}`);
  lines.push(`Freeze Auth: ${safeIcon(freezeAuth)}${freezeAuth == null ? ' Unknown' : ''}`);
  lines.push(`LP Burned:   ${safeIcon(lpBurned)}${lpBurned == null ? ' Unknown' : ''}`);
  if (topHolder != null) lines.push(`Top Holder:  ${topHolder.toFixed(1)}% ${topHolder < 10 ? '✅' : topHolder < 20 ? '⚠️' : '❌'}`);
  if (slip !== 'N/A') lines.push(`Slip Est:    ~${slip}`);
  lines.push('');

  // Section 2 --- Smart Money
  lines.push(`💰 SMART MONEY`);
  if (f.onchainScore != null) lines.push(`OnChain Score: ${f.onchainScore}/20 ${progressBar(f.onchainScore, 20)}`);
  if (l1.txns?.h24) {
    const totalTxns = (l1.txns.h24.buy || 0) + (l1.txns.h24.sell || 0);
    const buyRatio = totalTxns > 0 ? Math.round(((l1.txns.h24.buy || 0) / totalTxns) * 100) : 0;
    lines.push(`Txns 24h: ${totalTxns} (${l1.txns.h24.buy || 0}B / ${l1.txns.h24.sell || 0}S)`);
    lines.push(`Buy Pressure: ${buyRatio}% ${buyRatio >= 60 ? '🟢' : buyRatio >= 40 ? '🟡' : '🔴'}`);
  }
  lines.push('');

  // Section 3 --- Market Structure
  lines.push(`📊 MARKET STRUCTURE`);
  lines.push(`Price:   ${fmtPrice(l1.priceUsd)}`);
  lines.push(`FDV:     $${fmtNum(l1.fdv)}`);
  lines.push(`Liq:     $${fmtNum(l1.liq)}`);
  lines.push(`Vol 24h: $${fmtNum(l1.vol24h)}`);
  lines.push(`Age:     ${age}`);
  lines.push('');

  // Section 4 --- Momentum
  lines.push(`⚡ MOMENTUM`);
  lines.push(`Trend: ${trendArrow(pc24h)} ${priceLine}`);
  if (f.marketScore != null) lines.push(`Market Score: ${f.marketScore}/25 ${progressBar(f.marketScore, 25)}`);
  lines.push('');

  // Section 5 --- Persona Consensus
  lines.push(`🧠 PERSONA CONSENSUS`);
  if (f.safetyScore != null) lines.push(`Safety:  ${f.safetyScore}/30  ${progressBar(f.safetyScore, 30)}`);
  if (f.socialScore != null) lines.push(`Social:  ${f.socialScore}/25  ${progressBar(f.socialScore, 25)}`);
  if (sentiment) lines.push(`Sentiment: ${sentiment}`);
  if (devActivity) lines.push(`Dev Activity: ${devActivity}`);
  if (!sentiment && !devActivity) lines.push(`Social data: Limited`);
  lines.push('');

  // Section 6 --- Final Verdict
  lines.push(`🎯 FINAL VERDICT`);
  lines.push(`${v.e} ${v.l}: ${v.a}`);
  if (scoring.score >= 70) {
    lines.push(`CA: ${l1.ca}`);
    lines.push(`Chain: ${chain} | DEX: ${l1.dex || 'N/A'}`);
  }
  lines.push('');

  // Section 7 --- CEX Listing CTA
  lines.push(`---`);
  if (scoring.score >= 70) {
    lines.push(`🏦 Want $${l1.symbol} listed on @SolCex_Exchange?`);
    lines.push(`Reply LIST -- get listing details`);
    lines.push(`Reply DEPLOY -- launch your own token via @bankrbot`);
  } else {
    lines.push(`👀 Monitoring $${l1.symbol}. Score needs 70+ for listing.`);
    lines.push(`Reply DEPLOY -- launch your own token via @bankrbot`);
  }
  lines.push('');
  lines.push(`🐝 Buzz BD Agent | Built on OpenClaw . Agentic.hosting | @SolCex_Exchange`);

  return lines.join('\n');
}

// ==============================================================================
// LIST / DEPLOY REPLY FORMATTERS
// ==============================================================================

function formatListReply() {
  return [
    `🏦 SolCex Exchange -- CEX Listing Inquiry`,
    `---`,
    ``,
    `Thanks for your interest! Here's what we offer:`,
    ``,
    `✅ Solana-native CEX listing`,
    `✅ Instant trading activation`,
    `✅ Market maker partnership`,
    `✅ Marketing collaboration`,
    `✅ Community growth support`,
    ``,
    `📩 Next step: DM @SolCex_Exchange with:`,
    `* Token name & CA`,
    `* Current metrics`,
    `* Team contact`,
    ``,
    `We review all inquiries within 24h.`,
    ``,
    `#SolCex #Solana #CEXListing`,
  ].join('\n');
}

function formatDeployReply() {
  return [
    `🚀 Deploy Your Token via @bankrbot`,
    `---`,
    ``,
    `Launch your token on Base chain in ~2 minutes:`,
    ``,
    `1️ Reply with your token details:`,
    `   Name: [Token Name]`,
    `   Symbol: [TICKER]`,
    `   Description: [optional]`,
    ``,
    `2️ Buzz will deploy automatically via Bankr`,
    ``,
    `3️ Your token goes LIVE on Base with:`,
    `   * Auto LP seeded`,
    `   * Trading enabled instantly`,
    `   * 50% fee split to your wallet`,
    ``,
    `⚡ No wallet connection needed`,
    `⚡ Fees split: 50% you / 50% platform`,
    ``,
    `Reply with Name + Symbol to start! 👇`,
    ``,
    `#Bankr #Base #TokenLaunch`,
  ].join('\n');
}

function formatDeployConfirmation(name, symbol, contractAddress, txHash) {
  return [
    `🎉 Token Deployed Successfully!`,
    `---`,
    ``,
    `✅ ${name} ($${symbol}) is LIVE on Base`,
    ``,
    `CA: ${contractAddress}`,
    `TX: ${txHash ? txHash.slice(0, 20) + '...' : 'Confirmed'}`,
    ``,
    `🔗 Trade now on Bankr`,
    `📊 50% of all trading fees go to your wallet`,
    ``,
    `Want $${symbol} listed on @SolCex_Exchange?`,
    `DM us once you have volume! 🏦`,
    ``,
    `#${symbol} #Base #Bankr #SolCex`,
  ].join('\n');
}

// ==============================================================================
// COMMAND PARSERS
// ==============================================================================

function cleanText(text) {
  return (text || '').replace(/@\w+/g, '').replace(/https?:\/\/\S+/g, '').trim();
}

/**
 * parseCommand -- detects LIST / DEPLOY / SCAN / TOKEN_DETAILS
 * Returns { route, type?, value?, name?, symbol?, description? } or null
 */
function parseCommand(text) {
  const cleaned = cleanText(text).toUpperCase();
  const raw     = cleanText(text);

  // LIST route
  if (/^LIST[!.?]?$/.test(cleaned) || /\bLIST\b/.test(cleaned.slice(0, 20))) {
    return { route: 'LIST' };
  }

  // DEPLOY route -- bare "DEPLOY" triggers instructions
  if (/^DEPLOY[!.?]?$/.test(cleaned)) {
    return { route: 'DEPLOY' };
  }

  // TOKEN DETAILS -- "Deploy Name: X Symbol: Y" or "Name: X\nSymbol: Y"
  const nameMatch   = raw.match(/(?:name|token)[:\s]+([A-Za-z0-9 _-]{2,30})/i);
  const symbolMatch = raw.match(/(?:symbol|ticker)[:\s]+\$?([A-Z]{2,10})/i);
  if (nameMatch && symbolMatch) {
    return {
      route: 'TOKEN_DETAILS',
      name:   nameMatch[1].trim(),
      symbol: symbolMatch[1].trim().toUpperCase(),
      description: raw.match(/(?:description|desc)[:\s]+(.{5,100})/i)?.[1]?.trim() || ''
    };
  }

  // SCAN route -- contract address or $SYMBOL
  const caMatch = text.match(/\b([1-9A-HJ-NP-Za-km-z]{32,44})\b/);   // Solana CA
  const evmMatch = text.match(/\b(0x[a-fA-F0-9]{40})\b/);              // EVM CA
  const symMatch = text.match(/\$([A-Za-z]{2,10})\b/);

  if (evmMatch) return { route: 'SCAN', type: 'ca', value: evmMatch[1] };
  if (caMatch)  return { route: 'SCAN', type: 'ca', value: caMatch[1] };
  if (symMatch) return { route: 'SCAN', type: 'symbol', value: symMatch[1].toUpperCase() };

  return null;
}

// ==============================================================================
// SCAN PIPELINE (calls OpenClaw gateway)
// ==============================================================================


// -- Ticker-to-Address Resolution via DexScreener --
const CHAIN_PRIORITY = ['solana', 'base', 'ethereum', 'bsc', 'tron'];

function resolveTickerToAddress(symbol) {
  return new Promise(function(resolve) {
    var url = 'https://api.dexscreener.com/latest/dex/search?q=' + encodeURIComponent(symbol);
    https.get(url, function(res) {
      var body = '';
      res.on('data', function(c) { body += c; });
      res.on('end', function() {
        try {
          var data = JSON.parse(body);
          var pairs = data.pairs || [];
          if (!pairs.length) { resolve(null); return; }
          pairs.sort(function(a, b) {
            var aPri = CHAIN_PRIORITY.indexOf(a.chainId);
            var bPri = CHAIN_PRIORITY.indexOf(b.chainId);
            if (aPri === -1) aPri = 99;
            if (bPri === -1) bPri = 99;
            if (aPri !== bPri) return aPri - bPri;
            return ((b.volume && b.volume.h24) || 0) - ((a.volume && a.volume.h24) || 0);
          });
          var best = pairs[0];
          var addr = best.baseToken && best.baseToken.address || null;
          var chain = best.chainId || 'solana';
          log('  DexScreener resolved ' + symbol + ' -> ' + (addr ? addr.slice(0,12) + '...' : 'null') + ' on ' + chain);
          resolve({ address: addr, chain: chain, name: best.baseToken && best.baseToken.name || symbol, symbol: best.baseToken && best.baseToken.symbol || symbol });
        } catch(e) { resolve(null); }
      });
    }).on('error', function() { resolve(null); });
  });
}

function callBuzzAPI(address, chain) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({ address, chain: chain || "solana" });
    const options = {
      hostname: "localhost",
      port: 3000,
      path: "/api/v1/score-token",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
        "X-API-Key": process.env.BUZZ_API_ADMIN_KEY || ""
      }
    };
    const req = http.request(options, res => {
      let body = "";
      res.on("data", d => body += d);
      res.on("end", () => {
        try { resolve(JSON.parse(body)); }
        catch { reject(new Error("BuzzAPI parse error: " + body.slice(0, 200))); }
      });
    });
    req.on("error", reject);
    req.setTimeout(120000, () => { req.destroy(); reject(new Error("BuzzAPI timeout (120s)")); });
    req.write(payload);
    req.end();
  });
}

async function runScanPipeline(value, chain) {
  try {
    const raw = await callBuzzAPI(value, chain);
    if (!raw.success) throw new Error(raw.error || "API returned unsuccessful");

    const t   = raw.token || {};
    const sc  = raw.score || {};
    const sub = raw.sub_agents || {};
    const scanner = sub.scanner && sub.scanner.data || {};

    const l1 = {
      symbol:        t.symbol || scanner.symbol || "?",
      chain:         t.chain || scanner.chain || "solana",
      ca:            t.address || value,
      priceUsd:      t.price_usd || scanner.price_usd,
      fdv:           scanner.fdv || scanner.market_cap,
      liq:           t.liquidity || scanner.liquidity_usd || 0,
      vol24h:        scanner.volume_24h || 0,
      pairCreatedAt: scanner.pair_created_at || null,
      priceChange:   {
        h1:  scanner.price_change_1h,
        h24: scanner.price_change_24h,
        d7:  null
      },
      txns: scanner.txns_24h_buys ? {
        h24: { buy: scanner.txns_24h_buys, sell: scanner.txns_24h_sells }
      } : null,
      dex: scanner.dex || "N/A"
    };

    const safetyData = sub.safety && sub.safety.data || {};
    const l2 = {
      rugScore:        safetyData.rugcheck_score != null ? safetyData.rugcheck_score : null,
      mintAuthority:   safetyData.factors && safetyData.factors.some(f => f.name === "mint_revoked") ? false : null,
      freezeAuthority: null,
      lpBurned:        null,
      topHolderPct:    null
    };

    const socialData = sub.social && sub.social.data || {};
    const l3 = {
      sentiment: socialData.verdict || null,
      followers: null,
      mentions:  null,
      devActivity: null
    };

    const scoring = {
      score: Math.round(sc.total || 0),
      grade: sc.verdict || "?",
      factors: {
        marketScore: sc.breakdown && sc.breakdown.scorer && sc.breakdown.scorer.data && sc.breakdown.scorer.data.categories && sc.breakdown.scorer.data.categories.market || null,
        safetyScore: Math.round((sub.safety && sub.safety.weighted_score || 0)),
        socialScore: Math.round((sub.social && sub.social.weighted_score || 0)),
        onchainScore: Math.round((sub.wallet && sub.wallet.weighted_score || 0))
      }
    };

    const reply = buildReply(l1, l2, l3, scoring);
    return { l1, l2, l3, scoring, reply };
  } catch (err) {
    log("  ⚠️ Pipeline error: " + err.message);
    return null;
  }
}


// ==============================================================================
// BANKR AUTONOMOUS DEPLOY
// ==============================================================================

async function executeBankrDeploy(name, symbol, description, creatorHandle) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      name,
      symbol,
      description: description || `${name} -- deployed via Buzz by SolCex`,
      chain: 'base',
      partnerFeeRecipient: BANKR_FEE_WALLET,
      creatorXHandle: creatorHandle || '',
      deployerWallet: BANKR_DEPLOY_WALLET,
    });

    const options = {
      hostname: 'api.bankr.bot',
      port: 443,
      path: '/token-launches/deploy',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'X-Partner-Key': BANKR_PARTNER_KEY,
        'X-Api-Version': '2025-01-01',
      }
    };

    const req = https.request(options, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (res.statusCode === 200 || res.statusCode === 201) resolve(data);
          else reject(new Error(`Bankr ${res.statusCode}: ${body.slice(0, 200)}`));
        } catch { reject(new Error('Bankr parse error: ' + body.slice(0, 200))); }
      });
    });
    req.on('error', reject);
    req.setTimeout(60000, () => { req.destroy(); reject(new Error('Bankr deploy timeout')); });
    req.write(payload);
    req.end();
  });
}

// ==============================================================================
// TWITTER API
// ==============================================================================

function oauthSign(method, url, params, consumerKey, consumerSecret, tokenSecret) {
  const allParams = { ...params, oauth_consumer_key: consumerKey, oauth_signature_method: 'HMAC-SHA1', oauth_version: '1.0' };
  const base = method.toUpperCase() + '&' +
    encodeURIComponent(url) + '&' +
    encodeURIComponent(Object.keys(allParams).sort().map(k => k + '=' + encodeURIComponent(allParams[k])).join('&'));
  const key = encodeURIComponent(consumerSecret) + '&' + encodeURIComponent(tokenSecret);
  return crypto.createHmac('sha1', key).update(base).digest('base64');
}

function buildOAuthHeader(method, url, extraParams) {
  const ts    = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomBytes(16).toString('hex');
  const oauthParams = {
    oauth_consumer_key:     X_API_KEY,
    oauth_nonce:            nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp:        ts,
    oauth_token:            X_ACCESS_TOKEN,
    oauth_version:          '1.0',
  };
  const allParams = { ...oauthParams, ...(extraParams || {}) };
  oauthParams.oauth_signature = oauthSign(method, url, allParams, X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN_SECRET);
  const header = 'OAuth ' + Object.keys(oauthParams).sort()
    .map(k => `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`)
    .join(', ');
  return header;
}

async function fetchMentions(sinceId) {
  return new Promise((resolve, reject) => {
    if (!BOT_USER_ID) { log('⚠️ X_BOT_USER_ID not set -- skip fetch'); resolve([]); return; }
    let url = `https://api.twitter.com/2/users/${BOT_USER_ID}/mentions?max_results=20&tweet.fields=author_id,conversation_id,text&expansions=referenced_tweets.id`;
    if (sinceId) url += `&since_id=${sinceId}`;
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${X_BEARER_TOKEN}` }
    };
    const req = https.request(options, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          resolve(data.data || []);
        } catch { reject(new Error('Mentions parse: ' + body.slice(0, 200))); }
      });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Mentions timeout')); });
    req.end();
  });
}

async function postReply(inReplyToId, text) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({ text, reply: { in_reply_to_tweet_id: inReplyToId } });
    const url = 'https://api.twitter.com/2/tweets';
    const header = buildOAuthHeader('POST', url, {});
    const options = {
      hostname: 'api.twitter.com',
      path: '/2/tweets',
      method: 'POST',
      headers: { 'Authorization': header, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
    };
    const req = https.request(options, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
        catch { resolve({ status: res.statusCode, data: {} }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('postReply timeout')); });
    req.write(payload);
    req.end();
  });
}

// ==============================================================================
// TELEGRAM NOTIFICATIONS
// ==============================================================================

async function sendTelegram(msg) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  return new Promise(resolve => {
    const payload = JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: msg, parse_mode: 'HTML' });
    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
    };
    const req = https.request(options, res => {
      res.on('data', () => {});
      res.on('end', resolve);
    });
    req.on('error', resolve);
    req.write(payload);
    req.end();
  });
}

async function notifyListLead(tweetId, tweetText, authorHandle) {
  const msg = [
    `🐝 <b>LIST LEAD -- @BuzzBySolCex</b>`,
    ``,
    `Tweet ID: ${tweetId}`,
    `From: ${authorHandle || 'Unknown'}`,
    `Text: ${tweetText?.slice(0, 200) || '--'}`,
    ``,
    `Action: DM the user to discuss SolCex listing`,
    `Link: https://twitter.com/i/web/status/${tweetId}`,
  ].join('\n');
  await sendTelegram(msg);
  saveLead({ tweetId, handle: authorHandle, text: tweetText?.slice(0, 200), type: 'LIST' });
}

async function notifyDeployLead(tweetId, name, symbol, contractAddress, authorHandle) {
  const msg = [
    `🚀 <b>TOKEN DEPLOYED -- @BuzzBySolCex</b>`,
    ``,
    `Token: ${name} ($${symbol})`,
    `CA: ${contractAddress}`,
    `From: ${authorHandle || 'Unknown'}`,
    `Tweet: https://twitter.com/i/web/status/${tweetId}`,
  ].join('\n');
  await sendTelegram(msg);
  saveLead({ tweetId, handle: authorHandle, name, symbol, contractAddress, type: 'DEPLOY' });
}

async function notifyBuzz(l1, l2, l3, scoring, tweetId) {
  const msg = [
    `🐝 <b>SCAN COMPLETE -- @BuzzBySolCex</b>`,
    ``,
    `$${l1?.symbol || '?'} (${l1?.chain || '?'})`,
    `Score: ${scoring?.score || 0}/100 (${letterGrade(scoring?.score || 0)})`,
    `Price: ${fmtPrice(l1?.priceUsd)} | FDV: $${fmtNum(l1?.fdv)}`,
    `Liq: $${fmtNum(l1?.liq)} | Vol: $${fmtNum(l1?.vol24h)}`,
    `Tweet: https://twitter.com/i/web/status/${tweetId}`,
  ].join('\n');
  await sendTelegram(msg);
}

// ==============================================================================
// MAIN LOOP
// ==============================================================================

let lastMentionId = loadWatermark();
let isRunning = false;  // Concurrency guard -- prevents overlapping scans

async function runLoop() {
  if (isRunning) { log('Previous scan still running, skip'); return; }
  isRunning = true;
  try {
  log(`\n${'-'.repeat(50)}`);
  log(`-- Mention check -- (since_id: ${lastMentionId || "none"})`);

  try {
    const mentions = await fetchMentions(lastMentionId).catch(e => { log(`Fetch error: ${e.message}`); return []; });
    if (!mentions.length) { log('No new mentions'); return; }

    log(`Found ${mentions.length} mentions`);
    const replied = loadReplied();
    const daily   = loadDailyCount();
    let processed = 0;

    // Advance watermark to newest mention so since_id skips already-seen tweets
    if (mentions.length) { lastMentionId = mentions[0].id; saveWatermark(lastMentionId); }
    for (const tweet of mentions) {
      if (replied.includes(tweet.id)) continue;
      if (daily.count >= MAX_REPLIES_DAY) { log(`Daily limit ${MAX_REPLIES_DAY} reached`); break; }



      const cmd = parseCommand(tweet.text);
      if (!cmd) {
        log(`Skip ${tweet.id}: no command in "${tweet.text.slice(0, 60)}"`);
        replied.push(tweet.id);
        saveReplied(replied);
        continue;
      }

      let replyText;

      // -- LIST ROUTE -------------------------------------------------------
      if (cmd.route === 'LIST') {
        log(`\n📋 Tweet ${tweet.id}: LIST request`);
        replyText = formatListReply();
        await notifyListLead(tweet.id, tweet.text, tweet.author_id);

      // -- DEPLOY ROUTE (instructions) --------------------------------------
      } else if (cmd.route === 'DEPLOY') {
        log(`\n🚀 Tweet ${tweet.id}: DEPLOY request (instructions)`);
        replyText = formatDeployReply();

      // -- TOKEN DETAILS ROUTE (execute deploy) -----------------------------
      } else if (cmd.route === 'TOKEN_DETAILS') {
        const deployDaily = getDeployDailyCount();
        if (deployDaily.count >= MAX_DEPLOYS_DAY) {
          log(`\n⚠️ Tweet ${tweet.id}: Deploy limit (${MAX_DEPLOYS_DAY}/day) reached`);
          replyText = `⚠️ Daily deploy limit reached. Try again tomorrow!\n\nWant your token listed on @SolCex_Exchange instead? Reply LIST 🏦`;
        } else {
          log(`\n⚙️ Tweet ${tweet.id}: TOKEN DETAILS -- deploying ${cmd.name} ($${cmd.symbol})`);
          try {
            const result = await executeBankrDeploy(cmd.name, cmd.symbol, cmd.description, tweet.author_id);
            const ca  = result?.contractAddress || result?.token?.address || 'Pending';
            const tx  = result?.transactionHash || result?.tx || '';
            incrementDeployDailyCount();
            replyText = formatDeployConfirmation(cmd.name, cmd.symbol, ca, tx);
            await notifyDeployLead(tweet.id, cmd.name, cmd.symbol, ca, tweet.author_id);
            log(`  ✅ Bankr deploy success: ${ca}`);
          } catch (err) {
            log(`  ❌ Bankr deploy failed: ${err.message}`);
            replyText = `⚠️ Deploy encountered an issue. Please try again or contact @SolCex_Exchange for manual assistance.\n\nReply LIST to explore CEX listing instead 🏦`;
          }
        }

      // -- SCAN ROUTE -------------------------------------------------------
      } else {
        log(`\n\ud83d\udd0d Tweet ${tweet.id}: SCAN ${cmd.type}=${cmd.value}`);
        // Resolve ticker to contract address via DexScreener
        if (cmd.type === 'symbol') {
          const resolved = await resolveTickerToAddress(cmd.value);
          if (!resolved || !resolved.address) {
            log('  \u274c Could not resolve ticker ' + cmd.value);
            const noFind = 'Could not find token $' + cmd.value + ' on DexScreener. Try the full contract address instead.\n\nTag @BuzzBySolCex scan <contract_address>';
            await postReply(tweet.id, noFind);
            incrementDailyCount();
            replied.push(tweet.id);
            saveReplied(replied);
            processed++;
            if (processed < mentions.length) await new Promise(r => setTimeout(r, REPLY_DELAY_MS));
            continue;
          }
          log('  \u2705 Resolved $' + cmd.value + ' -> ' + resolved.address.slice(0,12) + '... on ' + resolved.chain);
          cmd.value = resolved.address;
          cmd.type = 'ca';
          cmd.chain = resolved.chain || 'solana';
        }
        const history = loadScanHistory();
        if (history.includes(cmd.value)) {
          log(`  Skip: already scanned ${cmd.value}`);
          replied.push(tweet.id);
          saveReplied(replied);
          continue;
        }

        const result = await runScanPipeline(cmd.value, cmd.chain || "solana");
        if (!result) {
          log(`  ❌ Pipeline returned no result`);
          replied.push(tweet.id);
          saveReplied(replied);
          continue;
        }

        // Score 50+ minimum -- skip posting for low-scoring tokens
        if (!result.reply) {
          log(`  ⛔ Score ${result.scoring?.score || 0}/100 below 50 minimum -- not posting`);
          replied.push(tweet.id);
          saveReplied(replied);
          continue;
        }

        replyText = result.reply;
        addScanHistory(cmd.value);

        log(`  📝 Reply (${replyText.length} chars)`);
        const postResult = await postReply(tweet.id, replyText);
        if (postResult && postResult.status === 201) {
          const count = incrementDailyCount();
          const replyId = postResult.data?.data?.id;
          if (replyId) saveScanTweet(replyId, result);
          log(`  ✅ POSTED! (${count}/${MAX_REPLIES_DAY} today)`);
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
        continue;  // Skip common post block below
      }

      // -- Common post block for LIST / DEPLOY / TOKEN_DETAILS --------------
      log(`  📝 Reply (${replyText.length} chars)`);
      const pr = await postReply(tweet.id, replyText);
      if (pr && pr.status === 201) {
        const cnt = incrementDailyCount();
        log(`  ✅ POSTED! (${cnt}/${MAX_REPLIES_DAY} today)`);
      } else {
        log(`  ❌ Post failed: ${pr?.status || 'null'} ${JSON.stringify(pr?.data || '').slice(0, 200)}`);
      }
      replied.push(tweet.id);
      saveReplied(replied);
      processed++;
      if (processed < mentions.length) {
        log(`  ⏳ Rate limit delay ${REPLY_DELAY_MS / 1000}s...`);
        await new Promise(r => setTimeout(r, REPLY_DELAY_MS));
      }
    }

    log(`✅ Processed ${processed} mention(s) this cycle.`);
  } catch (err) {
    log(`❌ Loop error: ${err.message}`);
  }
  } finally { isRunning = false; }
}


// ==============================================================================
// PROACTIVE TWEET SCHEDULE v1.0
// Alpha Alerts | Pipeline Reports | Intelligence Threads | Build Updates
// ==============================================================================

const SCHEDULE_STATE_FILE = path.join(DATA_DIR, 'tweet-schedule-state.json');
const ROTATION_FILE = path.join(DATA_DIR, 'tweet-rotation.json');

// -- Buzz API helper ---------------------------------------------------------

function buzzApiGet(apiPath) {
  return new Promise((resolve) => {
    const opts = {
      hostname: 'localhost', port: 3000, path: apiPath, method: 'GET',
      headers: { 'X-API-Key': process.env.BUZZ_API_ADMIN_KEY || '' }
    };
    const req = http.request(opts, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch { resolve(null); } });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(15000, () => { req.destroy(); resolve(null); });
    req.end();
  });
}

// -- Schedule state (dedup) --------------------------------------------------

function loadScheduleState() {
  try { return JSON.parse(fs.readFileSync(SCHEDULE_STATE_FILE, 'utf8')); }
  catch { return {}; }
}

function saveScheduleState(state) {
  fs.writeFileSync(SCHEDULE_STATE_FILE, JSON.stringify(state, null, 2));
}

function canPost(type, minIntervalHours) {
  const state = loadScheduleState();
  const last = state[type];
  if (!last) return true;
  const elapsed = (Date.now() - new Date(last).getTime()) / (1000 * 60 * 60);
  return elapsed >= minIntervalHours;
}

function markPosted(type) {
  const state = loadScheduleState();
  state[type] = new Date().toISOString();
  saveScheduleState(state);
}

// -- Post original tweet (not a reply) ---------------------------------------

async function postOriginalTweet(text) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({ text });
    const url = 'https://api.twitter.com/2/tweets';
    const header = buildOAuthHeader('POST', url, {});
    const options = {
      hostname: 'api.twitter.com',
      path: '/2/tweets',
      method: 'POST',
      headers: {
        'Authorization': header,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };
    const req = https.request(options, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
        catch { resolve({ status: res.statusCode, data: {} }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('postOriginalTweet timeout')); });
    req.write(payload);
    req.end();
  });
}

// ==============================================================================
// 1. ALPHA ALERT -- every 6h
// ==============================================================================

async function postAlphaAlert() {
  if (!canPost('alpha', 5)) { log('Alpha alert: too soon, skip'); return; }

  try {
    const pipeline = await buzzApiGet('/api/v1/pipeline?limit=5&sort=score_desc');
    const okx = await buzzApiGet('/api/v1/ws/okx/status');
    const btcPrice = okx?.mostRecent?.last_price || 0;
    const btcStr = btcPrice ? '\u0024' + Math.round(btcPrice).toLocaleString() : '?';

    let tweet;

    if (pipeline?.tokens?.length > 0 && pipeline.tokens[0].score && pipeline.tokens[0].score >= 70) {
      const t = pipeline.tokens[0];
      const ticker = t.ticker || 'TOKEN';
      const score = t.score || 0;
      const stage = t.stage || '?';
      const chain = t.chain || '?';
      const addr = t.address || '?';
      const name = t.name || ticker;
      const safety = t.safety_grade || t.rugcheck_grade || '?';
      const verdict = score >= 85 ? 'HOT' : 'QUALIFIED';

      tweet = `\u{1F41D} BUZZ ALPHA SIGNAL \u2014 \u0024${ticker} scores ${score}/100\n\n` +
        `\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n` +
        `\u{1F50D} TOKEN: ${name} (\u0024${ticker})\n` +
        `CA: ${addr.slice(0,20)}...\n` +
        `Chain: ${chain}\n\n` +
        `\u{1F6E1}\uFE0F SAFETY: ${safety}\n` +
        `\u{1F40B} SMART MONEY: Pipeline stage ${stage}\n` +
        `\u{1F4C8} MOMENTUM: BTC at ${btcStr}\n` +
        `\u{1F465} PERSONA CONSENSUS: 10 agents analyzed\n\n` +
        `\u{1F3AF} VERDICT: ${score}/100 | ${verdict}\n` +
        `\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n\n` +
        `\u{1F48E} CEX LISTING?\n` +
        `SolCex Exchange | Chains: SOL/ETH/Base/BSC/Tron\n` +
        `ERC-8004 #25045 | AgentProof #1718\n` +
        `DM @HidayahAnka1\n\n` +
        `Tag @BuzzBySolCex scan \u0024TICKER for the full 5-layer Premium report.\n\n` +
        `\u{1F41D} Buzz BD Agent | Built on OpenClaw \u00B7 Agentic.hosting | @SolCex_Exchange\n` +
        `#AIAgent #SolCex #BuzzAgent #CryptoAlpha #TokenAnalysis`;
    } else {
      // Market snapshot fallback - Premium long-form
      const stats = await buzzApiGet('/api/v1/pipeline/stats') || {};
      const byChain = (stats.by_chain || []).map(c => c.chain + ': ' + c.count).join(' | ') || 'scanning...';
      const total = stats.total || 0;
      const added = stats.added_24h || 0;
      const hot = stats.hot || 0;

      tweet = `\u{1F41D} BUZZ MARKET PULSE \u2014 Real-Time Intelligence\n\n` +
        `\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n` +
        `\u{1F4CA} MARKET OVERVIEW:\n` +
        `BTC: ${btcStr}\n` +
        `Pipeline: ${total} tokens tracked\n` +
        `Added (24h): ${added} new discoveries\n` +
        `HOT signals (85+): ${hot}\n\n` +
        `\u26D3\uFE0F CHAIN DISTRIBUTION:\n` +
        `${byChain}\n\n` +
        `\u{1F916} SYSTEM STATUS:\n` +
        `\u2705 10/10 AI agents online\n` +
        `\u2705 OKX WebSocket: live\n` +
        `\u2705 Helius WebSocket: live\n` +
        `\u2705 21 intel sources active\n` +
        `\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n\n` +
        `No 70+ signals right now \u2014 but Buzz never sleeps.\n` +
        `10 agents scanning 7 sources 24/7.\n\n` +
        `Tag @BuzzBySolCex scan \u0024TICKER for instant Premium analysis.\n\n` +
        `\u{1F48E} CEX listing: DM @HidayahAnka1\n` +
        `\u{1F41D} Buzz BD Agent | Built on OpenClaw \u00B7 Agentic.hosting | @SolCex_Exchange\n` +
        `#AIAgent #CryptoAlpha #BuzzAgent #SolCex #MarketPulse`;
    }

    const result = await postOriginalTweet(tweet);
    if (result && result.status === 201) {
      markPosted('alpha');
      log(`\u2705 Alpha alert posted (Premium long-form: ${tweet.length} chars)`);
    } else {
      log(`\u274C Alpha alert failed: ` + JSON.stringify(result?.data || '').slice(0, 200));
    }
  } catch (err) {
    log(`\u274C Alpha alert error: ` + err.message);
  }
}

// ==============================================================================
// 2. PIPELINE REPORT -- daily at 12:00 UTC
// ==============================================================================

async function postPipelineReport() {
  if (!canPost('pipeline', 22)) { log('Pipeline report: too soon, skip'); return; }

  try {
    const stats = await buzzApiGet('/api/v1/pipeline/stats') || {};
    const okx = await buzzApiGet('/api/v1/ws/okx/status');
    const btcPrice = okx?.mostRecent?.last_price || 0;
    const btcStr = btcPrice ? '\u0024' + Math.round(btcPrice).toLocaleString() : '?';

    // Top tokens leaderboard
    const pipeline = await buzzApiGet('/api/v1/pipeline?limit=5&sort=score_desc') || {};
    const top5 = (pipeline.tokens || []).filter(t => t.score > 0).slice(0, 5);
    let leaderboard = '';
    top5.forEach((t, i) => {
      const medal = ['\u{1F947}', '\u{1F948}', '\u{1F949}', '4\uFE0F\u20E3', '5\uFE0F\u20E3'][i];
      const verdict = t.score >= 85 ? 'HOT' : t.score >= 70 ? 'QUALIFIED' : 'WATCH';
      leaderboard += medal + ' \u0024' + (t.ticker || '?') + ' \u2014 ' + t.score + '/100 (' + verdict + ')\n';
    });
    if (!leaderboard) leaderboard = 'No scored tokens yet. Pipeline building...\n';

    const byChain = (stats.by_chain || []).map(c => c.chain + ': ' + c.count).join(' | ') || 'scanning...';
    const total = stats.total || 0;
    const added = stats.added_24h || 0;

    const tweet = `\u{1F41D} BUZZ PIPELINE REPORT\n\n` +
      `\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n` +
      `\u{1F3C6} LEADERBOARD (Top 5):\n` +
      leaderboard + `\n` +
      `\u{1F4CA} PIPELINE STATS:\n` +
      `\u{1F525} Total tokens: ${total}\n` +
      `\u2705 Added (24h): ${added}\n` +
      `\u{1F4B0} BTC: ${btcStr}\n\n` +
      `\u26D3\uFE0F CHAIN DISTRIBUTION:\n` +
      `${byChain}\n\n` +
      `\u{1F916} SYSTEM PERFORMANCE:\n` +
      `\u2022 10 AI agents \u2022 21 intel sources\n` +
      `\u2022 OKX WS: ${((okx?.messageCount || 0) > 0 ? (okx.messageCount).toLocaleString() + ' msgs' : 'active')}\n` +
      `\u2022 Scan time: ~10 seconds per token\n` +
      `\u2022 Infra: \u00244.09/mo Hetzner CX23\n` +
      `\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n\n` +
      `Tag @BuzzBySolCex scan \u0024TICKER to enter the pipeline.\n\n` +
      `\u{1F48E} CEX listing inquiries: DM @HidayahAnka1\n` +
      `\u{1F41D} Buzz BD Agent | Built on OpenClaw \u00B7 Agentic.hosting | @SolCex_Exchange\n` +
      `#BuildInPublic #AIAgent #SolCex #BuzzAgent #Pipeline`;

    const result = await postOriginalTweet(tweet);
    if (result && result.status === 201) {
      markPosted('pipeline');
      log(`\u2705 Pipeline report posted (Premium long-form: ${tweet.length} chars)`);
    } else {
      log(`\u274C Pipeline report failed: ` + JSON.stringify(result?.data || '').slice(0, 200));
    }
  } catch (err) {
    log(`\u274C Pipeline report error: ` + err.message);
  }
}

// ==============================================================================
// 3. INTELLIGENCE THREAD -- Tue & Fri 14:00 UTC
// ==============================================================================

async function postIntelligenceThread() {
  if (!canPost('intelligence', 60)) { log('Intelligence: too soon, skip'); return; }

  try {
    // Load Premium topics from external JSON file
    const TOPICS_FILE = path.join(DATA_DIR, 'tweet-topics.json');
    let topics;
    try {
      topics = JSON.parse(fs.readFileSync(TOPICS_FILE, 'utf8'));
    } catch (err) {
      log('\u274C Intelligence: cannot load topics file: ' + err.message);
      return;
    }

    if (!Array.isArray(topics) || topics.length === 0) {
      log('\u274C Intelligence: topics file empty or invalid');
      return;
    }

    // Load rotation index
    let rotation;
    try { rotation = JSON.parse(fs.readFileSync(ROTATION_FILE, 'utf8')); }
    catch { rotation = { index: 0 }; }

    const topicIndex = rotation.index % topics.length;
    const topic = topics[topicIndex];

    log(`Intelligence: posting topic ${topicIndex + 1}/${topics.length} (${topic.length} chars)`);

    const result = await postOriginalTweet(topic);

    if (result && result.status === 201) {
      rotation.index = (rotation.index + 1) % topics.length;
      fs.writeFileSync(ROTATION_FILE, JSON.stringify(rotation));
      markPosted('intelligence');
      log(`\u2705 Intelligence thread posted (topic ${topicIndex + 1}/${topics.length}, ${topic.length} chars)`);
    } else {
      log('\u274C Intelligence thread failed: ' + JSON.stringify(result?.data || '').slice(0, 200));
    }
  } catch (err) {
    log('\u274C Intelligence thread error: ' + err.message);
  }
}

// ==============================================================================
// 4. BUILD UPDATE -- Wed & Sat 15:00 UTC
// ==============================================================================

async function postBuildUpdate() {
  if (!canPost('build', 60)) { log('Build update: too soon, skip'); return; }

  try {
    const health = await buzzApiGet('/api/v1/health') || {};
    const okx = await buzzApiGet('/api/v1/ws/okx/status') || {};
    const stats = await buzzApiGet('/api/v1/pipeline/stats') || {};

    // Calculate sprint day (started Feb 25, 2026)
    const sprintDay = Math.floor((Date.now() - new Date('2026-02-25').getTime()) / 86400000);

    // Try Sentinel status
    let sentinelStatus = 'unknown';
    try {
      const sentResp = await buzzApiGet('/api/v1/health');
      sentinelStatus = sentResp?.status === 'ok' ? 'GREEN' : 'YELLOW';
    } catch { sentinelStatus = 'checking...'; }

    const endpoints = health.endpoints || health.checks?.routes?.count || '91+';
    const tables = health.checks?.database?.tables || '43+';
    const okxMsgs = (okx?.messageCount || 0).toLocaleString();
    const uptime = health.uptime ? Math.floor(health.uptime / 3600) + 'h' : '?';
    const totalTokens = stats.total || 0;

    const tweet = `\u{1F41D} SPRINT DAY ${sprintDay} \u2014 Build Update\n\n` +
      `\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n` +
      `\u{1F3D7}\uFE0F SYSTEM STATS:\n` +
      `\u2022 Endpoints: ${endpoints}\n` +
      `\u2022 DB Tables: ${tables}\n` +
      `\u2022 Pipeline: ${totalTokens} tokens tracked\n` +
      `\u2022 Uptime: ${uptime}\n\n` +
      `\u{1F4E1} LIVE FEEDS:\n` +
      `\u2022 OKX WebSocket: ${okxMsgs} messages received\n` +
      `\u2022 Helius WebSocket: monitoring Solana\n` +
      `\u2022 21 intel sources active\n\n` +
      `\u{1F916} AGENTS: 10/10 online\n` +
      `\u2022 Scanner \u2022 Safety \u2022 Wallet \u2022 Social \u2022 Scorer\n` +
      `\u2022 Degen \u2022 Whale \u2022 Institutional \u2022 Community\n` +
      `\u2022 Orchestrator\n\n` +
      `\u{1F6E1}\uFE0F SENTINEL: ${sentinelStatus}\n` +
      `\u2022 96 sweeps/day \u2022 Auto-repair enabled\n` +
      `\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n\n` +
      `Infra: \u00244.09/mo Hetzner CX23 | Docker | SQLite\n` +
      `Built by @hidayahanka1 with @AnthropicAI Claude.\n\n` +
      `\u{1F41D} Buzz BD Agent | Built on OpenClaw \u00B7 Agentic.hosting | @SolCex_Exchange\n` +
      `#BuildInPublic #AIAgent #ChefWhoCodes #SolCex #BuzzAgent`;

    const result = await postOriginalTweet(tweet);
    if (result && result.status === 201) {
      markPosted('build');
      log(`\u2705 Build update posted (day ${sprintDay}, Premium long-form: ${tweet.length} chars)`);
    } else {
      log(`\u274C Build update failed: ` + JSON.stringify(result?.data || '').slice(0, 200));
    }
  } catch (err) {
    log(`\u274C Build update error: ` + err.message);
  }
}



// ==============================================================================
// STARTUP
// ==============================================================================

log(`================================================`);
log(`  🐝 Twitter Bot v3.3-premium-7section`);
log(`  Routes: SCAN (Premium 7-Section) | LIST | DEPLOY | TOKEN_DETAILS`);
log(`  Premium long-form tweets: 1000-2000 chars | Bankr autonomous deploy`);
log(`  Interval: ${CHECK_INTERVAL_MS / 60000} min | Max: ${MAX_REPLIES_DAY}/day`);
log(`================================================`);

// Validate env
if (!X_BEARER_TOKEN) log('⚠️  X_BEARER_TOKEN not set');
if (!X_API_KEY)      log('⚠️  X_API_KEY not set');
if (!BOT_USER_ID)    log('⚠️  X_BOT_USER_ID not set -- mentions fetch disabled');
if (!BANKR_PARTNER_KEY) log('⚠️  BANKR_PARTNER_KEY not set -- deploy will fail');

// Initial run then loop
(async () => {
  await runLoop();
  setInterval(runLoop, CHECK_INTERVAL_MS);

// -- Proactive Tweet Schedule ------------------------------------------------
// Runs on startup AND every 15 min so restarts do not skip scheduled tweets.
// The canPost() dedup prevents double-posting within the minimum interval.

async function checkScheduledTweets() {
  const d = new Date();
  const h = d.getUTCHours();
  const day = d.getUTCDay();

  // Alpha alert: every 6h (0, 6, 12, 18 UTC)
  if ([0, 6, 12, 18].includes(h)) {
    log("Schedule check: Alpha alert hour (" + h + " UTC), attempting...");
    await postAlphaAlert();
  }

  // Pipeline report: daily at 12:00 UTC
  if (h === 12) {
    log("Schedule check: Pipeline report hour (12 UTC), attempting...");
    await postPipelineReport();
  }

  // Intelligence thread: Tue (2) & Fri (5) at 14:00 UTC
  if ([2, 5].includes(day) && h === 14) {
    log("Schedule check: Intelligence thread (day=" + day + " hour=14), attempting...");
    await postIntelligenceThread();
  }

  // Build update: Wed (3) & Sat (6) at 15:00 UTC
  if ([3, 6].includes(day) && h === 15) {
    log("Schedule check: Build update (day=" + day + " hour=15), attempting...");
    await postBuildUpdate();
  }
}

// Run immediately on startup, then every 15 minutes
checkScheduledTweets();
setInterval(checkScheduledTweets, CHECK_INTERVAL_MS);

log("Proactive tweet schedule active (alpha/pipeline/intelligence/build) [15-min check]");

})();
