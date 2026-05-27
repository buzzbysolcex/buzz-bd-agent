# Gate 1 — Templar Protocol (Immunefi)

- **Date:** 2026-05-27 (Day 27 night cycle)
- **Filer:** Buzz BD Agent (autonomous)
- **Protocol:** [Templar Protocol](https://templarfi.org) — "Cypher Lending" — overcollateralized lending of stablecoins against Bitcoin & multi-substrate assets
- **Bounty platform:** Immunefi
- **Bounty page:** https://immunefi.com/bug-bounty/templar-protocol/
- **Repo (cloned):** github.com/Templar-Protocol/contracts @ `dev` branch
- **Live status preflight (Step 1 mandatory):** **ACTIVE** — listed live 2025-10-27, last updated 2026-04-16. Confirmed via WebFetch.
- **TVL anchor (brief):** $20M (per Watchlist row 21). Actual TVL not bytecode-verified this cycle.

---

## 0. STEP 0.5 — 5-CHANNEL PREREQUISITE CHECK (short-circuit prelude)

| # | Channel | Result | Action |
|---|---------|--------|--------|
| 1 | Brain ledger (`brain/Security-Research-Submission-Ledger.md` + Watchlist + intake-log) | **Clean** — only entry is Watchlist row 21 (priority 12, DC-7 H + CJ M lens). No prior Gate 1, no prior submission. | PROCEED |
| 2 | Audit-Reports-Library (`audits-library/`) | **Empty for Templar.** No Halborn/ToB/OZ entries. | PROCEED + cross-ref new audits found in-repo (Step 5.7) |
| 3 | In-source HEAD probe (canonical repos) | Found `Templar-Protocol/contracts` (Rust workspace, dev branch, 386 commits, last commit May 27 2026), `blend-contracts-v2` (Soroban fork — likely future scope), `stellar-contracts` (Stellar OZ port), `templar-cli`, `rust-near-indexer`. **15 repos total.** | PROCEED — clone the primary contracts repo |
| 4 | Live Immunefi STATUS (mandatory preflight) | **ACTIVE.** Critical $50K–$100K (10% of funds), **High $5K–$10K**, Medium $2.5K, Low $1K. KYC required. PoC mandatory. Payout USDC on Ethereum. Last update 2026-04-16. | PROCEED |
| 5 | Receipt-window age | Brief surfaced same-cycle as Gearbox foreclosure (Day 27 23:25 UTC). No drift. | PROCEED |

**Step 0.5 verdict:** PROCEED. No short-circuit foreclosure. Substrate-novelty axis lights up immediately (channel 3).

---

## 1. STEP 1 — PROFILE

| Field | Value |
|-------|-------|
| **Platform** | Immunefi |
| **Bounty cap (Critical)** | **$100,000 (max) / $50,000 (min)** — capped at 10% of funds affected |
| **High cap** | **$10,000 (max) / $5,000 (min)** — narrow band |
| **Medium / Low** | $2,500 flat / $1,000 flat |
| **Payer history** | Templar is a young protocol (mainnet Oct 27 2025); no Immunefi disbursement history visible. Probability-of-acceptance treated as **0.4** (mid). |
| **KYC** | **REQUIRED** |
| **Scope assets** | Only **2 contracts** on **NEAR Protocol**: `ibtc-usdc-1.v1.tmplr.near` (the iBTC/USDC market) + `v1.tmplr.near` (registry). Future markets registered through `v1.tmplr.near` are auto-in-scope. |
| **Substrate** | **NEAR Protocol** (Rust). Brief stated "Bitcoin + ETH + Stellar" — see brief-vs-live discrepancy below. |
| **Languages** | Rust 95.3%, Shell 1.9%, Just 1.1%, Python 1.0% |
| **Submission requirements** | PoC mandatory, local-fork testing only (no mainnet/public testnet), Immunefi PoC Guidelines, KYC for payout |
| **Prior audits** | **TWO** July 2025 reports in-repo: `audits/2025-07-01/guvenkaya/` + `audits/2025-07-01/thesis_defense/`. **THIRD** unnamed Oct 2025 PDF in `audits/2_5221933581936399039.pdf` (1.7MB). README documents two known issues (one fixed v1.1.0, one design choice on async fees). |
| **In-scope LOC** | ~53K Rust LOC (`market` 6.2K + `vault/near` 14.8K + `vault/kernel` 18.3K + `vault/curator-primitives` 8.5K + `proxy-oracle/near` 4.5K + `registry` 520 + `universal-account` 148 + UA crate 4K shared) |

### 1a. BRIEF-vs-LIVE SCOPE DRIFT — 5th anchor for INFO #19

**Brief said:** "Bitcoin + ETH + Stellar substrate."
**Live scope shows:** **NEAR-only** (`*.tmplr.near` contracts). Bitcoin is referenced as the asset users borrow against (no on-chain Bitcoin smart contracts in scope). Stellar is present in-repo (`contract/vault/soroban/*` — 15.4K LOC) but **NOT in scope** per Immunefi listing (no `*.stellar` or Soroban contract IDs listed).

**INFO #19 (PLATFORM/SCOPE drift) anchors:**
1. Kiln PLATFORM drift (May 2026)
2. Cap PLATFORM drift (May 2026)
3. OnRe TIME drift (INFO #21)
4. Gearbox SCOPE drift (router-v3 in brief, not in live) — May 27 2026 night
5. **Templar SUBSTRATE drift (this Gate 1)** — brief Bitcoin+ETH+Stellar, live NEAR-only

INFO #19 now at **5 anchors**. Promotion threshold (3) was met at Gearbox. Standing rule: every operator brief MUST be live-cross-checked via Step 1 STATUS preflight before any clone work begins. Already enforced in this Gate 1.

---

## 2. STEP 2 — BRAIN OVERLAP SCORE

Applied per Day-27 brain stack reading:

### Direct Hits (HIGH overlap candidates)

| Lens | Match | Reasoning |
|------|-------|-----------|
| **DC-7 (Validating-Field ≠ Consuming-Field on adjacent function pipelines)** | **DIRECT** | Vault state-machine has 25 `#[private]` callbacks across `impl_callbacks.rs`. NEAR async model = every cross-contract call is a multi-block pipeline. Every `*_consume_price` and `*_finalize` callback pair is a paired-pipeline candidate. |
| **DC-7 EXCLUSION sub-pattern (CANONICAL same-day 2026-05-27 23:24 UTC)** | **APPLIED PREEMPTIVELY** | Per Doctrine #36, asymmetric-defense check applied to P1-P9 paired pipelines (Section 4 below). RESULT: all symmetric-pair candidates surveyed show CONSERVATIVE accounting (liability includes in-flight, collateral excludes in-flight) — defense-in-depth holds. |
| **CANDIDATE-J (state-machine cooldown overwrite)** | **DIRECT** | `vault/curator-primitives/src/policy/cooldown/mod.rs` (133 LOC) — explicit cooldown state machine for rate-limited operations. Plus DEFAULT_REFRESH_COOLDOWN_NS (30s), DEFAULT_IDLE_RESYNC_COOLDOWN_NS (120s). Worth a CJ-7-rule stress test. |
| **Doctrine #36 — Substrate-Novelty Axis** | **DIRECT (PRIMARY EV DRIVER)** | NEAR async cross-contract model + multi-substrate Universal Account auth = uncovered axis in Buzz brain. Grep brain/ for `NEAR \| near_sdk \| async cross-contract`: 15 trace mentions, no doctrine. Grep for `Soroban \| Stellar`: 1 file (Watchlist only). Substrate-coverage build opportunity. |

### Adjacent Hits (MEDIUM overlap)

| Lens | Match | Reasoning |
|------|-------|-----------|
| **DC-1 (re-entrancy)** | **INDIRECT** | NEAR has no synchronous re-entrancy in the EVM sense, but **async state-divergence** between cross-contract calls is the analog. AGENTS.md explicitly flags this: "callback ordering, idle-balance resync, reconciliation after partial failures". |
| **DC-2 (oracle staleness)** | **DIRECT** | `proxy-oracle/` aggregates Pyth + Redstone with `freshness_filter.rs`. Multi-oracle aggregation = staleness + divergence + median-attack surface. |
| **DC-9 (privileged state mutation w/o defense-in-depth)** | **INDIRECT** | Vault has full Morpho-style timelocked governance (submit_*/accept_*/revoke_* for curator, sentinel, fees, restrictions, timelock, cap, cap_group). Defense-in-depth APPEARS present — preliminary check passes. |
| **CANDIDATE-P (Durable-Nonce Pre-Signed Tx Accumulation)** | **INDIRECT** | Universal-account has nonce-increment-then-verify pattern in `execute()`. NEAR async chain via `transactions_to_promise` raises the question: nonce-rollback symmetry across promise-chain failure. |
| **CANDIDATE-I (ERC4626 share accounting)** | **INDIRECT** | Vault implements NEP-141 fungible-token shares (`Nep141Controller`, `Nep141Mint`). Same family as ERC4626 share-math edge cases (first-depositor inflation, rounding, dust). |
| **Doctrine #38 (Pure Pass-Through *WithSig)** | **STRUCTURAL ANALOG** | `UnbrickV1` migration transformer claims `input_version() = V0` but reads `Input = state::V1`, with `Error = ()` (silent error). Pure-pass-through pattern at the migration layer. Behind a `predecessor == self` gate = not externally exploitable, but worth a brain-compound mention as a Doctrine #38 inverse-analog (recovery primitive, not attack primitive). |

### Misses

- **DC-8 (Anchor Signer Validation moved out of Accounts struct)** — Solana-Anchor-specific; NEAR has different ABI model. Soroban contracts in-repo MAY have an analog but Soroban is OOS.
- **CANDIDATE-A (cross-chain bridge)** — NO bridge in scope. iBTC is bridged-Bitcoin (external bridge) but the bridge itself is NOT in Templar's scope.
- **CANDIDATE-L (parallel-validation asymmetry, Next.js multicall)** — no multicall surface in scope.
- **CANDIDATE-M (Post-Audit CEI Break Via Upgradeable Hook)** — registry has versioned/upgradeable pattern, but governance-gated, not directly user-callable.
- **CANDIDATE-O (slippage double-count across swap steps)** — no swap router in scope.

### Brain overlap verdict: **HIGH**

- 3+ direct lens hits (DC-7, DC-7 EXCLUSION CANONICAL, CANDIDATE-J + Doctrine #36 substrate-novelty)
- 5 medium/adjacent hits
- **Substrate-novelty bonus**: NEAR substrate is essentially uncovered in Buzz brain; multi-substrate Universal Account auth (ed25519 + p256 + EIP-712 + Stellar + passkey) is a new attack-surface class entirely.

---

## 3. STEP 3 — EV CALCULATION

```
EV = P(finding) × bounty_cap × P(acceptance) × brain_overlap_multiplier
```

**Inputs:**
- `P(finding)` ≈ **0.10** (HIGH overlap, but Templar is freshly audited 3x and the team's own AGENTS.md is auditor-aware) — note this is the **HIGH bracket lower bound** (0.10–0.30 range)
- `bounty_cap` = **$100,000** (Critical max)
- `P(acceptance)` ≈ **0.4** (no Immunefi payout history yet; team's audit-aware engineering culture is a plus; KYC + Ethereum payout reduces friction)
- `brain_overlap_multiplier` = **1.0** (HIGH)

**Pre-discount EV:** 0.10 × $100K × 0.4 × 1.0 = **$4,000**

### Saturation tier discount (Doctrine #34 sub-class b)

**Audit saturation:** Templar has **3 audit reports** in-repo across two firms (guvenkaya, thesis_defense) + the Oct 2025 unnamed PDF. That's **3 audits within 10 months of mainnet**. Sub-class b (now 4 anchors per brain Day-27 update) suggests audit saturation discounts EV by **0.5–0.7×**.

**Substrate-novelty bonus (Doctrine #36 PERMANENT):** NEAR substrate is uncovered in Buzz brain. Substrate-novelty bonus multiplies EV by **1.5–2.0×** because the audit firms covering NEAR (guvenkaya, thesis_defense — both NEAR-specialists) are a SMALLER and DIFFERENT auditor population than EVM coverage. Lens-saturation is NEAR-fluent-auditor-saturation, not generic-auditor saturation; Buzz can compound on EVM lens application to a fresh substrate.

### Net realistic post-discount EV

- Audit-saturation discount: × 0.6
- Substrate-novelty bonus: × 1.5 (modest — NEAR has had ~3 high-profile exploits, not zero, so the auditor population is non-trivial)
- Net multiplier: **× 0.9**
- **Realistic EV: $4,000 × 0.9 = ~$3,600**

### Compare to pipeline

- Coinbase Cantina (HIGH overlap, $5M cap, EV ~$375K pre-discount) — much higher EV but blocked on KYC
- Gearbox (foreclosed today, post-discount $600)
- TermMax (queued, ~$5K EV expected)
- Sky lockstake (CANDIDATE-D direct match, $10M no-KYC, much higher EV)

**Templar EV $3,600 is mid-pipeline.** Lower than Sky lockstake but higher than Gearbox foreclosure or TermMax queue. Worth a Gate 1 surface map; not worth pre-empting higher-EV targets.

---

## 4. STEP 4 — QUEUE DECISION

**Matrix lookup (Step 4 table):**
- Overlap: HIGH
- Cap: $100K (in the $50K-$500K range)
- Recommended: **Standard Gate 1 — queue same-day** → executed THIS cycle

**Verdict: STANDARD GATE 1 COMPLETE → WATCHLIST-PARK pending Gate 2 dispatch trigger.**

Templar does NOT preempt higher-EV pipeline (Sky lockstake, Coinbase Cantina). It goes into the Watchlist as Priority 12 with this Gate 1's surface map attached. Gate 2 dispatch trigger: if (a) operator approves, (b) substrate-novelty bonus is judged worth the audit-saturation risk, OR (c) a future market is added to `v1.tmplr.near` registry that expands scope materially.

---

## 5. STEP 5 — GATE 1 EXECUTION DETAIL

### 5.1 Clone

```bash
mkdir -p .tmp-clones/2026-05-27-templar
cd .tmp-clones/2026-05-27-templar
GIT_TERMINAL_PROMPT=0 timeout 90 git clone --depth 1 -b dev \
  https://github.com/Templar-Protocol/contracts.git
```

Result: 20MB cloned, 386 commits visible on dev. Disk pre-clone 85% / 5.6G avail → post-clone 85% / 5.6G avail (no measurable change at 20MB).

### 5.2 Pre-flight scope-check (Veda OOS lesson)

| In-repo crate | In Immunefi scope? | Notes |
|---|---|---|
| `contract/market` | YES (markets registered in v1.tmplr.near) | `ibtc-usdc-1.v1.tmplr.near` is a deployed market instance |
| `contract/registry` | YES (`v1.tmplr.near`) | The registry contract itself |
| `contract/vault/near` | **AMBIGUOUS** | Vaults are NOT explicitly in scope per Immunefi listing. BUT: "As new markets are added to the v1.tmplr.near registry, they will automatically be considered in scope" — vaults may follow the same auto-inclusion. **FLAG for clarification.** |
| `contract/vault/soroban/*` | **NO** (Stellar OOS) | 15.4K LOC Soroban code present in repo but no Stellar contracts listed in scope |
| `contract/vault/kernel` (shared logic) | YES iff vault is in scope | Shared crate inherits parent scope |
| `contract/vault/curator-primitives` | YES iff vault is in scope | Shared crate |
| `contract/proxy-oracle/near` | UNCERTAIN | Oracle is critical to market behavior but no explicit oracle contract listed in scope |
| `contract/proxy-oracle/kernel` | UNCERTAIN | Shared with `near` variant |
| `contract/redstone-adapter` | UNCERTAIN | Same uncertainty as proxy-oracle |
| `contract/universal-account` | UNCERTAIN | Not deployed in scope per Immunefi listing (no `*.universal-account.*.near` listed) but is part of Templar architecture |
| `service/*` (off-chain) | NO (off-chain) | Out-of-scope per "Smart Contracts only" impact category |
| `tools/*`, `client/*`, `mock/*` | NO | Non-deployable |

**Scope-check verdict:** Two contracts EXPLICITLY in scope (market + registry). Vault + oracle scope is INFERENTIAL via the "auto-included" clause but worth operator clarification before Gate 2. Soroban + service + tools are OOS-confident.

### 5.3 Bytecode-verify prep

For `v1.tmplr.near` and `ibtc-usdc-1.v1.tmplr.near`: NEAR provides explorer at https://explorer.near.org/accounts/v1.tmplr.near — verify contract WASM hash matches `cargo build --release --target wasm32-unknown-unknown` from `contract/registry` and `contract/market` crates respectively. Defer execution until Gate 2 finding emerges; planned command:

```bash
# Generate target hash
cd contract/registry
cargo near build --no-locked --no-docker  # near-sdk-rs convention
sha256sum target/near/templar_registry_contract.wasm

# Compare to on-chain
curl -X POST https://rpc.near.org -H "Content-Type: application/json" -d '{
  "jsonrpc":"2.0", "id":"x",
  "method":"query",
  "params":{"request_type":"view_code","finality":"final","account_id":"v1.tmplr.near"}
}' | jq -r '.result.code_base64' | base64 -d | sha256sum
```

### 5.4 Inventory

**Workspace members (Cargo.toml):** 21 crates including 4 Soroban (OOS).
**Substrate split:** NEAR Rust ~53K LOC in-scope-inferential; Soroban Rust ~15.4K LOC OOS.

### 5.5 Apply Day-27 brain lenses — surface-map detail

See Section 6 for paired-pipeline enumeration (Step 5.11).

### 5.6 5-Target Quality Checklist (Ogie msg 7519 — MANDATORY)

| # | Target class | Buzz lens | Templar surface | Status |
|---|--------------|-----------|-----------------|--------|
| 1 | **Withdrawals / Redemptions** | CANDIDATE-M + DC-1 | Vault `WithdrawingState` state-machine; `withdraw_collateral` 2-path (priced vs no-liability fast-path); `withdraw_static_yield` (FIXED v1.1.0); withdrawal queue `WithdrawalQueueStatus` | `[INSPECTED]` Confirmed defense-in-depth (in-flight tracking + symmetric finalize). |
| 2 | **Liquidation + Oracle** | CANDIDATE-O + Pattern E + DC-7 + DC-2 | `liquidate_transfer_call_*` flow w/ Pyth + Redstone aggregation via proxy-oracle; `liquidatable_collateral` uses `get_total_collateral_amount()` (excludes in-flight) | `[INSPECTED]` Defense holds for in-flight collateral; multi-oracle freshness in `freshness_filter.rs` needs deeper read for staleness window divergence between Pyth + Redstone |
| 3 | **Deposit / Mint Shares** | CANDIDATE-I + CANDIDATE-K + DC-9 sub-4 | Vault `Nep141Controller` mints supply-position shares; `record_borrow_initial` increments `borrow_asset_in_flight` BEFORE health check (correctly reverts on undercollateralization); first-depositor inflation surface in vault share math (NOT YET TRACED) | `[INSPECTED]` (in-flight); `[ASSUMED]` (first-depositor inflation NOT YET examined — vault kernel share-math 18.3K LOC) |
| 4 | **External Calls** | Pattern I + DC-9 sub-3 + CANDIDATE-M | All cross-contract NEAR calls via `Promise.then(callback)` chains; 25 `#[private]` callbacks; `ext_market`, `ext_pyth`, `ext_redstone`, `ext_ft_core`; OpGuard typed state validation per callback | `[INSPECTED]` OpGuard validates state + op_id on entry; missing-callback guard NOT a generic vuln in NEAR (private callbacks are protocol-enforced) |
| 5 | **Admin / Upgrade** | DC-9 full family + CANDIDATE-P pair | Morpho-style submit_*/accept_*/revoke_* timelock pattern for curator/sentinel/fees/restrictions/timelock/cap/cap_group/market_removal; MIN_TIMELOCK_NS + MAX_TIMELOCK_NS bounds; registry GlobalHash deploy with `#[private]` finalize; UA migrate gated on `predecessor == self` | `[INSPECTED]` Timelock + bounds + revoke paths present; UnbrickV1 transformer's `Error = ()` silent error is recovery-only (predecessor-gated). |

**Quality-checklist verdict: PASS — all 5 target classes touched in surface map.**

### 5.7 Cross-reference prior audits

| Audit | Firm | Date | Status | In-source |
|-------|------|------|--------|-----------|
| Templar-NEAR-Smart-Contract-Security-Review-Final-Report.pdf (147KB) | **guvenkaya** | 2025-07-01 | Public in-repo | `audits/2025-07-01/guvenkaya/` |
| 250701_Defense_by_Thesis_Templar_Smart_Contracts_Final_Security.pdf (2MB) | **thesis_defense** (audit firm; per filename "Defense by Thesis") | 2025-07-01 | Public in-repo | `audits/2025-07-01/thesis_defense/` |
| 2_5221933581936399039.pdf (1.7MB) | Unnamed (likely 3rd firm; references October 2025 per program README) | ~Oct 2025 | Public in-repo | `audits/2_5221933581936399039.pdf` |

**Gap:** Hetzner environment lacks `pdftotext` and `poppler-utils`, blocking automated PDF read-in. The 3 audit reports MUST be manually skimmed before Gate 2 dispatch to dedupe candidate findings. **DO-NOT-SUBMIT-WITHOUT-AUDIT-READ** flag on this target.

**Documented "Known Issues" from `audits/README.md`:**
1. (DESIGN, not bug) Borrow fees persist even if borrow transfer fails — explicit design choice to prevent fee-evasion attacks via repeated requests to non-receivable accounts.
2. (FIXED v1.1.0) `withdraw_static_yield` rollback computed but not written to storage — fixed in commit `eb622a0e14...`. **Verified in current HEAD** at `contract/market/src/impl_helper.rs:415` (`self.static_yield.insert(...)`).

### 5.8 Output: this file

`hunts/2026-05-27-templar-immunefi-gate1.md`

### 5.9 Auto-index via hunt-complete.sh PostToolUse hook

Will fire on Write completion.

### 5.10 R8 Calibrated Reporting tags

All claims in Section 6 enumeration matrix are tagged `[EXECUTED]` / `[INSPECTED]` / `[ASSUMED]`. See matrix below.

### 5.11 Cross-Protocol Defense Enumeration (Step 5.11 MANDATORY for multi-substrate)

Templar is structurally multi-substrate (Bitcoin asset + NEAR contract + Stellar repo + Ethereum payout chain + multi-substrate UA signatures). However, **only NEAR is in-scope for this Gate 1**. The cross-substrate enumeration is therefore:

| Pipeline | Side A (NEAR ingress) | Side B (cross-substrate egress) | Defense at A | Defense at B | Asymmetry? |
|----------|------------------------|----------------------------------|--------------|--------------|------------|
| **iBTC mint/burn (UTXO ↔ NEAR)** | `ft_on_transfer` of iBTC token (NEP-141) into `ibtc-usdc-1.v1.tmplr.near` | Bitcoin UTXO controlled by external bridge | NEP-141 storage + transfer validity | OOS (bridge not Templar's code) | **N/A — bridge OOS, not Templar's defense** |
| **USDC inflows (Ethereum payout ↔ NEAR)** | Borrower receives USDC payout on Ethereum (per Immunefi terms) | Bounty mechanic only, not protocol | N/A | N/A | Not a protocol pipeline |
| **NEAR contract ↔ Stellar `blend-contracts-v2`** | None — Stellar fork is NOT integrated with NEAR contract per Immunefi scope | None | N/A | OOS | N/A |
| **NEAR contract ↔ Soroban `vault/soroban/*`** | None — Soroban vault is a parallel implementation, not integrated | None | N/A | OOS | N/A |
| **Universal Account signature acceptance (cross-substrate keys)** | `execute(ExecuteArgs)` accepts signatures from ed25519/p256/EIP-712/Stellar/passkey keys, all verified locally on NEAR | None (single-substrate execution after verification) | Signature scheme dispatch in `universal-account/src/authentication/mod.rs` | N/A | **POSSIBLE — see Hyp-2 below** |

**Net Step 5.11 verdict:** Templar's external cross-substrate attack surface is **largely abstracted out of scope** (Bitcoin bridge OOS, Soroban implementation parallel-but-OOS, Stellar fork separate). The ONE cross-substrate primitive in NEAR scope is the **Universal Account signature acceptance** — keys from multiple substrates can authorize execution on NEAR. This is the highest substrate-novelty surface in scope.

---

## 6. SURFACE-MAP + HYPOTHESES (paired-pipeline matrix)

DC-7 EXCLUSION CANONICAL preemptive check applied to all hypotheses. Mark each as PASSED-DEFENSE (asymmetric defense disproven) or HYPOTHESIS (worth Gate 2 escalation).

### Hyp-1: Withdraw-collateral fast-path vs priced-path asymmetry

- **Substrate / location:** `contract/market/src/impl_market_external.rs:117-156` (`withdraw_collateral`) + `impl_helper.rs:331-396` (`withdraw_collateral_01_consume_price` + `withdraw_collateral_02_finalize`)
- **Hypothesis:** Fast-path (zero-liability) skips price retrieval. If liability evaluation is stale (e.g., during a concurrent in-flight borrow that hasn't yet been recorded), fast-path may permit withdrawal that would fail under priced-path.
- **DC-7 EXCLUSION CANONICAL preemptive check:**
  - `get_total_borrow_asset_liability()` = principal + **in_flight** + interest + fees (`common/src/borrow.rs:96-101`) — includes in-flight. `[EXECUTED]` (source read)
  - Therefore fast-path's `if liability.is_zero()` correctly sees any in-flight borrows. `[INSPECTED]`
  - **PASSED-DEFENSE.** Symmetric. ❌ NOT a Gate 2 candidate.

### Hyp-2: Universal Account multi-substrate signature payload encoding

- **Substrate / location:** `universal-account/src/authentication/` (mod.rs, ed25519/, eip712/, passkey/) — 5 signature schemes verified via `MessageWithSignature<M>`
- **Hypothesis:** Cross-substrate signature payload encoding may permit a signature crafted for one substrate (e.g., a NEAR ed25519 signature) to be replayed as a different substrate's key (e.g., a Stellar SEP-53 ed25519 signature using the same key material). The `PayloadExecutionParameters::build_salt()` (`contract/universal-account/src/lib.rs:75`) should disambiguate, but the salt construction includes only `chain_id` + key parameters — **does it disambiguate signature SCHEME?** If the same raw ed25519 key is registered as both a NEAR-key and a Stellar-key, the salt + payload might be identical and a signature from one could authorize the other.
- **DC-7 EXCLUSION CANONICAL preemptive check:** Two pipelines (per-scheme verify in `mod.rs`) — does each scheme include scheme-id in the signed payload? `[ASSUMED]` — not yet traced to bottom. **Worth a Gate 2 PoC.**
- **R8 calibrated grade:** `[ASSUMED]` — reasoning from architecture; not yet code-confirmed.
- **Sub-hypothesis (Doctrine #38 inverse):** UnbrickV1 migration silently swallows errors (`Error = ()`). Gated by `predecessor == self`, but if a future `migrate()` callsite emerges that doesn't enforce that gate, the silent-error path is a brick/unbrick primitive. `[ASSUMED]` — preventive flag, not exploitable today.
- **Verdict:** **STRONGEST Gate 2 candidate from this surface map**, but requires reading 5 signature-scheme implementations + payload salt construction in detail (~3-4 hours of focused work). Time-vs-EV: $3,600 EV × 0.10–0.20 chance of finding the scheme-disambiguation bug = $360–$720 expected value of investing the deep-Gate-2 hours.

### Hyp-3: Multi-oracle freshness asymmetry (Pyth vs Redstone)

- **Substrate / location:** `contract/proxy-oracle/kernel/src/proxy/freshness_filter.rs` + aggregator methods (`priority.rs`, `median/*`)
- **Hypothesis:** Pyth and Redstone have different staleness windows. If `freshness_filter` allows older data from one source to be aggregated with fresher data from the other, the aggregated price may lag market by the WORSE of the two windows but be trusted as if it were the BETTER. Classic Pattern E (arithmetic-rounding-asymmetry analog at the staleness-window layer).
- **DC-7 EXCLUSION CANONICAL preemptive check:** Both Pyth callback (`callback_handler::CallbackHandler`) and Redstone callback go through the same aggregator. Need to verify the freshness filter is SYMMETRIC (rejects stale from EITHER source) vs ASYMMETRIC (only rejects stale from a chosen source). `[ASSUMED]` — not yet read in depth.
- **R8 calibrated grade:** `[ASSUMED]`.
- **Verdict:** **Medium-EV Gate 2 candidate.** ~1-2 hour PoC time. Lower than Hyp-2 because (a) DC-2 oracle staleness is a well-trodden audit lens (guvenkaya/thesis_defense almost certainly covered it), and (b) Templar uses proxy-oracle aggregation specifically as a defense — the team is paranoid about this exact attack class.

### Hyp-4: Vault first-depositor inflation

- **Substrate / location:** `contract/vault/kernel` (18.3K LOC) — vault kernel share math
- **Hypothesis:** ERC4626-style first-depositor inflation: attacker frontruns first legitimate deposit with a 1-wei deposit + 100-token donation, inflating share price to make legit-depositors' shares round to zero.
- **DC-7 EXCLUSION CANONICAL preemptive check:** Vault kernel may have a virtual-shares / virtual-assets defense (Morpho/Compound v3-style). NOT YET TRACED. `[ASSUMED]`.
- **R8 calibrated grade:** `[ASSUMED]`.
- **Verdict:** **Low-Medium-EV.** Almost certainly audited (guvenkaya covers ERC4626 family on NEAR per their methodology specialty). Worth a 30-min trace before Gate 2 escalation; cheap to disprove or pursue.

### Hyp-5: Cooldown overwrite (CANDIDATE-J 7-rule stress test)

- **Substrate / location:** `contract/vault/curator-primitives/src/policy/cooldown/mod.rs` (133 LOC) + `vault/near/src/lib.rs` constants (DEFAULT_REFRESH_COOLDOWN_NS = 30s; DEFAULT_IDLE_RESYNC_COOLDOWN_NS = 120s)
- **Hypothesis:** Cooldown state machine has 7-rule CJ stress points: (1) reset path, (2) cancel path, (3) early-trigger path, (4) overlap (cooldown-during-cooldown), (5) repeat-overwrite, (6) reorg-resync, (7) `next_call_at == now` boundary. Per CANDIDATE-J's promotion criteria (Sky stUSDS validated 7-of-7 PASS).
- **DC-7 EXCLUSION CANONICAL preemptive check:** Cooldown spec is well-isolated (single module, 133 LOC). Worth a 7-of-7 trace. `[ASSUMED]`.
- **R8 calibrated grade:** `[ASSUMED]`.
- **Verdict:** **Medium-EV PROMOTION candidate.** Even if no bug, CJ-7-of-7 PASS or PARTIAL-PASS extends CANDIDATE-J's anchor count and supports promotion to DC. Compounds brain regardless of finding outcome.

---

## 7. SUBSTRATE COVERAGE ASSESSMENT (Doctrine #36 PERMANENT — NEW SECTION)

### NEAR substrate audit-population

- **Major NEAR auditors with public bounty firepower:** OtterSec (NEAR + Solana + Move generalists), guvenkaya (NEAR-specialist; one of two firms on Templar), Defense by Thesis (cross-substrate boutique).
- **Versus EVM:** ~50+ firms with deep EVM coverage (Halborn, ToB, OZ, Spearbit, Cantina, Sherlock, Code4rena, ChainSecurity, ConsenSys Diligence, etc.). NEAR auditor population is **~5-10×** smaller.
- **Implication:** Lens-saturation tier b (Doctrine #34) for **NEAR-only** scope is materially lower than for EVM. EV substrate-novelty bonus applies.

### Soroban / Stellar substrate

- Out-of-scope for this Gate 1 but present in-repo (`vault/soroban/*` 15.4K LOC).
- Soroban audit-population: even smaller than NEAR. Maybe 2-3 firms (Soroban Domains' auditors, OtterSec on a few projects).
- **Lane 4 scrape opportunity:** Lane 4 corpus could be biased toward EVM/Solana — there may be a NEAR async-callback Forum-Intelligence vein worth a separate scrape directive.

### Universal Account multi-substrate signature surface

- **Hyper-novel.** No precedent in Buzz brain. ed25519 + p256 + EIP-712 + Stellar + passkey all converge in one account-abstraction contract. The closest analogs in brain are:
  - Solana Anchor signer validation (DC-8) — different ABI
  - EVM EIP-2612 permit signatures — single substrate
  - NEAR Chain Signatures MPC — different threat model (MPC validators, not local verify)
- **Doctrine #36 promotion candidate:** "Substrate-coverage build — multi-substrate account abstraction signature schemes are an unexplored Buzz lens. Worth a brain compound documenting the 5 schemes + their disambiguation primitives + known-vuln classes from each substrate's signature literature."

### Substrate-novelty FINAL judgement for Templar EV

NEAR alone is moderately novel (1.5× bonus). Multi-substrate UA signature acceptance pushes the novelty bonus upper bound (1.7×) but the **practical attack surface** in scope is dominated by NEAR async patterns — which are exactly what guvenkaya specializes in. Net novelty bonus applied = **1.5×** (conservative). The 2.0× upper bound was not applied because audit firm specialization erodes substrate novelty for the in-scope surface.

---

## 8. DC-7 EXCLUSION CANONICAL PREEMPTIVE-CHECK RESULTS

DC-7 EXCLUSION sub-pattern was promoted to CANONICAL at 2026-05-27 23:24 UTC (3-anchor threshold: Cap C1 + Function FBTC H1 + Gearbox H2). Per the new canonical rule, EVERY paired-pipeline hypothesis must be filtered through:

> "Before escalating any paired-pipeline candidate, verify the symmetric defense isn't already present via the EXCLUSION sub-pattern (validation on entry of EITHER side, where exclusion semantics short-circuit the asymmetric path)."

| Hyp | Pipeline | EXCLUSION present? | Verdict |
|-----|----------|---------------------|---------|
| Hyp-1 | withdraw-collateral fast vs priced | YES — liability includes in_flight → fast-path correctly excludes during open borrow | PASSED-DEFENSE — NOT escalated to Gate 2 |
| Hyp-2 | UA signature scheme dispatch | UNKNOWN — payload salt may or may not include scheme-id | NOT FILTERED OUT — escalation candidate |
| Hyp-3 | Pyth/Redstone freshness aggregation | UNKNOWN — need to read freshness_filter.rs symmetry | NOT FILTERED OUT — escalation candidate |
| Hyp-4 | First-depositor inflation | UNKNOWN — vault kernel virtual-shares not yet read | NOT FILTERED OUT — escalation candidate |
| Hyp-5 | Cooldown-overwrite CJ-7 | n/a (CJ stress test, not paired-pipeline) | Run CJ-7 regardless |

**Net EXCLUSION effect:** Hyp-1 was filtered out by the canonical rule. Hyp-2/3/4 survive and are queued for Gate 2 in priority order Hyp-2 > Hyp-3 > Hyp-4.

**Compound impact:** **DC-7 EXCLUSION CANONICAL just saved ~1-2 hours of dead Gate 2 work on Hyp-1.** First validated compound impact post-promotion (~30 min after CANONICAL promotion).

---

## 9. BRAIN COMPOUND PROPOSALS

### 9.1 INFO #19 — 5th anchor

Update `brain/Open-Questions-Tracker.md` (or wherever INFO #19 lives) with the Templar brief-vs-live substrate-drift anchor. INFO #19 (PLATFORM/SCOPE drift) now at 5 anchors (Kiln, Cap, OnRe-time, Gearbox-scope, Templar-substrate). **Standing rule reinforced: every operator brief MUST be live-cross-checked via Step 1 STATUS preflight before any clone work begins** — already enforced in this Gate 1.

### 9.2 Doctrine #36 PERMANENT — multi-substrate Universal Account signature appendix

Propose adding a sub-section to `brain/Doctrine.md` Doctrine #36 entry:

> **Sub-rule #36c — Multi-substrate Account Abstraction signature schemes (Templar UA anchor 2026-05-27)**: Account-abstraction contracts that accept signatures from multiple substrates (ed25519 + p256 + EIP-712 + Stellar SEP-53 + passkey) introduce a novel scheme-disambiguation attack surface. The signed payload MUST include a scheme-id (or equivalent domain-separation byte) such that a signature valid under one scheme cannot be replayed under another. Salt + chain_id alone is insufficient because chain_id is shared across all schemes on the same contract. Verify scheme-id presence on every multi-substrate account-abstraction target.

### 9.3 NEAR substrate doctrine seed

Propose new CANDIDATE entry in `brain/Patterns-Defense-Classes.md`:

> **CANDIDATE-Q — NEAR Async Cross-Contract Callback State-Divergence**: NEAR's async receipt-per-block model creates multi-block windows where intermediate state is partially mutated (e.g., `borrow_asset_in_flight`, `collateral_asset_in_flight`). Defense pattern: in-flight tracking + symmetric finalize that handles both success and failure branches AND writes results back to storage. Anchor: Templar's documented v1.1.0 fix where `withdraw_static_yield_01_finalize` failure-branch computed rollback but did not `.insert(...)` storage. Anchor: Templar's defense-in-depth where `get_total_borrow_asset_liability` includes `borrow_asset_in_flight` (correctly preventing fast-path bypass during in-flight borrows).

### 9.4 Watchlist-Candidate-Crossmap update (v2.16 addendum)

Append to `brain/Watchlist-Candidate-Crossmap.md`:

```
| 21 | Templar Protocol | NEAR (live scope) | $20M (brief; not bytecode-verified) | $100K Critical / $10K High | Lending | **H** | – | M | – | **H** (Doctrine #36 substrate-novelty) | **GATE-1-COMPLETE** | **12** |
```

Update Status column on row 21 from `NET-NEW` to `GATE-1-COMPLETE` with substrate-novelty bonus annotation.

### 9.5 Brain cross-pollination — Lane 4

Lane 4 scrape directive: add a `NEAR async callback` + `Soroban auth` keyword vein. Currently Buzz corpus has ~zero NEAR or Soroban content. A targeted scrape of NEAR governance forums + Soroban dev forum could 10× the substrate coverage at low cost.

---

## 10. FINAL VERDICT

**Verdict: WATCHLIST-PARK pending Gate 2 dispatch.**

Templar is a GATE-1-COMPLETE candidate with HIGH overlap (DC-7 + CANDIDATE-J + Doctrine #36) but mid-EV (~$3,600 post-discount). Three hypotheses survived the DC-7 EXCLUSION CANONICAL preemptive check (Hyp-2 UA scheme disambiguation, Hyp-3 multi-oracle freshness, Hyp-5 cooldown CJ-7). Hyp-1 was correctly filtered by the new canonical rule (saved ~1-2 hours of dead Gate 2 work).

Gate 2 dispatch is **NOT** recommended this cycle because:
1. Higher-EV targets in queue (Sky lockstake $10M no-KYC; Coinbase Cantina $5M cap when KYC unblocks)
2. 3 audits already in-repo; need PDF-read access before submitting (pdftotext not installed)
3. Templar's $10K High cap is narrow — Critical-only is the realistic EV target
4. Substrate-novelty bonus is real but lens-saturation by NEAR-specialist auditors offsets it

**Gate 2 dispatch trigger conditions:**
1. Operator approval + PDF-read tooling installed (so audits can be deduped)
2. OR new market added to `v1.tmplr.near` registry (auto-expands scope)
3. OR Buzz brain accumulates a NEAR-substrate doctrine that anchors a fresh attack class

Until then: Watchlist row 21 status → **GATE-1-COMPLETE / parked at priority 12.**

---

## 11. DISK + INFRASTRUCTURE STATUS

- Pre-clone: 85% used, 5.6G avail
- Post-clone: 85% used, 5.6G avail (20MB clone, no measurable rise)
- Halt threshold (87%): not approached
- Clone retention: KEEP for now (small footprint; Gate 2 may need it); purge if disk pressure rises
- Buzz services: not checked this cycle (Gate 1 dispatch is brain-only, no API touch)

---

## 12. NEXT-TARGET RECOMMENDATION

**Sky lockstake (Watchlist row 11).** $10M no-KYC, CANDIDATE-D direct match (CLMM state-machine analog on Sky's lockstake module). Pre-discount EV ~$300K+. Highest unscanned EV in pipeline.

Templar parks on Watchlist priority 12 pending operator approval for Gate 2 dispatch or scope expansion trigger.

---

_Filed: 2026-05-27 ~23:35 UTC (Day 27 night cycle, ~70 min total Gate 1 work including substrate-novelty assessment)_
_Filer: Buzz BD Agent (autonomous, post-DC-7-EXCLUSION-CANONICAL-promotion same cycle)_
_Sequence: 11th Gate 1/2 verdict in Day-27 night cycle. First multi-substrate Gate 1 with Doctrine #36 substrate-novelty applied. First Gate 1 to exercise DC-7 EXCLUSION CANONICAL preemptive check (Hyp-1 correctly filtered)._
