/**
 * AIXBT Intel Scraper — Intel Source #34
 * Scrapes @aixbt_agent via twitterapi.io for narrative signals
 * Feature flag: AIXBT_INTEL
 * PULSE priority 7c: every 240 ticks (~4h)
 * Cost: ~$0.54/month at 6 scrapes/day × 20 tweets
 */

const { getDB } = require("../db");
const { feature } = require("../lib/feature-flags");

const AIXBT_USERNAME = "aixbt_agent";

// Known crypto tokens for bare-name matching
const KNOWN_TOKENS = [
  "SOL",
  "BTC",
  "ETH",
  "PEPE",
  "WIF",
  "BONK",
  "JUP",
  "ONDO",
  "RENDER",
  "FET",
  "TAO",
  "AR",
  "INJ",
  "TIA",
  "SUI",
  "SEI",
  "APT",
  "AVAX",
  "NEAR",
  "STX",
  "PYTH",
  "BOME",
  "POPCAT",
  "DOGE",
  "SHIB",
  "LINK",
  "AAVE",
  "UNI",
];

const BULLISH_WORDS = [
  "bullish",
  "buy",
  "accumulate",
  "breakout",
  "surge",
  "pump",
  "moon",
  "strong",
  "upside",
  "long",
  "conviction",
  "gem",
  "breaking out",
  "outperform",
  "undervalued",
  "rally",
  "accumulation",
  "support holding",
  "higher low",
  "green",
];

const BEARISH_WORDS = [
  "bearish",
  "sell",
  "dump",
  "crash",
  "weak",
  "avoid",
  "risk",
  "short",
  "exit",
  "caution",
  "warning",
  "declining",
  "overvalued",
  "resistance",
  "breakdown",
  "rug",
  "scam",
  "lower high",
  "red flag",
];

/**
 * Fetch tweets from @aixbt_agent via twitterapi.io
 */
async function fetchTweets(limit = 20) {
  let apiKey = process.env.TWITTERAPI_IO_KEY;
  // Fallback: read from .env file if not in process.env
  if (!apiKey) {
    try {
      const fs = require("fs");
      const envPaths = ["/opt/buzz-api/.env", "/data/buzz-api/.env"];
      for (const p of envPaths) {
        if (fs.existsSync(p)) {
          const content = fs.readFileSync(p, "utf-8");
          const match = content.match(/TWITTERAPI_IO_KEY=(.+)/);
          if (match) {
            apiKey = match[1].trim();
            break;
          }
        }
      }
    } catch {
      /* ignore */
    }
  }
  if (!apiKey) {
    throw new Error("TWITTERAPI_IO_KEY not set — cannot scrape AIXBT");
  }

  const url = `https://api.twitterapi.io/twitter/user/last_tweets?userName=${AIXBT_USERNAME}&count=${limit}`;
  const response = await fetch(url, {
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(
      `twitterapi.io error: ${response.status} ${response.statusText}`,
    );
  }

  const data = await response.json();
  // twitterapi.io wraps in { data: { tweets: [...] } }
  const tweets = data?.data?.tweets || data?.tweets || [];
  return tweets;
}

/**
 * Parse a single tweet into a structured signal
 */
function parseTweet(tweet) {
  const text = tweet.text || "";
  const textLower = text.toLowerCase();

  // Extract $TICKER mentions
  const tickerRe = /\$([A-Z]{2,10})\b/g;
  const tickers = new Set();
  let match;
  while ((match = tickerRe.exec(text)) !== null) {
    tickers.add(match[1]);
  }

  // Also match known token names (bare, case-insensitive)
  for (const token of KNOWN_TOKENS) {
    if (new RegExp(`\\b${token}\\b`, "i").test(text)) {
      tickers.add(token);
    }
  }

  // Sentiment classification (rule-based, zero LLM cost)
  const bullScore = BULLISH_WORDS.filter((w) => textLower.includes(w)).length;
  const bearScore = BEARISH_WORDS.filter((w) => textLower.includes(w)).length;

  let sentiment = "NEUTRAL";
  if (bullScore > bearScore) sentiment = "BULLISH";
  else if (bearScore > bullScore) sentiment = "BEARISH";

  // Extract confidence % if mentioned
  const confMatch = text.match(/(\d{1,3})%/);
  const scaleMatch = text.match(/(\d+)\/10/);
  const confidence = confMatch
    ? confMatch[1] + "%"
    : scaleMatch
      ? scaleMatch[0]
      : null;

  // Engagement score — twitterapi.io uses flat fields
  const engagement =
    (tweet.likeCount || tweet.public_metrics?.like_count || 0) +
    (tweet.retweetCount || tweet.public_metrics?.retweet_count || 0) +
    (tweet.quoteCount || tweet.public_metrics?.quote_count || 0);

  // Narrative: first sentence or first 280 chars
  const narrative = text
    .split(/[.!?\n]/)[0]
    .trim()
    .slice(0, 280);

  // Tweet URL — twitterapi.io provides url directly
  const postUrl =
    tweet.url ||
    (tweet.id
      ? `https://x.com/${AIXBT_USERNAME}/status/${tweet.id}`
      : `https://x.com/${AIXBT_USERNAME}/status/unknown_${Date.now()}`);

  return {
    posted_at: tweet.createdAt || tweet.created_at || new Date().toISOString(),
    token_mentions: JSON.stringify([...tickers]),
    narrative_signal: narrative,
    sentiment,
    confidence_raw: confidence,
    post_url: postUrl,
    engagement_score: engagement,
  };
}

/**
 * Scrape @aixbt_agent — primary: twitterapi.io
 */
async function scrapeAixbt() {
  if (!feature("AIXBT_INTEL")) {
    return { signals: [], error: "AIXBT_INTEL disabled" };
  }

  try {
    const tweets = await fetchTweets(20);
    const signals = tweets
      .map((t) => parseTweet(t))
      .filter((s) => s.token_mentions !== "[]" || s.sentiment !== "NEUTRAL");

    return {
      signals,
      raw_count: tweets.length,
      parsed_count: signals.length,
      source: "twitterapi.io",
    };
  } catch (err) {
    return { signals: [], error: err.message, source: "twitterapi.io" };
  }
}

/**
 * Ingest scraped signals into database (dedup by post_url)
 */
function ingestSignals(signals) {
  const db = getDB();
  let inserted = 0;
  let dupes = 0;

  const stmt = db.prepare(
    `INSERT OR IGNORE INTO aixbt_signals
    (posted_at, token_mentions, narrative_signal, sentiment,
     confidence_raw, post_url, engagement_score)
    VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );

  for (const signal of signals) {
    try {
      const result = stmt.run(
        signal.posted_at,
        signal.token_mentions,
        signal.narrative_signal,
        signal.sentiment,
        signal.confidence_raw,
        signal.post_url,
        signal.engagement_score,
      );
      if (result.changes > 0) inserted++;
      else dupes++;
    } catch {
      dupes++;
    }
  }

  return { inserted, dupes, total: signals.length };
}

/**
 * Get AIXBT narrative boost for scoring pipeline
 */
function getAixbtNarrativeBoost(tokenSymbol) {
  if (!feature("AIXBT_SCORING")) {
    return { boost: 0, source: "AIXBT_SCORING_DISABLED" };
  }

  const db = getDB();
  const signals = db
    .prepare(
      `SELECT sentiment, confidence_raw, engagement_score, posted_at
       FROM aixbt_signals
       WHERE token_mentions LIKE ?
       AND posted_at > datetime('now', '-24 hours')
       AND processed = 0
       ORDER BY posted_at DESC
       LIMIT 5`,
    )
    .all(`%${tokenSymbol.toUpperCase()}%`);

  if (!signals.length) return { boost: 0, source: "none", signals_count: 0 };

  let boost = 0;
  for (const s of signals) {
    const engWeight = Math.min((s.engagement_score || 0) / 1000, 2);
    if (s.sentiment === "BULLISH") boost += 3 + engWeight;
    if (s.sentiment === "BEARISH") boost -= 5 + engWeight;
  }

  // Cap total boost
  boost = Math.max(-15, Math.min(10, boost));

  return {
    boost: Math.round(boost * 10) / 10,
    source: "AIXBT_NARRATIVE",
    signals_count: signals.length,
    latest_sentiment: signals[0].sentiment,
  };
}

/**
 * Full scrape + ingest pipeline (called by PULSE 7c and manual trigger)
 */
async function runScrapeAndIngest() {
  const scrapeResult = await scrapeAixbt();
  if (scrapeResult.error) {
    return { success: false, error: scrapeResult.error };
  }

  const ingestResult = ingestSignals(scrapeResult.signals);

  return {
    success: true,
    scraped: scrapeResult.raw_count,
    parsed: scrapeResult.parsed_count,
    inserted: ingestResult.inserted,
    dupes: ingestResult.dupes,
    source: scrapeResult.source,
  };
}

module.exports = {
  scrapeAixbt,
  ingestSignals,
  getAixbtNarrativeBoost,
  runScrapeAndIngest,
  parseTweet,
  fetchTweets,
};
