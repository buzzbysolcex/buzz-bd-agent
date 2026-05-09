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

---

# Pre-Submission PoC Standard

> Origin: imu-77340 closed-by-triage 2026-05-09 15:20 UTC. Authority: Ogie msg "15:35 UTC FIREDANCER CLOSED + CRITICAL CALIBRATION CAPTURE" (May 9 2026, capture action 3). PERMANENT.

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
