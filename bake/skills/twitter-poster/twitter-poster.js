/**
 * twitter-poster.js — Buzz BD Agent Twitter/X Integration
 * X API v2 | Pay-Per-Use | OAuth 1.0a
 *
 * Capabilities:
 *   - Post tweets ($0.01/post)
 *   - Post threads ($0.01 × tweets)
 *   - Read mentions ($0.005/read)
 *   - Search tweets
 *   - Reply to tweets
 *
 * Flow: Buzz drafts → Telegram approval → Post via API
 *
 * Buzz BD Agent | SolCex Exchange | Source #15: X API v2
 */

const crypto = require('crypto');
const https = require('https');
const fs = require('fs');
const path = require('path');

// ─── CONFIG ─────────────────────────────────────────────
const CONFIG = {
  apiKey: process.env.X_API_KEY,
  apiSecret: process.env.X_API_SECRET,
  accessToken: process.env.X_ACCESS_TOKEN,
  accessTokenSecret: process.env.X_ACCESS_TOKEN_SECRET,
  bearerToken: process.env.X_BEARER_TOKEN,
  baseUrl: 'api.x.com',
  // Rate limiting
  maxTweetsPerDay: 50,
  maxReadsPerDay: 200,
  // Paths
  draftsDir: '/data/workspace/twitter/drafts/',
  logsDir: '/data/workspace/twitter/logs/',
  statsFile: '/data/workspace/twitter/stats.json',
};

// Ensure directories exist
[CONFIG.draftsDir, CONFIG.logsDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ─── DAILY STATS TRACKER ────────────────────────────────
function getStats() {
  try {
    const stats = JSON.parse(fs.readFileSync(CONFIG.statsFile, 'utf-8'));
    const today = new Date().toISOString().split('T')[0];
    if (stats.date !== today) {
      return { date: today, tweetsPosted: 0, readsUsed: 0, costEstimate: 0 };
    }
    return stats;
  } catch {
    return { date: new Date().toISOString().split('T')[0], tweetsPosted: 0, readsUsed: 0, costEstimate: 0 };
  }
}

function updateStats(type) {
  const stats = getStats();
  if (type === 'write') {
    stats.tweetsPosted++;
    stats.costEstimate += 0.01;
  } else if (type === 'read') {
    stats.readsUsed++;
    stats.costEstimate += 0.005;
  }
  fs.writeFileSync(CONFIG.statsFile, JSON.stringify(stats, null, 2));
  return stats;
}

// ─── OAUTH 1.0a SIGNATURE ──────────────────────────────
function percentEncode(str) {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/\*/g, '%2A')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29');
}

function generateOAuthSignature(method, url, params, consumerSecret, tokenSecret) {
  const sortedParams = Object.keys(params).sort()
    .map(k => `${percentEncode(k)}=${percentEncode(params[k])}`)
    .join('&');

  const baseString = [
    method.toUpperCase(),
    percentEncode(url),
    percentEncode(sortedParams),
  ].join('&');

  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;
  return crypto.createHmac('sha1', signingKey).update(baseString).digest('base64');
}

function getOAuthHeader(method, urlStr) {
  const urlObj = new URL(urlStr);
  const baseUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;

  const oauthParams = {
    oauth_consumer_key: CONFIG.apiKey,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: CONFIG.accessToken,
    oauth_version: '1.0',
  };

  const allParams = { ...oauthParams };
  urlObj.searchParams.forEach((value, key) => {
    allParams[key] = value;
  });

  oauthParams.oauth_signature = generateOAuthSignature(
    method, baseUrl, allParams, CONFIG.apiSecret, CONFIG.accessTokenSecret
  );

  const headerString = Object.keys(oauthParams)
    .sort()
    .map(k => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`)
    .join(', ');

  return `OAuth ${headerString}`;
}

// ─── HTTP REQUEST HELPER ────────────────────────────────
function apiRequest(method, url, body = null) {
  return new Promise((resolve, reject) => {
    const authHeader = getOAuthHeader(method, url);
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method,
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'User-Agent': 'BuzzBDAgent/6.2.0',
      },
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) {
            const err = new Error(`X API ${res.statusCode}: ${JSON.stringify(parsed)}`);
            err.statusCode = res.statusCode;
            err.response = parsed;
            reject(err);
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(new Error(`X API parse error: ${e.message} | Raw: ${data.slice(0, 200)}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('X API timeout (15s)')); });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function bearerRequest(method, url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method,
      headers: {
        'Authorization': `Bearer ${CONFIG.bearerToken}`,
        'User-Agent': 'BuzzBDAgent/6.2.0',
      },
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) reject(new Error(`X API ${res.statusCode}: ${JSON.stringify(parsed)}`));
          else resolve(parsed);
        } catch (e) { reject(new Error(`X API parse: ${e.message}`)); }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('X API timeout')); });
    req.end();
  });
}

// ─── CORE API FUNCTIONS ─────────────────────────────────

/**
 * Post a single tweet
 * Cost: $0.01
 * @param {string} text - Tweet text (max 280 chars)
 * @param {string|null} replyToId - Tweet ID to reply to
 * @returns {Object} { data: { id, text } }
 */
async function postTweet(text, replyToId = null) {
  const stats = getStats();
  if (stats.tweetsPosted >= CONFIG.maxTweetsPerDay) {
    throw new Error(`Daily tweet limit reached (${CONFIG.maxTweetsPerDay}). Reset at midnight UTC.`);
  }
  if (text.length > 280) {
    throw new Error(`Tweet too long: ${text.length}/280 chars`);
  }
  if (!CONFIG.apiKey || !CONFIG.accessToken) {
    throw new Error('X API credentials not configured. Set X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET');
  }

  const url = 'https://api.x.com/2/tweets';
  const body = { text };
  if (replyToId) {
    body.reply = { in_reply_to_tweet_id: replyToId };
  }

  const result = await apiRequest('POST', url, body);
  updateStats('write');
  logAction('tweet', { id: result.data?.id, text: text.slice(0, 100), replyTo: replyToId });
  return result;
}

/**
 * Post a thread (array of tweet texts)
 * Cost: $0.01 × number of tweets
 * @param {string[]} tweets - Array of tweet texts
 * @returns {Object[]} Array of tweet results
 */
async function postThread(tweets) {
  if (!Array.isArray(tweets) || tweets.length < 2) {
    throw new Error('Thread must have at least 2 tweets');
  }
  if (tweets.length > 10) {
    throw new Error('Thread max 10 tweets to avoid spam perception');
  }

  const results = [];
  let lastTweetId = null;

  for (let i = 0; i < tweets.length; i++) {
    const result = await postTweet(tweets[i], lastTweetId);
    results.push(result);
    lastTweetId = result.data?.id;
    if (i < tweets.length - 1) {
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  return results;
}

/**
 * Get authenticated user info
 * @returns {Object} { data: { id, name, username } }
 */
async function getMe() {
  const url = 'https://api.x.com/2/users/me';
  const result = await apiRequest('GET', url);
  return result;
}

/**
 * Get mentions of @BuzzBySolCex
 * Cost: $0.005 per tweet read
 * @param {string|null} sinceId - Only get mentions after this tweet ID
 * @returns {Object} { data: [...tweets], meta: { ... } }
 */
async function getMentions(sinceId = null) {
  const me = await getMe();
  const userId = me.data?.id;
  if (!userId) throw new Error('Could not get user ID');

  let url = `https://api.x.com/2/users/${userId}/mentions?max_results=10&tweet.fields=created_at,author_id,conversation_id`;
  if (sinceId) url += `&since_id=${sinceId}`;

  const result = await apiRequest('GET', url);
  updateStats('read');
  return result;
}

/**
 * Search recent tweets (7-day window)
 * @param {string} query - Search query
 * @param {number} maxResults - Max results (10-100)
 * @returns {Object} { data: [...tweets] }
 */
async function searchTweets(query, maxResults = 10) {
  const url = `https://api.x.com/2/tweets/search/recent?query=${encodeURIComponent(query)}&max_results=${maxResults}&tweet.fields=created_at,author_id,public_metrics`;
  const result = await bearerRequest('GET', url);
  updateStats('read');
  return result;
}

/**
 * Delete a tweet (for cleanup)
 * @param {string} tweetId
 */
async function deleteTweet(tweetId) {
  const url = `https://api.x.com/2/tweets/${tweetId}`;
  return apiRequest('DELETE', url);
}

// ─── TELEGRAM APPROVAL FLOW ─────────────────────────────

/**
 * Queue a tweet draft for Telegram approval
 * @param {string|string[]} content - Tweet text or array for thread
 * @param {string} type - 'single' | 'thread' | 'scan_report'
 * @param {Object} metadata - Extra context
 * @returns {Object} Draft object with ID
 */
function queueDraft(content, type = 'single', metadata = {}) {
  const draft = {
    id: crypto.randomBytes(4).toString('hex'),
    content,
    type,
    metadata,
    status: 'pending_approval',
    createdAt: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(CONFIG.draftsDir, `${draft.id}.json`),
    JSON.stringify(draft, null, 2)
  );

  console.log(`[TWITTER] Draft ${draft.id} queued (${type}) — awaiting Telegram approval`);
  return draft;
}

/**
 * Approve and post a draft
 * @param {string} draftId
 * @returns {Object} Post result
 */
async function approveDraft(draftId) {
  const draftPath = path.join(CONFIG.draftsDir, `${draftId}.json`);
  if (!fs.existsSync(draftPath)) throw new Error(`Draft ${draftId} not found`);

  const draft = JSON.parse(fs.readFileSync(draftPath, 'utf-8'));
  if (draft.status !== 'pending_approval') throw new Error(`Draft ${draftId} status: ${draft.status}`);

  let result;
  if (draft.type === 'thread' && Array.isArray(draft.content)) {
    result = await postThread(draft.content);
  } else {
    result = await postTweet(typeof draft.content === 'string' ? draft.content : draft.content[0]);
  }

  draft.status = 'posted';
  draft.postedAt = new Date().toISOString();
  draft.result = result;
  fs.writeFileSync(draftPath, JSON.stringify(draft, null, 2));

  return result;
}

/**
 * Reject a draft
 * @param {string} draftId
 * @param {string} reason
 */
function rejectDraft(draftId, reason = '') {
  const draftPath = path.join(CONFIG.draftsDir, `${draftId}.json`);
  if (!fs.existsSync(draftPath)) throw new Error(`Draft ${draftId} not found`);

  const draft = JSON.parse(fs.readFileSync(draftPath, 'utf-8'));
  draft.status = 'rejected';
  draft.rejectedAt = new Date().toISOString();
  draft.rejectionReason = reason;
  fs.writeFileSync(draftPath, JSON.stringify(draft, null, 2));
}

/**
 * List pending drafts
 * @returns {Object[]} Array of pending drafts
 */
function listPendingDrafts() {
  if (!fs.existsSync(CONFIG.draftsDir)) return [];
  return fs.readdirSync(CONFIG.draftsDir)
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(fs.readFileSync(path.join(CONFIG.draftsDir, f), 'utf-8')))
    .filter(d => d.status === 'pending_approval')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// ─── LOGGING ────────────────────────────────────────────
function logAction(action, data) {
  const entry = {
    action,
    timestamp: new Date().toISOString(),
    ...data,
  };
  const logFile = path.join(CONFIG.logsDir, `${new Date().toISOString().split('T')[0]}.jsonl`);
  fs.appendFileSync(logFile, JSON.stringify(entry) + '\n');
}

// ─── HEALTH CHECK ───────────────────────────────────────
async function healthCheck() {
  const checks = {
    credentials: !!(CONFIG.apiKey && CONFIG.apiSecret && CONFIG.accessToken && CONFIG.accessTokenSecret),
    bearerToken: !!CONFIG.bearerToken,
    stats: getStats(),
    pendingDrafts: listPendingDrafts().length,
  };

  if (checks.credentials) {
    try {
      const me = await getMe();
      checks.authenticated = true;
      checks.username = me.data?.username;
    } catch (e) {
      checks.authenticated = false;
      checks.authError = e.message;
    }
  }

  return checks;
}

// ─── EXPORTS ────────────────────────────────────────────
module.exports = {
  postTweet,
  postThread,
  deleteTweet,
  getMe,
  getMentions,
  searchTweets,
  queueDraft,
  approveDraft,
  rejectDraft,
  listPendingDrafts,
  healthCheck,
  getStats,
};
