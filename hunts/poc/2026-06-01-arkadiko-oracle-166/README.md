# Arkadiko Oracle #166 — Cache-Before-Validate DoS PoC ([EXECUTED] 3/3 PASS)

**Target:** `arkadiko-oracle-v2-3.clar` `update-price-multi` (Immunefi, $100K, PoC-required).
**Detector:** #166 (cache-before-validate; Zebra GHSA-4m69-67m6-prqp family).
**Status:** 3/3 PASS — see `RESULT.txt`.

## The bug

`update-price-multi` marks each submitted signature `used` (map-set into `signatures-used`)
inside the uniqueness `asserts!` — a **cache INSERT that runs BEFORE the quorum check**.
The under-quorum branch returns `(ok false)` (a SUCCESS), so the inserts **COMMIT** even
though no price was written, and the failure path never UNWINDS them. A later legitimate
full-quorum update that reuses those signatures then reverts `ERR-SIGNATURES-NOT-UNIQUE`
(u8403) = oracle-update lockout for that message.

## Reproduce

```bash
cd <this-dir>            # contracts/ + Clarinet.toml + settings/Devnet.toml expected alongside
npm install @hirosystems/clarinet-sdk @stacks/transactions @noble/curves @noble/hashes
node poc-166-oracle-sig-dos.mjs
```

(The harness is `@hirosystems/clarinet-sdk` wasm simnet — no clarinet binary / devnet needed.
A minimal stub `arkadiko-dao.clar` provides `get-dao-owner` for the trusted-oracle setup only;
the finding path `update-price-multi` does NOT call it. `settings/Devnet.toml` uses the
canonical clarinet dev mnemonics.)

## What it proves (and what it does NOT)

PROVES ([EXECUTED]): a single oracle-update message can be locked out by pre-emptively
burning its signatures via an under-quorum submission. The signature-marking is committed on
the no-op `(ok false)` path.

Does NOT independently prove (honest scoping): sustained price staleness → fund loss. That
requires (a) winning the tx-ordering race every round on Stacks' miner-ordered mempool, (b)
the keeper not re-signing for a fresh `block`, (c) no DAO-owner `update-price-owner` override,
and (d) the missing consumer staleness check (sub-finding #2, [INSPECTED]) biting during a
real price move. Severity on its own merits = Medium (recoverable oracle griefing/DoS).
