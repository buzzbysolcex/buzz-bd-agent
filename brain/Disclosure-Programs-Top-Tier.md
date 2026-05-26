# Disclosure Programs — Top-Tier Scope Tracker

> H2 hunting-target rotation tracker. Pulled scope data from public Immunefi pages on the four named top-tier targets per Three-Pillar Activation directive. Each entry maps current bounty bands + scope size + KYC requirements + cross-pollination matches against the brain catalog as of 2026-05-15 (Cross-Domain-Fragility-Laws.md inaugural day).
>
> Authority: Master Ops Three-Pillar Activation FULL VISION (2026-05-15) — Lane 1 manual hunting on authorized disclosure programs is LIVE NOW.
> Discipline: scope-mapping is informational research, NOT an active scan. Manual deep-read on any target requires (a) brain-catalog match identified, (b) operator awareness of target selection, (c) 5-gate process before any submission. Pipeline-at-scale unattended remains paused on CVP.

---

## H2 Pull — 2026-05-15 (4 named targets)

### 1. Sky (formerly MakerDAO) — $10M MAX [HIGHEST EV]

- **Max bounty:** $10,000,000 (smart contract Critical, capped at 10% of funds affected)
- **Severity bands:** Critical $150K-$10M / High $100K / Medium $5K / Low $1K
- **Web/app bands:** Critical $100K / High $5K / Medium $2.5K
- **In-scope assets:** 216 (DAI/USDS, MKR/SKY, vaults, liquidations, related DeFi infra)
- **KYC:** ❌ NOT REQUIRED — "No KYC information is required for payout processing"
- **Live since:** 2022-02-10
- **Last updated:** 2026-02-26
- **PoC:** required for all reports (Immunefi-wide standard)
- **Source:** Immunefi page

**Brain catalog cross-pollination matches:**

- **CANDIDATE-D** (KyberSwap state-machine integrity / startSqrtP-equality): DIRECT family match. Vault state-machine integrity (deposit → collateral → liquidation pipeline) is the protocol-class analogue of CLMM tick-boundary integrity. Same family as Huma V1 INV-2 (lending state-machine — sister member). Vault sub-state transitions are the canonical search target.
- **CANDIDATE-E** (Raydium symmetric-pair-rounding): possible match. Liquidation auction math, fee accrual on multi-asset vaults, dust-handling on collateral-debt pairs — any place ceiling/floor rounding fires per-side with a `> 0` short-circuit is a candidate.
- **CANDIDATE-F** (Next.js parallel-validation-asymmetry): possible match. Multi-call patterns (`vat` aggregator vs per-call), permit vs transferFrom validation paths, governance signatures (EIP-712) vs vote-delegation paths.
- **DC-6 from active catalog** (Permissionless-Trigger-With-Config-Determined-Recipients): scan vat / chainlog / liquidator triggers for permissionless-trigger shape.

**Why Sky is top of H2 ranking:** $10M cap + no KYC + 216-asset surface + multiple brain-catalog family matches. Highest EV-weighted target in current rotation.

### 2. Wormhole — $1M MAX [DIRECT THORChain ANALOG]

- **Max bounty:** $1,000,000 USD (paid in W token)
- **Severity bands:** Critical $100K-$1M / High $10K-$100K / Medium $2K-$10K / Low ≤$2K
- **Critical cap rule:** 10% of extractable value during 24h window for wrapped-token bridges; 1% or $250K (lesser) for perpetual fund-locking
- **In-scope assets:** 13 (smart contracts + guardian nodes + integrations across multiple chains)
- **KYC:** ✅ REQUIRED + Reg S restrictions (US persons EXCLUDED, Restricted Token Grant Agreement, potential lock-up)
- **Live since:** 2022-02-11
- **Last updated:** 2026-03-17
- **PoC:** required all severities
- **Source:** Immunefi page

**Brain catalog cross-pollination matches:**

- **CANDIDATE-A** (THORChain signature-scope-must-cover-outcome-bit): THE DIRECT ANALOG. Wormhole guardian attestations are the EXACT pattern THORChain Bifrost Attestation Gossip is hypothesized to fail on. Already in People.md cross-pollination watch list. **If THORChain official PM confirms Hypothesis A, Wormhole guardian-attestation paths become THE highest-EV scan target across all programs.**
- **CANDIDATE-F** (parallel-validation-asymmetry): possible match for guardian-vs-non-guardian validation paths (e.g., observation-quorum vs message-replay paths).

**Why Wormhole is #2:** smaller cap ($1M vs $10M Sky) + KYC friction (US-person exclusion is a real barrier) BUT direct CANDIDATE-A pattern match is the highest-conviction target IF THORChain PM confirms the hypothesis. Recommend: hold Wormhole-class hunting until THORChain PM lands; pivot HIGH if Hypothesis A confirms.

### 3. Polygon — $250K MAX [MID-EV, MATURE TRIAGE]

- **Max bounty:** $250,000 (Critical = 10% of funds at risk capped at max)
- **Severity bands:** Critical $20K-$250K / High $10K flat / Medium $2K flat
- **In-scope assets:** 13 (Layer 2 + PoS validators + sidechains)
- **KYC:** ✅ REQUIRED + OFAC/UNSC sanctions exclusion
- **Track record:** $7.1M paid across 71 reports
- **Live since:** 2021-09-13
- **Last updated:** 2026-04-17
- **Source:** Immunefi page

**Brain catalog cross-pollination matches:**

- **CANDIDATE-A** (THORChain signature-scope): PoS validator attestation paths could match (less directly than Wormhole — different attestation model)
- **CANDIDATE-D** (state-machine integrity): bridge checkpoint state-machine, finality state transitions
- **CANDIDATE-F** (parallel-validation-asymmetry): RPC vs WebSocket vs gRPC adjacency in chain client; transaction-pool admission vs block-inclusion validation paths

**Why Polygon is #3:** lower cap, narrower scope (13 assets), but mature triage pipeline (71 reports paid) means valid findings get paid quickly. Mid-EV.

### 4. Coinbase — UNAVAILABLE [scope page returned 404 / HackerOne page auth-gated]

- Operator named target. Direct Immunefi page (`immunefi.com/bug-bounty/coinbase/`) returned 404 — likely Coinbase runs HackerOne-only OR has a different program slug
- HackerOne `hackerone.com/coinbase` returned page-with-no-detail (likely requires login)
- **DEFER** until operator clarifies platform / URL OR fetch tool / authenticated path is available
- Cross-pollination intuition: Coinbase has both web2 (CEX) + web3 (Wallet, Base) surfaces. CANDIDATE-F parallel-validation-asymmetry maps strongly to web2/web3 boundary code paths.

---

## H2 Cross-Pollination Engine — Operator Decision Matrix

Today's brain growth produced 4 fragility-family entries. Map them to the 3 verified scopes:

| Brain Family             | Anchor            | Sky ($10M) | Wormhole ($1M) | Polygon ($250K) |
| ------------------------ | ----------------- | ---------- | -------------- | --------------- |
| Signature-scope (CAND-A) | THORChain         | medium fit | **DIRECT**     | weak fit        |
| State-machine (CAND-D)   | KyberSwap+Huma V1 | **STRONG** | medium fit     | medium fit      |
| Rounding-asym (CAND-E)   | Raydium           | possible   | weak           | weak            |
| Validation-asym (CAND-F) | Next.js CVE       | possible   | possible       | possible        |

### Recommended H2 next-action priority

1. **Sky vault-state-machine deep-read** (CANDIDATE-D × $10M cap × no-KYC) — highest EV-weighted starting point. Manual review of vat / vow / dog / clip liquidation pipeline for state-machine integrity gaps in the same family as Huma V1 INV-2 + KyberSwap startSqrtP-equality. ~2-4h block.
2. **Wormhole guardian-attestation deep-read** — DEFER until THORChain official PM lands. If Hypothesis A confirms → pivot HIGH (CANDIDATE-A × $1M cap × direct family analog).
3. **Polygon checkpoint-state deep-read** — backup target if Sky surface produces nothing in first session.

### Gates / discipline

- ❌ NO mainnet/testnet testing on any of these targets (program rule + Buzz discipline)
- ❌ NO Phase 4d-grade auto-runs against the source (manual review only — pipeline-at-scale unattended is the CVP-paused piece)
- ❌ NO submission without 5-gate process Gate 1-3 + operator Gate 4-5
- ❌ NO submission without #128 PoC type classifier + #130 AI triage simulator passing
- ✅ Manual deep-read against brain catalog: LIVE NOW
- ✅ Cross-pollination engine: brain growth (today) feeds hunting edge (next session) on these targets

---

## Tracking + Refresh Cadence

- **Refresh cadence:** weekly pull on these 4 named targets + one new addition per week from the Loop A bounty platform sweep (per Doctrine "Active Hunting Mode" Loop A).
- **Trigger reorder:** if THORChain PM confirms Hypothesis A, Wormhole moves to #1 immediately (overrides Sky ranking).
- **Trigger expansion:** if any 5-gate-passing finding lands on Sky, expand the daily floor to include 1-2 vault-class targets.
- **Outcome ledger:** every deep-read produces a ground-truth entry whether finding lands or not (per Doctrine "Anti-metrics: don't optimize raw scan count").

---

---

## Payer-History Watchlist Annotations (added 2026-05-26 per Ogie msg 7817 batch)

Standing-Intake Step 1 PROFILE includes payer-history as a key signal. Below: protocols where payer-history materially affects P(acceptance) calibration. Maintain as a running annotation set alongside the H2 named-targets list above.

| Program | Bounty | Payer history | P(acc) calibration | Source |
|---------|--------|---------------|---------------------|--------|
| JustLend DAO | $50K Critical | **$20K total paid** ($0-history ZONE per standing-intake-protocol.md Step 1) | **P(acc) ≈ 0.2** (default 0.5 reduced) | Hunt `hunts/2026-05-26-justlend-immunefi-gate1.md` proposal #5 |

**Why annotate JustLend specifically.** Standing Intake Step 1 PROFILE captures payer-history as a key signal for EV calibration. JustLend's $20K total paid is below the $50K Critical cap — the program has historically NOT settled at-cap, suggesting either (a) no Critical findings have been validated, or (b) settlements consistently scope-narrow to lower severities. Either way, P(acceptance) of a Critical finding is materially below the established-payer baseline (P(acc) ≈ 0.5). Reduce to P(acc) ≈ 0.2 per Step 1 $0-history-zone heuristic.

**Operational implication.** EV recalculation for JustLend Gate 2 work:
- Naive EV = P(finding) × $50K × P(acc) × overlap = 0.15 × $50K × 0.5 × 0.42 (M-?-H-?-M=22/52) = ~$1,575
- Payer-discounted EV = 0.15 × $50K × **0.2** × 0.42 = **~$630**

The payer-discount drops JustLend below the Day 26 sibling-target floor (Raydium $15K, Stacks $10K, Filecoin $25K) by ~25-40×. Recommend: defer to 6-month rescan cadence (Doctrine #32 v1.1) rather than fresh Gate 2 effort.

**Future annotations.** Add a row each time Gate 1 surfaces a payer-history signal that materially affects EV. Target: build a 5-10 entry payer-history calibration matrix to feed Standing-Intake Step 3 EV formula.

---

_Disclosure Programs Top-Tier Tracker | v1.1 | 2026-05-26 (Day 26 batch — Ogie msg 7817 — JustLend $50K Tron Immunefi payer-history annotation filed [$20K total paid → P(acc) ≈ 0.2 vs default 0.5; payer-discount drops EV below sibling-target floor; recommend defer to Doctrine #32 v1.1 6-month rescan cadence]. Companion: hunt `hunts/2026-05-26-justlend-immunefi-gate1.md` proposal #5. v1.0 footer preserved below.)_

_Disclosure Programs Top-Tier Tracker | v1.0 | 2026-05-15 (H2 inaugural pull: Sky $10M / Wormhole $1M / Polygon $250K verified; Coinbase deferred — page unavailable)_
