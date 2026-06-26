# Gate-1 — Spark by Lightspark (Immunefi) — 2026-06-11

> P4 hunt. NON-EVM / NON-Clarity. Statechains over Bitcoin. Operator: Ogie. Bismillah.
> Pipeline: full 10-layer (Ultracode multi-agent). Honest tags. Local-fork PoC only. Submission OPERATOR-GATED (KYC + Cat-3).

## STEP 1 — PROFILE (verified live 2026-06-11)

- **Platform:** Immunefi — `immunefi.com/bug-bounty/spark-lightspark/`. LIVE since 2026-05-06 (~5 wk fresh).
- **Cap:** Blockchain/DLT **Critical = Direct theft of funds**, 10% of funds affected, **max $50,000 / min $10,000**. Permanent freeze (hardfork) = $10K only. Program hard cap $1M total, first-come-first-served.
- **KYC:** YES (mandatory). **Publication:** Category 3 (approval required).
- **PoC:** REQUIRED. **Testing on mainnet/public-testnet PROHIBITED — local-fork only.**
- **Primacy of Impact:** applies to Blockchain/DLT Critical direct-theft (impact in-scope even if asset not listed). Testnet/mock files excluded.
- **In-scope assets:** 2 (primary repo `github.com/buildonspark`). Vault ~$500K USDC `0xb230…1b15` ⇒ 10% caps at the $50K critical.

### HARD EXCLUSIONS (dedup BEFORE work)
1. **L1 re-orgs** — "current Spark implementation doesn't handle L1 re-orgs" → re-org findings OUT.
2. **Dev template configs** — `so.template.config.yaml` / `docker/operator.config.yaml` set `service_authz.mode:1` (AuthzModeDisabled) + empty `ip_allowlist`; NOT production. No finding on AuthzModeDisabled / empty allowlist.
3. Standard Immunefi feasibility (no chain-rollback, no pre-impact monitoring, attacker financial-risk, griefing-downgrade).

### BANKABLE (what pays)
- PERMISSIONLESS **direct theft of funds** (the only paid Critical tier), OR
- Carve-out A: protocol bug letting a malicious **SSP steal from users**, OR
- Carve-out B: SSP-impl bug letting a **user steal from the SSP**, OR
- Any path where **SOs move user funds without the user's signature** (breaks the core 1-of-n invariant; user FROST share is mandatory).

## STEP 2 — DEDUP / OVERLAP
- **No prior hunt on this target.** `2026-05-28-spark-immunefi-gate1.md` = SparkLend/`sparkdotfi` (EVM Aave-fork lender, $5M) — NAME COLLISION, different protocol. Submission ledger: zero Lightspark/statechain/FROST entries. CLEAN.
- **Transferable lenses (carried):** DISC-022 stale-attestation/ownership revival; Doctrine #57 off-chain conversion → seam may be structurally absent; Doctrine #59 admin/SO-trust = early-foreclose unless carve-out scopes it; rehypothecation-valuation.

## ARCHITECTURE (grounded from docs + source)
- **Trust:** "moment-in-time" **1-of-n** — security holds if ≥1 SO is honest *at transfer time*. "Perfect forward security" = SO **forgetting (deleting) the operator key after a transfer**. Even all-but-one malicious SOs cannot move funds (user FROST share `sk_user` mandatory: `sk_agg = sk_user + sk_so`).
- **Transfer = key-tweak:** SE tweaks its share by `(recv_priv − sender_priv)`, deletes old sender-associated key; combined pubkey invariant preserved. Docs do NOT document a sequence/version field preventing previous-owner replay → **hypothesis #1 LIVE**.
- **Tree/leaves:** leaf = terminal tree tx (a user-owned UTXO ownership record); branches = internal. `TreeNodeStatus` FSM with terminal states `SPLITTED/ONCHAIN/EXITED/PARENT_EXITED/REIMBURSED`. **`CanBecomeAvailable()` guards revival — comment cites prior exploit `SP-3049` "cancel-transfer revival".**
- **Exit:** unilateral (broadcast tree root→leaf, decrementing timelocks) + cooperative. Timelock-decrement is the canonical statechain previous-owner defense.
- **0-conf deposits:** credited pre-L1-confirmation; "SSPs take on the double-spend risk" (likely accepted-risk → check SO-side accounting only).
- **FROST:** t-of-n SO + mandatory user sig; nonce commitments with unused-nonce list `B`, binding `H1(i,m,B)`.

## REPO MAP
- SO server: **Go** `spark/so/` (~400K LOC, 269 test files). Handlers `spark/so/handler/`. ent schema `spark/so/ent/schema/` (transfer/tree FSMs). Key-deletion `spark/so/entephemeral/signingkeysharesecret_*`.
- FROST: `spark/so/frost/` (Go coord) + `signer/spark-frost/` (Rust crypto).
- Tokens (BTKN/LRC-20): `signer/spark-token-primitives/`, `spark/so/handler/*token*`, `l1tokenoutputwithdrawal`.
- API surface (permissionless entry points): `protos/*.proto` (spark, spark_token, spark_internal, spark_authn, frost, dkg, gossip, multisig, spark_partner).
- Clone: `/home/claude-code/buzz-workspace/clones/spark` (depth-1, 332M).

## STEP 5 — GATE-1/2 FINDINGS (multi-agent: 25 agents, 2 rounds + critic)

**Method:** Round-1 = 6 finders × per-candidate adversarial verify + completeness critic (16 agents). Round-2 = 7 critic-surfaced leads × deep action-site trace × 2 independent skeptics (9 agents). PoC build verified on local box (no FROST FFI in handler path; embedded postgres harness).

**RESULT: 16 candidates examined → 15 NEGATE, 1 SURVIVOR (L6, carve-out A, dup-risk).**

### SURVIVOR — L6: Cooperative-exit "alibi exit_txid" leaf theft (malicious SSP → user)
- **Class:** carve-out A (protocol bug letting a malicious SSP steal from users). **Impact:** direct theft of the exiting user's leaves (ownership rotated to SSP) with zero L1 payout.
- **Mechanism [INSPECTED, end-to-end]:** the connector_tx↔exit_txid binding (`validateConnectorTxBindsToExitTxid`, `base_transfer_handler.go:2058`) is gated behind `KnobEnforceCoopExitConnectorBinding`, which **defaults to 0 (OFF)** (`base_transfer_handler.go:2042` `GetValue(...,0)>0`) and is **absent from both shipped configs** (`so.template.config.yaml`, `docker/operator.config.yaml`). In-code admission (`knobs.go:112`): *"When 0, the alibi-tx claim vulnerability is open."* A malicious SSP supplies a structurally-valid `connector_tx` + an unrelated real-but-alibi `exit_txid`; the SO stores the alibi (`coop_exit_handler.go:177/326`), the chain watcher confirms on the alibi (`watch_chain.go:839-861`) and applies the pre-stored `KeyTweak`, rotating the user's leaves to the SSP (`watch_chain.go:1268-1334`) — **no fresh user FROST share consulted at this site**. The user's refund needs the real connector outputs (`base_transfer_handler.go:2178`), which never exist on-chain (the real exit is never broadcast) → user loses leaves, gets nothing.
- **[EXECUTED] PoC:** `clones/spark/spark/so/handler/coop_exit_alibi_default_off_buzzpoc_test.go` → `TestBuzzPoC_CoopExitAlibiAcceptedWithDefaultKnob` **PASS**. Proves: default knob → alibi `exit_txid` ACCEPTED verbatim (binding skipped); knob=1 → rejected ("does not match exit_txid"). Unit-level, no bitcoind/SO env. Local-fork only, NOT pushed. (Full leaf-rotation tier-B PoC sketch: `watch_chain_test.go:657-1000` harness with mockable `tweakKeysForCoopExitFunc` + `NewTestSQLiteContext` — feasible, not run.)
- **Scope:** SO-side enabler is wholly in the in-scope `buildonspark/spark` repo. **NOT** in the published Immunefi known-issues (only re-orgs + config templates).
- **⚠️ DUPLICATE-RISK: HIGH → OPERATOR DECISION.** The repo's own regression test `grpc_test/coop_exit_test.go:212` is named *"reproduces the Immunefi attack"* and the fix ships **written-but-gated** → near-conclusive evidence this exact attack was **already reported** and is being remediated via gradual knob rollout. A fresh Critical submission is very likely closed as known/duplicate. **Buzz recommendation: LEAN SKIP.** The only net-new angle is "the disclosed fix is default-OFF in shipped config (still exposed in production)" — weak, since production knob state is unverifiable (mainnet testing prohibited) and triagers treat pending-remediation as informational. → **FLAGGED to Ogie; not submitted.**
- **2026-06-11 SKIP CONFIRMED (Ogie msg 8227).** Do NOT submit (near-certain DUP). The lone net-new angle ("fix ships default-OFF") is itself **foreclosed by Known-Issue #1** ("shipped configs are dev templates, not production — don't rely on these values") → the default-OFF knob in `so.template.config.yaml` is exactly a non-production value, OOS. Doctrine #60 + #61 + this foreclosure receipt = banked, DONE. **KEEP INTERNAL:** per disclosure rule, an un-submitted finding NEVER becomes an HSaaS/marketing talking point.

### NEGATED (15) — all code-grounded, honest tags
| # | Surface | Why NEGATE (the guard / exclusion) |
|---|---------|-----------------------------------|
| R1-1 | transfer cancel-revival (SP-3049) | `CanBecomeAvailable()` refuses revival of EXITED/ON_CHAIN/SPLITTED; the divergence is documented accepted-risk (SP-3195); on-chain-theft variant needs quorum (out-of-bound). |
| R1-2 | FROST nonce retry-fingerprint reuse | retry-fingerprint binds msg+userCommitments+keyshareId; dev-tested; two distinct shares can't collide as one retry. |
| R1-3 | coop-exit alibi (knob) | = L6 (re-surfaced & promoted in R2). |
| R1-4 | LN RECEIVE refund bytes unvalidated | bytes are user-partial-signed, write-only; SO never FROST-co-signs RECEIVE refunds → defense-in-depth gap, not theft. |
| R1-5..7 | deposit 0-conf / pre-conf credit | SSP-absorbed accepted economic risk; inflated leaf BaseTxid never matches a real confirmation → never AVAILABLE/spendable. |
| R1-8 | token freeze-after-REVEALED no-op | issuer-privileged, by-design commit semantics (Doctrine #59). |
| R1-9 | token broadcaster knob bypasses sender-id | every spend still gated by owner cryptographic signature; admin-only knob. |
| **L1** | **value-conservation constructor asymmetry** | **`NewSigningJobWithPregeneratedNonce` lacks the value check, but every caller (4 renew + claim) re-derives the signed tx server-side bounded to `parentAmount`/leaf-value and runs `CompareTransactions` byte/value-equality → no inflated output can be co-signed.** |
| L2 | aggregate-node revival | `CanBecomeAvailable()==TRUE` for AGGREGATED is a real latent gap, but AGGREGATED is **never written by any production path** + transfer entry is AVAILABLE-only under `ForUpdate` → unreachable. |
| L3 | gossip RawTx/RawRefundTx overwrite | poisoned bytes re-derived/re-anchored to parent RawTx + un-overwritten `OwnerSigningPubkey`; user FROST share required → single-SO DB desync/DoS, not theft. |
| L4 | internal_renew value-injection | value server-re-derived (`renew_leaf_handler.go:401/635`); SO-only RPC; spend re-binds `node.Value` to user-signed output. |
| L5 | DKG/keyfix resharing | Issue-protocol Round-3 aborts off-polynomial shares → SE pubkey invariant; `sk_user` never in any SO DB → stays mandatory; repairs to SAME value. |
| L7-A | pre-conf/inflated leaf off-chain spend | every off-chain consumer enforces AVAILABLE-only (`base_transfer_handler.go:1005`); AVAILABLE requires real confirmation. |
| L7-B | cancel-revival min-faulty-SO count | spending the revived leaf needs a FROST **quorum** of faulty SOs (out-of-bound); cancel blocked once any SO commits the key tweak. |

### KEY ARCHITECTURAL TAKEAWAY (the universal NEGATE backstop)
Spark's SO server **never trusts client-supplied value/owner/tx bytes**: every money-moving artifact is **server-reconstructed from the parent leaf's own on-chain RawTx and CompareTransactions'd**, and **every spend requires the user's FROST share (`sk_user`, never stored in any SO DB)**. This closes the entire class of "single faulty SO inflates/moves a leaf" (L1, L3, L4, L5) and "stale-state revival" (L2, L7) hypotheses — the 1-of-N invariant holds in code. The ONLY surviving gap is L6, where the defense exists but is a **default-OFF feature flag**, and that is near-certainly already-disclosed.

