/**
 * Twitter Brain Scan Cron — Runs every 2 hours (12x/day)
 *
 * Schedule: 0 * /2 * * * (every 2 hours)
 * Calls twitter-brain.js runTwitterBrainScan()
 * Logs results to JVR receipts
 * Posts scan summary tweet if TWEET_AUTO=true
 *
 * Can be invoked:
 *   1. Via OpenClaw cron scheduler (jobs.json)
 *   2. Directly via REST: POST /api/v1/twitter/brain/scan
 *   3. Standalone: node cron/twitter-brain-scan.js
 *
 * Buzz BD Agent v7.4.0 | Sprint Day 27
 */

const { runTwitterBrainScan, postScanSummary, TWITTER_BRAIN_ENABLED } = require('../services/twitter-brain');

/**
 * Execute a single Twitter Brain scan cycle
 * @param {object} opts - { db, requestId }
 * @returns {object} Scan results
 */
async function executeTwitterBrainScan({ db, requestId } = {}) {
  const scanId = requestId || `TB-CRON-${Date.now()}`;
  console.log(`[${scanId}] 🧠 Twitter Brain cron firing...`);

  if (!TWITTER_BRAIN_ENABLED) {
    console.log(`[${scanId}] ⏩ Twitter Brain disabled — TWITTER_BRAIN_ENABLED != true`);
    return { status: 'disabled', scanId };
  }

  try {
    // Run the main scan
    const results = await runTwitterBrainScan({ requestId: scanId, db });

    // Post scan summary tweet if enabled and tokens were found
    if (results.tokensRouted > 0) {
      const tweetResult = await postScanSummary(results, scanId);
      if (tweetResult?.success) {
        results.summaryTweetId = tweetResult.tweetId;
        console.log(`[${scanId}] 📢 Scan summary tweeted: ${tweetResult.tweetId}`);
      }
    }

    console.log(`[${scanId}] ✅ Twitter Brain cron complete: ${results.tokensRouted} routed, ${results.replyQueueSize} queued`);
    return results;

  } catch (err) {
    console.error(`[${scanId}] ❌ Twitter Brain cron error: ${err.message}`);
    return {
      status: 'error',
      scanId,
      error: err.message,
    };
  }
}

// ─── Standalone execution ───────────────────────────
if (require.main === module) {
  console.log('Twitter Brain Scan — standalone execution');
  executeTwitterBrainScan()
    .then(results => {
      console.log('Results:', JSON.stringify(results, null, 2));
      process.exit(0);
    })
    .catch(err => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}

module.exports = { executeTwitterBrainScan };
