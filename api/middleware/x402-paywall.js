/**
 * x402 Payment Paywall Middleware
 * Returns HTTP 402 with x402-compatible payment headers for unpaid requests.
 * Admin key holders and localhost bypass the paywall.
 *
 * Usage:
 *   const { x402Paywall } = require('./middleware/x402-paywall');
 *   app.use('/api/v1/premium/pipeline', x402Paywall({
 *     price: '10000',
 *     resource: '/api/v1/premium/pipeline',
 *     description: '...',
 *     category: 'crypto-intelligence',
 *     tags: ['token-scoring','multi-chain'],
 *   }), handler);
 *
 * Facilitator: Coinbase CDP x402 (https://api.cdp.coinbase.com/platform/v2/x402).
 * Creds loaded at boot from /data/.env.cdp (same pattern as .env.pashov).
 * Real verification is flag-gated on X402_CDP_VERIFY — off by default; middleware
 * stays permissive (current behavior) until Ogie flips it post-smoke.
 *
 * Buzz BD Agent | x402 Micropayments | USDC on Base
 */

// Source CDP creds at boot so CDP_* land in process.env BEFORE the constants
// below are evaluated. Tries both the canonical /data/.env.cdp (Pashov-style)
// and /data/env/.env.cdp (where Ogie placed the file on 2026-04-21).
(() => {
  try {
    const fs = require("fs");
    for (const p of ["/data/.env.cdp", "/data/env/.env.cdp"]) {
      if (!fs.existsSync(p)) continue;
      const content = fs.readFileSync(p, "utf-8");
      for (const line of content.split("\n")) {
        const t = line.trim();
        if (!t || t.startsWith("#")) continue;
        const eq = t.indexOf("=");
        if (eq < 0) continue;
        const k = t.slice(0, eq).trim();
        const v = t.slice(eq + 1).trim();
        if (process.env[k] == null) process.env[k] = v;
      }
      break;
    }
  } catch {
    /* non-fatal */
  }
})();

const BUZZ_WALLET =
  process.env.ACP_OWNER_ADDRESS ||
  process.env.BANKR_FEE_WALLET ||
  "0x2Dc03124091104E7798C0273D96FC5ED65F05aA9";
const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // USDC on Base mainnet
const ADMIN_KEY = process.env.BUZZ_API_ADMIN_KEY;
const BASE_URL = process.env.BUZZ_PUBLIC_URL || "https://api.buzzbd.ai";

const CDP_FACILITATOR_URL =
  process.env.CDP_FACILITATOR_URL ||
  "https://api.cdp.coinbase.com/platform/v2/x402";
const CDP_API_KEY_ID = process.env.CDP_API_KEY_ID || null;
const CDP_API_KEY_SECRET = process.env.CDP_API_KEY_SECRET || null;
const CDP_VERIFY_ENABLED =
  process.env.X402_CDP_VERIFY === "true" &&
  CDP_API_KEY_ID &&
  CDP_API_KEY_SECRET;

let _getDB;
function db() {
  if (!_getDB) _getDB = require("../db").getDB;
  try {
    return _getDB();
  } catch {
    return null;
  }
}

function recordPayment({
  service_name,
  amount_usd,
  tx_hash,
  payer_address,
  verified,
}) {
  const handle = db();
  if (!handle) return;
  try {
    handle
      .prepare(
        `INSERT INTO x402_payments (service, service_name, amount_usd, tx_hash, payer_address)
       VALUES (?, ?, ?, ?, ?)`,
      )
      .run(service_name, service_name, amount_usd, tx_hash, payer_address);
  } catch (err) {
    console.warn(`[x402] recordPayment failed: ${err.message}`);
  }
  if (verified) {
    // Verified payments get a second log line for auditability;
    // no schema change required (verified column is additive work).
    console.log(
      `[x402] VERIFIED payment service=${service_name} amount=$${amount_usd} payer=${payer_address || "unknown"} tx=${tx_hash || "none"}`,
    );
  }
}

function parsePaymentHeader(raw) {
  if (!raw) return { payer_address: null, tx_hash: null };
  try {
    const decoded = Buffer.from(raw, "base64").toString("utf8");
    const payload = JSON.parse(decoded);
    return {
      payer_address:
        payload?.payload?.signer || payload?.payer || payload?.from || null,
      tx_hash: payload?.tx_hash || payload?.transactionHash || null,
    };
  } catch {
    return { payer_address: null, tx_hash: null };
  }
}

/**
 * Sign a CDP API JWT (ES256) for the given request. Returns null if creds
 * unavailable. Using the SHA256-ECDSA primitive from node:crypto so this has
 * no new npm dependency.
 */
function signCDPJwt(method, uri) {
  if (!CDP_API_KEY_ID || !CDP_API_KEY_SECRET) return null;
  try {
    const crypto = require("crypto");
    const nowSec = Math.floor(Date.now() / 1000);
    const header = {
      typ: "JWT",
      alg: "ES256",
      kid: CDP_API_KEY_ID,
      nonce: crypto.randomBytes(16).toString("hex"),
    };
    const payload = {
      iss: "cdp",
      nbf: nowSec,
      exp: nowSec + 120,
      sub: CDP_API_KEY_ID,
      uri: `${method} ${uri}`,
    };
    const b64url = (obj) =>
      Buffer.from(JSON.stringify(obj))
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
    const signingInput = `${b64url(header)}.${b64url(payload)}`;
    const keyPem = CDP_API_KEY_SECRET.includes("BEGIN")
      ? CDP_API_KEY_SECRET
      : `-----BEGIN EC PRIVATE KEY-----\n${CDP_API_KEY_SECRET}\n-----END EC PRIVATE KEY-----`;
    const sig = crypto
      .createSign("SHA256")
      .update(signingInput)
      .sign({ key: keyPem, dsaEncoding: "ieee-p1363" });
    const sigB64 = sig
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    return `${signingInput}.${sigB64}`;
  } catch (err) {
    console.warn(`[x402] CDP JWT sign failed: ${err.message}`);
    return null;
  }
}

/**
 * POST the caller's payment header to the CDP facilitator /verify endpoint.
 * Returns { isValid, verified, error } where:
 *   - isValid=true, verified=true  → payment cryptographically valid
 *   - isValid=false, verified=true → facilitator rejected; 402 the caller
 *   - isValid=true, verified=false → flag off or facilitator unreachable;
 *                                    falls back to permissive accept
 */
async function verifyWithCDPFacilitator(paymentHeader, paymentRequirements) {
  if (!CDP_VERIFY_ENABLED) {
    return { isValid: true, verified: false, error: "cdp_verify_disabled" };
  }
  const uri = new URL(`${CDP_FACILITATOR_URL}/verify`);
  const jwt = signCDPJwt("POST", `${uri.host}${uri.pathname}`);
  if (!jwt) {
    return { isValid: true, verified: false, error: "cdp_jwt_unavailable" };
  }
  try {
    const resp = await fetch(`${CDP_FACILITATOR_URL}/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        paymentPayload: paymentHeader,
        paymentRequirements,
      }),
    });
    if (!resp.ok) {
      // Facilitator reachable but rejected our request shape or creds.
      // Don't let a CDP-side bug free-serve; fail-closed.
      const text = await resp.text().catch(() => "");
      console.warn(`[x402] CDP /verify ${resp.status}: ${text.slice(0, 200)}`);
      return {
        isValid: false,
        verified: true,
        error: `cdp_${resp.status}`,
      };
    }
    const body = await resp.json().catch(() => ({}));
    return {
      isValid: body.isValid === true,
      verified: true,
      error: body.isValid === true ? null : body.invalidReason || "cdp_reject",
    };
  } catch (err) {
    // Network / DNS / timeout — fall back to permissive accept rather
    // than taking prod down. Logged so Ogie sees it.
    console.warn(`[x402] CDP /verify network error: ${err.message}`);
    return { isValid: true, verified: false, error: "cdp_unreachable" };
  }
}

/**
 * Create x402 paywall middleware for a specific endpoint
 * @param {Object} options
 * @param {string} options.price - Amount in USDC smallest units (6 decimals). "10000" = $0.01
 * @param {string} options.resource - The endpoint path (e.g., "/api/v1/pipeline")
 * @param {string} options.description - Human-readable description
 * @param {string} [options.category] - Bazaar discovery taxonomy (default "crypto-intelligence")
 * @param {string[]} [options.tags] - Bazaar discovery tags
 * @param {string} [options.method] - HTTP verb advertised in the 402 resource block (default "GET")
 */
function x402Paywall(options = {}) {
  const {
    price = "10000", // $0.01 default
    resource = "/api/v1/data",
    description = "Buzz BD Agent Intelligence Data",
    category = "crypto-intelligence",
    tags = [],
    method = "GET",
  } = options;

  return async (req, res, next) => {
    // Bypass 1: Admin key (internal access)
    const apiKey =
      req.headers["x-api-key"] || extractBearer(req.headers.authorization);
    if (ADMIN_KEY && apiKey === ADMIN_KEY) return next();

    // Bypass 2: Localhost (OpenClaw, Sentinel, crons)
    const clientIp = req.ip || req.connection?.remoteAddress || "";
    if (
      clientIp === "127.0.0.1" ||
      clientIp === "::1" ||
      clientIp === "::ffff:127.0.0.1"
    )
      return next();

    // Build the payment requirements block once so /verify sees the exact
    // same object that goes out on the 402 body.
    const paymentRequirements = {
      scheme: "exact",
      network: "base",
      amount: price,
      payTo: BUZZ_WALLET,
      asset: USDC_BASE,
      maxTimeoutSeconds: 60,
      extra: {
        name: description,
        provider: "SolCex Exchange / Buzz BD Agent",
        category,
        tags,
      },
    };

    // Bypass 3: Valid x402 payment proof (payment-signature is x402 v2 standard)
    const paymentHeader =
      req.headers["payment-signature"] ||
      req.headers["x-payment"] ||
      req.headers["x-402-payment"];
    if (paymentHeader) {
      const verification = await verifyWithCDPFacilitator(paymentHeader, [
        paymentRequirements,
      ]);
      if (!verification.isValid) {
        // Fail-closed: facilitator said "no" (or confirmed reject).
        return res.status(402).json({
          x402Version: 2,
          accepts: [paymentRequirements],
          resource: {
            url: `${BASE_URL}${resource}`,
            method,
            contentType: "application/json",
            description,
          },
          error: `payment_invalid:${verification.error || "unknown"}`,
        });
      }
      console.log(
        `[x402] Payment accepted (${verification.verified ? "cdp-verified" : "permissive"}) for ${resource}`,
      );
      const { payer_address, tx_hash } = parsePaymentHeader(paymentHeader);
      recordPayment({
        service_name: resource,
        amount_usd: Number(price) / 1_000_000,
        tx_hash,
        payer_address,
        verified: verification.verified,
      });
      return next();
    }

    // No payment — return 402 with x402 spec-compliant payment requirements
    // plus Coinbase Bazaar discovery extensions (so crawlers auto-index).
    const paymentRequired = {
      x402Version: 2,
      accepts: [paymentRequirements],
      resource: {
        url: `${BASE_URL}${resource}`,
        method,
        contentType: "application/json",
        description,
      },
      extensions: {
        bazaar: {
          discoverable: true,
          category,
          tags,
        },
      },
      error: "X-PAYMENT header is required",
    };

    const encoded = Buffer.from(JSON.stringify(paymentRequired)).toString(
      "base64",
    );

    res
      .status(402)
      .set("PAYMENT-REQUIRED", encoded)
      .set("Access-Control-Expose-Headers", "PAYMENT-REQUIRED")
      .json(paymentRequired);
  };
}

function extractBearer(header) {
  if (!header) return null;
  const parts = header.split(" ");
  return parts[0] === "Bearer" && parts[1] ? parts[1] : null;
}

module.exports = {
  x402Paywall,
  verifyWithCDPFacilitator,
  signCDPJwt,
  CDP_FACILITATOR_URL,
  CDP_VERIFY_ENABLED,
};
