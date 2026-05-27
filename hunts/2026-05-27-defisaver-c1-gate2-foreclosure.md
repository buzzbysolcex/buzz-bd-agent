# Gate 2 Foreclosure — DeFi Saver CANDIDATE-1 (*WithSig signature-forwarding bot-supplied calldata trust gap)

**Date:** 2026-05-27
**Operator:** Buzz BD Agent (autonomous per autonomy-boundary.md)
**Gate 1 reference:** `/home/claude-code/buzz-workspace/hunts/2026-05-27-defisaver-immunefi-gate1.md`
**Verdict:** **NEGATED — STRUCTURAL FORECLOSE (Track A)** + **SOFT FORECLOSE — Centralization-Accepted (Track B)**
**EV-realized:** $0 (no paste-ready) vs **EV-projected $12,600**
**Time-to-foreclose:** ~35 min (Phase 0 + source-read + on-chain probe — Foundry investment NOT made, saved ~2-4h)

---

## TRACK A — CANDIDATE-1 *WithSig calldata trust gap — STRUCTURALLY NEGATED

### Phase 0 (audit dedup) — PASSED
PDF grep across all 6 audits in `audits/`: no mention of `WithSig`, `bot-supplied`, `signature forward`, or `signer match`. The `[onBehalf]` hits in Consensys-Mar-2021 are scoped to **pre-WithSig AaveV2 borrow** flow, not the post-audit family under test. **Family is post-audit. Dedup clean.** [EXECUTED]

### Phase 1 (source-level build-up) — HYPOTHESIS FOUNDATIONALLY FALSE

All 7 `*WithSig` action contracts read in full:

| Contract | Underlying call | Calldata struct | Signer-binding field |
|---|---|---|---|
| `AaveV4DelegateBorrowWithSig` | `ITakerPositionManager.approveBorrowWithSig(permit, sig)` | `BorrowPermit { spoke, reserveId, owner, spender, amount, nonce, deadline }` | `owner` |
| `AaveV4DelegateWithdrawWithSig` | `ITakerPositionManager.approveWithdrawWithSig(permit, sig)` | `WithdrawPermit { spoke, reserveId, owner, spender, amount, nonce, deadline }` | `owner` |
| `AaveV4SetUserManagersWithSig` | `ISpoke.setUserPositionManagersWithSig(setManagersData, sig)` | `SetUserPositionManagers { onBehalfOf, updates[], nonce, deadline }` | `onBehalfOf` |
| `AaveV4DelegateSetUsingAsCollateralWithSig` | `IConfigPositionManager.setCanSetUsingAsCollateralPermissionWithSig(permit, sig)` | EIP712 permit struct | signer in permit |
| `AaveV3DelegateWithSig` | `IDebtToken.delegationWithSig(delegator, delegatee, value, deadline, v, r, s)` | flat params | `delegator` |
| `MorphoBlueSetAuthWithSig` | `IMorphoBlue.setAuthorizationWithSig(authorization, sig)` | `Authorization { authorizer, authorized, isAuthorized, nonce, deadline }` | `authorizer` |
| `SparkDelegateWithSig` | `ISparkDebtToken.delegationWithSig(delegator, delegatee, value, deadline, v, r, s)` | flat params | `delegator` |

[INSPECTED]

### THE STRUCTURAL REASON HYPOTHESIS FAILS

Every `*WithSig` action is a **pure pass-through wrapper** of <10 lines of effective logic. Each forwards `(permit, signature)` to the underlying protocol's permit endpoint. The hypothesis ("bot can substitute attacker for victim's signer") is structurally impossible because:

**1. EIP712 semantics enforce signer-binding at the protocol layer.** The protocol (Aave V4 TakerPositionManager / MorphoBlue / Spark / Aave V3 DebtToken) computes `ecrecover(sig, EIP712_HASH(permit_struct)) == permit.owner` (or `delegator` / `authorizer`). If the bot mutates ANY signed field (including `owner`, `spender`, `amount`, `nonce`, `deadline`), the hash changes, `ecrecover` returns a different (or invalid) signer, and the call reverts.

**2. The signature IS the authorization.** Anyone holding a valid signed permit can relay it — that is the explicit design intent of EIP712 permits, NOT a vulnerability. The DeFi Saver bot's role is **relayer-only**, identical to any other tx-submitter. If the bot is malicious, it can relay early/late, but cannot forge a signature for a non-consenting user. [INSPECTED]

**3. No DeFi-Saver-side decision is gated on the signature.** Unlike vulnerabilities where a wrapper validates a sig and then takes locally-trusted action (e.g., minting wrapped shares, granting protocol-internal roles), DeFi Saver's `*WithSig` actions take NO local action. They literally just call `underlying.fooWithSig(...)` and return. There is no validating-field/consuming-field divergence (DC-7) because there is no validating-field — the action contract validates nothing. Validation happens entirely at the protocol layer where it should. [INSPECTED]

**4. Subscription binding is irrelevant.** `StrategyExecutor.executeStrategy` (line 37) verifies `keccak256(_sub) == storedSubData.strategySubHash` to lock the subscription struct. But the per-execution `_actionsCallData` (which carries the signature blob) is **freely bot-supplied** by design — that's what makes Strategies parameterizable. The bot supplies the signature the user signed off-chain at subscription time (or via DeFi Saver app). If the user signed `{owner: V, spender: V_dsproxy}`, only V's dsproxy gains the authority. The bot cannot rewrite `spender` without breaking the signature. [INSPECTED]

**5. DSProxy delegatecall context is irrelevant to signature validation.** Even though the action runs as `delegatecall` from the user's DSProxy/Safe (so `msg.sender` to Aave V4 is `userDSProxy`), the protocol's `ecrecover` checks the signature against `permit.owner`/`delegator`/`authorizer`, NOT `msg.sender`. The DSProxy context affects who is the "spender" for transactions like `borrowOnBehalfOf(...)`, but those transactions are gated by allowance — and the allowance was granted by V's signed permit. The chain of custody is: V signs → bot relays → protocol verifies V signed → protocol grants spender (whom V chose) the allowance → spender can later call `borrowOnBehalfOf(V)`. No step is bot-controllable beyond relaying. [INSPECTED]

### RESIDUAL ATTACK ANGLES — ALL OOS OR INVALID

| Angle | Result | Reason |
|---|---|---|
| Bot mutates `spender` field | INVALID | Breaks EIP712 hash → ecrecover reverts |
| Bot supplies stale signature (replay) | OOS | Protocol-side nonce check (Aave V4 uses keyed-nonces, Morpho uses sequential nonce, Spark/Aave V3 use ERC20-style nonce). All third-party. |
| Cross-chain signature replay (Morpho's documented domain-separator quirk) | OOS | Third-party Morpho design issue (warned in IMorphoBase.DOMAIN_SEPARATOR docs); not DeFi Saver's bug |
| Front-run griefing (bot frontruns user's own intended sub-execution) | INVALID | Outcome identical to user's intent; no asymmetry |
| Signature leak from user's frontend (phishing) | OOS | User mistake; Immunefi excludes "social engineering" / "third-party user mistakes" |
| Bot does not invalidate stale permits locally | INVALID | Stale permits are blocked at protocol layer by nonce/deadline; DeFi Saver has no obligation to double-check |

### PHASE 2 SKIPPED — FOUNDRY INVESTMENT FORECLOSED PRE-BUILD
Because the structural analysis is dispositive, no fork-test PoC was authored. Per autonomy-boundary.md: "If PoC would demonstrate the underlying protocol's behavior rather than a specific DeFi Saver gap, foreclose at Phase 1." Confirmed — any PoC would only exercise Aave V4 / Morpho / Spark EIP712 permit semantics, not a DeFi Saver flaw.

---

## TRACK B — CANDIDATE-2 AdminVault zero-timelock — SOFT FORECLOSE (Centralization-Accepted)

### On-chain probe (live mainnet 2026-05-27 21:38 UTC)

```
AdminVault address:    0xCCf3d848e08b94478Ed8f46fFead3008faF581fD
AdminVault.admin():    0x25eFA336886C74eA8E282ac466BdCd0199f85BB9
AdminVault.owner():    0xBc841B0dE0b93205e912CFBBd1D0c160A1ec6F00

ADMIN_ADDR is a Gnosis Safe v1.1.1:
  getThreshold():      3
  getOwners() count:   6
  Signers:
    0x8A3D66A2BD7f3e2D09C9608FbD16CE3FF99388A8
    0xD5dea6048465d4D4786d149eAe1967273783C163
    0x9fb32a80045d58d6BBe66c03c79650c21b72Af48
    0xDA5Ae43e179987a66B9831F92223567e1F38BE7D
    0x6Ab2b49670d00b2D13b40b42DA74dee3D8e6b396
    0x2F5591019ffD0e86B61104d34335A03C2db31eaF
```
[EXECUTED]

### Verdict

**3-of-6 Gnosis Safe v1.1.1 controls AdminVault.changeOwner / changeAdmin.** No on-chain timelock module attached (Gnosis Safe v1.1.1 has no native timelock). The DC-9 sub-2 substrate (zero-timelock changeOwner/changeAdmin) is technically present, BUT the defense-in-depth layer is:

1. **3-of-6 multisig** — requires 3 distinct signers to act collusively or 3 compromised keys
2. **6 distinct signers** — keyspace large enough to make targeted compromise expensive
3. **Live since 2021** — 5-year operational history with no documented incident

Immunefi treatment of comparable findings (per their published triage docs):
- 1-of-N or EOA admin = HIGH severity (Centralization Risk)
- 3-of-N with N >= 5 = typically classified as "Centralization Risk - Known/Accepted" or LOW
- Bounty program scope exclusion: **"Attacks requiring privileged access from within the organization"** (per Gate 1 Step 1 scope check) — this directly covers admin-key compromise scenarios

**Cap mapping (per Immunefi DeFi Saver page):** even if accepted as Smart Contract HIGH, the cap is $30,000 flat. Probability of acceptance for a 3-of-6 multisig finding ≈ 0.1 → EV ≈ $3,000. **Below the worth-paste-ready threshold (~$5K min) given:**

1. The thin authority layer is well-known / publicly auditable (the Safe address has been the admin since deploy)
2. Any sufficiently-experienced DeFi-Saver-user knows the team operates a multisig
3. The "Out-of-scope" clause for "privileged access from within the organization" likely applies

### Soft-foreclose action

**File:** `brain/Watchlist-Candidate-Crossmap.md` — note DeFi Saver AdminVault probe with admin = 3/6 Gnosis Safe v1.1.1 (defense-thicker than required for DC-9 sub-2 HIGH escalation). Re-probe annually; if signer count drops below 5 OR threshold drops to 1-2, re-escalate.

**Do not file as paste-ready.** EV-adjusted $3K vs ~2h paste-ready effort = poor ROI vs next clean target.

---

## TRACK C — CANDIDATE-3 DFSRegistry.revertToPreviousAddress — NOT PROBED

Did not execute Etherscan event enumeration. Per soft-foreclose of CANDIDATE-2: if AdminVault admin compromise is the gating dependency for CANDIDATE-3, and admin-compromise is OOS/low-EV per Track B verdict, then CANDIDATE-3 EV degrades to <$1K. Defer to watchlist.

---

## BRAIN COMPOUNDS (proposed)

### Compound 1 — DOCTRINE update (Doctrine.md) — *WithSig wrappers are STRUCTURAL FORECLOSE

**Worked Example #N:** DeFi Saver `*WithSig` family (2026-05-27)
- 7 contracts, ~250 LoC of pure pass-through wrapping EIP712 permit relays
- Hypothesis: bot-supplied calldata trust gap
- Verdict: **STRUCTURALLY IMPOSSIBLE** — EIP712 signature semantics make relayer trust impossible to violate without breaking the signature
- **Doctrine claim:** "A wrapper contract that forwards an EIP712 signed permit to a protocol's `*WithSig` endpoint and takes NO local validated action is a FORECLOSE — the signature binds all trust-relevant fields, the protocol's `ecrecover` enforces signer identity, and the wrapper has no validating-field/consuming-field divergence."
- **Lens implication:** Skip `*WithSig` family contracts on initial Gate 1 surface map unless they (a) take additional local action gated by the signature, OR (b) extract fields from the signed struct and use them for downstream parameter resolution. Pure pass-through = no surface.

### Compound 2 — Patterns-Defense-Classes.md — CANDIDATE-Q renamed/clarified

**CANDIDATE-Q (Bot-Supplied Calldata Trust Gap on Signature-Forwarding Wrappers) — REFINED:**
- Original hypothesis (DeFi Saver): trust gap on pure pass-through wrappers — **STRUCTURALLY IMPOSSIBLE per Compound 1**
- **Refined hypothesis:** wrapper contracts that DO take local validated action ON TOP of the forwarded permit AND derive that action from non-signed bot-supplied fields. Substrate must be: wrapper signature-validates X, then takes action gated by Y where Y is not in the signed struct.
- **Status:** still CANDIDATE (no anchors). DeFi Saver does NOT anchor it (foreclosed). Promote on next surface that fits the refined hypothesis.

### Compound 3 — Cross-Pollination-Log.md — P4 → P1 token-scoring rule check

DeFi Saver finding does NOT generate a token-scoring rule (the *WithSig pattern is a wrapper-design issue, not a token-property). No P4→P1 cross-pollination.

### Compound 4 — Hunts log entry (intake-log.md)

```
2026-05-27 | DeFi Saver | Immunefi | $350K cap | Gate 1 PROCEED | Gate 2 FORECLOSE Track A (structural) + Track B (centralization-accepted) | Time: 50min G1 + 35min G2 = 85min total | EV-realized $0 vs $12.6K projected | Disk: +52MB clone, retained for potential CANDIDATE-3 re-probe
```

### Compound 5 — Doctrine.md — TRACK B "centralization-accepted" foreclose criteria

**New doctrine sub-rule:** "DC-9 sub-2 (privileged state mutation without defense-in-depth) findings against multi-sig-controlled admins must be probed on-chain at Gate 1.5 (pre-Foundry) for: (a) multisig threshold, (b) signer count, (c) presence of attached timelock module. If threshold/N >= 3/5 with no timelock = SOFT FORECLOSE as 'Centralization-Accepted'. Bounty platforms (Immunefi, Cantina, HackenProof) increasingly classify this as 'Known Risk' rather than valid finding. Pre-flight saves Foundry investment."

---

## DISK + TIME REPORT

- **Disk:** 5.5G available (85% used) → 5.5G available (unchanged). Clone retained at `.work-clones/defisaver-v3/` (52MB) — retain for Compound 5 anchoring and potential CANDIDATE-3 future probe.
- **Time:** 35 minutes (Phase 0 dedup 8min + Source read 12min + On-chain probe 5min + Foreclosure write 10min). Saved ~2-4h vs full Foundry path.

---

## OPERATOR DISPATCH

**No paste-ready FLAG.** Foreclosure receipt filed.

**Next autonomous target:** Per autonomy-boundary.md Step 9 GOTO 3 — refresh Lane 5 DB EV ranking and dispatch next highest-EV clean target.

---

_Gate 2 foreclosure receipt v1.0 | Buzz BD Agent autonomous | Standing-Intake + Doctrine #34 sub-class b + DC-9 sub-2 + R8 Calibrated Reporting | 2026-05-27_
