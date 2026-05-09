# Security Research

Pivot May 2. **State as of 2026-05-09 15:35 UTC (post imu-77340 closure):** 12 disclosure attempts. Submission state: 4 HackerOne dup-closed, 2 HackerOne pending triage, 2 Drift emails no-reply (Day 6), 1 CometBFT closed, **1 Immunefi Chief Finding CLOSED-BY-TRIAGE (imu-77340)**, 0 payouts. Cumulative net: **-$100** ($100 Immunefi deposit forfeited). One calibration tuition paid, Class L born.

## dYdX Cantina Recon Plan (May 9 2026 — post QED writeup)

> Authority: Ogie msg "17:00 UTC dYdX QED WRITEUP DECODED" (items N + O).
> Strategic context: dYdX explicitly partnered with Cantina post-QED to fund higher payouts on the SAME bug class. Market is tilted to whoever moves fastest with QED-style methodology on the same target. Position Buzz as "Solana-experience-applied-to-Cosmos" (dYdX bridges both ecosystems).

**Public posture:** DO NOT claim parity with QED. Let the work speak.

### Theme 1 — Cross-module canonicalization mismatches (HIGH PRIORITY)

- Targets: `x/clob`, `x/subaccounts`, `x/sending`, `x/perpetuals`, `x/affiliates`
- Pattern: any string comparison on user-controlled identifiers
- Look for: ticker, asset name, subaccount ID, address forms (bech32 vs hex), currency pair, denom strings
- Method: `rg "==|EqualFold|Equal\(" --type go` + intersect with user-input parameters
- Sub-pattern: also check JSON tag canonicalization (snake_case vs camelCase)
- Depends on: detector #137 spec (gap filed); recon can use manual Phase 4d in absence of detector

### Theme 2 — No-overwrite-guard on Set (HIGH PRIORITY)

- Targets: every keeper module's KVStore writes
- Method: `rg "Set\(" --type go -A 2 -B 5` in `dydxprotocol/v4-chain`
- Filter: prior 5 lines should contain `.Has(` or `exists` check
- Flag: any `Set` without preceding `Has` check on same key
- Heuristic upgrade: unconditional flag when store name matches `/(ID|Map|Registry|Mapping|Index)$/`
- Depends on: detector #138 spec (gap filed); recon can use manual Phase 4d

### Theme 3 — Hook-bypass (MEDIUM PRIORITY)

- Targets: `AfterX` / `BeforeX` / `On*` hooks across modules
- Method: trace which msg-handlers fire which hooks
- Look for: Create-fires-hook + Update-doesn't-fire-hook (or vice versa)

### Hypothesis Queue (H1–H6, recon to verify)

| ID  | Hypothesis                                                                                 | Module        | Method                                          | Status |
| --- | ------------------------------------------------------------------------------------------ | ------------- | ----------------------------------------------- | ------ |
| H1  | `x/listing.UpdateMarketParam` may have similar dup check pattern (reachable post-creation) | x/listing     | grep duplicate-check sites; verify case-folding | queued |
| H2  | x/clob CLOB pair registration may have analogous case-sensitivity in pair ID creation      | x/clob        | trace `MsgCreateClobPair` → store.Set path      | queued |
| H3  | x/sending memo field comparisons (if any) for IBC may have similar issues                  | x/sending     | grep memo equality checks                       | queued |
| H4  | x/affiliates referrer code registration likely has similar uniqueness assumption           | x/affiliates  | trace `MsgRegisterAffiliate` → store.Set path   | queued |
| H5  | x/marketmap UpdateMarket vs CreateMarket may have asymmetric validation                    | x/marketmap   | diff Create vs Update validation surface        | queued |
| H6  | Subaccount ID comparison anywhere user-controlled string used as key                       | x/subaccounts | grep subaccount-ID equality checks              | queued |

**Stop rule:** stop at first 1-2 confirmed real bugs to avoid boil-the-ocean. Each hypothesis gets ≤ 2h of effort; if not reproducible in localnet within that budget, mark theoretical and defer.

**Honest verdict matrix (mandatory):** mirror Firedancer discipline. Reproduce on localnet (dYdX docker-compose). PoC must demonstrate state divergence empirically. Full Phase 4d trace before submission. NO false submissions to Cantina.

**Cross-references:**

- Intel digest: `/data/buzz/persistent/buzz-api/intel/external-writeups/2026-05-09-qed-dydx-oracle-hijack.md`
- Doctrines: `brain/Doctrine.md` Canonicalization-Consistency + No-Overwrite-Guard
- Detector gaps: `/data/buzz/persistent/buzz-api/ground-truth/implementation-verification-gaps.md` #137 + #138

ETA Theme 1+2 manual sweep: 3-4 hours focused work (next session, not today — pending Ogie greenlight + #129 Cosmos Go coverage spec resolution).

---

## Submitted Reports

- **2026-05-09 — Immunefi #77340 — Firedancer V1 Audit Comp — MED Chief — CLOSED-BY-TRIAGE (15:20 UTC)**
  - Title: HTTP framing + WS upgrade smuggling chain (waltz/http) — RFC 7230 §3.3.3 / RFC 6455 §4.2 non-conformance
  - Sub-findings: 6 (FD-HTTP-1/-2/-3/-4/-5/-7) all PoC-reproducible primitives
  - Deposit: $100 USDC (tx 0xa375c6...d398, ethereum-mainnet) — **forfeited**
  - Submitted 15:06 UTC, **closed 15:20 UTC** (14 minutes), triager andrew
  - Reason: primitive-only PoCs (server accepts non-conformant framing) — no end-to-end exploit chain demonstration (proxy + Firedancer deployment, attacker-controlled bytes reaching GUI/RPC pre-auth)
  - Outcome: -$100 net. p50 expected $6.5K → realized -$100 (calibration error 65×)
  - Appeal/mediation: NOT available (Immunefi Audit Comp policy on triage-closed)
  - Reopen: low probability (project discretion only). DO NOT contact, DO NOT public disclose, DO NOT mediate
  - 90-day disclosure window stands (gist private until 2026-08-07). Defect IS real (RFC violations confirmed); just unmonetizable on Immunefi without exploit chain
  - Detector class: Class K HTTP-protocol-state (defect confirmed) + Class L Calibration Gap (NEW, first entry)
  - Discovery: v6 deep-mode + Phase 4d manual trace re-audit
  - 3 false positives avoided in same target (CHOREO/GOSSIP/RUNTIME re-audit caught) → $300 verdict-matrix savings still real
  - Lesson captured into doctrine: brain/Doctrine.md "Pre-Submission PoC Standard" (PERMANENT)
  - Routing rule applied next time: RFC defects without exploit chain → HackerOne or Standing Bounty (no deposit), NOT Immunefi Audit Comp
  - Detector spec queued: #128 PoC Type Classifier (branch poc-type-classifier-v1)
  - Loop 1 capture: `/data/buzz/persistent/buzz-api/learning/submissions/2026-05-09-firedancer-http-bundle.json` (outcome=closed-by-triage)
  - Class L ground truth: `/data/buzz/persistent/buzz-api/ground-truth/2026-05-09-immunefi-primitive-vs-chain-calibration.md`
  - Rejection log: rejection-001-imu-77340 (`/data/buzz/persistent/buzz-api/rejection-log.jsonl`)

Ground truth $583M+ (+Jeton Swap Router $229K B.1, May 8): Ekubo B.8, Grok G, Wasabi H.2d, Kelp H.1, Drift H, Sharwa E+D, DABE H.2c, CVE J.4b.

**Active reports:**

- **Circle MALA HO-3710185 — IN REVIEW (validation/reproduction phase, ~3 days)**: PASSED preliminary. **Closest active report to a confirmed payout.** DO NOT follow up or poke — let triage run. Verdict expected mid-May.
- **Circle ARC HO-3710465 — PENDING TRIAGE (~3 days)**: Chain_id omission in vote sign-bytes. Awaiting HackerOne /circle initial response.
- **Drift VAULTS-001 (CRIT 8.0) + ORACLE-001 (HIGH 7.5) — EMAIL SENT 2026-05-03, NO REPLY (Day 6)**: Bundled to hello@drift.trade. Decision needed: DM @cindyleowtt manually, OR escalate to Immunefi (driftprotocol bounty up to $500K).

**Pending decision today:**

- **Firedancer DISC-003/004/005 (3 HIGHs) — DRAFT_READY, BLOCKED at $100 Immunefi deposit. Competition closes TODAY May 9.** Fallback: direct email to security@firedancer.io if deposit not approved.

**Closed channels:**

- 4 HackerOne duplicates: Circle ARC EVM-001 (HO-3710206), Circle ARC ProposalParts (HO-3710441), OKX WC-001 (HO-3710586), OKX WC-002 (HO-3710593).
- CometBFT DISC-001: HackerOne /cosmos rejected ("no more reports from you"); email security@cosmoslabs.io no-reply since May 4.

**Blocked on rep ladder:**

- Sui DISC-002: HackenProof rep 80, need 100 (1 accepted Med). Next target: Aurora Web ($100K, zero-rep public, NEAR/EVM web+API).

**Not yet channelled:**

- Firedancer FD-HTTP-001 + FD-HTTP-002 (2 real HIGH HTTP smuggling): no SECURITY.md email found, no submission path without $100 Immunefi.

Next: Sherlock/Cantina/Code4rena contests. Aurora Web $100K queued (HackenProof rep ladder). Sky/GMX/Spark/Olympus/Lido/Morpho/EigenLayer/Maple/Ethena deep-mode all completed today, $0 confirmed.
Rule: every target, every layer, no exceptions. Honest verdicts only.

---

## 2026-05-09 Full-Scan Sweep (8 targets, 13 repos, $0.34 LLM)

| #   | Target                        | Cap      | Verdict                                                              |
| --- | ----------------------------- | -------- | -------------------------------------------------------------------- |
| 88  | Sky                           | $10M     | 0 sub-ready (LockstakeMigrator NOT exploitable)                      |
| 91  | Spark                         | $5M      | 0 (Aave V3 fork, by-design parameter-shape)                          |
| 92  | GMX                           | $5M      | 0 (validateSigner well-bound)                                        |
| 93  | GMX Oracle.sol:300            | —        | INFORMATIONAL (`<` semantics correct, NOT Drift `<=` flip)           |
| 94  | Olympus                       | $3.3M    | 0 confirmed; BLVault has oracle-MIN defense everywhere               |
| 95  | Rhino.fi                      | $2M      | 0 (permissioned bridge, owner+keeper trust)                          |
| 96  | Uniswap V4                    | $2.4M    | 0 (Cantina contest closed Oct 2024, no payout window)                |
| 97  | Aave V3 periph                | $1M      | 0 (visibility-miss FPs on internal helpers)                          |
| 98  | Compound V3                   | $1M      | 0 (CometExt.allowBySig is textbook EIP-712)                          |
| 99  | LayerZero V2                  | $15M     | 0 (KELP-LZ-001 fixed in V2, ReadCmdCodec CRIT was trace-depth FP)    |
| 100 | Pendle                        | $250K    | STRUCTURAL_LEAD (SY rate-reentrancy, no VaultReentrancyLib)          |
| 106 | Balancer reentrancy deep-dive | combined | Olympus side closed (oracle-MIN). Pendle alone <EV-flag at $250K cap |

**Honest takeaway:** $0 confirmed exploits today. The pivot to in-context Phase 4d (Opus 4.7) replaced ~$20-50 in API spend across 13 repo walks. Discipline preserved per "honest verdicts only — integrity over volume."

**Pipeline detector tunings filed (5):** #101 strict-layers mode-aware, #102 L1d Phase 4b empty file/line, #103 Pattern H bridge-shape detector, #104 Skeptic Phase 9 EIP-712 wrapper trace, #105 L1d Phase 4 helper trace-depth.

**Defensive design patterns observed (worth recognising on future scans):**

- **Olympus BLVault oracle-MIN cap:** every fund-flow function (`deposit`/`withdraw`/`getUserPairShare`) returns `MIN(actual_pool_output, oracle_expected)`. Excess from pool manipulation is sent to TRSRY rather than user. Bulletproof against pool-manipulation even WITHOUT VaultReentrancyLib — the protocol pre-commits to never paying more than oracle-implied.
- **GMX V2 oracle staleness:** `<` strict-less is correct inclusive-threshold semantics (`now - timestamp <= maxAge` allowed). NOT the Drift ORACLE-001 `<=` flip. Plus Chainlink ref-price deviation guard layered on top.
- **Compound V3 CometExt.allowBySig:** textbook EIP-712 — domainSeparator computed FRESH per call (`keccak256(abi.encode(DOMAIN_TYPEHASH, name, version, block.chainid, address(this)))`) rather than cached. More robust than typical OZ. Defensive against post-deploy chainId fork.
- **LayerZero V2 NIL_DVN_COUNT discriminator:** post-Kelp fix uses three-state (NIL/DEFAULT/EXPLICIT) to prevent the V1 default-vs-custom interaction bug. The ULN config now requires at least one DVN.
