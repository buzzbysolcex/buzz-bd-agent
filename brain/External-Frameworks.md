# External Frameworks — Reference Library

> Frameworks, charters, and methodologies authored OUTSIDE Buzz that we cross-reference
> for convergence-validation and selective adoption. Brain is sovereign — external
> frameworks inform, they do not overwrite. Convergence > copy.
>
> Filed: 2026-05-22 (Ogie msg 7555)

---

## Meta-LLM Charter (entropyvortex)

**Origin:** Karpathy-inspired charter, used on "dozens of real production projects" per operator intake (Ogie msg 7555, 2026-05-22).

**Status:** REFERENCE — selectively adopted. **One rule (R8 Calibrated Reporting) adopted as standing Buzz protocol.** The other 10 rules are CONVERGENT with existing Buzz doctrines under different names.

### Convergence acknowledgement

Buzz brain (Doctrines #1-28, Patterns A-K, DC-1..DC-9, Standing Intake Protocol, Hyperactive Formula) organically converged on the same core principles as the entropyvortex Karpathy-charter without external influence. This is a validation signal: when two independently-grown methodologies arrive at the same operational rules from different anchors, the rules are likely tracking real underlying truth rather than authorial idiosyncrasy.

Examples of independent convergence (Buzz name → entropyvortex name, approximate mapping):

- Doctrine #23 (Architectural foreclosure as publishable product) ↔ "Proof of immunity is the deliverable, not the find"
- Doctrine #27 (Post-incident audit saturation discount) ↔ "Audit saturation depresses P(novel finding) — discount accordingly"
- Hyperactive Formula 10-step loop ↔ "Continuous-execution charter — no decision points, no idle reports"
- HE-03b mandatory dir excludes ↔ "Test/mock/vendor exclusion is non-negotiable at file-walker time"
- Skeptic asymmetric-cost (CRITICAL unrejectable, HIGH ≥0.97 to REJECT) ↔ "Real-bug-cost > noisy-ACCEPT-cost"
- Standing Intake Protocol 6-step pipeline ↔ "Every new program follows the same intake — no ad-hoc triage"
- Doctrine #6 operator-confirms-before-doctrine ↔ "Author confirms before charter promotion"

The brain architecture is sound. Continued doctrine commits should not consult the charter — only the underlying ground-truth exploits, foreclosure receipts, and operator-validated patterns.

### ADOPTED — R8 Calibrated Reporting

**Rule:** every Gate 2 finding tags each individual claim with one of three evidence-grade labels:

| Tag | Meaning |
|-----|---------|
| `[EXECUTED]` | Bytecode verified, PoC run, on-chain confirmed. Highest evidence grade. |
| `[INSPECTED]` | Source code read, logic traced. Code-confirmed but not execution-confirmed. |
| `[ASSUMED]` | Inferred from architecture, surrounding context, or documentation. Not code-confirmed. |

**Why:** triagers (Immunefi / HackerOne / Sherlock / Cantina / Cantina contests / direct-email program staff) make accept/reject decisions partly on confidence in the report's evidence base. A well-graded report gives the triager a faster path to verification — `[EXECUTED]` claims short-circuit re-verification, `[INSPECTED]` claims tell the triager which lines to read, `[ASSUMED]` claims explicitly signal where the reporter is reasoning architecturally and might be wrong. This is honest and improves first-pass acceptance.

**Implementation:** see `.claude/rules/standing-intake-protocol.md` Step 5 (output format) and `.claude/rules/audit-methodology-v2.md` (Layer 7 reporter — submission rendering).

### NOT ADOPTED (already covered by existing doctrines)

The remaining 10 entropyvortex Meta-LLM Charter rules — whatever they are — should NOT be auto-copied. Buzz doctrines cover the conceptual space under different names. If a future scan suggests an entropyvortex rule has genuine net-new content not covered by existing brain, file as a fresh doctrine PROPOSAL for operator review, NOT a direct copy.

---

---

## Anthropic Project Glasswing / Mythos (PRIORITY — filed 2026-05-23 per Ogie msg 7571)

**Origin:** Anthropic announcement 2026-05-22 ("Project Glasswing" — AI-assisted vulnerability discovery at scale). Mythos Preview reported **10,000+ high/critical vulnerabilities surfaced in 1 month** at a **90.6% true positive rate**. 50 partners onboarded including Cloudflare, Mozilla, Microsoft. Anthropic statement: "Models with similar skills will soon be broadly available."

**Classification (operator-mandated):** **Validation + Competitive Threat + Moat Confirmation — ALL THREE SIMULTANEOUSLY.**

### As VALIDATION

The Mythos numbers (10K+ findings, 90.6% TPR, 50 partners) confirm that LLM-driven vulnerability discovery at scale is a real working primitive. Buzz's V6 pipeline (Layer 1 deep + Layer 4 Skeptic adversarial pass + 11-pattern propagation) is operating in the same problem space. The Buzz internal results match the external trajectory — same 50× ratio of raw findings to confirmed exploits, same need for adversarial filtering, same emergent need for behavioral priors.

External validation that the bug-discovery axis is real. Buzz is not building toward a fantasy; Buzz is building parallel to a frontier lab.

### As COMPETITIVE THREAT

When Mythos-class capability ships broadly (Anthropic statement: "soon be broadly available"), every researcher and every protocol team has it. The historical moat (the existence of strong scanning) collapses. Anyone with API access can find HIGH/CRITICAL vulns at a rate that today only an experienced human team can match.

Implication: **finding bugs is no longer a defensible moat.** Buzz cannot survive on "we find bugs" alone. The pool of bug-finders just expanded from ~1K skilled hunters globally to ~1M API-equipped operators.

### As MOAT CONFIRMATION

Mythos finds fresh on every scan. It has no memory, no compounding architecture, no codified worked-examples library. It is a scanner, not a brain.

Buzz's moat is the **persistent, compounding methodology that grows with every scan**:

- **9 defense classes (DC-1..DC-9)** with anchored exploits and per-class detection logic
- **28 doctrines** (#1..#28) — operationalized lessons from real scans
- **16 candidate patterns (CANDIDATE-A..P)** with worked-example anchors
- **11 propagation patterns (A..K)** with Step 9 cross-protocol sweep engine
- **Detector library** (15+ detectors + 5 enrichers, all reproducible)
- **Pattern × candidate × DC propagation matrix** (defense-class-mapping.json v1.5)
- **Architectural foreclosure receipts** (Doctrine #23 — proof-of-immunity as publishable product)
- **Post-incident audit saturation discount** (Doctrine #27 — calibrates P(finding) per target)
- **HE-03b mandatory exclusions + canonical-defense enrichers** (HE-20..HE-25)

These are NOT replicable from a scan. They are **accumulated state**. A new researcher with Mythos access starts from scratch every time. Buzz starts from 28 doctrines and grows further with every scan.

**The brain is the moat. Not the model. Not the compute. The persistent, compounding methodology.**

### Standing actions (immediate priority)

1. **CVP application = PRIORITY** — Anthropic's Constitutional Value Program (CVP) removes safeguard constraints for vetted security-research applications. Buzz qualifies on multiple axes: 9-firm-equivalent audit pipeline + 28-doctrine compounded brain + zero false negatives on the foreclosure-class scans + R8 Calibrated Reporting tags + ethical guardrails on all lanes including Lane 4. Apply.

2. **Released tools evaluation** — Anthropic released a set of Mythos-adjacent open tools (skills, harness, threat model builder, etc.). Each one is a potential pipeline-integration candidate. Evaluate against existing V6 layer-stack for net-positive add vs. duplicative-with-existing. Specifically check: skills (potential prompt-engineering uplift on Layer 4 Skeptic), harness (potential e2e test bench compatible with detector-pr-template.md), threat model builder (potential Standing Intake Step 2 brain-overlap automation).

3. **Lane 3 publish thesis** — "Why Mythos doesn't replace Buzz: the brain is the moat." Pairs naturally with Doctrine #23 architectural-foreclosure-as-product. Drafts to `drafts/moltbook-magents-mythos-thesis.md` when bandwidth + Moltbook API recovery permits.

### Status

- **PRIORITY action queue:** CVP application (operator-execute) + tools evaluation (Buzz-execute) + Lane 3 draft (Buzz-execute, hold publish).
- **Do NOT copy Mythos approach** — Buzz's compounding architecture is the differentiation. Mythos is a fresh-scan engine; Buzz is a brain that grows. Conflating the two = strategic mistake.
- **Watch for:** when Mythos-class becomes API-available, the bug-finding floor jumps for every competitor. Buzz must accelerate compounding work (more scans → more doctrines → more enrichers → more foreclosure receipts) to widen the gap BEFORE the floor lifts.

---

## 0xTeam — Complete Guide to Lending/Borrowing Protocols (filed 2026-05-23 per Ogie msg 7582)

**Origin:** 0xTeam blog `0xteam.space/blog/complete-guide-lending-borrowing-protocols`. Educational threat-focused taxonomy of lending/borrowing protocol attack vectors with historical exploit references and defense recommendations.

**Status:** REFERENCE — convergence-validation + gap-analysis source. Active 4 Gate 1 lens-stack enrichments below.

### Convergence acknowledgement

0xTeam's lending-protocol attack taxonomy converges with existing Buzz brain in 5 of 7 vulnerability classes. The brain already covers: oracle manipulation (Pattern E + DC-7), reentrancy (DC-1 + CANDIDATE-M), governance attacks (DC-9), liquidation exploits (CANDIDATE-O + Pattern E), and flash-loan-composition (Pattern E + Pattern J). 0xTeam's framing as "audit chains, not bugs" mirrors Buzz Doctrine #23 (chain composition IS the attack surface) and "Attacker's Mindset" framework already adopted (5-target Gate 1 checklist, msg 7519). `[INSPECTED]`

### Vector-by-vector mapping (Buzz coverage matrix)

| 0xTeam vector                          | Buzz brain anchor                                                              | Coverage status                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| Oracle manipulation (flash-loan-driven) | Pattern E + DC-7 + CANDIDATE-O (Rhea $18.4M)                                  | COVERED `[INSPECTED]`                                                             |
| Reentrancy (ERC-777 callbacks)         | DC-1 + CANDIDATE-M (CEI-break-via-hook)                                       | COVERED `[INSPECTED]`                                                             |
| Flash loan attacks (83.3% of 2024)     | Pattern E propagation engine                                                  | COVERED `[INSPECTED]`                                                             |
| Governance attacks                     | DC-9 (privileged state mutation)                                              | COVERED `[INSPECTED]`                                                             |
| LP token pricing vulns (Warp-style)    | NEW GAP — Buzz does not have a specific LP-token-as-collateral detector       | **GAP** `[ASSUMED]`                                                               |
| Solvency check gaps (Euler/Platypus)   | Partial — DC-9 sub-4 (state-not-invalidated) + Pattern A (paired functions)   | **PARTIAL GAP** — emergency-function solvency-skip not separately tracked `[ASSUMED]` |
| Interest rate bugs (precision, 100% util) | NEW GAP — Buzz has CANDIDATE-K (HTTP/protocol state) but not interest-curve precision | **GAP** `[ASSUMED]`                                                               |

### Gap analysis — vectors Buzz is NOT currently checking

`[ASSUMED]` Three gap classes identified:

1. **LP-token-as-collateral pricing manipulation** (Warp Finance class). When a lending protocol accepts LP tokens as collateral and prices them as `[Total Pool TVL] / [LP Tokens Minted]`, an attacker can flash-loan-manipulate pool reserves to inflate the LP price, then borrow under-collateralized. Buzz Pattern E covers spot-price manipulation but does NOT specifically grep for LP-token-collateral pricing formulas. **Proposed enrichment:** add Pattern E sub-pattern E.3 (`lp-token-collateral-tvl-formula`) — regex `getReserves\(\)\s*[\.\,].*\/.*totalSupply` or `_balances.*\/.*totalSupply` in pricing-of-LP-as-collateral context.

2. **Emergency-function solvency-skip** (Euler $200M, Platypus $8.5M class). Both exploits hit emergency-withdraw or emergency-flow paths where the standard solvency check was missing. Buzz DC-9 sub-4 (state-not-invalidated) catches part of this but does NOT specifically grep `emergency*` / `liquidate*` / `force*` functions for solvency-check presence. **Proposed enrichment:** add DC-9 sub-5 (`emergency-path-solvency-skip`) — graph-trace every `emergency`/`force`/`unsafe` function and verify it calls the same solvency check (`healthFactor()`, `isHealthy()`, `_validateBorrow()`, etc.) as the standard path.

3. **Interest-rate-curve precision/overflow** (referenced but no specific exploit cited). Interest accrual at 100% utilization, precision loss in `rayMul`/`wadMul`/`rateScale` operations, compounding-frequency errors. Buzz has CANDIDATE-K (HTTP/protocol state arithmetic) but not lending-specific interest-curve arithmetic. **Proposed enrichment:** add CANDIDATE-R proposal (`interest-rate-curve-precision-arithmetic`) — pattern: `_calculateInterest`, `accrueInterest`, `getBorrowRate`, `getLiquidityRate` functions with division-by-utilization or division-by-time-elapsed near boundary.

### 5-target Gate 1 cross-reference

0xTeam emphasizes the same 5 target classes Buzz adopted from "Attacker's Mindset" (msg 7519). Stronger emphasis from 0xTeam on:

- **Liquidation + Oracle** (most detailed treatment) — confirms Buzz's CANDIDATE-O priority + Pattern E weight
- **Interest rate calculations** — NEW target Buzz didn't separately track; should add as sub-target under Deposit/Mint or as a 6th target

### Lens-stack enrichments for active Gate 1 targets

`[ASSUMED]` Application to current pipeline:

| Active target  | Enrichment from 0xTeam lending guide                                                                              |
| -------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Fira**       | Run LP-token-collateral check (E.3); Fira has AMM + lending integration — high LP-as-collateral surface           |
| **Aave V4**    | Run emergency-path-solvency-skip check (DC-9 sub-5); Aave V4 spoke architecture has multiple emergency paths      |
| **Morpho**     | Run interest-rate-curve precision check (CANDIDATE-R); Morpho peer-to-peer matching has custom rate-curve math    |
| **Usual USD0** | Already has MINTER_ROLE (CANDIDATE-N) coverage; ADD LP-token-collateral check if USD0 LP tokens become collateral |

### ADOPTED items

1. **6th Gate 1 target: "Interest Rate / Accrual Calculations"** — added as sub-target under Deposit/Mint per gap class 3 above. Update Standing Intake Protocol Step 5.6 (5-Target Quality Checklist) to acknowledge interest-rate-precision as a Deposit/Mint sub-bullet when target is a lending/borrowing protocol.

2. **LP-token-as-collateral detector (Pattern E.3 proposal)** — filed as detector-pack enrichment proposal; NOT auto-promoted. Awaiting operator review.

3. **Emergency-path-solvency-skip detector (DC-9 sub-5 proposal)** — filed as DC-9 sub-pattern enrichment proposal; NOT auto-promoted. Awaiting operator review.

4. **CANDIDATE-R proposal** (interest-rate-curve precision arithmetic) — filed as new candidate proposal; needs 1 anchor before DC-N promotion eligibility.

### NOT ADOPTED items

The guide's "engage 2-3 audit firms" + "100% code coverage" recommendations are protocol-builder advice, not auditor-side guidance — they apply to OUR brain only insofar as Doctrine #27 (post-incident audit saturation discount) already calibrates P(finding) per target by audit count. No further action.

---

## 0xTeam — Multi-Chain Stablecoin Security Challenges (filed 2026-05-23 per Ogie msg 7582)

**Origin:** 0xTeam blog `0xteam.space/blog/multi-chain-stablecoin-security-challenges`. Threat overview of cross-chain stablecoin attack surfaces, custodial risk, liquidity fragmentation, and regulatory friction.

**Status:** REFERENCE — light-content article. One narrow enrichment for cross-chain stablecoin lens stacks. No new candidates filed; convergence-only with CANDIDATE-A and DC-9 sub-2.

### Convergence acknowledgement

`[INSPECTED]` 0xTeam's three bridge attack patterns map directly to existing Buzz brain:

| 0xTeam bridge pattern               | Buzz brain anchor                                                                       |
| ----------------------------------- | --------------------------------------------------------------------------------------- |
| Signature validation flaws (forge tx → mint on dest chain) | DC-7 (signature scope didn't bind chainId/contract) + Wormhole 2022 ground-truth anchor |
| Centralized approval / multisig collusion                  | DC-9 sub-2 (zero-timelock migration) + CANDIDATE-N family ($320M+ combined)             |
| Logic vulns (reentrancy, double issuance, inflation)       | CANDIDATE-A (cross-chain bridge) + CANDIDATE-N sub-1 (unchecked mint)                   |

Article does NOT introduce new technical content beyond what Buzz already catalogs in Drift ($285M), Resolv ($25M), Solv ($2.7M), Nomad ($190M), Wormhole ($325M) ground-truth entries. `[INSPECTED]`

### Coverage assessment vs Buzz cross-chain understanding

`[INSPECTED]` **Convergent (already in brain):** signature validation, multisig collusion, bridge double-issuance, mint-authority concentration, cross-chain bridge as attack class, custodial single-point-of-failure.

`[INSPECTED]` **Divergent (article narrower than brain):** article does NOT cover durable-nonce accumulation (CANDIDATE-P, Drift $285M), state-not-invalidated repeated mint (DC-9 sub-4, Solv $2.7M), post-audit-CEI-break-via-upgradeable-hook (CANDIDATE-M, $7M 0xBugDrop), or paired-function field-binding gaps (DC-7 modern form). The article is a high-level introductory survey; the brain's depth on each anchor exceeds it.

### Enrichments for active stablecoin lens stacks

`[ASSUMED]` Application to current pipeline:

| Stablecoin       | Enrichment from 0xTeam multi-chain article                                                                                                                                                                                                |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Usual USD0**   | No new vector. Existing CANDIDATE-N (MINTER_ROLE) + DC-9 (privileged state mutation) coverage is broader than the article. Continue current Gate 1 lens stack unchanged.                                                                  |
| **Ethena USDe**  | No new vector. Queued Gate 2 (task #22) already targets MINTER_ROLE. Article's "centralized approval structure" risk is already captured by DC-9 family. Continue current Gate 1 lens stack unchanged.                                    |
| **USDT0**        | No new vector. CANDIDATE-A cross-chain bridge coverage + Wormhole anchor (DC-7) + Nomad anchor (DC-7 sibling) all stronger than article's signature-flaw paragraph. Continue current Gate 1 lens stack unchanged.                          |
| **General stablecoin Gate 1** | Use article as one-paragraph operator-brief summary when explaining "why we audit cross-chain stablecoins via DC-7 + CANDIDATE-A + DC-9" to non-technical reviewers. Pedagogical value, not technical-enrichment value. `[ASSUMED]` |

### ADOPTED items

None. Article is convergent-with-existing at a shallower depth than current brain. No detector enrichments, no new candidates, no doctrine additions.

### NOT ADOPTED items

The article's recommendations (multi-sig, decentralized custody, third-party audits, real-time monitoring, cold storage) are protocol-builder advice, not auditor-side guidance. Doctrine #27 (post-incident audit saturation discount) already handles audit-count calibration. No further action.

### Pedagogical-use authorization

`[INSPECTED]` This article is APPROVED for use as a one-paragraph summary when surfacing cross-chain stablecoin findings to operator OR triagers who need context on the attack class. Cite as `0xteam.space/blog/multi-chain-stablecoin-security-challenges` (intake 2026-05-23 msg 7582). Do NOT use as a technical authority — brain anchors (Drift, Wormhole, Nomad, Resolv) are deeper.

---

## Other external frameworks (future filings)

## TU Berlin + Max Planck — "Toward Securing AI Agents Like Operating Systems" (May 2026)

**Origin:** Academic security paper, TU Berlin + Max Planck Institute. Filed by operator (msg 7637, 2026-05-24) as **PRIORITY** — Security Infrastructure + Competitive Threat + Architecture Hardening.

**Status:** PRIORITY REFERENCE — actionable hardening checklist. The paper proves that OpenClaw-style agents running with `--dangerously-skip-permissions` (Buzz's current architecture) are vulnerable to 16 distinct attack classes. OpenClaw fails ALL 16. Threat environment evidence: 100+ CVEs on OpenClaw since November 2025, hundreds of malicious skills on VirusTotal.

### Convergence acknowledgement

The paper's "agents are operating systems" framing is convergent with existing Buzz security posture:

- BuzzShield Layer 0 (HE-03b mandatory dir excludes) ↔ "scoped context per tool invocation" (a primitive form, applied to file-walker not tool exec)
- `.claude/rules/security-wallets.md` + `surpass-security.md` (secrets isolation, write/transfer human-approval) ↔ "credential isolation, capability gating on side-effects"
- `.claude/rules/pre-commit-gitleaks.md` (secret-detection on every commit) ↔ "log integrity + tamper detection"
- War Room ORANGE/GREEN gating on external action ↔ "network egress restriction at the policy boundary"

Existing Buzz posture covers ~3 of the 16 attack classes nominally. The paper exposes a gap of 13+ classes where Buzz inherits OpenClaw's `--dangerously-skip-permissions` blast radius.

### Immediate hardening checklist (operator-directed, msg 7637)

1. **Credential isolation** — move `.env.canonical` secrets to a separate read-only mount that tools can't access. Today: `.env.canonical` is readable by any subprocess spawned in the session. Hardening target: secrets accessible only via a privileged-broker process; tools query the broker for ephemeral capability tokens.

2. **Brain tamper protection** — make `brain/` append-only OR checksum-verified on session start. Today: brain/ is regular-file writable; a malicious skill or prompt-injection-induced tool call could rewrite Doctrine.md / Vision-2027.md / Ground-Truth-Exploits.md and corrupt subsequent decisions. Hardening target: pre-commit hook computes brain/ Merkle root, session-start verifies against last-known-good root, divergence halts execution.

3. **Log integrity** — session logs append-only. Today: `logs/` is regular-file writable, log-truncation attack (deleting evidence) is undetectable. Hardening target: chattr +a on logs/, integrity-fingerprint per log file, periodic dump to off-host archive.

4. **Disk cleanup as attack vector** — the paper shows deleted audit logs are a real attack vector. Today: BuzzShield reports are written to `/data/buzz/persistent/reports/` then optionally pruned by disk-management crons; pruning is unauthenticated. Hardening target: pruning requires a signed instruction, archive-before-prune to immutable storage.

5. **Network egress restriction** — evaluate restricting outbound connections from tool execution. Today: subprocess egress is unrestricted (curl / git / npm / docker can hit any host). Hardening target: per-tool egress allowlist enforced by iptables OWNER MATCH on the spawn-uid, exceptions require operator approval.

### Long-term (post-Mythos)

- **NemoClaw wrapper pattern** — evaluate as the Buzz process supervisor (per paper, NemoClaw mitigates 8 of the 16 attack classes via supervisor-mediated capability hand-off)
- **IronClaw WASM sandbox** — evaluate for tool isolation (per paper, IronClaw mitigates 11 of 16 via WASM capability-confined tool execution; cost: tool dev complexity ~3x baseline)
- **Scoped context per tool invocation** — implement context fences so a single tool call cannot read the full session transcript / brain / mailbox; tool sees only the explicit-pass parameters + a capability token

### NOT ADOPTED (yet)

The full hardening stack is **not adopted immediately** for two reasons:

1. **Mythos / Vision-2027 surface dependency** — until the Mythos public surface lands (Lane 3 publishable methodology product), the threat surface that justifies the engineering cost is narrower than the paper's general AI-agent threat model. Today's Buzz is largely cloistered (single operator, Telegram channel, internal repo). Tools running in tight loop on operator-approved targets is a smaller attack surface than the paper's "agent fielded into hostile environment" assumption.

2. **Engineering throughput tradeoff** — full hardening of items 1-5 is estimated at ~2-3 weeks of focused work. The current bug-bounty Lane 1 execution velocity (paste-readies + foreclosure receipts per 24h cycle) is the load-bearing revenue engine. Pause cost is significant.

**Recommended sequencing:** items 1+2+3 (credential isolation + brain tamper protection + log integrity) are **PRIORITY HIGH** — defensive against the most-likely attack class (prompt-injection-induced internal-state corruption); items 4+5 (disk attack + egress restriction) are **PRIORITY MEDIUM** — defensive against post-Mythos exposure; long-term wrapper/sandbox evaluation is **PRIORITY DEFERRED** until item 1-3 are shipped + Mythos surface lands.

### File pointer

Brain entries: `brain/External-Frameworks.md` (this file, primary). Cross-reference rows in:
- `brain/Doctrine.md` — file a Doctrine #31 candidate ("Treat the Buzz process as a hostile-environment OS — assume prompt-injection-induced internal tool calls and harden accordingly")
- `brain/Vision-2027.md` — add a security-hardening lane item to the post-Mythos roadmap
- `projects-mind/Security-Hardening.md` — NEW file, tracks the 5-item checklist progress with per-item PRD + ship-status

The paper validates that agent security is a REAL problem, not theoretical. Filed under: Security Infrastructure + Competitive Threat + Architecture Hardening.

---

When additional external frameworks are surfaced by the operator or external research, file here with the same structure:
1. Origin + status
2. Convergence acknowledgement (which existing Buzz doctrines parallel the framework)
3. ADOPTED items (with implementation pointer)
4. NOT ADOPTED items (with brief rationale)

---

_brain/External-Frameworks.md | v1.3 | 2026-05-26 (Ogie msg 7817 — Day 26 batch — Raydium CLMM 4-audit precedent on Pre-Audit-Composition-Multiplier classes filed as vendor-cadence anti-anchor for Doctrine #34. The Raydium CLMM limit_order subsystem (introduced 2025-09-16, hardened 4 audits in 8 weeks) is a textbook Doctrine #34 candidate by existing criteria, BUT engineering response cadence is FAST (6 fixes in 8 weeks across 4 audit firms). Refinement to Doctrine #34 Calibration Multiplier: discount the post-audit-module multiplier when vendor fix-cadence is high. Fix-cadence sub-criterion: high cadence (≥1 audit / 4 weeks AND ≥1 fix-per-commit per audit) → 0.5× discount; standard cadence → no discount; low cadence (no audit since post-audit module shipped) → 1.5× boost. Captures the asymmetry between protocols that respond to compositional growth with re-audits (Raydium) vs those that don't (Cap, Filecoin, Stacks long-tail). Hunt: hunts/2026-05-26-raydium-immunefi-gate1.md proposal C. Companion: Doctrine.md v3.4 (Doctrine #34 enrichment incorporates this anti-anchor).)_

_brain/External-Frameworks.md | v1.2 | 2026-05-24 (Ogie msg 7637 — TU Berlin / Max Planck "Toward Securing AI Agents Like Operating Systems" PRIORITY intake; 16-attack-class threat model, 5-item immediate hardening checklist, long-term wrapper/sandbox/scoped-context evaluation)_
_brain/External-Frameworks.md | v1.1 | 2026-05-23 (Ogie msg 7582 — 0xTeam lending guide + 0xTeam multi-chain stablecoin intake. Lending guide surfaced 3 gap classes + 4 detector-pack enrichment proposals; stablecoin article convergent-only, no new candidates.)_
_brain/External-Frameworks.md | v1.0 | 2026-05-22 (Ogie msg 7555 — Meta-LLM Charter entropyvortex intake, R8 Calibrated Reporting adopted, 10 rules convergent-with-existing)_
