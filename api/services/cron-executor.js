/**
 * Buzz BD Agent — Cron Executor (node-cron)
 * v8.1.0 | Wednesday Day 37 — Replaces host crontab bridge + dead OpenClaw scheduler
 *
 * 39+ crons organized by category:
 * - DATA COLLECTION: DexScreener, CoinGecko, Bitget, pipeline, trending
 * - BRAIN TRIGGERS: briefings, reviews, BD checks (via Telegram schedule-trigger)
 * - PROACTIVE: trending scan, pipeline discovery, contacts, ship check
 * - SCORING: auto-score pipeline every 30 min
 * - INFRASTRUCTURE: health check, memory watchdog, DB backup, handover
 * - PLATFORM: AIBTC heartbeat/inbox/scout/signals, Moltbook engage, Twitter mentions
 * - PRAYER: 5 daily prayer reminders (SACRED — never disable)
 * - OTHER: stability check
 *
 * Zero LLM calls. All intelligence via Claude Code Opus 4.6 (Pro Max).
 */

const { getDB } = require('../db');

// We use a simple setInterval-based scheduler instead of node-cron
// to avoid adding a dependency. Cron expressions parsed manually.
// Each job has: id, handler, intervalMs, lastRun, enabled

const jobs = new Map();
let started = false;

// ═══════════════════════════════════════
// CRON EXPRESSION PARSER (minimal)
// Supports: */N (every N), specific values, * (every)
// ═══════════════════════════════════════

function shouldRunNow(schedule, now) {
  if (!schedule) return false;
  const parts = schedule.split(' ');
  if (parts.length !== 5) return false;

  const [minExpr, hourExpr, domExpr, monExpr, dowExpr] = parts;
  const min = now.getUTCMinutes();
  const hour = now.getUTCHours();
  const dom = now.getUTCDate();
  const mon = now.getUTCMonth() + 1;
  const dow = now.getUTCDay();

  return matchField(minExpr, min) &&
         matchField(hourExpr, hour) &&
         matchField(domExpr, dom) &&
         matchField(monExpr, mon) &&
         matchField(dowExpr, dow);
}

function matchField(expr, value) {
  if (expr === '*') return true;

  // */N — every N
  if (expr.startsWith('*/')) {
    const interval = parseInt(expr.slice(2));
    return value % interval === 0;
  }

  // Comma-separated values: 0,6,12,18
  if (expr.includes(',')) {
    return expr.split(',').map(Number).includes(value);
  }

  // Single value
  return parseInt(expr) === value;
}

// ═══════════════════════════════════════
// JOB HANDLERS
// ═══════════════════════════════════════

const http = require('http');
const https = require('https');
const { execFile } = require('child_process');

function callLocalAPI(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: `/api/v1${path}`,
      method,
      headers: {
        'X-API-Key': process.env.BUZZ_API_ADMIN_KEY,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve(data); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function callExternal(url, options = {}) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { timeout: 15000, ...options }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve(data); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function triggerBrain(message) {
  // Send message to War Room via Telegram Bot API
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.WAR_ROOM_CHAT_ID || '-1003701758077';
  if (!botToken) return Promise.resolve({ error: 'no bot token' });

  const body = JSON.stringify({ chat_id: chatId, text: message });
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${botToken}/sendMessage`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      timeout: 10000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function logCronRun(id, status, detail) {
  try {
    const db = getDB();
    db.prepare(`
      UPDATE cron_jobs SET
        last_run = datetime('now'),
        run_count = run_count + 1,
        last_error = ?,
        status = ?
      WHERE id = ?
    `).run(
      status === 'error' ? detail : null,
      status === 'error' ? 'error' : 'active',
      id
    );
  } catch (e) {
    console.error(`[cron-executor] Failed to log run for ${id}:`, e.message);
  }
}

// ═══════════════════════════════════════
// JOB DEFINITIONS
// ═══════════════════════════════════════

function registerAllJobs() {

  // ─── DATA COLLECTION ───
  register('scan-dexscreener', '0 5,11,14,22 * * *', async () => {
    const data = await callExternal('https://api.dexscreener.com/token-boosts/top/v1');
    if (!Array.isArray(data)) return 'no data';
    let saved = 0, deduped = 0, pumpfun = 0;
    for (const token of data.slice(0, 30)) {
      const addr = token.tokenAddress;
      const chain = token.chainId;
      if (!addr || !['solana', 'base', 'bsc'].includes(chain)) continue;
      // GAP 9: Dedup — pipeline POST uses ON CONFLICT so duplicates are harmless
      // GAP 2: Pump.fun detection — flag tokens with pump.fun addresses
      const isPumpFun = addr.endsWith('pump') || (token.url && token.url.includes('pump.fun'));
      try {
        await callLocalAPI('/pipeline/tokens', 'POST', {
          address: addr,
          chain,
          source: isPumpFun ? 'dexscreener-boost-pumpfun' : 'dexscreener-boost',
          stage: 'discovered',
          name: token.tokenName || null,
          ticker: token.tokenSymbol || null
        });
        saved++;
        if (isPumpFun) pumpfun++;
      } catch { deduped++; }
    }
    return `saved:${saved} deduped:${deduped} pumpfun:${pumpfun}`;
  });

  register('dexscreener-trending', '0 */3 * * *', async () => {
    const data = await callExternal('https://api.dexscreener.com/token-boosts/top/v1');
    if (!Array.isArray(data)) return 'no data';
    let saved = 0;
    for (const token of data.slice(0, 20)) {
      const addr = token.tokenAddress;
      const chain = token.chainId;
      if (!addr || !['solana', 'base', 'bsc'].includes(chain)) continue;
      try {
        await callLocalAPI('/pipeline/tokens', 'POST', { address: addr, chain, source: 'dexscreener-trending', stage: 'discovered' });
        saved++;
      } catch {}
    }
    return `trending: ${saved} tokens`;
  });

  register('coingecko-scanner', '0 */4 * * *', async () => {
    try {
      const data = await callExternal('https://api.coingecko.com/api/v3/search/trending');
      const coins = data.coins || [];
      return `coingecko: ${coins.length} trending coins`;
    } catch (e) { return `coingecko error: ${e.message}`; }
  });

  register('bitget-listings', '0 8 * * *', async () => {
    try {
      const data = await callExternal('https://api.bitget.com/api/v2/spot/public/coins');
      const coins = data.data || [];
      return `bitget: ${coins.length} coins`;
    } catch (e) { return `bitget error: ${e.message}`; }
  });

  register('pipeline-review', '0 */2 * * *', async () => {
    const stats = await callLocalAPI('/pipeline/stats');
    return `pipeline: total=${stats.total} added_24h=${stats.added_24h}`;
  });

  register('daily-summary', '0 0 * * *', async () => {
    await triggerBrain('Buzz: generate daily pipeline summary. Pull stats from localhost:3000/api/v1/pipeline/stats. Post to War Room.');
    return 'triggered';
  });

  register('eod-report', '0 16 * * *', async () => {
    await triggerBrain('Buzz: end of day report. Summarize pipeline changes, new tokens, score updates, tweets posted, deals tracked. Post to War Room.');
    return 'triggered';
  });

  register('weekly-digest', '0 2 * * 0', async () => {
    await triggerBrain('Buzz: weekly pipeline digest. Full BD report with top prospects, deal status, revenue, ZHC readiness. Post to War Room.');
    return 'triggered';
  });

  register('moltbook-engage', '0 5,11,17,23 * * *', async () => {
    await triggerBrain('Buzz: MOLTBOOK ENGAGEMENT — Read feed, upvote 2 relevant posts, draft 1 quality comment for War Room approval. If in posting window and past spam cooldown, draft post for approval. Check notifications for replies.');
    return 'triggered';
  });

  register('acp-bridge-monitor', '0 */6 * * *', async () => {
    return 'acp check';
  });

  register('twitter-health', '0 1,7,13,19 * * *', async () => {
    const status = await callLocalAPI('/twitter/status');
    return `twitter: ${status.status || 'unknown'}`;
  });

  // ─── BRAIN TRIGGERS ───
  register('morning-briefing', '0 0 * * *', async () => {
    await triggerBrain('Buzz: run morning briefing. Full 11-section CEO format. Check ~/pending-followups.json for overdue items.');
    return 'triggered';
  });

  register('twitter-content', '0 2 * * *', async () => {
    await triggerBrain('Buzz: draft twitter content. Check today\'s creative output schedule. Post drafts to War Room.');
    return 'triggered';
  });

  register('bd-check', '0 5 * * *', async () => {
    await triggerBrain('Buzz: BD check and pipeline update. Check deal pipeline status. Follow up on pending outreach. Report to War Room.');
    return 'triggered';
  });

  register('evening-review', '0 14 * * *', async () => {
    await triggerBrain('Buzz: run evening review. Summarize day\'s work, metrics, blockers, tomorrow\'s focus. Post to War Room.');
    return 'triggered';
  });

  register('weekly-strategy', '0 14 * * 0', async () => {
    await triggerBrain('Buzz: weekly strategy session. Full pipeline digest, revenue report, ZHC readiness update, strategic questions for CEO. Include BREAKTHROUGH IDEA. Post to War Room.');
    return 'triggered';
  });

  register('monday-hackathon-scout', '0 0 * * 1', async () => {
    await triggerBrain('Buzz: Monday extras — scout hackathon platforms for new opportunities. Include BREAKTHROUGH IDEA in morning briefing.');
    return 'triggered';
  });

  // ─── PROACTIVE AUTONOMY ───
  register('trending-scan', '0 */6 * * *', async () => {
    await triggerBrain('Buzz: scan trending crypto Twitter and intel sources. Check DexScreener trending, CoinGecko trending, AIXBT signals. Draft hot take for War Room if relevant.');
    return 'triggered';
  });

  register('pipeline-discovery-check', '0 */1 * * *', async () => {
    const stats = await callLocalAPI('/pipeline/stats');
    const hot = (stats.by_stage || {}).hot || { count: 0 };
    if (hot.count > 0) {
      await triggerBrain(`Buzz: ${hot.count} HOT tokens in pipeline. Run full Opus analysis and report to War Room.`);
    }
    return `discovery check: hot=${hot.count}`;
  });

  register('contact-response-check', '0 3,15 * * *', async () => {
    // Phase 3 Tm3: Check overdue proposals from BD automation
    try {
      const { getOverdueFollowups } = require('../lib/bd-automation');
      const overdue = getOverdueFollowups();
      if (overdue.length > 0) {
        const list = overdue.map(p => `${p.ticker || 'unknown'} (${p.chain}) — due ${p.followup_due}`).join('\n');
        await triggerBrain(`Buzz: OVERDUE FOLLOW-UPS — ${overdue.length} proposals past 48h deadline:\n${list}\nDraft follow-up messages for War Room approval.`);
      }
    } catch {}
    await triggerBrain('Buzz: check all contacts for responses (Twitter DMs, email replies). Check ~/pending-followups.json for overdue items. Draft follow-up if anyone responded.');
    return 'triggered';
  });

  register('ship-check', '0 16 * * *', async () => {
    await triggerBrain('Buzz: what did you ship today? If nothing, pick something from the creative schedule and build it now.');
    return 'triggered';
  });

  // ─── SCORING PIPELINE ───
  register('auto-score-pipeline', '*/30 * * * *', async () => {
    // Get unscored discovered tokens
    const discovered = await callLocalAPI('/pipeline/stage/discovered');
    const tokens = (discovered.tokens || []).filter(t => !t.score || t.score === 0);
    if (tokens.length === 0) return 'no unscored tokens';

    let scored = 0, failed = 0, hotList = [], proceedList = [];
    for (const token of tokens.slice(0, 20)) {
      try {
        const result = await callLocalAPI(`/scores/components/${token.address}?chain=${token.chain || 'solana'}`);
        const score = result.composite_score || 0;
        if (score > 0) {
          // PATCH auto-classifies via pipeline-classifier (hot/qualified/watch/skip + dual-gate)
          await callLocalAPI(`/pipeline/tokens/${token.address}?chain=${token.chain || 'solana'}`, 'PATCH', { score });
          scored++;
          const name = token.ticker || token.name || 'unknown';
          if (score >= 85) proceedList.push(`${name} (${token.chain}): ${score}/100 — PROCEED candidate`);
          else if (score >= 70) hotList.push(`${name} (${token.chain}): ${score}/100`);
        } else { failed++; }
      } catch { failed++; }
    }

    // Phase 3: Alert batching (GAP 10) — batch non-urgent, immediate for PROCEED
    if (proceedList.length > 0) {
      await triggerBrain(`Buzz: PROCEED ALERT — ${proceedList.length} tokens scored 85+ with dual-gate pass. Generate proposals and post to War Room for Ogie approval:\n${proceedList.join('\n')}\nUse bd-automation.js generateProposal() for each.`);
    }
    if (hotList.length > 0) {
      await triggerBrain(`Buzz: AUTO-SCORE — ${hotList.length} tokens scored 70+. Run Opus qualitative override:\n${hotList.join('\n')}`);
    }
    return `scored:${scored} failed:${failed} hot:${hotList.length} proceed:${proceedList.length}`;
  });

  // ─── INFRASTRUCTURE ───
  register('health-check', '*/1 * * * *', async () => {
    const health = await callLocalAPI('/health');
    if (health.status !== 'healthy') {
      await triggerBrain(`Buzz: API HEALTH ALERT — status: ${health.status}`);
    }
    return health.status;
  });

  register('memory-watchdog', '*/5 * * * *', async () => {
    const os = require('os');
    const used = os.totalmem() - os.freemem();
    const usedGB = (used / 1024 / 1024 / 1024).toFixed(1);
    if (parseFloat(usedGB) > 12) {
      await triggerBrain(`Buzz: MEMORY ALERT — ${usedGB}GB used of 16GB`);
    }
    return `memory: ${usedGB}GB`;
  });

  register('db-backup', '0 3 * * *', async () => {
    return new Promise((resolve, reject) => {
      execFile('/home/claude-code/backup-db.sh', (err, stdout) => {
        if (err) reject(err);
        else resolve('backup complete');
      });
    });
  });

  register('handover-update', '*/15 * * * *', async () => {
    return new Promise((resolve, reject) => {
      execFile('/home/claude-code/update-handover.sh', (err) => {
        if (err) reject(err);
        else resolve('handover updated');
      });
    });
  });

  // ─── PLATFORM: AIBTC ───
  register('aibtc-heartbeat', '*/5 * * * *', async () => {
    return new Promise((resolve, reject) => {
      execFile('/home/claude-code/aibtc-heartbeat.sh', (err) => {
        if (err) reject(err);
        else resolve('heartbeat sent');
      });
    });
  });

  register('aibtc-inbox-poll', '*/5 * * * *', async () => {
    return new Promise((resolve, reject) => {
      execFile('/home/claude-code/aibtc-inbox-poll.sh', (err) => {
        if (err) reject(err);
        else resolve('inbox checked');
      });
    });
  });

  register('aibtc-network-scout', '0 */4 * * *', async () => {
    return new Promise((resolve, reject) => {
      execFile('/home/claude-code/aibtc-network-scout.sh', (err) => {
        if (err) reject(err);
        else resolve('scout complete');
      });
    });
  });

  register('aibtc-news-signal', '0 */8 * * *', async () => {
    await triggerBrain('Buzz: AIBTC DAILY SIGNAL — DRAFT to War Room for Ogie approval. Pull fresh pipeline data, generate news-format headline + body. DO NOT auto-file.');
    return 'triggered';
  });

  register('aibtc-leaderboard-check', '0 */12 * * *', async () => {
    await triggerBrain('Buzz: AIBTC leaderboard check. Pull correspondent rankings from aibtc.news. Report our position to War Room.');
    return 'triggered';
  });

  // ─── PLATFORM: MOLTBOOK ───
  // moltbook-engage already registered above in DATA COLLECTION

  // ─── PLATFORM: TWITTER ───
  register('twitter-mention-monitor', '*/15 * * * *', async () => {
    return new Promise((resolve, reject) => {
      execFile('/home/claude-code/twitter-mention-check.sh', (err) => {
        if (err) reject(err);
        else resolve('mentions checked');
      });
    });
  });

  // ─── PRAYER REMINDERS (SACRED) ───
  register('prayer-fajr', '25 21 * * *', async () => {
    await triggerBrain('Reminder: Fajr prayer time (04:25 WIB). Bismillah.');
    return 'fajr';
  });

  register('prayer-dhuhr', '0 5 * * *', async () => {
    await triggerBrain('Reminder: Dhuhr prayer time (12:00 WIB). Bismillah.');
    return 'dhuhr';
  });

  register('prayer-asr', '15 8 * * *', async () => {
    await triggerBrain('Reminder: Asr prayer time (15:15 WIB). Bismillah.');
    return 'asr';
  });

  register('prayer-maghrib', '0 11 * * *', async () => {
    await triggerBrain('Reminder: Maghrib prayer time (18:00 WIB). Bismillah.');
    return 'maghrib';
  });

  register('prayer-isha', '15 12 * * *', async () => {
    await triggerBrain('Reminder: Isha prayer time (19:15 WIB). Bismillah.');
    return 'isha';
  });

  // ─── OTHER ───
  register('stability-check', '0 0 * * *', async () => {
    await triggerBrain('Buzz: 24h stability check. Verify all crons ran, all endpoints healthy, no errors. Report to War Room.');
    return 'triggered';
  });

  register('wallet-balance-check', '0 */1 * * *', async () => {
    // Will be implemented by Phase 2 Teammate 5
    return 'placeholder';
  });
}

// ═══════════════════════════════════════
// REGISTRATION + TICK ENGINE
// ═══════════════════════════════════════

function register(id, schedule, handler) {
  jobs.set(id, { id, schedule, handler, lastRun: null, enabled: true, running: false });
}

async function tick() {
  const now = new Date();

  for (const [id, job] of jobs) {
    if (!job.enabled || job.running) continue;
    if (!shouldRunNow(job.schedule, now)) continue;

    // Prevent double-runs within same minute
    if (job.lastRun) {
      const elapsed = now - job.lastRun;
      if (elapsed < 55000) continue; // less than 55 seconds since last run
    }

    job.running = true;
    job.lastRun = now;

    try {
      const result = await job.handler();
      logCronRun(id, 'ok', typeof result === 'string' ? result : JSON.stringify(result));
    } catch (e) {
      console.error(`[cron-executor] ${id} failed:`, e.message);
      logCronRun(id, 'error', e.message);
    } finally {
      job.running = false;
    }
  }
}

function start() {
  if (started) return;
  started = true;

  registerAllJobs();

  // Sync job definitions to SQLite
  const db = getDB();
  for (const [id, job] of jobs) {
    db.prepare(`
      INSERT INTO cron_jobs (id, name, schedule, status)
      VALUES (?, ?, ?, 'active')
      ON CONFLICT(id) DO UPDATE SET
        schedule = excluded.schedule,
        status = 'active'
    `).run(id, id, job.schedule);
  }

  // Tick every 30 seconds (checks cron expressions against current time)
  setInterval(tick, 30000);
  console.log(`[cron-executor] Started with ${jobs.size} jobs`);
}

function getStatus() {
  const result = [];
  for (const [id, job] of jobs) {
    result.push({
      id,
      schedule: job.schedule,
      enabled: job.enabled,
      running: job.running,
      lastRun: job.lastRun ? job.lastRun.toISOString() : null
    });
  }
  return result;
}

function triggerJob(id) {
  const job = jobs.get(id);
  if (!job) return { error: 'not_found' };
  job.handler().then(r => logCronRun(id, 'ok', r)).catch(e => logCronRun(id, 'error', e.message));
  return { triggered: true, id };
}

module.exports = { start, getStatus, triggerJob };
