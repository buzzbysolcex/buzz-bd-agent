<!-- P4P2-PRIVATE-SUPPRESS — PLATFORM-ONLY DISCLOSURE (HackenProof private). NO public content drafts. -->

# Hyperbridge — #2 queue Gate 1 + Zebra #166/#44 sibling-scan (PRIVATE: HackenProof)

**Date:** 2026-05-29 (Lane 5 batch #2 + Ogie msg 8021 sibling-hunt)
**⚠️ PLATFORM-ONLY DISCLOSURE — HackenProof PRIVATE. P4→P2 fanout suppressed. No public content.**
**Target:** `polytope-labs/solidity-merkle-trees` (named in-scope MMR/MPT proof lib) + `polytope-labs/hyperbridge` `evm/` ISMP contracts (HandlerV2 / EvmHost). HackenProof $30-50K Crit, $5/sub. KYC likely (operator step).
**Method:** source-read of BOTH the merkle library AND the message-handler/host, for BOTH the merkle binding-gap (#2 original scope, Doctrine #44) AND cache-before-validate (detector #166, Zebra GHSA-4m69-67m6-prqp ground-truth, Ogie msg 8021). Direction-error rule: verified Solidity semantics + control-flow myself, not assumed.
**Verdict:** **NEGATE / CLEAN — no live unpatched sibling of either Zebra primitive.** Hyperbridge is a **NEGATING-EXAMPLE**: it implements *exactly* the two defenses Zebra lacked.

---

## #166 — Cache-Before-Validate-No-Cleanup → NEGATE (cleanup-on-failure PRESENT)

**Handler ordering (validate-THEN-cache, the correct order):** `HandlerV2.handlePostRequests` (L181-209): builds leaves → `MerkleMountainRange.VerifyProof` (L201) → only if valid, loop dedup-check `requestReceipts(hash)!=0 → revert DuplicateMessage` (L207, a READ) → `dispatchIncoming` (L208). `handleGetResponses` identical shape (verify L238 → dedup L244 → dispatch L245). The proof is verified BEFORE any receipt write. [INSPECTED]

**Receipt-write is cleanup-on-failure (Zebra's exact missing piece, PRESENT here):** `EvmHost.dispatchIncoming(PostRequest)` (L794-818): `_requestReceipts[commitment] = relayer` (L807) → `destination.call(onAccept)` (L810) → **`if (!success) { delete _requestReceipts[commitment]; return; }`** (L812-815). The response path mirrors it (L827 write → L835 `if(!success) delete` L837). The receipt persists ONLY if the module call succeeds; on failure it is UNWOUND → retryable. Zebra's bug was the *absence* of this delete; Hyperbridge has it. [INSPECTED]

**Poison-receipt unreachable:** `dispatchIncoming` is `restrict(_hostParams.handler)` — only the handler calls it, and only AFTER a valid MMR proof. To store a receipt for hash H you must prove H is committed in the source-chain MMR → you cannot pre-seed a poison receipt for a not-yet-arrived message. No lockout vector. [INSPECTED]

## #44 — Identity-vs-Content Binding Gap → NEGATE (identity = content)

**Full-struct hashing (the opposite of Zebra ZIP-244 subset-binding):** `Message.hash(PostRequest) = keccak256(encode(req))`, `encode(req) = abi.encode(req)` — abi.encode over the FULL struct commits to EVERY field (source, dest, nonce, from, to, timeoutTimestamp, body). No field the consumer acts on is omitted from the identity. `GetResponse` = `{request, values}`, both encoded; response dedup keyed by `response.request.hash()` (a committed field). The repo's own CLAUDE.md documents the Rust↔Solidity `abi.encode` parity discipline (explicitly bans `abi_encode_params` which would drop the tuple wrapper) — the team has hardened against exactly this malleability class. [INSPECTED]

**MMR index-binding (named in-scope lib):** `MerkleMountainRange.VerifyProof = (root == CalculateRoot(proof, leaves, leafCount))`; `CalculateRoot` places each leaf by `leaves[i].index` into the subtree decomposition AND enforces sorted-unique indices (`if (leaves[i].index <= leaves[i-1].index) revert UnsortedLeaves`, L127-128). A leaf hash at the wrong index → different root → proof fails. Leaf = `(index, full-struct-hash)`; proof binds both. No index-substitution, no duplicate-index injection. [INSPECTED]

## Verdict + compounds

**NEGATE/CLEAN on both patterns + both layers (merkle lib + ISMP handler/host).** No surviving candidate → no PoC → no submission (correct under HackenProof no-PoC rule). This is a well-engineered bridge that closes both Zebra failure modes.

**Compounds (NEGATING-EXAMPLE anchors — sharpen the new detectors):**
- **#166 NEGATING-EXAMPLE = Hyperbridge `EvmHost.dispatchIncoming`** (cleanup-on-failure: write L807 → `if(!success) delete` L814). The "done-right" contrast to the Zebra positive anchor. Detector #166 should NOT fire when a matching `delete`/reset exists on every failure branch after the insert.
- **#44 NEGATING-EXAMPLE = Hyperbridge `Message.hash` + MMR index-binding** (full-struct abi.encode + sorted-unique index-to-root binding). The "identity = content" contrast to the Zebra subset-binding positive anchor.
- **Sibling-scan result:** the high-relevance bridge target with dedup caches = CLEAN. Next sibling-candidate = Cosmos-Go IBC (`ibc-go` SetPacketReceipt) — but ibc-go is the most-audited Go codebase (Doctrine #27 F-MAXIMUM → predictable foreclose); apply the Step 5.12 checklist at the next Cosmos Gate-1 rather than a dedicated clone (low EV vs saturation). Detector #166 Go-AST build remains the better ibc-class investment.

**Disk:** clones `gate2-clones/{smt,hb}` → purge (NEGATE, one-at-a-time).

---

_Gate 1: 2026-05-29-hyperbridge-166-44-siblingscan | PRIVATE/HackenProof | #2 queue + Zebra sibling-scan | **NEGATE/CLEAN** (cleanup-on-failure PRESENT L814/L837 → #166 negated; full-struct hash + MMR index-binding → #44 negated) | NO PoC (no candidate) | NEGATING-EXAMPLE anchors filed | single-agent_
