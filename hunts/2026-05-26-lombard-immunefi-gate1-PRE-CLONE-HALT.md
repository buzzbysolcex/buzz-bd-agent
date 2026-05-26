# Lombard Finance — Gate 1 PRE-CLONE-HALT (Step 0 anomaly)

> Date: 2026-05-26
> Halt source: Standing-Intake Protocol Step 0 — prior-Gate-1-corpus lookup MATCHED
> Halt time: 2026-05-26 (post-msg-7840 dispatch)
> Status: **HARD HALT — operator decision required before any clone or scan work**

---

## STEP 0 RESULT — ANOMALY DETECTED

Parent dispatch asserted: "No prior Lombard Gate 1 in the Buzz Lane 1 corpus — verify via `Glob hunts/**/*lombard*` first (should return 0 files)."

**Actual finding:** `Glob hunts/**/*lombard*` returned **1 file**:

- `hunts/2026-05-21-lombard-gate1.md` — filed 2026-05-21 (5 days ago)
- Repo: `lombard-finance/evm-smart-contracts`
- HEAD commit pinned: `5ec153c` "Merge PR #449 from audit/20260515-add-report" (2026-05-15)
- Immunefi profile captured: $50K-$250K crit / $10K-$50K high / $2.5K med / $1K low
- **Submission fee required** + **KYC required** + Primacy of Impact for Crit/High SC
- Status: research-only — research COMPLETE, no submit per fee gate

Per Step 0 canonization (added after dYdX halt 2026-05-26): "If anything matches, surface as anomaly + halt."

---

## ADDITIONAL CORPUS HITS (brain/ pre-existing knowledge)

Lombard is NOT a fresh-target program. Already extensively catalogued:

| Brain file                          | Hit                                                                                                                                                                  |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Cross-Domain-Fragility-Laws.md`    | Entry 2026-05-21 line 720 — Dual-trust mint chain defensive pattern (Consortium + Bascule trustedSigner). Filed as cross-pollination lens for single-tier BTC bridges (THORChain Bifrost specifically called out as Lane 1.5 candidate). |
| `Ground-Truth-Exploits.md`          | Line 198 — "Lombard LBTC (#21) — bridge-mint paths" indexed as ground-truth surface                                                                                  |
| `Watchlist-Candidate-Crossmap.md`   | Line 318 — Lombard included in 7-target DC-9 sub-4 (state-not-invalidated repeated mint) foreclosure receipt set. Line 319 — Lombard-LBTC DC-9 family defense ratio 4.73 (8 timelock + 42 rate-limit + 21 guardian) measured in Step 9 sweep. |
| `Watchlist-Candidate-Crossmap.md`   | Line 334 footer — v1.4 Addendum 2026-05-22 records "Step 9 propagation foreclosure receipts (Lombard, Usual-Fira, Lido)"                                              |
| `Doctrine.md`                       | (file-level match — content section not enumerated)                                                                                                                  |
| `Vision-2027.md`                    | (file-level match — Lombard referenced in operating directive)                                                                                                       |

**Net:** Lombard has been (a) Gate 1'd to completion 2026-05-21, (b) DC-9 family defense ratio measured in Step 9 sweep, (c) cross-pollination defensive-pattern entry filed to Cross-Domain-Fragility-Laws, (d) included in 7-target foreclosure receipt set.

---

## WHAT THE PRIOR GATE 1 CONCLUDED (2026-05-21 file summary)

5 candidate surfaces enumerated, ranked priority-order:

1. **DC-7 enumeration of `IBascule.validateWithdrawal(...)` callers** — verdict TIGHT, both NativeLBTC + BridgeTokenAdapter callsites correctly bind depositID = keccak256(payload[4:]) + amount = decoded. **EV: LOW** — no on-chain DC-7 gap; off-chain reporter SPOF unauditable from code.

2. **Veda ERC4626VaultWrapper cross-protocol exposure** — Lombard's StakeAndBake routes through Veda BoringVault. Adjacency to author's Veda RESUBMIT #79091 (status: ?). **EV: indirect, depends on Veda outcome.**

3. **GMPBasculeV2 `setTrustedSigner` zero-check vs BasculeV3 absence** — Admin-gated governance-mistake class; not directly exploitable. **EV: LOW (informational).**

4. **Mailbox `deliverAndHandle` race vs handle-only flow** — TODO comment present; current flow is tight. **Not exploitable.**

5. **BridgeV2 `decodeMsgBody` v2 optional-message length-handling** — Tight; assembly memcpy bounds-checked. **Not exploitable.**

**Prior Gate 1 net surviving submission-grade candidates: 0.** All 5 surfaces traced to tight defense or admin-gated governance-mistake (out-of-scope).

---

## OPERATOR OPTIONS (decision required before any further work)

### Option A — RESCAN AT NEW HEAD (delta-only scan)

Determine if `lombard-finance/evm-smart-contracts` HEAD has advanced past `5ec153c` (2026-05-15) in the last 5 days. If yes, run a Layer 0 git-security-analyzer + git-delta-only re-scan of the diff. If no, skip.

- **Effort:** ~10 min (git fetch + log range query + optional clone)
- **Disk impact:** Re-clone needed (~150 MB shallow). Disk currently 87% / 5.0G avail — marginal but feasible with --depth 1.
- **EV:** LOW unless meaningful new code shipped (12 confirmed audits, V3 just shipped 2026-05-15, mature code path). Plausible new surface: Veda RESUBMIT cross-protocol fallout if upstream Veda finding landed.

### Option B — PIVOT TO ADJACENT BTC-LST IN SCOPE (highest-EV path)

Run Standing-Intake Step 1-5 on a Lombard-adjacent, non-prior-scanned BTC-LST/wrapper program. Candidates to pre-evaluate:

| Program       | Family                       | Immunefi status     | Prior Gate 1?                       |
| ------------- | ---------------------------- | ------------------- | ----------------------------------- |
| pumpBTC       | BTC-LST                      | unknown (verify)    | unknown (Glob check needed)         |
| Solv Finance  | BTC LST + RWA                | $100K+ cap reported | unknown                             |
| Bedrock uniBTC| BTC LST (was exploited 2024) | unknown             | unknown                             |
| Kinza Finance | BTC-LST adjacent             | unknown             | unknown                             |
| EtherFi BTC   | BTC LST                      | unknown             | unknown                             |
| Babylon       | BTC staking (Cosmos+Bitcoin) | $1M Critical (#21)  | unknown                             |

- **Effort:** Standing-Intake Steps 1-3 on the next-priority BTC-LST → if HIGH overlap + active payer, run full Gate 1.
- **Disk impact:** One clone (~100-300 MB). Same 87% concern.
- **EV:** HIGHEST — fresh-target compounding of the Lombard dual-trust mint chain lens onto a single-tier-trust BTC bridge (per Cross-Domain-Fragility-Laws Entry 2026-05-21 cross-pollination directive).

### Option C — DEFER, REROUTE CYCLES TO QUEUED PIPELINE TARGETS

Per `feedback_proactive_not_passive.md`: advance pending queue. Current pending work (per memory):

- **DISC-017 Ethena** — Immunefi #79589 submitted 2026-05-23, 14d SLA → 2026-06-06 (T+11 days remaining), in triage
- **DISC-018 Morpho** — Cantina #1035 submitted 2026-05-23, awaiting triage
- **DISC-019 Notional V3** — Immunefi #79837 submitted 2026-05-25, 14d SLA → 2026-06-08 (T+13 days remaining), in triage
- Lane 4 forum-intel sweep + 5-target quality checklist on other queued Gate 1s

- **Effort:** Zero new disk; pure cycle reallocation.
- **EV:** Indirect — monitoring + queue management does not produce new Gate 1 candidates today.

### Option D — TIGHTEN BRAIN COMPOUND FROM PRIOR GATE 1

The prior Gate 1's section 6 ("Brain compounding notes") proposed THREE patterns that have not yet been promoted to standalone doctrine entries:

1. **Dual-trust mint chain** — already promoted to `Cross-Domain-Fragility-Laws.md` Entry 2026-05-21 ✓
2. **validateThreshold default 0 = validate-all** — NOT YET promoted. Worth a Doctrine entry as standing checklist item.
3. **Storage-rename migration via `__removed__` fields** — NOT YET promoted. Worth a Doctrine entry as upgrade-safety reference.

- **Effort:** ~15 min to draft + propose. Operator-frozen (per dispatch constraints — brain compound proposals go in PROPOSALS section, not direct edits).
- **EV:** Compounding multiplier — future Gate 1s gain two new lenses.

---

## RECOMMENDED ACTION

**Option B — pivot to next-priority BTC-LST.**

Rationale: Per `Cross-Domain-Fragility-Laws.md` Entry 2026-05-21 line 720, the highest-EV cross-pollination move is to apply Lombard's dual-trust mint chain lens to a SINGLE-tier-trust BTC bridge or LST. Lombard itself is foreclosed (defense ratio 4.73, 12 audits, Step 9 sweep complete, prior Gate 1 surfaced zero submission-grade candidates). The lens compounds when applied to a less-mature target.

**Suggested next program (operator confirmation needed):**

- **pumpBTC** or **Solv Finance** or **Bedrock uniBTC** — BTC-LST primitives, less audit-saturated than Lombard, plausible single-tier trust assumption.
- **Babylon** ($1M Critical, Ground-Truth-Exploits #21) — already on watchlist, but the Cosmos+Bitcoin substrate may exceed today's 45-min wall-clock cap.

If Option B selected: parent dispatch should re-issue with the chosen target name. Step 0 corpus lookup will run against the new name.

---

## BRAIN COMPOUND PROPOSALS (FROZEN PENDING OPERATOR)

Beyond the unpromoted Section 6 patterns above:

### Proposal 1 — Step 0 false-negative lesson learned

Parent dispatch asserted "no prior Gate 1" but corpus had one filed 5 days ago. This is the second Step 0 anomaly in <12h (after dYdX). Suggests **the dispatch-side corpus check is not consulting `hunts/` reliably before issuing**. Recommend:

- Operator-side pre-flight: `Glob hunts/**/*<target>*` BEFORE dispatching Gate 1 prompt
- OR: subagent unconditionally accepts the corpus lookup as overriding the dispatch assertion (current canonized behavior — Step 0 worked correctly here)

File to: `brain/Doctrine.md` as a standing operational lesson — "Step 0 prior-Gate-1 lookup is canonical truth; dispatch assertions are advisory."

### Proposal 2 — Foreclosure status flag on brain crossmap

`brain/Watchlist-Candidate-Crossmap.md` should grow a `gate1_status` column per program (FORECLOSED / OPEN-CANDIDATE / DELTA-RESCAN-DUE / NEVER-SCANNED). Lombard is FORECLOSED. Babylon is NEVER-SCANNED. pumpBTC is unknown. The column prevents repeat dispatches into already-foreclosed targets.

File to: `brain/Watchlist-Candidate-Crossmap.md` as a header-row schema update.

### Proposal 3 — Disk-pressure operating-budget rule

Current disk: 87% / 5.0G avail. The 88% halt threshold is a SOFT brake — actual Gate 1 wall-clock allows one ~300MB clone. Recommend a Doctrine rule: **before issuing any Gate 1 dispatch, operator confirms `df -h /` < 85%** to leave headroom for the subagent's clone + work product. Below 85% = green. 85-88% = single-clone budget only. >88% = no new clones.

File to: `brain/Doctrine.md` as standing operational rule for clone-budget discipline.

---

## DISK + RESOURCE NOTES

- Disk pre-attempt: 87% (5.0G free / 38G total)
- Clone NOT performed (HALT before Step 5)
- Disk delta: 0 (no work product written beyond this halt file + intake log update pending operator decision)
- Tools used: Glob (2x), Grep (3x), Read (2x), Bash df (1x), Write (1x — this file)

---

## NEXT STEPS PENDING OPERATOR

1. Operator chooses Option A / B / C / D (or hybrid)
2. If B: name the next BTC-LST target; subagent re-runs Step 0 against that name
3. If A: subagent runs `git ls-remote` + delta-only re-scan
4. If C: subagent stands down on this dispatch and resumes pipeline-monitoring duties
5. If D: subagent drafts the two unpromoted Doctrine entries as PROPOSALS for operator review

---

_Lombard Finance PRE-CLONE-HALT — Step 0 anomaly, prior Gate 1 dated 2026-05-21 found at `hunts/2026-05-21-lombard-gate1.md`. No new clone, no new scan, no brain edit performed. Awaiting operator routing._
