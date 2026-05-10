/* eslint-disable no-console */
/**
 * AIBTC x402 sBTC Inbox Sender — V1
 *
 * Posts a paid-inbox message reply to AIBTC. Mirrors aibtc-x402-stacks-filer.js
 * (signal filing) but targets the inbox/messages endpoint with a recipient
 * handle instead of a beat slug.
 *
 * Endpoint discovery: the prior Opal draft (msg 6231) noted "aibtc.com inbox
 * requires x402 payment per Apr 27+ migration". This script tries:
 *   1. POST https://aibtc.com/api/messages
 *   2. POST https://aibtc.com/api/inbox/<recipient_handle>
 *   3. POST https://aibtc.news/api/messages
 * in order, falling back on 404. First non-404 response wins.
 *
 * Headers + payment payload identical to signal-filer (sBTC sponsored TX +
 * BIP-322 sig over `POST /api/messages:<unix-ts>` literal).
 *
 * Authority: Ogie msg 6349 (2026-05-08, "Send revised Opal reply. Re-sign + send").
 */

// MUST chdir to api/ BEFORE requiring @stacks so the symlinked package's
// internal ESM imports resolve relative to the buzz-workspace node_modules
// tree rather than the broken npx cache. Identical pattern to filer.
process.chdir("/home/claude-code/buzz-workspace/api");

const fs = require("fs");
const path = require("path");

// Require the package ROOT (uses package.json main → dist/index.js CJS).
// Requiring dist/esm directly hits the broken npx-cache symlink ESM resolver.
const STACKS_LIB_BASE =
  "/home/claude-code/buzz-workspace/api/node_modules/@stacks";
const stx = require(`${STACKS_LIB_BASE}/transactions`);
const stxNetwork = require(`${STACKS_LIB_BASE}/network`);
const bip322 = require("/home/claude-code/buzz-workspace/api/node_modules/bip322-js");

const SBTC_TOKEN_CONTRACT_ADDR = "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4";
const SBTC_TOKEN_CONTRACT_NAME = "sbtc-token";
const SBTC_TOKEN_TRANSFER_FN = "transfer";
const SBTC_FT_NAME = "sbtc-token";
const PAY_TO = "SP1KGHF33817ZXW27CG50JXWC0Y6BNXAQ4E7YGAHM";
const MESSAGE_AMOUNT_SATS = 100n;

// Confirmed 2026-05-09 via 402 probe: only /api/inbox/<btc-address> is live.
// /api/messages returns 404. Recipient must be a BTC address (bc1...), not a handle.
const INBOX_ENDPOINT_TPL = "https://aibtc.com/api/inbox/__RECIPIENT__";
const INBOX_PATH_TPL = "/api/inbox/__RECIPIENT__";

function loadEnv(envPath = "/home/claude-code/.env.aibtc") {
  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  const env = {};
  for (const ln of lines) {
    const m = ln.match(/^([A-Z_]+)=(.+)$/);
    if (!m) continue;
    env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

function bip322Sign(wif, addr, message) {
  return bip322.Signer.sign(wif, addr, message);
}

async function buildSignedSponsoredTx(env, opts = {}) {
  // Prefer the AGENT wallet (SP24EH4D) for /api/inbox sends — server enforces
  // sender STX == agent's stxAddress on record. Fall back to owner wallet for
  // backwards compatibility (used by signal-filer at /api/signals which is
  // not strict on sender STX).
  const senderKey =
    env.AIBTC_AGENT_STX_PRIVATE_KEY || env.AIBTC_STX_PRIVATE_KEY;
  const senderAddress = env.AIBTC_AGENT_STX_ADDRESS || env.AIBTC_STX_ADDRESS;
  if (!senderKey || !senderAddress)
    throw new Error(
      "AIBTC_AGENT_STX_PRIVATE_KEY or AIBTC_AGENT_STX_ADDRESS missing (and no owner-wallet fallback)",
    );

  // Per-recipient payTo override: agent inbox payments go to the AGENT's STX
  // address (extracted from 402 challenge), NOT the global signal PAY_TO.
  const targetPayTo = opts.payTo || PAY_TO;

  const memo = opts.memo
    ? stx.Cl.some(stx.Cl.bufferFromUtf8(opts.memo.slice(0, 34)))
    : stx.Cl.none();

  const tx = await stx.makeContractCall({
    contractAddress: SBTC_TOKEN_CONTRACT_ADDR,
    contractName: SBTC_TOKEN_CONTRACT_NAME,
    functionName: SBTC_TOKEN_TRANSFER_FN,
    functionArgs: [
      stx.Cl.uint(MESSAGE_AMOUNT_SATS),
      stx.Cl.principal(senderAddress),
      stx.Cl.principal(targetPayTo),
      memo,
    ],
    senderKey,
    network: stxNetwork.STACKS_MAINNET,
    postConditions: [
      stx.Pc.principal(senderAddress)
        .willSendEq(MESSAGE_AMOUNT_SATS)
        .ft(
          `${SBTC_TOKEN_CONTRACT_ADDR}.${SBTC_TOKEN_CONTRACT_NAME}`,
          SBTC_FT_NAME,
        ),
    ],
    postConditionMode: stx.PostConditionMode.Deny,
    anchorMode: stx.AnchorMode.Any,
    fee: 0n,
    sponsored: true,
  });

  const txHex = tx.serialize();
  return { txHex, senderAddress };
}

function buildPaymentSignatureHeader(txHex, senderAddress) {
  // Confirmed 2026-05-09 vs working signal-filer: envelope is MINIMAL.
  // Server reads payTo/amount/asset from the sponsored TX postConditions,
  // NOT from the envelope. Adding them as top-level fields triggers
  // invalid_payload. Match signal-filer shape exactly.
  const envelope = {
    x402Version: 2,
    scheme: "exact",
    network: "stacks:1",
    payload: { transaction: txHex, sender: senderAddress },
  };
  return Buffer.from(JSON.stringify(envelope), "utf8").toString("base64");
}

// Phase 1: probe the recipient's inbox endpoint to extract the canonical
// 402 challenge. This gives us the exact accepts[0] entry the server expects
// to see echoed back in the X-PAYMENT envelope. Confirmed 2026-05-09: per-
// recipient payTo is unique (NOT the recipient's primary STX address).
async function discoverChallenge(recipientBtcAddress) {
  const url = INBOX_ENDPOINT_TPL.replace(
    "__RECIPIENT__",
    encodeURIComponent(recipientBtcAddress),
  );
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: "probe" }),
  });
  if (res.status !== 402) {
    const text = await res.text();
    throw new Error(
      `expected 402 challenge, got ${res.status}: ${text.slice(0, 300)}`,
    );
  }
  const challenge = await res.json();
  if (!challenge.accepts || !challenge.accepts.length) {
    throw new Error(
      `402 challenge missing accepts[]: ${JSON.stringify(challenge).slice(0, 300)}`,
    );
  }
  const accept = challenge.accepts[0];
  return {
    payTo: accept.payTo,
    amount: accept.amount,
    asset: accept.asset,
    network: accept.network,
    scheme: accept.scheme,
    maxTimeoutSeconds: accept.maxTimeoutSeconds,
    extra: accept.extra,
    resourceUrl: challenge.resource && challenge.resource.url,
  };
}

async function trySend(env, draft, ts, sig, paymentSig) {
  const url = INBOX_ENDPOINT_TPL.replace(
    "__RECIPIENT__",
    encodeURIComponent(draft.recipient),
  );
  const headers = {
    "Content-Type": "application/json",
    "X-BTC-Address": env.AIBTC_BTC_ADDRESS,
    "X-BTC-Signature": sig,
    "X-BTC-Timestamp": String(ts),
    "payment-signature": paymentSig,
    "X-PAYMENT-TOKEN-TYPE": "sBTC",
  };
  const payload = {
    content: draft.body,
  };
  if (draft.in_reply_to) payload.in_reply_to = draft.in_reply_to;

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  return {
    url,
    status: res.status,
    body: text.slice(0, 800),
    paymentResponse: res.headers.get("payment-response") || null,
  };
}

async function sendMessage(draft, opts = {}) {
  const env = loadEnv(opts.envPath);

  // Phase 1: discover the canonical 402 challenge for this recipient.
  // Skip discovery if caller pre-populated draft.payTo (regression test
  // shortcut + offline drafting).
  let challenge;
  if (draft.payTo || draft.pay_to) {
    challenge = {
      payTo: draft.payTo || draft.pay_to,
      amount: draft.amount || "100",
      asset:
        draft.asset ||
        `${SBTC_TOKEN_CONTRACT_ADDR}.${SBTC_TOKEN_CONTRACT_NAME}`,
      network: "stacks:1",
      scheme: "exact",
      maxTimeoutSeconds: 300,
      extra: { pricing: { type: "fixed", tier: "inbox-message" } },
    };
  } else {
    challenge = await discoverChallenge(draft.recipient);
  }

  const ts = Math.floor(Date.now() / 1000);
  // Server verifies BIP-322 sig over the actual request path
  const reqPath = INBOX_PATH_TPL.replace(
    "__RECIPIENT__",
    encodeURIComponent(draft.recipient),
  );
  const sigMessage = `POST ${reqPath}:${ts}`;
  const sig = bip322Sign(env.AIBTC_BTC_WIF, env.AIBTC_BTC_ADDRESS, sigMessage);

  // Phase 2: build sBTC sponsored TX with per-recipient payTo from challenge
  const { txHex, senderAddress } = await buildSignedSponsoredTx(env, {
    memo: "aibtc-msg",
    payTo: challenge.payTo,
  });

  const paymentSig = buildPaymentSignatureHeader(txHex, senderAddress);

  const attempt = await trySend(env, draft, ts, sig, paymentSig);
  return {
    ok:
      attempt.status === 200 ||
      attempt.status === 201 ||
      attempt.status === 202,
    challenge_used: challenge,
    attempts: [attempt],
    winning: attempt,
  };
}

// FREE reply path — POST /api/outbox/{my_btc}.
// Sig: BIP-322 over literal `Inbox Reply | {messageId} | {reply}`.
// No x402 payment. Used for replying to existing inbox messages.
// Confirmed 2026-05-09 via /api/outbox/{addr} GET schema probe.
async function sendReply(draft, opts = {}) {
  if (!draft.messageId)
    throw new Error("draft.messageId missing (required for reply)");
  if (!draft.reply) throw new Error("draft.reply missing (required for reply)");

  const env = loadEnv(opts.envPath);
  if (draft.reply.length > 500) {
    throw new Error(`reply length ${draft.reply.length} > 500 hard cap`);
  }

  const sigMessage = `Inbox Reply | ${draft.messageId} | ${draft.reply}`;
  const signature = bip322Sign(
    env.AIBTC_BTC_WIF,
    env.AIBTC_BTC_ADDRESS,
    sigMessage,
  );

  const url = `https://aibtc.com/api/outbox/${encodeURIComponent(env.AIBTC_BTC_ADDRESS)}`;
  const payload = {
    messageId: draft.messageId,
    reply: draft.reply,
    signature,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  return {
    ok: res.status >= 200 && res.status < 300,
    url,
    status: res.status,
    body: text.slice(0, 800),
    sent_at: new Date().toISOString(),
  };
}

async function main() {
  const argv = process.argv.slice(2);
  const draftPath = argv.find((a) => !a.startsWith("--"));
  if (!draftPath) {
    console.error(
      "Usage: aibtc-x402-stacks-inbox-sender.js <draft.json> [--dry-run]",
    );
    process.exit(1);
  }
  const dryRun = argv.includes("--dry-run");

  const draft = JSON.parse(fs.readFileSync(draftPath, "utf8"));

  // Auto-route: if draft has messageId, this is a REPLY (free /api/outbox path).
  // Otherwise it's a NEW message (paid /api/inbox x402 path).
  const isReply = Boolean(draft.messageId);

  if (isReply) {
    if (!draft.reply && draft.body) draft.reply = draft.body;
    if (!draft.reply) throw new Error("draft.reply missing");
    if (dryRun) {
      console.log(
        JSON.stringify(
          {
            dry_run: true,
            mode: "reply",
            messageId: draft.messageId,
            reply_len: draft.reply.length,
          },
          null,
          2,
        ),
      );
      return;
    }
    const result = await sendReply(draft);
    console.log(JSON.stringify(result, null, 2));
    const stamp = path.basename(draftPath).replace(/\.json$/, "");
    const outPath = path.join(
      path.dirname(draftPath),
      `${stamp}-reply-result.json`,
    );
    fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
    console.log(`\nResult saved: ${outPath}`);
    if (!result.ok) process.exit(2);
    return;
  }

  // NEW message (paid)
  if (!draft.recipient) throw new Error("draft.recipient missing");
  if (!draft.body) throw new Error("draft.body missing");
  if (draft.body.length > 500) {
    console.warn(
      `[warn] body length ${draft.body.length} > 500c (AIBTC inbox cap is 500)`,
    );
  }

  if (dryRun) {
    console.log(
      JSON.stringify(
        {
          dry_run: true,
          mode: "new_paid",
          recipient: draft.recipient,
          body_len: draft.body.length,
        },
        null,
        2,
      ),
    );
    return;
  }

  const result = await sendMessage(draft);
  console.log(JSON.stringify(result, null, 2));

  // Persist the result alongside the draft
  const stamp = path.basename(draftPath).replace(/\.json$/, "");
  const outPath = path.join(
    path.dirname(draftPath),
    `${stamp}-send-result.json`,
  );
  fs.writeFileSync(
    outPath,
    JSON.stringify({ ...result, sent_at: new Date().toISOString() }, null, 2),
  );
  console.log(`\nResult saved: ${outPath}`);

  if (!result.ok) process.exit(2);
}

if (require.main === module) {
  main().catch((err) => {
    console.error("FATAL:", err && err.stack ? err.stack : err);
    process.exit(3);
  });
}

module.exports = { sendMessage, sendReply, bip322Sign };
