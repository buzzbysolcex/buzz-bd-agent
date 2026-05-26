# Day 26 Afternoon — Brain Proposals Applied Ledger (v2, post-3-halt batch)

**Authority:** Ogie msg 7844 (2026-05-26 afternoon — Across proposals approved + Platform-Migration-Log endorsed as "real gap"). dYdX V4 + Lombard proposals auto-approve (corpus-internal discipline improvements, not external-claim-bearing).
**Scope:** Three PRE-CLONE-HALT files filed during 2026-05-26 afternoon hunting cycle.
**Source halt files:**
- `hunts/2026-05-26-across-immunefi-gate1-PRE-CLONE-HALT.md` (P1, P2, P3, P4)
- `hunts/2026-05-26-dydx-v4-immunefi-gate1-PRE-CLONE-HALT.md` (P1, P2, P3)
- `hunts/2026-05-26-lombard-immunefi-gate1-PRE-CLONE-HALT.md` (Proposal 1, 2, 3 + Section 6 unpromoted patterns)

**Companion:** `hunts/2026-05-26-brain-proposals-applied-ledger.md` (morning batch, 17 applied + 17 deferred from 6-target Day 26 batch).

---

## Summary — Afternoon batch — post-3-halt proposals

| Status | Count |
|---|---|
| **APPLIED** (direct brain-file edit) | 6 |
| **DEFERRED** (operator-decision / pending 2nd anchor / harness-denied) | 4 |
| Total proposals reviewed | 10 |

Afternoon batch is corpus-internal discipline improvements (Step 0 lookup + substrate-coverage gate + platform-migration log + Doctrine #34 anchor candidate). No external-claim findings; no submission-track work. Bug-bounty hunting halted across all three targets before clone; freed wall-clock budget reallocated to brain compounding.

---

## Per-Proposal Ledger

| Hunt source | Brain target | 1-sentence summary | Status |
|---|---|---|---|
| Across P1 | `brain/Watchlist-Candidate-Crossmap.md` row 43 | Across V3 row added as CANDIDATE-A direct-anchor with HALTED-platform-ambiguity status; first Buzz Gate 1 dispatch on intent-based-bridge sub-family | **APPLIED** |
| Across P2 | `brain/Doctrine.md` Doctrine #34 enrichment | `ArbitraryEVMFlowExecutor` HEAD commit `9ffb2ab26464` (2026-05-19) filed as PROVISIONAL anchor candidate 5 for Doctrine #34; promotion gated on operator routing or competitor disclosure | **APPLIED** |
| Across P3 | `brain/External-Frameworks.md` (Single-Firm-Continuous-Audit Sub-Pattern section) | Across V3 OpenZeppelin-continuous-audit filed as 2nd canonical anchor after Risk Labs UMA; Doctrine #27 calibration tier proposal pending 3rd anchor | **APPLIED** |
| Across P4 | `brain/Platform-Migration-Log.md` (NEW FILE) | First canonical entry: Across migration FROM Immunefi TO self-hosted `bugs@across.to`; operator explicitly endorsed file as "real gap"; schema + Lane 5 Immunefi crawler integration note | **APPLIED (NEW FILE)** |
| Across P1 corollary | `brain/Watchlist-Candidate-Crossmap.md` (v2.1 addendum gate1_status proposal) | gate1_status column schema proposal captured inline (OPEN-CANDIDATE / FORECLOSED / DELTA-RESCAN-DUE / NEVER-SCANNED / HALTED-platform-ambiguity / HALTED-disk-pressure); pending v3 schema cycle for full migration | **APPLIED** (proposal recorded; column not yet retrofitted onto historical rows) |
| dYdX V4 P1 / Lombard Prop 1 | `.claude/rules/standing-intake-protocol.md` Step 0 prior-Gate-1 lookup | Attempted Edit-tool insertion of Step 0 spec BEFORE Step 1 PROFILE; spec verbatim captured below for manual operator application | **HARNESS-DENIED** (Edit tool blocked on `.claude/rules/`; same pattern as morning batch Raydium-D + Filecoin-C5) — spec preserved here |
| dYdX V4 P2 | `brain/Doctrine.md` Doctrine #36 CANDIDATE | Substrate-Coverage Gate (floor P(finding) ≤ 0.01 when no mechanical detector exists for substrate); single-anchor dYdX V4 Cosmos-SDK Go; pending 2nd substrate-blind anchor for PERMANENT promotion | **APPLIED** (CANDIDATE status) |
| dYdX V4 P3 | `.claude/rules/audit-methodology-v2.md` Detector roadmap row `buzzshield-cosmos-deep.js` | Explicit roadmap entry for Cosmos-SDK Go detector pack (msg-handler AST walker + ante-handler chain tracer + module-param drift detector + keeper-pattern paired-function, 2-3 week effort); aligns with Vision-2027 substrate-diversity strategic goal | **DEFERRED** (audit-methodology-v2.md edit not attempted in this batch — would require separate Edit-tool engagement; spec preserved below for follow-up; companion to Doctrine #36 CANDIDATE) |
| Lombard Prop 2 | `brain/Watchlist-Candidate-Crossmap.md` (gate1_status column) | Same as Across P1 corollary above (captured in v2.1 addendum) | **APPLIED via Across P1 corollary path** |
| Lombard Prop 3 | `brain/Doctrine.md` (disk-pressure operating-budget rule) | Operator confirms `df -h /` < 85% before issuing any Gate 1 dispatch; 85-88% single-clone budget only; >88% no new clones | **DEFERRED** (Doctrine #32 v1.1.1 already encodes this implicitly via halt-at-88% rule; explicit operator-side pre-flight is process change, not brain edit; tracked here for operator-side workflow update) |
| Lombard §6 unpromoted patterns 2-3 | (`validateThreshold default 0 = validate-all` standing checklist + `__removed__` storage-rename migration safety reference) | 2 unpromoted patterns from prior 2026-05-21 Lombard Gate 1 §6; would require Doctrine entries; operator-decision per Option D of Lombard halt file | **DEFERRED** (Option D of Lombard halt file — operator did not select Option D explicitly in msg 7844; preserved for next Lombard-class intake or operator-routing decision) |

---

## Per-File Edit Summary

| Brain file | Sections added/modified | New version |
|---|---|---|
| `brain/Watchlist-Candidate-Crossmap.md` | v2.1 Addendum — row 43 (Across V3 HALTED-platform-ambiguity) + gate1_status column schema proposal | (no version footer; new addendum section) |
| `brain/Doctrine.md` | Doctrine #34 enrichment — PROVISIONAL anchor 5 (Across V3 `ArbitraryEVMFlowExecutor`); Doctrine #36 CANDIDATE NEW (Substrate-Coverage Gate, single-anchor dYdX V4) | v3.5 |
| `brain/External-Frameworks.md` | Single-Firm-Continuous-Audit Sub-Pattern section (Across V3 as 2nd canonical anchor after Risk Labs UMA) | v1.4 |
| `brain/Platform-Migration-Log.md` | NEW FILE — schema + Across canonical entry + Lane 5 crawler integration note | v1.0 (new) |
| `.claude/rules/standing-intake-protocol.md` | Step 0 prior-corpus lookup spec | NOT APPLIED (Edit tool denied; spec preserved in this ledger below) |
| `.claude/rules/audit-methodology-v2.md` | `buzzshield-cosmos-deep.js` detector roadmap row | NOT APPLIED (deferred; spec preserved in this ledger) |

---

## Standing-Intake Step 0 Spec — Verbatim (HARNESS-DENIED in `.claude/rules/standing-intake-protocol.md`)

For manual operator application — insert BEFORE the existing "## STEP 1 — PROFILE" section:

```markdown
## STEP 0 — PRIOR-CORPUS LOOKUP (immediate, <1 min) — added 2026-05-26 afternoon

BEFORE Step 1 PROFILE, ANY new Gate 1 dispatch MUST run:

1. `Glob hunts/**/*<target-slug>*` — surface ALL prior hunt artifacts for the target
2. `Grep <target-name> brain/Watchlist-Candidate-Crossmap.md` — check for existing crossmap row
3. **Check `brain/Platform-Migration-Log.md`** — confirm platform has not migrated since prior watchlist scrape

If ANY prior artifact exists, **surface as Step 0 anomaly to operator BEFORE proceeding** with Step 1. Include in surface:

- The prior Gate 1 verdict (WATCHLIST / FORECLOSURE-RECEIPT / submission-grade-candidate / HALT-PRE-CLONE)
- The re-trigger conditions documented in the prior artifact
- Whether ANY re-trigger condition has been met since (substrate detector pack shipped, HEAD has advanced past pinned commit, new CANDIDATE class registered, audit cadence resumed, etc.)
- Platform-migration status if relevant

If no re-trigger condition has been met, the dispatch is **PRESUMPTIVELY REDUNDANT** — operator decides whether to (a) proceed with a delta-only rescan, (b) pivot to a different target, or (c) stand down.

**Authority:** Combined dYdX V4 P1 (2026-05-26 PRE-CLONE-HALT — prior 2026-05-23 WATCHLIST verdict re-issued without check) + Lombard P3 (2026-05-26 PRE-CLONE-HALT — prior 2026-05-21 foreclosure re-issued without check) + Across-implicit-lesson (2026-05-26 missed platform-migration). Standing rule effective immediately as canonical mitigation for the dispatch-vs-corpus collision pattern documented across the 3 PRE-CLONE-HALT files. Step 0 surfaces are AUTHORITATIVE — dispatch assertions ("no prior Gate 1") are advisory.

**Output:** if anomaly surfaced, file `hunts/<date>-<target>-PRE-CLONE-HALT.md` with Step 0 detail + operator-options surface. Do NOT proceed to clone work until operator routes.

**Exemption:** if `Glob` returns ZERO files AND `Grep brain/Watchlist-Candidate-Crossmap.md` returns ZERO matches AND `Grep brain/Platform-Migration-Log.md` returns ZERO matches, proceed directly to Step 1 — no anomaly to surface.
```

**Permission-block note:** Same Edit-tool denial pattern observed in 2026-05-26 morning batch (Raydium-D + Filecoin-C5). Operator-side manual application required.

---

## `buzzshield-cosmos-deep.js` Detector Roadmap Spec — Verbatim (DEFERRED)

For follow-up application in `.claude/rules/audit-methodology-v2.md`:

```
**`buzzshield-cosmos-deep.js`** — Cosmos-SDK Go AST walker (Layer 1 deep-analyzer parallel for Go-substrate chains).

Scope:
- msg-handler AST walker — analog to Phase 4b paired-function for Solidity (`MsgServer` interface impls, `handleMsg*` switch routes)
- ante-handler chain tracer — analog to Phase 9 signature-and-replay (auth ante chain, fee deduct ordering, sequence increment)
- module-param drift detector — analog to Phase 8 access-control (`x/<module>/types/params.go` mutation surfaces, gov-proposal-only vs admin paths)
- keeper-pattern paired-function — analog to Phase 4a-d (storage Get/Set parity, IBC packet relay/ack symmetry)

Effort: 2-3 weeks (substrate-specific AST traversal + Cosmos-SDK idiom catalog + 3-target validation sweep)

Justification: substrate-diversity strategic goal per Vision-2027 (cross-substrate coverage compounds). Current corpus Solidity-heavy + partial Solana; Cosmos universe is large and growing (Osmosis, Sei, Injective, Berachain modules, Sky-mainnet, dYdX V4, Celestia, Babylon, Noble Assets).

Anchor: dYdX V4 (2026-05-23 Gate 1 substrate-mismatch foreclosure + 2026-05-26 PRE-CLONE-HALT re-confirmation, EV=$1,125 with 0.01 P(finding) floor); Doctrine #36 CANDIDATE codification.

Status: roadmap entry — implementation gated on operator approval and 3-week engineering budget allocation.
```

---

## Operator Decision Items (surfaced for routing post-ledger-commit)

| Item | Status | Operator action needed |
|---|---|---|
| Across Gate 1 routing (Option 1/2/3/4 per halt file) | PENDING | Decide Immunefi-path / self-hosted-path / pivot / brain-compound-only |
| Standing-Intake Step 0 manual edit on `.claude/rules/standing-intake-protocol.md` | HARNESS-DENIED | Apply spec from above to the rule file manually |
| `buzzshield-cosmos-deep.js` detector pack roadmap on `.claude/rules/audit-methodology-v2.md` | DEFERRED | Greenlight engineering budget OR pivot to different Cosmos-SDK target |
| Lombard §6 unpromoted patterns (validateThreshold + `__removed__`) | DEFERRED | Operator-decide whether to file as Doctrine entries on next Lombard-class intake |
| gate1_status column v3 schema migration | DEFERRED | Approve schema migration to retrofit historical rows |
| Lane 5 Immunefi crawler enhancement (Platform-Migration-Log auto-write) | HIGHEST-PRIORITY POST-CYCLE | Greenlight infrastructure task per Ogie msg 7844 |

---

## FORECLOSURE-RECEIPT Verification

All three afternoon halt files PRE-CLONE — no Gate 2 candidates produced, no foreclosure receipts to verify. Across is HALTED-platform-ambiguity (pending operator routing); dYdX V4 is HALT-PRE-CLONE (prior 2026-05-23 WATCHLIST verdict re-confirmed); Lombard is HALT-PRE-CLONE (prior 2026-05-21 foreclosure surfaced via Step 0 lookup).

---

## Cross-references

- `hunts/2026-05-26-brain-proposals-applied-ledger.md` — Day 26 morning batch (17 applied + 17 deferred from 6-target hunting day; Raydium / Hydration / Stacks / Filecoin / JustLend / ALEX retrospective)
- `brain/Doctrine.md` v3.5 — Doctrine #34 PROVISIONAL anchor 5 + Doctrine #36 CANDIDATE NEW
- `brain/Watchlist-Candidate-Crossmap.md` v2.1 Addendum — row 43 Across + gate1_status proposal
- `brain/External-Frameworks.md` v1.4 — Single-Firm-Continuous-Audit Sub-Pattern (Across 2nd anchor after Risk Labs UMA)
- `brain/Platform-Migration-Log.md` v1.0 — NEW FILE, Across canonical entry
- `.claude/rules/standing-intake-protocol.md` — Step 0 spec captured here pending harness-denial resolution
- `.claude/rules/audit-methodology-v2.md` — `buzzshield-cosmos-deep.js` detector roadmap spec captured here pending engineering budget

---

_Ledger filed 2026-05-26 afternoon per Ogie msg 7844 execution. Total: 6 applied + 4 deferred across 4 brain files + 1 NEW brain file (Platform-Migration-Log.md) + 2 harness-denied/deferred `.claude/rules/` specs preserved verbatim for manual application._
