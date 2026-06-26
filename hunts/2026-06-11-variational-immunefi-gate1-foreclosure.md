# Gate-1 Foreclosure — Variational (Immunefi, Arbitrum perps) — 2026-06-11

> Ogie msg 8243 (P4 LOOP TICK-3, guards bumped to max_iter 3 / $150). Doctrine #65 recency-first selection. Auto-mode ANALYSIS-ONLY. Bismillah.

## SELECTION — Doctrine #65 (recency-of-listing > obscurity)
Pulled the freshest live-since Immunefi programs from the bug-bounty index RSC payload (`launchDate` field). Freshest non-banked, EVM-preferred:
- onre (2026-05-11) = **Solana/Rust** → deprioritized (fresh-EVM available, #65 rule 2)
- spark-lightspark, zest-protocol-v2 = BANKED · alchemix (2026-02-26), hermetica (2026-05-30) = ALREADY HUNTED (prior Gate-1s)
- KAST (2026-04-20) = **Solana** (M0 stablecoin extension) → deprioritized
- **variational (2026-03-16, $100K, Arbitrum/EVM) = PICK** — freshest dedup-CLEAN fresh-EVM; never bounty-hunted (the 2 brain mentions are cross-refs in ssv/ostium hunts). twyne=ETH-only (RPC blocked) deprioritized; royco/katana = clean backups.

## GATE-0 → PASS
- ACTIVE since 2026-03-16 (fresh, ~3mo) · **Arbitrum/EVM**, arb1 RPC reachable → `[EXECUTED]` PoC feasible · KYC yes (submission-time only, operator-gated) · PoC required.
- Reward: Critical SC = **10% of directly-affected funds, MIN $10K, MAX $100K**. A real permissionless Critical clears the floor.
- **Realizable-EV CONFIRMED [EXECUTED, cast]:** OLP custody `0x74bb…f2cd` holds **~$25.2M USDC**, Treasury `0x5e91…d645` holds **~$3.36M USDC** (canonical Arbitrum USDC `0xaf88…5831`). Real funds exist.
- Dedup CLEAN (no prior Buzz hunt, not in ledger). **No concurrent audit-contest** (private audits completed 2026-03-13 = OOS known-issues, not crowd-comb). Egress = USDC transfers.
- **Scope note:** oracle/price-manipulation testing OOS; admin/privileged-without-code-mod OOS (Doctrine #59).

## ON-CHAIN GRAPH (Arbitrum, verified source pulled to `.tmp-build/variational-src/`)
- **Oracle.sol** (`0x84BE…6172`, 467 LOC) — clearing/settlement engine. AccessControl + ReentrancyGuard + Pausable. **EVERY function `onlyRole(PROVIDER_ROLE)` or `onlyRole(DEFAULT_ADMIN_ROLE)`.** `draft-ERC20Permit`/ECDSA/EIP712 imported but **DEAD** (zero `ecrecover`/`_hashTypedData`/`.permit(` — confirmed) → no on-chain user-signed-intent surface.
- **SettlementPoolFactory.sol** (`0x0F82…074C`) — `createPool` owner-or-oracle; deploys EIP-1167 minimal-proxy clones (impl `0x8db6…5836`) via `Clones.clone` (CREATE, atomic clone+initialize).
- **SettlementPool.sol** (clones, 332 LOC) — per-settlement USDC custody. `initialize` factory-only + once. **`depositUSDC(amount, transferUuid)` `onlyParties` = the SOLE permissionless write** (pure inflow of caller's own USDC, no extraction). ALL withdrawals/fees/batch/atomic = `onlyOracle`.

## AUDIT — 4 angles + 2-skeptic adversarial verify + completeness critic (separate contexts)
**0 raw candidates / 0 permissionless survivors / 0 confirmed → NEGATE.** The architecture is **operator-custodial**: $28.6M lives in provider hot-wallet EOAs; every on-chain value-movement is role-gated. The complete permissionless surface = `depositUSDC` (deposit-own-funds) + the `transfers_processed` UUID-dedup seam.

**Refuted candidates (all NEGATE):**
1. **`transfers_processed` UUID-poisoning** (detector #166 / Doctrine #44) — a party can `depositUSDC(1, X)` to set `transfers_processed[X]=true`, colliding with a future operator `transferUuid`/`parentQuoteUuid`/`fees_batch_id`. **NOT a permanent freeze:** the uuid is a **free-form operator-supplied uint128 with ZERO on-chain binding** to amount/recipient/pool (no `keccak256`/`abi.encode` derivation) → the operator simply re-issues a fresh uuid from the 2^128 space and the settlement succeeds. Batched paths (`collectFees`/`processTreasuryManagement*`) try/catch per-item and retry. Attacker must be a pool party, spends own USDC per poison (recoverable by oracle), cannot exhaust 2^128. → **operator-recoverable temporary griefing, below the $10K floor, effectively OOS.** `[INSPECTED]`
2. **Cache-before-validate (#166)** — the OPPOSITE of Zebra: `transfers_processed[uuid]=true` is set INSIDE the `try`, AFTER the transfer succeeds; a failed transfer hits `catch`→revert, unwinding state. No poisoned key persists. NEGATE. `[INSPECTED]`
3. **`grantRole` override bug** (Oracle.sol:438-446) — `super.grantRole()` sets the role BEFORE `require(!hasRole(PROVIDER_ROLE,...))`, so the public `grantRole` path always reverts for PROVIDER_ROLE. **Real logic bug but admin-only (DEFAULT_ADMIN_ROLE) + `addProvider()` uses `_grantRole` directly so management still works → OOS (Doctrine #59), not banked.** `[INSPECTED]`
4. **`initialize` front-run** — REFUTED: `Clones.clone` = CREATE (not CREATE2), clone+initialize atomic in one tx; `initialize` requires `msg.sender==_factory` + `factory==0` once-guard. No window. `[INSPECTED]`
5. **Codeless-custody deploy-squat** — FORECLOSED `[EXECUTED]`: OLP nonce **745,992**, Treasury nonce **537,632** → active key-controlled EOAs (nonce>0 ⇒ cannot deploy code there; not CREATE2 targets). Seizing the $28.6M needs the private key = key-security OOS. `[EXECUTED]`
6. **Reentrancy / fund-flow** — all funcs `nonReentrant`; USDC (native Arbitrum) has no transfer hook; no per-party on-chain ledger in the pool to corrupt (amounts are operator-asserted); `transferFromOLPToPool` is provider-gated, allowance only spendable by Oracle. NEGATE. `[INSPECTED]`

**Completeness critic:** independently re-read all contracts + inherited OZ + on-chain state; confirmed the census complete (no forgotten un-gated/fallback mutator; `renounceRole` inert for a role-less attacker). Verdict: **NEGATE — operator-trust architecture, nothing permissionless missed.**

## VERDICT — NEGATE (not submitted). No permissionless direct-loss / permanent-freeze.
**Structural driver:** Variational's on-chain layer is a thin operator-custodial settlement system — $28.6M in PROVIDER hot-wallet EOAs, every fund-mover role-gated, one permissionless deposit-own-funds function, and the one real permissionless seam (UUID dedup) is operator-recoverable because the dedup id is unbound/re-issuable. The bankable surface is empty without compromising the operator key (OOS).

## LENSES BANKED → Doctrine #66 (cross-ref #59 admin-OOS, #65 recency, detector #166, Doctrine #44)
1. **Operator-custodial architecture has a near-empty permissionless surface — census trigger-reachability at Gate-0 and foreclose fast.** When every fund-mover is role-gated AND TVL sits in EOAs (codeless addresses with nonce>0 holding the tokens), there is no contract bug to find; loss requires key-compromise (OOS). A 30-second `cast code`+`cast nonce` on the fund-holding addresses tells you whether the "vault" is even a contract.
2. **A dedup/identity-binding seam is only a PERMANENT freeze when the consumer is FORCED to use the poisoned id.** A free-form, caller/operator-supplied id with no on-chain binding (no `keccak256(content)` derivation) is **re-issuable** → poisoning yields operator-recoverable temporary DoS, not a bankable permanent freeze. (Refines detector #166 / Doctrine #44: check whether the id is *forced/derived* vs *free/re-issuable* before banking a freeze.)
3. **Dead imports ≠ surface.** `ECDSA`/`EIP712`/`ERC20Permit` imported does not mean a signature path exists — grep `ecrecover`/`_hashTypedData`/`.permit(` before hypothesizing signature-replay.
