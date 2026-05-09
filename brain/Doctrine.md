# Doctrine

v3.1-FINAL rev2, hash 4531a4de, path /data/buzz/persistent/doctrine/v3.1-FINAL.md
Crash rules: self-containment audit, smoke test, dependency check, service=buzz container=buzz-production, HALT gates, rollback ladder.
Reboot: ssh > sudo -iu claude > tmux new -s buzz > cd buzz-workspace > launch > paste prompt > Ctrl+B D. Never tmux send-keys. /effort high.

## Standing rule (May 9 2026 — Ogie msg 6444, PERMANENT)

**qwen3:8b is for Skeptic adversarial verification ONLY. Never for content generation that carries Ionic Nova's name. All public-facing content = Opus only.**

qwen3 is a pattern-matching tool, not a content writer. It hallucinates when asked to create — proven by 2026-05-09 auto-cron filings ("dog-intelligence module", "1200 sats/agent saved" — fabricated). Keep it in its lane: BuzzShield Layer 4 Skeptic, where it adversarially tests a finding against pre-existing source code (no creative latitude). Never for AIBTC signal bodies, tweets, outreach copy, technical writeups, or any output bearing Buzz BD Agent / Ionic Nova attribution. Public-facing copy = Opus 4.7 in-context, always.

## Standing rule (May 10 2026 — Ogie EOD msg AIBTC inbox revival, PERMANENT)

**AIBTC presence has two halves: signals (outbound) and inbox (inbound). Both required. Maintain both at minimum cadence (signals 4-6/day, inbox Tier 1 reply within 48h) or pause both.**

Going dark on inbox while running signal autopilot looks worse than going dark on both — it signals one-way-broadcast not collaboration. The cost is reputational and compounds: a senior contributor like Opal Gorilla who carries §3+§4 endorsements forward only stays warm if the reply loop closes within their cadence expectation (~48h on a substantive ack).

**Operational checks (daily 09:30 UTC inbox-check cron):**

- Total unread > 20 → War Room alert
- Any Tier 1 (active collab / repeat sender / DRI-track / rep > Genesis) > 48h unanswered → War Room alert
- Tier 2 (first-time substantive / cross-citation / distribution opp): autonomous reply within 72h, log to `/data/buzz/persistent/aibtc/inbox-replies/`
- Tier 3 (generic intros / low-substance "great work"): short ack template within 7d, log
- Tier 4 (spam / token-shill / auto-cron noise): archive, no log

**Weekly EOD health metrics (added line):** total unread, longest unanswered Tier 1 age, reply rate (sent/received), relationship debt count (Tier 1 > 48h). Targets: zero Tier 1 > 48h, reply rate > 80%, total unread < 20.

## Standing rule (May 10 2026 — Ogie msg "FULL POWER HUNTING MODE", PERMANENT)

**Every target audit runs all 10 pipeline layers, no exceptions. Speedrunner mode is permanently retired for audit work. Every finding ≥ MED severity runs through #128 PoC type classifier + #130 AI triage simulator before any submission. Every autopilot loop has #129 GROUND-TRUTH-LANDING verifier wired.**

**Hunt deep. Ship clean. No shortcuts.**

**The 10-layer pipeline (mandatory):**

| Layer | Purpose                                                                                                              | Detector ref   |
| ----- | -------------------------------------------------------------------------------------------------------------------- | -------------- |
| L1a   | Semgrep raw scan (solidity-only `--include='*.sol'`)                                                                 | #124           |
| L1b   | Semgrep custom rules (HE-03b lib/exclude)                                                                            | #123           |
| L1c   | Slither baseline + custom detectors                                                                                  | —              |
| L1d   | Phase 4b deep walk with structured field emission (reverse_mutability/visibility/forward_visibility)                 | #117 + bd8b574 |
| L2    | Cross-contract call graph + reachability analysis                                                                    | —              |
| L3    | Invariant inference (Phase 12, with #139 flow-direction tuning when v6.7 lands)                                      | #139           |
| L4    | Adversarial debate (multi-agent disagreement engine)                                                                 | —              |
| L5    | Phase 4d manual trace (Opus, deep contextual review)                                                                 | —              |
| L6    | Skeptic prefilter (HE-19 + HE-20 + HE-21 + #122 reverse_mutability auto-reject)                                      | v6.6           |
| L7    | Pattern C/M/K classifier (with #126 fund-flow gate)                                                                  | #126           |
| L8    | Ground truth cross-reference (compare vs confirmed-findings catalog)                                                 | —              |
| L9    | AI triage simulation (forefy 6-rule simulator)                                                                       | #130           |
| L10   | Submission-ready packaging (commit hash + file:line scope + privilege declaration + atomic framing + sanitizer pass) | —              |

**No-skip rules (PERMANENT):**

- ❌ Skip Layer 4 (adversarial debate) — keeps single-LLM blind spots in check
- ❌ Skip Layer 5 (Phase 4d manual trace) — Opus contextual review catches what static analysis misses
- ❌ Skip Layer 9 (#130 AI triage simulation) — would have saved $100 yesterday
- ❌ Skip Layer 10 (submission-ready packaging) — sanitizer + framing rules are non-negotiable
- ❌ Submit without #129 landing verifier wiring confirmed
- ❌ Submit without #130 AI triage PASS

If ANY layer fails or any rule blocks: HALT, surface to Ogie, await decision. Do NOT force-merge or force-submit.

**Hunt cadence (24/7):**

- L1 watchdog every 15 min: 30 baselined repos auto-monitored, new commits trigger L1 scan, L1 hit → escalate to full pipeline auto-spawn
- L2 daily 06:00 UTC: 3 targets per day from Top Targets queue (#522 priority order), each gets full 10-layer treatment, output = ground truth entry + Loop 1 capture regardless of finding count
- L3 weekly Sunday 00:00 UTC: 1 hot target gets EXTENDED scan (historical commit walk last 30 days, dependency drift, audit firm coverage gap)
- L4 intel enrichment always running: DefiHackLabs + ClaraHacks + Pashov + bug bounty disclosure feeds + @forefy + similar high-signal accounts → every new pattern → ground truth entry + detector candidate proposal

**Honest metric targets:**

- Ground truth catalog growth: 5+ new confirmed-real entries per week
- False-submission rate: 0
- AI-triage pass rate (#130 simulator): 100% on submitted
- Submission velocity: 2-3 per week, ALL having passed full 10-layer + #130
- Confirmed payout rate: 30%+ of submissions paid within 60 days

**Anti-metrics (do NOT optimize):** raw scan count, findings per scan, submission count, local-autopilot-success counts (per Priority #4 GROUND-TRUTH-LANDING).

**Compute budget:** RETIRED 2026-05-10 (see UNLIMITED COMPUTE rule below). Originally $50-120/week (Anthropic Pro Max + qwen3 local + #130 simulator local). Now: discipline is the only governor; burn what you need.

**Rationale:** imu-77340 closed in 14 min on 4/6 forefy AI triage rule violations. Cost of full-power discipline: $50-120/wk compute. Cost of shortcuts: $100/forfeited deposit + reputation hit + days of lost momentum. Math is obvious.

**Cross-references:**

- imu-77340 ground truth: `/data/buzz/persistent/buzz-api/ground-truth/2026-05-09-immunefi-primitive-vs-chain-calibration.md` (4/6 rule postmortem)
- forefy intel: `/data/buzz/persistent/buzz-api/intel/2026-05-09-forefy-ai-triage-rules.md`
- GROUND-TRUTH-LANDING doctrine: Priority #4 below
- Pre-Submission AI-Triage Standard: post-Priority-3 section

## Standing rule (May 10 2026 — Ogie msg "ACTIVE HUNTING MODE", PERMANENT)

**Standing mode is retired. Buzz actively hunts opportunities, not passively receives them. Predator, not sentry. Move.**

**Six continuous loops surface targets:**

| Loop                              | Source                                                                                          | Cadence                   | Trigger action                                                                                                                     |
| --------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **A — Bounty Platform Sweep**     | immunefi/hackenproof/cantina/c4/sherlock/h1                                                     | every 4h                  | new program cap > $100K + freshly launched → full 10-layer scan within 1h                                                          |
| **B — Fresh Deployment Hunter**   | Etherscan/Basescan/Arbiscan/Solscan recent verified contracts                                   | every 1h                  | verified + in-scope + TVL > $1M → immediate L1 scan                                                                                |
| **C — Pattern Cross-Pollination** | Loop 1 ground truth catalog × GitHub/Sourcegraph code search                                    | continuous                | pattern match in any in-scope repo → targeted L1 scan                                                                              |
| **D — Disclosure Mining**         | Immunefi disclosed / HackenProof public / rekt.news / DeFiHackLabs / GitHub Security Advisories | daily 03:00 UTC           | new exploit → hunt same pattern in (a) sister forks (b) same dev team (c) same auditor's other clients (d) cross-chain deployments |
| **E — High-Signal Accounts**      | @forefy @samczsun @0xfoobar @bytes032 @pashov + Pashov/Spearbit/ToB public reports + @cmichelio | real-time                 | tweet mentions CVE/exploit/finding → grep for protocol/contract names + cross-ref bounty scope within 30 min                       |
| **F — Hot Repo Watcher**          | bounty-in-scope repos + top 50 DeFi by TVL + recently-funded orgs                               | real-time GitHub webhooks | push to main/release branch → L1a+L1b scan on diff; "fix" or "security" PR → priority                                              |

**Default daily floor (even on quiet days):** 3 active scans minimum + 1 cross-pattern hunt + 1 disclosure mine. All findings through full 10-layer pipeline.

**Hunt queue prioritization (when multiple loops surface simultaneously):**

1. Time-sensitive (program closing, exploit window narrowing)
2. EV-weighted (cap × find probability)
3. Pattern-fresh (new ground-truth class application)
4. Diff-narrow (fresh commit = small surface, fast scan)
5. Strategic (Solana validator clients, infrastructure, novel L1/L2)

**What kills active mode:**

- ❌ Waiting for Ogie to greenlight every scan (autonomous within guardrails)
- ❌ Single-loop dependency
- ❌ Stopping a loop after one bad scan
- ❌ Skipping the 10-layer pipeline because "this is just recon"
- ❌ Burning compute on programs with cap < $50K

**What keeps active mode honest:**

- ✓ Every scan output captured to ground truth (positive AND negative)
- ✓ Every potential submission through #128 + #129 + #130 + 10-layer
- ✓ Every loop's surface-to-finding ratio tracked weekly
- ✓ Loops not producing in 30 days get retired
- ✓ Loops producing 2x baseline get amplified

**Compute budget:** $100-200/week (vs $50-120 standing). If caps hit: prioritize Loops B+D (highest signal-to-noise), reduce A from 4h→8h, E+F always-on (cheap monitoring).

**Hypothesis to test:** active loops produce 3-5x findings/week vs standing. Validate over 30 days.

## Standing rule (May 10 2026 — Ogie msg "UNLIMITED COMPUTE + ACTIVE HUNTING", PERMANENT)

**Compute rationing is retired. Anthropic + SpaceX Colossus 1 partnership (300 MW deployment) removed compute as a planning constraint. Pro Max unlimited + Opus rate limits raised. Burn what you need to burn. Discipline is the only governor remaining.**

**Predator at scale. Move.**

**Cadence bumps (effective immediately):**

| Loop | Old cadence | New cadence |
|---|---|---|
| A — Bounty Platform Sweep | every 4h | **every 1h** |
| B — Fresh Deployment Hunter | every 1h | **every 15 min** |
| C — Pattern Cross-Pollination | continuous | **continuous + max parallelism (50+ targeted scans per ground truth entry)** |
| D — Disclosure Mining | daily | **every 6h** |
| E — Account Tracking | real-time | **real-time + 6h aggregation across Tier 1 (10 accounts) + Tier 2 (audit firms)** |
| F — Hot Repo Watcher | real-time | **real-time + diff-audit auto-spawn on every push to watch list** |

**Four NEW loops enabled by unlimited compute:**

| Loop | Purpose | Cadence | Yield estimate |
|---|---|---|---|
| **G — Continuous Full-Repo Re-Scans** | Every previously-scanned in-scope repo gets re-scanned end-to-end as if fresh. Detector improvements may surface findings prior scans missed pre-detector. | every 7 days | 5-10 retroactive findings per week |
| **H — Fork Detection + Diff Hunt** | Scan GitHub for new forks of audited protocols, diff against parent, hunt missed backport patches | every 12h | 2-5 candidates per week |
| **I — Audit Firm Coverage Gap Hunter** | Cross-reference public audit reports vs deployed contracts. Identify "audited X mainnet, X+1 deployed unaudited" gaps | weekly | varies (high-value when hit) |
| **J — Bounty Cap-to-Volume Arbitrage** | Identify high-cap low-submission-volume programs (under-hunted) | weekly | varies (EV optimization, not new bugs) |

**Concurrent scan capacity targets:**

| Tier | Pipeline depth | Concurrent count |
|---|---|---|
| 1 | full 10-layer | 5+ |
| 2 | L1-L4 quick | 10+ |
| 3 | L1 watchdog | 30+ (already 30 baselined) |

**Subagent budget:**
- Opus subagents (L5 Phase 4d): 3+ concurrent
- qwen3 subagents (L1d emit, L6 Skeptic): 10+ concurrent

**Resource isolation:** each scan gets dedicated working dir under `/data/buzz/persistent/scans/{target_id}/`. No shared state between concurrent scans. Loop 1 capture writes are append-only (no race conditions).

**Daily floor REVISED UP:**
- Targets scanned: **70+ per week** (was 21 in standing, was 3-5/day)
- Cross-pattern hunts: 35+ per week
- Disclosure mines: 28+ per week
- Fresh deployment scans: 100+ per week (Loop B is high-volume)
- Hot repo diff-audits: continuous
- Submissions: 5-10 per week (constrained by quality, not throughput)
- Ground truth entries: 15+ per week (positive + negative)
- False submission rate: still 0
- AI triage pass rate: 100% on submitted (#130 enforced)

**Discipline scales WITH compute, not despite it.**

Unlimited compute does NOT mean: skip layers / submit faster / reduce ground truth capture / drop AI triage simulator.

Unlimited compute DOES mean: more scans concurrently / re-scan with improved detectors / hunt patterns across more protocols simultaneously / pursue more leads in parallel / fan out subagents for deeper analysis per scan.

**If actual numbers fall short of revised baseline, the constraint is operational not compute — diagnose the specific loop bottleneck.**

---

# Detector Doctrines (Priority-Ordered Hierarchy)

> Authority: Ogie msg "May 9 17:40 UTC DOCTRINE.md INSERT (before Canonicalization-Consistency)" — declared the Weaker-Property doctrine as the ROOT, with Canonicalization-Consistency + No-Overwrite-Guard as derived sub-doctrines. Reordered into priority hierarchy as Ogie specified.

## Priority #0: VERIFY-PREMISE-FIRST

Origin: TASK D incident, 2026-05-09 (P2 watchdog "5-day silence" false alarm). Authority: Ogie msg "17:45 UTC DOCTRINE.md PRIORITY #0 INSERT".

**Statement:**

> Before dispatching any subagent on a stated emergency, verify the premise that generated the alert. Stated urgency is not evidence of true urgency.

**The TASK D 2026-05-09 canonical example:**

URGENCY-5 was filed against P2 watchdog as "silently failing 5 days since May 4." Subagent dispatched. Cleanup complete. Verification revealed: cron was firing every 15 minutes the entire 5-day window — claim was based on the wrong file path (root-owned canonical `/data/buzz/persistent/watchdog/watchdog.json` frozen May 4 vs live claude-owned `/data/buzz/persistent/buzz-api/watchdog.json` updating fine). 30 minutes of subagent compute spent on a false emergency. 5 minutes of premise verification would have prevented it.

**Required pre-dispatch checks:**

- **Q1: WHAT PROVES THIS IS TRUE RIGHT NOW (not 5 days ago)?**
  - Live process status (not stored last-state)
  - Current log tail (not stored historical log)
  - Independent probe (not the alert's own data)

- **Q2: IS THE PATH/FILE/STATE CHECKED THE CANONICAL SOURCE OR A STALE SHADOW?**
  - Multiple write paths exist for the same logical state? (e.g., `/data/buzz/persistent/X` vs `/data/buzz/persistent/buzz-api/X`)
  - Permissions split forces a fallback path? Is fallback the live one?
  - Is canonical path being written to at all, or has all traffic moved to the shadow?

- **Q3: HAS PROCESS / CRON / SERVICE STATUS BEEN VERIFIED INDEPENDENTLY?**
  - `systemctl status` (not just log absence)
  - `crontab -l` + grep (not just "I think the cron is set up")
  - `ps` / `ss` / `docker ps` (not just last-known config)

- **Q4: IS ABSENCE-OF-EVIDENCE ACTUALLY EVIDENCE-OF-ABSENCE?**
  - Empty log = silent failure? OR log path wrong / log rotated / stdout swallowed by tmpwatch / stderr to `/dev/null`?
  - No findings = scanner broken? OR scanner working + nothing to find?
  - No alerts = system healthy? OR alerter broken?

If any of Q1–Q4 cannot be answered confidently, do NOT dispatch action subagent. Dispatch DIAGNOSTIC subagent first (read-only, no destructive ops, return findings). Action only after premise confirmed.

**Detector PR template addition (REQUIRED):**

New mandatory field: **"What premise verification was performed before this PR was opened?"**

Acceptable answers:

- "I reproduced the failure on a clean checkout"
- "I confirmed the symptom is present in `tail -100` of `$LOG_PATH`"
- "I ran the diagnostic subagent and it returned `$RESULT`"

Unacceptable answers:

- "An alert fired"
- "It looked broken"
- "User reported issue"
- (silence)

**Sub-doctrine: ALL UPSTREAM SIGNALS REQUIRE INDEPENDENT VERIFICATION**

External signals (jinmo123 tweet, QED blog, security disclosures) are INTAKE only — they are not action triggers. Action triggers require independent reproduction or confirmation against canonical sources.

**Worked example: HE-20 design 2026-05-09**

- **Pattern:** Designed detector HE-20 based on v6.5 capture mention of `setLimit`/`setWhitelist` patterns. Those keywords were in the Phase 4d narrative summary but NOT in the raw L1d-17 finding output (Symbiotic Vault mutator set was all-user-facing — `deposit`/`claim`/`claimBatch`/`onSlash`/`_initialize` all `nonReentrant` — not the mixed admin+user pattern HE-20 was designed for).
- **Failure mode:** Used summary as source-of-truth instead of verifying raw emitter output. Detector targeted a pattern that wasn't present in the actual finding.
- **Correction:** Before designing any detector, read raw findings JSON for the SPECIFIC finding being addressed, not the human-written summary that mentions it.
- **Self-corrected by Buzz at 16:21 UTC during v6.6 regression analysis** — first instance of VERIFY-PREMISE-FIRST applied to its own work. The doctrine caught itself in real-time.

**Worked example: AIBTC Opal reply 2026-05-09 21:50 UTC**

- **Pattern:** Directive arrived asking to send 100-sat paid-inbox reply to Opal Gorilla based on three claims: (a) "Reply text: [paste from msg above]" — text not actually pasted; (b) sender script available — memory `reference_aibtc_inbox_sender.md` flagged it as "blocked on envelope-shape final mile"; (c) "55 unread / 53 remaining after Opal" — API at default returned 20 messages with 8 distinct peer threads.
- **Failure mode that would have happened without verification:** Burned 100 sats on assumed-text + assumed-sender-capability + assumed-scope. Worse: drafted Opal reply Opus-in-context, then discovered cap=480c made it physically unsendable; then discovered API limit=100 returned 32 distinct peer threads (not 8); then discovered most "53 remaining" were already-answered, leaving only 5 truly unanswered (Opal + 4 others, of which 3 are auto-archive Tier 4).
- **Correction:** Each premise (text-supplied / sender-exists / unread-count / char-cap) verified independently against ground truth (re-read directive / `ls scripts/aibtc-inbox-sender*` / `curl /api/inbox?limit=100` / measure max ever-sent message in thread = 473c). Three blockers surfaced to operator BEFORE any send. Operator confirmed corrections (D1 draft approved, D2 manual UI paste, D3 API authoritative).
- **Self-corrected by Buzz at 21:50 UTC** — second instance of VERIFY-PREMISE-FIRST applied to its own work. Cost of premise verification: 5 minutes. Cost of premise non-verification: 100 sats on a failing send + reputational risk if truncated nonsense reaches Opal.

**Worked example #4: AIBTC autopilot streak hallucination 2026-05-10**

- **Pattern:** AIBTC autopilot reported "Day 7 streak protected (6/6 cap)" on 2026-05-09 EOD based on local script success logs. Ground-truth query of `/api/agents/{address}` showed `lastActiveAt: 2026-05-03T11:25:01Z` and no outbound message since `2026-04-30T20:26Z`. The "streak" was a local-log artifact; signals were not landing on the network for 9 days.
- **Failure mode:** Local script return-code success treated as proof of network landing. No server-side confirmation step. EOD report aggregated local logs into "streak protected" claim with zero ground-truth verification. 9 days of qwen3 compute spent on signals that never landed + false-confidence streak metric + 1 wrong EOD report.
- **Correction:** /api/agents/{btc} ground-truth query at P1 EIC verification surfaced the gap. Cron disabled + script halt-guard added + #129 landing-verifier filed as restart prerequisite. Streak metric retired pending verifier ship.
- **Self-corrected by Buzz at 22:05 UTC** during P1 EIC verification — third instance of VERIFY-PREMISE-FIRST. Cost of non-verification: 9 days of compute + EOD-report integrity hit.

**Rule (codified):**

> For any autonomous outbound action (signal filing, message sending, contract submission, payment, on-chain tx, etc.), success = server-side ground-truth confirmation of landed state, NOT local script return code. Build a verification step into every autopilot loop. No autopilot fires without the verifier wired.

**Pattern name: GROUND-TRUTH-LANDING.** Filed as Priority #4 in Doctrine hierarchy (see below). Detector: #129 landing-verifier (queued, branch landing-verifier-v1).

**Cross-check cadence (added 2026-05-10 from AIBTC inbox revival directive):**

> Inbox/external-API metrics depend on which endpoint counts what. Verify scope monthly via independent profile-UI cross-check. If API shows N and UI shows M, the gap is a premise-mismatch waiting to fire. Resolve via explicit pagination probe + endpoint catalog before treating either as authoritative.

This doctrine is **Priority #0** because it gates all other doctrines: applying the wrong doctrine to the wrong premise wastes 100% of the work product.

**Operational halt rule (refined 2026-05-09 18:35 UTC, Ogie EOD msg DECISION 2):**

> HALT if (a) merge introduces regression (ACCEPTs go UP), OR (b) FP-class gate fails on the class the patch was DESIGNED to address. Partial improvement on targeted class with surviving FPs in OTHER classes = MERGE + queue follow-up.

Reasoning: original "strict gate fail AND FP-class gate fail → HALT" rule penalized partial wins. Refined rule preserves discipline (no regressions, no missed-target merges) while shipping real incremental progress. Targeted-class gate is the bar; surviving FPs in unrelated classes are follow-up tickets, not blockers.

## Priority #1: WEAKER-PROPERTY-THAN-DOWNSTREAM-ASSUMES (ROOT)

Origin: QED Audit Commonware writeup 2026-05-09, their own framing.

**Statement:**

> All bugs of significance reduce to the same pattern: systems validate a weaker property than what downstream components assume.

**Formalization:**

For every validation site V and consumer site C:

```
let validated = property_enforced_by(V)
let assumed   = property_assumed_by(C)
```

If `validated ⊊ assumed`, there exists an attack surface in the gap.

**Confirmed instances in Buzz ground truth:**

| Instance                            | V validates                  | C assumes                                    |
| ----------------------------------- | ---------------------------- | -------------------------------------------- |
| HE-19 visibility-miss (#117/#122)   | auth on view fn              | auth was validated on the right (mutator) fn |
| Firedancer HTTP framing (imu-77340) | Content-Length integer parse | RFC 7230 §3.3.3/3.2.4/§ rules conformance    |
| QED Commonware BLS                  | aggregate sum                | individual component bound                   |
| QED Commonware Reed-Solomon         | Merkle root match on decode  | canonical padding on re-encode               |
| QED dYdX EIGEN-USD                  | byte-exact ticker uniqueness | canonical-form uniqueness (oracle routing)   |

**How to apply:**

Every new detector PR MUST answer two questions in its template:

1. What property does this validation actually enforce?
2. What stronger property does the downstream consumer assume?

If the answers are identical, the detector is checking nothing useful.
If the answers differ, the gap IS the detector's target.

**Sub-doctrines that derive from this:**

- Priority #2: CANONICALIZATION-CONSISTENCY (string normalization gaps)
- Priority #3: NO-OVERWRITE-GUARD (write semantics gaps)
- HE-19 / VISIBILITY-MISS (auth scope gaps — landed)
- Class K / FRAMING-DIVERGENCE (protocol parsing gaps — Firedancer)
- HE-20 / INVARIANT-MULTI-MUTATOR (state mutator scope gaps — landed)

This doctrine is the ROOT. All Buzz detector design flows from it.

## Priority #2: CANONICALIZATION-CONSISTENCY (sub-doctrine of #1)

Origin: QED dYdX oracle hijack (2026-05-06 writeup, $10K USDC bounty, $1.2M open-interest exposure, 17-month exposure window). Forwarded by Ogie msg "17:00 UTC dYdX QED WRITEUP DECODED" (May 9 2026).

**Statement:**

> When module A reads/writes a shared store keyed by `canonical(X)`, and module B gates writes to that store using `raw(X)` comparisons, there exists a seam where two raw inputs that canonicalize to the same value bypass the gate.

**Specialization of #1:** the gate validates `raw(X) != raw(existing)` (weaker), but the consumer assumes `canonical(X) != canonical(existing)` (stronger).

**Applies to:** Cosmos SDK chains, EVM (token symbol normalization), Solana (PDA seed derivation order), any system with shared state across modules.

**Origin trace:** `protocol/x/prices/keeper/market.go` duplicate-check used byte-exact equality; `slinky_adapter.AddCurrencyPairIDToStore` used `strings.ToLower` canonicalization. Two raw tickers with case-shift Unicode equivalents bypassed the dup gate, then silently overwrote canonical mapping. Fix landed 2026-03-16: `strings.EqualFold` + `store.Has(key)` guard pair.

**How to apply:** any time you see a string comparison gating a store write, ask "is the same string canonicalized differently elsewhere?" If yes, the gate is permeable. Trace all upstream and downstream uses of the key. Detector spec filed as #137 (cross-module canonicalization mismatch detector, depends on #129 Cosmos SDK / Go coverage).

## Priority #3: NO-OVERWRITE-GUARD (sub-doctrine of #1)

Origin: same QED dYdX writeup as Priority #2.

**Statement:**

> Stores representing logical mappings (`ID`, `Registry`, `Index`, `Map`) must enforce write-once or explicit-overwrite semantics. Silent `Set` is an anti-pattern when the key represents a unique identity.

**Specialization of #1:** the validation site `store.Set(...)` enforces "successful write" (weaker), but the consumer assumes "this key was previously unset" (stronger).

**Applies to:** Cosmos SDK keeper KVStore.Set, EVM mapping(...) writes, Solana PDA-keyed account writes, any "registry" or "uniqueness map" pattern.

**Origin trace:** `slinky_adapter.AddCurrencyPairIDToStore` performed `store.Set(key, val)` without preceding `store.Has(key)` check. Combined with the canonicalization mismatch above, an attacker overwrite of canonical mapping became reachable. Fix is the `Has(key)` guard pair.

**How to apply:** any time you see a `Set` on a store whose name matches `/(ID|Map|Registry|Mapping|Index)$/`, require a preceding `Has(key)` check unless the codepath has explicitly documented "this is an upsert". If unsure, file as suspect. Detector spec filed as #138 (no-overwrite-guard detector, depends on #129 Cosmos SDK / Go coverage).

## Priority #4: GROUND-TRUTH-LANDING

Origin: AIBTC autopilot streak hallucination 2026-05-10 (P1 EIC verification). Authority: Ogie msg "P1 DECISION CONFIRMED: HALT + STRUCTURAL FIX" (May 10 2026). PERMANENT.

**Statement:**

> For any autonomous outbound action (signal filing, message sending, contract submission, payment, on-chain tx), success = server-side ground-truth confirmation of landed state, NOT local script return code. Build a verification step into every autopilot loop. No autopilot fires without the verifier wired.

**Specialization of #0 (VERIFY-PREMISE-FIRST):** the local script's success-claim is the premise; the server-side landed-state is the ground truth. Without verification, the local-claim is treated as truth and downstream metrics (streak, EOD reports, revenue projections) compound the false positive.

**The 2026-05-10 canonical example:**

morning-signals-v2.sh ran 6 slots × N days, each slot returned exit 0 → local autopilot logged "filed" → daily aggregator counted 6/6 toward streak → EOD report claimed "Day 7 streak protected." Ground-truth `/api/agents/{btc}` query showed `lastActiveAt: 2026-05-03`, no outbound message since `2026-04-30`. Nine days of compute spent, zero signals landed, false confidence in streak metric, retroactive correction needed on EOD report.

**How to apply:**

For every autopilot action, register a paired verifier:

| Action type         | Verifier check                                                                |
| ------------------- | ----------------------------------------------------------------------------- |
| AIBTC signal filing | `GET /api/signals?address={addr}&since={ts}` confirms `signal_id` in response |
| AIBTC inbox send    | `GET /api/inbox/{recipient_addr}` confirms `msg_id` in latest list            |
| Immunefi submission | `GET /api/reports/{report_id}` confirms `status != "Closed-Spam"`             |
| On-chain tx         | Etherscan/Hiro/Solana RPC confirms tx in N blocks                             |
| HTTP POST endpoint  | confirm the resource at the returned URL is reachable + content-matches       |

Generic interface: `register_post_action_verifier(action_type, verifier_fn, timeout_seconds)`. On verifier fail → ALERT War Room + log to `landing-failures/`. On verifier timeout → HALT autopilot + ALERT + await operator decision. Never report success on local-script-success alone.

**Restart sequence (when restoring an autopilot post-halt):**

1. Run forced manual filing (one signal/send/tx, hand-crafted, Opus drafted)
2. Verifier confirms landed within timeout → green light next attempt
3. Verifier confirms NOT landed → diagnose, fix, repeat from step 1
4. Only after 3 consecutive verified-landed actions → re-enable autopilot

Do NOT autopilot-restart based on hope. Verify three times.

**Detector reference:** #129 landing-verifier (queued, branch landing-verifier-v1). Required to ship before AIBTC autopilot restart, Opal sender production-ready, or Immunefi auto-followup.

**Sub-doctrine to #0:** Class L Calibration Gap second entry — local-vs-network landing gap. See `/data/buzz/persistent/buzz-api/ground-truth/2026-05-10-aibtc-local-vs-network-landing-gap.md`.

---

# Pre-Submission AI-Triage Standard (formerly "Pre-Submission PoC Standard", expanded 2026-05-10 from forefy intel)

> Origin: imu-77340 closed-by-triage 2026-05-09 15:20 UTC. Authority: Ogie msg "15:35 UTC FIREDANCER CLOSED + CRITICAL CALIBRATION CAPTURE" (May 9 2026, capture action 3). EXPANSION authority: Ogie msg "CRITICAL INTEL: AI TRIAGE RULES LEAKED" (May 10 2026, post-forefy intel ingest). PERMANENT.

## The 6 forefy AI-Triage Rules (every submission must pass ALL)

Source: @forefy reverse-engineered HackenProof's `hackenproof-bulk-triage` skill. Almost certainly applies to Immunefi (andrew @ imu-77340 = 14-min close = LLM-assisted triage pattern).

| #      | Rule                                                   | Failure mode                                                                                                                                                                | Rewrite playbook                                                                                               |
| ------ | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **R1** | Exact commit hash + chain required                     | "latest deployed" / no commit-pin → REJECT                                                                                                                                  | Add commit hash + chain to every submission preamble                                                           |
| **R2** | Specific file:line scope (matched to scope entry name) | vague "in the contract" → REJECT                                                                                                                                            | Pin file:line in summary, not just inside PoC                                                                  |
| **R3** | No weak-bug-category pattern matches                   | fee-on-transfer / governance / RFC / common acknowledged crits → DOWNGRADE or REJECT                                                                                        | Reframe away from weak categories OR add explicit non-acknowledged distinguishing factor                       |
| **R4** | PoC demonstrates exploit not primitive                 | "[PASS] accepts X" / "framing accepted" / "validation bypassed" → DOWNGRADE; "[PASS] funds drained" / "victim balance changed" / "unauthorized state mutation" → ALLOW MED+ | Build end-to-end exploit chain with observed-harm PoC output                                                   |
| **R5** | Privilege level explicitly declared                    | implicit privilege (let triager infer) → REJECT or DOWNGRADE                                                                                                                | Add explicit "Privilege required: NONE / any EOA / any signer" line in summary                                 |
| **R6** | Single-block atomic framing                            | multi-step coordination prose ("if X then Y could…") → REJECT as theoretical                                                                                                | Rewrite to "Attacker calls X. State mutates to Y. No coordination required." Avoid "if/then/could/would/might" |

**Operational rule:** every bounty submission must pass simulated AI triage before ship. Skip = forfeit deposit + reputation hit. Verification: run #130 simulator pre-submission, attach result to submission audit log.

**Pre-submission gate (PLATFORM = Immunefi Audit Comp / HackenProof, SEVERITY ≥ MED):**

- Run #130 ai-triage-simulator-v1 on draft markdown
- ALL 6 rules must PASS or BLOCK
- Any rule fails → rewrite per playbook, re-run, repeat until ALL PASS
- Override flag: Ogie can force-submit on documented exception (logged to audit trail)

**Platform calibration:**

| Platform                        | R1               | R2               | R3               | R4                             | R5               | R6               |
| ------------------------------- | ---------------- | ---------------- | ---------------- | ------------------------------ | ---------------- | ---------------- |
| Immunefi Audit Comp             | strict           | strict           | strict           | strict                         | strict           | strict           |
| Immunefi Standing Bounty        | strict           | strict           | relaxed          | relaxed (LOW informational ok) | strict           | strict           |
| HackerOne (Circle, Cosmos, Sui) | strict           | strict           | relaxed (RFC ok) | relaxed (RFC ok)               | strict           | relaxed          |
| HackenProof                     | strict           | strict           | strict           | strict                         | strict           | strict           |
| Code4rena/Sherlock/Cantina      | per contest spec | per contest spec | per contest spec | per contest spec               | per contest spec | per contest spec |

## imu-77340 4/6 rule postmortem (canonical example)

| Rule | imu-77340 status                                                                           |
| ---- | ------------------------------------------------------------------------------------------ |
| R1   | ✅ commit `c141728` + chain included                                                       |
| R2   | ✅ `src/waltz/http/fd_http_server.c` with line numbers                                     |
| R3   | ❌ "RFC 7230/6455 non-conformance" pattern-matches as informational                        |
| R4   | ❌ PoC outputs `[PASS] non-conformant framing accepted` not `[PASS] funds drained`         |
| R5   | ❌ Never said "any unauthenticated TCP client" — let AI infer                              |
| R6   | ❌ "If a CL.TE desync exists, then queue poisoning could divert..." — coordination framing |

**Score: 2/6 PASS. 4-rule failure compound. 14-min close was efficient pattern-match, not lazy review.** Single-cause "primitive vs exploit chain" framing (yesterday) was incomplete — actual root cause is multi-rule failure.

## Original C1-C4 Pre-Submission PoC Checklist (now subsumed under R4)

**Statement:**

> Before any Immunefi deposit-required submission at MED+ severity, PoC must demonstrate the unintended effect, not just the primitive that enables it. If you cannot stand up the actual deployment configuration (proxy + target, attacker + victim, attacker tx + victim drain) and observe the harm directly, severity ceiling is LOW (informational). RFC-violation reports without exploit chain should go to HackerOne or standing bounty programs, not Immunefi Audit Comp.

**The imu-77340 canonical example:**

6 PoCs proved fd_http_server.c accepts non-conformant HTTP/1.1 framing (RFC 7230 §3.3.3) and WebSocket prelude smuggling (RFC 6455 §4.2.2). Each PoC exited 0 on PASS — primitive confirmed. Submitted as MED on Immunefi Audit Comp. Triager andrew closed in 14 minutes: "show that the server accepts certain non-conformant framing, not that a proxy-assisted attack chain produces the claimed impact. No evidence of attacker-controlled bytes reaching the GUI/RPC application before authentication is provided." $100 deposit forfeited. Calibration error 65× best case ($65K best → -$100 realized).

**Required pre-submission checklist (PLATFORM = Immunefi Audit Comp, SEVERITY ≥ MED):**

- **C1: Does the PoC stand up the actual deployment configuration?**
  - Proxy + target stack, not just the target in isolation
  - Attacker + victim entities, not just attacker request crafting
  - End-to-end test invocation, not unit test of one component

- **C2: Does the PoC observe the harm directly?**
  - Victim balance changed / unauthorized state mutation observed
  - Attacker-controlled bytes reach the protected resource
  - Bypass authentication / authorization observed
  - NOT: "server accepts X" / "validation returns Y" / "framing parsed as Z"

- **C3: Does the PoC PASS-line state the harm or just the primitive?**
  - Primitive PASS: `[PASS] non-conformant framing accepted` → LOW only
  - Exploit PASS: `[PASS] victim_balance: 1000 → 0 via attacker_tx 0xabc` → MED+ allowed
  - Mixed: requires manual override + written justification + Ogie greenlight

- **C4: Has the platform's primitive-acceptance policy been confirmed?**
  - Immunefi Audit Comp: NO at MED+ — exploit demonstration required
  - Immunefi Standing Bounty: YES at LOW — primitive informational
  - HackerOne (Circle, Cosmos, Sui): YES at MED — RFC defects accepted
  - HackenProof: YES at LOW/MED — flexible
  - Code4rena / Sherlock / Cantina: read scope carefully

If any of C1–C4 cannot be answered confidently with "YES, observed end-to-end harm", do NOT submit at MED+ on Immunefi Audit Comp. Route to HackerOne / Standing Bounty at LOW informational instead. Cost of routing-down is $0 (no deposit). Cost of routing-up wrong is the deposit.

**Routing rule (post-imu-77340):**

- RFC-conformance defects without exploit chain → HackerOne or Standing Bounty, NOT Immunefi Audit Comp
- Exploit-chain demonstrated end-to-end → Immunefi Audit Comp at MED+ allowed
- Mixed primitive+partial-exploit → file as LOW informational on Standing Bounty first, upgrade severity only after end-to-end PoC stands up

**Sub-doctrine relationship to Priority #1 (Weaker-Property):**

This is a SECOND-ORDER application of Priority #1 to OUR OWN PIPELINE:

- V validates: PoC primitive demonstration enforces "server has defect"
- C assumes: Triage assumes "exploit chain produces unintended harm"

Submitting V → C as MED+ asserts a stronger property than V actually enforces. The bug is in our submission classifier — we (Buzz) are the system here, the calibration gap is in OUR validation site.

**Detector spec reference:** #128 PoC Type Classifier (queued, branch `poc-type-classifier-v1`). Pre-submission gate: parse all PoC PASS-lines, classify primitive vs exploit vs mixed, BLOCK MED+ submissions with primitive-only PoCs to Immunefi Audit Comp.

**Ground truth reference:** `/data/buzz/persistent/buzz-api/ground-truth/2026-05-09-immunefi-primitive-vs-chain-calibration.md` (Class L Calibration Gap, first entry).

---

_(Existing doctrines below as Priority #4+. Add new doctrines into this hierarchy as they are derived from Priority #1.)_
