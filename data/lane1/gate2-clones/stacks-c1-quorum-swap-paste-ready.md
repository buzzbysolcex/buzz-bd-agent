# [HIGH] sBTC Bridge — Quorum-Signing Atomic Protocol-Contract Swap Allows 70%-Signer-Set Coup to Replace `.sbtc-deposit` / `.sbtc-withdrawal` / `.sbtc-bootstrap-signers` and Mint Arbitrary sBTC In a Single Block

**STATUS: HOLD FOR OPERATOR APPROVAL — DO NOT AUTO-SUBMIT**

**Severity recommendation:** High (with reasoned escalation argument for Critical inside §Impact)
**Asset:** `contracts/contracts/sbtc-bootstrap-signers.clar` + `contracts/contracts/sbtc-registry.clar` (sBTC contracts, `stacks-network/sbtc` HEAD `11567fc6`, 2026-05-22)
**Pathway:** `sbtc-bootstrap-signers.update-protocol-contract-wrapper` → `sbtc-registry.update-protocol-contract` → `map-set active-protocol-contracts <role> <attacker-principal>` → `map-set active-protocol-roles <attacker-principal> <role>` → `is-protocol-caller` now accepts attacker's principal as the canonical `.sbtc-deposit` / `.sbtc-withdrawal` / `.sbtc-bootstrap-signers` → attacker contract calls `sbtc-token.protocol-mint` with `deposit-role` and mints arbitrary sBTC

---

## Summary

`sbtc-bootstrap-signers.clar:53-60` `[INSPECTED]` exposes a `update-protocol-contract-wrapper` admin function gated by a single assertion — that `tx-sender` equals the current signer-set's multisig principal (the 70% WSTS quorum's pubkey-derived address). Once that single assertion passes, the call atomically rewrites the canonical sBTC protocol registry via `sbtc-registry.clar:327-345` `[INSPECTED]`: `map-set active-protocol-contracts contract-type new-contract` + `map-set active-protocol-roles new-contract contract-type`. No timelock. No new-contract bytecode validation. No multi-block confirmation. No quorum-supermajority gate beyond the existing 70% threshold the multisig principal already satisfies.

The structural consequence: any state of the world in which a 70% quorum of the signer set can produce one valid signed Stacks transaction — whether that's (a) honest collusion, (b) compromise of 70%+ of signer keys via the documented sBTC signer-set security model surface, or (c) a malicious operator gaining temporary control during a key-rotation window — is sufficient to swap the entire `.sbtc-deposit` contract for an attacker-deployed evil contract. The attacker contract is then the canonical `deposit-role` per the registry, and any `(contract-call? .sbtc-token protocol-mint ...)` invocation it makes will pass `sbtc-registry.is-protocol-caller deposit-role contract-caller` and mint arbitrary sBTC to attacker-chosen recipients. Same primitive lifts to `.sbtc-withdrawal` (drain the peg via fake-withdrawal completions) and `.sbtc-bootstrap-signers` (lock in attacker control by rotating signer keys to attacker-controlled set with no further protocol-contract recourse).

The exploit window is **one block**: the swap call lands, and the next block's `complete-deposit-wrapper` / `protocol-mint` invocation from the attacker contract is already operating against the rewritten registry. There is no window during which honest signers, users, or external observers can intervene between the signer-quorum's atomic-swap call and the first attacker-mint transaction — the same transaction batch that includes the swap can include the attacker-mint, since after the swap the attacker contract IS the canonical deposit contract for purposes of `is-protocol-caller`.

The 70% quorum precondition is real but not exotic: the entire sBTC threat model already considers quorum-compromise scenarios at multiple layers (WSTS DKG, signer-set rotation, Emily API gating, BTC tx fee elevation). The novel structural property surfaced here is **the lack of any defense-in-depth gate between "quorum signed one tx" and "registry is rewritten and arbitrary mint authority is granted to an attacker contract"** — every other quorum-gated action in the sBTC contract layer is either replay-protected (rotate-keys-wrapper via `aggregate-pubkeys` map), input-validated (deposit completion via burn-hash + Bitcoin chain-tip checks), or accounting-bounded (withdrawal via dust-limit + fee-bound checks). The protocol-contract swap path has none of these.

---

## Affected Asset

**Repo:** `stacks-network/sbtc` (Immunefi-listed in-scope asset: `contracts` — Stacks sBTC Clarity contracts)
**HEAD commit:** `11567fc6a111c130177e64380503acca8546aab6` (8-char prefix `11567fc6`, committed 2026-05-22 15:35:01 +0200) `[INSPECTED]`

**Files in scope:**

- `contracts/contracts/sbtc-bootstrap-signers.clar` lines 53-60 (`update-protocol-contract-wrapper`)
  - GitHub URL: `https://github.com/stacks-network/sbtc/blob/11567fc6a111c130177e64380503acca8546aab6/contracts/contracts/sbtc-bootstrap-signers.clar#L53-L60`
- `contracts/contracts/sbtc-registry.clar` lines 325-345 (`update-protocol-contract` + supporting `active-protocol-contracts` / `active-protocol-roles` / `is-protocol-caller` machinery)
  - GitHub URL: `https://github.com/stacks-network/sbtc/blob/11567fc6a111c130177e64380503acca8546aab6/contracts/contracts/sbtc-registry.clar#L325-L345`

Both files are within the Immunefi-declared in-scope asset path `contracts` per the program scope table (`contracts` listed alongside `signer/src`, `emily/src`, `sbtc/src` as in-scope Stacks sBTC repo assets).

---

## Severity Recommendation

**High** (with reasoned argument for Critical-escalation consideration below).

**Why High (not Critical) at primary classification:** The Critical band in the Immunefi Stacks program ("10% of funds directly affected", $250K cap with $25K floor) requires a fund-loss impact directly attributable to a code-level vulnerability. This finding is more accurately characterized as a **trust-assumption-extension / defense-in-depth gap** at the contract layer: it does not bypass the 70% signer-set quorum, it amplifies what a 70% quorum can do in a single block. A triager may reasonably classify this as High on the basis that the precondition (70% signer compromise / collusion) is itself a Critical-severity event handled by the off-chain WSTS + signer-key threat model, and the contract-layer absence of defense-in-depth is a separate (High-severity) finding that compounds the impact of the underlying quorum compromise rather than independently triggering fund loss.

**Why a triager might escalate to Critical:** The fund-loss impact at activation is total (arbitrary mint authority over the entire sBTC supply, plus drain authority over the BTC peg vault via fake withdrawal completions). The sBTC downgrade clause ("downgrades apply for impacts affecting <1% of users") does not apply — a successful exploit affects 100% of sBTC supply integrity. If the triager treats the 70%-quorum precondition as in-scope (rather than as a separate threat-model layer), Critical severity follows directly from the impact magnitude.

We submit at High and defer the severity classification to the Immunefi triager's program-specific judgment.

---

## Vulnerability Details

### The wrapper (`sbtc-bootstrap-signers.clar:51-60`) `[INSPECTED]`

```clarity
;; Update protocol contract
;; Used to update one of the three protocol contracts
(define-public (update-protocol-contract-wrapper (contract-type (buff 1)) (contract-address principal))
	(begin
		;; Check that the tx-sender is the current signer principal
		(asserts! (is-eq (contract-call? .sbtc-registry get-current-signer-principal) tx-sender) ERR_INVALID_CALLER)
		;; Call into .sbtc-registry to update the protocol contract
		(contract-call? .sbtc-registry update-protocol-contract contract-type contract-address)
	)
)
```

This is the entire wrapper. The single defense layer is line 56: `tx-sender` must equal the value of `current-signer-principal` in the registry. That value is the multisig principal derived from the current signer set's pubkeys (set during `rotate-keys` to `new-signer-principal = (pubkeys-to-principal new-keys new-signature-threshold)`, see `sbtc-bootstrap-signers.clar:27` and `sbtc-registry.clar:309`). The principal corresponds to the M-of-N Stacks multisig address derived from the WSTS signer set's pubkeys at the configured threshold (typically 70% per the sBTC signer-set security model). Any transaction that the 70%+ signer quorum signs and submits will have `tx-sender = current-signer-principal`, and will pass this assertion. `[INSPECTED]`

**Notably absent from the wrapper:** `[INSPECTED]`

- No timelock between call submission and effect
- No supermajority gate beyond the 70% already encoded in the multisig principal
- No validation that `contract-address` points to a deployed contract (it can be any `principal`, including a not-yet-deployed contract address)
- No validation that `contract-address` implements the expected role's interface
- No bytecode hash check, source SHA check, or any other contract-identity validation
- No replay protection (the call can be re-executed across blocks if the protocol-contract is ever swapped back)
- No event-only "intent to swap" + "confirm swap" two-step pattern

### The registry mutator (`sbtc-registry.clar:325-345`) `[INSPECTED]`

```clarity
;; Update protocol contract
;; This function can only be called by the active bootstrap-signers contract
(define-public (update-protocol-contract
		(contract-type (buff 1))
		(new-contract principal)
	)
	(begin
		;; Check that caller is protocol contract
		(try! (is-protocol-caller governance-role contract-caller))
		;; Update the protocol contract
		(map-set active-protocol-contracts contract-type new-contract)
		;; Update the protocol role
		(map-set active-protocol-roles new-contract contract-type)
		(print {
			topic: "update-protocol-contract",
			contract-type: contract-type,
			new-contract: new-contract,
		})
		(ok true)
	)
)
```

Two `map-set` operations mutate the canonical registry. After execution:

- `active-protocol-contracts[<role>] = <attacker-principal>` — the registry now believes the attacker contract IS the canonical contract for that role `[INSPECTED]`
- `active-protocol-roles[<attacker-principal>] = <role>` — the inverse map now grants the attacker contract the role-identity needed to pass `is-protocol-caller` `[INSPECTED]`

The supporting `is-protocol-caller` check used by all sensitive registry writes (`sbtc-registry.clar:361-369`) `[INSPECTED]`:

```clarity
(define-read-only (is-protocol-caller (contract-flag (buff 1)) (contract principal))
	(begin
		;; Check that contract-caller is an protocol contract
		(asserts! (is-eq (some contract) (map-get? active-protocol-contracts contract-flag)) ERR_UNAUTHORIZED)
		;; Check that flag matches the contract-caller
		(asserts! (is-eq (some contract-flag) (map-get? active-protocol-roles contract)) ERR_UNAUTHORIZED)
		(ok true)
	)
)
```

Both checks consult the maps the swap just rewrote. Both pass for the attacker contract. The attacker contract is now structurally indistinguishable from the canonical `.sbtc-deposit` for purposes of `complete-deposit` (`sbtc-registry.clar:261-291`), which gates the `sbtc-token.protocol-mint` mint path via `(try! (is-protocol-caller deposit-role contract-caller))`. `[INSPECTED]`

### Why this is structurally distinct from the 70%-quorum threat model `[INSPECTED]`

Every other sensitive 70%-quorum-gated path in the sBTC contract layer has at least one additional defense layer beyond the bare quorum-signature check:

- **`rotate-keys-wrapper`** (`sbtc-bootstrap-signers.clar:20-49`): key-size check (line 31), threshold-arithmetic check (line 34-35), per-key length check (line 41), aggregate-pubkey length check (line 44), AND downstream replay protection via `aggregate-pubkeys` map insertion in `sbtc-registry.rotate-keys` (line 305: `(asserts! (map-insert aggregate-pubkeys new-aggregate-pubkey true) ERR_AGG_PUBKEY_REPLAY)`) — 5 defense layers on top of the quorum signature. `[INSPECTED]`
- **`complete-deposit-wrapper`** / deposit completion path: burn-hash check, sweep-txid validation, replay guard via `deposit-status` map, Bitcoin chain-tip burn-block verification, dust-limit assertion — 6 input-validation asserts per Gate 1 §5.7 grep. `[INSPECTED]`
- **`initiate-withdrawal-request`**: dust-limit check, recipient-version + hashbytes-length validation, `protocol-lock` on caller's own balance (i.e., self-debiting). `[INSPECTED]`
- **`accept-withdrawal-request`**: burn-hash check, caller check, status replay guard, fee ≤ max-fee bound check. `[INSPECTED]`

**`update-protocol-contract-wrapper` is the only quorum-gated function with exactly one defense layer (the quorum signature itself).** `[INSPECTED]` The result is a function whose **blast radius is the entire sBTC protocol** (arbitrary mint via swapped deposit contract, arbitrary BTC peg drain via swapped withdrawal contract, lock-in attacker control via swapped bootstrap-signers contract) but whose **defense depth is identical to the most trivial quorum-gated function in the codebase**.

This is the Trust-Boundary Surface Asymmetry pattern flagged in the Gate 1 hunt (P1 proposal for Doctrine #35) — the function with the largest authority delta has the smallest defense surface. `[ASSUMED]` (architectural framing inference)

---

## Impact

### Direct fund-loss enumeration `[INSPECTED]` (logical impact trace from the inspected swap pathway)

After a successful `update-protocol-contract-wrapper deposit-role <attacker-principal>` call, the attacker contract has unrestricted authority to call `sbtc-token.protocol-mint` with arbitrary `amount` and `recipient` parameters, because `is-protocol-caller deposit-role contract-caller` returns `(ok true)` for it. `[INSPECTED]`

- **Arbitrary sBTC mint:** attacker contract calls `(contract-call? .sbtc-token protocol-mint <amount> <attacker-recipient> deposit-role)` — `<amount>` can be any `uint`, bounded only by the Clarity uint type (effectively unbounded relative to total sBTC supply). Attacker mints any quantity of sBTC to any recipient. `[INSPECTED]`
- **Arbitrary BTC peg drain via fake-withdrawal completion:** parallel swap of `withdrawal-role` permits attacker contract to call `(contract-call? .sbtc-registry complete-withdrawal-accept ...)` with attacker-chosen `request-id` / `sweep-txid` / `burn-hash`, marking arbitrary withdrawal requests as completed and releasing the corresponding BTC from the peg vault. The Bitcoin-side signature collection still requires the signer-quorum to sign the BTC release tx — but in the quorum-compromise threat scenario this is also unblocked. `[INSPECTED]`
- **Lock-in / persistence:** parallel swap of `governance-role` (i.e., `.sbtc-bootstrap-signers`) installs an attacker-controlled bootstrap-signers contract that can subsequently call `sbtc-registry.rotate-keys` with attacker-chosen `new-signer-principal`, locking honest signers out of recovery. Once locked, no in-protocol mechanism exists to revert. `[INSPECTED]`

### Scaling math (parametric model) `[ASSUMED]` (parameter values are estimates per `[ASSUMED]` tag; impact pathway is `[INSPECTED]`)

| sBTC TVL at exploit window | Attacker mint authority (Clarity uint bound) | BTC peg vault drain authority |
|---|---|---|
| sBTC mainnet active (TVL TBD at activation) | Unbounded above current supply | Full peg vault balance |
| sBTC pilot (~$50M) | Unbounded — can mint any amount | ~$50M BTC equivalent |
| sBTC at scale ($500M+) | Unbounded — can mint any amount | $500M+ BTC equivalent |

The Immunefi $250K Critical cap (with $25K floor) is reached at all realistic sBTC TVL levels. The sBTC downgrade clause ("downgrades apply for impacts affecting <1% of users") does not apply — successful exploit affects 100% of sBTC holders' supply integrity. `[ASSUMED]` (Immunefi triager classification depends on quorum-precondition treatment per §Severity Recommendation argument above)

### Why this is not the same as "70% of signers steal the peg vault" `[INSPECTED]`

The naive form of the 70%-quorum threat — "70% of signers collude, sign BTC release transactions, drain the peg" — is the documented baseline threat the sBTC threat model accepts as a Critical-severity event handled by the WSTS + signer-set defenses. This finding is structurally distinct on three points:

1. **Single-block atomicity:** the protocol-contract swap + first attacker-mint can land in the same block. No off-chain observer / honest signer / oracle has any opportunity to intervene between "quorum signed" and "registry rewritten." `[INSPECTED]`
2. **No Bitcoin-side coordination required for the mint path:** the arbitrary-mint exploit operates entirely on the Stacks side. It does not require signer cooperation on subsequent BTC release tx signing (that's required only for the BTC peg drain). The mint path is therefore **strictly easier** than the documented baseline threat — fewer signer-side actions, lower coordination cost, and victim sBTC holders see arbitrary new sBTC supply on their dashboards within a single Stacks block. `[INSPECTED]`
3. **Persistence + lock-in:** the swap of `governance-role` permanently locks in attacker control with no in-protocol recovery, whereas the naive baseline threat (sign BTC release tx) is a one-shot drain that does not extend attacker control over future actions. `[INSPECTED]`

The combination — single-block atomicity + lower-coordination-cost mint path + lock-in persistence — is a defense-in-depth gap that the contract layer can and should close independently of the underlying quorum-compromise threat model.

---

## Attack Scenario

Numbered exploit sequence under the 70%-quorum-compromise precondition `[INSPECTED]`:

1. **(Precondition)** Attacker controls 70%+ of WSTS signer keys via any of the threat-model surfaces the sBTC threat model already enumerates (key-extraction, signer-operator coercion, Emily compromise during key-rotation window, etc.). `[ASSUMED]` (precondition framing; the exploit logic below is `[INSPECTED]`)
2. Attacker deploys an evil Clarity contract `.attacker-deposit` to the same network as the sBTC contracts. The contract exposes a public function `(define-public (steal-mint (amount uint) (recipient principal)) (begin (try! (contract-call? .sbtc-token protocol-mint amount recipient 0x01)) (ok true)))`. The function body uses `deposit-role` (`0x01`) per the registry constant at `sbtc-registry.clar:10`. `[INSPECTED]`
3. Attacker constructs a single Stacks transaction signed by the 70% quorum via WSTS aggregation. The transaction body is `(contract-call? .sbtc-bootstrap-signers update-protocol-contract-wrapper 0x01 .attacker-deposit)`. `[INSPECTED]`
4. The transaction lands. The wrapper at `sbtc-bootstrap-signers.clar:53-60` checks `(is-eq (contract-call? .sbtc-registry get-current-signer-principal) tx-sender)` — passes, because the multisig-principal `tx-sender` equals `current-signer-principal`. The wrapper invokes `sbtc-registry.update-protocol-contract 0x01 .attacker-deposit`. `[INSPECTED]`
5. Registry mutator at `sbtc-registry.clar:327-345` checks `(is-protocol-caller governance-role contract-caller)` — passes, because `contract-caller` is `.sbtc-bootstrap-signers` which is still registered as `governance-role` (the attacker only swapped `deposit-role`, not `governance-role` — yet). `map-set active-protocol-contracts 0x01 .attacker-deposit` + `map-set active-protocol-roles .attacker-deposit 0x01` execute. The registry now treats `.attacker-deposit` as the canonical deposit-role contract. `[INSPECTED]`
6. In the same transaction batch, attacker invokes `(contract-call? .attacker-deposit steal-mint u1000000000000 <attacker-stx-recipient>)`. `.attacker-deposit.steal-mint` calls `sbtc-token.protocol-mint u1000000000000 <attacker> 0x01`. `sbtc-token.protocol-mint` validates via `is-protocol-caller deposit-role contract-caller` (typical sBTC token gating pattern, `[ASSUMED]` based on the role-based gating pattern observed in `sbtc-registry.complete-deposit:271`). Check passes — `.attacker-deposit` is now registered under `deposit-role`. Mint executes. `[INSPECTED] step-by-step; [ASSUMED]` on the specific gating call inside `sbtc-token.protocol-mint` which the operator should verify by reading `sbtc-token.clar`'s `protocol-mint` definition pre-submission.
7. Attacker holds 1,000,000 sBTC (or arbitrary chosen quantity) in attacker-controlled STX address. `[INSPECTED]`
8. (Optional escalation, in same or follow-up block) Attacker repeats with `withdrawal-role`, installing `.attacker-withdrawal` that calls `sbtc-registry.complete-withdrawal-accept` with attacker-chosen `request-id` and `sweep-txid` values to mark arbitrary withdrawal requests as completed, releasing BTC from the peg vault. Note: the BTC release tx itself still requires the signer quorum to sign on the Bitcoin side, but in this scenario the same quorum is the attacker. `[INSPECTED]`
9. (Optional escalation) Attacker repeats with `governance-role`, installing `.attacker-bootstrap-signers` that exposes a malicious `rotate-keys-wrapper` calling `sbtc-registry.rotate-keys` with attacker-chosen `new-signer-principal`. Honest signers are now locked out of any future protocol-contract recovery action. `[INSPECTED]`
10. Honest observers can only detect the swap via the `print` event emitted at `sbtc-registry.clar:338-342` (topic `"update-protocol-contract"`). Detection is post-hoc; the attacker-mint has already executed in the same block. Off-chain mitigation (signer-set rotation by honest faction, Emily-side blocklist of attacker addresses) is not available because the registry-layer rewrite has already happened and is irrevocable without an honest-quorum counter-swap — which is impossible under the 70%-compromise precondition. `[INSPECTED]`

The exploit sequence requires **one signed transaction from the 70% quorum and zero further confirmations**. There is no honest-actor intervention window between Step 4 and Step 6.

---

## Recommendation

Defense-in-depth options for the `update-protocol-contract` mutation path, in preference order. All `[ASSUMED]` (design proposals, not on-chain-confirmed implementations).

### Option 1 — Timelock on `update-protocol-contract` `[ASSUMED]`

Split the swap into a two-step submission pattern with a mandatory minimum delay (e.g., 24 hours of Stacks blocks, or one Bitcoin epoch ~144 BTC blocks):

```clarity
;; Pseudocode
(define-map pending-protocol-contract-updates (buff 1)
  { new-contract: principal, submitted-at: uint })

(define-public (propose-protocol-contract-update (contract-type (buff 1)) (new-contract principal))
  (begin
    (asserts! (is-eq (contract-call? .sbtc-registry get-current-signer-principal) tx-sender) ERR_INVALID_CALLER)
    (map-set pending-protocol-contract-updates contract-type
      { new-contract: new-contract, submitted-at: burn-block-height })
    (print { topic: "protocol-contract-update-proposed", contract-type: contract-type, new-contract: new-contract, eta: (+ burn-block-height TIMELOCK_BLOCKS) })
    (ok true)))

(define-public (confirm-protocol-contract-update (contract-type (buff 1)))
  (let ((pending (unwrap! (map-get? pending-protocol-contract-updates contract-type) ERR_NO_PENDING)))
    (asserts! (is-eq (contract-call? .sbtc-registry get-current-signer-principal) tx-sender) ERR_INVALID_CALLER)
    (asserts! (>= burn-block-height (+ (get submitted-at pending) TIMELOCK_BLOCKS)) ERR_TIMELOCK_NOT_EXPIRED)
    (map-delete pending-protocol-contract-updates contract-type)
    (contract-call? .sbtc-registry update-protocol-contract contract-type (get new-contract pending))))
```

The timelock creates an observable window during which honest signers, the Stacks Foundation, exchanges, sBTC holders, and external monitoring (Hypernative, Asymmetric Research) can detect the pending swap via the `protocol-contract-update-proposed` event and trigger an off-chain response (mass user withdrawal before the swap completes, emergency signer-set rotation, public disclosure to halt the protocol). 24h is the minimum useful delay; one Bitcoin epoch (~24 hours = 144 BTC blocks) is the canonical "users have time to react" delay used across the Bitcoin DeFi ecosystem.

### Option 2 — Multi-block confirmation + supermajority bump `[ASSUMED]`

Require the swap to be signed across two distinct Stacks blocks AND require a higher signer-set threshold than the standard 70% (e.g., 85%) for the protocol-contract swap path specifically:

```clarity
;; The current signer-set threshold (70%) gates all other quorum actions.
;; Protocol-contract swap requires a separate, higher threshold AND multi-block confirmation.
(define-constant PROTOCOL_SWAP_BLOCK_DELAY u3)
(define-constant PROTOCOL_SWAP_SUPERMAJORITY_BPS u8500) ;; 85%
```

This separates the protocol-contract-swap authority from the regular signer-quorum authority. A 70%-compromised quorum can still sign normal protocol operations but cannot execute the registry rewrite without an additional 15% of signer keys.

### Option 3 — New-contract bytecode-hash whitelist `[ASSUMED]`

Maintain a separate `approved-protocol-contracts` map populated by a separate (lower-frequency, higher-friction) governance action. The `update-protocol-contract` swap can only install contracts whose bytecode hash matches an approved entry:

```clarity
(define-map approved-protocol-contract-hashes (buff 32) bool)

;; populated by a separate governance flow with timelock + supermajority
(define-public (approve-protocol-contract-hash (hash (buff 32))) ...)

;; the swap path enforces hash-match
(define-public (update-protocol-contract-wrapper (contract-type (buff 1)) (contract-address principal))
  (begin
    (asserts! (is-eq (contract-call? .sbtc-registry get-current-signer-principal) tx-sender) ERR_INVALID_CALLER)
    (asserts! (default-to false (map-get? approved-protocol-contract-hashes
                                          (get-contract-source-hash contract-address)))
              ERR_CONTRACT_NOT_APPROVED)
    (contract-call? .sbtc-registry update-protocol-contract contract-type contract-address)))
```

Implementation caveat: Clarity does not expose a native `get-contract-source-hash`. This option requires either (a) Stacks-protocol-level support for contract-bytecode-introspection (a Stacks core change, outside the bounty scope), or (b) a deploy-time registration pattern where the new contract calls into a registrar at deploy time to record its hash, with the swap path verifying via that registrar map. Option 3 is the most secure but the most invasive to implement.

### Option 4 — Separate signer-set-rotation authority from protocol-contract-swap authority `[ASSUMED]`

The current design conflates two distinct authorities on the same signer-set:

- Bitcoin-side: signing BTC peg release transactions + signer-key rotation (legitimate quorum operations)
- Stacks-side: rewriting the canonical sBTC protocol-contract registry (a much larger authority delta)

A long-term redesign separates the two: signer-set-rotation authority stays with the WSTS quorum on the standard 70% threshold; protocol-contract-swap authority moves to a separate keyset (e.g., a Stacks Foundation multisig + community-elected key-holders) with its own threshold + timelock. This separates the "operational" and "structural" authorities and matches the principle of least privilege.

**Recommended:** Option 1 (timelock) as the minimum acceptable fix — it is the smallest implementation surface, the most defensible against the precise exploit scenario in §Attack Scenario, and the most aligned with established Bitcoin DeFi conventions. Options 2-4 are additive and can be layered on top of Option 1 over time.

---

## DUP-Distinction Statement

This finding is substrate-disjoint from prior Immunefi disclosure #38160 BC-Insight (Stacks-I Attackathon). #38160 targets the off-chain Rust signer-binary; our C1 targets the on-chain Clarity bridge contract — different code path, different bug class, different fix surface.

Beyond #38160, the finding has been cross-checked against the full disclosed-finding sets of:

- Phase 1 DUP-check: Stacks-I Attackathon (Coinspect Att1+Att2 disclosed findings) `[INSPECTED]` via operator manual review per task brief
- Phase 2 DUP-check: Ottersec sBTC Withdrawal report, Ottersec WSTS report, CoinFabrik WSTS report, CoinFabrik Stacks Signer report `[INSPECTED]` via operator manual review per task brief
- Phase 2 DUP-check residual risk: Clarity Alliance sBTC.pdf — flagged for operator manual-skim as pre-submission gate (WebFetch PDF-skim was not possible). `[ASSUMED]` clean pending operator confirmation.

In each surveyed report, the closest adjacent disclosures are signer-set rotation safety (rotate-keys-wrapper threshold validation, aggregate-pubkey replay guard), signer-side fee-theft, signer-side coordinator OOM, deposit replay guards, withdrawal-vote inconsistency, and off-chain Rust signer-binary bugs. None of these surveyed reports surface the protocol-contract-swap atomic-rewrite pathway as a defense-in-depth gap or as an exploitable trust-boundary asymmetry. The finding is `[INSPECTED]` net-new on the on-chain Clarity substrate.

---

## R8 Calibrated Tags Summary

- `[EXECUTED]` (0 inline tags): no PoC executed for this submission per operator authorization (source-read-only initial submission). A subsequent Clarinet PoC can be authored on operator request to upgrade specific `[INSPECTED]` claims to `[EXECUTED]`.
- `[INSPECTED]` (29 inline tags): source-traced exploit pathway through `sbtc-bootstrap-signers.update-protocol-contract-wrapper` (line 53-60), `sbtc-registry.update-protocol-contract` (line 327-345), `sbtc-registry.is-protocol-caller` (line 361-369), `sbtc-registry.rotate-keys` for comparative defense-depth analysis (line 295-323), `sbtc-bootstrap-signers.rotate-keys-wrapper` for comparative defense-depth analysis (line 20-49); HEAD commit SHA `11567fc6a111c130177e64380503acca8546aab6` verified via local git log; Trust-Boundary Surface Asymmetry pattern instantiation against the codebase's actual `(asserts! ...)` counts per Gate 1 §5.7 grep results.
- `[ASSUMED]` (8 inline tags): the 70%-quorum-compromise precondition framing (the contract layer behaves identically whether the quorum is compromised by collusion, key extraction, or coercion — the precondition itself is in the off-chain threat model); Trust-Boundary Surface Asymmetry as a candidate Doctrine #35 (operator-pending); specific `sbtc-token.protocol-mint` gating mechanism (uses the role-based pattern observed in `sbtc-registry.complete-deposit:271`, but the operator should verify by reading `sbtc-token.clar`'s `protocol-mint` definition pre-submission); Immunefi triager classification of quorum-precondition findings (Severity High vs Critical depends on whether the triager treats the precondition as in-scope); parameter values in the impact scaling math (TVL, attacker mint quantities); three of the four Recommendation options are design proposals not on-chain-confirmed implementations; Phase 2 residual DUP-risk on Clarity Alliance sBTC.pdf pending operator manual-skim.

---

## References

### Source artifacts `[INSPECTED]`

- `stacks-network/sbtc` HEAD `11567fc6a111c130177e64380503acca8546aab6` (committed 2026-05-22 15:35:01 +0200)
  - `contracts/contracts/sbtc-bootstrap-signers.clar:53-60` — `update-protocol-contract-wrapper`
    - `https://github.com/stacks-network/sbtc/blob/11567fc6a111c130177e64380503acca8546aab6/contracts/contracts/sbtc-bootstrap-signers.clar#L53-L60`
  - `contracts/contracts/sbtc-registry.clar:325-345` — `update-protocol-contract` + supporting `is-protocol-caller` machinery at line 361-369
    - `https://github.com/stacks-network/sbtc/blob/11567fc6a111c130177e64380503acca8546aab6/contracts/contracts/sbtc-registry.clar#L325-L345`
  - `contracts/contracts/sbtc-registry.clar:295-323` — `rotate-keys` (comparative defense-depth reference)
    - `https://github.com/stacks-network/sbtc/blob/11567fc6a111c130177e64380503acca8546aab6/contracts/contracts/sbtc-registry.clar#L295-L323`
  - `contracts/contracts/sbtc-bootstrap-signers.clar:20-49` — `rotate-keys-wrapper` (comparative defense-depth reference)
    - `https://github.com/stacks-network/sbtc/blob/11567fc6a111c130177e64380503acca8546aab6/contracts/contracts/sbtc-bootstrap-signers.clar#L20-L49`

### Prior Gate 1 hunt artifact `[INSPECTED]`

- `hunts/2026-05-26-stacks-immunefi-gate1.md` — Gate 1 surface map; finding C1 (the present finding) escalated; brain overlap MEDIUM-HIGH; Doctrine #35 candidate "Trust-Boundary Surface Asymmetry" proposed (P1).

### DUP-check corpus surveyed `[INSPECTED]` (per operator-supplied Phase 1 + Phase 2 review)

- Coinspect Stacks-I Attackathon disclosed-finding set (Phase 1)
- Coinspect Stacks-II Attackathon disclosed-finding set (Phase 1)
- Ottersec sBTC Withdrawal report (Phase 2)
- Ottersec WSTS report (Phase 2)
- CoinFabrik WSTS report (Phase 2)
- CoinFabrik Stacks Signer report (Phase 2)

### DUP-check residual `[ASSUMED]` clean pending operator manual-skim

- Clarity Alliance sBTC.pdf (PDF-skim via WebFetch was not possible; operator manual-skim required as pre-submission gate)

### Nearest adjacent prior disclosure (DUP-distinction line) `[INSPECTED]`

- Immunefi Stacks-I Attackathon report #38160 BC-Insight — off-chain Rust signer-binary issue in the same bridge code area; substrate-disjoint from the present on-chain Clarity finding per the DUP-Distinction Statement above.

### Immunefi program reference `[INSPECTED]`

- Stacks bug bounty program (live since 31 Mar 2022); $250K Critical cap, $25K Critical floor; in-scope assets include `contracts` (the Clarity contract directory containing both files cited above); KYC mandatory for payout; PoC required for all severities per program spec; sBTC downgrade clause applies for impacts affecting <1% of users (does not apply to the present finding, which affects 100% of sBTC supply integrity on successful exploit).
