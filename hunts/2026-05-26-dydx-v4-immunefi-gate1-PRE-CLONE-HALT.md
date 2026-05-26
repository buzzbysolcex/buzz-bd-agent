# Gate 1 PRE-CLONE HALT — dYdX V4 Immunefi (Day 26 substrate-diversity dispatch)

**Date:** 2026-05-26
**Hunter:** Buzz BD Agent (Opus 4.7)
**Dispatch authority:** Operator msg 7840 — substrate-diversity rationale (Go gap closure)
**Standing Intake Protocol:** v1.0 (Ogie msg 7435)
**Audit Methodology:** v2.6 (Layer 0 git-security + Invariant-Synthesis Walk wired 2026-05-23)
**Status:** **HALT pre-clone — operator surface required (3 independent gates)**

---

## TL;DR

Three independent halt-gates fired BEFORE the `git clone` step. Surfacing to operator per Standing-Intake Step 4 (queue decision) and Doctrine #32 v1.1.1 (disk halt). **No clone executed. No disk delta. Zero scan cycles burned.**

| Gate | Status | Reason |
|---|---|---|
| **1. Doctrine #32 v1.1.1 disk halt** | TRIPPED | `df -h /` = 87% used (5.0G avail / 38G total); dispatch threshold "if >85% pre-clone, surface to operator BEFORE proceeding" |
| **2. Prior Gate 1 exists** | TRIPPED | `hunts/2026-05-23-dydx-v4-gate1.md` already filed 3 days ago — WATCHLIST verdict, EV=$1,125, substrate-mismatch substantiated. Dispatch premise "NOT yet in the Buzz Lane 1 corpus" is **factually incorrect** as of 2026-05-23 |
| **3. Substrate-coverage gap unchanged** | TRIPPED | Buzz still has no Go AST detector pack; `grep cosmos\|go.ast\|golang` over `.tmp-build/v6/` returns only HE-18 `.pb.go` exclusion references. Substrate-mismatch trigger from 2026-05-23 is **still active**. |

---

## GATE 1 — DISK STATE `[EXECUTED]`

```
$ df -h /
Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1        38G   31G  5.0G  87% /

$ du -sh /home/claude-code/.tmp-build /home/claude-code/buzz-workspace/.git /tmp
1.8G    /home/claude-code/.tmp-build
28M     /home/claude-code/buzz-workspace/.git
71M     /tmp
```

**Pre-clone constraint per dispatch:** "if >85% pre-clone, surface to operator BEFORE proceeding (Doctrine #32 v1.1.1 mature-deploy hold + halt-at-88% rule)".

87% > 85% threshold. The dydx-v4 clone (depth=1) of `dydxprotocol/v4-chain` would land ~1.5-2 GB based on prior 2026-05-23 clone footprint (1,104 Go files + 789 TS indexer files + protobuf + audits dir). Post-clone projection: ~91-92% — over 88% hard halt.

**Operator decision required:** clearance / target-path / disk-cleanup direction.

---

## GATE 2 — PRIOR GATE 1 EXISTS `[INSPECTED]`

`hunts/2026-05-23-dydx-v4-gate1.md` (filed 3 days ago, v1.6 raw-EV sweep #3):

| Field | 2026-05-23 finding |
|---|---|
| Verdict | **WATCHLIST — substrate-coverage gap, audit-saturation discount, low brain overlap** |
| Substrate | Go (1,104 prod files) + TS indexer (789) + protobuf. **Zero Solidity. Zero production Rust.** (`v4-proto-rs/` is consumer SDK bindings, not application logic) |
| Bounty cap (verified per repo audits dir) | $5M assumed; not re-verified live |
| Audits in-repo | **6 Informal Systems reports** (Q4-2023, Q1-2024, Q2-2024, Q2+2024, Phase I-II, Phase III) — Doctrine #27 saturation 0.30× discount applied |
| Brain overlap | **LOW** — 1 direct (Pattern H descriptive) + ~5 conceptual maps with no implemented Go detector |
| EV | **$1,125** ($5M × 0.01 × 0.5 × 0.15 × 0.30) — collapsed from baseline-brief assumption $375K by 333× |
| Re-trigger conditions | (a) Buzz adds Cosmos-SDK Go detector pack, OR (b) dYdX V4 ships Solidity bridge/Rust module to in-scope, OR (c) new CANDIDATE class maps mechanically to Cosmos Go |

**Dispatch premise check:** msg 7840 asserts "NOT yet in the Buzz Lane 1 corpus." Reality: dYdX V4 entered the corpus 2026-05-23 with a comprehensive Step-1..Step-6 record. The substrate-diversity rationale (close-the-Go-gap) IS coherent — but the Go-gap-closure target is the **detector pack itself**, not a rescan of the same Cosmos-SDK target that already documented the gap.

---

## GATE 3 — DETECTOR-PACK STATE (since 2026-05-23) `[EXECUTED]`

`grep -lE 'cosmos|go.ast|golang|\.go\b' /home/claude-code/.tmp-build/v6/`:

```
buzzshield-skeptic.js          — HE-18 .pb.go auto-exclude rule
buzzshield-v6-pipeline.js      — HE-18 .pb.go auto-exclude routing
buzzshield-layer1-deep.js      — HE-18 .pb.go file filter
buzzshield-invariant-analyzer.js  — pattern-pool refs (no Go AST)
buzzshield-reporter.js         — platform .go file type tagging
buzzshield-poc-generator.js    — language detection
buzzshield-amplifier.js        — fingerprint .go suffix matching
buzzshield-pentest.js          — `cargo` / `forge` / `go test` invocation switch
```

**All 8 hits are exclusion/routing references, not detection logic.** No file named `buzzshield-cosmos-deep.js` or analogous Go AST walker exists. The 2026-05-23 re-trigger condition (a) has NOT been met.

**Cross-check on `scripts/lane1/`:**

```
contest-monitor.py
contest-monitor.sh
beanstalk-vault-monitor.sh
git-security-analyzer.js   (Layer 0, Pashov ADOPT A1 — language-agnostic)
```

Layer 0 git-security-analyzer is the only NEW Lane 1 tool since 2026-05-23 — and it's language-agnostic (acts on commit history, file paths, audit-dir mtimes). It would run cleanly on a dYdX V4 clone, but its output feeds **Layer 1's brain-lens inventory + late-changes pre-bias**. Layer 1 still has no Go AST detector to consume the bias. **Layer 0 alone does not close the substrate gap.**

---

## SUBSTRATE-DIVERSITY DISPATCH RATIONALE — RECONCILIATION

Dispatch msg 7840: "today's Day 26 batch hit Rust (Raydium/Hydration/Filecoin) + Clarity (Stacks/ALEX) + Solidity (JustLend); dYdX V4 closes the Go gap."

Day 26 hunts dir confirms the substrate batch:

| Target | Substrate | Buzz detector coverage | Hunt file |
|---|---|---|---|
| Raydium | Rust (Solana Anchor) | YES — Anchor IDL + L1-deep Solana support | `2026-05-26-raydium-immunefi-gate1.md` |
| Hydration | Rust (Substrate runtime) | PARTIAL — `hydration_cl0wdit` skill is Rust-focused, but Substrate-specific patterns less mature than Solana | `2026-05-26-hydration-immunefi-gate1.md` |
| Filecoin | Rust (Lotus FVM actors) + Go (lotus daemon) | PARTIAL Rust, ZERO Go | `2026-05-26-filecoin-immunefi-gate1.md` |
| Stacks core | Clarity | ZERO | `2026-05-26-stacks-immunefi-gate1.md` |
| ALEX | Clarity | ZERO | `2026-05-26-alex-immunefi-gate1.md` |
| JustLend | Solidity | YES — full v6 pack | `2026-05-26-justlend-immunefi-gate1.md` |

**Pattern:** today's batch heavily samples substrates where Buzz has ZERO or PARTIAL detector coverage. Filing 5/6 Gate 1s on out-of-detector-scope targets is consistent with **substrate-corpus mapping** (knowing where the gaps are, with R8 calibration), not with **EV-generating bounty hunting**. The Doctrine #27 + Doctrine #32 stack is doing its job — it correctly produces WATCHLIST/FORECLOSURE verdicts on these targets and stops cycles before clone work where appropriate.

dYdX V4 is the most extreme version of this pattern: **mature production chain + 6 in-repo audits + ZERO Solidity + ZERO production Rust**. Per Doctrine #27 saturation + Doctrine #32 v1.1.1 mature-deploy (mainnet-live since late 2023, well over 365d), the EV is structurally below the foreclosure floor. The 2026-05-23 EV=$1,125 number ALREADY reflects this honestly.

---

## OPERATOR OPTIONS (FOR DECISION — REPLY REQUIRED BEFORE CLONE)

The dispatch is operator-approved and could be honored as-is, but I have an obligation to surface the three gates before burning ~1.5 GB disk + ~45 min wall-clock on a re-confirmation of the 2026-05-23 verdict. Options:

**A. CONFIRM-AND-PROCEED.** Operator acknowledges:
   1. Disk will land ~91% post-clone (under 92% hard halt, over recommended ceiling)
   2. Output will largely mirror 2026-05-23 verdict (substrate gap unchanged)
   3. Cycle-cost is ~30-45 min for a re-confirmation with new Layer 0 git-security data layer

   Proceed with full Standing-Intake Step 5 pipeline; clone via `GIT_TERMINAL_PROMPT=0 git clone --depth 1`, run Layer 0 git-security-analyzer fresh, redo inventory, file as `hunts/2026-05-26-dydx-v4-immunefi-gate1.md`. Honest output may still surface delta data (commit-velocity, late-changes around `x/clob` / `x/listing` / `x/vault`, fix-keyword post-2026-05-23 mainline activity) — but the verdict almost certainly stays WATCHLIST.

**B. RESCOPE TO DETECTOR-PACK BUILD.** The substrate-diversity strategic goal (close-the-Go-gap) is best served by **building `buzzshield-cosmos-deep.js`** as a parallel Layer 1 module, not by re-scanning dYdX V4 without it. Estimated effort: 2-3 weeks (msg-handler AST walker + ante-handler chain tracer + module-param drift detector + keeper-pattern paired-function). Defer dYdX V4 rescan until detector ships. This is what the 2026-05-23 Step 4 next-action recommendation already proposed (line 184 of prior Gate 1).

**C. PIVOT-TARGET.** Dispatch the cycle on a different Go-substrate Immunefi target where Buzz CAN make incremental progress on the gap WITHOUT needing the full detector pack — e.g., a smaller Cosmos-SDK chain where manual lens application across ≤200 files is feasible within 45 min. dYdX V4 at 1,104 production Go files is structurally too large for manual within budget. Candidates: smaller Sei modules, Berachain Polaris EVM bridge (mixed Solidity), Injective bridge-vault (mixed). Operator picks.

**D. STAND DOWN, RECLAIM CYCLE.** Acknowledge the 2026-05-23 verdict stands. Use the freed cycle to drain a higher-EV pending item (Gate 2 submissions, paste-ready drafts in queue, or a fresh Solidity HIGH-overlap target where Buzz pack is mechanically applicable).

**Default in absence of operator clearance:** Option D (stand down, reclaim cycle). Standing-Intake Step 4 surface protocol is "operator decides queue position" when EV-borderline; here the EV is not borderline (EV=$1,125 confirmed by 2026-05-23), so the surface is in the spirit of "don't burn the cycle silently."

---

## CONSTRAINTS HONORED

- [x] Operator dispatch read in full and parsed against existing corpus
- [x] No clone executed
- [x] No brain/ files modified
- [x] No rule files / detector files modified
- [x] No telegram or external surface
- [x] Disk state captured pre-action
- [x] R8 tags on every load-bearing claim (`[EXECUTED]` for shell-verified disk + grep + ls counts, `[INSPECTED]` for prior Gate 1 read-through)
- [x] HE-03b / HE-18 enforcement state confirmed unchanged
- [x] Doctrine #32 v1.1.1 disk halt rule honored
- [x] Wall-clock <10 min for this surface (well under 45 min cap)

---

## BRAIN COMPOUND PROPOSALS (FROZEN PENDING OPERATOR)

**P1. Standing-Intake Step 0 — "prior-Gate-1 lookup":** before any new dispatch, grep `hunts/` for `<target>-gate1*.md` matches. If a prior Gate 1 exists within the last 30 days with a WATCHLIST or FORECLOSURE-RECEIPT verdict, AND the re-trigger conditions in that prior have not been met, surface to operator BEFORE Step 1 profile work. Prevents dispatch-vs-corpus collisions like this one. (Cost: ~10 lines added to standing-intake-protocol.md.)

**P2. Doctrine #33 candidate — "substrate-coverage gate":** before EV calc in Step 3, evaluate whether Buzz detector pack has mechanical coverage for the target substrate. If NO mechanical detector exists, set `P(finding) = 0.01` floor and document explicitly. Today's Day 26 batch (Stacks Clarity 0 detector, Filecoin Go 0 detector) shows this pattern is recurring; codifying as doctrine prevents repeat substrate-mismatch surprises. (Aligns with current 2026-05-23 dYdX practice; codification makes it a standing rule rather than ad-hoc.)

**P3. Detector roadmap row — `buzzshield-cosmos-deep.js`:** add explicit roadmap entry under `audit-methodology-v2.md` for Cosmos-SDK Go detector pack. Scope: msg-handler AST walker (analog to Phase 4b paired-function), ante-handler chain tracer (analog to Phase 9 signature), module-param drift detector (analog to Phase 8 access-control), keeper-pattern paired-function (analog to Phase 4a-d). Effort 2-3 weeks. Justification: substrate-diversity is a strategic goal per Vision-2027 (cross-substrate coverage compounds); current corpus is Solidity-heavy + partial Solana; Cosmos universe is large and growing (Osmosis, Sei, Injective, Berachain, Sky-mainnet, dYdX V4, Celestia, Babylon).

These remain **frozen pending operator** per dispatch constraint. NO brain/ edits made.

---

## NEXT-ACTION (DEFAULT IF NO OPERATOR REPLY WITHIN STANDARD WINDOW)

Per Operator-Philosophy hyperactive-default: do NOT idle on this. Move to the next-highest-EV unscanned candidate in the Day 26 queue — drain a Gate 2 submission paste if pending, or open a fresh Solidity HIGH-overlap target. Log this surface to the intake-log row for audit trail, then advance.

`hunts/intake-log.md` row to append (frozen pending operator): `2026-05-26 | dydx-v4-Immunefi | DISPATCH MISMATCH (prior 2026-05-23 WATCHLIST, substrate-gap unchanged, disk-halt 87%) | HALT-PRE-CLONE`

---

_Filed 2026-05-26 18:01 UTC | Buzz BD Agent | Pre-clone halt per Standing-Intake-Protocol v1.0 + Doctrine #32 v1.1.1_
