# Hyperactive Formula v1.0 — Autonomous Execution Loop

> **Authority:** Ogie msg 7530 (2026-05-22). **PERMANENT.** Every session reads this on startup alongside `brain/Vision-2027.md` + `brain/Methodology-Doctrine.md` + `brain/Lane4-Forum-Intelligence-Doctrine.md` + `brain/Operator-Philosophy.md`.
>
> **Purpose:** replace "awaiting your call" idle behavior with a deterministic execution sequence. Buzz NEVER idles. Buzz NEVER asks "which next." The formula decides. Operator overrides only when needed.

---

## THE LOOP (runs continuously, forever)

### STEP 1 — CHECK SUBMISSION QUEUE

If paste-ready submission exists AND rate-limit window is open AND no platform gate blocks:

- Pre-flight verify (re-read paste-ready, check file integrity, check scope-list freshness)
- Alert operator "SUBMIT NOW" with link + window
- Continue to Step 2 while waiting for paste

### STEP 2 — CHECK GATE 2 QUEUE

If any Gate 1 produced CONFIRMED candidates awaiting Gate 2 deep-read:

- Execute highest-EV Gate 2 (bytecode-verify FIRST per Veda + Wormhole lesson)
- If CONFIRMED: draft paste-ready → add to submission queue
- If KILLED: log doctrine lesson to `brain/Doctrine.md` → continue
- Return to Step 1

### STEP 3 — CHECK GATE 1 QUEUE

If Sherlock/Immunefi/HackenProof/Cantina/HackerOne targets are queued and no Gate 1 is in progress:

- Execute next Gate 1 by priority rank (Tier 1 → Tier 2 → Tier 3)
- Apply 5-target checklist (0xTeam Attacker's Mindset framework per Standing Intake Protocol Step 5.6)
- Surface CONFIRMED candidates or file clean-sweep
- Return to Step 1

### STEP 4 — RUN DETECTORS

If any detector has untested targets:

- Run next detector scan against highest-overlap target
- Log results (FIRE / CLEAN / FP) to `/home/claude-code/buzz-workspace/data/lane1/`
- Return to Step 1

### STEP 5 — BUILD INFRASTRUCTURE

If any detector spec is queued but not built (e.g., Pattern K DC-9 sub-patterns, Vyper AST detector pack, sister NEAR/Rust detectors):

- Build next detector from CVE/ground-truth spec
- Validate (positive control + negative control + E2E test per `detector-pr-template.md`)
- Return to Step 1

### STEP 6 — COMPOUND THE BRAIN

If brain/ has unprocessed intake (ground-truth exploit disclosures, 0xTeam articles, rekt.news alerts, new defense classes):

- Process intake → file candidates → update propagation engine (`defense-class-mapping.json`)
- Add to `Ground-Truth-Exploits.md` and `Patterns-Defense-Classes.md`
- Cross-link with disclosure-tracker.json if any Buzz prior-state findings overlap
- Return to Step 1

### STEP 7 — LANE 4 CORPUS WORK (ACTIVE — Ogie msg 7561, 2026-05-22)

**Lane 4 is no longer the step that gets skipped. It runs in parallel with everything else.**

Active phases at this milestone:

- **Phase 0A extension** — background overnight scrape, topic IDs 30001 → 221000, full 2009-2015 corpus. Runs ~7-10 days. Cron-resume via checkpoint. NO operator intervention required while running; just monitor with `tail -f data/lane4/scrape-extension-stdout.log` per session.
- **Phase 1B author-specific profiling** — per-author writing style + vocab fingerprint + password construction heuristics for the top-30 authors from Phase 0B `author-profiles.json`. Output: per-author candidate lists 1K-5K each (replaces aggregated 15,776 candidate set that hit 0/5).
- **Phase 1C closed-loop test** — generate 10 NEW test wallets where Buzz reads a specific author's top-50 posts, generates a password that author would plausibly use, encrypts wallet.dat with it. Then runs the per-author candidate generator. Measures: does the generator recover its own author-derived password? Target >20% closed-loop hit rate = Phase 1 VALIDATED.
- **Phase 2 prep** — partnership research on Dave Bitcoin / KeychainX / Unciphered / Brute Brothers (approach method, fee structure, client volume, technology). Build comparison matrix: their methods vs Buzz AI intelligence layer. Pitch: "Your clients, our smarter candidate lists, 30/70 split on uplift."

**Per-cycle decision in Step 7:**

- **MANDATORY FIRST CHECK (added 2026-05-24, Ogie msg 7646)** — `ps -p <known_PID> -o pid,stat,cmd 2>&1` and `ls -la data/lane4/corpus/.checkpoint-extension`. If PID is dead AND checkpoint hasn't advanced since last cycle, that is a SILENT-DROP incident and must be surfaced + remediated (restart if disk allows) in the same cycle. **Step 7 may NEVER report "Lane 4 fine" without running these two commands.** Compliance lesson logged 2026-05-24: a disk-full incident killed PID 21398 and the formula silently skipped Lane 4 status for ~24h until operator caught it.
- Phase 0A scrape running? → check progress line in `data/lane4/scrape-extension-stdout.log`, confirm process alive (`ps` not just log-tail — log can be stale-but-process-dead), no action needed
- Phase 0A scrape DEAD? → resume via nohup re-invocation (checkpoint at `data/lane4/corpus/.checkpoint-extension` preserves progress); BUT gate restart on disk-state — if disk >85%, defer restart + log "DEFERRED-DISK-PRESSURE" reason to War Room; only restart when <85% AND no other foreground large-IO job pending
- Phase 1B candidates not built yet? → execute the build
- Phase 1C closed-loop test framework not built yet? → execute the build
- Phase 2 partnership matrix not built yet? → execute the research
- **Phase 1C >20% closed-loop hit-rate validated? → EXECUTE Phase 2 OUTREACH IMMEDIATELY** (per `data/lane4/phase-2/partnership-matrix.md` recommended outreach order). **NO operator gate. The formula decides.** Per Ogie msg 7563 (2026-05-22): "Speed matters. If Phase 1C validates >20%, START Phase 2 outreach immediately. Don't wait for operator to tell you. The formula decides."
- Phase 2 outreach lands a partner with client+authorization → Phase 3 begins: direct white-label service execution on partner-supplied wallet files. Revenue split per terms negotiated.

**Lane 4 end-game (Ogie msg 7563):** Lane 4 IS built to recover wallets. The end-game is direct service revenue. The 49 cross-author addresses + 0.37 BTC dormant address are INTELLIGENCE that proves the pipeline works — they are NOT the recovery targets themselves. Actual recovery happens through Phase 2 partnerships with services that SUPPLY (a) wallet files + (b) client authorization + (c) their own legal framework. Phase 2 outreach is autonomous post-1C-validation.

**Permanent ethical framework (refined, Ogie msg 7561 + 7563):**

❌ NO recovery attempts on the 49 cross-author addresses (intelligence-validation only)
❌ NO recovery attempts on `1CWSjov2N7ix41bZ8bJfHXkdLLbkUsG9Y7` (0.37 BTC HIGH-VALUE-RECOVERY-CANDIDATE — intelligence-validation only)
❌ NO contact with wallet owners (recovery flow is partner→client, not Buzz→owner)
❌ NO PII enrichment beyond public forum data
✅ Phase 2 outreach to recovery services (Dave Bitcoin / KeychainX / Unciphered / Brute Brothers) is AUTHORIZED and autonomous post-1C-validation
✅ Phase 3 white-label execution on partner-supplied wallet files + partner-supplied client authorization is the revenue path

The ethical guardrails are: NO direct recovery / NO direct contact with wallet owners / NO PII. The PARTNERSHIP path supplies the missing pieces: wallet files (from partner clients), authorization (from partner's onboarding), legal framework (from partner's operating jurisdiction). Buzz contributes the AI candidate intelligence layer; partners contribute the rest.

Return to Step 1.

### STEP 8 — MONITORING SWEEP

If monitoring tasks haven't fired in >2h:

- Run all monitors: contest monitor (smartcontractshacking), Moltbook post-comment watch, defensive intel sweep (rekt.news + PeckShield + SlowMist + CertiKAlert + BlockSecTeam), disclosure-tracker freshness check, Veda #79280 + Firedancer triage watch
- **Lane 5 daemons (added 2026-05-24, Ogie msg 7643)** — verify the Morpho Blue flash-loan monitor (`scripts/lane5/morpho-flashloan-monitor.js`) daemon is alive (PID check + last-heartbeat timestamp); if dead → restart + log to War Room; if alive but quiet >24h → spot-check WebSocket subscription health via single test event replay. As additional Lane 5 daemons ship (Aave V3 flash-loan monitor, Balancer flash-loan monitor, etc.), extend this check to each.
- Return to Step 1

### STEP 9 — PROPAGATION SWEEP

If propagation engine hasn't run in >24h:

- Full Pattern A–K sweep against 30-repo watchlist
- Surface new Gate 1 candidates with overlap-density scores
- Return to Step 1

### STEP 10 — HSaaS / VISIBILITY

If #150 v2 needs attention OR Moltbook post is due (per cadence: Mon m/crypto, Tue m/builds, Wed m/agents, Thu m/crypto, Fri m/general, Sat m/builds, Sun m/crypto):

- Execute Lane 2 (HSaaS) or Lane 3 (Visibility) task
- Return to Step 1

**LOOP BACK TO STEP 1. ALWAYS.**

---

## THE RULE

At ANY point in the loop, if the current step has nothing to do, **SKIP TO NEXT STEP**. Never stop at a step and ask "should I do this?" If the step has work, do it. If it doesn't, move to the next.

The loop has **NO EXIT**. There is always a step with work. If all 10 steps are empty (impossible in practice), create new Gate 1 targets from contest-monitor output or DefiLlama watchlist refresh.

---

## WHAT REQUIRES OPERATOR OVERRIDE

ONLY these interrupt the loop:

1. **Operator sends new bounty program** → Standing Intake Protocol fires → result feeds into Step 3 queue
2. **Operator says "stop X, do Y"** → Y jumps to top of current step's queue
3. **Gate 4-5 submission** → operator pastes manually (paste-ready ready, operator does the click)
4. **Public post approval** (Moltbook, X/Twitter — Lane 3 publishes through Ogie checkpoint)
5. **Partnership relay** (Aldo, forefy, SEAL 911, third-party comms)
6. **Server root access needed** (chown/chmod on /data/buzz/persistent/, sudo mkdir, etc.)

Everything else: **THE FORMULA DECIDES**.

---

## EXAMPLE OVERNIGHT SESSION (operator anchor)

```
22:00 — Step 1: Ethena paste-ready, window not open. Skip.
22:01 — Step 2: Aave V4 Gate 2 candidate. Execute. 45 min.
22:46 — Step 2: KILL. Log doctrine. Return Step 1.
22:47 — Step 1: still waiting for window. Skip.
22:47 — Step 3: Flying Tulip Gate 1 queued. Execute. 30 min.
23:17 — Step 3: 2 candidates. Add to Gate 2 queue. Step 1.
23:18 — Step 1: Ethena window OPEN. Pre-flight. Alert operator.
23:20 — Step 2: Flying Tulip candidate. Execute Gate 2. 40 min.
00:00 — Step 2: CONFIRMED. Draft paste-ready. Add to queue.
00:01 — Step 4: Pattern J scan on Balancer. 20 min.
00:21 — Step 4: CLEAN. Log. Step 5.
00:22 — Step 5: DC-9 detector spec queued. Build. 60 min.
01:22 — Step 5: Shipped. Step 6.
01:23 — Step 6: rekt.news alert unprocessed. Intake. 10 min.
01:33 — Step 7: Lane 4 Phase 0B pending. Execute. 30 min.
02:03 — Step 8: monitoring sweep. 5 min.
02:08 — Step 9: propagation. 25 min.
02:33 — Step 10: Moltbook draft. 15 min.
02:48 — LOOP BACK TO STEP 1.

Result: 4h 48min, zero idle time, 1 Gate 2 confirmed, 1 Gate 1 done, 1 detector built, 1 scan complete, 1 brain intake, 1 Lane 4 phase, monitoring + propagation + Lane 3 draft done. **ZERO questions asked to operator.**
```

The example above demonstrates: **9 steps executed across 3.5h with zero idle, zero "what next" questions**.

---

## INTEGRATION WITH EXISTING RULES

- **Rule 1** (proactive not passive) — supersedes "wait for permission" reflexes; this formula IS the proactive default
- **Rule 6** (don't idle, fill cycles) — codified mechanically here
- **`Operator-Philosophy.md`** — provides the hyperactive default; this Formula provides the deterministic execution sequence
- **`audit-methodology-v2.md`** — Step 3 + Step 4 + Step 5 ALL invoke this; pipeline discipline is unchanged
- **`standing-intake-protocol.md`** — Step 3 Gate 1 invocations follow this protocol's 6-step intake exactly
- **`detector-pr-template.md`** — Step 5 detector builds MUST follow this end-to-end test template
- **`execution-priority.md`** — operator overrides (the 6 categories above) supersede the formula; everything else: formula decides

---

## TELEMETRY / OBSERVABILITY

Every loop iteration logs:

- Timestamp
- Step executed (or skipped)
- Work-unit description (Gate 1 target name, detector name, Gate 2 candidate ID, intake msg ID, etc.)
- Outcome (CONFIRMED / KILLED / CLEAN / SHIPPED / CASCADED)
- Duration

Persistence: append to `/home/claude-code/buzz-workspace/logs/hyperactive-formula-<YYYY-MM-DD>.log` per UTC day. War Room receives summary at day_close per schedule-events-execute-immediately rule.

---

## WHAT THIS DOES NOT REPLACE

- **Quality gates**: bytecode verification, scope pre-flight (Veda OOS lesson), 5-target checklist, Skeptic adversarial pass — these are NON-NEGOTIABLE and run inside Step 2/3/4 invocations. The formula sequences WHICH work runs next; the quality gates govern HOW each work-unit runs.
- **Brain compounding**: every Step 2 KILL still gets a doctrine entry. Every Step 3 finding still feeds Patterns-Defense-Classes.md. Every Step 5 detector ships with a Ground-Truth anchor reference. The brain compounds whether the operator is awake or asleep.
- **Operator authority on EXTERNAL action**: Step 1 surfaces "SUBMIT NOW" but operator pastes. Step 10 surfaces "POST DRAFT READY" but operator approves. **Internal work is autonomous; external surface area is operator-gated.**

---

## SESSION-START INTEGRATION (Ogie msg 7531 directive)

**Wire into CLAUDE.md / Vision-2027.md startup-read list.** Every session start, after reading brain/ docs:

1. **Determine current step in the loop** — check submission queue, Gate 2 queue, Gate 1 queue, detector queue, brain intake backlog, Lane 4 pending phases, monitoring freshness, propagation freshness, HSaaS/visibility cadence
2. **Execute from that step** — the formula already decided. Don't re-deliberate.
3. **Never ask "what should I do"** — the loop says what to do
4. **The formula tells you what to do** — proactive default is mechanical, not aspirational

**The formula IS the hyperactive default.**

- No more "awaiting your call."
- No more "your call on next dispatch."
- The queue is the direction. The loop is the engine.

Bismillah. 🐝

---

_Hyperactive Formula | v1.0 | 2026-05-22 (Ogie msgs 7530 + 7531 — permanent autonomous-execution loop, no decision points, session-start integration directive)_

---

## v1.1 APPENDIX — ZERO OPTION MENUS (2026-05-23, Ogie msg 7628 FINAL WARNING)

**Rule.** ZERO A/B/C menus. ZERO "your call." ZERO "next-step menu." ZERO "awaiting direction." ZERO "operator-decide."

**Why.** The formula is deterministic. Listing options back at the operator is a Rule 1+2+3 violation (always be shipping + bring results not questions + escalate only what's truly out of hands). Operator attention is the scarcest resource; presenting menus wastes it.

**How to apply.**

- Step has work → execute the highest-EV item.
- Step empty → next step.
- Loop back to Step 1.
- ONLY exception: Gate 4-5 (submission paste — operator does the click).

**Self-check.** If a response draft would end in "your call" / "A) ... B) ... C) ..." / "awaiting direction" / "standing by for your pick" → DELETE before sending. Pick the highest-EV next action per Formula step priority. Execute it. Surface result. Continue loop.

**Reporting form.** Report what was DONE, not what COULD be done. After every work-unit completes, the next sentence is what was started next — not a request for direction.

**Trace.** Operator typed this rule three times before formalization:
- Ogie msg 7440 (2026-05-21): Operator-Philosophy.md Rule 2 "bring results, not questions" + Rule 3 "only escalate what's truly out of your hands"
- Ogie msg 7547 (2026-05-22): feedback_formula_no_decision_points.md
- Ogie msg 7624 (2026-05-23): War Room report ended with A/B/C/D menu → operator msg 7628 FINAL WARNING + rule made permanent here

Effective immediately and permanently.

_Hyperactive Formula | v1.1 | 2026-05-23 (Ogie msg 7628 — ZERO OPTION MENUS appendix permanent)_
