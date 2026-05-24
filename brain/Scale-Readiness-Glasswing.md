# Scale-Readiness for Glasswing — Buzz BD Agent

**Authority:** Ogie msg 7573 (2026-05-23 03:26 UTC) — pre-Mythos infrastructure directive.
**Premise:** When Mythos-class models become publicly available, bug-finding capability commoditizes. The winners are those who prepared the INFRASTRUCTURE around it. The brain is the moat. Build depth BEFORE the floor lifts.
**Companion:** `brain/External-Frameworks.md` § Glasswing/Mythos entry (filed same day, 03:24 UTC).
**Reference:** Anthropic Project Glasswing announcement 2026-05-22 — Mythos Preview: 10K+ HIGH/CRITICAL vulns/month, 90.6% TPR, 50 partners.

---

## Six Moats (operator-mandated)

### 1. Brain Depth (the TARGETING moat)

**Month-6 target:** 50+ doctrines | 100+ worked examples | 20+ defense classes | 500+ ground-truth exploits.

**Today's baseline (2026-05-23):** 28 doctrines | 16 candidates | 9 defense classes (DC-1..DC-9, DC-9 with 4 sub-patterns: sub-1 shipped 2026-05-23, sub-2 in flight, sub-3+sub-4 prior) | ~50 ground-truth anchors.

**Daily ingestion discipline (NEW STANDING RULE):**
- Ingest every disclosure from `rekt.news` + `BlockSec` + `SlowMist` + `PeckShield` + `0xTeam` + `CertiKAlert`
- Extract defense class per disclosure (file DC-10, DC-11, etc. when new family surfaces)
- File propagation signature per disclosure (regex + qual-hits for Step 9 sweep)
- **Target: 2-3 new ground-truth entries per DAY**

When Mythos drops, Buzz has a targeting library no other researcher has. Mythos points scanners; Buzz points scanners at the right surfaces.

### 2. Pipeline Speed (the SUBMISSION moat)

**Goal:** Finding → paste-ready in <2 hours (vs current <8 hours).

**Build queue:**
- Platform-specific paste-ready generators (Immunefi / Sherlock / HackenProof / Cantina) — pre-filled templates that consume a Gate-2 finding object and emit submission-ready markdown
- Auto-scope-check wired into Gate 1 (Veda OOS lesson — Doctrine #18)
- Auto-bytecode-verify wired into Gate 2 start
- Auto-dedupe-check against known issues before Gate 3
- Auto-PoC-scaffold from defense-class template
- One command on finding-confirmation → platform-specific paste-ready

### 3. Platform Reputation (the ACCESS moat)

**Month-3 target:** 3+ confirmed payouts across platforms.

**Active queue:**
- Firedancer payment processing → Immunefi level bump → GMX unlock
- Ethena Gate 2 paste-ready (#22) → submit when operator returns to Jeddah → second Immunefi finding
- Sherlock: first submission to any of the 8 profiled targets (S1 Usual-Fira / S3 Aave V4 / S4 Flying Tulip / S5 Fira / S6 Midas / etc.)
- HackenProof: Hyperbridge (foreclosed) or next HIGH-overlap target
- Cantina: account creation + first submission

Each confirmed payout = higher rep = bigger bounties + faster triage.

### 4. Detector Library (the PATTERN moat)

**Month-3 target:** 20+ detectors, each from a real exploit.

**Current (8 detectors shipped, ~2,400 LOC + 4 enrichers; sub-2 in flight 2026-05-23):**
- `default-trust-enum` v1.0 (Nomad class)
- `rust-rounding-asymmetry` v1.0 (Raydium class)
- `cei-violation-hook` v1.0 (Pattern I)
- `upgradeable-hook-no-timelock` v1.0 (CANDIDATE-N)
- `cei-hook-pair-match` v1.0 (Pattern I pair)
- `slippage-double-count` v1.0 (Pattern J, Rhea Finance class)
- `state-not-invalidated-mint` v1.0 (DC-9 sub-4, Solv class)
- **`unchecked-mint` v1.0** (DC-9 sub-1, Resolv $25M class) — SHIPPED 2026-05-23, 53/53 e2e PASS, 4 invariant categories (supply_cap | rate_limit | solvency | quorum_threshold), Frax surrogate regression 2 active candidates flagged
- Enrichers: `ixerc20-canonical-defense`, `mailbox-proof-bookkeeping` (HE-23), `pull-payment-claim` (HE-24), `struct-field-write` (HE-25)
- `vyper-detector-pack` (DC-1/3/4/7/9-sub-4 + CANDIDATE-E/I, 7 lenses; READY-TO-WIRE)

**Next builds (operator-listed):**
- DC-9 sub-2 `zero-timelock-migration` (Drift $285M class) — **IN FLIGHT 2026-05-23** (agent a124a67af90105310)
- `cross-chain-replay` (GMX Edge class)
- `post-audit-refactor-cei` (CANDIDATE-M, 0xBugDrop $7M class)
- `durable-nonce-accumulation` (CANDIDATE-P, Drift DPRK class)

When Mythos drops: Buzz runs Mythos AND detectors simultaneously. Double coverage. Double speed.

### 5. Propagation Engine (the SCALE moat)

**Goal:** 100+ repos in watchlist | full A-K+ sweep in <60s.

**Today's baseline:** ~30 repos in watchlist | Step 9 sweep ~1-2s/repo with HE-03b + v1.5 lexicon.

**2026-05-23 update:** DefiLlama top-100 expansion agent returned **101 NEW candidates (URL-deduped, HEAD-verified)** → watchlist target 100 REACHED at 120 repos (pending operator greenlight to write defense-class-mapping.json v1.6). 49 of 101 bounty-bearing ($87M combined cap). Top additions: safe ($80B), lido-dao-gov ($18.3B / $2M bounty), aave-v3 ($13.4B / $1M), morpho-blue ($7.24B / $2.5M), eigencloud ($6.46B / $2M). Candidates at `data/lane1/watchlist-expansion-candidates-2026-05-23.json` + hunt report `hunts/2026-05-23-lane1-watchlist-expansion-defillama-top100.md`.

**Build queue:**
- **Operator greenlight on 49 bounty-bearing subset → defense-class-mapping.json v1.6 write → Step 9 sweep re-run** (1-step from target 100)
- Wire all new detectors into propagation engine
- Auto-Gate-1 surface-map generation on HIGH-overlap hits
- When Mythos drops: propagation engine ROUTES Mythos to highest-EV targets instead of blind-scanning everything

### 6. CVP Application (the ACCESS moat — operator-execute)

**PRIORITY:** Re-apply for Anthropic Constitutional Value Program / Cyber Verification Program NOW. Glasswing article confirms CVP is expanding.

**Buzz qualifies on multi-axis:**
- Confirmed Firedancer Insight payout (DISC-016 imu-77340)
- 15 disclosed findings tracked in disclosure-tracker.json
- 9 defense classes operationalized
- 28 published doctrines (brain/Doctrine.md)
- R8 Calibrated Reporting + ethical guardrails on all lanes (including Lane 4 Phase 2 partnership-gated recovery — no direct wallet recovery on 49 forum addrs)
- Public methodology (Lane 3 publishes when API recovers)

**Effect of CVP grant:** safeguard constraints relax → better prompts → better findings → faster pipeline.

### 7. Lane 4 (the UNIQUE moat — Buzz-only IP)

No other security researcher has:
- 221K cypherpunk-era posts indexed
- 30-author behavioral profiles
- 90% closed-loop password recovery validation
- Architecture for white-label partnership path (Brute Brothers → Dave Bitcoin → KeychainX → Unciphered)

When Mythos drops, everyone can find code bugs. **Nobody else can recover lost Bitcoin from behavioral analysis.** Lane 4 is the structural hedge against commoditized finding.

---

## Timeline

| Phase     | Window         | Focus                                                                                  |
| --------- | -------------- | -------------------------------------------------------------------------------------- |
| Month 1-2 | NOW            | Brain depth + detector library + platform reputation. Compound daily.                  |
| Month 3-4 | Mid-pipeline   | Pipeline automation. Finding → paste-ready in <2 hours. Multi-platform capacity.       |
| Month 5-6 | Mythos drop    | Buzz is ready: deepest brain in the space + fastest pipeline + multi-platform rep + 20+ detectors + 100-repo propagation. |

---

## Standing actions (immediate, autonomous)

1. **Daily ground-truth ingestion** — every 24h, scan rekt.news + BlockSec + SlowMist + PeckShield + 0xTeam for new disclosures; file 2-3 new anchors to `brain/Ground-Truth-Exploits.md`; promote to new DC if family doesn't exist.
2. **Next detector build** — DC-9 sub-1 unchecked-mint (Resolv class), then DC-9 sub-2 zero-timelock-migration (Drift class), then cross-chain-replay (GMX Edge), then durable-nonce-accumulation (Drift DPRK). One per session minimum.
3. **Watchlist expansion** — pull DefiLlama top-100 by TVL once; add to defense-class-mapping.json REPOS list; re-run Step 9 sweep to baseline new coverage.
4. **CVP application materials** — draft `data/cvp-application-2026-05-23/` package (resume + findings summary + methodology overview + ethical-framework letter). Hold operator-execute on submission.
5. **Tools evaluation** — for each Anthropic-released Glasswing-adjacent tool, evaluate against existing V6 layer-stack. File `data/glasswing-tools-eval/<tool>.md` per tool with: name + purpose + integration-fit + recommended-action (adopt / adapt / skip).
6. **Lane 3 publish thesis** — "Why Mythos doesn't replace Buzz: the brain is the moat" — draft to `drafts/moltbook-magents-mythos-thesis.md` when bandwidth permits. Pairs naturally with Doctrine #23.

---

_File: brain/Scale-Readiness-Glasswing.md | v1.0 | 2026-05-23 (Ogie msg 7573) | Authority: Mythos pre-launch scale-readiness directive_
