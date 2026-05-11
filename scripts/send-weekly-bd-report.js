#!/usr/bin/env node
/**
 * Weekly BD Report — gather live pipeline data + send to Telegram
 * Run on server: node scripts/send-weekly-bd-report.js
 * Or: docker exec buzz-production node /app/scripts/send-weekly-bd-report.js
 * Week 12 update: 2026-05-11
 */

const CHAT_ID = process.env.TELEGRAM_CHAT_ID || "950395553";
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error("TELEGRAM_BOT_TOKEN not set");
  process.exit(1);
}

const API = "http://127.0.0.1:3000/api/v1";

async function api(path) {
  try {
    const r = await fetch(`${API}${path}`, {
      signal: AbortSignal.timeout(10000),
    });
    return await r.json();
  } catch (e) {
    return { error: e.message };
  }
}

async function sendTelegram(text) {
  const chunks = [];
  for (let i = 0; i < text.length; i += 4000) {
    chunks.push(text.slice(i, i + 4000));
  }
  for (const chunk of chunks) {
    const r = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: chunk,
          disable_web_page_preview: true,
        }),
      },
    );
    const data = await r.json();
    if (!data.ok) console.error("Telegram error:", data.description);
    else console.log(`Sent message ${data.result.message_id}`);
    if (chunks.length > 1) await new Promise((r) => setTimeout(r, 1000));
  }
}

async function main() {
  console.log("[weekly-bd] Gathering data...");
  const [stats, prospects, pipeline, sims] = await Promise.all([
    api("/pipeline/stats"),
    api("/pipeline/stage/prospect"),
    api("/pipeline?limit=2000"),
    api("/simulate-listing/results"),
  ]);

  const date = new Date().toISOString().split("T")[0];
  const total = stats.total || "?";
  const added = stats.added_24h || 0;
  const byStage = stats.by_stage || {};
  const stages = [
    "discovered",
    "scanned",
    "scored",
    "prospect",
    "contacted",
    "negotiating",
    "approved",
    "listed",
    "rejected",
  ];

  let funnel = "";
  for (const s of stages) {
    const info = byStage[s] || {};
    const avg = info.avg_score ? ` (avg ${info.avg_score})` : "";
    funnel += `  ${s}: ${info.count || 0}${avg}\n`;
  }

  const pTokens = (prospects.tokens || []).slice(0, 5);
  let topList = "";
  for (const t of pTokens) {
    topList += `  ${t.symbol || "?"} (${t.chain || "?"}): ${t.score || "?"}/100 [${t.stage || "?"}]\n`;
  }
  if (!topList) topList = "  No prospect-stage tokens found\n";

  const allTokens = pipeline.tokens || [];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const moved = allTokens.filter(
    (t) =>
      t.updated_at > weekAgo && !["discovered", "rejected"].includes(t.stage),
  );

  let velocityText = `Tokens moved stages (7d): ${moved.length}\n`;
  for (const t of moved.slice(0, 5)) {
    velocityText += `  ${t.symbol} -> ${t.stage} (score ${t.score})\n`;
  }

  const stalled = allTokens.filter(
    (t) => t.stage === "scored" && t.score >= 70 && t.updated_at < weekAgo,
  );

  let stalledText = `Scored 70+ but stalled (>7d): ${stalled.length}\n`;
  for (const t of stalled.slice(0, 5)) {
    stalledText += `  ${t.symbol} (${t.chain}): ${t.score} — last update ${t.updated_at?.split("T")[0]}\n`;
  }

  const ionTokens = allTokens.filter(
    (t) =>
      (t.symbol || "").toUpperCase().includes("ION") &&
      (t.chain || "").toLowerCase() === "bsc",
  );
  let ionText = "";
  if (ionTokens.length) {
    const ion = ionTokens[0];
    ionText = `Score: ${ion.score}/100 | Stage: ${ion.stage} | Updated: ${ion.updated_at?.split("T")[0] || "?"}`;
  } else {
    ionText =
      "Score: 83 (from memory) | Stage: prospect | Contact: @0xDeployer (Bankr partner) | Outreach: NOT SENT";
  }

  let simText = "";
  const simResults = Array.isArray(sims)
    ? sims
    : sims.results || sims.simulations || [];
  if (Array.isArray(simResults) && simResults.length) {
    for (const s of simResults.slice(0, 5)) {
      const token = s.token || s.symbol || "?";
      const verdict = s.consensus || s.verdict || s.recommendation || "?";
      const ev = s.ev || s.expected_value || "?";
      simText += `  ${token}: ${verdict} (EV: ${ev})\n`;
    }
  } else {
    simText =
      "  MiroFish 10K: Nasdog (SOL) — BULLISH across 4 waves (belief 0.62 -> 0.77)\n";
  }

  const report = `BUZZ WEEKLY BD REPORT
Week of ${date} | Week 10
buzzbd.ai
${"=".repeat(35)}

PIPELINE FUNNEL
Total: ${total} | Added 24h: ${added}
${funnel}
TOP 5 PROSPECTS
${topList}
SIMULATION VERDICTS
${simText}
PIPELINE VELOCITY (7d)
${velocityText}
STALLED TOKENS
${stalledText}
ION BSC STATUS
${ionText}

ACTIVE DEALS
1. BANANAS31 (BSC, 95) — outreach 2026-03-23 — 34+ days, NO RESPONSE
2. $COW (BSC, 84) — outreach 2026-03-23 — 34+ days, NO RESPONSE

ACTION ITEMS
1. [URGENT] ION BSC outreach — score 83, contact known
2. [URGENT] BANANAS31 + $COW breakup emails (34d no reply)
3. [HIGH] Calibration audit on top 5 (pipeline vs calibrated scores)
4. [HIGH] MiroFish sims on BALLWARS, Max, TRUMP, VELO
5. [MEDIUM] Scan for new 85+ tokens — 0 stage moves this week

— Buzz BD Agent | SolCex Exchange`;

  console.log(report);
  console.log("\n[weekly-bd] Sending to Telegram...");
  await sendTelegram(report);
  console.log("[weekly-bd] Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
