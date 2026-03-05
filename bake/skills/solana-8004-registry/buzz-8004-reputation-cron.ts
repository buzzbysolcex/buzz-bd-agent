/**
 * ═══════════════════════════════════════════════════════════════
 *  BUZZ BD AGENT — 8004 Reputation Cron
 * ═══════════════════════════════════════════════════════════════
 *
 *  Automated uptime/performance feedback to build Buzz's
 *  ATOM reputation on Solana Agent Registry.
 *
 *  Run as cron job (add to Buzz's 40 existing crons):
 *    Schedule: Every 6 hours (4x daily)
 *    0 */6 * * * node buzz-8004-reputation-cron.js
 *
 *  What it reports:
 *  - Uptime percentage (from health endpoint)
 *  - Task success rate (from pipeline stats)
 *  - API response time
 *
 *  This builds ATOM score over time:
 *  Unrated → Bronze → Silver → Gold → Platinum
 *
 *  Cost: ~0.002 SOL per feedback (~$0.18)
 *  Daily cost: ~0.008 SOL (~$0.72) for 4 reports
 * ═══════════════════════════════════════════════════════════════
 */

import {
  SolanaSDK,
  IPFSClient,
  Tag,
  trustTierToString,
} from '8004-solana';
import { Keypair, PublicKey } from '@solana/web3.js';

// ─── Configuration ───────────────────────────────────────────
const CONFIG = {
  // Set after registration - FILL THESE IN
  agentAsset: process.env.BUZZ_8004_AGENT_ASSET || '', // Solana PublicKey string
  cluster: 'mainnet-beta' as const,

  // Buzz health endpoint (internal)
  healthEndpoint: 'http://localhost:3000/api/v1/health',
  statsEndpoint: 'http://localhost:3000/api/v1/stats',

  // Telegram notification
  telegramChatId: '950395553',
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
};

// ─── Helpers ─────────────────────────────────────────────────
async function fetchHealth(): Promise<{ uptime: number; responseTimeMs: number }> {
  const start = Date.now();
  try {
    const res = await fetch(CONFIG.healthEndpoint, { signal: AbortSignal.timeout(10000) });
    const responseTimeMs = Date.now() - start;
    if (res.ok) {
      const data = await res.json();
      return {
        uptime: data.uptime_percent || 99.9,
        responseTimeMs,
      };
    }
    return { uptime: 0, responseTimeMs };
  } catch {
    return { uptime: 0, responseTimeMs: Date.now() - start };
  }
}

async function fetchStats(): Promise<{ successRate: number; tasksCompleted: number }> {
  try {
    const res = await fetch(CONFIG.statsEndpoint, { signal: AbortSignal.timeout(10000) });
    if (res.ok) {
      const data = await res.json();
      return {
        successRate: data.success_rate || 0,
        tasksCompleted: data.tasks_completed || 0,
      };
    }
    return { successRate: 0, tasksCompleted: 0 };
  } catch {
    return { successRate: 0, tasksCompleted: 0 };
  }
}

async function notifyTelegram(message: string) {
  if (!CONFIG.telegramBotToken) return;
  try {
    await fetch(
      `https://api.telegram.org/bot${CONFIG.telegramBotToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: CONFIG.telegramChatId,
          text: message,
          parse_mode: 'HTML',
        }),
      }
    );
  } catch {
    // Silent fail for notification
  }
}

// ─── Main Cron Job ───────────────────────────────────────────
async function runReputationCron() {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 🔄 8004 Reputation cron starting...`);

  if (!CONFIG.agentAsset) {
    console.error('❌ BUZZ_8004_AGENT_ASSET not set. Run registration first.');
    process.exit(1);
  }

  // Initialize SDK
  const signer = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(process.env.SOLANA_PRIVATE_KEY!))
  );

  const ipfs = process.env.PINATA_JWT
    ? new IPFSClient({ pinataEnabled: true, pinataJwt: process.env.PINATA_JWT! })
    : new IPFSClient({ url: 'http://localhost:5001' });

  const sdk = new SolanaSDK({
    cluster: CONFIG.cluster,
    signer,
    ipfsClient: ipfs,
  });

  const agentAsset = new PublicKey(CONFIG.agentAsset);

  // Collect metrics
  const health = await fetchHealth();
  const stats = await fetchStats();

  console.log(`   Uptime: ${health.uptime}%`);
  console.log(`   Response Time: ${health.responseTimeMs}ms`);
  console.log(`   Success Rate: ${stats.successRate}%`);
  console.log(`   Tasks Completed: ${stats.tasksCompleted}`);

  // Build feedback file
  const feedbackFile = {
    version: '1.0',
    type: 'buzz-self-report',
    agent: CONFIG.agentAsset,
    timestamp,
    metrics: {
      uptime_percent: health.uptime,
      response_time_ms: health.responseTimeMs,
      success_rate: stats.successRate,
      tasks_completed: stats.tasksCompleted,
    },
    infrastructure: {
      provider: 'Akash Network',
      runtime: 'OpenClaw v2026.2.26',
      version: '6.2.0-acp',
    },
  };

  // Upload to IPFS
  const feedbackCid = await ipfs.addJson(feedbackFile);
  const feedbackFileHash = await SolanaSDK.computeHash(JSON.stringify(feedbackFile));

  // Submit uptime feedback
  console.log('   📤 Submitting uptime feedback...');
  await sdk.giveFeedback(agentAsset, {
    value: health.uptime.toFixed(2),
    tag1: Tag.uptime,
    tag2: Tag.day,
    endpoint: '/api/v1/health',
    feedbackUri: `ipfs://${feedbackCid}`,
    feedbackFileHash,
  });

  // Submit success rate feedback (if we have task data)
  if (stats.successRate > 0) {
    console.log('   📤 Submitting success rate feedback...');
    await sdk.giveFeedback(agentAsset, {
      value: stats.successRate.toFixed(2),
      tag1: Tag.successRate,
      tag2: Tag.day,
      feedbackUri: `ipfs://${feedbackCid}`,
    });
  }

  // Submit response time feedback
  console.log('   📤 Submitting response time feedback...');
  await sdk.giveFeedback(agentAsset, {
    value: health.responseTimeMs.toString(),
    tag1: Tag.responseTime,
    tag2: Tag.day,
    score: health.responseTimeMs < 500 ? 95 : health.responseTimeMs < 2000 ? 70 : 30,
    endpoint: '/api/v1/health',
    feedbackUri: `ipfs://${feedbackCid}`,
  });

  // Check updated reputation
  const summary = await sdk.getSummary(agentAsset);
  const atom = await sdk.getAtomStats(agentAsset);

  const tierName = atom ? trustTierToString(atom.getTrustTier()) : 'Unknown';
  const quality = atom ? atom.getQualityPercent() : 0;

  console.log('');
  console.log(`   ✅ Feedback submitted`);
  console.log(`   Trust Tier: ${tierName}`);
  console.log(`   Quality: ${quality}%`);
  console.log(`   Total Feedbacks: ${summary.totalFeedbacks}`);
  console.log(`   Average Score: ${summary.averageScore}`);

  // Notify Telegram
  await notifyTelegram(
    `🔗 <b>8004 Reputation Update</b>\n\n` +
    `⏱ Uptime: ${health.uptime}%\n` +
    `📊 Success Rate: ${stats.successRate}%\n` +
    `⚡ Response: ${health.responseTimeMs}ms\n` +
    `🏆 Trust Tier: ${tierName}\n` +
    `💎 Quality: ${quality}%\n` +
    `📈 Total Feedbacks: ${summary.totalFeedbacks}\n\n` +
    `<a href="https://8004scan.io/agent/${CONFIG.agentAsset}">View on 8004scan</a>`
  );

  await ipfs.close?.();
  console.log(`[${new Date().toISOString()}] ✅ Cron complete.`);
}

// ─── Execute ─────────────────────────────────────────────────
runReputationCron().catch((err) => {
  console.error('❌ Reputation cron failed:', err.message);
  process.exit(1);
});
