# Wormhole NTT Gate 2 Hyp-E (DC-8 Solana redeem.rs) — FORECLOSURE

**Date:** 2026-05-29
**Target:** Wormhole Native Token Transfers, Solana program `example-native-token-transfers`
**Repo HEAD:** `wormhole-foundation/native-token-transfers @ 4a15527c2785e0f455feb65e7a2c66c09f7a98f3`
**File-of-record:** `solana/programs/example-native-token-transfers/src/instructions/redeem.rs` (166 LOC)
**Source-read commit-pinned:** `4a15527c` (2026-05-26 HEAD — `sui: use new package management system #814`)
**Methodology:** Standing-Intake Protocol v1.0 Step 5 Gate 2 source-read + cross-file invariant chain validation
**Mode:** Sparse-clone `solana/` subtree only (1.6 MB on-disk; 5.5 G free at start)
**Verdict:** **FORECLOSE Hyp-E.** Defense IS in the Anchor `Accounts` struct (not moved into handler body). NTT redeem.rs is a properly-designed Anchor reference, NOT a DC-8 anchor candidate. Gate 1 PARTIAL HIT classification overgenerous — re-classify as NEGATING-EXAMPLE.

---

## §1 — THE HYPOTHESIS (re-stated from Gate 1)

Per `hunts/2026-05-28-wormhole-ntt-immunefi-gate1.md` §4 + §7.2:

> **Hypothesis E — DC-8 partial hit on Solana redeem.rs**: "votes.set(transceiver.id, true) + threshold-check executed in handler body, not pre-constraint in account struct. Pattern matches DC-8 canonical anchor (OnRe). Gate 2 candidate — Solana redeem.rs signer-validation-flow worth source-read deeper."

DC-8 canonical anchors (OnRe, Adevar, TruFin) share the defect:

- Signer / authority validation logic moved OUT of the Anchor `Accounts<'info>` struct
- Logic re-implemented in the handler body, where it can be forgotten, mis-ordered, or bypassed
- Anchor's type-system + macro-generated constraint checks never get a chance to enforce

**Hyp-E predicts NTT redeem.rs shares this gap** — predicting that the `votes.set` write + `threshold` count in handler body is missing pre-handler authorization, allowing some flavor of unauthorized vote.

EV pre-discount per Gate 1: $20K ($500K Tier 2 × 0.08 P(finding) × 0.50 P(acc) × 1.0 overlap).
Post-discount EV: $10.8K ($20K × 0.40 saturation × 1.5 Solana-12mo-drift × 0.90 friction).

---

## §2 — SOURCE-READ RESULT (commit `4a15527c`, redeem.rs full inspection)

### 2.1 Defense layer 1 — Anchor `Accounts<'info>` struct (lines 20-101)

The struct enforces ALL the authorization invariants BEFORE the handler body executes. Verified line-by-line `[INSPECTED]`:

| Constraint | Line(s) | What it enforces |
|------------|---------|------------------|
| `Account<'info, RegisteredTransceiver>` (typed) | 54 | Anchor macro auto-verifies (a) PDA derivation matches `[RegisteredTransceiver::SEED_PREFIX, transceiver_address]`, (b) account owner = program ID, (c) discriminator match. Cannot forge a `RegisteredTransceiver` without the program having previously initialized it via `register_transceiver`. |
| `constraint = config.enabled_transceivers.get(transceiver.id)? @ NTTError::DisabledTransceiver` | 52 | The transceiver MUST be in the enabled-bitmap on `config`. If `deregister_transceiver` was called against this id, this constraint REJECTS at Anchor preflight. Pre-handler check. |
| `owner = transceiver.transceiver_address` on `transceiver_message` | 45 | The raw `transceiver_message` account MUST be owned by the specific transceiver-program address from `RegisteredTransceiver`. Anchor verifies before handler runs. Caller cannot supply a fake transceiver_message PDA — only the actual transceiver program can have written it. |
| `peer.address == ...source_ntt_manager()` PDA-bound | 33 | The `peer` account is PDA-derived from the source chain ID embedded in the message, and the address inside it must equal the embedded `source_ntt_manager`. Two-sided binding — cannot supply a peer mismatching the message. |
| `inbox_item` PDA seeded by `keccak256(ntt_manager_payload)` | 65-72 | The inbox-item account is content-addressed by message hash. Two different transceivers voting on the SAME logical message converge on the SAME PDA. Two different messages diverge. Forging is impossible without bit-identical message. |
| `config.threshold > 0` precondition | 27 | Cannot redeem when threshold = 0 (covers race where threshold deregistered). |

### 2.2 Defense layer 2 — Handler body (lines 106-166)

Once the struct preflight passes, the handler body executes with ALL invariants already validated. The two operations the handler does that Hyp-E flagged:

```rust
// idempotent
accs.inbox_item.votes.set(accs.transceiver.id, true)?;   // line 142

if accs.inbox_item.votes.count_enabled_votes(accs.config.enabled_transceivers) < accs.config.threshold {
    return Ok(());                                          // line 144-150
}
```

Both operations are **bookkeeping writes**, NOT auth gates:

- **Line 142 `votes.set` is idempotent**: `Bitmap::set` (verified in `bitmap.rs:29-37` `[INSPECTED]`) just sets bit at `transceiver.id` to true. Same transceiver voting twice = no-op. The auth that this transceiver is allowed to vote is in the `Accounts` struct constraints above (lines 45 + 52 + 54).
- **Line 144-150 threshold count is correctness, not auth**: `Bitmap::count_enabled_votes(enabled)` in `bitmap.rs:46-51` computes `popcount(self.map & enabled.map)` — the bitwise AND with `enabled_transceivers` means votes from *currently-disabled* transceivers are automatically masked OUT at count-time. This is a structural defense against the cross-substrate Hyp-C transceiver-set-change race (a defense the EVM substrate lacks — see brain-compound W-2-NEG below).

### 2.3 Cross-reference — OnRe (DC-8 canonical) vs Wormhole NTT

| Aspect | OnRe (DC-8 anchor, DEFICIENT) | NTT redeem.rs (this analysis, DEFENSIVE) |
|--------|-------------------------------|------------------------------------------|
| Signer validation location | Moved into handler body | In `Accounts<'info>` via `Account<RegisteredTransceiver>` + `owner =` constraint + `enabled_transceivers.get()` constraint |
| Threshold / quorum check | Handler body, post-write | Handler body, post-write — BUT mask via bitwise AND with currently-enabled set (auto-invalidates stale votes) |
| Idempotency | Often missing — first-write-wins races possible | Content-addressed PDA (keccak256 of payload) + bitmap-set is mathematically idempotent |
| Replay protection | Often missing or buggy | `[released]` flag on `InboxItem.release_after()` + content-addressed PDA — VAA-level replay handled by message hash, execution-level replay by status flag |

**The pattern in NTT redeem.rs is the OPPOSITE of DC-8 anchor pattern.** It is a *properly-designed* Anchor program where the constraint layer IS the auth layer. The handler body writes are post-auth bookkeeping.

### 2.4 Squads V4 reference (DC-8 NEGATING-EXAMPLE catalog)

Per Gate 1 §5.4 Hyp-E cross-protocol enumeration: "Properly-designed Anchor program (e.g., Squads V4) — Signer constraint pinned in `#[account(signer)]` constraint at the account-struct level."

NTT redeem.rs follows the Squads V4 pattern: typed account references (`Account<RegisteredTransceiver>`) carry the signer-validation; the `owner =` and `constraint =` clauses bind cross-account invariants pre-handler. The handler body is mechanical post-auth work.

---

## §3 — ATTEMPTED EXPLOIT PATHS (all NEGATED)

Three attack scenarios consistent with DC-8 class, each NEGATED by the constraint layer `[INSPECTED]`:

### Path A: Vote twice as same transceiver

- Attacker supplies same `RegisteredTransceiver` + same `transceiver_message` twice
- Line 142 `votes.set` flips bit from true→true — no change
- Threshold check on line 144-150 sees same bitmap state — does not advance
- **NEGATES.** Bitmap idempotency is mathematical, not just commented.

### Path B: Vote as a different transceiver (forge identity)

- Attacker supplies arbitrary `RegisteredTransceiver` account
- Anchor `Account<RegisteredTransceiver>` discriminator check rejects non-program-owned account
- Anchor PDA derivation check (`seeds = [SEED_PREFIX, transceiver_address]`) rejects forged seeds
- Even if attacker somehow had a registered transceiver, line 45 `owner = transceiver.transceiver_address` on `transceiver_message` requires the actual transceiver program to have written the message
- **NEGATES.** Three layers of forgery defense.

### Path C: Vote against a deregistered transceiver

- Attacker waits until `deregister_transceiver` is called, then submits a vote with the now-disabled transceiver
- Line 52 `constraint = config.enabled_transceivers.get(transceiver.id)?` — fails at Anchor preflight, returns `NTTError::DisabledTransceiver`
- Even if a vote bit was set before deregistration, line 147 `count_enabled_votes(config.enabled_transceivers)` masks it out via bitwise AND
- **NEGATES.** Pre-handler reject + post-write mask.

---

## §4 — EV REVISION

Gate 1 estimated Hyp-E EV at $10.8K post-discount. Source-read reveals Hyp-E is structurally NEGATED — no plausible exploit path survives the Accounts struct constraint layer.

**Revised EV: $0.** Foreclose.

Brain-compound value remains positive (see §5).

---

## §5 — BRAIN COMPOUNDS PROPOSED

### W-5-NEG (replaces Gate 1 W-5 proposal — DC-8 4th anchor)

**ROLLBACK Gate 1 W-5 candidate.** NTT redeem.rs does NOT join (OnRe + Adevar + TruFin) as a 4th DC-8 anchor. It is a **DC-8 NEGATING-EXAMPLE** — file in `brain/Patterns-Defense-Classes.md` DC-8 section under a new NEGATING-EXAMPLES sub-catalog.

**Filing intent:**

```
DC-8 NEGATING-EXAMPLES (properly-designed Anchor programs where
signer/authority validation lives in Accounts<'info> struct):

1. Squads V4 — reference, per cross-protocol enumeration
2. Wormhole NTT solana/programs/example-native-token-transfers/src/
   instructions/redeem.rs @ 4a15527c (2026-05-26)
   - Account<RegisteredTransceiver> (PDA + owner discriminator)
   - `owner = transceiver.transceiver_address` on transceiver_message
   - `constraint = config.enabled_transceivers.get(transceiver.id)?`
   - Bitmap-AND mask at count time (auto-invalidates stale votes)
```

**Doctrine principle (NEW — proposed):** *PARTIAL HIT classifications in Gate 1 source-read-via-WebFetch require explicit POSITIVE-vs-NEGATIVE source-read at Gate 2 before EV credit. Don't bank "DC-8 partial hit" Gate 2 EV until commit-pinned source-read confirms the gap exists. NEGATING-EXAMPLES are valuable — they sharpen the boundary of the defense class.*

### W-2-NEG (refines Gate 1 W-2 — DC-9 sub-4 cross-substrate-quorum-bitmap variant)

The Solana substrate has a DEFENSIVE PROPERTY the EVM substrate lacks: `Bitmap::count_enabled_votes(enabled)` performs bitwise AND with current `enabled_transceivers` at count time (`bitmap.rs:46-51` `[INSPECTED]`). Stale votes from deregistered transceivers are automatically masked out — without needing per-message snapshot semantics.

**Refinement to W-2:** Gate 1 framed DC-9 sub-4 as a *cross-substrate* (EVM + Sui) confirmed gap. **The Solana substrate does NOT have the gap.** Cross-substrate confirmation reduces from {EVM, Sui} to {EVM, Sui} only — but the Solana NEGATING-EXAMPLE strengthens the confidence in EVM as the locus, since Solana shows the simple bitmap-AND fix would close it.

**Filing intent for `brain/Patterns-Defense-Classes.md` DC-9 sub-4 sub-variant:**

```
Cross-substrate variant: state-not-invalidated-across-config-change in
quorum-bitmap accumulator.

POSITIVE anchors (gap present):
  - Wormhole NTT EVM ManagerBase.sol — caches enabledTransceivers in
    memory during _prepareForTransfer(), removeTransceiver() modifies
    storage; in-flight messages reference stale set
  - Wormhole NTT Sui transceiver_registry.move + inbox.move — no
    version tags, epoch fields, or stale attestation invalidation

NEGATING anchor (gap absent — defense pattern):
  - Wormhole NTT Solana bitmap.rs count_enabled_votes(enabled) —
    bitwise AND with current enabled_transceivers at count time
    auto-masks votes from currently-disabled transceivers. Cheap,
    correct, structural defense. EVM/Sui could adopt by surfacing
    enabledBitmap at count rather than caching at attestation.
```

This is the productization-gap narrative SHARPENED by the cross-substrate-asymmetry. Gate 2 paste-ready for Hyp-C (Wormhole NTT EVM) can cite the Solana defense as the proof-by-implementation that the fix is mechanical.

### Step 3a anchor count

Wormhole NTT Hyp-E adds an additional Step 3a anchor data-point (the substrate-identity check trivially passed for Hyp-E — the auth substrate IS in NTT solana/, and the source-read confirmed it). No promotion change needed (Step 3a already CANONICAL at 3 anchors per Gate 1 W-1; Hyperlane Warp 4th anchor per `hunts/2026-05-29-hyperlane-warp-immunefi-gate1.md`).

---

## §6 — AI-CLAUSE COMPLIANCE NOTE

Wormhole Immunefi has the prohibited-AI-conduct clause (per DISC-022b PERMANENT). Per Ogie msg 7956 (NEW directive):

> DISC-022b is forward-looking only — do NOT add proactive operator-validation comments to the submission body; the clause applies to future submissions only, not retroactive.

This is a FORECLOSURE, not a paste-ready submission. No submission is being produced. No operator-validation comment is needed in this document. AI-clause compliance is N/A for foreclosure filings.

If a future Hyp-C or Hyp-B Gate 2 PoC CONFIRMS and produces a paste-ready, that paste-ready will apply the DISC-019 7-rule refactor + Foundry PoC + commit hash + [EXECUTED]-bias R8 tags + 2+ external citations, but per Ogie 7956 will NOT include an operator-validation-receipt sentence (forward-looking application only, not retroactive to in-flight submissions).

---

## §7 — CLONE DISPOSITION

Sparse clone retained at `/home/claude-code/buzz-workspace/.tmp-gate2-wormhole-hype/native-token-transfers/` (1.6 MB):

- Hyp-C agent may need EVM subtree — coordinate at `.tmp-gate2-wormhole-hypc/` per task-spec
- This clone has `solana/` sparse-checkout only — does NOT clobber an EVM Hyp-C clone if Hyp-C agent expands sparse-checkout differently

**Disposition decision:** PURGE this clone after foreclosure-receipt logged in brain. Foreclosure is final on Hyp-E. Solana subtree is not needed for follow-up. Frees 1.6 MB. Hyp-C agent's clone (if separate path) is unaffected.

---

## §8 — VERDICT SUMMARY

**FORECLOSE Hyp-E.** Source-read at commit `4a15527c` (2026-05-26 HEAD) confirms NTT Solana `redeem.rs` is a NEGATING-EXAMPLE of DC-8, not a candidate. Defense IS at account-struct level via:

1. `Account<RegisteredTransceiver>` typed PDA + discriminator
2. `owner = transceiver.transceiver_address` on `transceiver_message`
3. `constraint = config.enabled_transceivers.get(transceiver.id)?` pre-handler enable-check
4. Content-addressed `inbox_item` PDA by `keccak256(payload)` — mathematical idempotency
5. `Bitmap::count_enabled_votes(enabled)` bitwise AND mask at count time — auto-invalidates stale votes

Three attack paths (vote twice, forge transceiver identity, vote against deregistered) all NEGATE. Revised EV: $0.

**Brain compounds filed (proposed):**

- W-5-NEG: NTT redeem.rs as DC-8 NEGATING-EXAMPLE (replaces Gate 1 W-5 4th-anchor proposal)
- W-2-NEG: DC-9 sub-4 cross-substrate-quorum-bitmap NEGATING anchor (Solana) — sharpens EVM/Sui POSITIVE anchors for Hyp-C narrative
- New doctrine candidate: PARTIAL HIT Gate 1 classifications require explicit Gate 2 POSITIVE-or-NEGATIVE source-read before EV credit

**Time-cost:** ~25 min Gate 2 (sparse clone 1.6 MB + 3 file reads + 2 grep + brain-compound write). Saved ~2-3h Anchor-test-validator build by foreclosing on rigorous source-read alone — defense-in-depth made the exploit structurally impossible without needing to instantiate.

**Next-target rec:** Hyp-C (EVM transceiver-set-change race) remains the highest-EV Wormhole NTT Gate 2 surviving candidate (~$44K post-discount). Coordinate with Hyp-C agent at `.tmp-gate2-wormhole-hypc/` clone path. The W-2-NEG Solana-defense observation here is a citable corroborator for the Hyp-C paste-ready (proof-by-Solana-implementation that the fix is mechanical and the EVM/Sui omission is the productization gap).

---

_Gate 2 Hyp-E FORECLOSURE | Wormhole NTT Immunefi | 2026-05-29 | Commit `4a15527c` | Sparse-clone solana/ 1.6 MB | Source-read NEGATES via Anchor Accounts-struct defense layer | 3 brain compounds proposed (W-5-NEG, W-2-NEG, new doctrine candidate) | AI-clause N/A (forward-looking-only per Ogie 7956 + this is a foreclosure not a submission) | Next: Hyp-C remains highest-EV; W-2-NEG observation is a paste-ready citable corroborator_
