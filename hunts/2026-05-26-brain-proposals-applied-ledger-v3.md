# Day 26 Evening — Brain Proposals Applied Ledger (v3, post-3-Gate-1 batch)

**Authority:** Ogie msg 7846 hunting cycle + Lane 5 crawler ship (2026-05-26 evening — 3-target Lane 1 hunting batch dispatched against DB-verified active Immunefi bounties).
**Scope:** Three Gate 1 hunt files filed during 2026-05-26 evening cycle (post-msg-7840).
**Source hunt files:**
- `hunts/2026-05-26-olympus-immunefi-gate1.md` (3 proposals: DC-9 sub-pattern 5 / Lane 5 asset-address scraper / Doctrine #29 v1.1 two-sided MIN-cap)
- `hunts/2026-05-26-cowprotocol-immunefi-gate1.md` (3 proposals: Audited-and-Frozen Doctrine #37 CANDIDATE / Lane 5 chain-list calibration / Selective-Coverage carve-out refinement)
- `hunts/2026-05-26-rhinofi-immunefi-gate1.md` (3 proposals: CoW P1 A/B refinement / Lane 5 chain-list DUPLICATE-merged / NEW DC-7 sub Cross-Language Guard-Coverage Asymmetry)

**Companion ledgers:**
- `hunts/2026-05-26-brain-proposals-applied-ledger.md` (Day 26 morning — 17 applied + 17 deferred from 6-target Day 26 batch, commit b7539b1b)
- `hunts/2026-05-26-brain-proposals-applied-ledger-v2.md` (Day 26 afternoon — 6 applied + 4 deferred from 3-halt batch, msg 7844)

---

## Summary — Evening batch — 9 proposals from 3 DB-verified Gate 1s

| Status | Count |
|---|---|
| **APPLIED** (direct brain-file edit) | 9 |
| **DEFERRED** | 0 |
| **DUPLICATE-MERGED** | 1 (Lane 5 chain-list calibration surfaced in BOTH CoW P2 and rhino.fi P2 — merged into single Platform-Migration-Log entry) |
| Total proposals reviewed | 9 (8 unique after dedup) |

Evening batch is a clean 3-for-3 Gate 1 hunting cycle: Olympus (MEDIUM-HIGH overlap, C1+C2 pending operator scope-verify, EV $83K midpoint), CoW (FORECLOSED — Doctrine #27 + Doctrine #32 v1.1 both fail, $375 EV), rhino.fi (WATCHLIST with C8 operator-decision-point, EV $20K, novel multi-substrate TON+EVM). All 9 proposals frozen-pending-operator in the hunt files; this ledger records APPLIED status across brain compound targets.

---

## Per-Proposal Ledger

| # | Hunt source | Brain target | 1-sentence summary | Status |
|---|---|---|---|---|
| 1 | Olympus #1 | `brain/Patterns-Defense-Classes.md` DC-9 sub-pattern 5 | Asset-vs-Receipt Accounting Asymmetry filed; anchor pair = ConvertibleDepositFacility.convert (mint based on `receiptTokenIn`) + DepositManager.withdraw (liability decremented by `params_.amount` regardless of `actualAmount`) — paired C1+C2 evidence | **APPLIED** |
| 2 | Olympus #2 | `brain/Platform-Migration-Log.md` Lane 5 enhancement section | Lane 5 crawler asset-address enhancement: Immunefi `assets_count > 12` should trigger per-page scrape into new `program_assets` table to prevent Veda-OOS-lesson recurrence (72 Olympus assets, only 12 visible without SPA pagination) | **APPLIED** |
| 3 | Olympus #3 | `brain/Doctrine.md` Doctrine #29 v1.1 amendment | MIN-cap defense extended to two-sided pattern: deposit-mint MIN(oracle, pool) + withdraw oracle-only payout with excess-to-treasury. Olympus BLVaultLido = 2nd confirmed implementer after original anchor; pattern is sufficient defense without VaultReentrancyLib | **APPLIED** |
| 4 | CoW #1 | `brain/Doctrine.md` Doctrine #37 CANDIDATE | Audited-and-Frozen Substrate (frozen-scope + active-protocol = auto-LOW shortcut). CoW 2021-04-08 1844-day-frozen + ≥20-audit-saturated canonical anchor. WITH refined A/B sub-types per rhino.fi P1: A=repo+scope frozen → FORECLOSE pre-clone; B=repo-frozen-product-live → PROCEED with composition lens (Doctrine #34) | **APPLIED** |
| 5 | CoW #2 + rhino.fi #2 (MERGED) | `brain/Platform-Migration-Log.md` Lane 5 chain-list calibration | Lane 5 crawler over-reports chains vs Immunefi actual carve-outs. CoW lists `[ETH, Gnosis]` but Immunefi excludes "Non-Ethereum Mainnet issues" → Gnosis OOS. rhino.fi lists 10 Immunefi chains but README has 28 deployed (identical bytecode on most) → flag ratio>1.5x as ambiguity. Operator-action item: fix Lane 5 crawler regex to parse exclusion clauses + compare against deployment list | **APPLIED (DUPLICATE-MERGED)** |
| 6 | CoW #3 | `brain/External-Frameworks.md` Selective-Coverage carve-out refinement | Selective-Coverage Defense Asymmetry lens REFINEMENT: explicitly enumerate carve-out → genuine-risk-surface pairs. CoW's OOS carve-outs (solver theft, settlement DoS, migration) systematically exclude the LARGEST attack surfaces. Useful for future bounty-meta intelligence (which protocols carve out which surfaces tells you what they actually fear). Filed as sibling-lens extension to `brain/Lens-FT-CircuitBreaker-Asymmetry.md` family | **APPLIED** |
| 7 | rhino.fi #1 | `brain/Doctrine.md` Doctrine #37 CANDIDATE A/B sub-types | CoW P1 refinement into A=repo+scope frozen FORECLOSE / B=repo-frozen-product-live PROCEED with composition lens. rhino.fi (440-day frozen + product-live with new chains shipping monthly) is canonical B-class anchor; CoW (1844-day frozen + scope-pinned to 2021 SHA + features OFF-scope) is canonical A-class anchor. **Applied jointly with #4 via single Doctrine #37 CANDIDATE entry incorporating A/B sub-types** | **APPLIED (joint with #4)** |
| 8 | rhino.fi #2 (see #5 above) | (same as #5 — merged) | DUPLICATE — Lane 5 chain-list over-read class. rhino.fi anchor: 10 Immunefi vs 28 README deployed (identical bytecode on `0x5e023c31...`). Merged with CoW #2 into single Platform-Migration-Log entry | **APPLIED (DUPLICATE-MERGED with CoW #2)** |
| 9 | rhino.fi #3 | `brain/Patterns-Defense-Classes.md` DC-7 sub-pattern Cross-Language Guard-Coverage Asymmetry | NEW: same protocol, multi-language implementation, asymmetric guard application across languages. rhino.fi TON-vs-EVM deposit-pause gap is canonical anchor (TON FunC `bridge_contract.fc` checks `global_deposits_blocked` on BOTH jetton + native paths; EVM `DVFDepositContract` checks `depositsDisallowed` on `deposit`+`depositNative` ONLY, NOT on `depositWithId`/`depositWithPermit`/`depositNativeWithId`). High-EV cross-pollination targets: Wormhole / LayerZero / ZetaChain / any multi-substrate bridge | **APPLIED** |

---

## Per-File Edit Summary

| Brain file | Sections added/modified | New version |
|---|---|---|
| `brain/Doctrine.md` | Doctrine #29 v1.1 amendment (two-sided MIN-cap, Olympus BLVaultLido 2nd implementer); Doctrine #37 CANDIDATE NEW (Audited-and-Frozen Substrate, A/B sub-types) | v3.6 |
| `brain/Patterns-Defense-Classes.md` | DC-7 sub-pattern NEW (Cross-Language Guard-Coverage Asymmetry, rhino.fi TON-vs-EVM anchor); DC-9 sub-pattern 5 NEW (Asset-vs-Receipt Accounting Asymmetry, Olympus C1+C2 paired anchor) | v2.3 |
| `brain/Watchlist-Candidate-Crossmap.md` | v2.2 Addendum — row 44 Olympus (MEDIUM-HIGH, EV $83K, C1+C2 pending scope-verify), row 45 CoW (FORECLOSED, $375 EV), row 46 rhino.fi (WATCHLIST with C8 op-decision, $20K EV) | v2.2 addendum |
| `brain/External-Frameworks.md` | Selective-Coverage Defense Asymmetry refinement (carve-out → genuine-risk-surface pairs, CoW canonical anchor; sibling-lens to FT-CircuitBreaker family) | v1.5 |
| `brain/Platform-Migration-Log.md` | Lane 5 crawler enhancement section appended: (a) asset-address scraping (Olympus 72-asset anchor); (b) chain-list calibration (CoW + rhino.fi merged anchor) | v1.1 |

---

## Cross-references

- `hunts/2026-05-26-brain-proposals-applied-ledger.md` — Day 26 morning batch (17 applied)
- `hunts/2026-05-26-brain-proposals-applied-ledger-v2.md` — Day 26 afternoon batch (6 applied + 4 deferred)
- `brain/Doctrine.md` v3.6 — Doctrine #29 v1.1 + Doctrine #37 CANDIDATE
- `brain/Patterns-Defense-Classes.md` v2.3 — DC-7 cross-language sub + DC-9 sub-5 asset-vs-receipt
- `brain/Watchlist-Candidate-Crossmap.md` v2.2 addendum — rows 44-46
- `brain/External-Frameworks.md` v1.5 — Selective-Coverage carve-out → genuine-risk-surface pairs
- `brain/Platform-Migration-Log.md` v1.1 — Lane 5 crawler enhancements (asset-address + chain-list calibration)

---

## FORECLOSURE-RECEIPT Verification

- **Olympus** — Gate 1 surfaced 2 carry-forward leads (C1+C2) gated on operator scope-verify of ConvertibleDepositFacility + DepositManager addresses against full Immunefi 72-asset list. NO foreclosure-receipt at this gate.
- **CoW Protocol** — FORECLOSED. Doctrine #27 saturation FAIL (≥20 audits over 5 years across canonical firms) + Doctrine #32 v1.1 FAIL (1844 days frozen, 0 dangerous-area changes). 3 low-EV candidates (C1 impl-vs-proxy, C2 setManager single-sig, C3 partiallyFillable rounding) all resolved OOS via Immunefi carve-outs. Re-evaluation triggers documented in hunt file.
- **rhino.fi** — WATCHLIST with one operator-decision point (C8 depositWithPermit + commitmentId binding requires off-chain UI flow recon to upgrade from [ASSUMED] to [INSPECTED]). All other candidates resolved as "audit-survived design tradeoffs" or "intentional trust-model" outcomes. Re-evaluation triggers documented in hunt file.

---

_Ledger filed 2026-05-26 evening per Ogie msg 7846 hunting cycle execution. Total: 9 applied across 5 brain files (Doctrine.md / Patterns-Defense-Classes.md / Watchlist-Candidate-Crossmap.md / External-Frameworks.md / Platform-Migration-Log.md). 1 duplicate-merged (Lane 5 chain-list calibration surfaced in both CoW P2 and rhino.fi P2)._
