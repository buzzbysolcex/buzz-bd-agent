/**
 * X Layer x402 Payment Middleware — BaaS Payment Layer
 * Chain ID: 196 (mainnet) / 195 (testnet)
 * Payment in USDC on X Layer
 */

const https = require("https");
const http = require("http");
const { getDB } = require("../db");

const XLAYER_RPC = "https://xlayerrpc.okx.com";
const XLAYER_TESTNET_RPC = "https://xlayertestrpc.okx.com";
const BUZZ_WALLET = "0x2Dc03124091104E7798C0273D96FC5ED65F05aA9";
const SCORE_PRICE_USDC = 0.50;
const CHAIN_ID = 196;

function getQuote(service = "score-token") {
  return {
    service,
    price_usdc: SCORE_PRICE_USDC,
    chain: "xlayer",
    chain_id: CHAIN_ID,
    pay_to: BUZZ_WALLET,
    currency: "USDC",
    rpc: XLAYER_RPC,
    explorer: "https://www.okx.com/web3/explorer/xlayer"
  };
}

async function verifyPayment(txHash) {
  return new Promise((resolve) => {
    const body = JSON.stringify({
      jsonrpc: "2.0", id: 1, method: "eth_getTransactionReceipt", params: [txHash]
    });
    const url = new URL(XLAYER_RPC);
    const req = https.request({
      hostname: url.hostname, path: url.pathname, method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": body.length }
    }, (res) => {
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => {
        try {
          const result = JSON.parse(data);
          const receipt = result.result;
          if (!receipt) { resolve({ verified: false, reason: "tx_not_found" }); return; }
          const success = receipt.status === "0x1";
          const to = (receipt.to || "").toLowerCase();
          resolve({
            verified: success && to === BUZZ_WALLET.toLowerCase(),
            tx_hash: txHash,
            from: receipt.from,
            to: receipt.to,
            status: success ? "success" : "failed",
            block: parseInt(receipt.blockNumber, 16),
            gas_used: parseInt(receipt.gasUsed, 16)
          });
        } catch (e) { resolve({ verified: false, reason: "parse_error" }); }
      });
    });
    req.on("error", () => resolve({ verified: false, reason: "rpc_error" }));
    req.write(body);
    req.end();
  });
}

function x402Middleware(req, res, next) {
  const paymentHeader = req.headers["x-payment-tx"] || req.headers["x-402-payment"];
  
  if (!paymentHeader) {
    return res.status(402).json({
      error: "payment_required",
      message: "This endpoint requires x402 payment on X Layer",
      payment: getQuote("score-token"),
      instructions: {
        step1: "Send " + SCORE_PRICE_USDC + " USDC to " + BUZZ_WALLET + " on X Layer (chain 196)",
        step2: "Include tx hash in X-Payment-TX header",
        step3: "Retry this request with the payment header"
      }
    });
  }
  
  req.paymentTx = paymentHeader;
  next();
}

async function runPaidScore(address, txHash) {
  const db = getDB();
  
  db.prepare(`
    INSERT OR IGNORE INTO xlayer_transactions (tx_hash, from_address, to_address, amount_usdc, service, token_scored, status)
    VALUES (?, , ?, ?, score-token, ?, pending)
  `).run(txHash, BUZZ_WALLET, SCORE_PRICE_USDC, address);
  
  return new Promise((resolve) => {
    const payload = JSON.stringify({ address });
    const req = http.request({
      hostname: "localhost", port: 3000, path: "/api/v1/score-token", method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": payload.length,
        "X-API-Key": process.env.BUZZ_API_ADMIN_KEY || ""
      }
    }, (res) => {
      let body = "";
      res.on("data", c => body += c);
      res.on("end", () => {
        try {
          const result = JSON.parse(body);
          db.prepare("UPDATE xlayer_transactions SET score_result = ?, status = completed WHERE tx_hash = ?")
            .run(result.score?.total || 0, txHash);
          resolve(result);
        } catch (e) { resolve({ error: "score_failed" }); }
      });
    });
    req.on("error", () => resolve({ error: "score_unavailable" }));
    req.write(payload);
    req.end();
  });
}

module.exports = { getQuote, verifyPayment, x402Middleware, runPaidScore, BUZZ_WALLET, CHAIN_ID };
