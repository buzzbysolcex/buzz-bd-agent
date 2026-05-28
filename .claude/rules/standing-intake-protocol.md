# Rule: Standing Intake Protocol — Any New Bounty Program

> Applies when: operator shares a new bounty program (screenshot, URL, program page text, or Telegram referral).
> Authority: Ogie msg 7435 (2026-05-21 03:59 UTC). Permanent rule, effective immediately.

---

## THE RULE

Every new-program intake follows the same 6-step pipeline. No ad-hoc triage. No skipped steps. The pipeline IS the intake — same discipline we apply to the audit pipeline (per `audit-methodology-v2.md` v2.5).

---

## STEP 1 — PROFILE (immediate, <2 min)

Extract and surface:

- **Platform** — Immunefi / HackerOne / HackenProof / Cantina / Code4rena / Sherlock / direct-email / other
- **Bounty structure** — Critical / High / Medium / Low caps (USD)
- **Payer history** — total $ paid historically, or `$0` flag (untested payer = high-risk)
- **KYC requirement** — yes / no / partial
- **Scope assets** — count of in-scope contracts + chains + languages (Solidity / Rust / Vyper / Go / C++ / Cairo)
- **Submission requirements** — PoC format (Foundry / Hardhat / Anchor / proof-of-concept narrative), rep threshold, novice rate-limit (Immunefi 1/24h)
- **Platform STATUS preflight (MANDATORY, added 2026-05-25 — Ogie msg 7772, Cap Sherlock anchor)** — confirm the bounty/contest is ACTIVE before any clone or scan work. Skip-conditions per platform:
  - **Sherlock** — fetch contest page; STATUS=FINISHED means contest is closed (judging done, no live submission path). Cap contest #990 anchor: finished 2025-07-24, operator brief in 2026-05 implied active = clone-cycle waste. Halt-at-Step-1 saves ~5-15 min of subagent work + clone disk. If FINISHED but operator wants post-audit-HEAD-drift analysis, surface that as a Step 4 queue decision (e.g., Cap pivot worked — 5 candidates surfaced from post-audit HEAD).
  - **Immunefi / Cantina / HackerOne** — verify the program page shows current bounty caps + not "archived"/"paused". Programs occasionally pause for redesign; cap may be inactive.
  - **Code4rena / Sherlock contest archives** — read-only post-judging; no submission path.

Output: short table in War Room message OR `hunts/<date>-<target>-intake-profile.md` for larger programs.

---

## STEP 2 — BRAIN OVERLAP SCORE (immediate, <3 min)

Cross-reference scope against:

1. **Defense classes** — DC-1 (re-entrancy), DC-2 (oracle staleness), DC-3 (access control), DC-4 (slippage / MEV), DC-5 (signature replay), DC-6 (cross-domain), DC-7 (Validating-Field ≠ Consuming-Field on adjacent function pipelines), DC-8 (Anchor-Signer-Validation moved out of Accounts struct), **DC-9 (Privileged State Mutation Without Defense-in-Depth — promoted 2026-05-22, Ogie msg 7518; 4 sub-patterns: unchecked-mint, zero-timelock migration, upgradeable-hook-no-timelock, state-not-invalidated repeated-mint; $320M+ combined anchor exposure)**
2. **CANDIDATE pool** — A (cross-chain bridge), D (CLMM state-machine), E (arithmetic rounding asymmetry), G (Solana Rust staker), I (ERC4626 share accounting), J (state-machine cooldown overwrite), K (HTTP-protocol-state), L (parallel-validation asymmetry — Next.js multicall analogues), M (Post-Audit CEI Break Via Upgradeable Hook), O (Slippage Double-Count Across Swap Steps), **P (Durable-Nonce Pre-Signed Tx Accumulation — Drift $285M anchor, paired with DC-9 sub-pattern 2)**, and any new candidates filed since
3. **Watchlist-Candidate-Crossmap** — `brain/Watchlist-Candidate-Crossmap.md` (if exists) or `brain/Cross-Domain-Fragility-Laws.md`
4. **Audit-Reports-Library** — `audits-library/` if firm-audit cross-reference suggests the program has been touched by Halborn / ToB / OZ / Spearbit / Sherlock

Score: **HIGH** (3+ direct lens hits, scope-fit obvious) / **MEDIUM** (1-2 lens hits, partial scope-fit) / **LOW** (no clean lens hit, fresh research required).

---

## STEP 3 — EV CALCULATION

```
EV = P(finding) × bounty_cap × P(acceptance) × brain_overlap_multiplier
```

Where:

- `P(finding)` ≈ 0.10-0.30 for HIGH overlap, 0.03-0.10 for MEDIUM, <0.03 for LOW
- `bounty_cap` = Critical cap in USD
- `P(acceptance)` ≈ payer-history-driven; default 0.5 for established payers, 0.2 for $0-history
- `brain_overlap_multiplier` = 1.0 (HIGH) / 0.5 (MEDIUM) / 0.15 (LOW)

Rank EV against current pipeline targets. Pipeline targets: open Gate 1s + queued Gate 2s + paste-ready submissions.

---

## STEP 4 — QUEUE DECISION (surface to operator)

| Overlap | Bounty cap | Recommended action                                                |
| ------- | ---------- | ----------------------------------------------------------------- |
| HIGH    | $500K+     | **Immediate Gate 1** — preempt other work if highest EV in queue  |
| HIGH    | $50K-$500K | **Standard Gate 1** — queue same-day                              |
| HIGH    | <$50K      | **Gap-fill Gate 1** — queue when high-priority Gate 1s clear      |
| MEDIUM  | $500K+     | **Research-first Gate 1** — surface to operator for greenlight    |
| MEDIUM  | <$500K     | **Watchlist add** — defer, monitor for scope expansion            |
| LOW     | any        | **Log to watchlist** — defer indefinitely unless new lens emerges |

---

## STEP 5 — GATE 1 EXECUTION (when activated)

1. Clone scope repos via `GIT_TERMINAL_PROMPT=0 git clone --depth 1` (per `git-clone-noninteractive.md`)
2. **Pre-flight scope-check** (Veda OOS lesson — Manager in-scope vs Decoder OOS):
   - Match each in-scope asset URL/address against the program scope table
   - For each target contract: confirm IN-SCOPE before any Gate 2 escalation
   - Flag any "inherited library" / "registered decoder" ambiguity for operator review
3. **Bytecode-verify prep** (Veda + Wormhole lesson):
   - For each in-scope address, plan a `cast code` + `solc --standard-json` direct compile against the candidate source SHA
   - Defer execution until Gate 2 finding, but plan the verification command up-front
3a. **SUBSTRATE-IDENTITY VERIFICATION (added 2026-05-28 deep night — FRAX V3 frxUSD H4 G2 substrate-confusion lesson, RECURRING-risk class)**:
   - For multi-repo protocols where the named bounty surface spans both WRAPPER and TOKEN layers (LayerZero OFT / Wormhole NTT / Circle CCT / cross-chain bridge wrappers / token-distribution-layer separations), MANDATORY pre-Gate-2 check:
     a. Name the EXACT repo path for the candidate finding (`owner/repo`)
     b. Grep the repo for the attack-vector primitive (e.g., `permit|transferWithAuthorization|EIP3009|ERC1271|isValidSignature` for signature replay; `_authorizeUpgrade|UUPSUpgradeable` for upgrade attacks)
     c. If grep returns ZERO matches, the attack-vector substrate is in a DIFFERENT repo — re-locate before invoking Gate 2 PoC
   - **Anchor**: FRAX V3 frxUSD H4 hypothesis assumed `frax-oft-upgradeable` had EIP-712 / TransferWithAuthorization surfaces; live grep returned ZERO; the surfaces live in `frax-tokens` (FrxUSD3 token-layer). H4 wasted ~5min clone + ~25min source-read before substrate-confusion FORECLOSURE. 5-channel Step 0.5 caught it post-clone; this 3a check catches it pre-clone.
   - **Cross-pollination targets**: any future LayerZero OFT / Wormhole NTT / CCT / Hyperlane Warp / similar wrapper-protocol Gate 1 → require 3a verification before Gate 2 dispatch on signature, upgrade, or access-control attack vectors.
4. **Inventory**: LOC, modules, entry functions, paired-function targets
5. **Apply ALL brain lenses from Step 2** — note candidate matches per file
6. **5-Target Quality Checklist (0xTeam Attacker's Mindset, Ogie msg 7519 — 2026-05-22 permanent)** — every Gate 1 surface map MUST touch all 5 target-classes. If any are missing, the surface map is incomplete and the Gate 1 fails its quality check:
   1. **Withdrawals / Redemptions** — CEI ordering, reentrancy, solvency invariants (Buzz: CANDIDATE-M + DC-1)
   2. **Liquidation + Oracle** — TWAP, staleness, circuit breakers, forced-liquidation paths (Buzz: CANDIDATE-O + Pattern E + DC-7)
   3. **Deposit / Mint Shares** — invariants, rounding, oracles, state-not-invalidated repeats (Buzz: CANDIDATE-I + CANDIDATE-K + DC-9 sub-4)
   4. **External Calls** — call/delegatecall/hook surfaces, upgradeable targets (Buzz: Pattern I + DC-9 sub-3 + CANDIDATE-M)
   5. **Admin / Upgrade** — timelock, multi-sig, access control, migration paths (Buzz: DC-9 full family + CANDIDATE-P pair)
7. **Check known issues / previous audits** — `audits-library/` + Cantina/Immunefi disclosed-findings if accessible — deduplicate
8. **Output**: `hunts/YYYY-MM-DD-<target>-gate1.md`
9. **Auto-index via hunt-complete.sh PostToolUse hook** (already wired)
10. **R8 Calibrated Reporting — claim-level evidence-grade tags (MANDATORY on Gate 2 findings, RECOMMENDED on Gate 1 surface map per claim)** — adopted from entropyvortex Meta-LLM Charter (Ogie msg 7555, 2026-05-22). Every individual claim in a Gate 2 finding and every load-bearing claim in a Gate 1 surface map MUST be tagged with exactly one of:
    - **`[EXECUTED]`** — bytecode verified, PoC run, on-chain confirmed (highest grade)
    - **`[INSPECTED]`** — source code read + logic traced, NOT run (code-confirmed only)
    - **`[ASSUMED]`** — inferred from architecture / surrounding context / documentation (NOT code-confirmed; explicit signal that the reporter is reasoning architecturally and may be wrong)

    Why: triagers (Immunefi / HackerOne / Sherlock / Cantina / direct-email) accept/reject partly on evidence-base confidence. Tagging short-circuits re-verification on `[EXECUTED]`, scopes the verification window on `[INSPECTED]`, and explicitly flags reasoning-gaps on `[ASSUMED]`. Honest grading improves first-pass acceptance.

    See `brain/External-Frameworks.md` for adoption record + convergence note.

---

## STEP 6 — CONTINUOUS

Every new program must be added to:

- `brain/Watchlist-Candidate-Crossmap.md` (or create if not present) — program × DC/CANDIDATE matrix
- The 30-repo watchlist if the program HEAD repo is GitHub-cloneable
- Standing intake protocol logbook: `hunts/intake-log.md` — one line per intake with date, target, profile result, queue decision

---

## ENFORCEMENT

- Skipping Step 2 (brain overlap) = blind triage = violation
- Skipping Step 5.2 (pre-flight scope-check) = repeat of Veda OOS error = violation
- Skipping Step 5.3 (bytecode-verify prep) = unverifiable finding = violation
- Skipping Step 5.6 (5-target quality checklist) = incomplete surface map = violation (Ogie msg 7519, 2026-05-22)
- Skipping Step 5.10 (R8 Calibrated Reporting tags on Gate 2 findings) = uncalibrated evidence base = violation (Ogie msg 7555, 2026-05-22)
- Bypassing Step 4 (queue decision surfacing) = unilateral pipeline reorder = violation

If unsure where a new program fits, run Steps 1-3 anyway and surface to War Room with the EV table. Operator decides the queue position.

---

## CANONICAL EXAMPLE (referenced 2026-05-21)

Coinbase Cantina program (Ogie surfaced via msg 7435 chain):

- **Step 1 PROFILE**: Cantina, $5M USDC cap, Tier 0 / Tier 1, established payer, multi-chain (Base + Ethereum mainnet)
- **Step 2 OVERLAP**: HIGH — DC-6 (cross-domain Base↔OP), DC-7 (Manager↔decoder analogue patterns), CANDIDATE-A (cross-chain bridge angles), CANDIDATE-L (multicall divergence)
- **Step 3 EV**: P(finding)=0.15, cap=$5M Tier 0 Critical, P(acc)=0.5, overlap=1.0 → **EV ~$375K**
- **Step 4 QUEUE**: HIGH overlap + $500K+ cap → **Immediate Gate 1** → completed 2026-05-21 03:55Z, Gate 2 queued as task #30
- **Step 5 GATE 1**: Filed at `hunts/2026-05-21-coinbase-cantina-gate1.md`

---

_Rule: standing-intake-protocol | v1.0 | 2026-05-21 (Ogie msg 7435 — Track B operator-gated submissions + Track A autonomous build, 6-step intake protocol permanent)_
