# Coinbase CB-MPC — Research Pass

> Date: 2026-05-21 (filed overnight per FULL POWER ORDER C — research only, no Gate 1 commitment)
> Commit pinned: HEAD `a8ee24c` "feat: add ML-KEM-768 and extend bn256_t/DRBG/RO primitives (#115)" (2026-05-19)
> Repo: `/home/claude-code/.tmp-build/cb-mpc-clone/`
> Program: HackerOne /coinbase — **OPEN-SOURCE cb-mpc bounty tier**
> Status: research pass only. Full Gate 1 deferred — MPC audit is multi-week work.

---

## 0. Bounty tier (from BUG_BOUNTY.md verbatim)

| Tier     | Description                                                                                      | Reward           |
| -------- | ------------------------------------------------------------------------------------------------ | ---------------- |
| Extreme  | (Coinbase production code, N/A for this OSS repo)                                                | Up to $1,000,000 |
| Critical | High-severity vuln in supported high-level protocol (Signing / DKG / TDH2), key compromise / RCE | **$50,000**      |
| High     | High-severity vuln in supported public API, less easily exploitable                              | **$15,000**      |
| Medium   | Hard-to-exploit / limited-impact, demonstrable via supported public APIs                         | **$2,000**       |
| Low      | Non-cryptographic crashes / deprecated code                                                      | $200             |

**Scope discipline:**

- Eligible: vulnerabilities reachable through PUBLIC APIs in `include/cbmpc/api/*.h`
- PoC required for Medium+
- MPC protocol-break PoCs: parties on separate machines; honest party uses unmodified code
- **Out of scope:** `demo-*` directories, `include/cbmpc/c_api/*` headers
- Internal headers (`include-internal/`) may be referenced for impact analysis but PoC cannot use them as entry point

---

## 1. Repo inventory

| Layer                     | Path                                                        | LOC        |
| ------------------------- | ----------------------------------------------------------- | ---------- |
| Public APIs               | `include/cbmpc/api/*.h` (13 headers)                        | 1,185      |
| Internal protocol headers | `include-internal/cbmpc/internal/protocol/*.h` (20 headers) | 2,150      |
| Internal crypto headers   | `include-internal/cbmpc/internal/crypto/*.h` (~20 headers)  | ~3,000     |
| ZK proof headers          | `include-internal/cbmpc/internal/zk/*.h` (6 headers)        | ~1,500     |
| Source (cpp)              | `src/cbmpc/**/*.cpp`                                        | **25,292** |
| Vendors                   | `vendors/` (OpenSSL, third-party)                           | excluded   |

**Total signal:** ~32K LOC of C++ cryptographic primitives + protocols.

**Language mix:** 295 .h + 196 .cpp (C++ dominant), 42 .py (test scaffolding), 4 .rs (rust bindings — minimal), 2 .go (go bindings — minimal).

---

## 2. Public-API surface (the bounty-eligible attack entrypoints)

```
include/cbmpc/api/
├── curve.h                              14 LOC  — curve abstraction
├── ecdsa_2p.h                           80 LOC  — ECDSA two-party threshold sig (Lindell/DKLs)
├── ecdsa_mp.h                          128 LOC  — ECDSA multi-party (GG18/GG20-like)
├── eddsa_2p.h                           78 LOC  — EdDSA two-party (Ed25519)
├── eddsa_mp.h                          131 LOC  — EdDSA multi-party
├── hd_keyset_ecdsa_2p.h                 41 LOC  — BIP32-style derivation for ECDSA-2P
├── hd_keyset_eddsa_2p.h                 46 LOC  — BIP32-style derivation for EdDSA-2P
├── pve_base_pke.h                      164 LOC  — Publicly Verifiable Encryption (base, PKE-class)
├── pve_batch_ac.h                      117 LOC  — PVE batch + access control
├── pve_batch_single_recipient.h         72 LOC  — PVE batch (single recipient)
├── schnorr_2p.h                         92 LOC  — Schnorr two-party (Bitcoin Taproot context)
├── schnorr_mp.h                        147 LOC  — Schnorr multi-party
└── tdh2.h                               75 LOC  — Threshold Decryption (TDH2 scheme)
```

**Top targets by historical exploit-class density:**

### 2.1 ECDSA-MP (`ecdsa_mp.h` + `ecdsa_mp.cpp`) — HIGHEST EV

Reference classes:

- **TSSHOCK** (THORChain Bifrost, multiple instances) — multiplicative-vs-additive share inversion in GG18/GG20.
- **Fireblocks 2022** (Side-Channel disclosure on GG18) — biased nonce leak.
- **Olaoluwa Osuntokun's gg20-vuln-cubed-key-share** (LN Labs) — k-share computation off-by-one.
- **Adevar audit DC-8** (Anchor signer validation moved out of struct) — adapted for MPC: "what authenticates the participant at protocol step N?"

Surface dimensions:

1. **DKG (Distributed Key Generation):** does any party know the full secret share linearly combined from others? Polynomial evaluation in MPC must hide constituent shares — if the verification step has a missing constraint, a malicious participant can learn the full key.
2. **Signing — k inverse:** GG18's biggest exploit class. `1/k` mod `q` requires MPC-multiplication. If one party can manipulate the multiplication to make `1/k` predictable, signature can be forged.
3. **Re-share / refresh:** if proactive secret-sharing has a flaw, post-refresh shares can leak old secrets.
4. **Identifiable abort:** without it, a malicious party can sabotage signing without consequence. With it (and verification flaws), false-accusation could blacklist honest parties.

### 2.2 ECDSA-2P (`ecdsa_2p.h` + `ecdsa_2p.cpp`) — HIGH EV

Lindell17 / DKLs23 family. Famous exploit classes:

- **Paillier-based MtA (multiplicative-to-additive share conversion):** if Paillier ciphertext can be malleated by attacker, share leakage. (cf. multiple academic results on biased nonce generation in Lindell17.)
- **ZK proof of Paillier key well-formedness:** if accepted without checking factoring difficulty parameter, side-channel attack.
- **Signature mauling:** if `s` value is not normalized to low-s, malleable signatures.

### 2.3 HD Keyset (`hd_keyset_ecdsa_2p.h` + cpp) — HIGH EV

BIP32-style derivation OVER an MPC-shared key. Reference exploit class:

- **Fireblocks 2022:** BIP32 hardened derivation requires the SECRET key, which an MPC-shared key cannot expose. If derivation logic uses non-hardened path improperly, an attacker who sees one derived child key + chain code can derive ALL siblings + extract the master public key.
- **Cross-derivation key leak:** if derivation step adds a tweak that escapes the MPC boundary, master share leakage.

### 2.4 PVE (`pve_base_pke.h`, `pve_batch_ac.h`, `pve_batch_single_recipient.h`) — MEDIUM-HIGH EV

Publicly Verifiable Encryption is a fresh primitive in Coinbase's MPC stack. Allows a recipient (or witness) to verify the encrypted contents WITHOUT decryption. Exploit classes:

- **Verifier reject for valid ciphertext** (liveness)
- **Verifier accept for invalid ciphertext** (correctness break — can lead to silent secret loss / wrong-message acceptance)
- **Soundness/zero-knowledge break:** the ZK proof attached to PVE must be sound — an attacker who can forge a proof of "correct encryption" against a malformed ciphertext can substitute their plaintext.

### 2.5 TDH2 (`tdh2.h` + cpp) — MEDIUM EV

Threshold Decryption (with Homomorphism). The threshold-decryption oracle is sensitive: if a partial decryption can leak information, full plaintext exposure is possible across a small number of queries.

Reference: Shoup-Gennaro 1998. Classic exploit: chosen-ciphertext attack via partial-decryption-oracle.

### 2.6 Schnorr-2P / Schnorr-MP — MEDIUM EV

Schnorr is structurally simpler than ECDSA. Two-party Schnorr is well-studied (Lindell 2019). Exploit classes are narrower:

- **Nonce binding:** Schnorr requires `r = g^k` then `s = k + e*x`. If `k` is exposed (e.g., reused across signatures), `x` leaks linearly.
- **Binding attacks (MuSig2 / FROST):** if R-value is committed before the message, attackers can grind to find a desired R. CB-MPC presumably uses commit-then-open for `R`.

### 2.7 EdDSA-2P / EdDSA-MP — MEDIUM EV

EdDSA is deterministic — the nonce derives from the secret key + message via PRF. MPC EdDSA breaks this property because the secret key is split. Replacing the deterministic nonce with random nonce introduces RNG dependency. If the random nonce is biased, key leakage in O(log q) signatures.

Reference: Mary Maller's EdDSA-MPC tutorial + the Garillot-Yin 2022 attack on naive EdDSA-MPC.

---

## 3. Highest-EV next actions (deferred to deep-dive Gate 1 session)

1. **`src/cbmpc/protocol/ecdsa_mp.cpp` — focus on `k_inverse` MPC subroutine.** Compare against GG18 paper + known TSSHOCK class. If any cross-party multiplication has a missing ZK-proof step, file Critical.
2. **`src/cbmpc/protocol/ecdsa_2p.cpp` — focus on Paillier MtA subroutine.** Verify the ZK proof of Paillier key well-formedness (range proof, equality proof) is checked on EVERY ciphertext.
3. **`src/cbmpc/protocol/hd_keyset_ecdsa_2p.cpp` — BIP32 derivation.** Confirm hardened derivation is BLOCKED (or handled correctly via MPC). If non-hardened paths leak chain code, master public key extraction is possible from one derived key + chain code.
4. **`src/cbmpc/protocol/pve_base.cpp` + `pve_ac.cpp` — PVE verifier.** Hunt for asymmetric soundness: can a malicious prover convince an honest verifier of a malformed encryption?
5. **`src/cbmpc/protocol/ot.cpp` — Oblivious Transfer.** Selector-bit leak class. If 1-of-2 OT can leak the selector bit, MPC composition collapses.
6. **`include-internal/cbmpc/internal/zk/zk_paillier.h` + `zk_unknown_order.h`** — review the ZK proof soundness. Read against the Bulletproof / Schnorr-style fiat-shamir scaffolding.

---

## 4. Tools & methodology constraints

Per BUG_BOUNTY rules:

- PoC must use ONLY public APIs (`include/cbmpc/api/*.h`)
- Parties must run on SEPARATE machines for protocol-break PoCs
- Honest party uses unmodified library; malicious party interacts only through public APIs
- Internal headers can be referenced for ROOT CAUSE analysis but not used as entry point

**Implication for BuzzShield V6 pipeline:**

The V6 detector pack is Solidity/Rust-focused. CB-MPC is C++. Need to:

1. **Adapt static detectors for C++** — semgrep has C++ rules; trail-of-bits Slither doesn't apply.
2. **Manual review is the right approach** — MPC bugs are protocol-level, semgrep can't find them.
3. **PoC scaffolding requires the demo-api / demo-cpp infrastructure** — though those are out-of-scope for SUBMISSION, they're the right place to BUILD a PoC against the public API.

---

## 5. Decision

**This is a multi-week target.** $50K Critical + $15K High on a respected primitive library is high-EV but the bar to find a bug is HIGH. The library has been internal at Coinbase for years and recently open-sourced — most easy bugs have been audited out.

**Tonight:** filed this research pass. No Gate 1 deep dive.

**Recommendation:** queue for a focused 2-day dedicated MPC audit session. Read the GG18/GG20/DKLs23/Lindell17 papers FIRST, then come back to the cb-mpc impl with a sharp pattern-matcher.

**Cross-pollination with Buzz brain:**

- **DC-8 analog in MPC:** "Anchor signer-validation moved out of Accounts struct" = "MPC participant-validation moved out of session state". If a CB-MPC protocol step accepts arbitrary participant input without re-verifying their session binding, that's the DC-8 cross-domain hit. File for `brain/Cross-Domain-Fragility-Laws.md` — DC-8 may extend from Solana to MPC.
- **TSSHOCK = arithmetic-rounding-asymmetry (CANDIDATE-E family).** Multiplicative vs additive inverse. Same family as the Raydium cp-swap bug I retroactively analyzed.

---

_Coinbase CB-MPC research pass — surface map filed, no submit, queue for dedicated 2-day audit._
