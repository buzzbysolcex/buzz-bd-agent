# Patterns: Defense Classes

> Defense mechanisms that suppress real-looking findings into FPs. Initialized 2026-05-14 from Stride L3.5 manual verification (5/5 transfer.go HIGHs → SOPHISTICATED_FP). Each defense class teaches the L3.5 Stage 2 prompt (and Skeptic) to recognize and downgrade.

---

## DC-1: Caller-Path-Disabled (architectural)

**Definition:** A function looks vulnerable in isolation, but its only caller is commented out / behind a disabled feature flag / unreachable from any live BeginBlocker / EndBlocker / Msg handler / governance proposal handler.

**Where seen:**

- Stride v32 `TransferCommunityPoolDepositToHolding`, `TransferHoldingToCommunityPoolReturn` — both reachable only via `ProcessAllCommunityPoolTokens` which is commented out in hooks.go:89-91 ("Disabled in v28 as this feature is no longer being used"). 4 Stride L3.5 HIGHs collapsed to FP under this defense (L3.5d-5/-6/-11/-12).

**Audit-time check:**

1. For each finding, identify the function being flagged
2. Grep for callers of that function across the codebase (excluding tests)
3. For each caller, trace upward to a live entry point (BeginBlocker / EndBlocker / Msg handler / ICQ callback / IBC callback / governance handler)
4. If the upward trace dead-ends at a commented-out line / disabled feature flag / removed module → **dormant code; not exploitable**
5. Note the disable-vintage (version number, date) — gives a sense of how stable the disable is

**Reachability prompt enricher for L3.5 Stage 2:**

```
For each violation, trace the caller graph from the vulnerable function to a live entry point: Cosmos SDK BeginBlocker, EndBlocker, Tx Msg handler, IBC callback, ICQ callback, or governance proposal handler. If no live entry point exists (caller commented out, feature-flag-disabled, removed module), classify the violation as Caller-Path-Disabled and assign severity NONE.
```

**Risk if mis-applied:** A "disabled" feature could be re-enabled in a future upgrade. Defense applies to CURRENT exploitability, not future. For bug bounty programs, current exploitability is the bar — re-enabling requires a governance vote / version bump, which is OOS.

---

## DC-2: Function-Parameter Atomicity (SDK semantics)

**Definition:** A function takes state values (epoch number, block height, current time) as parameters. These values are FIXED for the function's entire execution. The function is invoked within an atomic block-scoped handler (Cosmos SDK BeginBlocker / EndBlocker / Tx execution), so no mid-execution state transition is possible.

**Where seen:**

- Stride v32 `TransferExistingDepositsToHostZones(ctx, epochNumber, depositRecords)` — function takes `epochNumber` as parameter. Filter and inner removal-guard both compare `record.DepositEpochNumber < epochNumber` against the same fixed value. Sonnet flagged this as "race condition between filter and guard" — false. L3.5d-19.

**Audit-time check:**

1. For each finding alleging a "race condition" / "epoch boundary advance mid-block" / "block height changes during execution"
2. Check whether the disputed state value is a FUNCTION PARAMETER (not a fresh `ctx.BlockHeight()` / fresh epoch query) at each comparison point
3. Check whether the function is invoked from a Cosmos SDK atomic handler (BeginBlocker / EndBlocker / msg handler)
4. If both: **no race; function-parameter atomicity holds**

**Reachability prompt enricher for L3.5 Stage 2:**

```
Reject race-condition violations whose scenario assumes a function parameter (epoch number, block height, current time, sequence number passed as argument) changes mid-execution. Cosmos SDK BeginBlocker, EndBlocker, and Tx handlers are atomic — function parameters are fixed for the function's execution scope. Only flag races where the disputed state is freshly queried via `ctx.BlockHeight()`, `ctx.BlockTime()`, or a similar in-function call that could observe state advancement.
```

**Risk if mis-applied:** Asynchronous goroutines / callbacks could technically observe state advancement. But Cosmos SDK doesn't expose async goroutines from BeginBlocker/EndBlocker — execution is synchronous block-scoped. Defense applies to standard SDK handlers, not custom async code (which would itself be a smell).

---

## DC-3: Invariant-Scope-Overgeneralization

**Definition:** Stage 1 invariant is correctly stated for a general protocol-class principle (e.g., "every in-flight IBC transfer must have a rollback path"), but Stage 2 applies it to a code path where the invariant doesn't operationally bind (e.g., community-pool one-shot ICA transfers don't create DepositRecord state, so they don't need a rollback callback).

**Where seen:**

- Stride v32 `TransferCommunityPoolDepositToHolding` `icaCallbackId=""` flagged as missing-rollback. But the function creates NO DepositRecord — funds either land or stay in the source ICA address. There's no "in-flight transfer state" to roll back. The empty callback is intentional design. L3.5d-11.

**Audit-time check:**

1. For each finding alleging "missing rollback / missing callback / missing state cleanup"
2. Check whether the function in question creates or mutates a tracked state record (DepositRecord, UnbondingRecord, Position, Order, etc.)
3. If NO state record is created → no rollback needed; empty callback is correct
4. Compare to the live counterpart path that DOES create state records — confirm it correctly registers callbacks (defense-in-depth check: the live path has the protection it needs)

**Reachability prompt enricher for L3.5 Stage 2:**

```
Before flagging a "missing rollback / missing callback" violation, verify that the function mutates a tracked lifecycle record. If no state record is created or transitioned, no rollback is needed. Empty callback IDs in one-shot transfer functions are intentional, not buggy.
```

**Risk if mis-applied:** Some legitimate bugs are "missing rollback on a state mutation that DOES exist but is obscured by indirection." Defense doesn't suppress those — it only suppresses missing-callback findings where no state lifecycle is touched.

---

## DC-4: Commitment-Hash-Finalized-Before-External-Call

**Definition:** State-after-external-call (CEI violation) appears in a function that writes `_state[commitment][...] += ...` AFTER a reentrancy-eligible external call. The slot key `commitment` is computed from a hash of input data (including a nonce / order ID / sequence number) that is captured BEFORE the external call. Even if attacker re-enters, the inner call computes a DIFFERENT commitment hash from its own (different) input data → writes to a DIFFERENT slot. No slot-collision exploit possible.

Combined with `_filled[commitment]` or `_used[commitment]` mutex preventing double-payout, and `onlyHost` / `onlyOwner` / protocol-gated downstream consumers that read this state, the entire CEI violation collapses to SOPHISTICATED_FP.

**Where seen:**

- Hyperbridge IntentGateway.sol:356 `placeOrder` — `_orders[commitment][token] += amount` after `safeTransferFrom`. Commitment = `keccak256(abi.encode(order))` computed at line 363 BEFORE the loop. Downstream `redeem()` and `onGetResponse()` are `onlyHost`-gated and check `_filled[commitment]`. L1d-79 SOPHISTICATED_FP (verified by subagent 2026-05-14).

**Audit-time check:**

1. For Pattern D state_after_external_call findings where state is keyed by a hash/commitment:
2. Check whether the commitment hash is COMPUTED BEFORE the first external call (not after, not inside loop on per-iteration data)
3. Check whether the hash includes data that varies between caller invocations (nonce, sequence, user-supplied unique value)
4. Check whether downstream consumers of that state (refund/release/withdraw) are protocol-gated (`onlyHost` / `onlyOwner` / cross-chain authenticated) AND check a mutex (`_filled`, `_used`, `_consumed`)
5. If all four: **commitment-finalized defense applies**; CEI violation is benign

**Reachability prompt enricher for L3.5 Stage 2:**

```
For Pattern D state_after_external_call where the state is keyed by a hash/commitment value: if the commitment is computed BEFORE the external call AND the downstream consumers of that state are protocol-gated AND there is a mutex check on the same commitment key, classify as Commitment-Hash-Finalized defense and downgrade severity. Reentrancy cannot inflate a slot it cannot re-address.
```

**Risk if mis-applied:** if the commitment computation includes ONLY data that's static across reentry (e.g., `keccak256(abi.encode(msg.sender))` only — no nonce, no fresh sequence number), the defense doesn't hold. Always verify the commitment includes a per-call unique element.

---

## DC-5: Trusted-Filler Callback Pattern

**Definition:** Pattern D state_after_external_call flagged on a function that LITERALLY uses a callback by design (1inch / Cowswap / DutchTrade-style filler protocols). The function:

1. Locks the bidder/filler/intent-fulfiller into state BEFORE the callback (`bidder = msg.sender; status = ACTIVE`)
2. Transfers sell tokens / unlocks resource to the callee
3. Invokes `IFillerCallee(msg.sender).callback(...)` — intentional external call
4. After the callback returns, verifies via balance-delta: `balanceAfter - balanceBefore >= expected`
5. Settles via `origin.settleTrade()` / `origin.settleOrder()` — finalizes state machine
6. Final state-machine check (`require(status == CLOSED)`)

The state-after-external-call pattern is INTENTIONAL — it's the design of the protocol. Reentrancy is prevented by (a) state machine status check at entry, (b) bidder-already-set check at entry, (c) balance-delta verification post-callback, (d) trusted-filler modifier (non-reentrant).

**Where seen:**

- Reserve Protocol DutchTrade.sol:259 `bidWithCallback` — `closeTrustedFiller` modifier + `bidder == address(0)` + `status == OPEN` entry guards + balance-delta verify at lines 287-290. L1d-14 SOPHISTICATED_FP (2026-05-14).

**Audit-time check:**

1. Does the function name end with "Callback" / "Filler" / "Fulfill" / "Settle" suggesting intentional callback?
2. Is the external call to a callee derived from msg.sender (e.g., `IFillerCallee(bidder).callback(...)`)?
3. Are state writes BEFORE the callback (lock-bidder pattern), with state writes AFTER the callback being only the settlement step?
4. Is there a balance-delta verification immediately after the callback?
5. Is there a state-machine status check at function entry preventing re-entry?

If 1+2+3+4+5: **Trusted-Filler defense; benign Pattern D.**

**Reachability prompt enricher for Skeptic post-filter:**

```
For Pattern D state_after_external_call flagged on functions whose name contains "Callback", "Filler", "Fulfill", "Settle", or "Trade": check whether (a) the external call recipient is derived from msg.sender (callback to caller), (b) state writes occur BEFORE the callback that LOCK the caller as bidder/filler, (c) a balance-delta or equivalent value verification occurs AFTER the callback. If all three: classify as Trusted-Filler defense and downgrade severity.
```

**Risk if mis-applied:** True reentrancy bugs in callback-style functions exist (e.g., flash-loan bug classes). Defense applies only when the post-callback balance verification is rigorous AND the state-machine prevents re-entry into the same trade. Verify balance-check arithmetic is sound (no integer underflow on `balanceAfter - balanceBefore`).

---

## DC-6: Permissionless-Trigger-With-Config-Determined-Recipients

**Definition:** A function appears Pattern A admin-unprotected (no `onlyOwner`, no `msg.sender` guard). TV-RFQ / Pattern A correctly flags the shape. BUT all fund-flow destinations are **config-determined** — initializer-set state vars or `config.getX()` lookups — not msg.sender-controlled. The "anyone-can-poke" semantic is INTENTIONAL: caller pays gas to trigger a distribution / sweep / bridge to admin-configured recipients. Same shape across multiple protocols.

**Where seen:**

- Stader `NodeELRewardVault.withdraw()` (contracts/NodeELRewardVault.sol:22) — recipients are `staderConfig.getStakePoolManager()`, `staderConfig.getStaderTreasury()`, `UtilLib.getOperatorAddressByOperatorId(...)`. All derived from a single config pointer. Triaged 2026-05-14 L1c-244.
- Renzo `xRenzoDepositNativeBridge.sweep(IERC20)` (Bridge/L2/xRenzoDepositNativeBridge.sol:420) — recipients are `mainnetRecipient` (set ONCE in initialize, no setter), `mainnetDestinationDomain` (initializer-only), `valueTransferBridges[_token]` (set via `setSupportedToken(...) external onlyOwner`). Triaged 2026-05-14 L1c-109.
- Renzo `xRenzoDepositNativeBridge.sweepETH()` (Bridge/L2/xRenzoDepositNativeBridge.sol:454) — same shape as sweep. Triaged 2026-05-14.

**Critical distinction from TrustedVolumes:**

TrustedVolumes' $6.7M historical bug had `setBeneficiary(address)` callable by anyone, allowing msg.sender to redirect funds to their own address. DC-6 protocols have NO anyone-callable setter — `mainnetRecipient` / `staderConfig` / `valueTransferBridges` are all either initializer-only or `onlyOwner` gated. Same Pattern A shape, opposite outcome.

**Dual-framing note (added 2026-05-17 per operator directive D3):** DC-6 entry-primitive (ungated `setBeneficiary` / permissionless signer-registration in TrustedVolumes' case) feeds CANDIDATE-F downstream kill-chain (field-binding asymmetry between validating-consumer key and executing-consumer key — `allowedOrderSigner[receiver][signer]` validated but `order.taker` consumed). See `brain/Cross-Domain-Fragility-Laws.md` v1.4 §TrustedVolumes-2026-05-14 entry for worked examples. Both framings correct at different kill-chain layers: DC-6 catches the entry-gate gap; CANDIDATE-F catches the downstream value-extraction vector. Use both when triaging a TrustedVolumes-class candidate.

**Audit-time check:**

1. For each Pattern A admin-unprotected finding on a function with fund-flow (`safeTransfer`, `sendValue`, `transferRemote`, `.call{value:}`, `depositFor{value:}`):
2. Extract destination args from each fund-flow call (first arg of safeTransfer/sendValue; second arg of transferRemote; address inside payable(...) wrapper; first arg of curried `{value:}` call).
3. **Negative-control:** if ANY destination is `msg.sender` or `tx.origin` → REAL BUG shape, not DC-6.
4. **Negative-control:** if ANY destination is an `address` parameter of the function → REAL BUG shape (caller-supplied recipient).
5. **Positive-confirm:** if at least one destination is a config-getter (`<id>.get<Word>(`), mapping lookup (`<id>[`), library helper, or bare state-var identifier → DC-6 candidate.
6. **Safety check:** grep the contract for `function set*` functions WITHOUT `onlyOwner` / `require(msg.sender == ...)` gating. If an ungated setter touches one of the destination state vars → abstain (TrustedVolumes-class risk).
7. **Permissionless confirm:** the function must NOT have `onlyOwner` modifier or inline `require(msg.sender == X)` (otherwise it's not the DC-6 shape — it's a normal admin function).

If 1+2+3+4+5+6+7: **DC-6 Permissionless-Trigger; auto-REJECT.**

**Skeptic hard-exclusion rule (HE-25, shipped 2026-05-14):**

`buzzshield-skeptic.js` HE-25 implements all 7 criteria. 9/9 unit tests + 3/3 real-file regression (Stader withdraw, Renzo sweep, Renzo sweepETH) pass. Negative controls verified: msg.sender recipient, address-param recipient, ungated setBeneficiary, onlyOwner gate, no fund-flow, inline sender guard, cross-pattern misfire — all 7 do NOT auto-REJECT.

**Risk if mis-applied:** A protocol could have an ungated setter that the AST grep misses (e.g., implemented via assembly, or inherited from a deeply-imported base contract). Criterion 6 catches the common case; manual review on any DC-6 candidate that's high-value bounty target is wise. Pattern is currently observed in two independent codebases (Stader + Renzo) — likely 3-4 more in the watchlist.

---

## DC-7: Validating-Field ≠ Consuming-Field on Adjacent Function Pipelines

**Definition:** When a function pipeline validates input using KEY-A (e.g., `allowedOrderSigner[receiver][signer]`, the `toChain` field on a signed VAA, the URL validator on an HTTP path, the storage slot key for a replay mutex write) but the downstream consumer pipeline reads / executes / writes using KEY-B (e.g., `order.taker` for the token transfer, `targetChain` from a separate config lookup, the URL re-parser on a WebSocket path, the storage slot key for the replay mutex read), an exploit surface exists where the attacker chooses inputs satisfying KEY-A's validation while controlling KEY-B's consumption. The validating pipeline grants permission for a property the consuming pipeline doesn't actually enforce.

**Promotion authority:** Operator decision msg 7209 (2026-05-18 10:56 UTC). Promoted from CANDIDATE-F based on 4 worked examples across 2 domains (web framework + EVM smart contract) anchored 2026-05-11 / 2026-05-14-15 / 2026-05-14 / 2026-05-15.

**Where seen:**

- **Next.js CVE-2026-44578** (web framework): WebSocket-upgrade handler validates URL less rigorously than HTTP-request handler; downstream consumer assumes stricter validation; SSRF surface from WebSocket side. CVSS 8.6; Shodan-scale exploitation. Fix in Next.js 15.5.16 / 16.2.5. Full intake: `incidents/2026-05-15-nextjs-cve-44578-parallel-validation-asymmetry.md`
- **TrustedVolumes chain 1** (EVM, $5.87M, 1inch Fusion ecosystem): signature check uses `allowedOrderSigner[order.receiver][signer]`; token transfer pulls from `order.taker`. Attacker sets `taker=victim, receiver=attacker-controlled`; validation-pipeline approves signer for attacker's receiver; consumption-pipeline pulls from victim's taker balance. Full intake: `brain/Cross-Domain-Fragility-Laws.md` v1.4 §TrustedVolumes-2026-05-14
- **TrustedVolumes chain 2** (EVM, same incident): `saltStatus` write commits to storage slot A; `saltStatus` read queries storage slot B. Replay-prevention defense structurally inert across all 4 drain calls. Full intake: same as chain 1
- **ShapeShift FOX Colony** (EVM, 2026-05-11–15): meta-tx forwarder DSAuth self-call asymmetry — forwarder's auth check validates against forwarder's own `ds-auth` context; downstream call consumes auth from the target's `ds-auth` context. Filed during 2026-05-18 Monday polls (per polls subagent intake). Full intake: `brain/Cross-Domain-Fragility-Laws.md` v1.5 §ShapeShift FOX Colony

**Audit-time check:**

1. For every multi-step function pipeline (validation step → consumption step), enumerate the KEY-A used by validation and the KEY-B used by consumption.
2. If KEY-A ≠ KEY-B (different field, different storage slot, different lookup context, different parser, different chain-id source), the pipeline is a DC-7 candidate.
3. Trace attacker-controllable inputs: can the attacker set KEY-A to a value that satisfies validation WHILE setting KEY-B to a value the validation never inspected?
4. If yes → DC-7 hit. Sample exploit reconstruction (READ-ONLY thought experiment, NO PoC required for hit-classification): describe the input shape that decouples validation from consumption.
5. Negative-control: if KEY-A and KEY-B are demonstrably the same field (referenced by same name AND same memory location AND same parse path), no DC-7. Common-mistake-trap: don't confuse "same field name in different namespaces" with "same actual key" — re-derive bindings.

**Reachability prompt enricher for L3.5 Stage 2:**

```
For every function exposed to user input, build the validation→consumption map. Identify KEY-A (the value validated by gates / `require` / signature checks / authorization lookups) and KEY-B (the value consumed by transfers / storage writes / external calls / state mutations). If KEY-A ≠ KEY-B and the attacker controls both, classify as DC-7 (Validating-Field ≠ Consuming-Field). Distinct from Pattern A (admin gap) — DC-7 requires that the validation actually fires; the bug is that it fires against the WRONG key. Anti-pattern check: storage-slot mutex with write-path and read-path on different keys (TrustedVolumes chain 2); inbound signature on payload-A consumed by handler reading payload-B (TrustedVolumes chain 1, Next.js CVE).
```

**Risk if mis-applied:** Some pipelines legitimately validate one field to authorize action on a related field (e.g., role-based: validate user's `permissions[A]` then consume from `userBalances[user]` — where the user identity is consistent across both, but the field name differs). DC-7 doesn't apply when both keys derive from the SAME upstream identity AND the validation actually enforces the property the consumption assumes. Always confirm the attacker can decouple before flagging.

**Productization signal:** Layer 1b Semgrep rule shippable:
`pattern: $VALIDATION_FN(... $KEY_A ...) ... $CONSUMPTION_FN(... $KEY_B ...)` where `$KEY_A != $KEY_B` and both are attacker-influenceable. Initial corpus: 31 Immunefi-active protocols from DefiLlama watchlist (per operator directive §3 active integration). Estimated hit-rate: TBD; expect false-positive rate moderate; gate via Skeptic adversarial pass.

**Cross-pollination scan target list (post-CVP / now permitted on disclosure-program targets per operator directive §3.D Gate 2-3 autonomous):**

- All 31 Immunefi-active protocols (especially intent-based AMMs / 1inch Fusion forks / Permit2-flow protocols / cross-chain bridges with inbound vs outbound validation pipelines)
- multicall() aggregator-vs-per-call signature-scope asymmetry across DeFi
- EIP-712 vs EIP-191 validation pipelines on the same contract
- Vault deposit vs withdraw validation asymmetry
- Wormhole cross-chain `_completeTransfer` divergence (per `hunts/2026-05-17-wormhole-preflight-gate1.md` Top-3 lens #1) — DIRECT DC-7 application

**Anchor file:** This entry. Worked-example details in `brain/Cross-Domain-Fragility-Laws.md` v1.5 + downstream incident files.

### DC-7 EXCLUSION sub-pattern (CANONICAL — promoted 2026-05-27 23:24 UTC, 3-anchor threshold met)

**Promotion record:** Filed CANDIDATE 2026-05-27 evening with 1 anchor (Cap C1). Reached 3-anchor canonical threshold same day via Function FBTC H1 + Gearbox H2 production deployments. Sub-pattern is now CANONICAL for all future Gate 1/Gate 2 surface mapping.

**Three canonical anchors:**

| Anchor | Source | Validating-field | Consuming-field | Defenses (Q1/Q2/Q3) |
|--------|--------|------------------|-----------------|---------------------|
| #1 Cap C1 | `EigenOperator.advanceTotp()` | `allowlistedDigests[digest]` write | `isValidSignature` read SAME mapping | 3/3 (deterministic derivation + EigenLayer `approverSaltIsSpent` replay + LIVE `getOperatorShares` no-cache) |
| #2 Function FBTC H1 | `confirmMintRequest` srcHash binding | `getCrossSourceRequestHash` recompute | `crosschainRequestConfirmation[srcHash]` | 3/3 (recompute freshness + dstChain==chain() replay + pause fallback) |
| #3 Gearbox H2 (CANONICAL anchor) | `CreditFacadeV3.multicall` → `CreditManagerV3` collateralDebtData | storage re-derive `.debt`/`.cumulativeIndexLastUpdate`/`.lastDebtUpdate` | `_calcDebtAndCollateral` read same struct | 3/3 (storage re-derive + `DebtUpdatedTwiceInOneBlockException` replay + LossPolicy pluggable circuit-breaker) |

### DC-7 EXCLUSION sub-pattern (canonical, formerly CANDIDATE, added 2026-05-27 evening from Cap Gate 2 NEGATE, hunt `hunts/2026-05-27-cap-c1-gate2-foreclosure.md`)

**Statement:** A pipeline that LOOKS like DC-7 (paired validation + consumption functions sharing a mapping/lookup) does NOT qualify as DC-7 when the validating-write input is **fully determined by stored state with no attacker-controlled binding**. Specifically:

1. Write function (e.g., `advanceTotp()`, `commitDigest()`) computes its key via a pure hash of (a) set-once / never-rotating storage variables and (b) `address(this)` or other contract-local constants.
2. Read function consumes the SAME storage mapping via SAME hash derivation.
3. No external input to the write function affects which key gets toggled.

In this case validating-field IS consuming-field — they're the SAME deterministic slot, just accessed at different times. The "permissionless setter" surface is operationally a no-op flag-toggle, not a key-binding decision.

**Negative-control for DC-7 surface mapping:** before flagging a permissionless setter / mutator as DC-7, ask:
- Does the attacker control ANY input to the write function that affects the resulting key/digest? (If no → EXCLUSION fires, not DC-7)
- Is the consuming-side read deriving its key from the SAME storage variables and SAME hash function? (If yes → EXCLUSION fires)
- Is there a cross-protocol consumer that re-derives state from LIVE on-chain reads (no cache)? (If yes → EXCLUSION fires across protocol boundaries too)

**Anchor:** Cap `EigenOperator.advanceTotp()` writes `allowlistedDigests[digest] = true` where `digest = calculateTotpDigestHash($.restaker, address(this))`. `$.restaker` is set-once (`registerOperatorSetToServiceManager` reverts on `restaker != address(0)`), `address(this)` is a constant. Consumer `isValidSignature` reads the SAME `allowlistedDigests[digest]` via SAME hash derivation. Cross-protocol: `Delegation.coverage()` → `IDelegationManager.getOperatorShares()` reads LIVE EigenLayer state, no cache. ALL 3 EXCLUSION conditions fire → DC-7 does NOT apply.

**Detector spec (negative — to AVOID Gate 1 false-positive):** when surface-mapping permissionless setters, AST-grep the setter body for `keccak256(...)` / hash-derivation calls. If ALL hash inputs are storage-reads OR `address(this)` OR `block.chainid`-class constants, flag as DC-7 EXCLUSION candidate. Cross-check consumer's hash derivation matches. If match → EXCLUSION, no surface entry.

**Boundary anchor for Doctrine #38:** this exclusion is the OPPOSITE pattern from Doctrine #38 (Pure Pass-Through *WithSig STRUCTURAL FORECLOSE). Doctrine #38 fires when a contract is a stateless signature-forwarding wrapper (no local state). DC-7 EXCLUSION fires when the contract has local state but the state-transitions are deterministic (no attacker binding). Both produce NEGATE verdicts at Gate 1/Gate 2 but for different structural reasons.

**Authority:** Cap Gate 2 foreclosure receipt (`hunts/2026-05-27-cap-c1-gate2-foreclosure.md`). Gate 1 estimated novelty 35%, actual <5% — Contradictions-Register INFO #20 anchors the Gate 1 hardening rule (cross-protocol DC-7 hypotheses MUST enumerate consumer-side replay/freshness defenses before finalizing surface map).

---

### DC-7 sub-pattern — Cross-language enum repr divergence between native VM and FEVM (added 2026-05-26 from Filecoin Gate 1, hunt `hunts/2026-05-26-filecoin-immunefi-gate1.md` proposal C-Filecoin-3)

**Statement:** When a builtin-actor (or any cross-language interop substrate) defines an enum type that is consumed by BOTH a native-language caller (Rust on Filecoin's FVM) AND a non-native caller (Solidity on FEVM via precompile / runtime call), the serialization representation MUST be EXPLICIT — typically `#[repr(uN)]` plus `Serialize_repr` for Rust enums. Default Rust enum CBOR variant-name serialization (string-keyed) vs Solidity `uint8`-decoded enum is a structural mismatch: validation reads one repr, consumption reads another. The DC-7 keys decouple along the LANGUAGE-BOUNDARY axis instead of the per-pipeline-field axis. [INSPECTED]

**Distinct from DC-7 base:** base DC-7 fires when KEY-A and KEY-B differ within a single language's type system. This sub-pattern fires when the SAME conceptual field has different binary representations across language boundaries — the validation reads the Rust default-CBOR variant string, the consumption decodes the Solidity uint8. Same field name, same source of truth in the protocol spec, BUT the actual bytes consumed are different on each side.

**Anchor:** Filecoin builtin-actors `SectorStatusCode` enum + sibling enums reachable via FEVM precompile / runtime call. KAMT `set_root` cache-stale class (#1667) is same family: type-system mismatch between Rust caller and FEVM caller, both consume the "same" field but bind different bytes.

**Detector spec:** AST-grep for `pub enum` declarations in builtin-actors that are reachable via FEVM precompile / runtime call without `#[repr]` attribute. Combine with grep for `precompiles` / `runtime::send` / `runtime::call` call sites that pass the enum across the boundary. Productization HIGH on Filecoin substrate; class transfers to any cross-language interop substrate (Cosmos SDK ↔ CosmWasm Wasm, Substrate native ↔ EVM Frontier, etc.).

**Promotion path:** single-anchor (Filecoin SectorStatusCode). Promotes to standalone DC class when 2nd cross-language interop substrate confirms the family (likely Cosmos↔CosmWasm or Substrate↔Frontier next).

---

## DC-8: Anchor-Signer-Validation-Moved-From-Accounts-Struct-To-Function-Body — Refactor Regression Class

**Definition:** A Solana/Anchor function accepts a `Signer<'info>` account in its `#[derive(Accounts)]` struct but does NOT enforce a struct-level binding (`has_one = signer` / `constraint = ...` / `seeds = ...`). The signer constraint is instead checked in the function body via `require!(...)` or manual logic. This creates a refactor-regression class where:

- Original code likely had the binding in the Accounts struct (canonical Anchor security boundary)
- Code refactor moved the check into the function body (often for "flexibility" or to support multi-signer alternatives)
- The struct-level check is Anchor's compile-time-enforced security boundary; function-body checks can be silently dropped, bypassed by alternate caller paths, or eliminated in future refactors without the compiler flagging the regression

Distinct from DC-7 (Validating-Field ≠ Consuming-Field) — DC-7 is about KEY-A vs KEY-B across pipeline stages. DC-8 is about constraint PLACEMENT in the same code path: Accounts struct (canonical) vs function body (refactor-regression risk). Distinct also from the CANDIDATE-G Anchor variant (admin `has_one` missing entirely) — DC-8 cases have the validation present but in the wrong layer.

**Promotion authority:** Operator decision msg 7259 §5A (2026-05-18) + session recovery directive (2026-05-19). Promoted from CANDIDATE-G based on 3 worked examples across 3 protocols and 2 language idioms.

**Where seen:**

- **Indentura PL Vault** (Solana private credit, C, Adevar Labs audit 2026-02-17): `pl_vault.c` L02 (`account_user_staking` accepted without signer-binding — validation deferred to off-chain Thor co-signer) + L03 (`account_vault` accepted without `vault->vault_seed == action->vault_seed` check — constraint in co-signer logic, not on-chain). Full intake: `brain/Audit-Reports-Library.md` §1.
- **M0 Extensions** (Solana yield-bearing wrapped-token framework, Rust/Anchor, Adevar Labs audit 2025-07-02): `programs/ext_swap/src/instructions/whitelist.rs:13-27` — `pub admin: Signer<'info>` declared but no `has_one = admin` in `#[account(...)]` block; validation absent at struct level entirely (most acute form of the class). Full intake: `brain/Audit-Reports-Library.md` §2.
- **OnRe** (Solana fixed-income, Rust/Anchor, Buzz Continuous Assurance Gate 1 2026-05-18): `programs/onreapp/src/state_operations/set_kill_switch.rs:35` — `pub signer: Signer<'info>` is raw in the Accounts struct with no constraint. Validation happens at lines 65-66: `boss_signed = state.boss.key() == signer.key() && signer.is_signer; admin_signed = state.admins.contains(signer.key) && signer.is_signer;` then `require!(boss_signed || admin_signed, ...)`. The in-function `require!` is present and closes the immediate exploit path at HEAD; the structural anti-pattern is present and creates a refactor-regression surface. Full intake: `hunts/2026-05-18-onre-gate1-surface-map.md` §2 CG-O-4.

**Runtime scope:** Solana-Anchor primary. May generalize to Move/Sui (similar accounts-as-struct constraint model exists in Sui Move's struct abilities) but NOT yet documented with worked examples — do not overclaim cross-language generalization.

**Audit-time check:**

1. For every `#[derive(Accounts)]` struct in the target, enumerate all `Signer<'info>` fields
2. For each `Signer<'info>` field: check whether the struct's `#[account(...)]` block on the associated state account includes `has_one = <signer_field_name>` OR `constraint = <signer_field_name>.key() == state.<authority_field>`
3. If neither is present: check the handler function body for `require!(...)` or `if <signer>.key() != state.<authority>` guards
4. If the guard exists only in the function body: flag as DC-8 candidate. Assess severity based on: (a) is the function body check unconditional on ALL code paths? (b) are there alternative caller paths (CPI, proxy, upgrade) that reach the privileged state mutation without the function-body check?
5. If the guard is entirely absent (neither struct nor function body): this is the more severe sub-pattern; flag as DC-8 + Pattern A (admin-unprotected mutator)
6. Negative-control: `has_one` in the struct is canonically safe. `constraint = signer.key() == state.admin` in the `#[account(...)]` attribute block is functionally equivalent to `has_one` — this is NOT a DC-8 hit (the check fires at the struct/Anchor level, not in user-authored function body)

**Reachability prompt enricher for L3.5 Stage 2:**

```
For every Anchor #[derive(Accounts)] struct, map each Signer<'info> field to its binding location.
BINDING TIER 1 (canonical): has_one = <field> in the #[account(...)] attribute, OR constraint = <field>.key() == state.<authority> in the attribute block. Tier 1 is the Anchor compile-time security boundary.
BINDING TIER 2 (function-body): require!(...) or manual equality check authored in the handler function body. Tier 2 creates a refactor-regression class: the check can be dropped, bypassed via alternate CPI paths, or eliminated by a future refactor without Anchor's type system flagging the loss.
Classify as DC-8 when: Signer<'info> exists in struct, Tier 1 binding is ABSENT, Tier 2 binding is PRESENT. Assess refactor-regression risk: if any upstream refactor could remove or bypass the Tier 2 check, the finding is valid.
Classify as DC-8 + Pattern A when: Tier 1 and Tier 2 are BOTH absent (validation entirely missing at any layer).
```

**Risk if mis-applied:**

- OnRe CG-O-4 (`set_kill_switch`) is a worked example where the Tier 2 check IS present and closes the immediate exploit. Do NOT flag as an exploitable finding based on DC-8 detection alone — always verify the function-body check covers ALL reachable call paths
- Some multi-authority patterns (e.g., boss OR redemption_admin OR user) legitimately require function-body boolean composition because a single `has_one` can't express OR-logic. These are NOT DC-8 hits when the Accounts struct uses `constraint = A.key() == state.A || B.key() == state.B` in the attribute block (valid Tier 1 binding for OR-logic). Flag as DC-8 only when the attribute block has NO binding expression at all
- Treat DC-8 as a "structural smell + refactor-regression risk" — not always an immediately exploitable loss event. Severity should be calibrated against (a) the privilege level of the function (kill_switch = high-impact), (b) the likelihood of a future refactor removing the Tier 2 check

**Productization signal:** Layer 1b Semgrep rule shippable for Anchor targets:

```
pattern: |
  #[derive(Accounts)]
  pub struct $HANDLER<'info> {
    ...
    pub $SIGNER: Signer<'info>,
    ...
    #[account(
      // no has_one = $SIGNER, no constraint = $SIGNER...
    )]
    pub $STATE: Account<'info, $STATE_TYPE>,
    ...
  }
```

Low FP rate when combined with downstream check: confirm `$STATE_TYPE` has an authority field and the `#[account(...)]` block on `$STATE` contains no `has_one` or `constraint` referencing `$SIGNER`.

**Cross-pollination continuous-assurance target list (manual surveying ONLY — bulk-scan pipeline is NOT authorized):**

- Solana programs in native C without Anchor macro (any `account_*` accepted as instruction input without PDA-derivation check)
- Solana programs with off-chain co-signer / backend gatekeeper (Indentura Thor class, Phantom co-sign relays, gasless relayers)
- Anchor programs with OR-logic multi-authority patterns (boss OR redemption_admin OR user) — verify Tier 1 OR-constraint exists, not just Tier 2 function-body boolean
- Solana programs with kill-switch, pause, or emergency-halt functions (high-privilege, high-impact if Tier 2 check is later refactored away)
- Anchor programs with `Signer<'info>` + paired `Account<'info, T>` where T has `admin` / `owner` / `authority` / `boss` field

**Anchor file references:**

- Primary brain entry: this file (Patterns-Defense-Classes.md DC-8 section)
- Indentura anchor: `brain/Audit-Reports-Library.md` §1 (Pattern class 3, L02 + L03)
- M0 Extensions anchor: `brain/Audit-Reports-Library.md` §2 (Pattern class 1, Finding #1)
- OnRe anchor: `hunts/2026-05-18-onre-gate1-surface-map.md` §2 CG-O-4

---

## Application order

L3.5 Stage 2 prompt should layer these in order:

1. **DC-1** (caller-path reachability) — fastest check, biggest yield. Suppress unreachable findings immediately.
2. **DC-3** (invariant scope) — semantic check on whether the invariant applies to this code path.
3. **DC-2** (atomicity) — narrow check on race-condition claims.
4. **DC-6** (permissionless-trigger config-recipients) — Pattern A-specific, applied post-TV-RFQ flag.
5. **DC-5** (trusted-filler callback) — Pattern D-specific, applied post-state_after_external_call flag.
6. **DC-4** (commitment-hash finalized before external call) — Pattern D-specific, applied post-state_after_external_call flag.
7. **DC-7** (Validating-Field ≠ Consuming-Field on Adjacent Function Pipelines) — applied to every multi-step function pipeline post-Pattern-D state-after-external-call check.
8. **DC-8** (Anchor-Signer-Validation-Moved-From-Accounts-Struct-To-Function-Body) — applied on every Solana/Anchor target: enumerate all `Signer<'info>` fields, classify binding tier (Tier 1 struct vs Tier 2 function-body), flag Tier-2-only as refactor-regression candidates.
9. Existing governance-precondition suppression (filed as CG-#20).
10. Existing types/params.go deprioritization (filed as CG-#20).

When 1-10 all suppressed, the remaining findings are candidates for true bug submission-track. Stride scan: 24 → 11 HIGHs after baseline, → 0 after these defenses. T2 watchlist sweep 2026-05-14: 20 ACCEPTs → 20 SOPHISTICATED_FP after DC-1..6. DC-7 (added 2026-05-18) applies to multi-step function pipelines post-Pattern-D check — productization corpus = 31 Immunefi-active protocols per operator directive §3. DC-8 (added 2026-05-19) applies to Solana/Anchor targets only — productization corpus = Solana native programs + Anchor programs with multi-authority patterns.

---

## META-DOCTRINE: Two-Axis Donation-Channel Test (filed 2026-05-16 from Day 17 Sky-family sweep)

**Origin:** four independent Sky vault sweeps in one day (D3M / Lite PSM / sUSDS / stUSDS) collectively validated a cross-cutting doctrine that governs ANY accounting-by-`balanceOf` pattern. Worked-example portfolio: 5 of 5 Sky-family hunts clean sweep on 2026-05-16; doctrine emerged in D3M Lens #1+#2 (worked-example), validated independently in Lite PSM Lens D (cross-asset variant), then stress-tested on the predicted-DANGEROUS-side in sUSDS/stUSDS Lens D (validated SAFE via orthogonal mitigation — see below).

**Doctrine statement:**

> Any contract that uses `balanceOf(address(this))` as its accounting-source is donation-vulnerable. The OUTCOME of a donation depends on TWO axes: (1) the WHERE-DOES-INFLATED-VALUE-LAND axis, and (2) the WHAT-SHAPE-IS-THE-ACCOUNTING axis. The cross-product determines whether donations are SAFE (donor self-burn; protocol or shareholders gain) or DANGEROUS (donor-then-redeem extracts value).

**Two-axis truth table:**

| Accounting shape \ Inflated-value destination   | governance-sink (vow / treasury / fee-collector)                                                                                                                                                      | user-fungible-share (LP token / vault share)                                                                                                                          |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`balanceOf`-for-accounting**                  | SAFE — donation flows to surplus (worked example: D3M `D3MHub:251-281` aUSDS donation → `suck+grab` credits dai[vow]; Lite PSM `pocket` donation → `chug() → vow`)                                    | DANGEROUS — donate-then-redeem extracts value (worked counter-example: Compound v2 cToken inflation attack)                                                           |
| **rate-accumulator-for-accounting (chi-style)** | SAFE — accounting is decoupled from contract balance (worked example: sUSDS / stUSDS / sDAI chi accumulator; donations land in `usds.balanceOf(sUSDS)` but are NEVER read for share-asset conversion) | SAFE — same as left column; rate-accumulator is donation-immune by construction (validated 2026-05-16 sUSDS/stUSDS Lens D — predicted-DANGEROUS-cell flipped to SAFE) |

**Hunt-skill update (Day 17, applies to ALL future audit targets):**

1. First action on ANY accounting / share-conversion / vault contract: `grep -n "balanceOf(address(this))" src/`
2. If zero matches in the conversion chain → contract uses rate-accumulator-for-accounting → DONATION-IMMUNE BY CONSTRUCTION → focus hunt elsewhere
3. If matches present → identify the destination axis: governance-sink (vow, treasury, fee-collector accumulator) or user-fungible-share (LP token, vault share)
4. If governance-sink → confirm by-design yield channel; mark as worked-example for this doctrine; continue elsewhere
5. If user-fungible-share → THIS IS THE DANGEROUS-AXIS CELL — apply CANDIDATE-I (below) to check for virtual-shares / decimals-offset / dead-shares mitigation

**Why this is a meta-doctrine (not a single DC):**

This doctrine sits ABOVE the DC-1..6 catalog because it determines WHICH defense class is relevant before any DC fires. It's a routing layer. A finding flagged as "donation-attack-on-balanceOf" gets routed differently depending on the cross-product cell: SAFE cells become CLEAN SWEEP with worked-example annotation; DANGEROUS cell triggers CANDIDATE-I deep-check.

**Promotion path:** when 3rd-party cross-pollination produces 1+ external-protocol worked-example for each of the 3 SAFE cells (governance-sink × balanceOf, governance-sink × rate-accumulator, user-fungible-share × rate-accumulator) AND 1+ external worked-counter-example for the DANGEROUS cell, this doctrine becomes a standing META-DC that L3.5 Stage 2 prompt enriches with the truth table.

**Reachability prompt enricher for L3.5 Stage 2 (proposed):**

```
Before evaluating donation-attack-class findings, classify the contract under attack into the two-axis test: (1) accounting source = balanceOf-for-accounting OR rate-accumulator-for-accounting; (2) inflated-value destination = governance-sink OR user-fungible-share. The two-axis cross-product determines exploitability. Only the (balanceOf-for-accounting × user-fungible-share) cell is DANGEROUS and requires deep-check for virtual-shares / decimals-offset / dead-shares mitigation. The other three cells are SAFE by construction and donations are worked-example yield channels.
```

---

## CANDIDATE Pool (NOT in active DC catalog — gated on additional worked examples + operator promotion)

The following candidate defense classes are filed from public-disclosure retrospective intakes and live exploit-tracking. They are NOT in the active DC-1..6 numbered catalog. The next active-catalog slot is DC-7; the candidate with the strongest worked-example portfolio (2+ adjacent confirmed examples + operator decision) earns promotion. Each candidate is reachable for prompt-enricher use in Skeptic experiments BUT is not part of the production hard-exclusion / suppression pipeline until promoted.

### CANDIDATE-A: Signature-Scope-Must-Cover-Outcome-Bit (THORChain 2026-05-15, hypothesis-tracked, official PM pending)

**Class statement:**

> When a multi-signer set (validator set, threshold-sig committee, bridge attestation gossip) signs a payload that OMITS a downstream-binding bit (inbound-vs-outbound direction, target chain ID, recipient-class flag), and a downstream consumer interprets that bit from a separate trust path (proposer claim, off-chain config, side-channel), there exists a forgery surface where the omitted bit can be flipped without invalidating the signature set.

**Specialization of:** Priority #1 WEAKER-PROPERTY-THAN-DOWNSTREAM-ASSUMES
**Anchor (UNCONFIRMED):** THORChain Bifrost Attestation Gossip per Blockaid hypothesis — 9-day deployment gap between fix commit `af46db22` (2026-05-06) and exploit (2026-05-15) is the Lane 1.5 deployment-class signal
**Status:** HYPOTHESIS_TRACKED — promotion path blocked until official THORChain post-mortem confirms Hypothesis A
**Full intake artifact:** `incidents/2026-05-15-thorchain-bifrost-10.8m-cross-chain-exploit.md`
**Brain ledger entry:** `brain/Cross-Domain-Fragility-Laws.md` (inaugural entry)

**Sub-class enrichment — LayerZero OFT default-DVN trust grants unrestricted underlying mint (Cap Protocol 2026-05-25, proposal C-Cap-2, Ogie msg 7772):**

When a cross-chain bridge OFT (LayerZero) contract `_credit(to, amount)` path calls `underlying.mint(to, amount)` gated SOLELY on LayerZero's DVN (Decentralized Verifier Network) attestation, and the DVN config defaults to the LayerZero default-DVN set (no custom verifier required), the trust boundary collapses to "whoever controls the default-DVN can mint unrestricted underlying on the destination chain." This is a CANDIDATE-A specialization where the omitted-binding-bit is the DVN-quorum identity itself. The signature set authenticates the message; the message-to-mint binding assumes the DVN set is honest. [INSPECTED]

**Cap canonical anchor (CANDIDATE_TRACKED, no submission path):** Cap TempoBridgeUpgradeable.sol:83-98 `_credit → underlying.mint` gated solely on LZ DVN config. Cap Sherlock Gate 1 surfaced as HIGH CANDIDATE-TEMPO-001. Brain-compound only (Cap contest finished). [INSPECTED]

**Adjacent priors:** THORChain Bifrost (CANDIDATE-A inaugural), Wormhole core verifier (well-documented attack-surface), Kelp DAO $292M (DC-10 promotion anchor), Notional V3 cross-chain (sibling anchor). LayerZero OFT class is the largest unscanned substrate as of 2026-05-25 — every project building an OFT bridge inherits this surface unless they (a) override the DVN config OR (b) enforce per-message DVN-quorum verification at the contract level. [ASSUMED]

**Detection sub-rule:** in any LayerZero OFT consumer, grep for `_credit` + `mint(` + DVN config — verify whether the contract calls `setSendVersion` / `setReceiveVersion` to pin a custom DVN set, OR whether default-DVN trust is the entire defense. Default-DVN trust = CANDIDATE-A enrichment hit. [INSPECTED]

### CANDIDATE-D: startSqrtP-Equality-Precondition (KyberSwap Elastic 2023, retrospective, confirmed post-mortem)

**Class statement:**

> Any tick-recomputation gate (or equivalent state-advance gate) in a multi-step state-mutating swap routine MUST gate on equality of `currentValue` to `startValue` (entry snapshot), NOT equality of `currentValue` to `runningValue` (most recent intermediate). The "did anything actually move during this sub-step?" decision must reference the entry snapshot, not the loop variable.

**Specialization of:** Priority #1 WEAKER-PROPERTY-THAN-DOWNSTREAM-ASSUMES
**Anchor (CONFIRMED):** KyberSwap Elastic `Pool.sol:405-408` (pre-fix) → `ks-elastic-sc Pool.sol:413-419` (post-fix); ChainSecurity re-audit, pools re-released; 100Proof post-mortem 2023-05-23
**Status:** CONFIRMED post-mortem; promotion blocked only on 1+ additional adjacent worked example
**Full intake artifact:** `incidents/2023-05-23-kyberswap-elastic-100m-double-add.md`
**Audit-time check (proposed):**

1. Identify any multi-step state-mutating loop where intermediate values (`runningSqrtP`, `currentRunningX`, etc.) are computed
2. Find the gate that fires "if value changed, recompute downstream state"
3. Check whether the gate compares against (a) the entry snapshot of the sub-step, or (b) the running intermediate
4. If (b), test whether a sub-step that's a no-op from entry-to-exit but with a non-trivial intermediate trips the gate erroneously

### CANDIDATE-E: Symmetric-Pair-Rounding-No-Short-Circuit (Raydium cp-swap 2025, retrospective, confirmed post-mortem — STRONGEST DC-7 anchor candidate)

**Class statement:**

> For any operation on a symmetric token pair (LP mint, LP burn, paired-deposit, paired-withdrawal, swap with two-sided settlement), ceiling/floor rounding logic MUST NOT short-circuit on a per-side `amount > 0` check. Either round both sides symmetrically (including the zero side, which becomes 0 → 1 via ceiling), OR reject the operation entirely when any side has rounded to zero. Mixed treatment — round one side, skip the other — violates pool proportionality and creates a value-extraction surface.

**Specialization of:** Priority #1 WEAKER-PROPERTY-THAN-DOWNSTREAM-ASSUMES
**Anchor (CONFIRMED):** Raydium cp-swap `lp_tokens_to_trading_tokens()` per-side `&& token_X_amount > 0` short-circuit on ceiling (pre-fix) → non-zero `require` guards on `amount_out_less_fee`, `token_0_amount`, `token_1_amount`, `lp_token_amount` (post-fix); Immunefi 2025-05-21 review; $505K USDC to @Lastc0de
**Status:** CONFIRMED post-mortem; promotion blocked only on 1+ additional adjacent worked example
**Cross-pollination scan target list (post-CVP):** Solana cp-swap fork ecosystem (large), Uniswap V2 family, SushiSwap, PancakeSwap V2, TraderJoe V1, Curve stable-pool variants
**Productization path:** at promotion → Semgrep / BuzzShield L1b detector rule (`paired-mint-with-amount-gt-zero-short-circuit.semgrep.yml`)
**Full intake artifact:** `incidents/2025-03-10-raydium-cpswap-505k-rounding.md`
**Audit-time check (proposed):**

1. Find any function that returns or mutates two paired token amounts (token_0/token_1, asset_0/asset_1, base/quote, side_a/side_b)
2. Identify any ceiling-rounding or floor-rounding logic with per-side conditional
3. Check whether the per-side conditional includes `amount > 0` as a short-circuit
4. If yes: the function is a CANDIDATE-E hit — verify by tracing a deposit that rounds one side to zero and the other to non-zero; confirm asymmetric output

**Family-extension note (added 2026-05-16 from Indentura intake):** CANDIDATE-E's parent class is **fixed-precision arithmetic surface gaps**. Two sibling sub-patterns observed so far:

- Sub-pattern 1: per-side ceiling/floor short-circuit on `amount > 0` (Raydium, this entry)
- Sub-pattern 2: multiplicative-intermediate overflow on `uint64 * uint64` exceeding bit-width (Indentura H01 + H02, see CANDIDATE-H below)

Both anchor protocols are Solana (cp-swap fork + C-runtime private credit). The parent class is runtime-agnostic but the surface is amplified on platforms without default checked-math (Solana-C, Solana-Rust pre-`checked_mul`, EVM <0.8, Move u64 ops, Cairo numeric ops). When CANDIDATE-E and CANDIDATE-H both promote, consider folding into a unified "DC-X: Fixed-Precision Arithmetic Surface" class with two specialised detector rules.

**Exclusion-class refinements (added 2026-05-16 from Day 17 Sky-family sweep):** CANDIDATE-E targeting has been NARROWED based on 2 confirmed structural-immunity classes:

- **Exclusion class 1 — 1:1 PSM-style single-direction canonical-input conversion** (validated via Lite PSM Lens A clean sweep): when both swap directions take input in the same canonical precision (e.g., USDC ↔ DAI with `gemAmt` always in USDC precision), the paired-AND-conjunct topology that CANDIDATE-E requires structurally cannot exist. The function has only ONE per-call rounding axis, not two. PSM-family is structurally immune.
- **Exclusion class 2 — chi-style rate-accumulator ERC4626 wrappers** (validated via sUSDS/stUSDS Lens A clean sweep): yield-bearing share wrappers that use a rate accumulator (chi) for asset↔share conversion route the math through a single accumulator multiply (`shares * chi / RAY`), not a paired symmetric-pair rounding. Rate-accumulator design eliminates the symmetric-pair surface entirely. sUSDS / stUSDS / sDAI / Spark-pool sStablecoin-class all structurally immune. Adjacent doctrine: META-DOCTRINE Two-Axis Donation-Channel Test row 2.

**Sharpened CANDIDATE-E hit-list (post-2026-05-16 refinement):** LP-share-based protocols ONLY:

- Uniswap V2 / V3 forks with paired-mint or paired-burn surfaces
- Balancer-style weighted pools with multi-asset paired-deposit
- Curve metapools with per-side normalization-conjunct logic
- Concentrated-AMM tick-boundary settlement
- LP-share rebalancing routines (e.g., re-balance after fee accrual)

Excluded from CANDIDATE-E hit-list (per refinements above): 1:1 PSM-class single-asset stablecoin parity modules; rate-accumulator ERC4626 share wrappers. **Productization impact:** detector FP cost reduced; targeted-sweep EV increased.

**Exclusion class 3 — defensive-direction-symmetric rebasing-index lending family (added 2026-05-28 night — Compound III Comet C-3 Gate 2 Phase 1 NEGATE).** When a lending protocol uses a rebasing-index pair (e.g., `baseSupplyIndex` + `baseBorrowIndex`) where:
1. **All rounding directions are intentionally pool-favoring** (supply-side rounds DOWN; borrow-side stored debt rounds UP — both bias against user, in favor of reserves)
2. The protocol **lacks flash-loan + same-tx-paired-conversion primitives** required for Raydium-class amplification (per-cycle wei dust << gas cost makes single-direction extraction unprofitable)
3. The reserves equation preserves pool-favoring net direction across both legs

→ Pattern E cannot fire profitably. The Raydium 2025 anchor (paired-AND-conjunct topology with same-tx amplification) does NOT transfer. Lending-family protocols using Aave WadRayMath-style or Compound rebasing-index-style accounting are structurally immune absent flash-loan + paired-conversion in same transaction.

**Anchor (NEGATE):** Compound III Comet `CometCore.sol:88-126` + `Comet.sol:395-432, 506-517` — all 4 conversion directions (presentValueSupply / presentValueBorrow / principalValueSupply / principalValueBorrow) verified DOWN-DOWN-DOWN-UP defensive symmetry. Reserves equation (`Comet.sol:511-517`) confirms pool-favoring net. Per-cycle extraction < 0.001 USDC wei dust << gas. Authority: 2026-05-28 Gate 2 PoC NEGATE (`hunts/2026-05-28-compound-iii-comet-gate2-c3-foreclosure.md`).

**2nd confirming anchor (NEGATE, [INSPECTED]) — Sky DSS classic CDP engine (2026-05-29).** `Vat.sol` rate-accumulator (`rate` per-Ilk + `chi` on `Pot` + `rho` timestamp) is the canonical lending-family rate-accrual surface, attack-resistant 8 years. `Vat.frob/fork/flux/move` paired pipelines all verified conservative-direction-symmetric (signed `dink`/`dart` deltas, `wish()` permission on both endpoints) — Step 5.11 enumeration found ZERO asymmetric pipelines. Distinct TOPOLOGY from Compound III's rebasing-index pair: DSS uses a CDP debt-accrual `rate`/`chi` accumulator, Comet uses `baseSupplyIndex`/`baseBorrowIndex` rebasing. Yet SAME Exclusion Class 3 outcome — no flash-loan + same-tx-paired-conversion amplification primitive → Pattern E cannot fire profitably. Two distinct lending sub-topologies (Comet rebasing-index + Maker CDP rate-accrual) now both anchor Exclusion Class 3, widening it beyond the rebasing-index sub-family to lending-family-defensive-symmetric generally. [INSPECTED] — Gate 1 source-read foreclosure, no Foundry. Authority: `hunts/2026-05-29-sky-immunefi-gate1.md`.

**Sharpened cross-protocol prediction:** Expect NEGATE on future Pattern E Gate 1 dispatches against:
- Aave V3 / Aave V4 (WadRayMath defensive symmetry, no flash-loan-paired primitive in same tx)
- Morpho / Morpho Blue (P2P matching uses index-based accounting)
- Spark Lend (Aave V3 fork — already FORECLOSURE-RECEIPT today via Doctrine #27 F MAXIMUM, double-anchored exclusion now)
- Euler V2 (Resource Pricing rebasing — already FORECLOSURE-RECEIPT today via Doctrine #27 F MAXIMUM)
- Compound V2 / Flux Finance (already FORECLOSURE-RECEIPT today via Doctrine #36 PERMANENT P-floor + same defensive-symmetric architecture)

Pattern E hit-list (sharpened post-2026-05-28 night): LP-share-based protocols ONLY (Uniswap V2/V3 forks paired-mint/burn, Balancer weighted multi-asset paired-deposit, Curve metapool per-side normalization-conjunct, concentrated-AMM tick-boundary settlement, LP-share rebalancing). Lending-family is now Exclusion Class 3 — **do NOT pursue Pattern E Gate 1 on lending protocols absent verified flash-loan + paired-conversion same-tx primitive.**

### CANDIDATE-F: PROMOTED 2026-05-18 → DC-7 (Validating-Field ≠ Consuming-Field on Adjacent Function Pipelines). See active catalog section above.

### CANDIDATE-G: Solana-Off-Chain-Cosigner-Trust-Boundary (Indentura PL Vault 2026-02-17, Adevar Labs audit, confirmed in fix-review)

**Class statement:**

> When a Solana program writes to an account whose identity / derivation is supplied as instruction data (account index in `params->ka[]` chosen by caller) but is NOT verified on-chain against either (a) a PDA-derivation from the signer's pubkey, or (b) an `account->wallet == signer->key` field-binding check, the program has deferred the "is this the right account?" decision to an off-chain co-signer. If the co-signer key is compromised or its logic is bypassed, the on-chain program will write to attacker-supplied accounts without objection.

**Specialization of:** Priority #1 WEAKER-PROPERTY-THAN-DOWNSTREAM-ASSUMES (the on-chain program's "validation property" is weaker than the off-chain co-signer's assumed property)
**Runtime scope:** Solana only (depends on the accounts-as-instruction-data model). EVM equivalent does not naturally exist — `msg.sender` is canonical caller and storage is contract-scoped, so the failure mode requires explicit storage-key-from-input antipattern.
**Anchor (CONFIRMED in audit fix-review):**

- Indentura L02 `pl_vault.c:139-155` — `account_user_staking` accepted without signer-binding; attacker bypassing Thor co-signer can overwrite victim staking data
- Indentura L03 `pl_vault.c:46-70` — `account_vault` accepted without `vault->vault_seed == action->vault_seed` check; attacker can pass mismatched (state, pool) vaults to exploit favorable `dollar_per_dollar`
  **Status:** CONFIRMED in fix-review (Adevar Labs 2026-02-17 audit, both fixed per L02/L03 developer responses); promotion blocked on 1+ additional adjacent worked example
  **Cross-pollination scan target list (post-CVP):**

- Any Solana program WITHOUT Anchor's automatic PDA-binding (native C, native Rust without `seeds = [...]` constraint)
- Any Solana program that uses an off-chain co-signer / backend gatekeeper service (Indentura's "Thor", Phantom-style co-sign relays, gasless-transaction relayers)
- Any Solana program with `account_*_staking` / `account_*_position` / `account_*_user` accepted as instruction input

**Productization path:** at promotion → BuzzShield L1b detector rule expressing "Solana program writes (sol_memcpy / direct field set + re-serialize) to an account whose derivation isn't verified on-chain against signer pubkey." Higher value than EVM-class detectors because the off-chain-cosigner-trust antipattern is Solana-specific and recurs in many native programs that don't use Anchor's macro.

**Full intake artifact:** `brain/Audit-Reports-Library.md` §1 Indentura + §2 M0 Extensions (this catalog)

**Audit-time check (proposed):**

1. For each Solana program account that the program writes to (deserialize → mutate field → re-serialize), identify the account's index in `params->ka[]`
2. Trace whether the program performs EITHER (a) `find_program_address([...signer->key...])` + comparison against the supplied account, OR (b) checks a `wallet` / `owner` / `authority` field inside the account data against `signer->key`
3. If neither, flag as CANDIDATE-G hit. Verify by tracing whether the attacker can supply a victim account with arbitrary derivation
4. Negative-control: if the account is read-only (no field writes), the trust-boundary risk is lower (data still corruptible through other paths, but no direct write surface)

**Anchor / Rust variant (added 2026-05-17 from M0 Extensions §2 Finding #1):** the Anchor framework provides syntactic-sugar account-derivation via `seeds = [...]` constraint, which addresses the C-runtime PDA-binding gap. BUT a parallel class exists at the SIGNER level: an Anchor account struct declaring `pub admin: Signer<'info>` ALONGSIDE a state account `pub global: Account<'info, GlobalState>` (where `GlobalState` has an `admin: Pubkey` field) MUST include `has_one = admin @ ErrorCode::NotAuthorized` constraint on the state account, OR an explicit inline `require!(ctx.accounts.admin.key() == ctx.accounts.global.admin)` in the handler. Without either, the `Signer<'info>` attests "some signature is present" but does NOT bind that signer to the protocol's admin authority. This is the SIGNER-binding sibling of the C-runtime ACCOUNT-binding gap; both belong to the "declared-but-unenforced authority" parent class.

**Anchor-variant detector spec:**

```
pattern: #[derive(Accounts)]
         pub struct $HANDLER<'info> {
           ...
           pub $SIGNER_NAME: Signer<'info>,
           ...
           #[account(...)]  // <-- no has_one
           pub $STATE_NAME: Account<'info, $STATE_TYPE>,
           ...
         }
where:
  $STATE_TYPE contains a field named `admin`, `owner`, `authority`, or similar
  AND $STATE_NAME's #[account(...)] DOES NOT contain `has_one = $SIGNER_NAME`
  AND the handler body DOES NOT contain `require!(ctx.accounts.$SIGNER_NAME.key() == ctx.accounts.$STATE_NAME.<admin_field>)`
```

Low FP rate; high EV. Worth shipping as a standalone L1b rule even if CANDIDATE-G doesn't promote.

**Worked-example portfolio (updated 2026-05-17):**

- Indentura §1 L02 — account-binding missing (native C)
- Indentura §1 L03 — vault-seed binding missing (native C)
- M0 Extensions §2 Finding #1 (Critical) — Anchor `Signer<'info>` without `has_one` on whitelist-mutators (Rust + Anchor)

Three findings across two protocols, two language idioms (C native + Rust Anchor). **Promotion math update:** 2 protocols (Indentura + M0 Ext) ≥ 2 promotion threshold met for "adjacent worked examples". Operator decision pending: does ≥2-protocols count even though both audits are by the SAME auditor (Adevar Labs)?

- Default-stance: **YES, counts** — promotion math is about pattern recurrence across protocols, not about audit-firm diversity. Auditor consistency is an independent variable. The 2-protocol bar is met.
- Conservative-stance: hold for a third protocol audited by a non-Adevar firm to control for auditor-pattern-bias.
- Either way, CANDIDATE-G is the leading DC-7 promotion candidate as of 2026-05-17.

### CANDIDATE-H: C-Runtime-Uint64-Overflow-On-Multiplicative-Intermediate (Indentura PL Vault 2026-02-17, Adevar Labs audit, confirmed in fix-review)

**Class statement:**

> For any Solana C-language program (or any runtime without default checked-math) that computes `result = A * B / C` where A, B are uint64 token-amount-class variables (scaled by 1e6 or larger) and the result feeds a downstream fund-flow (`sendToken`, `transfer`, payout calculation), the intermediate multiplication MUST be cast to a wider type (`__uint128_t`) and the result checked against `UINT64_MAX` before downcast. Without the wider intermediate, the multiplication wraps silently at production-scale TVL.

**Specialization of:** Priority #1 WEAKER-PROPERTY-THAN-DOWNSTREAM-ASSUMES (the arithmetic "property" assumed by downstream is "exact"; the actual property is "exact-modulo-2^64")
**Runtime scope:** broadest on platforms without default checked-math:

- Solana-C (no checked-math primitives at all — must hand-roll)
- Solana-Rust pre-`checked_mul` adoption (early Anchor programs)
- EVM Solidity <0.8 (pre-default-checked-math)
- Move u64 ops without explicit safety
- Cairo numeric ops without range checks
  **Anchor (CONFIRMED in audit fix-review):**
- Indentura H01 `admin.h:281-291` — `dollar_per_dollar = (deposit - withdraw) * 1e6 / deposit` overflows when `(deposit - withdraw) >= 1.845e19` (~$18.45M); corrupts ratio to near-zero or arbitrary value
- Indentura H02 `pl_vault.c:439` — `withdraw_usdc = available_spl * dollar_per_dollar / ONE_DOLLAR` overflows; with `dollar_per_dollar = 900,000`, threshold ~$20.5M; user surrenders full position, receives 3,250 USDC vs 20.5M owed (1‱ payout)
  **Status:** CONFIRMED in fix-review (Adevar Labs 2026-02-17 audit, both fixed via `__uint128_t` cast per developer responses); promotion blocked on 1+ additional adjacent worked example
  **Cross-pollination scan target list (post-CVP):**

- Solana-C ecosystem (small set, likely <10 protocols on mainnet — RWA / private-credit / institutional-vault class disproportionately represented because they touch large dollar amounts)
- Solana-Rust programs predating `checked_mul` adoption (audit-trail check: git blame on financial-math files)
- Solidity <0.8 codebases still in production (rare but not zero — some long-lived protocols)
- Move + Cairo financial-math routines

**Productization path:** at promotion → BuzzShield L1b detector rule:

```
pattern: $T $RESULT = $A * $B
where:
  $T in (uint64_t, u64)
  $A and $B are token-amount-class variables (heuristic: name contains "amount" / "deposit" / "withdraw" / "balance" / "shares" / "spl" / "lamports", or both are uint64 multiplied without explicit cast)
  Result is consumed in a downstream fund-flow function (sendToken / transfer / safeTransfer / Transfer)
```

**Full intake artifact:** `brain/Audit-Reports-Library.md` §1 Indentura (this catalog)

**Audit-time check (proposed):**

1. Find every multiplication of two uint64 token-amount-class variables in the codebase
2. Check whether the multiplication is performed in the native type (uint64) or cast to a wider intermediate (`__uint128_t` / `u128` / `uint256`)
3. If native-type: compute the maximum realistic value of A × B at production scale; compare against `UINT64_MAX = 1.8446e19`
4. If max-realistic-value > UINT64_MAX: confirmed CANDIDATE-H hit; verify by sketching a TVL scenario that pushes the multiplication over the threshold (Indentura's $20M threshold for a typical USDC scenario is the canonical baseline)

### CANDIDATE-I: ERC4626-Wrappers-Using-balanceOf-Without-Virtual-Shares-Mitigation (Day 17 Sky-family sweep, 2026-05-16, proposed)

**Class statement:**

> ERC4626 yield-bearing share wrappers that derive `totalAssets()` (or equivalent share-asset conversion divisor) from `balanceOf(address(this))` of the underlying asset MUST implement virtual-shares / decimals-offset / dead-shares mitigation. Without mitigation, the first-depositor inflation attack (donate underlying to inflate price-per-share, subsequent depositors round to 0 shares) is the canonical exploit. The mitigation is well-documented (OpenZeppelin ERC4626 `_decimalsOffset()`, Solmate ERC4626 dead-shares pattern) but not universally applied.

**Specialization of:** Priority #1 WEAKER-PROPERTY-THAN-DOWNSTREAM-ASSUMES + META-DOCTRINE Two-Axis Donation-Channel Test (DANGEROUS-cell: balanceOf-for-accounting × user-fungible-share)
**Runtime scope:** EVM (any chain with ERC4626 wrappers — Ethereum, BSC, Base, Optimism, Arbitrum, etc.)
**Anchor (proposed):** validated emergent during Day 17 Sky-family sweep — Sky's sUSDS uses rate-accumulator-for-accounting (NOT balanceOf-for-accounting) so is structurally immune; the DANGEROUS-cell anchor would be any ERC4626 wrapper that DOES use balanceOf-for-accounting AND has user-fungible shares AND lacks virtual-shares mitigation. Candidate anchor protocols to scan (post-CVP):

- Any Yearn V3 vault not using virtual-shares (most do; few don't)
- Older Beefy / Reaper / Vaultka / Reaper Farm vaults
- Spark sUSDC variants (if any exist as balanceOf-based not chi-based)
- Cross-chain wrappers (mUSD-class, wmUSD-class)
- Liquid restaking wrappers without virtual-shares
- Hash-share / pERC4626 / lendle-style yield wrappers

**Status:** PROPOSED CANDIDATE (not yet anchor-confirmed); promotion gated on 1+ external-protocol anchor + 1+ adjacent worked example
**Cross-pollination scan target list (post-CVP):** 30-target watchlist + Etherscan-verified-bytecode grep on `vault.sol`/`wrapper.sol`/`4626.sol` files for `balanceOf(address(this))` patterns missing the OpenZeppelin `_decimalsOffset()` override

**Productization path:** at promotion → Semgrep / BuzzShield L1b rule:

```
pattern: function totalAssets() ... return $UNDERLYING.balanceOf(address(this)) ...
NOT pattern: function _decimalsOffset() ... return $X where $X > 0
NOT pattern: constructor ... _mint(address(0), $DEAD_SHARES)
```

Result: contracts with `balanceOf`-based `totalAssets()` AND no `_decimalsOffset()` override AND no dead-shares mint = high-priority deep-check.

**Audit-time check (proposed):**

1. Open `totalAssets()`. Does it read `$UNDERLYING.balanceOf(address(this))`?
2. If yes: open the deployment / initializer. Is there a `_decimalsOffset()` override returning > 0, OR a dead-shares mint at deployment, OR a virtual-shares constant > 0?
3. If neither mitigation present: CANDIDATE-I hit. Verify exploitability by sketching first-depositor inflation scenario.
4. Negative control: if `totalAssets()` derives from a counter (`_totalDeposits` self-tracked) or a rate-accumulator (chi-style), the contract is structurally immune — no inflation surface.

**Why proposed now (not waiting for anchor):** the META-DOCTRINE Two-Axis Donation-Channel Test predicted this exact DANGEROUS cell. Day 17 Sky-family sweep validated 3 of the 4 cells (3 SAFE) via real worked examples. The 4th cell (DANGEROUS — balanceOf-for-accounting × user-fungible-share) is the inflation-attack class; well-documented historically (Compound v2 cToken). Filing CANDIDATE-I as the formalization so the targeting-sweep can be operator-greenlit when ready. EV: each external anchor confirmed → 1 detector productization step closer to DC-7 promotion.

**Full intake artifact:** Day 17 Sky-family sweep hunt files (`hunts/2026-05-16-sky-{d3m,litepsm,susds-stusds}-*.md`) + this catalog entry

---

### CANDIDATE-J: Set-Halt Sibling-Pair 7-Point Correctness Checklist (Sky stUSDS RATE_SETTER + MOM, 2026-05-16, proposed reference pattern)

**Class statement:**

> When a protocol exposes a SETTER-class module (RateSetter, OracleRelayer, PriceUpdater, FeeAdjuster) paired with a HALTER-class module (Mom, CircuitBreaker, Pauser, EmergencyHalt) operating on the same protocol state variable, the pair MUST satisfy a 7-point correctness checklist to avoid file-then-halt race conditions, halt-bypass exploits, and authority misuse. The checklist is a defensive-design reference, not a single-bug pattern — its violation produces a CLASS of bugs rather than one specific bug.

**Specialization of:** Priority #1 WEAKER-PROPERTY-THAN-DOWNSTREAM-ASSUMES (the halter's "stop property" is weaker than downstream consumers assume if any of the 7 points fails)
**Anchor (CLEAN positive-example):** Sky stUSDS `STUSDS_RATE_SETTER` + `STUSDS_MOM` validated 2026-05-16 — most thorough first-encounter sibling-pair audit in brain catalog to date; 7 sub-checks ALL pass; established as reference pattern.

**The 7-point checklist:**

1. **Ordering correctness:** RateSetter writes to state in a specific order (e.g., drip-then-file, never file-then-drip); MOM halt does NOT bypass the ordering
2. **Cooldown enforcement:** between two consecutive RateSetter calls, a cooldown window must be enforced; cooldown survives MOM halt resumption
3. **Step bounds:** RateSetter rate change is bounded by bps-delta; bounds enforced symmetrically on both increase and decrease paths
4. **Halt-vs-direct separation:** MOM halt blocks RateSetter but does NOT block direct-protocol-state read paths (e.g., chi accumulator can still be drip()'d to current time even while RateSetter is halted)
5. **Drip-after-file in halt:** when MOM unhalts, drip() must apply correctly across the halt window (no lost time, no double-credit)
6. **Three-layer auth chain:** RateSetter has its own auth (e.g., `toll` modifier); MOM has its own auth (e.g., `owner + authority`); both report up to pause-proxy / wards (governance); the layered auth is correctly composed (no auth-bypass via direct write)
7. **Halt-vs-cut orthogonality:** if the protocol has a separate `cut()` loss-socialization path, MOM halt does NOT block cut() (or explicitly DOES, per protocol design — both are valid as long as documented and tested)

**Status:** PROPOSED REFERENCE PATTERN (not a bug class — a correctness checklist for sibling-pair design). Promotion to DC catalog gated on 2+ additional sibling-pair surfaces audited against this checklist (positive or negative outcomes both useful).

**Second anchor — MetaMorpho V1 Surface A (NEGATIVE outcome, 2026-05-23, twice-independently-discovered):** Curator-setting authority (`setCurator`, instant, no timelock) paired with cap-acceptance authority (`submitCap` → 24h MIN_TIMELOCK → `acceptCap`) on the same protocol state (vault market admission). **Violates points #1 (Ordering correctness) + #2 (Cooldown enforcement)**: owner can swap the curator INSIDE the pending-cap window, breaking the implied sibling-pair ordering (`pendingCap.curator == acceptCap.caller` should be invariant; it isn't). Asymmetric-defense window: instant-mutation authority bypasses the timelocked sibling.

**Independent-discovery convergence anchor (load-bearing for class validation):**
- 2026-05-23: independent researcher files Cantina finding #947 with structurally identical observation
- 2026-05-23: Buzz files Cantina finding #1035 in parallel with same finding (10-audit-saturation gap closed by 2 independent discoverers within ~24h window)
- 2026-05-24: Cantina triages #1035 as `CLOSED_DUPLICATE` of #947, severity HIGH→MEDIUM (operator msg 7670)

Convergence-as-validation: two independent methodologies arriving at the same finding under audit-saturated conditions is a strong signal that the CANDIDATE-J class is real, not over-fit. Methodology confirmed; submission velocity is the differentiator (independent discoverer filed first).

**Promotion status update:** Sky stUSDS (positive/CLEAN) + MetaMorpho V1 Surface A (negative/VIOLATED + twice-independently-discovered) = **2 anchors, 1 needed for promotion**. Recommend operator-decision on whether twice-independently-discovered counts as additional weight toward DC-N promotion vs. requiring fresh-third-anchor.


**Cross-pollination scan target list (post-CVP):**

- Chainlink Oracle Relayer + Circuit Breaker pairs
- Sui Oracle + Pauser pairs
- Pyth Oracle Relayer + Emergency Halt pairs
- Custom protocol fee-adjuster + emergency-halt pairs (many DeFi protocols)
- Synthetix-class rate-updater + circuit-breaker pairs
- Compound governance proposal-executor + emergency-pause pairs

**Productization path:** at promotion → audit-time checklist tool: feed a sibling-pair into the 7-point check, output PASS/FAIL per point with file:line evidence. Not a Semgrep rule (requires semantic understanding) — closer to a Skeptic-class prompt enricher that walks the checklist for each detected sibling-pair surface.

**Why proposed now:** stUSDS Lens G was the first encounter with a Maker-style automated bps-bounded rate updater + emergency-halt module pair. Establishing the checklist NOW (while the analysis is fresh) anchors a reusable reference for future scans. Even before promotion, future hunts can be informed by the 7 points.

**Full intake artifact:** `hunts/2026-05-16-sky-susds-stusds-gate1-2-3.md` Lens G

**Point-5 worked-example enrichment (added 2026-05-17 from M0 Extensions §2 Finding #2):** M0 Ext's `set_fee` instruction mutates the `fee_bps` config without first calling `sync_multiplier`. Any yield accumulated since the last sync gets retroactively re-priced at the new fee rate (e.g., fee raise 1% → 5% mid-period extracts 4% of unsynced yield from users). Adevar's fix: `sync_multiplier` first (locks in old fee on past yield), then mutate fee variable (applies new fee to future yield only). This is structurally a **Point-5 violation of the CANDIDATE-J checklist** — the equivalent of file-without-drip in the MOM halt-cycle. M0 Ext gives us a **counter-example worked-example** of Point 5 (it's a violation that was caught, where stUSDS was the positive reference where it was correctly handled). Note: M0 Ext is a setter+accumulator pair (not setter+halter), so it validates Point 5 specifically but NOT the other 6 points of the checklist. Promotion-math contribution: **partial credit** — counts as 0.5 worked example for promotion math (Point-5-only). CANDIDATE-J still needs 2+ FULL sibling-pair audits against all 7 points to clear promotion. Operator-decision-pending whether partial-credit accumulates toward the 2+ threshold (default-stance: no, full sibling-pair audits required).

---

### CANDIDATE-K: Floating-Point-In-Deterministic-VM-Consensus-Path (M0 Extensions 2025-07-02, Adevar Labs audit, confirmed in fix-review)

**Class statement:**

> Any program executing on a deterministic-VM blockchain (Solana, Aptos, Sui, NEAR — any chain where validator-byte-equality on state transition is required) MUST NOT use IEEE 754 `f32` / `f64` operations on any code path that feeds into a consensus-critical decision (state mutation, fund flow, solvency check, fee distribution, withdrawal payout). Float operations are platform-dependent in the last bits of mantissa (x86 vs ARM vs RISC-V), and validators running on different hardware may compute different results. The defense is to replace `f32`/`f64` with fixed-precision integer arithmetic, OR with a deterministic approximation (Taylor series, piecewise polynomial, lookup-table interpolation) with proven error bounds and explicit always-under/over-estimate property aligned to safety.

**Specialization of:** Priority #1 WEAKER-PROPERTY-THAN-DOWNSTREAM-ASSUMES (the "computation property" assumed downstream is "deterministic"; the actual property is "deterministic-on-most-validators-but-with-edge-case-divergence")
**Runtime scope:** all deterministic-VM blockchains:

- Solana (Solana Runtime / BPF / SBF) — primary anchor; Token2022 ScaledUI extension explicitly invites this antipattern
- Aptos (Move VM) — Move's `u64` is canonical; `f64` exists but rarely used
- Sui (Move VM) — same as Aptos
- NEAR (Wasm) — WebAssembly `f64` is deterministic-by-spec but not all NEAR runtime versions enforce; check version

NOT in scope: EVM (no IEEE 754 floats in EVM bytecode at all; uses uint256 fixed-point throughout)

**Anchor (CONFIRMED in audit fix-review):**

- M0 Extensions §2 Finding #3 — `calculate_new_multiplier` in `programs/m_ext/src/utils/conversion.rs:224-228` uses `f64` `powf` to compute `(last_ext * new_m / last_m)^(1 - fee_bps/10000)`. Float rounding rounds UP instead of down in certain input domains, producing `last_ext_index > mathematically_correct`. Downstream solvency check `vault_balance >= total_ext * multiplier` then trips, halting the entire program until either more M tokens are deposited OR a new M index arrives. Adevar's PoC: $200M flashloan grief-stall at $0.20 cost (some flashloan providers offer 0% fee → grief cost ≈ Solana tx fees only).

**Status:** CONFIRMED in fix-review (Adevar Labs 2025-07-02 audit, M0 chose "relax the solvency check" as the fix per developer response); promotion blocked on 1+ additional anchor (any other Solana program that uses `f64` in consensus path with concrete bug evidence)

**Cross-pollination scan target list (post-CVP):**

- Solana programs using Token2022 ScaledUI / InterestBearing / TransferFee with computed (non-constant) parameters
- Solana DEX programs using `log` / `exp` / `sqrt` for AMM price curves (Orca Whirlpool, Raydium CLMM — both use fixed-point internally; verify)
- Solana lending programs using continuous-compound interest math (Kamino, MarginFi, Solend — most use rate-accumulator integer math; verify)
- Solana derivatives programs using Black-Scholes / payoff function math (Friktion, Katana, PsyOptions)
- Aptos / Sui DeFi protocols porting from Solidity equivalents (likely to inadvertently use `f64` for what was uint256 fixed-point on EVM)

**Productization path:** at promotion → BuzzShield L1b detector rule:

```
pattern: (f64 | f32 | Float)
file_filter: programs/**/*.rs OR programs/**/*.c (Solana sources)
NOT in: comment OR doc-comment OR test file OR UI-display-only module
classify_severity_by:
  - if used in fund-flow path (downstream consumer is `transfer` / `mint` / `burn`) → HIGH
  - if used in state-mutation path → MEDIUM (likely indirect fund impact)
  - if used in validation-only path (require! / assert! conditions) → MEDIUM-HIGH (false-validation risk)
  - if used only in UI display / format string → LOW (acceptable per Adevar's framing)
```

Low FP rate (Rust idiom strongly discourages `f64` in finance), HIGH catch rate when fires (almost always a structural smell).

**Full intake artifact:** `brain/Audit-Reports-Library.md` §2 M0 Extensions (this catalog)

**Audit-time check (proposed):**

1. `grep -rn 'f64\|f32' programs/` (or equivalent for the target Solana program's source structure)
2. For each hit: classify into one of (a) UI-display-only — acceptable, (b) validation-only — borderline-acceptable but smell, (c) state-mutation / fund-flow — REAL CANDIDATE-K HIT
3. For category (c): identify the downstream consumer of the float-produced value. Trace whether float-rounding could shift the decision boundary (overflow a check, underflow a payout, flip a comparison)
4. If yes: CANDIDATE-K HIT. Verify by sketching an input that produces divergent float-rounding on different validator hardware (x86 vs ARM Apple Silicon vs RISC-V) — if `powf` / `exp` / `log` is used, sufficient
5. Negative-control: the Token2022 ScaledUI interface ITSELF requires f64 (the SPL Token2022 program accepts f64). This is OK only IF the program's computation of that f64 is deterministic — i.e., produced by deterministic-approximation math, not by Rust `powf`

---

### CANDIDATE-L: Consensus-Bucket-Key-Asymmetry (Wormhole PR #4805, 2026-05-11, confirmed in-fix)

**Class statement:**

> When a consensus protocol aggregates signatures across N participants into a "bucket" before checking quorum, the bucket-key MUST equal the canonical merge-key (the property all participants signed over). If the bucket-key is keyed by a SUPERSET of fields — including per-participant metadata that participants can disagree on without breaking the canonical signed property — signatures for the SAME canonical artifact split across separate buckets. Quorum is then counted independently per bucket. Near-even disagreement on the metadata fields prevents any single bucket from reaching quorum, even when N participants signed the same canonical artifact. Consensus stalls. NOT a forgery class — a LIVENESS class.

**Specialization of:** Priority #1 WEAKER-PROPERTY-THAN-DOWNSTREAM-ASSUMES, applied to merge-state-keying. Validation site validates participant-signed-canonical-artifact; consumer site (quorum counter) assumes any two signatures over the same canonical artifact merge. If the bucket-key includes per-participant metadata, the consumer's assumption fails on signatures whose canonical-artifact matches but per-participant metadata diverges.

**Anchor (CONFIRMED):** Wormhole `node/pkg/processor/observation.go` PR #4805 (commit `4028572`, 2026-05-11). Pre-fix bucket-key = `crypto.Keccak256Hash(mp.MarshalBinary())` (includes per-guardian fields: IsReobservation, Unreliable, verificationState, TxID, ...). Post-fix bucket-key = `mp.CreateDigest()` (VAA signing digest only — Timestamp/Nonce/Sequence/ConsistencyLevel/EmitterChain/EmitterAddress/Payload). Companion helper `NormalizeForDelegateConsensus` resets per-guardian metadata on the consensus MP before downstream pipeline. Bug class: LIVENESS (transfer stalls on near-even-split per-guardian metadata, e.g. partially-reobserved delegate set).

**Status:** 1 worked example confirmed (Wormhole PR #4805). Needs 1+ adjacent worked example for promotion. **NOT a DC-7 hit** — DC-7 is field-binding asymmetry where attacker controls KEY-B to forge; CANDIDATE-L is consumer-side bucket-membership asymmetry where honest signers fail to merge. Different vector, different outcome. File as standalone candidate.

**Cross-pollination scan targets (post-CVP / manual triage):**

- Other Wormhole consensus paths (guardian-set quorum on inbound VAAs, notary submission quorum, accountant per-entry digest matching)
- NTT message-passing quorum (if any aggregation layer exists)
- LayerZero DVN aggregation paths
- Axelar validator-vote aggregation
- IBC packet-ack aggregation
- Any threshold-signature scheme where per-participant metadata is hashed alongside the canonical signed payload (TSS pre-signing rounds, ROAST signature aggregation)
- Bitcoin Lightning channel commitment quorum (sibling-of-sibling — separate threat model but same shape)

**Audit-time check (proposed):**

1. For every consensus aggregation layer, identify the "bucket" / "merge" / "set" data structure that aggregates per-participant submissions for the same logical artifact.
2. Read the bucket-key derivation. Enumerate exactly which fields it hashes.
3. Compare against the canonical-merge property: which fields do participants sign / agree on? Which fields are per-participant metadata (TxID, observation timestamp, reobservation status, peer health, etc.)?
4. If bucket-key ⊋ canonical-merge property → CANDIDATE-L hit. Severity: depends on whether (a) the disagreement fields are attacker-influenceable from a delegate (escalates to availability attack) or (b) only correlate-divergent on natural protocol behavior (pure liveness regression).

**Productization signal:** MEDIUM. Pattern is grep-friendly (look for `keccak256(*.MarshalBinary())` or equivalent serialize-then-hash patterns immediately preceding a `_state[hash] += ...` aggregation). Initial L1b Semgrep rule would target Go + Rust consensus codebases. FP rate moderate (lots of marshal-then-hash patterns are NOT for bucket-keying); gate via paired "lookup-in-aggregation-map" detector downstream.

**Wormhole revisit conditions** (per operator directive 2026-05-20): (a) deployed Core Bridge commit identified via drift-discovery loop, OR (b) NTT Gate 1 scheduled separately. CANDIDATE-L applies to either re-entry path.

**Full intake artifact:** B2 task analysis 2026-05-20 (in-context this session) + commit `4028572` in `/home/claude-code/.tmp-build/wormhole-clones/wormhole/` (depth=1 + `git fetch --unshallow` performed).

---

### Promotion criteria (any candidate → next DC slot)

A candidate promotes to the next DC slot when ALL of the following hold:

1. Anchor post-mortem / CVE confirmed (not hypothesis-tracked)
2. ≥ 2 adjacent worked examples in brain (same class, different protocol)
3. Operator decision to promote
4. (For productization-targeted candidates) detector spec drafted and unit-tested

**Current standings (2026-05-19 snapshot, updated post-CANDIDATE-G promotion to DC-8):**

- CANDIDATE-A (THORChain signature-scope): 0 worked examples confirmed (PM pending, Hypothesis C TSSHOCK class now LEADING per Cross-Domain-Fragility-Laws.md v1.5 — anchor forfeited) — promotion blocked
- CANDIDATE-D (KyberSwap startSqrtP-equality): 1 worked example confirmed (KyberSwap); Indentura L04 (CREATE_VAULT reinit corrupting active vault state) is **adjacent state-machine-integrity** sibling but DIFFERENT sub-pattern (init-guard-missing vs tick-recomputation-gate-wrong-reference). Operator-decision-pending whether to count Indentura L04 toward CANDIDATE-D promotion: default-stance is **adjacent-but-distinct** (file as separate sub-pattern, not as 2nd worked example).
- CANDIDATE-E (Raydium symmetric-pair-rounding): 1 worked example confirmed (Raydium). Indentura H01/H02 is **same parent family** (fixed-precision arithmetic surface gaps) but DIFFERENT sub-pattern (multiplicative-intermediate-overflow, now CANDIDATE-H). **Day 17 update:** 2 confirmed exclusion classes added (1:1 PSM single-direction conversion, chi-style rate-accumulator ERC4626) — hit-list sharpened, FP cost reduced. Operator-decision-pending whether to merge CANDIDATE-E + CANDIDATE-H into a unified DC-X at promotion time.
- **CANDIDATE-F: PROMOTED to DC-7 as of 2026-05-18 per operator directive msg 7209.** Active catalog entry above (DC-7 — Validating-Field ≠ Consuming-Field on Adjacent Function Pipelines). 4 worked examples across 2 domains (web framework + EVM): Next.js CVE-2026-44578 + TrustedVolumes chain 1 + TrustedVolumes chain 2 + ShapeShift FOX Colony. Race for DC-7 slot RESOLVED.
- **CANDIDATE-G: PROMOTED to DC-8 as of 2026-05-19 per operator directive msg 7259 §5A.** Active catalog entry above (DC-8 — Anchor-Signer-Validation-Moved-From-Accounts-Struct-To-Function-Body). 3 worked examples across 3 protocols, 2 language idioms: Indentura L02+L03 (native C, Adevar audit 2026-02-17) + M0 Extensions Finding #1 (Rust/Anchor, Adevar audit 2025-07-02) + OnRe CG-O-4 set_kill_switch (Rust/Anchor, Buzz Gate 1 2026-05-18). Third anchor from non-Adevar source (OnRe — Buzz Continuous Assurance) resolves the single-auditor caveat. Race for DC-8 slot RESOLVED.
- **CANDIDATE-H (Indentura C-runtime-uint64-overflow): 2 worked examples in single audit (H01 + H02)**. Operator-decision question unchanged: default-stance count as 1; needs 1+ additional protocol. No new worked examples from M0 Extensions (M0 Ext uses Rust + Anchor which has `checked_mul` available, plus M0's bugs were elsewhere).
- **CANDIDATE-I (ERC4626-wrappers-using-balanceOf-without-virtual-shares): 0 anchor confirmed (proposed from Day 17 META-DOCTRINE)**. Needs 1+ external anchor + 1+ adjacent worked example. Highest-EV targeted sweep candidate post-CVP (30-target watchlist + Etherscan-verified-bytecode grep method). No M0 Ext relevance (Solana-side).
- **CANDIDATE-J (Set-Halt sibling-pair 7-point checklist): 1 positive worked example (stUSDS RATE_SETTER + MOM) + 1 Point-5-only counter-example (M0 Extensions Finding #2)**. Reference pattern, not bug class; promotion gated on 2+ FULL sibling-pair audits against all 7 points. M0 Ext partial credit (0.5 worked example for Point-5 only) — operator-decision-pending whether partial-credit accumulates toward promotion (default-stance: no, requires full sibling-pair audits).
- **CANDIDATE-K: HOLD per operator directive (2026-05-18).** Recently anchored on M0 Extensions Finding #3; 1 worked example confirmed. Needs 1+ adjacent worked example for promotion. **Most-shippable detector** of all CANDIDATEs (single-AST-grep on `f64`/`f32` types in Solana sources; low FP rate); detector can ship independent of promotion math.
- **CANDIDATE-L (Wormhole consensus-bucket-key asymmetry): 1 worked example confirmed (Wormhole PR #4805, 2026-05-11)**. Needs 1+ adjacent worked example for promotion. Cross-pollination scan targets named (LayerZero DVN aggregation, Axelar vote aggregation, NTT message passing, IBC ack aggregation, TSS pre-signing-round buckets). **NOT a DC-7 hit** — different vector (consumer-side merge failure vs validator-side forgery). LIVENESS class, not forgery class. Logged per operator directive 2026-05-20 after Wormhole D4 pivot.

**Race for DC-9 slot (2026-05-20 post-CANDIDATE-L filing):** DC-8 race RESOLVED on CANDIDATE-G. 6 CANDIDATEs anchor-confirmed (D, E, H, J, K, L), 1 proposed (I), 1 pending (A) = **8 candidates in the pool** contesting DC-9.

- **Next-up promotion-eligible (2+ adjacent worked examples threshold met):** none currently cleared — CANDIDATE-D (1 protocol), CANDIDATE-E (1 protocol), CANDIDATE-H (1 protocol), CANDIDATE-J (partial), CANDIDATE-K (1 protocol). Operator directs which to prioritize for next sweep.
- **Productization-speed ranking (re-sorted post-DC-8 promotion):** CANDIDATE-K (single-grep, trivial) ≈ CANDIDATE-E (Semgrep, trivial) > CANDIDATE-I (Semgrep + AST grep, trivial) > CANDIDATE-H (semgrep + name-heuristic) > CANDIDATE-J (Skeptic-class checklist prompt enricher, semantic).
- **Cross-pollination-yield ranking (re-sorted post-DC-8 promotion):** CANDIDATE-I (30-target watchlist sweep) > CANDIDATE-K (Solana / deterministic-VM ecosystem) > CANDIDATE-E + CANDIDATE-H (AMM + Solana-C surface) > CANDIDATE-J (oracle-relayer pair surface). Operator picks which dimension to optimize first for DC-9.

**Day 17 5-of-5 Sky-family clean-sweep summary:** Sky Lockstake V2 (clean), Sky LockstakeMigrator (clean), Sky D3M (clean), Sky Lite PSM (clean), Sky sUSDS/stUSDS (clean) — methodology validated under real-money pressure ($6.06B sUSDS TVL + $208M stUSDS TVL + multi-billion Sky vault TVL). Anti-metrics doctrine HOLDS — 5 honest clean sweeps + 1 new META-DOCTRINE + 2 new CANDIDATES (I + J) + 2 CANDIDATE-E exclusion classes = brain compounded substantially without violating discipline.

**Day 17 Sunday autonomous Tier 2 intake (2026-05-17):** Adevar Labs M0 Extensions audit defensively read → `brain/Audit-Reports-Library.md §2` added; CANDIDATE-G enrichment (Anchor variant + 2-protocol promotion threshold met under default-stance); CANDIDATE-J Point-5 worked-example added; CANDIDATE-K newly anchored; 1 productization-detector spec (Anchor `Signer<'info>`-without-`has_one`) ready for L1b backlog.

---

_Patterns: Defense Classes | v1.9 | 2026-05-19 | CANDIDATE-G PROMOTED to DC-8 ("Anchor-Signer-Validation-Moved-From-Accounts-Struct-To-Function-Body — Refactor Regression Class") per operator directive msg 7259 §5A + session recovery 2026-05-19; 3 anchors: Indentura PL Vault (Adevar 2026-02-17) + M0 Extensions (Adevar 2025-07-02) + OnRe set_kill_switch (Buzz Gate 1 2026-05-18); DC-8 inserted between DC-7 and Application-Order; Application-Order extended to 10 steps; standings table updated — race-for-DC-9 (D, E, H, I, J, K remain; A pending); DC-7 entry unchanged._

---

### CANDIDATE-M: Post-Audit Refactor Breaks CEI Ordering (0xBugDrop series, 2026-05-22 brain intake)

**Class statement:**

> An external call to a hook / callback / plugin contract is added to an existing user-facing function AFTER an audit cleared it. The audit's CEI (Checks-Effects-Interactions) discipline guarded the pre-refactor flow; the new hook is inserted BEFORE the storage mutation, breaking CEI ordering. Result: external call to attacker-controlled address before state update = classic reentrancy. Attacker registers malicious hook → calls the refactored function → re-enters via callback → drains the contract in one block.

**Specialization of:** Priority #1 WEAKER-PROPERTY-THAN-DOWNSTREAM-ASSUMES, applied to refactor-time invariant decay. The original audit established the invariant "no external call before state update in this function." The refactor preserved the function name + signature + storage layout BUT inserted a new external call. Downstream code (and downstream auditors) assume the original invariant still holds. It does not.

**Anchor (CONFIRMED via 0xBugDrop / @0xTeamSpace Twitter series):** Unnamed lending protocol, $47M TVL at risk, $7M direct drain. `repay()` calls `IHook.onRepaymentCallback()` BEFORE `userDebt[msg.sender] -= amount`. Attack: register malicious hook → call repay() → during onRepaymentCallback, call borrow() with attacker's (unmodified) old debt as collateral basis → full drain. Two prior audits missed the hook because it was added AFTER they were performed.

**Status:** 1 worked example confirmed (0xBugDrop unnamed protocol). Needs 1+ adjacent worked example for promotion to DC-N. Productization-friendly: grep + diff-vs-audit-SHA.

**Cross-pollination scan targets (operator-flagged, 2026-05-22):**

- **Fira protocol** — router facets (hooks visible in Diamond proxy facet dispatch). Already-pulled Sourcify sources at `data/gate2-source/fira-v1/`.
- **Aave V4** — Spoke callbacks to Hub (cross-Spoke composition surface). Source at `data/gate1-clones/aave-v4/`.
- **Usual** — any post-audit refactors (Usual has 12 audit waves Nov25-Mar26; post-Mar26 refactors are the high-EV slice).
- Plus: any DeFi protocol with `hookAddress`, `setHook`, `IHook`, `onCallback`, `_beforeAction` / `_afterAction` patterns + upgradeable hook address.

**Audit-time check (proposed):**

1. For every external function in scope, identify ALL `address.call{...}` / `IExternalContract(X).function(...)` calls
2. For each external call, identify: is the destination address upgradeable post-deployment? Was it added after the last audit?
3. For each "added-after-audit" external call, check CEI ordering: external call BEFORE state mutation = HIGH severity candidate
4. Pair with CANDIDATE-N (below) — if the upgradeable hook has no timelock + the default was benign at audit time, severity escalates to CRITICAL

**Productization signal:** HIGH. Pattern is grep + AST + git-history. Detector spec filed as `cei-violation-via-hook` candidate (see Productization section). FP rate moderate; "upgradeable hook + no timelock + added-after-audit" qualifier reduces noise significantly.

---

### DC-9: Privileged State Mutation Without Defense-in-Depth (PROMOTED 2026-05-22, Ogie msg 7518)

> **Promotion event:** CANDIDATE-N reached 4 worked-example anchors with $320M+ combined exposure on 2026-05-22; operator (Ogie msg 7518) promoted to DC-9, joining DC-7 and DC-8 as battle-tested classes. DC-9 must be added to: `defense-class-mapping.json` propagation engine, all future Gate 1 lens stacks, and Standing Intake Protocol Step 2 brain-overlap check (per Ogie msg 7518).

**Class statement (DC-9):**

> A privileged state mutation (hook-address upgrade, migration trigger, registry rewrite, mint, burn, role-grant, parameter set, vault deposit-condition trigger) is gated by a SINGLE admin role or single multisig WITHOUT defense-in-depth — meaning without any of: timelock interval, supply/rate cap, secondary-authorization quorum, monitor-then-block community window, or post-consumption state invalidation. If the single role is compromised (key loss, social engineering, insider, bug) — OR if the state-mutation predicate is not consumed after first use — the protocol is one-call (or N-calls from one valid condition) from drain. Audit-time benignity is irrelevant; the defense-class is structural.

**4 worked-example anchors (collective $320M+ exposure):**

| #   | Protocol          | Date       | $ Drained | Sub-pattern                                  | Source               |
| --- | ----------------- | ---------- | --------- | -------------------------------------------- | -------------------- |
| 1   | 0xBugDrop unnamed | 2026-05-22 | $7M       | Upgradeable Hook/Verifier/DVN                | 0xBugDrop / msg 7498 |
| 2   | Drift Protocol    | 2026-04-01 | $285M     | Zero-Timelock Migration (+ CANDIDATE-P pair) | 0xTeam / msg 7512    |
| 3   | Resolv Labs       | 2026-02-XX | $25M      | Unchecked Mint                               | 0xTeam / msg 7514    |
| 4   | Solv Protocol     | 2026-03-XX | $2.7M     | State-Not-Invalidated Repeated Mint          | 0xTeam / msg 7516    |

**Historical note:** Pre-promotion this class was tracked as CANDIDATE-N (Benign-Default + Upgradeable-Hook-Address = Latent Critical, 0xBugDrop series, 2026-05-22 brain intake). The original framing was upgradeable-hook-specific; the broader family signature (privileged-state-mutation + no-defense-in-depth) emerged as anchors 2-4 landed on the same day.

---

### CANDIDATE-N (historical, now DC-9): Benign-Default + Upgradeable-Hook-Address = Latent Critical (0xBugDrop series, 2026-05-22 brain intake)

**Class statement:**

> A contract integrates an external hook via a storage variable `hookAddress` initialized at deployment to a benign address (read-only logger, no-op, monitoring proxy). Auditors evaluate the contract WITH the benign default, see no observable risk, and clear the integration. The `hookAddress` is upgradeable post-deployment via an admin function with NO TIMELOCK. After deployment, an admin (compromised admin-key OR latent malicious-by-design) upgrades the hook to an attacker-controlled contract. The integration becomes a CRITICAL fund-drain surface that did not exist at audit time.

**Specialization of:** Audit-time-state-vs-runtime-state invariant decay. Standalone audit snapshots do not reflect the address-upgrade surface. Combines with CANDIDATE-M (above) when the integration is also CEI-broken.

**Anchor #1 (CONFIRMED via 0xBugDrop series, 2026-05-22):** Same unnamed protocol as CANDIDATE-M. Default hook was read-only logger (looked safe). Hook address was upgradeable via `setHook(address)` with NO TIMELOCK. Attacker (or admin-key compromise) upgrades hook to malicious contract. Combined with CANDIDATE-M's CEI break → instant $7M drain.

**Anchor #2 (CONFIRMED via 0xTeam analysis, 2026-05-22 brain intake — Ogie msg 7512):** Drift Protocol, Solana, 2026-04-01. **$285M drained in 12 minutes** — largest DeFi hack of 2026. DPRK nation-state operation; 6-month social engineering preceded the technical exploit. Code-level enabler = **zero-timelock migration function**. Social engineering captured the multisig signatures (see CANDIDATE-P intake), but the zero-timelock migration is what let the captured signatures execute INSTANTLY before community detection. With a timelock, the queued migration would have surfaced for community review and been blocked. Same defense-class as 0xBugDrop unnamed: a code-controllable parameter (timelock interval) was the line between "compromised signatures = bad day, monitorable, blockable" and "compromised signatures = $285M drain in 12 minutes."

**Anchor #3 (CONFIRMED via 0xTeam blog, 2026-05-22 brain intake — Ogie msg 7514):** Resolv Labs, **$25M drained Feb 2026** via unchecked mint logic on USR token through a single compromised backend role. "No complex hack. Just unchecked minting." Code-level enabler = `mint(address,uint256)` function gated by single `onlyMinter` modifier with NO supply cap, NO rate-limiter, NO secondary-authorization. Single role compromise → unlimited mint → dump-on-DEX → drain. Same family signature: privileged single-role state mutation with no second-defense-line (no timelock, no cap, no rate-limit, no monitor-then-block window).

**Anchor #4 (CONFIRMED via 0xTeam blog, 2026-05-22 brain intake — Ogie msg 7516):** Solv Protocol, **$2.7M drained Mar 2026** via BRO vault → SolvBTC conversion path. **Repeated execution from single valid condition** — validation passed ONCE but mint() executed N times because the validation predicate state was NOT invalidated after consumption. **38 SolvBTC extracted ($2.7M).** Distinct from reentrancy: single-threaded looping, not mid-call re-entry. The defect is at the function-return boundary — state should have been consumed/decremented/cleared/nonce-incremented and was not.

**Promotion status (2026-05-22, Ogie msgs 7512+7514+7516):** **4 worked examples confirmed**, combined exposure **$320M+** ($7M 0xBugDrop + $285M Drift + $25M Resolv + $2.7M Solv). Brain-conventions promotion threshold exceeded (4+ adjacent anchors). **PROMOTE TO DC-9** (pending operator approval signal). Family signature for DC-9:

> A privileged state mutation (hook-address upgrade, migration trigger, registry rewrite, mint, burn, role-grant, parameter set) gated by a SINGLE admin role or single multisig WITHOUT any of: timelock interval, supply/rate cap, secondary-authorization quorum, monitor-then-block community window. If the single role is compromised (key loss, social engineering, insider), the protocol is one-call from drain. Audit-time benignity is irrelevant — the defense-class is structural.

**Sub-pattern 1 — "Unchecked Mint = Infinite Supply Attack"** (Resolv-anchored, Feb 2026):

- Mint function with NO supply cap
- NO rate limiter (per-tx OR per-epoch)
- NO secondary authorization (e.g., council quorum, multisig N-of-M)
- Single role can mint unlimited → dump on DEX → drain
- Grep: `mint(`, `MINTER_ROLE`, `_mint(`, `onlyMinter`, `bridgeMint`, `crossChainMint`

**Sub-pattern 2 — "Zero-Timelock Migration"** (Drift-anchored, Apr 2026):

- Migration / upgrade function with NO timelock-queue
- Executes instantly when admin role calls it
- No community-visible queue period to detect + block

**Sub-pattern 3 — "Upgradeable Hook / Verifier / DVN" (0xBugDrop-anchored, May 2026):**

- Storage `address` variable for callback / verifier / hook
- `setX(address)` setter with admin-only gate, NO timelock
- Called inside fund-flow path

**Sub-pattern 4 — "State-Not-Invalidated Repeated Mint"** (Solv-anchored, Mar 2026):

- Validation predicate (boolean flag, counter, ticket, signature-nonce, deposit-flag) is READ at mint() entry
- Predicate is NOT MUTATED between read and function-return
- Caller can re-invoke mint() with same predicate — same valid condition still passes — re-mints
- Effect: 1 valid signature → N mints. 1 deposit → N withdraw-receipts. 1 redemption ticket → N redemptions.
- Distinct from reentrancy (no mid-call re-entry; pure single-threaded looping)
- Grep: any `function mint`/`_mint`/`claim`/`redeem`/`bridgeMint` — trace validation predicate's state lifecycle through function body
- Detection signature: predicate READ before mutation + predicate UNCHANGED after mint side-effects = sub-pattern hit
- Detector spec: `state-not-invalidated-repeated-mint` (AST-graph predicate-mutation tracking, FP-gate: only flag if predicate is read AND not written in same function body)

**Sub-pattern 5 — "Default-Zero Threshold Footgun"** (Inverse-anchored, added 2026-05-25 from cycle 2 Gate 1, Ogie msg 7750 P3):

- A safety-threshold parameter (staleness threshold, max-deviation, min-collateral, rate-cap, deadline-window) is stored in a per-asset / per-market / per-instance MAPPING (e.g., `mapping(address => uint256) stalenessThreshold`)
- Default value when a market is added but threshold not explicitly set = **`0`**
- Threshold check uses `<` or `>` comparison: `if (timestamp - lastUpdate > stalenessThreshold) revert();`
- Default-zero value silently **disables** the check (every value > 0 passes, so the revert branch never fires)
- Effect: protocol operator MUST remember to set threshold per-market; forgetting = silent disable of the safety check; no compile-time enforcement
- Distinct from DC-9 sub-1/sub-2 (mint/timelock) — sub-5 is a DEPLOYMENT-GOVERNANCE bug class, not a structural-defense-absence class. The check EXISTS in code; the deployment forgot to configure it.
- Canonical anchor: Inverse FiRM `Market.sol:151` `stalenessThreshold[market] == 0` default silently disables `isPriceStale()` defense (R8 [INSPECTED] from Inverse Gate 1 task #70)
- Grep: `mapping\(.*=>\s*uint256\)\s+\w*[Tt]hreshold` + check default-zero semantics; cross-reference setter functions to identify markets-without-explicit-set
- Detector spec: `default-zero-threshold-silent-disable` — find threshold-mapping reads + comparison with default-zero allow-path; flag missing per-market initialization in setup/migration scripts

**Cross-pollination scan targets (active):** Usual Labs USD0 (has MINTER_ROLE — in scope), Ethena USDe (MINTER_ROLE — we have a submitted finding queued), any ERC20 with privileged mint function, every protocol with `MINTER_ROLE` / `onlyMinter` / `_mint()` / bridge mint. Pair-check each against DC-9 sub-patterns.

**Status:** Sibling-of-CANDIDATE-M (CEI-break-via-upgradeable-hook compound). DC-9 productization HIGH-priority: storage-slot detection + admin-function-modifier check + timelock-absence check + supply-cap check + rate-limiter check. Detector spec: `single-role-privileged-mutation-no-secondary-defense`.

**Audit-time check (proposed):**

1. List every storage variable typed `address` that is set to an external contract (look for `IHook(addr).call(...)` usage patterns)
2. For each, check: is there a setter? What modifier guards it? Is there a timelock?
3. For each setter without timelock, classify the slot:
   - HIGH RISK: address called inside a fund-flow function (CANDIDATE-N hit)
   - MEDIUM RISK: address called inside admin / configure functions (slower drain path)
   - LOW RISK: address is purely informational / read-only
4. Pair-check with CANDIDATE-M: if the function calling the upgradeable address is CEI-broken AND the upgrade has no timelock = CRITICAL combined finding

**Productization signal:** HIGH. Pattern is grep + AST + storage-slot analysis. Detector spec: `upgradeable-hook-no-timelock`. Compounds with `cei-violation-via-hook` detector for combined-CRITICAL detection. FP rate medium; "no timelock + called in fund-flow path" qualifier narrows.

**Cross-pollination scan targets:** identical to CANDIDATE-M (Fira router facets, Aave V4 Spoke callbacks, Usual post-audit refactors).

---

### CANDIDATE-O: Slippage Double-Count Across Swap Steps (Rhea Finance, 2026-04-16, 0xTeam analysis, $18.4M drain)

**Class statement:**

> A multi-step swap router (sequential AMM hops, batch swaps, multi-pool routes) accounts for slippage at each step but reuses a per-step input value in two semantically-distinct places — once as the AMOUNT_IN for the current hop's slippage check, and again as the AMOUNT_OUT of the previous hop's output validation. The same value is "double-counted" across the boundary between two hops, allowing an attacker to engineer routes where the apparent slippage protection is satisfied at each individual step while the cumulative slippage across the route is unbounded. DC-7 sibling: a field is CONSUMED with different semantics in two places without the boundary-crossing validation that would catch the asymmetry.

**Specialization of:** Priority #1 WEAKER-PROPERTY-THAN-DOWNSTREAM-ASSUMES, applied to multi-step arithmetic state-machines. Each step's slippage check is locally correct; the COMPOSITION across steps is the bug. NOT a single-function field-binding asymmetry (DC-7) — it's a per-hop carry-value semantic ambiguity between sibling hops.

**Anchor (CONFIRMED via 0xTeam analysis, 2026-05-22 brain intake):** Rhea Finance, NEAR Protocol, 2026-04-16. $18.4M drained. Attack flow:

1. 48h prep: 423 wallets deployed, 8 fake pools on Ref Finance with attacker-controlled fake tokens
2. 80 min execution window
3. Trigger: multi-step swap path through attacker pools exploits slippage check that reuses `amountOut_step_N` as `amountIn_step_N+1` while ALSO using `amountOut_step_N` in cumulative slippage tally — double-count
4. Cascade: forced-liquidations on lending contracts using the manipulated price
5. Recovery: ~$10M (Tether froze $3.29M USDT + attacker returned $4.86M); ~$8.4M outstanding

**Status:** 3 worked examples confirmed as of 2026-05-27 — promotion-threshold (≥2 independent anchors + ≥1 PoC-confirmed leak) SATISFIED. Promotion-to-DC queued in OQT Q-41 awaiting operator decision.

**Anchor 1 — Rhea Finance (NEAR, 2026-04-16, $18.4M drain, see above).** Production exploit, original substrate.

**Anchor 2 — Balancer V3 BatchRouterHooks + StableSurgeHook (2026-05-26, PoC CONFIRMED 2026-05-27).** `pkg/vault/contracts/BatchRouterHooks.sol:122-127` per-step `minAmountOut = 0` + StableSurgeHook approximation drift compose across hops. 2-hop leak 1.09% vs 1-hop 0.55% on identical 5% end-to-end envelope under production-default surge parameters. PoC at `balancer-v3-monorepo/pkg/pool-hooks/test/foundry/BatchRouterSlippageDoubleCountPoC.t.sol` against HEAD `80fd29ce4eb6`. Paste-ready: `data/lane1/gate2-clones/balancer-b1-batchrouter-slippage-paste-ready-v2.md`.

**Anchor 3 — PancakeSwap Infinity Router CL + Bin multi-hop loops (2026-05-27, PoC CONFIRMED 2026-05-27).** `infinity-periphery/src/pool-cl/CLRouterBase.sol:40-65` (`_swapExactInput`) + `:82-111` (`_swapExactOutput`) + `infinity-periphery/src/pool-bin/BinRouterBase.sol:42-66` + `:82-113` ALL share the same shape: iterate path, propagate hop-N output as hop-(N+1) input, only check composed extreme at loop end. NO per-step floor parameter even exists in `CLSwapExactInputParams` / `BinSwapExactInputParams` / their exact-out duals. Composes with `CLHooks.afterSwap` (`pancake-v4-core/src/pool-cl/libraries/CLHooks.sol:163-193`) and `BinHooks.afterSwap` positive-`hookDelta` primitives — `delta = delta - hookDelta` at line 189 silently reduces caller's output on every intermediate hop. 2-hop leak 1.195% vs 1-hop 0.600% on identical 5% end-to-end envelope with 25-bps hook fee. PoC at `infinity-periphery/test/pool-cl/InfinityRouterSlippageDoubleCountPoC.t.sol` against HEAD `f39aef4a1be6`. Paste-ready: `data/lane1/gate2-clones/pancake-p1-infinity-router-slippage-paste-ready-v2.md`.

**Multi-anchor pattern argument:** Two independent production deployments (Balancer V3 + Pancake Infinity) by two unrelated teams converge on the same structural shape: end-of-path-only slippage enforcement composed with permitted per-hop hook deltas. Pancake's expression is even more exposed — there is no per-step `minAmountOut` parameter at all in the four affected router-base loops (Balancer at least zeros an explicit per-step field; Pancake's structs don't even define one). The pattern is intrinsic to the hook-based singleton-vault router architecture family, not an implementation accident. Proposed promotion name (Q-41): **DC-13 End-of-Path-Only Slippage Composition With Per-Hop Hook Deltas**. Productization-friendly: AST-grep for multi-hop loop bodies in router contracts that propagate hop-N output without per-step floor check.



**Cross-pollination scan targets:**

- **Uniswap V4 hooks** — multi-hop swaps via PoolManager.unlock() callbacks; check if hook return values are reused across pool boundaries
- **Fira AMM** — fixed-rate + variable-rate composability across markets
- **Balancer V3 batch swaps** — vault.batchSwap() multi-step paths
- **1inch / Paraswap / 0x route splitting** — aggregator-routed multi-hop slippage
- **Curve metapool / cross-pool routes** — output of pool A becomes input of pool B
- **Solana Jupiter aggregator** — multi-hop slippage across program boundaries (DC-8 cross-class compound)
- **Any DEX with multi-pool batch execution** — protocol-side and EOA-side router contracts

**Audit-time check (proposed):**

1. For every multi-step swap function (`swapExactTokensForTokens`, `batchSwap`, `multiHop`, `route`), identify all per-hop input/output variables
2. For each hop boundary, ask: is the same value used in TWO semantically-distinct slippage / amount checks?
   - Hop N's `amountOut` used as Hop N+1's `amountIn`: legitimate
   - Hop N's `amountOut` used as cumulative-route `totalAmountOut` tally: legitimate
   - Hop N's `amountOut` used in BOTH WITHOUT a boundary validation that catches the asymmetry: CANDIDATE-O hit
3. Special focus on: aggregator routers where caller-supplied pool list controls hop sequence (attacker can engineer the route)
4. Cross-check: do pools verify their inputs/outputs match attestations from the router? Or do they trust the router-supplied values?

**Productization signal:** MEDIUM-HIGH. Pattern is AST-graph-friendly (variable taint across function-boundary). Detector spec: `slippage-double-count-swap-router`. FP rate moderate; gate via "variable used in 2+ semantically-distinct slippage / accounting paths" qualifier.

**Sibling classes:**

- DC-7 (Validating-Field ≠ Consuming-Field): single-function field-binding asymmetry; CANDIDATE-O is multi-function/multi-step variant
- CANDIDATE-E (Rust rounding-asymmetry): arithmetic-direction error within a single function; CANDIDATE-O is composition-error across functions
- CANDIDATE-L (Consensus-Bucket-Key-Asymmetry): aggregation-key mismatch in consensus; CANDIDATE-O is value-reuse mismatch in DEX state-machine

**Worked-example artifact path:** `/home/claude-code/buzz-workspace/brain/Ground-Truth-Exploits.md` Rhea Finance entry (filed 2026-05-22).

**Economic substrate (added 2026-05-24 via Morpho Blue flash-loan-volume-washing intake, msg 7639):**

CANDIDATE-O exploitation in the wild is gated on producing the illusion of organic volume / organic counterparty diversity for the oracle / liquidation / volume-gated consumer to accept the attacker-manipulated price. **Flash-loan-driven self-trading is the canonical economic substrate that produces this illusion at zero net capital.**

Canonical composite template:
```
1. Open flash loan from Morpho Blue / Aave V3 / Balancer / Uniswap V4 flash account (capital substrate, atomic)
2. Distribute flash-loan proceeds across N attacker-controlled wallets
3. Execute self-trades across M AMM venues (or M markets within one AMM)
   → produces organic-looking volume metric
   → pushes oracle TWAP / pricing input in attacker-favored direction
4. Trigger downstream consumer that reads the manipulated metric:
   - lending LTV recompute → liquidate adversary positions
   - options settlement → forced settlement at attacker price
   - rewards-eligibility gate → claim disproportionate rewards
   - mint-redeem peg arbitrage → drain reserve pool
5. Reverse the self-trades to recover most of the flash loan principal
6. Repay flash loan + fee in same tx
   → net profit = downstream drain − flash-loan fee
```

Ground-truth instance: Morpho Blue $54.5M flash loan → 7 wallets → self-trade across 7 Limitless AMM markets → 87 transfers → one block, zero net capital (2026-05-24, @TheNotoriousSKi + @TruebieMarkets via msg 7639).

**Implication for Buzz detector pack:** every Gate 1 surface map on a lending / options / oracle-consuming protocol must include the explicit question — "what's the volume-organicity gate (counterparty diversity, time-spread, source-restriction) on the oracle / pricing input the protocol consumes, AND can a flash-loan-self-trade defeat it?" Many DEX-fed oracles have NO such gate; those are direct CANDIDATE-O composition targets.

**Sibling-class economic substrate** — same flash-loan-self-trade substrate composes with:
- DC-7 (Validating-Field ≠ Consuming-Field): when the validating field is "volume > threshold" and the consuming field is "TWAP price input" — flash-loan-self-trade satisfies the volume gate without organic counterparty
- CANDIDATE-J (state-machine cooldown overwrite): flash-loan-self-trade can satisfy state-machine progression gates that assume natural trade pacing
- DC-9 sub-4 (state-not-invalidated repeated-mint): flash-loan-self-trade composes with stale-state assumptions for atomic-window exploitation

**Audit-time add-on check (proposed):**

5. For every oracle consumer / liquidation engine / volume-gated rewards path, identify the volume-organicity gate. If none exists, mark as CANDIDATE-O composition target. Productize as `oracle-volume-organicity-gate-missing` detector.

---

### CANDIDATE-P: Durable-Nonce Pre-Signed Transaction Accumulation (Drift Protocol, 2026-04-01, $285M)

**Class statement:**

> A multi-signer authorization scheme (Solana multisig, EVM Safe with off-chain UI, threshold-signature wallet) uses durable nonces (Solana `DurableNonce`) or off-chain signature aggregation where the underlying nonce does NOT auto-expire. An attacker (over weeks to months) social-engineers individual signers into approving small, individually-benign-looking transaction shells that are PRE-SIGNED but not yet broadcast. Because durable nonces don't time out the way regular sequence-bounded nonces do, the attacker accumulates a stockpile of signed-but-not-broadcast authorization payloads. Once the quorum threshold is reached, the attacker broadcasts ALL payloads in a single window — quorum is already satisfied at the moment of broadcast, so on-chain logic has no opportunity to detect or block. The on-chain code never sees an "untrusted caller" — every signature is genuine. The exploit happens at the temporal-authorization layer that the code does not defend.

**Specialization of:** Code-Audit-Necessary-But-Not-Sufficient. The smart contracts may be flawless; the operational-security envelope around them is the attack surface. CANDIDATE-N (no-timelock) is the code-side complement: timelocks turn "executed instantly" into "queued for community detection." Pair with CANDIDATE-P-style signature-accumulation attacks, timelocks become the LAST line of defense when humans fail.

**Anchor (CONFIRMED via 0xTeam analysis, 2026-05-22 brain intake — Ogie msg 7512):** Drift Protocol, Solana, **2026-04-01**, **$285M drained in 12 minutes**. DPRK nation-state operation. **6-month social engineering window (Oct 2025 – Mar 2026)** culminating in **3-week signature-accumulation phase Mar 11 – Mar 31** during which attackers tricked individual multisig signers into pre-signing hidden authorization transactions over durable nonces. April 1 → all accumulated transactions broadcast within a 12-minute window. Combined with **CANDIDATE-N zero-timelock migration** (no community-visible queue period) → drain completed before any defender could react.

> Key quote (operator msg 7512, for brain): **"The attackers never touched the smart contract. They built trust. Collected signatures. Then struck."**
>
> = Code audits necessary but NOT sufficient.
> = Timelocks are the last defense when humans fail.

**Status:** 1 worked example confirmed (Drift Protocol). Operational-security pattern, NOT pure code vulnerability — but defense IS code-controllable via timelock, nonce-expiry, signature-count monitoring, durable-nonce-replay guards.

**Audit-time check (proposed):**

1. For every multisig / threshold-signature / off-chain-signed authorization scheme on the target:
   - Identify the nonce mechanism. Does it use durable nonces (Solana) / counter nonces without expiry / time-bounded nonces?
   - Does the on-chain verifier check `block.timestamp <= signature.deadline`? If absent, signatures can accumulate indefinitely.
2. For every privileged-action handler reachable from a multisig:
   - Is there a timelock between quorum-reached and execution? (CANDIDATE-N intersection)
   - Is there a per-signer signature-velocity monitor on-chain? (e.g., "no signer can authorize >N actions per epoch")
   - Is there a multi-action-atomic-broadcast detector? (e.g., "if >K queued authorizations broadcast within one block, defer all to community quorum")
3. Flag: any privileged action where quorum-reached → execute is instant AND nonce mechanism doesn't expire.

**Defense codifications:**

- **Nonce expiry**: every signature SHALL include `deadline` field bound to current block time + small window; verifier rejects expired
- **Per-signer velocity cap**: track per-signer signature counts per epoch on-chain; reject if signer over cap
- **Quorum-then-timelock**: even with quorum, queue with a community-visible delay
- **Durable-nonce-replay guard**: on Solana, each multisig action SHALL bind the durable nonce to a fresh authorization-purpose hash (not reusable across actions)

**Productization signal:** MEDIUM. Pattern is more architectural-review than line-grep, BUT the defenses are line-detectable: missing-deadline-binding on multisig signature verifiers + no-per-signer-velocity-tracking + no-timelock-after-quorum are all greppable.

**Cross-pollination scan targets:**

- Every protocol with a multisig admin (most are Gnosis Safe; the Safe contracts themselves are well-audited but the protocol's interaction layer may not enforce deadlines)
- Solana programs with `DurableNonce` accounts (audit for purpose-binding)
- Bridge protocols with off-chain validator signature aggregation (Wormhole, LayerZero, Axelar, Across, deBridge)
- Threshold-signature wallets (FireBlocks, Coinbase MPC, Safe{Wallet}'s MultisigSig)
- Pair with CANDIDATE-N scan: every privileged-action handler downstream of multisig → if zero-timelock AND durable-nonce-based authorization → CANDIDATE-P + CANDIDATE-N compound CRITICAL.

**Sibling classes:**

- CANDIDATE-N (no-timelock): code-side defense; CANDIDATE-P is the attack that exploits CANDIDATE-N's absence
- DC-5 (signature replay): single-signature reuse across chains/contracts; CANDIDATE-P is signature-stockpiling under non-expiring nonces

**Worked-example artifact path:** `/home/claude-code/buzz-workspace/brain/Ground-Truth-Exploits.md` Drift Protocol entry (to be filed 2026-05-22).

---

### CANDIDATE-Q: Permissionless TOTP/Digest Grow-Only Allowlist (Cap Protocol 2026-05-25, sub-pattern of DC-5 signature replay)

**Class statement:**

> When a contract maintains a per-key allowlist that authorizes downstream signature/digest verification (EIP-1271, EIP-712, custom replay-protection scheme) AND the allowlist-mutation entry-point is permissionless OR weakly-gated AND no expiry-prune mechanism reclaims old entries, the mapping grows monotonically. The attack surface compounds linearly with time: every new TOTP/digest advance widens the set of digests that pass signature verification, and stale digests retain authority indefinitely. [INSPECTED]

**Specialization of:** DC-5 (signature replay family). Sibling to CANDIDATE-P (Drift durable-nonce pre-signed-tx). DC-5 covers single-signature reuse across chains; CANDIDATE-P covers nonce-stockpiling under non-expiring nonces; CANDIDATE-Q covers allowlist-stockpiling under no-expiry pruning. All three exploit the timing asymmetry between authorization-grant and authorization-revoke.

**Anchor (CANDIDATE — Cap Sherlock Gate 1 post-audit drift, 2026-05-25):** Cap Protocol EigenOperator.sol:105-111 `advanceTotp(uint256 newTotp)` — permissionless function writes `validTotps[newTotp] = true`, no expiry, no prune, no cap on map size. Combined with EIP-1271 `isValidSignature` consumption pattern downstream, the allowlist becomes a grow-only digest registry. Status: CANDIDATE_TRACKED — added to brain on Cap Sherlock Gate 1 outcome (Ogie msg 7772, 2026-05-25). Cap contest #990 FINISHED 2025-07-24; no submission path; brain-compound only. [INSPECTED]

**Audit-time check (proposed):**

1. Grep for `mapping(... => bool) public validTotps`, `validDigests`, `validNonces`, `usedNonces` (the standard nonce-allowlist patterns)
2. Find the write-site that flips `mapping[key] = true`
3. Check the function's visibility + modifiers — is it permissionless? Role-gated? Time-gated?
4. Check for an expiry-prune function (`pruneStaleTotps`, `expireBefore(uint256 blockNumber)`, etc.)
5. If no prune AND permissionless write AND downstream signature consumer → CANDIDATE-Q [INSPECTED]
6. Sub-rule: even with role-gating, if the role is held by a single multisig with no key-rotation cadence, the class still applies (timing-asymmetry remains)

**Promotion path:** 2 additional worked anchors needed (likely targets: any EIP-1271-heavy protocol with off-chain signer rotation — Safe modules, Argent, Privy, account-abstraction account contracts). Cross-pollination with CANDIDATE-P during next Gate 1 dispatch on a signature-replay-substrate target.

**Cross-pollination targets:**

- ERC-4337 account contracts with custom validation logic
- Smart-contract wallets with EIP-1271 signature consumption
- Cross-chain bridge attestation gossip layers (DC-10 + CANDIDATE-Q intersection)
- LayerZero / Wormhole VAA verification (if the verifier has a permissionless TOTP advance pattern)

---

### CANDIDATE-R: Pre-Rotation Deploy-Bootstrap Window (Stacks sBTC 2026-05-26, NEW)

**Class statement:**

> Multi-stage protocol deployments where the initial admin / signer / governance / `current-signer-principal` value defaults to the deploying EOA at constructor / `(define-data-var ... tx-sender)` time, with the intent that a "first rotation" transaction immediately replaces it with the production multisig / timelock / contract. The TEMPORAL WINDOW between deploy + first-rotation = full-admin compromise window for the deployer key. Defense IS atomic-deploy-and-rotate (constructor-equivalent rotation in the same tx) OR compile-time-set immutable signer.

**Promotion path:** 2 additional worked anchors needed (likely targets: any multi-stage Solana Anchor deployment with `set_authority` post-deploy, any Solidity OpenZeppelin Ownable-then-transferOwnership pattern, any Cosmos governance-pallet bootstrap). Currently single-anchor (Stacks sBTC).

**Anchor (Stacks sBTC, 2026-05-26):** `current-signer-principal` init = `tx-sender` at deploy time (`sbtc-registry.clar:18`). Intent is rotate-keys-immediately-after-deploy via multisig. Window exists between deploy block + rotate-keys tx confirmation. During that window, the deploying EOA is the protocol-admin equivalent of full multisig authority. Attack surface = compromise of the deployer EOA OR adversarial reordering of the deploy + rotate tx pair via miner/sequencer collusion. [INSPECTED] hunt `hunts/2026-05-26-stacks-immunefi-gate1.md` proposal P2.

**Examples to seed (cross-substrate):**
- Stacks sBTC: deploy → rotate-keys → multisig active
- Generic Solidity OZ Ownable: deploy → transferOwnership(timelock) → renounceOwnership
- Solana Anchor: deploy → set_authority → freeze_authority (mint authority, upgrade authority)
- Cosmos SDK genesis bootstrap: validator-set deploys with single-validator threshold, then governance proposal expands set

**Defense:** atomic deploy + rotate (constructor-equivalent), or compile-time-set immutable signer-principal. Defense-in-depth: deploy via factory contract that performs rotation atomically; never expose the deployer-keyed window.

**Audit-time check:**

1. Find the protocol's signer/admin/governance field initialization site
2. If init = `tx-sender` / `msg.sender` / `payer` / `deployer-keyed-default`, check whether rotation is enforced atomically in the same tx
3. If rotation is a separate tx (deploy then rotate-later), the bootstrap window EXISTS — file CANDIDATE-R
4. Severity calibration: bounty programs typically discount post-deploy admin-compromise as "operational", but during the bootstrap window the protocol IS structurally undefended — file as Medium/High depending on TVL exposure during window

**Cross-pollination targets:**

- Any Solana Anchor protocol with `set_authority` post-deploy
- Any Solidity OZ Ownable / Ownable2Step with separate transferOwnership tx
- Any Stacks Clarity protocol with `(define-data-var ... tx-sender)` admin init
- Any Cosmos genesis-bootstrap chain with governance-expansion post-launch

**Source.** Hunt `hunts/2026-05-26-stacks-immunefi-gate1.md` Gate 1 proposal P2. Filed 2026-05-26 as CANDIDATE-R (Note: hunt-file proposal originally named "CANDIDATE-Q" but renamed to CANDIDATE-R to avoid collision with existing CANDIDATE-Q Cap Protocol TOTP allowlist; both classes structurally distinct.). Authority: Ogie msg 7817 batch.

---

### DC-10: Cross-Chain Message Binding Failure (PROMOTED 2026-05-23, Ogie msg 7589)

> **Promotion event:** CANDIDATE-A reached 3 worked-example anchors with $600M+ combined exposure on 2026-05-23 (Kelp DAO $292M filed via Ethereal News Weekly #20 intake completes the 3rd anchor); operator (Ogie msg 7589) promoted to DC-10, joining DC-9 as the newest battle-tested class. DC-10 must be added to: `defense-class-mapping.json` propagation engine (next version bump), all future cross-chain Gate 1 lens stacks, and Standing Intake Protocol Step 2 brain-overlap check for any bridge / OFT / cross-domain target.

**Class statement (DC-10):**

> A cross-chain message — guardian attestation, DVN proof, validator-quorum signature, off-chain relayed event, oracle update — is consumed by a destination chain WITHOUT binding the message to the FULL outcome it triggers. Binding gaps include: missing chainId in the signed payload, missing destination-contract address, missing nonce-or-deadline scope, missing source-of-truth identifier (vault/market/asset id), or single-DVN configuration where the trust-anchor is itself a single point of failure delegated by the consumer. When any one binding is absent, the message can be replayed across destinations (chain-A signature reused on chain-B), substituted at the consumer level (DVN compromised → forge any message), or rebound at intermediate routing layers. The drain follows: forged message → consumer accepts → bridge/vault/OFT issues unbacked tokens or releases custodied funds.

**3 worked-example anchors (collective $600M+ exposure):**

| #   | Protocol          | Date       | $ Drained | Sub-pattern                                        | Source                        |
| --- | ----------------- | ---------- | --------- | -------------------------------------------------- | ----------------------------- |
| 1   | Wormhole          | 2022-02-02 | $325M     | Guardian signature scope omitted destination-bind  | Wormhole / SignatureProvider  |
| 2   | Nomad             | 2022-08-01 | $190M     | Default-trust enumeration on Merkle root           | Nomad / default-trust-enum    |
| 3   | Kelp DAO rsETH    | 2026-04-18 | $292M     | Single-DVN trust-anchor compromise (LZ V2 consumer)| Ethereal News Weekly #20      |

**Sub-pattern enumeration (each anchored above):**

1. **Default-trust enumeration** (Nomad) — destination consumer treats `0` or "uninitialized" root as a valid bypass
2. **Guardian-signature scope omission** (Wormhole) — signed payload missing destination chainId/contract address, allowing cross-bridge replay
3. **Single-DVN trust-anchor compromise** (Kelp DAO) — consumer of a multi-DVN-capable platform configures only one DVN; DVN compromise = forged message; downstream RPC quorum compromised in same incident

**Detector coverage (current shipped):**

- `default-trust-enum` v1.0 (anchored Nomad family — DC-10 sub-pattern 1)
- DC-10 sub-pattern 2 (signature-scope omission) — has propagation regex in Pattern B; explicit detector pending
- DC-10 sub-pattern 3 (single-DVN trust-anchor) — has propagation regex in Pattern H; explicit detector pending (proposed: `single-dvn-config-detector` + `multi-rpc-quorum-completeness-check`)

**Historical note:** Pre-promotion this class was tracked as CANDIDATE-A (Cross-Chain Bridge Anchor, anchors #1 + #2 from 2022; anchor #3 landed 2026-04-18 and was filed 2026-05-23 via Ethereal News intake). Companion Doctrine #29 (added same operator-batch msg 7589): the LayerZero V2 Gate 1 KILL of 2026-05-22 demonstrated that audit-saturation foreclosure on the PLATFORM does NOT foreclose the CLASS — the class transferred to the LayerZero V2 CONSUMER (Kelp DAO's single-DVN config) that was less audit-saturated than the platform.

---

### DC-11: ERC4626 Share Inflation / Wrapper-Accounting Mitigation Absence (PROMOTED 2026-05-24, Ogie msg 7695)

> **Promotion event:** Promoted from CANDIDATE-I on 2026-05-24 after Clara Ground-Truth bulk intake surfaced **~28 adjacent anchors** (vastly exceeding the DC-9 promotion bar of 4 anchors + $320M). Combined Clara exposure $50M+ in named anchors, with Compound v2 cToken inflation as canonical historical anchor. Operator decision: msg 7695 (2026-05-24 21:49Z).

**Class statement (DC-11):**

> An ERC4626-compatible vault, lending-market token (cToken / aToken-class), LP wrapper, or share-accounting contract derives share-asset conversion from `IERC20(asset).balanceOf(address(this))` or `totalAssets()` reading raw balances — WITHOUT the OpenZeppelin v4.9+ virtual-shares mitigation (`_decimalsOffset() > 0`), dead-shares pre-mint, donation-resistant first-deposit floor, OR rate-accumulator decoupling. First depositor (or attacker via flash-loan + small-deposit) inflates the share-price by donating raw asset, causing subsequent depositors to round their share-grant to zero and lose principal. Inverse direction: attacker drains LP via dust-share withdraw against inflated `totalAssets`. DC-7 sibling: validation property (share-mint check) ≠ consumption property (cached `balanceOf` for accounting) across deposit→accounting boundary.

**Sub-pattern enumeration (each anchored above):**

1. **virtual-shares-absence** — contract pre-dates OZ ERC4626 v4.9 with `_decimalsOffset()` mitigation
2. **dead-shares-absence** — no first-deposit mint to address(0) / DEAD address
3. **decimals-offset-zero** — `_decimalsOffset()` exists but returns 0 (no inflation buffer)
4. **donateAndLiq compound** — donate raw asset → flash-borrow → liquidate → extract via wrapper

**Anchor incidents (Clara + brain):**
- Compound v2 cToken (canonical historical anchor — class-defining)
- ~28 Clara anchors across Yearn-class vault wrappers, AMM LP wrappers, RWA tokenization vaults (per Clara intake §3 cumulative count)
- Combined Clara USD: $50M+ named exposure

**Detector coverage (current shipped):**

- OZ `_decimalsOffset()` grep + dead-shares grep (Day 17 Sky-family sweep heuristic, ready for L1b productization)
- META-DOCTRINE Two-Axis Donation-Channel Test (above) routes to DC-11 deep-check on the DANGEROUS-axis cell (user-fungible-share × balanceOf-for-accounting)

**Cross-pollination scan targets (active):** 30-target Immunefi watchlist + Etherscan-verified-bytecode grep method. Lido + Renzo + Yearn V3 already in scope per Watchlist-Candidate-Crossmap.md.

**Historical note:** Pre-promotion tracked as CANDIDATE-I (ERC4626-Wrappers-Using-balanceOf-Without-Virtual-Shares-Mitigation, Day 17 Sky-family sweep, 2026-05-16, proposed). Clara intake validated promotion with overshoot anchor count.

---

### DC-12: Oracle / Slippage Manipulation Across Pricing Pipelines (PROMOTED 2026-05-24, Ogie msg 7695)

> **Promotion event:** Promoted from CANDIDATE-O on 2026-05-24. Clara Ground-Truth bulk intake surfaced **~60 anchors** (the highest-frequency class in the entire Clara corpus, ~15% of all incidents) with $80M+ named Clara USD and $98M+ inclusive of PancakeBunny + Elephant historical anchors. Operator decision: msg 7695 (2026-05-24 21:49Z). DC-12 is the highest-EV class in the active catalog.

**Class statement (DC-12):**

> A multi-step swap, lending liquidation, redemption, or share-conversion pipeline consumes a price from an oracle source (spot-AMM, single-DEX-pool, Chainlink feed without staleness check, internal reserve computation) that is independently manipulable from the consumer's defense surface. The consumer's slippage / liquidation / fairness check is performed against the manipulated price, satisfying the local validation while the cross-pipeline outcome (cumulative slippage across hops, liquidation threshold across collateral types, redemption price across vault assets) is unbounded. Specializations: read-only reentrancy on price oracles, flash-loan-volume-washing past organicity gates, cross-pool mispricing under low-liquidity-window attacks, TWAP-window-absence on volatile assets, missing circuit-breaker on Chainlink staleness.

**Sub-pattern enumeration (each anchored above):**

1. **spot-oracle-no-TWAP** — consumer reads single-pool spot price; no time-weighted smoothing window
2. **volume-organicity-gate-missing** — pricing weight derived from rolling volume; no per-block volume cap or wash-trading suppressor
3. **cross-pool-mispricing** — same asset priced differently across pools used in same pipeline; attacker engineers route through mispriced pool
4. **read-only-reentrancy-on-oracle** — oracle read happens mid-callback when reserves are temporarily wrong-state (Curve / Balancer V2-class)
5. **slippage-double-count-across-swap-steps** (Rhea-class) — per-step slippage check reuses carry-value semantically; cumulative protection unbounded
6. **cross-chain-staleness-asymmetry** (Pendle-class, filed 2026-05-25, Ogie msg 7733) — consumer chain reads price/exchange-rate posted via cross-chain message (LayerZero, Wormhole, Hyperlane, Axelar, custom bridge). The update path is monotonic OR write-only — there is NO per-read `block.timestamp - last_updated < max_age` floor enforced at the read site. Cross-chain message delays (1-30 min for honest delivery, hours under network congestion / bridge halts / DDoS) let stale rates persist on consumer chain. Distinct from sub-1 (spot-no-TWAP is on-chain spot read; sub-6 is cross-chain message staleness with no time-decay defense). Anchor: PendleExchangeRateOracleApp `getExchangeRate()` lacks max-age floor on consumer chain; `_updateExchangeRate()` is monotonic but only fires on cross-chain message arrival — no fallback if messages stall. (Pendle V2 Gate 1 task #61 v1.1 re-dispatch, R8 [INSPECTED])
7. **wrapper-strips-staleness-from-feed** (filed 2026-05-25 from 3-way DC-12 sub-6 propagation hunt, Ogie msg 7741) — the wrapper layer (interface contract, adapter implementation, custom oracle) strips the staleness signal between an upstream source that carries it and a downstream consumer that expects it. Three observed flavors, all canonical:
   - **7a (interface-level strip):** the wrapper's solidity interface returns only `(uint256)` — staleness CANNOT be carried regardless of implementation. Canonical: Pendle `IPExchangeRateOracle` (cross-protocol cross-pollination anchor for sub-6).
   - **7b (API-choice strip):** wrapper consumes the upstream's `latestAnswer() returns (int256)` instead of `latestRoundData() returns (roundId, answer, startedAt, updatedAt, answeredInRound)`. The `updatedAt` field exists upstream but is never read. Canonical: bgd-labs `aave-capo/PendlePriceCapAdapter.sol` + family (RETH / EzETH / cbETH adapters). Trail of Bits 2022 publicly flagged this choice on Aave V3; Aave explicitly retained across 30 subsequent audits = Doctrine #23 architectural foreclosure on AAVE specifically, but the class transfers per Doctrine #29 to other Chainlink consumers without Aave-tier audit-saturation.
   - **7c (hardcoded-value strip):** wrapper exposes a staleness-capable API (e.g., Chainlink `latestRoundData()` with `updatedAt` field) but HARDCODES the staleness value to `0`, `block.timestamp`, or a constant — semantically lying about freshness while structurally appearing defended. Canonical: Spectra `BaseOracle.sol` returns `updatedAt = 0` (live-compute via Curve `price_oracle()` per-call defers to Curve TWAP; design-intent documented but downstream is undefended on naive interpretation).
   - **7d (post-destructure staleness loss)** (added 2026-05-25 from Inverse + Notional cycle 2 Gate 1s, Ogie msg 7750 P1) — consumer calls `latestRoundData()` API correctly but DESTRUCTURES the tuple and discards the `updatedAt` field at the call site. The upstream feed carries staleness; the wrapper extracts but discards. Two flavors observed:
     - **positional-drop:** `(,int256 price,,,) = feeds[token].feed.latestRoundData()` — all-positional destructure with empty slot for `updatedAt`. Anchor: Inverse FiRM `Oracle.sol:159` (Code4rena Oct 2022 M-17 flagged exact pattern; sponsor "fixed" via commit `f53087d` Dec 2022 which migrated API but kept destructure-drop — **the audited fix was cosmetic**). Distinct case of Doctrine #23 (architectural foreclosure WITH cosmetic-fix-history is even harder to re-pursue).
     - **comment-marked-drop:** `(_, answer, _, /* updatedAt */, _) = feed.latestRoundData()` — explicit comment marks the discarded field, signaling deliberate choice. Anchor: Notional V3 Exponent `ChainlinkUSDOracle.sol:41-44` (quote-feed updatedAt silently destructured; only base-feed staleness defended upstream).
   - **7e (engineered staleness mask)** (added 2026-05-25 from Notional V3 Gate 1, Ogie msg 7750 P2) — wrapper actively OVERWRITES the upstream `updatedAt` with a FRESHER value from a different source — semantically lying about freshness while structurally appearing defended. Distinct from 7c (hardcoded constant) in that 7e uses a live fresh-source. Distinct from 7d (passive destructure-drop) in that 7e actively writes a fake-fresh value. Canonical: Notional V3 Exponent `MidasOracle.sol:48-50` — wrapper masks mToken's true `updatedAt` with fresh Chainlink base feed `updatedAt` for first 7 days of staleness. Direct LLTV consumer pathway: `IYieldStrategy.price()` → `convertToAssets` → `TRADING_MODULE.getOraclePrice` → `MorphoLendingRouter.sol:463 collateralValue × m.lltv`. 0-7d mToken NAV drift flows directly into borrow/liquidation math. Detector signature: `if (... updatedAt < ...) updatedAt = freshTimestamp` OR `updatedAt = max(stale_a, fresh_b)` patterns.
   - **7f (PriceOracleProxy-class wrapper strips staleness from v1 oracle)** (added 2026-05-26 from JustLend Gate 1, hunt `hunts/2026-05-26-justlend-immunefi-gate1.md` proposal #1) — Compound-V2-fork `PriceOracleProxy` contracts that read from EOA-pushed `v1PriceOracle` without ANY staleness check whatsoever. The wrapper is structurally a passthrough: it inherits the v1 oracle's raw price and exposes it to `Comptroller.getAccountLiquidity` without `updatedAt` / staleness-buffer / circuit-breaker. Distinct from 7a (interface returns only `(uint256)`) in that 7f wrappers DO have access to richer upstream metadata via cToken admin push but discard it at the wrapper layer. Anchor: JustLend `PriceOracleProxy` reads from JustLend Foundation EOA-pushed v1 oracle — admin-pushed prices with NO on-chain staleness verification. **Class:** index all Compound-V2-fork `PriceOracleProxy` contracts that read from EOA-pushed v1PriceOracle without staleness checks. There are many forks: Cream, Hundred, Iron Bank pre-Chainlink, dozens of long-tail Compound-V2 forks across L2s. **Paired anchor:** Notional V3 MidasOracle (DISC-019, sub-7e) — both are wrapper-strips-staleness patterns; 7e is engineered mask, 7f is structural absence. Common origin: protocols inheriting Compound V2's `PriceOracleProxy` pattern without retrofit. **Productization target:** AST-grep for `contract PriceOracleProxy` + `setUnderlyingPrice` or `setDirectPrice` admin entrypoint + downstream consumer never reading `updatedAt`. NOTE: Immunefi typically excludes "mispricing without active manipulation" from scope — this class is more useful for cross-protocol detector seeding than direct bounty submission.
   - Distinct from sub-6 (cross-chain message-receiver staleness) — sub-7 is on-chain wrapper-layer staleness-strip independent of cross-chain message-passing. Could compose with sub-6 if the cross-chain receiver IS the staleness-stripping wrapper.
   - **7h (Deterministic-Upstream-No-Staleness-State, STRUCTURAL-FORECLOSED-CLASS)** (added 2026-05-27 from Lista DAO Moolah PT oracle Gate 2 NEGATE, foreclosure receipt `hunts/2026-05-27-lista-dao-gate2-foreclosure.md`) — Consumer wrapper destructures `(, int256 answer, , , ) = upstream.latestRoundData()` discarding `updatedAt`, but the UPSTREAM SOURCE is a deterministic on-chain formula (NOT a Chainlink-style push-feed). The upstream returns `updatedAt = 0` by design because there is no external state to track freshness against — the answer is recomputed every call from `block.timestamp` and immutable storage. **Distinct from 7c (hardcoded-value strip)** in that 7c describes the wrapper hardcoding the staleness output to lie; 7h describes the wrapper correctly destructuring an upstream that LEGITIMATELY has no staleness state. **Distinct from 7d (post-destructure staleness loss)** in that 7d describes a consumer dropping a stale-able field from a stale-able source; 7h describes a consumer dropping a non-stale-able field from a deterministic source — adding a staleness check would PERMANENTLY BREAK the oracle. **Anchor — STRUCTURAL-FORECLOSED:** Lista DAO `PTLinearDiscountOracle.sol:56` + `PTLinearDiscountMarketOracle.sol:83` — both consume Pendle `PendleSparkLinearDiscountOracle.latestRoundData()` which returns `(0, int256(ONE - discount), 0, 0, 0)` where `discount = (timeLeft * baseDiscountPerYear) / SECONDS_PER_YEAR` and `timeLeft = maturity > block.timestamp ? maturity - block.timestamp : 0`. Pure on-chain math, no external feed, no stale-state. Lista's PT oracle correctly does NOT add a staleness check; doing so would brick the oracle. **Sub-rule 34.1 of Doctrine #34 codifies this as a Gate 1 → Gate 2 dispatch protocol step: classify upstream source as CLASS A (stale-able feed) / CLASS B (deterministic on-chain formula) / CLASS C (hybrid) before promoting DC-12 lens-hits to Gate 2.** **Cross-pollination targets (CLASS B candidates likely to false-positive on DC-12 sub-7h):** any PT (principal token) oracle adapter (Pendle, Spark, Element, etc.); bond-style discount oracles (zero-coupon adapters); pure-vAMM / TWAP-only oracles with no external source; custom maturity-curve adapters (option/future pricers); Convex/Yearn share-price adapters computing from on-chain LP state alone. Productization target: AST-grep for `.latestRoundData()` consumers that DESTRUCTURE-DROP `updatedAt` AND check whether upstream source class is CLASS B (deterministic). NEGATE the DC-12 finding when upstream is CLASS B.
   - **7g (LST-PoR-feed-no-staleness, DEDUP-FORECLOSED-CLASS)** (added 2026-05-27 from Stader ETHx Gate 2 dispatch foreclosure) — Liquid Staking Token (LST) contracts that integrate Chainlink Proof-of-Reserve feeds for exchange-rate updates and discard `updatedAt` + `answeredInRound` from `latestRoundData()`. **Distinct from 7b (API-choice strip)** in that the LST wrapper DOES call `latestRoundData()` (correct API choice) but ignores the staleness fields at the consumer site. **Anchor — DEDUP-FORECLOSED:** Stader `StaderOracle.getPORFeedData` (lines 737-743 HEAD `9d4a921`) reads `ETHBalancePORFeedProxy.latestRoundData()` + `ETHXSupplyPORFeedProxy.latestRoundData()` and uses only the answer. **Public-audit dedup status:** Code4rena 2023-06-stader M-14 + Halborn V2 HAL-09 + C4 Issue #15 (primary) + #153 (dup-of-15) all flag this exact bug VALID with recommended fix. **Cross-protocol propagation hypothesis:** other LST protocols integrating Chainlink PoR (e.g., Coinbase cbETH PoR, Frax PoR-attested sfrxETH, RocketPool PoR pipeline if added) MAY exhibit the same pattern but with different audit-coverage status. Dedup-foreclosed on Stader itself; Productization target: AST-grep `*PORFeed*.latestRoundData()` consumer sites + check for `updatedAt` flow-through across the LST-only subclass.
   - **Meta-doctrine corollary (from Stader 7g foreclosure):** Targets with ≥3 reputable audit firms + HEAD-stale >3 months collapse paste-ready EV on the audited surface toward zero — even when the vulnerability class is confirmed present. Phase 0 audit-dedup is the canonical gate that saves Foundry-PoC build cycles. (Proposed Standing-Intake-Protocol Step 3 EV multiplier: 0.25× when ≥3 firms + HEAD-stale.)

**Anchor incidents (Clara + brain):**
- Rhea Finance 2026-04-16 **$18.4M** (NEAR; 0xTeam analysis — canonical Buzz anchor, sub-5)
- PancakeBunny 2021-05-19 **$43.5M** (Clara — canonical historical anchor, sub-1)
- Cream Finance 2021-10-27 **$4.4M** (Clara — sub-1 cross-pool)
- Elephant Money 2022-04-12 **$11.4M** (Clara — sub-3 cross-pool mispricing)
- Sharwa 2024-XX-XX (Buzz brain CANDIDATE-O original anchor — sub-2 volume-organicity)
- Morpho Blue flash-loan-volume-washing template (Ground-Truth v1.7 — sub-2 substrate)
- ~55 additional Clara anchors across oracle / slippage / read-only-reentrancy class (per Clara intake §3 cumulative count)
- Combined Clara USD: $80M+ named exposure (full inclusive ~$98M+ with brain anchors)

**Detector coverage (current shipped):**

- `oracle-volume-organicity` detector spec'd in brain Ground-Truth v1.7
- DC-12 sub-1 (spot-no-TWAP) — propagation regex; explicit detector pending
- DC-12 sub-4 (read-only-reentrancy) — partial coverage via Pattern D consumer-side checks
- DC-12 sub-6 (cross-chain-staleness-asymmetry) — propagation regex pending; detector spec: grep for `getExchangeRate` / `getPrice` / `latestAnswer` callers reading from cross-chain-message receiver contracts (LayerZero `lzReceive`, Wormhole `receivedMessage`, Hyperlane `handle`, Axelar `_execute`) without per-read `block.timestamp - last_updated < max_age` check at the read site
- DC-12 sub-7 (wrapper-strips-staleness-from-feed) — productizable detector spec: (a) grep for solidity interfaces returning only `(uint256)` when sibling protocols use Chainlink-style multi-return — sub-7a flavor; (b) grep for `.latestAnswer()` consumers WITHOUT a sibling `.latestRoundData()` call — sub-7b flavor; (c) grep for hardcoded `updatedAt = 0` / `updatedAt = block.timestamp` constants in oracle adapter implementations — sub-7c flavor; (d) AST destructure patterns dropping `updatedAt` (positional `(,price,,,)` or comment-marked `/* updatedAt */`) — sub-7d flavor; (e) `if (... updatedAt < ...) updatedAt = freshTimestamp` OR `updatedAt = max(stale_a, fresh_b)` patterns — sub-7e engineered-mask flavor. Cross-pollination targets (next sweep): Compound V3, Spark, Silo (skipped — $3K foreclosed), Sturdy (status unconfirmed), Frax Lend (payer-risk per Doctrine #27) — all Chainlink-consumer protocols. Productization value HIGH: every wrapper-class Chainlink-consumer protocol may surface sub-7b/d/e. Filed per Ogie msg 7741 (sub-7a/b/c) + msg 7750 (sub-7d/e from Inverse + Notional V3 cycle 2).

**Cross-pollination scan targets (active):** every protocol with Chainlink consumer + AMM consumer + lending market liquidator. Highest-EV next sweep cycle per Clara intake Observation A.

**Contrastive Anchor Pair — DC-12 sub-7 CLEAN baseline vs DIRTY canonical (filed 2026-05-25 — proposals E + H, Ogie msg 7770) [INSPECTED]:**

Future detector rotations need a Pareto-frontier reference for sub-7 (wrapper-strips-staleness-from-feed) to compare candidate code against both poles. Today's 2026-05-25 trio (Euler $7.5M Cantina + Reserve $10M Cantina + Notional V3 DISC-019 Immunefi) gives us a 2-anchor CLEAN baseline + 1-anchor DIRTY canonical:

**CLEAN canonical — "Euler+Reserve-CLEAN-baseline" 2-anchor Pareto frontier (proposal H, Ogie msg 7770):**

The CLEAN canonical reference is the JOINT 2-anchor Pareto frontier of Euler V2 oracle architecture AND Reserve `OracleLib`. Both implement the 5/5 sub-7 sub-rules, both surveyed at audit-saturation HIGH+/MAXIMUM tier, both produced FORECLOSURE-RECEIPT verdicts 2026-05-25. Future Gate 1s comparing wrapper structures against the CLEAN baseline should reference BOTH anchors:

**Anchor 1 — Euler V2 oracle architecture, 33-audit saturation ceiling (MAXIMUM tier):**

Euler V2 implements 8 oracle adapter families (Chainlink ×3 [BasePrice / OEV / Capped], Chronicle, Redstone, Pyth, UniswapV3 TWAP, RateProvider, Ondo, Pendle, Lido, CrossAdapter) — all 5/5 sub-7 sub-rules CLEAN across the full surface:

| Sub-rule | Euler implementation status |
| --- | --- |
| roundId mismatch defense (`require(answeredInRound >= roundId)`) | CLEAN — checked in every Chainlink adapter |
| staleness buffer (`block.timestamp - updatedAt <= maxStaleness`) | CLEAN — per-feed `maxStaleness` parameter, enforced uniformly |
| negative-price reject (`require(answer > 0)`) | CLEAN — checked, with adapter-specific upper-bound caps where appropriate |
| deprecated-aggregator detection (revert if aggregator returns sentinel) | CLEAN — Chronicle + Chainlink adapters both check |
| try/catch on feed call (graceful fallback) | CLEAN — Pendle + CrossAdapter both use try/catch with explicit fallback |

The CLEAN baseline anchors what a fully-defended sub-7 surface looks like: 8 adapter families × 5 sub-rules = 40 sub-rule checks across the production surface, all defended at audit-saturation 33 (MAXIMUM tier per Doctrine #27 F corollary). FORECLOSURE-RECEIPT at Gate 1 2026-05-25.

**Anchor 2 — Reserve `OracleLib`, 21-audit + 139-submission HIGH-J tier (proposal H second-anchor confirmation):**

Reserve protocol implements `OracleLib` (canonical Chainlink-consumer wrapper used by Reserve's RToken collateral / asset / RewardableLibP1 pricing pipelines). Manual sweep 2026-05-25 (Reserve $10M Cantina Gate 1 FORECLOSURE-RECEIPT, see Doctrine #32 v1.1.1 corollary anchor):

| Sub-rule | Reserve `OracleLib` implementation status |
| --- | --- |
| roundId mismatch defense (`require(answeredInRound >= roundId)`) | CLEAN — checked in `OracleLib.price(IChainlinkFeedRegistryLike, ...)` |
| staleness buffer (`block.timestamp - updatedAt <= timeout`) | CLEAN — per-feed `timeout` parameter, enforced uniformly across Reserve collateral types |
| negative-price reject (`require(answer > 0)`) | CLEAN — checked, with `_priceTimeout` revert path |
| deprecated-aggregator detection (revert if aggregator returns sentinel / stale) | CLEAN — `latestRoundData()` consumer pattern (NOT `latestAnswer()` — sub-7b structurally absent) |
| try/catch on feed call (graceful fallback) | CLEAN — try/catch with explicit `errorOnPriceTimeout` policy parameter |

**Why two anchors define the Pareto frontier (rather than one):**

Single-anchor baselines (Euler alone) ground the structural defense but don't distinguish between "Euler-specific implementation choices" and "structural defenses that generalize." Adding Reserve as the 2nd anchor (DIFFERENT firm cadence, DIFFERENT codebase lineage, DIFFERENT consumer use case — RToken collateral vs Euler vault collateral) validates that the 5 sub-rules ARE the structural defense pattern, not Euler-specific quirks.

Together Euler + Reserve form a 2-point Pareto frontier — any wrapper structurally matching BOTH is CLEAN; any wrapper missing any sub-rule that BOTH satisfy is potentially DIRTY. Future Gate 1s comparing against the CLEAN baseline should reference BOTH anchors and check whether candidate satisfies the 5 sub-rules in a manner consistent with BOTH implementations.

**Cross-protocol propagation targets (Euler+Reserve CLEAN baseline):**

Future sub-7 detector rotations targeting Compound V3, Spark, Sturdy, Frax Lend, Silo, Morpho, AAVE V3 oracle adapters, OpenEden tBTC oracle, Curve `StableSwap` oracle wrappers can use the Euler+Reserve 2-anchor reference to validate candidate wrapper-implementations. Match against BOTH anchors structurally:

1. Does the candidate consume `latestRoundData()` (NOT `latestAnswer()`)?
2. Does it check `answeredInRound >= roundId`?
3. Does it enforce a per-feed staleness buffer (>0)?
4. Does it reject `answer <= 0`?
5. Does it use try/catch with explicit fallback policy?

If 5/5 sub-rules satisfied in a manner consistent with BOTH anchors → FORECLOSURE-RECEIPT candidate. If <5/5 satisfied or implementation deviates from BOTH anchors in unsupported ways → STANDARD Skeptic verification.

**DIRTY canonical (Notional V3 Exponent MidasOracle, DISC-019 Immunefi #79837):**

Notional V3 Exponent `MidasOracle.sol:48-50` implements sub-7e engineered staleness mask:

```solidity
if (mTokenUpdatedAt < block.timestamp - 7 days) updatedAt = mTokenUpdatedAt;
else updatedAt = baseFeedUpdatedAt;  // mask mToken staleness with fresh Chainlink updatedAt
```

For 0-7 days of mToken staleness, the wrapper actively MASKS mToken's true `updatedAt` with the fresher Chainlink base-feed `updatedAt`. Downstream consumers (`IYieldStrategy.price()` → `convertToAssets` → `TRADING_MODULE.getOraclePrice` → `MorphoLendingRouter.sol:463 collateralValue × m.lltv`) see a fresh `updatedAt` even when the underlying mToken NAV is up to 7 days stale. CRITICAL — escalated by Notional triage in 16 minutes.

**Detector use of contrastive anchor pair:**

Future sub-7 detector rotations (cand-sub7 variants, Skeptic enrichment) should compare candidate wrapper-implementation against BOTH anchors:

- If candidate matches Euler's 5/5 CLEAN structure → auto-REJECT (FORECLOSED by structural defense, conf 1.0)
- If candidate matches Notional's mask pattern (`if (... updatedAt < ...) updatedAt = freshTimestamp` OR `updatedAt = max(stale_a, fresh_b)`) → auto-ACCEPT (CRITICAL substrate, conf 0.95+)
- If candidate matches neither pole → STANDARD Skeptic verification with both anchors loaded as prompt context

**Cross-protocol propagation targets (sub-7 widening, post-contrastive-pair):**

The Euler 8-adapter CLEAN baseline catalogs known-CLEAN structural patterns. Future Gate 1s comparing against Compound V3, Spark, Sturdy, Frax Lend, Silo, Morpho can use Euler's adapter-by-adapter coverage as the structural reference. Notional's DIRTY canonical anchors the detector signature: any wrapper that ACTIVELY OVERWRITES upstream `updatedAt` is a CRITICAL candidate.

**R8 tags:**

- `[INSPECTED]` Euler V2 oracle architecture 8-adapter CLEAN across 5 sub-rules (Cantina $7.5M Gate 1 2026-05-25, hunt file confirms manual sweep)
- `[INSPECTED]` Notional V3 Exponent MidasOracle sub-7e engineered-mask DIRTY (DISC-019 Immunefi #79837, ESCALATED 16 min triage 2026-05-25)
- `[ASSUMED]` Future detector rotations benefit from dual-anchor comparison (validation pending on next sub-7-class Gate 1)

**Source.** Euler Gate 1 + Notional V3 Gate 1 close 2026-05-25. Operator-approved msg 7770 proposal E.

**Historical note:** Pre-promotion tracked as CANDIDATE-O (Slippage Double-Count Across Swap Steps, Rhea Finance 2026-04-16). Clara intake widened the class from "slippage-double-count" sub-pattern to full Oracle/Slippage parent family with 5 sub-patterns. Highest-frequency class in DeFi exploit history.

#### Sub-class refinement — O-RAW vs O-WRAPPED (2026-05-24, Ogie msg 7699)

DC-12 splits into two sub-classes by oracle-source architecture. The split materially changes triage and FP rates on Solana lending + EVM lending Gate 1 scans. `[INSPECTED]` — proposed by Kamino Gate 2 brain compound (task #37, 2026-05-24); operator-approved msg 7699.

**DC-12 / CANDIDATE-O-RAW** — raw DEX spot in oracle path. The pricing pipeline reads a single-pool spot price (Uniswap V2/V3 `getReserves()` or `slot0` sqrtPriceX96), an instantaneous AMM mid-price, or a single-tick TWAP with insufficient window for the asset's volatility. No defended-wrapper between the DEX surface and the consumer. **All 5 DC-12 sub-patterns apply.** Classic Sharwa, PancakeBunny, Cream, Elephant.

**DC-12 / CANDIDATE-O-WRAPPED** — DEX-derived price but defended via at least one of the following independently-verifiable wrappers:
1. **External-priced sqrt ratio** — the consumer reads a sqrt-price-from-external-price (e.g., Kamino KToken oracle computes sqrtPriceX96 from independent Pyth + Switchboard prices of the underlying pair, then derives the LP-share price from THAT sqrt). Pool sqrt is never read directly.
2. **CappedFloored** — price reads bounded by a hardcoded ceiling/floor (Kamino USDH at FixedPrice = $1; Liquity stETH/wstETH peg-bound math).
3. **MostRecentOf with divergence rejection** — consumer reads N price feeds, accepts only the MostRecentOf passing a per-pair `max_divergence_bps` check (Kamino reserve config; Pendle SY guards).
4. **`VaultReentrancyLib.ensureNotInVaultContext`** (Balancer V2 + Curve consumer pattern, Olympus BLVault uses oracle-MIN cap as substitute).
5. **Internal-monotonic-oracle** — pricing pipeline reads from an INTERNAL oracle that is (a) policy-set by a governance/admin role (not market-driven), (b) monotonically up-only OR monotonically down-only on each update, (c) slope-bounded per setter invariant (max rate-of-change enforced at write-time), (d) zero external feed dependency. The DEX surface is structurally absent from the pricing path. **All 5 DC-12 sub-patterns are FORECLOSED structurally** — there is no oracle-feed to manipulate, no TWAP window to game, no read-only-reentrancy surface, no cross-pool mispricing, no slippage-double-count vector. Filed 2026-05-25 from Olympus Cooler V2 CoolerLtvOracle observation (Ogie msg 7728 proposal A).

A consumer with ≥1 wrapper passes the Kamino three-layer convergence test. ZERO wrappers = O-RAW. Multiple wrappers ≠ stronger defense unless they are independently-sourced (Pyth+Switchboard+Scope with all three from the same DEX source ≠ independent). Wrapper #5 (Internal-monotonic-oracle) is STRUCTURAL foreclosure — when present, no other wrapper is needed because there is no oracle-feed substrate at all.

**Triage rule:** Gate 1 surveys that confirm wrapper-presence + wrapper-independence may FORECLOSE on DC-12 with a documented receipt. Surveys without wrapper-verification leave the finding [ASSUMED] DC-12 substrate; demote to Gate 2 verification.

**Canonical O-WRAPPED-DEFENDED references:**
1. **Kamino klend Gate 2** (task #37, 2026-05-24, Solana substrate) — surveyed 30 reserves across 4 markets, found 2 with `max_twap_divergence_bps=0` but ZERO using direct-DEX-spot Scope chain index. kSOLJITOSOLOrca uses external-priced sqrt ratio (anti-Sharwa source comment at `programs/scope/src/oracles/ktokens.rs:41-44`). USDH uses FixedPrice $1. Class refuted across production surface. See `data/lane1/gate2-clones/kamino-twap-bypass-paste-ready.md` for the regression sentinel.
2. **Origin Dollar (OUSD/OETH) Gate 2** (task #53, 2026-05-25, EVM substrate, second-anchor confirmation) — Origin's `AbstractOracleRouter.sol` + `OracleRouter.sol` + `OETHOracleRouter.sol` family is Chainlink-only with `latestRoundData()` + staleness + DRIFT bounds. ZERO `get_p` / `last_price` / `price_oracle` grep hits in `oracle/` dir. NO Curve fallback path. WETH = FIXED_PRICE 1e18. Stablecoin reserves all mapped to Chainlink USD feeds. CONFIRMS the DC-12 O-WRAPPED reference pattern cross-substrate (Solana + EVM). See `data/lane1/gate2-clones/origin-dollar-rebase-sandwich-foreclosed.md` for full V2 verification record. (Operator approval: Ogie msg 7715 proposal A, 2026-05-25)
3. **Olympus Cooler V2 Gate 1** (task #59, 2026-05-25, EVM substrate, third-anchor confirmation — INTERNAL-MONOTONIC-ORACLE wrapper #5 canonical reference) — `CoolerLtvOracle` is policy-set + monotonically up-only + slope-bounded internal-only oracle. NO external feed (Chainlink / Pyth / Switchboard / DEX) appears in pricing path. LTV value can only INCREASE on update (admin-callable), with per-setter slope invariant bounding max rate-of-change. The class is structurally foreclosed — no oracle-feed substrate exists for any of the 5 DC-12 sub-patterns to bind. All 4 detector rotations clean (cand-t / cand-w / cand-y / cand-v: 0/0/0/0 findings on 235 .sol). cand-z (DC-20 rebase cache) SKIPPED structurally — no rebase wrapper. See `hunts/2026-05-25-cooler-loans-gate1.md` for full Gate 1 record. (Operator approval: Ogie msg 7728 proposal A, 2026-05-25)

**Canonical O-RAW reference:** Sharwa (Arbitrum, $32.8K, 2024) — Hegic option NFT priced via Uniswap V3 spot Quoter on low-liquidity USDC.e/USDC pool, NO TWAP, NO Chainlink fallback. Textbook-clean O-RAW.

**Detector implication:** the propagation `defense-class-mapping.json` should tag O-RAW vs O-WRAPPED separately. Targets with O-WRAPPED + audit-saturation HEAVY get audit-saturation discount × wrapper-density multiplier; targets with O-RAW + thin audits get priority dispatch.

---

### DC-13: Post-Audit Hook / CEI Break via Upgradeable Integration (PROMOTED 2026-05-24, Ogie msg 7695)

> **Promotion event:** Promoted from CANDIDATE-M on 2026-05-24. Clara Ground-Truth bulk intake surfaced **~10 adjacent anchors** (combined with 0xBugDrop $7M anchor = $10M+ exposure, threshold met). Operator decision: msg 7695 (2026-05-24 21:49Z).

**Class statement (DC-13):**

> A contract integrates a callback / hook / external-call surface AFTER its initial audit cleared CEI ordering — typically as a composability extension (post-audit-added trading hook, fee-router callback, fake-pool integration, upgrade-routed plugin). The integration breaks the audited CEI invariant because state mutation now happens AFTER the external call to a hook target the audit never evaluated. Attacker controls (or compromises) the hook target → re-enters via standard reentrancy vector → drains. Distinct from generic reentrancy (DC-1): the audit DID verify CEI on initial surface; the bug is the upgrade-time addition that bypassed re-audit. Compounds with DC-9 sub-3 (upgradeable hook + no timelock) when the hook address is admin-settable.

**Sub-pattern enumeration (each anchored above):**

1. **hook-added-after-audit** — upgrade adds external-call surface to previously-audited function
2. **callback-before-state** — initial implementation used CEI; refactor moved state-mutation after callback
3. **fake-pool-callback** — contract accepts arbitrary pool address as callback target; attacker registers fake pool
4. **notification-callback-admits-attacker-controlled-notifee** (added 2026-05-26 from Filecoin Gate 1, hunt `hunts/2026-05-26-filecoin-immunefi-gate1.md` proposal C-Filecoin-1) — cross-actor notification target is user-set in the message params AND the send uses state-mutating flags AND the notifee return-value is consumed as an attestation of payload validity. Attacker registers a self-controlled notifee; the system admits a self-attestation bypass. Distinct from sub-3 (fake-pool-callback — attacker registers fake pool for a hook surface) in that sub-4 the NOTIFEE is a documented protocol participant whose return value is treated as an authoritative validation (not a hook side-effect). Canonical anchor: Filecoin FIP-0109 `notify_data_consumers` post-FIP — miner-actor sends notification to user-set `notifee_addr`, consumes notifee's return as deal-validity attestation. Expands the DC-13 family from "upgradeable contract address as hook target" to "user-set notification target field as attestation authority." [INSPECTED] (Filecoin Gate 1 outcome, Day 26 batch.)

5. **notification-callback-informational-only (Phase 0 FORECLOSE gate)** (added 2026-05-28 from DISC-020 Filecoin #79987 CLOSED NOT-A-BUG productive-closure) — when scanning a notification/callback surface that LOOKS like sub-4 (user-set notifee + state-mutating send), Phase 0 MUST trace the economic-outcome code path BEFORE Gate 2 escalation. If the notification result is NOT consumed by the authorization/crediting logic — i.e., the notify is informational-only and a SEPARATE authorization path (cryptographic validation, registry-actor lookup, batch-claim verification) independently controls the economic state — the notification surface is **NOT exploitable for economic impact regardless of who controls the receiver**. FORECLOSE the notification surface at Phase 0, do NOT invest Gate 2 time. Canonical anchor: Filecoin FIP-0109 — `notify` field is informational; `verified_allocation_key + batch_claim_allocations` path independently validates FIL+ allocations through the verified registry actor. DISC-020 conflated these two paths; project rebuttal accepted as correct. This sub-pattern is the **structural negation** of sub-4: same SHAPE on the surface, opposite outcome because the economic-outcome path is separate. Mandatory check: for every DC-13 sub-4 candidate, identify the SEPARATE authorization/crediting code path; if it exists and is independent of the notification, fire sub-5 FORECLOSE. Cross-reference: Doctrine #39 CANDIDATE ("Notification Path ≠ Authorization Path"). [INSPECTED] (DISC-020 closure, 2026-05-28.)

6. **conformance-only-no-chain (Phase 0 INSIGHT-tier gate)** (added 2026-05-28 from Firedancer #77340 INSIGHT CONFIRMED — FIRST CONFIRMED BOUNTY, Ogie msg 7957) — when scanning any RFC / spec conformance surface (HTTP framing, parser leniency, validation gaps, denom-regex bypass, packet-format desync), Phase 0 MUST ask: **"Can I demonstrate the chain to impact, or only the primitive?"** Primitive without chain = INSIGHT-tier flat/pool-share payout on audit-competition programs, materially below Medium. Pre-classify EV as `cap × P(acc) × 0.10-0.20 conformance_class_discount` BEFORE investing Foundry/PoC time on a chain-less hypothesis. The conformance observation may still be worth filing (brain-compound-rich for doctrine + detector seeds, and on Immunefi the project — not the triager — can reopen as INSIGHT) but Gate 2 PoC effort budget should reflect INSIGHT-tier ROI not Medium-tier ROI. Distinguishing test: an EXPLOIT NARRATIVE reads as "attacker bytes reached the authenticated app via this proxy + this desync, here's the captured response"; a CONFORMANCE OBSERVATION reads as "server accepts non-conformant framing per RFC X §Y" with no captured-response artifact. Canonical anchor: Firedancer #77340 — 6 HTTP framing sub-findings, all [INSPECTED]-grade, no end-to-end chain demonstrated; triager CLOSED, project REOPENED at INSIGHT (KYC complete, payout pending). Cross-reference: Doctrine #40 CANDIDATE ("Conformance ≠ Exploit Narrative"). Two-reviewer pattern observed: triager close ≠ final on audit-competition programs; project gets last word. Do NOT inquire about post-close insight status (Immunefi T&C prohibits status inquiries). [INSPECTED] + [EXECUTED] (Firedancer KYC + payout confirmation, 2026-05-28.)

**Anchor incidents (Clara + brain):**
- 0xBugDrop unnamed 2026-05-22 **$7M** (canonical Buzz brain anchor — sub-1+sub-2 compound)
- ~10 Clara anchors across 2022-2024 reentrancy revival corpus (per Clara intake §3 cumulative count); 2022 CEI-class chain (Hundred Gnosis + Agave + Paraluni + bHOME + Fuse Pool 127 + Revest + ACOWriter + Umbrella) as substrate for the re-emergent class
- Filecoin FIP-0109 `notify_data_consumers` 2024 (Lead 1, hunt `hunts/2026-05-26-filecoin-immunefi-gate1.md` — sub-4 canonical anchor)
- Combined Clara USD: $10M+ named exposure (Filecoin lead pending Gate 2 bytecode verification)

**Detector coverage (current shipped):**

- `cei-violation-via-hook` detector spec'd in brain (CANDIDATE-M productization signal)
- DC-13 productization HIGH: grep + AST + git-history (added-after-audit qualifier)

**Cross-pollination scan targets (active):** Fira router facets, Aave V4 Spoke callbacks, Usual post-audit refactors, every upgradeable proxy with post-deploy commit history modifying external-call paths.

**Historical note:** Pre-promotion tracked as CANDIDATE-M (Post-Audit Refactor Breaks CEI Ordering, 0xBugDrop series, 2026-05-22 brain intake). Clara intake validated promotion via 2022 CEI-class corpus revival under composability.

---

### DC-14: Unbound `from` Approval-Drain in Router / Aggregator (PROMOTED 2026-05-24, Ogie msg 7695)

> **Promotion event:** Promoted from net-new CANDIDATE-T on 2026-05-24. Clara Ground-Truth bulk intake surfaced **~37 anchors** with $14M+ named combined exposure. Operator decision: msg 7695 (2026-05-24 21:49Z).

**Class statement (DC-14):**

> A router / aggregator / proxy contract exposes a function (`swap`, `bridge`, `convert`, `route`, `sweep`, `execute`) that takes a `(from, to, token, amount)` quad as parameters and executes `IERC20(token).transferFrom(from, to, amount)` OR `IERC20(token).transferFrom(from, address(this), amount)` followed by an internal use. The `from` argument is NOT bound to `msg.sender` — the only protection is the `from`-address's pre-existing ERC20 allowance to the router. Attackers scan victim wallets that have UNLIMITED allowances to legacy routers, then invoke the unbound `from` function to siphon any token the victim has allowed. Specialization of DC-7 Priority #1 (WEAKER-PROPERTY-THAN-DOWNSTREAM-ASSUMES) applied to the ERC20 allowance economy: the router's validation property is "caller supplied a `from` address"; the user-assumed property is "router only routes my OWN tokens"; the two diverge because allowance is to-the-router, not to-the-router-when-from-equals-me.

**Sub-pattern enumeration (each anchored above):**

1. **router-transferFrom-from-unbound** — direct `transferFrom($FROM, ...)` where `$FROM` is function-arg unbound to `msg.sender`
2. **aggregator-route-arbitrary-from** — route engine treats `from` as routing key, executes downstream transferFrom against arbitrary owner
3. **permit-router-misuse** — `permit($OWNER, ...)` + `transferFrom($OWNER, ...)` where `$OWNER` is unbound to `msg.sender` before permit usage (AnyswapV4 sub-anchor)

**Anchor incidents (Clara):**
- LiFi 2022-03-20 **$202K** (canonical Clara anchor — multi-route aggregator class) **[INSPECTED]** (published post-mortem)
- SocketGateway 2024-01-16 **$2.6M** ("Route 406 USDC drain") **[INSPECTED]** (published post-mortem)
- RubicProxy 2022-12-25 **$1.5M** **[INSPECTED]**
- Transit Swap 2022-10-01 **$6.9M** ("Proxy drain") **[INSPECTED]** (published post-mortem)
- Hedgey 2024-04-19 **$1.3M** ("Allowance vulnerability") **[ASSUMED]** (Clara index-only)
- Dexible 2023-02-17 18M TRU **[ASSUMED]**
- ACOWriter 2022-03-26 **$725K** ("USDC allowances drained via misuse") **[ASSUMED]**
- AnyswapV4Router 2022-01-19 **$966K** (permit-misuse sub-anchor) **[INSPECTED]** (published post-mortem)
- Bancor 2020-06-21 (canonical historical — `claimAndConvert2` exploit) **[INSPECTED]**
- 27+ additional Clara anchors across `gap:approval-drain` tag (Clara index aggregate) **[ASSUMED]**
- Combined Clara USD: **$14M+ named** exposure (broader $20M+ inferred)

**Detector coverage (current shipped):**

- Detector v2.0 spec: `unbound-from-approval-drain` (Clara intake §4 Pattern 1) — single-file AST grep + downstream-binding negative-control; ready for L1b productization
- FP gate: legitimate forwarders / EIP-2771 / gasless-relayers require `from` argument — discriminate via positive-confirmation of downstream balance-delta or signature-binding check against `from`'s authorization

**FP-exclusion sub-rule — vendor-library `_msgSender()` with explicit trusted-forwarder gate (added 2026-05-25 — proposal B, Ogie msg 7770) [INSPECTED]:**

DeXe Gate 1 (2026-05-25 FORECLOSURE-RECEIPT) surfaced a CAND-T FP class anchored on vendor library `_msgSender()` callsites that pass through OpenZeppelin / Solady / Solmate ERC2771Context inheritance WITH explicit `isTrustedForwarder(msg.sender)` gating BEFORE the `_msgSender()` resolution. These callsites are **FP-immune** for DC-14 purposes — the `from` parameter is bound to the trusted-forwarder-resolved identity, not to attacker-supplied calldata. Skeptic must auto-REJECT these candidates at conf ≥0.95.

**Auto-REJECT criteria (all three must hold):**

1. Contract inherits from `ERC2771Context` (OZ canonical, OZ ^4.x / ^5.x) OR equivalent (Solady `ERC2771ContextUpgradeable`, Solmate `MetaTransactionContext`, custom abstract base with `_trustedForwarder` immutable + `isTrustedForwarder(addr)` view)
2. The flagged transferFrom / route call uses `_msgSender()` (NOT raw `msg.sender`) as the `from` parameter
3. There is no path from a non-forwarder direct-call that reaches the same transferFrom with attacker-supplied `from` — verify by enumerating callers of the flagged function

**Why this is FP-immune for CAND-T but NOT for DC-17 (ERC2771 misuse class):**

DC-14 is "unbound `from` approval drain" — the bug is `from` ≠ msg.sender via NO authorization. CAND-T FP-immunity above applies when `from = _msgSender()` IS the authorization (the forwarder-signed meta-tx is the auth). DC-17 (Clara CAND-W promotion) is a DIFFERENT class: `_msgSender()` is used CORRECTLY in one callsite but INCORRECTLY mixed with raw `msg.sender` in a sibling callsite (partial-adoption regression). The DeXe FP-immunity covers DC-14 only; DC-17 still fires on the partial-adoption pattern.

**Detector implementation note for proposal K (main-session patch):**

The vendor-library check should grep for ALL of: `import ".*ERC2771Context"`, `import ".*MetaTransactionContext"`, `abstract contract.*ERC2771`, `function isTrustedForwarder` — any positive match downgrades the candidate from HIGH to UNCERTAIN; pair-check with the AST `from == _msgSender()` binding confirms FP and auto-REJECTs.

**Canonical anchor.** DeXe `DexeGovernance` (2026-05-25 Gate 1) — inherits OZ ERC2771Context via vendored OZ submodule; all reward-distribution transferFrom callsites use `_msgSender()` resolved through `isTrustedForwarder(msg.sender)` gate. CAND-T detector flagged 3 candidates pre-FP-rule; all 3 FP after vendor-library check applied. Operator-approved msg 7770 proposal B.

**Cross-pollination scan targets (active):** every router-aggregator-bridge deployed since 2022. Cross-pollination scan EV: 0.05-0.10 catch rate on broad corpus; $50K-$200K per-finding EV on cap-bounded programs.

**Companion finding from Observation D:** Combine with DC-9 sub-1 (unchecked-mint / unauth-admin) — an unbound-`from` router that ALSO has admin functions exposed creates a compound CRITICAL surface.

**Historical note:** Filed as net-new CANDIDATE-T from Clara Ground-Truth bulk intake 2026-05-24 (no prior brain anchor). Promotion-on-filing because Clara anchor count (~37) and the structural pattern repeatability (5+ years of recurring router drains per Clara intake Observation C) exceeded the DC-9 promotion bar at intake time.

**Reference baseline — LiFi post-2022 architectural fix (CONFIRMED INTACT 2026-05-25, Ogie msg 7725 proposal A) [INSPECTED]:**

LiFi 2022-03-20 ($202K) was the canonical Clara anchor that opened the DC-14 class. The post-incident architectural fix has held: `lifinance/contracts` HEAD 61ef8dcd (2026-05-22) ran cand-t-detector against 394 .sol files → **0 findings**. The defense pattern that closes DC-14 cleanly:

1. **Explicit `_receiver` parameter binding** — `swapAndExecute` / `swapAndCompleteBridgeTokens` take `_receiver` as an explicit argument; downstream transferFrom is bound to `_receiver`, not to attacker-supplied `from`
2. **`nonReentrant` modifier** on all Executor entry-points (Executor.sol L100+131)
3. **Backend-generated `LibSwap.SwapData[]` calldata constraint** — Cantina program OOS rule: "self-crafted calldata" not in scope. Means user-supplied `from` reaches the contract only via off-chain-signed routes that re-validate
4. **Receiver* periphery layer** — 5 dedicated Receiver contracts that re-validate the destination address against signed intent

This is the **structural reference DC-14 defense**. Future Gate 1 surveys finding router/aggregator transferFrom patterns should compare against this baseline. Defense ratio: explicit _receiver + nonReentrant + backend-calldata + Receiver* re-validation = 4-layer defense. Any router shipping with fewer than 3 of these layers is candidate Gate 2 surface.

**Source:** lifi Gate 1 task #57, 2026-05-25. Foreclosure-receipt at `hunts/2026-05-25-lifi-gate1.md`. Operator-approved msg 7725 proposal A.

---

### DC-15: AMM Pair Reserve-Skew via Custom Transfer / Burn / Skim (PROMOTED 2026-05-24, Ogie msg 7695)

> **Promotion event:** Promoted from net-new CANDIDATE-U on 2026-05-24 AS PARENT ABSTRACTION (NOT a merge). Pre-existing CANDIDATE-R (deflationary-token) and CANDIDATE-S (sync-balanceOf) STAY AS-IS per operator directive msg 7695 — they are treated as concrete sub-instances of DC-15 alongside additional sub-patterns yet to be detector-built. Clara Ground-Truth bulk intake surfaced **~35 anchors** with $50M+ named exposure (Uranium $40.9M dominant + SafeMoon $8.9M secondary). Operator decision: msg 7695 (2026-05-24 21:49Z).

**Class statement (DC-15):**

> A token implements custom logic in `_transfer`, `_burn`, `_update`, or relies on `pair.skim()` / `pair.sync()` that mutates the AMM pair's balance state. The pair's `reserves` cached in storage diverge from `IERC20(token).balanceOf(pair)` after the custom mutation. An attacker flash-borrows, swaps to trigger the custom mutation across the pair, then exploits the reserve-balance asymmetry via subsequent swap, burn, skim, or sync to drain the LP. SAFE-extension counter-pattern: pair's `sync()` rebinds reserves to actual balance, so if `sync()` is callable post-mutation and pre-attack, the surface closes. Specialization of DC-7 Priority #1 (WEAKER-PROPERTY-THAN-DOWNSTREAM-ASSUMES) applied to AMM accounting: pair contract assumes `reserves ≈ balanceOf(pair)` modulo last `sync()`; custom transfer hooks break the invariant.

**Sub-pattern enumeration (PARENT ABSTRACTION — R + S are concrete sub-instances, others to be detector-built):**

1. **DC-15.R (deflationary-LP-mutation)** — token contract has `_transfer` / `_update` override that calls `_burn(pair_address)` OR mutates `_balances[pair_address]` outside the standard from/to update. **(Existing CANDIDATE-R class — kept as-is per Ogie msg 7695)**
2. **DC-15.S (custom-balanceOf-divergence / sync-exposure)** — token's `balanceOf(address)` returns a computed value (call to external contract, computation from reserves) rather than reading storage map; pair's `sync()` rebinds — exploit window is between mutation and next sync. **(Existing CANDIDATE-S class — kept as-is per Ogie msg 7695)**
3. **DC-15.X (skim-exposure)** — pair-contract calls `_safeTransfer(to, IERC20(token).balanceOf(address(this)) - reserve_X)` callable by anyone with `to = caller`. **(Net-new sub-pattern from Clara intake — detector pending)**
4. **DC-15.Y (self-transfer-acct compound)** — token allows `_transfer(addr, addr, amount)` without short-circuit; in pair context produces double-counted accounting. **(Net-new sub-pattern from Clara intake; ALSO filed as standalone CANDIDATE-Y — see below)**

**Anchor incidents (Clara):**
- Uranium 2021-04-28 **$40.9M** (largest single anchor — pair-drain class) **[INSPECTED]** (published post-mortem)
- SafeMoon 2023-03-28 **$8.9M** (LP-burn drain, deflationary-class anchor) **[INSPECTED]** (published post-mortem)
- LeetSwap 2023-08-01 **$221K** (Base-chain anchor) **[ASSUMED]**
- Reflection-class drains: BUNN $13K, FIREDRAKE $5.3K, BEVO $103K, WDOGE $30K, TomInu $35K, OceanLife $11K, GROK $55K (folds DC-15.R sub-pattern) **[ASSUMED]**
- Burn-class drains: BurnsDeFi $87K, ShadowFi $298K, CS $954K, BFCToken $42K, ZS $22K, APE2 $19K, PLTD $24K (DC-15.R sub-pattern) **[ASSUMED]**
- Skim-class: XStable $46K, UpSwing $585, GSS $26K, T3913 $31K (DC-15.X sub-pattern) **[ASSUMED]**
- Self-transfer accounting class: SSS $4.6M (largest sub-Y anchor), DeezNutz $170K, MINER $78K, BRAToken $41K, LPC $46K (DC-15.Y sub-pattern) **[INSPECTED]** for SSS (published post-mortem); **[ASSUMED]** for others
- JUDAO $228K — original CANDIDATE-R anchor **[INSPECTED]**
- LBP $145K — original CANDIDATE-S anchor **[INSPECTED]**
- Combined Clara USD: **$50M+ named** exposure

**Detector coverage (current shipped):**

- Detector v2.0 spec: `amm-pair-reserve-skew` (Clara intake §4 Pattern 2) — unified pattern A (reflection) + pattern B (custom-balanceOf) + pattern C (skim-exposure)
- DC-15.R + DC-15.S have existing detector primitives at CANDIDATE-level; consolidation into DC-15 umbrella adds DC-15.X (skim) + DC-15.Y (self-transfer) sub-pattern detectors
- FP gate: legitimate rebase tokens (Ampleforth, OHM, stETH) use custom balanceOf for share→asset conversion — NOT this class unless paired with AMM that doesn't handle rebase

**Cross-pollination scan targets (active):** token-issuer class is enormous; ongoing meme-token deployments retain the pattern in 2024-2026. Cross-pollination scan catch rate estimate: 0.15-0.25.

**Historical note:** Filed as net-new CANDIDATE-U from Clara Ground-Truth bulk intake 2026-05-24 as PARENT ABSTRACTION. Operator directive msg 7695 explicitly: "R+S detectors stay as-is. CANDIDATE-U filed as PARENT ABSTRACTION — not a merge. Treat R + S as concrete sub-instances of U." This DC-15 reflects that architecture: R + S remain as their own detector classes (in the CANDIDATE pool section), and DC-15 enumerates them as sub-patterns alongside additional sub-patterns yet to be detector-built.

---

### DC-16: Decimal / Unit-of-Measure Asymmetry in Pricing or Redemption (PROMOTED 2026-05-25, Ogie msg 7710)

> **Promotion event:** Promoted from net-new CANDIDATE-X on 2026-05-25 at 00:24Z. Clara Ground-Truth bulk intake surfaced **3 anchors** crossing the 2+ adjacent-anchor DC-promotion threshold. Operator decision: msg 7710. DC-16 closes the "approved Clara intake set" at 6 DC promotions today (DC-11..16).

**Class statement (DC-16):**

> A pricing, redemption, liquidation, or share-conversion function computes `output = price * input / SCALE` (or analogous shape) where `price` and `input` are denominated in DIFFERENT precisions (e.g., 8-decimal Chainlink feed vs 18-decimal ERC20 amount vs 6-decimal stablecoin), and the `SCALE` constant assumes a third unrelated precision. The arithmetic produces a value off by 10^N from intended, allowing attackers to redeem/borrow/liquidate at wildly-favorable rates. Adjacent gap class to DC-7 (Validating-Field ≠ Consuming-Field) but operating at the decimal/unit dimension rather than the field-binding dimension.

**Sub-pattern enumeration (each anchored above):**

1. **chainlink-feed-decimal-vs-token-decimal** — 8-decimal price feed × 18-decimal token amount, hardcoded `1e18` divisor (Blueberry pattern)
2. **redemption-decimal-mis-scaling** — vault redemption uses one decimal for shares and another for assets without conversion (ENF pattern)
3. **amm-cross-asset-quote-decimal-asymmetry** — AMM quote formula uses raw `reserveOut/reserveIn` where the two assets have different decimals, no normalization (Nowswap V1 pattern)
4. **stablecoin-mixed-decimal** — pools / protocols supporting USDC (6-dec) + DAI (18-dec) + USDT (6-dec) where one path normalizes and another doesn't (theoretical sub-pattern, no Clara anchor yet)

**Anchor incidents (Clara + brain):**
- Blueberry 2024-02-23 **$1.3M** ("Decimal mismatch exploit") — canonical sub-1 anchor `[INSPECTED]` (published post-mortem)
- ENF 2023-02-24 **$5.2M** ("Redeem decimal mis-scaling") — sub-2 anchor `[ASSUMED]` (Clara index-only)
- Nowswap V1 2021-09-15 **$1.1M** ("WETH mis-scaled KLOSS invariant") — sub-3 anchor `[ASSUMED]` (Clara index-only)
- Combined Clara USD: **$7.6M+ named exposure**

**Detector coverage (current shipped):**

- `/home/claude-code/.tmp-build/v6/buzzshield-cand-x-detector.js` (2026-05-25 shipped, 566 lines) — DC-16 production detector
- `HE-34` Skeptic hard-exclusion rule registered: DECIMAL_NORMALIZATION_DEFENSE_RE / LIBRARY_NORMALIZED_PRICE_RE / same-decimal-class trio at conf 0.85-0.95
- E2E test: `/home/claude-code/.tmp-build/v6/tests/detector-x-e2e.test.js` 5/5 PASS + 4/4 full-pipeline validation
- 4 synthetic targets: positive-blueberry-class + positive-nowswap-class + negative-normalized + negative-library

**Sub-class refinement — same-decimal-class projection [INSPECTED] (Clara intake 2026-05-24)**

The pattern `USDC + USDT in same contract` (both 6-dec) is structurally immune to DC-16. Worth noting: any stablecoin-pair fork (Curve 3pool style) trivially defends against DC-16. Conversely, the moment a stablecoin pool adds WBTC or WETH as a wrapper-asset (e.g., "Tricrypto" extension), the defense disappears.

**Cross-pollination scan targets (active):** every lending protocol with multi-decimal collateral support (Aave-fork + Compound-fork + Silo + Morpho), every AMM with cross-decimal pair support (Uniswap V3 + Curve + Balancer), every redemption-flow oracle consumer (Origin Dollar, OUSD, sUSDS, frxETH).

**Meta-pattern observation (cross-class enrichment):** The "low-decimal + 18-decimal token in same contract → arithmetic site → defense check" three-step regex pipeline could generalize to other cross-context unit issues — Q64.96 (Uniswap V3) vs uint256, basis-points (1e4) vs WAD (1e18), seconds vs blocks, gas-units vs wei. Worth tracking as a routing meta-pattern for future DC-N sub-class detectors.

**Historical note:** Pre-promotion tracked as CANDIDATE-X (Clara intake bulk-filed 2026-05-24, brain commit e810bd3). The 3-anchor threshold + cross-cutting nature (lending + AMM + redemption all affected) justified DC promotion. Operator-approved msg 7710. Next promotions on 2+ adjacent anchors for CANDIDATE-V (~20 anchors, threshold-met but awaiting promotion review), CANDIDATE-Y (8 anchors, threshold-met), CANDIDATE-Z (5 anchors, threshold-met).

---

### DC-17: ERC2771 / Trusted-Forwarder `_msgSender()` Misuse on Burn / Transfer (PROMOTED 2026-05-25, Ogie msg 7712)

> **Promotion event:** Promoted from net-new CANDIDATE-W on 2026-05-25 at 00:29Z. Clara Ground-Truth bulk intake surfaced **3 anchors** crossing the 2+ adjacent-anchor DC-promotion threshold. Operator decision: msg 7712. DC-17 closes the second wave of Clara intake promotions (DC-16 + DC-17 both filed 2026-05-25 in the same operator-active window).

**Class statement (DC-17):**

> A token or vault contract inherits OpenZeppelin's `ERC2771Context` (or equivalent trusted-forwarder pattern) and exposes sensitive functions (`burn`, `_burn`, `transfer`, `transferFrom`, `approve`, `stake`, `unstake`, `withdraw`, `claim`, role-grants, rate-limited paths) where SOME callsites use the OZ-correct `_msgSender()` extraction but OTHERS use raw `msg.sender`. The mismatch creates an identity-spoofing surface: attacker constructs a forged meta-tx with `<victim_address>` appended bytes, the `_msgSender()`-using callsite resolves to victim, but the `msg.sender`-using callsite resolves to forwarder OR attacker — the inconsistent identity binding lets attacker burn / transfer / claim against the victim's state. Distinct from generic auth bugs (DC-3): the contract DID adopt OZ ERC2771Context; the bug is the partial-adoption regression class.

**Sub-pattern enumeration (each anchored above):**

1. **burn-internal-helper-mismatch** — public `burn(uint256)` uses `_msgSender()` correctly, but the called internal `_burn` helper checks `balanceOf(msg.sender)` or `_balances[msg.sender]` (thirdweb anchor)
2. **stake-balance-update-with-rate-limit-mismatch** — `stake()` mutates balance via `_msgSender()` but `staker[msg.sender].lastUpdate` rate-limit check uses raw msg.sender (TIME anchor)
3. **rate-limit-vs-balance-mismatch** — rate-limit check uses `msg.sender` while balance mutation uses `_msgSender()` (DominoTT anchor)
4. **tx-origin-in-forwarder-context** — even worse: contract uses `tx.origin` instead of either; tx.origin resolves to relayer wallet which is forwarder owner (theoretical sub-pattern, no Clara anchor yet)

**Anchor incidents (Clara + brain):**
- thirdweb TokenERC20-class 2023 (~$Xk-Mk, multi-token burn exploit across forks) — canonical sub-1 anchor `[INSPECTED]` (published post-mortem)
- TIME (BSC/multi-chain staking) — sub-2 anchor `[ASSUMED]` (Clara index-only)
- DominoTT — sub-3 anchor `[ASSUMED]` (Clara index-only)
- Combined Clara USD: **3 anchors, ~$Mk+ named exposure** (specific USD figures pending per-incident WebFetch — skipped per Ogie msg 7695 directive low-ROI)

**Detector coverage (current shipped):**

- `/home/claude-code/.tmp-build/v6/buzzshield-cand-w-detector.js` (2026-05-24 shipped, 617 lines) — DC-17 production detector
- `HE-35` Skeptic hard-exclusion rule registered: no-ERC2771-inheritance / explicit-isTrustedForwarder-guard / non-state-mutating-view-context trio at conf 0.85-0.95
- E2E test: `/home/claude-code/.tmp-build/v6/tests/detector-w-e2e.test.js` 5/5 PASS + 4/4 full-pipeline validation
- 4 synthetic targets: positive-thirdweb-burn HIGH + positive-time-stake HIGH + negative-pure-msgsender + negative-no-forwarder
- Two-stage AST walk: `findErc2771Contracts` + `enumerateOzHelpers` — correctly handles inlined-abstract-base pattern (thirdweb, TIME) AND OZ-import pattern

**Sub-class refinement — abstract-base-in-same-file [INSPECTED] (W detector build observation 2026-05-24)**

OZ canonical pattern imports `ERC2771Context` from `node_modules/@openzeppelin/...` (HE-03b auto-skipped during scan). Some projects inline the abstract definition in the SAME .sol file as the concrete implementer (thirdweb, TIME). The detector's two-stage walk handles both: identifies concrete contracts via `is ERC2771*` inheritance clause AND scopes sensitive-function analysis to skip OZ helper-function bodies. Future audits should expect either deployment pattern.

**Cross-pollination scan targets (active):** every meta-tx-enabled protocol — Biconomy ecosystem, OpenGSN-integrated tokens, thirdweb-fork token issuers, gasless-NFT mint protocols. Plus any DAO with forwarder-relayed governance.

**Cross-pollination with CANDIDATE-P (Drift durable-nonce):** both classes exploit identity/state staleness across an off-chain relayer boundary. DC-17 is the meta-tx forwarder version; CANDIDATE-P is the durable-nonce pre-signed-tx version. Combined cross-domain lens surfaces relayer-class bugs in any future audit target with relayer integration.

**Historical note:** Pre-promotion tracked as CANDIDATE-W (Clara intake bulk-filed 2026-05-24, brain commit e810bd3). The 3-anchor threshold + the structural identity-mismatch class (distinct from generic auth bugs) justified DC promotion. Operator-approved msg 7712. Subsequent V/Y/Z promotions to DC-18/19/20 followed on 2026-05-25 (msg 7725).

---

### DC-18: Reward / Staking Accumulator Reuse Without Per-User Snapshot Invalidation (PROMOTED 2026-05-25, Ogie msg 7725)

> **Promotion event:** Promoted from CANDIDATE-V on 2026-05-25. Clara Ground-Truth bulk intake surfaced **~20 anchors** with $3-5M+ named exposure (NFD $1.3M + YYDS $742K canonical anchors). Operator decision: msg 7725. DC-18 opens the third wave of Clara intake promotions (DC-18/19/20 filed 2026-05-25 in the same operator-active window).

**Class statement (DC-18):**

> A staking, farming, or reward-distribution contract tracks reward eligibility via a global per-pool accumulator (`accRewardPerShare`, `cumulativeIndex`, `lastUpdate`) and a per-user record (`userInfo[u].rewardDebt`, `lastClaim`, `pendingReward`). The accumulator is correctly updated on deposit / withdraw, BUT the per-user `rewardDebt` snapshot is NOT correctly invalidated on token transfer (LP-share transfer, NFT-stake transfer, or external delegation). Attacker buys LP shares → transfers to a fresh wallet → both wallets claim the same reward against the unsynchronized per-user records. Alternatively: attacker manipulates the accumulator via flash-loan deposit → withdraws → still has the snapshot to claim against. Specialization of DC-9 sub-4 (state-not-invalidated-repeated-mint) applied to reward distribution rather than mint-by-signature.

**Sub-pattern enumeration:**

1. **transfer-no-rewardDebt-sync** — staking-token transfer hook absent or incomplete; `_beforeTokenTransfer` does not call `_updateUser(from, to)` to settle pending rewards before share-balance changes
2. **flash-deposit-accumulator-manipulation** — attacker flash-loans capital, deposits, manipulates accumulator via reward injection, withdraws same-block; per-user snapshot still claimable
3. **referral-overpay-no-snapshot-cap** — referral-tier reward systems pay against a snapshot that was never invalidated when the referrer rebalanced
4. **NFT-stake-transfer-no-snapshot-reset** — NFT-position staking pays against the original staker's snapshot after position transfer

**Anchor incidents (Clara):**
- NFD 2022-09-08 **$1.3M** (canonical reward Sybil anchor) **[ASSUMED]**
- YYDS 2022-09-08 **$742K** (referral overpayment, sub-3) **[ASSUMED]**
- BCT 2023-12-09 $2.5K **[ASSUMED]**
- GDS — large-volume "Transferable LP Share Reuse" direct-class anchor **[ASSUMED]**
- WECOStaking, BambooAI, BigBangSwap, FireBird, Floor DAO, FarmZAP, JUICE, OKC, CAROL, EHIVE, GROKD, BurnsDeFi, Audius (gov-reinit), Pancake forks, BabySwap, Annex, ATK — ~20 total Clara anchors tagged `gap:reward-drain` **[ASSUMED]**
- Combined Clara USD: **$3-5M+ named**

**Detector coverage (current shipped):**

- `/home/claude-code/.tmp-build/v6/buzzshield-cand-v-detector.js` (2026-05-24 shipped) — DC-18 production detector
- Detector primitive: `claim()` / `harvest()` / `withdraw()` / `collect()` reads `userInfo[msg.sender].rewardDebt` AND updates `rewardDebt` AFTER reward paid AND staking-token transfer does NOT call `_updateUser(from, to)` hook
- FP gate: modern reward systems use SushiSwap's `_updateRewardDebt` pattern in `_beforeTokenTransfer`. Skeptic confirms absence of that hook before promoting to HIGH
- E2E test: `/home/claude-code/.tmp-build/v6/tests/detector-v-e2e.test.js` 5/5 PASS

**Substrate-widening sub-rule — DeXe Gate 1 enrichment (added 2026-05-25 — proposal A, Ogie msg 7770) [INSPECTED]:**

DeXe Gate 1 (2026-05-25 FORECLOSURE-RECEIPT) surfaced accumulator-field naming patterns NOT present in the original Clara-anchor regex set. The detector's `SUBSTRATE_ACCUM_FIELDS_RE_V` pattern pool has been widened in main session (proposal K) to include the following additional accumulator-field idioms; brain documents the widened substrate so future Gate 1s can match against the same widened set:

| Original idiom                             | Widened idioms (DeXe-derived)                                                                                                                                                                  |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `accRewardPerShare`                        | `accRewardsPerShare`, `accumulatedRewardPerShare`, `cumulativeRewardPerToken`, `rewardPerTokenStored`, `globalRewardIndex`                                                                     |
| `cumulativeIndex`                          | `rewardIndex`, `lastRewardIndex`, `globalIndex`, `poolIndex`, `accumulatorSnapshot`                                                                                                            |
| `lastUpdate`                               | `lastAccrualTime`, `lastClaimAt`, `lastUpdateTimestamp`, `lastAccumulatorUpdate`, `accumulationStartedAt`                                                                                      |
| `userInfo[u].rewardDebt`                   | `userRewardDebt[u]`, `_userDebt[u].snapshot`, `participants[u].rewardOffset`, `delegators[u].lastAccumulator`, `stakers[u].entryIndex`                                                         |

**Why DeXe surfaced the widening:** DeXe's reward distribution uses governance-delegated accumulator math (delegator-snapshot-vs-pool-accumulator divergence). The naming convention diverged from MasterChef-fork lineage, surfacing 5+ idiom variants the original Clara regex missed. Detector now matches DeXe-class governance-token-distribution accumulators in addition to MasterChef-class farming accumulators.

**Cross-pollination implication:** widened substrate increases candidate yield on governance-token-distribution protocols (Compound governance, Curve gauge accumulator, Synthetix staking, dYdX trader rewards, Lido `lastRewardBlock`-class patterns). FP rate expected to remain moderate via the existing `_beforeTokenTransfer` `_updateUser` hook negative-control. Re-validate against next 3-5 governance-staking targets before treating as permanent calibration.

**Cross-pollination scan targets (active):** every staking / farming protocol with custom transfer hooks. MasterChef-fork ecosystem (Pancake / Annex / ATK / BabySwap derivatives), NFT-position staking (Uniswap V3 manager-derived), reward-snapshot governance forks (Audius, dYdX-class callback patterns), **governance-token-distribution layer (post-DeXe enrichment)**. Pair-check each against DC-18 sub-patterns at Skeptic verification time.

**Historical note:** Pre-promotion tracked as CANDIDATE-V (Clara intake bulk-filed 2026-05-24, brain commit e810bd3). The ~20-anchor threshold (vastly exceeding 2+ promotion bar) + the structural pattern repeatability across MasterChef-fork ecosystem justified DC promotion. Operator-approved msg 7725. Substrate widening proposal A (DeXe-derived) operator-approved msg 7770, 2026-05-25.

---

### DC-19: `from == to` Self-Transfer Accounting Mutation (PROMOTED 2026-05-25, Ogie msg 7725)

> **Promotion event:** Promoted from CANDIDATE-Y on 2026-05-25. Clara Ground-Truth bulk intake surfaced **8 anchors** with ~$5M named exposure (SSS $4.6M canonical anchor). Operator decision: msg 7725. DC-19 is the token-class layer of the AMM-pair-skew family (DC-15); both filed as standalone DC promotion AND retained as DC-15.Y sub-pattern per dual-layer composition.

**Class statement (DC-19):**

> A token's `_transfer(from, to, amount)` does `_balances[from] -= amount; _balances[to] += amount;` WITHOUT a `from == to` short-circuit. If the token has fee-on-transfer, deflationary burn, reflection, or other accounting mutations layered on top, calling `_transfer(addr, addr, amount)` produces: (a) double-counted accounting (balance goes UP by `amount * tax%`), or (b) silent mint (`_balances[addr] += amount` runs first, then `-= amount * (1-tax)` from a now-inflated balance), or (c) supply inflation (custom hook fires twice on the same address). Attacker uses self-transfer in a loop to mint balance from nothing.

**Sub-pattern enumeration:**

1. **fee-on-transfer-self-double-tax** — fee deduction runs against post-credit balance, attacker gains net tokens per self-tx
2. **reflection-self-double-credit** — reflection-redistribute hook fires on `to` AND on `from` independently
3. **burn-on-transfer-self-mint** — `_balances[from] -= amount; _balances[to] += (amount - burn); _burn(from, burn);` runs `+= amount` before `-=`, attacker keeps the diff
4. **custom-balanceOf-hook-double-fire** — `_beforeTokenTransfer` mutates `_balances[from]` and `_balances[to]` separately; same address double-credited
5. **DC-15.Y compound** — composed with AMM pair to drain reserves (see DC-15 active catalog)

**Anchor incidents (Clara):**
- SSS 2024-03-21 **$4.6M** (largest single anchor, fee-on-transfer compound) **[INSPECTED]** (published post-mortem)
- DeezNutz 2024-02-21 **$170K** **[ASSUMED]**
- MINER 2024-02-14 **$77.7K** **[ASSUMED]**
- BRAToken 2023-01-10 **$41K** ("Self-transfer tax bug") **[ASSUMED]**
- APIG 2023-09-08 **$169K** **[ASSUMED]**
- LPC 2022-07-25 **$46K** **[ASSUMED]**
- 2 additional implied class anchors
- Combined Clara USD: **~$5M**

**Detector coverage (current shipped):**

- `/home/claude-code/.tmp-build/v6/buzzshield-cand-y-detector.js` (2026-05-24 shipped) — DC-19 production detector
- Detector primitive: token's `_transfer` / `_update` does NOT include `if (from == to) return;` short-circuit AND contract has fee-on-transfer / reflection / custom `_balances` mutation hook
- FP gate: pure-ERC20 tokens (no custom hooks) are immune; detector requires positive-detection of mutation hook before flagging
- E2E test: `/home/claude-code/.tmp-build/v6/tests/detector-y-e2e.test.js` 5/5 PASS

**Cross-pollination scan targets (active):** every memecoin / reflection-token / fee-on-transfer token deployed on BSC/Ethereum/Base/Polygon. Detector EV HIGH per build-cost ratio — class is mechanical and grep-friendly. Plus any rebase token with custom transfer logic.

**DC-15.Y dual enumeration:** DC-19 also lives as DC-15.Y sub-pattern (parent DC-15 AMM pair-skew family). The same exploit composes at BOTH the token-class layer (DC-19 standalone) AND the pair-class layer (DC-15.Y compound with AMM sync()). Future detector enrichment: combine DC-19 standalone-detection with DC-15 pair-context to surface compound CRITICAL findings on memecoin pairs.

**Historical note:** Pre-promotion tracked as CANDIDATE-Y (Clara intake bulk-filed 2026-05-24, brain commit e810bd3). The 8-anchor threshold + SSS $4.6M anchor [INSPECTED] published post-mortem + dual-layer composition with DC-15 justified DC promotion. Operator-approved msg 7725.

---

### DC-20: Rebase Token Cache Invalidation Failure (PROMOTED 2026-05-25, Ogie msg 7725)

> **Promotion event:** Promoted from CANDIDATE-Z on 2026-05-25. Clara Ground-Truth bulk intake surfaced **5 anchors** with ~$5.3M named exposure (CauldronV4 $4.7M + ElasticSwap $500K canonical anchors). Operator decision: msg 7725. DC-20 closes the Clara-intake DC promotion wave at 10 promotions (DC-11..20). Subclass of Doctrine #31 (custom hooks break standard invariants) — rebase-token storage-cache is the canonical structural violation.

**Class statement (DC-20):**

> A rebase token (Ampleforth-class, OHM staking, AAVE aTokens, Compound cTokens, stETH, OUSD, OETH) exposes `balanceOf(u) = _shares[u] * _index() / _SCALE` — a COMPUTED property, not a stored property. A downstream consumer (vault, AMM, lending market, debt-position tracker) caches `balanceOf(u)` at time T and consumes the cached value at time T+1 across an index update. The cached value is now stale — either over-priced (rebase up, attacker over-redeems against stale-low debt-cache) or under-priced (rebase down, protocol over-mints to attacker against stale-high collateral-cache). Attacker triggers the index update mid-flow via flash-loan-deposit-into-rebase-pool or via a single-tx settle-cycle that crosses the rebase boundary.

**Sub-pattern enumeration:**

1. **debt-cache-stale-on-rebase** — borrower's debt is cached pre-rebase; rebase up shrinks effective debt; borrower repays the cached (smaller) amount, walks with collateral (CauldronV4 anchor)
2. **collateral-cache-stale-on-rebase** — collateral value cached pre-rebase; rebase down inflates the apparent collateral-to-debt ratio; over-borrow or over-mint against the stale-high cache (ElasticSwap anchor)
3. **pair-reserve-stale-on-rebase** — AMM pair caches `balanceOf(pair)` as reserve; rebase-token rebases against the pair; reserve out-of-sync until `sync()`; arbitrageur drains the asymmetric reserve
4. **read-asymmetric-cache-vs-live-mismatch** — protocol caches the value but reads `live` for related computation; the two diverge across rebase; arbitrage between cache-read and live-read

**Anchor incidents (Clara + brain):**
- CauldronV4 2024-01-30 **$4.7M** (canonical sub-1 anchor — "Debt rebase exploit") **[INSPECTED]** (published post-mortem)
- ElasticSwap 2022-12-13 **$500K** (sub-2 anchor — "Rebase exploit") **[INSPECTED]** (published post-mortem)
- QUATERNION 2023-01-18 $4K ("Pair-rebase accounting drift", sub-3) **[ASSUMED]**
- HATE 2023-09-05 **$12.8K** **[ASSUMED]**
- QWAStaking 2023-09-05 $696 **[ASSUMED]**
- Combined Clara USD: **~$5.3M**

**Detector coverage (current shipped):**

- `/home/claude-code/.tmp-build/v6/buzzshield-cand-z-detector.js` (2026-05-24 shipped) — DC-20 production detector
- Detector primitive: contract calls `IERC20(rebaseToken).balanceOf(...)` AND caches result to storage / memory AND uses cached result AFTER any external call that could trigger rebase AND target token is known-rebase (stETH / AMPL / OHM staking / lendingPool aToken / OUSD / OETH)
- Rebase-token catalog: stETH, wstETH (cache target NOT wrapped), AMPL, OHM, sOHM, aDAI / aUSDC / aWETH / aWBTC (AAVE aTokens), cDAI / cUSDC / cWETH (Compound cTokens), OUSD, OETH, frxETH, sUSDS, RAI (formerly), Sturdy stable-vaults
- E2E test: `/home/claude-code/.tmp-build/v6/tests/detector-z-e2e.test.js` 5/5 PASS

**Canonical negative example — Origin Dollar `lastOraclePrice` (defended-by-design) [INSPECTED]:**

Origin's `BridgedWOETHStrategy.lastOraclePrice` (file: `contracts/strategies/BridgedWOETHStrategy.sol`, audited 2024+) DOES cache an oracle price to storage, but the cache is **monotone-up only** + documented under-report design. The cache can only INCREASE on update (never decrease); reads where live oracle is below cache return live (lower) value — protocol always under-reports collateral vs reality. Attacker cannot exploit stale-low cache because protocol takes the conservative (lower) of live + cache. This is the **structural answer** to DC-20: don't avoid caching, design the cache + read function so the asymmetric error mode favors the protocol. Future Gate 1 surveys finding `lastOraclePrice`-style cache should check: (a) is the cache monotone-up only? (b) is the read function `min(live, cache)` or `max(live, cache)`? Only `min(live, cache)` is defended.

**Cross-pollination scan targets (active):** every lending market with rebase-token collateral support (Aave forks, Compound forks, Cauldron / Spell ecosystem, Sturdy, Morpho with rebase-asset adapters), every AMM with rebase-token pair (Curve stETH/ETH pools, Uniswap V3 with aToken pairs), every vault wrapping rebase tokens for redistribution.

**Cross-pollination with Doctrine #31a:** DC-20 is the cache-class manifestation; Doctrine #31a is the yield-ceiling calibration that bounds rebase-timing-attack profit. Both apply to same target-class (rebase protocols) but at different layers — DC-20 detects the substrate, Doctrine #31a calibrates the economic ceiling. Gate 1 Step 5 should run BOTH in parallel: if DC-20 finds no cache, Doctrine #31a still applies to bound any timing-attack class.

**Historical note:** Pre-promotion tracked as CANDIDATE-Z (Clara intake bulk-filed 2026-05-24, brain commit e810bd3). The 5-anchor threshold + CauldronV4 $4.7M [INSPECTED] anchor + structural distinction from generic oracle staleness (DC-12) + sub-doctrine relationship to Doctrine #31a justified DC promotion. Operator-approved msg 7725. DC-20 closes the Clara-intake DC promotion wave at 10 total (DC-11..20).

---

## CANDIDATE Pool extensions — Clara Ground-Truth Bulk Intake (2026-05-24, Ogie msg 7695)

The following 7 candidates were filed from the Clara Ground-Truth bulk-intake (`brain/Clara-Ground-Truth-Bulk-Intake.md`, 400-incident corpus, ~$400M+ documented Clara USD). All 7 were operator-approved on 2026-05-24 (msg 7695). Five (T, U, M, O, I) were simultaneously promoted to DC-11 through DC-15 — their full active-catalog spec lives above; the CANDIDATE entries below preserve the historical CANDIDATE-stage framing per brain convention. The remaining 2 (V, W, X, Y, Z) remain at CANDIDATE stage pending additional adjacent worked examples.

### CANDIDATE-T (PROMOTED 2026-05-24 → DC-14, Unbound `from` Approval-Drain in Router/Aggregator). See active catalog DC-14 above.

### CANDIDATE-U (PROMOTED 2026-05-24 → DC-15, AMM Pair Reserve-Skew via Custom Transfer/Burn/Skim, PARENT ABSTRACTION). See active catalog DC-15 above. R + S concrete sub-patterns kept as-is per operator directive.

### CANDIDATE-V (PROMOTED 2026-05-25 → DC-18, Reward / Staking Accumulator Reuse Without Per-User Snapshot Invalidation). See active catalog DC-18 above for full spec, detector status, and sub-pattern enumeration. Original CANDIDATE-stage framing preserved below for historical continuity.

#### CANDIDATE-V (historical, pre-promotion): Reward / Staking Accumulator Reuse Without Per-User Snapshot Invalidation (Clara intake 2026-05-24, proposed)

**Class statement:**

> A staking, farming, or reward-distribution contract tracks reward eligibility via a global per-pool accumulator (`accRewardPerShare`, `cumulativeIndex`, `lastUpdate`) and a per-user record (`userInfo[u].rewardDebt`, `lastClaim`, `pendingReward`). The accumulator is correctly updated on deposit / withdraw, BUT the per-user `rewardDebt` snapshot is NOT correctly invalidated on token transfer (LP-share transfer, NFT-stake transfer, or external delegation). Attacker buys LP shares → transfers to a fresh wallet → both wallets claim the same reward against the unsynchronized per-user records. Alternatively: attacker manipulates the accumulator via flash-loan deposit → withdraws → still has the snapshot to claim against.

**Specialization of:** DC-9 sub-4 (state-not-invalidated repeated mint) applied to reward-distribution rather than mint-by-signature.

**Anchor incidents (Clara):**
- NFD 2022-09-08 **$1.3M** (largest anchor — reward Sybil exploit) **[ASSUMED]** (Clara index-only)
- YYDS 2022-09-08 **$742K** (referral overpayment) **[ASSUMED]**
- BCT 2023-12-09 $2.5K **[ASSUMED]**
- WECOStaking 2023-11-16 (large WECO token count) **[ASSUMED]**
- GDS $14.4M tokens ("Transferable LP Share Reuse" — direct match to class statement) **[ASSUMED]**
- BambooAI, BigBangSwap, FireBird, Floor DAO, FarmZAP, JUICE, OKC, CAROL, EHIVE, GROKD, BurnsDeFi, NFD, Audius (gov-reinit reward), Pancake, BabySwap, Annex, ATK, dYdX-class callback-approval (~20 total tagged `gap:reward-drain`) **[ASSUMED]**
- Combined anchor USD: $3-5M+ named

**Detector primitive:**
- `claim()` / `harvest()` / `withdraw()` / `collect()` reads `userInfo[msg.sender].rewardDebt` OR `userInfo[msg.sender].lastClaim`
- AND updates `rewardDebt` AFTER the reward is paid
- AND there exists a transfer / mint of the staking-token that does NOT call `_updateUser(from, to)`

FP gate: most modern reward systems use SushiSwap's `_updateRewardDebt` pattern in `_beforeTokenTransfer`. Confirm absence of that hook on staking-token transfers.

**Status:** ~20 Clara anchors. Detector EV MEDIUM (FP rate higher; needs Skeptic enrichment to discriminate). Hypothetical catch rate on cross-pollination: 0.10-0.15. Mature pattern, but constantly re-invented in new staking systems.

### CANDIDATE-W (PROMOTED 2026-05-25 → DC-17, ERC2771 / Trusted-Forwarder `_msgSender()` Misuse on Burn / Transfer). See active catalog DC-17 above for full spec, detector status, and sub-pattern enumeration. Original CANDIDATE-stage framing preserved below for historical continuity.

#### CANDIDATE-W (historical, pre-promotion): ERC2771 / Trusted-Forwarder `_msgSender()` Misuse on Burn / Transfer (Clara intake 2026-05-24, proposed)

**Class statement:**

> A token contract inherits OpenZeppelin's `ERC2771Context` (or equivalent trusted-forwarder pattern) and exposes `burnFrom(_msgSender(), amount)` OR `_burn(_msgSender(), amount)` where `_msgSender()` parses the last 20 bytes of `msg.data` when called by a trusted forwarder. Attacker (with no special privilege) crafts a transaction calling the contract directly (NOT through the forwarder) with appended bytes `<victim_address>`. `_msgSender()` returns `<victim_address>` instead of the actual `msg.sender` because the check that the call originated from the trusted forwarder is missing or malformed. Attacker burns the victim's tokens.

**Specialization of:** DC-7 (Validating-Field ≠ Consuming-Field on Adjacent Function Pipelines) — `_msgSender()` validates "trusted forwarder check passed" but consumes "appended-bytes-as-sender" regardless of whether the forwarder check actually fired.

**Anchor incidents (Clara):**
- thirdweb 2023-12-07 $831 (canonical anchor — "Sender Spoof Burn") **[INSPECTED]** (published post-mortem)
- TIME 2023-12-06 **$199K** ("ERC2771 Burn Exploit") **[INSPECTED]** (published post-mortem)
- DominoTT 2023-12-07 $267 ("Forwarder Burn Exploit") **[ASSUMED]** (Clara index-only)

**Detector primitive:**
- contract uses `_msgSender()` from ERC2771Context
- AND function `burn` / `burnFrom` / `_burn` reads from `_msgSender()`
- AND `_msgSender()` does NOT explicitly check `msg.sender == trustedForwarder` before parsing appended bytes

**Status:** 3 anchors (proposal-threshold met). Small-dollar but VERY high catch-rate on cross-pollination — class is mechanical and grep-friendly. Detector-build EV HIGH per build-cost ratio.

### CANDIDATE-X (PROMOTED 2026-05-25 → DC-16, Decimal / Unit-of-Measure Asymmetry in Pricing or Redemption). See active catalog DC-16 above for full spec, detector status, and sub-pattern enumeration. Original CANDIDATE-stage framing preserved below for historical continuity.

#### CANDIDATE-X (historical, pre-promotion): Decimal / Unit-of-Measure Asymmetry in Pricing or Redemption (Clara intake 2026-05-24, proposed)

**Class statement:**

> A function computes `output = price * input / SCALE` where `price` is denominated in one token's precision (e.g., 8-decimal Chainlink feed) and `input` is denominated in a different token's precision (e.g., 18-decimal ERC20 amount). The `SCALE` constant assumes a third precision (e.g., `1e8` or `1e18`). The arithmetic produces a value off by 10^N from the intended result, allowing attackers to redeem far more (or pay far less) than the protocol designer intended.

**Specialization of:** Sibling of CANDIDATE-H (C-runtime overflow) and CANDIDATE-K (float-in-deterministic-VM) — same parent family "fixed-precision arithmetic surface gaps" (per CANDIDATE-E parent-family notes above).

**Anchor incidents (Clara):**
- Blueberry 2024-02-23 **$1.3M** ("Decimal mismatch exploit") — canonical anchor **[INSPECTED]** (published post-mortem)
- ENF 2023-02-24 **$5.2M** ("Redeem decimal mis-scaling") **[ASSUMED]** (Clara index-only)
- Nowswap V1 2021-09-15 **$1.1M** ("WETH mis-scaled KLOSS invariant") **[ASSUMED]**
- Combined anchor USD: **$7.6M**

**Detector primitive:**
- arithmetic in financial function: `$RESULT = $A * $B / $C`
- where `$A` reads from chainlink-feed (8-dec) OR oracle that returns scaled-int
- AND `$B` is an ERC20 amount (likely 6 or 18 dec)
- AND `$C` is a hardcoded constant
- AND the contract does NOT normalize `$A` or `$B` to a canonical precision before the operation

FP gate: most contracts that do `price * amount / 1e18` DO handle decimals correctly via explicit normalization. The detector flags candidates; manual triage confirms the actual mismatch.

**Status:** 3 anchors (proposal-threshold met). High-EV class because each hit is typically a CRITICAL severity. Detector EV MEDIUM-HIGH; needs Skeptic semantic check (decimal-of-A vs decimal-of-B vs SCALE constant).

### CANDIDATE-Y (PROMOTED 2026-05-25 → DC-19, `from == to` Self-Transfer Accounting Mutation). See active catalog DC-19 above for full spec, detector status, and sub-pattern enumeration. Original CANDIDATE-stage framing preserved below for historical continuity.

#### CANDIDATE-Y (historical, pre-promotion): `from == to` Self-Transfer Accounting Mutation (Clara intake 2026-05-24, proposed)

**Class statement:**

> A token's `_transfer(from, to, amount)` does `_balances[from] -= amount; _balances[to] += amount;` WITHOUT a `from == to` short-circuit. If the token has fee-on-transfer, deflationary burn, reflection, or other accounting mutations layered on top, calling `_transfer(addr, addr, amount)` produces: (a) double-counted accounting (balance goes UP by `amount * tax%`), or (b) silent mint (`_balances[addr] += amount` runs first, then `-= amount * (1-tax)`), or (c) supply inflation (custom hook fires twice on the same address). Attacker uses self-transfer in a loop to mint balance from nothing.

**Specialization of:** Parent family with DC-15 (AMM pair-skew); both rely on custom transfer logic that's correct in two-party scenarios but broken on edge inputs. CANDIDATE-Y is ALSO enumerated as DC-15.Y sub-pattern (filed both as standalone CANDIDATE and as sub-pattern of DC-15 — the same exploit composes both at the token-class and pair-class layers).

**Anchor incidents (Clara):**
- SSS 2024-03-21 **$4.6M** ("Self-transfer drain" — largest single anchor) **[INSPECTED]** (published post-mortem)
- DeezNutz 2024-02-21 **$170K** **[ASSUMED]** (Clara index-only)
- MINER 2024-02-14 **$77.7K** **[ASSUMED]**
- BRAToken 2023-01-10 **$41K** ("Self-transfer tax bug") **[ASSUMED]**
- APIG 2023-09-08 **$169K** **[ASSUMED]**
- LPC 2022-07-25 **$46K** **[ASSUMED]**
- Plus 2 additional implied class anchors
- Combined anchor USD: ~**$5M**

**Detector primitive:**
- token's `_transfer` / `_update` does NOT include `if (from == to) return;` short-circuit
- AND contract has fee-on-transfer / reflection / custom `_balances` mutation

**Status:** 8 anchors (proposal-threshold met). Detector spec trivial: AST grep + presence-of-custom-hook qualifier. HIGH detector-EV per build-cost.

### CANDIDATE-Z (PROMOTED 2026-05-25 → DC-20, Rebase Token Cache Invalidation Failure). See active catalog DC-20 above for full spec, detector status, and sub-pattern enumeration. Original CANDIDATE-stage framing preserved below for historical continuity.

#### CANDIDATE-Z (historical, pre-promotion): Rebase Token Cache Invalidation Failure (Clara intake 2026-05-24, proposed)

**Class statement:**

> A rebase token (Ampleforth-class, OHM staking, AAVE aTokens, Compound cTokens, stETH) exposes `balanceOf(u) = _shares[u] * _index() / _SCALE`. A downstream consumer (vault, AMM, lending market) caches `balanceOf(u)` at time T and consumes the cached value at time T+1 across an index update. The cached value is now stale — either over-priced (rebase up, attacker over-redeems) or under-priced (rebase down, protocol over-mints to attacker). Attacker triggers the index update mid-flow.

**Anchor incidents (Clara):**
- CauldronV4 2024-01-30 **$4.7M** ("Debt rebase exploit") — canonical anchor **[INSPECTED]** (published post-mortem)
- ElasticSwap 2022-12-13 **$500K** ("Rebase exploit") **[INSPECTED]** (published post-mortem)
- QUATERNION 2023-01-18 $4K ("Pair-rebase accounting drift") **[ASSUMED]** (Clara index-only)
- HATE 2023-09-05 **$12.8K** **[ASSUMED]**
- QWAStaking 2023-09-05 $696 **[ASSUMED]**
- Combined anchor USD: ~**$5.3M**

**Detector primitive:**
- contract calls `IERC20(rebaseToken).balanceOf(...)`
- AND caches result to storage / memory
- AND uses cached result AFTER any external call that could trigger rebase
- AND target token is known-rebase (stETH / AMPL / OHM staking / lendingPool aToken)

**Status:** 5 anchors. Detector spec needs rebase-token catalog + cross-reference. MEDIUM EV.

**Canonical negative example — well-designed defense against Doctrine #31a cache class [INSPECTED]:**

**Origin Dollar `BridgedWOETHStrategy.lastOraclePrice`** (file: `contracts/strategies/BridgedWOETHStrategy.sol`, audited 2024+) — Origin's bridged-WOETH strategy DOES cache an oracle price to storage (`lastOraclePrice`), but the cache is **monotone-up only** + documented under-report design. The cache can only INCREASE on update (never decrease), and any read where the live oracle is below the cache returns the live (lower) value — so the protocol always under-reports collateral value vs reality. Attacker cannot exploit a stale-low cache because the protocol takes the conservative (lower) of live + cache for collateralization. This is the **structural answer** to CANDIDATE-Z: don't avoid caching, design the cache + read function so that the asymmetric error mode favors the protocol.

Future Gate 1 surveys finding `lastOraclePrice`-style cache should check: (a) is the cache monotone-up only? (b) is the read function `min(live, cache)` or `max(live, cache)`? Only `min(live, cache)` is defended; `max(live, cache)` OR raw-cache-read is the bug class. Operator approval: Ogie msg 7715 proposal B, 2026-05-25. Cross-reference: `data/lane1/gate2-clones/origin-dollar-rebase-sandwich-foreclosed.md` V3 verification.

---

## DC-7 sub-pattern — Cross-Language Guard-Coverage Asymmetry (added 2026-05-26 evening — rhino.fi TON-vs-EVM canonical anchor)

**Class statement:**

> When a protocol has parallel implementations across multiple languages (EVM Solidity + TON FunC + Solana Anchor + Move + Cairo + CosmWasm + etc.), the SAME logical guard (pause, replay, role-check, ownership, threshold) should be present on equivalent code paths across all languages. **Asymmetric guard coverage** — where one language enforces the guard on a code-path family but another language enforces it on only a subset of equivalent paths — IS the finding. The deeper-audited language gets one threat model; the lighter-audited language gets another; the discrepancy reveals which threat model the team actually believes in.

**Specialization of:** DC-7 base (Validating-Field ≠ Consuming-Field). DC-7 base is INTRA-language (within one pipeline). This sub-pattern extends OUT of language to compare same guard / same protocol / different implementations. Sibling to Filecoin-3 (cross-language enum repr divergence between native VM and FEVM — same DC-7 family).

**Anchor — rhino.fi TON-vs-EVM deposit-pause asymmetry:**

- TON FunC `ton-deposit/contracts/bridge_contract.fc` checks `global_deposits_blocked` flag on BOTH `op::transfer_notification` (jetton deposit, line 122) AND `op::deposit_native` (TON native, line 165) — **symmetric coverage** [INSPECTED via hunt-file source-read]
- EVM Solidity `bridge-deposit/DVFDepositContract.sol` checks `_areDepositsAllowed` modifier on `deposit(line 70)` + `depositNative(line 103)` ONLY. Functions `depositWithId(line 84)`, `depositWithPermit(line 95)`, `depositNativeWithId(line 113)` are MISSING the modifier — **asymmetric coverage** [INSPECTED via hunt-file source-read]
- Threat-model implication: TON team treats commitment-ID deposits as MUST-PAUSE-with-emergency; EVM team treats commitment-ID deposits as off-chain-rate-limited, NOT-emergency-pausable. In an authorized-keeper-key-leak scenario, the EVM contract cannot fully halt deposits while the TON contract CAN.
- Severity: **LOW-MEDIUM** in isolation (depends on incident-response surface), but the cross-language asymmetry IS the load-bearing observation. Operator-decision finding (rhino.fi C5).

**Why it's not just DC-7 base:** DC-7 base requires a validation step on-chain (e.g., `validating field` like `receiptTokenIn` ≠ `consuming field` like `actualAmount`). Cross-Language Guard-Coverage Asymmetry compares INSTEAD of validating-vs-consuming — it compares GUARD APPLICATION across language implementations. The same guard exists in both languages; the asymmetry is in which CODE PATHS receive the guard. This is a meta-level DC-7 (DC-7 at the architecture-comparison layer, not the function-internal layer).

**Detector primitive:**

- protocol has parallel implementations across ≥2 languages (multi-substrate bridge / interop / cross-chain protocol)
- for each guard name in protocol corpus (pause flag, replay protection, role check, threshold validate): enumerate entry-point functions touching equivalent logical action in each language
- diff the guard-application set: which entry points in each language carry the guard? Asymmetry across languages → finding candidate
- FP gate: confirm the asymmetric code path is genuinely a parallel implementation (not a language-specific behavior or a deprecated path)

**Status:** 1 anchor (rhino.fi TON-vs-EVM). Promotion to PERMANENT DC-7 sub-pattern requires 2nd cross-language anchor. High cross-pollination value because every multi-substrate bridge potentially exhibits this class.

**High-EV cross-pollination targets:**

- **Wormhole** — EVM Solidity + Solana Rust + Cosmos Go + Aptos Move + Sui Move. Pause-flag coverage diff across substrates is a known target class.
- **LayerZero** — EVM Solidity + Aptos Move + Solana Rust. OFT default-DVN guard coverage across endpoints.
- **ZetaChain** — Cosmos Go + EVM Solidity. Cross-chain deposit-pause + role-check coverage.
- **Stargate V2** — EVM Solidity + non-EVM endpoints. Bus fee + pause coverage.
- **Hop Protocol** — EVM Solidity (multiple chains, same contract). Pause coverage across chains.
- **Synapse Protocol** — EVM Solidity + Ethereum/Optimism/Arbitrum-specific deployments + Optics-based message passing. Validator-pause coverage.
- **Multichain (Anyswap)** — historical (post-incident) — would have been canonical anchor if pre-collapse audit had applied this lens.

**Cross-reference:**

- DC-7 base (Validating-Field ≠ Consuming-Field) — sub-pattern parent
- Filecoin-3 (cross-language enum repr divergence between native VM and FEVM) — sibling cross-language DC-7 extension
- DC-8 (Anchor-Signer-Validation moved out of Accounts struct) — Solana-language sibling
- Cross-Domain-Fragility-Laws.md — interop family laws

**R8 grade:** anchor `[INSPECTED]` (code-confirmed coverage diff); cross-pollination targets `[ASSUMED]` (lens applicable; case-by-case verification needed).

**Authority:** rhino.fi Gate 1 proposal #3 (2026-05-26 evening, `hunts/2026-05-26-rhinofi-immunefi-gate1.md`), Ogie msg 7846 hunting cycle.

---

## DC-9 sub-pattern 5 — Asset-vs-Receipt Accounting Asymmetry (added 2026-05-26 evening — Olympus ConvertibleDepositFacility + DepositManager paired anchor)

**Class statement:**

> An ERC4626-backed deposit facility computes a minted token amount (e.g., OHM, shares, receipt) from a **user-input field** (e.g., `receiptTokenIn`, `depositAmount`, `assets`) while the actual asset moved by the underlying call is a **return-value field** (e.g., `actualAmount`, `actualShares`). When the two fields can diverge (ERC4626 share-rounding-down on tiny inputs, vault fee deductions, or explicit "may return 0" documentation), and the calling layer DISCARDS the return-value and mints based on the user-input, the protocol's mint-vs-asset accounting drifts. Compound effect appears when the operator-liability ledger is ALSO decremented by the user-input field (not the return-value), so the ledger drifts in the same direction as the mint-vs-asset drift. Repeated dust-conversion exploits inflation-from-nothing.

**Specialization of:** DC-9 (Privileged State Mutation Without Defense-in-Depth) family. Sibling to:
- DC-9 sub-1 (unchecked mint)
- DC-9 sub-2 (zero-timelock migration)
- DC-9 sub-3 (upgradeable-hook-no-timelock)
- DC-9 sub-4 (state-not-invalidated repeated-mint — closely related; sub-5 is the paired-ledger variant where the asymmetry is between mint-driver and asset-moved rather than between mint repetition and state invalidation)
- DC-7 (validating-field ≠ consuming-field — the validating field here is `receiptTokenIn`, the consuming field is `actualAmount`)

**Anchor — Olympus ConvertibleDepositFacility.convert + DepositManager.withdraw (paired C1+C2):**

- `src/policies/deposits/ConvertibleDepositFacility.sol:301-366` (`convert`): accumulates `convertedTokenOut += previewConvertOut` based on user-input `depositAmount` (line 320-329), then calls `DEPOSIT_MANAGER.withdraw(WithdrawParams{... amount: receiptTokenIn ...})` (line 346-355), DISCARDS the returned `actualAmount`, mints OHM based on `convertedTokenOut`. [INSPECTED]
- `src/policies/deposits/DepositManager.sol:293-324`: returns `actualAmount` (line 295), documented at line 245 as "Given a low enough amount, the actual amount withdrawn may be 0. This function will not revert in such a case." [INSPECTED]
- `src/policies/deposits/DepositManager.sol:313-321` (paired ledger half — C2): line 314 `_assetLiabilities[key] -= params_.amount` runs BEFORE `_withdrawAsset` (line 318). If `_withdrawAsset` returns `actualAmount < params_.amount`, the recorded liability is over-decremented. Over time, `_assetLiabilities` drifts BELOW true outstanding obligation. [INSPECTED]
- Solvency check (`_validateOperatorSolvency` line 353-367) runs AFTER the liability has already been reduced — solvency check is computed on the drifted ledger, not the true ledger. Compound drift. [INSPECTED]
- Comment at ConvertibleDepositFacility line 340-345 acknowledges the delta ("the actual amount withdrawn may differ from receiptTokenIn by a few wei") — but DepositManager comment at line 245 says actualAmount can be **0**, which is qualitatively different from "a few wei."
- Exploit construction: user supplies `depositAmount` small enough that `_withdrawAsset` returns 0 (1 wei against high share/asset ratio vault). User receives OHM minted on `previewConvertOut`; ZERO asset reaches TRSRY; operator liability decremented by `params_.amount` despite no asset moving. Repeated dust-conversion = inflation-from-nothing.

**Detector primitive:**

- function calls `IERC4626(vault).withdraw(amount, ...)` OR `IERC4626(vault).redeem(shares, ...)` OR equivalent "asset-moved-may-differ-from-requested" external call
- AND the calling function uses the **request parameter** (not the return value) for downstream accounting (mint amount, liability decrement, share burn)
- AND the request parameter and return value are NOT enforced equal via `require(actualAmount == amount, ...)`
- AND the divergence is NOT covered by a downstream solvency/invariant check that consumes the post-call true state (not the pre-call assumed state)

**FP gate:** many ERC4626 wrappers DO normalize between request and return via explicit `-1` rounding adjustments (DepositManager line 235-238 has this for `maxClaimYield`, but NOT for the withdraw path). Detector should flag the asymmetry; manual triage confirms the no-normalization case.

**Status:** 1 paired anchor (Olympus C1+C2). Promotion to PERMANENT DC-9 sub-5 requires 2nd anchor with similar asset-vs-receipt-vs-ledger compound. Candidate 2nd anchors:

- Any ERC4626-wrapping deposit facility that issues a fungible mint based on request param (e.g., yield-token wrappers, perpetual collateral managers, structured-product deposit facades)
- Convex / Aura LP-token wrappers (request-param-driven mint with ERC4626 underlying)
- Pendle PT/YT/SY interop layers where SY-mint is request-driven
- Sky USDe / sUSDe conversion paths if they wrap ERC4626

**Severity profile:** the dust-amplification factor governs severity. Single dust conversion = sub-cent attacker gain. Repeated in a loop (gas-optimized batch) = significant inflation. Severity in real exploits typically rises to MEDIUM-HIGH range, capped by gas cost vs OHM-mint-per-dust ratio.

**R8 grade:** anchor `[INSPECTED]` (code-confirmed mechanic on Olympus C1+C2 paired finding); exploit-magnitude `[ASSUMED]` pending Foundry PoC measuring dust-conversion drift across realistic vault states.

**Cross-reference:**

- DC-9 sub-4 (state-not-invalidated repeated-mint) — closely related sibling; sub-5 is the paired-ledger variant
- DC-7 base (Validating-Field ≠ Consuming-Field) — same finding viewed from inter-function field-binding angle
- CANDIDATE-I (ERC4626 share-asymmetry on cumulative accounting) — earlier framing of the same class without the paired-ledger compound

**Authority:** Olympus Gate 1 proposal #1 (2026-05-26 evening, `hunts/2026-05-26-olympus-immunefi-gate1.md`), Ogie msg 7846 hunting cycle. Caveat: anchor is `[ASSUMED]`-scope (ConvertibleDepositFacility + DepositManager not in the 12-asset legacy list visible without SPA pagination; scope-verify pending against full Immunefi 72-asset list before Gate 2).

---

## DC-9 sub-2 DEFENSE PATTERN — Governance Ward-Removal Neutralizes In-Source Privileged Mutation (added 2026-05-27 — Sky LockstakeMigrator anchor)

**Class statement (defense):**

> A contract that retains a privileged registry-mutation call in its source code (e.g., `vat.file(ilk, "line", 55M)`) but is NOT a current ward on the target registry exhibits **dead-code at the privileged call-site**: any invocation will revert with the registry's `not-authorized` error. The source-level pattern appears risky to source-only Gate 1 inspection, but the on-chain state has neutralized it. This is a VALID defense pattern when (a) the privileged mutation was needed temporarily (migration, bootstrap, parameter-config), (b) governance has since denyed the contract on the registry, and (c) the source retains the call for archaeological/audit-traceability reasons or because removing it would require redeploying an immutable.

**Specialization of:** DC-9 sub-2 (zero-timelock migration) defense surface. Sibling defense to:
- "Pause + Sunset" pattern (contract self-pauses + governance signals deprecation)
- "Self-Destruct After Migration" pattern (contract removes itself from chain entirely)
- "Multisig Threshold Inflation" pattern (raise required-sigs to functionally-impossible level)
- "Ward Removal" (this pattern — governance-side state change, no source modification)

**Anchor — Sky LockstakeMigrator (2026-05-27 worked example #1):**

- `lockstake/src/LockstakeMigrator.sol:144`: `vat.file(newIlk, "line", 55_000_000 * RAD);` — appears as a privileged registry mutation. [INSPECTED]
- `lockstake/deploy/LockstakeInit.sol:218`: `dss.vat.rely(address(se.migrator));` — confirmed migrator WAS relied at init-time. [INSPECTED]
- ChainSecurity Sep 26 2025 audit §2 Setup: "It is further assumed the LockstakeMigrator is deprecated (as **August 2025 it is no longer a ward on Vat**). Otherwise, it could directly change ilk.line during migration." [INSPECTED]
- Governance commit `43662905a3504debc48d7ba3b3907c98fffb35f8` "Migrator Reset Line" Aug 2 2025: migrator denyed on Vat via `vat.deny(LOCKSTAKE_MIGRATOR)` spell. [INSPECTED — via ChainSecurity changelog]
- Net effect: `vat.file(newIlk, "line", 55_000_000 * RAD)` reverts at run-time with `Vat/not-authorized`. The entire `onVatDaiFlashLoan` callback path is dead-code on mainnet. Users calling `migrate()` with art>0 will hit this revert. [ASSUMED — current on-chain `vat.wards(LOCKSTAKE_MIGRATOR)==0` not bytecode-verified via cast; audit assumption Sep 2025 is dispositive]

**Detection signature (offense — for Gate 1 dispatch):**

When scanning a contract for DC-9 sub-2 candidates, after identifying the privileged-mutation call-site, verify:
1. Does the contract NEED to be a ward on the target registry to make the call work?
2. Is the contract CURRENTLY a ward at the latest block? (`cast call <REGISTRY> "wards(address)(uint256)" <CONTRACT> --rpc-url $ETH_RPC`)
3. If NOT a ward → the candidate is DEAD-CODE-FORECLOSED. File under DC-9 sub-2 defense pattern, not as a finding.

**Detection signature (defense — for governance hygiene auditing):**

When auditing a protocol's privilege-removal hygiene:
1. List every contract that was ever relied on a registry (grep deploy scripts + chainlog for `rely(X)` calls)
2. For each, check if a corresponding `deny(X)` was executed at a later block (governance spell history)
3. If a contract has rely-without-deny AND has a privileged call-site that no longer needs to be live → flag as "stale ward" (possible attack surface if the contract gets compromised by a different vulnerability that allows it to call back to the registry)
4. If a contract has rely-followed-by-deny AND retains a privileged call-site in source → defense pattern confirmed (intentional dead-code, archaeological)

**FP gate:** Buzz Gate 1 source-only inspection cannot distinguish "live privileged call" from "dead privileged call" without on-chain ward verification. Phase 0 dedup must include `cast call wards()` query OR audit-PDF grep for explicit "no longer a ward" / "deprecated" / "denyed" remediation language to avoid Foundry waste.

**Severity profile (when DEFENSE is confirmed):** $0 — pattern is operational dead-code. Bug class is structurally neutralized. Any submission citing this call-site as a vulnerability will be rejected at triage with the audit-disclosed deprecation as the rebuttal.

**Severity profile (when defense FAILS — historical hypothetical):** If a future protocol implements the same source pattern but FORGETS to deny the contract on the registry, the original DC-9 sub-2 exposure becomes live. The $55M migration ceiling (or whatever the line cap is) becomes drainable by anyone who can trigger the call path. Sky's 9-month gap between deprecation (Aug 2 2025) and Buzz's verification (May 27 2026) demonstrates that the defense pattern is robust when actually deployed — but the absence of source-level enforcement means a future fork or copy-pasted code could re-introduce the live exposure.

**R8 grade:** anchor `[INSPECTED]` (audit-document quote + deployment script + source code all confirmed); on-chain ward state `[ASSUMED]` pending future `cast` verification.

**Cross-reference:**
- DC-9 sub-2 base (zero-timelock migration) — this is the DEFENSE counterpart to the OFFENSE pattern
- Doctrine #27 Corollary B (Remediation-Language Search Beats Lens-Label Search) — the dedup technique that surfaces this defense pattern at Phase 0
- Doctrine #34 sub-rule 34.2 candidate (post-mitigation vs post-null distinction) — pending 2nd anchor

**Status:** 1 anchor (Sky LockstakeMigrator). Promotion to PERMANENT DC-9 sub-2 defense pattern requires 2nd anchor with similar ward-removal-without-source-modification pattern. Candidate 2nd anchors:
- Any MakerDAO/Sky module that was deprecated via governance spell rather than redeployment
- Any Aave V2/V3 contract with admin permission removed via governance vote
- Any Compound governance-deprecated module
- Any Yearn / Curve gauge-controller deprecated via parameter-only governance action

**Authority:** Sky LockstakeMigrator Gate 2 foreclosure receipt (`hunts/2026-05-27-sky-c1-gate2-foreclosure.md`), 2026-05-27.

---

_Patterns: Defense Classes | v2.5 | 2026-05-27 | Day 27 evening — DC-9 sub-2 DEFENSE PATTERN 2nd anchor added (Multisig-with-Threshold-≥3-of-≥5 = Centralization-Accepted soft-foreclose). Anchor: DeFi Saver AdminVault `0xCCf3d848e08b94478Ed8f46fFead3008faF581fD` controlled by Gnosis Safe v1.1.1 `0x25eFA336886C74eA8E282ac466BdCd0199f85BB9` at 3-of-6 threshold, no attached timelock module, no on-chain incident in 5-year operational history. Pattern: programs with zero-timelock changeOwner/changeAdmin but **N-of-M multisig with N >= 3, M >= 5** are typically classified by triage as "Centralization Risk - Known/Accepted" or excluded under "Attacks requiring privileged access from within the organization." Pre-flight detection at Gate 1.5 (post-Gate 1, pre-Gate 2 Foundry): probe `getThreshold()` + `getOwners()` via cast on the admin address. If threshold/N ratio satisfies the 3-of-≥5 rule → SOFT FORECLOSE; if 1-of-N, EOA, or threshold == 1 → escalate to HIGH-severity DC-9 sub-2 finding. Cumulative DC-9 sub-2 DEFENSE PATTERN now has 2 anchors (Sky LockstakeMigrator governance-deprecation + DeFi Saver multisig-with-no-timelock) — both demonstrate operational defenses that neutralize the in-source DC-9 sub-2 substrate. Companion: NEW Doctrine #38 (Pure Pass-Through `*WithSig` Wrappers Are STRUCTURAL FORECLOSE — DeFi Saver 7-contract anchor). Authority: DeFi Saver Gate 2 foreclosure receipt (`hunts/2026-05-27-defisaver-c1-gate2-foreclosure.md`)._

_Patterns: Defense Classes | v2.4 | 2026-05-27 | Day 27 — DC-9 sub-2 DEFENSE PATTERN added (Governance Ward-Removal Neutralizes In-Source Privileged Mutation; Sky LockstakeMigrator anchor, ChainSecurity Sep 2025 explicit deprecation + "Migrator Reset Line" governance commit Aug 2 2025). Companion to Doctrine v3.8 Corollary B (Remediation-Language Search Beats Lens-Label Search) — Phase 0 audit-PDF grep technique that surfaces these defense patterns. Single anchor; promotion to PERMANENT requires 2nd anchor (candidate MakerDAO/Aave/Compound deprecated modules). Authority: Sky Gate 2 dispatch outcome._

_Patterns: Defense Classes | v2.3 | 2026-05-26 evening | Day 26 evening batch — Ogie msg 7846 hunting cycle. Adds: (1) DC-7 sub-pattern Cross-Language Guard-Coverage Asymmetry (rhino.fi TON-vs-EVM canonical anchor — TON FunC checks `global_deposits_blocked` symmetric on jetton+native; EVM Solidity asymmetric, depositWithId/depositWithPermit/depositNativeWithId MISSING the pause modifier); (2) DC-9 sub-pattern 5 Asset-vs-Receipt Accounting Asymmetry (Olympus ConvertibleDepositFacility.convert + DepositManager.withdraw paired C1+C2 anchor — mint-driver field is `receiptTokenIn` while asset-moved field is `actualAmount`, with paired-ledger drift compound effect; documented at DepositManager line 245 as "actualAmount may be 0"). Companion Doctrine.md at v3.6 (Doctrine #29 v1.1 two-sided MIN-cap amendment + Doctrine #37 CANDIDATE Audited-and-Frozen Substrate). Authority: 3 Gate 1 hunt files (Olympus + CoW + rhino.fi)._

_Patterns: Defense Classes | v2.2 | 2026-05-26 | Day 26 batch — Ogie msg 7817 (41 frozen brain proposals from 5-target hunting day). Adds: (1) DC-7 sub-pattern "Cross-language enum repr divergence between native VM and FEVM" (Filecoin SectorStatusCode anchor, proposal C-Filecoin-3); (2) DC-12 sub-7f "PriceOracleProxy-class wrapper strips staleness from v1 oracle" (JustLend + Notional V3 paired anchor, proposal JustLend #1, hunt 2026-05-26); (3) DC-13 sub-pattern 4 "notification-callback admits attacker-controlled notifee" (Filecoin FIP-0109 anchor, proposal C-Filecoin-1); (4) CANDIDATE-R "Pre-Rotation Deploy-Bootstrap Window" (Stacks sBTC `current-signer-principal` anchor, renamed from hunt-file CANDIDATE-Q to avoid collision with existing CANDIDATE-Q Cap TOTP allowlist). Companion Doctrine.md at v3.4 (now includes Doctrine #35 NEW Trust-Boundary Surface Asymmetry + Doctrine #34 dual-to-quad-anchor enrichment). Authority: Ogie msg 7817 (Day 26 frozen brain proposals batch from Raydium $505K + Hydration $500K + Stacks $250K + Filecoin $150K + JustLend $50K + ALEX retrospective)._

_Patterns: Defense Classes | v2.1 | 2026-05-25 | Batch-commit of 6 brain edits across two msg-7770 (A, B, E, H) + msg-7772 (C-Cap-1, C-Cap-2). Edits A/B/E/H per v2.0 footer. Additional C-Cap-1: CANDIDATE-Q "Permissionless TOTP/Digest Grow-Only Allowlist" filed as DC-5 sub-pattern (Cap Sherlock EigenOperator.sol:105-111 anchor — promotion path requires 2 additional anchors). C-Cap-2: CANDIDATE-A sub-class enrichment "LayerZero OFT default-DVN trust grants unrestricted underlying mint" (Cap Sherlock TempoBridgeUpgradeable.sol:83-98 anchor — every LayerZero OFT consumer without per-message DVN verification inherits the surface). Companion Doctrine.md at v3.3 (now includes Doctrine #34 Post-Audit Composition Multiplier per C-Cap-3). Authority: Ogie msg 7770 + 7772 (2026-05-25 18:22-18:31 UTC)._
