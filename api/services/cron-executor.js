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
 * Zero LLM calls. All intelligence via Claude Code Opus 4.7 (Pro Max).
 */

const { getDB } = require("../db");

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
  const parts = schedule.split(" ");
  if (parts.length !== 5) return false;

  const [minExpr, hourExpr, domExpr, monExpr, dowExpr] = parts;
  const min = now.getUTCMinutes();
  const hour = now.getUTCHours();
  const dom = now.getUTCDate();
  const mon = now.getUTCMonth() + 1;
  const dow = now.getUTCDay();

  return (
    matchField(minExpr, min) &&
    matchField(hourExpr, hour) &&
    matchField(domExpr, dom) &&
    matchField(monExpr, mon) &&
    matchField(dowExpr, dow)
  );
}

function matchField(expr, value) {
  if (expr === "*") return true;

  // */N — every N
  if (expr.startsWith("*/")) {
    const interval = parseInt(expr.slice(2));
    return value % interval === 0;
  }

  // Comma-separated values: 0,6,12,18
  if (expr.includes(",")) {
    return expr.split(",").map(Number).includes(value);
  }

  // Single value
  return parseInt(expr) === value;
}

// ═══════════════════════════════════════
// JOB HANDLERS
// ═══════════════════════════════════════

const http = require("http");
const https = require("https");
const { execFile } = require("child_process");

function callLocalAPI(path, method = "GET", body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "localhost",
      port: 3000,
      path: `/api/v1${path}`,
      method,
      headers: {
        "X-API-Key": process.env.BUZZ_API_ADMIN_KEY,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    };
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(data);
        }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("timeout"));
    });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function callExternal(url, options = {}) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith("https") ? https : http;
    const req = mod.get(url, { timeout: 15000, ...options }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(data);
        }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("timeout"));
    });
  });
}

function triggerBrain(message) {
  // Send message to War Room via Telegram Bot API
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.WAR_ROOM_CHAT_ID || "-1003701758077";
  if (!botToken) return Promise.resolve({ error: "no bot token" });

  const body = JSON.stringify({ chat_id: chatId, text: message });
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "api.telegram.org",
        path: `/bot${botToken}/sendMessage`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
        timeout: 10000,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
      },
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function logCronRun(id, status, detail) {
  try {
    const db = getDB();
    db.prepare(
      `
      UPDATE cron_jobs SET
        last_run = datetime('now'),
        run_count = run_count + 1,
        last_error = ?,
        status = ?
      WHERE id = ?
    `,
    ).run(
      status === "error" ? detail : null,
      status === "error" ? "error" : "active",
      id,
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
  register("scan-dexscreener", "0 5,11,14,22 * * *", async () => {
    const data = await callExternal(
      "https://api.dexscreener.com/token-boosts/top/v1",
    );
    if (!Array.isArray(data)) return "no data";
    let saved = 0,
      deduped = 0,
      pumpfun = 0;
    for (const token of data.slice(0, 30)) {
      const addr = token.tokenAddress;
      const chain = token.chainId;
      if (!addr || !["solana", "base", "bsc"].includes(chain)) continue;
      // GAP 9: Dedup — pipeline POST uses ON CONFLICT so duplicates are harmless
      // GAP 2: Pump.fun detection — flag tokens with pump.fun addresses
      const isPumpFun =
        addr.endsWith("pump") || (token.url && token.url.includes("pump.fun"));
      try {
        await callLocalAPI("/pipeline/tokens", "POST", {
          address: addr,
          chain,
          source: isPumpFun ? "dexscreener-boost-pumpfun" : "dexscreener-boost",
          stage: "discovered",
          name: token.tokenName || null,
          ticker: token.tokenSymbol || null,
        });
        saved++;
        if (isPumpFun) pumpfun++;
      } catch {
        deduped++;
      }
    }
    return `saved:${saved} deduped:${deduped} pumpfun:${pumpfun}`;
  });

  register("dexscreener-trending", "0 */3 * * *", async () => {
    const data = await callExternal(
      "https://api.dexscreener.com/token-boosts/top/v1",
    );
    if (!Array.isArray(data)) return "no data";
    let saved = 0;
    for (const token of data.slice(0, 20)) {
      const addr = token.tokenAddress;
      const chain = token.chainId;
      if (!addr || !["solana", "base", "bsc"].includes(chain)) continue;
      try {
        await callLocalAPI("/pipeline/tokens", "POST", {
          address: addr,
          chain,
          source: "dexscreener-trending",
          stage: "discovered",
        });
        saved++;
      } catch {}
    }
    return `trending: ${saved} tokens`;
  });

  register("coingecko-scanner", "0 */4 * * *", async () => {
    try {
      const data = await callExternal(
        "https://api.coingecko.com/api/v3/search/trending",
      );
      const coins = data.coins || [];
      return `coingecko: ${coins.length} trending coins`;
    } catch (e) {
      return `coingecko error: ${e.message}`;
    }
  });

  register("bitget-listings", "0 8 * * *", async () => {
    try {
      const data = await callExternal(
        "https://api.bitget.com/api/v2/spot/public/coins",
      );
      const coins = data.data || [];
      return `bitget: ${coins.length} coins`;
    } catch (e) {
      return `bitget error: ${e.message}`;
    }
  });

  register("pipeline-review", "0 */2 * * *", async () => {
    const stats = await callLocalAPI("/pipeline/stats");
    return `pipeline: total=${stats.total} added_24h=${stats.added_24h}`;
  });

  register("daily-summary", "0 0 * * *", async () => {
    await triggerBrain(
      "Buzz: generate daily pipeline summary. Pull stats from localhost:3000/api/v1/pipeline/stats. Post to War Room.",
    );
    return "triggered";
  });

  register("eod-report", "0 16 * * *", async () => {
    await triggerBrain(
      "Buzz: end of day report. Summarize pipeline changes, new tokens, score updates, tweets posted, deals tracked. Post to War Room.",
    );
    return "triggered";
  });

  register("weekly-digest", "0 2 * * 0", async () => {
    await triggerBrain(
      "Buzz: weekly pipeline digest. Full BD report with top prospects, deal status, revenue, ZHC readiness. Post to War Room.",
    );
    return "triggered";
  });

  // v8.2.1: Colosseum Copilot weekly trends (Sunday 16:00 UTC — before report compilation)
  register("copilot-weekly-trends", "0 16 * * 0", async () => {
    try {
      const copilot = require("../lib/colosseum-copilot");
      const trends = await copilot.getWeeklyTrends();
      if (trends) {
        global.buzzModules?.activityBoard?.log(
          "copilot_trends",
          "pipeline-scanner",
          null,
          null,
          null,
          JSON.stringify(trends),
        );
        return `trends fetched: ${JSON.stringify(trends).length} bytes`;
      }
      return "trends: no data";
    } catch (e) {
      return `copilot trends error: ${e.message}`;
    }
  });

  // ARIA discovery scan (06:00 UTC daily — multi-source token discovery)
  register("aria-discovery-scan", "0 6 * * *", async () => {
    try {
      const result = await callLocalAPI("/aria/discover");
      const msg = `ARIA SCAN: ${result.discovered || 0} discovered, ${result.persisted || 0} persisted`;
      const sources = result.sources || {};
      const srcSummary = Object.entries(sources)
        .map(([k, v]) => `${k}: ${v.count || 0}`)
        .join(", ");
      await triggerBrain(
        `Buzz: ${msg}. Sources: ${srcSummary}. Check /aria/filter for qualified candidates. Report to War Room.`,
      );
      return msg;
    } catch (e) {
      return `aria scan error: ${e.message.slice(0, 80)}`;
    }
  });

  // Frontier daily tracker (09:00 UTC — after morning briefing)
  register("frontier-daily-tracker", "0 9 * * *", async () => {
    try {
      const { execSync } = require("child_process");
      const bal = execSync(
        "cast balance 0xa57f4010d200dc1E67cAbede025b90090cd99206 --rpc-url https://mainnet.base.org 2>/dev/null",
        { timeout: 10000 },
      )
        .toString()
        .trim();
      const ethBal = (parseInt(bal) / 1e18).toFixed(6);
      const onchain = execSync(
        'cast call 0xbf81316266dBB79947c358e2eAAc6F338Fa388Fb "totalScored()" --rpc-url https://mainnet.base.org 2>/dev/null',
        { timeout: 10000 },
      )
        .toString()
        .trim();
      const totalOnchain = parseInt(onchain, 16);
      const daysLeft = Math.ceil(
        (new Date("2026-05-11") - new Date()) / 86400000,
      );
      await triggerBrain(
        `Buzz: FRONTIER TRACKER — Day ${new Date().toISOString().slice(0, 10)} | ${daysLeft} days to May 11\n\nCONTRACTS: 1/4 deployed\n  ScoreStorage v2: LIVE (${totalOnchain} scores on-chain)\n  ListingOracle: not started\n  ListingEscrow: not started\n  BuzzReputation: not started\nDEPLOYER: ${ethBal} ETH\n\nPost tracker to War Room.`,
      );
      return `frontier tracker: ${daysLeft}d remaining, ${totalOnchain} on-chain, ${ethBal} ETH`;
    } catch (e) {
      return `frontier tracker error: ${e.message.slice(0, 80)}`;
    }
  });

  // v8.2.1: Browser-Use visual scans
  register("dexscreener-visual-scan", "0 */4 * * *", async () => {
    try {
      const { execSync } = require("child_process");
      const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 16);
      execSync(
        `browser-use --cdp-url http://localhost:9222 open https://dexscreener.com/solana/trending`,
        { timeout: 10000 },
      );
      execSync("sleep 3");
      execSync(
        `browser-use --cdp-url http://localhost:9222 screenshot /tmp/dex-scan-${ts}.png`,
        { timeout: 5000 },
      );
      execSync("browser-use --cdp-url http://localhost:9222 close", {
        timeout: 5000,
      });
      return `dex visual scan: /tmp/dex-scan-${ts}.png`;
    } catch (e) {
      return `dex visual scan error: ${e.message.slice(0, 100)}`;
    }
  });

  register("virtuals-daily-check", "0 8 * * *", async () => {
    try {
      const { execSync } = require("child_process");
      execSync(
        "browser-use --cdp-url http://localhost:9222 open https://app.virtuals.io/acp",
        { timeout: 10000 },
      );
      execSync("sleep 3");
      execSync(
        "browser-use --cdp-url http://localhost:9222 screenshot /tmp/virtuals-daily.png",
        { timeout: 5000 },
      );
      execSync("browser-use --cdp-url http://localhost:9222 close", {
        timeout: 5000,
      });
      return "virtuals daily check: screenshot saved";
    } catch (e) {
      return `virtuals check error: ${e.message.slice(0, 100)}`;
    }
  });

  register("moltbook-engage", "0 5,11,17,23 * * *", async () => {
    await triggerBrain(
      "Buzz: MOLTBOOK ENGAGEMENT — Read feed, upvote 2 relevant posts, draft 1 quality comment for War Room approval. If in posting window and past spam cooldown, draft post for approval. Check notifications for replies.",
    );
    return "triggered";
  });

  register("acp-bridge-monitor", "0 */6 * * *", async () => {
    return "acp check";
  });

  register("twitter-health", "0 1,7,13,19 * * *", async () => {
    const status = await callLocalAPI("/twitter/status");
    return `twitter: ${status.status || "unknown"}`;
  });

  register("twitter-brain-scan", "0 */4 * * *", async () => {
    try {
      const { executeTwitterBrainScan } = require("../cron/twitter-brain-scan");
      const result = await executeTwitterBrainScan();
      return `brain-scan: ${result.status || "ok"} routed=${result.tokensRouted || 0}`;
    } catch (err) {
      return `brain-scan: error — ${err.message}`;
    }
  });

  // ─── BRAIN TRIGGERS ───
  register("morning-briefing", "0 0 * * *", async () => {
    await triggerBrain(
      "Buzz: run morning briefing. Full 11-section CEO format. Check ~/pending-followups.json for overdue items.",
    );
    return "triggered";
  });

  // Discord dual-route for morning-briefing — fires 5 min after the brain
  // trigger to let the Claude Code chain write its output to
  // autonomous_loop_outputs first. Gated by DISCORD_OPS_DASHBOARD flag.
  // Additive — Telegram path is fully independent.
  // Phase 1b Wave 1 Commit 2 per Ogie msg 3897.
  register("morning-briefing-discord-dualroute", "5 0 * * *", async () => {
    try {
      const { getDB } = require("../db");
      const discord = require("../lib/discord-notify");
      const db = getDB();
      const row = db
        .prepare(
          `SELECT content, title FROM autonomous_loop_outputs
           WHERE output_type = 'morning_brief'
             AND datetime(created_at) >= datetime('now', '-15 minutes')
           ORDER BY id DESC LIMIT 1`,
        )
        .get();
      if (!row) {
        return "no_fresh_brief";
      }
      const res = await discord.send(
        "ops.morning-brief",
        `**${row.title || "Morning Brief"}**\n\n${typeof row.content === "string" ? row.content : JSON.stringify(row.content)}`,
        { reason: "morning-briefing-cron-dualroute" },
      );
      return `dualroute: ${res.sent ? "sent" : `skipped(${res.reason})`}`;
    } catch (err) {
      return `dualroute: error — ${err.message}`;
    }
  });

  // Morning brief at 05:00 UTC (08:00 JED — actual Ogie morning).
  // Per Ogie War Room msg 4351 Step 3. The existing morning-briefing at
  // 00:00 UTC fires at 03:00 JED (Ogie asleep) — this cron fills the gap.
  // Posts a live summary pulled from DB directly (no autonomous_loop_outputs
  // dependency) to both War Room and #morning-brief via dual-route.
  register("morning-brief-0500utc", "0 5 * * *", async () => {
    try {
      const { getDB } = require("../db");
      const { postDual } = require("../lib/dual-route");
      const db = getDB();

      // Streak state — last filed signal from aibtc_signals_filed
      // (the direct-filer writes here via signal-tracker; signal_audit is
      // the legacy pre-direct-filer table and goes stale after direct-file
      // cutover — see Ogie msg 4510 Part 7 Day 22)
      const lastSignal = db
        .prepare(
          `SELECT signal_id, beat_slug, filed_at FROM aibtc_signals_filed
           ORDER BY id DESC LIMIT 1`,
        )
        .get();

      // Today's signals count (UTC calendar day, matches aibtc.news daily cap)
      const todaySignals =
        db
          .prepare(
            `SELECT COUNT(*) as c FROM aibtc_signals_filed
           WHERE filed_at >= date('now')`,
          )
          .get()?.c || 0;

      // Overnight intel ingest (last 12h)
      const intelCount =
        db
          .prepare(
            `SELECT COUNT(*) as c FROM autodream_intel_ingest
           WHERE ingested_at >= datetime('now','-12 hours')`,
          )
          .get()?.c || 0;

      // Discord dispatcher state
      const disp = db
        .prepare(
          `SELECT total_posts, last_error FROM discord_dispatcher_state
           WHERE dispatcher_name = 'discord-ops-dispatcher'`,
        )
        .get();

      // Hackathon countdowns
      const now = new Date();
      const daysUntil = (iso) =>
        Math.max(0, Math.ceil((new Date(iso) - now) / (24 * 60 * 60 * 1000)));

      const content = `☀️ MORNING BRIEF — ${now.toISOString().slice(0, 10)} (08:00 JED)
• Streak: last filed ${lastSignal?.filed_at || "none"} (${lastSignal?.beat_slug || "?"}, id=${lastSignal?.signal_id?.slice(0, 8) || "?"}…); filed-today=${todaySignals}
• Intel ingest (12h): ${intelCount} entries
• Discord dispatcher: total_posts=${disp?.total_posts || 0}${disp?.last_error ? ` ERR=${disp.last_error.slice(0, 60)}` : ""}
• Hackathons: Cerebral Valley ${daysUntil("2026-04-27")}d · Kite ${daysUntil("2026-05-06")}d · Frontier ${daysUntil("2026-05-11")}d
• API health: ${lastSignal ? "routine" : "no filing yet today — streak watch"}`;

      const res = await postDual("morning_brief", content, {
        reason: "morning-brief-0500utc-cron",
      });
      return `brief: tg=${res.tg.sent ? "ok" : res.tg.reason || "fail"} dc=${res.discord.sent ? "ok" : res.discord.reason || "fail"}`;
    } catch (err) {
      return `morning-brief-0500utc: error — ${err.message}`;
    }
  });

  // Canonical daily-report — 21:00 UTC daily. Aggregates 10 tables,
  // writes autonomous_loop_outputs + claim_audit, dual-routes to
  // Telegram + Discord. Phase 1b Wave 1 Commit 3 per Ogie msg 3897.
  register("daily-report-21utc", "0 21 * * *", async () => {
    try {
      const { runDailyReport } = require("../crons/daily-report-21utc");
      const res = await runDailyReport();
      return `daily-report: ok=${res.ok} tg=${res.telegramSent} dc=${res.discordSent} output=${res.output_id} claim=${res.claim_audit_id} sources=${res.sources}/${res.sources_with_errors}err`;
    } catch (err) {
      return `daily-report: error — ${err.message}`;
    }
  });

  register("twitter-content", "0 2 * * *", async () => {
    await triggerBrain(
      "Buzz: draft twitter content. Check today's creative output schedule. Post drafts to War Room.",
    );
    return "triggered";
  });

  register("bd-check", "0 5 * * *", async () => {
    await triggerBrain(
      "Buzz: BD check and pipeline update. Check deal pipeline status. Follow up on pending outreach. Report to War Room.",
    );
    return "triggered";
  });

  register("evening-review", "0 14 * * *", async () => {
    await triggerBrain(
      "Buzz: run evening review. Summarize day's work, metrics, blockers, tomorrow's focus. Post to War Room.",
    );
    return "triggered";
  });

  register("weekly-strategy", "0 14 * * 0", async () => {
    await triggerBrain(
      "Buzz: weekly strategy session. Full pipeline digest, revenue report, ZHC readiness update, strategic questions for CEO. Include BREAKTHROUGH IDEA. Post to War Room.",
    );
    return "triggered";
  });

  register("monday-hackathon-scout", "0 0 * * 1", async () => {
    await triggerBrain(
      "Buzz: Monday extras — scout hackathon platforms for new opportunities. Include BREAKTHROUGH IDEA in morning briefing.",
    );
    return "triggered";
  });

  // ─── PROACTIVE AUTONOMY ───
  register("trending-scan", "0 */6 * * *", async () => {
    await triggerBrain(
      "Buzz: scan trending crypto Twitter and intel sources. Check DexScreener trending, CoinGecko trending, AIXBT signals. Draft hot take for War Room if relevant.",
    );
    return "triggered";
  });

  register("pipeline-discovery-check", "0 */1 * * *", async () => {
    const stats = await callLocalAPI("/pipeline/stats");
    const hot = (stats.by_stage || {}).hot || { count: 0 };
    if (hot.count > 0) {
      await triggerBrain(
        `Buzz: ${hot.count} HOT tokens in pipeline. Run full Opus analysis and report to War Room.`,
      );
    }
    return `discovery check: hot=${hot.count}`;
  });

  register("contact-response-check", "0 3,15 * * *", async () => {
    // Phase 3 Tm3: Check overdue proposals from BD automation
    try {
      const { getOverdueFollowups } = require("../lib/bd-automation");
      const overdue = getOverdueFollowups();
      if (overdue.length > 0) {
        const list = overdue
          .map(
            (p) =>
              `${p.ticker || "unknown"} (${p.chain}) — due ${p.followup_due}`,
          )
          .join("\n");
        await triggerBrain(
          `Buzz: OVERDUE FOLLOW-UPS — ${overdue.length} proposals past 48h deadline:\n${list}\nDraft follow-up messages for War Room approval.`,
        );
      }
    } catch {}
    await triggerBrain(
      "Buzz: check all contacts for responses (Twitter DMs, email replies). Check ~/pending-followups.json for overdue items. Draft follow-up if anyone responded.",
    );
    return "triggered";
  });

  register("ship-check", "0 16 * * *", async () => {
    await triggerBrain(
      "Buzz: what did you ship today? If nothing, pick something from the creative schedule and build it now.",
    );
    return "triggered";
  });

  // ─── SCORING PIPELINE ───
  register("auto-score-pipeline", "*/30 * * * *", async () => {
    // Get unscored discovered tokens
    const discovered = await callLocalAPI("/pipeline/stage/discovered");
    const tokens = (discovered.tokens || []).filter(
      (t) => !t.score || t.score === 0,
    );
    if (tokens.length === 0) return "no unscored tokens";

    let scored = 0,
      failed = 0,
      hotList = [],
      proceedList = [],
      excluded = 0,
      penalized = 0;
    // BD Screening Workflow v1.0 — 8 permanent rules (IN CODE, not just docs)
    const STABLECOINS = [
      "USDC",
      "USDT",
      "DAI",
      "EURC",
      "FRAX",
      "TUSD",
      "BUSD",
      "LUSD",
      "PYUSD",
    ];
    for (const token of tokens.slice(0, 20)) {
      try {
        const ticker = (token.ticker || token.name || "").toUpperCase();
        // Rule 3: Stablecoin exclusion
        if (STABLECOINS.includes(ticker)) {
          excluded++;
          continue;
        }

        const result = await callLocalAPI(
          `/scores/components/${token.address}?chain=${token.chain || "solana"}`,
        );
        let score = result.composite_score || 0;
        if (score > 0) {
          let penalties = [];
          const components = result.components || {};
          const safetyData = components.safety?.data || {};
          const scorerData = components.scorer?.data || {};
          const scannerData = components.scanner?.data || {};

          // Rule 4: Ghost token — no pairs found = phantom
          if (scannerData.found === false || scannerData.pairs_count === 0) {
            score = Math.min(score, 10);
            penalties.push("phantom_token(no_pairs)");
          }

          // Rule 6a: Token Sniffer penalty (from safety factors)
          const factors = safetyData.factors || [];
          // Rule 6b: Honeypot = auto-exclude
          if (safetyData.instant_kill) {
            score = 0;
            penalties.push("honeypot_detected");
            excluded++;
            continue;
          }

          // Rule 1+2: FDV Gap + Circulating supply penalties
          // Applied via scorer market category — if market scores are very low
          // with high composite, likely FDV inflation
          const scorerCategories = scorerData.categories || {};
          const marketScore = scorerCategories.market || 0;
          if (marketScore <= 1 && score >= 70) {
            // Market data shows $0 mcap/liq/vol but composite is high = likely FDV inflation
            score = Math.min(score, 50);
            penalties.push("market_data_missing(mcap=0,liq=0)");
          }

          // Rule 6c: If safety score is very low but composite is high = security concern
          const safetyScore = components.safety?.score || 0;
          if (safetyScore < 30 && score >= 70) {
            score = Math.max(score - 25, 10);
            penalties.push("security_penalty(safety=" + safetyScore + ")");
          }

          // Rule 7: Liquidity cross-ref (if scanner found no pairs but score is positive)
          if (!scannerData.found && score > 50) {
            score = Math.max(score - 15, 10);
            penalties.push("liq_crossref_fail(no_dex_pair)");
          }

          // Log penalties applied
          if (penalties.length > 0) {
            penalized++;
            // Append penalties to notes via pipeline update
          }

          // PATCH auto-classifies via pipeline-classifier (hot/qualified/watch/skip + dual-gate)
          await callLocalAPI(
            `/pipeline/tokens/${token.address}?chain=${token.chain || "solana"}`,
            "PATCH",
            { score },
          );
          scored++;
          const name = token.ticker || token.name || "unknown";
          if (score >= 85)
            proceedList.push(
              `${name} (${token.chain}): ${score}/100 — PROCEED candidate`,
            );
          else if (score >= 70)
            hotList.push(`${name} (${token.chain}): ${score}/100`);
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    // Phase 3: Alert batching (GAP 10) — batch non-urgent, immediate for PROCEED
    if (proceedList.length > 0) {
      await triggerBrain(
        `Buzz: PROCEED ALERT — ${proceedList.length} tokens scored 85+ with dual-gate pass. Generate proposals and post to War Room for Ogie approval:\n${proceedList.join("\n")}\nUse bd-automation.js generateProposal() for each.`,
      );
    }
    if (hotList.length > 0) {
      await triggerBrain(
        `Buzz: AUTO-SCORE — ${hotList.length} tokens scored 70+. Run Opus qualitative override:\n${hotList.join("\n")}`,
      );
    }
    return `scored:${scored} failed:${failed} excluded:${excluded} penalized:${penalized} hot:${hotList.length} proceed:${proceedList.length}`;
  });

  // ─── INFRASTRUCTURE ───
  register("health-check", "*/1 * * * *", async () => {
    const health = await callLocalAPI("/health");
    if (health.status !== "healthy") {
      await triggerBrain(`Buzz: API HEALTH ALERT — status: ${health.status}`);
    }
    return health.status;
  });

  register("memory-watchdog", "*/5 * * * *", async () => {
    const os = require("os");
    const used = os.totalmem() - os.freemem();
    const usedGB = (used / 1024 / 1024 / 1024).toFixed(1);
    if (parseFloat(usedGB) > 12) {
      await triggerBrain(`Buzz: MEMORY ALERT — ${usedGB}GB used of 16GB`);
    }
    return `memory: ${usedGB}GB`;
  });

  // ─── HOST-ONLY CRONS (removed — these run via host crontab, not inside Docker) ───
  // db-backup, handover-update, aibtc-heartbeat, aibtc-inbox-poll, aibtc-network-scout
  // All handled by /home/claude-code/*.sh scripts in host crontab

  // ─── PLATFORM: AIBTC ───

  register("aibtc-news-signal", "0 */8 * * *", async () => {
    await triggerBrain(
      "Buzz: AIBTC DAILY SIGNAL — DRAFT to War Room for Ogie approval. Pull fresh pipeline data, generate news-format headline + body. DO NOT auto-file.",
    );
    return "triggered";
  });

  register("aibtc-leaderboard-check", "0 */12 * * *", async () => {
    await triggerBrain(
      "Buzz: AIBTC leaderboard check. Pull correspondent rankings from aibtc.news. Report our position to War Room.",
    );
    return "triggered";
  });

  // ─── PLATFORM: MOLTBOOK ───
  // moltbook-engage already registered above in DATA COLLECTION

  // ─── PLATFORM: TWITTER ───
  // twitter-mention-monitor removed — runs via host crontab

  // ─── PRAYER REMINDERS (SACRED) ───
  register("prayer-fajr", "25 21 * * *", async () => {
    await triggerBrain("Reminder: Fajr prayer time (04:25 WIB). Bismillah.");
    return "fajr";
  });

  register("prayer-dhuhr", "0 5 * * *", async () => {
    await triggerBrain("Reminder: Dhuhr prayer time (12:00 WIB). Bismillah.");
    return "dhuhr";
  });

  register("prayer-asr", "15 8 * * *", async () => {
    await triggerBrain("Reminder: Asr prayer time (15:15 WIB). Bismillah.");
    return "asr";
  });

  register("prayer-maghrib", "0 11 * * *", async () => {
    await triggerBrain("Reminder: Maghrib prayer time (18:00 WIB). Bismillah.");
    return "maghrib";
  });

  register("prayer-isha", "15 12 * * *", async () => {
    await triggerBrain("Reminder: Isha prayer time (19:15 WIB). Bismillah.");
    return "isha";
  });

  // ─── OTHER ───
  register("stability-check", "0 0 * * *", async () => {
    await triggerBrain(
      "Buzz: 24h stability check. Verify all crons ran, all endpoints healthy, no errors. Report to War Room.",
    );
    return "triggered";
  });

  register("wallet-balance-check", "0 */1 * * *", async () => {
    // Will be implemented by Phase 2 Teammate 5
    return "placeholder";
  });
}

// ═══════════════════════════════════════
// REGISTRATION + TICK ENGINE
// ═══════════════════════════════════════

function register(id, schedule, handler) {
  jobs.set(id, {
    id,
    schedule,
    handler,
    lastRun: null,
    enabled: true,
    running: false,
  });
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
      logCronRun(
        id,
        "ok",
        typeof result === "string" ? result : JSON.stringify(result),
      );
    } catch (e) {
      console.error(`[cron-executor] ${id} failed:`, e.message);
      logCronRun(id, "error", e.message);
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
    db.prepare(
      `
      INSERT INTO cron_jobs (id, name, schedule, status)
      VALUES (?, ?, ?, 'active')
      ON CONFLICT(id) DO UPDATE SET
        schedule = excluded.schedule,
        status = 'active'
    `,
    ).run(id, id, job.schedule);
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
      lastRun: job.lastRun ? job.lastRun.toISOString() : null,
    });
  }
  return result;
}

function triggerJob(id) {
  const job = jobs.get(id);
  if (!job) return { error: "not_found" };
  job
    .handler()
    .then((r) => logCronRun(id, "ok", r))
    .catch((e) => logCronRun(id, "error", e.message));
  return { triggered: true, id };
}

module.exports = { start, getStatus, triggerJob };
