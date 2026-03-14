/**
 * Twitter Brain — Autonomous BD Scanning via Serper Google Search + X API v2
 *
 * SCAN → LIST → DEPLOY funnel:
 *   Tier 1: Free scanning (Serper site:x.com Google search) → keyword monitoring
 *   Tier 2: X API v2 search fallback (pay-per-use) → when Serper returns nothing
 *   Tier 3: Writes (X API pay-per-use) → BD outreach replies
 *
 * Runs every 2 hours via twitter-brain-scan cron (12x/day).
 * Filters results (L1-L10 rules), extracts contracts, routes to pipeline.
 * Generates reply queue for autonomous outreach (12/day max).
 *
 * Buzz BD Agent v7.4.1 | Sprint Day 26
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const OAuth = require('/opt/buzz-api/node_modules/oauth-1.0a/oauth-1.0a.js');

// ─── Config ─────────────────────────────────────────
const TWITTER_BRAIN_ENABLED = process.env.TWITTER_BRAIN_ENABLED === 'true';
const MAX_REPLIES_DAY = parseInt(process.env.TWITTER_BRAIN_MAX_REPLIES || '12', 10);
const SPENDING_CAP = parseInt(process.env.TWITTER_BRAIN_SPENDING_CAP || '100', 10);
const TWEET_AUTO = process.env.TWEET_AUTO === 'true';
const RATE_LIMIT_DELAY_MS = 30000; // 30s between replies
const DEPLOY_CAP_DAY = 3;

// X API credentials
const X_API_BEARER = process.env.X_API_BEARER_TOKEN;
const X_API_KEY = process.env.X_API_KEY;
const X_API_SECRET = process.env.X_API_SECRET;
const X_ACCESS_TOKEN = process.env.X_ACCESS_TOKEN;
const X_ACCESS_SECRET = process.env.X_ACCESS_SECRET;

// OAuth 1.0a instance for X API v2 write endpoints
const oauth = OAuth({
  consumer: { key: X_API_KEY || '', secret: X_API_SECRET || '' },
  signature_method: 'HMAC-SHA1',
  hash_function(baseString, key) {
    return crypto.createHmac('sha1', key).update(baseString).digest('base64');
  },
});
const oauthToken = { key: X_ACCESS_TOKEN || '', secret: X_ACCESS_SECRET || '' };

/**
 * Generate OAuth 1.0a Authorization header for X API v2 write requests
 */
function getOAuthHeader(url, method) {
  const authData = oauth.authorize({ url, method }, oauthToken);
  return oauth.toHeader(authData);
}

// Serper (Tier 1 — FREE Google search)
const SERPER_API_KEY = process.env.SERPER_API_KEY;

// Data dirs
const TWITTER_DATA_DIR = process.env.TWITTER_DATA_DIR || '/data/workspace/twitter-bot';
const PIPELINE_DIR = process.env.PIPELINE_DIR || '/data/workspace/memory/pipeline';
const RECEIPTS_DIR = process.env.RECEIPTS_DIR || '/data/workspace/memory/receipts';

// ─── BD Keywords (Section 3 — SCAN layer) ───────────
const SCAN_KEYWORDS = [
  'looking for CEX listing',
  'need exchange listing',
  'listing partnership',
  'token launch Base',
  'deploy token',
  'new token project team',
  '$5M mcap DEX only',
  'just launched Solana',
  'just launched Base',
  'just launched BSC',
];

// ─── Contract Address Patterns ──────────────────────
const CONTRACT_PATTERNS = [
  // Solana: base58, 32-44 chars
  /\b([1-9A-HJ-NP-Za-km-z]{32,44})\b/g,
  // EVM: 0x + 40 hex chars
  /\b(0x[a-fA-F0-9]{40})\b/g,
];

// DexScreener link pattern
const DEXSCREENER_PATTERN = /dexscreener\.com\/(\w+)\/(0x[a-fA-F0-9]{40}|[1-9A-HJ-NP-Za-km-z]{32,44})/gi;
const COINGECKO_PATTERN = /coingecko\.com\/(?:en\/)?coins?\/([\w-]+)/gi;

// ─── Filter Rules (L1-L10) ─────────────────────────
const MIN_FOLLOWERS = 500;
const MAX_ACCOUNT_AGE_MONTHS = 6;

/**
 * Main scan function — called by cron every 2 hours
 * Returns scan results with discovered tokens and reply queue
 */
async function runTwitterBrainScan({ requestId, db } = {}) {
  if (!TWITTER_BRAIN_ENABLED) {
    return { status: 'disabled', message: 'TWITTER_BRAIN_ENABLED is not true' };
  }

  const scanStart = Date.now();
  const scanId = requestId || `TB-${Date.now()}`;
  console.log(`[${scanId}] 🧠 Twitter Brain: Starting scan cycle`);

  const results = {
    scanId,
    startedAt: new Date().toISOString(),
    keywordsScanned: 0,
    rawResults: 0,
    afterFilter: 0,
    contractsFound: 0,
    tokensRouted: 0,
    replyQueueSize: 0,
    errors: [],
  };

  try {
    // ─── Step 1: Serper Google Search (FREE) + X API v2 fallback ───
    const allTweets = await twitterBrainCombinedSearch(SCAN_KEYWORDS, scanId);
    results.keywordsScanned = SCAN_KEYWORDS.length;
    results.rawResults = allTweets.length;

    console.log(`[${scanId}] 🧠 Raw tweets: ${allTweets.length} (Serper + X API fallback)`);

    // ─── Step 2: Filter (L1-L10 rules) ───
    const filtered = filterTweets(allTweets, scanId);
    results.afterFilter = filtered.length;
    console.log(`[${scanId}] 🧠 After filter: ${filtered.length} tweets`);

    // ─── Step 3: Extract contracts ───
    const withContracts = extractContracts(filtered);
    results.contractsFound = withContracts.filter(t => t.contractAddress).length;
    console.log(`[${scanId}] 🧠 Contracts found: ${results.contractsFound}`);

    // ─── Step 4: Route to pipeline (if contract found) ───
    const routed = await routeToPipeline(withContracts, scanId, db);
    results.tokensRouted = routed.length;

    // ─── Step 5: Generate reply queue ───
    const replyQueue = generateReplyQueue(withContracts, scanId);
    results.replyQueueSize = replyQueue.length;

    // ─── Step 6: Execute autonomous replies (if TWEET_AUTO=true) ───
    if (TWEET_AUTO && replyQueue.length > 0) {
      const repliesSent = await executeReplyQueue(replyQueue, scanId);
      results.repliesSent = repliesSent;
    }

    results.completedAt = new Date().toISOString();
    results.durationMs = Date.now() - scanStart;
    results.status = 'completed';

    // ─── Step 7: JVR receipt ───
    saveJVRReceipt(results, scanId);

    // ─── Save scan history ───
    saveScanHistory(results);

    console.log(`[${scanId}] 🧠 Twitter Brain scan complete: ${results.tokensRouted} routed, ${results.replyQueueSize} queued, ${results.durationMs}ms`);

  } catch (err) {
    results.status = 'error';
    results.error = err.message;
    results.errors.push(err.message);
    console.error(`[${scanId}] 🧠 Twitter Brain error: ${err.message}`);
  }

  return results;
}

// ═════════════════════════════════════════════════════
// TIER 1: SERPER GOOGLE SEARCH (FREE)
// ═════════════════════════════════════════════════════

/**
 * Serper Google Search for Twitter/X posts (FREE — existing key)
 * Replaces non-working Grok x_search with real Google site:x.com queries
 */
async function serperTwitterSearch(keyword, scanId) {
  const response = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'X-API-Key': SERPER_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      q: `site:x.com "${keyword}"`,
      num: 10,
      tbs: 'qdr:d' // last 24 hours
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    console.log(`[${scanId}] ⚠️ Serper failed for "${keyword}": ${response.status}`);
    return [];
  }

  const data = await response.json();

  // Parse Google results for Twitter/X posts
  return (data.organic || []).map(result => {
    const handle = extractHandleFromUrl(result.link);
    const urlMatch = result.link?.match(/\/status\/(\d+)/);
    return {
      url: result.link,
      title: result.title,
      text: result.snippet || result.title || '',
      tweet_id: urlMatch ? urlMatch[1] : null,
      username: handle ? handle.replace('@', '') : null,
      display_name: handle ? handle.replace('@', '') : null,
      handle,
      contracts: extractContractsFromText(result.snippet || ''),
      source: 'serper',
      keyword,
    };
  }).filter(r => r.handle); // Must have a handle
}

function extractHandleFromUrl(url) {
  const match = url?.match(/x\.com\/([^\/]+)/);
  return match ? `@${match[1]}` : null;
}

function extractTweetIdFromUrl(url) {
  if (!url) return null;
  const match = url.match(/\/status\/(\d+)/);
  return match ? match[1] : null;
}

function extractContractsFromText(text) {
  // Solana: base58, 32-44 chars
  const solana = text.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/g) || [];
  // EVM: 0x + 40 hex chars
  const evm = text.match(/0x[a-fA-F0-9]{40}/g) || [];
  return [...solana, ...evm];
}

// ═════════════════════════════════════════════════════
// TIER 2: X API v2 SEARCH (PAY-PER-USE FALLBACK)
// ═════════════════════════════════════════════════════

/**
 * X API v2 recent search — fallback when Serper returns nothing
 */
async function xApiSearch(keyword, scanId) {
  if (!X_API_BEARER) return [];

  const query = encodeURIComponent(`"${keyword}" -is:retweet lang:en`);
  const response = await fetch(
    `https://api.x.com/2/tweets/search/recent?query=${query}&max_results=10&tweet.fields=author_id,created_at,public_metrics&expansions=author_id&user.fields=public_metrics,username`,
    {
      headers: {
        'Authorization': `Bearer ${X_API_BEARER}`
      },
      signal: AbortSignal.timeout(15000),
    }
  );

  if (!response.ok) {
    console.log(`[${scanId}] ⚠️ X API search failed for "${keyword}": ${response.status}`);
    return [];
  }

  const data = await response.json();

  return (data.data || []).map(tweet => ({
    url: `https://x.com/i/status/${tweet.id}`,
    tweet_id: tweet.id,
    text: tweet.text,
    author_id: tweet.author_id,
    username: findUsername(data.includes?.users, tweet.author_id),
    display_name: findUsername(data.includes?.users, tweet.author_id),
    handle: findHandle(data.includes?.users, tweet.author_id),
    followers_count: findFollowers(data.includes?.users, tweet.author_id),
    contracts: extractContractsFromText(tweet.text),
    source: 'x_api',
    keyword,
  }));
}

function findUsername(users, authorId) {
  if (!users || !authorId) return null;
  const user = users.find(u => u.id === authorId);
  return user?.username || null;
}

function findHandle(users, authorId) {
  const username = findUsername(users, authorId);
  return username ? `@${username}` : null;
}

function findFollowers(users, authorId) {
  if (!users || !authorId) return null;
  const user = users.find(u => u.id === authorId);
  return user?.public_metrics?.followers_count || null;
}

// ═════════════════════════════════════════════════════
// COMBINED SEARCH FLOW
// ═════════════════════════════════════════════════════

/**
 * Combined search: Serper (Tier 1) → X API v2 fallback (Tier 2) per keyword
 */
async function twitterBrainCombinedSearch(keywords, scanId) {
  if (!SERPER_API_KEY) {
    console.log(`[${scanId}] ⚠️ SERPER_API_KEY not set — Twitter Brain scan cannot run`);
    return [];
  }

  const allResults = [];

  for (const keyword of keywords) {
    try {
      // Tier 1: Serper (FREE)
      let results = await serperTwitterSearch(keyword, scanId);

      // Tier 2: X API fallback if Serper returns nothing
      if (results.length === 0 && X_API_BEARER) {
        console.log(`[${scanId}] 🔄 Serper empty for "${keyword}" — trying X API v2`);
        results = await xApiSearch(keyword, scanId);
      }

      allResults.push(...results);
    } catch (err) {
      console.log(`[${scanId}] ⚠️ Search error for "${keyword}": ${err.message}`);
    }
  }

  // Dedup by URL
  const unique = [...new Map(allResults.map(r => [r.url, r])).values()];
  return unique;
}

// ═════════════════════════════════════════════════════
// STEP 2: FILTER RULES (L1-L10)
// ═════════════════════════════════════════════════════

/**
 * Filter raw tweet results based on L1-L10 rules
 */
function filterTweets(tweets, scanId) {
  const seen = loadSeenTweets();

  return tweets.filter(tweet => {
    // L1: Must have contract address OR DexScreener/CoinGecko link
    const hasContract = hasContractOrLink(tweet.text || '');

    // L2: Must be from account with 500+ followers
    const followersOk = !tweet.followers_count || tweet.followers_count >= MIN_FOLLOWERS;

    // L3: Must NOT be a reply chain (find original project accounts)
    const isOriginal = !tweet.text?.startsWith('@') && !tweet.in_reply_to;

    // L4: Must NOT be already in pipeline (dedup)
    const isNew = !seen.has(tweet.tweet_id);

    // L5: Not a known bot/spam pattern
    const notSpam = !isSpamPattern(tweet.text || '');

    // For initial scan, require either contract or qualifying project signal
    const qualifies = hasContract || hasProjectSignal(tweet.text || '');

    if (isNew && followersOk && isOriginal && notSpam && qualifies) {
      seen.add(tweet.tweet_id);
      return true;
    }
    return false;
  });
}

/**
 * Check if text contains a contract address or DexScreener/CoinGecko link
 */
function hasContractOrLink(text) {
  if (DEXSCREENER_PATTERN.test(text)) return true;
  DEXSCREENER_PATTERN.lastIndex = 0;
  if (COINGECKO_PATTERN.test(text)) return true;
  COINGECKO_PATTERN.lastIndex = 0;

  // Check for EVM address
  if (/0x[a-fA-F0-9]{40}/.test(text)) return true;

  // Check for Solana address (base58, 32-44 chars, not a common word)
  const solanaMatch = text.match(/\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/);
  if (solanaMatch) return true;

  return false;
}

/**
 * Check if text contains qualifying project signals (even without contract)
 */
function hasProjectSignal(text) {
  const signals = [
    'CEX listing', 'exchange listing', 'listing partner',
    'deploy token', 'launch token', 'token launch',
    'mcap', 'market cap', 'liquidity',
    'dexscreener', 'coingecko', 'coinmarketcap',
  ];
  const lower = text.toLowerCase();
  return signals.some(s => lower.includes(s.toLowerCase()));
}

/**
 * Detect spam patterns
 */
function isSpamPattern(text) {
  const spamSignals = [
    'guaranteed returns', '100x guaranteed', 'send ETH to',
    'free airdrop claim', 'connect wallet to claim',
    'DM for signals', 'join telegram for',
  ];
  const lower = text.toLowerCase();
  return spamSignals.some(s => lower.includes(s.toLowerCase()));
}

// ═════════════════════════════════════════════════════
// STEP 3: CONTRACT EXTRACTION
// ═════════════════════════════════════════════════════

/**
 * Extract contract addresses from filtered tweets
 */
function extractContracts(tweets) {
  return tweets.map(tweet => {
    const text = tweet.text || '';
    let contractAddress = null;
    let chain = null;

    // Check DexScreener links first (most reliable)
    DEXSCREENER_PATTERN.lastIndex = 0;
    const dsMatch = DEXSCREENER_PATTERN.exec(text);
    if (dsMatch) {
      chain = dsMatch[1]; // solana, ethereum, base, bsc
      contractAddress = dsMatch[2];
    }

    // Check EVM address (0x...)
    if (!contractAddress) {
      const evmMatch = text.match(/\b(0x[a-fA-F0-9]{40})\b/);
      if (evmMatch) {
        contractAddress = evmMatch[1];
        // Default to base for EVM if no chain context
        chain = detectChainFromText(text) || 'base';
      }
    }

    // Check Solana address
    if (!contractAddress) {
      const solMatch = text.match(/\b([1-9A-HJ-NP-Za-km-z]{32,44})\b/);
      if (solMatch && solMatch[1].length >= 32) {
        contractAddress = solMatch[1];
        chain = 'solana';
      }
    }

    return { ...tweet, contractAddress, chain };
  });
}

/**
 * Detect chain from tweet text context
 */
function detectChainFromText(text) {
  const lower = text.toLowerCase();
  if (lower.includes('solana') || lower.includes('$sol')) return 'solana';
  if (lower.includes('base')) return 'base';
  if (lower.includes('bsc') || lower.includes('binance')) return 'bsc';
  if (lower.includes('ethereum') || lower.includes('$eth')) return 'ethereum';
  return null;
}

// ═════════════════════════════════════════════════════
// STEP 4: PIPELINE ROUTING
// ═════════════════════════════════════════════════════

/**
 * Route discovered tokens to the existing 5 sub-agent pipeline
 */
async function routeToPipeline(tweets, scanId, db) {
  const routed = [];

  for (const tweet of tweets) {
    if (!tweet.contractAddress) continue;

    try {
      // Verify via DexScreener before routing
      const dsRes = await fetch(
        `https://api.dexscreener.com/latest/dex/tokens/${tweet.contractAddress}`,
        { signal: AbortSignal.timeout(10000) }
      );

      if (!dsRes.ok) continue;
      const dsData = await dsRes.json();
      const pairs = dsData.pairs || [];

      if (pairs.length === 0) {
        console.log(`[${scanId}] ⏩ No pairs for ${tweet.contractAddress} — skipping`);
        continue;
      }

      const primaryPair = pairs.reduce((best, p) =>
        (parseFloat(p.liquidity?.usd || 0) > parseFloat(best.liquidity?.usd || 0)) ? p : best,
        pairs[0]
      );

      const liquidity = parseFloat(primaryPair.liquidity?.usd || 0);
      const volume24h = parseFloat(primaryPair.volume?.h24 || 0);

      // Filter: liquidity > $10K and volume > $5K
      if (liquidity < 10000 || volume24h < 5000) {
        console.log(`[${scanId}] ⏩ Low liq/vol for ${tweet.contractAddress}: $${liquidity}/$${volume24h}`);
        continue;
      }

      const tokenData = {
        address: tweet.contractAddress,
        chain: tweet.chain || primaryPair.chainId || 'unknown',
        symbol: primaryPair.baseToken?.symbol || null,
        name: primaryPair.baseToken?.name || null,
        liquidity,
        volume24h,
        priceUsd: primaryPair.priceUsd || null,
        mcap: primaryPair.marketCap || primaryPair.fdv || null,
        source: `twitter-brain/${tweet.source}`,
        twitterUser: tweet.username,
        tweetId: tweet.tweet_id,
        tweetUrl: tweet.url,
        discoveredAt: new Date().toISOString(),
      };

      // Save to pipeline directory
      saveToPipelineDir(tokenData);

      // Insert into DB if available
      if (db) {
        try {
          db.prepare(`
            INSERT OR IGNORE INTO pipeline_tokens
            (address, chain, ticker, name, stage, score, source, notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, 'discovered', NULL, ?, ?, ?, ?)
          `).run(
            tokenData.address,
            tokenData.chain,
            tokenData.symbol,
            tokenData.name,
            tokenData.source,
            `Twitter: @${tweet.username} | Liq: $${liquidity.toFixed(0)} | Vol24h: $${volume24h.toFixed(0)}`,
            tokenData.discoveredAt,
            tokenData.discoveredAt
          );
        } catch (dbErr) {
          // Ignore duplicate inserts
        }
      }

      routed.push(tokenData);
      console.log(`[${scanId}] ✅ Routed: ${tokenData.symbol || tokenData.address} (${tokenData.chain}) — Liq $${liquidity.toFixed(0)}`);

    } catch (err) {
      console.log(`[${scanId}] ⚠️ Route error for ${tweet.contractAddress}: ${err.message}`);
    }
  }

  return routed;
}

// ═════════════════════════════════════════════════════
// STEP 5: REPLY QUEUE GENERATION
// ═════════════════════════════════════════════════════

/**
 * Generate contextual reply queue for qualified tokens
 * Reply templates from Section 3, Layer 2
 */
function generateReplyQueue(tweets, scanId) {
  const queue = [];
  const dailyCount = getDailyReplyCount();

  if (dailyCount >= MAX_REPLIES_DAY) {
    console.log(`[${scanId}] 🧠 Reply cap reached: ${dailyCount}/${MAX_REPLIES_DAY}`);
    return queue;
  }

  const remaining = MAX_REPLIES_DAY - dailyCount;

  // Prioritize tweets with contracts and higher follower counts
  const prioritized = tweets
    .filter(t => t.contractAddress && t.username)
    .sort((a, b) => (b.followers_count || 0) - (a.followers_count || 0))
    .slice(0, remaining);

  for (const tweet of prioritized) {
    const reply = buildOutreachReply(tweet);
    if (reply) {
      // Extract tweet ID from URL if not already set
      const tweetId = tweet.tweet_id || extractTweetIdFromUrl(tweet.url);
      queue.push({
        tweetId,
        tweetUrl: tweet.url,
        username: tweet.username,
        replyText: reply,
        contractAddress: tweet.contractAddress,
        chain: tweet.chain,
        createdAt: new Date().toISOString(),
        status: 'queued',
      });
    }
  }

  console.log(`[${scanId}] 🧠 Reply queue: ${queue.length} replies generated`);
  return queue;
}

/**
 * Build contextual BD outreach reply (Section 3, Layer 2 template)
 */
function buildOutreachReply(tweet) {
  const project = tweet.username;
  const chain = tweet.chain || 'unknown';
  const chainLabel = chain.charAt(0).toUpperCase() + chain.slice(1);

  // Contextual template — varies per tweet (avoids spam flags, X TOS rule #2)
  const templates = [
    `Hey @${project} — Buzz here from @SolCex_Exchange. Your ${chainLabel} token caught our eye. We're actively listing quality projects. DM us or check solcex.io`,
    `@${project} Spotted your project. SolCex is listing ${chainLabel} tokens — fast track, real exchange, real liquidity. Details at solcex.io`,
    `@${project} We're @SolCex_Exchange — looking to list solid ${chainLabel} projects. Your token looks interesting. Let's talk — DM open or solcex.io`,
  ];

  // Select template based on tweet content hash for variety
  const hash = simpleHash(tweet.tweet_id || tweet.text || '');
  return templates[hash % templates.length];
}

/**
 * Build Bankr deploy offer reply (Section 3, Layer 3)
 */
function buildDeployReply(tweet) {
  return `Want to launch your token on Base? We deploy via @bankrbot — verified contract, instant liquidity, 1.2% swap fee split. Reply with: TokenName TICKER 'description' or DM for details`;
}

// ═════════════════════════════════════════════════════
// STEP 6: EXECUTE REPLIES (X API WRITE — pay-per-use)
// ═════════════════════════════════════════════════════

/**
 * Post replies from queue via X API v2
 * Rate limited: 30s between replies
 */
async function executeReplyQueue(queue, scanId) {
  console.log(`[TB-REPLY] executeReplyQueue called — queue: ${queue.length}, TWEET_AUTO: ${TWEET_AUTO}, hasOAuth: ${!!(X_API_KEY && X_API_SECRET && X_ACCESS_TOKEN && X_ACCESS_SECRET)}`);

  if (!X_API_KEY || !X_API_SECRET || !X_ACCESS_TOKEN || !X_ACCESS_SECRET) {
    console.log(`[${scanId}] ⚠️ OAuth 1.0a credentials missing (X_API_KEY/X_API_SECRET/X_ACCESS_TOKEN/X_ACCESS_SECRET) — skipping reply execution`);
    return 0;
  }

  let sent = 0;

  for (const item of queue) {
    try {
      console.log(`[TB-REPLY] Attempting reply to @${item.username} — tweetId: ${item.tweetId || 'none'}, tweetUrl: ${item.tweetUrl || 'none'}`);
      // Try to extract tweet ID from URL if not set
      const tweetId = item.tweetId || extractTweetIdFromUrl(item.tweetUrl);
      let result;

      if (tweetId) {
        // Have tweet ID — post as reply
        result = await postReply(tweetId, item.replyText, scanId);
      } else {
        // No tweet ID — post as standalone tweet mentioning the handle
        console.log(`[${scanId}] ⚠️ No tweet ID for @${item.username} — posting standalone mention`);
        result = await postTweet(item.replyText, scanId);
      }

      if (result.success) {
        item.status = 'sent';
        item.sentAt = new Date().toISOString();
        item.responseTweetId = result.tweetId;
        item.method = tweetId ? 'reply' : 'standalone';
        sent++;
        incrementDailyReplyCount();

        // JVR receipt per reply
        saveReplyReceipt(item, scanId);

        console.log(`[${scanId}] ✅ ${tweetId ? 'Reply' : 'Standalone'} sent to @${item.username} (${tweetId ? 'tweet ' + tweetId : 'mention'})`);
      } else {
        item.status = 'failed';
        item.error = result.error;
        console.log(`[${scanId}] ❌ Reply failed for @${item.username}: ${result.error}`);
      }

      // Rate limit: 30s between replies (X TOS compliance)
      if (sent < queue.length) {
        await sleep(RATE_LIMIT_DELAY_MS);
      }
    } catch (err) {
      item.status = 'error';
      item.error = err.message;
      console.log(`[${scanId}] ❌ Reply error for @${item.username}: ${err.message}`);
      console.log(`[TB-REPLY] ❌ Reply failed for @${item.username}:`, err.message);
    }
  }

  return sent;
}

/**
 * Post a reply tweet via X API v2 (OAuth 1.0a user authentication)
 */
async function postReply(inReplyToId, text, scanId) {
  const url = 'https://api.x.com/2/tweets';
  const body = JSON.stringify({
    text,
    reply: { in_reply_to_tweet_id: inReplyToId },
  });

  console.log(`[${scanId}] 📤 postReply attempt — replying to tweet ${inReplyToId}, text: "${text.slice(0, 80)}..."`);

  try {
    const authHeader = getOAuthHeader(url, 'POST');
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        ...authHeader,
        'Content-Type': 'application/json',
      },
      body,
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.log(`[${scanId}] ❌ postReply FAILED — X API ${res.status}: ${errBody}`);
      return { success: false, error: `X API ${res.status}: ${errBody}` };
    }

    const data = await res.json();
    console.log(`[${scanId}] ✅ postReply SUCCESS — new tweet ID: ${data.data?.id}`);
    return {
      success: true,
      tweetId: data.data?.id,
    };
  } catch (err) {
    console.log(`[${scanId}] ❌ postReply ERROR — ${err.message}`);
    return { success: false, error: err.message };
  }
}

/**
 * Post a standalone tweet via X API v2 (OAuth 1.0a user authentication)
 */
async function postTweet(text, scanId) {
  if (!X_API_KEY || !X_API_SECRET || !X_ACCESS_TOKEN || !X_ACCESS_SECRET) {
    console.log(`[${scanId || 'TWEET'}] ⚠️ postTweet SKIPPED — OAuth 1.0a credentials missing`);
    return { success: false, error: 'OAuth 1.0a credentials not set (X_API_KEY/X_API_SECRET/X_ACCESS_TOKEN/X_ACCESS_SECRET)' };
  }

  const url = 'https://api.x.com/2/tweets';
  const body = JSON.stringify({ text });

  console.log(`[${scanId || 'TWEET'}] 📤 postTweet attempt — text: "${text.slice(0, 80)}..."`);

  try {
    const authHeader = getOAuthHeader(url, 'POST');
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        ...authHeader,
        'Content-Type': 'application/json',
      },
      body,
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.log(`[${scanId || 'TWEET'}] ❌ postTweet FAILED — X API ${res.status}: ${errBody}`);
      return { success: false, error: `X API ${res.status}: ${errBody}` };
    }

    const data = await res.json();
    console.log(`[${scanId || 'TWEET'}] ✅ postTweet SUCCESS — new tweet ID: ${data.data?.id}`);
    return { success: true, tweetId: data.data?.id };
  } catch (err) {
    console.log(`[${scanId || 'TWEET'}] ❌ postTweet ERROR — ${err.message}`);
    return { success: false, error: err.message };
  }
}

// ═════════════════════════════════════════════════════
// AUTONOMOUS CONTENT POSTING
// ═════════════════════════════════════════════════════

/**
 * Post scan result summary tweet (autonomous, 4x/day after each scan cycle)
 */
async function postScanSummary(results, scanId) {
  if (!TWEET_AUTO) return null;

  const { tokensRouted, afterFilter, contractsFound } = results;
  if (tokensRouted === 0) return null; // Don't tweet empty scans

  const text = `BUZZ SCAN — Found ${afterFilter} signals, ${contractsFound} contracts, ${tokensRouted} routed to pipeline. Scanning 24/7 for quality listings.\n\nsolcex.io`;

  return postTweet(text, scanId);
}

/**
 * Post daily pipeline status update (autonomous, 1x/day)
 */
async function postPipelineUpdate(stats, scanId) {
  if (!TWEET_AUTO) return null;

  const text = `PIPELINE — ${stats.active || 0} active, ${stats.qualified || 0} qualified, ${stats.hot || 0} hot. Autonomous BD running 24/7.\n\nsolcex.io`;

  return postTweet(text, scanId);
}

// ═════════════════════════════════════════════════════
// HELPERS — Persistence & State
// ═════════════════════════════════════════════════════

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function saveToPipelineDir(tokenData) {
  ensureDir(PIPELINE_DIR);
  const filename = `tb-${tokenData.chain}-${tokenData.symbol || tokenData.address.slice(0, 8)}-${Date.now()}.json`;
  fs.writeFileSync(
    path.join(PIPELINE_DIR, filename),
    JSON.stringify(tokenData, null, 2)
  );
}

function saveJVRReceipt(results, scanId) {
  ensureDir(RECEIPTS_DIR);
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const receiptId = `BZZ-TWITTER-${date}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
  const receipt = {
    id: receiptId,
    type: 'twitter-brain-scan',
    scanId,
    ...results,
    createdAt: new Date().toISOString(),
  };
  fs.writeFileSync(
    path.join(RECEIPTS_DIR, `${receiptId}.json`),
    JSON.stringify(receipt, null, 2)
  );
}

function saveReplyReceipt(replyItem, scanId) {
  ensureDir(RECEIPTS_DIR);
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const receiptId = `BZZ-TWITTER-REPLY-${date}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
  const receipt = {
    id: receiptId,
    type: 'twitter-brain-reply',
    scanId,
    ...replyItem,
    createdAt: new Date().toISOString(),
  };
  fs.writeFileSync(
    path.join(RECEIPTS_DIR, `${receiptId}.json`),
    JSON.stringify(receipt, null, 2)
  );
}

function saveScanHistory(results) {
  ensureDir(TWITTER_DATA_DIR);
  const historyFile = path.join(TWITTER_DATA_DIR, 'scan-history.json');
  let history = [];
  try {
    if (fs.existsSync(historyFile)) {
      history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
    }
  } catch {}

  history.push({
    scanId: results.scanId,
    timestamp: results.startedAt,
    rawResults: results.rawResults,
    afterFilter: results.afterFilter,
    contractsFound: results.contractsFound,
    tokensRouted: results.tokensRouted,
    repliesSent: results.repliesSent || 0,
    durationMs: results.durationMs,
    status: results.status,
  });

  // Keep last 500 entries
  if (history.length > 500) history = history.slice(-500);
  fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
}

function loadSeenTweets() {
  ensureDir(TWITTER_DATA_DIR);
  const seenFile = path.join(TWITTER_DATA_DIR, 'seen-tweets.json');
  try {
    if (fs.existsSync(seenFile)) {
      const data = JSON.parse(fs.readFileSync(seenFile, 'utf8'));
      return new Set(data);
    }
  } catch {}
  return new Set();
}

function saveSeenTweets(seen) {
  ensureDir(TWITTER_DATA_DIR);
  const seenFile = path.join(TWITTER_DATA_DIR, 'seen-tweets.json');
  // Keep last 10K tweet IDs
  const arr = [...seen].slice(-10000);
  fs.writeFileSync(seenFile, JSON.stringify(arr));
}

function getDailyReplyCount() {
  const countFile = path.join(TWITTER_DATA_DIR, 'daily-count.json');
  try {
    if (fs.existsSync(countFile)) {
      const data = JSON.parse(fs.readFileSync(countFile, 'utf8'));
      const today = new Date().toISOString().slice(0, 10);
      if (data.date === today) return data.count;
    }
  } catch {}
  return 0;
}

function incrementDailyReplyCount() {
  ensureDir(TWITTER_DATA_DIR);
  const countFile = path.join(TWITTER_DATA_DIR, 'daily-count.json');
  const today = new Date().toISOString().slice(0, 10);
  let count = 0;
  try {
    if (fs.existsSync(countFile)) {
      const data = JSON.parse(fs.readFileSync(countFile, 'utf8'));
      if (data.date === today) count = data.count;
    }
  } catch {}
  count++;
  fs.writeFileSync(countFile, JSON.stringify({ date: today, count }));
}

/**
 * Deduplicate tweets by tweet_id
 */
function deduplicateTweets(tweets) {
  const seen = new Map();
  for (const t of tweets) {
    const key = t.tweet_id || t.url || `${t.username}-${t.text?.slice(0, 50)}`;
    if (!seen.has(key)) seen.set(key, t);
  }
  return [...seen.values()];
}

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  runTwitterBrainScan,
  postTweet,
  postReply,
  postScanSummary,
  postPipelineUpdate,
  buildOutreachReply,
  buildDeployReply,
  filterTweets,
  extractContracts,
  SCAN_KEYWORDS,
  TWITTER_BRAIN_ENABLED,
  MAX_REPLIES_DAY,
  TWEET_AUTO,
};
