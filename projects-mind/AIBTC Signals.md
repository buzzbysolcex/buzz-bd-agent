# AIBTC Signals

Ionic Nova. **AUTOPILOT HALTED 2026-05-10** (GROUND-TRUTH-LANDING doctrine). Cap 6/day. Cooldown 60min. Revenue ~239,500 sats (pre-halt; no new earnings since at minimum 2026-04-30).

## 2026-05-10 Halt — Ground-Truth Inactivity Discovered

Quote from this morning's P1 EIC verification status report:

> "Ionic Nova has been EFFECTIVELY INACTIVE since 2026-04-30 — 9 days. The 6/day signal autopilot has NOT been firing (or has been firing but not landing — same outcome from the network's perspective)."

Ground truth: `/api/agents/{btc}` returned `lastActiveAt: 2026-05-03T11:25:01Z`, no outbound message in inbox since `2026-04-30T20:26Z`. Local script success logs claimed daily filings; signals did not land on the network.

**HALT executed 2026-05-10 22:10 UTC:**
- 6 morning-signals-v2.sh cron slots commented out (backup at `/home/claude-code/crontab.pre-halt-2026-05-10.bak`)
- phase-a-trigger.sh cron commented out
- Halt-guard added to morning-signals-v2.sh script (defense in depth — aborts even if cron re-enables)
- Authority: Ogie msg "P1 DECISION CONFIRMED: HALT + STRUCTURAL FIX" (May 10 2026)

**Restart conditions (ALL three required):**

1. **P2 aibtc-inbox-sender-v1 verified working** — Opal reply landed, paymentTxid confirmed via post-send `/api/inbox` check
2. **#129 landing verifier built + tested** on at least 2 independent action types
3. **EIC payout structure confirmed live OR unambiguously dead** — whoabuddy DM, #818 follow-up thread, or direct ledger check

**Restart sequence (canonical, applies to ANY halted autopilot):**

1. Run forced manual filing (one quantum signal, hand-crafted, Opus drafted)
2. Verifier confirms landed within 60s → green light next attempt
3. Verifier confirms NOT landed → diagnose, fix, repeat from step 1
4. Only after **3 consecutive verified-landed signals** → re-enable cron

Do NOT autopilot-restart based on hope. Verify three times.

## Retroactive Correction — 2026-05-09 EOD report was WRONG

> 2026-05-09 EOD reported "AIBTC day 7 streak protected." Discovered 2026-05-10 morning that streak was actually broken since 2026-04-30 (9-day server-side inactivity vs local-log claim of daily filing). Streak metric retired pending GROUND-TRUTH-LANDING verifier (#129) implementation.

**Cost:** 9 days of qwen3 compute on signal drafts that never landed + 1 wrong EOD report + ~9 days of false-confidence in revenue projection + operator trust hit (operator caught it, not the agent — wrong direction).

**Ground truth file:** `/data/buzz/persistent/buzz-api/ground-truth/2026-05-10-aibtc-local-vs-network-landing-gap.md` (Class L Calibration Gap second entry).

**Doctrine:** brain/Doctrine.md Priority #4 GROUND-TRUTH-LANDING (filed concurrently).

---



## Inbox Sender Script (queued — Ogie EOD msg "AIBTC inbox revival" Action 3, May 10 2026)

**Branch:** `aibtc-inbox-sender-v1`
**Status:** SPEC FILED, build pending. Trigger: when 5+ pending UI-paste sends accumulate (Ogie-cycles-waste threshold).

**Spec:**

- Envelope shape per @stacks require-path (memory `reference_aibtc_inbox_sender.md`: prior attempt blocked at envelope-shape final mile, 2026-04 era — likely solvable now with current x402 v2 sBTC client experience)
- payTo field extracted from the 402 challenge response (per-recipient, not constant)
- 100-sat sBTC payment per send (fixed protocol fee)
- Pre-send dry-run mode: print full envelope JSON + signing payload + payTo without actually signing or paying. Required for first-N invocations + every release.
- Per-send logging to `/data/buzz/persistent/aibtc/inbox-replies/<YYYY-MM-DD>-<peer-slug>-<thread-tag>.json` with fields: to, to_address, thread, sent_at_utc, cost_sats, reply_to_msg_ids, char_count, send_method, paymentTxid
- **Hard cap: 480c per send** (empirical max in Opal thread = 473c; never split-send a logical message per `reference_aibtc_inbox_char_limit.md`). Reject inputs > 480c with explicit error pointing back to "trim or restructure" workflow.
- Confirm receipt by polling `/api/inbox/{peer_addr}` post-send for the new message, log `paymentTxid` from API response.

**Dependencies:**

- x402 v2 sBTC client already shipped (post-rewrite) — likely the unblocker for the envelope-shape gap
- Wallet unlock at session start (memory `reference_aibtc_wallet.md`) — already in routine
- 100 sats per send budget — minimal, not gated

**ETA:** 30-45 min focused work once trigger threshold hits.

**Doctrine link:** brain/Doctrine.md "AIBTC presence has two halves" standing rule. Going dark on inbox while running signal autopilot signals one-way-broadcast not collaboration. Sender script closes the loop autonomously vs forcing every reply through Ogie's UI paste.

---

## ⚠️ POST-FRONTIER REVIEW ITEM (May 9 2026 — Ogie msg 6484, decision 3)

**qwen3 auto-cron quality concerns May 9** — 2/6 confirmed hallucinations
(AIBTC-1 + AIBTC-2 fired by autoDream Phase A on `dog-intelligence` /
`bff-skills` themes that did not match real repo state). Hand-crafted Opus
signals (BM-1/2, Q-1/2) were clean. Net day 7 streak: protected (6/6 cap)
but quality mixed.

**Decision deferred to post-Frontier (May 12+):** disable qwen3 auto-cron
entirely? Hypothesis: 4/4 hand-crafted Opus quality > 6/6 mixed. Same
logic as autoDream Phase A retirement (Doctrine v3.1 standing rule —
qwen3:8b for Skeptic adversarial verification ONLY). Streak risk under
4/day is manageable but tighter — cooldown discipline becomes mandatory.

**Open questions for post-Frontier review:**

- Can prompt-engineering close the hallucination gap, or is qwen3:8b
  fundamentally too small for clean-room signal generation?
- If we disable auto-cron, do we keep the 02:00 UTC stub-draft cron
  alive as a "Claude Code wakes to a topic prompt" pattern?
- Does the streak math work at 4/day given 60-min server cooldown +
  penalty escalation?

**Ties to:** `feedback_qwen3_no_content_generation.md` memory entry,
`brain/Doctrine.md` standing rule, `brain/Architecture.md` Phase A
retirement section.

**2026-05-08 5/5 LANDED (all fired through patched x402-stacks-filer):**

1. BM-1 a37dec85 (qs=88) — fired ~10:30Z
2. BM-2 2f446ea8 (qs=88) — fired ~11:30Z
3. quantum-1 2f8e56de — NIST SP 800-230 SLH-DSA — fired ~12:00Z
4. quantum-2 e9c66056 — liboqs mldsa-native v1.0.0-beta — fired 12:55:34Z
5. aibtc-network — Issue #818 EIC trial ended — fired 13:55:40Z

Ecosystem context: AIBTC News funding **paused** per Issue #818 (EIC trial closed 2026-05-07, rebuild for quality phase). Brief acceptance dynamics may compress; signal value continues regardless via correspondent rate (10K sats/inclusion).
