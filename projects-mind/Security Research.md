# Security Research

Pivot May 2. **State as of 2026-05-09 15:10 UTC (post Firedancer ship):** 12 disclosure attempts (10 submitted via channels, 1 Firedancer SHIPPED on Immunefi as Chief). Submission state: 4 HackerOne dup-closed, 2 HackerOne pending triage, 2 Drift emails no-reply (Day 6), 1 CometBFT closed (channel dead), **1 Immunefi Chief Finding pending review**, 0 payouts.

## Submitted Reports

- **2026-05-09 — Immunefi #77340 — Firedancer V1 Audit Comp — MED Chief — pending review**
  - Title: HTTP framing + WS upgrade smuggling chain (waltz/http) — RFC 7230 §3.3.3 / RFC 6455 §4.2 non-conformance
  - Sub-findings: 6 (FD-HTTP-1/-2/-3/-4/-5/-7) all PoC-reproducible
  - Deposit: $100 USDC (tx 0xa375c6...d398, ethereum-mainnet)
  - Submitted ~15:06 UTC, ~1.9h before competition close
  - Expected window: review 5-10 days, escalation 7-14 days, bounty 14-30 days
  - First check: 2026-05-11 15:00 UTC (48h watchdog)
  - 90-day disclosure committed (gist private until 2026-08-07)
  - Detector class: HTTP-protocol-state (NEW C-codebase Class K candidate)
  - Discovery: v6 deep-mode + Phase 4d manual trace re-audit
  - 3 false positives avoided in same target (CHOREO/GOSSIP/RUNTIME re-audit caught) → $300 verdict-matrix savings

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
