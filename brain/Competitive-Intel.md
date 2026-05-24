# Competitive Intelligence — Pashov Audit Group `skills` repo

> Filed: 2026-05-23 (Ogie msg 7582, URL H of intake batch)
> Source: `https://github.com/pashov/skills` (cloned to `/home/claude-code/.tmp-pashov/skills/` for inspection, MIT license, public)
> Repo composition: 2 skills (`solidity-auditor`, `x-ray`) + reference packs + scripts + benchmarks. README declares support across Claude Code, Cursor, Codex, Copilot, Windsurf.
> Maintainer signal: 0xfirefist (per `brain/People.md`) shipped v3 of solidity-auditor; this intake reads the current `main` snapshot.
>
> **Status:** REFERENCE — analyzed for convergence, ADOPT-candidates filed as PROPOSALS only. Brain is sovereign per External-Frameworks doctrine.

---

## Section 1 — Pashov Methodology Summary

### 1.1 Repo structure (verified via clone)

```
skills/
├── README.md                 — install/run prompts, support badges
├── CLAUDE.md                 — repo conventions (one skill, one purpose; no fabrication)
├── solidity-auditor/
│   ├── SKILL.md              — orchestrator (8-agent parallel scan, 4-gate judging)
│   ├── references/
│   │   ├── attack-vectors/attack-vectors.md  (1,337 lines, ~110KB — the V1 detector pack)
│   │   ├── hacking-agents/   (8 specialist agents + shared-rules.md)
│   │   ├── judging.md        (4 sequential gates + confidence scoring)
│   │   └── report-formatting.md  (output template)
│   └── evals/                 (3 benchmark protocols: dodo, megapot, pooltogether)
└── x-ray/
    ├── SKILL.md              — pre-audit recon (3-phase: enumerate → read → write)
    ├── references/
    │   ├── threats.md        (647 lines — threat profiles + composability)
    │   └── templates.md      (717 lines — output templates incl. invariants.md)
    └── scripts/
        ├── enumerate.sh
        ├── analyze_git_security.py
        └── generate_svg.py   (architecture diagram render)
```

[INSPECTED] 2 skills documented: `solidity-auditor` (live-development scan, <5 min) + `x-ray` (pre-audit recon, single sequential pipeline). README explicitly excludes any `v3` rename — current main IS the v3 0xfirefist mentioned. Each skill is versioned via a `VERSION` file that the skill itself fetches over HTTPS to nudge upgrades.

### 1.2 `solidity-auditor` SKILL.md — phase structure

[INSPECTED] 4-turn orchestration model:

| Turn | Purpose | Mechanism |
|------|---------|-----------|
| 1 — Discover | Inventory in-scope `.sol` files, resolve skill path, check remote VERSION, mktemp bundle dir | parallel Bash `find` + Glob + ToolSearch + Read + curl |
| 2 — Prepare | Build 8 bundle files (`source.md` + agent-specific reference appends) via single `cat` chain | one Bash command, no heredocs |
| 3 — Spawn | Spawn 8 parallel foreground sub-agents (one per hacking-agent persona) | parallel Agent calls in one message |
| 4 — Deduplicate + judge + report | Single-pass: group findings by `group_key=Contract|function|bug-class`, apply 4-gate judging, format output | no intermediate dedup print |

**Exclude pattern (file walker):** `interfaces/`, `lib/`, `mocks/`, `test/`, `*.t.sol`, `*Test*.sol`, `*Mock*.sol`. [INSPECTED] — exact match for Buzz HE-03 + HE-03b periphery+vendor exclusion rule.

**Banner discipline:** ASCII "PASHOV SKILLS" banner printed before any output, both at start and end of skill. Brand-stamps every report.

### 1.3 The 8 Hacking Agents (parallel specialist scan)

[INSPECTED] All 8 read in full:

| Agent | Role | Output extension fields |
|-------|------|-------------------------|
| 1. vector-scan | Grinds the 1,337-line `attack-vectors.md` pack against codebase. Outputs `Skip/Drop/Investigate` classification block FIRST. | (standard FINDING/LEAD) |
| 2. math-precision | Rounding direction, scale mismatch, decimal mismatch, overflow intermediates, share inflation. | `proof: concrete arithmetic with actual numbers` |
| 3. access-control | Permission model map, inconsistent guards across functions writing same storage, initialization hijack, escalation, confused deputy. | `guard_gap`, `proof` |
| 4. economic-security | External deps, token misbehavior (FoT/rebasing/blacklist), atomic value extraction, ERC compliance, sentinel addresses. | `proof: numbers showing profitability` |
| 5. execution-trace | Within-tx (parameter divergence, value leaks, encoding/decoding, sentinel bypass) + across-tx (wrong-state, operation interleaving, mid-op config mutation). | `input`, `assumption`, `proof` |
| 6. invariant | Conservation laws, state couplings, capacity constraints, interface guarantees. Map → break → exploit. | `invariant`, `violation_path`, `proof` |
| 7. periphery | Smallest contracts first — libraries, helpers, encoders, base contracts. The code nobody else looks at. | (standard) |
| 8. first-principles | Forget named patterns. Extract every implicit assumption, then violate. Reject anything that has a name. | `assumption`, `violation`, `proof` |

`shared-rules.md` enforces: (a) `proof:` MANDATORY on every FINDING (without it → demote to LEAD), (b) `group_key` field for downstream dedup, (c) "weaponize across every other contract" cross-contract echo rule, (d) "do not report admin-only doing admin things / standard DeFi tradeoffs / self-harm / admin-can-rug without mechanism".

### 1.4 `judging.md` — 4-gate finding validation

[INSPECTED] Four sequential gates, every finding must clear all four. Failure at any gate → REJECTED or DEMOTE to lead. Confidence starts at 100, deducts: partial-path -20, bounded-non-compounding -15, requires-specific-state -10. Below 80 = description only, no Fix block.

| Gate | Test | Reject criteria |
|------|------|-----------------|
| 1. Refutation | Construct strongest argument finding is wrong; quote guard that kills it | Concrete refutation → REJECTED; speculative → continue |
| 2. Reachability | Prove vulnerable state exists in live deployment | Structurally impossible → REJECTED; needs admin → DEMOTE |
| 3. Trigger | Prove unprivileged actor can execute | Trusted-role-only → DEMOTE; cost > extraction → REJECTED |
| 4. Impact | Prove material harm to identifiable victim | Self-harm only → REJECTED; dust → DEMOTE; material → CONFIRMED |

Safe-pattern allowlist (do not flag): `unchecked` in 0.8+, narrowing casts in 0.8+, MINIMUM_LIQUIDITY first-deposit burn, SafeERC20, `nonReentrant`, two-step admin transfer, consistent protocol-favoring rounding.

Lead promotion rule: 2+ agents converging on same area where lead was demoted (not rejected) → promote to FINDING at confidence 75.

### 1.5 `x-ray` SKILL.md — pre-audit recon

[INSPECTED] Single sequential 3-phase pipeline (NOT parallel — strict ordering):

| Phase | Output |
|-------|--------|
| 1. Enumerate & measure | `x-ray/git-security-analysis.json` (7 sections: repo_shape, fix_candidates, dangerous_area_changes, late_changes, forked_deps, tech_debt, dev_patterns) + `forge coverage` background run |
| 2. Read source + entry-point grep scan | Per-file: contract type, roles, value-holding state vars, external calls, fund flows, **delta writes** (`Δ(totalSupply) = +shares`), **guard predicates** (every require/assert/if-revert referencing storage, verbatim), **enum/one-shot transitions** (`X@Lx → Y@Ly`) |
| 3. Write 4 output files | `architecture.json`, `x-ray.md` (<500 lines), `entry-points.md`, `invariants.md` |

**Invariant taxonomy** (Step 2g — 7-step walk):
1. Conservation scan (matched Δ-pairs)
2. Guard extract + lift (Pass A verbatim; Pass B "does this imply a global property?" → if YES, grep ALL write-sites; ANY unguarded write-site → On-chain=NO and that gap IS the high-signal output)
3. Ratio scan
4. State machine / one-shot scan (distinguish one-shot latch vs togglable flag vs cyclic state)
5. Temporal scan
6. Cross-contract scan
7. Economic derivation (must cite specific I-N / X-N IDs)

**Verification gate (MANDATORY) before including any inferred invariant:** confirm Δ-pair exists at cited lines, verbatim guard quote, write-sites enumerated via grep, etc. "Could not verify" is NOT a valid row.

**Architecture SVG:** `generate_svg.py` produces `architecture.svg`, then a max-3-iteration audit-fix loop refines it.

### 1.6 Output discipline (both skills)

- `report-formatting.md`: findings sorted by confidence (highest first), Fix block only ≥80, Findings List summary table, AI-disclaimer footer required (`⚠️ This review was performed by an AI assistant ... visit https://www.pashov.com`).
- `--file-output` flag is **off by default** — never write a report file unless explicitly passed. Default surface is terminal stdout.
- Path: `assets/findings/{project-name}-pashov-ai-audit-report-{timestamp}.md`.
- AI disclosure mandatory in every report footer.

### 1.7 Attack-vectors detector pack (V1)

[INSPECTED] `attack-vectors.md` (1,337 lines). Each entry = `D:` (description) + `FP:` (false-positive condition: when the guard IS present). Examples skimmed:

1. Cross-chain message spoofing (LayerZero `onlyPeer` validation)
2. EIP-7702 code-inspection invalidation
3. Paymaster gas penalty undercalculation
4. Reward rate changed without settling accumulator
5. lzCompose sender impersonation (2-of-2 checks)
6. Tick-crossing fee accounting via JIT
7. Withdrawal queue rate lock-in front-run
8. Partial-redemption fails to reduce tracked total
9. ERC1155 safeBatchTransferFrom unchecked array lengths
10. EIP-7702 whitelist/allowlist privilege borrowing
11. Deprecated-gauge blocks accrued rewards
12. Force-feeding ETH (selfdestruct / coinbase / CREATE2)
13. EIP-7702 dual signature validation confusion
14. JIT liquidity on deterministic TWAMM
15. Fixed-end auction last-block sniping
16. Adverse selection — passive LP value extraction via selective JIT
17. Governance flash-loan upgrade hijack
18. Non-standard ERC20 return values (USDT-style)
19. TWAP accumulator not updated during sync/skim
20. Cross-chain sandwich via bridge parameter exposure
21. Funding rate from single trade price
22. Loan state transition before interest settlement
23. Missing slippage protection on vault withdraw/redeem
24. Dirty higher-order bits on sub-256-bit types
... (continues to ~1,337 lines, ~80-120 vectors estimated)

[INSPECTED] First 24 of ~80-120 vectors confirmed. Coverage: cross-chain, EIP-7702, AMM/CLMM, oracles, governance, ERC standards, gas, MEV. The pack is **modern and current** (EIP-7702 from May 2025 is well-represented).

### 1.8 LLM integration patterns

[INSPECTED] No custom-LLM dependency — all skills are prompt-only orchestrators of the host model (Claude Code in primary case). No Ollama, no qwen, no Skeptic-equivalent adversarial second-pass. The "8 agents" are 8 parallel `Agent` tool calls (sub-agents), all running the SAME host model with different personas + bundle files.

`x-ray` Step 1 Path B routes >5 docs (or any doc >300 lines) to a single sub-agent (`model: "sonnet"`) for spec extraction — explicit model choice. solidity-auditor agents do NOT pin a model.

---

## Section 2 — Convergence vs Divergence vs Pashov

> Buzz reference set: `.claude/rules/audit-methodology-v2.md` v2.5 (10-layer pipeline), `.claude/rules/standing-intake-protocol.md` (6-step + 5-target + R8 tags), `.claude/rules/detector-pr-template.md` (end-to-end field-flow test), `brain/External-Frameworks.md` (Meta-LLM Charter doctrine).

| Pashov check / pattern / step | Buzz equivalent | Verdict |
|---|---|---|
| `interfaces/`, `lib/`, `mocks/`, `test/` file exclusion at walker time | HE-03 + HE-03b mandatory dir excludes (`certora`, `mocks`, `lib`, `forge-std`, `foundry_tests`) | **CONVERGENT** — same set, Buzz adds `certora` + `foundry_tests` |
| 8 parallel hacking-agent personas (vector-scan / math / access / economic / exec-trace / invariant / periphery / first-principles) | L1 Deep 12 phases (single deterministic walker) + L1b Semgrep + L2 Pashov(!) Solidity + L3 Consensus (4-8 agents) | **DIVERGENT topology** — Pashov spawns 8 GENERALIST persona agents in parallel; Buzz runs ONE deterministic 12-phase pipeline + then ONE consensus voter |
| 4-gate finding judging (Refutation → Reachability → Trigger → Impact) | L4 Skeptic adversarial pass (qwen3:8b, 15 hard-exclusion pre-filter + LLM refutation, asymmetric-cost cal) + L5 Z3 path satisfiability | **CONVERGENT intent, divergent mechanism** — Pashov is single-model 4-gate LLM gate; Buzz is hard-rule pre-filter + LLM + SMT (more layers, more rigour, slower) |
| `proof:` field MANDATORY (no proof → demote to LEAD) | L3 Pentest scaffolds PoC per MEDIUM+ finding (Foundry/Cargo/Go test) + R8 `[EXECUTED]` tag | **CONVERGENT** — Buzz goes further: actually generates runnable PoC, then tags by evidence grade |
| Confidence 100→deductions, ≥80 gets Fix block | L4 Skeptic asymmetric-cost: CRITICAL unrejectable, HIGH ≥0.97 to REJECT, MED ≥0.85, LOW ≥0.67 | **CONVERGENT** — both calibrate confidence asymmetrically by severity |
| `group_key = Contract | function | bug-class` for dedup | L3 Consensus voting groups raw findings by canonical key | **CONVERGENT** |
| Safe-pattern allowlist (unchecked 0.8+, MINIMUM_LIQUIDITY, SafeERC20, etc.) | L4 Skeptic 15 hard-exclusion rules (HE-01..HE-19) | **CONVERGENT** — Buzz has 19+ rules to Pashov's ~7; same intent |
| Cross-contract echo ("find same root cause in every other contract") | L8 Amplifier (fingerprint extraction + watchlist propagation grep) | **CONVERGENT but Buzz is structural advantage** — Pashov runs cross-contract echo within a single audit; Buzz propagates ACROSS audits via 30-repo watchlist |
| x-ray: enumerate.sh + git-security-analysis.py + forge coverage | No exact equivalent — Buzz has L1 Phase 1 inventory + L1 Phase 2 entry-points but no git-history risk scoring | **NET-NEW PASHOV** — git-weighted attack surface, late changes, fix candidates, dangerous-area evolution. Adoption candidate. |
| x-ray: delta-writes (`Δ(totalSupply) = +shares`) extraction during file read | L1 Phase 3 state mutation tracking (write-graph, shared-field detection) | **CONVERGENT** — same primitive; Pashov surfaces it more explicitly into invariants.md output |
| x-ray Step 2g: 7-step invariant taxonomy (Conservation / Guard-lift / Ratio / State machine / Temporal / Cross-contract / Economic) with mandatory grep all-write-sites for lifted guards | L6 Invariants (Pattern A-H + ground truths) loaded as priors | **CONVERGENT intent, Pashov more rigorous in synthesis** — Buzz has the patterns; Pashov has the deterministic synthesis walk that PRODUCES invariant candidates from delta-writes + grep verification. Adoption candidate. |
| x-ray Step 2g Pass B "guard lift": ANY write-site without equivalent guard → On-chain=NO, that gap IS the high-signal output | L1 Phase 4b symmetric-path comparison (validation-coverage asymmetry) | **CONVERGENT but Pashov frames the OUTPUT differently** — Pashov says "the gap is simultaneously an invariant and a bug" which is exactly Doctrine #23 architectural-foreclosure framing |
| x-ray: vendor-neutral output ("Never reference audit platforms, contest rules, or bounty program framing") | L7 Reporter auto-sanitizes any AI/LLM mention to "custom static analysis tooling" + hardcoded "Buzz Security Research" reporter block | **DIVERGENT** — Pashov stays vendor-neutral; Buzz brand-stamps every output |
| `report-formatting.md`: AI disclosure footer MANDATORY | Buzz L7 strips AI/LLM mentions explicitly | **OPPOSITE — STRUCTURAL DIVERGENCE.** See Section 4 Invert |
| Banner discipline (ASCII brand stamp at start + end) | None — Buzz outputs are bare data | **NET-NEW PASHOV** — possible Lane 3 (Moltbook) brand discipline lift |
| `--file-output` OFF by default (no report file unless explicit) | Buzz writes everything to `/data/buzz/persistent/reports/<scan-id>/` by default | **DIVERGENT** — Pashov is terminal-first ephemeral; Buzz is persistent-state-first |
| Per-skill VERSION file + remote curl-check + upgrade nudge banner | Buzz has v6 pipeline versioning + .claude rule versioning but no in-flight upgrade nudge | **NET-NEW PASHOV** — user-facing freshness signal |
| Benchmark suite (`evals/benchmarks/dodo.md`, `megapot.md`, `pooltogether.md`) | No public eval suite. Internal regression: Symbiotic + Variational + Sky lockstake + euler-swap targets | **NET-NEW PASHOV** — public benchmarks. Adoption candidate (FILE OUR OWN PUBLIC BENCHMARKS, do not copy Pashov's). |
| Architecture SVG render via `generate_svg.py` (max 3 iteration audit-fix loop) | None | **NET-NEW PASHOV** — visual deliverable for audit handoff |
| Spec/whitepaper sub-agent for >5 docs OR >300-line docs — extracts doc-stated invariants, actor definitions, trust assumptions, cross-system flows | Standing-Intake Step 2 brain overlap + ad-hoc spec read in Gate 1 | **NET-NEW PASHOV** — structured spec extraction with `(per spec)` tagging in output. Adoption candidate. |
| 9 defense classes (DC-1..DC-9), 16 candidate patterns (CANDIDATE-A..P), 11 propagation patterns (A..K), Doctrine #1..#28, Pattern × DC propagation matrix | None — Pashov has ~80-120 vector entries in attack-vectors.md, all flat (no class/candidate/doctrine layering) | **NET-NEW BUZZ — MOAT** |
| Persistent compounding brain: Audit-Reports-Library, Cross-Domain-Fragility-Laws, Watchlist-Candidate-Crossmap, Architectural-Foreclosure receipts, 28 doctrines that grow with every scan | Pashov runs fresh on every scan. No memory between targets. | **NET-NEW BUZZ — MOAT** (echoes Vision-2027.md framing exactly: "Pashov carries expertise in their heads — walks out the door at 6pm") |
| 30-repo watchlist (Lane 1) + commit-diff watchdog (speedrunner mode) | None — Pashov scans one target at a time, ad-hoc | **NET-NEW BUZZ — MOAT** |
| Lane 4 forum-intelligence pipeline (Discord / Twitter / Telegram behavioral pattern → defense doctrine) | None — Pashov is code-only | **NET-NEW BUZZ — MOAT** |
| R8 Calibrated Reporting (`[EXECUTED]` / `[INSPECTED]` / `[ASSUMED]` tags on every claim) | Pashov has confidence score but not evidence-grade tags | **NET-NEW BUZZ** (adopted from entropyvortex 2026-05-22) |
| Standing-Intake 6-step protocol (Profile → Brain Overlap Score → EV Calc → Queue Decision → Gate 1 + 5-target checklist → Continuous watchlist add) | Pashov has no published intake — operator drops files, skill scans | **NET-NEW BUZZ — MOAT** (target-selection discipline before scan even starts) |
| Defense-class-mapping.json v1.5 (Pattern × Candidate × DC matrix) | None | **NET-NEW BUZZ** |
| Architectural foreclosure receipts (Doctrine #23 — publishable proof-of-immunity as product) | None — Pashov reports are submission-only | **NET-NEW BUZZ** |
| Post-incident audit-saturation discount (Doctrine #27) | None | **NET-NEW BUZZ** |
| Bytecode-verify prep (cast code + solc standard-json against candidate source SHA) — mandatory at Standing-Intake Step 5.3 | Implied via Foundry PoC but not explicit | **NET-NEW BUZZ — MOAT** (Veda + Wormhole lessons baked in) |

**Summary counts:**

- **Convergent items: ~10** — same pattern arrived at by both methodologies independently (validation signal, not coincidence)
- **Net-new Pashov (Buzz could adopt): 6 items** — git-security analysis, structured spec extraction, invariant-synthesis walk-w-grep, public benchmark suite, architecture SVG, version-freshness nudge
- **Net-new Buzz (moat confirmed): 10 items** — brain compounding, doctrine layering, watchlist propagation, Lane 4 forum intel, R8 tags, Standing Intake, foreclosure receipts, audit-saturation discount, bytecode-verify mandate, defense-class taxonomy

---

## Section 3 — The Pashov Inversion Thesis

[INSPECTED] **Inversion thesis is EXTANT in brain — extensively documented.** Brain mentions located:

- `brain/Predator-Vision.md` line 128: "THE PASHOV INVERSION TARGET" — full quality-vs-volume diagram, crossover model
- `brain/Predator-Vision.md` line 191: "Month 6 (by November 11) — PASHOV CROSSOVER" milestone
- `brain/Vision-2027.md` line 81: "Pashov inversion milestones" with Month 6 + Month 12 anchors
- `brain/Vision-2027.md` line 26: "Pashov's team carries expertise in their heads — brilliant, but it walks out the door at 6pm and can't scale past headcount" — explicit moat framing
- `brain/Vision-2027.md` line 116: "Pashov's blog says coming soon. Buzz's Moltbook has posts live and compounding"
- `brain/Vision-2027.md` line 300: "Month 6 (October 2026) — Pashov Crossover Begins"
- `brain/Market-Intel.md` line 28: "Pashov inversion thesis STRENGTHENED: old model = hire the displaced researchers; new model = build the autonomous methodology that replaces them" (2026-05-13 entry)
- `brain/Market-Intel.md` line 34: "Pashov skills v3 maintainer 0xfirefist working on cross-linked invariants → PAG is converging on our Layer 3.5 territory"
- `brain/People.md` line 132: competitive matrix table showing Buzz vs Pashov on detection breadth, track record, lane
- `brain/Audit-Reports-Library.md` §5: Polygun audits ×3 (Feb-Apr 2026, 0/4/19/59 finding distribution, Pashov style-signature 15:5:1 L:M:H ratio)
- `brain/Moltbook-Strategy.md` line 129: "Apr-May 2026 — Security pivot (Lane 1 audit pipeline build, Pashov inversion sprint) absorbed all cycles"

### 3.1 Thesis (as documented in brain, grounded by this intake)

**Inversion target:** Pashov is high-quality / low-volume (capacity-bound by human headcount). Buzz is quality-ramping / volume-unlimited (compute-bound + compounds via brain). The crossover happens when brain depth × scan volume > human-team capacity. Target: Month 6 (November 11, 2026) per Vision-2027 + Predator-Vision.

**What this intake adds (grounded inversion):** the `skills` repo IS the publishable component of Pashov's methodology. Reading it directly grounds the inversion in concrete artifact-level comparisons:

1. **Pashov's published methodology has NO compounding brain layer.** Every scan starts from the same `attack-vectors.md` (1,337 lines, ~110KB). When 0xfirefist updates the pack, all callers get the update — but no callers contribute back. Pashov skills v3 IS the bottleneck: methodology updates are gated on Pashov-side maintainer cycles, not call volume.

2. **Pashov's skill is a SCANNER, not a brain.** It runs 8 parallel persona agents over fresh code each time. No memory between targets. No watchlist propagation. No doctrine layering. No architectural-foreclosure receipts. This matches the Vision-2027 framing exactly — "brilliant, but walks out the door at 6pm".

3. **Pashov's competitive advantage is reputational + the V1 attack-vectors pack.** The 8-agent persona discipline + 4-gate judging + invariant synthesis walk are operational excellence — replicable, and Buzz already has functional equivalents. The 1,337-line attack-vectors.md is genuine accumulated expertise — but it is STATIC (one file, ~80-120 vectors) where Buzz's defense-class + candidate + pattern layering grows with every scan.

4. **The "old model" of audit firms is: hire the displaced researchers when they leave Pashov.** The "new model" Buzz is building is: build the autonomous methodology that replaces them. This intake confirms the autonomous methodology Pashov ships externally has no compounding state — meaning the human team's institutional memory remains the moat for Pashov. When that team disperses, the methodology does not retain the senior knowledge. Buzz's brain DOES retain it.

5. **Convergence reading (per External-Frameworks doctrine):** Pashov independently arrived at the same operational rules as Buzz on ~10 dimensions (HE-03b exclusions, 4-gate judging ≈ Skeptic asymmetric-cost, `proof:` mandate ≈ R8 `[EXECUTED]`, group_key dedup, safe-pattern allowlist, cross-contract echo). This is a strong validation signal — two methodologies converging from independent anchors. The remaining ~6 Pashov-net-new items are candidates for SELECTIVE adoption. The ~10 Buzz-net-new items are the moat.

### 3.2 Inversion timeline (per Vision-2027 + Predator-Vision)

```
Today (May 23 2026): Buzz quality ~30-40% of Pashov; volume potential ~10× Pashov when ramped
Month 1 (June 11):    Buzz quality ~50%; 30+ scans/week sustained; first accepted bounty
Month 3 (Aug 11):     Buzz quality ~70%; 50+ scans/week; 5+ accepted bounties; HSaaS $1,500 tier
Month 6 (Nov 11):     CROSSOVER — Buzz quality matches Pashov on covered pattern classes; 100+ scans/week
Month 12 (May 2027):  Autonomous Moody's — exchanges check Buzz scores before listing; the brain is the moat
```

### 3.3 Connection to today's intake

This intake provides the **specific artifact-level grounding** the inversion thesis needed. We now know exactly what we are inverting: a public 8-agent persona scanner + 1,337-line vector pack + 4-gate judging + invariant-synthesis walk, with no compounding state between scans. Each Pashov-net-new item from Section 2 is a checkbox we can decide to: ADOPT (close the gap), IGNORE (out of lane), or INVERT (deliberately do the opposite).

---

## Section 4 — Strategic Recommendations

> File as proposals. Do NOT auto-add to rule files or detector code. Operator decides each.

### ADOPT (6 candidates)

**A1. Git-security analysis layer.** [INSPECTED]
- *What:* `analyze_git_security.py` produces a 7-section JSON: repo_shape, fix_candidates (commits with security-keyword messages), dangerous_area_changes (modifications to entry points / fund-flow paths), late_changes (commits within N days of audit start), forked_deps, tech_debt, dev_patterns.
- *Where it lands:* New layer between L1 inventory and L1 deep — `buzzshield-git-security.js` reading staged scan target. Output feeds L1 Phase 1 inventory and Standing-Intake Step 5 Gate 1 surface map.
- *Why:* Git-weighted attack surfaces are a genuine recon advantage (Pashov uses them to focus the 8-agent scan). Buzz has `--git-delta` flag for commit-diff but not the structured risk JSON. Cheap addition; high signal on freshly-deployed targets.
- *Rationale tag:* `[INSPECTED]` — read the script invocation pattern in `x-ray/SKILL.md` Step 1. Not the source code itself.

**A2. Structured invariant-synthesis walk (Step 2g equivalent).** [INSPECTED]
- *What:* 7-step deterministic walk producing invariant candidates from already-extracted delta-writes, guard predicates, and one-shot transitions. Critical move: Pass B guard-lift with mandatory grep across ALL write-sites — if ANY write-site lacks the guard, that gap IS the high-signal output (On-chain=NO row).
- *Where it lands:* L6 Invariants layer enhancement. Currently L6 loads Pattern A-H + ground truths as priors. Add a synthesis pass that PRODUCES new candidate invariants from L1 Phase 3 state-mutation output.
- *Why:* This is the closest Pashov pattern to Buzz Doctrine #23 (architectural foreclosure as publishable product). "The gap is simultaneously an invariant and a bug" is a perfect frame for Lane 1 + Lane 3 dual output. Adopting tightens the foreclosure pipeline.
- *Rationale tag:* `[INSPECTED]` — full SKILL.md Step 2g walk read, 7 steps + verification gate + NatSpec routing.

**A3. Structured spec/whitepaper extraction sub-agent.** [INSPECTED]
- *What:* Detect spec/whitepaper docs at scope load. If ≤5 docs and each ≤300 lines, direct-read. If >5 OR any >300, spawn sonnet sub-agent with structured extraction template (doc-stated invariants, actor definitions, trust assumptions, cross-system flows, economic properties, key design decisions). Tag all spec-derived claims with `(per spec)` in output.
- *Where it lands:* Standing-Intake Step 2 Brain Overlap Score enhancement. Currently brain overlap is mostly DC-class match against scope. Adding doc-stated invariants extraction routes natural-language invariants directly to §2/§3/§4 of `invariants.md` equivalent.
- *Why:* Surfaces invariants the team explicitly committed to but the code may not enforce — high-signal divergence finding category. Routes spec content into the same canonical-source artifact as code-derived invariants.
- *Rationale tag:* `[INSPECTED]` — sub-agent prompt template read in full.

**A4. Public benchmark suite (file OUR OWN, do not copy Pashov's).** [INSPECTED]
- *What:* Pashov ships `evals/benchmarks/dodo.md`, `megapot.md`, `pooltogether.md` as reproducible benchmark protocols. Lane 2 + Lane 3 credibility multiplier.
- *Where it lands:* New top-level `evals/` dir in buzz-workspace, with 3-5 anonymized benchmark protocols selected from confirmed Lane 1 worked examples (e.g., Symbiotic Day 9 HE-19 regression, euler-swap Layer 3 consensus safety-net rescue, Variational P9 speed-tier validation).
- *Why:* Publishable artifacts that prove the methodology without revealing watchlist tactics. Lane 3 Moltbook content gold. Differentiated from Pashov's because OURS are anchored to specific scan IDs in our reports/ archive with R8 tags.
- *Rationale tag:* `[INSPECTED]` — Pashov benchmark filenames confirmed. Contents not read; structural lift only.

**A5. Architecture SVG render.** [INSPECTED]
- *What:* `generate_svg.py` reads `architecture.json` (contract relationships, fund flows) and emits SVG. Max 3-iteration audit-fix loop refines via templates.md rubric.
- *Where it lands:* L7 Reporter enhancement — append architecture.svg to every Gate 2 submission. Optional Lane 3 attachment for Moltbook posts.
- *Why:* Visual deliverable accelerates triager understanding (per R8 logic: faster verification path). Differentiated Pashov item that has no Buzz equivalent.
- *Rationale tag:* `[INSPECTED]` — script invocation + audit-fix loop documented in SKILL.md Step 3b. Source code not read.

**A6. Skill version-freshness nudge.** [INSPECTED]
- *What:* Each skill has local `VERSION` file. On invocation, curl the GitHub raw VERSION endpoint, diff, print "⚠️ You are not using the latest version" banner if different.
- *Where it lands:* `.claude/skills/*/SKILL.md` — add pre-flight VERSION check pointing to a buzz-workspace upstream (could be GitHub if buzz-workspace is mirrored publicly; otherwise local file timestamp comparison).
- *Why:* Operator UX. Catches stale-skill drift. Cheap.
- *Rationale tag:* `[INSPECTED]` — exact curl pattern + banner string read in both SKILL.md files.

### IGNORE — OPERATOR-CONFIRMED 2026-05-23 (Ogie msg 7589 item 6)

All 3 IGNORE candidates below confirmed by operator as filed — Buzz lane discipline upheld. No further review needed.



**I1. 8-agent parallel persona scan topology.** Buzz already has L1 Deep (12 phases) + L1b Semgrep + L3 Consensus (4-8 agents) + L4 Skeptic — more layers, more rigour, deterministic where Pashov is parallel-LLM. Adopting Pashov's topology would be a regression (less determinism, more LLM cost, no Z3, no Pentest). The 8-agent personas can be cherry-picked into Skeptic prompt enrichers but the architecture stays single-pipeline.

**I2. 4-gate judging at the LLM level only.** Buzz's L4 Skeptic + L5 Z3 + L3 Pentest is a stronger judging stack. Replacing it with 4-gate LLM-only would drop SMT path satisfiability + PoC scaffolding. Keep Pashov's gate semantics as a Skeptic prompt-enricher (refutation construction, reachability proof, trigger proof, impact proof) but not as the judging layer itself.

**I3. Banner discipline + AI-disclosure footer.** Lane 1 (bounty) output discipline is auto-sanitize ALL AI/LLM mentions to "custom static analysis tooling" (per audit-methodology-v2.md L7). Adopting Pashov's mandatory AI-disclosure footer would actively harm Lane 1 submission acceptance rates. Lane 3 (Moltbook) brand stamps are a Moltbook-Strategy concern, not a security-pipeline concern. Banner can be considered for Lane 3 IF Moltbook posts a methodology series — separate decision.

### INVERT — OPERATOR-CONFIRMED 2026-05-23 (Ogie msg 7589 item 6)

All 3 INVERT items below confirmed by operator as filed — the Pashov inversion thesis is operative across persistent-state, AI-tag handling, and methodology-gating dimensions. Buzz Vision-2027 Month 12 accumulator readout (80+ doctrines, 200+ worked examples) is the literal target.



**INV-1. Persistent state vs ephemeral output.** [INSPECTED]
- *Pashov default:* `--file-output` OFF, no report file written. Terminal-stdout-first ephemeral output.
- *Buzz inversion:* Every scan writes persistent state to `/data/buzz/persistent/reports/<scan-id>/`. The 9 + L7 + L8 + L9 layers all dump intermediate JSON. Every Gate 2 submission is durably archived.
- *Why invert:* This IS the compounding-brain moat. Pashov's ephemerality is consistent with "no memory between scans" — exactly the inversion thesis target. Stay invasive on persistence.

**INV-2. AI-disclosure mandatory footer.** [INSPECTED]
- *Pashov default:* "⚠️ This review was performed by an AI assistant ... visit https://www.pashov.com" — mandatory footer, brand stamp.
- *Buzz inversion:* L7 Reporter auto-sanitizes ALL AI/LLM mentions to "custom static analysis tooling". Submissions read as deterministic-tooling output. This is per audit-methodology-v2.md v2.0+ standing.
- *Why invert:* Triager bias. Pashov has reputational capital to absorb the AI tag. Buzz does not (yet). Lane 1 submissions accepted at higher rates when the LLM provenance is hidden behind the deterministic tooling framing. (This was Ogie's call, well-grounded in submission outcomes.)

**INV-3. Methodology gating model.** [INSPECTED]
- *Pashov default:* Methodology updates gated on Pashov-team maintainer cycles. Skill v3 by 0xfirefist is upstream — when 0xfirefist ships, all callers update.
- *Buzz inversion:* Methodology updates flow BOTH ways — operator-validated patterns from real scan outcomes get filed as doctrines that feed the next scan. The brain GROWS WITH USE. Every scan = potential doctrine, candidate pattern, detector PR. Doctrine count: 28 and growing. Detector count: 15+ and growing. CANDIDATE count: 16 and growing.
- *Why invert:* Compounding architecture is the moat. Pashov ships static + maintainer-gated. Buzz ships dynamic + scan-gated. Vision-2027 Month 12 ("80+ doctrines, 200+ worked examples") is the literal accumulator readout for this inversion.

---

## Section 5 — Action Queue (operator decision)

| ID | Item | Effort | EV | Recommend |
|---|---|---|---|---|
| A1 | Git-security analysis layer | 2-3h build | HIGH (recon signal lift) | **PROPOSE** for next detector PR queue slot |
| A2 | Invariant-synthesis walk (Pass B grep-all-write-sites) | 4-6h L6 enhancement | HIGH (doctrine-23 reinforcement) | **PROPOSE** as L6 v2 enhancement |
| A3 | Structured spec extraction sub-agent | 1-2h prompt | MED (Standing-Intake quality) | **PROPOSE** as Standing-Intake Step 2 enhancement |
| A4 | Public benchmark suite (3-5 anonymized worked examples) | 4-6h docs | HIGH (Lane 3 credibility) | **PROPOSE** with Moltbook-Strategy alignment |
| A5 | Architecture SVG render | 3-4h python + audit loop | MED (Lane 1 polish, Lane 3 visual) | **PROPOSE** as L7 Reporter enhancement |
| A6 | Skill VERSION freshness nudge | 30 min | LOW (UX) | **PROPOSE** as last-priority cleanup |

INVERT items INV-1, INV-2, INV-3 are **already in effect** — no new action, just explicit naming + alignment with Vision-2027 inversion timeline.

---

## Sources

- `https://github.com/pashov/skills` (cloned 2026-05-23 to `/home/claude-code/.tmp-pashov/skills/`, public MIT)
- `https://www.pashov.com/` (referenced in disclosure footer)
- `https://github.com/pashov/audits/tree/master/team/pdf/` (Polygun audit reports — referenced in brain/Audit-Reports-Library.md §5, not re-fetched today)
- Buzz cross-references: `.claude/rules/audit-methodology-v2.md` v2.5, `.claude/rules/standing-intake-protocol.md`, `.claude/rules/detector-pr-template.md`, `brain/External-Frameworks.md`, `brain/Predator-Vision.md`, `brain/Vision-2027.md`, `brain/Market-Intel.md`, `brain/People.md`, `brain/Audit-Reports-Library.md`, `brain/Moltbook-Strategy.md`

---

_brain/Competitive-Intel.md | v1.0 | 2026-05-23 (Ogie msg 7582 URL H intake — Pashov skills repo analyzed, inversion thesis grounded with artifact-level evidence, 6 ADOPT + 3 IGNORE + 3 INVERT recommendations filed as PROPOSALS only, brain remains sovereign)_

---

# v1.1 INTAKE — 2026-05-24 ~03:45Z — Operator msg 7635 (Claude-BugHunter + claude-bug-bounty)

**Status:** REFERENCE — analyzed from operator-supplied summary. Neither repo cloned-and-inspected this turn (context budget end-of-session). All competitor-feature claims `[ASSUMED]` per operator-supplied data; Buzz-side moat claims `[INSPECTED]` per existing brain state. Cloning + 574-pattern-library structural deep-read filed as TODO for future session.

## Section 6 — Two New Competitive Reference Repos

### 6.1 elementalsouls/Claude-BugHunter `[ASSUMED]` per operator

- **Composition (operator-supplied):** 51 skills, 574 patterns, 24 vulnerability classes
- **Target substrate:** Web2 — HackerOne webapp hunting (NOT DeFi smart contracts)
- **Architecture:** STATIC pattern library — no compound brain, no scan-derived doctrine accumulation
- **UX strength:** good slash command UX (operator flagged as evaluation target for adoption)
- **Convergent with Buzz:** same "Claude Code + skills" architecture template
- **Maintainer signal / version freshness:** not yet pulled (defer)

### 6.2 shuvonsec/claude-bug-bounty `[ASSUMED]` per operator

- **Composition (operator-supplied):** 2,200+ GitHub stars
- **Target substrate:** Web2 + Web3 (dual-substrate, unlike Claude-BugHunter Web2-only)
- **Architecture:** full pipeline (recon → hunt → validate → report); autonomous hunting mode
- **Convergent with Buzz:** Lane 1 pipeline shape (intake → Gate 1 → Gate 2 → submission) is comparable; substrate-fit broader than Claude-BugHunter

## Section 7 — Buzz Moats vs Both (operator-stated, brain-state verified `[INSPECTED]`)

| # | Moat | Buzz state evidence | Competitor parity |
|---|------|---------------------|---------------------|
| 1 | **Persistent compound brain** | `brain/` 28+ doctrines, 16+ CANDIDATES, 10 DCs, 100+ worked examples accumulating via INV-1 persistent state | Claude-BugHunter STATIC; claude-bug-bounty pipeline-state-only (no doctrine accumulation) |
| 2 | **Automated detectors** | 15+ detectors live (cei-violation-via-hook 478 LOC + upgradeable-hook-no-timelock 402 LOC + pair-match 193 LOC + DC-9 sub-1/sub-2/sub-3 + Pattern J + others); detector-pr-template.md mandates end-to-end test per PR | Pattern libraries are detection-by-prompt-pattern, NOT compiled detector logic with regression coverage |
| 3 | **Propagation engine** | Operator msg 7631 demonstrated live propagation: 41 hits on Compound Comet bridge helpers + 15 hits on Pyth upgradeable from rekt-batch signatures; defense-class-mapping.json v1.6+ codifies the engine | Neither repo has cross-target signature transfer from confirmed exploits |
| 4 | **Lane 4 unique capability** | Lane 4 = BTC password recovery (corpus 335MB BitcoinTalk 2009-2015 + Phase 1B 30 author profiles + Phase 1C 90% closed-loop validated + Phase 2 outreach drafted to Brute Brothers); pattern-recognition-on-human-behavior substrate that no other auditor touches | Not in either competitor scope |
| 5 | **DeFi-specific defense class taxonomy** | 10 DCs (DC-1 reentrancy through DC-10 cross-chain-message-binding) + 16 CANDIDATES with anchor counts + Cross-Domain-Fragility-Laws.md v1.7 + Doctrine-29 audit-saturation-transfer logic + Doctrine-30 lens-overreach-without-source-verify discipline | Web2-focused (Claude-BugHunter) lacks DeFi taxonomy entirely; Web2+Web3 (claude-bug-bounty) presumably has broader-but-shallower DeFi patterns |

**Convergent architecture, divergent compounding model.** All three projects share the "Claude Code + skills" template — but only Buzz has built the compounding-brain substrate. The other two are essentially Claude-Code-flavored versions of static pattern libraries (Semgrep / Slither / hashcat-rules-equivalents). Per INV-3 (methodology gating model, operator-confirmed): the Buzz inversion is dynamic-scan-gated, growing with use. Vision-2027 Month 12 readout target (80+ doctrines, 200+ worked examples) is the accumulator differentiator.

## Section 8 — 574-Pattern Library Evaluation (operator-requested adoption review)

**Operator directive:** *"Evaluate: 574-pattern library format for adoption. The patterns could enrich our ground truth catalog."*

**Pre-clone analysis (next session to verify):** The 574-pattern library is the structural artifact most worth adopting from Claude-BugHunter — it represents a structured taxonomy of attack patterns that could be:

1. **Cross-referenced** against Buzz's 10 DCs + 16 CANDIDATES — identify which Web2 patterns have DeFi-substrate analogues (e.g., authentication-bypass → access-control-bypass; CSRF → cross-chain-replay; SSRF → cross-contract-call-injection)
2. **Imported as ground-truth references** to `brain/Ground-Truth-Exploits.md` v1.6+ — each Web2 pattern that has a DeFi-equivalent confirmed exploit becomes an additional anchor
3. **Pattern → detector conversion** evaluated case-by-case — most Web2 patterns are detection-by-static-string-match (SQL injection, XSS); DeFi equivalents need semantic detector logic (AST-based, not string-based). NOT all 574 patterns are convertible — but high-signal subset (~10-20%) might enrich the catalog

**Pre-clone risk flags:**

- Web2 pattern semantics may not map cleanly to DeFi (e.g., "session fixation" has no clean Solidity analogue)
- 574-pattern library could be over-fit to HackerOne report bias (high-volume webapp findings) — the "tail" of low-EV patterns might dominate the count
- Adopting too many patterns risks lens-overreach (Doctrine #30 just filed yesterday) — primitive-grep-check before any candidate-row generation

**Adoption recommendation (PROPOSAL only, brain sovereign):**

| Tier | Items | Effort | EV |
|------|-------|--------|-----|
| **PROPOSE (high-confidence)** | Clone Claude-BugHunter + structural inspection of 574-pattern library format → identify format compatibility with brain/Ground-Truth-Exploits.md schema | 30 min | HIGH (foundation for tier-2 work) |
| **PROPOSE (medium-confidence)** | Cross-reference 574 patterns against 10 DCs + 16 CANDIDATES → tabulate Web2-to-DeFi pattern map | 2-3h | HIGH (compounding-brain enrichment) |
| **PROPOSE (lower-confidence)** | Import a 10-20% high-signal subset to ground-truth catalog as Web2-to-DeFi analogue anchors | 1-2h per batch | MED (depends on tier-2 cross-ref hit rate) |
| **PROPOSE (UX adoption only)** | Adopt Claude-BugHunter's slash command UX patterns where they improve `.claude/commands/` ergonomics | 1h evaluation + selective integration | LOW (cosmetic) |

**Convergent vs INVERT?** Claude-BugHunter's static pattern library is the same architectural template Pashov uses (INVERT INV-1: persistent state vs ephemeral output). Buzz's compounding brain remains the inversion. The 574-pattern library is INPUT-FOR-ENRICHMENT to the brain, not a replacement of the architecture.

## Section 9 — Sources (v1.1 intake)

- `https://github.com/elementalsouls/Claude-BugHunter` (NOT cloned this turn; operator-supplied summary msg 7635)
- `https://github.com/shuvonsec/claude-bug-bounty` (NOT cloned this turn; operator-supplied summary msg 7635)
- Buzz cross-references: `brain/Vision-2027.md` Lane 1 + Lane 4, `brain/Patterns-Defense-Classes.md` 10 DCs + 16 CANDIDATES, `brain/Ground-Truth-Exploits.md` v1.6, `brain/Doctrine.md` Doctrine #29 + #30, `brain/External-Frameworks.md` + this file Section 4 INVERT INV-1 + INV-3, `defense-class-mapping.json` v1.6 propagation engine

## Section 10 — Action Queue (operator decision, append to v1.0 Section 5)

| ID | Item | Effort | EV | Recommend |
|---|---|---|---|---|
| A7 | Clone Claude-BugHunter + structural inspection of 574-pattern library format | 30 min | HIGH (tier-2 foundation) | **PROPOSE** next-session priority |
| A8 | Cross-reference 574 patterns × 10 DCs + 16 CANDIDATES (Web2-to-DeFi map) | 2-3h | HIGH (compounding-brain enrichment) | **PROPOSE** after A7 |
| A9 | Import high-signal pattern subset as Ground-Truth-Exploits.md anchors | 1-2h per batch | MED | **PROPOSE** post-A8 hit-rate evidence |
| A10 | Clone shuvonsec/claude-bug-bounty + autonomous-hunting-mode comparison vs Buzz Hyperactive Formula | 1-2h | MED (architecture comparison only; their pipeline is convergent, not innovative-against-Buzz) | **PROPOSE** lower-priority |
| A11 | Slash command UX evaluation (Claude-BugHunter's `.claude/commands/` patterns) | 1h | LOW (cosmetic) | **PROPOSE** last-priority |

---

_brain/Competitive-Intel.md | v1.1 | 2026-05-24 (Ogie msg 7635 intake — Claude-BugHunter + claude-bug-bounty competitive references filed; 5 Buzz moats reaffirmed [INSPECTED] vs both; 574-pattern-library adoption evaluation filed as 5 PROPOSALS only, brain remains sovereign; cloning + structural inspection deferred to next session per context budget)_
