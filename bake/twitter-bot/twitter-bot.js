// ══════════════════════════════════════════════════════════════════════════════
// Buzz BD Agent — Twitter Bot v3.1-final
// OpenClaw v2026.3.1 | SolCex Exchange | Indonesia Sprint
// ──────────────────────────────────────────────────────────────────────────────
// Routes:
//   SCAN   → 5-Layer Premium report (4000 chars) + LIST/DEPLOY CTA footer
//   LIST   → SolCex listing pitch + Telegram lead alert to Ogie
//   DEPLOY → Autonomous Bankr token deploy (no Ogie approval needed)
//   TOKEN DETAILS → Follow-up: execute bankr deploy after user provides name/symbol
// ══════════════════════════════════════════════════════════════════════════════

'use strict';

const https  = require('https');
const http   = require('http');
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

// ── Config ────────────────────────────────────────────────────────────────────
const DATA_DIR            = process.env.TWITTER_DATA_DIR || '/data/workspace';
const REPLIED_FILE        = path.join(DATA_DIR, 'twitter-replied.json');
const DAILY_COUNT_FILE    = path.join(DATA_DIR, 'twitter-daily-count.json');
const SCAN_HISTORY_FILE   = path.join(DATA_DIR, 'twitter-scan-history.json');
const LEADS_FILE          = path.join(DATA_DIR, 'twitter-leads.json');
const DEPLOYS_FILE        = path.join(DATA_DIR, 'twitter-deploys.json');
const SCAN_TWEETS_FILE    = path.join(DATA_DIR, 'twitter-scan-tweets.json');
const DEPLOY_DAILY_FILE   = path.join(DATA_DIR, 'twitter-deploy-daily.json');
const LOG_FILE            = path.join(DATA_DIR, 'twitter-bot.log');

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

// ── Logger ────────────────────────────────────────────────────────────────────
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(LOG_FILE, line + '\n'); } catch {}
}

// ── JSON Helpers ──────────────────────────────────────────────────────────────
function loadJSON(file, def) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return def; }
}
function saveJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ── Daily Count ───────────────────────────────────────────────────────────────
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

// ── Replied Tracking ──────────────────────────────────────────────────────────
function loadReplied() { return loadJSON(REPLIED_FILE, []); }
function saveReplied(arr) { saveJSON(REPLIED_FILE, arr.slice(-2000)); }

// ── Scan History ──────────────────────────────────────────────────────────────
function loadScanHistory() { return loadJSON(SCAN_HISTORY_FILE, []); }
function addScanHistory(ca) {
  const h = loadScanHistory();
  if (!h.includes(ca)) { h.push(ca); saveJSON(SCAN_HISTORY_FILE, h.slice(-500)); }
}

// ── Scan Tweet Mapping ────────────────────────────────────────────────────────
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

// ── Lead Tracking ─────────────────────────────────────────────────────────────
function loadLeads() { return loadJSON(LEADS_FILE, []); }
function saveLead(lead) {
  const leads = loadLeads();
  leads.push({ ...lead, timestamp: new Date().toISOString() });
  saveJSON(LEADS_FILE, leads.slice(-500));
}

// ── Deploy Daily Count ────────────────────────────────────────────────────────
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

// ══════════════════════════════════════════════════════════════════════════════
// PREMIUM SCAN REPLY FORMAT v3.1 — 5-Layer Intelligence (4000 chars)
// ══════════════════════════════════════════════════════════════════════════════

function progressBar(score, max) {
  max = max || 10;
  const filled = Math.round((score / max) * 5);
  const empty = 5 - filled;
  return '█'.repeat(Math.max(0, filled)) + '░'.repeat(Math.max(0, empty));
}

function trendArrow(pct) {
  if (pct == null) return '— Unknown';
  if (pct >= 50)  return '▲▲▲ Surging';
  if (pct >= 20)  return '▲▲ Rising';
  if (pct >= 5)   return '▲ Up';
  if (pct >= -5)  return '→ Flat';
  if (pct >= -20) return '▼ Declining';
  return '▼▼ Dropping';
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
 * buildReply v3.1 — Premium 5-Layer SCAN reply
 * Maps existing l1/l2/l3/scoring data to the full format
 * @param {object} l1 - DexScreener pair data
 * @param {object} l2 - Safety/RugCheck data
 * @param {object} l3 - Social/Grok data
 * @param {object} scoring - { score, grade, factors }
 */
function buildReply(l1, l2, l3, scoring) {
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

  // Build the report
  const lines = [];
  lines.push(`🐝 BUZZ INTEL — $${l1.symbol} (${chain})`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  // Score header
  lines.push(`${v.e} ${scoring.score}/100 (${grade}) — ${v.l}`);
  lines.push(`Score ${progressBar(scoring.score, 100)} ${scoring.score}pts`);
  lines.push('');

  // Layer 1 — Market
  lines.push(`📊 LAYER 1 — MARKET`);
  lines.push(`Price:   ${fmtPrice(l1.priceUsd)}`);
  lines.push(`FDV:     $${fmtNum(l1.fdv)}`);
  lines.push(`Liq:     $${fmtNum(l1.liq)}`);
  lines.push(`Vol 24h: $${fmtNum(l1.vol24h)}`);
  lines.push(`Age:     ${age}`);
  lines.push(`Trend:   ${trendArrow(pc24h)} ${priceLine}`);
  if (l1.txns?.h24) {
    lines.push(`Txns 24h: ${(l1.txns.h24.buy || 0) + (l1.txns.h24.sell || 0)} (${l1.txns.h24.buy || 0}B / ${l1.txns.h24.sell || 0}S)`);
  }
  lines.push('');

  // Layer 2 — Safety
  lines.push(`🛡️ LAYER 2 — SAFETY`);
  if (rugScore != null) lines.push(`RugScore: ${rugScore}/100 ${progressBar(100 - rugScore, 100)}`);
  lines.push(`Mint Auth:   ${safeIcon(mintAuth)}${mintAuth == null ? ' Unknown' : ''}`);
  lines.push(`Freeze Auth: ${safeIcon(freezeAuth)}${freezeAuth == null ? ' Unknown' : ''}`);
  lines.push(`LP Burned:   ${safeIcon(lpBurned)}${lpBurned == null ? ' Unknown' : ''}`);
  if (topHolder != null) lines.push(`Top Holder:  ${topHolder.toFixed(1)}% ${topHolder < 10 ? '✅' : topHolder < 20 ? '⚠️' : '❌'}`);
  if (slip !== 'N/A') lines.push(`Slip Est:    ~${slip}`);
  lines.push('');

  // Layer 3 — Intelligence
  lines.push(`🧠 LAYER 3 — INTELLIGENCE`);
  if (f.marketScore    != null) lines.push(`Market:  ${f.marketScore}/25  ${progressBar(f.marketScore, 25)}`);
  if (f.safetyScore    != null) lines.push(`Safety:  ${f.safetyScore}/30  ${progressBar(f.safetyScore, 30)}`);
  if (f.socialScore    != null) lines.push(`Social:  ${f.socialScore}/25  ${progressBar(f.socialScore, 25)}`);
  if (f.onchainScore   != null) lines.push(`OnChain: ${f.onchainScore}/20  ${progressBar(f.onchainScore, 20)}`);
  lines.push('');

  // Layer 4 — Social
  lines.push(`🌐 LAYER 4 — SOCIAL`);
  if (sentiment)   lines.push(`Sentiment: ${sentiment}`);
  if (twitterF)    lines.push(`Followers: ${fmtNum(twitterF)}`);
  if (mentions)    lines.push(`Mentions:  ${fmtNum(mentions)} (24h)`);
  if (devActivity) lines.push(`Dev Activity: ${devActivity}`);
  if (!sentiment && !twitterF && !mentions) lines.push(`Social data: Limited`);
  lines.push('');

  // Layer 5 — Verdict
  lines.push(`🎯 LAYER 5 — VERDICT`);
  lines.push(`${v.e} ${v.l}: ${v.a}`);
  if (scoring.score >= 70) {
    lines.push(`CA: ${l1.ca}`);
    lines.push(`Chain: ${chain} | DEX: ${l1.dex || 'N/A'}`);
  }
  lines.push('');

  // Footer CTA
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  if (scoring.score >= 70) {
    lines.push(`🏦 Want $${l1.symbol} listed on @SolCex_Exchange?`);
    lines.push(`Reply LIST → get listing details`);
    lines.push(`Reply DEPLOY → launch your own token via @bankrbot`);
  } else if (scoring.score >= 50) {
    lines.push(`👀 Monitoring $${l1.symbol}. Score needs 70+ for listing.`);
    lines.push(`Reply DEPLOY → launch your own token via @bankrbot`);
  } else {
    lines.push(`⚠️ $${l1.symbol} below threshold (70+ required for listing).`);
    lines.push(`Reply DEPLOY → launch your own token via @bankrbot`);
  }
  lines.push('');
  lines.push(`Powered by @BuzzBySolCex | #SolCex #${chain}`);

  return lines.join('\n');
}

// ══════════════════════════════════════════════════════════════════════════════
// LIST / DEPLOY REPLY FORMATTERS
// ══════════════════════════════════════════════════════════════════════════════

function formatListReply() {
  return [
    `🏦 SolCex Exchange — CEX Listing Inquiry`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
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
    `• Token name & CA`,
    `• Current metrics`,
    `• Team contact`,
    ``,
    `We review all inquiries within 24h.`,
    ``,
    `#SolCex #Solana #CEXListing`,
  ].join('\n');
}

function formatDeployReply() {
  return [
    `🚀 Deploy Your Token via @bankrbot`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `Launch your token on Base chain in ~2 minutes:`,
    ``,
    `1️⃣ Reply with your token details:`,
    `   Name: [Token Name]`,
    `   Symbol: [TICKER]`,
    `   Description: [optional]`,
    ``,
    `2️⃣ Buzz will deploy automatically via Bankr`,
    ``,
    `3️⃣ Your token goes LIVE on Base with:`,
    `   • Auto LP seeded`,
    `   • Trading enabled instantly`,
    `   • 50% fee split to your wallet`,
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
    `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
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

// ══════════════════════════════════════════════════════════════════════════════
// COMMAND PARSERS
// ══════════════════════════════════════════════════════════════════════════════

function cleanText(text) {
  return (text || '').replace(/@\w+/g, '').replace(/https?:\/\/\S+/g, '').trim();
}

/**
 * parseCommand — detects LIST / DEPLOY / SCAN / TOKEN_DETAILS
 * Returns { route, type?, value?, name?, symbol?, description? } or null
 */
function parseCommand(text) {
  const cleaned = cleanText(text).toUpperCase();
  const raw     = cleanText(text);

  // LIST route
  if (/^LIST[!.?]?$/.test(cleaned) || /\bLIST\b/.test(cleaned.slice(0, 20))) {
    return { route: 'LIST' };
  }

  // DEPLOY route — bare "DEPLOY" triggers instructions
  if (/^DEPLOY[!.?]?$/.test(cleaned)) {
    return { route: 'DEPLOY' };
  }

  // TOKEN DETAILS — "Deploy Name: X Symbol: Y" or "Name: X\nSymbol: Y"
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

  // SCAN route — contract address or $SYMBOL
  const caMatch = text.match(/\b([1-9A-HJ-NP-Za-km-z]{32,44})\b/);   // Solana CA
  const evmMatch = text.match(/\b(0x[a-fA-F0-9]{40})\b/);              // EVM CA
  const symMatch = text.match(/\$([A-Za-z]{2,10})\b/);

  if (evmMatch) return { route: 'SCAN', type: 'ca', value: evmMatch[1] };
  if (caMatch)  return { route: 'SCAN', type: 'ca', value: caMatch[1] };
  if (symMatch) return { route: 'SCAN', type: 'symbol', value: symMatch[1].toUpperCase() };

  return null;
}

// ══════════════════════════════════════════════════════════════════════════════
// SCAN PIPELINE (calls OpenClaw gateway)
// ══════════════════════════════════════════════════════════════════════════════

function callBuzzAPI(address) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({ address });
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

async function runScanPipeline(value) {
  try {
    const raw = await callBuzzAPI(value);
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


// ══════════════════════════════════════════════════════════════════════════════
// BANKR AUTONOMOUS DEPLOY
// ══════════════════════════════════════════════════════════════════════════════

async function executeBankrDeploy(name, symbol, description, creatorHandle) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      name,
      symbol,
      description: description || `${name} — deployed via Buzz by SolCex`,
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

// ══════════════════════════════════════════════════════════════════════════════
// TWITTER API
// ══════════════════════════════════════════════════════════════════════════════

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
    if (!BOT_USER_ID) { log('⚠️ X_BOT_USER_ID not set — skip fetch'); resolve([]); return; }
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

// ══════════════════════════════════════════════════════════════════════════════
// TELEGRAM NOTIFICATIONS
// ══════════════════════════════════════════════════════════════════════════════

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
    `🐝 <b>LIST LEAD — @BuzzBySolCex</b>`,
    ``,
    `Tweet ID: ${tweetId}`,
    `From: ${authorHandle || 'Unknown'}`,
    `Text: ${tweetText?.slice(0, 200) || '—'}`,
    ``,
    `Action: DM the user to discuss SolCex listing`,
    `Link: https://twitter.com/i/web/status/${tweetId}`,
  ].join('\n');
  await sendTelegram(msg);
  saveLead({ tweetId, handle: authorHandle, text: tweetText?.slice(0, 200), type: 'LIST' });
}

async function notifyDeployLead(tweetId, name, symbol, contractAddress, authorHandle) {
  const msg = [
    `🚀 <b>TOKEN DEPLOYED — @BuzzBySolCex</b>`,
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
    `🐝 <b>SCAN COMPLETE — @BuzzBySolCex</b>`,
    ``,
    `$${l1?.symbol || '?'} (${l1?.chain || '?'})`,
    `Score: ${scoring?.score || 0}/100 (${letterGrade(scoring?.score || 0)})`,
    `Price: ${fmtPrice(l1?.priceUsd)} | FDV: $${fmtNum(l1?.fdv)}`,
    `Liq: $${fmtNum(l1?.liq)} | Vol: $${fmtNum(l1?.vol24h)}`,
    `Tweet: https://twitter.com/i/web/status/${tweetId}`,
  ].join('\n');
  await sendTelegram(msg);
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN LOOP
// ══════════════════════════════════════════════════════════════════════════════

let lastMentionId = null;
let isRunning = false;  // Concurrency guard — prevents overlapping scans

async function runLoop() {
  if (isRunning) { log('Previous scan still running, skip'); return; }
  isRunning = true;
  try {
  log(`\n${'─'.repeat(50)}`);
  log(`── Mention check ── (since_id: ${lastMentionId || "none"})`);

  try {
    const mentions = await fetchMentions(lastMentionId).catch(e => { log(`Fetch error: ${e.message}`); return []; });
    if (!mentions.length) { log('No new mentions'); return; }

    log(`Found ${mentions.length} mentions`);
    const replied = loadReplied();
    const daily   = loadDailyCount();
    let processed = 0;

    // Advance watermark to newest mention so since_id skips already-seen tweets
    if (mentions.length) lastMentionId = mentions[0].id;
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

      // ── LIST ROUTE ───────────────────────────────────────────────────────
      if (cmd.route === 'LIST') {
        log(`\n📋 Tweet ${tweet.id}: LIST request`);
        replyText = formatListReply();
        await notifyListLead(tweet.id, tweet.text, tweet.author_id);

      // ── DEPLOY ROUTE (instructions) ──────────────────────────────────────
      } else if (cmd.route === 'DEPLOY') {
        log(`\n🚀 Tweet ${tweet.id}: DEPLOY request (instructions)`);
        replyText = formatDeployReply();

      // ── TOKEN DETAILS ROUTE (execute deploy) ─────────────────────────────
      } else if (cmd.route === 'TOKEN_DETAILS') {
        const deployDaily = getDeployDailyCount();
        if (deployDaily.count >= MAX_DEPLOYS_DAY) {
          log(`\n⚠️ Tweet ${tweet.id}: Deploy limit (${MAX_DEPLOYS_DAY}/day) reached`);
          replyText = `⚠️ Daily deploy limit reached. Try again tomorrow!\n\nWant your token listed on @SolCex_Exchange instead? Reply LIST 🏦`;
        } else {
          log(`\n⚙️ Tweet ${tweet.id}: TOKEN DETAILS — deploying ${cmd.name} ($${cmd.symbol})`);
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

      // ── SCAN ROUTE ───────────────────────────────────────────────────────
      } else {
        log(`\n🔍 Tweet ${tweet.id}: SCAN ${cmd.type}=${cmd.value}`);
        const history = loadScanHistory();
        if (history.includes(cmd.value)) {
          log(`  Skip: already scanned ${cmd.value}`);
          replied.push(tweet.id);
          saveReplied(replied);
          continue;
        }

        const result = await runScanPipeline(cmd.value);
        if (!result) {
          log(`  ❌ Pipeline returned no result`);
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

      // ── Common post block for LIST / DEPLOY / TOKEN_DETAILS ──────────────
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


// ══════════════════════════════════════════════════════════════════════════════
// PROACTIVE TWEET SCHEDULE v1.0
// Alpha Alerts | Pipeline Reports | Intelligence Threads | Build Updates
// ══════════════════════════════════════════════════════════════════════════════

const SCHEDULE_STATE_FILE = path.join(DATA_DIR, 'tweet-schedule-state.json');
const ROTATION_FILE = path.join(DATA_DIR, 'tweet-rotation.json');

// ── Buzz API helper ─────────────────────────────────────────────────────────

function buzzApiGet(apiPath) {
  return new Promise((resolve) => {
    const opts = {
      hostname: 'localhost', port: 3000, path: apiPath, method: 'GET',
      headers: { 'X-API-Key': 'bzz_0S4j71ZWSqTgd_m8JyydXp1uqwmhN6GADi_9MEJmAg0' }
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

// ── Schedule state (dedup) ──────────────────────────────────────────────────

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

// ── Post original tweet (not a reply) ───────────────────────────────────────

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

// ══════════════════════════════════════════════════════════════════════════════
// 1. ALPHA ALERT — every 6h
// ══════════════════════════════════════════════════════════════════════════════

async function postAlphaAlert() {
  if (!canPost('alpha', 5)) { log('Alpha alert: too soon, skip'); return; }

  try {
    const pipeline = await buzzApiGet('/api/v1/pipeline?limit=1&sort=score_desc');
    const okx = await buzzApiGet('/api/v1/ws/okx/status');
    const btcPrice = okx?.mostRecent?.last_price || 0;

    let tweet;

    if (pipeline?.tokens?.length > 0 && pipeline.tokens[0].score && pipeline.tokens[0].score >= 70) {
      const t = pipeline.tokens[0];
      tweet = `\u{1F41D} BUZZ ALPHA: $${t.ticker || 'TOKEN'} scored ${t.score}/100\n\n` +
        `Stage: ${t.stage || '?'}\n` +
        `Chain: ${t.chain}\n\n` +
        `Tag @BuzzBySolCex scan ${t.ticker || t.address?.slice(0,8)} for the full report.\n\n` +
        `\u{1F48E} CEX listing: DM @HidayahAnka1\n` +
        `#AIAgent #SolCex #BuzzAgent #CryptoAlpha`;
    } else {
      // Market snapshot fallback
      const stats = await buzzApiGet('/api/v1/pipeline/stats') || {};
      tweet = `\u{1F41D} BUZZ MARKET PULSE\n\n` +
        `BTC: $${btcPrice ? Math.round(btcPrice).toLocaleString() : '?'}\n` +
        `Tokens in pipeline: ${stats.total || '?'}\n\n` +
        `Scanning 24/7 with 10 AI agents.\n` +
        `Tag @BuzzBySolCex scan $TICKER for instant analysis.\n\n` +
        `#AIAgent #CryptoAlpha #BuzzAgent #SolCex`;
    }

    const result = await postOriginalTweet(tweet);
    if (result && result.status === 201) {
      markPosted('alpha');
      log('\u2705 Alpha alert posted');
    } else {
      log('\u274C Alpha alert failed: ' + JSON.stringify(result?.data || '').slice(0, 200));
    }
  } catch (err) {
    log('\u274C Alpha alert error: ' + err.message);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. PIPELINE REPORT — daily at 12:00 UTC
// ══════════════════════════════════════════════════════════════════════════════

async function postPipelineReport() {
  if (!canPost('pipeline', 22)) { log('Pipeline report: too soon, skip'); return; }

  try {
    const stats = await buzzApiGet('/api/v1/pipeline/stats') || {};
    const okx = await buzzApiGet('/api/v1/ws/okx/status');
    const btcPrice = okx?.mostRecent?.last_price || 0;

    // Count by score tiers from by_stage data
    const byStage = stats.by_stage || {};
    const scored = byStage.scored || {};
    const discovered = byStage.discovered || {};

    const tweet = `\u{1F41D} PIPELINE REPORT\n\n` +
      `\u{1F525} Total tokens: ${stats.total || 0}\n` +
      `\u2705 Added (24h): ${stats.added_24h || 0}\n` +
      `\u{1F440} Chains: ${(stats.by_chain || []).map(c => c.chain).join(', ') || '?'}\n\n` +
      `BTC: $${btcPrice ? Math.round(btcPrice).toLocaleString() : '?'}\n` +
      `10 AI agents scanning 24/7.\n` +
      `Infra: $4.09/mo\n\n` +
      `#BuildInPublic #AIAgent #SolCex #BuzzAgent`;

    const result = await postOriginalTweet(tweet);
    if (result && result.status === 201) {
      markPosted('pipeline');
      log('\u2705 Pipeline report posted');
    } else {
      log('\u274C Pipeline report failed: ' + JSON.stringify(result?.data || '').slice(0, 200));
    }
  } catch (err) {
    log('\u274C Pipeline report error: ' + err.message);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. INTELLIGENCE THREAD — Tue & Fri 14:00 UTC
// ══════════════════════════════════════════════════════════════════════════════

async function postIntelligenceThread() {
  if (!canPost('intelligence', 60)) { log('Intelligence: too soon, skip'); return; }

  const topics = [
    `\u{1F41D} HOW BUZZ SCORES TOKENS:\n\n10 AI agents run in parallel.\nL1: Scanner finds token\nL2: Safety + Wallet verify\nL3: Social checks community\nL4: Scorer computes 100-pt score\nL5: 4 Hedge Brain personas debate\n\nResult in 10 seconds.\nTag @BuzzBySolCex scan any token.\n\n#AIAgent #CryptoAlpha #SolCex`,
    `\u{1F41D} WHY 10 AGENTS > 1 MODEL:\n\nMost bots use 1 LLM call.\nBuzz uses 10 specialized agents:\n\n\u{1F50D} Scanner - finds pairs\n\u{1F6E1}\uFE0F Safety - rug detection\n\u{1F4B0} Wallet - holder analysis\n\u{1F310} Social - community check\n\u{1F3AF} Scorer - 100pt composite\n\u{1F9E0} 4x Hedge Brain - debate\n\nMore agents = fewer blind spots.\n\n#AIAgent #SolCex`,
    `\u{1F41D} BUZZ INFRA BREAKDOWN:\n\nHetzner CX23: $4.09/mo\nDocker container: 1 vCPU / 4GB RAM\n91 API endpoints\n43 database tables\nOKX WebSocket: live BTC feed\n\nRunning an AI agent doesn't need GPUs.\nSmart architecture > brute force.\n\n#BuildInPublic #AIAgent #SolCex`,
    `\u{1F41D} WHAT IS HEDGE BRAIN?\n\n4 AI personas debate every token:\n\n\u{1F4C8} Bull - finds upside\n\u{1F4C9} Bear - spots risk\n\u{1F50D} Analyst - checks data\n\u26A0\uFE0F Skeptic - challenges all\n\nThey vote independently.\nConsensus = high confidence.\nSplit = uncertainty flag.\n\nTag @BuzzBySolCex scan to see it work.\n\n#AIAgent #SolCex`,
    `\u{1F41D} SOLCEX EXCHANGE VISION:\n\nSolana-native CEX for vetted tokens only.\n\nEvery token must pass Buzz's 10-agent scan.\nNo pay-to-list. Merit only.\n\nPipeline: Discovered > Scanned > Scored > Listed\n\nDM @HidayahAnka1 for listing inquiries.\n\n#SolCex #Solana #CEX`,
    `\u{1F41D} AUTONOMOUS DEPLOY:\n\nSay "deploy" to @BuzzBySolCex.\nProvide name + symbol.\nBuzz deploys via @bankrbot on Base.\n\n\u26A1 No wallet connection needed\n\u26A1 Auto LP seeded\n\u26A1 50/50 fee split\n\u26A1 Live in ~2 minutes\n\nThe bot handles everything.\n\n#Bankr #Base #TokenLaunch`,
    `\u{1F41D} SAFETY SCORING EXPLAINED:\n\nBuzz checks these red flags:\n\n\u274C Mint authority still active\n\u274C Freeze authority enabled\n\u274C LP not burned\n\u274C Top holder > 20%\n\u274C Honeypot detection\n\u274C Rugcheck score\n\nAll automated. No human bias.\nTag @BuzzBySolCex scan any CA.\n\n#CryptoSafety #AIAgent #SolCex`,
    `\u{1F41D} BUZZ vs TRADITIONAL SCANNERS:\n\nTraditional: 1 check, pass/fail\nBuzz: 10 agents, 100-point score\n\nTraditional: static rules\nBuzz: AI reasoning + debate\n\nTraditional: minutes\nBuzz: 10 seconds\n\nTraditional: paid API\nBuzz: free via Twitter mention\n\n#AIAgent #CryptoAlpha #SolCex`,
    `\u{1F41D} THE $4.09 CHALLENGE:\n\nCan you run a production AI agent for less than a coffee?\n\nBuzz proves yes:\n- Hetzner CX23 ARM: $4.09/mo\n- Docker + SQLite: $0\n- Claude API: pay per call\n- No GPU needed\n\n10 agents. 91 endpoints. 43 tables.\nAll on one tiny VPS.\n\n#BuildInPublic #Frugal #AIAgent`,
    `\u{1F41D} WHAT'S NEXT FOR BUZZ:\n\n\u2705 Phase 0: Core pipeline (DONE)\n\u{1F6E0}\uFE0F Phase 1: Learning loop\n\u{1F4CA} Phase 2: Skill self-improvement\n\u{1F4DE} Phase 3: Contact intelligence\n\u{1F680} Phase 4: SolCex launch\n\nBuilding in public with @AnthropicAI Claude.\nFollow @BuzzBySolCex for updates.\n\n#Roadmap #AIAgent #SolCex`
  ];

  try {
    // Load rotation index
    let rotation;
    try { rotation = JSON.parse(fs.readFileSync(ROTATION_FILE, 'utf8')); }
    catch { rotation = { index: 0 }; }

    const topic = topics[rotation.index % topics.length];
    const result = await postOriginalTweet(topic);

    if (result && result.status === 201) {
      rotation.index = (rotation.index + 1) % topics.length;
      fs.writeFileSync(ROTATION_FILE, JSON.stringify(rotation));
      markPosted('intelligence');
      log(`\u2705 Intelligence thread posted (topic ${rotation.index}/${topics.length})`);
    } else {
      log('\u274C Intelligence thread failed: ' + JSON.stringify(result?.data || '').slice(0, 200));
    }
  } catch (err) {
    log('\u274C Intelligence thread error: ' + err.message);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 4. BUILD UPDATE — Wed & Sat 15:00 UTC
// ══════════════════════════════════════════════════════════════════════════════

async function postBuildUpdate() {
  if (!canPost('build', 60)) { log('Build update: too soon, skip'); return; }

  try {
    const health = await buzzApiGet('/api/v1/health') || {};
    const okx = await buzzApiGet('/api/v1/ws/okx/status') || {};

    // Calculate sprint day (started March 1, 2026)
    const sprintDay = Math.floor((Date.now() - new Date('2026-03-01').getTime()) / 86400000);

    const tweet = `\u{1F41D} SPRINT DAY ${sprintDay}:\n\n` +
      `System: ${health.endpoints || '?'} endpoints | ${health.checks?.database?.tables || '?'} tables\n` +
      `WebSocket: ${(okx.messageCount || 0).toLocaleString()} OKX updates\n` +
      `Agents: 10 online\n` +
      `Infra: $4.09/mo Hetzner CX23\n\n` +
      `Built by @hidayahanka1 with @AnthropicAI Claude.\n\n` +
      `#BuildInPublic #AIAgent #ChefWhoCodes #SolCex`;

    const result = await postOriginalTweet(tweet);
    if (result && result.status === 201) {
      markPosted('build');
      log(`\u2705 Build update posted (day ${sprintDay})`);
    } else {
      log('\u274C Build update failed: ' + JSON.stringify(result?.data || '').slice(0, 200));
    }
  } catch (err) {
    log('\u274C Build update error: ' + err.message);
  }
}



// ══════════════════════════════════════════════════════════════════════════════
// STARTUP
// ══════════════════════════════════════════════════════════════════════════════

log(`════════════════════════════════════════════════`);
log(`  🐝 Twitter Bot v3.1-final`);
log(`  Routes: SCAN (Premium 5-Layer) | LIST | DEPLOY | TOKEN_DETAILS`);
log(`  Premium format: 4000 chars | Bankr autonomous deploy`);
log(`  Interval: ${CHECK_INTERVAL_MS / 60000} min | Max: ${MAX_REPLIES_DAY}/day`);
log(`════════════════════════════════════════════════`);

// Validate env
if (!X_BEARER_TOKEN) log('⚠️  X_BEARER_TOKEN not set');
if (!X_API_KEY)      log('⚠️  X_API_KEY not set');
if (!BOT_USER_ID)    log('⚠️  X_BOT_USER_ID not set — mentions fetch disabled');
if (!BANKR_PARTNER_KEY) log('⚠️  BANKR_PARTNER_KEY not set — deploy will fail');

// Initial run then loop
(async () => {
  await runLoop();
  setInterval(runLoop, CHECK_INTERVAL_MS);

// ── Proactive Tweet Schedule ────────────────────────────────────────────────
const ONE_HOUR = 60 * 60 * 1000;

// Alpha alert: every 6h (at :05 past to avoid exact hour collisions)
setInterval(() => {
  const h = new Date().getUTCHours();
  if ([0, 6, 12, 18].includes(h)) postAlphaAlert();
}, ONE_HOUR);

// Pipeline report: daily at 12:00 UTC
setInterval(() => {
  const h = new Date().getUTCHours();
  if (h === 12) postPipelineReport();
}, ONE_HOUR);

// Intelligence thread: Tue (2) & Fri (5) at 14:00 UTC
setInterval(() => {
  const d = new Date();
  if ([2, 5].includes(d.getUTCDay()) && d.getUTCHours() === 14) postIntelligenceThread();
}, ONE_HOUR);

// Build update: Wed (3) & Sat (6) at 15:00 UTC
setInterval(() => {
  const d = new Date();
  if ([3, 6].includes(d.getUTCDay()) && d.getUTCHours() === 15) postBuildUpdate();
}, ONE_HOUR);

log('\u{1F4E2} Proactive tweet schedule active (alpha/pipeline/intelligence/build)');

})();
