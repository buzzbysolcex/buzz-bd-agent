# Vuln-Class — ZK Circuit Soundness (Under-Constrained Proof Systems)

> Authority: Ogie msg 8158/8159 (2026-06-05), codify-loop. **CODIFIED, NOT HUNTED** (capability-gated, §GATE).
> Source event: Zcash **Orchard** counterfeiting bug — disclosed early June 2026 (Taylor Hornby / Shielded Labs / ZODL, using Anthropic Opus 4.8 + a custom constraint-reasoning harness). Public + remediated → safe to codify.
> Disposition: RECALL-grade only. Buzz today CANNOT do precise circuit-level review (see §CAPABILITY GAP).

---

## THE CLASS

**Under-constrained / soundness bugs in proof systems** (Halo2, PLONK, Groth16, STARK, circom, arkworks, plonky2).

**Principle:** any witness/advice signal that is USED in the computation but not _pinned_ by a constraint lets a malicious **prover** forge a valid proof of a **FALSE** statement. The proof verifies; the statement is a lie. Consequences scale with what the proof gates:

- value-bearing pool → **counterfeiting / unbounded forged claims** — _but blast radius is set by the containment boundary, NOT the raw forge_ (see IMPACT CALIBRATION below),
- rollup → **invalid state transition** accepted as valid,
- bridge / mixer / identity → spoofed membership / double-spend / forged attestation.

**Why it's the apex class:** soundness bugs are (a) invisible to source-level static analysis (the bug is in the _constraint system_, not the syntax), (b) latent for years (Orchard: May 2022 → June 2026, ~4y, evaded many of the world's best cryptographers), and (c) when in a privacy system, **un-provable whether ever exploited** (you cannot tell counterfeit from real). Highest p_net_new, highest blast radius, highest validation danger.

## IMPACT CALIBRATION — the Orchard turnstile correction (Doctrine #52, Ogie msg 8160)

**Correction to the prior framing.** The Orchard bug was first stated as "unlimited, undetectable counterfeit ZEC." Precisely: the under-constrained EC mul let an attacker forge unlimited counterfeit Orchard **notes (claims) _inside_ the pool** — but Zcash's **turnstile** caps what those claims can become.

- **The turnstile** = a consensus-enforced value-conservation boundary. Public accounting: `new Orchard balance = old balance − valueBalanceOrchard` (deposit 10 → −10 valueBalance, pool up; withdraw 10 → +10, pool down; in-pool transfer → 0). **Nodes reject any block that drives the pool balance negative** — you cannot withdraw more public ZEC from Orchard than has publicly entered it.
- **True bounded impact:** NOT a chain-wide infinite mint of spendable ZEC. It is **Orchard under-collateralization / insolvency** — fake claims compete with honest claims for a _finite_ vault (dilution / crowd-out of honest Orchard holders). Realized external theft only to the extent value exited the pool **before detection** (timing-bounded).
- **Stakeholder map (A/B/C, Pattern-I):** **A.** Orchard pool holders → direct solvency/dilution risk. **B.** Adjacent Sapling pool → not directly broken; at risk only if value exited Orchard pre-detection. **C.** Transparent/unshielded holders → no direct theft; exposure = market-confidence, exchange halts, fork drama.
- **The lesson:** never claim "infinite / chain-wide" when a conservation boundary caps it (overclaim = credibility kill, the Notional "AI report" failure mode). The turnstile is what SAVED chain-wide ZEC supply. Had the turnstile been **absent / bypassable / not enforced by all clients**, the same circuit bug WOULD have been chain-wide catastrophic — that missing boundary is itself the top-severity finding (Pattern-I escalator).

## SUB-PATTERN TAXONOMY

Anchored to external corpora: **0xPARC ZK Bug Tracker**, **Veridise**, **Trail of Bits `circomspect`**.

| #   | Sub-pattern                                                                             | Nearest #47 seam        | Note                                                     |
| --- | --------------------------------------------------------------------------------------- | ----------------------- | -------------------------------------------------------- |
| a   | **Under-constrained witness/advice** (umbrella)                                         | —                       | the parent class; b–i are specializations                |
| b   | Missing range / field-overflow (non-canonical mod-p representations)                    | numerical-gap (closest) | a value > p wraps; the "number" isn't canonical          |
| c   | Missing boolean constraint (a bit not pinned to {0,1})                                  | numerical-gap (closest) | advice meant to be 0/1 can be any field elt              |
| d   | **Under-constrained EC ops** — on-curve / point-add / scalar-mul ← **the Orchard case** | trust-gap (closest)     | EC mul accepted arbitrary/false inputs; off-curve points |
| e   | Unverified nondeterministic hints (witnessed inverse/quotient not re-checked)           | flow-gap (closest)      | `a*inv==1` not asserted; prover supplies any inv         |
| f   | Aliasing / multiple valid bit-decompositions                                            | numerical-gap (closest) | same value has 2+ accepted witness encodings             |
| g   | Conditional-select selector not constrained boolean                                     | numerical-gap (closest) | mux selector free → choose either branch's output        |
| h   | Public-input ↔ in-circuit witness not bound                                             | flow-gap (closest)      | the proven statement ≠ the asserted public claim         |
| i   | Halo2-specific: wrong-row/rotation, selector/gate misuse, lookup misconfig              | flow-gap (closest)      | gate applies on the wrong cell; lookup table gap         |

## THE NEW SEAM — "CONSTRAINT-COMPLETENESS" (the #47 gap this class exposes)

**Explicit flag (per directive):** the existing three seams (flow / numerical / trust — Doctrine #47) do **NOT** cover this class cleanly. They reason about _Solidity/Rust execution_ — what the code DOES. Circuit soundness is about what the constraint system **FAILS TO FORBID** — the _absence_ of a constraint, not a wrong line. The mappings above are "nearest," not "covers."

→ **Constraint-Completeness** is a **NEW, fourth seam** (the #47 register gains a constraint-layer dimension): _"for every witness/advice signal the circuit uses, is there a constraint that pins it to exactly its intended value/domain? Enumerate every assigned cell; the unpinned one is the forge."_ This is the seam-hunter's "A assumes B validated, B assumes A validated" lifted to _"the verifier assumes the constraint set is complete; the prover exploits the one missing constraint."_ It is a **non-execution** seam — you cannot find it by tracing control flow; you must enumerate the constraint set against the intended relation.

→ Doctrine #47's 3 passes (flow/numerical/trust) are CODE seams; **constraint-completeness is the 4th pass, applicable only on ZK-CIRCUIT-tagged code, and requires a constraint-level harness (not source grep).**

---

## §3 — DETECTOR: RECALL-NET SURFACER ONLY (honest grade)

**NOT a precise rule.** Generic semgrep / Rust / Solidity static analysis is **blind** to circuit soundness — the bug lives in the constraint system, not the source syntax. Any "precise ZK soundness detector" claim would be capability inflation.

**What Buzz CAN build now (cheap, honest):** a **RECALL surfacer** that TAGS a repo/path `ZK-CIRCUIT` and routes it to the soundness pass — **output = a target tag for the analyst lane, NEVER a finding.** Tag signals (grep-level):

- **Imports / deps:** `halo2`, `halo2_proofs`, `halo2curves`, `circom`, `snarkjs`, `arkworks`/`ark-*`, `plonky2`, `bellman`, `gnark`.
- **Curves:** Pasta / Pallas / Vesta, BN254/BLS12-381 in a proving context.
- **Halo2 primitives:** `EccChip`, `assign_region`, `assign_advice`, `assign_fixed`, custom-gate (`create_gate`, `meta.query_*`), `lookup`/`lookup_any`, `Selector`.
- **Gadgets:** scalar-mul / point-add / range-check / decompose / `pow`/`invert` witness.
- **circom:** `template`, `signal input/output`, `<==`/`<--` (the `<--` assign-without-constrain is itself a smell), `===`.

Implementation: extend the path/tag layer (sibling to `scripts/lib/scope_path_filter.py`); emit `tag: ZK-CIRCUIT` + the matched signals → analyst-lane "constraint-completeness pass" (which today = OPEN, no harness). **RECALL-grade: high false-positive, that's intended — it routes, it does not judge.**

## §CAPABILITY GAP (state it plainly — no inflation)

**Buzz today has ZERO circuit-level reasoning capability.** Precise soundness review needs a harness Buzz does NOT have:

- semgrep / Rust-static / Solidity-static = blind (constraint-completeness is non-syntactic).
- qwen3 = retired (2026-06-03) and was never a circuit reasoner anyway.
- No `circomspect` (ToB, circom), no **Veridise Picus** (circom soundness), no Halo2 analyzer integrated.
- No Opus-driven constraint-reasoning harness (the thing Taylor Hornby actually built + paired with Opus 4.8).

**Build-decision (logged as OPEN QUESTION):** two paths — (1) integrate existing tooling (`circomspect` + Picus for circom; a Halo2 mock-prover / under-constrained analyzer for Halo2), OR (2) build an Opus-driven constraint-reasoning harness (enumerate assigned cells → ask "is this pinned?" per cell against the intended relation). Path (1) is circom-only + partial; path (2) is general but a real build. **Neither exists today.** See `brain/Open-Questions-Tracker.md`.

## §GATE (binding)

This niche has **genuinely high p_net_new** (these bugs evade audits for years) — **but ONLY if Buzz can actually do circuit-level review.** Until the harness exists, ZK soundness is **CODIFIED, NOT HUNTED.** Do NOT add ZK targets to the active hunt queue. The RECALL surfacer may TAG; the analyst lane has no soundness pass to route to yet → tags park until the harness earns its place. **DISCLOSURE-SAFETY (Doctrine #51) precedes any future ZK hunt.**

## CONSTRAINT-COMPLETENESS — "DONE-RIGHT" CHECKLIST (the 4th-seam audit template, added 2026-06-05)

The constraint-completeness seam generalizes beyond ZK circuits to **any signed-or-proven digest** consumed on-chain (EIP-712 orders, Merkle/EB proofs, attestation quorums, signed price reports). Two clean EVM **NEGATING reference templates** banked — both are constraint-COMPLETE; use them as the bar.

**The 5-point checklist — a complete scheme binds ALL of:**

1. **IDENTITY** — the subject (clusterId / order benefactor+beneficiary / message-id) is in the digest, and is itself derived from trusted state (not attacker-substitutable).
2. **VALUE** — every consumed quantity (effectiveBalance / collateral_amount + usde_amount / price) is in the digest.
3. **FRESHNESS/STALENESS** — a binding that forces the latest/non-replayable state (latest-root force, expiry, nonce, observationsTimestamp ≥ request).
4. **RANGE** — consumed values are bounded to a sane domain (EB ∈ [32,2048]·validators; amounts ≠ 0).
5. **MALLEABILITY-RESISTANCE** — fixed-width encoding (`abi.encode`, OZ double-hash) — no `encodePacked` aliasing, no signature malleability that matters.

**Reference template A — SSV EB-proof** (`SSVClusters._verifyMerkleProof`, NEGATE): leaf `keccak256²(abi.encode(clusterId, effectiveBalance))` ✓id ✓value; `_verifyEBStaleness` forces `blockNum==latestCommittedBlock` ✓freshness; `_verifyEBLimits` [32,2048] ✓range; double-hash `abi.encode` ✓malleability.
**Reference template B — Ethena EIP-712 order** (`EthenaMinting.encodeOrder`, NEGATE): `abi.encode(ORDER_TYPE, order_type, expiry, nonce, benefactor, beneficiary, collateral_asset, collateral_amount, usde_amount)` ✓id ✓value; `order_type` bound (no MINT/REDEEM confusion) + domain binds `chainid+address(this)` ✓freshness/replay; amounts≠0 ✓range; `abi.encode` ✓malleability. (The `route` is unsigned BUT custodian-allowlisted + ratio-checked + MINTER-gated — an acceptable out-of-digest field because it can't redirect value to an attacker.)

**Usage:** on any new signed/proven-digest consumer, walk the 5 points. **Flag any scheme missing one** — a missing IDENTITY = cross-subject substitution; missing VALUE = field-substitution; missing FRESHNESS = replay (cf. accepted SSV 76267 EB-drift); missing RANGE = out-of-domain forge; missing MALLEABILITY = aliasing/replay (Doctrine #44 identity-vs-content). An out-of-digest field is only safe if (like Ethena's route) it's independently constrained so it can't move value to the attacker.

_Cross-ref: Doctrine #47 (seam-hunter — this adds the 4th "constraint-completeness" seam), #49 (AI+human+harness+PoC convergent-validation), #50 (PoC+work-log > prose), #51 (disclosure-safety), #57 (off-chain-conversion → numerical seam absent), DC-21 (BuzzShield placement), `brain/Ground-Truth-Exploits.md` (Orchard anchor); EVM NEGATING anchors `hunts/2026-06-05-ssv-network-directed-audit-gate2.md` + `hunts/2026-06-05-ethena-directed-audit-gate2.md`._
