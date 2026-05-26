# Filecoin Immunefi — Gate 1 Surface Map

**Date:** 2026-05-26 (Day 26 morning, ~04:08 UTC)
**Program:** Filecoin (Immunefi)
**Authority:** Ogie Day 26 morning hunting batch, PRIORITY #4 of 5
**Scope:** Standing-Intake-Protocol Gate 1
**Wall-clock:** ~12 min elapsed (90-min budget)

---

## Step 1 — PROFILE

| Field                       | Value                                                                                                                            |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Platform                    | Immunefi                                                                                                                         |
| URL                         | `https://immunefi.com/bug-bounty/filecoin/`                                                                                      |
| Status                      | **ACTIVE** (live since 2023-04-14, last updated 2026-03-16)                                                                      |
| Critical cap                | **$150,000**                                                                                                                     |
| Critical minimum            | **$100,000** (10% of funds directly affected formula)                                                                            |
| Other tiers                 | High $10K–$100K / Medium $2K–$10K / Low $1K–$2K                                                                                  |
| Paid lifetime (Immunefi)    | **$404,100** ($650K all-channel per program prose; ~100+ researchers historically engaged)                                       |
| KYC                         | **Required** (full name, country, US tax forms post-validation)                                                                  |
| Languages                   | Go (Lotus node), Rust (builtin-actors), C (cbor-gen helpers)                                                                     |
| PoC                         | Runnable PoC required, Immunefi PoC Guidelines; local-fork testing only                                                          |
| In-scope orgs               | `github.com/filecoin-project/*`, `github.com/ipfs/*`, `whyrusleeping/cbor-gen`, `lurklab/neptune`, `lurklab/trition`              |
| Out-of-scope                | Mainnet/testnet testing, pricing oracle testing, third-party smart contracts, social engineering, DoS, previously disclosed bugs |
| Known-issues authoritative  | `https://spec.filecoin.io` audit reports + GitHub issues in scope repos                                                          |
| Disclosure category         | Immunefi Category 1: Transparent (post-fix disclosure permitted)                                                                 |
| Patch SLA                   | 90 days from report                                                                                                              |
| Operator-brief verification | $150K cap ✓, $100K min Critical ✓, $404K paid ✓ (matches operator-brief)                                                         |

`[INSPECTED]` source: WebFetch immunefi.com/bug-bounty/filecoin/ + immunefi.com/bug-bounty/filecoin/information/ + immunefi.com searches 2026-05-26 04:00 UTC.

---

## Audit-saturation (known-issues + DUP-avoidance per Doctrine #27)

Filecoin audits catalog (`https://spec.filecoin.io/appendix/audit_reports/`):

| Firm                | Date       | Component                       | Notes                                                                                                                                 |
| ------------------- | ---------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Oak Security        | 2023-03    | **Filecoin EVM (FEVM)**         | Only 2023-2025 audit. Covered FEVM builtin-actors at v0.x era. NOTHING re-audited since FIP-0109 / FIP-0105 / FIP-0106 / EIP-1153 etc. |
| Sigma Prime         | 2020-10-20 | Lotus Daemon & Storage Miner    | 6 years old                                                                                                                           |
| Least Authority     | 2021-06-29 | Venus Daemon                    | 5 years old                                                                                                                           |
| Consensys Diligence | 2020-10-19 | Builtin Actors                  | **6 YEARS OLD on actors that have shipped FVM, EVM actor, EAM, ethaccount, datacap, FIP-0109 et al since**                            |
| Trail of Bits       | 2024-11-13 | Lotus chain/exchange (advisory) | Disclosed `validateCompressedIndices` panic-DoS via signed/unsigned cast vs slice-len; fixed Lotus v1.25.2 PR #11565, Venus v1.14.3   |
| (earlier)           | 2020       | Bellman / BLS / GossipSub / etc | Cryptography + networking layer audits — pre-FVM era                                                                                  |

**Doctrine #27 read:** moderate audit saturation pre-2023, **heavy decay** post-2023. The FVM/EVM activation in March 2023 + 4+ subsequent FIPs that shipped post-audit qualify as a **Doctrine #34 Post-Audit Composition Multiplier** event — same conditions as Cap (Sherlock Gate 1 anchor: $93K paid + 9 prior audits + EigenLayer composition layer).

ToB advisory pattern (signed/unsigned cast vs slice-len) verified scrubbed at HEAD (`validateCompressedIndices` now uses `uint64()` cast + unsigned `mi >= blsLen` comparison at `lotus/chain/exchange/client.go:288-302`) `[INSPECTED]`.

---

## Layer 0 — Git-Security Analyzer

### builtin-actors (Rust on-chain logic)

- **HEAD:** `281aa9289` 2026-05-20 12:56 UTC (v18.0.0 + post-release fixes)
- 200-commit window: 27 fix_candidates / 9 dangerous_area_changes / **0 late_changes (last 30d quiet)** / 1 revert / 19 untouched_critical / no in-repo `audits/` dir (audits external on spec.filecoin.io)
- Notable fix candidates: `50b9ed8` PR #1720 "Sector status fixes and solidity integration test" (2026-04-15, type-confusion + Rust/Solidity repr mismatch), `421b73d` PR #1659 "termination fee should use full sector duration" (2025-03-18)
- Output: `/home/claude-code/buzz-workspace/.gate1-work/filecoin-immunefi-2026-05-26/layer0-builtin-actors.json`

### lotus (Go reference impl)

- **HEAD:** `797feeb` (v1.36+ era — chain/exchange, sync, sealing)
- 200-commit window: 77 fix_candidates / 5 dangerous_area_changes / 0 late_changes / 1 revert
- Output: `/home/claude-code/buzz-workspace/.gate1-work/filecoin-immunefi-2026-05-26/layer0-lotus.json`

`[INSPECTED]`. Per Doctrine #32 v1.1 (Cycle-2 filter): NOT a foreclosure on Cycle-1 grounds — late_changes=0 in 30d is good, but the LARGER post-audit composition window (since 2023) is the bigger surface; Layer 0's 200-commit lens is too narrow to see it.

---

## Step 2 — BRAIN OVERLAP SCORE: **HIGH** (4 direct lens hits + 4 structural)

| Lens                                     | Hit                                                                                                                                                                                                                       | Evidence grade                                                                                                |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Doctrine #34 (Post-Audit Composition)** | **DIRECT HIT.** Consensys 2020 audit on builtin-actors + Oak 2023 audit on early FEVM. Since 2023: FIP-0109 (DDO notifications to user contracts), FIP-0105 BLS12-381 precompiles, FIP-0106, FIP-0101, FIP-0103, EIP-1153 transient storage, EIP-7951 P256VERIFY, EIP-7939 CLZ, secp256k1→k256 crypto swap, KAMT cache-on-set_root fix (#1667 — "recall mint failure" regression). 6+ FIPs shipped post-audit. | `[INSPECTED]` via `git log builtin-actors/actors/evm`                                                         |
| **DC-13 (Post-Audit Hook / CEI Break via Upgradeable Integration)** | **DIRECT HIT.** FIP-0109 (PR #1689, 2025-09-03) opened sector-content-changed notifications to ARBITRARY user contracts. Pre-FIP, restricted to market actor (f05). Post-FIP, any miner-published deal can route notifications through user-deployed FEVM contracts using `SendFlags::default()` (state-mutating). | `[INSPECTED]` `actors/miner/src/notifications.rs:94`                                                          |
| **DC-7 (Validating-Field ≠ Consuming-Field on Adjacent Function Pipelines)** | **DIRECT HIT.** PR #1720 (2026-04-15) fixed Rust/Solidity enum type-confusion in `SectorStatusCode` — Rust serialized variant-name CBOR while FEVM Solidity decoded as uint8. Sector-status validating side vs consuming side disagreed pre-fix. v17.x exposed; v18.0.0 fixed. KAMT `set_root` cache-stale (#1667) is the same family. | `[INSPECTED]` `actors/miner/src/types.rs:680-685`, `git show 50b9ed8`                                          |
| **DC-9 sub-2 (Zero-Timelock Migration)** | **DIRECT HIT (partial).** `change_owner_address` (miner/lib.rs:406) uses 2-step propose/confirm WITHOUT timelock. Worker change `change_worker_address:374` DOES have `worker_key_change_delay` timelock — asymmetric defense. Owner change defense relies SOLELY on the new-owner-must-sign ceremony (DC-8 family). | `[INSPECTED]` `actors/miner/src/lib.rs:406-459`                                                               |
| DC-7 sub (signature scope ≠ stored scope)| **STRUCTURAL.** Market's `publish_storage_deals` verifies AuthenticateMessage signature over original proposal (proposal.client may be BLS-robust form), then NORMALIZES addresses to ID-form before storing + duplicate-cid keying. Initial read **suggests defense intact** (post-normalization duplicate-cid lookup catches sig-replay across address forms), but worth Gate 2 verification of edge cases. | `[INSPECTED]` `actors/market/src/lib.rs:338-355`                                                              |
| DC-1 (Permissionless dispute incentive bug) | **STRUCTURAL.** `dispute_windowed_post` is permissionless. Reporter reward = `min(to_burn, reward_target)` after `repay_partial_debt_in_priority_order`. If miner already deeply underwater, total burn = 0 → reporter gets 0 reward → dispute economy degrades. Likely by-design; **mark for Gate 2 economic analysis**. | `[ASSUMED]` `actors/miner/src/lib.rs:1186-1199`                                                               |
| DC-12 (Oracle staleness on cron tick) | **STRUCTURAL.** `cron_tick` (market/lib.rs:890) is caller-gated to CRON_ACTOR_ADDR, iterates `last_cron+1..=curr_epoch` — unbounded loop if cron missed for many epochs. Documented gas-bounded design; **not a bug**. | `[INSPECTED]` `actors/market/src/lib.rs:890-1040`                                                             |
| **Doctrine #29 (Audit-Saturation does NOT foreclose pattern class)** | **DIRECT HIT.** Even though builtin-actors was audited by Consensys 2020 (heavy saturation back then), Doctrine #29 says patterns can still surface in re-audited zones via cross-pollination. The post-2023 FVM era IS the cross-pollination surface that landed unmodified through the original audit. | applies meta-analytically                                                                                     |

Operator-specified lenses verified:
- **Consensus safety:** validateCompressedIndices ToB-class scrubbed at HEAD — `[INSPECTED]` no obvious survivor of the same pattern in `lotus/chain/exchange`.
- **Storage proof verification:** `verify_windowed_post` (miner/lib.rs:4531) correctly binds entropy = serialize(receiver_address) + DST = WindowedPoStChallengeSeed + delegates to `rt.verify_post` FFI. Defense intact `[INSPECTED]`.
- **Miner penalty logic:** dispute_windowed_post applies penalty via `pledge_penalty_for_invalid_windowpost` + records faults + bounds reward at burn — economically sound on first read, but reporter-reward-degradation edge case noted above `[ASSUMED]`.

---

## Step 3 — EV CALCULATION

```
EV = P(finding) × bounty_cap × P(acceptance) × brain_overlap_multiplier
```

| Factor                    | Value | Rationale                                                                                                                                                                                  |
| ------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P(finding)                | 0.12  | HIGH overlap on Doctrine #34 + DC-13 + DC-7; NEW substrate for Buzz (no prior Filecoin brain coverage); Rust on-chain logic + FEVM = high attack-surface complexity                        |
| bounty_cap                | $150K | Critical cap                                                                                                                                                                               |
| P(acceptance)             | 0.50  | Filecoin Foundation = established payer ($404K paid lifetime; ~100+ researcher engagements; Trail of Bits relationship); KYC required + 90d SLA suggests structured triage                |
| brain_overlap_multiplier  | 1.0   | HIGH overlap                                                                                                                                                                               |
| **EV nominal**            | **$9,000** | At Critical                                                                                                                                                                                 |
| Adjusted up               | +20%  | Doctrine #34 amplifier: 3-year-old audit on actively-composed-with substrate increases P(finding) multiplicatively                                                                          |
| **EV adjusted**           | **~$10,800** | If a HIGH-tier finding instead (P(finding)=0.20 × $100K High-cap × 0.50 × 1.0 = $10K)                                                                                                       |

**Comparison to today's queue:**
- Raydium $1.7M paid Immunefi (PRIORITY #1, parallel) — higher payer density, but Filecoin's $100K minimum Critical is HIGHER than Raydium's
- ALEX $100K FORECLOSURE today — substrate dead
- Hydration $500K WATCHLIST today — defenses all intact, MED-LOW EV
- JustLend (PRIORITY #5, parallel)
- Stacks (PRIORITY #3, parallel)

EV ranking within today: **mid-pack — better than ALEX (foreclosed) + Hydration (watchlist), competitive with Stacks / JustLend depending on their outcomes. The $100K MINIMUM Critical is the distinguishing feature.**

---

## Step 4 — QUEUE DECISION

| Overlap | Bounty cap | Recommended action       |
| ------- | ---------- | ------------------------ |
| HIGH    | $50K-$500K | **Standard Gate 1** (this hunt) — completed; recommend **Gate 2 candidate queued (conditional)** on operator review of leads 1-3 below |

**Verdict:** **GATE-1-COMPLETE → Gate 2 CANDIDATE QUEUED (conditional).** 3 leads with structurally-distinct attack surfaces; the $100K min-Critical payoff + 3-year-old audit + active FIP shipping window justify Gate 2 escalation IF operator approves one of the top 3 lead investigations.

---

## Step 5 — GATE 1 EXECUTION

### 5.0 Layer 0 (above) ✅

### 5.1 Pre-flight scope-check

In-scope assets (per Immunefi program page): `github.com/filecoin-project/*` (catch-all) + `github.com/ipfs/*` + 3 vendored deps. **builtin-actors + lotus both IN-SCOPE** — high-confidence match.

### 5.2 Bytecode-verify prep (deferred to Gate 2)

For builtin-actors findings: the runtime publishes CodeCID-addressed bytecode for each actor; verification path is to query Lotus mainnet state-tree for the CodeCID at the actor's address and compare to a deterministic build from the source SHA. Plan: build builtin-actors at HEAD with cargo + `make bundle` + extract per-actor CodeCID + diff vs `lotus state network-version` actor CIDs. Tooling exists (`lotus state actor-cids`).

### 5.3 Inventory

- **builtin-actors:** 244 `.rs` files, ~110K LOC, 15 actor crates (`account`, `cron`, `datacap`, `eam`, `ethaccount`, `evm`, `init`, `market`, `miner`, `multisig`, `paych`, `placeholder`, `power`, `reward`, `system`, `verifreg`)
- **lotus:** 1,386 `.go` files (full repo), 121K LOC just in `chain/` dir, 531 .go files there
- Entry-functions: miner-actor has 19 external methods (submit_windowed_post, dispute_windowed_post, pre_commit_sector_batch2, prove_commit_sectors3, prove_commit_sectors_ni, extend_sector_expiration2, terminate_sectors, declare_faults, declare_faults_recovered, withdraw_balance, change_beneficiary, repay_debt, on_deferred_cron_event, change_worker_address, confirm_change_worker_address, change_owner_address, change_peer_id, change_multiaddresses, etc.); market actor 14 external methods.

### 5.4 Brain lens application — see Step 2 ABOVE

### 5.5 5-Target Quality Checklist (Standing-Intake Step 5.6)

| Target               | Coverage | Findings                                                                                                                                                                                                                |
| -------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Withdraw / Redeem | ✅       | `miner::withdraw_balance` (CEI-compliant — `rt.transaction()` closes BEFORE `send_simple`); `market::withdraw_balance` permission-gated to deal-participants                                                              |
| 2. Liquidation / Oracle | ✅       | `dispute_windowed_post` IS the Filecoin slashing path; permissionless reporter, reward+burn split; reporter-reward-degradation edge case noted `[ASSUMED]` LOW                                                          |
| 3. Deposit / Mint Shares | ✅       | `pre_commit_sector_batch2` + `prove_commit_sectors3` (sealing FSM); deposit-equivalent is `add_balance` on market+miner actors                                                                                          |
| 4. External Calls    | ✅       | **HIGHEST-INTEREST:** FIP-0109 `notify_data_consumers` (miner/notifications.rs:88) uses `SendFlags::default()` — state-mutating callback to user contract; called from `prove_replica_updates3:999` + path at lib.rs:1676 |
| 5. Admin / Upgrade   | ✅       | `change_owner_address` (no timelock, 2-key ceremony); `change_worker_address` HAS `worker_key_change_delay` timelock; **asymmetric defense across two adjacent setters** — DC-9 sub-2 partial hit                       |

All 5 target-classes touched ✅. Surface map QUALITY PASS.

### 5.6 Detector rotation — SKIPPED

V6 detectors are Solidity-only. Filecoin substrate is Rust + Go. Manual triage per Percolator (Rust) + ALEX (Clarity) + Hydration (Substrate-Rust) precedent.

### 5.7 Doctrine #30 grep-primitive (defense markers)

Filecoin defense primitives confirmed present:
- `rt.validate_immediate_caller_is(...)` — caller-gated access control (used 91× across builtin-actors)
- `rt.validate_immediate_caller_accept_any()` — explicit permissionless marker (used where dispute, publish_storage_deals are by-design open)
- `rt.transaction(|state, rt| { ... })` — atomic state-scope (Filecoin actor-model CEI guarantee)
- `SendFlags::READ_ONLY` — explicit read-only cross-actor call (used in deal signature verification — CORRECT)
- `SendFlags::default()` — state-mutating cross-actor call (used in `send_notification` for FIP-0109 — **THE PRIMARY DC-13 CONCERN**)

### 5.8 Known-issues cross-reference

- Trail of Bits 2024-11 advisory (validateCompressedIndices) → **SCRUBBED** at HEAD `[INSPECTED]`
- Oak Security 2023 FEVM audit → addressed pre-FVM-launch; FEVM has since added 6+ EIPs not covered by that audit
- Consensys Diligence 2020 builtin-actors → pre-FVM era; **none of the FIP-0109/FIP-0105/FIP-0106/FIP-0103/FIP-0101 era code was audited by this firm**

### 5.9 Output — THIS FILE

### 5.10 R8 Calibrated Reporting tags

Per Doctrine + Operator-Brief-Reconciliation: tags `[INSPECTED]` / `[ASSUMED]` applied per-claim above. **Zero `[EXECUTED]` claims** — no on-chain query made, no PoC run. All lens hits source-confirmed at HEAD via Read + Grep.

---

## TOP 3 LEADS — file:line + class + R8 + DUP verification

### LEAD 1 — FIP-0109 user-contract notification surface as side-channel for miner-incentive games (DC-13)

- **File:** `actors/miner/src/notifications.rs:88-133` + call-site `actors/miner/src/lib.rs:999, 1676`
- **Class:** DC-13 (Post-Audit Hook / CEI Break via Upgradeable Integration) + Doctrine #34 (Post-Audit Composition Multiplier)
- **R8:** `[INSPECTED]` for code path + FIP semantics; `[ASSUMED]` for the specific attack scenario quantification
- **Description:** FIP-0109 (merged 2025-09-03, PR #1689, shipped in v17.0.0) removed the restriction that limited `notify_data_consumers` recipients to the storage market actor (f05). Now ANY user-deployed FEVM contract address can be passed as a notifee in `PieceActivationManifest`. The send uses `SendFlags::default()` (state-mutating) and the response shape is checked via `validate_notification_response` (counts and accept-flags) but the receiver's behavior during the call is unrestricted.

  Attack-class A (**DoS on sector activation**): per FIP's own risk acknowledgement, a malicious notifee can burn gas to abort sector commitment. Per FIP, "storage providers must therefore treat all notification receivers as potentially hostile." This class is acknowledged + likely Medium-tier at most.

  Attack-class B (**bypass of external integrity-checking systems via friendly notifee**): NOT discussed in the FIP. A miner can register THEIR OWN contract as the notifee, pre-program it to ACK any payload (returning `accepted: true` for every piece), bypass external data-DAO / verification-service integrity checks while STILL appearing in the network as having published a deal whose data has been "verified by the notifee." External verifiers downstream that trust SECTOR_CONTENT_CHANGED dispatch as "deal data attested" would be tricked. The miner gets pool credit / publication credit / verified-data-bonus pricing without the external system's actual verification. Lead severity HIGH if the external composability assumption is concretely paid-out (data DAOs paying for verified data, etc.).

  Attack-class C (**reentrancy into miner state via cross-actor callback**): the notifee callback runs WITHIN the miner actor's prove_replica_updates3 / prove_commit_sectors3 execution context, AFTER `update_replica_states` has committed state (L970-976) but BEFORE the function returns. A malicious notifee could call back into market actor's `add_balance` / `publish_storage_deals` and observe an intermediate state. Filecoin's transaction-scope model bounds the reentrancy risk, but the call chain is NEW post-FIP-0109 and was not modeled by any prior audit.

- **Defense audit:** Consensys 2020 + Oak 2023 + ToB 2024-11 — NONE covered FIP-0109. `[INSPECTED]` no prior disclosure of this surface on Immunefi disclosed-findings page or Trail of Bits blog. **NOT DUP.**

- **Gate 2 plan:** (1) trace `notifee.payload` through the FEVM contract dispatch — is it user-controlled? (2) check Filecoin docs.filecoin.io for data-DAOs that consume SECTOR_CONTENT_CHANGED as authoritative verification, (3) model a self-notifee scenario quantitatively (gas budget vs external reward), (4) bytecode-verify the v17+ deployed CodeCID for miner actor matches the post-FIP-0109 source.

### LEAD 2 — SectorStatusCode enum repr-divergence between Rust and Solidity (DC-7, recently-fixed; check whether pre-fix code reached mainnet)

- **File:** `actors/miner/src/types.rs:680-685` (post-fix at v18.0.0); pre-fix CodeCID at v17.x mainnet network version
- **Class:** DC-7 (Validating-Field ≠ Consuming-Field on Adjacent Function Pipelines)
- **R8:** `[INSPECTED]` for the diff + repr change; `[ASSUMED]` that v17 was deployed to mainnet before the v18 fix
- **Description:** PR #1720 (merged 2026-04-15, in v18.0.0) added `#[derive(Serialize_repr, Deserialize_repr)]` + `#[repr(u8)]` to `SectorStatusCode` enum + reordered variants. Pre-fix, the enum serialized as variant-name CBOR. Solidity consumer (`SectorStatusChecker.sol` — newly added test contract) decoded as uint8. **The Rust validating side and the Solidity consuming side disagreed on the enum's wire format pre-fix.**

  If v17.0.0 was deployed to mainnet with FEVM contracts already exercising `ValidateSectorStatus` calls — and any production FEVM contract used the buggy decoding — there was a window where validating-field semantics and consuming-field semantics diverged. A miner could submit data that one side accepts as valid and the other side rejects.

  **Importantly: PR #1707 (`feat: expose sector status to FEVM`, 2025-12-XX, earlier) was the function ADDED. PR #1720 was the FIX. So there's a window between PR #1707 and PR #1720 where the divergence existed. Whether mainnet exercised this path at scale is the Gate 2 question.**

- **Defense audit:** none — added post all audits.
- **Gate 2 plan:** (1) Find PR #1707 commit + the v17.x release tag that includes it. (2) Compute time delta from PR #1707 merge → PR #1720 merge → v18.0.0 release. (3) Bytecode-verify mainnet builtin-actors miner CodeCID — if it matches pre-fix v17.x, the divergence is on-chain LIVE. (4) Search FEVM ecosystem for any contract calling `ValidateSectorStatus` — Recall Network is a candidate consumer per PR #1667 commit message ("recall mint failure").
- **DUP:** **NOT DUP** — PR #1720 was a fix without external advisory; no Immunefi disclosed-finding references SectorStatusCode.

### LEAD 3 — Asymmetric timelock defense between `change_owner_address` and `change_worker_address`

- **File:** `actors/miner/src/lib.rs:343-459` (`change_worker_address` + `confirm_change_worker_address` + `change_owner_address`)
- **Class:** DC-9 sub-2 (Zero-Timelock Migration) — partial; the defense is the 2-key ceremony, not timelock.
- **R8:** `[INSPECTED]` for the code paths; `[ASSUMED]` for whether the asymmetry materially impacts mainnet-deployed miners
- **Description:** `change_worker_address` (L343-386) uses an effective_at timelock: `effective_at: rt.curr_epoch() + rt.policy().worker_key_change_delay`. A subsequent `confirm_change_worker_address` call must wait until that epoch to take effect (process_pending_worker at L395). This is DC-9 sub-2 DEFENSE PRESENT.

  `change_owner_address` (L406-459) does NOT use any timelock. It's a 2-step propose/confirm where:
  - First call (by current owner) sets `pending_owner_address`
  - Second call (by the proposed new owner) confirms the change
  The defense is "the new owner must sign" — which means a single compromised owner key cannot unilaterally change ownership. **But there is no time delay between propose and confirm.** A compromised owner key + a compromised proposed-owner key (both available to attacker) can complete the transfer in 2 consecutive blocks with no community-observable window.

  Cross-reference: Drift Protocol $285M drain (CANDIDATE-P + DC-9 sub-2 canonical anchor) was zero-timelock migration. Filecoin's owner change is closer to "2-key ceremony, no timelock" — which is BETWEEN the strong defense (timelock + multi-key) and the weak defense (single key, zero timelock). It is RELATIVELY weaker than `change_worker_address`. Is this a finding? **Marginal — depends on threat model.** For SP (storage provider) operations where the same operator holds both keys, the 2-key ceremony provides no defense; a single host compromise drains both. For owner-as-DAO + worker-as-operator-key setups, the 2-key ceremony IS meaningful.

  **Gate 2 worth: LOW-MEDIUM.** The strongest version of this finding is a Medium-tier ($2K-$10K) for "defense asymmetry between adjacent setters in the same actor." Triage-likely to be marked "intended design" by Filecoin Foundation since the 2-key requirement is the design.

- **DUP:** **NOT DUP** — no prior disclosure of this specific asymmetry.

---

## BRAIN COMPOUND PROPOSALS (FROZEN PENDING OPERATOR)

1. **(C-Filecoin-1) DC-13 sub-pattern enrichment "Notification-callback admits attacker-controlled notifee in storage L1"** — proposed sub-pattern: when a cross-actor notification target is user-set in the message params AND the send uses state-mutating flags AND the notifee return-value is consumed as an attestation of payload validity, the system admits a self-notifee bypass. Canonical anchor: Filecoin FIP-0109 `notify_data_consumers` post-FIP. Adjacent to existing DC-13 anchors but expands the family from "upgradeable contract address" to "user-set notification target field."

2. **(C-Filecoin-2) Doctrine #34 second-anchor — Filecoin post-2023 FVM era as a parallel to Cap's EigenLayer-on-Symbiotic composition multiplier.** Single audit (Oak 2023) covered FEVM at activation; subsequent 6+ FIPs activated composition layers without parity re-audit. EigenLayer Cap analog. Promote Doctrine #34 from single-anchor to dual-anchor.

3. **(C-Filecoin-3) DC-7 sub-pattern "Cross-language enum repr divergence between native VM and FEVM"** — when a builtin-actor types enum is consumed by both Rust callers AND Solidity-FEVM callers, the serialization repr MUST be explicit (`#[repr(uN)]` + `Serialize_repr`). Default Rust enum CBOR variant-name serialization vs Solidity uint8 decode is a footgun for the entire Filecoin actors surface. Adjacent to KAMT `set_root` cache-stale class (#1667 — same family: type-system mismatch between Rust caller and FEVM caller). Detector spec: AST-grep for `pub enum` declarations in builtin-actors that are reachable via FEVM precompile / runtime call without `#[repr]` attribute.

4. **(C-Filecoin-4) Watchlist-Candidate-Crossmap add Filecoin row** — DC-7 + DC-9 sub-2 + DC-13 + Doctrine #34 lens hits + storage-L1 substrate first-time entry. Net-new substrate class for the matrix (joins Cosmos/Polkadot-Substrate/Clarity/Rust-Solana/EVM/Sui-Move/CosmWasm-Wasm; storage-L1-FVM is new).

5. **(C-Filecoin-5) Standing-Intake Step 5.3 enrichment for FEVM-era Filecoin substrates** — when inventorying a Filecoin or any storage-L1 target post-FVM-activation, ALWAYS check (a) FIP catalog at github.com/filecoin-project/FIPs for post-audit-date FIPs that shipped, (b) the EVM actor's precompile directory for recent EIP additions, (c) the cross-language interface (Rust ↔ FEVM Solidity) for type-system divergences. The FVM-era surface is structurally different from pure-Rust pre-FVM surface and a 2020 audit doesn't cover any of it.

---

## DISK + RESOURCE NOTES

- **Pre-clone:** 87% (4.7GB free)
- **Post-clone:** 86% (5.1GB free — disk dropped because dedup/compaction during clone)
- **Halt at 88% NEVER triggered.** Closest approach: 88% briefly mid-lotus-clone, then settled back.
- **Repos retained:** `builtin-actors` (8.5MB) + `lotus` (77MB partial-blob filter). Both retained for Gate 2.
- **ref-fvm NOT cloned** per the resource budget; if Gate 2 dispatches, will need it.
- **Layer 0 JSON outputs retained:** `layer0-builtin-actors.json` + `layer0-lotus.json`.

---

## VERDICT

**GATE-1-COMPLETE → Gate 2 CANDIDATE QUEUED (Conditional)** on operator review.

| Component                  | Status                                                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Standing Intake Steps 1-6  | ✅ all touched                                                                                                       |
| Brain overlap              | **HIGH** (4 direct + 4 structural lens hits)                                                                         |
| Top 3 leads                | Surfaced with R8 tags                                                                                                |
| 5-target checklist         | ✅ 5/5 covered                                                                                                       |
| Doctrine #27 audit-saturation read | Moderate pre-2023, **HEAVY decay post-2023** — Doctrine #34 condition triggered                              |
| Doctrine #29 read          | Pattern class NOT foreclosed by audit history; FIP-0109 + EIP additions are explicit post-audit composition surface |
| Doctrine #32 v1.1 read     | DOES NOT apply (active fix-cadence + post-audit composition; not "code-stable+detector-clean")                       |
| Doctrine #34 read          | **DIRECT HIT** — 6+ FIPs shipped between Oak 2023 audit and HEAD; same structural condition as Cap                  |
| 5 brain proposals          | Surfaced (FROZEN pending operator)                                                                                   |
| Wall-clock                 | ~12 min vs 90-min budget                                                                                             |
| Disk delta                 | -1pp (87% → 86%)                                                                                                     |

**Operator decision required:**

**(a) Greenlight Gate 2 on Lead 1 (FIP-0109 self-notifee bypass)** — strongest EV; requires (i) bytecode-verify miner actor v17+ deployed CodeCID, (ii) trace docs.filecoin.io for external systems treating notify_data_consumers as authoritative verification, (iii) draft a self-notifee PoC against a local-fork lotus devnet.

**(b) Greenlight Gate 2 on Lead 2 (SectorStatusCode enum divergence)** — high-precision DC-7 anchor; requires (i) bytecode-verify v17.x mainnet miner CodeCID predates v18.0.0 fix, (ii) Recall Network code grep for ValidateSectorStatus call site, (iii) PoC of pre-fix decode mismatch.

**(c) Defer to watchlist** — file the 5 brain compound proposals + Watchlist-Candidate-Crossmap Filecoin row + intake log entry; defer Gate 2 dispatch.

**(d) Foreclosure-Receipt** — if operator deems all 3 leads sub-threshold for the $9K-10.8K nominal EV, foreclose with Doctrine #29 anchor (pattern class NOT closed; brain proposals filed; storage-L1 substrate first-time entry preserved as future Lane 1 capability).

**Default recommendation: (a) Greenlight Lead 1.** Strongest structural signal + best Doctrine #34 evidence + highest expected payout. Bytecode-verify can be done in <30 min via Lotus state-actor-cids query.

---

_Hunt: hunts/2026-05-26-filecoin-immunefi-gate1.md_
_Authority: Ogie Day 26 morning batch PRIORITY #4_
_R8 calibrated, 3 [INSPECTED]-anchored leads + 1 [ASSUMED] secondary_
_Bismillah._
