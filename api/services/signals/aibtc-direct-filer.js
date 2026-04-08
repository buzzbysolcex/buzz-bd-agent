/**
 * AIBTC Direct Filer — Container-side signal filing via direct HTTPS
 *
 * Bypasses the MCP layer entirely. Signs BIP-322 simple from a raw WIF
 * stored in /data/.env.aibtc and posts directly to https://aibtc.news/api/signals.
 *
 * Used by PULSE streak protection as a backup to Claude Code primary filing.
 *
 * Feature flag: STREAK_EMERGENCY_FILER (default false)
 * Activation: only fires when no signal.filed event in event log for current Pacific date
 *             AND it is >= 14:00 UTC AND flag is true
 *
 * Stays inert if:
 *   - flag is false
 *   - AIBTC_BTC_WIF env var is not set
 *   - AIBTC_BTC_ADDRESS env var is not set
 *   - bip322-js dependency is not installed
 *
 * Reference: docs/SIGNAL-MIGRATION-ARCHITECTURE.md
 */

const fs = require("fs");
const { feature } = require("../../lib/feature-flags");
const { recordSignalFiled } = require("./signal-tracker");
const { emit } = require("../events/event-bus");

const AIBTC_API = "https://aibtc.news/api/signals";

/**
 * Lazy-load WIF + address from env (set by server.js startup or .env.aibtc)
 */
function getWalletCreds() {
  if (process.env.AIBTC_BTC_WIF && process.env.AIBTC_BTC_ADDRESS) {
    return {
      wif: process.env.AIBTC_BTC_WIF,
      address: process.env.AIBTC_BTC_ADDRESS,
    };
  }

  // Try reading from .env.aibtc file directly
  const paths = ["/data/.env.aibtc", "/home/claude-code/.env.aibtc"];
  for (const p of paths) {
    try {
      if (!fs.existsSync(p)) continue;
      const content = fs.readFileSync(p, "utf8");
      const wifMatch = content.match(/AIBTC_BTC_WIF=(.+)/);
      const addrMatch = content.match(/AIBTC_BTC_ADDRESS=(.+)/);
      if (wifMatch && addrMatch) {
        process.env.AIBTC_BTC_WIF = wifMatch[1].trim();
        process.env.AIBTC_BTC_ADDRESS = addrMatch[1].trim();
        return {
          wif: process.env.AIBTC_BTC_WIF,
          address: process.env.AIBTC_BTC_ADDRESS,
        };
      }
    } catch (e) {}
  }

  return null;
}

/**
 * Sign a BIP-322 message using bip322-js library
 * Lazy-required so the service stays inert if dep is missing.
 */
function signBip322(wif, address, message) {
  let Signer;
  try {
    ({ Signer } = require("bip322-js"));
  } catch (e) {
    throw new Error(
      "bip322-js not installed — run npm install bip322-js inside container",
    );
  }
  return Signer.sign(wif, address, message);
}

/**
 * File a signal directly to AIBTC API.
 * Returns: { success, signal_id?, error? }
 */
async function fileSignalDirect({
  beat_slug,
  headline,
  body,
  sources,
  tags,
  disclosure,
}) {
  if (!feature("DIRECT_SIGNAL_FILING") && !feature("STREAK_EMERGENCY_FILER")) {
    return {
      success: false,
      error:
        "Both DIRECT_SIGNAL_FILING and STREAK_EMERGENCY_FILER flags are false",
    };
  }

  if (!beat_slug || !headline) {
    return { success: false, error: "beat_slug and headline required" };
  }

  const creds = getWalletCreds();
  if (!creds) {
    return {
      success: false,
      error: "AIBTC_BTC_WIF or AIBTC_BTC_ADDRESS not configured",
    };
  }

  // Build BIP-322 signed payload
  const ts = Math.floor(Date.now() / 1000);
  const message = `POST /api/signals:${ts}`;

  let signature;
  try {
    signature = signBip322(creds.wif, creds.address, message);
  } catch (e) {
    return { success: false, error: "BIP-322 signing failed: " + e.message };
  }

  const payload = {
    btc_address: creds.address,
    beat_slug,
    headline,
    body: body || "",
    sources: sources || [],
    tags: tags || [],
    disclosure:
      disclosure ||
      "Container-side filer (Buzz BD Agent / Ionic Nova). Direct HTTPS via bip322-js.",
  };

  // POST to AIBTC API
  try {
    const res = await fetch(AIBTC_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-BTC-Address": creds.address,
        "X-BTC-Signature": signature,
        "X-BTC-Timestamp": String(ts),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20000),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: `AIBTC API ${res.status}: ${data.message || JSON.stringify(data)}`,
      };
    }

    const signalId = data.signal?.id || data.id || `direct_${ts}`;

    // Record locally and emit event (uses existing signal-tracker)
    recordSignalFiled({
      signal_id: signalId,
      beat_slug,
      headline,
      pacific_date: new Date().toISOString().split("T")[0],
    });

    // Emit emergency filer event distinct from quality filings
    emit("aibtc-direct-filer", "signal.filed.emergency", {
      signal_id: signalId,
      beat: beat_slug,
      headline,
      filed_via: "container-direct-http",
    });

    return {
      success: true,
      signal_id: signalId,
      status: data.signal?.status || "submitted",
    };
  } catch (e) {
    return { success: false, error: "POST failed: " + e.message };
  }
}

/**
 * Verify the filer is operational without actually filing.
 * Used by health checks and admin diagnostics.
 */
function checkFilerReady() {
  const flagOn =
    feature("DIRECT_SIGNAL_FILING") || feature("STREAK_EMERGENCY_FILER");
  const creds = getWalletCreds();
  let depOk = false;
  try {
    require("bip322-js");
    depOk = true;
  } catch (e) {}

  return {
    ready: flagOn && !!creds && depOk,
    flag_enabled: flagOn,
    wallet_configured: !!creds,
    bip322_installed: depOk,
    address: creds?.address || null,
  };
}

module.exports = {
  fileSignalDirect,
  checkFilerReady,
  getWalletCreds,
};
