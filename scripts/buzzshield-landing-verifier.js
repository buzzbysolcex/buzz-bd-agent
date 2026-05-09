#!/usr/bin/env node
/**
 * BuzzShield Landing Verifier — #129 (branch: landing-verifier-v1)
 *
 * Server-side ground-truth confirmation that an autonomous outbound
 * action LANDED. Wired into every autopilot loop per Doctrine.md
 * Priority #4 GROUND-TRUTH-LANDING.
 *
 * Origin: 2026-05-10 ground-truth gap discovery — Ionic Nova local
 * autopilot logs claimed 9 days of daily filings but /api/agents
 * lastActiveAt = 2026-05-03 (server-side silent the entire window).
 *
 * Doctrine: brain/Doctrine.md Priority #4 GROUND-TRUTH-LANDING.
 * Ground truth: /data/buzz/persistent/buzz-api/ground-truth/2026-05-10-aibtc-local-vs-network-landing-gap.md
 *
 * Authority: Ogie msg "P1 DECISION CONFIRMED: HALT + STRUCTURAL FIX" (May 10 2026).
 *
 * NOTE ON CANONICAL PATH:
 *   This file lives at scripts/buzzshield-landing-verifier.js because
 *   scripts/v6/ is root-owned 755 (claude lacks write). When sudo
 *   migration runs (queued #128), this file moves to scripts/v6/.
 *
 * USAGE:
 *
 *   const lv = require('./buzzshield-landing-verifier.js');
 *
 *   // Verify an action that just happened
 *   const result = await lv.verify('aibtc-signal-filing', {
 *     senderBtcAddress: 'bc1q...',
 *     signalId: 'sig_abc123',
 *     filedAt: '2026-05-10T06:02:00Z',
 *   });
 *
 *   if (!result.landed) {
 *     // Autopilot must HALT or escalate per policy
 *     await lv.halt('aibtc-signal-autopilot', result);
 *   }
 *
 *   // Or use restart counter for 3-consecutive-verified pattern
 *   const counter = lv.restartCounter('aibtc-signal-autopilot');
 *   counter.increment(result);
 *   if (counter.canRestart()) re-enable-cron-here
 *
 * CLI:
 *
 *   node buzzshield-landing-verifier.js verify aibtc-inbox-send \
 *     --recipient-btc-address bc1q... --msg-id msg_abc123
 *
 *   node buzzshield-landing-verifier.js list
 *
 * EXIT CODES:
 *   0  landed (success)
 *   2  not-landed
 *   3  timeout
 *   4  unknown action type
 *   5  internal error
 *
 * @version 1.0 (MVP) — 2026-05-10
 *
 * SCOPE NOTE (MVP, per scope-honesty doctrine — worked example #5):
 *   Built-ins: aibtc-signal-filing + aibtc-inbox-send (both gating
 *   AIBTC autopilot restart). Immunefi submission verifier + on-chain
 *   tx verifier filed as follow-up — different API auth + chain RPC
 *   plumbing, not blocking AIBTC restart which is today's gate.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const https = require("https");

// === Configuration ===

const TG_ENV_PATH = "/home/claude-code/.claude/channels/telegram/.env";
const FAILURES_LOG_DIR = "/data/buzz/persistent/buzz-api/landing-failures";
const ALERT_LOG_PATH = "/home/claude-code/landing-verifier.log";
const AIBTC_API_BASE = "https://aibtc.com/api";

// === Verifier registry ===

const VERIFIERS = new Map();

function register(actionType, verifierFn, opts = {}) {
  if (typeof actionType !== "string" || !actionType)
    throw new Error("register: actionType must be non-empty string");
  if (typeof verifierFn !== "function")
    throw new Error("register: verifierFn must be a function");
  VERIFIERS.set(actionType, {
    fn: verifierFn,
    timeoutSeconds: opts.timeoutSeconds || 60,
  });
}

function listActionTypes() {
  return Array.from(VERIFIERS.keys());
}

// === HTTP helper (no external deps) ===

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 10000 }, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            resolve({ _raw: body, _parseError: e.message });
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 200)}`));
        }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => req.destroy(new Error("HTTP timeout")));
  });
}

// === Built-in verifier #1: AIBTC signal filing ===

register(
  "aibtc-signal-filing",
  async (ctx) => {
    if (!ctx.senderBtcAddress)
      return { landed: false, evidence: { error: "missing senderBtcAddress" } };

    const profile = await httpsGet(
      `${AIBTC_API_BASE}/agents/${encodeURIComponent(ctx.senderBtcAddress)}`,
    );
    const lastActiveAt =
      profile?.activity?.lastActiveAt || profile?.agent?.lastActiveAt;
    if (!lastActiveAt)
      return { landed: false, evidence: { error: "no lastActiveAt", profile } };

    const filedAt = ctx.filedAt
      ? new Date(ctx.filedAt)
      : new Date(Date.now() - 60_000);
    const lastActive = new Date(lastActiveAt);
    if (lastActive < filedAt) {
      return {
        landed: false,
        evidence: {
          reason:
            "lastActiveAt is BEFORE filedAt — server did not register filing",
          lastActiveAt,
          filedAt: filedAt.toISOString(),
        },
      };
    }

    return {
      landed: true,
      evidence: {
        signalId: ctx.signalId || null,
        lastActiveAt,
        filedAt: filedAt.toISOString(),
        profileLevel: profile?.level,
      },
    };
  },
  { timeoutSeconds: 60 },
);

// === Built-in verifier #2: AIBTC inbox send ===

register(
  "aibtc-inbox-send",
  async (ctx) => {
    if (!ctx.recipientBtcAddress)
      return {
        landed: false,
        evidence: { error: "missing recipientBtcAddress" },
      };
    if (!ctx.msgId && !ctx.contentSubstring)
      return {
        landed: false,
        evidence: { error: "need msgId OR contentSubstring to verify" },
      };

    const inbox = await httpsGet(
      `${AIBTC_API_BASE}/inbox/${encodeURIComponent(ctx.recipientBtcAddress)}?limit=20`,
    );
    const messages = inbox?.inbox?.messages || [];

    let match = null;
    if (ctx.msgId) {
      match = messages.find((m) => m.messageId === ctx.msgId);
    } else if (ctx.contentSubstring) {
      match = messages.find((m) =>
        (m.content || "").includes(ctx.contentSubstring),
      );
    }

    if (!match) {
      return {
        landed: false,
        evidence: {
          reason: "msg not found in recipient inbox",
          msgId: ctx.msgId || null,
          contentSubstring: ctx.contentSubstring || null,
          inboxSize: messages.length,
          newest: messages[0]?.sentAt,
        },
      };
    }

    return {
      landed: true,
      evidence: {
        messageId: match.messageId,
        sentAt: match.sentAt,
        paymentStatus: match.paymentStatus,
        paymentTxid: match.paymentTxid,
      },
    };
  },
  { timeoutSeconds: 60 },
);

// === Verify with timeout + retry ===

async function verify(actionType, ctx, opts = {}) {
  const v = VERIFIERS.get(actionType);
  if (!v)
    return {
      landed: false,
      timedOut: false,
      unknown: true,
      actionType,
      evidence: { error: `no verifier registered for ${actionType}` },
    };

  const timeoutMs = (opts.timeoutSeconds || v.timeoutSeconds) * 1000;
  const startedAt = Date.now();

  try {
    const result = await Promise.race([
      v.fn(ctx),
      new Promise((_, rej) =>
        setTimeout(() => rej(new Error("VERIFIER_TIMEOUT")), timeoutMs),
      ),
    ]);
    result.actionType = actionType;
    result.elapsedMs = Date.now() - startedAt;
    if (!result.landed) await logFailure(actionType, ctx, result);
    return result;
  } catch (e) {
    const result = {
      landed: false,
      timedOut: e.message === "VERIFIER_TIMEOUT",
      actionType,
      elapsedMs: Date.now() - startedAt,
      evidence: { error: e.message },
    };
    await logFailure(actionType, ctx, result);
    return result;
  }
}

// === Failure logging + War Room alert ===

async function logFailure(actionType, ctx, result) {
  try {
    fs.mkdirSync(FAILURES_LOG_DIR, { recursive: true });
  } catch {}
  const ts = new Date().toISOString();
  const safeCtx = { ...ctx };
  for (const k of Object.keys(safeCtx)) {
    if (/key|secret|token|password|seed/i.test(k)) safeCtx[k] = "[REDACTED]";
  }
  const entry = { ts, actionType, ctx: safeCtx, result };
  const file = path.join(
    FAILURES_LOG_DIR,
    `${ts.slice(0, 10)}-${actionType}-${Date.now()}.json`,
  );
  try {
    fs.writeFileSync(file, JSON.stringify(entry, null, 2));
  } catch (e) {
    fs.appendFileSync(
      ALERT_LOG_PATH,
      `[${ts}] LOG-WRITE-FAIL: ${e.message}\n`,
    );
  }
  fs.appendFileSync(
    ALERT_LOG_PATH,
    `[${ts}] FAIL action=${actionType} timedOut=${result.timedOut || false} reason=${result.evidence?.error || result.evidence?.reason || "?"}\n`,
  );

  await alertWarRoom(actionType, ctx, result);
}

async function alertWarRoom(actionType, ctx, result) {
  if (!fs.existsSync(TG_ENV_PATH)) return;
  const env = parseEnv(fs.readFileSync(TG_ENV_PATH, "utf8"));
  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const reason =
    result.evidence?.error ||
    result.evidence?.reason ||
    (result.timedOut ? "verifier timeout" : "unknown");
  const text = [
    "🛑 LANDING VERIFIER FAIL",
    `action: ${actionType}`,
    `reason: ${reason}`,
    `elapsed: ${result.elapsedMs}ms`,
    result.timedOut
      ? "⏱ TIMEOUT — autopilot must HALT"
      : "❌ NOT LANDED",
    `log: ${ALERT_LOG_PATH}`,
  ].join("\n");

  return new Promise((resolve) => {
    const data = `chat_id=${encodeURIComponent(chatId)}&text=${encodeURIComponent(text)}`;
    const req = https.request(
      {
        hostname: "api.telegram.org",
        path: `/bot${token}/sendMessage`,
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          "content-length": Buffer.byteLength(data),
        },
        timeout: 10000,
      },
      (res) => {
        res.on("data", () => {});
        res.on("end", resolve);
      },
    );
    req.on("error", resolve);
    req.on("timeout", resolve);
    req.write(data);
    req.end();
  });
}

function parseEnv(text) {
  const out = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

async function halt(autopilotName, result) {
  const ts = new Date().toISOString();
  fs.appendFileSync(
    ALERT_LOG_PATH,
    `[${ts}] HALT autopilot=${autopilotName} reason=verifier_fail action=${result.actionType}\n`,
  );
  await alertWarRoom(`HALT:${autopilotName}`, {}, result);
}

function restartCounter(autopilotName) {
  const file = path.join(FAILURES_LOG_DIR, `restart-${autopilotName}.json`);
  try {
    fs.mkdirSync(FAILURES_LOG_DIR, { recursive: true });
  } catch {}
  let state = { count: 0, lastUpdate: null, history: [] };
  if (fs.existsSync(file)) {
    try {
      state = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {}
  }
  return {
    increment(verifierResult) {
      if (verifierResult.landed) {
        state.count += 1;
      } else {
        state.count = 0;
      }
      state.lastUpdate = new Date().toISOString();
      state.history.push({
        ts: state.lastUpdate,
        landed: verifierResult.landed,
        actionType: verifierResult.actionType,
      });
      if (state.history.length > 20) state.history = state.history.slice(-20);
      fs.writeFileSync(file, JSON.stringify(state, null, 2));
      return state;
    },
    canRestart() {
      return state.count >= 3;
    },
    state() {
      return state;
    },
  };
}

// === CLI ===

if (require.main === module) {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (cmd === "list") {
    console.log(JSON.stringify(listActionTypes(), null, 2));
    process.exit(0);
  }

  if (cmd === "verify") {
    const actionType = args[1];
    const ctx = {};
    for (let i = 2; i < args.length; i += 2) {
      const key = args[i]
        .replace(/^--/, "")
        .replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      ctx[key] = args[i + 1];
    }
    verify(actionType, ctx).then((result) => {
      console.log(JSON.stringify(result, null, 2));
      if (result.unknown) process.exit(4);
      if (result.timedOut) process.exit(3);
      if (!result.landed) process.exit(2);
      process.exit(0);
    });
    return;
  }

  console.error(
    "usage: buzzshield-landing-verifier.js [list | verify <action-type> --key value ...]",
  );
  process.exit(5);
}

module.exports = {
  register,
  verify,
  halt,
  listActionTypes,
  restartCounter,
};
