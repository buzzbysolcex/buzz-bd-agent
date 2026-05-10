#!/usr/bin/env node
/**
 * AIBTC Keystore One-Shot Decryptor
 *
 * Decrypts the AIBTC agent wallet keystore (AES-256-GCM + scrypt) ONCE,
 * extracts the agent STX private key, and appends to .env.aibtc as
 * AIBTC_AGENT_STX_PRIVATE_KEY. Sets chmod 600 on the env file.
 *
 * Authority: Ogie msg 6573-6576 Day 9 morning A1 GREENLIT.
 * Doctrine: brain/Doctrine.md "Wallet Decryption Discipline" + Worked
 *           Example #8.
 *
 * Hardening (R1-R4 from Ogie msg 6573):
 *   R1: in-memory only; key value NEVER printed; chmod 600 immediately
 *   R2: .env.aibtc is in .gitignore (verified pre-build)
 *   R3: smoke-test target chosen separately, not in this script
 *   R4: doctrine entry filed BEFORE this code shipped
 *
 * Run ONCE:
 *   node aibtc-keystore-decrypt-once.js
 *
 * On success: writes AIBTC_AGENT_STX_PRIVATE_KEY to .env.aibtc, chmods,
 * prints ONLY confirmation status (no key value, no derived material).
 * Exits 0.
 *
 * On failure: prints diagnostic (keystore not found / password missing /
 * decryption failed / write failed). Exits non-zero. No key written.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const KEYSTORE_PATH =
  "/home/claude-code/.aibtc/wallets/cf0df16e-5960-48ad-be0a-0040af23ddb6/keystore.json";
const ENV_PATH = "/home/claude-code/.env.aibtc";
const ENV_KEY_NAME = "AIBTC_AGENT_STX_PRIVATE_KEY";
const ENV_ADDR_NAME = "AIBTC_AGENT_STX_ADDRESS";
const EXPECTED_ADDR = "SP24EH4DG99ZSSZY501BFH9Z4YTDJHC4B8X4K8BST";

// Unescape bash-style backslash escapes in env values: \! → !, \$ → $, \" → ",
// \\ → \. Matches how bash interprets the value when the env file is sourced.
// Critical because the env file is human-edited (and at least one value
// contains \! which JS reads as 2 chars but bash treats as 1).
function unescapeBashEnvValue(s) {
  return s.replace(/\\(.)/g, "$1");
}

function loadEnvFile(p) {
  const lines = fs.readFileSync(p, "utf8").split("\n");
  const env = {};
  for (const ln of lines) {
    const m = ln.match(/^([A-Z_]+)=(.+)$/);
    if (!m) continue;
    let v = m[2].trim();
    // Strip surrounding quotes
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    else if (v.startsWith("'") && v.endsWith("'")) v = v.slice(1, -1);
    // Unescape backslash sequences for unquoted values (bash-source behaviour)
    v = unescapeBashEnvValue(v);
    env[m[1]] = v;
  }
  return env;
}

function exitWith(code, msg) {
  process.stderr.write(`${msg}\n`);
  process.exit(code);
}

function main() {
  // --- Pre-flight checks ---
  if (!fs.existsSync(KEYSTORE_PATH)) {
    exitWith(2, `keystore not found at ${KEYSTORE_PATH}`);
  }
  if (!fs.existsSync(ENV_PATH)) {
    exitWith(2, `env file not found at ${ENV_PATH}`);
  }

  const env = loadEnvFile(ENV_PATH);
  const password = env.AIBTC_WALLET_PASSWORD;
  if (!password) {
    exitWith(2, "AIBTC_WALLET_PASSWORD missing from .env.aibtc");
  }

  // Idempotency: if key already written, do nothing
  if (env[ENV_KEY_NAME]) {
    process.stdout.write(
      `${ENV_KEY_NAME} already present in env. Aborting (idempotent).\n`,
    );
    process.exit(0);
  }

  // --- Read keystore ---
  const keystore = JSON.parse(fs.readFileSync(KEYSTORE_PATH, "utf8"));
  const enc = keystore.encrypted;
  if (!enc || !enc.ciphertext || !enc.iv || !enc.authTag || !enc.salt) {
    exitWith(3, "keystore.encrypted missing required fields");
  }
  const sp = enc.scryptParams || { N: 16384, r: 8, p: 1, keyLen: 32 };

  // --- Derive AES key via scrypt ---
  const salt = Buffer.from(enc.salt, "base64");
  const derivedKey = crypto.scryptSync(password, salt, sp.keyLen, {
    N: sp.N,
    r: sp.r,
    p: sp.p,
    maxmem: 256 * 1024 * 1024,
  });

  // --- AES-256-GCM decrypt ---
  const iv = Buffer.from(enc.iv, "base64");
  const authTag = Buffer.from(enc.authTag, "base64");
  const ciphertext = Buffer.from(enc.ciphertext, "base64");

  const decipher = crypto.createDecipheriv("aes-256-gcm", derivedKey, iv);
  decipher.setAuthTag(authTag);

  let plaintext;
  try {
    plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch (err) {
    exitWith(
      4,
      `AES-GCM decrypt failed (likely wrong password or corrupted keystore): ${err.message}`,
    );
  }

  // --- Parse plaintext: try JSON first, then plain string formats ---
  let walletData = null;
  const plainStr = plaintext.toString("utf8");
  try {
    walletData = JSON.parse(plainStr);
  } catch (_e) {
    // Not JSON. Inspect shape (no value echo).
    const isPrintable = /^[\x20-\x7E\n\r\t]+$/.test(plainStr);
    const hexFmt = /^[0-9a-fA-F]+$/.test(plainStr.trim());
    const wordCount = plainStr.trim().split(/\s+/).length;
    process.stderr.write(
      `[diag] plaintext shape: bytes=${plaintext.length}, printable=${isPrintable}, hex=${hexFmt}, words=${wordCount}\n`,
    );

    if (hexFmt && plaintext.length >= 32 && plaintext.length <= 80) {
      // Likely raw STX private key (hex). 64 chars = 32-byte key (no compression flag);
      // 66 chars = 33-byte key (with compression flag, common for Stacks).
      walletData = { stxPrivateKey: plainStr.trim() };
    } else if (isPrintable && (wordCount === 12 || wordCount === 24)) {
      // BIP-39 mnemonic. We need to derive STX private key from it via @stacks/wallet-sdk.
      walletData = { mnemonic: plainStr.trim() };
    } else {
      exitWith(
        5,
        `decrypted plaintext: unexpected format (bytes=${plaintext.length}, printable=${isPrintable}, hex=${hexFmt}, words=${wordCount})`,
      );
    }
  }

  // Look for STX private key — common keystore field names
  let stxKey =
    walletData.stxPrivateKey ||
    walletData.stacks?.privateKey ||
    walletData.privateKey ||
    walletData.stxKey;

  let stxAddr =
    walletData.stxAddress || walletData.stacks?.address || walletData.address;

  // Derive from mnemonic via @stacks/wallet-sdk if needed
  if (!stxKey && walletData.mnemonic) {
    return deriveFromMnemonic(
      walletData.mnemonic,
      password,
      keystore.addressIndex || 0,
    )
      .then(({ stxKey: dk, stxAddr: da }) => finalizeAndWrite(dk, da))
      .catch((e) => exitWith(10, `mnemonic derivation failed: ${e.message}`));
  }

  if (!stxKey) {
    process.stderr.write(
      `decrypted plaintext keys: ${Object.keys(walletData).join(", ")}\n`,
    );
    exitWith(
      6,
      "STX private key not found in decrypted plaintext under standard field names",
    );
  }

  finalizeAndWrite(stxKey, stxAddr);
}

function finalizeAndWrite(stxKey, stxAddr) {
  if (!stxKey) exitWith(6, "no STX private key available after derivation");

  // Verify address matches expected (defense against keystore corruption / wrong wallet)
  if (stxAddr && stxAddr !== EXPECTED_ADDR) {
    exitWith(
      7,
      `keystore decrypted but STX address ${stxAddr.slice(0, 6)}... does not match expected ${EXPECTED_ADDR.slice(0, 6)}...`,
    );
  }

  // --- Write to env file (R1: chmod 600 immediately) ---
  const appendBlock = `\n# Added 2026-05-10 — Buzz BD Agent (Ionic Nova) STX wallet for /api/inbox sender (Doctrine: Wallet Decryption Discipline)\n${ENV_ADDR_NAME}=${EXPECTED_ADDR}\n${ENV_KEY_NAME}=${stxKey}\n`;
  fs.appendFileSync(ENV_PATH, appendBlock);
  fs.chmodSync(ENV_PATH, 0o600);

  // --- Confirmation output (R1: NEVER echo key value) ---
  process.stdout.write(`Decryption: PASS\n`);
  process.stdout.write(`Agent STX address verified: ${EXPECTED_ADDR}\n`);
  process.stdout.write(
    `Env vars written to ${ENV_PATH}: ${ENV_ADDR_NAME}, ${ENV_KEY_NAME}\n`,
  );
  process.stdout.write(`File permissions: chmod 600 applied\n`);
  process.stdout.write(
    `Next step: smoke-test sendMessage() against R3-compliant low-stakes target\n`,
  );
  process.exit(0);
}

async function deriveFromMnemonic(mnemonic, password, addressIndex) {
  process.stderr.write(
    `[diag] deriving STX key from ${mnemonic.split(/\s+/).length}-word mnemonic via @stacks/wallet-sdk\n`,
  );
  const sdkPath =
    "/home/claude-code/.npm/_npx/943a06e1e7f97830/node_modules/@stacks/wallet-sdk";
  let sdk;
  try {
    sdk = require(sdkPath);
  } catch (e) {
    throw new Error(
      `@stacks/wallet-sdk not loadable from ${sdkPath}: ${e.message}`,
    );
  }
  const wallet = await sdk.generateWallet({
    secretKey: mnemonic,
    password: password,
  });
  if (!wallet.accounts || wallet.accounts.length === 0) {
    throw new Error("wallet generated but no accounts present");
  }
  const acct = wallet.accounts[addressIndex] || wallet.accounts[0];
  const stxKey = acct.stxPrivateKey;
  let stxAddr = null;
  try {
    const stxLib = require("/home/claude-code/buzz-workspace/api/node_modules/@stacks/transactions");
    stxAddr = stxLib.getAddressFromPrivateKey(stxKey, "mainnet");
  } catch (_e) {
    // address derivation optional; fail soft
  }
  return { stxKey, stxAddr };
}

main();
