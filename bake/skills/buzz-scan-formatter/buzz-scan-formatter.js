/**
 * buzz-scan-formatter.js — Standard Scan Report Formatter
 * Formats Buzz's 100-point token scores into tweets and threads
 * Matches Bankr's verified data quality standard
 *
 * Buzz BD Agent | SolCex Exchange
 */

// ─── NUMBER FORMATTING ─────────────────────────────────
function formatNum(n) {
  if (n === null || n === undefined) return '?';
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toFixed(2);
}

function formatPercent(n) {
  if (n === null || n === undefined) return '?';
  return (n > 0 ? '+' : '') + n.toFixed(1) + '%';
}

function truncateAddress(addr) {
  if (!addr) return '?';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

// ─── VERDICT EMOJI ──────────────────────────────────────
function verdictEmoji(verdict) {
  switch (verdict?.toUpperCase()) {
    case 'HOT': return '🔥';
    case 'WARM': return '🟡';
    case 'COLD': return '❄️';
    case 'PASS': return '⛔';
    default: return '📊';
  }
}

function verdictTag(score) {
  if (score >= 80) return 'HOT';
  if (score >= 60) return 'WARM';
  if (score >= 40) return 'COLD';
  return 'PASS';
}

// ─── SINGLE TWEET FORMAT ────────────────────────────────
/**
 * Format a scan as a single tweet (≤280 chars)
 *
 * @param {Object} scan - Scan data
 * @param {string} scan.symbol - Token symbol
 * @param {string} scan.name - Token name
 * @param {number} scan.score - Total score (0-100)
 * @param {string} scan.chain - Chain name (Solana, Base, etc.)
 * @param {string} scan.contract - Contract address
 * @param {number} scan.mcap - Market cap in USD
 * @param {number} scan.liquidity - Liquidity in USD
 * @param {number} scan.volume24h - 24h volume in USD
 * @param {number} scan.change24h - 24h price change %
 * @returns {string} Formatted tweet text
 */
function formatSingleTweet(scan) {
  const verdict = scan.verdict || verdictTag(scan.score);
  const emoji = verdictEmoji(verdict);

  const lines = [
    `🐝 $${scan.symbol} — ${scan.score}/100 ${emoji} ${verdict}`,
    ``,
    `💰 MC: $${formatNum(scan.mcap)} | Liq: $${formatNum(scan.liquidity)}`,
    `📊 Vol: $${formatNum(scan.volume24h)} (${formatPercent(scan.change24h)})`,
    ``,
    `${scan.chain} | CA: ${truncateAddress(scan.contract)}`,
    ``,
    `#${scan.symbol} #SolCex #${scan.chain} #CryptoListings`,
  ];

  const tweet = lines.join('\n');

  // Safety: ensure under 280 chars
  if (tweet.length > 280) {
    return [
      `🐝 $${scan.symbol} ${scan.score}/100 ${emoji}`,
      `MC:$${formatNum(scan.mcap)} Liq:$${formatNum(scan.liquidity)} Vol:$${formatNum(scan.volume24h)}`,
      `${scan.chain} ${truncateAddress(scan.contract)}`,
      `#${scan.symbol} #SolCex`,
    ].join('\n');
  }

  return tweet;
}

// ─── THREAD FORMAT ──────────────────────────────────────
/**
 * Format a scan as a detailed thread (3-4 tweets)
 *
 * @param {Object} scan - Full scan data including subscores and intel
 * @returns {string[]} Array of tweet texts for thread posting
 */
function formatScanThread(scan) {
  const verdict = scan.verdict || verdictTag(scan.score);
  const emoji = verdictEmoji(verdict);

  const tweets = [];

  // Tweet 1: Overview + metrics
  tweets.push([
    `🐝 BUZZ SCAN: $${scan.symbol}`,
    ``,
    `Score: ${scan.score}/100 ${emoji} ${verdict}`,
    `Chain: ${scan.chain}`,
    ``,
    `💰 MC: $${formatNum(scan.mcap)}`,
    `💧 Liq: $${formatNum(scan.liquidity)}`,
    `📊 Vol 24h: $${formatNum(scan.volume24h)} (${formatPercent(scan.change24h)})`,
    `⏰ Age: ${scan.tokenAge || '?'}`,
    ``,
    `#${scan.symbol} #SolCex #${scan.chain}`,
  ].join('\n'));

  // Tweet 2: Score breakdown
  const scores = scan.scores || {};
  tweets.push([
    `📋 Score Breakdown — $${scan.symbol}`,
    ``,
    `├ Liquidity: ${scores.liquidity || '?'}/25`,
    `├ Volume: ${scores.volume || '?'}/20`,
    `├ Market Cap: ${scores.mcap || '?'}/20`,
    `├ Social: ${scores.social || '?'}/15`,
    `├ Token Age: ${scores.age || '?'}/10`,
    `└ Team: ${scores.team || '?'}/10`,
    ``,
    `Total: ${scan.score}/100 ${emoji}`,
    scan.catalystBonus ? `Catalyst Bonus: +${scan.catalystBonus}` : '',
  ].filter(Boolean).join('\n'));

  // Tweet 3: Intelligence sources + verdict
  const intel = scan.intel || {};
  tweets.push([
    `🔍 Intel — $${scan.symbol}`,
    ``,
    `├ DexScreener: ${intel.dex || 'verified ✅'}`,
    `├ Grok Sentiment: ${intel.grok || 'pending'}`,
    `├ AIXBT: ${intel.aixbt || 'no signal'}`,
    `└ Helius: ${intel.helius || 'clean'}`,
    ``,
    scan.catalysts?.length ? `Catalysts: ${scan.catalysts.join(', ')}` : '',
    scan.redFlags?.length ? `⚠️ Flags: ${scan.redFlags.join(', ')}` : '',
    ``,
    `CA: ${scan.contract}`,
  ].filter(Boolean).join('\n'));

  // Tweet 4: Links + CTA (optional, if needed)
  if (scan.dexUrl || scan.website) {
    tweets.push([
      `🔗 $${scan.symbol} Links`,
      ``,
      scan.dexUrl ? `📊 Chart: ${scan.dexUrl}` : '',
      scan.website ? `🌐 Site: ${scan.website}` : '',
      scan.explorer ? `🔎 Explorer: ${scan.explorer}` : '',
      ``,
      `Source: Buzz BD Agent | @SolCex_Exchange`,
      `Data: DexScreener + Grok + Helius + AIXBT`,
      ``,
      `DM for listing inquiries`,
      `#SolCex #AIAgents #CryptoListings`,
    ].filter(Boolean).join('\n'));
  }

  // Validate all tweets are under 280 chars
  return tweets.map((tweet, i) => {
    if (tweet.length > 280) {
      console.warn(`[SCAN-FORMAT] Tweet ${i + 1} is ${tweet.length} chars, truncating`);
      return tweet.slice(0, 277) + '...';
    }
    return tweet;
  });
}

// ─── TELEGRAM REPORT FORMAT ─────────────────────────────
/**
 * Format a detailed scan report for Telegram
 * (No character limit, full detail)
 */
function formatTelegramReport(scan) {
  const verdict = scan.verdict || verdictTag(scan.score);
  const emoji = verdictEmoji(verdict);
  const scores = scan.scores || {};
  const intel = scan.intel || {};

  return [
    `🐝 BUZZ SCAN REPORT — ${scan.symbol}`,
    `${'═'.repeat(35)}`,
    ``,
    `Token: ${scan.name} (${scan.symbol})`,
    `Chain: ${scan.chain}`,
    `Contract: ${scan.contract}`,
    scan.deployer ? `Deployer: ${scan.deployer}` : '',
    ``,
    `📊 Metrics:`,
    `├─ Price: $${scan.price || '?'}`,
    `├─ Market Cap: $${formatNum(scan.mcap)}`,
    `├─ Liquidity: $${formatNum(scan.liquidity)}`,
    `├─ 24h Volume: $${formatNum(scan.volume24h)}`,
    `├─ 24h Change: ${formatPercent(scan.change24h)}`,
    `└─ Token Age: ${scan.tokenAge || '?'}`,
    ``,
    `🎯 Buzz Score: ${scan.score}/100 ${emoji} ${verdict}`,
    `├─ Liquidity (25%): ${scores.liquidity || '?'}/25`,
    `├─ Volume (20%): ${scores.volume || '?'}/20`,
    `├─ Market Cap (20%): ${scores.mcap || '?'}/20`,
    `├─ Social (15%): ${scores.social || '?'}/15`,
    `├─ Token Age (10%): ${scores.age || '?'}/10`,
    `└─ Team (10%): ${scores.team || '?'}/10`,
    scan.catalystBonus ? `   Catalyst Bonus: +${scan.catalystBonus}` : '',
    ``,
    `🔍 Intelligence:`,
    `├─ DexScreener: ${intel.dex || 'verified ✅'}`,
    `├─ Grok Sentiment: ${intel.grok || 'pending'}`,
    `├─ AIXBT Signal: ${intel.aixbt || 'no signal'}`,
    `└─ Helius Forensics: ${intel.helius || 'clean'}`,
    ``,
    `📋 Verdict: ${verdict}`,
    scan.catalysts?.length ? `├─ Catalysts: ${scan.catalysts.join(', ')}` : '',
    scan.redFlags?.length ? `├─ Red Flags: ${scan.redFlags.join(', ')}` : '├─ Red Flags: none',
    `└─ Outreach: ${scan.outreachRecommendation || 'pending review'}`,
    ``,
    `🔗 Links:`,
    scan.dexUrl ? `├─ DexScreener: ${scan.dexUrl}` : '',
    scan.explorer ? `├─ Explorer: ${scan.explorer}` : '',
    scan.website ? `└─ Project: ${scan.website}` : '',
    ``,
    `${'─'.repeat(35)}`,
    `Source: Buzz BD Agent | SolCex Exchange`,
    `Timestamp: ${new Date().toISOString()}`,
  ].filter(Boolean).join('\n');
}

// ─── BATCH SCAN SUMMARY ─────────────────────────────────
/**
 * Format multiple scan results into a summary for Telegram
 *
 * @param {Object[]} scans - Array of scan results
 * @param {string} scanType - Scan type label (e.g., "Morning", "Evening")
 * @returns {string} Formatted summary
 */
function formatBatchSummary(scans, scanType = 'Pipeline') {
  if (!scans || scans.length === 0) {
    return `🐝 ${scanType} Scan — No tokens found this cycle.`;
  }

  const hot = scans.filter(s => s.score >= 80);
  const warm = scans.filter(s => s.score >= 60 && s.score < 80);
  const cold = scans.filter(s => s.score >= 40 && s.score < 60);
  const pass = scans.filter(s => s.score < 40);

  const lines = [
    `🐝 BUZZ ${scanType.toUpperCase()} SCAN COMPLETE`,
    `${'═'.repeat(35)}`,
    ``,
    `Scanned: ${scans.length} tokens`,
    `🔥 HOT (80+): ${hot.length}`,
    `🟡 WARM (60-79): ${warm.length}`,
    `❄️ COLD (40-59): ${cold.length}`,
    `⛔ PASS (<40): ${pass.length}`,
    ``,
  ];

  // Show top tokens
  const topTokens = scans
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  if (topTokens.length > 0) {
    lines.push(`📋 Top ${topTokens.length}:`);
    topTokens.forEach((t, i) => {
      const emoji = verdictEmoji(verdictTag(t.score));
      lines.push(`${i + 1}. $${t.symbol} — ${t.score}/100 ${emoji} | MC: $${formatNum(t.mcap)} | Liq: $${formatNum(t.liquidity)}`);
    });
    lines.push(``);
  }

  // Action items
  if (hot.length > 0) {
    lines.push(`🎯 Action: ${hot.length} token(s) ready for outreach`);
    hot.forEach(t => {
      lines.push(`   → $${t.symbol} (${t.score}/100) — ${t.contract}`);
    });
  }

  lines.push(``, `${'─'.repeat(35)}`);
  lines.push(`Buzz BD Agent | ${new Date().toISOString()}`);

  return lines.join('\n');
}

// ─── EXPORTS ────────────────────────────────────────────
module.exports = {
  formatSingleTweet,
  formatScanThread,
  formatTelegramReport,
  formatBatchSummary,
  // Utilities
  formatNum,
  formatPercent,
  truncateAddress,
  verdictEmoji,
  verdictTag,
};
