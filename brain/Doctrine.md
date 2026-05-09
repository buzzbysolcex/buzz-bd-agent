# Doctrine

v3.1-FINAL rev2, hash 4531a4de, path /data/buzz/persistent/doctrine/v3.1-FINAL.md
Crash rules: self-containment audit, smoke test, dependency check, service=buzz container=buzz-production, HALT gates, rollback ladder.
Reboot: ssh > sudo -iu claude > tmux new -s buzz > cd buzz-workspace > launch > paste prompt > Ctrl+B D. Never tmux send-keys. /effort high.

## Standing rule (May 9 2026 — Ogie msg 6444, PERMANENT)

**qwen3:8b is for Skeptic adversarial verification ONLY. Never for content generation that carries Ionic Nova's name. All public-facing content = Opus only.**

qwen3 is a pattern-matching tool, not a content writer. It hallucinates when asked to create — proven by 2026-05-09 auto-cron filings ("dog-intelligence module", "1200 sats/agent saved" — fabricated). Keep it in its lane: BuzzShield Layer 4 Skeptic, where it adversarially tests a finding against pre-existing source code (no creative latitude). Never for AIBTC signal bodies, tweets, outreach copy, technical writeups, or any output bearing Buzz BD Agent / Ionic Nova attribution. Public-facing copy = Opus 4.7 in-context, always.

---

# Detector Doctrines (Priority-Ordered Hierarchy)

> Authority: Ogie msg "May 9 17:40 UTC DOCTRINE.md INSERT (before Canonicalization-Consistency)" — declared the Weaker-Property doctrine as the ROOT, with Canonicalization-Consistency + No-Overwrite-Guard as derived sub-doctrines. Reordered into priority hierarchy as Ogie specified.

## Priority #0: VERIFY-PREMISE-FIRST

> ⚠️ **Placeholder.** Ogie's 17:40 UTC msg references this as the existing Priority #0 doctrine that the Weaker-Property doctrine should be inserted _after_. The doctrine text was apparently assigned in an earlier message I never received in this session. When the canonical text arrives, replace this placeholder. Until then, the operational intent inferred from context: before applying any detector or running any pipeline phase, verify the premises that the detector assumes are true (target file exists, target language matches, fields are populated, scope is correct). Same intent as the implementation-verification-gaps.md standing rule — "module-local unit tests pass while feature stays inert end-to-end."

## Priority #1: WEAKER-PROPERTY-THAN-DOWNSTREAM-ASSUMES (ROOT)

Origin: QED Audit Commonware writeup 2026-05-09, their own framing.

**Statement:**

> All bugs of significance reduce to the same pattern: systems validate a weaker property than what downstream components assume.

**Formalization:**

For every validation site V and consumer site C:

```
let validated = property_enforced_by(V)
let assumed   = property_assumed_by(C)
```

If `validated ⊊ assumed`, there exists an attack surface in the gap.

**Confirmed instances in Buzz ground truth:**

| Instance                            | V validates                  | C assumes                                    |
| ----------------------------------- | ---------------------------- | -------------------------------------------- |
| HE-19 visibility-miss (#117/#122)   | auth on view fn              | auth was validated on the right (mutator) fn |
| Firedancer HTTP framing (imu-77340) | Content-Length integer parse | RFC 7230 §3.3.3/3.2.4/§ rules conformance    |
| QED Commonware BLS                  | aggregate sum                | individual component bound                   |
| QED Commonware Reed-Solomon         | Merkle root match on decode  | canonical padding on re-encode               |
| QED dYdX EIGEN-USD                  | byte-exact ticker uniqueness | canonical-form uniqueness (oracle routing)   |

**How to apply:**

Every new detector PR MUST answer two questions in its template:

1. What property does this validation actually enforce?
2. What stronger property does the downstream consumer assume?

If the answers are identical, the detector is checking nothing useful.
If the answers differ, the gap IS the detector's target.

**Sub-doctrines that derive from this:**

- Priority #2: CANONICALIZATION-CONSISTENCY (string normalization gaps)
- Priority #3: NO-OVERWRITE-GUARD (write semantics gaps)
- HE-19 / VISIBILITY-MISS (auth scope gaps — landed)
- Class K / FRAMING-DIVERGENCE (protocol parsing gaps — Firedancer)
- HE-20 / INVARIANT-MULTI-MUTATOR (state mutator scope gaps — landed)

This doctrine is the ROOT. All Buzz detector design flows from it.

## Priority #2: CANONICALIZATION-CONSISTENCY (sub-doctrine of #1)

Origin: QED dYdX oracle hijack (2026-05-06 writeup, $10K USDC bounty, $1.2M open-interest exposure, 17-month exposure window). Forwarded by Ogie msg "17:00 UTC dYdX QED WRITEUP DECODED" (May 9 2026).

**Statement:**

> When module A reads/writes a shared store keyed by `canonical(X)`, and module B gates writes to that store using `raw(X)` comparisons, there exists a seam where two raw inputs that canonicalize to the same value bypass the gate.

**Specialization of #1:** the gate validates `raw(X) != raw(existing)` (weaker), but the consumer assumes `canonical(X) != canonical(existing)` (stronger).

**Applies to:** Cosmos SDK chains, EVM (token symbol normalization), Solana (PDA seed derivation order), any system with shared state across modules.

**Origin trace:** `protocol/x/prices/keeper/market.go` duplicate-check used byte-exact equality; `slinky_adapter.AddCurrencyPairIDToStore` used `strings.ToLower` canonicalization. Two raw tickers with case-shift Unicode equivalents bypassed the dup gate, then silently overwrote canonical mapping. Fix landed 2026-03-16: `strings.EqualFold` + `store.Has(key)` guard pair.

**How to apply:** any time you see a string comparison gating a store write, ask "is the same string canonicalized differently elsewhere?" If yes, the gate is permeable. Trace all upstream and downstream uses of the key. Detector spec filed as #137 (cross-module canonicalization mismatch detector, depends on #129 Cosmos SDK / Go coverage).

## Priority #3: NO-OVERWRITE-GUARD (sub-doctrine of #1)

Origin: same QED dYdX writeup as Priority #2.

**Statement:**

> Stores representing logical mappings (`ID`, `Registry`, `Index`, `Map`) must enforce write-once or explicit-overwrite semantics. Silent `Set` is an anti-pattern when the key represents a unique identity.

**Specialization of #1:** the validation site `store.Set(...)` enforces "successful write" (weaker), but the consumer assumes "this key was previously unset" (stronger).

**Applies to:** Cosmos SDK keeper KVStore.Set, EVM mapping(...) writes, Solana PDA-keyed account writes, any "registry" or "uniqueness map" pattern.

**Origin trace:** `slinky_adapter.AddCurrencyPairIDToStore` performed `store.Set(key, val)` without preceding `store.Has(key)` check. Combined with the canonicalization mismatch above, an attacker overwrite of canonical mapping became reachable. Fix is the `Has(key)` guard pair.

**How to apply:** any time you see a `Set` on a store whose name matches `/(ID|Map|Registry|Mapping|Index)$/`, require a preceding `Has(key)` check unless the codepath has explicitly documented "this is an upsert". If unsure, file as suspect. Detector spec filed as #138 (no-overwrite-guard detector, depends on #129 Cosmos SDK / Go coverage).

---

_(Existing doctrines below as Priority #4+. Add new doctrines into this hierarchy as they are derived from Priority #1.)_
