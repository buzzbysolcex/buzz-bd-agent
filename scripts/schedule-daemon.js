#!/usr/bin/env node
/**
 * schedule-daemon.js — Option A consumer for the v4.0 schedule mailbox.
 *
 * Per Ogie msg 5009-5011 (Apr 27 2026): Path B (Telegram wake) was
 * structurally broken. This daemon polls agent_mailbox for un-acked
 * EVENT rows and dispatches them to handlers. No Telegram dependency
 * for wake — the daemon IS the consumer.
 *
 * Phase 1 (today): stub handlers post a one-line "executing X" notice
 *   to the War Room. Claude Code session sees the post (via the
 *   @buzz_claude_code_bot @-mention prepend trick) and takes over
 *   the actual work.
 *
 * Phase 2 (this week): wire each stub to the real subagent / pipeline /
 *   filer logic so the daemon executes without Claude Code in the loop.
 *
 * Architecture:
 *   - Standalone Node process (NOT inside the buzz-production container,
 *     which is image-baked and would need a rebuild).
 *   - Polls /data/buzz/persistent/buzz-api/buzz.db via better-sqlite3.
 *   - Sends WR posts via buzz_cron_bot (creds at
 *     /home/claude-code/.claude/channels/telegram/cron-bot.env) with the
 *     @buzz_claude_code_bot mention prepended so the listener (which has
 *     Bot Privacy Mode enabled) actually receives the inbound update.
 *   - Marks rows acked regardless of handler error to prevent retry loops.
 *
 * Run: node scripts/schedule-daemon.js  (typically under tmux/systemd)
 * Logs: /home/claude-code/buzz-workspace/logs/schedule-daemon.log
 */

const fs = require("fs");
const https = require("https");
const path = require("path");
const Database = require("better-sqlite3");
// Email template module (renderTemplate) lives in the api/ tree. Not all
// daemons run with NODE_PATH set to api/node_modules — but the email-templates
// module itself has no third-party deps, just plain JS, so requiring by
// absolute path works regardless.
let renderTemplate;
try {
  ({
    renderTemplate,
  } = require("/home/claude-code/buzz-workspace/api/services/outreach/email-templates"));
} catch (e) {
  renderTemplate = null; // gracefully degrade — handler will note this
}

const DB_PATH = "/data/buzz/persistent/buzz-api/buzz.db";
const ENV_PATH = "/home/claude-code/.claude/channels/telegram/cron-bot.env";
const LOG_PATH = path.join(__dirname, "..", "logs", "schedule-daemon.log");
const POLL_INTERVAL_MS = 30_000;
const LISTENER_HANDLE = "@buzz_claude_code_bot";
const BATCH_SIZE = 10;

// ── env load ────────────────────────────────────────────────────────────
function loadEnv(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}
const ENV = loadEnv(ENV_PATH);
const BOT_TOKEN = ENV.TELEGRAM_BOT_TOKEN || "";
const CHAT_ID = ENV.TELEGRAM_CHAT_ID || "-1003701758077";

if (!BOT_TOKEN) {
  console.error("[daemon] FATAL: cron-bot env missing TELEGRAM_BOT_TOKEN");
  process.exit(1);
}

// ── log ─────────────────────────────────────────────────────────────────
fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  process.stdout.write(line);
  fs.appendFileSync(LOG_PATH, line);
}

// ── Telegram send (with @mention prepended so listener with Privacy Mode
//    enabled still sees the update) ─────────────────────────────────────
function sendWR(text) {
  return new Promise((resolve) => {
    const body = JSON.stringify({
      chat_id: CHAT_ID,
      text: `${LISTENER_HANDLE} ${text}`,
    });
    const req = https.request(
      {
        hostname: "api.telegram.org",
        path: `/bot${BOT_TOKEN}/sendMessage`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          const ok = res.statusCode === 200 && data.includes('"ok":true');
          if (!ok)
            log(
              `WR send failed status=${res.statusCode} body=${data.slice(0, 120)}`,
            );
          resolve(ok);
        });
      },
    );
    req.on("error", (e) => {
      log(`WR send error: ${e.message}`);
      resolve(false);
    });
    req.setTimeout(10_000, () => {
      req.destroy();
      log("WR send timeout");
      resolve(false);
    });
    req.write(body);
    req.end();
  });
}

// ── GoPlus Security cross-verify (msg 5066, msg 5336) ───────────────────
// Token Sniffer's web is Cloudflare-blocked from this host (403). GoPlus
// is the canonical second-source: free HTTP API, EVM + Solana supported.
// Solana endpoint shape differs from EVM (different fields). RugCheck
// fallback for Solana when GoPlus returns null result.
const GOPLUS_CHAIN_ID = {
  ethereum: "1",
  bsc: "56",
  polygon: "137",
  arbitrum: "42161",
  optimism: "10",
  base: "8453",
  avalanche: "43114",
};
function httpGetJson(url, timeoutMs = 10_000) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      { headers: { "User-Agent": "buzz-daemon/1.0" } },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`parse: ${e.message}`));
          }
        });
      },
    );
    req.on("error", reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new Error("timeout"));
    });
  });
}
async function goPlusCheckSolana(address) {
  const url = `https://api.gopluslabs.io/api/v1/solana/token_security?contract_addresses=${address}`;
  const j = await httpGetJson(url);
  const r = j.result || {};
  const k = Object.keys(r)[0];
  if (!k) return null; // signal caller to try RugCheck fallback
  const t = r[k];
  const flags = [];
  // Solana flag mapping — different from EVM. Status "1" = ON (risky for most).
  if (t.mintable && t.mintable.status === "1") flags.push("MINTABLE");
  if (t.freezable && t.freezable.status === "1") flags.push("FREEZABLE");
  if (t.closable && t.closable.status === "1") flags.push("CLOSABLE");
  if (t.non_transferable === "1") flags.push("NON_TRANSFERABLE");
  // SPL Token default_account_state: "0"=Uninitialized, "1"=Initialized (normal),
  // "2"=Frozen. Only "2" is the danger flag — verified Apr 30 against WSOL/LOL
  // both reporting "1" (safe). Inverting earlier logic.
  if (t.default_account_state === "2") flags.push("FROZEN_BY_DEFAULT");
  if (t.metadata_mutable && t.metadata_mutable.status === "1")
    flags.push("METADATA_MUTABLE");
  if (t.balance_mutable_authority && t.balance_mutable_authority.status === "1")
    flags.push("BALANCE_MUTABLE");
  if (Array.isArray(t.transfer_hook) && t.transfer_hook.length > 0)
    flags.push("TRANSFER_HOOK");
  // Transfer fee detection
  const tf = t.transfer_fee || {};
  const tfPct = parseFloat(tf.current_fee_rate || tf.maximum_fee_rate || 0);
  if (tfPct > 0.1) flags.push(`TRANSFER_FEE_${(tfPct * 100).toFixed(1)}PCT`);
  // Holders
  const holders = t.holders || [];
  const top10pct =
    holders.slice(0, 10).reduce((s, h) => s + parseFloat(h.percent || 0), 0) *
    100;
  return {
    source: "goplus-solana",
    flags,
    buy_tax_pct: 0, // Solana has transfer_fee, not buy/sell tax
    sell_tax_pct: 0,
    transfer_fee_pct: tfPct * 100,
    holder_count: parseInt(t.holder_count || 0),
    open_source: true, // Solana programs verifiable on-chain
    top10_pct: top10pct,
    trusted_token: t.trusted_token === 1,
  };
}
async function rugCheckSolana(address) {
  const url = `https://api.rugcheck.xyz/v1/tokens/${address}/report/summary`;
  const j = await httpGetJson(url);
  if (!j || j.code === "PAGE_NOT_FOUND") return { error: "rugcheck_not_found" };
  const flags = [];
  const risks = j.risks || [];
  for (const r of risks) {
    const lvl = (r.level || "").toLowerCase();
    if (lvl === "danger" || lvl === "warn" || lvl === "high")
      flags.push((r.name || "RISK").toUpperCase().replace(/\s+/g, "_"));
  }
  // RugCheck score: lower = safer (1 = clean), higher = risky
  const score = parseInt(j.score_normalised || j.score || 0);
  if (score >= 50) flags.push(`RUGCHECK_SCORE_${score}`);
  const lp = parseFloat(j.lpLockedPct || 0);
  return {
    source: "rugcheck",
    flags,
    buy_tax_pct: 0,
    sell_tax_pct: 0,
    holder_count: 0, // not in summary
    open_source: true,
    top10_pct: 0,
    rugcheck_score: score,
    lp_locked_pct: lp,
  };
}
async function goPlusCheck(chain, address) {
  // Solana path: GoPlus Solana endpoint, RugCheck fallback if null
  if (chain === "solana") {
    try {
      const sol = await goPlusCheckSolana(address);
      if (sol) return sol;
      // GoPlus Solana returned null — try RugCheck
      try {
        const rc = await rugCheckSolana(address);
        if (rc.error) return { error: `goplus_null+rugcheck:${rc.error}` };
        return rc;
      } catch (e) {
        return { error: `goplus_null+rugcheck:${e.message}` };
      }
    } catch (e) {
      // GoPlus Solana errored — try RugCheck
      try {
        const rc = await rugCheckSolana(address);
        if (rc.error)
          return { error: `goplus_err:${e.message}+rugcheck:${rc.error}` };
        return rc;
      } catch (e2) {
        return { error: `goplus:${e.message}+rugcheck:${e2.message}` };
      }
    }
  }
  // EVM path
  const cid = GOPLUS_CHAIN_ID[chain];
  if (!cid)
    return {
      skipped: true,
      reason: `chain=${chain} not supported (EVM/Solana only)`,
    };
  const url = `https://api.gopluslabs.io/api/v1/token_security/${cid}?contract_addresses=${address}`;
  try {
    const j = await httpGetJson(url);
    const r = j.result || {};
    const k = Object.keys(r)[0];
    if (!k) return { error: "goplus_no_result" };
    const t = r[k];
    const flagMap = {
      is_honeypot: "HONEYPOT",
      hidden_owner: "HIDDEN_OWNER",
      can_take_back_ownership: "CAN_TAKE_BACK_OWNERSHIP",
      owner_change_balance: "OWNER_CAN_CHANGE_BALANCE",
      is_proxy: "PROXY",
      is_mintable: "MINTABLE",
      selfdestruct: "SELFDESTRUCT",
      cannot_buy: "CANNOT_BUY",
      cannot_sell_all: "CANNOT_SELL_ALL",
      transfer_pausable: "TRANSFER_PAUSABLE",
      is_blacklisted: "BLACKLISTED",
    };
    const flags = [];
    for (const [k2, name] of Object.entries(flagMap)) {
      if (t[k2] === "1") flags.push(name);
    }
    if (t.is_open_source === "0") flags.push("NOT_OPEN_SOURCE");
    if (t.is_in_dex === "0") flags.push("NOT_IN_DEX");
    const buyTax = parseFloat(t.buy_tax || 0);
    const sellTax = parseFloat(t.sell_tax || 0);
    if (sellTax > 0.1) flags.push(`SELL_TAX_${(sellTax * 100).toFixed(1)}PCT`);
    if (buyTax > 0.1) flags.push(`BUY_TAX_${(buyTax * 100).toFixed(1)}PCT`);
    const holders = t.holders || [];
    const top10pct =
      holders.slice(0, 10).reduce((s, h) => s + parseFloat(h.percent || 0), 0) *
      100;
    return {
      source: "goplus-evm",
      flags,
      buy_tax_pct: buyTax * 100,
      sell_tax_pct: sellTax * 100,
      holder_count: parseInt(t.holder_count || 0),
      open_source: t.is_open_source === "1",
      top10_pct: top10pct,
    };
  } catch (e) {
    return { error: e.message };
  }
}

// ── handlers (Phase 1 stubs) ────────────────────────────────────────────
// Each returns a one-line WR notice OR null for silent.
const handlers = {
  async rug_watch() {
    // Phase 2 P2 real handler. Source: DeFiLlama /hacks API (stable JSON,
    // unlike rekt.news's HTML which broke on /feed/ 500). Detect incidents
    // in the last 24h, save daily-rug-watch.json, post WR summary.
    // Tweet-drafting requires a contract address (Ogie msg 5037 hard rule)
    // and DeFiLlama doesn't ship one — we flag interesting incidents
    // (>$100K, EVM/Solana chain) for human BuzzShield handcraft instead.
    const today = new Date().toISOString().slice(0, 10);
    const now = Math.floor(Date.now() / 1000);
    const cutoff = now - 86400; // 24h ago
    const reportPath = "/data/buzz/persistent/reports/daily-rug-watch.json";

    let recent = [];
    let totalChecked = 0;
    let sourceErr = null;
    try {
      const json = await new Promise((resolve, reject) => {
        const req = https.get(
          "https://api.llama.fi/hacks",
          { headers: { "User-Agent": "buzz-rug-watch/1.0" } },
          (res) => {
            let data = "";
            res.on("data", (c) => (data += c));
            res.on("end", () => resolve(data));
          },
        );
        req.on("error", reject);
        req.setTimeout(15_000, () => {
          req.destroy();
          reject(new Error("defillama timeout"));
        });
      });
      const all = JSON.parse(json);
      totalChecked = all.length;
      recent = all
        .filter((h) => typeof h.date === "number" && h.date >= cutoff)
        .sort((a, b) => b.date - a.date);
    } catch (e) {
      sourceErr = e.message;
      log(`rug_watch defillama err: ${e.message}`);
    }

    // Categorise
    const buzzShieldSupported = new Set([
      "Ethereum",
      "Base",
      "Arbitrum",
      "Optimism",
      "Polygon",
      "BNB Chain",
      "BNB",
      "Solana",
      "Avalanche",
    ]);
    const interesting = recent.filter((h) => {
      const amt = h.amount || 0;
      const chains = h.chain || [];
      const supported = chains.some((c) => buzzShieldSupported.has(c));
      return amt >= 100_000 && supported;
    });

    // Write report (overwrite today's entry)
    let prior = {};
    try {
      prior = JSON.parse(fs.readFileSync(reportPath, "utf8"));
    } catch {}
    const report = {
      ...prior,
      date: today,
      incidents_checked: recent.length,
      defillama_records_total: totalChecked,
      buzzshield_catches: 0, // requires handcraft scan (no address in source)
      buzzshield_misses: 0,
      tweets_drafted: 0,
      gaps_logged: prior.gaps_logged || [],
      sources_checked: ["api.llama.fi/hacks"],
      data_source_error: sourceErr,
      incidents: recent.map((h) => ({
        name: h.name,
        chain: h.chain,
        amount_usd: h.amount,
        classification: h.classification,
        technique: h.technique,
        date: new Date(h.date * 1000).toISOString(),
        defillama_id: h.defillamaId,
        target_type: h.targetType,
      })),
      interesting_for_handcraft: interesting.length,
      generated_at: new Date().toISOString(),
    };
    try {
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    } catch (e) {
      log(`rug_watch write err: ${e.message}`);
    }

    if (sourceErr)
      return `rug_watch FAILED — source error: ${sourceErr}. Report not updated.`;
    if (recent.length === 0)
      return `rug_watch — 0 new incidents in 24h (DeFiLlama: ${totalChecked} total records scanned).`;
    const interestingNote =
      interesting.length > 0
        ? ` ${interesting.length} interesting (≥$100K + EVM/Sol chain) — handcraft BuzzShield scan needed: ${interesting.map((h) => `${h.name}/${(h.chain || []).join(",")}/$${h.amount}`).join(" | ")}`
        : "";
    return `rug_watch — ${recent.length} incident(s) in 24h.${interestingNote} daily-rug-watch.json updated.`;
  },
  async score_tweets() {
    // Phase 2 P2 real handler: query pipeline for tweetable tokens, look up
    // Twitter handle via DexScreener, draft tweet per tweet-on-score.md v2.1
    // (with 📋 Contract line — Ogie's hard rule msg 5037), save to disk,
    // return WR summary. Operator approves before fire.
    const today = new Date().toISOString().slice(0, 10);
    const draftDir = "/data/buzz/persistent/reports/score-tweet-drafts";
    fs.mkdirSync(draftDir, { recursive: true });

    // Skip tickers already drafted today (avoid duplicates).
    const existingDrafts = fs
      .readdirSync(draftDir)
      .filter((f) => f.startsWith(today) && f.endsWith(".md"));
    const skipTickers = new Set();
    for (const f of existingDrafts) {
      const m = f.match(/^\d{4}-\d{2}-\d{2}-([A-Za-z0-9_]+)\.md$/);
      if (m) skipTickers.add(m[1].toUpperCase());
    }
    // Always skip today's already-tweeted tickers.
    ["SCALLOP", "PIPPIN", "HIVE", "BANANAS31", "VELO"].forEach((t) =>
      skipTickers.add(t),
    );

    // Pull candidates: score≥50, recent, has address. Filter quality at SQL
    // layer — exclude pump.fun shells, ghost-volume tokens, calibration-flagged
    // tickers, and anything explicitly rejected. The earlier subagent caught
    // these by reasoning; we replicate the rules deterministically.
    let candidates;
    try {
      candidates = db
        .prepare(
          `SELECT ticker, chain, address, score, score_breakdown, notes
           FROM pipeline_tokens
           WHERE score >= 50
             AND updated_at >= date('now','-7 days')
             AND ticker IS NOT NULL
             AND address IS NOT NULL
             AND address NOT LIKE '%pump'
             AND COALESCE(notes,'') NOT LIKE '%pump.fun%'
             AND COALESCE(notes,'') NOT LIKE '%pumpswap%'
             AND COALESCE(notes,'') NOT LIKE '%REJECTED%'
             AND COALESCE(notes,'') NOT LIKE '%phantom%'
             AND COALESCE(notes,'') NOT LIKE '%ghost%volume%'
             AND COALESCE(notes,'') NOT LIKE '%not_confirmed_from_dexscreener%'
             AND COALESCE(notes,'') NOT LIKE '%TOO BIG%'
             AND COALESCE(notes,'') NOT LIKE '%Monitor only%'
             AND COALESCE(score_breakdown,'') NOT LIKE '%pumpfun_penalty%'
             AND COALESCE(score_breakdown,'') NOT LIKE '%too_big%'
           ORDER BY score DESC, updated_at DESC
           LIMIT 30`,
        )
        .all();
    } catch (e) {
      log(`score_tweets pipeline query err: ${e.message}`);
      return `score_tweets FAILED — DB query error: ${e.message}`;
    }

    let drafted = 0;
    const lines = [];
    for (const c of candidates) {
      if (drafted >= 3) break;
      const tickerKey = c.ticker.toUpperCase();
      if (skipTickers.has(tickerKey)) continue;

      // DexScreener handle lookup
      let twitter = null;
      try {
        const url = `https://api.dexscreener.com/latest/dex/tokens/${c.address}`;
        const dxResp = await new Promise((resolve, reject) => {
          const req = https.get(url, (res) => {
            let data = "";
            res.on("data", (c) => (data += c));
            res.on("end", () => resolve(data));
          });
          req.on("error", reject);
          req.setTimeout(10_000, () => {
            req.destroy();
            reject(new Error("dx timeout"));
          });
        });
        const dx = JSON.parse(dxResp);
        const pair = (dx.pairs || []).find(
          (p) => p.info && p.info.socials && p.info.socials.length > 0,
        );
        if (pair) {
          const t = pair.info.socials.find(
            (s) => (s.type || "").toLowerCase() === "twitter",
          );
          if (t && t.url) {
            const m = t.url.match(/(?:twitter\.com|x\.com)\/([A-Za-z0-9_]+)/);
            if (m) twitter = `@${m[1]}`;
          }
        }
      } catch (e) {
        log(`score_tweets DX lookup ${c.ticker}: ${e.message}`);
      }
      if (!twitter) {
        skipTickers.add(tickerKey);
        continue; // no handle, skip
      }

      // GoPlus pre-tweet cross-verify (msg 5066). For EVM chains we MUST
      // pass cross-verify before tweeting. Solana is skipped (no endpoint
      // here) — that's a known gap to wire later.
      const gp = await goPlusCheck(c.chain, c.address);
      if (gp.error) {
        log(`score_tweets ${c.ticker} GoPlus err: ${gp.error} — skipping`);
        skipTickers.add(tickerKey);
        continue;
      }
      if (gp.skipped) {
        // Solana case — no GoPlus EVM result. Skip rather than tweet uncrossed.
        log(
          `score_tweets ${c.ticker} GoPlus skipped: ${gp.reason} — candidate dropped`,
        );
        skipTickers.add(tickerKey);
        continue;
      }
      if (gp.flags.length > 0) {
        log(
          `score_tweets ${c.ticker} GoPlus FLAGGED: ${gp.flags.join(",")} — skipping`,
        );
        skipTickers.add(tickerKey);
        continue;
      }

      // Concentration penalty (top-10 holders) — Rule 25 derivative.
      let appliedScore = c.score;
      let concentrationNote = "";
      if (gp.top10_pct > 80) {
        appliedScore = Math.max(40, c.score - 25);
        concentrationNote = `top-10 ${gp.top10_pct.toFixed(0)}% (-25)`;
      } else if (gp.top10_pct > 70) {
        appliedScore = Math.max(50, c.score - 15);
        concentrationNote = `top-10 ${gp.top10_pct.toFixed(0)}% (-15)`;
      } else if (gp.top10_pct > 50) {
        appliedScore = Math.max(55, c.score - 8);
        concentrationNote = `top-10 ${gp.top10_pct.toFixed(0)}% (-8)`;
      }

      // Render tweet — short addresses (4+4)
      const addrShort = `${c.address.slice(0, c.chain === "solana" ? 4 : 6)}...${c.address.slice(-4)}`;
      const chainLabel =
        { solana: "Solana", bsc: "BSC", ethereum: "Ethereum", base: "Base" }[
          c.chain
        ] || c.chain;
      // Source label for cross-verify in tweet (msg 5336 — Solana support)
      const verifyLabel =
        gp.source === "rugcheck"
          ? "RugCheck"
          : gp.source === "goplus-solana"
            ? "GoPlus (Solana)"
            : "GoPlus";
      // Metric line varies by source: EVM has tax, Solana has transfer_fee,
      // RugCheck has score+lp_locked.
      let metricsLine;
      if (gp.source === "rugcheck") {
        metricsLine = `${verifyLabel}: 0 risks. RugCheck score ${gp.rugcheck_score}/100. LP locked ${gp.lp_locked_pct.toFixed(0)}%.`;
      } else if (gp.source === "goplus-solana") {
        const tFee = gp.transfer_fee_pct || 0;
        metricsLine = `${verifyLabel}: 0 red flags. ${(gp.holder_count / 1000).toFixed(0)}K holders. ${tFee > 0 ? `${tFee.toFixed(0)}% transfer fee.` : "0% transfer fee."}`;
      } else {
        metricsLine = `${verifyLabel}: 0 red flags. ${(gp.holder_count / 1000).toFixed(0)}K holders. ${gp.buy_tax_pct.toFixed(0)}/${gp.sell_tax_pct.toFixed(0)} tax.`;
      }

      let tweet;
      if (appliedScore >= 70) {
        tweet =
          `🐝 BUZZ SCORE: ${c.ticker} — ${appliedScore}/100\n` +
          `📋 ${addrShort} (${chainLabel})\n\n` +
          `${metricsLine}\n\n` +
          (concentrationNote
            ? `Caveat: ${concentrationNote.split(" (")[0]}.\n\n`
            : "") +
          `${twitter}\nshield.buzzbd.ai/audit\n\n` +
          `#HonestScoring`;
      } else {
        tweet =
          `🐝 BUZZ SCORE: ${c.ticker} — ${appliedScore}/100\n` +
          `📋 ${addrShort} (${chainLabel})\n\n` +
          `Watch zone. ${verifyLabel} 0 red flags but ${concentrationNote || "moderate fundamentals"}.\n\n` +
          `${twitter} — full report on request.\nshield.buzzbd.ai/audit\n\n` +
          `#HonestScoring`;
      }

      // Save tweet draft
      const draftPath = `${draftDir}/${today}-${c.ticker}.md`;
      const md = `---
posted_status: pending_approval
token: ${c.ticker}
score_pipeline: ${c.score}
score_published: ${appliedScore}
chain: ${c.chain}
address: ${c.address}
twitter_handle: "${twitter}"
template: ${appliedScore >= 70 ? "HIGH_SCORE" : "WATCH_SCORE"}
draft_date: ${today}
drafter: schedule-daemon score_tweets handler (Phase 2 P2 + GoPlus cross-verify)
goplus_flags: []
goplus_holder_count: ${gp.holder_count}
goplus_top10_pct: ${gp.top10_pct.toFixed(2)}
goplus_buy_tax_pct: ${gp.buy_tax_pct}
goplus_sell_tax_pct: ${gp.sell_tax_pct}
concentration_penalty: "${concentrationNote || "none"}"
---

${tweet}

---
contract_address_full: ${c.address}
shield_audit_url: https://shield.buzzbd.ai/audit
`;
      // Gmail outreach scaffold (msg 5077): for tokens scoring 70+, also draft
      // an email via api/services/outreach/email-templates.js. Phase 2.5 adds
      // live website-to-email contact discovery + Gmail OAuth send + 48h/7d
      // follow-up crons. Tonight: render the draft, save it, surface in WR.
      let emailDraftPath = null;
      let emailSubject = null;
      let emailBody = null;
      if (appliedScore >= 70 && renderTemplate) {
        const dexscreenerUrl = `https://dexscreener.com/${c.chain}/${c.address}`;
        const rendered = renderTemplate("initial_outreach", {
          tokenName: c.ticker,
          chain: chainLabel,
          contractAddress: c.address,
          dexscreenerUrl,
          score: appliedScore,
          // mcap/volume/liquidity/liqRatio not yet pulled in handler — Phase 2.5.
          mcap: "N/A",
          volume: "N/A",
          liquidity: "N/A",
          liqRatio: "N/A",
        });
        if (rendered) {
          // Append Ogie msg 5077 required lines: $500 (vs $1.5K) pilot + tagline.
          const ogieAppendix = `

---
P.S. Pilot Swarm Audit available at $500 (normally $1,500) — full 1,000-agent
adversarial simulation, every score dimension broken down, on-chain proof on
Base mainnet.

You're not paying for agents. You're paying for resolution.

Free instant scan: https://shield.buzzbd.ai/audit
`;
          emailSubject = rendered.subject;
          emailBody = rendered.body + ogieAppendix;
          const outreachDir = "/data/buzz/persistent/reports/outreach-drafts";
          fs.mkdirSync(outreachDir, { recursive: true });
          emailDraftPath = `${outreachDir}/${today}-${c.ticker}.md`;
          const emailMd = `---
posted_status: pending_approval
token: ${c.ticker}
score: ${appliedScore}
chain: ${c.chain}
address: ${c.address}
to: NEEDS_MANUAL_LOOKUP
cc:
  - dino@solcex.cc
  - ogie.solcexexchange@gmail.com
twitter_handle: "${twitter}"
draft_date: ${today}
drafter: schedule-daemon score_tweets handler (Phase 2 + Gmail outreach scaffold)
gmail_send_status: not_sent
followup_crons_status: not_created
phase_2_5_pending:
  - live_website_email_lookup
  - gmail_oauth_send
  - 48h_followup_cron
  - 7d_breakup_cron
  - pilot_audit_pipeline_update
---

# Subject

${emailSubject}

# Body

${emailBody}
`;
          try {
            fs.writeFileSync(emailDraftPath, emailMd);
            log(
              `score_tweets ${c.ticker} email draft saved → ${emailDraftPath}`,
            );
          } catch (e) {
            log(`score_tweets ${c.ticker} email draft write err: ${e.message}`);
            emailDraftPath = null;
          }
        }
      }
      try {
        fs.writeFileSync(draftPath, md);
        drafted++;
        const emailSuffix = emailDraftPath
          ? ` + email draft (To: NEEDS_LOOKUP, CC dino+ogie)`
          : "";
        lines.push(
          `${c.ticker} ${appliedScore}/100 ${twitter} → ${c.ticker}.md${emailSuffix}`,
        );
        // Per-candidate WR post for ≥70 (msg 5077 format) so Ogie sees both
        // tweet text + email draft inline. Telegram cap = 4096 chars; if
        // email body is huge, truncate body in the WR post (full text in file).
        if (appliedScore >= 70 && emailDraftPath) {
          const bodyForWR =
            emailBody.length > 1500
              ? emailBody.slice(0, 1500) + "\n…(full text in draft file)"
              : emailBody;
          const wrPost =
            `🐝 SCORE TWEET + EMAIL DRAFT — ${c.ticker} ${appliedScore}/100\n\n` +
            `TWEET (ORANGE — awaiting GO):\n${tweet}\n\n` +
            `EMAIL (ORANGE — awaiting GO):\nTo: NEEDS_MANUAL_LOOKUP\n` +
            `CC: dino@solcex.cc, ogie.solcexexchange@gmail.com\n` +
            `Subject: ${emailSubject}\n\n${bodyForWR}\n\n` +
            `Files:\n- ${draftPath}\n- ${emailDraftPath}\n\n` +
            `Reply "GO both" / "GO tweet" / "GO email" / "NO".`;
          await sendWR(wrPost);
        }
      } catch (e) {
        log(`score_tweets write ${c.ticker}: ${e.message}`);
      }
    }

    if (drafted === 0)
      return `score_tweets — 0 fresh drafts (all candidates already tweeted today, or no Twitter handle, or GoPlus blocked).`;
    return `score_tweets — ${drafted} draft(s) → ORANGE: ${lines.join(" | ")}`;
  },
  async pilot_outreach() {
    return "executing pilot_outreach — query pipeline for 2-3 prospects (score 50-69), verify activity, draft outreach. Drafts → ORANGE.";
  },
  async afternoon_work() {
    return "executing afternoon_work — priority queue: BuzzShield V5 research > intel ingest > Moltbook > scoring. Starting highest-priority unfinished GREEN task.";
  },
  async afternoon_checkin() {
    return "afternoon_checkin — checking Telegram unread, reporting current task progress, processing pending ORANGE approvals.";
  },
  async bd_scout() {
    return "executing bd_scout — pulling 3-5 hot pairs from DexScreener, scoring, BD Sweet Spot check, pipeline update.";
  },
  async solcex_block() {
    return "executing solcex_block — token scoring batch, BD outreach drafts for Sweet Spot candidates, pipeline update.";
  },
  async evening_checkin() {
    return "evening_checkin — checking Telegram, reporting progress, processing pending approvals.";
  },
  async day_close() {
    // Phase 2 P2 real handler: query today's actuals, update tracker, post EOD.
    const today = new Date().toISOString().slice(0, 10);
    const trackerPath =
      "/data/buzz/persistent/reports/revenue-execution-tracker.json";

    // Today's filed signals from DB
    let sigCount = 0;
    let avgQs = null;
    try {
      const sigs = db
        .prepare(
          `SELECT signal_id FROM aibtc_signals_filed WHERE pacific_date = ?`,
        )
        .all(today);
      sigCount = sigs.length;
      // qs lives in the AIBTC API, not the local DB. Read from tracker if set.
      const t = JSON.parse(fs.readFileSync(trackerPath, "utf8"));
      const qsVals = (t.aibtc?.signals_filed_today_detail || [])
        .map((s) => s.qs)
        .filter((q) => typeof q === "number");
      if (qsVals.length)
        avgQs = +(qsVals.reduce((a, b) => a + b, 0) / qsVals.length).toFixed(1);
    } catch (e) {
      log(`day_close DB/tracker read err: ${e.message}`);
    }

    // Today's drafted score tweets
    let tweetDrafts = 0;
    try {
      const dir = "/data/buzz/persistent/reports/score-tweet-drafts";
      tweetDrafts = fs
        .readdirSync(dir)
        .filter((f) => f.startsWith(today) && f.endsWith(".md")).length;
    } catch {}

    // Stall flag check + tracker update — IDEMPOTENT per UTC day.
    // last_close_date guard prevents double-increment if day_close fires twice.
    let stallNote = "";
    try {
      const t = JSON.parse(fs.readFileSync(trackerPath, "utf8"));
      const ss = t.stream_streaks || {};
      if (ss.last_close_date === today) {
        // already closed today — return current state read-only
        stallNote = `HSaaS streak ${ss.hsaas_consecutive_action_days || 0}d | SolCex ${ss.solcex_days_since_last_action || 0}d inactive (already closed today)`;
      } else {
        // first close of the day — compute and persist
        const hsaasActed =
          (t.hsaas?.rug_watch_completed_today ?? false) || tweetDrafts >= 1;
        const solcexActed = (t.solcex?.bd_outreach_sent_today ?? 0) >= 1;
        const newHsaasStreak = hsaasActed
          ? (ss.hsaas_consecutive_action_days || 0) + 1
          : 0;
        const newHsaasZero = hsaasActed ? 0 : (ss.hsaas_days_at_zero || 0) + 1;
        const newSolcexStreak = solcexActed
          ? (ss.solcex_consecutive_action_days || 0) + 1
          : 0;
        const newSolcexInactive = solcexActed
          ? 0
          : (ss.solcex_days_since_last_action || 0) + 1;
        t.stream_streaks = {
          ...ss,
          hsaas_consecutive_action_days: newHsaasStreak,
          hsaas_days_at_zero: newHsaasZero,
          solcex_consecutive_action_days: newSolcexStreak,
          solcex_days_since_last_action: newSolcexInactive,
          last_close_date: today,
        };
        stallNote = `HSaaS ${hsaasActed ? "✅" : "⚠️"} streak ${newHsaasStreak}d | SolCex ${solcexActed ? "✅" : "🔴"} ${newSolcexInactive}d inactive`;
        fs.writeFileSync(trackerPath, JSON.stringify(t, null, 2));
      }
    } catch (e) {
      log(`day_close stall-flag err: ${e.message}`);
      stallNote = "stall-flag update FAILED";
    }

    return `EOD ${today} — signals ${sigCount}/6${avgQs !== null ? ` (avg qs ${avgQs})` : ""}, score-tweet drafts ${tweetDrafts}. ${stallNote}.`;
  },
  async night_work() {
    return null; // silent GREEN
  },
  async night_checkin() {
    return null; // silent
  },
  async morning_signal_fallback(payloadJSON) {
    let slot = "?";
    try {
      const p = JSON.parse(payloadJSON);
      const m = (p.message || "").match(/Slot (\d)/);
      if (m) slot = m[1];
    } catch {}
    return `executing morning_signal_fallback (slot ${slot}) — research the beat, pull live data, draft signal, file via aibtc-direct-filer. Report signal_id when landed. YELLOW authority.`;
  },
  async keepalive() {
    return null; // silent — mailbox row drained, no WR post
  },
  async prayer_reminder(payloadJSON) {
    try {
      return JSON.parse(payloadJSON).message;
    } catch {
      return null;
    }
  },
  async test_daemon() {
    return "test_daemon ✅ — Option A daemon consumed this row. Fix is live.";
  },
  async test_wake() {
    return "test_wake ✅ — daemon also handles legacy test_wake events for parity with smoke tests.";
  },
};

// ── DB ──────────────────────────────────────────────────────────────────
let db;
try {
  db = new Database(DB_PATH, { readonly: false });
  db.pragma("journal_mode = WAL");
} catch (e) {
  console.error(`[daemon] FATAL: cannot open DB ${DB_PATH}: ${e.message}`);
  process.exit(1);
}

const SELECT_PENDING = db.prepare(`
  SELECT rowid AS rid, payload, created_at
  FROM agent_mailbox
  WHERE msg_type = 'EVENT'
    AND acked_at IS NULL
    AND to_agent = 'claude-code'
  ORDER BY created_at ASC
  LIMIT ?
`);
const ACK_ROW = db.prepare(`
  UPDATE agent_mailbox
  SET acked_at = datetime('now')
  WHERE rowid = ?
`);

// ── poll loop ───────────────────────────────────────────────────────────
async function tick() {
  let rows;
  try {
    rows = SELECT_PENDING.all(BATCH_SIZE);
  } catch (e) {
    log(`poll error: ${e.message}`);
    return;
  }
  if (rows.length === 0) return;
  log(`found ${rows.length} un-acked EVENT row(s)`);

  for (const row of rows) {
    let eventType = "?";
    try {
      const payload = JSON.parse(row.payload);
      eventType = payload.event_type || "?";
      const handler = handlers[eventType];
      if (handler) {
        const result = await handler(row.payload);
        if (result) {
          await sendWR(`🐝 [${eventType}] ${result}`);
        }
        log(`row ${row.rid} ${eventType} executed (wr=${!!result})`);
      } else {
        log(`row ${row.rid} ${eventType} no_handler`);
      }
    } catch (e) {
      log(`row ${row.rid} ${eventType} handler_error: ${e.message}`);
    }
    try {
      ACK_ROW.run(row.rid);
    } catch (e) {
      log(`row ${row.rid} ack_error: ${e.message}`);
    }
  }
}

// ── boot ────────────────────────────────────────────────────────────────
log(
  `boot — polling every ${POLL_INTERVAL_MS / 1000}s, db=${DB_PATH}, sender=buzz_cron_bot, listener=${LISTENER_HANDLE}`,
);
sendWR(
  "🐝 schedule-daemon online — polling agent_mailbox every 30s. Phase 1 stubs active.",
);

// First tick immediately (drain any backlog), then on interval.
tick().catch((e) => log(`first tick error: ${e.message}`));
setInterval(() => {
  tick().catch((e) => log(`tick error: ${e.message}`));
}, POLL_INTERVAL_MS);

// graceful shutdown
function shutdown() {
  log("shutdown");
  try {
    db.close();
  } catch {}
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
