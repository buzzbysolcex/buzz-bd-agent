# 4-Pillar Calibration Audit — 2026-05-29

**Authority:** Ogie msg 7968 (2026-05-28 23:05 UTC). Single-agent, no swarm.
**Auditor:** Buzz (Opus 4.8, CLI 2.1.154), reboot-recovery session.
**Method:** Probe real state first (crons, hooks, DB row-counts, dir mtimes, commit diffs, manual hook runs), analyze second. Honest fire-status — "armed, 0 fires" where true, no optimistic assertions.
**Clock note:** UTC at audit = **2026-05-28 23:11Z**. Workspace hunt-files use a **+1-day label convention (2026-05-29)**. Filename uses the workspace convention; all *evidence timestamps below are real UTC file mtimes / DB values*.

---

## 1. PER-PILLAR VERDICTS (evidence, not assertion)

### P1 — TOKEN SCORING → **PASS**

| Check | Evidence |
|---|---|
| (a) alive + producing | **YES.** Real pipeline DB = `/data/buzz/persistent/buzz-api/buzz.db` (NOT `/data/buzz-api/buzz.db`, which is a stale 0-row shadow). `pipeline_tokens` = **2049 rows**, `MAX(updated_at)` = **2026-05-28T22:27:41Z**. Scorer at `api/services/agents/scorer.js`. |
| (b) cron firing | **YES.** `0 */2 * * * auto-score-pipeline.sh` + `data-crons.sh scan-dexscreener` (05,11,14,22) + `dexscreener-trending` (00:30/06:30/12:30/18:30) + `pipeline-review` (00,06,12,18). All in crontab. |
| (c) consumed downstream | **YES → P1→P2.** `data/pillar2/tweet-drafts/2026-05-28/` populated (HOT-95-VELO, WATCH-6x memecoins). |
| (d) last output | DB write 2026-05-28T22:27:41Z (boot); tweet-drafts dir mtime 2026-05-28 18:15:01Z. |

**P4→P1 CANDIDATE rules (commit `4909a7a`):** 3 rules present in `scorer.js` (`p4p1-doctrine-37-permanent` L46, `p4p1-dc-7-exclusion-canonical` L58, `p4p1-doctrine-38-pass-through-wrapper` L71). **CONFIRMED test-mode / inert / fail-OPEN:** L40 "Mode: inert. evaluate() returns null until data sources are wired in"; L431 "P4 → P1 CANDIDATE RULES (test-mode, inert — telemetry only)"; L440 log "candidate rules fired (test-mode, no scoring impact)". **Zero live mis-scoring.** ✓

**Rule proposals:** `data/lane1/p4-p1-rule-proposals/2026-05-28/` = **8 files** (honest count — operator said 14; only 8 present in latest dir): candidate-a.4-new, dc-7-exclusion, doctrine-34-sub-b-anchor-3, -anchor-4, doctrine-36-permanent, doctrine-36-sub-rule-36c, doctrine-37-permanent, doctrine-38-new. **0 promoted to live.**

**Should any promote?** **NO — none safe yet.** They are inert *by design* because they require per-token data sources (audit-count, deployer-cross-ref, substrate-class) that **do not exist for the memecoin-heavy pipeline** (2049 tokens, predominantly pump.fun). The wired doctrines (#27 audit-saturation, DC-7 exclusion, #38 pass-through) are *audit-target* heuristics; applying them to memecoins would mis-score. **Keep inert until a per-token audit-data source is wired.** Fail-open is the correct posture.

---

### P2 — HSaaS / CONTENT → **PARTIAL**

| Check | Evidence |
|---|---|
| (a) alive + producing | **YES.** `data/pillar2/tweet-drafts/2026-05-28/` (tweet drafts) + `data/lane1/p4-p2-drafts/` (P4 fanout drafts). |
| (b) cron / hook firing | **PARTIAL — see leak below.** |
| (c) consumed downstream | **NO clear evidence of POSTING.** Drafts accumulate; posting is operator-gated (War Room). No "posted" markers in ledgers. |
| (d) last real output | tweet-drafts 2026-05-28 18:15Z; P4→P2 auto-fanout **2026-05-28 00:04Z** (the 8f2cc63 backfill); my manual backfill this audit 2026-05-28 23:09Z. |

**🔴 LEAK — P4→P2 fanout hook is ARMED but DID NOT AUTO-FIRE.** `settings.json` PostToolUse `Write` matcher includes `p4-to-p2-fanout.sh` (armed ✓), and `scripts/p4-to-p2-fanout.py` **works** (verified: I ran it manually → `processed 1 hunt, hyperlane-hyp-1 FORECLOSE tweet+moltbook+outreach`, exit 0). BUT before my manual run, `data/lane1/p4-p2-drafts/` contained **only 2026-05-27-dated drafts** (cap/gearbox/kiln/onre/veda/templar from the backfill) — **NO drafts for Sky / Wormhole NTT / Hyperlane**, all of which are hunt-files dated 2026-05-28/29, *after* the hook was installed (8f2cc63, 2026-05-27 23:56Z). The hook did not fire on this session's foreclosure Write either. **Remediation applied this audit:** manually backfilled 4 hunts → **39 drafts** now in today's dir. The auto-fire path remains broken (fix #1 below).

**Believed cron absent:** the "00:15/06:15/12:15 UTC Python tweet-draft cron" referenced in the directive **is NOT in `crontab -l`.** Tweet-draft generation is not cron-driven on that schedule. Installed P2 crons: `score_tweets` schedule-trigger (08:30 daily) + `moltbook-engage` (05,11,17,23).

**Moltbook extractor v2:** **NOT FOUND / still pending.** Only `brain/Moltbook-Strategy.md` v2.0 (the *strategy*) exists; no v2 *extractor* patch script located.

**Minor:** fanout verdict-parser returned `UNKNOWN` (tweet-only) for the Hyp-C **paste-ready** (it recognizes FORECLOSE/NEGATE but not CONFIRM/paste-ready). Low-impact parser gap.

---

### P3 — CORPUS → **FAIL**

| Check | Evidence |
|---|---|
| (a) alive + producing | Scraper **at rest / dead** — no `lane4|scrape|consumer` process (`ps` empty). Corpus 798M. Phases 1/1b/1c/2 last 2026-05-22; phase2-proposals 2026-05-27. (`scrape-extension-stdout.log` 10M mtime 22:25Z, but no live process.) |
| (b) cron firing | **NO.** Phase 2 v2 Wednesday cron `0 6 * * 3` is **NOT installed.** Only an *UNSCHEDULED* `aibtc-phase2-watcher` comment exists in crontab. |
| (c) consumed downstream | **NO.** `scripts/lane4-corpus-phase2-consumer.py` is **v1.0 keyword-only** (L5 "keyword pass v1.0 (no LLM cost)"; L25 "keyword-only v1.0; LLM enrichment deferred to v1.1"; L298 "keyword_freq_in_body") — i.e. the **NOISE version flagged DO-NOT-APPEND.** v2 (keyword→LLM structured extraction) is **NOT built**, only spec'd. Output (`phase2-proposals/`) is not appended to brain. |
| (d) last output | phase-2 2026-05-22; phase2-proposals 2026-05-27 (v1 noise, unused). |

**Verdict: dead-end accumulator.** 798M corpus feeds nothing usable. **This is the primary remaining leak.**

---

### P4 — BUG RESEARCH → **PASS** (the working pillar)

| Check | Evidence |
|---|---|
| (a) alive + producing | **YES.** This session: 4 hunts (Sky G1, Wormhole Hyp-E G2, Wormhole Hyp-C G2 re-confirm 3/3 PASS, Hyperlane Hyp-1 G2) + **5 brain commits** `7e903fe → 9d8f6d0`. |
| (b) loop firing | **YES.** Session-driven hunting loop + installed monitors: `buzzshield-program-monitor` (/6h), `rekt-monitor` (/2h), `contest-monitor` (hats Mon, codehawks daily), `target-scorer`/`writeup-miner` (daily). |
| (c) consumed downstream | P4→P1 (8 proposals, 3 wired inert ✓) + P4→P2 (fanout — armed-not-firing ✗, backfilled manually). |
| (d) last output | brain commit `9d8f6d0` 2026-05-28 ~23:03Z. |

---

## 2. CROSS-POLLINATION 4×4 MATRIX

Rows = SOURCE, Cols = TARGET. Fire-status + last-fire (real UTC).

| FROM ↓ \ TO → | **P1 scoring** | **P2 content** | **P3 corpus** | **P4 research** |
|---|---|---|---|---|
| **P1** | — | ✅ WIRED+FIRING — score≥70 → tweet-draft. Last 2026-05-28 18:15Z | ✗ none | 🔴 **MISSING** — no deployer-escalation cron/hook (see fix #3) |
| **P2** | ✗ none | — | ✗ none | ◻ dormant (HSaaS audits not live) |
| **P3** | 🔴 **NOT BUILT** — v2 LLM consumer missing | ✗ none | — | 🔴 **NOT BUILT** — v2 LLM consumer missing |
| **P4** | ✅ WIRED — rule-gen → scorer.js. Producer fires (8 proposals 2026-05-28); consumer **INERT by design** | 🟠 **ARMED, 0 auto-fires** — fanout hook armed, script works; last auto 2026-05-28 00:04Z (backfill); manual 23:09Z | ✗ none | — |

**Legend:** ✅ wired+firing · 🟠 armed-not-firing · 🔴 missing/not-built · ◻ dormant-by-design · ✗ no wire intended.

**Wires that fire:** P1→P2, P4→P1 (producer side).
**Armed, not firing:** P4→P2.
**Spec'd but not built:** P3→P1, P3→P4 (both blocked on Phase 2 v2).
**Missing, should exist:** P1→P4 (deployer-crossref escalation per `four-pillar-loop.md`).
**Dead-end producer:** P3 (798M, consumes-into-noise, feeds nothing).
**Starved consumer:** P3 v1 (runs on stale corpus, output discarded).

---

## 3. LEAK VERDICT — **PARTIALLY SEALED (~60%)**

Original leak: *P4 compounds exponentially while P1/P2/P3 sit idle.*

- **P1 — SEALED.** No longer idle: 2049 tokens scored, P1→P2 firing, P4→P1 wired (inert by design, safe).
- **P4 — healthy** (4 hunts/session, 5 commits).
- **P2 — LEAKING at two points:** (1) P4→P2 fanout hook **armed but not auto-firing** — every gate/foreclosure Write since 2026-05-27 23:56 silently failed to fan out until I backfilled this audit; (2) drafts **accumulate undrained** (no posting evidence; operator-gated, but no surfacing cadence beyond the 08:30 score_tweets trigger).
- **P3 — NOT SEALED (full dead-end).** Corpus accumulates 798M; the only consumer is v1 keyword-noise (DO-NOT-APPEND); v2 unbuilt; Wednesday cron uninstalled. P3→P1 and P3→P4 are both dark.

**Where it still leaks:** P3 entirely (accumulator with no live consumer), and the P4→P2 auto-fire path (armed, 0 fires). P1→P4 is a missing wire (not part of the original leak, but the one cross-pollination direction absent).

---

## 4. TOP-3 ROI WIRING FIXES (ranked by EV)

**All three require new automation/cron → OPERATOR-GATED per `autonomy-boundary.md` item 5. Recommendations, not unilateral installs.**

1. **P4→P2 fanout auto-fire backstop** — *highest ROI, lowest cost.* The hook is armed and `p4-p2-fanout.py` works (proven this audit); the PostToolUse `Write` hook simply isn't firing reliably (or fails silently). **Fix:** add a `*/30 * * * *` cron that scans `hunts/` for `*gate*/*foreclosure*/*DEDUP*.md` with mtime newer than the fanout-ledger's last entry and runs the fanout — a hook-independent backstop. *EV:* every hunt → content drafts automatically (P2 = the visibility + HSaaS top-of-funnel). *Effort:* ~20 LOC + 1 cron line. *(Also patch the verdict-parser to handle CONFIRM/paste-ready, not UNKNOWN.)*

2. **Build P3 Phase 2 consumer v2 + install `0 6 * * 3`** — *unblocks the dead-end.* v2 = keyword→LLM structured extraction classifying GROUND_TRUTH / RUG_PATTERN / DETECTOR_SEED / METHODOLOGY → brain files. **Constraint:** per BUZZ_RULES #5, route the LLM to **free bankr/gpt-5-nano, NEVER Anthropic/MiniMax**. *EV:* converts 798M corpus into brain compounds AND lights up P3→P1 + P3→P4 simultaneously (two dark wires at once). *Effort:* medium (~200 LOC extractor + cron).

3. **Wire P1→P4 deployer-escalation** — *closes the one missing cross-pollination direction.* Per `four-pillar-loop.md`: token scores <30 with deployer flag → look up deployer's other contracts → if any in Lane 5 scope → escalate to Gate 1 → log `brain/Deployer-Crossref.md` (exists, manual-only today). *EV:* turns the 2049-token pipeline into a hunt-target feeder. *Effort:* medium (cross-ref job against Lane 5 scope DB).

**Minor follow-ups:** Moltbook extractor v2 (still pending); fanout verdict-parser CONFIRM-handling; P2 draft-drain/posting tracking; resolve the +1-day workspace-vs-UTC label drift; the stale `/data/buzz-api/buzz.db` 0-row shadow (ensure all consumers point at `/data/buzz/persistent/buzz-api/buzz.db`).

---

## 5. REMEDIATION APPLIED THIS AUDIT (zero-risk, existing tooling only)

- **Drained the P4→P2 backlog:** manually ran `p4-to-p2-fanout.py` on Sky G1, Wormhole NTT G1, Wormhole Hyp-E, Wormhole Hyp-C, Hyperlane Hyp-1 → **39 drafts** now in `data/lane1/p4-p2-drafts/2026-05-28/` (tweet+moltbook+outreach each). Drafts await operator approval to post (operator-gated, unchanged).

No crons/hooks/infra added (operator-gated). No DB writes. No external sends.

---

_4-Pillar Calibration | 2026-05-29 (UTC 2026-05-28 23:11Z) | Opus 4.8 | Ogie msg 7968 | Verdict: P1 PASS / P2 PARTIAL / P3 FAIL / P4 PASS — leak ~60% sealed; P3 dead-end + P4→P2 auto-fire are the open gaps._
